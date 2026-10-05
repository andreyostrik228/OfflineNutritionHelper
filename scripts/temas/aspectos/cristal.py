# -*- coding: utf-8 -*-
"""B · Стекло — aurora glass: airy and luminous, translucent layers on a soft colourful light field.
Fixed aurora wallpaper (mint / lilac / peach / sky / butter blobs at different heights, a light leak, thin glass
rings, floating bubbles) behind frosted-glass cards with a luminous rim; glossy gradient capsule buttons with a white
arrow chip; glass tiles with a gradient hairline when selected; floating glass dock with a glowing pill for the active tab.
"""
from arte import *

PAL = dict(
    canvas="#EEF5F2", surface="#FFFFFF", surface_2="#F4F8F7", line="#DFEAE7", line_strong="#C3D6D1", field_line="#6E8F89",
    ink="#14312E", text_2="#3A5552", text_3="#4E6B68",
    primary="#0F6B63", primary_2="#0C5C55", primary_3="#12796F", on_ink="#FFFFFF", on_ink_2="#D6F2EB",
    volt="#BDEBDC", volt_hi="#86D9BD", volt_wash="#E5F7F0", on_volt="#14312E",
    kcal="#FF8F73", kcal_deep="#A63C22", kcal_wash="#FFEEE8",
    protein="#9B8CF0", protein_deep="#5B45C8", protein_wash="#EFECFF",
    carbs="#F2B84B", carbs_deep="#855508", carbs_wash="#FFF4DC",
    fat="#4CC3D9", fat_deep="#0A6B7C", fat_wash="#E2F6FA",
    ok="#12704F", ok_wash="#DEF5EA", warn="#7A5108", warn_wash="#FFF2D8",
    danger="#C2412F", danger_deep="#9B2C1E", danger_wash="#FDE9E4", shadow_rgb="20, 49, 46")


# --- art -------------------------------------------------------------------------------------------------
def ring(d, sw=2.0):
    """Big thin 'glass rim': white outer line + faint teal inner line."""
    c = d / 2
    r = c - sw - 1
    return svg(d, d, f"<circle cx='{c}' cy='{c}' r='{r:.1f}' fill='none' stroke='#FFFFFF' stroke-width='{sw}' opacity='.85'/>"
                     f"<circle cx='{c}' cy='{c}' r='{r - 3:.1f}' fill='none' stroke='#0F6B63' stroke-width='1' opacity='.10'/>")


def bubble(d, tint):
    """Floating glass bubble: radial white highlight, tinted rim, white edge and a little reflection arc."""
    c = d / 2
    r = c - 1
    return svg(d, d,
               f"<defs><radialGradient id='g' cx='34%' cy='28%' r='80%'>"
               f"<stop offset='0' stop-color='#FFFFFF' stop-opacity='.95'/>"
               f"<stop offset='.32' stop-color='#FFFFFF' stop-opacity='.38'/>"
               f"<stop offset='1' stop-color='{tint}' stop-opacity='.55'/></radialGradient></defs>"
               f"<circle cx='{c}' cy='{c}' r='{r}' fill='url(#g)' stroke='#FFFFFF' stroke-width='1.2' stroke-opacity='.95'/>"
               f"<path d='M{c - r * .62:.1f} {c - r * .05:.1f} A{r * .64:.1f} {r * .64:.1f} 0 0 1 {c - r * .05:.1f} {c - r * .62:.1f}' "
               f"stroke='#FFFFFF' stroke-width='{max(1.4, d / 34):.1f}' fill='none' stroke-linecap='round' opacity='.9'/>")


def sparkle(s, color, op=1.0):
    h = s / 2
    d = (f"M{h} 0C{s * .54:.2f} {s * .3:.2f} {s * .7:.2f} {s * .46:.2f} {s} {h}C{s * .7:.2f} {s * .54:.2f} {s * .54:.2f} {s * .7:.2f} {h} {s}"
         f"C{s * .46:.2f} {s * .7:.2f} {s * .3:.2f} {s * .54:.2f} 0 {h}C{s * .3:.2f} {s * .46:.2f} {s * .46:.2f} {s * .3:.2f} {h} 0Z")
    return svg(s, s, f"<path d='{d}' fill='{color}' opacity='{op}'/>")


RING1 = uri(ring(360))
RING2 = uri(ring(290))
RING3 = uri(ring(320))
BUB1 = uri(bubble(76, "#BFAEF8"))
BUB2 = uri(bubble(36, "#8FDDC0"))
BUB3 = uri(bubble(50, "#FFB79C"))
BUB4 = uri(bubble(24, "#9ACDF2"))
HB1 = uri(bubble(72, "#A0E4CB"))
HB2 = uri(bubble(34, "#CEC1FB"))
SPK_W = uri(sparkle(24, "#FFFFFF"))
SPK_M = uri(sparkle(24, "#4CC38A", .85))
SPK_L = uri(sparkle(24, "#9B8CF0", .8))
ARROW = uri(svg(20, 20, "<path d='M4.5 10h10.5M10.8 5.6 15.2 10l-4.4 4.4' stroke='#0F6B63' stroke-width='2.4' fill='none' stroke-linecap='round' stroke-linejoin='round'/>"))
CHECK = uri(svg(14, 14, "<path d='M3 7.3l2.6 2.6L11 4.5' stroke='#FFFFFF' stroke-width='2.3' fill='none' stroke-linecap='round' stroke-linejoin='round'/>"))
CHEV = uri(svg(24, 24, "<path d='M6 9l6 6 6-6' stroke='#0F6B63' stroke-width='2.4' fill='none' stroke-linecap='round' stroke-linejoin='round'/>"))
NEXT = uri(svg(24, 24, "<path d='M9.5 6l6 6-6 6' stroke='#0F6B63' stroke-width='2.4' fill='none' stroke-linecap='round' stroke-linejoin='round'/>"))
ORB = "radial-gradient(circle at 34% 28%,#8FE6C2 0%,#1FA793 46%,#0F6B63 100%)"

# the aurora field: bubbles, rings, a light leak, then colour blobs at different heights (fixed to the viewport)
AURORA = (
    "__BUB1__ no-repeat right 8% top 10% / 76px 76px,"
    "__BUB2__ no-repeat left 6% top 41% / 36px 36px,"
    "__BUB3__ no-repeat right 12% top 77% / 50px 50px,"
    "__BUB4__ no-repeat right 30% top 31% / 24px 24px,"
    "__RING1__ no-repeat left -190px top 13% / 360px 360px,"
    "__RING2__ no-repeat right -130px top 50% / 290px 290px,"
    "__RING3__ no-repeat left 30% bottom -170px / 320px 320px,"
    "radial-gradient(ellipse max(260px,26vw) max(190px,19vw) at 52% 0%, rgba(255,255,255,.95), rgba(255,255,255,0) 100%),"
    "radial-gradient(circle max(300px,30vw) at -4% 3%, rgba(146,224,196,.92), rgba(146,224,196,0) 70%),"
    "radial-gradient(circle max(270px,27vw) at 106% 19%, rgba(198,184,252,.92), rgba(198,184,252,0) 70%),"
    "radial-gradient(circle max(290px,29vw) at -8% 50%, rgba(255,196,172,.88), rgba(255,196,172,0) 70%),"
    "radial-gradient(circle max(280px,28vw) at 108% 70%, rgba(164,212,248,.92), rgba(164,212,248,0) 70%),"
    "radial-gradient(circle max(320px,32vw) at 28% 104%, rgba(156,226,206,.88), rgba(156,226,206,0) 70%),"
    "radial-gradient(circle max(190px,19vw) at 64% 37%, rgba(255,230,176,.6), rgba(255,230,176,0) 70%),"
    "linear-gradient(175deg, #F5FBF9 0%, #F8F6FE 48%, #FDF8F4 100%)"
)

TOKENS = (
    '--font-display:"Manrope",system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;'
    '--font-body:"Manrope",system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;'
    "--r-sm:12px;--r-md:18px;--r-lg:24px;--r-xl:28px;--r-ctl:18px;"
    "--shadow-1:0 2px 8px -3px rgba(22,70,66,.12),0 18px 36px -24px rgba(22,70,66,.45);--shadow-2:0 28px 64px -24px rgba(16,42,40,.55);"
    "--fw-display:800;--fw-fig:800;--fw-btn:800;--fw-label:700;--fw-hero:800;"
    "--ls-display:-.02em;--ls-fig:-.02em;--ls-btn:0;--ls-label:.005em;"
    "--hero-k:5.3;--hero-max:112px;--fs-fig-sm2:24px;"
    "--glass-bg:linear-gradient(160deg,rgba(255,255,255,.8) 0%,rgba(255,255,255,.6) 100%);"
    "--glass-blur:blur(18px) saturate(1.7);"
    "--glass-sh:inset 0 1px 0 rgba(255,255,255,.95),0 0 0 1px rgba(255,255,255,.45),0 24px 46px -28px rgba(22,70,66,.5),0 3px 10px -4px rgba(22,70,66,.1);"
    "--grad:linear-gradient(115deg,#0F6B63 0%,#0F7566 50%,#10806A 100%);"
    "--rim:linear-gradient(145deg,rgba(255,255,255,1) 0%,rgba(255,255,255,.6) 20%,rgba(255,255,255,0) 46%,rgba(186,170,250,.5) 78%,rgba(110,210,174,.6) 100%);"
)

CSS = r"""
/* ═════════ B · Стекло ═════════ */
html{background:#EEF5F2}
body{background:transparent;font-weight:500}
body::before{content:"";position:fixed;inset:0;z-index:-1;pointer-events:none;background:__AURORA__}
::selection{background:#BDEBDC;color:#14312E}
:focus-visible{outline:3px solid #0F6B63;outline-offset:2px;box-shadow:0 0 0 6px rgba(76,195,138,.32)}

/* ── top bar ── */
.topbar__menu-btn{width:46px;height:46px;-webkit-backdrop-filter:blur(12px) saturate(1.4);backdrop-filter:blur(12px) saturate(1.4)}
@@BTN_ICON@@{border:1px solid rgba(255,255,255,.95);border-radius:50%;color:#0F6B63;
  background:linear-gradient(180deg,rgba(255,255,255,.92),rgba(255,255,255,.62));
  box-shadow:0 0 0 1px rgba(15,107,99,.08),0 10px 22px -12px rgba(20,49,46,.45),inset 0 1px 0 #fff}
@@BTN_ICON@@:hover{box-shadow:0 0 0 1px rgba(15,107,99,.22),0 10px 22px -12px rgba(20,49,46,.45),inset 0 1px 0 #fff;color:#0C5C55}
.topbar__brand{color:#0F5E57;gap:10px}
.topbar__brand-mark{width:36px;height:36px;border-radius:50%;color:transparent;
  background:__SPK_W__ center / 18px no-repeat,__ORB__;
  box-shadow:0 0 0 3px rgba(255,255,255,.75),0 8px 16px -6px rgba(16,128,106,.65),inset 0 1px 1px rgba(255,255,255,.6)}
.topbar__brand-mark svg{display:none}
@@PROFILE@@{height:46px;border:1px solid rgba(255,255,255,.95);border-radius:999px;color:#14312E;font-size:var(--fs-sm);font-weight:700;
  background:linear-gradient(180deg,rgba(255,255,255,.92),rgba(255,255,255,.62));
  -webkit-backdrop-filter:blur(12px) saturate(1.4);backdrop-filter:blur(12px) saturate(1.4);
  box-shadow:0 0 0 1px rgba(15,107,99,.08),0 10px 22px -12px rgba(20,49,46,.45),inset 0 1px 0 #fff}
.topbar__profile-avatar{background:linear-gradient(135deg,#1A9A84,#0F6B63);color:#fff;box-shadow:0 3px 8px -2px rgba(16,128,106,.55)}
.topbar__menu{border-radius:22px;border:1px solid rgba(255,255,255,.9);background:rgba(250,253,252,.9);
  -webkit-backdrop-filter:blur(20px) saturate(1.4);backdrop-filter:blur(20px) saturate(1.4);box-shadow:var(--shadow-2),0 0 0 1px rgba(15,107,99,.08)}
.topbar__menu-item:hover{background:rgba(189,235,220,.45)}
.traduccion-aviso{border-radius:24px;border:1px solid rgba(255,255,255,.75);background:var(--glass-bg);-webkit-backdrop-filter:var(--glass-blur);backdrop-filter:var(--glass-blur);box-shadow:var(--glass-sh)}

/* ── hero: a compact pane of glass over the aurora, name with a light halo ── */
.hero{position:relative;border-radius:30px;color:#0F6B63;border:1px solid rgba(255,255,255,.55);
  background:
    __HB1__ no-repeat left -22px bottom -30px / 72px 72px,
    __HB2__ no-repeat right 16px top 10px / 34px 34px,
    __SPK_W__ no-repeat left 8% top 20% / 16px 16px,
    __SPK_M__ no-repeat right 11% bottom 20% / 12px 12px,
    __SPK_W__ no-repeat right 23% top 13% / 10px 10px,
    __SPK_L__ no-repeat left 21% bottom 12% / 9px 9px,
    radial-gradient(closest-side, rgba(255,255,255,.85), rgba(255,255,255,0)) center / 86% 160% no-repeat,
    linear-gradient(135deg, rgba(255,255,255,.62) 0%, rgba(255,255,255,.3) 100%);
  -webkit-backdrop-filter:blur(16px) saturate(1.5);backdrop-filter:blur(16px) saturate(1.5);
  box-shadow:inset 0 1px 0 #fff,0 0 0 1px rgba(255,255,255,.4),0 22px 44px -26px rgba(20,49,46,.45)}
.hero::before{content:"";position:absolute;inset:0;margin:0;height:auto;border-radius:inherit;pointer-events:none;
  background:linear-gradient(120deg,rgba(255,255,255,.7) 0%,rgba(255,255,255,0) 28%)}
.hero__texto{position:relative;z-index:1;padding:16px 12px 18px}
.hero__nombre{color:#0F6B63;text-shadow:0 0 18px rgba(255,255,255,.95),0 0 40px rgba(255,255,255,.75),0 1px 0 rgba(255,255,255,.9)}

/* ── section titles ── */
h2{color:#14312E}
h2 em{color:#0F6B63;background:none;padding:0;margin:0;text-shadow:0 0 22px rgba(76,195,138,.55),0 0 2px rgba(255,255,255,.9)}
.eyebrow{color:#3A5552}
@@SECTION_LABEL@@{color:#3A5552}
.form-section-label{color:#0F5E57}
.form-section-label::before{width:12px;height:12px;border-radius:50%;transform:none;background:__ORB__;
  box-shadow:0 0 0 3px rgba(76,195,138,.18),0 0 10px 1px rgba(76,195,138,.55)}
.badge{height:32px;padding:0 13px;border-radius:999px;color:#0F5E57;border:1px solid rgba(255,255,255,.95);
  background:linear-gradient(180deg,rgba(255,255,255,.9),rgba(255,255,255,.62));
  -webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);box-shadow:0 0 0 1px rgba(15,107,99,.08),0 6px 14px -8px rgba(20,49,46,.35)}
.badge svg{color:#1A9A84}

/* ── glass surfaces ── */
@@PANEL@@{position:relative;border-radius:30px;border:1px solid rgba(255,255,255,.5);background:var(--glass-bg);
  -webkit-backdrop-filter:var(--glass-blur);backdrop-filter:var(--glass-blur);box-shadow:var(--glass-sh)}
@@PANEL@@::before{content:"";position:absolute;inset:0;border-radius:inherit;pointer-events:none;
  background:linear-gradient(125deg,rgba(255,255,255,.75) 0%,rgba(255,255,255,0) 24%),radial-gradient(110% 40% at 100% 100%,rgba(255,255,255,.4),rgba(255,255,255,0) 70%)}
@@PANEL@@>*{position:relative;z-index:1}
@@CARD@@{position:relative;border:1px solid rgba(255,255,255,.5);border-radius:26px;background:var(--glass-bg);
  -webkit-backdrop-filter:var(--glass-blur);backdrop-filter:var(--glass-blur);box-shadow:var(--glass-sh)}
.resumen-datos{padding:8px 8px 8px 18px}
/* luminous glass rim: bright top-left edge, tinted bottom-right edge (masked gradient ring) */
@@PANEL@@::after,@@CARD@@::after,.summary-card::after,.schedule-timeline__item:not(.schedule-timeline__item--next)::after,.hero::after,.next-meal-sticky__btn::after,body.con-pestanas .tabbar::after,.onboarding__card::after{
  content:"";position:absolute;inset:0;margin:0;height:auto;border-radius:inherit;padding:1.5px;pointer-events:none;z-index:2;background:var(--rim);
  -webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;
  mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);mask-composite:exclude}
.resumen-datos__texto{color:#3A5552}
@@WELL@@{border-radius:16px;background:rgba(255,255,255,.6);box-shadow:inset 0 0 0 1px rgba(255,255,255,.95),0 0 0 1px rgba(15,107,99,.07)}
.meta{padding:10px 8px 10px 10px}
.meta .k{color:#4E6B68;letter-spacing:-.01em;overflow-wrap:normal;hyphens:auto}
.meta .v{color:#14312E}

/* ── buttons: glossy capsule with a white arrow chip ── */
@@BTN_P@@,@@BTN_CTA@@{position:relative;border:0;border-radius:999px;color:#fff;
  background:linear-gradient(180deg,rgba(255,255,255,.17) 0%,rgba(255,255,255,0) 50%),var(--grad);
  box-shadow:inset 0 1px 0 rgba(255,255,255,.5),inset 0 -3px 6px rgba(3,48,42,.28),0 12px 24px -10px rgba(16,128,106,.72),0 3px 6px -2px rgba(15,90,80,.25);
  text-shadow:0 1px 1px rgba(3,40,36,.3);transition:transform .12s ease,box-shadow .15s ease,filter .15s ease}
@@BTN_P@@ svg,@@BTN_CTA@@ svg{color:#fff}
@@BTN_P@@:hover,@@BTN_CTA@@:hover{filter:brightness(1.07) saturate(1.06);border-color:transparent;background:linear-gradient(180deg,rgba(255,255,255,.2) 0%,rgba(255,255,255,0) 50%),var(--grad)}
@@BTN_P@@:active,@@BTN_CTA@@:active{transform:translateY(1px);
  box-shadow:inset 0 1px 0 rgba(255,255,255,.4),inset 0 -2px 4px rgba(3,48,42,.3),0 4px 10px -6px rgba(16,128,106,.7)}
@@BTN_P@@:disabled,@@BTN_CTA@@:disabled{color:#3E5D59;text-shadow:none;filter:none;transform:none;
  background:linear-gradient(180deg,rgba(255,255,255,.5),rgba(255,255,255,0) 60%),linear-gradient(115deg,rgba(31,167,147,.22),rgba(76,195,138,.2));
  box-shadow:0 0 0 1px rgba(15,107,99,.16),inset 0 1px 0 rgba(255,255,255,.9)}
@@BTN_P@@:disabled svg,@@BTN_CTA@@:disabled svg{color:#3E5D59}
.btn-primary,.onboarding__btn--primary,.tour__next,.pantry-active-card__buy-btn.btn-primary{padding-left:22px;padding-right:58px}
@media(max-width:359px){.btn-primary,.onboarding__btn--primary{padding-left:16px;padding-right:52px}.btn-primary svg,.onboarding__btn--primary svg{display:none}}
.btn-primary::after,.onboarding__btn--primary::after,.tour__next::after{content:"";position:absolute;right:9px;top:50%;width:34px;height:34px;margin-top:-17px;border-radius:50%;
  background:__ARROW__ center / 18px no-repeat,linear-gradient(180deg,#FFFFFF,#E2F4EE);
  box-shadow:0 3px 8px -2px rgba(3,48,42,.45),inset 0 -1px 0 rgba(15,107,99,.18);transition:transform .15s ease}
.btn-primary:hover::after,.onboarding__btn--primary:hover::after,.tour__next:hover::after{transform:translateX(2px)}
.actions .btn-primary::after,.shopping-panel__actions .btn-primary::after,.nocook-panel>.btn-primary::after,.onboarding__btn--big::after{width:40px;height:40px;margin-top:-20px}
.btn-primary:disabled::after,.onboarding__btn--primary:disabled::after{opacity:.5;box-shadow:0 0 0 1px rgba(15,107,99,.15)}
@@BTN_S@@{border:1.5px solid rgba(255,255,255,.95);border-radius:999px;color:#0F5E57;
  background:linear-gradient(180deg,rgba(255,255,255,.88),rgba(255,255,255,.5));
  box-shadow:0 0 0 1px rgba(15,107,99,.16),0 10px 20px -14px rgba(20,49,46,.5),inset 0 1px 0 #fff;transition:transform .12s ease,box-shadow .15s ease}
@@BTN_S@@ svg{color:#1A9A84}
@@BTN_S@@:hover{background:linear-gradient(180deg,#fff,rgba(255,255,255,.75));border-color:#fff}
@@BTN_S@@:active{transform:translateY(1px);box-shadow:0 0 0 1px rgba(15,107,99,.24),0 3px 8px -6px rgba(20,49,46,.45),inset 0 1px 0 #fff}
@@BTN_S@@:disabled{color:#5F7874;background:rgba(255,255,255,.5);box-shadow:0 0 0 1px rgba(15,107,99,.12)}
.actions{background:linear-gradient(to top,rgba(247,252,250,.92) 0%,rgba(247,252,250,.78) 58%,rgba(247,252,250,0) 100%)}
.actions::before{content:"";position:absolute;inset:0;z-index:-1;border-radius:inherit;pointer-events:none;
  -webkit-backdrop-filter:blur(7px);backdrop-filter:blur(7px);
  -webkit-mask:linear-gradient(to bottom,transparent 0,#000 60%);mask:linear-gradient(to bottom,transparent 0,#000 60%)}
.actions-secondary #resetBtn{border:0;background:none;box-shadow:none;color:#3A5552;text-decoration:underline;text-decoration-color:#4CC38A;text-decoration-thickness:2px;text-underline-offset:4px}
@@BTN_SM@@{border:1px solid rgba(255,255,255,.95);border-radius:999px;color:#0B5A53;
  background:linear-gradient(135deg,rgba(208,241,230,.95),rgba(230,224,253,.9));
  box-shadow:0 0 0 1px rgba(15,107,99,.12),0 6px 12px -8px rgba(20,49,46,.4),inset 0 1px 0 #fff;transition:transform .12s ease}
@@BTN_SM@@:hover{border-color:#fff;color:#0B5A53;background:linear-gradient(135deg,rgba(196,237,223,1),rgba(222,214,253,1))}
@@BTN_SM@@:active{transform:translateY(1px)}
.pantry-active-card__delete{color:#9B2C1E;background:linear-gradient(135deg,rgba(255,226,216,.95),rgba(255,241,235,.9));box-shadow:0 0 0 1px rgba(194,65,47,.2),0 6px 12px -8px rgba(20,49,46,.4),inset 0 1px 0 #fff}
.pantry-active-card__delete--armed{color:#fff;background:#C2412F}
.pantry-active-card__buy-btn--secondary{border:1.5px solid rgba(255,255,255,.95);color:#0F5E57;text-shadow:none;
  background:linear-gradient(180deg,rgba(255,255,255,.88),rgba(255,255,255,.5));box-shadow:0 0 0 1px rgba(15,107,99,.16),0 10px 20px -14px rgba(20,49,46,.5),inset 0 1px 0 #fff}
.pantry-active-card__buy-btn--secondary svg{color:#1A9A84}
@@BTN_DANGER@@{border-radius:999px;background:linear-gradient(115deg,#C2412F,#A93524);box-shadow:inset 0 1px 0 rgba(255,255,255,.35),0 10px 22px -10px rgba(194,65,47,.7)}
.onboarding__link{padding-block:10px}
.link-btn,.pantry-link-btn,.auth-dialog__switch-btn,.onboarding__link,.site-footer__link,.onboarding__skip,.onboarding__skip-questions,.tour__skip{text-decoration-color:#4CC38A}

/* ── selectable glass tiles ── */
@@CHIP@@{position:relative;border:2px solid rgba(255,255,255,.9);border-radius:20px;color:#14312E;
  background:linear-gradient(180deg,rgba(255,255,255,.92),rgba(255,255,255,.58));
  box-shadow:0 0 0 1px rgba(15,107,99,.13),0 8px 18px -12px rgba(20,49,46,.4),inset 0 1px 0 #fff;transition:box-shadow .15s ease,background-color .15s ease}
@@CHIP@@:hover{border-color:#fff;box-shadow:0 0 0 1px rgba(15,107,99,.32),0 8px 18px -12px rgba(20,49,46,.45),inset 0 1px 0 #fff}
@@CHIP_ON@@{border:2px solid transparent;color:#0B4F49;
  background:linear-gradient(170deg,#F2FBF7,#DFF4EC) padding-box,linear-gradient(135deg,#1FA793 0%,#4CC38A 48%,#9B8CF0 100%) border-box;
  box-shadow:0 12px 24px -14px rgba(31,167,147,.75),0 0 0 4px rgba(76,195,138,.13)}
.baldosa.is-activa::after,.visually-hidden:checked + .budget-chip::after,.onboarding__choice.is-selected::after{content:"";position:absolute;top:-8px;right:-8px;width:24px;height:24px;border-radius:50%;
  background:__CHECK__ center / 13px no-repeat,linear-gradient(135deg,#1FA793,#0F6B63);box-shadow:0 0 0 3px rgba(255,255,255,.95),0 4px 10px -2px rgba(16,128,106,.6)}
.baldosa.is-activa{font-weight:800}
.budget-chip{padding:12px 10px 12px 14px}
.budget-chip__title{color:#3A5552;font-weight:700}
@media(max-width:374px){.budget-modes{grid-template-columns:minmax(0,1fr)}
  .budget-chip{flex-direction:row;align-items:center;justify-content:space-between;gap:12px;min-height:var(--h-md);padding:10px 16px}}
.budget-chip__amount{color:#14312E}
.visually-hidden:checked + .budget-chip .budget-chip__title{color:#3A5552}
.visually-hidden:checked + .budget-chip .budget-chip__amount,.onboarding__choice.is-selected .onboarding__choice-amount{color:#0B5A53}
.onboarding__choice.is-selected .onboarding__choice-note{color:#3A5552}
.date-chip{border-radius:999px}
.date-chip--today::after{background:linear-gradient(135deg,#4CC38A,#0F6B63);box-shadow:0 0 0 2px #fff,0 0 8px rgba(76,195,138,.7)}
.pantry-meal-chip{border-radius:18px}
.pantry-meal-chip--cooked .pantry-meal-chip__time{color:#0B5A53}
@@SEG@@{border:1px solid rgba(255,255,255,.85);border-radius:999px;padding:5px;background:rgba(20,49,46,.06);
  box-shadow:inset 0 2px 6px rgba(20,49,46,.12),0 1px 0 rgba(255,255,255,.95)}
@@SEG_BTN@@{border-radius:999px;color:#3A5552;background:transparent;transition:background-color .15s ease,box-shadow .15s ease,color .15s ease}
@@SEG_ON@@{color:#0B5A53;background:linear-gradient(180deg,#FFFFFF,#F3FAF7);
  box-shadow:0 6px 14px -6px rgba(20,49,46,.38),0 0 0 1px rgba(255,255,255,.95),inset 0 -1px 0 rgba(15,107,99,.1)}
@@STEP@@{border:1.5px solid var(--field-line);border-radius:999px;background:rgba(255,255,255,.55);
  box-shadow:inset 0 2px 6px rgba(20,49,46,.07),0 1px 0 rgba(255,255,255,.95)}
@@STEP@@:focus-within{border-color:#0F6B63;background:rgba(255,255,255,.85);box-shadow:0 0 0 4px rgba(31,167,147,.2)}
@@STEP_BTN@@{border-radius:50%;color:#0F6B63;font-weight:700;background:linear-gradient(180deg,#FFFFFF,#EEF6F3);
  box-shadow:0 0 0 1px rgba(15,107,99,.16),0 5px 10px -5px rgba(20,49,46,.4),inset 0 1px 0 #fff;transition:transform .1s ease}
@@STEP_BTN@@:active{transform:translateY(1px) scale(.95)}
@@STEP_PLUS@@{color:#fff;background:linear-gradient(180deg,rgba(255,255,255,.2),rgba(255,255,255,0) 55%),linear-gradient(145deg,#1A9A84 0%,#0F6B63 100%);
  box-shadow:0 7px 14px -6px rgba(16,128,106,.75),inset 0 1px 0 rgba(255,255,255,.45)}
@@FIELD@@{background-color:rgba(255,255,255,.75);border:1.5px solid var(--field-line);border-radius:18px;font-weight:600;color:#14312E;
  box-shadow:inset 0 1px 3px rgba(20,49,46,.06)}
@@FIELD@@:focus{border-color:#0F6B63;background-color:#fff;box-shadow:0 0 0 4px rgba(31,167,147,.2)}
select{background-image:__CHEV__}
.paso-a-paso input[type="number"],.paso-a-paso input[type="number"]:focus{background:transparent;border:0;box-shadow:none;border-radius:0;color:#14312E}
.field>label{color:#3A5552}
.field-hint{color:#4E6B68}

/* ── scoreboard: glass tiles with glowing orbs ── */
.nutrition-strip{background:none;box-shadow:none;padding:0;gap:10px;overflow:visible;border-radius:0;color:#14312E}
.summary-card{position:relative;overflow:hidden;border:1px solid rgba(255,255,255,.75)!important;border-radius:24px;padding:14px 12px 16px;color:#14312E;
  -webkit-backdrop-filter:var(--glass-blur);backdrop-filter:var(--glass-blur);box-shadow:var(--glass-sh)}
.summary-card--calories{padding:18px 18px 20px;background:
    radial-gradient(circle 150px at 30% 76%, rgba(255,143,115,.5), rgba(255,143,115,0) 72%),
    radial-gradient(circle 110px at 94% 8%, rgba(242,184,75,.34), rgba(242,184,75,0) 72%),
    radial-gradient(circle 100px at 78% 125%, rgba(155,140,240,.26), rgba(155,140,240,0) 72%),
    var(--glass-bg)}
.summary-card--protein{background:radial-gradient(circle 86px at 100% 0%, rgba(155,140,240,.5), rgba(155,140,240,0) 72%),radial-gradient(circle 60px at 0% 100%, rgba(155,140,240,.2), rgba(155,140,240,0) 72%),var(--glass-bg)}
.summary-card--carbs{background:radial-gradient(circle 86px at 100% 0%, rgba(242,184,75,.5), rgba(242,184,75,0) 72%),radial-gradient(circle 60px at 0% 100%, rgba(242,184,75,.2), rgba(242,184,75,0) 72%),var(--glass-bg)}
.summary-card--fat{background:radial-gradient(circle 86px at 100% 0%, rgba(76,195,217,.48), rgba(76,195,217,0) 72%),radial-gradient(circle 60px at 0% 100%, rgba(76,195,217,.2), rgba(76,195,217,0) 72%),var(--glass-bg)}
.summary-card h3{color:#3A5552}
.summary-card .sub{color:#3A5552;text-wrap:pretty}
.summary-card--calories .big{color:var(--kcal-deep)}
.summary-card--protein .big{color:var(--protein-deep)}.summary-card--carbs .big{color:var(--carbs-deep)}.summary-card--fat .big{color:var(--fat-deep)}
.icon-badge{width:30px;height:30px;border-radius:50%;background:linear-gradient(180deg,#FFFFFF,rgba(255,255,255,.8))}
.summary-card--calories .icon-badge{color:var(--kcal-deep);background:radial-gradient(circle at 35% 30%,#fff 0 14%,#FFD2C5 48%,#FFAD97 100%);box-shadow:0 0 0 4px rgba(255,143,115,.2),0 4px 14px -2px rgba(255,143,115,.75)}
.summary-card--protein .icon-badge{color:var(--protein-deep);background:radial-gradient(circle at 35% 30%,#fff 0 14%,#DAD3FC 48%,#B3A7F5 100%);box-shadow:0 0 0 4px rgba(155,140,240,.2),0 4px 14px -2px rgba(155,140,240,.75)}
.summary-card--carbs .icon-badge{color:var(--carbs-deep);background:radial-gradient(circle at 35% 30%,#fff 0 14%,#FCE3AE 48%,#F5C66E 100%);box-shadow:0 0 0 4px rgba(242,184,75,.22),0 4px 14px -2px rgba(242,184,75,.8)}
.summary-card--fat .icon-badge{color:var(--fat-deep);background:radial-gradient(circle at 35% 30%,#fff 0 14%,#BDEBF4 48%,#7FD3E4 100%);box-shadow:0 0 0 4px rgba(76,195,217,.2),0 4px 14px -2px rgba(76,195,217,.75)}
.insights .icon-badge{background:__ORB__;color:#fff;box-shadow:0 4px 12px -3px rgba(16,128,106,.6)}
@container (min-width:620px){.nutrition-strip{grid-template-columns:1.4fr repeat(3,minmax(0,1fr))}.summary-card--calories{grid-column:auto}}

/* ── timeline, day header, meal cards ── */
.schedule-timeline__item{border:1px solid rgba(255,255,255,.8);border-radius:22px;background:var(--glass-bg);
  -webkit-backdrop-filter:var(--glass-blur);backdrop-filter:var(--glass-blur);box-shadow:var(--glass-sh)}
.schedule-timeline__item:hover{border-color:#fff}
.schedule-timeline__item--next{border:2px solid transparent;
  background:linear-gradient(165deg,#F2FBF7,#DFF4EC) padding-box,linear-gradient(135deg,#1FA793 0%,#4CC38A 48%,#9B8CF0 100%) border-box;
  box-shadow:0 12px 26px -14px rgba(31,167,147,.75),0 0 0 4px rgba(76,195,138,.12)}
.schedule-timeline__next-tag{border-radius:999px;padding:4px 9px;color:#fff;background:linear-gradient(135deg,#12796F,#0C5C55);box-shadow:0 4px 10px -4px rgba(16,128,106,.6)}
.schedule-timeline__time{color:#14312E}
.schedule-timeline__label{color:#3A5552}
.schedule-timeline__note{color:#3A5552}
.day-slide__n{color:#14312E}
.day-slide__of{color:#3A5552}
.day-slide__head::after{height:3px;border-radius:3px;background:linear-gradient(90deg,#1FA793,rgba(155,140,240,.75) 55%,rgba(155,140,240,0));box-shadow:0 0 10px rgba(76,195,138,.45)}
.days-carousel__hint{color:#3A5552}
.days-carousel__dot::before{width:10px;height:10px;background:rgba(255,255,255,.85);box-shadow:0 0 0 1px rgba(15,107,99,.32)}
.days-carousel__dot.is-active::before{width:26px;background:linear-gradient(90deg,#4CC38A,#0F6B63);box-shadow:0 0 10px rgba(31,167,147,.6)}
.days-carousel__arrow{color:#0F6B63;border:1px solid #fff;background:rgba(255,255,255,.85);-webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px);box-shadow:var(--shadow-2)}
.meal-head h3{color:#14312E}
.meal-time-badge{height:36px;padding:0 12px;border-radius:14px;color:#0B5A53;
  background:linear-gradient(135deg,rgba(191,236,221,.95),rgba(222,214,253,.9));box-shadow:inset 0 0 0 1px rgba(255,255,255,.9),0 4px 10px -6px rgba(20,49,46,.35)}
.meal-kcal{color:var(--kcal-deep)}
.meal-items{border-top:1px solid rgba(15,107,99,.13)}
.food-row{border-bottom:1px solid rgba(15,107,99,.1)}
.food-meta{color:#3A5552}
.food-qty__grams,.food-cost__tag{color:#4E6B68}
.food-macro__badge,.food-purchase__badge{border-radius:999px;background:#DEF5EA;color:#12704F}
.food-purchase{border-radius:14px;background:linear-gradient(135deg,rgba(214,242,233,.75),rgba(236,232,253,.65));box-shadow:inset 0 0 0 1px rgba(255,255,255,.95)}
.meal-footer{border-top:1px solid rgba(255,255,255,.9);background:linear-gradient(180deg,rgba(236,247,243,.5),rgba(226,242,237,.85))}
.meal-footer>div{color:#3A5552}
.meal-footer>div::before{height:5px;border-radius:99px}
.meal-footer>div:nth-child(1)::before{background:linear-gradient(90deg,#9B8CF0,#5B45C8)}
.meal-footer>div:nth-child(2)::before{background:linear-gradient(90deg,#F2B84B,#C28417)}
.meal-footer>div:nth-child(3)::before{background:linear-gradient(90deg,#4CC3D9,#0A6B7C)}
.meal-footer>div:nth-child(4)::before{background:linear-gradient(90deg,#4CC38A,#0F6B63)}
.meal-footer>div:nth-child(5)::before{background:linear-gradient(90deg,#FFB39E,#E0745A)}
.meal-steps{border-top:1px solid rgba(15,107,99,.1)}
.meal-steps__toggle{color:#0F5E57}
.meal-steps__toggle::after{border-color:#1A9A84}
.meal-steps__list li::before{border-radius:50%;color:#fff;background:linear-gradient(135deg,#12796F,#0C5C55);box-shadow:0 4px 10px -4px rgba(16,128,106,.6)}
.meal-make-ahead,.meal-cook-note{border-radius:14px;box-shadow:inset 0 0 0 1px rgba(242,184,75,.4)}
.meal-card--empty{border:2px dashed rgba(15,107,99,.28);background:rgba(255,255,255,.4);box-shadow:none}
.empty-icon{border-radius:50%;background:__ORB__;color:#fff;box-shadow:0 10px 22px -8px rgba(16,128,106,.6),0 0 0 6px rgba(255,255,255,.6)}
.plan-days-note{border-radius:16px}
.warning{border-radius:22px;border:1px solid rgba(255,255,255,.7);color:#7A5108;
  background:linear-gradient(160deg,rgba(255,248,229,.95),rgba(255,240,207,.86));box-shadow:inset 4px 0 0 #F2B84B,0 16px 32px -22px rgba(133,85,8,.45);
  -webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px)}
.warning--error{color:#9B2C1E;background:linear-gradient(160deg,rgba(255,238,233,.96),rgba(253,227,220,.88));box-shadow:inset 4px 0 0 #C2412F,0 16px 32px -22px rgba(155,44,30,.4)}
.spinner-wrap{border-radius:18px;background:var(--grad);box-shadow:0 10px 22px -12px rgba(16,128,106,.6)}
.next-meal-sticky__btn{position:relative;border:1px solid rgba(255,255,255,.7);border-radius:24px;color:#14312E;
  background:linear-gradient(160deg,rgba(255,255,255,.88),rgba(255,255,255,.7));
  -webkit-backdrop-filter:blur(20px) saturate(1.6);backdrop-filter:blur(20px) saturate(1.6);
  box-shadow:inset 0 1px 0 #fff,0 0 0 1px rgba(15,107,99,.07),0 16px 32px -18px rgba(20,49,46,.55)}
.next-meal-sticky__eyebrow{border-radius:999px;padding:5px 10px;color:#fff;background:linear-gradient(135deg,#12796F,#0C5C55);box-shadow:0 4px 10px -4px rgba(16,128,106,.6)}
.next-meal-sticky__time{color:#0F5E57}
.next-meal-sticky__label{color:#3A5552}

/* ── shopping ── */
.shopping-summary__stat{border-radius:24px;padding-left:12px;padding-right:12px}
.shopping-summary__stat:not(:nth-child(2)) strong{font-size:var(--fs-fig-sm2)}
@media(max-width:374px){.shopping-summary__stat:not(:nth-child(2)){flex:1 1 calc(50% - 4px)}}
.shopping-summary__stat span{color:#3A5552}
.shopping-summary__stat strong{color:#14312E}
.shopping-summary__stat:nth-child(2){position:relative;overflow:hidden;border:1px solid rgba(255,255,255,.4);
  background:radial-gradient(circle 170px at 104% -10%,rgba(76,195,138,.6),rgba(76,195,138,0) 70%),radial-gradient(circle 150px at -6% 130%,rgba(76,195,217,.45),rgba(76,195,217,0) 70%),linear-gradient(135deg,#0F6B63 0%,#0C5C55 100%);
  box-shadow:inset 0 1px 0 rgba(255,255,255,.4),0 20px 36px -18px rgba(16,128,106,.75),0 0 0 1px rgba(255,255,255,.3)}
.shopping-summary__stat:nth-child(2)::before{content:"";position:absolute;inset:0;border-radius:inherit;pointer-events:none;background:linear-gradient(125deg,rgba(255,255,255,.22) 0%,rgba(255,255,255,0) 30%)}
.shopping-summary__stat:nth-child(2) span{color:#E2F6F0}
.shopping-summary__stat:nth-child(2) strong{color:#fff;text-shadow:0 2px 12px rgba(3,40,36,.35)}
.shopping-progress__texto{color:#3A5552}
.shopping-progress__barra{height:16px;padding:3px;background:rgba(20,49,46,.08);box-shadow:inset 0 1px 3px rgba(20,49,46,.16),0 1px 0 rgba(255,255,255,.9)}
.shopping-progress__barra>span{background:linear-gradient(90deg,#4CC38A,#1A9A84 60%,#0F6B63);box-shadow:0 0 10px rgba(76,195,138,.6)}
.shopping-item__check::before,.pantry-purchase-row__check::before{border:2px solid var(--field-line);background:rgba(255,255,255,.85)}
.shopping-item__check[aria-checked="true"]::before,.pantry-purchase-row__check[aria-checked="true"]::before{border-color:transparent;background:linear-gradient(135deg,#1FA793,#0F6B63);box-shadow:0 0 10px rgba(31,167,147,.55)}
.shopping-item__check[aria-checked="true"]::after,.pantry-purchase-row__check[aria-checked="true"]::after{border-color:#fff}
.shopping-item__meta,.shopping-item__usage-price{color:#4E6B68}
.shopping-item.is-comprado{background:rgba(255,255,255,.42);box-shadow:0 0 0 1px rgba(255,255,255,.7)}
.product-find-btn{border:1px solid #fff;background:linear-gradient(180deg,#fff,rgba(255,255,255,.7));box-shadow:0 0 0 1px rgba(15,107,99,.12),0 4px 10px -6px rgba(20,49,46,.4)}
.product-find-btn:hover{box-shadow:0 0 0 1px rgba(15,107,99,.4),0 4px 10px -6px rgba(20,49,46,.4)}
.shopping-share-note{color:#3A5552}
.confirm-receipt{border-radius:18px;background:linear-gradient(135deg,rgba(214,242,233,.85),rgba(236,232,253,.75));box-shadow:inset 0 0 0 1px rgba(255,255,255,.95)}

/* ── my plans ── */
.pantry-plans-empty{border:2px dashed rgba(15,107,99,.28);border-radius:26px;color:#3A5552;background:rgba(255,255,255,.38);
  -webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px)}
.pantry-active-card__summary{color:#3A5552}

/* ── floating glass dock ── */
@media screen and (max-width:900px){
  body.con-pestanas .tabbar{width:min(480px,calc(100% - 20px));border:1px solid rgba(255,255,255,.92);border-radius:32px;padding:5px;gap:0;
    background:linear-gradient(180deg,rgba(255,255,255,.84),rgba(255,255,255,.68));
    -webkit-backdrop-filter:blur(22px) saturate(1.7);backdrop-filter:blur(22px) saturate(1.7);
    box-shadow:inset 0 1px 0 #fff,0 0 0 1px rgba(15,107,99,.07),0 22px 44px -18px rgba(20,49,46,.5)}
  .tabbar__btn{min-height:60px;padding:8px 2px;border-radius:25px;color:#3A5552;font-weight:700;letter-spacing:-.015em;background:transparent}
  .tabbar__btn.is-activa{color:#fff;background:linear-gradient(180deg,rgba(255,255,255,.16),rgba(255,255,255,0) 55%),var(--grad);
    box-shadow:inset 0 1px 0 rgba(255,255,255,.42),0 10px 20px -8px rgba(16,128,106,.7),0 0 0 3px rgba(76,195,138,.14)}
  .tabbar__btn.is-activa svg{filter:drop-shadow(0 1px 1px rgba(3,40,36,.35))}
  @media(max-width:374px){body.con-pestanas .tabbar{width:calc(100% - 12px);padding:4px}.tabbar__btn{letter-spacing:-.025em}}
  .tabbar__cuenta{background:linear-gradient(135deg,#C2412F,#A93524);color:#fff;box-shadow:0 0 0 2.5px #fff,0 4px 8px -2px rgba(176,58,40,.5)}
}

/* ── welcome + questions: aurora field with a glass sheet ── */
.onboarding{background:__AURORA__}
.onboarding__card{position:relative;border:1px solid rgba(255,255,255,.6);border-bottom:0;border-radius:34px 34px 0 0;
  background:linear-gradient(170deg,rgba(255,255,255,.8) 0%,rgba(255,255,255,.64) 100%);
  -webkit-backdrop-filter:blur(26px) saturate(1.7);backdrop-filter:blur(26px) saturate(1.7);
  box-shadow:inset 0 1px 0 #fff,0 -18px 50px -24px rgba(20,49,46,.4)}
@media(min-width:640px){.onboarding__card{border-radius:34px;border-bottom:1px solid rgba(255,255,255,.88)}}
.onboarding__brand-mark{width:40px;height:40px;border-radius:50%;color:transparent;transform:none;
  background:__SPK_W__ center / 20px no-repeat,__ORB__;box-shadow:0 0 0 3px rgba(255,255,255,.8),0 8px 16px -6px rgba(16,128,106,.65)}
.onboarding__brand-mark svg{display:none}
.onboarding__brand-name{color:#0F5E57}
.onboarding__title{color:#14312E}
.onboarding__title-accent{color:#0F6B63;background:none;padding:0;text-shadow:0 0 22px rgba(76,195,138,.5),0 0 2px rgba(255,255,255,.9)}
.onboarding__summary li{color:#3A5552}
.onboarding__summary li::before{width:12px;height:12px;top:.38em;border-radius:50%;transform:none;background:__ORB__;
  box-shadow:0 0 0 3px rgba(76,195,138,.16),0 0 10px rgba(76,195,138,.5)}
.onboarding__summary strong{color:#14312E}
.onboarding__check input{border:2px solid var(--field-line);border-radius:10px;background:rgba(255,255,255,.85)}
.onboarding__check input:checked{border-color:transparent;background:linear-gradient(135deg,#1A9A84,#0F6B63);box-shadow:0 4px 10px -3px rgba(16,128,106,.6)}
.onboarding__check input:checked::after{border-color:#fff}
.onboarding__progress{height:12px;background:rgba(20,49,46,.08);box-shadow:inset 0 1px 3px rgba(20,49,46,.14),0 1px 0 rgba(255,255,255,.9)}
.onboarding__progress-bar{background:linear-gradient(90deg,#4CC38A,#1A9A84 60%,#0F6B63);box-shadow:0 0 10px rgba(76,195,138,.6)}
.onboarding__progress-label,.onboarding__hint,.onboarding__skip-note{color:#3A5552}
.onboarding__question{color:#14312E}
.onboarding__number,.onboarding__time,.onboarding__text{border:1.5px solid var(--field-line);border-radius:22px;color:#14312E;background:rgba(255,255,255,.8)}
.onboarding__number:focus,.onboarding__time:focus,.onboarding__text:focus{border-color:#0F6B63;background:#fff;box-shadow:0 0 0 4px rgba(31,167,147,.2)}
.onboarding__unit{color:#3A5552}
.onboarding__answer .onboarding__number,.onboarding__answer .onboarding__time{font-size:var(--fs-fig-l);min-height:64px}

/* ── tour + dialogs: glass sheets ── */
.tour__hole{box-shadow:0 0 0 100vmax rgba(16,42,40,.66),0 0 0 3px #86D9BD,0 0 24px 4px rgba(134,217,189,.55)}
.tour__foco{box-shadow:0 0 0 100vmax rgba(16,42,40,.34),0 0 0 3px #86D9BD}
.tour__card{border-radius:26px;border:1px solid rgba(255,255,255,.92);background:linear-gradient(160deg,rgba(255,255,255,.95),rgba(245,251,249,.9));
  -webkit-backdrop-filter:blur(20px);backdrop-filter:blur(20px);box-shadow:inset 0 1px 0 #fff,0 26px 60px -20px rgba(10,30,28,.55)}
.tour__next{padding-left:20px;padding-right:50px}
.tour__next::after{width:30px;height:30px;margin-top:-15px;right:8px;background-size:16px,auto}
.auth-dialog,.ajustes-dialog{border:1px solid rgba(255,255,255,.92);border-bottom:0;border-radius:32px 32px 0 0;
  background:linear-gradient(170deg,rgba(255,255,255,.95),rgba(246,251,249,.9));
  -webkit-backdrop-filter:blur(26px) saturate(1.4);backdrop-filter:blur(26px) saturate(1.4);box-shadow:inset 0 1px 0 #fff,0 -24px 60px -20px rgba(16,42,40,.45)}
@media(min-width:640px){.auth-dialog,.ajustes-dialog{border-radius:32px;border-bottom:1px solid rgba(255,255,255,.92)}}
.auth-dialog::backdrop,.ajustes-dialog::backdrop{background:radial-gradient(circle at 15% 10%,rgba(160,228,203,.35),rgba(160,228,203,0) 50%),radial-gradient(circle at 90% 70%,rgba(206,193,251,.35),rgba(206,193,251,0) 50%),rgba(16,42,40,.42);
  -webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px)}
.ajustes-dialog__head,.legal-dialog__foot{background:linear-gradient(180deg,rgba(255,255,255,.97),rgba(250,253,252,.92))}
.legal-dialog__foot{border-top:1px solid rgba(15,107,99,.1)}
.ajustes-group + .ajustes-group{border-top:1px solid rgba(15,107,99,.1)}
.ajustes-group__title,.ajustes-group__title label{color:#3A5552}
.ajustes-group__hint{color:#4E6B68}
.ajustes-choice__btn[aria-checked="true"]{color:#0B5A53}
.ajustes-action{position:relative;padding-right:44px;border:1px solid rgba(255,255,255,.95);border-radius:18px;color:#14312E;font-weight:700;
  background:linear-gradient(180deg,rgba(255,255,255,.95),rgba(255,255,255,.7));box-shadow:0 0 0 1px rgba(15,107,99,.13),0 8px 16px -12px rgba(20,49,46,.4)}
.ajustes-action::after{content:"";position:absolute;right:14px;top:50%;width:20px;height:20px;margin-top:-10px;background:__NEXT__ center / 20px no-repeat}
.ajustes-action:hover{border-color:#fff;box-shadow:0 0 0 1px rgba(15,107,99,.35),0 8px 16px -12px rgba(20,49,46,.4)}
.auth-dialog__notice,.auth-dialog__notice-static{border-radius:14px}
.suggest-list{border-radius:18px;border:1px solid #fff;background:rgba(250,253,252,.96)}
.suggest-list__item:hover,.suggest-list__item.is-active{background:rgba(189,235,220,.55)}
.pantry-item__amount{border-color:#0F6B63;color:#0F5E57}
.pantry-empty{border:2px dashed rgba(15,107,99,.28);border-radius:22px}
.pantry-empty svg{color:#0F6B63}

/* ── notes + footer ── */
.insights h3{color:#14312E}
.insights li{color:#3A5552}
.insights li::before{border-radius:50%;transform:none;background:__ORB__;box-shadow:0 0 6px rgba(76,195,138,.6)}
.disclosure__chevron{color:#1A9A84}
.site-footer,.footer-note,.site-footer__link{color:#3A5552}
.site-footer__sep{color:#3A5552}
"""

CSS = CSS.replace("__AURORA__", AURORA)
for k, v in dict(RING1=RING1, RING2=RING2, RING3=RING3, BUB1=BUB1, BUB2=BUB2, BUB3=BUB3, BUB4=BUB4,
                 SPK_W=SPK_W, HB1=HB1, HB2=HB2, SPK_M=SPK_M, SPK_L=SPK_L, ARROW=ARROW, CHECK=CHECK, CHEV=CHEV, NEXT=NEXT, ORB=ORB).items():
    CSS = CSS.replace("__%s__" % k, v)

V = dict(
    id="cristal", name="Стекло",
    desc="Светлое «северное сияние»: на фоне — размытые мятные, сиреневые и персиковые пятна с тонкими кольцами и стеклянными пузырьками, поверх — карточки из матового стекла. Кнопки — глянцевые градиентные капсулы с белой стрелкой и мягким свечением, нижняя панель — парящий стеклянный док.",
    sw=["#EEF5F2", "#CEC1FB", "#0F6B63", "#4CC38A", "#FF8F73", "#9B8CF0", "#F2B84B", "#4CC3D9"],
    fonts=["manrope"], palette=PAL, tokens=TOKENS, css=CSS)
