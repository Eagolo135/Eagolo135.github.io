function createHelpCommand({ printHelp }) {
  return {
    name: 'help',
    matches: (input) => ['help', '/help'].includes(input),
    execute: async () => {
      printHelp();
      return { handled: true, shouldContinue: true };
    }
  };
}

function createExitCommand() {
  return {
    name: 'exit',
    matches: (input) => ['exit', 'quit', '/exit', '/quit'].includes(input),
    execute: async () => ({ handled: true, shouldContinue: false, exit: true })
  };
}

function createApplyCommand() {
  return {
    name: 'apply',
    matches: (input) => ['yes', 'y', 'apply', '/apply', 'go ahead', 'do it'].includes(input),
    execute: async ({ state, applyPendingRequest }) => {
      if (state.pendingRequest) {
        await applyPendingRequest();
        return { handled: true, shouldContinue: true };
      }

      return { handled: false, shouldContinue: true };
    }
  };
}

function createCancelCommand() {
  return {
    name: 'cancel',
    matches: (input) => ['no', 'n', 'cancel', '/cancel', 'stop'].includes(input),
    execute: async ({ state }) => {
      if (state.pendingRequest) {
        state.pendingRequest = null;
        state.pendingPlan = null;
        state.awaitingFinalApplyConfirmation = false;
        console.log('[site-agent] Pending change canceled.');
        return { handled: true, shouldContinue: true };
      }

      return { handled: false, shouldContinue: true };
    }
  };
}

function createDefaultCommands(dependencies) {
  return [
    createExitCommand(),
    createHelpCommand(dependencies),
    createApplyCommand(),
    createCancelCommand()
  ];
}

module.exports = {
  createDefaultCommands
};
