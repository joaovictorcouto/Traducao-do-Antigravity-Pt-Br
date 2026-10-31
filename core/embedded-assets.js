/**
 * Auto-generated embedded assets for standalone installer.
 */
const fs = require('fs');
const path = require('path');

const localePath = path.resolve(__dirname, '..', 'injector', 'locales', 'pt-br.json');
const runtimePath = path.resolve(__dirname, '..', 'injector', 'runtime.js');

const localeData = JSON.parse(fs.readFileSync(localePath, 'utf8'));

module.exports = {
  DICTIONARY: localeData.translations || {},
  RUNTIME_SCRIPT: fs.readFileSync(runtimePath, 'utf8')
};
