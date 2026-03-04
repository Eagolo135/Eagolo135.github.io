const fs = require('node:fs');
const YAML = require('yaml');

function isYamlFile(filePath) {
  return /\.ya?ml$/i.test(filePath);
}

function parsePatch(jsonText) {
  let parsed;
  try {
    parsed = JSON.parse(jsonText);
  } catch (error) {
    throw new Error(`Model output is not valid JSON: ${error.message}`);
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Patch must be a JSON object.');
  }

  // Tolerate extra keys from LLM but require the two we need
  if (!Array.isArray(parsed.changes)) {
    throw new Error('Patch must include a "changes" array.');
  }
  if (typeof parsed.commit_message !== 'string' || parsed.commit_message.trim() === '') {
    parsed.commit_message = 'Update site content via site-agent';
  }

  // Validate and sanitize each change entry
  const cleanedChanges = [];
  parsed.changes.forEach((change, index) => {
    if (!change || typeof change !== 'object' || Array.isArray(change)) {
      throw new Error(`changes[${index}] must be an object.`);
    }

    if (!change.op) {
      throw new Error(`changes[${index}] must include op.`);
    }
    if (!['set', 'append', 'remove', 'replace_text', 'append_text', 'set_file_content'].includes(change.op)) {
      throw new Error(`changes[${index}] has unsupported op: ${change.op}`);
    }
    if ((change.op === 'set' || change.op === 'append') && !Object.prototype.hasOwnProperty.call(change, 'value')) {
      throw new Error(`changes[${index}] op ${change.op} requires value.`);
    }
    if ((change.op === 'set' || change.op === 'append' || change.op === 'remove') && !change.path) {
      throw new Error(`changes[${index}] op ${change.op} requires path.`);
    }
    if (change.op === 'replace_text' && (typeof change.find !== 'string' || typeof change.replace !== 'string')) {
      throw new Error(`changes[${index}] replace_text requires string find and replace.`);
    }
    if ((change.op === 'append_text' || change.op === 'set_file_content') && typeof change.value !== 'string') {
      throw new Error(`changes[${index}] ${change.op} requires string value.`);
    }

    // Keep only known keys
    const clean = { op: change.op };
    if (typeof change.path === 'string') clean.path = change.path;
    if (Object.prototype.hasOwnProperty.call(change, 'value')) clean.value = change.value;
    if (typeof change.file === 'string' && change.file.trim() !== '') clean.file = change.file;
    if (typeof change.find === 'string') clean.find = change.find;
    if (typeof change.replace === 'string') clean.replace = change.replace;
    cleanedChanges.push(clean);
  });

  parsed.changes = cleanedChanges;
  return parsed;
}

function parsePath(path) {
  if (typeof path !== 'string' || path.trim() === '') {
    throw new Error('Path must be a non-empty string.');
  }

  const tokens = [];
  const segments = path.split('.');
  for (const segment of segments) {
    const re = /([^\[\]]+)|(\[(\d+)\])/g;
    let match;
    while ((match = re.exec(segment)) !== null) {
      if (match[1]) {
        tokens.push(match[1]);
      } else if (typeof match[3] !== 'undefined') {
        tokens.push(Number(match[3]));
      }
    }
  }

  if (tokens.length === 0) {
    throw new Error(`Invalid path: ${path}`);
  }
  return tokens;
}

function navigateParent(root, tokens, createMissing) {
  let node = root;
  for (let i = 0; i < tokens.length - 1; i += 1) {
    const token = tokens[i];
    const nextToken = tokens[i + 1];

    if (typeof token === 'number') {
      if (!Array.isArray(node)) {
        throw new Error('Path traversal expected array but found non-array.');
      }
      if (node[token] === undefined && createMissing) {
        node[token] = typeof nextToken === 'number' ? [] : {};
      }
      node = node[token];
    } else {
      if (!node || typeof node !== 'object' || Array.isArray(node)) {
        throw new Error('Path traversal expected object but found non-object.');
      }
      if (node[token] === undefined && createMissing) {
        node[token] = typeof nextToken === 'number' ? [] : {};
      }
      node = node[token];
    }

    if (node === undefined && !createMissing) {
      return { parent: undefined, key: undefined };
    }
  }

  return { parent: node, key: tokens[tokens.length - 1] };
}

function applyChange(doc, change) {
  if (!change || typeof change !== 'object') {
    throw new Error('Each change must be an object.');
  }

  const op = change.op;
  const path = change.path;
  const tokens = parsePath(path);

  if (!['set', 'append', 'remove'].includes(op)) {
    throw new Error(`Unsupported op: ${op}`);
  }

  const { parent, key } = navigateParent(doc, tokens, op !== 'remove');
  if (parent === undefined) {
    return;
  }

  if (op === 'set') {
    if (typeof key === 'number') {
      if (!Array.isArray(parent)) {
        throw new Error(`set target at ${path} is not an array index.`);
      }
      parent[key] = change.value;
    } else {
      if (!parent || typeof parent !== 'object') {
        throw new Error(`set target at ${path} is not an object.`);
      }
      parent[key] = change.value;
    }
    return;
  }

  if (op === 'append') {
    if (!Object.prototype.hasOwnProperty.call(change, 'value')) {
      throw new Error(`append at ${path} requires value.`);
    }
    if (typeof key === 'number') {
      throw new Error(`append path must point to an array field, not an index: ${path}`);
    }
    if (parent[key] === undefined || parent[key] === null) {
      parent[key] = [];
    }
    if (!Array.isArray(parent[key])) {
      throw new Error(`append target at ${path} is not an array.`);
    }
    parent[key].push(change.value);
    return;
  }

  if (op === 'remove') {
    if (typeof key === 'number') {
      if (Array.isArray(parent)) {
        parent.splice(key, 1);
      }
    } else if (parent && typeof parent === 'object') {
      delete parent[key];
    }
  }
}

function applyPatchToFiles({ patch, defaultFile, allowedFiles }) {
  const changedYamlFiles = new Set();
  const changedTextFiles = new Set();
  const docsByFile = new Map();
  const textByFile = new Map();

  const loadDoc = (filePath) => {
    if (docsByFile.has(filePath)) {
      return docsByFile.get(filePath);
    }
    const currentText = fs.readFileSync(filePath, 'utf8');
    const parsed = YAML.parse(currentText) ?? {};
    docsByFile.set(filePath, parsed);
    return parsed;
  };

  const loadText = (filePath) => {
    if (textByFile.has(filePath)) {
      return textByFile.get(filePath);
    }
    const currentText = fs.readFileSync(filePath, 'utf8');
    textByFile.set(filePath, currentText);
    return currentText;
  };

  /**
   * Try to find the pattern in text with some flexibility:
   * 1. Exact match
   * 2. Normalized whitespace match
   * 3. Regex match (if pattern looks like regex)
   */
  const findPattern = (text, pattern) => {
    // 1. Exact match
    if (text.includes(pattern)) {
      return { found: true, match: pattern };
    }

    // 2. Normalize whitespace and try again
    const normalizedPattern = pattern.replace(/\s+/g, ' ').trim();
    const lines = text.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const normalizedLine = lines[i].replace(/\s+/g, ' ').trim();
      if (normalizedLine.includes(normalizedPattern)) {
        // Found a match - extract the actual text including original whitespace
        const lineStart = text.indexOf(lines[i]);
        return { found: true, match: lines[i], lineNumber: i + 1 };
      }
    }

    // 3. Try as regex if it contains regex-like characters
    if (/[.*+?^${}()|[\]\\]/.test(pattern)) {
      try {
        const re = new RegExp(pattern.replace(/\s+/g, '\\s*'));
        const match = text.match(re);
        if (match) {
          return { found: true, match: match[0], isRegex: true };
        }
      } catch {
        // Invalid regex, continue to failure
      }
    }

    return { found: false };
  };

  /**
   * Find similar lines in the file for error reporting
   */
  const findSimilarLines = (text, pattern, maxResults = 3) => {
    const keywords = pattern.toLowerCase().replace(/[^\w\s-]/g, ' ').split(/\s+/).filter(w => w.length > 3);
    if (keywords.length === 0) return [];

    const lines = text.split('\n');
    const scored = lines.map((line, idx) => {
      const lowerLine = line.toLowerCase();
      const score = keywords.filter(kw => lowerLine.includes(kw)).length;
      return { line: line.trim(), lineNumber: idx + 1, score };
    }).filter(item => item.score > 0 && item.line.length > 0);

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, maxResults);
  };

  const applyTextChange = (filePath, change) => {
    let text = loadText(filePath);

    if (change.op === 'replace_text') {
      const result = findPattern(text, change.find);
      if (!result.found) {
        const similar = findSimilarLines(text, change.find);
        let msg = `replace_text find pattern not found in ${filePath}`;
        if (similar.length > 0) {
          msg += `\nSimilar lines found:\n${similar.map(s => `  Line ${s.lineNumber}: ${s.line.substring(0, 80)}`).join('\n')}`;
        }
        throw new Error(msg);
      }
      text = text.replace(result.match, change.replace);
    } else if (change.op === 'append_text') {
      text = `${text}${change.value}`;
    } else if (change.op === 'set_file_content') {
      text = change.value;
    } else {
      throw new Error(`Unsupported text op: ${change.op}`);
    }

    textByFile.set(filePath, text);
  };

  for (const change of patch.changes) {
    const targetFile = typeof change.file === 'string' && change.file.trim() !== '' ? change.file : defaultFile;
    if (!allowedFiles.includes(targetFile)) {
      throw new Error(`Disallowed target file in patch: ${targetFile}`);
    }
    if (!fs.existsSync(targetFile)) {
      throw new Error(`Target file does not exist: ${targetFile}`);
    }

    if (isYamlFile(targetFile)) {
      const doc = loadDoc(targetFile);
      if (!['set', 'append', 'remove'].includes(change.op)) {
        throw new Error(`Operation ${change.op} is not allowed for YAML path edits in ${targetFile}`);
      }
      applyChange(doc, change);
      changedYamlFiles.add(targetFile);
    } else {
      if (!['replace_text', 'append_text', 'set_file_content'].includes(change.op)) {
        throw new Error(`Operation ${change.op} is not allowed for non-YAML file ${targetFile}`);
      }
      applyTextChange(targetFile, change);
      changedTextFiles.add(targetFile);
    }
  }

  const actuallyWritten = [];
  for (const filePath of changedYamlFiles) {
    const oldText = fs.readFileSync(filePath, 'utf8');
    const newText = YAML.stringify(docsByFile.get(filePath));
    if (oldText !== newText) {
      fs.writeFileSync(filePath, newText, 'utf8');
      actuallyWritten.push(filePath);
    }
  }

  for (const filePath of changedTextFiles) {
    const oldText = fs.readFileSync(filePath, 'utf8');
    const newText = textByFile.get(filePath);
    if (oldText !== newText) {
      fs.writeFileSync(filePath, newText, 'utf8');
      actuallyWritten.push(filePath);
    }
  }

  return actuallyWritten;
}

module.exports = {
  parsePatch,
  applyPatchToFiles
};