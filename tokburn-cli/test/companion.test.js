/**
 * tokburn — companion.test.js
 * Tests for the Tokemon companion system.
 */

const assert = require('assert');
const {
  getLevel,
  getStageName,
  getMood,
  calculateXPDiff,
  checkBubbleTriggers,
} = require('../companion');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  PASS  ${name}`);
    passed++;
  } catch (err) {
    console.log(`  FAIL  ${name}`);
    console.log(`        ${err.message}`);
    failed++;
  }
}

// ── getLevel ───────────────────────────────────────────────────────────────

test('getLevel(0) => level 1, stage 1', () => {
  const r = getLevel(0);
  assert.strictEqual(r.level, 1);
  assert.strictEqual(r.stage, 1);
});

test('getLevel(100) => level 2, stage 1', () => {
  const r = getLevel(100);
  assert.strictEqual(r.level, 2);
  assert.strictEqual(r.stage, 1);
});

test('getLevel(1150) => level 5, stage 2', () => {
  const r = getLevel(1150);
  assert.strictEqual(r.level, 5);
  assert.strictEqual(r.stage, 2);
});

test('getLevel(49850) => level 15, stage 3', () => {
  const r = getLevel(49850);
  assert.strictEqual(r.level, 15);
  assert.strictEqual(r.stage, 3);
});

test('getLevel(64850) => level 16, stage 3 (post-max)', () => {
  const r = getLevel(64850);
  assert.strictEqual(r.level, 16);
  assert.strictEqual(r.stage, 3);
});

// ── getStageName ───────────────────────────────────────────────────────────

test("getStageName('flint', 1) => 'Flint'", () => {
  assert.strictEqual(getStageName('flint', 1), 'Flint');
});

test("getStageName('flint', 2) => 'Blaze'", () => {
  assert.strictEqual(getStageName('flint', 2), 'Blaze');
});

test("getStageName('flint', 3) => 'Inferno'", () => {
  assert.strictEqual(getStageName('flint', 3), 'Inferno');
});

test("getStageName('pixel', 2) => 'Codec'", () => {
  assert.strictEqual(getStageName('pixel', 2), 'Codec');
});

test("getStageName('mochi', 3) => 'Nimbus'", () => {
  assert.strictEqual(getStageName('mochi', 3), 'Nimbus');
});

// ── getMood ────────────────────────────────────────────────────────────────

test("getMood(0) => 'chill'", () => {
  assert.strictEqual(getMood(0), 'chill');
});

test("getMood(29) => 'chill'", () => {
  assert.strictEqual(getMood(29), 'chill');
});

test("getMood(30) => 'alert'", () => {
  assert.strictEqual(getMood(30), 'alert');
});

test("getMood(59) => 'alert'", () => {
  assert.strictEqual(getMood(59), 'alert');
});

test("getMood(60) => 'stressed'", () => {
  assert.strictEqual(getMood(60), 'stressed');
});

test("getMood(84) => 'stressed'", () => {
  assert.strictEqual(getMood(84), 'stressed');
});

test("getMood(85) => 'panic'", () => {
  assert.strictEqual(getMood(85), 'panic');
});

test("getMood(100) => 'panic'", () => {
  assert.strictEqual(getMood(100), 'panic');
});

// ── calculateXPDiff ────────────────────────────────────────────────────────

test('calculateXPDiff same session, positive diff => 50', () => {
  assert.strictEqual(calculateXPDiff(100, 50, 'sess1', 'sess1'), 50);
});

test('calculateXPDiff same session, negative diff => 0', () => {
  assert.strictEqual(calculateXPDiff(100, 150, 'sess1', 'sess1'), 0);
});

test('calculateXPDiff new session => currentLines (100)', () => {
  assert.strictEqual(calculateXPDiff(100, 50, 'sess2', 'sess1'), 100);
});

// ── checkBubbleTriggers ────────────────────────────────────────────────────

test("checkBubbleTriggers with justEvolved => 'evolution'", () => {
  const result = checkBubbleTriggers(
    { rateLimitPct: 0, linesAdded: 0, justEvolved: true },
    { triggered_this_session: [] }
  );
  assert.strictEqual(result, 'evolution');
});

test("checkBubbleTriggers rateLimitPct=90 => 'rate_limit_90'", () => {
  const result = checkBubbleTriggers(
    { rateLimitPct: 90, linesAdded: 0, justEvolved: false },
    { triggered_this_session: [] }
  );
  assert.strictEqual(result, 'rate_limit_90');
});

test('checkBubbleTriggers dedup (already triggered) => null', () => {
  const result = checkBubbleTriggers(
    { rateLimitPct: 90, linesAdded: 0, justEvolved: false },
    { triggered_this_session: ['rate_limit_90', 'rate_limit_75', 'rate_limit_50'] }
  );
  assert.strictEqual(result, null);
});

// ── Summary ────────────────────────────────────────────────────────────────

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed > 0 ? 1 : 0);
