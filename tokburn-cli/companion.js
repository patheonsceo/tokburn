/**
 * tokburn — companion.js
 * Tokemon companion system: XP, leveling, evolution, mood, speech bubbles.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const COMPANION_FILE = path.join(os.homedir(), '.tokburn', 'companion.json');

// ── Level Curve ────────────────────────────────────────────────────────────
// Index = level-1, value = XP needed to advance FROM that level to the next.
// Level 1 starts at 0 cumulative XP. Post-15 levels cost 5000 each.

const LEVEL_CURVE = [
  0, 500, 1000, 1500, 2000, 2500, 3000, 3500, 4000, 4500, 5000, 5500, 6000, 6000, 5000,
];

const STAGE_THRESHOLDS = { 2: 5, 3: 15 };

const STAGE_NAMES = {
  flint: ['Flint', 'Blaze', 'Inferno'],
  pixel: ['Pixel', 'Codec', 'Daemon'],
  mochi: ['Mochi', 'Puff', 'Nimbus'],
};

// ── getLevel(xp) ──────────────────────────────────────────────────────────

function getLevel(xp) {
  let cumulative = 0;
  let level = 1;

  // LEVEL_CURVE[0] is padding. Cost from level L to L+1 = LEVEL_CURVE[L].
  for (let i = 1; i < LEVEL_CURVE.length; i++) {
    const cost = LEVEL_CURVE[i];
    if (xp < cumulative + cost) {
      return {
        level,
        stage: getStage(level),
        xpForNext: cost - (xp - cumulative),
        xpIntoLevel: xp - cumulative,
      };
    }
    cumulative += cost;
    level++;
  }

  // Post-max: level 15+ at 5000 XP each
  const postMaxCost = 5000;
  const remaining = xp - cumulative;
  const extraLevels = Math.floor(remaining / postMaxCost);
  level += extraLevels;
  const xpIntoLevel = remaining - extraLevels * postMaxCost;

  return {
    level,
    stage: getStage(level),
    xpForNext: postMaxCost - xpIntoLevel,
    xpIntoLevel,
  };
}

function getStage(level) {
  if (level >= STAGE_THRESHOLDS[3]) return 3;
  if (level >= STAGE_THRESHOLDS[2]) return 2;
  return 1;
}

// ── getStageName(companion, stage) ─────────────────────────────────────────

function getStageName(companion, stage) {
  const names = STAGE_NAMES[companion];
  if (!names) return companion;
  return names[stage - 1] || names[0];
}

// ── getMood(rateLimitPct) ──────────────────────────────────────────────────

function getMood(rateLimitPct) {
  if (rateLimitPct >= 85) return 'panic';
  if (rateLimitPct >= 60) return 'stressed';
  if (rateLimitPct >= 30) return 'alert';
  return 'chill';
}

// ── calculateXPDiff ────────────────────────────────────────────────────────

function calculateXPDiff(currentLines, lastSnapshot, currentSession, lastSession) {
  if (currentSession !== lastSession) return currentLines;
  return Math.max(0, currentLines - lastSnapshot);
}

// ── checkBubbleTriggers ────────────────────────────────────────────────────

function checkBubbleTriggers(state, companionData) {
  const { rateLimitPct, linesAdded, justEvolved } = state;
  const triggered = companionData.triggered_this_session || [];

  if (justEvolved) return 'evolution';

  const checks = [
    ['rate_limit_90', () => rateLimitPct >= 90],
    ['rate_limit_75', () => rateLimitPct >= 75],
    ['rate_limit_50', () => rateLimitPct >= 50],
    ['lines_2000', () => linesAdded >= 2000],
    ['lines_1000', () => linesAdded >= 1000],
    ['lines_500', () => linesAdded >= 500],
    ['chill', () => rateLimitPct < 10],
  ];

  for (const [name, test] of checks) {
    if (test() && !triggered.includes(name)) return name;
  }

  return null;
}

// ── File I/O ───────────────────────────────────────────────────────────────

function loadCompanion() {
  try {
    if (fs.existsSync(COMPANION_FILE)) {
      const raw = fs.readFileSync(COMPANION_FILE, 'utf8');
      return JSON.parse(raw);
    }
  } catch {
    // Corrupted or missing
  }
  return null;
}

function saveCompanion(data) {
  const dir = path.dirname(COMPANION_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(COMPANION_FILE, JSON.stringify(data, null, 2) + '\n');
}

function createCompanion(companion, personality) {
  const now = new Date().toISOString().slice(0, 10);
  const data = {
    companion,
    personality,
    level: 1,
    xp: 0,
    stage: 1,
    stage_name: getStageName(companion, 1),
    hatched: now,
    lifetime_lines: 0,
    evolutions: [],
    last_lines_snapshot: 0,
    last_session_id: null,
    last_bubble_at: 0,
    last_bubble_trigger: null,
    triggered_this_session: [],
  };
  saveCompanion(data);
  return data;
}

// ── Exports ────────────────────────────────────────────────────────────────

module.exports = {
  getLevel,
  getStageName,
  getMood,
  calculateXPDiff,
  checkBubbleTriggers,
  loadCompanion,
  saveCompanion,
  createCompanion,
  LEVEL_CURVE,
};
