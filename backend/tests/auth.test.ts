import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import { apiRouter } from '../src/routes/index.js';
import { getRepository } from '../src/repositories/index.js';

const app = express();
app.use(express.json());
app.use('/api', apiRouter);

describe('ANCHOR Authentication and User Isolation Tests', () => {
  beforeAll(async () => {
    process.env.STORE = 'memory';
    const repo = await getRepository();
    await repo.init();
  });

  const testEmail = `operator_${Date.now()}@anchor.test`;
  const testPassword = 'Password123!';
  let authToken = '';
  let userId = '';
  let conversationId = '';

  it('POST /api/auth/register should create a new user and return token', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        email: testEmail,
        password: testPassword,
        name: 'Chief Operator'
      });

    expect(res.status).toBe(201);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe(testEmail);
    expect(res.body.user.name).toBe('Chief Operator');
    expect(res.body.user.passwordHash).toBeUndefined();

    authToken = res.body.token;
    userId = res.body.user.id;
  });

  it('POST /api/auth/register should reject duplicate registration', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        email: testEmail,
        password: testPassword,
        name: 'Duplicate'
      });

    expect(res.status).toBe(409);
  });

  it('POST /api/auth/login should authenticate valid user credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: testEmail,
        password: testPassword
      });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe(testEmail);
  });

  it('POST /api/auth/login should reject incorrect password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: testEmail,
        password: 'wrong_password'
      });

    expect(res.status).toBe(401);
  });

  it('GET /api/auth/me should return authenticated user profile', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.user.id).toBe(userId);
    expect(res.body.user.email).toBe(testEmail);
    expect(res.body.user.name).toBe('Chief Operator');
  });

  it('PATCH /api/auth/profile should update display name', async () => {
    const res = await request(app)
      .patch('/api/auth/profile')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'Lead AI Engineer',
        profilePicture: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb'
      });

    expect(res.status).toBe(200);
    expect(res.body.user.name).toBe('Lead AI Engineer');
    expect(res.body.user.profilePicture).toBe('https://images.unsplash.com/photo-1534528741775-53994a69daeb');
  });

  it('POST /api/auth/change-password should update user password', async () => {
    const res = await request(app)
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        currentPassword: testPassword,
        newPassword: 'NewSecurePassword456!'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Verify login with new password
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: testEmail,
        password: 'NewSecurePassword456!'
      });

    expect(loginRes.status).toBe(200);
  });

  it('POST /api/conversations should create user chat conversation', async () => {
    const res = await request(app)
      .post('/api/conversations')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        title: 'Production Triage Session',
        initialMessage: {
          sender: 'user',
          text: 'What is the current database connection pool size?'
        }
      });

    expect(res.status).toBe(201);
    expect(res.body.conversation.title).toBe('Production Triage Session');
    expect(res.body.conversation.userId).toBe(userId);
    expect(res.body.conversation.messages.length).toBe(1);

    conversationId = res.body.conversation.id;
  });

  it('GET /api/conversations should list conversations for user', async () => {
    const res = await request(app)
      .get('/api/conversations')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.conversations)).toBe(true);
    const found = res.body.conversations.find((c: any) => c.id === conversationId);
    expect(found).toBeDefined();
    expect(found.title).toBe('Production Triage Session');
  });

  it('POST /api/conversations/:id/messages should append message', async () => {
    const res = await request(app)
      .post(`/api/conversations/${conversationId}/messages`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        sender: 'agent',
        text: 'The verified database connection pool size is 50 connections.',
        mode: 'governed'
      });

    expect(res.status).toBe(200);
    expect(res.body.conversation.messages.length).toBe(2);
  });

  it('DELETE /api/conversations/:id should delete conversation', async () => {
    const res = await request(app)
      .delete(`/api/conversations/${conversationId}`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
