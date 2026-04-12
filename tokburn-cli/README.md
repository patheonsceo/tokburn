# tokburn

**Choose your Tokemon. Write code. Watch it evolve. Track your Claude Code stats live.**

A pixel art companion that lives in your Claude Code status line — it blinks, reacts to your token usage, roasts your spending habits, and evolves as you write more code. Also happens to be a full session dashboard.

![Tokemon live demo](https://raw.githubusercontent.com/patheonsceo/tokburn/main/screenshots/tokemon-demo.gif)

![Three starter Tokemons](https://raw.githubusercontent.com/patheonsceo/tokburn/main/docs/assets/starters.svg)

## Two lines. That's it.

```bash
npm i -g tokburn
tokburn init
```

Pick your plan. Choose your creature. Give it a personality. Your Tokemon hatches and starts living in your status line immediately.

![tokburn init](https://raw.githubusercontent.com/patheonsceo/tokburn/main/screenshots/init.png)

---

## What you actually get

Your status line goes from `Opus 4.6 (1M context) | ctx 13%` to this:

![Status line](https://raw.githubusercontent.com/patheonsceo/tokburn/main/screenshots/idle-statusline.png)

A living creature with animated expressions, rate limit bars, token stats, XP tracking, and personality quips. Everything updates live — you never hit a rate limit wall blind again.

![Full session](https://raw.githubusercontent.com/patheonsceo/tokburn/main/screenshots/full-session.png)

---

## Three starters. Three personalities.

### Flint -- the fire type
![Flint evolution](https://raw.githubusercontent.com/patheonsceo/tokburn/main/docs/assets/evolution-flint.svg)

Default personality: **Sassy.** Will roast your spending with a straight face.
```
"you code like someone who hates money"
"your rate limit called. it filed a restraining order."
"oh great. you again."
```

### Pixel -- the tech type
![Pixel evolution](https://raw.githubusercontent.com/patheonsceo/tokburn/main/docs/assets/evolution-pixel.svg)

Default personality: **Hype.** Unhinged internet energy. Lives for big numbers.
```
"LEEROY JENKINS INTO THE RATE LIMIT!!"
"THEY WILL WRITE LEGENDS ABOUT THIS SESSION"
"chat is this real?? IS THIS REAL??"
```

### Mochi -- the nature type
![Mochi evolution](https://raw.githubusercontent.com/patheonsceo/tokburn/main/docs/assets/evolution-mochi.svg)

Default personality: **Anxious.** Sweet, nervous, tries to be brave. Fails adorably.
```
"EVERYTHING IS ON FIRE AND I AM SMALL..."
"trying to be supportive but also AAAAAA..."
"oh... oh wow... i'm actually kind of... pretty??"
```

Swap personalities independently -- give Flint the anxious voice, give Mochi the sassy one. 152 unique quips.

---

## They evolve

Your Tokemon earns XP from every line of code Claude writes. Across all projects, all sessions.

| Stage | When | What happens |
|---|---|---|
| **Stage 2** | **~5,000 lines** (Lv.5) | New sprite, new name, 30-second golden celebration |
| **Stage 3** | **~50,000 lines** (Lv.15) | Final form -- earned over weeks of real work |
| Post-15 | Forever | Levels keep climbing. Bragging rights. |

---

## They're alive

5 expressions that change in real-time:

![Blinking](https://raw.githubusercontent.com/patheonsceo/tokburn/main/screenshots/blinking-statusline.png)

![All expressions](https://raw.githubusercontent.com/patheonsceo/tokburn/main/docs/assets/expressions.svg)

Normal, blink, happy, stressed, panic — your Tokemon reacts to what's actually happening in your session. Animates at 1fps with expression cycling and emoji rotation.

---

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
