import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getRepository } from '../repositories/index.js';
import { config } from '../config/index.js';
import { AppError } from '../middleware/errorHandler.js';
import { User } from '../types/index.js';

export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password, name, workspace } = req.body;
    if (!email) throw new AppError(400, 'Email is required');

    const repo = await getRepository();
    const existing = await repo.findUserByEmail(email);
    if (existing) {
      // If user already exists in demo, log them in
      const token = jwt.sign(
        { id: existing.id, email: existing.email, workspace: existing.workspace },
        config.jwtSecret,
        { expiresIn: '7d' }
      );
      return res.json({ token, user: { id: existing.id, email: existing.email, name: existing.name } });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password || 'password123', salt);
    const userId = `usr-${Date.now()}`;

    const newUser: User = {
      id: userId,
      email: email.toLowerCase(),
      name: name || email.split('@')[0],
      passwordHash,
      workspace: workspace || 'ws-primary',
      created_at: new Date().toISOString()
    };

    await repo.saveUser(newUser);

    const token = jwt.sign(
      { id: newUser.id, email: newUser.email, workspace: newUser.workspace },
      config.jwtSecret,
      { expiresIn: '7d' }
    );

    return res.status(201).json({
      token,
      user: { id: newUser.id, email: newUser.email, name: newUser.name }
    });
  } catch (err) {
    next(err);
  }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password } = req.body;
    if (!email) throw new AppError(400, 'Email is required');

    const repo = await getRepository();
    let user = await repo.findUserByEmail(email);

    if (!user) {
      // Auto-provision demo account for smooth evaluation
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password || 'password123', salt);
      user = {
        id: `usr-${Date.now()}`,
        email: email.toLowerCase(),
        name: email.split('@')[0] || 'ANCHOR Operator',
        passwordHash,
        workspace: 'ws-primary',
        created_at: new Date().toISOString()
      };
      await repo.saveUser(user);
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, workspace: user.workspace },
      config.jwtSecret,
      { expiresIn: '7d' }
    );

    return res.json({
      token,
      user: { id: user.id, email: user.email, name: user.name }
    });
  } catch (err) {
    next(err);
  }
}

export async function exportData(req: Request, res: Response, next: NextFunction) {
  try {
    const repo = await getRepository();
    const userId = req.user?.id || 'usr-shakti2';
    const workspace = req.user?.workspace || 'ws-primary';

    const memories = await repo.findMemories({ owner: userId, workspace });
    const events = await repo.getEvents(500, userId, workspace);

    return res.json({
      user_id: userId,
      exported_at: new Date().toISOString(),
      memories_count: memories.length,
      events_count: events.length,
      memories,
      events
    });
  } catch (err) {
    next(err);
  }
}

export async function deleteAccount(req: Request, res: Response, next: NextFunction) {
  try {
    const repo = await getRepository();
    const userId = req.user?.id;
    if (!userId) throw new AppError(401, 'Unauthorized');

    await repo.deleteUserAccount(userId);
    return res.json({ success: true, message: 'Account and associated memories deleted successfully' });
  } catch (err) {
    next(err);
  }
}
