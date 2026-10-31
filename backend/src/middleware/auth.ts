import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { config } from '../config/index.js';

export interface AuthenticatedUser {
  id: string;
  email: string;
  workspace: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export function timingSafeCompare(a: string, b: string): boolean {
  try {
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

export function authenticateUser(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // In dev / demo mode: allow default workspace user if no token is passed
    req.user = {
      id: 'usr-shakti2',
      email: 'team@shakti2.io',
      workspace: 'ws-primary'
    };
    return next();
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, config.jwtSecret) as any;
    req.user = {
      id: decoded.id || decoded.userId || 'usr-shakti2',
      email: decoded.email || 'team@shakti2.io',
      workspace: decoded.workspace || 'ws-primary'
    };
    next();
  } catch (err) {
    // If invalid token, fallback to dev user in development, otherwise reject
    if (config.nodeEnv === 'development') {
      req.user = {
        id: 'usr-shakti2',
        email: 'team@shakti2.io',
        workspace: 'ws-primary'
      };
      return next();
    }
    return res.status(401).json({ error: 'Invalid or expired authentication token' });
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required. No token provided.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, config.jwtSecret) as any;
    req.user = {
      id: decoded.id || decoded.userId,
      email: decoded.email,
      workspace: decoded.workspace || 'ws-primary'
    };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired authentication token' });
  }
}

export function requireInternalKey(req: Request, res: Response, next: NextFunction) {
  const configuredKey = config.internalApiKey;
  if (!configuredKey) {
    return res.status(503).json({
      error: 'Service Unavailable: Internal automation authentication is not configured on this server.'
    });
  }

  const internalKey = req.headers['x-internal-key'];
  if (!internalKey || typeof internalKey !== 'string' || !timingSafeCompare(internalKey, configuredKey)) {
    return res.status(403).json({ error: 'Forbidden: Missing or invalid x-internal-key header' });
  }
  next();
}
