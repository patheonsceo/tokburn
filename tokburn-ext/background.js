/**
 * tokburn — background.js
 * Service worker that manages chrome.storage.local for token usage data.
 * Receives messages from content script, accumulates per-conversation and daily totals.
 */

// ── Helpers ────────────────────────────────────────────────────────────────────

function getTodayKey() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getDefaultSettings() {
  return {
    daily_limit_estimate: 500000,
    warning_threshold_1: 0.7,
    warning_threshold_2: 0.9,
    pill_visible: true,
  };
}

function getEmptyDay() {
  return {
    total_input: 0,
    total_output: 0,
    total_cache_creation: 0,
    total_cache_read: 0,
    conversations: [],
    first_activity: Date.now(),
    request_count: 0,
  };
}

// ── Message handler ────────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
  if (message.type === 'TOKBURN_USAGE') {
    handleUsage(message.payload)
      .then(function (result) {
        sendResponse({ ok: true, data: result });
      })
      .catch(function (err) {
        sendResponse({ ok: false, error: err.message });
      });
    return true; // Keep channel open for async response
  }

  if (message.type === 'TOKBURN_GET_STATE') {
    getState()
      .then(function (state) {
        sendResponse({ ok: true, data: state });
      })
      .catch(function (err) {
        sendResponse({ ok: false, error: err.message });
      });
    return true;
  }

  if (message.type === 'TOKBURN_UPDATE_SETTINGS') {
    updateSettings(message.settings)
      .then(function () {
        sendResponse({ ok: true });
      })
      .catch(function (err) {
        sendResponse({ ok: false, error: err.message });
      });
    return true;
  }

  if (message.type === 'TOKBURN_RESET_DATA') {
    resetData()
      .then(function () {
        sendResponse({ ok: true });
      })
      .catch(function (err) {
        sendResponse({ ok: false, error: err.message });
      });
    return true;
  }
});

// ── Core logic ─────────────────────────────────────────────────────────────────

async function handleUsage(payload) {
  const {
    input_tokens = 0,
    output_tokens = 0,
    cache_creation_input_tokens = 0,
    cache_read_input_tokens = 0,
    model,
    conversation_id,
    timestamp,
  } = payload;

  const todayKey = getTodayKey();
  const store = await chrome.storage.local.get(['daily', 'settings']);

  const daily = store.daily || {};
  const settings = store.settings || getDefaultSettings();

  if (!daily[todayKey]) {
    daily[todayKey] = getEmptyDay();
  }

  const today = daily[todayKey];
  today.total_input += input_tokens;
  today.total_output += output_tokens;
  today.total_cache_creation += cache_creation_input_tokens;
  today.total_cache_read += cache_read_input_tokens;
  today.request_count += 1;

  // Find or create conversation entry
  const convId = conversation_id || 'unknown';
  let conv = today.conversations.find(function (c) {
    return c.id === convId;
  });

  if (!conv) {
    conv = {
      id: convId,
      input: 0,
      output: 0,
      cache_creation: 0,
      cache_read: 0,
      messages: 0,
      model: model || 'unknown',
      started: timestamp || Date.now(),
      last_active: timestamp || Date.now(),
    };
    today.conversations.push(conv);
  }

  conv.input += input_tokens;
  conv.output += output_tokens;
  conv.cache_creation += cache_creation_input_tokens;
  conv.cache_read += cache_read_input_tokens;
  conv.messages += 1;
  conv.last_active = timestamp || Date.now();
  if (model) conv.model = model;

  await chrome.storage.local.set({ daily: daily, settings: settings });

  // Periodically clean up old data
  cleanupOldData(daily);

  const totalToday = today.total_input + today.total_output;
  return {
    total_today: totalToday,
    limit: settings.daily_limit_estimate,
    pct: totalToday / settings.daily_limit_estimate,
  };
}

async function getState() {
  const store = await chrome.storage.local.get(['daily', 'settings']);
  const settings = store.settings || getDefaultSettings();
  const daily = store.daily || {};
  const todayKey = getTodayKey();
  const today = daily[todayKey] || getEmptyDay();

  // Build 7-day history
  const history = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key =
      d.getFullYear() +
      '-' +
      String(d.getMonth() + 1).padStart(2, '0') +
      '-' +
      String(d.getDate()).padStart(2, '0');
    const dayData = daily[key] || getEmptyDay();
    history.push({
      date: key,
      total: dayData.total_input + dayData.total_output,
      input: dayData.total_input,
      output: dayData.total_output,
      request_count: dayData.request_count,
    });
  }

  return {
    today: today,
    todayKey: todayKey,
    settings: settings,
    history: history,
  };
}

async function updateSettings(newSettings) {
  const store = await chrome.storage.local.get(['settings']);
  const settings = store.settings || getDefaultSettings();
  Object.assign(settings, newSettings);
  await chrome.storage.local.set({ settings: settings });
}

async function resetData() {
  await chrome.storage.local.set({ daily: {} });
}

function cleanupOldData(daily) {
  const keys = Object.keys(daily);
  if (keys.length <= 30) return;

  // Sort and remove oldest entries beyond 30 days
  keys.sort();
  const toRemove = keys.slice(0, keys.length - 30);
  for (const key of toRemove) {
    delete daily[key];
  }

  // Save asynchronously — fire and forget
  chrome.storage.local.set({ daily: daily }).catch(function () {});
}

// ── Alarm for daily reset check ────────────────────────────────────────────────

chrome.alarms.create('tokburn-daily-cleanup', { periodInMinutes: 60 });

chrome.alarms.onAlarm.addListener(function (alarm) {
  if (alarm.name === 'tokburn-daily-cleanup') {
    chrome.storage.local.get(['daily'], function (store) {
      if (store.daily) {
        cleanupOldData(store.daily);
      }
    });
  }
});
