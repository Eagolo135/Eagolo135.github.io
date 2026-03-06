/**
 * LLM client supporting OpenAI API and Ollama.
 * Default: OpenAI (requires OPENAI_API_KEY env var).
 * Set SITE_AGENT_PROVIDER=ollama to use local Ollama instead.
 */
const { API_URLS, DEFAULT_MODELS } = require('./config');

const OPENAI_URL = API_URLS.openai;
const OLLAMA_URL = API_URLS.ollamaDefault;

function normalizeOllamaGenerateUrl(value) {
  const input = (value || '').trim();
  if (!input) {
    return OLLAMA_URL;
  }
  if (input.endsWith('/api/generate')) {
    return input;
  }
  return `${input.replace(/\/+$/, '')}/api/generate`;
}

async function callOpenAI({ model, prompt, apiKey }) {
  if (!apiKey) {
    throw new Error(
      'Missing OPENAI_API_KEY. Set it as an environment variable:\n' +
      '  $env:OPENAI_API_KEY = "sk-..."'
    );
  }

  const body = {
    model,
    messages: [
      {
        role: 'system',
        content: 'You are a precise JSON patch generator. Output raw JSON only. No markdown fences. No prose.'
      },
      { role: 'user', content: prompt }
    ],
    response_format: { type: 'json_object' }
  };

  const response = await fetch(OPENAI_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenAI API error (${response.status}): ${text}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (typeof content !== 'string') {
    throw new Error('Unexpected OpenAI response shape.');
  }
  return content;
}

async function callOllama({ model, prompt, url }) {
  const body = {
    model,
    prompt,
    stream: false,
    format: 'json'
  };

  const response = await fetch(url || OLLAMA_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Ollama request failed (${response.status}): ${text}`);
  }

  const data = await response.json();
  if (typeof data.response !== 'string') {
    throw new Error('Unexpected Ollama response shape.');
  }
  return data.response;
}

async function generateJsonPlan({ provider, model, prompt, apiKey, ollamaUrl }) {
  if (provider === 'ollama') {
    return callOllama({ model, prompt, url: ollamaUrl });
  }
  return callOpenAI({ model, prompt, apiKey });
}

function resolveConfig() {
  const provider = (process.env.SITE_AGENT_PROVIDER || 'openai').toLowerCase();
  let model;
  if (provider === 'ollama') {
    model = process.env.SITE_AGENT_MODEL || process.env.OPENAI_MODEL || DEFAULT_MODELS.ollama;
  } else {
    model = process.env.OPENAI_MODEL || process.env.SITE_AGENT_MODEL || DEFAULT_MODELS.openai;
  }
  const apiKey = process.env.OPENAI_API_KEY || '';
  const ollamaUrl = normalizeOllamaGenerateUrl(process.env.SITE_AGENT_OLLAMA_URL || process.env.OLLAMA_URL || OLLAMA_URL);
  return { provider, model, apiKey, ollamaUrl };
}

module.exports = {
  generateJsonPlan,
  resolveConfig
};
