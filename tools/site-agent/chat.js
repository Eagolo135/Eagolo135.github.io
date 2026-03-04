#!/usr/bin/env node
const readline = require('node:readline');
const fs = require('node:fs');
const path = require('node:path');
const { runRequest, runRequestWithContext } = require('./index');
const { analyzeRequest, buildEnhancedRequest } = require('./conversation');
const { loadEnv } = require('./env');
const { resolveConfig } = require('./llm');

async function ask(rl, prompt) {
  return new Promise((resolve) => rl.question(prompt, resolve));
}

function readAllowedFilesSnapshot() {
  const allowedFiles = [
    '_data/site.yml',
    'assets/css/style.css',
    '_layouts/default.html',
    'index.html',
    'services.html',
    'projects.html',
    'contact.html',
    'book.html'
  ];
  
  const snapshot = {};
  for (const file of allowedFiles) {
    if (fs.existsSync(file)) {
      snapshot[file] = fs.readFileSync(file, 'utf8');
    }
  }
  return snapshot;
}

async function main() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  loadEnv();
  const llmConfig = resolveConfig();

  console.log('');
  console.log('🤖 site-agent chat mode');
  console.log('   Just tell me what you want to change - I\'ll figure out where.');
  console.log('   Examples: "change the color to blue", "update my phone number"');
  console.log('   Type "exit" to quit.');
  console.log('');

  while (true) {
    const input = (await ask(rl, '> ')).trim();
    if (!input) {
      continue;
    }
    if (input.toLowerCase() === 'exit' || input.toLowerCase() === 'quit') {
      console.log('Goodbye!');
      break;
    }

    try {
      // First, analyze the request to see if clarification is needed
      console.log('[site-agent] Analyzing request...');
      const snapshot = readAllowedFilesSnapshot();
      
      const analysis = await analyzeRequest({
        request: input,
        fileSnapshot: snapshot,
        llmConfig
      });

      console.log(`[site-agent] Analysis: ${analysis.analysis}`);
      
      if (analysis.targetFiles && analysis.targetFiles.length > 0) {
        console.log(`[site-agent] Target files: ${analysis.targetFiles.join(', ')}`);
      }

      // If clarification is needed, ask questions
      let finalRequest = input;
      if (analysis.needsClarification && analysis.questions.length > 0) {
        console.log('');
        console.log('I need a bit more info:');
        
        const clarifications = [];
        for (const question of analysis.questions) {
          const answer = (await ask(rl, `  ${question}\n  → `)).trim();
          if (answer) {
            clarifications.push({ question, answer });
          }
        }
        
        if (clarifications.length > 0) {
          finalRequest = buildEnhancedRequest(input, clarifications);
          console.log('');
          console.log('[site-agent] Got it! Processing your request...');
        }
      }

      // Execute the request
      await runRequest(finalRequest);
      
    } catch (error) {
      console.error(`[site-agent] ERROR: ${error.message}`);
    }
    
    console.log(''); // Add spacing between requests
  }

  rl.close();
}

main().catch((error) => {
  console.error(`[site-agent] ERROR: ${error.message}`);
  process.exit(1);
});
