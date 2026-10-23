const { app } = require('electron');
const BackendManager = require('../electron/backend-manager');

async function verifyDesktopBackend() {
  console.log('=== VERIFYING ELECTRON DESKTOP BACKEND INTEGRATION ===\n');

  const backend = new BackendManager();

  console.log('1. Checking Resolved Paths:');
  console.log('   - UserData Dir:', backend.userDataDir);
  console.log('   - Data Dir:    ', backend.dataDir);
  console.log('   - DB Path:     ', backend.dbPath);
  console.log('   - Uploads Dir: ', backend.uploadsDir);
  console.log('   - Receipts Dir:', backend.receiptsDir);
  console.log('   - Logs Dir:    ', backend.logsDir);
  console.log('   - Node Runtime:', backend.resolveNodeExecutable());
  console.log('   - Server Entry:', backend.resolveServerEntry());
  console.log('   - Client Dist: ', backend.resolveClientDist());

  console.log('\n2. Testing Port Availability Detection...');
  const port = await backend.findAvailablePort(5001);
  console.log(`✓ Port chosen: ${port}`);

  console.log('\n3. Starting Internal Backend Process...');
  const startResult = await backend.start();
  console.log(`✓ Backend started successfully at ${startResult.serverUrl}`);

  console.log('\n4. Verifying Health Endpoint via Loopback...');
  const res = await fetch(`${startResult.serverUrl}/api/health`);
  const data = await res.json();
  console.log('✓ Health response:', JSON.stringify(data));
  if (data.status !== 'ok') {
    throw new Error(`Expected health ok, got ${data.status}`);
  }

  console.log('\n5. Verifying Metadata Endpoint...');
  const metaRes = await fetch(`${startResult.serverUrl}/api/meta`);
  const meta = await metaRes.json();
  console.log(`✓ Meta categories: ${meta.categories.length}, locations: ${meta.locations.length}`);

  console.log('\n6. Verifying Production Frontend Delivery...');
  const frontRes = await fetch(`${startResult.serverUrl}/`);
  const html = await frontRes.text();
  console.log(`✓ Frontend served HTML length: ${html.length} chars (contains <div id="root">: ${html.includes('id="root"')})`);

  console.log('\n7. Verifying Clean Graceful Shutdown...');
  await backend.stop();
  console.log('✓ Backend process stopped cleanly.');

  console.log('\n======================================================');
  console.log('🎉 ELECTRON BACKEND INTEGRATION VERIFICATION PASSED!');
  console.log('======================================================');
}

app.whenReady().then(async () => {
  try {
    await verifyDesktopBackend();
    app.exit(0);
  } catch (err) {
    console.error('❌ Verification failed:', err);
    app.exit(1);
  }
});
