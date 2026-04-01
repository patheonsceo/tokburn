#!/bin/bash
# tokburn -- PreToolUse hook
# Warns before reading large files that will consume significant context.
# Threshold configurable in ~/.tokburn/config.json (default: 5000 lines).

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
if [ "$EST_TOKENS" -gt 1000000 ]; then
  TOK_FMT="$((EST_TOKENS / 1000000)).$(( (EST_TOKENS % 1000000) / 100000 ))M"
elif [ "$EST_TOKENS" -gt 1000 ]; then
  TOK_FMT="$((EST_TOKENS / 1000))K"
else
  TOK_FMT="$EST_TOKENS"
fi

# Warn (exit 0 = allow, but stdout goes to Claude's context as a note)
echo "tokburn: $(basename "$FILE_PATH") is $LINES lines (~${TOK_FMT} tokens). Consider reading only the section you need, or use Grep to find the relevant part."
exit 0
