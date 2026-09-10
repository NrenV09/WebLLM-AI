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
  Sliders
} from 'lucide-react';
import { ModelInfo, DetailedProgress, AISettings } from '../types';

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
  onToggleSidebar: () => void;
  isSidebarOpen: boolean;
  hasPastMessages?: boolean;
  onViewMessages?: () => void;
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
  onToggleSidebar,
  isSidebarOpen,
  hasPastMessages,
  onViewMessages
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
                  {m.name} ({m.vramMB} MB)
                </option>
              ))}
            </select>
          </div>

          {/* Context Window Profile (Including 8192 & 12000 tokens) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-white/40 uppercase tracking-wider">
                Context Window Profile
              </span>
              <span className="font-mono text-white/70 text-[11px]">
                {aiSettings.contextWindowSize || 3072} Tokens
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                { size: 2048, label: '⚡ 2K Turbo', hint: 'Low VRAM' },
                { size: 3072, label: '⚖️ 3K Balanced', hint: 'Default' },
                { size: 4096, label: '🧠 4K Extended', hint: 'Standard' },
                { size: 8192, label: '🚀 8K High Output', hint: 'High Output' },
                { size: 12000, label: '⚡ 12K Ultra', hint: 'Max Context' }
              ].map((opt) => {
                const active = (aiSettings.contextWindowSize || 3072) === opt.size;
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
                        ? 'bg-white/[0.12] border-white/40 text-white font-medium shadow-xs ring-1 ring-white/20'
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
            <div className="p-4 rounded-2xl bg-rose-950/30 border border-rose-800/40 text-xs text-rose-300 space-y-2">
              <div className="flex items-center gap-1.5 font-medium text-rose-200">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                <span>Initialization Notice</span>
              </div>
              <p className="text-white/60 text-[11px] leading-relaxed">{errorMsg}</p>
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => onInitEngine(selectedModel)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl glass-button text-xs text-white cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Retry Initialization</span>
                </button>
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
        </div>
      </div>
    </div>
  );
};
