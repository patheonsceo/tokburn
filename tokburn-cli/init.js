/**
 * tokburn — init.js
 * Interactive setup wizard for Claude Code integration.
 * Configures: plan limits, status line.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const readline = require('readline');
const { getConfig, setConfig, getTokburnDir } = require('./config');

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
  const claudeDir = path.join(home, '.claude');
  const hasClaudeCode = fs.existsSync(claudeDir);

  console.log('  Detected: ' + shell + ' shell' + (hasClaudeCode ? ', Claude Code installed' : ''));
  console.log('');

  // ── Step 1: Plan ────────────────────────────────────────────────────────────

  console.log('  [1/2] Which Claude plan are you on?');
  console.log('');
  console.log('        1) Pro       ~500K usage limit / 5hr');
  console.log('        2) Max       ~2M usage limit / 5hr');
  console.log('        3) API only  (no plan limits)');
  console.log('');
  const planChoice = (await ask('        > ')).trim();
  const plan = planChoice === '2' ? 'max' : planChoice === '3' ? 'api' : 'pro';
  console.log('');

  // ── Step 2: Claude Code status line ─────────────────────────────────────────

  if (hasClaudeCode) {
    console.log('  [2/2] Configure Claude Code status line?');
    console.log('');
    console.log('        1) Recommended   all modules enabled');
    console.log('        2) Minimal       model + context + 5hr limit');
    console.log('        3) Custom        pick your own modules');
    console.log('        4) Skip');
    console.log('');
    const ccChoice = (await ask('        > ')).trim();
    console.log('');

    let selectedElements = null;

    if (ccChoice === '1' || ccChoice === '') {
      const { ALL_RICH_KEYS } = require('./statusline');
      selectedElements = ALL_RICH_KEYS.slice();
    } else if (ccChoice === '2') {
      const { RICH_PRESETS } = require('./statusline');
      selectedElements = RICH_PRESETS.minimal.slice();
    } else if (ccChoice === '3') {
      const { RICH_ELEMENTS, ALL_RICH_KEYS } = require('./statusline');
      const enabled = new Set(ALL_RICH_KEYS);

      let picking = true;
      while (picking) {
        let currentLine = 0;
        console.log('  Status line modules:');
        console.log('');
        for (let i = 0; i < RICH_ELEMENTS.length; i++) {
          const el = RICH_ELEMENTS[i];
          if (el.line !== currentLine) {
            currentLine = el.line;
            console.log('    LINE ' + el.line);
          }
          const check = enabled.has(el.key) ? 'x' : ' ';
          const num = String(i + 1).padStart(2);
          const label = el.label.padEnd(20);
          console.log('    [' + check + '] ' + num + '. ' + label + el.example);
        }
        console.log('');
        console.log('  Toggle (1-' + RICH_ELEMENTS.length + '), or press enter to confirm:');
        const toggle = (await ask('        > ')).trim();

        if (toggle === '') {
          picking = false;
        } else {
          const idx = parseInt(toggle, 10) - 1;
          if (idx >= 0 && idx < RICH_ELEMENTS.length) {
            const key = RICH_ELEMENTS[idx].key;
            if (enabled.has(key)) enabled.delete(key);
            else enabled.add(key);
          }
          console.log('');
        }
      }

      selectedElements = RICH_ELEMENTS.filter(el => enabled.has(el.key)).map(el => el.key);
      console.log('');
    }

    if (selectedElements) {
      configureStatusLine(['rich'], selectedElements);
      console.log('  Status line configured with ' + selectedElements.length + ' modules.');
      console.log('');
    }
  } else {
    console.log('  [2/2] Claude Code not detected, skipping status line.');
    console.log('');
  }

  // ── Save config ─────────────────────────────────────────────────────────────

  setConfig({ plan: plan, limits: PLANS });

  // ── Done ────────────────────────────────────────────────────────────────────

  console.log('  ' + '\u2500'.repeat(35));
  console.log('  Done. tokburn is ready.');
  console.log('');

  rl.close();
}

// ── Exported config functions (used by Ink UI) ──────────────────────────────

function detectEnvironment() {
  const home = process.env.HOME || process.env.USERPROFILE;
  const shell = path.basename(process.env.SHELL || 'bash');
  const claudeDir = path.join(home, '.claude');
  const claudeSettings = path.join(claudeDir, 'settings.json');
  const hasClaudeCode = fs.existsSync(claudeDir);

  return { home, shell, claudeDir, claudeSettings, hasClaudeCode };
}

function configurePlan(plan) {
  setConfig({ plan, limits: PLANS });
}

function configureStatusLine(selectedModules, elements) {
  const home = process.env.HOME || process.env.USERPROFILE;
  const claudeDir = path.join(home, '.claude');
  const claudeSettings = path.join(claudeDir, 'settings.json');

  const update = { statusline_modules: selectedModules };
  if (elements) update.statusline_elements = elements;
  setConfig(update);

  // Point to the npm-installed statusline.js (needs sibling modules)
  const scriptPath = path.join(__dirname, 'statusline.js');

  // Remove stale standalone copy if it exists
  const oldScript = path.join(claudeDir, 'tokburn-statusline.js');
  if (fs.existsSync(oldScript)) {
    try { fs.unlinkSync(oldScript); } catch (_) {}
  }

  let settings = {};
  if (fs.existsSync(claudeSettings)) {
    try { settings = JSON.parse(fs.readFileSync(claudeSettings, 'utf8')); } catch (_) {}
  }

  settings.statusLine = { type: 'command', command: scriptPath, refreshInterval: 1 };

  if (!fs.existsSync(claudeDir)) {
    fs.mkdirSync(claudeDir, { recursive: true });
  }
  fs.writeFileSync(claudeSettings, JSON.stringify(settings, null, 2) + '\n');
}

function uninstallTokburn() {
  const home = process.env.HOME || process.env.USERPROFILE;

  // Remove stale standalone copy if it exists
  const statuslineFile = path.join(home, '.claude', 'tokburn-statusline.js');
  if (fs.existsSync(statuslineFile)) fs.unlinkSync(statuslineFile);

  // Remove tokburn statusLine from settings.json
  const claudeSettings = path.join(home, '.claude', 'settings.json');
  if (fs.existsSync(claudeSettings)) {
    try {
      const settings = JSON.parse(fs.readFileSync(claudeSettings, 'utf8'));
      if (settings.statusLine && settings.statusLine.command && settings.statusLine.command.includes('tokburn')) {
        delete settings.statusLine;
      }
      fs.writeFileSync(claudeSettings, JSON.stringify(settings, null, 2) + '\n');
    } catch (_) {}
  }

  // Remove companion config
  const companionPath = path.join(os.homedir(), '.tokburn', 'companion.json');
  if (fs.existsSync(companionPath)) fs.unlinkSync(companionPath);

  // Clean config
  const configFile = path.join(home, '.tokburn', 'config.json');
  if (fs.existsSync(configFile)) fs.unlinkSync(configFile);
}

function configureCompanion(companion, personality) {
  const { createCompanion } = require('./companion');
  createCompanion(companion, personality);
  setConfig({ companion, personality });
}

module.exports = {
  runInit, detectEnvironment, configurePlan,
  configureStatusLine, configureCompanion, uninstallTokburn, PLANS
};
