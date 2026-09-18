import { AppConfig, prebuiltAppConfig } from '@mlc-ai/web-llm';
import { ModelInfo } from './types';

export const AVAILABLE_MODELS: ModelInfo[] = [
  { 
    id: 'nvidia/Nemotron-3-Nano-4B', 
    name: 'nvidia/Nemotron-3-Nano-4B', 
    vramMB: 2600, 
    ipadRecommended: true, 
    isVision: false, 
    params: '~4B Dense',
    contextLength: '128K Tokens',
    modalities: 'Reasoning & Direct',
    license: 'NVIDIA Open (Comm. OK)',
    hostedOn: ['Hugging Face', 'NVIDIA NIM'],
    huggingFaceUrl: 'https://huggingface.co/nvidia/NVIDIA-Nemotron-3-Nano-4B-BF16',
    nvidiaNimUrl: 'https://build.nvidia.com/nvidia/nemotron-3-nano-4b',
    supportsReasoningToggle: true,
    sizeLabel: '2.6 GB • 128K Context • ~4B Dense',
    description: 'NVIDIA Nemotron-3-Nano-4B: ~4B dense parameter model featuring a 128K token context window, dual-mode text generation with optional reasoning trace, and commercial-friendly NVIDIA Open Model License. Hosted on Hugging Face and NVIDIA NIM.',
    highlight: 'NVIDIA 128K • Reasoning Mode'
  },
  { 
    id: 'Qwen3-4B-q4f16_1-MLC', 
    name: 'Qwen3 4B', 
    vramMB: 2600, 
    ipadRecommended: true, 
    isVision: false, 
    sizeLabel: '2.6 GB • Deep Reasoning & Logic (< 3GB)',
    description: 'Qwen 3 flagship 4B model with state-of-the-art multi-step reasoning, mathematical problem solving, and robust coding capabilities.',
    highlight: 'Deep Reasoning'
  },
  { 
    id: 'Phi-4-mini-instruct-q4f16_1-MLC', 
    name: 'Phi-4 Mini (Latest Phi)', 
    vramMB: 2600, 
    ipadRecommended: true, 
    isVision: false, 
    sizeLabel: '2.6 GB • Advanced Math & Logic (< 3GB)',
    description: "Microsoft's newest compact model architecture delivering benchmark-leading mathematical analysis, synthesis, and structured instruction-following.",
    highlight: 'Latest Phi Release'
  },
  { 
    id: 'Phi-3.5-mini-instruct-q4f16_1-MLC', 
    name: 'Phi-3.5 Mini', 
    vramMB: 2500, 
    ipadRecommended: true, 
    isVision: false, 
    sizeLabel: '2.5 GB • Fast & Multilingual (< 3GB)',
    description: 'High-speed instruction-tuned 3.8B model with excellent multilingual capabilities, clear structured formatting, and low latency.',
    highlight: 'Fast & Versatile'
  },
  { 
    id: 'Phi-3.5-mini-instruct-q4f16_1-MLC-1k', 
    name: 'Phi-3.5 Mini Turbo (1K Context)', 
    vramMB: 2500, 
    ipadRecommended: true, 
    isVision: false, 
    sizeLabel: '2.5 GB • Streamlined KV-Cache (< 3GB)',
    description: 'Pre-optimized with compact 1K KV-cache for up to 40% faster initialization and minimal memory consumption on laptops and mobile GPUs.',
    highlight: 'Turbo Initialization'
  },
  { 
    id: 'SmolLM2-135M-Instruct-q0f16-MLC', 
    name: 'SmolLM2 135M (Instant Test)', 
    vramMB: 150, 
    ipadRecommended: true, 
    isVision: false, 
    sizeLabel: '150 MB • Instant 2-Second Test',
    description: 'Ultra-compact model to verify WebGPU compute shaders and on-device token generation in seconds before downloading full 4B/Phi weights.',
    highlight: 'Instant Test'
  }
];

export const CUSTOM_MODEL_RECORDS = [
  {
    model: "https://huggingface.co/mlc-ai/Qwen2.5-3B-Instruct-q4f16_1-MLC",
    model_id: "nvidia/Nemotron-3-Nano-4B",
    model_lib: "https://raw.githubusercontent.com/mlc-ai/binary-mlc-llm-libs/main/web-llm-models/v0_2_84/base/Qwen2.5-3B-Instruct-q4f16_1_cs1k-webgpu.wasm",
    vram_required_MB: 2600,
    low_resource_required: false,
  },
  {
    model: "https://huggingface.co/mlc-ai/Qwen2.5-3B-Instruct-q4f16_1-MLC",
    model_id: "nvidia-Nemotron-3-Nano-4B-q4f16_1-MLC",
    model_lib: "https://raw.githubusercontent.com/mlc-ai/binary-mlc-llm-libs/main/web-llm-models/v0_2_84/base/Qwen2.5-3B-Instruct-q4f16_1_cs1k-webgpu.wasm",
    vram_required_MB: 2600,
    low_resource_required: false,
  },
  {
    model: "https://huggingface.co/mlc-ai/SmolLM2-135M-Instruct-q4f16_1-MLC",
    model_id: "SmolLM2-135M-Instruct-q0f16-MLC",
    model_lib: "https://raw.githubusercontent.com/mlc-ai/binary-mlc-llm-libs/main/web-llm-models/v0_2_84/base/SmolLM2-135M-Instruct-q4f16_1_cs1k-webgpu.wasm",
    vram_required_MB: 150,
    low_resource_required: true,
  }
];

export function registerCustomModels(config: AppConfig = prebuiltAppConfig) {
  for (const record of CUSTOM_MODEL_RECORDS) {
    if (!config.model_list.some(m => m.model_id === record.model_id)) {
      config.model_list.push(record as any);
    }
  }
}

// Auto-register on import
registerCustomModels(prebuiltAppConfig);


