import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { optionalAuth, requireAuth } from '../middleware/auth.js';

export const searchRouter = Router();

const contentInclude = {
  contentGenres: { include: { genre: true } },
  episodes: { take: 1 },
};

searchRouter.get('/', optionalAuth, async (req, res) => {
  const { q, genre, year, rating, type, page = '1', limit = '20', profileId: profileIdQuery } = req.query;
  const query = typeof q === 'string' ? q.trim() : '';
  const pageNum = Math.max(1, parseInt(String(page), 10));
  const limitNum = Math.min(50, Math.max(1, parseInt(String(limit), 10)));
  const skip = (pageNum - 1) * limitNum;

  const where: Record<string, unknown> = {};

  if (query.length >= 2) {
    where.OR = [
      { title: { contains: query, mode: 'insensitive' } },
      { description: { contains: query, mode: 'insensitive' } },
    ];
  }
  if (type) where.type = type;
  if (year) where.releaseYear = parseInt(String(year), 10);
  if (rating) where.rating = rating;
  if (genre) {
    where.contentGenres = {
      some: { genre: { slug: String(genre).toLowerCase().replace(/\s+/g, '-') } },
    };
  }

  const [data, total] = await Promise.all([
    prisma.content.findMany({
      where,
      include: contentInclude,
      orderBy: [{ featured: 'desc' }, { releaseYear: 'desc' }],
      skip,
      take: limitNum,
    }),
    prisma.content.count({ where }),
  ]);

  const userId = (req as unknown as { userId?: string }).userId;
  const profileId = typeof profileIdQuery === 'string' ? profileIdQuery : undefined;
  if (userId && profileId && query.length >= 2) {
    const profile = await prisma.profile.findFirst({
      where: { id: profileId, userId },
    });
    if (profile) {
      await prisma.searchHistory.create({
        data: { query, profileId },
      }).catch(() => {});
    }
  }

  res.json({
    data,
    total,
    page: pageNum,
    limit: limitNum,
    totalPages: Math.ceil(total / limitNum),
  });
});

searchRouter.get('/suggest', async (req, res) => {
  const { q } = req.query;
  const query = typeof q === 'string' ? q.trim() : '';
  if (query.length < 2) {
    res.json([]);
    return;
  }
  const results = await prisma.content.findMany({
    where: {
      title: { contains: query, mode: 'insensitive' },
    },
    select: { id: true, title: true, type: true, thumbnailUrl: true, releaseYear: true },
    take: 10,
  });
  res.json(results);
});

searchRouter.get('/recent', requireAuth, async (req, res) => {
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
  const rows = await prisma.searchHistory.findMany({
    where: { profileId },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  const seen = new Set<string>();
  const recent = rows.filter((r) => {
    if (seen.has(r.query)) return false;
    seen.add(r.query);
    return true;
  }).slice(0, 10).map((r) => r.query);
  res.json(recent);
});

searchRouter.get('/genres', async (_req, res) => {
  const genres = await prisma.genre.findMany({
    orderBy: { name: 'asc' },
  });
  res.json(genres);
});
