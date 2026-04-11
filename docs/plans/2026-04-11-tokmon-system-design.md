# Tokmon System Design

**Date**: 2026-04-11
**Status**: Approved — sprites pending finalization

## Overview

Tokmon (Token Pokemon) is a companion system for tokburn. Users choose a starter
Tokmon during `tokburn init`, which lives in the Claude Code status line, reacts
to token usage with mood-based expressions and speech bubbles, and evolves
through 3 stages as the user writes more code.

## Scope Changes

### Removed
- All terminal commands: status, today, week, live, scan, export, reset
- store.js, display.js, proxy.js, tracker.js
- CLI becomes `tokburn init` and `tokburn init --remove` only

### Kept
- Status line (statusline.js) — upgraded with Tokmon rendering
- Skills: /tokburn-check, /tokburn-plan
- Init wizard (init-ui.mjs) — upgraded with Tokmon selection flow
- config.js, costs.js

### Added
- companion.js — XP, leveling, evolution logic
- sprites.js — 9 sprite definitions as 2D color arrays
- personality.js — message pools for all personalities x moods

## The Three Starter Tokmons

| Tokmon | Type | Default Personality | Palette | Vibe |
|---|---|---|---|---|
| Flint | Fire | Sassy | Orange/red/yellow | Flame spirit — fierce, cocky |
| Pixel | Tech | Hype | Cyan/purple/green | Digital creature — glitchy, loud |
| Mochi | Nature | Anxious | Pink/white/mint | Blob creature — round, worried |

## Evolution Stages

### Flint (Fire)
- Stage 1 **Flint**: Flame wisp with dot eyes, floating above ember base
- Stage 2 **Blaze**: Fire fox — pointed ears, flame tail, fierce eyes
- Stage 3 **Inferno**: Fire drake — small wings, crown of flames, glowing core

### Pixel (Tech)
- Stage 1 **Pixel**: Tiny cube with cyclopean eye and pixel antenna
- Stage 2 **Codec**: Floating robot head — dual LED eyes, circuit pattern, small arms
- Stage 3 **Daemon**: Cybernetic entity — visor eyes, data wings, glitch aura

### Mochi (Nature)
- Stage 1 **Mochi**: Round blob with huge worried eyes and nub feet
- Stage 2 **Puff**: Cloud-cat — fluffy body, pointed ears, swishing tail
- Stage 3 **Nimbus**: Storm spirit — flowing mane, lightning marks, calm power

## Sprite Rendering

- Raw ANSI truecolor: `\x1b[38;2;r;g;bm` (fg) + `\x1b[48;2;r;g;bm` (bg)
- Unicode half-blocks: `U+2580` (upper), `U+2584` (lower), `U+2588` (full)
- Each sprite: 2D array of [fg_rgb, bg_rgb] pairs
- ~7 chars wide x 4 terminal rows (8 pixel rows via half-blocks)
- Zero dependencies, sub-5ms render
- Works on all modern terminals

### Mood Color Shifts
- 0-30% rate limit: Normal palette (chill)
- 30-60%: Warm shift (alert)
- 60-85%: Orange/amber tint (stressed)
- 85%+: Red pulsing tint (panic)

### Animation
- refreshInterval: 1 (1s tick in Claude Code settings)
- Frame selection: `Math.floor(Date.now() / 500) % frameCount` = ~2fps
- Idle: 2-3 frame blink cycle
- Alert: Wider eyes, slight bounce
- Stressed: Sweat drop, narrowed eyes
- Panic: X/skull eyes, shake effect
- Evolution: Sparkle particles

## Personality System

### Sassy (default: Flint)
Roasts spending, deadpan humor, celebrates sarcastically.

### Hype (default: Pixel)
All caps energy, supportive but unhinged, lives for big numbers.

### Anxious (default: Mochi)
Nervous, sweet, increasingly worried, loves calm sessions.

User can swap personality independently of Tokmon choice.

## Speech Bubble System

### Triggers (contextual, not random)
- Session start (greeting)
- Cost milestones: $5, $10, $25, $50, $100
- Rate limit crossings: 50%, 75%, 90%
- Burn rate spike: >$10/hr sustained
- Lines milestones: 500, 1000, 2000 in session
- Evolution (always shows, critical priority)
- Chill vibes: under 10% usage, low burn

### Behavior
- Shows for ~10 renders (~10s at 1s refresh)
- Same trigger won't fire twice per session
- Max one bubble at a time
- Tracked in companion.json: last_bubble_at, last_bubble_trigger

### Message Pool
- 3 personalities x 4 moods x 5-8 messages = ~60-96 quips
- ~5 evolution messages per personality = ~15
- ~3 milestone messages per personality = ~9
- Total: ~85-120 unique messages at launch

## XP & Leveling

### XP Source
Lines of code added only. Read from `cost.total_lines_added` in status line
stdin JSON. Each render: diff current vs last snapshot, add to XP.

### Level Curve

| Level | XP to Next | Cumulative | Stage |
|---|---|---|---|
| 1 | 0 | 0 | Stage 1 |
| 2 | 100 | 100 | Stage 1 |
| 3 | 200 | 300 | Stage 1 |
| 4 | 350 | 650 | Stage 1 |
| **5** | **500** | **1,150** | **Stage 2** |
| 6 | 700 | 1,850 | Stage 2 |
| 7 | 1,000 | 2,850 | Stage 2 |
| 8 | 1,500 | 4,350 | Stage 2 |
| 9 | 2,000 | 6,350 | Stage 2 |
| 10 | 3,000 | 9,350 | Stage 2 |
| 11 | 4,000 | 13,350 | Stage 2 |
| 12 | 5,500 | 18,850 | Stage 2 |
| 13 | 7,000 | 25,850 | Stage 2 |
| 14 | 9,000 | 34,850 | Stage 2 |
| **15** | **15,000** | **49,850** | **Stage 3** |

~1,150 lines for first evolution. ~49,850 total for final form.

## Init Wizard Flow

```
Step 1: Plan selection       [Pro / Max / API]
Step 2: Choose your Tokmon   [Flint / Pixel / Mochi] with sprite previews
Step 3: Choose personality   [Sassy / Hype / Anxious] with sample quips
Step 4: Status line config   [Recommended / Minimal / Custom]
Step 5: Processing + hatch   Animated egg hatching sequence
```

## Status Line Layout

```
 [sprite]   │ Opus 4.6 (1M context)·Max | ████░░░░░░ 31% | main* | $3.69
 [sprite]   │ 5h 27% 3h25m→10:00 | 7d 2% 6d12h→04/18 | $4.9/h
 [sprite]   │ $3.69 D:37K/152K | +156/-23 | Lv.8 Blaze
 [sprite]   │
```

Compact mode fallback for narrow terminals: sprite hidden, text-only with
Tokmon face as emoji/ASCII at end of line 3.

## Persistence

### ~/.tokburn/companion.json
```json
{
  "companion": "flint",
  "personality": "sassy",
  "level": 8,
  "xp": 4350,
  "stage": 2,
  "stage_name": "Blaze",
  "hatched": "2026-04-11",
  "lifetime_lines": 4350,
  "evolutions": [
    { "to": 2, "name": "Blaze", "date": "2026-04-15", "at_lines": 1150 }
  ],
  "last_lines_snapshot": 156,
  "last_session_id": "abc-123",
  "last_bubble_at": 1712834400,
  "last_bubble_trigger": "cost_threshold_25",
  "triggered_this_session": ["session_start", "cost_threshold_5"]
}
```

## File Structure

```
tokburn-cli/
  cli.js              # init + init --remove only
  init.js             # Setup logic
  init-ui.mjs         # Ink wizard with Tokmon selection
  statusline.js       # Main renderer (Tokmon + stats)
  config.js           # Config read/write
  costs.js            # Cost calculations
  companion.js        # XP, leveling, evolution logic
  sprites.js          # 9 sprite definitions as color arrays
  personality.js      # Message pools (personalities x moods)
  package.json
  README.md
  LICENSE
```

## Competitive Advantage

No other Claude Code companion project offers:
1. Choose-your-starter mechanic
2. Evolution system with XP from coding
3. Personality system with swappable voice
4. Contextual speech bubbles (100+ quips)
5. Colorful ANSI truecolor sprites that work on all terminals

## Next Steps

1. Design and finalize all 9 sprites with visual variants
2. Lock status line layout around final sprite dimensions
3. Detailed implementation plan
4. Build
