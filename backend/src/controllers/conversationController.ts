import { Request, Response, NextFunction } from 'express';
import { getRepository } from '../repositories/index.js';
import { AppError } from '../middleware/errorHandler.js';
import { Conversation, ConversationMessage } from '../types/index.js';

export async function listConversations(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) throw new AppError(401, 'Unauthorized');

    const repo = await getRepository();
    const conversations = await repo.findConversationsByUser(userId);

    // Return summaries with message counts
    const summaries = conversations.map((conv) => ({
      id: conv.id || conv._id,
      title: conv.title,
      messageCount: conv.messages ? conv.messages.length : 0,
      lastMessage: conv.messages && conv.messages.length > 0 ? conv.messages[conv.messages.length - 1] : null,
      createdAt: conv.createdAt,
      updatedAt: conv.updatedAt
    }));

    return res.json({ conversations: summaries });
  } catch (err) {
    next(err);
  }
}

export async function getConversation(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) throw new AppError(401, 'Unauthorized');

const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const repo = await getRepository();
    const conversation = await repo.findConversationById(id, userId);

    if (!conversation) {
      throw new AppError(404, 'Conversation not found');
    }

    return res.json({ conversation });
  } catch (err) {
    next(err);
  }
}

export async function createConversation(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) throw new AppError(401, 'Unauthorized');

    const { title, initialMessage } = req.body;
    const now = new Date().toISOString();
    const convId = `conv-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const messages: ConversationMessage[] = [];
    if (initialMessage) {
      messages.push({
        id: `msg-${Date.now()}-1`,
        sender: initialMessage.sender || 'user',
        text: initialMessage.text,
        timestamp: initialMessage.timestamp || now,
        mode: initialMessage.mode || 'governed',
        result: initialMessage.result,
        comparison: initialMessage.comparison
      });
    }

    const conversation: Conversation = {
      id: convId,
      _id: convId,
      userId,
      title: title || (initialMessage?.text ? initialMessage.text.slice(0, 40) + '...' : 'New Session'),
      messages,
      createdAt: now,
      updatedAt: now
    };

    const repo = await getRepository();
    const saved = await repo.saveConversation(conversation);

    return res.status(201).json({ conversation: saved });
  } catch (err) {
    next(err);
  }
}

export async function appendMessage(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) throw new AppError(401, 'Unauthorized');

const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const { sender, text, mode, result, comparison } = req.body;

    if (!text && !result) {
      throw new AppError(400, 'Message text is required');
    }

    const repo = await getRepository();
    const conversation = await repo.findConversationById(id, userId);

    if (!conversation) {
      throw new AppError(404, 'Conversation not found');
    }

    const now = new Date().toISOString();
    const newMessage: ConversationMessage = {
      id: `msg-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      sender: sender || 'user',
      text: text || '',
      timestamp: now,
      mode,
      result,
      comparison
    };

    conversation.messages = conversation.messages || [];
    conversation.messages.push(newMessage);
    conversation.updatedAt = now;

    // Auto-update title if it's default and this is the first user prompt
    if ((conversation.title === 'New Session' || !conversation.title) && sender === 'user') {
      conversation.title = text.slice(0, 45) + (text.length > 45 ? '...' : '');
    }

    const saved = await repo.saveConversation(conversation);

    return res.json({
      conversation: saved,
      message: newMessage
    });
  } catch (err) {
    next(err);
  }
}

export async function deleteConversation(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) throw new AppError(401, 'Unauthorized');

const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const repo = await getRepository();
    const success = await repo.deleteConversation(id, userId);

    if (!success) {
      throw new AppError(404, 'Conversation not found or already deleted');
    }

    return res.json({ success: true, message: 'Conversation deleted successfully' });
  } catch (err) {
    next(err);
  }
}
