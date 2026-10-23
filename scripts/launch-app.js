const path = require('path');
const fs = require('fs');
const net = require('net');
const { spawn, exec } = require('child_process');

const ROOT_DIR = path.resolve(__dirname, '..');
const SERVER_ENTRY = path.join(ROOT_DIR, 'server', 'src', 'index.js');
const CLIENT_DIST = path.join(ROOT_DIR, 'client', 'dist');
const LOG_FILE = path.join(ROOT_DIR, 'server', 'launch.log');
const LOCK_FILE = path.join(ROOT_DIR, 'server', '.launch.lock');

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  try {
    fs.appendFileSync(LOG_FILE, line);
  } catch (e) {
    // ignore
  }
}

function isPortAvailable(port) {
  return new Promise((resolve) => {
    const s = net.createServer();
    s.unref();
    s.on('error', () => resolve(false));
    s.listen({ host: '127.0.0.1', port, exclusive: true }, () => {
      s.close(() => resolve(true));
    });
  });
}

async function checkHealthUrl(url) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(1500) });
    if (res.ok) {
      const data = await res.json();
      return Boolean(data && (data.status === 'ok' || data.database === 'ok') && data.system?.includes('Lost & Found'));
    }
  } catch (err) {
    return false;
  }
  return false;
}

async function resolveServerPort(preferred = 5001) {
  // 1. Check if 404 FOUND is already running on the preferred port
  if (await checkHealthUrl(`http://127.0.0.1:${preferred}/api/health`)) {
    return { port: preferred, alreadyRunning: true };
  }

  // 2. Check if preferred port is free
  if (await isPortAvailable(preferred)) {
    return { port: preferred, alreadyRunning: false };
  }

  log(`Preferred port ${preferred} is in use by another service. Scanning for existing 404 FOUND instance...`);

  // 3. Scan 5002..5050 to see if 404 FOUND is running on another port
  for (let p = preferred + 1; p <= preferred + 50; p++) {
    if (await checkHealthUrl(`http://127.0.0.1:${p}/api/health`)) {
      log(`Found existing 404 FOUND instance running on port ${p}`);
      return { port: p, alreadyRunning: true };
    }
  }

  // 4. Find the first available free port
  for (let p = preferred + 1; p <= preferred + 50; p++) {
    if (await isPortAvailable(p)) {
      log(`Selected alternate free port: ${p}`);
      return { port: p, alreadyRunning: false };
    }
  }

  throw new Error(`No available ports found in range ${preferred}-${preferred + 50}`);
}

function openBrowser(port) {
  const targetUrl = `http://localhost:${port}`;
  log(`Opening default browser to ${targetUrl}`);
  // In Windows cmd, `start "" "url"` opens the default browser
  exec(`start "" "${targetUrl}"`, { windowsHide: true }, (err) => {
    if (err) {
      log(`Error opening browser: ${err.message}`);
    } else {
      log(`Browser opened successfully on port ${port}`);
    }
  });
}

function isPidRunning(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return false;
  }
}

function showErrorAlert(message) {
  log(`ALERT: ${message}`);
  const escaped = message.replace(/'/g, "''").replace(/\r?\n/g, ' ');
  const psCmd = `Add-Type -AssemblyName PresentationFramework; [System.Windows.MessageBox]::Show('${escaped}', '404 FOUND — Startup Error', [System.Windows.MessageBoxButton]::OK, [System.Windows.MessageBoxImage]::Error)`;
  exec(`powershell -NoProfile -Command "${psCmd}"`, { windowsHide: false }, () => {});
}

async function pollHealth(port, timeoutMs = 25000) {
  const startTime = Date.now();
  const healthUrl = `http://127.0.0.1:${port}/api/health`;
  while (Date.now() - startTime < timeoutMs) {
    await new Promise((r) => setTimeout(r, 350));
    if (await checkHealthUrl(healthUrl)) {
      log(`Health check on port ${port} succeeded after ${Date.now() - startTime}ms`);
      return true;
    }
  }
  return false;
}

async function main() {
  log('====================================');
  log('--- 404 FOUND Launch requested ---');

  // Verify production frontend build exists
  const clientIndex = path.join(CLIENT_DIST, 'index.html');
  if (!fs.existsSync(clientIndex)) {
    const msg = `Client build missing at ${clientIndex}. Please run build before launching.`;
    log(`ERROR: ${msg}`);
    showErrorAlert(msg);
    return;
  }

  const { port, alreadyRunning } = await resolveServerPort(5001);

  if (alreadyRunning) {
    log(`404 FOUND is already active on port ${port}. Opening browser directly.`);
    openBrowser(port);
    return;
  }

  // Prevent duplicate instances if user double-clicks shortcut rapidly
  if (fs.existsSync(LOCK_FILE)) {
    try {
      const lockData = JSON.parse(fs.readFileSync(LOCK_FILE, 'utf8'));
      const isAlive = lockData.pid && isPidRunning(lockData.pid);
      const isRecent = lockData.timestamp && (Date.now() - lockData.timestamp < 25000);

      if (isAlive && isRecent) {
        log(`Duplicate launch click detected. Existing backend instance PID ${lockData.pid} is starting up. Awaiting health check on port ${lockData.port || port}...`);
        const targetPort = lockData.port || port;
        const healthy = await pollHealth(targetPort, 20000);
        if (healthy) {
          openBrowser(targetPort);
        } else {
          showErrorAlert('Backend server startup timed out. Please check server/launch.log.');
        }
        return;
      }
    } catch (e) {
      // Stale or unparseable lock file, proceed
    }
  }

  log(`Server not running. Starting production server in background on port ${port}...`);

  // Use current process.execPath or bundled node
  let nodeExe = process.execPath;
  const bundledNode = path.join(ROOT_DIR, 'desktop-runtime', 'bin', 'node.exe');
  if (!nodeExe && fs.existsSync(bundledNode)) {
    nodeExe = bundledNode;
  }

  const serverProcess = spawn(nodeExe, [SERVER_ENTRY], {
    cwd: path.join(ROOT_DIR, 'server'),
    env: {
      ...process.env,
      NODE_ENV: 'production',
      PORT: port.toString(),
      CLIENT_DIST_PATH: CLIENT_DIST
    },
    detached: true,
    stdio: 'ignore',
    windowsHide: true
  });

  serverProcess.unref();
  log(`Spawned background server process with PID ${serverProcess.pid} on port ${port}`);

  // Write active process lock
  try {
    fs.writeFileSync(LOCK_FILE, JSON.stringify({ pid: serverProcess.pid, port, timestamp: Date.now() }));
  } catch (err) {
    log(`Failed to write lockfile: ${err.message}`);
  }

  // Poll health endpoint
  const healthy = await pollHealth(port, 25000);

  if (healthy) {
    openBrowser(port);
  } else {
    log(`Health check timed out after 25s on port ${port}. Server failed to become healthy.`);
    try {
      if (fs.existsSync(LOCK_FILE)) fs.unlinkSync(LOCK_FILE);
    } catch (e) {}
    showErrorAlert(`404 FOUND server failed to start within 25 seconds on port ${port}. Please review server/launch.log.`);
  }
}

main().catch((err) => {
  log(`Fatal error in launcher: ${err.stack || err.message}`);
  try {
    if (fs.existsSync(LOCK_FILE)) fs.unlinkSync(LOCK_FILE);
  } catch (e) {}
  showErrorAlert(`Fatal error in launcher: ${err.message}`);
});
