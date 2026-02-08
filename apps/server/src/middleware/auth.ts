import type { Request, Response, NextFunction } from 'express';
import { getAccessTokenFromRequest, verifyAccessToken } from '../lib/auth.js';

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
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
  (req as Request & { userId: string }).userId = payload.userId;
  next();
}

export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const token = getAccessTokenFromRequest(req);
  if (token) {
    const payload = verifyAccessToken(token);
    if (payload) (req as Request & { userId?: string }).userId = payload.userId;
  }
  next();
}
