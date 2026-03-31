# tokburn — Chrome Extension

Claude Pro doesn't show you token usage. You're blind until you hit the wall. tokburn fixes that.

## What It Does

A tiny Chrome extension that tracks your claude.ai token usage in real-time:

- **Floating pill** on claude.ai shows today's total tokens, color-coded by usage level
- **Expanded dashboard** with per-conversation breakdown, burn rate, and daily progress
- **7-day history** in the extension popup
- **Configurable daily limit** with warning alerts at 70% and 90%

```
┌─────────────────────────────────────┐
│  tokburn            2026-03-31      │
│                                     │
│  ~58% of daily limit   500K limit   │
│  ████████████████░░░░░░░░░░░░░░░░   │
│                                     │
│  ┌─────────┐  ┌──────────┐         │
│  │ Input   │  │ Output   │         │
│  │ 42.1K   │  │ 15.3K    │         │
│  └─────────┘  └──────────┘         │
│  ┌─────────┐  ┌──────────┐         │
│  │ Total   │  │ Requests │         │
│  │ 57.4K   │  │ 23       │         │
│  └─────────┘  └──────────┘         │
│                                     │
│  Burn Rate         ~2.1K tok/min    │
│                                     │
│  Session Log                        │
│  conv_abc123...          14.2K      │
│  conv_def456...           8.7K      │
└─────────────────────────────────────┘
                          🔥 57.4K  ← pill
```

## Install

1. Download or clone this repo
2. Go to `chrome://extensions` and enable Developer Mode
3. Click "Load unpacked" and select the `tokburn-ext` folder

That's it. Open [claude.ai](https://claude.ai) and start chatting.

## How It Works

tokburn intercepts fetch responses on claude.ai by reading a copy of the response stream (using `tee()`/`clone()`). It parses SSE events for token counts from the API response. If exact counts aren't available, it estimates from response text length (~4 characters per token, marked with "~").

The original response is **never delayed or modified**. tokburn reads a clone.

## Privacy

- Zero data leaves your browser
- No analytics, no accounts, no external requests
- Everything stored in `chrome.storage.local`
- All code runs locally — inspect it yourself

## Settings

Click the extension icon to access settings:

- **Daily limit estimate**: Adjust from 100K to 1M tokens (default 500K)
- **Pill visibility**: Toggle the floating overlay on/off
- **Reset data**: Clear all stored usage data

## License

MIT
