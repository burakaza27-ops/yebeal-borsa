import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { parseAndValidateInt, parseAndValidateFloat } from '../utils/validation.js';

const router = Router();
router.use(authenticate);

// ─── GET /api/transactions ───────────────────────
router.get('/', async (req, res, next) => {
  try {
    const { walletId, type, limit, offset } = req.query;

    const where = {};

    // Validate numerical parameters
    const limitVal = parseAndValidateInt(limit, 'limit', false, 1) || 50;
    const offsetVal = parseAndValidateInt(offset, 'offset', false, 0) || 0;

    // Only show transactions for user's wallets
    const userWallets = await req.prisma.wallet.findMany({
      where: { userId: req.user.id },
      select: { id: true },
    });
    const walletIds = userWallets.map(w => w.id);
    where.walletId = { in: walletIds };

    if (walletId) {
      if (!walletIds.includes(walletId)) {
        return res.status(403).json({ error: 'Access denied.' });
      }
      where.walletId = walletId;
    }

    if (type) {
      const allowedTypes = ['DEPOSIT', 'WITHDRAWAL', 'PURCHASE', 'TRANSFER'];
      const typeUpper = type.toUpperCase();
      if (!allowedTypes.includes(typeUpper)) {
        return res.status(400).json({ error: `Invalid transaction type "${type}". Must be one of: ${allowedTypes.join(', ')}` });
      }
      where.type = typeUpper;
    }

    const [transactions, total] = await Promise.all([
      req.prisma.transaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limitVal,
        skip: offsetVal,
        include: { wallet: { select: { label: true } } },
      }),
      req.prisma.transaction.count({ where }),
    ]);

    res.json({ transactions, total, limit: limitVal, offset: offsetVal });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/transactions/deposit ──────────────
router.post('/deposit', async (req, res, next) => {
  try {
    const { walletId, amount, description, method, holidayId, idempotencyKey } = req.body;

    if (!walletId || amount === undefined || amount === null) {
      return res.status(400).json({ error: 'Valid wallet ID and amount are required.' });
    }

    if (!idempotencyKey) {
      return res.status(400).json({ error: 'Idempotency key is required to prevent double-spending.' });
    }

    const validatedAmount = parseAndValidateFloat(amount, 'amount', true, 0.01);

    // Enforce basic transaction limits
    if (validatedAmount < 100) {
      return res.status(400).json({ error: 'Minimum deposit is 100 ETB.' });
    }
    if (validatedAmount > 25000) {
      return res.status(400).json({ error: 'Maximum deposit is 25,000 ETB per transaction.' });
    }

    // Verify wallet belongs to user
    const wallet = await req.prisma.wallet.findFirst({
      where: { id: walletId, userId: req.user.id },
    });

    if (!wallet) {
      return res.status(404).json({ error: 'Wallet not found.' });
    }

    const result = await req.prisma.$transaction(async (tx) => {
      // 0. Idempotency Check
      const existingKey = await tx.idempotencyKey.findUnique({
        where: { key: idempotencyKey }
      });
      if (existingKey) {
        throw new Error('Idempotency conflict: This transaction was already processed.');
      }

      // Record idempotency key (expires in 24 hours)
      await tx.idempotencyKey.create({
        data: {
          key: idempotencyKey,
          userId: req.user.id,
          action: 'DEPOSIT',
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
        }
      });

      // 0.5 Pessimistic lock the wallet row
      await tx.$executeRaw`SELECT * FROM "wallets" WHERE "id" = ${walletId} FOR UPDATE`;

      // 1. Fetch user to check KYC limits and current monthly deposits
      const userRecord = await tx.user.findUnique({ where: { id: req.user.id } });
      
      // KYC Limits
      const kycLevel = userRecord.kycLevel || 'BASIC';
      let limitForKyc = 5000;
      if (kycLevel === 'STANDARD') limitForKyc = 20000;
      else if (kycLevel === 'VERIFIED') limitForKyc = 25000;

      if (validatedAmount > limitForKyc) {
        throw new Error(`Deposit amount exceeds limit for your KYC level (${kycLevel}): Max ${limitForKyc} ETB.`);
      }

      // Monthly Limit Check (500k ETB per month)
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

      const monthlyDeposits = await tx.transaction.aggregate({
        where: {
          wallet: { userId: req.user.id },
          type: 'DEPOSIT',
          createdAt: {
            gte: startOfMonth,
            lte: endOfMonth
          }
        },
        _sum: {
          amount: true
        }
      });
      const monthlySum = (monthlyDeposits._sum.amount || 0) + validatedAmount;
      if (monthlySum > 500000) {
        throw new Error('Monthly deposit limit of 500,000 ETB exceeded.');
      }

      // ── Determine lock vs available split for holiday-targeted deposits ──
      let bonusAmount = 0;
      let lockUntilDate = null;
      let amountToLock = validatedAmount;
      let amountToAvailable = 0;
      let existingGoal = null;

      if (holidayId) {
        const holiday = await tx.holiday.findUnique({ where: { id: holidayId } });
        if (!holiday || !holiday.isActive) {
          throw new Error('Target holiday not found or inactive.');
        }
        lockUntilDate = holiday.deadline;

        // Look up existing goal BEFORE wallet update to calculate the correct split
        existingGoal = await tx.customerHoliday.findUnique({
          where: { userId_holidayId: { userId: req.user.id, holidayId } }
        });

        if (existingGoal) {
          if (existingGoal.status === 'completed') {
            // Goal already completed — no locking needed, entire deposit goes to available
            amountToLock = 0;
            amountToAvailable = validatedAmount;
          } else {
            // Lock only what the goal still needs; excess goes to available balance
            const remaining = Math.max(0, existingGoal.targetAmount - existingGoal.currentAmount);
            amountToLock = Math.min(validatedAmount, remaining);
            amountToAvailable = validatedAmount - amountToLock;
          }
        } else {
          // No existing goal — check minimum deposit requirement
          if (validatedAmount < holiday.minimumDeposit) {
            throw new Error(`Initial deposit to set up this holiday goal must be at least ${holiday.minimumDeposit} ETB.`);
          }
        }

        // Calculate bonus credits ONLY on the portion actually being locked
        const daysDiff = Math.ceil((lockUntilDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        let bonusPercent = 0;
        if (daysDiff >= 180) bonusPercent = 0.05;
        else if (daysDiff >= 90) bonusPercent = 0.03;
        else if (daysDiff >= 30) bonusPercent = 0.02;

        bonusAmount = Math.round(amountToLock * bonusPercent);
      }

      // 2. Update wallet balances with correct split
      const walletDataUpdate = {};
      if (holidayId && lockUntilDate) {
        if (amountToLock > 0) {
          walletDataUpdate.lockedBalance = { increment: amountToLock };
          walletDataUpdate.platformCredits = { increment: bonusAmount };
          walletDataUpdate.holidayId = holidayId;

          if (!wallet.lockedUntil || lockUntilDate > wallet.lockedUntil) {
            walletDataUpdate.lockedUntil = lockUntilDate;
          }
        }
        if (amountToAvailable > 0) {
          walletDataUpdate.balance = { increment: amountToAvailable };
        }
        // Edge case: completed goal — everything goes to available
        if (amountToLock === 0 && amountToAvailable === 0) {
          walletDataUpdate.balance = { increment: validatedAmount };
        }
      } else {
        walletDataUpdate.balance = { increment: validatedAmount };
      }

      const updatedWallet = await tx.wallet.update({
        where: { id: walletId },
        data: walletDataUpdate,
      });

      // 3. Create transaction record
      const txn = await tx.transaction.create({
        data: {
          walletId,
          amount: validatedAmount,
          type: 'DEPOSIT',
          description: description || (holidayId ? 'Holiday Savings Locked Deposit' : 'Deposit'),
          method: method || 'Telebirr',
          holidayId: holidayId || null,
          bonusAmount,
          lockedUntil: amountToLock > 0 ? lockUntilDate : null,
          balanceType: amountToLock > 0 ? 'LOCKED' : 'AVAILABLE',
        },
      });

      // 4. Update user total deposits stats (tiering auto-upgrade disabled per spec: Tier Q10)
      await tx.user.update({
        where: { id: req.user.id },
        data: {
          totalDeposits: { increment: validatedAmount },
        },
      });

      // 5. Update customer holiday progress (only if goal is active or needs creation)
      if (holidayId) {
        if (existingGoal && existingGoal.status !== 'completed') {
          // Credit only the locked portion to the goal
          const newAmount = existingGoal.currentAmount + amountToLock;
          const status = newAmount >= existingGoal.targetAmount ? 'completed' : 'active';
          await tx.customerHoliday.update({
            where: { id: existingGoal.id },
            data: { currentAmount: newAmount, status }
          });
        } else if (!existingGoal) {
          // Auto-create a new goal — use deposit as both target and current
          await tx.customerHoliday.create({
            data: {
              userId: req.user.id,
              holidayId,
              targetAmount: validatedAmount,
              currentAmount: validatedAmount,
              status: 'active'
            }
          });
        }
        // If existingGoal.status === 'completed' → skip, goal is done
      } else if (!wallet.isFamily) {
        // Auto-credit to earliest active holiday goal for general available deposits
        const activeGoals = await tx.customerHoliday.findMany({
          where: { userId: req.user.id, status: 'active' },
          include: { holiday: true },
          orderBy: { holiday: { deadline: 'asc' } },
        });

        if (activeGoals.length > 0) {
          const earliest = activeGoals[0];
          const newAmount = Math.min(earliest.currentAmount + validatedAmount, earliest.targetAmount);
          const status = newAmount >= earliest.targetAmount ? 'completed' : 'active';
          await tx.customerHoliday.update({
            where: { id: earliest.id },
            data: { currentAmount: newAmount, status },
          });
        }
      }

      // 6. Create notification — inform user about any split
      let notifMessage;
      if (holidayId) {
        if (amountToAvailable > 0 && amountToLock > 0) {
          notifMessage = `${amountToLock.toLocaleString()} ETB locked for your goal (Bonus: ${bonusAmount.toLocaleString()} Credits). ${amountToAvailable.toLocaleString()} ETB added to available balance.`;
        } else if (amountToLock === 0) {
          notifMessage = `Goal already completed. ${validatedAmount.toLocaleString()} ETB added to your available balance.`;
        } else {
          notifMessage = `Your locked deposit of ${validatedAmount.toLocaleString()} ETB (Bonus: ${bonusAmount.toLocaleString()} Credits) has been locked until ${lockUntilDate.toLocaleDateString()}.`;
        }
      } else {
        notifMessage = `Your deposit of ${validatedAmount.toLocaleString()} ETB via ${method || 'Telebirr'} has been confirmed.`;
      }

      const notification = await tx.notification.create({
        data: {
          userId: req.user.id,
          title: holidayId ? 'Holiday Deposit ✓' : 'Deposit Confirmed ✓',
          message: notifMessage,
          type: 'DEPOSIT',
        },
      });

      return { wallet: updatedWallet, transaction: txn, notification };
    });

    res.status(201).json(result);
  } catch (err) {
    if (err.message.includes('exceeds') || err.message.includes('limit') || err.message.includes('inactive')) {
      return res.status(400).json({ error: err.message });
    }
    next(err);
  }
});

export default router;
