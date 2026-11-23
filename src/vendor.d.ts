declare module '*/vendor/core/allenkFdncnnOnnxRuntime.js' {
  export function createAllenkFdncnnOnnxRuntime(options?: any): Promise<any>;
  export function validateImageShape(imageData: any, inputShape: any): void;
}

declare module '*/vendor/video/videoExport.js' {
  export function inspectGeminiVideoFile(file: File | Blob): Promise<any>;
  export function detectGeminiVideoWatermark(file: File | Blob, options?: any): Promise<any>;
  export function removeGeminiVideoWatermark(file: File | Blob, options?: any): Promise<any>;
  export function processVideoWatermarkFrame(ctx: any, detection: any, trackStates?: any, options?: any): Promise<any>;
  export function applyVideoExportDecoderColorSpace(packet: any, meta: any): void;
  export function createVideoExportEncodingConfig(videoBitrate: number): any;
  export function resolveExportAllenkFdncnnPadding(cleanupOptions?: any, detection?: any): any;
}

declare module '*/vendor/video/videoWatermarkDetector.js' {
  export function detectVideoWatermarkFromFramesAsync(options: any): Promise<any>;
  export function detectDiamondVideoWatermarkFromFramesAsync(options: any): Promise<any>;
  export function selectVideoWatermarkDetection(options: any): any;
  export function selectVideoWatermarkDetectionForFrame(imageSource: any, detection: any): any;
  export function scoreVideoWatermarkFrame(imageData: any, position: any, alphaMap: any): any;
}

declare module '*/vendor/core/watermarkEngine.js' {
  export class WatermarkEngine {
    static create(): Promise<WatermarkEngine>;
    getAlphaMap(size: number | string): Promise<Float32Array>;
    removeWatermarkFromImage(image: any, options?: any): Promise<any>;
    getWatermarkInfo(imageWidth: number, imageHeight: number): any;
  }
  export function removeRepeatedWatermarkLayers(...args: any[]): any;
}

// WebGPU global type declarations
declare interface GPUDevice {
  createShaderModule(descriptor: any): any;
  createComputePipeline(descriptor: any): any;
  createBuffer(descriptor: any): any;
  createBindGroup(descriptor: any): any;
  createCommandEncoder(): any;
  queue: {
    writeBuffer(buffer: any, bufferOffset: number, data: any): void;
    submit(commandBuffers: any[]): void;
  };
}

declare interface GPUComputePipeline {
  getBindGroupLayout(index: number): any;
}

declare const GPUBufferUsage: {
  readonly MAP_READ: number;
  readonly MAP_WRITE: number;
  readonly COPY_SRC: number;
  readonly COPY_DST: number;
  readonly INDEX: number;
  readonly VERTEX: number;
  readonly UNIFORM: number;
  readonly STORAGE: number;
  readonly INDIRECT: number;
  readonly QUERY_RESOLVE: number;
};

declare const GPUMapMode: {
  readonly READ: number;
  readonly WRITE: number;
};
