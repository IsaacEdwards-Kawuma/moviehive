import { Router, type Request } from 'express';
import { prisma } from '../lib/prisma.js';
import { signStreamProxyToken, verifyStreamProxyToken } from '../lib/auth.js';
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
    const protocol = req.get('x-forwarded-proto') ?? 'http';
    const host = req.get('x-forwarded-host') ?? req.get('host') ?? 'localhost:4000';
    return `${protocol}://${host}${videoUrl}`;
  }
  // CDN prefix
  if (cdnUrl) return `${cdnUrl}/${videoUrl}`;
  return videoUrl;
}

/** Base URL of this API (for proxy links). */
function getApiBaseUrl(req: Request): string {
  const protocol = req.get('x-forwarded-proto') ?? 'http';
  const host = req.get('x-forwarded-host') ?? req.get('host') ?? 'localhost:4000';
  return `${protocol}://${host}`;
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
  const baseUrl = getApiBaseUrl(req);
  const token = signStreamProxyToken({
    contentId,
    episodeId: typeof episodeId === 'string' ? episodeId : undefined,
    userId,
  });
  const proxyPath = `/api/stream/${contentId}/proxy?t=${encodeURIComponent(token)}`;
  const proxyUrl = `${baseUrl}${proxyPath}`;
  // Support both: (1) External URL (Bunny, ImageKit, Cloudinary) -> use proxy on web to avoid CORS. (2) Server path (/uploads/...) -> use direct url (works locally; on production server storage is ephemeral).
  const isExternal = finalUrl.startsWith('http://') || finalUrl.startsWith('https://');
  const isOwnHost = finalUrl.startsWith(baseUrl) || (req.get('host') && finalUrl.includes(req.get('host') ?? ''));
  res.json({
    url: finalUrl,
    proxyUrl: isExternal && !isOwnHost ? proxyUrl : undefined,
    type: content.type,
  });
});

/** Proxy stream: fetch video from the stored URL and pipe to the client. Avoids CORS issues on web. Token in query. */
streamRouter.get('/:contentId/proxy', async (req, res) => {
  const token = typeof req.query.t === 'string' ? req.query.t : null;
  const payload = token ? verifyStreamProxyToken(token) : null;
  if (!payload || payload.contentId !== req.params.contentId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const { contentId } = req.params;
  const episodeId = payload.episodeId ?? null;

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

  // Block image URLs — they cause OpaqueResponseBlocking and aren't playable as video
  const lower = finalUrl.toLowerCase();
  if (
    lower.includes('.jpg') ||
    lower.includes('.jpeg') ||
    lower.includes('.png') ||
    lower.includes('.webp') ||
    lower.includes('.gif')
  ) {
    res.status(400).json({
      error: 'Video URL points to an image. Use a direct video link (MP4 or WebM) in Admin.',
    });
    return;
  }

  const range = req.headers.range;
  const rangeVal = Array.isArray(range) ? range[0] : range;
  const upstreamHeaders: Record<string, string> = {
    'User-Agent': (req.headers['user-agent'] as string) || 'MovieHive-Proxy/1.0',
  };
  if (rangeVal) upstreamHeaders['Range'] = rangeVal;
  // Some CDNs (e.g. Bunny) allow server requests when Referer matches; avoid 403
  try {
    const u = new URL(finalUrl);
    upstreamHeaders['Referer'] = u.origin + '/';
  } catch {
    /* ignore */
  }

  try {
    const resp = await fetch(finalUrl, { headers: upstreamHeaders });
    if (!resp.ok) {
      if (resp.status === 403) {
        res.status(502).json({
          error: 'Video source denied access (403). Check CDN settings: allow direct linking or add your domain to referrers.',
        });
        return;
      }
      res.status(resp.status >= 500 ? 502 : resp.status).json({ error: 'Video source unavailable' });
      return;
    }
    const contentType = resp.headers.get('content-type') || 'video/mp4';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Accept-Ranges', 'bytes');
    if (resp.headers.get('content-length')) {
      res.setHeader('Content-Length', resp.headers.get('content-length')!);
    }
    const contentRange = resp.headers.get('content-range');
    if (contentRange) res.setHeader('Content-Range', contentRange);
    res.status(resp.status);
    const body = resp.body;
    if (body) {
      const reader = body.getReader();
      const pump = async () => {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              res.end();
              return;
            }
            res.write(Buffer.from(value));
          }
        } catch (e) {
          if (!res.writableEnded) res.end();
        }
      };
      pump();
    } else {
      const buf = await resp.arrayBuffer();
      res.end(Buffer.from(buf));
    }
  } catch (err) {
    console.error('Stream proxy error:', err);
    res.status(502).json({ error: 'Could not load video' });
  }
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
