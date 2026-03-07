/**
 * OpenAI LLM Provider - Concrete Strategy
 */
const { BaseLLMProvider } = require('./base-provider');
const { API_URLS, DEFAULT_MODELS } = require('../config');

class OpenAIProvider extends BaseLLMProvider {
  constructor(config = {}) {
    super(config);
    this.apiKey = config.apiKey || process.env.OPENAI_API_KEY || '';
    this.modelName = config.model || DEFAULT_MODELS.openai;
    this.apiUrl = config.apiUrl || API_URLS.openai;
  }

  get name() {
    return 'openai';
  }

  get model() {
    return this.modelName;
  }

  async generate(prompt) {
    if (!this.apiKey) {
      throw new Error(
        'Missing OPENAI_API_KEY. Set it as an environment variable:\n' +
        '  $env:OPENAI_API_KEY = "sk-..."'
      );
    }

    const body = {
      model: this.modelName,
      messages: [
        {
          role: 'system',
          content: 'You are a precise JSON patch generator. Output raw JSON only. No markdown fences. No prose.'
        },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' }
    };

    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
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
}

module.exports = { OpenAIProvider };
