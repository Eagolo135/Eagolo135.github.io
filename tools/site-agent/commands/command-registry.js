class CommandRegistry {
  constructor(commands = []) {
    this.commands = commands;
  }

  resolve(input) {
    const normalized = (input || '').trim().toLowerCase();
    return this.commands.find((command) => command.matches(normalized)) || null;
  }
}

module.exports = {
  CommandRegistry
};
