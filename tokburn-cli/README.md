# tokburn-cli

**See exactly how fast you're burning tokens and money across Claude Code sessions.**

tokburn is a lightweight local proxy that sits between your tools and the Anthropic API, silently tracking every token in and out. No cloud, no accounts, no data leaving your machine.

## Quick Start

```bash
npm i -g tokburn
tokburn init
```

The setup wizard starts the proxy, configures your shell, and sets up the Claude Code status line -- all in one command.

Or do it manually:

```bash
tokburn start
export ANTHROPIC_BASE_URL=http://127.0.0.1:4088
```

That's it. Use Claude Code (or any Anthropic API client) normally. tokburn quietly logs every request.

---

## `tokburn init` -- Setup Wizard

Interactive setup that detects your environment and configures everything:

```
  tokburn setup
  ───────────────────────────────────

  Detected: zsh shell, Claude Code installed

  [1/4] Which Claude plan are you on?

        1) Pro       ~500K tokens / 5hr window
        2) Max       ~2M tokens / 5hr window
        3) API only  (no plan limits)

        > 1

  [2/4] Start the proxy daemon?
        Enables per-request tracking for detailed breakdowns.

        1) Yes, start now
        2) No, skip

        > 1

  tokburn proxy started (PID 12345)

  [3/4] Add ANTHROPIC_BASE_URL to ~/.zshrc?
        Required for the proxy to intercept API calls.

        1) Yes, add it
        2) No, I'll do it manually

        > 1

  Added to ~/.zshrc

  [4/4] Configure Claude Code status line?

        1) Recommended   model | ctx% | repo | limits | cost
        2) Minimal       model | current rate limit
        3) Full          everything including burn rate
        4) Custom        pick your own modules
        5) Skip

        > 1

  Status line configured with 5 modules.

  ───────────────────────────────────
  Done. tokburn is ready.
```

---

## Status Line Integration

tokburn installs a modular status line into Claude Code that renders live data below your prompt.

### Presets

**Recommended** -- the default, shows model, context window, repo, both rate limits, and cost:
```
  Opus 4.6 | ctx 13% | tokburn (main*) | $1.95
  current  ●●○○○○○○○○  9%  ↻ 3hr 32min
  weekly   ●●●●○○○○○○  45% ↻ Fri 12:30PM
```

**Minimal** -- just model info and the current 5-hour rate limit:
```
  Opus 4.6 | ctx 13%
  current  ●●○○○○○○○○  9%  ↻ 3hr 32min
```

**Full** -- everything, including session token count and burn rate:
```
  Opus 4.6 | ctx 13% | tokburn (main*) | 142.8K tok | $1.95 | ~2.1K/min
  current  ●●○○○○○○○○  9%  ↻ 3hr 32min
  weekly   ●●●●○○○○○○  45% ↻ Fri 12:30PM
```

### Module Picker

Choose option `4) Custom` during `tokburn init` to toggle individual modules:

```
  Status line modules:

    [x] 1. Model + context        Opus 4.6 | ctx 13%
    [x] 2. Repo + branch          tokburn (master*)
    [x] 3. Current rate limit     ○○○○○○○○○○ 9% 3hr 32min
    [x] 4. Weekly rate limit      ●●●●○○○○○○ 45% Fri 12:30PM
    [ ] 5. Token count             142.8K tok
    [x] 6. Cost estimate           $1.95
    [ ] 7. Burn rate (proxy)       ~2.1K/min

  Toggle a number (1-7), or press enter to confirm:
```

Available modules:

| Module | Key | Description |
|---|---|---|
| Model + context | `model_context` | Active model name and context window usage % |
| Repo + branch | `repo_branch` | Current git repo name and branch (with dirty indicator) |
| Current rate limit | `current_limit` | 5-hour window dot bar with % used and reset countdown |
| Weekly rate limit | `weekly_limit` | 7-day window dot bar with % used and reset time |
| Token count | `token_count` | Total tokens consumed this session |
| Cost estimate | `cost` | Estimated USD cost based on model pricing |
| Burn rate | `burn_rate` | Tokens per minute from proxy data |

---

## Task Cards

The hidden `_task-summary` command renders per-task token summaries. Used by Claude Code hooks to show usage after each task.

**Collapsed** -- single-line summary:
```
  > Refactored auth middleware  12.4K tok  $0.07  26% left
```

**Expanded** -- full breakdown with progress bar:
```
  v Refactored auth middleware
  ┌────────────────────────────────────────────────────┐
  | This Task                  Session Total           |
  | In:  8,200 (2.0K cached)  In:  142,800            |
  | Out: 4,200                Out: 58,200              |
  | Cost: $0.07               Cost: $1.95              |
  |                                                    |
  | ████████████████████████░░░░░░  74% of 5hr limit   |
  | ~1hr 18min remaining       23 requests today       |
  └────────────────────────────────────────────────────┘
```

At 90%+ usage, the collapsed card switches to a `!!` warning indicator.

---

## Commands

| Command | Description |
|---|---|
| `tokburn init` | Interactive setup wizard -- plan, proxy, shell, status line |
| `tokburn start` | Start the proxy daemon in the background |
| `tokburn stop` | Stop the proxy daemon |
| `tokburn status` | Show proxy status and quick today summary |
| `tokburn today` | Detailed breakdown by model with cost estimates |
| `tokburn week` | Last 7 days as an ASCII table |
| `tokburn live` | Real-time TUI dashboard (refreshes every second) |
| `tokburn reset` | Clear today's usage data (history preserved) |
| `tokburn export` | Dump all usage data as CSV |
| `tokburn scan` | Parse Claude Code JSONL logs for historical data |

Hidden commands (used internally by hooks and status line):

| Command | Description |
|---|---|
| `tokburn _burn-rate` | Output current tokens/min rate (single value) |
| `tokburn _task-summary [name]` | Render task card to stdout |

### `tokburn start`

Start the proxy daemon. Listens on `localhost:4088` by default.

### `tokburn stop`

Stop the proxy daemon.

### `tokburn status`

Show whether the proxy is running and a quick summary of today's usage.

```
  tokburn proxy: ● running
  Today: 142,850 tokens (23 requests) * $0.42
```

### `tokburn today`

Detailed breakdown of today's usage by model with cost estimates.

```
  tokburn -- Today (2026-03-31)
  ───────────────────────────────────────
  Total Tokens    | 142,850
  Input           | 98,200
  Output          | 44,650
  Requests        | 23
  Est. Cost       | $0.42

  By Model:
  claude-sonnet-4       |     89,200 in |     31,400 out | $0.28
  claude-haiku-4        |      9,000 in |     13,250 out | $0.06
```

### `tokburn week`

Last 7 days as an ASCII table.

```
  tokburn -- Last 7 Days
  ──────────────────────────────────────────────────────
  Date        |     Input |    Output |     Total |     Cost
  ──────────────────────────────────────────────────────
  2026-03-31  |    98,200 |    44,650 |   142,850 |    $0.42
  2026-03-30  |   156,000 |    72,100 |   228,100 |    $0.68
  ...
  ──────────────────────────────────────────────────────
  Total       |   523,400 |   241,200 |   764,600 |    $2.14
```

### `tokburn live`

Real-time terminal dashboard with dot-indicator progress bar, burn rate, and recent requests. Refreshes every second. Press `q` to quit.

### `tokburn reset`

Clear today's usage data. Historical data is preserved.

### `tokburn export`

Dump all usage data as CSV.

```bash
tokburn export > usage.csv
tokburn export -o usage.csv
```

### `tokburn scan`

Parse Claude Code's own JSONL log files for historical usage data.

```bash
tokburn scan
tokburn scan -d /path/to/claude/projects
```

---

## Benchmarks

Run with `npm test` (or `npm run benchmark` for benchmarks only):

| Metric | Result |
|---|---|
| Proxy overhead (JSON) | **0.26ms** avg |
| SSE TTFB overhead | **0.36ms** |
| Throughput | **1,198 req/s** (100 concurrent) |
| SSE parsing accuracy | **100% exact** from API usage fields |
| Fallback estimation | **avg 17.8% error** (chars/4 heuristic) |
| Cost calculation | **Exact match** to Anthropic published pricing |

The proxy forwards responses immediately and extracts usage asynchronously via `setImmediate()`. Your client never waits for tokburn.

---

## How It Works

tokburn runs a local HTTP proxy on `localhost:4088`. When you point your Anthropic API client at this proxy (via `ANTHROPIC_BASE_URL`), every request flows through it:

1. Your request hits the local proxy
2. The proxy forwards it to `api.anthropic.com` immediately
3. The response streams back to your client with zero added latency
4. After the response completes, tokburn asynchronously parses the usage data and logs it

For streaming (SSE) responses, tokburn pipes chunks directly to the client while buffering a copy for parsing. For non-streaming JSON responses, it parses the usage object from the response body.

All data is stored locally in `~/.tokburn/usage.jsonl` as newline-delimited JSON.

---

## Privacy

tokburn is fully local:

- The proxy runs on `localhost` only
- No data is sent anywhere except the original Anthropic API destination
- All usage logs stay in `~/.tokburn/` on your machine
- No analytics, no telemetry, no phone-home

---

## Configuration

Config lives at `~/.tokburn/config.json`:

```json
{
  "port": 4088,
  "target": "https://api.anthropic.com",
  "plan": "pro",
  "statusline_modules": ["model_context", "repo_branch", "current_limit", "weekly_limit", "cost"],
  "pricing": {}
}
```

### Custom Pricing

Override default per-million-token pricing:

```json
{
  "pricing": {
    "claude-sonnet-4": { "input": 3, "output": 15 },
    "claude-opus-4": { "input": 15, "output": 75 },
    "claude-haiku-4": { "input": 0.80, "output": 4 }
  }
}
```

### Custom Port

```json
{
  "port": 9090
}
```

### Custom Target

Point at a different API-compatible endpoint:

```json
{
  "target": "https://your-gateway.example.com"
}
```

---

## Data Format

Each line in `~/.tokburn/usage.jsonl`:

```json
{"timestamp":"2026-03-31T14:32:07.123Z","model":"claude-sonnet-4-20250514","input_tokens":1200,"output_tokens":340,"conversation_id":null,"latency_ms":2847}
```

---

## Use with Claude Code

```bash
# One-time setup
tokburn init

# Or manually:
tokburn start
export ANTHROPIC_BASE_URL=http://127.0.0.1:4088

# Use Claude Code normally
claude

# Check your burn rate
tokburn today
```

Add to your shell profile (`.bashrc`, `.zshrc`) to make it permanent:

```bash
export ANTHROPIC_BASE_URL=http://127.0.0.1:4088
```

---

## License

MIT
