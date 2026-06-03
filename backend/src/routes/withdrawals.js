/* ============================================
   Withdrawal Routes — Request and Process
   ============================================ */

import { Router } from 'express';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { parseAndValidateFloat } from '../utils/validation.js';
import { validateBody } from '../middleware/validate.js';
import { withdrawalSchema } from '../utils/schemas.js';

const router = Router();

// ─── GET /api/withdrawals — Customer list ────────
router.get('/', authenticate, async (req, res, next) => {
  try {
    const query = { userId: req.user.id };
    
    // If admin is requesting, they might want all pending or all requests
    // but typically admin gets it from /api/admin/withdrawals.
    // For general customer, they get their own.
    const requests = await req.prisma.withdrawalRequest.findMany({
      where: query,
      include: {
        wallet: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(requests);
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/withdrawals — Request withdrawal ──
// Valid withdrawal methods
const VALID_WITHDRAWAL_METHODS = ['TELEBIRR', 'CBE_BIRR', 'BANK_TRANSFER'];
const METHOD_LABELS = { TELEBIRR: 'Telebirr', CBE_BIRR: 'CBE Birr', BANK_TRANSFER: 'Bank Transfer' };

router.post('/', authenticate, validateBody(withdrawalSchema), async (req, res, next) => {
  try {
    const { walletId, amount, reason, withdrawalMethod, accountNumber, accountName } = req.body;

    const cleanedAccount = accountNumber.trim();

    // Validate phone format for Telebirr and CBE Birr (Ethiopian phone: 09/+2519, 10+ chars)
    if (withdrawalMethod === 'TELEBIRR' || withdrawalMethod === 'CBE_BIRR') {
      const phoneRegex = /^(\+251|0)(9|7)\d{8}$/;
      if (!phoneRegex.test(cleanedAccount.replace(/\s/g, ''))) {
        return res.status(400).json({ error: 'Invalid phone number. Use format 09xxxxxxxx or +2519xxxxxxxx.' });
      }
    }

    // Validate bank account number length for bank transfers
    if (withdrawalMethod === 'BANK_TRANSFER') {
      if (cleanedAccount.length < 6) {
        return res.status(400).json({ error: 'Bank account number must be at least 6 characters.' });
      }
      if (!accountName || typeof accountName !== 'string' || accountName.trim().length < 2) {
        return res.status(400).json({ error: 'Account holder name is required for bank transfers.' });
      }
    }

    const validatedAmount = parseAndValidateFloat(amount, 'amount', true, 0.01);

    const result = await req.prisma.$transaction(async (tx) => {
      // (The active orders blocker was removed here to allow sellers to withdraw available funds)

      // Get wallet
      const walletInitial = await tx.wallet.findUnique({
        where: { id: walletId },
      });

      if (!walletInitial || walletInitial.userId !== req.user.id) {
        throw new Error('Wallet not found.');
      }

      // Pessimistic lock the wallet row
      await tx.$executeRaw`SELECT * FROM "wallets" WHERE "id" = ${walletId} FOR UPDATE`;

      const wallet = await tx.wallet.findUnique({
        where: { id: walletId },
      });

      // Determine available vs locked portions of current amount
      const remainingAvailable = wallet.balance;
      const remainingLocked = wallet.lockedBalance;
      
      const frozenAvailableDeduction = Math.round(Math.min(remainingAvailable, validatedAmount));
      const lockedPartNeeded = validatedAmount - frozenAvailableDeduction;
      
      let frozenLockedDeduction = 0;
      let frozenPenaltyAmount = 0;
      if (lockedPartNeeded > 0) {
        // Enforce 30% early withdrawal penalty on locked portion
        frozenLockedDeduction = Math.round(lockedPartNeeded / 0.70);
        frozenPenaltyAmount = Math.round(frozenLockedDeduction - lockedPartNeeded);
      }

      const totalDeductedFromWallet = frozenAvailableDeduction + frozenLockedDeduction;
      const currentTotalWalletFunds = wallet.balance + wallet.lockedBalance;

      // Enforce 100 ETB reserve requirement
      if (currentTotalWalletFunds - totalDeductedFromWallet < 100) {
        throw new Error('Withdrawal rejected. A minimum reserve of 100 ETB must remain in your wallet.');
      }
      
      if (frozenLockedDeduction > remainingLocked) {
        throw new Error('Insufficient locked funds for this withdrawal.');
      }

      // Deduct immediately (Immediate Deduction Architecture)
      await tx.wallet.update({
        where: { id: walletId },
        data: {
          balance: { decrement: frozenAvailableDeduction },
          lockedBalance: { decrement: frozenLockedDeduction },
        },
      });

      // Create withdrawal request WITH frozen penalty breakdown
      const request = await tx.withdrawalRequest.create({
        data: {
          userId: req.user.id,
          walletId,
          amount: validatedAmount,
          reason: reason || 'Personal withdrawal',
          withdrawalMethod,
          accountNumber: cleanedAccount,
          accountName: accountName?.trim() || null,
          status: 'PENDING',
          availableDeduction: frozenAvailableDeduction,
          lockedDeduction: frozenLockedDeduction,
          penaltyAmount: frozenPenaltyAmount,
        },
      });

      // Create notification with destination info
      const methodLabel = METHOD_LABELS[withdrawalMethod] || withdrawalMethod;
      let notificationMessage = `Your withdrawal request for ${validatedAmount.toLocaleString()} ETB to ${methodLabel} (${cleanedAccount}) is pending admin approval. The funds have been held from your balance.`;
      if (lockedPartNeeded > 0) {
        notificationMessage += ` Warning: ${lockedPartNeeded.toLocaleString()} ETB was pulled early from locked savings with a 30% penalty (${frozenPenaltyAmount.toLocaleString()} ETB).`;
      }

      await tx.notification.create({
        data: {
          userId: req.user.id,
          title: 'Withdrawal Requested',
          message: notificationMessage,
          type: 'SYSTEM',
        },
      });

      // Create a PENDING_WITHDRAWAL Transaction record so the user sees the deduction
      await tx.transaction.create({
        data: {
          walletId,
          amount: -totalDeductedFromWallet,
          type: 'WITHDRAWAL',
          description: `Withdrawal Request: ${reason || 'Personal withdrawal'}${frozenPenaltyAmount > 0 ? ` (Includes ${frozenPenaltyAmount} ETB penalty)` : ''}`,
          method: withdrawalMethod,
          balanceType: frozenLockedDeduction > 0 ? 'LOCKED' : 'AVAILABLE',
        },
      });

      return request;
    });

    res.status(201).json(result);
  } catch (err) {
    if (err.message.includes('balance') || err.message.includes('found') || err.message.includes('withdraw') || err.message.includes('reserve') || err.message.includes('orders')) {
      return res.status(400).json({ error: err.message });
    }
    next(err);
  }
});

// ─── POST /api/withdrawals/:id/process — Admin ────
router.post('/:id/process', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { approve, adminNote } = req.body;

    if (approve === undefined) {
      return res.status(400).json({ error: 'Process decision (approve: true/false) is required.' });
    }

    const result = await req.prisma.$transaction(async (tx) => {
      // Find request
      const request = await tx.withdrawalRequest.findUnique({
        where: { id },
        include: { wallet: true },
      });

      if (!request) {
        throw new Error('Withdrawal request not found.');
      }

      if (request.status !== 'PENDING') {
        throw new Error('This withdrawal request has already been processed.');
      }

      if (request.userId === req.user.id) {
        throw new Error('Separation of Duties: You cannot process your own withdrawal request.');
      }

      if (approve) {
        // Balances were already deducted when requested, so we just finalize
        const availablePart = request.availableDeduction;
        const lockedDeduction = request.lockedDeduction;
        const penalty = request.penaltyAmount;

        // FIX #1: If locked savings were withdrawn, sync the CustomerHoliday goal progress
        // atomically so it never diverges from the actual lockedBalance on the wallet.
        if (lockedDeduction > 0) {
          const activeGoal = await tx.customerHoliday.findFirst({
            where: { userId: request.userId, status: 'active' },
            orderBy: { id: 'desc' },
          });
          if (activeGoal) {
            const newCurrentAmount = Math.max(0, activeGoal.currentAmount - lockedDeduction);
            await tx.customerHoliday.update({
              where: { id: activeGoal.id },
              data: { currentAmount: newCurrentAmount },
            });
          }
        }



        await tx.notification.create({
          data: {
            userId: request.userId,
            title: 'Withdrawal Approved ✓',
            message: `Your withdrawal of ${request.amount.toLocaleString()} ETB has been processed.`,
            type: 'SYSTEM',
          },
        });
      } else {
        // Rejection: Refund the held funds back to the user's wallet
        const availablePart = request.availableDeduction;
        const lockedDeduction = request.lockedDeduction;
        const totalRefund = availablePart + lockedDeduction;

        // Refund balances
        await tx.wallet.update({
          where: { id: request.walletId },
          data: {
            balance: { increment: availablePart },
            lockedBalance: { increment: lockedDeduction },
          },
        });

        // Create a REFUND transaction
        await tx.transaction.create({
          data: {
            walletId: request.walletId,
            amount: totalRefund,
            type: 'DEPOSIT',
            description: `Refund: Withdrawal rejected. Note: ${adminNote || 'N/A'}`,
            method: 'System Refund',
            balanceType: lockedDeduction > 0 ? 'LOCKED' : 'AVAILABLE',
          },
        });

        await tx.notification.create({
          data: {
            userId: request.userId,
            title: 'Withdrawal Rejected ✗',
            message: `Your withdrawal request of ${request.amount.toLocaleString()} ETB was rejected. Funds have been returned to your wallet. Note: ${adminNote || ''}`,
            type: 'SYSTEM',
          },
        });
      }

      // Update withdrawal request status
      const updatedRequest = await tx.withdrawalRequest.update({
        where: { id },
        data: {
          status: approve ? 'APPROVED' : 'REJECTED',
          adminNote: adminNote || null,
          processedAt: new Date(),
        },
      });

      // Create notification for user
      await tx.notification.create({
        data: {
          userId: request.userId,
          title: approve ? 'Withdrawal Approved ✓' : 'Withdrawal Rejected ✗',
          message: approve
            ? `Your withdrawal of ${request.amount.toLocaleString()} ETB has been approved and processed.`
            : `Your withdrawal request was rejected. ${adminNote || ''}`,
          type: 'SYSTEM',
        },
      });

      // Write Audit Log
      await tx.auditLog.create({
        data: {
          adminId: req.user.id,
          action: approve ? 'APPROVE_WITHDRAWAL' : 'REJECT_WITHDRAWAL',
          target: id,
          details: `${approve ? 'Approved' : 'Rejected'} withdrawal of ${request.amount} ETB. ${adminNote || ''}`,
        },
      });

      return updatedRequest;
    });

    res.json(result);
  } catch (err) {
    if (err.message.includes('found') || err.message.includes('processed') || err.message.includes('balance') || err.message.includes('reserve')) {
      return res.status(400).json({ error: err.message });
    }
    next(err);
  }
});

export default router;
