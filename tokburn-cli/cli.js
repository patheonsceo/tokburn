#!/usr/bin/env node
const { Command } = require('commander');
const program = new Command();

program
  .name('tokburn')
  .description('Tokemons — your coding companion for Claude Code')
  .version('2.0.0');

program
  .command('init')
  .description('Set up tokburn with your Tokemon companion')
  .option('--remove', 'Remove tokburn configuration')
  .action(async (opts) => {
    if (opts.remove) {
      const { uninstallTokburn } = require('./init');
      await uninstallTokburn();
      return;
    }
    try {
      const { runInkInit } = await import('./init-ui.mjs');
      await runInkInit();
    } catch {
      const { runInit } = require('./init');
      await runInit();
    }
  });

program.parse();
