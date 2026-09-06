import React, { useState, useMemo, useRef, useEffect } from 'react';
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
  Database
} from 'lucide-react';
import { ChatSession, Diagnostics } from '../types';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: ChatSession[];
  activeSessionId: string;
  onSelectSession: (id: string) => void;
  onNewChat: () => void;
  onDeleteSession: (id: string) => void;
  onRenameSession: (id: string, newTitle: string) => void;
  onOpenSettings: () => void;
  onOpenStorageManager: () => void;
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
  onOpenSettings,
  onOpenStorageManager,
  diagnostics,
  disabled
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [sessionToDelete, setSessionToDelete] = useState<ChatSession | null>(null);
  const [holdingSessionId, setHoldingSessionId] = useState<string | null>(null);

  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPressTriggeredRef = useRef<boolean>(false);
  const touchStartPosRef = useRef<{ x: number; y: number } | null>(null);

  const HOLD_DURATION_MS = 500;

  const startHold = (session: ChatSession, clientX: number, clientY: number) => {
    if (editingId) return;
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
    }
    isLongPressTriggeredRef.current = false;
    touchStartPosRef.current = { x: clientX, y: clientY };
    setHoldingSessionId(session.id);

    holdTimerRef.current = setTimeout(() => {
      isLongPressTriggeredRef.current = true;
      setHoldingSessionId(null);
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        try {
          navigator.vibrate(40);
        } catch {}
      }
      setSessionToDelete(session);
    }, HOLD_DURATION_MS);
  };

  const cancelHold = () => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    setHoldingSessionId(null);
    touchStartPosRef.current = null;
  };

  const handlePointerMove = (clientX: number, clientY: number) => {
    if (!touchStartPosRef.current || !holdTimerRef.current) return;
    const dx = Math.abs(clientX - touchStartPosRef.current.x);
    const dy = Math.abs(clientY - touchStartPosRef.current.y);
    if (dx > 10 || dy > 10) {
      cancelHold();
    }
  };

  useEffect(() => {
    return () => {
      if (holdTimerRef.current) {
        clearTimeout(holdTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && sessionToDelete) {
        setSessionToDelete(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [sessionToDelete]);

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

  const handleStartRename = (session: ChatSession, e: React.MouseEvent) => {
    e.stopPropagation();
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
          fixed md:relative inset-y-0 left-0 h-full flex-shrink-0 transition-all duration-300 ease-in-out border-r border-white/[0.06] bg-[#12141a]/85 backdrop-blur-2xl flex flex-col justify-between z-40 md:z-20
          ${isOpen ? 'w-64 opacity-100 translate-x-0' : 'w-0 opacity-0 -translate-x-full md:translate-x-0 overflow-hidden border-none pointer-events-none'}
        `}
      >
        <div className="w-64 h-full flex flex-col justify-between overflow-hidden">
          {/* Sidebar Top: Header, New Chat, Search */}
          <div className="p-3.5 space-y-3 shrink-0 overflow-hidden">
            <div className="flex items-center justify-between px-1 overflow-hidden">
              <div className="flex items-center gap-2.5 text-white font-medium text-sm min-w-0 overflow-hidden">
                <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-blue-500/20 via-indigo-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center shrink-0 shadow-xs">
                  <Sparkles className="w-3.5 h-3.5 text-[#a8c7fa]" />
                </div>
                <span className="tracking-tight text-[15px] whitespace-nowrap overflow-hidden text-ellipsis font-medium">Local AI</span>
              </div>

              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/[0.06] transition-all duration-200 md:hidden shrink-0 cursor-pointer"
                title="Close sidebar"
              >
                <PanelLeftClose className="w-4 h-4" />
              </button>
            </div>

            {/* + New Chat Button */}
            <button
              onClick={onNewChat}
              disabled={disabled}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-white/[0.05] hover:bg-white/[0.09] text-white text-sm font-medium border border-white/[0.08] shadow-md transition-all duration-200 cursor-pointer disabled:opacity-50 active:scale-[0.99] overflow-hidden whitespace-nowrap"
            >
              <Plus className="w-4 h-4 text-[#a8c7fa] shrink-0" />
              <span className="truncate">New chat</span>
            </button>

            {/* Search Conversations Bar */}
            <div className="relative overflow-hidden">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search chats..."
                className="w-full bg-[#0b0d11]/70 border border-white/[0.06] rounded-xl pl-9 pr-7 py-1.5 text-xs text-white/90 placeholder-white/30 focus:outline-none focus:border-[#a8c7fa]/50 transition-colors whitespace-nowrap overflow-hidden"
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
                    const isHolding = session.id === holdingSessionId;

                    return (
                      <div
                        key={session.id}
                        id={`chat-session-item-${session.id}`}
                        onTouchStart={(e) => {
                          if (isEditing) return;
                          const touch = e.touches[0];
                          startHold(session, touch.clientX, touch.clientY);
                        }}
                        onTouchMove={(e) => {
                          const touch = e.touches[0];
                          handlePointerMove(touch.clientX, touch.clientY);
                        }}
                        onTouchEnd={(e) => {
                          cancelHold();
                          if (isLongPressTriggeredRef.current) {
                            e.preventDefault();
                            e.stopPropagation();
                          }
                        }}
                        onTouchCancel={cancelHold}
                        onMouseDown={(e) => {
                          if (isEditing || e.button !== 0) return;
                          startHold(session, e.clientX, e.clientY);
                        }}
                        onMouseMove={(e) => {
                          handlePointerMove(e.clientX, e.clientY);
                        }}
                        onMouseUp={cancelHold}
                        onMouseLeave={cancelHold}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          cancelHold();
                          setSessionToDelete(session);
                        }}
                        onClick={(e) => {
                          if (isLongPressTriggeredRef.current) {
                            e.preventDefault();
                            e.stopPropagation();
                            isLongPressTriggeredRef.current = false;
                            return;
                          }
                          if (!isEditing) onSelectSession(session.id);
                        }}
                        title={isEditing ? undefined : `"${session.title}" (Press & hold to delete)`}
                        className={`
                          group relative flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-all duration-200 cursor-pointer overflow-hidden select-none
                          ${isHolding 
                            ? 'bg-rose-500/15 border border-rose-500/40 text-white scale-[0.98]' 
                            : isActive 
                              ? 'bg-white/[0.08] text-white font-medium border border-white/[0.08] shadow-xs' 
                              : 'text-white/70 hover:bg-white/[0.04] hover:text-white'
                          }
                        `}
                      >
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
                              <MessageSquare className={`w-3.5 h-3.5 shrink-0 ${isHolding ? 'text-rose-400 opacity-90' : 'opacity-60'}`} />
                              <span className="truncate whitespace-nowrap">{session.title}</span>
                            </div>

                            {/* While holding: indicator */}
                            {isHolding ? (
                              <div className="flex items-center gap-1 text-[10px] text-rose-300 font-medium shrink-0 animate-pulse">
                                <Trash2 className="w-3 h-3 text-rose-400" />
                                <span>Hold to delete...</span>
                              </div>
                            ) : (
                              /* Hover action buttons */
                              <div className="hidden group-hover:flex items-center gap-0.5 shrink-0">
                                <button
                                  onClick={(e) => handleStartRename(session, e)}
                                  onMouseDown={(e) => e.stopPropagation()}
                                  onTouchStart={(e) => e.stopPropagation()}
                                  className="p-1 rounded-md text-white/40 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                                  title="Rename chat"
                                >
                                  <Edit3 className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSessionToDelete(session);
                                  }}
                                  onMouseDown={(e) => e.stopPropagation()}
                                  onTouchStart={(e) => e.stopPropagation()}
                                  className="p-1 rounded-md text-white/40 hover:text-[#f28b82] hover:bg-[#f28b82]/10 transition-colors cursor-pointer"
                                  title="Delete chat (or press & hold)"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            )}

                            {/* Press and hold progress bar */}
                            {isHolding && (
                              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-rose-500/30 overflow-hidden rounded-b-xl pointer-events-none">
                                <div className="h-full bg-gradient-to-r from-rose-500 to-red-400 animate-hold-progress" />
                              </div>
                            )}
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
                <Trash2 className="w-3 h-3 text-white/25" />
                <span>Tip: Press &amp; hold any chat to delete</span>
              </div>
            )}
          </div>

          {/* Persistent Bottom Storage Card & Actions */}
          <div className="p-3 border-t border-white/[0.06] space-y-2 shrink-0 bg-[#0e1015]/60 overflow-hidden">
            {/* Storage Quota Card */}
            <button
              onClick={onOpenStorageManager}
              className="w-full p-2.5 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.06] text-left transition-all duration-200 cursor-pointer group overflow-hidden"
            >
              <div className="flex items-center justify-between text-[11px] whitespace-nowrap overflow-hidden">
                <span className="flex items-center gap-1.5 font-medium text-white/80 group-hover:text-white truncate">
                  <ShieldCheck className={`w-3.5 h-3.5 shrink-0 ${diagnostics.storagePersisted ? 'text-emerald-400' : 'text-amber-400'}`} />
                  <span className="truncate">{diagnostics.storagePersisted ? 'Storage: Persistent' : 'Storage: Auto'}</span>
                </span>
                <span className="font-mono text-white/40 text-[10px] shrink-0">
                  {diagnostics.storageUsageMB !== null ? `${diagnostics.storageUsageMB} MB` : 'Local'}
                </span>
              </div>
              <div className="text-[10px] text-white/40 mt-1 flex items-center justify-between whitespace-nowrap overflow-hidden">
                <span className="truncate">IndexedDB & Cache</span>
                <span className="text-[#a8c7fa] group-hover:underline shrink-0">Manage &rarr;</span>
              </div>
            </button>

            {/* Quick Settings & Storage Buttons */}
            <div className="grid grid-cols-2 gap-1.5 pt-1 overflow-hidden">
              <button
                onClick={onOpenSettings}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-white/70 hover:text-white hover:bg-white/[0.05] text-xs font-medium transition-all duration-200 cursor-pointer border border-white/[0.06] whitespace-nowrap overflow-hidden active:scale-95"
              >
                <Settings className="w-3.5 h-3.5 text-white/60 shrink-0" />
                <span className="truncate">Settings</span>
              </button>

              <button
                onClick={onOpenStorageManager}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-white/70 hover:text-white hover:bg-white/[0.05] text-xs font-medium transition-all duration-200 cursor-pointer border border-white/[0.06] whitespace-nowrap overflow-hidden active:scale-95"
              >
                <Database className="w-3.5 h-3.5 text-white/60 shrink-0" />
                <span className="truncate">Storage</span>
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Delete Confirmation Modal triggered by Press & Hold or Delete button */}
      {sessionToDelete && (
        <div
          id="delete-chat-modal-backdrop"
          className="fixed inset-0 bg-black/75 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setSessionToDelete(null)}
        >
          <div
            id="delete-chat-modal"
            className="bg-[#16181f] border border-white/[0.1] rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-500/25 text-rose-400 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="space-y-1 min-w-0 flex-1">
                <h3 className="text-sm font-semibold text-white tracking-tight">Delete conversation?</h3>
                <p className="text-xs text-white/60 leading-relaxed break-words">
                  Are you sure you want to delete <span className="text-white font-medium">"{sessionToDelete.title}"</span>? This will permanently remove this chat and all its messages.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                id="cancel-delete-chat-btn"
                type="button"
                onClick={() => setSessionToDelete(null)}
                className="px-3.5 py-2 rounded-xl text-xs font-medium text-white/70 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
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
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 transition-colors shadow-md shadow-rose-900/30 flex items-center gap-1.5 cursor-pointer active:scale-95"
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
