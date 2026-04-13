#!/usr/bin/env node
/**
 * Tokmon status line layout preview — shows how a Tokmon looks
 * next to actual status line data.
 */

const RESET = '\x1b[0m';
function fg(r, g, b) { return `\x1b[38;2;${r};${g};${b}m`; }
function bg(r, g, b) { return `\x1b[48;2;${r};${g};${b}m`; }

function renderSprite(pixels) {
  const height = pixels.length;
  const width = pixels[0].length;
  const rows = [];
  for (let y = 0; y < height; y += 2) {
    let row = '';
    for (let x = 0; x < width; x++) {
      const top = pixels[y] ? pixels[y][x] : null;
      const bot = (y + 1 < height && pixels[y + 1]) ? pixels[y + 1][x] : null;
      if (!top && !bot) { row += ' '; }
      else if (top && !bot) { row += fg(top[0], top[1], top[2]) + '\u2580' + RESET; }
      else if (!top && bot) { row += fg(bot[0], bot[1], bot[2]) + '\u2584' + RESET; }
      else { row += bg(top[0], top[1], top[2]) + fg(bot[0], bot[1], bot[2]) + '\u2584' + RESET; }
    }
    rows.push(row);
  }
  return rows;
}

// ── Colors ─────────────────────────────────────────────────────────────────
const _ = null;
const W  = [255, 255, 255];
const Bk = [20, 20, 20];
const dk = [60, 30, 15];

const FY  = [255, 220, 50];
const Fy  = [255, 190, 30];
const FO  = [255, 140, 0];
const Fo  = [230, 110, 0];
const FR  = [220, 60, 10];
const Fc  = [255, 200, 80];

// Blaze (Flint Stage 2 — the fire fox) with happy expression
const BLAZE = [
  [_,  FY, _,  _,  _,  _,  _,  FY, _,  _,  _  ],
  [_,  FO, FO, _,  _,  _,  FO, FO, _,  _,  _  ],
  [_,  FO, FO, FO, FO, FO, FO, FO, _,  _,  _  ],
  [_,  FO, FO, Fo, Fo, Fo, FO, FO, _,  _,  _  ],
  [_,  FO, W,  Bk, Fo, Bk, W,  FO, _,  _,  _  ],
  [_,  FO, Fo, Fo, Fo, Fo, Fo, FO, _,  _,  _  ],
  [_,  _,  FO, dk, Fo, dk, FO, _,  _,  _,  _  ],
  [_,  FO, FO, Fo, dk, Fo, FO, FO, _,  _,  _  ],
  [_,  FR, _,  FO, _,  FO, _,  FR, FY, _,  _  ],
  [_,  _,  _,  _,  _,  _,  _,  FY, FO, FY, _  ],
  [_,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _  ],
  [_,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _  ],
];

// Same Blaze with normal eyes
const BLAZE_TALK = [
  [_,  FY, _,  _,  _,  _,  _,  FY, _,  _,  _  ],
  [_,  FO, FO, _,  _,  _,  FO, FO, _,  _,  _  ],
  [_,  FO, FO, FO, FO, FO, FO, FO, _,  _,  _  ],
  [_,  FO, FO, Fo, Fo, Fo, FO, FO, _,  _,  _  ],
  [_,  FO, W,  W,  Fo, W,  W,  FO, _,  _,  _  ],
  [_,  FO, W,  Bk, Fo, Bk, W,  FO, _,  _,  _  ],
  [_,  _,  FO, Fo, dk, Fo, FO, _,  _,  _,  _  ],
  [_,  FO, FO, FO, FO, FO, FO, FO, _,  _,  _  ],
  [_,  FR, _,  FO, _,  FO, _,  FR, FY, _,  _  ],
  [_,  _,  _,  _,  _,  _,  _,  FY, FO, FY, _  ],
  [_,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _  ],
  [_,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _  ],
];

// ── Status line text (with ANSI colors) ────────────────────────────────────

const C = {
  // Muted/dimmed accent colors (not full brightness)
  green:   fg(80, 180, 80),    // muted green
  yellow:  fg(200, 170, 60),   // muted yellow
  red:     fg(200, 70, 70),    // muted red
  dim:     '\x1b[90m',
  bold:    '\x1b[1m',
  reset:   RESET,
};

// ── Bar styles ─────────────────────────────────────────────────────────────

const SEP = C.dim + ' | ' + RESET;

// Muted bar colors (lower brightness, not neon)
const barGreen  = fg(70, 160, 70);
const barYellow = fg(180, 150, 50);
const barRed    = fg(180, 60, 60);
const barEmpty  = fg(60, 60, 60);

function barColor(pct) {
  return pct >= 80 ? barRed : pct >= 50 ? barYellow : barGreen;
}

// Context bar: thin solid line ━───
function contextBar(pct, width) {
  const filled = Math.round((pct / 100) * width);
  const empty = width - filled;
  return barColor(pct) + '\u2501'.repeat(filled) + RESET + barEmpty + '\u2500'.repeat(empty) + RESET;
}

// Rate limit bar: diamonds ◆◇
function limitBar(pct, width) {
  const filled = Math.round((pct / 100) * width);
  const empty = width - filled;
  return barColor(pct) + '\u25C6'.repeat(filled) + RESET + barEmpty + '\u25C7'.repeat(empty) + RESET;
}

// XP bar: triangular blocks ▰▱
function xpBar(pct, width) {
  const filled = Math.round((pct / 100) * width);
  const empty = width - filled;
  return fg(200, 150, 50) + '\u25B0'.repeat(filled) + RESET + barEmpty + '\u25B1'.repeat(empty) + RESET;
}

// Animated emoji options (cycles each refresh)
const WATCH_EMOJIS = ['\uD83E\uDDE0', '\uD83D\uDC40', '\uD83D\uDD2E', '\uD83D\uDCAD'];

// Divider between status and Tokemon
const DIVIDER = C.dim + '\u254C'.repeat(55) + RESET;

// ══════════════════════════════════════════════════════════════════════════
// COLOR RULE: White = facts. Dim = structure. Green/Yellow/Red = bars ONLY.
// Nothing else gets color. Everything that isn't a bar is white or dim.
// ══════════════════════════════════════════════════════════════════════════

// ── Chill layout ───────────────────────────────────────────────────────────

const STATUS_LINES = [
  // Line 1: Model + context bar
  'Opus 4.6 (1M)' + C.dim + '\u00b7' + RESET + 'Max' +
    ' ' + contextBar(31, 20) + ' 31%',

  // Line 2: Rate limits with diamond bars
  C.dim + '5h ' + RESET + limitBar(27, 10) + ' ' + C.green + '27%' + RESET + C.dim + ' 3h25m\u219210:00' + RESET +
    SEP + C.dim + '7d ' + RESET + limitBar(2, 10) + ' ' + C.green + '2%' + RESET + C.dim + ' 6d12h\u219204/18' + RESET,

  // Line 3: Lines changed + tokens + branch
  C.green + '+156' + RESET + C.dim + ' / ' + RESET + C.red + '-23' + RESET +
    SEP + C.dim + '\u2193' + RESET + '37K ' + C.dim + '\u2191' + RESET + '152K' +
    SEP + C.dim + '\u2387 ' + RESET + 'main' + C.dim + '*' + RESET,

  // Divider
  DIVIDER,

  // Line 4: Tokemon level + XP bar
  C.bold + 'Lv.8' + RESET + ' Blaze ' + xpBar(63, 8) + C.dim + ' \u2192 Lv.9' + RESET,

  // Line 5: Animated emoji + personality quip
  WATCH_EMOJIS[0] + C.dim + ' "slow day huh. saving money for once?"' + RESET,
];

// With different emoji frame
const STATUS_LINES_2 = [
  STATUS_LINES[0],
  STATUS_LINES[1],
  STATUS_LINES[2],
  DIVIDER,
  STATUS_LINES[4],
  WATCH_EMOJIS[1] + C.dim + ' "that\'s like... a coffee. keep going"' + RESET,
];

// ── Panic layout ───────────────────────────────────────────────────────────

const STATUS_LINES_PANIC = [
  // Line 1: Model + context bar
  'Opus 4.6 (1M)' + C.dim + '\u00b7' + RESET + 'Max' +
    ' ' + contextBar(82, 20) + ' ' + C.red + '82%' + RESET,

  // Line 2: Rate limits (diamonds turn red/yellow)
  C.dim + '5h ' + RESET + limitBar(87, 10) + ' ' + C.red + '87%' + RESET + C.dim + ' 32m\u219216:30' + RESET +
    SEP + C.dim + '7d ' + RESET + limitBar(64, 10) + ' ' + C.yellow + '64%' + RESET + C.dim + ' 1d16h\u219204/14' + RESET,

  // Line 3: Lines changed + tokens + branch
  C.green + '+2,340' + RESET + C.dim + ' / ' + RESET + C.red + '-187' + RESET +
    SEP + C.dim + '\u2193' + RESET + '892K ' + C.dim + '\u2191' + RESET + '1.2M' +
    SEP + C.dim + '\u2387 ' + RESET + 'main' + C.dim + '*' + RESET,

  // Divider
  DIVIDER,

  // Line 4
  C.bold + 'Lv.8' + RESET + ' Blaze ' + xpBar(89, 8) + C.dim + ' \u2192 Lv.9' + RESET,

  // Line 5 - panic quip
  WATCH_EMOJIS[2] + C.dim + ' "budget meeting\'s gonna be fun lol"' + RESET,
];

// ── Render layout ──────────────────────────────────────────────────────────

function renderLayout(sprite, statusLines, label) {
  const spriteRows = renderSprite(sprite);
  const spriteWidth = sprite[0].length;
  const divider = C.dim + ' \u2502 ' + RESET;
  const emptySprite = ' '.repeat(spriteWidth);

  console.log(`\n  ${C.bold}${label}${RESET}`);
  console.log('  ' + '\u2500'.repeat(70));

  for (let i = 0; i < Math.max(spriteRows.length, statusLines.length); i++) {
    const spr = spriteRows[i] || emptySprite;
    const txt = statusLines[i] || '';
    console.log('  ' + spr + divider + txt);
  }
}

// ── Panic Blaze (stressed expression) ──────────────────────────────────────

const BLAZE_PANIC = [
  [_,  FY, _,  _,  _,  _,  _,  FY, _,  _,  _  ],
  [_,  FO, FO, _,  _,  _,  FO, FO, _,  _,  _  ],
  [_,  FO, FO, FO, FO, FO, FO, FO, _,  _,  _  ],
  [_,  FO, FO, Fo, Fo, Fo, FO, FO, [100,200,255], _,  _  ],
  [_,  FO, W,  W,  Fo, W,  W,  FO, _,  _,  _  ],
  [_,  FO, Bk, W,  Fo, W,  Bk, FO, _,  _,  _  ],
  [_,  _,  FO, dk, dk, dk, FO, _,  _,  _,  _  ],
  [_,  FO, FO, FO, FO, FO, FO, FO, _,  _,  _  ],
  [_,  FR, _,  FO, _,  FO, _,  FR, FY, _,  _  ],
  [_,  _,  _,  _,  _,  _,  _,  FY, FO, FY, _  ],
  [_,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _  ],
  [_,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _  ],
];

// ── Main ───────────────────────────────────────────────────────────────────

console.log('');
renderLayout(BLAZE, STATUS_LINES, 'Chill — Lv.8 Blaze \uD83E\uDDE0');
console.log('');
renderLayout(BLAZE_TALK, STATUS_LINES_2, 'Different emoji frame — \uD83D\uDC40');
console.log('');
renderLayout(BLAZE_PANIC, STATUS_LINES_PANIC, 'Panic mode — 87% rate limit, $40/hr burn');
console.log('');
