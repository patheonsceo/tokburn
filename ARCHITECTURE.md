# Architecture

Technical overview for contributors.

---

## System Diagram

### CLI Proxy

```
  Claude Code / API client
         |
         | HTTP POST /v1/messages
         v
  ┌──────────────────┐
  | tokburn proxy    |  localhost:4088
  | (proxy.js)       |
  └────────┬─────────┘
           |
           | Forward immediately
           v
  ┌──────────────────┐
  | api.anthropic.com|
  └────────┬─────────┘
           |
           | Response streams back
           v
  ┌──────────────────┐
  | tokburn proxy    |  Pipes chunks to client in real-time
  | (proxy.js)       |  Buffers a copy for extraction
  └────────┬─────────┘
           |
           | setImmediate() -- after response ends
           v
  ┌──────────────────┐
  | tracker.js       |  Async: parse usage, append to JSONL
  | usage.jsonl      |  Never blocks the response path
  └──────────────────┘
```

Key constraint: the response reaches the client before any usage extraction begins.

### Chrome Extension

```
  claude.ai page context         content-script.js           background.js
  ┌─────────────────────┐       ┌────────────────────┐      ┌───────────────┐
  | window.fetch()      |       | Shadow DOM          |      | Service worker|
  |   |                 |       |   Pill overlay      |      |               |
  |   v                 |       |   Dashboard panel   |      | chrome.storage|
  | interceptor.js      |       |                     |      |   .local      |
  |   Monkey-patches    |       |                     |      |   daily{}     |
  |   fetch, clones     |------>|  window.postMessage  |----->|   settings{}  |
  |   response, parses  |       |  Receives TOKBURN_  |      |               |
  |   SSE for usage     |       |  USAGE, relays to   |<-----|  Responds with|
  |                     |       |  background, updates |      |  accumulated  |
  |   Returns original  |       |  UI from state      |      |  totals       |
  |   response untouched|       |                     |      |               |
  └─────────────────────┘       └────────────────────┘      └───────────────┘
```

Data flow:
1. `interceptor.js` patches `window.fetch`, calls the real fetch, clones the response
2. The clone is parsed for SSE usage events; original response passes through untouched
3. Usage data is posted via `window.postMessage` to the content script
4. Content script forwards to the background service worker via `chrome.runtime.sendMessage`
5. Background accumulates into `chrome.storage.local` and responds with current totals
6. Content script updates the shadow DOM UI

---

## File-by-File

### tokburn-cli

| File | Purpose |
|---|---|
| `cli.js` | Command definitions using commander; entry point for the `tokburn` binary |
| `proxy.js` | HTTP proxy server, SSE/JSON usage extraction, daemon start/stop/PID management |
| `tracker.js` | Appends parsed usage entries to `~/.tokburn/usage.jsonl` |
| `store.js` | Reads and queries usage data: today, week, date ranges, CSV export |
| `display.js` | Terminal formatting for today/week/status views and the live TUI dashboard |
| `costs.js` | Model pricing table, alias resolution, cost calculation per request |
| `config.js` | Reads/writes `~/.tokburn/config.json`, provides defaults |
| `init.js` | Interactive setup wizard: plan selection, proxy, shell config, status line |
| `statusline.js` | Claude Code status line renderer; reads session JSON from stdin, outputs configured modules |
| `statusline.sh` | Bash fallback status line script (simpler, requires jq) |
| `card.js` | Renders collapsed and expanded task summary cards with box-drawing characters |

### tokburn-ext

| File | Purpose |
|---|---|
| `manifest.json` | Chrome MV3 manifest with permissions for storage, alarms, and claude.ai host |
| `interceptor.js` | Injected into page context; patches fetch, clones response, parses SSE/JSON for usage |
| `content-script.js` | Builds shadow DOM UI (pill + dashboard), relays messages between page and background |
| `background.js` | Service worker managing chrome.storage.local; accumulates daily/conversation totals |
| `popup.html/js/css` | Extension popup with 7-day history and settings controls |
| `styles.css` | Styles for the floating pill and expanded dashboard overlay |

---

## Status Line Module System

The status line is a command-type integration in Claude Code (`~/.claude/settings.json`). Claude Code pipes a JSON object with session data to stdin and displays whatever the command writes to stdout.

**Module registration** -- Each module is defined in `statusline.js` with:
- A `key` (e.g., `model_context`)
- A render function that reads the session JSON and returns a string
- Metadata (label, example) used by the init wizard's module picker

**Configuration** -- `~/.tokburn/config.json` stores `statusline_modules` as an array of keys. The renderer iterates this array and concatenates output.

**Rendering** -- Modules that produce single-line output (model, repo, cost, tokens, burn rate) are joined with `|` separators on line 1. Rate limit modules (`current_limit`, `weekly_limit`) render as separate lines with dot-bar indicators.

**Presets** -- Three built-in configurations:
- `recommended`: model_context, repo_branch, current_limit, weekly_limit, cost
- `minimal`: model_context, current_limit
- `full`: all seven modules

---

## Data Storage

### CLI: `~/.tokburn/usage.jsonl`

Newline-delimited JSON. One entry per API request:

```json
{"timestamp":"2026-03-31T14:32:07.123Z","model":"claude-sonnet-4-20250514","input_tokens":1200,"output_tokens":340,"conversation_id":null,"latency_ms":2847}
```

Queried by reading the entire file and filtering by date prefix. This is simple and fast enough for typical usage volumes (hundreds of entries per day).

### CLI: `~/.tokburn/config.json`

```json
{
  "port": 4088,
  "target": "https://api.anthropic.com",
  "plan": "pro",
  "limits": {
    "pro": { "window_hours": 5, "estimated_tokens": 500000 },
    "max": { "window_hours": 5, "estimated_tokens": 2000000 },
    "api": { "window_hours": 24, "estimated_tokens": 10000000 }
  },
  "statusline_modules": ["model_context", "repo_branch", "current_limit", "weekly_limit", "cost"],
  "pricing": {}
}
```

### Extension: `chrome.storage.local`

Two top-level keys:
- `daily` -- Object keyed by `YYYY-MM-DD`, each containing input/output totals, cache stats, request count, and a conversations array
- `settings` -- Daily limit estimate, warning thresholds, pill visibility

Automatic cleanup removes entries older than 30 days via a Chrome alarm.

---

## Design Principles

1. **Zero latency impact** -- The proxy forwards response chunks to the client immediately via `data` event handlers. Usage extraction runs in `setImmediate()` after the response ends. The extension reads a `clone()` of the fetch response.

2. **Fail-open** -- Every parsing operation is wrapped in try/catch. If SSE parsing fails, the request still succeeds. If the status line script errors, Claude Code falls back to its default. If the extension interceptor throws, the original fetch completes normally.

3. **Fully local** -- The proxy binds to `127.0.0.1` only. The extension makes zero external requests. No analytics, no telemetry, no cloud services.

4. **No heavy deps** -- The CLI has one dependency (commander for argument parsing). The extension has zero dependencies. No bundler, no transpiler, no framework.
