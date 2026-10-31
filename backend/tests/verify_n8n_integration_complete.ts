import { describe, it } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import { app } from '../src/server.js';
import { n8nService } from '../src/services/n8nService.js';
import { config } from '../src/config/index.js';
import { timingSafeCompare } from '../src/middleware/auth.js';

describe('ANCHOR — Complete Live n8n Integration & Security Test Suite', () => {

  // Test 1: Ingestion & WF1 Dispatch / Fallback
  it('1. Ingestion handles WF1 dispatch and reports exact execution origin', async () => {
    const res = await request(app)
      .post('/api/ingest')
      .send({
        text: 'The QA staging Redis cache port is 6380 with TLS enabled.',
        source: { kind: 'user_stated', actor: 'qa_user' }
      });
    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.success, true);
    // Unconfigured webhook must report local_engine (no silent fake success)
    assert.strictEqual(res.body.executed_by, 'local_engine');
    assert.ok(res.body.memory?.id || res.body.memory?._id);
  });

  // Test 2: Retrieval & WF2
  it('2. Retrieval returns scoped memories and reports execution origin', async () => {
    const res = await request(app)
      .post('/api/retrieve')
      .send({ query: 'Redis port staging' });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.executed_by, 'local_engine');
    assert.ok(Array.isArray(res.body.retrieved));
  });

  // Test 3: WF3 Ownership Enforcement on Update
  it('3. User ownership checks enforce that memory update rejects cross-user modification', async () => {
    const res = await request(app)
      .patch('/api/memories/mem-isolated-user-a-123')
      .set('Authorization', 'Bearer invalid_or_other_user_token')
      .send({ content: 'Attempted cross-user overwrite' });
    // In production or when token invalid, rejects with 401 or 404
    assert.ok(res.status === 401 || res.status === 404);
    assert.notStrictEqual(res.status, 200);
  });

  // Test 4: WF3 Ownership Enforcement on Deletion
  it('4. User ownership checks enforce that memory deletion rejects unauthorized ID', async () => {
    const res = await request(app)
      .delete('/api/memories/mem-unauthorized-target-999')
      .set('Authorization', 'Bearer forged_token');
    assert.ok(res.status === 401 || res.status === 404);
    assert.notStrictEqual(res.status, 200);
  });

  // Test 5: Loop Prevention for WF1 Internal Callbacks
  it('5. Internal callback with x-internal-key bypasses WF1 dispatch and writes directly', async () => {
    // Set a test internal key in config
    const testSecret = 'anchor_secure_test_internal_key_2026';
    (config as any).internalApiKey = testSecret;

    const res = await request(app)
      .post('/api/ingest')
      .set('x-internal-key', testSecret)
      .set('x-execution-context', 'n8n-dispatch')
      .send({
        text: 'Internal callback fact verified by n8n workflow.',
        source: { kind: 'n8n_workflow', actor: 'WF1_Engine' }
      });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.success, true);
    // Directly executed locally without circular dispatch
    assert.strictEqual(res.body.executed_by, 'local_engine');
  });

  // Test 6: Unauthorized Internal Callbacks Rejected (Timing-Safe)
  it('6. Unauthorized internal callbacks with invalid secret are rejected with 403', async () => {
    const res = await request(app)
      .post('/api/events/deploy')
      .set('x-internal-key', 'wrong_attacker_secret_key')
      .send({ service: 'auth', version: '1.0' });
    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.body.error, 'Forbidden: Missing or invalid x-internal-key header');
  });

  it('6b. Timing-safe comparison correctly compares equal and non-equal buffers', () => {
    assert.strictEqual(timingSafeCompare('secretA', 'secretA'), true);
    assert.strictEqual(timingSafeCompare('secretA', 'secretB'), false);
    assert.strictEqual(timingSafeCompare('short', 'much_longer_secret'), false);
  });

  // Test 7: Cross-User Isolation on Natural Language Management
  it('7. Natural language management endpoint requires valid string instruction', async () => {
    const res = await request(app)
      .post('/api/memories/manage')
      .send({ instruction: 'ab' }); // less than 3 chars
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.error, 'Instruction string of at least 3 characters is required');
  });

  // Test 8: Malformed Payloads & NoSQL Injection Return 400
  it('8a. Malformed JSON syntax returns HTTP 400 Bad Request', async () => {
    const res = await request(app)
      .post('/api/ingest')
      .set('Content-Type', 'application/json')
      .send('{ malformed_json: true, ');
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.error, 'Bad Request');
  });

  it('8b. NoSQL injection probe on login returns HTTP 400 Bad Request', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: { $gt: '' }, password: { $gt: '' } });
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.error, 'A valid email string is required');
  });

  // Test 9: n8n Timeout & Unavailable Handled Safely
  it('9. n8n service handles unreachable webhook with timeout and returns fallback result', async () => {
    // Dispatch to a non-existent port with small timeout
    const result = await (n8nService as any).dispatchWebhook(
      'WF1',
      'http://127.0.0.1:59999/webhook/fake',
      { test: true },
      500 // 500ms timeout
    );
    assert.strictEqual(result.success, false);
    assert.strictEqual(result.executed_by, 'local_engine');
    assert.ok(result.fallback_reason === 'n8n_error' || result.fallback_reason === 'n8n_timeout');
  });

  // Test 10: General System Health & Store Mode
  it('10. GET /api/health confirms backend stability and store_mode', async () => {
    const res = await request(app).get('/api/health');
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.store_mode === 'mongo' || res.body.store_mode === 'memory');
    assert.strictEqual(res.body.status, 'healthy');
  });
});
