# tokburn -- Chrome Extension

**Claude Pro doesn't show you token usage. You're blind until you hit the wall. tokburn fixes that.**

## What It Does

A Chrome extension that tracks your claude.ai token usage in real-time:

- **Floating pill** on claude.ai shows today's total tokens, color-coded by usage level
- **Expanded dashboard** with per-conversation breakdown, burn rate, and daily progress
- **7-day history** in the extension popup
- **Configurable daily limit** with warning alerts at 70% and 90%

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

---

## Install

1. Download or clone this repo
2. Go to `chrome://extensions` and enable Developer Mode
3. Click "Load unpacked" and select the `tokburn-ext` folder

That's it. Open [claude.ai](https://claude.ai) and start chatting.

---

## Token Extraction Accuracy

tokburn uses two methods to count tokens, in order of preference:

**Exact counts (preferred)** -- The Anthropic API returns `usage` fields in SSE events:
- `message_start` contains `input_tokens`, `cache_creation_input_tokens`, `cache_read_input_tokens`
- `message_delta` contains `output_tokens`

When these fields are present, tokburn reports exact numbers with no estimation.

**Fallback estimation** -- If the API response does not include usage fields (which can happen with certain claude.ai endpoints), tokburn estimates output tokens from the accumulated response text using a `characters / 4` heuristic. These values are marked with a `~` prefix in the UI. Benchmarks show an average error of 17.8% with this method.

The original response is **never delayed or modified**. tokburn reads a `clone()` of the response stream. All parsing happens on the copy.

---

## Data Model

All data is stored in `chrome.storage.local`. The schema:

**`daily`** -- Keyed by date (`YYYY-MM-DD`), each day contains:

```
{
  "2026-03-31": {
    "total_input": 42100,
    "total_output": 15300,
    "total_cache_creation": 0,
    "total_cache_read": 8400,
    "request_count": 23,
    "first_activity": 1743408000000,
    "conversations": [
      {
        "id": "conv_abc123",
        "input": 28000,
        "output": 9200,
        "cache_creation": 0,
        "cache_read": 5100,
        "messages": 14,
        "model": "claude-sonnet-4-20250514",
        "started": 1743408000000,
        "last_active": 1743415200000
      }
    ]
  }
}
```

**`settings`** -- User preferences:

```
{
  "daily_limit_estimate": 500000,
  "warning_threshold_1": 0.7,
  "warning_threshold_2": 0.9,
  "pill_visible": true
}
```

Data older than 30 days is automatically cleaned up.

---

## How It Works

The extension has four components:

1. **interceptor.js** -- Injected into the page context. Monkey-patches `window.fetch` to intercept claude.ai API responses. Reads a cloned response stream and parses SSE events for token counts. Posts results to the content script via `window.postMessage`.

2. **content-script.js** -- Runs in the content script context. Injects the interceptor, builds the floating pill and dashboard UI in a closed shadow DOM, and relays usage data to the background service worker.

3. **background.js** -- Service worker that manages `chrome.storage.local`. Receives usage messages, accumulates per-conversation and daily totals, handles settings updates and data resets, and runs hourly cleanup of old data.

4. **popup.html/popup.js** -- Extension popup with 7-day history chart and settings controls.

```
  page context           content script          background
  ┌──────────┐          ┌──────────────┐        ┌──────────┐
  | fetch()  |--clone-->| shadow DOM   |------->| storage  |
  | response |          | pill + dash  |<-------| daily{}  |
  └──────────┘          └──────────────┘        └──────────┘
                         postMessage             runtime.sendMessage
```

---

## Privacy

- Zero data leaves your browser
- No analytics, no accounts, no external requests
- Everything stored in `chrome.storage.local`
- All code runs locally -- inspect it yourself

---

## Settings

Click the extension icon to access settings:

- **Daily limit estimate** -- Adjust from 100K to 1M tokens (default 500K)
- **Pill visibility** -- Toggle the floating overlay on/off
- **Reset data** -- Clear all stored usage data

---

## License

MIT
