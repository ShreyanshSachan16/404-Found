const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

if (!process.env.TEST_PORT || !process.env.DB_PATH) {
  console.error('❌ FATAL ISOLATION ERROR: TEST_PORT and DB_PATH environment variables are required.');
  console.error('   Tests must run in an isolated sandbox via "node scripts/test-runner.js".');
  console.error('   Direct execution against live ports or default databases is blocked.');
  process.exit(1);
}

const config = require('./src/config');
const db = require('./src/db/database');
const { inspectMagicBytes } = require('./src/middleware/upload');
const { createRateLimiter } = require('./src/middleware/rateLimiter');
const { checkForDuplicates } = require('./src/services/duplicateService');

async function runSecurityHardeningTests() {
  console.log('================================================================');
  console.log('  404 FOUND — SECURITY HARDENING & REGRESSION TEST SUITE  ');
  console.log('================================================================\n');

  const PORT = parseInt(process.env.TEST_PORT, 10);
  const BASE_URL = `http://127.0.0.1:${PORT}/api`;
  const ROOT_URL = `http://127.0.0.1:${PORT}`;

  // 1. Health check
  console.log('1. Verifying Server Health & Security Headers...');
  const healthRes = await fetch(`${BASE_URL}/health`);
  assert.strictEqual(healthRes.status, 200);
  const healthData = await healthRes.json();
  assert.strictEqual(healthData.status, 'ok');
  console.log('✓ Health verified: DB connection alive, uptime', healthData.uptime, 's');

  // 2. Confirm Password in Registration
  console.log('\n2. Testing Confirm Password Registration Validation...');

  // 2a. Mismatched passwords should be rejected
  const mismatchEmail = `mismatch.${Date.now()}@campus.edu`;
  const mismatchRes = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: mismatchEmail,
      password: 'StrongPassword123!',
      confirmPassword: 'DifferentPassword456!',
      full_name: 'Mismatch Test'
    })
  });
  assert.strictEqual(mismatchRes.status, 400, 'Mismatched passwords must be rejected with 400 Bad Request');
  const mismatchData = await mismatchRes.json();
  assert.ok(mismatchData.error.toLowerCase().includes('passwords do not match'));
  console.log('✓ Mismatched password rejected safely with clear inline message:', mismatchData.error);

  // 2b. Matching passwords should succeed
  const student1Email = `sec.user1.${Date.now()}@campus.edu`;
  const matchRes = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: student1Email,
      password: 'SuperSecretPassword123!',
      confirmPassword: 'SuperSecretPassword123!',
      full_name: 'Student One',
      student_id: 'STU-SEC-01',
      department: 'Cybersecurity'
    })
  });
  assert.strictEqual(matchRes.status, 201, 'Matching passwords should register successfully');
  const student1Data = await matchRes.json();
  const student1Token = student1Data.token;
  const student1Id = student1Data.user.id;
  assert.strictEqual(student1Data.user.role, 'student');
  assert.strictEqual(student1Data.confirmPassword, undefined);
  assert.strictEqual(student1Data.user.confirmPassword, undefined);
  console.log(`✓ Registration with matching passwords successful: User ID #${student1Id}`);

  // 2c. Duplicate registration should be rejected with 409 Conflict
  const dupRes = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: student1Email,
      password: 'SuperSecretPassword123!',
      confirmPassword: 'SuperSecretPassword123!',
      full_name: 'Student One Clone'
    })
  });
  assert.strictEqual(dupRes.status, 409, 'Duplicate email registration must return 409 Conflict');
  console.log('✓ Duplicate account registration blocked safely with 409 Conflict');

  // 2d. Password shorter than 8 characters should be rejected
  const shortPassRes = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: `short.${Date.now()}@campus.edu`,
      password: 'short',
      confirmPassword: 'short',
      full_name: 'Short Password'
    })
  });
  assert.strictEqual(shortPassRes.status, 400);
  console.log('✓ Short password rejected with 400 Bad Request');

  // 3. Register second distinct user
  console.log('\n3. Provisioning Second Isolated Student User...');
  const student2Email = `sec.user2.${Date.now()}@campus.edu`;
  const student2Res = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: student2Email,
      password: 'SuperSecretPassword123!',
      confirmPassword: 'SuperSecretPassword123!',
      full_name: 'Student Two',
      student_id: 'STU-SEC-02',
      department: 'Computer Engineering'
    })
  });
  const student2Data = await student2Res.json();
  const student2Token = student2Data.token;
  const student2Id = student2Data.user.id;
  console.log(`✓ Student 2 provisioned: User ID #${student2Id}`);

  // 4. Authenticate Admin
  console.log('\n4. Authenticating Administrative Authority...');
  const adminRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@campus.edu', password: 'Password123!' })
  });
  assert.strictEqual(adminRes.status, 200);
  const adminData = await adminRes.json();
  const adminToken = adminData.token;
  console.log('✓ Admin authenticated successfully.');

  // 5. Invalid login attempts
  console.log('\n5. Testing Invalid Login Credentials & Error Safety...');
  const badLoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: student1Email, password: 'WrongPassword123!' })
  });
  assert.strictEqual(badLoginRes.status, 401);
  const badLoginData = await badLoginRes.json();
  assert.strictEqual(badLoginData.error, 'Invalid email or password.');
  console.log('✓ Invalid credentials return safe generic 401 error message without enumeration.');

  // 6. Token Revocation on Logout
  console.log('\n6. Testing Session Invalidation on Logout...');
  // Provision disposable user to test logout
  const logoutUserRes = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: `logout.test.${Date.now()}@campus.edu`,
      password: 'Password123!',
      full_name: 'Logout Test'
    })
  });
  const logoutUserData = await logoutUserRes.json();
  const disposableToken = logoutUserData.token;

  // Verify token works
  const preLogout = await fetch(`${BASE_URL}/auth/me`, {
    headers: { Authorization: `Bearer ${disposableToken}` }
  });
  assert.strictEqual(preLogout.status, 200, 'Active token should allow /auth/me');

  // Perform logout
  const logoutRes = await fetch(`${BASE_URL}/auth/logout`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${disposableToken}` }
  });
  assert.strictEqual(logoutRes.status, 200);

  // Attempt to use revoked token
  const postLogout = await fetch(`${BASE_URL}/auth/me`, {
    headers: { Authorization: `Bearer ${disposableToken}` }
  });
  assert.strictEqual(postLogout.status, 401, 'Revoked token must be rejected with 401');
  console.log('✓ Token revocation verified: revoked token rejected by auth middleware.');

  // 7. Authorization & IDOR: Item Ownership Protection
  console.log('\n7. Testing Item Ownership & IDOR Protection (Student 1 vs Student 2)...');
  // Student 1 reports lost item
  const item1Res = await fetch(`${BASE_URL}/items`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${student1Token}`
    },
    body: JSON.stringify({
      type: 'lost',
      title: `Student1 Dell XPS 15 Laptop #${Date.now()}`,
      category: 'Electronics',
      description: 'Silver Dell laptop with black keyboard',
      location: 'Main Library',
      date_lost_or_found: new Date().toISOString().split('T')[0],
      bypass_duplicate_warning: true
    })
  });
  const item1Data = await item1Res.json();
  const item1Id = item1Data.item.id;
  assert.strictEqual(item1Res.status, 201);
  console.log(`✓ Student 1 created item #${item1Id}`);

  // Student 2 attempts to edit Student 1's item
  const editAttackRes = await fetch(`${BASE_URL}/items/${item1Id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${student2Token}`
    },
    body: JSON.stringify({ title: 'Hacked Title by Student 2' })
  });
  assert.strictEqual(editAttackRes.status, 403, 'Editing another user item must return 403 Forbidden');
  console.log('✓ IDOR Edit Attack Blocked: Student 2 received 403 Forbidden when trying to edit Item #', item1Id);

  // Student 2 attempts to delete Student 1's item
  const deleteAttackRes = await fetch(`${BASE_URL}/items/${item1Id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${student2Token}` }
  });
  assert.strictEqual(deleteAttackRes.status, 403, 'Deleting another user item must return 403 Forbidden');
  console.log('✓ IDOR Delete Attack Blocked: Student 2 received 403 Forbidden when trying to delete Item #', item1Id);

  // Student 1 attempts unauthorized privilege escalation on status (e.g. self-approving to RETURNED or VERIFIED)
  const statusEscalationRes = await fetch(`${BASE_URL}/items/${item1Id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${student1Token}`
    },
    body: JSON.stringify({ status: 'RETURNED' })
  });
  assert.strictEqual(statusEscalationRes.status, 403, 'Non-admin user cannot arbitrarily escalate status to RETURNED');
  console.log('✓ Status Escalation Blocked: Non-admin received 403 when trying to set status to RETURNED');

  // 8. File Upload & Magic Byte Verification
  console.log('\n8. Testing File Upload Security & Magic Byte Inspection...');
  // Test direct inspection utility
  const tempFakeExe = path.join(config.UPLOAD_DIR, `temp-fake-${Date.now()}.jpg`);
  fs.writeFileSync(tempFakeExe, 'MZ\x90\x00\x03\x00\x00\x00DOS executable shellcode');
  const exeDetected = inspectMagicBytes(tempFakeExe, ['image']);
  fs.unlinkSync(tempFakeExe);
  assert.strictEqual(exeDetected, false, 'Fake image containing MZ header must be rejected by magic bytes');
  console.log('✓ Magic byte validator correctly detected and rejected disguised executable');

  // Test genuine JPEG header
  const tempRealJpg = path.join(config.UPLOAD_DIR, `temp-real-${Date.now()}.jpg`);
  const validJpegBuffer = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x48]);
  fs.writeFileSync(tempRealJpg, validJpegBuffer);
  const jpgDetected = inspectMagicBytes(tempRealJpg, ['image']);
  fs.unlinkSync(tempRealJpg);
  assert.strictEqual(jpgDetected, 'image/jpeg', 'Genuine JPEG magic bytes must be identified');
  console.log('✓ Magic byte validator correctly recognized genuine JPEG format');

  // Test upload endpoint with fake payload via multipart
  const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW';
  const fakeMultipartBody = [
    `--${boundary}`,
    'Content-Disposition: form-data; name="type"',
    '',
    'lost',
    `--${boundary}`,
    'Content-Disposition: form-data; name="title"',
    '',
    'Malicious Upload Attempt',
    `--${boundary}`,
    'Content-Disposition: form-data; name="category"',
    '',
    'Electronics',
    `--${boundary}`,
    'Content-Disposition: form-data; name="description"',
    '',
    'Test with fake image content',
    `--${boundary}`,
    'Content-Disposition: form-data; name="location"',
    '',
    'Main Library',
    `--${boundary}`,
    'Content-Disposition: form-data; name="date_lost_or_found"',
    '',
    new Date().toISOString().split('T')[0],
    `--${boundary}`,
    'Content-Disposition: form-data; name="image"; filename="payload.jpg"',
    'Content-Type: image/jpeg',
    '',
    'NOT_A_REAL_IMAGE_DATA_PAYLOAD',
    `--${boundary}--`
  ].join('\r\n');

  const uploadAttackRes = await fetch(`${BASE_URL}/items`, {
    method: 'POST',
    headers: {
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
      Authorization: `Bearer ${student1Token}`
    },
    body: fakeMultipartBody
  });
  assert.strictEqual(uploadAttackRes.status, 400, 'Disguised non-image file upload must be rejected with 400 Bad Request');
  const uploadAttackData = await uploadAttackRes.json();
  assert.ok(uploadAttackData.error.includes('permitted'), 'Error message must state invalid file content');
  console.log('✓ Disguised non-image payload rejected by server-side magic byte inspection:', uploadAttackData.error);

  // 9. Static File Protection & Windows Case-Insensitivity Defense
  console.log('\n9. Testing Static File Protection & Case-Insensitive Receipt Blocking...');
  // Prohibit direct access to database files
  const dbDirectRes = await fetch(`${ROOT_URL}/lost_and_found.db`);
  assert.strictEqual(dbDirectRes.status, 403, 'Direct access to .db must return 403 Forbidden');
  console.log('✓ Direct database file access returned 403 Forbidden');

  // Prohibit direct access to env files
  const envDirectRes = await fetch(`${ROOT_URL}/.env`);
  assert.strictEqual(envDirectRes.status, 403, 'Direct access to .env must return 403 Forbidden');
  console.log('✓ Direct environment file access returned 403 Forbidden');

  // Prohibit static receipts access (test multiple casing: receipts, Receipts, RECEIPTS)
  const receiptsLowerRes = await fetch(`${ROOT_URL}/uploads/receipts/dummy.jpg`);
  assert.strictEqual(receiptsLowerRes.status, 403, 'Static access to /uploads/receipts must return 403');
  const receiptsUpperRes = await fetch(`${ROOT_URL}/uploads/Receipts/dummy.jpg`);
  assert.strictEqual(receiptsUpperRes.status, 403, 'Windows case variation /uploads/Receipts must return 403');
  const receiptsAllUpperRes = await fetch(`${ROOT_URL}/uploads/RECEIPTS/dummy.jpg`);
  assert.strictEqual(receiptsAllUpperRes.status, 403, 'Windows case variation /uploads/RECEIPTS must return 403');
  console.log('✓ Case-insensitive and encoded access to /uploads/receipts strictly blocked (403 Forbidden)');

  // 10. Claim Privacy and Receipt Access Control
  console.log('\n10. Testing Claim Privacy & Confidential Receipt Downloads...');
  // Admin reports found item
  const foundRes = await fetch(`${BASE_URL}/items`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      type: 'found',
      title: `AirPods Pro Case #${Date.now()}`,
      category: 'Electronics',
      description: 'Found in student union lounge',
      location: 'Student Union / Cafeteria',
      date_lost_or_found: new Date().toISOString().split('T')[0],
      bypass_duplicate_warning: true
    })
  });
  const foundData = await foundRes.json();
  const foundItemId = foundData.item.id;

  // Student 1 submits claim
  const claimRes = await fetch(`${BASE_URL}/claims`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${student1Token}`
    },
    body: JSON.stringify({
      item_id: foundItemId,
      proof_description: 'These are my personal AirPods. Engraved with initials JS.',
      hidden_marks_answers: 'Case has custom sticker inside lid.',
      secret_contents: 'Serial number ends in 891B.'
    })
  });
  assert.strictEqual(claimRes.status, 201);
  const claimData = await claimRes.json();
  const claimId = claimData.claim.id;
  console.log(`✓ Student 1 submitted claim #${claimId} on item #${foundItemId}`);

  // Student 2 attempts to fetch Student 1's claim receipt
  const receiptAttackRes = await fetch(`${BASE_URL}/claims/${claimId}/receipt`, {
    headers: { Authorization: `Bearer ${student2Token}` }
  });
  // Since no receipt file was uploaded for this claim, should return 404 or 403 (unauthorized)
  assert.ok([403, 404].includes(receiptAttackRes.status));

  // Student 2 attempts to guess receipt by filename endpoint
  const filenameAttackRes = await fetch(`${BASE_URL}/claims/receipt-file/receipt-secret-99999.jpg`, {
    headers: { Authorization: `Bearer ${student2Token}` }
  });
  assert.strictEqual(filenameAttackRes.status, 404, 'Non-admin guessing non-existent receipt must get 404');
  console.log('✓ Receipt guessing by unauthorized student safely rejected with 404/403');

  // Student 2 attempts path traversal
  const traversalAttackRes = await fetch(`${BASE_URL}/claims/receipt-file/..%2F..%2Fpackage.json`, {
    headers: { Authorization: `Bearer ${student2Token}` }
  });
  assert.ok([400, 403, 404].includes(traversalAttackRes.status), 'Path traversal must be rejected');
  console.log('✓ Path traversal attempt on receipt endpoint safely rejected');

  // 11. Anonymous Messaging Recipient Authorization
  console.log('\n11. Testing Platform Messaging Recipient Protection...');
  // Student 2 tries to send message on found item to unrelated user ID (e.g. user 9999)
  const msgAttackRes = await fetch(`${BASE_URL}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${student2Token}`
    },
    body: JSON.stringify({
      item_id: foundItemId,
      receiver_id: 9999, // Unrelated recipient
      message_text: 'Spam message attempt'
    })
  });
  assert.strictEqual(msgAttackRes.status, 403, 'Sending message to unauthorized recipient must return 403 Forbidden');
  console.log('✓ Platform relay rejected message dispatch to unauthorized recipient with 403');

  // 12. Input Size Limits (DoS / ReDoS Prevention)
  console.log('\n12. Testing Request Length Bounds (DoS / ReDoS Prevention)...');
  const oversizedTitle = 'A'.repeat(250);
  const oversizedReportRes = await fetch(`${BASE_URL}/items`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${student1Token}`
    },
    body: JSON.stringify({
      type: 'lost',
      title: oversizedTitle,
      category: 'Electronics',
      description: 'Oversized test',
      location: 'Main Library',
      date_lost_or_found: new Date().toISOString().split('T')[0]
    })
  });
  assert.strictEqual(oversizedReportRes.status, 400, 'Oversized item title must return 400 Bad Request');
  console.log('✓ Oversized input rejected safely with 400 Bad Request');

  // 13. Semantic Search Length Bounds
  console.log('\n13. Testing Semantic Search Query Length Bounds...');
  const massiveQuery = 'lost watch '.repeat(100); // 1100 chars
  const searchRes = await fetch(`${BASE_URL}/items?q=` + encodeURIComponent(massiveQuery));
  assert.strictEqual(searchRes.status, 200, 'Truncated long search query must process safely without hanging');
  console.log('✓ Abusive oversized query processed safely and returned HTTP 200 without event loop blocking');

  // 14. Rate Limit Production Hardening & Bypass Isolation Regression
  console.log('\n14. Testing Rate-Limit Production Guard & Bypass Regression...');

  // 14a. Verify rate limiter enforces limits in production even if DISABLE_RATE_LIMIT=true
  const savedEnv = { ...process.env };
  try {
    process.env.NODE_ENV = 'production';
    process.env.DISABLE_RATE_LIMIT = 'true';

    const prodLimiter = createRateLimiter({ windowMs: 10000, max: 2, message: 'Throttled' });
    let blocked = false;
    let headersSet = {};
    const mockRes = {
      setHeader: (k, v) => { headersSet[k] = v; },
      status: (code) => ({
        json: (data) => {
          if (code === 429) blocked = true;
          return data;
        }
      })
    };
    const mockReq = {
      path: '/api/items',
      socket: { remoteAddress: '10.0.0.99' },
      headers: {}
    };

    // Request 1 & 2 should succeed
    prodLimiter(mockReq, mockRes, () => {});
    prodLimiter(mockReq, mockRes, () => {});
    assert.strictEqual(blocked, false, 'First 2 requests must pass under limit');

    // Request 3 must be blocked with 429
    prodLimiter(mockReq, mockRes, () => {});
    assert.strictEqual(blocked, true, 'Request 3 MUST be blocked with 429 in production even with DISABLE_RATE_LIMIT=true!');
    console.log('✓ Rate-limit guard verified: DISABLE_RATE_LIMIT=true is strictly ignored in production.');

    // 14b. Verify spoofed X-Forwarded-For cannot bypass limits without trust proxy
    let spoofBlocked = false;
    const spoofReq = {
      path: '/api/items',
      socket: { remoteAddress: '10.0.0.99' }, // Same real socket
      headers: { 'x-forwarded-for': '198.51.100.77' } // Attempted spoofed IP
    };
    prodLimiter(spoofReq, {
      setHeader: () => {},
      status: (code) => ({
        json: () => { if (code === 429) spoofBlocked = true; }
      })
    }, () => {});
    assert.strictEqual(spoofBlocked, true, 'Spoofed X-Forwarded-For must NOT bypass rate limiter when trust proxy is not configured');
    console.log('✓ Proxy header spoofing defense verified: untrusted X-Forwarded-For cannot bypass limits.');

    // 14c. Verify test bypass works only when NODE_ENV === 'test'
    process.env.NODE_ENV = 'test';
    process.env.DISABLE_RATE_LIMIT = 'true';
    const testLimiter = createRateLimiter({ windowMs: 10000, max: 1, message: 'Throttled' });
    let testBypassPassed = false;
    testLimiter(mockReq, mockRes, () => { testBypassPassed = true; });
    assert.strictEqual(testBypassPassed, true, 'Bypass must work when NODE_ENV === test and DISABLE_RATE_LIMIT === true');
    console.log('✓ Test bypass isolation verified: works strictly under NODE_ENV === test.');
  } finally {
    process.env = savedEnv;
  }

  // 15. Duplicate Detection Constraints Regression (Category & Time Window)
  console.log('\n15. Testing Duplicate Detection Cross-Category & Time Window Regression...');

  // 15a. Insert a test item 75 days in the past with category 'Electronics'
  const oldDate = new Date(Date.now() - 75 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const oldItemRes = db.prepare(`
    INSERT INTO items (
      user_id, type, title, category, description, brand, color, location,
      date_lost_or_found, status, created_at
    ) VALUES (?, 'lost', 'Apple iPhone 14 Pro Space Black', 'Electronics',
      'Lost phone at library 2nd floor desk', 'Apple', 'Black', 'Main Library',
      ?, 'LOST', datetime('now', '-75 days')
    )
  `).run(student1Id, oldDate);
  const oldItemId = oldItemRes.lastInsertRowid;

  try {
    // Check duplicate with different category ('Other') and slight wording variation
    const candidateItem = {
      type: 'lost',
      category: 'Other', // Mismatched category!
      title: 'Apple iPhone 14 Pro',
      description: 'Lost phone at library desk',
      brand: 'Apple',
      color: 'Black',
      location: 'Main Library'
    };

    const dups = checkForDuplicates(db, candidateItem);
    assert.ok(dups.length > 0, 'Must detect duplicate even when category is mismatched and item is older than 60 days!');
    const matched = dups.find(d => d.item.id === oldItemId);
    assert.ok(matched, 'The 75-day-old cross-category item must be detected as a duplicate candidate!');
    console.log(`✓ Duplicate detection regression passed: detected 75-day-old item across categories with score ${matched.similarityScore}`);

    // Non-duplicate check (completely different item)
    const distinctItem = {
      type: 'lost',
      category: 'Clothing & Apparel',
      title: 'Red Nike Running Shoes',
      description: 'Lost running shoes at track',
      brand: 'Nike',
      color: 'Red',
      location: 'Athletics Center / Gym'
    };
    const distinctDups = checkForDuplicates(db, distinctItem);
    const falseMatch = distinctDups.find(d => d.item.id === oldItemId);
    assert.strictEqual(falseMatch, undefined, 'Distinct item must NOT be flagged as duplicate of iPhone!');
    console.log('✓ Distinct item correctly produced no false duplicate matches.');
  } finally {
    // Clean up test regression item
    db.prepare('DELETE FROM items WHERE id = ?').run(oldItemId);
  }

  // 16. Production JWT_SECRET Enforcement via Isolated Subprocesses
  console.log('\n16. Testing Production JWT_SECRET Enforcement via Isolated Subprocesses...');
  const serverConfigPath = path.resolve(__dirname, 'src', 'config.js');

  // 16a. Short secret in production (< 32 chars) must exit with code 1 and fatal message
  const resShort = spawnSync(process.execPath, [
    '-e',
    `require(${JSON.stringify(serverConfigPath)})`
  ], {
    env: { ...process.env, NODE_ENV: 'production', JWT_SECRET: 'too-short-secret-key' },
    encoding: 'utf8'
  });
  assert.strictEqual(resShort.status, 1, 'Short JWT_SECRET in production must exit with code 1');
  assert.ok(resShort.stderr.includes('FATAL SECURITY ERROR'), 'Must throw FATAL SECURITY ERROR for short secret');
  console.log('✓ Insecure short JWT_SECRET rejected with fatal error in production.');

  // 16b. Default placeholder secret in production must exit with code 1
  const resDefault = spawnSync(process.execPath, [
    '-e',
    `require(${JSON.stringify(serverConfigPath)})`
  ], {
    env: { ...process.env, NODE_ENV: 'production', JWT_SECRET: 'super-secure-campus-lost-found-secret-key-2026' },
    encoding: 'utf8'
  });
  assert.strictEqual(resDefault.status, 1, 'Default placeholder secret must exit with code 1');
  assert.ok(resDefault.stderr.includes('FATAL SECURITY ERROR'), 'Must throw FATAL SECURITY ERROR for default secret');
  console.log('✓ Default placeholder JWT_SECRET rejected with fatal error in production.');

  // 16c. Strong secret in production must succeed
  const resStrong = spawnSync(process.execPath, [
    '-e',
    `const c = require(${JSON.stringify(serverConfigPath)}); console.log(c.JWT_SECRET);`
  ], {
    env: { ...process.env, NODE_ENV: 'production', JWT_SECRET: 'a_very_strong_production_secret_key_1234567890' },
    encoding: 'utf8'
  });
  assert.strictEqual(resStrong.status, 0, 'Strong JWT_SECRET must exit with code 0');
  assert.strictEqual(resStrong.stdout.trim(), 'a_very_strong_production_secret_key_1234567890');
  console.log('✓ Strong valid JWT_SECRET accepted cleanly in production.');

  // 16d. Missing secret in production auto-generates persistent cryptographically strong key
  const secretFile = path.join(path.dirname(serverConfigPath), '..', '.jwt_secret');
  const secretExistedBefore = fs.existsSync(secretFile);
  let preservedSecret = null;
  if (secretExistedBefore) preservedSecret = fs.readFileSync(secretFile, 'utf8');

  try {
    const envNoSecret = { ...process.env, NODE_ENV: 'production' };
    delete envNoSecret.JWT_SECRET;
    const resMissing = spawnSync(process.execPath, [
      '-e',
      `delete process.env.JWT_SECRET; const c = require(${JSON.stringify(serverConfigPath)}); console.log(c.JWT_SECRET.length);`
    ], {
      env: envNoSecret,
      encoding: 'utf8'
    });
    assert.strictEqual(resMissing.status, 0, 'Missing secret must succeed via auto-generation');
    assert.strictEqual(parseInt(resMissing.stdout.trim(), 10) >= 32, true, 'Auto-generated secret must be at least 32 chars');
    console.log(`✓ Missing secret auto-generates strong key (${resMissing.stdout.trim()} chars) in production.`);
  } finally {
    if (secretExistedBefore && preservedSecret) {
      fs.writeFileSync(secretFile, preservedSecret);
    } else if (!secretExistedBefore && fs.existsSync(secretFile)) {
      try { fs.unlinkSync(secretFile); } catch (e) {}
    }
  }

  console.log('\n================================================================');
  console.log('🎉 ALL 16 SECURITY HARDENING & REGRESSION CHECKS PASSED CLEANLY!');
  console.log('================================================================\n');
}

runSecurityHardeningTests().catch(err => {
  console.error('\n❌ Security Hardening Test Suite Failed:', err);
  process.exit(1);
});
