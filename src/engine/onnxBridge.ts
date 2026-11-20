import * as ort from 'onnxruntime-web';
import { createAllenkFdncnnOnnxRuntime, validateImageShape } from '../vendor/core/allenkFdncnnOnnxRuntime.js';
import type { OrtProvider } from './gpuPolicy';

export interface AllenkFdncnnRuntime {
  id: string;
  status: string;
  executionProvider: string;
  inputName: string;
  outputName: string;
  inputShape: number[];
  outputShape: number[];
  createMs: number;
  session: ort.InferenceSession;
  numThreads: number | null;
  estimateMacs(width: number, height: number): number;
  execute(input: Float32Array): Promise<{
    output: Float32Array;
    outputShape: number[];
    runtime: string;
    runMs: number;
    macs: number;
  }>;
  denoiseImageData(args?: {
    imageData: ImageData | { width: number; height: number; data: Uint8ClampedArray };
    sigma?: number;
  }): Promise<{
    output: Float32Array;
    outputShape: number[];
    runtime: string;
    runMs: number;
    macs: number;
    imageData: {
      width: number;
      height: number;
      data: Uint8ClampedArray;
    };
  }>;
}

export interface AllenkBridgeOptions {
  session: ort.InferenceSession;
  executionProvider?: OrtProvider;
  width?: number;
  height?: number;
  inputName?: string;
  outputName?: string;
}

export async function createOnnxBridge(options: AllenkBridgeOptions): Promise<AllenkFdncnnRuntime> {
  const {
    session,
    executionProvider = 'wasm',
    width = 72,
    height = 72,
    inputName = 'fdncnn_input',
    outputName = 'fdncnn_output',
  } = options;

  const runtime = await (createAllenkFdncnnOnnxRuntime as any)({
    ort,
    session,
    executionProvider,
    inputName,
    outputName,
    inputShape: [1, 4, height, width],
    outputShape: [1, 3, height, width],
  });

  return runtime as AllenkFdncnnRuntime;
}

export async function denoiseImageDataWithSession(params: {
  session: ort.InferenceSession;
  imageData: ImageData | { width: number; height: number; data: Uint8ClampedArray };
  sigma?: number;
  executionProvider?: OrtProvider;
}): Promise<{
  output: Float32Array;
  outputShape: number[];
  runtime: string;
  runMs: number;
  macs: number;
  imageData: { width: number; height: number; data: Uint8ClampedArray };
}> {
  const { session, imageData, sigma = 25, executionProvider = 'wasm' } = params;
  const bridge = await createOnnxBridge({
    session,
    executionProvider,
    width: imageData.width,
    height: imageData.height,
  });
  return bridge.denoiseImageData({ imageData, sigma });
}

export { validateImageShape };
