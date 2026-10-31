/**
 * Antigravity pt-BR Patch Engine
 * Handles dynamic path discovery, integrity verification, safe backup,
 * direct compiled source code patching, runtime injection, and asar repacking.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const asar = require('@electron/asar');
const { patchSourceFiles, PATCH_SIGNATURE } = require('./source-patcher');

/**
 * Dynamically resolves Antigravity installation root directory.
 */
function findAntigravityPath(customPath) {
  const candidatePaths = [
    customPath,
    process.env.ANTIGRAVITY_PATH,
    path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Antigravity'),
    path.join(process.env.PROGRAMFILES || '', 'Antigravity'),
    path.join(process.env['PROGRAMFILES(X86)'] || '', 'Antigravity'),
    // Also check current directory up to resources
    path.resolve(__dirname, '..', '..')
  ].filter(Boolean);

  for (const candidate of candidatePaths) {
    const asarFile = path.join(candidate, 'resources', 'app.asar');
    if (fs.existsSync(asarFile)) {
      return path.resolve(candidate);
    }
  }

  throw new Error(
    'Não foi possível encontrar a instalação do Antigravity. ' +
    'Defina a variável de ambiente ANTIGRAVITY_PATH ou passe o caminho explicitamente.'
  );
}

/**
 * Checks whether the target app.asar is already patched.
 */
function checkPatchState(targetPath) {
  const installPath = fs.statSync(targetPath).isDirectory()
    ? targetPath
    : path.dirname(path.dirname(targetPath));

  const asarPath = path.join(installPath, 'resources', 'app.asar');
  if (!fs.existsSync(asarPath)) {
    throw new Error(`Arquivo não encontrado: ${asarPath}`);
  }

  // Fast signature check without full extraction
  const fd = fs.openSync(asarPath, 'r');
  const buffer = Buffer.alloc(1024 * 1024); // Read first 1MB chunk
  const bytesRead = fs.readSync(fd, buffer, 0, buffer.length, 0);
  fs.closeSync(fd);

  let alreadyPatched = buffer.subarray(0, bytesRead).toString('utf8').includes(PATCH_SIGNATURE);

  // If not in first 1MB, check full file
  if (!alreadyPatched) {
    const fullBuffer = fs.readFileSync(asarPath);
    alreadyPatched = fullBuffer.includes(PATCH_SIGNATURE);
  }

  return {
    already_patched: alreadyPatched,
    asarPath,
    installPath
  };
}

/**
 * Recursively find all files matching a pattern in a directory.
 */
function findFilesByExt(dir, ext, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      findFilesByExt(filePath, ext, fileList);
    } else if (file.toLowerCase().endsWith(ext.toLowerCase())) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

/**
 * Applies pt-BR patch to Antigravity app.asar.
 */
async function applyPatch(options = {}) {
  const { customPath, force = false } = options;
  const installPath = findAntigravityPath(customPath);
  const asarPath = path.join(installPath, 'resources', 'app.asar');
  const bakPath = path.join(installPath, 'resources', 'app.asar.bak');

  const state = checkPatchState(installPath);
  if (state.already_patched && !force) {
    return {
      already_patched: true,
      asarPath,
      installPath
    };
  }

  // 1. Create pristine backup if it doesn't exist
  if (!fs.existsSync(bakPath)) {
    fs.copyFileSync(asarPath, bakPath);
  }

  // 2. Prepare temporary directory for extraction
  const tempExtractDir = path.join(os.tmpdir(), `antigravity-patch-${Date.now()}`);
  fs.mkdirSync(tempExtractDir, { recursive: true });

  try {
    // 3. Extract asar (app.asar has accompanying app.asar.unpacked)
    asar.extractAll(asarPath, tempExtractDir);

    // 4. Deep scan and direct source code replacements in dist/**/*.js and dist/**/*.html
    const sourcePatchSummary = patchSourceFiles(tempExtractDir);

    // 5. Load dictionary and runtime script
    const localesPath = path.resolve(__dirname, '..', 'injector', 'locales', 'pt-br.json');
    const runtimePath = path.resolve(__dirname, '..', 'injector', 'runtime.js');

    const localeData = JSON.parse(fs.readFileSync(localesPath, 'utf8'));
    const dictionary = localeData.translations || {};
    const runtimeScript = fs.readFileSync(runtimePath, 'utf8');

    // Build injection bundle for web UI and runtime translation
    const injectionBundle = `
/* ${PATCH_SIGNATURE} */
(function() {
  try {
    window.__ANTIGRAVITY_LOCALE_DICT__ = ${JSON.stringify(dictionary)};
    ${runtimeScript}
  } catch (err) {
    console.error('[Antigravity-ptBR] Erro ao inicializar runtime de tradução:', err);
  }
})();
`;

    // 6. Inject into preload script(s) (idempotently replacing previous patch if present)
    const preloadCandidate = path.join(tempExtractDir, 'dist', 'preload.js');
    if (fs.existsSync(preloadCandidate)) {
      let preloadContent = fs.readFileSync(preloadCandidate, 'utf8');
      const sigIndex = preloadContent.indexOf(`/* ${PATCH_SIGNATURE} */`);
      if (sigIndex !== -1) {
        preloadContent = preloadContent.substring(0, sigIndex).trimEnd();
      }
      preloadContent = `${preloadContent}\n\n${injectionBundle}`;
      fs.writeFileSync(preloadCandidate, preloadContent, 'utf8');
    }

    // 7. Inject into any HTML entrypoints found
    const htmlFiles = findFilesByExt(tempExtractDir, '.html');
    for (const htmlFile of htmlFiles) {
      let html = fs.readFileSync(htmlFile, 'utf8');
      if (!html.includes(PATCH_SIGNATURE)) {
        const scriptTag = `<script>\n${injectionBundle}\n</script>`;
        if (html.includes('</head>')) {
          html = html.replace('</head>', `${scriptTag}\n</head>`);
        } else if (html.includes('</body>')) {
          html = html.replace('</body>', `${scriptTag}\n</body>`);
        } else {
          html += `\n${scriptTag}`;
        }
        fs.writeFileSync(htmlFile, html, 'utf8');
      }
    }

    // 8. Re-pack asar atomically
    const tempAsarPath = path.join(path.dirname(asarPath), `app.asar.tmp-${Date.now()}`);
    await asar.createPackage(tempExtractDir, tempAsarPath);

    // Overwrite target asar (using copyFileSync to avoid Windows EBUSY locks during app runtime)
    try {
      fs.copyFileSync(tempAsarPath, asarPath);
      fs.unlinkSync(tempAsarPath);
    } catch (writeErr) {
      if (fs.existsSync(asarPath)) {
        fs.unlinkSync(asarPath);
      }
      fs.renameSync(tempAsarPath, asarPath);
    }

    // Invalidate asar in-memory filesystem cache
    if (typeof asar.uncacheFilesystem === 'function') {
      asar.uncacheFilesystem(asarPath);
    }
    if (typeof asar.uncacheAll === 'function') {
      asar.uncacheAll();
    }

    return {
      already_patched: false,
      success: true,
      asarPath,
      installPath,
      sourcePatches: sourcePatchSummary
    };
  } finally {
    // 9. Clean up temporary directory
    try {
      fs.rmSync(tempExtractDir, { recursive: true, force: true });
    } catch (_) {
      // Ignore temporary folder cleanup errors on Windows
    }
  }
}

// CLI execution handling
if (require.main === module) {
  const args = process.argv.slice(2);
  const isCheck = args.includes('--check');
  const isForce = args.includes('--force');
  const pathArgIdx = args.indexOf('--path');
  const customPath = pathArgIdx !== -1 ? args[pathArgIdx + 1] : undefined;

  (async () => {
    try {
      const installPath = findAntigravityPath(customPath);
      if (isCheck) {
        const state = checkPatchState(installPath);
        process.stdout.write(JSON.stringify(state));
        process.exit(state.already_patched ? 0 : 1);
      }

      const result = await applyPatch({ customPath, force: isForce });
      process.stdout.write(JSON.stringify(result));
      process.exit(0);
    } catch (err) {
      console.error(JSON.stringify({ error: err.message }));
      process.exit(2);
    }
  })();
}

module.exports = {
  PATCH_SIGNATURE,
  findAntigravityPath,
  checkPatchState,
  applyPatch
};
