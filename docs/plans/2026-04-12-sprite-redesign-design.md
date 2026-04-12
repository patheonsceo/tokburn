# Sprite Redesign v2.2 — Design Document

**Date**: 2026-04-12
**Status**: LOCKED — approved for implementation

## Summary

Complete redesign of all 9 Tokemon sprites (3 types × 3 evolution stages) with per-stage expression sets. Fixes: unreadable smiles, alien-looking Pixel type, wasted vertical space, cramped face layout.

## What Changed

| Before (v2.1) | After (v2.2) |
|---|---|
| Stage 1: 9 cols, Stage 2/3: 11 cols | All stages: 11 cols |
| 8-9 of 12 pixel rows used | All 12 rows used |
| 2-row mouth (3 wide) | 3-row mouth (5 wide) |
| 0 rows between eyes and mouth | 1 row gap (cheek row) |
| 3 shared expression sets (per type) | 9 per-stage expression sets + 1 special |
| Smile: 3 dark pixels, unreadable | Smile: 5-pixel U-curve, clear |
| Pixel S1: round body = alien | Pixel S1: boxy frame = robot |
| Inferno: humanoid silhouette | Inferno: inverted-triangle dragon |

## Design Principles

1. **All sprites 11 cols × 12 rows** — uniform canvas, dynamic width computed per-render
2. **Face layout**: eyes at rows 3-5 (varies by stage), gap row, mouth zone rows 5-9 (varies)
3. **3-row mouth, 5 pixels wide** — enough for clear U-smile, O-scream, flat-worry
4. **Per-stage expressions** — each of 9 stages gets its own expression function
5. **Stage progression silhouettes**: S1 = compact/cute, S2 = defined/personality, S3 = dramatic/imposing
6. **Type-specific smile colors**: Flint = dark brown (dk), Pixel = green LED (PG), Mochi = deep pink (Mk)

## Expression System Changes

### applyExpr mouth loop
```javascript
// Before: for (let dy = 0; dy < 2; dy++)
// After:
const mouthRows = expr.mouth.length;
for (let dy = 0; dy < mouthRows; dy++) {
```
Backwards compatible — 2-row mouths still work, 3-row mouths also supported.

### Smile pattern (5w × 3h)
```
[dk, f, f, f, dk]   ← corners UP (5 dark pixels total)
[f, dk, dk, dk, f]   ← wide U bottom curve
[b, b, b, b, b]      ← chin/body
```
Pixel type uses LOW smile (shifted down 1 row) to avoid evil-grin look on boxy faces.

### Per-stage expression functions
- `flintS1Expr()`, `flintS2Expr()`, `flintS3Expr()`
- `pixelS1Expr(base, exprName)` — special handler for cyclopean eye
- `pixelS2Expr()`, `pixelS3Expr()`
- `mochiS1Expr()`, `mochiS2Expr()`, `mochiS3Expr()`

## Sprite Designs

### Flint (Fire) — Charmander → Charizard arc

**Stage 1 — Flint**: Baby flame spirit. Round teardrop body, flame tip rows 0-2, big innocent eyes with inward pupils. 9-wide body at widest. Ember feet at row 10.
- Eyes: (4,3) and (4,6). Mouth: (7,3) w=5. Sweat: (3,9).

**Stage 2 — Blaze**: Fire fox. Flame ear tips at cols 2/8, ears connect to head at row 2. Outer-pupil normal gaze swapped to stress (user feedback: outer = nervous). Wider snout for 5w mouth. Flame tail curling right at rows 10-11.
- Eyes: (4,3) and (4,6). Mouth: (7,3) w=5. Sweat: (3,9).

**Stage 3 — Inferno**: Fire drake, inverted-triangle silhouette. Flame horns at cols 0/10, wings spread UP wide at rows 0-2 (full 11-width). Body NARROWS from head down: 11→9→7→5→3→1. Red armor plates (FR) at rows 7-8. Tail flame drops from center. Core glow (Fc) at chest preserved in normal/blink expressions.
- Eyes: (3,3) and (3,6). Mouth: (5,3) w=5. Sweat: (2,9).

### Pixel (Tech) — Robot evolution

**Stage 1 — Pixel**: Boxy robot with cyan (PC) frame. FLAT top/bottom edges (screams machine, not alien). Single cyclopean eye (3-wide green LED) offset left. Speaker grill mouth. Antenna with LED. Uses special `pixelS1Expr` handler.
- Eyes: single at (4,3). Mouth: (6,3) w=5. Sweat: (2,9).

**Stage 2 — Codec**: Dual LED eyes, same frame structure. Triple antenna LED, purple arms at cols 0/10 (row 8). Speaker grill mouth.
- Eyes: (4,3) and (4,6). Mouth: (6,3) w=5. Sweat: (3,9).

**Stage 3 — Daemon**: Cyber entity. Energy crest (purple/cyan) at top. 5-wide LED visor band. Data wings at rows 6-7 (full 11-wide, purple+cyan). Cyan energy core at chest (PC, preserved in normal/blink). Inverted-triangle like Inferno.
- Eyes: (3,3) and (3,6). Mouth: (5,3) w=5. Sweat: (2,9).

**Pixel smile**: Green LED U-shape, shifted LOW in mouth zone to avoid evil grin on boxy faces.

### Mochi (Nature) — Cute escalation

**Stage 1 — Mochi**: Perfectly round blob. Grows from 5-wide top to 9-wide middle. HUGE dewy eyes with inward pupils (cute). Pink blush marks (MR) at cheeks. Nub feet.
- Eyes: (4,3) and (4,6). Mouth: (7,3) w=5. Sweat: (3,9).

**Stage 2 — Puff**: Cloud-cat. TALL cat ears (3 rows, 0-2) with white (MW) inner ear detail. Fluffy cheek tufts (MW) extending beyond body at row 6. Curly tail at bottom-right (row 10 cols 8-9).
- Eyes: (4,3) and (4,6). Mouth: (7,3) w=5. Sweat: (3,9).

**Stage 3 — Nimbus**: Cutest storm spirit. Mint (MT) sparkle tiara at row 0 center. Flowing mane at full 11-width (row 2, MW wisps at edges). Mint eye shadow accents (row 4 cols 2/8). Mint sparkles + blush at body edges. Lightning bolts (FY) at feet.
- Eyes: (4,3) and (4,6). Mouth: (7,3) w=5. Sweat: (3,9).

## Files to Modify

1. **`sprites.js`** — All sprite arrays, eye/mouth/sweat positions, expression functions, pixelS1Expr handler, applyExpr mouth loop
2. **`sprites.js` exports** — Same API: `renderSprite`, `getSprite`, `COMPANIONS`, `EXPRESSIONS`

## Files NOT Modified

- `statusline.js` — Already computes `spriteWidth` dynamically, pads to 12 rows
- `companion.js` — No sprite logic
- `personality.js` — No sprite logic
- `config.js` — No sprite logic
- `init-ui.mjs` — Uses renderSprite which handles any grid size

## Testing

1. `npm test` — 24 existing tests (companion.js, no sprite assertions)
2. Manual smoke test with stdin JSON pipe
3. Visual verification with `node sprite-preview.js all`

## Reference

All finalized pixel arrays and expression functions are in `sprite-preview.js` — the implementation should port them directly to `sprites.js`.
