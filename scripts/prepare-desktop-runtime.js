const fs = require('fs');
const path = require('path');

function prepareRuntime() {
  const destDir = path.resolve(__dirname, '..', 'desktop-runtime', 'bin');
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }

  const destNode = path.join(destDir, 'node.exe');
  const sourceNode = process.execPath;

  console.log(`[prepare-desktop-runtime] Checking packaged Node runtime...`);
  if (!fs.existsSync(destNode) || fs.statSync(destNode).size === 0) {
    console.log(`[prepare-desktop-runtime] Copying host runtime (${sourceNode}) to ${destNode}...`);
    fs.copyFileSync(sourceNode, destNode);
  }

  const stat = fs.statSync(destNode);
  console.log(`[prepare-desktop-runtime] Node runtime confirmed: ${(stat.size / 1024 / 1024).toFixed(1)} MB at ${destNode}`);
}

prepareRuntime();
