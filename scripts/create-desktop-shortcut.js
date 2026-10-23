const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

function createShortcut() {
  const rootDir = path.resolve(__dirname, '..');
  const vbsPath = path.join(rootDir, 'scripts', 'launch-production.vbs');
  const iconPath = path.join(rootDir, 'electron', 'assets', 'icon.ico');
  const shortcutName = '404 FOUND.lnk';

  // Use a temporary ps1 script file to avoid shell string escaping bugs
  const tempPs1 = path.join(rootDir, 'scripts', '_temp_create_shortcut.ps1');
  const psContent = [
    '$wsh = New-Object -ComObject WScript.Shell',
    '$desktop = $wsh.SpecialFolders("Desktop")',
    `$shortcutPath = Join-Path $desktop "${shortcutName}"`,
    '$shortcut = $wsh.CreateShortcut($shortcutPath)',
    '$shortcut.TargetPath = "wscript.exe"',
    `$shortcut.Arguments = "\`"${vbsPath}\`""`,
    `$shortcut.WorkingDirectory = "${rootDir}"`,
    `$shortcut.IconLocation = "${iconPath},0"`,
    '$shortcut.Description = "404 FOUND - Campus Recovery Network"',
    '$shortcut.Save()',
    'Write-Output $shortcutPath'
  ].join('\r\n');

  fs.writeFileSync(tempPs1, psContent, 'utf8');

  try {
    const output = execSync(`powershell -NoProfile -ExecutionPolicy Bypass -File "${tempPs1}"`, {
      encoding: 'utf8'
    }).trim();

    console.log('Shortcut created at:', output);
    if (fs.existsSync(output)) {
      console.log('Verification: Shortcut file exists on disk!');
      return output;
    } else {
      throw new Error('Shortcut file was not found after creation.');
    }
  } finally {
    if (fs.existsSync(tempPs1)) {
      try {
        fs.unlinkSync(tempPs1);
      } catch (e) {}
    }
  }
}

try {
  const createdPath = createShortcut();
  console.log('SUCCESS: Shortcut created at', createdPath);
} catch (err) {
  console.error('Failed to create shortcut:', err);
  process.exitCode = 1;
}
