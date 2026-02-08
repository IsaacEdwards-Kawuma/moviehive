import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { prisma } from '../lib/prisma.js';

export const paymentsRouter = Router();

paymentsRouter.get('/subscription/status', requireAuth, async (req, res) => {
  const userId = (req as unknown as { userId: string }).userId;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { subscriptionTier: true },
  });
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  res.json({
    tier: user.subscriptionTier,
    status: user.subscriptionTier === 'free' ? 'active' : 'active',
  });
});

paymentsRouter.post('/subscribe', requireAuth, async (req, res) => {
  const userId = (req as unknown as { userId: string }).userId;
  const { tier } = req.body;
  const allowed = ['basic', 'standard', 'premium'];
  if (!tier || !allowed.includes(tier)) {
    res.status(400).json({ error: 'Invalid tier' });
    return;
  }
  await prisma.user.update({
    where: { id: userId },
    data: { subscriptionTier: tier },
  });
  res.json({ message: 'Subscription updated', tier });
});

paymentsRouter.post('/webhook', (req, res) => {
  const sig = req.headers['stripe-signature'];
  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    res.status(400).json({ error: 'Webhook not configured' });
    return;
  }
  res.json({ received: true });
});
