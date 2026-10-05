# -*- coding: utf-8 -*-
"""H · Ночной лес — a premium DARK fitness-nutrition app at night, calm and forest-like (not neon).
Deep green-black page with real topographic contour lines (marching squares over a seamless terrain
field), star grain and soft mint / teal / amber glows; dark gradient cards with a hairline border and
a mint highlight on the top edge; mint→soft-lime buttons that glow and sink 1px; gradient-border
secondary buttons; LED-style "check dots" on selected tiles; dark glass dock with a glowing indicator.
"""
import math
import random
from arte import *

PAL = dict(
    canvas="#0C1713", surface="#14231C", surface_2="#1B2E25", line="#2A4034", line_strong="#3A5546", field_line="#6A8A7B",
    ink="#E9F3EC", text_2="#B5C9BC", text_3="#93AB9D",
    primary="#7BE0B0", primary_2="#6CD6A4", primary_3="#95EAC2", on_ink="#06231A", on_ink_2="#134232",
    volt="#C6EA7C", volt_hi="#A9DE8E", volt_wash="#1D3527", on_volt="#0C1713",
    kcal="#FF9473", kcal_deep="#FF9473", kcal_wash="#3A231B",
    protein="#B9A8FF", protein_deep="#B9A8FF", protein_wash="#2A2540",
    carbs="#F5C65A", carbs_deep="#F5C65A", carbs_wash="#3A3017",
    fat="#63D8E8", fat_deep="#63D8E8", fat_wash="#133539",
    ok="#8FE3B4", ok_wash="#173A2A", warn="#F5C65A", warn_wash="#3A2E12",
    danger="#C23B2C", danger_deep="#FF9C8F", danger_wash="#3D1D1A", shadow_rgb="0, 0, 0")

TAU = 2 * math.pi


# ───────────────────────── art: a real contour map ─────────────────────────
def _terrain(W, H, hills, waves, seed):
    """Seamless (periodic) terrain: von-Mises 'hills' + a few low waves. Same value at x=0 and x=W."""
    rnd = random.Random(seed)
    wv = [(k, l, a, rnd.uniform(0, TAU)) for k, l, a in waves]

    def f(x, y):
        v = 0.0
        for hx, hy, A, kx, ky in hills:
            v += A * math.exp(kx * (math.cos(TAU * (x - hx) / W) - 1) + ky * (math.cos(TAU * (y - hy) / H) - 1))
        for k, l, a, p in wv:
            v += a * math.cos(TAU * (k * x / W + l * y / H) + p)
        return v
    return f


def _rdp(pts, eps):
    if len(pts) < 3:
        return pts
    keep = [False] * len(pts)
    keep[0] = keep[-1] = True
    stack = [(0, len(pts) - 1)]
    while stack:
        s, e = stack.pop()
        x1, y1 = pts[s]
        x2, y2 = pts[e]
        dx, dy = x2 - x1, y2 - y1
        L = math.hypot(dx, dy)
        dmax, idx = 0.0, None
        for k in range(s + 1, e):
            x0, y0 = pts[k]
            d = abs(dy * x0 - dx * y0 + x2 * y1 - y2 * x1) / L if L > 1e-6 else math.hypot(x0 - x1, y0 - y1)
            if d > dmax:
                dmax, idx = d, k
        if idx is not None and dmax > eps:
            keep[idx] = True
            stack += [(s, idx), (idx, e)]
    return [p for p, k in zip(pts, keep) if k]


def _contours(f, W, H, cell, levels):
    """Marching squares on a periodic grid -> list (per level) of polylines [(x,y), ...]."""
    nx, ny = max(4, round(W / cell)), max(4, round(H / cell))
    dx, dy = W / nx, H / ny
    g = [[f(i * dx, j * dy) for i in range(nx)] for j in range(ny)]

    def V(i, j):
        return g[j % ny][i % nx]
    out = []
    for L in levels:
        def pt(e):
            kind, i, j = e
            if kind == "h":
                a, b = V(i, j), V(i + 1, j)
                return ((i + (L - a) / (b - a)) * dx, j * dy)
            a, b = V(i, j), V(i, j + 1)
            return (i * dx, (j + (L - a) / (b - a)) * dy)
        segs = []
        for j in range(ny):
            for i in range(nx):
                a, b, c, d = V(i, j), V(i + 1, j), V(i + 1, j + 1), V(i, j + 1)
                sa, sb, sc, sd = a > L, b > L, c > L, d > L
                T, R, B, Lf = ("h", i, j), ("v", i + 1, j), ("h", i, j + 1), ("v", i, j)
                cr = []
                if sa != sb: cr.append(T)
                if sb != sc: cr.append(R)
                if sd != sc: cr.append(B)
                if sa != sd: cr.append(Lf)
                if len(cr) == 2:
                    segs.append((cr[0], cr[1]))
                elif len(cr) == 4:
                    cen = (a + b + c + d) / 4 > L
                    if sa != cen: segs.append((T, Lf))
                    if sb != cen: segs.append((T, R))
                    if sc != cen: segs.append((R, B))
                    if sd != cen: segs.append((B, Lf))
        adj = {}
        for n, (e1, e2) in enumerate(segs):
            adj.setdefault(e1, []).append(n)
            adj.setdefault(e2, []).append(n)
        used = [False] * len(segs)
        polys = []
        for n in range(len(segs)):
            if used[n]:
                continue
            used[n] = True
            chain = list(segs[n])
            for _ in (0, 1):
                while True:
                    end = chain[-1]
                    nxt = next((m for m in adj.get(end, ()) if not used[m]), None)
                    if nxt is None:
                        break
                    used[nxt] = True
                    s1, s2 = segs[nxt]
                    chain.append(s2 if s1 == end else s1)
                chain.reverse()
            polys.append(([pt(e) for e in chain], chain[0] == chain[-1]))
        out.append(polys)
    return out


def _smooth_path(pts, closed):
    """Quadratic B-spline through the midpoints (soft contour), integer coordinates."""
    r = lambda p: "%d %d" % (round(p[0]), round(p[1]))
    if closed:
        pts = pts[:-1]
        n = len(pts)
        if n < 3:
            return ""
        mid = lambda k: ((pts[k][0] + pts[(k + 1) % n][0]) / 2, (pts[k][1] + pts[(k + 1) % n][1]) / 2)
        d = "M" + r(mid(0))
        for k in range(1, n + 1):
            d += "Q" + r(pts[k % n]) + " " + r(mid(k % n))
        return d + "Z"
    n = len(pts)
    if n < 3:
        return "M" + r(pts[0]) + "L" + r(pts[-1])
    mid = lambda k: ((pts[k][0] + pts[k + 1][0]) / 2, (pts[k][1] + pts[k + 1][1]) / 2)
    d = "M" + r(pts[0]) + "L" + r(mid(0))
    for k in range(1, n - 1):
        d += "Q" + r(pts[k]) + " " + r(mid(k))
    return d + "L" + r(pts[-1])


def contour_map(W=1000, H=1000, hills=(), waves=(), seed=5, n_levels=18, cell=8, color="#CFF5E2",
                op=.06, op_index=.12, sw=1.1, sw_index=1.6, every=4, eps=.9):
    f = _terrain(W, H, hills, waves, seed)
    nx, ny = round(W / cell), round(H / cell)
    vals = [f(i * W / nx, j * H / ny) for j in range(0, ny, 2) for i in range(0, nx, 2)]
    lo, hi = min(vals), max(vals)
    levels = [lo + (hi - lo) * (k + .5) / n_levels for k in range(n_levels)]
    thin, thick = [], []
    for k, polys in enumerate(_contours(f, W, H, cell, levels)):
        for pts, closed in polys:
            if len(pts) < 2:
                continue
            if closed and len(pts) > 4:
                h = len(pts) // 2
                pts = _rdp(pts[:h + 1], eps)[:-1] + _rdp(pts[h:], eps)
            else:
                pts = _rdp(pts, eps)
            (thick if k % every == every - 1 else thin).append(_smooth_path(pts, closed))
    body = (f"<path d='{''.join(thin)}' fill='none' stroke='{color}' stroke-width='{sw}' opacity='{op}' stroke-linecap='round' stroke-linejoin='round'/>"
            f"<path d='{''.join(thick)}' fill='none' stroke='{color}' stroke-width='{sw_index}' opacity='{op_index}' stroke-linecap='round' stroke-linejoin='round'/>")
    return svg(W, H, body)


def stars(size=180, n=16, seed=7, color="#DFF7EA", rmax=1.0, opr=(.12, .4)):
    rnd = random.Random(seed)
    b = ""
    for _ in range(n):
        x, y = rnd.uniform(3, size - 3), rnd.uniform(3, size - 3)
        r = rnd.uniform(.45, rmax)
        b += f"<circle cx='{x:.1f}' cy='{y:.1f}' r='{r:.2f}' fill='{color}' opacity='{rnd.uniform(*opr):.2f}'/>"
    return svg(size, size, b)


def summit(size=220, n=8, color="#A6F0CC", seed=4, cx=.82, cy=.16, op0=.16):
    """Wobbly concentric contours around a summit near the top-right corner (panel ornament)."""
    rnd = random.Random(seed)
    a2, a3, a5 = rnd.uniform(.05, .09), rnd.uniform(.03, .06), rnd.uniform(.015, .03)
    p2, p3, p5 = (rnd.uniform(0, TAU) for _ in range(3))
    X, Y = size * cx, size * cy
    out = []
    for k in range(1, n + 1):
        r = size * .085 * k
        pts = []
        for i in range(0, 361, 8):
            t = math.radians(i)
            rr = r * (1 + a2 * math.sin(2 * t + p2) + a3 * math.sin(3 * t + p3) + a5 * math.sin(5 * t + p5 + k * .3))
            pts.append((X + rr * math.cos(t), Y + rr * math.sin(t) * .86))
        d = "M" + " ".join("%.1f %.1f" % p for p in pts) + "Z"
        op = max(.03, op0 - k * .016)
        out.append(f"<path d='{d}' fill='none' stroke='{color}' stroke-width='{1.6 if k % 4 == 0 else 1.1}' opacity='{op:.3f}'/>")
    out.append(f"<circle cx='{X:.1f}' cy='{Y:.1f}' r='2.2' fill='{color}' opacity='.35'/>")
    return svg(size, size, "".join(out))


def orbit(color, size=200, rings=((86, 1.4, .42, None), (70, 1, .26, "1.5 5"), (54, 1.2, .2, None)), dot=(86, -38)):
    """Decorative fitness-tracker rings (no value implied): solid, tick and thin ring + a small 'planet'."""
    c = size / 2
    b = ""
    for r, w, op, dash in rings:
        da = f" stroke-dasharray='{dash}'" if dash else ""
        b += f"<circle cx='{c}' cy='{c}' r='{r}' fill='none' stroke='{color}' stroke-width='{w}' opacity='{op}'{da}/>"
    if dot:
        r, ang = dot
        x, y = c + r * math.cos(math.radians(ang)), c + r * math.sin(math.radians(ang))
        b += f"<circle cx='{x:.1f}' cy='{y:.1f}' r='4' fill='{color}' opacity='.9'/><circle cx='{x:.1f}' cy='{y:.1f}' r='9' fill='{color}' opacity='.16'/>"
    return svg(size, size, b)


def corner_arcs(color, size=96, radii=((26, 1.4, .5, None), (36, 1, .32, "1.5 4"), (46, 1.1, .2, None)), dot=36):
    """Quarter 'radar' arcs around the top-right corner of a tile (decoration only)."""
    b = ""
    for r, w, op, dash in radii:
        da = f" stroke-dasharray='{dash}'" if dash else ""
        b += f"<circle cx='{size}' cy='0' r='{r}' fill='none' stroke='{color}' stroke-width='{w}' opacity='{op}'{da}/>"
    if dot:
        x, y = size - dot * math.cos(math.radians(40)), dot * math.sin(math.radians(40))
        b += f"<circle cx='{x:.1f}' cy='{y:.1f}' r='3' fill='{color}' opacity='.9'/><circle cx='{x:.1f}' cy='{y:.1f}' r='7' fill='{color}' opacity='.16'/>"
    return svg(size, size, b)


# page terrain: three hills at different heights (seen in the 390px phone window, x≈305..695) + soft waves
TOPO = uri(contour_map(1000, 1000,
                       hills=((380, 150, 1.0, 2.4, 2.6), (290, 270, .42, 5.5, 6.5),
                              (650, 520, .95, 2.6, 2.3), (770, 430, .38, 6, 5),
                              (400, 860, .85, 2.3, 2.5), (530, 930, .34, 6, 6)),
                       waves=((1, 0, .22), (0, 1, .2), (1, 1, .14), (2, -1, .1), (1, 2, .08), (3, 1, .05)),
                       seed=9, n_levels=28, cell=8, op=.07, op_index=.14))
STARS = uri(stars(180, 20, seed=7))
SUMMIT = uri(summit(220))
ORB_KCAL = uri(orbit("#FF9473", dot=(86, 150)))
ARC_KCAL = uri(corner_arcs("#FF9473"))
ARC_P = uri(corner_arcs("#B9A8FF"))
ARC_C = uri(corner_arcs("#F5C65A"))
ARC_F = uri(corner_arcs("#63D8E8"))
ORB_MINT = uri(orbit("#7BE0B0", dot=(86, 150)))
CHECK = uri(svg(14, 14, "<path d='M3.2 7.4l2.5 2.5 5.1-5.6' stroke='#06231A' stroke-width='2.2' fill='none' stroke-linecap='round' stroke-linejoin='round'/>"))
ARROW = uri(svg(24, 24, "<path d='M6 9l6 6 6-6' stroke='#B5C9BC' stroke-width='2.2' fill='none' stroke-linecap='round' stroke-linejoin='round'/>"))

TOKENS = (
    '--font-display:"Exo 2",system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;'
    '--font-body:"Onest",system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;'
    '--font-label:"Exo 2",system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;'
    "--r-sm:12px;--r-md:16px;--r-lg:22px;--r-xl:26px;--r-ctl:16px;"
    "--shadow-1:0 1px 0 rgba(0,0,0,.25),0 18px 40px -22px rgba(0,0,0,.9);--shadow-2:0 30px 70px -20px rgba(0,0,0,.9);"
    "--fw-display:700;--fw-fig:700;--fw-btn:700;--fw-label:700;--fw-hero:800;"
    "--ls-label:.09em;--tt-label:uppercase;"
    "--hero-k:7.6;--hero-max:84px;--fs-fig-m:24px;"
    "--h-topo:" + TOPO + ";"
    "--h-card:linear-gradient(90deg,rgba(150,236,196,0) 6%,rgba(150,236,196,.32) 38%,rgba(150,236,196,0) 78%) top / 100% 1px no-repeat,linear-gradient(160deg,#182A21 0%,#12211A 100%);"
    "--h-mint:linear-gradient(180deg,rgba(255,255,255,.24),rgba(255,255,255,0) 55%),linear-gradient(115deg,#7BE0B0 0%,#9AE3A4 60%,#B6E595 100%);"
)

CSS = r"""
/* ═════════ H · Ночной лес ═════════ */
:root{color-scheme:dark}
html{background:#0B1511}
body{background:transparent;color:#E9F3EC}
body::before{content:"";position:fixed;inset:0;z-index:-1;pointer-events:none;
  background:
    __STARS__ repeat 0 0 / 180px 180px,
    var(--h-topo) repeat center top / 1000px 1000px,
    radial-gradient(75% 45% at 0% 0%, rgba(123,224,176,.17), rgba(123,224,176,0) 70%),
    radial-gradient(70% 42% at 100% 100%, rgba(70,200,196,.15), rgba(70,200,196,0) 70%),
    radial-gradient(45% 28% at 100% 0%, rgba(245,198,90,.07), rgba(245,198,90,0) 70%),
    linear-gradient(180deg,#0F1D17 0%,#0B1612 55%,#09130F 100%);}
::selection{background:rgba(123,224,176,.35);color:#fff}
:focus-visible,.visually-hidden:focus-visible + .budget-chip,.visually-hidden:focus-visible + .date-chip{outline:2px solid #7BE0B0;outline-offset:2px;box-shadow:0 0 0 5px rgba(123,224,176,.22)}
::placeholder{color:#93AB9D}
.link-btn,.pantry-link-btn,.auth-dialog__switch-btn,.onboarding__link,.site-footer__link,.onboarding__skip,.onboarding__skip-questions,.tour__skip{text-decoration-color:rgba(123,224,176,.55)}
.link-btn:hover,.pantry-link-btn:hover,.auth-dialog__switch-btn:hover,.onboarding__link:hover,.site-footer__link:hover{text-decoration-color:#7BE0B0}

/* ── top bar ── */
.topbar__brand{color:#EEF6F0}
.topbar__brand-mark{width:34px;height:34px;border-radius:11px;background:var(--h-mint);color:#06231A;box-shadow:inset 0 1px 0 rgba(255,255,255,.5),0 6px 18px -6px rgba(123,224,176,.75)}
@@BTN_ICON@@{background:rgba(22,38,31,.78);color:#E9F3EC;box-shadow:inset 0 0 0 1px rgba(255,255,255,.1),inset 0 1px 0 rgba(255,255,255,.06),0 10px 22px -14px rgba(0,0,0,.9)}
@@BTN_ICON@@:hover{box-shadow:inset 0 0 0 1px rgba(123,224,176,.55),0 0 14px -4px rgba(123,224,176,.5)}
.topbar__menu-btn{width:46px;height:46px;border-radius:50%}
@@PROFILE@@{height:46px;border-radius:999px;background:rgba(22,38,31,.78);color:#E9F3EC;font-size:var(--fs-sm);font-weight:600;box-shadow:inset 0 0 0 1px rgba(255,255,255,.1),inset 0 1px 0 rgba(255,255,255,.06),0 10px 22px -14px rgba(0,0,0,.9)}
.topbar__profile-avatar{background:rgba(123,224,176,.12);color:#8FE8BE;box-shadow:inset 0 0 0 1px rgba(123,224,176,.45)}
.topbar__menu{background:#15261E;box-shadow:var(--shadow-2),0 0 0 1px rgba(255,255,255,.08)}
.topbar__menu-item:hover{background:rgba(255,255,255,.05)}
.topbar__menu-email{color:#93AB9D;border-bottom-color:rgba(255,255,255,.08)}
.traduccion-aviso{background:var(--h-card);box-shadow:var(--shadow-1),inset 3px 0 0 #7BE0B0}

/* ── hero: dark banner, contour lines, the name in moonlight ── */
.hero{position:relative;border-radius:24px;color:#EEF8F2;
  background:
    radial-gradient(55% 95% at 50% 50%, rgba(123,224,176,.15), rgba(123,224,176,0) 72%),
    var(--h-topo) 46% 14% / 620px 620px,
    linear-gradient(135deg,#1B3529 0%,#12261D 52%,#0D1C15 100%);
  border:1px solid rgba(255,255,255,.08);
  box-shadow:inset 0 1px 0 rgba(170,240,205,.14),0 24px 48px -26px rgba(0,0,0,.95)}
.hero::before,.hero::after{content:"";height:7px;margin:11px 16% 0;
  background:
    radial-gradient(circle,#E2FBEE 0 1.7px,rgba(123,224,176,.45) 2.4px,rgba(123,224,176,0) 3.6px) center / 8px 7px no-repeat,
    linear-gradient(90deg,rgba(123,224,176,0),rgba(123,224,176,.8) 32%,rgba(123,224,176,.8) calc(50% - 9px),rgba(123,224,176,0) calc(50% - 9px),rgba(198,234,124,0) calc(50% + 9px),rgba(198,234,124,.6) calc(50% + 9px),rgba(198,234,124,.6) 68%,rgba(198,234,124,0)) center / 100% 1px no-repeat}
.hero::after{margin:0 16% 11px}
.hero__texto{padding:8px 12px 10px}
.hero__nombre{color:#EEF8F2;text-transform:uppercase;letter-spacing:.07em;text-shadow:0 0 26px rgba(123,224,176,.42),0 0 3px rgba(123,224,176,.25)}

/* ── section titles ── */
h2{color:#EEF6F0}
h2 em{background:none;color:#8FE8BE;padding:0;margin:0}
.eyebrow{color:#9FB8AA}
.badge{height:32px;padding:0 12px;border-radius:999px;background:rgba(123,224,176,.07);color:#B5C9BC;box-shadow:inset 0 0 0 1px rgba(123,224,176,.24)}
.badge svg{color:#7BE0B0}
.form-section-label{color:#8FE8BE}
.form-section-label::before{width:8px;height:8px;border-radius:50%;background:#7BE0B0;box-shadow:0 0 0 3px rgba(123,224,176,.16),0 0 12px rgba(123,224,176,.85)}
.budget-group-label,.field>label,.budget-custom-field>label{font-family:var(--font-body);font-size:var(--fs-sm);font-weight:600;text-transform:none;letter-spacing:0;color:#B5C9BC}
.field-hint{color:#93AB9D}
.field-hint strong{color:#D5E6DC}

/* ── surfaces: dark gradient cards, hairline border, mint top-edge highlight ── */
@@PANEL@@{position:relative;border-radius:26px;background:var(--h-card);border:1px solid rgba(255,255,255,.07);box-shadow:var(--shadow-1)}
@@PANEL@@::after{content:"";position:absolute;right:0;top:0;width:200px;height:200px;background:__SUMMIT__ no-repeat right top / contain;pointer-events:none;border-radius:0 26px 0 0}
@@PANEL@@>*{position:relative;z-index:1}
@@CARD@@{background:var(--h-card);border:1px solid rgba(255,255,255,.07);border-radius:22px;box-shadow:var(--shadow-1)}
.resumen-datos{border-radius:22px;padding:8px 8px 8px 18px}
.resumen-datos__texto{color:#B5C9BC}
@@WELL@@{background:rgba(255,255,255,.035);border-radius:14px;box-shadow:inset 0 0 0 1px rgba(255,255,255,.06)}
.meta{padding:10px 6px 10px 11px}
.meta .k{font-family:var(--font-body);font-weight:500;text-transform:none;letter-spacing:-.01em;color:#A9BFB2}
.meta .v{color:#E9F3EC}

/* ── buttons ── */
@@BTN_P@@,@@BTN_CTA@@{border:0;border-radius:18px;color:#06231A;background:var(--h-mint);
  box-shadow:0 10px 30px -8px rgba(123,224,176,.55),inset 0 1px 0 rgba(255,255,255,.6),inset 0 -2px 0 rgba(6,35,26,.14);
  transition:transform .1s ease,box-shadow .15s ease,filter .15s ease}
@@BTN_P@@ svg,@@BTN_CTA@@ svg{color:#06231A}
@@BTN_P@@:hover,@@BTN_CTA@@:hover{background:var(--h-mint);border-color:transparent;filter:brightness(1.06);box-shadow:0 12px 34px -8px rgba(123,224,176,.72),inset 0 1px 0 rgba(255,255,255,.6),inset 0 -2px 0 rgba(6,35,26,.14)}
@@BTN_P@@:active,@@BTN_CTA@@:active{transform:translateY(1px);filter:none;box-shadow:0 3px 12px -5px rgba(123,224,176,.5),inset 0 1px 0 rgba(255,255,255,.35),inset 0 2px 7px rgba(6,35,26,.2)}
@@BTN_P@@:disabled,@@BTN_CTA@@:disabled{background:linear-gradient(115deg,rgba(123,224,176,.16),rgba(182,229,149,.1));color:#8DAE9E;filter:none;transform:none;
  box-shadow:inset 0 0 0 1px rgba(123,224,176,.2),inset 0 1px 0 rgba(255,255,255,.06)}
@@BTN_S@@{border:1.5px solid transparent;border-radius:18px;color:#8FE8BE;
  background:linear-gradient(180deg,#182B22,#13231C) padding-box,linear-gradient(120deg,#7BE0B0,rgba(123,224,176,.22) 55%,#C6EA7C) border-box;
  box-shadow:0 10px 24px -16px rgba(0,0,0,.9);transition:transform .1s ease,box-shadow .15s ease}
@@BTN_S@@ svg{color:#7BE0B0}
@@BTN_S@@:hover{color:#A6F0CC;background:linear-gradient(180deg,#1D362A,#172C22) padding-box,linear-gradient(120deg,#8FE8BE,rgba(123,224,176,.5) 55%,#C6EA7C) border-box;box-shadow:0 0 18px -6px rgba(123,224,176,.45)}
@@BTN_S@@:active{transform:translateY(1px);box-shadow:0 0 0 4px rgba(123,224,176,.12)}
@@BTN_S@@:disabled{background:rgba(255,255,255,.02);border:1.5px solid rgba(123,224,176,.2);color:#86A092;box-shadow:none;transform:none}
.actions-secondary #resetBtn{border:0;background:none;box-shadow:none;color:#B5C9BC;text-decoration:underline;text-decoration-color:rgba(123,224,176,.55);text-underline-offset:4px}
@@BTN_SM@@{border:1px solid rgba(255,255,255,.13);border-radius:999px;background:rgba(255,255,255,.045);color:#E9F3EC;box-shadow:inset 0 1px 0 rgba(255,255,255,.05);transition:border-color .15s ease,background-color .15s ease,transform .1s ease}
@@BTN_SM@@:hover{border-color:rgba(123,224,176,.55);background:rgba(123,224,176,.08);color:#E9F3EC}
@@BTN_SM@@:active{transform:translateY(1px)}
.pantry-active-card__delete{color:#FFA396;border-color:rgba(255,140,120,.35)}
.pantry-active-card__delete.pantry-active-card__delete--armed{background:#C23B2C;border-color:#C23B2C;color:#fff}
.pantry-active-card__buy-btn.pantry-active-card__buy-btn--secondary{border:1.5px solid transparent;color:#8FE8BE;box-shadow:none;
  background:linear-gradient(180deg,#182B22,#13231C) padding-box,linear-gradient(120deg,#7BE0B0,rgba(123,224,176,.22) 55%,#C6EA7C) border-box}
.pantry-active-card__buy-btn--secondary svg{color:#7BE0B0}
@@BTN_DANGER@@{border-radius:18px;background:linear-gradient(180deg,#CF4635,#B5372A);color:#fff;box-shadow:0 10px 26px -10px rgba(220,80,60,.6),inset 0 1px 0 rgba(255,255,255,.25)}

/* ── chips & tiles: dark, hairline; selected = mint outline + LED check dot ── */
@@CHIP@@{position:relative;background:linear-gradient(180deg,#1B2E25,#16271F);border:1px solid rgba(255,255,255,.11);border-radius:16px;color:#E9F3EC;
  box-shadow:inset 0 1px 0 rgba(255,255,255,.04);transition:border-color .15s ease,box-shadow .15s ease}
@@CHIP@@:hover{border-color:rgba(123,224,176,.5)}
@@CHIP_ON@@{border-color:#7BE0B0;color:#F1FBF5;background:linear-gradient(180deg,rgba(123,224,176,.17),rgba(123,224,176,.06)),#15281F;
  box-shadow:0 0 0 1px rgba(123,224,176,.28),0 10px 26px -12px rgba(123,224,176,.55),inset 0 1px 0 rgba(255,255,255,.08)}
.baldosa.is-activa::after,.visually-hidden:checked + .budget-chip::after,.onboarding__choice.is-selected::after{content:"";position:absolute;top:-8px;right:-8px;width:20px;height:20px;border-radius:50%;
  background:__CHECK__ center / 12px no-repeat,linear-gradient(140deg,#9AEDC6,#62D19D);box-shadow:0 0 0 3px #15261E,0 0 14px rgba(123,224,176,.75)}
.budget-chip{padding:12px 10px 12px 12px}
.budget-chip__title{font:600 13px/1.25 var(--font-body);text-transform:none;letter-spacing:0;color:#B5C9BC}
.budget-chip__amount{color:#EEF6F0}
.visually-hidden:checked + .budget-chip .budget-chip__title{color:#D5E6DC}
.visually-hidden:checked + .budget-chip .budget-chip__amount,.onboarding__choice.is-selected .onboarding__choice-amount{color:#8FE8BE}
.onboarding__choice.is-selected .onboarding__choice-note{color:#B5C9BC}
.date-chip{border-radius:999px}
.date-chip--today::after{background:#7BE0B0;box-shadow:0 0 0 2px rgba(123,224,176,.18),0 0 10px rgba(123,224,176,.85)}
.pantry-meal-chip__time{color:var(--kcal-deep)}
.pantry-meal-chip--cooked .pantry-meal-chip__time{color:#8FE8BE}
@@SEG@@{background:#0E1A15;border:1px solid rgba(255,255,255,.08);border-radius:18px;padding:4px;box-shadow:inset 0 2px 8px rgba(0,0,0,.45)}
@@SEG_BTN@@{border-radius:14px;color:#B5C9BC;background:transparent}
@@SEG_ON@@{background:var(--h-mint);color:#06231A;box-shadow:0 6px 18px -6px rgba(123,224,176,.65),inset 0 1px 0 rgba(255,255,255,.55)}
@@STEP@@{background:#1B2E25;border:1.5px solid var(--field-line);border-radius:24px}
@@STEP@@:focus-within{border-color:#7BE0B0;background:#1B2E25;box-shadow:0 0 0 4px rgba(123,224,176,.16)}
.paso-a-paso input[type="number"]{background:transparent;border:0;box-shadow:none;color:#F1FBF5}
@@STEP_BTN@@{border-radius:50%;background:radial-gradient(circle at 50% 28%,#2B4538,#1C3128);color:#CFE2D6;font-weight:400;
  box-shadow:inset 0 0 0 1px rgba(255,255,255,.1),inset 0 1px 0 rgba(255,255,255,.08)}
@@STEP_PLUS@@{background:radial-gradient(circle at 50% 28%,#2E4D3F,#1C3329);color:#8FE8BE;box-shadow:inset 0 0 0 1.5px rgba(123,224,176,.65),0 0 16px -4px rgba(123,224,176,.6)}
@@FIELD@@{background-color:#1B2E25;border:1.5px solid var(--field-line);border-radius:16px;color:#E9F3EC}
@@FIELD@@:focus{border-color:#7BE0B0;background-color:#1E3329;box-shadow:0 0 0 4px rgba(123,224,176,.18)}
select{background-image:__ARROW__;background-repeat:no-repeat;background-position:right 14px center;background-size:20px 20px}

/* ── scoreboard: dark tiles, coloured glow behind each figure, decorative orbit rings ── */
.nutrition-strip{background:none;box-shadow:none;padding:0;gap:10px;overflow:visible;border-radius:0;color:#E9F3EC}
.summary-card{overflow:hidden;border:1px solid rgba(255,255,255,.07);border-radius:22px;padding:14px 12px 16px;background:var(--h-card);box-shadow:var(--shadow-1);color:#E9F3EC}
.summary-card--calories{padding:18px 18px 20px;
  background:__ORB_KCAL__ no-repeat right -30px center / 160px 160px,radial-gradient(42% 62% at 24% 64%,rgba(255,148,115,.2),rgba(255,148,115,0) 72%),var(--h-card)}
.summary-card--protein{background:__ARC_P__ no-repeat right top / 96px 96px,radial-gradient(75% 42% at 34% 60%,rgba(185,168,255,.2),rgba(185,168,255,0) 72%),var(--h-card)}
.summary-card--carbs{background:__ARC_C__ no-repeat right top / 96px 96px,radial-gradient(75% 42% at 34% 60%,rgba(245,198,90,.17),rgba(245,198,90,0) 72%),var(--h-card)}
.summary-card--fat{background:__ARC_F__ no-repeat right top / 96px 96px,radial-gradient(75% 42% at 34% 60%,rgba(99,216,232,.17),rgba(99,216,232,0) 72%),var(--h-card)}
.summary-card h3{color:#B5C9BC}
.summary-card .sub{color:#A9BFB2;text-wrap:balance}
.summary-card .big{color:#EEF6F0}
.summary-card--calories .big{color:var(--kcal-deep);text-shadow:0 0 26px rgba(255,148,115,.38)}
.summary-card--protein .big{color:var(--protein-deep);text-shadow:0 0 22px rgba(185,168,255,.35)}
.summary-card--carbs .big{color:var(--carbs-deep);text-shadow:0 0 22px rgba(245,198,90,.3)}
.summary-card--fat .big{color:var(--fat-deep);text-shadow:0 0 22px rgba(99,216,232,.3)}
.icon-badge{width:28px;height:28px;border-radius:50%}
.summary-card--calories .icon-badge{background:rgba(255,148,115,.14);color:#FF9473;box-shadow:inset 0 0 0 1px rgba(255,148,115,.5)}
.summary-card--protein .icon-badge{background:rgba(185,168,255,.14);color:#B9A8FF;box-shadow:inset 0 0 0 1px rgba(185,168,255,.5)}
.summary-card--carbs .icon-badge{background:rgba(245,198,90,.13);color:#F5C65A;box-shadow:inset 0 0 0 1px rgba(245,198,90,.45)}
.summary-card--fat .icon-badge{background:rgba(99,216,232,.13);color:#63D8E8;box-shadow:inset 0 0 0 1px rgba(99,216,232,.45)}
.insights .icon-badge{background:rgba(123,224,176,.12);color:#7BE0B0;box-shadow:inset 0 0 0 1px rgba(123,224,176,.45)}
@container (min-width:620px){.nutrition-strip{grid-template-columns:1.4fr repeat(3,minmax(0,1fr))}
  .summary-card--calories{grid-column:auto;background:__ARC_KCAL__ no-repeat right top / 110px 110px,radial-gradient(70% 45% at 30% 62%,rgba(255,148,115,.2),rgba(255,148,115,0) 72%),var(--h-card)}}

/* ── timeline, day header, meal cards ── */
.schedule-timeline__item{border:1px solid rgba(255,255,255,.1);border-radius:22px;padding:12px 16px 14px;background:linear-gradient(160deg,#182A21,#12211A);box-shadow:0 14px 28px -20px rgba(0,0,0,.95);color:#E9F3EC}
.schedule-timeline__item:hover{border-color:rgba(123,224,176,.5)}
.schedule-timeline__item--next{border-color:rgba(123,224,176,.9);
  background:radial-gradient(110% 90% at 0% 0%,rgba(123,224,176,.18),rgba(123,224,176,0) 62%),linear-gradient(160deg,#1A3328,#13261D);
  box-shadow:0 0 0 1px rgba(123,224,176,.22),0 10px 30px -12px rgba(123,224,176,.45)}
.schedule-timeline__time{color:#EEF6F0}
.schedule-timeline__item--next .schedule-timeline__time{color:#8FE8BE}
.schedule-timeline__label,.schedule-timeline__item--next .schedule-timeline__label{color:#B5C9BC}
.schedule-timeline__next-tag{background:var(--h-mint);color:#06231A;box-shadow:0 0 12px -2px rgba(123,224,176,.6)}
.schedule-timeline__note{color:#93AB9D}
.day-slide__n{color:#EEF6F0}
.day-slide__of{color:#93AB9D}
.day-slide__head::after{height:1px;border-radius:0;background:linear-gradient(90deg,rgba(123,224,176,.8),rgba(123,224,176,0))}
.days-carousel__hint{color:#93AB9D}
.days-carousel__dot::before{background:#3E5A4C}
.days-carousel__dot.is-active::before{background:#7BE0B0;box-shadow:0 0 10px rgba(123,224,176,.75)}
.days-carousel__arrow{background:rgba(20,35,28,.88);color:#8FE8BE;box-shadow:inset 0 0 0 1px rgba(123,224,176,.45),0 12px 26px -10px rgba(0,0,0,.85)}
.meal-head h3{color:#EEF6F0}
.meal-time-badge{height:36px;padding:0 12px;border-radius:12px;background:rgba(123,224,176,.1);color:#8FE8BE;box-shadow:inset 0 0 0 1px rgba(123,224,176,.42)}
.meal-kcal{color:var(--kcal-deep)}
.meal-items{border-top:1px solid rgba(255,255,255,.08)}
.food-row{border-bottom:1px solid rgba(255,255,255,.06)}
.food-name,.food-qty,.food-cost{color:#E9F3EC}
.food-meta,.food-cost--package{color:#B5C9BC}
.food-qty__grams,.food-macro__unavailable{color:#93AB9D}
.food-cost__tag{font-family:var(--font-body);text-transform:none;letter-spacing:0;font-weight:600;color:#93AB9D}
.food-macro__badge,.food-purchase__badge{border-radius:999px;background:rgba(123,224,176,.1);color:#8FE8BE;box-shadow:inset 0 0 0 1px rgba(123,224,176,.26);font-family:var(--font-body);text-transform:none;letter-spacing:0}
.food-purchase{background:rgba(123,224,176,.05);border-radius:12px;box-shadow:inset 2px 0 0 rgba(123,224,176,.6),inset 0 0 0 1px rgba(123,224,176,.08);color:#DCEBE2}
.meal-footer{background:rgba(0,0,0,.2);border-top:1px solid rgba(255,255,255,.06)}
.meal-footer>div{font-family:var(--font-body);text-transform:none;letter-spacing:0;font-weight:600;color:#A9BFB2}
.meal-footer strong{color:#EEF6F0}
.meal-footer>div::before{height:3px;border-radius:2px}
.meal-footer>div:nth-child(1)::before{background:#B9A8FF;box-shadow:0 0 8px rgba(185,168,255,.6)}
.meal-footer>div:nth-child(2)::before{background:#F5C65A;box-shadow:0 0 8px rgba(245,198,90,.5)}
.meal-footer>div:nth-child(3)::before{background:#63D8E8;box-shadow:0 0 8px rgba(99,216,232,.5)}
.meal-footer>div:nth-child(4)::before{background:#7BE0B0;box-shadow:0 0 8px rgba(123,224,176,.55)}
.meal-footer>div:nth-child(5)::before{background:#3E5A4C}
.meal-steps{border-top:1px solid rgba(255,255,255,.08)}
.meal-steps__toggle{color:#EEF6F0}
.meal-steps__toggle::after{border-color:#7BE0B0}
.meal-steps__equipment{color:#93AB9D}
.meal-steps__list li{color:#D5E6DC}
.meal-steps__list li::before{border-radius:50%;background:rgba(123,224,176,.1);color:#8FE8BE;box-shadow:inset 0 0 0 1px rgba(123,224,176,.45)}
.meal-make-ahead,.meal-cook-note,.warning,.nocook-summary__warn,.plan-days-note{border-radius:12px;background:rgba(245,198,90,.08);color:#F5D27E;box-shadow:inset 3px 0 0 #F5C65A}
.warning--error{background:rgba(255,120,100,.09);color:#FFB0A4;box-shadow:inset 3px 0 0 #FF8A75}
.meal-card--empty{border:1.5px dashed rgba(255,255,255,.14);background:rgba(255,255,255,.02);box-shadow:none}
.meal-card--empty p{color:#B5C9BC}
.empty-icon{background:rgba(123,224,176,.1);color:#8FE8BE;box-shadow:inset 0 0 0 1px rgba(123,224,176,.4)}
.next-meal-sticky__btn{border-radius:20px;background:rgba(15,28,22,.82);-webkit-backdrop-filter:blur(16px) saturate(140%);backdrop-filter:blur(16px) saturate(140%);color:#E9F3EC;
  border:1px solid rgba(123,224,176,.24);box-shadow:0 16px 32px -14px rgba(0,0,0,.9),inset 0 1px 0 rgba(255,255,255,.06)}
.next-meal-sticky__eyebrow{background:var(--h-mint);color:#06231A}
.next-meal-sticky__time{color:#8FE8BE;text-shadow:0 0 16px rgba(123,224,176,.45)}
.next-meal-sticky__label{color:#D5E6DC}

/* ── shopping ── */
.shopping-summary__stat span{font-family:var(--font-body);text-transform:none;letter-spacing:0;font-weight:600;color:#B5C9BC}
.shopping-summary__stat strong{color:#EEF6F0}
.shopping-summary__stat:nth-child(2){position:relative;overflow:hidden;border-color:rgba(123,224,176,.38);
  background:__ORB_MINT__ no-repeat right -24px center / 132px 132px,radial-gradient(45% 75% at 22% 66%,rgba(123,224,176,.2),rgba(123,224,176,0) 72%),var(--h-card);
  box-shadow:0 0 0 1px rgba(123,224,176,.08),0 22px 46px -22px rgba(123,224,176,.38),var(--shadow-1)}
.shopping-summary__stat:nth-child(2) span{color:#CFE2D6}
.shopping-summary__stat:nth-child(2) strong{color:#8FE8BE;text-shadow:0 0 26px rgba(123,224,176,.42)}
.shopping-progress__texto{color:#B5C9BC}
.shopping-progress.is-completo .shopping-progress__texto{color:#8FE8BE}
.shopping-progress__barra{height:14px;padding:3px;background:#0E1A15;box-shadow:inset 0 0 0 1px rgba(255,255,255,.08)}
.shopping-progress__barra>span{background:linear-gradient(90deg,#5FCF9C,#B6E595);box-shadow:0 0 12px rgba(123,224,176,.6)}
.shopping-item__check::before,.pantry-purchase-row__check::before{border:2px solid rgba(123,224,176,.7);background:#11201A}
.shopping-item__check[aria-checked="true"]::before,.pantry-purchase-row__check[aria-checked="true"]::before{background:#7BE0B0;border-color:#7BE0B0;box-shadow:0 0 12px rgba(123,224,176,.6)}
.shopping-item__check[aria-checked="true"]::after,.pantry-purchase-row__check[aria-checked="true"]::after{border-color:#06231A}
.shopping-item__name,.shopping-item__buy,.shopping-item__price{color:#EEF6F0}
.shopping-item__meta,.shopping-item__usage-price{color:#93AB9D}
.shopping-item.is-comprado{background:#101C17;box-shadow:none}
.shopping-item.is-comprado .shopping-item__name,.shopping-item.is-comprado .shopping-item__buy,.shopping-item.is-comprado .shopping-item__price{color:#93AB9D}
.product-find-btn{background:rgba(255,255,255,.05);box-shadow:inset 0 0 0 1px rgba(255,255,255,.13)}
.product-find-btn:hover{box-shadow:inset 0 0 0 1px rgba(123,224,176,.6)}
.shopping-share-note{color:#B5C9BC}
.confirm-receipt{background:rgba(123,224,176,.06);box-shadow:inset 3px 0 0 #7BE0B0;border-radius:14px;color:#DCEBE2}

/* ── my plans ── */
.pantry-plans-empty{border:1.5px dashed rgba(255,255,255,.15);background:rgba(255,255,255,.02);color:#A9BFB2}
.pantry-active-card__date{color:#EEF6F0}
.pantry-active-card__summary,.pantry-purchase-checklist-hint{color:#B5C9BC}
.pantry-active-card__pantry-note,.pantry-purchase-row__grams,.pantry-purchase-row__pantry-note,.pantry-meal-chips__label{color:#93AB9D}
.pantry-meal-chips__label{font-family:var(--font-body);text-transform:none;letter-spacing:0}
.pantry-history-heading{color:#EEF6F0}
.pantry-history-row__summary{color:#B5C9BC}
.pantry-item__amount{background:rgba(255,255,255,.04);border-color:rgba(123,224,176,.55);color:#E9F3EC}

/* ── misc text ── */
.status,.pantry-intro,.auth-dialog__body p,.delete-dialog__note,.plan-replace-dialog__note,.plan-replace-prompt{color:#B5C9BC}
.insights h3{color:#EEF6F0}
.insights li{color:#B5C9BC}
.insights li::before{width:7px;height:7px;border-radius:50%;background:#7BE0B0;box-shadow:0 0 8px rgba(123,224,176,.75);top:.62em}
.site-footer,.footer-note{color:#A9BFB2}
.site-footer__link{color:#B5C9BC}
.site-footer__sep{color:#93AB9D}
.disclosure__chevron{color:#7BE0B0}
.spinner-wrap{background:rgba(123,224,176,.07);color:#E9F3EC;box-shadow:inset 0 0 0 1px rgba(123,224,176,.25)}
.loader-flame{border-color:#2A4034;border-top-color:#7BE0B0}
.verified-card__badge--ean{background:rgba(255,255,255,.05)}
.auth-dialog__notice-static{background:rgba(255,255,255,.04)}
.auth-divider{color:#93AB9D}
.auth-divider::before,.auth-divider::after{background:rgba(255,255,255,.1)}

/* ── narrow phones: Exo 2 figures are wide, give them room instead of letting them wrap or touch edges ── */
@media(max-width:389px){
  .meta-boxes{grid-template-columns:minmax(0,1fr);gap:6px}
  .meta{display:flex;align-items:baseline;justify-content:space-between;gap:12px;padding:10px 14px}
  .meta .v{margin-top:0}
  .budget-chip{padding:12px 8px 12px 10px}
  .budget-chip__title{font-weight:500;letter-spacing:-.005em}
  .shopping-summary__stat{padding:12px 12px 10px}
  .shopping-summary__stat:not(:nth-child(2)) strong{font-size:22px}
}
@media(max-width:359px){
  .budget-modes{grid-template-columns:minmax(0,1fr)}
  .budget-chip{flex-direction:row;align-items:center;justify-content:space-between;gap:8px;min-height:56px;padding:10px 12px}
  .budget-chip__amount{font-size:20px;white-space:nowrap}
  .actions-secondary{grid-template-columns:minmax(0,1fr)}
  .summary-card h3{letter-spacing:.05em}
  .disclosure .verified-panel__head{flex-wrap:wrap;align-items:flex-start}
  .shopping-summary__stat{padding:12px 10px 10px}
  .shopping-summary__stat:not(:nth-child(2)) strong{font-size:20px}
}
/* tablets: five chips in one row are too narrow for the figures -> 2×2 (600+) or 4 (768+) presets + the exact-amount row */
@media(min-width:600px) and (max-width:900px){
  .budget-modes{grid-template-columns:repeat(2,minmax(0,1fr))}
  .budget-chip--custom{grid-column:1 / -1;flex-direction:row;align-items:center}
}
@media(min-width:768px) and (max-width:900px){.budget-modes{grid-template-columns:repeat(4,minmax(0,1fr))}}
@container (max-width:340px){
  .summary-card--calories{background:__ORB_KCAL__ no-repeat right -62px center / 160px 160px,radial-gradient(42% 62% at 24% 64%,rgba(255,148,115,.2),rgba(255,148,115,0) 72%),var(--h-card)}
}
@container (max-width:289px){
  .meal-footer{grid-template-columns:repeat(3,auto);row-gap:12px}
  .food-row{grid-template-areas:"name kcal" "meta meta" "use use" "pack pack" "buy buy"}
  .food-cost--usage{grid-area:use}
  .food-cost--package{grid-area:pack;justify-self:start}
}

/* ── tab bar: dark glass dock, glowing mint indicator ── */
@media screen and (max-width:900px){
  body.con-pestanas .tabbar{padding:6px;gap:2px;border-radius:26px;background:rgba(12,24,19,.8);-webkit-backdrop-filter:blur(18px) saturate(140%);backdrop-filter:blur(18px) saturate(140%);
    border:1px solid rgba(255,255,255,.08);box-shadow:0 26px 46px -14px rgba(0,0,0,.9),inset 0 1px 0 rgba(255,255,255,.07)}
  .tabbar__btn{min-height:60px;border-radius:20px;background:transparent;color:#9FB8AA;font-weight:600}
  .tabbar__btn::before{content:"";position:absolute;top:-7px;left:50%;width:0;height:3px;border-radius:0 0 3px 3px;background:#8FE8BE;transform:translateX(-50%);transition:width .2s ease}
  .tabbar__btn.is-activa{background:radial-gradient(70% 62% at 50% 0%,rgba(123,224,176,.2),rgba(123,224,176,0) 78%);color:#8FE8BE;font-weight:700}
  .tabbar__btn.is-activa::before{width:28px;box-shadow:0 0 10px 1px rgba(123,224,176,.9),0 0 24px 4px rgba(123,224,176,.35)}
  .tabbar__btn.is-activa svg{filter:drop-shadow(0 0 6px rgba(123,224,176,.7))}
  .tabbar__cuenta{background:#FF9473;color:#2B0F05;box-shadow:0 0 0 2px #0F1C17,0 0 12px rgba(255,148,115,.55)}
}

/* ── welcome + questions: contour field at night, dark glass sheet ── */
.onboarding{background:
    __STARS__ repeat 0 0 / 180px 180px,
    var(--h-topo) repeat center top / 1000px 1000px,
    radial-gradient(80% 50% at 10% 0%, rgba(123,224,176,.2), rgba(123,224,176,0) 70%),
    radial-gradient(70% 40% at 100% 60%, rgba(70,200,196,.12), rgba(70,200,196,0) 70%),
    linear-gradient(175deg,#10201A 0%,#0B1612 60%,#09130F 100%)}
.onboarding__card{background:linear-gradient(180deg,rgba(25,44,35,.94),rgba(17,31,25,.96));-webkit-backdrop-filter:blur(18px);backdrop-filter:blur(18px);color:#E9F3EC;
  border:1px solid rgba(255,255,255,.08);border-bottom:0;border-radius:30px 30px 0 0;box-shadow:0 -24px 60px -20px rgba(0,0,0,.85),inset 0 1px 0 rgba(170,240,205,.2)}
@media(min-width:640px){.onboarding__card{border-radius:30px;border-bottom:1px solid rgba(255,255,255,.08)}}
.onboarding__brand-mark{border-radius:12px;background:var(--h-mint);color:#06231A;box-shadow:inset 0 1px 0 rgba(255,255,255,.5),0 6px 18px -6px rgba(123,224,176,.75)}
.onboarding__brand-name{color:#EEF6F0}
.onboarding__title,.onboarding__question{color:#EEF6F0}
.onboarding__title-accent{background:none;color:#8FE8BE;padding:0}
.onboarding__summary li{color:#B5C9BC}
.onboarding__summary li::before{left:4px;top:.5em;width:8px;height:8px;border-radius:50%;background:#7BE0B0;box-shadow:0 0 0 3px rgba(123,224,176,.16),0 0 10px rgba(123,224,176,.75)}
.onboarding__summary strong{color:#EEF6F0}
.onboarding__check{color:#D5E6DC}
.onboarding__link{min-height:40px}
.onboarding__check input{border:2px solid rgba(123,224,176,.75);border-radius:8px;background:#11201A}
.onboarding__check input:checked{background:#7BE0B0;border-color:#7BE0B0;box-shadow:0 0 12px rgba(123,224,176,.6)}
.onboarding__check input:checked::after{border-color:#06231A}
.onboarding__skip,.onboarding__skip-questions{color:#B5C9BC}
.onboarding__skip-note{color:#93AB9D}
.onboarding__progress{height:8px;background:#0E1A15;box-shadow:inset 0 0 0 1px rgba(255,255,255,.08)}
.onboarding__progress-bar{background:linear-gradient(90deg,#5FCF9C,#B6E595);box-shadow:0 0 12px rgba(123,224,176,.7)}
.onboarding__progress-label{color:#8FE8BE}
.onboarding__hint{color:#B5C9BC}
.onboarding__unit{color:#93AB9D}
.onboarding__choice.is-selected::after{box-shadow:0 0 0 3px #172A21,0 0 14px rgba(123,224,176,.75)}

/* ── tour, dialogs ── */
.tour__hole{box-shadow:0 0 0 100vmax rgba(3,9,6,.76),0 0 0 2px #7BE0B0,0 0 26px 4px rgba(123,224,176,.45)}
.tour__foco{box-shadow:0 0 0 100vmax rgba(3,9,6,.4),0 0 0 2px #7BE0B0,0 0 20px 2px rgba(123,224,176,.4)}
.tour__card{border-radius:22px;background:var(--h-card);border:1px solid rgba(255,255,255,.09);color:#E9F3EC}
.tour__counter{color:#8FE8BE}
.tour__title{color:#EEF6F0}
.tour__body{color:#B5C9BC}
.tour__skip{color:#B5C9BC}
.auth-dialog,.ajustes-dialog{background:#13221B;color:#E9F3EC;border:1px solid rgba(255,255,255,.08);border-bottom:0;border-radius:28px 28px 0 0;
  box-shadow:0 -20px 60px -10px rgba(0,0,0,.85),inset 0 1px 0 rgba(170,240,205,.18)}
@media(min-width:640px){.auth-dialog,.ajustes-dialog{border-radius:28px;border-bottom:1px solid rgba(255,255,255,.08)}}
.auth-dialog::backdrop,.ajustes-dialog::backdrop{background:rgba(3,9,6,.72);-webkit-backdrop-filter:blur(4px);backdrop-filter:blur(4px)}
.ajustes-dialog__head,.legal-dialog__foot{background:#13221B}
.legal-dialog__foot{border-top:1px solid rgba(255,255,255,.07)}
.ajustes-dialog__title,.auth-dialog__head h2{color:#EEF6F0}
.ajustes-group+.ajustes-group{border-top:1px solid rgba(255,255,255,.07)}
.ajustes-group__title{color:#8FE8BE}
.ajustes-group__hint{color:#93AB9D}
.ajustes-group__hint strong{color:#D5E6DC}
.ajustes-action{border-radius:16px;border:1px solid rgba(255,255,255,.11);background:rgba(255,255,255,.035);color:#E9F3EC}
.ajustes-action:hover{border-color:rgba(123,224,176,.55)}
.ajustes-choice__btn[aria-checked="true"]{color:#06231A}
.legal-dialog__body h3{color:#EEF6F0}
.legal-dialog__body ul{color:#B5C9BC}
.legal-dialog__version{color:#93AB9D}
.suggest-list{background:#15261E}
"""

for k, v in dict(__STARS__=STARS, __SUMMIT__=SUMMIT, __ORB_KCAL__=ORB_KCAL,
                 __ARC_KCAL__=ARC_KCAL, __ARC_P__=ARC_P, __ARC_C__=ARC_C, __ARC_F__=ARC_F, __ORB_MINT__=ORB_MINT, __CHECK__=CHECK, __ARROW__=ARROW).items():
    CSS = CSS.replace(k, v)

V = dict(
    id="noche", name="Ночной лес",
    desc="Премиальное тёмное фитнес-приложение ночью: зелёно-чёрный фон с топографическими горизонталями, звёздной пылью и мягким мятным сиянием, "
         "тёмные карточки с тонкой светящейся кромкой. Мятные кнопки мягко светятся и проседают при нажатии, второстепенные — с градиентной обводкой, "
         "нижняя панель — тёмное стекло со светящимся индикатором.",
    sw=["#0C1713", "#14231C", "#7BE0B0", "#C6EA7C", "#FF9473", "#B9A8FF", "#F5C65A", "#63D8E8"],
    fonts=["exo-2", "onest"], palette=PAL, tokens=TOKENS, css=CSS)
