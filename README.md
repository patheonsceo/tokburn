# tokburn

See exactly how fast you're burning tokens and money with Claude.

## Products

### [tokburn-ext](./tokburn-ext/) — Chrome Extension

Real-time token usage overlay for claude.ai. See your burn rate as you chat.

- Floating pill shows today's total tokens
- Expanded dashboard with per-conversation breakdown
- Color-coded warnings as you approach your limit
- Zero data leaves your browser

### [tokburn-cli](./tokburn-cli/) — CLI + Proxy

Token tracker for Claude Code and Anthropic API users. Local proxy logs every request.

```bash
npm i -g tokburn
tokburn start
export ANTHROPIC_BASE_URL=http://127.0.0.1:4088
```

- Real-time TUI dashboard (`tokburn live`)
- Daily and weekly usage tables
- Cost estimates per model
- Export to CSV

## Privacy

Both products are fully local. No cloud, no accounts, no telemetry. All data stays on your machine.

## License

MIT
