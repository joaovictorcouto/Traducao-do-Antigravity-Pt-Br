/**
 * Antigravity Shortcut Creator
 * Replaces or creates Desktop and Start Menu shortcuts pointing to Antigravity-Launcher.exe
 * with the official embedded Antigravity application icon and flushes Windows icon cache.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');
const { findAntigravityPath } = require('../core/patcher');

function createShortcuts() {
  const installDir = findAntigravityPath();
  const rootLauncher = path.resolve(__dirname, '..', 'Antigravity-ptbr.exe');
  const localLauncher = path.resolve(__dirname, 'Antigravity-ptbr.exe');

  const launcherExe = fs.existsSync(rootLauncher) ? rootLauncher : localLauncher;

  // Escape paths for PowerShell
  const escapedLauncher = launcherExe.replace(/'/g, "''");
  const escapedWorkingDir = installDir.replace(/'/g, "''");

  const psScript = `
$wsh = New-Object -ComObject WScript.Shell

$desktop = [System.Environment]::GetFolderPath([System.Environment+SpecialFolder]::Desktop)
$programsDir = [System.Environment]::GetFolderPath([System.Environment+SpecialFolder]::Programs)
$startMenu = Join-Path $programsDir 'Antigravity'

if (-not (Test-Path $startMenu)) {
  $startMenu = $programsDir
}

$desktopLnk = Join-Path $desktop 'Antigravity.lnk'
$startLnk = Join-Path $startMenu 'Antigravity.lnk'

# Desktop shortcut
$shortcut1 = $wsh.CreateShortcut($desktopLnk)
$shortcut1.TargetPath = '${escapedLauncher}'
$shortcut1.WorkingDirectory = '${escapedWorkingDir}'
$shortcut1.IconLocation = '${escapedLauncher},0'
$shortcut1.Description = 'Antigravity (Português do Brasil)'
$shortcut1.Save()

# Start Menu shortcut
$shortcut2 = $wsh.CreateShortcut($startLnk)
$shortcut2.TargetPath = '${escapedLauncher}'
$shortcut2.WorkingDirectory = '${escapedWorkingDir}'
$shortcut2.IconLocation = '${escapedLauncher},0'
$shortcut2.Description = 'Antigravity (Português do Brasil)'
$shortcut2.Save()

# Flush Windows icon cache and notify shell
try {
  & ie4uinit.exe -show
} catch {}

try {
  Add-Type -TypeDefinition @"
    using System;
    using System.Runtime.InteropServices;
    public class ShellNotifier {
        [DllImport("shell32.dll")]
        public static extern void SHChangeNotify(int wEventId, int uFlags, IntPtr dwItem1, IntPtr dwItem2);
    }
"@
  [ShellNotifier]::SHChangeNotify(0x08000000, 0, [IntPtr]::Zero, [IntPtr]::Zero)
} catch {}

Write-Output "Atalhos atualizados com sucesso: $desktopLnk e $startLnk"
`;

  const tempPsFile = path.join(os.tmpdir(), `create-shortcuts-${Date.now()}.ps1`);
  fs.writeFileSync(tempPsFile, psScript, 'utf8');

  try {
    const output = execSync(`powershell -NoProfile -ExecutionPolicy Bypass -File "${tempPsFile}"`, {
      encoding: 'utf8'
    });
    console.log(output.trim());
    return { success: true, launcher: launcherExe };
  } catch (err) {
    console.error('Erro ao criar atalhos:', err.message);
    return { success: false, error: err.message };
  } finally {
    try {
      fs.unlinkSync(tempPsFile);
    } catch (_) {}
  }
}

if (require.main === module) {
  createShortcuts();
}

module.exports = { createShortcuts };
