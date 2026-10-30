import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { InMemoryRepository } from '../inMemoryRepository.js';
import { LifecycleEngine } from '../lifecycleEngine.js';

describe('ANCHOR Lifecycle, Temporal Invalidation & Bayesian Outcomes', () => {
  it('Deployment event marks memories stale ONLY when depends_on intersects changed components', async () => {
    const repo = new InMemoryRepository();
    const lifecycle = new LifecycleEngine(repo);

    // Deployment modifying 'pg-pool'
    const res = await lifecycle.processDeployment({
      service: 'checkout-api',
      version: 'v2.2.0',
      changed_components: ['pg-pool'],
      timestamp: new Date().toISOString(),
      actor: 'GitHub Actions',
    });

    assert.ok(res.affected_memories_count > 0);
    assert.ok(res.affected_memory_ids.includes('mem-001'));

    // Verify mem-001 is now stale
    const mem1 = await repo.findMemoryById('mem-001');
    assert.equal(mem1?.status, 'stale');

    // Verify mem-002 (depends on 'mongodb-atlas') was NOT affected
    const mem2 = await repo.findMemoryById('mem-002');
    assert.equal(mem2?.status, 'active');
  });

  it('Bayesian outcome feedback dynamically updates confidence and quarantines on threshold breach', async () => {
    const repo = new InMemoryRepository();
    const lifecycle = new LifecycleEngine(repo);

    // Initial memory with confidence 0.50
    const mem = await repo.saveMemory({
      id: 'test-feedback-mem',
      owner: 'u1',
      workspace: 'w1',
      type: 'procedural',
      tier: 'warm',
      content: 'Experimental query optimization',
      entities: [],
      attribute_key: 'db.opt',
      value: 'val',
      depends_on: [],
      source: { kind: 'agent_inferred' },
      trust: 0.5,
      confidence: 0.5,
      status: 'active',
      valid_from: new Date().toISOString(),
      access_count: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    // 1st Rejection
    const res1 = await lifecycle.processOutcome({
      id: 'out-1',
      memory_id: mem.id,
      action_proposed: 'Apply query optimization',
      result: 'rejected',
      actor: 'DBA',
      timestamp: new Date().toISOString(),
    });

    // prior = 0.5, successes = 0, failures = 1 -> (0.5*4 + 0) / (4 + 0 + 2*1) = 2.0 / 6 = 0.33
    assert.ok(res1.newConfidence < 0.5);
    assert.equal(res1.quarantined, false);

    // 2nd Rejection
    const res2 = await lifecycle.processOutcome({
      id: 'out-2',
      memory_id: mem.id,
      action_proposed: 'Apply query optimization',
      result: 'rejected',
      actor: 'DBA',
      timestamp: new Date().toISOString(),
    });

    // successes = 0, failures = 2 -> (0.33*4 + 0) / (4 + 0 + 2*2) = 1.32 / 8 = 0.17 (< 0.25 threshold)
    assert.ok(res2.newConfidence < 0.25);
    assert.equal(res2.quarantined, true);

    const reloaded = await repo.findMemoryById(mem.id);
    assert.equal(reloaded?.status, 'quarantined');
    assert.match(reloaded?.quarantine_reason || '', /Confidence dropped/i);
  });

  it('Time travel reconstructs exact historical memory state at chosen timestamp', async () => {
    const repo = new InMemoryRepository();

    // Query state on Oct 16, 2026 (Before MongoDB migration on Oct 28)
    const historicalMemories = await repo.getTimeTravelState('2026-10-16T00:00:00Z');

    // mem-001 was created Oct 15 -> should be present
    assert.ok(historicalMemories.some((m) => m.id === 'mem-001'));

    // mem-002 was created Oct 28 -> must NOT be present
    assert.ok(!historicalMemories.some((m) => m.id === 'mem-002'));
  });

  it('Cascade Forgetting recursively deletes derived memories and logs non-sensitive tombstone', async () => {
    const repo = new InMemoryRepository();
    const lifecycle = new LifecycleEngine(repo);

    // Parent memory
    const parent = await repo.saveMemory({
      id: 'parent-mem',
      owner: 'u1',
      workspace: 'w1',
      type: 'semantic',
      tier: 'warm',
      content: 'Sensitive customer API configuration',
      entities: [],
      attribute_key: 'api.config',
      value: 'val',
      depends_on: [],
      source: { kind: 'user_stated' },
      trust: 0.8,
      confidence: 0.9,
      status: 'active',
      valid_from: new Date().toISOString(),
      access_count: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    // Derived child memory
    const child = await repo.saveMemory({
      id: 'child-mem',
      owner: 'u1',
      workspace: 'w1',
      type: 'procedural',
      tier: 'warm',
      content: 'Derived fix using parent config',
      entities: [],
      attribute_key: 'api.fix',
      value: 'val',
      depends_on: [],
      source: { kind: 'agent_inferred' },
      trust: 0.5,
      confidence: 0.7,
      status: 'active',
      derived_from: [parent.id],
      valid_from: new Date().toISOString(),
      access_count: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    const res = await lifecycle.cascadeForget(parent.id);

    assert.ok(res.deletedIds.includes(parent.id));
    assert.ok(res.deletedIds.includes(child.id));

    // Both should be gone from repository
    assert.equal(await repo.findMemoryById(parent.id), null);
    assert.equal(await repo.findMemoryById(child.id), null);

    // Tombstone event must be logged
    const events = await repo.getEvents();
    assert.ok(events.some((e) => e.event_type === 'tombstone'));
  });
});

