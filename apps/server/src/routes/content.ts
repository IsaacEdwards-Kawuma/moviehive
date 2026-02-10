import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { optionalAuth } from '../middleware/auth.js';

export const contentRouter = Router();

const episodeOrderBy = [{ season: Prisma.SortOrder.asc }, { episode: Prisma.SortOrder.asc }] as const;
const contentInclude = {
  contentGenres: { include: { genre: true } },
  episodes: { orderBy: [...episodeOrderBy] },
};

const KIDS_SAFE_RATINGS = ['G', 'PG'];

contentRouter.get('/', async (req, res) => {
  const { genre, year, rating, type, featured, kidsOnly, page = '1', limit = '20' } = req.query;
  const pageNum = Math.max(1, parseInt(String(page), 10));
  const limitNum = Math.min(50, Math.max(1, parseInt(String(limit), 10)));
  const skip = (pageNum - 1) * limitNum;

  const where: Record<string, unknown> = {};
  if (type) where.type = type;
  if (featured === 'true') where.featured = true;
  if (year) where.releaseYear = parseInt(String(year), 10);
  if (kidsOnly === 'true') where.rating = { in: KIDS_SAFE_RATINGS };
  else if (rating) where.rating = rating;
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

contentRouter.get('/trending', async (req, res) => {
  const kidsOnly = req.query.kidsOnly === 'true';
  const where: Record<string, unknown> = { featured: true };
  if (kidsOnly) where.rating = { in: KIDS_SAFE_RATINGS };
  const items = await prisma.content.findMany({
    where,
    include: contentInclude,
    take: 20,
    orderBy: { updatedAt: 'desc' },
  });
  res.json(items);
});

contentRouter.get('/new-releases', async (req, res) => {
  const kidsOnly = req.query.kidsOnly === 'true';
  const where: Record<string, unknown> = {};
  if (kidsOnly) where.rating = { in: KIDS_SAFE_RATINGS };
  const items = await prisma.content.findMany({
    where,
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

function isUuid(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);
}

contentRouter.get('/:id', optionalAuth, async (req, res) => {
  const { id } = req.params;
  const content = isUuid(id)
    ? await prisma.content.findUnique({ where: { id }, include: contentInclude })
    : await prisma.content.findFirst({ where: { slug: id }, include: contentInclude });
  if (!content) {
    res.status(404).json({ error: 'Content not found' });
    return;
  }
  res.json(content);
});

contentRouter.get('/:id/episodes', async (req, res) => {
  const { id } = req.params;
  const where = isUuid(id)
    ? { id, type: 'series' as const }
    : { slug: id, type: 'series' as const };
  const content = await prisma.content.findFirst({
    where,
    include: { episodes: { orderBy: [...episodeOrderBy] } },
  });
  if (!content) {
    res.status(404).json({ error: 'Series not found' });
    return;
  }
  res.json(content.episodes);
});
