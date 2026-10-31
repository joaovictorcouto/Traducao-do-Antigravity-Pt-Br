# Tradução do Antigravity Pt-Br 🇧🇷

Tradução completa, dinâmica e transparente para **Português do Brasil (pt-BR)** do **Google Antigravity**.

---

## 🌟 Recursos

- **Tradução Abrangente de Interface:** Telas de boas-vindas, configurações completas (Geral, Modelos, Atalhos, Armazenamento, Telemetria, etc.), painéis laterais, menus de contexto, diálogos e popovers.
- **Tradução da Linha do Tempo e Ações do Agente:** Indicadores em tempo real de execução, pensamento (`Pensou por 6s`), análise de arquivos (`Analisou package.json`), comandos executados, edições e status (`Trabalhando...`).
- **Motor Reativo com Suporte a Portais e Shadow DOM:** `MutationObserver` profundo que traduz elementos renderizados sob demanda em `<div id="portal-root">`, popovers e dropdowns.
- **Launcher Nativo em Rust (`Antigravity-ptbr.exe`):** Executável leve e de alta performance com o ícone oficial do Antigravity embutido (16x16 até 256x256), que aplica automaticamente o patch ao iniciar (caso o app seja atualizado pelo instalador oficial).
- **Segurança e Preservação de Código:** Preserva integralmente sintaxe de código, caminhos de arquivo, blocos de terminal, tags de template, nomes de marcas e chaves técnicas de API.
- **Backup e Restauração Instantânea:** Cria backup automático do `app.asar.bak` antes de qualquer modificação e suporta reversão para o estado original com um único comando.

---

## 🚀 Instalação e Uso Rápido

### Pré-requisitos
- **Node.js** (v18+)
- **Windows** com Google Antigravity instalado

### Passo a Passo

1. **Clone o repositório:**
   ```bash
   git clone https://github.com/joaovictorcouto/Traducao-do-Antigravity-Pt-Br.git
   cd Traducao-do-Antigravity-Pt-Br
   ```

2. **Instale as dependências:**
   ```bash
   npm install
   ```

3. **Aplique o Patch e configure o Launcher:**
   ```bash
   npm run setup
   ```
   *Este comando aplica a tradução no `app.asar`, compila o executável `Antigravity-ptbr.exe` e cria os atalhos no Menu Iniciar e na Área de Trabalho com o ícone oficial.*

---

## 🛠️ Comandos Disponíveis

| Comando | Descrição |
|---|---|
| `npm run patch` | Aplica a tradução pt-BR no Antigravity instalado. |
| `npm run patch:force` | Força a reaplicação do patch e atualização do dicionário/runtime. |
| `npm run patch:check` | Verifica se o Antigravity local está com o patch aplicado. |
| `npm run restore` | Restaura o `app.asar` original a partir do backup `.bak`. |
| `npm run build:launcher` | Compila o executável nativo `Antigravity-ptbr.exe` via Rust. |
| `npm run create-shortcuts` | Cria atalhos na Área de Trabalho e Menu Iniciar. |
| `npm test` | Executa a suíte de 234 testes unitários e de integração com mock do Electron. |

---

## 📂 Estrutura do Projeto

```text
├── core/
│   ├── patcher.js           # Gerenciador de extração, injeção e reempacotamento do app.asar
│   ├── restore.js           # Utilitário de rollback para o asar original
│   └── source-patcher.js    # Patcher estático de arquivos JS compilados (menu, updater, tray)
├── injector/
│   ├── runtime.js           # Motor de tradução dinâmico em tempo de execução (DOM/Observer/Regex)
│   └── locales/
│       └── pt-br.json       # Dicionário de termos e expressões em Português do Brasil
├── launcher/
│   ├── src/main.rs          # Código-fonte do launcher nativo em Rust
│   ├── Cargo.toml           # Dependências e metadados do binário Rust
│   ├── build.rs             # Configuração de recursos e ícone do Windows (winres)
│   ├── app.ico              # Ícone oficial extraído com múltiplas resoluções
│   ├── extract-icon.js      # Utilitário de extração do ícone do executável oficial
│   └── create-shortcuts.js  # Gerador de atalhos do Windows (.lnk)
├── test/
│   ├── test-system.js       # Suíte completa de testes do sistema e dicionário
│   └── test-mock.js         # Validador de ciclo completo em mock Electron asar
├── Antigravity-ptbr.exe     # Executável pré-compilado do launcher oficial pt-BR
└── package.json             # Scripts e dependências do projeto
```

---

## 🧪 Testes

Para executar todos os testes automatizados:

```bash
npm test
```

---

## 📄 Licença

Distribuído sob a licença MIT. Consulte `LICENSE` para mais informações.
