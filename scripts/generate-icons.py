#!/usr/bin/env python3
"""
Web Club icon generator.

Emits a single source SVG plus every raster size the web PWA and the
Capacitor/Android launcher need, so all surfaces stay visually identical.

Design: an interconnected web-node glyph (three satellite nodes linked to a
central bookmark) drawn in white over a blue->violet->cyan gradient.
Pure stdlib -- no ImageMagick / rsvg / Pillow required.

Usage:  python3 scripts/generate-icons.py
"""

import math
import os
import struct
import zlib

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUBLIC_ICONS = os.path.join(ROOT, "public", "icons")
ANDROID_RES = os.path.join(ROOT, "android", "app", "src", "main", "res")

# ---------------------------------------------------------------- geometry --

CANVAS = 512

# Gradient stops (top-left -> bottom-right)
GRAD_STOPS = [
    (0.00, (0x3B, 0x82, 0xF6)),  # blue
    (0.50, (0x63, 0x66, 0xF1)),  # indigo
    (1.00, (0x8B, 0x5C, 0xF6)),  # violet
]

# Central bookmark mark (the "club")
BM = {
    "cx": 256.0,
    "cy": 248.0,
    "w": 104.0,
    "h": 136.0,
    "notch": 34.0,
}
BM["x0"] = BM["cx"] - BM["w"] / 2
BM["x1"] = BM["cx"] + BM["w"] / 2
BM["y0"] = BM["cy"] - BM["h"] / 2
BM["y1"] = BM["cy"] + BM["h"] / 2

# Satellite nodes
NODES = [
    (256.0, 108.0, 30.0),
    (124.0, 372.0, 30.0),
    (388.0, 372.0, 30.0),
]

# Edges from the bookmark centre out to each node
EDGE_W = 15.0
NODE_R = 30.0

# Faint halo behind the glyph for depth
HALO_R = 176.0


# ------------------------------------------------------------------ raster --


def lerp(a, b, t):
    return a + (b - a) * t


def gradient_at(x, y):
    """Sample the diagonal 3-stop gradient at a normalised coordinate."""
    t = max(0.0, min(1.0, (x / CANVAS) * 0.55 + (y / CANVAS) * 0.45))
    for i in range(len(GRAD_STOPS) - 1):
        p0, c0 = GRAD_STOPS[i]
        p1, c1 = GRAD_STOPS[i + 1]
        if p0 <= t <= p1:
            k = (t - p0) / (p1 - p0) if p1 > p0 else 0.0
            return tuple(int(round(lerp(c0[j], c1[j], k))) for j in range(3))
    return GRAD_STOPS[-1][1]


def dist_to_segment(px, py, ax, ay, bx, by):
    dx, dy = bx - ax, by - ay
    if dx == 0 and dy == 0:
        return math.hypot(px - ax, py - ay)
    t = max(0.0, min(1.0, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)))
    return math.hypot(px - (ax + t * dx), py - (ay + t * dy))


def rounded_rect_contains(x, y, x0, y0, x1, y1, r):
    if x < x0 or x > x1 or y < y0 or y > y1:
        return False
    for cx, cy in ((x0 + r, y0 + r), (x1 - r, y0 + r), (x0 + r, y1 - r), (x1 - r, y1 - r)):
        if (x < x0 + r or x > x1 - r) and (y < y0 + r or y > y1 - r):
            if math.hypot(x - cx, y - cy) <= r:
                return True
            # handled below by the corner check
    # Corner regions
    for cx, cy in ((x0 + r, y0 + r), (x1 - r, y0 + r), (x0 + r, y1 - r), (x1 - r, y1 - r)):
        inside_x = (x < x0 + r) if cx == x0 + r else (x > x1 - r)
        inside_y = (y < y0 + r) if cy == y0 + r else (y > y1 - r)
        if inside_x and inside_y and math.hypot(x - cx, y - cy) > r:
            return False
    return True


def circle_contains(x, y, cx, cy, r):
    return math.hypot(x - cx, y - cy) <= r


def bookmark_contains(x, y):
    """Bookmark silhouette: rectangle with a V notch cut from the bottom."""
    if not (BM["x0"] <= x <= BM["x1"] and BM["y0"] <= y <= BM["y1"]):
        return False
    # Notch: a triangle rising from the bottom edge to the centre
    half = (BM["x1"] - BM["x0"]) / 2
    if y > BM["y1"] - BM["notch"]:
        depth = (y - (BM["y1"] - BM["notch"])) / BM["notch"]
        if abs(x - BM["cx"]) < half * depth:
            return False
    return True


def render(size, rounded=True, transparent_bg=False, glyph_only=False, scale=1.0):
    """
    Render the icon at `size` px.

    glyph_only  -> transparent background, just the white glyph (adaptive fg)
    rounded     -> rounded-square plate; otherwise a circle plate
    scale       -> glyph scale factor (adaptive foreground uses a safe zone)
    """
    ss = 3  # supersampling factor for anti-aliasing
    buf = bytearray(size * size * 4)
    inv = 1.0 / size
    f = CANVAS / float(size)

    # Glyph transform: scale about the canvas centre.
    gcx, gcy = CANVAS / 2.0, CANVAS / 2.0

    def gx(x):
        return gcx + (x - gcx) * scale

    def gy(y):
        return gcy + (y - gcy) * scale

    for py in range(size):
        for px in range(size):
            acc_r = acc_g = acc_b = acc_a = 0.0
            for sy in range(ss):
                for sx in range(ss):
                    ux = (px + (sx + 0.5) / ss) * f
                    uy = (py + (sy + 0.5) / ss) * f

                    if glyph_only:
                        # Transparent plate, white glyph only.
                        r = g = b = 255.0
                        a = 0.0
                    else:
                        if rounded:
                            inside = rounded_rect_contains(ux, uy, 8, 8, CANVAS - 8, CANVAS - 8, 112)
                        else:
                            inside = circle_contains(ux, uy, CANVAS / 2, CANVAS / 2, CANVAS / 2 - 4)
                        if not inside:
                            r = g = b = 0.0
                            a = 0.0
                        else:
                            r, g, b = gradient_at(ux, uy)
                            a = 255.0
                            # Soft radial halo
                            hd = math.hypot(ux - gx(BM["cx"]), uy - gy(BM["cy"]))
                            if hd < HALO_R * scale:
                                hk = (1.0 - hd / (HALO_R * scale)) ** 2 * 0.30
                                r = min(255, r + (255 - r) * hk)
                                g = min(255, g + (255 - g) * hk)
                                b = min(255, b + (255 - b) * hk)

                    # --- draw white glyph over the plate ---
                    X, Y = gx(ux), gy(uy)

                    # edges (behind the bookmark)
                    if not glyph_only:
                        pass
                    edge_hit = False
                    for (nx, ny, nr) in NODES:
                        if dist_to_segment(X, Y, gx(BM["cx"]), gy(BM["cy"]), gx(nx), gy(ny)) <= EDGE_W * scale:
                            edge_hit = True
                            break
                    # arc linking the two lower nodes
                    if not edge_hit:
                        acx, acy = gx((NODES[1][0] + NODES[2][0]) / 2), gy((NODES[1][1] + NODES[2][1]) / 2 - 40)
                        if dist_to_segment(X, Y, gx(NODES[1][0]), gy(NODES[1][1]), acx, acy) <= EDGE_W * scale:
                            edge_hit = True
                        elif dist_to_segment(X, Y, acx, acy, gx(NODES[2][0]), gy(NODES[2][1])) <= EDGE_W * scale:
                            edge_hit = True

                    node_hit = any(circle_contains(X, Y, gx(nx), gy(ny), nr * scale) for (nx, ny, nr) in NODES)
                    bm_hit = bookmark_contains(X, Y)

                    if edge_hit or node_hit or bm_hit:
                        # glyph colour: white, slightly translucent for the edges
                        ga = 255.0 if (node_hit or bm_hit) else 225.0
                        r = lerp(r, 255.0, 1.0)
                        g = lerp(g, 255.0, 1.0)
                        b = lerp(b, 255.0, 1.0)
                        a = max(a, ga)

                    acc_r += r * (a / 255.0)
                    acc_g += g * (a / 255.0)
                    acc_b += b * (a / 255.0)
                    acc_a += a

            n = ss * ss
            a = acc_a / n
            if a > 0:
                idx = (py * size + px) * 4
                buf[idx] = int(round(acc_r / n / (a / 255.0)))
                buf[idx + 1] = int(round(acc_g / n / (a / 255.0)))
                buf[idx + 2] = int(round(acc_b / n / (a / 255.0)))
                buf[idx + 3] = int(round(a))
    return buf


def write_png(path, size, buf):
    rows = b""
    for y in range(size):
        rows += b"\x00" + bytes(buf[y * size * 4:(y + 1) * size * 4])
    comp = zlib.compress(rows, 9)

    def chunk(t, d):
        c = t + d
        return struct.pack(">I", len(d)) + c + struct.pack(">I", zlib.crc32(c) & 0xFFFFFFFF)

    png = b"\x89PNG\r\n\x1a\n"
    png += chunk(b"IHDR", struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0))
    png += chunk(b"IDAT", comp)
    png += chunk(b"IEND", b"")
    with open(path, "wb") as f:
        f.write(png)


# --------------------------------------------------------------------- svg --

SVG_TEMPLATE = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512" role="img" aria-label="Web Club">
  <defs>
    <linearGradient id="wcGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#3b82f6"/>
      <stop offset="50%" stop-color="#6366f1"/>
      <stop offset="100%" stop-color="#8b5cf6"/>
    </linearGradient>
    <radialGradient id="wcHalo" cx="50%" cy="48%" r="42%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.30"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect x="8" y="8" width="496" height="496" rx="112" fill="url(#wcGrad)"/>
  <circle cx="256" cy="248" r="176" fill="url(#wcHalo)"/>
  <g stroke="#ffffff" stroke-opacity="0.88" stroke-width="15" stroke-linecap="round" fill="none">
    <line x1="256" y1="248" x2="256" y2="108"/>
    <line x1="256" y1="248" x2="124" y2="372"/>
    <line x1="256" y1="248" x2="388" y2="372"/>
    <path d="M 124 372 L 256 332 L 388 372"/>
  </g>
  <g fill="#ffffff">
    <circle cx="256" cy="108" r="30"/>
    <circle cx="124" cy="372" r="30"/>
    <circle cx="388" cy="372" r="30"/>
  </g>
  <path fill="#ffffff" d="M 204 180 L 308 180 L 308 316 L 256 282 L 204 316 Z"/>
</svg>
"""


def main():
    os.makedirs(PUBLIC_ICONS, exist_ok=True)

    # --- SVG source of truth ---
    with open(os.path.join(PUBLIC_ICONS, "logo.svg"), "w") as f:
        f.write(SVG_TEMPLATE)

    # --- web PWA assets ---
    for size, name in ((512, "icon-512.png"), (192, "icon-192.png"), (32, "favicon-32x32.png"), (16, "favicon-16x16.png")):
        write_png(os.path.join(PUBLIC_ICONS, name), size, render(size, rounded=True))
        print("wrote public/icons/%s (%dx%d)" % (name, size, size))

    # master app-icon (1024)
    write_png(os.path.join(PUBLIC_ICONS, "app-icon.png"), 1024, render(1024, rounded=True))
    print("wrote public/icons/app-icon.png (1024x1024)")

    # --- Android launcher assets ---
    # legacy square  : 48dp  -> mdpi 48, hdpi 72, xhdpi 96, xxhdpi 144, xxxhdpi 192
    legacy = {"mdpi": 48, "hdpi": 72, "xhdpi": 96, "xxhdpi": 144, "xxxhdpi": 192}
    # adaptive fg   : 108dp -> mdpi 108, hdpi 162, xhdpi 216, xxhdpi 324, xxxhdpi 432
    adaptive = {"mdpi": 108, "hdpi": 162, "xhdpi": 216, "xxhdpi": 324, "xxxhdpi": 432}

    for dens, size in legacy.items():
        d = os.path.join(ANDROID_RES, "mipmap-" + dens)
        os.makedirs(d, exist_ok=True)
        write_png(os.path.join(d, "ic_launcher.png"), size, render(size, rounded=True))
        write_png(os.path.join(d, "ic_launcher_round.png"), size, render(size, rounded=False))
        write_png(os.path.join(d, "ic_launcher_foreground.png"), size, render(size, transparent_bg=True, glyph_only=True, scale=0.62))
        print("wrote mipmap-%s (%dpx)" % (dens, size))


if __name__ == "__main__":
    main()
