import { processVideoFile } from './processingPipeline';
import type { JobRecord, BatchState, GPUMode } from '../shared/types';

type BatchListener = (state: BatchState) => void;

class BatchOrchestrator {
  private jobs: JobRecord[] = [];
  private abortControllers = new Map<string, AbortController>();
  private globalAbort = new AbortController();
  private listeners: BatchListener[] = [];
  private running = false;
  private gpuMode: GPUMode = 'preferred';

  subscribe(fn: BatchListener) {
    this.listeners.push(fn);
    return () => {
      this.listeners = this.listeners.filter(l => l !== fn);
    };
  }

  private notify() {
    const state = this.getState();
    this.listeners.forEach(l => l(state));
  }

  getState(): BatchState {
    return {
      jobs: [...this.jobs],
      total: this.jobs.length,
      completed: this.jobs.filter(j => j.stage === 'completed').length,
      failed: this.jobs.filter(j => j.stage === 'failed').length,
      skipped: this.jobs.filter(j => j.stage === 'skipped').length,
      cancelled: this.jobs.filter(j => j.stage === 'cancelled').length,
      isRunning: this.running,
      gpuMode: this.gpuMode,
    };
  }

  addFiles(filePaths: string[], gpuMode: GPUMode = 'preferred') {
    this.gpuMode = gpuMode;
    const activePaths = new Set(
      this.jobs
        .filter(j => ['queued', 'initializing', 'detecting', 'removing', 'exporting'].includes(j.stage))
        .map(j => j.filePath)
    );

    const uniquePaths = Array.from(new Set(filePaths)).filter(p => !activePaths.has(p));
    if (uniquePaths.length === 0) return;

    const newJobs: JobRecord[] = uniquePaths.map(p => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      filePath: p,
      fileName: p.split(/[\\/]/).pop() || p,
      fileSizeBytes: 0,
      stage: 'queued' as const,
      progress: 0,
      framesCurrent: 0,
      framesTotal: 0,
    }));
    this.jobs.push(...newJobs);
    this.notify();
    if (!this.running) this.runNext();
  }

  cancelJob(jobId: string) {
    const ctrl = this.abortControllers.get(jobId);
    if (ctrl) ctrl.abort();
    const job = this.jobs.find(j => j.id === jobId);
    if (job && job.stage === 'queued') {
      job.stage = 'cancelled';
      this.notify();
    }
  }

  cancelAll() {
    this.globalAbort.abort();
    this.globalAbort = new AbortController();
    this.jobs
      .filter(j => ['queued', 'initializing', 'detecting', 'removing', 'exporting'].includes(j.stage))
      .forEach(j => {
        j.stage = 'cancelled';
      });
    this.notify();
  }

  clearFinished() {
    this.jobs = this.jobs.filter(j =>
      ['queued', 'initializing', 'detecting', 'removing', 'exporting'].includes(j.stage)
    );
    this.notify();
  }

  private updateJob(id: string, update: Partial<JobRecord>) {
    const job = this.jobs.find(j => j.id === id);
    if (job) Object.assign(job, update);
    this.notify();
  }

  private async runNext() {
    const nextJob = this.jobs.find(j => j.stage === 'queued');
    if (!nextJob) {
      this.running = false;
      this.notify();
      return;
    }

    this.running = true;
    const ctrl = new AbortController();
    this.abortControllers.set(nextJob.id, ctrl);

    // Combine with global abort
    this.globalAbort.signal.addEventListener('abort', () => ctrl.abort());

    try {
      nextJob.startedAt = Date.now();
      const result = await processVideoFile(nextJob.filePath, nextJob.id, {
        gpuMode: this.gpuMode,
        onProgress: update => this.updateJob(nextJob.id, update),
        signal: ctrl.signal,
      });
      nextJob.completedAt = Date.now();
      if (result.skipped) {
        this.updateJob(nextJob.id, { stage: 'skipped', progress: 100 });
      } else {
        this.updateJob(nextJob.id, { stage: 'completed', progress: 100, outputPath: result.outputPath });
      }
    } catch (err: any) {
      nextJob.completedAt = Date.now();
      if (err?.name === 'AbortError' || ctrl.signal.aborted) {
        this.updateJob(nextJob.id, { stage: 'cancelled', progress: nextJob.progress });
      } else {
        this.updateJob(nextJob.id, {
          stage: 'failed',
          errorMessage: err?.message || String(err),
          progress: nextJob.progress,
        });
      }
    } finally {
      this.abortControllers.delete(nextJob.id);
    }

    // Always continue to next job regardless of error
    this.runNext();
  }
}

export const batchOrchestrator = new BatchOrchestrator();
export type { BatchListener };
