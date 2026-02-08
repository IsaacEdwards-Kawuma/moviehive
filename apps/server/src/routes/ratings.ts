import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';

export const ratingsRouter = Router();
ratingsRouter.use(requireAuth);

const rateSchema = z.object({
  profileId: z.string().uuid(),
  contentId: z.string().uuid(),
  rating: z.number().int().min(1).max(5).optional(),
  thumbsUp: z.boolean().optional(),
});

ratingsRouter.post('/', async (req, res) => {
  const userId = (req as unknown as { userId: string }).userId;
  const parsed = rateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid input' });
    return;
  }
  const { profileId, contentId, rating, thumbsUp } = parsed.data;
  const profile = await prisma.profile.findFirst({
    where: { id: profileId, userId },
  });
  if (!profile) {
    res.status(404).json({ error: 'Profile not found' });
    return;
  }
  const content = await prisma.content.findUnique({
    where: { id: contentId },
  });
  if (!content) {
    res.status(404).json({ error: 'Content not found' });
    return;
  }
  await prisma.rating.upsert({
    where: {
      profileId_contentId: { profileId, contentId },
    },
    create: { profileId, contentId, rating: rating ?? 0, thumbsUp: thumbsUp ?? null },
    update: { rating: rating ?? undefined, thumbsUp: thumbsUp ?? undefined },
  });
  res.json({ message: 'Rating saved' });
});

ratingsRouter.get('/:contentId', requireAuth, async (req, res) => {
  const { contentId } = req.params;
  const { profileId } = req.query;
  if (!profileId || typeof profileId !== 'string') {
    res.status(400).json({ error: 'profileId required' });
    return;
  }
  const rating = await prisma.rating.findUnique({
    where: {
      profileId_contentId: { profileId, contentId },
    },
  });
  res.json(rating ?? null);
});
