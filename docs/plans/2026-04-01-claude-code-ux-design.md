# tokburn CLI — Claude Code Integration UX Design

## Overview

Three features that make tokburn native to the Claude Code experience:

1. **Interactive setup wizard** (`tokburn init`)
2. **Per-task token card** (collapsed/expanded, shown after each task)
3. **Persistent status line** (below the input bar)

## Feature 1: `tokburn init` — Setup Wizard

An interactive terminal wizard that runs once and configures everything:

```
$ tokburn init

  tokburn setup
  ─────────────────────────────────

  Detecting shell... zsh
  Detecting Claude Code... found

  [1/3] Start proxy daemon?
        > Yes, start now (recommended)
          No, I'll start it manually

  [2/3] Add ANTHROPIC_BASE_URL to ~/.zshrc?
        > Yes, add it (recommended)
          No, I'll configure manually

  [3/3] Install Claude Code hook?
        > Yes, auto-start tokburn with Claude Code
          No, skip hooks

  Done. tokburn is tracking your usage.

  Try: tokburn status
```

On first API call detected, shows a brief animation confirming data is flowing.

Also registers as a Claude Code hook in `.claude/settings.json` so:
- tokburn auto-starts when Claude Code launches
- Shows session summary when Claude Code exits

## Feature 2: Per-Task Token Card

Displayed after each completed Claude Code task. Collapsed by default, expandable.

### Collapsed (default)

```
  > Refactored auth middleware  12.4K tok  $0.04  87% left
```

Single line. Task name truncated to fit. Numbers right-aligned. No border noise.
Color: green normally, amber at 50-80%, red at 80%+.

### Expanded (keypress to toggle)

```
  v Refactored auth middleware
  ┌──────────────────────────────────────────────────┐
  │  This Task              Session Total             │
  │  In:   8,200 (2K cached)    In:  142,800          │
  │  Out:  4,200                Out:  58,200           │
  │  Cost: $0.04                Cost: $1.95            │
  │                                                    │
  │  ██████████████████████░░░░░░░░  74% of 5hr limit  │
  │  ~1hr 18min remaining  23 requests today           │
  └──────────────────────────────────────────────────┘
```

Rules:
- Card width is fixed (e.g., 54 chars inner). All text padded/truncated to fit.
- "cached" only shown when cache tokens > 0.
- Progress bar color matches percentage thresholds.
- Auto-collapses after 3 seconds.
- At >90%, collapsed line shows warning state:
  ```
  > Auth middleware  12.4K  91%! ~12min left
  ```

### How it works technically

The proxy tracks tokens per-request. Claude Code hooks (post-task) trigger
`tokburn _task-summary <task-name>` which reads recent usage since last task
boundary and renders the card to stdout.

Task boundaries detected by:
- Hook fires on Claude Code `Stop` event
- Proxy timestamps let us diff "tokens since last summary"

## Feature 3: Persistent Status Line

Below the Claude Code input bar, one line:

```
  142.8K tok  74% of 5hr limit  ~2.1K/min  $1.95
```

Updated after each request completes. Uses Claude Code's status line API
if available, otherwise rendered via hook output.

The flame icon appears only at the start as brand marker.
Warning icon replaces it when >90% of limit.

## Plan Limits

Default limits (configurable in `~/.tokburn/config.json`):

```json
{
  "plan": "pro",
  "limits": {
    "pro": { "window_hours": 5, "estimated_tokens": 500000 },
    "max": { "window_hours": 5, "estimated_tokens": 2000000 }
  }
}
```

"Time remaining" is estimated from: (tokens_remaining / burn_rate_per_min).

## Integration Points

1. `tokburn init` — writes to shell profile + `.claude/settings.json`
2. Claude Code hooks — `preToolUse` and `postToolUse` events in settings
3. `tokburn _task-summary` — internal command for hook to call
4. `tokburn _status-line` — internal command for status line rendering
5. Status line — uses Claude Code's built-in status line configuration
