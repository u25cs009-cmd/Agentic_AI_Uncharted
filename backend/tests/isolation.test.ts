import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import { apiRouter } from '../src/routes/index.js';
import { getRepository } from '../src/repositories/index.js';
import { config } from '../src/config/index.js';

const app = express();
app.use(express.json());
app.use('/api', apiRouter);

describe('Step 1: Security & Multi-Tenant User Isolation Tests', () => {
  let userAToken: string;
  let userBToken: string;
  let userAId = 'usr-alice-101';
  let userBId = 'usr-bob-202';
  let workspace = 'ws-test-isolation';

  let privateMemoryId = '';

  beforeAll(async () => {
    process.env.STORE = 'memory';
    const repo = await getRepository();
    await repo.init();

    // Create valid signed tokens for User A and User B
    userAToken = jwt.sign(
      { id: userAId, email: 'alice@shakti2.io', workspace },
      config.jwtSecret,
      { expiresIn: '1h' }
    );

    userBToken = jwt.sign(
      { id: userBId, email: 'bob@shakti2.io', workspace },
      config.jwtSecret,
      { expiresIn: '1h' }
    );
  });

  // 1. Unauthenticated rejection
  it('should reject unauthenticated memory requests with 401', async () => {
    const res = await request(app).get('/api/memories');
    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/Authentication required/i);
  });

  it('should reject invalid JWT token with 401', async () => {
    const res = await request(app)
      .get('/api/memories')
      .set('Authorization', 'Bearer invalid_tampered_jwt_token');
    expect(res.status).toBe(401);
  });

  // 2. User A creates a private memory
  it('User A creates a private memory and associated event', async () => {
    const repo = await getRepository();
    privateMemoryId = `mem-private-${Date.now()}`;

    await repo.saveMemory({
      _id: privateMemoryId,
      id: privateMemoryId,
      owner: userAId,
      ownerId: userAId,
      workspace,
      workspaceId: workspace,
      visibility: 'private',
      type: 'semantic',
      tier: 'warm',
      content: 'CONFIDENTIAL: User A private architectural credentials and secret token',
      attribute_key: 'user.a.private.secret',
      value: 'secret_val_xyz',
      entities: ['secret', 'auth'],
      depends_on: [],
      source: { kind: 'user_stated', actor: 'Alice' },
      trust: 0.9,
      confidence: 0.95,
      status: 'active',
      valid_from: new Date().toISOString(),
      valid_to: null,
      superseded_by: null,
      env_fingerprint: {},
      derived_from: [],
      access_count: 0,
      last_used_at: null,
      expires_at: null
    });

    await repo.appendEvent({
      id: `evt-private-${Date.now()}`,
      memory_id: privateMemoryId,
      workspaceId: workspace,
      ownerId: userAId,
      visibility: 'private',
      event_type: 'created',
      reason: 'Created private secret for User A',
      actor: 'Alice',
      timestamp: new Date().toISOString()
    });

    // Verify User A can read it
    const resA = await request(app)
      .get(`/api/memories/${privateMemoryId}`)
      .set('Authorization', `Bearer ${userAToken}`);
    expect(resA.status).toBe(200);
    expect(resA.body._id).toBe(privateMemoryId);
  });

  // 3. User B cannot read User A's private memory
  it("User B CANNOT read User A's private memory by ID (404/forbidden)", async () => {
    const resB = await request(app)
      .get(`/api/memories/${privateMemoryId}`)
      .set('Authorization', `Bearer ${userBToken}`);
    expect(resB.status).toBe(404);
  });

  // 4. User B cannot search User A's private memory
  it("User B CANNOT find User A's private memory in search/retrieval", async () => {
    const resSearch = await request(app)
      .post('/api/retrieve')
      .set('Authorization', `Bearer ${userBToken}`)
      .send({ query: 'CONFIDENTIAL secret token' });

    expect(resSearch.status).toBe(200);
    const found = resSearch.body.retrieved.some((m: any) => m._id === privateMemoryId);
    expect(found).toBe(false);
  });

  // 5. User B cannot delete User A's private memory
  it("User B CANNOT delete User A's private memory", async () => {
    const resDelete = await request(app)
      .delete(`/api/memories/${privateMemoryId}`)
      .set('Authorization', `Bearer ${userBToken}`);
    expect(resDelete.status).toBe(404);

    // Verify memory still exists for User A
    const resCheck = await request(app)
      .get(`/api/memories/${privateMemoryId}`)
      .set('Authorization', `Bearer ${userAToken}`);
    expect(resCheck.status).toBe(200);
  });

  // 6. User B cannot read User A's private events
  it("User B CANNOT read User A's private audit events", async () => {
    const resEventsB = await request(app)
      .get('/api/memories/events')
      .set('Authorization', `Bearer ${userBToken}`);

    expect(resEventsB.status).toBe(200);
    const leakedEvent = resEventsB.body.some((e: any) => e.memory_id === privateMemoryId);
    expect(leakedEvent).toBe(false);
  });

  // 7. Webhook secret authentication (timing-safe header check)
  it('Webhook endpoints require timing-safe x-engram-secret header', async () => {
    // Missing secret -> 403
    const resMissing = await request(app)
      .post('/api/events/deploy')
      .send({
        service: 'checkout-api',
        version: '4.0.0',
        changed_components: ['auth']
      });
    expect(resMissing.status).toBe(403);

    // Invalid secret -> 403
    const resInvalid = await request(app)
      .post('/api/events/deploy')
      .set('x-engram-secret', 'wrong_fake_secret_key')
      .send({
        service: 'checkout-api',
        version: '4.0.0',
        changed_components: ['auth']
      });
    expect(resInvalid.status).toBe(403);

    // Valid secret -> 200
    const resValid = await request(app)
      .post('/api/events/deploy')
      .set('x-engram-secret', config.webhookSecret)
      .send({
        service: 'checkout-api',
        version: '4.0.0',
        changed_components: ['auth']
      });
    expect(resValid.status).toBe(200);
    expect(resValid.body.success).toBe(true);
  });
});
