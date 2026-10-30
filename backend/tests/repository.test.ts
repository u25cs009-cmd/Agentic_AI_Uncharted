import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { InMemoryRepository } from '../src/repositories/InMemoryRepository.js';
import { Memory } from '../src/types/index.js';
import { calculateUpdatedConfidence, calculateRecency, calculateFinalScore } from '../src/utils/scoring.js';
import { maskPII } from '../src/utils/pii.js';

describe('ANCHOR Backend Core Utilities & Scoring', () => {
  it('should correctly calculate Bayesian confidence updates', () => {
    // Formula: confidence = (prior * 4 + successes) / (4 + successes + 2 * failures)
    const prior = 0.8;
    // 1 approval (success = 1, failure = 0)
    // (0.8 * 4 + 1) / (4 + 1 + 0) = 4.2 / 5 = 0.84
    const updatedApproval = calculateUpdatedConfidence(prior, 1, 0);
    expect(updatedApproval).toBe(0.84);

    // 1 rejection (success = 0, failure = 1)
    // (0.8 * 4 + 0) / (4 + 0 + 2) = 3.2 / 6 = 0.5333
    const updatedRejection = calculateUpdatedConfidence(prior, 0, 1);
    expect(updatedRejection).toBe(0.5333);
  });

  it('should calculate recency decay based on memory half-lives', () => {
    const nowISO = new Date().toISOString();
    // Fresh memory should have recency = 1.0
    const freshRecency = calculateRecency(nowISO, 'semantic');
    expect(freshRecency).toBeCloseTo(1.0, 2);

    // Memory aged 60 days for semantic (halfLife = 60) should have recency ~ 0.5
    const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();
    const halfDecayed = calculateRecency(sixtyDaysAgo, 'semantic');
    expect(halfDecayed).toBeCloseTo(0.5, 2);
  });

  it('should correctly calculate composite final score', () => {
    // final_score = similarity * trust * confidence * recency
    const finalScore = calculateFinalScore(0.9, 0.8, 0.95, 1.0);
    expect(finalScore).toBe(0.684);
  });

  it('should mask PII before storage', () => {
    const raw = 'Contact dev@shakti2.io or call +1-555-123-4567 with API key sk-abcdef123456789012345678.';
    const scrubbed = maskPII(raw);
    expect(scrubbed).toContain('[REDACTED_EMAIL]');
    expect(scrubbed).toContain('[REDACTED_PHONE]');
    expect(scrubbed).toContain('[REDACTED_API_KEY]');
  });
});

describe('InMemoryRepository Core Operations', () => {
  let repo: InMemoryRepository;

  beforeEach(async () => {
    repo = new InMemoryRepository();
    await repo.init();
  });

  afterEach(async () => {
    await repo.close();
  });

  it('should save, find, and update memory records', async () => {
    const testMem: Memory = {
      _id: 'test-mem-01',
      owner: 'usr-ayush',
      workspace: 'ws-test',
      type: 'semantic',
      tier: 'hot',
      content: 'Redis caching reduces database read load by 60%.',
      attribute_key: 'infra.cache.redis',
      value: 'Redis v7',
      entities: ['redis', 'cache'],
      depends_on: ['infra'],
      source: { kind: 'user_stated', actor: 'ayush' },
      trust: 0.8,
      confidence: 0.9,
      status: 'active',
      valid_from: new Date().toISOString(),
      valid_to: null,
      superseded_by: null,
      env_fingerprint: { service: 'redis' },
      derived_from: [],
      access_count: 0,
      last_used_at: null,
      expires_at: null
    };

    const saved = await repo.saveMemory(testMem);
    expect(saved._id).toBe('test-mem-01');

    const retrieved = await repo.getMemoryById('test-mem-01', 'usr-ayush', 'ws-test');
    expect(retrieved).toBeDefined();
    expect(retrieved?.content).toContain('Redis caching');

    // Update
    const updated = await repo.updateMemory('test-mem-01', { confidence: 0.95 }, 'usr-ayush', 'ws-test');
    expect(updated?.confidence).toBe(0.95);
  });

  it('should enforce user isolation: User A cannot read User B memories', async () => {
    const memUserA: Memory = {
      _id: 'mem-user-a',
      owner: 'user-a',
      workspace: 'ws-a',
      type: 'semantic',
      tier: 'hot',
      content: 'Secret project roadmap for User A',
      attribute_key: 'roadmap.a',
      value: 'confidential',
      entities: ['project'],
      depends_on: [],
      source: { kind: 'user_stated' },
      trust: 0.8,
      confidence: 0.9,
      status: 'active',
      valid_from: new Date().toISOString(),
      valid_to: null,
      superseded_by: null,
      env_fingerprint: {},
      derived_from: [],
      access_count: 0,
      last_used_at: null,
      expires_at: null
    };

    await repo.saveMemory(memUserA);

    // User A can read it
    const resA = await repo.getMemoryById('mem-user-a', 'user-a', 'ws-a');
    expect(resA).not.toBeNull();

    // User B CANNOT read it even if they know the ID
    const resB = await repo.getMemoryById('mem-user-a', 'user-b', 'ws-b');
    expect(resB).toBeNull();
  });

  it('should execute Forget Cascade and delete derived memories', async () => {
    const parent: Memory = {
      _id: 'parent-01',
      owner: 'usr-ayush',
      workspace: 'ws-test',
      type: 'semantic',
      tier: 'hot',
      content: 'Core architecture design fact',
      attribute_key: 'arch.core',
      value: 'v1',
      entities: [],
      depends_on: [],
      source: { kind: 'user_stated' },
      trust: 0.8,
      confidence: 0.9,
      status: 'active',
      valid_from: new Date().toISOString(),
      valid_to: null,
      superseded_by: null,
      env_fingerprint: {},
      derived_from: [],
      access_count: 0,
      last_used_at: null,
      expires_at: null
    };

    const derived: Memory = {
      _id: 'derived-01',
      owner: 'usr-ayush',
      workspace: 'ws-test',
      type: 'semantic',
      tier: 'warm',
      content: 'Summary inferred from parent architecture fact',
      attribute_key: 'arch.summary',
      value: 'v1-summary',
      entities: [],
      depends_on: [],
      source: { kind: 'agent_inferred' },
      trust: 0.5,
      confidence: 0.7,
      status: 'active',
      valid_from: new Date().toISOString(),
      valid_to: null,
      superseded_by: null,
      env_fingerprint: {},
      derived_from: ['parent-01'],
      access_count: 0,
      last_used_at: null,
      expires_at: null
    };

    await repo.saveMemory(parent);
    await repo.saveMemory(derived);

    // Forget cascade
    await repo.deleteMemory('parent-01', 'usr-ayush', 'ws-test');
    const purgedCount = await repo.deleteDerivedMemories('parent-01', 'usr-ayush', 'ws-test');
    expect(purgedCount).toBe(1);

    const derivedCheck = await repo.getMemoryById('derived-01', 'usr-ayush', 'ws-test');
    expect(derivedCheck).toBeNull();
  });

  it('should find downstream memories matching component dependencies', async () => {
    const downstream = await repo.findDownstreamMemories('pg-pool');
    expect(downstream.length).toBeGreaterThan(0);
    expect(downstream.some(m => m.attribute_key === 'checkout-api.fix.db_timeout')).toBe(true);
  });
});
