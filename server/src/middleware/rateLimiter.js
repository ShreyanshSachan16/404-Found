/**
 * In-memory sliding window rate limiter
 * Protects auth and API endpoints against brute-force and DoS attacks
 */

if (process.env.NODE_ENV === 'production' && process.env.DISABLE_RATE_LIMIT === 'true') {
  console.warn('⚠️ [SECURITY WARNING] DISABLE_RATE_LIMIT=true is configured in PRODUCTION mode. Rate-limit bypass is strictly rejected in production to protect against DoS attacks.');
}

function createRateLimiter({ windowMs = 60 * 1000, max = 100, message = 'Too many requests, please try again later.' }) {
  const hits = new Map();

  // Periodic cleanup every 2 minutes
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, record] of hits.entries()) {
      if (now > record.resetTime) {
        hits.delete(key);
      }
    }
  }, 2 * 60 * 1000);

  if (cleanupInterval.unref) {
    cleanupInterval.unref(); // Don't prevent process exit
  }

  return function rateLimiter(req, res, next) {
    // Health checks are always exempt from rate limiting
    if (req.path === '/api/health') {
      return next();
    }

    const isProxyTrusted = Boolean(req.app && req.app.get('trust proxy'));
    const forwarded = req.headers['x-forwarded-for'];
    const ip = (isProxyTrusted && forwarded)
      ? forwarded.split(',')[0].trim()
      : (req.socket?.remoteAddress || '127.0.0.1');
    const now = Date.now();

    let record = hits.get(ip);
    if (!record || now > record.resetTime) {
      record = {
        count: 1,
        resetTime: now + windowMs
      };
      hits.set(ip, record);
    } else {
      record.count += 1;
    }

    const remaining = Math.max(0, max - record.count);
    const resetSeconds = Math.ceil((record.resetTime - now) / 1000);

    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', remaining);
    res.setHeader('X-RateLimit-Reset', resetSeconds);

    // Rate-limit bypass is strictly permitted ONLY in explicit test environments.
    // In production, DISABLE_RATE_LIMIT is strictly ignored to prevent catastrophic security misconfigurations.
    if (process.env.NODE_ENV === 'test' && process.env.DISABLE_RATE_LIMIT === 'true') {
      return next();
    }

    if (record.count > max) {
      res.setHeader('Retry-After', resetSeconds);
      return res.status(429).json({
        error: message,
        retryAfterSeconds: resetSeconds
      });
    }

    next();
  };
}

const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // 30 requests per 15 min
  message: 'Too many authentication attempts from this IP. Please wait 15 minutes.'
});

const apiLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 300, // 300 requests per minute
  message: 'API rate limit exceeded. Please throttle your requests.'
});

module.exports = {
  createRateLimiter,
  authLimiter,
  apiLimiter
};
