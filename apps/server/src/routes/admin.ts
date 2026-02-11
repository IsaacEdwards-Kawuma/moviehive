import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import OpenAI from 'openai';
import { createWorker } from 'tesseract.js';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/admin.js';

type ExtractResult = {
  title: string | null;
  description: string | null;
  releaseYear: number | null;
  rating: string | null;
  duration: number | null;
  type: 'movie' | 'series';
};

/** Free OCR-based extraction: parse text from image and guess title, year, rating, duration. */
async function extractFromImageOCR(buffer: Buffer): Promise<ExtractResult> {
  const worker = await createWorker('eng');
  try {
    const { data } = await worker.recognize(buffer);
    const text = (data.text || '').trim();
    await worker.terminate();

    const result: ExtractResult = {
      title: null,
      description: null,
      releaseYear: null,
      rating: null,
      duration: null,
      type: 'movie',
    };

    if (!text) return result;

    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

    // Year: 1900–2100
    const yearMatch = text.match(/\b(19\d{2}|20[0-2]\d)\b/);
    if (yearMatch) result.releaseYear = parseInt(yearMatch[1], 10);

    // Rating: common US labels
    const ratingRegex = /\b(G|PG|PG-13|R|NC-17|TV-Y|TV-Y7|TV-G|TV-PG|TV-14|TV-MA)\b/i;
    const ratingMatch = text.match(ratingRegex);
    if (ratingMatch) result.rating = ratingMatch[1];

    // Duration: "120 min", "1h 30m", "90 min", "2h 15m"
    const minMatch = text.match(/(\d+)\s*min(?:ute)?s?/i) || text.match(/(\d+)\s*h(?:our)?s?\s*(\d+)\s*m/i);
    if (minMatch) {
      if (minMatch[2] !== undefined) {
        result.duration = parseInt(minMatch[1], 10) * 60 + parseInt(minMatch[2], 10);
      } else {
        result.duration = parseInt(minMatch[1], 10);
      }
    }

    // Title: first line that looks like a title (not only digits, not too short, not a rating line)
    for (const line of lines) {
      const clean = line.replace(/\s+/g, ' ').trim();
      if (clean.length < 2 || clean.length > 200) continue;
      if (/^\d+$/.test(clean) || ratingRegex.test(clean)) continue;
      if (/^\d+\s*min/i.test(clean)) continue;
      result.title = clean;
      break;
    }

    return result;
  } finally {
    try {
      await worker.terminate();
    } catch {
      /* ignore */
    }
  }
}

const router = Router();

const uploadImageMemory = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, WebP, GIF images are allowed'));
    }
  },
});

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

/** Notify only users who have the given content (e.g. series) in their My List. */
async function notifyMyListUsers(contentId: string, notification: {
  type: string;
  title: string;
  body: string;
  link?: string;
}) {
  const listItems = await prisma.myListItem.findMany({
    where: { contentId },
    include: { profile: { select: { userId: true } } },
  });
  const userIds = [...new Set(listItems.map((i) => i.profile.userId))];
  if (userIds.length === 0) return;
  await prisma.notification.createMany({
    data: userIds.map((userId) => ({
      userId,
      type: notification.type,
      title: notification.title,
      body: notification.body,
      link: notification.link ?? null,
    })),
  });
}

function slugFromTitle(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'content';
}

async function ensureUniqueSlug(baseSlug: string, excludeContentId?: string): Promise<string> {
  let slug = baseSlug;
  let n = 0;
  for (;;) {
    const existing = await prisma.content.findFirst({
      where: {
        slug,
        ...(excludeContentId ? { id: { not: excludeContentId } } : {}),
      },
    });
    if (!existing) return slug;
    n += 1;
    slug = `${baseSlug}-${n}`;
  }
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
  slug: z.string().max(255).optional().nullable(),
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
        disabled: true,
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

// Disable/enable user and optionally logout everywhere (admin only)
router.patch('/users/:id/status', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { disabled, logoutSessions } = req.body as { disabled?: boolean; logoutSessions?: boolean };
    if (typeof disabled !== 'boolean') {
      return res.status(400).json({ message: 'disabled flag is required' });
    }
    const user = await prisma.user.update({
      where: { id },
      data: { disabled },
      select: { id: true, email: true, disabled: true, role: true },
    });
    if (logoutSessions) {
      await prisma.session.deleteMany({ where: { userId: id } });
    }
    res.json(user);
  } catch (error) {
    console.error('Failed to update user status:', error);
    res.status(500).json({ message: 'Failed to update user status' });
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
    const { genreIds, slug: slugInput, ...rest } = parsed.data;
    const baseSlug = slugInput && slugInput.trim() ? slugFromTitle(slugInput) : slugFromTitle(rest.title);
    const slug = await ensureUniqueSlug(baseSlug);
    const content = await prisma.content.create({
      data: {
        ...rest,
        slug,
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
    const titleLink = content.slug ? `/title/${content.slug}` : `/title/${content.id}`;
    notifyAllUsers({
      type: 'new_release',
      title: `New ${rest.type === 'series' ? 'series' : 'movie'}: ${rest.title}`,
      body: rest.description?.slice(0, 160) ?? `A new ${rest.type} has been added to Movie Hive.`,
      link: titleLink,
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
    const { genreIds, slug: slugInput, title, ...rest } = parsed.data;
    let slugUpdate: { slug?: string } = {};
    if (slugInput !== undefined || title !== undefined) {
      const baseSlug = slugInput && String(slugInput).trim()
        ? slugFromTitle(String(slugInput))
        : title
          ? slugFromTitle(title)
          : null;
      if (baseSlug) {
        slugUpdate.slug = await ensureUniqueSlug(baseSlug, id);
      }
    }
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
      data: { ...rest, ...slugUpdate },
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

    const episodeTitle = parsed.data.title
      ? `"${parsed.data.title}"`
      : `S${parsed.data.season} E${parsed.data.episode}`;
    const watchLink = `/watch/${seriesId}?episode=${episode.id}`;

    // Notify users who have this series in My List ("New in your list")
    notifyMyListUsers(seriesId, {
      type: 'my_list',
      title: `New in your list: ${series.title} · ${episodeTitle}`,
      body: `A new episode is available.`,
      link: watchLink,
    }).catch((err) => console.error('Failed to send my-list notifications:', err));

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

// ---------- Extract content metadata from image (vision AI) ----------

const EXTRACT_PROMPT = `Look at this image. It may be a movie poster, a screenshot from a streaming app, a DVD cover, or a page showing movie/series info.
Extract any visible metadata and return a single JSON object with only these keys (use null for missing values):
- title (string): movie or series title
- description (string or null): short plot/synopsis if visible
- releaseYear (number or null): year of release
- rating (string or null): content rating if visible (e.g. "PG-13", "R", "TV-MA")
- duration (number or null): runtime in minutes if visible
- type (string): "movie" or "series" (guess from context if unclear)
Return only the JSON object, no other text.`;

router.post(
  '/extract-from-image',
  requireAuth,
  requireAdmin,
  uploadImageMemory.single('image'),
  async (req, res) => {
    if (!req.file) {
      res.status(400).json({ error: 'No image file provided. Use form field name "image".' });
      return;
    }
    const apiKey = process.env.OPENAI_API_KEY;
    try {
      if (apiKey) {
        const base64 = req.file.buffer.toString('base64');
        const mime = req.file.mimetype || 'image/jpeg';
        const dataUrl = `data:${mime};base64,${base64}`;
        const openai = new OpenAI({ apiKey });
        const completion = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'user', content: [{ type: 'text', text: EXTRACT_PROMPT }, { type: 'image_url', image_url: { url: dataUrl } }] },
          ],
          max_tokens: 500,
        });
        const raw = completion.choices[0]?.message?.content?.trim();
        if (!raw) {
          res.status(502).json({ error: 'No response from vision service' });
          return;
        }
        const json = raw.replace(/^```json?\s*|\s*```$/g, '').trim();
        const parsed = JSON.parse(json) as {
          title?: string | null;
          description?: string | null;
          releaseYear?: number | null;
          rating?: string | null;
          duration?: number | null;
          type?: string | null;
        };
        const result: ExtractResult = {
          title: typeof parsed.title === 'string' ? parsed.title : null,
          description: typeof parsed.description === 'string' ? parsed.description : null,
          releaseYear: typeof parsed.releaseYear === 'number' ? parsed.releaseYear : null,
          rating: typeof parsed.rating === 'string' ? parsed.rating : null,
          duration: typeof parsed.duration === 'number' ? parsed.duration : null,
          type: parsed.type === 'series' ? 'series' : 'movie',
        };
        res.json(result);
      } else {
        const result = await extractFromImageOCR(req.file.buffer);
        res.json(result);
      }
    } catch (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          res.status(413).json({ error: 'Image too large (max 10 MB)' });
          return;
        }
        res.status(400).json({ error: err.message });
        return;
      }
      if (err instanceof SyntaxError) {
        console.error('Extract-from-image: invalid JSON from model', err);
        res.status(502).json({ error: 'Could not parse metadata from image' });
        return;
      }
      console.error('Extract-from-image error:', err);
      res.status(500).json({ error: err instanceof Error ? err.message : 'Image extraction failed' });
    }
  }
);

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
      watchLast7Days,
      topWatchTimeRaw,
      genres,
      userSignupsLast30,
      kidsWatchAgg,
      regularWatchAgg,
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
      prisma.watchHistory.findMany({
        where: {
          watchedAt: {
            gte: (() => {
              const d = new Date();
              d.setDate(d.getDate() - 6); // last 7 days including today
              d.setHours(0, 0, 0, 0);
              return d;
            })(),
          },
        },
        select: { watchedAt: true },
        orderBy: { watchedAt: 'asc' },
      }),
      prisma.watchHistory.groupBy({
        by: ['contentId'],
        _sum: { progress: true },
        _count: { _all: true },
        orderBy: { _sum: { progress: 'desc' } },
        take: 10,
      }),
      prisma.genre.findMany({
        orderBy: { name: 'asc' },
      }),
      prisma.user.findMany({
        where: {
          createdAt: {
            gte: (() => {
              const d = new Date();
              d.setDate(d.getDate() - 29); // last 30 days including today
              d.setHours(0, 0, 0, 0);
              return d;
            })(),
          },
        },
        select: { createdAt: true },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.watchHistory.aggregate({
        where: { profile: { isKids: true } },
        _sum: { progress: true },
      }),
      prisma.watchHistory.aggregate({
        where: { profile: { isKids: false } },
        _sum: { progress: true },
      }),
    ]);

    // Watch events per day (last 7 days)
    const dailyMap = new Map<string, number>();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = 6; i >= 0; i -= 1) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      dailyMap.set(key, 0);
    }
    for (const row of watchLast7Days) {
      const key = row.watchedAt.toISOString().slice(0, 10);
      if (dailyMap.has(key)) {
        dailyMap.set(key, (dailyMap.get(key) ?? 0) + 1);
      }
    }
    const watchByDay = Array.from(dailyMap.entries()).map(([date, count]) => ({ date, count }));

    // Top content by total watch time (sum of progress seconds)
    const contentIds = topWatchTimeRaw.map((r) => r.contentId);
    const watchTimeContents = contentIds.length
      ? await prisma.content.findMany({
          where: { id: { in: contentIds } },
          select: { id: true, title: true, type: true },
        })
      : [];
    const contentMap = new Map(watchTimeContents.map((c) => [c.id, c]));
    const topContentByWatchTime = topWatchTimeRaw.map((row) => {
      const c = contentMap.get(row.contentId);
      return {
        id: row.contentId,
        title: c?.title ?? 'Unknown',
        type: c?.type ?? 'movie',
        totalSeconds: row._sum.progress ?? 0,
        watchCount: row._count._all,
      };
    });

    // Top genres by watch count
    const genreWatchCounts = await Promise.all(
      genres.map(async (g) => {
        const count = await prisma.watchHistory.count({
          where: {
            content: {
              contentGenres: {
                some: { genreId: g.id },
              },
            },
          },
        });
        return { genre: g, count };
      })
    );
    const topGenresByWatchCount = genreWatchCounts
      .filter((g) => g.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
      .map(({ genre, count }) => ({
        id: genre.id,
        name: genre.name,
        slug: genre.slug,
        watchCount: count,
      }));

    // User signups per day (last 30 days)
    const signupDailyMap = new Map<string, number>();
    const today30 = new Date();
    today30.setHours(0, 0, 0, 0);
    for (let i = 29; i >= 0; i -= 1) {
      const d = new Date(today30);
      d.setDate(today30.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      signupDailyMap.set(key, 0);
    }
    for (const u of userSignupsLast30) {
      const key = u.createdAt.toISOString().slice(0, 10);
      if (signupDailyMap.has(key)) {
        signupDailyMap.set(key, (signupDailyMap.get(key) ?? 0) + 1);
      }
    }
    const signupsByDay = Array.from(signupDailyMap.entries()).map(([date, count]) => ({ date, count }));

    const kidsWatchSeconds = kidsWatchAgg._sum.progress ?? 0;
    const regularWatchSeconds = regularWatchAgg._sum.progress ?? 0;

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
      watchByDay,
      topContentByWatchTime,
      topGenresByWatchCount,
      signupsByDay,
      kidsVsRegularWatchSeconds: {
        kids: kidsWatchSeconds,
        regular: regularWatchSeconds,
      },
    });
  } catch (error) {
    console.error('Failed to fetch analytics:', error);
    res.status(500).json({ message: 'Failed to fetch analytics' });
  }
});

// ---------- Health summary (admin only) ----------

router.get('/health-summary', requireAuth, requireAdmin, async (_req, res) => {
  try {
    const uptimeSeconds = Math.floor(process.uptime());
    const startedAt = new Date(Date.now() - uptimeSeconds * 1000).toISOString();
    let dbStatus: 'ok' | 'error' = 'ok';
    let dbError: string | null = null;
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch (e) {
      dbStatus = 'error';
      dbError = e instanceof Error ? e.message : 'Unknown DB error';
    }
    res.json({
      app: {
        status: 'ok',
        uptimeSeconds,
        startedAt,
      },
      db: {
        status: dbStatus,
        error: dbError,
      },
    });
  } catch (error) {
    console.error('Failed to fetch health summary:', error);
    res.status(500).json({ message: 'Failed to fetch health summary' });
  }
});

export { router as adminRouter };