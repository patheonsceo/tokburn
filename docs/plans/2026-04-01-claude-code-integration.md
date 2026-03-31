# Claude Code Integration — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make tokburn native to Claude Code with a setup wizard, rich status line, and enhanced live TUI.

**Architecture:** Three layers. (1) Status line script reads Claude Code's native JSON payload (tokens, rate limits, cost) — zero proxy needed. (2) Proxy adds granular per-request logging for the live TUI. (3) `tokburn init` wizard wires everything together.

**Tech Stack:** Node.js, shell scripts, Claude Code hooks API, Claude Code status line API.

**Key insight:** Claude Code's status line receives `rate_limits.five_hour.used_percentage`, `context_window.total_input_tokens`, `cost.total_cost_usd` natively. The proxy is optional power-user infrastructure, not a requirement.

---

### Task 1: Status Line Script

**Files:**
- Create: `tokburn-cli/statusline.sh`

**Step 1: Write the status line script**

```bash
#!/bin/bash
# tokburn status line for Claude Code
# Receives JSON on stdin with session data
input=$(cat)

# Extract data from Claude Code's native JSON
model=$(echo "$input" | jq -r '.model.display_name // "?"')
five_hr_pct=$(echo "$input" | jq -r '.rate_limits.five_hour.used_percentage // 0' | cut -d. -f1)
cost=$(echo "$input" | jq -r '.cost.total_cost_usd // 0')
input_tok=$(echo "$input" | jq -r '.context_window.total_input_tokens // 0')
output_tok=$(echo "$input" | jq -r '.context_window.total_output_tokens // 0')

# Format token count
total_tok=$((input_tok + output_tok))
if [ "$total_tok" -ge 1000000 ]; then
  tok_fmt="$(echo "scale=1; $total_tok / 1000000" | bc)M"
elif [ "$total_tok" -ge 1000 ]; then
  tok_fmt="$(echo "scale=1; $total_tok / 1000" | bc)K"
else
  tok_fmt="$total_tok"
fi

# Format cost
cost_fmt=$(printf '$%.2f' "$cost")

# Determine state icon
if [ "$five_hr_pct" -ge 90 ]; then
  icon="!!"
elif [ "$five_hr_pct" -ge 50 ]; then
  icon=">>"
else
  icon="::"
fi

# Check if proxy is running for burn rate
burn_rate=""
if [ -f "$HOME/.tokburn/tokburn.pid" ]; then
  pid=$(cat "$HOME/.tokburn/tokburn.pid" 2>/dev/null)
  if kill -0 "$pid" 2>/dev/null; then
    burn_rate=" ~$(tokburn _burn-rate 2>/dev/null || echo '?')tok/m"
  fi
fi

echo "${icon} ${tok_fmt} tok  ${five_hr_pct}% of 5hr  ${cost_fmt}${burn_rate}"
```

**Step 2: Test the script manually**

```bash
chmod +x statusline.sh
echo '{"model":{"display_name":"Opus"},"rate_limits":{"five_hour":{"used_percentage":42.5}},"cost":{"total_cost_usd":1.95},"context_window":{"total_input_tokens":98200,"total_output_tokens":44650}}' | ./statusline.sh
```

Expected: `:: 142.8K tok  42% of 5hr  $1.95`

**Step 3: Commit**

```bash
git add tokburn-cli/statusline.sh
git commit -m "feat: add Claude Code status line script"
```

---

### Task 2: `tokburn _burn-rate` Internal Command

**Files:**
- Modify: `tokburn-cli/cli.js`
- Modify: `tokburn-cli/store.js`

**Step 1: Add `_burn-rate` hidden command to cli.js**

Add after the `scan` command:

```javascript
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
    // Abbreviate
    if (rate >= 1000) {
      process.stdout.write((rate / 1000).toFixed(1) + 'K');
    } else {
      process.stdout.write(String(rate));
    }
  });
```

**Step 2: Test**

```bash
node cli.js _burn-rate
```

Expected: a number or abbreviated rate written to stdout with no newline.

**Step 3: Commit**

```bash
git add tokburn-cli/cli.js
git commit -m "feat: add _burn-rate internal command for status line"
```

---

### Task 3: `tokburn _task-summary` Internal Command

**Files:**
- Modify: `tokburn-cli/cli.js`
- Create: `tokburn-cli/card.js`

**Step 1: Create card.js — the collapsible task card renderer**

```javascript
// card.js — Renders the per-task token summary card
// Used by _task-summary and tokburn live

const { calculateCost } = require('./costs');

const CARD_WIDTH = 54;

function renderCollapsed(taskName, taskTokens, sessionPct) {
  const name = truncate(taskName || 'Task', 24);
  const tok = abbreviate(taskTokens);
  const cost = '$' + calculateCostFromTokens(taskTokens).toFixed(2);
  const left = Math.max(0, 100 - Math.round(sessionPct));

  const icon = sessionPct >= 90 ? '!!' : '>';
  return `  ${icon} ${name}  ${tok} tok  ${cost}  ${left}% left`;
}

function renderExpanded(taskName, taskInput, taskOutput, taskCached,
                        sessionInput, sessionOutput, sessionCost,
                        sessionPct, timeRemaining, requestCount) {
  const W = CARD_WIDTH;
  const lines = [];

  // Header
  lines.push('  v ' + truncate(taskName || 'Task', W - 4));

  // Top border
  lines.push('  ' + top(W));

  // Column headers
  lines.push(row('  This Task', 'Session Total', W));
  lines.push(row(
    '  In:  ' + pad(fmtNum(taskInput), 8) + (taskCached > 0 ? ' (' + abbreviate(taskCached) + ' cached)' : ''),
    'In:  ' + fmtNum(sessionInput),
    W
  ));
  lines.push(row(
    '  Out: ' + pad(fmtNum(taskOutput), 8),
    'Out: ' + fmtNum(sessionOutput),
    W
  ));

  const taskCost = calculateCostFromTokens(taskInput + taskOutput);
  lines.push(row(
    '  Cost: $' + taskCost.toFixed(2),
    'Cost: $' + sessionCost.toFixed(2),
    W
  ));

  // Empty line
  lines.push(row('', '', W));

  // Progress bar
  const barWidth = W - 22;
  const filled = Math.round(barWidth * Math.min(1, sessionPct / 100));
  const empty = barWidth - filled;
  const bar = '\u2588'.repeat(filled) + '\u2591'.repeat(empty);
  const pctLabel = Math.round(sessionPct) + '% of 5hr limit';
  lines.push('  \u2502 ' + bar + '  ' + padRight(pctLabel, W - barWidth - 5) + '\u2502');

  // Time remaining
  const timeStr = timeRemaining || '?';
  const reqStr = requestCount + ' requests today';
  lines.push(row('  ~' + timeStr + ' remaining', reqStr, W));

  // Bottom border
  lines.push('  ' + bottom(W));

  return lines.join('\n');
}

// ── Box drawing helpers ─────────────────────────────────────────────────────

function top(w) {
  return '\u250c' + '\u2500'.repeat(w - 2) + '\u2510';
}

function bottom(w) {
  return '\u2514' + '\u2500'.repeat(w - 2) + '\u2518';
}

function row(left, right, w) {
  const innerW = w - 4; // account for "| " and " |"
  const leftClean = stripAnsi(left);
  const rightClean = stripAnsi(right);
  const gap = Math.max(1, innerW - leftClean.length - rightClean.length);
  const content = left + ' '.repeat(gap) + right;
  // Pad or truncate to exact width
  const contentClean = stripAnsi(content);
  const padding = Math.max(0, innerW - contentClean.length);
  return '  \u2502 ' + content + ' '.repeat(padding) + ' \u2502';
}

// ── Formatting helpers ──────────────────────────────────────────────────────

function abbreviate(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return String(n);
}

function fmtNum(n) {
  return n.toLocaleString('en-US');
}

function pad(str, len) {
  return String(str).padStart(len);
}

function padRight(str, len) {
  return String(str).padEnd(len);
}

function truncate(str, maxLen) {
  if (str.length <= maxLen) return str;
  return str.substring(0, maxLen - 3) + '...';
}

function stripAnsi(str) {
  return str.replace(/\x1b\[[0-9;]*m/g, '');
}

function calculateCostFromTokens(tokens) {
  // Rough estimate assuming sonnet pricing split 70/30 input/output
  const input = Math.round(tokens * 0.7);
  const output = tokens - input;
  return calculateCost('claude-sonnet-4', input, output);
}

module.exports = { renderCollapsed, renderExpanded, CARD_WIDTH };
```

**Step 2: Add `_task-summary` command to cli.js**

Add after `_burn-rate`:

```javascript
program
  .command('_task-summary', { hidden: true })
  .description('Output task summary card (internal, used by hooks)')
  .argument('[task-name]', 'Name of the completed task', 'Task')
  .action((taskName) => {
    const entries = getToday();
    const { renderCollapsed, renderExpanded } = require('./card');
    const config = getConfig();
    const limit = (config.limits && config.limits[config.plan || 'pro'] &&
                   config.limits[config.plan || 'pro'].estimated_tokens) || 500000;

    // Calculate session totals
    let sessionInput = 0, sessionOutput = 0, sessionCost = 0;
    for (const e of entries) {
      sessionInput += e.input_tokens || 0;
      sessionOutput += e.output_tokens || 0;
      sessionCost += calculateCost(e.model, e.input_tokens || 0, e.output_tokens || 0);
    }
    const sessionTotal = sessionInput + sessionOutput;
    const sessionPct = (sessionTotal / limit) * 100;

    // Task tokens = last request (best we can do without task boundaries)
    const last = entries[entries.length - 1] || {};
    const taskInput = last.input_tokens || 0;
    const taskOutput = last.output_tokens || 0;

    // Time remaining estimate
    let timeRemaining = null;
    if (entries.length >= 2) {
      const first = new Date(entries[0].timestamp);
      const now = new Date();
      const elapsed = (now - first) / 60000;
      if (elapsed > 0) {
        const rate = sessionTotal / elapsed;
        const remaining = limit - sessionTotal;
        if (rate > 0 && remaining > 0) {
          const mins = Math.round(remaining / rate);
          if (mins >= 60) {
            timeRemaining = Math.floor(mins / 60) + 'hr ' + (mins % 60) + 'min';
          } else {
            timeRemaining = mins + 'min';
          }
        }
      }
    }

    console.log(renderCollapsed(taskName, taskInput + taskOutput, sessionPct));
    console.log(renderExpanded(
      taskName, taskInput, taskOutput, 0,
      sessionInput, sessionOutput, sessionCost,
      sessionPct, timeRemaining, entries.length
    ));
  });
```

**Step 3: Test**

```bash
node cli.js _task-summary "Refactored auth middleware"
```

Expected: collapsed + expanded card output.

**Step 4: Commit**

```bash
git add tokburn-cli/card.js tokburn-cli/cli.js
git commit -m "feat: add task summary card renderer and _task-summary command"
```

---

### Task 4: `tokburn init` — Interactive Setup Wizard

**Files:**
- Create: `tokburn-cli/init.js`
- Modify: `tokburn-cli/cli.js`

**Step 1: Create init.js**

```javascript
// init.js — Interactive setup wizard for Claude Code integration
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { getConfig, setConfig, getTokburnDir } = require('./config');
const { startDaemon, isRunning } = require('./proxy');

async function runInit() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const ask = (q) => new Promise((resolve) => rl.question(q, resolve));
  const home = process.env.HOME || process.env.USERPROFILE;

  console.log('');
  console.log('  tokburn setup');
  console.log('  ' + '\u2500'.repeat(35));
  console.log('');

  // Detect shell
  const shell = path.basename(process.env.SHELL || 'bash');
  const rcFile = shell === 'zsh' ? '.zshrc' : '.bashrc';
  const rcPath = path.join(home, rcFile);
  console.log('  Shell detected: ' + shell);

  // Detect Claude Code
  const claudeSettingsGlobal = path.join(home, '.claude', 'settings.json');
  const hasClaudeCode = fs.existsSync(path.join(home, '.claude'));
  console.log('  Claude Code: ' + (hasClaudeCode ? 'found' : 'not found'));
  console.log('');

  // Step 1: Plan selection
  console.log('  [1/4] Which Claude plan are you on?');
  console.log('        1) Pro (default)');
  console.log('        2) Max');
  console.log('        3) API only');
  const planChoice = await ask('        > ');
  const plan = planChoice.trim() === '2' ? 'max' : planChoice.trim() === '3' ? 'api' : 'pro';
  console.log('');

  // Step 2: Start proxy
  console.log('  [2/4] Start proxy daemon?');
  console.log('        Tracks per-request token usage for detailed breakdowns.');
  console.log('        1) Yes, start now (recommended)');
  console.log('        2) No, skip');
  const proxyChoice = await ask('        > ');
  const startProxy = proxyChoice.trim() !== '2';
  console.log('');

  if (startProxy) {
    if (isRunning()) {
      console.log('  Proxy already running.');
    } else {
      const result = startDaemon();
      console.log('  ' + result.message);
    }
  }

  // Step 3: Shell config
  let addedShellConfig = false;
  if (startProxy) {
    console.log('  [3/4] Add ANTHROPIC_BASE_URL to ~/' + rcFile + '?');
    console.log('        Required for proxy to intercept API calls.');
    console.log('        1) Yes (recommended)');
    console.log('        2) No, I\'ll do it manually');
    const shellChoice = await ask('        > ');
    console.log('');

    if (shellChoice.trim() !== '2') {
      const config = getConfig();
      const line = `export ANTHROPIC_BASE_URL=http://127.0.0.1:${config.port}`;
      const existing = fs.existsSync(rcPath) ? fs.readFileSync(rcPath, 'utf8') : '';
      if (!existing.includes('ANTHROPIC_BASE_URL')) {
        fs.appendFileSync(rcPath, '\n# tokburn proxy\n' + line + '\n');
        console.log('  Added to ~/' + rcFile);
        addedShellConfig = true;
      } else {
        console.log('  ANTHROPIC_BASE_URL already in ~/' + rcFile);
      }
    }
  } else {
    console.log('  [3/4] Skipping shell config (no proxy).');
    console.log('');
  }

  // Step 4: Claude Code status line + hooks
  if (hasClaudeCode) {
    console.log('  [4/4] Configure Claude Code integration?');
    console.log('        Adds token usage to the status line.');
    console.log('        1) Yes (recommended)');
    console.log('        2) No, skip');
    const hookChoice = await ask('        > ');
    console.log('');

    if (hookChoice.trim() !== '2') {
      // Install status line script
      const statuslineSrc = path.join(__dirname, 'statusline.sh');
      const statuslineDest = path.join(home, '.claude', 'tokburn-statusline.sh');

      if (fs.existsSync(statuslineSrc)) {
        fs.copyFileSync(statuslineSrc, statuslineDest);
        fs.chmodSync(statuslineDest, '755');
        console.log('  Installed status line script.');
      }

      // Update Claude Code settings
      let settings = {};
      if (fs.existsSync(claudeSettingsGlobal)) {
        try {
          settings = JSON.parse(fs.readFileSync(claudeSettingsGlobal, 'utf8'));
        } catch (_) {}
      }

      // Add status line config
      settings.statusLine = {
        type: 'command',
        command: statuslineDest,
      };

      // Ensure directory exists
      const claudeDir = path.dirname(claudeSettingsGlobal);
      if (!fs.existsSync(claudeDir)) {
        fs.mkdirSync(claudeDir, { recursive: true });
      }
      fs.writeFileSync(claudeSettingsGlobal, JSON.stringify(settings, null, 2) + '\n');
      console.log('  Configured Claude Code status line.');
    }
  } else {
    console.log('  [4/4] Claude Code not detected, skipping integration.');
    console.log('');
  }

  // Save plan config
  const config = getConfig();
  setConfig({
    ...config,
    plan: plan,
    limits: {
      pro: { window_hours: 5, estimated_tokens: 500000 },
      max: { window_hours: 5, estimated_tokens: 2000000 },
      api: { window_hours: 24, estimated_tokens: 10000000 },
    },
  });

  // Done
  console.log('  ' + '\u2500'.repeat(35));
  console.log('  Done. tokburn is ready.');
  console.log('');
  console.log('  Quick commands:');
  console.log('    tokburn status   — check proxy + today\'s usage');
  console.log('    tokburn today    — detailed breakdown');
  console.log('    tokburn live     — real-time TUI dashboard');
  console.log('');

  if (addedShellConfig) {
    console.log('  Run `source ~/' + rcFile + '` or open a new terminal to activate.');
    console.log('');
  }

  rl.close();
}

module.exports = { runInit };
```

**Step 2: Add `init` command to cli.js**

Add before `program.parse()`:

```javascript
program
  .command('init')
  .description('Interactive setup wizard for Claude Code')
  .action(async () => {
    const { runInit } = require('./init');
    await runInit();
  });
```

**Step 3: Test**

```bash
node cli.js init
```

Walk through the wizard, verify it creates configs correctly.

**Step 4: Commit**

```bash
git add tokburn-cli/init.js tokburn-cli/cli.js tokburn-cli/statusline.sh
git commit -m "feat: add interactive setup wizard and Claude Code status line"
```

---

### Task 5: Enhanced `tokburn live` TUI with Per-Request Cards

**Files:**
- Modify: `tokburn-cli/display.js`

**Step 1: Enhance the live TUI**

Update `startLiveTUI()` in display.js to include:
- A mini task-card for the most recent request at the top
- Progress bar showing 5hr limit percentage
- Color-coded output (green/amber/red based on usage %)

The enhanced render function should show:

```
┌──────────────────────────────────────────────────┐
│ tokburn live  ::  14:32:07                       │
│                                                  │
│ ████████████████████░░░░░░░░░░  68% of 5hr limit │
│ ~1hr 36min remaining                             │
│                                                  │
│   Input Tokens            98,200                 │
│   Output Tokens           44,650                 │
│   Total Tokens           142,850                 │
│   Requests                    23                 │
│                                                  │
│   Burn Rate          2,847 tok/min               │
│   Est. Cost                $1.95                 │
│                                                  │
│   Recent Requests                                │
│   ──────────────────────────────────────────     │
│   sonnet-4          1,240 tok  3s ago            │
│   sonnet-4            890 tok  12s ago           │
│   haiku-4             320 tok  45s ago           │
└──────────────────────────────────────────────────┘

  Press q to quit
```

Changes to render():
1. Add progress bar with color (use ANSI: `\x1b[32m` green, `\x1b[33m` amber, `\x1b[31m` red)
2. Add time remaining estimate
3. Read plan config for limit

**Step 2: Test by running `tokburn live` with sample data**

**Step 3: Commit**

```bash
git add tokburn-cli/display.js
git commit -m "feat: enhance live TUI with progress bar and time estimate"
```

---

### Task 6: Add Benchmark Script Entry to package.json + Test Card Rendering

**Files:**
- Modify: `tokburn-cli/package.json`
- Create: `tokburn-cli/test/test-card.js`

**Step 1: Add test script to package.json**

```json
{
  "scripts": {
    "benchmark": "node test/benchmark.js",
    "test": "node test/benchmark.js && node test/test-card.js"
  }
}
```

**Step 2: Create card rendering tests**

```javascript
// test-card.js — Verify card rendering doesn't break box alignment
const { renderCollapsed, renderExpanded, CARD_WIDTH } = require('../card');

let passed = 0;
let failed = 0;

function assert(name, condition) {
  if (condition) { passed++; }
  else { failed++; console.log('  FAIL: ' + name); }
}

// Test collapsed rendering
const collapsed = renderCollapsed('Refactored auth middleware', 12400, 74);
assert('Collapsed contains task name', collapsed.includes('Refactored auth'));
assert('Collapsed contains tokens', collapsed.includes('12.4K'));
assert('Collapsed contains % left', collapsed.includes('26% left'));

// Test expanded rendering
const expanded = renderExpanded(
  'Refactored auth middleware', 8200, 4200, 2000,
  142800, 58200, 1.95, 74, '1hr 18min', 23
);
const lines = expanded.split('\n');

// Verify all box lines are same width
const boxLines = lines.filter(l => l.includes('\u2502'));
for (let i = 0; i < boxLines.length; i++) {
  const stripped = boxLines[i].replace(/\x1b\[[0-9;]*m/g, '');
  // All lines between borders should end with │
  assert('Box line ' + i + ' ends with border', stripped.trimEnd().endsWith('\u2502'));
}

assert('Expanded contains task name', expanded.includes('Refactored auth'));
assert('Expanded contains session total', expanded.includes('142,800'));
assert('Expanded contains cached', expanded.includes('cached'));
assert('Expanded contains progress bar', expanded.includes('\u2588'));
assert('Expanded contains time remaining', expanded.includes('1hr 18min'));

// Test with very long task name (should truncate)
const longName = renderCollapsed('A very long task name that exceeds the maximum width', 500, 10);
assert('Long name truncated', longName.length < 100);

// Test edge cases
const zero = renderCollapsed('Empty', 0, 0);
assert('Zero tokens renders', zero.includes('0'));

const full = renderCollapsed('Maxed out', 500000, 100);
assert('100% shows 0% left', full.includes('0% left'));

console.log(`\n  Card tests: ${passed} passed, ${failed} failed\n`);
process.exit(failed > 0 ? 1 : 0);
```

**Step 3: Run tests**

```bash
npm test
```

**Step 4: Commit**

```bash
git add tokburn-cli/package.json tokburn-cli/test/test-card.js
git commit -m "feat: add card rendering tests and test scripts"
```

---

### Task 7: Commit Benchmarks + All New Files

**Files:**
- Stage: `tokburn-cli/test/benchmark.js`, all new/modified files

**Step 1: Stage and commit everything**

```bash
git add tokburn-cli/ tokburn-ext/
git commit -m "feat: complete tokburn v1 — CLI, extension, benchmarks, Claude Code integration"
```

---

## Summary of Deliverables

| Feature | File | Integration |
|---------|------|-------------|
| Status line | `statusline.sh` | `~/.claude/settings.json` statusLine config |
| Setup wizard | `init.js` | `tokburn init` command |
| Task card | `card.js` | `tokburn _task-summary` + `tokburn live` |
| Burn rate | `_burn-rate` | Called by status line script |
| Benchmarks | `test/benchmark.js` | `npm run benchmark` |
| Card tests | `test/test-card.js` | `npm test` |
