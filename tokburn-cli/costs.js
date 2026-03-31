const { getConfig } = require('./config');

// Pricing per million tokens (USD)
const DEFAULT_PRICING = {
  'claude-opus-4': { input: 15, output: 75 },
  'claude-sonnet-4': { input: 3, output: 15 },
  'claude-haiku-4': { input: 0.80, output: 4 },
  // Older model variants
  'claude-3-5-sonnet-20241022': { input: 3, output: 15 },
  'claude-3-5-sonnet-latest': { input: 3, output: 15 },
  'claude-3-5-haiku-20241022': { input: 0.80, output: 4 },
  'claude-3-5-haiku-latest': { input: 0.80, output: 4 },
  'claude-3-opus-20240229': { input: 15, output: 75 },
  'claude-3-opus-latest': { input: 15, output: 75 },
  'claude-3-sonnet-20240229': { input: 3, output: 15 },
  'claude-3-haiku-20240307': { input: 0.25, output: 1.25 },
  'claude-sonnet-4-20250514': { input: 3, output: 15 },
  'claude-opus-4-20250514': { input: 15, output: 75 },
  'claude-haiku-4-20250514': { input: 0.80, output: 4 },
};

// Map known partial names to their pricing tier
const MODEL_ALIASES = {
  'claude-3-5-sonnet': 'claude-sonnet-4',
  'claude-3-opus': 'claude-opus-4',
  'claude-3-sonnet': 'claude-sonnet-4',
  'claude-3-haiku': 'claude-haiku-4',
  'claude-3.5-sonnet': 'claude-sonnet-4',
  'claude-3.5-haiku': 'claude-haiku-4',
};

function resolveModel(model) {
  if (!model) return null;
  // Direct match
  const pricing = getPricing();
  if (pricing[model]) return model;
  // Check aliases
  for (const [alias, resolved] of Object.entries(MODEL_ALIASES)) {
    if (model.startsWith(alias)) return resolved;
  }
  // Try prefix matching: find longest matching key
  const keys = Object.keys(pricing).sort((a, b) => b.length - a.length);
  for (const key of keys) {
    if (model.startsWith(key) || key.startsWith(model)) return key;
  }
  // Fallback: try to detect tier from name
  if (model.includes('opus')) return 'claude-opus-4';
  if (model.includes('sonnet')) return 'claude-sonnet-4';
  if (model.includes('haiku')) return 'claude-haiku-4';
  return null;
}

function getPricing() {
  const config = getConfig();
  return { ...DEFAULT_PRICING, ...(config.pricing || {}) };
}

function calculateCost(model, input_tokens, output_tokens) {
  const pricing = getPricing();
  const resolved = resolveModel(model);
  if (!resolved || !pricing[resolved]) {
    // Fallback to sonnet pricing as a reasonable default
    return (input_tokens / 1_000_000) * 3 + (output_tokens / 1_000_000) * 15;
  }
  const rates = pricing[resolved];
  return (input_tokens / 1_000_000) * rates.input + (output_tokens / 1_000_000) * rates.output;
}

module.exports = { calculateCost, getPricing, resolveModel, DEFAULT_PRICING };
