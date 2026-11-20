export type ProcessingStage =
  | 'queued'
  | 'initializing'
  | 'detecting'
  | 'removing'
  | 'exporting'
  | 'completed'
  | 'skipped'
  | 'failed'
  | 'cancelled';

export type GPUMode = 'preferred' | 'strict' | 'cpu-only';

export interface JobRecord {
  id: string;
  filePath: string;
  fileName: string;
  fileSizeBytes: number;
  stage: ProcessingStage;
  progress: number;
  framesCurrent: number;
  framesTotal: number;
  errorMessage?: string;
  outputPath?: string;
  startedAt?: number;
  completedAt?: number;
  gpuBackend?: string;
}

export interface BatchState {
  jobs: JobRecord[];
  total: number;
  completed: number;
  failed: number;
  skipped: number;
  cancelled: number;
  isRunning: boolean;
  gpuMode: GPUMode;
}

export interface EngineCapabilities {
  webgpu: boolean;
  hardwareVideoDecoder: boolean;
  hardwareVideoEncoder: boolean;
  wasmThreads: boolean;
  threadCount: number;
}
