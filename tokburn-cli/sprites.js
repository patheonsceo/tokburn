'use strict';
/**
 * sprites.js — Tokemon companion sprite system
 *
 * 9 sprites (3 companions x 3 stages) with 5 expressions each = 135 variants.
 * Zero external dependencies. Sub-5ms render. Pure ANSI truecolor output.
 *
 * Exports:
 *   renderSprite(pixels)  — half-block ANSI renderer, returns array of strings
 *   getSprite(companion, stage, expression) — returns 2D pixel grid
 *   COMPANIONS — ['flint', 'pixel', 'mochi']
 *   EXPRESSIONS — ['normal', 'blink', 'happy', 'stress', 'panic']
 */

// ── ANSI helpers ──────────────────────────────────────────────────────────────

const RESET = '\x1b[0m';
function fg(r, g, b) { return `\x1b[38;2;${r};${g};${b}m`; }
function bg(r, g, b) { return `\x1b[48;2;${r};${g};${b}m`; }

// ── Color palette ─────────────────────────────────────────────────────────────

const _ = null;

// Common
const W  = [255, 255, 255];   // white (eye sclera)
const Bk = [20, 20, 20];      // black (pupils)
const dk = [60, 30, 15];      // dark (mouth)
const Rd = [255, 0, 0];       // red (panic)
const Sw = [100, 200, 255];   // sweat blue

// Flint palette
const FY  = [255, 220, 50];   // bright yellow
const Fy  = [255, 190, 30];   // soft yellow
const FO  = [255, 140, 0];    // orange (body)
const Fo  = [230, 110, 0];    // deep orange
const FR  = [220, 60, 10];    // red
const Fr  = [150, 40, 10];    // dark red
const Fc  = [255, 200, 80];   // warm glow

// Pixel palette
const PC  = [0, 220, 255];    // cyan
const Pc  = [0, 180, 220];    // dark cyan
const PP  = [160, 80, 255];   // purple
const Pp  = [120, 50, 200];   // dark purple  // eslint-disable-line no-unused-vars
const PG  = [0, 255, 120];    // green (LED/eye)
const Pg  = [0, 180, 80];     // dark green  // eslint-disable-line no-unused-vars
const PGy = [80, 80, 100];    // gray (metal)
const Pgy = [55, 55, 75];     // dark gray

// Mochi palette
const MK  = [255, 180, 200];  // pink
const Mk  = [240, 150, 175];  // deep pink
const MW  = [250, 245, 255];  // white-ish body
const Mw  = [235, 225, 245];  // soft body
const MT  = [150, 240, 200];  // mint
const MB  = [40, 40, 60];     // dark (mochi eyes)
const Mb  = [80, 60, 90];     // mochi pupil  // eslint-disable-line no-unused-vars
const MR  = [255, 140, 160];  // blush

// ── Internal helpers ──────────────────────────────────────────────────────────

function clone(px) { return px.map(r => r.slice()); }

/**
 * Apply an expression to a base sprite.
 * eyes: { left: {r,c}, right: {r,c} } -- top-left of each 2x2 eye block
 * mouth: { r, c, w } -- top-left of mouth block (spans 2 rows)
 * expr: expression definition with mouth as 2D array [[row1...], [row2...]]
 */
function applyExpr(base, eyes, mouth, expr, bodyColor, sweatPos) {
  const px = clone(base);

  // Left eye 2x2
  if (expr.lEye === 'closed') {
    const bc = bodyColor;
    const dc = [Math.max(0, bc[0] - 30), Math.max(0, bc[1] - 30), Math.max(0, bc[2] - 10)];
    px[eyes.left.r][eyes.left.c] = bc;
    px[eyes.left.r][eyes.left.c + 1] = bc;
    px[eyes.left.r + 1][eyes.left.c] = dc;
    px[eyes.left.r + 1][eyes.left.c + 1] = dc;
  } else {
    px[eyes.left.r][eyes.left.c] = expr.lEye[0][0];
    px[eyes.left.r][eyes.left.c + 1] = expr.lEye[0][1];
    px[eyes.left.r + 1][eyes.left.c] = expr.lEye[1][0];
    px[eyes.left.r + 1][eyes.left.c + 1] = expr.lEye[1][1];
  }

  // Right eye 2x2
  if (expr.rEye === 'closed') {
    const bc = bodyColor;
    const dc = [Math.max(0, bc[0] - 30), Math.max(0, bc[1] - 30), Math.max(0, bc[2] - 10)];
    px[eyes.right.r][eyes.right.c] = bc;
    px[eyes.right.r][eyes.right.c + 1] = bc;
    px[eyes.right.r + 1][eyes.right.c] = dc;
    px[eyes.right.r + 1][eyes.right.c + 1] = dc;
  } else {
    px[eyes.right.r][eyes.right.c] = expr.rEye[0][0];
    px[eyes.right.r][eyes.right.c + 1] = expr.rEye[0][1];
    px[eyes.right.r + 1][eyes.right.c] = expr.rEye[1][0];
    px[eyes.right.r + 1][eyes.right.c + 1] = expr.rEye[1][1];
  }

  // Mouth -- 2D block: expr.mouth is [[row1_colors], [row2_colors]]
  // Each is `w` wide. null = keep original pixel.
  if (expr.mouth) {
    for (let dy = 0; dy < 2; dy++) {
      if (!expr.mouth[dy]) continue;
      for (let dx = 0; dx < mouth.w; dx++) {
        const color = expr.mouth[dy][dx];
        if (color) {
          px[mouth.r + dy][mouth.c + dx] = color;
        }
      }
    }
  }

  // Sweat drop
  if (expr.sweat && sweatPos) {
    px[sweatPos[0]][sweatPos[1]] = [100, 200, 255];
  }

  return px;
}

// ── Expression definitions ────────────────────────────────────────────────────

function fireExpr() {
  const b = FO;
  const f = Fo;
  return {
    normal: {
      lEye: [[W, W], [W, Bk]],
      rEye: [[W, W], [Bk, W]],
      mouth: [[f, dk, f], [b, b, b]],
    },
    blink: {
      lEye: 'closed', rEye: 'closed',
      mouth: [[f, dk, f], [b, b, b]],
    },
    happy: {
      lEye: [[W, Bk], [Fo, Fo]],
      rEye: [[Bk, W], [Fo, Fo]],
      mouth: [[dk, f, dk], [f, dk, f]],
    },
    stress: {
      lEye: [[W, W], [Bk, W]],
      rEye: [[W, W], [W, Bk]],
      mouth: [[dk, dk, dk], [b, b, b]],
      sweat: true,
    },
    panic: {
      lEye: [[Rd, W], [W, Rd]],
      rEye: [[W, Rd], [Rd, W]],
      mouth: [[dk, dk, dk], [dk, f, dk]],
    },
  };
}

function techExpr() {
  const b = PGy;
  const f = Pgy;
  return {
    normal: {
      lEye: [[PG, PG], [PG, Bk]],
      rEye: [[PG, PG], [Bk, PG]],
      mouth: [[f, Pgy, f], [b, b, b]],
    },
    blink: {
      lEye: 'closed', rEye: 'closed',
      mouth: [[f, Pgy, f], [b, b, b]],
    },
    happy: {
      lEye: [[PG, Bk], [Pgy, Pgy]],
      rEye: [[Bk, PG], [Pgy, Pgy]],
      mouth: [[PG, f, PG], [f, PG, f]],
    },
    stress: {
      lEye: [[PG, PG], [Bk, PG]],
      rEye: [[PG, PG], [PG, Bk]],
      mouth: [[Pgy, Pgy, Pgy], [b, b, b]],
      sweat: true,
    },
    panic: {
      lEye: [[Rd, PGy], [PGy, Rd]],
      rEye: [[PGy, Rd], [Rd, PGy]],
      mouth: [[Rd, Rd, Rd], [Rd, f, Rd]],
    },
  };
}

function mochiExpr() {
  const b = MK;
  const f = Mw;
  return {
    normal: {
      lEye: [[MW, MW], [MW, MB]],
      rEye: [[MW, MW], [MB, MW]],
      mouth: [[f, Mk, f], [b, b, b]],
    },
    blink: {
      lEye: 'closed', rEye: 'closed',
      mouth: [[f, Mk, f], [b, b, b]],
    },
    happy: {
      lEye: [[MW, MB], [MK, MK]],
      rEye: [[MB, MW], [MK, MK]],
      mouth: [[Mk, f, Mk], [f, Mk, f]],
    },
    stress: {
      lEye: [[MW, MW], [MB, MW]],
      rEye: [[MW, MW], [MW, MB]],
      mouth: [[Mk, Mk, Mk], [b, b, b]],
      sweat: true,
    },
    panic: {
      lEye: [[Rd, MW], [MW, Rd]],
      rEye: [[MW, Rd], [Rd, MW]],
      mouth: [[MB, MB, MB], [MB, f, MB]],
    },
  };
}

// ── Sprite data ───────────────────────────────────────────────────────────────

// ═══ FLINT FAMILY (Fire) ═══

// Stage 1: Flint -- flame wisp, teardrop shape
const FLINT_1 = [
  [_, _, _, _, FY, _, _, _, _],
  [_, _, _, FY, Fy, FY, _, _, _],
  [_, _, FY, Fy, Fy, Fy, FY, _, _],
  [_, FO, FO, Fo, Fo, Fo, FO, FO, _],
  [_, FO, W, W, Fo, W, W, FO, _],
  [_, FO, W, Bk, Fo, Bk, W, FO, _],
  [_, FO, FO, Fo, dk, Fo, FO, FO, _],
  [_, _, FO, FO, FO, FO, FO, _, _],
  [_, _, _, FR, _, FR, _, _, _],
  [_, _, _, _, _, _, _, _, _],
  [_, _, _, _, _, _, _, _, _],
  [_, _, _, _, _, _, _, _, _],
];
const F1_EYES = { left: { r: 4, c: 2 }, right: { r: 4, c: 5 } };
const F1_MOUTH = { r: 6, c: 3, w: 3 };
const F1_SWEAT = [3, 8];

// Stage 2: Blaze -- fire fox, pointed ears, tail
const FLINT_2 = [
  [_, FY, _, _, _, _, _, FY, _, _, _],
  [_, FO, FO, _, _, _, FO, FO, _, _, _],
  [_, FO, FO, FO, FO, FO, FO, FO, _, _, _],
  [_, FO, FO, Fo, Fo, Fo, FO, FO, _, _, _],
  [_, FO, W, W, Fo, W, W, FO, _, _, _],
  [_, FO, W, Bk, Fo, Bk, W, FO, _, _, _],
  [_, _, FO, Fo, dk, Fo, FO, _, _, _, _],
  [_, FO, FO, FO, FO, FO, FO, FO, _, _, _],
  [_, FR, _, FO, _, FO, _, FR, FY, _, _],
  [_, _, _, _, _, _, _, FY, FO, FY, _],
  [_, _, _, _, _, _, _, _, _, _, _],
  [_, _, _, _, _, _, _, _, _, _, _],
];
const F2_EYES = { left: { r: 4, c: 2 }, right: { r: 4, c: 5 } };
const F2_MOUTH = { r: 6, c: 3, w: 3 };
const F2_SWEAT = [3, 8];

// Stage 3: Inferno -- fire drake, wings, crown
const FLINT_3 = [
  [_, _, _, FY, FY, FY, FY, FY, _, _, _],
  [_, _, FO, Fc, FO, FO, FO, Fc, FO, _, _],
  [_, _, FO, FO, Fo, Fo, Fo, FO, FO, _, _],
  [_, _, FO, W, W, Fo, W, W, FO, _, _],
  [_, _, FO, W, Bk, Fo, Bk, W, FO, _, _],
  [FY, _, _, FO, Fo, dk, Fo, FO, _, _, FY],
  [FO, FY, _, FO, FO, Fc, FO, FO, _, FY, FO],
  [_, FO, _, _, FO, FO, FO, _, _, FO, _],
  [_, _, _, FR, FR, _, FR, FR, _, _, _],
  [_, _, _, Fr, _, _, _, Fr, _, _, _],
  [_, _, _, _, _, _, _, _, _, _, _],
  [_, _, _, _, _, _, _, _, _, _, _],
];
const F3_EYES = { left: { r: 3, c: 3 }, right: { r: 3, c: 6 } };
const F3_MOUTH = { r: 5, c: 4, w: 3 };
const F3_SWEAT = [2, 9];

// ═══ PIXEL FAMILY (Tech) ═══

// Stage 1: Pixel -- digital cube, one big eye, antenna
const PIXEL_1 = [
  [_, _, _, _, PG, _, _, _, _],
  [_, _, _, _, Pc, _, _, _, _],
  [_, _, PC, PGy, PGy, PGy, PC, _, _],
  [_, _, PGy, PGy, PGy, PGy, PGy, _, _],
  [_, _, PGy, PG, PG, PG, PGy, _, _],
  [_, _, PGy, PG, Bk, PG, PGy, _, _],
  [_, _, PGy, PGy, Pgy, PGy, PGy, _, _],
  [_, _, PC, PGy, PGy, PGy, PC, _, _],
  [_, _, _, Pc, _, Pc, _, _, _],
  [_, _, _, _, _, _, _, _, _],
  [_, _, _, _, _, _, _, _, _],
  [_, _, _, _, _, _, _, _, _],
];
const P1_EYES = { left: { r: 4, c: 3 }, right: { r: 4, c: 3 } };
const P1_MOUTH = { r: 6, c: 3, w: 3 };
const P1_SWEAT = [2, 7];

// Stage 2: Codec -- robot head, dual LED eyes, arms
const PIXEL_2 = [
  [_, _, _, PG, PG, _, _, _, _, _, _],
  [_, _, _, _, PP, _, _, _, _, _, _],
  [_, PC, PGy, PGy, PGy, PGy, PGy, PC, _, _, _],
  [_, PGy, PGy, PGy, PGy, PGy, PGy, PGy, _, _, _],
  [_, PGy, PG, PG, PGy, PG, PG, PGy, _, _, _],
  [_, PGy, PG, Bk, PGy, Bk, PG, PGy, _, _, _],
  [_, PGy, PGy, PGy, Pgy, PGy, PGy, PGy, _, _, _],
  [PP, _, PC, PGy, PGy, PGy, PC, _, PP, _, _],
  [_, _, _, Pc, _, Pc, _, _, _, _, _],
  [_, _, _, _, _, _, _, _, _, _, _],
  [_, _, _, _, _, _, _, _, _, _, _],
  [_, _, _, _, _, _, _, _, _, _, _],
];
const P2_EYES = { left: { r: 4, c: 2 }, right: { r: 4, c: 5 } };
const P2_MOUTH = { r: 6, c: 3, w: 3 };
const P2_SWEAT = [3, 8];

// Stage 3: Daemon -- cyber entity, visor, data wings
const PIXEL_3 = [
  [_, _, _, _, PP, PC, PP, _, _, _, _],
  [_, _, _, PP, PC, PC, PC, PP, _, _, _],
  [_, _, PGy, PGy, PGy, PGy, PGy, PGy, PGy, _, _],
  [_, _, PGy, PG, PG, PG, PG, PG, PGy, _, _],
  [_, _, PGy, PG, Bk, PGy, Bk, PG, PGy, _, _],
  [PC, _, _, PGy, PGy, Pgy, PGy, PGy, _, _, PC],
  [PP, PC, _, PGy, PGy, PC, PGy, PGy, _, PC, PP],
  [_, PP, _, _, Pc, PGy, Pc, _, _, PP, _],
  [_, _, _, Pc, _, _, _, Pc, _, _, _],
  [_, _, _, _, _, _, _, _, _, _, _],
  [_, _, _, _, _, _, _, _, _, _, _],
  [_, _, _, _, _, _, _, _, _, _, _],
];
const P3_EYES = { left: { r: 3, c: 3 }, right: { r: 3, c: 6 } };
const P3_MOUTH = { r: 5, c: 4, w: 3 };
const P3_SWEAT = [2, 9];

// ═══ MOCHI FAMILY (Nature) ═══

// Stage 1: Mochi -- round blob, huge dewy eyes, tiny nub feet, blush
const MOCHI_1 = [
  [_, _, _, _, _, _, _, _, _],
  [_, _, MK, MW, MW, MW, MK, _, _],
  [_, MK, MW, MW, MW, MW, MW, MK, _],
  [_, MK, MW, MW, MW, MW, MW, MK, _],
  [_, MK, MW, MW, Mw, MW, MW, MK, _],
  [_, MK, MW, MB, Mw, MB, MW, MK, _],
  [_, MR, MK, Mw, Mk, Mw, MK, MR, _],
  [_, _, MK, MK, MK, MK, MK, _, _],
  [_, _, _, Mk, _, Mk, _, _, _],
  [_, _, _, _, _, _, _, _, _],
  [_, _, _, _, _, _, _, _, _],
  [_, _, _, _, _, _, _, _, _],
];
const M1_EYES = { left: { r: 4, c: 2 }, right: { r: 4, c: 5 } };
const M1_MOUTH = { r: 6, c: 3, w: 3 };
const M1_SWEAT = [2, 8];

// Stage 2: Puff -- cloud-cat, ears, fluffy, tail
const MOCHI_2 = [
  [_, MK, _, _, _, _, _, MK, _, _, _],
  [_, MW, MK, MW, MW, MW, MK, MW, _, _, _],
  [_, MK, MW, MW, MW, MW, MW, MK, _, _, _],
  [_, MK, MW, MW, MW, MW, MW, MK, _, _, _],
  [_, MK, MW, MW, Mw, MW, MW, MK, _, _, _],
  [_, MK, MW, MB, Mw, MB, MW, MK, _, _, _],
  [MW, MR, MK, Mw, Mk, Mw, MK, MR, MW, _, _],
  [_, _, MK, MK, MK, MK, MK, _, Mk, _, _],
  [_, _, _, Mk, _, Mk, _, _, MK, _, _],
  [_, _, _, _, _, _, _, _, _, _, _],
  [_, _, _, _, _, _, _, _, _, _, _],
  [_, _, _, _, _, _, _, _, _, _, _],
];
const M2_EYES = { left: { r: 4, c: 2 }, right: { r: 4, c: 5 } };
const M2_MOUTH = { r: 6, c: 3, w: 3 };
const M2_SWEAT = [2, 8];

// Stage 3: Nimbus -- storm spirit, flowing mane, lightning, majestic
const MOCHI_3 = [
  [_, MW, MK, _, _, _, _, MK, MW, _, _],
  [MW, MK, MW, MK, MW, MW, MK, MW, MK, MW, _],
  [_, MK, MW, MW, MW, MW, MW, MW, MK, _, _],
  [_, MK, MW, MW, MW, MW, MW, MW, MK, _, _],
  [_, MK, MT, MW, MW, MW, MW, MT, MK, _, _],
  [_, MK, MW, MB, Mw, Mw, MB, MW, MK, _, _],
  [MT, MK, MK, Mw, Mw, Mk, Mw, Mw, MK, MK, MT],
  [_, _, Mk, MK, MK, MK, MK, MK, Mk, _, _],
  [_, _, FY, Mk, _, _, _, Mk, FY, _, _],
  [_, _, _, _, _, _, _, _, _, _, _],
  [_, _, _, _, _, _, _, _, _, _, _],
  [_, _, _, _, _, _, _, _, _, _, _],
];
const M3_EYES = { left: { r: 4, c: 2 }, right: { r: 4, c: 6 } };
const M3_MOUTH = { r: 6, c: 4, w: 3 };
const M3_SWEAT = [2, 9];

// ── Pixel Stage 1 special handling (single big eye) ───────────────────────────

function pixelS1Expr(base, exprName) {
  const px = clone(base);
  const eR1 = 4, eR2 = 5;

  switch (exprName) {
    case 'normal':
      px[eR1][3] = PG; px[eR1][4] = PG; px[eR1][5] = PG;
      px[eR2][3] = PG; px[eR2][4] = Bk; px[eR2][5] = PG;
      px[6][3] = Pgy; px[6][4] = Pgy; px[6][5] = Pgy;
      px[7][3] = PGy; px[7][4] = PGy; px[7][5] = PGy;
      break;
    case 'blink':
      px[eR1][3] = PGy; px[eR1][4] = PGy; px[eR1][5] = PGy;
      px[eR2][3] = Pgy; px[eR2][4] = Pgy; px[eR2][5] = Pgy;
      px[6][3] = Pgy; px[6][4] = Pgy; px[6][5] = Pgy;
      px[7][3] = PGy; px[7][4] = PGy; px[7][5] = PGy;
      break;
    case 'happy':
      px[eR1][3] = PG; px[eR1][4] = Bk; px[eR1][5] = PG;
      px[eR2][3] = Pgy; px[eR2][4] = Pgy; px[eR2][5] = Pgy;
      px[6][3] = PG; px[6][4] = Pgy; px[6][5] = PG;
      px[7][3] = Pgy; px[7][4] = PG; px[7][5] = Pgy;
      break;
    case 'stress':
      px[eR1][3] = PG; px[eR1][4] = PG; px[eR1][5] = PG;
      px[eR2][3] = PG; px[eR2][4] = PG; px[eR2][5] = Bk;
      px[6][3] = Pgy; px[6][4] = Pgy; px[6][5] = Pgy;
      px[7][3] = PGy; px[7][4] = PGy; px[7][5] = PGy;
      px[P1_SWEAT[0]][P1_SWEAT[1]] = Sw;
      break;
    case 'panic':
      px[eR1][3] = Rd; px[eR1][4] = PGy; px[eR1][5] = Rd;
      px[eR2][3] = PGy; px[eR2][4] = Rd; px[eR2][5] = PGy;
      px[6][3] = Rd; px[6][4] = Rd; px[6][5] = Rd;
      px[7][3] = Rd; px[7][4] = Pgy; px[7][5] = Rd;
      break;
  }
  return px;
}

// ── Sprite lookup tables ──────────────────────────────────────────────────────

const SPRITE_DATA = {
  flint: [
    { base: FLINT_1, eyes: F1_EYES, mouth: F1_MOUTH, sweat: F1_SWEAT },
    { base: FLINT_2, eyes: F2_EYES, mouth: F2_MOUTH, sweat: F2_SWEAT },
    { base: FLINT_3, eyes: F3_EYES, mouth: F3_MOUTH, sweat: F3_SWEAT },
  ],
  pixel: [
    { base: PIXEL_1, eyes: P1_EYES, mouth: P1_MOUTH, sweat: P1_SWEAT },
    { base: PIXEL_2, eyes: P2_EYES, mouth: P2_MOUTH, sweat: P2_SWEAT },
    { base: PIXEL_3, eyes: P3_EYES, mouth: P3_MOUTH, sweat: P3_SWEAT },
  ],
  mochi: [
    { base: MOCHI_1, eyes: M1_EYES, mouth: M1_MOUTH, sweat: M1_SWEAT },
    { base: MOCHI_2, eyes: M2_EYES, mouth: M2_MOUTH, sweat: M2_SWEAT },
    { base: MOCHI_3, eyes: M3_EYES, mouth: M3_MOUTH, sweat: M3_SWEAT },
  ],
};

const BODY_COLORS = {
  flint: FO,
  pixel: PGy,
  mochi: MK,
};

const EXPR_FNS = {
  flint: fireExpr,
  pixel: techExpr,
  mochi: mochiExpr,
};

// ── Public API ────────────────────────────────────────────────────────────────

const COMPANIONS = ['flint', 'pixel', 'mochi'];
const EXPRESSIONS = ['normal', 'blink', 'happy', 'stress', 'panic'];

/**
 * Half-block ANSI truecolor renderer.
 * Takes a 2D pixel grid and returns an array of strings (one per terminal row).
 * Pads to exactly 6 terminal rows (12 pixel rows).
 */
function renderSprite(pixels) {
  // Pad to 12 pixel rows for exactly 6 terminal rows
  const padded = pixels.slice();
  const width = padded[0].length;
  while (padded.length < 12) {
    padded.push(new Array(width).fill(null));
  }

  // First pass: check which columns ever have colored pixels.
  // Use this to know the sprite's "occupied" columns for consistent padding.
  const height = padded.length;
  const rows = [];
  // Near-invisible block for empty cells — prevents whitespace stripping
  // and guarantees consistent character width across all rows
  const EMPTY_CELL = fg(15, 15, 20) + '\u2580' + RESET;
  for (let y = 0; y < height; y += 2) {
    let row = '';
    for (let x = 0; x < width; x++) {
      const top = padded[y] ? padded[y][x] : null;
      const bot = (y + 1 < height && padded[y + 1]) ? padded[y + 1][x] : null;
      if (!top && !bot) { row += EMPTY_CELL; }
      else if (top && !bot) { row += fg(top[0], top[1], top[2]) + '\u2580' + RESET; }
      else if (!top && bot) { row += fg(bot[0], bot[1], bot[2]) + '\u2584' + RESET; }
      else { row += bg(top[0], top[1], top[2]) + fg(bot[0], bot[1], bot[2]) + '\u2584' + RESET; }
    }
    rows.push(row);
  }
  return rows;
}

/**
 * Get a sprite pixel grid for a companion at a given stage with an expression.
 * Returns a 2D array of [r,g,b] or null pixels (NOT rendered).
 */
function getSprite(companion, stage, expression) {
  const data = SPRITE_DATA[companion];
  if (!data) throw new Error(`Unknown companion: ${companion}`);
  const stageData = data[stage - 1];
  if (!stageData) throw new Error(`Unknown stage ${stage} for ${companion}`);
  if (!EXPRESSIONS.includes(expression)) throw new Error(`Unknown expression: ${expression}`);

  // Pixel stage 1 has a single big eye -- special handler
  if (companion === 'pixel' && stage === 1) {
    return pixelS1Expr(stageData.base, expression);
  }

  const exprDefs = EXPR_FNS[companion]();
  const expr = exprDefs[expression];
  return applyExpr(stageData.base, stageData.eyes, stageData.mouth, expr, BODY_COLORS[companion], stageData.sweat);
}

module.exports = { renderSprite, getSprite, COMPANIONS, EXPRESSIONS };
