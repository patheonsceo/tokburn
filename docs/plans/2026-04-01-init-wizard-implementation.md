# Init Wizard UI Redesign — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the plain readline-based init wizard with a polished Ink (React for CLI) experience featuring ASCII logo, arrow-key selectors, live status line preview, animated progress bar, and branded colors.

**Architecture:** The wizard is a single Ink React app (`init-ui.js`) that renders step-by-step. Each step is a component. Config logic stays in `init.js` as exported functions. The Ink app calls those functions and renders results. ESM module format required by Ink.

**Tech Stack:** Ink 5.x, @inkjs/ui (Select, Spinner, ProgressBar), React 18, chalk 5.x

---

### Task 1: Install dependencies and set up ESM

**Files:**
- Modify: `tokburn-cli/package.json`

**Step 1: Install Ink and related packages**

Run:
```bash
cd tokburn-cli
npm install ink @inkjs/ui react chalk
```

**Step 2: Verify install succeeded**

Run: `node -e "require('ink'); console.log('ink ok')"`

Note: Ink 5.x is ESM-only. We need to use dynamic `import()` from our CJS entry point. The init-ui.js file will be ESM (.mjs extension).

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add ink, @inkjs/ui, react, chalk dependencies"
```

---

### Task 2: Extract config logic from init.js

**Files:**
- Modify: `tokburn-cli/init.js`

Refactor init.js to export pure config functions (no UI, no readline). The Ink app will call these.

**Step 1: Refactor init.js to export functions**

Keep the existing `runInit()` for backward compat but also export:

```javascript
function detectEnvironment() {
  const home = process.env.HOME || process.env.USERPROFILE;
  const shell = path.basename(process.env.SHELL || 'bash');
  const rcFile = shell === 'zsh' ? '.zshrc' : shell === 'fish' ? '.config/fish/config.fish' : '.bashrc';
  const rcPath = path.join(home, rcFile);
  const claudeDir = path.join(home, '.claude');
  const hasClaudeCode = fs.existsSync(claudeDir);

  return { home, shell, rcFile, rcPath, claudeDir, hasClaudeCode };
}

function configurePlan(plan) {
  setConfig({ plan, limits: PLANS });
}

function configureProxy() {
  if (isRunning()) {
    return { success: true, message: 'already running', pid: null };
  }
  return startDaemon();
}

function configureShell(rcPath, port) {
  const envLine = `export ANTHROPIC_BASE_URL=http://127.0.0.1:${port}`;
  const existing = fs.existsSync(rcPath) ? fs.readFileSync(rcPath, 'utf8') : '';
  if (existing.includes('ANTHROPIC_BASE_URL')) {
    return { added: false, reason: 'already exists' };
  }
  fs.appendFileSync(rcPath, '\n# tokburn proxy\n' + envLine + '\n');
  return { added: true };
}

function configureStatusLine(selectedModules) {
  const home = process.env.HOME || process.env.USERPROFILE;
  const claudeDir = path.join(home, '.claude');
  const claudeSettings = path.join(claudeDir, 'settings.json');

  setConfig({ statusline_modules: selectedModules });

  const srcScript = path.join(__dirname, 'statusline.js');
  const destScript = path.join(claudeDir, 'tokburn-statusline.js');

  if (fs.existsSync(srcScript)) {
    fs.copyFileSync(srcScript, destScript);
    fs.chmodSync(destScript, '755');
  }

  let settings = {};
  if (fs.existsSync(claudeSettings)) {
    try { settings = JSON.parse(fs.readFileSync(claudeSettings, 'utf8')); } catch (_) {}
  }

  settings.statusLine = { type: 'command', command: destScript };

  if (!fs.existsSync(claudeDir)) {
    fs.mkdirSync(claudeDir, { recursive: true });
  }
  fs.writeFileSync(claudeSettings, JSON.stringify(settings, null, 2) + '\n');
}

module.exports = {
  runInit, detectEnvironment, configurePlan, configureProxy,
  configureShell, configureStatusLine, PLANS
};
```

**Step 2: Test the exports**

Run:
```bash
node -e "const i = require('./init'); console.log(Object.keys(i)); const env = i.detectEnvironment(); console.log(env.shell, env.hasClaudeCode)"
```

Expected: function names listed, shell detected.

**Step 3: Commit**

```bash
git add init.js
git commit -m "refactor: extract config functions from init.js for Ink UI"
```

---

### Task 3: Create the Ink wizard app

**Files:**
- Create: `tokburn-cli/init-ui.mjs`

This is the main Ink React app. It renders the full wizard flow.

**Step 1: Write init-ui.mjs**

```javascript
import React, { useState, useEffect } from 'react';
import { render, Box, Text, Newline, useApp } from 'ink';
import { Select, Spinner, ProgressBar } from '@inkjs/ui';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const {
  detectEnvironment, configurePlan, configureProxy,
  configureShell, configureStatusLine, PLANS
} = require('./init.js');
const { getConfig } = require('./config.js');
const { PRESETS, MODULE_LIST } = require('./statusline.js');
const pkg = require('./package.json');

// ── ASCII Logo ──────────────────────────────────────────────────────────────

const LOGO = `   _        _
  | |_ ___ | | __ ___ _   _ _ __ _ __
  | __/ _ \\| |/ /| _ | | | | '__| '_ \\
  | || (_) |   < | _ | |_| | |  | | | |
   \\__\\___/|_|\\_\\|___|\\__,_|_|  |_| |_|`;

// ── Status line preview data ────────────────────────────────────────────────

const PRESET_PREVIEWS = {
  recommended: [
    'Opus 4.6 | ctx 13% | tokburn (main*) | $1.95',
    'current  ●●○○○○○○○○  9%  ↻ 3hr 32min',
    'weekly   ●●●●○○○○○○  45% ↻ Fri 12:30PM',
  ],
  minimal: [
    'Opus 4.6 | ctx 13%',
    'current  ●●○○○○○○○○  9%  ↻ 3hr 32min',
  ],
  full: [
    'Opus 4.6 | ctx 13% | tokburn (main*) | 142.8K tok | $1.95 | ~2.1K/min',
    'current  ●●○○○○○○○○  9%  ↻ 3hr 32min',
    'weekly   ●●●●○○○○○○  45% ↻ Fri 12:30PM',
  ],
};

// ── Completed step display ──────────────────────────────────────────────────

function CompletedStep({ label, value }) {
  const dots = '.'.repeat(Math.max(1, 22 - label.length));
  return (
    <Text>
      <Text color="green">  ✓ </Text>
      <Text dimColor>{label} {dots} </Text>
      <Text bold>{value}</Text>
    </Text>
  );
}

// ── Main Wizard ─────────────────────────────────────────────────────────────

function Wizard() {
  const { exit } = useApp();
  const env = detectEnvironment();
  const config = getConfig();

  const [step, setStep] = useState(0); // 0=plan, 1=proxy, 2=shell, 3=statusline, 4=processing, 5=done
  const [results, setResults] = useState({
    plan: null,
    proxy: null,
    shell: null,
    statusLine: null,
  });
  const [processStep, setProcessStep] = useState(0);
  const [previewPreset, setPreviewPreset] = useState('recommended');

  // ── Step handlers ─────────────────────────────────────────────────────

  function onPlanSelect(value) {
    configurePlan(value);
    const labels = { pro: 'Pro (~500K/5hr)', max: 'Max (~2M/5hr)', api: 'API (no limits)' };
    setResults(r => ({ ...r, plan: labels[value] }));
    setStep(1);
  }

  function onProxySelect(value) {
    if (value === 'yes') {
      const result = configureProxy();
      setResults(r => ({ ...r, proxy: result.message }));
    } else {
      setResults(r => ({ ...r, proxy: 'skipped' }));
    }
    setStep(env.hasClaudeCode ? 2 : 4);
  }

  function onShellSelect(value) {
    if (value === 'yes') {
      const port = config.port || 4088;
      const result = configureShell(env.rcPath, port);
      setResults(r => ({ ...r, shell: result.added ? `added to ${env.rcFile}` : 'already configured' }));
    } else {
      setResults(r => ({ ...r, shell: 'manual' }));
    }
    setStep(3);
  }

  function onStatusLineSelect(value) {
    if (value === 'skip') {
      setResults(r => ({ ...r, statusLine: 'skipped' }));
    } else {
      const modules = PRESETS[value] || PRESETS.recommended;
      configureStatusLine(modules);
      const labels = { recommended: 'Recommended (5)', minimal: 'Minimal (2)', full: 'Full (7)' };
      setResults(r => ({ ...r, statusLine: labels[value] || value }));
    }
    setStep(5); // go straight to done (processing is instant)
  }

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <Box flexDirection="column" paddingLeft={1} paddingTop={1}>
      {/* Logo */}
      <Text color="yellow">{LOGO}</Text>
      <Newline />
      <Box>
        <Text dimColor>  token tracking for Claude Code</Text>
        <Text dimColor>  v{pkg.version}</Text>
      </Box>
      <Text dimColor>  {'─'.repeat(40)}</Text>
      <Box gap={1}>
        <Text>  Detected:</Text>
        <Text bold>{env.shell}</Text>
        <Text dimColor>+</Text>
        <Text bold>{env.hasClaudeCode ? 'Claude Code' : 'no Claude Code'}</Text>
      </Box>
      <Box gap={1} marginBottom={1}>
        <Text dimColor>  Works with:</Text>
        <Text color="cyan">Claude Code</Text>
        <Text dimColor>|</Text>
        <Text dimColor>Codex, Cursor — coming soon</Text>
      </Box>

      {/* Completed steps */}
      {results.plan && <CompletedStep label="Plan" value={results.plan} />}
      {results.proxy && <CompletedStep label="Proxy" value={results.proxy} />}
      {results.shell && <CompletedStep label="Shell" value={results.shell} />}
      {results.statusLine && <CompletedStep label="Status line" value={results.statusLine} />}

      {/* Step 0: Plan */}
      {step === 0 && (
        <Box flexDirection="column" marginTop={1}>
          <Text bold>  [1/4] Which Claude plan?</Text>
          <Newline />
          <Box paddingLeft={2}>
            <Select
              options={[
                { label: 'Pro       ~500K tokens / 5hr', value: 'pro' },
                { label: 'Max       ~2M tokens / 5hr', value: 'max' },
                { label: 'API only  no plan limits', value: 'api' },
              ]}
              onChange={onPlanSelect}
            />
          </Box>
        </Box>
      )}

      {/* Step 1: Proxy */}
      {step === 1 && (
        <Box flexDirection="column" marginTop={1}>
          <Text bold>  [2/4] Start the proxy daemon?</Text>
          <Newline />
          <Box paddingLeft={2}>
            <Select
              options={[
                { label: 'Yes, start now', value: 'yes' },
                { label: 'No, skip', value: 'no' },
              ]}
              onChange={onProxySelect}
            />
          </Box>
        </Box>
      )}

      {/* Step 2: Shell */}
      {step === 2 && (
        <Box flexDirection="column" marginTop={1}>
          <Text bold>  [3/4] Add ANTHROPIC_BASE_URL to ~/{env.rcFile}?</Text>
          <Newline />
          <Box paddingLeft={2}>
            <Select
              options={[
                { label: 'Yes, add it', value: 'yes' },
                { label: 'No, I\'ll do it manually', value: 'no' },
              ]}
              onChange={onShellSelect}
            />
          </Box>
        </Box>
      )}

      {/* Step 3: Status line with live preview */}
      {step === 3 && (
        <Box flexDirection="column" marginTop={1}>
          <Text bold>  [4/4] Status line preset</Text>
          <Newline />
          <Box paddingLeft={2}>
            <Select
              options={[
                { label: 'Recommended  model | ctx% | repo | limits | cost', value: 'recommended' },
                { label: 'Minimal      model | current limit', value: 'minimal' },
                { label: 'Full         everything + burn rate', value: 'full' },
                { label: 'Skip', value: 'skip' },
              ]}
              onChange={onStatusLineSelect}
              onHighlight={(option) => {
                if (PRESET_PREVIEWS[option.value]) {
                  setPreviewPreset(option.value);
                }
              }}
            />
          </Box>

          {/* Live preview */}
          {PRESET_PREVIEWS[previewPreset] && (
            <Box flexDirection="column" marginTop={1} marginLeft={2} borderStyle="round" borderColor="gray" paddingX={1}>
              <Text dimColor>Preview:</Text>
              {PRESET_PREVIEWS[previewPreset].map((line, i) => (
                <Text key={i}>{line}</Text>
              ))}
            </Box>
          )}
        </Box>
      )}

      {/* Step 5: Done */}
      {step === 5 && (
        <Box flexDirection="column" marginTop={1}>
          <Text dimColor>  {'─'.repeat(2)} Setup complete {'─'.repeat(21)}</Text>
          <Newline />
          <Text bold>  Try these:</Text>
          <Text>    <Text color="cyan">tokburn status</Text>    check everything</Text>
          <Text>    <Text color="cyan">tokburn today</Text>     see today's usage</Text>
          <Text>    <Text color="cyan">tokburn live</Text>      real-time dashboard</Text>
          <Newline />
        </Box>
      )}
    </Box>
  );
}

// ── Entry ───────────────────────────────────────────────────────────────────

const app = render(<Wizard />);
await app.waitUntilExit();
```

NOTE: The `onHighlight` prop on Select may not exist in @inkjs/ui. If not available, we use `onChange` on a preliminary selection state. Check actual API at runtime. The code above is the target — adapt during implementation if specific props differ.

**Step 2: Test the wizard**

Run:
```bash
node --experimental-vm-modules init-ui.mjs
```

Or simply:
```bash
node init-ui.mjs
```

Verify: logo renders, arrow keys work for plan selection, steps accumulate.

**Step 3: Commit**

```bash
git add init-ui.mjs
git commit -m "feat: add Ink-based init wizard with arrow keys and live preview"
```

---

### Task 4: Wire up CLI entry point

**Files:**
- Modify: `tokburn-cli/cli.js`

**Step 1: Update the `init` command to use the Ink wizard**

Replace the init command action in cli.js:

```javascript
program
  .command('init')
  .description('Interactive setup wizard for Claude Code')
  .action(async () => {
    try {
      await import('./init-ui.mjs');
    } catch (err) {
      // Fallback to old readline wizard if Ink fails
      console.error('Ink UI failed, falling back to basic wizard:', err.message);
      const { runInit } = require('./init');
      await runInit();
    }
  });
```

**Step 2: Add init-ui.mjs to package.json files array**

Add `"init-ui.mjs"` to the `files` array in package.json.

**Step 3: Test**

Run:
```bash
node cli.js init
```

Verify the Ink wizard launches. Then test fallback by temporarily renaming init-ui.mjs.

**Step 4: Commit**

```bash
git add cli.js package.json
git commit -m "feat: wire init command to Ink wizard with readline fallback"
```

---

### Task 5: Test, publish, push

**Step 1: Run full test suite**

```bash
npm test
```

All 62 tests must pass.

**Step 2: Manually test the full wizard flow**

```bash
node cli.js init
```

Walk through all 4 steps. Verify:
- Logo renders with color
- Arrow keys move selection
- Completed steps show green checkmarks
- Status line preview updates when arrowing through presets
- Summary shows at the end
- Process actually configures everything (check ~/.tokburn/config.json, ~/.claude/settings.json)

**Step 3: Bump version and publish**

```bash
# Update version in package.json to 0.2.0
npm publish --access public
```

**Step 4: Commit and push**

```bash
git add -A
git commit -m "feat: ship Ink-based init wizard v0.2.0"
git push
```

---

## Dependencies Added

| Package | Size | Purpose |
|---------|------|---------|
| ink | ~50KB | React renderer for CLI |
| @inkjs/ui | ~30KB | Select, Spinner, ProgressBar components |
| react | ~7KB (bundled with ink) | JSX rendering |
| chalk | ~17KB (peer dep of ink) | Terminal colors |

Total added: ~100KB. Reasonable for the UX improvement.
