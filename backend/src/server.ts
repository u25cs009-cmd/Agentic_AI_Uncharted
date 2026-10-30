import dns from 'node:dns';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import fs from 'fs';
import { config } from './config/index.js';
import { logger } from './utils/logger.js';
import { apiRouter } from './routes/index.js';
import { errorHandler } from './middleware/errorHandler.js';
import { getRepository } from './repositories/index.js';

// Ensure reliable SRV record resolution for MongoDB Atlas on Windows/ISP networks
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch {
  // Gracefully fallback to default resolver in restricted environments
}

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

// Serve frontend static assets if built
const candidateDistPaths = [
  path.resolve(process.cwd(), 'frontend', 'dist'),
  path.resolve(process.cwd(), '..', 'frontend', 'dist'),
  path.resolve(__dirname, '..', '..', 'frontend', 'dist'),
];
const distPath = candidateDistPaths.find((p) => fs.existsSync(p));

if (distPath) {
  logger.info({ distPath }, 'Serving static frontend UI assets');
  app.use(express.static(distPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// Centralized Error Handler
app.use(errorHandler);

// Server startup
async function startServer() {
  try {
    // Pre-initialize repository
    const repo = await getRepository();
    logger.info({ store: repo.name }, 'Active repository connected');

    const server = app.listen(config.port, '0.0.0.0', () => {
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

if (process.env.NODE_ENV !== 'test') {
  startServer();
}

export { app };
