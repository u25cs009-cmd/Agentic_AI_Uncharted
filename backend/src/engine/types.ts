/**
 * ANCHOR AI Memory Engine - Core Domain Types
 * Agent: XYRO101
 * Team: Shakti-2 | Track 1: Agentic Memory
 */

export type MemoryType = 'semantic' | 'episodic' | 'procedural';
export type MemoryTier = 'hot' | 'warm' | 'archive';
export type MemoryStatus = 'active' | 'stale' | 'superseded' | 'quarantined' | 'tombstone';

export type SourceKind =
  | 'human_approved'
  | 'system_event'
  | 'user_stated'
  | 'agent_inferred'
  | 'unverified';

export interface MemorySource {
  kind: SourceKind;
  actor?: string;
  channel?: string;
  raw_observation_id?: string;
}

export interface EnvFingerprint {
  service: string;
  version: string;
  environment?: string;
  cluster?: string;
}

export interface Memory {
  id: string;
  owner: string;
  workspace: string;
  type: MemoryType;
  tier: MemoryTier;
  content: string;
  embedding?: number[];
  entities: string[];
  attribute_key: string;
  value: string;
  depends_on: string[];
  source: MemorySource;
  trust: number;       // 0.00 to 1.00
  confidence: number;  // 0.00 to 1.00
  status: MemoryStatus;
  valid_from: string;  // ISO timestamp
  valid_to?: string | null;
  superseded_by?: string | null;
  quarantine_reason?: string | null;
  env_fingerprint?: EnvFingerprint;
  derived_from?: string[];
  access_count: number;
  last_used_at?: string | null;
  expires_at?: string | null;
  created_at: string;
  updated_at: string;
}

export type EventType =
  | 'created'
  | 'updated'
  | 'superseded'
  | 'quarantined'
  | 'released'
  | 'stale'
  | 'feedback_approved'
  | 'feedback_rejected'
  | 'tombstone';

export interface MemoryEvent {
  id: string;
  memory_id: string;
  event_type: EventType;
  timestamp: string;
  reason: string;
  actor: string;
  diff?: {
    before?: Partial<Memory>;
    after?: Partial<Memory>;
  };
}

export type DecisionType = 'ADD' | 'UPDATE' | 'SUPERSEDE' | 'QUARANTINE' | 'IGNORE';

export interface DecisionResult {
  decision: DecisionType;
  reason: string;
  target_memory_id?: string;
  rule_applied?: string;
  is_override?: boolean;
}

export interface CandidateFact {
  type: MemoryType;
  tier?: MemoryTier;
  content: string;
  entities: string[];
  attribute_key: string;
  value: string;
  depends_on: string[];
  source: MemorySource;
  trust: number;
  confidence: number;
  env_fingerprint?: EnvFingerprint;
}

export interface ObservationInput {
  content: string;
  source: MemorySource;
  owner?: string;
  workspace?: string;
  env_fingerprint?: EnvFingerprint;
  entities?: string[];
}

export interface IngestionResult {
  observation_id: string;
  sanitized_content: string;
  decision: DecisionType;
  reason: string;
  memory?: Memory;
  quarantined_memory?: Memory;
  events: MemoryEvent[];
}

export interface ScoredMemory {
  memory: Memory;
  similarity: number;
  trust: number;
  confidence: number;
  recency: number;
  final_score: number;
  excluded: boolean;
  exclusion_reason?: string;
}

export interface RetrievalFilter {
  owner?: string;
  workspace?: string;
  type?: string;
  tier?: string;
  status?: string;
  source?: string;
  search?: string;
}

export interface RetrievalRequest {
  query: string;
  owner?: string;
  workspace?: string;
  env_fingerprint?: EnvFingerprint;
  top_k?: number;
}

export interface RetrievalResponse {
  query: string;
  usable_memories: ScoredMemory[];
  filtered_memories: ScoredMemory[];
  abstained: boolean;
  abstention_reason?: string | null;
  formatted_untrusted_context: string;
}

export type ChatMode = 'none' | 'naive' | 'governed';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  citations?: string[];
  metrics?: {
    similarity?: number;
    trust?: number;
    confidence?: number;
    recency?: number;
    final_score?: number;
  };
  abstained?: boolean;
  abstention_reason?: string | null;
}

export interface ChatRequest {
  query: string;
  mode?: ChatMode;
  owner?: string;
  workspace?: string;
  env_fingerprint?: EnvFingerprint;
}

export interface ChatResponse {
  query: string;
  mode: ChatMode;
  answer: string;
  retrieved_memories: ScoredMemory[];
  abstained: boolean;
  abstention_reason?: string | null;
  metrics: {
    similarity: number;
    trust: number;
    confidence: number;
    recency: number;
    final_score: number;
  };
}

export interface OutcomeRecord {
  id: string;
  memory_id: string;
  action_proposed: string;
  result: 'approved' | 'rejected';
  actor: string;
  timestamp: string;
  notes?: string;
}

export interface DeploymentEvent {
  service: string;
  version: string;
  changed_components: string[];
  timestamp: string;
  actor?: string;
}

export interface DeploymentResult {
  service: string;
  version: string;
  affected_memories_count: number;
  affected_memory_ids: string[];
  events: MemoryEvent[];
}

