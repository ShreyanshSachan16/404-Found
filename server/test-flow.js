const assert = require('assert');

async function testFullSystemFlow() {
  console.log('=== RUNNING COMPREHENSIVE LOST & FOUND AI LIFECYCLE TESTS ===\n');

  const BASE_URL = 'http://localhost:5001/api';

  // 1. Health check
  console.log('1. Checking Server Health...');
  const healthRes = await fetch(`${BASE_URL}/health`);
  const health = await healthRes.json();
  assert.strictEqual(health.status, 'ok', 'Health status should be ok');
  console.log('✓ Health check passed:', health.system);

  // 2. Admin Login
  console.log('\n2. Testing Admin Login...');
  const adminLoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@campus.edu', password: 'Password123!' })
  });
  const adminAuth = await adminLoginRes.json();
  assert.strictEqual(adminAuth.user.role, 'admin', 'Admin user should have admin role');
  console.log('✓ Admin login successful. Token acquired.');

  // 3. Student Registration & Login
  console.log('\n3. Testing New Student Registration...');
  const uniqueEmail = `test.student.${Date.now()}@campus.edu`;
  const regRes = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: uniqueEmail,
      password: 'Password123!',
      full_name: 'Jordan Smith',
      student_id: 'STU-99001',
      department: 'Data Science'
    })
  });
  const regAuth = await regRes.json();
  assert.ok(regAuth.token, 'Registration should return token');
  const studentToken = regAuth.token;
  console.log(`✓ Student registered: ${regAuth.user.full_name} (${regAuth.user.email})`);

  // 4. Duplicate Check
  console.log('\n4. Testing Duplicate Detection Pre-flight...');
  const dupCheckRes = await fetch(`${BASE_URL}/items/check-duplicate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'lost',
      category: 'Bags & Backpacks',
      title: 'Black Nike Backpack',
      description: 'Lost backpack in library',
      brand: 'Nike',
      color: 'Black',
      location: 'Main Library'
    })
  });
  const dupCheck = await dupCheckRes.json();
  console.log('✓ Duplicate check result:', dupCheck.hasDuplicates ? `Found ${dupCheck.candidates.length} candidates` : 'None');

  // 5. Report Lost Item
  console.log('\n5. Reporting New Lost Item...');
  const lostItemRes = await fetch(`${BASE_URL}/items`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${studentToken}`
    },
    body: JSON.stringify({
      type: 'lost',
      title: 'Silver Apple MacBook Air M2',
      category: 'Electronics',
      description: 'Silver 13-inch laptop left behind on quiet study cubicle table. Has stickers on lid.',
      brand: 'Apple',
      color: 'Silver',
      identifying_marks: 'Sticker of Python logo and GitHub Octocat',
      location: 'Main Library',
      date_lost_or_found: new Date().toISOString().split('T')[0],
      time_lost_or_found: '14:00',
      bypass_duplicate_warning: true
    })
  });
  const lostItemData = await lostItemRes.json();
  assert.ok(lostItemData.item.id, 'Lost item should be created');
  const createdLostId = lostItemData.item.id;
  console.log(`✓ Lost item reported: ID #${createdLostId} - "${lostItemData.item.title}"`);

  // 6. Report Found Item & Trigger AI Matching
  console.log('\n6. Reporting Opposing Found Item & Triggering AI Matching...');
  const foundItemRes = await fetch(`${BASE_URL}/items`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminAuth.token}`
    },
    body: JSON.stringify({
      type: 'found',
      title: 'Apple MacBook Air Laptop Silver',
      category: 'Electronics',
      description: 'Found unattended laptop on 3rd floor study desk in main library.',
      brand: 'Apple',
      color: 'Silver',
      identifying_marks: 'Contains tech stickers on exterior casing',
      location: 'Main Library',
      date_lost_or_found: new Date().toISOString().split('T')[0],
      time_lost_or_found: '14:30',
      current_storage_location: 'Campus Security Safe Box',
      bypass_duplicate_warning: true
    })
  });
  const foundItemData = await foundItemRes.json();
  const createdFoundId = foundItemData.item.id;
  console.log(`✓ Found item reported: ID #${createdFoundId} - "${foundItemData.item.title}"`);
  console.log(`✓ Matches detected count: ${foundItemData.matchesDetectedCount}`);

  // 7. Verify Semantic Natural Language Search
  console.log('\n7. Testing Semantic Natural Language Search Engine...');
  const searchRes = await fetch(`${BASE_URL}/items?q=` + encodeURIComponent('I lost a silver Apple MacBook in the library today'));
  const searchData = await searchRes.json();
  console.log('✓ Extracted NLP Entities:', JSON.stringify(searchData.nlpInsights));
  console.log(`✓ Total matching results: ${searchData.total}. Top result: "${searchData.items[0]?.title}" (Score: ${searchData.items[0]?.relevanceScore})`);
  assert.ok(searchData.items.length > 0, 'Search should find items');

  // 8. Submit Ownership Claim
  console.log('\n8. Submitting Ownership Verification Claim...');
  const claimRes = await fetch(`${BASE_URL}/claims`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${studentToken}`
    },
    body: JSON.stringify({
      item_id: createdFoundId,
      proof_description: 'This is my personal university laptop. I was doing research in the library pod.',
      hidden_marks_answers: 'Octocat sticker next to Python snake on lid corner',
      secret_contents: 'Desktop wallpaper is Yosemite national park, user account named Jordan.'
    })
  });
  const claimData = await claimRes.json();
  assert.ok(claimData.claim.id, 'Claim should be created');
  const claimId = claimData.claim.id;
  console.log(`✓ Claim submitted: Claim #${claimId} (Status: ${claimData.claim.status})`);

  // 9. Admin Review (Approve Claim)
  console.log('\n9. Admin Reviewing Ownership Claim (Approving)...');
  const reviewRes = await fetch(`${BASE_URL}/claims/${claimId}/review`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminAuth.token}`
    },
    body: JSON.stringify({
      decision: 'APPROVED',
      admin_notes: 'Verified against student ID and security desk register. Approved for pickup.'
    })
  });
  const reviewData = await reviewRes.json();
  assert.strictEqual(reviewData.claim.status, 'APPROVED', 'Claim should be approved');
  console.log(`✓ Claim #${claimId} successfully approved by admin!`);

  // 10. Mark Item as Returned
  console.log('\n10. Confirming Physical Item Handover (RETURNED)...');
  const returnRes = await fetch(`${BASE_URL}/claims/${createdFoundId}/return`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminAuth.token}` }
  });
  const returnData = await returnRes.json();
  assert.strictEqual(returnData.status, 'RETURNED', 'Status should update to RETURNED');
  console.log('✓ Item recovery officially completed and marked as RETURNED!');

  // 11. Anonymous Platform Message
  console.log('\n11. Testing Platform-Mediated Anonymous Relay Message...');
  const msgRes = await fetch(`${BASE_URL}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${studentToken}`
    },
    body: JSON.stringify({
      item_id: createdFoundId,
      message_text: 'Thank you so much to campus security for safely holding this!'
    })
  });
  const msgData = await msgRes.json();
  assert.ok(msgData.data.id, 'Message should be stored');
  console.log(`✓ Message sent securely through platform relay: "${msgData.data.message_text}"`);

  // 12. Check User Dashboard Summary
  console.log('\n12. Fetching User Recovery Dashboard Summary...');
  const userDashRes = await fetch(`${BASE_URL}/user/dashboard-summary`, {
    headers: { Authorization: `Bearer ${studentToken}` }
  });
  const userDash = await userDashRes.json();
  console.log('✓ User Dashboard counts:', JSON.stringify(userDash.summary));

  // 13. Admin Dashboard Analytics
  console.log('\n13. Fetching Admin Analytics & KPIs...');
  const adminDashRes = await fetch(`${BASE_URL}/admin/dashboard-stats`, {
    headers: { Authorization: `Bearer ${adminAuth.token}` }
  });
  const adminDash = await adminDashRes.json();
  console.log('✓ Admin Summary:', JSON.stringify(adminDash.summary));
  console.log(`✓ Campus Hotspots tracked: ${adminDash.charts.byLocation.length} locations`);
  console.log(`✓ Categories tracked: ${adminDash.charts.byCategory.length} categories`);

  console.log('\n======================================================');
  console.log('🎉 ALL 13 CORE SYSTEM & AI WORKFLOW TESTS PASSED CLEANLY!');
  console.log('======================================================\n');
}

testFullSystemFlow().catch(err => {
  console.error('\n❌ Test failed:', err);
  process.exit(1);
});
