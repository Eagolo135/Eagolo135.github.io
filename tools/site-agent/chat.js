#!/usr/bin/env node
const readline = require('node:readline');
const fs = require('node:fs');
const { runRequest, buildAllowedFiles } = require('./index');
const { analyzeRequest, buildEnhancedRequest, generateConversationalReply } = require('./conversation');
const { loadEnv } = require('./env');
const { resolveConfig } = require('./llm');
const { ensureOnMainBranch, ensureCleanWorktreeOrAutoSave } = require('./git');
const { CommandRegistry } = require('./commands/command-registry');
const { createDefaultCommands } = require('./commands/default-commands');

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
  const allowedFiles = buildAllowedFiles(process.cwd());
  const snapshot = {};
  for (const file of allowedFiles) {
    if (fs.existsSync(file)) {
      snapshot[file] = fs.readFileSync(file, 'utf8');
    }
  }
  return snapshot;
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
    'redesign',
    'rework',
    'makeover',
    'modernize',
    'ui',
    'ux',
    'gradient',
    'effects',
    'graphics',
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
  console.log('  - I hold a natural conversation and interpret your intent.');
  console.log('  - I propose a concrete plan before editing files.');
  console.log('  - I can update any website content/style/layout file in this repo.');
}

function printWelcome(saveResult) {
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
}

async function buildFinalRequestFromAnalysis({ input, rl, llmConfig }) {
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

  return finalRequest;
}

async function applyPendingRequest({ state }) {
  try {
    console.log('[site-agent] Applying pending request...');
    await runRequest(state.pendingRequest);
    state.pendingRequest = null;
    state.pendingPlan = null;
    state.awaitingFinalApplyConfirmation = false;
  } catch (error) {
    console.error(`[site-agent] ERROR: ${error.message}`);
    state.awaitingFinalApplyConfirmation = false;
  }
}

function createChatState() {
  return {
    pendingRequest: null,
    pendingPlan: null,
    awaitingFinalApplyConfirmation: false
  };
}

function buildPlanPreview({ analysis, finalRequest }) {
  const targetFiles = Array.isArray(analysis.targetFiles) ? analysis.targetFiles : [];
  const steps = [];
  steps.push('Interpret intent and map request to editable website files');
  if (targetFiles.length > 0) {
    steps.push(`Update files: ${targetFiles.join(', ')}`);
  } else {
    steps.push('Apply coordinated updates across relevant content/layout/style files');
  }
  steps.push('Validate YAML and run Jekyll build checks');
  steps.push('Apply changes and report result');

  return {
    summary: analysis.analysis || finalRequest,
    steps
  };
}

function printPlan(plan) {
  console.log('[site-agent] Proposed plan:');
  console.log(`  Summary: ${plan.summary}`);
  for (const step of plan.steps) {
    console.log(`  - ${step}`);
  }
}

async function handleInput({ input, rl, state, llmConfig, commandRegistry }) {
  const normalized = input.trim();
  if (!normalized) {
    return { continueLoop: true };
  }

  const command = commandRegistry.resolve(normalized);
  if (command) {
    const result = await command.execute({ state, applyPendingRequest: () => applyPendingRequest({ state }) });
    if (result.handled) {
      if (result.exit) {
        console.log('Goodbye!');
        return { continueLoop: false };
      }
      console.log('');
      return { continueLoop: true };
    }
  }

  if (state.awaitingFinalApplyConfirmation) {
    console.log('[site-agent] Please reply with "yes" to confirm apply, or "no" to cancel apply.');
    console.log('');
    return { continueLoop: true };
  }

  if (normalized.startsWith('/')) {
    console.log('[site-agent] Unknown command. Type /help for available commands.');
    console.log('');
    return { continueLoop: true };
  }

  if (!looksLikeEditRequest(normalized) && !state.pendingRequest) {
    const chatReply = await generateConversationalReply({
      message: normalized,
      llmConfig,
      pendingRequest: state.pendingRequest
    });
    console.log(`[site-agent] ${chatReply.reply}`);
    if (chatReply.suggestApply && state.pendingRequest) {
      await applyPendingRequest({ state });
    }
    console.log('');
    return { continueLoop: true };
  }

  try {
    state.pendingRequest = await buildFinalRequestFromAnalysis({ input: normalized, rl, llmConfig });
    const analysis = await analyzeRequest({
      request: state.pendingRequest,
      fileSnapshot: readAllowedFilesSnapshot(),
      llmConfig
    });
    state.pendingPlan = buildPlanPreview({ analysis, finalRequest: state.pendingRequest });
    state.awaitingFinalApplyConfirmation = false;

    console.log('');
    printPlan(state.pendingPlan);
    console.log('[site-agent] I am ready to apply this change. Reply with "yes" or "/apply".');
  } catch (error) {
    console.error(`[site-agent] ERROR: ${error.message}`);
  }

  console.log('');
  return { continueLoop: true };
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
  printWelcome(saveResult);

  const state = createChatState();
  const commandRegistry = new CommandRegistry(
    createDefaultCommands({
      printHelp
    })
  );

  while (true) {
    const answer = await ask(rl, '> ');
    if (answer === null) {
      console.log('Goodbye!');
      break;
    }

    const result = await handleInput({
      input: answer,
      rl,
      state,
      llmConfig,
      commandRegistry
    });
    if (!result.continueLoop) {
      break;
    }
  }

  rl.close();
}

main().catch((error) => {
  console.error(`[site-agent] ERROR: ${error.message}`);
  process.exit(1);
});
