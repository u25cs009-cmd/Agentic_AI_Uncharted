import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../src/server.js';
import { config } from '../src/config/index.js';
import { getRepository } from '../src/repositories/index.js';

describe('STEP A & B: DEMO ENDPOINTS & HARDENING REGRESSION TESTS', () => {
  let tokenA: string;
  let tokenB: string;
  let repo: any;

  beforeAll(async () => {
    repo = await getRepository();
    await repo.init();

    tokenA = jwt.sign(
      { id: 'usr-demo-a', email: 'alice@shakti2.io', workspace: 'ws-alice' },
      config.jwtSecret,
      { expiresIn: '1h' }
    );

    tokenB = jwt.sign(
      { id: 'usr-demo-b', email: 'bob@shakti2.io', workspace: 'ws-bob' },
      config.jwtSecret,
      { expiresIn: '1h' }
    );
  });

  describe('STEP A1 & A2: Abstention Bug Fix & Stopword Filtering', () => {
    it('1. Off-topic query "what is the weather today" returns HTTP 200 with abstain: true in all three modes', async () => {
      const modes = ['none', 'naive', 'governed'] as const;
      for (const mode of modes) {
        const res = await request(app)
          .post('/api/chat')
          .set('Authorization', `Bearer ${tokenA}`)
          .send({
            message: 'what is the weather today',
            mode
          });

        expect(res.status).toBe(200);
        expect(res.body.structuredOutput).toBeDefined();
        expect(res.body.structuredOutput.abstain).toBe(true);
        expect(res.body.structuredOutput.abstainReason).toBeTruthy();
        expect(typeof res.body.structuredOutput.abstainReason).toBe('string');
      }
    });

    it('2. Stopword filtering prevents common words from artificially boosting similarity', async () => {
      const res = await request(app)
        .post('/api/chat')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          message: 'the a an for with to',
          mode: 'governed'
        });

      expect(res.status).toBe(200);
      expect(res.body.structuredOutput.abstain).toBe(true);
    });

    it('3. GET /api/meta returns engine configuration and capabilities', async () => {
      const res = await request(app).get('/api/meta');
      expect(res.status).toBe(200);
      expect(res.body.embedProvider).toBeDefined();
      expect(res.body.dimension).toBe(config.embedProvider === 'openai' ? 1536 : 384);
      expect(res.body.store).toBe(config.store);
      expect(res.body.retrievalPath).toBeDefined();
    });

    it('4. Webhook secret accepts ENGRAM_SHARED_SECRET', async () => {
      const res = await request(app)
        .post('/api/events/deploy')
        .set('x-engram-secret', config.webhookSecret)
        .send({
          service: 'checkout-api',
          changed_components: ['pg-pool']
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('STEP B: Demo Endpoints (Scripted & Secure)', () => {
    it('1. Unauthenticated requests to /api/demo/* return 401', async () => {
      const r1 = await request(app).post('/api/demo/alert').send({});
      expect(r1.status).toBe(401);

      const r2 = await request(app).post('/api/demo/deploy').send({});
      expect(r2.status).toBe(401);

      const r3 = await request(app).post('/api/demo/poison').send({});
      expect(r3.status).toBe(401);

      const r4 = await request(app).post('/api/demo/reset').send({});
      expect(r4.status).toBe(401);
    });

    it('2. POST /api/demo/reset restores seed state for caller workspace only', async () => {
      // Reset User A's workspace
      const resA = await request(app)
        .post('/api/demo/reset')
        .set('Authorization', `Bearer ${tokenA}`);

      expect(resA.status).toBe(200);
      expect(resA.body.success).toBe(true);
      expect(resA.body.memoryCount).toBeGreaterThan(0);

      // Verify User A has memories in ws-alice
      const memsA = await repo.findMemories({ workspace: 'ws-alice' });
      expect(memsA.length).toBeGreaterThan(0);

      // Verify User B's workspace is NOT touched
      const memsB = await repo.findMemories({ workspace: 'ws-bob' });
      expect(memsB.length).toBe(0);
    });

    it('3. POST /api/demo/alert ingests scripted payments-api alert', async () => {
      const res = await request(app)
        .post('/api/demo/alert')
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(['direct', 'n8n']).toContain(res.body.path);
    });

    it('4. POST /api/demo/deploy invalidates dependent memories in caller workspace', async () => {
      const res = await request(app)
        .post('/api/demo/deploy')
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(typeof res.body.affectedCount).toBe('number');
    });

    it('5. POST /api/demo/poison isolates prompt injection payload in quarantine', async () => {
      const res = await request(app)
        .post('/api/demo/poison')
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(201);
      expect(res.body.action).toBe('QUARANTINE');
      expect(res.body.memory?.status).toBe('quarantined');
    });

    it('6. Multi-tenant isolation: User B demo deploy does not mutate User A memories', async () => {
      // Reset User A and User B
      await request(app).post('/api/demo/reset').set('Authorization', `Bearer ${tokenA}`);
      await request(app).post('/api/demo/reset').set('Authorization', `Bearer ${tokenB}`);

      const userAActiveBefore = (await repo.findMemories({ workspace: 'ws-alice', status: 'active' })).length;

      // User B triggers deploy in ws-bob
      await request(app).post('/api/demo/deploy').set('Authorization', `Bearer ${tokenB}`);

      // User A active memories in ws-alice remain unchanged
      const userAActiveAfter = (await repo.findMemories({ workspace: 'ws-alice', status: 'active' })).length;
      expect(userAActiveAfter).toBe(userAActiveBefore);
    });
  });
});
