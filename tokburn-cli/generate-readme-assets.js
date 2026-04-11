#!/usr/bin/env node
/**
 * Generate SVG sprite images for README.
 * Reads pixel data from sprites.js and renders to SVG files.
 */

const fs = require('fs');
const path = require('path');
const { getSprite, COMPANIONS } = require('./sprites');

const PIXEL_SIZE = 12; // px per pixel
const GAP = 4; // gap between sprites
const BG = '#0d1117'; // GitHub dark mode background

function spriteToSVG(companion, stage, expression, scale) {
  scale = scale || PIXEL_SIZE;
  const pixels = getSprite(companion, stage, expression);
  const height = pixels.length;
  const width = pixels[0].length;
  const svgW = width * scale;
  const svgH = height * scale;

  let rects = '';
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const px = pixels[y][x];
      if (!px) continue;
      const [r, g, b] = px;
      rects += `<rect x="${x * scale}" y="${y * scale}" width="${scale}" height="${scale}" fill="rgb(${r},${g},${b})"/>`;
    }
  }

  return { svg: rects, width: svgW, height: svgH };
}

function generateStartersSVG() {
  const scale = 10;
  const padding = 20;
  const labelH = 24;
  const gapBetween = 30;

  const sprites = COMPANIONS.map(c => {
    const s = spriteToSVG(c, 1, 'normal', scale);
    return { ...s, name: c };
  });

  const names = { flint: 'Flint', pixel: 'Pixel', mochi: 'Mochi' };
  const types = { flint: 'Fire', pixel: 'Tech', mochi: 'Nature' };

  const totalW = sprites.reduce((sum, s) => sum + s.width, 0) + gapBetween * (sprites.length - 1) + padding * 2;
  const maxH = Math.max(...sprites.map(s => s.height)) + padding * 2 + labelH;

  let content = '';
  let xOffset = padding;

  for (const s of sprites) {
    const yOffset = padding;

    // Label
    content += `<text x="${xOffset + s.width / 2}" y="${yOffset + s.height + labelH - 4}" text-anchor="middle" fill="#c9d1d9" font-family="monospace" font-size="13" font-weight="bold">${names[s.name]}</text>`;
    content += `<text x="${xOffset + s.width / 2}" y="${yOffset + s.height + labelH + 12}" text-anchor="middle" fill="#8b949e" font-family="monospace" font-size="11">${types[s.name]}</text>`;

    // Sprite
    content += `<g transform="translate(${xOffset},${yOffset})">${s.svg}</g>`;

    xOffset += s.width + gapBetween;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalW}" height="${maxH + 16}" viewBox="0 0 ${totalW} ${maxH + 16}">
<rect width="100%" height="100%" fill="${BG}" rx="8"/>
${content}
</svg>`;
}

function generateEvolutionSVG(companion) {
  const scale = 10;
  const padding = 20;
  const labelH = 24;
  const arrowW = 40;

  const names = {
    flint: ['Flint', 'Blaze', 'Inferno'],
    pixel: ['Pixel', 'Codec', 'Daemon'],
    mochi: ['Mochi', 'Puff', 'Nimbus'],
  };

  const sprites = [1, 2, 3].map(stage => {
    const s = spriteToSVG(companion, stage, 'normal', scale);
    return { ...s, name: names[companion][stage - 1], stage };
  });

  const totalW = sprites.reduce((sum, s) => sum + s.width, 0) + arrowW * 2 + padding * 2;
  const maxH = Math.max(...sprites.map(s => s.height)) + padding * 2 + labelH;

  let content = '';
  let xOffset = padding;

  for (let i = 0; i < sprites.length; i++) {
    const s = sprites[i];
    const yOffset = padding;

    // Label
    content += `<text x="${xOffset + s.width / 2}" y="${yOffset + s.height + labelH - 4}" text-anchor="middle" fill="#c9d1d9" font-family="monospace" font-size="12" font-weight="bold">${s.name}</text>`;
    content += `<text x="${xOffset + s.width / 2}" y="${yOffset + s.height + labelH + 11}" text-anchor="middle" fill="#8b949e" font-family="monospace" font-size="10">Lv.${s.stage === 1 ? '1' : s.stage === 2 ? '5' : '15'}</text>`;

    // Sprite
    content += `<g transform="translate(${xOffset},${yOffset})">${s.svg}</g>`;

    xOffset += s.width;

    // Arrow between sprites
    if (i < sprites.length - 1) {
      const arrowY = yOffset + sprites[i].height / 2;
      content += `<text x="${xOffset + arrowW / 2}" y="${arrowY + 4}" text-anchor="middle" fill="#8b949e" font-family="monospace" font-size="18">\u2192</text>`;
      xOffset += arrowW;
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalW}" height="${maxH + 16}" viewBox="0 0 ${totalW} ${maxH + 16}">
<rect width="100%" height="100%" fill="${BG}" rx="8"/>
${content}
</svg>`;
}

function generateExpressionsSVG(companion) {
  const scale = 8;
  const padding = 16;
  const labelH = 18;
  const gapBetween = 16;
  const expressions = ['normal', 'blink', 'happy', 'stress', 'panic'];

  const sprites = expressions.map(expr => {
    const s = spriteToSVG(companion, 2, expr, scale);
    return { ...s, expr };
  });

  const totalW = sprites.reduce((sum, s) => sum + s.width, 0) + gapBetween * (sprites.length - 1) + padding * 2;
  const maxH = Math.max(...sprites.map(s => s.height)) + padding * 2 + labelH;

  let content = '';
  let xOffset = padding;

  for (const s of sprites) {
    const yOffset = padding;
    content += `<text x="${xOffset + s.width / 2}" y="${yOffset + s.height + labelH - 2}" text-anchor="middle" fill="#8b949e" font-family="monospace" font-size="10">${s.expr}</text>`;
    content += `<g transform="translate(${xOffset},${yOffset})">${s.svg}</g>`;
    xOffset += s.width + gapBetween;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalW}" height="${maxH + 8}" viewBox="0 0 ${totalW} ${maxH + 8}">
<rect width="100%" height="100%" fill="${BG}" rx="8"/>
${content}
</svg>`;
}

// ── Generate all assets ────────────────────────────────────────────────────

const outDir = path.join(__dirname, '..', 'docs', 'assets');
fs.mkdirSync(outDir, { recursive: true });

// 1. Three starters side by side
fs.writeFileSync(path.join(outDir, 'starters.svg'), generateStartersSVG());
console.log('  starters.svg');

// 2. Evolution lines for each companion
for (const c of COMPANIONS) {
  fs.writeFileSync(path.join(outDir, `evolution-${c}.svg`), generateEvolutionSVG(c));
  console.log(`  evolution-${c}.svg`);
}

// 3. Expressions for Blaze (Flint stage 2) as example
fs.writeFileSync(path.join(outDir, 'expressions.svg'), generateExpressionsSVG('flint'));
console.log('  expressions.svg');

console.log('\nDone. Assets written to docs/assets/');
