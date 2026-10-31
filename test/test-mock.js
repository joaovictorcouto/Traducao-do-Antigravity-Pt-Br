/**
 * Unit Test for Patcher & Restore on Mock Electron App
 */

const fs = require('fs');
const path = require('path');
const asar = require('@electron/asar');
const { applyPatch, checkPatchState, PATCH_SIGNATURE } = require('../core/patcher');
const { restoreBackup } = require('../core/restore');

async function testMockApp() {
  const mockDir = path.resolve(__dirname, 'mock_app');
  const mockResources = path.join(mockDir, 'resources');
  const mockSource = path.join(mockDir, 'source');

  fs.rmSync(mockDir, { recursive: true, force: true });
  fs.mkdirSync(mockSource, { recursive: true });
  fs.mkdirSync(mockResources, { recursive: true });

  // Create mock files
  const mockPreload = path.join(mockSource, 'dist', 'preload.js');
  fs.mkdirSync(path.dirname(mockPreload), { recursive: true });
  fs.writeFileSync(mockPreload, '// Original Preload Script\nconsole.log("hello preload");\n');

  const mockHtml = path.join(mockSource, 'index.html');
  fs.writeFileSync(mockHtml, '<!DOCTYPE html><html><head><title>Test</title></head><body><h1>Hello</h1></body></html>');

  const mockMenu = path.join(mockSource, 'dist', 'menu.js');
  fs.writeFileSync(mockMenu, "label: 'New Window'; label: 'Docs'; label: 'Connect to WSL';");

  const mockMain = path.join(mockSource, 'dist', 'main.js');
  fs.writeFileSync(mockMain, "label: 'Quit'; title: 'Confirm Quit'; message: 'Are you sure you want to quit?';");

  const mockUpdater = path.join(mockSource, 'dist', 'updater.js');
  fs.writeFileSync(mockUpdater, 'MenuUpdateStep["CheckForUpdates"] = "Check for Updates"; message: "No updates available";');

  // Pack mock app.asar
  const mockAsar = path.join(mockResources, 'app.asar');
  await asar.createPackage(mockSource, mockAsar);

  console.log('1. Verificando estado inicial do mock asar...');
  const initState = checkPatchState(mockDir);
  if (initState.already_patched) {
    throw new Error('Mock asar não deveria estar patcheado inicialmente');
  }

  console.log('2. Aplicando patch no mock asar...');
  const patchResult = await applyPatch({ customPath: mockDir });
  if (!patchResult.success) {
    throw new Error('Falha ao aplicar patch no mock asar');
  }

  console.log('3. Verificando se backup foi criado...');
  const mockBak = path.join(mockResources, 'app.asar.bak');
  if (!fs.existsSync(mockBak)) {
    throw new Error('Arquivo de backup app.asar.bak não foi criado');
  }

  console.log('4. Verificando se assinatura está presente no asar patcheado...');
  const postState = checkPatchState(mockDir);
  if (!postState.already_patched) {
    throw new Error('Asar patcheado não contém a assinatura esperada');
  }

  console.log('5. Verificando conteúdo extraído do asar patcheado...');
  if (typeof asar.uncacheAll === 'function') {
    asar.uncacheAll();
  }
  const extractedPreload = asar.extractFile(mockAsar, 'dist/preload.js').toString('utf8');
  if (!extractedPreload.includes(PATCH_SIGNATURE) || !extractedPreload.includes('__ANTIGRAVITY_LOCALE_DICT__')) {
    throw new Error('dist/preload.js no asar patcheado não contém o bundle de injeção');
  }

  const extractedMenu = asar.extractFile(mockAsar, 'dist/menu.js').toString('utf8');
  if (!extractedMenu.includes('Nova Janela') || !extractedMenu.includes('Documentação')) {
    throw new Error('dist/menu.js não teve strings substituídas');
  }

  const extractedMain = asar.extractFile(mockAsar, 'dist/main.js').toString('utf8');
  if (!extractedMain.includes('Sair') || !extractedMain.includes('Confirmar Saída')) {
    throw new Error('dist/main.js não teve strings substituídas');
  }

  const extractedUpdater = asar.extractFile(mockAsar, 'dist/updater.js').toString('utf8');
  if (!extractedUpdater.includes('Verificar Atualizações') || !extractedUpdater.includes('Nenhuma atualização disponível')) {
    throw new Error('dist/updater.js não teve strings substituídas');
  }

  console.log('6. Testando utilitário de restauração (restore)...');
  const restoreResult = restoreBackup({ customPath: mockDir });
  if (!restoreResult.restored) {
    throw new Error('Falha na restauração do backup');
  }

  console.log('7. Verificando se o asar voltou ao estado original...');
  const finalState = checkPatchState(mockDir);
  if (finalState.already_patched) {
    throw new Error('O asar ainda está marcado como patcheado após restauração');
  }

  console.log('8. Limpando mock...');
  fs.rmSync(mockDir, { recursive: true, force: true });

  console.log('🎉 Teste de Mock concluído com 100% de sucesso!');
}

testMockApp().catch(err => {
  console.error('❌ Erro no teste de mock:', err);
  process.exit(1);
});
