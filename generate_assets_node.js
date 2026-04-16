#!/usr/bin/env node
const { createCanvas } = require('/tmp/asset-gen/node_modules/canvas');
const fs = require('fs');
const path = require('path');

const BG = '#4A7C59';
const FG = '#FFFFFF';

function generate(outPath, width, height, fontSize) {
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, width, height);

  if (fontSize > 0) {
    // Subtle texture: slightly darker center radial
    const grad = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, Math.max(width, height) * 0.6);
    grad.addColorStop(0, 'rgba(255,255,255,0.04)');
    grad.addColorStop(1, 'rgba(0,0,0,0.12)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Text
    ctx.fillStyle = FG;
    ctx.font = `bold ${fontSize}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Soft shadow for legibility
    ctx.shadowColor = 'rgba(0,0,0,0.35)';
    ctx.shadowBlur = fontSize * 0.1;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = fontSize * 0.04;

    ctx.fillText('WILDS', width / 2, height / 2);
  }

  const buf = canvas.toBuffer('image/png');
  fs.writeFileSync(outPath, buf);
  const kb = Math.round(buf.length / 1024);
  console.log(`  ${path.basename(outPath).padEnd(22)} ${width}x${height}  ${kb} KB`);
}

const dir = path.join(__dirname, 'assets', 'images');
fs.mkdirSync(dir, { recursive: true });

console.log('Generating WILDS assets...');
generate(path.join(dir, 'icon.png'),          1024, 1024,  220);
generate(path.join(dir, 'adaptive-icon.png'), 1024, 1024,  220);
generate(path.join(dir, 'splash.png'),        1284, 2778,  260);
generate(path.join(dir, 'favicon.png'),         32,   32,    0);
console.log('Done.');
