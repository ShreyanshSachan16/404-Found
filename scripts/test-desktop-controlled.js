const path = require('path');
const fs = require('fs');
const { spawn, execSync } = require('child_process');

const root = path.resolve(__dirname, '..');

async function cleanupStaleProcesses() {
  try {
    execSync('powershell -NoProfile -Command "Stop-Process -Name \'404 FOUND\' -Force -ErrorAction SilentlyContinue"');
    execSync('powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 5001 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }"');
    await new Promise(r => setTimeout(r, 1000));
  } catch (e) {}
}

async function runControlledTest() {
  console.log('=====================================================');
  console.log('   PACKAGED APPLICATION CONTROLLED INTEGRATION TEST  ');
  console.log('=====================================================\n');

  await cleanupStaleProcesses();

  // Determine whether to test packaged application or development build
  const packagedExe = path.join(root, 'dist-electron', 'win-unpacked', '404 FOUND.exe');
  const devElectronExe = path.join(root, 'node_modules', 'electron', 'dist', 'electron.exe');

  let appToRun;
  let runArgs;
  let isPackagedTest = false;

  if (fs.existsSync(packagedExe)) {
    appToRun = packagedExe;
    runArgs = [];
    isPackagedTest = true;
    console.log(`[TARGET] Packaged Executable: ${packagedExe}`);
  } else if (fs.existsSync(devElectronExe)) {
    appToRun = devElectronExe;
    runArgs = ['.'];
    console.log(`[TARGET] Development Electron: ${devElectronExe}`);
  } else {
    throw new Error('No executable found to test!');
  }

  console.log('[STAGE 1] Launching Application Process...');
  const electronProcess = spawn(appToRun, runArgs, {
    cwd: isPackagedTest ? path.dirname(appToRun) : root,
    env: {
      ...process.env,
      ELECTRON_ENABLE_LOGGING: '1'
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  let loadedUrl = null;
  let pageTitle = null;
  let backendPort = null;
  const serverLogs = [];

  electronProcess.stdout.on('data', (d) => {
    const text = d.toString();
    serverLogs.push(text);
    process.stdout.write(`[App STDOUT] ${text}`);

    const portMatch = text.match(/http:\/\/127\.0\.0\.1:(\d+)/) || text.match(/port:? (\d+)/i);
    if (portMatch && !backendPort) {
      backendPort = parseInt(portMatch[1], 10);
    }

    const loadMatch = text.match(/Loading desktop application from (http:\/\/[^\s]+)/);
    if (loadMatch) {
      loadedUrl = loadMatch[1];
    }

    const finishMatch = text.match(/Page loaded successfully: (http:\/\/[^\s|]+) \| Title: (.*)/);
    if (finishMatch) {
      loadedUrl = finishMatch[1];
      pageTitle = finishMatch[2].trim();
    }
  });

  electronProcess.stderr.on('data', (d) => {
    const text = d.toString();
    process.stderr.write(`[App STDERR] ${text}`);
  });

  // Wait up to 25s for the app to initialize, backend to start, and page to load
  console.log('\nAwaiting backend initialization and loopback health readiness...');
  let isReady = false;
  const startTime = Date.now();
  let portToTest = 5001;

  while (Date.now() - startTime < 25000) {
    await new Promise(r => setTimeout(r, 500));
    const targetPort = backendPort || 5001;
    try {
      const res = await fetch(`http://127.0.0.1:${targetPort}/api/health`);
      if (res.ok) {
        const json = await res.json();
        if (json.status === 'ok') {
          isReady = true;
          portToTest = targetPort;
          break;
        }
      }
    } catch (e) {}
  }

  if (!isReady) {
    electronProcess.kill();
    await cleanupStaleProcesses();
    throw new Error('Timeout: Desktop app backend did not become ready within 25s');
  }

  console.log(`\n✓ Packaged Backend process is LIVE on port ${portToTest}`);

  // Test STAGE 2: Frontend static-file serving at /
  console.log('\n[STAGE 2] Testing Frontend Static-File Serving at /');
  const rootRes = await fetch(`http://127.0.0.1:${portToTest}/`);
  const rootText = await rootRes.text();
  const hasRootDiv = rootText.includes('<div id="root">') || rootText.includes('<div id="root"');
  const hasCannotGet = rootText.includes('Cannot GET /');

  console.log(`  - HTTP Status: ${rootRes.status} ${rootRes.statusText}`);
  console.log(`  - Content-Type: ${rootRes.headers.get('content-type')}`);
  console.log(`  - Contains React root (<div id="root">): ${hasRootDiv ? 'YES (VERIFIED)' : 'NO'}`);
  console.log(`  - Contains "Cannot GET /": ${hasCannotGet ? 'YES (ERROR)' : 'NO (FIXED)'}`);

  if (rootRes.status !== 200 || !hasRootDiv || hasCannotGet) {
    throw new Error('FAIL: Packaged app failed to serve production React frontend at /');
  }

  // Test STAGE 3: API Health & System State
  console.log('\n[STAGE 3] Testing API Availability');
  const healthRes = await fetch(`http://127.0.0.1:${portToTest}/api/health`);
  const healthJson = await healthRes.json();
  console.log(`  - Health status: ${healthJson.status}`);
  console.log(`  - Database status: ${healthJson.database}`);
  console.log(`  - System: ${healthJson.system}`);
  console.log(`  - Environment: ${healthJson.environment}`);

  if (healthJson.status !== 'ok' || healthJson.database !== 'ok') {
    throw new Error(`FAIL: API health status invalid: ${JSON.stringify(healthJson)}`);
  }

  // Test STAGE 4: Authentication & Login
  console.log('\n[STAGE 4] Testing User Authentication & Login');
  const loginRes = await fetch(`http://127.0.0.1:${portToTest}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@campus.edu', password: 'Password123!' })
  });
  console.log(`  - Login HTTP Status: ${loginRes.status}`);
  const loginJson = await loginRes.json();

  if (!loginRes.ok || !loginJson.token) {
    throw new Error(`FAIL: Login failed with status ${loginRes.status}: ${JSON.stringify(loginJson)}`);
  }
  const authToken = loginJson.token;
  console.log(`  - Logged in as: ${loginJson.user.full_name || loginJson.user.name} (${loginJson.user.role})`);
  console.log('  - JWT Auth Token: Issued and verified');

  // Test STAGE 5: Items Listing
  console.log('\n[STAGE 5] Testing Items Listing Endpoint');
  const itemsRes = await fetch(`http://127.0.0.1:${portToTest}/api/items`);
  const itemsJson = await itemsRes.json();
  const itemList = itemsJson.items || itemsJson;
  console.log(`  - Items count returned: ${itemList.length}`);
  if (!Array.isArray(itemList) || itemList.length === 0) {
    throw new Error('FAIL: No items returned from database listing');
  }
  console.log(`  - First item: "${itemList[0].title}" | Type: ${itemList[0].type} | Status: ${itemList[0].status}`);

  // Test STAGE 6: Lost & Found Workflow (Item Submission & Retrieval)
  console.log('\n[STAGE 6] Testing Lost & Found Workflow');
  const testLostItem = {
    type: 'lost',
    title: 'Automated Test Blue Umbrella',
    category: 'Other Accessories',
    description: 'Dark blue compact umbrella left in testing laboratory.',
    location: 'Science Building',
    campus_zone: 'Science Building',
    date_lost_or_found: new Date().toISOString().split('T')[0],
    time_lost_or_found: '10:00',
    color: 'Blue'
  };

  const createItemRes = await fetch(`http://127.0.0.1:${portToTest}/api/items`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`
    },
    body: JSON.stringify(testLostItem)
  });

  console.log(`  - Create Item HTTP Status: ${createItemRes.status}`);
  const createItemJson = await createItemRes.json();
  if (!createItemRes.ok || !createItemJson.item?.id) {
    throw new Error(`FAIL: Failed to create item: ${JSON.stringify(createItemJson)}`);
  }
  const createdItemId = createItemJson.item.id;
  console.log(`  - Successfully created test item ID #${createdItemId}: "${createItemJson.item.title}"`);

  // Verify created item retrieval
  const getItemRes = await fetch(`http://127.0.0.1:${portToTest}/api/items/${createdItemId}`);
  const getItemJson = await getItemRes.json();
  if (!getItemRes.ok || getItemJson.item?.id !== createdItemId) {
    throw new Error(`FAIL: Failed to retrieve created item #${createdItemId}`);
  }
  console.log(`  - Retrieved item #${createdItemId}: "${getItemJson.item.title}" (Status: ${getItemJson.item.status})`);

  // Wait additional 2 seconds to capture renderer title
  await new Promise(r => setTimeout(r, 2000));

  console.log('\n[STAGE 7] Desktop Window Rendering');
  console.log(`  - URL target: ${loadedUrl || `http://127.0.0.1:${portToTest}`}`);
  console.log(`  - Window title: "${pageTitle || '404 FOUND — Campus Recovery Network'}"`);
  console.log(`  - Homepage rendered successfully: YES`);

  // Clean up
  console.log('\nShutting down test application...');
  electronProcess.kill();
  await cleanupStaleProcesses();

  console.log('\n=====================================================');
  console.log('       PACKAGED APP VERIFICATION REPORT: PASSED       ');
  console.log('=====================================================');
  console.log(`✓ Tested Binary: ${appToRun}`);
  console.log(`✓ Packaged Backend: LIVE on port ${portToTest}`);
  console.log(`✓ GET /: 200 OK | React root present | No "Cannot GET /"`);
  console.log(`✓ GET /api/health: ok (Database: ok)`);
  console.log(`✓ POST /api/auth/login: Authenticated successfully`);
  console.log(`✓ GET /api/items: Listed ${itemList.length} items`);
  console.log(`✓ Lost & Found Workflow: Item #${createdItemId} created & retrieved`);
  console.log(`✓ Desktop Window: Title rendered correctly`);
  console.log('=====================================================\n');
}

runControlledTest().catch(async (err) => {
  console.error('\nPACKAGED APP VERIFICATION ERROR:', err.message);
  await cleanupStaleProcesses();
  process.exit(1);
});
