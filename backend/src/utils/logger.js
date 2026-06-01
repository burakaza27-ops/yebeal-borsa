/* ============================================
   Winston Logger — Structured Production Logging
   
   In production: JSON format for log aggregation
   (Datadog, ELK, CloudWatch, etc.)
   In development: Colorized, human-readable output.
   ============================================ */

import winston from 'winston';

const { combine, timestamp, printf, colorize, errors, json } = winston.format;

// Custom development format — clean, readable, colorized
const devFormat = printf(({ level, message, timestamp, stack, ...meta }) => {
  const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
  return `${timestamp} [${level}] ${stack || message}${metaStr}`;
});

// Determine environment
const isProduction = process.env.NODE_ENV === 'production';

const logger = winston.createLogger({
  level: isProduction ? 'info' : 'debug',
  defaultMeta: { service: 'yebeal-borsa-api' },
  format: combine(
    errors({ stack: true }),
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  ),
  transports: [
    // Console transport — always active
    new winston.transports.Console({
      format: isProduction
        ? combine(json())
        : combine(colorize(), devFormat),
    }),

    // File transport — production only (and only if NOT on Vercel/serverless where disk is read-only)
    ...(isProduction && !process.env.VERCEL
      ? [
          new winston.transports.File({
            filename: 'logs/error.log',
            level: 'error',
            maxsize: 5 * 1024 * 1024, // 5MB rotation
            maxFiles: 5,
          }),
          new winston.transports.File({
            filename: 'logs/combined.log',
            maxsize: 10 * 1024 * 1024, // 10MB rotation
            maxFiles: 5,
          }),
        ]
      : []),
  ],

  // Don't exit on uncaught exceptions — we handle them in server.js
  exitOnError: false,
});

/**
 * Express middleware for HTTP request logging.
 * Logs method, URL, status code, and response time.
 */
export function httpLogger(req, res, next) {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const level = res.statusCode >= 400 ? 'warn' : 'http';

    logger.log(level, `${req.method} ${req.originalUrl}`, {
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });
  });

  next();
}

// Add HTTP level to Winston (between 'info' and 'verbose')
winston.addColors({ http: 'magenta' });
logger.levels = { ...winston.config.npm.levels, http: 3.5 };

export default logger;
