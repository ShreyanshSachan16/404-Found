const { spawn } = require('child_process');
const path = require('path');

const targetTest = process.argv[2] || 'all';
const serverDir = path.join(__dirname, '..', 'server');

async function isServerRunning() {
  try {
    const res = await fetch('http://localhost:5001/api/health');
    return res.ok;
  } catch {
    return false;
  }
}

async function runTestFile(file) {
  return new Promise((resolve) => {
    const testProc = spawn(process.execPath, [path.join(serverDir, file)], {
      cwd: serverDir,
      stdio: 'inherit'
    });
    testProc.on('exit', (code) => resolve(code || 0));
  });
}

async function main() {
  let serverProcess = null;
  const alreadyRunning = await isServerRunning();

  if (!alreadyRunning) {
    console.log('⚡ Starting local test server on http://localhost:5001...');
    serverProcess = spawn(process.execPath, ['src/index.js'], {
      cwd: serverDir,
      stdio: 'inherit'
    });

    let ready = false;
    for (let i = 0; i < 40; i++) {
      await new Promise((r) => setTimeout(r, 250));
      if (await isServerRunning()) {
        ready = true;
        break;
      }
    }

    if (!ready) {
      console.error('❌ Failed to connect to test server within 10 seconds.');
      if (serverProcess) serverProcess.kill();
      process.exit(1);
    }
  }

  let exitCode = 0;
  try {
    if (targetTest === 'audit') {
      exitCode = await runTestFile('test-production-audit.js');
    } else if (targetTest === 'flow') {
      exitCode = await runTestFile('test-flow.js');
    } else {
      console.log('▶ [1/2] Running Core AI & Lifecycle Test Suite...');
      exitCode = await runTestFile('test-flow.js');
      if (exitCode === 0) {
        console.log('\n▶ [2/2] Running Production Security & Audit Test Suite...');
        exitCode = await runTestFile('test-production-audit.js');
      }
    }
  } finally {
    if (serverProcess) {
      console.log('🛑 Shutting down local test server...');
      serverProcess.kill();
    }
  }

  process.exit(exitCode);
}

main().catch((err) => {
  console.error('Test runner failure:', err);
  process.exit(1);
});
