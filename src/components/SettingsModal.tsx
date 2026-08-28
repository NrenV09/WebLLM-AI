import React, { useState } from 'react';
import { X, Sliders, RotateCcw, Check, Sparkles, Code, Brain, Lightbulb, Zap, Cpu } from 'lucide-react';
import { AISettings } from '../types';
import { DEFAULT_SETTINGS } from '../storage';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AISettings;
  onSave: (newSettings: AISettings) => void;
}

const PRESETS = [
  {
    name: 'Balanced',
    icon: Sparkles,
    desc: 'General knowledge, clean explanations, versatile everyday chat',
    settings: {
      temperature: 0.6,
      top_p: 0.9,
      repetition_penalty: 1.05,
      max_tokens: 4096,
      contextWindowSize: 3072,
      systemPrompt: 'You are a helpful, accurate AI assistant. Provide focused, well-structured answers. When analyzing complex tasks, wrap reasoning in <think>...</think> tags.\n\nSTRICT LATEX FORMATTING: Wrap inline math in $...$ and block math in $$...$$.'
    }
  },
  {
    name: 'Code & Logic',
    icon: Code,
    desc: 'Deterministic, bug-free programming, TypeScript, algorithms',
    settings: {
      temperature: 0.2,
      top_p: 0.85,
      repetition_penalty: 1.1,
      max_tokens: 4096,
      contextWindowSize: 4096,
      systemPrompt: 'You are an expert senior software engineer. Provide robust, type-safe, production-ready code with complete logic and zero placeholders. When solving algorithms or debugging, wrap your step-by-step logic in <think>...</think> tags.'
    }
  },
  {
    name: 'Deep Reasoning',
    icon: Brain,
    desc: 'Multi-step mathematics, formal proofs, step-by-step logic derivations',
    settings: {
      temperature: 0.3,
      top_p: 0.95,
      repetition_penalty: 1.0,
      max_tokens: 4096,
      contextWindowSize: 4096,
      systemPrompt: 'You are a PhD-level mathematician and logician. Break down problems meticulously with rigorous mathematical steps. Wrap your entire internal thought process inside <think>...</think> tags before giving the final solution.\n\nSTRICT LATEX FORMATTING:\n1. Wrap inline math in $...$ (e.g. $E=mc^2$).\n2. Wrap display block math in $$...$$ on dedicated lines.'
    }
  },
  {
    name: 'Creative',
    icon: Lightbulb,
    desc: 'Brainstorming, varied vocabulary, storytelling and ideation',
    settings: {
      temperature: 0.85,
      top_p: 0.95,
      repetition_penalty: 1.02,
      max_tokens: 4096,
      contextWindowSize: 3072,
      systemPrompt: 'You are an imaginative, expressive creative assistant with a rich vocabulary and inventive ideas.'
    }
  }
];

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSave
}) => {
  const [activeTab, setActiveTab] = useState<'sampling' | 'acceleration'>('sampling');
  const [local, setLocal] = useState<AISettings>({
    ...settings,
    contextWindowSize: settings.contextWindowSize || 3072
  });
  const [activePreset, setActivePreset] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleApplyPreset = (preset: typeof PRESETS[0]) => {
    setLocal({ ...local, ...preset.settings });
    setActivePreset(preset.name);
  };

  const handleReset = () => {
    setLocal(DEFAULT_SETTINGS);
    setActivePreset('Balanced');
  };

  const handleSaveAndClose = () => {
    onSave(local);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-150">
      <div className="w-full max-w-xl bg-[#12141a]/95 border border-white/[0.08] rounded-3xl shadow-2xl backdrop-blur-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-white/[0.06] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-500/15 text-[#a8c7fa] border border-blue-500/20">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-medium text-white">Engine & Model Settings</h2>
              <p className="text-xs text-white/50">Configure generation parameters & hardware acceleration</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="px-6 pt-3 pb-0 flex border-b border-white/[0.06] gap-4">
          <button
            onClick={() => setActiveTab('sampling')}
            className={`pb-3 text-xs font-medium flex items-center gap-1.5 transition-colors border-b-2 ${
              activeTab === 'sampling'
                ? 'border-[#a8c7fa] text-white'
                : 'border-transparent text-white/50 hover:text-white/80'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Sampling & Presets</span>
          </button>
          <button
            onClick={() => setActiveTab('acceleration')}
            className={`pb-3 text-xs font-medium flex items-center gap-1.5 transition-colors border-b-2 ${
              activeTab === 'acceleration'
                ? 'border-[#a8c7fa] text-white'
                : 'border-transparent text-white/50 hover:text-white/80'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>Hardware & KV-Cache Acceleration</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm text-white/80">
          {activeTab === 'sampling' ? (
            <>
              {/* Presets */}
              <div>
                <label className="block text-xs font-semibold text-white/40 uppercase tracking-wider mb-2.5">
                  Quick Presets
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  {PRESETS.map((p) => {
                    const Icon = p.icon;
                    const isSelected = activePreset === p.name;
                    return (
                      <button
                        key={p.name}
                        onClick={() => handleApplyPreset(p)}
                        className={`p-3 rounded-2xl border text-left transition-all duration-200 cursor-pointer ${
                          isSelected
                            ? 'bg-blue-500/15 border-[#a8c7fa]/50 text-white shadow-sm'
                            : 'bg-white/[0.02] border-white/[0.06] hover:border-white/[0.15] text-white/70 hover:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-2 font-medium text-xs mb-1">
                          <Icon className="w-3.5 h-3.5 text-[#a8c7fa]" />
                          <span>{p.name}</span>
                        </div>
                        <div className="text-[11px] text-white/40 line-clamp-1 leading-snug">
                          {p.desc}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Temperature Slider */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-white/90">Temperature</span>
                  <span className="font-mono text-[#a8c7fa] bg-black/40 px-2 py-0.5 rounded border border-white/[0.06]">
                    {local.temperature}
                  </span>
                </div>
                <input
                  type="range"
                  min="0.0"
                  max="1.5"
                  step="0.05"
                  value={local.temperature}
                  onChange={(e) => setLocal({ ...local, temperature: parseFloat(e.target.value) })}
                  className="w-full accent-[#a8c7fa] bg-white/10 rounded-lg cursor-pointer h-1.5"
                />
                <div className="flex justify-between text-[10px] text-white/30">
                  <span>Precise / Deterministic (0.0)</span>
                  <span>Balanced (0.6)</span>
                  <span>Creative (1.2)</span>
                </div>
              </div>

              {/* Top-P Slider */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-white/90">Top-P (Nucleus Sampling)</span>
                  <span className="font-mono text-[#a8c7fa] bg-black/40 px-2 py-0.5 rounded border border-white/[0.06]">
                    {local.top_p}
                  </span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.05"
                  value={local.top_p}
                  onChange={(e) => setLocal({ ...local, top_p: parseFloat(e.target.value) })}
                  className="w-full accent-[#a8c7fa] bg-white/10 rounded-lg cursor-pointer h-1.5"
                />
              </div>

              {/* Repetition Penalty */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-white/90">Repetition Penalty</span>
                  <span className="font-mono text-[#a8c7fa] bg-black/40 px-2 py-0.5 rounded border border-white/[0.06]">
                    {local.repetition_penalty}
                  </span>
                </div>
                <input
                  type="range"
                  min="1.0"
                  max="1.5"
                  step="0.05"
                  value={local.repetition_penalty}
                  onChange={(e) => setLocal({ ...local, repetition_penalty: parseFloat(e.target.value) })}
                  className="w-full accent-[#a8c7fa] bg-white/10 rounded-lg cursor-pointer h-1.5"
                />
              </div>

              {/* System Prompt */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-white/40 uppercase tracking-wider">
                  System Instruction Prompt
                </label>
                <textarea
                  value={local.systemPrompt}
                  onChange={(e) => setLocal({ ...local, systemPrompt: e.target.value })}
                  rows={4}
                  className="w-full bg-[#0b0d11]/80 border border-white/[0.08] rounded-2xl p-3 text-xs text-white/90 font-mono leading-relaxed focus:outline-none focus:border-[#a8c7fa]/50"
                  placeholder="Enter system prompt instructions..."
                />
              </div>
            </>
          ) : (
            <>
              {/* Hardware Acceleration & Context Window */}
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200/90 leading-relaxed flex items-start gap-3">
                  <Zap className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold text-amber-300 mb-1">Max Potential Hardware Tuning</div>
                    <div>
                      Optimizing the context window size adjusts the KV-Cache allocation in WebGPU memory. Smaller context windows dramatically accelerate parameter loading time and eliminate GPU memory throttling on devices with 2GB–4GB VRAM.
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-white/40 uppercase tracking-wider">
                    Context Window Profile (KV-Cache Allocation)
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {[
                      {
                        size: 2048,
                        title: '⚡ Turbo (2K)',
                        desc: 'Loads ~35% faster. Ultra-low VRAM footprint.',
                        badge: 'Recommended for Speed'
                      },
                      {
                        size: 3072,
                        title: '⚖️ Balanced (3K)',
                        desc: 'Optimal balance of context and GPU speed.',
                        badge: 'Default'
                      },
                      {
                        size: 4096,
                        title: '🧠 Deep (4K)',
                        desc: 'Full context for extensive reasoning & coding.',
                        badge: 'High Memory'
                      }
                    ].map((opt) => {
                      const isSelected = (local.contextWindowSize || 3072) === opt.size;
                      return (
                        <button
                          key={opt.size}
                          onClick={() => setLocal({ ...local, contextWindowSize: opt.size })}
                          className={`p-3.5 rounded-2xl border text-left transition-all duration-200 cursor-pointer ${
                            isSelected
                              ? 'bg-blue-500/15 border-[#a8c7fa]/50 text-white shadow-sm ring-1 ring-[#a8c7fa]/30'
                              : 'bg-white/[0.02] border-white/[0.06] hover:border-white/[0.15] text-white/70 hover:text-white'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-semibold text-xs text-white">{opt.title}</span>
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/[0.08] text-white/60">
                              {opt.size} tok
                            </span>
                          </div>
                          <p className="text-[11px] text-white/40 leading-snug">{opt.desc}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-2 text-xs">
                  <div className="flex items-center gap-2 font-medium text-white/90">
                    <Cpu className="w-4 h-4 text-[#a8c7fa]" />
                    <span>Device Execution Pipeline</span>
                  </div>
                  <ul className="text-white/50 space-y-1.5 text-[11px] list-disc list-inside">
                    <li><strong className="text-white/80">WebGPU Shader-f16:</strong> Enabled for 2x faster matrix multiplication on supported GPUs.</li>
                    <li><strong className="text-white/80">Dedicated Web Worker:</strong> Prevents main-thread UI freezing during token generation.</li>
                    <li><strong className="text-white/80">Permanent Shard Cache:</strong> Model weights stored locally in browser Cache API with zero re-downloads.</li>
                  </ul>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-[#0e1015]/80 border-t border-white/[0.06] flex items-center justify-between">
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs text-white/60 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs text-white/70 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveAndClose}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-400 hover:to-indigo-400 text-white text-xs font-semibold shadow-lg shadow-blue-500/25 transition-all cursor-pointer active:scale-95"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Apply Settings</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

