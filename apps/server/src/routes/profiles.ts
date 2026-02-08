import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';

export const profilesRouter = Router();
profilesRouter.use(requireAuth);

const createProfileSchema = z.object({
  name: z.string().min(1).max(100),
  avatar: z.string().optional(),
  isKids: z.boolean().optional(),
  language: z.string().max(10).optional(),
  pin: z.string().length(4).optional(),
  colorTheme: z.string().optional(),
});

const updateProfileSchema = createProfileSchema.partial();

profilesRouter.get('/', async (req, res) => {
  const userId = (req as unknown as { userId: string }).userId;
  const profiles = await prisma.profile.findMany({
    where: { userId },
    orderBy: { createdAt: 'asc' },
  });
  res.json(profiles);
});

profilesRouter.post('/', async (req, res) => {
  const userId = (req as unknown as { userId: string }).userId;
  const parsed = createProfileSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
    return;
  }
  const count = await prisma.profile.count({ where: { userId } });
  if (count >= 5) {
    res.status(400).json({ error: 'Maximum 5 profiles per account' });
    return;
  }
  const profile = await prisma.profile.create({
    data: { userId, ...parsed.data },
  });
  res.status(201).json(profile);
});

profilesRouter.put('/:id', async (req, res) => {
  const userId = (req as unknown as { userId: string }).userId;
  const { id } = req.params;
  const parsed = updateProfileSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid input' });
    return;
  }
  const profile = await prisma.profile.findFirst({ where: { id, userId } });
  if (!profile) {
    res.status(404).json({ error: 'Profile not found' });
    return;
  }
  const updated = await prisma.profile.update({
    where: { id },
    data: parsed.data,
  });
  res.json(updated);
});

profilesRouter.delete('/:id', async (req, res) => {
  const userId = (req as unknown as { userId: string }).userId;
  const { id } = req.params;
  const profile = await prisma.profile.findFirst({ where: { id, userId } });
  if (!profile) {
    res.status(404).json({ error: 'Profile not found' });
    return;
  }
  await prisma.profile.delete({ where: { id } });
  res.status(204).send();
});
