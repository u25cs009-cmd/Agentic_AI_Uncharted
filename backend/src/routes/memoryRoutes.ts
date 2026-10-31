import { Router, Request, Response } from 'express';
import { AnchorMemoryEngine } from '../engine/index.js';

export function createMemoryRouter(engine: AnchorMemoryEngine): Router {
  const router = Router();

  // GET /api/health
  router.get('/health', (_req: Request, res: Response) => {
    res.json({
      status: 'healthy',
      agent: 'ShaktAI',
      version: '1.0.0',
      storage: process.env.STORE === 'mongo' ? 'mongo' : 'in-memory',
      timestamp: new Date().toISOString(),
    });
  });

  // POST /api/ingest - Governed Write Path
  router.post('/ingest', async (req: Request, res: Response) => {
    try {
      const result = await engine.decisionEngine.ingestObservation(req.body);
      res.status(201).json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // GET /api/memories - List & Filter Memories
  router.get('/memories', async (req: Request, res: Response) => {
    try {
      const memories = await engine.repository.findMemories({
        owner: (req.query.owner as string) || undefined,
        workspace: (req.query.workspace as string) || undefined,
        type: (req.query.type as string) || undefined,
        tier: (req.query.tier as string) || undefined,
        status: (req.query.status as string) || undefined,
        source: (req.query.source as string) || undefined,
        search: (req.query.search as string) || undefined,
      });
      res.json(memories);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/memories/:id
  router.get('/memories/:id', async (req: Request, res: Response) => {
    try {
      const memory = await engine.repository.findMemoryById(String(req.params.id));
      if (!memory) return res.status(404).json({ error: 'Memory not found' });
      res.json(memory);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // PATCH /api/memories/:id
  router.patch('/memories/:id', async (req: Request, res: Response) => {
    try {
      const updated = await engine.repository.updateMemory(String(req.params.id), req.body);
      res.json(updated);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // DELETE /api/memories/:id - Cascade Forgetting
  router.delete('/memories/:id', async (req: Request, res: Response) => {
    try {
      const result = await engine.lifecycleEngine.cascadeForget(String(req.params.id));
      res.json({ success: true, deleted_ids: result.deletedIds });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/quarantine
  router.get('/quarantine', async (req: Request, res: Response) => {
    try {
      const quarantined = await engine.repository.getQuarantined();
      res.json(quarantined);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/quarantine/:id/release
  router.post('/quarantine/:id/release', async (req: Request, res: Response) => {
    try {
      const released = await engine.repository.releaseQuarantine(String(req.params.id));
      res.json(released);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // POST /api/quarantine/:id/reject
  router.post('/quarantine/:id/reject', async (req: Request, res: Response) => {
    try {
      const purged = await engine.repository.rejectQuarantine(String(req.params.id));
      res.json({ success: purged, id: String(req.params.id) });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // POST /api/retrieve - Hybrid Retrieval & Abstention
  router.post('/retrieve', async (req: Request, res: Response) => {
    try {
      const result = await engine.retrievalEngine.retrieve(req.body);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // POST /api/chat - 3 Operating Modes (None, Naive, Governed)
  router.post('/chat', async (req: Request, res: Response) => {
    try {
      const result = await engine.agentOrchestrator.chat(req.body);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // POST /api/events/deploy - Deployment Invalidation
  router.post('/events/deploy', async (req: Request, res: Response) => {
    try {
      const result = await engine.lifecycleEngine.processDeployment(req.body);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // POST /api/outcomes - Human Feedback / Bayesian Calibration
  router.post('/outcomes', async (req: Request, res: Response) => {
    try {
      const result = await engine.lifecycleEngine.processOutcome(req.body);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // GET /api/timetravel - Historical State Reconstruction
  router.get('/timetravel', async (req: Request, res: Response) => {
    try {
      const timestamp = (req.query.at as string) || new Date().toISOString();
      const state = await engine.repository.getTimeTravelState(timestamp);
      res.json(state);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // GET /api/events - Append-only Audit Stream
  router.get('/events', async (req: Request, res: Response) => {
    try {
      const events = await engine.repository.getEvents(req.query.memory_id as string);
      res.json(events);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/stream - Server-Sent Events (SSE) Stream
  router.get('/stream', (req: Request, res: Response) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const unsubscribe = engine.repository.onEvent((event) => {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    });

    req.on('close', () => {
      unsubscribe();
    });
  });

  return router;
}

