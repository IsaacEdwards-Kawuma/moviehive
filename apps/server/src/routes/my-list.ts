import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';

export const myListRouter = Router();
myListRouter.use(requireAuth);

myListRouter.get('/', async (req, res) => {
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
  const items = await prisma.myListItem.findMany({
    where: { profileId },
    include: {
      content: {
        include: {
          contentGenres: { include: { genre: true } },
          episodes: { take: 1, orderBy: { season: 'asc' } },
        },
      },
    },
    orderBy: { addedAt: 'desc' },
  });
  res.json(items.map((i) => ({ ...i.content, addedAt: i.addedAt })));
});

myListRouter.post('/', async (req, res) => {
  const userId = (req as unknown as { userId: string }).userId;
  const { profileId, contentId } = req.body;
  if (!profileId || !contentId) {
    res.status(400).json({ error: 'profileId and contentId required' });
    return;
  }
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
  await prisma.myListItem.upsert({
    where: {
      profileId_contentId: { profileId, contentId },
    },
    create: { profileId, contentId },
    update: {},
  });
  res.status(201).json({ message: 'Added to My List' });
});

myListRouter.delete('/:contentId', async (req, res) => {
  const userId = (req as unknown as { userId: string }).userId;
  const { contentId } = req.params;
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
  await prisma.myListItem.deleteMany({
    where: { profileId, contentId },
  });
  res.status(204).send();
});
