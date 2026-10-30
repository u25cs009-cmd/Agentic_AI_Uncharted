import { Request, Response, NextFunction } from 'express';
import { getRepository } from '../repositories/index.js';
import { AppError } from '../middleware/errorHandler.js';
import { calculateUpdatedConfidence } from '../utils/scoring.js';
import { EnvEvent, Outcome } from '../types/index.js';

export async function handleDeployEvent(req: Request, res: Response, next: NextFunction) {
  try {
    const { service, version, changed_components, environment } = req.body;
    if (!changed_components || !Array.isArray(changed_components)) {
      throw new AppError(400, 'changed_components array is required');
    }

    const repo = await getRepository();
    const allMemories = await repo.findMemories({ status: 'active' });
    const changedLower = changed_components.map((c: string) => c.toLowerCase());

    const affectedMemoryIds: string[] = [];

    // Deterministic Rule: code decides staleness, never the LLM
    for (const mem of allMemories) {
      const hasOverlap = mem.depends_on.some(dep => changedLower.includes(dep.toLowerCase())) ||
        mem.entities.some(ent => changedLower.includes(ent.toLowerCase()));

      if (hasOverlap) {
        await repo.updateMemory(mem._id, { status: 'stale' });
        affectedMemoryIds.push(mem._id);

        await repo.appendEvent({
          id: `evt-${Date.now()}-${affectedMemoryIds.length}`,
          memory_id: mem._id,
          event_type: 'stale',
          reason: `Deploy event for ${service || 'system'} (v${version || 'new'}) modified dependent component(s): ${changed_components.join(', ')}`,
          actor: 'DeployStalenessEngine',
          timestamp: new Date().toISOString(),
          snapshot: { status: 'stale' }
        });
      }
    }

    const envEvent: EnvEvent = {
      id: `env-${Date.now()}`,
      service: service || 'service',
      version: version || 'latest',
      changed_components,
      environment: environment || 'production',
      timestamp: new Date().toISOString(),
      affected_memory_ids: affectedMemoryIds
    };
    await repo.saveEnvEvent(envEvent);

    return res.json({
      success: true,
      affected_memories_count: affectedMemoryIds.length,
      stale_memory_ids: affectedMemoryIds,
      reason: `Component(s) [${changed_components.join(', ')}] changed in deploy. ${affectedMemoryIds.length} dependent memories transitioned to stale.`
    });
  } catch (err) {
    next(err);
  }
}

export async function handleOutcomeFeedback(req: Request, res: Response, next: NextFunction) {
  try {
    const { memory_id, action, feedback_source, user_id } = req.body;
    if (!memory_id) throw new AppError(400, 'memory_id is required');
    if (!['APPROVED', 'REJECTED'].includes(action)) {
      throw new AppError(400, "action must be either 'APPROVED' or 'REJECTED'");
    }

    const repo = await getRepository();
    const memory = await repo.getMemoryById(memory_id);
    if (!memory) {
      throw new AppError(404, `Memory '${memory_id}' not found`);
    }

    const previousConfidence = memory.confidence;
    const successes = action === 'APPROVED' ? 1 : 0;
    const failures = action === 'REJECTED' ? 1 : 0;

    // Apply blueprint exact Bayesian confidence formula:
    // confidence = (prior * 4 + successes) / (4 + successes + 2 * failures)
    const newConfidence = calculateUpdatedConfidence(previousConfidence, successes, failures);

    await repo.updateMemory(memory_id, {
      confidence: newConfidence,
      access_count: (memory.access_count || 0) + 1,
      last_used_at: new Date().toISOString()
    });

    const eventType = action === 'APPROVED' ? 'feedback_approved' : 'feedback_rejected';
    await repo.appendEvent({
      id: `evt-${Date.now()}`,
      memory_id,
      event_type: eventType,
      reason: `Human operator (${user_id || 'reviewer'}) marked action as ${action}. Confidence updated from ${previousConfidence} to ${newConfidence}.`,
      actor: feedback_source || 'Telegram Approval Bot',
      timestamp: new Date().toISOString(),
      snapshot: { confidence: newConfidence }
    });

    const outcome: Outcome = {
      id: `out-${Date.now()}`,
      memory_id,
      action,
      feedback_source: feedback_source || 'operator',
      user_id: user_id || 'admin',
      timestamp: new Date().toISOString(),
      previous_confidence: previousConfidence,
      new_confidence: newConfidence,
      formula_applied: '(prior * 4 + successes) / (4 + successes + 2 * failures)'
    };
    await repo.saveOutcome(outcome);

    return res.json({
      success: true,
      memory_id,
      action,
      previous_confidence: previousConfidence,
      new_confidence: newConfidence,
      formula_applied: '(prior * 4 + successes) / (4 + successes + 2 * failures)'
    });
  } catch (err) {
    next(err);
  }
}
