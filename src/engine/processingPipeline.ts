import type { JobRecord, GPUMode } from '../shared/types';
import { detectCapabilities, selectOrtProvider, type OrtProvider } from './gpuPolicy';
import { configureOrt } from './modelLoader';
import {
  inspectGeminiVideoFile,
  detectGeminiVideoWatermark,
  removeGeminiVideoWatermark,
} from '../vendor/video/videoExport.js';
import { WatermarkEngine } from '../vendor/core/watermarkEngine.js';
import nodePath from 'node:path';
import nodeFs from 'node:fs';

export const SUPPORTED_VIDEO_EXTENSIONS = ['.mp4', '.mov', '.webm', '.mkv', '.avi', '.m4v'] as const;
export const SUPPORTED_IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp', '.bmp'] as const;

const VIDEO_EXT_SET = new Set<string>(SUPPORTED_VIDEO_EXTENSIONS);
const IMAGE_EXT_SET = new Set<string>(SUPPORTED_IMAGE_EXTENSIONS);

export function isImageFile(filePath: string): boolean {
  if (!filePath || typeof filePath !== 'string') return false;
  const match = filePath.match(/\.([a-zA-Z0-9]+)$/);
  if (!match) return false;
  return IMAGE_EXT_SET.has(`.${match[1].toLowerCase()}`);
}

export function isVideoFile(filePath: string): boolean {
  if (!filePath || typeof filePath !== 'string') return false;
  const match = filePath.match(/\.([a-zA-Z0-9]+)$/);
  if (!match) return false;
  return VIDEO_EXT_SET.has(`.${match[1].toLowerCase()}`);
}

export function isSupportedMediaFile(filePath: string): boolean {
  return isImageFile(filePath) || isVideoFile(filePath);
}

export function getImageMimeInfo(filePath: string): { mimeType: string; outputExt: string } {
  const match = filePath ? filePath.match(/\.([a-zA-Z0-9]+)$/) : null;
  const ext = match ? `.${match[1].toLowerCase()}` : '.png';
  switch (ext) {
    case '.jpg':
    case '.jpeg':
      return { mimeType: 'image/jpeg', outputExt: ext };
    case '.webp':
      return { mimeType: 'image/webp', outputExt: '.webp' };
    case '.bmp':
      return { mimeType: 'image/png', outputExt: '.png' };
    case '.png':
    default:
      return { mimeType: 'image/png', outputExt: '.png' };
  }
}

export type ProgressCallback = (update: Partial<JobRecord>) => void;

export interface PipelineOptions {
  gpuMode: GPUMode;
  onProgress: ProgressCallback;
  signal: AbortSignal;
}

let cachedProvider: OrtProvider | null = null;

export async function initEngine(gpuMode: GPUMode): Promise<OrtProvider> {
  if (cachedProvider) return cachedProvider;
  const caps = await detectCapabilities();
  const provider = selectOrtProvider(caps, gpuMode);
  configureOrt(provider, caps.threadCount);
  cachedProvider = provider;
  return provider;
}

export async function processVideoFile(
  filePath: string,
  jobId: string,
  options: PipelineOptions
): Promise<{ outputPath: string; skipped: boolean }> {
  const { gpuMode, onProgress, signal } = options;

  onProgress({ id: jobId, stage: 'initializing', progress: 2 });

  const provider = await initEngine(gpuMode);
  onProgress({ id: jobId, gpuBackend: provider, progress: 5 });

  if (signal.aborted) throw new DOMException('Cancelled', 'AbortError');

  // Build File object from path
  const fileBuffer = nodeFs.readFileSync(filePath);
  const fileName = nodePath.basename(filePath);
  const file = new File([fileBuffer], fileName);

  const info = await inspectGeminiVideoFile(file);
  onProgress({ id: jobId, stage: 'detecting', progress: 10, framesTotal: info?.frameCountEstimate ?? 0 });

  if (signal.aborted) throw new DOMException('Cancelled', 'AbortError');

  onProgress({ id: jobId, stage: 'detecting', progress: 15 });
  const detected = await detectGeminiVideoWatermark(file, {
    sampleCount: 6,
    signal,
    onProgress: (p: any) => {
      const pct = typeof p === 'number' ? p : p?.progress ?? 0;
      onProgress({ id: jobId, progress: 15 + Math.round(pct * 15) });
    },
  });

  const detection = detected?.detection ?? detected;
  if (!detection || !detection.isConfident) {
    onProgress({ id: jobId, stage: 'skipped', progress: 100 });
    return { outputPath: '', skipped: true };
  }

  if (signal.aborted) throw new DOMException('Cancelled', 'AbortError');

  onProgress({ id: jobId, stage: 'removing', progress: 30 });

  const outputPath = buildOutputPath(filePath);

  let lastProgressUpdate = 0;

  const result = await removeGeminiVideoWatermark(file, {
    detection: detected,
    executionProvider: provider,
    hardwareAcceleration: 'prefer-hardware',
    latencyMode: 'realtime',
    onProgress: (progressInfo: any, totalFrames?: number) => {
      let current = 0;
      let total = 0;
      let pctRatio = 0;

      if (typeof progressInfo === 'object' && progressInfo !== null) {
        current = progressInfo.processedFrames ?? 0;
        total = progressInfo.frameEstimate ?? totalFrames ?? 0;
        pctRatio = typeof progressInfo.progress === 'number' ? progressInfo.progress : (total > 0 ? current / total : 0);
      } else if (typeof progressInfo === 'number') {
        current = progressInfo;
        total = totalFrames ?? 0;
        pctRatio = total > 0 ? current / total : 0;
      }

      const now = performance.now();
      // Throttle React state updates to at most once per 80ms (avoids freezing the encoder loop)
      if (now - lastProgressUpdate < 80 && current < total && current > 0) {
        return;
      }
      lastProgressUpdate = now;

      const pct = Math.min(88, 30 + Math.round(pctRatio * 55));
      onProgress({ id: jobId, stage: 'removing', progress: pct, framesCurrent: current, framesTotal: total });
    },
    signal,
  });

  if (signal.aborted) throw new DOMException('Cancelled', 'AbortError');

  onProgress({ id: jobId, stage: 'exporting', progress: 90 });

  // Write output blob to disk
  const arrayBuffer = await result.blob.arrayBuffer();
  nodeFs.writeFileSync(outputPath, Buffer.from(arrayBuffer));

  onProgress({ id: jobId, stage: 'completed', progress: 100, outputPath });
  return { outputPath, skipped: false };
}

export function buildOutputPath(inputPath: string): string {
  const dir = nodePath.dirname(inputPath);
  const ext = nodePath.extname(inputPath);
  const base = nodePath.basename(inputPath, ext);
  let candidate = nodePath.join(dir, `${base}_gemini_removed.mp4`);
  let counter = 1;
  while (nodeFs.existsSync(candidate)) {
    candidate = nodePath.join(dir, `${base}_gemini_removed_${counter}.mp4`);
    counter++;
  }
  return candidate;
}

export function buildImageOutputPath(inputPath: string, outputExt?: string): string {
  const dir = nodePath.dirname(inputPath);
  const ext = nodePath.extname(inputPath);
  const base = nodePath.basename(inputPath, ext);
  const targetExt = outputExt || ext || '.png';
  let candidate = nodePath.join(dir, `${base}_gemini_removed${targetExt}`);
  let counter = 1;
  while (nodeFs.existsSync(candidate)) {
    candidate = nodePath.join(dir, `${base}_gemini_removed_${counter}${targetExt}`);
    counter++;
  }
  return candidate;
}

export async function exportCanvasToBlob(canvas: any, mimeType: string): Promise<Blob> {
  const tryExport = async (type: string) => {
    if (typeof canvas?.convertToBlob === 'function') {
      return await canvas.convertToBlob({ type, quality: 0.95 });
    }
    if (typeof canvas?.toBlob === 'function') {
      return await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((blob: Blob | null) => {
          if (blob) resolve(blob);
          else reject(new Error('Failed to encode image blob'));
        }, type, 0.95);
      });
    }
    throw new Error('Canvas blob export API is unavailable');
  };

  try {
    return await tryExport(mimeType);
  } catch (err) {
    if (mimeType !== 'image/png') {
      return await tryExport('image/png');
    }
    throw err;
  }
}

async function loadImageSource(blob: Blob): Promise<{ source: any; cleanup: () => void }> {
  if (typeof createImageBitmap === 'function') {
    const bitmap = await createImageBitmap(blob);
    return {
      source: bitmap,
      cleanup: () => {
        try {
          bitmap.close();
        } catch {}
      },
    };
  }
  if (typeof Image !== 'undefined') {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Failed to load image file'));
      img.src = url;
    });
    return {
      source: img,
      cleanup: () => {
        URL.revokeObjectURL(url);
      },
    };
  }
  throw new Error('Image decoding runtime is unavailable');
}

export async function processImageFile(
  filePath: string,
  jobId: string,
  options: PipelineOptions
): Promise<{ outputPath: string; skipped: boolean }> {
  const { gpuMode, onProgress, signal } = options;

  onProgress({ id: jobId, stage: 'initializing', progress: 5, mediaType: 'image' });

  const provider = await initEngine(gpuMode);
  onProgress({ id: jobId, gpuBackend: provider, progress: 15 });

  if (signal.aborted) throw new DOMException('Cancelled', 'AbortError');

  const fileBuffer = nodeFs.readFileSync(filePath);
  const fileSize = fileBuffer.byteLength;
  onProgress({ id: jobId, fileSizeBytes: fileSize, stage: 'detecting', progress: 25 });

  if (signal.aborted) throw new DOMException('Cancelled', 'AbortError');

  const mimeInfo = getImageMimeInfo(filePath);
  const blob = new Blob([fileBuffer], { type: mimeInfo.mimeType });
  const { source, cleanup } = await loadImageSource(blob);

  if (signal.aborted) {
    cleanup();
    throw new DOMException('Cancelled', 'AbortError');
  }

  onProgress({ id: jobId, stage: 'removing', progress: 50 });

  let processedCanvas: any;
  try {
    const engine = await WatermarkEngine.create();
    processedCanvas = await engine.removeWatermarkFromImage(source, {
      adaptiveMode: true,
    });
  } finally {
    cleanup();
  }

  if (signal.aborted) throw new DOMException('Cancelled', 'AbortError');

  const meta = processedCanvas?.__watermarkMeta;
  const isApplied = Boolean(meta?.applied);
  if (!isApplied) {
    onProgress({ id: jobId, stage: 'skipped', progress: 100 });
    return { outputPath: '', skipped: true };
  }

  onProgress({ id: jobId, stage: 'exporting', progress: 85 });

  const outputPath = buildImageOutputPath(filePath, mimeInfo.outputExt);
  const outputBlob = await exportCanvasToBlob(processedCanvas, mimeInfo.mimeType);
  const arrayBuffer = await outputBlob.arrayBuffer();
  nodeFs.writeFileSync(outputPath, Buffer.from(arrayBuffer));

  onProgress({ id: jobId, stage: 'completed', progress: 100, outputPath });
  return { outputPath, skipped: false };
}

export async function processMediaFile(
  filePath: string,
  jobId: string,
  options: PipelineOptions
): Promise<{ outputPath: string; skipped: boolean }> {
  if (isImageFile(filePath)) {
    return processImageFile(filePath, jobId, options);
  }
  return processVideoFile(filePath, jobId, options);
}
