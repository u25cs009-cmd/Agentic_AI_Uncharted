import { Router } from 'express';
import { register, login, exportData, deleteAccount } from '../controllers/authController.js';
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
import { chat, ingestObservation, retrieveMemories, agentTriage } from '../controllers/aiPlaceholderController.js';
import { authenticateUser, requireInternalKey } from '../middleware/auth.js';
import { config } from '../config/index.js';

export const apiRouter = Router();

// 1. Health check
apiRouter.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    system: 'ANCHOR AI Memory Engine Backend',
    store_mode: config.store,
    timestamp: new Date().toISOString(),
    uptime_seconds: Math.floor(process.uptime())
  });
});

// 2. Authentication & User Profile
apiRouter.post('/auth/register', register);
apiRouter.post('/auth/login', login);
apiRouter.get('/export', authenticateUser, exportData);
apiRouter.delete('/account', authenticateUser, deleteAccount);

// 3. Real-Time Server-Sent Events (SSE)
apiRouter.get('/stream', sseStream);

// 4. Memory CRUD & Audit Trail
apiRouter.get('/memories', authenticateUser, getMemories);
apiRouter.get('/memories/events', authenticateUser, getEvents);
apiRouter.get('/memories/:id', authenticateUser, getMemoryById);
apiRouter.patch('/memories/:id', authenticateUser, updateMemory);
apiRouter.delete('/memories/:id', authenticateUser, deleteMemory);
apiRouter.get('/memories/:id/events', authenticateUser, getMemoryEvents);

// 5. Quarantine Management
apiRouter.get('/quarantine', authenticateUser, getQuarantinedMemories);
apiRouter.post('/quarantine/:id/release', authenticateUser, releaseQuarantine);
apiRouter.post('/quarantine/:id/reject', authenticateUser, rejectQuarantine);

// 6. External Event Triggers (n8n & Deploy hooks)
apiRouter.post('/events/deploy', requireInternalKey, handleDeployEvent);
apiRouter.post('/outcomes', requireInternalKey, handleOutcomeFeedback);

// 7. Temporal Time Travel
apiRouter.get('/timetravel', authenticateUser, timeTravel);

// 8. AI Engine Interaction Routes
apiRouter.post('/chat', authenticateUser, chat);
apiRouter.post('/ingest', authenticateUser, ingestObservation);
apiRouter.post('/retrieve', authenticateUser, retrieveMemories);
apiRouter.post('/agent/triage', requireInternalKey, agentTriage);
