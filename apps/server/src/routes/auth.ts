import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import {
  hashPassword,
  verifyPassword,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  getRefreshTokenFromRequest,
  addPartitionedToCookies,
} from '../lib/auth.js';
import { requireAuth } from '../middleware/auth.js';

export const authRouter = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

authRouter.post('/register', async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
    return;
  }
  const { email, password } = parsed.data;
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    res.status(409).json({ error: 'Email already registered' });
    return;
  }
  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: { email, passwordHash },
    select: { id: true, email: true, subscriptionTier: true, role: true, createdAt: true },
  });
  const accessToken = signAccessToken({ userId: user.id, email: user.email });
  const refreshToken = signRefreshToken({ userId: user.id, email: user.email });
  const cookieOpts = process.env.NODE_ENV === 'production'
    ? { httpOnly: true, maxAge: 15 * 60 * 1000, sameSite: 'none' as const, secure: true }
    : { httpOnly: true, maxAge: 15 * 60 * 1000, sameSite: 'lax' as const };
  res.cookie('accessToken', accessToken, cookieOpts);
  res.cookie('refreshToken', refreshToken, { ...cookieOpts, maxAge: 7 * 24 * 60 * 60 * 1000 });
  if (cookieOpts.sameSite === 'none') addPartitionedToCookies(res);
  res.status(201).json({
    user: { id: user.id, email: user.email, subscriptionTier: user.subscriptionTier, role: user.role },
    accessToken,
    expiresIn: 900,
  });
});

authRouter.post('/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid input' });
    return;
  }
  const { email, password } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }
  if (!user.passwordHash) {
    res.status(401).json({ error: 'This account uses Google Sign-In. Please sign in with Google.' });
    return;
  }
  if (!(await verifyPassword(password, user.passwordHash))) {
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }
  const accessToken = signAccessToken({ userId: user.id, email: user.email });
  const refreshToken = signRefreshToken({ userId: user.id, email: user.email });
  const cookieOpts = process.env.NODE_ENV === 'production'
    ? { httpOnly: true, maxAge: 15 * 60 * 1000, sameSite: 'none' as const, secure: true }
    : { httpOnly: true, maxAge: 15 * 60 * 1000, sameSite: 'lax' as const };
  res.cookie('accessToken', accessToken, cookieOpts);
  res.cookie('refreshToken', refreshToken, { ...cookieOpts, maxAge: 7 * 24 * 60 * 60 * 1000 });
  if (cookieOpts.sameSite === 'none') addPartitionedToCookies(res);
  res.json({
    user: { id: user.id, email: user.email, subscriptionTier: user.subscriptionTier, role: user.role },
    accessToken,
    expiresIn: 900,
  });
});

authRouter.post('/logout', (_req, res) => {
  res.clearCookie('accessToken');
  res.clearCookie('refreshToken');
  res.json({ message: 'Logged out' });
});

authRouter.post('/refresh-token', async (req, res) => {
  const token = getRefreshTokenFromRequest(req);
  if (!token) {
    res.status(401).json({ error: 'No refresh token' });
    return;
  }
  const payload = verifyRefreshToken(token);
  if (!payload) {
    res.status(401).json({ error: 'Invalid refresh token' });
    return;
  }
  const user = await prisma.user.findUnique({ where: { id: payload.userId } });
  if (!user) {
    res.status(401).json({ error: 'User not found' });
    return;
  }
  const accessToken = signAccessToken({ userId: user.id, email: user.email });
  const cookieOpts = process.env.NODE_ENV === 'production'
    ? { httpOnly: true, maxAge: 15 * 60 * 1000, sameSite: 'none' as const, secure: true }
    : { httpOnly: true, maxAge: 15 * 60 * 1000, sameSite: 'lax' as const };
  res.cookie('accessToken', accessToken, cookieOpts);
  if (cookieOpts.sameSite === 'none') addPartitionedToCookies(res);
  res.json({ accessToken, expiresIn: 900 });
});

authRouter.get('/me', requireAuth, async (req, res) => {
  const userId = (req as unknown as { userId: string }).userId;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, subscriptionTier: true, role: true, createdAt: true },
  });
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  res.json(user);
});