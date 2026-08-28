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
  ShieldCheck, 
  Wifi, 
  WifiOff, 
  Loader2, 
  Zap,
  CheckCircle2,
  Clock,
  Layers,
  HardDrive
} from 'lucide-react';
import MLCWorker from './worker.ts?worker&inline';
import { AVAILABLE_MODELS, registerCustomModels } from './modelsConfig';
import { ChatMessage, ChatSession, Diagnostics, ModelInfo, AISettings, DetailedProgress } from './types';
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

const MODELS: ModelInfo[] = AVAILABLE_MODELS;

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

function parseProgressTelemetry(report: InitProgressReport, modelVram: number): DetailedProgress {
  const text = report.text || '';
  const progressPercent = Math.min(100, Math.max(0, Math.round((report.progress || 0) * 100)));
  const timeElapsed = Math.max(0, Math.round(report.timeElapsed || 0));

  let stage: DetailedProgress['stage'] = 'initializing';
  if (text.includes('Fetching param cache')) {
    stage = 'downloading';
  } else if (text.includes('Loading model from cache')) {
    stage = 'loading_vram';
  } else if (text.toLowerCase().includes('wasm') || text.toLowerCase().includes('shader') || text.toLowerCase().includes('pipeline')) {
    stage = 'compiling';
  } else if (text.includes('Finish') || progressPercent >= 100) {
    stage = 'ready';
  }

  let currentShard = 0;
  let totalShards = 0;
  const shardMatch = text.match(/\[(\d+)\/(\d+)\]/);
  if (shardMatch) {
    currentShard = parseInt(shardMatch[1], 10);
    totalShards = parseInt(shardMatch[2], 10);
  }

  let mbProcessed = 0;
  const mbMatch = text.match(/(\d+)\s*MB\s*(?:fetched|loaded)/i);
  if (mbMatch) {
    mbProcessed = parseInt(mbMatch[1], 10);
  } else if (report.progress > 0) {
    mbProcessed = Math.round(report.progress * (modelVram || 2600));
  }

  const totalEstimatedMB = modelVram || 2600;

  let speedMBs = 0;
  if (timeElapsed > 0 && mbProcessed > 0) {
    speedMBs = Math.round((mbProcessed / timeElapsed) * 10) / 10;
  }

  let etaSeconds: number | null = null;
  if (progressPercent > 0 && progressPercent < 100 && speedMBs > 0) {
    const remainingMB = Math.max(0, totalEstimatedMB - mbProcessed);
    etaSeconds = Math.max(1, Math.round(remainingMB / speedMBs));
  } else if (totalShards > 0 && currentShard > 0 && timeElapsed > 0 && currentShard < totalShards) {
    const remainingShards = totalShards - currentShard;
    const shardsPerSec = currentShard / timeElapsed;
    if (shardsPerSec > 0) {
      etaSeconds = Math.max(1, Math.round(remainingShards / shardsPerSec));
    }
  }

  return {
    rawText: text,
    progressPercent,
    stage,
    currentShard,
    totalShards,
    mbProcessed,
    totalEstimatedMB,
    speedMBs,
    timeElapsed,
    etaSeconds
  };
}

export default function App() {
  const engineRef = useRef<WebWorkerMLCEngine | MLCEngine | null>(null);
  const [status, setStatus] = useState<'initial' | 'unsupported' | 'loading' | 'ready' | 'error'>('initial');
  const [progress, setProgress] = useState<string>('');
  const [detailedProgress, setDetailedProgress] = useState<DetailedProgress>({
    rawText: '',
    progressPercent: 0,
    stage: 'initializing',
    currentShard: 0,
    totalShards: 0,
    mbProcessed: 0,
    totalEstimatedMB: 2600,
    speedMBs: 0,
    timeElapsed: 0,
    etaSeconds: null
  });
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
    let vendor = '';
    let supportsFp16 = false;
    let maxStorageBufferMB: number | null = null;
    let maxBufferSizeMB: number | null = null;

    if (webGpuSupported) {
      try {
        const adapter = await (navigator as any).gpu.requestAdapter({ powerPreference: 'high-performance' });
        adapterOk = !!adapter;
        if (adapter) {
          const info = await (adapter as any).requestAdapterInfo?.();
          name = info?.description || info?.device || 'WebGPU High-Performance Adapter';
          vendor = info?.vendor || '';
          supportsFp16 = adapter.features?.has?.('shader-f16') || false;
          if (adapter.limits) {
            maxStorageBufferMB = Math.round((adapter.limits.maxStorageBufferBindingSize || 0) / (1024 * 1024));
            maxBufferSizeMB = Math.round((adapter.limits.maxBufferSize || 0) / (1024 * 1024));
          }
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
      gpuVendor: vendor,
      supportsFp16,
      maxStorageBufferMB,
      maxBufferSizeMB,
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

  // Model Engine Lifecycle with Telemetry and KV-Cache Overrides
  const initEngine = async (modelToLoad: string = selectedModel, forceMode?: 'worker' | 'main') => {
    const chosenMode = forceMode || executionMode;
    const modelObj = MODELS.find(m => m.id === modelToLoad) || MODELS[0];
    
    setStatus('loading');
    setProgress('Initializing WebGPU hardware acceleration...');
    setDetailedProgress({
      rawText: 'Initializing WebGPU hardware acceleration...',
      progressPercent: 2,
      stage: 'initializing',
      currentShard: 0,
      totalShards: 0,
      mbProcessed: 0,
      totalEstimatedMB: modelObj.vramMB,
      speedMBs: 0,
      timeElapsed: 0,
      etaSeconds: null
    });
    setErrorMsg('');

    // Ensure persistent storage is requested
    try {
      await requestPersistentStorage();
    } catch {}

    try {
      if (engineRef.current) {
        await engineRef.current.unload();
        engineRef.current = null;
      }

      const initProgressCallback = (report: InitProgressReport) => {
        setProgress(report.text);
        const parsed = parseProgressTelemetry(report, modelObj.vramMB);
        setDetailedProgress(parsed);
      };

      const chatOptions = {
        context_window_size: aiSettings.contextWindowSize || 3072
      };

      if (chosenMode === 'worker') {
        try {
          const workerInstance = new MLCWorker();
          const engine = await CreateWebWorkerMLCEngine(
            workerInstance,
            modelToLoad,
            { 
              initProgressCallback,
              appConfig: prebuiltAppConfig,
              logLevel: 'INFO'
            },
            chatOptions
          );
          engineRef.current = engine;
        } catch (workerErr: any) {
          console.warn('Worker initialization failed, fallback to main thread:', workerErr);
          setExecutionMode('main');
          const engine = await CreateMLCEngine(
            modelToLoad,
            {
              initProgressCallback,
              appConfig: prebuiltAppConfig,
              logLevel: 'INFO'
            },
            chatOptions
          );
          engineRef.current = engine;
        }
      } else {
        const engine = await CreateMLCEngine(
          modelToLoad,
          {
            initProgressCallback,
            appConfig: prebuiltAppConfig,
            logLevel: 'INFO'
          },
          chatOptions
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
  };

  // Hardware Unsupported Fallback Screen
  if (status === 'unsupported') {
    return (
      <div className="fixed inset-0 flex h-full w-full items-center justify-center bg-[#0b0d11] text-white p-6 font-sans">
        <div className="max-w-md w-full p-8 border border-white/[0.08] bg-[#12141a]/90 backdrop-blur-2xl rounded-3xl text-center space-y-6 shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center mx-auto">
            <Cpu className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-semibold tracking-tight">WebGPU Acceleration Required</h1>
            <p className="text-sm text-white/60 leading-relaxed">
              Your browser or graphics driver does not currently have WebGPU active. WebGPU is needed to execute model weights natively in local VRAM with zero cloud servers.
            </p>
          </div>
          <div className="p-4 bg-white/[0.03] rounded-2xl border border-white/[0.06] text-xs text-left text-white/70 space-y-2 font-mono">
            <div className="font-semibold text-white/90 font-sans">How to enable WebGPU:</div>
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

  // Initial Model Launcher & High-Performance Telemetry Loading Screen
  if (status === 'initial' || status === 'loading' || status === 'error') {
    const modelObj = MODELS.find(m => m.id === selectedModel) || MODELS[0];
    return (
      <div className="fixed inset-0 flex h-full w-full items-center justify-center bg-[#0b0d11] text-white p-4 font-sans overflow-hidden">
        {/* Ambient radial lighting glow */}
        <div className="absolute w-[600px] h-[600px] bg-gradient-to-tr from-blue-600/10 via-indigo-600/10 to-purple-600/10 blur-[120px] rounded-full pointer-events-none -top-20 -left-20" />
        <div className="absolute w-[400px] h-[400px] bg-gradient-to-tr from-indigo-600/10 to-pink-600/10 blur-[100px] rounded-full pointer-events-none -bottom-20 -right-20" />

        <div className="max-w-lg w-full p-6 sm:p-8 border border-white/[0.08] bg-[#12141a]/85 backdrop-blur-2xl rounded-3xl relative overflow-hidden shadow-2xl z-10 space-y-5">
          {/* Header & Network Badge */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-500 via-indigo-500 to-purple-500 p-[1px] shadow-lg shadow-indigo-500/20">
                <div className="w-full h-full rounded-2xl bg-[#0b0d11] flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-[#a8c7fa]" />
                </div>
              </div>
              <div>
                <h1 className="text-lg font-semibold text-white tracking-tight">Local AI WebGPU</h1>
                <p className="text-xs text-white/50">High-performance on-device intelligence</p>
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

          {/* Model Selection Dropdown & Info */}
          <div className="space-y-2.5">
            <label className="block text-xs font-semibold text-white/40 uppercase tracking-wider">
              Selected LLM Architecture (&lt; 3GB VRAM)
            </label>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              disabled={status === 'loading'}
              className="w-full bg-[#0b0d11]/80 border border-white/[0.08] text-white rounded-2xl px-4 py-3 text-xs sm:text-sm focus:outline-none focus:border-[#a8c7fa]/50 transition-colors cursor-pointer"
            >
              {MODELS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.sizeLabel || `${m.vramMB} MB`})
                </option>
              ))}
            </select>

            {modelObj.description && (
              <p className="text-[11px] text-white/50 leading-relaxed px-1">
                {modelObj.description}
              </p>
            )}
          </div>

          {/* Hardware Acceleration & Context Window Selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-white/40 uppercase tracking-wider">
                Acceleration Profile (KV-Cache)
              </span>
              <span className="text-[11px] text-[#a8c7fa]">
                {aiSettings.contextWindowSize || 3072} Tokens
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { size: 2048, label: '⚡ Turbo (2K)', hint: '35% Faster' },
                { size: 3072, label: '⚖️ Balanced', hint: 'Default 3K' },
                { size: 4096, label: '🧠 Deep (4K)', hint: 'Full Length' }
              ].map((opt) => {
                const active = (aiSettings.contextWindowSize || 3072) === opt.size;
                return (
                  <button
                    key={opt.size}
                    disabled={status === 'loading'}
                    onClick={() => {
                      const updated = { ...aiSettings, contextWindowSize: opt.size };
                      setAiSettings(updated);
                      saveAISettings(updated);
                    }}
                    className={`py-2 px-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                      active
                        ? 'bg-blue-500/20 border-[#a8c7fa]/60 text-white font-medium shadow-sm'
                        : 'bg-white/[0.02] border-white/[0.06] text-white/50 hover:text-white/80'
                    }`}
                  >
                    <div className="text-xs">{opt.label}</div>
                    <div className="text-[9px] text-white/40">{opt.hint}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Detailed Loading Dashboard */}
          {status === 'loading' && (
            <div className="space-y-3.5 p-4 rounded-2xl bg-black/50 border border-white/[0.08] shadow-inner animate-in fade-in">
              {/* Top Progress bar and Percentage */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-medium">
                  <span className="flex items-center gap-2 text-[#a8c7fa]">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>
                      {detailedProgress.stage === 'downloading' && 'Fetching Model Parameter Shards...'}
                      {detailedProgress.stage === 'loading_vram' && 'Streaming into WebGPU VRAM...'}
                      {detailedProgress.stage === 'compiling' && 'Compiling Shaders & KV Pipeline...'}
                      {detailedProgress.stage === 'ready' && 'Model Ready! Launching...'}
                      {detailedProgress.stage === 'initializing' && 'Initializing WebGPU Hardware...'}
                    </span>
                  </span>
                  <span className="font-mono text-white text-xs font-semibold">
                    {detailedProgress.progressPercent}%
                  </span>
                </div>

                <div className="w-full h-2.5 bg-white/10 rounded-full overflow-hidden relative">
                  <div 
                    className="h-full bg-gradient-to-r from-blue-500 via-indigo-400 to-[#a8c7fa] rounded-full transition-all duration-300 relative shadow-lg shadow-blue-500/50"
                    style={{ width: `${Math.max(3, detailedProgress.progressPercent)}%` }}
                  >
                    <div className="absolute inset-0 bg-white/20 animate-pulse" />
                  </div>
                </div>
              </div>

              {/* 4-Tile Telemetry Metric Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                <div className="p-2 rounded-xl bg-white/[0.03] border border-white/[0.05] text-center">
                  <div className="text-[10px] text-white/40 uppercase font-mono">Speed</div>
                  <div className="text-xs font-semibold text-emerald-300 font-mono">
                    {detailedProgress.speedMBs > 0 ? `${detailedProgress.speedMBs} MB/s` : 'VRAM Stream'}
                  </div>
                </div>

                <div className="p-2 rounded-xl bg-white/[0.03] border border-white/[0.05] text-center">
                  <div className="text-[10px] text-white/40 uppercase font-mono">ETA</div>
                  <div className="text-xs font-semibold text-amber-300 font-mono">
                    {detailedProgress.etaSeconds ? `~${detailedProgress.etaSeconds}s` : `${detailedProgress.timeElapsed}s elapsed`}
                  </div>
                </div>

                <div className="p-2 rounded-xl bg-white/[0.03] border border-white/[0.05] text-center">
                  <div className="text-[10px] text-white/40 uppercase font-mono">Shards</div>
                  <div className="text-xs font-semibold text-white/90 font-mono">
                    {detailedProgress.totalShards > 0 
                      ? `${detailedProgress.currentShard}/${detailedProgress.totalShards}`
                      : 'Syncing'}
                  </div>
                </div>

                <div className="p-2 rounded-xl bg-white/[0.03] border border-white/[0.05] text-center">
                  <div className="text-[10px] text-white/40 uppercase font-mono">Processed</div>
                  <div className="text-xs font-semibold text-indigo-300 font-mono">
                    {detailedProgress.mbProcessed > 0 ? `${detailedProgress.mbProcessed} MB` : `${detailedProgress.progressPercent}%`}
                  </div>
                </div>
              </div>

              {/* Raw Telemetry Text */}
              <p className="text-[11px] font-mono text-white/40 truncate leading-none pt-0.5">
                {detailedProgress.rawText || progress}
              </p>
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
                  <span>Accelerating WebGPU Pipeline...</span>
                </>
              ) : isCached ? (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Launch Cached Model (Instant VRAM)</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Download & Launch ({modelObj.vramMB} MB)</span>
                </>
              )}
            </button>

            {/* Quick Instant Test Option */}
            {status !== 'loading' && selectedModel !== 'SmolLM2-135M-Instruct-q0f16-MLC' && (
              <button
                onClick={() => {
                  setSelectedModel('SmolLM2-135M-Instruct-q0f16-MLC');
                  initEngine('SmolLM2-135M-Instruct-q0f16-MLC');
                }}
                className="w-full py-2 px-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] text-white/70 hover:text-white text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>Instant 2-Second WebGPU Test (SmolLM2 135M • 150MB)</span>
              </button>
            )}

            {/* Offline & Hardware Protection Status */}
            <div className="p-3 bg-white/[0.02] rounded-2xl border border-white/[0.06] space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-white/80 font-medium">
                  <ShieldCheck className={`w-3.5 h-3.5 ${diagnostics.storagePersisted ? 'text-emerald-400' : 'text-amber-400'}`} />
                  <span>Storage Persistence</span>
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded font-mono ${
                  diagnostics.storagePersisted ? 'bg-emerald-500/10 text-emerald-300' : 'bg-amber-500/10 text-amber-300'
                }`}>
                  {diagnostics.storagePersisted ? 'Persistent' : 'Auto Cache'}
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-white/40 pt-0.5">
                <span>{isCached ? 'Model cached locally • 100% offline ready' : 'Downloaded once and saved to cache'}</span>
                {isCached && (
                  <button
                    onClick={handleClearModelCache}
                    className="text-[#f28b82] hover:underline cursor-pointer"
                  >
                    Clear Cache
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
    <div className="fixed inset-0 flex h-full w-full overflow-hidden bg-[#0b0d11] text-[#e6e8ec] font-sans antialiased">
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
