import React, { useState, useMemo, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  MessageSquare, 
  Trash2, 
  Edit3, 
  Check, 
  X, 
  Settings, 
  HardDrive, 
  ShieldCheck, 
  Download, 
  Upload, 
  PanelLeftClose, 
  Sparkles,
  Database,
  MoreVertical,
  FileDown,
  Activity
} from 'lucide-react';
import { ChatSession, Diagnostics, VramLiveStats } from '../types';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: ChatSession[];
  activeSessionId: string;
  onSelectSession: (id: string) => void;
  onNewChat: () => void;
  onDeleteSession: (id: string) => void;
  onRenameSession: (id: string, newTitle: string) => void;
  onExportPdf: (session: ChatSession) => void;
  onOpenSettings: () => void;
  onOpenStorageManager: () => void;
  onOpenLocalModelImporter?: () => void;
  onOpenVramMonitor?: () => void;
  vramStats?: VramLiveStats | null;
  diagnostics: Diagnostics;
  disabled: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  sessions,
  activeSessionId,
  onSelectSession,
  onNewChat,
  onDeleteSession,
  onRenameSession,
  onExportPdf,
  onOpenSettings,
  onOpenStorageManager,
  onOpenLocalModelImporter,
  onOpenVramMonitor,
  vramStats,
  diagnostics,
  disabled
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [sessionToDelete, setSessionToDelete] = useState<ChatSession | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    session: ChatSession;
    x: number;
    y: number;
  } | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (contextMenu) setContextMenu(null);
        if (sessionToDelete) setSessionToDelete(null);
      }
    };
    const handleDismiss = () => {
      if (contextMenu) setContextMenu(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('click', handleDismiss);
    window.addEventListener('scroll', handleDismiss, true);
    window.addEventListener('resize', handleDismiss);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('click', handleDismiss);
      window.removeEventListener('scroll', handleDismiss, true);
      window.removeEventListener('resize', handleDismiss);
    };
  }, [contextMenu, sessionToDelete]);

  // Group conversations by date
  const groupedSessions = useMemo(() => {
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    const startOfToday = new Date().setHours(0, 0, 0, 0);
    const startOfYesterday = startOfToday - oneDay;
    const startOf7Days = startOfToday - 7 * oneDay;
    const startOf30Days = startOfToday - 30 * oneDay;

    const filtered = sessions.filter(s => 
      s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.messages.some(m => m.content.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const groups: { [key: string]: ChatSession[] } = {
      Today: [],
      Yesterday: [],
      'Previous 7 Days': [],
      'Previous 30 Days': [],
      Older: []
    };

    filtered.forEach(session => {
      const time = session.updatedAt || session.createdAt;
      if (time >= startOfToday) {
        groups.Today.push(session);
      } else if (time >= startOfYesterday) {
        groups.Yesterday.push(session);
      } else if (time >= startOf7Days) {
        groups['Previous 7 Days'].push(session);
      } else if (time >= startOf30Days) {
        groups['Previous 30 Days'].push(session);
      } else {
        groups.Older.push(session);
      }
    });

    return Object.entries(groups).filter(([_, items]) => items.length > 0);
  }, [sessions, searchQuery]);

  const handleStartRename = (session: ChatSession, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingId(session.id);
    setEditTitle(session.title);
  };

  const handleSaveRename = (sessionId: string, e?: React.MouseEvent | React.FormEvent) => {
    if (e) e.stopPropagation();
    if (editTitle.trim()) {
      onRenameSession(sessionId, editTitle.trim());
    }
    setEditingId(null);
  };

  const handleCancelRename = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(null);
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-30 md:hidden animate-in fade-in duration-200"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`
          fixed md:relative inset-y-0 left-0 h-full flex-shrink-0 transition-all duration-300 ease-in-out border-r border-white/[0.08] bg-black/95 backdrop-blur-3xl flex flex-col justify-between z-40 md:z-20
          ${isOpen ? 'w-64 opacity-100 translate-x-0' : 'w-0 opacity-0 -translate-x-full md:translate-x-0 overflow-hidden border-none pointer-events-none'}
        `}
      >
        <div className="w-64 h-full flex flex-col justify-between overflow-hidden">
          {/* Sidebar Top: Header, New Chat, Search */}
          <div className="p-3.5 space-y-3 shrink-0 overflow-hidden">
            <div className="flex items-center justify-between px-1 overflow-hidden">
              <div className="flex items-center gap-2 text-white font-medium text-sm min-w-0 overflow-hidden">
                <div className="w-7 h-7 rounded-xl bg-white/[0.06] border border-white/[0.12] flex items-center justify-center shrink-0">
                  <Sparkles className="w-3.5 h-3.5 text-white/80" />
                </div>
                <span className="tracking-tight text-sm font-semibold text-white truncate">Conversations</span>
              </div>

              <button
                onClick={onClose}
                className="p-1.5 rounded-xl text-white/50 hover:text-white glass-button md:hidden shrink-0 cursor-pointer"
                title="Close sidebar"
              >
                <PanelLeftClose className="w-4 h-4" />
              </button>
            </div>

            {/* + New Chat Glass Button */}
            <button
              onClick={onNewChat}
              disabled={disabled}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-2xl glass-button text-white text-xs font-medium cursor-pointer disabled:opacity-50 active:scale-[0.98] overflow-hidden whitespace-nowrap"
            >
              <Plus className="w-4 h-4 text-white shrink-0" />
              <span className="truncate">New Chat</span>
            </button>

            {/* Search Conversations Bar */}
            <div className="relative overflow-hidden">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search..."
                className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl pl-9 pr-7 py-1.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-white/30 transition-colors whitespace-nowrap overflow-hidden"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Conversation List / Groupings */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-1 space-y-4 min-h-0">
            {groupedSessions.length === 0 ? (
              <div className="text-center py-8 text-xs text-white/30 whitespace-nowrap overflow-hidden">
                {searchQuery ? 'No chats matching search' : 'No chats yet'}
              </div>
            ) : (
              groupedSessions.map(([category, items]) => (
                <div key={category} className="space-y-1 overflow-hidden">
                  <div className="px-3 py-1 text-[11px] font-medium text-white/40 uppercase tracking-wider whitespace-nowrap overflow-hidden text-ellipsis">
                    {category}
                  </div>
                  {items.map((session) => {
                    const isActive = session.id === activeSessionId;
                    const isEditing = session.id === editingId;

                    return (
                      <div
                        key={session.id}
                        id={`chat-session-item-${session.id}`}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setContextMenu({
                            session,
                            x: e.clientX,
                            y: e.clientY
                          });
                        }}
                        onClick={() => {
                          if (!isEditing && !disabled) onSelectSession(session.id);
                        }}
                        title={isEditing ? undefined : session.title}
                        className={`
                          group relative flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-all duration-200 cursor-pointer overflow-hidden select-none
                          ${isActive 
                            ? 'bg-white/[0.08] text-white font-medium border border-white/[0.08] shadow-xs' 
                            : 'text-white/70 hover:bg-white/[0.04] hover:text-white border border-transparent'
                          }
                        `}
                      >
                        {isActive && (
                          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[60%] bg-blue-400 rounded-r-full" />
                        )}
                        {isEditing ? (
                          <div className="flex items-center gap-1 w-full overflow-hidden" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="text"
                              value={editTitle}
                              onChange={(e) => setEditTitle(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveRename(session.id, e);
                                if (e.key === 'Escape') setEditingId(null);
                              }}
                              autoFocus
                              className="flex-1 min-w-0 bg-black/40 text-white px-2 py-1 rounded border border-[#a8c7fa]/50 text-xs focus:outline-none"
                            />
                            <button
                              onClick={(e) => handleSaveRename(session.id, e)}
                              className="p-1 text-emerald-400 hover:bg-emerald-500/20 rounded shrink-0 cursor-pointer"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={handleCancelRename}
                              className="p-1 text-white/40 hover:bg-white/10 rounded shrink-0 cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center gap-2.5 truncate flex-1 min-w-0 pr-1 overflow-hidden">
                              <MessageSquare className="w-3.5 h-3.5 shrink-0 opacity-60" />
                              <span className="truncate whitespace-nowrap">{session.title}</span>
                            </div>

                            {/* Dropdown 3-dots icon button */}
                            <div className="flex items-center gap-0.5 shrink-0">
                              <button
                                type="button"
                                id={`chat-dropdown-btn-${session.id}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const rect = e.currentTarget.getBoundingClientRect();
                                  setContextMenu(prev => (prev?.session.id === session.id ? null : {
                                    session,
                                    x: rect.right - 180,
                                    y: rect.bottom + 4
                                  }));
                                }}
                                onContextMenu={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setContextMenu({
                                    session,
                                    x: e.clientX,
                                    y: e.clientY
                                  });
                                }}
                                className="p-1 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0 opacity-70 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100"
                                title="Chat options (or right-click)"
                              >
                                <MoreVertical className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))
            )}

            {groupedSessions.length > 0 && (
              <div className="pt-2 pb-1 px-3 text-[11px] text-white/30 text-center flex items-center justify-center gap-1.5 select-none">
                <span>Click ︙ or right-click to export PDF or delete</span>
              </div>
            )}
          </div>

          {/* Persistent Bottom Actions */}
          <div className="p-3 border-t border-white/[0.08] shrink-0 bg-black/60 overflow-hidden">
            {/* Quick Settings, Storage, VRAM & Import Glass Buttons */}
            <div className={`grid ${onOpenLocalModelImporter ? 'grid-cols-4' : 'grid-cols-3'} gap-1.5 overflow-hidden`}>
              <button
                type="button"
                id="sidebar-settings-btn"
                onClick={onOpenSettings}
                className="flex items-center justify-center gap-1 px-1 py-2 rounded-xl text-white/80 hover:text-white glass-button text-xs font-medium cursor-pointer whitespace-nowrap overflow-hidden active:scale-95"
                title="Settings"
              >
                <Settings className="w-3.5 h-3.5 text-white/60 shrink-0" />
                <span className="truncate text-[11px]">Settings</span>
              </button>

              <button
                type="button"
                id="sidebar-storage-btn"
                onClick={onOpenStorageManager}
                className="flex items-center justify-center gap-1 px-1 py-2 rounded-xl text-white/80 hover:text-white glass-button text-xs font-medium cursor-pointer whitespace-nowrap overflow-hidden active:scale-95"
                title="Storage & Cache"
              >
                <HardDrive className="w-3.5 h-3.5 text-white/60 shrink-0" />
                <span className="truncate text-[11px]">Storage</span>
              </button>

              {onOpenVramMonitor && (
                <button
                  type="button"
                  id="sidebar-vram-monitor-btn"
                  onClick={onOpenVramMonitor}
                  className={`flex items-center justify-center gap-1 px-1 py-2 rounded-xl text-xs font-medium cursor-pointer whitespace-nowrap overflow-hidden active:scale-95 transition-all ${
                    vramStats && vramStats.allocatedMB > 0
                      ? vramStats.isHealthy === false
                        ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                        : 'bg-blue-500/10 text-blue-300 border border-blue-500/25 hover:bg-blue-500/20'
                      : 'text-white/80 hover:text-white glass-button'
                  }`}
                  title="Real-Time VRAM & Health Monitor"
                >
                  <Activity className="w-3.5 h-3.5 text-blue-400 shrink-0 animate-pulse" />
                  <span className="truncate text-[11px]">
                    {vramStats && vramStats.allocatedMB > 0 ? `${vramStats.allocatedMB}M` : 'VRAM'}
                  </span>
                </button>
              )}

              {onOpenLocalModelImporter && (
                <button
                  type="button"
                  id="sidebar-import-btn"
                  onClick={onOpenLocalModelImporter}
                  className="flex items-center justify-center gap-1 px-1 py-2 rounded-xl text-white/80 hover:text-white glass-button text-xs font-medium cursor-pointer whitespace-nowrap overflow-hidden active:scale-95"
                  title="Import Model from Files"
                >
                  <Upload className="w-3.5 h-3.5 text-white/60 shrink-0" />
                  <span className="truncate text-[11px]">Import</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </aside>

      {/* Chat Session Context / Dropdown Menu */}
      {contextMenu && (
        <>
          <div 
            className="fixed inset-0 z-[60] bg-transparent"
            onClick={() => setContextMenu(null)}
            onContextMenu={(e) => {
              e.preventDefault();
              setContextMenu(null);
            }}
          />
          <div
            id="chat-context-menu"
            style={{
              top: `${Math.min(Math.max(10, contextMenu.y), (typeof window !== 'undefined' ? window.innerHeight : 800) - 160)}px`,
              left: `${Math.min(Math.max(10, contextMenu.x), (typeof window !== 'undefined' ? window.innerWidth : 1000) - 220)}px`
            }}
            className="fixed z-[70] w-52 bg-[#12141a]/95 border border-white/[0.12] rounded-2xl shadow-2xl backdrop-blur-2xl py-1.5 overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-xs"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-3 py-1.5 text-[10px] font-semibold text-white/40 uppercase tracking-wider border-b border-white/[0.06] truncate">
              {contextMenu.session.title}
            </div>

            {/* Save chat as PDF */}
            <button
              type="button"
              id="menu-save-pdf-btn"
              onClick={() => {
                const s = contextMenu.session;
                setContextMenu(null);
                onExportPdf(s);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-white/90 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer text-left"
            >
              <FileDown className="w-4 h-4 text-[#a8c7fa] shrink-0" />
              <div className="flex flex-col min-w-0">
                <span className="font-medium">Save chat as PDF</span>
                <span className="text-[10px] text-white/40">Preserves LaTeX math</span>
              </div>
            </button>

            {/* Rename */}
            <button
              type="button"
              id="menu-rename-btn"
              onClick={() => {
                const s = contextMenu.session;
                setContextMenu(null);
                handleStartRename(s);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-white/90 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer text-left"
            >
              <Edit3 className="w-4 h-4 text-white/60 shrink-0" />
              <span>Rename chat</span>
            </button>

            <div className="my-1 border-t border-white/[0.06]" />

            {/* Delete */}
            <button
              type="button"
              id="menu-delete-btn"
              onClick={() => {
                const s = contextMenu.session;
                setContextMenu(null);
                setSessionToDelete(s);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-rose-300 hover:text-rose-200 hover:bg-rose-500/15 transition-colors cursor-pointer text-left"
            >
              <Trash2 className="w-4 h-4 text-rose-400 shrink-0" />
              <span className="font-medium">Delete chat</span>
            </button>
          </div>
        </>
      )}

      {/* Delete Confirmation Modal triggered by Delete button in menu */}
      {sessionToDelete && (
        <div
          id="delete-chat-modal-backdrop"
          className="fixed inset-0 bg-black/80 backdrop-blur-2xl z-50 flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setSessionToDelete(null)}
        >
          <div
            id="delete-chat-modal"
            className="glass-panel border border-white/[0.12] rounded-3xl max-w-sm w-full p-5 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-white/[0.06] border border-white/[0.12] text-white flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-white" />
              </div>
              <div className="space-y-1 min-w-0 flex-1">
                <h3 className="text-sm font-semibold text-white tracking-tight">Delete conversation?</h3>
                <p className="text-xs text-white/50 leading-relaxed break-words">
                  Are you sure you want to delete <span className="text-white font-medium">"{sessionToDelete.title}"</span>? This will permanently remove this chat.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                id="cancel-delete-chat-btn"
                type="button"
                onClick={() => setSessionToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-white/70 hover:text-white glass-button cursor-pointer"
              >
                Cancel
              </button>
              <button
                id="confirm-delete-chat-btn"
                type="button"
                onClick={() => {
                  const id = sessionToDelete.id;
                  setSessionToDelete(null);
                  onDeleteSession(id);
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-white/[0.15] hover:bg-white/[0.22] border border-white/[0.25] transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Chat</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
