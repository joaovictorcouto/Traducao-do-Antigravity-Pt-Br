/**
 * Antigravity pt-BR Rollback Utility
 * Restores original resources/app.asar from backup file app.asar.bak.
 */

const fs = require('fs');
const path = require('path');
const { findAntigravityPath } = require('./patcher');

/**
 * Restores original app.asar from app.asar.bak.
 */
function restoreBackup(options = {}) {
  const { customPath, deleteBak = false } = options;
  const installPath = findAntigravityPath(customPath);
  const asarPath = path.join(installPath, 'resources', 'app.asar');
  const bakPath = path.join(installPath, 'resources', 'app.asar.bak');

  if (!fs.existsSync(bakPath)) {
    return {
      restored: false,
      message: 'Nenhum backup encontrado (app.asar.bak não existe). O aplicativo já pode estar no estado original.',
      asarPath
    };
  }

  // Restore backup
  fs.copyFileSync(bakPath, asarPath);

  try {
    const asar = require('@electron/asar');
    if (typeof asar.uncacheAll === 'function') {
      asar.uncacheAll();
    }
  } catch (_) {}

  if (deleteBak) {
    fs.unlinkSync(bakPath);
  }

  return {
    restored: true,
    message: 'Aplicativo original restaurado com sucesso.',
    asarPath,
    bakPath
  };
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const deleteBak = args.includes('--delete-bak');
  const pathArgIdx = args.indexOf('--path');
  const customPath = pathArgIdx !== -1 ? args[pathArgIdx + 1] : undefined;

  try {
    const result = restoreBackup({ customPath, deleteBak });
    process.stdout.write(JSON.stringify(result));
    process.exit(result.restored ? 0 : 1);
  } catch (err) {
    console.error(JSON.stringify({ error: err.message }));
    process.exit(2);
  }
}

module.exports = {
  restoreBackup
};
