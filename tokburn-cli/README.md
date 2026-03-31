# tokburn

**See exactly how fast you're burning tokens and money across Claude Code sessions.**

tokburn is a lightweight local proxy that sits between your tools and the Anthropic API, silently tracking every token in and out. No cloud, no accounts, no data leaving your machine.

## Quick Start

```bash
npm i -g tokburn
tokburn start
export ANTHROPIC_BASE_URL=http://127.0.0.1:4088
```

That's it. Use Claude Code (or any Anthropic API client) normally. tokburn quietly logs every request.

## Commands

### `tokburn start`

Start the proxy daemon in the background. Listens on `localhost:4088` by default.

### `tokburn stop`

Stop the proxy daemon.

### `tokburn status`

Show whether the proxy is running and a quick summary of today's usage.

```
  tokburn proxy: ● running
  Today: 142,850 tokens (23 requests) • $0.42
```

### `tokburn today`

Detailed breakdown of today's usage by model with cost estimates.

```
  tokburn — Today (2026-03-31)
  ───────────────────────────────────────
  Total Tokens    │ 142,850
  Input           │ 98,200
  Output          │ 44,650
  Requests        │ 23
  Est. Cost       │ $0.42

  By Model:
  claude-sonnet-4       │     89,200 in │     31,400 out │ $0.28
  claude-haiku-4        │      9,000 in │     13,250 out │ $0.06
```

### `tokburn week`

Last 7 days as an ASCII table.

```
  tokburn — Last 7 Days
  ──────────────────────────────────────────────────────
  Date        │     Input │    Output │     Total │     Cost
  ──────────────────────────────────────────────────────
  2026-03-31  │    98,200 │    44,650 │   142,850 │    $0.42
  2026-03-30  │   156,000 │    72,100 │   228,100 │    $0.68
  ...
  ──────────────────────────────────────────────────────
  Total       │   523,400 │   241,200 │   764,600 │    $2.14
```

### `tokburn live`

Real-time terminal dashboard. Refreshes every second.

```
  ┌──────────────────────────────────────────────────┐
  │ tokburn live  ●  14:32:07                        │
  │                                                  │
  │   Input Tokens            98,200                 │
  │   Output Tokens           44,650                 │
  │   Total Tokens           142,850                 │
  │   Requests                    23                 │
  │                                                  │
  │   Burn Rate          2,847 tok/min               │
  │   Est. Cost                $0.42                 │
  │                                                  │
  │   Recent Requests                                │
  │   ──────────────────────────────────────────     │
  │   sonnet-4          1,240 tok  3s ago            │
  │   sonnet-4            890 tok  12s ago           │
  │   haiku-4             320 tok  45s ago           │
  └──────────────────────────────────────────────────┘

  Press q to quit
```

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

## How It Works

tokburn runs a local HTTP proxy on `localhost:4088`. When you point your Anthropic API client at this proxy (via `ANTHROPIC_BASE_URL`), every request flows through it:

1. Your request hits the local proxy
2. The proxy forwards it to `api.anthropic.com` immediately
3. The response streams back to your client with zero added latency
4. After the response completes, tokburn asynchronously parses the usage data and logs it

For streaming (SSE) responses, tokburn pipes chunks directly to the client while buffering a copy for parsing. For non-streaming JSON responses, it parses the usage object from the response body.

All data is stored locally in `~/.tokburn/usage.jsonl` as newline-delimited JSON.

## Privacy

tokburn is fully local:

- The proxy runs on `localhost` only
- No data is sent anywhere except the original Anthropic API destination
- All usage logs stay in `~/.tokburn/` on your machine
- No analytics, no telemetry, no phone-home

## Configuration

Config lives at `~/.tokburn/config.json`:

```json
{
  "port": 4088,
  "target": "https://api.anthropic.com",
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

## Data Format

Each line in `~/.tokburn/usage.jsonl`:

```json
{"timestamp":"2026-03-31T14:32:07.123Z","model":"claude-sonnet-4-20250514","input_tokens":1200,"output_tokens":340,"conversation_id":null,"latency_ms":2847}
```

## Use with Claude Code

```bash
# Start tokburn
tokburn start

# Configure Claude Code to use the proxy
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

## License

MIT
