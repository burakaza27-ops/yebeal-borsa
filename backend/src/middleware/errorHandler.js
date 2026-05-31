/* ============================================
   Global Error Handler Middleware
   Catches all unhandled errors and returns
   clean JSON responses
   ============================================ */

import logger from '../utils/logger.js';

export function errorHandler(err, req, res, next) {
  logger.error('Unhandled request error:', err);

  // Prisma known errors
  if (err.code === 'P2002') {
    const field = err.meta?.target?.[0] || 'field';
    return res.status(409).json({
      error: `A record with this ${field} already exists.`,
    });
  }

  if (err.code === 'P2025') {
    return res.status(404).json({
      error: 'Record not found.',
    });
  }

  // Validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: err.message,
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ error: 'Invalid token.' });
  }

  // Default server error
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    error: process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message,
  });
}
