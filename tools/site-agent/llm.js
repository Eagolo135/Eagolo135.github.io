/**
 * LLM client supporting OpenAI API and Ollama.
 * Default: OpenAI (requires OPENAI_API_KEY env var).
 * Set SITE_AGENT_PROVIDER=ollama to use local Ollama instead.
 */

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';
const OLLAMA_URL = 'http://localhost:11434/api/generate';

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
    response_format: { type: 'json_object' },
    temperature: 0.1
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
    model = process.env.SITE_AGENT_MODEL || process.env.OPENAI_MODEL || 'llama3.2:1b';
  } else {
    model = process.env.OPENAI_MODEL || process.env.SITE_AGENT_MODEL || 'gpt-5-mini';
  }
  const apiKey = process.env.OPENAI_API_KEY || '';
  const ollamaUrl = normalizeOllamaGenerateUrl(process.env.SITE_AGENT_OLLAMA_URL || process.env.OLLAMA_URL || OLLAMA_URL);
  return { provider, model, apiKey, ollamaUrl };
}

module.exports = {
  generateJsonPlan,
  resolveConfig
};
