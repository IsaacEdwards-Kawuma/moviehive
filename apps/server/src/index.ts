import 'dotenv/config';
import express from 'express';
import path from 'path';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { authRouter } from './routes/auth.js';
import { googleAuthRouter } from './routes/google-auth.js';
import { profilesRouter } from './routes/profiles.js';
import { contentRouter } from './routes/content.js';
import { watchHistoryRouter } from './routes/watch-history.js';
import { myListRouter } from './routes/my-list.js';
import { searchRouter } from './routes/search.js';
import { recommendationsRouter } from './routes/recommendations.js';
import { streamRouter } from './routes/stream.js';
import { paymentsRouter } from './routes/payments.js';
import { notificationsRouter } from './routes/notifications.js';
import { ratingsRouter } from './routes/ratings.js';
import { adminRouter } from './routes/admin.js';
import { uploadRouter } from './routes/upload.js';

const app = express();
const PORT = process.env.PORT ?? 4000;
const UPLOAD_DIR = process.env.UPLOAD_DIR ?? path.join(process.cwd(), 'uploads');

app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: false }));

const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim()).filter(Boolean)
  : ['http://localhost:3000'];

app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    if (allowedOrigins.includes(origin)) return cb(null, true);
    if (origin.endsWith('.vercel.app')) return cb(null, true);
    if (origin.endsWith('.onrender.com')) return cb(null, true);
    return cb(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));

// MIME types for video so browsers can play them (MP4/WebM are widely supported)
const VIDEO_MIME: Record<string, string> = {
  '.mp4': 'video/mp4',
  '.m4v': 'video/mp4',
  '.webm': 'video/webm',
  '.mkv': 'video/x-matroska',
  '.mov': 'video/quicktime',
  '.avi': 'video/x-msvideo',
};

// Serve uploaded files with correct headers for streaming
app.use('/uploads', express.static(UPLOAD_DIR, {
  maxAge: '7d',
  setHeaders: (res, filePath) => {
    const ext = path.extname(filePath).toLowerCase();
    const mime = VIDEO_MIME[ext];
    if (mime) {
      res.setHeader('Content-Type', mime);
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Access-Control-Allow-Origin', '*'); // allow video to be played from any frontend origin
    }
  },
}));

// Rate limit per IP per 15 min. Set RATE_LIMIT_MAX (e.g. 2000–3000) for many users; higher = more headroom but less protection against abuse.
const rateLimitWindowMs = 15 * 60 * 1000; // 15 min
const rateLimitMax = Math.max(200, parseInt(process.env.RATE_LIMIT_MAX ?? '500', 10) || 500);
const limiter = rateLimit({
  windowMs: rateLimitWindowMs,
  max: rateLimitMax,
  message: { error: 'Too many requests. Please try again in a few minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Stricter limit for auth (login/register) to reduce brute-force risk
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { error: 'Too many login attempts. Try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// Stricter limit for stream proxy (per-IP streaming abuse)
const streamProxyLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 min
  max: 120,
  message: { error: 'Too many stream requests. Slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/stream', streamProxyLimiter);

app.use('/api/auth', authRouter);
app.use('/api/auth', googleAuthRouter);
app.use('/api/profiles', profilesRouter);
app.use('/api/content', contentRouter);
app.use('/api/watch-history', watchHistoryRouter);
app.use('/api/my-list', myListRouter);
app.use('/api/search', searchRouter);
app.use('/api/recommendations', recommendationsRouter);
app.use('/api/stream', streamRouter);
app.use('/api/payments', paymentsRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/ratings', ratingsRouter);
app.use('/api/admin', adminRouter);
app.use('/api/upload', uploadRouter);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use((err: Error, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  const origin = req.get('origin');
  if (origin && (allowedOrigins.includes(origin) || origin.endsWith('.vercel.app') || origin.endsWith('.onrender.com'))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
