const { calculateCost } = require('./costs');

function fmt(n) {
  return n.toLocaleString('en-US');
}

function fmtCost(n) {
  return '$' + n.toFixed(2);
}

function pad(str, len, align) {
  str = String(str);
  if (align === 'right') {
    return str.padStart(len);
  }
  return str.padEnd(len);
}

function formatToday(entries) {
  const today = new Date().toISOString().split('T')[0];
  let totalInput = 0;
  let totalOutput = 0;
  let totalCost = 0;
  const byModel = {};

  for (const e of entries) {
    const inp = e.input_tokens || 0;
    const out = e.output_tokens || 0;
    totalInput += inp;
    totalOutput += out;
    const cost = calculateCost(e.model, inp, out);
    totalCost += cost;

    const model = e.model || 'unknown';
    if (!byModel[model]) {
      byModel[model] = { input: 0, output: 0, cost: 0 };
    }
    byModel[model].input += inp;
    byModel[model].output += out;
    byModel[model].cost += cost;
  }

  const totalTokens = totalInput + totalOutput;
  const lines = [];

  lines.push('');
  lines.push(`  tokburn \u2014 Today (${today})`);
  lines.push('  ' + '\u2500'.repeat(39));
  lines.push(`  Total Tokens    \u2502 ${fmt(totalTokens)}`);
  lines.push(`  Input           \u2502 ${fmt(totalInput)}`);
  lines.push(`  Output          \u2502 ${fmt(totalOutput)}`);
  lines.push(`  Requests        \u2502 ${fmt(entries.length)}`);
  lines.push(`  Est. Cost       \u2502 ${fmtCost(totalCost)}`);
  lines.push('');

  const models = Object.keys(byModel).sort((a, b) => byModel[b].cost - byModel[a].cost);
  if (models.length > 0) {
    lines.push('  By Model:');
    for (const model of models) {
      const m = byModel[model];
      const name = pad(model, 22);
      lines.push(`  ${name}\u2502 ${pad(fmt(m.input), 10, 'right')} in \u2502 ${pad(fmt(m.output), 10, 'right')} out \u2502 ${fmtCost(m.cost)}`);
    }
    lines.push('');
  }

  if (entries.length === 0) {
    lines.push('  No usage recorded today.');
    lines.push('');
  }

  return lines.join('\n');
}

function formatWeek(entriesByDay) {
  const days = Object.keys(entriesByDay).sort();
  const COL = { date: 12, input: 10, output: 10, total: 10, cost: 8 };
  const WIDTH = COL.date + COL.input + COL.output + COL.total + COL.cost + 8; // separators

  const lines = [];
  lines.push('');
  lines.push('  tokburn \u2014 Last 7 Days');
  lines.push('  ' + '\u2500'.repeat(WIDTH));
  lines.push(
    '  ' +
    pad('Date', COL.date) + '\u2502 ' +
    pad('Input', COL.input, 'right') + ' \u2502 ' +
    pad('Output', COL.output, 'right') + ' \u2502 ' +
    pad('Total', COL.total, 'right') + ' \u2502 ' +
    pad('Cost', COL.cost, 'right')
  );
  lines.push('  ' + '\u2500'.repeat(WIDTH));

  let grandInput = 0;
  let grandOutput = 0;
  let grandCost = 0;

  for (const day of days) {
    const entries = entriesByDay[day];
    let dayInput = 0;
    let dayOutput = 0;
    let dayCost = 0;

    for (const e of entries) {
      const inp = e.input_tokens || 0;
      const out = e.output_tokens || 0;
      dayInput += inp;
      dayOutput += out;
      dayCost += calculateCost(e.model, inp, out);
    }

    grandInput += dayInput;
    grandOutput += dayOutput;
    grandCost += dayCost;

    const dayTotal = dayInput + dayOutput;
    lines.push(
      '  ' +
      pad(day, COL.date) + '\u2502 ' +
      pad(fmt(dayInput), COL.input, 'right') + ' \u2502 ' +
      pad(fmt(dayOutput), COL.output, 'right') + ' \u2502 ' +
      pad(fmt(dayTotal), COL.total, 'right') + ' \u2502 ' +
      pad(fmtCost(dayCost), COL.cost, 'right')
    );
  }

  lines.push('  ' + '\u2500'.repeat(WIDTH));

  const grandTotal = grandInput + grandOutput;
  lines.push(
    '  ' +
    pad('Total', COL.date) + '\u2502 ' +
    pad(fmt(grandInput), COL.input, 'right') + ' \u2502 ' +
    pad(fmt(grandOutput), COL.output, 'right') + ' \u2502 ' +
    pad(fmt(grandTotal), COL.total, 'right') + ' \u2502 ' +
    pad(fmtCost(grandCost), COL.cost, 'right')
  );
  lines.push('');

  return lines.join('\n');
}

function formatStatus(todaySummary) {
  const { getConfig } = require('./config');
  const conf = getConfig();
  const plan = conf.plan || '(not set)';
  const modules = conf.statusline_modules || [];

  const lines = [];
  lines.push('');
  lines.push(`  tokburn`);
  lines.push('  ' + '\u2500'.repeat(35));
  lines.push(`  Plan:        ${plan}`);
  lines.push(`  Status line: ${modules.length > 0 ? modules.length + ' modules' : 'not configured'}`);

  if (todaySummary) {
    const totalTokens = (todaySummary.input || 0) + (todaySummary.output || 0);
    lines.push(`  Today:       ${fmt(totalTokens)} tokens (${fmt(todaySummary.requests || 0)} requests) \u2022 ${fmtCost(todaySummary.cost || 0)}`);
  } else {
    lines.push('  Today:       no usage recorded');
  }
  lines.push('');

  return lines.join('\n');
}

function startLiveTUI() {
  const store = require('./store');

  const ESC = '\x1b';
  const CSI = ESC + '[';

  // Switch to alternate screen, hide cursor
  process.stdout.write(CSI + '?1049h');
  process.stdout.write(CSI + '?25l');

  function timeAgo(ts) {
    const diff = Date.now() - new Date(ts).getTime();
    const secs = Math.floor(diff / 1000);
    if (secs < 60) return `${secs}s ago`;
    const mins = Math.floor(secs / 60);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    return `${hrs}h ago`;
  }

  function drawBox(content, width) {
    const lines = [];
    lines.push('\u250C' + '\u2500'.repeat(width - 2) + '\u2510');
    for (const line of content) {
      const stripped = line.replace(/\x1b\[[0-9;]*m/g, '');
      const padding = Math.max(0, width - 4 - stripped.length);
      lines.push('\u2502 ' + line + ' '.repeat(padding) + ' \u2502');
    }
    lines.push('\u2514' + '\u2500'.repeat(width - 2) + '\u2518');
    return lines;
  }

  function dotBar(pct, count) {
    // Render dot indicators like: ●●●●○○○○○
    count = count || 10;
    const filled = Math.round((pct / 100) * count);
    const empty = count - filled;
    return '\u25CF'.repeat(filled) + '\u25CB'.repeat(empty);
  }

  function colorForPct(pct) {
    if (pct >= 80) return '\x1b[31m'; // red
    if (pct >= 50) return '\x1b[33m'; // amber
    return '\x1b[32m'; // green
  }

  function render() {
    const entries = store.getToday();
    const { getConfig } = require('./config');
    const conf = getConfig();
    const plan = conf.plan || 'pro';
    const limits = conf.limits || {};
    const limit = (limits[plan] && limits[plan].estimated_tokens) || 500000;

    const now = new Date();
    const timestamp = now.toLocaleTimeString();

    let totalInput = 0;
    let totalOutput = 0;
    let totalCost = 0;

    for (const e of entries) {
      totalInput += e.input_tokens || 0;
      totalOutput += e.output_tokens || 0;
      totalCost += calculateCost(e.model, e.input_tokens || 0, e.output_tokens || 0);
    }

    const totalTokens = totalInput + totalOutput;
    const usagePct = Math.min(100, (totalTokens / limit) * 100);

    // Burn rate
    let burnRate = 0;
    let timeRemaining = '';
    if (entries.length > 0) {
      const first = new Date(entries[0].timestamp);
      const elapsed = (now - first) / 60000;
      if (elapsed > 0) {
        burnRate = Math.round(totalTokens / elapsed);
        const tokensLeft = limit - totalTokens;
        if (burnRate > 0 && tokensLeft > 0) {
          const minsLeft = Math.round(tokensLeft / burnRate);
          timeRemaining = minsLeft >= 60
            ? Math.floor(minsLeft / 60) + 'hr ' + (minsLeft % 60) + 'min remaining'
            : minsLeft + 'min remaining';
        }
      }
    }

    // Activity indicator
    let active = false;
    if (entries.length > 0) {
      const last = new Date(entries[entries.length - 1].timestamp);
      active = (now - last) < 5000;
    }

    const activityDot = active
      ? '\x1b[32m\u25CF\x1b[0m'
      : '\x1b[90m\u25CF\x1b[0m';

    const pctColor = colorForPct(usagePct);

    const content = [];
    content.push(`\x1b[1mtokburn live\x1b[0m  ${activityDot}  ${timestamp}`);
    content.push('');

    // Progress bar with dots
    const dots = dotBar(usagePct, 30);
    content.push(`  ${pctColor}${dots}\x1b[0m`);
    content.push(`  ${pctColor}${Math.round(usagePct)}% of 5hr limit\x1b[0m  ${timeRemaining ? '~' + timeRemaining : ''}`);
    content.push('');

    content.push(`  Input Tokens     ${pad(fmt(totalInput), 14, 'right')}`);
    content.push(`  Output Tokens    ${pad(fmt(totalOutput), 14, 'right')}`);
    content.push(`  Total Tokens     ${pad(fmt(totalTokens), 14, 'right')}`);
    content.push(`  Requests         ${pad(fmt(entries.length), 14, 'right')}`);
    content.push('');
    content.push(`  Burn Rate        ${pad(fmt(burnRate) + ' tok/min', 14, 'right')}`);
    content.push(`  Est. Cost        ${pad(fmtCost(totalCost), 14, 'right')}`);
    content.push('');

    // Last 5 requests
    content.push('\x1b[1m  Recent Requests\x1b[0m');
    content.push('  ' + '\u2500'.repeat(42));
    const last5 = entries.slice(-5).reverse();
    if (last5.length === 0) {
      content.push('  (none yet)');
    } else {
      for (const e of last5) {
        const model = (e.model || 'unknown').replace('claude-', '').substring(0, 14);
        const tokens = (e.input_tokens || 0) + (e.output_tokens || 0);
        const ago = timeAgo(e.timestamp);
        content.push(`  ${pad(model, 16)}${pad(fmt(tokens) + ' tok', 12, 'right')}  ${ago}`);
      }
    }

    const WIDTH = 52;
    const box = drawBox(content, WIDTH);

    // Move cursor to top-left and draw
    process.stdout.write(CSI + 'H');
    process.stdout.write(CSI + '2J');
    process.stdout.write('\n');
    for (const line of box) {
      process.stdout.write('  ' + line + '\n');
    }
    process.stdout.write('\n  \x1b[90mPress q to quit\x1b[0m\n');
  }

  render();
  const interval = setInterval(render, 1000);

  // Listen for keypress
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (key) => {
      if (key === 'q' || key === 'Q' || key === '\x03') { // q or Ctrl+C
        cleanup();
      }
    });
  }

  function cleanup() {
    clearInterval(interval);
    // Show cursor, switch back from alternate screen
    process.stdout.write(CSI + '?25h');
    process.stdout.write(CSI + '?1049l');
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(false);
    }
    process.exit(0);
  }

  // Handle SIGINT gracefully
  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
}

module.exports = { formatToday, formatWeek, formatStatus, startLiveTUI };
