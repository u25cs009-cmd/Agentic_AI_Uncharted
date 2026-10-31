import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryRepository } from '../src/repositories/InMemoryRepository.js';
import { Memory, MemoryEvent } from '../src/types/index.js';

describe('STEP 5: Transactional Atomic Writes & Mid-Write Failure Tests', () => {
  let repo: InMemoryRepository;

  beforeEach(async () => {
    repo = new InMemoryRepository();
    await repo.init();
  });

  it('1. Aborts ingestTransactional on mid-write failure: memory is not persisted if event write fails', async () => {
    const memoryId = 'mem-tx-fail-001';
    const testMemory: Memory = {
      _id: memoryId,
      id: memoryId,
      owner: 'usr-tx',
      workspace: 'ws-tx',
      type: 'procedural',
      tier: 'hot',
      content: 'Atomic transaction test memory',
      entities: ['test'],
      attribute_key: 'test.tx.fail',
      value: 'value-1',
      depends_on: [],
      source: { kind: 'user_stated' },
      trust: 0.8,
      confidence: 0.9,
      status: 'active',
      valid_from: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const testEvent: MemoryEvent = {
      id: 'evt-tx-fail-001',
      memory_id: memoryId,
      workspace: 'ws-tx',
      owner: 'usr-tx',
      event_type: 'created',
      reason: 'Transaction test',
      timestamp: new Date().toISOString()
    };

    // Force failure mid-write by mocking appendEvent to throw
    const originalAppend = repo.appendEvent.bind(repo);
    repo.appendEvent = async () => {
      throw new Error('Simulated DB connection crash during event write');
    };

    await expect(repo.ingestTransactional(testMemory, testEvent)).rejects.toThrow(
      'Simulated DB connection crash during event write'
    );

    // Restore appendEvent
    repo.appendEvent = originalAppend;

    // Verify atomicity: memory was rolled back and is NOT present in repository
    const foundMem = await repo.getMemoryById(memoryId, 'usr-tx', 'ws-tx');
    expect(foundMem).toBeNull();

    // Verify event was NOT persisted
    const events = await repo.getEvents(50, 'usr-tx', 'ws-tx');
    const foundEvt = events.find(e => e.memory_id === memoryId);
    expect(foundEvt).toBeUndefined();
  });

  it('2. Aborts supersedeTransactional on mid-write failure: preserves old active state and rolls back new memory', async () => {
    const oldMemoryId = 'mem-tx-old-002';
    const oldMemory: Memory = {
      _id: oldMemoryId,
      id: oldMemoryId,
      owner: 'usr-tx',
      workspace: 'ws-tx',
      type: 'semantic',
      tier: 'warm',
      content: 'Original un-superseded configuration',
      entities: ['infra'],
      attribute_key: 'infra.pool.size',
      value: '25',
      depends_on: [],
      source: { kind: 'user_stated' },
      trust: 0.85,
      confidence: 0.9,
      status: 'active',
      valid_from: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    await repo.saveMemory(oldMemory);

    const newMemoryId = 'mem-tx-new-002';
    const newMemory: Memory = {
      ...oldMemory,
      _id: newMemoryId,
      id: newMemoryId,
      value: '50',
      status: 'active'
    };

    const oldEvent: MemoryEvent = {
      id: 'evt-sup-old',
      memory_id: oldMemoryId,
      event_type: 'superseded',
      timestamp: new Date().toISOString()
    };
    const newEvent: MemoryEvent = {
      id: 'evt-add-new',
      memory_id: newMemoryId,
      event_type: 'created',
      timestamp: new Date().toISOString()
    };

    // Force failure midway through saving new memory
    const originalSave = repo.saveMemory.bind(repo);
    let callCount = 0;
    repo.saveMemory = async (m: Memory) => {
      callCount++;
      if (m._id === newMemoryId) {
        throw new Error('Simulated write conflict / disk failure while writing new memory document');
      }
      return originalSave(m);
    };

    await expect(
      repo.supersedeTransactional(oldMemoryId, newMemory, oldEvent, newEvent, 'usr-tx', 'ws-tx')
    ).rejects.toThrow('Simulated write conflict / disk failure');

    repo.saveMemory = originalSave;

    // Verify old memory remains completely active (NOT superseded)
    const verifiedOld = await repo.getMemoryById(oldMemoryId, 'usr-tx', 'ws-tx');
    expect(verifiedOld).not.toBeNull();
    expect(verifiedOld?.status).toBe('active');
    expect(verifiedOld?.superseded_by).toBeFalsy();

    // Verify new memory was NOT created
    const verifiedNew = await repo.getMemoryById(newMemoryId, 'usr-tx', 'ws-tx');
    expect(verifiedNew).toBeNull();
  });

  it('3. Aborts cascadeDeleteTransactional on mid-write failure: preserves parent and derived memories', async () => {
    const parentId = 'mem-tx-parent-003';
    const parentMem: Memory = {
      _id: parentId,
      id: parentId,
      owner: 'usr-tx',
      workspace: 'ws-tx',
      type: 'semantic',
      tier: 'warm',
      content: 'Parent database configuration',
      entities: ['db'],
      attribute_key: 'db.config',
      value: 'main',
      depends_on: [],
      source: { kind: 'user_stated' },
      trust: 0.9,
      confidence: 0.9,
      status: 'active',
      valid_from: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    await repo.saveMemory(parentMem);

    const derivedId = 'mem-tx-derived-003';
    const derivedMem: Memory = {
      ...parentMem,
      _id: derivedId,
      id: derivedId,
      derived_from: [parentId],
      attribute_key: 'db.config.derived'
    };
    await repo.saveMemory(derivedMem);

    // Fail during tombstone event insertion
    const originalAppend = repo.appendEvent.bind(repo);
    repo.appendEvent = async () => {
      throw new Error('Simulated network timeout during tombstone event emission');
    };

    const tombstone = {
      id: 'evt-tomb-003',
      memory_id: parentId,
      event_type: 'tombstone' as const,
      timestamp: new Date().toISOString()
    };

    await expect(
      repo.cascadeDeleteTransactional(parentId, [tombstone], 'usr-tx', 'ws-tx')
    ).rejects.toThrow('Simulated network timeout during tombstone event emission');

    repo.appendEvent = originalAppend;

    // Verify neither parent nor derived memories were deleted
    const checkParent = await repo.getMemoryById(parentId, 'usr-tx', 'ws-tx');
    expect(checkParent).not.toBeNull();

    const checkDerived = await repo.getMemoryById(derivedId, 'usr-tx', 'ws-tx');
    expect(checkDerived).not.toBeNull();
  });
});
