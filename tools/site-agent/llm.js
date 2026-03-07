/**
 * LLM client supporting OpenAI API and Ollama.
 * Default: OpenAI (requires OPENAI_API_KEY env var).
 * Set SITE_AGENT_PROVIDER=ollama to use local Ollama instead.
 * 
 * Uses Strategy Pattern via providers/ for extensibility.
 * To add a new provider, create a new provider class and register it in providers/index.js
 */
const { createProvider, resolveProviderConfig } = require('./providers');

/**
 * Generate a JSON plan from the given prompt using the configured provider
 * @param {Object} options
 * @param {string} options.provider - Provider name ('openai' or 'ollama')
 * @param {string} options.model - Model name
 * @param {string} options.prompt - The prompt to send
 * @param {string} options.apiKey - API key (for OpenAI)
 * @param {string} options.ollamaUrl - Ollama URL (for Ollama)
 * @returns {Promise<string>} - The raw JSON response
 */
async function generateJsonPlan({ provider, model, prompt, apiKey, ollamaUrl }) {
  const llmProvider = createProvider({ provider, model, apiKey, ollamaUrl });
  return llmProvider.generate(prompt);
}

/**
 * Resolve LLM configuration from environment variables
 * @returns {Object} Configuration with provider, model, apiKey, ollamaUrl
 */
function resolveConfig() {
  return resolveProviderConfig();
}

module.exports = {
  generateJsonPlan,
  resolveConfig,
  // Re-export for direct provider access if needed
  createProvider
};
