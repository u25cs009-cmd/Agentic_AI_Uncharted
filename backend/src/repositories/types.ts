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

export interface Repository {
  name: string;
  init(): Promise<void>;
  close(): Promise<void>;

  // Memories
  saveMemory(memory: Memory): Promise<Memory>;
  getMemoryById(id: string, owner?: string, workspace?: string): Promise<Memory | null>;
  findMemories(filter?: MemoryFilter): Promise<Memory[]>;
  updateMemory(id: string, updates: Partial<Memory>, owner?: string, workspace?: string): Promise<Memory | null>;
  deleteMemory(id: string, owner?: string, workspace?: string): Promise<boolean>;
  deleteDerivedMemories(parentId: string, owner?: string, workspace?: string): Promise<number>;

  // Events & Audit
  appendEvent(event: MemoryEvent): Promise<void>;
  getEvents(limit?: number, owner?: string, workspace?: string): Promise<MemoryEvent[]>;
  getEventsForMemory(memoryId: string, owner?: string, workspace?: string): Promise<MemoryEvent[]>;

  // Transactions (Step 5)
  ingestTransactional(memory: Memory, event: MemoryEvent): Promise<{ memory: Memory; event: MemoryEvent }>;
  supersedeTransactional(
    oldMemoryId: string,
    newMemory: Memory,
    oldEvent: MemoryEvent,
    newEvent: MemoryEvent,
    owner?: string,
    workspace?: string
  ): Promise<{ newMemory: Memory }>;
  cascadeDeleteTransactional(
    targetMemoryId: string,
    tombstoneEvents: MemoryEvent[],
    owner?: string,
    workspace?: string
  ): Promise<{ deletedCount: number }>;

  // Search
  searchVector(embedding: number[], topK: number, filter?: MemoryFilter): Promise<ScoredMemory[]>;
  searchKeyword(query: string, topK: number, filter?: MemoryFilter): Promise<ScoredMemory[]>;
  searchAtlasHybrid?(
    queryText: string,
    queryEmbedding: number[],
    topK?: number,
    filter?: MemoryFilter
  ): Promise<{ results: ScoredMemory[]; retrievalPath: 'atlas-hybrid'; indexError?: string }>;

  // Events & Feedback
  saveOutcome(outcome: Outcome): Promise<void>;
  getOutcomes(memoryId?: string): Promise<Outcome[]>;
  saveEnvEvent(event: EnvEvent): Promise<void>;
  getEnvEvents(limit?: number): Promise<EnvEvent[]>;

  // Entities & Graph
  saveEntity(entity: Entity): Promise<void>;
  getEntities(): Promise<Entity[]>;
  findDownstreamMemories(componentName: string): Promise<Memory[]>;

  // Users & Isolation
  saveUser(user: User): Promise<User>;
  findUserByEmail(email: string): Promise<User | null>;
  findUserById(id: string): Promise<User | null>;
  findUserByGoogleId(googleId: string): Promise<User | null>;
  updateUser(id: string, updates: Partial<User>): Promise<User | null>;
  deleteUserAccount(userId: string): Promise<boolean>;

  // Conversations & Chat History
  saveConversation(conversation: Conversation): Promise<Conversation>;
  findConversationsByUser(userId: string): Promise<Conversation[]>;
  findConversationById(id: string, userId: string): Promise<Conversation | null>;
  deleteConversation(id: string, userId: string): Promise<boolean>;

  // Live SSE listener
  subscribeEvents(listener: (event: MemoryEvent) => void): () => void;
}
