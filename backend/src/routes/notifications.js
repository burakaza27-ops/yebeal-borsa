/* ============================================
   Notification Routes — Retrieve and Mark Read
   ============================================ */

import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// ─── GET /api/notifications ──────────────────────
router.get('/', authenticate, async (req, res, next) => {
  try {
    const notifications = await req.prisma.notification.findMany({
      where: {
        OR: [
          { userId: req.user.id },
          { userId: null } // support system-wide broadcasts
        ]
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(notifications);
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/notifications/read — Mark all read ─
router.post('/read', authenticate, async (req, res, next) => {
  try {
    await req.prisma.notification.updateMany({
      where: {
        userId: req.user.id,
        read: false
      },
      data: { read: true },
    });
    
    res.json({ success: true, message: 'All notifications marked as read.' });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/notifications/read/:id ─────────────
router.post('/read/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;

    const notif = await req.prisma.notification.findUnique({
      where: { id },
    });

    if (!notif) {
      return res.status(404).json({ error: 'Notification not found.' });
    }

    if (notif.userId !== req.user.id && notif.userId !== null) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    const updated = await req.prisma.notification.update({
      where: { id },
      data: { read: true },
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

export default router;
