/**
 * Antigravity pt-BR Source Patcher
 * Performs deep scan and direct string replacement in compiled frontend and shell files
 * inside dist folders before asar repacking.
 */

const fs = require('fs');
const path = require('path');

const PATCH_SIGNATURE = '__ANTIGRAVITY_PTBR_PATCHED__';

/**
 * File-specific replacement definitions for compiled JS/HTML files.
 * Each entry targets exact syntax contexts to guarantee programmatic safety.
 */
const FILE_REPLACEMENTS = {
  'dist/menu.js': [
    { target: "label: 'New Window'", replacement: "label: 'Nova Janela'" },
    { target: "label: 'Docs'", replacement: "label: 'Documentação'" },
    { target: "label: 'Connect to WSL'", replacement: "label: 'Conectar ao WSL'" },
    { target: "label: 'Reopen Locally'", replacement: "label: 'Reabrir Localmente'" }
  ],
  'dist/main.js': [
    { target: "label: 'New Window'", replacement: "label: 'Nova Janela'" },
    { target: "label: 'No agents running'", replacement: "label: 'Nenhum agente em execução'" },
    { target: "label: 'Quit'", replacement: "label: 'Sair'" },
    { target: "title: 'Confirm Quit'", replacement: "title: 'Confirmar Saída'" },
    { target: "message: 'Are you sure you want to quit?'", replacement: "message: 'Tem certeza de que deseja sair?'" },
    { target: "detail: 'There may be agents or background tasks running.'", replacement: "detail: 'Pode haver agentes ou tarefas em segundo plano em execução.'" },
    { target: "buttons: ['Cancel', 'Quit']", replacement: "buttons: ['Cancelar', 'Sair']" },
    { target: "showErrorBox('Binary not found',", replacement: "showErrorBox('Binário não encontrado'," },
    { target: "title: 'WSL distro not found'", replacement: "title: 'Distro WSL não encontrada'" },
    { target: "detail: 'Antigravity opened on Windows instead.'", replacement: "detail: 'Antigravity aberto no Windows ao invés disso.'" },
    { target: "showErrorBox('WSL setup failed',", replacement: "showErrorBox('Falha na configuração do WSL'," },
    { target: "showErrorBox('Startup failed',", replacement: "showErrorBox('Falha na inicialização'," }
  ],
  'dist/updater.js': [
    { target: 'MenuUpdateStep["CheckForUpdates"] = "Check for Updates"', replacement: 'MenuUpdateStep["CheckForUpdates"] = "Verificar Atualizações"' },
    { target: 'MenuUpdateStep["CheckingForUpdates"] = "Checking for Updates..."', replacement: 'MenuUpdateStep["CheckingForUpdates"] = "Verificando Atualizações..."' },
    { target: 'MenuUpdateStep["DownloadingUpdate"] = "Downloading Update..."', replacement: 'MenuUpdateStep["DownloadingUpdate"] = "Baixando Atualização..."' },
    { target: 'MenuUpdateStep["RestartToUpdate"] = "Restart to Update"', replacement: 'MenuUpdateStep["RestartToUpdate"] = "Reiniciar para Atualizar"' },
    { target: "title: 'Check for Updates'", replacement: "title: 'Verificar Atualizações'" },
    { target: 'title: "Check for Updates"', replacement: 'title: "Verificar Atualizações"' },
    { target: "message: 'No updates available'", replacement: "message: 'Nenhuma atualização disponível'" },
    { target: 'message: "No updates available"', replacement: 'message: "Nenhuma atualização disponível"' }
  ],
  'dist/tray.js': [
    {
      target: "(count > 0 ? `${count}` : 'No') + ' agent' + (count === 1 ? '' : 's') + ' running'",
      replacement: "(count > 0 ? `${count}` : 'Nenhum') + (count === 1 ? ' agente em execução' : ' agentes em execução')"
    },
    { target: "'No agents running'", replacement: "'Nenhum agente em execução'" }
  ],
  'dist/ipcHandlers.js': [
    { target: "showErrorBox('Cannot open folder',", replacement: "showErrorBox('Não é possível abrir a pasta'," },
    { target: "message: 'Folder is on the Windows filesystem'", replacement: "message: 'A pasta está no sistema de arquivos do Windows'" },
    { target: "title: 'Open workspace'", replacement: "title: 'Abrir espaço de trabalho'" },
    { target: "title: 'Open workspaces'", replacement: "title: 'Abrir espaços de trabalho'" }
  ],
  'dist/provisionSplash.js': [
    { target: 'Setting up WSL:', replacement: 'Configurando WSL:' }
  ],
  'dist/wsl.js': [
    { target: "'Downloading the Antigravity binary\\u2026'", replacement: "'Baixando o binário do Antigravity\\u2026'" },
    { target: "'Installing into ${distro}\\u2026'", replacement: "'Instalando em ${distro}\\u2026'" },
    {
      target: "'This folder is on the Windows filesystem. Accessing it from WSL (via /mnt) can be slow — for best performance keep projects inside the WSL filesystem.'",
      replacement: "'Esta pasta está no sistema de arquivos do Windows. O acesso via WSL (/mnt) pode ser lento — para melhor desempenho, mantenha os projetos no sistema de arquivos do WSL.'"
    },
    { target: "'This location cannot be opened in WSL:'", replacement: "'Este local não pode ser aberto no WSL:'" }
  ],
  'dist/ideInstall/wizardHtml.js': [
    { target: '<title>Welcome to Antigravity</title>', replacement: '<title>Bem-vindo ao Antigravity</title>' },
    { target: '<div class="text">Setting up…</div>', replacement: '<div class="text">Configurando…</div>' },
    { target: '<h1>Welcome to the new Antigravity!</h1>', replacement: '<h1>Bem-vindo ao novo Antigravity!</h1>' },
    {
      target: "Antigravity has been redesigned to put agents first with new capabilities. If you'd still like a code editor, you can download it as a separate app named <b>Antigravity IDE</b>.",
      replacement: "O Antigravity foi redesenhado para priorizar agentes com novas funcionalidades. Se você ainda quiser um editor de código, pode baixá-lo como um aplicativo separado chamado <b>Antigravity IDE</b>."
    },
    { target: '<span>Download the Antigravity IDE</span>', replacement: '<span>Baixar o Antigravity IDE</span>' },
    { target: 'Explore the new Antigravity', replacement: 'Explorar o novo Antigravity' }
  ]
};

/**
 * Scans extracted asar directory and applies direct string replacements.
 *
 * @param {string} extractDir Base directory where asar is extracted
 * @returns {object} Summary of patched files and total replacements
 */
function patchSourceFiles(extractDir) {
  const summary = {
    modifiedFiles: [],
    totalReplacements: 0
  };

  for (const [relPath, replacements] of Object.entries(FILE_REPLACEMENTS)) {
    const fullPath = path.join(extractDir, ...relPath.split('/'));
    if (!fs.existsSync(fullPath)) {
      continue;
    }

    let content = fs.readFileSync(fullPath, 'utf8');
    let fileModified = false;
    let fileReplacements = 0;

    for (const rule of replacements) {
      if (content.includes(rule.target)) {
        content = content.replaceAll(rule.target, rule.replacement);
        fileModified = true;
        fileReplacements++;
      }
    }

    if (fileModified) {
      if (!content.includes(PATCH_SIGNATURE)) {
        content = `/* ${PATCH_SIGNATURE} */\n${content}`;
      }
      fs.writeFileSync(fullPath, content, 'utf8');
      summary.modifiedFiles.push({
        path: relPath,
        replacements: fileReplacements
      });
      summary.totalReplacements += fileReplacements;
    }
  }

  return summary;
}

module.exports = {
  PATCH_SIGNATURE,
  FILE_REPLACEMENTS,
  patchSourceFiles
};
