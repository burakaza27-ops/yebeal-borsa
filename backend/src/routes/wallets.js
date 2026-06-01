/* ============================================
   Wallet Routes — CRUD, Family, Transfer, Limits
   ============================================ */

import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { parseAndValidateFloat } from '../utils/validation.js';

const router = Router();
router.use(authenticate);

// ─── GET /api/wallets ────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const wallets = await req.prisma.wallet.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'asc' },
    });
    res.json(wallets);
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/wallets/:id ────────────────────────
router.get('/:id', async (req, res, next) => {
  try {
    const wallet = await req.prisma.wallet.findFirst({
      where: { id: req.params.id, userId: req.user.id },
      include: {
        transactions: { orderBy: { createdAt: 'desc' }, take: 20 },
      },
    });

    if (!wallet) return res.status(404).json({ error: 'Wallet not found.' });
    res.json(wallet);
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/wallets/family — Add family wallet ─
router.post('/family', async (req, res, next) => {
  try {
    const { name, spendingLimit } = req.body;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: 'Family member name is required.' });
    }

    const wallet = await req.prisma.wallet.create({
      data: {
        userId: req.user.id,
        label: `Family - ${name.trim()}`,
        balance: 0,
        isFamily: true,
        familyMemberName: name.trim(),
        spendingLimit: spendingLimit !== undefined && spendingLimit !== null ? parseAndValidateFloat(spendingLimit, 'spendingLimit', false, 0.01) : null,
      },
    });

    res.status(201).json(wallet);
  } catch (err) {
    next(err);
  }
});

// ─── DELETE /api/wallets/:id — Remove family wallet
router.delete('/:id', async (req, res, next) => {
  try {
    const wallet = await req.prisma.wallet.findFirst({
      where: { id: req.params.id, userId: req.user.id, isFamily: true },
    });

    if (!wallet) {
      return res.status(404).json({ error: 'Family wallet not found.' });
    }

    await req.prisma.wallet.delete({ where: { id: req.params.id } });
    res.json({ message: 'Family wallet removed.' });
  } catch (err) {
    next(err);
  }
});

// ─── PUT /api/wallets/:id/limit — Update spending limit
router.put('/:id/limit', async (req, res, next) => {
  try {
    const { limit } = req.body;

    const wallet = await req.prisma.wallet.findFirst({
      where: { id: req.params.id, userId: req.user.id },
    });

    if (!wallet) return res.status(404).json({ error: 'Wallet not found.' });

    const updated = await req.prisma.wallet.update({
      where: { id: req.params.id },
      data: { spendingLimit: limit !== undefined && limit !== null ? parseAndValidateFloat(limit, 'limit', false, 0.01) : null },
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/wallets/transfer ──────────────────
router.post('/transfer', async (req, res, next) => {
  try {
    const { fromWalletId, toWalletId, amount } = req.body;

    if (!fromWalletId || !toWalletId || amount === undefined || amount === null) {
      return res.status(400).json({ error: 'Valid from, to wallet IDs and amount are required.' });
    }

    if (fromWalletId === toWalletId) {
      return res.status(400).json({ error: 'Source and destination wallets must be different.' });
    }

    const validatedAmount = parseAndValidateFloat(amount, 'amount', true, 0.01);

    // Atomic interactive transaction — prevents double-spend concurrency race conditions
    const result = await req.prisma.$transaction(async (tx) => {
      // 0. Pessimistic lock the wallet rows in consistent ID order to prevent deadlocks
      const sortedIds = [fromWalletId, toWalletId].sort();
      for (const id of sortedIds) {
        await tx.$executeRaw`SELECT * FROM "wallets" WHERE "id" = ${id} FOR UPDATE`;
      }

      // 1. Fetch fromWallet inside transaction
      const fromWallet = await tx.wallet.findUnique({
        where: { id: fromWalletId },
      });

      if (!fromWallet || fromWallet.userId !== req.user.id) {
        throw new Error('Source wallet not found.');
      }

      if (fromWallet.balance < validatedAmount) {
        throw new Error('Insufficient balance in source wallet.');
      }

      if (!fromWallet.isFamily && fromWallet.balance - validatedAmount < 100) {
        throw new Error('Transfer rejected. A minimum reserve of 100 ETB must remain in your primary wallet.');
      }

      // 2. Fetch toWallet inside transaction
      const toWallet = await tx.wallet.findUnique({
        where: { id: toWalletId },
      });

      if (!toWallet || toWallet.userId !== req.user.id) {
        throw new Error('Destination wallet not found.');
      }

      // FIX #3: Enforce spendingLimit on family wallets — a transfer that puts the
      // balance over the cap must be blocked, not silently allowed.
      if (toWallet.isFamily && toWallet.spendingLimit !== null && toWallet.spendingLimit !== undefined) {
        const newBalance = toWallet.balance + validatedAmount;
        if (newBalance > toWallet.spendingLimit) {
          throw new Error(
            `Transfer rejected. This family wallet has a spending limit of ${toWallet.spendingLimit.toLocaleString()} ETB. ` +
            `Current balance: ${toWallet.balance.toLocaleString()} ETB. ` +
            `Transferring ${validatedAmount.toLocaleString()} ETB would exceed the limit by ${Math.round(newBalance - toWallet.spendingLimit).toLocaleString()} ETB.`
          );
        }
      }

      // 3. Update balances
      const updatedFrom = await tx.wallet.update({
        where: { id: fromWalletId },
        data: { balance: { decrement: validatedAmount } },
      });

      const updatedTo = await tx.wallet.update({
        where: { id: toWalletId },
        data: { balance: { increment: validatedAmount } },
      });

      // 4. Create transaction records
      await tx.transaction.create({
        data: {
          walletId: fromWalletId,
          amount: -validatedAmount,
          type: 'TRANSFER',
          description: `Transfer to ${toWallet.label}`,
          method: 'Internal',
        },
      });

      await tx.transaction.create({
        data: {
          walletId: toWalletId,
          amount: validatedAmount,
          type: 'TRANSFER',
          description: `Transfer from ${fromWallet.label}`,
          method: 'Internal',
        },
      });

      return {
        fromBalance: updatedFrom.balance,
        toBalance: updatedTo.balance
      };
    });

    res.json({ message: 'Transfer successful.', fromBalance: result.fromBalance, toBalance: result.toBalance });
  } catch (err) {
    if (err.message.includes('found') || err.message.includes('balance') || err.message.includes('limit') || err.message.includes('spending') || err.message.includes('rejected')) {
      return res.status(400).json({ error: err.message });
    }
    next(err);
  }
});

export default router;
