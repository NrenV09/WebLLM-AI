# Local Browser AI (WebGPU)

> **100% Private, Hardware-Accelerated AI Chat Running Entirely in Your Browser.**  
> Zero server costs • Zero API keys required • Zero data leaves your device • Fully Offline Capable

---

## ✨ Features

- **🚀 100% Local WebGPU Acceleration**: Runs open-weight LLMs directly on your computer's GPU using WebGPU and MLC WebLLM.
- **🔒 Complete Privacy**: No prompts, chats, or tokens are ever sent to an external server or cloud provider.
- **⚡ Smooth 60fps UI (Dedicated Web Worker)**: Inference runs in a dedicated background worker thread so the user interface never freezes during generation.
- **📦 Offline-First & Persistent Cache**: Model weights are cached locally via Cache API / IndexedDB. Once downloaded, the application works completely offline without an internet connection.
- **🧠 Thought & Reasoning Visualization**: Full support for chain-of-thought models (e.g., DeepSeek-R1 Distill) with expandable thinking drawers and live status indicators.
- **📐 Rich Markdown, LaTeX & Code Rendering**: Full support for syntax-highlighted code blocks with 1-click copy, tables, KaTeX mathematical equations, and formatted markdown.
- **⚙️ Configurable Presets & Hyperparameters**: Adjust temperature, top-p nucleus sampling, repetition penalty, and custom system prompts with one-click presets (Precise, Balanced, Creative).
- **💾 Chat Session & Storage Manager**: Search through chat history, rename sessions, export/import chat backups as JSON, and inspect local storage quotas.
- **🎨 Ultra-Premium Dark Theme**: Obsidian aesthetic with glassmorphism, fluid responsive layouts, and intuitive controls.

---

## 🤖 Supported On-Device Models

| Model | Parameters | Approx. VRAM | Best For |
| :--- | :--- | :--- | :--- |
| **Qwen 2.5 0.5B** | 0.5 Billion | ~350 MB | Ultra-fast responses, low-memory devices |
| **SmolLM2 1.7B** | 1.7 Billion | ~950 MB | Everyday tasks, lightweight reasoning |
| **Llama 3.2 1B** | 1.2 Billion | ~800 MB | Fast general conversation & summarization |
| **Llama 3.2 3B** | 3.2 Billion | ~1.8 GB | High-quality reasoning, creative writing |
| **Qwen 2.5 1.5B** | 1.5 Billion | ~1.1 GB | Multilingual & structured logic |
| **DeepSeek R1 Distill Qwen 1.5B** | 1.5 Billion | ~1.2 GB | Step-by-step reasoning & math with `<think>` tags |
| **Gemma 2 2B** | 2.6 Billion | ~1.6 GB | General instruction following & coding |

---

## 🚀 One-Click GitHub Pages Deployment

This repository includes a ready-to-use GitHub Actions workflow (`.github/workflows/deploy.yml`) for seamless deployment on GitHub Pages.

### Step 1: Push to GitHub
Initialize your Git repository and push the code to your GitHub repo:

```bash
git init
git add .
git commit -m "Initial commit of Local Browser AI"
git branch -M main
git remote add origin https://github.com/<YOUR-USERNAME>/<YOUR-REPO-NAME>.git
git push -u origin main
```

### Step 2: Enable GitHub Pages with GitHub Actions
1. On GitHub, navigate to your repository.
2. Go to **Settings** > **Pages** (in the left sidebar).
3. Under **Build and deployment** > **Source**, select **GitHub Actions**.
4. That's it! Pushing to `main` (or `master`) will automatically trigger the workflow, build the project, and publish it to `https://<YOUR-USERNAME>.github.io/<YOUR-REPO-NAME>/`.

---

## 💻 Local Development

### Prerequisites
- Node.js 18+ or 20+
- A modern browser with WebGPU support (Chrome 113+, Edge 113+, Brave, or Safari 18+)
- A dedicated or integrated GPU supporting WebGPU

### Setup & Run

```bash
# 1. Install dependencies
npm install

# 2. Start local development server
npm run dev

# 3. Open browser
# Navigate to http://localhost:3000
```

### Production Build

```bash
# Build static assets to /dist
npm run build

# Preview production build locally
npm run preview
```

---

## 🌐 Browser Requirements & Enabling WebGPU

WebGPU is natively enabled by default on most modern browsers:

- **Google Chrome / Chromium / Brave / Microsoft Edge**: Version 113+ on Windows, macOS, ChromeOS, and Linux.
  - If WebGPU is not detected, ensure Hardware Acceleration is enabled in browser settings:  
    `Settings -> System -> Use graphics acceleration when available`.
  - On Linux or older GPUs, you can enable `#enable-unsafe-webgpu` in `chrome://flags`.
- **Safari**: Safari 18+ on macOS Sequoia / iOS 18+.

---

## 🔒 Privacy & Security

All computation and model inference take place 100% inside your client browser sandbox via WebGPU compute shaders.
- **Zero Telemetry**: No user inputs, prompts, or outputs are ever logged or sent to any server.
- **Zero API Keys**: No OpenAI, Google, Anthropic, or external credentials needed.
- **Full Storage Control**: Manage and clear all stored models and message histories at any time via the in-app **Storage Manager**.

---

## 📄 License

MIT License. Feel free to use, modify, and distribute for personal or commercial projects.
