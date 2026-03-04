const fs = require('node:fs');
const { spawnSync } = require('node:child_process');
const YAML = require('yaml');

function isYamlFile(filePath) {
  return /\.ya?ml$/i.test(filePath);
}

function runCommand(command, options = {}) {
  const result = spawnSync(command, {
    shell: true,
    encoding: 'utf8',
    cwd: options.cwd || process.cwd()
  });

  const output = `${result.stdout || ''}${result.stderr || ''}`;
  return {
    ok: result.status === 0,
    output,
    status: result.status
  };
}

function validateYamlFiles(filePaths) {
  const yamlFiles = filePaths.filter(isYamlFile);
  for (const filePath of yamlFiles) {
    const text = fs.readFileSync(filePath, 'utf8');
    try {
      YAML.parse(text);
    } catch (error) {
      return {
        ok: false,
        output: `YAML parse failed for ${filePath}: ${error.message}`,
        buildSkipped: true
      };
    }
  }

  return { ok: true, output: 'YAML parse validation passed.', buildSkipped: true };
}

function isBundleAvailable() {
  const result = runCommand('bundle --version');
  return result.ok;
}

function validateAll({ allowedFiles, buildCommand }) {
  const yamlCheck = validateYamlFiles(allowedFiles);
  if (!yamlCheck.ok) {
    return yamlCheck;
  }

  if (!isBundleAvailable()) {
    return {
      ok: true,
      output: `${yamlCheck.output}\nWarning: bundle was not found, so Jekyll build was skipped.`,
      buildSkipped: true
    };
  }

  const build = runCommand(buildCommand);
  if (!build.ok) {
    return {
      ok: false,
      output: `${yamlCheck.output}\nJekyll build failed:\n${build.output}`,
      buildSkipped: false
    };
  }

  return {
    ok: true,
    output: `${yamlCheck.output}\nJekyll build passed.`,
    buildSkipped: false
  };
}

module.exports = {
  validateAll,
  runCommand
};