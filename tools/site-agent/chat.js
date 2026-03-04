#!/usr/bin/env node
const readline = require('node:readline');
const { runRequest } = require('./index');

async function ask(rl, prompt) {
  return new Promise((resolve) => rl.question(prompt, resolve));
}

async function main() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  console.log('site-agent chat started. Type your request, or "exit" to quit.');

  while (true) {
    const input = (await ask(rl, '> ')).trim();
    if (!input) {
      continue;
    }
    if (input.toLowerCase() === 'exit' || input.toLowerCase() === 'quit') {
      break;
    }

    try {
      await runRequest(input);
    } catch (error) {
      console.error(`[site-agent] ERROR: ${error.message}`);
    }
  }

  rl.close();
}

main().catch((error) => {
  console.error(`[site-agent] ERROR: ${error.message}`);
  process.exit(1);
});
