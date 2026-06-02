/* ============================================
   Admin Routes — Dashboard, Approvals, Reports, & Logs
   ============================================ */

import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = Router();

// Apply admin authentication middleware to all routes
router.use(authenticate, requireAdmin);

// ─── GET /api/admin/customers ─────────────────────
router.get('/customers', async (req, res, next) => {
  try {
    const customers = await req.prisma.user.findMany({
      include: {
        wallets: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Map users to remove password hash and make safe
    const safeCustomers = customers.map(u => {
      const { passwordHash: _, ...safe } = u;
      return safe;
    });

    res.json(safeCustomers);
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/admin/customers/:id/toggle-active ──
router.post('/customers/:id/toggle-active', async (req, res, next) => {
  try {
    const { id } = req.params;

    const user = await req.prisma.user.findUnique({ where: { id } });
    if (!user) {
      return res.status(404).json({ error: 'Customer not found.' });
    }

    const updated = await req.prisma.user.update({
      where: { id },
      data: { isActive: !user.isActive },
    });

    // Write audit log
    await req.prisma.auditLog.create({
      data: {
        adminId: req.user.id,
        action: updated.isActive ? 'ACTIVATE_USER' : 'DEACTIVATE_USER',
        target: id,
        details: `${updated.isActive ? 'Activated' : 'Deactivated'} user: ${user.fullName} (${user.phone})`,
      },
    });

    const { passwordHash: _, ...safeUser } = updated;
    res.json(safeUser);
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/admin/customers/:id/role ───────────
router.post('/customers/:id/role', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!role || !['CUSTOMER', 'SELLER', 'FATTENER', 'TRADER', 'ADMIN', 'SUPER_ADMIN'].includes(role.toUpperCase())) {
      return res.status(400).json({ error: 'Valid role (CUSTOMER, SELLER, FATTENER, TRADER, ADMIN, SUPER_ADMIN) is required.' });
    }

    const user = await req.prisma.user.findUnique({ where: { id } });
    if (!user) {
      return res.status(404).json({ error: 'Customer not found.' });
    }

    const updated = await req.prisma.user.update({
      where: { id },
      data: { role: role.toUpperCase() },
    });

    // Write audit log
    await req.prisma.auditLog.create({
      data: {
        adminId: req.user.id,
        action: 'CHANGE_USER_ROLE',
        target: id,
        details: `Changed role of user ${user.fullName} from ${user.role} to ${role}`,
      },
    });

    const { passwordHash: _, ...safeUser } = updated;
    res.json(safeUser);
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/admin/holidays ─────────────────────
router.post('/holidays', async (req, res, next) => {
  try {
    const { name, nameEn, deadline, minimumDeposit, animalTypes, color, icon, description } = req.body;
    
    if (!name || !nameEn || !deadline || !minimumDeposit || !animalTypes || animalTypes.length === 0) {
      return res.status(400).json({ error: 'Name, English Name, deadline, minimum deposit, and animal types are required.' });
    }

    const holiday = await req.prisma.holiday.create({
      data: {
        name,
        nameEn,
        deadline: new Date(deadline),
        minimumDeposit: parseFloat(minimumDeposit),
        animalTypes,
        color: color || 'blue',
        icon: icon || '📅',
        description,
        isActive: true
      }
    });

    await req.prisma.auditLog.create({
      data: {
        adminId: req.user.id,
        action: 'CREATE_HOLIDAY',
        target: holiday.id,
        details: `Created new holiday: ${name} (${nameEn})`,
      },
    });

    res.status(201).json(holiday);
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/admin/animals/pending ───────────────
router.get('/animals/pending', async (req, res, next) => {
  try {
    const pendingAnimals = await req.prisma.animal.findMany({
      where: {
        isActive: true,
        isApproved: false,
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(pendingAnimals);
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/admin/animals/:id/approve ──────────
router.post('/animals/:id/approve', async (req, res, next) => {
  try {
    const { id } = req.params;

    const animal = await req.prisma.animal.findUnique({ where: { id } });
    if (!animal) {
      return res.status(404).json({ error: 'Animal listing not found.' });
    }

    if (animal.sellerId === req.user.id) {
      return res.status(403).json({ error: 'Separation of Duties: You cannot approve your own animal listing.' });
    }

    const updated = await req.prisma.animal.update({
      where: { id },
      data: { isApproved: true },
    });

    // Create notification for seller
    await req.prisma.notification.create({
      data: {
        userId: animal.sellerId,
        title: 'Listing Approved! 🎉',
        message: `Your listing for a ${animal.breed} ${animal.type.toLowerCase()} has been approved and is now live in the marketplace.`,
        type: 'MARKETPLACE',
      },
    });

    // Write audit log
    await req.prisma.auditLog.create({
      data: {
        adminId: req.user.id,
        action: 'APPROVE_ANIMAL',
        target: id,
        details: `Approved animal listing: ${animal.breed} ${animal.type}`,
      },
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/admin/animals/:id/reject ───────────
router.post('/animals/:id/reject', async (req, res, next) => {
  try {
    const { id } = req.params;

    const animal = await req.prisma.animal.findUnique({ where: { id } });
    if (!animal) {
      return res.status(404).json({ error: 'Animal listing not found.' });
    }

    if (animal.sellerId === req.user.id) {
      return res.status(403).json({ error: 'Separation of Duties: You cannot reject your own animal listing.' });
    }

    const updated = await req.prisma.animal.update({
      where: { id },
      data: { isActive: false }, // Set inactive to reject/hide it
    });

    // Create notification for seller
    await req.prisma.notification.create({
      data: {
        userId: animal.sellerId,
        title: 'Listing Rejected ✗',
        message: `Your listing for a ${animal.breed} ${animal.type.toLowerCase()} was not approved. Please review requirements.`,
        type: 'MARKETPLACE',
      },
    });

    // Write audit log
    await req.prisma.auditLog.create({
      data: {
        adminId: req.user.id,
        action: 'REJECT_ANIMAL',
        target: id,
        details: `Rejected animal listing: ${animal.breed} ${animal.type}`,
      },
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/admin/withdrawals/pending ───────────
router.get('/withdrawals/pending', async (req, res, next) => {
  try {
    const pendingWithdrawals = await req.prisma.withdrawalRequest.findMany({
      where: { status: 'PENDING' },
      include: {
        user: {
          select: { fullName: true, phone: true }
        },
        wallet: true
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(pendingWithdrawals);
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/admin/audit-logs ────────────────────
router.get('/audit-logs', async (req, res, next) => {
  try {
    const logs = await req.prisma.auditLog.findMany({
      include: {
        admin: {
          select: { fullName: true, email: true }
        }
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(logs);
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/admin/broadcast ────────────────────
router.post('/broadcast', async (req, res, next) => {
  try {
    const { title, message, type } = req.body;

    if (!title || !message) {
      return res.status(400).json({ error: 'Title and message are required.' });
    }

    const validTypes = ['DEPOSIT', 'HOLIDAY', 'MARKETPLACE', 'DELIVERY', 'SYSTEM', 'PROMOTION', 'ORDER'];
    const notifType = type && validTypes.includes(type.toUpperCase()) ? type.toUpperCase() : 'SYSTEM';

    // Fetch all active users with their preferences
    const users = await req.prisma.user.findMany({
      where: { isActive: true },
      select: {
        id: true,
        notifDeposits: true,
        notifHolidays: true,
        notifDelivery: true,
        notifSystem: true,
        notifPromotions: true,
      },
    });

    // Filter users based on notification type and their preferences
    const filteredUsers = users.filter(u => {
      if (notifType === 'SYSTEM' && !u.notifSystem) return false;
      if (notifType === 'PROMOTION' && !u.notifPromotions) return false;
      if (notifType === 'HOLIDAY' && !u.notifHolidays) return false;
      if (notifType === 'DEPOSIT' && !u.notifDeposits) return false;
      if (notifType === 'DELIVERY' && !u.notifDelivery) return false;
      if (notifType === 'ORDER' && !u.notifDelivery) return false;
      return true;
    });

    if (filteredUsers.length > 0) {
      await req.prisma.notification.createMany({
        data: filteredUsers.map(u => ({
          userId: u.id,
          title,
          message,
          type: notifType,
          read: false,
        })),
      });
    }

    // Write audit log
    await req.prisma.auditLog.create({
      data: {
        adminId: req.user.id,
        action: 'BROADCAST_NOTIFICATION',
        target: 'all',
        details: `Broadcast: ${title}`,
      },
    });

    // Return a broadcast summary object for response consistency
    res.status(201).json({
      id: `broadcast-${Date.now()}`,
      userId: null,
      title,
      message,
      type: notifType,
      read: false,
      createdAt: new Date(),
    });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/admin/reports/financial ──────────────
router.get('/reports/financial', async (req, res, next) => {
  try {
    const prisma = req.prisma;

    // 1. Gather counts and sums
    const totalCustomers = await prisma.user.count({ where: { role: 'CUSTOMER' } });
    const activeCustomers = await prisma.user.count({ where: { role: 'CUSTOMER', isActive: true } });
    const aggregateUsers = await prisma.user.aggregate({
      _sum: {
        totalDeposits: true,
        totalSpent: true,
      }
    });

    const activeListings = await prisma.animal.count({ where: { isActive: true, isApproved: true } });
    const pendingApprovals = await prisma.animal.count({ where: { isActive: true, isApproved: false } });
    const totalOrders = await prisma.order.count();
    const pendingWithdrawals = await prisma.withdrawalRequest.count({ where: { status: 'PENDING' } });

    // 2. Tier distribution
    const gold = await prisma.user.count({ where: { tier: 'GOLD' } });
    const silver = await prisma.user.count({ where: { tier: 'SILVER' } });
    const bronze = await prisma.user.count({ where: { tier: 'BRONZE' } });

    // 3. Holidays
    const holidays = await prisma.holiday.findMany({
      select: {
        id: true,
        name: true,
        nameEn: true,
        deadline: true,
        isActive: true,
        minimumDeposit: true
      }
    });

    // 4. Analytics: Transactions, deposits, purchases
    const txns = await prisma.transaction.findMany();
    
    let totalDeposited = 0;
    let totalPurchased = 0;
    let depositCount = 0;
    let purchaseCount = 0;
    const monthlyData = {};

    txns.forEach(t => {
      const date = new Date(t.createdAt);
      const month = date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
      
      if (!monthlyData[month]) {
        monthlyData[month] = { deposits: 0, spent: 0 };
      }

      if (t.amount > 0) {
        totalDeposited += t.amount;
        depositCount++;
        monthlyData[month].deposits += t.amount;
      } else {
        const absAmount = Math.abs(t.amount);
        totalPurchased += absAmount;
        purchaseCount++;
        monthlyData[month].spent += absAmount;
      }
    });

    const savedMoney = totalDeposited - totalPurchased;

    res.json({
      generatedAt: new Date().toISOString(),
      summary: {
        totalCustomers,
        activeCustomers,
        totalSystemDeposits: aggregateUsers._sum.totalDeposits || 0,
        totalSystemSpent: aggregateUsers._sum.totalSpent || 0,
        activeListings,
        pendingApprovals,
        totalOrders,
        pendingWithdrawals,
      },
      tierBreakdown: {
        gold,
        silver,
        bronze,
      },
      holidays,
      totalDeposited,
      totalPurchased,
      savedMoney,
      monthlyData,
      depositCount,
      purchaseCount,
    });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/admin/holidays ─────────────────────
router.post('/holidays', async (req, res, next) => {
  try {
    const { name, nameEn, deadline, minimumDeposit, animalTypes, color, icon, description } = req.body;
    if (!name || !nameEn || !deadline || !minimumDeposit || !animalTypes) {
      return res.status(400).json({ error: 'Name, English name, deadline, minimum deposit, and animal types are required.' });
    }

    const holiday = await req.prisma.holiday.create({
      data: {
        name,
        nameEn,
        deadline: new Date(deadline),
        minimumDeposit: parseFloat(minimumDeposit),
        animalTypes: Array.isArray(animalTypes) ? animalTypes : [animalTypes],
        color: color || 'enkutatash',
        icon: icon || '🌸',
        description: description || '',
        isActive: true,
      }
    });

    res.status(201).json(holiday);
  } catch (err) {
    next(err);
  }
});

// ─── PUT /api/admin/holidays/:id ──────────────────
router.put('/holidays/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, nameEn, deadline, minimumDeposit, animalTypes, color, icon, description, isActive } = req.body;

    const data = {};
    if (name !== undefined) data.name = name;
    if (nameEn !== undefined) data.nameEn = nameEn;
    if (deadline !== undefined) data.deadline = new Date(deadline);
    if (minimumDeposit !== undefined) data.minimumDeposit = parseFloat(minimumDeposit);
    if (animalTypes !== undefined) data.animalTypes = Array.isArray(animalTypes) ? animalTypes : [animalTypes];
    if (color !== undefined) data.color = color;
    if (icon !== undefined) data.icon = icon;
    if (description !== undefined) data.description = description;
    if (isActive !== undefined) data.isActive = !!isActive;

    const holiday = await req.prisma.holiday.update({
      where: { id },
      data,
    });

    res.json(holiday);
  } catch (err) {
    next(err);
  }
});

// ─── DELETE /api/admin/holidays/:id ───────────────
router.delete('/holidays/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const holiday = await req.prisma.holiday.update({
      where: { id },
      data: { isActive: false },
    });
    res.json({ message: 'Holiday successfully deactivated.', holiday });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/admin/market-prices ────────────────
router.post('/market-prices', async (req, res, next) => {
  try {
    const { animalType, breed, grade, price } = req.body;
    if (!animalType || !breed || price === undefined || price === null) {
      return res.status(400).json({ error: 'Animal type, breed, and price are required.' });
    }

    const typeUpper = animalType.toUpperCase();
    const validatedPrice = parseFloat(price);

    const result = await req.prisma.$transaction(async (tx) => {
      const marketPrice = await tx.marketPrice.upsert({
        where: { animalType_breed: { animalType: typeUpper, breed } },
        update: { price: validatedPrice, grade: grade || 'Grade A', updatedAt: new Date() },
        create: { animalType: typeUpper, breed, grade: grade || 'Grade A', price: validatedPrice },
      });

      await tx.priceHistory.create({
        data: {
          animalType: typeUpper,
          breed,
          price: validatedPrice,
          updatedBy: req.user.id,
        }
      });

      return marketPrice;
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/admin/market-prices/history ─────────
router.get('/market-prices/history', async (req, res, next) => {
  try {
    const history = await req.prisma.priceHistory.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    res.json(history);
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/admin/market-prices ─────────────────
router.get('/market-prices', async (req, res, next) => {
  try {
    const prices = await req.prisma.marketPrice.findMany({
      orderBy: { animalType: 'asc' },
    });
    res.json(prices);
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/admin/payouts/pending ───────────────
router.get('/payouts/pending', async (req, res, next) => {
  try {
    // Exclude completed orders that have active refund requests
    const pendingRefundOrderIds = (await req.prisma.refundRequest.findMany({
      where: { status: 'PENDING' },
      select: { orderId: true }
    })).map(r => r.orderId);

    const pendingOrders = await req.prisma.order.findMany({
      where: {
        deliveryStatus: 'DELIVERED',
        isPaidToSeller: false,
        id: { notIn: pendingRefundOrderIds }, // Exclude disputed orders
      },
      include: {
        animal: true,
      }
    });

    const sellerPayouts = {};
    for (const order of pendingOrders) {
      const sellerId = order.animal.sellerId;
      const sellerName = order.animal.sellerName;
      const amount = Math.round(order.animalPrice * 0.95); 
      const commission = Math.round(order.animalPrice * 0.05);

      if (!sellerPayouts[sellerId]) {
        sellerPayouts[sellerId] = {
          sellerId,
          sellerName,
          totalAmount: 0,
          totalCommission: 0,
          orders: [],
        };
      }

      sellerPayouts[sellerId].totalAmount += amount;
      sellerPayouts[sellerId].totalCommission += commission;
      sellerPayouts[sellerId].orders.push({
        id: order.id,
        animalBreed: order.animalBreed,
        animalType: order.animalType,
        animalPrice: order.animalPrice,
        payoutAmount: amount,
        createdAt: order.createdAt,
      });
    }

    res.json(Object.values(sellerPayouts));
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/admin/payouts/process ──────────────
router.post('/payouts/process', async (req, res, next) => {
  try {
    const { sellerId } = req.body;
    if (!sellerId) {
      return res.status(400).json({ error: 'Seller ID is required to process payouts.' });
    }

    if (sellerId === req.user.id) {
      return res.status(403).json({ error: 'Separation of Duties: You cannot process your own escrow payouts.' });
    }

    const result = await req.prisma.$transaction(async (tx) => {
      // Get all orders with pending refund requests so we can exclude them
      const pendingRefundOrderIds = (await tx.refundRequest.findMany({
        where: { status: 'PENDING' },
        select: { orderId: true }
      })).map(r => r.orderId);

      const unpaidOrders = await tx.order.findMany({
        where: {
          deliveryStatus: 'DELIVERED',
          isPaidToSeller: false,
          id: { notIn: pendingRefundOrderIds }, // Exclude disputed orders
          animal: {
            sellerId
          }
        },
        include: {
          animal: true
        }
      });

      if (unpaidOrders.length === 0) {
        throw new Error('No pending payouts found for this seller.');
      }

      let totalPayout = 0;
      for (const order of unpaidOrders) {
        // Round each order's payout to prevent floating-point drift
        totalPayout += Math.round(order.animalPrice * 0.95);
      }

      const sellerWallet = await tx.wallet.findFirst({
        where: { userId: sellerId, isFamily: false }
      });

      if (!sellerWallet) {
        throw new Error('Seller wallet not found.');
      }

      const payout = await tx.payout.create({
        data: {
          sellerId,
          amount: totalPayout,
          status: 'PAID',
        }
      });

      await tx.order.updateMany({
        where: {
          id: { in: unpaidOrders.map(o => o.id) }
        },
        data: {
          isPaidToSeller: true,
          payoutId: payout.id,
        }
      });

      await tx.wallet.update({
        where: { id: sellerWallet.id },
        data: { balance: { increment: totalPayout } }
      });

      await tx.transaction.create({
        data: {
          walletId: sellerWallet.id,
          amount: totalPayout,
          type: 'DEPOSIT',
          description: `Weekly payout processed for ${unpaidOrders.length} completed sales`,
          method: 'Weekly Payout',
          balanceType: 'AVAILABLE',
        }
      });

      await tx.notification.create({
        data: {
          userId: sellerId,
          title: 'Payout Processed 💰',
          message: `Your weekly payout of ${totalPayout.toLocaleString()} ETB has been processed and added to your wallet.`,
          type: 'SYSTEM',
        }
      });

      await tx.auditLog.create({
        data: {
          adminId: req.user.id,
          action: 'PROCESS_PAYOUT',
          target: sellerId,
          details: `Processed payout ID: ${payout.id} for seller ${sellerId}. Total amount: ${totalPayout} ETB.`,
        }
      });

      return payout;
    });

    res.json(result);
  } catch (err) {
    if (err.message.includes('No') || err.message.includes('wallet')) {
      return res.status(400).json({ error: err.message });
    }
    next(err);
  }
});

// ─── POST /api/admin/partners ─────────────────────
router.post('/partners', async (req, res, next) => {
  try {
    const { phone, fullName, password, role } = req.body;
    if (!phone || !fullName || !password || !role) {
      return res.status(400).json({ error: 'Phone, full name, password, and role (FATTENER/TRADER/SELLER) are required.' });
    }
    const roleUpper = role.toUpperCase();
    if (!['FATTENER', 'TRADER', 'SELLER'].includes(roleUpper)) {
      return res.status(400).json({ error: 'Role must be FATTENER, TRADER, or SELLER.' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    
    const partner = await req.prisma.user.create({
      data: {
        phone,
        fullName,
        passwordHash,
        role: roleUpper,
        avatar: fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2),
      }
    });

    await req.prisma.wallet.create({
      data: {
        userId: partner.id,
        label: 'Primary Wallet',
        balance: 0,
      }
    });

    const { passwordHash: _, ...safePartner } = partner;
    res.status(201).json(safePartner);
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/admin/tickets ───────────────────────
router.get('/tickets', async (req, res, next) => {
  try {
    const tickets = await req.prisma.supportTicket.findMany({
      include: {
        user: { select: { fullName: true, phone: true } }
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(tickets);
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/admin/tickets/:id/resolve ──────────
router.post('/tickets/:id/resolve', async (req, res, next) => {
  try {
    const { id } = req.params;
    const ticket = await req.prisma.supportTicket.findUnique({ where: { id } });
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found.' });
    }

    if (ticket.userId === req.user.id) {
      return res.status(403).json({ error: 'Separation of Duties: You cannot resolve your own support ticket.' });
    }

    const updated = await req.prisma.supportTicket.update({
      where: { id },
      data: { status: 'RESOLVED' },
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/admin/refunds/pending ───────────────
router.get('/refunds/pending', async (req, res, next) => {
  try {
    const refunds = await req.prisma.refundRequest.findMany({
      where: { status: 'PENDING' },
      include: {
        user: { select: { fullName: true, phone: true } },
        order: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(refunds);
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/admin/refunds/:id/process ──────────
router.post('/refunds/:id/process', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { approve, adminNote } = req.body;

    if (approve === undefined) {
      return res.status(400).json({ error: 'Process decision (approve: true/false) is required.' });
    }

    const result = await req.prisma.$transaction(async (tx) => {
      const refund = await tx.refundRequest.findUnique({
        where: { id },
        include: { 
          order: {
            include: { animal: true }
          }
        }
      });

      if (!refund) {
        throw new Error('Refund request not found.');
      }

      if (refund.status !== 'PENDING') {
        throw new Error('This refund request has already been processed.');
      }

      if (refund.userId === req.user.id || refund.order.animal.sellerId === req.user.id) {
        throw new Error('Separation of Duties: You cannot process a refund for an order where you are the buyer or seller.');
      }

      if (approve) {
        const wallet = await tx.wallet.findFirst({
          where: { userId: refund.userId, isFamily: false }
        });

        if (!wallet) {
          throw new Error('User primary wallet not found.');
        }

        // FIX #2: Mark the order as CANCELLED so it is permanently excluded from
        // the weekly payout queue and can never be double-credited to the seller.
        await tx.order.update({
          where: { id: refund.orderId },
          data: {
            deliveryStatus: 'CANCELLED',
            cancelledAt: new Date(),
            cancelReason: `Refund approved by admin. Note: ${adminNote || 'N/A'}`,
          },
        });

        await tx.wallet.update({
          where: { id: wallet.id },
          data: { balance: { increment: refund.amount } }
        });

        await tx.transaction.create({
          data: {
            walletId: wallet.id,
            amount: refund.amount,
            type: 'DEPOSIT',
            description: `Refund approved for cancelled order #${refund.orderId.slice(-6)}`,
            method: 'Refund Credit',
            balanceType: 'AVAILABLE',
          }
        });

        await tx.notification.create({
          data: {
            userId: refund.userId,
            title: 'Refund Approved ✓',
            message: `Your refund of ${refund.amount.toLocaleString()} ETB for order #${refund.orderId.slice(-6)} has been approved and credited to your wallet.`,
            type: 'SYSTEM',
          }
        });

        // Decrement user totalSpent stat
        const user = await tx.user.findUnique({ where: { id: refund.userId } });
        if (user) {
          await tx.user.update({
            where: { id: refund.userId },
            data: { totalSpent: Math.max(0, user.totalSpent - refund.amount) }
          });
        }
      } else {
        await tx.notification.create({
          data: {
            userId: refund.userId,
            title: 'Refund Rejected ✗',
            message: `Your refund request for order #${refund.orderId.slice(-6)} was rejected. Note: ${adminNote || ''}`,
            type: 'SYSTEM',
          }
        });
      }

      const updated = await tx.refundRequest.update({
        where: { id },
        data: {
          status: approve ? 'APPROVED' : 'REJECTED',
          adminNote: adminNote || null,
          processedAt: new Date(),
        }
      });

      return updated;
    });

    res.json(result);
  } catch (err) {
    if (err.message.includes('found') || err.message.includes('processed')) {
      return res.status(400).json({ error: err.message });
    }
    next(err);
  }
});

// ─── GET /api/admin/orders ────────────────────────
router.get('/orders', async (req, res, next) => {
  try {
    const orders = await req.prisma.order.findMany({
      include: {
        user: { select: { fullName: true, phone: true } },
        animal: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(orders);
  } catch (err) {
    next(err);
  }
});

export default router;
