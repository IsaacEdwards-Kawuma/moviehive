import { Router, type Request } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';

export const streamRouter = Router();

/** Resolve a stored videoUrl to a full URL the client can play. */
function resolveVideoUrl(videoUrl: string, req: Request): string {
  const cdnUrl = process.env.CDN_URL;
  // If it's already a full URL, return as-is
  if (videoUrl.startsWith('http://') || videoUrl.startsWith('https://')) {
    return videoUrl;
  }
  // Local upload (e.g. /uploads/videos/xxx.mp4) — return absolute URL via the server
  if (videoUrl.startsWith('/uploads/')) {
    const protocol = req.headers['x-forwarded-proto'] ?? 'http';
    const host = req.headers['x-forwarded-host'] ?? req.headers.host ?? 'localhost:4000';
    return `${protocol}://${host}${videoUrl}`;
  }
  // CDN prefix
  if (cdnUrl) return `${cdnUrl}/${videoUrl}`;
  return videoUrl;
}

streamRouter.get('/:contentId/url', requireAuth, async (req, res) => {
  const userId = (req as unknown as { userId: string }).userId;
  const { contentId } = req.params;
  const { episodeId } = req.query;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { subscriptionTier: true },
  });
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const content = await prisma.content.findUnique({
    where: { id: contentId },
    include: { episodes: { orderBy: [{ season: 'asc' }, { episode: 'asc' }] } },
  });
  if (!content) {
    res.status(404).json({ error: 'Content not found' });
    return;
  }

  let videoUrl: string | null = null;

  if (content.type === 'movie') {
    videoUrl = content.videoUrl;
  } else if (content.type === 'series' && episodeId && typeof episodeId === 'string') {
    const episode = content.episodes.find((e) => e.id === episodeId) ?? content.episodes[0];
    videoUrl = episode?.videoUrl ?? null;
  } else if (content.type === 'series' && content.episodes.length > 0) {
    videoUrl = content.episodes[0].videoUrl;
  }

  if (!videoUrl) {
    res.status(404).json({ error: 'Video not available' });
    return;
  }

  const finalUrl = resolveVideoUrl(videoUrl, req);
  res.json({ url: finalUrl, type: content.type });
});

streamRouter.get('/episode/:episodeId/url', requireAuth, async (req, res) => {
  const { episodeId } = req.params;
  const episode = await prisma.episode.findUnique({
    where: { id: episodeId },
  });
  if (!episode?.videoUrl) {
    res.status(404).json({ error: 'Episode not found' });
    return;
  }
  const finalUrl = resolveVideoUrl(episode.videoUrl, req);
  res.json({ url: finalUrl });
});
