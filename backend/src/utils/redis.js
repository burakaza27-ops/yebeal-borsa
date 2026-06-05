/* ============================================
   Redis Client Configuration
   
   Initializes connection to Redis instance.
   Safely catches connection failures and exposes
   a status flag to support dynamic fallback
   to in-memory stores (graceful degradation).
   ============================================ */

import logger from './logger.js';

const redisUrl = process.env.REDIS_URL;
let redisClient = null;
let redisEnabled = false;

if (redisUrl) {
  try {
    const { default: Redis } = await import('ioredis');
    logger.info(`🔌 Connecting to Redis at ${redisUrl}...`);
    // Connect to Redis with retry limit
    redisClient = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        if (times > 3) {
          logger.warn('⚠️ Redis connection attempts exceeded threshold. Disabling Redis integration.');
          redisEnabled = false;
          return null; // stop retrying
        }
        return Math.min(times * 100, 2000);
      }
    });

    redisClient.on('connect', () => {
      redisEnabled = true;
      logger.info('✅ Redis connected successfully');
    });

    redisClient.on('error', (err) => {
      logger.error('❌ Redis Connection Error:', err);
      // Disable redis status, fallback to in-memory limiters
      redisEnabled = false;
    });
  } catch (err) {
    logger.error('❌ Failed to initialize Redis client:', err);
    redisEnabled = false;
  }
} else {
  logger.info('ℹ️ Redis URL not specified. Falling back to local/in-memory services.');
}

export { redisClient, redisEnabled };
export default redisClient;
