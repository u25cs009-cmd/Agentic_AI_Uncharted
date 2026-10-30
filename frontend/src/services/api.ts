import { Memory, MemoryEvent, ChatModeResult, BenchmarkScenario, RetrievalScoring } from '../types/memory';
import { INITIAL_MEMORIES, INITIAL_EVENTS, BENCHMARK_SCENARIOS } from './mockData';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

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
  // Authentication
  async login(email: string): Promise<{ token: string; user: { email: string; name: string } }> {
    try {
      const res = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (res.ok) return await res.json();
    } catch (e) {
      // Fallback
    }
    const token = `jwt_mock_${Date.now()}`;
    const user = { email, name: email.split('@')[0] || 'Member 2 (Frontend)' };
    localStorage.setItem('anchor_token', token);
    localStorage.setItem('anchor_user', JSON.stringify(user));
    return { token, user };
  },

  async register(email: string): Promise<{ token: string; user: { email: string; name: string } }> {
    return this.login(email);
  },

  // Memories
  async getMemories(filter?: { status?: string; type?: string; search?: string }): Promise<Memory[]> {
    try {
      const queryParams = new URLSearchParams(filter as any).toString();
      const res = await fetch(`${BASE_URL}/api/memories?${queryParams}`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) return await res.json();
    } catch (e) {
      // Fallback
    }

    let result = [...memoryStore];
    if (filter?.status) {
      result = result.filter(m => m.status === filter.status);
    }
    if (filter?.type) {
      result = result.filter(m => m.type === filter.type);
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

  async updateMemory(id: string, updates: Partial<Memory>): Promise<Memory> {
    try {
      const res = await fetch(`${BASE_URL}/api/memories/${id}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify(updates),
      });
      if (res.ok) return await res.json();
    } catch (e) {
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
      const res = await fetch(`${BASE_URL}/api/memories/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (res.ok) return await res.json();
    } catch (e) {
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
      const res = await fetch(`${BASE_URL}/api/memories/events`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) return await res.json();
    } catch (e) {}
    return eventStore;
  },

  async getTimeTravelState(timestamp: string): Promise<Memory[]> {
    try {
      const res = await fetch(`${BASE_URL}/api/timetravel?timestamp=${encodeURIComponent(timestamp)}`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) return await res.json();
    } catch (e) {}

    // In mock fallback: filter memories that were created on or before timestamp
    const targetTime = new Date(timestamp).getTime();
    return memoryStore.filter(m => {
      const createdTime = new Date(m.created_at || m.valid_from).getTime();
      return createdTime <= targetTime;
    });
  },

  // Chat with XYRO101
  async chat(message: string, mode: 'none' | 'naive' | 'governed'): Promise<ChatModeResult> {
    try {
      const res = await fetch(`${BASE_URL}/api/chat`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ message, mode, agent: 'XYRO101' }),
      });
      if (res.ok) return await res.json();
    } catch (e) {}

    // Realistic ANCHOR Engine simulation for XYRO101
    const query = message.toLowerCase();
    
    // Evaluate memory matches
    const retrieved: RetrievalScoring[] = [];
    const excluded: RetrievalScoring[] = [];

    for (const mem of memoryStore) {
      // Compute mock cosine similarity based on keyword overlap
      const contentWords = mem.content.toLowerCase().split(/\W+/);
      const queryWords = query.split(/\W+/).filter(w => w.length > 2);
      const matches = queryWords.filter(w => contentWords.includes(w));
      let rawSim = matches.length > 0 ? 0.70 + (matches.length * 0.08) : 0.20;
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
        // No memory retrieval
        continue;
      } else if (mode === 'naive') {
        // Naive memory: accepts anything with high raw similarity regardless of status, trust, or staleness!
        if (rawSim >= 0.50) {
          retrieved.push(scoringObj);
        }
      } else {
        // GOVERNED (XYRO101 Core Guard)
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
      // Rule 1: Two active memories on same attribute key with trust difference < 0.15
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

      // Rule 2: If query relates to an obsolete action that was explicitly excluded as stale
      if (retrieved.length === 0 && excluded.some(e => e.exclusion_reason === 'stale')) {
        abstention = true;
        abstentionReason = "Relevant prior resolution was invalidated by a recent deployment event. Abstaining from obsolete recommendation.";
      }
    }

    // Generate response text
    let answer = "";
    if (mode === 'none') {
      if (query.includes('database')) {
        answer = "As XYRO101 operating in [NONE] mode (zero memory recall), I do not know which database the team is currently utilizing. Please specify your system context.";
      } else if (query.includes('timeout') || query.includes('checkout')) {
        answer = "In [NONE] mode, I have no contextual memory of previous incidents. Generally, timeouts can be diagnosed by checking application logs, thread dumps, and database pool saturation.";
      } else {
        answer = `[XYRO101 - Mode: NONE] Direct response without memory retrieval: "${message}".`;
      }
    } else if (mode === 'naive') {
      if (retrieved.some(r => r.content.includes('pg_ctlcluster') || r.content.includes('PostgreSQL'))) {
        answer = "⚠️ [NAIVE MODE] Based on top vector similarity search, I found this memory:\n\n> 'Old postgres pool reset command: `pg_ctlcluster 14 main restart`'\n\nExecute `pg_ctlcluster 14 main restart` immediately. (Notice: Naive retrieval failed to detect that this fix was marked stale after deployment v2.0!)";
      } else if (retrieved.some(r => r.content.includes('MongoDB Atlas'))) {
        answer = "According to vector retrieval, our database is MongoDB Atlas.";
      } else {
        answer = `[XYRO101 - Mode: NAIVE] Retrieved ${retrieved.length} memory records via raw vector cosine similarity: ${retrieved.map(r => r.memory_id).join(', ')}.`;
      }
    } else {
      // GOVERNED MODE
      if (abstention) {
        answer = `🛡️ [XYRO101 GOVERNED ABSTENTION]\n${abstentionReason}\n\nI have refrained from applying unverified or obsolete instructions. Would you like me to flag this for human approval via the Telegram bot?`;
      } else if (query.includes('timeout') || query.includes('checkout')) {
        answer = "🛡️ [XYRO101 GOVERNED DECISION]\nBased on human-approved memory `mem-001` (Trust: 1.00, Verified 2026-10-29), checkout DB timeouts are safely resolved by:\n\n1. Restarting the connection pool with `max_connections: 50`.\n2. Verifying the healthy MongoDB connection string.\n\n*Note: Deprecated PostgreSQL restart commands (mem-004) were actively excluded as stale.*";
      } else if (query.includes('database')) {
        answer = "🛡️ [XYRO101 GOVERNED DECISION]\nThe current production database is **MongoDB Atlas** (Cluster `shakti2-primary`), verified via system deployment event `mem-002` (Trust: 0.85, Confidence: 0.98).";
      } else {
        answer = `🛡️ [XYRO101 GOVERNED DECISION]\nRetrieved ${retrieved.length} trusted memory records after applying source trust weighting, recency decay, and environmental fingerprint verification.\n\n${retrieved.map(r => `• **${r.attribute_key}**: ${r.content} (Score: ${r.final_score})`).join('\n')}`;
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

  // Benchmarks
  async getBenchmarkScenarios(): Promise<BenchmarkScenario[]> {
    return BENCHMARK_SCENARIOS;
  },

  // Ingest observation
  async ingestObservation(text: string, sourceKind: string = 'user_stated'): Promise<{ success: boolean; action: string; reason: string; memory?: Memory }> {
    try {
      const res = await fetch(`${BASE_URL}/api/ingest`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ text, source: { kind: sourceKind } }),
      });
      if (res.ok) return await res.json();
    } catch (e) {}

    // Check for injection keywords
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
        actor: 'XYRO101 Guard',
        timestamp: new Date().toISOString(),
      });
      persist();
      return { success: true, action: 'QUARANTINE', reason: 'High-risk payload detected; isolated in Quarantine Inbox', memory: qMem };
    }

    // Normal ingestion
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
      actor: 'XYRO101 Ingestion Pipeline',
      timestamp: new Date().toISOString(),
    });
    persist();
    return { success: true, action: 'ADD', reason: 'New valid memory added to active store', memory: newMem };
  },

  // Simulators for demo
  async simulateAlert(): Promise<{ success: boolean; message: string }> {
    const alertText = "CRITICAL ALERT: checkout-api database pool timeout detected (error_code: 504_GATEWAY_TIMEOUT)";
    const res = await this.ingestObservation(alertText, 'system_event');
    return { success: res.success, message: res.reason };
  },

  async simulateDeploy(): Promise<{ success: boolean; affectedCount: number }> {
    // Mark postgres/pg-pool memories as stale
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

  // SSE Stream Support
  subscribeToEventStream(onEvent: (event: MemoryEvent) => void): () => void {
    let es: EventSource | null = null;
    try {
      es = new EventSource(`${BASE_URL}/api/stream`);
      es.onmessage = (e) => {
        try {
          const parsed = JSON.parse(e.data);
          onEvent(parsed);
        } catch (err) {}
      };
      es.onerror = () => {
        if (es) {
          es.close();
          es = null;
        }
      };
    } catch (e) {}

    // Fallback simulated periodic ping when standalone
    const interval = setInterval(() => {
      if (Math.random() > 0.75 && eventStore.length > 0) {
        // Pulse latest event
        onEvent(eventStore[0]);
      }
    }, 12000);

    return () => {
      if (es) es.close();
      clearInterval(interval);
    };
  },

  resetDemoData(): void {
    memoryStore = [...INITIAL_MEMORIES];
    eventStore = [...INITIAL_EVENTS];
    persist();
  }
};

