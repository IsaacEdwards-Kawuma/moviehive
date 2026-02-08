import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';

export const recommendationsRouter = Router();

const contentInclude = {
  contentGenres: { include: { genre: true } },
  episodes: { take: 1 },
};

recommendationsRouter.get('/for-you', requireAuth, async (req, res) => {
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

  const watchedGenreIds = await prisma.watchHistory.findMany({
    where: { profileId },
    include: {
      content: { include: { contentGenres: true } },
    },
    take: 50,
  });
  const genreIds = [...new Set(watchedGenreIds.flatMap((h) => h.content.contentGenres.map((g) => g.genreId)))];
  const watchedContentIds = watchedGenreIds.map((h) => h.contentId);

  const recommended = await prisma.content.findMany({
    where: {
      id: { notIn: watchedContentIds },
      ...(genreIds.length > 0
        ? {
            contentGenres: {
              some: { genreId: { in: genreIds } },
            },
          }
        : {}),
    },
    include: contentInclude,
    orderBy: [{ featured: 'desc' }, { releaseYear: 'desc' }],
    take: 20,
  });
  res.json(recommended);
});

recommendationsRouter.get('/similar/:contentId', async (req, res) => {
  const { contentId } = req.params;
  const content = await prisma.content.findUnique({
    where: { id: contentId },
    include: { contentGenres: true },
  });
  if (!content) {
    res.status(404).json({ error: 'Content not found' });
    return;
  }
  const genreIds = content.contentGenres.map((g) => g.genreId);
  const similar = await prisma.content.findMany({
    where: {
      id: { not: contentId },
      contentGenres: {
        some: { genreId: { in: genreIds } },
      },
    },
    include: contentInclude,
    take: 12,
  });
  res.json(similar);
});

recommendationsRouter.get('/trending', async (_req, res) => {
  const items = await prisma.content.findMany({
    where: { featured: true },
    include: contentInclude,
    take: 20,
    orderBy: { updatedAt: 'desc' },
  });
  res.json(items);
});

recommendationsRouter.get('/new-releases', async (_req, res) => {
  const items = await prisma.content.findMany({
    include: contentInclude,
    orderBy: { createdAt: 'desc' },
    take: 20,
  });
  res.json(items);
});
