/**
 * tokburn — card.js
 * Renders collapsible per-task token summary cards.
 * Used by _task-summary command and tokburn live TUI.
 */

const { calculateCost } = require('./costs');

const CARD_WIDTH = 54;
const INNER = CARD_WIDTH - 4; // inside the "| ... |" borders

// ── Public API ──────────────────────────────────────────────────────────────────

function renderCollapsed(taskName, taskTokens, sessionPct) {
  const name = truncate(taskName || 'Task', 26);
  const tok = abbreviate(taskTokens) + ' tok';
  const cost = '$' + estimateCost(taskTokens).toFixed(2);
  const left = Math.max(0, 100 - Math.round(sessionPct)) + '% left';

  const icon = sessionPct >= 90 ? '!!' : '>';
  // Right-align the numbers
  const parts = [tok, cost, left];
  return '  ' + icon + ' ' + name + '  ' + parts.join('  ');
}

function renderExpanded(taskName, taskInput, taskOutput, taskCached,
                        sessionInput, sessionOutput, sessionCost,
                        sessionPct, timeRemaining, requestCount) {
  const lines = [];

  // Header
  lines.push('  v ' + truncate(taskName || 'Task', CARD_WIDTH - 4));

  // Top border
  lines.push('  ' + '\u250c' + '\u2500'.repeat(CARD_WIDTH - 2) + '\u2510');

  // Column layout: left = this task, right = session total
  const midCol = Math.floor(INNER / 2);

  lines.push(boxRow('This Task', 'Session Total', midCol));
  const cachedStr = taskCached > 0 ? ' (' + abbreviate(taskCached) + ' cached)' : '';
  lines.push(boxRow(
    'In:  ' + fmtNum(taskInput) + cachedStr,
    'In:  ' + fmtNum(sessionInput),
    midCol
  ));
  lines.push(boxRow(
    'Out: ' + fmtNum(taskOutput),
    'Out: ' + fmtNum(sessionOutput),
    midCol
  ));

  const taskCostVal = estimateCost(taskInput + taskOutput);
  lines.push(boxRow(
    'Cost: $' + taskCostVal.toFixed(2),
    'Cost: $' + sessionCost.toFixed(2),
    midCol
  ));

  // Empty separator
  lines.push(boxRow('', '', midCol));

  // Progress bar
  const barSpace = CARD_WIDTH - 24; // space for bar + label
  const pctClamped = Math.min(100, Math.max(0, sessionPct));
  const filled = Math.round(barSpace * (pctClamped / 100));
  const empty = barSpace - filled;
  const bar = '\u2588'.repeat(filled) + '\u2591'.repeat(empty);
  const pctLabel = Math.round(sessionPct) + '% of 5hr limit';
  const barLine = bar + '  ' + pctLabel;
  lines.push(padBox(barLine));

  // Time + requests
  const timeStr = timeRemaining ? '~' + timeRemaining + ' remaining' : '';
  const reqStr = requestCount + ' requests today';
  lines.push(boxRow(timeStr, reqStr, midCol));

  // Bottom border
  lines.push('  ' + '\u2514' + '\u2500'.repeat(CARD_WIDTH - 2) + '\u2518');

  return lines.join('\n');
}

// ── Box drawing ─────────────────────────────────────────────────────────────────

function boxRow(left, right, midCol) {
  left = truncate(String(left), midCol - 1);
  right = truncate(String(right), INNER - midCol - 1);

  const leftPadded = left + ' '.repeat(Math.max(0, midCol - left.length));
  const rightPadded = right + ' '.repeat(Math.max(0, INNER - midCol - right.length));
  const content = leftPadded + rightPadded;

  // Ensure exact width
  const trimmed = content.length > INNER
    ? content.substring(0, INNER)
    : content + ' '.repeat(INNER - content.length);

  return '  \u2502 ' + trimmed + ' \u2502';
}

function padBox(content) {
  const str = String(content);
  const trimmed = str.length > INNER
    ? str.substring(0, INNER)
    : str + ' '.repeat(INNER - str.length);
  return '  \u2502 ' + trimmed + ' \u2502';
}

// ── Helpers ─────────────────────────────────────────────────────────────────────

function abbreviate(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return String(n);
}

function fmtNum(n) {
  return n.toLocaleString('en-US');
}

function truncate(str, maxLen) {
  if (str.length <= maxLen) return str;
  return str.substring(0, maxLen - 3) + '...';
}

function estimateCost(tokens) {
  // Assume ~70% input, 30% output, sonnet pricing as default
  const input = Math.round(tokens * 0.7);
  const output = tokens - input;
  return calculateCost('claude-sonnet-4', input, output);
}

module.exports = { renderCollapsed, renderExpanded, CARD_WIDTH };
