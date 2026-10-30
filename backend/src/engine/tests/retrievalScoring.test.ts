import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { InMemoryRepository } from '../inMemoryRepository.js';
import { RetrievalEngine, HALF_LIFE_DAYS } from '../retrievalEngine.js';
import { Memory } from '../types.js';

describe('ANCHOR Retrieval Scoring & Deterministic Abstention', () => {
  it('Calculates recency decay correctly based on half-life', () => {
    const baseDate = new Date('2026-10-31T00:00:00Z');

    // Episodic memory (Half-life = 7 days) exactly 7 days old
    const sevenDaysAgo = new Date('2026-10-24T00:00:00Z').toISOString();
    const episodicMem: Memory = {
      id: 'test-ep',
      owner: 'u1',
      workspace: 'w1',
      type: 'episodic',
      tier: 'warm',
      content: 'Episodic event 7 days ago',
      entities: [],
      attribute_key: 'test.ep',
      value: 'val',
      depends_on: [],
      source: { kind: 'user_stated' },
      trust: 0.8,
      confidence: 0.9,
      status: 'active',
      valid_from: sevenDaysAgo,
      created_at: sevenDaysAgo,
      updated_at: sevenDaysAgo,
      access_count: 0,
    };

    const recency = RetrievalEngine.calculateRecency(episodicMem, baseDate);
    // At age == half-life, recency = 0.5 ^ (7 / 7) = 0.50
    assert.ok(Math.abs(recency - 0.5) < 0.05);
  });

  it('Core Hot Tier memories bypass recency decay (recency = 1.0)', () => {
    const baseDate = new Date('2026-10-31T00:00:00Z');
    const oldDate = new Date('2025-01-01T00:00:00Z').toISOString(); // 1+ year old

    const coreHotMem: Memory = {
      id: 'test-hot',
      owner: 'u1',
      workspace: 'w1',
      type: 'procedural',
      tier: 'hot', // Core hot tier
      content: 'Critical procedure',
      entities: [],
      attribute_key: 'test.proc',
      value: 'val',
      depends_on: [],
      source: { kind: 'human_approved' },
      trust: 1.0,
      confidence: 1.0,
      status: 'active',
      valid_from: oldDate,
      created_at: oldDate,
      updated_at: oldDate,
      access_count: 50,
    };

    const recency = RetrievalEngine.calculateRecency(coreHotMem, baseDate);
    assert.equal(recency, 1.0);
  });

  it('Abstains safely when final score is below 0.25 threshold', async () => {
    const repo = new InMemoryRepository();
    const retrieval = new RetrievalEngine(repo);

    // Completely unrelated query with no semantic or keyword matches
    const res = await retrieval.retrieve({
      query: 'quantum superposition calculation in cryogenic physics',
    });

    assert.equal(res.abstained, true);
    assert.match(res.abstention_reason || '', /score threshold 0.25/i);
    assert.equal(res.usable_memories.length, 0);
  });

  it('Filters out stale memories from usable context', async () => {
    const repo = new InMemoryRepository();
    const retrieval = new RetrievalEngine(repo);

    const res = await retrieval.retrieve({
      query: 'Postgres pg_ctlcluster',
    });

    // Stale memories (mem-004, mem-005) must be excluded from usable memories
    assert.ok(res.usable_memories.every((m) => m.memory.status === 'active'));
    assert.ok(res.filtered_memories.some((m) => m.memory.id === 'mem-004'));
  });
});

