import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/admin.js';

const router = Router();

/** Send a notification to every user in the system (fire-and-forget). */
async function notifyAllUsers(notification: {
  type: string;
  title: string;
  body: string;
  link?: string;
}) {
  const users = await prisma.user.findMany({ select: { id: true } });
  if (users.length === 0) return;
  await prisma.notification.createMany({
    data: users.map((u) => ({
      userId: u.id,
      type: notification.type,
      title: notification.title,
      body: notification.body,
      link: notification.link ?? null,
    })),
  });
}

const contentCreateSchema = z.object({
  type: z.enum(['movie', 'series']),
  title: z.string().min(1).max(255),
  description: z.string().optional().nullable(),
  releaseYear: z.number().int().min(1900).max(2100).optional().nullable(),
  duration: z.number().int().min(0).optional().nullable(),
  rating: z.string().max(20).optional().nullable(),
  thumbnailUrl: z.string().optional().nullable(),
  posterUrl: z.string().optional().nullable(),
  trailerUrl: z.string().optional().nullable(),
  videoUrl: z.string().optional().nullable(),
  featured: z.boolean().optional(),
  genreIds: z.array(z.string().uuid()).optional(),
  languages: z.array(z.string()).optional(),
  regions: z.array(z.string()).optional(),
});

const contentUpdateSchema = contentCreateSchema.partial();

const episodeSchema = z.object({
  season: z.number().int().min(1),
  episode: z.number().int().min(1),
  title: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  duration: z.number().int().min(0).optional().nullable(),
  videoUrl: z.string().optional().nullable(),
  thumbnailUrl: z.string().optional().nullable(),
});

// Get all users (admin only)
router.get('/users', requireAuth, requireAdmin, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        role: true,
        subscriptionTier: true,
        createdAt: true,
        _count: {
          select: {
            profiles: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(users);
  } catch (error) {
    console.error('Failed to fetch users:', error);
    res.status(500).json({ message: 'Failed to fetch users' });
  }
});

// Get stats (admin only)
router.get('/stats', requireAuth, requireAdmin, async (req, res) => {
  try {
    const [totalUsers, totalContent, totalWatchHistory, totalProfiles] = await Promise.all([
      prisma.user.count(),
      prisma.content.count(),
      prisma.watchHistory.count(),
      prisma.profile.count(),
    ]);
    
    res.json({
      totalUsers,
      totalContent,
      totalWatchHistory,
      totalProfiles,
    });
  } catch (error) {
    console.error('Failed to fetch stats:', error);
    res.status(500).json({ message: 'Failed to fetch stats' });
  }
});

// Update user role (admin only)
router.patch('/users/:id/role', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    if (!['USER', 'ADMIN'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }
    const user = await prisma.user.update({
      where: { id },
      data: { role },
      select: { id: true, email: true, role: true }
    });
    res.json(user);
  } catch (error) {
    console.error('Failed to update role:', error);
    res.status(500).json({ message: 'Failed to update role' });
  }
});

// ---------- Content management (admin only) ----------

router.get('/content', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { type, page = '1', limit = '20' } = req.query;
    const pageNum = Math.max(1, parseInt(String(page), 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(String(limit), 10)));
    const skip = (pageNum - 1) * limitNum;
    const where = type ? { type: String(type) } : {};
    const [data, total] = await Promise.all([
      prisma.content.findMany({
        where,
        include: {
          contentGenres: { include: { genre: true } },
          _count: { select: { episodes: true, watchHistory: true, myListItems: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
      }),
      prisma.content.count({ where }),
    ]);
    res.json({ data, total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) });
  } catch (error) {
    console.error('Failed to fetch content:', error);
    res.status(500).json({ message: 'Failed to fetch content' });
  }
});

router.post('/content', requireAuth, requireAdmin, async (req, res) => {
  try {
    const parsed = contentCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: 'Invalid input', details: parsed.error.flatten() });
    }
    const { genreIds, ...rest } = parsed.data;
    const content = await prisma.content.create({
      data: {
        ...rest,
        featured: rest.featured ?? false,
        languages: rest.languages ?? [],
        regions: rest.regions ?? [],
        ...(genreIds?.length
          ? { contentGenres: { create: genreIds.map((genreId) => ({ genreId })) } }
          : {}),
      },
      include: {
        contentGenres: { include: { genre: true } },
        episodes: true,
      },
    });

    // Broadcast notification to all users
    notifyAllUsers({
      type: 'new_release',
      title: `New ${rest.type === 'series' ? 'series' : 'movie'}: ${rest.title}`,
      body: rest.description?.slice(0, 160) ?? `A new ${rest.type} has been added to Movie Hive.`,
      link: `/title/${content.id}`,
    }).catch((err) => console.error('Failed to send notifications:', err));

    res.status(201).json(content);
  } catch (error) {
    console.error('Failed to create content:', error);
    res.status(500).json({ message: 'Failed to create content' });
  }
});

router.get('/content/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const content = await prisma.content.findUnique({
      where: { id },
      include: {
        contentGenres: { include: { genre: true } },
        episodes: { orderBy: [{ season: 'asc' }, { episode: 'asc' }] },
        _count: { select: { watchHistory: true, myListItems: true } },
      },
    });
    if (!content) return res.status(404).json({ message: 'Content not found' });
    res.json(content);
  } catch (error) {
    console.error('Failed to fetch content:', error);
    res.status(500).json({ message: 'Failed to fetch content' });
  }
});

router.put('/content/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const parsed = contentUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: 'Invalid input', details: parsed.error.flatten() });
    }
    const { genreIds, ...rest } = parsed.data;
    if (genreIds !== undefined) {
      await prisma.contentGenre.deleteMany({ where: { contentId: id } });
      if (genreIds.length > 0) {
        await prisma.contentGenre.createMany({
          data: genreIds.map((genreId) => ({ contentId: id, genreId })),
        });
      }
    }
    const content = await prisma.content.update({
      where: { id },
      data: rest,
      include: {
        contentGenres: { include: { genre: true } },
        episodes: true,
      },
    });
    res.json(content);
  } catch (error) {
    console.error('Failed to update content:', error);
    res.status(500).json({ message: 'Failed to update content' });
  }
});

router.delete('/content/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.content.delete({ where: { id } });
    res.status(204).send();
  } catch (error) {
    console.error('Failed to delete content:', error);
    res.status(500).json({ message: 'Failed to delete content' });
  }
});

const bulkDeleteSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(100),
});

router.post('/content/bulk-delete', requireAuth, requireAdmin, async (req, res) => {
  try {
    const parsed = bulkDeleteSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: 'Invalid input', details: parsed.error.flatten() });
    }
    const { ids } = parsed.data;
    const result = await prisma.content.deleteMany({ where: { id: { in: ids } } });
    res.json({ deleted: result.count });
  } catch (error) {
    console.error('Failed to bulk delete content:', error);
    res.status(500).json({ message: 'Failed to bulk delete content' });
  }
});

router.post('/content/:id/episodes', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id: seriesId } = req.params;
    const parsed = episodeSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: 'Invalid input', details: parsed.error.flatten() });
    }
    const series = await prisma.content.findUnique({ where: { id: seriesId, type: 'series' } });
    if (!series) return res.status(404).json({ message: 'Series not found' });
    const episode = await prisma.episode.create({
      data: { seriesId, ...parsed.data },
    });

    // Notify all users about the new episode
    notifyAllUsers({
      type: 'new_episode',
      title: `New episode: ${series.title} S${parsed.data.season} E${parsed.data.episode}`,
      body: parsed.data.title
        ? `"${parsed.data.title}" is now available.`
        : `Season ${parsed.data.season}, Episode ${parsed.data.episode} is now available.`,
      link: `/watch/${seriesId}?episode=${episode.id}`,
    }).catch((err) => console.error('Failed to send episode notifications:', err));

    res.status(201).json(episode);
  } catch (error) {
    console.error('Failed to create episode:', error);
    res.status(500).json({ message: 'Failed to create episode' });
  }
});

router.put('/episodes/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const parsed = episodeSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: 'Invalid input' });
    }
    const episode = await prisma.episode.update({
      where: { id },
      data: parsed.data,
    });
    res.json(episode);
  } catch (error) {
    console.error('Failed to update episode:', error);
    res.status(500).json({ message: 'Failed to update episode' });
  }
});

router.delete('/episodes/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.episode.delete({ where: { id } });
    res.status(204).send();
  } catch (error) {
    console.error('Failed to delete episode:', error);
    res.status(500).json({ message: 'Failed to delete episode' });
  }
});

router.get('/genres', requireAuth, requireAdmin, async (_req, res) => {
  try {
    const genres = await prisma.genre.findMany({ orderBy: { name: 'asc' } });
    res.json(genres);
  } catch (error) {
    console.error('Failed to fetch genres:', error);
    res.status(500).json({ message: 'Failed to fetch genres' });
  }
});

/** Ensure default genres exist (for production when seed wasn't run). Idempotent. */
const DEFAULT_GENRES = [
  'Action', 'Adventure', 'Animation', 'Comedy', 'Crime', 'Documentary',
  'Drama', 'Family', 'Fantasy', 'Horror', 'Mystery', 'Romance', 'Sci-Fi', 'Thriller',
];

router.post('/genres/ensure-defaults', requireAuth, requireAdmin, async (_req, res) => {
  try {
    for (const name of DEFAULT_GENRES) {
      const slug = name.toLowerCase().replace(/\s+/g, '-');
      const existing = await prisma.genre.findUnique({ where: { slug } });
      if (!existing) {
        await prisma.genre.create({ data: { name, slug } });
      }
    }
    const genres = await prisma.genre.findMany({ orderBy: { name: 'asc' } });
    res.json(genres);
  } catch (error) {
    console.error('Failed to ensure default genres:', error);
    res.status(500).json({ message: 'Failed to ensure default genres' });
  }
});

// ---------- Analytics / monitoring (admin only) ----------

router.get('/analytics', requireAuth, requireAdmin, async (_req, res) => {
  try {
    const [
      totalUsers,
      totalContent,
      totalWatchHistory,
      totalProfiles,
      contentByType,
      recentContent,
      recentWatchActivity,
      topContentByWatches,
      recentSearches,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.content.count(),
      prisma.watchHistory.count(),
      prisma.profile.count(),
      prisma.content.groupBy({ by: ['type'], _count: { id: true } }),
      prisma.content.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: { id: true, title: true, type: true, createdAt: true, thumbnailUrl: true },
      }),
      prisma.watchHistory.findMany({
        take: 15,
        orderBy: { watchedAt: 'desc' },
        include: {
          content: { select: { id: true, title: true, type: true } },
          profile: { select: { id: true, name: true } },
        },
      }),
      prisma.content.findMany({
        take: 50,
        include: { _count: { select: { watchHistory: true } } },
      }).then((list) => list.sort((a, b) => b._count.watchHistory - a._count.watchHistory).slice(0, 10)),
      prisma.searchHistory.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        distinct: ['query'],
      }),
    ]);

    res.json({
      overview: {
        totalUsers,
        totalContent,
        totalWatchHistory,
        totalProfiles,
      },
      contentByType: contentByType.reduce((acc, row) => ({ ...acc, [row.type]: row._count.id }), {} as Record<string, number>),
      recentContent,
      recentWatchActivity,
      topContentByWatches: topContentByWatches.map((c) => ({ id: c.id, title: c.title, type: c.type, watchCount: c._count.watchHistory })),
      recentSearches: recentSearches.map((s) => s.query),
    });
  } catch (error) {
    console.error('Failed to fetch analytics:', error);
    res.status(500).json({ message: 'Failed to fetch analytics' });
  }
});

export { router as adminRouter };