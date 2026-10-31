/**
 * ANCHOR Governed Memory Decision Engine (F1)
 * Agent: ShaktAI
 * Implements the Governed Write Path with Deterministic Guard Rules overriding LLM proposals.
 */

import {
  CandidateFact,
  DecisionResult,
  DecisionType,
  IngestionResult,
  Memory,
  MemoryEvent,
  ObservationInput,
} from './types.js';
import { Repository } from './repository.js';
import { maskPII, screenInputSafety } from './safety.js';
import { CandidateFactExtractor } from './extractor.js';

export class DecisionEngine {
  constructor(private repo: Repository) {}

  /**
   * Main Governed Memory Ingestion Pipeline
   */
  async ingestObservation(input: ObservationInput): Promise<IngestionResult> {
    const observationId = `obs-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const events: MemoryEvent[] = [];

    // Step 1: Input Normalization & PII Masking
    const { maskedText } = maskPII(input.content.trim());

    // Step 2: Safety Screening (Prompt injection, jailbreak, exfiltration detection)
    const safetyCheck = screenInputSafety(maskedText);

    // Step 3: Extract Candidate Fact
    const candidateFact = CandidateFactExtractor.extractCandidateFact(maskedText, input.source);
    if (input.entities && input.entities.length > 0) {
      candidateFact.entities = Array.from(new Set([...candidateFact.entities, ...input.entities]));
    }
    if (input.env_fingerprint) {
      candidateFact.env_fingerprint = input.env_fingerprint;
    }

    // Step 4: Find Neighbours (Existing memories with same attribute_key)
    const existingMemories = await this.repo.findMemories({
      owner: input.owner || 'user-001',
      workspace: input.workspace || 'ws-primary',
    });

    const conflictingActive = existingMemories.find(
      (m) => m.status === 'active' && m.attribute_key === candidateFact.attribute_key
    );

    // Step 5 & 6: Evaluate Deterministic Guard Rules (Code overrides LLM proposals)
    const decision = this.evaluateGuardRules(candidateFact, safetyCheck, conflictingActive);

    const now = new Date().toISOString();
    const memoryId = `mem-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    let savedMemory: Memory | undefined;
    let quarantinedMemory: Memory | undefined;

    switch (decision.decision) {
      case 'QUARANTINE': {
        const mem: Memory = {
          id: memoryId,
          owner: input.owner || 'user-001',
          workspace: input.workspace || 'ws-primary',
          type: candidateFact.type,
          tier: 'warm',
          content: candidateFact.content,
          entities: candidateFact.entities,
          attribute_key: candidateFact.attribute_key,
          value: candidateFact.value,
          depends_on: candidateFact.depends_on,
          source: candidateFact.source,
          trust: candidateFact.trust,
          confidence: candidateFact.confidence,
          status: 'quarantined',
          quarantine_reason: decision.reason,
          valid_from: now,
          access_count: 0,
          created_at: now,
          updated_at: now,
          env_fingerprint: candidateFact.env_fingerprint,
        };

        quarantinedMemory = await this.repo.saveMemory(mem);

        const event: MemoryEvent = {
          id: `evt-${Date.now()}-q`,
          memory_id: memoryId,
          event_type: 'quarantined',
          timestamp: now,
          reason: `GUARD RULE ENFORCED: ${decision.reason}`,
          actor: 'ShaktAI Safety Guard',
          diff: { after: mem },
        };
        await this.repo.appendEvent(event);
        events.push(event);
        break;
      }

      case 'SUPERSEDE': {
        if (!conflictingActive) {
          throw new Error('Supersede decision evaluated without a conflicting active memory.');
        }

        // Create new memory with equal or higher trust
        const newMem: Memory = {
          id: memoryId,
          owner: input.owner || 'user-001',
          workspace: input.workspace || 'ws-primary',
          type: candidateFact.type,
          tier: conflictingActive.tier === 'hot' ? 'hot' : 'warm',
          content: candidateFact.content,
          entities: Array.from(new Set([...candidateFact.entities, ...conflictingActive.entities])),
          attribute_key: candidateFact.attribute_key,
          value: candidateFact.value,
          depends_on: candidateFact.depends_on,
          source: candidateFact.source,
          trust: candidateFact.trust,
          confidence: candidateFact.confidence,
          status: 'active',
          valid_from: now,
          derived_from: [conflictingActive.id],
          access_count: 0,
          created_at: now,
          updated_at: now,
          env_fingerprint: candidateFact.env_fingerprint || conflictingActive.env_fingerprint,
        };

        savedMemory = await this.repo.saveMemory(newMem);

        // Invalidate and supersede previous active memory
        await this.repo.updateMemory(conflictingActive.id, {
          status: 'superseded',
          valid_to: now,
          superseded_by: newMem.id,
        });

        const supersedeEvent: MemoryEvent = {
          id: `evt-${Date.now()}-s`,
          memory_id: conflictingActive.id,
          event_type: 'superseded',
          timestamp: now,
          reason: `Superseded by new higher/equal-trust memory ${newMem.id}. (${decision.reason})`,
          actor: candidateFact.source.actor || 'Governed Decision Engine',
          diff: { before: { status: 'active' }, after: { status: 'superseded', superseded_by: newMem.id } },
        };
        await this.repo.appendEvent(supersedeEvent);
        events.push(supersedeEvent);

        const createEvent: MemoryEvent = {
          id: `evt-${Date.now()}-c`,
          memory_id: newMem.id,
          event_type: 'created',
          timestamp: now,
          reason: `Created to supersede ${conflictingActive.id}. Key: ${newMem.attribute_key}`,
          actor: candidateFact.source.actor || 'Governed Decision Engine',
          diff: { after: newMem },
        };
        await this.repo.appendEvent(createEvent);
        events.push(createEvent);
        break;
      }

      case 'UPDATE': {
        if (!conflictingActive) {
          throw new Error('Update decision evaluated without target memory.');
        }

        savedMemory = await this.repo.updateMemory(conflictingActive.id, {
          content: candidateFact.content,
          value: candidateFact.value,
          trust: Math.max(conflictingActive.trust, candidateFact.trust),
          confidence: Math.max(conflictingActive.confidence, candidateFact.confidence),
          updated_at: now,
        });

        const updateEvent: MemoryEvent = {
          id: `evt-${Date.now()}-u`,
          memory_id: conflictingActive.id,
          event_type: 'updated',
          timestamp: now,
          reason: `Updated existing memory attributes. (${decision.reason})`,
          actor: candidateFact.source.actor || 'Governed Decision Engine',
        };
        await this.repo.appendEvent(updateEvent);
        events.push(updateEvent);
        break;
      }

      case 'ADD': {
        const newMem: Memory = {
          id: memoryId,
          owner: input.owner || 'user-001',
          workspace: input.workspace || 'ws-primary',
          type: candidateFact.type,
          tier: candidateFact.type === 'procedural' ? 'warm' : 'warm',
          content: candidateFact.content,
          entities: candidateFact.entities,
          attribute_key: candidateFact.attribute_key,
          value: candidateFact.value,
          depends_on: candidateFact.depends_on,
          source: candidateFact.source,
          trust: candidateFact.trust,
          confidence: candidateFact.confidence,
          status: 'active',
          valid_from: now,
          access_count: 0,
          created_at: now,
          updated_at: now,
          env_fingerprint: candidateFact.env_fingerprint,
        };

        savedMemory = await this.repo.saveMemory(newMem);

        const addEvent: MemoryEvent = {
          id: `evt-${Date.now()}-a`,
          memory_id: newMem.id,
          event_type: 'created',
          timestamp: now,
          reason: `Ingested new verified fact for key '${newMem.attribute_key}'.`,
          actor: candidateFact.source.actor || 'Governed Decision Engine',
          diff: { after: newMem },
        };
        await this.repo.appendEvent(addEvent);
        events.push(addEvent);
        break;
      }

      case 'IGNORE': {
        // Near-duplicate or exact match; do nothing
        break;
      }
    }

    return {
      observation_id: observationId,
      sanitized_content: maskedText,
      decision: decision.decision,
      reason: decision.reason,
      memory: savedMemory,
      quarantined_memory: quarantinedMemory,
      events,
    };
  }

  /**
   * Evaluates the 5 Deterministic Guard Rules in strict priority order.
   */
  evaluateGuardRules(
    candidate: CandidateFact,
    safety: { isSafe: boolean; flag: string; reason?: string },
    conflictingActive?: Memory
  ): DecisionResult {
    // GUARD RULE 1: Safety screening & prompt injection detection forces QUARANTINE
    if (!safety.isSafe) {
      return {
        decision: 'QUARANTINE',
        rule_applied: 'GUARD_RULE_1_INJECTION_DEFENSE',
        reason: safety.reason || 'Prompt injection / malicious instruction pattern isolated.',
        is_override: true,
      };
    }

    // If an active memory with the exact same attribute_key already exists:
    if (conflictingActive) {
      // GUARD RULE 3: Deduplication (Near-duplicate facts with same attribute_key and value are IGNORED)
      if (
        conflictingActive.value.trim().toLowerCase() === candidate.value.trim().toLowerCase() ||
        conflictingActive.content.trim().toLowerCase() === candidate.content.trim().toLowerCase()
      ) {
        return {
          decision: 'IGNORE',
          rule_applied: 'GUARD_RULE_3_DEDUPLICATION',
          reason: `Duplicate of active memory ${conflictingActive.id} with identical attribute key & value.`,
          target_memory_id: conflictingActive.id,
          is_override: true,
        };
      }

      // GUARD RULE 2: Trust Supremacy
      // A lower-trust memory can NEVER supersede a higher-trust memory (forces QUARANTINE instead)
      if (candidate.trust < conflictingActive.trust) {
        return {
          decision: 'QUARANTINE',
          rule_applied: 'GUARD_RULE_2_TRUST_SUPREMACY',
          reason: `Trust violation: Proposed fact trust (${candidate.trust.toFixed(2)}) cannot supersede established fact ${conflictingActive.id} trust (${conflictingActive.trust.toFixed(2)}).`,
          target_memory_id: conflictingActive.id,
          is_override: true,
        };
      }

      // Higher or equal trust with conflicting value -> SUPERSEDE
      return {
        decision: 'SUPERSEDE',
        rule_applied: 'GOVERNED_SUPERSEDE',
        reason: `Valid superseding: Proposed fact has equal or higher trust (${candidate.trust.toFixed(2)} >= ${conflictingActive.trust.toFixed(2)}) for key '${candidate.attribute_key}'.`,
        target_memory_id: conflictingActive.id,
      };
    }

    // GUARD RULE 5: Isolated unverified observation check
    if (candidate.trust <= 0.2 && candidate.confidence <= 0.4) {
      return {
        decision: 'QUARANTINE',
        rule_applied: 'GUARD_RULE_5_UNVERIFIED_ISOLATION',
        reason: 'Low-confidence observation from unverified source isolated for safety review.',
        is_override: true,
      };
    }

    // Default: Clean new verified fact -> ADD
    return {
      decision: 'ADD',
      rule_applied: 'GOVERNED_ADD',
      reason: `New unique fact identified for attribute key '${candidate.attribute_key}'.`,
    };
  }
}

