import { MemoryType } from '../types/index.js';

/**
 * Blueprint Recency Decay:
 * recency = 0.5 ^ (age_days / half_life)
 * Half-lives: episodic 7d, semantic 60d, procedural 90d; core/archive skips recency
 */
export function calculateRecency(
  createdAt: string,
  type: MemoryType,
  tier?: string
): number {
  if (tier === 'hot') return 1.0;

  const createdDate = new Date(createdAt);
  const now = new Date();
  const diffMs = Math.max(0, now.getTime() - createdDate.getTime());
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  let halfLife = 60; // semantic default
  if (type === 'episodic') halfLife = 7;
  else if (type === 'procedural') halfLife = 90;

  return Math.pow(0.5, diffDays / halfLife);
}

/**
 * Blueprint Bayesian Confidence Update:
 * confidence = (prior * 4 + successes) / (4 + successes + 2 * failures)
 */
export function calculateUpdatedConfidence(
  priorConfidence: number,
  successes: number,
  failures: number
): number {
  const numerator = (priorConfidence * 4) + successes;
  const denominator = 4 + successes + (2 * failures);
  const updated = numerator / denominator;
  return Math.max(0.05, Math.min(0.99, Number(updated.toFixed(4))));
}

/**
 * Blueprint Composite Scoring:
 * final_score = similarity * trust * confidence * recency
 */
export function calculateFinalScore(
  similarity: number,
  trust: number,
  confidence: number,
  recency: number
): number {
  return Number((similarity * trust * confidence * recency).toFixed(4));
}

/**
 * In-memory Cosine Similarity between two numerical vectors
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (!vecA || !vecB || vecA.length === 0 || vecB.length === 0) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  const len = Math.min(vecA.length, vecB.length);
  for (let i = 0; i < len; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}
