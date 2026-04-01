/**
 * tokburn — init.js
 * Interactive setup wizard for Claude Code integration.
 * Configures: plan limits, proxy daemon, shell env var, status line.
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { getConfig, setConfig, getTokburnDir } = require('./config');
const { startDaemon, isRunning } = require('./proxy');

const PLANS = {
  pro:  { window_hours: 5, estimated_tokens: 500000 },
  max:  { window_hours: 5, estimated_tokens: 2000000 },
  api:  { window_hours: 24, estimated_tokens: 10000000 },
};

async function runInit() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const ask = (q) => new Promise((resolve) => rl.question(q, resolve));
  const home = process.env.HOME || process.env.USERPROFILE;

  console.log('');
  console.log('  tokburn setup');
  console.log('  ' + '\u2500'.repeat(35));
  console.log('');

  // ── Detect environment ──────────────────────────────────────────────────────

  const shell = path.basename(process.env.SHELL || 'bash');
  const rcFile = shell === 'zsh' ? '.zshrc' : shell === 'fish' ? '.config/fish/config.fish' : '.bashrc';
  const rcPath = path.join(home, rcFile);
  const claudeDir = path.join(home, '.claude');
  const claudeSettings = path.join(claudeDir, 'settings.json');
  const hasClaudeCode = fs.existsSync(claudeDir);

  console.log('  Detected: ' + shell + ' shell' + (hasClaudeCode ? ', Claude Code installed' : ''));
  console.log('');

  // ── Step 1: Plan ────────────────────────────────────────────────────────────

  console.log('  [1/4] Which Claude plan are you on?');
  console.log('');
  console.log('        1) Pro       ~500K tokens / 5hr window');
  console.log('        2) Max       ~2M tokens / 5hr window');
  console.log('        3) API only  (no plan limits)');
  console.log('');
  const planChoice = (await ask('        > ')).trim();
  const plan = planChoice === '2' ? 'max' : planChoice === '3' ? 'api' : 'pro';
  console.log('');

  // ── Step 2: Proxy ───────────────────────────────────────────────────────────

  console.log('  [2/4] Start the proxy daemon?');
  console.log('        Enables per-request tracking for detailed breakdowns.');
  console.log('');
  console.log('        1) Yes, start now');
  console.log('        2) No, skip');
  console.log('');
  const proxyChoice = (await ask('        > ')).trim();
  const wantProxy = proxyChoice !== '2';
  console.log('');

  if (wantProxy) {
    if (isRunning()) {
      console.log('  Proxy already running.');
    } else {
      const result = startDaemon();
      console.log('  ' + result.message);
    }
    console.log('');
  }

  // ── Step 3: Shell config ────────────────────────────────────────────────────

  let addedShellConfig = false;

  if (wantProxy) {
    console.log('  [3/4] Add ANTHROPIC_BASE_URL to ~/' + rcFile + '?');
    console.log('        Required for the proxy to intercept API calls.');
    console.log('');
    console.log('        1) Yes, add it');
    console.log('        2) No, I\'ll do it manually');
    console.log('');
    const shellChoice = (await ask('        > ')).trim();
    console.log('');

    if (shellChoice !== '2') {
      const config = getConfig();
      const envLine = `export ANTHROPIC_BASE_URL=http://127.0.0.1:${config.port}`;
      const existing = fs.existsSync(rcPath) ? fs.readFileSync(rcPath, 'utf8') : '';

      if (existing.includes('ANTHROPIC_BASE_URL')) {
        console.log('  ANTHROPIC_BASE_URL already in ~/' + rcFile);
      } else {
        fs.appendFileSync(rcPath, '\n# tokburn proxy\n' + envLine + '\n');
        console.log('  Added to ~/' + rcFile);
        addedShellConfig = true;
      }
      console.log('');
    }
  } else {
    console.log('  [3/4] Skipping shell config (no proxy).');
    console.log('');
  }

  // ── Step 4: Claude Code status line ─────────────────────────────────────────

  if (hasClaudeCode) {
    console.log('  [4/4] Configure Claude Code status line?');
    console.log('');
    console.log('        1) Recommended   model | ctx% | repo | limits | cost');
    console.log('        2) Minimal       model | current rate limit');
    console.log('        3) Full          everything including burn rate');
    console.log('        4) Custom        pick your own modules');
    console.log('        5) Skip');
    console.log('');
    const ccChoice = (await ask('        > ')).trim();
    console.log('');

    let selectedModules = null;

    if (ccChoice === '1' || ccChoice === '') {
      const { PRESETS } = require('./statusline');
      selectedModules = PRESETS.recommended;
    } else if (ccChoice === '2') {
      const { PRESETS } = require('./statusline');
      selectedModules = PRESETS.minimal;
    } else if (ccChoice === '3') {
      const { PRESETS } = require('./statusline');
      selectedModules = PRESETS.full;
    } else if (ccChoice === '4') {
      // Custom picker
      const { MODULE_LIST, PRESETS } = require('./statusline');
      const enabled = new Set(PRESETS.recommended); // start with recommended

      let picking = true;
      while (picking) {
        console.log('  Status line modules:');
        console.log('');
        for (let i = 0; i < MODULE_LIST.length; i++) {
          const m = MODULE_LIST[i];
          const check = enabled.has(m.key) ? 'x' : ' ';
          const num = String(i + 1);
          const label = m.label.padEnd(22);
          console.log('    [' + check + '] ' + num + '. ' + label + m.example);
        }
        console.log('');
        console.log('  Toggle a number (1-' + MODULE_LIST.length + '), or press enter to confirm:');
        const toggle = (await ask('        > ')).trim();

        if (toggle === '') {
          picking = false;
        } else {
          const idx = parseInt(toggle, 10) - 1;
          if (idx >= 0 && idx < MODULE_LIST.length) {
            const key = MODULE_LIST[idx].key;
            if (enabled.has(key)) {
              enabled.delete(key);
            } else {
              enabled.add(key);
            }
          }
          console.log('');
        }
      }

      selectedModules = MODULE_LIST.filter(m => enabled.has(m.key)).map(m => m.key);
      console.log('');
    }

    if (selectedModules) {
      // Save module selection to config
      setConfig({ statusline_modules: selectedModules });

      // Install status line script (Node.js version)
      const srcScript = path.join(__dirname, 'statusline.js');
      const destScript = path.join(claudeDir, 'tokburn-statusline.js');

      if (fs.existsSync(srcScript)) {
        fs.copyFileSync(srcScript, destScript);
        fs.chmodSync(destScript, '755');
      }

      // Update Claude Code settings
      let settings = {};
      if (fs.existsSync(claudeSettings)) {
        try {
          settings = JSON.parse(fs.readFileSync(claudeSettings, 'utf8'));
        } catch (_) {}
      }

      settings.statusLine = {
        type: 'command',
        command: destScript,
      };

      if (!fs.existsSync(claudeDir)) {
        fs.mkdirSync(claudeDir, { recursive: true });
      }
      fs.writeFileSync(claudeSettings, JSON.stringify(settings, null, 2) + '\n');

      console.log('  Status line configured with ' + selectedModules.length + ' modules.');

      // Show preview
      console.log('');
      console.log('  Preview:');
      const lineOne = [];
      for (const mod of selectedModules) {
        if (mod === 'current_limit') continue;
        if (mod === 'weekly_limit') continue;
        const { MODULE_LIST } = require('./statusline');
        const info = MODULE_LIST.find(m => m.key === mod);
        if (info) lineOne.push(info.example);
      }
      if (lineOne.length > 0) {
        console.log('  ' + lineOne.join(' \u2502 '));
      }
      if (selectedModules.includes('current_limit')) {
        const { MODULE_LIST } = require('./statusline');
        const info = MODULE_LIST.find(m => m.key === 'current_limit');
        console.log('  current  ' + info.example);
      }
      if (selectedModules.includes('weekly_limit')) {
        const { MODULE_LIST } = require('./statusline');
        const info = MODULE_LIST.find(m => m.key === 'weekly_limit');
        console.log('  weekly   ' + info.example);
      }
      console.log('');
    }
  } else {
    console.log('  [4/4] Claude Code not detected, skipping.');
    console.log('');
  }

  // ── Save config ─────────────────────────────────────────────────────────────

  setConfig({ plan: plan, limits: PLANS });

  // ── Done ────────────────────────────────────────────────────────────────────

  console.log('  ' + '\u2500'.repeat(35));
  console.log('  Done. tokburn is ready.');
  console.log('');
  console.log('  Commands:');
  console.log('    tokburn status   check proxy + today\'s usage');
  console.log('    tokburn today    detailed breakdown by model');
  console.log('    tokburn live     real-time TUI dashboard');
  console.log('');

  if (addedShellConfig) {
    console.log('  Run `source ~/' + rcFile + '` to activate, or open a new terminal.');
    console.log('');
  }

  rl.close();
}

// ── Exported config functions (used by Ink UI) ──────────────────────────────

function detectEnvironment() {
  const home = process.env.HOME || process.env.USERPROFILE;
  const shell = path.basename(process.env.SHELL || 'bash');
  const rcFile = shell === 'zsh' ? '.zshrc' : shell === 'fish' ? '.config/fish/config.fish' : '.bashrc';
  const rcPath = path.join(home, rcFile);
  const claudeDir = path.join(home, '.claude');
  const claudeSettings = path.join(claudeDir, 'settings.json');
  const hasClaudeCode = fs.existsSync(claudeDir);

  return { home, shell, rcFile, rcPath, claudeDir, claudeSettings, hasClaudeCode };
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
