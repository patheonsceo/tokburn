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

  // Mouth -- 2D block: expr.mouth is [[row1_colors], [row2_colors], ...]
  // Each is `w` wide. null = keep original pixel.
  if (expr.mouth) {
    for (let dy = 0; dy < expr.mouth.length; dy++) {
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

function flintS1Expr() {
  // Baby flame — big innocent eyes, round face, w=5 mouth
  const b = FO;  // body
  const f = Fo;  // face detail
  return {
    normal: {
      lEye: [[W, W], [W, Bk]],                     // pupils inward (innocent)
      rEye: [[W, W], [Bk, W]],
      mouth: [[f, f, dk, f, f], [b, b, f, b, b], [b, b, b, b, b]],
    },
    blink: {
      lEye: 'closed', rEye: 'closed',
      mouth: [[f, f, dk, f, f], [b, b, f, b, b], [b, b, b, b, b]],
    },
    happy: {
      lEye: [[W, Bk], [f, f]],                     // ^_^ squint
      rEye: [[Bk, W], [f, f]],
      mouth: [[dk, f, f, f, dk], [f, dk, dk, dk, f], [b, b, b, b, b]],  // ∪ corners UP, wide bottom curve
    },
    stress: {
      lEye: [[W, W], [Bk, W]],                     // looking away
      rEye: [[W, W], [W, Bk]],
      mouth: [[f, dk, dk, dk, f], [b, b, b, b, b], [b, b, b, b, b]],  // ― flat worried
      sweat: true,
    },
    panic: {
      lEye: [[Rd, W], [W, Rd]],                    // X eyes
      rEye: [[W, Rd], [Rd, W]],
      mouth: [[b, dk, dk, dk, b], [b, dk, f, dk, b], [b, dk, dk, dk, b]],  // O scream
    },
  };
}

function flintS2Expr() {
  // Fire fox — w=5 mouth. Normal=forward gaze, Stress=outer pupils (shifty)
  const b = FO;
  const f = Fo;
  return {
    normal: {
      lEye: [[W, W], [W, Bk]],                     // forward/inward gaze (calm)
      rEye: [[W, W], [Bk, W]],
      mouth: [[f, f, dk, f, f], [b, b, f, b, b], [b, b, b, b, b]],
    },
    blink: {
      lEye: 'closed', rEye: 'closed',
      mouth: [[f, f, dk, f, f], [b, b, f, b, b], [b, b, b, b, b]],
    },
    happy: {
      lEye: [[W, Bk], [f, f]],                     // squint grin
      rEye: [[Bk, W], [f, f]],
      mouth: [[dk, f, f, f, dk], [f, dk, dk, dk, f], [b, b, b, b, b]],  // ∪ corners UP, wide bottom
    },
    stress: {
      lEye: [[W, W], [Bk, W]],                     // outer pupils (looking away nervously)
      rEye: [[W, W], [W, Bk]],
      mouth: [[f, dk, dk, dk, f], [b, b, b, b, b], [b, b, b, b, b]],  // ― flat
      sweat: true,
    },
    panic: {
      lEye: [[Rd, W], [W, Rd]],                    // X eyes
      rEye: [[W, Rd], [Rd, W]],
      mouth: [[b, dk, dk, dk, b], [b, dk, f, dk, b], [b, dk, dk, dk, b]],  // O scream
    },
  };
}

function flintS3Expr() {
  // Fire drake — wide jaw, mouth at r5. Core (Fc) preserved in normal/blink.
  const b = FO;
  const f = Fo;
  return {
    normal: {
      lEye: [[W, W], [W, Bk]],                     // composed forward gaze
      rEye: [[W, W], [Bk, W]],
      mouth: [[f, f, dk, f, f], [b, b, Fc, b, b], [b, b, b, b, b]],   // small mouth + core
    },
    blink: {
      lEye: 'closed', rEye: 'closed',
      mouth: [[f, f, dk, f, f], [b, b, Fc, b, b], [b, b, b, b, b]],
    },
    happy: {
      lEye: [[W, Bk], [f, f]],                     // softened
      rEye: [[Bk, W], [f, f]],
      mouth: [[dk, f, f, f, dk], [f, dk, dk, dk, f], [b, b, b, b, b]],  // ∪ wide smile
    },
    stress: {
      lEye: [[W, W], [Bk, W]],                     // scanning
      rEye: [[W, W], [W, Bk]],
      mouth: [[f, dk, dk, dk, f], [b, b, b, b, b], [b, b, b, b, b]],  // ― tense
      sweat: true,
    },
    panic: {
      lEye: [[Rd, W], [W, Rd]],                    // red X eyes
      rEye: [[W, Rd], [Rd, W]],
      mouth: [[b, dk, dk, dk, b], [b, dk, f, dk, b], [b, dk, dk, dk, b]],  // roar O
    },
  };
}

function pixelS2Expr() {
  // Robot with dual LED eyes, w=5 mouth. Green LED smile, red alert panic.
  const b = PGy;
  const f = Pgy;
  return {
    normal: {
      lEye: [[PG, PG], [PG, Bk]],
      rEye: [[PG, PG], [Bk, PG]],
      mouth: [[b, f, f, f, b], [b, b, b, b, b], [b, b, b, b, b]],
    },
    blink: {
      lEye: 'closed', rEye: 'closed',
      mouth: [[b, f, f, f, b], [b, b, b, b, b], [b, b, b, b, b]],
    },
    happy: {
      lEye: [[PG, Bk], [f, f]],
      rEye: [[Bk, PG], [f, f]],
      mouth: [[b, b, b, b, b], [PG, b, b, b, PG], [b, PG, PG, PG, b]],  // green LED ∪ (low)
    },
    stress: {
      lEye: [[PG, PG], [Bk, PG]],                   // shifting
      rEye: [[PG, PG], [PG, Bk]],
      mouth: [[b, f, f, f, b], [b, b, b, b, b], [b, b, b, b, b]],
      sweat: true,
    },
    panic: {
      lEye: [[Rd, PGy], [PGy, Rd]],                 // red X
      rEye: [[PGy, Rd], [Rd, PGy]],
      mouth: [[b, Rd, Rd, Rd, b], [b, Rd, f, Rd, b], [b, Rd, Rd, Rd, b]],  // red O alert
    },
  };
}

function pixelS3Expr() {
  // Cyber entity — visor eyes, energy core preserved in normal. Green smile, red panic.
  const b = PGy;
  const f = Pgy;
  return {
    normal: {
      lEye: [[PG, PG], [PG, Bk]],
      rEye: [[PG, PG], [Bk, PG]],
      mouth: [[b, f, f, f, b], [b, b, PC, b, b], [b, b, b, b, b]],   // energy core
    },
    blink: {
      lEye: 'closed', rEye: 'closed',
      mouth: [[b, f, f, f, b], [b, b, PC, b, b], [b, b, b, b, b]],
    },
    happy: {
      lEye: [[PG, Bk], [f, f]],
      rEye: [[Bk, PG], [f, f]],
      mouth: [[b, b, b, b, b], [PG, b, b, b, PG], [b, PG, PG, PG, b]],  // green LED ∪ (low)
    },
    stress: {
      lEye: [[PG, PG], [Bk, PG]],
      rEye: [[PG, PG], [PG, Bk]],
      mouth: [[b, f, f, f, b], [b, b, b, b, b], [b, b, b, b, b]],
      sweat: true,
    },
    panic: {
      lEye: [[Rd, PGy], [PGy, Rd]],
      rEye: [[PGy, Rd], [Rd, PGy]],
      mouth: [[b, Rd, Rd, Rd, b], [b, Rd, f, Rd, b], [b, Rd, Rd, Rd, b]],
    },
  };
}

function mochiS1Expr() {
  // Round blob — huge dewy inward-looking eyes, pink smile
  const b = MK;   // border/body
  const f = Mw;   // face skin
  const d = Mk;   // mouth dark (deep pink)
  return {
    normal: {
      lEye: [[MW, MW], [MW, MB]],                    // inward pupils (cute)
      rEye: [[MW, MW], [MB, MW]],
      mouth: [[f, f, d, f, f], [b, b, b, b, b], [b, b, b, b, b]],
    },
    blink: {
      lEye: 'closed', rEye: 'closed',
      mouth: [[f, f, d, f, f], [b, b, b, b, b], [b, b, b, b, b]],
    },
    happy: {
      lEye: [[MW, MB], [MK, MK]],                   // ^_^ squint
      rEye: [[MB, MW], [MK, MK]],
      mouth: [[d, f, f, f, d], [f, d, d, d, f], [b, b, b, b, b]],  // pink ∪ smile
    },
    stress: {
      lEye: [[MW, MW], [MB, MW]],                    // looking away
      rEye: [[MW, MW], [MW, MB]],
      mouth: [[f, d, d, d, f], [b, b, b, b, b], [b, b, b, b, b]],
      sweat: true,
    },
    panic: {
      lEye: [[Rd, MW], [MW, Rd]],                   // X eyes
      rEye: [[MW, Rd], [Rd, MW]],
      mouth: [[b, d, d, d, b], [b, d, f, d, b], [b, d, d, d, b]],
    },
  };
}

function mochiS2Expr() {
  // Cloud-cat — same eye style, pink smile
  const b = MK;
  const f = Mw;
  const d = Mk;
  return {
    normal: {
      lEye: [[MW, MW], [MW, MB]],
      rEye: [[MW, MW], [MB, MW]],
      mouth: [[f, f, d, f, f], [b, b, b, b, b], [b, b, b, b, b]],
    },
    blink: {
      lEye: 'closed', rEye: 'closed',
      mouth: [[f, f, d, f, f], [b, b, b, b, b], [b, b, b, b, b]],
    },
    happy: {
      lEye: [[MW, MB], [MK, MK]],
      rEye: [[MB, MW], [MK, MK]],
      mouth: [[d, f, f, f, d], [f, d, d, d, f], [b, b, b, b, b]],  // pink ∪
    },
    stress: {
      lEye: [[MW, MW], [MB, MW]],
      rEye: [[MW, MW], [MW, MB]],
      mouth: [[f, d, d, d, f], [b, b, b, b, b], [b, b, b, b, b]],
      sweat: true,
    },
    panic: {
      lEye: [[Rd, MW], [MW, Rd]],
      rEye: [[MW, Rd], [Rd, MW]],
      mouth: [[b, d, d, d, b], [b, d, f, d, b], [b, d, d, d, b]],
    },
  };
}

function mochiS3Expr() {
  // Storm spirit — elegant eyes, mint mouth accents possible
  const b = MK;
  const f = Mw;
  const d = Mk;
  return {
    normal: {
      lEye: [[MW, MW], [MW, MB]],
      rEye: [[MW, MW], [MB, MW]],
      mouth: [[f, f, d, f, f], [b, b, b, b, b], [b, b, b, b, b]],
    },
    blink: {
      lEye: 'closed', rEye: 'closed',
      mouth: [[f, f, d, f, f], [b, b, b, b, b], [b, b, b, b, b]],
    },
    happy: {
      lEye: [[MW, MB], [MK, MK]],
      rEye: [[MB, MW], [MK, MK]],
      mouth: [[d, f, f, f, d], [f, d, d, d, f], [b, b, b, b, b]],  // pink ∪
    },
    stress: {
      lEye: [[MW, MW], [MB, MW]],
      rEye: [[MW, MW], [MW, MB]],
      mouth: [[f, d, d, d, f], [b, b, b, b, b], [b, b, b, b, b]],
      sweat: true,
    },
    panic: {
      lEye: [[Rd, MW], [MW, Rd]],
      rEye: [[MW, Rd], [Rd, MW]],
      mouth: [[b, d, d, d, b], [b, d, f, d, b], [b, d, d, d, b]],
    },
  };
}

// ── Sprite data ───────────────────────────────────────────────────────────────

// ═══ FLINT FAMILY (Fire) ═══

// Stage 1: Flint — baby flame spirit, round teardrop, big innocent eyes
const FLINT_1 = [
  [_,  _,  _,  _,  _,  FY, _,  _,  _,  _,  _  ],  // 0: flame tip
  [_,  _,  _,  _,  FY, Fy, FY, _,  _,  _,  _  ],  // 1: flame
  [_,  _,  _,  FY, Fy, Fy, Fy, FY, _,  _,  _  ],  // 2: flame base
  [_,  _,  FO, FO, Fo, Fo, Fo, FO, FO, _,  _  ],  // 3: forehead
  [_,  FO, FO, W,  W,  Fo, W,  W,  FO, FO, _  ],  // 4: eyes top
  [_,  FO, FO, W,  Bk, Fo, Bk, W,  FO, FO, _  ],  // 5: eyes bot
  [_,  FO, FO, Fo, Fo, Fo, Fo, Fo, FO, FO, _  ],  // 6: cheeks (gap row)
  [_,  FO, FO, Fo, Fo, dk, Fo, Fo, FO, FO, _  ],  // 7: mouth row 1
  [_,  FO, FO, FO, FO, Fo, FO, FO, FO, FO, _  ],  // 8: mouth row 2
  [_,  _,  FO, FO, FO, FO, FO, FO, FO, _,  _  ],  // 9: mouth row 3 / belly
  [_,  _,  _,  _,  FR, _,  FR, _,  _,  _,  _  ],  // 10: ember feet
  [_,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _  ],  // 11:
];
const F1_EYES = { left: { r: 4, c: 3 }, right: { r: 4, c: 6 } };
const F1_MOUTH = { r: 7, c: 3, w: 5 };
const F1_SWEAT = [3, 9];

// Stage 2: Blaze — fire fox, pointed ears, sly eyes, flame tail
const FLINT_2 = [
  [_,  _,  FY, _,  _,  _,  _,  _,  FY, _,  _  ],  // 0: flame ear tips
  [_,  FO, FO, _,  _,  _,  _,  _,  FO, FO, _  ],  // 1: ears
  [_,  FO, FO, FO, FO, FO, FO, FO, FO, FO, _  ],  // 2: head (connects ears)
  [_,  _,  FO, Fo, Fo, Fo, Fo, Fo, FO, _,  _  ],  // 3: upper face
  [_,  _,  FO, W,  W,  Fo, W,  W,  FO, _,  _  ],  // 4: eyes top
  [_,  _,  FO, Bk, W,  Fo, W,  Bk, FO, _,  _  ],  // 5: eyes bot (outer pupils = sly)
  [_,  _,  FO, Fo, Fo, Fo, Fo, Fo, FO, _,  _  ],  // 6: cheeks
  [_,  _,  FO, Fo, Fo, dk, Fo, Fo, FO, _,  _  ],  // 7: wider snout mouth r1
  [_,  _,  FO, FO, FO, Fo, FO, FO, FO, _,  _  ],  // 8: chest / mouth r2
  [_,  _,  FO, FO, FO, FO, FO, FO, FO, _,  _  ],  // 9: body / mouth r3
  [_,  _,  FR, _,  FO, _,  FO, _,  FY, FO, _  ],  // 10: legs + tail
  [_,  _,  _,  _,  _,  _,  _,  FY, FO, FY, _  ],  // 11: tail flame
];
const F2_EYES = { left: { r: 4, c: 3 }, right: { r: 4, c: 6 } };
const F2_MOUTH = { r: 7, c: 3, w: 5 };
const F2_SWEAT = [3, 9];

// Stage 3: Inferno — fire drake, wings spread UP wide, narrows to tail
const FLINT_3 = [
  [FY, _,  _,  FY, Fc, Fc, Fc, FY, _,  _,  FY ],  // 0: flame horns + wide glowing crown
  [FO, FY, FO, FO, FO, FO, FO, FO, FO, FY, FO ],  // 1: wings spread + head (FULL 11!)
  [FO, Fc, FO, Fo, Fo, Fo, Fo, Fo, FO, Fc, FO ],  // 2: wing membrane + face (11!)
  [_,  FO, FO, W,  W,  Fo, W,  W,  FO, FO, _  ],  // 3: eyes top (9 wide head)
  [_,  FO, FO, W,  Bk, Fo, Bk, W,  FO, FO, _  ],  // 4: eyes bot
  [_,  _,  FO, Fo, Fo, dk, Fo, Fo, FO, _,  _  ],  // 5: snout (7 wide) mouth r1
  [_,  _,  FO, FO, FO, Fc, FO, FO, FO, _,  _  ],  // 6: chest + core (7 wide) mouth r2
  [_,  _,  FR, FO, FO, FO, FO, FO, FR, _,  _  ],  // 7: armored body (7 wide) mouth r3
  [_,  _,  _,  FR, FO, FO, FO, FR, _,  _,  _  ],  // 8: legs (5 wide)
  [_,  _,  _,  Fr, _,  FO, _,  Fr, _,  _,  _  ],  // 9: claws + tail root
  [_,  _,  _,  _,  _,  FR, _,  _,  _,  _,  _  ],  // 10: tail
  [_,  _,  _,  _,  _,  FY, _,  _,  _,  _,  _  ],  // 11: tail flame
];
const F3_EYES = { left: { r: 3, c: 3 }, right: { r: 3, c: 6 } };
const F3_MOUTH = { r: 5, c: 3, w: 5 };
const F3_SWEAT = [2, 9];

// ═══ PIXEL FAMILY (Tech) ═══

// Stage 1: Pixel — boxy robot, cyan frame, single big eye, antenna
const PIXEL_1 = [
  [_,  _,  _,  _,  _,  PG, _,  _,  _,  _,  _  ],  // 0: antenna LED
  [_,  _,  _,  _,  PC, Pc, PC, _,  _,  _,  _  ],  // 1: antenna base plate
  [_,  PC, PC, PGy,PGy,PGy,PGy,PGy,PC, PC, _  ],  // 2: FLAT TOP frame (9 wide)
  [_,  PC, PGy,PGy,PGy,PGy,PGy,PGy,PGy,PC, _  ],  // 3: head interior
  [_,  PC, PGy,PG, PG, PG, PGy,PGy,PGy,PC, _  ],  // 4: single eye top (3-wide, left side)
  [_,  PC, PGy,PG, Bk, PG, PGy,PGy,PGy,PC, _  ],  // 5: single eye bot
  [_,  PC, PGy,PGy,Pgy,Pgy,Pgy,PGy,PGy,PC, _  ],  // 6: speaker grill / mouth r1
  [_,  PC, PGy,PGy,PGy,PGy,PGy,PGy,PGy,PC, _  ],  // 7: body / mouth r2
  [_,  PC, PGy,PGy,PGy,PGy,PGy,PGy,PGy,PC, _  ],  // 8: body / mouth r3
  [_,  PC, PC, PGy,PGy,PGy,PGy,PGy,PC, PC, _  ],  // 9: FLAT BOTTOM frame
  [_,  _,  _,  _,  Pc, _,  Pc, _,  _,  _,  _  ],  // 10: plug feet
  [_,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _  ],  // 11:
];
const P1_EYES = { left: { r: 4, c: 3 }, right: { r: 4, c: 3 } };
const P1_MOUTH = { r: 6, c: 3, w: 5 };
const P1_SWEAT = [2, 9];

// Stage 2: Codec — robot head, dual LED eyes, arms, flat frame
const PIXEL_2 = [
  [_,  _,  _,  _,  PG, PG, PG, _,  _,  _,  _  ],  // 0: triple antenna LED
  [_,  _,  _,  _,  _,  PP, _,  _,  _,  _,  _  ],  // 1: antenna shaft
  [_,  PC, PC, PGy,PGy,PGy,PGy,PGy,PC, PC, _  ],  // 2: flat top frame
  [_,  PC, PGy,PGy,PGy,PGy,PGy,PGy,PGy,PC, _  ],  // 3: head
  [_,  PC, PGy,PG, PG, PGy,PG, PG, PGy,PC, _  ],  // 4: dual LED eyes top
  [_,  PC, PGy,PG, Bk, PGy,Bk, PG, PGy,PC, _  ],  // 5: dual LED eyes bot
  [_,  PC, PGy,PGy,Pgy,Pgy,Pgy,PGy,PGy,PC, _  ],  // 6: speaker / mouth r1
  [_,  PC, PGy,PGy,PGy,PGy,PGy,PGy,PGy,PC, _  ],  // 7: body / mouth r2
  [PP, PC, PGy,PGy,PGy,PGy,PGy,PGy,PGy,PC, PP ],  // 8: arms + body / mouth r3
  [_,  PC, PC, PGy,PGy,PGy,PGy,PGy,PC, PC, _  ],  // 9: flat bottom
  [_,  _,  _,  _,  Pc, _,  Pc, _,  _,  _,  _  ],  // 10: plug feet
  [_,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _  ],  // 11:
];
const P2_EYES = { left: { r: 4, c: 3 }, right: { r: 4, c: 6 } };
const P2_MOUTH = { r: 6, c: 3, w: 5 };
const P2_SWEAT = [3, 9];

// Stage 3: Daemon — cyber entity, visor, data wings spread UP wide
const PIXEL_3 = [
  [_,  _,  _,  PP, PC, PC, PC, PP, _,  _,  _  ],  // 0: energy crest
  [_,  _,  PP, PC, PGy,PGy,PGy,PC, PP, _,  _  ],  // 1: crest base + head
  [_,  _,  PGy,PGy,PGy,PGy,PGy,PGy,PGy,_,  _  ],  // 2: face
  [_,  _,  PGy,PG, PG, PG, PG, PG, PGy,_,  _  ],  // 3: visor top (5-wide LED band)
  [_,  _,  PGy,PG, Bk, PGy,Bk, PG, PGy,_,  _  ],  // 4: visor bot
  [_,  _,  PGy,PGy,Pgy,Pgy,Pgy,PGy,PGy,_,  _  ],  // 5: mouth r1
  [PC, PP, PGy,PGy,PGy,PC, PGy,PGy,PGy,PP, PC ],  // 6: data wings + core / mouth r2
  [PP, PC, PGy,PGy,PGy,PGy,PGy,PGy,PGy,PC, PP ],  // 7: data wings + body / mouth r3
  [_,  PP, _,  PGy,PGy,PGy,PGy,PGy,_,  PP, _  ],  // 8: wing tips + body
  [_,  _,  _,  Pc, PGy,PGy,PGy,Pc, _,  _,  _  ],  // 9: narrowing
  [_,  _,  _,  _,  Pc, _,  Pc, _,  _,  _,  _  ],  // 10: feet
  [_,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _  ],  // 11:
];
const P3_EYES = { left: { r: 3, c: 3 }, right: { r: 3, c: 6 } };
const P3_MOUTH = { r: 5, c: 3, w: 5 };
const P3_SWEAT = [2, 9];

// ═══ MOCHI FAMILY (Nature) ═══

// Stage 1: Mochi — perfectly round blob, HUGE dewy eyes, blush, nub feet
const MOCHI_1 = [
  [_,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _  ],  // 0:
  [_,  _,  _,  MK, MW, MW, MW, MK, _,  _,  _  ],  // 1: top (5 wide)
  [_,  _,  MK, MW, MW, MW, MW, MW, MK, _,  _  ],  // 2: head widens (7 wide)
  [_,  MK, MW, MW, MW, MW, MW, MW, MW, MK, _  ],  // 3: full round (9 wide)
  [_,  MK, MW, MW, MW, Mw, MW, MW, MW, MK, _  ],  // 4: eyes top
  [_,  MK, MW, MW, MB, Mw, MB, MW, MW, MK, _  ],  // 5: eyes bot (inward pupils)
  [_,  MR, MK, Mw, Mw, Mw, Mw, Mw, MK, MR, _  ],  // 6: blush + cheeks
  [_,  MK, MK, Mw, Mw, Mk, Mw, Mw, MK, MK, _  ],  // 7: mouth r1
  [_,  _,  MK, MK, MW, MW, MW, MK, MK, _,  _  ],  // 8: chin / mouth r2
  [_,  _,  _,  MK, MK, MK, MK, MK, _,  _,  _  ],  // 9: bottom / mouth r3
  [_,  _,  _,  _,  Mk, _,  Mk, _,  _,  _,  _  ],  // 10: nub feet
  [_,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _  ],  // 11:
];
const M1_EYES = { left: { r: 4, c: 3 }, right: { r: 4, c: 6 } };
const M1_MOUTH = { r: 7, c: 3, w: 5 };
const M1_SWEAT = [3, 9];

// Stage 2: Puff — cloud-cat, tall cute ears, fluffy, curly tail
const MOCHI_2 = [
  [_,  MK, _,  _,  _,  _,  _,  _,  _,  MK, _  ],  // 0: tall ear tips
  [_,  MK, MW, _,  _,  _,  _,  _,  MW, MK, _  ],  // 1: ears with white inner
  [_,  MK, MK, MW, MW, MW, MW, MW, MK, MK, _  ],  // 2: ears merge into head
  [_,  MK, MW, MW, MW, MW, MW, MW, MW, MK, _  ],  // 3: face
  [_,  MK, MW, MW, MW, Mw, MW, MW, MW, MK, _  ],  // 4: eyes top
  [_,  MK, MW, MW, MB, Mw, MB, MW, MW, MK, _  ],  // 5: eyes bot
  [MW, MR, MK, Mw, Mw, Mw, Mw, Mw, MK, MR, MW ],  // 6: fluffy cheeks + blush
  [_,  _,  MK, Mw, Mw, Mk, Mw, Mw, MK, _,  _  ],  // 7: mouth r1
  [_,  _,  MK, MK, MW, MW, MW, MK, MK, _,  _  ],  // 8: chin / mouth r2
  [_,  _,  _,  MK, MK, MK, MK, MK, _,  _,  _  ],  // 9: bottom / mouth r3
  [_,  _,  _,  _,  Mk, _,  Mk, _,  Mk, MK, _  ],  // 10: paws + curly tail
  [_,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _  ],  // 11:
];
const M2_EYES = { left: { r: 4, c: 3 }, right: { r: 4, c: 6 } };
const M2_MOUTH = { r: 7, c: 3, w: 5 };
const M2_SWEAT = [3, 9];

// Stage 3: Nimbus — cutest storm spirit, tiara, flowing mane, sparkles
const MOCHI_3 = [
  [_,  _,  _,  _,  MT, MW, MT, _,  _,  _,  _  ],  // 0: sparkle tiara
  [_,  MK, MW, MK, MW, MW, MW, MK, MW, MK, _  ],  // 1: flowing mane
  [MW, MK, MW, MW, MW, MW, MW, MW, MW, MK, MW ],  // 2: wide mane + head (11!)
  [_,  MK, MW, MW, MW, MW, MW, MW, MW, MK, _  ],  // 3: face
  [_,  MK, MT, MW, MW, Mw, MW, MW, MT, MK, _  ],  // 4: eyes top (mint eye shadow)
  [_,  MK, MW, MW, MB, Mw, MB, MW, MW, MK, _  ],  // 5: eyes bot
  [MT, MR, MK, Mw, Mw, Mw, Mw, Mw, MK, MR, MT ],  // 6: mint sparkles + blush + cheeks
  [_,  MK, MK, Mw, Mw, Mk, Mw, Mw, MK, MK, _  ],  // 7: mouth r1
  [_,  _,  Mk, MK, MK, MK, MK, MK, Mk, _,  _  ],  // 8: lower body / mouth r2
  [_,  _,  _,  MK, MK, MK, MK, MK, _,  _,  _  ],  // 9: bottom / mouth r3
  [_,  _,  FY, Mk, _,  _,  _,  Mk, FY, _,  _  ],  // 10: lightning + paws
  [_,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _  ],  // 11:
];
const M3_EYES = { left: { r: 4, c: 3 }, right: { r: 4, c: 6 } };
const M3_MOUTH = { r: 7, c: 3, w: 5 };
const M3_SWEAT = [3, 9];

// ── Pixel Stage 1 special handling (single big eye) ───────────────────────────

function pixelS1Expr(base, exprName) {
  const px = clone(base);
  const eR1 = 4, eR2 = 5; // eye rows (3-wide single eye, cols 3-5)
  const b = PGy, f = Pgy;
  // Mouth: 5-wide (cols 3-7), 3-row (rows 6-8)

  switch (exprName) {
    case 'normal':
      px[eR1][3] = PG; px[eR1][4] = PG; px[eR1][5] = PG;
      px[eR2][3] = PG; px[eR2][4] = Bk; px[eR2][5] = PG;
      px[6][3]=b; px[6][4]=f; px[6][5]=f; px[6][6]=f; px[6][7]=b;
      px[7][3]=b; px[7][4]=b; px[7][5]=b; px[7][6]=b; px[7][7]=b;
      px[8][3]=b; px[8][4]=b; px[8][5]=b; px[8][6]=b; px[8][7]=b;
      break;
    case 'blink':
      px[eR1][3] = b; px[eR1][4] = b; px[eR1][5] = b;
      px[eR2][3] = f; px[eR2][4] = f; px[eR2][5] = f;
      px[6][3]=b; px[6][4]=f; px[6][5]=f; px[6][6]=f; px[6][7]=b;
      px[7][3]=b; px[7][4]=b; px[7][5]=b; px[7][6]=b; px[7][7]=b;
      px[8][3]=b; px[8][4]=b; px[8][5]=b; px[8][6]=b; px[8][7]=b;
      break;
    case 'happy':
      px[eR1][3] = PG; px[eR1][4] = Bk; px[eR1][5] = PG;
      px[eR2][3] = f; px[eR2][4] = f; px[eR2][5] = f;
      px[6][3]=b; px[6][4]=b; px[6][5]=b; px[6][6]=b; px[6][7]=b;
      px[7][3]=PG; px[7][4]=b; px[7][5]=b; px[7][6]=b; px[7][7]=PG;  // green ∪ corners (lower)
      px[8][3]=b; px[8][4]=PG; px[8][5]=PG; px[8][6]=PG; px[8][7]=b;  // green ∪ bottom
      break;
    case 'stress':
      px[eR1][3] = PG; px[eR1][4] = PG; px[eR1][5] = PG;
      px[eR2][3] = PG; px[eR2][4] = PG; px[eR2][5] = Bk;
      px[6][3]=b; px[6][4]=f; px[6][5]=f; px[6][6]=f; px[6][7]=b;
      px[7][3]=b; px[7][4]=b; px[7][5]=b; px[7][6]=b; px[7][7]=b;
      px[8][3]=b; px[8][4]=b; px[8][5]=b; px[8][6]=b; px[8][7]=b;
      px[P1_SWEAT[0]][P1_SWEAT[1]] = Sw;
      break;
    case 'panic':
      px[eR1][3] = Rd; px[eR1][4] = b; px[eR1][5] = Rd;
      px[eR2][3] = b; px[eR2][4] = Rd; px[eR2][5] = b;
      px[6][3]=b; px[6][4]=Rd; px[6][5]=Rd; px[6][6]=Rd; px[6][7]=b;  // red O alert
      px[7][3]=b; px[7][4]=Rd; px[7][5]=f; px[7][6]=Rd; px[7][7]=b;
      px[8][3]=b; px[8][4]=Rd; px[8][5]=Rd; px[8][6]=Rd; px[8][7]=b;
      break;
  }
  return px;
}

// ── Sprite lookup tables ──────────────────────────────────────────────────────

const SPRITE_DATA = {
  flint: [
    { base: FLINT_1, eyes: F1_EYES, mouth: F1_MOUTH, sweat: F1_SWEAT, exprFn: flintS1Expr },
    { base: FLINT_2, eyes: F2_EYES, mouth: F2_MOUTH, sweat: F2_SWEAT, exprFn: flintS2Expr },
    { base: FLINT_3, eyes: F3_EYES, mouth: F3_MOUTH, sweat: F3_SWEAT, exprFn: flintS3Expr },
  ],
  pixel: [
    { base: PIXEL_1, eyes: P1_EYES, mouth: P1_MOUTH, sweat: P1_SWEAT, exprFn: null },
    { base: PIXEL_2, eyes: P2_EYES, mouth: P2_MOUTH, sweat: P2_SWEAT, exprFn: pixelS2Expr },
    { base: PIXEL_3, eyes: P3_EYES, mouth: P3_MOUTH, sweat: P3_SWEAT, exprFn: pixelS3Expr },
  ],
  mochi: [
    { base: MOCHI_1, eyes: M1_EYES, mouth: M1_MOUTH, sweat: M1_SWEAT, exprFn: mochiS1Expr },
    { base: MOCHI_2, eyes: M2_EYES, mouth: M2_MOUTH, sweat: M2_SWEAT, exprFn: mochiS2Expr },
    { base: MOCHI_3, eyes: M3_EYES, mouth: M3_MOUTH, sweat: M3_SWEAT, exprFn: mochiS3Expr },
  ],
};

const BODY_COLORS = {
  flint: FO,
  pixel: PGy,
  mochi: MK,
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
  const EMPTY_CELL = fg(1, 1, 1) + '\u2580' + RESET;
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

  const exprDefs = stageData.exprFn();
  const expr = exprDefs[expression];
  return applyExpr(stageData.base, stageData.eyes, stageData.mouth, expr, BODY_COLORS[companion], stageData.sweat);
}

module.exports = { renderSprite, getSprite, COMPANIONS, EXPRESSIONS };
