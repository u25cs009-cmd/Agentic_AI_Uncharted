export type MemoryType = 'semantic' | 'episodic' | 'procedural' | 'constraint' | 'preference' | 'ephemeral';
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
  ownerId?: string;
  workspace: string;
  workspaceId?: string;
  visibility?: 'private' | 'workspace';
  type: MemoryType;
  tier: MemoryTier;
  content: string;
  embedding?: number[];
  embeddingModel?: string;
  dimension?: number;
  entities: string[];
  attribute_key: string;
  value: string;
  depends_on: string[];
  source: MemorySource;
  trust: number;
  confidence: number;
  status: MemoryStatus;
  valid_from: string;
  valid_to?: string | null;
  superseded_by?: string | null;
  env_fingerprint?: EnvFingerprint;
  derived_from?: string[];
  access_count?: number;
  last_used_at?: string | null;
  expires_at?: string | null;
  expiresAt?: string | null;
  purgeAt?: string | null;
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
  memory_id?: string;
  workspaceId?: string;
  workspace?: string;
  ownerId?: string;
  owner?: string;
  visibility?: 'private' | 'workspace';
  idempotencyKey?: string;
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
  idempotencyKey?: string;
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
  type: string;
  dependencies?: string[];
  depends_on?: string[];
  owned_by?: string;
  description?: string;
  metadata?: Record<string, any>;
}

export type AuthProviderType = 'local' | 'google';

export interface User {
  id: string;
  _id?: string;
  email: string;
  name?: string;
  passwordHash?: string;
  googleId?: string;
  avatarUrl?: string;
  profilePicture?: string;
  authProviders?: AuthProviderType[];
  workspace?: string;
  createdAt: string;
  created_at?: string;
  updatedAt?: string;
  lastLoginAt?: string;
  isActive?: boolean;
  resetPasswordToken?: string;
  resetPasswordExpires?: string;
}

export interface ConversationMessage {
  id: string;
  role?: 'user' | 'assistant' | 'system';
  sender?: 'user' | 'agent';
  content?: string;
  text?: string;
  timestamp: string;
  mode?: 'none' | 'naive' | 'governed';
  retrievedMemoryIds?: string[];
  result?: any;
  comparison?: any;
  metadata?: any;
}

export interface Conversation {
  id: string;
  _id?: string;
  userId: string;
  title: string;
  mode?: 'none' | 'naive' | 'governed';
  messages: ConversationMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface MemoryFilter {
  owner?: string;
  ownerId?: string;
  workspace?: string;
  workspaceId?: string;
  status?: string;
  type?: string;
  tier?: string;
  source?: string;
  attribute_key?: string;
  entity?: string;
  search?: string;
  visibility?: 'private' | 'workspace';
  valid_at?: string;
}

export interface ScoredMemory extends Memory {
  similarity: number;
  recency_score: number;
  final_score: number;
  excluded?: boolean;
  exclusion_reason?: string;
}

export interface RetrievalResult {
  query: string;
  retrieved: ScoredMemory[];
  excluded: ScoredMemory[];
  abstention: boolean;
  abstention_reason: string;
  mode: 'none' | 'naive' | 'governed';
  retrievalPath?: 'atlas-hybrid' | 'memory';
}

export interface AgentRun {
  _id: string;
  id?: string;
  workspaceId: string;
  ownerId?: string;
  ts: string;
  mode: 'none' | 'naive' | 'governed';
  input: string;
  retrievalPath: 'atlas-hybrid' | 'memory';
  candidates: {
    retrieved: ScoredMemory[];
    excluded: ScoredMemory[];
  };
  structuredOutput: {
    diagnosis: string;
    proposedFix: string;
    citedMemoryIds: string[];
    confidence: number;
    warnings: string[];
    abstain: boolean;
    abstainReason?: string | null;
  };
  latencyMs: number;
  tokensUsed: number;
  llmFallback: boolean;
  answer: string;
}
