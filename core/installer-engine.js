/**
 * Antigravity Standalone Installer Engine
 * Bundled with asar and embedded assets to run independently without node_modules.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');
const asar = require('@electron/asar');
const { patchSourceFiles, PATCH_SIGNATURE } = require('./source-patcher');
const { DICTIONARY, RUNTIME_SCRIPT } = require('./embedded-assets');

function resolveInstallDir(explicitPath) {
  const candidates = [
    explicitPath,
    process.env.ANTIGRAVITY_PATH,
    path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Antigravity'),
    path.join(process.env.PROGRAMFILES || '', 'Antigravity'),
    path.join(process.env['PROGRAMFILES(X86)'] || '', 'Antigravity')
  ].filter(Boolean);

  for (const cand of candidates) {
    if (fs.existsSync(path.join(cand, 'resources', 'app.asar'))) {
      return path.resolve(cand);
    }
  }

  throw new Error('Instalação do Google Antigravity não encontrada.');
}

function findHtmlFiles(dir, list = []) {
  const entries = fs.readdirSync(dir);
  for (const entry of entries) {
    const full = path.join(dir, entry);
    if (fs.statSync(full).isDirectory()) {
      findHtmlFiles(full, list);
    } else if (entry.toLowerCase().endsWith('.html')) {
      list.push(full);
    }
  }
  return list;
}

function createDesktopShortcuts(installDir, launcherExePath) {
  const targetExe = launcherExePath && fs.existsSync(launcherExePath)
    ? launcherExePath
    : path.join(installDir, 'Antigravity-ptbr.exe');

  const finalTarget = fs.existsSync(targetExe) ? targetExe : path.join(installDir, 'Antigravity.exe');
  const escapedTarget = finalTarget.replace(/'/g, "''");
  const escapedWorkingDir = installDir.replace(/'/g, "''");

  const psScript = `
$wsh = New-Object -ComObject WScript.Shell
$desktop = [System.Environment]::GetFolderPath([System.Environment+SpecialFolder]::Desktop)
$programsDir = [System.Environment]::GetFolderPath([System.Environment+SpecialFolder]::Programs)
$startMenu = Join-Path $programsDir 'Antigravity'
if (-not (Test-Path $startMenu)) { $startMenu = $programsDir }

$desktopLnk = Join-Path $desktop 'Antigravity (Português).lnk'
$startLnk = Join-Path $startMenu 'Antigravity (Português).lnk'

$s1 = $wsh.CreateShortcut($desktopLnk)
$s1.TargetPath = '${escapedTarget}'
$s1.WorkingDirectory = '${escapedWorkingDir}'
$s1.IconLocation = '${escapedTarget},0'
$s1.Description = 'Antigravity em Português do Brasil'
$s1.Save()

$s2 = $wsh.CreateShortcut($startLnk)
$s2.TargetPath = '${escapedTarget}'
$s2.WorkingDirectory = '${escapedWorkingDir}'
$s2.IconLocation = '${escapedTarget},0'
$s2.Description = 'Antigravity em Português do Brasil'
$s2.Save()

try { & ie4uinit.exe -show } catch {}
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
`;

  const tempPs = path.join(os.tmpdir(), `install-shortcuts-${Date.now()}.ps1`);
  fs.writeFileSync(tempPs, psScript, 'utf8');
  try {
    execSync(`powershell -NoProfile -ExecutionPolicy Bypass -File "${tempPs}"`, { stdio: 'ignore' });
  } catch (_) {}
  try { fs.unlinkSync(tempPs); } catch (_) {}
}

async function runInstallation(options = {}) {
  const installDir = resolveInstallDir(options.installPath);
  const resourcesDir = path.join(installDir, 'resources');
  const asarPath = path.join(resourcesDir, 'app.asar');
  const bakPath = path.join(resourcesDir, 'app.asar.bak');

  // 1. Pristine backup
  if (!fs.existsSync(bakPath)) {
    fs.copyFileSync(asarPath, bakPath);
  }

  // 2. Temp extraction directory
  const tempExtract = path.join(os.tmpdir(), `antigravity-inst-${Date.now()}`);
  fs.mkdirSync(tempExtract, { recursive: true });

  try {
    // 3. Extract asar
    asar.extractAll(asarPath, tempExtract);

    // 4. Source code static patching
    patchSourceFiles(tempExtract);

    // 5. Build injection bundle
    const bundleCode = `
/* ${PATCH_SIGNATURE} */
(function() {
  try {
    window.__ANTIGRAVITY_LOCALE_DICT__ = ${JSON.stringify(DICTIONARY)};
    ${RUNTIME_SCRIPT}
  } catch (err) {
    console.error('[Antigravity-ptBR] Erro ao inicializar runtime de tradução:', err);
  }
})();
`;

    // 6. Inject into dist/preload.js
    const preloadPath = path.join(tempExtract, 'dist', 'preload.js');
    if (fs.existsSync(preloadPath)) {
      let content = fs.readFileSync(preloadPath, 'utf8');
      const sigIdx = content.indexOf(`/* ${PATCH_SIGNATURE} */`);
      if (sigIdx !== -1) {
        content = content.substring(0, sigIdx).trimEnd();
      }
      content = `${content}\n\n${bundleCode}`;
      fs.writeFileSync(preloadPath, content, 'utf8');
    }

    // 7. Inject into HTML files
    const htmls = findHtmlFiles(tempExtract);
    for (const html of htmls) {
      let htmlContent = fs.readFileSync(html, 'utf8');
      if (!htmlContent.includes(PATCH_SIGNATURE)) {
        const scriptTag = `<script>\n${bundleCode}\n</script>`;
        if (htmlContent.includes('</head>')) {
          htmlContent = htmlContent.replace('</head>', `${scriptTag}\n</head>`);
        } else {
          htmlContent = `${scriptTag}\n${htmlContent}`;
        }
        fs.writeFileSync(html, htmlContent, 'utf8');
      }
    }

    // 8. Atomic repack
    const tempAsar = path.join(resourcesDir, `app.asar.tmp-${Date.now()}`);
    await asar.createPackage(tempExtract, tempAsar);

    const oldAsar = path.join(resourcesDir, `app.asar.old-${Date.now()}`);
    fs.renameSync(asarPath, oldAsar);
    fs.renameSync(tempAsar, asarPath);
    try { fs.unlinkSync(oldAsar); } catch (_) {}

    // 9. Install Launcher executable if provided
    let installedLauncher = path.join(installDir, 'Antigravity-ptbr.exe');
    if (options.launcherPayload && fs.existsSync(options.launcherPayload)) {
      try {
        fs.copyFileSync(options.launcherPayload, installedLauncher);
      } catch (_) {}
    }

    // 10. Create Desktop and Start Menu shortcuts
    createDesktopShortcuts(installDir, installedLauncher);

    return {
      success: true,
      installDir,
      launcherInstalled: fs.existsSync(installedLauncher)
    };
  } finally {
    try {
      fs.rmSync(tempExtract, { recursive: true, force: true });
    } catch (_) {}
  }
}

// CLI execution handler
if (require.main === module) {
  const args = process.argv.slice(2);
  let explicitPath = null;
  let launcherPayload = null;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--path' && args[i + 1]) {
      explicitPath = args[++i];
    } else if (args[i] === '--launcher' && args[i + 1]) {
      launcherPayload = args[++i];
    }
  }

  runInstallation({ installPath: explicitPath, launcherPayload })
    .then(res => {
      console.log(JSON.stringify(res));
      process.exit(0);
    })
    .catch(err => {
      console.error(JSON.stringify({ success: false, error: err.message }));
      process.exit(1);
    });
}

module.exports = { runInstallation };
