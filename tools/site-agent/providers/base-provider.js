/**
 * Base LLM Provider - Abstract Strategy
 * All LLM providers must implement this interface
 */
class BaseLLMProvider {
  constructor(config = {}) {
    if (new.target === BaseLLMProvider) {
      throw new Error('BaseLLMProvider is abstract and cannot be instantiated directly');
    }
    this.config = config;
  }

  /**
   * Generate a JSON plan from the given prompt
   * @param {string} prompt - The prompt to send to the LLM
   * @returns {Promise<string>} - The raw JSON response string
   */
  async generate(prompt) {
    throw new Error('generate() must be implemented by subclass');
  }

  /**
   * Get the provider name for logging
   * @returns {string}
   */
  get name() {
    throw new Error('name getter must be implemented by subclass');
  }

  /**
   * Get the model being used
   * @returns {string}
   */
  get model() {
    return this.config.model || 'unknown';
  }
}

module.exports = { BaseLLMProvider };
