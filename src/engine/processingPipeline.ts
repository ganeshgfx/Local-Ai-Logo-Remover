import type { JobRecord, GPUMode } from '../shared/types';
import { detectCapabilities, selectOrtProvider, type OrtProvider } from './gpuPolicy';
import { configureOrt } from './modelLoader';
import {
  inspectGeminiVideoFile,
  detectGeminiVideoWatermark,
  removeGeminiVideoWatermark,
} from '../vendor/video/videoExport.js';
import nodePath from 'node:path';
import nodeFs from 'node:fs';

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

function buildOutputPath(inputPath: string): string {
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
