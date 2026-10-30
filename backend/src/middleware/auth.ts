import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
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

export function requireInternalKey(req: Request, res: Response, next: NextFunction) {
  const internalKey = req.headers['x-internal-key'];
  if (!internalKey || internalKey !== config.internalApiKey) {
    // In dev mode allow bypass if not configured
    if (config.nodeEnv === 'development' && !internalKey) {
      return next();
    }
    return res.status(403).json({ error: 'Unauthorized: Invalid or missing x-internal-key' });
  }
  next();
}

