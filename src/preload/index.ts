import { contextBridge, ipcRenderer } from 'electron';

const electronAPI = {
  getInitialFiles: () => ipcRenderer.invoke('get-initial-files'),
  selectFiles: () => ipcRenderer.invoke('select-files'),
  showInFolder: (path: string) => ipcRenderer.invoke('show-in-folder', path),
  signalReady: () => ipcRenderer.send('renderer:ready'),
  onAddFiles: (cb: (paths: string[]) => void) => {
    const handler = (_e: any, paths: string[]) => cb(paths);
    ipcRenderer.on('batch:add-files', handler);
    return () => ipcRenderer.removeListener('batch:add-files', handler);
  },
  onCancelJob: (cb: (jobId: string) => void) =>
    ipcRenderer.on('job:cancel', (_e, id) => cb(id)),
  onCancelAll: (cb: () => void) =>
    ipcRenderer.on('batch:cancel-all', () => cb()),
  cancelJob: (jobId: string) => ipcRenderer.send('job:cancel', jobId),
  cancelAll: () => ipcRenderer.send('batch:cancel-all'),
};

(window as any).electronAPI = electronAPI;
try {
  if (contextBridge && contextBridge.exposeInMainWorld) {
    contextBridge.exposeInMainWorld('electronAPI', electronAPI);
  }
} catch {}

