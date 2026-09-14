import React, { useState, useEffect } from 'react';
import {
  Activity,
  X,
  RefreshCw,
  Zap,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Cpu,
  Layers,
  RotateCcw,
  Sliders,
  ShieldAlert,
  Clock,
  Sparkles,
  Info
} from 'lucide-react';
import { VramLiveStats, Diagnostics, ModelInfo } from '../types';

interface VramHealthModalProps {
  isOpen: boolean;
  onClose: () => void;
  vramStats: VramLiveStats | null;
  diagnostics: Diagnostics;
  currentModel: ModelInfo;
  isEngineReady: boolean;
  isLoading: boolean;
  isTyping: boolean;
  executionMode: 'worker' | 'main';
  onRefresh: () => Promise<any>;
  onRunHealthCheck: () => Promise<{ success: boolean; latencyMs: number; error?: string }>;
  onReloadPipeline: () => Promise<void>;
  onUnloadPipeline: () => Promise<void>;
}

export const VramHealthModal: React.FC<VramHealthModalProps> = ({
  isOpen,
  onClose,
  vramStats,
  diagnostics,
  currentModel,
  isEngineReady,
  isLoading,
  isTyping,
  executionMode,
  onRefresh,
  onRunHealthCheck,
  onReloadPipeline,
  onUnloadPipeline
}) => {
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isProbing, setIsProbing] = useState(false);
  const [probeResult, setProbeResult] = useState<{
    success: boolean;
    latencyMs: number;
    error?: string;
    sampleToken?: string;
  } | null>(null);

  // Auto-refresh interval when modal is open
  useEffect(() => {
    if (!isOpen || !autoRefresh) return;
    const interval = setInterval(async () => {
      try {
        await onRefresh();
      } catch {}
    }, 1800);
    return () => clearInterval(interval);
  }, [isOpen, autoRefresh, onRefresh]);

  // Sync probeResult with vramStats healthCheckResult when available
  useEffect(() => {
    if (vramStats?.healthCheckResult) {
      setProbeResult({
        success: vramStats.isHealthy === true,
        latencyMs: vramStats.healthCheckResult.latencyMs,
        error: vramStats.healthCheckResult.error,
        sampleToken: vramStats.healthCheckResult.sampleToken
      });
    }
  }, [vramStats]);

  if (!isOpen) return null;

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setTimeout(() => setIsRefreshing(false), 400);
    }
  };

  const handleRunProbe = async () => {
    if (isProbing || isTyping) return;
    setIsProbing(true);
    try {
      const res = await onRunHealthCheck();
      setProbeResult({
        success: res.success,
        latencyMs: res.latencyMs,
        error: res.error,
        sampleToken: vramStats?.healthCheckResult?.sampleToken
      });
    } catch (err: any) {
      setProbeResult({
        success: false,
        latencyMs: 0,
        error: err?.message || 'Probe execution failed.'
      });
    } finally {
      setIsProbing(false);
    }
  };

  const allocatedMB = vramStats?.allocatedMB || 0;
  const peakMB = vramStats?.peakAllocatedMB || 0;
  const shaderSubmissions = vramStats?.shaderSubmissions || 0;
  const expectedMB = currentModel.vramMB;
  const maxStorageBufferMB = diagnostics.maxStorageBufferMB;

  // Percentage of expected model weight allocated in VRAM
  const vramAllocationRatio = expectedMB > 0 ? (allocatedMB / expectedMB) * 100 : 0;
  const isZeroVramWhenReady = isEngineReady && allocatedMB === 0;
  const isHealthy = vramStats?.isHealthy;

  return (
    <div
      id="vram-health-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-2xl animate-in fade-in duration-200 overflow-y-auto"
      onClick={onClose}
    >
      <div
        id="vram-health-modal"
        className="w-full max-w-xl bg-[#101217] border border-white/[0.12] rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.08] bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-400 flex items-center justify-center">
              <Activity className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white tracking-tight flex items-center gap-2">
                <span>Real-Time VRAM &amp; Model Health</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.06] border border-white/[0.08] text-white/70 font-mono">
                  LIVE
                </span>
              </h2>
              <p className="text-xs text-white/50">
                Track GPU memory allocation &amp; verify model compute responsiveness
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              id="vram-manual-refresh-btn"
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className="p-2 rounded-xl text-white/70 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer disabled:opacity-50"
              title="Refresh VRAM stats"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-blue-400' : ''}`} />
            </button>
            <button
              type="button"
              id="vram-modal-close-btn"
              onClick={onClose}
              className="p-2 rounded-xl text-white/50 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-5 overflow-y-auto max-h-[80vh] text-xs">
          {/* Main VRAM Meter Card */}
          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] space-y-3.5 relative overflow-hidden">
            {/* Top row: Model and Status */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <Cpu className="w-4 h-4 text-white/60 shrink-0" />
                <span className="font-semibold text-white truncate text-sm">
                  {currentModel.name}
                </span>
                <span className="text-[11px] font-mono text-white/40 shrink-0">
                  (~{expectedMB} MB required)
                </span>
              </div>

              {/* Status Badge */}
              <div>
                {isLoading ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-blue-500/15 border border-blue-500/30 text-blue-300">
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    <span>Allocating VRAM...</span>
                  </span>
                ) : isZeroVramWhenReady ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-rose-500/20 border border-rose-500/40 text-rose-300 animate-pulse">
                    <AlertTriangle className="w-3 h-3 text-rose-400" />
                    <span>0 MB VRAM (Needs Reload)</span>
                  </span>
                ) : isEngineReady ? (
                  isHealthy === true ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-500/15 border border-emerald-500/30 text-emerald-300">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      <span>Verified Working</span>
                    </span>
                  ) : isHealthy === false ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-rose-500/20 border border-rose-500/40 text-rose-300">
                      <XCircle className="w-3 h-3 text-rose-400" />
                      <span>Inference Fault</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-500/10 border border-emerald-500/20 text-emerald-300/80">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400/70" />
                      <span>VRAM Allocated</span>
                    </span>
                  )
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-white/[0.06] border border-white/[0.1] text-white/50">
                    <span>Not Loaded in GPU</span>
                  </span>
                )}
              </div>
            </div>

            {/* Big VRAM Numbers */}
            <div className="flex items-baseline justify-between pt-1">
              <div>
                <div className="text-[10px] text-white/40 uppercase tracking-wider font-semibold">
                  Current WebGPU VRAM Allocated
                </div>
                <div className="text-3xl sm:text-4xl font-mono font-bold text-white tracking-tight flex items-baseline gap-2">
                  <span>{allocatedMB.toLocaleString()}</span>
                  <span className="text-sm font-normal text-white/40">MB</span>
                  {peakMB > allocatedMB && (
                    <span className="text-xs font-mono font-normal text-white/40">
                      (peak: {peakMB.toLocaleString()} MB)
                    </span>
                  )}
                </div>
              </div>

              <div className="text-right">
                <div className="text-[10px] text-white/40 uppercase tracking-wider font-semibold">
                  Shader Submissions
                </div>
                <div className="text-xl font-mono font-semibold text-white/90">
                  {shaderSubmissions.toLocaleString()}
                  <span className="text-xs text-white/40 font-normal ml-1">passes</span>
                </div>
              </div>
            </div>

            {/* Visual VRAM Progress Bar */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-[11px] text-white/60">
                <span>GPU Allocation vs Target ({expectedMB} MB)</span>
                <span className="font-mono font-medium">
                  {vramAllocationRatio > 0 ? `${Math.min(100, Math.round(vramAllocationRatio))}%` : '0%'}
                </span>
              </div>
              <div className="h-2.5 w-full bg-white/[0.06] rounded-full overflow-hidden relative">
                <div
                  className={`h-full transition-all duration-500 rounded-full ${
                    isZeroVramWhenReady
                      ? 'bg-rose-500'
                      : isHealthy === false
                        ? 'bg-amber-500'
                        : allocatedMB > 0
                          ? 'bg-gradient-to-r from-blue-500 via-indigo-400 to-emerald-400'
                          : 'bg-white/20'
                  }`}
                  style={{
                    width: `${Math.min(100, Math.max(isEngineReady && allocatedMB > 0 ? 8 : 0, vramAllocationRatio))}%`
                  }}
                />
              </div>
            </div>

            {/* Discrepancy or Warning Alert Banner */}
            {isZeroVramWhenReady && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-2.5 text-rose-200">
                <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div className="space-y-1 text-xs">
                  <span className="font-semibold text-rose-100">Discrepancy Detected!</span>
                  <p className="text-[11px] text-rose-200/80 leading-relaxed">
                    The model was reported as loaded, but WebGPU reports 0 MB allocated in VRAM. The GPU context may have dropped or shader initialization stalled. Click <strong>"Reload WebGPU Pipeline"</strong> below to re-allocate into VRAM.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Active Health Check / Probe Section */}
          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.08] space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="font-semibold text-white flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-amber-400" />
                  <span>Active Model Health Probe</span>
                </div>
                <p className="text-[11px] text-white/50">
                  Sends an immediate 1-token test through WebGPU to confirm tensor execution &amp; compute response
                </p>
              </div>

              <button
                type="button"
                id="run-health-probe-btn"
                onClick={handleRunProbe}
                disabled={!isEngineReady || isProbing || isTyping}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 cursor-pointer transition-all active:scale-95 disabled:opacity-40 disabled:pointer-events-none ${
                  isHealthy === true
                    ? 'bg-emerald-500/20 text-emerald-200 hover:bg-emerald-500/30 border border-emerald-500/30'
                    : 'bg-white/10 hover:bg-white/15 text-white border border-white/20'
                }`}
              >
                {isProbing ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-400" />
                    <span>Probing GPU...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-3.5 h-3.5 text-amber-300" />
                    <span>{isHealthy === true ? 'Re-Test Probe' : 'Run Health Probe'}</span>
                  </>
                )}
              </button>
            </div>

            {/* Probe Results Display */}
            {probeResult && (
              <div
                className={`p-3 rounded-xl border text-xs space-y-1.5 animate-in fade-in duration-150 ${
                  probeResult.success
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-200'
                }`}
              >
                <div className="flex items-center justify-between font-medium">
                  <div className="flex items-center gap-1.5">
                    {probeResult.success ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span className="text-emerald-100 font-semibold">Model Responding Normally</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-4 h-4 text-rose-400" />
                        <span className="text-rose-100 font-semibold">Model Not Responding</span>
                      </>
                    )}
                  </div>
                  {probeResult.latencyMs > 0 && (
                    <span className="font-mono text-[11px] opacity-80 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {probeResult.latencyMs} ms latency
                    </span>
                  )}
                </div>

                {probeResult.success ? (
                  <p className="text-[11px] text-emerald-200/80">
                    WebGPU compute shaders, weight buffers, and sampling loops are fully verified and active.
                  </p>
                ) : (
                  <div className="space-y-2">
                    <p className="text-[11px] text-rose-200/80">
                      {probeResult.error || 'The model did not return output. WebGPU device may be lost or out of memory.'}
                    </p>
                    <button
                      type="button"
                      id="vram-probe-reload-btn"
                      onClick={async () => {
                        onClose();
                        await onReloadPipeline();
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-500/40 text-xs font-medium cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Reload WebGPU Pipeline</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Quick explanation when untested */}
            {!probeResult && isEngineReady && (
              <div className="flex items-center gap-1.5 text-[11px] text-white/40">
                <Info className="w-3.5 h-3.5 shrink-0" />
                <span>Click "Run Health Probe" anytime to send a 1-token test to verify GPU execution.</span>
              </div>
            )}
          </div>

          {/* WebGPU Hardware & Execution Diagnostics */}
          <div className="space-y-2">
            <div className="text-[10px] text-white/40 uppercase tracking-wider font-semibold px-1">
              WebGPU &amp; Device Environment
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-1">
                <span className="text-[10px] text-white/40 uppercase font-mono">Adapter</span>
                <p className="text-white font-medium truncate" title={diagnostics.adapterName || 'Default Adapter'}>
                  {diagnostics.adapterName || 'WebGPU High-Perf Adapter'}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-1">
                <span className="text-[10px] text-white/40 uppercase font-mono">Execution Thread</span>
                <p className="text-white font-medium capitalize">
                  {executionMode === 'worker' ? 'Web Worker (Background)' : 'Main Thread'}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-1">
                <span className="text-[10px] text-white/40 uppercase font-mono">Max Storage Buffer</span>
                <p className="text-white font-medium font-mono">
                  {maxStorageBufferMB ? `${maxStorageBufferMB.toLocaleString()} MB` : 'Dynamic limit'}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-1">
                <span className="text-[10px] text-white/40 uppercase font-mono">Shader FP16</span>
                <p className="text-white font-medium">
                  {diagnostics.supportsFp16 ? 'Supported (Fast)' : 'Emulated 32-bit'}
                </p>
              </div>
            </div>
          </div>

          {/* Quick Troubleshooting Actions */}
          <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <span className="font-medium text-white text-xs">Need a fresh start?</span>
              <p className="text-[11px] text-white/40">
                Reload the WebGPU pipeline from cache, or unload it entirely to free up VRAM for other apps.
              </p>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={async () => {
                  onClose();
                  await onUnloadPipeline();
                }}
                disabled={isLoading || !isEngineReady}
                className="flex-1 sm:flex-none px-3 py-2 rounded-xl glass-button text-xs text-white/80 hover:text-white flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>Unload</span>
              </button>
              <button
                type="button"
                id="vram-force-reload-btn"
                onClick={async () => {
                  onClose();
                  await onReloadPipeline();
                }}
                disabled={isLoading}
                className="flex-1 sm:flex-none px-3 py-2 rounded-xl glass-button text-xs text-white/80 hover:text-white flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reload</span>
              </button>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-white/[0.08] bg-white/[0.02] flex items-center justify-between text-[11px] text-white/40">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              id="vram-auto-refresh-toggle"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded accent-blue-500 cursor-pointer"
            />
            <span>Auto-refresh every 1.8s</span>
          </label>

          <span>
            {vramStats?.lastPolledAt
              ? `Updated ${new Date(vramStats.lastPolledAt).toLocaleTimeString()}`
              : 'Polling active'}
          </span>
        </div>
      </div>
    </div>
  );
};
