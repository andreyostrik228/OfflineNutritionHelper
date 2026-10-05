# -*- coding: utf-8 -*-
"""K · Китти — sugary kawaii pink.
Pastel-pink page with white polka dots, sprinkles (hearts, stars, bows), fluffy clouds and a lace-trimmed gingham band;
puffy marshmallow buttons with a white frosting ring and gloss, stitched white cards with a red ribbon bow,
pastel marshmallow macro tiles, a gingham hero banner with cat-ear shapes. (Character-free: no faces, no logos, no names.)
"""
import math
try:                      # production pipeline: scripts/temas/arte.py
    from arte import uri, svg
except ImportError:       # round-2 preview workspace
    from art import uri, svg

INK = "#4A1F33"
RASP = "#C2255C"
RED = "#D81E3A"

PAL = dict(
    canvas="#FFE8F0", surface="#FFFFFF", surface_2="#FFF4F8", line="#FAD6E3", line_strong="#F2A7C3", field_line="#CC5F8A",
    ink=INK, text_2="#6B3550", text_3="#86506A",
    primary=RASP, primary_2="#A81D4E", primary_3="#D6336C", on_ink="#FFFFFF", on_ink_2="#FFE3EE",
    volt="#FFB3CB", volt_hi="#FF8FB5", volt_wash="#FFE3EE", on_volt=INK,
    kcal="#FF7B7B", kcal_deep="#B42D3E", kcal_wash="#FFE5E3",
    protein="#C6A8F2", protein_deep="#6B3FB5", protein_wash="#F1E9FD",
    carbs="#FFD45E", carbs_deep="#835A00", carbs_wash="#FFF3C9",
    fat="#8FD3E8", fat_deep="#1D6C84", fat_wash="#DDF2FA",
    ok="#2C7349", ok_wash="#E1F4E8", warn="#80500A", warn_wash="#FFF0CF",
    danger=RED, danger_deep="#A3122A", danger_wash="#FFE2E7", shadow_rgb="140, 30, 80")

# ───────────────────────── shapes ─────────────────────────
HEART_D = ("M12 21.4C11.5 21.1 2.6 15.7.9 10.1-.6 5.4 2.4.8 7 .8c2.3 0 4 1.3 5 3 1-1.7 2.7-3 5-3 4.6 0 7.6 4.6 6.1 9.3"
           "C21.4 15.7 12.5 21.1 12 21.4z")  # 24 x 22


def star_d(cx, cy, ro, ri, n=5, rot=-90):
    pts = []
    for i in range(2 * n):
        a = math.radians(rot + i * 180 / n)
        r = ro if i % 2 == 0 else ri
        pts.append(f"{cx + r * math.cos(a):.1f} {cy + r * math.sin(a):.1f}")
    return "M" + "L".join(pts) + "z"


STAR_D = star_d(12, 12.8, 10, 4.6)                     # 24 box, puffy when stroked with round joins
SPARK_D = "M12 1C12.8 8 16 11.2 23 12 16 12.8 12.8 16 12 23 11.2 16 8 12.8 1 12 8 11.2 11.2 8 12 1z"

# ribbon bow, 64 x 46 box: two puffy loops, a round knot, two short notched tails
BOW_L = "M30 19C25 11 15 3.5 8 4.5 1.5 5.5.5 13.5 1.2 21.5 2 30 4.5 37.5 11 37.5 17 37.5 25 30.5 30 26z"
BOW_R = "M34 19C39 11 49 3.5 56 4.5c6.5 1 7.5 9 6.8 17-.8 8.5-3.3 16-9.8 16-6 0-14-7-19-11.5z"
BOW_TL = "M29 26 21.5 42.5l5-1.2 3 3.7L33.5 28z"
BOW_TR = "M35 26l7.5 16.5-5-1.2-3 3.7L30.5 28z"
BOW_K = "M32 14.5c4.6 0 6.8 3 6.8 7.5S36.6 29.5 32 29.5 25.2 26.5 25.2 22 27.4 14.5 32 14.5z"
BOW_FL = "M29 20.5C23 16.5 14.5 14 9 15.5c4 3.4 11.5 6.8 20 7.8z"      # inner folds (shade)
BOW_FR = "M35 20.5c6-4 14.5-6.5 20-5-4 3.4-11.5 6.8-20 7.8z"


def bow_svg(main=RED, dark="#A8102B", knot="#EC3B55", outline="#FFFFFF", ow=4.5):
    sil = [BOW_TL, BOW_TR, BOW_L, BOW_R, BOW_K]
    o = "".join(f"<path d='{d}'/>" for d in sil)
    return svg(64, 46,
               (f"<g fill='{outline}' stroke='{outline}' stroke-width='{ow}' stroke-linejoin='round'>{o}</g>" if outline else "") +
               f"<g fill='{dark}'><path d='{BOW_TL}'/><path d='{BOW_TR}'/></g>"
               f"<g fill='{main}'><path d='{BOW_L}'/><path d='{BOW_R}'/></g>"
               f"<g fill='{dark}' opacity='.5'><path d='{BOW_FL}'/><path d='{BOW_FR}'/></g>"
               f"<path d='{BOW_K}' fill='{knot}' stroke='{dark}' stroke-width='1.3'/>"
               "<g fill='#fff' opacity='.55'><ellipse cx='10.5' cy='10.5' rx='4.4' ry='2.3' transform='rotate(-30 10.5 10.5)'/>"
               "<ellipse cx='53.5' cy='10.5' rx='4.4' ry='2.3' transform='rotate(30 53.5 10.5)'/><circle cx='30' cy='18.6' r='1.6'/></g>",
               "overflow='visible'")


def cloud_svg():
    g = ("<circle cx='84' cy='40' r='30'/><circle cx='50' cy='54' r='22'/><circle cx='118' cy='50' r='23'/>"
         "<circle cx='146' cy='64' r='15'/><circle cx='26' cy='66' r='14'/><rect x='22' y='56' width='136' height='24' rx='12'/>")
    return svg(170, 92, f"<g fill='#F8C2D6' transform='translate(0 6)'>{g}</g><g fill='#fff'>{g}</g>"
                        "<path d='M66 30c5-9 15-13 25-11' fill='none' stroke='#FFE6EF' stroke-width='4' stroke-linecap='round'/>")


def ear_svg(right=False):
    # rounded-triangle cat ear: broad base (it hides behind the banner), straight sides, soft tip, a lighter inner ear
    outer = "M2 46 18.6 10.5Q25 -1 31.4 10.5L48 46z"
    inner = "M15 46 22.8 27Q25 22.5 27.2 27L35 46z"
    g = (f"<path d='{outer}' fill='#F7699C' stroke='#fff' stroke-width='3.6' stroke-linejoin='round'/>"
         f"<path d='{inner}' fill='#FFC4D8'/>")
    rot = 11 if right else -11
    return svg(50, 46, f"<g transform='rotate({rot} 25 42)'>{g}</g>", "overflow='visible'")


def ornament_tile(S=304):
    """sprinkles that sit in the gaps of a 76px diagonal polka-dot lattice"""
    bow = f"<g id='b'><path d='{BOW_L}'/><path d='{BOW_R}'/><path d='{BOW_K}'/><path d='{BOW_TL}'/><path d='{BOW_TR}'/></g>"
    defs = (f"<defs><path id='h' d='{HEART_D}'/><path id='s' d='{STAR_D}' stroke-width='3' stroke-linejoin='round'/>"
            f"<path id='p' d='{SPARK_D}'/>{bow}</defs>")
    W, PI, Y, SK, BW = "#FFFFFF", "#F59DBE", "#FFD66B", "#9FD3EF", "#EF6A86"
    items = [  # kind, x, y, size(px), rot, colour, opacity
        ("h", 38, 76, 24, -14, W, 1), ("b", 190, 76, 34, 10, BW, .55), ("s", 114, 152, 20, 8, Y, 1),
        ("p", 266, 152, 18, 0, SK, 1), ("h", 76, 38, 18, 12, PI, .9), ("s", 228, 38, 17, -10, W, 1),
        ("h", 152, 114, 16, -8, W, .95), ("b", 76, 266, 30, -12, BW, .5), ("p", 228, 190, 16, 0, Y, 1),
        ("h", 190, 228, 20, 14, PI, .85), ("s", 38, 228, 17, 16, SK, .95), ("p", 152, 38, 13, 0, W, 1),
        ("h", 266, 228, 15, -18, W, .95), ("p", 38, 152, 13, 0, PI, .9),
    ]
    out = []
    for k, x, y, size, rot, col, op in items:
        bw, bh = (64, 46) if k == "b" else (24, 22 if k == "h" else 24)
        sc = size / bw
        extra = f" stroke='{col}'" if k == "s" else ""
        out.append(f"<use href='#{k}' transform='translate({x} {y}) rotate({rot}) scale({sc:.3f}) translate({-bw/2:g} {-bh/2:g})'"
                   f" fill='{col}' opacity='{op}'{extra}/>")
    return svg(S, S, defs + "".join(out))


def ring_shadow(r=2.4, color=RASP, drop=3.5, dcol="#8E1543", steps=12):
    """candy lettering: a raspberry outline ring + a deep berry drop"""
    out = [f"{r*math.cos(2*math.pi*i/steps):.2f}px {r*math.sin(2*math.pi*i/steps):.2f}px 0 {color}" for i in range(steps)]
    out += [f"{dx}px {drop + r:.1f}px 0 {dcol}" for dx in (-1.5, 0, 1.5)]
    return ",".join(out)


HEART = uri(svg(24, 22, f"<path d='{HEART_D}' fill='#fff'/>"))
HEART_BADGE = uri(svg(30, 28, f"<path d='{HEART_D}' transform='translate(3 3)' fill='{RED}' stroke='#fff' stroke-width='2.6' stroke-linejoin='round'/>"))
BOW = uri(bow_svg())
CLOUD = uri(cloud_svg())
EAR_L = uri(ear_svg())
EAR_R = uri(ear_svg(True))
ORN = uri(ornament_tile())
CHEV = uri(svg(24, 24, f"<path d='M6.5 9.5l5.5 5.5 5.5-5.5' fill='none' stroke='{RASP}' stroke-width='2.8' stroke-linecap='round' stroke-linejoin='round'/>"))

TOKENS = (
    '--font-display:"M PLUS Rounded 1c","Nunito",system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;'
    '--font-body:"Nunito",system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;'
    "--r-sm:14px;--r-md:20px;--r-lg:26px;--r-xl:32px;--r-ctl:999px;"
    "--shadow-1:0 0 0 2px #FCDDE8,0 5px 0 #F9CADB,0 16px 28px -18px rgba(194,37,92,.5);--shadow-2:0 26px 60px -20px rgba(140,30,80,.5);"
    "--fw-display:700;--fw-fig:700;--fw-btn:700;--fw-label:800;--fw-hero:700;"
    "--lh-display:1.18;--hero-k:6.4;--hero-max:70px;"
    # art: every data-URI lives in ONE custom property and is reused by name
    "--k-bow:__BOW__;--k-heart:__HEART__;--k-heart-badge:__HEARTB__;--k-cloud:__CLOUD__;--k-orn:__ORN__;--k-ear-l:__EARL__;--k-ear-r:__EARR__;"
    "--k-dot:radial-gradient(circle,rgba(255,255,255,.75) 0 8.5px,transparent 9px);"
    "--k-ring:0 0 0 3px #fff,0 0 0 5px #F5AFC8;"
    "--k-rasp:linear-gradient(180deg,#D6336C 0%,#B81F55 100%);"
    "--k-gloss:linear-gradient(180deg,rgba(255,255,255,.55),rgba(255,255,255,.06));"
    "--k-candy:repeating-linear-gradient(-45deg,#E5508A 0 7px,#FF9EC0 7px 14px);"
    "--k-stitch:2px dashed #F7BCD0;"
)

CSS = r"""
/* ═════════ K · Китти ═════════ */
html{background:#FFE8F0}
body{background:transparent;font-weight:500}
/* polka dots + sprinkles + clouds (fixed) */
body::before{content:"";position:fixed;inset:0;z-index:-1;pointer-events:none;
  background:var(--k-cloud) no-repeat right -34px top 150px/180px auto,var(--k-cloud) no-repeat left -58px top 50%/210px auto,
    var(--k-cloud) no-repeat right -26px bottom 146px/140px auto,
    var(--k-orn) 0 0/304px 304px,var(--k-dot) 0 0/76px 76px,var(--k-dot) 38px 38px/76px 76px,
    radial-gradient(130% 55% at 50% 0%,#FFF5F9 0%,rgba(255,245,249,0) 70%),#FFE8F0}
/* a gingham tablecloth band with an eyelet-lace edge along the bottom */
body::after{content:"";position:fixed;left:0;right:0;bottom:0;height:112px;z-index:-1;pointer-events:none;
  background:radial-gradient(circle at 10px 12px,#FFC2D6 0 2.3px,transparent 2.8px) 0 0/20px 24px repeat-x,
    radial-gradient(circle at 10px 12px,#fff 0 9.5px,transparent 10px) 0 0/20px 24px repeat-x,
    repeating-linear-gradient(90deg,rgba(240,98,150,.2) 0 12px,transparent 12px 24px) 0 18px/100% 100% no-repeat,
    repeating-linear-gradient(0deg,rgba(240,98,150,.2) 0 12px,transparent 12px 24px) 0 18px/100% 100% no-repeat,
    linear-gradient(#fff,#fff) 0 12px/100% 100% no-repeat}
::selection{background:#FFB3CB;color:#4A1F33}
:focus-visible{outline:3px solid #C2255C;outline-offset:2px;box-shadow:0 0 0 6px rgba(255,143,181,.5)}

/* ── top bar ── */
.topbar__menu-btn{width:46px;height:46px;border-radius:50%}
.topbar__brand{color:#8E1543}
.topbar__brand-mark,.onboarding__brand-mark{width:36px;height:36px;border-radius:50%;background:var(--k-rasp);box-shadow:var(--k-ring)}
.topbar__brand-mark svg,.onboarding__brand-mark svg{display:none}
.topbar__brand-mark::before,.onboarding__brand-mark::before{content:"";width:18px;height:16px;margin-top:2px;background:var(--k-heart) center/contain no-repeat}
@@PROFILE@@{height:46px;padding:0 14px 0 6px;background:#fff;border-radius:999px;color:#4A1F33;font-weight:800;box-shadow:0 0 0 2px #F9C6D8,0 4px 0 #F9C6D8}
.topbar__profile-avatar{background:#FFE3EE;color:#C2255C}
.topbar__menu{border-radius:22px;box-shadow:var(--shadow-2),0 0 0 2px #F9C6D8}

/* ── hero: gingham ribbon banner, two ears peek over it, a bow ties one end ── */
.hero{position:relative;overflow:visible;margin-top:36px;border-radius:0;background:none;color:#fff;
  --nm:clamp(34px,calc((100cqw - 24px) / var(--hero-k)),var(--hero-max))}
.hero::before{content:"";position:absolute;z-index:0;left:0;right:0;top:-28px;height:48px;margin:0;
  background:var(--k-ear-l) calc(50% - var(--nm) * 1.72) 0/50px 46px no-repeat,var(--k-ear-r) calc(50% + var(--nm) * 1.72) 0/50px 46px no-repeat}
.hero::after{content:"";position:absolute;z-index:2;left:-10px;top:-24px;width:clamp(48px,17cqw,68px);aspect-ratio:64/46;height:auto;margin:0;background:var(--k-bow) center/contain no-repeat;transform:rotate(-16deg)}
.hero__texto{position:relative;z-index:1;padding:10px 12px;border-radius:28px;
  background:var(--k-heart) no-repeat right 18px top 12px/15px 14px,var(--k-heart) no-repeat right 36px bottom 11px/10px 9px,var(--k-heart) no-repeat left 22px bottom 10px/12px 11px,
    repeating-linear-gradient(90deg,rgba(240,98,150,.22) 0 11px,transparent 11px 22px),repeating-linear-gradient(0deg,rgba(240,98,150,.22) 0 11px,transparent 11px 22px),#FFEAF2;
  box-shadow:var(--k-ring),0 16px 26px -14px rgba(194,37,92,.55)}
.hero__nombre{color:#fff;text-shadow:__HERO_SH__}

/* ── titles ── */
h2{color:#4A1F33}
h2 em,.onboarding__title-accent{color:#C2255C;background:none;padding:0;margin:0;text-decoration:underline wavy #FF8FB5;text-decoration-thickness:2.5px;text-underline-offset:.3em}
.eyebrow{color:#6B3550}
/* section heads: when the badge does not fit beside the title it drops below it (no word split in half) */
.output-top,.shopping-panel__head,.nocook-panel__head,.verified-panel__head{flex-wrap:wrap;row-gap:10px}
.output-top>div:first-child,.shopping-panel__head>div:first-child,.nocook-panel__head>div:first-child,.verified-panel__head>div:first-child{flex:1 1 210px}
@@SECTION_LABEL@@{color:#A81D4E;gap:8px}
.form-section-label::before,.budget-group-label::before,.onboarding__summary li::before,.insights li::before{content:"";flex:none;width:15px;height:14px;background:#FF5E95;mask:var(--k-heart) center/contain no-repeat;box-shadow:none;transform:none;border-radius:0}
.badge{height:32px;padding:0 13px;background:#fff;color:#A81D4E;border-radius:999px;box-shadow:0 0 0 2px #F9C6D8}
.badge svg{color:#E5508A}

/* ── cards: white, very round, a dashed "stitch" inside, a red bow on the main ones ── */
@@PANEL@@{position:relative;background:#fff;border-radius:32px;box-shadow:0 0 0 2px #FCDDE8,0 6px 0 #F9CADB,0 22px 40px -22px rgba(194,37,92,.55);outline:var(--k-stitch);outline-offset:-9px}
@@PANEL@@::after,.shopping-summary__stat:nth-child(2)::after,.onboarding__card::after{content:"";position:absolute;z-index:3;top:-17px;right:18px;width:60px;height:43px;background:var(--k-bow) center/contain no-repeat;transform:rotate(12deg);pointer-events:none}
@@CARD@@{border-radius:26px;background:#fff;box-shadow:var(--shadow-1)}
.meal-card,.insights,.disclosure{outline:var(--k-stitch);outline-offset:-8px}
.resumen-datos{border-radius:999px;padding:8px 8px 8px 20px}
.resumen-datos__texto{color:#6B3550}
@@WELL@@{border-radius:18px;background:#FFF4F8}
.meta{border:2px dashed #F7C3D5}
.meta .k{color:#86506A}
/* phones: the three facts become rows, so a long word ("Зависимости") is never split */
@media(max-width:600px){.meta-boxes{grid-template-columns:minmax(0,1fr);gap:6px}.meta{display:flex;align-items:baseline;justify-content:space-between;gap:10px;padding:8px 14px}.meta .v{margin-top:0}}

/* ── buttons: puffy marshmallows with a frosting ring and a gloss ── */
@@BTN_P@@,@@BTN_CTA@@{position:relative;isolation:isolate;display:inline-flex;align-items:center;justify-content:center;gap:9px;border:0;border-radius:999px;color:#fff;
  background:var(--k-rasp);box-shadow:var(--k-ring),0 12px 20px -8px rgba(194,37,92,.6);text-shadow:0 1px 1px rgba(110,10,48,.35);
  font-family:var(--font-body);font-weight:800;transition:transform .12s ease,box-shadow .12s ease}
@@BTN_P@@::after,@@BTN_CTA@@::after{content:"";position:absolute;z-index:-1;left:12%;right:12%;top:3px;height:44%;border-radius:999px;background:var(--k-gloss);pointer-events:none}
@@BTN_P@@:not(:has(svg))::before,@@BTN_CTA@@:not(:has(svg))::before{content:"";flex:none;width:16px;height:15px;background:#fff;mask:var(--k-heart) center/contain no-repeat}
@@BTN_P@@ svg,@@BTN_CTA@@ svg{color:#fff}
@@BTN_P@@:hover,@@BTN_CTA@@:hover{background:linear-gradient(180deg,#DD3D76 0%,#BF2259 100%);border-color:transparent}
@@BTN_P@@:active,@@BTN_CTA@@:active{transform:scale(.97);box-shadow:0 0 0 3px #fff,0 0 0 4.5px #F5AFC8,0 4px 8px -4px rgba(194,37,92,.6)}
@@BTN_P@@:disabled,@@BTN_CTA@@:disabled{background:#F8D9E4;color:#8F5D74;text-shadow:none;box-shadow:0 0 0 3px #fff,0 0 0 5px #F6D3E0;transform:none}
@@BTN_P@@:disabled::before{background:#D69AB2}
@@BTN_P@@:disabled::after{opacity:.35}
@@BTN_S@@{position:relative;border:2px solid #F4A9C4;border-radius:999px;background:#fff;color:#A81D4E;box-shadow:0 4px 0 #F9CADB,0 12px 18px -12px rgba(194,37,92,.45);
  font-family:var(--font-body);font-weight:800;transition:transform .12s ease,box-shadow .12s ease}
@@BTN_S@@:hover{background:#FFF4F8;border-color:#EE86AC}
@@BTN_S@@:active{transform:translateY(3px) scale(.98);box-shadow:0 1px 0 #F9CADB}
@@BTN_S@@:disabled{background:#FFF7FA;color:#9C6A82;border-style:dashed;box-shadow:none;transform:none}
@@BTN_S@@ svg{color:#E5508A}
@media(max-width:359px){.actions-secondary,.shopping-panel__actions{grid-template-columns:minmax(0,1fr)}}
.actions-secondary #resetBtn{border:0;background:none;box-shadow:none;color:#6B3550;text-decoration:underline;text-decoration-color:#FF8FB5;text-decoration-thickness:2px;text-underline-offset:5px}
@@BTN_SM@@{border:0;border-radius:999px;background:#FFE3EE;color:#8E1543;box-shadow:inset 0 0 0 1.5px #F7BCD0,0 3px 0 #F7BCD0;font-family:var(--font-body);font-weight:800;transition:transform .1s ease}
@@BTN_SM@@:hover{background:#FFD6E5;color:#8E1543}
@@BTN_SM@@:active{transform:translateY(2px);box-shadow:inset 0 0 0 1.5px #F7BCD0,0 1px 0 #F7BCD0}
.pantry-active-card__delete{background:#fff;color:#A3122A;box-shadow:inset 0 0 0 1.5px #F4B0C0,0 3px 0 #F4B0C0}
.pantry-active-card__delete--armed{background:#D81E3A;color:#fff}
@@BTN_DANGER@@{border-radius:999px;background:linear-gradient(180deg,#E0344F,#C0182F);box-shadow:var(--k-ring),0 10px 18px -8px rgba(192,24,47,.55)}
.pantry-active-card__buy-btn--secondary,.pantry-active-card__buy-btn--secondary:hover{background:#fff;color:#A81D4E;text-shadow:none;box-shadow:0 0 0 2px #F4A9C4,0 4px 0 #F9CADB}
.pantry-active-card__buy-btn--secondary svg{color:#E5508A}
.pantry-active-card__buy-btn--secondary::after{content:none}
@@BTN_ICON@@{border:0;background:#fff;color:#C2255C;box-shadow:0 0 0 2px #F9C6D8,0 4px 0 #F9C6D8}
.link-btn,.pantry-link-btn,.auth-dialog__switch-btn,.onboarding__link,.site-footer__link,.onboarding__skip,.onboarding__skip-questions,.tour__skip{text-decoration-color:#FF8FB5}

/* ── chips & tiles: white with a pink edge; picked = bubblegum + a little bow ── */
@@CHIP@@{position:relative;background:#fff;border:2px solid #F6BCD1;border-radius:22px;color:#4A1F33;box-shadow:0 4px 0 #FBD7E4;transition:transform .1s ease,background-color .15s ease}
@@CHIP@@:hover{border-color:#EE86AC}
@@CHIP@@:active{transform:translateY(2px)}
@@CHIP_ON@@,@@CHIP_ON@@:hover{background:linear-gradient(180deg,#FFBCD2 0%,#FF97BA 100%);border-color:#E5508A;color:#4A1F33;box-shadow:0 4px 0 #E0538A,inset 0 2px 0 rgba(255,255,255,.55)}
@@CHIP_ON@@::after{
  content:"";position:absolute;z-index:2;top:-12px;right:-10px;width:34px;height:24px;background:var(--k-bow) center/contain no-repeat;mask:none;transform:rotate(14deg);box-shadow:none;border-radius:0}
.budget-chip{padding:12px 12px 12px 14px}
/* phones under 390px: one budget card per row, its name and price side by side (no word broken in half) */
@media(max-width:389px){.budget-modes{grid-template-columns:minmax(0,1fr);gap:10px}.budget-chip{min-height:58px;flex-direction:row;align-items:center;justify-content:space-between;gap:12px;padding:10px 16px}.budget-chip__amount{white-space:nowrap}}
@media(max-width:359px){.budget-chip{flex-direction:column;align-items:flex-start;justify-content:center;gap:6px}}
.budget-chip__title{color:#6B3550}
.budget-chip__amount{color:#A81D4E}
.visually-hidden:checked + .budget-chip .budget-chip__title,.visually-hidden:checked + .budget-chip .budget-chip__amount,
.onboarding__choice.is-selected .onboarding__choice-amount,.onboarding__choice.is-selected .onboarding__choice-note{color:#4A1F33}
.onboarding__choice-note{color:#6B3550}
.date-chip--today::after{width:11px;height:10px;border-radius:0;background:#D81E3A;mask:var(--k-heart) center/contain no-repeat;box-shadow:none}
@@SEG@@{background:repeating-linear-gradient(-45deg,#FFDCE8 0 8px,#FFF0F5 8px 16px);border:2px solid #F6BCD1;border-radius:999px;padding:5px;gap:4px;box-shadow:inset 0 2px 5px rgba(194,37,92,.12)}
@@SEG_BTN@@{border-radius:999px;color:#6B3550;background:transparent}
@@SEG_BTN@@:hover{background:rgba(255,255,255,.6)}
@@SEG_ON@@,@@SEG_ON@@:hover{background:#fff;color:#A81D4E;box-shadow:0 0 0 2px #F4A9C4,0 4px 0 #F4A9C4,0 10px 14px -8px rgba(194,37,92,.5)}
@@SEG_ON@@::before{content:"";display:inline-block;width:13px;height:12px;margin-right:6px;vertical-align:-1px;background:#FF5E95;mask:var(--k-heart) center/contain no-repeat}
@@STEP@@{background:#fff;border:2px solid var(--field-line);border-radius:999px;padding:4px;gap:2px;box-shadow:0 3px 0 #FBD7E4}
@@STEP@@:focus-within{border-color:#C2255C;background:#fff;box-shadow:0 0 0 4px rgba(255,143,181,.4)}
.paso-a-paso input[type="number"]{border:0;background:transparent;box-shadow:none;color:#4A1F33}
@@STEP_BTN@@{border-radius:50%;background:radial-gradient(circle at 35% 28%,#fff 0 30%,#FFEFF5 70%);color:#C2255C;box-shadow:inset 0 0 0 2px #F6BCD1,0 3px 0 #F6BCD1;transition:transform .1s ease}
@@STEP_PLUS@@{background:radial-gradient(circle at 34% 28%,#F27AA5 0 16%,#D6336C 55%,#B81F55 100%);color:#fff;box-shadow:inset 0 -2px 0 rgba(110,10,48,.25),0 3px 0 #9E1B4B}
@@STEP_BTN@@:active{transform:scale(.92)}
@@FIELD@@{background-color:#fff;border:2px solid var(--field-line);border-radius:18px;color:#4A1F33;font-weight:600}
@@FIELD@@:focus{border-color:#C2255C;background-color:#fff;box-shadow:0 0 0 4px rgba(255,143,181,.4)}
select{background-image:__CHEV__;background-size:22px 22px;background-position:right 14px center;padding-right:46px}
.field>label,.budget-custom-field>label{color:#6B3550;margin-bottom:12px}
.budget-group-label{margin-bottom:14px}
.field-hint{color:#86506A}

/* ── scoreboard: a pink marshmallow with a heart, three pastel ones ── */
.nutrition-strip{background:none;box-shadow:none;padding:0;gap:12px 10px;overflow:visible;border-radius:0;color:#4A1F33}
.summary-card{border:0!important;border-radius:26px;padding:14px 12px 16px;color:#4A1F33}
.summary-card--calories{isolation:isolate;overflow:hidden;padding:16px 18px 18px;background:linear-gradient(135deg,#FFDCE7 0%,#FFAAC7 100%);box-shadow:inset 0 3px 0 rgba(255,255,255,.65),0 5px 0 #F28AB0,0 18px 30px -16px rgba(194,37,92,.6)}
.summary-card--calories::after{content:"";position:absolute;z-index:-1;right:-22px;top:-12px;width:150px;height:138px;background:rgba(255,255,255,.5);mask:var(--k-heart) center/contain no-repeat;transform:rotate(14deg)}
.summary-card--protein{background:#F1E9FD;box-shadow:inset 0 3px 0 rgba(255,255,255,.7),0 5px 0 #D8C6F5}
.summary-card--carbs{background:#FFF3C9;box-shadow:inset 0 3px 0 rgba(255,255,255,.7),0 5px 0 #F4DC8C}
.summary-card--fat{background:#DDF2FA;box-shadow:inset 0 3px 0 rgba(255,255,255,.7),0 5px 0 #AEDDF0}
.summary-card h3{color:#6B3550}
.summary-card .sub{color:#4A1F33}
.summary-card--calories .big{color:#8E1543}
.summary-card--protein .big{color:var(--protein-deep)}.summary-card--carbs .big{color:var(--carbs-deep)}.summary-card--fat .big{color:var(--fat-deep)}
.icon-badge{width:28px;height:28px;border-radius:50%;background:#fff}
.summary-card--calories .icon-badge{background:#fff;color:#C2255C}.summary-card--protein .icon-badge{background:#fff;color:var(--protein-deep)}
.summary-card--carbs .icon-badge{background:#fff;color:var(--carbs-deep)}.summary-card--fat .icon-badge{background:#fff;color:var(--fat-deep)}
@container (min-width:620px){.nutrition-strip{grid-template-columns:1.4fr repeat(3,minmax(0,1fr))}.summary-card--calories{grid-column:auto}}
.u{font-weight:700}

/* ── timeline, day head, meal cards ── */
.schedule-timeline__item{border:2px solid #F9CADB;border-radius:22px;background:#fff;box-shadow:0 4px 0 #FBD7E4}
.schedule-timeline__item:hover{border-color:#EE86AC}
.schedule-timeline__item--next{background:linear-gradient(180deg,#FFE6EF,#FFD3E2);border-color:#EE86AC;box-shadow:0 4px 0 #F4A9C4}
.schedule-timeline__next-tag,.next-meal-sticky__eyebrow{background:#D81E3A;color:#fff;border-radius:999px}
.schedule-timeline__time{color:#4A1F33}
.schedule-timeline__label{color:#6B3550}
.schedule-timeline__item--next .schedule-timeline__label{color:#4A1F33}
.day-slide__head::after{height:8px;border-radius:0;background:radial-gradient(circle,#F7A8C4 0 3px,transparent 3.5px) 0 50%/13px 8px repeat-x}
.day-slide__of,.days-carousel__hint{color:#6B3550}
.days-carousel__dot::before{background:#F4A9C4}
.days-carousel__dot.is-active::before{background:#C2255C}
.days-carousel__arrow{background:var(--k-rasp);color:#fff;box-shadow:var(--k-ring),0 10px 18px -8px rgba(194,37,92,.6)}
.meal-card{border-radius:28px}
.meal-time-badge{height:36px;padding:0 12px;border-radius:999px;background:var(--k-rasp);color:#fff;box-shadow:0 0 0 2px #fff,0 0 0 3.5px #F5AFC8}
.meal-items,.meal-steps{border-top:2px dotted #F6BCD1}
.food-row{border-bottom:2px dotted #FAD3E1}
.food-qty__grams,.food-cost__tag{color:#86506A}
.food-macro__badge,.food-purchase__badge{background:#FFE3EE;color:#8E1543}
.food-purchase{background:#FFF5F8;border:2px dashed #F7C3D5;border-radius:16px;box-shadow:none}
.meal-footer{background:#FFF4F8;border-top:2px dotted #F6BCD1}
.meal-footer>div{color:#6B3550}
.meal-footer>div::before{height:8px;border-radius:4px;background:#FFC2D6}
.meal-footer>div:nth-child(1)::before{background:#C6A8F2}
.meal-footer>div:nth-child(2)::before{background:#FFD45E}
.meal-footer>div:nth-child(3)::before{background:#8FD3E8}
.meal-footer>div:nth-child(4)::before{background:#FF8FB5}
.meal-steps__toggle{color:#A81D4E}
.meal-steps__toggle::after{border-color:#C2255C}
.meal-steps__list li::before{border-radius:50%;background:var(--k-rasp);color:#fff}
.meal-make-ahead,.meal-cook-note{border-radius:16px;box-shadow:none;border:2px dashed #F2CC7A}
.meal-card--empty{border:2px dashed #F4A9C4;background:rgba(255,255,255,.75);box-shadow:none;outline:0}
.empty-icon{border-radius:50%;background:var(--k-rasp);color:#fff;box-shadow:var(--k-ring)}

/* ── next meal: a stitched satin ribbon with notched ends ── */
@media screen and (max-width:900px){
  .next-meal-sticky__btn{position:relative;border:0;border-radius:16px;padding:8px 16px;color:#4A1F33;
    background:repeating-linear-gradient(90deg,#fff 0 6px,transparent 6px 11px) 50% 5px/calc(100% - 30px) 2px no-repeat,
      repeating-linear-gradient(90deg,#fff 0 6px,transparent 6px 11px) 50% calc(100% - 5px)/calc(100% - 30px) 2px no-repeat,
      linear-gradient(180deg,#FFBCD2 0%,#FF9ABC 100%);
    box-shadow:0 0 0 2px #fff,0 10px 16px -8px rgba(194,37,92,.5)}
  .next-meal-sticky__btn::before,.next-meal-sticky__btn::after{content:"";position:absolute;z-index:-1;top:13px;bottom:-9px;width:30px;background:linear-gradient(90deg,#E04C86,#F57FAA 70%)}
  .next-meal-sticky__btn::before{left:-13px;clip-path:polygon(0 0,100% 0,100% 100%,0 100%,9px 50%)}
  .next-meal-sticky__btn::after{right:-13px;transform:scaleX(-1);clip-path:polygon(0 0,100% 0,100% 100%,0 100%,9px 50%)}
}

/* ── shopping ── */
.shopping-summary__stat{border-radius:24px;gap:8px}
@media(max-width:359px){.shopping-summary__stat:not(:nth-child(2)){flex:1 1 40%}}
@media(min-width:600px) and (max-width:900px){.shopping-summary__stat:nth-child(2)::after{top:-21px;right:-11px;width:46px;height:33px}}
.shopping-summary__stat span{color:#6B3550}
.shopping-summary__stat:nth-child(2){position:relative;isolation:isolate;padding:16px 18px 18px;background:linear-gradient(135deg,#D6336C 0%,#B81F55 100%);box-shadow:var(--k-ring),0 16px 28px -14px rgba(194,37,92,.65)}
.shopping-summary__stat:nth-child(2)::before{content:"";position:absolute;z-index:-1;left:22px;right:22px;top:4px;height:8px;border-radius:999px;background:rgba(255,255,255,.3)}
.shopping-summary__stat:nth-child(2) span,.shopping-summary__stat:nth-child(2) strong{color:#fff}
.shopping-summary__stat:nth-child(2) strong{text-shadow:0 2px 0 rgba(110,10,48,.35)}
.shopping-progress__texto,.shopping-share-note{color:#6B3550}
.shopping-progress__barra{height:20px;padding:3px;background:#fff;box-shadow:inset 0 0 0 2px #F6BCD1}
.shopping-progress__barra>span,.onboarding__progress-bar{background:var(--k-candy);border-radius:999px}
.shopping-item__check::before,.pantry-purchase-row__check::before{border:2.5px solid #E5508A;background:#fff}
.shopping-item__check[aria-checked="true"]::before,.pantry-purchase-row__check[aria-checked="true"]::before{background:#C2255C;border-color:#C2255C}
.shopping-item__check[aria-checked="true"]::after,.pantry-purchase-row__check[aria-checked="true"]::after{border-color:#fff}
.shopping-item__meta,.shopping-item__usage-price{color:#86506A}
.shopping-item.is-comprado{background:#FFF4F8;box-shadow:0 0 0 2px #FCDDE8}
.product-find-btn{background:#FFE3EE;box-shadow:none}
.confirm-receipt{background:#FFF4F8;border:2px dashed #F4A9C4;box-shadow:none}

/* ── no-cook, my plans ── */
.nocook-summary__warn{border-radius:14px;box-shadow:none}
.nocook-slot__kind{background:#FFE3EE;color:#8E1543}
.nocook-disclaimer{color:#6B3550}
.date-strip{margin-top:4px;padding-top:16px}
.pantry-plans-empty{border:2px dashed #F4A9C4;border-radius:26px;background:rgba(255,255,255,.8);color:#6B3550}
.pantry-meal-chip__time{color:#B42D3E}
.pantry-meal-chip--cooked .pantry-meal-chip__time{color:#4A1F33}

/* ── tab bar: a white floating dock, the active tab is a raspberry bubble with a bow ── */
@media screen and (max-width:900px){
  body.con-pestanas .tabbar{background:#fff;border-radius:30px;padding:7px;gap:4px;box-shadow:0 0 0 2px #FBD0DE,0 6px 0 #F9CADB,0 18px 34px -10px rgba(194,37,92,.5)}
  .tabbar__btn{min-height:60px;color:#86506A;font-weight:800;border-radius:24px;background:transparent}
  .tabbar__btn.is-activa{background:var(--k-rasp);color:#fff;box-shadow:0 0 0 2px #fff,0 6px 14px -4px rgba(194,37,92,.6)}
  .tabbar__btn.is-activa::before{content:"";position:absolute;top:-12px;left:50%;width:30px;height:22px;margin-left:-15px;background:var(--k-bow) center/contain no-repeat}
  .tabbar__cuenta{top:1px;left:calc(50% + 5px);min-width:0;width:29px;height:27px;padding:0 0 3px;border-radius:0;background:var(--k-heart-badge) center/100% 100% no-repeat;color:#fff;box-shadow:none;line-height:25px}
  .tabbar__btn.is-activa .tabbar__cuenta{left:calc(50% + 13px);top:3px}
}

/* ── welcome + questions ── */
.onboarding{background:var(--k-cloud) no-repeat right -50px top 36px/220px auto,var(--k-cloud) no-repeat left -70px top 30%/240px auto,
  var(--k-orn) 0 0/304px 304px,var(--k-dot) 0 0/76px 76px,var(--k-dot) 38px 38px/76px 76px,linear-gradient(180deg,#FFD9E7 0%,#FFE8F0 60%)}
.onboarding{padding-top:30px}
.onboarding__link{min-height:40px}
.onboarding__card{position:relative;width:calc(100% - 24px);margin:auto auto 12px;border-radius:34px;outline:var(--k-stitch);outline-offset:-10px;box-shadow:0 8px 0 #F9CADB,0 24px 50px -20px rgba(194,37,92,.55)}
@media(min-width:640px){.onboarding__card{width:min(520px,calc(100% - 40px));margin:auto}}
.onboarding__card::after{top:-24px;right:auto;left:50%;width:74px;height:53px;margin-left:-37px;transform:none}
.onboarding__brand-name{color:#8E1543}
.onboarding__title{color:#4A1F33}
.onboarding__summary li{color:#6B3550}
.onboarding__summary li::before{top:.2em;left:0}
.onboarding__check input{border:2.5px solid #E5508A;border-radius:10px;background:#fff}
.onboarding__check input:checked{background:#C2255C;border-color:#C2255C}
.onboarding__check input:checked::after{border-color:#fff}
.onboarding__progress{height:16px;background:#fff;box-shadow:inset 0 0 0 2px #F6BCD1}
.onboarding__progress-label{color:#A81D4E}
.onboarding__hint,.onboarding__skip-note{color:#6B3550}
.onboarding__number,.onboarding__time,.onboarding__text{background-color:#fff;border:2px solid var(--field-line);border-radius:24px}
.onboarding__number:focus,.onboarding__time:focus,.onboarding__text:focus{border-color:#C2255C;box-shadow:0 0 0 4px rgba(255,143,181,.4)}
.onboarding__unit{color:#86506A}

/* ── tour + dialogs ── */
.tour__hole,.tour__foco{box-shadow:0 0 0 100vmax rgba(74,31,51,.7),0 0 0 3px #FF8FB5}
.tour__card,.auth-dialog,.ajustes-dialog{outline:var(--k-stitch);outline-offset:-9px}
.tour__card{border-radius:28px}
.tour__counter,.ajustes-group__title{color:#A81D4E}
.auth-dialog,.ajustes-dialog{border-radius:32px 32px 0 0}
@media(min-width:640px){.auth-dialog,.ajustes-dialog{border-radius:32px}}
.auth-dialog::backdrop,.ajustes-dialog::backdrop{background:rgba(74,31,51,.55)}
.ajustes-action{border-radius:20px;border:2px solid #F6BCD1;box-shadow:0 3px 0 #FBD7E4}
.ajustes-action:hover{border-color:#EE86AC}
.ajustes-group + .ajustes-group,.legal-dialog__foot{border-top:2px dotted #F6BCD1}
.ajustes-group__hint{color:#86506A}

/* ── notes & footer ── */
.insights h3{color:#4A1F33}
.insights .icon-badge{background:#FFE3EE;color:#C2255C}
.insights li{color:#6B3550}
.insights li::before{top:.45em;left:0;width:12px;height:11px}
.warning{border-radius:18px;border:2px dashed #F2CC7A;box-shadow:none}
.warning--error{border-color:#F4A3B3}
.footer-note,.site-footer{color:#6B3550;background:rgba(255,255,255,.8);border-radius:22px;padding:12px 16px}
.footer-note{margin-top:22px}
.site-footer{margin-top:12px;padding:6px 12px}
.site-footer__link{color:#6B3550}
.site-footer__sep{color:#86506A}
.disclosure__chevron{color:#C2255C}
"""

for k, v in {"__BOW__": BOW, "__HEARTB__": HEART_BADGE, "__HEART__": HEART, "__CLOUD__": CLOUD, "__ORN__": ORN,
             "__EARL__": EAR_L, "__EARR__": EAR_R}.items():
    TOKENS = TOKENS.replace(k, v)
for k, v in {"__CHEV__": CHEV, "__HERO_SH__": ring_shadow()}.items():
    CSS = CSS.replace(k, v)

V = dict(
    id="kitty", name="Китти",
    desc="Сладкий «кавай»: розовый фон в белый горошек с сердечками, звёздочками, бантиками и облачками, внизу клетчатая "
         "скатерть с кружевом. Пухлые кнопки-зефирки с белой глазурью и бликом, белые карточки со строчкой и красным бантом, "
         "пастельные плитки макросов и баннер в клетку с ушками.",
    sw=["#FFE8F0", "#FFFFFF", RASP, "#FF8FB5", RED, "#BFE3F7", "#FFE79A", "#C6A8F2"],
    fonts=["m-plus-rounded-1c", "nunito"], palette=PAL, tokens=TOKENS, css=CSS)
