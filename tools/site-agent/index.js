#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const { generateJsonPlan, DEFAULT_OLLAMA_URL } = require('./ollama');
const { parsePatch, applyPatchToFiles } = require('./patch');
const { validateAll } = require('./validate');
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

function loadPromptTemplate(promptPath) {
  return fs.readFileSync(promptPath, 'utf8');
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

async function run() {
  const requestText = process.argv.slice(2).join(' ').trim();
  if (!requestText) {
    throw new Error('Usage: .\\site-agent.ps1 "Describe the update request"');
  }

  const cwd = process.cwd();
  const model = process.env.SITE_AGENT_MODEL || 'qwen2.5:7b';
  const ollamaUrl = process.env.SITE_AGENT_OLLAMA_URL || DEFAULT_OLLAMA_URL;
  const buildCommand = process.env.SITE_AGENT_BUILD_CMD || 'bundle exec jekyll build';
  const allowedFiles = buildAllowedFiles(cwd);
  const defaultFile = allowedFiles[0];

  assertAllowedFilesExist(allowedFiles);
  ensureOnMainBranch();
  ensureCleanWorktree();

  const planTemplate = loadPromptTemplate(path.join(__dirname, 'prompts', 'plan_patch.txt'));
  const fixTemplate = loadPromptTemplate(path.join(__dirname, 'prompts', 'fix_patch.txt'));

  let lastError = '';
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt += 1) {
    const snapshot = readAllowedFiles(allowedFiles);
    const prompt = attempt === 1
      ? renderPrompt(planTemplate, {
        ALLOWED_FILES: allowedFiles.join(', '),
        DEFAULT_FILE: defaultFile,
        FILE_SNAPSHOT_JSON: JSON.stringify(snapshot),
        USER_REQUEST: requestText
      })
      : renderPrompt(fixTemplate, {
        ALLOWED_FILES: allowedFiles.join(', '),
        DEFAULT_FILE: defaultFile,
        FILE_SNAPSHOT_JSON: JSON.stringify(snapshot),
        USER_REQUEST: requestText,
        VALIDATION_ERROR: lastError
      });

    console.log(`[site-agent] Attempt ${attempt}/${MAX_RETRIES} using model ${model}`);
    const raw = await generateJsonPlan({ model, prompt, url: ollamaUrl });
    const patch = parsePatch(raw);

    const changedFiles = applyPatchToFiles({
      patch,
      defaultFile,
      allowedFiles
    });

    ensureOnlyAllowedFilesChanged(allowedFiles);

    if (changedFiles.length === 0) {
      lastError = 'Patch applied but produced no file changes.';
      if (attempt === MAX_RETRIES) {
        throw new Error(lastError);
      }
      continue;
    }

    const validation = validateAll({
      allowedFiles,
      buildCommand
    });

    console.log(`[site-agent] ${validation.output}`);
    if (!validation.ok) {
      lastError = validation.output;
      if (attempt === MAX_RETRIES) {
        throw new Error(`Validation failed after ${MAX_RETRIES} attempts.\n${lastError}`);
      }
      continue;
    }

    const commitMessage = safeCommitMessage(patch.commit_message);
    const publish = commitAndPushMain({
      allowedFiles,
      commitMessage
    });

    console.log(`[site-agent] Success. Changed files: ${publish.changed.join(', ')}`);
    return;
  }
}

run().catch((error) => {
  console.error(`[site-agent] ERROR: ${error.message}`);
  process.exit(1);
});