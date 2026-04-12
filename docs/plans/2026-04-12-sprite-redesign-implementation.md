# Sprite Redesign v2.2 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Port all 9 redesigned sprites + per-stage expressions from sprite-preview.js into production sprites.js

**Architecture:** Single-file change to `tokburn-cli/sprites.js`. All new pixel arrays and expression functions are already finalized and tested in `tokburn-cli/sprite-preview.js` — this is a port, not a design task. The `getSprite` API stays identical. `SPRITE_DATA` entries gain an `exprFn` field; shared `EXPR_FNS` lookup is removed.

**Tech Stack:** Pure Node.js, zero dependencies. ANSI truecolor half-block rendering.

**Reference:** All finalized sprite data lives in `tokburn-cli/sprite-preview.js`. The design doc is at `docs/plans/2026-04-12-sprite-redesign-design.md`.

---

### Task 1: Update applyExpr for variable-height mouth

**Files:**
- Modify: `tokburn-cli/sprites.js:107` (the mouth loop)

**Step 1: Change the mouth loop bound**

In `applyExpr`, line ~107, change:
```javascript
// Before:
for (let dy = 0; dy < 2; dy++) {

// After:
const mouthRows = expr.mouth ? expr.mouth.length : 0;
for (let dy = 0; dy < mouthRows; dy++) {
```

Also update the comment above it to say `3 rows` instead of `2 rows`.

**Step 2: Run tests to verify nothing broke**

Run: `cd tokburn-cli && npm test`
Expected: All 24 tests pass (tests don't exercise sprite rendering directly)

**Step 3: Commit**

```bash
git add tokburn-cli/sprites.js
git commit -m "feat: support variable-height mouth in applyExpr"
```

---

### Task 2: Replace Flint sprite arrays and add per-stage expressions

**Files:**
- Modify: `tokburn-cli/sprites.js` — replace `FLINT_1`, `FLINT_2`, `FLINT_3` arrays + eye/mouth/sweat constants, replace `fireExpr()` with `flintS1Expr()`, `flintS2Expr()`, `flintS3Expr()`

**Step 1: Replace fireExpr() with three per-stage functions**

Copy the three functions `flintS1Expr`, `flintS2Expr`, `flintS3Expr` from `sprite-preview.js` lines 166-263. Delete the old `fireExpr()`.

**Step 2: Replace FLINT_1, F1_EYES, F1_MOUTH, F1_SWEAT**

Copy from `sprite-preview.js` lines 442-458. Key position changes:
- Eyes: `{ left: { r: 4, c: 3 }, right: { r: 4, c: 6 } }` (was c:2/c:5)
- Mouth: `{ r: 7, c: 3, w: 5 }` (was r:6, w:3)

**Step 3: Replace FLINT_2, F2_EYES, F2_MOUTH, F2_SWEAT**

Copy from `sprite-preview.js` lines 461-477. Key changes:
- Now 11 cols wide (was 11 but poorly utilized)
- Mouth: `{ r: 7, c: 3, w: 5 }` (was r:6, w:3)

**Step 4: Replace FLINT_3, F3_EYES, F3_MOUTH, F3_SWEAT**

Copy from `sprite-preview.js` lines 480-496. Key changes:
- Completely new inverted-triangle dragon silhouette
- Eyes: `{ r: 3, c: 3 }` / `{ r: 3, c: 6 }` (same as before)
- Mouth: `{ r: 5, c: 3, w: 5 }` (was r:5, w:3)

**Step 5: Smoke test**

```bash
echo '{"model":{"display_name":"Opus 4.6 (1M context)"},"context_window":{"used_percentage":31,"context_window_size":1000000},"rate_limits":{"five_hour":{"used_percentage":27}},"cost":{"total_lines_added":156,"total_lines_removed":23},"workspace":{"current_dir":"/tmp"}}' | node tokburn-cli/statusline.js
```
Verify sprite renders without errors and fills 6 terminal rows.

**Step 6: Commit**

```bash
git add tokburn-cli/sprites.js
git commit -m "feat: redesign Flint sprites — baby flame, fire fox, inverted-triangle drake"
```

---

### Task 3: Replace Pixel sprite arrays, expression functions, and pixelS1Expr

**Files:**
- Modify: `tokburn-cli/sprites.js` — replace `PIXEL_1/2/3`, replace `techExpr()` with `pixelS2Expr()` + `pixelS3Expr()`, replace `pixelS1Expr()`

**Step 1: Replace techExpr() with pixelS2Expr() and pixelS3Expr()**

Copy from `sprite-preview.js` lines 267-331. Delete old `techExpr()`.

**Step 2: Replace PIXEL_1/2/3 arrays and constants**

Copy from `sprite-preview.js` lines 503-557. Key changes:
- S1: 11 cols (was 9), boxy robot with cyan frame
- S2: centered 11-col with arms
- S3: data wings spread, inverted-triangle

**Step 3: Replace pixelS1Expr()**

Copy from `sprite-preview.js` lines 624-669. Key changes:
- Mouth now 5-wide, 3-row (rows 6-8, cols 3-7)
- Green LED smile shifted LOW (row 7-8 not 6-7)
- Updated sweat position reference

**Step 4: Run tests + smoke test**

```bash
cd tokburn-cli && npm test
```

**Step 5: Commit**

```bash
git add tokburn-cli/sprites.js
git commit -m "feat: redesign Pixel sprites — boxy robot, dual-eye codec, cyber daemon"
```

---

### Task 4: Replace Mochi sprite arrays and add per-stage expressions

**Files:**
- Modify: `tokburn-cli/sprites.js` — replace `MOCHI_1/2/3`, replace `mochiExpr()` with `mochiS1Expr()` + `mochiS2Expr()` + `mochiS3Expr()`

**Step 1: Replace mochiExpr() with three per-stage functions**

Copy from `sprite-preview.js` lines 335-435. Delete old `mochiExpr()`.

**Step 2: Replace MOCHI_1/2/3 arrays and constants**

Copy from `sprite-preview.js` lines 564-618. Key changes:
- S1: 11 cols (was 9), round blob centered
- S2: tall cat ears, curly tail
- S3: sparkle tiara, wide mane, mint accents

**Step 3: Run tests + smoke test**

```bash
cd tokburn-cli && npm test
```

**Step 4: Commit**

```bash
git add tokburn-cli/sprites.js
git commit -m "feat: redesign Mochi sprites — round blob, cloud-cat, storm spirit with tiara"
```

---

### Task 5: Update SPRITE_DATA and getSprite for per-stage expressions

**Files:**
- Modify: `tokburn-cli/sprites.js` — `SPRITE_DATA`, `getSprite()`, remove `EXPR_FNS`

**Step 1: Add exprFn to SPRITE_DATA entries**

```javascript
const SPRITE_DATA = {
  flint: [
    { base: FLINT_1, eyes: F1_EYES, mouth: F1_MOUTH, sweat: F1_SWEAT, exprFn: flintS1Expr },
    { base: FLINT_2, eyes: F2_EYES, mouth: F2_MOUTH, sweat: F2_SWEAT, exprFn: flintS2Expr },
    { base: FLINT_3, eyes: F3_EYES, mouth: F3_MOUTH, sweat: F3_SWEAT, exprFn: flintS3Expr },
  ],
  pixel: [
    { base: PIXEL_1, eyes: P1_EYES, mouth: P1_MOUTH, sweat: P1_SWEAT, exprFn: null }, // special handler
    { base: PIXEL_2, eyes: P2_EYES, mouth: P2_MOUTH, sweat: P2_SWEAT, exprFn: pixelS2Expr },
    { base: PIXEL_3, eyes: P3_EYES, mouth: P3_MOUTH, sweat: P3_SWEAT, exprFn: pixelS3Expr },
  ],
  mochi: [
    { base: MOCHI_1, eyes: M1_EYES, mouth: M1_MOUTH, sweat: M1_SWEAT, exprFn: mochiS1Expr },
    { base: MOCHI_2, eyes: M2_EYES, mouth: M2_MOUTH, sweat: M2_SWEAT, exprFn: mochiS2Expr },
    { base: MOCHI_3, eyes: M3_EYES, mouth: M3_MOUTH, sweat: M3_SWEAT, exprFn: mochiS3Expr },
  ],
};
```

**Step 2: Update getSprite to use per-stage exprFn**

```javascript
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
```

**Step 3: Delete EXPR_FNS**

Remove the `EXPR_FNS` constant entirely — no longer used.

**Step 4: Run tests**

```bash
cd tokburn-cli && npm test
```

**Step 5: Full visual verification**

```bash
node tokburn-cli/sprite-preview.js all
```

Compare each sprite between preview and production:
```bash
echo '...' | node tokburn-cli/statusline.js
```

Test with each companion type by temporarily setting companion in `~/.tokburn/companion.json`.

**Step 6: Commit**

```bash
git add tokburn-cli/sprites.js
git commit -m "feat: per-stage expression system — 9 unique expression sets"
```

---

### Task 6: Final cleanup and version bump

**Files:**
- Modify: `tokburn-cli/package.json` — bump version to 2.2.0
- Modify: `CLAUDE.md` — update sprite width note (all 11 cols now)

**Step 1: Bump version**

In `tokburn-cli/package.json`, change version to `"2.2.0"`.

**Step 2: Update CLAUDE.md gotcha #6**

Change:
> Sprite width changes between stages. Stage 1 = 9 cols, Stage 2/3 = 11 cols.

To:
> All sprites are 11 cols wide. `spriteWidth = spritePixels[0].length` is computed per-render, never hardcoded.

**Step 3: Final smoke test with all expressions**

```bash
node tokburn-cli/sprite-preview.js all
cd tokburn-cli && npm test
```

**Step 4: Commit**

```bash
git add tokburn-cli/package.json CLAUDE.md
git commit -m "chore: bump to v2.2.0, update sprite docs"
```
