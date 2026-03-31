/**
 * tokburn — popup.js
 * Extension popup: today's summary, 7-day chart, settings.
 */
(function () {
  'use strict';

  // ── DOM refs ──────────────────────────────────────────────────────────────────

  const totalTokensEl = document.getElementById('total-tokens');
  const requestCountEl = document.getElementById('request-count');
  const inputTokensEl = document.getElementById('input-tokens');
  const outputTokensEl = document.getElementById('output-tokens');
  const progressUsedEl = document.getElementById('progress-used');
  const progressLimitEl = document.getElementById('progress-limit');
  const progressFillEl = document.getElementById('progress-fill');
  const chartEl = document.getElementById('chart');
  const chartLabelsEl = document.getElementById('chart-labels');
  const limitSlider = document.getElementById('limit-slider');
  const limitDisplay = document.getElementById('limit-display');
  const pillToggle = document.getElementById('pill-toggle');
  const resetBtn = document.getElementById('reset-btn');

  // ── Helpers ───────────────────────────────────────────────────────────────────

  function abbreviate(n) {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
    return String(n);
  }

  function formatLimit(n) {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    return Math.round(n / 1000) + 'K';
  }

  function getColorClass(pct) {
    if (pct >= 0.8) return 'red';
    if (pct >= 0.5) return 'amber';
    return '';
  }

  function getDayLabel(dateStr) {
    const d = new Date(dateStr + 'T12:00:00');
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return days[d.getDay()];
  }

  // ── Load and render ───────────────────────────────────────────────────────────

  function loadState() {
    chrome.runtime.sendMessage({ type: 'TOKBURN_GET_STATE' }, function (response) {
      if (chrome.runtime.lastError || !response || !response.ok) return;
      renderState(response.data);
    });
  }

  function renderState(data) {
    const today = data.today || {};
    const settings = data.settings || {};
    const history = data.history || [];

    const totalInput = today.total_input || 0;
    const totalOutput = today.total_output || 0;
    const totalTokens = totalInput + totalOutput;
    const limit = settings.daily_limit_estimate || 500000;
    const pct = totalTokens / limit;

    // Summary cards
    totalTokensEl.textContent = abbreviate(totalTokens);
    requestCountEl.textContent = (today.request_count || 0).toLocaleString('en-US');
    inputTokensEl.textContent = abbreviate(totalInput);
    outputTokensEl.textContent = abbreviate(totalOutput);

    // Progress bar
    progressUsedEl.textContent = Math.round(pct * 100) + '%';
    progressLimitEl.textContent = 'of ' + formatLimit(limit) + ' limit';
    progressFillEl.style.width = Math.min(100, pct * 100) + '%';
    progressFillEl.className = 'progress-fill' + (getColorClass(pct) ? ' ' + getColorClass(pct) : '');

    // Settings
    limitSlider.value = limit;
    limitDisplay.textContent = formatLimit(limit);
    if (settings.pill_visible !== false) {
      pillToggle.classList.add('active');
    } else {
      pillToggle.classList.remove('active');
    }

    // 7-day chart
    renderChart(history, limit);
  }

  function renderChart(history, limit) {
    if (!history || history.length === 0) return;

    const maxVal = Math.max.apply(null, history.map(function (d) { return d.total || 0; }).concat([1]));

    chartEl.innerHTML = '';
    chartLabelsEl.innerHTML = '';

    const todayStr = new Date().toISOString().split('T')[0];

    for (var i = 0; i < history.length; i++) {
      var d = history[i];
      var total = d.total || 0;
      var heightPct = maxVal > 0 ? Math.max(2, (total / maxVal) * 100) : 2;
      var pct = total / limit;
      var colorClass = getColorClass(pct);
      var isToday = d.date === todayStr;

      var barWrap = document.createElement('div');
      barWrap.className = 'chart-bar-wrap';

      var barValue = document.createElement('div');
      barValue.className = 'chart-bar-value';
      barValue.textContent = total > 0 ? abbreviate(total) : '';
      barWrap.appendChild(barValue);

      var bar = document.createElement('div');
      bar.className = 'chart-bar' + (colorClass ? ' ' + colorClass : '') + (isToday ? ' today' : '');
      bar.style.height = heightPct + '%';
      barWrap.appendChild(bar);

      chartEl.appendChild(barWrap);

      var label = document.createElement('div');
      label.className = 'chart-label' + (isToday ? ' today' : '');
      label.textContent = isToday ? 'Today' : getDayLabel(d.date);
      chartLabelsEl.appendChild(label);
    }
  }

  // ── Settings handlers ─────────────────────────────────────────────────────────

  limitSlider.addEventListener('input', function () {
    limitDisplay.textContent = formatLimit(parseInt(limitSlider.value, 10));
  });

  limitSlider.addEventListener('change', function () {
    var newLimit = parseInt(limitSlider.value, 10);
    chrome.runtime.sendMessage({
      type: 'TOKBURN_UPDATE_SETTINGS',
      settings: { daily_limit_estimate: newLimit },
    }, function () {
      loadState();
    });
  });

  pillToggle.addEventListener('click', function () {
    var isActive = pillToggle.classList.contains('active');
    var newValue = !isActive;
    chrome.runtime.sendMessage({
      type: 'TOKBURN_UPDATE_SETTINGS',
      settings: { pill_visible: newValue },
    }, function () {
      if (newValue) {
        pillToggle.classList.add('active');
      } else {
        pillToggle.classList.remove('active');
      }
    });
  });

  resetBtn.addEventListener('click', function () {
    if (confirm('Reset all tokburn data? This cannot be undone.')) {
      chrome.runtime.sendMessage({ type: 'TOKBURN_RESET_DATA' }, function () {
        loadState();
      });
    }
  });

  // ── Init ──────────────────────────────────────────────────────────────────────

  loadState();
})();
