const fs = require('node:fs');
const path = require('node:path');
const { SCREENSHOT_CONFIG, API_URLS } = require('./config');

function getChromium() {
  try {
    const { chromium } = require('playwright');
    return chromium;
  } catch (error) {
    throw new Error(
      'Playwright is required for screenshots. Install with: npm install playwright && npx playwright install chromium'
    );
  }
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

async function screenshotUrl({
  browser,
  url,
  outputPath,
  fullPage = true,
  width = SCREENSHOT_CONFIG.width,
  height = SCREENSHOT_CONFIG.height
}) {
  const page = await browser.newPage({ viewport: { width, height } });
  await page.goto(url, { waitUntil: 'networkidle', timeout: SCREENSHOT_CONFIG.timeout });
  await page.screenshot({ path: outputPath, fullPage });
  await page.close();
  return outputPath;
}

function toFileUrl(absPath) {
  let normalized = absPath.replace(/\\/g, '/');
  if (!normalized.startsWith('/')) {
    normalized = `/${normalized}`;
  }
  return `file://${normalized}`;
}

async function takeDesignScreenshots({ siteRoot, referenceUrl, localPages = ['index.html'], outputDir }) {
  const targetDir = outputDir || path.join(siteRoot, '.site-agent', 'shots');
  ensureDir(targetDir);

  const chromium = getChromium();
  const browser = await chromium.launch({ headless: true });
  const result = {
    reference: null,
    local: []
  };

  try {
    if (referenceUrl) {
      const refPath = path.join(targetDir, 'reference.png');
      await screenshotUrl({ browser, url: referenceUrl, outputPath: refPath, fullPage: true });
      result.reference = refPath;
    }

    for (const pageName of localPages) {
      const builtFile = path.join(siteRoot, '_site', pageName);
      if (!fs.existsSync(builtFile)) continue;
      const outPath = path.join(targetDir, `local-${pageName.replace(/[^a-z0-9]/gi, '_')}.png`);
      await screenshotUrl({ browser, url: toFileUrl(builtFile), outputPath: outPath, fullPage: true });
      result.local.push({ page: pageName, path: outPath });
    }
  } finally {
    await browser.close();
  }

  return result;
}

function toDataUrlFromPng(filePath) {
  const b64 = fs.readFileSync(filePath).toString('base64');
  return `data:image/png;base64,${b64}`;
}

async function compareScreenshotsWithOpenAI({ apiKey, model, referenceImagePath, localImagePath, designGoal }) {
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is required for visual comparison');
  }

  const body = {
    model,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: 'You are a strict UI visual reviewer. Compare two screenshots and return JSON only.'
      },
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `Compare the two website screenshots. Goal: ${designGoal}. Return JSON with keys: similarity_score (0-100), summary, strengths (array), gaps (array), recommendations (array).`
          },
          {
            type: 'image_url',
            image_url: {
              url: toDataUrlFromPng(referenceImagePath)
            }
          },
          {
            type: 'image_url',
            image_url: {
              url: toDataUrlFromPng(localImagePath)
            }
          }
        ]
      }
    ]
  };

  const response = await fetch(API_URLS.openai, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Visual compare failed (${response.status}): ${text}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('Visual compare returned empty content');
  }

  return JSON.parse(content);
}

async function runVisualSimilarityAudit({
  siteRoot,
  referenceUrl,
  apiKey,
  model,
  designGoal,
  pages = ['index.html']
}) {
  if (!referenceUrl) {
    return { enabled: false, reason: 'No reference URL provided' };
  }

  const shots = await takeDesignScreenshots({
    siteRoot,
    referenceUrl,
    localPages: pages,
    outputDir: path.join(siteRoot, '.site-agent', 'shots')
  });

  if (!shots.reference || shots.local.length === 0) {
    return {
      enabled: false,
      reason: 'Could not capture screenshots'
    };
  }

  const comparisons = [];
  for (const local of shots.local) {
    const compare = await compareScreenshotsWithOpenAI({
      apiKey,
      model,
      referenceImagePath: shots.reference,
      localImagePath: local.path,
      designGoal
    });

    comparisons.push({
      page: local.page,
      screenshot: local.path,
      ...compare
    });
  }

  const avg = Math.round(
    comparisons.reduce((sum, item) => sum + (Number(item.similarity_score) || 0), 0) /
      Math.max(comparisons.length, 1)
  );

  return {
    enabled: true,
    referenceScreenshot: shots.reference,
    comparisons,
    averageSimilarity: avg
  };
}

module.exports = {
  takeDesignScreenshots,
  runVisualSimilarityAudit
};
