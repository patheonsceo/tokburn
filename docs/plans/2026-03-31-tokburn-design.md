# tokburn — Design Document

## Overview

tokburn is a two-product open source brand for Anthropic token usage visibility.

1. **tokburn-ext** — Chrome extension for claude.ai Pro/Free users (ships first)
2. **tokburn** — CLI npm package with local proxy daemon for API/Claude Code users

Both products are fully local, MIT licensed, zero telemetry.

---

## Product 1: tokburn-ext (Chrome Extension)

### Architecture

```
page script (interceptor.js) → patches window.fetch
  → tee() response stream → parse SSE events for tokens
  → window.postMessage to content-script.js
  → chrome.runtime.sendMessage to background.js
  → chrome.storage.local

content-script.js builds the floating pill + dashboard UI (shadow DOM)
```

### Token Extraction Strategy

1. **Exact extraction:** Parse SSE `data:` lines for `usage.input_tokens`, `usage.output_tokens` in `message_start`, `message_delta`, `message_stop` events
2. **Fallback estimation:** Count characters in response text / 4. Mark with "~" prefix
3. **Input tokens:** Estimate from user message text length (server doesn't expose this in SSE)

### UI Components

- **Floating pill** — shadow DOM, bottom-right, color-coded green/amber/red, pulses during streaming
- **Expanded dashboard** — slides up from pill, daily burn bar, conversation stats, burn rate, session log
- **Extension popup** — 7-day mini chart, settings (daily limit slider, pill toggle, reset)

### Design Specs

- Glassmorphism: `backdrop-filter: blur(12px)`, semi-transparent dark bg, 1px rgba border
- Colors: bg #2b2a27, text #ececec (matching claude.ai dark theme)
- Border radius: 12px pill, 16px panel
- Shadow: `0 8px 32px rgba(0,0,0,0.3)`
- CSS transitions only, no JS animation libraries
- Shadow DOM for style isolation

### Key Decisions

- Shadow DOM prevents style leaks in both directions with claude.ai
- Conversation ID from URL path (`/chat/{id}`)
- Icons as inline SVG data URIs
- Fail-open: all parsing wrapped in try/catch, never breaks the page

### File Structure

```
tokburn-ext/
├── manifest.json
├── content-script.js
├── interceptor.js
├── background.js
├── popup.html
├── popup.js
├── popup.css
├── styles.css
├── icons/ (SVG-based)
└── README.md
```

---

## Product 2: tokburn CLI (npm package)

### Architecture

**Proxy mode (primary):**
```
Client → localhost:4088 (tokburn proxy) → api.anthropic.com
                ↓ (async, after forwarding response)
         ~/.tokburn/usage.jsonl
```

**Log parser mode (fallback):**
```
~/.claude/ logs → tokburn scan → parsed summary
```

### Proxy Design

- Raw Node.js `http` module, forwards requests transparently
- On response: buffer/parse for usage data, log async (never delays response)
- Handles both streaming SSE and non-streaming JSON responses
- Daemonized via detached child process with PID file at `~/.tokburn/tokburn.pid`

### CLI Commands

| Command | Description |
|---------|-------------|
| `tokburn start` | Launch proxy daemon on localhost:4088 |
| `tokburn stop` | Kill daemon via PID file |
| `tokburn status` | Running status + today's summary |
| `tokburn today` | Today's usage breakdown by model with cost |
| `tokburn week` | 7-day ASCII table |
| `tokburn live` | Real-time TUI: streaming indicator, totals, burn rate, cost |
| `tokburn reset` | Clear today's data |
| `tokburn export` | Dump usage.jsonl as CSV |
| `tokburn scan` | Parse Claude Code log files |

### Cost Estimation

Hardcoded pricing per model, configurable via `~/.tokburn/config.json`:
- claude-opus-4: $15/$75 per MTok
- claude-sonnet-4: $3/$15 per MTok
- claude-haiku-4: $0.80/$4 per MTok

### Data Storage

- `~/.tokburn/usage.jsonl` — append-only, one JSON object per line
- Format: `{timestamp, model, input_tokens, output_tokens, conversation_id, latency_ms}`
- `~/.tokburn/config.json` — pricing overrides, proxy port

### File Structure

```
tokburn/
├── package.json
├── cli.js
├── proxy.js
├── tracker.js
├── store.js
├── display.js
├── costs.js
├── config.js
└── README.md
```

### Key Decisions

- Zero heavy dependencies: raw `http` module for proxy (no http-proxy lib)
- Commander.js for CLI parsing
- Live TUI with raw ANSI escape codes (no blessed/ink dependency)
- Daemon via `child_process.spawn({ detached: true, stdio: 'ignore' })`
- Fail-open: if proxy crashes, `ANTHROPIC_BASE_URL` just fails and client falls back
