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
    name: 'iPad / Phi-4 Mini Stable',
    icon: Zap,
    desc: 'Anti-looping & low-memory tuning for iPad WebGPU stability',
    settings: {
      temperature: 0.6,
      top_p: 0.9,
      repetition_penalty: 1.18,
      max_tokens: 3072,
      contextWindowSize: 2048,
      phi4AntiLooping: true,
      ipadOptimization: true,
      systemPrompt: 'You are a helpful, direct, and precise AI assistant. Answer clearly without repeating phrases or looping.'
    }
  },
  {
    name: 'Creative',
    icon: Lightbulb,
    desc: 'Brainstorming, varied vocabulary, storytelling and ideation',
    settings: {
      temperature: 0.85,
      top_p: 0.95,
      repetition_penalty: 1.05,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-2xl animate-in fade-in duration-150">
      <div className="w-full max-w-xl glass-panel rounded-3xl overflow-hidden flex flex-col max-h-[90vh] border border-white/[0.12] shadow-2xl">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-white/[0.08] flex items-center justify-between bg-black/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/[0.06] border border-white/[0.12] flex items-center justify-center text-white">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white tracking-tight">Engine & Model Settings</h2>
              <p className="text-xs text-white/50">Configure generation parameters & hardware acceleration</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-white/40 hover:text-white glass-button cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="px-6 pt-3 pb-0 flex border-b border-white/[0.08] gap-4 bg-black/20">
          <button
            onClick={() => setActiveTab('sampling')}
            className={`pb-3 text-xs font-medium flex items-center gap-1.5 transition-colors border-b-2 ${
              activeTab === 'sampling'
                ? 'border-white text-white'
                : 'border-transparent text-white/40 hover:text-white/70'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Sampling & Presets</span>
          </button>
          <button
            onClick={() => setActiveTab('acceleration')}
            className={`pb-3 text-xs font-medium flex items-center gap-1.5 transition-colors border-b-2 ${
              activeTab === 'acceleration'
                ? 'border-white text-white'
                : 'border-transparent text-white/40 hover:text-white/70'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-white/80" />
            <span>Hardware & KV-Cache</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm text-white/80">
          {activeTab === 'sampling' ? (
            <>
              {/* Presets */}
              <div>
                <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-2.5">
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
                            ? 'bg-white/[0.12] border-white/30 text-white shadow-sm'
                            : 'bg-white/[0.02] border-white/[0.06] hover:border-white/[0.14] text-white/70 hover:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-2 font-medium text-xs mb-1">
                          <Icon className="w-3.5 h-3.5 text-white" />
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
                  <span className="font-mono text-white bg-black/60 px-2 py-0.5 rounded border border-white/[0.1]">
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
                  className="w-full accent-white bg-white/10 rounded-lg cursor-pointer h-1.5"
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
                  <span className="font-mono text-white bg-black/60 px-2 py-0.5 rounded border border-white/[0.1]">
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
                  className="w-full accent-white bg-white/10 rounded-lg cursor-pointer h-1.5"
                />
              </div>

              {/* Repetition Penalty */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-white/90">Repetition Penalty</span>
                  <span className="font-mono text-white bg-black/60 px-2 py-0.5 rounded border border-white/[0.1]">
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
                  className="w-full accent-white bg-white/10 rounded-lg cursor-pointer h-1.5"
                />
                <div className="flex justify-between text-[10px] text-white/30">
                  <span>Standard (1.05)</span>
                  <span>Phi-4 Recommended (1.18)</span>
                  <span>Aggressive (1.4)</span>
                </div>
              </div>

              {/* Max Output Tokens Slider */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-white/90">Max Output Tokens</span>
                  <span className="font-mono text-white bg-black/60 px-2 py-0.5 rounded border border-white/[0.1]">
                    {local.max_tokens} tokens
                  </span>
                </div>
                <input
                  type="range"
                  min="512"
                  max="12000"
                  step="512"
                  value={local.max_tokens}
                  onChange={(e) => setLocal({ ...local, max_tokens: parseInt(e.target.value) })}
                  className="w-full accent-white bg-white/10 rounded-lg cursor-pointer h-1.5"
                />
                <div className="flex justify-between text-[10px] text-white/30">
                  <span>Compact (2048)</span>
                  <span>Standard (4096)</span>
                  <span>High Output (8192)</span>
                  <span>Max (12000)</span>
                </div>
              </div>

              {/* Phi-4 & iPad Stability Toggles */}
              <div className="p-3.5 rounded-2xl glass-card space-y-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="text-xs font-medium text-white">Phi-4 Anti-Looping Protection</div>
                    <div className="text-[11px] text-white/40">Prevents repetitive sentence loops in Phi-4 Mini models</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setLocal({ ...local, phi4AntiLooping: !local.phi4AntiLooping })}
                    className={`w-10 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                      local.phi4AntiLooping !== false ? 'bg-white' : 'bg-white/10'
                    }`}
                  >
                    <div className={`bg-black w-4 h-4 rounded-full transition-transform ${
                      local.phi4AntiLooping !== false ? 'translate-x-4' : 'translate-x-0'
                    }`} />
                  </button>
                </div>

                <div className="flex items-center justify-between border-t border-white/[0.06] pt-2.5">
                  <div className="space-y-0.5">
                    <div className="text-xs font-medium text-white">iPad WebGPU Memory Optimizer</div>
                    <div className="text-[11px] text-white/40">Prevents iOS Safari WebGPU buffer exhaustion & freezes</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setLocal({ ...local, ipadOptimization: !local.ipadOptimization })}
                    className={`w-10 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                      local.ipadOptimization !== false ? 'bg-white' : 'bg-white/10'
                    }`}
                  >
                    <div className={`bg-black w-4 h-4 rounded-full transition-transform ${
                      local.ipadOptimization !== false ? 'translate-x-4' : 'translate-x-0'
                    }`} />
                  </button>
                </div>
              </div>

              {/* System Prompt */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider">
                  System Instruction Prompt
                </label>
                <textarea
                  value={local.systemPrompt}
                  onChange={(e) => setLocal({ ...local, systemPrompt: e.target.value })}
                  rows={4}
                  className="w-full bg-white/[0.02] border border-white/[0.08] rounded-2xl p-3 text-xs text-white/90 font-mono leading-relaxed focus:outline-none focus:border-white/30"
                  placeholder="Enter system prompt instructions..."
                />
              </div>
            </>
          ) : (
            <>
              {/* Hardware Acceleration & Context Window */}
              <div className="space-y-4">
                <div className="p-4 rounded-2xl glass-card text-xs text-white/80 leading-relaxed flex items-start gap-3">
                  <Zap className="w-5 h-5 text-white shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold text-white mb-1">Max Potential Hardware Tuning</div>
                    <div className="text-white/50">
                      Adjusting context window controls the KV-Cache allocation in WebGPU VRAM. Choose 8192 or 12000 for long prompt outputs and high document comprehension.
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider">
                    Context Window Profile (KV-Cache Allocation)
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                    {[
                      {
                        size: 2048,
                        title: '⚡ Turbo (2K)',
                        desc: 'Loads ~35% faster. Ultra-low VRAM footprint.',
                        badge: 'iPad & Mobile'
                      },
                      {
                        size: 3072,
                        title: '⚖️ Balanced (3K)',
                        desc: 'Optimal balance of context and GPU speed.',
                        badge: 'Default'
                      },
                      {
                        size: 4096,
                        title: '🧠 Extended (4K)',
                        desc: 'Full context for extensive reasoning & coding.',
                        badge: 'High Memory'
                      },
                      {
                        size: 8192,
                        title: '🚀 High Output (8K)',
                        desc: 'Large 8192 tokens window for comprehensive prompt outputs.',
                        badge: 'High Output'
                      },
                      {
                        size: 12000,
                        title: '⚡ Ultra Context (12K)',
                        desc: 'Maximum 12,000 tokens context for deep document synthesis.',
                        badge: 'Max Context'
                      }
                    ].map((opt) => {
                      const isSelected = (local.contextWindowSize || 3072) === opt.size;
                      return (
                        <button
                          key={opt.size}
                          onClick={() => setLocal({ ...local, contextWindowSize: opt.size })}
                          className={`p-3.5 rounded-2xl border text-left transition-all duration-200 cursor-pointer ${
                            isSelected
                              ? 'bg-white/[0.12] border-white/30 text-white shadow-sm ring-1 ring-white/20'
                              : 'bg-white/[0.02] border-white/[0.06] hover:border-white/[0.14] text-white/70 hover:text-white'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-semibold text-xs text-white">{opt.title}</span>
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/[0.08] text-white/70 font-mono">
                              {opt.size} tok
                            </span>
                          </div>
                          <p className="text-[11px] text-white/40 leading-snug">{opt.desc}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="p-4 rounded-2xl glass-card space-y-2 text-xs">
                  <div className="flex items-center gap-2 font-medium text-white">
                    <Cpu className="w-4 h-4 text-white/80" />
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
        <div className="px-6 py-4 bg-black/50 border-t border-white/[0.08] flex items-center justify-between">
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
              <span>Apply Settings</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

