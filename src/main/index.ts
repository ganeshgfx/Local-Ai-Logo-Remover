import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron';
import path from 'path';
import fs from 'fs';

// Enable GPU hardware video decoding, encoding, rasterization, and WebGPU
app.commandLine.appendSwitch('ignore-gpu-blocklist');
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-zero-copy');
app.commandLine.appendSwitch('enable-features', 'VaapiVideoDecoder,VaapiVideoEncoder,PlatformHEVCDecoderSupport,WebGPU');
app.commandLine.appendSwitch('enable-unsafe-webgpu');

const logFile = path.join(app.getPath('userData'), 'app-debug.log');
function log(msg: string) {
  try {
    fs.appendFileSync(logFile, `[${new Date().toISOString()}] ${msg}\n`);
  } catch {}
}

log(`App starting, argv: ${JSON.stringify(process.argv)}`);

process.on('uncaughtException', (err) => {
  log(`UNCAUGHT EXCEPTION: ${err.stack || err}`);
});

process.on('unhandledRejection', (reason) => {
  log(`UNHANDLED REJECTION: ${reason}`);
});

let mainWindow: BrowserWindow | null = null;
let rendererReady = false;
const pendingFiles: string[] = [];

function parseFileArgs(args: string[]): string[] {
  const rawArgs = app.isPackaged ? args.slice(1) : args.slice(2);
  const files: string[] = [];

  for (let i = 0; i < rawArgs.length; i++) {
    const arg = rawArgs[i];
    if (arg === '--manifest') {
      const manifestPath = rawArgs[++i];
      if (manifestPath && fs.existsSync(manifestPath)) {
        try {
          const buf = fs.readFileSync(manifestPath);
          const content = (buf.length >= 2 && buf[0] === 0xff && buf[1] === 0xfe)
            ? buf.toString('utf16le')
            : buf.toString('utf8');
          const parsed = JSON.parse(content);
          if (Array.isArray(parsed.files)) {
            files.push(...parsed.files.filter((f: unknown): f is string => typeof f === 'string' && f.length > 0));
          }
          fs.unlink(manifestPath, () => {});
        } catch (e) {
          console.error('Failed to parse manifest:', manifestPath, e);
        }
      }
    } else if (arg.startsWith('--manifest=')) {
      const manifestPath = arg.slice('--manifest='.length);
      if (manifestPath && fs.existsSync(manifestPath)) {
        try {
          const buf = fs.readFileSync(manifestPath);
          const content = (buf.length >= 2 && buf[0] === 0xff && buf[1] === 0xfe)
            ? buf.toString('utf16le')
            : buf.toString('utf8');
          const parsed = JSON.parse(content);
          if (Array.isArray(parsed.files)) {
            files.push(...parsed.files.filter((f: unknown): f is string => typeof f === 'string' && f.length > 0));
          }
          fs.unlink(manifestPath, () => {});
        } catch (e) {
          console.error('Failed to parse manifest:', manifestPath, e);
        }
      }
    } else if (!arg.startsWith('--') && !arg.startsWith('-')) {
      if (fs.existsSync(arg)) {
        try {
          if (fs.statSync(arg).isDirectory()) {
            continue;
          }
        } catch {}
        files.push(arg);
      } else if (!arg.endsWith('.js') && !arg.endsWith('.ts') && !arg.endsWith('.json')) {
        files.push(arg);
      }
    }
  }

  return files;
}

function createWindow(): BrowserWindow {
  log('createWindow called');
  const iconPath = app.isPackaged
    ? path.join(process.resourcesPath, '../resources/icon.ico')
    : path.join(__dirname, '../../resources/icon.ico');
  const win = new BrowserWindow({
    width: 920,
    height: 700,
    minWidth: 720,
    minHeight: 540,
    title: 'AI Watermark Remover',
    icon: iconPath,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: false,
      nodeIntegration: true,
      sandbox: false,
    },
    backgroundColor: '#000000',
    show: false,
  });

  win.webContents.on('console-message', (_e, level, message, line, sourceId) => {
    log(`RENDERER CONSOLE [${level}] ${message} (${sourceId}:${line})`);
  });

  win.webContents.on('did-fail-load', (_e, errorCode, errorDescription, validatedURL) => {
    log(`FAIL LOAD ${errorCode}: ${errorDescription} (${validatedURL})`);
  });

  win.webContents.on('did-finish-load', () => {
    log('did-finish-load fired');
  });

  win.webContents.on('render-process-gone', (_e, details) => {
    log(`RENDER PROCESS GONE: ${JSON.stringify(details)}`);
  });

  win.once('ready-to-show', () => {
    log('ready-to-show fired, showing window');
    win.show();
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    // When built, renderer files are in dist/index.html
    const indexPath = path.join(__dirname, '../dist/index.html');
    log(`Loading index from ${indexPath}, exists=${fs.existsSync(indexPath)}`);
    if (fs.existsSync(indexPath)) {
      win.loadFile(indexPath);
    } else {
      win.loadFile(path.join(__dirname, '../renderer/index.html'));
    }
  }

  return win;
}

// Single instance lock
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', (_event, commandLine) => {
    const filePaths = parseFileArgs(commandLine);
    log(`second-instance files: ${JSON.stringify(filePaths)}`);
    const windows = BrowserWindow.getAllWindows();
    if (windows.length > 0) {
      const win = windows[0];
      if (win.isMinimized()) win.restore();
      win.focus();
      if (filePaths.length > 0) {
        if (rendererReady) {
          win.webContents.send('batch:add-files', filePaths);
        } else {
          // Renderer not ready yet — buffer until it signals ready
          pendingFiles.push(...filePaths);
        }
      }
    }
  });

  app.whenReady().then(() => {
    mainWindow = createWindow();

    // IPC: cancel job
    ipcMain.on('job:cancel', (_e, jobId: string) => {
      mainWindow?.webContents.send('job:cancel', jobId);
    });
    ipcMain.on('batch:cancel-all', () => {
      mainWindow?.webContents.send('batch:cancel-all');
    });

    let initialFiles = parseFileArgs(process.argv);
    log(`Initial files parsed at launch: ${JSON.stringify(initialFiles)}`);

    ipcMain.handle('show-in-folder', (_e, filePath: string) => {
      if (filePath && fs.existsSync(filePath)) {
        shell.showItemInFolder(filePath);
      }
    });

    ipcMain.handle('select-files', async () => {
      if (!mainWindow) return [];
      const res = await dialog.showOpenDialog(mainWindow, {
        title: 'Select Videos to Remove Watermark',
        properties: ['openFile', 'multiSelections'],
        filters: [
          { name: 'Video Files', extensions: ['mp4', 'mov', 'webm', 'mkv', 'avi'] },
          { name: 'All Files', extensions: ['*'] },
        ],
      });
      return res.canceled ? [] : res.filePaths;
    });

    ipcMain.handle('get-initial-files', () => {
      log(`Renderer requested initial files: ${JSON.stringify(initialFiles)}`);
      // Merge any files buffered from second-instance calls that arrived before renderer was ready
      const files = [...initialFiles, ...pendingFiles];
      initialFiles = [];
      pendingFiles.length = 0;
      return files;
    });

    ipcMain.on('renderer:ready', () => {
      rendererReady = true;
      log(`Renderer signalled ready. Pending files: ${JSON.stringify(pendingFiles)}`);
      if (pendingFiles.length > 0 && mainWindow) {
        mainWindow.webContents.send('batch:add-files', [...pendingFiles]);
        pendingFiles.length = 0;
      }
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
}
