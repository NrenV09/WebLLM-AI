import React, { useRef, useEffect, useState } from 'react';
import { 
  PanelLeft, 
  PanelLeftClose, 
  Sparkles, 
  Settings, 
  HardDrive, 
  Wifi, 
  WifiOff, 
  Lightbulb,
  Activity
} from 'lucide-react';
import { ChatMessage, ModelInfo, Diagnostics, VramLiveStats } from '../types';
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
  onOpenInfoGuide?: () => void;
  diagnostics: Diagnostics;
  isOnline: boolean;
  isWorkerActive: boolean;
  preprocessLatex: (content: string) => string;
  status?: 'initial' | 'loading' | 'error' | 'ready' | 'unsupported';
  isModelLoaded?: boolean;
  onLoadModel?: () => void;
  vramStats?: VramLiveStats | null;
  onOpenVramMonitor?: () => void;
}

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
  onOpenInfoGuide,
  diagnostics,
  isOnline,
  isWorkerActive,
  preprocessLatex,
  status = 'initial',
  isModelLoaded,
  onLoadModel,
  vramStats,
  onOpenVramMonitor
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
    <main className="flex-1 flex flex-col h-full min-w-0 relative overflow-hidden bg-black">
      {/* Top Floating Liquid Glass Header Bar */}
      <header className="h-14 flex items-center justify-between px-3 sm:px-4 border-b border-white/[0.08] flex-shrink-0 bg-black/60 backdrop-blur-2xl z-10">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onToggleSidebar();
            }}
            className="p-2 rounded-xl text-white/60 hover:text-white glass-button cursor-pointer shrink-0 active:scale-95"
            title={isSidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
          >
            {isSidebarOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeft className="w-4 h-4" />}
          </button>

          {/* Model Name Glass Badge */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.1] backdrop-blur-xl text-xs font-medium text-white/90 truncate shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-white/70 shrink-0" />
            <span className="truncate">{currentModel?.name}</span>
          </div>

          {/* Interactive Real-Time VRAM & Health Badge */}
          {onOpenVramMonitor && (
            <button
              type="button"
              id="header-vram-monitor-btn"
              onClick={onOpenVramMonitor}
              className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-full border text-xs font-medium transition-all cursor-pointer backdrop-blur-xl shadow-xs active:scale-95 shrink-0 ${
                vramStats && vramStats.allocatedMB > 0
                  ? vramStats.isHealthy === true
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20'
                    : vramStats.isHealthy === false
                      ? 'bg-rose-500/15 border-rose-500/30 text-rose-300 hover:bg-rose-500/25 animate-pulse'
                      : 'bg-blue-500/10 border-blue-500/30 text-blue-300 hover:bg-blue-500/20'
                  : status === 'ready'
                    ? 'bg-amber-500/15 border-amber-500/30 text-amber-300 hover:bg-amber-500/25 animate-pulse'
                    : 'bg-white/[0.04] border-white/[0.08] text-white/60 hover:text-white hover:bg-white/[0.08]'
              }`}
              title="Click to inspect real-time VRAM allocation and run live health probe"
            >
              <Activity className={`w-3.5 h-3.5 ${vramStats && vramStats.allocatedMB > 0 ? 'text-blue-400' : 'text-white/50'} animate-pulse shrink-0`} />
              <span className="font-mono font-semibold">
                {vramStats && vramStats.allocatedMB > 0
                  ? `${vramStats.allocatedMB.toLocaleString()} MB`
                  : status === 'ready'
                    ? '0 MB VRAM ⚠️'
                    : 'VRAM'}
              </span>
              <span className="hidden md:inline text-[11px] font-normal opacity-80">
                {vramStats?.isHealthy === true ? '• Verified' : vramStats?.isHealthy === false ? '• Error' : status === 'ready' && vramStats?.allocatedMB ? '• Ready' : status === 'ready' ? '• Check' : ''}
              </span>
            </button>
          )}
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {onOpenInfoGuide && (
            <button
              onClick={onOpenInfoGuide}
              className="p-2 rounded-xl glass-button text-white/70 hover:text-white cursor-pointer shrink-0"
              title="Information & Button Functionality"
            >
              <Lightbulb className="w-4 h-4 text-white" />
            </button>
          )}

          <button
            onClick={onOpenStorage}
            className="p-2 rounded-xl glass-button text-white/70 hover:text-white cursor-pointer hidden sm:flex items-center gap-1.5 text-xs shrink-0"
            title="Manage offline storage & cache"
          >
            <HardDrive className="w-4 h-4 text-white/70" />
            <span className="hidden md:inline">Storage</span>
          </button>

          <button
            onClick={onOpenSettings}
            className="p-2 rounded-xl glass-button text-white/70 hover:text-white cursor-pointer shrink-0"
            title="Generation settings"
          >
            <Settings className="w-4 h-4 text-white/70" />
          </button>
        </div>
      </header>

      {/* Message Stream or Centered Welcome */}
      {!hasUserMessages ? (
        /* iPadOS Liquid Glass Welcome State: Centered text box when starting a new chat */
        <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 overflow-y-auto min-h-0 relative">
          <div className="w-full max-w-2xl sm:max-w-3xl flex flex-col items-center text-center my-auto py-8">
            
            {/* Liquid Glass Orb / Center Icon */}
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl glass-panel flex items-center justify-center mb-6 shadow-2xl relative">
              <Sparkles className="w-8 h-8 text-white/90" />
              <div className="absolute inset-0 rounded-3xl bg-white/[0.04] pointer-events-none" />
            </div>

            {/* Requested Text: "Hi! How can I Help?" */}
            <div className="space-y-2.5 mb-8 sm:mb-10">
              <h1 className="text-3xl sm:text-5xl font-semibold text-white tracking-tight">
                Hi! How can I Help?
              </h1>
              <p className="text-sm sm:text-base text-white/40 font-normal max-w-md mx-auto">
                On-device private inference accelerated by WebGPU
              </p>
            </div>

            {/* Centered Text Box for New Chat */}
            <div className="w-full max-w-2xl sm:max-w-3xl mx-auto">
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
        </div>
      ) : (
        <>
          {/* Message Stream */}
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto min-h-0 relative px-2 sm:px-4"
          >
            <div className="max-w-4xl mx-auto flex flex-col pt-2 pb-4">
              {messages.map((m, idx) => (
                <MessageItem
                  key={m.id || idx}
                  message={m}
                  index={idx}
                  isStreaming={isTyping}
                  isLast={idx === messages.length - 1}
                  preprocessLatex={preprocessLatex}
                  onDeleteMessage={onDeleteMessage}
                />
              ))}
            </div>
          </div>

          {/* Docked Chat Input Capsule Container */}
          <div className="px-2 py-2 sm:px-4 sm:py-3 flex-shrink-0 bg-black border-t border-white/[0.08] z-20 shadow-[0_-8px_24px_rgba(0,0,0,0.6)]">
            <div className="max-w-4xl mx-auto w-full">
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
        </>
      )}
    </main>
  );
};
