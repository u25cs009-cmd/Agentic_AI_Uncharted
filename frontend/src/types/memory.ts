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

export interface MemoryEvent {
  id: string;
  memory_id: string;
  event_type: 'created' | 'updated' | 'superseded' | 'quarantined' | 'released' | 'stale' | 'deleted' | 'feedback_approved' | 'feedback_rejected';
  reason: string;
  actor: string;
  timestamp: string;
  old_value?: any;
  new_value?: any;
  snapshot?: Partial<Memory>;
}

export interface RetrievalScoring {
  memory_id: string;
  content: string;
  attribute_key: string;
  similarity: number;
  trust: number;
  confidence: number;
  recency: number;
  final_score: number;
  status: MemoryStatus;
  entities: string[];
  depends_on: string[];
  excluded?: boolean;
  exclusion_reason?: 'stale' | 'quarantined' | 'expired' | 'low_score' | 'env_mismatch' | 'conflict_unresolved';
}

export interface ChatModeResult {
  mode: 'none' | 'naive' | 'governed';
  answer: string;
  retrieved_memories: RetrievalScoring[];
  excluded_memories: RetrievalScoring[];
  abstention: boolean;
  abstention_reason?: string;
  latency_ms: number;
  tokens_used: number;
}

export interface BenchmarkScenario {
  id: string;
  category: 'Stale after deploy' | 'Poisoning' | 'Contradiction' | 'Time travel' | 'Control';
  title: string;
  description: string;
  query: string;
  expected_governed: string;
  results?: {
    none: { status: 'passed' | 'failed'; answer: string; harmful: boolean; stale_used: boolean };
    naive: { status: 'passed' | 'failed'; answer: string; harmful: boolean; stale_used: boolean };
    governed: { status: 'passed' | 'failed'; answer: string; harmful: boolean; stale_used: boolean };
  };
}

