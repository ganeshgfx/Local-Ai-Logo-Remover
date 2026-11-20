import React, { useEffect, useState, useCallback, useRef } from 'react';
import type { BatchState, JobRecord } from '../shared/types';
import { batchOrchestrator } from '../engine/batchOrchestrator';
import { Button } from './components/ui/button';
import { Card } from './components/ui/card';
import { Badge } from './components/ui/badge';
import { Progress } from './components/ui/progress';
import {
  Sparkles,
  Film,
  Check,
  Loader2,
  X,
  FolderOpen,
  Plus,
  Cpu,
  AlertTriangle,
  UploadCloud,
  Trash2,
  FileVideo,
  LayoutGrid,
  List,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

const STAGE_LABELS: Record<string, string> = {
  queued: 'Queued',
  initializing: 'Initializing',
  detecting: 'Detecting watermark',
  removing: 'Removing watermark',
  exporting: 'Exporting',
  completed: 'Completed',
  skipped: 'No watermark found',
  failed: 'Failed',
  cancelled: 'Cancelled',
};

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(1)} MB`;
  return `${(bytes / 1073741824).toFixed(2)} GB`;
}

// ----------------------------------------------------
// Comfortable Card View
// ----------------------------------------------------
function JobCardDetailed({ job }: { job: JobRecord }) {
  const isRunning = ['initializing', 'detecting', 'removing', 'exporting'].includes(job.stage);
  const isCompleted = job.stage === 'completed';
  const isFailed = job.stage === 'failed';
  const isSkipped = job.stage === 'skipped';
  const isCancelled = job.stage === 'cancelled';

  const handleShowInFolder = useCallback(() => {
    if (job.outputPath) {
      (window as any).electronAPI?.showInFolder?.(job.outputPath);
    }
  }, [job.outputPath]);

  const handleCancelThisJob = useCallback(() => {
    batchOrchestrator.cancelJob(job.id);
  }, [job.id]);

  return (
    <Card className="p-5 mb-4 border-zinc-800/90 bg-zinc-950/70 hover:border-zinc-700 transition-all duration-200 shadow-sm rounded-xl">
      {/* Header Row */}
      <div className="flex items-center justify-between gap-4 mb-3.5">
        <div className="flex items-center gap-3.5 min-w-0 flex-1">
          <div className="h-11 w-11 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center flex-shrink-0 text-zinc-200">
            <Film className="w-5 h-5 text-zinc-300" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2.5">
              <span className="font-semibold text-sm text-zinc-100 truncate block">
                {job.fileName}
              </span>
              {job.gpuBackend && (
                <Badge variant="secondary" className="text-[11px] px-2 py-0.5 uppercase tracking-wider font-mono">
                  {job.gpuBackend}
                </Badge>
              )}
            </div>
            {job.fileSizeBytes > 0 && (
              <span className="text-xs text-zinc-400 block mt-0.5">
                {formatBytes(job.fileSizeBytes)}
              </span>
            )}
          </div>
        </div>

        {/* Status Badge & Cancel Action */}
        <div className="flex items-center gap-2.5 flex-shrink-0">
          {isRunning && (
            <Badge variant="active" className="gap-2 px-3 py-1 text-xs">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-300" />
              <span>{STAGE_LABELS[job.stage] || job.stage}</span>
            </Badge>
          )}

          {isCompleted && (
            <Badge variant="success" className="gap-1.5 px-3 py-1 text-xs bg-zinc-900 border-zinc-700 text-zinc-100">
              <Check className="w-3.5 h-3.5 text-zinc-100" />
              <span>Completed</span>
            </Badge>
          )}

          {isSkipped && (
            <Badge variant="secondary" className="px-3 py-1 text-xs text-zinc-400">
              No watermark found
            </Badge>
          )}

          {isFailed && (
            <Badge variant="destructive" className="gap-1.5 px-3 py-1 text-xs">
              <AlertTriangle className="w-3.5 h-3.5 text-zinc-300" />
              <span>Failed</span>
            </Badge>
          )}

          {isCancelled && (
            <Badge variant="outline" className="px-3 py-1 text-xs text-zinc-500">
              Cancelled
            </Badge>
          )}

          {job.stage === 'queued' && (
            <Badge variant="secondary" className="px-3 py-1 text-xs text-zinc-400">
              Queued
            </Badge>
          )}

          {(isRunning || job.stage === 'queued') && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg"
              onClick={handleCancelThisJob}
              title="Cancel this job"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      {(isRunning || job.progress > 0) && (
        <div className="space-y-2 mt-3">
          <Progress
            value={job.progress}
            className="h-2 bg-zinc-900 border-zinc-800 rounded-full"
            indicatorClassName="bg-zinc-100"
          />

          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>
              {job.framesTotal > 0 && job.stage === 'removing'
                ? `Frame ${job.framesCurrent} / ${job.framesTotal} (${Math.round(job.progress)}%)`
                : `${Math.round(job.progress)}% completed`}
            </span>
            <span>{job.stage === 'exporting' ? 'Finalizing video output...' : ''}</span>
          </div>
        </div>
      )}

      {/* Output File notification */}
      {job.outputPath && (
        <div className="mt-3.5 pt-3 border-t border-zinc-800/80 flex items-center justify-between gap-3 text-xs bg-zinc-900/30 -mx-5 -mb-5 px-5 py-3 rounded-b-xl">
          <div className="flex items-center gap-2 text-zinc-400 truncate min-w-0">
            <Check className="w-4 h-4 text-zinc-200 flex-shrink-0" />
            <span className="truncate">
              Saved: <span className="text-zinc-200 font-mono font-medium">{job.outputPath.split(/[\\/]/).pop()}</span>
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleShowInFolder}
            className="h-7 px-3 text-xs gap-1.5 text-zinc-300 hover:text-white border-zinc-800 bg-zinc-900 hover:bg-zinc-800 flex-shrink-0"
          >
            <FolderOpen className="w-3.5 h-3.5" />
            Show in Folder
          </Button>
        </div>
      )}

      {/* Error Message */}
      {job.errorMessage && (
        <div className="mt-3.5 p-3 rounded-xl border border-zinc-800 bg-zinc-900/70 text-xs text-zinc-300 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-zinc-400 flex-shrink-0 mt-0.5" />
          <span className="break-all">{job.errorMessage}</span>
        </div>
      )}
    </Card>
  );
}

// ----------------------------------------------------
// Compact Row View
// ----------------------------------------------------
function JobRowCompact({ job }: { job: JobRecord }) {
  const isRunning = ['initializing', 'detecting', 'removing', 'exporting'].includes(job.stage);
  const isCompleted = job.stage === 'completed';

  const handleShowInFolder = useCallback(() => {
    if (job.outputPath) {
      (window as any).electronAPI?.showInFolder?.(job.outputPath);
    }
  }, [job.outputPath]);

  const handleCancelThisJob = useCallback(() => {
    batchOrchestrator.cancelJob(job.id);
  }, [job.id]);

  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2.5 border border-zinc-800/80 bg-zinc-950/60 hover:bg-zinc-900/40 rounded-lg mb-2 transition-colors">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <Film className="w-4 h-4 text-zinc-400 flex-shrink-0" />
        <span className="text-xs font-medium text-zinc-200 truncate max-w-sm">
          {job.fileName}
        </span>
        {job.fileSizeBytes > 0 && (
          <span className="text-[11px] text-zinc-500 hidden sm:inline flex-shrink-0">
            {formatBytes(job.fileSizeBytes)}
          </span>
        )}
      </div>

      <div className="flex items-center gap-3 flex-shrink-0">
        {isRunning && (
          <div className="w-28 flex items-center gap-2">
            <Progress value={job.progress} className="h-1.5 flex-1 bg-zinc-900" />
            <span className="text-[11px] text-zinc-400 w-7 text-right">{Math.round(job.progress)}%</span>
          </div>
        )}

        <Badge variant={isCompleted ? 'success' : isRunning ? 'active' : 'secondary'} className="text-[11px] px-2 py-0.5">
          {STAGE_LABELS[job.stage] || job.stage}
        </Badge>

        {isCompleted && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleShowInFolder}
            className="h-7 px-2 text-[11px] text-zinc-400 hover:text-white"
            title="Show in Folder"
          >
            <FolderOpen className="w-3.5 h-3.5" />
          </Button>
        )}

        {(isRunning || job.stage === 'queued') && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-zinc-500 hover:text-white"
            onClick={handleCancelThisJob}
            title="Cancel"
          >
            <X className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}

// ----------------------------------------------------
// Main App Component
// ----------------------------------------------------
export default function App() {
  const [batch, setBatch] = useState<BatchState>(() => batchOrchestrator.getState());
  const [isDragging, setIsDragging] = useState(false);
  const [viewMode, setViewMode] = useState<'cards' | 'compact'>('cards');
  const [statsCollapsed, setStatsCollapsed] = useState(false);
  const initialFilesLoadedRef = useRef(false);

  useEffect(() => {
    const unsub = batchOrchestrator.subscribe((state: BatchState) => setBatch(state));
    return unsub;
  }, []);

  const handleSelectFiles = useCallback(async () => {
    const api = (window as any).electronAPI;
    if (api?.selectFiles) {
      const paths: string[] = await api.selectFiles();
      if (Array.isArray(paths) && paths.length > 0) {
        batchOrchestrator.addFiles(paths, 'preferred');
      }
    }
  }, []);

  const handleCancelAll = useCallback(() => {
    batchOrchestrator.cancelAll();
    (window as any).electronAPI?.cancelAll?.();
  }, []);

  const handleClearFinished = useCallback(() => {
    batchOrchestrator.clearFinished();
  }, []);

  useEffect(() => {
    const api = (window as any).electronAPI;
    if (!api) return;

    if (api.getInitialFiles && !initialFilesLoadedRef.current) {
      initialFilesLoadedRef.current = true;
      api
        .getInitialFiles()
        .then((paths: string[]) => {
          if (Array.isArray(paths) && paths.length > 0) {
            batchOrchestrator.addFiles(paths, 'preferred');
          }
        })
        .catch((err: any) => {
          console.error('Failed to get initial files:', err);
        });
    }

    if (api.onAddFiles) {
      const unsub = api.onAddFiles((paths: string[]) => {
        if (Array.isArray(paths) && paths.length > 0) {
          batchOrchestrator.addFiles(paths, 'preferred');
        }
      });
      // Signal main process that renderer is ready to receive batch:add-files messages
      api.signalReady?.();
      return typeof unsub === 'function' ? unsub : undefined;
    } else {
      // No onAddFiles available, still signal ready
      api.signalReady?.();
    }
  }, []);

  // Drag and drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const paths: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const path = (file as any).path;
        if (path) paths.push(path);
      }
      if (paths.length > 0) {
        batchOrchestrator.addFiles(paths, 'preferred');
      }
    }
  }, []);

  const completedCount = batch.completed + batch.failed + batch.skipped + batch.cancelled;
  const completedPercent =
    batch.total > 0 ? Math.round((completedCount / batch.total) * 100) : 0;

  const hasFinishedJobs =
    batch.completed > 0 || batch.failed > 0 || batch.skipped > 0 || batch.cancelled > 0;

  return (
    <div
      className="flex flex-col h-screen w-screen bg-black text-zinc-100 font-sans select-none overflow-hidden"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drag overlay */}
      {isDragging && (
        <div className="absolute inset-0 z-50 bg-black/85 backdrop-blur-md border-2 border-dashed border-zinc-300 flex flex-col items-center justify-center pointer-events-none transition-all">
          <UploadCloud className="w-16 h-16 text-zinc-100 mb-4 animate-bounce" />
          <p className="text-base font-semibold text-zinc-100">Drop videos here to remove watermark</p>
          <p className="text-xs text-zinc-400 mt-1">Runs 100% locally with GPU acceleration</p>
        </div>
      )}

      {/* Navigation / Header */}
      <header className="h-16 border-b border-zinc-800/80 px-6 flex items-center justify-between flex-shrink-0 bg-black/60 backdrop-blur-md">
        <div className="flex items-center gap-3.5">
          <div className="h-10 w-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center shadow-sm">
            <Sparkles className="w-5 h-5 text-zinc-100" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm tracking-tight text-zinc-100">
                Gemini Remover
              </span>
              <Badge variant="outline" className="text-[11px] px-2 py-0 text-zinc-400 border-zinc-800">
                Local AI
              </Badge>
            </div>
            <p className="text-xs text-zinc-400 hidden sm:block">
              Zero cloud uploads · Onnx / WebGPU
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Convertible View Toggle (Cards vs Compact) */}
          {batch.jobs.length > 0 && (
            <div className="flex items-center border border-zinc-800 rounded-lg p-0.5 bg-zinc-900/60">
              <button
                onClick={() => setViewMode('cards')}
                className={`p-1.5 rounded-md text-xs transition-colors ${
                  viewMode === 'cards'
                    ? 'bg-zinc-800 text-zinc-100 shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
                title="Comfortable Card View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('compact')}
                className={`p-1.5 rounded-md text-xs transition-colors ${
                  viewMode === 'compact'
                    ? 'bg-zinc-800 text-zinc-100 shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
                title="Compact List View"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* GPU Status Pill */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-zinc-800/80 bg-zinc-900/60 text-xs text-zinc-300 font-medium">
            <Cpu className="w-3.5 h-3.5 text-zinc-400" />
            <span>GPU: {batch.gpuMode}</span>
          </div>

          {/* Add Videos Button */}
          <Button
            variant="default"
            size="default"
            onClick={handleSelectFiles}
            className="gap-2 text-xs font-semibold shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Add Videos</span>
          </Button>
        </div>
      </header>

      {/* Convertible Batch Overview Card */}
      {batch.total > 0 && (
        <div className="px-6 py-4 border-b border-zinc-800/80 bg-zinc-950/40">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Batch Overview
              </span>
              <span className="text-xs text-zinc-400">
                {batch.completed} of {batch.total} done
                {batch.failed > 0 && ` · ${batch.failed} failed`}
                {batch.skipped > 0 && ` · ${batch.skipped} skipped`}
                {` (${completedPercent}%)`}
              </span>
            </div>

            {/* Collapse/Expand Stats Toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setStatsCollapsed(prev => !prev)}
              className="h-7 px-2 text-xs text-zinc-400 hover:text-zinc-200 gap-1"
            >
              <span>{statsCollapsed ? 'Show Stats' : 'Collapse'}</span>
              {statsCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
            </Button>
          </div>

          {!statsCollapsed && (
            <div className="grid grid-cols-4 gap-3.5 mb-3.5">
              <Card className="p-3.5 bg-zinc-900/40 border-zinc-800/80">
                <div className="text-xs text-zinc-400 font-medium">Total Files</div>
                <div className="text-2xl font-bold text-zinc-100 mt-1">{batch.total}</div>
              </Card>
              <Card className="p-3.5 bg-zinc-900/40 border-zinc-800/80">
                <div className="text-xs text-zinc-400 font-medium">Completed</div>
                <div className="text-2xl font-bold text-zinc-100 mt-1">{batch.completed}</div>
              </Card>
              <Card className="p-3.5 bg-zinc-900/40 border-zinc-800/80">
                <div className="text-xs text-zinc-400 font-medium">Remaining</div>
                <div className="text-2xl font-bold text-zinc-100 mt-1">
                  {batch.total - completedCount}
                </div>
              </Card>
              <Card className="p-3.5 bg-zinc-900/40 border-zinc-800/80">
                <div className="text-xs text-zinc-400 font-medium">Overall Progress</div>
                <div className="text-2xl font-bold text-zinc-100 mt-1">{completedPercent}%</div>
              </Card>
            </div>
          )}

          <div className="space-y-1">
            <Progress
              value={completedPercent}
              className="h-2 bg-zinc-900 border-zinc-800 rounded-full"
              indicatorClassName="bg-zinc-100"
            />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto px-6 py-5">
        {batch.jobs.length === 0 ? (
          <div
            onClick={handleSelectFiles}
            className="h-full min-h-[380px] border-2 border-dashed border-zinc-800/90 hover:border-zinc-700 bg-zinc-950/40 hover:bg-zinc-950/70 transition-all duration-200 rounded-2xl flex flex-col items-center justify-center p-12 text-center cursor-pointer group"
          >
            <div className="h-16 w-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 group-hover:text-zinc-100 group-hover:border-zinc-700 transition-colors mb-4 shadow-sm">
              <FileVideo className="w-8 h-8" />
            </div>
            <h3 className="text-base font-semibold text-zinc-100 mb-1.5">
              Select or drop video files here
            </h3>
            <p className="text-xs text-zinc-400 max-w-md mb-6 leading-relaxed">
              Right-click any video in Windows Explorer &rarr; <span className="text-zinc-200 font-medium">Remove Gemini</span>, or click here to select files.
            </p>
            <Button variant="secondary" size="lg" className="gap-2 text-xs font-semibold pointer-events-none">
              <Plus className="w-4 h-4" />
              <span>Browse Video Files</span>
            </Button>
          </div>
        ) : (
          <div className="space-y-1">
            {batch.jobs.map((job: JobRecord) =>
              viewMode === 'cards' ? (
                <JobCardDetailed key={job.id} job={job} />
              ) : (
                <JobRowCompact key={job.id} job={job} />
              )
            )}

            {/* Convertible Drop More Zone */}
            <div
              onClick={handleSelectFiles}
              className="mt-4 border border-dashed border-zinc-800/80 hover:border-zinc-700 bg-zinc-950/30 hover:bg-zinc-900/30 transition-all duration-200 rounded-xl p-4 flex items-center justify-center gap-2.5 text-xs text-zinc-400 hover:text-zinc-200 cursor-pointer"
            >
              <Plus className="w-4 h-4 text-zinc-500" />
              <span>Click or drop more videos to queue</span>
            </div>
          </div>
        )}
      </main>

      {/* Footer Actions */}
      {batch.jobs.length > 0 && (
        <footer className="h-14 border-t border-zinc-800/80 px-6 flex items-center justify-between flex-shrink-0 bg-black/60 backdrop-blur-md">
          <div className="text-xs text-zinc-400">
            {batch.isRunning ? (
              <span className="flex items-center gap-2 text-zinc-200 font-medium">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Processing video batch queue...
              </span>
            ) : (
              <span>All queue tasks completed</span>
            )}
          </div>

          <div className="flex items-center gap-3">
            {hasFinishedJobs && !batch.isRunning && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearFinished}
                className="h-8 text-xs text-zinc-400 hover:text-zinc-100 gap-2"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Clear Completed
              </Button>
            )}

            {batch.isRunning && (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleCancelAll}
                className="h-8 text-xs gap-2"
              >
                <X className="w-3.5 h-3.5" />
                Cancel All
              </Button>
            )}
          </div>
        </footer>
      )}
    </div>
  );
}
