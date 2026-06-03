import pino from 'pino';

const isProduction = process.env.NODE_ENV === 'production';

// In development, use pino-pretty for colorized, readable logs
// In production, use standard JSON formatting (great for Datadog/ELK)
const logger = pino({
  level: isProduction ? 'info' : 'debug',
  base: { service: 'yebeal-borsa-api' },
  transport: !isProduction
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
