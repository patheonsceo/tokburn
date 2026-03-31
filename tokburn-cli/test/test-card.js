#!/usr/bin/env node
/**
 * tokburn — Card rendering tests
 * Verifies box alignment, truncation, and edge cases.
 */

const { renderCollapsed, renderExpanded, CARD_WIDTH } = require('../card');

let passed = 0;
let failed = 0;

function assert(name, condition) {
  if (condition) {
    passed++;
  } else {
    failed++;
    console.log('  FAIL: ' + name);
  }
}

// ── Collapsed card tests ────────────────────────────────────────────────────────

console.log('\n  Card rendering tests');
console.log('  ' + '='.repeat(40) + '\n');

const collapsed = renderCollapsed('Refactored auth middleware', 12400, 74);
assert('Collapsed contains task name', collapsed.includes('Refactored auth'));
assert('Collapsed contains tokens', collapsed.includes('12.4K'));
assert('Collapsed contains % left', collapsed.includes('26% left'));
assert('Collapsed is single line', !collapsed.includes('\n'));

// Long name truncation
const longName = renderCollapsed('A very long task name that exceeds the maximum width allowed', 500, 10);
assert('Long name gets truncated', longName.includes('...'));
assert('Long collapsed stays reasonable length', longName.length < 100);

// Edge: zero tokens
const zero = renderCollapsed('Empty task', 0, 0);
assert('Zero tokens renders', zero.includes('0'));
assert('Zero pct shows 100% left', zero.includes('100% left'));

// Edge: at limit
const full = renderCollapsed('Maxed out', 500000, 100);
assert('100% shows 0% left', full.includes('0% left'));

// Edge: over limit
const over = renderCollapsed('Over limit', 600000, 120);
assert('Over 100% clamps to 0% left', over.includes('0% left'));

// Warning state
const warning = renderCollapsed('Danger zone', 450000, 95);
assert('High usage shows !! icon', warning.includes('!!'));

// ── Expanded card tests ─────────────────────────────────────────────────────────

const expanded = renderExpanded(
  'Refactored auth middleware', 8200, 4200, 2000,
  142800, 58200, 1.95, 74, '1hr 18min', 23
);
const lines = expanded.split('\n');

// Verify box structure
const topBorder = lines.find(l => l.includes('\u250c'));
const bottomBorder = lines.find(l => l.includes('\u2514'));
assert('Has top border', !!topBorder);
assert('Has bottom border', !!bottomBorder);

// Verify all box body lines end with closing border
const bodyLines = lines.filter(l => l.includes('\u2502'));
for (let i = 0; i < bodyLines.length; i++) {
  const trimmed = bodyLines[i].trimEnd();
  assert('Box line ' + i + ' ends with border', trimmed.endsWith('\u2502'));
}

// Content checks
assert('Expanded has task name', expanded.includes('Refactored auth'));
assert('Expanded has This Task header', expanded.includes('This Task'));
assert('Expanded has Session Total header', expanded.includes('Session Total'));
assert('Expanded has session input', expanded.includes('142,800'));
assert('Expanded has cached indicator', expanded.includes('cached'));
assert('Expanded has progress bar', expanded.includes('\u2588'));
assert('Expanded has time remaining', expanded.includes('1hr 18min'));
assert('Expanded has request count', expanded.includes('23 requests'));

// Without cache
const noCache = renderExpanded(
  'No cache', 5000, 2000, 0,
  50000, 20000, 0.50, 30, '2hr 10min', 10
);
assert('No cache hides cached label', !noCache.includes('cached'));

// Very small numbers
const tiny = renderExpanded(
  'Tiny', 10, 5, 0,
  10, 5, 0.00, 0.003, null, 1
);
assert('Tiny numbers render', tiny.includes('10'));

// ── Summary ─────────────────────────────────────────────────────────────────────

console.log(`\n  Card tests: ${passed} passed, ${failed} failed\n`);
process.exit(failed > 0 ? 1 : 0);
