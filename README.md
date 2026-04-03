<div align="left">

```
  ████████╗ ██████╗ ██╗  ██╗██████╗ ██╗   ██╗██████╗ ███╗   ██╗
  ╚══██╔══╝██╔═══██╗██║ ██╔╝██╔══██╗██║   ██║██╔══██╗████╗  ██║
     ██║   ██║   ██║█████╔╝ ██████╔╝██║   ██║██████╔╝██╔██╗ ██║
     ██║   ██║   ██║██╔═██╗ ██╔══██╗██║   ██║██╔══██╗██║╚██╗██║
     ██║   ╚██████╔╝██║  ██╗██████╔╝╚██████╔╝██║  ██║██║ ╚████║
     ╚═╝    ╚═════╝ ╚═╝  ╚═╝╚═════╝  ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═══╝
```

**Token tracking for Claude Code. See what you burn.**

[![npm](https://img.shields.io/npm/v/tokburn?color=orange)](https://www.npmjs.com/package/tokburn)
[![downloads](https://img.shields.io/npm/dm/tokburn)](https://www.npmjs.com/package/tokburn)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
[![Node](https://img.shields.io/node/v/tokburn)](https://nodejs.org)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](./CONTRIBUTING.md)

</div>

```
Opus 4.6 (1M context)·Max █████░░░░░░░░░░░░░░░ 25% | main* | $18.79
5h 6% 3h25m→14:20 | 7d 64% 1d16h→04/05 | 🔥$7.6/h
$18.79 D:13.9K/106.9K | +1260/-872 | tokburn
```

Works with: **Claude Code** | Codex, Cursor -- coming soon

---

## The Problem

Claude Pro/Max gives you a 5-hour usage window. You don't know how much you've used until you hit the wall mid-conversation and lose your entire context. Saying "hi" to Claude Code can cost 3% of your session. Refactoring a file? Maybe 15%. You have no idea until it's too late.

**tokburn fixes this.**

---

## Table of Contents

- [For Claude Code users (CLI)](#for-claude-code-users) -- rich status line, analytics commands, zero config
- [For claude.ai users (Extension)](#for-claudeai-users) -- Chrome extension with floating pill overlay
- [How it works](#how-it-works) -- architecture in 30 seconds
- [Privacy](#privacy) -- everything stays on your machine

---

## For Claude Code Users

> `npm i -g tokburn && tokburn init` -- that's it. No proxy. No env vars. Nothing to break.

tokburn adds a **rich, colorful status line** to Claude Code showing your token usage, rate limits, burn rate, cost, and git stats. Updated after every response.

```
Opus 4.6 (1M context)·Max █████░░░░░░░░░░░░░░░ 25% | main* | $18.79
5h 6% 3h25m→14:20 | 7d 64% 1d16h→04/05 | 🔥$7.6/h
$18.79 D:13.9K/106.9K | +1260/-872 | tokburn
```

**Line 1:** Model, plan, context window bar, git branch, session cost
**Line 2:** 5-hour rate limit, 7-day rate limit, burn rate ($/hr)
**Line 3:** Cost + token counts, lines added/removed, directory

Colors: model in cyan, plan in green, branch in magenta, rate limits color-coded by usage (green/yellow/red), added lines green, removed lines red.

### Quick Start

```bash
npm i -g tokburn
tokburn init
```

The wizard has 2 steps:

1. Pick your plan (Pro / Max / API)
2. Configure status line (Recommended / Minimal / Custom / Skip)

That's it. No proxy daemon, no shell config, no env vars. tokburn reads Claude Code's native session data.

### Custom Status Line

Pick **Custom** in the init wizard to toggle individual elements:

```
  Customize your status line

  ↑↓ navigate  space toggle  enter confirm

  LINE 1
  [x] Model + context     Opus 4.6 (1M context)
  [x] Plan tier            ·Max
  [x] Context bar          ██████░░░░░░░░░░░░░░ 31%
  [x] Git branch           main*
  [x] Session cost         $3.69

  LINE 2
  [x] 5hr rate limit       5h 27% 3h25m→10:00
  [x] 7day rate limit      7d 75% 1d16h→04/05
  [x] Burn rate            🔥$4.9/h

  LINE 3
  [x] Token counts         $3.69 D:37K/152K
  [x] Lines changed        +156/-23
  [x] Directory            tokburn

  ╭──────────────────────────────────────────────────╮
  │ Live preview updates as you toggle               │
  ╰──────────────────────────────────────────────────╯
```

Toggle elements off and they disappear from the preview. Toggle off all of Line 3 and it disappears entirely. 11 individually configurable elements.

### CLI Commands

| Command | What it does |
|---|---|
| `tokburn init` | Interactive setup wizard |
| `tokburn status` | Config summary + today's usage |
| `tokburn today` | Today's breakdown by model with costs |
| `tokburn week` | 7-day ASCII table |
| `tokburn live` | Real-time TUI dashboard |
| `tokburn scan` | Analyze all Claude Code log history |
| `tokburn export` | Dump all data as CSV |
| `tokburn reset` | Clear cached data |
| `tokburn init --remove` | Uninstall tokburn from Claude Code |

### `tokburn today`

```
  tokburn -- Today (2026-04-03)
  ─────────────────────────────────────────
  Total Tokens    | 54,023
  Input           | 6,014
  Output          | 48,009
  Requests        | 207
  Est. Cost       | $3.69

  By Model:
  claude-opus-4-6       |      6,014 in |     48,009 out | $3.69
```

### `tokburn week`

```
  tokburn -- Last 7 Days
  ──────────────────────────────────────────────────────────
  Date        |      Input |     Output |      Total |     Cost
  ──────────────────────────────────────────────────────────
  2026-03-28  |        105 |     53,309 |     53,414 |    $4.00
  2026-03-29  |     18,630 |     44,644 |     63,274 |    $2.83
  2026-03-30  |     80,327 |    221,339 |    301,666 |   $13.13
  2026-03-31  |     74,282 |    437,760 |    512,042 |   $30.64
  2026-04-01  |      4,898 |    160,145 |    165,043 |   $11.95
  2026-04-02  |     25,771 |    259,054 |    284,825 |   $17.46
  2026-04-03  |      6,015 |     48,088 |     54,103 |    $3.70
  ──────────────────────────────────────────────────────────
  Total       |    210,028 |  1,224,339 |  1,434,367 |   $83.70
```

### `tokburn scan`

```
  Scanning Claude Code logs in: ~/.claude/projects

  Found 17,405 usage entries
  Input Tokens:  1,461,990
  Output Tokens: 2,573,787
  Total Tokens:  4,035,777
  Est. Cost:     $186.43
```

---

## For claude.ai Users

> A Chrome extension that shows token usage on claude.ai. Install it and immediately see what you're spending.

### Quick Start

1. Clone this repo or [download the ZIP](https://github.com/patheonsceo/tokburn/archive/refs/heads/main.zip)
2. Open `chrome://extensions` and enable **Developer Mode**
3. Click **Load unpacked** and select the `tokburn-ext/` folder
4. Open [claude.ai](https://claude.ai) -- the pill appears automatically

See [tokburn-ext/README.md](./tokburn-ext/README.md) for details.

---

## How It Works

**Status line** -- Claude Code sends session data (model, rate limits, cost, context usage) to a status line script via stdin on every update. tokburn's script parses this JSON and renders the formatted output. No proxy, no env vars, no interception. Just reads Claude Code's native data.

**CLI commands** -- `today`, `week`, `scan`, and `export` read Claude Code's own JSONL session logs from `~/.claude/projects/`. No separate data store needed.

**Chrome extension** -- Patches `window.fetch` on claude.ai using a cloned response stream. Parses SSE events for token usage data. The original response is never touched. Everything is stored in `chrome.storage.local`.

---

## Privacy

**Your data never leaves your machine.**

- The status line reads Claude Code's native JSON from stdin. No network requests.
- CLI commands read local JSONL log files. No cloud, no API calls.
- The Chrome extension makes zero external requests. Everything in `chrome.storage.local`.
- No analytics. No telemetry. No accounts. No cloud.
- All code is open source. Read every line: [tokburn-cli/](./tokburn-cli/) and [tokburn-ext/](./tokburn-ext/)

---

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for setup and guidelines.

Quick version: fork it, branch it, PR it. Conventional commits (`feat:`, `fix:`, `chore:`). Run `npm test`.

---

## License

[MIT](./LICENSE) -- Copyright 2026 tokburn contributors
