#!/bin/bash
# tokburn — Claude Code status line script
# Receives session JSON on stdin, outputs a compact usage summary.
# Install: tokburn init (or manually set statusLine in ~/.claude/settings.json)

input=$(cat)

model=$(echo "$input" | jq -r '.model.display_name // "?"')
five_hr_pct=$(echo "$input" | jq -r '.rate_limits.five_hour.used_percentage // 0' | cut -d. -f1)
cost=$(echo "$input" | jq -r '.cost.total_cost_usd // 0')
input_tok=$(echo "$input" | jq -r '.context_window.total_input_tokens // 0')
output_tok=$(echo "$input" | jq -r '.context_window.total_output_tokens // 0')

total_tok=$((input_tok + output_tok))

# Abbreviate token count
if [ "$total_tok" -ge 1000000 ]; then
  tok_fmt="$(echo "scale=1; $total_tok / 1000000" | bc)M"
elif [ "$total_tok" -ge 1000 ]; then
  tok_fmt="$(echo "scale=1; $total_tok / 1000" | bc)K"
else
  tok_fmt="$total_tok"
fi

cost_fmt=$(printf '$%.2f' "$cost")

# State indicator
if [ "$five_hr_pct" -ge 90 ]; then
  state="!! ${tok_fmt} tok  ${five_hr_pct}% of 5hr  ${cost_fmt}"
elif [ "$five_hr_pct" -ge 50 ]; then
  state=">> ${tok_fmt} tok  ${five_hr_pct}% of 5hr  ${cost_fmt}"
else
  state=":: ${tok_fmt} tok  ${five_hr_pct}% of 5hr  ${cost_fmt}"
fi

# Append burn rate from proxy if running
pid_file="$HOME/.tokburn/tokburn.pid"
if [ -f "$pid_file" ]; then
  pid=$(cat "$pid_file" 2>/dev/null)
  if kill -0 "$pid" 2>/dev/null; then
    rate=$(tokburn _burn-rate 2>/dev/null)
    if [ -n "$rate" ] && [ "$rate" != "0" ]; then
      state="${state}  ~${rate}/min"
    fi
  fi
fi

echo "$state"
