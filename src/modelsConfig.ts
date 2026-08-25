import { AppConfig, prebuiltAppConfig } from '@mlc-ai/web-llm';

export const CUSTOM_MODEL_RECORDS = [
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

