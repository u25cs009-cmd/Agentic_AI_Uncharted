import { describe, it, expect } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../src/server.js';
import { config } from '../src/config/index.js';

describe('STEP 6: agent_runs Persistence and Retrieval API', () => {
  const userA = {
    id: 'usr-agent-run-a',
    email: 'userA@example.com',
    workspace: 'ws-run-alpha',
    role: 'admin'
  };

  const userB = {
    id: 'usr-agent-run-b',
    email: 'userB@example.com',
    workspace: 'ws-run-beta',
    role: 'admin'
  };

  const tokenA = jwt.sign(userA, config.jwtSecret, { expiresIn: '1h' });
  const tokenB = jwt.sign(userB, config.jwtSecret, { expiresIn: '1h' });

  it('1. Persists agent run on chat execution with candidate breakdown and structured output', async () => {
    const chatRes = await request(app)
      .post('/api/chat')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        message: 'How to fix checkout DB timeout?',
        mode: 'governed'
      });

    expect(chatRes.status).toBe(200);

    // Fetch runs for workspace A
    const listRes = await request(app)
      .get('/api/agent/runs')
      .set('Authorization', `Bearer ${tokenA}`);

    expect(listRes.status).toBe(200);
    expect(Array.isArray(listRes.body)).toBe(true);
    expect(listRes.body.length).toBeGreaterThanOrEqual(1);

    const latestRun = listRes.body[0];
    expect(latestRun.workspaceId).toBe('ws-run-alpha');
    expect(latestRun.input).toBe('How to fix checkout DB timeout?');
    expect(latestRun.mode).toBe('governed');
    expect(latestRun.retrievalPath).toBeDefined();
    expect(latestRun.candidates).toBeDefined();
    expect(latestRun.candidates.retrieved).toBeDefined();
    expect(latestRun.candidates.excluded).toBeDefined();
    expect(latestRun.structuredOutput).toBeDefined();
    expect(latestRun.structuredOutput.diagnosis).toBeDefined();
    expect(latestRun.latencyMs).toBeGreaterThan(0);
    expect(latestRun.tokensUsed).toBeGreaterThan(0);

    // Fetch individual run by ID
    const runId = latestRun._id || latestRun.id;
    const singleRes = await request(app)
      .get(`/api/agent/runs/${runId}`)
      .set('Authorization', `Bearer ${tokenA}`);

    expect(singleRes.status).toBe(200);
    expect(singleRes.body.input).toBe(latestRun.input);
  });

  it('2. Enforces workspace isolation: User B in ws-run-beta cannot view runs from ws-run-alpha', async () => {
    // User B fetches runs
    const listResB = await request(app)
      .get('/api/agent/runs')
      .set('Authorization', `Bearer ${tokenB}`);

    expect(listResB.status).toBe(200);
    const hasAlphaRuns = listResB.body.some((r: any) => r.workspaceId === 'ws-run-alpha');
    expect(hasAlphaRuns).toBe(false);
  });
});
