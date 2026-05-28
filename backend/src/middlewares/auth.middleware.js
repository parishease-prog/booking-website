const jwt = require('jsonwebtoken');

if (!process.env.JWT_SECRET) {
  throw new Error('CRITICAL: JWT_SECRET environment variable must be set for security. Update your .env file immediately.');
}

const JWT_SECRET = process.env.JWT_SECRET;

function extractToken(req) {
  const authHeader = req.headers.authorization || '';

  if (!authHeader.startsWith('Bearer ')) {
    return null;
  }

  return authHeader.slice(7).trim();
}

function authenticateAdmin(req, res, next) {
  const token = extractToken(req);

  if (!token) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

function requireAdminRole(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access is required' });
  }

  next();
}

module.exports = {
  authenticateAdmin,
  requireAdminRole,
  JWT_SECRET
};
