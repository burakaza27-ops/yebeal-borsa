// Load .env only in non-Vercel environments (Vercel injects env vars directly)
if (!process.env.VERCEL) {
  const { config } = await import('dotenv');
  config();
}
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
const missingEnv = REQUIRED_ENV.filter(envVar => !process.env[envVar]);
const insecureJwt = process.env.NODE_ENV === 'production' && process.env.JWT_SECRET && process.env.JWT_SECRET.includes('change-this');

if (!process.env.VERCEL) {
  if (missingEnv.length > 0) {
    logger.error(`❌ CRITICAL: Missing mandatory environment variable(s): ${missingEnv.join(', ')}`);
    process.exit(1);
  }
  if (insecureJwt) {
    logger.error('❌ CRITICAL: Insecure default JWT_SECRET detected in production environment!');
    process.exit(1);
  }
}

const app = express();

const globalForPrisma = globalThis;
const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

const PORT = process.env.PORT || 3001;

// ─── Global Middleware ─────────────────────────────

// Early environment variable configuration check shield
app.use((req, res, next) => {
  if (missingEnv.length > 0) {
    return res.status(500).json({
      error: `Missing environment variable(s): ${missingEnv.join(', ')}. Please configure them in your environment settings.`
    });
  }
  if (insecureJwt) {
    return res.status(500).json({
      error: 'Insecure default JWT_SECRET detected in production. Please update it in your environment settings.'
    });
  }
  next();
});

// Request logging via Winston
app.use(httpLogger);

// Security headers
app.use(helmet());

// Cookie parser for secure httpOnly sessions
app.use(cookieParser());

// CORS — Allow frontend to communicate
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:3001',
];

if (process.env.FRONTEND_URL) {
  allowedOrigins.push(process.env.FRONTEND_URL);
}

app.use(cors({
  origin: (origin, callback) => {
    // Allow same-origin (like serverless calls under same domain, where origin is undefined)
    // or allowed origins list, or any vercel.app subdomains, or localhost origins.
    if (!origin || 
        allowedOrigins.includes(origin) || 
        origin.endsWith('.vercel.app') || 
        origin.includes('localhost') ||
        origin.includes('127.0.0.1')) {
      callback(null, true);
    } else {
      callback(null, false);
    }
  },
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

// Database connectivity diagnostic check
app.get('/api/db-test', async (req, res) => {
  try {
    const userCount = await req.prisma.user.count();
    res.json({
      status: 'ok',
      message: 'Prisma successfully queried the live database!',
      totalUsers: userCount,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    logger.error('❌ Diagnostic db-test failed:', err);
    res.status(500).json({
      status: 'error',
      message: 'Database query failed.',
      errorMessage: err.message,
      errorStack: err.stack,
      hint: 'Please check your DATABASE_URL in Vercel project environment variables.'
    });
  }
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
  logger.error('💥 Uncaught Exception:', err);
  // Do NOT call process.exit(1) on Vercel — it would kill the shared worker for ALL users
  if (!process.env.VERCEL) process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  // Do NOT call process.exit(1) on Vercel — it would kill the shared worker for ALL users
  if (!process.env.VERCEL) process.exit(1);
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
