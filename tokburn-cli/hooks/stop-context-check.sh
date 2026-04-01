#!/bin/bash
# tokburn -- Stop hook (placeholder)
# Future: check context window usage after each Claude response
# and inject recommendations when approaching limits.
#
# Currently the status line provides continuous context awareness.
# This hook will be enhanced when Claude Code exposes context_window
# data to Stop hooks (currently only available in status line JSON).

# Check if hooks are enabled
if [ -f "$HOME/.tokburn/config.json" ]; then
  ENABLED=$(grep -o '"enabled":[a-z]*' "$HOME/.tokburn/config.json" 2>/dev/null | grep -o 'true\|false')
  [ "$ENABLED" = "false" ] && exit 0
fi

# Placeholder: exit cleanly
exit 0
