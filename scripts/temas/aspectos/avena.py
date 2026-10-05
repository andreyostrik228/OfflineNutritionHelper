# -*- coding: utf-8 -*-
"""C · Овсянка — a cosy handmade kitchen notebook.
Oat craft paper with a dotted notebook grid, grain and faint hand-drawn food doodles behind everything;
paper cards with stitched edges and kraft tape; olive fabric-patch buttons with a cream stitch; paper-tag chips
that turn honey with a hand-drawn tick; index-tab segmented control; sewn round steppers; a ruled recipe card
for the macros; a paper tab strip with a honey highlighter; a sticky note for the next meal.
"""
import random
from arte import *

PAL = dict(
    canvas="#F1E9DA", surface="#FFFCF5", surface_2="#F7F0E2", line="#EADFCB", line_strong="#D7C6A6", field_line="#8C7A5E",
    ink="#3A2D22", text_2="#5E4D3E", text_3="#6B5948",
    primary="#55653A", primary_2="#46552F", primary_3="#5E6F40", on_ink="#FFFCF5", on_ink_2="#EDE6CF",
    volt="#F2C46D", volt_hi="#E3A857", volt_wash="#FBEFD3", on_volt="#3A2D22",
    kcal="#C4623A", kcal_deep="#A2441F", kcal_wash="#F8E3D6",
    protein="#9B4A5A", protein_deep="#8E3B4D", protein_wash="#F4E1E4",
    carbs="#E3A857", carbs_deep="#7A5810", carbs_wash="#F8EBCB",
    fat="#7FA899", fat_deep="#36695A", fat_wash="#E0EDE6",
    ok="#4E6B2C", ok_wash="#E8EED9", warn="#7A5410", warn_wash="#F9EDD0",
    danger="#B14A30", danger_deep="#943521", danger_wash="#F9E1D8", shadow_rgb="74, 52, 32")

BROWN, OLIVE, TERRA, HONEY = "#7A5F43", "#55653A", "#B65A35", "#C08A2E"


# --- art helpers (local) -----------------------------------------------------------------------------------
def _st(inner, color, sw=1.6, op=1.0):
    return (f"<g fill='none' stroke='{color}' stroke-width='{sw:.2f}' stroke-linecap='round' stroke-linejoin='round' "
            f"opacity='{op}'>{inner}</g>")


EXTRA = {
    "mushroom": "<path d='M4 12.5C4 8 7.6 4.5 12 4.5s8 3.5 8 8z'/><path d='M9.5 12.5v5a2.5 2.5 0 0 0 5 0v-5'/>"
                "<circle cx='9' cy='8.8' r='.9'/><circle cx='14.6' cy='8.2' r='1.1'/>",
    "tomato": "<path d='M5 13.5a7 7 0 0 0 14 0c0-3.6-2.6-6.5-7-6.5s-7 2.9-7 6.5z'/><path d='M12 7c-1-1.6-2.6-2-4-1.6M12 7c1-1.6 2.6-2 4-1.6M12 7V3.5'/>",
    "cup": "<path d='M5 9h11v6a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5z'/><path d='M16 11h1.5a2.5 2.5 0 0 1 0 5H16'/>"
           "<path d='M8.5 6.4c0-1 .8-1.4.8-2.4M11.5 6.4c0-1 .8-1.4.8-2.4'/>",
    "whisk": "<path d='M12 21v-6'/><path d='M12 15c-3-1-4.5-4.5-4.5-7.5a4.5 4.5 0 0 1 9 0c0 3-1.5 6.5-4.5 7.5z'/>"
             "<path d='M12 15c-1.2-1.6-1.8-4.6-1.8-7.5S11 3 12 3s1.8 1.6 1.8 4.5-.6 5.9-1.8 7.5z'/>",
    "pear": "<path d='M12 6.5c-1.6 0-2.6 1.4-2.6 3.2 0 1.8-3.4 3.2-3.4 6.4a6 6 0 0 0 12 0c0-3.2-3.4-4.6-3.4-6.4 0-1.8-1-3.2-2.6-3.2z'/>"
            "<path d='M12 6.5c0-1.4.4-2.4 1.4-3.2'/><path d='M13.2 4.6c1.3-.9 3-.8 4 .2-1.2.9-2.8.9-4-.2z'/>",
    "bread": "<path d='M4 11.5C4 8.5 7.6 6 12 6s8 2.5 8 5.5c0 1.2-.8 1.8-1.5 2V18a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1v-4.5C4.8 13.3 4 12.7 4 11.5z'/>"
             "<path d='M9 9.5l1 2M12.5 9l1 2M16 9.5l.8 1.8'/>",
    "peas": "<path d='M3 15.5c4-6 11-9 18-8-2 7-9 11-18 8z'/><circle cx='8.6' cy='13.4' r='1.5'/><circle cx='12.5' cy='11.6' r='1.5'/>"
            "<circle cx='16.2' cy='10' r='1.3'/>",
    "pencil": "<path d='M4 20l1.2-4.6L16.5 4.1a2 2 0 0 1 2.8 0l.6.6a2 2 0 0 1 0 2.8L8.6 18.8z'/><path d='M14.5 6.1l3.4 3.4M5.2 15.4l3.4 3.4'/>",
}
ALL = dict(DOODLES, **EXTRA)


def dood(name, x, y, sc, rot, col, op, sw=1.6):
    return (f"<g transform='translate({x} {y}) rotate({rot}) scale({sc}) translate(-12 -12)'>"
            f"{_st(ALL[name], col, sw / sc, op)}</g>")


def icon(name, col, sw=1.8, size=24, pad=0):
    s = size + 2 * pad
    return uri(f"<svg xmlns='http://www.w3.org/2000/svg' width='{s}' height='{s}' viewBox='{-pad} {-pad} {s} {s}'>"
               f"{_st(ALL[name], col, sw)}</svg>")


def grain(size=180, op=.05, freq=.85, rgb_=(.32, .22, .13), octaves=2, seed=3):
    """warm paper grain (brown specks, alpha only)"""
    r, g, b = rgb_
    return svg(size, size,
               f"<filter id='n' x='0' y='0' width='100%' height='100%'><feTurbulence type='fractalNoise' baseFrequency='{freq}' "
               f"numOctaves='{octaves}' seed='{seed}' stitchTiles='stitch'/>"
               f"<feColorMatrix values='0 0 0 0 {r}  0 0 0 0 {g}  0 0 0 0 {b}  0 0 0 {op * 6:.3f} 0'/></filter>"
               f"<rect width='100%' height='100%' filter='url(#n)'/>")


def tape(w=120, h=30, ang=0.0, fill="#D2B07A", op=.8, seed=2):
    """translucent kraft tape with torn zig-zag ends and a soft sheen; optionally rotated (for the page background)."""
    rnd = random.Random(seed)
    n = 8
    L = [((2.4 if i % 2 else 0) + rnd.uniform(0, 1.3), h * i / n) for i in range(n + 1)]
    R = [(w - (2.4 if i % 2 else 0) - rnd.uniform(0, 1.3), h * i / n) for i in range(n + 1)]
    pts = [L[0]] + R + L[n:0:-1]
    poly = " ".join(f"{x:.1f},{y:.1f}" for x, y in pts)
    body = (f"<clipPath id='t{seed}'><polygon points='{poly}'/></clipPath>"
            f"<g clip-path='url(#t{seed})' opacity='{op}'><rect width='{w}' height='{h}' fill='{fill}'/>"
            f"<rect y='{h * .16:.1f}' width='{w}' height='{h * .26:.1f}' fill='#fff' opacity='.13'/>"
            f"<rect y='{h * .78:.1f}' width='{w}' height='{h * .22:.1f}' fill='#7a5a2c' opacity='.08'/>"
            f"<path d='M0 {h * .6:.1f}H{w}' stroke='#fff' stroke-width='.8' opacity='.10'/></g>")
    if not ang:
        return svg(w, h, body)
    import math
    a = math.radians(ang)
    W = w * abs(math.cos(a)) + h * abs(math.sin(a)) + 4
    H = w * abs(math.sin(a)) + h * abs(math.cos(a)) + 4
    return svg(round(W), round(H), f"<g transform='translate({W / 2:.1f} {H / 2:.1f}) rotate({ang}) translate({-w / 2} {-h / 2})'>{body}</g>")


def coffee_ring(d=200, col="#8B5A2B", seed=7):
    """a dried coffee-cup stain: wobbly darker rim, broken thicker arcs, faint wash and a couple of drips."""
    import math
    rnd = random.Random(seed)
    c, r = d / 2, d * .38
    p1, p2 = rnd.uniform(0, 6.28), rnd.uniform(0, 6.28)

    def ring(rr, k=1.0):
        pts = []
        for i in range(0, 361, 5):
            t = math.radians(i)
            q = rr * (1 + .012 * k * math.sin(3 * t + p1) + .008 * k * math.sin(7 * t + p2))
            pts.append((c + q * math.cos(t), c + q * math.sin(t)))
        return "M" + " L".join(f"{x:.1f} {y:.1f}" for x, y in pts) + "Z"

    def arc(a0, a1, rr):
        a0, a1 = math.radians(a0), math.radians(a1)
        x0, y0, x1, y1 = c + rr * math.cos(a0), c + rr * math.sin(a0), c + rr * math.cos(a1), c + rr * math.sin(a1)
        return f"M{x0:.1f} {y0:.1f}A{rr} {rr} 0 0 1 {x1:.1f} {y1:.1f}"

    return svg(d, d,
               f"<path d='{ring(r - 4)}' fill='{col}' opacity='.035'/>"
               f"<path d='{ring(r, 1.4)}' fill='none' stroke='{col}' stroke-width='2.4' opacity='.26'/>"
               f"<path d='{ring(r + 3, 2)}' fill='none' stroke='{col}' stroke-width='1' opacity='.14'/>"
               f"<path d='{arc(150, 255, r - 1.5)}' fill='none' stroke='{col}' stroke-width='5' stroke-linecap='round' opacity='.10'/>"
               f"<path d='{arc(300, 350, r - 1)}' fill='none' stroke='{col}' stroke-width='4' stroke-linecap='round' opacity='.09'/>"
               f"<circle cx='{c + r * .74:.1f}' cy='{c + r * .9:.1f}' r='4' fill='{col}' opacity='.10'/>"
               f"<circle cx='{c + r * .9:.1f}' cy='{c + r * .98:.1f}' r='1.8' fill='{col}' opacity='.10'/>")


# --- art ---------------------------------------------------------------------------------------------------
WALL_ITEMS = [
    ("apple", 50, 48, 1.45, -12, BROWN, .40), ("wheat", 168, 62, 1.5, 18, BROWN, .40), ("carrot", 272, 44, 1.45, -20, TERRA, .36),
    ("cherry", 388, 60, 1.4, -8, BROWN, .38),
    ("lemon", 60, 170, 1.3, 8, HONEY, .40), ("cup", 160, 158, 1.45, -6, BROWN, .40), ("pear", 282, 172, 1.45, 14, OLIVE, .38),
    ("egg", 380, 160, 1.35, 20, BROWN, .38),
    ("mushroom", 48, 280, 1.45, -10, BROWN, .40), ("leaf", 170, 270, 1.4, 25, OLIVE, .40), ("tomato", 268, 284, 1.4, -6, TERRA, .36),
    ("whisk", 392, 272, 1.45, 30, BROWN, .38),
    ("peas", 58, 388, 1.45, -16, OLIVE, .38), ("avocado", 166, 392, 1.35, 12, BROWN, .38), ("bread", 278, 380, 1.45, -4, BROWN, .40),
    ("pepper", 384, 394, 1.4, 18, TERRA, .36),
]
SPRINKLES = "".join(
    f"<circle cx='{x}' cy='{y}' r='1.7' fill='{BROWN}' opacity='.30'/>" for x, y in ((110, 108), (330, 222), (222, 334), (20, 222), (402, 330))
) + "".join(
    f"<path d='M{x - 3.5} {y}h7M{x} {y - 3.5}v7' stroke='{OLIVE}' stroke-width='1.4' stroke-linecap='round' opacity='.32'/>"
    for x, y in ((222, 112), (108, 226), (334, 334), (330, 104))
) + "".join(
    f"<path d='M{x - 5} {y + 1.5}q2.5-4 5 0t5 0' fill='none' stroke='{TERRA}' stroke-width='1.4' stroke-linecap='round' opacity='.28'/>"
    for x, y in ((110, 330), (222, 220), (20, 110))
)
WALL = uri(svg(440, 440, "".join(dood(n, x, y, sc, r, c, o * .9) for n, x, y, sc, r, c, o in WALL_ITEMS) + SPRINKLES))
WALL_SOFT = uri(svg(440, 440, "".join(dood(n, x, y, s, r, c, o * .8) for n, x, y, s, r, c, o in WALL_ITEMS)))
DOTS = uri(dots(22, 1.15, BROWN, .34))
DOTS_CARD = uri(dots(22, 1.0, BROWN, .16))
GRAIN = uri(grain(180, .045, .9))
MOTTLE = uri(grain(520, .022, .012, octaves=3, seed=8))
GRAIN_CARD = uri(grain(160, .022, .95, seed=5))
KRAFT_GRAIN = uri(grain(160, .07, .75, seed=9))
TAPE = uri(tape(120, 30, 0, seed=2))
TAPE_B = uri(tape(110, 28, 0, fill="#D8B985", seed=6))
TAPE_A = uri(tape(150, 34, -14, seed=3))
TAPE_C = uri(tape(150, 34, 9, fill="#D6B680", seed=4))
RING = uri(coffee_ring(200))
MARKER = uri(svg(240, 40, "<path d='M5 15C48 9 128 7 233 10c4 0 5 6 2 8 3 2 3 9-1 10-82 4-158 6-228 5-4 0-5-7-2-9-3-2-3-8 1-9z' "
                          "fill='#F2C46D' opacity='.82'/>", "preserveAspectRatio='none'"))
# two overlapping highlighter passes (darker where they overlap, like a real marker)
TAB_MARK = uri(svg(100, 64, "<g stroke='#F2C46D' stroke-linecap='round' fill='none' opacity='.78'>"
                            "<path d='M12 21.5 L88 18.5' stroke-width='27'/><path d='M11 42.5 L89 44.5' stroke-width='27'/></g>",
                   "preserveAspectRatio='none'"))
CHECK_D = "M6.5 17.5c2.2 1.4 3.9 3.4 5.3 6 2.7-7 7.2-12.6 14.2-17"
CHECK = uri(svg(32, 32, f"<path d='{CHECK_D}' fill='none' stroke='#FFFCF5' stroke-width='7.5' stroke-linecap='round' stroke-linejoin='round'/>"
                        f"<path d='{CHECK_D}' fill='none' stroke='#46552F' stroke-width='3.3' stroke-linecap='round' stroke-linejoin='round'/>"))
TICK = uri(svg(32, 32, f"<path d='{CHECK_D}' fill='none' stroke='#55653A' stroke-width='3.6' stroke-linecap='round' stroke-linejoin='round'/>"))
MARK_ICON = icon("bowl", "#FFFCF5", 2)
SEC_ICON = icon("pencil", OLIVE, 1.8)
HERO_L = icon("wheat", TERRA, 1.7)
HERO_R = icon("apple", TERRA, 1.7)
LEAF_DOT = icon("leaf", OLIVE, 2.2)
EMPTY_ICON = icon("bowl", "#9C8763", 1.6)
CHEVRON = uri(svg(20, 20, "<path d='M5 7.5l5 5 5-5' fill='none' stroke='#55653A' stroke-width='2.4' stroke-linecap='round' stroke-linejoin='round'/>"))
WEAVE = uri(svg(6, 6, "<path d='M0 0h3v3H0zM3 3h3v3H3z' fill='#fff' opacity='.032'/><path d='M3 0h3v3H3zM0 3h3v3H0z' fill='#000' opacity='.03'/>"))

TOKENS = (
    '--font-display:"Bitter",Georgia,"Times New Roman",serif;'
    '--font-body:"Source Sans 3",system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;'
    '--font-hand:"Caveat","Segoe Print","Bradley Hand",cursive;'
    "--font-label:var(--font-body);"
    "--r-sm:8px;--r-md:12px;--r-lg:16px;--r-xl:18px;--r-ctl:12px;"
    "--shadow-1:0 1px 0 rgba(74,52,32,.06),0 0 0 1px rgba(140,122,94,.16),0 12px 24px -16px rgba(74,52,32,.5);"
    "--shadow-2:0 26px 56px -20px rgba(46,36,27,.55);"
    "--fw-display:700;--fw-fig:800;--fw-btn:700;--fw-label:700;--fw-hero:800;--ls-display:-.005em;"
    "--fs-h2:30px;--fs-h2-md:34px;--fs-h2-lg:36px;--fs-title:34px;--fs-q:30px;"
    "--hero-k:8;--hero-max:84px;"
)

CSS = r"""
/* ═════════ C · Овсянка ═════════ */
html{background:#F1E9DA}
body{background:transparent;color:#3A2D22}
body::before{content:"";position:fixed;inset:0;z-index:-1;pointer-events:none;
  background:
    __RING__ no-repeat right -78px top 31% / 200px 200px,
    __TAPE_A__ no-repeat left -46px top 54% / 150px auto,
    __TAPE_C__ no-repeat right -52px top 84% / 150px auto,
    __WALL__ repeat -24px 40px / 440px 440px,
    __DOTS__ repeat 5px 5px / 22px 22px,
    __GRAIN__ repeat 0 0 / 180px 180px,
    __MOTTLE__ repeat 0 0 / 520px 520px,
    radial-gradient(110% 60% at 50% 0%, #F8F2E7 0%, rgba(248,242,231,0) 62%),
    linear-gradient(180deg, #F3ECDF 0%, #EDE3D1 100%);}
::selection{background:#F6D68E;color:#3A2D22}
:focus-visible{outline:3px solid #55653A;outline-offset:2px;box-shadow:0 0 0 6px rgba(242,196,109,.6)}
/* text that sits straight on the doodled page gets a soft oat halo, so strokes never cut through letters */
h2,.eyebrow,.footer-note,.site-footer,.days-carousel__hint,.day-slide__head,.shopping-progress__texto,.schedule-timeline__note,.pantry-plans-empty{
  text-shadow:0 0 2px #F1E9DA,0 0 5px #F1E9DA,0 0 9px rgba(241,233,218,.9)}
h2 em,.disclosure h2,.disclosure .eyebrow,.auth-dialog h2,.ajustes-dialog h2,.onboarding h2{text-shadow:none}

/* ── top bar ── */
@@BTN_ICON@@{position:relative;border:0;border-radius:50%;color:#46552F;
  background:radial-gradient(circle at 50% 38%,#FFFFFF 0 42%,#F5ECDB 100%);
  box-shadow:0 0 0 1.5px #A08B67,inset 0 0 0 3.5px #FFFDF8,inset 0 0 0 5px #DCCBAA,0 3px 0 #D3C19E,0 8px 14px -8px rgba(74,52,32,.45)}
@@BTN_ICON@@:hover{color:#3A2D22;background:radial-gradient(circle at 50% 38%,#FFFFFF 0 42%,#F9F2E4 100%)}
.topbar__menu-btn{width:46px;height:46px}
.topbar__brand{color:#3A2D22;gap:10px}
.topbar__brand-mark{position:relative;width:36px;height:36px;border-radius:10px;
  background:__MARK_ICON__ center / 22px 22px no-repeat,#55653A;box-shadow:0 2px 0 #3B4727,0 6px 10px -5px rgba(46,36,27,.5)}
.topbar__brand-mark svg{display:none}
.topbar__brand-mark::before{content:"";position:absolute;inset:3px;border:1.5px dashed rgba(255,252,245,.55);border-radius:7px}
@@PROFILE@@{height:46px;padding:0 14px 0 6px;border:0;border-radius:12px;background:#FFFCF5;color:#3A2D22;font-size:var(--fs-sm);font-weight:700;
  box-shadow:0 0 0 1.5px #CDBB98,0 3px 0 #DCCCAA,0 8px 14px -8px rgba(74,52,32,.4)}
.topbar__profile-avatar{width:34px;height:34px;background:#55653A;color:#FFFCF5;box-shadow:inset 0 0 0 3px #55653A,inset 0 0 0 4.5px rgba(255,252,245,.5)}

/* ── hero: a sewn-on label, taped to the page ── */
.hero{position:relative;overflow:visible;border-radius:16px;color:#3A2D22;
  background:
    repeating-linear-gradient(0deg,rgba(122,95,67,.035) 0 1px,transparent 1px 4px),
    radial-gradient(130% 150% at 50% 0%,#FFFCF4 0%,#FAF0DA 100%);
  box-shadow:0 1px 0 rgba(74,52,32,.08),0 0 0 1px rgba(140,122,94,.22),0 14px 26px -18px rgba(74,52,32,.6)}
.hero::before,.hero__texto::before{content:"";position:absolute;z-index:2;top:-10px;left:20px;width:74px;height:24px;margin:0;
  transform:rotate(-5deg);background:__TAPE__ center / 100% 100% no-repeat;pointer-events:none}
.hero__texto::before{left:auto;right:20px;transform:rotate(4deg);background-image:__TAPE_B__}
.hero::after{content:"";position:absolute;inset:10px;margin:0;height:auto;background:none;border:1.5px dashed rgba(85,101,58,.6);border-radius:9px;
  outline:1.5px dashed rgba(85,101,58,.32);outline-offset:3px;pointer-events:none}
.hero__texto{padding:22px 18px 20px}
.hero__titulo{display:flex;align-items:center;justify-content:center;gap:10px}
.hero__titulo{--hero-fs:clamp(34px,calc((100cqw - 24px) / var(--hero-k)),var(--hero-max))}
.hero__titulo::before,.hero__titulo::after{content:"";flex:none;width:calc(var(--hero-fs) * .68);height:calc(var(--hero-fs) * .68);
  background:__HERO_L__ center / contain no-repeat}
.hero__titulo::after{background-image:__HERO_R__}
.hero__nombre{color:#55653A;letter-spacing:-.01em}

/* ── headings ── */
h2{color:#3A2D22}
h2 em{font:700 1.2em/1 var(--font-hand);color:#55653A;background:__MARKER__ no-repeat 0 96% / 100% 50%;padding:0 .12em;margin:0 -.02em}
.eyebrow{color:#5E4D3E}
.form-section-label{font:700 26px/1 var(--font-hand);color:#55653A;letter-spacing:0;gap:8px}
.form-section-label::before{width:24px;height:24px;background:__SEC_ICON__ center / contain no-repeat;box-shadow:none;transform:none}
.budget-group-label{font-size:var(--fs-sm);color:#5E4D3E}
.badge{height:32px;padding:0 12px 0 22px;border-radius:7px;color:#3A2D22;font-weight:700;
  background:radial-gradient(circle at 10px 50%,#FFFCF5 0 2.6px,#A8865A 2.8px 3.9px,transparent 4.3px),#EEDDBC;
  box-shadow:inset 0 0 0 1px rgba(140,110,70,.32),0 2px 0 rgba(156,128,82,.25)}
.badge svg{color:#55653A}

/* ── paper sheets & cards ── */
@@PANEL@@{position:relative;border-radius:18px;background:__GRAIN_CARD__ repeat 0 0 / 160px 160px,#FFFCF5;border:0;box-shadow:var(--shadow-1)}
@@PANEL@@::before{content:"";position:absolute;inset:8px;border:1.5px dashed rgba(85,101,58,.38);border-radius:11px;pointer-events:none}
@@PANEL@@::after{content:"";position:absolute;z-index:2;top:-12px;left:50%;width:88px;height:26px;margin-left:-44px;transform:rotate(2deg);
  background:__TAPE_B__ center / 100% 100% no-repeat;pointer-events:none}
@@CARD@@{border-radius:14px;background:#FFFCF5;border:0;box-shadow:var(--shadow-1);outline:1.5px dashed rgba(85,101,58,.3);outline-offset:-6px}
.resumen-datos{padding:8px 8px 8px 18px}
@@WELL@@{border-radius:10px}
.meta{background:#F7F0E2}

/* ── buttons: olive fabric patches with a cream stitch ── */
@@BTN_P@@,@@BTN_CTA@@{position:relative;border:0;border-radius:12px;color:#FFFCF5;
  background:__WEAVE__ repeat 0 0 / 6px 6px,linear-gradient(180deg,#5D6E40 0%,#51613A 100%);
  box-shadow:0 2px 0 #3B4727,0 8px 14px -7px rgba(46,36,27,.55);text-shadow:0 1px 0 rgba(30,36,18,.35);
  transition:transform .08s ease,box-shadow .08s ease,background-color .15s ease}
@@BTN_P@@::before,@@BTN_CTA@@::before{content:"";position:absolute;inset:5px;border:1.5px dashed rgba(255,252,245,.6);border-radius:8px;pointer-events:none}
@@BTN_P@@ svg,@@BTN_CTA@@ svg{color:#F6D68E}
@@BTN_P@@:hover,@@BTN_CTA@@:hover{background:__WEAVE__ repeat 0 0 / 6px 6px,linear-gradient(180deg,#647648 0%,#566740 100%)}
@@BTN_P@@:active,@@BTN_CTA@@:active{transform:translateY(1px);box-shadow:0 1px 0 #3B4727,0 3px 6px -4px rgba(46,36,27,.5)}
@@BTN_P@@:disabled,@@BTN_CTA@@:disabled{background:#E7DDC9;color:#7D6C57;box-shadow:0 2px 0 #D2C3A5;text-shadow:none;transform:none}
@@BTN_P@@:disabled::before,@@BTN_CTA@@:disabled::before{border-color:rgba(125,108,87,.4)}
@@BTN_S@@,.pantry-active-card__buy-btn--secondary{position:relative;border:0;border-radius:12px;background:#FFF8EA;color:#46552F;text-shadow:none;
  box-shadow:0 0 0 1.5px #B9A47E,0 3px 0 0 #D3C19D,0 8px 12px -9px rgba(46,36,27,.45);transition:transform .08s ease,box-shadow .08s ease}
@@BTN_S@@::before,.pantry-active-card__buy-btn--secondary::before{content:"";position:absolute;inset:5px;border:1.5px dashed rgba(85,101,58,.5);border-radius:8px;pointer-events:none}
@@BTN_S@@ svg,.pantry-active-card__buy-btn--secondary svg{color:#55653A}
@@BTN_S@@:hover,.pantry-active-card__buy-btn--secondary:hover{background:#FFFCF3}
@@BTN_S@@:active,.pantry-active-card__buy-btn--secondary:active{transform:translateY(2px);box-shadow:0 0 0 1.5px #B9A47E,0 1px 0 0 #D3C19D}
@@BTN_S@@:disabled{background:#F1E9DA;color:#7D6C57;box-shadow:0 0 0 1.5px #D3C5A8}
.actions-secondary #resetBtn{box-shadow:none;border:0;background:none;color:#5E4D3E;margin:0;text-decoration:underline;text-decoration-color:#E3A857;text-decoration-thickness:2px;text-underline-offset:4px}
.actions-secondary #resetBtn::before{content:none}
/* small = hanging kraft tag with a punched eyelet */
@@BTN_SM@@{position:relative;border:0;border-radius:6px 11px 11px 6px;padding:0 14px 0 27px;color:#3A2D22;
  background:radial-gradient(circle at 13px 50%,#FFFCF5 0 2.8px,#9C7B4F 3px 4.4px,transparent 4.8px),__KRAFT_GRAIN__ repeat 0 0 / 160px 160px,#EEDCB8;
  box-shadow:0 2px 0 #CFB78B,0 6px 10px -7px rgba(46,36,27,.45);transition:transform .08s ease,box-shadow .08s ease}
@@BTN_SM@@:hover{background:radial-gradient(circle at 13px 50%,#FFFCF5 0 2.8px,#9C7B4F 3px 4.4px,transparent 4.8px),__KRAFT_GRAIN__ repeat 0 0 / 160px 160px,#F2E3C4;color:#3A2D22;border-color:transparent}
@@BTN_SM@@:active{transform:translateY(1px);box-shadow:0 1px 0 #CFB78B}
.resumen-datos__btn{padding:8px 12px 8px 25px;background-position:0 0,0 0,0 0}
.resumen-datos__btn,.resumen-datos__btn:hover{background-image:radial-gradient(circle at 12px 50%,#FFFCF5 0 2.8px,#9C7B4F 3px 4.4px,transparent 4.8px),__KRAFT_GRAIN__}
.pantry-active-card__delete{color:#943521;background:radial-gradient(circle at 13px 50%,#FFFCF5 0 2.8px,#B07A66 3px 4.4px,transparent 4.8px),#F9E1D8;box-shadow:0 2px 0 #E6BFAF}
.pantry-active-card__delete--armed{background:#B14A30;color:#fff}
@@BTN_DANGER@@{border-radius:12px;background:#B14A30;box-shadow:0 2px 0 #7E3221}
.link-btn,.pantry-link-btn,.auth-dialog__switch-btn,.onboarding__link,.site-footer__link,.onboarding__skip,.onboarding__skip-questions,.tour__skip{text-decoration-color:#E3A857}
.onboarding__link{min-height:40px}

/* ── chips: paper tags; picked = honey + olive stitch + a hand-drawn tick ── */
@@CHIP@@{position:relative;background:#FFFCF5;border:1.5px dashed #9C8763;border-radius:10px;color:#3A2D22;box-shadow:0 2px 0 rgba(156,135,99,.22)}
@@CHIP@@:hover{border-color:#55653A;background:#FFFEFA}
@@CHIP_ON@@{background:#F6D68E;border:1.5px solid #55653A;color:#3A2D22;box-shadow:0 2px 0 #55653A;outline:1.5px dashed rgba(70,85,47,.7);outline-offset:-6px}
.baldosa.is-activa::after,.visually-hidden:checked + .budget-chip::after,.onboarding__choice.is-selected::after{content:"";position:absolute;top:-13px;right:-9px;
  width:32px;height:32px;background:__CHECK__ center / contain no-repeat;pointer-events:none}
.budget-chip__title{color:#5E4D3E}
.visually-hidden:checked + .budget-chip .budget-chip__title{color:#5E4D3E}
.visually-hidden:checked + .budget-chip .budget-chip__amount,.onboarding__choice.is-selected .onboarding__choice-amount{color:#3A2D22}
.onboarding__choice.is-selected .onboarding__choice-note{color:#5E4D3E}
.date-chip--today::after{background:#C4623A;box-shadow:0 0 0 1.5px #FFFCF5}
.pantry-meal-chip--cooked .pantry-meal-chip__time{color:#7A3518}
.pantry-meal-chip__time{color:#A2441F}

/* ── segmented = notebook index tabs ── */
@@SEG@@{background:none;border:0;border-radius:0;padding:0 8px;gap:6px;align-items:end;box-shadow:inset 0 -2px 0 #55653A}
@@SEG_BTN@@{position:relative;min-height:46px;border:1.5px solid #B9A47E;border-bottom:0;border-radius:12px 12px 0 0;background:#EFE3CA;color:#5E4D3E;
  box-shadow:inset 0 -7px 8px -7px rgba(74,52,32,.28)}
@@SEG_BTN@@:hover{background:#F4EAD6;color:#3A2D22}
@@SEG_ON@@{min-height:54px;background:#F6D68E;border-color:#55653A;color:#3A2D22;box-shadow:none}
@@SEG_ON@@::before{content:"";position:absolute;left:7px;right:7px;top:6px;border-top:1.5px dashed rgba(70,85,47,.7)}

/* ── steppers: round sewn buttons ── */
@@STEP@@{background:#FFFDF8;border:1.5px solid #8C7A5E;border-radius:999px;box-shadow:inset 0 2px 4px rgba(74,52,32,.07)}
@@STEP@@:focus-within{border-color:#55653A;background:#FFFFFF;box-shadow:0 0 0 3px rgba(242,196,109,.55)}
@@STEP_BTN@@{position:relative;border-radius:50%;color:#46552F;font-weight:600;
  background:radial-gradient(circle at 50% 36%,#FFFFFF 0 40%,#F3EAD8 100%);
  box-shadow:0 0 0 1.5px #A08B67,inset 0 0 0 3px #FFFDF8,inset 0 0 0 4.5px #D9C8A6,0 2px 0 #CDBB98}
@@STEP_PLUS@@{color:#FFFCF5;background:radial-gradient(circle at 50% 36%,#687A4B 0 40%,#55653A 100%);
  box-shadow:0 0 0 1.5px #3E4B2A,inset 0 0 0 3px #55653A,inset 0 0 0 4.5px rgba(255,252,245,.42),0 2px 0 #3B4727}
@@STEP_BTN@@:active{transform:translateY(1px)}
.paso-a-paso input[type="number"]{border:0;border-radius:0;box-shadow:none;color:#3A2D22;
  background:linear-gradient(#C9B591,#C9B591) no-repeat 50% calc(100% - 3px) / 46% 1.5px}
.paso-a-paso input[type="number"]:focus{background:linear-gradient(#55653A,#55653A) no-repeat 50% calc(100% - 3px) / 46% 2px}

/* ── fields: paper with a ruled writing line ── */
@@FIELD@@{background-color:#FFFDF8;border:1.5px solid #8C7A5E;border-radius:10px;color:#3A2D22;font-weight:600;
  background-image:linear-gradient(#E6DAC2,#E6DAC2);background-repeat:no-repeat;background-size:calc(100% - 26px) 1px;background-position:13px calc(100% - 9px)}
@@FIELD@@:focus{border-color:#55653A;background-color:#FFFFFF;box-shadow:0 0 0 3px rgba(242,196,109,.55)}
select{background-image:__CHEVRON__,linear-gradient(#E6DAC2,#E6DAC2);background-repeat:no-repeat,no-repeat;
  background-size:20px 20px,calc(100% - 26px) 1px;background-position:right 13px center,13px calc(100% - 9px)}
.field>label,.budget-custom-field>label{color:#5E4D3E}
.field-hint{color:#6B5948}
.field-hint strong{color:#3A2D22}

/* ── scoreboard: a ruled recipe card with a terracotta margin ── */
.nutrition-strip{position:relative;overflow:visible;border-radius:14px;color:#3A2D22;padding:4px 6px 6px 22px;
  background:
    linear-gradient(90deg,transparent 12px,rgba(196,98,58,.6) 12px 13.5px,transparent 13.5px 16px,rgba(196,98,58,.4) 16px 17px,transparent 17px),
    repeating-linear-gradient(180deg,transparent 0 27px,#ECE2CF 27px 28px),
    #FFFCF5;
  box-shadow:var(--shadow-1)}
.nutrition-strip::after{content:"";position:absolute;z-index:2;top:-12px;left:34px;width:84px;height:26px;transform:rotate(-4deg);
  background:__TAPE__ center / 100% 100% no-repeat;pointer-events:none}
.summary-card{border:0;border-radius:0;padding:12px 8px 14px 10px;background:transparent;color:#3A2D22}
.summary-card--calories{padding:16px 10px 16px;border-bottom:1.5px dashed #CDBB98}
.summary-card--carbs,.summary-card--fat{border-left:1.5px dashed #CDBB98}
.summary-card h3{font:700 22px/1 var(--font-hand);letter-spacing:0;text-transform:none;color:#5E4D3E;gap:6px}
.summary-card--calories h3{font-size:24px}
.icon-badge{width:26px;height:26px;border-radius:50%}
.summary-card--calories .icon-badge{background:#F8E3D6;color:#A2441F;box-shadow:inset 0 0 0 1.5px #C4623A}
.summary-card--protein .icon-badge{background:#F4E1E4;color:#8E3B4D;box-shadow:inset 0 0 0 1.5px #9B4A5A}
.summary-card--carbs .icon-badge{background:#F8EBCB;color:#7A5810;box-shadow:inset 0 0 0 1.5px #D39A45}
.summary-card--fat .icon-badge{background:#E0EDE6;color:#36695A;box-shadow:inset 0 0 0 1.5px #6F9A8A}
.summary-card .big{margin-top:8px}
.summary-card--calories .big{color:#A2441F}
.summary-card--protein .big{color:#8E3B4D}.summary-card--carbs .big{color:#7A5810}.summary-card--fat .big{color:#36695A}
.summary-card .big .u{font:700 22px/1 var(--font-hand);margin-left:.1em}
.summary-card--calories .big .u{font-size:30px}
.summary-card .sub{color:#5E4D3E}
.insights .icon-badge{background:#FBEFD3;color:#7A5810;box-shadow:inset 0 0 0 1.5px #D9B771}
@container (min-width:620px){
  .nutrition-strip{grid-template-columns:1.35fr repeat(3,minmax(0,1fr))}
  .summary-card--calories{grid-column:auto;border-bottom:0}
  .summary-card--protein{border-left:1.5px dashed #CDBB98}
}

/* ── timeline, day header, meal cards ── */
.schedule-timeline__item{border:1.5px solid #E0D2B6;border-radius:10px;background:#FFFCF5;box-shadow:0 2px 0 rgba(140,122,94,.16),0 8px 14px -12px rgba(74,52,32,.45)}
.schedule-timeline__item:hover{border-color:#B9A47E}
.schedule-timeline__item--next{background:#FCEAB0;border-color:#E2C36C}
.schedule-timeline__item--next .schedule-timeline__label{color:#3A2D22}
.schedule-timeline__next-tag{background:#55653A;color:#FFFCF5;border-radius:6px}
.schedule-timeline__time{color:#3A2D22}
.schedule-timeline__note{color:#6B5948}
.day-slide__n{color:#3A2D22}
.day-slide__of{color:#6B5948}
.day-slide__head::after{height:2px;border-radius:0;background:repeating-linear-gradient(90deg,rgba(85,101,58,.6) 0 9px,transparent 9px 15px)}
.days-carousel__dot::before{background:#C9B795}
.days-carousel__dot.is-active::before{background:#55653A}
.days-carousel__arrow{background:radial-gradient(circle at 50% 38%,#687A4B 0 40%,#55653A 100%);color:#FFFCF5;box-shadow:0 0 0 1.5px #3E4B2A,inset 0 0 0 3px #55653A,inset 0 0 0 4.5px rgba(255,252,245,.42),0 4px 10px -3px rgba(46,36,27,.5)}
.days-carousel__hint{color:#6B5948}
.meal-head h3{font:700 var(--fs-lg)/1.3 var(--font-display)}
.meal-time-badge{height:34px;padding:0 10px;border-radius:7px;background:#FBEFD3;color:#3A2D22;box-shadow:inset 0 0 0 1.5px #D9B771}
.meal-kcal{color:#A2441F}
.meal-items{border-top:1.5px dashed #DCCDAF}
.food-row{border-bottom:1.5px dashed #E6DAC2}
.food-cost__tag{color:#6B5948}
@@TAG@@{border-radius:5px}
.food-macro__badge,.food-purchase__badge{background:#E8EED9;color:#4E6B2C;box-shadow:inset 0 0 0 1px rgba(78,107,44,.3)}
.food-purchase{background:#FAF3E4;box-shadow:inset 3px 0 0 #E3A857;border-radius:8px}
.meal-footer{background:#F7F0E2;border-top:1.5px dashed #DCCDAF}
.meal-footer>div{color:#5E4D3E}
.meal-footer>div::before{height:4px;border-radius:3px}
.meal-footer>div:nth-child(5)::before{background:#C4623A}
.meal-steps{border-top:1.5px dashed #DCCDAF}
.meal-steps__toggle{color:#46552F}
.meal-steps__toggle::after{border-color:#55653A}
.meal-steps__list li::before{border-radius:50%;background:#55653A;color:#FFFCF5;box-shadow:inset 0 0 0 2px #55653A,inset 0 0 0 3.2px rgba(255,252,245,.5)}
.meal-make-ahead,.meal-cook-note{background:#FCEFC7;box-shadow:inset 3px 0 0 #E3A857;border-radius:8px}
.meal-card--empty{outline:0;box-shadow:none;background:rgba(255,252,245,.55);border:2px dashed #CDBB98}
.empty-icon{border-radius:50%;background:#F6D68E;color:#3A2D22;transform:none;box-shadow:inset 0 0 0 2px #E3A857}
.warning{background:#F9EDD0;color:#7A5410;box-shadow:inset 3px 0 0 #E3A857;border-radius:10px}

/* ── next meal: a sticky note ── */
.next-meal-sticky__btn{position:relative;border:0;border-radius:3px 3px 18px 3px;color:#3A2D22;
  background:linear-gradient(180deg,#FFF1C2 0%,#FCE7A5 100%);
  box-shadow:0 1px 1px rgba(74,52,32,.14),0 14px 16px -12px rgba(74,52,32,.6);transform:rotate(-.6deg)}
.next-meal-sticky__btn::before{content:"";position:absolute;top:-9px;left:50%;width:72px;height:20px;margin-left:-36px;transform:rotate(2deg);
  background:__TAPE_B__ center / 100% 100% no-repeat;pointer-events:none}
.next-meal-sticky__eyebrow{padding:0 2px;background:none;color:#A2441F;font:700 24px/1 var(--font-hand);letter-spacing:0;text-transform:none}
.next-meal-sticky__time{color:#3A2D22}

/* ── shopping ── */
.shopping-summary__stat span{color:#5E4D3E}
.shopping-summary__stat:nth-child(2){position:relative;padding:18px 18px 16px 52px;border-radius:9px 16px 16px 9px;
  background:radial-gradient(circle at 26px 50%,#EFE6D5 0 6px,#8F7149 6.5px 8.6px,transparent 9.1px),__KRAFT_GRAIN__ repeat 0 0 / 160px 160px,linear-gradient(135deg,#EBD7AC 0%,#E1C793 100%);
  outline:1.5px dashed rgba(70,85,47,.55);outline-offset:-7px;box-shadow:0 1px 0 rgba(74,52,32,.1),0 14px 24px -14px rgba(74,52,32,.6)}
.shopping-summary__stat:nth-child(2) span{color:#4A3A2C}
.shopping-summary__stat:nth-child(2) strong{color:#3A2D22}
.shopping-progress__texto{color:#5E4D3E}
.shopping-progress__barra{height:22px;padding:4px;border-radius:5px;
  background:repeating-linear-gradient(90deg,rgba(58,45,34,.42) 0 1px,transparent 1px 7px) 0 100% / 100% 6px no-repeat,#F2D79B;box-shadow:inset 0 0 0 1px #C9A75C}
.shopping-progress__barra>span{border-radius:3px;background:linear-gradient(rgba(255,252,245,.55),rgba(255,252,245,.55)) no-repeat 0 50% / 100% 1px,#55653A}
.shopping-item__check::before,.pantry-purchase-row__check::before{border:2px solid #55653A;border-radius:50% 46% 52% 48% / 48% 54% 46% 52%;background:#FFFDF8}
.shopping-item__check[aria-checked="true"]::before,.pantry-purchase-row__check[aria-checked="true"]::before{background:#55653A;border-color:#55653A}
.shopping-item__check[aria-checked="true"]::after,.pantry-purchase-row__check[aria-checked="true"]::after{border-color:#FFFCF5}
.shopping-item.is-comprado{background:#F5EEE0;box-shadow:none}
.shopping-item__meta,.shopping-item__usage-price{color:#6B5948}
.product-find-btn{background:#FBEFD3;box-shadow:0 0 0 1.5px #D9B771}
.product-find-btn:hover{box-shadow:0 0 0 2px #55653A}
.confirm-receipt{background:#FBEFD3;box-shadow:inset 3px 0 0 #E3A857;border-radius:10px}

/* narrow phones: Bitter's tabular figures are wide, so the small money tiles and budget tags step down */
@media(max-width:429px){.shopping-summary__stat:not(:nth-child(2)) strong{font-size:24px}}
@media(max-width:389px){
  .shopping-summary__stat:not(:nth-child(2)){padding:12px 12px 10px}
  .shopping-summary__stat:not(:nth-child(2)) strong{font-size:22px}
  .budget-chip{padding:12px 10px}
}
@media(max-width:359px){
  .shopping-summary__stat:not(:nth-child(2)){padding:12px 10px 10px}
  .shopping-summary__stat:not(:nth-child(2)) strong{font-size:20px}
  .budget-modes{grid-template-columns:minmax(0,1fr)}
  .budget-chip{flex-direction:row;align-items:center;justify-content:space-between;gap:8px;min-height:var(--h-md);padding:10px 14px}
  .budget-chip__amount{font-size:20px}
}

@media(min-width:600px) and (max-width:900px){
  .budget-modes{grid-template-columns:repeat(4,minmax(0,1fr))}
  .budget-chip--custom{grid-column:1 / -1;flex-direction:row;align-items:center;min-height:var(--h-md)}
}

/* ── my plans ── */
.pantry-plans-empty{border:2px dashed #CDBB98;color:#5E4D3E;border-radius:14px;background:rgba(255,252,245,.6)}
.pantry-plans-empty::before{content:"";display:block;width:40px;height:40px;margin:0 auto 8px;background:__EMPTY_ICON__ center / contain no-repeat}
.pantry-purchase-checklist-wrap{background:#F7F0E2}

/* ── tab bar: a paper strip with a stitched top edge ── */
@media screen and (max-width:900px){
  body.con-pestanas .tabbar{border-radius:16px;padding:12px 6px 6px;gap:2px;
    background:__GRAIN_CARD__ repeat 0 0 / 160px 160px,#FFFCF5;
    box-shadow:0 0 0 1px rgba(140,122,94,.3),0 18px 36px -14px rgba(46,36,27,.55),0 3px 8px -2px rgba(46,36,27,.18)}
  body.con-pestanas .tabbar::before{content:"";position:absolute;left:14px;right:14px;top:6px;border-top:1.5px dashed rgba(85,101,58,.55);pointer-events:none}
  .tabbar__btn{min-height:58px;color:#5E4D3E;font-weight:700;background:transparent;border-radius:12px}
  .tabbar__btn svg{color:#6B5948}
  .tabbar__btn.is-activa{background:__TAB_MARK__ no-repeat 50% 50% / 88% 86%;color:#3A2D22}
  .tabbar__btn.is-activa svg{color:#46552F}
  .tabbar__cuenta{background:#B14A30;color:#FFFCF5;box-shadow:0 0 0 2px #FFFCF5}
}

/* ── welcome + questions: kraft field, notebook page ── */
.onboarding{background:
    __RING__ no-repeat right -60px top 5% / 180px 180px,
    __TAPE_A__ no-repeat left -50px top 30% / 150px auto,
    __WALL_SOFT__ repeat -24px 20px / 440px 440px,
    __DOTS__ repeat 5px 5px / 22px 22px,
    __GRAIN__ repeat 0 0 / 180px 180px,
    linear-gradient(170deg,#E9D8B5 0%,#DFC89E 100%)}
.onboarding__card{position:relative;border-radius:20px 20px 0 0;padding-top:42px;
  background:
    radial-gradient(circle at 50% 62%,#E2CDA4 0 4.3px,transparent 4.8px) repeat-x 6px 12px / 30px 16px,
    radial-gradient(circle at 50% 50%,#9F8457 0 5.4px,rgba(159,132,87,0) 5.9px) repeat-x 6px 12px / 30px 16px,
    __DOTS_CARD__ repeat 5px 5px / 22px 22px,#FFFCF5;
  box-shadow:0 -18px 40px -24px rgba(46,36,27,.6)}
@media(min-width:640px){.onboarding__card{border-radius:20px;padding-top:44px}}
.onboarding__brand-mark{position:relative;border-radius:10px;background:__MARK_ICON__ center / 22px 22px no-repeat,#55653A;color:transparent;box-shadow:0 2px 0 #3B4727}
.onboarding__brand-mark svg{display:none}
.onboarding__brand-mark::before{content:"";position:absolute;inset:3px;border:1.5px dashed rgba(255,252,245,.55);border-radius:7px}
.onboarding__brand-name{color:#3A2D22}
.onboarding__title{color:#3A2D22}
.onboarding__title-accent{font:700 1.18em/1.02 var(--font-hand);color:#55653A;background:__MARKER__ no-repeat 0 96% / 100% 48%}
.onboarding__summary li{color:#5E4D3E}
.onboarding__summary li::before{top:.1em;width:18px;height:18px;background:__TICK__ center / contain no-repeat;box-shadow:none;transform:none}
.onboarding__check input{border:2px solid #55653A;border-radius:7px;background:#FFFDF8}
.onboarding__check input:checked{background:#55653A}
.onboarding__check input:checked::after{border-color:#FFFCF5}
.onboarding__progress{height:16px;border-radius:4px;background:repeating-linear-gradient(90deg,rgba(58,45,34,.4) 0 1px,transparent 1px 7px) 0 100% / 100% 5px no-repeat,#F2D79B;
  box-shadow:inset 0 0 0 1px #C9A75C}
.onboarding__progress-bar{border-radius:3px;background:linear-gradient(rgba(255,252,245,.55),rgba(255,252,245,.55)) no-repeat 0 50% / 100% 1px,#55653A}
.onboarding__progress-label{color:#5E4D3E}
.onboarding__number,.onboarding__time,.onboarding__text{background-color:#FFFDF8;border:1.5px solid #8C7A5E;border-radius:14px}
.onboarding__unit{color:#6B5948}
.onboarding__skip,.onboarding__skip-questions{color:#5E4D3E}
.onboarding__skip-note{color:#6B5948}
.onboarding__hint{color:#5E4D3E}

/* ── tour, dialogs ── */
.tour__hole,.tour__foco{box-shadow:0 0 0 100vmax rgba(46,36,27,.72),0 0 0 3px #F2C46D}
.tour__card{border-radius:14px;background:#FFFCF5;outline:1.5px dashed rgba(85,101,58,.35);outline-offset:-7px}
.auth-dialog,.ajustes-dialog{border-radius:20px 20px 0 0;background:__GRAIN_CARD__ repeat 0 0 / 160px 160px,#FFFCF5;
  outline:1.5px dashed rgba(85,101,58,.34);outline-offset:-8px}
@media(min-width:640px){.auth-dialog,.ajustes-dialog{border-radius:20px}}
/* sticky head/foot: paper only inside the stitch, so the stitched edge stays visible */
.ajustes-dialog__head{background:linear-gradient(#FFFCF5,#FFFCF5) no-repeat 10px 10px / calc(100% - 20px) calc(100% - 10px)}
.legal-dialog__foot{background:linear-gradient(#FFFCF5,#FFFCF5) no-repeat 10px 0 / calc(100% - 20px) calc(100% - 10px);border-top:1.5px dashed #DCCDAF}
.auth-dialog::backdrop,.ajustes-dialog::backdrop{background:rgba(46,36,27,.58)}
.ajustes-group + .ajustes-group{border-top:1.5px dashed #DCCDAF}
.ajustes-group__title{color:#5E4D3E}
.ajustes-action{border:0;border-radius:12px;background:#FFFCF5;box-shadow:0 0 0 1.5px #CDBB98,0 2px 0 1.5px #E0D2B5}
.ajustes-action:hover{background:#FFF8EA}
.ajustes-choice__btn[aria-checked="true"]{color:#3A2D22}
.auth-dialog__notice-static{background:#F7F0E2}

/* ── notes & footer ── */
.insights li::before{top:.3em;width:13px;height:13px;background:__LEAF_DOT__ center / contain no-repeat;box-shadow:none;transform:none}
.insights li{color:#5E4D3E}
.site-footer,.footer-note{color:#5E4D3E}
.disclosure__chevron{color:#55653A}
"""

for k, v in dict(__RING__=RING, __TAPE_A__=TAPE_A, __TAPE_C__=TAPE_C, __TAPE_B__=TAPE_B, __TAPE__=TAPE, __WALL_SOFT__=WALL_SOFT,
                 __WALL__=WALL, __DOTS_CARD__=DOTS_CARD, __DOTS__=DOTS, __GRAIN_CARD__=GRAIN_CARD, __GRAIN__=GRAIN, __MOTTLE__=MOTTLE,
                 __KRAFT_GRAIN__=KRAFT_GRAIN, __MARKER__=MARKER, __CHECK__=CHECK, __TICK__=TICK, __MARK_ICON__=MARK_ICON,
                 __SEC_ICON__=SEC_ICON, __HERO_L__=HERO_L, __HERO_R__=HERO_R, __LEAF_DOT__=LEAF_DOT, __CHEVRON__=CHEVRON,
                 __WEAVE__=WEAVE, __TAB_MARK__=TAB_MARK, __EMPTY_ICON__=EMPTY_ICON).items():
    CSS = CSS.replace(k, v)

V = dict(
    id="avena", name="Овсянка",
    desc="Уютная кухонная тетрадь: овсяная крафт-бумага в точку с рисованными продуктами и крафт-скотчем на фоне, "
         "кнопки — оливковые тканевые нашивки со строчкой, бумажные карточки с пунктирным швом, выбор — медовые бирки с галочкой от руки.",
    sw=["#F1E9DA", "#FFFCF5", "#55653A", "#F2C46D", "#C4623A", "#9B4A5A", "#E3A857", "#7FA899"],
    fonts=["bitter", "source-sans-3", "caveat"], palette=PAL, tokens=TOKENS, css=CSS)
