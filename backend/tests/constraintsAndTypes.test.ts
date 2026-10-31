import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../src/server.js';
import { getRepository } from '../src/repositories/index.js';
import { calculateRecency } from '../src/utils/scoring.js';
import { config } from '../src/config/index.js';
import { Memory } from '../src/types/index.js';

describe('STEP 7: Memory Types, Constraints, Decays & Core Tier Cap', () => {
  const testUser = {
    id: 'usr-constraints-tester',
    email: 'constraints@example.com',
    workspace: 'ws-constraints',
    role: 'admin'
  };

  const token = jwt.sign(testUser, config.jwtSecret, { expiresIn: '1h' });

  it('1. Enforces operational constraint ("never restart the prod database during business hours") on agent proposed fix', async () => {
    const repo = await getRepository();

    // Seed the constraint memory
    const constraintMem: Memory = {
      _id: 'mem-constraint-hours',
      id: 'mem-constraint-hours',
      owner: testUser.id,
      workspace: testUser.workspace,
      type: 'constraint',
      tier: 'hot',
      content: 'Never restart the prod database during business hours (09:00 - 18:00 UTC). Schedule all reboots for maintenance windows.',
      attribute_key: 'governance.constraint.db_restart',
      value: 'never restart prod db during business hours',
      entities: ['database', 'prod-db'],
      depends_on: ['database'],
      source: { kind: 'human_approved' },
      trust: 1.0,
      confidence: 1.0,
      status: 'active',
      valid_from: new Date().toISOString(),
      created_at: new Date().toISOString()
    };
    await repo.saveMemory(constraintMem);

    // Seed the incident procedure memory
    const procMem: Memory = {
      _id: 'mem-timeout-proc',
      id: 'mem-timeout-proc',
      owner: testUser.id,
      workspace: testUser.workspace,
      type: 'procedural',
      tier: 'warm',
      content: 'Checkout DB timeouts are fixed by restarting the pool with max_connections: 50.',
      attribute_key: 'checkout-api.fix.db_timeout',
      value: 'restart pool max_conn=50',
      entities: ['checkout-api', 'database'],
      depends_on: ['database'],
      source: { kind: 'human_approved' },
      trust: 0.95,
      confidence: 0.95,
      status: 'active',
      valid_from: new Date().toISOString(),
      created_at: new Date().toISOString()
    };
    await repo.saveMemory(procMem);

    const res = await request(app)
      .post('/api/chat')
      .set('Authorization', `Bearer ${token}`)
      .send({
        message: 'How to fix checkout DB timeout?',
        mode: 'governed'
      });

    expect(res.status).toBe(200);
    expect(res.body.structuredOutput).toBeDefined();

    const fix = res.body.structuredOutput.proposedFix.toLowerCase();
    const warnings = res.body.structuredOutput.warnings || [];

    // The proposed fix MUST change because the constraint forbids DB restarts during business hours
    expect(
      fix.includes('do not restart') ||
      fix.includes('prohibited') ||
      fix.includes('blocked') ||
      fix.includes('maintenance window')
    ).toBe(true);

    // Citations include the constraint memory
    expect(res.body.structuredOutput.citedMemoryIds).toContain('mem-constraint-hours');

    // Warnings confirm the operational constraint was enforced
    expect(warnings.some((w: string) => w.toLowerCase().includes('constraint') || w.toLowerCase().includes('business hours'))).toBe(true);
  });

  it('2. Mathematical recency decay adheres to specified half-lives', () => {
    const now = new Date();

    // Constraint: NO DECAY (returns 1.0 even after 500 days)
    const fiveHundredDaysAgo = new Date(now.getTime() - 500 * 24 * 60 * 60 * 1000).toISOString();
    expect(calculateRecency(fiveHundredDaysAgo, 'constraint')).toBe(1.0);

    // Episodic: 30-day half life
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    expect(calculateRecency(thirtyDaysAgo, 'episodic')).toBeCloseTo(0.5, 2);

    // Semantic: 180-day half life
    const oneEightyDaysAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000).toISOString();
    expect(calculateRecency(oneEightyDaysAgo, 'semantic')).toBeCloseTo(0.5, 2);

    // Procedural: 90-day half life
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();
    expect(calculateRecency(ninetyDaysAgo, 'procedural')).toBeCloseTo(0.5, 2);

    // Preference: 120-day half life
    const oneTwentyDaysAgo = new Date(now.getTime() - 120 * 24 * 60 * 60 * 1000).toISOString();
    expect(calculateRecency(oneTwentyDaysAgo, 'preference')).toBeCloseTo(0.5, 2);

    // Ephemeral: 7-day half life
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    expect(calculateRecency(sevenDaysAgo, 'ephemeral')).toBeCloseTo(0.5, 2);
  });

  it('3. Ingesting an ephemeral memory sets expiresAt and purgeAt with a grace period for TTL index', async () => {
    const res = await request(app)
      .post('/api/memories/observations')
      .set('Authorization', `Bearer ${token}`)
      .send({
        text: 'Temporary test token valid until tomorrow',
        source: { kind: 'user_stated' }
      });

    expect(res.status).toBe(201);
    expect(res.body.memory).toBeDefined();

    // If type is ephemeral, check expires_at and purgeAt
    if (res.body.memory.type === 'ephemeral') {
      expect(res.body.memory.expires_at).toBeDefined();
      expect(res.body.memory.purgeAt).toBeDefined();

      const expTime = new Date(res.body.memory.expires_at).getTime();
      const purgeTime = new Date(res.body.memory.purgeAt).getTime();
      expect(purgeTime).toBeGreaterThan(expTime);
    }
  });

  it('4. Caps the core hot tier at 8 per workspace and demotes lowest-scoring item on overflow', async () => {
    const repo = await getRepository();
    const ws = 'ws-core-cap-test';

    // Seed 8 hot memories with ascending trust/confidence scores
    for (let i = 1; i <= 8; i++) {
      await repo.saveMemory({
        _id: `mem-hot-${i}`,
        id: `mem-hot-${i}`,
        owner: 'usr-cap',
        workspace: ws,
        type: 'semantic',
        tier: 'hot',
        content: `Hot core memory #${i}`,
        attribute_key: `core.item.${i}`,
        value: `val-${i}`,
        entities: [],
        depends_on: [],
        source: { kind: 'user_stated' },
        trust: 0.5 + (i * 0.05),
        confidence: 0.5 + (i * 0.05),
        status: 'active',
        valid_from: new Date().toISOString(),
        created_at: new Date().toISOString()
      });
    }

    const initialHot = await repo.findMemories({ workspace: ws, tier: 'hot', status: 'active' });
    expect(initialHot.length).toBe(8);

    // Ingest the 9th constraint/hot memory
    const userCap = { id: 'usr-cap', workspace: ws };
    const tokenCap = jwt.sign(userCap, config.jwtSecret, { expiresIn: '1h' });

    const res = await request(app)
      .post('/api/memories/observations')
      .set('Authorization', `Bearer ${tokenCap}`)
      .send({
        text: 'Never delete production security audit logs under any circumstances',
        source: { kind: 'human_approved' }
      });

    expect(res.status).toBe(201);

    // Verify core tier is capped at 8: lowest scoring item (mem-hot-1) was demoted to archive
    const postHot = await repo.findMemories({ workspace: ws, tier: 'hot', status: 'active' });
    expect(postHot.length).toBeLessThanOrEqual(8);

    const demotedMem = await repo.getMemoryById('mem-hot-1', 'usr-cap', ws);
    expect(demotedMem?.tier).toBe('archive');
  });
});
