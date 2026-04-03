/**
 * tokburn — store.js
 * Reads usage data from Claude Code's JSONL session logs.
 * Primary source: ~/.claude/projects/**\/*.jsonl
 * Fallback: ~/.tokburn/usage.jsonl (legacy proxy data)
 */

const fs = require('fs');
const path = require('path');
const { getTokburnDir } = require('./config');
const { calculateCost } = require('./costs');

const CLAUDE_PROJECTS_DIR = path.join(process.env.HOME || process.env.USERPROFILE, '.claude', 'projects');
const LEGACY_USAGE_FILE = path.join(getTokburnDir(), 'usage.jsonl');

// ── JSONL Parsing ───────────────────────────────────────────────────────────

/**
 * Parse a single Claude Code JSONL entry into a normalized usage record.
 * Returns null if the entry has no usage data.
 */
function parseEntry(entry) {
  let inputTokens = 0;
  let outputTokens = 0;
  let model = null;
  let timestamp = null;
  let costUSD = null;

  // Direct usage field
  if (entry.usage) {
    inputTokens = entry.usage.input_tokens || 0;
    outputTokens = entry.usage.output_tokens || 0;
  }

  // Message with usage (Claude Code's primary format)
  if (entry.message && entry.message.usage) {
    inputTokens = entry.message.usage.input_tokens || inputTokens;
    outputTokens = entry.message.usage.output_tokens || outputTokens;
  }

  // Model
  model = entry.model || (entry.message && entry.message.model) || null;

  // Timestamp
  timestamp = entry.timestamp || null;

  // costUSD (if Claude Code provides it)
  if (entry.costUSD) {
    costUSD = entry.costUSD;
  }

  if (inputTokens === 0 && outputTokens === 0) return null;

  return {
    timestamp,
    model,
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    costUSD,
  };
}

/**
 * Parse all usage entries from a JSONL file.
 */
function parseJsonlFile(filePath) {
  const entries = [];
  try {
    const content = fs.readFileSync(filePath, 'utf8').trim();
    if (!content) return entries;

    for (const line of content.split('\n')) {
      try {
        const raw = JSON.parse(line);
        const parsed = parseEntry(raw);
        if (parsed) entries.push(parsed);
      } catch {
        // Skip unparseable lines
      }
    }
  } catch {
    // Skip unreadable files
  }
  return entries;
}

// ── Directory Traversal ─────────────────────────────────────────────────────

/**
 * Find all JSONL files in Claude Code's projects directory.
 * Optionally filter by minimum modification time for performance.
 */
function findJsonlFiles(dir, minMtime) {
  const files = [];
  try {
    const items = fs.readdirSync(dir, { withFileTypes: true });
    for (const item of items) {
      const fullPath = path.join(dir, item.name);
      if (item.isDirectory()) {
        files.push(...findJsonlFiles(fullPath, minMtime));
      } else if (item.name.endsWith('.jsonl')) {
        if (minMtime) {
          try {
            const stat = fs.statSync(fullPath);
            if (stat.mtimeMs < minMtime) continue;
          } catch {
            continue;
          }
        }
        files.push(fullPath);
      }
    }
  } catch {
    // Skip inaccessible directories
  }
  return files;
}

/**
 * Get all usage entries from Claude Code logs, optionally filtered by date range.
 * Also merges legacy proxy data if it exists.
 */
function getEntries(options) {
  const { startDate, endDate, maxAgeDays } = options || {};
  const entries = [];

  // Determine mtime filter for performance
  let minMtime = null;
  if (maxAgeDays) {
    minMtime = Date.now() - (maxAgeDays * 24 * 60 * 60 * 1000);
  }

  // Read Claude Code JSONL logs
  if (fs.existsSync(CLAUDE_PROJECTS_DIR)) {
    const files = findJsonlFiles(CLAUDE_PROJECTS_DIR, minMtime);
    for (const file of files) {
      entries.push(...parseJsonlFile(file));
    }
  }

  // Merge legacy proxy data if it exists
  if (fs.existsSync(LEGACY_USAGE_FILE)) {
    entries.push(...parseJsonlFile(LEGACY_USAGE_FILE));
  }

  // Filter by date range
  if (startDate || endDate) {
    const start = startDate || '0000-00-00';
    const end = endDate || '9999-99-99';
    return entries.filter(e => {
      if (!e.timestamp) return false;
      const d = e.timestamp.split('T')[0];
      return d >= start && d <= end;
    });
  }

  return entries;
}

// ── Public API ──────────────────────────────────────────────────────────────

function dateStr(d) {
  return d.toISOString().split('T')[0];
}

function todayStr() {
  return dateStr(new Date());
}

function getAllEntries() {
  return getEntries();
}

function getToday() {
  const today = todayStr();
  return getEntries({ startDate: today, endDate: today, maxAgeDays: 1 });
}

function getWeek() {
  const now = new Date();
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  return getEntries({ startDate: dateStr(sevenDaysAgo), endDate: dateStr(now), maxAgeDays: 7 });
}

function getRange(startDate, endDate) {
  const start = typeof startDate === 'string' ? startDate : dateStr(startDate);
  const end = typeof endDate === 'string' ? endDate : dateStr(endDate);
  return getEntries({ startDate: start, endDate: end });
}

function clearToday() {
  // Only clears legacy proxy data — Claude Code logs are read-only
  try {
    if (!fs.existsSync(LEGACY_USAGE_FILE)) return;
    const today = todayStr();
    const entries = parseJsonlFile(LEGACY_USAGE_FILE).filter(e => {
      if (!e.timestamp) return true;
      return !e.timestamp.startsWith(today);
    });
    const dir = getTokburnDir();
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (entries.length === 0) {
      fs.writeFileSync(LEGACY_USAGE_FILE, '', 'utf8');
    } else {
      fs.writeFileSync(LEGACY_USAGE_FILE, entries.map(e => JSON.stringify(e)).join('\n') + '\n', 'utf8');
    }
  } catch {
    // Fail silently
  }
}

function exportCSV() {
  const entries = getAllEntries();
  const header = 'timestamp,model,input_tokens,output_tokens';
  const rows = entries.map(e => {
    return [
      e.timestamp || '',
      e.model || '',
      e.input_tokens || 0,
      e.output_tokens || 0,
    ].join(',');
  });
  return [header, ...rows].join('\n') + '\n';
}

function getWeekByDay() {
  const entries = getWeek();
  const byDay = {};
  // Initialize all 7 days
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    byDay[dateStr(d)] = [];
  }
  for (const e of entries) {
    if (!e.timestamp) continue;
    const d = e.timestamp.split('T')[0];
    if (byDay[d]) {
      byDay[d].push(e);
    }
  }
  return byDay;
}

/**
 * Find the most recently modified JSONL file (for live tailing).
 */
function getMostRecentLogFile() {
  if (!fs.existsSync(CLAUDE_PROJECTS_DIR)) return null;

  let newest = null;
  let newestMtime = 0;

  const files = findJsonlFiles(CLAUDE_PROJECTS_DIR, null);
  for (const file of files) {
    try {
      const stat = fs.statSync(file);
      if (stat.mtimeMs > newestMtime) {
        newestMtime = stat.mtimeMs;
        newest = file;
      }
    } catch {
      // Skip
    }
  }

  return newest;
}

module.exports = {
  getAllEntries, getToday, getRange, getWeek, clearToday,
  exportCSV, getWeekByDay, getMostRecentLogFile, parseJsonlFile,
};
