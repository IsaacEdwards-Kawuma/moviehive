import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { optionalAuth } from '../middleware/auth.js';

export const searchRouter = Router();

const contentInclude = {
  contentGenres: { include: { genre: true } },
  episodes: { take: 1 },
};

searchRouter.get('/', optionalAuth, async (req, res) => {
  const { q, genre, year, rating, type, page = '1', limit = '20' } = req.query;
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
  if (userId && query.length >= 2) {
    await prisma.searchHistory.create({
      data: { query, profileId: undefined },
    }).catch(() => {});
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

searchRouter.get('/recent', async (req, res) => {
  const recent = await prisma.searchHistory.findMany({
    orderBy: { createdAt: 'desc' },
    distinct: ['query'],
    take: 10,
  });
  res.json(recent.map((r) => r.query));
});

searchRouter.get('/genres', async (_req, res) => {
  const genres = await prisma.genre.findMany({
    orderBy: { name: 'asc' },
  });
  res.json(genres);
});
