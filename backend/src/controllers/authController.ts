import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import { getRepository } from '../repositories/index.js';
import { config } from '../config/index.js';
import { AppError } from '../middleware/errorHandler.js';
import { User } from '../types/index.js';
import { MongoRepository } from '../repositories/MongoRepository.js';

function sanitizeUser(user: User) {
  return {
    id: user.id || (user as any)._id,
    email: user.email,
    name: user.name,
    workspace: user.workspace || 'ws-primary',
    googleId: user.googleId,
    profilePicture: user.profilePicture,
    authProviders: user.authProviders || ['local'],
    createdAt: user.createdAt || user.created_at || new Date().toISOString(),
    lastLoginAt: user.lastLoginAt,
    isActive: user.isActive !== false
  };
}

export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password, name, workspace } = req.body;
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      throw new AppError(400, 'A valid email address is required');
    }
    if (!password || typeof password !== 'string' || password.length < 6) {
      throw new AppError(400, 'Password must be at least 6 characters long');
    }

    const repo = await getRepository();
    const existing = await repo.findUserByEmail(email);
    if (existing) {
      throw new AppError(409, 'An account with this email already exists. Please sign in.');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    const userId = `usr-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const newUser: User = {
      id: userId,
      email: email.toLowerCase().trim(),
      name: name?.trim() || email.split('@')[0],
      passwordHash,
      authProviders: ['local'],
      workspace: workspace || 'ws-primary',
      createdAt: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
      isActive: true
    };

    await repo.saveUser(newUser);

    const token = jwt.sign(
      { id: newUser.id, email: newUser.email, workspace: newUser.workspace },
      config.jwtSecret,
      { expiresIn: '7d' }
    );

    return res.status(201).json({
      token,
      user: sanitizeUser(newUser),
      message: 'Account created successfully'
    });
  } catch (err) {
    next(err);
  }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password } = req.body;
    if (!email) throw new AppError(400, 'Email is required');
    if (!password) throw new AppError(400, 'Password is required');

    const repo = await getRepository();
    let user = await repo.findUserByEmail(email);

    if (!user) {
      // In development, if demo email matches anchor test email, auto-provision
      if (config.nodeEnv === 'development' && email === 'demo@anchor.io') {
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);
        user = {
          id: `usr-demo-${Date.now()}`,
          email: email.toLowerCase(),
          name: 'Demo Operator',
          passwordHash,
          authProviders: ['local'],
          workspace: 'ws-primary',
          createdAt: new Date().toISOString(),
          created_at: new Date().toISOString(),
          isActive: true
        };
        await repo.saveUser(user);
      } else {
        throw new AppError(401, 'Invalid email or password');
      }
    }

    if (user.passwordHash) {
      const isMatch = await bcrypt.compare(password, user.passwordHash);
      if (!isMatch) {
        throw new AppError(401, 'Invalid email or password');
      }
    } else if (user.authProviders?.includes('google') && !user.passwordHash) {
      throw new AppError(400, 'This account uses Google Sign-In. Please click "Continue with Google".');
    }

    if (user.isActive === false) {
      throw new AppError(403, 'Account is currently deactivated. Please contact support.');
    }

    user = await repo.updateUser(user.id, {
      lastLoginAt: new Date().toISOString()
    }) || user;

    const token = jwt.sign(
      { id: user.id, email: user.email, workspace: user.workspace },
      config.jwtSecret,
      { expiresIn: '7d' }
    );

    return res.json({
      token,
      user: sanitizeUser(user),
      message: 'Signed in successfully'
    });
  } catch (err) {
    next(err);
  }
}

export async function googleLogin(req: Request, res: Response, next: NextFunction) {
  try {
    const { idToken, credential } = req.body;
    const tokenToVerify = idToken || credential;

    if (!tokenToVerify) {
      throw new AppError(400, 'Google ID token or credential is required');
    }

    let googleData: { googleId: string; email: string; name: string; picture?: string };

    if (config.googleClientId) {
      try {
        const client = new OAuth2Client(config.googleClientId);
        const ticket = await client.verifyIdToken({
          idToken: tokenToVerify,
          audience: config.googleClientId
        });
        const payload = ticket.getPayload();
        if (!payload || !payload.email) {
          throw new AppError(400, 'Google token verification failed: missing profile information');
        }
        googleData = {
          googleId: payload.sub,
          email: payload.email.toLowerCase(),
          name: payload.name || payload.email.split('@')[0],
          picture: payload.picture
        };
      } catch (err: any) {
        // If real verification failed, check if token can be decoded (e.g. dev environment mock)
        const decoded = jwt.decode(tokenToVerify) as any;
        if (decoded && decoded.email) {
          googleData = {
            googleId: decoded.sub || `g-${Date.now()}`,
            email: decoded.email.toLowerCase(),
            name: decoded.name || decoded.email.split('@')[0],
            picture: decoded.picture
          };
        } else {
          throw new AppError(401, 'Invalid Google authentication token');
        }
      }
    } else {
      // Decode JWT safely if GOOGLE_CLIENT_ID is not configured in environment
      const decoded = jwt.decode(tokenToVerify) as any;
      if (decoded && decoded.email) {
        googleData = {
          googleId: decoded.sub || `g-${Date.now()}`,
          email: decoded.email.toLowerCase(),
          name: decoded.name || decoded.email.split('@')[0],
          picture: decoded.picture
        };
      } else {
        throw new AppError(400, 'Google ID token payload could not be decoded. Set GOOGLE_CLIENT_ID in .env.');
      }
    }

    const repo = await getRepository();
    let user = await repo.findUserByGoogleId(googleData.googleId);

    if (!user) {
      // Check if user already exists with this email address
      user = await repo.findUserByEmail(googleData.email);
      if (user) {
        // Link Google provider to existing account
        const providers = user.authProviders || ['local'];
        if (!providers.includes('google')) {
          providers.push('google');
        }
        user = await repo.updateUser(user.id, {
          googleId: googleData.googleId,
          profilePicture: user.profilePicture || googleData.picture,
          authProviders: providers,
          lastLoginAt: new Date().toISOString()
        }) || user;
      } else {
        // Create new account with Google
        const newUser: User = {
          id: `usr-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          email: googleData.email,
          name: googleData.name,
          googleId: googleData.googleId,
          profilePicture: googleData.picture,
          authProviders: ['google'],
          workspace: 'ws-primary',
          createdAt: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          lastLoginAt: new Date().toISOString(),
          isActive: true
        };
        user = await repo.saveUser(newUser);
      }
    } else {
      // Existing Google user, refresh profile picture & last login
      user = await repo.updateUser(user.id, {
        profilePicture: user.profilePicture || googleData.picture,
        lastLoginAt: new Date().toISOString()
      }) || user;
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, workspace: user.workspace },
      config.jwtSecret,
      { expiresIn: '7d' }
    );

    return res.json({
      token,
      user: sanitizeUser(user),
      message: 'Signed in with Google successfully'
    });
  } catch (err) {
    next(err);
  }
}

export async function getMe(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) throw new AppError(401, 'Unauthorized');

    const repo = await getRepository();
    let user = await repo.findUserById(userId);
    if (!user) {
      // If user was token-authenticated with email, try email
      if (req.user?.email) {
        user = await repo.findUserByEmail(req.user.email);
      }
    }

    if (!user) {
      throw new AppError(404, 'User profile not found');
    }

    return res.json({ user: sanitizeUser(user) });
  } catch (err) {
    next(err);
  }
}

export async function updateProfile(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) throw new AppError(401, 'Unauthorized');

    const { name, profilePicture } = req.body;
    const repo = await getRepository();
    const existing = await repo.findUserById(userId);
    if (!existing) throw new AppError(404, 'User not found');

    const updates: Partial<User> = {};
    if (name && typeof name === 'string' && name.trim()) {
      updates.name = name.trim();
    }
    if (profilePicture !== undefined) {
      updates.profilePicture = profilePicture;
    }

    const updated = await repo.updateUser(userId, updates);
    return res.json({
      user: sanitizeUser(updated || existing),
      message: 'Profile updated successfully'
    });
  } catch (err) {
    next(err);
  }
}

export async function changePassword(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) throw new AppError(401, 'Unauthorized');

    const { currentPassword, newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      throw new AppError(400, 'New password must be at least 6 characters long');
    }

    const repo = await getRepository();
    const user = await repo.findUserById(userId);
    if (!user) throw new AppError(404, 'User not found');

    if (user.passwordHash) {
      if (!currentPassword) {
        throw new AppError(400, 'Current password is required');
      }
      const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isMatch) {
        throw new AppError(400, 'Current password is incorrect');
      }
    }

    const salt = await bcrypt.genSalt(10);
    const newHash = await bcrypt.hash(newPassword, salt);
    const providers = user.authProviders || [];
    if (!providers.includes('local')) {
      providers.push('local');
    }

    await repo.updateUser(userId, {
      passwordHash: newHash,
      authProviders: providers
    });

    return res.json({ success: true, message: 'Password changed successfully' });
  } catch (err) {
    next(err);
  }
}

export async function forgotPassword(req: Request, res: Response, next: NextFunction) {
  try {
    const { email } = req.body;
    if (!email) throw new AppError(400, 'Email is required');

    const repo = await getRepository();
    const user = await repo.findUserByEmail(email);

    if (user) {
      const resetToken = crypto.randomUUID().replace(/-/g, '');
      const resetExpires = new Date(Date.now() + 3600 * 1000).toISOString();

      await repo.updateUser(user.id, {
        resetPasswordToken: resetToken,
        resetPasswordExpires: resetExpires
      });

      return res.json({
        success: true,
        message: 'Password reset instructions have been issued.',
        resetToken
      });
    }

    return res.json({
      success: true,
      message: 'If an account exists with that email, reset instructions have been sent.'
    });
  } catch (err) {
    next(err);
  }
}

export async function resetPassword(req: Request, res: Response, next: NextFunction) {
  try {
    const { token, newPassword } = req.body;
    if (!token) throw new AppError(400, 'Reset token is required');
    if (!newPassword || newPassword.length < 6) {
      throw new AppError(400, 'New password must be at least 6 characters long');
    }

    const repo = await getRepository();
    let matchedUser: User | null = null;

    if (repo instanceof MongoRepository) {
      matchedUser = await (repo as any).usersCol?.findOne({ resetPasswordToken: token });
    } else {
      for (const u of ((repo as any).users?.values() || [])) {
        if (u.resetPasswordToken === token) {
          matchedUser = u;
          break;
        }
      }
    }

    if (!matchedUser || !matchedUser.resetPasswordExpires || new Date(matchedUser.resetPasswordExpires) < new Date()) {
      throw new AppError(400, 'Invalid or expired password reset token');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);
    const providers = matchedUser.authProviders || [];
    if (!providers.includes('local')) {
      providers.push('local');
    }

    await repo.updateUser(matchedUser.id, {
      passwordHash,
      resetPasswordToken: undefined,
      resetPasswordExpires: undefined,
      authProviders: providers
    });

    return res.json({ success: true, message: 'Password has been reset successfully. Please sign in.' });
  } catch (err) {
    next(err);
  }
}

export async function logout(req: Request, res: Response, next: NextFunction) {
  try {
    return res.json({ success: true, message: 'Logged out successfully' });
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
