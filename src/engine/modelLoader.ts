import * as ort from 'onnxruntime-web';
import type { OrtProvider } from './gpuPolicy';

const sessionCache = new Map<string, ort.InferenceSession>();
let configured = false;

export function configureOrt(provider: OrtProvider, threadCount: number): void {
  if (configured) return;
  configured = true;
  ort.env.wasm.wasmPaths = './onnxruntime/';
  ort.env.wasm.numThreads = threadCount;
}

export async function loadModel(
  modelPath: string,
  provider: OrtProvider
): Promise<ort.InferenceSession> {
  const key = `${provider}:${modelPath}`;
  if (sessionCache.has(key)) return sessionCache.get(key)!;
  const session = await ort.InferenceSession.create(modelPath, {
    executionProviders: [provider === 'webgpu' ? { name: 'webgpu' } : 'wasm'],
    graphOptimizationLevel: 'all',
  });
  sessionCache.set(key, session);
  return session;
}

export function getModelPath(watermarkSize: number, isVeoText: boolean): string {
  if (isVeoText) return './models/allenk-fdncnn/model_core_fp32_86x74.onnx';
  if (watermarkSize <= 56) return './models/allenk-fdncnn/model_core_fp32_104.onnx';
  return './models/allenk-fdncnn/model_core_fp32_200.onnx';
}

export function releaseAll(): void {
  for (const s of sessionCache.values()) s.release();
  sessionCache.clear();
  configured = false;
}
