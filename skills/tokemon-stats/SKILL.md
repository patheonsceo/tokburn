---
name: tokemon-stats
description: Show your Tokemon's level, XP, evolution progress, and lifetime stats
---

Show the user's Tokemon companion stats using the companion module.

Run this to get the stats:

```bash
node -e "
const { loadCompanion, getLevel } = require('$(npm root -g)/tokburn/companion');
const data = loadCompanion();
if (!data) { console.log('NO_COMPANION'); process.exit(0); }
const levelInfo = getLevel(data.xp);
console.log(JSON.stringify({ ...data, levelInfo }));
"
```

If the output is `NO_COMPANION`, tell the user to run `tokburn init` first.

Otherwise parse the JSON and calculate:

```javascript
// From the output:
// data.xp, data.level, data.stage, data.companion, data.personality
// data.hatched, data.lifetime_lines, data.evolutions, data.stage_name
// data.levelInfo.level, data.levelInfo.stage, data.levelInfo.xpForNext, data.levelInfo.xpIntoLevel

const xpPct = Math.round((data.levelInfo.xpIntoLevel / (data.levelInfo.xpIntoLevel + data.levelInfo.xpForNext)) * 100);

// Evolution thresholds (cumulative XP)
const STAGE_2_XP = 5000;   // Level 5
const STAGE_3_XP = 50000;  // Level 15
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
