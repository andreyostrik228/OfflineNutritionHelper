# -*- coding: utf-8 -*-
"""Ayudas para dibujar el fondo y los adornos de cada aspecto (SVG inline -> CSS).

SVG / CSS art helpers for the visual themes.

Everything returns plain strings that can be dropped into CSS:
    background: <uri(svg)> no-repeat right -40px top 60px / 240px;
Nothing here touches the repo.
"""
import math, random, re, urllib.parse


def uri(svg):
    """Inline SVG -> CSS `url("data:image/svg+xml,...")` (escapes # % < > ")."""
    s = re.sub(r"\s+", " ", svg.strip())
    s = s.replace("> <", "><")
    enc = urllib.parse.quote(s, safe="/:=,;()' .-_~*!@$&+?|[]")
    return f'url("data:image/svg+xml,{enc}")'


def svg(w, h, body, extra=""):
    return f"<svg xmlns='http://www.w3.org/2000/svg' width='{w}' height='{h}' viewBox='0 0 {w} {h}' {extra}>{body}</svg>"


# ───────────────────────── leaves & branches ─────────────────────────
def leaf_d(L=60, W=22):
    """Almond leaf lying on +x axis, base at (0,0), tip at (L,0)."""
    return f"M0 0 C{L*0.25:.1f} {-W:.1f} {L*0.75:.1f} {-W:.1f} {L} 0 C{L*0.75:.1f} {W:.1f} {L*0.25:.1f} {W:.1f} 0 0Z"


def leaf(x, y, ang, L, W, fill, vein=None, op=1.0):
    v = f"<path d='M2 0 L{L*0.92:.1f} 0' stroke='{vein}' stroke-width='1.6' fill='none' stroke-linecap='round' opacity='.55'/>" if vein else ""
    return (f"<g transform='translate({x:.1f} {y:.1f}) rotate({ang:.1f})' opacity='{op}'>"
            f"<path d='{leaf_d(L, W)}' fill='{fill}'/>{v}</g>")


def branch(w=300, h=360, fill="#D5E6CC", vein=None, stem=None, seed=3, n=7, op=1.0, flip=False, rot=0):
    """A curved twig with leaves on both sides. Drawn bottom-left -> top-right."""
    rnd = random.Random(seed)
    stem = stem or fill
    # quadratic stem from (20, h-10) to (w-30, 30)
    x0, y0, x1, y1 = 20, h - 10, w - 40, 30
    cx, cy = w * 0.18, h * 0.35
    parts = [f"<path d='M{x0} {y0} Q{cx:.1f} {cy:.1f} {x1} {y1}' stroke='{stem}' stroke-width='5' fill='none' stroke-linecap='round' opacity='{op}'/>"]
    for i in range(n):
        t = (i + 1) / (n + 1)
        # point on quadratic
        px = (1 - t) ** 2 * x0 + 2 * (1 - t) * t * cx + t * t * x1
        py = (1 - t) ** 2 * y0 + 2 * (1 - t) * t * cy + t * t * y1
        # tangent
        tx = 2 * (1 - t) * (cx - x0) + 2 * t * (x1 - cx)
        ty = 2 * (1 - t) * (cy - y0) + 2 * t * (y1 - cy)
        ta = math.degrees(math.atan2(ty, tx))
        L = rnd.uniform(58, 84) * (1.1 - 0.5 * t)
        Wd = L * rnd.uniform(0.27, 0.34)
        parts.append(leaf(px, py, ta - rnd.uniform(38, 58), L, Wd, fill, vein, op))
        parts.append(leaf(px, py, ta + rnd.uniform(38, 58), L * rnd.uniform(0.85, 1), Wd, fill, vein, op))
    # tip leaf
    parts.append(leaf(x1, y1, math.degrees(math.atan2(y1 - cy, x1 - cx)), 70, 22, fill, vein, op))
    body = "".join(parts)
    pad = 60
    if flip:
        body = f"<g transform='translate({w} 0) scale(-1 1)'>{body}</g>"
    if rot:
        body = f"<g transform='rotate({rot} {w/2} {h/2})'>{body}</g>"
    return (f"<svg xmlns='http://www.w3.org/2000/svg' width='{w+2*pad}' height='{h+2*pad}' viewBox='{-pad} {-pad} {w+2*pad} {h+2*pad}'>{body}</svg>")


def leaf_tile(size=64, fill="#ffffff", op=0.10, vein=None):
    """Small seamless-ish tile of scattered leaves (for banners)."""
    b = (leaf(14, 20, -35, 22, 8, fill, vein, op) + leaf(46, 12, 40, 18, 7, fill, vein, op) +
         leaf(36, 44, -80, 24, 8, fill, vein, op) + leaf(10, 54, 15, 16, 6, fill, vein, op) +
         leaf(58, 52, 150, 16, 6, fill, vein, op))
    return svg(size, size, b)


# ───────────────────────── simple patterns ─────────────────────────
def dots(size=18, r=1.4, color="#000", op=.12):
    return svg(size, size, f"<circle cx='{size/2}' cy='{size/2}' r='{r}' fill='{color}' opacity='{op}'/>")


def grid(size=28, color="#000", op=.06, w=1):
    return svg(size, size, f"<path d='M{size} 0H0V{size}' fill='none' stroke='{color}' stroke-width='{w}' opacity='{op}'/>")


def lines(size=32, color="#000", op=.07, w=1):
    return svg(8, size, f"<path d='M0 {size-0.5}H8' stroke='{color}' stroke-width='{w}' opacity='{op}'/>")


def noise(size=160, op=.08, freq=.8):
    """Paper grain via feTurbulence (alpha only, so it tints whatever is behind)."""
    return svg(size, size,
               f"<filter id='n' x='0' y='0' width='100%' height='100%'><feTurbulence type='fractalNoise' baseFrequency='{freq}' numOctaves='2' stitchTiles='stitch'/>"
               f"<feColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 {op*6:.2f} 0'/></filter>"
               f"<rect width='100%' height='100%' filter='url(#n)'/>")


def topo(w=720, h=720, color="#fff", op=.07, seed=5, rings=14, centers=3, sw=1.4):
    """Topographic contour lines: nested wobbly rings around a few hill centres."""
    rnd = random.Random(seed)
    out = []
    for c in range(centers):
        cx, cy = rnd.uniform(.15, .85) * w, rnd.uniform(.15, .85) * h
        base = rnd.uniform(.18, .3) * min(w, h)
        a2, a3, a5 = rnd.uniform(.05, .13), rnd.uniform(.03, .09), rnd.uniform(.02, .05)
        p2, p3, p5 = (rnd.uniform(0, 6.28) for _ in range(3))
        for k in range(1, rings + 1):
            r = base * k / rings * 1.35
            pts = []
            for i in range(0, 361, 6):
                t = math.radians(i)
                rr = r * (1 + a2 * math.sin(2 * t + p2) + a3 * math.sin(3 * t + p3) + a5 * math.sin(5 * t + p5 + k * .15))
                pts.append((cx + rr * math.cos(t), cy + rr * math.sin(t) * .82))
            d = "M" + " L".join(f"{x:.1f} {y:.1f}" for x, y in pts) + "Z"
            out.append(f"<path d='{d}' fill='none' stroke='{color}' stroke-width='{sw}' opacity='{op}'/>")
    return svg(w, h, "".join(out))


def gingham(c1="#c8402a", c2="#ffffff", size=40, a1=.18, a2=.18):
    """Pure CSS gingham (returns a `background` value)."""
    return (f"repeating-linear-gradient(0deg, rgba({_rgb(c1)},{a1}) 0 {size/2}px, transparent {size/2}px {size}px), "
            f"repeating-linear-gradient(90deg, rgba({_rgb(c1)},{a2}) 0 {size/2}px, transparent {size/2}px {size}px), {c2}")


def _rgb(h):
    h = h.lstrip("#")
    return ",".join(str(int(h[i:i + 2], 16)) for i in (0, 2, 4))


def rgb(h):
    return _rgb(h)


# ───────────────────────── doodles (line icons) ─────────────────────────
def _stroke(inner, color, sw=1.8, op=1):
    return f"<g fill='none' stroke='{color}' stroke-width='{sw}' stroke-linecap='round' stroke-linejoin='round' opacity='{op}'>{inner}</g>"


DOODLES = {
    "apple": "<path d='M12 7c-2-1.6-6-1-6 3.6C6 15.4 8.4 20 10.4 20c.9 0 1.1-.5 1.6-.5s.7.5 1.6.5C15.6 20 18 15.4 18 10.6 18 6 14 5.4 12 7z'/><path d='M12 7c0-2 .8-3.4 2.4-4'/>",
    "carrot": "<path d='M14.5 8.5 4 19.5c-.4.5.2 1.1.7.8L17 12.3a4 4 0 0 0-2.5-3.8z'/><path d='M15 9c.4-1.6 1.6-3 3.2-3.5M16.5 10.5c1.6-.4 3-.2 4 .8M14 8c-.6-1.6-.2-3.2.9-4.2'/>",
    "lemon": "<circle cx='12' cy='12' r='8'/><circle cx='12' cy='12' r='5'/><path d='M12 7v10M7 12h10M8.5 8.5l7 7M15.5 8.5l-7 7'/>",
    "wheat": "<path d='M12 21V7'/><path d='M12 9c-2-.2-3.4-1.4-3.6-3.4 2 .2 3.4 1.4 3.6 3.4zM12 9c2-.2 3.4-1.4 3.6-3.4-2 .2-3.4 1.4-3.6 3.4zM12 14c-2-.2-3.4-1.4-3.6-3.4 2 .2 3.4 1.4 3.6 3.4zM12 14c2-.2 3.4-1.4 3.6-3.4-2 .2-3.4 1.4-3.6 3.4zM12 5c-.8-.8-.8-2 0-3 .8 1 .8 2.2 0 3z'/>",
    "egg": "<path d='M12 3c3.2 0 6 5.4 6 9.6A6 6 0 0 1 12 19a6 6 0 0 1-6-6.4C6 8.4 8.8 3 12 3z'/><path d='M9 13.2a3 3 0 0 0 2.2 2.6'/>",
    "fish": "<path d='M3 12c3-4.5 8-5.5 12-3.5l3.5-2.5v12L15 15.5C11 17.5 6 16.5 3 12z'/><circle cx='8' cy='11' r='.6' fill='currentColor'/>",
    "leaf": "<path d='M5 19C4 11 9 5 19 5c0 10-6 15-14 14z'/><path d='M5 19c3-5 6-8 10-10'/>",
    "spoon": "<ellipse cx='12' cy='7' rx='3.2' ry='4.6'/><path d='M12 11.6V21'/>",
    "fork": "<path d='M8 3v6a3 3 0 0 0 3 3v9M11 3v7M14 3v6a3 3 0 0 1-3 3'/>",
    "cherry": "<circle cx='8' cy='17' r='3.5'/><circle cx='16.5' cy='16' r='3.5'/><path d='M8 13.5C9 9 11.5 6 14.5 4c.4 3.5.6 7 2 8.5M14.5 4c2 .2 4 .8 5 2'/>",
    "pepper": "<path d='M8 8c-3 1-4 6-1 11 1.4 2.2 3.4 2 4.4.6.5-.8 1-1 1.8-1 2.6-.4 4.8-3 4.8-6.6 0-3.4-2.4-5.4-5.6-5.4-2 0-3.2 1-4.4 1.4z'/><path d='M12 7c.2-1.6.8-3 2.4-4'/>",
    "avocado": "<path d='M12 3c3 0 4.6 3.4 5.2 6.4.5 2.4 1.8 3.6 1.8 6A6.6 6.6 0 0 1 12.4 22H11.6A6.6 6.6 0 0 1 5 15.4c0-2.4 1.3-3.6 1.8-6C7.4 6.4 9 3 12 3z'/><circle cx='12' cy='15' r='3'/>",
    "bowl": "<path d='M3 11h18a9 9 0 0 1-18 0z'/><path d='M8 7c0-1.5 1.2-1.5 1.2-3M12 7c0-1.5 1.2-1.5 1.2-3M16 7c0-1.5 1.2-1.5 1.2-3'/>",
    "drop": "<path d='M12 3s6 6.6 6 10.8A6 6 0 0 1 6 13.8C6 9.6 12 3 12 3z'/>",
    "star": "<path d='M12 3l2.6 5.6 6 .8-4.4 4.2 1.1 6L12 16.6 6.7 19.6l1.1-6L3.4 9.4l6-.8z'/>",
}


def doodle(name, color="#000", sw=1.7, op=1):
    return _stroke(DOODLES[name], color, sw, op)


def doodle_tile(names, size=260, color="#000", op=.10, sw=1.6, scale=1.5, seed=1):
    """Scatter line icons on a tile; each is a 24-box icon scaled and rotated."""
    rnd = random.Random(seed)
    cols = int(math.ceil(math.sqrt(len(names))))
    cell = size / cols
    body = []
    for i, nme in enumerate(names):
        cx = (i % cols + .5) * cell + rnd.uniform(-cell * .12, cell * .12)
        cy = (i // cols + .5) * cell + rnd.uniform(-cell * .12, cell * .12)
        ang = rnd.uniform(-28, 28)
        body.append(f"<g transform='translate({cx:.1f} {cy:.1f}) rotate({ang:.1f}) scale({scale}) translate(-12 -12)' color='{color}'>"
                    f"{doodle(nme, color, sw / scale, op)}</g>")
    return svg(size, size, "".join(body))


def squiggle(w=120, h=14, color="#000", sw=4, op=1, n=6):
    seg = w / n
    d = f"M0 {h/2}" + "".join(f" q{seg/4:.1f} {-h/2 if i%2==0 else h/2:.1f} {seg/2:.1f} 0 t{seg/2:.1f} 0" for i in range(n))
    return svg(w, h, f"<path d='{d}' fill='none' stroke='{color}' stroke-width='{sw}' stroke-linecap='round' opacity='{op}'/>")


def circle(d, color, op=1, stroke=None, sw=3):
    if stroke:
        return svg(d, d, f"<circle cx='{d/2}' cy='{d/2}' r='{d/2-sw}' fill='none' stroke='{stroke}' stroke-width='{sw}' opacity='{op}'/>")
    return svg(d, d, f"<circle cx='{d/2}' cy='{d/2}' r='{d/2}' fill='{color}' opacity='{op}'/>")


def scallop_edge(w=40, h=14, color="#fff"):
    """Bottom scallops (awning) tile; place at the bottom of a banner, repeat-x."""
    return svg(w, h, f"<path d='M0 0H{w}V{h/2}A{w/2} {h/2} 0 0 1 0 {h/2}Z' fill='{color}'/>")


def zigzag_edge(w=16, h=8, color="#fff", up=False):
    pts = f"0,{h} {w/2},0 {w},{h}" if not up else f"0,0 {w/2},{h} {w},0"
    return svg(w, h, f"<polygon points='{pts}' fill='{color}'/>")
