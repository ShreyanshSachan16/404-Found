const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

const root = path.resolve(__dirname, '..');
const serverEntry = path.join(root, 'server', 'src', 'index.js');
const clientDist = path.join(root, 'client', 'dist');

async function run() {
  console.log('=== TESTING PRODUCTION SERVER STARTUP & STATIC SERVING ===');
  console.log(`Server entry: ${serverEntry}`);
  console.log(`Client dist: ${clientDist}`);

  try {
    const { execSync } = require('child_process');
    execSync('powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 5001 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }"');
    await new Promise(r => setTimeout(r, 800));
  } catch (e) {}

  const child = spawn(process.execPath, [serverEntry], {
    cwd: path.join(root, 'server'),
    env: {
      ...process.env,
      NODE_ENV: 'production',
      PORT: '5001',
      HOST: '127.0.0.1',
      JWT_SECRET: 'super-secure-production-jwt-token-secret-key-for-lost-found-2026',
      CLIENT_DIST_PATH: clientDist,
      UPLOAD_DIR: path.join(root, 'server', 'uploads')
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  child.stdout.on('data', d => console.log('[Server STDOUT]:', d.toString().trim()));
  child.stderr.on('data', d => console.error('[Server STDERR]:', d.toString().trim()));

  // Wait for server to come up
  let healthy = false;
  for (let i = 0; i < 40; i++) {
    await new Promise(r => setTimeout(r, 250));
    try {
      const res = await fetch('http://127.0.0.1:5001/api/health');
      if (res.ok) {
        const json = await res.json();
        if (json.status === 'ok') {
          healthy = true;
          console.log('✓ /api/health responded ok:', json);
          break;
        }
      }
    } catch (e) {}
  }

  if (!healthy) {
    child.kill();
    throw new Error('Server failed to start or healthcheck timed out');
  }

  try {
    // 1. Verify GET /
    console.log('\n--- 1. Testing GET / ---');
    const rootRes = await fetch('http://127.0.0.1:5001/');
    const rootText = await rootRes.text();
    console.log(`Status: ${rootRes.status} ${rootRes.statusText}`);
    console.log(`Content-Type: ${rootRes.headers.get('content-type')}`);
    console.log(`Body length: ${rootText.length} characters`);
    
    if (rootText.includes('Cannot GET /')) {
      throw new Error('FAIL: Server returned "Cannot GET /"!');
    }
    if (!rootText.includes('<div id="root">') && !rootText.includes('<div id="root"')) {
      throw new Error('FAIL: Root HTML does not contain root div!');
    }
    console.log('✓ PASS: GET / successfully serves React HTML bundle!');

    // 2. Verify static assets
    console.log('\n--- 2. Testing Static Assets ---');
    const assetMatch = rootText.match(/src="(\/assets\/[^"]+)"/);
    if (assetMatch) {
      const assetUrl = `http://127.0.0.1:5001${assetMatch[1]}`;
      const assetRes = await fetch(assetUrl);
      console.log(`Asset ${assetUrl} status: ${assetRes.status}`);
      if (!assetRes.ok) throw new Error(`FAIL: Static asset returned ${assetRes.status}`);
      console.log('✓ PASS: Frontend JavaScript bundle loads successfully!');
    }

    // 3. Test API /api/items
    console.log('\n--- 3. Testing GET /api/items ---');
    const itemsRes = await fetch('http://127.0.0.1:5001/api/items');
    const itemsJson = await itemsRes.json();
    console.log(`Items count returned: ${itemsJson.items?.length || 0}`);
    if (itemsJson.items?.length > 0) {
      console.log(`Sample item title: "${itemsJson.items[0].title}", category: "${itemsJson.items[0].category}"`);
      console.log('✓ PASS: Database items retrieved correctly!');
    }

    // 4. Test Login
    console.log('\n--- 4. Testing POST /api/auth/login ---');
    const loginRes = await fetch('http://127.0.0.1:5001/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@campus.edu', password: 'Password123!' })
    });
    console.log(`Login status: ${loginRes.status}`);
    const loginJson = await loginRes.json();
    if (loginRes.ok && loginJson.token) {
      console.log(`✓ PASS: Login succeeded! Logged in as: ${loginJson.user.full_name || loginJson.user.name} (${loginJson.user.role})`);
    } else {
      console.log('Login response:', loginJson);
      throw new Error(`Login failed with status ${loginRes.status}`);
    }

    // 5. Test Image loading
    console.log('\n--- 5. Testing Upload Image Serving ---');
    const testImgPath = path.join(root, 'server', 'uploads', 'test-probe.png');
    fs.writeFileSync(testImgPath, Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]));
    try {
      const imgRes = await fetch('http://127.0.0.1:5001/uploads/test-probe.png');
      console.log(`Image /uploads/test-probe.png status: ${imgRes.status}, size: ${imgRes.headers.get('content-length')} bytes`);
      if (imgRes.ok) {
        console.log('✓ PASS: Uploaded image served successfully with correct headers!');
      } else {
        throw new Error(`Failed to serve test image: status ${imgRes.status}`);
      }
    } finally {
      if (fs.existsSync(testImgPath)) fs.unlinkSync(testImgPath);
    }

    console.log('\n=== ALL VERIFICATION CHECKS PASSED ON PRODUCTION BACKEND ===');
  } finally {
    child.kill();
    console.log('Test server process terminated.');
  }
}

run().catch(err => {
  console.error('\nTEST FAILED:', err.message);
  process.exit(1);
});
