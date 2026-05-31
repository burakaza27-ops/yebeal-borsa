/* ============================================
   Delivery Routes — Zones, Fees, & Step Updates
   ============================================ */

import { Router } from 'express';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { parseAndValidateFloat } from '../utils/validation.js';

const router = Router();

// Default coordinates for zones
const DEFAULT_ZONES = {
  'Bole': { lat: 9.0054, lng: 38.7636 },
  'Merkato': { lat: 9.0345, lng: 38.7468 },
  'Kera': { lat: 9.0000, lng: 38.7333 },
  'CMC': { lat: 9.0287, lng: 38.8157 },
  'Lebu': { lat: 8.9500, lng: 38.7000 },
  'Ayat': { lat: 9.0400, lng: 38.8500 },
  'Megenagna': { lat: 9.0200, lng: 38.7900 },
  'Piassa': { lat: 9.0300, lng: 38.7480 },
  'Sarbet': { lat: 8.9800, lng: 38.7600 },
  '4 Kilo': { lat: 9.0350, lng: 38.7630 },
  'Kaliti': { lat: 8.9400, lng: 38.7400 },
  'Summit': { lat: 9.0150, lng: 38.8050 },
};

function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function getZoneCoords(prisma, name) {
  const zone = await prisma.deliveryZone.findUnique({ where: { name } });
  if (zone) return { lat: zone.lat, lng: zone.lng };
  return DEFAULT_ZONES[name] || DEFAULT_ZONES['Bole'];
}

// ─── GET /api/delivery/zones ─────────────────────
router.get('/zones', async (req, res, next) => {
  try {
    const dbZones = await req.prisma.deliveryZone.findMany();
    // Merge database zones with defaults
    const zones = { ...DEFAULT_ZONES };
    dbZones.forEach(z => {
      zones[z.name] = { lat: z.lat, lng: z.lng };
    });
    res.json(zones);
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/delivery/zones — Admin only ────────
router.post('/zones', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { name, lat, lng } = req.body;

    if (!name || lat === undefined || lng === undefined) {
      return res.status(400).json({ error: 'Zone name, latitude, and longitude are required.' });
    }

    const validatedLat = parseAndValidateFloat(lat, 'latitude', true, -90);
    const validatedLng = parseAndValidateFloat(lng, 'longitude', true, -180);

    const zone = await req.prisma.deliveryZone.upsert({
      where: { name },
      update: { lat: validatedLat, lng: validatedLng },
      create: { name, lat: validatedLat, lng: validatedLng },
    });

    // Write audit log
    await req.prisma.auditLog.create({
      data: {
        adminId: req.user.id,
        action: 'UPDATE_DELIVERY_ZONE',
        target: name,
        details: `Updated coordinates for delivery zone ${name}: Lat ${validatedLat}, Lng ${validatedLng}`,
      },
    });

    res.json(zone);
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/delivery/fee ───────────────────────
router.post('/fee', async (req, res, next) => {
  try {
    const { fromArea, toArea, animalType, animalPrice } = req.body;

    if (!fromArea || !toArea || !animalType) {
      return res.status(400).json({ error: 'fromArea, toArea, and animalType are required.' });
    }

    const from = await getZoneCoords(req.prisma, fromArea);
    const to = await getZoneCoords(req.prisma, toArea);
    const dist = haversine(from.lat, from.lng, to.lat, to.lng);

    const allowedTypes = ['SHEEP', 'GOAT', 'CATTLE', 'HEN', 'KIRCHA'];
    const typeUpper = animalType.toUpperCase();
    if (!allowedTypes.includes(typeUpper)) {
      return res.status(400).json({ error: `Invalid animal type "${animalType}". Must be one of: ${allowedTypes.join(', ')}` });
    }

    const transportPerKm = { HEN: 30, SHEEP: 80, GOAT: 80, CATTLE: 150, KIRCHA: 150 };
    const laborFee = { HEN: 100, SHEEP: 500, GOAT: 500, CATTLE: 1500, KIRCHA: 1500 };
    const insuranceFee = { HEN: 50, SHEEP: 300, GOAT: 300, CATTLE: 800, KIRCHA: 800 };

    const transport = Math.round(dist * (transportPerKm[typeUpper] || 80));
    const labor = laborFee[typeUpper] || 500;
    const insurance = insuranceFee[typeUpper] || 300;
    const deliveryTotal = transport + labor + insurance;

    const basePrice = animalPrice !== undefined && animalPrice !== null ? parseAndValidateFloat(animalPrice, 'animalPrice', false, 0) : 0;

    res.json({
      distance: Math.round(dist * 10) / 10,
      animalPrice: basePrice,
      transport,
      labor,
      insurance,
      deliveryTotal,
      grandTotal: basePrice + deliveryTotal
    });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/delivery/orders/:orderId/step — Admin
router.post('/orders/:orderId/step', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const { stepLabel, done } = req.body;

    if (!stepLabel || done === undefined) {
      return res.status(400).json({ error: 'stepLabel and done state are required.' });
    }

    const order = await req.prisma.order.findUnique({
      where: { id: orderId },
      include: { deliverySteps: true }
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    const step = order.deliverySteps.find(s => s.label.toLowerCase() === stepLabel.toLowerCase());
    if (!step) {
      return res.status(404).json({ error: `Delivery step "${stepLabel}" not found for this order.` });
    }

    const result = await req.prisma.$transaction(async (tx) => {
      // Update delivery step
      const updatedStep = await tx.deliveryStep.update({
        where: { id: step.id },
        data: {
          done,
          time: done ? new Date().toLocaleString() : null,
        },
      });

      // Determine order-level deliveryStatus update based on steps
      let newStatus = order.deliveryStatus;
      if (stepLabel.toLowerCase() === 'delivered' && done) {
        newStatus = 'DELIVERED';
      } else if (stepLabel.toLowerCase() === 'in transit' && done) {
        newStatus = 'IN_TRANSIT';
      } else if (stepLabel.toLowerCase() === 'vet inspection' && done) {
        newStatus = 'PROCESSING'; // stays processing
      }

      if (newStatus !== order.deliveryStatus) {
        await tx.order.update({
          where: { id: orderId },
          data: { deliveryStatus: newStatus },
        });

        // Notify Buyer
        await tx.notification.create({
          data: {
            userId: order.userId,
            title: newStatus === 'DELIVERED' ? 'Delivery Complete! 🎉' : 'Delivery Update 📍',
            message: newStatus === 'DELIVERED'
              ? `Your order for a ${order.animalBreed} ${order.animalType.toLowerCase()} has been delivered successfully. Thank you!`
              : `Your order for a ${order.animalBreed} ${order.animalType.toLowerCase()} is now in transit.`,
            type: 'DELIVERY',
          },
        });
      }

      // Write audit log
      await tx.auditLog.create({
        data: {
          adminId: req.user.id,
          action: 'UPDATE_DELIVERY_STEP',
          target: orderId,
          details: `Updated delivery step "${stepLabel}" to ${done ? 'Completed' : 'Pending'} for order #${orderId.slice(-6)}`,
        },
      });

      return updatedStep;
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/delivery/orders/:orderId/complete — Admin only ─────
router.post('/orders/:orderId/complete', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { orderId } = req.params;

    const order = await req.prisma.order.findUnique({
      where: { id: orderId },
      include: { deliverySteps: true }
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    if (order.deliveryStatus === 'DELIVERED') {
      return res.status(400).json({ error: 'Order is already completed/delivered.' });
    }

    if (order.deliveryStatus === 'CANCELLED' || order.cancelledAt) {
      return res.status(400).json({ error: 'Cannot complete a cancelled order.' });
    }

    const result = await req.prisma.$transaction(async (tx) => {
      // 1. Update order status to DELIVERED
      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: { deliveryStatus: 'DELIVERED' },
      });

      // 2. If home delivery, mark all steps as done: true with timestamp
      if (order.deliveryOption === 'delivery' && order.deliverySteps.length > 0) {
        const timeNow = new Date().toLocaleString();
        await tx.deliveryStep.updateMany({
          where: { orderId },
          data: {
            done: true,
            time: timeNow
          }
        });
      }

      // 3. Send notification to buyer
      const title = order.deliveryOption === 'pickup' ? 'Self-Pickup Complete! 🎉' : 'Delivery Complete! 🎉';
      const message = order.deliveryOption === 'pickup'
        ? `Your self-pickup for order #${orderId.slice(-6)} has been completed. Thank you!`
        : `Your order for a ${order.animalBreed} ${order.animalType.toLowerCase()} has been marked as fully complete.`;
      
      await tx.notification.create({
        data: {
          userId: order.userId,
          title,
          message,
          type: 'DELIVERY',
        },
      });

      // 4. Create audit log
      await tx.auditLog.create({
        data: {
          adminId: req.user.id,
          action: 'COMPLETE_ORDER',
          target: orderId,
          details: `Manually marked order #${orderId.slice(-6)} (${order.deliveryOption}) as DELIVERED/Completed.`,
        },
      });

      return updatedOrder;
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
