const bcrypt = require('bcryptjs');
const db = require('./database');
const { runMatchingPipeline } = require('../services/aiMatchingService');
const { generateItemQRCode } = require('../services/qrService');
const notificationService = require('../services/notificationService');

async function seed() {
  console.log('Clearing existing data and re-seeding database...');

  db.exec(`
    DELETE FROM admin_audit_logs;
    DELETE FROM messages;
    DELETE FROM notifications;
    DELETE FROM claims;
    DELETE FROM matches;
    DELETE FROM item_images;
    DELETE FROM items;
    DELETE FROM users;
  `);

  const passwordHash = await bcrypt.hash('Password123!', 10);

  // 1. Seed Users
  const insertUser = db.prepare(`
    INSERT INTO users (email, password_hash, full_name, student_id, role, phone, department)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const adminId = insertUser.run('admin@campus.edu', passwordHash, 'Campus Security & Admin Office', 'STAFF-001', 'admin', '555-0100', 'Campus Safety').lastInsertRowid;
  const alexId = insertUser.run('alex.chen@campus.edu', passwordHash, 'Alex Chen', 'STU-98421', 'student', '555-0144', 'Computer Science').lastInsertRowid;
  const sarahId = insertUser.run('sarah.jenkins@campus.edu', passwordHash, 'Sarah Jenkins', 'STU-88219', 'student', '555-0188', 'Bioengineering').lastInsertRowid;
  const marcusId = insertUser.run('marcus.williams@campus.edu', passwordHash, 'Marcus Williams', 'STU-77312', 'student', '555-0199', 'Mechanical Engineering').lastInsertRowid;
  const emmaId = insertUser.run('emma.watson@campus.edu', passwordHash, 'Emma Watson', 'STU-66120', 'student', '555-0177', 'Business Administration').lastInsertRowid;

  // 2. Seed Items
  const insertItem = db.prepare(`
    INSERT INTO items (
      user_id, type, title, category, description, brand, color,
      identifying_marks, location, campus_zone, date_lost_or_found,
      time_lost_or_found, current_storage_location, status,
      primary_image, qr_code_token
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Sample photos (using high quality Unsplash tech/belongings photography)
  const images = {
    backpack: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=600&q=80',
    iphone: 'https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?auto=format&fit=crop&w=600&q=80',
    calculator: 'https://images.unsplash.com/photo-1587145820266-a5951ee6f620?auto=format&fit=crop&w=600&q=80',
    airpods: 'https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?auto=format&fit=crop&w=600&q=80',
    wallet: 'https://images.unsplash.com/photo-1627123424574-724758594e93?auto=format&fit=crop&w=600&q=80',
    watch: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=600&q=80',
    idcard: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=600&q=80',
    keys: 'https://images.unsplash.com/photo-1582139329536-e7284fece509?auto=format&fit=crop&w=600&q=80'
  };

  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  // Item 1: Lost Backpack by Alex
  const item1 = insertItem.run(
    alexId, 'lost', 'Black Nike Backpack', 'Bags & Backpacks',
    'Black everyday backpack with two zip compartments. Left pocket holds a Hydro Flask. Contains course notes and laptop charger.',
    'Nike', 'Black', 'Silver carabiner on right shoulder strap, small scuff mark near bottom seam',
    'Main Library', 'Main Library', yesterday, '15:30', null, 'POTENTIAL_MATCH',
    images.backpack, null
  ).lastInsertRowid;

  // Item 2: Found Backpack by Sarah
  const item2 = insertItem.run(
    sarahId, 'found', 'Black Backpack from Nike', 'Bags & Backpacks',
    'Found near the 2nd floor quiet study pods in the main library. Heavy bag with notebooks inside.',
    'Nike', 'Black', 'Has a metallic clip attached to the shoulder strap',
    'Main Library', 'Main Library', yesterday, '17:00', 'Library Front Desk (Bin #4)', 'VERIFICATION_PENDING',
    images.backpack, 'qr-bk-001'
  ).lastInsertRowid;

  // Item 3: Lost iPhone 14 by Sarah
  const item3 = insertItem.run(
    sarahId, 'lost', 'iPhone 14 Space Black in Clear Case', 'Electronics',
    'Space Black iPhone 14 Pro. Lost while having lunch at the Student Union cafeteria. Has lockscreen with dog wallpaper.',
    'Apple', 'Black', 'Clear MagSafe case with a small holographic sticker in corner',
    'Student Union / Cafeteria', 'Student Union / Cafeteria', threeDaysAgo, '12:45', null, 'POTENTIAL_MATCH',
    images.iphone, null
  ).lastInsertRowid;

  // Item 4: Found iPhone by Marcus
  const item4 = insertItem.run(
    marcusId, 'found', 'Black Apple iPhone Smartphone', 'Electronics',
    'Discovered under a dining booth table in the cafeteria. Battery was at 18%, handed to campus safety security desk.',
    'Apple', 'Black', 'Clear protective case with sticker',
    'Student Union / Cafeteria', 'Student Union / Cafeteria', threeDaysAgo, '13:15', 'Campus Security Station Desk', 'POTENTIAL_MATCH',
    images.iphone, 'qr-ph-002'
  ).lastInsertRowid;

  // Item 5: Lost Calculator by Marcus
  const item5 = insertItem.run(
    marcusId, 'lost', 'Casio FX-991EX Scientific Calculator', 'Electronics',
    'Advanced engineering scientific calculator left behind after Calculus lecture.',
    'Casio', 'Black', 'Initials MW lightly engraved on the battery cover',
    'Central Lecture Hall', 'Central Lecture Hall', fiveDaysAgo, '11:00', null, 'LOST',
    images.calculator, null
  ).lastInsertRowid;

  // Item 6: Found Calculator by Emma
  const item6 = insertItem.run(
    emmaId, 'found', 'Casio Calculator ClassWiz', 'Electronics',
    'Found on row E seat 14 in Central Lecture Hall. Very good condition.',
    'Casio', 'Black', 'Initials etched on the rear panel',
    'Central Lecture Hall', 'Central Lecture Hall', fiveDaysAgo, '12:15', 'Dept Office Box', 'FOUND',
    images.calculator, 'qr-calc-003'
  ).lastInsertRowid;

  // Item 7: Lost AirPods by Emma
  const item7 = insertItem.run(
    emmaId, 'lost', 'Apple AirPods Pro 2 White Case', 'Electronics',
    'White charging case with AirPods inside. Misplaced near the cardio machines or treadmill area in the gym.',
    'Apple', 'White', 'Tiny ding on the charging case lid hinge',
    'Athletics Center / Gym', 'Athletics Center / Gym', today, '09:00', null, 'LOST',
    images.airpods, null
  ).lastInsertRowid;

  // Item 8: Found ID Card by Alex
  const item8 = insertItem.run(
    alexId, 'found', 'Official Student ID Card', 'Student ID Cards',
    'Campus ID card found on the counter at the campus bookstore.',
    'Campus Card Services', 'White', 'Belongs to a student in Bioengineering',
    'Campus Bookstore', 'Campus Bookstore', yesterday, '14:20', 'Bookstore Cashier #2', 'FOUND',
    images.idcard, 'qr-id-004'
  ).lastInsertRowid;

  // Item 9: Returned Item (Key Fob)
  const item9 = insertItem.run(
    alexId, 'found', 'Honda Car Key Fob on Blue Lanyard', 'Keys & Keychains',
    'Car key with gym barcode and Honda emblem found near East Parking structure row 3.',
    'Honda', 'Black', 'Blue woven campus lanyard',
    'East Parking Structure', 'East Parking Structure', fiveDaysAgo, '08:45', 'Returned to owner', 'RETURNED',
    images.keys, 'qr-keys-005'
  ).lastInsertRowid;

  // 3. Run Matching Pipeline
  runMatchingPipeline(db, item1, notificationService);
  runMatchingPipeline(db, item3, notificationService);
  runMatchingPipeline(db, item5, notificationService);

  // 4. Seed an Active Claim for Found Backpack (Alex claiming it)
  const claimStmt = db.prepare(`
    INSERT INTO claims (
      item_id, claimant_id, proof_description, hidden_marks_answers,
      secret_contents, status, admin_notes, reviewer_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const claim1 = claimStmt.run(
    item2,
    alexId,
    'This is my everyday Nike backpack. I forgot it after my 3 PM study session in Library Pod 2.',
    'Silver Nite Ize carabiner clipped to the right shoulder strap. The bottom left has a light scuff from my bicycle rack.',
    'Inside the middle pouch is a green Hydro Flask and my Bio 204 spiral notebook with "A. Chen" written on the inner cover.',
    'VERIFICATION_PENDING',
    null,
    null
  ).lastInsertRowid;

  // 5. Seed Platform-Mediated Messages for Claim 1
  const msgStmt = db.prepare(`
    INSERT INTO messages (claim_id, item_id, sender_id, receiver_id, message_text)
    VALUES (?, ?, ?, ?, ?)
  `);

  msgStmt.run(
    claim1, item2, alexId, sarahId,
    'Hi! I saw your found post for the Nike backpack. I submitted my ownership verification with the specific contents.'
  );

  msgStmt.run(
    claim1, item2, sarahId, alexId,
    'Hello! Thanks for reaching out. I left it safely at the Library Front Desk with the staff so you can pick it up once campus admin approves.'
  );

  msgStmt.run(
    claim1, item2, adminId, alexId,
    'Campus Security: Your verification claim has been received and is queued for verification against the front desk custody record.'
  );

  // 6. Seed In-App Notifications
  const notifStmt = db.prepare(`
    INSERT INTO notifications (user_id, title, message, type, link_url, is_read)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  notifStmt.run(
    alexId,
    '🔔 High Confidence AI Match (89%)',
    'Your lost "Black Nike Backpack" has a strong potential match with a found report at Main Library.',
    'MATCH_FOUND',
    `/item/${item1}?match=${item2}`,
    0
  );

  notifStmt.run(
    sarahId,
    '🔔 Potential Owner Discovered',
    'The "Black Backpack from Nike" you found matches a lost item reported yesterday.',
    'MATCH_FOUND',
    `/item/${item2}?match=${item1}`,
    0
  );

  notifStmt.run(
    sarahId,
    '📋 New Claim Received',
    'A student filed an ownership claim on your reported item "Black Backpack from Nike".',
    'CLAIM_SUBMITTED',
    `/item/${item2}`,
    1
  );

  notifStmt.run(
    alexId,
    '💬 New Message from Campus Security',
    'New message received regarding your ownership claim for the Nike backpack.',
    'MESSAGE_RECEIVED',
    `/item/${item2}`,
    0
  );

  // 7. Seed Admin Audit Logs
  const auditStmt = db.prepare(`
    INSERT INTO admin_audit_logs (admin_id, action, target_type, target_id, details)
    VALUES (?, ?, ?, ?, ?)
  `);

  auditStmt.run(adminId, 'SYSTEM_INIT', 'SYSTEM', null, 'Campus Lost & Found AI Engine initialized with v2.4 matching weights');
  auditStmt.run(adminId, 'ITEM_RETURNED', 'ITEM', item9, 'Item #9 (Honda Key Fob) successfully returned to owner. Case closed.');
  auditStmt.run(adminId, 'CLAIM_REVIEW_STARTED', 'CLAIM', claim1, 'Reviewing verification details for Claim #1');

  console.log('Database seeded successfully!');
  console.log('Demo Credentials:');
  console.log('  Admin:   admin@campus.edu / Password123!');
  console.log('  Student: alex.chen@campus.edu / Password123!');
  console.log('  Student: sarah.jenkins@campus.edu / Password123!');
}

seed().catch(err => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
