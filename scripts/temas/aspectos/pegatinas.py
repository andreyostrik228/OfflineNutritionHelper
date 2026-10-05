# -*- coding: utf-8 -*-
"""E · Наклейки — playful neo-brutalist "stickers on a notebook".
Butter dot-grid paper with big flat food stickers (tomato, avocado, mustard star, blueberry squiggle, mint wave),
thick ink outlines + hard offset shadows everywhere, buttons that press like a sticker, colour-block macro tiles.
"""
import math
from arte import *

INK = "#1F1A17"
BUTTER = "#FFF1CC"
CREAM = "#FFFAF0"
TOMATO = "#E8573A"
AVO = "#8DBB4E"
MUSTARD = "#F3B431"
BERRY = "#6B7BE8"
PINK = "#F6A9B8"
MINT = "#9ED9C3"

PAL = dict(
    canvas=BUTTER, surface=CREAM, surface_2="#FFF4DC", line="#EADBBC", line_strong=INK, field_line=INK,
    ink=INK, text_2="#4A3F37", text_3="#5F534A",
    primary=INK, primary_2="#2E2621", primary_3="#40362F", on_ink=CREAM, on_ink_2="#F6E7C6",
    volt=MUSTARD, volt_hi=AVO, volt_wash="#FFE6A8", on_volt=INK,
    kcal=TOMATO, kcal_deep="#B03A1E", kcal_wash="#FCE0D5",
    protein=PINK, protein_deep="#A3304E", protein_wash="#FCE3E9",
    carbs=MUSTARD, carbs_deep="#7A5200", carbs_wash="#FDEDC4",
    fat=MINT, fat_deep="#1E6A54", fat_wash="#DCF2E9",
    ok="#2F6A1C", ok_wash="#E2F0D0", warn="#7A4E00", warn_wash="#FDEBC0",
    danger="#C23A22", danger_deep="#9A2914", danger_wash="#FDE1D8", shadow_rgb="31, 26, 23")


# ───────────────────────── sticker art ─────────────────────────
def _pts(pts):
    return " ".join(f"{x:.1f},{y:.1f}" for x, y in pts)


def star_pts(cx, cy, n, ro, ri, rot=-90.0):
    out = []
    for i in range(2 * n):
        a = math.radians(rot + i * 180.0 / n)
        r = ro if i % 2 == 0 else ri
        out.append((cx + r * math.cos(a), cy + r * math.sin(a)))
    return out


def sticker_poly(pts, fill, sw=2.5, off=5):
    """polygon with an ink outline and a hard offset ink shadow"""
    p = _pts(pts)
    sh = _pts([(x + off, y + off) for x, y in pts])
    return (f"<polygon points='{sh}' fill='{INK}' stroke='{INK}' stroke-width='{sw}' stroke-linejoin='round'/>"
            f"<polygon points='{p}' fill='{fill}' stroke='{INK}' stroke-width='{sw}' stroke-linejoin='round'/>")


def sticker_path(d, fill, sw=2.5, off=5, extra=""):
    return (f"<path d='{d}' transform='translate({off} {off})' fill='{INK}' stroke='{INK}' stroke-width='{sw}' stroke-linejoin='round'/>"
            f"<path d='{d}' fill='{fill}' stroke='{INK}' stroke-width='{sw}' stroke-linejoin='round' {extra}/>")


def ribbon(d, color, w=13, sw=2.5, off=4):
    """a thick stroked line with an ink outline (+ hard shadow)"""
    o = w + 2 * sw
    return (f"<path d='{d}' transform='translate({off} {off})' fill='none' stroke='{INK}' stroke-width='{o}' stroke-linecap='round' stroke-linejoin='round'/>"
            f"<path d='{d}' fill='none' stroke='{INK}' stroke-width='{o}' stroke-linecap='round' stroke-linejoin='round'/>"
            f"<path d='{d}' fill='none' stroke='{color}' stroke-width='{w}' stroke-linecap='round' stroke-linejoin='round'/>")


# tomato: big circle, calyx, shine
def tomato_svg(D=280):
    c = D / 2 - 6
    r = c - 6
    calyx = star_pts(c - 18, c + 8, 5, 34, 13, rot=-60)
    body = (f"<circle cx='{c+6}' cy='{c+6}' r='{r}' fill='{INK}'/>"
            f"<circle cx='{c}' cy='{c}' r='{r}' fill='{TOMATO}' stroke='{INK}' stroke-width='2.5'/>"
            f"<path d='M{c-r*0.80:.1f} {c+r*0.18:.1f} A{r*0.82:.1f} {r*0.82:.1f} 0 0 1 {c-r*0.28:.1f} {c-r*0.76:.1f}' fill='none' stroke='{CREAM}' stroke-width='11' stroke-linecap='round' opacity='.9'/>"
            f"<polygon points='{_pts(calyx)}' fill='#5E8F33' stroke='{INK}' stroke-width='2.5' stroke-linejoin='round'/>"
            f"<path d='M{c-18} {c+8} q-4 -16 6 -28' fill='none' stroke='{INK}' stroke-width='7' stroke-linecap='round'/>"
            f"<path d='M{c-18} {c+8} q-4 -16 6 -28' fill='none' stroke='#5E8F33' stroke-width='3' stroke-linecap='round'/>")
    return svg(D, D, body)


# avocado half with its pit
def avocado_svg(W=230, H=290, rot=-24):
    d = ("M115 14 C152 14 170 60 178 100 C188 150 214 176 214 218 C214 258 170 276 115 276 "
         "C60 276 16 258 16 218 C16 176 42 150 52 100 C60 60 78 14 115 14 Z")
    inner = ("M115 34 C143 34 156 72 162 106 C171 152 194 178 194 216 C194 248 158 260 115 260 "
             "C72 260 36 248 36 216 C36 178 59 152 68 106 C74 72 87 34 115 34 Z")
    body = (sticker_path(d, "#4E7F2C", off=6) +
            f"<path d='{inner}' fill='#D6E79B' stroke='{INK}' stroke-width='2' stroke-linejoin='round'/>"
            f"<path d='{inner}' fill='none' stroke='{AVO}' stroke-width='9' opacity='.75' transform='translate(0 0)'/>"
            f"<circle cx='118' cy='199' r='44' fill='{INK}'/>"
            f"<circle cx='115' cy='196' r='44' fill='#A26B42' stroke='{INK}' stroke-width='2.5'/>"
            f"<path d='M92 182 a26 26 0 0 1 22 -18' fill='none' stroke='#E9C49F' stroke-width='6' stroke-linecap='round'/>")
    pad = 30
    return (f"<svg xmlns='http://www.w3.org/2000/svg' width='{W+2*pad}' height='{H+2*pad}' viewBox='{-pad} {-pad} {W+2*pad} {H+2*pad}'>"
            f"<g transform='rotate({rot} {W/2} {H/2})'>{body}</g></svg>")


def star_svg(D=150, n=8, color=MUSTARD, ri=0.66, rot=-90):
    c = D / 2 - 4
    return svg(D, D, sticker_poly(star_pts(c, c, n, c - 4, (c - 4) * ri, rot), color))


def squiggle_svg(W=230, H=90, color=BERRY, w=13):
    d = f"M16 50 q22 -38 44 0 t44 0 t44 0 t44 0"
    return svg(W, H, ribbon(d, color, w))


def wave_d(P, mid, amp, periods=(-1, 0, 1)):
    """a periodic wave drawn over several periods, so a repeat-x tile edge always cuts through a continuous stroke"""
    d = ""
    for k in periods:
        x = k * P
        d += (f"M{x} {mid} " if not d else "") + (f"C{x+P*.25:.1f} {mid-amp:.1f} {x+P*.25:.1f} {mid-amp:.1f} {x+P*.5:.1f} {mid} "
                                                  f"C{x+P*.75:.1f} {mid+amp:.1f} {x+P*.75:.1f} {mid+amp:.1f} {x+P:.1f} {mid} ")
    return d.strip()


def wave_tile(W=132, H=44, color=MINT, w=12):
    """repeat-x thick wave with an ink edge (no shadow: it reads like washi tape)"""
    d = wave_d(W, H / 2, 16)
    o = w + 5
    return svg(W, H, f"<path d='{d}' fill='none' stroke='{INK}' stroke-width='{o}'/>"
                     f"<path d='{d}' fill='none' stroke='{color}' stroke-width='{w}'/>")


def burst_svg(D=40, color=TOMATO, n=12):
    c = D / 2
    return svg(D, D, f"<polygon points='{_pts(star_pts(c, c, n, c - 1.5, c * 0.72))}' fill='{color}' stroke='{INK}' stroke-width='2' stroke-linejoin='round'/>")


def sparkle_svg(D=34, color=INK):
    c = D / 2
    d = f"M{c} 2 C{c+2} {c-2} {c+2} {c-2} {D-2} {c} C{c+2} {c+2} {c+2} {c+2} {c} {D-2} C{c-2} {c+2} {c-2} {c+2} 2 {c} C{c-2} {c-2} {c-2} {c-2} {c} 2Z"
    return svg(D, D, f"<path d='{d}' fill='{color}'/>")


DOTS = uri(dots(22, 1.55, INK, .13))
TOMATO_ART = uri(tomato_svg(280))
AVOCADO_ART = uri(avocado_svg())
STAR_ART = uri(star_svg(150))
SQUIG_ART = uri(squiggle_svg())
WAVE_ART = uri(wave_tile())
BURST = uri(burst_svg(40))
HERO_STAR = uri(star_svg(84, 8, MUSTARD, .6))
HERO_STAR2 = uri(star_svg(56, 6, PINK, .58, -60))
HERO_SPARK = uri(sparkle_svg(30, CREAM))
HERO_DOTS = uri(dots(16, 1.6, "#FFFFFF", .22))
HERO_SQUIG = uri(svg(56, 16, f"<path d='{wave_d(56, 8, 7)}' fill='none' stroke='{INK}' stroke-width='8.5'/>"
                             f"<path d='{wave_d(56, 8, 7)}' fill='none' stroke='{MUSTARD}' stroke-width='4.5'/>"))
DAY_SQUIG = uri(svg(28, 12, f"<path d='{wave_d(28, 6, 5)}' fill='none' stroke='{INK}' stroke-width='2.6'/>"))
CHECK = uri(svg(16, 16, f"<path d='M3 8.6l3.3 3.2L13 4.6' stroke='{INK}' stroke-width='2.8' fill='none' stroke-linecap='round' stroke-linejoin='round'/>"))
ARROW = uri(svg(30, 30, f"<rect x='1.25' y='1.25' width='27.5' height='27.5' rx='8' fill='{MUSTARD}' stroke='{INK}' stroke-width='2.5'/>"
                        f"<path d='M9.5 12.5l5.5 5.5 5.5-5.5' stroke='{INK}' stroke-width='2.8' fill='none' stroke-linecap='round' stroke-linejoin='round'/>"))
def halftone(W=130, H=130, step=10, rmax=3.4, color=INK, op=.2, corner=(1, 0)):
    """comic halftone: dots shrink with the distance from a corner"""
    cx, cy = corner[0] * W, corner[1] * H
    R = math.hypot(W, H) * .78
    out = []
    for j in range(int(H / step) + 1):
        for i in range(int(W / step) + 1):
            x = i * step + (step / 2 if j % 2 else 0)
            y = j * step
            r = rmax * (1 - math.hypot(x - cx, y - cy) / R)
            if r > .35:
                out.append(f"<circle cx='{x:.0f}' cy='{y:.0f}' r='{r:.2f}'/>")
    return svg(W, H, f"<g fill='{color}' opacity='{op}'>{''.join(out)}</g>")


CAL_DOTS = uri(halftone(150, 130, 10, 3.6, INK, .2, (1, 0)))


def ring_shadow(r=2.6, steps=16, color=INK, drop=5):
    """text-shadow: an outline ring + a hard extruded drop"""
    out = []
    for d in (0, drop * 0.5, drop):
        for i in range(steps if d == 0 else 10):
            a = 2 * math.pi * i / (steps if d == 0 else 10)
            out.append(f"{d + r*math.cos(a):.2f}px {d + r*math.sin(a):.2f}px 0 {color}")
    return ",".join(out)


HERO_SHADOW = ring_shadow(2.8, 16, INK, 5)


def knock(r=2.6, color=BUTTER, steps=12):
    """a butter 'die-cut' halo: invisible on the paper, keeps text clean where it crosses a sticker"""
    out = []
    for rr in (r, r * .5):
        for i in range(steps):
            a = 2 * math.pi * i / steps
            out.append(f"{rr*math.cos(a):.2f}px {rr*math.sin(a):.2f}px 0 {color}")
    return ",".join(out)


KNOCK = knock()

TOKENS = (
    '--font-display:"Unbounded","Golos Text",system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;'
    '--font-body:"Golos Text",system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;'
    "--r-sm:10px;--r-md:14px;--r-lg:16px;--r-xl:18px;--r-ctl:14px;"
    "--shadow-1:0 0 0 2.5px #1F1A17,4px 4px 0 2.5px #1F1A17;--shadow-2:0 0 0 2.5px #1F1A17,8px 8px 0 2.5px #1F1A17;"
    "--fw-display:800;--fw-fig:800;--fw-btn:700;--fw-label:700;--fw-hero:800;"
    "--ls-display:-.01em;--ls-fig:-.02em;--ls-btn:-.015em;"
    "--fs-h2:25px;--fs-h2-md:29px;--fs-h2-lg:31px;--fs-h3:18px;--fs-title:24px;--fs-q:23px;--fs-dlg:22px;"
    "--fs-fig-s:18px;--fs-fig-m:22px;--fs-fig-l:27px;--fs-fig-xl:38px;"
    "--fs-btn:16px;--fs-btn-lg:17px;--fs-btn-sm:14px;"
    "--lh-display:1.18;--hero-k:8.6;--hero-max:80px;"
)

CSS = r"""
/* ═════════ E · Наклейки ═════════ */
:focus-visible{outline:3px solid #4652C6;outline-offset:3px}
html{background:#FFF1CC}
body{background:transparent;font-weight:500;color:#1F1A17}
body::before{content:"";position:fixed;inset:0;z-index:-1;pointer-events:none;background:__DOTS__ repeat 0 0 / 22px 22px}
body::after{content:"";position:fixed;inset:0;z-index:-1;pointer-events:none;
  background:
    __TOMATO__ no-repeat right -104px top -92px / 280px 280px,
    __STAR__ no-repeat left -52px top 41% / 140px 140px,
    __SQUIG__ no-repeat right -54px top 63% / 210px auto,
    __AVOCADO__ no-repeat left -96px bottom 64px / 250px auto,
    __WAVE__ repeat-x left 0 top 84% / 132px 44px;}
::selection{background:#F3B431;color:#1F1A17}

/* ── top bar ── */
.topbar__menu-btn{width:46px;height:46px;border-radius:13px;background:#FFFAF0;color:#1F1A17;border:2.5px solid #1F1A17;box-shadow:3px 3px 0 #1F1A17;transition:transform .08s ease,box-shadow .08s ease}
.topbar__menu-btn:active{transform:translate(2px,2px);box-shadow:1px 1px 0 #1F1A17}
.topbar__brand{color:#1F1A17;text-shadow:__KNOCK__;font-size:20px;letter-spacing:-.02em}
@media(max-width:389px){.topbar__brand{font-size:17px;gap:6px}.topbar__brand-mark{width:32px;height:32px}.topbar__menu-btn{width:44px;height:44px}.topbar__profile-btn{padding:0 12px 0 5px}}
@media(min-width:901px){.topbar__brand{font-size:24px}}
.topbar__brand-mark{width:36px;height:36px;border-radius:11px;background:#F3B431;color:#1F1A17;border:2.5px solid #1F1A17;box-shadow:2px 2px 0 #1F1A17;transform:rotate(-2deg);text-shadow:none}
@@PROFILE@@{height:46px;padding:0 14px 0 6px;background:#FFFAF0;border:2.5px solid #1F1A17;border-radius:14px;box-shadow:3px 3px 0 #1F1A17;color:#1F1A17;font-size:var(--fs-sm);font-weight:700}
.topbar__profile-avatar{width:30px;height:30px;background:#9ED9C3;color:#1F1A17;border:2px solid #1F1A17}
.topbar__menu{border-radius:16px;background:#FFFAF0}

/* ── hero: blueberry banner, the name is a chunky sticker word ── */
.hero{position:relative;border:2.5px solid #1F1A17;border-radius:20px;color:#FFFAF0;
  background:
    __HERO_STAR__ no-repeat left -30px top -30px / 76px 76px,
    __HERO_STAR2__ no-repeat right -10px bottom -16px / 54px 54px,
    __HERO_SPARK__ no-repeat right 14px top 10px / 20px 20px,
    __HERO_SPARK__ no-repeat left 15% bottom 12px / 14px 14px,
    __HERO_DOTS__ repeat 0 0 / 16px 16px,
    #6B7BE8;
  box-shadow:5px 5px 0 #1F1A17}
.hero::before{content:none}
.hero::after{content:"";height:16px;width:min(46%,260px);margin:0 auto 14px;background:__HERO_SQUIG__ repeat-x left center / 56px 16px}
.hero__texto{padding:16px 12px 8px}
.hero__nombre{color:#FFFAF0;transform:rotate(-2deg);text-shadow:__HERO_SHADOW__;padding-bottom:4px}

/* ── titles ── */
h2{color:#1F1A17}
h2 em{background:#F3B431;border:2.5px solid #1F1A17;border-radius:10px;padding:0 .14em;box-shadow:3px 3px 0 #1F1A17;text-shadow:none;-webkit-box-decoration-break:clone;box-decoration-break:clone}
.eyebrow{color:#4A3F37;font-weight:500;margin-top:10px}
/* text that sits right on the paper gets a butter die-cut halo, so a sticker behind it never hurts legibility */
.output-top>div:first-child,.shopping-panel__head>div:first-child,.today-plans-panel__head>div:first-child,.nocook-panel__head>div:first-child,.day-slide__head,.days-carousel__hint,
.schedule-timeline__note,.shopping-progress__texto,.shopping-share-note,.nocook-panel>.status{text-shadow:__KNOCK__}
/* the little badge rides above the title, so the title gets the full width */
.output-top,.shopping-panel__head,.nocook-panel__head{flex-direction:column-reverse;align-items:flex-start;gap:10px}
.output-top .badge,.shopping-panel__head .badge,.nocook-panel__head .badge{margin:0 0 0 2px}
/* section labels = coloured sticker tabs */
@@SECTION_LABEL@@{display:inline-flex;width:fit-content;max-width:100%;align-items:center;gap:8px;padding:7px 12px 6px 9px;
  border:2.5px solid #1F1A17;border-radius:10px;background:#F3B431;color:#1F1A17;box-shadow:3px 3px 0 #1F1A17;transform:rotate(-2deg);
  font:700 13px/1.15 var(--font-display);letter-spacing:.01em}
.form-section-label::before,.budget-group-label::before{content:"";flex:none;width:9px;height:9px;border-radius:50%;background:#FFFAF0;border:2px solid #1F1A17;box-shadow:none;transform:none}
.budget-group-label{background:#F6A9B8;margin-bottom:14px}
.panel>.form-section-label{margin-bottom:20px}
.badge{height:32px;padding:0 12px;background:#9ED9C3;color:#1F1A17;border:2px solid #1F1A17;border-radius:999px;box-shadow:2px 2px 0 #1F1A17;transform:rotate(2deg)}
.badge svg{color:#1F1A17}

/* ── cards ── */
@@PANEL@@{background:#FFFAF0;border:2.5px solid #1F1A17;border-radius:18px;box-shadow:6px 6px 0 #1F1A17}
@@CARD@@{background:#FFFAF0;border:2.5px solid #1F1A17;border-radius:16px;box-shadow:5px 5px 0 #1F1A17}
.resumen-datos{border-radius:16px;padding:8px 8px 8px 14px}
.resumen-datos__texto{color:#4A3F37}
@@WELL@@{border-radius:12px}
.meta{padding:9px 8px 10px 10px;background:#FFF1CC;border:2px dashed #1F1A17}
.meta .k{color:#4A3F37}
.meta .v{font-family:var(--font-body);font-size:17px;font-weight:800}
/* phones: the three facts become ticket rows, so a long label never breaks mid-word */
@media(max-width:600px){.meta-boxes{grid-template-columns:minmax(0,1fr);gap:6px}.meta{display:flex;align-items:baseline;justify-content:space-between;gap:10px;padding:8px 12px}.meta .v{margin-top:0}}

/* ── buttons: outlined stickers that press down ── */
@@BTN_P@@,@@BTN_CTA@@{border:2.5px solid #1F1A17;border-radius:14px;background:#8DBB4E;color:#1F1A17;box-shadow:4px 4px 0 #1F1A17;
  transition:transform .08s ease,box-shadow .08s ease,background-color .15s ease}
@@BTN_P@@ svg,@@BTN_CTA@@ svg{color:#1F1A17}
@@BTN_P@@:hover,@@BTN_CTA@@:hover{background:#98C55A;border-color:#1F1A17;transform:translate(-1px,-1px);box-shadow:6px 6px 0 #1F1A17}
@@BTN_P@@:active,@@BTN_CTA@@:active{transform:translate(3px,3px);box-shadow:1px 1px 0 #1F1A17}
@@BTN_P@@:disabled,@@BTN_CTA@@:disabled{background:#F4EAD3;color:#6B5F55;border:2.5px dashed #1F1A17;box-shadow:none;transform:none}
@@BTN_S@@{border:2.5px solid #1F1A17;border-radius:14px;background:#FFFAF0;color:#1F1A17;box-shadow:4px 4px 0 #1F1A17;font-family:var(--font-body);font-weight:800;
  transition:transform .08s ease,box-shadow .08s ease,background-color .15s ease}
@@BTN_S@@:hover{background:#FFF1CC;transform:translate(-1px,-1px);box-shadow:6px 6px 0 #1F1A17}
@@BTN_S@@:active{transform:translate(3px,3px);box-shadow:1px 1px 0 #1F1A17}
@@BTN_S@@:disabled{background:#F4EAD3;color:#6B5F55;border:2.5px dashed #1F1A17;box-shadow:none;transform:none}
@@BTN_S@@ svg{color:#1F1A17}
.actions-secondary .btn-secondary,.shopping-panel__actions .btn-secondary{padding:0 12px;gap:8px;font-size:var(--fs-btn)}
.actions-secondary #resetBtn{border-color:transparent;background:none;box-shadow:none;color:#4A3F37;text-decoration:underline;text-decoration-color:#E8573A;text-decoration-thickness:2px;text-underline-offset:5px;transform:none}
@@BTN_SM@@{border:2px solid #1F1A17;border-radius:11px;background:#F3B431;color:#1F1A17;box-shadow:3px 3px 0 #1F1A17;font-family:var(--font-body);font-weight:800;transition:transform .08s ease,box-shadow .08s ease}
@@BTN_SM@@:hover{background:#F7C04D;border-color:#1F1A17;color:#1F1A17;transform:translate(-1px,-1px);box-shadow:4px 4px 0 #1F1A17}
@@BTN_SM@@:active{transform:translate(2px,2px);box-shadow:1px 1px 0 #1F1A17}
.meal-swap-btn{background:#F6A9B8}
.meal-swap-btn:hover{background:#F8B7C3}
.pantry-active-card__delete{background:#FFFAF0;color:#9A2914}
.pantry-active-card__delete--armed{background:#C23A22;color:#fff}
@@BTN_DANGER@@{border:2.5px solid #1F1A17;border-radius:14px;background:#C23A22;color:#fff;box-shadow:4px 4px 0 #1F1A17}
.pantry-active-card__buy-btn--secondary{background:#FFFAF0}
@@BTN_ICON@@{background:#FFFAF0;color:#1F1A17;border:2.5px solid #1F1A17;box-shadow:3px 3px 0 #1F1A17}
.link-btn,.pantry-link-btn,.auth-dialog__switch-btn,.onboarding__link,.site-footer__link,.onboarding__skip,.onboarding__skip-questions,.tour__skip{text-decoration-color:#E8573A}
.onboarding__link{min-height:40px}

/* ── chips, tiles, selections ── */
@@CHIP@@{position:relative;background:#FFFAF0;border:2.5px solid #1F1A17;border-radius:14px;box-shadow:3px 3px 0 #1F1A17;color:#1F1A17;
  transition:transform .08s ease,box-shadow .08s ease,background-color .15s ease}
@@CHIP@@:hover{background:#FFF1CC;border-color:#1F1A17}
@@CHIP_ON@@{background:#8DBB4E;border-color:#1F1A17;color:#1F1A17;box-shadow:3px 3px 0 #1F1A17}
.baldosa.is-activa::after,.visually-hidden:checked + .budget-chip::after,.onboarding__choice.is-selected::after{content:"";position:absolute;z-index:2;top:-11px;right:-9px;width:26px;height:26px;border-radius:50%;
  background:__CHECK__ center / 15px no-repeat,#FFFAF0;border:2.5px solid #1F1A17;box-shadow:2px 2px 0 #1F1A17}
.budget-chip{padding:12px 10px 12px 12px}
/* narrow phones: one chip per row, label and price side by side (they wrap under each other if still too wide) */
@media(max-width:389px){.budget-modes{grid-template-columns:minmax(0,1fr)}.budget-chip{min-height:56px;flex-direction:row;align-items:center;justify-content:space-between;gap:12px;padding:10px 14px}.budget-chip__amount{font-size:18px}}
@media(max-width:359px){.budget-chip{flex-direction:column;align-items:flex-start;justify-content:center;gap:5px}}
.budget-chip__title{color:#4A3F37}
.visually-hidden:checked + .budget-chip .budget-chip__title{color:#1F1A17}
.visually-hidden:checked + .budget-chip .budget-chip__amount,.onboarding__choice.is-selected .onboarding__choice-amount{color:#1F1A17}
.onboarding__choice.is-selected .onboarding__choice-note{color:#1F1A17}
.budget-chip__amount{font-size:20px}
.onboarding__choice-amount{font-size:18px}
/* choices that carry a price get a full-width row each: in two columns the wide figure squeezed the label */
.onboarding__answer--choices:has(.onboarding__choice-amount){grid-template-columns:minmax(0,1fr)}
.onboarding__choice:has(.onboarding__choice-amount){padding:12px 16px}
@media(max-width:389px){.onboarding__choice:has(.onboarding__choice-amount){grid-template-columns:minmax(0,1fr);gap:5px}}
.date-chip--today::after{background:#E8573A;box-shadow:0 0 0 2px #1F1A17}
.pantry-meal-chip__time{color:#B03A1E}
.pantry-meal-chip--cooked .pantry-meal-chip__time{color:#1F1A17}
@@SEG@@{background:#FFFAF0;border:2.5px solid #1F1A17;border-radius:16px;box-shadow:3px 3px 0 #1F1A17}
@@SEG_BTN@@{border-radius:11px;color:#1F1A17;background:transparent}
@@SEG_BTN@@:hover{background:#FFF1CC}
@@SEG_ON@@,@@SEG_ON@@:hover{background:#1F1A17;color:#FFFAF0;box-shadow:none}
@@STEP@@{background:#FFFAF0;border:2.5px solid #1F1A17;border-radius:16px;box-shadow:3px 3px 0 #1F1A17}
@@STEP@@:focus-within{background:#FFFFFF;box-shadow:3px 3px 0 #4652C6}
.paso-a-paso input[type="number"]{border:0;background:transparent;box-shadow:none;color:#1F1A17}
@@STEP_BTN@@{border:2px solid #1F1A17;border-radius:11px;background:#FFFAF0;color:#1F1A17;box-shadow:2px 2px 0 #1F1A17;font-weight:600;transition:transform .08s ease,box-shadow .08s ease}
@@STEP_PLUS@@{background:#F3B431;color:#1F1A17;box-shadow:2px 2px 0 #1F1A17}
@@STEP_BTN@@:active{transform:translate(2px,2px);box-shadow:0 0 0 #1F1A17}
@@FIELD@@{background-color:#FFFAF0;border:2.5px solid #1F1A17;border-radius:12px;font-weight:600;color:#1F1A17}
@@FIELD@@:focus{border-color:#1F1A17;background-color:#FFFFFF;box-shadow:inset 4px 4px 0 #AEB7F5}
select{background-image:__ARROW__;background-size:30px 30px;background-position:right 9px center;padding-right:48px}
.field>label,.budget-custom-field>label{color:#1F1A17}
.field-hint{color:#5F534A}

/* ── scoreboard: four colour-block stickers ── */
.nutrition-strip{background:none;box-shadow:none;padding:0 5px 5px 0;gap:12px 10px;overflow:visible;border-radius:0;color:#1F1A17}
.nutrition-strip .summary-card{border:2.5px solid #1F1A17;border-radius:16px;padding:13px 11px 14px;box-shadow:4px 4px 0 #1F1A17;color:#1F1A17}
.nutrition-strip .summary-card--calories{padding:16px 16px 17px;background:__CAL_DOTS__ no-repeat right -6px top -6px / 110px 110px,#F2836A}
.summary-card--protein{background:#F6A9B8;transform:rotate(-1.2deg)}
.summary-card--carbs{background:#F3B431;transform:rotate(1deg)}
.summary-card--fat{background:#9ED9C3;transform:rotate(-.8deg)}
.summary-card h3{color:#1F1A17}
.summary-card .sub{color:#1F1A17;font-weight:500;text-wrap:pretty}
.summary-card .big,.summary-card--calories .big,.summary-card--protein .big,.summary-card--carbs .big,.summary-card--fat .big{color:#1F1A17}
.icon-badge{width:28px;height:28px;border-radius:50%;background:#FFFAF0;color:#1F1A17;border:2px solid #1F1A17}
.summary-card--calories .icon-badge,.summary-card--protein .icon-badge,.summary-card--carbs .icon-badge,.summary-card--fat .icon-badge{background:#FFFAF0}
.insights .icon-badge{background:#F3B431;color:#1F1A17}
@container (min-width:620px){.nutrition-strip{grid-template-columns:1.4fr repeat(3,minmax(0,1fr))}.nutrition-strip .summary-card--calories{grid-column:auto}}

/* units next to the wide figures are set in the narrow body face */
.u{font-family:var(--font-body);font-weight:700}

/* ── timeline, day head, meal cards ── */
.schedule-timeline__row{padding-bottom:10px}
.schedule-timeline__item{border:2.5px solid #1F1A17;border-radius:14px;background:#FFFAF0;box-shadow:4px 4px 0 #1F1A17}
.schedule-timeline__item:hover{border-color:#1F1A17}
.schedule-timeline__item--next{background:#F3B431}
.schedule-timeline__next-tag{background:#1F1A17;color:#FFFAF0;border-radius:8px;transform:rotate(2deg)}
.schedule-timeline__time{color:#1F1A17}
.schedule-timeline__label{color:#4A3F37}
.schedule-timeline__item--next .schedule-timeline__label{color:#1F1A17}
.day-slide__head::after{height:12px;border-radius:0;background:__DAY_SQUIG__ repeat-x left center / 28px 12px}
.day-slide__of{color:#4A3F37}
.days-carousel__dot::before{width:12px;height:12px;background:#FFFAF0;border:2px solid #1F1A17}
.days-carousel__dot.is-active::before{width:30px;background:#E8573A}
.days-carousel__arrow{background:#F3B431;color:#1F1A17;border:2.5px solid #1F1A17;border-radius:12px;box-shadow:3px 3px 0 #1F1A17}
.meal-time-badge{height:36px;padding:0 8px;border:2px solid #1F1A17;border-radius:10px;background:#9ED9C3;color:#1F1A17;box-shadow:2px 2px 0 #1F1A17;font-size:17px}
.meal-head{gap:12px 8px}
.meal-kcal{color:#B03A1E;font-size:20px}
.meal-items{border-top:2.5px dashed #1F1A17}
.food-row{border-bottom:2px dashed rgba(31,26,23,.28)}
.food-qty__grams{color:#5F534A}
.food-macro__badge,.food-purchase__badge{background:#DCF2E9;color:#1F1A17;border:1.5px solid #1F1A17;border-radius:999px;padding:1px 8px}
.meal-steps__badge,.nocook-level,.nutrition-approx,.verified-card__badge,.nocook-item__whole,.shopping-item__pantry{border:1.5px solid #1F1A17;box-shadow:none}
.meal-steps__badge{background:#DCF2E9;color:#1F1A17}.meal-steps__badge--d2{background:#FDEBC0;color:#1F1A17}.meal-steps__badge--d3{background:#FCE0D5;color:#1F1A17}
.eyebrow{margin-top:12px}
.food-purchase{background:#FFF1CC;border:2px dashed #1F1A17;border-radius:10px;box-shadow:none}
.food-cost__tag{color:#5F534A}
/* very narrow cards: the package cost gets its own line instead of colliding with the usage cost */
@container (max-width:290px){.food-row{grid-template-areas:"name kcal" "meta meta" "costs costs" "pack pack" "buy buy"}.food-cost--package{grid-area:pack;justify-self:start}}
.meal-footer{background:#FFF1CC;border-top:2.5px solid #1F1A17}
.meal-footer>div{color:#4A3F37}
.meal-footer>div::before{height:9px;border-radius:5px;border:2px solid #1F1A17;background:#FFFAF0}
.meal-footer>div:nth-child(1)::before{background:#F6A9B8}
.meal-footer>div:nth-child(2)::before{background:#F3B431}
.meal-footer>div:nth-child(3)::before{background:#9ED9C3}
.meal-footer>div:nth-child(4)::before{background:#E8573A}
.meal-footer>div:nth-child(5)::before{background:#8DBB4E}
.meal-steps{border-top:2.5px solid #1F1A17}
.meal-steps__toggle::after{border-color:#1F1A17}
.meal-steps__list li::before{border-radius:9px;background:#F3B431;color:#1F1A17;border:2px solid #1F1A17}
.meal-make-ahead,.meal-cook-note{border:2px solid #1F1A17;border-radius:12px;box-shadow:none}
.meal-card--empty{border:2.5px dashed #1F1A17;background:#FFFAF0;box-shadow:none}
.empty-icon{background:#F3B431;color:#1F1A17;border:2.5px solid #1F1A17;box-shadow:3px 3px 0 #1F1A17;transform:rotate(-2deg)}

/* ── next meal strip ── */
.next-meal-sticky__btn{border:2.5px solid #1F1A17;border-radius:14px;background:#BFE6D6;color:#1F1A17;box-shadow:4px 4px 0 #1F1A17}
.next-meal-sticky__eyebrow{background:#E8573A;color:#1F1A17;border:2px solid #1F1A17;border-radius:8px;transform:rotate(-2deg)}

/* ── shopping ── */
.shopping-summary__stat{gap:8px;padding:12px 11px 13px}
.shopping-summary__stat{justify-content:space-between}
.shopping-summary__stat span{color:#4A3F37;font-size:var(--fs-cap)}
@media(max-width:359px){.shopping-summary__stat:not(:nth-child(2)){flex:1 1 40%}}
/* 19px, o menos si la tarjeta no da: su tipografía es muy ancha y a 360 px "€12.26" se salía. */
.shopping-summary__stat:not(:nth-child(2)) strong{font-size:min(19px,22cqw)}
@media(min-width:600px){.shopping-summary__stat:not(:nth-child(2)) strong{font-size:var(--fs-fig-m)}.shopping-summary__stat{padding:14px 16px 15px}}
.shopping-summary__stat:nth-child(2){padding:16px 18px 18px}
.shopping-summary__stat:nth-child(2){background:#8DBB4E;transform:rotate(-1deg)}
.shopping-summary__stat:nth-child(2) span,.shopping-summary__stat:nth-child(2) strong{color:#1F1A17}
.shopping-progress__texto{color:#1F1A17;font-weight:600}
.shopping-progress__barra{height:24px;padding:3px;background:repeating-linear-gradient(-45deg,rgba(31,26,23,.09) 0 2px,transparent 2px 8px),#FFFAF0;border:2.5px solid #1F1A17;box-shadow:3px 3px 0 #1F1A17}
.shopping-progress__barra>span{background:repeating-linear-gradient(-45deg,#8DBB4E 0 7px,#A6CF6C 7px 14px);box-shadow:inset 0 0 0 2px #1F1A17}
.shopping-item__check::before,.pantry-purchase-row__check::before{inset:9px;border:2.5px solid #1F1A17;border-radius:8px;background:#FFFAF0}
.shopping-item__check[aria-checked="true"]::before,.pantry-purchase-row__check[aria-checked="true"]::before{background:#8DBB4E;border-color:#1F1A17}
.shopping-item__check[aria-checked="true"]::after,.pantry-purchase-row__check[aria-checked="true"]::after{border-color:#1F1A17}
.shopping-item__meta,.shopping-item__usage-price{color:#5F534A}
.shopping-item.is-comprado{background:#F4EAD3;box-shadow:2px 2px 0 #1F1A17}
.product-find-btn{background:#FFF1CC;box-shadow:none;border:2px solid #1F1A17;border-radius:11px}
.confirm-receipt{background:#DCF2E9;border:2.5px solid #1F1A17;box-shadow:3px 3px 0 #1F1A17;border-radius:14px}
.shopping-share-note{color:#4A3F37}

/* ── no-cook plan ── */
.nocook-disclaimer{padding:12px 14px;background:#FFFAF0;border:2px dashed #1F1A17;border-radius:14px;color:#4A3F37}
.nocook-summary__warn{border:2px solid #1F1A17;border-radius:12px;box-shadow:none}
.nocook-summary__target,.nocook-item__brand,.nocook-item__package,.nocook-item__grams{color:#5F534A}
.nocook-slot__head{grid-template-columns:auto minmax(0,1fr) auto;grid-template-areas:"time . kcal" "title title title" "kind kind swap"}
.nocook-slot__head h3{font-size:20px}
.nocook-slot__kind{background:#FFF1CC;border:1.5px solid #1F1A17;color:#1F1A17}
.nocook-slot__kcal{color:#B03A1E;font-size:20px}

/* ── my plans ── */
.pantry-plans-empty{border:2.5px dashed #1F1A17;border-radius:16px;background:#FFFAF0;color:#4A3F37}
.pantry-purchase-checklist-wrap{background:#FFF1CC;border:2px dashed #1F1A17}
.pantry-active-card__purchase--done{border:2px solid #1F1A17}

/* ── tab bar ── */
@media screen and (max-width:900px){
  body.con-pestanas .tabbar{background:#FFFAF0;border:2.5px solid #1F1A17;border-radius:20px;padding:6px;gap:4px;box-shadow:5px 5px 0 #1F1A17}
  .tabbar__btn{color:#1F1A17;font-weight:700;border-radius:13px;border:2px solid transparent;transition:background-color .15s ease,transform .08s ease}
  .tabbar__btn.is-activa{background:#F3B431;color:#1F1A17;border-color:#1F1A17;box-shadow:2px 2px 0 #1F1A17}
  .tabbar__cuenta{top:-3px;left:calc(50% + 4px);min-width:28px;height:28px;padding:0 3px;border-radius:0;background:__BURST__ center / 100% 100% no-repeat;color:#1F1A17;box-shadow:none;line-height:28px}
}

/* ── welcome + questions ── */
.onboarding{background:
    __TOMATO__ no-repeat right -110px top -96px / 280px 280px,
    __STAR__ no-repeat left -44px top 22% / 130px 130px,
    __SQUIG__ no-repeat right -60px top 38% / 210px auto,
    __AVOCADO__ no-repeat left -90px bottom -40px / 250px auto,
    __WAVE__ repeat-x left 0 top 78% / 132px 44px,
    __DOTS__ repeat 0 0 / 22px 22px,
    #FFF1CC}
.onboarding__card{width:calc(100% - 28px);margin:auto auto 14px;border:2.5px solid #1F1A17;border-radius:22px;background:#FFFAF0;box-shadow:6px 6px 0 #1F1A17}
@media(min-width:640px){.onboarding__card{width:min(520px,calc(100% - 40px));margin:auto}}
.onboarding__brand-mark{border-radius:12px;background:#F3B431;color:#1F1A17;border:2.5px solid #1F1A17;box-shadow:2px 2px 0 #1F1A17;transform:rotate(-2deg)}
.onboarding__title{color:#1F1A17;font-size:24px;line-height:1.32}
.onboarding__title-accent{background:#F3B431;border:2.5px solid #1F1A17;border-radius:10px;padding:0 .12em;box-shadow:3px 3px 0 #1F1A17}
.onboarding__summary li{color:#4A3F37}
.onboarding__summary li::before{width:15px;height:15px;border-radius:50%;background:#8DBB4E;box-shadow:none;border:2px solid #1F1A17;transform:none}
.onboarding__check input{border:2.5px solid #1F1A17;border-radius:8px;background:#FFFAF0;box-shadow:2px 2px 0 #1F1A17}
.onboarding__check input:checked{background:#8DBB4E}
.onboarding__check input:checked::after{border-color:#1F1A17}
.onboarding__progress{height:16px;background:#FFFAF0;border:2.5px solid #1F1A17;box-shadow:2px 2px 0 #1F1A17}
.onboarding__progress-bar{background:repeating-linear-gradient(-45deg,#E8573A 0 7px,#EF7458 7px 14px);border-right:2.5px solid #1F1A17;border-radius:999px}
.onboarding__progress-label{color:#4A3F37}
.onboarding__hint,.onboarding__skip-note{color:#4A3F37}
.onboarding__error,.auth-dialog__error{border:2px solid #1F1A17;border-radius:12px;box-shadow:none}
.onboarding__unit{color:#4A3F37}
.onboarding__number,.onboarding__time,.onboarding__text{background-color:#FFFAF0;border:2.5px solid #1F1A17;border-radius:16px;box-shadow:3px 3px 0 #1F1A17}

/* ── tour + dialogs ── */
.tour__hole,.tour__foco{box-shadow:0 0 0 100vmax rgba(31,26,23,.72),0 0 0 3px #F3B431}
.tour__card{border:2.5px solid #1F1A17;border-radius:18px;background:#FFFAF0;box-shadow:6px 6px 0 #1F1A17}
.tour__counter{color:#4A3F37}
.tour__prev,.tour__next{padding:0 14px}
.tour__nav{gap:10px}
.auth-dialog,.ajustes-dialog{background:#FFFAF0;border:2.5px solid #1F1A17;border-bottom:0;border-radius:22px 22px 0 0;box-shadow:0 -5px 0 #1F1A17}
@media(min-width:640px){.auth-dialog,.ajustes-dialog{border-bottom:2.5px solid #1F1A17;border-radius:22px;box-shadow:8px 8px 0 #1F1A17}}
.ajustes-dialog__head,.legal-dialog__foot{background:#FFFAF0}
.auth-dialog::backdrop,.ajustes-dialog::backdrop{background:rgba(31,26,23,.6)}
.ajustes-action{border:2.5px solid #1F1A17;border-radius:12px;background:#FFFAF0;box-shadow:3px 3px 0 #1F1A17}
.ajustes-action:hover{background:#FFF1CC}
.ajustes-group__title{color:#1F1A17}
.ajustes-group + .ajustes-group{border-top:2px dashed rgba(31,26,23,.3)}
.auth-divider::before,.auth-divider::after{height:0;background:none;border-top:2px dashed rgba(31,26,23,.3)}
.legal-dialog__foot{border-top:2px dashed rgba(31,26,23,.3)}
.ajustes-group__hint{color:#5F534A}
.warning{border:2.5px solid #1F1A17;border-radius:14px;box-shadow:3px 3px 0 #1F1A17}
.insights li::before{border-radius:50%;background:#8DBB4E;box-shadow:0 0 0 2px #1F1A17;transform:none}
.footer-note{margin-top:22px;padding:12px 14px;background:#FFFAF0;border:2px dashed #1F1A17;border-radius:14px;color:#4A3F37;text-shadow:none}
.site-footer{margin-top:14px;padding:6px 10px;background:#FFFAF0;border:2.5px solid #1F1A17;border-radius:14px;box-shadow:3px 3px 0 #1F1A17;color:#4A3F37;text-shadow:none}
.site-footer__sep{color:#5F534A}
.disclosure__chevron{color:#1F1A17}
"""

for k, v in {"__DOTS__": DOTS, "__TOMATO__": TOMATO_ART, "__AVOCADO__": AVOCADO_ART, "__STAR__": STAR_ART, "__SQUIG__": SQUIG_ART,
             "__WAVE__": WAVE_ART, "__BURST__": BURST, "__HERO_STAR__": HERO_STAR, "__HERO_STAR2__": HERO_STAR2,
             "__HERO_SPARK__": HERO_SPARK, "__HERO_DOTS__": HERO_DOTS, "__HERO_SQUIG__": HERO_SQUIG, "__DAY_SQUIG__": DAY_SQUIG,
             "__CHECK__": CHECK, "__KNOCK__": KNOCK, "__ARROW__": ARROW, "__CAL_DOTS__": CAL_DOTS, "__HERO_SHADOW__": HERO_SHADOW}.items():
    CSS = CSS.replace(k, v)

V = dict(
    id="pegatinas", name="Наклейки",
    desc="Весёлый «нео-брутализм»: жёлтая бумага в точку с большими наклейками-едой (помидор, авокадо, звезда) на фоне, "
         "толстый чёрный контур и жёсткая тень у карточек, кнопки-наклейки, которые вдавливаются, цветные плитки макросов.",
    sw=[BUTTER, CREAM, INK, TOMATO, AVO, MUSTARD, BERRY, PINK],
    fonts=["unbounded", "golos-text"], palette=PAL, tokens=TOKENS, css=CSS)
