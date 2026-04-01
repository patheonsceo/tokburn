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
Opus 4.6 (1M context) | ctx 31% | tokburn (main*) | 224.9K tok | $38.86 | ~8.6K/min
current  ●●●●●○○○○○  48%  ↻ 51min
weekly   ●●●●●○○○○○  48%  ↻ Fri 12:30PM
```

Works with: **Claude Code** | Codex, Cursor -- coming soon

---

## The Problem

Claude Pro gives you a 5-hour usage window. You don't know how much you've used until you hit the wall mid-conversation and lose your entire context. Saying "hi" to Claude Code can cost 3% of your session. Refactoring a file? Maybe 15%. You have no idea until it's too late.

The API is the same story -- Anthropic returns token counts per-request, but nobody tracks the running total. You burn through budget blind.

**tokburn fixes both.**

---

## Table of Contents

- [For Claude Code users (CLI)](#for-claude-code-users) -- npm package with status line, live TUI, cost tracking
- [For claude.ai users (Extension)](#for-claudeai-users) -- Chrome extension with floating pill overlay
- [How it works](#how-it-works) -- architecture in 30 seconds
- [Benchmarks](#benchmarks) -- real performance numbers
- [Privacy](#privacy) -- everything stays on your machine

---

## For Claude Code Users

> `npm i -g tokburn && tokburn init` -- that's it.

tokburn adds a **live status line** to Claude Code that shows your token usage, rate limits, cost, and burn rate -- updated after every request.

```
  Opus 4.6 | ctx 13% | tokburn (main*) | $1.95
  current  ●●○○○○○○○○  9%  ↻ 3hr 32min
  weekly   ●●●●○○○○○○  45% ↻ Fri 12:30PM
```

### Quick Start

```bash
npm i -g tokburn
tokburn init
```

The wizard detects your shell and Claude Code installation, then configures everything:

```
  tokburn setup
  ───────────────────────────────────

  Detected: zsh shell, Claude Code installed

  [1/4] Which Claude plan are you on?
        1) Pro       ~500K tokens / 5hr window
        2) Max       ~2M tokens / 5hr window
        3) API only  (no plan limits)

  [2/4] Start the proxy daemon?
  [3/4] Add ANTHROPIC_BASE_URL to ~/.zshrc?
  [4/4] Configure Claude Code status line?

        1) Recommended   model | ctx% | repo | limits | cost
        2) Minimal       model | current rate limit
        3) Full          everything including burn rate
        4) Custom        pick your own modules

  ───────────────────────────────────
  Done. tokburn is ready.
```

### Status Line Presets

You pick what shows up. Three presets, or build your own:

**Recommended** -- the essentials:
```
  Opus 4.6 | ctx 13% | tokburn (main*) | $1.95
  current  ●●○○○○○○○○  9%  ↻ 3hr 32min
  weekly   ●●●●○○○○○○  45% ↻ Fri 12:30PM
```

**Minimal** -- just the limit:
```
  Opus 4.6 | ctx 13%
  current  ●●○○○○○○○○  9%  ↻ 3hr 32min
```

**Full** -- everything:
```
  Opus 4.6 | ctx 13% | tokburn (main*) | 142.8K tok | $1.95 | ~2.1K/min
  current  ●●○○○○○○○○  9%  ↻ 3hr 32min
  weekly   ●●●●○○○○○○  45% ↻ Fri 12:30PM
```

**Custom** -- toggle individual modules on/off:
```
  Status line modules:

    [x] 1. Model + context      Opus 4.6 | ctx 13%
    [x] 2. Repo + branch        tokburn (master*)
    [x] 3. Current rate limit   ○○○○○○○○○○ 9% 3hr 32min
    [x] 4. Weekly rate limit    ●●●●○○○○○○ 45% Fri 12:30PM
    [ ] 5. Token count          142.8K tok
    [x] 6. Cost estimate        $1.95
    [ ] 7. Burn rate            ~2.1K/min

  Toggle (1-7), or press enter to confirm:
```

### CLI Commands

| Command | What it does |
|---|---|
| `tokburn init` | Interactive setup wizard -- configures everything |
| `tokburn start` | Launch proxy daemon on localhost:4088 |
| `tokburn stop` | Stop the proxy |
| `tokburn status` | Proxy status + quick summary |
| `tokburn today` | Today's breakdown by model with costs |
| `tokburn week` | 7-day ASCII table |
| `tokburn live` | Real-time TUI dashboard (like htop for tokens) |
| `tokburn reset` | Clear today's data |
| `tokburn export` | Dump all data as CSV |
| `tokburn scan` | Parse Claude Code's own log files |

### `tokburn today`

```
  tokburn -- Today (2026-03-31)
  ─────────────────────────────────────────
  Total Tokens    | 142,850
  Input           | 98,200
  Output          | 44,650
  Requests        | 23
  Est. Cost       | $0.42

  By Model:
  claude-sonnet-4       |     89,200 in |     31,400 out | $0.28
  claude-haiku-4        |      9,000 in |     13,250 out | $0.06
```

### `tokburn live`

Real-time dashboard. Open it in a split pane next to Claude Code:

```
  ┌──────────────────────────────────────────────────┐
  | tokburn live  *  14:32:07                        |
  |                                                  |
  |   ●●●●●●●●●●●●●●●●●●●●●○○○○○○○○○               |
  |   74% of 5hr limit  ~1hr 18min remaining         |
  |                                                  |
  |   Input Tokens            98,200                 |
  |   Output Tokens           44,650                 |
  |   Total Tokens           142,850                 |
  |   Requests                    23                 |
  |                                                  |
  |   Burn Rate          2,847 tok/min               |
  |   Est. Cost                $0.42                 |
  |                                                  |
  |   Recent Requests                                |
  |   ──────────────────────────────────────────     |
  |   sonnet-4          1,240 tok  3s ago            |
  |   sonnet-4            890 tok  12s ago           |
  |   haiku-4             320 tok  45s ago           |
  └──────────────────────────────────────────────────┘
```

### Task Cards

After each completed task, see exactly what it cost:

```
  > Refactored auth middleware  12.4K tok  $0.04  87% left
```

Expand for the full breakdown:

```
  v Refactored auth middleware
  ┌──────────────────────────────────────────────────┐
  |  This Task              Session Total             |
  |  In:  8,200 (2K cached)     In:  142,800          |
  |  Out: 4,200                 Out:  58,200           |
  |  Cost: $0.04                Cost: $1.95            |
  |                                                    |
  |  ██████████████████████░░░░░░░░  74% of 5hr limit  |
  |  ~1hr 18min remaining  23 requests today           |
  └──────────────────────────────────────────────────┘
```

---

## For claude.ai Users

> A Chrome extension that shows token usage on claude.ai. Install it and immediately see what you're spending.

### Quick Start

1. Clone this repo or [download the ZIP](https://github.com/patheonsceo/tokburn/archive/refs/heads/main.zip)
2. Open `chrome://extensions` and enable **Developer Mode**
3. Click **Load unpacked** and select the `tokburn-ext/` folder
4. Open [claude.ai](https://claude.ai) -- the pill appears automatically

### What You See

A floating pill in the bottom-right corner of claude.ai. Color-coded: green when you're fine, amber when you should be aware, red when you're close to the limit.

Click it to expand the full dashboard:

```
  ┌─────────────────────────────────────┐
  |  tokburn            2026-03-31      |
  |                                     |
  |  ~58% of daily limit   500K limit   |
  |  ████████████████░░░░░░░░░░░░░░░░   |
  |                                     |
  |  ┌─────────┐  ┌──────────┐         |
  |  | Input   |  | Output   |         |
  |  | 42.1K   |  | 15.3K    |         |
  |  └─────────┘  └──────────┘         |
  |  ┌─────────┐  ┌──────────┐         |
  |  | Total   |  | Requests |         |
  |  | 57.4K   |  | 23       |         |
  |  └─────────┘  └──────────┘         |
  |                                     |
  |  Burn Rate         ~2.1K tok/min    |
  |                                     |
  |  Session Log                        |
  |  conv_abc123...          14.2K      |
  |  conv_def456...           8.7K      |
  └─────────────────────────────────────┘
                          57.4K  <-- pill
```

Click the extension icon for a 7-day history chart and settings (daily limit, pill toggle, data reset).

See [tokburn-ext/README.md](./tokburn-ext/README.md) for technical details.

---

## How It Works

**CLI proxy** -- tokburn runs a tiny HTTP proxy on localhost:4088. You point `ANTHROPIC_BASE_URL` at it. Every request passes through transparently to api.anthropic.com. After each response is delivered, tokburn asynchronously extracts the token counts from the API response and logs them. Your workflow is never slowed down.

**Chrome extension** -- tokburn patches `window.fetch` on claude.ai using a cloned response stream. It parses SSE events for token usage data. The original response is never touched. Everything is stored in `chrome.storage.local`.

**Status line** -- Claude Code sends session data (model, rate limits, cost, context usage) to a status line script on every update. tokburn's script formats this data with dot-bar indicators and your chosen modules. No proxy required for the status line -- it reads Claude Code's native data.

```
  Client  --->  tokburn proxy  --->  api.anthropic.com
                     |
                     |  (async, after response delivered)
                     v
               ~/.tokburn/usage.jsonl
```

---

## Benchmarks

Real measurements from the test suite (62 tests, `npm test`):

| Metric | Result |
|---|---|
| Proxy overhead (JSON) | **0.26ms** avg |
| SSE TTFB overhead | **0.36ms** |
| Throughput | **1,198 req/s** |
| SSE token parsing | **100% exact** from API usage fields |
| Fallback estimation | **avg 17.8% error** (chars/4 heuristic) |
| Cost calculation | **Exact match** to Anthropic pricing |

The proxy is invisible. Sub-millisecond overhead. 62 tests verify accuracy on every commit.

---

## Privacy

**Your data never leaves your machine.**

- The CLI proxy binds to `localhost` only -- nothing is forwarded anywhere except the original Anthropic API
- The Chrome extension makes zero external requests -- everything in `chrome.storage.local`
- No analytics. No telemetry. No accounts. No cloud.
- All code is open source. Read every line yourself: [tokburn-cli/](./tokburn-cli/) and [tokburn-ext/](./tokburn-ext/)

---

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for setup and guidelines.

Quick version: fork it, branch it, PR it. Conventional commits (`feat:`, `fix:`, `chore:`). Run `npm test`.

---

## License

[MIT](./LICENSE) -- Copyright 2026 tokburn contributors
