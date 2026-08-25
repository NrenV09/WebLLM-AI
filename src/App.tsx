import { useState, useRef, useEffect } from 'react';
import { 
  CreateWebWorkerMLCEngine, 
  CreateMLCEngine, 
  InitProgressReport, 
  WebWorkerMLCEngine, 
  MLCEngine, 
  hasModelInCache,
  prebuiltAppConfig
} from '@mlc-ai/web-llm';
import { 
  Sparkles, 
  AlertTriangle, 
  Cpu, 
  Download, 
  RefreshCw, 
  HardDrive, 
  ShieldCheck, 
  Wifi, 
  WifiOff, 
  Loader2, 
  Info,
  ArrowRight
} from 'lucide-react';
import MLCWorker from './worker.ts?worker&inline';
import { registerCustomModels } from './modelsConfig';
import { ChatMessage, ChatSession, Diagnostics, ModelInfo, AISettings } from './types';
import { 
  loadAllSessions, 
  saveAllSessions, 
  saveSession, 
  deleteSession, 
  createNewSession, 
  autoGenerateTitle, 
  loadAISettings, 
  saveAISettings,
  DEFAULT_SETTINGS 
} from './storage';
import { useOnlineStatus, requestPersistentStorage, getStorageStatus } from './utils/offlineManager';
import { Sidebar } from './components/Sidebar';
import { ChatArea } from './components/ChatArea';
import { SettingsModal } from './components/SettingsModal';
import { StorageManagerModal } from './components/StorageManagerModal';

registerCustomModels(prebuiltAppConfig);

const MODELS: ModelInfo[] = [
  { id: 'Phi-3.5-mini-instruct-q4f16_1-MLC', name: 'Phi-3.5 Mini', vramMB: 2500, ipadRecommended: true, isVision: false, sizeLabel: '2.5 GB • Fast & Balanced' },
  { id: 'Phi-4-mini-instruct-q4f16_1-MLC', name: 'Phi-4 Mini', vramMB: 2600, ipadRecommended: true, isVision: false, sizeLabel: '2.6 GB • High Accuracy' },
  { id: 'Qwen3-4B-q4f16_1-MLC', name: 'Qwen3 4B', vramMB: 2600, ipadRecommended: true, isVision: false, sizeLabel: '2.6 GB • Deep Reasoning' },
  { id: 'Qwen2.5-3B-Instruct-q4f16_1-MLC', name: 'Qwen 2.5 3B', vramMB: 2200, ipadRecommended: true, isVision: false, sizeLabel: '2.2 GB • Multilingual' },
  { id: 'Llama-3.2-3B-Instruct-q4f16_1-MLC', name: 'Llama 3.2 3B', vramMB: 2200, ipadRecommended: true, isVision: false, sizeLabel: '2.2 GB • Meta Llama' },
  { id: 'Llama-3.2-1B-Instruct-q4f16_1-MLC', name: 'Llama 3.2 1B', vramMB: 800, ipadRecommended: true, isVision: false, sizeLabel: '800 MB • Ultralight' },
  { id: 'SmolLM2-135M-Instruct-q0f16-MLC', name: 'SmolLM2 135M', vramMB: 150, ipadRecommended: true, isVision: false, sizeLabel: '150 MB • Instant Test' }
];

// Helper to normalize LaTeX expressions for KaTeX
function preprocessLatex(content: string): string {
  if (!content) return '';
  return content
    .replace(/\\\[([\s\S]*?)\\\]/g, (_, math) => `\n$$\n${math.trim()}\n$$\n`)
    .replace(/\\\(([\s\S]*?)\\\)/g, (_, math) => `$${math.trim()}$`)
    .replace(/\\\[/g, '$$')
    .replace(/\\\]/g, '$$')
    .replace(/\\\(/g, '$')
    .replace(/\\\)/g, '$');
}

export default function App() {
  const engineRef = useRef<WebWorkerMLCEngine | MLCEngine | null>(null);
  const [status, setStatus] = useState<'initial' | 'unsupported' | 'loading' | 'ready' | 'error'>('initial');
  const [progress, setProgress] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState('');
  const [selectedModel, setSelectedModel] = useState(MODELS[0].id);
  const [isCached, setIsCached] = useState(false);
  const [executionMode, setExecutionMode] = useState<'worker' | 'main'>('worker');

  // Multi-chat state
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>('');

  // Modals state
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isStorageModalOpen, setIsStorageModalOpen] = useState(false);
  const [aiSettings, setAiSettings] = useState<AISettings>(DEFAULT_SETTINGS);

  // Online & storage state
  const isOnline = useOnlineStatus();
  const [diagnostics, setDiagnostics] = useState<Diagnostics>({
    isIpadOrIos: false,
    isInIframe: false,
    hasWebGpu: false,
    adapterFound: null,
    adapterName: '',
    storageQuotaMB: null,
    storageUsageMB: null,
    storagePersisted: false,
    serviceWorkerActive: false,
  });

  // Chat input and generation state
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Active session helper
  const activeSession = sessions.find(s => s.id === activeSessionId) || sessions[0];
  const messages = activeSession?.messages || [];

  // Diagnostics and persistent storage check
  const runDiagnostics = async () => {
    const ua = navigator.userAgent || '';
    const isIosDevice = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const inIframe = window.self !== window.top;
    const webGpuSupported = typeof navigator !== 'undefined' && 'gpu' in navigator && !!(navigator as any).gpu;

    let adapterOk: boolean | null = null;
    let name = '';
    if (webGpuSupported) {
      try {
        const adapter = await (navigator as any).gpu.requestAdapter();
        adapterOk = !!adapter;
        if (adapter) {
          const info = await (adapter as any).requestAdapterInfo?.();
          name = info?.description || info?.device || 'WebGPU Hardware Accelerated Adapter';
        }
      } catch {
        adapterOk = false;
      }
    }

    const storageInfo = await getStorageStatus();

    setDiagnostics({
      isIpadOrIos: isIosDevice,
      isInIframe: inIframe,
      hasWebGpu: webGpuSupported,
      adapterFound: adapterOk,
      adapterName: name,
      storageQuotaMB: storageInfo.quotaMB,
      storageUsageMB: storageInfo.usageMB,
      storagePersisted: storageInfo.persisted,
      serviceWorkerActive: storageInfo.isServiceWorkerReady,
    });

    if (!webGpuSupported) {
      setStatus('unsupported');
    }
  };

  // Load chats & settings on start
  useEffect(() => {
    runDiagnostics();
    requestPersistentStorage().then(() => runDiagnostics()).catch(() => {});

    // Load persisted settings
    loadAISettings().then((cfg) => {
      if (cfg) setAiSettings(cfg);
    });

    // Load persisted sessions from IndexedDB
    loadAllSessions().then((loaded) => {
      if (loaded && loaded.length > 0) {
        setSessions(loaded);
        setActiveSessionId(loaded[0].id);
      } else {
        const initSession = createNewSession(selectedModel);
        setSessions([initSession]);
        setActiveSessionId(initSession.id);
        saveSession(initSession).catch(() => {});
      }
    });
  }, []);

  // Check model cache status
  useEffect(() => {
    hasModelInCache(selectedModel, prebuiltAppConfig).then(cached => {
      setIsCached(cached);
    }).catch(() => setIsCached(false));
  }, [selectedModel]);

  // Session Handlers
  const handleCreateNewChat = (modelIdToUse?: string) => {
    const newSession = createNewSession(modelIdToUse || selectedModel);
    const updated = [newSession, ...sessions];
    setSessions(updated);
    setActiveSessionId(newSession.id);
    saveSession(newSession).catch(() => {});
    if (window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  };

  const handleSelectSession = (id: string) => {
    if (isTyping) return;
    setActiveSessionId(id);
    if (window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  };

  const handleDeleteSession = async (id: string) => {
    if (isTyping && id === activeSessionId) return;
    await deleteSession(id);
    const filtered = sessions.filter(s => s.id !== id);
    if (filtered.length === 0) {
      const fresh = createNewSession(selectedModel);
      setSessions([fresh]);
      setActiveSessionId(fresh.id);
      await saveSession(fresh);
    } else {
      setSessions(filtered);
      if (id === activeSessionId) {
        setActiveSessionId(filtered[0].id);
      }
    }
  };

  const handleRenameSession = async (id: string, newTitle: string) => {
    const updated = sessions.map(s => s.id === id ? { ...s, title: newTitle, updatedAt: Date.now() } : s);
    setSessions(updated);
    const target = updated.find(s => s.id === id);
    if (target) {
      await saveSession(target);
    }
  };

  const handleReloadSessions = async () => {
    const fresh = await loadAllSessions();
    if (fresh.length > 0) {
      setSessions(fresh);
      setActiveSessionId(fresh[0].id);
    } else {
      const initSession = createNewSession(selectedModel);
      setSessions([initSession]);
      setActiveSessionId(initSession.id);
    }
  };

  // Model Engine Lifecycle
  const initEngine = async (modelToLoad: string = selectedModel, forceMode?: 'worker' | 'main') => {
    const chosenMode = forceMode || executionMode;
    setStatus('loading');
    setProgress('Initializing WebGPU pipeline...');
    setErrorMsg('');

    try {
      if (engineRef.current) {
        await engineRef.current.unload();
        engineRef.current = null;
      }

      const initProgressCallback = (report: InitProgressReport) => {
        setProgress(report.text);
      };

      if (chosenMode === 'worker') {
        try {
          const workerInstance = new MLCWorker();
          const engine = await CreateWebWorkerMLCEngine(
            workerInstance,
            modelToLoad,
            { 
              initProgressCallback,
              appConfig: prebuiltAppConfig
            }
          );
          engineRef.current = engine;
        } catch (workerErr: any) {
          console.warn('Worker initialization failed, fallback to main thread:', workerErr);
          setExecutionMode('main');
          const engine = await CreateMLCEngine(
            modelToLoad,
            {
              initProgressCallback,
              appConfig: prebuiltAppConfig
            }
          );
          engineRef.current = engine;
        }
      } else {
        const engine = await CreateMLCEngine(
          modelToLoad,
          {
            initProgressCallback,
            appConfig: prebuiltAppConfig
          }
        );
        engineRef.current = engine;
      }

      setStatus('ready');
      setIsCached(true);
      await runDiagnostics();
    } catch (err: any) {
      console.error('Model initialization error:', err);
      setStatus('error');
      setErrorMsg(err.message || 'Failed to initialize WebGPU engine');
    }
  };

  // Model Selection
  const handleModelSelect = (modelId: string) => {
    setSelectedModel(modelId);
    if (status === 'ready' && engineRef.current) {
      initEngine(modelId);
    }
  };

  // Clear Model Cache
  const handleClearModelCache = async () => {
    if (typeof window !== 'undefined' && 'caches' in window) {
      const keys = await caches.keys();
      for (const k of keys) {
        if (k.includes('webllm') || k.includes('tvmjs') || k.includes('mlc') || k.includes('huggingface')) {
          await caches.delete(k);
        }
      }
    }
    setIsCached(false);
  };

  // Send Message / Generation Handler
  const handleSend = async (customPrompt?: string) => {
    const textToSend = (customPrompt || input).trim();
    if (!textToSend || isTyping || !engineRef.current || status !== 'ready') return;

    setInput('');
    setIsTyping(true);

    const isFirstUserMessage = !messages.some(m => m.role === 'user');
    const userMsg: ChatMessage = {
      id: `msg_user_${Date.now()}`,
      role: 'user',
      content: textToSend,
      timestamp: Date.now()
    };

    const initialAssistantMsg: ChatMessage = {
      id: `msg_ast_${Date.now() + 1}`,
      role: 'assistant',
      content: '',
      timestamp: Date.now()
    };

    const newMessages = [...messages, userMsg, initialAssistantMsg];
    let updatedTitle = activeSession?.title || 'New conversation';
    if (isFirstUserMessage) {
      updatedTitle = autoGenerateTitle(textToSend);
    }

    const updatedSession: ChatSession = {
      ...activeSession,
      title: updatedTitle,
      updatedAt: Date.now(),
      messages: newMessages
    };

    const updatedSessionsList = sessions.map(s => s.id === activeSession.id ? updatedSession : s);
    setSessions(updatedSessionsList);
    await saveSession(updatedSession);

    // Build chat context for model with system prompt
    const chatHistory = [
      { role: 'system', content: aiSettings.systemPrompt },
      ...newMessages
        .filter(m => m.content && m !== initialAssistantMsg)
        .map(m => ({ role: m.role, content: m.content }))
    ];

    abortControllerRef.current = new AbortController();
    const startTime = performance.now();
    let firstTokenTime: number | null = null;
    let tokenCount = 0;
    let accumulatedText = '';

    try {
      const completion = await engineRef.current.chat.completions.create({
        messages: chatHistory as any,
        temperature: aiSettings.temperature,
        top_p: aiSettings.top_p,
        repetition_penalty: aiSettings.repetition_penalty,
        max_tokens: aiSettings.max_tokens,
        stream: true
      });

      for await (const chunk of completion) {
        if (abortControllerRef.current?.signal.aborted) {
          break;
        }

        const delta = chunk.choices[0]?.delta?.content || '';
        if (delta) {
          if (firstTokenTime === null) {
            firstTokenTime = performance.now();
          }
          accumulatedText += delta;
          tokenCount++;

          setSessions(prev => {
            return prev.map(s => {
              if (s.id !== activeSession.id) return s;
              const msgs = [...s.messages];
              const last = msgs[msgs.length - 1];
              if (last && last.role === 'assistant') {
                msgs[msgs.length - 1] = {
                  ...last,
                  content: accumulatedText
                };
              }
              return { ...s, messages: msgs, updatedAt: Date.now() };
            });
          });
        }
      }

      // Finalize metrics
      const endTime = performance.now();
      const durationMs = Math.round(endTime - startTime);
      const ttftMs = firstTokenTime ? Math.round(firstTokenTime - startTime) : 0;
      const tokSec = durationMs > 0 ? parseFloat(((tokenCount / (durationMs / 1000))).toFixed(1)) : 0;

      const finalizedAssistantMsg: ChatMessage = {
        ...initialAssistantMsg,
        content: accumulatedText,
        metrics: {
          tokSec,
          ttftMs,
          totalTokens: tokenCount,
          durationMs
        }
      };

      const finalSession: ChatSession = {
        ...updatedSession,
        messages: [...newMessages.slice(0, -1), finalizedAssistantMsg],
        updatedAt: Date.now()
      };

      setSessions(prev => prev.map(s => s.id === finalSession.id ? finalSession : s));
      await saveSession(finalSession);
    } catch (err: any) {
      console.warn('Generation completed or stopped:', err);
    } finally {
      setIsTyping(false);
      abortControllerRef.current = null;
    }
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    if (engineRef.current) {
      engineRef.current.interruptGenerate();
    }
    setIsTyping(false);
  };

  // If WebGPU is unsupported
  if (status === 'unsupported') {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#0b0d11] text-white p-6 font-sans relative overflow-hidden">
        <div className="max-w-md w-full p-8 border border-white/[0.08] bg-[#12141a]/85 backdrop-blur-2xl rounded-3xl text-center space-y-5 shadow-2xl">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto border border-amber-500/20">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-medium">WebGPU Acceleration Required</h1>
          <p className="text-sm text-white/60 leading-relaxed">
            Local AI runs 100% on your device using hardware-accelerated WebGPU. Your current browser does not support WebGPU or hardware acceleration is disabled.
          </p>
          <div className="p-3 bg-black/40 rounded-2xl text-xs text-white/50 text-left space-y-1 font-mono border border-white/[0.05]">
            <div>• Chrome/Brave/Edge: Settings &rarr; System &rarr; Enable Hardware Acceleration</div>
            <div>• Safari: Settings &rarr; Advanced &rarr; Feature Flags &rarr; WebGPU</div>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-400 hover:to-indigo-400 text-white font-semibold text-xs shadow-lg shadow-blue-500/20 transition-all cursor-pointer active:scale-95"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  // Initial Model Launcher Screen
  if (status === 'initial' || status === 'loading' || status === 'error') {
    const modelObj = MODELS.find(m => m.id === selectedModel) || MODELS[0];
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#0b0d11] text-white p-4 font-sans relative overflow-hidden">
        {/* Ambient radial lighting glow */}
        <div className="absolute w-[600px] h-[600px] bg-gradient-to-tr from-blue-600/10 via-indigo-600/10 to-purple-600/10 blur-[120px] rounded-full pointer-events-none -top-20 -left-20" />
        <div className="absolute w-[400px] h-[400px] bg-gradient-to-tr from-indigo-600/10 to-pink-600/10 blur-[100px] rounded-full pointer-events-none -bottom-20 -right-20" />

        <div className="max-w-md w-full p-7 sm:p-9 border border-white/[0.08] bg-[#12141a]/85 backdrop-blur-2xl rounded-3xl relative overflow-hidden shadow-2xl z-10 space-y-6">
          {/* Header & Network Badge */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-500 via-indigo-500 to-purple-500 p-[1px] shadow-lg shadow-indigo-500/20">
                <div className="w-full h-full rounded-2xl bg-[#0b0d11] flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-[#a8c7fa]" />
                </div>
              </div>
              <div>
                <h1 className="text-xl font-semibold text-white tracking-tight">Local AI</h1>
                <p className="text-xs text-white/50">100% on-device WebGPU intelligence</p>
              </div>
            </div>

            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium border backdrop-blur-md ${
              isOnline 
                ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/40' 
                : 'bg-amber-950/40 text-amber-300 border-amber-800/40'
            }`}>
              {isOnline ? (
                <>
                  <Wifi className="w-3 h-3 text-emerald-400" />
                  <span>Online</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3 h-3 text-amber-400" />
                  <span>Offline Ready</span>
                </>
              )}
            </div>
          </div>

          {/* Model Selection Dropdown */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-white/40 uppercase tracking-wider">
              Select Model
            </label>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              disabled={status === 'loading'}
              className="w-full bg-[#0b0d11]/80 border border-white/[0.08] text-white rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-[#a8c7fa]/50 transition-colors cursor-pointer"
            >
              {MODELS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.sizeLabel || `${m.vramMB} MB`})
                </option>
              ))}
            </select>
            <p className="text-[11px] text-white/40 leading-snug px-1">
              Requires ~{modelObj.vramMB} MB VRAM. Model weights are cached locally for permanent offline execution.
            </p>
          </div>

          {/* Progress / Loading Bar */}
          {status === 'loading' && (
            <div className="space-y-2.5 p-4 rounded-2xl bg-black/40 border border-white/[0.06] animate-in fade-in">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 text-[#a8c7fa] font-medium">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Loading model shaders & weights...</span>
                </span>
              </div>
              <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-blue-500 via-indigo-400 to-[#a8c7fa] rounded-full animate-pulse w-full" />
              </div>
              <p className="text-[11px] font-mono text-white/50 truncate pt-0.5">{progress}</p>
            </div>
          )}

          {/* Error Message */}
          {status === 'error' && (
            <div className="p-4 rounded-2xl bg-rose-950/30 border border-rose-800/40 text-xs text-rose-300 space-y-1">
              <div className="flex items-center gap-1.5 font-medium text-rose-200">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                <span>Initialization Error</span>
              </div>
              <p className="text-white/60 text-[11px]">{errorMsg}</p>
            </div>
          )}

          {/* Launch / Start Button */}
          <div className="space-y-3 pt-1">
            <button
              onClick={() => initEngine(selectedModel)}
              disabled={status === 'loading'}
              className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-400 hover:to-indigo-400 text-white font-semibold text-sm shadow-lg shadow-blue-500/25 transition-all active:scale-[0.99] disabled:opacity-50 cursor-pointer"
            >
              {status === 'loading' ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Loading Engine...</span>
                </>
              ) : isCached ? (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Launch Cached Model</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Download & Launch ({modelObj.vramMB} MB)</span>
                </>
              )}
            </button>

            {/* Offline & Storage Protection Status */}
            <div className="p-3.5 bg-white/[0.02] rounded-2xl border border-white/[0.06] space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-white/80 font-medium">
                  <ShieldCheck className={`w-4 h-4 ${diagnostics.storagePersisted ? 'text-emerald-400' : 'text-amber-400'}`} />
                  <span>Storage Persistence</span>
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded font-mono ${
                  diagnostics.storagePersisted ? 'bg-emerald-500/10 text-emerald-300' : 'bg-amber-500/10 text-amber-300'
                }`}>
                  {diagnostics.storagePersisted ? 'Persistent' : 'Auto'}
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-white/40 pt-0.5">
                <span>{isCached ? 'Model cached locally • 100% offline ready' : 'Downloaded once and saved to cache'}</span>
                {isCached && (
                  <button
                    onClick={handleClearModelCache}
                    className="text-[#f28b82] hover:underline cursor-pointer"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Active Chat UI (Matching Ultra-Premium Dark Glassmorphic Aesthetics)
  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#0b0d11] text-[#e6e8ec] font-sans antialiased relative">
      {/* Sidebar */}
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelectSession={handleSelectSession}
        onNewChat={() => handleCreateNewChat()}
        onDeleteSession={handleDeleteSession}
        onRenameSession={handleRenameSession}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenStorageManager={() => setIsStorageModalOpen(true)}
        diagnostics={diagnostics}
        disabled={isTyping}
      />

      {/* Main Chat Area */}
      <ChatArea
        messages={messages}
        isTyping={isTyping}
        input={input}
        setInput={setInput}
        onSend={handleSend}
        onStop={handleStop}
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        models={MODELS}
        selectedModel={selectedModel}
        onSelectModel={handleModelSelect}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenStorage={() => setIsStorageModalOpen(true)}
        diagnostics={diagnostics}
        isOnline={isOnline}
        isWorkerActive={executionMode === 'worker'}
        preprocessLatex={preprocessLatex}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={aiSettings}
        onSave={async (newSettings) => {
          setAiSettings(newSettings);
          await saveAISettings(newSettings);
        }}
      />

      {/* Storage & Model Cache Manager Modal */}
      <StorageManagerModal
        isOpen={isStorageModalOpen}
        onClose={() => setIsStorageModalOpen(false)}
        diagnostics={diagnostics}
        sessions={sessions}
        onRefreshDiagnostics={runDiagnostics}
        onRequestPersistence={requestPersistentStorage}
        onClearModelCache={handleClearModelCache}
        onReloadSessions={handleReloadSessions}
      />
    </div>
  );
}
