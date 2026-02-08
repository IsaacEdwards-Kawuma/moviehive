import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';

export const watchHistoryRouter = Router();
watchHistoryRouter.use(requireAuth);

const updateProgressSchema = z.object({
  profileId: z.string().uuid(),
  contentId: z.string().uuid(),
  episodeId: z.string().uuid().optional().nullable(),
  progress: z.number().int().min(0),
  completed: z.boolean().optional(),
});

watchHistoryRouter.get('/', async (req, res) => {
  const userId = (req as unknown as { userId: string }).userId;
  const { profileId } = req.query;
  if (!profileId || typeof profileId !== 'string') {
    res.status(400).json({ error: 'profileId required' });
    return;
  }
  const profile = await prisma.profile.findFirst({
    where: { id: profileId, userId },
  });
  if (!profile) {
    res.status(404).json({ error: 'Profile not found' });
    return;
  }
  const history = await prisma.watchHistory.findMany({
    where: { profileId },
    include: {
      content: true,
      episode: true,
    },
    orderBy: { watchedAt: 'desc' },
    take: 100,
  });
  res.json(history);
});

watchHistoryRouter.get('/continue-watching', async (req, res) => {
  const userId = (req as unknown as { userId: string }).userId;
  const { profileId } = req.query;
  if (!profileId || typeof profileId !== 'string') {
    res.status(400).json({ error: 'profileId required' });
    return;
  }
  const profile = await prisma.profile.findFirst({
    where: { id: profileId, userId },
  });
  if (!profile) {
    res.status(404).json({ error: 'Profile not found' });
    return;
  }
  const history = await prisma.watchHistory.findMany({
    where: { profileId, completed: false, progress: { gt: 0 } },
    include: {
      content: { include: { contentGenres: { include: { genre: true } } } },
      episode: true,
    },
    orderBy: { watchedAt: 'desc' },
    take: 20,
  });
  res.json(history);
});

watchHistoryRouter.post('/', async (req, res) => {
  const parsed = updateProgressSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid input' });
    return;
  }
  const userId = (req as unknown as { userId: string }).userId;
  const { profileId, contentId, episodeId, progress, completed } = parsed.data;

  const profile = await prisma.profile.findFirst({
    where: { id: profileId, userId },
  });
  if (!profile) {
    res.status(404).json({ error: 'Profile not found' });
    return;
  }

  const existing = await prisma.watchHistory.findFirst({
    where: { profileId, contentId, episodeId: episodeId ?? null },
  });

  if (existing) {
    const updated = await prisma.watchHistory.update({
      where: { id: existing.id },
      data: { progress, completed: completed ?? progress > 0 },
      include: { content: true, episode: true },
    });
    res.json(updated);
    return;
  }

  const created = await prisma.watchHistory.create({
    data: {
      profileId,
      contentId,
      episodeId: episodeId ?? null,
      progress,
      completed: completed ?? false,
    },
    include: { content: true, episode: true },
  });
  res.status(201).json(created);
});
