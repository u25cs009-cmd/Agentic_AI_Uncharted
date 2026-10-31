/**
 * ANCHOR Temporal & Lifecycle Engine
 * Agent: ShaktAI
 * Manages deployment staleness invalidation, Bayesian confidence calibration, time travel, and cascade forgetting.
 */

import {
  DeploymentEvent,
  DeploymentResult,
  Memory,
  MemoryEvent,
  OutcomeRecord,
} from './types.js';
import { Repository } from './repository.js';

export class LifecycleEngine {
  constructor(private repo: Repository) {}

  /**
   * Deployment Event Handler:
   * Marks memories stale ONLY if their `depends_on` overlaps changed components.
   */
  async processDeployment(event: DeploymentEvent): Promise<DeploymentResult> {
    const now = new Date().toISOString();
    const activeMemories = await this.repo.findMemories({ status: 'active' });
    const affectedIds: string[] = [];
    const events: MemoryEvent[] = [];

    const changedSet = new Set(event.changed_components.map((c) => c.toLowerCase()));

    for (const mem of activeMemories) {
      // Check if memory's depends_on intersects changed_components
      const hasDependencyOverlap = mem.depends_on.some((dep) =>
        changedSet.has(dep.toLowerCase())
      );

      if (hasDependencyOverlap) {
        // Invalidate memory by setting status to 'stale'
        await this.repo.updateMemory(mem.id, {
          status: 'stale',
          valid_to: now,
          confidence: Math.max(0.1, mem.confidence * 0.5),
        });

        affectedIds.push(mem.id);

        const staleEvent: MemoryEvent = {
          id: `evt-deploy-${Date.now()}-${mem.id}`,
          memory_id: mem.id,
          event_type: 'stale',
          timestamp: now,
          reason: `Deployment of ${event.service} (${event.version}) modified dependencies [${mem.depends_on.join(', ')}]. Marked stale to prevent outdated reuse.`,
          actor: event.actor || 'Deploy Invalidation Engine',
          diff: {
            before: { status: 'active' },
            after: { status: 'stale', valid_to: now },
          },
        };

        await this.repo.appendEvent(staleEvent);
        events.push(staleEvent);
      }
    }

    return {
      service: event.service,
      version: event.version,
      affected_memories_count: affectedIds.length,
      affected_memory_ids: affectedIds,
      events,
    };
  }

  /**
   * Bayesian Feedback & Outcome Processing:
   * confidence = (prior × 4 + successes) / (4 + successes + 2 × failures)
   * If confidence drops below 0.25 after repeated rejections, automatically moves to quarantine.
   */
  async processOutcome(outcome: OutcomeRecord): Promise<{
    memory: Memory;
    newConfidence: number;
    quarantined: boolean;
  }> {
    const memory = await this.repo.findMemoryById(outcome.memory_id);
    if (!memory) {
      throw new Error(`Target memory ${outcome.memory_id} not found.`);
    }

    // Save outcome to record trail
    await this.repo.saveOutcome(outcome);

    // Fetch historical outcomes for this memory
    const history = await this.repo.getOutcomes(outcome.memory_id);
    const successes = history.filter((h) => h.result === 'approved').length;
    const failures = history.filter((h) => h.result === 'rejected').length;

    const prior = memory.confidence;
    // Blueprint Bayesian Formula
    const newConfidence = Number(
      ((prior * 4 + successes) / (4 + successes + 2 * failures)).toFixed(2)
    );

    let willQuarantine = false;
    let newStatus = memory.status;
    let quarantineReason = memory.quarantine_reason;

    if (newConfidence < 0.25 && memory.status === 'active') {
      willQuarantine = true;
      newStatus = 'quarantined';
      quarantineReason = `Confidence dropped to ${newConfidence.toFixed(2)} (< 0.25) after ${failures} human rejection(s).`;
    }

    const updated = await this.repo.updateMemory(memory.id, {
      confidence: newConfidence,
      status: newStatus,
      quarantine_reason: quarantineReason,
    });

    const event: MemoryEvent = {
      id: `evt-outcome-${Date.now()}`,
      memory_id: memory.id,
      event_type: outcome.result === 'approved' ? 'feedback_approved' : 'feedback_rejected',
      timestamp: new Date().toISOString(),
      reason: `Human operator marked outcome '${outcome.result}'. Dynamic confidence updated to ${newConfidence.toFixed(2)}.${willQuarantine ? ' (Threshold breached -> Quarantined)' : ''}`,
      actor: outcome.actor,
      diff: {
        before: { confidence: prior },
        after: { confidence: newConfidence, status: newStatus },
      },
    };
    await this.repo.appendEvent(event);

    return {
      memory: updated,
      newConfidence,
      quarantined: willQuarantine,
    };
  }

  /**
   * Cascade Forgetting (GDPR Right-to-be-Forgotten):
   * Recursively deletes memory and all memories derived from it, writing an immutable tombstone.
   */
  async cascadeForget(memoryId: string): Promise<{ deletedIds: string[] }> {
    const deletedIds: string[] = [];
    const now = new Date().toISOString();

    const deleteRecursive = async (id: string) => {
      deletedIds.push(id);

      // Find children that have this id in derived_from
      const allMemories = await this.repo.findMemories();
      const children = allMemories.filter(
        (m) => m.derived_from && m.derived_from.includes(id)
      );

      for (const child of children) {
        await deleteRecursive(child.id);
      }

      await this.repo.deleteMemory(id);
    };

    await deleteRecursive(memoryId);

    // Append non-sensitive tombstone audit event
    const tombstoneEvent: MemoryEvent = {
      id: `evt-tombstone-${Date.now()}`,
      memory_id: memoryId,
      event_type: 'tombstone',
      timestamp: now,
      reason: `GDPR Right-to-be-Forgotten executed: Memory ${memoryId} and ${deletedIds.length - 1} derived records cascaded.`,
      actor: 'Data Protection Officer',
    };
    await this.repo.appendEvent(tombstoneEvent);

    return { deletedIds };
  }
}

