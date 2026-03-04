const { runCommand } = require('./validate');

function getCurrentBranch() {
  const result = runCommand('git rev-parse --abbrev-ref HEAD');
  if (!result.ok) {
    throw new Error(`Unable to determine git branch:\n${result.output}`);
  }
  return result.output.trim();
}

function ensureOnMainBranch() {
  const branch = getCurrentBranch();
  if (branch !== 'main') {
    throw new Error(`site-agent requires main branch. Current branch: ${branch}`);
  }
}

function getPorcelainStatus() {
  const result = runCommand('git status --porcelain');
  if (!result.ok) {
    throw new Error(`Unable to read git status:\n${result.output}`);
  }

  return result.output
    .split('\n')
    .map((line) => line.trimEnd())
    .filter((line) => line.length > 0);
}

function parseChangedPaths(statusLines) {
  const paths = [];
  for (const line of statusLines) {
    const body = line.slice(3);
    if (body.includes(' -> ')) {
      const parts = body.split(' -> ');
      paths.push(parts[0], parts[1]);
    } else {
      paths.push(body);
    }
  }
  return paths;
}

function ensureCleanWorktree() {
  const lines = getPorcelainStatus();
  if (lines.length > 0) {
    throw new Error(`Working tree must be clean before running site-agent.\n${lines.join('\n')}`);
  }
}

function ensureCleanWorktreeOrAutoSave({ reason = 'site-agent run' } = {}) {
  const lines = getPorcelainStatus();
  if (lines.length === 0) {
    return {
      saved: false,
      commitHash: null,
      statusLines: []
    };
  }

  const timestamp = new Date().toISOString();
  const label = `site-agent auto-save before run (${reason}) ${timestamp}`;

  const add = runCommand('git add -A');
  if (!add.ok) {
    throw new Error(`Failed to stage changes for auto-save:\n${add.output}`);
  }

  const commit = runCommand(`git commit -m "${label.replace(/"/g, '\\"')}"`);
  if (!commit.ok) {
    throw new Error(`Failed to commit changes for auto-save:\n${commit.output}`);
  }

  const push = runCommand('git push origin main');
  if (!push.ok) {
    throw new Error(`Failed to push auto-save commit:\n${push.output}`);
  }

  const verify = getPorcelainStatus();
  if (verify.length > 0) {
    throw new Error(
      'Auto-save attempted, but working tree is still not clean.\n' +
      verify.join('\n')
    );
  }

  const head = runCommand('git rev-parse --short HEAD');
  const commitHash = head.ok ? head.output.trim() : null;

  return {
    saved: true,
    commitHash,
    statusLines: lines
  };
}

function ensureOnlyAllowedFilesChanged(allowedFiles) {
  const lines = getPorcelainStatus();
  const changedPaths = parseChangedPaths(lines);
  const disallowed = changedPaths.filter((path) => !allowedFiles.includes(path));
  if (disallowed.length > 0) {
    throw new Error(`Detected changes outside allowed files: ${disallowed.join(', ')}`);
  }
  return changedPaths;
}

function commitAndPushMain({ allowedFiles, commitMessage }) {
  const changed = ensureOnlyAllowedFilesChanged(allowedFiles);
  if (changed.length === 0) {
    throw new Error('No changes detected to commit.');
  }

  const add = runCommand(`git add ${allowedFiles.map((file) => `"${file}"`).join(' ')}`);
  if (!add.ok) {
    throw new Error(`git add failed:\n${add.output}`);
  }

  const escapedMessage = commitMessage.replace(/"/g, '\\"');
  const commit = runCommand(`git commit -m "${escapedMessage}"`);
  if (!commit.ok) {
    throw new Error(`git commit failed:\n${commit.output}`);
  }

  const push = runCommand('git push origin main');
  if (!push.ok) {
    throw new Error(`git push failed:\n${push.output}`);
  }

  return {
    changed,
    output: `${commit.output}\n${push.output}`.trim()
  };
}

module.exports = {
  ensureOnMainBranch,
  ensureCleanWorktree,
  ensureCleanWorktreeOrAutoSave,
  ensureOnlyAllowedFilesChanged,
  commitAndPushMain
};