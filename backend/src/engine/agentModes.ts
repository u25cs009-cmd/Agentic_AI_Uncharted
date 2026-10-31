/**
 * ANCHOR Three Operating Modes & Agent Orchestrator
 * Agent: ShaktAI
 * Implements None, Naive, and Governed agent arms for comparative evaluation.
 */

import { ChatMode, ChatRequest, ChatResponse, ScoredMemory } from './types.js';
import { Repository } from './repository.js';
import { RetrievalEngine } from './retrievalEngine.js';

export class AgentOrchestrator {
  private retrievalEngine: RetrievalEngine;

  constructor(private repo: Repository) {
    this.retrievalEngine = new RetrievalEngine(repo);
  }

  /**
   * Primary Chat Execution routing through None, Naive, or Governed modes.
   */
  async chat(request: ChatRequest): Promise<ChatResponse> {
    const mode: ChatMode = request.mode || 'governed';
    const query = request.query;

    switch (mode) {
      case 'none':
        return this.executeNoneMode(query);

      case 'naive':
        return this.executeNaiveMode(query, request);

      case 'governed':
      default:
        return this.executeGovernedMode(query, request);
    }
  }

  /**
   * Mode 1: NONE (No Memory Retrieved)
   * Simulates generic LLM answering without access to internal persistent memory.
   */
  private async executeNoneMode(query: string): Promise<ChatResponse> {
    const qLower = query.toLowerCase();
    let answer = `[NONE MODE - NO MEMORY RETRIEVED]\nI do not have access to any internal project documentation or operational memory. Based on general software principles, please check your application logs and environment settings.`;

    if (qLower.includes('database') || qLower.includes('db')) {
      answer = `[NONE MODE - NO MEMORY RETRIEVED]\nWithout access to system memory, I cannot verify which database your cluster is running. Common databases include PostgreSQL, MySQL, and MongoDB.`;
    } else if (qLower.includes('timeout') || qLower.includes('connection error')) {
      answer = `[NONE MODE - NO MEMORY RETRIEVED]\nFor connection timeouts, you may need to check firewall rules, restart your database service, or inspect connection strings.`;
    }

    return {
      query,
      mode: 'none',
      answer,
      retrieved_memories: [],
      abstained: false,
      abstention_reason: null,
      metrics: {
        similarity: 0,
        trust: 0,
        confidence: 0,
        recency: 0,
        final_score: 0,
      },
    };
  }

  /**
   * Mode 2: NAIVE (Plain Vector Similarity without Governance)
   * Blindly retrieves matching items, ignoring trust, recency decay, staleness, and poisoning.
   */
  private async executeNaiveMode(query: string, request: ChatRequest): Promise<ChatResponse> {
    // Naive search retrieves ALL memories including stale and quarantined items
    const candidates = await this.repo.findMemories({
      owner: request.owner || 'user-001',
      workspace: request.workspace || 'ws-primary',
    });

    const queryTokens = query.toLowerCase().split(/\s+/).filter(Boolean);
    const scored: ScoredMemory[] = candidates.map((m) => {
      const text = `${m.content} ${m.attribute_key} ${m.entities.join(' ')}`.toLowerCase();
      let matches = 0;
      for (const t of queryTokens) {
        if (text.includes(t)) matches++;
      }
      const sim = queryTokens.length > 0 ? matches / queryTokens.length : 0.5;
      return {
        memory: m,
        similarity: Math.min(1.0, sim),
        trust: m.trust,
        confidence: m.confidence,
        recency: 1.0,
        final_score: sim,
        excluded: false,
      };
    });

    scored.sort((a, b) => b.similarity - a.similarity);
    const topMemories = scored.slice(0, 2);

    let answer = `[NAIVE MODE - UNCHECKED RETRIEVAL]\n`;
    if (topMemories.length > 0) {
      const top = topMemories[0].memory;
      answer += `Based on retrieved memory [${top.id}] (${top.status.toUpperCase()}): "${top.content}"\n`;

      // Naive failure mode: blindly executes whatever was retrieved
      if (top.status === 'stale') {
        answer += `⚠️ WARNING: This fix is obsolete/stale, but Naive mode blindly recommended it anyway!`;
      } else if (top.status === 'quarantined') {
        answer += `🚨 SECURITY ALERT: Quarantined payload leaked into Naive context!`;
      }
    } else {
      answer += `No memories matched query.`;
    }

    const primary = topMemories[0];

    return {
      query,
      mode: 'naive',
      answer,
      retrieved_memories: topMemories,
      abstained: false,
      abstention_reason: null,
      metrics: {
        similarity: primary ? primary.similarity : 0,
        trust: primary ? primary.trust : 0,
        confidence: primary ? primary.confidence : 0,
        recency: 1.0,
        final_score: primary ? primary.final_score : 0,
      },
    };
  }

  /**
   * Mode 3: GOVERNED (Full ANCHOR Safety & Temporal Engine)
   * Enforces trust ladder, recency decay, staleness invalidation, and abstention on low confidence or conflict.
   */
  private async executeGovernedMode(query: string, request: ChatRequest): Promise<ChatResponse> {
    const retrieval = await this.retrievalEngine.retrieve({
      query,
      owner: request.owner,
      workspace: request.workspace,
      env_fingerprint: request.env_fingerprint,
      top_k: 3,
    });

    let answer = '';

    if (retrieval.abstained) {
      answer = `[ANCHOR GOVERNED MODE - SAFE ABSTENTION]\n🛡️ Abstention Triggered: ${retrieval.abstention_reason}\n\nTo prevent hallucination and operational failure, ShaktAI refrains from taking autonomous action until verified information is supplied.`;
    } else {
      const top = retrieval.usable_memories[0];
      answer = `[ANCHOR GOVERNED MODE - VERIFIED FACT]\nAccording to verified active memory [${top.memory.id}] (Trust: ${top.trust.toFixed(2)}, Score: ${top.final_score.toFixed(2)}):\n\n${top.memory.content}`;

      // Increment access count
      await this.repo.updateMemory(top.memory.id, {
        access_count: top.memory.access_count + 1,
        last_used_at: new Date().toISOString(),
      });
    }

    const primary = retrieval.usable_memories[0];

    return {
      query,
      mode: 'governed',
      answer,
      retrieved_memories: retrieval.usable_memories,
      abstained: retrieval.abstained,
      abstention_reason: retrieval.abstention_reason,
      metrics: {
        similarity: primary ? primary.similarity : 0,
        trust: primary ? primary.trust : 0,
        confidence: primary ? primary.confidence : 0,
        recency: primary ? primary.recency : 0,
        final_score: primary ? primary.final_score : 0,
      },
    };
  }
}

