import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import type { Request } from 'express';

const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-secret-change-in-production';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET ?? 'dev-refresh-secret';
const ACCESS_EXPIRY = '15m';
const REFRESH_EXPIRY = '7d';

export interface JwtPayload {
  userId: string;
  email: string;
  type: 'access' | 'refresh';
}

export interface StreamProxyPayload {
  contentId: string;
  episodeId?: string;
  userId: string;
  type: 'stream-proxy';
}

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function signAccessToken(payload: Omit<JwtPayload, 'type'>): string {
  return jwt.sign(
    { ...payload, type: 'access' } as JwtPayload,
    JWT_SECRET,
    { expiresIn: ACCESS_EXPIRY }
  );
}

export function signRefreshToken(payload: Omit<JwtPayload, 'type'>): string {
  return jwt.sign(
    { ...payload, type: 'refresh' } as JwtPayload,
    JWT_REFRESH_SECRET,
    { expiresIn: REFRESH_EXPIRY }
  );
}

export function verifyAccessToken(token: string): JwtPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    return decoded?.type === 'access' ? decoded : null;
  } catch {
    return null;
  }
}

export function verifyRefreshToken(token: string): JwtPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_REFRESH_SECRET) as JwtPayload;
    return decoded?.type === 'refresh' ? decoded : null;
  } catch {
    return null;
  }
}

const STREAM_PROXY_EXPIRY = '1h';

export function signStreamProxyToken(payload: { contentId: string; episodeId?: string; userId: string }): string {
  return jwt.sign(
    { ...payload, type: 'stream-proxy' } as StreamProxyPayload,
    JWT_SECRET,
    { expiresIn: STREAM_PROXY_EXPIRY }
  );
}

export function verifyStreamProxyToken(token: string): StreamProxyPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as StreamProxyPayload;
    return decoded?.type === 'stream-proxy' ? decoded : null;
  } catch {
    return null;
  }
}

export function getAccessTokenFromRequest(req: Request): string | null {
  const auth = req.headers.authorization;
  if (auth?.startsWith('Bearer ')) return auth.slice(7);
  return req.cookies?.accessToken ?? null;
}

export function getRefreshTokenFromRequest(req: Request): string | null {
  return req.cookies?.refreshToken ?? req.body?.refreshToken ?? null;
}
