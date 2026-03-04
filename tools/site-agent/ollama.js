const DEFAULT_OLLAMA_URL = 'http://localhost:11434/api/generate';

async function generateJsonPlan({ model, prompt, url = DEFAULT_OLLAMA_URL }) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      prompt,
      stream: false,
      format: 'json'
    })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Ollama request failed (${response.status}): ${text}`);
  }

  const payload = await response.json();
  if (!payload || typeof payload.response !== 'string') {
    throw new Error('Invalid Ollama response shape: missing response field.');
  }

  return payload.response;
}

module.exports = {
  generateJsonPlan,
  DEFAULT_OLLAMA_URL
};