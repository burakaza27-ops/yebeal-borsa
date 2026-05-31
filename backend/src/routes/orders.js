/* ============================================
   Order Routes — Placing and Listing Orders
   ============================================ */

import { Router } from 'express';
import { authenticate, requireSellerOrAdmin } from '../middleware/auth.js';

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

async function calculateDeliveryFee(prisma, fromArea, toArea, animalType) {
  const from = await getZoneCoords(prisma, fromArea);
  const to = await getZoneCoords(prisma, toArea);
  const dist = haversine(from.lat, from.lng, to.lat, to.lng);

  const transportPerKm = { HEN: 30, SHEEP: 80, GOAT: 80, CATTLE: 150, KIRCHA: 150 };
  const laborFee = { HEN: 100, SHEEP: 500, GOAT: 500, CATTLE: 1500, KIRCHA: 1500 };
  const insuranceFee = { HEN: 50, SHEEP: 300, GOAT: 300, CATTLE: 800, KIRCHA: 800 };

  const typeUpper = animalType.toUpperCase();
  const transport = Math.round(dist * (transportPerKm[typeUpper] || 80));
  const labor = laborFee[typeUpper] || 500;
  const insurance = insuranceFee[typeUpper] || 300;

  return transport + labor + insurance;
}

// ─── GET /api/orders ──────────────────────────────
router.get('/', authenticate, async (req, res, next) => {
  try {
    const orders = await req.prisma.order.findMany({
      where: { userId: req.user.id },
      include: {
        deliverySteps: true,
        animal: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(orders);
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/orders/seller ───────────────────────
router.get('/seller', authenticate, requireSellerOrAdmin, async (req, res, next) => {
  try {
    const orders = await req.prisma.order.findMany({
      where: {
        animal: {
          sellerId: req.user.id,
        },
      },
      include: {
        deliverySteps: true,
        animal: true,
        user: {
          select: {
            fullName: true,
            phone: true,
            address: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(orders);
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/orders/:id ──────────────────────────
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const order = await req.prisma.order.findUnique({
      where: { id: req.params.id },
      include: {
        deliverySteps: true,
        animal: true,
      },
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    if (order.userId !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Access denied.' });
    }

    res.json(order);
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/orders ─────────────────────────────
router.post('/', authenticate, async (req, res, next) => {
  try {
    const {
      animalId,
      walletId,
      deliveryOption,
      deliveryZone,
      deliveryTimeWindow,
      paymentMethod,
      kirchaShares,
      deliveryDate,
      deliveryAddress,
      insuranceAdded
    } = req.body;

    if (!animalId || !deliveryOption || !paymentMethod) {
      return res.status(400).json({ error: 'Animal ID, delivery option, and payment method are required.' });
    }

    if (paymentMethod === 'cod') {
      return res.status(400).json({ error: 'Cash on Delivery is no longer supported. Please pay using Yebeal Borsa savings wallet.' });
    }

    // 1. Fetch animal and validate availability outside transaction
    const initialAnimal = await req.prisma.animal.findUnique({
      where: { id: animalId },
    });

    if (!initialAnimal || !initialAnimal.isActive || !initialAnimal.isApproved) {
      return res.status(400).json({ error: 'Animal not available for purchase.' });
    }

    // Check animal reservation outside transaction first
    const now = new Date();
    if (initialAnimal.reservedUntil && initialAnimal.reservedUntil > now && initialAnimal.reservedBy !== req.user.id) {
      return res.status(400).json({ error: 'This animal is currently reserved by another customer.' });
    }

    // 2. Pre-calculate delivery fee outside transaction
    let precalculatedDeliveryFee = 0;
    if (deliveryOption === 'delivery') {
      if (!deliveryZone) {
        return res.status(400).json({ error: 'Delivery zone is required for home delivery.' });
      }
      precalculatedDeliveryFee = await calculateDeliveryFee(req.prisma, initialAnimal.locationArea, deliveryZone, initialAnimal.type);
    }

    // Start database transaction
    const result = await req.prisma.$transaction(async (tx) => {
      // 1. Re-query animal inside transaction block to lock row
      const animal = await tx.animal.findUnique({
        where: { id: animalId },
      });

      if (!animal || !animal.isActive || !animal.isApproved) {
        throw new Error('Animal not available for purchase.');
      }

      if (animal.reservedUntil && animal.reservedUntil > now && animal.reservedBy !== req.user.id) {
        throw new Error('This animal is currently reserved by another customer.');
      }

      // Check if user has a valid wallet
      let wallet = null;
      if (walletId) {
        wallet = await tx.wallet.findUnique({ where: { id: walletId } });
      } else {
        wallet = await tx.wallet.findFirst({
          where: { userId: req.user.id, isFamily: false },
        });
      }

      if (!wallet || wallet.userId !== req.user.id) {
        throw new Error('Valid payment wallet not found.');
      }

      if (animal.type === 'KIRCHA') {
        // Find or create active KirchaPool
        let pool = await tx.kirchaPool.findUnique({
          where: { animalId },
          include: { members: true },
        });

        if (!pool) {
          const shares = parseInt(kirchaShares) || 5;
          if (![3, 5, 7].includes(shares)) {
            throw new Error('Kircha division must be divided into 3, 5, or 7 shares.');
          }
          pool = await tx.kirchaPool.create({
            data: {
              animalId,
              totalShares: shares,
              status: 'OPEN',
            },
            include: { members: true },
          });
        }

        if (pool.status !== 'OPEN') {
          throw new Error('This Kircha pool is already closed or completed.');
        }

        // Validate booking shares
        const currentBooked = pool.members.reduce((acc, m) => acc + m.shares, 0);
        const sharesToBook = 1; // Book exactly 1 share per customer order

        if (currentBooked + sharesToBook > pool.totalShares) {
          throw new Error(`Only ${pool.totalShares - currentBooked} shares remaining in this pool.`);
        }

        const existingMember = pool.members.find(m => m.userId === req.user.id);
        if (existingMember) {
          throw new Error('You have already joined this Kircha pool.');
        }

        // Calculate pricing
        const basePrice = Math.round(animal.price / pool.totalShares);
        
        // Insurance for Kircha
        let insurancePremium = 0;
        if (insuranceAdded && animal.insuranceEligible) {
          insurancePremium = Math.round(basePrice * 0.05);
        }

        const totalPrice = basePrice + precalculatedDeliveryFee + insurancePremium;

        // Escrow deduction from 3-part wallet balance
        let remainingCost = totalPrice;
        let creditDeduction = Math.min(wallet.platformCredits, remainingCost);
        remainingCost -= creditDeduction;

        let lockedDeduction = Math.min(wallet.lockedBalance, remainingCost);
        remainingCost -= lockedDeduction;

        let availableDeduction = Math.min(wallet.balance, remainingCost);
        remainingCost -= availableDeduction;

        if (remainingCost > 0) {
          throw new Error(`Insufficient wallet funds. Needed: ${totalPrice} ETB. You have Available: ${wallet.balance} ETB, Locked: ${wallet.lockedBalance} ETB, Credits: ${wallet.platformCredits} ETB.`);
        }

        const remainingAvailable = wallet.balance - availableDeduction;
        const remainingLocked = wallet.lockedBalance - lockedDeduction;
        if (remainingAvailable + remainingLocked < 100) {
          throw new Error('Kircha order rejected. A minimum reserve of 100 ETB must remain in your wallet.');
        }

        // Deduct balance
        await tx.wallet.update({
          where: { id: wallet.id },
          data: {
            balance: { decrement: availableDeduction },
            lockedBalance: { decrement: lockedDeduction },
            platformCredits: { decrement: creditDeduction },
          },
        });

        // Write escrow transaction
        await tx.transaction.create({
          data: {
            walletId: wallet.id,
            amount: -totalPrice,
            type: 'PURCHASE',
            description: `Kircha Escrow Hold for ${animal.breed} cattle share (Spent Available: ${availableDeduction}, Locked: ${lockedDeduction}, Credits: ${creditDeduction})`,
            method: 'Wallet Escrow',
            balanceType: 'AVAILABLE',
          },
        });

        // Create KirchaMember
        const newMember = await tx.kirchaMember.create({
          data: {
            poolId: pool.id,
            userId: req.user.id,
            walletId: wallet.id,
            shares: sharesToBook,
            pricePaid: totalPrice,
            deliveryOption,
            deliveryZone: deliveryZone || null,
            deliveryTimeWindow: deliveryTimeWindow || null,
            paymentMethod,
          },
        });

        const totalBooked = currentBooked + sharesToBook;

        if (totalBooked === pool.totalShares) {
          // Pool is FILLED!
          // 1. Close pool
          await tx.kirchaPool.update({
            where: { id: pool.id },
            data: { status: 'FILLED' },
          });

          // 2. Set animal offline & clear reservation
          await tx.animal.update({
            where: { id: animal.id },
            data: { isActive: false, reservedUntil: null, reservedBy: null },
          });

          // 3. Seller payout is held in escrow (processed weekly by admin), so NO direct transfer to seller balance here.

          // 4. Create individual orders for all members
          const membersList = [...pool.members, newMember];
          const orders = [];

          for (const member of membersList) {
            const memberUser = await tx.user.findUnique({ where: { id: member.userId } });
            const memberBasePrice = Math.round(animal.price / pool.totalShares);
            
            // Calculate member delivery & insurance
            let memberDeliveryFee = 0;
            if (member.deliveryOption === 'delivery') {
              memberDeliveryFee = await calculateDeliveryFee(tx, animal.locationArea, member.deliveryZone, animal.type);
            }
            const memberInsurancePremium = Math.max(0, member.pricePaid - memberBasePrice - memberDeliveryFee);

            const ord = await tx.order.create({
              data: {
                userId: member.userId,
                animalId: animal.id,
                animalType: animal.type,
                animalBreed: animal.breed,
                totalPrice: member.pricePaid,
                deliveryOption: member.deliveryOption,
                deliveryZone: member.deliveryZone,
                deliveryTimeWindow: member.deliveryTimeWindow,
                paymentMethod: member.paymentMethod,
                deliveryStatus: member.deliveryOption === 'delivery' ? 'PROCESSING' : 'PICKUP_READY',
                deliveryDate: deliveryDate ? new Date(deliveryDate) : null,
                deliveryAddress: member.deliveryOption === 'delivery'
                  ? (member.userId === req.user.id ? (deliveryAddress || memberUser?.address || 'Address on file') : (memberUser?.address || 'Address on file'))
                  : null,
                insuranceAdded: memberInsurancePremium > 0,
                insurancePremium: memberInsurancePremium,
                deliveryFee: memberDeliveryFee,
                animalPrice: memberBasePrice,
                isPaidToSeller: false,
                deliverySteps: {
                  create: member.deliveryOption === 'delivery' ? [
                    { label: 'Order Placed', done: true, time: new Date().toLocaleString() },
                    { label: 'Vet Inspection', done: false, time: null },
                    { label: 'In Transit', done: false, time: null },
                    { label: 'Delivered', done: false, time: null }
                  ] : []
                }
              },
              include: { deliverySteps: true }
            });
            orders.push(ord);

            // Create notification for member
            await tx.notification.create({
              data: {
                userId: member.userId,
                title: 'Kircha Pool Filled! 🎉',
                message: `The Kircha pool for a ${animal.breed} cattle has been fully filled! Your order is placed and processing.`,
                type: 'ORDER',
              },
            });

            // Update user totalSpent
            if (memberUser) {
              await tx.user.update({
                where: { id: member.userId },
                data: { totalSpent: memberUser.totalSpent + member.pricePaid },
              });
            }
          }

          // Create notification for seller
          await tx.notification.create({
            data: {
              userId: animal.sellerId,
              title: 'Kircha Cattle Sold! 💰',
              message: `Your Kircha listing for a ${animal.breed} cattle has been fully sold! Payout is held in escrow pending weekly processing.`,
              type: 'MARKETPLACE',
            },
          });

          return {
            status: 'FILLED',
            message: 'Kircha pool filled successfully!',
            bookedShares: totalBooked,
            totalShares: pool.totalShares,
            orders,
          };
        } else {
          // Pool is OPEN but not filled yet
          await tx.notification.create({
            data: {
              userId: req.user.id,
              title: 'Joined Kircha Pool! 🤝',
              message: `You successfully joined the Kircha pool for a ${animal.breed} cattle. Shares filled: ${totalBooked}/${pool.totalShares}.`,
              type: 'ORDER',
            },
          });

          return {
            status: 'JOINED',
            message: 'Successfully joined Kircha pool.',
            bookedShares: totalBooked,
            totalShares: pool.totalShares,
          };
        }
      }

      // Single Animal Purchase
      const user = await tx.user.findUnique({ where: { id: req.user.id } });
      const basePrice = animal.price;
      
      let insurancePremium = 0;
      if (insuranceAdded && animal.insuranceEligible) {
        insurancePremium = Math.round(basePrice * 0.05);
      }

      const totalPrice = basePrice + precalculatedDeliveryFee + insurancePremium;

      // Validate and deduct from 3-part wallet balance
      let remainingCost = totalPrice;
      let creditDeduction = Math.min(wallet.platformCredits, remainingCost);
      remainingCost -= creditDeduction;

      let lockedDeduction = Math.min(wallet.lockedBalance, remainingCost);
      remainingCost -= lockedDeduction;

      let availableDeduction = Math.min(wallet.balance, remainingCost);
      remainingCost -= availableDeduction;

      if (remainingCost > 0) {
        throw new Error(`Insufficient wallet funds. Needed: ${totalPrice} ETB. You have Available: ${wallet.balance} ETB, Locked: ${wallet.lockedBalance} ETB, Credits: ${wallet.platformCredits} ETB.`);
      }

      const remainingAvailable = wallet.balance - availableDeduction;
      const remainingLocked = wallet.lockedBalance - lockedDeduction;
      if (remainingAvailable + remainingLocked < 100) {
        throw new Error('Purchase rejected. A minimum reserve of 100 ETB must remain in your wallet.');
      }

      // Deduct from wallet balance
      await tx.wallet.update({
        where: { id: wallet.id },
        data: {
          balance: { decrement: availableDeduction },
          lockedBalance: { decrement: lockedDeduction },
          platformCredits: { decrement: creditDeduction },
        },
      });

      // Create transaction record
      await tx.transaction.create({
        data: {
          walletId: wallet.id,
          amount: -totalPrice,
          type: 'PURCHASE',
          description: `Purchased ${animal.breed} ${animal.type.toLowerCase()} (Spent Available: ${availableDeduction}, Locked: ${lockedDeduction}, Credits: ${creditDeduction})`,
          method: 'Wallet',
          balanceType: 'AVAILABLE',
        },
      });

      // Seller payout is held in escrow (isPaidToSeller: false) and processed weekly, so NO instant seller wallet credit!

      // 4. Update animal availability & clear reservation
      await tx.animal.update({
        where: { id: animal.id },
        data: { isActive: false, reservedUntil: null, reservedBy: null },
      });

      // 5. Create Order
      const order = await tx.order.create({
        data: {
          userId: req.user.id,
          animalId: animal.id,
          animalType: animal.type,
          animalBreed: animal.breed,
          totalPrice,
          deliveryOption,
          deliveryZone: deliveryZone || null,
          deliveryTimeWindow: deliveryTimeWindow || null,
          paymentMethod,
          deliveryStatus: deliveryOption === 'delivery' ? 'PROCESSING' : 'PICKUP_READY',
          deliveryDate: deliveryDate ? new Date(deliveryDate) : null,
          deliveryAddress: deliveryOption === 'delivery' ? (deliveryAddress || user?.address || 'Address on file') : null,
          insuranceAdded: insuranceAdded && animal.insuranceEligible,
          insurancePremium,
          deliveryFee: precalculatedDeliveryFee,
          animalPrice: basePrice,
          isPaidToSeller: false,
          deliverySteps: {
            create: deliveryOption === 'delivery' ? [
              { label: 'Order Placed', done: true, time: new Date().toLocaleString() },
              { label: 'Vet Inspection', done: false, time: null },
              { label: 'In Transit', done: false, time: null },
              { label: 'Delivered', done: false, time: null }
            ] : []
          }
        },
        include: {
          deliverySteps: true,
        }
      });

      // 6. Create Notifications
      // For Buyer
      await tx.notification.create({
        data: {
          userId: req.user.id,
          title: 'Order Placed! 🎉',
          message: `Your order for a ${animal.breed} ${animal.type.toLowerCase()} has been placed. ${
            deliveryOption === 'delivery' ? `Delivery to ${deliveryZone} (${deliveryTimeWindow || 'Full Day'}).` : 'Ready for pickup.'
          }`,
          type: 'ORDER',
        },
      });

      // For Seller
      await tx.notification.create({
        data: {
          userId: animal.sellerId,
          title: 'Animal Purchased! 💰',
          message: `Your listing for a ${animal.breed} ${animal.type.toLowerCase()} has been purchased by ${req.user.phone}. Payout is held in escrow.`,
          type: 'MARKETPLACE',
        },
      });

      // 7. Update User's totalSpent
      const newTotalSpent = (user?.totalSpent || 0) + totalPrice;
      await tx.user.update({
        where: { id: req.user.id },
        data: {
          totalSpent: newTotalSpent,
        },
      });

      return order;
    });

    res.status(201).json(result);
  } catch (err) {
    if (err.message.includes('balance') || err.message.includes('available') || err.message.includes('funds') || err.message.includes('reserve') || err.message.includes('reserved') || err.message.includes('required')) {
      return res.status(400).json({ error: err.message });
    }
    next(err);
  }
});

// ─── GET /api/orders/kircha/:animalId ──────────────
router.get('/kircha/:animalId', authenticate, async (req, res, next) => {
  try {
    const pool = await req.prisma.kirchaPool.findUnique({
      where: { animalId: req.params.animalId },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                avatar: true,
              }
            }
          }
        }
      }
    });

    if (!pool) {
      return res.json({ status: 'OPEN', bookedShares: 0, totalShares: 5, members: [] });
    }

    res.json({
      id: pool.id,
      animalId: pool.animalId,
      totalShares: pool.totalShares,
      status: pool.status,
      bookedShares: pool.members.reduce((acc, m) => acc + m.shares, 0),
      members: pool.members.map(m => ({
        userId: m.userId,
        fullName: m.user.fullName,
        avatar: m.user.avatar,
        shares: m.shares,
        joinedAt: m.createdAt,
      }))
    });
  } catch (err) {
    next(err);
  }
});
// ─── POST /api/orders/:id/cancel ───────────────
router.post('/:id/cancel', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const order = await req.prisma.order.findUnique({
      where: { id },
      include: { animal: true }
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    // Customer can cancel their own order, Admin can cancel any order
    if (order.userId !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Access denied.' });
    }

    if (order.deliveryStatus === 'DELIVERED' || order.deliveryStatus === 'CANCELLED') {
      return res.status(400).json({ error: `Cannot cancel order with status ${order.deliveryStatus}.` });
    }

    const result = await req.prisma.$transaction(async (tx) => {
      // 1. Update order status to CANCELLED
      const updatedOrder = await tx.order.update({
        where: { id },
        data: {
          deliveryStatus: 'CANCELLED',
          cancelledAt: new Date(),
          cancelReason: reason || 'Customer requested cancellation',
        }
      });

      // 2. Reactivate the animal listing
      await tx.animal.update({
        where: { id: order.animalId },
        data: { isActive: true }
      });

      // 3. Create a RefundRequest for manual processing by admin
      const refund = await tx.refundRequest.create({
        data: {
          userId: order.userId,
          orderId: order.id,
          amount: order.totalPrice,
          reason: reason || 'Customer cancelled order',
          status: 'PENDING',
        }
      });

      // Handle Kircha group buy disbandment & auto-refunding for other members
      if (order.animalType === 'KIRCHA') {
        // Find pool
        const pool = await tx.kirchaPool.findUnique({
          where: { animalId: order.animalId },
          include: { members: true }
        });

        if (pool) {
          // FIX #4: Block disbandment if ANY sibling order has already gone IN_TRANSIT or DELIVERED.
          // At that point, the livestock is on a truck or has been handed over — reversal is impossible.
          const inProgressOrders = await tx.order.findMany({
            where: {
              animalId: order.animalId,
              userId: { not: order.userId },
              deliveryStatus: { in: ['IN_TRANSIT', 'DELIVERED'] },
            },
          });

          if (inProgressOrders.length > 0) {
            throw new Error(
              'Cannot cancel this Kircha order. The group livestock is already in transit or has been delivered ' +
              'to one or more members. Contact support to resolve this dispute.'
            );
          }

          // Revert pool status to CANCELLED
          await tx.kirchaPool.update({
            where: { id: pool.id },
            data: { status: 'CANCELLED' }
          });

          // Delete cancelling member's KirchaMember record
          await tx.kirchaMember.deleteMany({
            where: { poolId: pool.id, userId: order.userId }
          });

          // Find all other active orders for this animal (excluding this user)
          const otherOrders = await tx.order.findMany({
            where: {
              animalId: order.animalId,
              userId: { not: order.userId },
              deliveryStatus: { not: 'CANCELLED' }
            }
          });

          for (const otherOrd of otherOrders) {
            // Cancel their order
            await tx.order.update({
              where: { id: otherOrd.id },
              data: {
                deliveryStatus: 'CANCELLED',
                cancelledAt: new Date(),
                cancelReason: 'Group buy disbanded due to another member cancellation'
              }
            });

            // Find their primary wallet to auto-refund
            const wallet = await tx.wallet.findFirst({
              where: { userId: otherOrd.userId, isFamily: false }
            });

            if (wallet) {
              // Auto-refund money directly to available balance (since it was cancelled by system)
              await tx.wallet.update({
                where: { id: wallet.id },
                data: { balance: { increment: otherOrd.totalPrice } }
              });

              // Write refund transaction record
              await tx.transaction.create({
                data: {
                  walletId: wallet.id,
                  amount: otherOrd.totalPrice,
                  type: 'DEPOSIT',
                  description: `Refund: Kircha group buy disbanded for ${order.animalBreed}`,
                  method: 'System Refund',
                  balanceType: 'AVAILABLE'
                }
              });
            }

            // Decrement user spent stats
            const otherUser = await tx.user.findUnique({ where: { id: otherOrd.userId } });
            if (otherUser) {
              await tx.user.update({
                where: { id: otherOrd.userId },
                data: { totalSpent: Math.max(0, otherUser.totalSpent - otherOrd.totalPrice) }
              });
            }

            // Delete their KirchaMember record
            await tx.kirchaMember.deleteMany({
              where: { poolId: pool.id, userId: otherOrd.userId }
            });

            // Send notification to other member
            await tx.notification.create({
              data: {
                userId: otherOrd.userId,
                title: 'Kircha Pool Disbanded ✗',
                message: `The Kircha group buy for a ${order.animalBreed} cattle has been disbanded because a member cancelled. Your payment of ${otherOrd.totalPrice.toLocaleString()} ETB has been fully refunded to your available wallet balance.`,
                type: 'ORDER'
              }
            });
          }
        }
      }

      // 4. Notify buyer
      await tx.notification.create({
        data: {
          userId: order.userId,
          title: 'Order Cancelled ✗',
          message: `Your order for a ${order.animalBreed} ${order.animalType.toLowerCase()} has been cancelled. A refund request of ${order.totalPrice.toLocaleString()} ETB is pending admin processing.`,
          type: 'ORDER',
        }
      });

      // 5. Notify seller
      await tx.notification.create({
        data: {
          userId: order.animal.sellerId,
          title: 'Order Cancelled ✗',
          message: `The order from ${req.user.phone} for your ${order.animalBreed} ${order.animalType.toLowerCase()} has been cancelled.`,
          type: 'MARKETPLACE',
        }
      });

      return { order: updatedOrder, refund };
    });

    res.json(result);
  } catch (err) {
    if (err.message.includes('found') || err.message.includes('status') || err.message.includes('transit') || err.message.includes('delivered') || err.message.includes('Contact')) {
      return res.status(400).json({ error: err.message });
    }
    next(err);
  }
});

// ─── POST /api/orders/:id/rate ───────────────────
router.post('/:id/rate', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rating } = req.body;

    if (rating === undefined || rating === null) {
      return res.status(400).json({ error: 'Rating (1-5) is required.' });
    }
    const ratingVal = parseInt(rating);
    if (isNaN(ratingVal) || ratingVal < 1 || ratingVal > 5) {
      return res.status(400).json({ error: 'Rating must be an integer between 1 and 5.' });
    }

    const order = await req.prisma.order.findUnique({
      where: { id },
      include: { animal: true }
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    if (order.userId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    if (order.deliveryStatus !== 'DELIVERED') {
      return res.status(400).json({ error: 'You can only rate the seller after the livestock is delivered.' });
    }

    if (order.rating !== null && order.rating !== undefined) {
      return res.status(400).json({ error: 'You have already rated this order.' });
    }

    // Update seller rating across all of this seller's listings
    const sellerId = order.animal.sellerId;
    
    const result = await req.prisma.$transaction(async (tx) => {
      // 1. Save rating to Order model
      await tx.order.update({
        where: { id },
        data: { rating: ratingVal }
      });

      // 2. Fetch all animals of this seller to update sellerRating
      const currentRating = order.animal.sellerRating || 4.5; 
      const newRating = currentRating === 0 ? ratingVal : Math.round(((currentRating * 4 + ratingVal) / 5) * 10) / 10;

      await tx.animal.updateMany({
        where: { sellerId },
        data: { sellerRating: newRating }
      });

      // 3. Create notification for seller
      await tx.notification.create({
        data: {
          userId: sellerId,
          title: 'New Rating Received! ⭐️',
          message: `A customer rated you ${ratingVal} stars for order #${order.id.slice(-6)}.`,
          type: 'SYSTEM',
        }
      });

      return { newRating };
    });

    res.json({ success: true, newRating: result.newRating });
  } catch (err) {
    next(err);
  }
});

export default router;
