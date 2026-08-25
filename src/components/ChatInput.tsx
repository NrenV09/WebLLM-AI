import React, { useRef, useEffect, useState } from 'react';
import { Send, Square, ChevronDown, Sparkles, Cpu, ShieldCheck } from 'lucide-react';
import { ModelInfo } from '../types';

interface ChatInputProps {
  input: string;
  setInput: (val: string) => void;
  onSend: (text?: string) => void;
  onStop: () => void;
  isGenerating: boolean;
  disabled: boolean;
  models: ModelInfo[];
  selectedModel: string;
  onSelectModel: (modelId: string) => void;
  isWorkerActive: boolean;
  isOnline: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  input,
  setInput,
  onSend,
  onStop,
  isGenerating,
  disabled,
  models,
  selectedModel,
  onSelectModel,
  isWorkerActive,
  isOnline
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Auto-grow textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsModelDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!isGenerating && input.trim() && !disabled) {
        onSend();
      }
    }
  };

  const currentModel = models.find(m => m.id === selectedModel) || models[0];

  return (
    <div className="w-full relative">
      {/* Floating Dynamic Capsule Dock */}
      <div className="relative rounded-[28px] bg-[#181a20]/85 backdrop-blur-xl border border-white/[0.1] shadow-2xl shadow-black/60 p-2 sm:p-3 transition-all duration-200 focus-within:border-[#a8c7fa]/50 focus-within:ring-1 focus-within:ring-[#a8c7fa]/30">
        <div className="flex flex-col gap-1.5">
          {/* Main Textarea */}
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            placeholder={isGenerating ? "Model is generating locally on WebGPU..." : "Ask anything... (Runs 100% locally & private)"}
            rows={1}
            className="w-full bg-transparent text-[#e6e8ec] px-3 py-1.5 focus:outline-none resize-none max-h-52 min-h-[44px] text-[15px] placeholder-white/35 leading-relaxed font-sans"
          />

          {/* Action Row inside capsule */}
          <div className="flex items-center justify-between pt-1 px-1">
            {/* Model Selector Dropdown Pill */}
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
                disabled={isGenerating}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.04] hover:bg-white/[0.08] text-xs font-medium text-white/90 hover:text-white border border-white/[0.08] transition-all duration-200 cursor-pointer disabled:opacity-50 active:scale-95"
                title="Select local model"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#a8c7fa]" />
                <span className="max-w-[140px] sm:max-w-[200px] truncate">{currentModel?.name || selectedModel}</span>
                <span className="text-[10px] text-white/40 font-mono hidden sm:inline">{currentModel?.vramMB}MB</span>
                <ChevronDown className={`w-3.5 h-3.5 text-white/40 transition-transform duration-200 ${isModelDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Model Menu Dropdown */}
              {isModelDropdownOpen && (
                <div className="absolute bottom-full left-0 mb-2 w-72 bg-[#12141a]/95 border border-white/[0.1] rounded-2xl shadow-2xl overflow-hidden py-1.5 z-50 backdrop-blur-2xl animate-in fade-in slide-in-from-bottom-2 duration-150">
                  <div className="px-3.5 py-2 text-[11px] font-semibold text-white/40 uppercase tracking-wider border-b border-white/[0.06] flex items-center justify-between">
                    <span>Local Models (WebGPU)</span>
                    <span className="text-emerald-400 font-mono text-[10px]">0 API calls</span>
                  </div>
                  <div className="max-h-60 overflow-y-auto py-1">
                    {models.map((m) => {
                      const isSelected = m.id === selectedModel;
                      return (
                        <button
                          key={m.id}
                          onClick={() => {
                            onSelectModel(m.id);
                            setIsModelDropdownOpen(false);
                          }}
                          className={`w-full px-3.5 py-2.5 flex items-center justify-between text-left transition-colors cursor-pointer ${
                            isSelected ? 'bg-blue-500/15 text-white font-medium border-l-2 border-[#a8c7fa]' : 'text-white/80 hover:bg-white/[0.05]'
                          }`}
                        >
                          <div className="flex flex-col">
                            <span className="text-xs">{m.name}</span>
                            <span className="text-[11px] text-white/40">{m.sizeLabel || `${m.vramMB} MB VRAM`}</span>
                          </div>
                          {isSelected && (
                            <span className="w-2 h-2 rounded-full bg-[#a8c7fa] shadow-[0_0_8px_rgba(168,199,250,0.8)]"></span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Right Action: Dynamic Morphing Send / Stop Button */}
            <div className="flex items-center gap-2">
              {isGenerating ? (
                <button
                  type="button"
                  onClick={onStop}
                  className="flex items-center justify-center w-9 h-9 rounded-full bg-rose-500/90 hover:bg-rose-500 text-white transition-all duration-200 active:scale-90 cursor-pointer shadow-lg shadow-rose-500/25"
                  title="Stop generating"
                >
                  <Square className="w-3.5 h-3.5 fill-white" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => onSend()}
                  disabled={!input.trim() || disabled}
                  className={`flex items-center justify-center w-9 h-9 rounded-full transition-all duration-200 cursor-pointer ${
                    input.trim() && !disabled
                      ? 'bg-gradient-to-r from-blue-500 to-indigo-500 shadow-lg shadow-blue-500/25 text-white hover:from-blue-400 hover:to-indigo-400 active:scale-95'
                      : 'bg-white/[0.05] text-white/30 border border-white/[0.05] cursor-not-allowed opacity-60'
                  }`}
                  title="Send message (Enter)"
                >
                  <Send className="w-4 h-4 ml-0.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Minimal Status Footer */}
      <div className="flex items-center justify-between px-4 pt-2.5 text-[11px] text-[#9aa0a6] select-none">
        <div className="flex items-center gap-1.5 text-white/50">
          <Cpu className="w-3.5 h-3.5 text-[#a8c7fa]" />
          <span>WebGPU • {isWorkerActive ? 'Worker Thread Active' : 'Ready'}</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 text-white/60">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)] animate-pulse"></span>
            <span className="hidden sm:inline">100% On-Device & Private •</span>
            <span className="text-emerald-300 font-medium">Offline Ready</span>
          </span>
        </div>
      </div>
    </div>
  );
};
