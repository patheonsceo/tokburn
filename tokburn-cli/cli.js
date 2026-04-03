#!/usr/bin/env node

const { Command } = require('commander');
const { getToday, getWeek, clearToday, exportCSV, getWeekByDay } = require('./store');
const { formatToday, formatWeek, formatStatus, startLiveTUI } = require('./display');
const { calculateCost } = require('./costs');
const { getConfig } = require('./config');
const fs = require('fs');
const path = require('path');

const program = new Command();

program
  .name('tokburn')
  .description('See exactly how fast you\'re burning tokens and money across Claude Code sessions')
  .version('1.0.0');

program
  .command('status')
  .description('Config summary and today\'s usage')
  .action(() => {
    const entries = getToday();
    let summary = null;

    if (entries.length > 0) {
      let input = 0;
      let output = 0;
      let cost = 0;
      for (const e of entries) {
        input += e.input_tokens || 0;
        output += e.output_tokens || 0;
        cost += calculateCost(e.model, e.input_tokens || 0, e.output_tokens || 0);
      }
      summary = { input, output, requests: entries.length, cost };
    }

    console.log(formatStatus(summary));
  });

program
  .command('today')
  .description('Detailed today breakdown by model with cost estimates')
  .action(() => {
    const entries = getToday();
    console.log(formatToday(entries));
  });

program
  .command('week')
  .description('Last 7 days as ASCII table')
  .action(() => {
    const entriesByDay = getWeekByDay();
    console.log(formatWeek(entriesByDay));
  });

program
  .command('live')
  .description('Real-time TUI dashboard')
  .action(() => {
    startLiveTUI();
  });

program
  .command('reset')
  .description('Clear today\'s usage data')
  .action(() => {
    const entries = getToday();
    if (entries.length === 0) {
      console.log('\n  No data to clear for today.\n');
      return;
    }
    clearToday();
    console.log(`\n  \x1b[90m\u2713\x1b[0m Cleared ${entries.length} entries for today.\n`);
  });

program
  .command('export')
  .description('Export all usage data as CSV')
  .option('-o, --output <file>', 'Write to file instead of stdout')
  .action((opts) => {
    const csv = exportCSV();
    if (opts.output) {
      fs.writeFileSync(opts.output, csv, 'utf8');
      console.log(`\n  \x1b[90m\u2713\x1b[0m Exported to ${opts.output}\n`);
    } else {
      process.stdout.write(csv);
    }
  });

program
  .command('init')
  .description('Interactive setup wizard for Claude Code')
  .option('--remove', 'Uninstall tokburn from Claude Code')
  .action(async (opts) => {
    if (opts.remove) {
      const { uninstallTokburn } = require('./init');
      uninstallTokburn();
      console.log('\n  tokburn removed from Claude Code.\n');
      return;
    }
    try {
      await import('./init-ui.mjs');
    } catch (err) {
      const { runInit } = require('./init');
      await runInit();
    }
  });

program
  .command('scan')
  .description('Parse Claude Code JSONL logs for usage data')
  .option('-d, --dir <directory>', 'Claude Code projects directory', path.join(process.env.HOME || process.env.USERPROFILE, '.claude', 'projects'))
  .action((opts) => {
    const logDir = opts.dir;
    console.log(`\n  Scanning Claude Code logs in: ${logDir}`);

    if (!fs.existsSync(logDir)) {
      console.log(`  \x1b[33m\u25CF\x1b[0m Directory not found: ${logDir}\n`);
      return;
    }

    let totalFound = 0;
    let totalInput = 0;
    let totalOutput = 0;
    let totalCost = 0;

    function scanDirectory(dir) {
      try {
        const items = fs.readdirSync(dir, { withFileTypes: true });
        for (const item of items) {
          const fullPath = path.join(dir, item.name);
          if (item.isDirectory()) {
            scanDirectory(fullPath);
          } else if (item.name.endsWith('.jsonl')) {
            scanJsonlFile(fullPath);
          }
        }
      } catch {
        // Skip inaccessible directories
      }
    }

    function scanJsonlFile(filePath) {
      try {
        const content = fs.readFileSync(filePath, 'utf8').trim();
        if (!content) return;

        for (const line of content.split('\n')) {
          try {
            const entry = JSON.parse(line);

            let inputTokens = 0;
            let outputTokens = 0;
            let model = null;

            if (entry.usage) {
              inputTokens = entry.usage.input_tokens || 0;
              outputTokens = entry.usage.output_tokens || 0;
            }

            if (entry.message && entry.message.usage) {
              inputTokens = entry.message.usage.input_tokens || inputTokens;
              outputTokens = entry.message.usage.output_tokens || outputTokens;
            }

            model = entry.model || (entry.message && entry.message.model) || null;

            if (entry.costUSD) {
              totalCost += entry.costUSD;
            }

            if (inputTokens > 0 || outputTokens > 0) {
              totalFound++;
              totalInput += inputTokens;
              totalOutput += outputTokens;
              if (!entry.costUSD && model) {
                totalCost += calculateCost(model, inputTokens, outputTokens);
              }
            }
          } catch {
            // Skip unparseable lines
          }
        }
      } catch {
        // Skip unreadable files
      }
    }

    scanDirectory(logDir);

    const totalTokens = totalInput + totalOutput;
    console.log('');
    console.log(`  Found ${totalFound.toLocaleString('en-US')} usage entries`);
    console.log(`  Input Tokens:  ${totalInput.toLocaleString('en-US')}`);
    console.log(`  Output Tokens: ${totalOutput.toLocaleString('en-US')}`);
    console.log(`  Total Tokens:  ${totalTokens.toLocaleString('en-US')}`);
    console.log(`  Est. Cost:     $${totalCost.toFixed(2)}`);
    console.log('');
  });

// Hidden proxy commands for API users
program
  .command('start', { hidden: true })
  .description('Start the tokburn proxy daemon (API users)')
  .action(() => {
    const { startDaemon } = require('./proxy');
    const result = startDaemon();
    if (result.success) {
      const config = getConfig();
      console.log(`\n  \x1b[32m\u25CF\x1b[0m ${result.message}`);
      console.log(`\n  Set your API base URL:`);
      console.log(`  \x1b[36mexport ANTHROPIC_BASE_URL=http://127.0.0.1:${config.port}\x1b[0m\n`);
    } else {
      console.log(`\n  \x1b[33m\u25CF\x1b[0m ${result.message}\n`);
    }
  });

program
  .command('stop', { hidden: true })
  .description('Stop the tokburn proxy daemon (API users)')
  .action(() => {
    const { stopDaemon } = require('./proxy');
    const result = stopDaemon();
    if (result.success) {
      console.log(`\n  \x1b[90m\u25CB\x1b[0m ${result.message}\n`);
    } else {
      console.log(`\n  \x1b[33m\u25CF\x1b[0m ${result.message}\n`);
    }
  });

program.parse();
