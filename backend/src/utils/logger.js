import pino from 'pino';

const isProduction = process.env.NODE_ENV === 'production';
const isVercel = !!process.env.VERCEL;

// In Vercel serverless, pino-pretty transport (which spawns a worker thread)
// can crash the function. Use plain JSON logging on Vercel and in production.
// Only use pino-pretty for local development.
const usePretty = !isProduction && !isVercel;

let logger;
try {
  logger = pino({
    level: isProduction ? 'info' : 'debug',
    base: { service: 'yebeal-borsa-api' },
    transport: usePretty
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
          },
        }
      : undefined,
  });
} catch {
  // Fallback to a minimal console-based logger if pino initialization fails
  logger = {
    info: (...args) => console.log('[INFO]', ...args),
    warn: (...args) => console.warn('[WARN]', ...args),
    error: (...args) => console.error('[ERROR]', ...args),
    debug: (...args) => console.debug('[DEBUG]', ...args),
    fatal: (...args) => console.error('[FATAL]', ...args),
    child: () => logger,
  };
}

/**
 * Express middleware for HTTP request logging.
 * Logs method, URL, status code, and response time.
 */
export function httpLogger(req, res, next) {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const level = res.statusCode >= 400 ? 'warn' : 'info';

    logger[level]({
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    }, `${req.method} ${req.originalUrl}`);
  });

  next();
}

export default logger;
