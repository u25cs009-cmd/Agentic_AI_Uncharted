export type MemoryType = 'semantic' | 'episodic' | 'procedural';
export type MemoryTier = 'hot' | 'warm' | 'archive';
export type MemoryStatus = 'active' | 'stale' | 'quarantined' | 'superseded' | 'expired';

export type SourceKind =
  | 'human_approved'
  | 'system_event'
  | 'user_stated'
  | 'agent_inferred'
  | 'unverified';

export interface MemorySource {
  kind: SourceKind;
  actor?: string;
  source_id?: string;
  timestamp?: string;
}

export interface EnvFingerprint {
  service?: string;
  version?: string;
  cluster?: string;
  commit?: string;
  [key: string]: any;
}

export interface Memory {
  _id: string;
  id?: string;
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
  trust: number;
  confidence: number;
  status: MemoryStatus;
  valid_from: string;
  valid_to: string | null;
  superseded_by: string | null;
  env_fingerprint: EnvFingerprint;
  derived_from: string[];
  access_count: number;
  last_used_at: string | null;
  expires_at: string | null;
  quarantine_reason?: string;
  created_at?: string;
  updated_at?: string;
}

export type EventType =
  | 'created'
  | 'updated'
  | 'superseded'
  | 'quarantined'
  | 'released'
  | 'stale'
  | 'deleted'
  | 'feedback_approved'
  | 'feedback_rejected'
  | 'tombstone';

export interface MemoryEvent {
  id: string;
  memory_id: string;
  event_type: EventType;
  reason: string;
  actor: string;
  timestamp: string;
  old_value?: any;
  new_value?: any;
  snapshot?: Partial<Memory>;
}

export interface Outcome {
  id: string;
  memory_id: string;
  action: 'APPROVED' | 'REJECTED';
  feedback_source: string;
  user_id: string;
  timestamp: string;
  previous_confidence: number;
  new_confidence: number;
  formula_applied: string;
}

export interface EnvEvent {
  id: string;
  service: string;
  version: string;
  changed_components: string[];
  environment: string;
  timestamp: string;
  affected_memory_ids: string[];
}

export interface Entity {
  id: string;
  name: string;
  type: 'service' | 'database' | 'pool' | 'user' | 'component' | 'policy';
  depends_on: string[];
  owned_by?: string;
  metadata?: Record<string, any>;
}

export interface User {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  workspace: string;
  created_at: string;
}

export interface MemoryFilter {
  owner?: string;
  workspace?: string;
  status?: MemoryStatus | string;
  type?: MemoryType | string;
  tier?: MemoryTier | string;
  source?: SourceKind | string;
  search?: string;
  attribute_key?: string;
  entity?: string;
  valid_at?: string;
}

export interface ScoredMemory extends Memory {
  similarity: number;
  recency_score: number;
  final_score: number;
  excluded?: boolean;
  exclusion_reason?: 'stale' | 'quarantined' | 'expired' | 'low_score' | 'env_mismatch' | 'conflict_unresolved';
}

export interface RetrievalResult {
  query: string;
  retrieved: ScoredMemory[];
  excluded: ScoredMemory[];
  abstention: boolean;
  abstention_reason?: string;
}

