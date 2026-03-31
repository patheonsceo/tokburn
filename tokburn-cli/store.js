const fs = require('fs');
const path = require('path');
const { getTokburnDir } = require('./config');

const USAGE_FILE = path.join(getTokburnDir(), 'usage.jsonl');

function getAllEntries() {
  try {
    if (!fs.existsSync(USAGE_FILE)) return [];
    const raw = fs.readFileSync(USAGE_FILE, 'utf8').trim();
    if (!raw) return [];
    return raw.split('\n').map(line => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    }).filter(Boolean);
  } catch {
    return [];
  }
}

function dateStr(d) {
  return d.toISOString().split('T')[0];
}

function todayStr() {
  return dateStr(new Date());
}

function getToday() {
  const today = todayStr();
  return getAllEntries().filter(e => {
    try {
      return e.timestamp && e.timestamp.startsWith(today);
    } catch {
      return false;
    }
  });
}

function getRange(startDate, endDate) {
  const start = typeof startDate === 'string' ? startDate : dateStr(startDate);
  const end = typeof endDate === 'string' ? endDate : dateStr(endDate);
  return getAllEntries().filter(e => {
    try {
      const d = e.timestamp.split('T')[0];
      return d >= start && d <= end;
    } catch {
      return false;
    }
  });
}

function getWeek() {
  const now = new Date();
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  return getRange(sevenDaysAgo, now);
}

function clearToday() {
  try {
    const today = todayStr();
    const entries = getAllEntries().filter(e => {
      try {
        return !e.timestamp.startsWith(today);
      } catch {
        return true;
      }
    });
    const dir = getTokburnDir();
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (entries.length === 0) {
      fs.writeFileSync(USAGE_FILE, '', 'utf8');
    } else {
      fs.writeFileSync(USAGE_FILE, entries.map(e => JSON.stringify(e)).join('\n') + '\n', 'utf8');
    }
  } catch {
    // Fail silently
  }
}

function exportCSV() {
  const entries = getAllEntries();
  const header = 'timestamp,model,input_tokens,output_tokens,conversation_id,latency_ms';
  const rows = entries.map(e => {
    return [
      e.timestamp || '',
      e.model || '',
      e.input_tokens || 0,
      e.output_tokens || 0,
      e.conversation_id || '',
      e.latency_ms || '',
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
    const d = e.timestamp.split('T')[0];
    if (byDay[d]) {
      byDay[d].push(e);
    }
  }
  return byDay;
}

module.exports = { getAllEntries, getToday, getRange, getWeek, clearToday, exportCSV, getWeekByDay };
