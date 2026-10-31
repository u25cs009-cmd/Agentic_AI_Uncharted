/**
 * ANCHOR Repository Abstraction Interface
 * Section 2 of Implementation Plan ("Database Last" Architecture Pattern)
 */

import {
  Memory,
  MemoryEvent,
  OutcomeRecord,
  RetrievalFilter,
  ScoredMemory,
} from './types.js';

export interface Repository {
  // Memory CRUD
  saveMemory(memory: Memory): Promise<Memory>;
  findMemoryById(id: string): Promise<Memory | null>;
  findMemories(filter?: RetrievalFilter): Promise<Memory[]>;
  updateMemory(id: string, updates: Partial<Memory>): Promise<Memory>;
  deleteMemory(id: string): Promise<boolean>;

  // Append-only Event History
  appendEvent(event: MemoryEvent): Promise<void>;
  getEvents(memoryId?: string): Promise<MemoryEvent[]>;

  // Search
  searchVector(embedding: number[], topK: number, filter?: RetrievalFilter): Promise<ScoredMemory[]>;
  searchKeyword(query: string, topK: number, filter?: RetrievalFilter): Promise<ScoredMemory[]>;

  // Quarantine Vault
  getQuarantined(filter?: RetrievalFilter): Promise<Memory[]>;
  releaseQuarantine(id: string): Promise<Memory>;
  rejectQuarantine(id: string): Promise<boolean>;

  // Outcomes & Human Feedback (Operator Review W3)
  saveOutcome(outcome: OutcomeRecord): Promise<void>;
  getOutcomes(memoryId?: string): Promise<OutcomeRecord[]>;

  // Temporal Time-Travel State Reconstruction
  getTimeTravelState(targetTimestamp: string, workspace?: string): Promise<Memory[]>;

  // Real-Time Event Subscription (SSE Feed)
  onEvent(listener: (event: MemoryEvent) => void): () => void;
}

