import { Router } from 'express';
import { n8nService } from '../services/n8nService.js';
import {
  register,
  login,
  googleLogin,
  getMe,
  logout,
  updateProfile,
  changePassword,
  forgotPassword,
  resetPassword,
  exportData,
  deleteAccount
} from '../controllers/authController.js';
import {
  listConversations,
  getConversation,
  createConversation,
  appendMessage,
  deleteConversation
} from '../controllers/conversationController.js';
import {
  getMemories,
  getMemoryById,
  updateMemory,
  deleteMemory,
  getEvents,
  getMemoryEvents
} from '../controllers/memoryController.js';
import {
  getQuarantinedMemories,
  releaseQuarantine,
  rejectQuarantine
} from '../controllers/quarantineController.js';
import { handleDeployEvent, handleOutcomeFeedback } from '../controllers/eventController.js';
import { timeTravel } from '../controllers/timeTravelController.js';
import { sseStream } from '../controllers/streamController.js';
import {
  chat,
  ingestObservation,
  retrieveMemories,
  manageMemories,
  agentTriage,
  getAgentRuns,
  getAgentRunById
} from '../controllers/aiEngineController.js';
import {
  runBenchmark,
  getBenchmarkResults
} from '../controllers/benchmarkController.js';
import { consolidateMemories } from '../controllers/lifecycleController.js';
import {
  demoAlert,
  demoDeploy,
  demoPoison,
  demoReset
} from '../controllers/demoController.js';
import {
  authenticateUser,
  requireAuth,
  requireWebhookSecret,
  requireInternalKey,
  authenticateUserOrWebhook
} from '../middleware/auth.js';
import { getRepository } from '../repositories/index.js';
import { config } from '../config/index.js';

export const apiRouter = Router();

// 1. System Metadata & Health Checks
apiRouter.get('/meta', (req, res) => {
  res.json({
    embedProvider: config.embedProvider,
    dimension: config.embedProvider === 'openai' ? 1536 : 384,
    store: config.store,
    retrievalPath: config.store === 'mongo' ? 'atlas-hybrid' : 'memory',
    version: '2.1.0'
  });
});

apiRouter.get('/health', async (req, res) => {
  try {
    const delay = parseInt(req.query.delay as string, 10);
    if (!isNaN(delay) && delay > 0) {
      await new Promise(resolve => setTimeout(resolve, Math.min(delay, 5000)));
    }

    const repo = await getRepository();
    const isFallback = config.store === 'mongo' && repo.name !== 'MongoRepository';
    
    if (config.nodeEnv === 'production' && isFallback) {
      return res.status(503).json({
        status: 'unhealthy',
        error: 'MongoDB Atlas is unavailable in production',
        configured_store: config.store,
        active_repository: repo.name,
        timestamp: new Date().toISOString()
      });
    }

    const maskUrl = (url?: string) => {
      if (!url) return 'unconfigured';
      try {
        const u = new URL(url);
        return `${u.protocol}//${u.host.replace(/^([^.]+)\./, '***.')}${u.pathname}`;
      } catch {
        return 'configured_invalid_url';
      }
    };

    res.json({
      status: 'healthy',
      system: 'ANCHOR AI Memory Engine Backend',
      store_mode: repo.name === 'MongoRepository' ? 'mongo' : 'memory',
      configured_store: config.store,
      active_repository: repo.name,
      is_fallback: isFallback,
      embed_provider: config.embedProvider,
      n8n_integration: {
        wf1: { configured: Boolean(config.n8n.wf1WebhookUrl), endpoint: maskUrl(config.n8n.wf1WebhookUrl) },
        wf2: { configured: Boolean(config.n8n.wf2WebhookUrl), endpoint: maskUrl(config.n8n.wf2WebhookUrl) },
        wf3: { configured: Boolean(config.n8n.wf3WebhookUrl), endpoint: maskUrl(config.n8n.wf3WebhookUrl) },
        last_dispatch: n8nService.lastDispatch
      },
      timestamp: new Date().toISOString(),
      uptime_seconds: Math.floor(process.uptime())
    });
  } catch (err: any) {
    res.status(503).json({ status: 'error', error: err.message });
  }
});

// 2. Authentication & User Profile
apiRouter.post('/auth/register', register);
apiRouter.post('/auth/login', login);
apiRouter.post('/auth/google', googleLogin);
apiRouter.post('/auth/logout', logout);
apiRouter.get('/auth/me', requireAuth, getMe);
apiRouter.patch('/auth/profile', requireAuth, updateProfile);
apiRouter.post('/auth/change-password', requireAuth, changePassword);
apiRouter.post('/auth/forgot-password', forgotPassword);
apiRouter.post('/auth/reset-password', resetPassword);
apiRouter.get('/export', requireAuth, exportData);
apiRouter.delete('/account', requireAuth, deleteAccount);

// 3. User Conversations & Chat Sessions (User Scoped)
apiRouter.get('/conversations', requireAuth, listConversations);
apiRouter.post('/conversations', requireAuth, createConversation);
apiRouter.get('/conversations/:id', requireAuth, getConversation);
apiRouter.post('/conversations/:id/messages', requireAuth, appendMessage);
apiRouter.delete('/conversations/:id', requireAuth, deleteConversation);

// 4. Real-Time Server-Sent Events (SSE) (Requires valid JWT or Webhook Secret)
apiRouter.get('/stream', authenticateUserOrWebhook, sseStream);

// 5. Memory CRUD & Audit Trail (User/Workspace Scoped)
apiRouter.get('/memories', authenticateUserOrWebhook, getMemories);
apiRouter.get('/memories/events', requireAuth, getEvents);
apiRouter.post('/memories/manage', authenticateUserOrWebhook, manageMemories);
apiRouter.get('/memories/:id', requireAuth, getMemoryById);
apiRouter.patch('/memories/:id', requireAuth, updateMemory);
apiRouter.delete('/memories/:id', requireAuth, deleteMemory);
apiRouter.get('/memories/:id/events', requireAuth, getMemoryEvents);

// 6. Quarantine Management (User/Workspace Scoped)
apiRouter.get('/quarantine', requireAuth, getQuarantinedMemories);
apiRouter.post('/quarantine/:id/release', requireAuth, releaseQuarantine);
apiRouter.post('/quarantine/:id/reject', requireAuth, rejectQuarantine);

// 7. External Event Triggers & Webhooks (Protected by x-engram-secret / x-internal-key or JWT)
apiRouter.post('/events/deploy', requireWebhookSecret, handleDeployEvent);
apiRouter.post('/hooks/deploy', requireWebhookSecret, handleDeployEvent);
apiRouter.post('/outcomes', authenticateUserOrWebhook, handleOutcomeFeedback);
apiRouter.post('/hooks/outcome', requireWebhookSecret, handleOutcomeFeedback);
apiRouter.post('/agent/triage', requireWebhookSecret, agentTriage);
apiRouter.post('/hooks/alert', requireWebhookSecret, agentTriage);

// 8. Temporal Time Travel (User/Workspace Scoped)
apiRouter.get('/timetravel', requireAuth, timeTravel);

// 9. AI Engine Interaction Routes (User JWT or External Automation Secret)
apiRouter.post('/chat', authenticateUserOrWebhook, chat);
apiRouter.get('/agent/runs', requireAuth, getAgentRuns);
apiRouter.get('/agent/runs/:id', requireAuth, getAgentRunById);
apiRouter.post('/ingest', authenticateUserOrWebhook, ingestObservation);
apiRouter.post('/memories/observations', authenticateUserOrWebhook, ingestObservation);
apiRouter.post('/retrieve', authenticateUserOrWebhook, retrieveMemories);

// 10. 15-Scenario Empirical Benchmark Matrix
apiRouter.post('/benchmark/run', requireAuth, runBenchmark);
apiRouter.get('/benchmark/results', requireAuth, getBenchmarkResults);

// 11. Automated Memory Lifecycle & Consolidation (W4)
apiRouter.post('/lifecycle/consolidate', authenticateUserOrWebhook, consolidateMemories);

// 12. Scripted Demo Endpoints (Protected by User JWT)
apiRouter.post('/demo/alert', requireAuth, demoAlert);
apiRouter.post('/demo/deploy', requireAuth, demoDeploy);
apiRouter.post('/demo/poison', requireAuth, demoPoison);
apiRouter.post('/demo/reset', requireAuth, demoReset);
