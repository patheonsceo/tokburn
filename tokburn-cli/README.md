# tokburn

**Token tracking for Claude Code. See what you burn.**

No proxy. No env vars. Nothing to break. Just a rich status line and analytics commands that read Claude Code's native data.

## Quick Start

```bash
npm i -g tokburn
tokburn init
```

2-step wizard: pick your plan, configure your status line. Done.

## Status Line

```
Opus 4.6 (1M context)·Max █████░░░░░░░░░░░░░░░ 25% | main* | $18.79
5h 6% 3h25m→14:20 | 7d 64% 1d16h→04/05 | 🔥$7.6/h
$18.79 D:13.9K/106.9K | +1260/-872 | tokburn
```

11 individually configurable elements across 3 lines. Pick **Custom** during init to toggle each one with live preview.

## Commands

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
| `tokburn init --remove` | Uninstall from Claude Code |

## How It Works

The status line reads Claude Code's native JSON from stdin (model, rate limits, context, cost). CLI commands read JSONL session logs from `~/.claude/projects/`. No proxy, no env vars, no interception.

## Privacy

Everything stays on your machine. No network requests. No telemetry. No accounts. MIT licensed.

## License

MIT
