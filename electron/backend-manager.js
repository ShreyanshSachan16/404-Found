const { app } = require('electron');
const path = require('path');
const fs = require('fs');
const net = require('net');
const crypto = require('crypto');
const { spawn, execSync } = require('child_process');

class BackendManager {
  constructor() {
    this.process = null;
    this.port = null;
    this.serverUrl = null;
    this.isShuttingDown = false;
    this.restartAttempts = 0;
    this.maxRestartAttempts = 3;
    this.logStream = null;

    // Resolve user data storage directories (Per-user AppData on Windows)
    this.userDataDir = app.getPath('userData');
    this.dataDir = path.join(this.userDataDir, 'data');
    this.uploadsDir = path.join(this.userDataDir, 'uploads');
    this.receiptsDir = path.join(this.uploadsDir, 'receipts');
    this.logsDir = path.join(this.userDataDir, 'logs');
    this.dbPath = path.join(this.dataDir, 'lost_and_found.db');
    this.secretKeyPath = path.join(this.userDataDir, 'auth_secret.key');

    this._ensureDirectories();
    this.jwtSecret = this._getOrCreateJwtSecret();
  }

  _ensureDirectories() {
    const dirs = [this.userDataDir, this.dataDir, this.uploadsDir, this.receiptsDir, this.logsDir];
    for (const dir of dirs) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }
  }

  _getOrCreateJwtSecret() {
    try {
      if (fs.existsSync(this.secretKeyPath)) {
        const existing = fs.readFileSync(this.secretKeyPath, 'utf8').trim();
        if (existing.length >= 32) return existing;
      }
      const newSecret = crypto.randomBytes(32).toString('hex');
      fs.writeFileSync(this.secretKeyPath, newSecret, { mode: 0o600 });
      return newSecret;
    } catch (e) {
      console.warn('Could not read/write persistent JWT secret, falling back to random secret:', e);
      return crypto.randomBytes(32).toString('hex');
    }
  }

  async findAvailablePort(preferred = 5001) {
    const checkPort = (port) => {
      return new Promise((resolve) => {
        const server = net.createServer();
        server.unref();
        server.on('error', () => resolve(false));
        server.listen({ host: '127.0.0.1', port, exclusive: true }, () => {
          server.close(() => resolve(true));
        });
      });
    };

    if (await checkPort(preferred)) {
      return preferred;
    }

    // Port fallback range 5002 - 5050
    for (let p = preferred + 1; p <= preferred + 50; p++) {
      if (await checkPort(p)) {
        console.log(`Port ${preferred} in use. Selected alternate free port: ${p}`);
        return p;
      }
    }

    // Dynamic OS-assigned ephemeral port fallback
    return new Promise((resolve, reject) => {
      const server = net.createServer();
      server.listen(0, '127.0.0.1', () => {
        const dynamicPort = server.address().port;
        server.close(() => resolve(dynamicPort));
      });
      server.on('error', reject);
    });
  }

  resolveNodeExecutable() {
    if (app.isPackaged) {
      // Look for packaged node runtime in resources/runtime/node.exe
      const packagedNode = path.join(process.resourcesPath, 'runtime', 'node.exe');
      if (fs.existsSync(packagedNode)) {
        return packagedNode;
      }
      // Fallback if unpack directory differs
      const altNode = path.join(process.resourcesPath, 'app.asar.unpacked', 'desktop-runtime', 'bin', 'node.exe');
      if (fs.existsSync(altNode)) {
        return altNode;
      }
    } else {
      // In development, prefer local desktop-runtime/bin/node.exe if present, else process.execPath
      const localRuntime = path.resolve(__dirname, '..', 'desktop-runtime', 'bin', 'node.exe');
      if (fs.existsSync(localRuntime)) {
        return localRuntime;
      }
    }
    return process.execPath;
  }

  resolveServerEntry() {
    if (app.isPackaged) {
      // Packaged location in resources/server/src/index.js
      const candidatePaths = [
        path.join(process.resourcesPath, 'server', 'src', 'index.js'),
        path.join(process.resourcesPath, 'app.asar.unpacked', 'server', 'src', 'index.js'),
        path.join(app.getAppPath(), 'server', 'src', 'index.js')
      ];
      for (const p of candidatePaths) {
        if (fs.existsSync(p)) return p;
      }
    }
    return path.resolve(__dirname, '..', 'server', 'src', 'index.js');
  }

  resolveClientDist() {
    if (app.isPackaged) {
      const candidatePaths = [
        path.join(app.getAppPath(), 'client', 'dist'),
        path.join(process.resourcesPath, 'client', 'dist'),
        path.join(process.resourcesPath, 'app.asar.unpacked', 'client', 'dist'),
        path.join(__dirname, '..', 'client', 'dist')
      ];
      for (const p of candidatePaths) {
        if (fs.existsSync(p)) return p;
      }
    }
    return path.resolve(__dirname, '..', 'client', 'dist');
  }

  async start() {
    if (this.process) {
      return { port: this.port, serverUrl: this.serverUrl };
    }

    this.port = await this.findAvailablePort(5001);
    this.serverUrl = `http://127.0.0.1:${this.port}`;

    const nodeExecutable = this.resolveNodeExecutable();
    const serverEntry = this.resolveServerEntry();
    const clientDist = this.resolveClientDist();

    const logFile = path.join(this.logsDir, 'server.log');
    this.logStream = fs.createWriteStream(logFile, { flags: 'a' });
    this.logStream.write(`\n--- Server Start: ${new Date().toISOString()} ---\n`);
    this.logStream.write(`Node Executable: ${nodeExecutable}\n`);
    this.logStream.write(`Server Entry: ${serverEntry}\n`);
    this.logStream.write(`Port: ${this.port}\n`);
    this.logStream.write(`Database: ${this.dbPath}\n`);
    this.logStream.write(`Client Dist: ${clientDist}\n\n`);

    const serverCwd = path.dirname(path.dirname(serverEntry));

    const env = {
      ...process.env,
      NODE_ENV: 'production',
      PORT: this.port.toString(),
      HOST: '127.0.0.1',
      DB_PATH: this.dbPath,
      UPLOAD_DIR: this.uploadsDir,
      RECEIPTS_DIR: this.receiptsDir,
      CLIENT_DIST_PATH: clientDist,
      JWT_SECRET: this.jwtSecret,
      ELECTRON_RUN_AS_NODE: undefined
    };

    console.log(`[BackendManager] Spawning Express server on 127.0.0.1:${this.port}...`);
    this.process = spawn(nodeExecutable, [serverEntry], {
      cwd: serverCwd,
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true // Suppress console/terminal window on Windows
    });

    this.process.stdout.on('data', (data) => {
      if (this.logStream) this.logStream.write(data);
    });

    this.process.stderr.on('data', (data) => {
      if (this.logStream) this.logStream.write(data);
    });

    this.process.on('error', (err) => {
      console.error('[BackendManager] Process spawn error:', err);
      if (this.logStream) this.logStream.write(`Process spawn error: ${err.message}\n`);
    });

    this.process.on('exit', (code, signal) => {
      console.log(`[BackendManager] Server exited with code: ${code}, signal: ${signal}`);
      if (this.logStream) this.logStream.write(`Server exited with code: ${code}, signal: ${signal}\n`);
      this.process = null;

      if (!this.isShuttingDown && this.restartAttempts < this.maxRestartAttempts) {
        this.restartAttempts++;
        console.warn(`[BackendManager] Unexpected crash, restarting (attempt ${this.restartAttempts})...`);
        setTimeout(() => this.start(), 1500);
      }
    });

    // Wait for /api/health to confirm backend is ready
    const isReady = await this._waitForHealth(25000);
    if (!isReady) {
      throw new Error(`Express backend failed to respond on http://127.0.0.1:${this.port}/api/health within 25 seconds. Check logs at: ${logFile}`);
    }

    console.log(`[BackendManager] Express backend is operational at ${this.serverUrl}`);
    this.restartAttempts = 0;
    return { port: this.port, serverUrl: this.serverUrl };
  }

  async _waitForHealth(timeoutMs = 25000) {
    const start = Date.now();
    const healthUrl = `${this.serverUrl}/api/health`;

    while (Date.now() - start < timeoutMs) {
      if (this.isShuttingDown || !this.process) return false;
      try {
        const res = await fetch(healthUrl, { method: 'GET' });
        if (res.ok) {
          const json = await res.json();
          if (json.status === 'ok') {
            return true;
          }
        }
      } catch (err) {
        // Connection not ready yet, continue polling
      }
      await new Promise((r) => setTimeout(r, 200));
    }
    return false;
  }

  async stop() {
    this.isShuttingDown = true;
    if (!this.process) return;

    console.log('[BackendManager] Stopping Express backend gracefully...');
    const pid = this.process.pid;

    try {
      this.process.kill('SIGTERM');
    } catch (e) {
      // Ignore
    }

    // Give process 3 seconds to checkpoint WAL and exit cleanly
    const exited = await new Promise((resolve) => {
      let resolved = false;
      const timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          resolve(false);
        }
      }, 3000);

      if (!this.process) {
        clearTimeout(timeout);
        return resolve(true);
      }

      this.process.once('exit', () => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          resolve(true);
        }
      });
    });

    if (!exited && pid) {
      console.warn('[BackendManager] Force terminating lingering backend process tree...');
      try {
        if (process.platform === 'win32') {
          execSync(`taskkill /F /T /PID ${pid}`, { stdio: 'ignore' });
        } else {
          process.kill(pid, 'SIGKILL');
        }
      } catch (e) {
        // Process might already be dead
      }
    }

    this.process = null;
    if (this.logStream) {
      this.logStream.end();
      this.logStream = null;
    }
    console.log('[BackendManager] Express backend stopped.');
  }
}

module.exports = BackendManager;
