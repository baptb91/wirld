#!/usr/bin/env python3
"""
Generates placeholder PNG assets for the WILDS Expo app.
Uses only stdlib (struct, zlib) — no Pillow required.
"""
import struct, zlib, os

# ── PNG primitives ────────────────────────────────────────────────────────────

def make_chunk(ctype: bytes, data: bytes) -> bytes:
    payload = ctype + data
    return (struct.pack('>I', len(data))
            + payload
            + struct.pack('>I', zlib.crc32(payload) & 0xFFFFFFFF))

PNG_SIG = b'\x89PNG\r\n\x1a\n'

def ihdr(w, h):
    return make_chunk(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, 2, 0, 0, 0))

# ── 5×7 pixel-art font (bit 4 = leftmost pixel in each 5-bit row mask) ───────

FONT = {
    'W': [0b10001, 0b10001, 0b10001, 0b10101, 0b10101, 0b11011, 0b10001],
    'I': [0b11111, 0b00100, 0b00100, 0b00100, 0b00100, 0b00100, 0b11111],
    'L': [0b10000, 0b10000, 0b10000, 0b10000, 0b10000, 0b10000, 0b11111],
    'D': [0b11100, 0b10010, 0b10001, 0b10001, 0b10001, 0b10010, 0b11100],
    'S': [0b01111, 0b10000, 0b10000, 0b01110, 0b00001, 0b00001, 0b11110],
}
TEXT = 'WILDS'
CHAR_W, CHAR_H = 5, 7

# ── Image generator ───────────────────────────────────────────────────────────

def generate(path, width, height, bg, fg, scale, gap=1):
    """Write a PNG with a solid bg and WILDS text in fg, centered."""
    n = len(TEXT)
    grid_w = CHAR_W * n + gap * (n - 1)  # total text width in font pixels
    img_tw  = grid_w * scale               # text width in image pixels
    img_th  = CHAR_H * scale               # text height in image pixels
    x_off   = max(0, (width  - img_tw) // 2)
    y_off   = max(0, (height - img_th) // 2)

    bg_px = bytes(bg)
    fg_px = bytes(fg)

    # Build one pure-background scanline (filter-byte=0 + pixels)
    bg_row = b'\x00' + bg_px * width

    # Pre-compute the 7 distinct text scanlines (reused for every scale row)
    text_rows = []
    for gy in range(CHAR_H):
        row = bytearray([0])  # filter byte
        for x in range(width):
            gx = x - x_off
            if 0 <= gx < img_tw:
                tx   = gx // scale                    # font pixel x
                ci   = tx // (CHAR_W + gap)           # character index
                cx   = tx %  (CHAR_W + gap)           # x within char+gap
                if ci < n and cx < CHAR_W:
                    bit = FONT[TEXT[ci]][gy] & (1 << (CHAR_W - 1 - cx))
                    row.extend(fg_px if bit else bg_px)
                else:
                    row.extend(bg_px)
            else:
                row.extend(bg_px)
        text_rows.append(bytes(row))

    # Assemble raw image data (re-use pre-built rows — no per-pixel Python loop)
    raw = bytearray()
    for y in range(height):
        gy = y - y_off
        if 0 <= gy < img_th:
            raw.extend(text_rows[gy // scale])
        else:
            raw.extend(bg_row)

    idat = make_chunk(b'IDAT', zlib.compress(bytes(raw), 1))
    iend = make_chunk(b'IEND', b'')

    with open(path, 'wb') as f:
        f.write(PNG_SIG + ihdr(width, height) + idat + iend)

    kb = os.path.getsize(path) // 1024
    print(f'  {os.path.basename(path):25s}  {width}x{height}  {kb} KB')

# ── Main ──────────────────────────────────────────────────────────────────────

os.makedirs('assets/images', exist_ok=True)

BG = (74, 124, 89)    # #4A7C59 — game green
FG = (255, 255, 255)  # white text

print('Generating WILDS assets...')
generate('assets/images/icon.png',          1024, 1024,  BG, FG, scale=20, gap=2)
generate('assets/images/adaptive-icon.png', 1024, 1024,  BG, FG, scale=20, gap=2)
generate('assets/images/splash.png',        1284, 2778,  BG, FG, scale=40, gap=3)
generate('assets/images/favicon.png',         32,   32,  BG, FG, scale=1,  gap=0)
print('Done.')
