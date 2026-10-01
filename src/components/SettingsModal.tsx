import React, { useState } from 'react';
import { X, Sliders, RotateCcw, Check, ShieldCheck, Database, HardDrive } from 'lucide-react';
import { AISettings } from '../types';
import { DEFAULT_SETTINGS } from '../storage';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AISettings;
  onSave: (newSettings: AISettings) => void;
}

const CONTEXT_OPTIONS = [
  { size: 2048, label: '2,048 Tokens', desc: 'Minimal VRAM allocation (~0.5 GB KV-Cache)' },
  { size: 4096, label: '4,096 Tokens', desc: 'Standard conversational memory' },
  { size: 8192, label: '8,192 Tokens', desc: 'High-output & code generation' },
  { size: 16384, label: '16,384 Tokens', desc: 'Long multi-turn context' },
  { size: 32768, label: '32,768 Tokens', desc: 'Qwen native 32K context budget' },
  { size: 65536, label: '65,536 Tokens', desc: 'Large document & full repository analysis' },
  { size: 131072, label: '131,072 Tokens', desc: 'Maximum 128K context window' }
];

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSave
}) => {
  const [local, setLocal] = useState<AISettings>({
    ...settings,
    temperature: typeof settings.temperature === 'number' ? settings.temperature : 0.6,
    top_p: typeof settings.top_p === 'number' ? settings.top_p : 0.9,
    repetition_penalty: typeof settings.repetition_penalty === 'number' ? settings.repetition_penalty : 1.05,
    max_tokens: typeof settings.max_tokens === 'number' ? settings.max_tokens : 4096,
    contextWindowSize: settings.contextWindowSize || 32768,
    systemPrompt: settings.systemPrompt || DEFAULT_SETTINGS.systemPrompt
  });

  if (!isOpen) return null;

  const handleReset = () => {
    setLocal(DEFAULT_SETTINGS);
  };

  const handleSaveAndClose = () => {
    onSave(local);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-2xl animate-in fade-in duration-150">
      <div className="w-full max-w-2xl glass-panel rounded-3xl overflow-hidden flex flex-col max-h-[92vh] border border-white/[0.12] shadow-2xl bg-black/70">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-white/[0.08] flex items-center justify-between bg-black/50 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/[0.08] border border-white/[0.14] flex items-center justify-center text-white">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white tracking-tight">Model Parameters</h2>
              <p className="text-xs text-white/50">Inference hyperparameters &amp; KV-cache budget</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-white/40 hover:text-white glass-button cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm text-white/80">
          
          {/* Pro Parameter 1: System Instruction Prompt */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-white/70 uppercase tracking-wider">
                System Prompt (Developer Instructions)
              </label>
              <button
                type="button"
                onClick={() => setLocal({ ...local, systemPrompt: DEFAULT_SETTINGS.systemPrompt })}
                className="text-[11px] text-white/40 hover:text-white transition-colors cursor-pointer"
              >
                Reset Prompt
              </button>
            </div>
            <textarea
              value={local.systemPrompt}
              onChange={(e) => setLocal({ ...local, systemPrompt: e.target.value })}
              rows={4}
              className="w-full bg-black/50 border border-white/[0.1] rounded-2xl p-3.5 text-xs text-white/90 font-mono leading-relaxed focus:outline-none focus:border-white/30 transition-colors resize-y min-h-[90px]"
              placeholder="Define model behavior, output constraints, and tone..."
            />
            <p className="text-[11px] text-white/40">
              Prepended to conversation history to guide format, reasoning steps, and constraints.
            </p>
          </div>

          {/* Pro Parameter 2 & 3: Temperature & Top-P Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Temperature */}
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.08] space-y-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-white">Temperature</div>
                  <div className="text-[10px] text-white/40">Sampling randomness</div>
                </div>
                <input
                  type="number"
                  min="0.0"
                  max="2.0"
                  step="0.01"
                  value={local.temperature}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    if (!isNaN(val)) setLocal({ ...local, temperature: Math.min(2.0, Math.max(0.0, val)) });
                  }}
                  className="w-16 font-mono text-xs text-right bg-black/60 px-2 py-1 rounded-lg border border-white/[0.12] text-white focus:outline-none focus:border-white/40"
                />
              </div>
              <input
                type="range"
                min="0.0"
                max="2.0"
                step="0.01"
                value={local.temperature}
                onChange={(e) => setLocal({ ...local, temperature: parseFloat(e.target.value) })}
                className="w-full accent-white bg-white/10 rounded-lg cursor-pointer h-1.5"
              />
              <div className="flex justify-between text-[10px] text-white/35 font-mono">
                <span>0.0 (Deterministic)</span>
                <span>0.7</span>
                <span>2.0 (High Variance)</span>
              </div>
            </div>

            {/* Top-P */}
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.08] space-y-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-white">Top-P (Nucleus)</div>
                  <div className="text-[10px] text-white/40">Cumulative cutoff</div>
                </div>
                <input
                  type="number"
                  min="0.01"
                  max="1.0"
                  step="0.01"
                  value={local.top_p}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    if (!isNaN(val)) setLocal({ ...local, top_p: Math.min(1.0, Math.max(0.01, val)) });
                  }}
                  className="w-16 font-mono text-xs text-right bg-black/60 px-2 py-1 rounded-lg border border-white/[0.12] text-white focus:outline-none focus:border-white/40"
                />
              </div>
              <input
                type="range"
                min="0.01"
                max="1.0"
                step="0.01"
                value={local.top_p}
                onChange={(e) => setLocal({ ...local, top_p: parseFloat(e.target.value) })}
                className="w-full accent-white bg-white/10 rounded-lg cursor-pointer h-1.5"
              />
              <div className="flex justify-between text-[10px] text-white/35 font-mono">
                <span>0.1 (Focused)</span>
                <span>0.9</span>
                <span>1.0 (Full Vocabulary)</span>
              </div>
            </div>

          </div>

          {/* Pro Parameter 4 & 5: Max Tokens & Repetition Penalty Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Max Output Tokens */}
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.08] space-y-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-white">Max Output Tokens</div>
                  <div className="text-[10px] text-white/40">Generation length limit</div>
                </div>
                <input
                  type="number"
                  min="128"
                  max="16384"
                  step="128"
                  value={local.max_tokens}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    if (!isNaN(val)) setLocal({ ...local, max_tokens: Math.min(16384, Math.max(128, val)) });
                  }}
                  className="w-20 font-mono text-xs text-right bg-black/60 px-2 py-1 rounded-lg border border-white/[0.12] text-white focus:outline-none focus:border-white/40"
                />
              </div>
              <input
                type="range"
                min="256"
                max="16384"
                step="256"
                value={local.max_tokens}
                onChange={(e) => setLocal({ ...local, max_tokens: parseInt(e.target.value, 10) })}
                className="w-full accent-white bg-white/10 rounded-lg cursor-pointer h-1.5"
              />
              <div className="flex items-center gap-1.5 pt-1">
                {[1024, 2048, 4096, 8192, 16384].map((cnt) => (
                  <button
                    key={cnt}
                    type="button"
                    onClick={() => setLocal({ ...local, max_tokens: cnt })}
                    className={`flex-1 py-1 rounded-md text-[10px] font-mono transition-colors cursor-pointer ${
                      local.max_tokens === cnt
                        ? 'bg-white/20 text-white font-medium'
                        : 'bg-white/[0.04] text-white/50 hover:text-white hover:bg-white/[0.08]'
                    }`}
                  >
                    {cnt >= 1024 ? `${cnt / 1024}K` : cnt}
                  </button>
                ))}
              </div>
            </div>

            {/* Repetition Penalty */}
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.08] space-y-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-white">Repetition Penalty</div>
                  <div className="text-[10px] text-white/40">Deters repeated loops</div>
                </div>
                <input
                  type="number"
                  min="1.0"
                  max="1.5"
                  step="0.01"
                  value={local.repetition_penalty}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    if (!isNaN(val)) setLocal({ ...local, repetition_penalty: Math.min(1.5, Math.max(1.0, val)) });
                  }}
                  className="w-16 font-mono text-xs text-right bg-black/60 px-2 py-1 rounded-lg border border-white/[0.12] text-white focus:outline-none focus:border-white/40"
                />
              </div>
              <input
                type="range"
                min="1.0"
                max="1.5"
                step="0.01"
                value={local.repetition_penalty}
                onChange={(e) => setLocal({ ...local, repetition_penalty: parseFloat(e.target.value) })}
                className="w-full accent-white bg-white/10 rounded-lg cursor-pointer h-1.5"
              />
              <div className="flex justify-between text-[10px] text-white/35 font-mono">
                <span>1.00 (None)</span>
                <span>1.05 (Default)</span>
                <span>1.30 (Strong)</span>
              </div>
            </div>

          </div>

          {/* Pro Parameter 6: Context Window Profile (KV-Cache Budget) */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-white/70 uppercase tracking-wider">
                Context Window (WebGPU KV-Cache Budget)
              </label>
              <span className="font-mono text-xs text-white/90 bg-black/60 px-2 py-0.5 rounded border border-white/[0.1]">
                {(local.contextWindowSize || 32768).toLocaleString()} Tokens
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {CONTEXT_OPTIONS.map((opt) => {
                const isSelected = (local.contextWindowSize || 32768) === opt.size;
                return (
                  <button
                    key={opt.size}
                    type="button"
                    onClick={() => setLocal({ ...local, contextWindowSize: opt.size })}
                    className={`p-3 rounded-2xl border text-left transition-all duration-150 cursor-pointer ${
                      isSelected
                        ? 'bg-white/[0.12] border-white/40 text-white shadow-xs ring-1 ring-white/20'
                        : 'bg-white/[0.02] border-white/[0.06] hover:border-white/[0.14] text-white/70 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs font-semibold text-white">{opt.label}</span>
                      <span className="text-[10px] font-mono text-white/40">{opt.size.toLocaleString()} tok</span>
                    </div>
                    <div className="text-[11px] text-white/40 leading-snug">{opt.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Cache & Eviction Persistence Guarantee Note */}
          <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.08] flex items-start gap-3 text-xs">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="font-semibold text-white flex items-center gap-1.5">
                <span>Model Cache Eviction Protection Active</span>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 font-mono">
                  IMMUTABLE
                </span>
              </div>
              <p className="text-[11px] text-white/50 leading-relaxed">
                Downloaded model shards and weights are locked in browser CacheStorage with immutable headers and persistent storage registration, preventing automatic browser eviction or purge.
              </p>
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-black/60 border-t border-white/[0.08] flex items-center justify-between shrink-0">
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs text-white/60 hover:text-white glass-button cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs text-white/70 hover:text-white glass-button cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveAndClose}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl glass-button-primary text-white text-xs font-semibold cursor-pointer active:scale-95"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Save Parameters</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
