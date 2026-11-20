import { describe, it, expect, beforeEach } from 'vitest';
import { batchOrchestrator } from '../../src/engine/batchOrchestrator';
import { detectCapabilities, selectOrtProvider } from '../../src/engine/gpuPolicy';
import { getModelPath } from '../../src/engine/modelLoader';

describe('GPU Policy and Model Loader', () => {
  it('selects wasm in cpu-only mode', () => {
    const caps = {
      webgpu: true,
      hardwareVideoDecoder: true,
      hardwareVideoEncoder: true,
      wasmThreads: true,
      threadCount: 4,
    };
    expect(selectOrtProvider(caps, 'cpu-only')).toBe('wasm');
  });

  it('selects webgpu when available in preferred mode', () => {
    const caps = {
      webgpu: true,
      hardwareVideoDecoder: true,
      hardwareVideoEncoder: true,
      wasmThreads: true,
      threadCount: 4,
    };
    expect(selectOrtProvider(caps, 'preferred')).toBe('webgpu');
  });

  it('falls back to wasm in preferred mode when webgpu unavailable', () => {
    const caps = {
      webgpu: false,
      hardwareVideoDecoder: false,
      hardwareVideoEncoder: false,
      wasmThreads: true,
      threadCount: 4,
    };
    expect(selectOrtProvider(caps, 'preferred')).toBe('wasm');
  });

  it('throws error in strict GPU mode when webgpu unavailable', () => {
    const caps = {
      webgpu: false,
      hardwareVideoDecoder: false,
      hardwareVideoEncoder: false,
      wasmThreads: true,
      threadCount: 4,
    };
    expect(() => selectOrtProvider(caps, 'strict')).toThrowError(/Strict GPU mode: WebGPU unavailable/);
  });

  it('resolves correct ONNX model path by watermark size', () => {
    expect(getModelPath(24, true)).toContain('model_core_fp32_86x74.onnx');
    expect(getModelPath(48, false)).toContain('model_core_fp32_104.onnx');
    expect(getModelPath(72, false)).toContain('model_core_fp32_200.onnx');
  });
});

describe('Batch Orchestrator State Management', () => {
  it('initializes with empty queue and correct defaults', () => {
    const state = batchOrchestrator.getState();
    expect(state.jobs).toEqual([]);
    expect(state.total).toBe(0);
    expect(state.completed).toBe(0);
    expect(state.failed).toBe(0);
    expect(state.skipped).toBe(0);
    expect(state.cancelled).toBe(0);
    expect(state.isRunning).toBe(false);
  });

  it('adds files and computes file status', () => {
    let latestState = batchOrchestrator.getState();
    const unsubscribe = batchOrchestrator.subscribe((s) => {
      latestState = s;
    });

    batchOrchestrator.addFiles(['test1.mp4', 'test2.mov']);
    expect(latestState.total).toBe(2);
    expect(latestState.jobs.length).toBe(2);
    expect(latestState.jobs[0].fileName).toBe('test1.mp4');
    expect(latestState.jobs[1].fileName).toBe('test2.mov');

    batchOrchestrator.cancelAll();
    unsubscribe();
  });

  it('deduplicates input and active files', () => {
    let latestState = batchOrchestrator.getState();
    const unsubscribe = batchOrchestrator.subscribe((s) => {
      latestState = s;
    });

    batchOrchestrator.addFiles(['dup.mp4', 'dup.mp4']);
    expect(latestState.jobs.filter(j => j.filePath === 'dup.mp4').length).toBe(1);

    // Attempting to re-add while already active is ignored
    batchOrchestrator.addFiles(['dup.mp4']);
    expect(latestState.jobs.filter(j => j.filePath === 'dup.mp4').length).toBe(1);

    batchOrchestrator.cancelAll();
    unsubscribe();
  });
});
