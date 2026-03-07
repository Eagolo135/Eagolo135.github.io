const fs = require('node:fs');
const path = require('node:path');
const { loadEnv } = require('./env');
const { runRequest, buildAllowedFiles } = require('./index');
const { validateAll } = require('./validate');
const { resolveConfig } = require('./llm');
const { capturePageScreenshot, compareImagesWithOpenAI } = require('./visual');

function withTemporaryEnv(overrides, fn) {
  const previous = new Map();
  const keys = Object.keys(overrides || {});

  for (const key of keys) {
    previous.set(key, process.env[key]);
    const value = overrides[key];
    if (value === null || value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = String(value);
    }
  }

  return Promise.resolve()
    .then(fn)
    .finally(() => {
      for (const key of keys) {
        const value = previous.get(key);
        if (value === undefined) {
          delete process.env[key];
        } else {
          process.env[key] = value;
        }
      }
    });
}

async function planChange(request, options = {}) {
  loadEnv();
  const dryRun = options.dryRun !== false;

  const result = await withTemporaryEnv(
    {
      SITE_AGENT_DRY_RUN: dryRun ? '1' : '0'
    },
    async () => {
      return runRequest(request, {
        interactive: false,
        dryRun,
        noPublish: true
      });
    }
  );

  return {
    ok: true,
    mode: 'plan',
    request,
    dryRun,
    changedFiles: result?.changedFiles || [],
    validation: result?.validation || null,
    attempts: result?.attempts || 0
  };
}

async function applyChange(request, options = {}) {
  loadEnv();
  const publish = Boolean(options.publish);

  const result = await withTemporaryEnv(
    {
      SITE_AGENT_DRY_RUN: null
    },
    async () => {
      return runRequest(request, {
        interactive: false,
        dryRun: false,
        noPublish: !publish
      });
    }
  );

  return {
    ok: true,
    mode: publish ? 'publish' : 'local_apply',
    request,
    changedFiles: result?.changedFiles || [],
    validation: result?.validation || null,
    attempts: result?.attempts || 0
  };
}

async function addProject({
  title,
  description,
  tags = [],
  link,
  image,
  publish = false
}) {
  const request = [
    'Add one new project to the portfolio.',
    `Title: ${title}`,
    `Description: ${description}`,
    `Tags: ${Array.isArray(tags) ? tags.join(', ') : ''}`,
    `Link: ${link || ''}`,
    `Image: ${image || ''}`
  ].join('\n');

  return applyChange(request, { publish });
}

function validateSite() {
  loadEnv();
  const allowedFiles = buildAllowedFiles(process.cwd());
  const buildCommand = process.env.SITE_AGENT_BUILD_CMD || 'bundle exec jekyll build';
  const result = validateAll({ allowedFiles, buildCommand });

  return {
    ok: result.ok,
    output: result.output,
    buildSkipped: Boolean(result.buildSkipped)
  };
}

async function screenshotPage({
  page = 'index.html',
  url,
  outputPath,
  fullPage = true
} = {}) {
  loadEnv();

  if (!url) {
    const validation = validateSite();
    if (!validation.ok) {
      throw new Error(`Cannot capture local page screenshot because validation/build failed:\n${validation.output}`);
    }
  }

  const siteRoot = process.cwd();
  const screenshotPath = await capturePageScreenshot({
    siteRoot,
    page,
    url,
    outputPath,
    fullPage
  });

  return {
    ok: true,
    page,
    url: url || null,
    screenshotPath
  };
}

function resolveReferenceImagePath(referenceImagePath) {
  if (!referenceImagePath) {
    throw new Error('referenceImagePath is required.');
  }
  const resolved = path.resolve(referenceImagePath);
  if (!fs.existsSync(resolved)) {
    throw new Error(`Reference image not found: ${resolved}`);
  }
  return resolved;
}

async function recreateFromImage({
  referenceImagePath,
  targetPage = 'index.html',
  maxIterations = 5,
  targetSimilarity = 98,
  publish = false,
  baseInstruction = ''
} = {}) {
  loadEnv();

  const referencePath = resolveReferenceImagePath(referenceImagePath);
  const siteRoot = process.cwd();
  const llmConfig = resolveConfig();

  if (!llmConfig.apiKey) {
    throw new Error('OPENAI_API_KEY is required for recreateFromImage comparisons.');
  }

  const iterations = [];
  let bestScore = -1;
  let bestScreenshot = null;

  for (let iteration = 1; iteration <= Math.max(1, maxIterations); iteration += 1) {
    const candidatePath = path.join(siteRoot, '.site-agent', 'shots', `recreate-candidate-${iteration}.png`);
    const screenshot = await screenshotPage({
      page: targetPage,
      outputPath: candidatePath,
      fullPage: true
    });

    const compare = await compareImagesWithOpenAI({
      apiKey: llmConfig.apiKey,
      model: llmConfig.model,
      referenceImagePath: referencePath,
      candidateImagePath: screenshot.screenshotPath,
      goal: `Recreate ${targetPage} to visually match the reference image as closely as possible.`
    });

    const similarity = Number(compare.similarity_score) || 0;
    if (similarity > bestScore) {
      bestScore = similarity;
      bestScreenshot = screenshot.screenshotPath;
    }

    const record = {
      iteration,
      similarity,
      summary: compare.summary || '',
      gaps: Array.isArray(compare.gaps) ? compare.gaps : [],
      recommendations: Array.isArray(compare.recommendations) ? compare.recommendations : [],
      screenshotPath: screenshot.screenshotPath
    };
    iterations.push(record);

    if (similarity >= targetSimilarity) {
      return {
        ok: true,
        converged: true,
        targetSimilarity,
        bestScore,
        iterations,
        bestScreenshot
      };
    }

    const improvementRequest = [
      `Recreate ${targetPage} to match the provided reference image as closely as possible.`,
      baseInstruction ? `Additional instruction: ${baseInstruction}` : '',
      `Current similarity score: ${similarity}/100.`,
      `Top gaps: ${(record.gaps || []).slice(0, 6).join('; ') || 'none provided'}.`,
      `Recommendations: ${(record.recommendations || []).slice(0, 8).join('; ') || 'none provided'}.`,
      'Make major structural, spacing, typography, visual hierarchy, and component-level changes as needed to match the reference more closely.',
      `Focus on ${targetPage} first, but update shared layout/styles if needed.`
    ]
      .filter(Boolean)
      .join('\n');

    await applyChange(improvementRequest, { publish });
  }

  return {
    ok: true,
    converged: false,
    targetSimilarity,
    bestScore,
    iterations,
    bestScreenshot,
    message: 'Reached max iterations before hitting target similarity.'
  };
}

module.exports = {
  planChange,
  applyChange,
  addProject,
  validateSite,
  screenshotPage,
  recreateFromImage
};
