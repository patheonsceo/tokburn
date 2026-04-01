/**
 * tokburn -- init-ui.mjs
 * Ink-based setup wizard for `tokburn init`.
 * ESM module using Ink 6.x, @inkjs/ui v2, React 19.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { render, Box, Text, Newline, useApp } from 'ink';
import { Select, Spinner, ProgressBar } from '@inkjs/ui';
import chalk from 'chalk';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { detectEnvironment, configurePlan, configureProxy, configureShell, configureStatusLine, PLANS } = require('./init.js');
const { getConfig } = require('./config.js');
const { PRESETS, MODULE_LIST } = require('./statusline.js');

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
  const modules = PRESETS[presetKey];
  if (!modules) return '';
  const lineOne = [];
  const extra = [];
  for (const key of modules) {
    const info = MODULE_LIST.find(m => m.key === key);
    if (!info) continue;
    if (key === 'current_limit' || key === 'weekly_limit') {
      extra.push(info.example);
    } else {
      lineOne.push(info.example);
    }
  }
  let out = '';
  if (lineOne.length > 0) out += lineOne.join(' | ');
  for (const e of extra) out += '\n' + e;
  return out;
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// ── Phase constants ─────────────────────────────────────────────────────────

const PHASE_WELCOME = 'welcome';
const PHASE_PLAN = 'plan';
const PHASE_PROXY = 'proxy';
const PHASE_SHELL = 'shell';
const PHASE_STATUSLINE = 'statusline';
const PHASE_PROCESSING = 'processing';
const PHASE_DONE = 'done';

// ── Main App ────────────────────────────────────────────────────────────────

function App() {
  const { exit } = useApp();
  const [phase, setPhase] = useState(PHASE_WELCOME);
  const [env, setEnv] = useState(null);

  // User choices
  const [plan, setPlan] = useState(null);
  const [wantProxy, setWantProxy] = useState(null);
  const [wantShell, setWantShell] = useState(null);
  const [statusPreset, setStatusPreset] = useState(null);

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
      setEnv({ home: '', shell: 'unknown', rcFile: '', rcPath: '', claudeDir: '', claudeSettings: '', hasClaudeCode: false });
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

    if (wantProxy) {
      tasks.push({
        key: 'proxy',
        label: 'Proxy started',
        run: () => {
          const result = configureProxy();
          return { pid: result.pid, message: result.message };
        },
      });
    }

    if (wantShell && env && env.hasClaudeCode) {
      tasks.push({
        key: 'shell',
        label: 'Shell configured',
        run: () => {
          const config = getConfig();
          const result = configureShell(env.rcPath, config.port);
          return { added: result.added, reason: result.reason };
        },
      });
    }

    if (statusPreset && statusPreset !== 'skip' && env && env.hasClaudeCode) {
      tasks.push({
        key: 'statusline',
        label: 'Status line configured',
        run: () => {
          const modules = PRESETS[statusPreset];
          configureStatusLine(modules);
          return { count: modules.length };
        },
      });
    }

    return tasks;
  }

  // ── Handlers ────────────────────────────────────────────────────────────

  const handlePlanSelect = useCallback((value) => {
    setPlan(value);
    setPhase(PHASE_PROXY);
  }, []);

  const handleProxySelect = useCallback((value) => {
    setWantProxy(value === 'yes');
    if (env && env.hasClaudeCode) {
      setPhase(PHASE_SHELL);
    } else {
      // Skip shell and statusline if no Claude Code
      setWantShell(false);
      setStatusPreset('skip');
      setPhase(PHASE_PROCESSING);
    }
  }, [env]);

  const handleShellSelect = useCallback((value) => {
    setWantShell(value === 'yes');
    if (env && env.hasClaudeCode) {
      setPhase(PHASE_STATUSLINE);
    } else {
      setStatusPreset('skip');
      setPhase(PHASE_PROCESSING);
    }
  }, [env]);

  const handleStatusLineSelect = useCallback((value) => {
    setStatusPreset(value);
    setPhase(PHASE_PROCESSING);
  }, []);

  // ── Render ──────────────────────────────────────────────────────────────

  if (!env) {
    return React.createElement(Box, { paddingX: 2 },
      React.createElement(Spinner, { label: 'Detecting environment...' })
    );
  }

  return React.createElement(Box, { flexDirection: 'column', paddingX: 1 },
    // Logo + header (always shown)
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
      React.createElement(Text, null,
        '  Works with: ',
        React.createElement(Text, { color: 'cyan' }, 'Claude Code'),
        React.createElement(Text, { dimColor: true }, ' | Codex, Cursor -- coming soon')
      ),
      React.createElement(Newline, null)
    ),

    // Completed steps
    plan ? React.createElement(Text, null, completedLine('Plan', PLAN_LABELS[plan])) : null,
    wantProxy !== null ? React.createElement(Text, null, completedLine('Proxy', wantProxy ? 'start now' : 'skipped')) : null,
    wantShell !== null ? React.createElement(Text, null, completedLine('Shell', wantShell ? `add to ~/${env.rcFile}` : 'manual')) : null,
    statusPreset !== null && phase !== PHASE_STATUSLINE ? React.createElement(Text, null, completedLine('Status line', statusPreset === 'skip' ? 'skipped' : `${statusPreset[0].toUpperCase() + statusPreset.slice(1)} (${(PRESETS[statusPreset] || []).length})`)) : null,

    // Active phase
    phase === PHASE_PLAN ? React.createElement(PlanStep, { onSelect: handlePlanSelect }) : null,
    phase === PHASE_PROXY ? React.createElement(ProxyStep, { onSelect: handleProxySelect }) : null,
    phase === PHASE_SHELL ? React.createElement(ShellStep, { onSelect: handleShellSelect, rcFile: env.rcFile }) : null,
    phase === PHASE_STATUSLINE ? React.createElement(StatusLineStep, { onSelect: handleStatusLineSelect }) : null,
    phase === PHASE_PROCESSING ? React.createElement(ProcessingPhase, {
      tasks: buildTaskList(),
      taskIndex,
      taskResults,
      progress,
    }) : null,
    phase === PHASE_DONE ? React.createElement(DoneSummary, {
      plan,
      wantProxy,
      wantShell,
      statusPreset,
      env,
      taskResults,
    }) : null
  );
}

// ── Step Components ─────────────────────────────────────────────────────────

function PlanStep({ onSelect }) {
  return React.createElement(Box, { flexDirection: 'column', marginTop: 0 },
    React.createElement(Text, { bold: true }, '  [1/4] Which Claude plan are you on?'),
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

function ProxyStep({ onSelect }) {
  return React.createElement(Box, { flexDirection: 'column', marginTop: 0 },
    React.createElement(Text, { bold: true }, '  [2/4] Start the proxy daemon?'),
    React.createElement(Text, { dimColor: true }, '        Enables per-request tracking for detailed breakdowns.'),
    React.createElement(Newline, null),
    React.createElement(Box, { paddingLeft: 4 },
      React.createElement(Select, {
        options: [
          { label: 'Yes, start now', value: 'yes' },
          { label: 'No, skip', value: 'no' },
        ],
        onChange: onSelect,
      })
    )
  );
}

function ShellStep({ onSelect, rcFile }) {
  return React.createElement(Box, { flexDirection: 'column', marginTop: 0 },
    React.createElement(Text, { bold: true }, `  [3/4] Add ANTHROPIC_BASE_URL to ~/${rcFile}?`),
    React.createElement(Text, { dimColor: true }, '        Required for the proxy to intercept API calls.'),
    React.createElement(Newline, null),
    React.createElement(Box, { paddingLeft: 4 },
      React.createElement(Select, {
        options: [
          { label: 'Yes, add it', value: 'yes' },
          { label: 'No, I\'ll do it manually', value: 'no' },
        ],
        onChange: onSelect,
      })
    )
  );
}

function StatusLineStep({ onSelect }) {
  const [selected, setSelected] = useState(null);

  const handleChange = useCallback((value) => {
    setSelected(value);
    onSelect(value);
  }, [onSelect]);

  return React.createElement(Box, { flexDirection: 'column', marginTop: 0 },
    React.createElement(Text, { bold: true }, '  [4/4] Configure Claude Code status line?'),
    React.createElement(Newline, null),
    React.createElement(Box, { paddingLeft: 4 },
      React.createElement(Select, {
        options: [
          { label: 'Recommended   model | ctx% | repo | limits | cost', value: 'recommended' },
          { label: 'Minimal       model | current rate limit', value: 'minimal' },
          { label: 'Full          everything including burn rate', value: 'full' },
          { label: 'Skip', value: 'skip' },
        ],
        onChange: handleChange,
      })
    ),
    // Preview box shown after selection or for the default
    !selected ? React.createElement(Box, {
      borderStyle: 'round',
      borderColor: 'gray',
      paddingX: 1,
      marginTop: 1,
      marginLeft: 4,
    },
      React.createElement(Box, { flexDirection: 'column' },
        React.createElement(Text, { dimColor: true }, 'Preview (Recommended):'),
        ...previewForPreset('recommended').split('\n').map((line, i) =>
          React.createElement(Text, { key: `p-${i}` }, line)
        )
      )
    ) : null
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
        // Done
        return React.createElement(Text, { key: task.key },
          '  ', React.createElement(Text, { color: 'green' }, '\u2713'),
          ' ', task.label,
          taskResults[task.key] && taskResults[task.key].pid ? ` (PID ${taskResults[task.key].pid})` : ''
        );
      } else if (i === taskIndex) {
        // Active
        return React.createElement(Box, { key: task.key },
          React.createElement(Text, null, '  '),
          React.createElement(Spinner, { label: task.label })
        );
      } else {
        // Pending
        return React.createElement(Text, { key: task.key, dimColor: true },
          '  \u25CB ', task.label
        );
      }
    })
  );
}

// ── Done Summary ────────────────────────────────────────────────────────────

function DoneSummary({ plan, wantProxy, wantShell, statusPreset, env, taskResults }) {
  const proxyResult = taskResults.proxy || {};
  const shellResult = taskResults.shell || {};

  const proxyDesc = !wantProxy ? 'skipped'
    : proxyResult.pid ? `started :${proxyResult.pid}`
    : proxyResult.message || 'started';

  const shellDesc = !wantShell ? 'skipped'
    : shellResult.added ? `added to ~/${env.rcFile}`
    : shellResult.reason === 'already exists' ? 'already in rc'
    : 'configured';

  const statusDesc = !statusPreset || statusPreset === 'skip' ? 'skipped'
    : `${statusPreset[0].toUpperCase() + statusPreset.slice(1)} (${(PRESETS[statusPreset] || []).length})`;

  return React.createElement(Box, { flexDirection: 'column', marginTop: 1 },
    React.createElement(Text, { dimColor: true }, `  ${'─'.repeat(2)} Setup complete ${'─'.repeat(25)}`),
    React.createElement(Newline, null),
    React.createElement(Text, null, completedLine('Plan', PLAN_LABELS[plan])),
    React.createElement(Text, null, completedLine('Proxy', proxyDesc)),
    React.createElement(Text, null, completedLine('Shell', shellDesc)),
    React.createElement(Text, null, completedLine('Status line', statusDesc)),
    React.createElement(Newline, null),
    React.createElement(Text, { bold: true }, '  Try these:'),
    React.createElement(Text, null, '    ', React.createElement(Text, { color: 'cyan' }, 'tokburn status'), '    check everything'),
    React.createElement(Text, null, '    ', React.createElement(Text, { color: 'cyan' }, 'tokburn today'), '     see today\'s usage'),
    React.createElement(Text, null, '    ', React.createElement(Text, { color: 'cyan' }, 'tokburn live'), '      real-time dashboard'),
    React.createElement(Newline, null)
  );
}

// ── Entry point ─────────────────────────────────────────────────────────────

render(React.createElement(App));
