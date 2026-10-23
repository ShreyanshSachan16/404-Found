const fs = require('fs');
const path = require('path');

const cacheRoot = path.join(process.env.LOCALAPPDATA, 'electron-builder', 'Cache');

const filesToCache = [
  {
    dir: '7zip@1.0.0',
    file: '7zip-win-x64.tar.gz',
    url: 'https://github.com/electron-userland/electron-builder-binaries/releases/download/7zip@1.0.0/7zip-win-x64.tar.gz'
  },
  {
    dir: 'nsis-resources-3.4.1',
    file: 'nsis-resources-3.4.1.7z',
    url: 'https://github.com/electron-userland/electron-builder-binaries/releases/download/nsis-resources-3.4.1/nsis-resources-3.4.1.7z'
  }
];

async function downloadFile(url, destPath) {
  if (fs.existsSync(destPath) && fs.statSync(destPath).size > 0) {
    console.log(`✓ Already cached: ${destPath}`);
    return;
  }
  console.log(`Downloading ${url}...`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  fs.mkdirSync(path.dirname(destPath), { recursive: true });
  fs.writeFileSync(destPath, buffer);
  console.log(`✓ Saved ${destPath} (${(buffer.length / 1024).toFixed(1)} KB)`);
}

async function main() {
  console.log(`Pre-caching electron-builder toolsets in ${cacheRoot}...`);
  for (const item of filesToCache) {
    const dest = path.join(cacheRoot, item.dir, item.file);
    await downloadFile(item.url, dest);
  }
  console.log('Pre-caching complete!');
}

main().catch(err => {
  console.error('Pre-cache error:', err);
  process.exit(1);
});
