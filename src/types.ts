export interface ChatMessage {
  id?: string;
  role: 'user' | 'assistant' | 'system'; 
  content: string; 
  timestamp?: number;
  metrics?: { 
    tokSec?: number; 
    ttftMs?: number; 
    totalTokens?: number; 
    durationMs?: number;
  };
}

export interface ChatSession {
  id: string;
  modelId: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: ChatMessage[];
}

export interface ModelInfo {
  id: string;
  name: string;
  description?: string;
  vramMB: number;
  ipadRecommended: boolean;
  isVision: boolean;
  sizeLabel?: string;
  highlight?: string;
}

export interface AISettings {
  temperature: number;
  top_p: number;
  repetition_penalty: number;
  max_tokens: number;
  systemPrompt: string;
  contextWindowSize?: number; // 2048, 3072, 4096, 8192, 12000
  phi4AntiLooping?: boolean;
  ipadOptimization?: boolean;
}

export interface Diagnostics {
  isIpadOrIos: boolean;
  isInIframe: boolean;
  hasWebGpu: boolean;
  adapterFound: boolean | null;
  adapterName: string;
  gpuVendor?: string;
  supportsFp16?: boolean;
  maxStorageBufferMB?: number | null;
  maxBufferSizeMB?: number | null;
  storageQuotaMB: number | null;
  storageUsageMB: number | null;
  storagePersisted: boolean;
  serviceWorkerActive: boolean;
}

export interface DetailedProgress {
  rawText: string;
  progressPercent: number; // 0 to 100
  paramsPercent: number; // 0 to 100 percentage of parameters downloaded
  stage: 'initializing' | 'downloading' | 'loading_vram' | 'compiling' | 'ready';
  currentShard: number;
  totalShards: number;
  mbProcessed: number;
  totalEstimatedMB: number;
  speedMBs: number;
  timeElapsed: number;
  etaSeconds: number | null;
  step?: 1 | 2; // 1: Download Parameters, 2: Configure WebGPU Pipeline
  stepName?: string;
}

export interface VramLiveStats {
  allocatedMB: number;
  peakAllocatedMB: number;
  shaderSubmissions: number;
  expectedModelVramMB: number;
  maxStorageBufferMB: number | null;
  lastPolledAt: number;
  status: 'unloaded' | 'loading' | 'ready' | 'error' | 'device_lost';
  isHealthy: boolean | null;
  healthCheckResult?: {
    latencyMs: number;
    testedAt: number;
    error?: string;
    sampleToken?: string;
  };
}

