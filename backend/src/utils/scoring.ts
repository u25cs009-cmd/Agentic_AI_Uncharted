import { Memory, MemoryType } from '../types/index.js';

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
  if (type === 'constraint') return 1.0; // Constraint memories have zero decay

  const createdDate = new Date(createdAt);
  const now = new Date();
  const diffMs = Math.max(0, now.getTime() - createdDate.getTime());
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  let halfLife = 180; // semantic 180d
  if (type === 'episodic') halfLife = 30;
  else if (type === 'semantic') halfLife = 180;
  else if (type === 'procedural') halfLife = 90;
  else if (type === 'preference') halfLife = 120;
  else if (type === 'ephemeral') halfLife = 7;

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
 * Spec Section 12.3: Bayesian Confidence Update
 * confidence = (successes + 2 * confidence0) / (successes + failures + 2)
 */
export function calculateBayesianConfidence(
  confidence0: number,
  successes: number,
  failures: number
): number {
  const numerator = successes + (2 * confidence0);
  const denominator = successes + failures + 2;
  const updated = numerator / denominator;
  return Math.max(0.05, Math.min(0.99, Number(updated.toFixed(4))));
}

/**
 * Blueprint Composite Scoring:
 * final_score = similarity * trust * confidence * recency * validity
 */
export function calculateFinalScore(
  similarity: number,
  trust: number,
  confidence: number,
  recency: number,
  validity: number = 1.0
): number {
  return Number((similarity * trust * confidence * recency * validity).toFixed(4));
}

/**
 * In-memory Cosine Similarity between two numerical vectors
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (!vecA || !vecB || vecA.length === 0 || vecB.length === 0) return 0;
  if (vecA.length !== vecB.length) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  const len = vecA.length;
  for (let i = 0; i < len; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Reciprocal Rank Fusion (RRF) for Hybrid Vector + Keyword Retrieval (Step 3b)
 * Formula: score(d) = sum(1 / (k + rank_i(d))) where k = 60
 */
export function fuseRRF(
  vectorList: Memory[],
  keywordList: Memory[],
  k: number = 60
): { memory: Memory; relevance: number }[] {
  const scoreMap = new Map<string, { memory: Memory; rrfScore: number }>();

  // 1. Process vector list ranks
  for (let rank = 0; rank < vectorList.length; rank++) {
    const mem = vectorList[rank];
    const id = mem._id || mem.id || `vec-${rank}`;
    const current = scoreMap.get(id) || { memory: mem, rrfScore: 0 };
    current.rrfScore += 1 / (k + (rank + 1));
    scoreMap.set(id, current);
  }

  // 2. Process keyword list ranks
  for (let rank = 0; rank < keywordList.length; rank++) {
    const mem = keywordList[rank];
    const id = mem._id || mem.id || `kw-${rank}`;
    const current = scoreMap.get(id) || { memory: mem, rrfScore: 0 };
    current.rrfScore += 1 / (k + (rank + 1));
    scoreMap.set(id, current);
  }

  // Max theoretical score: #1 rank in both lists
  const maxPossible = (1 / (k + 1)) * 2;

  const results = Array.from(scoreMap.values()).map((item) => {
    const normalized = Math.min(1.0, Math.max(0.05, item.rrfScore / maxPossible));
    return {
      memory: item.memory,
      relevance: Number(normalized.toFixed(4))
    };
  });

  return results.sort((a, b) => b.relevance - a.relevance);
}
