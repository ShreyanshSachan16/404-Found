const fs = require('fs');
const crypto = require('crypto');
const path = require('path');
require('dotenv').config();

const NODE_ENV = process.env.NODE_ENV || 'development';
const isProd = NODE_ENV === 'production';

const DEFAULT_JWT_SECRET = 'super-secure-campus-lost-found-secret-key-2026';

function resolveJwtSecret() {
  const envSecret = process.env.JWT_SECRET;

  if (isProd) {
    if (envSecret && (envSecret === DEFAULT_JWT_SECRET || envSecret.length < 32)) {
      throw new Error('FATAL SECURITY ERROR: Insecure JWT_SECRET provided in production mode. Must be at least 32 characters and distinct from default placeholders.');
    }
    if (envSecret && envSecret.length >= 32) {
      return envSecret;
    }
    const secretKeyPath = path.join(__dirname, '..', '.jwt_secret');
    try {
      if (fs.existsSync(secretKeyPath)) {
        const stored = fs.readFileSync(secretKeyPath, 'utf8').trim();
        if (stored.length >= 32) return stored;
      }
      const generated = crypto.randomBytes(32).toString('hex');
      fs.writeFileSync(secretKeyPath, generated, { mode: 0o600 });
      return generated;
    } catch (err) {
      throw new Error(`FATAL SECURITY ERROR: Failed to generate/read persistent JWT_SECRET in production: ${err.message}`);
    }
  }

  return envSecret || DEFAULT_JWT_SECRET;
}

const JWT_SECRET = resolveJwtSecret();


const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, '..', 'uploads');
const RECEIPTS_DIR = process.env.RECEIPTS_DIR || path.join(UPLOAD_DIR, 'receipts');

module.exports = {
  NODE_ENV,
  isProd,
  PORT: process.env.PORT ? parseInt(process.env.PORT, 10) : 5001,
  HOST: process.env.HOST || '0.0.0.0',
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
  CORS_ORIGIN: process.env.CORS_ORIGIN || process.env.CLIENT_URL || 'http://localhost:5173',
  JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  DB_PATH: process.env.DB_PATH || path.join(__dirname, '..', 'lost_and_found.db'),
  UPLOAD_DIR,
  RECEIPTS_DIR,
  CLIENT_DIST_PATH: process.env.CLIENT_DIST_PATH || path.join(__dirname, '..', '..', 'client', 'dist'),
  AI_CONFIG: {
    TEXT_WEIGHT: 0.35,
    IMAGE_WEIGHT: 0.25,
    LOCATION_WEIGHT: 0.15,
    DATE_WEIGHT: 0.10,
    CATEGORY_WEIGHT: 0.15,
    MIN_MATCH_THRESHOLD: 0.50, // 50% confidence for potential match
    HIGH_MATCH_THRESHOLD: 0.75, // 75% for high confidence badge
    DUPLICATE_THRESHOLD: 0.78   // 78% triggers duplicate warning
  },
  CAMPUS_LOCATIONS: [
    'Main Library',
    'Student Union / Cafeteria',
    'Science & Engineering Complex',
    'Business & Law Hall',
    'Athletics Center / Gym',
    'North Quad Dormitories',
    'South Quad Dormitories',
    'Central Lecture Hall',
    'Campus Bookstore',
    'East Parking Structure',
    'Health & Wellness Center',
    'Other / Off-Campus'
  ],
  CATEGORIES: [
    'Electronics',
    'Bags & Backpacks',
    'Books & Notebooks',
    'Clothing & Apparel',
    'Accessories & Jewelry',
    'Documents & Cards',
    'Keys & Keychains',
    'Wallets & Purses',
    'Student ID Cards',
    'Sports & Fitness Equipment',
    'Eyewear',
    'Other'
  ]
};
