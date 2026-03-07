/**
 * Ollama LLM Provider - Concrete Strategy
 */
const { BaseLLMProvider } = require('./base-provider');
const { API_URLS, DEFAULT_MODELS } = require('../config');

class OllamaProvider extends BaseLLMProvider {
  constructor(config = {}) {
    super(config);
    this.modelName = config.model || DEFAULT_MODELS.ollama;
    this.apiUrl = config.ollamaUrl || API_URLS.ollamaDefault;
  }

  get name() {
    return 'ollama';
  }

  get model() {
    return this.modelName;
  }

  /**
   * Normalize Ollama URL to ensure /api/generate endpoint
   */
  static normalizeUrl(value) {
    const input = (value || '').trim();
    if (!input) {
      return API_URLS.ollamaDefault;
    }
    if (input.endsWith('/api/generate')) {
      return input;
    }
    return `${input.replace(/\/+$/, '')}/api/generate`;
  }

  async generate(prompt) {
    const body = {
      model: this.modelName,
      prompt,
      stream: false,
      format: 'json'
    };

    const url = OllamaProvider.normalizeUrl(this.apiUrl);
    const response = await fetch(url, {
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
}

module.exports = { OllamaProvider };
