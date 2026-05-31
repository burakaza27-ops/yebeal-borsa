import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import cookieParser from 'cookie-parser';
import { PrismaClient } from '@prisma/client';

// Loggers & Redis utilities
import logger, { httpLogger } from './utils/logger.js';
import { redisClient, redisEnabled } from './utils/redis.js';

// Route imports
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import walletRoutes from './routes/wallets.js';
import transactionRoutes from './routes/transactions.js';
import holidayRoutes from './routes/holidays.js';
import animalRoutes from './routes/animals.js';
import orderRoutes from './routes/orders.js';
import withdrawalRoutes from './routes/withdrawals.js';
import notificationRoutes from './routes/notifications.js';
import adminRoutes from './routes/admin.js';
import deliveryRoutes from './routes/delivery.js';
import ticketRoutes from './routes/tickets.js';

// Middleware
import { errorHandler } from './middleware/errorHandler.js';

// Validate required environment variables at startup
const REQUIRED_ENV = ['DATABASE_URL', 'JWT_SECRET'];
for (const envVar of REQUIRED_ENV) {
  if (!process.env[envVar]) {
    logger.error(`❌ CRITICAL: Missing mandatory environment variable: ${envVar}`);
    process.exit(1);
  }
}

if (process.env.NODE_ENV === 'production' && process.env.JWT_SECRET.includes('change-this')) {
  logger.error('❌ CRITICAL: Insecure default JWT_SECRET detected in production environment!');
  process.exit(1);
}

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3001;

// ─── Global Middleware ─────────────────────────────

// Request logging via Winston
app.use(httpLogger);

// Security headers
app.use(helmet());

// Cookie parser for secure httpOnly sessions
app.use(cookieParser());

// CORS — Allow frontend to communicate
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));

// Configure Rate Limiting Options with Redis support
const rateLimitStore = redisEnabled
  ? new RedisStore({
      sendCommand: (...args) => redisClient.call(...args),
      prefix: 'rate_limit:global:',
    })
  : undefined;

const authRateLimitStore = redisEnabled
  ? new RedisStore({
      sendCommand: (...args) => redisClient.call(...args),
      prefix: 'rate_limit:auth:',
    })
  : undefined;

// Rate limiting — Prevent brute force attacks
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Limit each IP to 200 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
  store: rateLimitStore,
});
app.use(limiter);

// Stricter rate limit for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 20 : 500, // higher max for development
  message: { error: 'Too many login attempts, please try again later.' },
  store: authRateLimitStore,
  standardHeaders: true,
  legacyHeaders: false,
});

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Attach Prisma to request for use in routes
app.use((req, res, next) => {
  req.prisma = prisma;
  next();
});

// ─── API Routes ────────────────────────────────────

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/wallets', walletRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/holidays', holidayRoutes);
app.use('/api/animals', animalRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/withdrawals', withdrawalRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/delivery', deliveryRoutes);
app.use('/api/support/tickets', ticketRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Yebeal Borsa API',
    timestamp: new Date().toISOString(),
    redis: redisEnabled ? 'connected' : 'disabled',
  });
});

// ─── Error Handling ────────────────────────────────

app.use(errorHandler);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ─── Start Server ──────────────────────────────────

async function start() {
  try {
    await prisma.$connect();
    logger.info('✅ Database connected successfully');

    app.listen(PORT, () => {
      logger.info(`🚀 Yebeal Borsa API running on http://localhost:${PORT}`);
      logger.info(`📦 Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`🔗 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
    });
  } catch (err) {
    logger.error('❌ Failed to start server:', err);
    process.exit(1);
  }
}

if (!process.env.VERCEL) {
  start();
}

export default app;

// Handle uncaught exceptions and unhandled rejections cleanly
process.on('uncaughtException', (err) => {
  logger.error('💥 Uncaught Exception! Shutting down...', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  // In production, you might want to restart the service via process manager (e.g. PM2, Docker)
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received. Shutting down database client gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received. Shutting down database client...');
  await prisma.$disconnect();
  process.exit(0);
});
