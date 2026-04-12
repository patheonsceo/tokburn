/**
 * tokburn — companion.js
 * Tokemon companion system: XP, leveling, evolution, mood, speech bubbles.
 *
 * Data is split into two files to protect progress across reinstalls:
 *   ~/.tokburn/companion.json  — identity (tokemon type, personality, hatch date)
 *   ~/.tokburn/progress.bin    — encoded blob (XP, level, evolutions, session state)
 *
 * Init writes companion.json freely. progress.bin is NEVER touched by init.
 * Progress is XOR-ciphered + HMAC-signed to prevent casual stat editing.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const os = require('os');

const TOKBURN_DIR = path.join(os.homedir(), '.tokburn');
const COMPANION_FILE = path.join(TOKBURN_DIR, 'companion.json');
const PROGRESS_FILE = path.join(TOKBURN_DIR, 'progress.bin');

// Salt for integrity hash — not cryptographic security, just anti-tamper
const INTEGRITY_SALT = 'tokburn:xp:v1:' + os.userInfo().username;

// ── Progress Encoding ─────────────────────────────────────────────────────
// XOR cipher + base64 + HMAC integrity check. Not military-grade,
// but the file is gibberish and edits break the hash.

const XOR_KEY = Buffer.from('t0k3m0n-burn-xp!');

function xorCipher(buf) {
  const out = Buffer.alloc(buf.length);
  for (let i = 0; i < buf.length; i++) {
    out[i] = buf[i] ^ XOR_KEY[i % XOR_KEY.length];
  }
  return out;
}

function computeHash(data) {
  return crypto.createHmac('sha256', INTEGRITY_SALT).update(data).digest('hex');
}

function encodeProgress(obj) {
  const json = JSON.stringify(obj);
  const ciphered = xorCipher(Buffer.from(json, 'utf8'));
  const payload = ciphered.toString('base64');
  const hash = computeHash(payload);
  return hash + '\n' + payload;
}

function decodeProgress(raw) {
  try {
    const newline = raw.indexOf('\n');
    if (newline === -1) return null;
    const hash = raw.slice(0, newline);
    const payload = raw.slice(newline + 1);
    if (computeHash(payload) !== hash) return null; // tampered
    const ciphered = Buffer.from(payload, 'base64');
    const json = xorCipher(ciphered).toString('utf8');
    return JSON.parse(json);
  } catch {
    return null;
  }
}

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

function ensureDir() {
  if (!fs.existsSync(TOKBURN_DIR)) {
    fs.mkdirSync(TOKBURN_DIR, { recursive: true });
  }
}

/** Load identity from companion.json */
function loadIdentity() {
  try {
    if (fs.existsSync(COMPANION_FILE)) {
      return JSON.parse(fs.readFileSync(COMPANION_FILE, 'utf8'));
    }
  } catch { /* corrupted */ }
  return null;
}

/** Load progress from encoded progress.bin */
function loadProgress() {
  try {
    if (fs.existsSync(PROGRESS_FILE)) {
      const raw = fs.readFileSync(PROGRESS_FILE, 'utf8');
      return decodeProgress(raw);
    }
  } catch { /* corrupted or tampered */ }
  return null;
}

/** Save progress to encoded progress.bin */
function saveProgress(progress) {
  ensureDir();
  fs.writeFileSync(PROGRESS_FILE, encodeProgress(progress));
}

/** Create fresh progress (only called when no progress.bin exists) */
function freshProgress() {
  return {
    xp: 0,
    level: 1,
    stage: 1,
    lifetime_lines: 0,
    evolutions: [],
    last_lines_snapshot: 0,
    last_session_id: null,
    last_bubble_at: 0,
    last_bubble_trigger: null,
    triggered_this_session: [],
    last_evolved_at: null,
    last_levelup_at: null,
  };
}

/** Extract progress fields from an old-format companion.json */
function extractProgress(old) {
  return {
    xp: old.xp || 0,
    level: old.level || 1,
    stage: old.stage || 1,
    lifetime_lines: old.lifetime_lines || 0,
    evolutions: old.evolutions || [],
    last_lines_snapshot: old.last_lines_snapshot || 0,
    last_session_id: old.last_session_id || null,
    last_bubble_at: old.last_bubble_at || 0,
    last_bubble_trigger: old.last_bubble_trigger || null,
    triggered_this_session: old.triggered_this_session || [],
    last_evolved_at: old.last_evolved_at || null,
    last_levelup_at: old.last_levelup_at || null,
  };
}

/**
 * Load companion — returns merged identity + progress object.
 * Handles migration from old single-file format.
 * Returns null if no companion is configured.
 */
function loadCompanion() {
  const identity = loadIdentity();
  if (!identity) return null;

  let progress = loadProgress();

  // Migration: old companion.json had xp/level fields inline
  if (!progress && identity.xp !== undefined) {
    progress = extractProgress(identity);
    // Write migrated progress to the encoded file
    saveProgress(progress);
    // Clean old fields from companion.json (keep only identity)
    const cleanIdentity = {
      companion: identity.companion,
      personality: identity.personality,
      hatched: identity.hatched,
    };
    fs.writeFileSync(COMPANION_FILE, JSON.stringify(cleanIdentity, null, 2) + '\n');
  }

  // No progress file and no migration data — fresh start
  if (!progress) {
    progress = freshProgress();
    saveProgress(progress);
  }

  // Merge for backward-compatible interface
  return {
    companion: identity.companion,
    personality: identity.personality,
    hatched: identity.hatched,
    stage_name: getStageName(identity.companion, progress.stage),
    ...progress,
  };
}

/**
 * Save companion — writes ONLY progress.bin. Identity is untouched.
 * Accepts the merged object (same shape loadCompanion returns).
 */
function saveCompanion(data) {
  saveProgress({
    xp: data.xp,
    level: data.level,
    stage: data.stage,
    lifetime_lines: data.lifetime_lines,
    evolutions: data.evolutions,
    last_lines_snapshot: data.last_lines_snapshot,
    last_session_id: data.last_session_id,
    last_bubble_at: data.last_bubble_at,
    last_bubble_trigger: data.last_bubble_trigger,
    triggered_this_session: data.triggered_this_session,
    last_evolved_at: data.last_evolved_at || null,
    last_levelup_at: data.last_levelup_at || null,
  });
}

/**
 * Create companion identity — writes companion.json ONLY.
 * If progress.bin already exists, it is preserved (reinstall-safe).
 * Only creates fresh progress if none exists.
 */
function createCompanion(companion, personality) {
  ensureDir();
  const now = new Date().toISOString().slice(0, 10);
  const identity = { companion, personality, hatched: now };
  fs.writeFileSync(COMPANION_FILE, JSON.stringify(identity, null, 2) + '\n');

  // Only create progress if it doesn't exist — never overwrite earned stats
  let progress = loadProgress();
  if (!progress) {
    progress = freshProgress();
    saveProgress(progress);
  }

  // Return merged object for callers that expect it
  return {
    ...identity,
    stage_name: getStageName(companion, progress.stage),
    ...progress,
  };
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
  loadProgress,
  saveProgress,
  encodeProgress,
  decodeProgress,
  LEVEL_CURVE,
  PROGRESS_FILE,
  COMPANION_FILE,
};
