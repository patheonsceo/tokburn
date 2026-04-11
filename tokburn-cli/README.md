# tokburn

**Choose your Tokemon. Write code. Watch it evolve.**

A coding companion for Claude Code. Pick a starter creature, give it a personality, and watch it grow in your status line as you write code. No proxy. No env vars. Everything local.

## Quick Start

```bash
npm i -g tokburn
tokburn init
```

4-step wizard: pick your plan, choose your Tokemon, pick a personality, configure your status line.

## Starters

| Tokemon | Type | Evolves to | Personality |
|---|---|---|---|
| Flint | Fire | Blaze → Inferno | Sassy |
| Pixel | Tech | Codec → Daemon | Hype |
| Mochi | Nature | Puff → Nimbus | Anxious |

## Evolution

Your Tokemon earns XP from lines of code you write. It evolves at Level 5 and Level 15:

- **Stage 1** (Lv.1-4): Starter form
- **Stage 2** (Lv.5-14): First evolution at ~5,000 lines
- **Stage 3** (Lv.15+): Final form at ~50,000 lines

## Status Line

A 6-line status with your Tokemon sprite, session stats, and personality quips:

```
 [sprite]  │ Opus 4.6 (1M)·Max ━━━━━━────────────── 31%
 [sprite]  │ 5h ◆◆◆◇◇◇◇◇◇◇ 27% 3h25m→10:00 | 7d ◇◇◇◇◇◇◇◇◇◇ 2%
 [sprite]  │ +156 / -23 | ↓37K ↑152K | ⎇ main*
 [sprite]  │ ╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌
 [sprite]  │ Lv.8 Blaze ▰▰▰▰▰▱▱▱ → Lv.9
            │ 🧠 "slow day huh. saving money for once?"
```

Sprites animate with expression cycling (blink, mood reactions) at 1-second refresh.

> **Note:** Sprite animation requires **Claude Code v2.1.97+** (run `claude update`). Older versions ignore `refreshInterval` and won't animate. Also make sure `CLAUDE_CODE_NO_FLICKER` is **not** set in your settings — it suppresses status line redraws.

## Personalities

- **Sassy**: Deadpan humor, roasts your spending
- **Hype**: ALL CAPS energy, lives for big numbers
- **Anxious**: Sweet and nervous, worried about tokens

Swappable independently of Tokemon choice.

## Skills

| Skill | What it does |
|---|---|
| `/tokburn-check` | Session health, context analysis, tips |
| `/tokburn-plan` | Estimate token cost before starting |
| `/tokemon-stats` | XP, level, evolution progress |

## Privacy

Everything stays on your machine. No network requests. No telemetry. No accounts. MIT licensed.

## License

MIT
