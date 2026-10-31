import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../src/server.js';
import { config } from '../src/config/index.js';

describe('Step C Verification: C4 Outcome Calibration & C5 Health Delay', () => {
  let authToken: string;

  beforeAll(async () => {
    authToken = jwt.sign(
      { id: 'usr-operator-c', email: 'operator@engram.system', workspace: 'ws-primary' },
      config.jwtSecret,
      { expiresIn: '1h' }
    );
  });

  it('C4 E2E: User JWT can approve proposal on /api/outcomes, calibrate confidence, and verify with GET /api/memories/:id', async () => {
    // a. Fetch initial memory state with JWT
    const initialGet = await request(app)
      .get('/api/memories/mem-001')
      .set('Authorization', `Bearer ${authToken}`);

    expect(initialGet.status).toBe(200);
    const initialConfidence = initialGet.body.confidence;
    expect(typeof initialConfidence).toBe('number');

    // b. Submit APPROVE via POST /api/outcomes using JWT (ZERO webhook secret)
    const outcomeRes = await request(app)
      .post('/api/outcomes')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        memory_id: 'mem-001',
        action: 'APPROVED',
        feedback_source: 'dashboard_ui'
      });

    expect(outcomeRes.status).toBe(200);
    expect(outcomeRes.body.success).toBe(true);
    expect(outcomeRes.body.memory_id).toBe('mem-001');
    expect(outcomeRes.body.action).toBe('APPROVED');
    expect(outcomeRes.body.previous_confidence).toBe(initialConfidence);

    // Expected Bayesian formula: (initial * 4 + 1) / (4 + 1) = (initial * 4 + 1) / 5
    const expectedConfidence = parseFloat(((initialConfidence * 4 + 1) / 5).toFixed(4));
    expect(outcomeRes.body.new_confidence).toBeCloseTo(expectedConfidence, 3);

    // c. Call GET /api/memories/:id and verify confidence changed and matches new_confidence
    const afterGet = await request(app)
      .get('/api/memories/mem-001')
      .set('Authorization', `Bearer ${authToken}`);

    expect(afterGet.status).toBe(200);
    expect(afterGet.body.confidence).toBe(outcomeRes.body.new_confidence);
    expect(afterGet.body.confidence).not.toBe(initialConfidence);

    console.log(`[C4 VERIFIED] mem-001 confidence calibrated: ${initialConfidence} -> ${afterGet.body.confidence}`);
  });

  it('C5: /api/health supports delay simulation and returns 200', async () => {
    const start = Date.now();
    const res = await request(app).get('/api/health?delay=600');
    const elapsed = Date.now() - start;

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
    expect(elapsed).toBeGreaterThanOrEqual(550);
    console.log(`[C5 VERIFIED] /api/health delayed response: ${elapsed}ms`);
  });

  it('C3: Quick action demo endpoints are protected by JWT and reject unauthenticated requests', async () => {
    const unauthAlert = await request(app).post('/api/demo/alert');
    expect(unauthAlert.status).toBe(401);

    const authAlert = await request(app)
      .post('/api/demo/alert')
      .set('Authorization', `Bearer ${authToken}`);
    expect(authAlert.status).toBe(200);
    expect(authAlert.body.success).toBe(true);
    expect(authAlert.body.memory).toBeDefined();
    expect(authAlert.body.message).toContain('alert');
    console.log('[C3 VERIFIED] POST /api/demo/alert successfully executed via JWT');
  });
});
