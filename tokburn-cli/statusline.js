#!/usr/bin/env node
/**
 * tokburn — Tokemon status line renderer for Claude Code
 * Reads session JSON from stdin, renders a Tokemon sprite alongside
 * a 6-line rich status with bars, stats, and personality quips.
 *
 * Performance target: <5ms render. Zero external dependencies for rendering.
 * Animation: refreshInterval=1 in Claude Code settings, expression cycling
 * via Date.now() for ~2fps blink/mood transitions.
 *
 * When require()'d as module: exports bar renderers + constants for init-ui.
 * When run directly: reads stdin JSON, renders, updates XP, outputs to stdout.
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

// ── ANSI Truecolor Helpers ─────────────────────────────────────────────────

const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const DIM = '\x1b[90m';

function fg(r, g, b) { return `\x1b[38;2;${r};${g};${b}m`; }

// Muted accent colors (not neon — subtle, tasteful)
const CLR = {
  green:  fg(80, 180, 80),
  yellow: fg(200, 170, 60),
  red:    fg(200, 70, 70),
};

// ── Helpers ────────────────────────────────────────────────────────────────

function abbreviate(n) {
  n = n || 0;
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return String(n);
}

function abbreviateSize(n) {
  n = n || 0;
  if (n >= 1000000) return (n / 1000000).toFixed(0) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(0) + 'K';
  return String(n);
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
  const diff = resetEpoch - Math.floor(Date.now() / 1000);
  if (diff <= 0) return 'now';
  if (diff < 86400) {
    return String(reset.getHours()).padStart(2, '0') + ':' + String(reset.getMinutes()).padStart(2, '0');
  }
  return String(reset.getMonth() + 1).padStart(2, '0') + '/' + String(reset.getDate()).padStart(2, '0');
}

// ── Bar Renderers (3 tiers of visual weight) ───────────────────────────────

const barGreen  = fg(70, 160, 70);
const barYellow = fg(180, 150, 50);
const barRed    = fg(180, 60, 60);
const barEmpty  = fg(60, 60, 60);
const xpFill    = fg(200, 150, 50);

function barColor(pct) {
  return pct >= 80 ? barRed : pct >= 50 ? barYellow : barGreen;
}

function pctColor(pct) {
  return pct >= 80 ? CLR.red : pct >= 50 ? CLR.yellow : CLR.green;
}

// Context: thin solid line ━─ (heaviest)
function contextBar(pct, width) {
  const filled = Math.round((pct / 100) * width);
  const empty = width - filled;
  return barColor(pct) + '\u2501'.repeat(filled) + RESET + barEmpty + '\u2500'.repeat(empty) + RESET;
}

// Rate limits: diamonds ◆◇ (medium)
function limitBar(pct, width) {
  const filled = Math.round((pct / 100) * width);
  const empty = width - filled;
  return barColor(pct) + '\u25C6'.repeat(filled) + RESET + barEmpty + '\u25C7'.repeat(empty) + RESET;
}

// XP: triangular blocks ▰▱ (lightest)
function xpBar(pct, width) {
  const clamped = Math.max(0, Math.min(100, pct));
  const filled = Math.min(width, Math.round((clamped / 100) * width));
  const empty = width - filled;
  return xpFill + '\u25B0'.repeat(filled) + RESET + barEmpty + '\u25B1'.repeat(empty) + RESET;
}

// ── Line Builders ──────────────────────────────────────────────────────────
// COLOR RULE: White = facts. Dim = structure. Green/Yellow/Red = bars ONLY.

const SEP = DIM + ' | ' + RESET;

function buildLine1(data, config) {
  const parts = [];

  // Model·Plan
  const model = (data.model && data.model.display_name) || 'Claude Code';
  // Only append size if display_name doesn't already include it
  const ctxSize = (data.context_window && data.context_window.context_window_size) || 0;
  const alreadyHasSize = /\d+[KMG]?\s*(context|ctx)/i.test(model);
  const sizeLabel = (!alreadyHasSize && ctxSize > 0) ? ' (' + abbreviateSize(ctxSize) + ')' : '';
  let modelPart = model + sizeLabel;

  const plan = config.plan || '';
  if (plan && plan !== 'api') {
    modelPart += DIM + '\u00b7' + RESET + plan.charAt(0).toUpperCase() + plan.slice(1);
  }
  parts.push(modelPart);

  // Context bar + percentage
  const ctxPct = Math.round((data.context_window && data.context_window.used_percentage) || 0);
  parts.push(contextBar(ctxPct, 20) + ' ' + pctColor(ctxPct) + ctxPct + '%' + RESET);

  return parts.join(' ');
}

function buildLine2(data) {
  const parts = [];

  // 5hr rate limit
  const fiveHr = data.rate_limits && data.rate_limits.five_hour;
  if (fiveHr) {
    const pct = Math.round(fiveHr.used_percentage || 0);
    const timeLeft = formatTimeRemaining(fiveHr.resets_at);
    const resetTarget = formatResetTarget(fiveHr.resets_at);
    const arrow = timeLeft && resetTarget ? timeLeft + '\u2192' + resetTarget : timeLeft || resetTarget;
    parts.push(
      DIM + '5h ' + RESET + limitBar(pct, 10) + ' ' + pctColor(pct) + pct + '%' + RESET +
      DIM + ' ' + arrow + RESET
    );
  }

  // 7day rate limit
  const sevenDay = data.rate_limits && data.rate_limits.seven_day;
  if (sevenDay) {
    const pct = Math.round(sevenDay.used_percentage || 0);
    const timeLeft = formatTimeRemaining(sevenDay.resets_at);
    const resetTarget = formatResetTarget(sevenDay.resets_at);
    const arrow = timeLeft && resetTarget ? timeLeft + '\u2192' + resetTarget : timeLeft || resetTarget;
    parts.push(
      DIM + '7d ' + RESET + limitBar(pct, 10) + ' ' + pctColor(pct) + pct + '%' + RESET +
      DIM + ' ' + arrow + RESET
    );
  }

  return parts.join(SEP);
}

function buildLine3(data) {
  const parts = [];

  // Lines changed
  const added = (data.cost && data.cost.total_lines_added) || 0;
  const removed = (data.cost && data.cost.total_lines_removed) || 0;
  parts.push(CLR.green + '+' + added + RESET + DIM + ' / ' + RESET + CLR.red + '-' + removed + RESET);

  // Tokens in/out
  const inputTok = (data.context_window && data.context_window.total_input_tokens) || 0;
  const outputTok = (data.context_window && data.context_window.total_output_tokens) || 0;
  if (inputTok > 0 || outputTok > 0) {
    parts.push(DIM + '\u2193' + RESET + abbreviate(inputTok) + ' ' + DIM + '\u2191' + RESET + abbreviate(outputTok));
  }

  // Git branch
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
    if (branch) parts.push(DIM + '\u2387 ' + RESET + branch);
  }

  return parts.join(SEP);
}

function buildLine4() {
  return DIM + '\u254C'.repeat(44) + RESET;
}

function buildLine5(companionData, levelInfo, celebrating, leveledUp) {
  const stageName = companionData.stage_name || 'Unknown';
  const level = levelInfo.level;
  const nextLevel = level + 1;
  const totalLevelCost = levelInfo.xpIntoLevel + levelInfo.xpForNext;
  const xpPct = totalLevelCost > 0
    ? Math.round((levelInfo.xpIntoLevel / totalLevelCost) * 100)
    : 100;

  if (celebrating) {
    return fg(255, 220, 50) + '\u2605 ' + RESET + BOLD + 'Lv.' + level + RESET + ' ' +
      fg(255, 220, 50) + stageName + RESET + fg(255, 220, 50) + ' \u2014 EVOLVED!' + RESET +
      fg(255, 220, 50) + ' \u2605' + RESET;
  }

  if (leveledUp) {
    return fg(255, 220, 50) + 'Lv.' + level + ' ' + stageName + RESET + ' ' +
      xpBar(0, 8) + fg(255, 220, 50) + ' LEVEL UP!' + RESET;
  }

  return BOLD + 'Lv.' + level + RESET + ' ' + stageName + ' ' +
    xpBar(xpPct, 8) + DIM + ' \u2192 Lv.' + nextLevel + RESET;
}

function buildLine6(personality, trigger, mood) {
  const { getMessage, getWatchEmoji } = require('./personality');
  const emoji = getWatchEmoji();
  const message = getMessage(personality, trigger, mood);
  return emoji + DIM + ' "' + message + '"' + RESET;
}

// ── Expression Selection ───────────────────────────────────────────────────

function pickExpression(mood) {
  if (mood === 'panic') return 'panic';
  if (mood === 'stressed') return 'stress';

  // Idle cycle: 20-second loop with natural varied rhythm
  // Real creatures don't blink on a metronome — mix spacings
  const IDLE_CYCLE = [
    'normal', 'normal', 'normal', 'normal',   // 0-3:   4s opening rest
    'blink',                                   // 4:     first blink
    'normal', 'normal',                        // 5-6:   2s pause
    'blink',                                   // 7:     quick double-blink
    'normal', 'normal', 'normal', 'normal',   // 8-11:  4s rest
    'normal', 'normal',                        // 12-13: 6s total long rest
    'blink',                                   // 14:    isolated blink
    'normal', 'normal',                        // 15-16: 2s pause
    'happy',                                   // 17:    rare smile
    'normal', 'normal',                        // 18-19: 2s recovery
  ];
  const second = Math.floor(Date.now() / 1000);
  return IDLE_CYCLE[second % IDLE_CYCLE.length];
}

// ── Module Exports (for init-ui.mjs) ───────────────────────────────────────

module.exports = { contextBar, limitBar, xpBar, barColor, pctColor, pickExpression };

// ── Main: only runs when executed directly ─────────────────────────────────

if (require.main === module) {
  // Read stdin JSON — skip if stdin is a TTY (not piped)
  // During idle refreshInterval calls, Claude Code may not pipe stdin,
  // so reading fd 0 would block on the terminal. Skip and use empty data.
  let input = '';
  try {
    if (!process.stdin.isTTY) {
      input = fs.readFileSync(0, 'utf8');
    }
  } catch (_) {}
  let data = {};
  try { data = JSON.parse(input); } catch (_) {}

  // Load config
  const { getConfig } = require('./config');
  const config = getConfig();

  // Load companion
  const { loadCompanion, saveCompanion, getLevel, getStageName, getMood, calculateXPDiff, checkBubbleTriggers } = require('./companion');
  let comp = loadCompanion();

  // No companion? Show text-only fallback
  if (!comp) {
    const ctxPct = Math.round((data.context_window && data.context_window.used_percentage) || 0);
    const model = (data.model && data.model.display_name) || 'Claude Code';
    process.stdout.write(model + ' | ctx ' + ctxPct + '% | run "tokburn init" to get your Tokemon');
    process.exit(0);
  }

  // Calculate mood from 5hr rate limit
  const fiveHrPct = (data.rate_limits && data.rate_limits.five_hour && data.rate_limits.five_hour.used_percentage) || 0;
  const mood = getMood(Math.round(fiveHrPct));

  // Update XP from lines added
  const currentLines = (data.cost && data.cost.total_lines_added) || 0;
  const sessionId = (data.session && data.session.id) || (data.conversation_id) || 'unknown';

  // Detect new session: total_lines_added resets to 0 in new sessions.
  // When sessionId is unavailable ("unknown"), this is the only signal.
  if (comp.last_session_id && currentLines < comp.last_lines_snapshot) {
    comp.last_lines_snapshot = 0;
    comp.triggered_this_session = [];
  }

  // First ever run — establish baseline, don't grant retroactive XP
  let xpGained = 0;
  if (!comp.last_session_id) {
    comp.last_lines_snapshot = currentLines;
    comp.last_session_id = sessionId;
    comp.triggered_this_session = [];
    saveCompanion(comp);
  } else {
    xpGained = calculateXPDiff(currentLines, comp.last_lines_snapshot, sessionId, comp.last_session_id);
  }

  let justEvolved = false;
  if (xpGained > 0) {
    const oldLevel = getLevel(comp.xp);
    comp.xp += xpGained;
    comp.lifetime_lines += xpGained;
    comp.last_lines_snapshot = currentLines;
    comp.last_session_id = sessionId;

    const newLevel = getLevel(comp.xp);
    comp.level = newLevel.level;

    // Check for level-up (not evolution)
    if (newLevel.level > oldLevel.level && newLevel.stage === oldLevel.stage) {
      comp.last_levelup_at = Date.now();
      saveCompanion(comp);
    }

    // Check for evolution
    if (newLevel.stage > oldLevel.stage) {
      justEvolved = true;
      comp.stage = newLevel.stage;
      comp.stage_name = getStageName(comp.companion, newLevel.stage);
      comp.last_evolved_at = Date.now();
      comp.evolutions.push({
        to: newLevel.stage,
        name: comp.stage_name,
        date: new Date().toISOString().slice(0, 10),
        at_lines: comp.lifetime_lines,
      });
    }

    saveCompanion(comp);
  } else if (sessionId !== comp.last_session_id) {
    // New session — reset tracking
    comp.last_lines_snapshot = currentLines;
    comp.last_session_id = sessionId;
    comp.triggered_this_session = [];
    saveCompanion(comp);
  }

  // Check bubble triggers
  const trigger = checkBubbleTriggers(
    { rateLimitPct: Math.round(fiveHrPct), linesAdded: comp.lifetime_lines, justEvolved },
    comp
  );
  if (trigger) {
    comp.last_bubble_at = Math.floor(Date.now() / 1000);
    comp.last_bubble_trigger = trigger;
    if (!comp.triggered_this_session) comp.triggered_this_session = [];
    comp.triggered_this_session.push(trigger);
    saveCompanion(comp);
  }

  // Evolution celebration lasts 30 seconds
  const evolvedRecently = comp.last_evolved_at && (Date.now() - comp.last_evolved_at) < 30000;
  if (evolvedRecently) justEvolved = true;

  // Level-up highlight lasts 5 seconds
  const justLeveledUp = !justEvolved && comp.last_levelup_at && (Date.now() - comp.last_levelup_at) < 5000;

  // Determine if bubble is active
  const bubbleAge = Math.floor(Date.now() / 1000) - (comp.last_bubble_at || 0);
  const bubbleDuration = comp.last_bubble_trigger === 'evolution' ? 30 : 10;
  const activeTrigger = bubbleAge < bubbleDuration ? comp.last_bubble_trigger : null;

  // Pick expression
  const expression = justEvolved ? 'happy' : pickExpression(mood);

  // Get level info
  const levelInfo = getLevel(comp.xp);

  // Render sprite
  const { renderSprite, getSprite } = require('./sprites');
  const spritePixels = getSprite(comp.companion, comp.stage, expression);
  const spriteRows = renderSprite(spritePixels);
  const spriteWidth = spritePixels[0].length;

  // Build 6 text lines
  const personality = comp.personality || config.personality || 'sassy';
  const textLines = [
    buildLine1(data, config),
    buildLine2(data),
    buildLine3(data),
    buildLine4(),
    buildLine5(comp, levelInfo, justEvolved, justLeveledUp),
    buildLine6(personality, activeTrigger, mood),
  ];

  // Join sprite + divider + text side by side
  // All sprite rows now use half-block characters (even empty cells),
  // guaranteeing consistent width and preventing whitespace stripping
  const divider = DIM + ' \u2502 ' + RESET;
  const outputLines = [];

  for (let i = 0; i < Math.max(spriteRows.length, textLines.length); i++) {
    const spr = spriteRows[i] || '';
    const txt = textLines[i] || '';
    outputLines.push(spr + divider + txt);
  }

  process.stdout.write(outputLines.join('\n'));
}
