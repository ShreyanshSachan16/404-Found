const fs = require('fs');
const path = require('path');
const config = require('../src/config');

function restoreDatabase() {
  const backupFile = process.argv[2];
  const backupDir = path.join(__dirname, '..', 'backups');

  let targetBackupPath = null;
  if (backupFile) {
    targetBackupPath = path.isAbsolute(backupFile) ? backupFile : path.join(process.cwd(), backupFile);
  } else {
    // Find latest backup in backups folder
    if (!fs.existsSync(backupDir)) {
      console.error('[Restore] No backups directory found at:', backupDir);
      process.exit(1);
    }
    const files = fs.readdirSync(backupDir)
      .filter(f => f.endsWith('.db'))
      .map(f => ({ name: f, time: fs.statSync(path.join(backupDir, f)).mtimeMs }))
      .sort((a, b) => b.time - a.time);

    if (files.length === 0) {
      console.error('[Restore] No backup .db files found in:', backupDir);
      process.exit(1);
    }
    targetBackupPath = path.join(backupDir, files[0].name);
  }

  if (!fs.existsSync(targetBackupPath)) {
    console.error('[Restore] Backup file does not exist:', targetBackupPath);
    process.exit(1);
  }

  console.log(`[Restore] Restoring database from: ${targetBackupPath}`);
  console.log(`[Restore] Destination DB: ${config.DB_PATH}`);

  // Safety pre-restore snapshot of current db if it exists
  if (fs.existsSync(config.DB_PATH)) {
    const preRestoreBackup = `${config.DB_PATH}.pre-restore-${Date.now()}`;
    fs.copyFileSync(config.DB_PATH, preRestoreBackup);
    console.log(`[Restore] Created safety copy of active DB at: ${preRestoreBackup}`);
  }

  // Remove existing WAL and SHM files to avoid stale lock mismatches
  const walPath = `${config.DB_PATH}-wal`;
  const shmPath = `${config.DB_PATH}-shm`;
  if (fs.existsSync(walPath)) fs.unlinkSync(walPath);
  if (fs.existsSync(shmPath)) fs.unlinkSync(shmPath);

  // Copy backup to active DB path
  fs.copyFileSync(targetBackupPath, config.DB_PATH);
  console.log('[Restore] Database restored successfully!');
}

restoreDatabase();
