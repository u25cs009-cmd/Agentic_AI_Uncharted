import { describe, it } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import { app } from '../src/server.js';
import { n8nService } from '../src/services/n8nService.js';

describe('n8n Modular Service & Integration Safety', () => {
  it('WF1 validation rejects invalid or empty user_id', async () => {
    const res = await n8nService.dispatchWF1({
      user_id: '',
      conversation_text: 'Valid conversation text here'
    });
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.fallback_reason, 'validation_failed');
    assert.strictEqual(res.executed_by, 'local_engine');
  });

  it('WF1 validation rejects conversation_text with 5 or fewer characters', async () => {
    const res = await n8nService.dispatchWF1({
      user_id: 'usr-123',
      conversation_text: 'short'
    });
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.fallback_reason, 'validation_failed');
  });

  it('WF1 gracefully falls back to local execution when webhook URL is not configured', async () => {
    const res = await n8nService.dispatchWF1({
      user_id: 'usr-123',
      conversation_text: 'This is a valid factual statement to be memorized.'
    });
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.executed_by, 'local_engine');
    assert.strictEqual(res.fallback_reason, 'n8n_unconfigured');
  });

  it('WF2 rejects query_text with fewer than 2 characters', async () => {
    const res = await n8nService.dispatchWF2({
      user_id: 'usr-123',
      query_text: 'a'
    });
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.fallback_reason, 'validation_failed');
  });

  it('WF3 rejects instruction_text with fewer than 3 characters', async () => {
    const res = await n8nService.dispatchWF3({
      user_id: 'usr-123',
      instruction_text: 'no'
    });
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.fallback_reason, 'validation_failed');
  });

  it('Duplicate execution protection rejects identical rapid requests within 3 seconds', async () => {
    // Override webhook url temporarily for test
    const payload = {
      user_id: 'usr-dedup-test',
      conversation_text: 'Identical statement for deduplication testing.'
    };
    // Call twice in immediate succession
    const res1 = await n8nService.dispatchWF1(payload);
    const res2 = await n8nService.dispatchWF1(payload);
    // res1 returns n8n_unconfigured
    assert.strictEqual(res1.fallback_reason, 'n8n_unconfigured');
    // res2 is caught by duplicate protection
    assert.strictEqual(res2.fallback_reason, 'validation_failed');
    assert.ok(res2.error?.includes('Duplicate execution rejected'));
  });
});

describe('Express API Endpoints with n8n Integration & Loop Prevention', () => {
  it('Bug 2 Fix: Malformed JSON syntax returns HTTP 400 Bad Request instead of 500', async () => {
    const res = await request(app)
      .post('/api/ingest')
      .set('Content-Type', 'application/json')
      .send('{ invalid_json_syntax: true, ');
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.error, 'Bad Request');
    assert.strictEqual(res.body.message, 'Invalid or malformed JSON payload');
  });

  it('POST /api/ingest executes via local engine when n8n WF1 is not configured', async () => {
    const res = await request(app)
      .post('/api/ingest')
      .send({
        text: 'The primary gateway timeout is 5000ms.',
        source: { kind: 'user_stated', actor: 'qa_tester' }
      });
    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.executed_by, 'local_engine');
  });

  it('POST /api/retrieve executes via local engine and returns results when WF2 is unconfigured', async () => {
    const res = await request(app)
      .post('/api/retrieve')
      .send({ query: 'gateway timeout' });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.executed_by, 'local_engine');
    assert.ok(Array.isArray(res.body.retrieved));
  });

  it('User ownership check rejects unauthorized memory update', async () => {
    const res = await request(app)
      .patch('/api/memories/mem-unauthorized-id-999')
      .send({ content: 'Attempted unauthorized patch' });
    // Should be 404 or 401, never 500
    assert.ok(res.status === 404 || res.status === 401);
    assert.notStrictEqual(res.status, 500);
  });
});
