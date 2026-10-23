const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
const config = require('../config');

// Ensure database folder and uploads folder exist
const dbDir = path.dirname(config.DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}
if (!fs.existsSync(config.UPLOAD_DIR)) {
  fs.mkdirSync(config.UPLOAD_DIR, { recursive: true });
}
if (!fs.existsSync(config.RECEIPTS_DIR)) {
  fs.mkdirSync(config.RECEIPTS_DIR, { recursive: true });
}

const db = new Database(config.DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.pragma('busy_timeout = 5000');
db.pragma('synchronous = NORMAL');
db.pragma('cache_size = -64000');

function initSchema() {
  db.exec(`
    -- Users table
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      student_id TEXT,
      role TEXT NOT NULL DEFAULT 'student' CHECK(role IN ('student', 'admin')),
      phone TEXT,
      department TEXT,
      avatar_url TEXT,
      is_suspended INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Items table
    CREATE TABLE IF NOT EXISTS items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('lost', 'found')),
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      description TEXT NOT NULL,
      brand TEXT,
      color TEXT,
      identifying_marks TEXT,
      location TEXT NOT NULL,
      campus_zone TEXT,
      date_lost_or_found DATE NOT NULL,
      time_lost_or_found TEXT,
      current_storage_location TEXT,
      status TEXT NOT NULL DEFAULT 'LOST' CHECK(status IN (
        'LOST', 'FOUND', 'POTENTIAL_MATCH', 'CLAIMED', 
        'VERIFICATION_PENDING', 'VERIFIED', 'RETURNED', 
        'CLOSED', 'ARCHIVED', 'REJECTED'
      )),
      primary_image TEXT,
      qr_code_token TEXT UNIQUE,
      text_vector TEXT,
      image_features TEXT,
      views_count INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Additional item images table
    CREATE TABLE IF NOT EXISTS item_images (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item_id INTEGER NOT NULL,
      image_url TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
    );

    -- AI Matches table
    CREATE TABLE IF NOT EXISTS matches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lost_item_id INTEGER NOT NULL,
      found_item_id INTEGER NOT NULL,
      overall_score REAL NOT NULL,
      text_score REAL NOT NULL,
      image_score REAL NOT NULL,
      location_score REAL NOT NULL,
      date_score REAL NOT NULL,
      category_score REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'SUGGESTED' CHECK(status IN ('SUGGESTED', 'REVIEWED', 'CONFIRMED', 'DISMISSED')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(lost_item_id, found_item_id),
      FOREIGN KEY (lost_item_id) REFERENCES items(id) ON DELETE CASCADE,
      FOREIGN KEY (found_item_id) REFERENCES items(id) ON DELETE CASCADE
    );

    -- Claims table
    CREATE TABLE IF NOT EXISTS claims (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item_id INTEGER NOT NULL,
      claimant_id INTEGER NOT NULL,
      proof_description TEXT NOT NULL,
      hidden_marks_answers TEXT,
      secret_contents TEXT,
      receipt_image TEXT,
      status TEXT NOT NULL DEFAULT 'VERIFICATION_PENDING' CHECK(status IN (
        'VERIFICATION_PENDING', 'APPROVED', 'REJECTED', 'HANDED_OVER', 'CANCELLED'
      )),
      admin_notes TEXT,
      reviewer_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE,
      FOREIGN KEY (claimant_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (reviewer_id) REFERENCES users(id) ON DELETE SET NULL
    );

    -- Platform-mediated messages table
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      claim_id INTEGER,
      item_id INTEGER NOT NULL,
      sender_id INTEGER NOT NULL,
      receiver_id INTEGER NOT NULL,
      message_text TEXT NOT NULL,
      is_read INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (claim_id) REFERENCES claims(id) ON DELETE CASCADE,
      FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE,
      FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- In-app notifications table
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN (
        'MATCH_FOUND', 'CLAIM_SUBMITTED', 'CLAIM_APPROVED', 
        'CLAIM_REJECTED', 'ITEM_STATUS', 'SYSTEM', 'MESSAGE_RECEIVED'
      )),
      link_url TEXT,
      is_read INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Admin audit log table
    CREATE TABLE IF NOT EXISTS admin_audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      admin_id INTEGER NOT NULL,
      action TEXT NOT NULL,
      target_type TEXT NOT NULL,
      target_id INTEGER,
      details TEXT,
      ip_address TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Invalidation table for revoked tokens on logout
    CREATE TABLE IF NOT EXISTS revoked_tokens (
      token TEXT PRIMARY KEY,
      revoked_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Indexes for high performance queries
    CREATE INDEX IF NOT EXISTS idx_items_type ON items(type);
    CREATE INDEX IF NOT EXISTS idx_items_status ON items(status);
    CREATE INDEX IF NOT EXISTS idx_items_category ON items(category);
    CREATE INDEX IF NOT EXISTS idx_items_type_category ON items(type, category);
    CREATE INDEX IF NOT EXISTS idx_items_type_status ON items(type, status);
    CREATE INDEX IF NOT EXISTS idx_items_status_type ON items(status, type);
    CREATE INDEX IF NOT EXISTS idx_items_brand ON items(brand);
    CREATE INDEX IF NOT EXISTS idx_items_user ON items(user_id);
    CREATE INDEX IF NOT EXISTS idx_items_created_at ON items(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_matches_lost ON matches(lost_item_id);
    CREATE INDEX IF NOT EXISTS idx_matches_found ON matches(found_item_id);
    CREATE INDEX IF NOT EXISTS idx_matches_score ON matches(overall_score DESC);
    CREATE INDEX IF NOT EXISTS idx_claims_item ON claims(item_id);
    CREATE INDEX IF NOT EXISTS idx_claims_claimant ON claims(claimant_id);
    CREATE INDEX IF NOT EXISTS idx_claims_status ON claims(status);
    CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);
    CREATE INDEX IF NOT EXISTS idx_messages_item ON messages(item_id);
    CREATE INDEX IF NOT EXISTS idx_revoked_tokens ON revoked_tokens(token);
  `);
}

initSchema();

module.exports = db;
