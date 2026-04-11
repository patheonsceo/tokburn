# Tokemons Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform tokburn from a broken CLI analytics tool into a Tokemon companion system with animated sprites, personality-driven speech bubbles, evolution through coding, and a polished init wizard.

**Architecture:** Status line script reads Claude Code's stdin JSON, renders a Tokemon sprite (ANSI truecolor half-blocks) alongside session stats. Companion state (XP, level, personality) persists in `~/.tokburn/companion.json`. Init wizard (Ink/React TUI) handles Tokemon selection. Zero external dependencies for the status line renderer — it must execute in under 5ms.

**Tech Stack:** Node.js (>=18), Ink 6.x + React 19 (init wizard only), raw ANSI escape codes + Unicode half-blocks (status line rendering)

---

## Task Overview

1. Strip dead code (remove terminal commands, proxy, store, display, tracker)
2. Build companion.js (XP, leveling, evolution, bubble trigger logic)
3. Build sprites.js (9 sprites x 5 expressions, half-block renderer)
4. Build personality.js (3 personalities x 4 moods, 100+ messages)
5. Rewrite statusline.js (6-line layout with Tokemon)
6. Rewrite cli.js (init + remove only)
7. Update init.js (add companion config functions)
8. Rewrite init-ui.mjs (Tokemon selection, personality picker, hatch)
9. Add /tokemon-stats skill
10. Update package.json, README, tests
11. Publish to npm

---

### Task 1: Strip Dead Code

Remove all terminal command infrastructure.

**Files:**
- Delete: `tokburn-cli/store.js`
- Delete: `tokburn-cli/display.js`
- Delete: `tokburn-cli/proxy.js`
- Delete: `tokburn-cli/tracker.js`

**Step 1: Delete the files**

```bash
cd /home/dev/Projects/tokburn/tokburn-cli
rm store.js display.js proxy.js tracker.js
```

**Step 2: Verify nothing imports them**

```bash
grep -r "require.*store\|require.*display\|require.*proxy\|require.*tracker" *.js *.mjs --include="*.js" --include="*.mjs" | grep -v node_modules | grep -v test/
```

Expected: hits in cli.js (rewritten in Task 6) and test/benchmark.js (replaced in Task 10).

**Step 3: Commit**

```bash
git add -A && git commit -m "chore: remove dead code — store, display, proxy, tracker"
```

---

### Task 2: Build companion.js

The core game engine: XP tracking, leveling, evolution detection, bubble triggers.

**Files:**
- Create: `tokburn-cli/companion.js`
- Create: `tokburn-cli/test/companion.test.js`

**Step 1: Write test file**

Tests cover: level curve (0 XP = Lv1, 1150 XP = Lv5/Stage2, 49850 = Lv15/Stage3),
stage names per companion, XP diff calculation (same session, new session, negative),
mood thresholds (chill/alert/stressed/panic), bubble triggers (rate limit crossings,
evolution, dedup).

**Step 2: Run test to verify it fails**

```bash
node test/companion.test.js
```
Expected: FAIL — module not found

**Step 3: Write companion.js**

Exports: `getLevel(xp)`, `getStageName(companion, stage)`, `getMood(rateLimitPct)`,
`calculateXPDiff(currentLines, lastSnapshot, currentSession, lastSession)`,
`checkBubbleTriggers(state, companionData)`, `loadCompanion()`, `saveCompanion(data)`,
`createCompanion(companion, personality)`.

Level curve array: [0, 100, 200, 350, 500, 700, 1000, 1500, 2000, 3000, 4000, 5500, 7000, 9000, 15000].
Stage thresholds: Stage 2 at Lv5, Stage 3 at Lv15.
Stage names: flint=[Flint,Blaze,Inferno], pixel=[Pixel,Codec,Daemon], mochi=[Mochi,Puff,Nimbus].
Mood: <30=chill, 30-60=alert, 60-85=stressed, 85+=panic.
Bubble dedup: triggered_this_session array prevents repeat fires.
Persistence: ~/.tokburn/companion.json read/write.

**Step 4: Run tests**

```bash
node test/companion.test.js
```
Expected: all pass

**Step 5: Commit**

```bash
git add companion.js test/companion.test.js
git commit -m "feat: add companion.js — XP, leveling, evolution, mood, bubbles"
```

---

### Task 3: Build sprites.js

All 9 sprite definitions with the expression system and half-block renderer.

**Files:**
- Create: `tokburn-cli/sprites.js`

**Step 1: Create sprites.js**

Port from sprite-preview.js:
- `renderSprite(pixels)` — half-block ANSI truecolor renderer
- `applyExpr(base, eyes, mouth, expr, bodyColor, sweatPos)` — expression applicator
- All 9 base sprites (FLINT_1/2/3, PIXEL_1/2/3, MOCHI_1/2/3) with eye/mouth/sweat positions
- Expression definitions: fireExpr(), techExpr(), mochiExpr(), pixelS1Expr()
- `getSprite(companion, stage, expression)` — returns final pixel grid

Sprites are 9-11 wide x 12 tall (6 terminal rows to span the full layout).
2x2 eyes with pupils, 3x2 mouth blocks with shapes (dot, smile, worried, scream).

Exports: `renderSprite`, `getSprite`, `COMPANIONS`, `EXPRESSIONS`

**Step 2: Verify sprites render**

```bash
node -e "const s = require('./sprites'); const rows = s.renderSprite(s.getSprite('flint', 1, 'normal')); rows.forEach(r => console.log(r));"
```
Expected: Flint Stage 1 renders with colors

**Step 3: Commit**

```bash
git add sprites.js
git commit -m "feat: add sprites.js — 9 Tokemon sprites with 5 expressions each"
```

---

### Task 4: Build personality.js

Message pools for all personalities, moods, and special triggers.

**Files:**
- Create: `tokburn-cli/personality.js`

**Step 1: Create personality.js**

Structure: `MESSAGES[personality][mood]` = array of strings.
Moods: chill, alert, stressed, panic.
Special pools: evolution, lines_milestone.
3 personalities x 6 pools x 5-8 messages = ~100-120 total quips.

`getMessage(personality, trigger, mood)` — picks from the right pool. Uses
minute-level timestamp for deterministic selection (same message stays ~60s).

`getWatchEmoji()` — cycles through brain/eyes/crystal/thought emojis at 1s.

Animated emoji frames: brain, eyes, crystal ball, thought bubble.

**Step 2: Smoke test**

```bash
node -e "const p = require('./personality'); console.log(p.getMessage('sassy', null, 'chill')); console.log(p.getWatchEmoji());"
```
Expected: prints a message and an emoji

**Step 3: Commit**

```bash
git add personality.js
git commit -m "feat: add personality.js — 100+ quips for 3 personalities"
```

---

### Task 5: Rewrite statusline.js

Complete rewrite. Renders the locked 6-line layout with Tokemon sprite.
This is the most performance-critical file — runs every 1 second.

**Files:**
- Rewrite: `tokburn-cli/statusline.js`

**Step 1: Write new statusline.js**

Structure:
1. ANSI helpers (fg, bg, reset) — inline, no imports
2. Bar renderers from layout-preview.js:
   - contextBar(pct, width) using muted thin line chars
   - limitBar(pct, width) using muted diamonds
   - xpBar(pct, width) using muted triangular blocks
3. Muted color palette (green rgb(80,180,80), yellow rgb(200,170,60), red rgb(200,70,70))
4. Line builders:
   - Line 1: Model dot Plan + contextBar + percentage
   - Line 2: 5h diamondBar + pct + reset | 7d diamondBar + pct + reset
   - Line 3: +lines / -lines | down-arrow tokens up-arrow tokens | branch-symbol branch
   - Line 4: dashed divider
   - Line 5: Lv.X StageName xpBar arrow Lv.Y
   - Line 6: animated emoji + dim quoted personality message
5. Main (only when run directly, not require'd):
   - Read stdin JSON
   - Load config + companion
   - Calculate mood from 5hr rate limit pct
   - Pick expression (normal/blink cycle, override to stressed/panic on high usage)
   - Get sprite via sprites.getSprite()
   - Render sprite rows
   - Build 6 text lines
   - Join sprite rows + divider + text lines side by side
   - Update XP if lines_added changed, save companion
   - Output to stdout

Must handle: missing companion (show text-only), missing rate limit data
(show 0%), missing model info (show "Claude Code").

When require'd as module: export bar renderers and constants for init-ui.mjs.

**Step 2: Test with mock stdin**

```bash
echo '{"model":{"display_name":"Opus 4.6"},"context_window":{"used_percentage":31,"context_window_size":1000000,"total_input_tokens":37000,"total_output_tokens":152000},"rate_limits":{"five_hour":{"used_percentage":27,"resets_at":1712850000},"seven_day":{"used_percentage":2,"resets_at":1713000000}},"cost":{"total_lines_added":156,"total_lines_removed":23},"workspace":{"current_dir":"/home/dev/Projects/tokburn"}}' | node statusline.js
```
Expected: full 6-line layout with sprite

**Step 3: Commit**

```bash
git add statusline.js
git commit -m "feat: rewrite statusline.js — 6-line Tokemon layout"
```

---

### Task 6: Rewrite cli.js

Strip to init and init --remove only.

**Files:**
- Rewrite: `tokburn-cli/cli.js`

**Step 1: Write new cli.js**

Only two commands:
- `tokburn init` — runs the Ink wizard (init-ui.mjs), falls back to readline (init.js)
- `tokburn init --remove` — calls uninstallTokburn()

Version: 2.0.0. Description: "Tokemons — your coding companion for Claude Code".

**Step 2: Test**

```bash
node cli.js --help
```
Expected: shows only init command

**Step 3: Commit**

```bash
git add cli.js
git commit -m "feat: strip cli.js to init only — remove all terminal commands"
```

---

### Task 7: Update init.js

Add companion creation. Set refreshInterval for animation.

**Files:**
- Modify: `tokburn-cli/init.js`

**Step 1: Add configureCompanion function**

```javascript
function configureCompanion(companion, personality) {
  const { createCompanion } = require('./companion');
  createCompanion(companion, personality);
  setConfig({ companion, personality });
}
```

**Step 2: Update configureStatusLine**

Add `refreshInterval: 1` to the statusLine settings object for 1s animation tick.

**Step 3: Update uninstallTokburn**

Also remove `~/.tokburn/companion.json`.

**Step 4: Remove terminal command references from done message**

**Step 5: Export configureCompanion**

**Step 6: Test**

```bash
node -e "const i = require('./init'); console.log(typeof i.configureCompanion);"
```
Expected: "function"

**Step 7: Commit**

```bash
git add init.js
git commit -m "feat: update init.js — companion config, refreshInterval"
```

---

### Task 8: Rewrite init-ui.mjs

5-step Tokemon selection wizard with live sprite previews.

**Files:**
- Rewrite: `tokburn-cli/init-ui.mjs`

**Step 1: Redesign wizard phases**

```
WELCOME → PLAN → TOKEMON → PERSONALITY → STATUS_LINE → PROCESSING → DONE
```

**TOKEMON phase:** Shows 3 Stage 1 sprites rendered inline as ANSI text.
Arrow keys navigate, sprite preview updates live. Each option shows:
- Sprite rendered via renderSprite()
- Name + type + default personality
- Short flavor text

**PERSONALITY phase:** Shows 2-3 sample quips per personality option.
User can see what kind of voice they're choosing.

**PROCESSING phase:** Runs configurePlan, configureCompanion, configureStatusLine.
Progress bar + task checklist with Ink Spinner.

**DONE phase:** Shows the chosen Tokemon sprite with its first greeting bubble.
"Your Tokemon has hatched!" moment.

Ink supports raw ANSI strings in Text content — render sprites as pre-built
ANSI strings and display them in Box/Text components.

**Step 2: Test the full wizard**

```bash
node cli.js init
```
Expected: 5-step wizard, creates companion.json, configures status line

**Step 3: Commit**

```bash
git add init-ui.mjs
git commit -m "feat: rewrite init wizard — Tokemon selection + personality picker"
```

---

### Task 9: Add /tokemon-stats Skill

**Files:**
- Create: `~/.claude/skills/tokemon-stats/SKILL.md`

**Step 1: Create the skill**

Reads `~/.tokburn/companion.json`, calculates XP to next level and next
evolution, displays lifetime stats and evolution history. If no companion
exists, tells user to run `tokburn init`.

Output format:
```
Tokemon Stats
--------------------------------------
[StageName]  Lv.[X] — [Type]
Stage [N]/3

XP: [current]/[needed] to Lv.[next]
[========----] XX%

Lines to next level:     [N]
Lines to next evolution: [N]
Lifetime lines:          [N]
Hatched: [date]
```

**Step 2: Commit**

Not a git-tracked file (lives in ~/.claude/skills/), but the skill definition
should also be added to the tokburn repo for distribution:

```bash
mkdir -p skills/tokemon-stats
# Copy SKILL.md to skills/tokemon-stats/SKILL.md in the repo
git add skills/
git commit -m "feat: add /tokemon-stats skill"
```

---

### Task 10: Update package.json, README, Tests

**Files:**
- Modify: `tokburn-cli/package.json`
- Rewrite: `tokburn-cli/README.md`
- Rewrite: `tokburn-cli/test/benchmark.js`

**Step 1: Update package.json**

- Version: `"2.0.0"`
- Description: `"Tokemons — your coding companion for Claude Code"`
- Files array: remove store/display/proxy/tracker, add companion/sprites/personality
- Keywords: add tokemons, tokemon, pet, companion, evolution
- Fix author: `"patheonsceo"` (was `"pantheonsceo"`)
- Update test script: `"test": "node test/companion.test.js"`

**Step 2: Rewrite README**

Focus on Tokemons:
- "Choose your Tokemon. Write code. Watch it evolve."
- Quick start, 3 starters, evolution, personalities
- Status line description
- Skills
- Privacy (everything local)

**Step 3: Replace test suite**

Remove old benchmark.js (tests deleted proxy). Replace with companion tests
plus smoke tests for sprites and personality modules.

**Step 4: Run tests**

```bash
npm test
```
Expected: all pass

**Step 5: Commit**

```bash
git add package.json README.md test/
git commit -m "feat: tokburn v2.0.0 — Tokemons, updated README, new tests"
```

---

### Task 11: Publish to npm

**Step 1: Verify package**

```bash
npm pack --dry-run
```
Expected: correct files, reasonable size

**Step 2: Test fresh install**

```bash
npm pack && npm install -g ./tokburn-2.0.0.tgz && tokburn init
```

**Step 3: Publish**

```bash
npm publish
```

**Step 4: Tag and push**

```bash
git tag v2.0.0 && git push && git push --tags
```

---

## Dependency Graph

```
Task 1 (strip dead code)
  |
  +---> Task 2 (companion.js) --------+
  +---> Task 3 (sprites.js) ----------+
  +---> Task 4 (personality.js) ------+
  +---> Task 6 (cli.js) -------------+|
  |                                    |
  +---> Task 7 (init.js) ---+         |
                             |         v
                             +-> Task 5 (statusline.js)
                             |         |
                             +-> Task 8 (init-ui.mjs)
                                       |
                                       v
                                  Task 9 (skill)
                                       |
                                       v
                                  Task 10 (package/readme/tests)
                                       |
                                       v
                                  Task 11 (publish)
```

Tasks 2, 3, 4, 6 can run in parallel after Task 1.
Task 5 depends on 2, 3, 4.
Task 7 can run in parallel with 2-4.
Task 8 depends on all of 2-7.
Tasks 9-11 are sequential after 8.
