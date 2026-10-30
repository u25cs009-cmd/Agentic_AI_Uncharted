import { Request, Response, NextFunction } from 'express';
import { getRepository } from '../repositories/index.js';
import { AppError } from '../middleware/errorHandler.js';

export async function getQuarantinedMemories(req: Request, res: Response, next: NextFunction) {
  try {
    const repo = await getRepository();
    const quarantined = await repo.findMemories({
      owner: req.user?.id,
      workspace: req.user?.workspace,
      status: 'quarantined'
    });
    return res.json(quarantined);
  } catch (err) {
    next(err);
  }
}

export async function releaseQuarantine(req: Request, res: Response, next: NextFunction) {
  try {
    const repo = await getRepository();
    const id = req.params.id as string;

    const existing = await repo.getMemoryById(id, req.user?.id, req.user?.workspace);
    if (!existing) {
      throw new AppError(404, `Quarantined memory '${id}' not found`);
    }

    const updated = await repo.updateMemory(
      id,
      {
        status: 'active',
        trust: 0.85,
        quarantine_reason: undefined
      },
      req.user?.id,
      req.user?.workspace
    );

    await repo.appendEvent({
      id: `evt-${Date.now()}`,
      memory_id: id,
      event_type: 'released',
      reason: req.body.reason || 'Human administrator reviewed and approved quarantined memory',
      actor: req.user?.email || 'Human Reviewer',
      timestamp: new Date().toISOString()
    });

    return res.json({
      success: true,
      message: `Memory '${id}' released from quarantine to active state.`,
      memory: updated
    });
  } catch (err) {
    next(err);
  }
}

export async function rejectQuarantine(req: Request, res: Response, next: NextFunction) {
  try {
    const repo = await getRepository();
    const id = req.params.id as string;

    const existing = await repo.getMemoryById(id, req.user?.id, req.user?.workspace);
    if (!existing) {
      throw new AppError(404, `Quarantined memory '${id}' not found`);
    }

    await repo.appendEvent({
      id: `evt-${Date.now()}`,
      memory_id: id,
      event_type: 'feedback_rejected',
      reason: req.body.reason || 'Human administrator confirmed poison/injection payload and rejected memory',
      actor: req.user?.email || 'Human Reviewer',
      timestamp: new Date().toISOString()
    });

    await repo.deleteMemory(id, req.user?.id, req.user?.workspace);

    return res.json({
      success: true,
      message: `Quarantined memory '${id}' permanently rejected and purged.`
    });
  } catch (err) {
    next(err);
  }
}

