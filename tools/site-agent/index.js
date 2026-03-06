#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const readline = require('node:readline');
const { generateJsonPlan, resolveConfig } = require('./llm');
const { parsePatch, applyPatchToFiles } = require('./patch');
const { validateAll, runCommand } = require('./validate');
const { loadEnv } = require('./env');
const { analyzeRequest, buildEnhancedRequest } = require('./conversation');
const { buildDesignResearchContext } = require('./research');
const { runVisualSimilarityAudit } = require('./visual');
const {
  ensureOnMainBranch,
  ensureCleanWorktreeOrAutoSave,
  ensureOnlyAllowedFilesChanged,
  commitAndPushMain
} = require('./git');
const {
  ALLOWED_FILES,
  REDESIGN_KEYWORDS,
  RETRY_CONFIG
} = require('./config');

const MAX_RETRIES = RETRY_CONFIG.maxRetries;
const DEFAULT_ALLOWED_FILES = ALLOWED_FILES;

function resolveDefaultContentFile(cwd) {
  const candidate = path.join(cwd, '_data', 'site.yml');
  if (fs.existsSync(candidate)) {
    return '_data/site.yml';
  }
  return 'site.yml';
}

function loadPromptTemplate(name) {
  return fs.readFileSync(path.join(__dirname, 'prompts', name), 'utf8');
}

function renderPrompt(template, values) {
  let out = template;
  for (const [key, value] of Object.entries(values)) {
    out = out.replaceAll(`{{${key}}}`, value);
  }
  return out;
}

function safeCommitMessage(message) {
  const fallback = 'Update site content via site-agent';
  const finalMessage = (message || '').trim() || fallback;
  return finalMessage.slice(0, 120);
}

function formatVisualFeedback(audit) {
  if (!audit || !audit.enabled) {
    return '';
  }

  const lines = [];
  lines.push(`Visual audit average similarity: ${audit.averageSimilarity}/100`);
  for (const result of audit.comparisons || []) {
    lines.push(`- ${result.page}: ${result.similarity_score}/100`);
    if (Array.isArray(result.gaps) && result.gaps.length > 0) {
      lines.push(`  Gaps: ${result.gaps.slice(0, 3).join('; ')}`);
    }
    if (Array.isArray(result.recommendations) && result.recommendations.length > 0) {
      lines.push(`  Recommendations: ${result.recommendations.slice(0, 4).join('; ')}`);
    }
  }

  return lines.join('\n');
}

function buildAllowedFiles(cwd) {
  const fromEnv = process.env.SITE_AGENT_ALLOWED_FILES;
  if (fromEnv && fromEnv.trim()) {
    return Array.from(
      new Set(
        fromEnv
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean)
      )
    );
  }

  const requestedContent = process.env.SITE_AGENT_CONTENT_FILE || resolveDefaultContentFile(cwd);
  const themePath = process.env.SITE_AGENT_THEME_FILE;
  const files = [requestedContent, ...DEFAULT_ALLOWED_FILES.filter((file) => file !== requestedContent)];
  if (themePath && themePath.trim() !== '') {
    files.push(themePath.trim());
  }
  return Array.from(new Set(files));
}

function assertAllowedFilesExist(allowedFiles) {
  const missing = allowedFiles.filter((file) => !fs.existsSync(file));
  if (missing.length > 0) {
    throw new Error(`Missing allowed file(s): ${missing.join(', ')}`);
  }
}

function readAllowedFiles(allowedFiles) {
  const snapshot = {};
  for (const file of allowedFiles) {
    snapshot[file] = fs.readFileSync(file, 'utf8');
  }
  return snapshot;
}

function restoreSnapshot(snapshot) {
  for (const [file, content] of Object.entries(snapshot || {})) {
    fs.writeFileSync(file, content, 'utf8');
  }
}

/** Restore allowed files to their git HEAD state (undo failed patch). */
function restoreFiles(allowedFiles) {
  for (const file of allowedFiles) {
    runCommand(`git checkout HEAD -- "${file}"`);
  }
}

/** Extract top-level keys from current YAML to help prompt grounding. */
function extractTopLevelKeys(snapshot) {
  const YAML = require('yaml');
  const keys = [];
  for (const [, text] of Object.entries(snapshot)) {
    try {
      const doc = YAML.parse(text);
      if (doc && typeof doc === 'object' && !Array.isArray(doc)) {
        keys.push(Object.keys(doc).join(', '));
      }
    } catch {
      // skip
    }
  }
  return keys.join('\n');
}

function isRedesignRequest(requestText) {
  const lowered = (requestText || '').toLowerCase();
  return REDESIGN_KEYWORDS.some((keyword) => lowered.includes(keyword));
}

function evaluateRedesignPatch({ patch, defaultFile }) {
  const secondaryPages = new Set(['services.html', 'projects.html', 'contact.html', 'book.html']);
  const touchedSecondaryPages = new Set();

  let cssTouched = false;
  let homepageTouched = false;
  let layoutTouched = false;
  let themeSetCount = 0;
  let hasTypographySignal = false;
  let hasGraphicsSignal = false;
  let hasLayoutSignal = false;

  for (const change of patch.changes) {
    const targetFile = typeof change.file === 'string' && change.file.trim() !== '' ? change.file : defaultFile;

    if (targetFile === 'assets/css/style.css') cssTouched = true;
    if (targetFile === 'index.html') homepageTouched = true;
    if (targetFile === '_layouts/default.html') layoutTouched = true;
    if (secondaryPages.has(targetFile)) touchedSecondaryPages.add(targetFile);

    if ((change.op === 'set' || change.op === 'append') && typeof change.path === 'string') {
      if (change.path.startsWith('theme.')) themeSetCount += 1;
      if (change.path.startsWith('theme.typography.')) hasTypographySignal = true;
      if (
        change.path.startsWith('theme.layout.') ||
        change.path.startsWith('theme.buttons.') ||
        change.path.startsWith('theme.borders.')
      ) {
        hasLayoutSignal = true;
      }
    }

    const textSignals = [change.value, change.replace, change.find]
      .filter((part) => typeof part === 'string')
      .join('\n')
      .toLowerCase();

    if (textSignals) {
      if (
        /background-image|linear-gradient|radial-gradient|url\(|<img|<svg|illustration|graphic|pattern|texture|shape-divider/.test(
          textSignals
        )
      ) {
        hasGraphicsSignal = true;
      }
      if (/font-family|@font-face|fonts\.googleapis|display\s*:\s*grid|display\s*:\s*flex|clamp\(/.test(textSignals)) {
        hasTypographySignal = true;
        hasLayoutSignal = true;
      }
    }
  }

  const failures = [];
  if (patch.changes.length < 8) failures.push('at least 8 coordinated changes are required');
  if (!cssTouched) failures.push('must include `assets/css/style.css` visual overhaul');
  if (!homepageTouched) failures.push('must include `index.html` structural/UX updates');
  if (!layoutTouched) failures.push('must include `_layouts/default.html` for global UX/navigation changes');
  if (touchedSecondaryPages.size < 1) failures.push('must include at least one secondary page update');
  if (themeSetCount < 4) failures.push('must include at least 4 `theme.*` YAML updates');
  if (!hasTypographySignal) failures.push('must include stronger typography/font updates');
  if (!hasGraphicsSignal) failures.push('must include supporting graphics/media/visual motifs');
  if (!hasLayoutSignal) failures.push('must include layout/placement UX updates');

  if (failures.length > 0) {
    return {
      ok: false,
      reason: `Redesign patch is too shallow: ${failures.join('; ')}.`
    };
  }

  return { ok: true, reason: '' };
}

async function run() {
  const requestText = process.argv.slice(2).join(' ').trim();
  
  // Check if stdin is interactive (TTY) for clarification support
  const isInteractive = process.stdin.isTTY;
  
  await runRequest(requestText, { interactive: isInteractive });
}

/** Helper to prompt user for input */
async function promptUser(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function runRequest(requestText, options = {}) {
  const { interactive = false } = options;
  
  if (!requestText) {
    throw new Error('Usage: .\\site-agent.ps1 "Describe the update request"\n       Or run: npm run chat (for interactive mode)');
  }

  loadEnv();

  const cwd = process.cwd();
  const llmConfig = resolveConfig();
  const buildCommand = process.env.SITE_AGENT_BUILD_CMD || 'bundle exec jekyll build';
  const visualSimilarityThreshold = Number(
    process.env.SITE_AGENT_VISUAL_SIMILARITY_THRESHOLD || RETRY_CONFIG.visualSimilarityThreshold
  );
  const allowedFiles = buildAllowedFiles(cwd);
  const defaultFile = allowedFiles[0];
  const mustEnforceDeepRedesign = isRedesignRequest(requestText);
  const dryRun = ['1', 'true', 'yes'].includes((process.env.SITE_AGENT_DRY_RUN || '').toLowerCase());

  console.log(`[site-agent] Provider: ${llmConfig.provider}, Model: ${llmConfig.model}`);
  if (dryRun) {
    console.log('[site-agent] Dry run enabled: changes will be validated then restored (no commit/push).');
  }

  assertAllowedFilesExist(allowedFiles);
  if (!dryRun) {
    ensureOnMainBranch();
    const saveResult = ensureCleanWorktreeOrAutoSave({ reason: 'site-agent request' });
    if (saveResult.saved) {
      const ref = saveResult.commitHash ? ` (${saveResult.commitHash})` : '';
      console.log(`[site-agent] Auto-saved existing changes with commit/push${ref} to keep worktree clean.`);
    }
  }

  // Analyze request and optionally ask for clarification
  let finalRequest = requestText;
  if (interactive) {
    console.log('[site-agent] Analyzing your request...');
    const snapshot = readAllowedFiles(allowedFiles);
    
    try {
      const analysis = await analyzeRequest({
        request: requestText,
        fileSnapshot: snapshot,
        llmConfig
      });
      
      if (analysis.targetFiles && analysis.targetFiles.length > 0) {
        console.log(`[site-agent] Will update: ${analysis.targetFiles.join(', ')}`);
      }
      
      if (analysis.needsClarification && analysis.questions.length > 0) {
        console.log('');
        console.log('I need a bit more info to proceed:');
        
        const clarifications = [];
        for (const question of analysis.questions) {
          const answer = await promptUser(`  ${question}\n  → `);
          if (answer) {
            clarifications.push({ question, answer });
          }
        }
        
        if (clarifications.length > 0) {
          finalRequest = buildEnhancedRequest(requestText, clarifications);
          console.log('');
        }
      }
    } catch (err) {
      // If analysis fails, proceed with original request
      console.log('[site-agent] Proceeding with request...');
    }
  }

  let researchContext = null;
  try {
    researchContext = await buildDesignResearchContext(finalRequest);
    if (researchContext.enabled && researchContext.contextText) {
      console.log('[site-agent] Agentic research gathered design references.');
      finalRequest = `${finalRequest}\n\n${researchContext.contextText}`;
    }
  } catch (error) {
    console.log(`[site-agent] Research skipped: ${error.message}`);
  }

  const planTemplate = loadPromptTemplate('plan_patch.txt');
  const fixTemplate = loadPromptTemplate('fix_patch.txt');

  let lastError = '';
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt += 1) {
    const snapshot = readAllowedFiles(allowedFiles);
    const topKeys = extractTopLevelKeys(snapshot);

    const templateValues = {
      ALLOWED_FILES: allowedFiles.join(', '),
      DEFAULT_FILE: defaultFile,
      FILE_SNAPSHOT_JSON: JSON.stringify(snapshot),
      TOP_LEVEL_KEYS: topKeys,
      USER_REQUEST: finalRequest
    };

    let prompt;
    if (attempt === 1) {
      prompt = renderPrompt(planTemplate, templateValues);
    } else {
      prompt = renderPrompt(fixTemplate, { ...templateValues, VALIDATION_ERROR: lastError });
    }

    console.log(`[site-agent] Attempt ${attempt}/${MAX_RETRIES}...`);

    let raw;
    try {
      raw = await generateJsonPlan({
        provider: llmConfig.provider,
        model: llmConfig.model,
        prompt,
        apiKey: llmConfig.apiKey,
        ollamaUrl: llmConfig.ollamaUrl
      });
    } catch (err) {
      console.error(`[site-agent] LLM call failed: ${err.message}`);
      if (attempt === MAX_RETRIES) throw err;
      lastError = err.message;
      continue;
    }

    let patch;
    try {
      patch = parsePatch(raw);
    } catch (err) {
      console.error(`[site-agent] Patch parse failed: ${err.message}`);
      if (attempt === MAX_RETRIES) throw err;
      lastError = `Patch parse error: ${err.message}\nRaw model output:\n${raw}`;
      continue;
    }

    if (mustEnforceDeepRedesign) {
      const redesignCheck = evaluateRedesignPatch({ patch, defaultFile });
      if (!redesignCheck.ok) {
        console.error(`[site-agent] ${redesignCheck.reason}`);
        if (attempt === MAX_RETRIES) {
          throw new Error(redesignCheck.reason);
        }
        lastError = redesignCheck.reason;
        continue;
      }
    }

    let changedFiles;
    try {
      changedFiles = applyPatchToFiles({ patch, defaultFile, allowedFiles });
    } catch (err) {
      console.error(`[site-agent] Patch apply failed: ${err.message}`);
      if (dryRun) {
        restoreSnapshot(snapshot);
      } else {
        restoreFiles(allowedFiles);
      }
      if (attempt === MAX_RETRIES) throw err;
      lastError = `Patch apply error: ${err.message}`;
      continue;
    }

    // Safety: abort if patch touched anything outside allowed files
    if (!dryRun) {
      try {
        ensureOnlyAllowedFilesChanged(allowedFiles);
      } catch (err) {
        restoreFiles(allowedFiles);
        throw err; // hard abort, no retry
      }
    }

    if (changedFiles.length === 0) {
      lastError = 'Patch applied but produced no file changes. Use correct top-level YAML paths.';
      console.error(`[site-agent] ${lastError}`);
      if (attempt === MAX_RETRIES) throw new Error(lastError);
      continue;
    }

    console.log(`[site-agent] Changed: ${changedFiles.join(', ')}`);

    const validation = validateAll({ allowedFiles, buildCommand });
    console.log(`[site-agent] ${validation.output}`);

    if (!validation.ok) {
      if (dryRun) {
        restoreSnapshot(snapshot);
      } else {
        restoreFiles(allowedFiles);
      }
      lastError = validation.output;
      console.error(`[site-agent] Validation failed, restoring files...`);
      if (attempt === MAX_RETRIES) {
        throw new Error(`Validation failed after ${MAX_RETRIES} attempts.\n${lastError}`);
      }
      continue;
    }

    if (researchContext && researchContext.enabled && researchContext.referenceUrl) {
      try {
        console.log('[site-agent] Running visual similarity audit (screenshots + vision)...');
        const audit = await runVisualSimilarityAudit({
          siteRoot: cwd,
          referenceUrl: researchContext.referenceUrl,
          apiKey: llmConfig.apiKey,
          model: llmConfig.model,
          designGoal: requestText,
          pages: ['index.html']
        });

        if (audit.enabled) {
          console.log(`[site-agent] Visual similarity: ${audit.averageSimilarity}/100`);
          if (audit.averageSimilarity < visualSimilarityThreshold && attempt < MAX_RETRIES) {
            if (dryRun) {
              restoreSnapshot(snapshot);
            } else {
              restoreFiles(allowedFiles);
            }
            lastError = `Design similarity too low to reference target (${audit.averageSimilarity}/100, threshold ${visualSimilarityThreshold}/100).\n${formatVisualFeedback(audit)}`;
            console.error('[site-agent] Similarity below threshold, retrying with visual feedback...');
            continue;
          }
        } else {
          console.log(`[site-agent] Visual audit skipped: ${audit.reason}`);
        }
      } catch (error) {
        console.log(`[site-agent] Visual audit unavailable: ${error.message}`);
      }
    }

    if (dryRun) {
      restoreSnapshot(snapshot);
      console.log(`[site-agent] Dry run success. Validated changes: ${changedFiles.join(', ')}`);
      return;
    }

    const commitMessage = safeCommitMessage(patch.commit_message);
    const publish = commitAndPushMain({ allowedFiles, commitMessage });
    console.log(`[site-agent] Success! Pushed: ${publish.changed.join(', ')}`);
    return;
  }
}

module.exports = {
  runRequest,
  isRedesignRequest,
  evaluateRedesignPatch
};

if (require.main === module) {
  run().catch((error) => {
    console.error(`[site-agent] ERROR: ${error.message}`);
    process.exit(1);
  });
}