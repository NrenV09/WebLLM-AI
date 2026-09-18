import React from 'react';
import { 
  Sparkles, 
  Download, 
  Loader2, 
  Zap, 
  Upload, 
  PanelLeft, 
  PanelLeftClose, 
  XCircle, 
  AlertTriangle,
  RotateCcw,
  Sliders,
  Activity,
  Brain,
  ExternalLink,
  ShieldCheck,
  Layers
} from 'lucide-react';
import { ModelInfo, DetailedProgress, AISettings, VramLiveStats, Diagnostics } from '../types';

interface ModelSetupViewProps {
  models: ModelInfo[];
  selectedModel: string;
  onSelectModel: (id: string) => void;
  status: 'initial' | 'loading' | 'error' | 'ready' | 'unsupported';
  onInitEngine: (modelId: string) => void;
  onCancelInit: () => void;
  progress: string;
  detailedProgress: DetailedProgress;
  errorMsg: string | null;
  isCached: boolean;
  aiSettings: AISettings;
  onUpdateAISettings: (settings: AISettings) => void;
  onOpenLocalModelImporter: () => void;
  onOpenSettings: () => void;
  onOpenVramMonitor?: () => void;
  vramStats?: VramLiveStats | null;
  diagnostics?: Diagnostics;
  onToggleSidebar: () => void;
  isSidebarOpen: boolean;
  hasPastMessages?: boolean;
  onViewMessages?: () => void;
  onOpenLegalModal?: (tab: 'privacy' | 'terms' | 'cookies' | 'refund' | 'business') => void;
}

export const ModelSetupView: React.FC<ModelSetupViewProps> = ({
  models,
  selectedModel,
  onSelectModel,
  status,
  onInitEngine,
  onCancelInit,
  progress,
  detailedProgress,
  errorMsg,
  isCached,
  aiSettings,
  onUpdateAISettings,
  onOpenLocalModelImporter,
  onOpenSettings,
  onOpenVramMonitor,
  vramStats,
  diagnostics,
  onToggleSidebar,
  isSidebarOpen,
  hasPastMessages,
  onViewMessages,
  onOpenLegalModal
}) => {
  const currentModel = models.find((m) => m.id === selectedModel) || models[0];

  return (
    <div className="flex-1 flex flex-col h-full bg-black text-[#e6e8ec] overflow-hidden relative select-none">
      {/* Liquid Glass Header Bar */}
      <header className="h-14 flex items-center justify-between px-3 sm:px-4 border-b border-white/[0.08] flex-shrink-0 bg-black/70 backdrop-blur-2xl z-20">
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onToggleSidebar();
            }}
            className="p-2 rounded-xl text-white/60 hover:text-white glass-button cursor-pointer shrink-0 active:scale-95"
            title={isSidebarOpen ? "Collapse sidebar" : "Open chat menu"}
          >
            {isSidebarOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeft className="w-4 h-4" />}
          </button>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-xs font-medium text-white/80">
            <Sparkles className="w-3.5 h-3.5 text-white/60" />
            <span>Model Configuration</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {hasPastMessages && onViewMessages && (
            <button
              type="button"
              onClick={onViewMessages}
              className="px-3 py-1.5 rounded-xl glass-button text-xs text-white/80 hover:text-white cursor-pointer"
            >
              View Conversation
            </button>
          )}

          {onOpenVramMonitor && (
            <button
              type="button"
              id="model-setup-vram-btn"
              onClick={onOpenVramMonitor}
              className={`p-2 rounded-xl glass-button cursor-pointer flex items-center gap-1.5 text-xs ${
                vramStats && vramStats.allocatedMB > 0
                  ? 'text-blue-300 bg-blue-500/10 border-blue-500/20'
                  : 'text-white/70 hover:text-white'
              }`}
              title="Real-Time VRAM & Model Health Monitor"
            >
              <Activity className="w-4 h-4 text-blue-400 shrink-0 animate-pulse" />
              <span className="hidden sm:inline font-mono text-[11px]">
                {vramStats && vramStats.allocatedMB > 0 ? `${vramStats.allocatedMB} MB` : 'VRAM'}
              </span>
            </button>
          )}

          <button
            type="button"
            onClick={onOpenLocalModelImporter}
            className="p-2 rounded-xl glass-button text-white/70 hover:text-white cursor-pointer"
            title="Import model from files"
          >
            <Upload className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={onOpenSettings}
            className="p-2 rounded-xl glass-button text-white/70 hover:text-white cursor-pointer"
            title="Generation settings"
          >
            <Sliders className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Glass Launcher Content */}
      <div className="flex-1 overflow-y-auto flex items-center justify-center p-4 sm:p-6">
        <div className="max-w-lg w-full p-6 sm:p-8 border border-white/[0.08] bg-black/60 backdrop-blur-2xl rounded-3xl relative overflow-hidden shadow-2xl space-y-5">
          {/* Glass Top Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white/[0.06] border border-white/[0.12] flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-semibold text-white tracking-tight">Select Model</h2>
                <p className="text-xs text-white/40">Choose or import local weights to chat</p>
              </div>
            </div>

            <button
              type="button"
              onClick={onOpenLocalModelImporter}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl glass-button text-xs text-white/80 hover:text-white cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Import Files</span>
            </button>
          </div>

          {/* Model Selector Dropdown */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-white/40 uppercase tracking-wider">
              Model
            </label>
            <select
              value={selectedModel}
              onChange={(e) => onSelectModel(e.target.value)}
              disabled={status === 'loading'}
              className="w-full bg-black/80 border border-white/[0.12] text-white rounded-2xl px-4 py-3 text-xs sm:text-sm focus:outline-none focus:border-white/40 transition-colors cursor-pointer"
            >
              {models.map((m) => (
                <option key={m.id} value={m.id} className="bg-black text-white">
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          {/* Model Specifications & Hosting Details Card */}
          {currentModel && (
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold text-white">
                      {currentModel.name}
                    </span>
                    {currentModel.highlight && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/25 font-medium">
                        {currentModel.highlight}
                      </span>
                    )}
                  </div>
                  <p className="text-[11.5px] text-white/60 leading-relaxed">
                    {currentModel.description}
                  </p>
                </div>
              </div>

              {/* Spec Badges Grid - Single Line, Anti-Slop Compliant, Never Truncated */}
              <div className="grid grid-cols-2 gap-2 text-[11px] pt-1.5 border-t border-white/[0.06]">
                <div className="flex items-center gap-1.5 text-white/80 bg-black/40 px-2.5 py-1.5 rounded-xl border border-white/[0.05]">
                  <Layers className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="whitespace-nowrap text-[11px]">
                    <strong className="text-white font-medium">Params:</strong> {currentModel.params || '~4B Dense'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-white/80 bg-black/40 px-2.5 py-1.5 rounded-xl border border-white/[0.05]">
                  <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span className="whitespace-nowrap text-[11px]">
                    <strong className="text-white font-medium">Context:</strong> {currentModel.contextLength || '128K Tokens'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-white/80 bg-black/40 px-2.5 py-1.5 rounded-xl border border-white/[0.05]">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  <span className="whitespace-nowrap text-[11px]" title={currentModel.license || 'NVIDIA Open License'}>
                    <strong className="text-white font-medium">License:</strong> {currentModel.license || 'NVIDIA Open'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-white/80 bg-black/40 px-2.5 py-1.5 rounded-xl border border-white/[0.05]">
                  <Brain className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                  <span className="whitespace-nowrap text-[11px]">
                    <strong className="text-white font-medium">Modes:</strong> {currentModel.modalities || 'Reasoning & Direct'}
                  </span>
                </div>
              </div>

              {/* Hosting Platforms / External Links */}
              {currentModel.hostedOn && currentModel.hostedOn.length > 0 && (
                <div className="flex items-center justify-between pt-1 text-[11px] text-white/50">
                  <span>Hosted on: <span className="text-white/80 font-medium">{currentModel.hostedOn.join(' & ')}</span></span>
                  <div className="flex items-center gap-2">
                    {currentModel.huggingFaceUrl && (
                      <a
                        href={currentModel.huggingFaceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-emerald-400 hover:text-emerald-300 hover:underline cursor-pointer"
                      >
                        <span>Hugging Face</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                    {currentModel.nvidiaNimUrl && (
                      <a
                        href={currentModel.nvidiaNimUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-emerald-400 hover:text-emerald-300 hover:underline cursor-pointer"
                      >
                        <span>NVIDIA NIM</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Actual Real-Time Memory & Hardware Telemetry */}
          <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.08] space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="w-3.5 h-3.5 text-blue-400 shrink-0 animate-pulse" />
                <span className="text-xs font-semibold text-white">Actual Memory &amp; System Telemetry</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-blue-500/10 border border-blue-500/20 text-blue-300 font-mono">
                  LIVE
                </span>
              </div>
              {onOpenVramMonitor && (
                <button
                  type="button"
                  id="setup-open-vram-monitor-btn"
                  onClick={onOpenVramMonitor}
                  className="text-[11px] text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1 cursor-pointer font-medium"
                >
                  <span>Inspect VRAM</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
              {/* Physical Device RAM */}
              <div className="p-2 rounded-xl bg-black/40 border border-white/[0.05] space-y-0.5">
                <span className="text-[10px] text-white/40 uppercase font-mono block">Physical RAM</span>
                <span className="font-medium text-white font-mono truncate block text-xs">
                  {diagnostics?.deviceMemoryGB
                    ? `${diagnostics.deviceMemoryGB} GB`
                    : vramStats?.deviceMemoryGB
                      ? `${vramStats.deviceMemoryGB} GB`
                      : 'Unified Memory'}
                </span>
              </div>

              {/* Browser JS Heap */}
              <div className="p-2 rounded-xl bg-black/40 border border-white/[0.05] space-y-0.5">
                <span className="text-[10px] text-white/40 uppercase font-mono block">Browser Heap</span>
                <span className="font-medium text-white font-mono truncate block text-xs">
                  {vramStats?.jsHeapUsedMB
                    ? `${vramStats.jsHeapUsedMB.toLocaleString()} MB`
                    : diagnostics?.jsHeapUsedMB
                      ? `${diagnostics.jsHeapUsedMB.toLocaleString()} MB`
                      : 'Dynamic'}
                </span>
              </div>

              {/* WebGPU Max Storage Buffer Limit */}
              <div className="p-2 rounded-xl bg-black/40 border border-white/[0.05] space-y-0.5">
                <span className="text-[10px] text-white/40 uppercase font-mono block">Max GPU Buffer</span>
                <span className="font-medium text-white font-mono truncate block text-xs">
                  {diagnostics?.maxStorageBufferMB
                    ? `${diagnostics.maxStorageBufferMB.toLocaleString()} MB`
                    : 'Dynamic limit'}
                </span>
              </div>

              {/* Live WebGPU Allocation */}
              <div className="p-2 rounded-xl bg-black/40 border border-white/[0.05] space-y-0.5">
                <span className="text-[10px] text-white/40 uppercase font-mono block">WebGPU VRAM</span>
                <span className={`font-medium font-mono truncate block text-xs ${vramStats && vramStats.allocatedMB > 0 ? 'text-emerald-400 font-semibold' : 'text-white/60'}`}>
                  {vramStats && vramStats.allocatedMB > 0
                    ? `${vramStats.allocatedMB.toLocaleString()} MB Active`
                    : '0 MB (Standby)'}
                </span>
              </div>
            </div>
          </div>

          {/* Optional Reasoning Mode Toggle (Thinking Trace) */}
          {(currentModel?.supportsReasoningToggle || selectedModel.toLowerCase().includes('nemotron') || selectedModel.toLowerCase().includes('qwen')) && (
            <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.08] space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-lg ${aiSettings.reasoningMode !== false ? 'bg-purple-500/20 text-purple-300' : 'bg-white/10 text-white/50'}`}>
                    <Brain className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-white block">
                      Reasoning Trace (Thinking Mode)
                    </span>
                    <span className="text-[10px] text-white/50">
                      {aiSettings.reasoningMode !== false 
                        ? 'Active: Emits step-by-step thinking in <think> tags' 
                        : 'Disabled: Direct answers without thinking trace'}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onUpdateAISettings({
                      ...aiSettings,
                      reasoningMode: aiSettings.reasoningMode === false ? true : false
                    });
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    aiSettings.reasoningMode !== false
                      ? 'bg-purple-500/20 border border-purple-500/40 text-purple-200 shadow-sm'
                      : 'bg-white/[0.05] border border-white/[0.1] text-white/60 hover:text-white'
                  }`}
                >
                  {aiSettings.reasoningMode !== false ? 'Enabled' : 'Direct Only'}
                </button>
              </div>
            </div>
          )}

          {/* Context Window Profile (Including up to 128K tokens for Nemotron) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-white/40 uppercase tracking-wider">
                Context Window Profile
              </span>
              <span className="font-mono text-white/70 text-[11px]">
                {aiSettings.contextWindowSize || (selectedModel.toLowerCase().includes('nemotron') ? 131072 : 3072)} Tokens
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                { size: 2048, label: '⚡ 2K Turbo', hint: 'Low VRAM' },
                { size: 4096, label: '🧠 4K Extended', hint: 'Standard' },
                { size: 8192, label: '🚀 8K High Output', hint: 'High Output' },
                { size: 32768, label: '📚 32K Extended', hint: 'Multi-turn' },
                { size: 65536, label: '📄 64K Document', hint: 'Large Code' },
                { size: 131072, label: '⚡ 128K Nemotron', hint: 'Full 128K Window' }
              ].map((opt) => {
                const active = (aiSettings.contextWindowSize || (selectedModel.toLowerCase().includes('nemotron') ? 131072 : 3072)) === opt.size;
                const isNemotronMax = opt.size === 131072;
                return (
                  <button
                    key={opt.size}
                    type="button"
                    disabled={status === 'loading'}
                    onClick={() => {
                      onUpdateAISettings({ ...aiSettings, contextWindowSize: opt.size });
                    }}
                    className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                      active
                        ? isNemotronMax
                          ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-200 font-medium shadow-xs ring-1 ring-emerald-500/30'
                          : 'bg-white/[0.12] border-white/40 text-white font-medium shadow-xs ring-1 ring-white/20'
                        : isNemotronMax
                          ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-300/80 hover:text-emerald-200 hover:bg-emerald-500/10'
                          : 'bg-white/[0.02] border-white/[0.06] text-white/60 hover:text-white hover:border-white/[0.14]'
                    }`}
                  >
                    <div className="text-xs">{opt.label}</div>
                    <div className="text-[10px] text-white/40">{opt.hint}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Detailed Loading Dashboard (Cleaned of ETA and Execution Pipeline text) */}
          {status === 'loading' && (
            <div className="space-y-3.5 p-4 rounded-2xl bg-black/60 border border-white/[0.1] shadow-inner">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-medium">
                  <span className="text-white/80">
                    {detailedProgress.step === 1 ? 'Downloading Weights' : 'Configuring Pipeline'}
                  </span>
                  <span className="font-mono text-white text-xs">
                    {detailedProgress.step === 1 ? `${detailedProgress.paramsPercent}%` : `${detailedProgress.progressPercent}%`}
                  </span>
                </div>

                <div className="w-full bg-white/[0.06] rounded-full h-2 overflow-hidden p-0.5 border border-white/[0.08]">
                  <div
                    className="bg-white h-full rounded-full transition-all duration-300 shadow-[0_0_12px_rgba(255,255,255,0.4)]"
                    style={{
                      width: `${detailedProgress.step === 1 ? Math.max(detailedProgress.paramsPercent, 2) : Math.max(detailedProgress.progressPercent, 5)}%`
                    }}
                  />
                </div>
              </div>

              {/* Progress metrics (ETA removed as requested) */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06] text-center">
                  <div className="text-[10px] text-white/40 uppercase font-mono tracking-wider">Speed</div>
                  <div className="text-sm font-semibold text-white font-mono">
                    {detailedProgress.speedMBs > 0 ? `${detailedProgress.speedMBs} MB/s` : 'Processing'}
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06] text-center">
                  <div className="text-[10px] text-white/40 uppercase font-mono tracking-wider">Processed</div>
                  <div className="text-sm font-semibold text-white font-mono">
                    {detailedProgress.mbProcessed > 0 ? `${detailedProgress.mbProcessed} MB` : `${detailedProgress.paramsPercent}%`}
                  </div>
                </div>
              </div>

              {/* Raw Text & Cancel */}
              <div className="flex items-center justify-between pt-0.5 gap-2">
                <p className="text-[11px] font-mono text-white/40 truncate leading-none">
                  {detailedProgress.rawText || progress}
                </p>
                <button
                  type="button"
                  onClick={onCancelInit}
                  className="text-[11px] text-rose-400 hover:text-rose-300 flex items-center gap-1 cursor-pointer transition-colors px-2 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 whitespace-nowrap"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Cancel</span>
                </button>
              </div>
            </div>
          )}

          {/* Error Message with Clean Reset Option */}
          {status === 'error' && (
            <div className="p-4 rounded-2xl bg-rose-950/30 border border-rose-800/40 text-xs text-rose-300 space-y-2.5">
              <div className="flex items-center gap-1.5 font-medium text-rose-200">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                <span>Initialization Notice</span>
              </div>
              <p className="text-white/70 text-[11px] leading-relaxed">{errorMsg}</p>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => onInitEngine(selectedModel)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.1] hover:bg-white/[0.18] text-xs text-white transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Retry Initialization</span>
                </button>
                {selectedModel.toLowerCase().includes('nemotron') && (
                  <button
                    type="button"
                    onClick={() => {
                      onSelectModel('Qwen3-4B-q4f16_1-MLC');
                      onInitEngine('Qwen3-4B-q4f16_1-MLC');
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-xs text-emerald-300 transition-colors cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Load Compatible 4B WebGPU</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Launch Buttons (Pure Liquid Glass) */}
          <div className="space-y-2 pt-1">
            <button
              type="button"
              onClick={() => onInitEngine(selectedModel)}
              disabled={status === 'loading'}
              className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-2xl glass-button-primary text-white font-semibold text-sm cursor-pointer active:scale-[0.99] disabled:opacity-50"
            >
              {status === 'loading' ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>
                    {detailedProgress.step === 1
                      ? `Downloading Parameters (${detailedProgress.paramsPercent}%)...`
                      : `Configuring Pipeline (${detailedProgress.progressPercent}%)...`}
                  </span>
                </>
              ) : isCached ? (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Load Model to WebGPU</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Download &amp; Run Model</span>
                </>
              )}
            </button>

            {/* Quick 2-Second Test Model shortcut */}
            {status !== 'loading' && selectedModel !== 'SmolLM2-135M-Instruct-q0f16-MLC' && (
              <button
                type="button"
                onClick={() => {
                  onSelectModel('SmolLM2-135M-Instruct-q0f16-MLC');
                  onInitEngine('SmolLM2-135M-Instruct-q0f16-MLC');
                }}
                className="w-full py-2 px-3 rounded-xl glass-button text-white/70 hover:text-white text-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5 text-white" />
                <span>Instant Test (SmolLM2 135M • 150MB)</span>
              </button>
            )}
          </div>

          {/* Legal & Compliance Footer Links */}
          {onOpenLegalModal && (
            <div className="pt-2 text-center text-[11px] text-white/40 flex items-center justify-center gap-3 border-t border-white/[0.04]">
              <span>100% On-Device WebGPU</span>
              <span>•</span>
              <button
                type="button"
                onClick={() => onOpenLegalModal('privacy')}
                className="hover:text-emerald-400 hover:underline cursor-pointer"
              >
                Privacy Policy
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={() => onOpenLegalModal('terms')}
                className="hover:text-emerald-400 hover:underline cursor-pointer"
              >
                Terms of Use
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={() => onOpenLegalModal('cookies')}
                className="hover:text-emerald-400 hover:underline cursor-pointer"
              >
                Cookies
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
