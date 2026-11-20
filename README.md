# Gemini Watermark Remover — Windows File Explorer Integration

A high-performance Windows desktop application that integrates directly into the Windows File Explorer right-click context menu (Windows 10 & Windows 11 modern context menu) to detect and remove Gemini/Veo watermarks from videos locally and offline.

---

## Architecture & Overview

- **Desktop Shell**: Electron + Vite + React + TypeScript. Single-instance application handling multi-file batches and manifest inputs.
- **Engine Core**: Native integration with upstream `@pilio/gemini-watermark-remover` video modules (`mediabunny`, `WebCodecs`, canvas pixel solvers).
- **GPU Inference & AI Restoration**:
  - `onnxruntime-web` execution provider with WebGPU support (`ort-wasm-simd-threaded.jsep.wasm`) and multi-threaded WASM SIMD fallback.
  - Bundled AllenK FDnCNN models:
    - `model_core_fp32_86x74.onnx` (Veo text watermarks)
    - `model_core_fp32_104.onnx` (Watermarks ≤ 56px)
    - `model_core_fp32_200.onnx` (Default / large watermarks)
  - WebGPU compute shader pipeline (`webgpuPixelOps.ts`) for hardware-accelerated reverse alpha-blending pixel operations.
- **Windows Shell Integration**:
  - **Windows 11**: Native C++ COM component implementing `IExplorerCommand` & `IShellItemArray`, packaged via MSIX Sparse Package for modern context menus.
  - **Windows 10**: Registry-based multi-file shell integration (`register_win10.ps1`).

---

## Directory Structure

```
gemini-remover/
├── native/                         # Windows C++ Shell Extension & Manifests
│   ├── CMakeLists.txt              # CMake configuration for GeminiRemoverShellExt.dll
│   ├── dllmain.cpp                 # DLL entry point & COM ClassFactory
│   ├── GeminiRemoverCommand.h      # IExplorerCommand declaration
│   ├── GeminiRemoverCommand.cpp    # Multi-file collection & app invocation
│   ├── GeminiRemoverShellExt.def   # DLL exports
│   └── registry/
│       ├── register_win10.ps1      # Windows 10 shell integration script
│       ├── unregister_win10.ps1    # Uninstaller script for context menu
│       └── SparsePackage/
│           ├── AppxManifest.xml    # Windows 11 MSIX Sparse Package manifest
│           └── register_win11.ps1  # Windows 11 sparse registration script
├── resources/
│   ├── models/allenk-fdncnn/       # Bundled ONNX models (104, 200, 86x74)
│   └── onnxruntime/                # Bundled ORT WASM & WebGPU runtimes
├── src/
│   ├── engine/
│   │   ├── batchOrchestrator.ts    # Sequential batch processing & cancellation
│   │   ├── gpuPolicy.ts            # WebGPU & hardware codec capability detection
│   │   ├── modelLoader.ts          # Singleton ONNX session cache
│   │   ├── onnxBridge.ts           # Bridge to upstream FDnCNN runtime
│   │   ├── processingPipeline.ts   # Video inspection, watermark detection & removal
│   │   └── webgpuPixelOps.ts       # WGSL compute shader for reverse alpha blending
│   ├── main/
│   │   └── index.ts                # Electron main process & manifest IPC
│   ├── preload/
│   │   └── index.ts                # Context bridge APIs
│   ├── renderer/
│   │   ├── App.tsx                 # Processing UI, progress bars & controls
│   │   ├── main.tsx                # React mount point
│   │   └── styles/app.css          # Theme styles
│   ├── shared/
│   │   ├── ipcChannels.ts          # IPC constants
│   │   └── types.ts                # TypeScript data definitions
│   └── vendor/                     # Vendored upstream core & video modules
├── tests/
│   └── engine/
│       └── pipeline.test.ts        # Vitest test suite
├── package.json
├── tsconfig.json
├── vite.config.ts
└── vitest.config.ts
```

---

## Build & Testing Instructions

### 1. Install Dependencies
```bash
cd gemini-remover
npm install
```

### 2. Run Tests
```bash
npm test
```
All unit tests verify GPU policy selection, ONNX model path resolution, and batch orchestrator state transitions.

### 3. Build Production Bundle
```bash
npm run build
```
Builds the Electron main process and Vite renderer bundle with bundled WASM and ONNX assets.

### 4. Build Windows Installer (NSIS)
```bash
npm run build:win
```

---

## Windows Explorer Context Menu Setup

### Windows 11 (Modern Context Menu via Sparse MSIX)
From an elevated PowerShell session:
```powershell
powershell -ExecutionPolicy Bypass -File native\registry\SparsePackage\register_win11.ps1
```

### Windows 10 (Legacy Shell Menu)
From an elevated PowerShell session:
```powershell
powershell -ExecutionPolicy Bypass -File native\registry\register_win10.ps1
```

To remove the menu entry:
```powershell
powershell -ExecutionPolicy Bypass -File native\registry\unregister_win10.ps1
```
