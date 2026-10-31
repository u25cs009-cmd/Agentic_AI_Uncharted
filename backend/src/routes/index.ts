import { Router } from 'express';
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
  agentTriage,
  manageMemories
} from '../controllers/aiEngineController.js';
import {
  runBenchmark,
  getBenchmarkResults
} from '../controllers/benchmarkController.js';
import { consolidateMemories } from '../controllers/lifecycleController.js';
import { authenticateUser, requireAuth, requireInternalKey } from '../middleware/auth.js';
import { getRepository } from '../repositories/index.js';
import { config } from '../config/index.js';

export const apiRouter = Router();

// 1. Health check
apiRouter.get('/health', async (req, res) => {
  try {
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

    res.json({
      status: 'healthy',
      system: 'ANCHOR AI Memory Engine Backend',
      store_mode: repo.name === 'MongoRepository' ? 'mongo' : 'memory',
      configured_store: config.store,
      active_repository: repo.name,
      is_fallback: isFallback,
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
apiRouter.get('/export', authenticateUser, exportData);
apiRouter.delete('/account', requireAuth, deleteAccount);

// 3. User Conversations & Chat Sessions
apiRouter.get('/conversations', authenticateUser, listConversations);
apiRouter.post('/conversations', authenticateUser, createConversation);
apiRouter.get('/conversations/:id', authenticateUser, getConversation);
apiRouter.post('/conversations/:id/messages', authenticateUser, appendMessage);
apiRouter.delete('/conversations/:id', authenticateUser, deleteConversation);

// 4. Real-Time Server-Sent Events (SSE)
apiRouter.get('/stream', sseStream);

// 5. Memory CRUD & Audit Trail
apiRouter.get('/memories', authenticateUser, getMemories);
apiRouter.get('/memories/events', authenticateUser, getEvents);
apiRouter.post('/memories/manage', authenticateUser, manageMemories);
apiRouter.get('/memories/:id', authenticateUser, getMemoryById);
apiRouter.patch('/memories/:id', authenticateUser, updateMemory);
apiRouter.delete('/memories/:id', authenticateUser, deleteMemory);
apiRouter.get('/memories/:id/events', authenticateUser, getMemoryEvents);

// 6. Quarantine Management
apiRouter.get('/quarantine', authenticateUser, getQuarantinedMemories);
apiRouter.post('/quarantine/:id/release', authenticateUser, releaseQuarantine);
apiRouter.post('/quarantine/:id/reject', authenticateUser, rejectQuarantine);

// 7. External Event Triggers (n8n & Deploy hooks)
apiRouter.post('/events/deploy', requireInternalKey, handleDeployEvent);
apiRouter.post('/outcomes', requireInternalKey, handleOutcomeFeedback);

// 8. Temporal Time Travel
apiRouter.get('/timetravel', authenticateUser, timeTravel);

// 9. AI Engine Interaction Routes
apiRouter.post('/chat', authenticateUser, chat);
apiRouter.post('/ingest', authenticateUser, ingestObservation);
apiRouter.post('/retrieve', authenticateUser, retrieveMemories);
apiRouter.post('/agent/triage', requireInternalKey, agentTriage);

// 10. 15-Scenario Empirical Benchmark Matrix
apiRouter.post('/benchmark/run', authenticateUser, runBenchmark);
apiRouter.get('/benchmark/results', authenticateUser, getBenchmarkResults);

// 11. Automated Memory Lifecycle & Consolidation (W4)
apiRouter.post('/lifecycle/consolidate', authenticateUser, consolidateMemories);
