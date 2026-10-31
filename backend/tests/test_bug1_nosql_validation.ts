import { describe, it } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import { app } from '../src/server.js';

describe('Bug 1 — NoSQL Injection & Input Validation on Login', () => {
  it('Valid email and password returns normal login behavior', async () => {
    // We test with synthetic QA user or check response structure
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'qa_automation_20261031@anchor.test', password: 'QaTestStrongPassword2026!' });
    // Should be 200 (if QA account exists) or 401 (if credentials invalid) - NEVER 500
    assert.ok(res.status === 200 || res.status === 401);
    assert.notStrictEqual(res.status, 500);
  });

  it('Missing email returns HTTP 400', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ password: 'SomePassword123!' });
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.error, 'A valid email string is required');
  });

  it('Missing password returns HTTP 400', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@anchor.test' });
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.error, 'A valid password string is required');
  });

  it('Email is null returns HTTP 400', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: null, password: 'Password123!' });
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.error, 'A valid email string is required');
  });

  it('Email is a number returns HTTP 400', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 12345, password: 'Password123!' });
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.error, 'A valid email string is required');
  });

  it('Email is an array returns HTTP 400', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: ['admin@anchor.io', 'test@anchor.io'], password: 'Password123!' });
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.error, 'A valid email string is required');
  });

  it('Email is an object returns HTTP 400', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: { some: 'object' }, password: 'Password123!' });
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.error, 'A valid email string is required');
  });

  it('Email contains $gt object (NoSQL injection probe) returns HTTP 400', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: { $gt: '' }, password: { $gt: '' } });
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.error, 'A valid email string is required');
  });

  it('Password is an object returns HTTP 400', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'valid.user@anchor.test', password: { $ne: null } });
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.error, 'A valid password string is required');
  });

  it('Email without @ symbol returns HTTP 400', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'notanemail', password: 'Password123!' });
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.error, 'A valid email address is required');
  });

  it('Invalid credentials returns safe HTTP 401', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nonexistent.user.test@anchor.test', password: 'WrongPassword123!' });
    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.error, 'Invalid email or password');
  });
});
