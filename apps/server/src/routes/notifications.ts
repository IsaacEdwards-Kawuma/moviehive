import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';

export const notificationsRouter = Router();
notificationsRouter.use(requireAuth);

// List notifications
notificationsRouter.get('/', async (req, res) => {
  const userId = (req as unknown as { userId: string }).userId;
  const { unreadOnly, limit = '30' } = req.query;
  const where: { userId: string; read?: boolean } = { userId };
  if (unreadOnly === 'true') where.read = false;
  const notifications = await prisma.notification.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: Math.min(50, parseInt(String(limit), 10)),
  });
  res.json(notifications);
});

// Unread count
notificationsRouter.get('/unread-count', async (req, res) => {
  const userId = (req as unknown as { userId: string }).userId;
  const count = await prisma.notification.count({
    where: { userId, read: false },
  });
  res.json({ count });
});

// Mark one as read
notificationsRouter.patch('/:id/read', async (req, res) => {
  const userId = (req as unknown as { userId: string }).userId;
  const { id } = req.params;
  await prisma.notification.updateMany({
    where: { id, userId },
    data: { read: true },
  });
  res.json({ message: 'Marked as read' });
});

// Mark all as read
notificationsRouter.patch('/read-all', async (req, res) => {
  const userId = (req as unknown as { userId: string }).userId;
  await prisma.notification.updateMany({
    where: { userId },
    data: { read: true },
  });
  res.json({ message: 'All marked as read' });
});
