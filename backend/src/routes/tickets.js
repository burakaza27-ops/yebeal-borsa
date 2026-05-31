/* ============================================
   Support Tickets — Client Routes
   Allows users to create and view support
   tickets and insurance claims.
   ============================================ */

import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// ─── Create a Support Ticket ──────────────────────────
// POST /api/support/tickets
router.post('/', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { title, message, category } = req.body;

    if (!title || !message) {
      return res.status(400).json({ error: 'Title and message are required.' });
    }

    const validCategories = ['SUPPORT', 'INSURANCE_CLAIM'];
    const ticketCategory = validCategories.includes(category) ? category : 'SUPPORT';

    let validatedOrderId = null;

    if (ticketCategory === 'INSURANCE_CLAIM') {
      const { orderId } = req.body;
      if (!orderId) {
        return res.status(400).json({ error: 'Order ID is required for insurance claims.' });
      }

      const order = await req.prisma.order.findUnique({
        where: { id: orderId }
      });

      if (!order) {
        return res.status(404).json({ error: 'Order not found.' });
      }

      if (order.userId !== userId) {
        return res.status(403).json({ error: 'Access denied. You do not own this order.' });
      }

      if (!order.insuranceAdded) {
        return res.status(400).json({ error: 'This order does not have veterinary insurance coverage.' });
      }

      if (order.deliveryStatus === 'CANCELLED' || order.cancelledAt) {
        return res.status(400).json({ error: 'Cannot file an insurance claim for a cancelled order.' });
      }

      validatedOrderId = orderId;
    }

    const ticket = await req.prisma.supportTicket.create({
      data: {
        userId,
        orderId: validatedOrderId,
        title: title.trim(),
        message: message.trim(),
        category: ticketCategory,
      },
    });

    // Create notification for the user
    await req.prisma.notification.create({
      data: {
        userId,
        title: ticketCategory === 'INSURANCE_CLAIM' ? 'Insurance Claim Filed' : 'Ticket Submitted',
        message: ticketCategory === 'INSURANCE_CLAIM' 
          ? `Your insurance claim for order #${validatedOrderId.slice(-6)} has been successfully filed.`
          : `Your support ticket "${title}" has been received. We'll respond shortly.`,
        type: 'SYSTEM',
      },
    });

    res.status(201).json(ticket);
  } catch (err) {
    console.error('Create ticket error:', err);
    res.status(500).json({ error: 'Failed to create support ticket.' });
  }
});

// ─── Get All User Tickets ─────────────────────────────
// GET /api/support/tickets
router.get('/', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;

    const tickets = await req.prisma.supportTicket.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    res.json(tickets);
  } catch (err) {
    console.error('Get tickets error:', err);
    res.status(500).json({ error: 'Failed to fetch support tickets.' });
  }
});

// ─── Get Single Ticket ────────────────────────────────
// GET /api/support/tickets/:id
router.get('/:id', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;

    const ticket = await req.prisma.supportTicket.findFirst({
      where: { id: req.params.id, userId },
    });

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found.' });
    }

    res.json(ticket);
  } catch (err) {
    console.error('Get ticket error:', err);
    res.status(500).json({ error: 'Failed to fetch support ticket.' });
  }
});

export default router;
