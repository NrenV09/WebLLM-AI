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
      {/* Gemini-Style Minimalist Floating Capsule */}
      <div className="relative rounded-[32px] bg-[#22242a]/80 backdrop-blur-xl border border-white/[0.05] shadow-[0_2px_12px_rgba(0,0,0,0.4)] p-1.5 transition-all duration-200 focus-within:bg-[#282a32] focus-within:border-white/[0.1] focus-within:shadow-[0_4px_16px_rgba(0,0,0,0.6)] flex items-end gap-2">
        
        {/* Main Textarea */}
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={isGenerating ? "Model is generating locally on WebGPU..." : "Ask anything... (Runs locally)"}
          rows={1}
          className="flex-1 bg-transparent text-[#e6e8ec] px-4 py-2.5 focus:outline-none resize-none max-h-48 min-h-[44px] overflow-y-auto text-base placeholder-white/40 leading-relaxed font-sans scrollbar-hide"
        />

        {/* Action Controls right beside the textarea in the same row */}
        <div className="flex items-center gap-1.5 pb-1 pr-1 shrink-0">
          {/* Model Selector Dropdown Pill */}
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              id="model-switcher-btn"
              onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
              disabled={isGenerating}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-white/[0.05] hover:bg-white/[0.1] text-[11px] font-medium text-white/80 hover:text-white border border-white/[0.03] transition-all duration-200 cursor-pointer disabled:opacity-50 active:scale-95"
              title="Select local model"
            >
              <Sparkles className="w-3 h-3 text-[#a8c7fa] shrink-0" />
              <span className="max-w-[80px] sm:max-w-[120px] truncate">{currentModel?.name || selectedModel}</span>
              <ChevronDown className={`w-3 h-3 text-white/40 transition-transform duration-200 shrink-0 ${isModelDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Model Menu Dropdown */}
            {isModelDropdownOpen && (
              <div className="absolute bottom-full right-0 mb-2 w-72 bg-[#1b1d24]/95 border border-white/[0.08] rounded-2xl shadow-2xl overflow-hidden py-1.5 z-50 backdrop-blur-2xl animate-in fade-in slide-in-from-bottom-2 duration-150">
                <div className="px-3.5 py-2 text-[11px] font-semibold text-white/40 uppercase tracking-wider border-b border-white/[0.04] flex items-center justify-between">
                  <span>Local Models (WebGPU)</span>
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
                          isSelected ? 'bg-blue-500/10 text-white font-medium border-l-2 border-[#a8c7fa]' : 'text-white/70 hover:bg-white/[0.05]'
                        }`}
                      >
                        <div className="flex flex-col">
                          <span className="text-[13px]">{m.name}</span>
                          <span className="text-[11px] text-white/40">{m.sizeLabel || m.params || 'On-Device WebGPU'}</span>
                        </div>
                        {isSelected && (
                          <span className="w-1.5 h-1.5 rounded-full bg-[#a8c7fa] shadow-[0_0_6px_rgba(168,199,250,0.8)]"></span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Dynamic Morphing Send / Stop Button */}
          {isGenerating ? (
            <button
              type="button"
              id="stop-prompt-btn"
              onClick={onStop}
              className="flex items-center justify-center w-8 h-8 rounded-full bg-white text-black transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer shadow-md shrink-0"
              title="Stop generating"
            >
              <Square className="w-3 h-3 fill-black" />
            </button>
          ) : (
            <button
              type="button"
              id="send-prompt-btn"
              onClick={() => onSend()}
              disabled={!input.trim() || disabled}
              className={`flex items-center justify-center w-8 h-8 rounded-full transition-all duration-200 cursor-pointer shrink-0 ${
                input.trim() && !disabled
                  ? 'bg-white text-black hover:bg-[#f0f0f0] shadow-md hover:scale-105 active:scale-95'
                  : 'bg-white/[0.1] text-white/30 cursor-not-allowed opacity-60'
              }`}
              title="Send message (Enter)"
            >
              <Send className="w-3.5 h-3.5 ml-0.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
