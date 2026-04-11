# Tokemons System Design

**Date**: 2026-04-11
**Status**: LOCKED — ready for implementation

## Overview

Tokemons (Token Pokemons) is a companion system for tokburn. Users choose a
starter Tokemon during `tokburn init`, which lives in the Claude Code status
line, reacts to token usage with mood-based expressions and speech bubbles, and
evolves through 3 stages as the user writes more code.

## Scope Changes

### Removed
- All terminal commands: status, today, week, live, scan, export, reset
- store.js, display.js, proxy.js, tracker.js
- CLI becomes `tokburn init` and `tokburn init --remove` only
- Cost/burn rate from status line (user doesn't want it)

### Kept
- Status line (statusline.js) — complete rewrite with Tokemon rendering
- Skills: /tokburn-check, /tokburn-plan
- Init wizard (init-ui.mjs) — upgraded with Tokemon selection flow
- config.js, costs.js

### Added
- companion.js — XP, leveling, evolution logic
- sprites.js — 9 sprite definitions as 2D color arrays + mood variants
- personality.js — message pools for all personalities x moods
- /tokemon-stats skill — shows XP, lines to next evolution, progress

## The Three Starter Tokemons

| Tokemon | Type | Default Personality | Palette | Vibe |
|---|---|---|---|---|
| Flint | Fire | Sassy | Orange/red/yellow | Flame spirit — fierce, cocky |
| Pixel | Tech | Hype | Cyan/purple/green | Digital creature — glitchy, loud |
| Mochi | Nature | Anxious | Pink/white/mint | Blob creature — round, worried |

## Evolution Stages

Each stage is a completely different creature design (like Pokemon), not a
scaled-up version.

### Flint (Fire)
- Stage 1 **Flint**: Flame wisp — teardrop body, big 2x2 eyes, ember feet
- Stage 2 **Blaze**: Fire fox — pointed ears, flame tail, fierce eyes, agile
- Stage 3 **Inferno**: Fire drake — wings, crown of flames, glowing core, talons

### Pixel (Tech)
- Stage 1 **Pixel**: Digital sprite — cube body, single big cyclopean eye, antenna
- Stage 2 **Codec**: Robot head — dual LED eyes, circuit pattern, mechanical arms
- Stage 3 **Daemon**: Cyber entity — visor eyes, data wings, glitch aura

### Mochi (Nature)
- Stage 1 **Mochi**: Round blob — huge worried eyes, blush marks, nub feet
- Stage 2 **Puff**: Cloud-cat — pointed ears, fluffy body, swishing tail
- Stage 3 **Nimbus**: Storm spirit — flowing mane, lightning marks, majestic

## Sprite Rendering

- Raw ANSI truecolor: `\x1b[38;2;r;g;bm` (fg) + `\x1b[48;2;r;g;bm` (bg)
- Unicode half-blocks: upper `▀`, lower `▄`, full `█`
- Each sprite: 2D pixel array, 9-11 chars wide x 12 pixel rows (6 terminal rows)
- 2x2 eyes per Tokemon (4 pixels per eye, visible pupils)
- 3x2 mouth block (6 pixels, creates shapes: · normal, ∪ smile, ― worried, O scream)
- Zero dependencies, sub-5ms render
- Works on all modern terminals (iTerm2, Kitty, WezTerm, Ghostty, Windows Terminal)

### Expression System (5 expressions per Tokemon)
- **Normal**: Eyes open, pupils inward, small dot mouth
- **Blink**: Eyes closed (body color + darker eyelid line), same mouth
- **Happy**: Pupils up, eyes squinted ^_^, ∪ smile mouth
- **Stressed**: Pupils shifted outward (looking away), ― flat mouth, sweat drop
- **Panic**: X-pattern red eyes, O-shape wide mouth

### Mood Color Shifts (based on 5hr rate limit %)
- 0-30%: Normal palette (chill)
- 30-60%: Warm shift (alert)
- 60-85%: Orange/amber tint (stressed)
- 85%+: Red pulsing tint (panic)

### Animation
- refreshInterval: 1 (1s tick in Claude Code settings)
- Frame selection: `Math.floor(Date.now() / 500) % frameCount` = ~2fps
- Blink cycle loops on idle
- Expression changes with mood (driven by rate limit %)

## Status Line Layout (LOCKED)

6 visual lines: sprite left, vertical divider, text right.

```
 [sprite]   │ Opus 4.6 (1M)·Max ━━━━━━━━━━━━━━━━━━━━ 31%
 [sprite]   │ 5h ◆◆◇◇◇◇◇◇◇◇ 27% 3h25m→10:00 | 7d ◇◇◇◇◇◇◇◇◇◇ 2% 6d12h→04/18
 [sprite]   │ +156 / -23 | ↓37K ↑152K | ⎇ main*
 [sprite]   │ ╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌
 [sprite]   │ Lv.8 Blaze ▰▰▰▰▰▱▱▱ → Lv.9
             │ 🧠 "slow day huh. saving money for once?"
```

### Line Breakdown
- **Line 1**: Model·Plan + context bar (━───) + percentage
- **Line 2**: 5hr diamond bar (◆◇) + reset time | 7day diamond bar + reset time
- **Line 3**: Lines changed (+green / -red) | tokens (↓in ↑out) | branch (⎇)
- **Line 4**: Dashed divider (╌) separating stats from Tokemon
- **Line 5**: Level + Tokemon name + XP bar (▰▱) + next level
- **Line 6**: Animated emoji (🧠→👀→🔮→💭 cycling) + personality quip

### Color Rule
- **White**: All facts (model name, numbers, level, Tokemon name)
- **Dim gray**: Structure (separators, labels, arrows, reset times, divider, quips)
- **Muted green/yellow/red**: ONLY bars, percentages, and lines changed
  - Bars: muted fills (rgb 70-80 range), dim empties (rgb 60)
  - Percentages: color matches their bar state
  - Lines: +green / -red (muted)
- **Muted warm**: XP bar only (rgb 200,150,50)

### Bar Styles (3 tiers of visual weight)
- **Context**: `━` filled + `─` empty (thin solid line, heaviest)
- **Rate limits**: `◆` filled + `◇` empty (diamonds, medium)
- **XP**: `▰` filled + `▱` empty (triangular, lightest/most subtle)

### Compact Mode Fallback
Narrow terminals: sprite hidden, text-only layout.

## Personality System

### Sassy (default: Flint)
Roasts spending, deadpan humor, celebrates sarcastically.

### Hype (default: Pixel)
All caps energy, supportive but unhinged, lives for big numbers.

### Anxious (default: Mochi)
Nervous, sweet, increasingly worried, loves calm sessions.

User can swap personality independently of Tokemon choice.

## Speech Bubble System

### Line 6 Structure
Animated emoji + dim quoted text. Emoji cycles through 🧠👀🔮💭 on each
refresh (1s interval) to create a "watching" animation effect.

### Triggers (contextual, not random)
- Session start (greeting)
- Rate limit crossings: 50%, 75%, 90%
- Lines milestones: 500, 1000, 2000 in session
- Evolution (always shows, critical priority)
- Chill vibes: under 10% usage

### Behavior
- Shows for ~10 renders (~10s at 1s refresh), then disappears
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
| 1 | 0 | 0 | Flint / Pixel / Mochi |
| 2 | 100 | 100 | " |
| 3 | 200 | 300 | " |
| 4 | 350 | 650 | " |
| **5** | **500** | **1,150** | **Blaze / Codec / Puff** |
| 6 | 700 | 1,850 | " |
| 7 | 1,000 | 2,850 | " |
| 8 | 1,500 | 4,350 | " |
| 9 | 2,000 | 6,350 | " |
| 10 | 3,000 | 9,350 | " |
| 11 | 4,000 | 13,350 | " |
| 12 | 5,500 | 18,850 | " |
| 13 | 7,000 | 25,850 | " |
| 14 | 9,000 | 34,850 | " |
| **15** | **15,000** | **49,850** | **Inferno / Daemon / Nimbus** |

~1,150 lines for first evolution (a day or two of coding).
~49,850 total for final form (weeks of real work, earned).
Post-15 levels continue with no new evolution — bragging rights only.

## Init Wizard Flow

```
Step 1: Plan selection       [Pro / Max / API]
Step 2: Choose your Tokemon  [Flint / Pixel / Mochi] with live sprite previews
Step 3: Choose personality   [Sassy / Hype / Anxious] with sample quips
Step 4: Status line config   [Recommended / Minimal / Custom]
Step 5: Processing + hatch   Animated egg hatching sequence → greeting
```

## Skills

### Existing (kept)
- `/tokburn-check` — session health check, context analysis, recommendations
- `/tokburn-plan` — estimate token cost of reading files before starting a task

### New
- `/tokemon-stats` — shows Tokemon XP, level, lines to next evolution,
  lifetime stats, evolution history

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
  "last_bubble_trigger": "rate_limit_50",
  "triggered_this_session": ["session_start", "rate_limit_50"]
}
```

### ~/.tokburn/config.json
```json
{
  "plan": "max",
  "limits": { "pro": {...}, "max": {...}, "api": {...} },
  "statusline_modules": ["rich"],
  "statusline_elements": ["model", "plan", "context_bar", ...],
  "companion": "flint",
  "personality": "sassy"
}
```

## File Structure

```
tokburn-cli/
  cli.js              # init + init --remove only
  init.js             # Setup logic (detectEnvironment, configurePlan, etc.)
  init-ui.mjs         # Ink wizard with Tokemon selection + personality picker
  statusline.js       # Complete rewrite: Tokemon sprite + 6-line layout
  config.js           # Config read/write (unchanged)
  costs.js            # Cost calculations (kept for status line)
  companion.js        # NEW: XP, leveling, evolution, bubble trigger logic
  sprites.js          # NEW: 9 sprite definitions + expression system
  personality.js      # NEW: Message pools (3 personalities x 4 moods)
  sprite-preview.js   # Dev tool: preview all sprites (not published)
  layout-preview.js   # Dev tool: preview status line layout (not published)
  package.json
  README.md
  LICENSE
```

### Files Removed
- store.js (JSONL log parsing — unused)
- display.js (terminal formatting — unused)
- proxy.js (API proxy — unused)
- tracker.js (request tracking — unused)
- All terminal commands from cli.js

## Competitive Advantage

| Feature | ccpet | mascot-statusline | claude-pet | **Tokemons** |
|---|---|---|---|---|
| Choose creature | No | No | No | **Yes (3 starters)** |
| Evolution | No | No | No | **Yes (3 stages, XP)** |
| Personality | No | No | No | **Yes (3 types, swappable)** |
| Speech bubbles | No | No | No | **Yes (100+ contextual quips)** |
| Colorful sprites | No | Half-blocks | Kitty-only | **ANSI truecolor, universal** |
| Expressive face | No | Heat-map only | State-based | **2x2 eyes + 3x2 mouth** |
| Works everywhere | Yes | Yes | No | **Yes** |
