---
name: tokburn-check
description: Show token usage, context health, and actionable tips to extend your Claude Code session. Use when running low on tokens, hitting rate limits, or wanting to optimize your session.
allowed-tools: Read, Bash, Grep, Glob
effort: low
---

# tokburn-check -- Session Health Check

Analyze the current session and provide actionable recommendations to extend it.

## Step 1: Gather session data

Check CLAUDE.md size (loaded every turn, directly impacts token usage):

!`wc -c CLAUDE.md 2>/dev/null || echo "0 no-claudemd"`

Check if .claudeignore exists and what it covers:

!`cat .claudeignore 2>/dev/null || echo "NO_CLAUDEIGNORE"`

Check tokburn config for plan info:

!`cat ~/.tokburn/config.json 2>/dev/null || echo '{}'`

## Step 2: Find large files in the project

These are the files most likely to burn context if read:

!`find . -maxdepth 3 -type f \( -name "*.ts" -o -name "*.js" -o -name "*.tsx" -o -name "*.jsx" -o -name "*.py" -o -name "*.go" -o -name "*.rs" \) -not -path "*/node_modules/*" -not -path "*/.git/*" -not -path "*/dist/*" -not -path "*/build/*" | xargs wc -l 2>/dev/null | sort -rn | head -15`

## Step 3: Check for common token-wasting patterns

Look for directories that should probably be in .claudeignore:

!`ls -d node_modules dist build coverage .next __pycache__ target 2>/dev/null || echo "none found"`

## Step 4: Generate the report

Based on ALL the data gathered above, output a report in this exact format:

```
tokburn -- Session Health
--------------------------------------
CLAUDE.md:   [X] chars ([X] tokens est.)
.claudeignore: [exists/missing]
Plan:        [pro/max/api]

Top 5 largest source files:
  [file]  [lines] lines
  ...

Recommendations (most impactful first):
  1. [specific action with estimated savings]
  2. [specific action]
  3. [specific action]
```

Be concrete in recommendations. Use numbers. Examples of good recommendations:
- "Run /compact -- conversation context is the biggest token consumer in long sessions"
- "Add dist/ and coverage/ to .claudeignore -- they contain [X] files that get scanned"
- "CLAUDE.md is 12,400 chars (~3,100 tokens). Loaded every turn. Trim to <3,000 chars to save ~2K tokens per message"
- "auth-service.ts is 2,400 lines. Use Grep to find specific functions instead of reading the whole file"
- "Use subagents for exploration tasks -- they run in separate context and only return summaries"
- "You're on Pro plan (~500K/5hr). Consider upgrading to Max for 4x the limit"

Only recommend actions that the data supports. Do not guess.
