const fs = require('fs');
const path = require('path');

const TOKBURN_DIR = path.join(process.env.HOME || process.env.USERPROFILE, '.tokburn');
const CONFIG_FILE = path.join(TOKBURN_DIR, 'config.json');

const DEFAULT_CONFIG = {
  port: 4088,
  pricing: {},
  target: 'https://api.anthropic.com',
};

function ensureDir() {
  if (!fs.existsSync(TOKBURN_DIR)) {
    fs.mkdirSync(TOKBURN_DIR, { recursive: true });
  }
}

function getConfig() {
  ensureDir();
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const raw = fs.readFileSync(CONFIG_FILE, 'utf8');
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_CONFIG, ...parsed };
    }
  } catch {
    // Corrupted config, return defaults
  }
  return { ...DEFAULT_CONFIG };
}

function setConfig(updates) {
  ensureDir();
  const current = getConfig();
  const merged = { ...current, ...updates };
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(merged, null, 2) + '\n', 'utf8');
  return merged;
}

function getTokburnDir() {
  return TOKBURN_DIR;
}

module.exports = { getConfig, setConfig, getTokburnDir, DEFAULT_CONFIG };
