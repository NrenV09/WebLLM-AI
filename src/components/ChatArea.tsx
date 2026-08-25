import React, { useRef, useEffect, useState } from 'react';
import { 
  PanelLeft, 
  PanelLeftClose, 
  Sparkles, 
  Settings, 
  HardDrive, 
  Wifi, 
  WifiOff, 
  Cpu, 
  ShieldCheck,
  Code2,
  Calculator,
  Terminal,
  Compass
} from 'lucide-react';
import { ChatMessage, ModelInfo, Diagnostics } from '../types';
import { MessageItem } from './MessageItem';
import { ChatInput } from './ChatInput';

interface ChatAreaProps {
  messages: ChatMessage[];
  isTyping: boolean;
  input: string;
  setInput: (val: string) => void;
  onSend: (text?: string) => void;
  onStop: () => void;
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
  models: ModelInfo[];
  selectedModel: string;
  onSelectModel: (modelId: string) => void;
  onOpenSettings: () => void;
  onOpenStorage: () => void;
  diagnostics: Diagnostics;
  isOnline: boolean;
  isWorkerActive: boolean;
  preprocessLatex: (content: string) => string;
}

const WELCOME_STARTERS = [
  {
    icon: Calculator,
    title: "Math & Derivation",
    prompt: "Solve the integral $\\int \\frac{1 + \\sin(x)\\cos(x)}{\\sin(x)\\cos(x)} dx$ step-by-step with clear reasoning and KaTeX equations."
  },
  {
    icon: Code2,
    title: "Algorithm in TypeScript",
    prompt: "Write a high-performance LRU Cache in TypeScript with O(1) get and put operations, including complete type definitions."
  },
  {
    icon: Compass,
    title: "Quantum Physics",
    prompt: "Explain quantum superposition and quantum entanglement in intuitive terms with real-world analogies."
  },
  {
    icon: Terminal,
    title: "Data Analysis",
    prompt: "Write a complete Python script using pandas and matplotlib to clean a dataset and plot trends with error handling."
  }
];

export const ChatArea: React.FC<ChatAreaProps> = ({
  messages,
  isTyping,
  input,
  setInput,
  onSend,
  onStop,
  isSidebarOpen,
  onToggleSidebar,
  models,
  selectedModel,
  onSelectModel,
  onOpenSettings,
  onOpenStorage,
  diagnostics,
  isOnline,
  isWorkerActive,
  preprocessLatex
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  const currentModel = models.find(m => m.id === selectedModel) || models[0];

  // Auto-scroll on new messages or streaming tokens
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping, autoScroll]);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 120;
    setAutoScroll(isNearBottom);
  };

  const hasUserMessages = messages.some(m => m.role === 'user');

  return (
    <main className="flex-1 flex flex-col h-full min-w-0 relative overflow-hidden bg-transparent">
      {/* Top Header Bar */}
      <header className="h-14 flex items-center justify-between px-4 border-b border-white/[0.06] flex-shrink-0 bg-[#0e1015]/60 backdrop-blur-xl z-10">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button
            onClick={onToggleSidebar}
            className="p-2 rounded-xl text-white/60 hover:text-white hover:bg-white/[0.06] transition-all duration-200 cursor-pointer shrink-0 active:scale-95"
            title={isSidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
          >
            {isSidebarOpen ? <PanelLeftClose className="w-5 h-5" /> : <PanelLeft className="w-5 h-5" />}
          </button>

          {/* Model Name Badge */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] backdrop-blur-md text-xs font-medium text-white/90 truncate shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-[#a8c7fa] shrink-0" />
            <span className="truncate">{currentModel?.name}</span>
          </div>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Offline / Online Pill */}
          <div
            title={isOnline ? "Online (Model runs 100% on device)" : "Operating 100% offline from local cache"}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border backdrop-blur-md ${
              !isOnline
                ? 'bg-amber-950/40 text-amber-300 border-amber-800/40'
                : 'bg-white/[0.04] text-white/70 border-white/[0.06]'
            }`}
          >
            {!isOnline ? (
              <>
                <WifiOff className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="whitespace-nowrap">Offline Mode</span>
              </>
            ) : (
              <>
                <Wifi className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="hidden sm:inline whitespace-nowrap">Offline Ready</span>
              </>
            )}
          </div>

          <button
            onClick={onOpenStorage}
            className="p-2 rounded-xl text-white/60 hover:text-white hover:bg-white/[0.06] transition-all duration-200 cursor-pointer border border-white/[0.06] hidden sm:flex items-center gap-1.5 text-xs shrink-0 active:scale-95"
            title="Manage offline storage & cache"
          >
            <HardDrive className="w-4 h-4 text-white/60" />
            <span className="hidden md:inline">Storage</span>
          </button>

          <button
            onClick={onOpenSettings}
            className="p-2 rounded-xl text-white/60 hover:text-white hover:bg-white/[0.06] transition-all duration-200 cursor-pointer border border-white/[0.06] shrink-0 active:scale-95"
            title="Generation settings"
          >
            <Settings className="w-4 h-4 text-white/60" />
          </button>
        </div>
      </header>

      {/* Message Stream */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto min-h-0 relative p-3 sm:p-4 md:p-6"
      >
        {!hasUserMessages ? (
          /* Gemini-Style Welcome State */
          <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12 flex flex-col justify-center min-h-[60vh]">
            <div className="space-y-2 mb-8 text-left">
              <h2 className="text-3xl sm:text-5xl font-medium bg-gradient-to-r from-[#a8c7fa] via-[#c58af9] to-[#f28b82] bg-clip-text text-transparent tracking-tight">
                Hello
              </h2>
              <p className="text-xl sm:text-2xl text-white/50 font-normal">
                How can I help you today?
              </p>
            </div>

            {/* Quick Starter Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mb-8">
              {WELCOME_STARTERS.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <button
                    key={idx}
                    onClick={() => onSend(item.prompt)}
                    disabled={isTyping}
                    className="p-4 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] hover:border-white/[0.14] text-left transition-all duration-200 group cursor-pointer shadow-lg shadow-black/20 flex flex-col justify-between h-28 active:scale-[0.99] backdrop-blur-md"
                  >
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4 text-[#a8c7fa] shrink-0" />
                      <span className="text-xs font-semibold text-white/90 group-hover:text-white truncate">
                        {item.title}
                      </span>
                    </div>
                    <span className="text-[12px] text-white/50 group-hover:text-white/75 line-clamp-2 leading-relaxed">
                      {item.prompt}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Privacy Guarantee Pill */}
            <div className="flex items-center gap-2 self-start px-3.5 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.06] backdrop-blur-sm text-xs text-white/40">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>100% Private WebGPU Inference • Zero data leaves your device</span>
            </div>
          </div>
        ) : (
          /* Message List */
          <div className="max-w-3xl mx-auto flex flex-col pb-4">
            {messages.map((m, idx) => (
              <MessageItem
                key={m.id || idx}
                message={m}
                index={idx}
                isStreaming={isTyping}
                isLast={idx === messages.length - 1}
                preprocessLatex={preprocessLatex}
              />
            ))}
          </div>
        )}
      </div>

      {/* Chat Input Capsule Container */}
      <div className="p-3 sm:p-4 flex-shrink-0 bg-gradient-to-t from-[#0b0d11] via-[#0b0d11]/85 to-transparent z-20">
        <div className="max-w-3xl mx-auto w-full">
          <ChatInput
            input={input}
            setInput={setInput}
            onSend={onSend}
            onStop={onStop}
            isGenerating={isTyping}
            disabled={false}
            models={models}
            selectedModel={selectedModel}
            onSelectModel={onSelectModel}
            isWorkerActive={isWorkerActive}
            isOnline={isOnline}
          />
        </div>
      </div>
    </main>
  );
};
