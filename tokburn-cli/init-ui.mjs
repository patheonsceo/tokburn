/**
 * tokburn -- init-ui.mjs
 * Ink-based setup wizard for `tokburn init`.
 * ESM module using Ink 6.x, @inkjs/ui v2, React 19.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { render, Box, Text, Newline, useApp, useInput } from 'ink';
import { Select, Spinner, ProgressBar } from '@inkjs/ui';
import chalk from 'chalk';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { detectEnvironment, configurePlan, configureStatusLine, PLANS } = require('./init.js');
const { getConfig } = require('./config.js');
const { PRESETS, MODULE_LIST, RICH_ELEMENTS, RICH_PRESETS, ALL_RICH_KEYS } = require('./statusline.js');

const pkg = require('./package.json');

// ── ASCII Logo ──────────────────────────────────────────────────────────────

const LOGO = `   _        _
  | |_ ___ | | __ ___ _   _ _ __ _ __
  | __/ _ \\| |/ /| _ | | | | '__| '_ \\
  | || (_) |   < | _ | |_| | |  | | | |
   \\__\\___/|_|\\_\\|___|\\__,_|_|  |_| |_|`;

// ── Helpers ─────────────────────────────────────────────────────────────────

const PLAN_LABELS = {
  pro: 'Pro (~500K/5hr)',
  max: 'Max (~2M/5hr)',
  api: 'API only',
};

function dots(label, value, width = 40) {
  const used = label.length + value.length + 2;
  const count = Math.max(2, width - used);
  return chalk.dim('.'.repeat(count));
}

function completedLine(label, value) {
  return `  ${chalk.green('\u2713')} ${label} ${dots(label, value)} ${chalk.bold(value)}`;
}

function previewForPreset(presetKey) {
  if (presetKey === 'skip') return '(no status line)';
  if (presetKey === 'custom') return '(choose your own modules)';
  const preset = RICH_PRESETS[presetKey];
  if (!preset) return '';
  return buildPreviewFromElements(new Set(preset));
}

function buildPreviewFromElements(enabledSet) {
  const SEP = chalk.dim(' | ');
  const lines = [];

  // Line 1
  const l1 = [];
  if (enabledSet.has('model')) {
    let m = chalk.cyan('Opus 4.6 (1M context)');
    if (enabledSet.has('plan')) m += chalk.dim('\u00b7') + chalk.green('Max');
    l1.push(m);
  } else if (enabledSet.has('plan')) {
    l1.push(chalk.green('Max'));
  }
  if (enabledSet.has('context_bar')) l1.push(chalk.green('\u2588\u2588\u2588\u2588\u2588\u2588') + chalk.dim('\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591') + ' 31%');
  if (enabledSet.has('branch')) l1.push(chalk.magenta('main*'));
  if (enabledSet.has('session_cost')) l1.push('$3.69');
  if (l1.length > 0) lines.push(l1.join(SEP));

  // Line 2
  const l2 = [];
  if (enabledSet.has('limit_5h')) l2.push(chalk.dim('5h ') + chalk.green('27%') + chalk.dim(' 3h25m\u219210:00'));
  if (enabledSet.has('limit_7d')) l2.push(chalk.dim('7d ') + chalk.yellow('75%') + chalk.dim(' 1d16h\u219204/05'));
  if (enabledSet.has('burn_rate')) l2.push('\uD83D\uDD25' + chalk.dim('$4.9/h'));
  if (l2.length > 0) lines.push(l2.join(SEP));

  // Line 3
  const l3 = [];
  if (enabledSet.has('tokens')) l3.push('$3.69 D:37K/152K');
  if (enabledSet.has('lines')) l3.push(chalk.green('+156') + '/' + chalk.red('-23'));
  if (enabledSet.has('directory')) l3.push('tokburn');
  if (l3.length > 0) lines.push(l3.join(SEP));

  return lines.join('\n');
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// ── Phase constants ─────────────────────────────────────────────────────────

const PHASE_WELCOME = 'welcome';
const PHASE_PLAN = 'plan';
const PHASE_STATUSLINE = 'statusline';
const PHASE_CUSTOMIZE = 'customize';
const PHASE_PROCESSING = 'processing';
const PHASE_DONE = 'done';

// ── Main App ────────────────────────────────────────────────────────────────

function App() {
  const { exit } = useApp();
  const [phase, setPhase] = useState(PHASE_WELCOME);
  const [env, setEnv] = useState(null);

  // User choices
  const [plan, setPlan] = useState(null);
  const [statusPreset, setStatusPreset] = useState(null);
  const [customElements, setCustomElements] = useState(null);

  // Processing state
  const [taskIndex, setTaskIndex] = useState(-1);
  const [taskResults, setTaskResults] = useState({});
  const [progress, setProgress] = useState(0);

  // Detect environment on mount
  useEffect(() => {
    try {
      const detected = detectEnvironment();
      setEnv(detected);
    } catch (e) {
      setEnv({ home: '', shell: 'unknown', claudeDir: '', claudeSettings: '', hasClaudeCode: false });
    }
  }, []);

  // Auto-advance from welcome after a short pause
  useEffect(() => {
    if (phase === PHASE_WELCOME && env) {
      const t = setTimeout(() => setPhase(PHASE_PLAN), 100);
      return () => clearTimeout(t);
    }
  }, [phase, env]);

  // Run processing tasks
  useEffect(() => {
    if (phase !== PHASE_PROCESSING) return;
    let cancelled = false;

    async function runTasks() {
      const tasks = buildTaskList();
      const results = {};

      for (let i = 0; i < tasks.length; i++) {
        if (cancelled) return;
        setTaskIndex(i);
        setProgress(Math.round(((i) / tasks.length) * 100));
        await sleep(200);

        try {
          const result = await tasks[i].run();
          results[tasks[i].key] = { success: true, ...(result || {}) };
        } catch (e) {
          results[tasks[i].key] = { success: false, error: e.message };
        }
      }

      if (cancelled) return;
      setTaskResults(results);
      setProgress(100);
      setTaskIndex(tasks.length);
      await sleep(300);
      setPhase(PHASE_DONE);
    }

    runTasks();
    return () => { cancelled = true; };
  }, [phase]);

  // Exit after done phase renders
  useEffect(() => {
    if (phase === PHASE_DONE) {
      const t = setTimeout(() => exit(), 500);
      return () => clearTimeout(t);
    }
  }, [phase, exit]);

  // ── Task builders ───────────────────────────────────────────────────────

  function buildTaskList() {
    const tasks = [];

    tasks.push({
      key: 'plan',
      label: 'Plan configured',
      run: () => {
        configurePlan(plan);
        return {};
      },
    });

    // Determine elements to save
    const finalPreset = statusPreset;
    const isRich = finalPreset && finalPreset !== 'skip';

    if (isRich && env && env.hasClaudeCode) {
      tasks.push({
        key: 'statusline',
        label: 'Status line configured',
        run: () => {
          const elements = customElements || RICH_PRESETS[finalPreset] || ALL_RICH_KEYS;
          configureStatusLine(['rich'], elements);
          return { count: elements.length };
        },
      });
    }

    return tasks;
  }

  // ── Handlers ────────────────────────────────────────────────────────────

  const handlePlanSelect = useCallback((value) => {
    setPlan(value);
    if (env && env.hasClaudeCode) {
      setPhase(PHASE_STATUSLINE);
    } else {
      setStatusPreset('skip');
      setPhase(PHASE_PROCESSING);
    }
  }, [env]);

  const handleStatusLineSelect = useCallback((value) => {
    if (value === 'custom') {
      setStatusPreset('custom');
      setPhase(PHASE_CUSTOMIZE);
    } else {
      setStatusPreset(value);
      setPhase(PHASE_PROCESSING);
    }
  }, []);

  const handleCustomizeConfirm = useCallback((elements) => {
    setCustomElements(elements);
    setPhase(PHASE_PROCESSING);
  }, []);

  // ── Render ──────────────────────────────────────────────────────────────

  if (!env) {
    return React.createElement(Box, { paddingX: 2 },
      React.createElement(Spinner, { label: 'Detecting environment...' })
    );
  }

  const statusLabel = statusPreset === 'skip' ? 'skipped'
    : statusPreset === 'custom' ? 'Custom (' + (customElements || ALL_RICH_KEYS).length + ')'
    : statusPreset ? statusPreset.charAt(0).toUpperCase() + statusPreset.slice(1)
    : null;

  return React.createElement(Box, { flexDirection: 'column', paddingX: 1 },
    // Logo + header
    React.createElement(Box, { flexDirection: 'column' },
      React.createElement(Text, { color: 'yellow' }, LOGO),
      React.createElement(Text, { dimColor: true }, `  token tracking for Claude Code  v${pkg.version}`),
      React.createElement(Newline, null),
      React.createElement(Text, { dimColor: true }, '  ' + '\u2500'.repeat(44)),
      React.createElement(Newline, null),
      React.createElement(Text, null,
        '  Detected: ',
        React.createElement(Text, { bold: true }, env.shell),
        env.hasClaudeCode
          ? React.createElement(Text, null, ' + ', React.createElement(Text, { color: 'cyan' }, 'Claude Code'))
          : React.createElement(Text, { dimColor: true }, ' (no Claude Code)')
      ),
      React.createElement(Newline, null)
    ),

    // Completed steps
    plan ? React.createElement(Text, null, completedLine('Plan', PLAN_LABELS[plan])) : null,
    statusLabel && phase !== PHASE_STATUSLINE && phase !== PHASE_CUSTOMIZE
      ? React.createElement(Text, null, completedLine('Status line', statusLabel))
      : null,

    // Active phase
    phase === PHASE_PLAN ? React.createElement(PlanStep, { onSelect: handlePlanSelect }) : null,
    phase === PHASE_STATUSLINE ? React.createElement(StatusLineStep, { onSelect: handleStatusLineSelect }) : null,
    phase === PHASE_CUSTOMIZE ? React.createElement(CustomizerStep, { onConfirm: handleCustomizeConfirm }) : null,
    phase === PHASE_PROCESSING ? React.createElement(ProcessingPhase, {
      tasks: buildTaskList(),
      taskIndex,
      taskResults,
      progress,
    }) : null,
    phase === PHASE_DONE ? React.createElement(DoneSummary, {
      plan,
      statusPreset,
      customElements,
      env,
      taskResults,
    }) : null
  );
}

// ── Step Components ─────────────────────────────────────────────────────────

function PlanStep({ onSelect }) {
  return React.createElement(Box, { flexDirection: 'column', marginTop: 0 },
    React.createElement(Text, { bold: true }, '  [1/2] Which Claude plan are you on?'),
    React.createElement(Newline, null),
    React.createElement(Box, { paddingLeft: 4 },
      React.createElement(Select, {
        options: [
          { label: 'Pro        ~500K usage limit / 5hr', value: 'pro' },
          { label: 'Max        ~2M usage limit / 5hr', value: 'max' },
          { label: 'API only   (no plan limits)', value: 'api' },
        ],
        onChange: onSelect,
      })
    )
  );
}

function StatusLineStep({ onSelect }) {
  const STATUS_OPTIONS = [
    { label: 'Recommended   all modules enabled', value: 'recommended' },
    { label: 'Minimal       model + context + 5hr limit', value: 'minimal' },
    { label: 'Custom        pick your own modules', value: 'custom' },
    { label: 'Skip', value: 'skip' },
  ];

  const [highlightIndex, setHighlightIndex] = useState(0);

  useInput((input, key) => {
    if (key.upArrow) setHighlightIndex(i => Math.max(0, i - 1));
    else if (key.downArrow) setHighlightIndex(i => Math.min(STATUS_OPTIONS.length - 1, i + 1));
    else if (key.return) onSelect(STATUS_OPTIONS[highlightIndex].value);
  });

  const currentPreset = STATUS_OPTIONS[highlightIndex].value;
  const preview = previewForPreset(currentPreset);

  return React.createElement(Box, { flexDirection: 'column', marginTop: 0 },
    React.createElement(Text, { bold: true }, '  [2/2] Configure Claude Code status line?'),
    React.createElement(Newline, null),
    React.createElement(Box, { flexDirection: 'column', paddingLeft: 4 },
      ...STATUS_OPTIONS.map((opt, i) =>
        React.createElement(Text, { key: opt.value },
          i === highlightIndex
            ? React.createElement(Text, { color: 'cyan' }, '> ' + opt.label)
            : React.createElement(Text, { dimColor: true }, '  ' + opt.label)
        )
      )
    ),
    React.createElement(Newline, null),
    preview ? React.createElement(Box, {
      borderStyle: 'round',
      borderColor: currentPreset === 'skip' ? 'gray' : 'cyan',
      paddingX: 1,
      marginLeft: 4,
    },
      React.createElement(Box, { flexDirection: 'column' },
        React.createElement(Text, { dimColor: true }, 'Preview:'),
        ...preview.split('\n').map((line, i) =>
          React.createElement(Text, { key: `preview-${currentPreset}-${i}` }, line)
        )
      )
    ) : null
  );
}

// ── Customizer Step ─────────────────────────────────────────────────────────

function CustomizerStep({ onConfirm }) {
  const [cursor, setCursor] = useState(0);
  const [enabled, setEnabled] = useState(() => new Set(ALL_RICH_KEYS));

  // Build display rows: line headers + elements
  const rows = [];
  let currentLine = 0;
  for (const el of RICH_ELEMENTS) {
    if (el.line !== currentLine) {
      currentLine = el.line;
      rows.push({ type: 'header', line: el.line });
    }
    rows.push({ type: 'element', ...el });
  }

  // Only count element rows for cursor navigation
  const elementRows = rows.filter(r => r.type === 'element');

  useInput((input, key) => {
    if (key.upArrow) {
      setCursor(c => Math.max(0, c - 1));
    } else if (key.downArrow) {
      setCursor(c => Math.min(elementRows.length - 1, c + 1));
    } else if (input === ' ') {
      const el = elementRows[cursor];
      setEnabled(prev => {
        const next = new Set(prev);
        if (next.has(el.key)) next.delete(el.key);
        else next.add(el.key);
        return next;
      });
    } else if (key.return) {
      onConfirm(Array.from(enabled));
    }
  });

  const preview = buildPreviewFromElements(enabled);
  const LINE_LABELS = { 1: 'LINE 1', 2: 'LINE 2', 3: 'LINE 3' };

  let elementIndex = 0;

  return React.createElement(Box, { flexDirection: 'column', marginTop: 0 },
    React.createElement(Text, { bold: true }, '  Customize your status line'),
    React.createElement(Text, { dimColor: true }, '  \u2191\u2193 navigate  space toggle  enter confirm'),
    React.createElement(Newline, null),

    // Element rows
    ...rows.map((row, i) => {
      if (row.type === 'header') {
        return React.createElement(Text, { key: `h-${row.line}`, dimColor: true, bold: true },
          '    ' + LINE_LABELS[row.line]
        );
      }

      const idx = elementIndex++;
      const isActive = idx === cursor;
      const isOn = enabled.has(row.key);
      const check = isOn ? chalk.green('[x]') : chalk.dim('[ ]');
      const label = row.label.padEnd(20);
      const example = chalk.dim(row.example);

      if (isActive) {
        return React.createElement(Text, { key: row.key },
          '  ', React.createElement(Text, { color: 'cyan' }, '> '),
          check, ' ', label, ' ', example
        );
      }
      return React.createElement(Text, { key: row.key },
        '    ', check, ' ', label, ' ', example
      );
    }),

    React.createElement(Newline, null),

    // Live preview
    enabled.size > 0
      ? React.createElement(Box, {
          borderStyle: 'round',
          borderColor: 'cyan',
          paddingX: 1,
          marginLeft: 4,
        },
          React.createElement(Box, { flexDirection: 'column' },
            React.createElement(Text, { dimColor: true }, 'Live preview:'),
            ...preview.split('\n').map((line, j) =>
              React.createElement(Text, { key: `cpreview-${j}-${enabled.size}` }, line)
            )
          )
        )
      : React.createElement(Text, { dimColor: true, color: 'yellow' }, '    No modules selected')
  );
}

// ── Processing Phase ────────────────────────────────────────────────────────

function ProcessingPhase({ tasks, taskIndex, taskResults, progress }) {
  return React.createElement(Box, { flexDirection: 'column', marginTop: 1 },
    React.createElement(Text, { bold: true }, '  Setting up tokburn...'),
    React.createElement(Newline, null),
    React.createElement(Box, { paddingLeft: 2 },
      React.createElement(ProgressBar, { value: progress })
    ),
    React.createElement(Newline, null),
    ...tasks.map((task, i) => {
      if (i < taskIndex) {
        return React.createElement(Text, { key: task.key },
          '  ', React.createElement(Text, { color: 'green' }, '\u2713'),
          ' ', task.label
        );
      } else if (i === taskIndex) {
        return React.createElement(Box, { key: task.key },
          React.createElement(Text, null, '  '),
          React.createElement(Spinner, { label: task.label })
        );
      } else {
        return React.createElement(Text, { key: task.key, dimColor: true },
          '  \u25CB ', task.label
        );
      }
    })
  );
}

// ── Done Summary ────────────────────────────────────────────────────────────

function DoneSummary({ plan, statusPreset, customElements, env, taskResults }) {
  const elCount = customElements ? customElements.length : ALL_RICH_KEYS.length;
  const statusDesc = !statusPreset || statusPreset === 'skip' ? 'skipped'
    : statusPreset === 'custom' ? 'Custom (' + elCount + ' modules)'
    : statusPreset.charAt(0).toUpperCase() + statusPreset.slice(1) + ' (' + elCount + ' modules)';

  return React.createElement(Box, { flexDirection: 'column', marginTop: 1 },
    React.createElement(Text, { dimColor: true }, `  ${'─'.repeat(2)} Setup complete ${'─'.repeat(25)}`),
    React.createElement(Newline, null),
    React.createElement(Text, null, completedLine('Plan', PLAN_LABELS[plan])),
    React.createElement(Text, null, completedLine('Status line', statusDesc)),
    React.createElement(Newline, null),
    React.createElement(Text, { bold: true }, '  Try these:'),
    React.createElement(Text, null, '    ', React.createElement(Text, { color: 'cyan' }, 'tokburn status'), '   config + today\'s usage'),
    React.createElement(Text, null, '    ', React.createElement(Text, { color: 'cyan' }, 'tokburn today'), '    detailed breakdown by model'),
    React.createElement(Text, null, '    ', React.createElement(Text, { color: 'cyan' }, 'tokburn live'), '     real-time TUI dashboard'),
    React.createElement(Text, null, '    ', React.createElement(Text, { color: 'cyan' }, 'tokburn scan'), '     analyze all Claude Code logs'),
    React.createElement(Newline, null)
  );
}

// ── Entry point ─────────────────────────────────────────────────────────────

render(React.createElement(App));
