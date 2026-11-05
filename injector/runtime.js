/* __ANTIGRAVITY_PTBR_PATCHED__ */
/**
 * Antigravity pt-BR Runtime Injection Engine (v2.2.0)
 * Deep DOM & Shadow DOM recursive text node visitor with immediate portal/overlay interception,
 * inline mixed-tag phrase resolution, virtualized scroll observer, and dynamic pattern transformers.
 */

(function () {
  if (window.__ANTIGRAVITY_PTBR_LOADED__) {
    return;
  }
  window.__ANTIGRAVITY_PTBR_LOADED__ = true;

  const dictionary = window.__ANTIGRAVITY_LOCALE_DICT__ || {};

  // Case-insensitive dictionary index for resilient lookups
  const lowerCaseIndex = new Map();
  for (const key of Object.keys(dictionary)) {
    lowerCaseIndex.set(key.toLowerCase(), dictionary[key]);
  }

  // Dynamic regex pattern transformers for agent actions, usage quotas, metrics and interpolations
  const DYNAMIC_PATTERNS = [
    // Greetings and initial home prompts
    {
      regex: /^Hi\s+(.+?),\s*what can we get done today\??$/i,
      replace: (_, name) => `Olá ${name}, o que podemos fazer hoje?`
    },

    // Model quota and popover resets
    {
      regex: /^Resets in\s+(\d+)d\s+(\d+)h$/i,
      replace: (_, d, h) => `Renova em ${d}d ${h}h`
    },
    {
      regex: /^Resets in\s+(\d+)h\s+(\d+)m$/i,
      replace: (_, h, m) => `Renova em ${h}h ${m}m`
    },
    {
      regex: /^(\d+)%\s+left$/i,
      replace: (_, pct) => `${pct}% restante`
    },

    // Dynamic project & policy descriptions
    {
      regex: /^Controls the actions the agent can take\.\s*Modified in (\d+) projects?\.?$/i,
      replace: (_, count) => `Controla as ações que o agente pode executar. Modificado em ${count} ${count === '1' ? 'projeto' : 'projetos'}`
    },
    {
      regex: /^Whether the agent asks you to review (?:your|its) documents\.\s*Modified in (\d+) projects?\.?$/i,
      replace: (_, count) => `Se o agente solicita a revisão de documentos. Modificado em ${count} ${count === '1' ? 'projeto' : 'projetos'}`
    },
    {
      regex: /^Modified in (\d+) projects?\.?$/i,
      replace: (_, count) => `Modificado em ${count} ${count === '1' ? 'projeto' : 'projetos'}`
    },
    {
      regex: /^Show (\d+) breakdowns?\.?$/i,
      replace: (_, count) => `Mostrar detalhamento (${count})`
    },
    {
      regex: /^Permanently delete (.+?) including (\d+) active conversations?\.?$/i,
      replace: (_, target, count) => `Excluir permanentemente ${target} incluindo ${count} ${count === '1' ? 'conversa ativa' : 'conversas ativas'}.`
    },

    // Dynamic quota and rate limit messages
    {
      regex: /^You have used some of your weekly limit,\s*it will fully refresh in (\d+) days?,\s*(\d+) hours?\.?$/i,
      replace: (_, days, hours) => `Você utilizou parte do seu limite semanal; ele será totalmente renovado em ${days} dia e ${hours} horas.`
    },
    {
      regex: /^You have used some of your 5-hour limit,\s*it will fully refresh in (\d+) hours?,\s*(\d+) minutes?\.?$/i,
      replace: (_, hours, mins) => `Você utilizou parte do seu limite de 5 horas; ele será totalmente renovado em ${hours} horas e ${mins} minutos.`
    },
    {
      regex: /^You have hit your 5-hour limit,\s*so the weekly limit does not currently apply\.\s*Your 5-hour limit will refresh in (\d+) hours?,\s*(\d+) minutes?\.?$/i,
      replace: (_, hours, mins) => `Você atingiu seu limite de 5 horas, portanto o limite semanal não se aplica no momento. Seu limite de 5 horas será renovado em ${hours} horas e ${mins} minutos.`
    },
    {
      regex: /^You have hit your 5-hour limit,\s*it will refresh in (\d+) hours?,\s*(\d+) minutes?\.\s*If on a supported paid plan,\s*you can use AI credits in the interim\.?$/i,
      replace: (_, hours, mins) => `Você atingiu seu limite de 5 horas; ele será renovado em ${hours} horas e ${mins} minutos. Se estiver em um plano pago compatível, você poderá usar créditos de IA nesse período.`
    },

    // Dynamic timeline and agent execution logs
    {
      regex: /^Worked for\s+(.+)$/i,
      replace: (_, time) => `Trabalhou por ${time}`
    },
    {
      regex: /^Thought for\s+(.+)$/i,
      replace: (_, time) => `Pensou por ${time}`
    },
    {
      regex: /^Explored files,\s*ran commands,\s*edited files$/i,
      replace: () => 'Explorou arquivos, executou comandos e editou arquivos'
    },
    {
      regex: /^Ran\s+(.+?)\s*([·•\-])\s*Exited with code\s+(\d+)$/i,
      replace: (_, cmd, dot, code) => `Executou ${cmd} ${dot} Finalizado com código ${code}`
    },
    {
      regex: /^([·•\-])\s*Exited with code\s+(\d+)$/i,
      replace: (_, dot, code) => `${dot} Finalizado com código ${code}`
    },
    {
      regex: /^Reading\s+(.+)$/i,
      replace: (_, target) => `Lendo ${target}`
    },
    {
      regex: /^Writing\s+(.+)$/i,
      replace: (_, target) => `Escrevendo ${target}`
    },
    {
      regex: /^Searching\s+(.+)$/i,
      replace: (_, target) => `Pesquisando ${target}`
    },
    {
      regex: /^Checking\s+(.+)$/i,
      replace: (_, target) => `Verificando ${target}`
    },
    {
      regex: /^Building\s+(.+)$/i,
      replace: (_, target) => `Compilando ${target}`
    },
    {
      regex: /^Installing\s+(.+)$/i,
      replace: (_, target) => `Instalando ${target}`
    },
    {
      regex: /^Exploring\s+(.+)$/i,
      replace: (_, target) => `Explorando ${target}`
    },
    {
      regex: /^Working(?:\.{3}|\u2026)?$/i,
      replace: () => 'Trabalhando...'
    },
    {
      regex: /^Thinking(?:\.{3}|\u2026)?$/i,
      replace: () => 'Pensando...'
    },
    {
      regex: /^Ran\s+(.+)$/i,
      replace: (_, cmd) => `Executou ${cmd}`
    },
    {
      regex: /^Exited with code\s+(\d+)$/i,
      replace: (_, code) => `Finalizado com código ${code}`
    },
    {
      regex: /^Analyzed\s+(.+)$/i,
      replace: (_, target) => `Analisou ${target}`
    },
    {
      regex: /^Created\s+(.+)$/i,
      replace: (_, target) => `Criou ${target}`
    },
    {
      regex: /^Edited\s+(.+)$/i,
      replace: (_, target) => `Editou ${target}`
    },
    {
      regex: /^Checked task\s+(.+)$/i,
      replace: (_, task) => `Verificou a tarefa ${task}`
    },
    {
      regex: /^Checked\s+(.+)$/i,
      replace: (_, item) => `Verificou ${item}`
    },
    {
      regex: /^Running\s+(.+)$/i,
      replace: (_, item) => `Executando ${item}`
    },
    {
      regex: /^Completed in\s+(.+)$/i,
      replace: (_, time) => `Concluído em ${time}`
    },
    {
      regex: /^(\d+)\s+files?\s+changed$/i,
      replace: (_, count) => `${count} ${count === '1' ? 'arquivo alterado' : 'arquivos alterados'}`
    },
    {
      regex: /^(\d+)\s+insertions?\s*\(\+\)$/i,
      replace: (_, count) => `${count} ${count === '1' ? 'inserção(+)' : 'inserções(+)'}`
    },
    {
      regex: /^(\d+)\s+deletions?\s*\(-\)$/i,
      replace: (_, count) => `${count} ${count === '1' ? 'exclusão(-)' : 'exclusões(-)'}`
    },

    // Prefix-based skill explanation fallbacks (handles any truncation by virtualizer/UI)
    {
      regex: /^Provides instructions for installing and using the ['"]android['"] CLI.*$/i,
      replace: () => "Fornece instruções para instalar e usar a CLI 'android'. A ferramenta de linha de comando 'android' é essencial para o desenvolvimento Android e ajuda a criar projetos, executar aplicativos em dispositivos,..."
    },
    {
      regex: /^Instructions for working with the Android Device Hub sidecar.*$/i,
      replace: () => "Instruções para operar com o sidecar do Android Device Hub, que lista, inicia, encerra, cria e remove dispositivos virtuais Android (AVDs), lista dispositivos físicos conectados ao adb e permite espelhar e..."
    },
    {
      regex: /^Provides a comprehensive guide,\s*quick reference,\s*and sitemap for Google Antigravity.*$/i,
      replace: () => "Fornece um guia abrangente, referência rápida e mapa do Google Antigravity (AGY), incluindo a CLI do Antigravity (agy), Antigravity 2.0, IDE do Antigravity, SDK Python, comandos de barra, atalhos e..."
    },
    {
      regex: /^Interactive guide to design and create a scheduled background automation.*$/i,
      replace: () => 'Guia interativo para projetar e criar automações agendadas em segundo plano. Use esta habilidade quando o usuário quiser criar uma tarefa agendada ou recorrente (ex.: "resumir meus e-mails toda manhã",...'
    }
  ];

  // Specific protected technical names & slugs (MUST NOT be translated)
  const PROTECTED_IDENTIFIERS = new Set([
    'agy-customizations',
    'alphafold-database-fetch-and-analyze',
    'alphagenome-atlas-website-links',
    'alphagenome-single-variant-analysis',
    'alphagenome-variant-impact-score',
    'android-cli',
    'Android CLI',
    'android-device-hub',
    'chrome-devtools-plugin',
    'firebase',
    'google-antigravity-sdk',
    'modern-web-guidance-plugin',
    'Science',
    'Turbo',
    'Google Chrome',
    'Antigravity'
  ]);

  // Pure path, url, code or UUID patterns that should remain untouched
  const EXCLUDE_PATTERNS = [
    /^[A-Za-z]:[\\/]/,                          // Windows absolute paths: C:\...
    /^\/[a-zA-Z0-9_\-.]+/,                      // POSIX paths: /var/...
    /^https?:\/\//i,                            // HTTP/HTTPS URLs
    /^(file|sidecar|vscode|agy):\/\//i,         // Custom URI schemes
    /^\d+(\.\d+)?(\s*(px|rem|em|%|ms|s|KB|MB|GB))?$/i, // Pure numbers or units
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, // UUIDs
    /^[{}[\]();=><+*&|!~^%]+$/                  // Pure code syntax tokens
  ];

  // Tags that must never have text nodes replaced
  const EXCLUDED_TAGS = new Set([
    'PRE', 'CODE', 'TEXTAREA', 'SCRIPT', 'STYLE', 'NOSCRIPT', 'SVG', 'CANVAS'
  ]);

  // Selectors for elements that must never have their text modified
  const EXCLUDED_SELECTORS = [
    'pre',
    'code',
    '.terminal',
    '.xterm',
    '.monaco-editor',
    '.cm-editor',
    '[data-no-translate]'
  ].join(',');

  function isExcludedNode(node) {
    if (!node) return true;

    const element = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
    if (!element) return false;

    if (EXCLUDED_TAGS.has(element.tagName)) {
      return true;
    }

    if (element.closest && element.closest(EXCLUDED_SELECTORS)) {
      return true;
    }

    return false;
  }

  function shouldExcludeRawText(trimmed) {
    if (!trimmed || trimmed.length === 0) {
      return true;
    }
    if (PROTECTED_IDENTIFIERS.has(trimmed)) {
      return true;
    }
    for (let i = 0; i < EXCLUDE_PATTERNS.length; i++) {
      if (EXCLUDE_PATTERNS[i].test(trimmed)) {
        return true;
      }
    }
    return false;
  }

  function translateString(input) {
    if (!input || typeof input !== 'string') return input;
    const trimmed = input.trim();
    if (!trimmed) return input;

    // 1. Dynamic regex pattern matching first
    for (let i = 0; i < DYNAMIC_PATTERNS.length; i++) {
      const pattern = DYNAMIC_PATTERNS[i];
      if (pattern.regex.test(trimmed)) {
        const transformed = trimmed.replace(pattern.regex, pattern.replace);
        if (transformed !== trimmed) {
          const leading = input.match(/^\s*/)[0];
          const trailing = input.match(/\s*$/)[0];
          return leading + transformed + trailing;
        }
      }
    }

    // 2. Technical and code exclusions
    if (shouldExcludeRawText(trimmed)) {
      return input;
    }

    // 3. Exact dictionary lookup
    let translated = dictionary[trimmed];

    // 4. Case-insensitive dictionary lookup fallback
    if (!translated) {
      translated = lowerCaseIndex.get(trimmed.toLowerCase());
    }

    if (translated && translated !== trimmed) {
      const leading = input.match(/^\s*/)[0];
      const trailing = input.match(/\s*$/)[0];
      return leading + translated + trailing;
    }

    return input;
  }

  function translateTextNode(node) {
    if (!node || node.nodeType !== Node.TEXT_NODE) return;
    if (isExcludedNode(node)) return;

    const currentText = node.nodeValue;
    if (!currentText || !currentText.trim()) return;

    const newText = translateString(currentText);
    if (newText !== currentText) {
      node.nodeValue = newText;
    }
  }

  const TRANSLATABLE_ATTRIBUTES = ['placeholder', 'aria-label', 'title', 'alt'];

  function translateAttributes(element) {
    if (!element || element.nodeType !== Node.ELEMENT_NODE) return;
    if (isExcludedNode(element)) return;

    for (let i = 0; i < TRANSLATABLE_ATTRIBUTES.length; i++) {
      const attr = TRANSLATABLE_ATTRIBUTES[i];
      const val = element.getAttribute(attr);
      if (val) {
        const newVal = translateString(val);
        if (newVal !== val) {
          element.setAttribute(attr, newVal);
        }
      }
    }
  }

  /**
   * Resolves inline mixed-tag phrases (e.g. "Type <kbd>/</kbd> and select <kbd>plan</kbd>...")
   * by translating individual text segments around inline elements.
   */
  function resolveMixedInlineChildren(element) {
    if (!element || element.nodeType !== Node.ELEMENT_NODE) return;
    if (isExcludedNode(element)) return;

    // Check if element has multiple children with inline tags
    const childNodes = element.childNodes;
    if (childNodes.length <= 1) return;

    for (let i = 0; i < childNodes.length; i++) {
      const child = childNodes[i];
      if (child.nodeType === Node.TEXT_NODE) {
        const raw = child.nodeValue;
        if (!raw || !raw.trim()) continue;
        const trimmed = raw.trim();

        // Check exact match or known inline fragment
        if (dictionary[trimmed]) {
          const leading = raw.match(/^\s*/)[0];
          const trailing = raw.match(/\s*$/)[0];
          child.nodeValue = leading + dictionary[trimmed] + trailing;
        } else if (trimmed === 'Type') {
          child.nodeValue = raw.replace('Type', 'Digite');
        } else if (trimmed === 'and select') {
          child.nodeValue = raw.replace('and select', 'e selecione');
        } else if (trimmed === 'to have the agent generate a plan.') {
          child.nodeValue = raw.replace('to have the agent generate a plan.', 'para o agente gerar um plano.');
        } else if (trimmed === 'Also includes') {
          child.nodeValue = raw.replace('Also includes', 'Também inclui');
        } else if (trimmed === 'when working in this project.') {
          child.nodeValue = raw.replace('when working in this project.', 'ao trabalhar neste projeto.');
        } else if (trimmed === 'when working in this project. Learn more.') {
          child.nodeValue = raw.replace('when working in this project. Learn more.', 'ao trabalhar neste projeto. Saiba mais.');
        }
      }
    }
  }

  /**
   * Recursively visits and translates pure text nodes (nodeType === 3),
   * mixed inline children, and translatable attributes.
   */
  function deepWalkAndTranslate(node) {
    if (!node || isExcludedNode(node)) return;

    if (node.nodeType === Node.TEXT_NODE) {
      translateTextNode(node);
      return;
    }

    if (node.nodeType === Node.ELEMENT_NODE) {
      translateAttributes(node);
      resolveMixedInlineChildren(node);

      if (node.shadowRoot) {
        observeRoot(node.shadowRoot);
        deepWalkAndTranslate(node.shadowRoot);
      }

      // Process all child nodes recursively
      let child = node.firstChild;
      while (child) {
        const nextChild = child.nextSibling;
        deepWalkAndTranslate(child);
        child = nextChild;
      }
    }
  }

  // Non-blocking batch processing queue for standard DOM updates
  const pendingNodes = new Set();
  let rafHandle = null;

  function processPendingNodes() {
    rafHandle = null;
    const nodes = Array.from(pendingNodes);
    pendingNodes.clear();

    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      if (node.isConnected || (node.getRootNode && node.getRootNode() instanceof ShadowRoot)) {
        deepWalkAndTranslate(node);
      }
    }
  }

  function queueNode(node) {
    if (!node) return;
    pendingNodes.add(node);
    if (!rafHandle) {
      rafHandle = requestAnimationFrame(processPendingNodes);
    }
  }

  // Detects if a node is an overlay, modal, menu, popover or tooltip
  function isPortalOrOverlay(element) {
    if (!element || element.nodeType !== Node.ELEMENT_NODE) return false;
    const role = element.getAttribute && element.getAttribute('role');
    if (role === 'menu' || role === 'dialog' || role === 'tooltip' || role === 'popover' || role === 'listbox') {
      return true;
    }
    const cls = element.className;
    if (typeof cls === 'string' && (
      cls.includes('radix') ||
      cls.includes('popper') ||
      cls.includes('portal') ||
      cls.includes('modal') ||
      cls.includes('dropdown') ||
      cls.includes('menu') ||
      cls.includes('tooltip')
    )) {
      return true;
    }
    if (element.hasAttribute && (
      element.hasAttribute('data-radix-portal') ||
      element.hasAttribute('data-radix-popper-content-wrapper') ||
      element.hasAttribute('data-state')
    )) {
      return true;
    }
    return false;
  }

  const observer = new MutationObserver((mutations) => {
    for (let i = 0; i < mutations.length; i++) {
      const mut = mutations[i];
      if (mut.type === 'characterData') {
        queueNode(mut.target);
      } else if (mut.type === 'childList') {
        for (let j = 0; j < mut.addedNodes.length; j++) {
          const added = mut.addedNodes[j];
          if (added.nodeType === Node.ELEMENT_NODE) {
            // Portals and overlays get translated immediately to prevent visual flash
            if (isPortalOrOverlay(added) || added.parentElement === document.body) {
              deepWalkAndTranslate(added);
            } else {
              queueNode(added);
            }

            if (added.shadowRoot) {
              observeRoot(added.shadowRoot);
              deepWalkAndTranslate(added.shadowRoot);
            }
          } else if (added.nodeType === Node.TEXT_NODE) {
            queueNode(added);
          }
        }
      } else if (mut.type === 'attributes') {
        if (TRANSLATABLE_ATTRIBUTES.includes(mut.attributeName)) {
          queueNode(mut.target);
        }
      }
    }
  });

  const observedRoots = new WeakSet();

  function observeRoot(root) {
    if (!root || observedRoots.has(root)) return;
    try {
      observedRoots.add(root);
      observer.observe(root, {
        childList: true,
        subtree: true,
        characterData: true,
        attributes: true,
        attributeFilter: TRANSLATABLE_ATTRIBUTES
      });
    } catch (_) {}
  }

  // Hook Element.prototype.attachShadow to observe and translate custom WebComponents
  if (typeof Element !== 'undefined' && Element.prototype.attachShadow) {
    const originalAttachShadow = Element.prototype.attachShadow;
    Element.prototype.attachShadow = function (init) {
      const shadowRoot = originalAttachShadow.call(this, init);
      try {
        observeRoot(shadowRoot);
        deepWalkAndTranslate(shadowRoot);
      } catch (_) {}
      return shadowRoot;
    };
  }

  // Continuous listener on user interactions to instantly translate popovers, context menus and dialogs
  function attachInteractionListeners() {
    const scanActiveOverlays = () => {
      // Find all floating portals, dropdowns, context menus and tooltips in body
      const overlays = document.querySelectorAll(
        '[role="menu"], [role="dialog"], [role="tooltip"], [role="listbox"], ' +
        '[data-radix-popper-content-wrapper], [data-radix-portal], ' +
        '.modal, .dropdown, .popover, .menu'
      );
      for (let i = 0; i < overlays.length; i++) {
        deepWalkAndTranslate(overlays[i]);
      }
    };

    // Instant capture for context menus (three-dot buttons / right-click) and clicks
    window.addEventListener('contextmenu', () => requestAnimationFrame(scanActiveOverlays), { capture: true, passive: true });
    window.addEventListener('pointerdown', () => requestAnimationFrame(scanActiveOverlays), { capture: true, passive: true });
    window.addEventListener('focusin', () => requestAnimationFrame(scanActiveOverlays), { capture: true, passive: true });
    window.addEventListener('keydown', () => requestAnimationFrame(scanActiveOverlays), { capture: true, passive: true });

    // Virtualized scroll observer: re-translate newly rendered rows as user scrolls skills/settings
    let scrollRaf = null;
    const onScrollOrResize = () => {
      if (!scrollRaf) {
        scrollRaf = requestAnimationFrame(() => {
          scrollRaf = null;
          const target = document.body || document.documentElement;
          if (target) {
            deepWalkAndTranslate(target);
          }
        });
      }
    };

    window.addEventListener('scroll', onScrollOrResize, { capture: true, passive: true });
    window.addEventListener('resize', onScrollOrResize, { capture: true, passive: true });
  }

  function startEngine() {
    const root = document.documentElement;
    const body = document.body;

    if (root) {
      observeRoot(root);
      deepWalkAndTranslate(root);
    }
    if (body) {
      observeRoot(body);
      deepWalkAndTranslate(body);
    }

    attachInteractionListeners();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startEngine);
  } else {
    startEngine();
  }
})();
