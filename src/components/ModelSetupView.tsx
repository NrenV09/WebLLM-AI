import React from 'react';
import { 
  Sparkles, 
  Download, 
  Loader2, 
  Upload, 
  PanelLeft, 
  PanelLeftClose, 
  XCircle, 
  AlertTriangle,
  RotateCcw,
  Sliders,
  Check
} from 'lucide-react';
import { ModelInfo, DetailedProgress, AISettings, VramLiveStats, Diagnostics } from '../types';
import { PWAInstallButton } from './PWAInstallButton';

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
  aiSettings?: AISettings;
  onUpdateAISettings?: (settings: AISettings) => void;
  onOpenLocalModelImporter?: () => void;
  onOpenSettings?: () => void;
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
      {/* Clean Top Navigation Bar */}
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
            title={isSidebarOpen ? "Collapse sidebar" : "Open sidebar"}
          >
            {isSidebarOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeft className="w-4 h-4" />}
          </button>

          <span className="text-xs font-semibold text-white/80 tracking-wide uppercase">
            Model Selection
          </span>
        </div>

        <div className="flex items-center gap-2">
          <PWAInstallButton />

          {hasPastMessages && onViewMessages && (
            <button
              type="button"
              onClick={onViewMessages}
              className="px-3 py-1.5 rounded-xl glass-button text-xs text-white/80 hover:text-white cursor-pointer"
            >
              Back to Chat
            </button>
          )}

          {onOpenLocalModelImporter && (
            <button
              type="button"
              onClick={onOpenLocalModelImporter}
              className="p-2 rounded-xl glass-button text-white/70 hover:text-white cursor-pointer"
              title="Import model from files"
            >
              <Upload className="w-4 h-4" />
            </button>
          )}

          {onOpenSettings && (
            <button
              type="button"
              onClick={onOpenSettings}
              className="p-2 rounded-xl glass-button text-white/70 hover:text-white cursor-pointer"
              title="Settings"
            >
              <Sliders className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      {/* Main Centered Content */}
      <div className="flex-1 overflow-y-auto flex items-center justify-center p-4 sm:p-6">
        <div className="max-w-md w-full p-6 sm:p-8 border border-white/[0.08] bg-black/60 backdrop-blur-2xl rounded-3xl relative shadow-2xl space-y-6">
          {/* Header */}
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-white tracking-tight">
              Select Language Model
            </h2>
            <p className="text-xs text-white/50">
              Run local LLM inference directly in your browser with WebGPU.
            </p>
          </div>

          {/* Model Selector Dropdown */}
          <div className="space-y-2">
            <label className="block text-xs font-medium text-white/60">
              Model
            </label>
            <select
              value={selectedModel}
              onChange={(e) => onSelectModel(e.target.value)}
              disabled={status === 'loading'}
              className="w-full bg-white/[0.04] border border-white/[0.12] text-white rounded-xl px-3.5 py-2.5 text-xs sm:text-sm focus:outline-none focus:border-white/40 transition-colors cursor-pointer"
            >
              {models.map((m) => (
                <option key={m.id} value={m.id} className="bg-[#12141a] text-white">
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          {/* Simple Clean Model Summary */}
          {currentModel && (
            <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-2">
              <p className="text-xs text-white/70 leading-relaxed">
                {currentModel.description}
              </p>
              {isCached && status !== 'loading' && (
                <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-medium pt-1">
                  <Check className="w-3.5 h-3.5" />
                  <span>Downloaded and stored in local cache (Offline ready)</span>
                </div>
              )}
            </div>
          )}

          {/* Clean Loading Progress Bar */}
          {status === 'loading' && (
            <div className="space-y-3 p-4 rounded-xl bg-white/[0.02] border border-white/[0.08]">
              <div className="flex items-center justify-between text-xs">
                <span className="text-white/80 font-medium">
                  {detailedProgress.step === 1 ? 'Downloading weights' : 'Initializing engine'}
                </span>
                <span className="font-mono text-white text-xs">
                  {detailedProgress.step === 1 ? `${detailedProgress.paramsPercent}%` : `${detailedProgress.progressPercent}%`}
                </span>
              </div>

              <div className="w-full bg-white/[0.08] rounded-full h-2 overflow-hidden">
                <div
                  className="bg-white h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${detailedProgress.step === 1 ? Math.max(detailedProgress.paramsPercent, 3) : Math.max(detailedProgress.progressPercent, 5)}%`
                  }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-white/50 pt-1">
                <span className="truncate max-w-[260px] font-mono">
                  {detailedProgress.rawText || progress}
                </span>
                <button
                  type="button"
                  onClick={onCancelInit}
                  className="text-rose-400 hover:text-rose-300 cursor-pointer ml-2 shrink-0 font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Error Message */}
          {status === 'error' && (
            <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-800/30 text-xs text-rose-300 space-y-2.5">
              <div className="flex items-center gap-1.5 font-medium text-rose-200">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                <span>Initialization Error</span>
              </div>
              <p className="text-white/70 text-[11px] leading-relaxed">{errorMsg}</p>
              <button
                type="button"
                onClick={() => onInitEngine(selectedModel)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.1] hover:bg-white/[0.18] text-xs text-white transition-colors cursor-pointer mt-1 font-medium"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Retry</span>
              </button>
            </div>
          )}

          {/* Primary Action Button */}
          <div>
            <button
              type="button"
              onClick={() => {
                if (status === 'ready' && onViewMessages) {
                  onViewMessages();
                } else {
                  onInitEngine(selectedModel);
                }
              }}
              disabled={status === 'loading'}
              className="w-full flex items-center justify-center gap-2 py-3 px-5 rounded-xl bg-white text-black font-semibold text-xs sm:text-sm hover:bg-white/90 active:scale-[0.99] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
            >
              {status === 'loading' ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Loading Model...</span>
                </>
              ) : status === 'ready' ? (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Open Chat →</span>
                </>
              ) : isCached ? (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Load Model</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Download &amp; Load Model</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
