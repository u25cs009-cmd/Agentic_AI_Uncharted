import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../src/server.js';

describe('ANCHOR Express REST API Integration Tests', () => {
  it('GET /api/health should respond with healthy status', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
    expect(res.body.store_mode).toBeDefined();
  });

  it('GET /api/memories should return list of memories with filters', async () => {
    const res = await request(app).get('/api/memories?status=active');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body.every((m: any) => m.status === 'active')).toBe(true);
  });

  it('GET /api/quarantine should return quarantined memories', async () => {
    const res = await request(app).get('/api/quarantine');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.every((m: any) => m.status === 'quarantined')).toBe(true);
  });

  it('POST /api/events/deploy should transition dependent memories to stale', async () => {
    const res = await request(app)
      .post('/api/events/deploy')
      .set('x-internal-key', 'shakti2_internal_key_for_n8n_webhooks')
      .send({
        service: 'checkout-api',
        version: '3.0.0',
        changed_components: ['pg-pool'],
        environment: 'production'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.affected_memories_count).toBeGreaterThanOrEqual(1);
    expect(res.body.stale_memory_ids).toContain('mem-001');
  });

  it('POST /api/outcomes should apply Bayesian confidence updates', async () => {
    const res = await request(app)
      .post('/api/outcomes')
      .set('x-internal-key', 'shakti2_internal_key_for_n8n_webhooks')
      .send({
        memory_id: 'mem-002',
        action: 'APPROVED',
        feedback_source: 'Telegram Approval Bot',
        user_id: 'ayush-lead'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.memory_id).toBe('mem-002');
    expect(res.body.formula_applied).toBe('(prior * 4 + successes) / (4 + successes + 2 * failures)');
    expect(res.body.new_confidence).toBeGreaterThan(0);
  });

  it('GET /api/timetravel should reconstruct memories up to historical timestamp', async () => {
    const res = await request(app).get('/api/timetravel?timestamp=2026-10-26T00:00:00Z');
    expect(res.status).toBe(200);
    expect(res.body.target_timestamp).toBe('2026-10-26T00:00:00Z');
    expect(Array.isArray(res.body.memories)).toBe(true);
  });
});

