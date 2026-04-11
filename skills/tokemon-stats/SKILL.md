---
name: tokemon-stats
description: Show your Tokemon's level, XP, evolution progress, and lifetime stats
---

Show the user's Tokemon companion stats by reading `~/.tokburn/companion.json`.

If the file doesn't exist, tell the user to run `tokburn init` first.

Otherwise, read the file and calculate:

```javascript
const fs = require('fs');
const path = require('path');
const os = require('os');

const companionPath = path.join(os.homedir(), '.tokburn', 'companion.json');
const data = JSON.parse(fs.readFileSync(companionPath, 'utf8'));

// Level curve
const XP_CURVE = [0, 100, 200, 350, 500, 700, 1000, 1500, 2000, 3000, 4000, 5500, 7000, 9000, 15000];
let cumulative = 0;
let level = 1;
let remaining = data.xp;
for (let i = 0; i < XP_CURVE.length; i++) {
  if (remaining < XP_CURVE[i]) break;
  remaining -= XP_CURVE[i];
  level = i + 2;
}
const xpForNext = level <= 15 ? XP_CURVE[level - 1] : 15000;
const xpPct = Math.round((remaining / xpForNext) * 100);

// Evolution thresholds
const STAGE_2_XP = 1150;  // Level 5
const STAGE_3_XP = 49850; // Level 15
const nextEvoXP = data.stage === 1 ? STAGE_2_XP : data.stage === 2 ? STAGE_3_XP : null;
const linesToNextEvo = nextEvoXP ? Math.max(0, nextEvoXP - data.xp) : null;
```

Display output (render as a code block for alignment):

```
Tokemon Stats
--------------------------------------
[stage_name]  Lv.[level] — [companion type]
Stage [stage]/3

XP: [xp]/[xpForNext] to Lv.[next]
[████████════════════] XX%

Lines to next level:     [xpForNext - remaining]
Lines to next evolution: [linesToNextEvo or "MAX"]
Lifetime lines:          [lifetime_lines]
Hatched: [hatched date]

Evolution history:
  Stage 2 → [name] at [lines] lines ([date])
  Stage 3 → [name] at [lines] lines ([date])
```

Companion types: flint=Fire, pixel=Tech, mochi=Nature
