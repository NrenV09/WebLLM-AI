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
  HardDrive,
  ArrowRight,
  XCircle
} from 'lucide-react';
import MLCWorker from './worker.ts?worker&inline';
import { AVAILABLE_MODELS, registerCustomModels } from './modelsConfig';
import { ChatMessage, ChatSession, Diagnostics, ModelInfo, AISettings, DetailedProgress, VramLiveStats } from './types';
import { downloadModelParameters, checkModelParamProgress } from './lib/modelDownloader';
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
import { ModelSetupView } from './components/ModelSetupView';
import { LocalModelImporterModal } from './components/LocalModelImporterModal';
import { InfoGuideModal } from './components/InfoGuideModal';
import { PdfExportModal } from './components/PdfExportModal';
import { VramHealthModal } from './components/VramHealthModal';
import { buildPrunedChatHistory, detectTextRepetition, trimRepetitionLoop } from './utils/chatHelpers';

registerCustomModels(prebuiltAppConfig);

const MODELS: ModelInfo[] = AVAILABLE_MODELS;

// Helper to normalize LaTeX expressions for KaTeX
function preprocessLatex(content: string): string {
  if (!content) return '';
  let processed = content
    .replace(/\\\[([\s\S]*?)\\\]/g, (_, math) => `\n$$\n${math.trim()}\n$$\n`)
    .replace(/\\\(([\s\S]*?)\\\)/g, (_, math) => `$${math.trim()}$`)
    .replace(/\\\[/g, '$$')
    .replace(/\\\]/g, '$$')
    .replace(/\\\(/g, '$')
    .replace(/\\\)/g, '$');
    
  // Convert non-standard \box to \boxed for KaTeX
  processed = processed.replace(/\\box\{/g, '\\boxed{');
  
  return processed;
}

function parseProgressTelemetry(report: InitProgressReport, modelVram: number): DetailedProgress {
  const text = report.text || '';
  const progressPercent = Math.min(100, Math.max(0, Math.round((report.progress || 0) * 100)));
  const timeElapsed = Math.max(0, Math.round(report.timeElapsed || 0));

  let stage: DetailedProgress['stage'] = 'initializing';
  const lower = text.toLowerCase();
  if (lower.includes('fetching param') || lower.includes('param cache') || lower.includes('download')) {
    stage = 'downloading';
  } else if (lower.includes('loading model from cache') || lower.includes('loading model')) {
    stage = 'loading_vram';
  } else if (lower.includes('wasm') || lower.includes('shader') || lower.includes('pipeline') || lower.includes('compil')) {
    stage = 'compiling';
  } else if (lower.includes('finish') || progressPercent >= 100) {
    stage = 'ready';
  }

  let currentShard = 0;
  let totalShards = 0;
  const shardMatch = text.match(/\[(\d+)\/(\d+)\]/);
  if (shardMatch) {
    currentShard = parseInt(shardMatch[1], 10);
    totalShards = parseInt(shardMatch[2], 10);
  }

  const totalEstimatedMB = modelVram || 2600;

  let mbProcessed = 0;
  const mbMatch = text.match(/(\d+)\s*MB\s*(?:fetched|loaded|downloaded)/i);
  if (mbMatch) {
    mbProcessed = parseInt(mbMatch[1], 10);
  } else if (report.progress > 0) {
    mbProcessed = Math.round(report.progress * totalEstimatedMB);
  }

  // Calculate percentage of parameters downloaded
  let paramsPercent = 0;
  if (stage === 'ready' || stage === 'compiling' || stage === 'loading_vram') {
    // Parameter shards have already been fully downloaded to local disk/cache
    paramsPercent = 100;
  } else if (stage === 'downloading') {
    // Try explicit percentage string from WebLLM report (e.g. "14% completed")
    const textPercentMatch = text.match(/(\d+(?:\.\d+)?)\s*%\s*(?:completed|fetched|downloaded)?/i);
    if (textPercentMatch) {
      paramsPercent = Math.min(100, Math.max(0, Math.round(parseFloat(textPercentMatch[1]))));
    } else if (totalShards > 0 && currentShard >= 0) {
      paramsPercent = Math.min(100, Math.round((currentShard / totalShards) * 100));
    } else if (mbProcessed > 0 && totalEstimatedMB > 0) {
      paramsPercent = Math.min(100, Math.round((mbProcessed / totalEstimatedMB) * 100));
    } else {
      paramsPercent = progressPercent;
    }
  } else {
    // Initializing
    paramsPercent = 0;
  }

  let speedMBs = 0;
  if (timeElapsed > 0 && mbProcessed > 0) {
    speedMBs = Math.round((mbProcessed / timeElapsed) * 10) / 10;
  }

  let etaSeconds: number | null = null;
  if (paramsPercent > 0 && paramsPercent < 100 && speedMBs > 0) {
    const remainingMB = Math.max(0, totalEstimatedMB - mbProcessed);
    etaSeconds = Math.max(1, Math.round(remainingMB / speedMBs));
  } else if (totalShards > 0 && currentShard > 0 && timeElapsed > 0 && currentShard < totalShards) {
    const remainingShards = totalShards - currentShard;
    const shardsPerSec = currentShard / timeElapsed;
    if (shardsPerSec > 0) {
      etaSeconds = Math.max(1, Math.round(remainingShards / shardsPerSec));
    }
  }

  const step: 1 | 2 = (stage === 'loading_vram' || stage === 'compiling' || stage === 'ready') ? 2 : 1;
  const stepName = step === 1 ? 'Download Parameters' : 'Configure WebGPU Pipeline';

  return {
    rawText: text,
    progressPercent,
    paramsPercent,
    stage,
    currentShard,
    totalShards,
    mbProcessed,
    totalEstimatedMB,
    speedMBs,
    timeElapsed,
    etaSeconds,
    step,
    stepName
  };
}

export default function App() {
  const engineRef = useRef<WebWorkerMLCEngine | MLCEngine | null>(null);
  const [status, setStatus] = useState<'initial' | 'unsupported' | 'loading' | 'ready' | 'error'>('initial');
  const [progress, setProgress] = useState<string>('');
  const [detailedProgress, setDetailedProgress] = useState<DetailedProgress>({
    rawText: '',
    progressPercent: 0,
    paramsPercent: 0,
    stage: 'initializing',
    currentShard: 0,
    totalShards: 0,
    mbProcessed: 0,
    totalEstimatedMB: 2600,
    speedMBs: 0,
    timeElapsed: 0,
    etaSeconds: null,
    step: 1,
    stepName: 'Download Parameters'
  });
  const [errorMsg, setErrorMsg] = useState('');
  const [registeredModels, setRegisteredModels] = useState<ModelInfo[]>(MODELS);
  const [selectedModel, setSelectedModel] = useState(MODELS[0].id);
  const [isCached, setIsCached] = useState(false);
  const [executionMode, setExecutionMode] = useState<'worker' | 'main'>('worker');

  // Multi-chat state
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>('');

  // Modals & view state
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isStorageModalOpen, setIsStorageModalOpen] = useState(false);
  const [isLocalModelImporterOpen, setIsLocalModelImporterOpen] = useState(false);
  const [isInfoGuideOpen, setIsInfoGuideOpen] = useState(false);
  const [sessionToExportPdf, setSessionToExportPdf] = useState<ChatSession | null>(null);
  const [isVramModalOpen, setIsVramModalOpen] = useState(false);
  const [vramStats, setVramStats] = useState<VramLiveStats | null>(null);
  const [showConfigView, setShowConfigView] = useState(false);
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
  const [paramStatus, setParamStatus] = useState<{
    isComplete: boolean;
    percent: number;
    cachedShards: number;
    totalShards: number;
    cachedBytes: number;
  }>({ isComplete: false, percent: 0, cachedShards: 0, totalShards: 0, cachedBytes: 0 });
  const initAbortControllerRef = useRef<AbortController | null>(null);

  // Inactivity tracking
  const lastActivityRef = useRef<number>(Date.now());
  const inactivityTimerRef = useRef<any>(null);

  // Unload WebGPU pipeline completely
  const handleUnloadPipeline = async () => {
    if (engineRef.current) {
      try {
        await engineRef.current.unload();
      } catch (e) {
        console.warn('Error unloading engine:', e);
      }
      engineRef.current = null;
    }
    if (initAbortControllerRef.current) {
      initAbortControllerRef.current.abort();
      initAbortControllerRef.current = null;
    }
    setStatus('initial');
    setIsCached(false);
    setVramStats(null);
  };

  useEffect(() => {
    // Check for inactivity every minute
    inactivityTimerRef.current = setInterval(() => {
      const now = Date.now();
      const idleTimeMs = now - lastActivityRef.current;
      // 15 minutes = 15 * 60 * 1000 = 900000 ms
      if (idleTimeMs > 900000 && engineRef.current && status === 'ready' && !isTyping) {
        console.log('Unloading model due to 15 minutes of inactivity.');
        handleUnloadPipeline();
      }
    }, 60000);
    
    const updateActivity = () => { lastActivityRef.current = Date.now(); };
    window.addEventListener('mousemove', updateActivity);
    window.addEventListener('keydown', updateActivity);
    window.addEventListener('click', updateActivity);
    window.addEventListener('touchstart', updateActivity);

    return () => {
      clearInterval(inactivityTimerRef.current);
      window.removeEventListener('mousemove', updateActivity);
      window.removeEventListener('keydown', updateActivity);
      window.removeEventListener('click', updateActivity);
      window.removeEventListener('touchstart', updateActivity);
    };
  }, [status, isTyping]);

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

  // Check model cache status & parameter download progress
  useEffect(() => {
    checkModelParamProgress(selectedModel).then(res => {
      setParamStatus(res);
      setIsCached(res.isComplete);
    }).catch(() => {
      hasModelInCache(selectedModel, prebuiltAppConfig).then(cached => {
        setIsCached(cached);
        setParamStatus({ isComplete: cached, percent: cached ? 100 : 0, cachedShards: 0, totalShards: 0, cachedBytes: 0 });
      }).catch(() => setIsCached(false));
    });
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

  const cancelInit = () => {
    if (initAbortControllerRef.current) {
      initAbortControllerRef.current.abort();
      initAbortControllerRef.current = null;
    }
    setStatus('initial');
    setProgress('');
  };

  const handleDownloadParamsOnly = async (modelToLoad: string = selectedModel) => {
    const modelObj = MODELS.find(m => m.id === modelToLoad) || MODELS[0];
    setStatus('loading');
    setProgress('Step 1 of 2: Downloading model parameters...');
    initAbortControllerRef.current = new AbortController();

    try {
      await requestPersistentStorage();
    } catch {}

    try {
      await downloadModelParameters(
        modelToLoad,
        (telemetry) => {
          setDetailedProgress(telemetry);
          setProgress(telemetry.rawText);
        },
        initAbortControllerRef.current.signal
      );
      setIsCached(true);
      const res = await checkModelParamProgress(modelToLoad);
      setParamStatus(res);
      setStatus('initial');
      setProgress('Parameters 100% downloaded and stored in browser cache! Ready to configure WebGPU pipeline.');
      await runDiagnostics();
    } catch (err: any) {
      if (err.message?.includes('aborted') || initAbortControllerRef.current?.signal.aborted) {
        setStatus('initial');
        return;
      }
      setStatus('error');
      setErrorMsg(err.message || 'Failed to download model parameters');
    }
  };

  // Model Engine Lifecycle with Sequential Two-Phase Execution:
  // Phase 1: Download parameters first (into CacheStorage)
  // Phase 2: Configure WebGPU pipeline (stream into VRAM, compile shaders & KV cache)
  const initEngine = async (modelToLoad: string = selectedModel, forceMode?: 'worker' | 'main') => {
    const chosenMode = forceMode || executionMode;
    const modelObj = MODELS.find(m => m.id === modelToLoad) || MODELS[0];
    initAbortControllerRef.current = new AbortController();
    
    setStatus('loading');
    setErrorMsg('');

    // Ensure persistent storage is requested
    try {
      await requestPersistentStorage();
    } catch {}

    try {
      // Step 1: Check if parameters are already cached
      const cacheStatus = await checkModelParamProgress(modelToLoad);
      const alreadyCached = cacheStatus.isComplete || await hasModelInCache(modelToLoad, prebuiltAppConfig).catch(() => false);

      if (!alreadyCached) {
        // Explicit Phase 1: Download parameters first
        setProgress('Step 1 of 2: Downloading model parameters...');
        setDetailedProgress({
          rawText: 'Step 1 of 2: Initializing parameter download stream...',
          progressPercent: cacheStatus.percent || 0,
          paramsPercent: cacheStatus.percent || 0,
          stage: 'downloading',
          currentShard: cacheStatus.cachedShards || 0,
          totalShards: cacheStatus.totalShards || 0,
          mbProcessed: Math.round((cacheStatus.cachedBytes || 0) / (1024 * 1024)),
          totalEstimatedMB: modelObj.vramMB,
          speedMBs: 0,
          timeElapsed: 0,
          etaSeconds: null,
          step: 1,
          stepName: 'Download Parameters'
        });

        await downloadModelParameters(
          modelToLoad,
          (telemetry) => {
            setDetailedProgress(telemetry);
            setProgress(telemetry.rawText);
          },
          initAbortControllerRef.current.signal
        );

        setIsCached(true);
        const updatedStatus = await checkModelParamProgress(modelToLoad);
        setParamStatus(updatedStatus);
      }

      // Explicit Phase 2: Now configure the WebGPU pipeline
      setProgress('Step 2 of 2: Configuring WebGPU pipeline and streaming into VRAM...');
      setDetailedProgress(prev => ({
        ...prev,
        rawText: 'Step 2 of 2: Parameters downloaded (100%). Streaming into WebGPU VRAM & compiling pipeline...',
        progressPercent: 5,
        paramsPercent: 100,
        stage: 'loading_vram',
        step: 2,
        stepName: 'Configure WebGPU Pipeline'
      }));

      if (engineRef.current) {
        await engineRef.current.unload();
        engineRef.current = null;
      }

      const initProgressCallback = (report: InitProgressReport) => {
        setProgress(report.text);
        const parsed = parseProgressTelemetry(report, modelObj.vramMB);
        setDetailedProgress({
          ...parsed,
          paramsPercent: 100,
          step: 2,
          stepName: 'Configure WebGPU Pipeline'
        });
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
      // Read initial VRAM stats immediately
      await fetchVramStats();
    } catch (err: any) {
      if (err.message?.includes('aborted') || initAbortControllerRef.current?.signal.aborted) {
        setStatus('initial');
        return;
      }
      console.error('Model initialization error:', err);
      setStatus('error');
      setErrorMsg(err.message || 'Failed to initialize WebGPU engine');
    }
  };

  // Real-time VRAM & memory telemetry query
  const fetchVramStats = async (): Promise<VramLiveStats | null> => {
    const currentModelObj = registeredModels.find(m => m.id === selectedModel) || MODELS[0];

    if (!engineRef.current) {
      const unloadedStats: VramLiveStats = {
        allocatedMB: 0,
        peakAllocatedMB: 0,
        shaderSubmissions: 0,
        expectedModelVramMB: currentModelObj.vramMB,
        maxStorageBufferMB: diagnostics.maxStorageBufferMB || null,
        lastPolledAt: Date.now(),
        status: status === 'loading' ? 'loading' : 'unloaded',
        isHealthy: null
      };
      setVramStats(unloadedStats);
      return unloadedStats;
    }

    try {
      const statsText = await engineRef.current.runtimeStatsText();
      let peakMB = 0;
      let allMB = 0;
      let submissions = 0;

      if (statsText) {
        const peakMatch = statsText.match(/peak-memory=(\d+)/);
        if (peakMatch) peakMB = parseInt(peakMatch[1], 10);

        const allMatch = statsText.match(/all-memory=(\d+)/);
        if (allMatch) allMB = parseInt(allMatch[1], 10);

        const shaderMatch = statsText.match(/shader-submissions=(\d+)/);
        if (shaderMatch) submissions = parseInt(shaderMatch[1], 10);
      }

      const updatedStats: VramLiveStats = {
        allocatedMB: allMB,
        peakAllocatedMB: Math.max(peakMB, allMB),
        shaderSubmissions: submissions,
        expectedModelVramMB: currentModelObj.vramMB,
        maxStorageBufferMB: diagnostics.maxStorageBufferMB || null,
        lastPolledAt: Date.now(),
        status: status === 'ready' ? 'ready' : (status === 'loading' ? 'loading' : 'unloaded'),
        isHealthy: vramStats?.isHealthy ?? (allMB > 0 ? null : false),
        healthCheckResult: vramStats?.healthCheckResult
      };

      setVramStats(updatedStats);
      return updatedStats;
    } catch (err) {
      console.warn('Could not fetch runtimeStatsText:', err);
      return null;
    }
  };

  // Active test probe to verify that the loaded model actually responds and WebGPU compute shaders execute
  const runModelHealthCheck = async (): Promise<{ success: boolean; latencyMs: number; error?: string }> => {
    if (!engineRef.current) {
      return { success: false, latencyMs: 0, error: 'Model engine is not initialized in WebGPU.' };
    }

    const start = performance.now();
    try {
      const probePromise = engineRef.current.chat.completions.create({
        messages: [{ role: 'user', content: 'Ping' }],
        max_tokens: 1,
        temperature: 0.1,
        stream: false
      });

      let timeoutId: any;
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error('Inference probe timed out after 10 seconds. WebGPU pipeline may be frozen or dropped.')), 10000);
      });

      const response = (await Promise.race([probePromise, timeoutPromise])) as any;
      clearTimeout(timeoutId);
      const latencyMs = Math.round(performance.now() - start);
      const token = response?.choices?.[0]?.message?.content || 'OK';

      // Re-read live VRAM to show updated shader passes
      let peakMB = 0;
      let allMB = 0;
      let submissions = 0;
      try {
        const statsText = await engineRef.current.runtimeStatsText();
        if (statsText) {
          const peakMatch = statsText.match(/peak-memory=(\d+)/);
          if (peakMatch) peakMB = parseInt(peakMatch[1], 10);
          const allMatch = statsText.match(/all-memory=(\d+)/);
          if (allMatch) allMB = parseInt(allMatch[1], 10);
          const shaderMatch = statsText.match(/shader-submissions=(\d+)/);
          if (shaderMatch) submissions = parseInt(shaderMatch[1], 10);
        }
      } catch {}

      const currentModelObj = registeredModels.find(m => m.id === selectedModel) || MODELS[0];
      const verifiedStats: VramLiveStats = {
        allocatedMB: allMB,
        peakAllocatedMB: Math.max(peakMB, allMB),
        shaderSubmissions: submissions,
        expectedModelVramMB: currentModelObj.vramMB,
        maxStorageBufferMB: diagnostics.maxStorageBufferMB || null,
        lastPolledAt: Date.now(),
        status: 'ready',
        isHealthy: true,
        healthCheckResult: {
          latencyMs,
          testedAt: Date.now(),
          sampleToken: token
        }
      };

      setVramStats(verifiedStats);
      return { success: true, latencyMs };
    } catch (err: any) {
      const latencyMs = Math.round(performance.now() - start);
      const errMsg = err?.message || 'WebGPU compute execution failure';

      const currentModelObj = registeredModels.find(m => m.id === selectedModel) || MODELS[0];
      setVramStats(prev => ({
        ...(prev || {
          allocatedMB: 0,
          peakAllocatedMB: 0,
          shaderSubmissions: 0,
          expectedModelVramMB: currentModelObj.vramMB,
          maxStorageBufferMB: diagnostics.maxStorageBufferMB || null,
          lastPolledAt: Date.now(),
          status: 'error'
        }),
        isHealthy: false,
        healthCheckResult: {
          latencyMs,
          testedAt: Date.now(),
          error: errMsg
        }
      }));

      return { success: false, latencyMs, error: errMsg };
    }
  };

  // Force reload WebGPU pipeline (re-allocates VRAM cleanly from browser cache)
  const handleReloadPipeline = async () => {
    if (engineRef.current) {
      try {
        await engineRef.current.unload();
      } catch {}
      engineRef.current = null;
    }
    await initEngine(selectedModel);
  };

  // Periodic background VRAM telemetry polling
  useEffect(() => {
    if (status !== 'ready' && !isVramModalOpen) return;
    const interval = setInterval(() => {
      fetchVramStats().catch(() => {});
    }, isVramModalOpen ? 1800 : 4000);
    return () => clearInterval(interval);
  }, [status, isVramModalOpen, selectedModel]);

  // Model Selection
  const handleModelSelect = (modelId: string) => {
    setSelectedModel(modelId);
    if (status === 'ready' && engineRef.current) {
      initEngine(modelId);
    }
  };

  // Clear Model Cache
  const handleClearModelCache = async () => {
    // 0. Use official WebLLM cleanup for all registered models
    try {
      const { deleteModelAllInfoInCache } = await import('@mlc-ai/web-llm');
      for (const model of registeredModels) {
        await deleteModelAllInfoInCache(model.id).catch(() => {});
      }
    } catch(e) {
      console.warn('WebLLM official cleanup failed:', e);
    }

    // 1. Clear Cache API (Standard)
    if (typeof window !== 'undefined' && 'caches' in window) {
      try {
        const keys = await caches.keys();
        for (const k of keys) {
          if (k.includes('webllm') || k.includes('tvmjs') || k.includes('mlc') || k.includes('huggingface') || k.includes('model')) {
            await caches.delete(k);
          }
        }
      } catch (e) {
        console.warn('Cache API clear error:', e);
      }
    }

    // 2. Clear IndexedDB caches unconditionally (Safari/Fallback compatibility)
    if (typeof window !== 'undefined' && 'indexedDB' in window) {
      const knownIDBs = ['webllm/model', 'webllm/config', 'webllm/wasm', 'webllm/chatConfig', 'tvmjs'];
      for (const dbName of knownIDBs) {
        try { indexedDB.deleteDatabase(dbName); } catch(e) {}
      }
      
      // Also try dynamic iteration if supported
      try {
        if (indexedDB.databases) {
          const dbs = await indexedDB.databases();
          for (const db of dbs) {
            if (db.name && (db.name.includes('webllm') || db.name.includes('tvmjs') || db.name.includes('mlc'))) {
              if (db.name !== 'local_webllm_chat_db') {
                indexedDB.deleteDatabase(db.name);
              }
            }
          }
        }
      } catch (e) {
        console.warn('Dynamic IDB clear error:', e);
      }
    }

    // 3. Clear OPFS caches (High Performance Backend)
    if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.getDirectory) {
      try {
        const root = await navigator.storage.getDirectory();
        await root.removeEntry("tvmjs-opfs-store", { recursive: true }).catch(() => {});
      } catch (e) {
        console.warn('OPFS clear error:', e);
      }
    }

    setIsCached(false);
    setParamStatus({ isComplete: false, percent: 0, cachedShards: 0, totalShards: 0, cachedBytes: 0 });
    
    // Give browser storage manager a moment to garbage collect before measuring
    await new Promise(resolve => setTimeout(resolve, 1500));
    await runDiagnostics();
  };

  // Send Message / Generation Handler
  const handleSend = async (customPrompt?: string) => {
    const textToSend = (customPrompt || input).trim();
    if (!textToSend || isTyping) return;

    // If engine is not ready, initialize first
    if (status !== 'ready' || !engineRef.current) {
      try {
        await initEngine(selectedModel);
      } catch (e) {
        console.error('Failed to auto-init engine:', e);
        return;
      }
      if (!engineRef.current) return;
    }

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

    const isPhiModel = selectedModel.toLowerCase().includes('phi');
    const isNemotronModel = selectedModel.toLowerCase().includes('nemotron');

    // Context & System prompt handling for Nemotron Dual Reasoning Mode
    let effectiveSystemPrompt = aiSettings.systemPrompt;
    if (isNemotronModel) {
      if (aiSettings.reasoningMode !== false) {
        if (!effectiveSystemPrompt.includes('<think>')) {
          effectiveSystemPrompt += '\n\nReasoning Mode Active: Analyze problems step-by-step and enclose your intermediate thinking inside <think>...</think> tags before giving the final answer.';
        }
      } else {
        effectiveSystemPrompt += '\n\nDirect Response Mode: Provide an immediate, concise answer without producing reasoning traces or <think> tags.';
      }
    }

    const defaultContext = isNemotronModel ? 131072 : 3072;
    // Build pruned chat context for model with sliding window budget
    const chatHistory = buildPrunedChatHistory(
      effectiveSystemPrompt,
      newMessages.slice(0, -1),
      aiSettings.contextWindowSize || defaultContext,
      aiSettings.max_tokens || 4096
    );

    abortControllerRef.current = new AbortController();
    const startTime = performance.now();
    let firstTokenTime: number | null = null;
    let tokenCount = 0;
    let accumulatedText = '';

    const repetitionPenalty = (aiSettings.phi4AntiLooping !== false || isPhiModel)
      ? Math.max(aiSettings.repetition_penalty || 1.08, 1.18)
      : (aiSettings.repetition_penalty || 1.08);

    try {
      const completion = await engineRef.current.chat.completions.create({
        messages: chatHistory as any,
        temperature: aiSettings.temperature,
        top_p: aiSettings.top_p,
        repetition_penalty: repetitionPenalty,
        max_tokens: aiSettings.max_tokens || 4096,
        stop: [
          "<|endoftext|>",
          "<|end|>",
          "<|im_end|>",
          "<|system|>",
          "<|user|>",
          "<|assistant|>",
          "<|end_of_turn|>",
          "<|eot_id|>",
          "<extra_id_0>",
          "<extra_id_1>",
          "<|thought_end|>"
        ],
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

          // Phi-4 Mini Repetition Loop Guard
          if (aiSettings.phi4AntiLooping !== false && detectTextRepetition(accumulatedText)) {
            accumulatedText = trimRepetitionLoop(accumulatedText);
            try {
              await engineRef.current.interruptGenerate();
            } catch {}
            break;
          }

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
      // If no text was accumulated, clean up the empty assistant message so chat doesn't get corrupted
      if (!accumulatedText.trim()) {
        const cleanedSession: ChatSession = {
          ...updatedSession,
          messages: newMessages.filter(m => m !== initialAssistantMsg),
          updatedAt: Date.now()
        };
        setSessions(prev => prev.map(s => s.id === cleanedSession.id ? cleanedSession : s));
        await saveSession(cleanedSession);
      }
      // Reset engine KV-cache to avoid corruption on next prompt
      try {
        await engineRef.current?.resetChat();
      } catch {}
    } finally {
      setIsTyping(false);
      abortControllerRef.current = null;
      fetchVramStats().catch(() => {});
    }
  };

  // Delete Individual Message
  const handleDeleteMessage = async (messageId: string) => {
    if (!activeSession) return;
    const updatedMessages = activeSession.messages.filter(m => m.id !== messageId);
    
    const updatedSession: ChatSession = {
      ...activeSession,
      messages: updatedMessages,
      updatedAt: Date.now()
    };

    setSessions(prev => prev.map(s => s.id === updatedSession.id ? updatedSession : s));
    await saveSession(updatedSession);

    // Optionally reset chat cache so the deleted message is no longer in KV-cache
    if (engineRef.current) {
      try {
        await engineRef.current.resetChat();
      } catch (e) {
        console.warn('resetChat error during message deletion:', e);
      }
    }
  };

  const handleStop = async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    if (engineRef.current) {
      try {
        await engineRef.current.interruptGenerate();
      } catch (e) {
        console.warn('interruptGenerate error:', e);
      }
      try {
        await engineRef.current.resetChat();
      } catch (e) {
        console.warn('resetChat error:', e);
      }
    }
    setIsTyping(false);
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

  // Unified Liquid Glass Layout: Sidebar is ALWAYS accessible so user can navigate chats, settings, storage, and models
  return (
    <div className="fixed inset-0 flex h-full w-full overflow-hidden bg-black text-[#e6e8ec] font-sans antialiased select-none">
      {/* Sidebar is ALWAYS available */}
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelectSession={(id) => {
          handleSelectSession(id);
          setShowConfigView(false);
        }}
        onNewChat={() => {
          handleCreateNewChat();
          setShowConfigView(false);
        }}
        onDeleteSession={handleDeleteSession}
        onRenameSession={handleRenameSession}
        onExportPdf={(session) => setSessionToExportPdf(session)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenStorageManager={() => setIsStorageModalOpen(true)}
        onOpenLocalModelImporter={() => setIsLocalModelImporterOpen(true)}
        onOpenVramMonitor={() => setIsVramModalOpen(true)}
        vramStats={vramStats}
        diagnostics={diagnostics}
        disabled={isTyping}
      />

      {/* Main View Area: Either ModelSetupView or ChatArea */}
      {showConfigView ? (
        <ModelSetupView
          models={registeredModels}
          selectedModel={selectedModel}
          onSelectModel={handleModelSelect}
          status={status}
          onInitEngine={initEngine}
          onCancelInit={cancelInit}
          progress={progress}
          detailedProgress={detailedProgress}
          errorMsg={errorMsg}
          isCached={isCached}
          aiSettings={aiSettings}
          onUpdateAISettings={async (s) => {
            setAiSettings(s);
            await saveAISettings(s);
          }}
          onOpenLocalModelImporter={() => setIsLocalModelImporterOpen(true)}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onOpenVramMonitor={() => setIsVramModalOpen(true)}
          vramStats={vramStats}
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          isSidebarOpen={isSidebarOpen}
          hasPastMessages={messages.length > 0}
          onViewMessages={() => setShowConfigView(false)}
        />
      ) : (
        <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0 relative">
          {/* Subtle Liquid Glass Status Capsule if model is not yet loaded into VRAM */}
          {status !== 'ready' && (
            <div className="bg-black/90 backdrop-blur-2xl border-b border-white/[0.08] px-3 sm:px-4 py-2 flex items-center justify-between text-xs z-30">
              <div className="flex items-center gap-2 text-white/70">
                {status === 'loading' ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                    <span>
                      {detailedProgress.step === 1
                        ? `Downloading Parameters (${detailedProgress.paramsPercent}%)`
                        : `Compiling Shaders (${detailedProgress.progressPercent}%)`}
                    </span>
                  </>
                ) : status === 'error' ? (
                  <>
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                    <span className="text-rose-300">Model not active in WebGPU memory</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 text-white/60" />
                    <span>Model not loaded into WebGPU VRAM</span>
                  </>
                )}
              </div>

              <div className="flex items-center gap-2">
                {status === 'loading' ? (
                  <button
                    type="button"
                    onClick={cancelInit}
                    className="text-rose-400 hover:text-rose-300 px-2 py-1 rounded-lg bg-rose-500/10 cursor-pointer"
                  >
                    Cancel
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => initEngine(selectedModel)}
                    className="glass-button px-2.5 py-1 rounded-lg text-white font-medium cursor-pointer"
                  >
                    {status === 'error' ? 'Retry Load' : 'Load Model'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowConfigView(true)}
                  className="text-white/50 hover:text-white px-2 py-1 cursor-pointer"
                >
                  Configure
                </button>
              </div>
            </div>
          )}

          <ChatArea
            messages={messages}
            isTyping={isTyping}
            input={input}
            setInput={setInput}
            onSend={handleSend}
            onStop={handleStop}
            isSidebarOpen={isSidebarOpen}
            onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
            models={registeredModels}
            selectedModel={selectedModel}
            onSelectModel={handleModelSelect}
            onOpenSettings={() => setIsSettingsOpen(true)}
            onOpenStorage={() => setIsStorageModalOpen(true)}
            onOpenInfoGuide={() => setIsInfoGuideOpen(true)}
            onOpenVramMonitor={() => setIsVramModalOpen(true)}
            vramStats={vramStats}
            diagnostics={diagnostics}
            isOnline={isOnline}
            isWorkerActive={executionMode === 'worker'}
            preprocessLatex={preprocessLatex}
            status={status}
            isModelLoaded={status === 'ready'}
            onLoadModel={() => initEngine(selectedModel)}
            onDeleteMessage={handleDeleteMessage}
          />
        </div>
      )}

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
        vramStats={vramStats}
        onOpenVramMonitor={() => setIsVramModalOpen(true)}
        onRefreshDiagnostics={runDiagnostics}
        onRequestPersistence={requestPersistentStorage}
        onClearModelCache={handleClearModelCache}
        onReloadSessions={handleReloadSessions}
      />

      {/* Local Model Importer Modal (From Files & Local Storage) */}
      <LocalModelImporterModal
        isOpen={isLocalModelImporterOpen}
        onClose={() => setIsLocalModelImporterOpen(false)}
        onModelImported={(newModel) => {
          setRegisteredModels(prev => [newModel, ...prev]);
          setSelectedModel(newModel.id);
          setIsLocalModelImporterOpen(false);
          setShowConfigView(true);
        }}
      />

      {/* Info & Functionality Guide Modal */}
      <InfoGuideModal
        isOpen={isInfoGuideOpen}
        onClose={() => setIsInfoGuideOpen(false)}
      />

      {/* PDF Export Modal with LaTeX Rendering */}
      <PdfExportModal
        isOpen={!!sessionToExportPdf}
        onClose={() => setSessionToExportPdf(null)}
        session={sessionToExportPdf}
        preprocessLatex={preprocessLatex}
      />

      {/* Real-Time VRAM & Model Health Diagnostics Modal */}
      <VramHealthModal
        isOpen={isVramModalOpen}
        onClose={() => setIsVramModalOpen(false)}
        vramStats={vramStats}
        diagnostics={diagnostics}
        currentModel={registeredModels.find(m => m.id === selectedModel) || MODELS[0]}
        isEngineReady={status === 'ready'}
        isLoading={status === 'loading'}
        isTyping={isTyping}
        executionMode={executionMode}
        onRefresh={fetchVramStats}
        onRunHealthCheck={runModelHealthCheck}
        onReloadPipeline={handleReloadPipeline}
        onUnloadPipeline={handleUnloadPipeline}
      />
    </div>
  );
}
