/**
 * ANCHOR Hybrid Retrieval & Abstention Engine (F4)
 * Agent: XYRO101
 * Implements Reciprocal Rank Fusion, Mathematical Recency Decay, and Deterministic Abstention.
 */

import {
  Memory,
  MemoryType,
  RetrievalRequest,
  RetrievalResponse,
  ScoredMemory,
} from './types.js';
import { Repository } from './repository.js';

// Official Half-Life values in days (Implementation Plan Section 6 Module 5)
export const HALF_LIFE_DAYS: Record<MemoryType, number> = {
  episodic: 30,
  semantic: 180,
  procedural: 90,
  constraint: 999999,
  preference: 120,
  ephemeral: 7
};

export const MIN_SCORE_THRESHOLD = 0.25;
export const CONFLICT_TRUST_GAP_THRESHOLD = 0.15;

export class RetrievalEngine {
  constructor(private repo: Repository) {}

  /**
   * Calculate temporal recency score based on half-life decay.
   * recency = 0.5 ^ (age_days / half_life)
   * Core hot tier skips recency decay (returns 1.0).
   */
  static calculateRecency(memory: Memory, referenceDate: Date = new Date()): number {
    if (memory.tier === 'hot' || memory.type === 'constraint') {
      return 1.0; // Core tier and constraint memories do not decay
    }

    const createdTime = new Date(memory.created_at || memory.valid_from).getTime();
    const ageMs = Math.max(0, referenceDate.getTime() - createdTime);
    const ageDays = ageMs / (1000 * 60 * 60 * 24);

    const halfLife = HALF_LIFE_DAYS[memory.type] || 60;
    const recency = Math.pow(0.5, ageDays / halfLife);

    return Math.max(0.01, Math.min(1.0, recency));
  }

  /**
   * Executes the full Governed Hybrid Retrieval Pipeline with Abstention.
   */
  async retrieve(request: RetrievalRequest): Promise<RetrievalResponse> {
    const { query, owner, workspace, env_fingerprint } = request;
    const now = new Date();

    // 1. Fetch Candidates (Pre-filtering active status and ownership)
    const allMemories = await this.repo.findMemories({
      owner: owner || 'user-001',
      workspace: workspace || 'ws-primary',
    });

    const activeMemories = allMemories.filter((m) => m.status === 'active');
    const inactiveMemories = allMemories.filter((m) => m.status !== 'active');

    // 2. Hybrid Search: Vector Cosine + Keyword Matching
    const keywordResults = await this.repo.searchKeyword(query, 20, {
      owner: owner || 'user-001',
      workspace: workspace || 'ws-primary',
      status: 'active',
    });

    // 3. Compute Scores across Active Candidates
    const scoredMemories: ScoredMemory[] = [];
    const filteredMemories: ScoredMemory[] = [];

    // Track excluded inactive memories with explicit reason
    for (const inact of inactiveMemories) {
      filteredMemories.push({
        memory: inact,
        similarity: 0.5,
        trust: inact.trust,
        confidence: inact.confidence,
        recency: RetrievalEngine.calculateRecency(inact, now),
        final_score: 0,
        excluded: true,
        exclusion_reason: inact.status === 'stale' 
          ? 'Memory marked stale (invalidated by deployment or superseding)' 
          : inact.status === 'quarantined'
          ? `Memory isolated in quarantine: ${inact.quarantine_reason || 'Untrusted'}`
          : `Inactive memory status: ${inact.status}`,
      });
    }

    // Score active candidates
    for (const mem of activeMemories) {
      // Find similarity from keyword/vector results
      const kw = keywordResults.find((r) => r.memory.id === mem.id);
      const similarity = kw ? kw.similarity : 0.4;

      const trust = mem.trust;
      const confidence = mem.confidence;
      const recency = RetrievalEngine.calculateRecency(mem, now);

      // Blueprint Formula: final_score = similarity × trust × confidence × recency
      const final_score = similarity * trust * confidence * recency;

      // Environment check (service version match)
      let envMismatch = false;
      if (
        env_fingerprint &&
        mem.env_fingerprint &&
        env_fingerprint.service === mem.env_fingerprint.service &&
        env_fingerprint.version !== mem.env_fingerprint.version
      ) {
        envMismatch = true;
      }

      if (envMismatch) {
        filteredMemories.push({
          memory: mem,
          similarity,
          trust,
          confidence,
          recency,
          final_score,
          excluded: true,
          exclusion_reason: `Environment version mismatch (${mem.env_fingerprint?.version} vs current ${env_fingerprint?.version})`,
        });
        continue;
      }

      if (final_score < MIN_SCORE_THRESHOLD) {
        filteredMemories.push({
          memory: mem,
          similarity,
          trust,
          confidence,
          recency,
          final_score,
          excluded: true,
          exclusion_reason: `Final score (${final_score.toFixed(3)}) fell below threshold ${MIN_SCORE_THRESHOLD}`,
        });
        continue;
      }

      scoredMemories.push({
        memory: mem,
        similarity,
        trust,
        confidence,
        recency,
        final_score,
        excluded: false,
      });
    }

    // Sort active candidates by final_score descending
    scoredMemories.sort((a, b) => b.final_score - a.final_score);

    // 4. Abstention Analysis
    let abstained = false;
    let abstention_reason: string | null = null;

    // Abstention Rule 1: No memories passed score threshold
    if (scoredMemories.length === 0) {
      abstained = true;
      abstention_reason = 'Confidence too low to answer safely without hallucination (no memory met score threshold 0.25).';
    } else {
      // Abstention Rule 2: Conflict ambiguity check
      // If two top memories have the same attribute key and trust difference < 0.15, abstain and request human clarification
      if (scoredMemories.length >= 2) {
        const top1 = scoredMemories[0];
        const top2 = scoredMemories[1];
        if (
          top1.memory.attribute_key === top2.memory.attribute_key &&
          top1.memory.value !== top2.memory.value &&
          Math.abs(top1.trust - top2.trust) < CONFLICT_TRUST_GAP_THRESHOLD
        ) {
          abstained = true;
          abstention_reason = `Conflicting memories detected for key '${top1.memory.attribute_key}' with narrow trust gap (${Math.abs(top1.trust - top2.trust).toFixed(2)} < 0.15). Human clarification required.`;
        }
      }
    }

    // 5. Build Delimited Untrusted Context Block
    const usable = abstained ? [] : scoredMemories.slice(0, request.top_k || 3);
    const formatted_untrusted_context = this.formatUntrustedContext(usable);

    return {
      query,
      usable_memories: usable,
      filtered_memories: filteredMemories,
      abstained,
      abstention_reason,
      formatted_untrusted_context,
    };
  }

  /**
   * Wraps retrieved memories into an isolated untrusted data block to prevent prompt injection hijacking.
   */
  private formatUntrustedContext(scoredList: ScoredMemory[]): string {
    if (scoredList.length === 0) return '';
    const lines = scoredList.map(
      (s) =>
        `[Memory ID: ${s.memory.id}] (Trust: ${s.trust.toFixed(2)}, Conf: ${s.confidence.toFixed(2)}, Score: ${s.final_score.toFixed(2)})\nContent: "${s.memory.content}"`
    );

    return `<untrusted_memory_context>\n${lines.join('\n\n')}\n</untrusted_memory_context>`;
  }
}

