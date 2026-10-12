const jwt = require('jsonwebtoken');
const config = require('../config');
const db = require('../db/database');

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required. Please log in.' });
  }

  jwt.verify(token, config.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired session. Please log in again.' });
    }

    const user = db.prepare('SELECT id, email, full_name, role, student_id, phone, department, is_suspended FROM users WHERE id = ?').get(decoded.id);

    if (!user) {
      return res.status(401).json({ error: 'User account no longer exists.' });
    }

    if (user.is_suspended) {
      return res.status(403).json({ error: 'Your account has been suspended by an administrator.' });
    }

    req.user = user;
    next();
  });
}

function optionalAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    req.user = null;
    return next();
  }

  jwt.verify(token, config.JWT_SECRET, (err, decoded) => {
    if (!err && decoded) {
      const user = db.prepare('SELECT id, email, full_name, role, is_suspended FROM users WHERE id = ?').get(decoded.id);
      if (user && !user.is_suspended) {
        req.user = user;
      }
    }
    next();
  });
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Administrative privileges required.' });
  }
  next();
}

module.exports = {
  authenticateToken,
  optionalAuth,
  requireAdmin
};
