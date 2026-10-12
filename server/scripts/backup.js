const fs = require('fs');
const path = require('path');
const config = require('../src/config');
const db = require('../src/db/database');

function backupDatabase() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(__dirname, '..', 'backups');

  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const backupFilePath = path.join(backupDir, `backup-${timestamp}.db`);
  console.log(`[Backup] Initiating SQLite online backup to: ${backupFilePath}`);

  try {
    // Checkpoint WAL first to flush committed transactions
    db.pragma('wal_checkpoint(TRUNCATE)');
    
    // Use better-sqlite3's native online backup API
    db.backup(backupFilePath)
      .then(() => {
        console.log(`[Backup] Online database backup completed successfully.`);
        console.log(`[Backup] File: ${backupFilePath} (${fs.statSync(backupFilePath).size} bytes)`);
      })
      .catch((err) => {
        console.error(`[Backup] Failed to create backup:`, err);
        process.exit(1);
      });
  } catch (err) {
    console.error(`[Backup] Error during backup preparation:`, err);
    process.exit(1);
  }
}

backupDatabase();
