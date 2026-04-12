# tokburn — project context for Claude

## What this is

**tokburn** is an npm CLI that adds a Tokemon pixel-art companion + session dashboard to the Claude Code status line. A 6-line animated display showing model/context, rate limits, tokens, git branch, XP bar, and personality quips — with a sprite that blinks, reacts to token usage, and evolves as you write code.

Current version: **2.2.0** (published to npm)

## Tech stack

- **Node.js >= 18** (status line script runs under Claude Code's host Node)
- **Zero runtime dependencies** for the status line renderer (must run in <5ms)
- **Ink 6 + React 19** for the init wizard only (`init-ui.mjs`)
- **ANSI truecolor** half-block rendering (`▀▄`) for sprites

## Project layout

```
tokburn/
├── tokburn-cli/           # The npm package — this is what ships
│   ├── cli.js             # Init-only CLI (tokburn init / tokburn init --remove)
│   ├── init.js            # Setup logic + Claude Code settings.json patching
│   ├── init-ui.mjs        # Ink wizard (plan → tokemon → personality → statusline)
│   ├── statusline.js      # The 6-line renderer — runs every 1s via refreshInterval
│   ├── sprites.js         # 9 creatures × 5 expressions × 3 stages = 135 variants
│   ├── companion.js       # XP, leveling, evolution, mood, bubble triggers
│   ├── personality.js     # 152 quips across 3 voices (sassy/hype/anxious)
│   ├── config.js          # ~/.tokburn/config.json read/write
│   ├── costs.js           # Model pricing
│   ├── test/companion.test.js  # 24 tests
│   └── generate-readme-assets.js  # SVG generator for docs/assets/
├── docs/
│   ├── assets/            # Auto-generated SVG sprite renders (committed)
│   └── plans/             # Design docs + v2.1-ideas.md
├── screenshots/           # Real terminal captures used in README (committed)
├── skills/tokemon-stats/  # /tokemon-stats Claude Code skill
├── tokburn-ext/           # GITIGNORED — Chrome extension, local dev only
└── ccsessions/            # GITIGNORED — dated session logs, local only
```

**Runtime state:** `~/.tokburn/companion.json` (XP, level, personality, evolution history, timestamps)

## Critical platform requirements

1. **Claude Code >= v2.1.97** — `refreshInterval` was added in this version. Older versions silently ignore it and the sprite won't animate during idle. Document this in README, mention `claude update` if users report static sprites.

2. **`CLAUDE_CODE_NO_FLICKER` must NOT be set** — this env var enables alternate-screen rendering which suppresses status line redraws. Kills animation even when the script runs.

3. **Status line script is invoked by Claude Code** — runs on every message + every second during idle (when `refreshInterval: 1`). Must complete in <100ms or Claude Code may kill it.

## Non-obvious gotchas (burned us once, don't get burned again)

1. **Never output an entirely-whitespace line from statusline.js.** Claude Code strips them. This breaks sprite row alignment because empty sprite rows (all spaces) get stripped and the divider `│` jumps to column 0. Fix: sprites.js uses near-invisible half-blocks `fg(1,1,1) + '▀'` for empty cells instead of spaces. Every row is guaranteed non-whitespace.

2. **`fs.readFileSync(0, 'utf8')` blocks if stdin is a TTY.** During idle `refreshInterval` calls, Claude Code may not pipe stdin. Guard with `if (!process.stdin.isTTY)` before reading, otherwise the script hangs and Claude Code kills it.

3. **Fresh companion must establish XP baseline, not grant retroactive XP.** On first render after init, `last_session_id` is null. Don't treat this as "new session → grant all current lines as XP" — users expect to start at Lv.1 with 0 XP. Set the baseline snapshot and skip XP gain on that render.

4. **Status line path must point to npm package directory, not a copied file.** statusline.js requires sibling modules (config, companion, sprites, personality). Don't copy just statusline.js to `~/.claude/` — point the command at `/path/to/node_modules/tokburn/statusline.js` so sibling requires work.

5. **Claude Code's `display_name` may already include context size.** E.g. `"Opus 4.6 (1M context)"`. Don't blindly append size again or you get `(1M context) (1M)`. Regex check before appending.

6. **All sprites are 11 cols wide.** `spriteWidth = spritePixels[0].length` is computed per-render, never hardcoded.

## Animation loop

Idle cycle in `statusline.js` `pickExpression()` is a 20-second pattern:

```
0-3:   normal ×4      (4s opening rest)
4:     blink
5-6:   normal ×2
7:     blink          (natural double-blink)
8-13:  normal ×6      (main stillness)
14:    blink          (isolated)
15-16: normal ×2
17:    happy          (rare smile, once per 20s)
18-19: normal ×2
```

80% stillness. Mood overrides (stressed/panic/happy-on-evolution) bypass the cycle entirely. If you change the loop, keep the "mostly normal with varied rhythm" principle — creatures that blink on a metronome feel robotic.

## Evolution & level-up celebrations

- **Evolution** → 30s celebration. `comp.last_evolved_at = Date.now()` when stage increases. While `Date.now() - last_evolved_at < 30000`, force happy expression + show `★ Lv.X StageName — EVOLVED! ★` in gold on line 5 + extend evolution bubble to 30s.
- **Level-up** (same stage) → 5s flash. `comp.last_levelup_at = Date.now()` when level increases within same stage. Golden `LEVEL UP!` on line 5 for 5s.

## XP curve

```javascript
const LEVEL_CURVE = [
  0, 500, 1000, 1500, 2000, 2500, 3000, 3500, 4000, 4500,
  5000, 5500, 6000, 6000, 5000,
];
```

- Stage 2 evolution at Lv.5 = **5,000 cumulative lines**
- Stage 3 evolution at Lv.15 = **50,000 cumulative lines**
- Post-15 continues at 5,000 per level indefinitely

Don't change these casually — they're balanced around "Stage 2 in 4-5 sessions, Stage 3 in weeks of real work".

## Testing

```bash
cd tokburn-cli
npm test                    # 24 unit tests for companion.js

# Manual statusline smoke test:
echo '{"model":{"display_name":"Opus 4.6 (1M context)"},"context_window":{"used_percentage":31,"context_window_size":1000000},"rate_limits":{"five_hour":{"used_percentage":27}},"cost":{"total_lines_added":156,"total_lines_removed":23},"workspace":{"current_dir":"/tmp"}}' | node statusline.js
```

## Publishing workflow

1. Bump `tokburn-cli/package.json` version
2. `cd tokburn-cli && npm test`
3. `git add -A && git commit -m "..."`
4. `git push origin main`
5. `cd tokburn-cli && npm publish`
6. Optionally tag + GitHub release: `git tag vX.Y.Z && git push --tags && gh release create vX.Y.Z --title "..." --notes "..."`

Author is `patheonsceo` (note: NOT `pantheonsceo` — that's the typo we fixed in 2.0.0).

## Skill routing

When the user's request matches an available skill, ALWAYS invoke it using the Skill tool as your FIRST action. Do NOT answer directly, do NOT use other tools first.

Key routing rules:
- Product ideas, "is this worth building", brainstorming → invoke office-hours
- Bugs, errors, "why is this broken", 500 errors → invoke investigate
- Ship, deploy, push, create PR → invoke ship
- QA, test the site, find bugs → invoke qa
- Code review, check my diff → invoke review
- Update docs after shipping → invoke document-release
- Weekly retro → invoke retro
- Design system, brand → invoke design-consultation
- Visual audit, design polish → invoke design-review
- Architecture review → invoke plan-eng-review

## Session logs

Detailed session logs live in `ccsessions/` (gitignored, local only). Each file is dated `YYYY-MM-DD-topic.md` and captures the WHY and decision-making from a coding session. Read on demand when you need historical context beyond git log.
