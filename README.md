<div align="left">

```
  ████████╗ ██████╗ ██╗  ██╗██████╗ ██╗   ██╗██████╗ ███╗   ██╗
  ╚══██╔══╝██╔═══██╗██║ ██╔╝██╔══██╗██║   ██║██╔══██╗████╗  ██║
     ██║   ██║   ██║█████╔╝ ██████╔╝██║   ██║██████╔╝██╔██╗ ██║
     ██║   ██║   ██║██╔═██╗ ██╔══██╗██║   ██║██╔══██╗██║╚██╗██║
     ██║   ╚██████╔╝██║  ██╗██████╔╝╚██████╔╝██║  ██║██║ ╚████║
     ╚═╝    ╚═════╝ ╚═╝  ╚═╝╚═════╝  ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═══╝
```

**Choose your Tokemon. Write code. Watch it evolve.**

[![npm](https://img.shields.io/npm/v/tokburn?color=orange)](https://www.npmjs.com/package/tokburn)
[![downloads](https://img.shields.io/npm/dm/tokburn)](https://www.npmjs.com/package/tokburn)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
[![Node](https://img.shields.io/node/v/tokburn)](https://nodejs.org)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](./CONTRIBUTING.md)

</div>

<p align="center">
  <img src="docs/assets/starters.svg" alt="Three starter Tokemons: Flint (Fire), Pixel (Tech), Mochi (Nature)" />
</p>

Works with: **Claude Code** | Codex, Cursor -- coming soon

---

## The Problem

Claude Pro/Max gives you a 5-hour usage window. You don't know how much you've used until you hit the wall mid-conversation and lose your entire context. Saying "hi" to Claude Code can cost 3% of your session. Refactoring a file? Maybe 15%. You have no idea until it's too late.

**tokburn fixes this** -- and gives you a companion while you code.

---

## Table of Contents

- [For Claude Code users (CLI)](#for-claude-code-users) -- Tokemon companion, rich status line, zero config
- [Starters & Evolution](#starters--evolution) -- 3 creatures, 3 stages each
- [Personalities](#personalities) -- 3 swappable voices with 100+ quips
- [For claude.ai users (Extension)](#for-claudeai-users) -- Chrome extension with floating pill overlay
- [Privacy](#privacy) -- everything stays on your machine

---

## For Claude Code Users

> `npm i -g tokburn && tokburn init` -- that's it. No proxy. No env vars. Nothing to break.

tokburn adds a **Tokemon companion** to your Claude Code status line. Your creature lives alongside your session stats, reacts to token usage with mood-based expressions, and evolves as you write code.

### Quick Start

```bash
npm i -g tokburn
tokburn init
```

The wizard has 4 steps:

1. Pick your plan (Pro / Max / API)
2. Choose your starter Tokemon (Flint / Pixel / Mochi)
3. Pick a personality (Sassy / Hype / Anxious)
4. Configure status line (Recommended / Skip)

### Status Line

6 lines: your Tokemon sprite on the left, session stats on the right.

```
 [sprite]  │ Opus 4.6 (1M)·Max ━━━━━━────────────── 31%
 [sprite]  │ 5h ◆◆◆◇◇◇◇◇◇◇ 27% 3h25m→10:00 | 7d ◇◇◇◇◇◇◇◇◇◇ 2%
 [sprite]  │ +156 / -23 | ↓37K ↑152K | ⎇ main*
 [sprite]  │ ╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌
 [sprite]  │ Lv.8 Blaze ▰▰▰▰▰▱▱▱ → Lv.9
            │ 🧠 "slow day huh. saving money for once?"
```

**Line 1:** Model, plan, context bar (━─), percentage
**Line 2:** 5-hour rate limit (◆◇), 7-day rate limit (◆◇), reset times
**Line 3:** Lines changed (+green/-red), tokens in/out, git branch
**Line 4:** Divider
**Line 5:** Level, Tokemon name, XP bar (▰▱), next level
**Line 6:** Animated emoji + personality quip

Sprites animate with expression cycling (blink, mood reactions) at 1-second refresh. Color rule: white for facts, dim gray for structure, muted green/yellow/red for bars only.

> **Note:** Sprite animation requires **Claude Code v2.1.97+** (run `claude update`). Older versions ignore `refreshInterval` and won't animate. Also make sure `CLAUDE_CODE_NO_FLICKER` is **not** set in your settings — it suppresses status line redraws.

### Skills

| Skill | What it does |
|---|---|
| `/tokburn-check` | Session health, context analysis, optimization tips |
| `/tokburn-plan` | Estimate token cost before starting a task |
| `/tokemon-stats` | XP, level, evolution progress, lifetime stats |

### Commands

| Command | What it does |
|---|---|
| `tokburn init` | Interactive setup wizard |
| `tokburn init --remove` | Uninstall tokburn from Claude Code |

---

## Starters & Evolution

Choose one of three starter Tokemons. Each has a unique design and evolves through 3 stages.

### Flint (Fire)
<img src="docs/assets/evolution-flint.svg" alt="Flint → Blaze → Inferno" />

### Pixel (Tech)
<img src="docs/assets/evolution-pixel.svg" alt="Pixel → Codec → Daemon" />

### Mochi (Nature)
<img src="docs/assets/evolution-mochi.svg" alt="Mochi → Puff → Nimbus" />

Your Tokemon earns XP from lines of code you write:

- **Stage 1** (Lv.1-4): Starter form
- **Stage 2** (Lv.5-14): First evolution at ~5,000 lines of code
- **Stage 3** (Lv.15+): Final form at ~50,000 lines

Post-Level 15 continues indefinitely -- bragging rights.

### Expressions

Each Tokemon has 5 expressions that change based on your session:

<img src="docs/assets/expressions.svg" alt="Blaze expressions: normal, blink, happy, stress, panic" />

Expressions cycle automatically: blink on idle, stress at 60%+ rate limit, panic at 85%+, happy on evolution. Rendered with ANSI truecolor half-blocks. Works on iTerm2, Kitty, WezTerm, Ghostty, Windows Terminal, and any terminal with truecolor support.

---

## Personalities

Three swappable personalities control your Tokemon's quips:

**Sassy** (default for Flint) -- deadpan humor, roasts your spending
```
chill:    "slow day huh. saving money for once?"
stressed: "we're in 'explain this to accounting' territory"
panic:    "this is fine. everything is fine."
```

**Hype** (default for Pixel) -- ALL CAPS energy, supportive but unhinged
```
chill:    "LET'S GOOO we're just warming up!!"
stressed: "THIS IS WHERE LEGENDS ARE MADE!!"
panic:    "MAXIMUM OVERDRIVE!! NO BRAKES!!"
```

**Anxious** (default for Mochi) -- nervous, sweet, worried about tokens
```
chill:    "this is nice... i like it quiet"
stressed: "maybe we should... slow down?"
panic:    "oh no oh no oh no..."
```

Quips trigger on session events: rate limit crossings, line milestones, evolution. 100+ unique messages across all personalities.

---

## For claude.ai Users

> A Chrome extension that shows token usage on claude.ai. Install it and immediately see what you're spending.

### Quick Start

1. Clone this repo or [download the ZIP](https://github.com/patheonsceo/tokburn/archive/refs/heads/main.zip)
2. Open `chrome://extensions` and enable **Developer Mode**
3. Click **Load unpacked** and select the `tokburn-ext/` folder
4. Open [claude.ai](https://claude.ai) -- the pill appears automatically

See [tokburn-ext/README.md](./tokburn-ext/README.md) for details.

---

## How It Works

**Status line** -- Claude Code sends session data (model, rate limits, cost, context usage) to a status line script via stdin on every update. tokburn's script parses this JSON, loads your companion state, renders the Tokemon sprite with the appropriate expression, builds the 6-line layout, updates XP, and outputs to stdout. No proxy, no env vars. Zero external dependencies for the renderer -- sub-5ms execution.

**Companion state** -- Stored in `~/.tokburn/companion.json`. Tracks XP, level, evolution history, personality, and bubble triggers. Updated on every status line render when lines of code change.

**Chrome extension** -- Patches `window.fetch` on claude.ai using a cloned response stream. Parses SSE events for token usage data. The original response is never touched. Everything is stored in `chrome.storage.local`.

---

## Privacy

**Your data never leaves your machine.**

- The status line reads Claude Code's native JSON from stdin. No network requests.
- Companion state is a local JSON file. No cloud sync.
- The Chrome extension makes zero external requests. Everything in `chrome.storage.local`.
- No analytics. No telemetry. No accounts. No cloud.
- All code is open source. Read every line: [tokburn-cli/](./tokburn-cli/) and [tokburn-ext/](./tokburn-ext/)

---

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for setup and guidelines.

Quick version: fork it, branch it, PR it. Conventional commits (`feat:`, `fix:`, `chore:`). Run `npm test`.

---

## License

[MIT](./LICENSE) -- Copyright 2026 tokburn contributors
