/**
 * LLM Provider Factory
 * Creates the appropriate provider based on configuration (Strategy Pattern)
 */
const { OpenAIProvider } = require('./openai-provider');
const { OllamaProvider } = require('./ollama-provider');
const { DEFAULT_MODELS } = require('../config');

/**
 * Registry of available providers
 * Add new providers here - no need to modify other code (OCP)
 */
const PROVIDERS = {
  openai: OpenAIProvider,
  ollama: OllamaProvider
};

/**
 * Create an LLM provider instance based on configuration
 * @param {Object} config - Provider configuration
 * @param {string} config.provider - Provider name ('openai' or 'ollama')
 * @param {string} config.model - Model name
 * @param {string} config.apiKey - API key (for OpenAI)
 * @param {string} config.ollamaUrl - Ollama URL (for Ollama)
 * @returns {BaseLLMProvider}
 */
function createProvider(config = {}) {
  const providerName = (config.provider || 'openai').toLowerCase();
  const ProviderClass = PROVIDERS[providerName];

  if (!ProviderClass) {
    const available = Object.keys(PROVIDERS).join(', ');
    throw new Error(`Unknown provider "${providerName}". Available: ${available}`);
  }

  return new ProviderClass(config);
}

/**
 * Resolve configuration from environment variables
 * @returns {Object} Configuration object
 */
function resolveProviderConfig() {
  const provider = (process.env.SITE_AGENT_PROVIDER || 'openai').toLowerCase();
  let model;

  if (provider === 'ollama') {
    model = process.env.SITE_AGENT_MODEL || process.env.OPENAI_MODEL || DEFAULT_MODELS.ollama;
  } else {
    model = process.env.OPENAI_MODEL || process.env.SITE_AGENT_MODEL || DEFAULT_MODELS.openai;
  }

  const apiKey = process.env.OPENAI_API_KEY || '';
  const ollamaUrl = process.env.SITE_AGENT_OLLAMA_URL || process.env.OLLAMA_URL || '';

  return { provider, model, apiKey, ollamaUrl };
}

/**
 * Get list of available provider names
 * @returns {string[]}
 */
function getAvailableProviders() {
  return Object.keys(PROVIDERS);
}

module.exports = {
  createProvider,
  resolveProviderConfig,
  getAvailableProviders,
  PROVIDERS
};
