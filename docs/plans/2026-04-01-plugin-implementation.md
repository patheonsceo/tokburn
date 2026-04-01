# tokburn Claude Code Plugin — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Ship tokburn v0.4.0 as a Claude Code plugin with 2 skills (/tokburn-check, /tokburn-plan), 2 hooks (pre-read warning, context threshold warning), and updated init wizard.

**Architecture:** Skills are SKILL.md files installed to ~/.claude/skills/tokburn-*/. Hooks are shell scripts registered in ~/.claude/settings.json. The init wizard copies skills+hooks and configures settings.json with a merge strategy. All new code is zero-dependency shell scripts and markdown.

**Tech Stack:** Bash (hooks), Markdown + YAML frontmatter (skills), Node.js (init wizard updates)

---

### Task 1: Create /tokburn-check skill

**Files:**
- Create: `tokburn-cli/skills/tokburn-check/SKILL.md`

**Step 1: Write the skill file**

```markdown
---
name: tokburn-check
description: Show token usage, context health, and actionable tips to extend your Claude Code session. Use when running low on tokens, hitting rate limits, or wanting to optimize your session.
allowed-tools: Read, Bash, Grep, Glob
effort: low
---

# tokburn-check — Session Health Check

Analyze the current session and provide actionable recommendations.

## Step 1: Gather session data

Run this command to get the current session state:

!`echo '{}' | node ~/.claude/tokburn-statusline.js 2>/dev/null || echo "statusline unavailable"`

Also check the tokburn config:

!`cat ~/.tokburn/config.json 2>/dev/null || echo '{}'`

## Step 2: Check CLAUDE.md size

!`wc -c CLAUDE.md 2>/dev/null || echo "0 no CLAUDE.md"`

## Step 3: Check for large files recently read

!`find . -name "*.ts" -o -name "*.js" -o -name "*.py" -o -name "*.tsx" -o -name "*.jsx" | head -20 | xargs wc -l 2>/dev/null | sort -rn | head -10`

## Step 4: Check .claudeignore

!`cat .claudeignore 2>/dev/null || echo "no .claudeignore found"`

## Step 5: Report

Based on the data above, provide a session health report in this format:

```
Session Health
──────────────────────────────────
Context:     [X]% used
Rate limit:  [X]% of 5hr window
Cost:        $[X]
Burn rate:   ~[X] tok/min

Recommendations:
1. [Most impactful action]
2. [Second most impactful action]
3. [Third action if applicable]
```

Recommendations should be specific and actionable. Examples:
- "Run /compact — your conversation is long and compacting will free ~X% context"
- "Add [directory] to .claudeignore — large files there are being scanned unnecessarily"
- "Your CLAUDE.md is [X]K characters. Trim to key architecture decisions only (aim for <3K chars)"
- "Use subagents for research tasks to keep main context clean"
- "Consider /clear if switching to a new task — your context has stale conversation from the previous task"
- "You're at [X]% of your 5hr limit with [time] remaining. Pace yourself or switch to Sonnet for simpler tasks"

Be specific about WHY each recommendation helps and HOW MUCH it could save.
```

**Step 2: Verify the file is valid markdown with frontmatter**

Run:
```bash
head -5 tokburn-cli/skills/tokburn-check/SKILL.md
```

Expected: YAML frontmatter with name, description, allowed-tools.

**Step 3: Commit**

```bash
git add tokburn-cli/skills/tokburn-check/SKILL.md
git commit -m "feat: add /tokburn-check skill for session health analysis"
```

---

### Task 2: Create /tokburn-plan skill

**Files:**
- Create: `tokburn-cli/skills/tokburn-plan/SKILL.md`

**Step 1: Write the skill file**

```markdown
---
name: tokburn-plan
description: Estimate the token cost of reading files before starting a task. Use before large refactors or when you want to know how much context a task will consume.
argument-hint: "[file-pattern or task description]"
allowed-tools: Read, Bash, Grep, Glob
effort: low
---

# tokburn-plan — Estimate Task Cost

Estimate how many tokens the specified files or task will consume.

## Step 1: Identify target files

Based on the argument: $ARGUMENTS

Use Glob and Grep to find the relevant files. List them.

## Step 2: Measure file sizes

For each file found, get the character count:

!`echo "Checking file sizes..."`

Run `wc -c` on each matched file. Sum the totals.

## Step 3: Estimate token cost

Use this formula:
- 1 token is approximately 4 characters
- Reading a file costs approximately (file_chars / 4) tokens
- Claude's response typically adds 20-50% more tokens on top

## Step 4: Report

Present the estimate in this format:

```
Token Estimate: [task description]
──────────────────────────────────
Files matched:  [N] files
Total size:     [X] characters
Est. tokens:    ~[X] tokens to read
Est. with response: ~[X] tokens total

Context impact: ~[X]% of remaining context window

Files (largest first):
  [filename]     [size] chars  ~[tokens] tok
  [filename]     [size] chars  ~[tokens] tok
  ...
```

If the estimated context impact is >20%, warn:
"This task will use a significant portion of your remaining context. Consider:
- Reading only the specific files you need to modify
- Using Grep to find relevant sections instead of reading whole files
- Breaking the task into smaller pieces"
```

**Step 2: Verify the file**

Run:
```bash
head -5 tokburn-cli/skills/tokburn-plan/SKILL.md
```

**Step 3: Commit**

```bash
git add tokburn-cli/skills/tokburn-plan/SKILL.md
git commit -m "feat: add /tokburn-plan skill for task cost estimation"
```

---

### Task 3: Create pre-read warning hook

**Files:**
- Create: `tokburn-cli/hooks/pre-read-warn.sh`

**Step 1: Write the hook script**

```bash
#!/bin/bash
# tokburn — PreToolUse hook
# Warns before reading large files that will consume significant context.
# Reads threshold from ~/.tokburn/config.json (default: 5000 lines).

INPUT=$(cat)

# Only check Read tool calls
TOOL=$(echo "$INPUT" | grep -o '"tool_name":"[^"]*"' | head -1 | cut -d'"' -f4)
[ "$TOOL" != "Read" ] && exit 0

# Extract file path
FILE_PATH=$(echo "$INPUT" | grep -o '"file_path":"[^"]*"' | head -1 | cut -d'"' -f4)
[ -z "$FILE_PATH" ] && exit 0
[ ! -f "$FILE_PATH" ] && exit 0

# Read threshold (default 5000 lines)
THRESHOLD=5000
if [ -f "$HOME/.tokburn/config.json" ]; then
  CUSTOM=$(grep -o '"warn_file_lines":[0-9]*' "$HOME/.tokburn/config.json" 2>/dev/null | grep -o '[0-9]*')
  [ -n "$CUSTOM" ] && THRESHOLD=$CUSTOM
fi

# Count lines
LINES=$(wc -l < "$FILE_PATH" 2>/dev/null || echo 0)

# If under threshold, allow silently
[ "$LINES" -lt "$THRESHOLD" ] && exit 0

# Estimate tokens
CHARS=$(wc -c < "$FILE_PATH" 2>/dev/null || echo 0)
EST_TOKENS=$((CHARS / 4))

# Format token count
if [ "$EST_TOKENS" -gt 1000 ]; then
  TOK_FMT="$((EST_TOKENS / 1000))K"
else
  TOK_FMT="$EST_TOKENS"
fi

# Warn but allow (exit 0 with context message)
echo "tokburn: this file is $LINES lines (~${TOK_FMT} tokens). Consider reading only the section you need, or use Grep to find the relevant part."
exit 0
```

**Step 2: Make executable and test**

```bash
chmod +x tokburn-cli/hooks/pre-read-warn.sh
echo '{"tool_name":"Read","tool_input":{"file_path":"tokburn-cli/cli.js"}}' | bash tokburn-cli/hooks/pre-read-warn.sh
```

Expected: silent exit (cli.js is under 5000 lines).

```bash
# Create a test large file
yes "test line" | head -6000 > /tmp/tokburn-test-large.txt
echo '{"tool_name":"Read","tool_input":{"file_path":"/tmp/tokburn-test-large.txt"}}' | bash tokburn-cli/hooks/pre-read-warn.sh
rm /tmp/tokburn-test-large.txt
```

Expected: warning message about file being 6000 lines.

**Step 3: Commit**

```bash
git add tokburn-cli/hooks/pre-read-warn.sh
git commit -m "feat: add pre-read warning hook for large files"
```

---

### Task 4: Create context threshold hook

**Files:**
- Create: `tokburn-cli/hooks/stop-context-check.sh`

**Step 1: Write the hook script**

```bash
#!/bin/bash
# tokburn — Stop hook
# Checks context window usage after each Claude response.
# Injects a recommendation into Claude's context when approaching limits.

INPUT=$(cat)

# Check if hooks are enabled
if [ -f "$HOME/.tokburn/config.json" ]; then
  ENABLED=$(grep -o '"enabled":\(true\|false\)' "$HOME/.tokburn/config.json" 2>/dev/null | grep -o '\(true\|false\)')
  [ "$ENABLED" = "false" ] && exit 0
fi

# Read thresholds (defaults: 60, 80, 90)
WARN=60
CRITICAL=80
URGENT=90
if [ -f "$HOME/.tokburn/config.json" ]; then
  W=$(grep -o '"context_warn_pct":[0-9]*' "$HOME/.tokburn/config.json" 2>/dev/null | grep -o '[0-9]*')
  C=$(grep -o '"context_critical_pct":[0-9]*' "$HOME/.tokburn/config.json" 2>/dev/null | grep -o '[0-9]*')
  U=$(grep -o '"context_urgent_pct":[0-9]*' "$HOME/.tokburn/config.json" 2>/dev/null | grep -o '[0-9]*')
  [ -n "$W" ] && WARN=$W
  [ -n "$C" ] && CRITICAL=$C
  [ -n "$U" ] && URGENT=$U
fi

# This hook cannot read context_window data from stdin (Stop hook gets minimal data).
# Instead, we check if the status line data is available from a recent run.
# The statusline.js writes to a cache file we can check.

# For now, this hook provides a gentle nudge based on session duration.
# Future: read from a shared state file that statusline.js updates.

# Exit cleanly — context awareness comes from the status line being always visible.
exit 0
```

NOTE: The Stop hook receives limited data (not the full session JSON that the status line gets). The status line IS the context awareness layer. This hook is a placeholder that can be enhanced when Claude Code exposes more data to Stop hooks.

**Step 2: Make executable**

```bash
chmod +x tokburn-cli/hooks/stop-context-check.sh
```

**Step 3: Commit**

```bash
git add tokburn-cli/hooks/stop-context-check.sh
git commit -m "feat: add stop context check hook (placeholder for future enhancement)"
```

---

### Task 5: Update init wizard to install skills and hooks

**Files:**
- Modify: `tokburn-cli/init.js`
- Modify: `tokburn-cli/init-ui.mjs`
- Modify: `tokburn-cli/package.json` (files array)

**Step 1: Add skill/hook installation functions to init.js**

Add these functions to init.js before the module.exports:

```javascript
function installSkills() {
  const home = process.env.HOME || process.env.USERPROFILE;
  const skillsDir = path.join(home, '.claude', 'skills');

  // Install each skill
  const skillNames = ['tokburn-check', 'tokburn-plan'];
  for (const name of skillNames) {
    const src = path.join(__dirname, 'skills', name, 'SKILL.md');
    const destDir = path.join(skillsDir, name);
    if (fs.existsSync(src)) {
      fs.mkdirSync(destDir, { recursive: true });
      fs.copyFileSync(src, path.join(destDir, 'SKILL.md'));
    }
  }

  return skillNames.length;
}

function installHooks() {
  const home = process.env.HOME || process.env.USERPROFILE;
  const claudeSettings = path.join(home, '.claude', 'settings.json');

  // Read existing settings
  let settings = {};
  if (fs.existsSync(claudeSettings)) {
    try { settings = JSON.parse(fs.readFileSync(claudeSettings, 'utf8')); } catch (_) {}
  }

  // Merge hooks (preserve existing, add tokburn hooks)
  if (!settings.hooks) settings.hooks = {};
  if (!settings.hooks.PreToolUse) settings.hooks.PreToolUse = [];
  if (!settings.hooks.Stop) settings.hooks.Stop = [];

  // Install pre-read warning hook
  const preReadSrc = path.join(__dirname, 'hooks', 'pre-read-warn.sh');
  const preReadDest = path.join(home, '.claude', 'tokburn-pre-read-warn.sh');
  if (fs.existsSync(preReadSrc)) {
    fs.copyFileSync(preReadSrc, preReadDest);
    fs.chmodSync(preReadDest, '755');
  }

  // Add hook config if not already present
  const hasPreRead = settings.hooks.PreToolUse.some(h =>
    h.hooks && h.hooks.some(hh => hh.command && hh.command.includes('tokburn-pre-read'))
  );
  if (!hasPreRead) {
    settings.hooks.PreToolUse.push({
      matcher: 'Read',
      hooks: [{ type: 'command', command: preReadDest }]
    });
  }

  // Write back
  fs.writeFileSync(claudeSettings, JSON.stringify(settings, null, 2) + '\n');

  return 1; // number of hooks installed
}

function uninstallTokburn() {
  const home = process.env.HOME || process.env.USERPROFILE;

  // Remove skills
  const skillNames = ['tokburn-check', 'tokburn-plan'];
  for (const name of skillNames) {
    const dir = path.join(home, '.claude', 'skills', name);
    if (fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true });
    }
  }

  // Remove hook scripts
  const hookFiles = ['tokburn-pre-read-warn.sh', 'tokburn-statusline.js'];
  for (const f of hookFiles) {
    const p = path.join(home, '.claude', f);
    if (fs.existsSync(p)) fs.unlinkSync(p);
  }

  // Remove tokburn hooks from settings.json
  const claudeSettings = path.join(home, '.claude', 'settings.json');
  if (fs.existsSync(claudeSettings)) {
    try {
      const settings = JSON.parse(fs.readFileSync(claudeSettings, 'utf8'));
      if (settings.hooks) {
        for (const event of Object.keys(settings.hooks)) {
          settings.hooks[event] = settings.hooks[event].filter(h =>
            !(h.hooks && h.hooks.some(hh => hh.command && hh.command.includes('tokburn')))
          );
          if (settings.hooks[event].length === 0) delete settings.hooks[event];
        }
        if (Object.keys(settings.hooks).length === 0) delete settings.hooks;
      }
      if (settings.statusLine && settings.statusLine.command && settings.statusLine.command.includes('tokburn')) {
        delete settings.statusLine;
      }
      fs.writeFileSync(claudeSettings, JSON.stringify(settings, null, 2) + '\n');
    } catch (_) {}
  }
}
```

Add to module.exports: `installSkills, installHooks, uninstallTokburn`

**Step 2: Add `--remove` flag to init command in cli.js**

```javascript
program
  .command('init')
  .description('Interactive setup wizard for Claude Code')
  .option('--remove', 'Uninstall tokburn from Claude Code')
  .action(async (opts) => {
    if (opts.remove) {
      const { uninstallTokburn } = require('./init');
      uninstallTokburn();
      console.log('\n  tokburn removed from Claude Code.\n');
      return;
    }
    try {
      await import('./init-ui.mjs');
    } catch (err) {
      const { runInit } = require('./init');
      await runInit();
    }
  });
```

**Step 3: Add skills and hooks to package.json files array**

Add these entries to the `files` array:
```json
"skills/tokburn-check/SKILL.md",
"skills/tokburn-plan/SKILL.md",
"hooks/pre-read-warn.sh",
"hooks/stop-context-check.sh"
```

**Step 4: Test installation**

```bash
node cli.js init --remove   # clean state
# Then re-run init manually:
node -e "const {installSkills,installHooks}=require('./init'); console.log('Skills:', installSkills()); console.log('Hooks:', installHooks())"
ls ~/.claude/skills/tokburn-check/SKILL.md
ls ~/.claude/skills/tokburn-plan/SKILL.md
cat ~/.claude/settings.json | grep -A5 tokburn
```

**Step 5: Test uninstall**

```bash
node cli.js init --remove
ls ~/.claude/skills/tokburn-check 2>&1  # should not exist
cat ~/.claude/settings.json | grep tokburn  # should find nothing
```

**Step 6: Commit**

```bash
git add tokburn-cli/init.js tokburn-cli/cli.js tokburn-cli/package.json
git commit -m "feat: init wizard installs skills + hooks, --remove for uninstall"
```

---

### Task 6: Update init-ui.mjs wizard to include skills step

**Files:**
- Modify: `tokburn-cli/init-ui.mjs`

**Step 1: Add a skills installation step to the processing phase**

In the `buildTaskList()` function inside init-ui.mjs, add skill and hook installation tasks:

```javascript
// After the statusline task in buildTaskList():
tasks.push({
  key: 'skills',
  label: 'Skills installed',
  run: () => {
    const count = installSkills();
    return { count };
  },
});

tasks.push({
  key: 'hooks',
  label: 'Hooks configured',
  run: () => {
    const count = installHooks();
    return { count };
  },
});
```

Add `installSkills, installHooks` to the require from init.js at the top.

**Step 2: Update the DoneSummary to show skills**

Add a completed line for skills:
```javascript
React.createElement(Text, null, completedLine('Skills', '2 installed (/tokburn-check, /tokburn-plan)')),
React.createElement(Text, null, completedLine('Hooks', 'large file warning')),
```

**Step 3: Test by running init**

```bash
node cli.js init
```

Walk through wizard, verify skills + hooks appear in the processing phase and done summary.

**Step 4: Commit**

```bash
git add tokburn-cli/init-ui.mjs
git commit -m "feat: init wizard installs skills and hooks during setup"
```

---

### Task 7: Run full test suite, bump version, publish

**Step 1: Run tests**

```bash
cd tokburn-cli && npm test
```

All 62 tests must pass.

**Step 2: Test the skills manually**

In a Claude Code session, type `/tokburn-check` and verify it produces output.
Type `/tokburn-plan src/` and verify it estimates file sizes.

**Step 3: Bump version to 0.4.0**

Edit `package.json`: change version to `"0.4.0"`.

**Step 4: Publish**

```bash
echo "//registry.npmjs.org/:_authToken=npm_TOKEN" > .npmrc
npm publish --access public
rm .npmrc
```

**Step 5: Commit and push**

```bash
git add -A
git commit -m "feat: tokburn v0.4.0 — Claude Code plugin with skills and hooks"
git push
```
