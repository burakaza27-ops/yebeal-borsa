/* ============================================
   Auth Routes — Register, Login, Token Verify
   ============================================ */

import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';

const router = Router();

// Zod Schemas
const registerSchema = z.object({
  phone: z.string().regex(/^(\+251|0)(9|7)\d{8}$/, 'Invalid Ethiopian phone number'),
  fullName: z.string().min(2, 'Full name is required'),
  fullNameAmharic: z.string().nullable().optional(),
  email: z.string().email('Invalid email').nullable().optional().or(z.literal('')).or(z.null()),
  password: z.string().min(8, 'Password must be at least 8 characters').regex(/[A-Z]/, 'Must contain uppercase').regex(/[0-9]/, 'Must contain number'),
  faydaId: z.string().nullable().optional(),
  gender: z.string().nullable().optional(),
  region: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
});

const loginSchema = z.object({
  phone: z.string().optional(),
  faydaId: z.string().optional(),
  password: z.string().min(1),
}).refine(data => data.phone || data.faydaId, {
  message: "Either phone number or Fayda ID must be provided",
  path: ["phone"],
});

// ─── POST /api/auth/register ─────────────────────
router.post('/register', validateBody(registerSchema), async (req, res, next) => {
  try {
    const { phone, fullName, fullNameAmharic, email, password, faydaId, gender, region, city } = req.body;

    const cleanedPhone = phone.trim().replace(/\s/g, '');

    // Check if phone already exists
    const existing = await req.prisma.user.findUnique({ where: { phone: cleanedPhone } });
    if (existing) {
      return res.status(409).json({ error: 'An account with this phone number already exists.' });
    }

    // Check if Fayda ID is already registered
    const trimmedFayda = (faydaId && typeof faydaId === 'string') ? faydaId.trim() : null;
    if (trimmedFayda && trimmedFayda.length > 0) {
      const existingFayda = await req.prisma.user.findUnique({ where: { faydaId: trimmedFayda } });
      if (existingFayda) {
        return res.status(409).json({ error: 'This Fayda ID is already registered.' });
      }
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const avatar = fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

    const user = await req.prisma.user.create({
      data: {
        phone: cleanedPhone,
        fullName,
        fullNameAmharic: fullNameAmharic || null,
        email: email || null,
        passwordHash,
        faydaId: (trimmedFayda && trimmedFayda.length > 0) ? trimmedFayda : null,
        // FIX #5: Automatically grant STANDARD KYC level to users who register with
        // a Fayda National ID. Without this, Fayda holders were treated identically
        // to unverified users despite providing government-issued identity proof.
        kycLevel: (trimmedFayda && trimmedFayda.length > 0) ? 'STANDARD' : 'BASIC',
        gender: gender || null,
        region: region || null,
        city: city || null,
        avatar,
        wallets: {
          create: {
            label: 'Primary Wallet',
            balance: 0,
            isFamily: false,
          }
        }
      },
      include: { wallets: true },
    });


    const token = jwt.sign(
      { id: user.id, role: user.role, phone: user.phone },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days matching token
    });

    const { passwordHash: _, ...safeUser } = user;
    // Return token in body too — needed for cross-port dev (cookie won't be sent cross-origin)
    res.status(201).json({ user: safeUser, token });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/auth/login ────────────────────────
router.post('/login', validateBody(loginSchema), async (req, res, next) => {
  try {
    const { phone, password, faydaId } = req.body;

    let user;

    const trimmedFayda = (faydaId && typeof faydaId === 'string') ? faydaId.trim() : null;
    const cleanedPhone = (phone && typeof phone === 'string') ? phone.trim().replace(/\s/g, '') : null;

    if (trimmedFayda && trimmedFayda.length > 0) {
      // Fayda ID login
      user = await req.prisma.user.findUnique({ where: { faydaId: trimmedFayda } });
    } else if (cleanedPhone && cleanedPhone.length > 0) {
      // Phone login
      user = await req.prisma.user.findUnique({ where: { phone: cleanedPhone } });
    } else {
      return res.status(400).json({ error: 'Phone number or Fayda ID is required.' });
    }

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    if (!user.isActive) {
      return res.status(403).json({ error: 'Your account has been deactivated. Contact support.' });
    }

    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role, phone: user.phone },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days matching token
    });

    const { passwordHash: _, ...safeUser } = user;
    // Return token in body too — needed for cross-port dev (cookie won't be sent cross-origin)
    res.json({ user: safeUser, token });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/auth/logout ───────────────────────
router.post('/logout', (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  });
  res.json({ success: true, message: 'Logged out successfully.' });
});

// ─── GET /api/auth/me — Verify token & get user ──
router.get('/me', authenticate, async (req, res, next) => {
  try {
    const user = await req.prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        wallets: true,
        customerHolidays: { include: { holiday: true } },
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const { passwordHash: _, ...safeUser } = user;
    res.json({ user: safeUser });
  } catch (err) {
    next(err);
  }
});

export default router;
