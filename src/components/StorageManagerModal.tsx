import React, { useState, useRef } from 'react';
import { 
  X, 
  HardDrive, 
  ShieldCheck, 
  ShieldAlert, 
  Download, 
  Upload, 
  Trash2, 
  RefreshCw, 
  Check, 
  AlertTriangle,
  Database,
  Cpu
} from 'lucide-react';
import { Diagnostics, ChatSession } from '../types';
import { exportChatsAsJSON, importChatsFromJSON, clearAllSessions, saveAllSessions } from '../storage';

interface StorageManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  diagnostics: Diagnostics;
  sessions: ChatSession[];
  onRefreshDiagnostics: () => Promise<void>;
  onRequestPersistence: () => Promise<boolean>;
  onClearModelCache: () => Promise<void>;
  onReloadSessions: () => Promise<void>;
}

export const StorageManagerModal: React.FC<StorageManagerModalProps> = ({
  isOpen,
  onClose,
  diagnostics,
  sessions,
  onRefreshDiagnostics,
  onRequestPersistence,
  onClearModelCache,
  onReloadSessions
}) => {
  const [isPersisting, setIsPersisting] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handlePersist = async () => {
    setIsPersisting(true);
    try {
      const granted = await onRequestPersistence();
      await onRefreshDiagnostics();
      if (granted) {
        setStatusMsg({ type: 'success', text: 'Persistent storage granted! Browser eviction protection is active.' });
      } else {
        setStatusMsg({ type: 'info', text: 'Browser did not grant persistence automatically, but cache remains active.' });
      }
    } catch {
      setStatusMsg({ type: 'error', text: 'Could not request persistence API.' });
    } finally {
      setIsPersisting(false);
    }
  };

  const handleExport = () => {
    try {
      exportChatsAsJSON(sessions);
      setStatusMsg({ type: 'success', text: `Exported ${sessions.length} conversations to JSON successfully.` });
    } catch (e: any) {
      setStatusMsg({ type: 'error', text: `Export failed: ${e.message}` });
    }
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const imported = importChatsFromJSON(text);
      if (imported.length === 0) {
        throw new Error('No valid conversations found in file');
      }
      // Merge with existing or replace
      await saveAllSessions(imported);
      await onReloadSessions();
      setStatusMsg({ type: 'success', text: `Successfully imported ${imported.length} conversations!` });
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: `Import error: ${err.message}` });
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleClearModels = async () => {
    if (!window.confirm('Are you sure you want to clear cached model weights? The model will need to be downloaded again on next use.')) {
      return;
    }
    setIsClearing(true);
    try {
      await onClearModelCache();
      await onRefreshDiagnostics();
      setStatusMsg({ type: 'success', text: 'Local model cache cleared successfully.' });
    } catch (e: any) {
      setStatusMsg({ type: 'error', text: `Failed to clear cache: ${e.message}` });
    } finally {
      setIsClearing(false);
    }
  };

  const handleClearAllChats = async () => {
    if (!window.confirm('Are you sure you want to delete ALL conversations? This cannot be undone.')) {
      return;
    }
    try {
      await clearAllSessions();
      await onReloadSessions();
      setStatusMsg({ type: 'success', text: 'All chat history cleared from IndexedDB.' });
    } catch (e: any) {
      setStatusMsg({ type: 'error', text: `Failed to clear chats: ${e.message}` });
    }
  };

  const usedMB = diagnostics.storageUsageMB || 0;
  const quotaMB = diagnostics.storageQuotaMB || 0;
  const percentUsed = quotaMB > 0 ? Math.min(100, Math.round((usedMB / quotaMB) * 100)) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-150">
      <div className="w-full max-w-xl bg-[#12141a]/95 border border-white/[0.08] rounded-3xl shadow-2xl backdrop-blur-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/[0.06] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
              <HardDrive className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-medium text-white">Storage & Offline Persistence</h2>
              <p className="text-xs text-white/50">Manage local IndexedDB database, model weights, and quotas</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm text-white/80">
          {/* Status feedback banner */}
          {statusMsg && (
            <div className={`p-3 rounded-2xl border text-xs flex items-center justify-between ${
              statusMsg.type === 'success' ? 'bg-emerald-950/40 border-emerald-800/40 text-emerald-300' :
              statusMsg.type === 'error' ? 'bg-rose-950/40 border-rose-800/40 text-rose-300' :
              'bg-blue-950/40 border-blue-800/40 text-blue-300'
            }`}>
              <span>{statusMsg.text}</span>
              <button onClick={() => setStatusMsg(null)} className="opacity-60 hover:opacity-100 ml-2">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Storage Quota Breakdown Card */}
          <div className="p-4 rounded-2xl bg-[#0b0d11]/80 border border-white/[0.06] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-white/40 uppercase tracking-wider">
                Storage Utilization
              </span>
              <span className="font-mono text-xs text-[#a8c7fa]">
                {usedMB > 1024 ? `${(usedMB / 1024).toFixed(2)} GB` : `${usedMB} MB`} used
                {quotaMB > 0 && ` / ${(quotaMB / 1024).toFixed(0)} GB quota`}
              </span>
            </div>

            {/* Progress bar */}
            <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 via-indigo-400 to-[#a8c7fa] transition-all duration-500 rounded-full"
                style={{ width: `${Math.max(3, percentUsed)}%` }}
              />
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1 text-xs text-white/60">
              <div className="flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-white/40" />
                <span>Conversations: {sessions.length} stored</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-white/40" />
                <span>Engine: WebLLM Cache</span>
              </div>
            </div>
          </div>

          {/* Persistence & Eviction Protection */}
          <div className="p-4 rounded-2xl bg-[#0b0d11]/80 border border-white/[0.06] flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2 font-medium text-xs text-white">
                {diagnostics.storagePersisted ? (
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                ) : (
                  <ShieldAlert className="w-4 h-4 text-amber-400" />
                )}
                <span>Browser Eviction Protection</span>
              </div>
              <p className="text-[11px] text-white/40 max-w-sm">
                {diagnostics.storagePersisted
                  ? 'Guaranteed persistent mode. The browser will never delete your cached model weights or chats.'
                  : 'Currently auto-managed. Enable persistence to prevent the browser from automatically clearing cached models.'}
              </p>
            </div>

            {!diagnostics.storagePersisted && (
              <button
                onClick={handlePersist}
                disabled={isPersisting}
                className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-400 hover:to-indigo-400 text-white text-xs font-semibold shadow-sm transition-all cursor-pointer disabled:opacity-50 active:scale-95"
              >
                {isPersisting ? 'Enabling...' : 'Enable'}
              </button>
            )}
          </div>

          {/* Backup & Restore (JSON) */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-white/40 uppercase tracking-wider">
              Backup & Export
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleExport}
                className="flex items-center justify-center gap-2 p-3 rounded-2xl bg-white/[0.02] hover:bg-white/[0.06] border border-white/[0.06] text-xs text-white/90 font-medium transition-colors cursor-pointer active:scale-[0.98]"
              >
                <Download className="w-4 h-4 text-[#a8c7fa]" />
                <span>Export Chats (JSON)</span>
              </button>

              <label className="flex items-center justify-center gap-2 p-3 rounded-2xl bg-white/[0.02] hover:bg-white/[0.06] border border-white/[0.06] text-xs text-white/90 font-medium transition-colors cursor-pointer active:scale-[0.98]">
                <Upload className="w-4 h-4 text-[#c58af9]" />
                <span>Import Backup</span>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".json"
                  onChange={handleImportFile}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="space-y-2 pt-2">
            <label className="block text-xs font-semibold text-rose-400/80 uppercase tracking-wider">
              Maintenance & Cleanup
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleClearModels}
                disabled={isClearing}
                className="flex items-center justify-center gap-2 p-3 rounded-2xl bg-rose-950/20 hover:bg-rose-950/40 border border-rose-800/30 text-xs text-rose-300 transition-colors cursor-pointer disabled:opacity-50 active:scale-[0.98]"
              >
                <Trash2 className="w-4 h-4" />
                <span>{isClearing ? 'Clearing...' : 'Clear Model Weights'}</span>
              </button>

              <button
                onClick={handleClearAllChats}
                className="flex items-center justify-center gap-2 p-3 rounded-2xl bg-rose-950/20 hover:bg-rose-950/40 border border-rose-800/30 text-xs text-rose-300 transition-colors cursor-pointer active:scale-[0.98]"
              >
                <Trash2 className="w-4 h-4" />
                <span>Clear All Chats</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-[#0e1015]/80 border-t border-white/[0.06] flex items-center justify-between">
          <span className="text-[11px] text-white/40">
            Service Worker: {diagnostics.serviceWorkerActive ? 'Active (Offline Ready)' : 'Active'}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.09] text-white text-xs font-medium border border-white/[0.08] transition-colors cursor-pointer active:scale-95"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
