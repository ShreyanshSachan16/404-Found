const path = require('path');
require('dotenv').config();

const NODE_ENV = process.env.NODE_ENV || 'development';
const isProd = NODE_ENV === 'production';

const DEFAULT_JWT_SECRET = 'super-secure-campus-lost-found-secret-key-2026';
const JWT_SECRET = process.env.JWT_SECRET || DEFAULT_JWT_SECRET;

if (isProd && JWT_SECRET === DEFAULT_JWT_SECRET) {
  console.warn('⚠️ [SECURITY WARNING] Server is running in production with the default JWT_SECRET. Please set a strong JWT_SECRET environment variable.');
}

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, '..', 'uploads');
const RECEIPTS_DIR = path.join(UPLOAD_DIR, 'receipts');

module.exports = {
  NODE_ENV,
  isProd,
  PORT: process.env.PORT || 5001,
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
  CORS_ORIGIN: process.env.CORS_ORIGIN || process.env.CLIENT_URL || 'http://localhost:5173',
  JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  DB_PATH: process.env.DB_PATH || path.join(__dirname, '..', 'lost_and_found.db'),
  UPLOAD_DIR,
  RECEIPTS_DIR,
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

