import { Memory, MemoryEvent, MemoryFilter } from '../types/index.js';

export interface ScopedAccessContext {
  userId: string;
  workspaceId: string;
}

/**
 * Standard Scoped Access Helper for MongoDB queries
 * Guarantees that users can only read memories within their workspace,
 * and cannot access private memories owned by other users.
 */
export function buildScopedMongoMemoryFilter(ctx: ScopedAccessContext, filter?: MemoryFilter): any {
  const andClauses: any[] = [];

  // 1. Workspace boundary (must match active workspace)
  andClauses.push({
    $or: [
      { workspaceId: ctx.workspaceId },
      { workspace: ctx.workspaceId }
    ]
  });

  // 2. Visibility & Ownership boundary
  // Visible if public to workspace OR explicitly owned by user
  andClauses.push({
    $or: [
      { visibility: 'workspace' },
      { visibility: { $exists: false } },
      { ownerId: ctx.userId },
      { owner: ctx.userId }
    ]
  });

  // 3. User-supplied filters
  if (filter?.status && filter.status !== 'all') {
    andClauses.push({ status: filter.status });
  }
  if (filter?.type && filter.type !== 'all') {
    andClauses.push({ type: filter.type });
  }
  if (filter?.tier && filter.tier !== 'all') {
    andClauses.push({ tier: filter.tier });
  }
  if (filter?.source && filter.source !== 'all') {
    andClauses.push({ 'source.kind': filter.source });
  }
  if (filter?.attribute_key) {
    andClauses.push({ attribute_key: filter.attribute_key });
  }
  if (filter?.entity) {
    andClauses.push({ entities: filter.entity });
  }
  if (filter?.search) {
    andClauses.push({
      $or: [
        { content: { $regex: filter.search, $options: 'i' } },
        { attribute_key: { $regex: filter.search, $options: 'i' } },
        { entities: { $regex: filter.search, $options: 'i' } }
      ]
    });
  }

  return { $and: andClauses };
}

/**
 * Standard Scoped Access Helper for In-Memory Memory arrays
 */
export function filterScopedInMemoryMemories(memories: Memory[], ctx: ScopedAccessContext, filter?: MemoryFilter): Memory[] {
  return memories.filter((m) => {
    // 1. Workspace boundary
    const memWs = m.workspaceId || m.workspace || 'ws-primary';
    if (memWs !== ctx.workspaceId) return false;

    // 2. Visibility boundary
    const memOwner = m.ownerId || m.owner;
    if (m.visibility === 'private' && memOwner !== ctx.userId) {
      return false;
    }

    // 3. Filter criteria
    if (filter?.status && filter.status !== 'all' && m.status !== filter.status) return false;
    if (filter?.type && filter.type !== 'all' && m.type !== filter.type) return false;
    if (filter?.tier && filter.tier !== 'all' && m.tier !== filter.tier) return false;
    if (filter?.source && filter.source !== 'all' && m.source?.kind !== filter.source) return false;
    if (filter?.attribute_key && m.attribute_key !== filter.attribute_key) return false;
    if (filter?.entity && !m.entities.includes(filter.entity)) return false;
    if (filter?.search) {
      const q = filter.search.toLowerCase();
      const match =
        m.content.toLowerCase().includes(q) ||
        m.attribute_key.toLowerCase().includes(q) ||
        m.entities.some((e) => e.toLowerCase().includes(q));
      if (!match) return false;
    }

    return true;
  });
}

/**
 * Standard Scoped Access Helper for Events in MongoDB
 */
export function buildScopedMongoEventFilter(ctx: ScopedAccessContext, memoryId?: string): any {
  const andClauses: any[] = [];

  // Workspace boundary
  andClauses.push({
    $or: [
      { workspaceId: ctx.workspaceId },
      { workspace: ctx.workspaceId },
      { workspaceId: { $exists: false } }
    ]
  });

  // Owner boundary for private events
  andClauses.push({
    $or: [
      { visibility: 'workspace' },
      { visibility: { $exists: false } },
      { ownerId: ctx.userId },
      { owner: ctx.userId },
      { ownerId: { $exists: false } }
    ]
  });

  if (memoryId) {
    andClauses.push({ memory_id: memoryId });
  }

  return { $and: andClauses };
}

/**
 * Standard Scoped Access Helper for In-Memory Events
 */
export function filterScopedInMemoryEvents(events: MemoryEvent[], ctx: ScopedAccessContext, memoryId?: string): MemoryEvent[] {
  return events.filter((e) => {
    const evtWs = (e as any).workspaceId || (e as any).workspace;
    if (evtWs && evtWs !== ctx.workspaceId) return false;

    const evtOwner = (e as any).ownerId || (e as any).owner;
    const evtVis = (e as any).visibility;
    if (evtVis === 'private' && evtOwner && evtOwner !== ctx.userId) return false;

    if (memoryId && e.memory_id !== memoryId) return false;

    return true;
  });
}
