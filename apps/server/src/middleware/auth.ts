import type { Request, Response, NextFunction } from 'express';
import { getAccessTokenFromRequest, verifyAccessToken } from '../lib/auth.js';
import { prisma } from '../lib/prisma.js';

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const token = getAccessTokenFromRequest(req);
  if (!token) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const payload = verifyAccessToken(token);
  if (!payload) {
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }
  const user = await prisma.user.findUnique({ where: { id: payload.userId }, select: { id: true, disabled: true } });
  if (!user) {
    res.status(401).json({ error: 'User not found' });
    return;
  }
  if (user.disabled) {
    res.status(403).json({ error: 'This account has been disabled by an administrator.' });
    return;
  }
  (req as Request & { userId: string }).userId = user.id;
  next();
}

export async function optionalAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const token = getAccessTokenFromRequest(req);
  if (token) {
    const payload = verifyAccessToken(token);
    if (payload) {
      const user = await prisma.user.findUnique({ where: { id: payload.userId }, select: { id: true, disabled: true } });
      if (user && !user.disabled) {
        (req as Request & { userId?: string }).userId = user.id;
      }
    }
  }
  next();
}
