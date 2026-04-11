# tokburn

**Choose your Tokemon. Write code. Watch it evolve. Track your Claude Code stats live.**

A pixel art companion that lives in your Claude Code status line — it blinks, reacts to your token usage, roasts your spending habits, and evolves as you write more code. Also happens to be a full session dashboard.

## Two lines. That's it.

```bash
npm i -g tokburn
tokburn init
```

Pick your plan. Choose your creature. Give it a personality. Your Tokemon hatches and starts living in your status line immediately.

## Three starters

| Tokemon | Type | Evolves to | Default voice |
|---|---|---|---|
| **Flint** | Fire | Blaze → Inferno | Sassy — roasts you with a straight face |
| **Pixel** | Tech | Codec → Daemon | Hype — unhinged internet energy |
| **Mochi** | Nature | Puff → Nimbus | Anxious — tries to be brave, fails adorably |

152 unique quips across all personalities. Swap them independently of your Tokemon.

## What you get

A 6-line animated dashboard replacing your default status line:

- **Model + context bar** — see when context is getting full before you lose it
- **Rate limit bars** — 5-hour and 7-day limits with reset countdowns
- **Lines + tokens + branch** — track what Claude is actually doing
- **XP bar + level** — watch your companion grow as you code
- **Personality quips** — your Tokemon's live commentary on your session

The sprite animates with expression cycling — blinks, reacts to rate limit stress, celebrates when you level up or evolve.

## Evolution

Your Tokemon earns XP from every line of code Claude writes. Across all projects, all sessions.

- **Stage 2** at ~5,000 lines (Lv.5) — new sprite, new name, 30-second golden celebration
- **Stage 3** at ~50,000 lines (Lv.15) — final form, earned over weeks of real work
- **Post-15** — levels keep climbing forever. Bragging rights.

## Skills

| Skill | What it does |
|---|---|
| `/tokburn-check` | Session health check, context analysis, optimization tips |
| `/tokburn-plan` | Estimate token cost before starting a big task |
| `/tokemon-stats` | XP, level, evolution progress, lifetime stats |

## Requirements

- Node.js >= 18
- **Claude Code v2.1.97+** (run `claude update`) — older versions won't animate
- Make sure `CLAUDE_CODE_NO_FLICKER` is **not** set in your settings

## Privacy

Everything stays on your machine. No network requests. No telemetry. No accounts. No cloud. MIT licensed.
