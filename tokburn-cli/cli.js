#!/usr/bin/env node

const { Command } = require('commander');
const { startDaemon, stopDaemon, isRunning } = require('./proxy');
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
  .command('start')
  .description('Start the tokburn proxy daemon')
  .action(() => {
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
  .command('stop')
  .description('Stop the tokburn proxy daemon')
  .action(() => {
    const result = stopDaemon();
    if (result.success) {
      console.log(`\n  \x1b[90m\u25CB\x1b[0m ${result.message}\n`);
    } else {
      console.log(`\n  \x1b[33m\u25CF\x1b[0m ${result.message}\n`);
    }
  });

program
  .command('status')
  .description('Show proxy status and today\'s quick summary')
  .action(() => {
    const running = isRunning();
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

    console.log(formatStatus(running, summary));
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
  .action(async () => {
    const { runInit } = require('./init');
    await runInit();
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

            // Look for entries with usage data
            let inputTokens = 0;
            let outputTokens = 0;
            let model = null;

            // Direct usage field
            if (entry.usage) {
              inputTokens = entry.usage.input_tokens || 0;
              outputTokens = entry.usage.output_tokens || 0;
            }

            // Message with usage
            if (entry.message && entry.message.usage) {
              inputTokens = entry.message.usage.input_tokens || inputTokens;
              outputTokens = entry.message.usage.output_tokens || outputTokens;
            }

            // Model
            model = entry.model || (entry.message && entry.message.model) || null;

            // costUSD field (Claude Code internal)
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

program
  .command('_burn-rate', { hidden: true })
  .description('Output current burn rate (internal, used by status line)')
  .action(() => {
    const entries = getToday();
    if (entries.length < 2) {
      process.stdout.write('0');
      return;
    }
    const first = new Date(entries[0].timestamp);
    const last = new Date(entries[entries.length - 1].timestamp);
    const elapsed = (last - first) / 60000;
    if (elapsed <= 0) {
      process.stdout.write('0');
      return;
    }
    let total = 0;
    for (const e of entries) {
      total += (e.input_tokens || 0) + (e.output_tokens || 0);
    }
    const rate = Math.round(total / elapsed);
    if (rate >= 1000000) {
      process.stdout.write((rate / 1000000).toFixed(1) + 'M');
    } else if (rate >= 1000) {
      process.stdout.write((rate / 1000).toFixed(1) + 'K');
    } else {
      process.stdout.write(String(rate));
    }
  });

program
  .command('_task-summary', { hidden: true })
  .description('Output task summary card (internal, used by hooks)')
  .argument('[task-name]', 'Name of the completed task', 'Task')
  .action((taskName) => {
    const entries = getToday();
    const { renderCollapsed, renderExpanded } = require('./card');
    const conf = getConfig();
    const plan = conf.plan || 'pro';
    const limits = conf.limits || {};
    const limit = (limits[plan] && limits[plan].estimated_tokens) || 500000;

    let sessionInput = 0, sessionOutput = 0, sessionCost = 0;
    for (const e of entries) {
      sessionInput += e.input_tokens || 0;
      sessionOutput += e.output_tokens || 0;
      sessionCost += calculateCost(e.model, e.input_tokens || 0, e.output_tokens || 0);
    }
    const sessionTotal = sessionInput + sessionOutput;
    const sessionPct = (sessionTotal / limit) * 100;

    // Last request as "this task" (best approximation without task boundaries)
    const last = entries[entries.length - 1] || {};
    const taskInput = last.input_tokens || 0;
    const taskOutput = last.output_tokens || 0;

    // Time remaining
    let timeRemaining = null;
    if (entries.length >= 2) {
      const first = new Date(entries[0].timestamp);
      const elapsed = (Date.now() - first.getTime()) / 60000;
      if (elapsed > 0) {
        const rate = sessionTotal / elapsed;
        const remaining = limit - sessionTotal;
        if (rate > 0 && remaining > 0) {
          const mins = Math.round(remaining / rate);
          timeRemaining = mins >= 60
            ? Math.floor(mins / 60) + 'hr ' + (mins % 60) + 'min'
            : mins + 'min';
        }
      }
    }

    console.log('');
    console.log(renderCollapsed(taskName, taskInput + taskOutput, sessionPct));
    console.log(renderExpanded(
      taskName, taskInput, taskOutput, 0,
      sessionInput, sessionOutput, sessionCost,
      sessionPct, timeRemaining, entries.length
    ));
    console.log('');
  });

program.parse();
