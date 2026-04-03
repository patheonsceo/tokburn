#!/usr/bin/env node
/**
 * tokburn — Status line renderer for Claude Code
 * Reads session JSON from stdin, renders a rich, colorful multi-line status.
 * No proxy needed — all data comes from Claude Code's native JSON.
 *
 * Configured via ~/.tokburn/config.json → statusline_modules
 *
 * IMPORTANT: Stdin reading and rendering only happens when run directly.
 * When require()'d as a module, only MODULE_LIST, PRESETS are exported.
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

// ── ANSI Colors ─────────────────────────────────────────────────────────────

const C = {
  green:   '\x1b[32m',
  yellow:  '\x1b[33m',
  red:     '\x1b[31m',
  cyan:    '\x1b[36m',
  magenta: '\x1b[35m',
  dim:     '\x1b[90m',
  bold:    '\x1b[1m',
  reset:   '\x1b[0m',
};

// ── Helpers ─────────────────────────────────────────────────────────────────

function abbreviate(n) {
  n = n || 0;
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return String(n);
}

function abbreviateSize(n) {
  n = n || 0;
  if (n >= 1000000) return (n / 1000000).toFixed(0) + 'M';
  if (n >= 100000) return (n / 1000).toFixed(0) + 'K';
  if (n >= 1000) return (n / 1000).toFixed(0) + 'K';
  return String(n);
}

function pctColor(pct) {
  if (pct >= 80) return C.red;
  if (pct >= 50) return C.yellow;
  return C.green;
}

function progressBar(pct, width) {
  width = width || 10;
  const p = Math.max(0, Math.min(100, pct || 0));
  const filled = Math.round((p / 100) * width);
  const empty = width - filled;
  return C.green + '\u2588'.repeat(filled) + C.dim + '\u2591'.repeat(empty) + C.reset;
}

function formatTimeRemaining(resetEpoch) {
  if (!resetEpoch) return '';
  const now = Math.floor(Date.now() / 1000);
  const diff = resetEpoch - now;
  if (diff <= 0) return 'now';

  const days = Math.floor(diff / 86400);
  const hrs = Math.floor((diff % 86400) / 3600);
  const mins = Math.floor((diff % 3600) / 60);

  if (days > 0) return days + 'd' + hrs + 'h';
  if (hrs > 0) return hrs + 'h' + (mins > 0 ? mins + 'm' : '');
  return mins + 'm';
}

function formatResetTarget(resetEpoch) {
  if (!resetEpoch) return '';
  const reset = new Date(resetEpoch * 1000);
  const now = new Date();
  const diff = resetEpoch - Math.floor(now.getTime() / 1000);

  if (diff <= 0) return 'now';

  // If resets within 24 hours, show time like "10:00"
  if (diff < 86400) {
    const h = reset.getHours();
    const m = reset.getMinutes();
    return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
  }

  // Otherwise show date like "04/05"
  const mo = String(reset.getMonth() + 1).padStart(2, '0');
  const day = String(reset.getDate()).padStart(2, '0');
  return mo + '/' + day;
}

// ── Rich Element Definitions (for customizer) ──────────────────────────────

const RICH_ELEMENTS = [
  { key: 'model',        line: 1, label: 'Model + context',  example: 'Opus 4.6 (1M context)' },
  { key: 'plan',         line: 1, label: 'Plan tier',        example: '\u00b7Max' },
  { key: 'context_bar',  line: 1, label: 'Context bar',      example: '\u2588\u2588\u2588\u2588\u2588\u2588\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591 31%' },
  { key: 'branch',       line: 1, label: 'Git branch',       example: 'main*' },
  { key: 'session_cost', line: 1, label: 'Session cost',     example: '$3.69' },
  { key: 'limit_5h',     line: 2, label: '5hr rate limit',   example: '5h 27% 3h25m\u219210:00' },
  { key: 'limit_7d',     line: 2, label: '7day rate limit',  example: '7d 75% 1d16h\u219204/05' },
  { key: 'burn_rate',    line: 2, label: 'Burn rate',        example: '\uD83D\uDD25$4.9/h' },
  { key: 'tokens',       line: 3, label: 'Token counts',     example: '$3.69 D:37K/152K' },
  { key: 'lines',        line: 3, label: 'Lines changed',    example: '+156/-23' },
  { key: 'directory',    line: 3, label: 'Directory',        example: 'tokburn' },
];

const ALL_RICH_KEYS = RICH_ELEMENTS.map(e => e.key);

const RICH_PRESETS = {
  recommended: ALL_RICH_KEYS.slice(),
  minimal: ['model', 'context_bar', 'limit_5h'],
  full: ALL_RICH_KEYS.slice(),
};

// ── Line Builders ───────────────────────────────────────────────────────────

function buildLine1(data, config, has) {
  const parts = [];
  const SEP = C.dim + ' | ' + C.reset;

  // Model + Plan (joined with ·)
  const model = (data.model && data.model.display_name) || '';
  if (has('model') && model) {
    const ctxSize = (data.context_window && data.context_window.context_window_size) || 0;
    const sizeLabel = ctxSize > 0 ? ' (' + abbreviateSize(ctxSize) + ' context)' : '';
    let modelPart = C.cyan + model + sizeLabel + C.reset;

    if (has('plan')) {
      const plan = config.plan || '';
      if (plan && plan !== 'api') {
        modelPart += C.dim + '\u00b7' + C.reset + C.green + plan.charAt(0).toUpperCase() + plan.slice(1) + C.reset;
      }
    }
    parts.push(modelPart);
  } else if (has('plan')) {
    const plan = config.plan || '';
    if (plan && plan !== 'api') {
      parts.push(C.green + plan.charAt(0).toUpperCase() + plan.slice(1) + C.reset);
    }
  }

  // Context bar
  if (has('context_bar')) {
    const ctxPct = Math.round((data.context_window && data.context_window.used_percentage) || 0);
    parts.push(progressBar(ctxPct, 20) + ' ' + ctxPct + '%');
  }

  // Git branch
  if (has('branch')) {
    const cwd = (data.workspace && data.workspace.current_dir) || data.cwd || '';
    if (cwd) {
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
      if (branch) parts.push(C.magenta + branch + C.reset);
    }
  }

  // Session cost
  if (has('session_cost')) {
    const cost = (data.cost && data.cost.total_cost_usd) || 0;
    parts.push('$' + cost.toFixed(2));
  }

  return parts.join(SEP);
}

function buildLine2(data, has) {
  const parts = [];
  const SEP = C.dim + ' | ' + C.reset;

  if (has('limit_5h')) {
    const fiveHr = data.rate_limits && data.rate_limits.five_hour;
    if (fiveHr) {
      const pct = Math.round(fiveHr.used_percentage || 0);
      const timeLeft = formatTimeRemaining(fiveHr.resets_at);
      const resetTarget = formatResetTarget(fiveHr.resets_at);
      const arrow = timeLeft && resetTarget ? timeLeft + '\u2192' + resetTarget : timeLeft || resetTarget;
      parts.push(
        C.dim + '5h ' + C.reset +
        pctColor(pct) + pct + '%' + C.reset + ' ' +
        C.dim + arrow + C.reset
      );
    }
  }

  if (has('limit_7d')) {
    const sevenDay = data.rate_limits && data.rate_limits.seven_day;
    if (sevenDay) {
      const pct = Math.round(sevenDay.used_percentage || 0);
      const timeLeft = formatTimeRemaining(sevenDay.resets_at);
      const resetTarget = formatResetTarget(sevenDay.resets_at);
      const arrow = timeLeft && resetTarget ? timeLeft + '\u2192' + resetTarget : timeLeft || resetTarget;
      parts.push(
        C.dim + '7d ' + C.reset +
        pctColor(pct) + pct + '%' + C.reset + ' ' +
        C.dim + arrow + C.reset
      );
    }
  }

  if (has('burn_rate')) {
    const cost = (data.cost && data.cost.total_cost_usd) || 0;
    const durationMs = (data.cost && data.cost.total_duration_ms) || 0;
    if (cost > 0 && durationMs > 60000) {
      const hours = durationMs / 3600000;
      const perHour = cost / hours;
      const formatted = perHour >= 10 ? '$' + perHour.toFixed(0) + '/h'
        : perHour >= 1 ? '$' + perHour.toFixed(1) + '/h'
        : '$' + perHour.toFixed(2) + '/h';
      parts.push('\uD83D\uDD25' + C.dim + formatted + C.reset);
    }
  }

  return parts.join(SEP);
}

function buildLine3(data, has) {
  const parts = [];
  const SEP = C.dim + ' | ' + C.reset;

  if (has('tokens')) {
    const cost = (data.cost && data.cost.total_cost_usd) || 0;
    const inputTok = (data.context_window && data.context_window.total_input_tokens) || 0;
    const outputTok = (data.context_window && data.context_window.total_output_tokens) || 0;
    let tokenPart = '$' + cost.toFixed(2);
    if (inputTok > 0 || outputTok > 0) {
      tokenPart += ' D:' + abbreviate(inputTok) + '/' + abbreviate(outputTok);
    }
    parts.push(tokenPart);
  }

  if (has('lines')) {
    const added = (data.cost && data.cost.total_lines_added) || 0;
    const removed = (data.cost && data.cost.total_lines_removed) || 0;
    parts.push(
      C.green + '+' + added + C.reset +
      '/' +
      C.red + '-' + removed + C.reset
    );
  }

  if (has('directory')) {
    const cwd = (data.workspace && data.workspace.current_dir) || data.cwd || '';
    if (cwd) parts.push(path.basename(cwd));
  }

  return parts.join(SEP);
}

// ── Legacy module builders (backward compat for old presets) ────────────────

function dotBar(pct, count) {
  count = count || 10;
  const p = Math.max(0, Math.min(100, pct || 0));
  const filled = Math.round((p / 100) * count);
  return '\u25CF'.repeat(filled) + '\u25CB'.repeat(count - filled);
}

function buildLegacyModules(data) {
  return {
    model_context: function () {
      const model = (data.model && data.model.display_name)
        || (data.model && data.model.id)
        || '';
      const ctxPct = Math.round((data.context_window && data.context_window.used_percentage) || 0);
      if (!model) return 'ctx ' + ctxPct + '%';
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
      const reset = formatResetTarget(rl.resets_at);
      return 'current  ' + dotBar(pct) + '  ' + pct + '%' + (reset ? ' \u21BB ' + reset : '');
    },

    weekly_limit: function () {
      const rl = data.rate_limits && data.rate_limits.seven_day;
      if (!rl) return 'weekly   ' + dotBar(0) + '  0%';
      const pct = Math.round(rl.used_percentage || 0);
      const reset = formatResetTarget(rl.resets_at);
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
  };
}

// ── Available modules metadata (used by init wizard) ────────────────────────

const MODULE_LIST = [
  { key: 'model_context',  label: 'Model + context',    example: 'Opus 4.6 | ctx 13%' },
  { key: 'repo_branch',    label: 'Repo + branch',      example: 'tokburn (master*)' },
  { key: 'current_limit',  label: 'Current rate limit',  example: '\u25CB\u25CB\u25CB\u25CB\u25CB\u25CB\u25CB\u25CB\u25CB\u25CB 9% 3hr 32min' },
  { key: 'weekly_limit',   label: 'Weekly rate limit',   example: '\u25CF\u25CF\u25CF\u25CF\u25CB\u25CB\u25CB\u25CB\u25CB\u25CB 45% Fri 12:30PM' },
  { key: 'token_count',    label: 'Token count',         example: '142.8K tok' },
  { key: 'cost',           label: 'Cost estimate',       example: '$1.95' },
];

// ── Presets ──────────────────────────────────────────────────────────────────

const PRESETS = {
  recommended: ['rich'],  // new default: the rich 3-line status
  minimal:     ['model_context', 'current_limit'],
  full:        ['rich'],
};

// ── Main: only runs when executed directly (not require'd) ──────────────────

if (require.main === module) {
  let input = '';
  try {
    input = fs.readFileSync(0, 'utf8');
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

  // Rich mode: 3-line colorful status
  if (enabledModules.length === 1 && enabledModules[0] === 'rich') {
    const elements = new Set(config.statusline_elements || ALL_RICH_KEYS);
    const has = (key) => elements.has(key);
    const lines = [];
    const l1 = buildLine1(data, config, has);
    if (l1) lines.push(l1);
    const l2 = buildLine2(data, has);
    if (l2) lines.push(l2);
    const l3 = buildLine3(data, has);
    if (l3) lines.push(l3);
    process.stdout.write(lines.join('\n'));
  } else {
    // Legacy module mode
    const modules = buildLegacyModules(data);
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
}

module.exports = { MODULE_LIST, PRESETS, RICH_ELEMENTS, RICH_PRESETS, ALL_RICH_KEYS, buildModules: buildLegacyModules };
