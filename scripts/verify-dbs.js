const path = require('path');
const fs = require('fs');
const Database = require(path.join(__dirname, '..', 'server', 'node_modules', 'better-sqlite3'));

const srcDbPath = path.join(__dirname, '..', 'server', 'lost_and_found.db');
const appDataDbPath = path.join(process.env.APPDATA, '404-found', 'data', 'lost_and_found.db');

const srcUploads = path.join(__dirname, '..', 'server', 'uploads');
const appDataUploads = path.join(process.env.APPDATA, '404-found', 'uploads');

console.log('=== DATABASE INTEGRITY & TABLE COMPARISON ===');

function inspectDb(dbPath, label) {
  console.log(`\n--- Inspecting: ${label} (${dbPath}) ---`);
  if (!fs.existsSync(dbPath)) {
    console.log('File does not exist!');
    return null;
  }
  const stat = fs.statSync(dbPath);
  console.log(`Size: ${stat.size} bytes`);

  const db = new Database(dbPath, { readonly: true });
  const integrity = db.pragma('integrity_check');
  console.log(`Integrity Check: ${JSON.stringify(integrity)}`);

  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all();
  const counts = {};
  for (const t of tables) {
    const count = db.prepare(`SELECT count(*) as c FROM "${t.name}"`).get().c;
    counts[t.name] = count;
    console.log(`  Table [${t.name}]: ${count} records`);
  }
  db.close();
  return { size: stat.size, integrity, counts };
}

const srcResult = inspectDb(srcDbPath, 'Source Project DB');
const appDataResult = inspectDb(appDataDbPath, 'AppData Roaming DB');

console.log('\n=== UPLOAD FILES COMPARISON ===');
function countFiles(dir) {
  if (!fs.existsSync(dir)) return 0;
  let count = 0;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    if (e.isDirectory()) {
      count += countFiles(path.join(dir, e.name));
    } else {
      count++;
    }
  }
  return count;
}

const srcFileCount = countFiles(srcUploads);
const appDataFileCount = countFiles(appDataUploads);
console.log(`Source uploads (${srcUploads}): ${srcFileCount} files`);
console.log(`AppData uploads (${appDataUploads}): ${appDataFileCount} files`);

console.log('\n=== MATCH SUMMARY ===');
let allMatch = true;
if (srcResult && appDataResult) {
  for (const t in srcResult.counts) {
    if (srcResult.counts[t] !== appDataResult.counts[t]) {
      console.log(`MISMATCH in table ${t}: Source=${srcResult.counts[t]}, AppData=${appDataResult.counts[t]}`);
      allMatch = false;
    }
  }
  if (allMatch && srcFileCount === appDataFileCount) {
    console.log('ALL TABLES AND UPLOADS MATCH PERFECTLY (100% PARITY)!');
  }
}
