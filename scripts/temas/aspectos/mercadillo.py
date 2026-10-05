# -*- coding: utf-8 -*-
"""F · Рынок — farmers' market / grocery world.
Kraft-bag page (fibres, creases, rubber stamps, veg doodles), striped market awning over a cream signboard,
receipts with zig-zag edges, a nutrition-facts scoreboard, tomato ticket buttons with punched notches,
cream coupons, labels with punched holes, coin-like steppers and a receipt-strip tab bar.
"""
import math, random
from arte import *

INK, PAPER, KRAFT, CREAM = "#2B2118", "#FFFEFA", "#D2B68E", "#FBF3E2"
TOMATO, TOMATO_D, LEAF, MUSTARD, PLUM = "#C0422B", "#8E2B1B", "#3E7B3B", "#D9A02B", "#8A3B5B"

PAL = dict(
    canvas="#D2B68E", surface="#FFFEFA", surface_2="#F7F1E6", line="#E6DACA", line_strong="#CDBB9E", field_line="#6E5A44",
    ink="#2B2118", text_2="#4A3A2C", text_3="#574533",
    primary="#C0422B", primary_2="#A83824", primary_3="#D2563D", on_ink="#FFFFFF", on_ink_2="#FFF1E8",
    volt="#F2D27A", volt_hi="#D9A02B", volt_wash="#FBF1D8", on_volt="#2B2118",
    kcal="#C0422B", kcal_deep="#A3341F", kcal_wash="#FBE6DF",
    protein="#8A3B5B", protein_deep="#7A3050", protein_wash="#F6E5EC",
    carbs="#D9A02B", carbs_deep="#7A5507", carbs_wash="#FAF0D5",
    fat="#3E8A78", fat_deep="#2B6B5E", fat_wash="#E0F0EA",
    ok="#2F6A2D", ok_wash="#E3F0DC", warn="#6E4C08", warn_wash="#FAEFD2",
    danger="#B23A26", danger_deep="#8E2B1B", danger_wash="#FBE4DE", shadow_rgb="43, 33, 24")


# ───────────────────────── art (all inline SVG) ─────────────────────────
def _hex(c):
    c = c.lstrip("#")
    return [int(c[i:i + 2], 16) / 255 for i in (0, 2, 4)]


def turb(size, fx, fy, color, slope, off, seed, octaves=2):
    """Thresholded fractal noise of ONE colour: alpha = slope*R + off (sparse fibres / grain / mottling).
    A low fx with a high fy stretches the noise sideways -> paper fibres."""
    r, g, b = _hex(color)
    return svg(size, size,
               f"<filter id='t' x='0' y='0' width='100%' height='100%' color-interpolation-filters='sRGB'>"
               f"<feTurbulence type='fractalNoise' baseFrequency='{fx} {fy}' numOctaves='{octaves}' seed='{seed}' stitchTiles='stitch'/>"
               f"<feColorMatrix values='0 0 0 0 {r:.3f} 0 0 0 0 {g:.3f} 0 0 0 0 {b:.3f} {slope} 0 0 0 {off}'/></filter>"
               f"<rect width='100%' height='100%' filter='url(#t)'/>")


def _star(cx, cy, R, r, n=5, rot=-90):
    pts = []
    for i in range(2 * n):
        rad = R if i % 2 == 0 else r
        a = math.radians(rot + i * 180 / n)
        pts.append(f"{cx + rad * math.cos(a):.1f},{cy + rad * math.sin(a):.1f}")
    return "<polygon points='" + " ".join(pts) + "'/>"


def _rough(seed=4, scale=3.5, gaps=2.3):
    """worn rubber-stamp ink: wobbly edges + speckled gaps"""
    return ("<filter id='r' x='-6%' y='-6%' width='112%' height='112%' color-interpolation-filters='sRGB'>"
            f"<feTurbulence type='fractalNoise' baseFrequency='.05' numOctaves='2' seed='{seed}' result='w'/>"
            f"<feDisplacementMap in='SourceGraphic' in2='w' scale='{scale}' xChannelSelector='R' yChannelSelector='G' result='d'/>"
            f"<feTurbulence type='fractalNoise' baseFrequency='.8' numOctaves='2' seed='{seed + 5}' result='s'/>"
            f"<feColorMatrix in='s' values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 -3.4 0 0 0 {gaps}' result='m'/>"
            "<feComposite in='d' in2='m' operator='in'/></filter>")


def stamp_seal(d, color, rot=0, seed=3, op=1):
    c = d / 2
    g = [f"<circle cx='{c}' cy='{c}' r='{c - 7}' fill='none' stroke='{color}' stroke-width='7'/>",
         f"<circle cx='{c}' cy='{c}' r='{c - 19}' fill='none' stroke='{color}' stroke-width='2.4'/>",
         f"<circle cx='{c}' cy='{c}' r='{c * .47}' fill='none' stroke='{color}' stroke-width='2.4'/>"]
    n = 30
    rr = (c - 19 + c * .47) / 2
    for i in range(n):
        a = 2 * math.pi * i / n
        g.append(f"<circle cx='{c + rr * math.cos(a):.1f}' cy='{c + rr * math.sin(a):.1f}' r='{d / 90:.1f}' fill='{color}'/>")
    g.append(f"<g fill='{color}'>{_star(c, c, c * .34, c * .14)}</g>")
    return svg(d, d, _rough(seed) + f"<g filter='url(#r)' opacity='{op}' transform='rotate({rot} {c} {c})'>{''.join(g)}</g>")


def stamp_post(w, h, color, rot=0, seed=6, op=1):
    """postmark: double ring with a star + wavy cancellation lines"""
    R = h / 2 - 8
    cx, cy = R + 8, h / 2
    g = [f"<circle cx='{cx}' cy='{cy}' r='{R}' fill='none' stroke='{color}' stroke-width='6'/>",
         f"<circle cx='{cx}' cy='{cy}' r='{R - 12}' fill='none' stroke='{color}' stroke-width='2.2'/>",
         f"<g fill='{color}'>{_star(cx, cy, R * .42, R * .17)}</g>",
         f"<path d='M{cx - R + 16} {cy + R * .55}H{cx + R - 16}M{cx - R + 16} {cy - R * .55}H{cx + R - 16}' stroke='{color}' stroke-width='2.2'/>"]
    x0 = cx + R + 10
    seg = 22
    for k in range(5):
        y = cy - R * .8 + k * R * .4
        n = int((w - x0 - 6) / seg)
        dd = f"M{x0} {y:.1f}" + "".join(f" q{seg / 4:.1f} {-6 if i % 2 == 0 else 6} {seg / 2:.1f} 0 t{seg / 2:.1f} 0" for i in range(n))
        g.append(f"<path d='{dd}' fill='none' stroke='{color}' stroke-width='3.2' stroke-linecap='round'/>")
    body = "".join(g)
    return svg(w, h, _rough(seed, 3, 2.4) + f"<g filter='url(#r)' opacity='{op}' transform='rotate({rot} {w / 2} {h / 2})'>{body}</g>")


# market doodles (24-box line icons) — added next to the shared ones
DOODLES.update({
    "tomato": "<circle cx='12' cy='13.6' r='7.4'/><path d='M8.4 7.6l1.9 1.5 1.7-2.5 1.7 2.5 1.9-1.5M12 6.4V3.6'/>",
    "mushroom": "<path d='M3.6 11.6a8.4 7.2 0 0 1 16.8 0z'/><path d='M9.4 11.6v6.6a2.6 2.6 0 0 0 5.2 0v-6.6'/>",
    "peapod": "<path d='M4 17.5c4.4-.8 10.4-5 15-12.5-.6 7.6-6 12.4-15 12.5z'/><circle cx='9.2' cy='14.4' r='1.3'/><circle cx='12.6' cy='12' r='1.3'/><circle cx='15.6' cy='9.2' r='1.3'/>",
    "onion": "<path d='M12 4.4c-1.6 3-6.2 5-6.2 9.4a6.2 6.2 0 0 0 12.4 0c0-4.4-4.6-6.4-6.2-9.4z'/><path d='M12 4.4V2.2M10 19.6c-1.6-2.2-1.6-6.4 2-10.6M14 19.6c1.6-2.2 1.6-6.4-2-10.6'/>",
    "radish": "<path d='M12 9.4c4 0 6 2.4 6 5.4 0 3.4-3.4 6.2-6 8-2.6-1.8-6-4.6-6-8 0-3 2-5.4 6-5.4z'/><path d='M12 9.4V5.2M12 6.4C10.2 3.4 8 3.2 6.8 3.8M12 6.4c1.8-3 4-3.2 5.2-2.6'/>",
    "bread": "<path d='M4 12.4c0-4.2 3.6-6.2 8-6.2s8 2 8 6.2V18H4z'/><path d='M8.2 9.4l1.6 2.2M12 8.8l1.6 2.2M15.8 9.4l1.6 2.2'/>",
    "bottle": "<path d='M10 3h4v3.2l2 3V21H8V9.2l2-3z'/><path d='M8 12.6h8M8 16.6h8'/>",
    "pricetag": "<path d='M3.4 12.2l8.4-8.4h8.4v8.4l-8.4 8.4z'/><circle cx='16' cy='8' r='1.5'/>",
    "basket": "<path d='M3 10.4h18l-2.2 9.4H5.2z'/><path d='M7.4 10.4l4.6-6 4.6 6M9 13.6v3.4M12 13.6v3.4M15 13.6v3.4'/>",
})


def scatter_tile(names, size=440, color="#4A2F17", op=.3, sw=1.6, scale=1.15, seed=5, mind=86):
    """doodles at random spots (min distance, wrapped at the edges so the tile repeats seamlessly)"""
    rnd = random.Random(seed)
    pts, tries = [], 0
    while len(pts) < len(names) and tries < 20000:
        tries += 1
        x, y = rnd.uniform(0, size), rnd.uniform(0, size)
        if all(min(abs(x - a), size - abs(x - a)) ** 2 + min(abs(y - b), size - abs(y - b)) ** 2 >= mind * mind for a, b in pts):
            pts.append((x, y))
    body = []
    for (x, y), nme in zip(pts, names):
        ang, sc = rnd.uniform(-38, 38), scale * rnd.uniform(.85, 1.2)
        g = doodle(nme, color, sw / sc, op)
        for ox in (-size, 0, size):
            for oy in (-size, 0, size):
                cx, cy = x + ox, y + oy
                if -22 < cx < size + 22 and -22 < cy < size + 22:
                    body.append(f"<g transform='translate({cx:.1f} {cy:.1f}) rotate({ang:.1f}) scale({sc:.2f}) translate(-12 -12)'>{g}</g>")
    return svg(size, size, "".join(body))


def twine(w=60, h=84):
    """baker's twine (red/white) leaving the price-tag hole towards the top-left"""
    d = f"M40 {h - 16} C30 {h - 22} 17 {h - 34} 15 {h - 48} S12 12 3 0"
    knot = f"<ellipse cx='40' cy='{h - 16}' rx='4.2' ry='3.2' fill='#F1E4CE' stroke='#8E2B1B' stroke-width='1'/>"
    return svg(w, h, f"<path d='{d}' fill='none' stroke='#F4E9D6' stroke-width='3.6' stroke-linecap='round'/>"
                     f"<path d='{d}' fill='none' stroke='{TOMATO}' stroke-width='3.6' stroke-dasharray='3.2 3.2' stroke-linecap='butt'/>" + knot)


def barcode(w=240, h=44, seed=9, color=INK):
    rnd = random.Random(seed)
    x, bars = 4.0, []
    while x < w - 6:
        bw = rnd.choice([1, 1, 1.6, 2, 2.6, 3.4])
        if x + bw > w - 4:
            break
        tall = h if rnd.random() > .08 else h - 6
        bars.append(f"<rect x='{x:.1f}' y='0' width='{bw}' height='{tall}'/>")
        x += bw + rnd.choice([1.2, 1.6, 2, 2.4, 3.2])
    return svg(w, h, f"<g fill='{color}'>{''.join(bars)}</g>")


def awning(w=44, red=TOMATO, cream=CREAM, rail="#5B3A22"):
    """market awning tile (repeat-x): wooden rail, red/cream stripes, two-colour scallops"""
    s = w / 2
    top, body = 5, 15
    r = s / 2
    h = top + body + r + 2
    p = [f"<rect x='0' y='{top}' width='{s}' height='{body}' fill='{red}'/>",
         f"<rect x='{s}' y='{top}' width='{s}' height='{body}' fill='{cream}'/>",
         f"<path d='M0 {top + body} a{r} {r} 0 0 0 {s} 0z' fill='{red}'/>",
         f"<path d='M{s} {top + body} a{r} {r} 0 0 0 {s} 0z' fill='{cream}'/>",
         # cloth folds: a darker edge on each stripe and the shadow under the rail
         f"<rect x='{s - 2.5}' y='{top}' width='2.5' height='{body + r * .7}' fill='#000' opacity='.07'/>",
         f"<rect x='{w - 2.5}' y='{top}' width='2.5' height='{body + r * .7}' fill='#000' opacity='.07'/>",
         f"<rect x='0' y='{top}' width='{w}' height='3' fill='#000' opacity='.16'/>",
         f"<path d='M0 {top + body} a{r} {r} 0 0 0 {s} 0M{s} {top + body} a{r} {r} 0 0 0 {s} 0' fill='none' stroke='#5B2014' stroke-opacity='.35' stroke-width='1'/>",
         f"<rect x='0' y='0' width='{w}' height='{top}' fill='{rail}'/>",
         f"<rect x='0' y='0' width='{w}' height='1.4' fill='#fff' opacity='.18'/>"]
    return svg(w, h, "".join(p))


CHECK_W = svg(14, 14, "<path d='M2.6 7.4l3 3 5.8-6.6' stroke='#fff' stroke-width='2.4' fill='none' stroke-linecap='round' stroke-linejoin='round'/>")
STAMP_OK = svg(34, 34, _rough(2, 1.2, 2.7) + f"<circle cx='17' cy='17' r='15.6' fill='{PAPER}'/>"
               f"<g filter='url(#r)'><circle cx='17' cy='17' r='14.6' fill='none' stroke='{TOMATO}' stroke-width='2.6'/>"
               f"<circle cx='17' cy='17' r='10.6' fill='none' stroke='{TOMATO}' stroke-width='1.2'/>"
               f"<path d='M11.4 17.2l3.8 3.8 7.4-8.2' stroke='{TOMATO}' stroke-width='3.4' fill='none' stroke-linecap='round' stroke-linejoin='round'/></g>")
TAB_RING = svg(88, 58, _rough(7, 1.6, 2.5) +
               f"<g filter='url(#r)' fill='none' stroke='{TOMATO}'><ellipse cx='44' cy='29' rx='41.5' ry='25.5' stroke-width='3'/>"
               f"<ellipse cx='44' cy='29' rx='37' ry='21' stroke-width='1.2'/></g>")
TAG_BULLET = svg(18, 14, f"<path d='M1 7l5-5.6h10.4v11.2H6z' fill='{MUSTARD}' stroke='{INK}' stroke-width='1.4' stroke-linejoin='round'/><circle cx='6.6' cy='7' r='1.6' fill='{PAPER}' stroke='{INK}' stroke-width='1'/>")

BG_STAMP_A = uri(stamp_seal(240, "#5A3A1E", rot=-16, seed=3, op=.62))
BG_STAMP_B = uri(stamp_seal(200, "#A9442C", rot=22, seed=8, op=.6))
BG_POST = uri(stamp_post(360, 150, "#5A3A1E", rot=-8, seed=6, op=.6))
BG_DOODLE = uri(scatter_tile(["carrot", "tomato", "wheat", "peapod", "apple", "mushroom", "pepper", "onion", "fish",
                              "radish", "cherry", "bread", "lemon", "pricetag", "leaf", "basket"],
                             size=440, color="#4A2F17", op=.32, sw=1.6, scale=1.2, seed=12, mind=92))
TWINE = uri(twine())
BARCODE = uri(barcode())
FIBRE_D = uri(turb(300, .035, .55, "#5C3A1A", 2.2, -1.42, 7))
FIBRE_L = uri(turb(260, .03, .5, "#FFF3DC", 2.4, -1.55, 21))
GRAIN = uri(turb(160, .85, .85, "#4A2F17", 1.0, -.42, 3))
FLECK = uri(turb(240, .32, .32, "#3C2410", 3.0, -2.22, 17))
MOTTLE = uri(turb(520, .004, .007, "#7A5330", .8, -.32, 11, 3))
AWNING = uri(awning())

KRAFT_BG = (
    f"{BG_STAMP_A} no-repeat right -92px top 46% / 240px 240px, "
    f"{BG_STAMP_B} no-repeat left -80px top 74% / 200px 200px, "
    f"{BG_POST} no-repeat right -70px bottom 7% / 330px auto, "
    f"{BG_DOODLE} repeat 0 0 / 440px 440px, "
    # paper-bag creases: one vertical, one horizontal (shaded side + bright ridge)
    "linear-gradient(90deg, rgba(92,58,26,0) calc(23% - 40px), rgba(92,58,26,.13) calc(23% - 1px), rgba(255,246,226,.30) 23%, rgba(255,246,226,0) calc(23% + 7px)), "
    "linear-gradient(180deg, rgba(92,58,26,0) calc(29% - 36px), rgba(92,58,26,.12) calc(29% - 1px), rgba(255,246,226,.28) 29%, rgba(255,246,226,0) calc(29% + 6px)), "
    f"{FIBRE_D} repeat 0 0 / 300px 300px, {FIBRE_L} repeat 41px 97px / 260px 260px, {FLECK} repeat 0 0 / 240px 240px, "
    f"{GRAIN} repeat 0 0 / 160px 160px, {MOTTLE} repeat 0 0 / 520px 520px, "
    "radial-gradient(130% 95% at 50% 38%, rgba(92,58,26,0) 52%, rgba(92,58,26,.28) 100%), "
    "linear-gradient(180deg, #D7BC94 0%, #D2B68E 45%, #CBAD84 100%)"
)

ZZ = ("conic-gradient(from -45deg at bottom, #0000, #000 1deg 89deg, #0000 90deg) 50% 100% / 14px 51% repeat-x, "
      "conic-gradient(from 135deg at top, #0000, #000 1deg 89deg, #0000 90deg) 50% 0 / 14px 51% repeat-x")
ZZ_TOP = ("conic-gradient(from 135deg at top, #0000, #000 1deg 89deg, #0000 90deg) 50% 0 / 14px 51% repeat-x, "
          "linear-gradient(#000 0 0) 0 100% / 100% 51% no-repeat")
NOTCH = ("radial-gradient(circle 7px at 0 50%, #0000 96%, #000) 0 0 / 51% 100% no-repeat, "
         "radial-gradient(circle 7px at 100% 50%, #0000 96%, #000) 100% 0 / 51% 100% no-repeat")
NOTCH_S = ("radial-gradient(circle 6px at 0 50%, #0000 95%, #000) 0 0 / 51% 100% no-repeat, "
           "radial-gradient(circle 6px at 100% 50%, #0000 95%, #000) 100% 0 / 51% 100% no-repeat")

TOKENS = (
    '--font-display:"Oswald","Arial Narrow",Arial,sans-serif;'
    '--font-body:"Source Sans 3",system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;'
    '--font-label:"Oswald","Arial Narrow",Arial,sans-serif;'
    '--mono:"IBM Plex Mono",ui-monospace,"SFMono-Regular",Menlo,monospace;'
    "--r-sm:4px;--r-md:6px;--r-lg:8px;--r-xl:10px;--r-ctl:6px;--pill:6px;"
    "--shadow-1:0 1px 0 rgba(43,33,24,.16),0 10px 18px -10px rgba(43,33,24,.5);--shadow-2:0 26px 56px -20px rgba(43,33,24,.62);"
    "--fw-display:700;--fw-fig:600;--fw-btn:600;--fw-label:600;--fw-hero:700;"
    "--ls-display:.015em;--ls-btn:.06em;--ls-label:.05em;--tt-display:uppercase;--tt-btn:uppercase;--tt-label:uppercase;"
    "--fs-label:14px;--fs-cap:14px;--lh-display:1.08;"
    "--hero-k:7.3;--hero-max:64px;"
    f"--zz:{ZZ};--zz-top:{ZZ_TOP};--notch:{NOTCH};--notch-s:{NOTCH_S};"
    "--hole:radial-gradient(circle 6px at 14px 50%, #E9DDC9 0 2.6px, #8C7456 2.8px 3.8px, #D9C6A6 4px 5.6px, #0000 5.9px);"
    "--hole-top:radial-gradient(circle 6px at 14px 14px, #E9DDC9 0 2.6px, #8C7456 2.8px 3.8px, #D9C6A6 4px 5.6px, #0000 5.9px);"
)

CSS = r"""
/* ═════════ F · Рынок ═════════ */
html{background:#D2B68E}
body{background:transparent;color:#2B2118;font-weight:400}
body::before{content:"";position:fixed;inset:0;z-index:-1;pointer-events:none;background:__KRAFT__}
::selection{background:#F2D27A;color:#2B2118}
:focus-visible{outline:3px solid #2B2118;outline-offset:2px;box-shadow:0 0 0 6px rgba(242,210,122,.85)}
a{text-decoration-color:#C0422B}

/* ── top bar ── */
.topbar__menu-btn{width:44px;height:44px;border-radius:50%;background:#FFFEFA;color:#2B2118;
  box-shadow:inset 0 0 0 2px #2B2118,inset 0 0 0 4px #FFFEFA,inset 0 0 0 5.2px rgba(43,33,24,.35),0 2px 0 #2B2118}
.topbar__menu-btn:active{transform:translateY(2px);box-shadow:inset 0 0 0 2px #2B2118,inset 0 0 0 4px #FFFEFA,inset 0 0 0 5.2px rgba(43,33,24,.35)}
.topbar__brand{color:#2B2118;letter-spacing:.06em}
@media(max-width:389px){.topbar__brand{font-size:20px;letter-spacing:.03em}}
.topbar__brand-mark{width:32px;height:32px;border-radius:5px;background:#C0422B;color:#fff;transform:rotate(-4deg);
  box-shadow:inset 0 0 0 2px #C0422B,inset 0 0 0 3.5px rgba(255,255,255,.75),0 2px 0 #8E2B1B}
@@PROFILE@@{height:44px;padding:0 14px 0 30px;border-radius:6px;background:var(--hole),#FFFEFA;color:#2B2118;
  box-shadow:inset 0 0 0 2px #2B2118,0 2px 0 #2B2118;font:600 15px/1 var(--font-display);letter-spacing:.06em;text-transform:uppercase}
.topbar__profile-avatar{width:26px;height:26px;background:#C0422B;color:#fff}
.topbar__offline{border-radius:4px;box-shadow:inset 0 0 0 1.5px currentColor}

/* ── hero: market awning over a cream signboard ── */
.hero{overflow:visible;border-radius:0;background:none;color:#2B2118;box-shadow:none}
.hero::before{content:"";position:relative;z-index:2;margin:0 0 -14px;height:33px;border-radius:5px 5px 0 0;
  background:__AWNING__ repeat-x 50% 0 / 44px 33px;filter:drop-shadow(0 3px 2px rgba(43,33,24,.32))}
.hero::after{content:none}
.hero__texto{position:relative;margin:0 10px;padding:21px 12px 10px;border-radius:0 0 6px 6px;
  background:radial-gradient(circle 3px at 13px calc(100% - 13px),#8C7456 0 2.2px,#0000 2.6px),radial-gradient(circle 3px at calc(100% - 13px) calc(100% - 13px),#8C7456 0 2.2px,#0000 2.6px),
    linear-gradient(180deg,#FFFDF7,#FBF3E2);
  box-shadow:inset 0 0 0 2px #2B2118,inset 0 0 0 5px #FFFCF3,inset 0 0 0 6.2px rgba(43,33,24,.45),0 3px 0 #2B2118,0 16px 22px -12px rgba(43,33,24,.55)}
.hero__nombre{color:#2B2118;letter-spacing:.13em;padding-left:.13em;line-height:.92;text-shadow:2px 2px 0 rgba(192,66,43,.30)}
@container (min-width:600px){.hero__texto{padding:22px 32px 13px}}
@media(min-width:700px){.hero__texto{width:min(480px,86%);margin:0 auto}}

/* ── headings on the kraft ── */
h2{color:#2B2118}
h2 em{display:inline-block;padding:.02em .2em 0;margin:0 .04em;background:#C0422B;color:#fff;transform:rotate(-2deg);
  box-shadow:0 2px 0 #8E2B1B;border-radius:3px}
.eyebrow{color:#4A3A2C;font-size:15px;font-weight:600}
@media(max-width:389px){.output-top,.shopping-panel__head,.nocook-panel__head{flex-wrap:wrap}.output-top .badge,.shopping-panel__head .badge{margin-bottom:0}}
.badge{height:32px;padding:0 10px;border-radius:4px;background:#F2D27A;color:#2B2118;box-shadow:inset 0 0 0 1.5px #2B2118,0 2px 0 #2B2118}
.badge svg{color:#2B2118}

/* section labels: receipt header between dashed rules */
.form-section-label{justify-content:center;gap:12px;color:#2B2118;font:600 16px/1 var(--font-display);letter-spacing:.16em;text-transform:uppercase}
.form-section-label::before,.form-section-label::after{content:"";flex:1 1 0;width:auto;height:0;background:none;box-shadow:none;transform:none;border-top:2px dashed rgba(43,33,24,.5)}
.budget-group-label{gap:10px;color:#2B2118;font:600 15px/1.1 var(--font-display);letter-spacing:.06em}
.budget-group-label::after{content:"";flex:1 1 auto;height:0;border-top:2px dotted rgba(43,33,24,.45)}
.field>label,.budget-custom-field>label{color:#4A3A2C}
.field-hint{color:#574533;font-size:14px}

/* ── order slip (form panel): paper with torn zig-zag edges ── */
@@PANEL@@{position:relative;isolation:isolate;background:none;box-shadow:none;border-radius:0;padding-top:28px;padding-bottom:20px;
  filter:drop-shadow(0 1px 0 rgba(43,33,24,.22)) drop-shadow(0 12px 12px rgba(43,33,24,.2))}
@@PANEL@@::before{content:"";position:absolute;inset:0;z-index:-1;background:linear-gradient(180deg,#FFFEFA,#FFFCF5);-webkit-mask:var(--zz);mask:var(--zz)}
.actions{background:linear-gradient(to top,#FFFDF8 72%,rgba(255,253,248,0))}

/* ── fields ── */
@@FIELD@@{background-color:#FFFEFA;border:2px solid var(--field-line);border-radius:4px;color:#2B2118;font-family:var(--mono);font-weight:500}
@@FIELD@@:focus{border-color:#2B2118;background-color:#fff;box-shadow:0 0 0 4px rgba(242,210,122,.7)}
:where(input,select,textarea)::placeholder{color:#6E5A44}

/* steppers: a mono read-out between two coin tokens */
@@STEP@@{background:#FFFEFA;border:2px solid var(--field-line);border-radius:6px}
@@STEP@@:focus-within{border-color:#2B2118;background:#fff;box-shadow:0 0 0 4px rgba(242,210,122,.6)}
.paso-a-paso input{font-family:var(--mono);font-weight:600;color:#2B2118;letter-spacing:-.02em}
.paso-a-paso input[type="number"]{border:0;background:transparent;box-shadow:none;padding:0}
@media(min-width:390px){.paso-a-paso input[type="number"]{font-size:24px;min-height:44px}}
@@STEP_BTN@@{border-radius:50%;background:radial-gradient(circle at 50% 38%,#FFFEFA 0 40%,#F2E6D0 100%);color:#2B2118;font-weight:600;
  box-shadow:inset 0 0 0 2px #2B2118,inset 0 0 0 4.5px #FFFBF2,inset 0 0 0 5.8px rgba(43,33,24,.5),0 2px 0 #2B2118;transition:transform .08s ease,box-shadow .08s ease}
@@STEP_BTN@@:active{transform:translateY(2px);box-shadow:inset 0 0 0 2px #2B2118,inset 0 0 0 4.5px #FFFBF2,inset 0 0 0 5.8px rgba(43,33,24,.5)}
@@STEP_PLUS@@{background:radial-gradient(circle at 50% 38%,#4C8D48 0 40%,#356B32 100%);color:#fff;
  box-shadow:inset 0 0 0 2px #24521F,inset 0 0 0 4.5px #3E7B3B,inset 0 0 0 5.8px rgba(255,255,255,.6),0 2px 0 #24521F}
@@STEP_PLUS@@:active{box-shadow:inset 0 0 0 2px #24521F,inset 0 0 0 4.5px #3E7B3B,inset 0 0 0 5.8px rgba(255,255,255,.6)}

/* ── chips = paper labels with a punched hole; selected = stamped ── */
@@CHIP@@{position:relative;background:var(--hole),#FFFEFA;border:1.5px solid var(--field-line);border-radius:6px;color:#2B2118;
  box-shadow:0 2px 0 rgba(43,33,24,.22);transition:border-color .15s ease,background-color .15s ease}
@@CHIP@@:hover{border-color:#2B2118}
@@CHIP_ON@@{background:var(--hole),#FCEDE3;border:2px solid #2B2118;color:#2B2118;box-shadow:0 2px 0 #2B2118}
.baldosa.is-activa::after,.visually-hidden:checked + .budget-chip::after,.visually-hidden:checked + .date-chip::after,.onboarding__choice.is-selected::after,.pantry-meal-chip--cooked::after{
  content:"";position:absolute;top:-12px;right:-9px;width:32px;height:32px;border-radius:50%;background:__STAMP_OK__ center / 32px no-repeat;transform:rotate(-14deg);box-shadow:none}
.baldosa{padding:8px 10px 8px 28px;font:500 16px/1.2 var(--font-display);letter-spacing:.015em}
.onboarding__choice-label{font:500 17px/1.2 var(--font-display);letter-spacing:.015em}
@media(max-width:389px){.baldosa{padding-left:24px;padding-right:8px;background:radial-gradient(circle 6px at 12px 50%, #E9DDC9 0 2.6px, #8C7456 2.8px 3.8px, #D9C6A6 4px 5.6px, #0000 5.9px),#FFFEFA}
  .baldosa.is-activa{background:radial-gradient(circle 6px at 12px 50%, #E9DDC9 0 2.6px, #8C7456 2.8px 3.8px, #D9C6A6 4px 5.6px, #0000 5.9px),#FCEDE3}}
@media(max-width:339px){.baldosas{grid-template-columns:minmax(0,1fr)}.baldosa:last-child:nth-child(odd){grid-column:auto}}
.budget-chip{padding:12px 10px 12px 26px;background:var(--hole-top),#FFFEFA}
.visually-hidden:checked + .budget-chip{background:var(--hole-top),#FCEDE3}
.budget-chip__title{color:#4A3A2C;font:500 15px/1.15 var(--font-display);letter-spacing:.01em;text-transform:none}
.budget-chip__amount{font-family:var(--font-display);font-weight:700;color:#2B2118;white-space:nowrap}
/* narrow phones: the price labels become one-line rows (title left, price right) */
@media(max-width:389px){
  .budget-modes{grid-template-columns:minmax(0,1fr)}
  .budget-chip,.budget-chip--custom{flex-direction:row;align-items:center;justify-content:space-between;min-height:56px;padding:8px 14px 8px 30px;background:var(--hole),#FFFEFA}
  .visually-hidden:checked + .budget-chip{background:var(--hole),#FCEDE3}
}
.visually-hidden:checked + .budget-chip .budget-chip__title{color:#4A3A2C}
.visually-hidden:checked + .budget-chip .budget-chip__amount,.onboarding__choice.is-selected .onboarding__choice-amount{color:#A3341F}
.onboarding__choice{padding:12px 16px 12px 30px}
.onboarding__choice-amount{font-family:var(--font-display);font-weight:700}
.onboarding__choice.is-selected .onboarding__choice-note{color:#4A3A2C}
.date-chip{padding:0 18px 0 30px}
.date-chip--today::after{background:#C0422B;box-shadow:none}
.pantry-meal-chip{padding-left:30px}
.pantry-meal-chip--cooked .pantry-meal-chip__time{color:#A3341F}
.pantry-meal-chip__time{font-family:var(--mono)}

/* segmented = a strip of tickets */
@@SEG@@{gap:0;padding:0;border:0;border-radius:6px;background:#FBF3E2;box-shadow:inset 0 0 0 2px #2B2118,0 2px 0 #2B2118;overflow:hidden}
@@SEG_BTN@@{position:relative;border-radius:0;background:transparent;color:#2B2118;
  background-image:radial-gradient(circle 4px at 0 0,#FFFEFA 0 3.6px,#2B2118 3.8px 4.6px,#0000 5px),radial-gradient(circle 4px at 0 100%,#FFFEFA 0 3.6px,#2B2118 3.8px 4.6px,#0000 5px)}
@@SEG_BTN@@ + @@SEG_BTN@@{border-left:2px dashed rgba(43,33,24,.55)}
@@SEG_BTN@@:first-child{background-image:none}
@@SEG_ON@@{background-color:#C0422B;color:#fff;box-shadow:inset 0 0 0 2px #2B2118}
@@SEG_ON@@::after{content:"";position:absolute;inset:6px 8px;border:1.5px dashed rgba(255,241,232,.75);border-radius:3px;pointer-events:none}

/* ── buttons ── */
/* primary: a tomato ticket with punched notches and a dashed inner line (drawn by the pseudo-elements) */
@@BTN_P@@,@@BTN_CTA@@{position:relative;isolation:isolate;border:0;border-radius:6px;background:none;color:#fff;
  filter:drop-shadow(0 3px 0 #7E2414) drop-shadow(0 9px 8px rgba(43,33,24,.28));transition:transform .08s ease,filter .08s ease}
@@BTN_P@@::before,@@BTN_CTA@@::before{content:"";position:absolute;inset:0;z-index:-1;border-radius:6px;
  background:linear-gradient(180deg,#CB4A32 0%,#BC3F28 100%);-webkit-mask:var(--notch);mask:var(--notch)}
@@BTN_P@@::after,@@BTN_CTA@@::after{content:"";position:absolute;inset:5px 15px;border:1.5px dashed rgba(255,236,224,.78);border-radius:3px;pointer-events:none}
@@BTN_P@@ svg,@@BTN_CTA@@ svg{color:#FFE7C7}
@@BTN_P@@:hover,@@BTN_CTA@@:hover{background:none;border-color:transparent;filter:drop-shadow(0 3px 0 #7E2414) drop-shadow(0 11px 9px rgba(43,33,24,.32)) brightness(1.04)}
@@BTN_P@@:active,@@BTN_CTA@@:active{transform:translateY(2px);filter:drop-shadow(0 1px 0 #7E2414) drop-shadow(0 4px 4px rgba(43,33,24,.24))}
@@BTN_P@@:disabled,@@BTN_CTA@@:disabled{background:none;color:#6B5A47;filter:drop-shadow(0 2px 0 #B9A688)}
@@BTN_P@@:disabled::before,@@BTN_CTA@@:disabled::before{background:#E6DAC6}
@@BTN_P@@:disabled::after,@@BTN_CTA@@:disabled::after{border-color:rgba(107,90,71,.45)}
.pantry-active-card__buy-btn--secondary{color:#2B2118}
.pantry-active-card__buy-btn--secondary::before{background:#FBF3E2}
.pantry-active-card__buy-btn--secondary::after{border-color:rgba(43,33,24,.45)}
.pantry-active-card__buy-btn--secondary svg{color:#2B2118}
.onboarding__btn--big{min-height:60px}

/* secondary: a cream coupon (solid ink edge + dashed cut line) */
@@BTN_S@@{position:relative;border:2px solid #2B2118;border-radius:6px;background:#FBF3E2;color:#2B2118;box-shadow:0 3px 0 #2B2118;
  transition:transform .08s ease,box-shadow .08s ease}
@@BTN_S@@::after{content:"";position:absolute;inset:4px;border:1.5px dashed rgba(43,33,24,.42);border-radius:3px;pointer-events:none}
@@BTN_S@@:hover{background:#FFF8EA}
@@BTN_S@@:active{transform:translateY(3px);box-shadow:0 0 0 #2B2118}
@@BTN_S@@ svg{color:#C0422B}
@@BTN_S@@:disabled{border-color:#B9A688;color:#6B5A47;box-shadow:0 3px 0 #B9A688}
@media(max-width:359px){.actions-secondary .btn-secondary{flex-wrap:wrap;row-gap:0;column-gap:6px;padding:4px 8px;font-size:15px;letter-spacing:.03em}.actions-secondary .btn-secondary svg{display:none}}
.actions-secondary #resetBtn{border:0;box-shadow:none;background:none;color:#4A3A2C;text-decoration:underline;text-decoration-color:#C0422B;text-decoration-thickness:2px;text-underline-offset:4px;font:600 var(--fs-sm)/1 var(--font-body);letter-spacing:0;text-transform:none}
.actions-secondary #resetBtn::after{content:none}

/* small: a mini label */
@@BTN_SM@@{border:1.5px solid #2B2118;border-radius:6px;background:#FFFEFA;color:#2B2118;box-shadow:0 2px 0 #2B2118;transition:transform .08s ease,box-shadow .08s ease}
@@BTN_SM@@:hover{background:#FBF3E2;border-color:#2B2118;color:#2B2118}
@@BTN_SM@@:active{transform:translateY(2px);box-shadow:0 0 0 #2B2118}
.pantry-active-card__delete{color:#8E2B1B;border-color:#8E2B1B;box-shadow:0 2px 0 #8E2B1B}
.pantry-active-card__delete--armed{background:#B23A26;color:#fff}
@@BTN_DANGER@@{border-radius:6px;background:#B23A26;box-shadow:0 3px 0 #7A2213}
@@BTN_ICON@@{border-radius:50%;background:#FFFEFA;color:#2B2118;box-shadow:inset 0 0 0 2px #2B2118,0 2px 0 #2B2118}
.link-btn,.pantry-link-btn,.auth-dialog__switch-btn,.onboarding__link,.site-footer__link,.onboarding__skip,.onboarding__skip-questions,.tour__skip{text-decoration-color:#C0422B}
.traduccion-aviso{border-radius:4px;box-shadow:var(--shadow-1),inset 4px 0 0 #C0422B}

/* ── "your data" strip: a shelf label ── */
.resumen-datos{border-radius:6px;padding:10px 10px 10px 32px;background:var(--hole),#FFFEFA;box-shadow:0 1px 0 rgba(43,33,24,.2),var(--shadow-1)}
.resumen-datos__texto{color:#4A3A2C}

/* ── scoreboard = a nutrition-facts label ── */
.nutrition-strip{grid-template-columns:minmax(0,1fr);gap:0;padding:0 14px 4px;border-radius:3px;background:#FFFEFA;color:#2B2118;
  border:2px solid #2B2118;border-top:12px solid #2B2118;box-shadow:0 2px 0 rgba(43,33,24,.25),0 16px 24px -14px rgba(43,33,24,.6)}
.summary-card{display:grid;grid-template-columns:minmax(0,1fr) auto;grid-template-areas:"h big" "sub big";align-items:center;column-gap:12px;
  padding:9px 0 10px;border:0!important;border-top:1.5px solid #2B2118!important;border-radius:0;background:none;color:#2B2118}
.summary-card h3{grid-area:h;flex-direction:row;align-items:center;gap:8px;color:#2B2118}
.summary-card .icon-badge{width:14px;height:14px;border-radius:2px;flex:none}
.summary-card .icon-badge svg{display:none}
.summary-card--protein .icon-badge{background:#8A3B5B}.summary-card--carbs .icon-badge{background:#D9A02B}.summary-card--fat .icon-badge{background:#3E8A78}
.summary-card .big{grid-area:big;margin:0;font-family:var(--mono);font-weight:600;font-size:var(--fs-fig-m);text-align:right}
.summary-card .sub{grid-area:sub;margin-top:3px;color:#4A3A2C}
.summary-card--calories{grid-template-areas:"h big" "sub big";padding:10px 0 12px;border-top:0!important;border-bottom:8px solid #2B2118!important}
.summary-card--calories h3{font:700 24px/1 var(--font-display);letter-spacing:.03em}
.summary-card--calories .icon-badge{width:26px;height:26px;border-radius:4px;background:#C0422B;color:#fff}
.summary-card--calories .icon-badge svg{display:block}
.summary-card--calories .big{font-family:var(--font-display);font-weight:700;color:#2B2118;letter-spacing:.01em}
.summary-card--calories .big .u{font:500 20px/1 var(--font-display);color:#4A3A2C}
.summary-card--protein{border-top:0!important}
.summary-card--protein .big{color:var(--protein-deep)}.summary-card--carbs .big{color:var(--carbs-deep)}.summary-card--fat .big{color:var(--fat-deep)}
.summary-card .big .u{font:600 16px/1 var(--font-display);color:#4A3A2C;margin-left:4px;letter-spacing:.02em}
.insights .icon-badge{background:#C0422B;color:#fff;border-radius:4px}
@container (min-width:620px){
  .nutrition-strip{grid-template-columns:minmax(0,1.05fr) minmax(0,1fr);column-gap:22px;padding:0 18px 6px}
  .summary-card--calories{grid-row:span 3;grid-template-columns:1fr;grid-template-areas:"h" "big" "sub";align-content:center;border-bottom:0!important;border-right:0!important;padding:14px 0}
  .summary-card--calories .big{text-align:left;font-size:var(--fs-fig-xl);margin-top:6px}
  .summary-card--protein{border-top:0!important}
  .summary-card--calories{box-shadow:22px 0 0 -20px #2B2118}
}

/* ── schedule: little tickets ── */
.schedule-timeline__row{filter:drop-shadow(0 1px 0 rgba(43,33,24,.22)) drop-shadow(0 6px 6px rgba(43,33,24,.18))}
.schedule-timeline__item{border:0;border-radius:4px;background:#FFFEFA;padding:12px 18px 13px;-webkit-mask:var(--notch-s);mask:var(--notch-s)}
.schedule-timeline__item--next{background:#F2D27A}
.schedule-timeline__time{font-family:var(--mono);font-weight:600;color:#2B2118}
.schedule-timeline__label{color:#4A3A2C}
.schedule-timeline__item--next .schedule-timeline__label{color:#2B2118}
.schedule-timeline__next-tag{top:10px;right:14px;padding:4px 7px;border-radius:3px;background:#C0422B;color:#fff}
.schedule-timeline__note{color:#4A3A2C}

/* ── day carousel ── */
.day-slide__n{color:#2B2118}
.day-slide__of{color:#4A3A2C;font-weight:600}
.day-slide__head::after{height:5px;border-radius:3px;background:repeating-linear-gradient(-55deg,#C0422B 0 4px,#FBF3E2 4px 8px);box-shadow:0 1px 0 rgba(43,33,24,.3)}
.days-carousel__hint{color:#4A3A2C;font-weight:600}
.days-carousel__dot::before{width:10px;height:10px;border-radius:50%;background:#FFFEFA;box-shadow:inset 0 0 0 2px #2B2118}
.days-carousel__dot.is-active::before{width:24px;border-radius:5px;background:#C0422B;box-shadow:inset 0 0 0 2px #2B2118}
.days-carousel__arrow{background:#FFFEFA;color:#2B2118;box-shadow:inset 0 0 0 2px #2B2118,0 3px 0 #2B2118}

/* ── meal card = a receipt ── */
.meals-grid{filter:drop-shadow(0 1px 0 rgba(43,33,24,.24)) drop-shadow(0 10px 10px rgba(43,33,24,.2))}
.meal-card{border-radius:0;box-shadow:none;background:#FFFEFA;-webkit-mask:var(--zz);mask:var(--zz);padding:8px 0 10px}
.meal-card--empty{-webkit-mask:none;mask:none;border:2px dashed rgba(43,33,24,.45);background:rgba(255,254,250,.6)}
.meal-head{padding:16px 16px 14px}
.meal-time-badge{height:34px;padding:0 9px;border-radius:4px;background:#2B2118;color:#FFFEFA;font-family:var(--mono);font-weight:600}
.meal-kcal{font-family:var(--mono);color:#A3341F}
.meal-head h3{color:#2B2118}
.meal-items{border-top:2px dashed rgba(43,33,24,.4)}
.food-row{border-bottom:1.5px dashed #DCCDB6}
.food-name{display:flex;align-items:baseline;gap:6px}
.food-name::after{content:"";flex:1 1 auto;min-width:14px;height:0;border-bottom:2px dotted rgba(43,33,24,.42);margin-right:-6px}
.food-right>div:first-child{font-family:var(--mono);font-weight:600;color:#2B2118}
.food-meta{color:#4A3A2C}
.food-qty{color:#2B2118}
.food-qty__grams{color:#574533}
.food-cost{font-family:var(--mono);font-weight:600;color:#2B2118}
.food-cost--package{color:#4A3A2C}
.food-cost__tag{font-family:var(--font-body);font-weight:600;letter-spacing:0;text-transform:none;color:#574533}
@container (max-width:300px){
  .food-row{grid-template-areas:"name kcal" "meta meta" "use use" "pack pack" "buy buy"}
  .food-cost--usage{grid-area:use}
  .food-cost--package{grid-area:pack;justify-self:start}
}
.food-macro__badge,.food-purchase__badge,.verified-card__badge{display:inline-block;padding:1px 5px;border-radius:3px;background:none;color:#2F6A2D;
  box-shadow:inset 0 0 0 1.5px #2F6A2D;transform:rotate(-3deg);line-height:1.25}
@@WELL@@{border-radius:4px;background:#FBF6EC;box-shadow:none;border:1.5px dashed #CDBB9E}
.food-purchase{color:#2B2118}
.meal-footer{margin-top:12px;background:none;border-top:2px dashed rgba(43,33,24,.4);padding:14px 16px 12px}
.meal-footer>div{color:#4A3A2C}
.meal-footer>div::before{width:12px;height:12px;border-radius:2px;margin-bottom:6px}
.meal-footer>div:nth-child(1)::before{background:#8A3B5B}.meal-footer>div:nth-child(2)::before{background:#D9A02B}
.meal-footer>div:nth-child(3)::before{background:#3E8A78}.meal-footer>div:nth-child(4)::before{background:#C0422B}.meal-footer>div:nth-child(5)::before{background:#2B2118}
.meal-footer strong{font-family:var(--mono);color:#2B2118}
@container (max-width:310px){
  .meal-footer{gap:4px}
  .meal-footer>div{font-size:13px;letter-spacing:.01em;text-transform:none}
  .meal-footer strong{font-size:16px}
}
.meal-steps{border-top:2px dashed rgba(43,33,24,.4)}
.meal-steps__toggle{color:#2B2118}
.meal-steps__toggle::after{border-color:#2B2118}
.meal-steps__badge{border-radius:3px;box-shadow:inset 0 0 0 1.5px currentColor}
.meal-steps__list li::before{border-radius:50%;background:#FFFEFA;color:#2B2118;font-family:var(--mono);font-weight:600;box-shadow:inset 0 0 0 2px #2B2118}
.meal-make-ahead,.meal-cook-note{border-radius:4px;box-shadow:none;border:1.5px dashed rgba(110,76,8,.45)}

/* ── next-meal sticky = a ticket stub ── */
@media screen and (max-width:900px){
  .next-meal-sticky__btn{position:relative;isolation:isolate;border-radius:0;background:none;color:#2B2118;padding:8px 18px 8px 16px;
    box-shadow:none;filter:drop-shadow(0 1px 0 rgba(43,33,24,.3)) drop-shadow(0 8px 10px rgba(43,33,24,.28))}
  .next-meal-sticky__btn::before{content:"";position:absolute;inset:0;z-index:-1;border-radius:4px;background:#FFFEFA;-webkit-mask:var(--notch);mask:var(--notch)}
  .next-meal-sticky__eyebrow{padding:5px 8px;border-radius:3px;background:#C0422B;color:#fff}
  .next-meal-sticky__time{font-family:var(--mono);font-weight:600;color:#2B2118}
  .next-meal-sticky__label{padding-left:12px;border-left:2px dashed rgba(43,33,24,.45);color:#2B2118}
}

/* ── shopping ── */
.shopping-summary{filter:drop-shadow(0 1px 0 rgba(43,33,24,.24)) drop-shadow(0 9px 9px rgba(43,33,24,.2))}
.shopping-summary__stat{border-radius:5px;background:var(--hole-top),#FFFEFA;box-shadow:none;padding:30px 12px 12px}
.shopping-summary__stat span{color:#4A3A2C}
.shopping-summary__stat strong{font-family:var(--font-display);font-weight:700;color:#2B2118;font-size:24px;letter-spacing:.02em}
@media(max-width:389px){.shopping-summary__stat:not(:nth-child(2)){padding-left:10px;padding-right:8px}.shopping-summary__stat:not(:nth-child(2)) strong{font-size:21px}}
.shopping-summary__stat:nth-child(2){position:relative;padding:18px 18px 16px 44px;border-radius:6px;background:#C0422B;
  clip-path:polygon(24px 0,100% 0,100% 100%,24px 100%,0 50%);-webkit-mask:radial-gradient(circle 6px at 26px 50%,#0000 95%,#000);mask:radial-gradient(circle 6px at 26px 50%,#0000 95%,#000)}
.shopping-summary__stat:nth-child(2)::after{content:"";position:absolute;inset:6px 8px 6px 38px;border:1.5px dashed rgba(255,236,224,.7);border-radius:3px;pointer-events:none}
.shopping-summary__stat:nth-child(2) span{color:#FFF1E8}
.shopping-summary__stat:nth-child(2) strong{font-family:var(--font-display);font-weight:700;color:#fff;letter-spacing:.02em}
.shopping-progress__texto{color:#2B2118;font-weight:600}
.shopping-progress__barra{height:22px;padding:4px;border-radius:5px;box-shadow:inset 0 0 0 2px #2B2118,0 2px 0 #2B2118;
  background:repeating-linear-gradient(90deg,rgba(43,33,24,.6) 0 1.5px,#0000 1.5px 50px) 6px 100% / calc(100% - 12px) 9px no-repeat,
    repeating-linear-gradient(90deg,rgba(43,33,24,.4) 0 1px,#0000 1px 10px) 6px 100% / calc(100% - 12px) 5px no-repeat,#FFF8E8}
.shopping-progress__barra>span{border-radius:2px;background:repeating-linear-gradient(90deg,#C0422B 0 9px,#E8775E 9px 18px)}
@media(max-width:599px){
  .shopping-summary{position:relative}
  .shopping-summary::before{content:"";position:absolute;z-index:2;left:-14px;top:-16px;width:60px;height:84px;background:__TWINE__ no-repeat 0 0 / 60px 84px;pointer-events:none}
}
/* the whole list is ONE long receipt */
.shopping-list{position:relative;isolation:isolate;gap:0;padding:14px 14px 16px;
  filter:drop-shadow(0 1px 0 rgba(43,33,24,.24)) drop-shadow(0 10px 10px rgba(43,33,24,.2))}
.shopping-list::before{content:"";position:absolute;inset:0;z-index:-1;background:#FFFEFA;-webkit-mask:var(--zz);mask:var(--zz)}
.shopping-item{border-radius:0;background:none;box-shadow:none;border:0;border-bottom:1.5px dashed #D3C3AA;padding:12px 4px 14px 0}
.shopping-list::after{content:"";grid-column:1/-1;justify-self:center;width:min(64%,240px);height:42px;margin:14px 0 6px;background:__BARCODE__ center / 100% 100% no-repeat;opacity:.85}
.shopping-item.is-comprado{background:none}
.shopping-item__name{color:#2B2118}
.shopping-item__meta,.shopping-item__usage-price{color:#574533}
.shopping-item__price{font-family:var(--mono);color:#2B2118}
.shopping-item__check::before,.pantry-purchase-row__check::before{border:2px solid #2B2118;background:#FFFEFA;box-shadow:inset 0 0 0 2.5px #FFFEFA,inset 0 0 0 3.6px rgba(43,33,24,.35)}
.shopping-item__check[aria-checked="true"]::before,.pantry-purchase-row__check[aria-checked="true"]::before{background:#C0422B;border-color:#8E2B1B;box-shadow:inset 0 0 0 2.5px #C0422B,inset 0 0 0 3.6px rgba(255,255,255,.55)}
.shopping-item__check[aria-checked="true"]::after,.pantry-purchase-row__check[aria-checked="true"]::after{border-color:#fff}
.product-find-btn{border-radius:50%;background:#FBF3E2;box-shadow:inset 0 0 0 1.5px #2B2118}
.shopping-item__pantry{border-radius:3px}
.shopping-share-note{color:#2B2118}
.confirm-receipt{background:#FFFEFA;border:1.5px dashed #8C7456;color:#2B2118}

/* ── my plans ── */
.pantry-active{filter:drop-shadow(0 1px 0 rgba(43,33,24,.24)) drop-shadow(0 10px 10px rgba(43,33,24,.2))}
.pantry-active-card{border-radius:0;box-shadow:none;background:#FFFEFA;-webkit-mask:var(--zz);mask:var(--zz);padding:22px 16px 22px}
.pantry-active-card__date{font-family:var(--mono)}
.pantry-active-card__summary{color:#4A3A2C}
.pantry-history-row{border-radius:4px;background:#FFFEFA;box-shadow:var(--shadow-1)}
.pantry-history-heading{color:#2B2118}
.pantry-plans-empty{border:2px dashed rgba(43,33,24,.5);border-radius:6px;background:rgba(255,254,250,.55);color:#2B2118}
.pantry-meal-chips__label{color:#4A3A2C}

/* ── other paper ── */
.insights,.disclosure,.nocook-summary,.nocook-slot{border-radius:4px;background:#FFFEFA;box-shadow:0 1px 0 rgba(43,33,24,.2),var(--shadow-1)}
.insights{border-top:6px solid #2B2118}
.insights h3{color:#2B2118}
.insights li{color:#4A3A2C}
.insights li::before{width:9px;height:9px;border-radius:1px;background:#C0422B;box-shadow:none;transform:none;top:.5em}
.warning{border-radius:4px;box-shadow:none;border:1.5px dashed rgba(110,76,8,.55)}
.warning--error{border-color:rgba(142,43,27,.55)}
.meta .k{color:#574533;font-size:14px;font-weight:500;letter-spacing:.02em;text-transform:none}
.meta .v{font-family:var(--font-display);font-weight:600;font-size:20px;letter-spacing:.02em}
@media(max-width:359px){.meta-boxes{grid-template-columns:minmax(0,1fr);gap:6px}.meta{display:flex;align-items:baseline;justify-content:space-between;gap:10px}.meta .v{margin-top:0}}
.verified-card__price{font-family:var(--mono)}
.spinner-wrap{border-radius:4px}
.empty-icon{border-radius:6px;background:#C0422B;color:#fff}
.site-footer,.footer-note{color:#2B2118}
.footer-note{padding:16px 18px;background:#FFFEFA;color:#4A3A2C;font-size:14px;-webkit-mask:var(--zz);mask:var(--zz)}
.site-footer__link{color:#2B2118}
.site-footer__sep{color:#4A3A2C}
.disclosure__chevron{color:#2B2118}

/* ── tab bar = a receipt strip with a rubber-stamp ring on the active tab ── */
@media screen and (max-width:900px){
  body.con-pestanas .tabbar{border-radius:0;background:none;padding:12px 6px 10px;gap:2px;box-shadow:none;
    filter:drop-shadow(0 1px 0 rgba(43,33,24,.3)) drop-shadow(0 14px 16px rgba(43,33,24,.42))}
  body.con-pestanas .tabbar::before{content:"";position:absolute;inset:0;z-index:-1;-webkit-mask:var(--zz);mask:var(--zz);
    background:linear-gradient(90deg,rgba(43,33,24,.38) 55%,#0000 0) 0 9px / 9px 1.5px repeat-x,#FFFEFA}
  .tabbar__btn{min-height:60px;color:#4A3A2C;font:500 var(--fs-cap)/1.1 var(--font-display);letter-spacing:.03em;text-transform:none;background:transparent;border-radius:6px}
  .tabbar__btn>*{position:relative;z-index:1}
  .tabbar__btn.is-activa{background:transparent;color:#8E2B1B;font-weight:600}
  .tabbar__btn.is-activa .tabbar__texto{text-shadow:0 0 2px #FFFEFA,0 0 2px #FFFEFA,0 0 3px #FFFEFA}
  .tabbar__btn.is-activa::before{content:"";position:absolute;left:50%;top:50%;width:min(88px,100%);height:58px;transform:translate(-50%,-50%) rotate(-5deg);z-index:0;
    background:__TAB_RING__ center / 100% 100% no-repeat}
  .tabbar__cuenta{position:absolute;background:#C0422B;color:#fff;box-shadow:0 0 0 2px #FFFEFA;border-radius:50%;font-family:var(--mono);font-weight:600}
}

/* ── welcome + questions ── */
.onboarding{background:__AWNING__ repeat-x 50% 0 / 44px 33px,linear-gradient(rgba(43,33,24,.22),rgba(43,33,24,0)) 0 22px / 100% 18px no-repeat,__KRAFT__}
.onboarding__card{position:relative;isolation:isolate;background:none;box-shadow:none;border-radius:0;padding-top:30px;
  filter:drop-shadow(0 -2px 0 rgba(43,33,24,.12)) drop-shadow(0 -14px 22px rgba(43,33,24,.3))}
.onboarding__card::before{content:"";position:absolute;inset:0;z-index:-1;background:linear-gradient(180deg,#FFFEFA,#FFFBF3);-webkit-mask:var(--zz-top);mask:var(--zz-top)}
@media(min-width:640px){.onboarding__card{border-radius:0;filter:drop-shadow(0 2px 0 rgba(43,33,24,.18)) drop-shadow(0 22px 26px rgba(43,33,24,.35))}
  .onboarding__card::before{-webkit-mask:var(--zz);mask:var(--zz)}}
.onboarding__brand{justify-content:center;padding-bottom:14px;margin-bottom:16px;border-bottom:2px dashed rgba(43,33,24,.42)}
.onboarding__brand-mark{border-radius:5px;background:#C0422B;color:#fff;transform:rotate(-4deg);box-shadow:inset 0 0 0 2px #C0422B,inset 0 0 0 3.5px rgba(255,255,255,.75),0 2px 0 #8E2B1B}
.onboarding__brand-name{letter-spacing:.12em;color:#2B2118}
.onboarding__title{color:#2B2118}
@media(max-width:359px){.onboarding__title{font-size:30px}}
.onboarding__title-accent{display:inline;background:linear-gradient(transparent 58%,#F2D27A 58%,#F2D27A 92%,transparent 92%);padding:0 .06em}
.onboarding__summary li{color:#4A3A2C}
.onboarding__summary li::before{width:18px;height:14px;top:.18em;background:__TAG_BULLET__ center / contain no-repeat;box-shadow:none;transform:rotate(-8deg)}
.onboarding__summary strong{color:#2B2118}
.onboarding__check input{border:2px solid #2B2118;border-radius:4px;background:#FFFEFA}
.onboarding__check input:checked{background:#C0422B;border-color:#8E2B1B}
.onboarding__check input:checked::after{border-color:#fff}
.onboarding__skip,.onboarding__skip-questions{color:#2B2118}
@media(min-width:640px){.onboarding__link{min-height:40px}}
.onboarding__skip-note{color:#574533}
.onboarding__progress{height:18px;border-radius:4px;box-shadow:inset 0 0 0 2px #2B2118;padding:4px;
  background:repeating-linear-gradient(90deg,rgba(43,33,24,.4) 0 1px,#0000 1px 10px) 5px 100% / calc(100% - 10px) 5px no-repeat,#FFF8E8}
.onboarding__progress-bar{border-radius:2px;background:repeating-linear-gradient(90deg,#C0422B 0 9px,#E8775E 9px 18px)}
.onboarding__progress-label{color:#4A3A2C}
.onboarding__question{color:#2B2118}
.onboarding__hint{color:#4A3A2C}
.onboarding__number,.onboarding__time,.onboarding__text{background:#FFFEFA;border:2px solid var(--field-line);border-radius:6px}
.onboarding__number,.onboarding__time{font-family:var(--mono);font-weight:600}
.onboarding__answer .onboarding__number,.onboarding__answer .onboarding__time{font-size:40px;min-height:76px}
.onboarding__number:focus,.onboarding__time:focus,.onboarding__text:focus{border-color:#2B2118}
.onboarding__unit{color:#4A3A2C;font-family:var(--font-display)}

/* ── dialogs & tour: paper slips ── */
.auth-dialog,.ajustes-dialog{border-radius:0;background:#FFFEFA;-webkit-mask:var(--zz-top);mask:var(--zz-top);padding-top:6px}
@media(min-width:640px){.auth-dialog,.ajustes-dialog{border-radius:0;-webkit-mask:var(--zz);mask:var(--zz);padding-bottom:6px}}
.auth-dialog::backdrop,.ajustes-dialog::backdrop{background:rgba(43,33,24,.62)}
.ajustes-dialog__head{background:#FFFEFA;border-bottom:2px dashed rgba(43,33,24,.35)}
.ajustes-group + .ajustes-group{border-top:2px dashed rgba(43,33,24,.3)}
.ajustes-group__title{color:#2B2118}
.ajustes-group__hint{color:#574533}
.ajustes-action{border:2px solid #2B2118;border-radius:6px;background:#FFFEFA;box-shadow:0 2px 0 #2B2118}
.ajustes-action:hover{border-color:#2B2118;background:#FBF3E2}
.legal-dialog__foot{background:#FFFEFA;border-top:2px dashed rgba(43,33,24,.3)}
.tour__hole,.tour__foco{box-shadow:0 0 0 100vmax rgba(43,33,24,.74),0 0 0 3px #F2D27A}
.tour__card{border-radius:0;background:#FFFEFA;-webkit-mask:var(--zz);mask:var(--zz);padding-top:22px;padding-bottom:20px}
.tour__counter{color:#574533}
.tour__body{color:#4A3A2C}
"""

CSS = (CSS.replace("__KRAFT__", KRAFT_BG).replace("__AWNING__", AWNING).replace("__STAMP_OK__", uri(STAMP_OK))
       .replace("__TAB_RING__", uri(TAB_RING)).replace("__TAG_BULLET__", uri(TAG_BULLET))
       .replace("__TWINE__", TWINE).replace("__BARCODE__", BARCODE))

V = dict(
    id="mercadillo", name="Рынок",
    desc="Фермерский рынок: фон — крафтовый пакет с волокнами, сгибами, штампами и рисунками овощей; полосатая маркиза над вывеской, "
         "карточки-чеки с зубчатыми краями, табло как этикетка «пищевая ценность», кнопки — томатные билеты с просечками.",
    sw=["#D2B68E", "#FFFEFA", "#2B2118", "#C0422B", "#3E7B3B", "#D9A02B", "#8A3B5B", "#3E8A78"],
    fonts=["oswald", "ibm-plex-mono", "source-sans-3"], palette=PAL, tokens=TOKENS, css=CSS)
