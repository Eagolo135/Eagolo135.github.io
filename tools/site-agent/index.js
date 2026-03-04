#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const { generateJsonPlan, resolveConfig } = require('./llm');
const { parsePatch, applyPatchToFiles } = require('./patch');
const { validateAll, runCommand } = require('./validate');
const {
  ensureOnMainBranch,
  ensureCleanWorktree,
  ensureOnlyAllowedFilesChanged,
  commitAndPushMain
} = require('./git');

const MAX_RETRIES = 3;

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

function buildAllowedFiles(cwd) {
  const requestedContent = process.env.SITE_AGENT_CONTENT_FILE || resolveDefaultContentFile(cwd);
  const themePath = process.env.SITE_AGENT_THEME_FILE;
  const files = [requestedContent];
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

async function run() {
  const requestText = process.argv.slice(2).join(' ').trim();
  if (!requestText) {
    throw new Error('Usage: .\\site-agent.ps1 "Describe the update request"');
  }

  const cwd = process.cwd();
  const llmConfig = resolveConfig();
  const buildCommand = process.env.SITE_AGENT_BUILD_CMD || 'bundle exec jekyll build';
  const allowedFiles = buildAllowedFiles(cwd);
  const defaultFile = allowedFiles[0];

  console.log(`[site-agent] Provider: ${llmConfig.provider}, Model: ${llmConfig.model}`);
  console.log(`[site-agent] Content file: ${defaultFile}`);

  assertAllowedFilesExist(allowedFiles);
  ensureOnMainBranch();
  ensureCleanWorktree();

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
      USER_REQUEST: requestText
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

    let changedFiles;
    try {
      changedFiles = applyPatchToFiles({ patch, defaultFile, allowedFiles });
    } catch (err) {
      console.error(`[site-agent] Patch apply failed: ${err.message}`);
      restoreFiles(allowedFiles);
      if (attempt === MAX_RETRIES) throw err;
      lastError = `Patch apply error: ${err.message}`;
      continue;
    }

    // Safety: abort if patch touched anything outside allowed files
    try {
      ensureOnlyAllowedFilesChanged(allowedFiles);
    } catch (err) {
      restoreFiles(allowedFiles);
      throw err; // hard abort, no retry
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
      restoreFiles(allowedFiles);
      lastError = validation.output;
      console.error(`[site-agent] Validation failed, restoring files...`);
      if (attempt === MAX_RETRIES) {
        throw new Error(`Validation failed after ${MAX_RETRIES} attempts.\n${lastError}`);
      }
      continue;
    }

    const commitMessage = safeCommitMessage(patch.commit_message);
    const publish = commitAndPushMain({ allowedFiles, commitMessage });
    console.log(`[site-agent] Success! Pushed: ${publish.changed.join(', ')}`);
    return;
  }
}

run().catch((error) => {
  console.error(`[site-agent] ERROR: ${error.message}`);
  process.exit(1);
});