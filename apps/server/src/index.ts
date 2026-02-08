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
    return cb(null, false);
  },
  credentials: true,
}));
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));

// Serve uploaded files
app.use('/uploads', express.static(UPLOAD_DIR, {
  maxAge: '7d',
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.mp4') || filePath.endsWith('.webm') || filePath.endsWith('.mkv')) {
      res.setHeader('Accept-Ranges', 'bytes');
    }
  },
}));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { error: 'Too many requests' },
});
app.use('/api/', limiter);

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

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
