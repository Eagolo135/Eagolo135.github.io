const fs = require('node:fs');
const path = require('node:path');
const dotenv = require('dotenv');

function getRepoRoot() {
  return path.resolve(__dirname, '..', '..');
}

function loadEnv() {
  const repoRoot = getRepoRoot();
  const envPath = path.join(repoRoot, '.env');

  if (!fs.existsSync(envPath)) {
    throw new Error(
      'Missing .env configuration. Create a .env file with OPENAI_API_KEY and required settings.'
    );
  }

  dotenv.config({
    path: envPath,
    override: false
  });

  return { envPath, repoRoot };
}

module.exports = {
  loadEnv,
  getRepoRoot
};
