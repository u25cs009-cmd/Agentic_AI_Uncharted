import { Request, Response, NextFunction } from 'express';
import { getRepository } from '../repositories/index.js';
import { AppError } from '../middleware/errorHandler.js';
import { MemoryFilter } from '../types/index.js';
import { config } from '../config/index.js';
import { timingSafeCompare, isValidInternalKey } from '../middleware/auth.js';

export async function getMemories(req: Request, res: Response, next: NextFunction) {
  try {
    const repo = await getRepository();
    const isSystemWebhook = req.user?.id === 'system-webhook';
    const filter: MemoryFilter = {
      owner: isSystemWebhook ? undefined : req.user?.id,
      workspace: req.user?.workspace || 'ws-primary',
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
    const updates = req.body || {};

    const configuredKey = config.internalApiKey;
    const internalHeader = req.headers['x-internal-key'];
    const isInternal = isValidInternalKey(internalHeader);

    // Enforce strict user ownership
    const ownerId = req.user?.id || (isInternal ? (req.body.user_id || req.query.user_id) : undefined);
    const workspace = req.user?.workspace || (isInternal ? (req.body.workspace || req.query.workspace) : undefined);

    if (!ownerId || typeof ownerId !== 'string') {
      throw new AppError(401, 'Authentication or explicit user ownership context is required to modify memory');
    }

    const updated = await repo.updateMemory(id, updates, ownerId, workspace);
    if (!updated) {
      throw new AppError(404, `Memory '${id}' not found or access denied`);
    }

    await repo.appendEvent({
      id: `evt-${Date.now()}`,
      memory_id: id,
      event_type: 'updated',
      reason: req.body.reason || 'Memory updated via Memory Explorer or automation',
      actor: isInternal ? 'n8n_automation' : (req.user?.email || 'user'),
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

    const configuredKey = config.internalApiKey;
    const internalHeader = req.headers['x-internal-key'];
    const isInternal = isValidInternalKey(internalHeader);

    // Enforce strict user ownership
    const ownerId = req.user?.id || (isInternal ? (req.body.user_id || req.query.user_id) : undefined);
    const workspace = req.user?.workspace || (isInternal ? (req.body.workspace || req.query.workspace) : undefined);

    if (!ownerId || typeof ownerId !== 'string') {
      throw new AppError(401, 'Authentication or explicit user ownership context is required to delete memory');
    }

    const existing = await repo.getMemoryById(id, ownerId, workspace);
    if (!existing) {
      throw new AppError(404, `Memory '${id}' not found or access denied`);
    }

    if (typeof repo.cascadeDeleteTransactional === 'function') {
      const tombstoneEvent = {
        id: `evt-${Date.now()}`,
        memory_id: id,
        workspaceId: workspace || 'ws-primary',
        ownerId,
        event_type: 'tombstone' as const,
        reason: 'Memory deleted by user. Cascade purged derived memory records.',
        actor: isInternal ? 'n8n_automation' : (req.user?.email || 'user'),
        timestamp: new Date().toISOString()
      };

      const { deletedCount } = await repo.cascadeDeleteTransactional(
        id,
        [tombstoneEvent],
        ownerId,
        workspace
      );

      return res.json({
        success: true,
        message: `Memory '${id}' and derived memories deleted (${deletedCount} total). Tombstone recorded.`,
        deletedCount
      });
    } else {
      await repo.deleteMemory(id, ownerId, workspace);
      const derivedDeleted = await repo.deleteDerivedMemories(id, ownerId, workspace);

      await repo.appendEvent({
        id: `evt-${Date.now()}`,
        memory_id: id,
        event_type: 'tombstone',
        reason: `Memory deleted by user. Forget cascade purged ${derivedDeleted} derived memory records.`,
        actor: isInternal ? 'n8n_automation' : (req.user?.email || 'user'),
        timestamp: new Date().toISOString()
      });

      return res.json({
        success: true,
        message: `Memory '${id}' and derived memories deleted (${1 + derivedDeleted} total). Tombstone recorded.`,
        deletedCount: 1 + derivedDeleted
      });
    }
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

