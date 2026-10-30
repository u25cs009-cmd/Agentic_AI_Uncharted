import { Request, Response } from 'express';
import { getRepository } from '../repositories/index.js';
import { MemoryEvent } from '../types/index.js';
import { logger } from '../utils/logger.js';

export async function sseStream(req: Request, res: Response) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*'
  });

  res.write(': connected to ANCHOR SSE stream\n\n');

  const repo = await getRepository();

  const unsubscribe = repo.subscribeEvents((event: MemoryEvent) => {
    try {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    } catch (err) {
      logger.error({ err }, 'Error writing to SSE stream');
    }
  });

  // Keep-alive heartbeat every 15 seconds
  const heartbeat = setInterval(() => {
    try {
      res.write(': heartbeat\n\n');
    } catch {
      clearInterval(heartbeat);
    }
  }, 15000);

  req.on('close', () => {
    clearInterval(heartbeat);
    unsubscribe();
    res.end();
  });
}
