import React from 'react';
import { 
  X, 
  Lightbulb, 
  Download, 
  Zap, 
  HardDrive, 
  Cpu, 
  Sliders, 
  FileText, 
  CheckCircle2,
  FolderPlus
} from 'lucide-react';

interface InfoGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InfoGuideModal: React.FC<InfoGuideModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const items = [
    {
      title: 'Download Params & Configure Pipeline',
      icon: Zap,
      badge: 'Main Action',
      description: 'Executes the complete two-phase initialization: first downloads and verifies all parameter shards in CacheStorage, then allocates WebGPU VRAM and compiles WGSL shaders.'
    },
    {
      title: 'Download Parameters First (Save in Cache)',
      icon: Download,
      badge: 'Step 1 Only',
      description: 'Pre-downloads model parameter shards directly into browser CacheStorage without initiating the WebGPU pipeline. Once cached, models launch instantaneously.'
    },
    {
      title: 'Import Model from Local Storage',
      icon: FolderPlus,
      badge: 'Offline Import',
      description: 'Import locally saved model files (tensor-cache.json, params_shard_*.bin, mlc-chat-config.json, tokenizer) from your device into browser storage without internet.'
    },
    {
      title: 'Acceleration Profile (KV-Cache)',
      icon: Cpu,
      badge: 'KV Memory',
      description: 'Configures context window memory allocations: Turbo (2K tokens, 35% faster), Balanced (3K tokens standard), or Deep (4K tokens full context reasoning).'
    },
    {
      title: 'Console Logs & Download Logs',
      icon: FileText,
      badge: 'Diagnostics',
      description: 'Displays raw live WebLLM worker telemetry, HTTP shard requests, memory allocations, and WGSL shader compilations. Allows exporting execution logs as a .log file.'
    },
    {
      title: 'Storage & Eviction Protection',
      icon: HardDrive,
      badge: 'Persistence',
      description: 'Provides direct inspection and management of IndexedDB chat conversations, downloaded model weights, and browser persistent storage guarantees.'
    },
    {
      title: 'Real-Time VRAM & Model Health Probe',
      icon: Cpu,
      badge: 'VRAM Live',
      description: 'Actively monitors WebGPU VRAM allocation, shader submissions, and lets you run an instant 1-token health probe to verify that the model is genuinely executing on your GPU and not stalled.'
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-2xl animate-in fade-in duration-200">
      <div className="w-full max-w-lg glass-panel rounded-3xl overflow-hidden flex flex-col max-h-[90vh] border border-white/[0.12] shadow-2xl">
        
        {/* Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-white/[0.08] flex items-center justify-between bg-black/40">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-white/[0.08] border border-white/[0.14] flex items-center justify-center text-white shadow-sm">
              <Lightbulb className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white tracking-tight">Control Guide & Actions</h2>
              <p className="text-xs text-white/50">Overview of pipeline buttons and hardware controls</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-white/50 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* List of controls */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-3.5 text-xs text-white/80 flex-1">
          {items.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div 
                key={idx}
                className="p-3.5 rounded-2xl bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.06] transition-all space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-semibold text-white text-xs">
                    <Icon className="w-4 h-4 text-white/80 shrink-0" />
                    <span>{item.title}</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.08] border border-white/[0.1] text-white/70 font-mono">
                    {item.badge}
                  </span>
                </div>
                <p className="text-[11px] text-white/50 leading-relaxed pl-6">
                  {item.description}
                </p>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-5 sm:px-6 py-3.5 border-t border-white/[0.08] bg-black/40 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl glass-button text-xs font-medium cursor-pointer"
          >
            Got it
          </button>
        </div>

      </div>
    </div>
  );
};
