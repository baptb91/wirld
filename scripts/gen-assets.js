#!/usr/bin/env node
/**
 * Generates icon.png, adaptive-icon.png, splash.png, favicon.png
 * using only pngjs (pure JS, no native deps).
 *
 * Run: node scripts/gen-assets.js
 */
const { PNG } = require('pngjs');
const fs = require('fs');
const path = require('path');

const ASSETS = path.join(__dirname, '..', 'assets', 'images');

// ── Primitives ────────────────────────────────────────────────────────────────

function createPNG(w, h, r, g, b) {
  const png = new PNG({ width: w, height: h });
  for (let i = 0; i < w * h * 4; i += 4) {
    png.data[i] = r; png.data[i + 1] = g; png.data[i + 2] = b; png.data[i + 3] = 255;
  }
  return png;
}

function setPixel(png, x, y, r, g, b) {
  if (x < 0 || x >= png.width || y < 0 || y >= png.height) return;
  const i = (png.width * y + x) << 2;
  png.data[i] = r; png.data[i + 1] = g; png.data[i + 2] = b; png.data[i + 3] = 255;
}

function fillRect(png, x, y, w, h, r, g, b) {
  for (let dy = 0; dy < h; dy++)
    for (let dx = 0; dx < w; dx++)
      setPixel(png, x + dx, y + dy, r, g, b);
}

function fillEllipse(png, cx, cy, rx, ry, r, g, b) {
  for (let dy = -ry; dy <= ry; dy++)
    for (let dx = -rx; dx <= rx; dx++)
      if ((dx * dx) / (rx * rx) + (dy * dy) / (ry * ry) <= 1.0)
        setPixel(png, Math.round(cx + dx), Math.round(cy + dy), r, g, b);
}

// ── Pixel font (7 rows, variable width) ──────────────────────────────────────

const GLYPHS = {
  W: [
    '1000001',
    '1000001',
    '1000001',
    '1010101',
    '1010101',
    '0101010',
    '0101010',
  ],
  I: [
    '11111',
    '00100',
    '00100',
    '00100',
    '00100',
    '00100',
    '11111',
  ],
  L: [
    '10000',
    '10000',
    '10000',
    '10000',
    '10000',
    '10000',
    '11111',
  ],
  D: [
    '111100',
    '100010',
    '100001',
    '100001',
    '100001',
    '100010',
    '111100',
  ],
  S: [
    '011110',
    '100000',
    '100000',
    '011110',
    '000001',
    '000001',
    '111110',
  ],
};

function glyphWidth(ch) {
  return GLYPHS[ch] ? GLYPHS[ch][0].length : 0;
}

function glyphHeight(ch) {
  return GLYPHS[ch] ? GLYPHS[ch].length : 0;
}

function measureText(text, cell, gap) {
  let w = 0;
  for (let i = 0; i < text.length; i++) {
    w += glyphWidth(text[i]) * cell;
    if (i < text.length - 1) w += gap;
  }
  return w;
}

function drawText(png, text, x, y, cell, gap, r, g, b) {
  let cx = x;
  for (const ch of text) {
    const glyph = GLYPHS[ch];
    if (!glyph) { cx += cell * 4 + gap; continue; }
    for (let row = 0; row < glyph.length; row++)
      for (let col = 0; col < glyph[row].length; col++)
        if (glyph[row][col] === '1')
          fillRect(png, cx + col * cell, y + row * cell, cell, cell, r, g, b);
    cx += glyph[0].length * cell + gap;
  }
}

// ── Lizard silhouette ─────────────────────────────────────────────────────────

function drawLizard(png, cx, cy, s, r, g, b) {
  // s = unit size (pixels). Body is ~4s wide, ~2s tall.

  // Tail — tapers leftward from body
  const tailSteps = 28;
  for (let i = 0; i <= tailSteps; i++) {
    const tx = cx - Math.round(s * 2.0) - i * Math.round(s * 0.28);
    const ty = cy + Math.round(i * s * 0.08);
    const tr = Math.max(1, Math.round(s * 0.85 * (1 - i / tailSteps)));
    fillEllipse(png, tx, ty, tr, Math.round(tr * 0.65), r, g, b);
  }

  // Body
  fillEllipse(png, cx, cy, Math.round(s * 2.0), Math.round(s * 1.05), r, g, b);

  // Head
  const hx = cx + Math.round(s * 2.6);
  const hy = cy - Math.round(s * 0.15);
  fillEllipse(png, hx, hy, Math.round(s * 0.95), Math.round(s * 0.85), r, g, b);

  // Eye
  fillEllipse(png, hx + Math.round(s * 0.35), hy - Math.round(s * 0.2),
    Math.max(2, Math.round(s * 0.14)), Math.max(2, Math.round(s * 0.14)),
    0x4A, 0x7C, 0x59);

  // Legs — four stubs (two each side)
  const lw = Math.max(2, Math.round(s * 0.32));
  const ll = Math.round(s * 1.1);

  // Front legs (near head)
  const fl = cx + Math.round(s * 1.1);
  fillRect(png, fl - lw / 2, cy - Math.round(s * 0.6) - ll, lw, ll, r, g, b); // top
  fillRect(png, fl - lw / 2, cy + Math.round(s * 0.6),       lw, ll, r, g, b); // bottom

  // Back legs (near tail)
  const bl = cx - Math.round(s * 1.0);
  fillRect(png, bl - lw / 2, cy - Math.round(s * 0.6) - ll, lw, ll, r, g, b); // top
  fillRect(png, bl - lw / 2, cy + Math.round(s * 0.6),       lw, ll, r, g, b); // bottom

  // Tiny feet
  const fw = lw + Math.round(s * 0.5);
  const fh = Math.max(2, Math.round(s * 0.28));
  // top-front
  fillRect(png, fl - fw / 2, cy - Math.round(s * 0.6) - ll - fh, fw, fh, r, g, b);
  // bottom-front
  fillRect(png, fl - fw / 2, cy + Math.round(s * 0.6) + ll,       fw, fh, r, g, b);
  // top-back
  fillRect(png, bl - fw / 2, cy - Math.round(s * 0.6) - ll - fh, fw, fh, r, g, b);
  // bottom-back
  fillRect(png, bl - fw / 2, cy + Math.round(s * 0.6) + ll,       fw, fh, r, g, b);
}

// ── Generate 1024×1024 icon ───────────────────────────────────────────────────

function buildIcon(size) {
  const png = createPNG(size, size, 0x4A, 0x7C, 0x59);

  const s = Math.round(size * 0.072); // lizard unit

  // Soft inner glow circle (slightly lighter green)
  fillEllipse(png, size / 2, size / 2, Math.round(size * 0.40), Math.round(size * 0.40),
    0x55, 0x8E, 0x68);

  // Lizard centered a bit above middle
  drawLizard(png, Math.round(size * 0.5), Math.round(size * 0.38), s, 255, 255, 255);

  // "WILDS" text
  const cell = Math.round(size * 0.062);
  const gap  = Math.round(cell * 0.45);
  const tw   = measureText('WILDS', cell, gap);
  const tx   = Math.round((size - tw) / 2);
  const ty   = Math.round(size * 0.62);
  drawText(png, 'WILDS', tx, ty, cell, gap, 255, 255, 255);

  return png;
}

// ── Generate 32×32 favicon ────────────────────────────────────────────────────

function buildFavicon() {
  const png = createPNG(32, 32, 0x4A, 0x7C, 0x59);
  // Just a "W" letter
  const cell = 3;
  const gap  = 1;
  const tw   = measureText('W', cell, gap);
  drawText(png, 'W', Math.round((32 - tw) / 2), 9, cell, gap, 255, 255, 255);
  return png;
}

// ── Write files ───────────────────────────────────────────────────────────────

const icon   = buildIcon(1024);
const fav    = buildFavicon();
const splash = buildIcon(1024); // same design, expo centers it on the bg color

fs.writeFileSync(path.join(ASSETS, 'icon.png'),          PNG.sync.write(icon));
fs.writeFileSync(path.join(ASSETS, 'adaptive-icon.png'), PNG.sync.write(icon));
fs.writeFileSync(path.join(ASSETS, 'splash.png'),        PNG.sync.write(splash));
fs.writeFileSync(path.join(ASSETS, 'favicon.png'),       PNG.sync.write(fav));

console.log('✓ icon.png, adaptive-icon.png, splash.png, favicon.png written to assets/images/');
