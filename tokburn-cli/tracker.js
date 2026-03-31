const fs = require('fs');
const path = require('path');
const { getTokburnDir } = require('./config');

const USAGE_FILE = path.join(getTokburnDir(), 'usage.jsonl');

function ensureDir() {
  const dir = getTokburnDir();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function logUsage({ model, input_tokens, output_tokens, conversation_id, latency_ms }) {
  try {
    ensureDir();
    const entry = {
      timestamp: new Date().toISOString(),
      model: model || 'unknown',
      input_tokens: input_tokens || 0,
      output_tokens: output_tokens || 0,
      conversation_id: conversation_id || null,
      latency_ms: latency_ms || null,
    };
    fs.appendFileSync(USAGE_FILE, JSON.stringify(entry) + '\n', 'utf8');
  } catch {
    // Never let logging errors propagate
  }
}

function getUsageFilePath() {
  return USAGE_FILE;
}

module.exports = { logUsage, getUsageFilePath };
