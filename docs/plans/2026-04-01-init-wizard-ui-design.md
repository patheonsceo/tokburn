# tokburn init -- Wizard UI Redesign

## Goal

Replace the plain console.log init wizard with a polished, branded experience using Ink (React for CLI).

## Visual Identity

- tokburn's own brand, distinct from Claude Code but fits alongside it
- ASCII figlet logo at the top
- Agent compatibility icons (Claude Code supported now, Codex/Cursor coming soon) as decoration
- Colors: green checkmarks, dim dot leaders, bright values, amber/red warnings
- Double-line box for the header banner

## Tech Stack

- **Ink** (https://github.com/vadimdemedes/ink) -- React renderer for CLI
- Ink's built-in components for text, box, select
- ink-spinner or ink-progress-bar for the processing phase

## Wizard Flow

### Screen 1: Welcome

```
   _        _
  | |_ ___ | | __ ___ _   _ _ __ _ __
  | __/ _ \| |/ /| _ | | | | '__| '_ \
  | || (_) |   < | _ | |_| | |  | | | |
   \__\___/|_|\_\|___|\__,_|_|  |_| |_|

  token tracking for Claude Code  v0.1.1
  ──────────────────────────────────────
  Detected: zsh + Claude Code

  Works with: Claude Code  (Codex, Cursor -- coming soon)
```

### Steps 1-3: Arrow-key selectors

Each step uses Ink's Select component. Completed steps accumulate above the current step with green checkmarks and dot-leader formatting:

```
  v Plan .............. Pro (~500K/5hr)
  v Proxy ............. started :12345

  [3/4] Add to ~/.zshrc?

    > Yes, add it
      No, manual
```

### Step 4: Status line with live preview

Arrow through presets and the preview box updates in real-time:

```
  [4/4] Status line preset

    > Recommended  essentials
      Minimal      just limits
      Full         everything
      Custom       pick modules
      Skip

  Preview:
  ┌────────────────────────────────────┐
  | Opus 4.6 | ctx 13% | repo | $1.95|
  | current ●●○○○○○○○○ 9% 3hr 32min  |
  | weekly  ●●●●○○○○○○ 45% Fri 12:30 |
  └────────────────────────────────────┘
```

### Processing phase: Progress bar + task lines

After user input is done, animated progress while configuring:

```
  Setting up tokburn...

  [===============>....] 3/4

  v Proxy started (PID 12345)
  v Shell configured (~/.zshrc)
  * Installing status line...
    Writing config
```

Spinner on active task, checkmark on complete, dimmed on pending.

### Done: Summary

```
  ── Setup complete ─────────────────────

  v Plan .............. Pro (~500K/5hr)
  v Proxy ............. started :12345
  v Shell ............. added to .zshrc
  v Status line ....... Recommended (5)

  Try these:
    tokburn status    check everything
    tokburn today     see today's usage
    tokburn live      real-time dashboard
```

## Dependencies

- ink (React for CLI)
- ink-select-input (arrow-key selector)
- ink-spinner (processing spinners)
- ink-progress-bar (progress bar)
- chalk (already peer dep of ink)

## Files

- `init-ui.js` -- New Ink-based wizard (replaces init.js's UI, keeps init.js's configuration logic)
- `init.js` -- Refactored to export config functions, Ink UI calls them
