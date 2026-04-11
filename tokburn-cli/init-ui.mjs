/**
 * tokburn -- init-ui.mjs
 * Ink-based setup wizard for `tokburn init`.
 * 5-step wizard: Plan → Tokemon → Personality → Status Line → Hatch
 * ESM module using Ink 6.x, @inkjs/ui v2, React 19.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { render, Box, Text, Newline, useApp, useInput } from 'ink';
import { Select, Spinner, ProgressBar } from '@inkjs/ui';
import chalk from 'chalk';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { detectEnvironment, configurePlan, configureStatusLine, configureCompanion, PLANS } = require('./init.js');
const { getConfig } = require('./config.js');
const { renderSprite, getSprite, COMPANIONS } = require('./sprites.js');
const { getMessage, getWatchEmoji } = require('./personality.js');

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

const TOKEMON_INFO = {
  flint: { name: 'Flint', type: 'Fire', personality: 'Sassy', flavor: 'Fierce flame spirit. Roasts your spending.' },
  pixel: { name: 'Pixel', type: 'Tech', personality: 'Hype', flavor: 'Digital creature. ALL CAPS energy.' },
  mochi: { name: 'Mochi', type: 'Nature', personality: 'Anxious', flavor: 'Round blob. Worries about everything.' },
};

const PERSONALITY_INFO = {
  sassy:   { name: 'Sassy',   desc: 'Deadpan humor, roasts spending' },
  hype:    { name: 'Hype',    desc: 'ALL CAPS energy, lives for big numbers' },
  anxious: { name: 'Anxious', desc: 'Nervous, sweet, worried about tokens' },
};

function dots(label, value, width = 40) {
  const used = label.length + value.length + 2;
  const count = Math.max(2, width - used);
  return chalk.dim('.'.repeat(count));
}

function completedLine(label, value) {
  return `  ${chalk.green('\u2713')} ${label} ${dots(label, value)} ${chalk.bold(value)}`;
}

/** Pre-render a sprite to ANSI string rows for display in Ink */
function renderSpriteText(companion, stage, expression) {
  const pixels = getSprite(companion, stage, expression);
  return renderSprite(pixels);
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// ── Phase constants ─────────────────────────────────────────────────────────

const PHASE_WELCOME = 'welcome';
const PHASE_PLAN = 'plan';
const PHASE_TOKEMON = 'tokemon';
const PHASE_PERSONALITY = 'personality';
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
  const [companion, setCompanion] = useState(null);
  const [personality, setPersonality] = useState(null);
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
      setEnv({ home: '', shell: 'unknown', claudeDir: '', claudeSettings: '', hasClaudeCode: false });
    }
  }, []);

  // Auto-advance from welcome
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
        await sleep(300);

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
      await sleep(500);
      setPhase(PHASE_DONE);
    }

    runTasks();
    return () => { cancelled = true; };
  }, [phase]);

  // Exit after done phase renders
  useEffect(() => {
    if (phase === PHASE_DONE) {
      const t = setTimeout(() => exit(), 1500);
      return () => clearTimeout(t);
    }
  }, [phase, exit]);

  // ── Task builders ───────────────────────────────────────────────────────

  function buildTaskList() {
    const tasks = [];

    tasks.push({
      key: 'plan',
      label: 'Plan configured',
      run: () => { configurePlan(plan); },
    });

    tasks.push({
      key: 'companion',
      label: 'Tokemon hatched',
      run: () => { configureCompanion(companion, personality); },
    });

    if (statusPreset !== 'skip' && env && env.hasClaudeCode) {
      tasks.push({
        key: 'statusline',
        label: 'Status line configured',
        run: () => { configureStatusLine(['rich']); },
      });
    }

    return tasks;
  }

  // ── Handlers ────────────────────────────────────────────────────────────

  const handlePlanSelect = useCallback((value) => {
    setPlan(value);
    setPhase(PHASE_TOKEMON);
  }, []);

  const handleTokemonSelect = useCallback((value) => {
    setCompanion(value);
    // Set default personality for this Tokemon
    const defaults = { flint: 'sassy', pixel: 'hype', mochi: 'anxious' };
    setPersonality(defaults[value]);
    setPhase(PHASE_PERSONALITY);
  }, []);

  const handlePersonalitySelect = useCallback((value) => {
    setPersonality(value);
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

  const stepCount = env.hasClaudeCode ? 4 : 3;
  const stepNum = phase === PHASE_PLAN ? 1
    : phase === PHASE_TOKEMON ? 2
    : phase === PHASE_PERSONALITY ? 3
    : phase === PHASE_STATUSLINE ? 4
    : null;

  return React.createElement(Box, { flexDirection: 'column', paddingX: 1 },
    // Logo + header
    React.createElement(Box, { flexDirection: 'column' },
      React.createElement(Text, { color: 'yellow' }, LOGO),
      React.createElement(Text, { dimColor: true }, `  Tokemons — your coding companion  v${pkg.version}`),
      React.createElement(Newline, null),
      React.createElement(Text, { dimColor: true }, '  ' + '\u2500'.repeat(44)),
      React.createElement(Newline, null)
    ),

    // Completed steps
    plan ? React.createElement(Text, null, completedLine('Plan', PLAN_LABELS[plan])) : null,
    companion && phase !== PHASE_TOKEMON
      ? React.createElement(Text, null, completedLine('Tokemon', TOKEMON_INFO[companion].name))
      : null,
    personality && phase !== PHASE_PERSONALITY && phase !== PHASE_TOKEMON
      ? React.createElement(Text, null, completedLine('Personality', PERSONALITY_INFO[personality].name))
      : null,
    statusPreset && phase !== PHASE_STATUSLINE && statusPreset !== 'skip'
      ? React.createElement(Text, null, completedLine('Status line', 'Recommended'))
      : null,

    // Active phase
    phase === PHASE_PLAN ? React.createElement(PlanStep, { onSelect: handlePlanSelect, step: 1, total: stepCount }) : null,
    phase === PHASE_TOKEMON ? React.createElement(TokemonStep, { onSelect: handleTokemonSelect, step: 2, total: stepCount }) : null,
    phase === PHASE_PERSONALITY ? React.createElement(PersonalityStep, {
      onSelect: handlePersonalitySelect,
      companion,
      step: 3,
      total: stepCount,
    }) : null,
    phase === PHASE_STATUSLINE ? React.createElement(StatusLineStep, { onSelect: handleStatusLineSelect, step: 4, total: stepCount }) : null,
    phase === PHASE_PROCESSING ? React.createElement(ProcessingPhase, {
      tasks: buildTaskList(),
      taskIndex,
      taskResults,
      progress,
    }) : null,
    phase === PHASE_DONE ? React.createElement(DonePhase, { companion, personality }) : null
  );
}

// ── Step Components ─────────────────────────────────────────────────────────

function PlanStep({ onSelect, step, total }) {
  return React.createElement(Box, { flexDirection: 'column', marginTop: 0 },
    React.createElement(Text, { bold: true }, `  [${step}/${total}] Which Claude plan are you on?`),
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

function TokemonStep({ onSelect, step, total }) {
  const [cursor, setCursor] = useState(0);
  const companions = ['flint', 'pixel', 'mochi'];

  useInput((input, key) => {
    if (key.leftArrow || key.upArrow) setCursor(c => Math.max(0, c - 1));
    else if (key.rightArrow || key.downArrow) setCursor(c => Math.min(2, c + 1));
    else if (key.return) onSelect(companions[cursor]);
  });

  const current = companions[cursor];
  const info = TOKEMON_INFO[current];
  const spriteRows = renderSpriteText(current, 1, 'normal');

  return React.createElement(Box, { flexDirection: 'column', marginTop: 0 },
    React.createElement(Text, { bold: true }, `  [${step}/${total}] Choose your starter Tokemon`),
    React.createElement(Text, { dimColor: true }, '  \u2190\u2192 or \u2191\u2193 to browse, enter to select'),
    React.createElement(Newline, null),

    // Tokemon selector tabs
    React.createElement(Box, { paddingLeft: 4, gap: 2 },
      ...companions.map((c, i) => {
        const ti = TOKEMON_INFO[c];
        return React.createElement(Text, { key: c },
          i === cursor
            ? React.createElement(Text, { color: 'cyan', bold: true }, `[ ${ti.name} ]`)
            : React.createElement(Text, { dimColor: true }, `  ${ti.name}  `)
        );
      })
    ),
    React.createElement(Newline, null),

    // Sprite preview
    React.createElement(Box, { paddingLeft: 4, flexDirection: 'column' },
      ...spriteRows.map((row, i) =>
        React.createElement(Text, { key: `sprite-${cursor}-${i}` }, row)
      )
    ),
    React.createElement(Newline, null),

    // Info
    React.createElement(Box, { paddingLeft: 4, flexDirection: 'column' },
      React.createElement(Text, null,
        React.createElement(Text, { bold: true }, info.name),
        React.createElement(Text, { dimColor: true }, ` the ${info.type} type`)
      ),
      React.createElement(Text, { dimColor: true }, info.flavor),
      React.createElement(Text, { dimColor: true }, `Default personality: ${info.personality}`)
    )
  );
}

function PersonalityStep({ onSelect, companion, step, total }) {
  const [cursor, setCursor] = useState(0);
  const personalities = ['sassy', 'hype', 'anxious'];

  useInput((input, key) => {
    if (key.upArrow) setCursor(c => Math.max(0, c - 1));
    else if (key.downArrow) setCursor(c => Math.min(2, c + 1));
    else if (key.return) onSelect(personalities[cursor]);
  });

  const current = personalities[cursor];
  const info = PERSONALITY_INFO[current];

  // Show sample quips for each mood
  const sampleMoods = ['chill', 'alert', 'stressed', 'panic'];
  const samples = sampleMoods.map(mood => getMessage(current, null, mood));

  return React.createElement(Box, { flexDirection: 'column', marginTop: 0 },
    React.createElement(Text, { bold: true }, `  [${step}/${total}] Choose your Tokemon's personality`),
    React.createElement(Newline, null),

    // Personality options
    React.createElement(Box, { flexDirection: 'column', paddingLeft: 4 },
      ...personalities.map((p, i) => {
        const pi = PERSONALITY_INFO[p];
        return React.createElement(Text, { key: p },
          i === cursor
            ? React.createElement(Text, { color: 'cyan' }, `> ${pi.name.padEnd(10)} ${pi.desc}`)
            : React.createElement(Text, { dimColor: true }, `  ${pi.name.padEnd(10)} ${pi.desc}`)
        );
      })
    ),
    React.createElement(Newline, null),

    // Sample quips
    React.createElement(Box, {
      borderStyle: 'round',
      borderColor: 'cyan',
      paddingX: 1,
      marginLeft: 4,
      flexDirection: 'column',
    },
      React.createElement(Text, { dimColor: true }, 'Sample quips:'),
      ...samples.map((quip, i) =>
        React.createElement(Text, { key: `quip-${cursor}-${i}`, dimColor: true },
          `  ${sampleMoods[i].padEnd(10)} "${quip}"`)
      )
    )
  );
}

function StatusLineStep({ onSelect, step, total }) {
  return React.createElement(Box, { flexDirection: 'column', marginTop: 0 },
    React.createElement(Text, { bold: true }, `  [${step}/${total}] Configure Claude Code status line?`),
    React.createElement(Newline, null),
    React.createElement(Box, { paddingLeft: 4 },
      React.createElement(Select, {
        options: [
          { label: 'Recommended   full Tokemon status line', value: 'recommended' },
          { label: 'Skip          configure later', value: 'skip' },
        ],
        onChange: onSelect,
      })
    )
  );
}

// ── Processing Phase ────────────────────────────────────────────────────────

function ProcessingPhase({ tasks, taskIndex, taskResults, progress }) {
  return React.createElement(Box, { flexDirection: 'column', marginTop: 1 },
    React.createElement(Text, { bold: true }, '  Hatching your Tokemon...'),
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

// ── Done Phase ──────────────────────────────────────────────────────────────

function DonePhase({ companion, personality }) {
  const info = TOKEMON_INFO[companion];
  const spriteRows = renderSpriteText(companion, 1, 'happy');
  const greeting = getMessage(personality, 'session_start', 'chill');

  return React.createElement(Box, { flexDirection: 'column', marginTop: 1 },
    React.createElement(Text, { dimColor: true }, `  ${'─'.repeat(2)} Your Tokemon has hatched! ${'─'.repeat(19)}`),
    React.createElement(Newline, null),

    // Sprite + greeting side by side
    React.createElement(Box, { paddingLeft: 4, gap: 2 },
      React.createElement(Box, { flexDirection: 'column' },
        ...spriteRows.map((row, i) =>
          React.createElement(Text, { key: `done-sprite-${i}` }, row)
        )
      ),
      React.createElement(Box, { flexDirection: 'column', justifyContent: 'center' },
        React.createElement(Text, { bold: true }, `${info.name} the ${info.type} type`),
        React.createElement(Text, { dimColor: true }, `"${greeting}"`),
        React.createElement(Newline, null),
        React.createElement(Text, { dimColor: true }, 'Write code to earn XP and evolve!')
      )
    ),
    React.createElement(Newline, null)
  );
}

// ── Entry point ─────────────────────────────────────────────────────────────

export function runInkInit() {
  return new Promise((resolve) => {
    const instance = render(React.createElement(App));
    instance.waitUntilExit().then(resolve);
  });
}

// Direct execution
render(React.createElement(App));
