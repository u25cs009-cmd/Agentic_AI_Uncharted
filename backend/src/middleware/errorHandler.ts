import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '../utils/logger.js';

export class AppError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message);
    this.name = 'AppError';
  }
}

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) {
  // 1. Express body-parser SyntaxError on malformed JSON payload
  if (
    (err instanceof SyntaxError && 'body' in err && (err as any).status === 400) ||
    (err as any).type === 'entity.parse.failed'
  ) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Invalid or malformed JSON payload'
    });
  }

  if (err instanceof ZodError) {
    const list = (err as any).issues || (err as any).errors || [];
    return res.status(400).json({
      error: 'Validation Error',
      details: list.map((e: any) => ({ path: e.path?.join('.') || '', message: e.message }))
    });
  }

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ error: err.message });
  }

  logger.error({ err, path: req.path, method: req.method }, 'Unhandled server error');

  return res.status(500).json({
    error: 'Internal Server Error',
    message: err.message || 'An unexpected error occurred'
  });
}
