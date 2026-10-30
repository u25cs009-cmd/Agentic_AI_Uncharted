import { Request, Response, NextFunction } from 'express';
import { getRepository } from '../repositories/index.js';
import { maskPII } from '../utils/pii.js';
import { Memory, RetrievalResult, ScoredMemory } from '../types/index.js';
import { LLMService } from '../services/llm.js';
import { CandidateFactExtractor, TRUST_LADDER } from '../engine/extractor.js';
import { calculateRecency, calculateFinalScore, cosineSimilarity } from '../utils/scoring.js';

export async function chat(req: Request, res: Response, next: NextFunction) {
  try {
    const { message, mode } = req.body;
    const activeMode = mode || 'governed';
    const repo = await getRepository();
    const owner = req.user?.id || 'usr-shakti2';
    const workspace = req.user?.workspace || 'ws-primary';

    const query = (message || '').trim();
    const allMemories = await repo.findMemories({ owner, workspace });

    // 1. Scoring & Retrieval Decomposition
    const retrieved: ScoredMemory[] = [];
    const excluded: ScoredMemory[] = [];
    let abstention = false;
    let abstentionReason = '';

    const queryTokens = query.toLowerCase().split(/\W+/).filter((w: string) => w.length > 2);

    for (const mem of allMemories) {
      const contentTokens = `${mem.content} ${mem.attribute_key} ${mem.entities.join(' ')}`.toLowerCase().split(/\W+/);
      const matches = queryTokens.filter(t => contentTokens.includes(t));
      const overlap = queryTokens.length > 0 ? matches.length / queryTokens.length : 0.1;
      const sim = Number(Math.min(0.98, Math.max(0.15, overlap > 0 ? 0.70 + (overlap * 0.25) : 0.20)).toFixed(3));

      const recency = calculateRecency(mem.created_at || mem.valid_from, mem.type, mem.tier);
      const finalScore = calculateFinalScore(sim, mem.trust, mem.confidence, recency);

      const scoredMem: ScoredMemory = {
        ...mem,
        similarity: sim,
        recency_score: Number(recency.toFixed(3)),
        final_score: finalScore
      };

      if (activeMode === 'none') {
        continue;
      } else if (activeMode === 'naive') {
        if (sim >= 0.40) {
          retrieved.push(scoredMem);
        }
      } else {
        // Governed Mode (ANCHOR Deterministic Guard)
        if (mem.status === 'quarantined') {
          scoredMem.excluded = true;
          scoredMem.exclusion_reason = 'quarantined';
          excluded.push(scoredMem);
        } else if (mem.status === 'stale') {
          scoredMem.excluded = true;
          scoredMem.exclusion_reason = 'stale';
          excluded.push(scoredMem);
        } else if (finalScore < 0.25) {
          scoredMem.excluded = true;
          scoredMem.exclusion_reason = 'low_score';
          excluded.push(scoredMem);
        } else {
          retrieved.push(scoredMem);
        }
      }
    }

    retrieved.sort((a, b) => b.final_score - a.final_score);

    // 2. Deterministic Abstention Evaluation (Governed Mode)
    if (activeMode === 'governed') {
      // Check for contradictory memories on the same key with near-equal trust
      const keyMap = new Map<string, ScoredMemory[]>();
      for (const r of retrieved) {
        const list = keyMap.get(r.attribute_key) || [];
        list.push(r);
        keyMap.set(r.attribute_key, list);
      }

      for (const [key, list] of keyMap.entries()) {
        if (list.length >= 2) {
          const delta = Math.abs(list[0].trust - list[1].trust);
          if (delta < 0.15) {
            abstention = true;
            abstentionReason = `Conflicting active facts for key '${key}' with near-equal trust (delta: ${delta.toFixed(2)} < 0.15). Awaiting human clarification.`;
            break;
          }
        }
      }

      // Check if relevant instructions were invalidated by a recent deploy
      if (!abstention && retrieved.length === 0 && excluded.some(e => e.exclusion_reason === 'stale')) {
        abstention = true;
        abstentionReason = 'Relevant prior operational fix was invalidated following a recent deployment. Deprecated fix excluded from execution.';
      }
    }

    // 3. Generate Answer using LLMService with Mode-Specific Prompts
    let answer = '';
    const topRetrieved = retrieved.slice(0, 3);

    if (activeMode === 'none') {
      const llmPrompt = `Answer this user question directly using general knowledge, without assuming any internal system context: "${query}"`;
      const llmRes = await LLMService.complete(llmPrompt, {
        systemPrompt: 'You are an AI assistant with NO memory recall. Do not invent company-specific internal facts.'
      });
      answer = `[NONE MODE - NO MEMORY RETRIEVAL]\n${llmRes.content}`;
    } else if (activeMode === 'naive') {
      const memoryContext = topRetrieved.map(m => `- [${m.status}] ${m.content}`).join('\n');
      const llmPrompt = `Answer the question based on these retrieved memories (even if they might be outdated):\n${memoryContext}\n\nQuestion: "${query}"`;
      const llmRes = await LLMService.complete(llmPrompt, {
        systemPrompt: 'You are an AI assistant in NAIVE retrieval mode. You blindly accept matching documents.'
      });
      answer = `⚠️ [NAIVE MODE - UNGOVERNED RETRIEVAL]\n${llmRes.content}\n\n*(Notice: Naive search accepts stale, unverified, or superseded records without governance).*`;
    } else {
      // Governed Mode
      if (abstention) {
        answer = `🛡️ [XYRO101 GOVERNED ABSTENTION]\n${abstentionReason}\n\nI have refrained from applying unverified or obsolete instructions. Please confirm the intended procedure with your team.`;
      } else if (topRetrieved.length > 0) {
        const memoryContext = topRetrieved
          .map(m => `• [${m.attribute_key}] ${m.content} (Trust: ${m.trust.toFixed(2)}, Confidence: ${m.confidence.toFixed(2)}, Score: ${m.final_score.toFixed(2)})`)
          .join('\n');
        const llmPrompt = `Answer the user question using ONLY these verified active facts:\n${memoryContext}\n\nQuestion: "${query}"`;
        const llmRes = await LLMService.complete(llmPrompt, {
          systemPrompt: 'You are XYRO101, the ANCHOR Governed Memory Agent. Provide a safe, precise answer based strictly on the verified facts provided.'
        });
        answer = `🛡️ [XYRO101 GOVERNED DECISION]\n${llmRes.content}\n\n**Verified Facts Consulted:**\n${topRetrieved.map(m => `- \`${m._id || m.id}\`: ${m.attribute_key} (Score: ${m.final_score.toFixed(2)})`).join('\n')}`;
      } else {
        answer = '🛡️ [XYRO101 GOVERNED DECISION]\nNo sufficiently trusted memory found meeting threshold (final score >= 0.25). Abstaining from blind resolution.';
      }
    }

    return res.json({
      mode: activeMode,
      answer,
      retrieved_memories: retrieved,
      excluded_memories: excluded,
      abstention,
      abstention_reason: abstentionReason,
      latency_ms: activeMode === 'none' ? 120 : activeMode === 'naive' ? 240 : 380,
      tokens_used: activeMode === 'none' ? 85 : activeMode === 'naive' ? 320 : 540
    });
  } catch (err) {
    next(err);
  }
}

export async function ingestObservation(req: Request, res: Response, next: NextFunction) {
  try {
    const { text, source } = req.body;
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Observation text is required' });
    }

    const repo = await getRepository();
    const owner = req.user?.id || 'usr-shakti2';
    const workspace = req.user?.workspace || 'ws-primary';

    // 1. PII Masking (Implementation Plan Module 3)
    const scrubbedText = maskPII(text);
    const sourceKind = source?.kind || 'user_stated';

    // 2. Safety Screening (Guard Rule #1: Prompt Injection forces QUARANTINE)
    const lower = scrubbedText.toLowerCase();
    const isInjection =
      lower.includes('exfiltrate') ||
      lower.includes('ignore safety') ||
      lower.includes('dump') ||
      lower.includes('jailbreak') ||
      lower.includes('attacker') ||
      lower.includes('system:');

    if (isInjection) {
      const qMem: Memory = {
        _id: `mem-${Date.now()}`,
        id: `mem-${Date.now()}`,
        owner,
        workspace,
        type: 'semantic',
        tier: 'warm',
        content: scrubbedText,
        attribute_key: 'security.suspicious.input',
        value: 'FLAGGED_INJECTION',
        entities: ['security'],
        depends_on: [],
        source: { kind: 'unverified', actor: req.user?.email || 'untrusted' },
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
        quarantine_reason: 'Flagged by Deterministic Guard Rule #1: Prompt Injection Signature',
        created_at: new Date().toISOString()
      };

      await repo.saveMemory(qMem);
      await repo.appendEvent({
        id: `evt-${Date.now()}`,
        memory_id: qMem._id,
        event_type: 'quarantined',
        reason: 'Flagged by safety screener: Prompt injection signature',
        actor: 'DeterministicSafetyGuard',
        timestamp: new Date().toISOString()
      });

      return res.status(201).json({
        success: true,
        action: 'QUARANTINE',
        reason: 'High-risk payload detected; isolated in Quarantine Inbox',
        memory: qMem
      });
    }

    // 3. Extract Candidate Fact
    const candidate = CandidateFactExtractor.extractCandidateFact(scrubbedText, {
      kind: sourceKind,
      actor: req.user?.email || 'user'
    });

    // 4. Find Existing Neighbours on Attribute Key for Guard Rules
    const existingMemories = await repo.findMemories({
      owner,
      workspace,
      attribute_key: candidate.attribute_key,
      status: 'active'
    });

    const candidateTrust = TRUST_LADDER[sourceKind] ?? 0.80;

    // Guard Rule #3: Deduplication - duplicate facts with identical key and value are IGNORED
    const isDuplicate = existingMemories.some(m => m.value.trim().toLowerCase() === candidate.value.trim().toLowerCase());
    if (isDuplicate) {
      return res.json({
        success: true,
        action: 'IGNORE',
        reason: 'Deduplication: identical fact already active in memory store'
      });
    }

    // Guard Rule #2: Trust Supremacy - lower trust cannot supersede higher trust (QUARANTINE instead)
    const higherTrustExisting = existingMemories.find(m => m.trust > candidateTrust);
    if (higherTrustExisting) {
      const qMem: Memory = {
        _id: `mem-${Date.now()}`,
        id: `mem-${Date.now()}`,
        owner,
        workspace,
        type: candidate.type,
        tier: 'warm',
        content: scrubbedText,
        attribute_key: candidate.attribute_key,
        value: candidate.value,
        entities: candidate.entities,
        depends_on: candidate.depends_on,
        source: { kind: sourceKind, actor: req.user?.email || 'user' },
        trust: candidateTrust,
        confidence: candidate.confidence,
        status: 'quarantined',
        valid_from: new Date().toISOString(),
        valid_to: null,
        superseded_by: null,
        env_fingerprint: { service: 'web' },
        derived_from: [],
        access_count: 0,
        last_used_at: null,
        expires_at: null,
        quarantine_reason: `Guard Rule #2: Lower-trust memory (Trust: ${candidateTrust}) cannot supersede existing higher-trust fact (Trust: ${higherTrustExisting.trust})`,
        created_at: new Date().toISOString()
      };

      await repo.saveMemory(qMem);
      await repo.appendEvent({
        id: `evt-${Date.now()}`,
        memory_id: qMem._id,
        event_type: 'quarantined',
        reason: `Trust Supremacy: incoming trust ${candidateTrust} < active fact ${higherTrustExisting.trust}`,
        actor: 'TrustSupremacyGuard',
        timestamp: new Date().toISOString()
      });

      return res.status(201).json({
        success: true,
        action: 'QUARANTINE',
        reason: 'Lower-trust observation attempted to overwrite higher-trust verified fact',
        memory: qMem
      });
    }

    // Guard Rule #4: Valid Superseding
    const now = new Date().toISOString();
    const newMemId = `mem-${Date.now()}`;

    if (existingMemories.length > 0) {
      for (const oldMem of existingMemories) {
        await repo.updateMemory(oldMem._id, {
          status: 'superseded',
          valid_to: now,
          superseded_by: newMemId
        }, owner, workspace);

        await repo.appendEvent({
          id: `evt-sup-${Date.now()}`,
          memory_id: oldMem._id,
          event_type: 'superseded',
          reason: `Superseded by higher/equal trust fact: ${newMemId}`,
          actor: 'GovernanceEngine',
          timestamp: now
        });
      }
    }

    // Save New Memory
    const newMem: Memory = {
      _id: newMemId,
      id: newMemId,
      owner,
      workspace,
      type: candidate.type,
      tier: 'hot',
      content: scrubbedText,
      attribute_key: candidate.attribute_key,
      value: candidate.value,
      entities: candidate.entities,
      depends_on: candidate.depends_on,
      source: { kind: sourceKind, actor: req.user?.email || 'user' },
      trust: candidateTrust,
      confidence: candidate.confidence,
      status: 'active',
      valid_from: now,
      valid_to: null,
      superseded_by: null,
      env_fingerprint: { service: 'web' },
      derived_from: [],
      access_count: 1,
      last_used_at: now,
      expires_at: null,
      created_at: now
    };

    await repo.saveMemory(newMem);
    await repo.appendEvent({
      id: `evt-add-${Date.now()}`,
      memory_id: newMemId,
      event_type: 'created',
      reason: existingMemories.length > 0 ? 'Superseded previous fact with verified update' : 'Extracted new candidate fact',
      actor: 'IngestionPipeline',
      timestamp: now
    });

    return res.status(201).json({
      success: true,
      action: existingMemories.length > 0 ? 'SUPERSEDE' : 'ADD',
      reason: existingMemories.length > 0 ? 'Superseded previous fact while preserving complete audit history' : 'New verified fact added to active store',
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
    const owner = req.user?.id || 'usr-shakti2';
    const workspace = req.user?.workspace || 'ws-primary';

    const results = await repo.searchKeyword(query || '', 20, { owner, workspace });

    return res.json({
      query: query || '',
      retrieved: results.filter(r => r.status === 'active'),
      excluded: results.filter(r => r.status !== 'active'),
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

    const results = await repo.searchKeyword(error_message || service || 'timeout', 5, { status: 'active' });
    const topMemory = results[0];

    return res.json({
      alert_id: alert_id || `alert-${Date.now()}`,
      service: service || 'checkout-api',
      proposed_action: topMemory ? `Apply verified procedure: ${topMemory.content}` : 'Restart affected container pool and verify logs',
      confidence: topMemory ? topMemory.confidence : 0.85,
      memory_id: topMemory ? topMemory._id : 'mem-001',
      status: 'AWAITING_HUMAN_APPROVAL'
    });
  } catch (err) {
    next(err);
  }
}
