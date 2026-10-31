/**
 * Automated Test Suite for Antigravity pt-BR Translation Engine
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { PATCH_SIGNATURE, findAntigravityPath, checkPatchState } = require('../core/patcher');
const { patchSourceFiles, FILE_REPLACEMENTS } = require('../core/source-patcher');

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (!condition) {
    console.error(`❌ FALHA: ${message}`);
    process.exitCode = 1;
  } else {
    passedTests++;
    console.log(`✅ SUCESSO: ${message}`);
  }
}

console.log('=== Iniciando Verificação do Sistema de Tradução pt-BR ===\n');

// 1. Dicionário pt-br.json
console.log('[1/6] Testando Dicionário (injector/locales/pt-br.json)...');
const dictPath = path.resolve(__dirname, '..', 'injector', 'locales', 'pt-br.json');
assert(fs.existsSync(dictPath), 'Arquivo pt-br.json existe');
const dict = JSON.parse(fs.readFileSync(dictPath, 'utf8'));
const translations = dict.translations;
assert(typeof translations === 'object' && Object.keys(translations).length > 100, 'Dicionário contém mais de 100 termos essenciais');

// Verificar seções do menu de Configurações e novos painéis internos
const requiredSections = [
  // Painéis gerais e de navegação
  'General', 'Agents', 'Keys', 'Models', 'Storage', 'Shortcuts', 'Telemetry',
  'Application', 'Prevent Sleep', 'Keep In Menu Bar', 'Remote Control', 'Enable Remote Control',
  'Notification Settings', 'Open System Preferences', 'App version', 'Advanced Settings',
  'Global Permissions', 'Permission Preset', 'Tool Permissions', 'Network Access Rules',
  'Agent Behavior', 'Plan Review Policy', 'Execution', 'Queued Messages', 'Built-in Browser',
  'Open Links In', 'External Browser', 'Manage your model quota and credits', 'Your Plan',
  'Upgrade', 'Model Credits', 'Enable AI Credit Overages', 'Weekly Limit Remaining',
  'Five Hour Limit Remaining', "Configure the agent's visual theme and display preferences",
  'Contrast', 'Dark Theme', 'Preset', 'Background', 'Foreground', 'Accent',
  'Background Commands', 'Request Review', 'Always Ask', 'Strong', 'Default',
  'files changed', 'insertions', 'deletions',

  // Barra Lateral e Interface Principal
  'New Conversation', 'Automations', 'Customizations', 'Projects', 'Show All',
  'Not in Project', 'Conversations', 'Local Checkout', 'Give Feedback',
  'Ask anything, @ to mention, / for actions',
  'Configure agent execution, queued message delivery, and permissions.',
  'Configure global allowed and denied resource permissions.',
  'Learn more.', 'Modify permissions for file, terminal, and MCP tools.',
  'Configure allowed and denied URLs for reading.', 'Open',
  'Type / and select plan to have the agent generate a plan.',
  'Configure when follow-up messages are sent.', 'Keyboard shortcuts',
  'Queue', 'Send Immediately',
  'Configure link opening and built-in browser preferences.',
  'Choose where links open by default when clicked.',
  'Browser Subagent', 'Browser Javascript Execution Policy',
  'Controls whether the agent can run custom JavaScript to automate complex browser actions.',
  'Browser Actuation Rules', 'Configure allowed and denied URLs for browser actions.',
  'Block all browser JavaScript execution.',
  'Prompt for approval before running browser scripts.',
  'Always Proceed', 'Allow full browser script execution without prompting.',
  'Chat Settings', 'Verbose Agent Chat', 'Display and preserve intermediate thinking steps.',
  'Conversation Width', 'Configure the maximum width of the conversation panel.',
  'Narrow', 'Wide', 'Search shortcuts...', 'Navigation',
  'Open Conversation Picker', 'Open File Search', 'Go Back', 'Go Forward',
  'Nova Aba', 'Reopen Closed Tab', 'Select Previous Conversation',
  'Select Next Conversation', 'Move Conversation Up', 'Move Conversation Down',
  'Previous Aux Pane Tab', 'Next Aux Pane Tab', 'Open Settings',
  'Focus Input', 'Toggle Model Selector', 'Toggle Voice Recording',
  'Find in Pane', 'Add to Chat/Quote', 'Archive This Conversation',
  'Layout Controls', 'Toggle Sidebar', 'Toggle Auxiliary Pane',
  'Toggle Maximize Auxiliary Pane', 'Toggle Overview Panel',
  'Notifications', 'Manage your notification preferences.',
  'Enable Notifications for Agent',
  'Show system notifications when your action is needed or the agent finishes.',
  'Enable Sounds for Agent',
  'Play a sound when your action is needed or the agent finishes.',
  'Set the volume of agent sounds.',
  'You can upgrade to a Google AI Ultra plan to receive higher rate limits.',
  'Gemini Models', 'Claude and GPT models',
  'Manage project folders, agent settings, and permissions.',
  'Folders', 'Add Folder', 'Permission Settings',
  'Controls the actions the agent can take.',
  'File Access Rules', 'Configure allowed and denied paths for file reads and writes.',
  'Terminal Commands', 'Configure allowed terminal commands.',
  'MCP Tools', 'Configure external tools via Model Context Protocol.',
  'Whether the agent asks you to review its documents.',
  'Inherit Global', 'Rules', 'Other Customizations',
  'Danger Zone', 'Delete Project', 'Excluir Project',
  'Create Project', 'Open IDE', 'Extensions',

  // Menus de Contexto e Três Pontos
  'Copy Project Name', 'Project Settings', 'Show in File Explorer',
  'Rename', 'Pin', 'Mark Unread', 'Split', 'Archive',

  // Menus da Barra Superior e Extensões
  'Android Compose Preview', 'Android Device Hub', 'Biomolecular Structure Viewer',

  // Dropdowns de Seleção e Permissões
  'Inherits your Global Permissions when working in this project.',
  'Each command requires approval.', 'Ask before sensitive operations.',
  'Auto (Preview)', 'Automatically decide if commands run.',
  'Run all commands without restrictions.',
  'Configure allowed and denied URLs for browser actuation',

  // Seletor de Modelo e Popover de Uso
  'New Worktree', 'Worktrees are available for Git repositories',
  'Model', 'Notice', 'Unavailable', 'View Usage', 'Usage',
  'Weekly limit', '5h limit',

  // Ações da Timeline e Status
  'Ran', 'Analyzed', 'Edited', 'Created', 'Reading', 'Working'
];
for (const section of requiredSections) {
  assert(translations[section] !== undefined, `Termo '${section}' mapeado no dicionário`);
}

// 2. Runtime de Injeção
console.log('\n[2/6] Testando Runtime (injector/runtime.js)...');
const runtimePath = path.resolve(__dirname, '..', 'injector', 'runtime.js');
assert(fs.existsSync(runtimePath), 'Arquivo runtime.js existe');
const runtimeContent = fs.readFileSync(runtimePath, 'utf8');
assert(runtimeContent.includes(PATCH_SIGNATURE), 'Runtime contém a assinatura oficial __ANTIGRAVITY_PTBR_PATCHED__');
assert(runtimeContent.includes('MutationObserver'), 'Runtime implementa MutationObserver');
assert(runtimeContent.includes('attachShadow'), 'Runtime implementa suporte a Shadow DOM');
assert(runtimeContent.includes('DYNAMIC_PATTERNS'), 'Runtime possui motor de padrões regex dinâmicos');
assert(runtimeContent.includes('TEXT_NODE'), 'Runtime varre nós TEXT_NODE');
assert(runtimeContent.includes('placeholder') && runtimeContent.includes('aria-label') && runtimeContent.includes('title'), 'Runtime varre placeholder, aria-label e title');
assert(runtimeContent.includes('isExcludedNode') && runtimeContent.includes('terminal'), 'Runtime contém regras de exclusão estrita para código/terminal');
assert(runtimeContent.includes('deepWalkAndTranslate'), 'Runtime possui varredura recursiva profunda deepWalkAndTranslate');
assert(runtimeContent.includes('resolveMixedInlineChildren'), 'Runtime possui resolvedor de nós mistos com tags inline');
assert(runtimeContent.includes('isPortalOrOverlay'), 'Runtime possui interceptor de portais e overlays flutuantes');

// Validar regex patterns da timeline, interpoladores dinâmicos, métricas e popover de uso
const patternRegexes = [
  { pattern: /^Worked for\s+(.+)$/i },
  { pattern: /^Thought for\s+(.+)$/i },
  { pattern: /^Explored files,\s*ran commands,\s*edited files$/i },
  { pattern: /^Ran\s+(.+?)\s*([·•\-])\s*Exited with code\s+(\d+)$/i },
  { pattern: /^([·•\-])\s*Exited with code\s+(\d+)$/i },
  { pattern: /^Reading\s+(.+)$/i },
  { pattern: /^Working(?:\.{3}|\u2026)?$/i },
  { pattern: /^Ran\s+(.+)$/i },
  { pattern: /^Exited with code\s+(\d+)$/i },
  { pattern: /^Analyzed\s+(.+)$/i },
  { pattern: /^Created\s+(.+)$/i },
  { pattern: /^Edited\s+(.+)$/i },
  { pattern: /^Checked task\s+(.+)$/i },
  { pattern: /^(\d+)\s+files?\s+changed$/i },
  { pattern: /^(\d+)\s+insertions?\s*\(\+\)$/i },
  { pattern: /^(\d+)\s+deletions?\s*\(-\)$/i },
  { pattern: /^Controls the actions the agent can take\.\s*Modified in (\d+) projects?\.?$/i },
  { pattern: /^Whether the agent asks you to review (?:your|its) documents\.\s*Modified in (\d+) projects?\.?$/i },
  { pattern: /^Modified in (\d+) projects?\.?$/i },
  { pattern: /^Show (\d+) breakdowns?\.?$/i },
  { pattern: /^Permanently delete (.+?) including (\d+) active conversations?\.?$/i },
  { pattern: /^You have used some of your weekly limit,\s*it will fully refresh in (\d+) days?,\s*(\d+) hours?\.?$/i },
  { pattern: /^You have used some of your 5-hour limit,\s*it will fully refresh in (\d+) hours?,\s*(\d+) minutes?\.?$/i },
  { pattern: /^Resets in\s+(\d+)d\s+(\d+)h$/i },
  { pattern: /^Resets in\s+(\d+)h\s+(\d+)m$/i },
  { pattern: /^(\d+)%\s+left$/i }
];

for (const p of patternRegexes) {
  assert(runtimeContent.includes(p.pattern.source), `Padrão regex ${p.pattern.source} presente no runtime`);
}

// 3. Patcher de Código-Fonte Compilado
console.log('\n[3/6] Testando Patcher de Código-Fonte Compilado (core/source-patcher.js)...');
assert(typeof patchSourceFiles === 'function', 'Função patchSourceFiles exportada');
assert(typeof FILE_REPLACEMENTS === 'object' && Object.keys(FILE_REPLACEMENTS).length >= 5, 'FILE_REPLACEMENTS define regras para múltiplos módulos compilados');
assert(FILE_REPLACEMENTS['dist/main.js'] !== undefined, 'Regras de substituição para dist/main.js presentes');
assert(FILE_REPLACEMENTS['dist/updater.js'] !== undefined, 'Regras de substituição para dist/updater.js presentes');
assert(FILE_REPLACEMENTS['dist/menu.js'] !== undefined, 'Regras de substituição para dist/menu.js presentes');
assert(FILE_REPLACEMENTS['dist/tray.js'] !== undefined, 'Regras de substituição para dist/tray.js presentes');
assert(FILE_REPLACEMENTS['dist/ipcHandlers.js'] !== undefined, 'Regras de substituição para dist/ipcHandlers.js presentes');

// 4. Localização dinâmica do Antigravity
console.log('\n[4/6] Testando Localização e Mecanismo de Verificação do Core...');
let antigravityPath = null;
try {
  antigravityPath = findAntigravityPath();
  assert(antigravityPath && fs.existsSync(antigravityPath), `Antigravity localizado em: ${antigravityPath}`);
} catch (e) {
  assert(false, `Falha ao localizar Antigravity: ${e.message}`);
}

if (antigravityPath) {
  const state = checkPatchState(antigravityPath);
  assert(typeof state.already_patched === 'boolean', `Estado de patch verificado com sucesso (already_patched: ${state.already_patched})`);
}

// 5. Launcher Executável e Ícone Oficial
console.log('\n[5/6] Testando Launcher Executável e Ícone Oficial Embutido...');
const launcherExe = path.resolve(__dirname, '..', 'Antigravity-ptbr.exe');
assert(fs.existsSync(launcherExe), 'Executável Antigravity-ptbr.exe existe');
const launcherBuffer = fs.readFileSync(launcherExe);
// Windows PE header check: 'MZ'
assert(launcherBuffer[0] === 0x4D && launcherBuffer[1] === 0x5A, 'Executável possui cabeçalho PE (Windows Portable Executable) válido');
assert(launcherBuffer.length < 5 * 1024 * 1024, `Launcher é leve e otimizado (${(launcherBuffer.length / 1024).toFixed(1)} KB)`);

// Verificar recurso de ícone oficial
const appIcoPath = path.resolve(__dirname, '..', 'launcher', 'app.ico');
assert(fs.existsSync(appIcoPath), 'Arquivo launcher/app.ico existe');
const icoBuf = fs.readFileSync(appIcoPath);
const icoLayers = icoBuf.readUInt16LE(4);
assert(icoLayers >= 5, `Ícone oficial contém múltiplas camadas de resolução (${icoLayers} camadas encontradas)`);

const buildRsPath = path.resolve(__dirname, '..', 'launcher', 'build.rs');
assert(fs.existsSync(buildRsPath) && fs.readFileSync(buildRsPath, 'utf8').includes('winres'), 'Script launcher/build.rs configurado com winres');

const cargoTomlPath = path.resolve(__dirname, '..', 'launcher', 'Cargo.toml');
assert(fs.existsSync(cargoTomlPath) && fs.readFileSync(cargoTomlPath, 'utf8').includes('winres'), 'launcher/Cargo.toml inclui dependência winres');

// 6. Teste de Ciclo Completo (Mock App Asar)
console.log('\n[6/6] Executando Ciclo Completo de Patch e Rollback em Mock Asar...');
try {
  execSync('node test/test-mock.js', { stdio: 'inherit' });
  assert(true, 'Ciclo de extração, injeção, atomic repack e restauração validado');
} catch (e) {
  assert(false, `Falha no ciclo mock: ${e.message}`);
}

console.log(`\n========================================`);
console.log(`Testes Concluídos: ${passedTests}/${totalTests} aprovados.`);
if (passedTests === totalTests) {
  console.log('🎉 Todos os módulos e contratos foram validados com êxito!');
} else {
  console.error('⚠️ Alguns testes falharam.');
}
