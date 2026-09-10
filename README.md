# Liquid WebGPU Local AI

> **iPadOS Liquid Glass Aesthetic • 100% On-Device WebGPU Inference • Absolute Data Privacy**  
> Pure black obsidian glass interface • Zero server costs • Zero API keys • Zero external network dependencies once weights are cached.

---

## 📑 Table of Contents

1. [Overview & Philosophy](#overview--philosophy)
2. [Interface & Design Language](#interface--design-language)
3. [Supported Models](#supported-models)
4. [Offline Local Model Importer (Generalized Guide)](#offline-local-model-importer-generalized-guide)
   - [Model Directory Specification](#model-directory-specification)
   - [How to Download Weights from Hugging Face](#how-to-download-weights-from-hugging-face)
   - [Importing into the Application](#importing-into-the-application)
5. [Portable Device & Tablet Usage Guide (iPad / Android / Laptops)](#portable-device--tablet-usage-guide-ipad--android--laptops)
   - [Hardware Requirements by Device Tier](#hardware-requirements-by-device-tier)
   - [Enabling WebGPU on Mobile & Tablet Browsers](#enabling-webgpu-on-mobile--tablet-browsers)
   - [Battery & Thermal Optimization](#battery--thermal-optimization)
6. [Inference Engine & Performance Controls](#inference-engine--performance-controls)
7. [Console Logging & Diagnostics Export](#console-logging--diagnostics-export)
8. [Offline Persistence & Storage Management](#offline-persistence--storage-management)
9. [Deployment Guide (GitHub Pages & Static Hosting)](#deployment-guide-github-pages--static-hosting)
10. [Local Development](#local-development)
11. [License](#license)

---

## 🌟 Overview & Philosophy

**Liquid WebGPU Local AI** is an on-device conversational interface built using WebGPU and MLC WebLLM. Large language models run directly on your device's graphics processing unit (GPU) through high-performance WGSL compute shaders.

- **Zero Cloud Leakage**: Prompts, chats, tokens, and weights remain strictly isolated within your browser's sandboxed environment.
- **Dedicated Web Worker Thread**: The inference pipeline executes inside an isolated background worker thread, ensuring the 60fps UI remains responsive without stutter during high-speed token generation.
- **Pure Black Liquid Glass Aesthetics**: Precision-designed monochrome black canvas (`#000000`) paired with optical glass surfaces, translucent blur panels, and transparent interactive elements.
- **Local Storage File Importer**: Capability to import model weights (`params_shard_*.bin`, `ndarray-cache.json`, `mlc-chat-config.json`) directly from offline storage, bypass external network pipelines, and register custom models.

---

## 🎨 Interface & Design Language

The visual design is inspired by the iPadOS liquid glass design paradigm and minimalist black aesthetics:

- **Monochrome Glass Surfaces**: Transparent panels with `backdrop-filter: blur(24px)` and fine borders (`border: 1px solid rgba(255, 255, 255, 0.08)`).
- **Streamlined Navigation**: Clean, focused interface with unnecessary telemetry, ETA text, and network indicators eliminated in favor of clean iconography and a unified Info Guide drawer.
- **Dynamic Welcome State**: Clean greeting interface with prompt input field, model selection, and local import shortcuts.
- **Responsive Layout**: Designed for seamless transitions between compact mobile phone viewports, split-screen tablet multitasking, and wide desktop displays.

---

## 🤖 Supported Models

| Model | Parameters | Quantization | Approx. Weights | VRAM Footprint | Best Suited For |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Qwen3 4B** | 4.0 Billion | `q4f16_1` | ~2.5 GB | 2.8 GB – 3.4 GB | Deep multi-step reasoning, mathematical deduction & coding |
| **Phi-4 Mini** | 3.8 Billion | `q4f16_1` | ~2.5 GB | 2.8 GB – 3.3 GB | Advanced scientific logic, concise instruction-following |
| **Phi-3.5 Mini** | 3.8 Billion | `q4f16_1` | ~2.4 GB | 2.6 GB – 3.1 GB | High-speed everyday chat, summaries & balanced dialogue |

---

## 💾 Offline Local Model Importer (Generalized Guide)

You can import AI model weights directly from your local filesystem or external storage (USB drive, local hard drive, NAS) without downloading them over the internet during runtime.

### Model Directory Specification

Any model compatible with MLC WebLLM uses a standardized structure containing:

```
my-custom-model/
├── mlc-chat-config.json      # Model architecture and generation metadata
├── ndarray-cache.json        # Tensor record mapping shard indices to weight parameters
├── params_shard_0.bin        # Quantized parameter binary shard
├── params_shard_1.bin        # Quantized parameter binary shard
└── ...
```

#### 1. `mlc-chat-config.json`
Contains model architecture details, context window size, stop tokens, and tokenizer metadata:
```json
{
  "model_type": "qwen2",
  "quantization": "q4f16_1",
  "model_id": "my-local-model",
  "conv_template": "chatml",
  "context_window_size": 3072,
  "tokenizer_files": ["tokenizer.json", "tokenizer_config.json"]
}
```

#### 2. `ndarray-cache.json`
Defines the binary array metadata:
```json
{
  "records": [
    { "name": "model.embed_tokens.weight", "shape": [151936, 2560], "dtype": "float16", "nbytes": 777912320, "byteOffset": 0 }
  ]
}
```

### How to Download Weights from Hugging Face

You can download pre-quantized MLC models from Hugging Face repositories (such as `mlc-ai`):

#### Method A: Using Git LFS
```bash
# Clone the repository containing the quantized shards
git lfs install
git clone https://huggingface.co/mlc-ai/Qwen3-4B-q4f16_1-MLC.git

# The folder now contains:
# - mlc-chat-config.json
# - ndarray-cache.json
# - params_shard_*.bin
# - tokenizer.json / tokenizer_config.json
```

#### Method B: Using Hugging Face CLI
```bash
pip install huggingface_hub
huggingface-cli download mlc-ai/Phi-4-mini-instruct-q4f16_1-MLC --local-dir ./Phi-4-mini-local
```

#### Method C: Browser Download
Visit the model repository on Hugging Face (e.g. `https://huggingface.co/mlc-ai/`), open the **Files and versions** tab, and download:
- `mlc-chat-config.json`
- `ndarray-cache.json`
- All `params_shard_*.bin` files
- `tokenizer.json`

### Importing into the Application

1. Open the model selector menu in the top bar or click the **Import Model from Local Storage** button.
2. The **Local Model Importer** modal will appear.
3. Provide a friendly model identifier (e.g. `My-Local-Qwen3`).
4. Select the model files:
   - Drag and drop or browse to select your `mlc-chat-config.json`, `ndarray-cache.json`, and all `params_shard_*.bin` files.
5. Click **Verify & Write to Browser Storage**.
6. The application writes the shards directly to the browser's persistent `CacheStorage` under the namespace `webllm/model`.
7. Once verified, the model appears in your Model Selector menu and can be loaded immediately with zero network transmission.

---

## 📱 Portable Device & Tablet Usage Guide (iPad / Android / Laptops)

Running large language models locally on portable devices requires mindful resource and thermal management.

### Hardware Requirements by Device Tier

| Device Class | Recommended Models | Context Window Profile | Unified Memory / VRAM |
| :--- | :--- | :--- | :--- |
| **High-End Tablet** (iPad Pro M1/M2/M4, Galaxy Tab S9/S10) | Qwen3 4B, Phi-4 Mini | 3,072 or 4,096 Tokens | 8 GB – 16 GB Unified Memory |
| **Standard Tablet** (iPad Air M1/M2, iPad 10th Gen) | Phi-3.5 Mini, Qwen3 4B | 2,048 Tokens (Turbo) | 4 GB – 8 GB Unified Memory |
| **Flagship Phone** (iPhone 15 Pro/16 Pro, Galaxy S24/Pixel 9) | Phi-3.5 Mini | 2,048 Tokens (Turbo) | 8 GB RAM (iOS 18+ / Safari 18+) |
| **Ultraportable Laptop** (MacBook Air M1/M2/M3, Intel Core Ultra) | All models | 3,072 or 4,096 Tokens | 8 GB – 16 GB Unified RAM |

### Enabling WebGPU on Mobile & Tablet Browsers

#### iPadOS / iOS (iPad & iPhone)
- **Requirements**: iPadOS 18.0+ or iOS 18.0+.
- WebGPU is supported natively in Safari.
- To verify or activate experimental WebGPU features:
  1. Open iPad/iPhone **Settings**.
  2. Navigate to **Safari** > **Advanced** > **Feature Flags** (or **Experimental Features**).
  3. Ensure **WebGPU** is toggled **ON**.

#### Android (Tablets & Phones)
- **Requirements**: Android 12+, Chrome or Chromium-based browser (v113+).
- In the Chrome address bar, navigate to:
  ```
  chrome://flags/#enable-unsafe-webgpu
  ```
- Set `#enable-unsafe-webgpu` to **Enabled**.
- If experiencing crashes or memory exhaustion, toggle `#enable-webgpu-developer-features` to inspect GPU memory allocations.
- Tap **Relaunch** at the bottom of the screen.

### Battery & Thermal Optimization

1. **Select the Turbo Context Profile (2,048 Tokens)**:
   - In **Settings** > **Hardware & KV-Cache Acceleration**, switch to **⚡ Turbo (2K)**.
   - This reduces GPU KV-Cache memory consumption by ~60%, drastically cutting down thermal load and memory pressure.
2. **Close Heavy Background Browser Tabs**:
   - Mobile operating systems (especially iOS/iPadOS) terminate background tabs that exceed memory limits. Freeing browser memory before loading a model prevents memory pressure warnings.
3. **Avoid System Low Power Mode During Initialization**:
   - Some operating systems throttle WebGPU compute shader dispatch rates by up to 50% when battery saver mode is active. Keep standard power mode active while downloading or initializing parameters.
4. **Offline Flight Mode**:
   - Once models are stored in browser cache, you can toggle Airplane Mode. The app will continue running completely offline.

---

## ⚡ Inference Engine & Performance Controls

Customize decoding parameters and hardware execution through the glass settings panel:

- **Temperature**: Control randomness and variability (from `0.0` for deterministic logic and coding to `1.2` for creative writing).
- **Top-P (Nucleus Sampling)**: Dynamically restrict token sampling to the most probable cumulative probability mass.
- **Repetition Penalty**: Penalize recurring phrases and avoid generation loops.
- **System Instructions**: Set guiding rules, formatting constraints, or custom roleplay personas.
- **KV-Cache Dynamic Sizing**:
  - `Turbo (2K)`: ~350 MB KV cache allocation. Ultra-fast initial parameter allocation.
  - `Balanced (3K)`: ~550 MB KV cache allocation. Recommended everyday default.
  - `Deep Reasoning (4K)`: ~800 MB KV cache allocation. Extended multi-turn context.

---

## 📋 Console Logging & Diagnostics Export

During model parameter loading, parameter verification, and execution, a real-time console log viewer is available directly from the loading interface:

- **View Live Logs**: Click the **Console Logs** button on the loading screen to inspect shader compilation, shard read operations, and device adapter capabilities.
- **Download Diagnostic Logs**: Export timestamped `.txt` log reports with one click for offline troubleshooting and bug reporting.

---

## 📦 Offline Persistence & Storage Management

All model weights are stored client-side via the browser's standardized **Cache API** (`caches.open('webllm/model')`).

- **Eviction Protection**: Request persistent browser storage with a single click in the Storage Manager to prevent the browser from clearing cached weights during low disk space sweeps.
- **Storage Breakdown**: View total disk quota, used megabytes, number of cached conversations, and active cache engines.
- **Backup & Restore**: Export all conversation threads as formatted JSON backups or import previous backups seamlessly.
- **One-Click Cleanup**: Selectively delete model weights to reclaim 2–3 GB of storage without affecting saved conversations.

---

## 🚀 Deployment Guide (GitHub Pages & Static Hosting)

The application builds into pure static assets (`index.html`, JavaScript bundles, CSS, and web workers) suitable for GitHub Pages, Cloudflare Pages, Vercel, or standard Nginx/Apache servers.

### GitHub Pages (Included Workflow)

A production-ready GitHub Actions workflow is provided at `.github/workflows/deploy.yml`.

1. Push the repository to GitHub:
   ```bash
   git init
   git add .
   git commit -m "Deploy Local WebGPU AI"
   git branch -M main
   git remote add origin https://github.com/<your-username>/<your-repo-name>.git
   git push -u origin main
   ```
2. In your repository on GitHub, open **Settings** > **Pages**.
3. Under **Build and deployment** > **Source**, choose **GitHub Actions**.
4. Every push to `main` will build and publish your static application automatically.

---

## 💻 Local Development

### Prerequisites
- Node.js 18+ or 20+
- npm or yarn
- Modern Chromium or Safari browser with WebGPU hardware acceleration

### Commands

```bash
# Install dependencies
npm install

# Start local dev server (port 3000)
npm run dev

# Run TypeScript compilation and production build
npm run build

# Preview production build locally
npm run preview
```

---

## 📄 License

MIT License. Designed and engineered for privacy-first, on-device artificial intelligence.
