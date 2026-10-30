import { Request, Response, NextFunction } from 'express';
import { getRepository } from '../repositories/index.js';
import { maskPII } from '../utils/pii.js';
import { Memory, RetrievalResult, ScoredMemory } from '../types/index.js';

/**
 * ============================================================================
 * NOTE FOR TEAMMATE (AI MEMORY ENGINE & INTELLIGENCE LEAD):
 * This controller provides the initial working endpoints for Chat, Ingestion,
 * Retrieval, and Triage. You can easily extend or replace the heuristic logic
 * with your `llm.ts` prompts and local Transformers.js embeddings!
 * ============================================================================
 */

export async function chat(req: Request, res: Response, next: NextFunction) {
  try {
    const { message, mode } = req.body;
    const activeMode = mode || 'governed';
    const repo = await getRepository();

    const query = (message || '').toLowerCase();
    const allMemories = await repo.findMemories();

    // 1. Scoring & Retrieval
    const retrieved: ScoredMemory[] = [];
    const excluded: ScoredMemory[] = [];
    let abstention = false;
    let abstentionReason = '';

    for (const mem of allMemories) {
      const isMatch = query.split(/\W+/).some((w: string) => w.length > 2 && mem.content.toLowerCase().includes(w));
      const sim = isMatch ? 0.92 : 0.25;

      const scoredMem: ScoredMemory = {
        ...mem,
        similarity: sim,
        recency_score: 1.0,
        final_score: Number((sim * mem.trust * mem.confidence).toFixed(3))
      };

      if (activeMode === 'governed') {
        if (mem.status === 'stale') {
          scoredMem.excluded = true;
          scoredMem.exclusion_reason = 'stale';
          excluded.push(scoredMem);
          abstention = true;
          abstentionReason = `Detected stale dependency on changed components (${mem.depends_on.join(', ')}). Deprecated command excluded.`;
        } else if (mem.status === 'quarantined') {
          scoredMem.excluded = true;
          scoredMem.exclusion_reason = 'quarantined';
          excluded.push(scoredMem);
        } else if (scoredMem.final_score >= 0.25) {
          retrieved.push(scoredMem);
        } else {
          scoredMem.excluded = true;
          scoredMem.exclusion_reason = 'low_score';
          excluded.push(scoredMem);
        }
      } else if (activeMode === 'naive') {
        // Naive mode: plain top-k, includes stale without checking
        if (isMatch) retrieved.push(scoredMem);
      }
    }

    // 2. Generate mode-specific answer
    let answer = '';
    if (activeMode === 'none') {
      answer = `[NONE MODE] Direct answer without memory recall: "${message}".`;
    } else if (activeMode === 'naive') {
      if (retrieved.some(r => r.content.includes('pg_ctlcluster'))) {
        answer = "⚠️ [NAIVE MODE] Found top vector similarity match:\n> 'Old postgres pool reset command: `pg_ctlcluster 14 main restart`'\nExecute `pg_ctlcluster 14 main restart` immediately. (Warning: Naive retrieval failed to detect that this fix was marked stale after deployment!)";
      } else {
        answer = `[NAIVE MODE] Retrieved ${retrieved.length} memory records via basic similarity without governance.`;
      }
    } else {
      // Governed Mode
      if (abstention) {
        answer = `🛡️ [GOVERNED ABSTENTION]\n${abstentionReason}\n\nI have refrained from applying unverified or obsolete instructions. Awaiting verification or human approval.`;
      } else if (retrieved.length > 0) {
        answer = `🛡️ [GOVERNED DECISION]\nBased on verified memories, here is the safe recommendation:\n\n${retrieved.map(r => `• **${r.attribute_key}**: ${r.content} (Trust: ${r.trust}, Confidence: ${r.confidence})`).join('\n')}`;
      } else {
        answer = "🛡️ [GOVERNED MODE] No sufficiently trusted memory found meeting threshold (score >= 0.25). Abstaining safely.";
      }
    }

    return res.json({
      mode: activeMode,
      answer,
      retrieved_memories: retrieved,
      excluded_memories: excluded,
      abstention,
      abstention_reason: abstentionReason,
      latency_ms: activeMode === 'none' ? 110 : activeMode === 'naive' ? 220 : 340,
      tokens_used: activeMode === 'none' ? 80 : activeMode === 'naive' ? 290 : 480
    });
  } catch (err) {
    next(err);
  }
}

export async function ingestObservation(req: Request, res: Response, next: NextFunction) {
  try {
    const { text, source } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'text is required' });
    }

    const repo = await getRepository();
    const scrubbedText = maskPII(text);
    const sourceKind = source?.kind || 'user_stated';

    // Check for prompt injection / poisoning
    const lower = scrubbedText.toLowerCase();
    const isInjection = lower.includes('exfiltrate') ||
      lower.includes('ignore safety') ||
      lower.includes('dump') ||
      lower.includes('jailbreak') ||
      lower.includes('attacker');

    if (isInjection) {
      // Guard Rule #1: Prompt Injection forces QUARANTINE
      const qMem: Memory = {
        _id: `mem-${Date.now()}`,
        owner: req.user?.id || 'usr-shakti2',
        workspace: req.user?.workspace || 'ws-primary',
        type: 'semantic',
        tier: 'warm',
        content: scrubbedText,
        attribute_key: 'security.suspicious.input',
        value: 'FLAGGED_INJECTION',
        entities: ['security'],
        depends_on: [],
        source: { kind: 'unverified', actor: req.user?.email || 'anonymous' },
        trust: 0.20,
        confidence: 0.10,
        status: 'quarantined',
        valid_from: new Date().toISOString(),
        valid_to: null,
        superseded_by: null,
        env_fingerprint: {},
        derived_from: [],
        access_count: 0,
        last_used_at: null,
        expires_at: null,
        quarantine_reason: 'Flagged by Deterministic Safety Screening Rule #1: Prompt Injection Signature',
        created_at: new Date().toISOString()
      };

      await repo.saveMemory(qMem);
      await repo.appendEvent({
        id: `evt-${Date.now()}`,
        memory_id: qMem._id,
        event_type: 'quarantined',
        reason: 'Flagged by safety screener: Prompt injection signature',
        actor: 'SecurityScreeningEngine',
        timestamp: new Date().toISOString()
      });

      return res.status(201).json({
        success: true,
        action: 'QUARANTINE',
        reason: 'High-risk payload detected; isolated in Quarantine Inbox',
        memory: qMem
      });
    }

    // Normal Ingestion
    const trustMap: Record<string, number> = {
      human_approved: 1.0,
      system_event: 0.85,
      user_stated: 0.80,
      agent_inferred: 0.50,
      unverified: 0.20
    };

    const newMem: Memory = {
      _id: `mem-${Date.now()}`,
      owner: req.user?.id || 'usr-shakti2',
      workspace: req.user?.workspace || 'ws-primary',
      type: 'semantic',
      tier: 'hot',
      content: scrubbedText,
      attribute_key: `fact.${Date.now()}`,
      value: scrubbedText.slice(0, 50),
      entities: ['general'],
      depends_on: [],
      source: { kind: sourceKind, actor: req.user?.email || 'user' },
      trust: trustMap[sourceKind] || 0.80,
      confidence: 0.90,
      status: 'active',
      valid_from: new Date().toISOString(),
      valid_to: null,
      superseded_by: null,
      env_fingerprint: { service: 'web' },
      derived_from: [],
      access_count: 1,
      last_used_at: new Date().toISOString(),
      expires_at: null,
      created_at: new Date().toISOString()
    };

    await repo.saveMemory(newMem);
    await repo.appendEvent({
      id: `evt-${Date.now()}`,
      memory_id: newMem._id,
      event_type: 'created',
      reason: 'Extracted new candidate fact from observation',
      actor: 'IngestionPipeline',
      timestamp: new Date().toISOString()
    });

    return res.status(201).json({
      success: true,
      action: 'ADD',
      reason: 'New valid memory added to active store',
      memory: newMem
    });
  } catch (err) {
    next(err);
  }
}

export async function retrieveMemories(req: Request, res: Response, next: NextFunction) {
  try {
    const { query } = req.body;
    const repo = await getRepository();
    const results = await repo.searchKeyword(query || '', 20, { status: 'active' });

    return res.json({
      query: query || '',
      retrieved: results,
      total: results.length
    });
  } catch (err) {
    next(err);
  }
}

export async function agentTriage(req: Request, res: Response, next: NextFunction) {
  try {
    const { alert_id, service, error_message } = req.body;
    const repo = await getRepository();

    // Find relevant operational memories
    const relevant = await repo.searchKeyword(error_message || service || 'timeout', 5, { status: 'active' });
    const topMemory = relevant[0];

    return res.json({
      alert_id: alert_id || `alert-${Date.now()}`,
      proposed_action: topMemory ? `Apply verified procedure: ${topMemory.content}` : 'Restart affected container pool and verify logs',
      confidence: topMemory ? topMemory.confidence : 0.85,
      memory_id: topMemory ? topMemory._id : 'mem-001',
      status: 'AWAITING_HUMAN_APPROVAL'
    });
  } catch (err) {
    next(err);
  }
}

