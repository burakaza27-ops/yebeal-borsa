// Load .env only in non-Vercel environments (Vercel injects env vars directly)
if (!process.env.VERCEL) {
  const { config } = await import('dotenv');
  config();
}
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';

// Loggers & Redis utilities
import logger, { httpLogger } from './utils/logger.js';
import { redisClient, redisEnabled } from './utils/redis.js';

// Conditionally import RedisStore only when Redis is enabled to avoid
// crashes on Vercel if rate-limit-redis has resolution issues.
let RedisStore = null;
if (redisEnabled) {
  try {
    const mod = await import('rate-limit-redis');
    RedisStore = mod.RedisStore;
  } catch (err) {
    logger.warn('⚠️ Could not load rate-limit-redis, falling back to in-memory:', err.message);
  }
}

// Import PrismaClient with a safety wrapper for Vercel
let PrismaClient;
try {
  const prismaModule = await import('@prisma/client');
  PrismaClient = prismaModule.PrismaClient;
} catch (err) {
  logger.error('❌ Failed to import @prisma/client. Run `prisma generate` first:', err.message);
  // Create a stub that throws helpful errors
  PrismaClient = class PrismaClientStub {
    constructor() {
      this._stubError = err.message;
    }
    $connect() { return Promise.reject(new Error(`PrismaClient not available: ${this._stubError}`)); }
    $disconnect() { return Promise.resolve(); }
  };
}

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
import uploadRoutes from './routes/upload.js';

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

// Trust reverse proxies (e.g. Vercel, Heroku, Nginx) so req.ip represents the client
app.set('trust proxy', 1);

const globalForPrisma = globalThis;
let dbUrl = process.env.DATABASE_URL || '';
// Prevent Vercel Serverless Functions from exhausting Supabase DB connection limit
if (dbUrl && process.env.VERCEL && !dbUrl.includes('connection_limit')) {
  dbUrl += (dbUrl.includes('?') ? '&' : '?') + 'connection_limit=1&pool_timeout=10';
}

let prisma;
try {
  prisma = globalForPrisma.prisma || new PrismaClient({
    datasources: {
      db: { url: dbUrl }
    }
  });
  if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
} catch (err) {
  logger.error('❌ Failed to create PrismaClient instance:', err.message);
  prisma = null;
}

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
  if (!prisma) {
    return res.status(500).json({
      error: 'Database client failed to initialize. Check Prisma configuration and DATABASE_URL.'
    });
  }
  next();
});

// Request logging via Winston
app.use(httpLogger);

// Security headers with strict Content Security Policy
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "blob:", "https://*.supabase.co"],
      connectSrc: [
        "'self'",
        "https://*.supabase.co",
        process.env.FRONTEND_URL || "http://localhost:5173"
      ].filter(Boolean),
      objectSrc: ["'none'"],
      frameSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null
    }
  },
  crossOriginEmbedderPolicy: false, // Allow Supabase image loading
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
}));

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

// Configure Rate Limiting Options with Redis support (only if RedisStore loaded)
const rateLimitStore = (redisEnabled && RedisStore)
  ? new RedisStore({
      sendCommand: (...args) => redisClient.call(...args),
      prefix: 'rate_limit:global:',
    })
  : undefined;

const authRateLimitStore = (redisEnabled && RedisStore)
  ? new RedisStore({
      sendCommand: (...args) => redisClient.call(...args),
      prefix: 'rate_limit:auth:',
    })
  : undefined;

// Rate limiting — Prevent brute force attacks
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 200 : 5000, // Limit each IP to 200 requests per window in prod, 5000 in dev
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
  store: rateLimitStore,
});
app.use(limiter);

// Stricter rate limit for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 50 : 500, // higher max for development
  message: { error: 'Too many login attempts, please try again later.' },
  store: authRateLimitStore,
  standardHeaders: true,
  legacyHeaders: false,
});

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── Global Input Sanitization ─────────────────────
// Strip null bytes, detect excessive nesting, and remove script tags
function sanitizeValue(val, depth = 0) {
  const MAX_DEPTH = 10;
  if (depth > MAX_DEPTH) return undefined; // drop excessively nested data
  if (typeof val === 'string') {
    return val
      .replace(/\0/g, '')                           // strip null bytes
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // strip script tags
      .replace(/javascript:/gi, '');                 // strip javascript: URIs
  }
  if (Array.isArray(val)) {
    return val.map(item => sanitizeValue(item, depth + 1)).filter(v => v !== undefined);
  }
  if (val && typeof val === 'object') {
    const clean = {};
    for (const [k, v] of Object.entries(val)) {
      const sanitizedKey = k.replace(/\0/g, '');
      const sanitizedVal = sanitizeValue(v, depth + 1);
      if (sanitizedVal !== undefined) clean[sanitizedKey] = sanitizedVal;
    }
    return clean;
  }
  return val;
}

app.use((req, _res, next) => {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeValue(req.body);
  }
  next();
});

// Attach Prisma to request for use in routes
app.use((req, res, next) => {
  req.prisma = prisma;
  next();
});

// ─── API Routes ────────────────────────────────────

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/wallets', walletRoutes);
// Stricter rate limit for financial endpoints (deposits, withdrawals)
const financialRateLimitStore = (redisEnabled && RedisStore)
  ? new RedisStore({
      sendCommand: (...args) => redisClient.call(...args),
      prefix: 'rate_limit:financial:',
    })
  : undefined;

const financialLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: process.env.NODE_ENV === 'production' ? 30 : 500, // 30 financial ops per hour in prod
  message: { error: 'Too many financial requests. Please wait before trying again.' },
  store: financialRateLimitStore,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/transactions', financialLimiter, transactionRoutes);
app.use('/api/holidays', holidayRoutes);
app.use('/api/animals', animalRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/withdrawals', financialLimiter, withdrawalRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/delivery', deliveryRoutes);
app.use('/api/support/tickets', ticketRoutes);
app.use('/api/upload', uploadRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Yebeal Borsa API',
    timestamp: new Date().toISOString(),
    redis: redisEnabled ? 'connected' : 'disabled',
    prisma: prisma ? 'initialized' : 'failed',
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
    if (prisma) {
      await prisma.$connect();
      logger.info('✅ Database connected successfully');
    }

    app.listen(PORT, '0.0.0.0', () => {
      logger.info(`🚀 Yebeal Borsa API running on http://0.0.0.0:${PORT}`);
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
  if (prisma) await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received. Shutting down database client...');
  if (prisma) await prisma.$disconnect();
  process.exit(0);
});
