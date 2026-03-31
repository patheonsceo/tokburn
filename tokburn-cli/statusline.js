#!/usr/bin/env node
/**
 * tokburn — Status line renderer for Claude Code
 * Reads session JSON from stdin, renders configured modules.
 * Configured via ~/.tokburn/config.json → statusline_modules
 *
 * IMPORTANT: Stdin reading and rendering only happens when run directly.
 * When require()'d as a module, only MODULE_LIST, PRESETS are exported.
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

// ── Helpers ─────────────────────────────────────────────────────────────────────

function dotBar(pct, count) {
  count = count || 10;
  const p = Math.max(0, Math.min(100, pct || 0));
  const filled = Math.round((p / 100) * count);
  return '\u25CF'.repeat(filled) + '\u25CB'.repeat(count - filled);
}

function abbreviate(n) {
  n = n || 0;
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return String(n);
}

function formatResetTime(resetTimestamp) {
  if (!resetTimestamp) return '';
  const reset = new Date(resetTimestamp * 1000);
  const now = new Date();
  const diff = reset - now;

  if (diff <= 0) return 'now';

  const mins = Math.floor(diff / 60000);
  if (mins < 60) return mins + 'min';

  const hrs = Math.floor(mins / 60);
  const remainMins = mins % 60;
  if (hrs < 24) return hrs + 'hr ' + (remainMins > 0 ? remainMins + 'min' : '');

  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const day = days[reset.getDay()];
  const h = reset.getHours();
  const m = reset.getMinutes();
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return day + ' ' + h12 + ':' + String(m).padStart(2, '0') + ampm;
}

// ── Module builders (take data as parameter) ────────────────────────────────────

function buildModules(data) {
  return {
    model_context: function () {
      const model = (data.model && data.model.display_name) || '?';
      const ctxPct = Math.round((data.context_window && data.context_window.used_percentage) || 0);
      return model + ' | ctx ' + ctxPct + '%';
    },

    repo_branch: function () {
      const cwd = (data.workspace && data.workspace.current_dir) || data.cwd || '';
      const repoName = path.basename(cwd);
      let branch = '';
      try {
        branch = execFileSync('git', ['-C', cwd, 'branch', '--show-current'], {
          encoding: 'utf8', timeout: 500, stdio: ['pipe', 'pipe', 'pipe'],
        }).trim();
        const status = execFileSync('git', ['-C', cwd, 'status', '--porcelain'], {
          encoding: 'utf8', timeout: 500, stdio: ['pipe', 'pipe', 'pipe'],
        }).trim();
        if (status) branch += '*';
      } catch (_) {}

      if (branch) return repoName + ' (' + branch + ')';
      return repoName;
    },

    current_limit: function () {
      const rl = data.rate_limits && data.rate_limits.five_hour;
      if (!rl) return 'current  ' + dotBar(0) + '  0%';

      const pct = Math.round(rl.used_percentage || 0);
      const reset = formatResetTime(rl.resets_at);
      return 'current  ' + dotBar(pct) + '  ' + pct + '%' + (reset ? ' \u21BB ' + reset : '');
    },

    weekly_limit: function () {
      const rl = data.rate_limits && data.rate_limits.seven_day;
      if (!rl) return 'weekly   ' + dotBar(0) + '  0%';

      const pct = Math.round(rl.used_percentage || 0);
      const reset = formatResetTime(rl.resets_at);
      return 'weekly   ' + dotBar(pct) + '  ' + pct + '%' + (reset ? ' \u21BB ' + reset : '');
    },

    token_count: function () {
      const inp = (data.context_window && data.context_window.total_input_tokens) || 0;
      const out = (data.context_window && data.context_window.total_output_tokens) || 0;
      return abbreviate(inp + out) + ' tok';
    },

    cost: function () {
      const cost = (data.cost && data.cost.total_cost_usd) || 0;
      return '$' + cost.toFixed(2);
    },

    burn_rate: function () {
      try {
        const usagePath = path.join(process.env.HOME || '', '.tokburn', 'usage.jsonl');
        if (!fs.existsSync(usagePath)) return '';
        const raw = fs.readFileSync(usagePath, 'utf8').trim();
        if (!raw) return '';
        const lines = raw.split('\n');
        const today = new Date().toISOString().split('T')[0];
        const todayEntries = [];
        for (const l of lines) {
          if (!l.startsWith('{"timestamp":"' + today)) continue;
          try { todayEntries.push(JSON.parse(l)); } catch (_) {}
        }
        if (todayEntries.length < 2) return '';
        const first = new Date(todayEntries[0].timestamp);
        const last = new Date(todayEntries[todayEntries.length - 1].timestamp);
        const elapsed = (last - first) / 60000;
        if (elapsed <= 0) return '';
        let total = 0;
        for (const e of todayEntries) total += (e.input_tokens || 0) + (e.output_tokens || 0);
        return '~' + abbreviate(Math.round(total / elapsed)) + '/min';
      } catch (_) {
        return '';
      }
    },
  };
}

// ── Available modules metadata (used by init wizard) ────────────────────────────

const MODULE_LIST = [
  { key: 'model_context',  label: 'Model + context',    example: 'Opus 4.6 | ctx 13%' },
  { key: 'repo_branch',    label: 'Repo + branch',      example: 'tokburn (master*)' },
  { key: 'current_limit',  label: 'Current rate limit',  example: '\u25CB\u25CB\u25CB\u25CB\u25CB\u25CB\u25CB\u25CB\u25CB\u25CB 9% 3hr 32min' },
  { key: 'weekly_limit',   label: 'Weekly rate limit',   example: '\u25CF\u25CF\u25CF\u25CF\u25CB\u25CB\u25CB\u25CB\u25CB\u25CB 45% Fri 12:30PM' },
  { key: 'token_count',    label: 'Token count',         example: '142.8K tok' },
  { key: 'cost',           label: 'Cost estimate',       example: '$1.95' },
  { key: 'burn_rate',      label: 'Burn rate (proxy)',   example: '~2.1K/min' },
];

// ── Presets ──────────────────────────────────────────────────────────────────────

const PRESETS = {
  recommended: ['model_context', 'repo_branch', 'current_limit', 'weekly_limit', 'cost'],
  minimal:     ['model_context', 'current_limit'],
  full:        ['model_context', 'repo_branch', 'current_limit', 'weekly_limit', 'token_count', 'cost', 'burn_rate'],
};

// ── Main: only runs when executed directly (not require'd) ──────────────────────

if (require.main === module) {
  let input = '';
  try {
    input = fs.readFileSync('/dev/stdin', 'utf8');
  } catch (_) {}

  let data = {};
  try {
    data = JSON.parse(input);
  } catch (_) {}

  // Load config
  const configPath = path.join(process.env.HOME || process.env.USERPROFILE, '.tokburn', 'config.json');
  let config = {};
  try {
    if (fs.existsSync(configPath)) {
      config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    }
  } catch (_) {}

  const enabledModules = config.statusline_modules || PRESETS.recommended;
  const modules = buildModules(data);

  const outputLines = [];
  const lineOneModules = [];
  const extraLines = [];

  for (const mod of enabledModules) {
    if (!modules[mod]) continue;
    const val = modules[mod]();
    if (!val) continue;

    if (mod === 'current_limit' || mod === 'weekly_limit') {
      extraLines.push(val);
    } else {
      lineOneModules.push(val);
    }
  }

  if (lineOneModules.length > 0) {
    outputLines.push(lineOneModules.join(' \u2502 '));
  }
  outputLines.push(...extraLines);

  process.stdout.write(outputLines.join('\n'));
}

module.exports = { MODULE_LIST, PRESETS, buildModules };
