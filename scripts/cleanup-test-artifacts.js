const path = require('path');
const fs = require('fs');
const Database = require('../server/node_modules/better-sqlite3');

const isConfirm = process.argv.includes('--confirm');
const dbPath = path.join(__dirname, '..', 'server', 'lost_and_found.db');
const uploadsDir = path.join(__dirname, '..', 'server', 'uploads');

if (!fs.existsSync(dbPath)) {
  console.error('Database file not found at:', dbPath);
  process.exit(1);
}

const db = new Database(dbPath);
// Explicitly enable foreign key constraints to prevent orphaned child rows
db.pragma('foreign_keys = ON');

console.log('================================================================');
console.log('  404 FOUND — FORENSIC DATABASE INVENTORY & AUDIT UTILITY  ');
console.log('================================================================');
console.log(`Target Database: ${dbPath}`);
console.log(`Foreign Keys:    ${db.pragma('foreign_keys', { simple: true }) ? 'ON (Active Enforcement)' : 'OFF'}`);
console.log(`Mode:            ${isConfirm ? '⚠️  EXECUTE CLEANUP (Explicit Approval Mode)' : '🔍 DRY-RUN (Read-Only Inventory Analysis)'}\n`);

// 1. Audit Users
const allUsers = db.prepare('SELECT id, email, full_name, role, created_at FROM users ORDER BY id ASC').all();
const testUserPatterns = [
  /^test\.student\.\d+@campus\.edu$/,
  /^test\.student\.sec\.\d+@campus\.edu$/,
  /^observer\.\d+@campus\.edu$/,
  /^sec\.user\d+\.\d+@campus\.edu$/,
  /^logout\.test\.\d+@campus\.edu$/,
  /^mismatch\.\d+@campus\.edu$/,
  /^test\.e2e\.\d+@campus\.edu$/
];

const confirmedTestUsers = [];
const legitimateUsers = [];
const ambiguousUsers = [];

for (const u of allUsers) {
  if (u.id <= 5) {
    legitimateUsers.push(u);
    continue;
  }
  const isTest = testUserPatterns.some(p => p.test(u.email));
  if (isTest) {
    confirmedTestUsers.push(u);
  } else {
    ambiguousUsers.push(u);
  }
}

const testUserIds = new Set(confirmedTestUsers.map(u => u.id));

console.log(`📊 Users Summary:`);
console.log(`   - Total Users in DB:          ${allUsers.length}`);
console.log(`   - Legitimate Seed Users (1-5): ${legitimateUsers.length}`);
console.log(`   - Confirmed Test Artifacts:    ${confirmedTestUsers.length}`);
if (ambiguousUsers.length > 0) {
  console.log(`   - ⚠️  Ambiguous Users Preserved: ${ambiguousUsers.length}`);
}

// 2. Audit Items
const allItems = db.prepare('SELECT id, user_id, type, title, category, status, primary_image, created_at FROM items ORDER BY id ASC').all();
const confirmedTestItems = [];
const legitimateItems = [];
const ambiguousItems = [];

for (const item of allItems) {
  if (item.id <= 9) {
    legitimateItems.push(item);
    continue;
  }
  const isTestUser = testUserIds.has(item.user_id);
  const isTestTitle = /#\d{13}/.test(item.title) ||
    item.title === 'Silver Apple MacBook Air M2' ||
    item.title === 'Apple MacBook Air Laptop Silver' ||
    item.title === 'Apple Watch Smartwatch Orange Strap' ||
    item.title === 'Space Gray iPad Air M2' ||
    item.title === 'Found Apple iPad Air Gray';

  if (isTestUser || isTestTitle) {
    confirmedTestItems.push(item);
  } else {
    ambiguousItems.push(item);
  }
}

const testItemIds = new Set(confirmedTestItems.map(i => i.id));

console.log(`\n📊 Items Summary:`);
console.log(`   - Total Items in DB:          ${allItems.length}`);
console.log(`   - Legitimate Seed Items (1-9): ${legitimateItems.length}`);
console.log(`   - Confirmed Test Artifacts:    ${confirmedTestItems.length}`);
if (ambiguousItems.length > 0) {
  console.log(`   - ⚠️  Ambiguous Items Preserved: ${ambiguousItems.length}`);
}

// 3. Audit Claims (Pure relational/fixture logic, no id > 1 fallback)
const allClaims = db.prepare('SELECT id, item_id, claimant_id, status, created_at FROM claims ORDER BY id ASC').all();
const confirmedTestClaims = [];
const legitimateClaims = [];
const ambiguousClaims = [];

for (const claim of allClaims) {
  const isTestClaimant = testUserIds.has(claim.claimant_id);
  const isTestItem = testItemIds.has(claim.item_id);

  if (isTestClaimant || isTestItem) {
    confirmedTestClaims.push(claim);
  } else if (claim.id === 1) {
    legitimateClaims.push(claim);
  } else {
    ambiguousClaims.push(claim);
  }
}

const testClaimIds = new Set(confirmedTestClaims.map(c => c.id));

console.log(`\n📊 Claims Summary:`);
console.log(`   - Total Claims in DB:         ${allClaims.length}`);
console.log(`   - Legitimate Seed Claims (1):  ${legitimateClaims.length}`);
console.log(`   - Confirmed Test Artifacts:    ${confirmedTestClaims.length}`);
if (ambiguousClaims.length > 0) {
  console.log(`   - ⚠️  Ambiguous Claims Preserved: ${ambiguousClaims.length}`);
}

// 4. Audit Messages
const allMessages = db.prepare('SELECT id, claim_id, item_id, sender_id, receiver_id, created_at FROM messages ORDER BY id ASC').all();
const confirmedTestMessages = [];
const legitimateMessages = [];
const ambiguousMessages = [];

for (const m of allMessages) {
  const isTestItem = testItemIds.has(m.item_id);
  const isTestSender = testUserIds.has(m.sender_id);
  const isTestReceiver = testUserIds.has(m.receiver_id);
  const isTestClaim = m.claim_id ? testClaimIds.has(m.claim_id) : false;

  if (isTestItem || isTestSender || isTestReceiver || isTestClaim) {
    confirmedTestMessages.push(m);
  } else if (m.id <= 3) {
    legitimateMessages.push(m);
  } else {
    ambiguousMessages.push(m);
  }
}

console.log(`\n📊 Messages Summary:`);
console.log(`   - Total Messages in DB:       ${allMessages.length}`);
console.log(`   - Legitimate Seed Messages:   ${legitimateMessages.length}`);
console.log(`   - Confirmed Test Messages:    ${confirmedTestMessages.length}`);
if (ambiguousMessages.length > 0) {
  console.log(`   - ⚠️  Ambiguous Messages:       ${ambiguousMessages.length}`);
}

// 5. Audit Admin Audit Logs
const allAuditLogs = db.prepare('SELECT id, admin_id, action, target_type, target_id, created_at FROM admin_audit_logs ORDER BY id ASC').all();
const confirmedTestAuditLogs = [];
const legitimateAuditLogs = [];
const ambiguousAuditLogs = [];

for (const a of allAuditLogs) {
  const isTestTarget = (a.target_type === 'ITEM' && testItemIds.has(a.target_id)) ||
                       (a.target_type === 'CLAIM' && testClaimIds.has(a.target_id));
  const isTestAdmin = testUserIds.has(a.admin_id);

  if (isTestTarget || isTestAdmin) {
    confirmedTestAuditLogs.push(a);
  } else if (a.id <= 3) {
    legitimateAuditLogs.push(a);
  } else {
    ambiguousAuditLogs.push(a);
  }
}

console.log(`\n📊 Admin Audit Logs Summary:`);
console.log(`   - Total Audit Logs in DB:     ${allAuditLogs.length}`);
console.log(`   - Legitimate Seed Logs:       ${legitimateAuditLogs.length}`);
console.log(`   - Confirmed Test Logs:        ${confirmedTestAuditLogs.length}`);
if (ambiguousAuditLogs.length > 0) {
  console.log(`   - ⚠️  Ambiguous Audit Logs:     ${ambiguousAuditLogs.length}`);
}

// 6. Audit Notifications (Conservative Relational Investigation)
const allNotifs = db.prepare('SELECT id, user_id, title, message, type, link_url, created_at FROM notifications ORDER BY id ASC').all();
const confirmedTestNotifs = [];
const legitimateNotifs = [];
const ambiguousNotifs = [];

for (const n of allNotifs) {
  if (testUserIds.has(n.user_id)) {
    confirmedTestNotifs.push(n);
    continue;
  }

  // Seed baseline notifications (IDs 1-14 from seed.js)
  if (n.id <= 14) {
    legitimateNotifs.push(n);
    continue;
  }

  // Conservative relational check on seed accounts:
  let isTestRelated = false;
  if (n.link_url) {
    const match = n.link_url.match(/\/item\/(\d+)(?:\?match=(\d+))?/);
    if (match) {
      const pId = parseInt(match[1], 10);
      const mId = match[2] ? parseInt(match[2], 10) : null;
      if (testItemIds.has(pId) || (mId && testItemIds.has(mId))) {
        isTestRelated = true;
      }
    }
  }

  if (isTestRelated) {
    confirmedTestNotifs.push(n);
  } else {
    ambiguousNotifs.push(n);
  }
}

console.log(`\n📊 Notifications Summary:`);
console.log(`   - Total Notifications in DB:  ${allNotifs.length}`);
console.log(`   - Legitimate Seed Notifs:     ${legitimateNotifs.length}`);
console.log(`   - Confirmed Test Notifs:      ${confirmedTestNotifs.length} (${confirmedTestUsers.length > 0 ? allNotifs.filter(n => testUserIds.has(n.user_id)).length : 0} on test users, ${confirmedTestNotifs.filter(n => !testUserIds.has(n.user_id)).length} spurious on seed users)`);
if (ambiguousNotifs.length > 0) {
  console.log(`   - ⚠️  Ambiguous Notifs Preserved: ${ambiguousNotifs.length} (Flagged for manual review)`);
}

// 7. Audit Uploaded Files
const testItemImages = new Set(
  confirmedTestItems
    .map(i => i.primary_image)
    .filter(img => img && img.startsWith('/uploads/'))
    .map(img => path.basename(img))
);

const diskFiles = fs.readdirSync(uploadsDir);
const confirmedTestFiles = [];
const legitimateFiles = [];

for (const f of diskFiles) {
  const fullPath = path.join(uploadsDir, f);
  const stat = fs.statSync(fullPath);
  if (stat.isDirectory()) continue;
  if (f === '.gitkeep') {
    legitimateFiles.push(f);
    continue;
  }
  if (testItemImages.has(f) || (f.startsWith('item-') && f.endsWith('.png') && stat.size === 70)) {
    confirmedTestFiles.push(f);
  } else {
    legitimateFiles.push(f);
  }
}

console.log(`\n📊 Upload Files Summary:`);
console.log(`   - Total Files on Disk:        ${diskFiles.filter(f => !fs.statSync(path.join(uploadsDir, f)).isDirectory()).length}`);
console.log(`   - Legitimate Preserved Files: ${legitimateFiles.length} (${legitimateFiles.join(', ')})`);
console.log(`   - Confirmed Test Artifacts:   ${confirmedTestFiles.length}`);

if (!isConfirm) {
  console.log('\n----------------------------------------------------------------');
  console.log('🔒 NOTICE: NO DATABASE MUTATION PERFORMED.');
  console.log('   In accordance with audit policy, records will NOT be deleted');
  console.log('   without explicit human approval. Run with --confirm to execute');
  console.log('   the verified cleanup.');
  console.log('----------------------------------------------------------------\n');
  process.exit(0);
}

// If --confirm is passed, execute cleanup in an atomic transaction
console.log('\n⚠️  EXECUTING VERIFIED CLEANUP UNDER EXPLICIT HUMAN APPROVAL...');

// Pre-cleanup State Assertion Guard (Fail-Safe Verification)
console.log('🔒 Running Pre-Execution Invariant Assertion Checks...');
const currentCounts = {
  users: db.prepare('SELECT COUNT(*) as c FROM users').get().c,
  items: db.prepare('SELECT COUNT(*) as c FROM items').get().c,
  claims: db.prepare('SELECT COUNT(*) as c FROM claims').get().c,
  messages: db.prepare('SELECT COUNT(*) as c FROM messages').get().c,
  logs: db.prepare('SELECT COUNT(*) as c FROM admin_audit_logs').get().c,
  notifs: db.prepare('SELECT COUNT(*) as c FROM notifications').get().c
};

if (currentCounts.users !== 94 || currentCounts.items !== 119 || currentCounts.claims !== 54 ||
    currentCounts.messages !== 49 || currentCounts.logs !== 95 || currentCounts.notifs !== 1829) {
  console.error('\n❌ FATAL PRE-EXECUTION INVARIANT FAILURE: Live database counts differ from verified baseline!');
  console.error(`   Expected: Users=94, Items=119, Claims=54, Messages=49, Logs=95, Notifs=1829`);
  console.error(`   Current:  Users=${currentCounts.users}, Items=${currentCounts.items}, Claims=${currentCounts.claims}, Messages=${currentCounts.messages}, Logs=${currentCounts.logs}, Notifs=${currentCounts.notifs}`);
  console.error('   Aborting immediately without modifying database or filesystem.');
  process.exit(1);
}

// Verify seed entity integrity
const seedUserCheck = db.prepare('SELECT id, email FROM users WHERE id <= 5 ORDER BY id ASC').all();
const expectedSeedEmails = [
  'admin@campus.edu',
  'alex.chen@campus.edu',
  'sarah.jenkins@campus.edu',
  'marcus.williams@campus.edu',
  'emma.watson@campus.edu'
];
if (seedUserCheck.length !== 5 || !seedUserCheck.every((u, idx) => u.email === expectedSeedEmails[idx])) {
  console.error('\n❌ FATAL PRE-EXECUTION INVARIANT FAILURE: Seed users (IDs 1-5) integrity check failed!');
  process.exit(1);
}

const seedItemCheck = db.prepare('SELECT id FROM items WHERE id <= 9').all();
if (seedItemCheck.length !== 9) {
  console.error('\n❌ FATAL PRE-EXECUTION INVARIANT FAILURE: Seed items (IDs 1-9) count mismatch!');
  process.exit(1);
}

const seedClaimCheck = db.prepare('SELECT id, claimant_id, item_id FROM claims WHERE id = 1').get();
if (!seedClaimCheck || seedClaimCheck.claimant_id !== 2 || seedClaimCheck.item_id !== 2) {
  console.error('\n❌ FATAL PRE-EXECUTION INVARIANT FAILURE: Seed claim #1 integrity check failed!');
  process.exit(1);
}

if (confirmedTestUsers.length !== 89 || confirmedTestItems.length !== 110 || confirmedTestClaims.length !== 53 ||
    confirmedTestMessages.length !== 46 || confirmedTestAuditLogs.length !== 92 || confirmedTestNotifs.length !== 1815 ||
    confirmedTestFiles.length !== 7) {
  console.error('\n❌ FATAL PRE-EXECUTION INVARIANT FAILURE: Identified test artifacts count mismatch!');
  process.exit(1);
}

console.log('✓ All Pre-Execution Invariant Assertions Passed 100%.\n');

const testUserIdsArray = confirmedTestUsers.map(u => u.id);
const testItemIdsArray = confirmedTestItems.map(i => i.id);

const cleanupTx = db.transaction(() => {
  // 1. Delete test admin audit logs
  if (confirmedTestAuditLogs.length > 0) {
    const ids = confirmedTestAuditLogs.map(a => a.id);
    for (let i = 0; i < ids.length; i += 500) {
      const chunk = ids.slice(i, i + 500);
      const placeholders = chunk.map(() => '?').join(',');
      db.prepare(`DELETE FROM admin_audit_logs WHERE id IN (${placeholders})`).run(...chunk);
    }
  }

  // 2. Delete test messages
  if (confirmedTestMessages.length > 0) {
    const ids = confirmedTestMessages.map(m => m.id);
    for (let i = 0; i < ids.length; i += 500) {
      const chunk = ids.slice(i, i + 500);
      const placeholders = chunk.map(() => '?').join(',');
      db.prepare(`DELETE FROM messages WHERE id IN (${placeholders})`).run(...chunk);
    }
  }

  // 3. Delete matches related to test items
  if (testItemIdsArray.length > 0) {
    for (let i = 0; i < testItemIdsArray.length; i += 250) {
      const chunk = testItemIdsArray.slice(i, i + 250);
      const placeholders = chunk.map(() => '?').join(',');
      db.prepare(`DELETE FROM matches WHERE lost_item_id IN (${placeholders}) OR found_item_id IN (${placeholders})`).run(...chunk, ...chunk);
    }
  }

  // 4. Delete test claims
  if (confirmedTestClaims.length > 0) {
    const ids = confirmedTestClaims.map(c => c.id);
    for (let i = 0; i < ids.length; i += 500) {
      const chunk = ids.slice(i, i + 500);
      const placeholders = chunk.map(() => '?').join(',');
      db.prepare(`DELETE FROM claims WHERE id IN (${placeholders})`).run(...chunk);
    }
  }

  // 5. Delete test notifications (chunked to avoid SQLite parameter limit)
  if (confirmedTestNotifs.length > 0) {
    const ids = confirmedTestNotifs.map(n => n.id);
    for (let i = 0; i < ids.length; i += 500) {
      const chunk = ids.slice(i, i + 500);
      const placeholders = chunk.map(() => '?').join(',');
      db.prepare(`DELETE FROM notifications WHERE id IN (${placeholders})`).run(...chunk);
    }
  }

  // 6. Delete test items
  if (testItemIdsArray.length > 0) {
    for (let i = 0; i < testItemIdsArray.length; i += 500) {
      const chunk = testItemIdsArray.slice(i, i + 500);
      const placeholders = chunk.map(() => '?').join(',');
      db.prepare(`DELETE FROM items WHERE id IN (${placeholders})`).run(...chunk);
    }
  }

  // 7. Delete test users
  if (testUserIdsArray.length > 0) {
    for (let i = 0; i < testUserIdsArray.length; i += 500) {
      const chunk = testUserIdsArray.slice(i, i + 500);
      const placeholders = chunk.map(() => '?').join(',');
      db.prepare(`DELETE FROM users WHERE id IN (${placeholders})`).run(...chunk);
    }
  }
});

cleanupTx();

// Remove confirmed test dummy PNGs safely AFTER database transaction successfully commits
console.log('\n🧹 Purging synthetic test uploads from disk...');
let deletedFilesCount = 0;
const failedFiles = [];

for (const f of confirmedTestFiles) {
  try {
    const resolvedPath = path.resolve(path.join(uploadsDir, f));
    // Path traversal prevention guard
    if (!resolvedPath.startsWith(path.resolve(uploadsDir))) {
      throw new Error(`Path traversal security violation for "${f}"`);
    }
    if (fs.existsSync(resolvedPath)) {
      fs.unlinkSync(resolvedPath);
      deletedFilesCount++;
      console.log(`   ✓ Deleted test upload: ${f}`);
    } else {
      console.log(`   ℹ Upload file already deleted: ${f}`);
    }
  } catch (e) {
    failedFiles.push({ file: f, error: e.message });
    console.error(`   ❌ Failed to delete upload file ${f}: ${e.message}`);
  }
}

console.log(`\n✓ Atomic database & filesystem cleanup completed:`);
console.log(`   - Test Users deleted:       ${confirmedTestUsers.length}`);
console.log(`   - Test Items deleted:       ${confirmedTestItems.length}`);
console.log(`   - Test Claims deleted:      ${confirmedTestClaims.length}`);
console.log(`   - Test Messages deleted:    ${confirmedTestMessages.length}`);
console.log(`   - Test Audit Logs deleted:  ${confirmedTestAuditLogs.length}`);
console.log(`   - Test Notifs deleted:      ${confirmedTestNotifs.length}`);
console.log(`   - Test Dummy PNGs deleted:  ${deletedFilesCount} (Failed: ${failedFiles.length})`);

const finalUsers = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
const finalItems = db.prepare('SELECT COUNT(*) as c FROM items').get().c;
const finalClaims = db.prepare('SELECT COUNT(*) as c FROM claims').get().c;
const finalMessages = db.prepare('SELECT COUNT(*) as c FROM messages').get().c;
const finalLogs = db.prepare('SELECT COUNT(*) as c FROM admin_audit_logs').get().c;
const finalNotifs = db.prepare('SELECT COUNT(*) as c FROM notifications').get().c;

console.log(`\n🎉 Restored DB State: Users=${finalUsers}, Items=${finalItems}, Claims=${finalClaims}, Messages=${finalMessages}, AuditLogs=${finalLogs}, Notifs=${finalNotifs}`);
