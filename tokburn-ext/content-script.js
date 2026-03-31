/**
 * tokburn — content-script.js
 * Runs in the content script context on claude.ai.
 * Injects interceptor.js into the page, builds the floating pill + dashboard UI in shadow DOM,
 * and relays usage data between the page script and the background service worker.
 */
(function () {
  'use strict';

  // ── Inject interceptor into page context ──────────────────────────────────────

  const script = document.createElement('script');
  script.src = chrome.runtime.getURL('interceptor.js');
  script.onload = function () { this.remove(); };
  (document.head || document.documentElement).appendChild(script);

  // ── State ─────────────────────────────────────────────────────────────────────

  let state = {
    today: null,
    settings: null,
    todayKey: null,
    history: [],
  };

  let dashboardOpen = false;
  let lastActivityTime = 0;
  let streamingTimer = null;
  let currentConversationId = null;

  // ── Listen for usage data from interceptor ────────────────────────────────────

  window.addEventListener('message', function (event) {
    if (event.source !== window) return;
    if (!event.data || event.data.type !== 'TOKBURN_USAGE') return;

    const payload = event.data.payload;
    lastActivityTime = Date.now();

    // Extract conversation ID from URL if not in payload
    if (!payload.conversation_id) {
      payload.conversation_id = getConversationIdFromURL();
    }

    // Forward to background
    chrome.runtime.sendMessage({ type: 'TOKBURN_USAGE', payload: payload }, function (response) {
      if (chrome.runtime.lastError) return;
      if (response && response.ok) {
        refreshState();
      }
    });

    // Set streaming indicator
    setPillStreaming(true);
    clearTimeout(streamingTimer);
    streamingTimer = setTimeout(function () {
      setPillStreaming(false);
    }, 3000);
  });

  function getConversationIdFromURL() {
    try {
      const match = window.location.pathname.match(/\/chat\/([a-zA-Z0-9-]+)/);
      return match ? match[1] : null;
    } catch (_) {
      return null;
    }
  }

  // ── Refresh state from background ─────────────────────────────────────────────

  function refreshState() {
    chrome.runtime.sendMessage({ type: 'TOKBURN_GET_STATE' }, function (response) {
      if (chrome.runtime.lastError) return;
      if (response && response.ok) {
        state = response.data;
        updateUI();
      }
    });
  }

  // Poll every 2 seconds + refresh on navigation
  setInterval(refreshState, 2000);
  refreshState();

  // Watch for URL changes (SPA navigation)
  let lastURL = location.href;
  const urlObserver = new MutationObserver(function () {
    if (location.href !== lastURL) {
      lastURL = location.href;
      currentConversationId = getConversationIdFromURL();
    }
  });
  urlObserver.observe(document.body || document.documentElement, { childList: true, subtree: true });

  // ── Build Shadow DOM UI ───────────────────────────────────────────────────────

  const host = document.createElement('div');
  host.id = 'tokburn-host';
  const shadow = host.attachShadow({ mode: 'closed' });

  // Inject styles
  const style = document.createElement('style');
  fetch(chrome.runtime.getURL('styles.css'))
    .then(function (r) { return r.text(); })
    .then(function (css) {
      style.textContent = css;
    })
    .catch(function () {
      // Fallback: inline minimal styles
      style.textContent = '.tokburn-container{position:fixed;bottom:80px;right:24px;z-index:2147483647;font-family:sans-serif;color:#ececec;}';
    });
  shadow.appendChild(style);

  // Build DOM structure
  const container = document.createElement('div');
  container.className = 'tokburn-container';
  container.innerHTML = buildHTML();
  shadow.appendChild(container);

  function buildHTML() {
    return `
      <div class="tokburn-dashboard" id="tb-dashboard">
        <div class="tokburn-dash-header">
          <span class="tokburn-dash-title">tokburn</span>
          <span class="tokburn-dash-date" id="tb-date"></span>
        </div>

        <div class="tokburn-warning" id="tb-warning">
          <span class="tokburn-warning-icon"></span>
          <span id="tb-warning-text"></span>
        </div>

        <div class="tokburn-progress-wrap">
          <div class="tokburn-progress-label">
            <span id="tb-progress-pct"></span>
            <span id="tb-progress-limit"></span>
          </div>
          <div class="tokburn-progress-bar">
            <div class="tokburn-progress-fill color-green" id="tb-progress-fill"></div>
          </div>
        </div>

        <div class="tokburn-stats">
          <div class="tokburn-stat">
            <div class="tokburn-stat-label">Input</div>
            <div class="tokburn-stat-value" id="tb-input">0</div>
          </div>
          <div class="tokburn-stat">
            <div class="tokburn-stat-label">Output</div>
            <div class="tokburn-stat-value" id="tb-output">0</div>
          </div>
          <div class="tokburn-stat">
            <div class="tokburn-stat-label">Total</div>
            <div class="tokburn-stat-value" id="tb-total">0</div>
          </div>
          <div class="tokburn-stat">
            <div class="tokburn-stat-label">Requests</div>
            <div class="tokburn-stat-value" id="tb-requests">0</div>
          </div>
        </div>

        <div class="tokburn-burn-rate">
          <span class="tokburn-burn-rate-label">Burn Rate</span>
          <span class="tokburn-burn-rate-value" id="tb-burnrate">0 tok/min</span>
        </div>

        <div class="tokburn-section-title">This Conversation</div>
        <div class="tokburn-conv-current" id="tb-conv-current">
          <div class="tokburn-conv-current-row">
            <span class="tokburn-conv-current-label">Tokens</span>
            <span class="tokburn-conv-current-value" id="tb-conv-tokens">0</span>
          </div>
          <div class="tokburn-conv-current-row">
            <span class="tokburn-conv-current-label">Messages</span>
            <span class="tokburn-conv-current-value" id="tb-conv-messages">0</span>
          </div>
        </div>

        <div class="tokburn-section-title">Session Log</div>
        <div class="tokburn-log" id="tb-log"></div>
      </div>

      <div class="tokburn-pill state-green" id="tb-pill">
        <span class="tokburn-pill-icon">\u{1F525}</span>
        <span class="tokburn-pill-count" id="tb-pill-count">0</span>
      </div>
    `;
  }

  // Cache DOM references
  let domRefs = null;
  function getDom() {
    if (domRefs) return domRefs;
    domRefs = {
      pill: shadow.getElementById('tb-pill'),
      pillCount: shadow.getElementById('tb-pill-count'),
      dashboard: shadow.getElementById('tb-dashboard'),
      date: shadow.getElementById('tb-date'),
      warning: shadow.getElementById('tb-warning'),
      warningText: shadow.getElementById('tb-warning-text'),
      progressPct: shadow.getElementById('tb-progress-pct'),
      progressLimit: shadow.getElementById('tb-progress-limit'),
      progressFill: shadow.getElementById('tb-progress-fill'),
      input: shadow.getElementById('tb-input'),
      output: shadow.getElementById('tb-output'),
      total: shadow.getElementById('tb-total'),
      requests: shadow.getElementById('tb-requests'),
      burnrate: shadow.getElementById('tb-burnrate'),
      convTokens: shadow.getElementById('tb-conv-tokens'),
      convMessages: shadow.getElementById('tb-conv-messages'),
      log: shadow.getElementById('tb-log'),
    };
    return domRefs;
  }

  // ── Pill click handler ────────────────────────────────────────────────────────

  container.addEventListener('click', function (e) {
    const dom = getDom();
    if (!dom.pill) return;

    // Check if click is on the pill
    if (dom.pill.contains(e.target)) {
      dashboardOpen = !dashboardOpen;
      if (dashboardOpen) {
        dom.dashboard.classList.add('open');
      } else {
        dom.dashboard.classList.remove('open');
      }
    }
  });

  // ── UI Update ─────────────────────────────────────────────────────────────────

  function abbreviate(n) {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
    return String(n);
  }

  function formatNumber(n) {
    return n.toLocaleString('en-US');
  }

  function getColorState(pct) {
    if (pct >= 0.8) return 'red';
    if (pct >= 0.5) return 'amber';
    return 'green';
  }

  function setPillStreaming(streaming) {
    const dom = getDom();
    if (!dom.pill) return;
    if (streaming) {
      dom.pill.classList.add('streaming');
    } else {
      dom.pill.classList.remove('streaming');
    }
  }

  function updateUI() {
    const dom = getDom();
    if (!dom.pill || !state.today || !state.settings) return;

    const today = state.today;
    const settings = state.settings;

    // Check pill visibility
    if (settings.pill_visible === false) {
      container.classList.add('tokburn-hidden');
      return;
    } else {
      container.classList.remove('tokburn-hidden');
    }

    const totalInput = today.total_input || 0;
    const totalOutput = today.total_output || 0;
    const totalTokens = totalInput + totalOutput;
    const limit = settings.daily_limit_estimate || 500000;
    const pct = totalTokens / limit;
    const colorState = getColorState(pct);

    // Pill
    dom.pillCount.textContent = abbreviate(totalTokens);
    dom.pill.className = 'tokburn-pill state-' + colorState;
    if (dom.pill.classList.contains('streaming')) {
      dom.pill.classList.add('streaming');
    }

    // Date
    dom.date.textContent = state.todayKey || '';

    // Progress bar
    dom.progressPct.textContent = '~' + Math.round(pct * 100) + '% of daily limit';
    dom.progressLimit.textContent = abbreviate(limit) + ' limit';
    dom.progressFill.style.width = Math.min(100, pct * 100) + '%';
    dom.progressFill.className = 'tokburn-progress-fill color-' + colorState;

    // Stats
    dom.input.textContent = abbreviate(totalInput);
    dom.output.textContent = abbreviate(totalOutput);
    dom.total.textContent = abbreviate(totalTokens);
    dom.requests.textContent = formatNumber(today.request_count || 0);

    // Burn rate
    if (today.first_activity && today.request_count > 0) {
      const elapsed = (Date.now() - today.first_activity) / 60000;
      if (elapsed > 0.5) {
        const rate = Math.round(totalTokens / elapsed);
        dom.burnrate.textContent = '~' + abbreviate(rate) + ' tok/min';
      } else {
        dom.burnrate.textContent = 'calculating...';
      }
    } else {
      dom.burnrate.textContent = '0 tok/min';
    }

    // Current conversation
    const convId = getConversationIdFromURL();
    if (convId && today.conversations) {
      const conv = today.conversations.find(function (c) { return c.id === convId; });
      if (conv) {
        dom.convTokens.textContent = abbreviate((conv.input || 0) + (conv.output || 0));
        dom.convMessages.textContent = formatNumber(conv.messages || 0);
      } else {
        dom.convTokens.textContent = '0';
        dom.convMessages.textContent = '0';
      }
    } else {
      dom.convTokens.textContent = '0';
      dom.convMessages.textContent = '0';
    }

    // Warning
    if (pct >= settings.warning_threshold_2) {
      dom.warning.className = 'tokburn-warning visible level-2';
      dom.warningText.textContent = "You're approaching your estimated limit. Consider starting fresh or switching to API.";
    } else if (pct >= settings.warning_threshold_1) {
      dom.warning.className = 'tokburn-warning visible level-1';
      dom.warningText.textContent = 'You\'ve used ~' + Math.round(pct * 100) + '% of your estimated daily limit.';
    } else {
      dom.warning.className = 'tokburn-warning';
    }

    // Session log
    if (today.conversations && today.conversations.length > 0) {
      const sorted = today.conversations.slice().sort(function (a, b) {
        return (b.last_active || 0) - (a.last_active || 0);
      });
      dom.log.innerHTML = sorted.map(function (c) {
        const tokens = (c.input || 0) + (c.output || 0);
        const label = c.id === 'unknown' ? 'Unknown' : c.id.substring(0, 12) + '...';
        return '<div class="tokburn-log-entry">' +
          '<span class="tokburn-log-id">' + escapeHTML(label) + '</span>' +
          '<span class="tokburn-log-tokens">' + abbreviate(tokens) + '</span>' +
          '</div>';
      }).join('');
    } else {
      dom.log.innerHTML = '<div class="tokburn-log-entry"><span class="tokburn-log-id" style="color:#757575">No conversations yet</span></div>';
    }
  }

  function escapeHTML(str) {
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  // ── Inject into page ──────────────────────────────────────────────────────────

  function inject() {
    if (document.body) {
      document.body.appendChild(host);
    } else {
      document.addEventListener('DOMContentLoaded', function () {
        document.body.appendChild(host);
      });
    }
  }

  inject();
})();
