/* ============================================
   User Routes — Profile, Preferences, Language
   ============================================ */

import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// All user routes require authentication
router.use(authenticate);

// ─── GET /api/users/profile ──────────────────────
router.get('/profile', async (req, res, next) => {
  try {
    const user = await req.prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        wallets: true,
        customerHolidays: { include: { holiday: true } },
      },
    });

    if (!user) return res.status(404).json({ error: 'User not found.' });

    const { passwordHash: _, ...safeUser } = user;
    res.json(safeUser);
  } catch (err) {
    next(err);
  }
});

// ─── PUT /api/users/profile ──────────────────────
router.put('/profile', async (req, res, next) => {
  try {
    const allowedFields = ['fullName', 'fullNameAmharic', 'email', 'gender', 'region', 'address', 'avatar'];
    const updates = {};

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    const user = await req.prisma.user.update({
      where: { id: req.user.id },
      data: updates,
    });

    const { passwordHash: _, ...safeUser } = user;
    res.json(safeUser);
  } catch (err) {
    next(err);
  }
});

// ─── PUT /api/users/language ─────────────────────
router.put('/language', async (req, res, next) => {
  try {
    const { language } = req.body;
    if (!['en', 'am'].includes(language)) {
      return res.status(400).json({ error: 'Language must be "en" or "am".' });
    }

    const user = await req.prisma.user.update({
      where: { id: req.user.id },
      data: { language },
    });

    res.json({ language: user.language });
  } catch (err) {
    next(err);
  }
});

// ─── PUT /api/users/notifications ────────────────
router.put('/notifications', async (req, res, next) => {
  try {
    const allowedPrefs = ['notifDeposits', 'notifHolidays', 'notifDelivery', 'notifSystem', 'notifPromotions'];
    const updates = {};

    for (const pref of allowedPrefs) {
      if (req.body[pref] !== undefined) {
        updates[pref] = Boolean(req.body[pref]);
      }
    }

    const user = await req.prisma.user.update({
      where: { id: req.user.id },
      data: updates,
    });

    res.json({
      notifDeposits: user.notifDeposits,
      notifHolidays: user.notifHolidays,
      notifDelivery: user.notifDelivery,
      notifSystem: user.notifSystem,
      notifPromotions: user.notifPromotions,
    });
  } catch (err) {
    next(err);
  }
});

// ─── PUT /api/users/password ─────────────────────
router.put('/password', async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new passwords are required.' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters.' });
    }

    const user = await req.prisma.user.findUnique({ where: { id: req.user.id } });

    const bcrypt = (await import('bcryptjs')).default;
    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: 'Current password is incorrect.' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await req.prisma.user.update({
      where: { id: req.user.id },
      data: { passwordHash },
    });

    res.json({ message: 'Password updated successfully.' });
  } catch (err) {
    next(err);
  }
});

export default router;
