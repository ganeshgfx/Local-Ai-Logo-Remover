# AI Watermark Remover — Windows File Explorer Integration

A high-performance Windows desktop application that integrates directly into the Windows File Explorer right-click context menu (Windows 10 & Windows 11 modern context menu) to detect and remove AI-generated watermarks from videos locally and offline.

---

## Architecture & Overview

- **Desktop Shell**: Electron + Vite + React + TypeScript. Single-instance application handling multi-file batches and manifest inputs.
- **Engine Core**: Native integration with upstream video modules (`mediabunny`, `WebCodecs`, canvas pixel solvers).
- **GPU Inference & AI Restoration**:
  - `onnxruntime-web` execution provider with WebGPU support (`ort-wasm-simd-threaded.jsep.wasm`) and multi-threaded WASM SIMD fallback.
  - Bundled AllenK FDnCNN models:
    - `model_core_fp32_86x74.onnx` (Text watermarks)
    - `model_core_fp32_104.onnx` (Watermarks ≤ 56px)
    - `model_core_fp32_200.onnx` (Default / large watermarks)
  - WebGPU compute shader pipeline (`webgpuPixelOps.ts`) for hardware-accelerated reverse alpha-blending pixel operations.
- **Windows Shell Integration**:
  - **Windows 11**: Native C++ COM component implementing `IExplorerCommand` & `IShellItemArray`, packaged via MSIX Sparse Package for modern context menus.
  - **Windows 10**: Registry-based multi-file shell integration (`register_win10.ps1`).

---

## Directory Structure

```
ai-watermark-remover/
├── native/                         # Windows C++ Shell Extension & Manifests
│   ├── CMakeLists.txt              # CMake configuration for shell extension DLL
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
├── choco/                          # Chocolatey package files
├── tests/
│   └── engine/
│       └── pipeline.test.ts        # Vitest test suite
├── package.json
├── tsconfig.json
├── vite.config.ts
└── vitest.config.ts
```

---

## Installation

### System Requirements
- **OS**: Windows 10 or Windows 11 (64-bit)
- **Hardware**: GPU supporting WebGPU / DirectX 12 recommended for fast inference. Automatic fallback to multi-threaded CPU WASM SIMD if no supported GPU detected.
- **Offline**: Fully self-contained; no internet required after install.

### Method 1: Windows Installer (Recommended)
1. Download the latest installer (`AI.Watermark.Remover.Setup.x.x.x.exe`) from [GitHub Releases](https://github.com/ganeshgfx/Local-Ai-Logo-Remover/releases).
2. Run the executable to install the application.
3. Launch from the Start menu or use the right-click context menu integration.

### Method 2: Chocolatey
Install via Chocolatey package manager:
```powershell
choco install ai-watermark-remover
```

### Method 3: Install from Source (Development)
Prerequisites: [Node.js](https://nodejs.org/) (v18 or v20+) and [Git](https://git-scm.com/).

```bash
# 1. Clone repository
git clone https://github.com/ganeshgfx/Local-Ai-Logo-Remover.git
cd Local-Ai-Logo-Remover

# 2. Install dependencies
npm install

# 3. Start development server
npm run dev
```

---

## Build & Testing Instructions

### 1. Install Dependencies
```bash
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

---

## Attributions & Acknowledgements

This application is built upon and inspired by outstanding open-source projects, academic research, and runtimes:

### Core Algorithm & Watermark Removal Engine
- **[allenk / GeminiWatermarkTool](https://github.com/allenk/GeminiWatermarkTool)** by **Allen Kuo (`allenk`)**
  - Original mathematical formulation for reverse alpha-blending pixel reconstruction (inverting Google's alpha composite equation rather than relying on blurry generative inpainting).
  - Pre-calculated embedded alpha maps, contour repair, adaptive detection heuristics, and candidate arbitration pipeline.
- **[allenk / VeoWatermarkRemover](https://github.com/allenk/VeoWatermarkRemover)** by **Allen Kuo (`allenk`)**
  - Video watermark detection templates, track state handling, and Veo text watermark heuristics.

### Deep Learning Architecture & Models
- **FDnCNN (Fast and Flexible Denoising Convolutional Neural Network)**
  - Architecture and research by Kai Zhang, Wangmeng Zuo, Yunjin Chen, Deyu Meng, and Lei Zhang (*"Beyond a Gaussian Denoiser: Residual Learning of Deep CNN for Image Denoising"*, IEEE TIP 2017).
  - Bundled ONNX models (`model_core_fp32_104.onnx`, `model_core_fp32_200.onnx`, `model_core_fp32_86x74.onnx`) derived from Allen Kuo's trained model weights for offline inference.

### Core Processing Libraries & Runtime
- **[ONNX Runtime Web](https://github.com/microsoft/onnxruntime)** (Microsoft — MIT License):
  - Hardware-accelerated neural network execution via WebGPU with multi-threaded WebAssembly SIMD fallback (`ort-wasm-simd-threaded.jsep.wasm`).
- **[mediabunny](https://github.com/remotion-dev/mediabunny)** (Remotion — MIT License):
  - High-performance client-side video demuxing, decoding, and encoding wrapper for WebCodecs.
- **W3C Standards (Chromium Engine)**:
  - **WebCodecs API**: Hardware video frame decoding and encoding.
  - **WebGPU (WGSL)**: Custom compute shaders for accelerated parallel reverse alpha-blending pixel operations.

### Desktop Shell & UI Framework
- **[Electron](https://github.com/electron/electron)** (OpenJS Foundation — MIT License)
- **[React](https://react.dev/) & [React DOM](https://github.com/facebook/react)** (Meta Platforms, Inc. — MIT License)
- **[Vite](https://vite.dev/)** & **[vite-plugin-electron](https://github.com/electron-vite/vite-plugin-electron)** (MIT License)
- **[Tailwind CSS](https://tailwindcss.com/)** (Tailwind Labs — MIT License)
- **[Lucide React](https://lucide.dev/)** (Lucide Contributors — ISC License)
- **[clsx](https://github.com/lukeed/clsx)**, **[tailwind-merge](https://github.com/dcastil/tailwind-merge)**, **[class-variance-authority](https://cva.style/)**

### Windows Shell & Native OS Integration
- **Microsoft Windows SDK**: C++ COM implementation (`IExplorerCommand`, `IObjectWithSite`, `IShellItemArray`) for File Explorer context menu integration.
- **Windows 11 MSIX Sparse Packages**: Identity registration for modern Windows 11 context menus.
- **Packaging & Distribution**: [Chocolatey Package](choco/ai-watermark-remover.nuspec) & NSIS installer via `electron-builder`.

---

## AI Code Disclaimer

> [!NOTE]
> Parts of this codebase, documentation, and configuration were developed with the assistance of Artificial Intelligence (AI) coding tools. While all components have been tested and verified, the software is provided "as is", without warranty of any kind. Users should evaluate and test it according to their own requirements and security standards.

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
