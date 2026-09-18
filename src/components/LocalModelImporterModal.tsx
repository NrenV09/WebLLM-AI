import React, { useState, useRef } from 'react';
import { 
  X, 
  Upload, 
  FileCode, 
  CheckCircle2, 
  AlertCircle, 
  FolderPlus, 
  HardDrive, 
  Cpu, 
  HelpCircle,
  FileCheck,
  ChevronDown,
  ChevronUp,
  Loader2,
  DownloadCloud
} from 'lucide-react';
import { ModelInfo } from '../types';
import { cleanModelUrl } from '../lib/modelDownloader';
import { prebuiltAppConfig } from '@mlc-ai/web-llm';

interface LocalModelImporterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onModelImported: (newModel: ModelInfo) => void;
}

const ARCHITECTURE_TEMPLATES = [
  {
    id: 'nemotron',
    name: 'NVIDIA Nemotron-3-Nano-4B (WebGPU)',
    wasmLib: 'https://raw.githubusercontent.com/mlc-ai/binary-mlc-llm-libs/main/web-llm-models/v0_2_84/base/Qwen2.5-3B-Instruct-q4f16_1-ctx4k_cs1k-webgpu.wasm'
  },
  {
    id: 'qwen',
    name: 'Qwen 2.5 / Qwen 3 (WebGPU)',
    wasmLib: 'https://raw.githubusercontent.com/mlc-ai/binary-mlc-llm-libs/main/web-llm-models/v0_2_84/base/Qwen2.5-3B-Instruct-q4f16_1-ctx4k_cs1k-webgpu.wasm'
  },
  {
    id: 'phi',
    name: 'Phi-4 / Phi-3.5 Mini (WebGPU)',
    wasmLib: 'https://raw.githubusercontent.com/mlc-ai/binary-mlc-llm-libs/main/web-llm-models/v0_2_84/base/Phi-3.5-mini-instruct-q4f16_1-ctx4k_cs1k-webgpu.wasm'
  },
  {
    id: 'smollm',
    name: 'SmolLM2 Architecture (WebGPU)',
    wasmLib: 'https://raw.githubusercontent.com/mlc-ai/binary-mlc-llm-libs/main/web-llm-models/v0_2_84/base/SmolLM2-135M-Instruct-q4f16_1_cs1k-webgpu.wasm'
  },
  {
    id: 'llama',
    name: 'Llama 3 / 3.1 / 3.2 (WebGPU)',
    wasmLib: 'https://raw.githubusercontent.com/mlc-ai/binary-mlc-llm-libs/main/web-llm-models/v0_2_84/base/Llama-3.2-3B-Instruct-q4f16_1-ctx4k_cs1k-webgpu.wasm'
  },
  {
    id: 'gemma',
    name: 'Gemma 2 (WebGPU)',
    wasmLib: 'https://raw.githubusercontent.com/mlc-ai/binary-mlc-llm-libs/main/web-llm-models/v0_2_84/base/gemma-2-2b-it-q4f16_1-ctx4k_cs1k-webgpu.wasm'
  },
  {
    id: 'custom',
    name: 'Custom Wasm Library URL',
    wasmLib: ''
  }
];

export const LocalModelImporterModal: React.FC<LocalModelImporterModalProps> = ({
  isOpen,
  onClose,
  onModelImported
}) => {
  const [modelName, setModelName] = useState('');
  const [modelId, setModelId] = useState('');
  const [vramMB, setVramMB] = useState(2500);
  const [selectedArch, setSelectedArch] = useState(ARCHITECTURE_TEMPLATES[0].id);
  const [customWasmLib, setCustomWasmLib] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<{ percent: number; currentFile: string }>({ percent: 0, currentFile: '' });
  const [showFormatGuide, setShowFormatGuide] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFilesSelected = async (selectedFiles: FileList | null) => {
    if (!selectedFiles || selectedFiles.length === 0) return;
    const fileList = Array.from(selectedFiles);
    setFiles(fileList);
    setErrorMsg(null);

    // Auto-detect metadata from tensor-cache.json or mlc-chat-config.json
    let detectedId = '';
    let detectedTotalMB = 0;

    for (const f of fileList) {
      if (f.name === 'tensor-cache.json') {
        try {
          const text = await f.text();
          const parsed = JSON.parse(text);
          if (parsed.records && Array.isArray(parsed.records)) {
            const totalBytes = parsed.records.reduce((acc: number, r: any) => acc + (r.nbytes || 0), 0);
            if (totalBytes > 0) {
              detectedTotalMB = Math.round(totalBytes / (1024 * 1024));
            }
          }
        } catch {}
      } else if (f.name === 'mlc-chat-config.json') {
        try {
          const text = await f.text();
          const parsed = JSON.parse(text);
          if (parsed.model_id) detectedId = parsed.model_id;
          if (parsed.model_type) {
            const matched = ARCHITECTURE_TEMPLATES.find(a => a.id.includes(parsed.model_type.toLowerCase()));
            if (matched) setSelectedArch(matched.id);
          }
        } catch {}
      }
    }

    if (detectedTotalMB > 0) {
      setVramMB(detectedTotalMB);
    } else {
      const sumMB = Math.round(fileList.reduce((acc, f) => acc + f.size, 0) / (1024 * 1024));
      if (sumMB > 0) setVramMB(sumMB);
    }

    if (detectedId && !modelId) {
      setModelId(detectedId);
      if (!modelName) setModelName(detectedId.replace(/-MLC$/i, '').replace(/[-_]/g, ' '));
    } else if (!modelId && fileList.length > 0) {
      // Derive a clean ID from folder/first file
      const baseName = fileList[0].webkitRelativePath 
        ? fileList[0].webkitRelativePath.split('/')[0] 
        : 'Custom-Local-Model-q4f16_1-MLC';
      setModelId(baseName);
      if (!modelName) setModelName(baseName.replace(/-MLC$/i, '').replace(/[-_]/g, ' '));
    }
  };

  const handleImport = async () => {
    if (files.length === 0) {
      setErrorMsg('Please select model parameter files to import.');
      return;
    }
    const cleanId = (modelId.trim() || 'Custom-Model-MLC').replace(/\s+/g, '-');
    const cleanName = modelName.trim() || cleanId;

    // Check for tensor-cache.json or shards
    const hasTensorCache = files.some(f => f.name === 'tensor-cache.json');
    const shardFiles = files.filter(f => f.name.endsWith('.bin') || f.name.endsWith('.safetensors'));

    if (!hasTensorCache && shardFiles.length === 0) {
      setErrorMsg('Model folder must contain tensor-cache.json or .bin parameter shards.');
      return;
    }

    setIsImporting(true);
    setErrorMsg(null);

    try {
      const cache = await caches.open('webllm/model');
      const baseModelUrl = `https://local.webllm/models/${encodeURIComponent(cleanId)}`;
      const resolvedBase = cleanModelUrl(baseModelUrl);

      let bytesWritten = 0;
      const totalBytes = files.reduce((acc, f) => acc + f.size, 0);

      // Store each file into CacheStorage
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setImportProgress({
          percent: totalBytes > 0 ? Math.round((bytesWritten / totalBytes) * 100) : Math.round((i / files.length) * 100),
          currentFile: file.name
        });

        const targetUrl = new URL(file.name, resolvedBase).href;
        const arrayBuffer = await file.arrayBuffer();

        const mimeType = file.name.endsWith('.json') 
          ? 'application/json' 
          : 'application/octet-stream';

        const response = new Response(arrayBuffer, {
          headers: {
            'Content-Type': mimeType,
            'Content-Length': file.size.toString(),
            'X-Imported-From-Local': 'true'
          }
        });

        await cache.put(targetUrl, response);
        bytesWritten += file.size;
      }

      setImportProgress({ percent: 100, currentFile: 'Finalizing model registration...' });

      // Determine wasm library
      let wasm = customWasmLib;
      if (selectedArch !== 'custom') {
        const arch = ARCHITECTURE_TEMPLATES.find(a => a.id === selectedArch);
        wasm = arch ? arch.wasmLib : ARCHITECTURE_TEMPLATES[0].wasmLib;
      }

      const newRecord = {
        model: baseModelUrl,
        model_id: cleanId,
        model_lib: wasm,
        vram_required_MB: vramMB,
        low_resource_required: true,
      };

      // Register into WebLLM runtime config
      if (!prebuiltAppConfig.model_list.some(m => m.model_id === cleanId)) {
        prebuiltAppConfig.model_list.push(newRecord as any);
      }

      // Persist in localStorage for persistence across reloads
      try {
        const existingCustom = JSON.parse(localStorage.getItem('custom_webllm_models') || '[]');
        const filtered = existingCustom.filter((m: any) => m.model_id !== cleanId);
        filtered.push(newRecord);
        localStorage.setItem('custom_webllm_models', JSON.stringify(filtered));
      } catch {}

      const newModelInfo: ModelInfo = {
        id: cleanId,
        name: cleanName,
        vramMB: vramMB,
        ipadRecommended: vramMB <= 3000,
        isVision: false,
        sizeLabel: `${vramMB} MB • Local Custom Model`,
        description: `Locally imported model files stored in browser cache. 100% offline WebGPU execution.`,
        highlight: 'Custom Local Model'
      };

      onModelImported(newModelInfo);
      setIsImporting(false);
      onClose();
    } catch (err: any) {
      setErrorMsg(`Import failed: ${err.message || 'Unknown error'}`);
      setIsImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-2xl animate-in fade-in duration-200">
      <div className="w-full max-w-xl glass-panel rounded-3xl overflow-hidden flex flex-col max-h-[92vh] border border-white/[0.12] shadow-2xl">
        
        {/* Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-white/[0.08] flex items-center justify-between bg-black/40">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-white/[0.06] border border-white/[0.12] flex items-center justify-center text-white">
              <FolderPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white tracking-tight">Import Model from Local Storage</h2>
              <p className="text-xs text-white/50">Load custom parameter shards (.bin / safetensors) into WebGPU cache</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isImporting}
            className="p-1.5 rounded-xl text-white/50 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 text-xs text-white/80 flex-1">
          
          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/[0.15] text-white flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-white/70 shrink-0" />
              <span className="text-xs">{errorMsg}</span>
            </div>
          )}

          {/* Drag & Drop / File Selector Area */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-white/60 uppercase tracking-wider">
              Select Model Files or Folder
            </label>

            <div 
              onClick={() => fileInputRef.current?.click()}
              className="p-6 rounded-2xl border-2 border-dashed border-white/[0.14] hover:border-white/30 bg-white/[0.02] hover:bg-white/[0.05] transition-all cursor-pointer text-center space-y-2.5 group"
            >
              <div className="w-12 h-12 rounded-2xl bg-white/[0.06] group-hover:bg-white/[0.1] border border-white/[0.1] mx-auto flex items-center justify-center transition-colors">
                <Upload className="w-6 h-6 text-white/80 group-hover:text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">
                  {files.length > 0 ? `${files.length} files selected` : 'Click to select model files or folder'}
                </p>
                <p className="text-[11px] text-white/40 mt-0.5">
                  tensor-cache.json, params_shard_*.bin, mlc-chat-config.json, tokenizer.json
                </p>
              </div>

              {/* Action Buttons inside Dropzone */}
              <div className="flex items-center justify-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                  className="px-3 py-1.5 rounded-xl glass-button text-xs"
                >
                  Select Files
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    folderInputRef.current?.click();
                  }}
                  className="px-3 py-1.5 rounded-xl glass-button text-xs"
                >
                  Select Folder
                </button>
              </div>

              {/* Hidden file inputs */}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => handleFilesSelected(e.target.files)}
              />
              <input
                ref={folderInputRef}
                type="file"
                // @ts-ignore
                webkitdirectory=""
                directory=""
                multiple
                className="hidden"
                onChange={(e) => handleFilesSelected(e.target.files)}
              />
            </div>

            {/* Selected File Previews */}
            {files.length > 0 && (
              <div className="p-3 rounded-2xl bg-black/40 border border-white/[0.08] space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-white/50">
                  <span>Selected Files ({files.length}):</span>
                  <span className="font-mono text-white/70">
                    {(files.reduce((a, b) => a + b.size, 0) / (1024 * 1024)).toFixed(1)} MB total
                  </span>
                </div>
                <div className="max-h-24 overflow-y-auto space-y-1 font-mono text-[11px]">
                  {files.slice(0, 8).map((f, i) => (
                    <div key={i} className="flex items-center justify-between text-white/70 py-0.5 border-b border-white/[0.04]">
                      <span className="truncate max-w-[280px] flex items-center gap-1.5">
                        <FileCheck className="w-3.5 h-3.5 text-white/40" />
                        {f.name}
                      </span>
                      <span className="text-white/40 shrink-0">{(f.size / (1024 * 1024)).toFixed(1)} MB</span>
                    </div>
                  ))}
                  {files.length > 8 && (
                    <div className="text-[10px] text-white/40 italic pt-0.5">
                      + {files.length - 8} more shard files
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Model Metadata Configuration */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-white/60 uppercase tracking-wider">
                Model Name
              </label>
              <input
                type="text"
                value={modelName}
                onChange={(e) => setModelName(e.target.value)}
                placeholder="e.g. Qwen 2.5 3B (Local)"
                className="w-full bg-white/[0.03] border border-white/[0.1] rounded-xl px-3 py-2 text-white text-xs placeholder-white/30 focus:outline-none focus:border-white/40"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-white/60 uppercase tracking-wider">
                Model ID / Identifier
              </label>
              <input
                type="text"
                value={modelId}
                onChange={(e) => setModelId(e.target.value)}
                placeholder="e.g. Qwen2.5-3B-Instruct-q4f16_1-MLC"
                className="w-full bg-white/[0.03] border border-white/[0.1] rounded-xl px-3 py-2 text-white text-xs font-mono placeholder-white/30 focus:outline-none focus:border-white/40"
              />
            </div>
          </div>

          {/* Architecture / Shader Wasm Library */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-white/60 uppercase tracking-wider">
              WebGPU Shader & Architecture Runtime
            </label>
            <select
              value={selectedArch}
              onChange={(e) => setSelectedArch(e.target.value)}
              className="w-full bg-black/60 border border-white/[0.1] text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-white/40 cursor-pointer"
            >
              {ARCHITECTURE_TEMPLATES.map((a) => (
                <option key={a.id} value={a.id} className="bg-black text-white">
                  {a.name}
                </option>
              ))}
            </select>

            {selectedArch === 'custom' && (
              <input
                type="text"
                value={customWasmLib}
                onChange={(e) => setCustomWasmLib(e.target.value)}
                placeholder="https://.../model-webgpu.wasm"
                className="w-full mt-1.5 bg-white/[0.03] border border-white/[0.1] rounded-xl px-3 py-2 text-white text-xs font-mono placeholder-white/30 focus:outline-none focus:border-white/40"
              />
            )}
          </div>

          {/* Estimated VRAM */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-white/60 uppercase tracking-wider">
                Estimated VRAM Required
              </label>
              <span className="font-mono text-white/90">{vramMB} MB</span>
            </div>
            <input
              type="range"
              min="100"
              max="6000"
              step="50"
              value={vramMB}
              onChange={(e) => setVramMB(parseInt(e.target.value))}
              className="w-full accent-white bg-white/10 rounded-lg cursor-pointer h-1.5"
            />
          </div>

          {/* Generalised Model Format Explainer Accordion */}
          <div className="border border-white/[0.08] rounded-2xl overflow-hidden bg-white/[0.02]">
            <button
              type="button"
              onClick={() => setShowFormatGuide(!showFormatGuide)}
              className="w-full p-3 flex items-center justify-between text-left text-xs font-medium text-white/70 hover:text-white transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <HelpCircle className="w-3.5 h-3.5" />
                <span>Generalised Format: How to download & import models locally</span>
              </span>
              {showFormatGuide ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showFormatGuide && (
              <div className="p-3.5 border-t border-white/[0.06] space-y-2 text-[11px] text-white/60 bg-black/40 font-mono leading-relaxed">
                <p className="text-white/80 font-sans font-medium">Standard WebLLM Model Directory Structure:</p>
                <div className="p-2.5 rounded-xl bg-black/60 border border-white/[0.06] text-white/70">
                  <div>my-model-q4f16_1-MLC/</div>
                  <div className="pl-3">├── tensor-cache.json  <span className="text-white/40">(Shard byte manifest)</span></div>
                  <div className="pl-3">├── params_shard_0.bin <span className="text-white/40">(Tensor weight shards)</span></div>
                  <div className="pl-3">├── params_shard_1.bin</div>
                  <div className="pl-3">├── mlc-chat-config.json <span className="text-white/40">(Hyperparameters & tokenizer config)</span></div>
                  <div className="pl-3">├── tokenizer.json</div>
                  <div className="pl-3">└── tokenizer_config.json</div>
                </div>
                <p className="text-white/70 font-sans pt-1">
                  1. Clone any MLC model repository from Hugging Face:
                </p>
                <div className="p-2 rounded-lg bg-black/70 border border-white/[0.06] text-white select-all">
                  git clone https://huggingface.co/mlc-ai/Qwen2.5-3B-Instruct-q4f16_1-MLC
                </div>
                <p className="text-white/70 font-sans">
                  2. Select that folder here. All files are written directly into browser CacheStorage for instant offline WebGPU execution.
                </p>
              </div>
            )}
          </div>

          {/* Import Progress Indicator */}
          {isImporting && (
            <div className="p-3.5 rounded-2xl bg-black/60 border border-white/[0.1] space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 text-white font-medium">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Writing to CacheStorage:</span>
                </span>
                <span className="font-mono font-bold text-white">{importProgress.percent}%</span>
              </div>
              <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-white transition-all duration-300 rounded-full"
                  style={{ width: `${importProgress.percent}%` }}
                />
              </div>
              <div className="text-[10px] text-white/50 font-mono truncate">
                {importProgress.currentFile}
              </div>
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="px-5 sm:px-6 py-4 border-t border-white/[0.08] bg-black/40 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            disabled={isImporting}
            className="px-4 py-2 rounded-xl glass-button text-xs cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleImport}
            disabled={isImporting || files.length === 0}
            className="px-5 py-2.5 rounded-xl glass-button-primary text-xs font-semibold flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isImporting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Importing ({importProgress.percent}%)...</span>
              </>
            ) : (
              <>
                <HardDrive className="w-3.5 h-3.5" />
                <span>Import &amp; Cache Model</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};
