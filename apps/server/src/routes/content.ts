import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { optionalAuth } from '../middleware/auth.js';

export const contentRouter = Router();

const contentInclude = {
  contentGenres: { include: { genre: true } },
  episodes: { orderBy: [{ season: 'asc' }, { episode: 'asc' }] },
};

contentRouter.get('/', async (req, res) => {
  const { genre, year, rating, type, featured, page = '1', limit = '20' } = req.query;
  const pageNum = Math.max(1, parseInt(String(page), 10));
  const limitNum = Math.min(50, Math.max(1, parseInt(String(limit), 10)));
  const skip = (pageNum - 1) * limitNum;

  const where: Record<string, unknown> = {};
  if (type) where.type = type;
  if (featured === 'true') where.featured = true;
  if (year) where.releaseYear = parseInt(String(year), 10);
  if (rating) where.rating = rating;
  if (genre) {
    where.contentGenres = {
      some: {
        genre: { slug: String(genre) },
      },
    };
  }

  const [items, total] = await Promise.all([
    prisma.content.findMany({
      where,
      include: contentInclude,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limitNum,
    }),
    prisma.content.count({ where }),
  ]);

  res.json({
    data: items,
    total,
    page: pageNum,
    limit: limitNum,
    totalPages: Math.ceil(total / limitNum),
  });
});

contentRouter.get('/trending', async (_req, res) => {
  const items = await prisma.content.findMany({
    where: { featured: true },
    include: contentInclude,
    take: 20,
    orderBy: { updatedAt: 'desc' },
  });
  res.json(items);
});

contentRouter.get('/new-releases', async (_req, res) => {
  const items = await prisma.content.findMany({
    include: contentInclude,
    orderBy: { createdAt: 'desc' },
    take: 20,
  });
  res.json(items);
});

contentRouter.get('/featured', async (_req, res) => {
  const item = await prisma.content.findFirst({
    where: { featured: true },
    include: contentInclude,
    orderBy: { updatedAt: 'desc' },
  });
  res.json(item ?? null);
});

contentRouter.get('/:id', optionalAuth, async (req, res) => {
  const { id } = req.params;
  const content = await prisma.content.findUnique({
    where: { id },
    include: contentInclude,
  });
  if (!content) {
    res.status(404).json({ error: 'Content not found' });
    return;
  }
  res.json(content);
});

contentRouter.get('/:id/episodes', async (req, res) => {
  const { id } = req.params;
  const content = await prisma.content.findUnique({
    where: { id, type: 'series' },
    include: { episodes: { orderBy: [{ season: 'asc' }, { episode: 'asc' }] } },
  });
  if (!content) {
    res.status(404).json({ error: 'Series not found' });
    return;
  }
  res.json(content.episodes);
});
