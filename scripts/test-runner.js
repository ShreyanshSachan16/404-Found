const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

const targetTest = process.argv[2] || 'all';
const serverDir = path.join(__dirname, '..', 'server');
const TEST_PORT = 5095;

async function isServerRunning(port) {
  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/health`);
    return res.ok;
  } catch {
    try {
      const res = await fetch(`http://localhost:${port}/api/health`);
      return res.ok;
    } catch {
      return false;
    }
  }
}

async function runChildNode(args, env) {
  return new Promise((resolve) => {
    const proc = spawn(process.execPath, args, {
      cwd: serverDir,
      stdio: 'inherit',
      env
    });
    proc.on('exit', (code) => resolve(code || 0));
  });
}

async function main() {
  console.log('================================================================');
  console.log('  404 FOUND — ISOLATED TEST HARNESS & REGRESSION RUNNER  ');
  console.log('================================================================');

  // 1. Create fully isolated sandbox directory in os.tmpdir()
  const sandboxDir = path.join(os.tmpdir(), `404found_test_${Date.now()}_${process.pid}`);
  const testDbPath = path.join(sandboxDir, 'test_lost_and_found.db');
  const testUploadDir = path.join(sandboxDir, 'uploads');
  const testReceiptsDir = path.join(testUploadDir, 'receipts');

  fs.mkdirSync(sandboxDir, { recursive: true });
  fs.mkdirSync(testUploadDir, { recursive: true });
  fs.mkdirSync(testReceiptsDir, { recursive: true });

  const testEnv = {
    ...process.env,
    NODE_ENV: 'test',
    PORT: String(TEST_PORT),
    TEST_PORT: String(TEST_PORT),
    DB_PATH: testDbPath,
    UPLOAD_DIR: testUploadDir,
    RECEIPTS_DIR: testReceiptsDir,
    DISABLE_RATE_LIMIT: 'true'
  };

  console.log(`📁 Test Sandbox: ${sandboxDir}`);
  console.log(`🗄️ Isolated DB:  ${testDbPath}`);
  console.log(`🔌 Test Port:    ${TEST_PORT} (never collides with workspace port 5001)`);

  // 2. Pre-seed isolated test database
  console.log('\n🌱 Pre-seeding clean isolated test database...');
  const seedCode = await runChildNode(['src/db/seed.js'], testEnv);
  if (seedCode !== 0) {
    console.error('❌ Failed to seed isolated test database.');
    fs.rmSync(sandboxDir, { recursive: true, force: true });
    process.exit(1);
  }

  // 3. Spawn dedicated isolated test server
  console.log(`\n⚡ Starting isolated test server on http://localhost:${TEST_PORT}...`);
  const serverProcess = spawn(process.execPath, ['src/index.js'], {
    cwd: serverDir,
    stdio: 'ignore',
    env: testEnv
  });

  let ready = false;
  for (let i = 0; i < 40; i++) {
    await new Promise((r) => setTimeout(r, 250));
    if (await isServerRunning(TEST_PORT)) {
      ready = true;
      break;
    }
  }

  if (!ready) {
    console.error('❌ Failed to connect to isolated test server within 10 seconds.');
    if (serverProcess) serverProcess.kill();
    fs.rmSync(sandboxDir, { recursive: true, force: true });
    process.exit(1);
  }
  console.log('✓ Isolated test server verified and healthy.\n');

  let exitCode = 0;
  try {
    if (targetTest === 'security') {
      exitCode = await runChildNode(['test-security-hardening.js'], testEnv);
    } else if (targetTest === 'audit') {
      exitCode = await runChildNode(['test-production-audit.js'], testEnv);
    } else if (targetTest === 'flow') {
      exitCode = await runChildNode(['test-flow.js'], testEnv);
    } else {
      console.log('▶ [1/3] Running Core Lifecycle & Matching Test Suite...');
      exitCode = await runChildNode(['test-flow.js'], testEnv);
      if (exitCode === 0) {
        console.log('\n▶ [2/3] Running Production Audit & Security Suite...');
        exitCode = await runChildNode(['test-production-audit.js'], testEnv);
      }
      if (exitCode === 0) {
        console.log('\n▶ [3/3] Running Security Hardening & Regression Suite...');
        exitCode = await runChildNode(['test-security-hardening.js'], testEnv);
      }
    }
  } finally {
    console.log('\n🛑 Shutting down isolated test server...');
    if (serverProcess) {
      serverProcess.kill();
    }
    await new Promise((r) => setTimeout(r, 500));
    try {
      fs.rmSync(sandboxDir, { recursive: true, force: true });
      console.log('🧹 Isolated test sandbox cleaned up successfully.');
    } catch (e) {
      // Ignored if file handle closing takes a moment
    }
  }

  process.exit(exitCode);
}

main().catch((err) => {
  console.error('Test runner failure:', err);
  process.exit(1);
});
