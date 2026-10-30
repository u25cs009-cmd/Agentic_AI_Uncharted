import { Request, Response, NextFunction } from 'express';
import { getRepository } from '../repositories/index.js';
import { AppError } from '../middleware/errorHandler.js';
import { Memory } from '../types/index.js';

export async function timeTravel(req: Request, res: Response, next: NextFunction) {
  try {
    const timestamp = (req.query.at || req.query.timestamp) as string;
    if (!timestamp) {
      throw new AppError(400, "Query parameter 'at' or 'timestamp' in ISO format is required");
    }

    const targetDate = new Date(timestamp);
    if (isNaN(targetDate.getTime())) {
      throw new AppError(400, "Invalid timestamp format. Use ISO 8601 string (e.g. '2026-10-28T08:30:00Z')");
    }

    const repo = await getRepository();
    // Retrieve all memories and historical events
    const allMemories = await repo.findMemories({ owner: req.user?.id, workspace: req.user?.workspace });
    const events = await repo.getEvents(500, req.user?.id, req.user?.workspace);

    // Replay state up to targetDate:
    // Only keep memories that existed before or at targetDate, and reconstruct their status
    const targetMs = targetDate.getTime();
    const reconstructed: Memory[] = [];

    for (const mem of allMemories) {
      const createdMs = new Date(mem.created_at || mem.valid_from).getTime();
      if (createdMs <= targetMs) {
        // If it was marked stale after targetDate, it was active at targetDate!
        const memCopy = { ...mem };
        const eventsAfterTarget = events.filter(e => e.memory_id === mem._id && new Date(e.timestamp).getTime() > targetMs);

        // If a stale or deleted event happened after targetMs, revert status to active
        if (eventsAfterTarget.some(e => e.event_type === 'stale' || e.event_type === 'superseded')) {
          memCopy.status = 'active';
        }

        reconstructed.push(memCopy);
      }
    }

    return res.json({
      target_timestamp: timestamp,
      active_memories_count: reconstructed.length,
      memories: reconstructed
    });
  } catch (err) {
    next(err);
  }
}
