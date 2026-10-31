import { EventEmitter } from 'events';
import {
  Memory,
  MemoryEvent,
  Outcome,
  EnvEvent,
  Entity,
  User,
  Conversation,
  MemoryFilter,
  ScoredMemory,
  AgentRun
} from '../types/index.js';
import { Repository } from './types.js';
import { INITIAL_MEMORIES, INITIAL_EVENTS } from '../data/seedData.js';
import { generateEmbedding } from '../services/embedding.js';
import { calculateRecency, calculateFinalScore, cosineSimilarity } from '../utils/scoring.js';
import {
  ScopedAccessContext,
  filterScopedInMemoryMemories,
  filterScopedInMemoryEvents
} from './scopedAccess.js';
import { logger } from '../utils/logger.js';

export class InMemoryRepository implements Repository {
  public name = 'InMemoryRepository';
  private memories: Map<string, Memory> = new Map();
  private events: MemoryEvent[] = [];
  private outcomes: Outcome[] = [];
  private envEvents: EnvEvent[] = [];
  private entities: Map<string, Entity> = new Map();
  private users: Map<string, User> = new Map();
  private conversations: Map<string, Conversation> = new Map();
  private agentRuns: AgentRun[] = [];
  private emitter = new EventEmitter();

  constructor() {
    this.emitter.setMaxListeners(50);
  }

  async init(): Promise<void> {
    logger.info('Initializing InMemoryRepository with seed memories and events...');
    this.memories.clear();
    this.events = [];
    this.users.clear();
    this.conversations.clear();

    // Populate initial memories with embeddings and normalized scoping
    for (const mem of INITIAL_MEMORIES) {
      const memEmbedding = mem.embedding || generateEmbedding(mem.content);
      const ws = mem.workspaceId || mem.workspace || 'ws-primary';
      const own = mem.ownerId || mem.owner || 'usr-shakti2';
      const vis = mem.visibility || 'workspace';
      this.memories.set(mem._id, {
        ...mem,
        owner: own,
        ownerId: own,
        workspace: ws,
        workspaceId: ws,
        visibility: vis,
        embedding: memEmbedding
      });
    }

    // Populate initial events with scoping
    for (const evt of INITIAL_EVENTS) {
      this.events.push({
        ...evt,
        workspaceId: (evt as any).workspaceId || 'ws-primary',
        workspace: (evt as any).workspace || 'ws-primary',
        ownerId: (evt as any).ownerId || 'usr-shakti2',
        owner: (evt as any).owner || 'usr-shakti2',
        visibility: (evt as any).visibility || 'workspace'
      });
    }

    // Seed default admin user
    const defaultUser: User = {
      id: 'usr-shakti2',
      email: 'team@shakti2.io',
      name: 'Team Shakti-2 Lead',
      passwordHash: '$2a$10$wN1iN6aY2n648gQ4yC1P.u53fK76k8u30/4p9v/t/Vf54b4/j9QfK', // bcrypt hash for 'password123'
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.users.set(defaultUser.id, defaultUser);

    logger.info({ memoryCount: this.memories.size, eventCount: this.events.length }, 'InMemoryRepository initialized');
  }

  async close(): Promise<void> {
    this.emitter.removeAllListeners();
  }

  // --- Memories ---

  async saveMemory(memory: Memory): Promise<Memory> {
    const memId = memory._id || memory.id || `mem-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const ws = memory.workspaceId || memory.workspace || 'ws-primary';
    const own = memory.ownerId || memory.owner || 'usr-shakti2';
    const vis = memory.visibility || 'workspace';

    const fullMemory: Memory = {
      ...memory,
      _id: memId,
      id: memId,
      owner: own,
      ownerId: own,
      workspace: ws,
      workspaceId: ws,
      visibility: vis,
      created_at: memory.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    this.memories.set(memId, fullMemory);
    return fullMemory;
  }

  async getMemoryById(id: string, owner?: string, workspace?: string): Promise<Memory | null> {
    const mem = this.memories.get(id);
    if (!mem) return null;

    const ctx: ScopedAccessContext = {
      userId: owner || '',
      workspaceId: workspace || 'ws-primary'
    };
    const scoped = filterScopedInMemoryMemories([mem], ctx);
    if (scoped.length === 0) return null;

    return { ...mem };
  }

  async findMemories(filter?: MemoryFilter): Promise<Memory[]> {
    const ctx: ScopedAccessContext = {
      userId: filter?.ownerId || filter?.owner || '',
      workspaceId: filter?.workspaceId || filter?.workspace || 'ws-primary'
    };

    const all = Array.from(this.memories.values());
    const result = filterScopedInMemoryMemories(all, ctx, filter);
    return result.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
  }

  async updateMemory(
    id: string,
    updates: Partial<Memory>,
    owner?: string,
    workspace?: string
  ): Promise<Memory | null> {
    const existing = await this.getMemoryById(id, owner, workspace);
    if (!existing) return null;

    const updated: Memory = {
      ...existing,
      ...updates,
      updated_at: new Date().toISOString()
    };
    this.memories.set(id, updated);
    return { ...updated };
  }

  async deleteMemory(id: string, owner?: string, workspace?: string): Promise<boolean> {
    const existing = await this.getMemoryById(id, owner, workspace);
    if (!existing) return false;
    return this.memories.delete(id);
  }

  async deleteDerivedMemories(parentId: string, owner?: string, workspace?: string): Promise<number> {
    let deletedCount = 0;
    const ctx: ScopedAccessContext = {
      userId: owner || '',
      workspaceId: workspace || 'ws-primary'
    };

    for (const [id, mem] of this.memories.entries()) {
      if (mem.derived_from && mem.derived_from.includes(parentId)) {
        const allowed = filterScopedInMemoryMemories([mem], ctx);
        if (allowed.length > 0) {
          this.memories.delete(id);
          deletedCount++;
        }
      }
    }
    return deletedCount;
  }

  // --- Events ---

  async appendEvent(event: MemoryEvent): Promise<void> {
    const ws = event.workspaceId || event.workspace || 'ws-primary';
    const own = event.ownerId || event.owner || 'usr-shakti2';
    const vis = event.visibility || 'workspace';

    const fullEvent: MemoryEvent = {
      ...event,
      id: event.id || `evt-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      workspaceId: ws,
      workspace: ws,
      ownerId: own,
      owner: own,
      visibility: vis,
      timestamp: event.timestamp || new Date().toISOString()
    };
    this.events.unshift(fullEvent);
    this.emitter.emit('memory_event', fullEvent);
  }

  async getEvents(limit: number = 100, owner?: string, workspace?: string): Promise<MemoryEvent[]> {
    const ctx: ScopedAccessContext = {
      userId: owner || '',
      workspaceId: workspace || 'ws-primary'
    };
    const scoped = filterScopedInMemoryEvents(this.events, ctx);
    return scoped.slice(0, limit);
  }

  async getEventsForMemory(memoryId: string, owner?: string, workspace?: string): Promise<MemoryEvent[]> {
    const ctx: ScopedAccessContext = {
      userId: owner || '',
      workspaceId: workspace || 'ws-primary'
    };
    return filterScopedInMemoryEvents(this.events, ctx, memoryId);
  }

  // --- Transactions (Step 5) ---

  async ingestTransactional(memory: Memory, event: MemoryEvent): Promise<{ memory: Memory; event: MemoryEvent }> {
    const memoriesSnapshot = new Map(this.memories);
    const eventsSnapshot = [...this.events];

    try {
      const savedMem = await this.saveMemory(memory);
      await this.appendEvent(event);
      return { memory: savedMem, event };
    } catch (err) {
      this.memories = memoriesSnapshot;
      this.events = eventsSnapshot;
      throw err;
    }
  }

  async supersedeTransactional(
    oldMemoryId: string,
    newMemory: Memory,
    oldEvent: MemoryEvent,
    newEvent: MemoryEvent,
    owner?: string,
    workspace?: string
  ): Promise<{ newMemory: Memory }> {
    const memoriesSnapshot = new Map(this.memories);
    const eventsSnapshot = [...this.events];

    try {
      const now = new Date().toISOString();
      await this.updateMemory(oldMemoryId, {
        status: 'superseded',
        valid_to: now,
        superseded_by: newMemory._id || newMemory.id
      }, owner, workspace);
      await this.appendEvent(oldEvent);

      const savedNewMem = await this.saveMemory(newMemory);
      await this.appendEvent(newEvent);
      return { newMemory: savedNewMem };
    } catch (err) {
      this.memories = memoriesSnapshot;
      this.events = eventsSnapshot;
      throw err;
    }
  }

  async cascadeDeleteTransactional(
    targetMemoryId: string,
    tombstoneEvents: MemoryEvent[],
    owner?: string,
    workspace?: string
  ): Promise<{ deletedCount: number }> {
    const memoriesSnapshot = new Map(this.memories);
    const eventsSnapshot = [...this.events];

    try {
      let count = 0;
      const deletedMain = await this.deleteMemory(targetMemoryId, owner, workspace);
      if (deletedMain) count++;
      const derivedCount = await this.deleteDerivedMemories(targetMemoryId, owner, workspace);
      count += derivedCount;

      for (const evt of tombstoneEvents) {
        await this.appendEvent(evt);
      }
      return { deletedCount: count };
    } catch (err) {
      this.memories = memoriesSnapshot;
      this.events = eventsSnapshot;
      throw err;
    }
  }

  // --- Search (Vector & Keyword) ---

  async searchVector(embedding: number[], topK: number = 20, filter?: MemoryFilter): Promise<ScoredMemory[]> {
    const candidateMemories = await this.findMemories(filter);
    const scored: ScoredMemory[] = [];

    for (const mem of candidateMemories) {
      let similarity = 0.5;
      if (mem.embedding && mem.embedding.length > 0) {
        similarity = cosineSimilarity(embedding, mem.embedding);
      } else {
        similarity = mem.status === 'active' ? 0.85 : 0.40;
      }

      const recency = calculateRecency(mem.created_at || mem.valid_from, mem.type, mem.tier);
      const finalScore = calculateFinalScore(similarity, mem.trust, mem.confidence, recency);

      scored.push({
        ...mem,
        similarity: Number(similarity.toFixed(4)),
        recency_score: Number(recency.toFixed(4)),
        final_score: finalScore
      });
    }

    scored.sort((a, b) => b.final_score - a.final_score);
    return scored.slice(0, topK);
  }

  async searchKeyword(query: string, topK: number = 20, filter?: MemoryFilter): Promise<ScoredMemory[]> {
    const candidateMemories = await this.findMemories(filter);
    const scored: ScoredMemory[] = [];
    const qTokens = query.toLowerCase().split(/\W+/).filter((t) => t.length > 2);

    for (const mem of candidateMemories) {
      const contentTokens = mem.content.toLowerCase().split(/\W+/);
      const matches = qTokens.filter((t) => contentTokens.includes(t));
      const keywordOverlap = qTokens.length > 0 ? matches.length / qTokens.length : 0.1;
      const similarity = Math.min(0.98, Math.max(0.1, keywordOverlap));

      const recency = calculateRecency(mem.created_at || mem.valid_from, mem.type, mem.tier);
      const finalScore = calculateFinalScore(similarity, mem.trust, mem.confidence, recency);

      scored.push({
        ...mem,
        similarity: Number(similarity.toFixed(4)),
        recency_score: Number(recency.toFixed(4)),
        final_score: finalScore
      });
    }

    scored.sort((a, b) => b.final_score - a.final_score);
    return scored.slice(0, topK);
  }

  // --- Feedback & Outcomes ---

  async saveOutcome(outcome: Outcome): Promise<void> {
    this.outcomes.unshift({ ...outcome });
  }

  async getOutcomes(memoryId?: string): Promise<Outcome[]> {
    if (memoryId) {
      return this.outcomes.filter((o) => o.memory_id === memoryId);
    }
    return [...this.outcomes];
  }

  async saveEnvEvent(event: EnvEvent): Promise<void> {
    this.envEvents.unshift({ ...event });
  }

  async getEnvEvents(limit: number = 50): Promise<EnvEvent[]> {
    return this.envEvents.slice(0, limit);
  }

  // --- Entities & Graph ---

  async saveEntity(entity: Entity): Promise<void> {
    this.entities.set(entity.id, { ...entity });
  }

  async getEntities(): Promise<Entity[]> {
    return Array.from(this.entities.values());
  }

  async findDownstreamMemories(componentName: string): Promise<Memory[]> {
    const compLower = componentName.toLowerCase();
    const affected: Memory[] = [];
    for (const mem of this.memories.values()) {
      const matchesDep = mem.depends_on.some((d) => d.toLowerCase() === compLower);
      const matchesEnt = mem.entities.some((e) => e.toLowerCase() === compLower);
      if (matchesDep || matchesEnt) {
        affected.push({ ...mem });
      }
    }
    return affected;
  }

  // --- Users & Isolation ---

  async saveUser(user: User): Promise<User> {
    const now = new Date().toISOString();
    const updated: User = {
      ...user,
      createdAt: user.createdAt || now,
      updatedAt: now
    };
    this.users.set(user.id, updated);
    return { ...updated };
  }

  async findUserByEmail(email: string): Promise<User | null> {
    const found = Array.from(this.users.values()).find((u) => u.email.toLowerCase() === email.toLowerCase());
    return found ? { ...found } : null;
  }

  async findUserById(id: string): Promise<User | null> {
    const found = this.users.get(id);
    return found ? { ...found } : null;
  }

  async findUserByGoogleId(googleId: string): Promise<User | null> {
    const found = Array.from(this.users.values()).find((u) => u.googleId === googleId);
    return found ? { ...found } : null;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | null> {
    const existing = this.users.get(id);
    if (!existing) return null;
    const updated: User = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString()
    };
    this.users.set(id, updated);
    return { ...updated };
  }

  async deleteUserAccount(userId: string): Promise<boolean> {
    for (const [id, mem] of this.memories.entries()) {
      if (mem.owner === userId || mem.ownerId === userId) {
        this.memories.delete(id);
      }
    }
    for (const [id, convo] of this.conversations.entries()) {
      if (convo.userId === userId) {
        this.conversations.delete(id);
      }
    }
    return this.users.delete(userId);
  }

  // --- Conversations & Chat History ---

  async saveConversation(conversation: Conversation): Promise<Conversation> {
    const now = new Date().toISOString();
    const convId = conversation.id || conversation._id || `conv-${Date.now()}`;
    const fullConvo: Conversation = {
      ...conversation,
      id: convId,
      _id: convId,
      createdAt: conversation.createdAt || now,
      updatedAt: now
    };
    this.conversations.set(convId, fullConvo);
    return { ...fullConvo };
  }

  async findConversationsByUser(userId: string): Promise<Conversation[]> {
    const convos = Array.from(this.conversations.values()).filter((c) => c.userId === userId);
    return convos.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  async findConversationById(id: string, userId: string): Promise<Conversation | null> {
    const convo = this.conversations.get(id);
    if (!convo || convo.userId !== userId) return null;
    return { ...convo };
  }

  async deleteConversation(id: string, userId: string): Promise<boolean> {
    const convo = this.conversations.get(id);
    if (!convo || convo.userId !== userId) return false;
    return this.conversations.delete(id);
  }

  // --- Live SSE ---

  subscribeEvents(listener: (event: MemoryEvent) => void): () => void {
    this.emitter.on('memory_event', listener);
    return () => {
      this.emitter.off('memory_event', listener);
    };
  }

  // --- Agent Runs (Step 6) ---

  async saveAgentRun(run: AgentRun): Promise<AgentRun> {
    const runId = run._id || run.id || `run-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const fullRun: AgentRun = {
      ...run,
      _id: runId,
      id: runId,
      ts: run.ts || new Date().toISOString()
    };
    this.agentRuns.unshift(fullRun);
    return { ...fullRun };
  }

  async getAgentRuns(workspaceId: string, limit: number = 50): Promise<AgentRun[]> {
    return this.agentRuns
      .filter(r => r.workspaceId === workspaceId)
      .slice(0, limit);
  }

  async getAgentRunById(id: string, workspaceId: string): Promise<AgentRun | null> {
    const found = this.agentRuns.find(
      r => (r._id === id || r.id === id) && r.workspaceId === workspaceId
    );
    return found ? { ...found } : null;
  }
}
