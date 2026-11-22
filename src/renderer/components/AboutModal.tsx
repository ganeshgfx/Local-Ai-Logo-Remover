import React from 'react';
import {
  X,
  Sparkles,
  ExternalLink,
  Cpu,
  Layers,
  ShieldCheck,
  Code,
  Film,
} from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AboutModal({ isOpen, onClose }: AboutModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl max-h-[85vh] bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-zinc-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800/80 bg-zinc-900/50 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-200 shadow-inner">
              <Sparkles className="w-5 h-5 text-zinc-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-zinc-100">AI Watermark Remover</h2>
                <Badge variant="outline" className="text-[11px] px-2 py-0 border-zinc-700 text-zinc-300">
                  v1.0.1
                </Badge>
              </div>
              <p className="text-xs text-zinc-400">Offline reverse alpha-blending & AI video restoration</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto px-6 py-5 space-y-6 text-xs text-zinc-300 leading-relaxed">
          {/* Summary Banner */}
          <div className="p-3.5 rounded-xl bg-zinc-900/50 border border-zinc-800/80 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
            <p className="text-zinc-300">
              This application operates <strong className="text-zinc-100">100% locally and offline</strong> with zero cloud uploads, using exact mathematical alpha inversion and GPU-accelerated neural network touch-ups.
            </p>
          </div>

          {/* Section: Upstream Projects */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-zinc-100 font-semibold text-sm">
              <Layers className="w-4 h-4 text-zinc-400" />
              <h3>Core Algorithm & Upstream Attribution</h3>
            </div>
            <p className="text-zinc-400">
              The underlying detection mathematics and watermark removal solvers are directly based on the ground-breaking open-source work by <strong>Allen Kuo (<code className="text-zinc-200 bg-zinc-900 px-1 py-0.5 rounded">allenk</code>)</strong>:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <a
                href="https://github.com/allenk/GeminiWatermarkTool"
                target="_blank"
                rel="noopener noreferrer"
                className="p-3 rounded-xl border border-zinc-800/90 bg-zinc-900/30 hover:bg-zinc-900/70 hover:border-zinc-700 transition-all group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between text-zinc-100 font-medium mb-1">
                    <span>GeminiWatermarkTool</span>
                    <ExternalLink className="w-3.5 h-3.5 text-zinc-500 group-hover:text-zinc-300" />
                  </div>
                  <p className="text-[11px] text-zinc-400 leading-normal">
                    Original reverse alpha-blending math, embedded alpha maps, contour repair, and multi-pass candidate selection.
                  </p>
                </div>
                <span className="text-[10px] text-zinc-500 mt-2 block font-mono">github.com/allenk/GeminiWatermarkTool</span>
              </a>

              <a
                href="https://github.com/allenk/VeoWatermarkRemover"
                target="_blank"
                rel="noopener noreferrer"
                className="p-3 rounded-xl border border-zinc-800/90 bg-zinc-900/30 hover:bg-zinc-900/70 hover:border-zinc-700 transition-all group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between text-zinc-100 font-medium mb-1">
                    <span>VeoWatermarkRemover</span>
                    <ExternalLink className="w-3.5 h-3.5 text-zinc-500 group-hover:text-zinc-300" />
                  </div>
                  <p className="text-[11px] text-zinc-400 leading-normal">
                    Video watermark detection templates, track state management, and Veo text watermark heuristics.
                  </p>
                </div>
                <span className="text-[10px] text-zinc-500 mt-2 block font-mono">github.com/allenk/VeoWatermarkRemover</span>
              </a>
            </div>
          </section>

          {/* Section: Deep Learning */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-zinc-100 font-semibold text-sm">
              <Cpu className="w-4 h-4 text-zinc-400" />
              <h3>Neural Network Architecture</h3>
            </div>
            <div className="p-3.5 rounded-xl border border-zinc-800/90 bg-zinc-900/30 space-y-2">
              <div className="font-medium text-zinc-200">
                FDnCNN (Fast & Flexible Denoising Convolutional Neural Network)
              </div>
              <p className="text-zinc-400 text-[11px] leading-relaxed">
                Residual deep learning framework for image denoising based on the academic research by Kai Zhang, Wangmeng Zuo, Yunjin Chen, Deyu Meng, and Lei Zhang (<em>IEEE Transactions on Image Processing</em>). The bundled models (<code className="text-zinc-300 bg-zinc-800/80 px-1 py-0.5 rounded text-[10px]">model_core_fp32_104.onnx</code>, <code className="text-zinc-300 bg-zinc-800/80 px-1 py-0.5 rounded text-[10px]">model_core_fp32_200.onnx</code>, <code className="text-zinc-300 bg-zinc-800/80 px-1 py-0.5 rounded text-[10px]">model_core_fp32_86x74.onnx</code>) are derived from Allen Kuo's trained weights converted for ONNX Runtime.
              </p>
            </div>
          </section>

          {/* Section: Engines & Runtimes */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-zinc-100 font-semibold text-sm">
              <Film className="w-4 h-4 text-zinc-400" />
              <h3>Video Processing & Inference Engines</h3>
            </div>
            <ul className="space-y-2 text-[11px] text-zinc-300">
              <li className="flex items-start gap-2">
                <span className="font-semibold text-zinc-200 min-w-[130px]">ONNX Runtime Web:</span>
                <span className="text-zinc-400">Microsoft's machine learning inference engine executing with WebGPU acceleration and multi-threaded WASM SIMD fallback.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-semibold text-zinc-200 min-w-[130px]">mediabunny:</span>
                <span className="text-zinc-400">High-performance video demuxing, frame packet parsing, and encoding wrapper for WebCodecs by Remotion.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-semibold text-zinc-200 min-w-[130px]">WebGPU / WGSL:</span>
                <span className="text-zinc-400">W3C GPU compute shader standard powering custom reverse-blending GPU pipelines.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-semibold text-zinc-200 min-w-[130px]">WebCodecs API:</span>
                <span className="text-zinc-400">Hardware video decoding and encoding inside Chromium.</span>
              </li>
            </ul>
          </section>

          {/* Section: UI & Desktop Integration */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-zinc-100 font-semibold text-sm">
              <Code className="w-4 h-4 text-zinc-400" />
              <h3>Desktop Application & Windows Shell Integration</h3>
            </div>
            <ul className="space-y-2 text-[11px] text-zinc-300">
              <li className="flex items-start gap-2">
                <span className="font-semibold text-zinc-200 min-w-[130px]">Desktop Shell:</span>
                <span className="text-zinc-400">Electron, Vite, React, TypeScript, Tailwind CSS, Lucide React.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-semibold text-zinc-200 min-w-[130px]">Windows Explorer COM:</span>
                <span className="text-zinc-400">Native C++ <code className="text-zinc-300">IExplorerCommand</code> handler for Windows 10 & 11 context menus with MSIX Sparse Package packaging.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-semibold text-zinc-200 min-w-[130px]">Maintainer:</span>
                <span className="text-zinc-400">
                  <a
                    href="https://github.com/ganeshgfx/Local-Ai-Logo-Remover"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-zinc-200 hover:text-white underline underline-offset-2"
                  >
                    ganeshgfx / Local-Ai-Logo-Remover
                  </a>
                </span>
              </li>
            </ul>
          </section>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-zinc-800/80 bg-zinc-900/50 flex items-center justify-between flex-shrink-0">
          <span className="text-[11px] text-zinc-500">Released under the MIT License</span>
          <Button variant="default" size="sm" onClick={onClose} className="text-xs px-4">
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
