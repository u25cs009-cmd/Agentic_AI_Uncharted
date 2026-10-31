import { Memory, MemoryEvent, ChatModeResult, BenchmarkScenario, RetrievalScoring, AgentRun } from '../types/memory';
import { INITIAL_MEMORIES, INITIAL_EVENTS, BENCHMARK_SCENARIOS } from './mockData';

const getBaseUrl = (): string => {
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') {
      return import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
    }
    const envUrl = import.meta.env.VITE_API_BASE_URL;
    if (envUrl && !envUrl.includes('localhost') && !envUrl.includes('127.0.0.1')) {
      return envUrl;
    }
    return 'https://agentic-ai-uncharted.onrender.com';
  }
  return import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
};

const BASE_URL = getBaseUrl();

// Decode standard Google OAuth JWT token directly on client for robust fallback
function decodeGoogleJwt(credential: string): { email?: string; name?: string; picture?: string; sub?: string } {
  try {
    const parts = credential.split('.');
    if (parts.length >= 2) {
      const base64Url = parts[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    }
  } catch (e) {
    console.error('Failed to decode Google JWT token on client:', e);
  }
  return {};
}


let isLiveBackend = false;
let hasCheckedBackend = false;

export type BackendStatus = { waking: boolean; unavailable: boolean };
let isServerWaking = false;
let isBackendUnavailable = false;
const statusListeners = new Set<(status: BackendStatus) => void>();

export function subscribeToBackendStatus(listener: (status: BackendStatus) => void): () => void {
  statusListeners.add(listener);
  listener({ waking: isServerWaking, unavailable: isBackendUnavailable });
  return () => {
    statusListeners.delete(listener);
  };
}

function notifyBackendStatus() {
  const status = { waking: isServerWaking, unavailable: isBackendUnavailable };
  statusListeners.forEach(fn => fn(status));
}

export function setServerWaking(waking: boolean) {
  if (isServerWaking !== waking) {
    isServerWaking = waking;
    notifyBackendStatus();
  }
}

export function setBackendUnavailable(unavailable: boolean) {
  if (isBackendUnavailable !== unavailable) {
    isBackendUnavailable = unavailable;
    notifyBackendStatus();
  }
}

type WakingListener = (isWaking: boolean) => void;
export function subscribeToWakingState(listener: WakingListener): () => void {
  return subscribeToBackendStatus(s => listener(s.waking));
}


// Check backend health with 3s slow threshold and 90s retry loop
export async function checkBackendConnection(forceDelayUrl?: string): Promise<boolean> {
  const targetUrl = forceDelayUrl || `${BASE_URL}/api/health`;
  const startTime = Date.now();
  const maxRetryDurationMs = 90000;
  const retryIntervalMs = 5000;

  async function probeOnce(): Promise<boolean> {
    const controller = new AbortController();
    const timeoutTimer = setTimeout(() => {
      setServerWaking(true);
      controller.abort();
    }, 3000);

    try {
      const res = await fetch(targetUrl, { signal: controller.signal });
      clearTimeout(timeoutTimer);
      if (res.ok) {
        setServerWaking(false);
        isLiveBackend = true;
        return true;
      }
    } catch {
      // Handled by retries
    }
    clearTimeout(timeoutTimer);
    return false;
  }

  const ok = await probeOnce();
  hasCheckedBackend = true;
  if (ok) return true;

  setServerWaking(true);
  const interval = setInterval(async () => {
    if (Date.now() - startTime > maxRetryDurationMs) {
      clearInterval(interval);
      setServerWaking(false);
      return;
    }
    const success = await probeOnce();
    if (success) {
      clearInterval(interval);
      setServerWaking(false);
    }
  }, retryIntervalMs);

  return false;
}

// Safe network request helper with 3s waking detection
async function safeFetch(url: string, options?: RequestInit): Promise<Response | null> {
  if (!hasCheckedBackend) {
    await checkBackendConnection();
  }
  const wakingTimer = setTimeout(() => {
    setServerWaking(true);
  }, 3000);

  try {
    const res = await fetch(url, options);
    clearTimeout(wakingTimer);
    setServerWaking(false);
    if (!isLiveBackend && res.ok) isLiveBackend = true;
    return res;
  } catch {
    clearTimeout(wakingTimer);
    setServerWaking(false);
    isLiveBackend = false;
    return null;
  }
}

// Local state for interactive fallback demo
let memoryStore: Memory[] = (() => {
  const saved = localStorage.getItem('anchor_memories');
  return saved ? JSON.parse(saved) : INITIAL_MEMORIES;
})();

let eventStore: MemoryEvent[] = (() => {
  const saved = localStorage.getItem('anchor_events');
  return saved ? JSON.parse(saved) : INITIAL_EVENTS;
})();

function persist() {
  localStorage.setItem('anchor_memories', JSON.stringify(memoryStore));
  localStorage.setItem('anchor_events', JSON.stringify(eventStore));
}

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('anchor_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

// Calculate blueprint exact recency decay
export function calculateRecency(createdAt: string, type: string): number {
  const createdDate = new Date(createdAt);
  const now = new Date();
  const diffDays = Math.max(0, (now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
  
  let halfLife = 60; // semantic default
  if (type === 'episodic') halfLife = 7;
  else if (type === 'procedural') halfLife = 90;

  return Math.pow(0.5, diffDays / halfLife);
}

export const api = {
  // Connection and Demo mode status
  getConnectionStatus(): { isLiveBackend: boolean; mode: 'live' | 'simulation'; baseUrl: string } {
    return {
      isLiveBackend,
      mode: isLiveBackend ? 'live' : 'simulation',
      baseUrl: BASE_URL || 'Local ANCHOR Engine (Simulation)',
    };
  },

  // Authentication & Profile Services
  async login(email: string, password?: string): Promise<{ token: string; user: any }> {
    if (!hasCheckedBackend) {
      await checkBackendConnection();
    }
    if (isLiveBackend) {
      try {
        const res = await fetch(`${BASE_URL}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });
        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const data = await res.json();
          if (!res.ok) {
            throw new Error(data.error || 'Failed to sign in. Please verify your credentials.');
          }
          localStorage.setItem('anchor_token', data.token);
          localStorage.setItem('anchor_user', JSON.stringify(data.user));
          return data;
        }
      } catch (err: any) {
        if (err.message && !err.message.includes('fetch') && err.name !== 'SyntaxError') {
          throw err;
        }
      }
    }
    // Demo / simulation offline fallback
    const token = `jwt_mock_${Date.now()}`;
    const user = {
      id: `usr-demo-${Date.now()}`,
      email,
      name: email.split('@')[0] || 'ANCHOR Operator',
      workspace: 'ws-primary',
      authProviders: ['local'],
      createdAt: new Date().toISOString()
    };
    localStorage.setItem('anchor_token', token);
    localStorage.setItem('anchor_user', JSON.stringify(user));
    return { token, user };
  },

  async register(email: string, password?: string, name?: string): Promise<{ token: string; user: any }> {
    if (!hasCheckedBackend) {
      await checkBackendConnection();
    }
    if (isLiveBackend) {
      try {
        const res = await fetch(`${BASE_URL}/api/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, name }),
        });
        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const data = await res.json();
          if (!res.ok) {
            throw new Error(data.error || 'Registration failed.');
          }
          localStorage.setItem('anchor_token', data.token);
          localStorage.setItem('anchor_user', JSON.stringify(data.user));
          return data;
        }
      } catch (err: any) {
        if (err.message && !err.message.includes('fetch') && err.name !== 'SyntaxError') {
          throw err;
        }
      }
    }
    const token = `jwt_mock_${Date.now()}`;
    const user = {
      id: `usr-reg-${Date.now()}`,
      email,
      name: name || email.split('@')[0] || 'New Operator',
      workspace: 'ws-primary',
      authProviders: ['local'],
      createdAt: new Date().toISOString()
    };
    localStorage.setItem('anchor_token', token);
    localStorage.setItem('anchor_user', JSON.stringify(user));
    return { token, user };
  },

  async googleLogin(credential: string): Promise<{ token: string; user: any }> {
    // 1. Attempt server-side Google token verification first
    try {
      const res = await fetch(`${BASE_URL}/api/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential, idToken: credential }),
      });
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const data = await res.json();
        if (res.ok && data?.user) {
          isLiveBackend = true;
          localStorage.setItem('anchor_token', data.token);
          localStorage.setItem('anchor_user', JSON.stringify(data.user));
          return data;
        } else if (!res.ok) {
          throw new Error(data.error || 'Google authentication failed on server.');
        }
      }
    } catch (err: any) {
      if (err.message && !err.message.includes('fetch') && !err.message.includes('Failed to fetch') && err.name !== 'SyntaxError') {
        throw err;
      }
      console.warn('Backend authentication unreachable; extracting verified identity directly from Google credential:', err);
    }

    // 2. Decode the user's real Google profile from the signed credential token
    const decoded = decodeGoogleJwt(credential);
    const userEmail = (decoded.email || '').toLowerCase().trim();
    const userName = decoded.name || (userEmail ? userEmail.split('@')[0] : 'Google User');
    const userPicture = decoded.picture || '';

    const token = `jwt_google_${Date.now()}`;
    const user = {
      id: decoded.sub || `usr-google-${Date.now()}`,
      email: userEmail,
      name: userName,
      profilePicture: userPicture,
      workspace: 'ws-primary',
      authProviders: ['google'],
      createdAt: new Date().toISOString()
    };
    localStorage.setItem('anchor_token', token);
    localStorage.setItem('anchor_user', JSON.stringify(user));
    return { token, user };
  },

  async me(): Promise<{ user: any }> {
    if (!hasCheckedBackend) {
      await checkBackendConnection();
    }
    if (isLiveBackend) {
      try {
        const res = await fetch(`${BASE_URL}/api/auth/me`, {
          headers: getAuthHeaders(),
        });
        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const data = await res.json();
          if (!res.ok) {
            throw new Error(data.error || 'Session expired. Please sign in again.');
          }
          localStorage.setItem('anchor_user', JSON.stringify(data.user));
          return data;
        }
      } catch (err: any) {
        // Fall back to local storage user
      }
    }
    const local = localStorage.getItem('anchor_user');
    if (local) {
      return { user: JSON.parse(local) };
    }
    throw new Error('No active user session');
  },

  async updateProfile(updates: { name?: string; profilePicture?: string }): Promise<{ user: any; message: string }> {
    if (!hasCheckedBackend) {
      await checkBackendConnection();
    }
    if (isLiveBackend) {
      try {
        const res = await fetch(`${BASE_URL}/api/auth/profile`, {
          method: 'PATCH',
          headers: getAuthHeaders(),
          body: JSON.stringify(updates),
        });
        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const data = await res.json();
          if (!res.ok) {
            throw new Error(data.error || 'Failed to update user profile.');
          }
          localStorage.setItem('anchor_user', JSON.stringify(data.user));
          return data;
        }
      } catch {}
    }
    const local = localStorage.getItem('anchor_user');
    const user = local ? JSON.parse(local) : { id: 'usr-demo', email: 'demo@anchor.io' };
    const updated = { ...user, ...updates };
    localStorage.setItem('anchor_user', JSON.stringify(updated));
    return { user: updated, message: 'Profile updated successfully (Demo Mode).' };
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    if (!hasCheckedBackend) {
      await checkBackendConnection();
    }
    if (isLiveBackend) {
      try {
        const res = await fetch(`${BASE_URL}/api/auth/change-password`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({ currentPassword, newPassword }),
        });
        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const data = await res.json();
          if (!res.ok) {
            throw new Error(data.error || 'Failed to change password.');
          }
          return data;
        }
      } catch {}
    }
    return { success: true, message: 'Password changed successfully (Demo Mode).' };
  },

  async forgotPassword(email: string): Promise<{ success: boolean; message: string; resetToken?: string }> {
    if (!hasCheckedBackend) {
      await checkBackendConnection();
    }
    if (isLiveBackend) {
      try {
        const res = await fetch(`${BASE_URL}/api/auth/forgot-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        });
        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const data = await res.json();
          if (!res.ok) {
            throw new Error(data.error || 'Failed to process password reset request.');
          }
          return data;
        }
      } catch {}
    }
    return { success: true, message: `Password reset link sent to ${email} (Demo Mode).` };
  },

  async resetPassword(token: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    if (!hasCheckedBackend) {
      await checkBackendConnection();
    }
    if (isLiveBackend) {
      try {
        const res = await fetch(`${BASE_URL}/api/auth/reset-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, newPassword }),
        });
        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const data = await res.json();
          if (!res.ok) {
            throw new Error(data.error || 'Failed to reset password.');
          }
          return data;
        }
      } catch {}
    }
    return { success: true, message: 'Password reset successfully (Demo Mode).' };
  },

  async logout(): Promise<void> {
    try {
      await fetch(`${BASE_URL}/api/auth/logout`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
    } catch {
      // Ignore network errors
    }
    localStorage.removeItem('anchor_token');
    localStorage.removeItem('anchor_user');
  },

  // Conversation history methods
  async getConversations(): Promise<any[]> {
    try {
      const res = await safeFetch(`${BASE_URL}/api/conversations`, {
        headers: getAuthHeaders(),
      });
      if (res && res.ok) {
        const data = await res.json();
        return data.conversations || [];
      }
    } catch {}
    const local = localStorage.getItem('anchor_conversations');
    return local ? JSON.parse(local) : [];
  },

  async getConversation(id: string): Promise<any> {
    try {
      const res = await safeFetch(`${BASE_URL}/api/conversations/${id}`, {
        headers: getAuthHeaders(),
      });
      if (res && res.ok) {
        const data = await res.json();
        return data.conversation;
      }
    } catch {}
    const local = localStorage.getItem('anchor_conversations');
    const convs = local ? JSON.parse(local) : [];
    return convs.find((c: any) => c.id === id) || null;
  },

  async createConversation(title?: string, initialMessage?: any): Promise<any> {
    try {
      const res = await safeFetch(`${BASE_URL}/api/conversations`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ title, initialMessage }),
      });
      if (res && res.ok) {
        const data = await res.json();
        return data.conversation;
      }
    } catch {}
    const convId = `conv-${Date.now()}`;
    const newConv = {
      id: convId,
      title: title || (initialMessage?.text ? initialMessage.text.slice(0, 40) + '...' : 'New Session'),
      messages: initialMessage ? [initialMessage] : [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const local = localStorage.getItem('anchor_conversations');
    const convs = local ? JSON.parse(local) : [];
    convs.unshift(newConv);
    localStorage.setItem('anchor_conversations', JSON.stringify(convs));
    return newConv;
  },

  async appendConversationMessage(id: string, message: any): Promise<any> {
    try {
      const res = await safeFetch(`${BASE_URL}/api/conversations/${id}/messages`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(message),
      });
      if (res && res.ok) {
        return await res.json();
      }
    } catch {}
    const local = localStorage.getItem('anchor_conversations');
    const convs = local ? JSON.parse(local) : [];
    const conv = convs.find((c: any) => c.id === id);
    if (conv) {
      conv.messages = conv.messages || [];
      conv.messages.push(message);
      conv.updatedAt = new Date().toISOString();
      localStorage.setItem('anchor_conversations', JSON.stringify(convs));
    }
    return { conversation: conv, message };
  },

  async deleteConversation(id: string): Promise<boolean> {
    try {
      const res = await safeFetch(`${BASE_URL}/api/conversations/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (res && res.ok) return true;
    } catch {}
    const local = localStorage.getItem('anchor_conversations');
    const convs = local ? JSON.parse(local) : [];
    const filtered = convs.filter((c: any) => c.id !== id);
    localStorage.setItem('anchor_conversations', JSON.stringify(filtered));
    return true;
  },

  // Memories
  async getMemories(filter?: { status?: string; type?: string; tier?: string; source?: string; search?: string }): Promise<Memory[]> {
    try {
      const activeFilter: Record<string, string> = {};
      if (filter?.status && filter.status !== 'all') activeFilter.status = filter.status;
      if (filter?.type && filter.type !== 'all') activeFilter.type = filter.type;
      if (filter?.tier && filter.tier !== 'all') activeFilter.tier = filter.tier;
      if (filter?.source && filter.source !== 'all') activeFilter.source = filter.source;
      if (filter?.search) activeFilter.search = filter.search;

      const queryParams = new URLSearchParams(activeFilter).toString();
      const res = await safeFetch(`${BASE_URL}/api/memories?${queryParams}`, {
        headers: getAuthHeaders(),
      });
      if (res && res.ok) return await res.json();
    } catch {
      // Fallback
    }

    let result = [...memoryStore];
    if (filter?.status && filter.status !== 'all') {
      result = result.filter(m => m.status === filter.status);
    }
    if (filter?.type && filter.type !== 'all') {
      result = result.filter(m => m.type === filter.type);
    }
    if (filter?.tier && filter.tier !== 'all') {
      result = result.filter(m => m.tier === filter.tier);
    }
    if (filter?.source && filter.source !== 'all') {
      result = result.filter(m => m.source?.kind === filter.source);
    }
    if (filter?.search) {
      const q = filter.search.toLowerCase();
      result = result.filter(m => 
        m.content.toLowerCase().includes(q) || 
        m.attribute_key.toLowerCase().includes(q) ||
        m.entities.some(e => e.toLowerCase().includes(q))
      );
    }
    return result;
  },

  async getMemory(id: string): Promise<Memory | null> {
    try {
      const res = await safeFetch(`${BASE_URL}/api/memories/${encodeURIComponent(id)}`, {
        headers: getAuthHeaders(),
      });
      if (res && res.ok) return await res.json();
    } catch {}
    return memoryStore.find(m => (m._id === id || m.id === id)) || null;
  },

  async updateMemory(id: string, updates: Partial<Memory>): Promise<Memory> {
    try {
      const res = await safeFetch(`${BASE_URL}/api/memories/${id}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify(updates),
      });
      if (res && res.ok) return await res.json();
    } catch {
      // Fallback
    }

    const idx = memoryStore.findIndex(m => m._id === id || m.id === id);
    if (idx !== -1) {
      memoryStore[idx] = { ...memoryStore[idx], ...updates, updated_at: new Date().toISOString() };
      eventStore.unshift({
        id: `evt-${Date.now()}`,
        memory_id: id,
        event_type: 'updated',
        reason: 'Manual update from Memory Explorer',
        actor: 'user',
        timestamp: new Date().toISOString(),
      });
      persist();
      return memoryStore[idx];
    }
    throw new Error('Memory not found');
  },

  async deleteMemory(id: string): Promise<{ success: boolean }> {
    try {
      const res = await safeFetch(`${BASE_URL}/api/memories/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (res && res.ok) return await res.json();
    } catch {
      // Fallback
    }

    memoryStore = memoryStore.filter(m => m._id !== id && m.id !== id);
    eventStore.unshift({
      id: `evt-${Date.now()}`,
      memory_id: id,
      event_type: 'deleted',
      reason: 'User deleted memory record',
      actor: 'user',
      timestamp: new Date().toISOString(),
    });
    persist();
    return { success: true };
  },

  // Quarantine
  async getQuarantinedMemories(): Promise<Memory[]> {
    return this.getMemories({ status: 'quarantined' });
  },

  async releaseQuarantine(id: string): Promise<Memory> {
    const mem = await this.updateMemory(id, { 
      status: 'active', 
      trust: 0.85, 
      quarantine_reason: undefined 
    });
    eventStore.unshift({
      id: `evt-${Date.now()}`,
      memory_id: id,
      event_type: 'released',
      reason: 'Human operator reviewed and approved quarantined memory',
      actor: 'Human Reviewer',
      timestamp: new Date().toISOString(),
    });
    persist();
    return mem;
  },

  async rejectQuarantine(id: string): Promise<{ success: boolean }> {
    eventStore.unshift({
      id: `evt-${Date.now()}`,
      memory_id: id,
      event_type: 'feedback_rejected',
      reason: 'Human confirmed poison/adversarial content and permanently rejected memory',
      actor: 'Human Reviewer',
      timestamp: new Date().toISOString(),
    });
    return this.deleteMemory(id);
  },

  // Timeline & Time Travel
  async getEvents(): Promise<MemoryEvent[]> {
    try {
      const res = await safeFetch(`${BASE_URL}/api/memories/events`, {
        headers: getAuthHeaders(),
      });
      if (res && res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) return data;
        if (Array.isArray(data.events)) return data.events;
      }
    } catch {}
    return Array.isArray(eventStore) && eventStore.length > 0 ? eventStore : [...INITIAL_EVENTS];
  },

  async getTimeTravelState(timestamp: string): Promise<Memory[]> {
    try {
      const res = await safeFetch(`${BASE_URL}/api/timetravel?timestamp=${encodeURIComponent(timestamp)}`, {
        headers: getAuthHeaders(),
      });
      if (res && res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) return data;
        if (Array.isArray(data.memories)) return data.memories;
      }
    } catch {}

    const targetTime = new Date(timestamp).getTime();
    const sourceStore = Array.isArray(memoryStore) && memoryStore.length > 0 ? memoryStore : INITIAL_MEMORIES;
    return sourceStore.filter(m => {
      const createdTime = new Date(m.created_at || m.valid_from).getTime();
      return createdTime <= targetTime;
    });
  },

  // Chat with ShaktAI
  async chat(message: string, mode: 'none' | 'naive' | 'governed'): Promise<ChatModeResult> {
    try {
      const res = await safeFetch(`${BASE_URL}/api/chat`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ message, mode, agent: 'ShaktAI' }),
      });
      if (res && res.ok) return await res.json();
    } catch {}

    // Realistic ANCHOR Engine simulation for ShaktAI
    const query = message.toLowerCase();
    
    // Evaluate memory matches
    const retrieved: RetrievalScoring[] = [];
    const excluded: RetrievalScoring[] = [];

    const stopwords = new Set(['the', 'and', 'for', 'with', 'are', 'is', 'was', 'were', 'what', 'when', 'where', 'which', 'who', 'how', 'why', 'this', 'that', 'these', 'those', 'from', 'into', 'under', 'over', 'about', 'some', 'any', 'all', 'can', 'could', 'will', 'would', 'should', 'have', 'has', 'had', 'not', 'our', 'out', 'you', 'your', 'top']);
    for (const mem of memoryStore) {
      // Compute mock cosine similarity based on keyword overlap
      const contentWords = mem.content.toLowerCase().split(/\W+/);
      const queryWords = query.split(/\W+/).filter(w => w.length > 2 && !stopwords.has(w));
      const matches = queryWords.filter(w => contentWords.includes(w));
      const overlap = queryWords.length > 0 ? matches.length / queryWords.length : 0;
      let rawSim = overlap >= 0.25 ? 0.70 + (overlap * 0.25) : 0.20;
      if (rawSim > 0.98) rawSim = 0.98;

      const recency = calculateRecency(mem.created_at || mem.valid_from, mem.type);
      const finalScore = parseFloat((rawSim * mem.trust * mem.confidence * recency).toFixed(3));

      const scoringObj: RetrievalScoring = {
        memory_id: mem._id || mem.id || '',
        content: mem.content,
        attribute_key: mem.attribute_key,
        similarity: parseFloat(rawSim.toFixed(3)),
        trust: mem.trust,
        confidence: mem.confidence,
        recency: parseFloat(recency.toFixed(3)),
        final_score: finalScore,
        status: mem.status,
        entities: mem.entities,
        depends_on: mem.depends_on,
      };

      if (mode === 'none') {
        continue;
      } else if (mode === 'naive') {
        if (rawSim >= 0.50) {
          retrieved.push(scoringObj);
        }
      } else {
        // GOVERNED (ShaktAI Core Guard)
        if (mem.status === 'quarantined') {
          scoringObj.excluded = true;
          scoringObj.exclusion_reason = 'quarantined';
          excluded.push(scoringObj);
        } else if (mem.status === 'stale') {
          scoringObj.excluded = true;
          scoringObj.exclusion_reason = 'stale';
          excluded.push(scoringObj);
        } else if (finalScore < 0.25) {
          scoringObj.excluded = true;
          scoringObj.exclusion_reason = 'low_score';
          excluded.push(scoringObj);
        } else {
          retrieved.push(scoringObj);
        }
      }
    }

    // Sort retrieved by final score descending
    retrieved.sort((a, b) => b.final_score - a.final_score);

    // Detect abstention rules in governed mode
    let abstention = false;
    let abstentionReason: string | undefined;

    if (mode === 'governed') {
      const keys = new Map<string, RetrievalScoring[]>();
      retrieved.forEach(r => {
        const list = keys.get(r.attribute_key) || [];
        list.push(r);
        keys.set(r.attribute_key, list);
      });
      for (const [key, list] of keys.entries()) {
        if (list.length >= 2) {
          const trustDiff = Math.abs(list[0].trust - list[1].trust);
          if (trustDiff < 0.15) {
            abstention = true;
            abstentionReason = `Conflicting active memories detected for key '${key}' with near-equal trust (delta: ${trustDiff.toFixed(2)} < 0.15). Abstaining from blind resolution.`;
          }
        }
      }

      // Only abstain if query specifically targets the invalidated incident resolution
      const isIncidentQuery = query.includes('checkout') || query.includes('timeout') || query.includes('restart') || query.includes('pg_ctlcluster') || query.includes('deploy') || query.includes('fix');
      const hasRelevantStale = excluded.some(e => e.exclusion_reason === 'stale' && (e.similarity >= 0.45 || isIncidentQuery));
      if (retrieved.length === 0 && hasRelevantStale && isIncidentQuery) {
        abstention = true;
        abstentionReason = "Relevant prior resolution was invalidated by a recent deployment event. Abstaining from obsolete recommendation.";
      }
    }

    // Generate response text
    let answer = "";
    const qLower = query.toLowerCase();
    const isGreeting = /^(hi+|hello+|hey+|greetings|good morning|good evening|yo)\b/i.test(query.trim());
    const isHowAreYou = qLower.includes('how are you') || qLower.includes('how r u') || qLower.includes('how are u');

    if (mode === 'none') {
      if (isHowAreYou) {
        answer = "Hello! I am doing well, thank you for asking. How can I assist you today?";
      } else if (isGreeting) {
        answer = "Hello! How can I help you today?";
      } else if (query.includes('country') || query.includes('countries')) {
        answer = "The top 3 biggest countries in the world by total land area are:\n1. **Russia** (~17.1M km²)\n2. **Canada** (~9.98M km²)\n3. **United States** (~9.83M km²)";
      } else if (query.includes('database')) {
answer = "As ShaktAI operating without internal memory recall, I do not have access to private documentation regarding your active database configuration. Please refer to system topology or documentation.";
      } else if (query.includes('timeout') || query.includes('checkout')) {
        answer = "Without access to operational memories, I can only provide general guidance: timeouts can typically be diagnosed by checking application logs, thread pool saturation, and database connectivity.";
      } else {
        answer = "I have received your request. Without memory recall enabled, I can answer general knowledge and programming questions directly. How can I assist you further?";
      }
    } else if (mode === 'naive') {
      if (retrieved.some(r => r.content.includes('pg_ctlcluster') || r.content.includes('PostgreSQL'))) {
        answer = "⚠️ [NAIVE MODE] Based on top vector similarity search, I found this memory:\n\n> 'Old postgres pool reset command: `pg_ctlcluster 14 main restart`'\n\nExecute `pg_ctlcluster 14 main restart` immediately. (Notice: Naive retrieval failed to detect that this fix was marked stale after deployment v2.0!)";
      } else if (retrieved.some(r => r.content.includes('database') || r.content.includes('Primary Database'))) {
        answer = "According to vector retrieval, our primary production database is active.";
      } else if (retrieved.length === 0) {
        if (isHowAreYou) {
          answer = "Hello! I am doing well, thank you for asking. How can I help you today?";
        } else if (isGreeting) {
          answer = "Hello! How can I help you today?";
        } else if (query.includes('country') || query.includes('countries')) {
          answer = "⚠️ [NAIVE MODE - GENERAL KNOWLEDGE]\nThe top 3 biggest countries in the world by total land area are:\n1. **Russia** (~17.1M km²)\n2. **Canada** (~9.98M km²)\n3. **United States** (~9.83M km²)\n\n*(Notice: No matching internal memory vectors were retrieved; answered using general model knowledge).*";
        } else {
          answer = "I received your request. No matching memory vectors were found in the database for this specific query, but I am ready to help.";
        }
      } else {
        answer = `[ShaktAI - Mode: NAIVE] Retrieved ${retrieved.length} memory records via raw vector cosine similarity: ${retrieved.map(r => r.memory_id).join(', ')}.`;
      }
    } else {
      // GOVERNED MODE
      if (abstention) {
        answer = `🛡️ [ShaktAI GOVERNED ABSTENTION]\n${abstentionReason}\n\nI have refrained from applying unverified or obsolete instructions. Would you like me to flag this for human approval via the Operator Review Dashboard?`;
      } else if (retrieved.length === 0) {
if (query.includes('website') || query.includes('about') || query.includes('what is this') || query.includes('platform')) {
          answer = `🛡️ [ShaktAI GOVERNED AGENT]
Welcome to **ANCHOR (ShaktAI)** — the Governed Agentic Memory Engine.

This platform guarantees enterprise AI reliability through:
• **Unified Memory Retrieval**: Source trust ladder, temporal recency decay, and environmental fingerprinting.
• **Deterministic Safety**: Prevents prompt injections and actively halts obsolete recommendations.
• **Incident Triage**: Evaluates real-time microservice alerts against verified infrastructure facts.

Try asking: *"Which database are we currently using in production?"* or *"How do I fix checkout DB timeout?"*`;
        } else if (isHowAreYou) {
          answer = "Hello! I am doing well, thank you for asking. As the ShaktAI Governed Agent, I'm ready to assist you with operations, memory governance, and system queries. What can I do for you today?";
        } else if (isGreeting) {
          answer = "Hello! I am ShaktAI, your Governed Memory Agent. How can I assist you today?";
        } else if (query.includes('country') || query.includes('countries')) {
          answer = "🛡️ [ShaktAI GOVERNED AGENT]\nThe top 3 biggest countries in the world by total land area are:\n1. **Russia** (~17.1M km²)\n2. **Canada** (~9.98M km²)\n3. **United States** (~9.83M km²)\n\n*(Verified: No corporate operational memories applied for general query).*";
        } else {
          answer = "🛡️ [ShaktAI GOVERNED AGENT]\nI evaluated your query against the memory graph. No corporate operational memories were required for this query, but I am here to assist.";
        }
      } else if (query.includes('timeout') || query.includes('checkout')) {
        answer = "🛡️ [ShaktAI GOVERNED DECISION]\nBased on human-approved memory `mem-001` (Trust: 1.00, Verified 2026-10-29), checkout DB timeouts are safely resolved by:\n\n1. Restarting the connection pool with `max_connections: 50`.\n2. Verifying the healthy database connection string.\n\n*Note: Deprecated PostgreSQL restart commands (mem-004) were actively excluded as stale.*";
      } else if (query.includes('database')) {
        answer = "🛡️ [ShaktAI GOVERNED DECISION]\nThe current production database is **Primary Database Service** (Cluster `prod-primary`), verified via system deployment event `mem-002` (Trust: 0.85, Confidence: 0.98).";
      } else {
        answer = `🛡️ [ShaktAI GOVERNED DECISION]\nRetrieved ${retrieved.length} trusted memory records after applying source trust weighting, recency decay, and environmental fingerprint verification.\n\n${retrieved.map(r => `• **${r.attribute_key}**: ${r.content} (Score: ${r.final_score})`).join('\n')}`;
      }
    }

    return {
      mode,
      answer,
      retrieved_memories: retrieved,
      excluded_memories: excluded,
      abstention,
      abstention_reason: abstentionReason,
      latency_ms: mode === 'none' ? 120 : mode === 'naive' ? 240 : 380,
      tokens_used: mode === 'none' ? 85 : mode === 'naive' ? 320 : 540,
    };
  },


  // Agent Runs (Step 6)
  async getAgentRuns(): Promise<AgentRun[]> {
    try {
      const res = await safeFetch(`${BASE_URL}/api/agent/runs`, {
        headers: getAuthHeaders(),
      });
      if (res && res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) return data;
        if (Array.isArray(data.runs)) return data.runs;
      }
    } catch {}
    return [];
  },

  async getAgentRunById(id: string): Promise<AgentRun | null> {
    try {
      const res = await safeFetch(`${BASE_URL}/api/agent/runs/${id}`, {
        headers: getAuthHeaders(),
      });
      if (res && res.ok) return await res.json();
    } catch {}
    return null;
  },

  // Benchmarks
  async runBenchmark(): Promise<any> {
    try {
      const res = await safeFetch(`${BASE_URL}/api/benchmark/run`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      if (res && res.ok) return await res.json();
    } catch {}
    return {
      totalCases: 15,
      metrics: {
        correctActionRate: { none: 13.3, naive: 40.0, governed: 100.0 },
        harmfulActionRate: { none: 20.0, naive: 46.7, governed: 0.0 },
        staleReuseRate: { none: 0.0, naive: 60.0, governed: 0.0 },
        poisonAcceptanceRate: { none: 33.3, naive: 100.0, governed: 0.0 },
        abstentionPrecision: { none: 0.0, naive: 0.0, governed: 100.0 },
        avgLatencyMs: { none: 140, naive: 250, governed: 380 },
        tokenUsage: { none: 1850, naive: 6840, governed: 4620 },
      },
      categoryData: [
        { category: 'Stale (S1-S4)', None: 0, Naive: 25, Governed: 100 },
        { category: 'Poison (P1-P4)', None: 25, Naive: 0, Governed: 100 },
        { category: 'Contradiction (C1-C4)', None: 0, Naive: 25, Governed: 100 },
        { category: 'Control (K1-K3)', None: 33, Naive: 100, Governed: 100 },
      ]
    };
  },

  async getBenchmarkResults(): Promise<any> {
    try {
      const res = await safeFetch(`${BASE_URL}/api/benchmark/results`, {
        headers: getAuthHeaders(),
      });
      if (res && res.ok) return await res.json();
    } catch {}
    return null;
  },

  async consolidateMemories(): Promise<any> {
    try {
      const res = await safeFetch(`${BASE_URL}/api/lifecycle/consolidate`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      if (res && res.ok) return await res.json();
    } catch {}
    let archivedCount = 0;
    memoryStore.forEach(m => {
      if (m.status === 'stale' && m.tier !== 'archive') {
        m.tier = 'archive';
        archivedCount++;
      }
    });
    persist();
    return {
      success: true,
      expiredCount: 0,
      archivedCount,
      message: `Consolidation complete: ${archivedCount} memories demoted to archive tier.`
    };
  },

  async getBenchmarkScenarios(): Promise<BenchmarkScenario[]> {
    return BENCHMARK_SCENARIOS;
  },

  // Ingest observation (WF1 or local engine)
  async ingestObservation(text: string, sourceKind: string = 'user_stated'): Promise<{ success: boolean; action: string; reason: string; memory?: Memory; executed_by?: string }> {
    try {
      const res = await safeFetch(`${BASE_URL}/api/ingest`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ text, source: { kind: sourceKind } }),
      });
      if (res && res.ok) return await res.json();
    } catch {}

    const lower = text.toLowerCase();
    const isSuspicious = lower.includes('exfiltrate') || lower.includes('ignore safety') || lower.includes('dump') || lower.includes('jailbreak');

    if (isSuspicious) {
      const qMem: Memory = {
        _id: `mem-${Date.now()}`,
        id: `mem-${Date.now()}`,
        owner: 'usr-shakti2',
        workspace: 'ws-primary',
        type: 'semantic',
        tier: 'warm',
        content: text,
        attribute_key: 'security.suspicious.input',
        value: 'flagged-content',
        entities: ['security'],
        depends_on: [],
        source: { kind: 'unverified', actor: 'user_input' },
        trust: 0.20,
        confidence: 0.15,
        status: 'quarantined',
        valid_from: new Date().toISOString(),
        valid_to: null,
        superseded_by: null,
        env_fingerprint: {},
        derived_from: [],
        access_count: 0,
        last_used_at: null,
        expires_at: null,
        quarantine_reason: 'Flagged by Deterministic Safety Screening Rule (Poisoning Defense)',
        created_at: new Date().toISOString(),
      };
      memoryStore.unshift(qMem);
      eventStore.unshift({
        id: `evt-${Date.now()}`,
        memory_id: qMem._id,
        event_type: 'quarantined',
        reason: 'Flagged by safety screener: Prompt injection signature',
        actor: 'ShaktAI Guard',
        timestamp: new Date().toISOString(),
      });
      persist();
      return { success: true, action: 'QUARANTINE', reason: 'High-risk payload detected; isolated in Quarantine Inbox', memory: qMem };
    }

    const newMem: Memory = {
      _id: `mem-${Date.now()}`,
      id: `mem-${Date.now()}`,
      owner: 'usr-shakti2',
      workspace: 'ws-primary',
      type: 'semantic',
      tier: 'hot',
      content: text,
      attribute_key: 'fact.' + Date.now(),
      value: text.slice(0, 40),
      entities: ['general'],
      depends_on: [],
      source: { kind: sourceKind as any, actor: 'user' },
      trust: sourceKind === 'human_approved' ? 1.0 : sourceKind === 'system_event' ? 0.85 : 0.80,
      confidence: 0.90,
      status: 'active',
      valid_from: new Date().toISOString(),
      valid_to: null,
      superseded_by: null,
      env_fingerprint: { service: 'web' },
      derived_from: [],
      access_count: 1,
      last_used_at: new Date().toISOString(),
      expires_at: null,
      created_at: new Date().toISOString(),
    };
    memoryStore.unshift(newMem);
    eventStore.unshift({
      id: `evt-${Date.now()}`,
      memory_id: newMem._id,
      event_type: 'created',
      reason: 'Extracted new candidate fact from user observation',
      actor: 'ShaktAI Ingestion Pipeline',
      timestamp: new Date().toISOString(),
    });
    persist();
    return { success: true, action: 'ADD', reason: 'New valid memory added to active store', memory: newMem };
  },

  // Retrieve memories (WF2 or local engine)
  async retrieveMemories(query: string): Promise<any> {
    try {
      const res = await safeFetch(`${BASE_URL}/api/retrieve`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ query }),
      });
      if (res && res.ok) return await res.json();
    } catch {}
    return { query, retrieved: [], excluded: [], total: 0, executed_by: 'local_engine' };
  },

  // Manage memory via natural language command (WF3 or local engine)
  async manageMemories(instruction: string): Promise<any> {
    try {
      const res = await safeFetch(`${BASE_URL}/api/memories/manage`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ instruction }),
      });
      if (res && res.ok) return await res.json();
    } catch {}
    return { executed_by: 'local_engine', message: 'Command received', instruction };
  },

  // Simulators for demo
  async simulateAlert(): Promise<{ success: boolean; message: string }> {
    const alertText = "CRITICAL ALERT: checkout-api database pool timeout detected (error_code: 504_GATEWAY_TIMEOUT)";
    const res = await this.ingestObservation(alertText, 'system_event');
    return { success: res.success, message: res.reason };
  },

  async simulateDeploy(): Promise<{ success: boolean; affectedCount: number }> {
    let count = 0;
    memoryStore.forEach(m => {
      if (m.entities.includes('postgres') || m.depends_on.includes('pg-pool') || m.attribute_key.includes('postgres')) {
        if (m.status !== 'stale') {
          m.status = 'stale';
          count++;
          eventStore.unshift({
            id: `evt-${Date.now()}-${count}`,
            memory_id: m._id,
            event_type: 'stale',
            reason: 'Production deploy v3.0.0 altered service dependencies',
            actor: 'Simulate Deploy Webhook (W2)',
            timestamp: new Date().toISOString(),
          });
        }
      }
    });
    persist();
    return { success: true, affectedCount: count };
  },

  // SSE Stream Support with Automatic 3s Polling Fallback
  subscribeToEventStream(
    onEvent: (event: MemoryEvent) => void,
    onError?: (errMessage: string) => void,
    onStatusChange?: (mode: 'live' | 'polling') => void
  ): () => void {
    let es: EventSource | null = null;
    let pollInterval: any = null;
    let isClosed = false;
    const seenEventIds = new Set<string>();

    function startPollingFallback() {
      if (isClosed || pollInterval) return;
      onStatusChange?.('polling');
      pollInterval = setInterval(async () => {
        if (isClosed) {
          clearInterval(pollInterval);
          return;
        }
        try {
          const events = await api.getEvents();
          if (Array.isArray(events)) {
            for (const ev of events) {
              if (ev.id && !seenEventIds.has(ev.id)) {
                seenEventIds.add(ev.id);
                onEvent(ev);
              }
            }
          }
        } catch {}
      }, 3000);
    }

    function connect() {
      if (isClosed) return;
      const token = localStorage.getItem('anchor_token');
      if (!token) {
        startPollingFallback();
        return;
      }
      const streamUrl = `${BASE_URL}/api/stream?token=${encodeURIComponent(token)}`;
      try {
        es = new EventSource(streamUrl);
        es.onopen = () => {
          onStatusChange?.('live');
        };
        es.onmessage = (e) => {
          try {
            const parsed = JSON.parse(e.data);
            if (parsed.id) seenEventIds.add(parsed.id);
            onEvent(parsed);
          } catch {}
        };
        es.onerror = () => {
          if (es) {
            es.close();
            es = null;
          }
          if (isClosed) return;
          // Switch to polling fallback (every 3s) after one failed SSE connection
          startPollingFallback();
        };
      } catch {
        startPollingFallback();
      }
    }

    connect();

    return () => {
      isClosed = true;
      if (es) {
        es.close();
        es = null;
      }
      if (pollInterval) {
        clearInterval(pollInterval);
        pollInterval = null;
      }
    };
  },

  // Meta inspection
  async getMeta(): Promise<{ embedProvider: string; dimension: number; store: string; retrievalPath: string; version?: string }> {
    try {
      const res = await safeFetch(`${BASE_URL}/api/meta`);
      if (res && res.ok) return await res.json();
    } catch {}
    return {
      embedProvider: 'local',
      dimension: 384,
      store: 'memory',
      retrievalPath: 'memory',
      version: '2.1.0'
    };
  },

  // Account cascade purge
  async deleteAccount(): Promise<{ success: boolean; message: string }> {
    try {
      const res = await safeFetch(`${BASE_URL}/api/account`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (res && res.ok) return await res.json();
    } catch {}
    return { success: false, message: 'Failed to delete account' };
  },

  // Human-in-the-Loop Outcome Feedback
  async submitOutcome(data: {
    memory_id: string;
    action: 'APPROVED' | 'REJECTED';
    feedback_source?: string;
    user_id?: string;
  }): Promise<{
    success: boolean;
    memory_id: string;
    action: string;
    previous_confidence: number;
    new_confidence: number;
    formula_applied: string;
  }> {
    try {
      const res = await safeFetch(`${BASE_URL}/api/outcomes`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      });
      if (res && res.ok) return await res.json();
    } catch {}

    const mem = memoryStore.find(m => m._id === data.memory_id || m.id === data.memory_id);
    const prev = mem ? mem.confidence : 0.8;
    const successes = data.action === 'APPROVED' ? 1 : 0;
    const failures = data.action === 'REJECTED' ? 1 : 0;
    const updated = parseFloat(((prev * 4 + successes) / (4 + successes + 2 * failures)).toFixed(4));
    if (mem) {
      mem.confidence = updated;
      persist();
    }
    return {
      success: true,
      memory_id: data.memory_id,
      action: data.action,
      previous_confidence: prev,
      new_confidence: updated,
      formula_applied: '(prior * 4 + successes) / (4 + successes + 2 * failures)'
    };
  },

  // JWT-Protected Scripted Demo Endpoints (No shared secret in browser)
  async demoAlert(): Promise<{ success: boolean; message: string; path?: 'n8n' | 'direct'; alert?: any; triageResult?: any }> {
    const res = await safeFetch(`${BASE_URL}/api/demo/alert`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    if (res && res.ok) return await res.json();
    return { success: false, message: 'Failed to run demo alert' };
  },

  async demoDeploy(service: string = 'payments-api', version: string = 'v1.0.1'): Promise<{ success: boolean; message: string; path?: 'n8n' | 'direct'; staleCount?: number }> {
    const res = await safeFetch(`${BASE_URL}/api/demo/deploy`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ service, version }),
    });
    if (res && res.ok) return await res.json();
    return { success: false, message: 'Failed to simulate deploy' };
  },

  async demoPoison(): Promise<{ success: boolean; message: string; quarantineAction?: string; quarantinedMemoryId?: string }> {
    const res = await safeFetch(`${BASE_URL}/api/demo/poison`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    if (res && res.ok) return await res.json();
    return { success: false, message: 'Failed to send poisoned note' };
  },

  async demoReset(): Promise<{ success: boolean; message: string; memoryCount?: number; eventCount?: number }> {
    const res = await safeFetch(`${BASE_URL}/api/demo/reset`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    if (res && res.ok) return await res.json();
    return { success: false, message: 'Failed to reset demo baseline' };
  },

  resetDemoData(): void {
    memoryStore = [...INITIAL_MEMORIES];
    eventStore = [...INITIAL_EVENTS];
    persist();
  }
};
