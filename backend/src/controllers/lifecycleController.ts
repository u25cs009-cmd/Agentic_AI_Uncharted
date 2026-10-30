import { Request, Response, NextFunction } from 'express';
import { getRepository } from '../repositories/index.js';
import { Memory } from '../types/index.js';

export async function consolidateMemories(req: Request, res: Response, next: NextFunction) {
  try {
    const repo = await getRepository();
    const owner = req.user?.id || 'usr-shakti2';
    const workspace = req.user?.workspace || 'ws-primary';

    const allMemories = await repo.findMemories({ owner, workspace });
    const now = new Date();
    let expiredCount = 0;
    let archivedCount = 0;

    for (const mem of allMemories) {
      // 1. Check TTL expiry
      if (mem.expires_at && new Date(mem.expires_at) < now) {
        await repo.updateMemory(mem._id, { status: 'stale' }, owner, workspace);
        await repo.appendEvent({
          id: `evt-cons-exp-${Date.now()}-${expiredCount}`,
          memory_id: mem._id,
          event_type: 'stale',
          reason: 'Automated lifecycle consolidation: TTL expired',
          actor: 'ANCHOR Lifecycle Consolidator (W4)',
          timestamp: now.toISOString()
        });
        expiredCount++;
      }

      // 2. Archive stale memories into archive tier
      if (mem.status === 'stale' && mem.tier !== 'archive') {
        await repo.updateMemory(mem._id, { tier: 'archive' }, owner, workspace);
        archivedCount++;
      }
    }

    const updatedMemories = await repo.findMemories({ owner, workspace });
    const activeCount = updatedMemories.filter(m => m.status === 'active').length;

    return res.json({
      success: true,
      consolidated_at: now.toISOString(),
      expiredCount,
      archivedCount,
      activeCount,
      totalMemories: updatedMemories.length,
      message: `Consolidation complete: ${expiredCount} expired facts marked stale, ${archivedCount} demoted to archive tier.`
    });
  } catch (err) {
    next(err);
  }
}
