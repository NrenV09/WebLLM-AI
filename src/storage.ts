import { ChatSession, ChatMessage, AISettings } from './types';

const DB_NAME = 'local_webllm_chat_db';
const DB_VERSION = 1;
const SESSIONS_STORE = 'chat_sessions';
const SETTINGS_STORE = 'app_settings';

const LOCAL_STORAGE_BACKUP_KEY = 'webgpu_local_chats_v1';
const LOCAL_STORAGE_SETTINGS_KEY = 'webgpu_local_settings_v1';

export const DEFAULT_SETTINGS: AISettings = {
  temperature: 0.6,
  top_p: 0.9,
  repetition_penalty: 1.05,
  max_tokens: 4096,
  systemPrompt: 'You are a helpful, brilliant, and precise AI assistant. When analyzing complex problems, performing multi-step reasoning, or writing mathematical derivations or code, wrap your internal reasoning in <think>...</think> tags before providing the final answer.\n\nSTRICT LATEX FORMATTING RULES:\n1. Inline math: $...$ (e.g. $E = mc^2$)\n2. Display block math: $$...$$ on separate lines.'
};

// Open or initialize IndexedDB
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported in this environment'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(SESSIONS_STORE)) {
        const sessionStore = db.createObjectStore(SESSIONS_STORE, { keyPath: 'id' });
        sessionStore.createIndex('updatedAt', 'updatedAt', { unique: false });
      }
      if (!db.objectStoreNames.contains(SETTINGS_STORE)) {
        db.createObjectStore(SETTINGS_STORE, { keyPath: 'key' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export function getInitialDefaultMessage(): ChatMessage {
  return {
    id: `msg_init_${Date.now()}`,
    role: 'assistant',
    content: 'Hello! I am your 100% private, on-device AI assistant powered by WebGPU. All token generation and memory stay entirely inside your browser.',
    timestamp: Date.now()
  };
}

export function createNewSession(modelId: string, customTitle?: string): ChatSession {
  const now = Date.now();
  return {
    id: `chat_${now}_${Math.random().toString(36).substring(2, 8)}`,
    modelId,
    title: customTitle || 'New conversation',
    createdAt: now,
    updatedAt: now,
    messages: [getInitialDefaultMessage()]
  };
}

export function autoGenerateTitle(userPrompt: string): string {
  const clean = userPrompt.replace(/[\r\n]+/g, ' ').trim();
  if (clean.length <= 32) return clean;
  return clean.slice(0, 32) + '...';
}

// Load all sessions from IndexedDB with fallback to localStorage
export async function loadAllSessions(): Promise<ChatSession[]> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const transaction = db.transaction(SESSIONS_STORE, 'readonly');
      const store = transaction.objectStore(SESSIONS_STORE);
      const request = store.getAll();

      request.onsuccess = () => {
        const result = request.result as ChatSession[];
        if (result && result.length > 0) {
          result.sort((a, b) => b.updatedAt - a.updatedAt);
          // Sync backup to localStorage
          saveToLocalStorageBackup(result);
          resolve(result);
        } else {
          // Check localStorage for previous sessions
          const backup = loadFromLocalStorageBackup();
          if (backup.length > 0) {
            saveAllSessions(backup).catch(() => {});
            resolve(backup);
          } else {
            resolve([]);
          }
        }
      };

      request.onerror = () => {
        resolve(loadFromLocalStorageBackup());
      };
    });
  } catch (e) {
    console.warn('IndexedDB read failed, falling back to localStorage:', e);
    return loadFromLocalStorageBackup();
  }
}

// Save single session or all sessions
export async function saveSession(session: ChatSession): Promise<void> {
  try {
    const db = await openDB();
    const transaction = db.transaction(SESSIONS_STORE, 'readwrite');
    const store = transaction.objectStore(SESSIONS_STORE);
    store.put(session);
  } catch (e) {
    console.warn('IndexedDB saveSession failed:', e);
  }
}

export async function saveAllSessions(sessions: ChatSession[]): Promise<void> {
  saveToLocalStorageBackup(sessions);
  try {
    const db = await openDB();
    const transaction = db.transaction(SESSIONS_STORE, 'readwrite');
    const store = transaction.objectStore(SESSIONS_STORE);
    
    // Clear and re-populate
    store.clear();
    for (const session of sessions) {
      store.put(session);
    }
  } catch (e) {
    console.warn('IndexedDB saveAllSessions failed:', e);
  }
}

export async function deleteSession(sessionId: string): Promise<void> {
  try {
    const db = await openDB();
    const transaction = db.transaction(SESSIONS_STORE, 'readwrite');
    const store = transaction.objectStore(SESSIONS_STORE);
    store.delete(sessionId);
  } catch (e) {
    console.warn('IndexedDB deleteSession failed:', e);
  }
}

export async function clearAllSessions(): Promise<void> {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(LOCAL_STORAGE_BACKUP_KEY);
  }
  try {
    const db = await openDB();
    const transaction = db.transaction(SESSIONS_STORE, 'readwrite');
    const store = transaction.objectStore(SESSIONS_STORE);
    store.clear();
  } catch (e) {
    console.warn('IndexedDB clearAllSessions failed:', e);
  }
}

// Settings persistence
export async function loadAISettings(): Promise<AISettings> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const transaction = db.transaction(SETTINGS_STORE, 'readonly');
      const store = transaction.objectStore(SETTINGS_STORE);
      const req = store.get('ai_config');

      req.onsuccess = () => {
        if (req.result && req.result.value) {
          resolve({ ...DEFAULT_SETTINGS, ...req.result.value });
        } else {
          // check localStorage
          const local = loadSettingsFromLocalStorage();
          resolve(local);
        }
      };
      req.onerror = () => resolve(loadSettingsFromLocalStorage());
    });
  } catch {
    return loadSettingsFromLocalStorage();
  }
}

export async function saveAISettings(settings: AISettings): Promise<void> {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(LOCAL_STORAGE_SETTINGS_KEY, JSON.stringify(settings));
    } catch {}
  }
  try {
    const db = await openDB();
    const transaction = db.transaction(SETTINGS_STORE, 'readwrite');
    const store = transaction.objectStore(SETTINGS_STORE);
    store.put({ key: 'ai_config', value: settings });
  } catch (e) {
    console.warn('Failed to save settings in IndexedDB:', e);
  }
}

// Backup utilities (localStorage & JSON export/import)
function saveToLocalStorageBackup(sessions: ChatSession[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_STORAGE_BACKUP_KEY, JSON.stringify(sessions));
  } catch (e) {
    console.warn('localStorage backup write failed:', e);
  }
}

function loadFromLocalStorageBackup(): ChatSession[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_BACKUP_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function loadSettingsFromLocalStorage(): AISettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function exportChatsAsJSON(sessions: ChatSession[]): void {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(sessions, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", `local_ai_chats_${new Date().toISOString().slice(0,10)}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

export function importChatsFromJSON(jsonString: string): ChatSession[] {
  const parsed = JSON.parse(jsonString);
  if (!Array.isArray(parsed)) {
    throw new Error('Invalid JSON format: expected an array of chat sessions');
  }
  return parsed.filter(s => s && s.id && Array.isArray(s.messages));
}
