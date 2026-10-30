import {
  Memory,
  MemoryEvent,
  Outcome,
  EnvEvent,
  Entity,
  User,
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

  // Search
  searchVector(embedding: number[], topK: number, filter?: MemoryFilter): Promise<ScoredMemory[]>;
  searchKeyword(query: string, topK: number, filter?: MemoryFilter): Promise<ScoredMemory[]>;

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
  deleteUserAccount(userId: string): Promise<boolean>;

  // Live SSE listener
  subscribeEvents(listener: (event: MemoryEvent) => void): () => void;
}
