#!/usr/bin/env python3
"""Bake the Yara wordmark onto the banner — matching the app loader exactly.

Loader reference (components/Loader.tsx):
  font:  Georgia, "Times New Roman", serif, light
  color: #fdf3e6
  shadow: 0 2px 30px rgba(0,0,0,0.45), 0 0 60px rgba(255,206,150,0.28)
  tracking: 0.2em ;  tagline: uppercase 0.34em, ~0.75 opacity (sans)
"""
from PIL import Image, ImageDraw, ImageFont, ImageFilter

SRC = "public/yara_header.png"
OUT = "public/yara_header_titled.png"

GEORGIA = "/System/Library/Fonts/Supplemental/Georgia.ttf"
HELV = "/System/Library/Fonts/Helvetica.ttc"

CREAM = (253, 243, 230)            # #fdf3e6
GLOW = (255, 206, 150)             # warm sunrise glow
S = 3                              # supersample for crisp edges

base = Image.open(SRC).convert("RGBA")
W, H = base.size

# ---- tunables (in final-image px; scaled by S internally) ----
WORD = "Yara"
WORD_SIZE = 188
TRACK = 0.20                       # 0.2em
CX = W * 0.50                      # horizontal center
CY = H * 0.435                     # vertical center of the wordmark

TAG = "a gentle world to heal"
TAG_SIZE = 34
TAG_TRACK = 0.34
TAG_GAP = 70                       # gap below wordmark baseline-ish

# glow + shadow, scaled up from the loader's 60px reference to our larger type
SCALE = WORD_SIZE / 60.0
GLOW_BLUR = 60 * SCALE / 2.0       # css blur ~ 2*sigma
GLOW_ALPHA = int(0.28 * 255)
SH_BLUR = 30 * SCALE / 2.0
SH_ALPHA = int(0.45 * 255)
SH_DY = int(2 * SCALE)


def tracked_width(font, text, track_px):
    w = sum(font.getlength(c) for c in text)
    return w + track_px * (len(text) - 1)


def draw_tracked(draw, cx, cy, text, font, fill, track_px, dy=0):
    """Draw letter-spaced text centered on (cx, cy)."""
    total = tracked_width(font, text, track_px)
    x = cx - total / 2
    for c in text:
        draw.text((x, cy + dy), c, font=font, fill=fill, anchor="lm")
        x += font.getlength(c) + track_px


# work at supersampled resolution, then downscale the whole text stack
def make_layer():
    return Image.new("RGBA", (W * S, H * S), (0, 0, 0, 0))


word_font = ImageFont.truetype(GEORGIA, int(WORD_SIZE * S))
tag_font = ImageFont.truetype(HELV, int(TAG_SIZE * S))
tag_track = TAG_TRACK * TAG_SIZE * S
word_track = TRACK * WORD_SIZE * S

cx, cy = CX * S, CY * S
tag_cy = cy + (WORD_SIZE * 0.5 + TAG_GAP) * S

# 1) warm glow (painted furthest back)
glow = make_layer()
gd = ImageDraw.Draw(glow)
draw_tracked(gd, cx, cy, WORD, word_font, GLOW + (GLOW_ALPHA,), word_track)
glow = glow.filter(ImageFilter.GaussianBlur(GLOW_BLUR * S))

# 2) soft dark shadow for the wordmark (offset down, legibility on any frame)
shadow = make_layer()
sd = ImageDraw.Draw(shadow)
draw_tracked(sd, cx, cy, WORD, word_font, (0, 0, 0, SH_ALPHA), word_track, dy=SH_DY * S)
shadow = shadow.filter(ImageFilter.GaussianBlur(SH_BLUR * S))

# 2b) the tagline sits over bright water — give it its own tighter, darker
#     halo so it stays readable without looking heavy.
tag_sh = make_layer()
tsd = ImageDraw.Draw(tag_sh)
draw_tracked(tsd, cx, tag_cy, TAG, tag_font, (0, 0, 0, int(0.60 * 255)), tag_track, dy=2 * S)
tag_sh = tag_sh.filter(ImageFilter.GaussianBlur(11 * S))

# 3) crisp text on top
text = make_layer()
td = ImageDraw.Draw(text)
draw_tracked(td, cx, cy, WORD, word_font, CREAM + (255,), word_track)
draw_tracked(td, cx, tag_cy, TAG, tag_font, CREAM + (int(0.92 * 255),), tag_track)

stack = glow
for layer in (shadow, tag_sh, text):
    stack = Image.alpha_composite(stack, layer)
stack = stack.resize((W, H), Image.LANCZOS)

out = Image.alpha_composite(base, stack)
out.convert("RGB").save(OUT, "PNG")
print(f"wrote {OUT}  ({W}x{H})")
