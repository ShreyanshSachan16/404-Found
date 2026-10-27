const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const config = require('./config');
const db = require('./db/database');
const { authLimiter, apiLimiter } = require('./middleware/rateLimiter');

const authRoutes = require('./routes/authRoutes');
const itemRoutes = require('./routes/itemRoutes');
const claimRoutes = require('./routes/claimRoutes');
const messageRoutes = require('./routes/messageRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const adminRoutes = require('./routes/adminRoutes');
const userRoutes = require('./routes/userRoutes');

// Ensure database has safe initial demo data if newly initialized or empty
try {
  const userCount = db.prepare('SELECT count(*) as count FROM users').get()?.count || 0;
  if (userCount === 0) {
    console.log('[Server] Fresh database detected. Initializing safe demo records...');
    const { seed } = require('./db/seed');
    seed().then(() => {
      console.log('[Server] Safe demo data successfully seeded.');
    }).catch((seedErr) => {
      console.error('[Server WARNING] Auto-seeding error:', seedErr.message);
    });
  }
} catch (err) {
  console.warn('[Server WARNING] Auto-seeding check skipped:', err.message);
}

const app = express();

// Security HTTP headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// Production-ready CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow non-browser tools, same-origin, or missing origin (desktop apps / local file / mobile)
    if (!origin || origin === 'null') return callback(null, true);
    
    const allowedOrigins = Array.isArray(config.CORS_ORIGIN) 
      ? config.CORS_ORIGIN 
      : config.CORS_ORIGIN.split(',').map(o => o.trim());

    if (!config.isProd || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    // Allow localhost and 127.0.0.1 during dev/demo/testing on any port
    if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
      return callback(null, true);
    }

    // Allow Electron desktop app local schemes
    if (origin.startsWith('file://') || origin.startsWith('app://') || origin.startsWith('electron://')) {
      return callback(null, true);
    }

    callback(new Error('Cross-Origin Request Blocked by CORS policy.'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Client-Platform']
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// Block any direct attempts to download SQLite DB files, env files, logs, or sensitive configs
app.use((req, res, next) => {
  if (/\.(db|db-wal|db-shm|sqlite|sqlite3|env|log|key|secret|vbs|ps1|bat|cmd|sh|exe)($|\?)/i.test(req.path)) {
    return res.status(403).json({ error: 'Direct access to database or internal configuration files is forbidden.' });
  }
  next();
});

// Protect private claim receipts from unauthorized direct static file access.
// Receipts must only be accessed via authenticated claim routes (/api/claims/:id/receipt).
// Blocks case-insensitive, URL-encoded, or subpath attempts (e.g. /uploads/Receipts/...)
app.use('/uploads', (req, res, next) => {
  let decodedPath = '';
  try {
    decodedPath = decodeURIComponent(req.path).toLowerCase();
  } catch (err) {
    return res.status(400).json({ error: 'Malformed request path.' });
  }

  if (decodedPath.includes('receipt')) {
    return res.status(403).json({
      error: 'Direct access to claim verification receipts is forbidden. Use the authenticated claim receipt endpoint.'
    });
  }
  next();
});

// Static file hosting for uploaded photos (public item photos only)
app.use('/uploads', express.static(config.UPLOAD_DIR, {
  dotfiles: 'ignore',
  index: false,
  maxAge: config.isProd ? '1d' : 0,
  setHeaders: (res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Security-Policy', "default-src 'none'");
    res.setHeader('X-Frame-Options', 'DENY');
  }
}));

// Root health check (probes SQLite status and server uptime)
app.get('/api/health', (req, res) => {
  let dbStatus = 'ok';
  try {
    db.prepare('SELECT 1').get();
  } catch (err) {
    dbStatus = 'degraded';
  }

  res.json({
    status: dbStatus === 'ok' ? 'ok' : 'degraded',
    uptime: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
    system: 'Campus Lost & Found AI Engine',
    database: dbStatus,
    environment: config.NODE_ENV
  });
});

// Public metadata route
app.get('/api/meta', (req, res) => {
  res.json({
    categories: config.CATEGORIES,
    locations: config.CAMPUS_LOCATIONS,
    aiConfig: config.AI_CONFIG
  });
});

// Rate limiting & API Routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/items', apiLimiter, itemRoutes);
app.use('/api/claims', apiLimiter, claimRoutes);
app.use('/api/messages', apiLimiter, messageRoutes);
app.use('/api/notifications', apiLimiter, notificationRoutes);
app.use('/api/admin', apiLimiter, adminRoutes);
app.use('/api/user', apiLimiter, userRoutes);

// 404 handler for undefined API routes (Express 5 compatible)
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'Endpoint not found on Campus Recovery Ledger API.' });
  }
  next();
});

// Locate frontend static build directory across all supported runtime environments
function resolveStaticDist() {
  const candidates = [
    config.CLIENT_DIST_PATH,
    path.join(__dirname, '..', '..', 'client', 'dist'),
    path.join(__dirname, '..', 'client', 'dist'),
    path.join(process.cwd(), 'client', 'dist'),
    path.join(process.cwd(), '..', 'client', 'dist'),
    process.env.APPDATA ? path.join(process.env.APPDATA, '404-found', 'client_dist') : null
  ].filter(Boolean);

  for (const dir of candidates) {
    if (typeof dir === 'string' && !dir.includes('.asar')) {
      try {
        if (fs.existsSync(dir) && fs.existsSync(path.join(dir, 'index.html'))) {
          return dir;
        }
      } catch {}
    }
  }
  return config.CLIENT_DIST_PATH || path.join(__dirname, '..', '..', 'client', 'dist');
}

const clientDistPath = resolveStaticDist();
const clientIndexFile = path.join(clientDistPath, 'index.html');
const hasStaticClient = !clientDistPath.includes('.asar') && fs.existsSync(clientDistPath) && fs.existsSync(clientIndexFile);

if (hasStaticClient) {
  console.log(`[Server] Serving static client build from: ${clientDistPath}`);
  app.use(express.static(clientDistPath));
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api') && !req.path.startsWith('/uploads')) {
      return res.sendFile(clientIndexFile);
    }
    next();
  });
} else {
  console.warn(`[Server WARNING] Client static build not found on disk. Checked: ${clientDistPath}`);
  app.get('/', (req, res) => {
    res.status(503).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>404 FOUND — Static Assets Initializing</title>
        <style>
          body { background: #0b0d14; color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
          .card { background: #131722; padding: 2.5rem; border-radius: 12px; border: 1px solid #1f293d; max-width: 480px; text-align: center; }
          h1 { color: #f59e0b; margin-top: 0; font-size: 1.5rem; }
          p { color: #9ca3af; font-size: 0.95rem; line-height: 1.5; }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>404 FOUND</h1>
          <p>Frontend production bundle is not present at the configured directory.</p>
          <p style="font-family: monospace; font-size: 0.8rem; background: #0b0d14; padding: 0.6rem; border-radius: 6px; word-break: break-all;">${clientDistPath}</p>
        </div>
      </body>
      </html>
    `);
  });
}

// Production error handling middleware
app.use((err, req, res, next) => {
  if (err.name === 'MulterError') {
    return res.status(400).json({ error: `Upload error: ${err.message}` });
  }

  // Handle CORS errors
  if (err.message && err.message.includes('CORS')) {
    return res.status(403).json({ error: err.message });
  }

  const statusCode = err.status || 500;
  if (!config.isProd) {
    console.error('Server Error:', err);
  } else {
    console.error(`[${new Date().toISOString()}] Error ${statusCode}: ${err.message}`);
  }

  // Never expose sensitive stack trace or server internals in production
  const safeMessage = config.isProd && statusCode === 500
    ? 'An unexpected internal server error occurred.'
    : (err.message || 'Internal server error occurred.');

  res.status(statusCode).json({ error: safeMessage });
});

// Start Server
const server = app.listen(config.PORT, config.HOST, () => {
  const displayHost = (config.HOST === '0.0.0.0' || config.HOST === '::') ? 'localhost' : config.HOST;
  console.log(`Lost & Found AI Server running on http://${displayHost}:${config.PORT} [${config.NODE_ENV}]`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`[FATAL ERROR] Port ${config.PORT} is already in use by another instance or process.`);
  } else {
    console.error(`[FATAL ERROR] Server startup failure:`, err.message);
  }
  process.exit(1);
});

// Graceful shutdown
function handleShutdown(signal) {
  console.log(`\n[${signal}] Initiating graceful shutdown...`);
  server.close(() => {
    try {
      db.pragma('wal_checkpoint(TRUNCATE)');
      db.close();
      console.log('SQLite database safely closed and WAL checkpointed.');
    } catch (e) {
      console.error('Error closing SQLite DB:', e);
    }
    process.exit(0);
  });

  // Force exit after 5 seconds if connections hang
  setTimeout(() => {
    console.error('Forced exit timeout reached.');
    process.exit(1);
  }, 5000).unref();
}

process.on('SIGINT', () => handleShutdown('SIGINT'));
process.on('SIGTERM', () => handleShutdown('SIGTERM'));

module.exports = app;
