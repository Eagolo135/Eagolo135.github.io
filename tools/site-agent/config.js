/**
 * Centralized configuration for site-agent
 * Single source of truth for all shared constants
 */

/**
 * Files that site-agent is allowed to modify
 */
const ALLOWED_FILES = [
  '_data/site.yml',
  'assets/css/style.css',
  '_layouts/default.html',
  'index.html',
  'services.html',
  'projects.html',
  'contact.html',
  'book.html'
];

/**
 * Keywords that trigger full redesign mode with stricter validation
 */
const REDESIGN_KEYWORDS = [
  'redesign',
  'makeover',
  'rework',
  'modernize',
  'modernise',
  'totally different',
  'different site',
  'advanced ui',
  'advanced ux',
  'feel like a different site'
];

/**
 * Retry and validation settings
 */
const RETRY_CONFIG = {
  maxRetries: 3,
  visualSimilarityThreshold: 72
};

/**
 * Screenshot/visual audit settings
 */
const SCREENSHOT_CONFIG = {
  width: 1440,
  height: 2200,
  timeout: 45000
};

/**
 * API endpoints
 */
const API_URLS = {
  openai: 'https://api.openai.com/v1/chat/completions',
  ollamaDefault: 'http://localhost:11434/api/generate'
};

/**
 * Default model names by provider
 */
const DEFAULT_MODELS = {
  openai: 'gpt-5-mini',
  ollama: 'llama3.2:1b'
};

module.exports = {
  ALLOWED_FILES,
  REDESIGN_KEYWORDS,
  RETRY_CONFIG,
  SCREENSHOT_CONFIG,
  API_URLS,
  DEFAULT_MODELS
};
