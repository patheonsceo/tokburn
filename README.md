# tokburn

**See exactly how fast you're burning tokens and money with Claude.**

<!-- badges -->
[![npm version](https://img.shields.io/npm/v/tokburn)](https://www.npmjs.com/package/tokburn)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](./CONTRIBUTING.md)

---

```
  Opus 4.6 | ctx 13% | tokburn (main*) | $1.95
  current  ●●○○○○○○○○  9%  ↻ 3hr 32min
  weekly   ●●●●○○○○○○  45% ↻ Fri 12:30PM
```

Two products. One mission: **stop flying blind on token spend.**

---

## Two Tools, One Mission

| | tokburn-cli | tokburn-ext |
|---|---|---|
| **For** | Claude Code / API users | claude.ai Pro/Free users |
| **How** | Local proxy on localhost:4088 | Chrome extension on claude.ai |
| **Tracks** | Every API request, exact token counts | SSE streams, per-conversation |
| **Shows** | CLI dashboard, status line, CSV export | Floating pill, popup dashboard |
| **Install** | `npm i -g tokburn` | Load unpacked in Chrome |

---

## CLI Quick Start

```bash
# 1. Install
npm i -g tokburn

# 2. Run the setup wizard
tokburn init

# 3. Start tracking (init does this for you, or manually):
tokburn start
export ANTHROPIC_BASE_URL=http://127.0.0.1:4088
```

Use Claude Code normally. tokburn silently logs every request.

## Extension Quick Start

```bash
# 1. Download or clone this repo
git clone https://github.com/user/tokburn.git

# 2. Go to chrome://extensions, enable Developer Mode

# 3. Click "Load unpacked", select the tokburn-ext/ folder
```

Open [claude.ai](https://claude.ai) and start chatting. The floating pill appears automatically.

---

## What You Get

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

```
  ┌──────────────────────────────────────────────────┐
  | tokburn live  ●  14:32:07                        |
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

---

## Status Line for Claude Code

`tokburn init` configures a live status line inside Claude Code. Three presets:

**Recommended** -- model, context, repo, rate limits, cost:
```
  Opus 4.6 | ctx 13% | tokburn (main*) | $1.95
  current  ●●○○○○○○○○  9%  ↻ 3hr 32min
  weekly   ●●●●○○○○○○  45% ↻ Fri 12:30PM
```

**Minimal** -- just the model and current rate limit:
```
  Opus 4.6 | ctx 13%
  current  ●●○○○○○○○○  9%  ↻ 3hr 32min
```

**Full** -- everything including burn rate and token count:
```
  Opus 4.6 | ctx 13% | tokburn (main*) | 142.8K tok | $1.95 | ~2.1K/min
  current  ●●○○○○○○○○  9%  ↻ 3hr 32min
  weekly   ●●●●○○○○○○  45% ↻ Fri 12:30PM
```

Or pick your own modules with the custom option.

---

## `tokburn init` -- Setup Wizard

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

  ───────────────────────────────────
  Done. tokburn is ready.
```

---

## Features

| Feature | Description |
|---|---|
| Local proxy | Transparent HTTP proxy on localhost, forwards to api.anthropic.com |
| SSE parsing | Extracts exact token counts from streaming responses |
| Cost tracking | Per-model pricing matched to Anthropic's published rates |
| Live TUI | Real-time terminal dashboard with burn rate and progress |
| Status line | Modular status line for Claude Code with dot indicators |
| Task cards | Per-task token summaries with collapsed/expanded views |
| Weekly history | 7-day ASCII table with daily breakdowns |
| CSV export | `tokburn export` dumps all data for external analysis |
| Log scanning | `tokburn scan` parses Claude Code's own JSONL logs |
| Chrome extension | Floating pill + dashboard overlay on claude.ai |
| Plan awareness | Pro/Max/API limits with progress tracking |
| Custom pricing | Override per-model rates in config |

---

## Benchmarks

Real measurements from the test suite (`npm test`):

| Metric | Result |
|---|---|
| Proxy overhead (JSON) | **0.26ms** avg |
| SSE TTFB overhead | **0.36ms** |
| Throughput | **1,198 req/s** |
| SSE parsing | **100% exact** from API usage fields |
| Fallback estimation | **avg 17.8% error** (chars/4 heuristic) |
| Cost calculation | **Exact match** to Anthropic pricing |

The proxy adds virtually zero latency. Usage extraction happens asynchronously after the response is delivered to your client.

---

## Privacy

**Your data never leaves your machine.**

- The CLI proxy runs on `localhost` only
- The Chrome extension stores everything in `chrome.storage.local`
- No analytics, no telemetry, no accounts, no cloud
- All code is open source -- inspect it yourself

---

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for development setup and guidelines.

Short version: fork, branch, PR. Conventional commits (`feat:`, `fix:`, `chore:`). Run `npm test` before submitting.

---

## License

[MIT](./LICENSE) -- Copyright 2026 tokburn contributors
