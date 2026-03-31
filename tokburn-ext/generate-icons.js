#!/usr/bin/env node
/**
 * Generate minimal PNG icons for tokburn extension.
 * Creates orange flame-colored circle icons at 16, 48, and 128px.
 * Uses raw PNG binary construction — zero dependencies.
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function crc32(buf) {
  let crc = 0xffffffff;
  const table = new Int32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c;
  }
  for (let i = 0; i < buf.length; i++) {
    crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function createChunk(type, data) {
  const typeBytes = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([typeBytes, data]);
  const crcVal = crc32(body);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crcVal, 0);
  return Buffer.concat([len, body, crcBuf]);
}

function createPNG(size) {
  const SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  // Image data: orange circle with transparency
  const center = size / 2;
  const radius = size / 2 - 1;
  const innerRadius = radius * 0.45;
  const rawRows = [];

  for (let y = 0; y < size; y++) {
    const row = Buffer.alloc(1 + size * 4); // filter byte + RGBA
    row[0] = 0; // no filter
    for (let x = 0; x < size; x++) {
      const dx = x - center + 0.5;
      const dy = y - center + 0.5;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const offset = 1 + x * 4;

      if (dist <= radius) {
        // Flame gradient: bright orange at center, darker red at edges
        const t = dist / radius;

        // Create a flame-like shape (taller on top)
        const flameShape = 1 - Math.pow(t, 0.8);
        const verticalBias = (center - dy) / size; // brighter toward top-center

        let r, g, b;
        if (t < 0.4) {
          // Inner: bright yellow-orange
          r = 255;
          g = Math.round(180 + 40 * (1 - t / 0.4));
          b = Math.round(50 * (1 - t / 0.4));
        } else if (t < 0.7) {
          // Middle: orange
          const mt = (t - 0.4) / 0.3;
          r = 255;
          g = Math.round(180 - 80 * mt);
          b = 20;
        } else {
          // Outer: red-orange
          const ot = (t - 0.7) / 0.3;
          r = Math.round(255 - 40 * ot);
          g = Math.round(100 - 60 * ot);
          b = 10;
        }

        // Anti-aliasing at edge
        let alpha = 255;
        if (dist > radius - 1) {
          alpha = Math.round(255 * (radius - dist + 1));
        }

        row[offset] = Math.min(255, Math.max(0, r));
        row[offset + 1] = Math.min(255, Math.max(0, g));
        row[offset + 2] = Math.min(255, Math.max(0, b));
        row[offset + 3] = Math.min(255, Math.max(0, alpha));
      } else {
        // Transparent
        row[offset] = 0;
        row[offset + 1] = 0;
        row[offset + 2] = 0;
        row[offset + 3] = 0;
      }
    }
    rawRows.push(row);
  }

  const rawData = Buffer.concat(rawRows);
  const compressed = zlib.deflateSync(rawData);

  const ihdrChunk = createChunk('IHDR', ihdr);
  const idatChunk = createChunk('IDAT', compressed);
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([SIGNATURE, ihdrChunk, idatChunk, iendChunk]);
}

// Generate icons
const iconsDir = path.join(__dirname, 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

for (const size of [16, 48, 128]) {
  const png = createPNG(size);
  const outPath = path.join(iconsDir, `icon-${size}.png`);
  fs.writeFileSync(outPath, png);
  console.log(`Generated ${outPath} (${png.length} bytes)`);
}

console.log('Done!');
