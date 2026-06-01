/* ============================================
   JWT Authentication Middleware
   Verifies token and attaches user to request
   ============================================ */

import jwt from 'jsonwebtoken';

/**
 * Middleware that requires a valid JWT token.
 * Attaches the decoded user payload to req.user
 */
export function authenticate(req, res, next) {
  try {
    let token = null;

    // Prioritize Authorization header (Bearer token) for reliable API/SPA operation
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }

    // Fallback to cookie token if no header is present
    if (!token && req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    // Ensure we ignore invalid/empty string tokens (e.g. from cleared cookies)
    if (token === 'undefined' || token === 'null' || (typeof token === 'string' && token.trim() === '')) {
      token = null;
    }

    if (!token) {
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = decoded; // { id, role, phone }
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired. Please log in again.' });
    }
    return res.status(401).json({ error: 'Invalid token.' });
  }
}

/**
 * Middleware that requires ADMIN role.
 * Must be used AFTER authenticate middleware.
 */
export function requireAdmin(req, res, next) {
  const allowedAdminRoles = ['ADMIN', 'SUPER_ADMIN'];
  if (!req.user || !allowedAdminRoles.includes(req.user.role)) {
    return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
  }
  next();
}

/**
 * Middleware that requires SELLER or ADMIN role.
 * Must be used AFTER authenticate middleware.
 */
export function requireSellerOrAdmin(req, res, next) {
  const allowedRoles = ['SELLER', 'FATTENER', 'TRADER', 'ADMIN', 'SUPER_ADMIN'];
  if (!req.user || !allowedRoles.includes(req.user.role)) {
    return res.status(403).json({ error: 'Access denied. Seller or Admin privileges required.' });
  }
  next();
}

/**
 * Middleware that requires SELLER role.
 * Must be used AFTER authenticate middleware.
 */
export function requireSeller(req, res, next) {
  const allowedRoles = ['SELLER', 'FATTENER', 'TRADER'];
  if (!req.user || !allowedRoles.includes(req.user.role)) {
    return res.status(403).json({ error: 'Access denied. Seller privileges required.' });
  }
  next();
}


/**
 * Optional authentication — doesn't block if no token,
 * but attaches user if token is valid.
 */
export function optionalAuth(req, res, next) {
  try {
    let token = null;

    // Prioritize Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }

    // Fallback to cookie token
    if (!token && req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    // Ensure we ignore invalid/empty string tokens
    if (token === 'undefined' || token === 'null' || (typeof token === 'string' && token.trim() === '')) {
      token = null;
    }

    if (token) {
      req.user = jwt.verify(token, process.env.JWT_SECRET);
    }
  } catch {
    // Token invalid — just continue without user
  }
  next();
}

