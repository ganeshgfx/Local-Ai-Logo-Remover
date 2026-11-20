import type { EngineCapabilities, GPUMode } from '../shared/types';

export async function detectCapabilities(): Promise<EngineCapabilities> {
  let webgpu = false;
  try {
    if ('gpu' in navigator) {
      const adapter = await (navigator as any).gpu.requestAdapter();
      webgpu = adapter !== null;
    }
  } catch {}

  const wasmThreads = typeof SharedArrayBuffer !== 'undefined';
  const threadCount = wasmThreads
    ? Math.min(4, Math.ceil(navigator.hardwareConcurrency / 2))
    : 1;

  let hardwareVideoDecoder = false;
  let hardwareVideoEncoder = false;
  try {
    if ('VideoDecoder' in window) {
      const r = await (VideoDecoder as any).isConfigSupported({
        codec: 'avc1.42001E',
        hardwareAcceleration: 'prefer-hardware',
      });
      hardwareVideoDecoder = !!r.supported;
    }
  } catch {}
  try {
    if ('VideoEncoder' in window) {
      const r = await (VideoEncoder as any).isConfigSupported({
        codec: 'avc1.42001E',
        width: 1920,
        height: 1080,
        hardwareAcceleration: 'prefer-hardware',
      });
      hardwareVideoEncoder = !!r.supported;
    }
  } catch {}

  return { webgpu, hardwareVideoDecoder, hardwareVideoEncoder, wasmThreads, threadCount };
}

export type OrtProvider = 'webgpu' | 'wasm';

export function selectOrtProvider(caps: EngineCapabilities, mode: GPUMode): OrtProvider {
  if (mode === 'cpu-only') return 'wasm';
  if (caps.webgpu) return 'webgpu';
  if (mode === 'strict') {
    throw new Error(
      'Strict GPU mode: WebGPU unavailable. Cannot proceed without GPU inference.'
    );
  }
  return 'wasm';
}
