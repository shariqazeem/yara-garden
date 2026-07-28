#!/usr/bin/env python3
"""Yara end card (1920x1080) — matches the loader/banner brand.

Leaves the viewer with: the thesis (warmth+rigor), the honest numbers
(our real differentiator), and where to go. Same look as the loader:
Georgia, cream #fdf3e6, warm sunrise glow, soft dark shadow.
"""
from PIL import Image, ImageDraw, ImageFont, ImageFilter

SRC = "public/yara_header.png"
OUT = "public/yara_end_card.png"
GEORGIA = "/System/Library/Fonts/Supplemental/Georgia.ttf"
GEORGIA_I = "/System/Library/Fonts/Supplemental/Georgia Italic.ttf"
HELV = "/System/Library/Fonts/Helvetica.ttc"

W, H = 1920, 1080
S = 2                      # supersample
CREAM = (253, 243, 230)
GLOW = (255, 206, 150)

# ---------- background: cover-crop the banner to 16:9, then darken ----------
src = Image.open(SRC).convert("RGB")
sw, sh = src.size
scale = max(W / sw, H / sh)
rw, rh = int(sw * scale), int(sh * scale)
bg = src.resize((rw, rh), Image.LANCZOS).crop(
    ((rw - W) // 2, (rh - H) // 2, (rw - W) // 2 + W, (rh - H) // 2 + H)
).filter(ImageFilter.GaussianBlur(2.4)).convert("RGBA")

# vertical darkening gradient (dark top + bottom, calm middle), warm-black
stops = [(0.0, 140), (0.16, 78), (0.52, 70), (0.80, 104), (1.0, 172)]
def alpha_at(f):
    for (f0, a0), (f1, a1) in zip(stops, stops[1:]):
        if f <= f1:
            t = (f - f0) / (f1 - f0)
            return a0 + (a1 - a0) * t
    return stops[-1][1]
mask = Image.new("L", (W, H))
md = ImageDraw.Draw(mask)
for y in range(H):
    md.line([(0, y), (W, y)], fill=int(alpha_at(y / H)))
scrim = Image.new("RGBA", (W, H), (12, 8, 6, 0)); scrim.putalpha(mask)
bg = Image.alpha_composite(bg, scrim)

# ---------- text ----------
_fc = {}
def font(path, size):
    k = (path, size)
    if k not in _fc:
        _fc[k] = ImageFont.truetype(path, size)
    return _fc[k]

def draw_line(dr, cx, cy, text, f, fill, track):
    total = sum(f.getlength(c) for c in text) + track * (len(text) - 1)
    x = cx - total / 2
    for c in text:
        dr.text((x, cy), c, font=f, fill=fill, anchor="lm")
        x += f.getlength(c) + track

# element = (text, font_path, size, cx, cy, alpha, track_em, glow)
E = [
    ("Yara",                         GEORGIA,   66, 960, 150, 1.00, 0.16, True),
    ("A GENTLE WORLD TO HEAL",       HELV,      23, 960, 212, 0.70, 0.34, False),

    ("The rigor lives in the model.",   GEORGIA, 72, 960, 348, 0.97, 0.0, True),
    ("The warmth lives in the world.",  GEORGIA, 72, 960, 436, 0.97, 0.0, True),

    # left stat — the win
    ("74%",                          GEORGIA,  102, 558, 624, 1.00, 0.0, True),
    ("preferred over base",          HELV,      31, 558, 706, 0.92, 0.01, False),
    ("AutoScientist healthcare eval",HELV,      23, 558, 748, 0.60, 0.02, False),

    # right stat — the honesty
    ("11.3 vs 14.7",                 GEORGIA,   86, 1362, 624, 1.00, 0.0, True),
    ("rare-case Top-1 · ours vs base",HELV,     31, 1362, 706, 0.92, 0.01, False),
    ("a tradeoff we report, not hide",HELV,     23, 1362, 748, 0.60, 0.02, False),

    ("for the people who had to become strong too early",
                                     GEORGIA_I, 33, 960, 858, 0.84, 0.02, True),

    ("yara.garden    ·    open weights + dataset on HF & Kaggle    ·    base-vs-tuned sandbox",
                                     HELV,      26, 960, 956, 0.88, 0.03, False),
    ("Built on @adaption_ai's AutoScientist    ·    #AutoScientist",
                                     HELV,      23, 960, 1004, 0.66, 0.05, False),
]

def layer():
    return Image.new("RGBA", (W * S, H * S), (0, 0, 0, 0))

glow_l, shadow_l, text_l = layer(), layer(), layer()
gd, sd, td = ImageDraw.Draw(glow_l), ImageDraw.Draw(shadow_l), ImageDraw.Draw(text_l)

for text, path, size, cx, cy, alpha, track_em, glow in E:
    f = font(path, size * S)
    tr = track_em * size * S
    cxs, cys = cx * S, cy * S
    if glow:
        draw_line(gd, cxs, cys, text, f, GLOW + (int(0.22 * 255),), tr)
    draw_line(sd, cxs, cys + 2 * S, text, f, (0, 0, 0, int(0.55 * 255)), tr)
    draw_line(td, cxs, cys, text, f, CREAM + (int(alpha * 255),), tr)

# thin divider between the two stats
td.line([(960 * S, 560 * S), (960 * S, 762 * S)], fill=CREAM + (int(0.26 * 255),), width=2 * S)

glow_l = glow_l.filter(ImageFilter.GaussianBlur(24 * S))
shadow_l = shadow_l.filter(ImageFilter.GaussianBlur(7 * S))

stack = glow_l
for l in (shadow_l, text_l):
    stack = Image.alpha_composite(stack, l)
stack = stack.resize((W, H), Image.LANCZOS)

out = Image.alpha_composite(bg, stack).convert("RGB")
out.save(OUT, "PNG")
print(f"wrote {OUT}  ({W}x{H})")
