import { AppConfig, prebuiltAppConfig } from '@mlc-ai/web-llm';
import { ModelInfo } from './types';

export const AVAILABLE_MODELS: ModelInfo[] = [
  { 
    id: 'DeepSeek-R1-Distill-Qwen-1.5B-q4f16_1-MLC', 
    name: 'DeepSeek R1 Distill Qwen 1.5B (Reasoning)', 
    vramMB: 1650, 
    ipadRecommended: true, 
    isVision: false, 
    params: '1.5B Distill',
    contextLength: '32K Tokens',
    modalities: 'Deep Reasoning & Thinking',
    license: 'MIT (Open Source)',
    hostedOn: ['Hugging Face', 'ModelScope'],
    huggingFaceUrl: 'https://huggingface.co/mlc-ai/DeepSeek-R1-Distill-Qwen-1.5B-q4f16_1-MLC',
    supportsReasoningToggle: true,
    sizeLabel: '1.6 GB • DeepSeek R1 Reasoning (< 2GB)',
    description: 'DeepSeek-R1 reasoning model distilled into Qwen 2.5 1.5B. Outputs step-by-step cognitive reasoning (<think> tags) and powerful math, coding, and logical problem solving with a tiny 1.6 GB VRAM footprint.',
    highlight: 'DeepSeek R1 • Reasoning Flagship'
  },
  { 
    id: 'DeepSeek-R1-Distill-Qwen-1.5B-q4f32_1-MLC', 
    name: 'DeepSeek R1 Distill Qwen 1.5B (FP32 Shaders)', 
    vramMB: 1900, 
    ipadRecommended: true, 
    isVision: false, 
    params: '1.5B Distill',
    contextLength: '32K Tokens',
    modalities: 'Deep Reasoning & Thinking',
    license: 'MIT (Open Source)',
    hostedOn: ['Hugging Face', 'ModelScope'],
    huggingFaceUrl: 'https://huggingface.co/mlc-ai/DeepSeek-R1-Distill-Qwen-1.5B-q4f32_1-MLC',
    supportsReasoningToggle: true,
    sizeLabel: '1.9 GB • DeepSeek R1 (FP32 Compatibility)',
    description: 'DeepSeek-R1 distilled 1.5B compiled with float32 shaders for maximum WebGPU hardware compatibility across older GPUs and browsers.',
    highlight: 'DeepSeek R1 (FP32)'
  },
  { 
    id: 'Qwen3-4B-q4f16_1-MLC', 
    name: 'Qwen3 4B (Flagship Reasoning)', 
    vramMB: 2600, 
    ipadRecommended: true, 
    isVision: false, 
    params: '~4B Dense',
    contextLength: '32K Tokens',
    modalities: 'Reasoning & Direct',
    license: 'Apache 2.0 (Open Source)',
    hostedOn: ['Hugging Face', 'ModelScope'],
    huggingFaceUrl: 'https://huggingface.co/mlc-ai/Qwen3-4B-q4f16_1-MLC',
    supportsReasoningToggle: true,
    sizeLabel: '2.6 GB • Deep Reasoning & Logic (< 3GB)',
    description: 'Qwen 3 flagship 4B model with state-of-the-art multi-step reasoning, mathematical problem solving, structured instruction-following, and robust coding capabilities.',
    highlight: 'Qwen 3 Flagship • Deep Reasoning'
  },
  { 
    id: 'Qwen2.5-3B-Instruct-q4f16_1-MLC', 
    name: 'Qwen2.5 3B Instruct', 
    vramMB: 2500, 
    ipadRecommended: true, 
    isVision: false, 
    params: '3B Dense',
    contextLength: '32K Tokens',
    modalities: 'Reasoning & Direct',
    license: 'Apache 2.0 (Open Source)',
    hostedOn: ['Hugging Face', 'ModelScope'],
    huggingFaceUrl: 'https://huggingface.co/mlc-ai/Qwen2.5-3B-Instruct-q4f16_1-MLC',
    supportsReasoningToggle: true,
    sizeLabel: '2.5 GB • Balanced Speed & Quality (< 3GB)',
    description: 'Alibaba Qwen 2.5 3B instruction-tuned model delivering exceptional multi-lingual reasoning, coding precision, and structured formatting.',
    highlight: 'Qwen 2.5 Stable'
  },
  { 
    id: 'Qwen2.5-Coder-7B-Instruct-q4f16_1-MLC', 
    name: 'Qwen2.5 Coder 7B', 
    vramMB: 5100, 
    ipadRecommended: false, 
    isVision: false, 
    params: '7B Dense',
    contextLength: '32K Tokens',
    modalities: 'Code Generation & Reasoning',
    license: 'Apache 2.0 (Open Source)',
    hostedOn: ['Hugging Face', 'ModelScope'],
    huggingFaceUrl: 'https://huggingface.co/mlc-ai/Qwen2.5-Coder-7B-Instruct-q4f16_1-MLC',
    supportsReasoningToggle: true,
    sizeLabel: '5.1 GB • Code Powerhouse',
    description: 'Specialized code intelligence model benchmark-leading in code generation, bug fixing, algorithm design, and system architecture.',
    highlight: 'Qwen Code Specialist'
  },
  { 
    id: 'Qwen2.5-7B-Instruct-q4f16_1-MLC', 
    name: 'Qwen2.5 7B Instruct', 
    vramMB: 5100, 
    ipadRecommended: false, 
    isVision: false, 
    params: '7B Dense',
    contextLength: '32K Tokens',
    modalities: 'Reasoning & Direct',
    license: 'Apache 2.0 (Open Source)',
    hostedOn: ['Hugging Face', 'ModelScope'],
    huggingFaceUrl: 'https://huggingface.co/mlc-ai/Qwen2.5-7B-Instruct-q4f16_1-MLC',
    supportsReasoningToggle: true,
    sizeLabel: '5.1 GB • High Capacity',
    description: 'Full 7B general-purpose Qwen model with superior knowledge synthesis, complex reasoning, and long-form comprehension.',
    highlight: 'Qwen 7B Flagship'
  },
  { 
    id: 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC', 
    name: 'Qwen2.5 1.5B Instruct', 
    vramMB: 1600, 
    ipadRecommended: true, 
    isVision: false, 
    params: '1.5B Dense',
    contextLength: '32K Tokens',
    modalities: 'Direct & Fast',
    license: 'Apache 2.0 (Open Source)',
    hostedOn: ['Hugging Face', 'ModelScope'],
    huggingFaceUrl: 'https://huggingface.co/mlc-ai/Qwen2.5-1.5B-Instruct-q4f16_1-MLC',
    supportsReasoningToggle: true,
    sizeLabel: '1.6 GB • Fast & Lightweight (< 2GB)',
    description: 'High-speed instruction-tuned 1.5B model with quick token generation and low VRAM footprint, perfect for mobile GPUs and iPads.',
    highlight: 'Fast & Mobile'
  },
  { 
    id: 'Qwen2.5-0.5B-Instruct-q4f16_1-MLC', 
    name: 'Qwen2.5 0.5B (Instant Test)', 
    vramMB: 950, 
    ipadRecommended: true, 
    isVision: false, 
    params: '0.5B Dense',
    contextLength: '32K Tokens',
    modalities: 'Instant Token Generation',
    license: 'Apache 2.0 (Open Source)',
    hostedOn: ['Hugging Face', 'ModelScope'],
    huggingFaceUrl: 'https://huggingface.co/mlc-ai/Qwen2.5-0.5B-Instruct-q4f16_1-MLC',
    supportsReasoningToggle: true,
    sizeLabel: '950 MB • Instant WebGPU Test',
    description: 'Ultra-compact model to verify WebGPU compute shaders and on-device token generation in seconds.',
    highlight: 'Instant Test'
  }
];

export const CUSTOM_MODEL_RECORDS: any[] = [
  {
    model: 'https://huggingface.co/mlc-ai/DeepSeek-R1-Distill-Qwen-1.5B-q4f16_1-MLC',
    model_id: 'DeepSeek-R1-Distill-Qwen-1.5B-q4f16_1-MLC',
    model_lib: 'https://raw.githubusercontent.com/mlc-ai/binary-mlc-llm-libs/main/web-llm-models/v0_2_84/base/Qwen2-1.5B-Instruct-q4f16_1_cs1k-webgpu.wasm',
    vram_required_MB: 1650,
    low_resource_required: true,
    overrides: {
      context_window_size: 4096
    }
  },
  {
    model: 'https://huggingface.co/mlc-ai/DeepSeek-R1-Distill-Qwen-1.5B-q4f32_1-MLC',
    model_id: 'DeepSeek-R1-Distill-Qwen-1.5B-q4f32_1-MLC',
    model_lib: 'https://raw.githubusercontent.com/mlc-ai/binary-mlc-llm-libs/main/web-llm-models/v0_2_84/base/Qwen2-1.5B-Instruct-q4f32_1_cs1k-webgpu.wasm',
    vram_required_MB: 1900,
    low_resource_required: true,
    overrides: {
      context_window_size: 4096
    }
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
