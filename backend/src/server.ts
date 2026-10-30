import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config/index.js';
import { logger } from './utils/logger.js';
import { apiRouter } from './routes/index.js';
import { errorHandler } from './middleware/errorHandler.js';
import { getRepository } from './repositories/index.js';

const app = express();

// Security & Parsing Middleware
app.use(helmet({
  contentSecurityPolicy: false // Allow SSE & dashboard iframe interactions
}));

app.use(cors({
  origin: '*', // Allow frontend dev server and production Vercel apps
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-internal-key']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  if (req.path !== '/api/stream' && req.path !== '/api/health') {
    logger.debug({ method: req.method, path: req.path }, 'Incoming HTTP Request');
  }
  next();
});

// API Routes
app.use('/api', apiRouter);

// Centralized Error Handler
app.use(errorHandler);

// Server startup
async function startServer() {
  try {
    // Pre-initialize repository
    const repo = await getRepository();
    logger.info({ store: repo.name }, 'Active repository connected');

    const server = app.listen(config.port, () => {
      logger.info(`================================================================`);
      logger.info(`🚀 ANCHOR Backend Server running on http://localhost:${config.port}`);
      logger.info(`📦 Storage Mode: [${config.store.toUpperCase()}] (${repo.name})`);
      logger.info(`🛡️ Environment: ${config.nodeEnv}`);
      logger.info(`================================================================`);
    });

    const shutdown = async () => {
      logger.info('Shutting down ANCHOR server gracefully...');
      server.close(async () => {
        await repo.close();
        logger.info('Closed backend connections.');
        process.exit(0);
      });
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  } catch (err) {
    logger.error({ err }, 'Failed to start ANCHOR server');
    process.exit(1);
  }
}

startServer();

export { app };
