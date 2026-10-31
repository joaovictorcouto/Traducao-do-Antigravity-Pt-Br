/**
 * Antigravity Transparent Launcher (Node Runtime Fallback)
 * Checks patch integrity before launching the original Antigravity executable.
 */

const { spawn } = require('child_process');
const path = require('path');
const { findAntigravityPath, checkPatchState, applyPatch } = require('../core/patcher');

async function launch() {
  try {
    const installDir = findAntigravityPath();
    const asarPath = path.join(installDir, 'resources', 'app.asar');
    const exePath = path.join(installDir, 'Antigravity.exe');

    const state = checkPatchState(installDir);
    if (!state.already_patched) {
      await applyPatch({ customPath: installDir });
    }

    // Launch original application with forwarded arguments
    const args = process.argv.slice(2);
    const child = spawn(exePath, args, {
      detached: true,
      stdio: 'ignore'
    });

    child.unref();
    process.exit(0);
  } catch (err) {
    console.error('Falha ao iniciar Antigravity:', err);
    process.exit(1);
  }
}

if (require.main === module) {
  launch();
}

module.exports = { launch };
