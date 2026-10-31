import { Request, Response, NextFunction } from 'express';
import { getRepository } from '../repositories/index.js';
import { AppError } from '../middleware/errorHandler.js';
import { MemoryFilter } from '../types/index.js';

export async function getMemories(req: Request, res: Response, next: NextFunction) {
  try {
    const repo = await getRepository();
    const filter: MemoryFilter = {
      owner: req.user?.id,
      workspace: req.user?.workspace,
      status: req.query.status as string,
      type: req.query.type as string,
      tier: req.query.tier as string,
      source: req.query.source as string,
      search: req.query.search as string,
      attribute_key: req.query.attribute_key as string,
      entity: req.query.entity as string
    };

    const memories = await repo.findMemories(filter);
    return res.json(memories);
  } catch (err) {
    next(err);
  }
}

export async function getMemoryById(req: Request, res: Response, next: NextFunction) {
  try {
    const repo = await getRepository();
const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const memory = await repo.getMemoryById(id, req.user?.id, req.user?.workspace);
    if (!memory) {
      throw new AppError(404, `Memory '${id}' not found`);
    }
    return res.json(memory);
  } catch (err) {
    next(err);
  }
}

export async function updateMemory(req: Request, res: Response, next: NextFunction) {
  try {
    const repo = await getRepository();
const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const updates = req.body;

    const updated = await repo.updateMemory(id, updates, req.user?.id, req.user?.workspace);
    if (!updated) {
      throw new AppError(404, `Memory '${id}' not found`);
    }

    await repo.appendEvent({
      id: `evt-${Date.now()}`,
      memory_id: id,
      event_type: 'updated',
      reason: req.body.reason || 'Memory updated via Memory Explorer',
      actor: req.user?.email || 'user',
      timestamp: new Date().toISOString(),
      snapshot: { ...updates }
    });

    return res.json(updated);
  } catch (err) {
    next(err);
  }
}

export async function deleteMemory(req: Request, res: Response, next: NextFunction) {
  try {
    const repo = await getRepository();
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    const existing = await repo.getMemoryById(id, req.user?.id, req.user?.workspace);
    if (!existing) {
      throw new AppError(404, `Memory '${id}' not found`);
    }

    // Step 5: Transactional cascade delete with atomic tombstone event recording
    const tombstoneEvent = {
      id: `evt-${Date.now()}`,
      memory_id: id,
      workspaceId: req.user?.workspace || 'ws-primary',
      ownerId: req.user?.id || 'usr-shakti2',
      event_type: 'tombstone' as const,
      reason: 'Memory deleted by user. Cascade purged derived memory records.',
      actor: req.user?.email || 'user',
      timestamp: new Date().toISOString()
    };

    const { deletedCount } = await repo.cascadeDeleteTransactional(
      id,
      [tombstoneEvent],
      req.user?.id,
      req.user?.workspace
    );

    return res.json({
      success: true,
      message: `Memory '${id}' and derived memories deleted (${deletedCount} total). Tombstone recorded.`
    });
  } catch (err) {
    next(err);
  }
}

export async function getEvents(req: Request, res: Response, next: NextFunction) {
  try {
    const repo = await getRepository();
    const limit = parseInt(req.query.limit as string || '100', 10);
    const events = await repo.getEvents(limit, req.user?.id, req.user?.workspace);
    return res.json(events);
  } catch (err) {
    next(err);
  }
}

export async function getMemoryEvents(req: Request, res: Response, next: NextFunction) {
  try {
    const repo = await getRepository();
const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const events = await repo.getEventsForMemory(id, req.user?.id, req.user?.workspace);
    return res.json(events);
  } catch (err) {
    next(err);
  }
}

