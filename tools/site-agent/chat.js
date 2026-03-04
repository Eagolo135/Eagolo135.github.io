#!/usr/bin/env node
const readline = require('node:readline');
const fs = require('node:fs');
const { runRequest } = require('./index');
const { analyzeRequest, buildEnhancedRequest } = require('./conversation');
const { loadEnv } = require('./env');
const { resolveConfig } = require('./llm');
const { ensureOnMainBranch, ensureCleanWorktreeOrAutoSave } = require('./git');

async function ask(rl, prompt) {
  if (rl.closed) {
    return null;
  }

  return new Promise((resolve) => {
    const onClose = () => resolve(null);
    rl.once('close', onClose);
    rl.question(prompt, (answer) => {
      rl.removeListener('close', onClose);
      resolve(answer);
    });
  });
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

function isExitCommand(input) {
  const normalized = input.trim().toLowerCase();
  return ['exit', 'quit', '/exit', '/quit'].includes(normalized);
}

function isHelpCommand(input) {
  const normalized = input.trim().toLowerCase();
  return ['help', '/help'].includes(normalized);
}

function isApplyCommand(input) {
  const normalized = input.trim().toLowerCase();
  return ['yes', 'y', 'apply', '/apply', 'go ahead', 'do it'].includes(normalized);
}

function isCancelCommand(input) {
  const normalized = input.trim().toLowerCase();
  return ['no', 'n', 'cancel', '/cancel', 'stop'].includes(normalized);
}

function looksLikeEditRequest(input) {
  const text = input.toLowerCase();
  const cues = [
    'change',
    'update',
    'set',
    'make',
    'edit',
    'fix',
    'add',
    'remove',
    'theme',
    'color',
    'font',
    'spacing',
    'button',
    'layout',
    'style'
  ];
  return cues.some((cue) => text.includes(cue));
}

function printHelp() {
  console.log('Commands:');
  console.log('  /help    Show this help');
  console.log('  /apply   Apply the currently proposed change');
  console.log('  /cancel  Cancel the currently proposed change');
  console.log('  /exit    Quit chat mode');
  console.log('');
  console.log('Chat behavior:');
  console.log('  - I will discuss your request first.');
  console.log('  - I will NOT make file changes until you confirm twice (apply -> confirm).');
}

async function main() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  loadEnv();
  const llmConfig = resolveConfig();
  ensureOnMainBranch();
  const saveResult = ensureCleanWorktreeOrAutoSave({ reason: 'chat session start' });

  console.log('');
  console.log('🤖 site-agent chat mode');
  console.log('   Talk to me normally. I will only apply changes after your confirmation.');
  console.log('   Examples: "change the color to blue", "make buttons less rounded"');
  console.log('   Commands: /help, /apply, /cancel, /exit');
  if (saveResult.saved) {
    const ref = saveResult.commitHash ? ` (${saveResult.commitHash})` : '';
    console.log(`   Auto-saved and pushed local edits${ref} for a clean session.`);
  }
  console.log('');

  let pendingRequest = null;
  let awaitingFinalApplyConfirmation = false;

  while (true) {
    const answer = await ask(rl, '> ');
    if (answer === null) {
      console.log('Goodbye!');
      break;
    }

    const input = answer.trim();
    if (!input) {
      continue;
    }

    if (isExitCommand(input)) {
      console.log('Goodbye!');
      break;
    }

    if (isHelpCommand(input)) {
      printHelp();
      console.log('');
      continue;
    }

    if (awaitingFinalApplyConfirmation) {
      if (isApplyCommand(input)) {
        try {
          console.log('[site-agent] Applying pending request...');
          await runRequest(pendingRequest);
          pendingRequest = null;
          awaitingFinalApplyConfirmation = false;
        } catch (error) {
          console.error(`[site-agent] ERROR: ${error.message}`);
          awaitingFinalApplyConfirmation = false;
        }
        console.log('');
        continue;
      }

      if (isCancelCommand(input)) {
        awaitingFinalApplyConfirmation = false;
        console.log('[site-agent] Apply canceled. Pending change is still queued.');
        console.log('[site-agent] Use "/apply" again when you are ready, or "/cancel" to discard it.');
        console.log('');
        continue;
      }

      console.log('[site-agent] Please reply with "yes" to confirm apply, or "no" to cancel apply.');
      console.log('');
      continue;
    }

    if (pendingRequest && isApplyCommand(input)) {
      awaitingFinalApplyConfirmation = true;
      console.log('[site-agent] Final confirmation: apply this change now? (yes/no)');
      console.log('');
      continue;
    }

    if (pendingRequest && isCancelCommand(input)) {
      pendingRequest = null;
      awaitingFinalApplyConfirmation = false;
      console.log('[site-agent] Pending change canceled.');
      console.log('');
      continue;
    }

    if (input.startsWith('/')) {
      console.log('[site-agent] Unknown command. Type /help for available commands.');
      console.log('');
      continue;
    }

    try {
      if (!looksLikeEditRequest(input) && !pendingRequest) {
        console.log('[site-agent] I can help with site edits. Tell me what to change, then I will ask for confirmation before applying.');
        console.log('           Example: "change the primary color to #14b8a6"');
        console.log('');
        continue;
      }

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
        }
      }

      pendingRequest = finalRequest;
      awaitingFinalApplyConfirmation = false;
      console.log('');
      console.log('[site-agent] I am ready to apply this change.');
      console.log('[site-agent] Reply with "yes" or "/apply" to start confirmation, then confirm yes/no.');
      
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
