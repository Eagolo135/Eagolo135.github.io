function createYamlOperation(op) {
  const operations = {
    set: applySetOperation,
    append: applyAppendOperation,
    remove: applyRemoveOperation
  };

  const operation = operations[op];
  if (!operation) {
    throw new Error(`Unsupported YAML operation: ${op}`);
  }

  return operation;
}

function createTextOperation(op) {
  const operations = {
    replace_text: applyReplaceTextOperation,
    append_text: applyAppendTextOperation,
    set_file_content: applySetFileContentOperation
  };

  const operation = operations[op];
  if (!operation) {
    throw new Error(`Unsupported text operation: ${op}`);
  }

  return operation;
}

function applySetOperation({ parent, key, path, change }) {
  if (typeof key === 'number') {
    if (!Array.isArray(parent)) {
      throw new Error(`set target at ${path} is not an array index.`);
    }
    parent[key] = change.value;
    return;
  }

  if (!parent || typeof parent !== 'object') {
    throw new Error(`set target at ${path} is not an object.`);
  }

  parent[key] = change.value;
}

function applyAppendOperation({ parent, key, path, change }) {
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
}

function applyRemoveOperation({ parent, key }) {
  if (typeof key === 'number') {
    if (Array.isArray(parent)) {
      parent.splice(key, 1);
    }
    return;
  }

  if (parent && typeof parent === 'object') {
    delete parent[key];
  }
}

function applyReplaceTextOperation({ text, change, filePath, findPattern, findSimilarLines }) {
  const result = findPattern(text, change.find);
  if (!result.found) {
    const similar = findSimilarLines(text, change.find);
    let msg = `replace_text find pattern not found in ${filePath}`;
    if (similar.length > 0) {
      msg += `\nSimilar lines found:\n${similar.map(s => `  Line ${s.lineNumber}: ${s.line.substring(0, 80)}`).join('\n')}`;
    }
    throw new Error(msg);
  }
  return text.replace(result.match, change.replace);
}

function applyAppendTextOperation({ text, change }) {
  return `${text}${change.value}`;
}

function applySetFileContentOperation({ change }) {
  return change.value;
}

module.exports = {
  createYamlOperation,
  createTextOperation
};
