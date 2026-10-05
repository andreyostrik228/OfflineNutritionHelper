# -*- coding: utf-8 -*-
"""D · Мягкий рельеф — calm soft UI ("neumorphism done properly").
One sage-grey material everywhere: the page itself carries huge embossed plate rims and soft discs,
cards are raised pillows of the same material, fields / trays / progress bars are pressed-in wells,
the single emerald accent is a glossy pillow that presses IN, coral marks energy.
"""
from arte import *

# ── the material ──────────────────────────────────────────────────────────────────────────────────
M = "#E4EBE3"      # page material
SURF = "#E8EEE7"   # card face (a hair lighter: it catches the light)
WELL = "#DDE5DC"   # floor of a pressed well
DK = "#B7C4B8"     # dark shadow
DKA = "#A7B6AA"    # dark shadow of the giant page reliefs (slightly deeper, they are much bigger)
EM = "#247D5C"     # emerald fill (white text 5.0:1)
EMT = "#1B6B4E"    # emerald as TEXT on the material (5.5:1)

PAL = dict(
    canvas=M, surface=SURF, surface_2=WELL, line="#D2DCD2", line_strong="#B9C6BA", field_line="#6A8070",
    ink="#22342A", text_2="#3B5045", text_3="#4A5F52",
    primary=EM, primary_2="#1D6C4F", primary_3="#22795A", on_ink="#FFFFFF", on_ink_2="#EEF8F2",
    volt="#CFE6D8", volt_hi="#9CCDB3", volt_wash="#DCEDE2", on_volt="#22342A",
    kcal="#E8765A", kcal_deep="#A9442A", kcal_wash="#F3E0D7",
    protein="#9A8BC4", protein_deep="#5B4A94", protein_wash="#E5E1EF",
    carbs="#CFA244", carbs_deep="#6F530F", carbs_wash="#EFE6CF",
    fat="#4BA5A0", fat_deep="#1B6662", fat_wash="#D7EBE7",
    ok="#1E6B4A", ok_wash="#D6EADD", warn="#6B4C0C", warn_wash="#F0E6CB",
    danger="#B5402B", danger_deep="#8C2E1E", danger_wash="#F4DED8", shadow_rgb="44, 66, 52")


# ── relief helpers: SVG filters that draw a light/dark pair around (raised) or inside (pressed) a shape ──
def fx_raise(fid, d, b, dark=DKA, light="#FFFFFF", dop=1.0, lop=1.0, reg=(-600, -600, 3200, 3200)):
    """Raised: blurred copies of the shape's alpha, dark to the bottom-right, light to the top-left, shape cut out
    (so the face of the relief IS the page underneath)."""
    x, y, w, h = reg
    return (f"<filter id='{fid}' filterUnits='userSpaceOnUse' x='{x}' y='{y}' width='{w}' height='{h}' color-interpolation-filters='sRGB'>"
            f"<feGaussianBlur in='SourceAlpha' stdDeviation='{b}' result='b'/>"
            f"<feOffset in='b' dx='{d}' dy='{d}' result='o1'/><feFlood flood-color='{dark}' flood-opacity='{dop}'/><feComposite in2='o1' operator='in' result='dk'/>"
            f"<feOffset in='b' dx='{-d}' dy='{-d}' result='o2'/><feFlood flood-color='{light}' flood-opacity='{lop}'/><feComposite in2='o2' operator='in' result='lt'/>"
            f"<feMerge result='m'><feMergeNode in='dk'/><feMergeNode in='lt'/></feMerge>"
            f"<feComposite in='m' in2='SourceAlpha' operator='out'/></filter>")


def fx_press(fid, d, b, dark=DKA, light="#FFFFFF", dop=1.0, lop=1.0, reg=(-600, -600, 3200, 3200)):
    """Pressed in: the inverted alpha blurred and offset, kept only INSIDE the shape (dark top-left, light bottom-right)."""
    x, y, w, h = reg
    return (f"<filter id='{fid}' filterUnits='userSpaceOnUse' x='{x}' y='{y}' width='{w}' height='{h}' color-interpolation-filters='sRGB'>"
            f"<feComponentTransfer in='SourceAlpha' result='inv'><feFuncA type='table' tableValues='1 0'/></feComponentTransfer>"
            f"<feGaussianBlur in='inv' stdDeviation='{b}' result='b'/>"
            f"<feOffset in='b' dx='{d}' dy='{d}' result='o1'/><feFlood flood-color='{dark}' flood-opacity='{dop}'/><feComposite in2='o1' operator='in' result='dk'/>"
            f"<feOffset in='b' dx='{-d}' dy='{-d}' result='o2'/><feFlood flood-color='{light}' flood-opacity='{lop}'/><feComposite in2='o2' operator='in' result='lt'/>"
            f"<feMerge result='m'><feMergeNode in='dk'/><feMergeNode in='lt'/></feMerge>"
            f"<feComposite in='m' in2='SourceAlpha' operator='in'/></filter>")


SHEEN = ("<linearGradient id='sh' x1='0' y1='0' x2='1' y2='1'>"
         "<stop offset='0' stop-color='#FFFFFF' stop-opacity='.55'/><stop offset='.5' stop-color='#FFFFFF' stop-opacity='0'/>"
         "<stop offset='1' stop-color='#93A697' stop-opacity='.16'/></linearGradient>")


def ring(c, r, w, fid, sheen=True):
    s = f"<circle cx='{c}' cy='{c}' r='{r}' fill='none' stroke='#000' stroke-width='{w}' filter='url(#{fid})'/>"
    if sheen:
        s += f"<circle cx='{c}' cy='{c}' r='{r}' fill='none' stroke='url(#sh)' stroke-width='{w}'/>"
    return s


def plate(S=940):
    """Three concentric raised rims + a pressed centre well: a plate seen from above, drawn in the page material."""
    c = S / 2
    defs = (SHEEN + fx_raise("a", 15, 17) + fx_raise("b", 11, 12) + fx_raise("c", 7, 8) + fx_press("w", 12, 14))
    body = (ring(c, 352, 44, "a") + ring(c, 272, 24, "b") + ring(c, 214, 12, "c") +
            f"<circle cx='{c}' cy='{c}' r='158' fill='#000' filter='url(#w)'/>"
            f"<circle cx='{c}' cy='{c}' r='158' fill='#B9C7BC' fill-opacity='.10'/>")
    return svg(S, S, f"<defs>{defs}</defs>{body}")


def disc(S=640, r=190, d=17, b=21):
    """A big raised soft disc (convex)."""
    c = S / 2
    defs = SHEEN + fx_raise("r", d, b)
    return svg(S, S, f"<defs>{defs}</defs><circle cx='{c}' cy='{c}' r='{r}' fill='#000' filter='url(#r)'/>"
                     f"<circle cx='{c}' cy='{c}' r='{r}' fill='url(#sh)'/>")


def dimple(S=260, r=104, d=11, b=12):
    """A pressed-in soft disc (concave)."""
    c = S / 2
    return svg(S, S, f"<defs>{fx_press('p', d, b)}</defs><circle cx='{c}' cy='{c}' r='{r}' fill='#000' filter='url(#p)'/>"
                     f"<circle cx='{c}' cy='{c}' r='{r}' fill='#B9C7BC' fill-opacity='.12'/>")


def grooves(S=300, radii=(54, 86, 118, 150), w=5, d=1.6, b=1.4, dop=1.0, lop=1.0):
    """Thin engraved concentric circles (ring motif for the hero and the display wells)."""
    c = S / 2
    defs = fx_press("g", d, b, dark="#A3B3A6", light="#FFFFFF", dop=dop, lop=lop)
    body = "".join(f"<circle cx='{c}' cy='{c}' r='{r}' fill='none' stroke='#000' stroke-width='{w}' filter='url(#g)'/>" for r in radii)
    return svg(S, S, f"<defs>{defs}</defs>{body}")


def ring_end(side, radii=(11, 21, 31), w=4, H=120, d=1.3, b=1.1):
    """Engraved half-rings whose centre sits ON the left/right edge of the SVG: anchored to an edge of the hero,
    they look like a plate peeking in from the side, without ever crossing the name."""
    Wd = max(radii) + 14
    cx = 0 if side == "l" else Wd
    defs = fx_press("g", d, b, dark="#A0B1A4", light="#FFFFFF", dop=.85, reg=(-60, -60, Wd + 120, H + 120))
    body = "".join(f"<circle cx='{cx}' cy='{H/2}' r='{r}' fill='none' stroke='#000' stroke-width='{w}' filter='url(#g)'/>" for r in radii)
    return svg(Wd, H, f"<defs>{defs}</defs>{body}")


RING_L, RING_R = uri(ring_end("l")), uri(ring_end("r"))
RING_LW, RING_RW = (uri(ring_end(s, radii=(13, 24, 35, 46, 57, 68), H=170)) for s in "lr")
PLATE = uri(plate())
DISC = uri(disc())
DIMPLE = uri(dimple())
GROOVES_DISPLAY = uri(grooves(S=300, radii=(62, 92, 122), w=6, d=1.5, b=1.3, dop=.6, lop=.85))
# the brand mark: a tiny plate — engraved rim + emerald centre
MARK = uri(svg(36, 36,
               "<circle cx='18.7' cy='18.7' r='11' fill='none' stroke='#FFFFFF' stroke-width='2'/>"
               "<circle cx='18' cy='18' r='11' fill='none' stroke='#9DAFA1' stroke-width='1.6'/>"
               "<circle cx='18' cy='18' r='5.6' fill='#247D5C'/><circle cx='16.6' cy='16.4' r='1.9' fill='#FFFFFF' opacity='.5'/>"))
CHEVRON = uri(svg(20, 20, "<path d='M5 7.5l5 5 5-5' stroke='#1B6B4E' stroke-width='2.4' fill='none' stroke-linecap='round' stroke-linejoin='round'/>"))

TOKENS = (
    '--font-display:"Rubik",system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;'
    '--font-body:"Rubik",system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;'
    "--r-sm:14px;--r-md:18px;--r-lg:24px;--r-xl:30px;--r-ctl:18px;"
    "--fw-display:700;--fw-fig:700;--fw-btn:600;--fw-label:600;--fw-hero:700;--ls-label:0;"
    "--hero-k:6.0;--hero-max:112px;--dock:90px;"
    # the relief scale: raised (outer light/dark pair) and pressed (inner pair)
    "--raise-xl:14px 14px 30px #B2C0B4,-12px -12px 28px #FFFFFF;"
    "--raise-lg:10px 10px 22px #B7C4B8,-10px -10px 22px #FFFFFF;"
    "--raise-md:6px 6px 14px #B7C4B8,-6px -6px 14px #FFFFFF;"
    "--raise-sm:4px 4px 9px #B7C4B8,-4px -4px 9px #FFFFFF;"
    "--raise-xs:2px 2px 5px #B7C4B8,-2px -2px 5px #FFFFFF;"
    "--press-lg:inset 7px 7px 14px #B9C6BA,inset -7px -7px 14px #FFFFFF;"
    "--press-md:inset 4px 4px 9px #B9C6BA,inset -4px -4px 9px #FFFFFF;"
    "--press-sm:inset 2px 2px 5px #B9C6BA,inset -2px -2px 5px #FFFFFF;"
    "--pillow:linear-gradient(145deg,#EEF3ED 0%,#E1E9E0 100%);"
    "--pillow-hi:linear-gradient(145deg,#F2F6F1 0%,#E4EBE3 100%);"
    "--emerald:linear-gradient(145deg,#288462 0%,#1E7354 100%);"
    "--emerald-hi:linear-gradient(145deg,#298563 0%,#1F7657 100%);"
    "--emerald-in:linear-gradient(145deg,#1B694C 0%,#237B5B 100%);"
    "--led:radial-gradient(circle at 35% 32%,#6CCBA2 0%,#2B8966 45%,#1B694C 100%);"
    "--shadow-1:var(--raise-lg);--shadow-2:16px 16px 40px rgba(44,66,52,.30),-10px -10px 30px rgba(255,255,255,.85);"
)

CSS = r"""
/* ═════════ D · Мягкий рельеф ═════════ */
html{background:#E4EBE3}
body{background:transparent;font-weight:450;color:#22342A}
body::before{content:"";position:fixed;inset:0;z-index:-1;pointer-events:none;
  background:
    __PLATE__ no-repeat right -442px top -332px / 940px 940px,
    __DISC__ no-repeat left -290px bottom -230px / 640px 640px,
    __DIMPLE__ no-repeat left -150px top 50% / 260px 260px,
    radial-gradient(80% 42% at 0% 0%, rgba(255,255,255,.85) 0%, rgba(255,255,255,0) 70%),
    linear-gradient(165deg, #ECF1EB 0%, #E4EBE3 48%, #DAE2D9 100%);}
@media (min-width:901px){
  body::before{background-position:right -250px top -330px, left -170px bottom -230px, left 30% top 112%, 0 0, 0 0;
    background-size:1000px 1000px, 600px 600px, 380px 380px, auto, auto}
}
::selection{background:#CFE6D8;color:#22342A}
:focus-visible{outline:3px solid #247D5C;outline-offset:3px}

/* ── top bar ── */
.topbar{padding-top:14px;padding-bottom:12px}
@@BTN_ICON@@{border:0;background:var(--pillow);color:#1B6B4E;box-shadow:var(--raise-sm);transition:box-shadow .15s ease}
@@BTN_ICON@@:hover{background:var(--pillow-hi)}
@@BTN_ICON@@:active{box-shadow:var(--press-sm)}
.topbar__menu-btn{width:46px;height:46px;border-radius:50%}
.topbar__brand{color:#22342A;text-shadow:-1px -1px 0 #FFFFFF,1px 1px 2px rgba(44,66,52,.18)}
.topbar__brand-mark{width:36px;height:36px;border-radius:50%;background:__MARK__ center / 36px no-repeat,var(--pillow);box-shadow:var(--raise-xs)}
.topbar__brand-mark svg{display:none}
@@PROFILE@@{height:46px;padding:0 16px 0 6px;border:0;border-radius:999px;background:var(--pillow);box-shadow:var(--raise-sm);color:#22342A;font-size:var(--fs-sm);font-weight:600}
@@PROFILE@@:active{box-shadow:var(--press-sm)}
.topbar__profile-avatar{width:34px;height:34px;background:#DDE5DC;color:#1B6B4E;box-shadow:var(--press-sm)}
.topbar__menu{background:#E8EEE7;border-radius:22px;box-shadow:var(--shadow-2)}
.topbar__menu-item:hover{background:#DDE5DC}

/* ── hero: a raised plate, the name embossed in it ── */
.hero{position:relative;border-radius:30px;color:#2A3F33;
  background:__RING_L__ no-repeat left center / auto clamp(98px,31vw,150px),__RING_R__ no-repeat right center / auto clamp(98px,31vw,150px),
    linear-gradient(145deg,#EEF3ED 0%,#E3EAE2 100%);
  box-shadow:var(--raise-xl)}
@media(min-width:700px){.hero{background-image:__RING_LW__,__RING_RW__,linear-gradient(145deg,#EEF3ED 0%,#E3EAE2 100%);background-size:auto 170px,auto 170px,auto}}
.hero::before,.hero::after{content:none}
.hero__texto{position:relative;padding:22px 16px 24px}
.hero__nombre{color:#2A3F33;text-shadow:-2px -2px 2px rgba(255,255,255,.95),3px 3px 5px rgba(128,148,133,.55)}

/* ── headings ── */
h2{color:#22342A;text-shadow:-1px -1px 0 rgba(255,255,255,.9),1px 1px 2px rgba(44,66,52,.14)}
h2 em{color:#1B6B4E;background:none;padding:0;margin:0}
.eyebrow{color:#4A5F52}
.form-section-label::before{width:12px;height:12px;border-radius:50%;background:var(--led);box-shadow:2px 2px 4px #AFBDB1,-2px -2px 4px #FFFFFF;transform:none}
@@SECTION_LABEL@@{color:#3B5045}
.badge{height:36px;padding:0 15px;border-radius:999px;background:var(--pillow);color:#1B6B4E;box-shadow:var(--raise-sm)}
.badge svg{color:#247D5C}

/* ── surfaces: raised pillows of the same material ── */
@@PANEL@@{background:#E8EEE7;border-radius:30px;box-shadow:var(--raise-lg)}
@@CARD@@{border:0;border-radius:26px;background:#E8EEE7;box-shadow:var(--raise-md)}
.resumen-datos{padding:8px 8px 8px 18px}
@@WELL@@{border-radius:16px;background:#DFE7DE;box-shadow:var(--press-sm)}
.meta-boxes{display:flex;flex-wrap:wrap;gap:10px}
.meta{flex:1 1 auto;padding:10px 12px 10px 13px}
.meta .k{color:#4A5F52}
@@SHEET@@{background:#E8EEE7}

/* ── buttons ── */
@@BTN_P@@,@@BTN_CTA@@{border:0;border-radius:20px;color:#FFFFFF;background:var(--emerald);
  box-shadow:6px 6px 14px #A8B8AB,-6px -6px 14px #FFFFFF,inset 1px 1px 1px rgba(255,255,255,.38),inset -1px -1px 2px rgba(8,48,30,.28);
  text-shadow:0 1px 1px rgba(8,48,30,.35);transition:box-shadow .15s ease,background .15s ease,transform .1s ease}
@@BTN_P@@ svg,@@BTN_CTA@@ svg{color:#FFFFFF}
@@BTN_P@@:hover,@@BTN_CTA@@:hover{background:var(--emerald-hi);border-color:transparent}
@@BTN_P@@:active,@@BTN_CTA@@:active{transform:translateY(1px);background:var(--emerald-in);
  box-shadow:inset 4px 4px 10px rgba(6,40,24,.55),inset -3px -3px 8px rgba(255,255,255,.16),1px 1px 2px #FFFFFF}
@@BTN_P@@:disabled,@@BTN_CTA@@:disabled{background:#E1E8E0;color:#5F7366;text-shadow:none;box-shadow:inset 2px 2px 5px #C4CFC5,inset -2px -2px 5px #FFFFFF}
@@BTN_S@@{border:0;border-radius:20px;background:var(--pillow);color:#1B6B4E;box-shadow:var(--raise-md);transition:box-shadow .15s ease,background .15s ease}
@@BTN_S@@:hover{background:var(--pillow-hi)}
@@BTN_S@@:active{transform:none;background:#E1E9E0;box-shadow:var(--press-md)}
@@BTN_S@@:disabled{background:#E1E8E0;color:#5F7366;box-shadow:inset 2px 2px 5px #C4CFC5,inset -2px -2px 5px #FFFFFF}
@@BTN_S@@ svg{color:#247D5C}
.actions-secondary .btn-secondary{gap:7px;padding:0 10px}
.actions-secondary #resetBtn{box-shadow:none;border:0;background:none;color:#3B5045;text-decoration:underline;text-decoration-color:#9CCDB3;text-decoration-thickness:2px;text-underline-offset:5px}
.actions-secondary #resetBtn:active{box-shadow:var(--press-sm)}
@@BTN_SM@@{border:0;border-radius:14px;background:var(--pillow);color:#1B6B4E;box-shadow:var(--raise-sm);transition:box-shadow .15s ease}
@@BTN_SM@@:hover{background:var(--pillow-hi);color:#1B6B4E;border-color:transparent}
@@BTN_SM@@:active{box-shadow:var(--press-sm)}
.pantry-active-card__delete{color:#8C2E1E}
.pantry-active-card__delete--armed{background:linear-gradient(145deg,#C04A33,#A53A26);color:#fff}
@@BTN_DANGER@@{border-radius:20px;background:linear-gradient(145deg,#C04A33,#A53A26);color:#fff;box-shadow:6px 6px 14px #A8B8AB,-6px -6px 14px #FFFFFF,inset 1px 1px 1px rgba(255,255,255,.3)}
.pantry-active-card__buy-btn--secondary{background:var(--pillow);color:#1B6B4E;text-shadow:none;box-shadow:var(--raise-md)}
.pantry-active-card__buy-btn--secondary svg{color:#247D5C}
.link-btn,.pantry-link-btn,.auth-dialog__switch-btn,.onboarding__link,.site-footer__link,.onboarding__skip,.onboarding__skip-questions,.tour__skip{text-decoration-color:#7FBF9F}

/* ── selectable things: raised; selected = pressed in, emerald dot + emerald text ── */
@@CHIP@@{position:relative;border:0;border-radius:18px;background:var(--pillow);color:#22342A;box-shadow:var(--raise-md);transition:box-shadow .15s ease,background .15s ease}
@@CHIP@@:hover{background:var(--pillow-hi);border-color:transparent}
@@CHIP_ON@@{background:#DFE7DE;color:#1B6B4E;font-weight:600;box-shadow:var(--press-md);border-color:transparent}
.baldosa::before{content:"";flex:none;width:12px;height:12px;margin-right:9px;border-radius:50%;background:#D5DED4;box-shadow:inset 2px 2px 3px #9DAEA1,inset -1.5px -1.5px 2px #FFFFFF}
.baldosa.is-activa::before{background:var(--led);box-shadow:0 0 0 3px rgba(36,125,92,.16),1px 1px 2px rgba(10,50,30,.3)}
.budget-chip{padding:19px 12px 12px 14px}
.budget-chip::after{content:"";position:absolute;right:10px;top:9px;width:10px;height:10px;border-radius:50%;background:#D5DED4;box-shadow:inset 2px 2px 3px #9DAEA1,inset -1.5px -1.5px 2px #FFFFFF}
.budget-chip--custom{padding-top:12px}
.budget-chip--custom::after{top:50%;right:14px;margin-top:-5px}
/* tablets: five chips in a row squeeze the amounts (Rubik is wide) — 2, then 4 + the custom chip across */
@media (min-width:600px) and (max-width:900px){
  .budget-modes{grid-template-columns:repeat(2,minmax(0,1fr))}
  .budget-chip--custom{grid-column:1/-1;flex-direction:row;align-items:center}
}
@media (min-width:760px) and (max-width:900px){.budget-modes{grid-template-columns:repeat(4,minmax(0,1fr))}}
/* narrow phones: two columns would split "Сбалансированный" mid-word — one radio-like list instead */
@media (max-width:389px){
  .budget-modes{grid-template-columns:minmax(0,1fr);gap:10px}
  .budget-chip{flex-direction:row;flex-wrap:wrap;align-items:baseline;align-content:center;justify-content:space-between;gap:2px 10px;min-height:56px;padding:13px 16px 13px 38px}
  .budget-chip--custom{align-items:center}
  .budget-chip__amount{font-size:var(--fs-fig-s)}
  .budget-chip::after,.budget-chip--custom::after{left:16px;right:auto;top:50%;margin-top:-5px}
}
@media (max-width:339px){.budget-chip{flex-direction:column;flex-wrap:nowrap;align-items:flex-start;align-content:normal;justify-content:center;gap:5px}}
@media (max-width:359px){
  .food-row{grid-template-areas:"name kcal" "meta meta" "use use" "pack pack" "buy buy"}
  .food-cost--usage{grid-area:use}
  .food-cost--package{grid-area:pack;justify-self:start}
}
.visually-hidden:checked + .budget-chip::after{background:var(--led);box-shadow:0 0 0 3px rgba(36,125,92,.16),1px 1px 2px rgba(10,50,30,.3)}
.budget-chip__title{color:#3B5045}
.visually-hidden:checked + .budget-chip .budget-chip__title{color:#3B5045}
.visually-hidden:checked + .budget-chip .budget-chip__amount{color:#1B6B4E}
.onboarding__choice{padding-left:44px}
.onboarding__choice::before{content:"";position:absolute;left:17px;top:50%;margin-top:-6px;width:12px;height:12px;border-radius:50%;background:#D5DED4;box-shadow:inset 2px 2px 3px #9DAEA1,inset -1.5px -1.5px 2px #FFFFFF}
.onboarding__choice.is-selected::before{background:var(--led);box-shadow:0 0 0 3px rgba(36,125,92,.16),1px 1px 2px rgba(10,50,30,.3)}
.onboarding__choice.is-selected .onboarding__choice-amount{color:#1B6B4E}
.onboarding__choice.is-selected .onboarding__choice-note{color:#3B5045}
.onboarding__choice-note{color:#4A5F52}
.date-chip--today::after{background:var(--led);box-shadow:0 0 0 3px rgba(36,125,92,.16)}
.pantry-meal-chip--cooked .pantry-meal-chip__time{color:#1B6B4E}
.pantry-meal-chip__time{color:#A9442A}

/* segmented: an inset tray with a raised thumb */
@@SEG@@{border:0;border-radius:24px;padding:6px;gap:6px;background:#DDE5DC;box-shadow:var(--press-md)}
@@SEG_BTN@@{border-radius:18px;color:#3B5045;background:transparent;transition:box-shadow .15s ease,background .15s ease}
@@SEG_ON@@{background:var(--pillow);color:#1B6B4E;box-shadow:4px 4px 9px #B1BFB3,-3px -3px 8px #FFFFFF}

/* − / + : a pressed track with raised round knobs (sizes come from the kit) */
@@STEP@@{border:1px solid #6A8070;border-radius:30px;background:#DDE5DC;box-shadow:var(--press-sm)}
@@STEP@@:focus-within{border-color:#247D5C;background:#E0E8DF}
.paso-a-paso input[type="number"]{background:transparent;border:0;border-radius:0;box-shadow:none;color:#22342A}
@@STEP_BTN@@{border-radius:50%;background:var(--pillow);color:#1B6B4E;font-weight:500;box-shadow:3px 3px 7px #AEBCB0,-3px -3px 7px #FFFFFF;transition:box-shadow .12s ease}
@@STEP_BTN@@:active{transform:none;box-shadow:inset 2px 2px 5px #AEBCB0,inset -2px -2px 5px #FFFFFF}
@@STEP_PLUS@@{background:var(--emerald);color:#FFFFFF;box-shadow:3px 3px 7px #A3B3A6,-3px -3px 7px #FFFFFF,inset 1px 1px 1px rgba(255,255,255,.35)}
@@STEP_PLUS@@:active{background:var(--emerald-in);box-shadow:inset 3px 3px 6px rgba(6,40,24,.5),inset -2px -2px 5px rgba(255,255,255,.15)}

/* fields: pressed wells with a 3:1 hairline */
@@FIELD@@{background-color:#DDE5DC;border:1px solid #6A8070;border-radius:16px;box-shadow:inset 3px 3px 7px #BCC8BD,inset -3px -3px 7px #FBFDFB;color:#22342A;font-weight:500}
@@FIELD@@:focus{border-color:#247D5C;background-color:#E1E9E0;box-shadow:inset 3px 3px 7px #BCC8BD,inset -3px -3px 7px #FFFFFF,0 0 0 3px rgba(36,125,92,.22)}
select{background-image:__CHEVRON__}
.field>label{color:#3B5045}
.field-hint{color:#4A5F52}
.field-hint strong{color:#22342A}

/* ── scoreboard: calories in an inset display, macros as raised discs with a colour ring ── */
.nutrition-strip{background:none;box-shadow:none;padding:4px 0 0;gap:14px 12px;overflow:visible;border-radius:0;color:#22342A}
.summary-card{border:0!important;border-radius:26px;padding:14px 8px 16px;background:var(--pillow);box-shadow:var(--raise-md);color:#22342A}
.summary-card h3{color:#3B5045}
.summary-card .sub{color:#3B5045}
.icon-badge{width:26px;height:26px;border-radius:50%;background:var(--pillow);box-shadow:var(--raise-xs)}
.summary-card .icon-badge{box-shadow:2px 2px 5px #A9B8AC,-2px -2px 5px #FFFFFF,inset 1px 1px 1px rgba(255,255,255,.45)}
.summary-card--calories{position:relative;padding:18px 20px 18px;
  background:__GROOVES_DISPLAY__ no-repeat right -96px center / 300px 300px,radial-gradient(120% 100% at 100% 0%,rgba(255,255,255,.35) 0%,rgba(255,255,255,0) 55%),#DCE4DB;box-shadow:var(--press-lg)}
.summary-card--calories .icon-badge{color:#A9442A}
.summary-card--calories .big{color:#C4573A}
.summary-card--calories .big .u{color:#A9442A}
.summary-card--protein,.summary-card--carbs,.summary-card--fat{display:flex;flex-direction:column;align-items:center;text-align:center}
/* label on top, the icon sits on the ring like a knob */
.summary-card--protein h3,.summary-card--carbs h3,.summary-card--fat h3{flex-direction:column-reverse;align-items:center;gap:8px}
.summary-card--protein .icon-badge,.summary-card--carbs .icon-badge,.summary-card--fat .icon-badge{position:relative;z-index:2}
.summary-card--protein .big,.summary-card--carbs .big,.summary-card--fat .big{
  display:flex;flex-wrap:wrap;align-content:center;align-items:baseline;justify-content:center;
  width:min(88px,100%);aspect-ratio:1/1;margin:-13px auto 10px;border-radius:50%;
  font-size:clamp(21px,7.2cqw,28px);background:#DDE5DC}
.summary-card--protein .big{box-shadow:0 0 0 3px #9A8BC4,inset 3px 3px 7px #B6C3B7,inset -3px -3px 7px #FFFFFF;color:#5B4A94}
.summary-card--carbs .big{box-shadow:0 0 0 3px #CFA244,inset 3px 3px 7px #B6C3B7,inset -3px -3px 7px #FFFFFF;color:#6F530F}
.summary-card--fat .big{box-shadow:0 0 0 3px #4BA5A0,inset 3px 3px 7px #B6C3B7,inset -3px -3px 7px #FFFFFF;color:#1B6662}
.summary-card--protein .icon-badge{color:#5B4A94}.summary-card--carbs .icon-badge{color:#6F530F}.summary-card--fat .icon-badge{color:#1B6662}
.summary-card--protein .sub,.summary-card--carbs .sub,.summary-card--fat .sub{margin-top:0}
@container (min-width:620px){
  .nutrition-strip{grid-template-columns:1.5fr repeat(3,minmax(0,1fr))}
  .summary-card--calories{grid-column:auto;display:flex;flex-direction:column;justify-content:center;background-position:right -176px top -176px,0 0,0 0}
}

/* timeline, days, meal cards */
.schedule-timeline__row{padding:12px var(--gutter) 18px;margin-top:-10px}
@container (min-width:620px){.schedule-timeline__row{padding:12px 0 18px}}
.schedule-timeline__item{border:0;border-radius:22px;background:var(--pillow);box-shadow:var(--raise-sm)}
.schedule-timeline__item:hover{border-color:transparent}
.schedule-timeline__item--next{background:#DDE5DC;box-shadow:var(--press-md)}
.schedule-timeline__item--next .schedule-timeline__time{color:#1B6B4E}
.schedule-timeline__next-tag{background:var(--emerald);color:#fff;box-shadow:2px 2px 4px rgba(44,66,52,.25)}
.schedule-timeline__time{color:#22342A}
.day-slide__n{color:#22342A;text-shadow:-1px -1px 0 #FFFFFF,1px 1px 2px rgba(44,66,52,.15)}
.day-slide__of{color:#4A5F52}
.day-slide__head::after{height:8px;border-radius:4px;background:#DCE4DB;box-shadow:inset 2px 2px 3px #B3C0B4,inset -2px -2px 3px #FFFFFF}
.days-carousel__track--multi{padding-top:12px;padding-bottom:24px}
.days-carousel__dot::before{width:10px;height:10px;background:#D6DFD5;box-shadow:inset 1.5px 1.5px 3px #A9B8AC,inset -1.5px -1.5px 3px #FFFFFF}
.days-carousel__dot.is-active::before{width:28px;background:var(--emerald);box-shadow:2px 2px 4px #AFBDB1,-2px -2px 4px #FFFFFF}
.days-carousel__hint{color:#4A5F52}
.days-carousel__arrow{background:var(--pillow);color:#1B6B4E;box-shadow:var(--raise-md)}
.meal-time-badge{height:36px;padding:0 13px;border-radius:14px;background:#DCE4DB;color:#22342A;box-shadow:var(--press-sm)}
.meal-kcal{color:#A9442A}
.meal-items{border-top:1px solid rgba(140,160,145,.5);box-shadow:inset 0 1px 0 rgba(255,255,255,.9)}
.food-row{border-bottom:1px solid rgba(140,160,145,.45);box-shadow:0 1px 0 rgba(255,255,255,.85)}
.food-row:last-child{box-shadow:none}
.food-meta{color:#3B5045}
.food-qty__grams,.food-cost__tag{color:#4A5F52}
@@TAG@@{border-radius:999px}
.food-macro__badge,.food-purchase__badge,.verified-card__badge,.meal-steps__badge,.nocook-level{background:#D6E6DA;color:#1E6B4A;box-shadow:inset 1px 1px 2px #B5C3B8,inset -1px -1px 2px #FFFFFF}
.food-purchase{background:#DFE7DE;box-shadow:var(--press-sm);border-radius:14px;color:#22342A}
.meal-footer{background:#DFE7DE;border-top:0;box-shadow:inset 0 6px 10px -6px #AFBDB1}
.meal-footer>div{color:#4A5F52}
.meal-footer>div::before{height:6px;border-radius:3px;box-shadow:inset 1px 1px 1px rgba(0,0,0,.12)}
.meal-footer>div:nth-child(1)::before{background:#9A8BC4}
.meal-footer>div:nth-child(2)::before{background:#CFA244}
.meal-footer>div:nth-child(3)::before{background:#4BA5A0}
.meal-footer>div:nth-child(4)::before{background:#247D5C}
.meal-footer strong{color:#22342A}
.meal-steps{border-top:1px solid rgba(140,160,145,.5);box-shadow:inset 0 1px 0 rgba(255,255,255,.9)}
.meal-steps__toggle{color:#1B6B4E}
.meal-steps__toggle::after{border-color:#247D5C}
.meal-steps__list li::before{border-radius:50%;background:var(--emerald);color:#fff;box-shadow:2px 2px 4px #AFBDB1,-2px -2px 4px #FFFFFF}
.meal-make-ahead,.meal-cook-note{border-radius:14px;background:#EFE6CD;box-shadow:inset 2px 2px 5px #D3C7A6,inset -2px -2px 5px #FBF6EA}
.meal-card--empty{border:0;background:#DFE7DE;box-shadow:var(--press-md)}
.empty-icon{border-radius:50%;background:var(--pillow);color:#247D5C;box-shadow:var(--raise-md);transform:none}
.warning{border-radius:20px;background:#EFE6CD;box-shadow:inset 3px 3px 7px #D6CBAA,inset -3px -3px 7px #FBF7EC}
.warning--error{background:#F4DED8;color:#8C2E1E;box-shadow:inset 3px 3px 7px #DDBFB6,inset -3px -3px 7px #FDF3F0}
.spinner-wrap{background:#DDE5DC;color:#22342A;box-shadow:var(--press-md);border-radius:18px}
.loader-flame{border-color:#C3CFC5;border-top-color:#247D5C}
.insights .icon-badge{background:var(--pillow);color:#247D5C}
.insights li{color:#3B5045}
.insights li::before{border-radius:50%;background:var(--led);box-shadow:none;transform:none}
.next-meal-sticky__btn{border-radius:22px;background:#E8EEE7;color:#22342A;box-shadow:8px 8px 18px rgba(150,168,154,.8),-6px -6px 16px rgba(255,255,255,.95)}
.next-meal-sticky__eyebrow{background:var(--emerald);color:#fff;box-shadow:2px 2px 4px rgba(44,66,52,.25)}
.next-meal-sticky__label{color:#3B5045}

/* shopping */
.shopping-summary{gap:12px}
.shopping-summary__stat{border-radius:22px;padding:14px 12px 13px;background:var(--pillow);box-shadow:var(--raise-sm)}
.shopping-summary__stat span{color:#3B5045}
.shopping-summary__stat:not(:nth-child(2)) strong{font-size:clamp(18px,5.7vw,26px)}
.shopping-summary__stat:nth-child(2){padding:18px 20px 18px;
  background:__GROOVES_DISPLAY__ no-repeat right -96px center / 300px 300px,radial-gradient(120% 100% at 100% 0%,rgba(255,255,255,.35) 0%,rgba(255,255,255,0) 55%),#DCE4DB;box-shadow:var(--press-lg)}
.shopping-summary__stat:nth-child(2) span{color:#3B5045}
.shopping-summary__stat:nth-child(2) strong{color:#1B6B4E}
.shopping-progress__texto{color:#3B5045}
.shopping-progress__barra{height:20px;padding:4px;background:#DCE4DB;box-shadow:var(--press-sm)}
.shopping-progress__barra>span{background:var(--emerald);box-shadow:1px 1px 2px rgba(10,50,30,.3)}
.shopping-list{gap:14px}
.shopping-item__check::before,.pantry-purchase-row__check::before{border:1px solid #6A8070;background:#DCE4DB;box-shadow:inset 2px 2px 4px #B5C2B6,inset -2px -2px 4px #FFFFFF}
.shopping-item__check[aria-checked="true"]::before,.pantry-purchase-row__check[aria-checked="true"]::before{background:var(--emerald);border-color:#1D6C4F;box-shadow:2px 2px 5px #AFBDB1,-2px -2px 5px #FFFFFF}
.shopping-item__check[aria-checked="true"]::after,.pantry-purchase-row__check[aria-checked="true"]::after{border-color:#fff}
.shopping-item__meta,.shopping-item__usage-price{color:#4A5F52}
.shopping-item.is-comprado{background:#E1E8E0;box-shadow:var(--press-sm)}
.shopping-item__pantry{background:#D6E6DA;color:#1E6B4A}
.product-find-btn{background:var(--pillow);box-shadow:var(--raise-xs)}
.confirm-receipt{border-radius:18px}

/* my plans */
.date-strip{padding-top:12px;padding-bottom:18px;margin-top:4px}
.pantry-plans-empty,.pantry-empty{border:0;border-radius:24px;background:#DFE7DE;box-shadow:var(--press-md);color:#4A5F52}
.pantry-empty svg{color:#247D5C}
.pantry-active-card__summary,.pantry-history-row__summary{color:#3B5045}
.pantry-active-card__purchase--done{background:#D6E6DA;box-shadow:var(--press-sm);border-radius:14px}

/* ── tab bar: a raised pill; the active tab is pressed in ── */
@media screen and (max-width:900px){
  body.con-pestanas .tabbar{background:#E6EDE5;border-radius:32px;padding:8px;gap:6px;
    box-shadow:8px 8px 22px rgba(120,142,126,.6),-5px -5px 14px rgba(255,255,255,.9),inset 1px 1px 0 rgba(255,255,255,.7)}
  .tabbar__btn{min-height:62px;color:#3B5045;font-weight:600;background:transparent;border-radius:24px;transition:box-shadow .18s ease,background .18s ease}
  .tabbar__btn svg{color:#4A5F52}
  .tabbar__btn.is-activa{background:#DDE5DC;color:#1B6B4E;box-shadow:var(--press-md)}
  .tabbar__btn.is-activa svg{color:#247D5C}
  .tabbar__cuenta{background:linear-gradient(145deg,#B34A2D,#A03F26);color:#fff;box-shadow:0 0 0 2px #E6EDE5,2px 2px 4px rgba(44,66,52,.3)}
  .next-meal-sticky:not([hidden]){top:calc(10px + env(safe-area-inset-top, 0px))}
}

/* ── welcome + questions: the same material, the sheet raised ── */
.onboarding{background:
    __PLATE__ no-repeat right -442px top -332px / 940px 940px,
    __DISC__ no-repeat left -290px bottom -230px / 640px 640px,
    radial-gradient(80% 42% at 0% 0%, rgba(255,255,255,.85) 0%, rgba(255,255,255,0) 70%),
    linear-gradient(165deg, #ECF1EB 0%, #E4EBE3 48%, #DAE2D9 100%)}
.onboarding__card{border-radius:34px 34px 0 0;background:#E8EEE7;box-shadow:0 -16px 34px -18px rgba(96,120,104,.62),inset 0 1px 0 rgba(255,255,255,.95)}
@media(min-width:640px){.onboarding__card{border-radius:34px;box-shadow:var(--raise-xl)}}
.onboarding__brand-mark{width:40px;height:40px;border-radius:50%;background:__MARK__ center / 40px no-repeat,var(--pillow);box-shadow:var(--raise-xs);transform:none}
.onboarding__brand-mark svg{display:none}
.onboarding__brand-name{color:#22342A}
.onboarding__title{color:#22342A;text-shadow:-1px -1px 0 rgba(255,255,255,.9),1px 1px 2px rgba(44,66,52,.14)}
.onboarding__title-accent{color:#1B6B4E;background:none;padding:0}
.onboarding__summary li{color:#3B5045}
.onboarding__summary li::before{width:12px;height:12px;top:.3em;border-radius:50%;background:var(--led);box-shadow:2px 2px 4px #AFBDB1,-2px -2px 4px #FFFFFF;transform:none}
.onboarding__check input{border:1px solid #6A8070;border-radius:10px;background:#DCE4DB;box-shadow:inset 2px 2px 4px #B5C2B6,inset -2px -2px 4px #FFFFFF}
.onboarding__check input:checked{background:var(--emerald);border-color:#1D6C4F;box-shadow:2px 2px 5px #AFBDB1,-2px -2px 5px #FFFFFF}
.onboarding__check input:checked::after{border-color:#fff}
.onboarding__skip-note{color:#4A5F52}
.onboarding__check .onboarding__link{min-height:40px}
.onboarding__step--single .onboarding__btn--big{margin-top:22px}
.onboarding__progress{height:14px;background:#DCE4DB;box-shadow:inset 2px 2px 4px #B5C2B6,inset -2px -2px 4px #FFFFFF}
.onboarding__progress-bar{background:var(--emerald)}
.onboarding__progress-label{color:#3B5045}
.onboarding__question{color:#22342A}
.onboarding__hint{color:#3B5045}
.onboarding__number,.onboarding__time,.onboarding__text{background:#DCE4DB;border:1px solid #6A8070;border-radius:24px;box-shadow:var(--press-md)}
.onboarding__answer .onboarding__number,.onboarding__answer .onboarding__time{min-height:64px;font-size:var(--fs-fig-l);font-weight:700}
.onboarding__unit{color:#4A5F52}

/* dialogs, tour */
.auth-dialog,.ajustes-dialog{border-radius:32px 32px 0 0;box-shadow:var(--shadow-2)}
@media(min-width:640px){.auth-dialog,.ajustes-dialog{border-radius:32px}}
.auth-dialog::backdrop,.ajustes-dialog::backdrop{background:rgba(34,52,42,.55)}
.ajustes-dialog__head{background:#E8EEE7}
.ajustes-group + .ajustes-group{border-top:1px solid rgba(140,160,145,.5);box-shadow:inset 0 1px 0 rgba(255,255,255,.9)}
.ajustes-group__title,.ajustes-group__hint{color:#3B5045}
.ajustes-action{border:0;border-radius:18px;background:var(--pillow);box-shadow:var(--raise-sm)}
.ajustes-action:active{box-shadow:var(--press-sm)}
.legal-dialog__foot{background:#E8EEE7;border-top:1px solid rgba(140,160,145,.5)}
.auth-dialog__notice-static,.pantry-item{background:#DFE7DE}
.pantry-item__amount{border:0;background:var(--pillow);box-shadow:var(--raise-xs)}
.suggest-list{background:#E8EEE7;box-shadow:var(--shadow-2)}
.suggest-list__item:hover,.suggest-list__item.is-active{background:#DCE4DB}
.tour__hole,.tour__foco{box-shadow:0 0 0 100vmax rgba(30,46,37,.72),0 0 0 3px #6CCBA2}
.tour__card{border-radius:26px;box-shadow:var(--shadow-2)}
.tour__counter{color:#4A5F52}
.tour__body{color:#3B5045}
.traduccion-aviso{background:#E8EEE7;box-shadow:var(--raise-md)}
.site-footer,.footer-note{color:#3B5045}
.disclosure__chevron{color:#247D5C}
"""

CSS = (CSS.replace("__PLATE__", PLATE).replace("__DISC__", DISC).replace("__DIMPLE__", DIMPLE).replace("__RING_LW__", RING_LW).replace("__RING_RW__", RING_RW).replace("__RING_L__", RING_L).replace("__RING_R__", RING_R).replace("__GROOVES_DISPLAY__", GROOVES_DISPLAY)
       .replace("__MARK__", MARK).replace("__CHEVRON__", CHEVRON))

V = dict(
    id="relieve", name="Мягкий рельеф",
    desc="Спокойный «мягкий» интерфейс из одного шалфейно-серого материала: на фоне выдавлены огромные ободки тарелки и мягкие диски, "
         "карточки приподняты как подушки, поля и переключатели вдавлены, а изумрудная кнопка-подушка продавливается при нажатии.",
    sw=["#E4EBE3", "#FFFFFF", "#B7C4B8", "#247D5C", "#E8765A", "#9A8BC4", "#CFA244", "#4BA5A0"],
    fonts=["rubik"], palette=PAL, tokens=TOKENS, css=CSS)
