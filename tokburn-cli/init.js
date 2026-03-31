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

  // ── Step 4: Claude Code integration ─────────────────────────────────────────

  if (hasClaudeCode) {
    console.log('  [4/4] Configure Claude Code status line?');
    console.log('        Shows token usage below the input bar.');
    console.log('');
    console.log('        1) Yes, set it up');
    console.log('        2) No, skip');
    console.log('');
    const ccChoice = (await ask('        > ')).trim();
    console.log('');

    if (ccChoice !== '2') {
      // Copy status line script
      const srcScript = path.join(__dirname, 'statusline.sh');
      const destScript = path.join(claudeDir, 'tokburn-statusline.sh');

      if (fs.existsSync(srcScript)) {
        fs.copyFileSync(srcScript, destScript);
        fs.chmodSync(destScript, '755');
      }

      // Read existing settings
      let settings = {};
      if (fs.existsSync(claudeSettings)) {
        try {
          settings = JSON.parse(fs.readFileSync(claudeSettings, 'utf8'));
        } catch (_) {}
      }

      // Set status line
      settings.statusLine = {
        type: 'command',
        command: destScript,
      };

      // Write back
      if (!fs.existsSync(claudeDir)) {
        fs.mkdirSync(claudeDir, { recursive: true });
      }
      fs.writeFileSync(claudeSettings, JSON.stringify(settings, null, 2) + '\n');
      console.log('  Status line configured.');
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

module.exports = { runInit };
