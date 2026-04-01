---
name: tokburn-plan
description: Estimate the token cost of reading files before starting a task. Use before large refactors or when you want to know how much context a set of files will consume.
argument-hint: "[file pattern, directory, or task description]"
allowed-tools: Bash, Glob, Grep
effort: low
---

# tokburn-plan -- Estimate Task Token Cost

Estimate how many tokens a set of files will consume when read into context.

## Step 1: Identify target files

The user wants to estimate cost for: $ARGUMENTS

Use Glob to find matching files. If the argument is a directory, find all source files in it. If it's a glob pattern, expand it. If it's a task description, identify which files would likely need to be read.

Exclude: node_modules, .git, dist, build, coverage, __pycache__

## Step 2: Measure each file

For each file found, get the character count and line count:

!`echo "ready to measure"`

Run wc on the matched files. Collect: filename, character count, line count.

## Step 3: Calculate estimates

Use these formulas:
- Tokens to read = total_characters / 4
- Context impact = tokens / 1000000 (fraction of 1M context window)
- With Claude's response, expect 1.3x to 1.5x the read cost

## Step 4: Present the estimate

Output in this format:

```
tokburn -- Cost Estimate: [description]
--------------------------------------
Files:     [N] files matched
Size:      [X] characters total
Est. read: ~[X] tokens
Est. total: ~[X] tokens (with response)

Context impact: ~[X]% of context window

Largest files:
  [filename]          [lines]L   ~[tokens] tok
  [filename]          [lines]L   ~[tokens] tok
  [filename]          [lines]L   ~[tokens] tok
  ...
```

If context impact > 15%, add a warning:
"This will consume a significant chunk of context. Consider:
- Read only files you need to modify (skip tests, types, configs)
- Use Grep to find specific sections instead of full file reads
- Break the task into smaller pieces (one file at a time)"

If context impact > 30%, add:
"This task may not fit in a single session. Consider using subagents for research and keeping the main context for implementation."
