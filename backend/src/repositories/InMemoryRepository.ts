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
  ScoredMemory
} from '../types/index.js';
import { Repository } from './types.js';
import { INITIAL_MEMORIES, INITIAL_EVENTS } from '../data/seedData.js';
import { calculateRecency, calculateFinalScore, cosineSimilarity } from '../utils/scoring.js';
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
  private emitter = new EventEmitter();

  constructor() {
    this.emitter.setMaxListeners(50);
  }

  async init(): Promise<void> {
    logger.info('Initializing InMemoryRepository with seed memories and events...');
    // Load initial seeds
    INITIAL_MEMORIES.forEach(m => {
      this.memories.set(m._id, { ...m });
    });
    this.events = [...INITIAL_EVENTS];

    // Seed default admin user
    const defaultUser: User = {
      id: 'usr-shakti2',
      email: 'team@shakti2.io',
      name: 'Team Shakti-2 Lead',
      passwordHash: '$2a$10$wN1iN6aY2n648gQ4yC1P.u53fK76k8u30/4p9v/t/Vf54b4/j9QfK', // bcrypt hash for 'password123'
      authProviders: ['local'],
      workspace: 'ws-primary',
      createdAt: new Date().toISOString(),
      created_at: new Date().toISOString(),
      isActive: true,
      lastLoginAt: new Date().toISOString()
    };
    this.users.set(defaultUser.id, defaultUser);

    // Seed sample conversation for the default user
    const defaultConvo: Conversation = {
      id: 'conv-sample-1',
      userId: defaultUser.id,
      title: 'Database & Architecture Overview',
      messages: [
        {
          id: 'msg-1',
          sender: 'user',
          text: 'Which database are we currently using in production?',
          timestamp: '10:00 AM',
          mode: 'governed'
        },
        {
          id: 'msg-2',
          sender: 'agent',
          text: 'The primary production database is MongoDB Atlas (cluster shakti2-primary), configured via Terraform Deploy.',
          timestamp: '10:00 AM',
          mode: 'governed'
        }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.conversations.set(defaultConvo.id, defaultConvo);

    logger.info({ memoryCount: this.memories.size, eventCount: this.events.length }, 'InMemoryRepository initialized');
  }

  async close(): Promise<void> {
    this.emitter.removeAllListeners();
  }

  // --- Memories ---

  async saveMemory(memory: Memory): Promise<Memory> {
    const memId = memory._id || memory.id || `mem-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const fullMemory: Memory = {
      ...memory,
      _id: memId,
      id: memId,
      created_at: memory.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    this.memories.set(memId, fullMemory);
    return fullMemory;
  }

  async getMemoryById(id: string, owner?: string, workspace?: string): Promise<Memory | null> {
    const mem = this.memories.get(id);
    if (!mem) return null;
    if (owner && mem.owner !== owner) return null;
    if (workspace && mem.workspace !== workspace) return null;
    return { ...mem };
  }

  async findMemories(filter?: MemoryFilter): Promise<Memory[]> {
    let result = Array.from(this.memories.values());

    if (filter?.owner) {
      result = result.filter(m => m.owner === filter.owner);
    }
    if (filter?.workspace) {
      result = result.filter(m => m.workspace === filter.workspace);
    }
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
    if (filter?.attribute_key) {
      result = result.filter(m => m.attribute_key === filter.attribute_key);
    }
    if (filter?.entity) {
      const ent = filter.entity.toLowerCase();
      result = result.filter(m => m.entities.some(e => e.toLowerCase() === ent));
    }
    if (filter?.search) {
      const q = filter.search.toLowerCase();
      result = result.filter(m =>
        m.content.toLowerCase().includes(q) ||
        m.attribute_key.toLowerCase().includes(q) ||
        m.value.toLowerCase().includes(q) ||
        m.entities.some(e => e.toLowerCase().includes(q))
      );
    }

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
    for (const [id, mem] of this.memories.entries()) {
      if (mem.derived_from && mem.derived_from.includes(parentId)) {
        if (!owner || mem.owner === owner) {
          this.memories.delete(id);
          deletedCount++;
        }
      }
    }
    return deletedCount;
  }

  // --- Events ---

  async appendEvent(event: MemoryEvent): Promise<void> {
    const fullEvent: MemoryEvent = {
      ...event,
      id: event.id || `evt-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: event.timestamp || new Date().toISOString()
    };
    this.events.unshift(fullEvent);
    this.emitter.emit('memory_event', fullEvent);
  }

  async getEvents(limit: number = 100, owner?: string, workspace?: string): Promise<MemoryEvent[]> {
    let list = [...this.events];
    if (owner || workspace) {
      list = list.filter(e => {
        const mem = this.memories.get(e.memory_id);
        if (!mem) return true;
        if (owner && mem.owner !== owner) return false;
        if (workspace && mem.workspace !== workspace) return false;
        return true;
      });
    }
    return list.slice(0, limit);
  }

  async getEventsForMemory(memoryId: string, owner?: string, workspace?: string): Promise<MemoryEvent[]> {
    const mem = await this.getMemoryById(memoryId, owner, workspace);
    if (!mem) return [];
    return this.events.filter(e => e.memory_id === memoryId);
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
    const qTokens = query.toLowerCase().split(/\W+/).filter(t => t.length > 2);

    for (const mem of candidateMemories) {
      const contentTokens = mem.content.toLowerCase().split(/\W+/);
      const matches = qTokens.filter(t => contentTokens.includes(t));
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
      return this.outcomes.filter(o => o.memory_id === memoryId);
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
      const matchesDep = mem.depends_on.some(d => d.toLowerCase() === compLower);
      const matchesEnt = mem.entities.some(e => e.toLowerCase() === compLower);
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
      createdAt: user.createdAt || user.created_at || now,
      created_at: user.created_at || user.createdAt || now,
      updatedAt: now,
      authProviders: user.authProviders || ['local'],
      isActive: user.isActive !== undefined ? user.isActive : true
    };
    this.users.set(user.id, updated);
    return { ...updated };
  }

  async findUserByEmail(email: string): Promise<User | null> {
    if (!email || typeof email !== 'string') return null;
    const clean = email.toLowerCase().trim();
    const found = Array.from(this.users.values()).find(u => u.email.toLowerCase() === clean);
    return found ? { ...found } : null;
  }

  async findUserById(id: string): Promise<User | null> {
    const found = this.users.get(id);
    return found ? { ...found } : null;
  }

  async findUserByGoogleId(googleId: string): Promise<User | null> {
    const found = Array.from(this.users.values()).find(u => u.googleId === googleId);
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
      if (mem.owner === userId) {
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
    const convos = Array.from(this.conversations.values()).filter(c => c.userId === userId);
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
}
