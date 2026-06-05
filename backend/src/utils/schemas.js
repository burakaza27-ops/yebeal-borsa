import { z } from 'zod';

export const depositSchema = z.object({
  walletId: z.string().min(1, 'Wallet ID is required'),
  amount: z.number().positive('Amount must be positive'),
  description: z.string().max(255).optional().default('Deposit'),
  method: z.enum(['TELEBIRR', 'CBE_BIRR', 'BANK_TRANSFER', 'CASH']).optional().default('TELEBIRR'),
  holidayId: z.string().nullable().optional(),
  idempotencyKey: z.string().optional()
});

export const withdrawalSchema = z.object({
  walletId: z.string().min(1, 'Wallet ID is required'),
  amount: z.number().positive('Amount must be positive'),
  reason: z.string().max(255).optional().default('Withdrawal request'),
  withdrawalMethod: z.enum(['TELEBIRR', 'CBE_BIRR', 'BANK_TRANSFER', 'CASH', 'AWASH_BANK', 'DASHEN_BANK', 'ABYSSINIA_BANK']).optional().default('TELEBIRR'),
  accountNumber: z.string().min(6, 'Account number must be at least 6 characters').max(50),
  accountName: z.string().max(100).nullable().optional()
});
