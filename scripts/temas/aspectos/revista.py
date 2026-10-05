# -*- coding: utf-8 -*-
"""G · Журнал — a premium cookbook magazine.
Warm paper with grain, a faint 4-column guide grid and big Bauhaus shapes (blush disc, ink ring, sage half-disc,
terracotta dot, thin diagonals); content sits directly on the paper, separated by hairline rules. Masthead with
double rules, big serif (Cormorant Garamond) titles and numerals, rectangular ink buttons with a long drawn arrow,
underlined fields and tabs, an editorial stat row instead of tiles, a full-width ruled tab bar.
"""
from arte import *

INK, INK2, INK3 = "#161310", "#2A2520", "#3B342D"
PAPER, WHITE, CREAM = "#F6F1E8", "#FFFDF9", "#FBF6EC"
TERRA, TERRA_D = "#B5472B", "#A13D22"
BLUSH, SAGE, OLIVE = "#F1D3C2", "#D5DEC7", "#5B6B3A"
PLUM, OCHRE, OCHRE_D, TEAL = "#7A3550", "#D9AE45", "#7A5C0E", "#2B6F66"

PAL = dict(
    canvas=PAPER, surface=WHITE, surface_2="#EFE8DC", line="#E3DACC", line_strong="#CDBFAC", field_line="#8A7F70",
    ink=INK, text_2="#4A433B", text_3="#6B6257",
    primary=INK, primary_2=INK2, primary_3=INK3, on_ink=CREAM, on_ink_2="#D9CFBF",
    volt=BLUSH, volt_hi="#E7B49B", volt_wash="#FAEDE5", on_volt=INK,
    kcal=TERRA, kcal_deep=TERRA_D, kcal_wash="#F7E3D9",
    protein=PLUM, protein_deep=PLUM, protein_wash="#F3E4E9",
    carbs=OCHRE, carbs_deep=OCHRE_D, carbs_wash="#F6ECCF",
    fat=TEAL, fat_deep="#245E56", fat_wash="#DFECE8",
    ok="#4D5B30", ok_wash="#E7ECDD", warn=OCHRE_D, warn_wash="#F6ECCF",
    danger="#B23A26", danger_deep="#8E2C1C", danger_wash="#F8E2DB", shadow_rgb="22, 19, 16")

# ── art ────────────────────────────────────────────────────────────────────────────────────────────────
def grain(size=200, freq=.95, a=2.0, b=-.9, op=.24, rgb=(.33, .27, .2)):
    """Paper speckle: only the peaks of the noise print (warm brown), so the paper keeps its colour."""
    r, g, bb = rgb
    return svg(size, size,
               f"<filter id='g' x='0' y='0' width='100%' height='100%'><feTurbulence type='fractalNoise' baseFrequency='{freq}' numOctaves='2' stitchTiles='stitch'/>"
               f"<feColorMatrix values='0 0 0 0 {r}  0 0 0 0 {g}  0 0 0 0 {bb}  {a} 0 0 0 {b}'/></filter>"
               f"<rect width='100%' height='100%' filter='url(#g)' opacity='{op}'/>")


def hatch(x0, y0, x1, y1, n, dx, color=INK, op=.24, sw=1):
    return "".join(f"<path d='M{x0 + i * dx} {y0}L{x1 + i * dx} {y1}' stroke='{color}' stroke-width='{sw}' opacity='{op}'/>" for i in range(n))


GRAIN = uri(grain())
# top-right (a 360-box anchored to the corner): a big blush disc cropped by the edge, hatched with thin
# diagonals, and a thin ink ring overlapping it
TR = uri(svg(360, 360,
             f"<defs><clipPath id='c'><circle cx='372' cy='66' r='162'/></clipPath></defs>"
             f"<circle cx='372' cy='66' r='162' fill='{BLUSH}'/>"
             f"<g clip-path='url(#c)'>{hatch(196, 214, 300, 110, 6, 15, op=.15)}</g>"
             f"<circle cx='298' cy='150' r='118' fill='none' stroke='{INK}' stroke-width='1.1' opacity='.34'/>"))
# bottom-left: a sage half-disc standing on the left edge with a terracotta half-dot on its axis (in the gutter)
BL = uri(svg(200, 340,
             f"<path d='M0 20A150 150 0 0 1 0 320Z' fill='{SAGE}'/>"
             f"<path d='M0 158A12 12 0 0 1 0 182Z' fill='{TERRA}'/>"))
# right edge: a small terracotta half-disc living in the page gutter (like a bookmark), never under text
MR = uri(svg(16, 32, f"<path d='M16 1A15 15 0 0 0 16 31Z' fill='{TERRA}'/>"))

STAR_T = uri(svg(24, 24, f"<path d='M12 0C12.9 7.3 16.7 11.1 24 12C16.7 12.9 12.9 16.7 12 24C11.1 16.7 7.3 12.9 0 12C7.3 11.1 11.1 7.3 12 0Z' fill='{TERRA}'/>"))
ARROW = uri(svg(36, 12, "<path d='M0 6H34.4' stroke='#000' stroke-width='1.3'/><path d='M28.6 1L34.6 6L28.6 11' fill='none' stroke='#000' stroke-width='1.3'/>"))
ARROW_L = uri(svg(36, 12, "<path d='M1.6 6H36' stroke='#000' stroke-width='1.3'/><path d='M7.4 1L1.4 6L7.4 11' fill='none' stroke='#000' stroke-width='1.3'/>"))
CHEV = uri(svg(20, 20, f"<path d='M5 8l5 5 5-5' fill='none' stroke='{INK}' stroke-width='1.4'/>"))
FOLIO = uri(svg(150, 16, f"<path d='M0 8H58M92 8H150' stroke='{INK}' stroke-width='1' opacity='.45'/>"
                         f"<path d='M75 0C75.6 4.9 78.1 7.4 83 8C78.1 8.6 75.6 11.1 75 16C74.4 11.1 71.9 8.6 67 8C71.9 7.4 74.4 4.9 75 0Z' fill='{TERRA}'/>"))
MARK = uri(svg(32, 32, f"<circle cx='13' cy='18' r='11' fill='{BLUSH}'/>"
                       f"<circle cx='18.5' cy='14' r='10.2' fill='none' stroke='{INK}' stroke-width='1.4'/>"
                       f"<circle cx='6.5' cy='6.5' r='2.8' fill='{TERRA}'/>"))

TOKENS = (
    '--font-display:"Cormorant Garamond",Georgia,"Times New Roman",serif;'
    '--font-body:"Inter",system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;'
    "--r-sm:0px;--r-md:0px;--r-lg:0px;--r-xl:0px;--r-ctl:0px;--pill:0px;"
    "--shadow-1:0 0 0 0 transparent;--shadow-2:0 22px 50px -24px rgba(22,19,16,.45);"
    "--fw-display:700;--fw-fig:600;--fw-btn:600;--fw-label:600;--fw-hero:700;"
    "--ls-label:.02em;--lh-display:1.04;"
    "--fs-h2:34px;--fs-h2-md:40px;--fs-h2-lg:44px;--fs-h3:22px;--fs-title:40px;--fs-q:34px;--fs-dlg:30px;"
    "--fs-fig-s:21px;--fs-fig-m:26px;--fs-fig-l:32px;--fs-fig-xl:44px;"
    "--hero-k:6.4;--hero-max:62px;--dock:66px;"
)

CSS = r"""
/* ═════════ G · Журнал ═════════ */
:root{
  --g-grid:linear-gradient(90deg,rgba(22,19,16,.065) 0 1px,transparent 1px) var(--gutter) 0 / calc((100% - 2 * var(--gutter)) / 4) 100% repeat-x;
  --g-paper:__GRAIN__ repeat 0 0 / 200px 200px,
            __TR__ no-repeat right top / 360px 360px,
            __MR__ no-repeat right top 46% / 16px 32px,
            __BL__ no-repeat left bottom 150px / 200px 340px,
            var(--g-grid),#F6F1E8;
  --g-band:__GRAIN__ repeat 0 0 / 200px 200px,#F6F1E8;
  --g-arrow:__ARROW__;--g-arrow-l:__ARROW_L__;
}
@media(max-width:599px) and (max-height:720px){:root{
  --g-paper:__GRAIN__ repeat 0 0 / 200px 200px,
            __TR__ no-repeat right top / 320px 320px,
            __MR__ no-repeat right top 46% / 16px 32px,
            __BL__ no-repeat left bottom 72px / 150px 255px,
            var(--g-grid),#F6F1E8}}
@media(max-width:359px){:root{--fs-title:34px}}
@media(min-width:600px){:root{
  --g-paper:__GRAIN__ repeat 0 0 / 200px 200px,
            __TR__ no-repeat right top / 450px 450px,
            __MR__ no-repeat right top 46% / 22px 44px,
            __BL__ no-repeat left bottom 140px / 250px 425px,
            var(--g-grid),#F6F1E8}}
@media(min-width:901px){:root{
  --g-paper:__GRAIN__ repeat 0 0 / 200px 200px,
            __TR__ no-repeat right top / 540px 540px,
            __MR__ no-repeat right top 46% / 28px 56px,
            __BL__ no-repeat left bottom 60px / 290px 493px,
            var(--g-grid),#F6F1E8}}
html{background:#F6F1E8}
body{background:transparent;color:#161310}
body::before{content:"";position:fixed;inset:0;z-index:-1;pointer-events:none;background:var(--g-paper)}
::selection{background:#F1D3C2;color:#161310}
:focus-visible{outline:2px solid #161310;outline-offset:3px;box-shadow:none}

/* lining figures everywhere a number is shown in the serif (the font shorthand resets them) */
.summary-card .big,.summary-card--calories .big,.shopping-summary__stat strong,.shopping-summary__stat:nth-child(2) strong,
.shopping-summary__stat:not(:nth-child(2)) strong,.nocook-summary__row:first-child,.meal-kcal,.nocook-slot__kcal,.shopping-item__price,
.budget-chip__amount,.onboarding__choice-amount,.schedule-timeline__time,.next-meal-sticky__time,.pantry-active-card__date,
.meal-time-badge,.food-right>div:first-child,.meal-footer strong,.verified-card__price,.meta .v,.pantry-meal-chip__time,
.paso-a-paso input,.onboarding__number,.onboarding__time,.pantry-item__amount,.tabbar__cuenta,.day-slide__n,.date-chip,
.plan-days__btn,h2,.hero__nombre,.meal-steps__list li::before{font-variant-numeric:lining-nums tabular-nums}

/* ── top bar ── */
.topbar{gap:10px}
@@BTN_ICON@@{border:1px solid #161310;border-radius:0;background:rgba(255,253,249,.55);color:#161310;box-shadow:none}
@@BTN_ICON@@:hover{background:#161310;color:#FBF6EC;box-shadow:none}
.topbar__menu-btn{width:44px;height:44px}
.topbar__brand{color:#161310;letter-spacing:.01em;gap:10px;font-size:25px}
.topbar__brand-mark{width:32px;height:32px;border-radius:0;background:__MARK__ center / 32px no-repeat;transform:none}
.topbar__brand-mark svg{display:none}
@@PROFILE@@{height:44px;border:1px solid rgba(22,19,16,.55);border-radius:0;background:rgba(255,253,249,.55);box-shadow:none;color:#161310;font-size:var(--fs-sm);font-weight:600;padding:0 14px 0 6px}
@@PROFILE@@:hover{border-color:#161310}
.topbar__profile-avatar{border-radius:50%;background:#F1D3C2;color:#161310}
.topbar__menu{border-radius:0;box-shadow:var(--shadow-2),0 0 0 1px #161310}
.topbar__menu-item{border-radius:0}
.topbar__offline{border-radius:0}
.traduccion-aviso{border-radius:0;box-shadow:none;border:1px solid rgba(22,19,16,.25);border-left:3px solid #B5472B}

/* ── masthead: double rules, the name in the serif, flanked by small stars ── */
.hero{border-radius:0;color:#161310;overflow:visible;
  background:
    linear-gradient(#161310,#161310) left top / 100% 2px no-repeat,
    linear-gradient(#161310,#161310) left 5px / 100% 1px no-repeat,
    linear-gradient(#161310,#161310) left bottom 5px / 100% 1px no-repeat,
    linear-gradient(#161310,#161310) left bottom / 100% 2px no-repeat}
.hero::before,.hero::after{content:none}
.hero__texto{padding:12px 0 13px}
.hero__nombre{display:flex;align-items:center;justify-content:center;gap:.28em;color:#161310;letter-spacing:.005em;line-height:1.02}
.hero__nombre::before,.hero__nombre::after{content:"";flex:0 1 1.3em;height:.3em;min-width:.5em}
.hero__nombre::before{background:__STAR_T__ right center / .3em .3em no-repeat,linear-gradient(#161310,#161310) left center / calc(100% - .5em) 1px no-repeat}
.hero__nombre::after{background:__STAR_T__ left center / .3em .3em no-repeat,linear-gradient(#161310,#161310) right center / calc(100% - .5em) 1px no-repeat}
@media(min-width:901px){.hero__nombre::before,.hero__nombre::after{flex-basis:3.4em}.hero__texto{padding:14px 0 15px}}

/* ── section headings: kicker (the badge) above a big serif title, a standfirst below ── */
h2{color:#161310}
h2 em{background:none;color:#A13D22;padding:0;margin:0}
.output-top,.shopping-panel__head,.nocook-panel__head,.today-plans-panel__head,.verified-panel__head{flex-direction:column-reverse;align-items:flex-start;justify-content:flex-end;gap:10px}
.output-top .badge,.shopping-panel__head .badge,.nocook-panel__head .badge,.verified-panel__head .badge{margin:0}
.badge{height:auto;padding:0;border-radius:0;background:none;color:#A13D22;font:600 13px/1.2 var(--font-body);letter-spacing:.16em;text-transform:uppercase;gap:8px}
.badge svg{color:#A13D22}
.eyebrow{margin-top:10px;font-size:15px;line-height:1.45;color:#4A433B;max-width:44ch}
.form-section-label{display:block;font:700 32px/1.05 var(--font-display);letter-spacing:0;text-transform:none;color:#161310;padding-bottom:14px;border-bottom:1px solid #161310}
.form-section-label::before{content:none}
.panel>.form-section-label{margin-bottom:22px}
.budget-group-label{display:flex;align-items:center;gap:12px;margin-bottom:12px;font:600 13px/1.2 var(--font-body);letter-spacing:.14em;text-transform:uppercase;color:#4A433B}
.budget-group-label::after{content:"";flex:1 1 auto;height:1px;background:rgba(22,19,16,.28)}
.field>label,.budget-custom-field>label{font:600 13px/1.25 var(--font-body);letter-spacing:.1em;text-transform:uppercase;color:#4A433B;margin-bottom:10px}
.field-hint{color:#6B6257;font-size:var(--fs-cap)}
.field-hint strong{color:#4A433B}

/* ── the form sits on the paper (no box) ── */
@@PANEL@@{background:transparent;box-shadow:none;border-radius:0;padding:6px 0 4px}
@@PANEL@@::after{content:"";display:block;width:150px;height:16px;margin:26px auto 4px;background:__FOLIO__ center / 150px 16px no-repeat}
.form-grid{gap:26px 14px}

/* fields: underlined, no box */
@@FIELD@@{background-color:transparent;border:0;border-bottom:1.5px solid #161310;border-radius:0;padding-left:2px;font-weight:500;color:#161310}
@@FIELD@@:focus{border-bottom-color:#B5472B;background-color:rgba(255,253,249,.8);box-shadow:0 2px 0 #B5472B}
@@FIELD@@:focus-visible{outline:none}
/* paired fields whose labels wrap differently keep their inputs on one line */
.form-grid>.field:not(.full):not(.field--ancho){display:flex;flex-direction:column;justify-content:flex-end}
select{background-image:__CHEV__;background-position:right 2px center;background-size:20px;padding-right:30px}
:where(input,select,textarea)::placeholder{color:#6B6257}

/* steppers: a ruled line with thin outlined circles */
@@STEP@@{background:transparent;border:0;border-bottom:1.5px solid #161310;border-radius:0;padding:0 0 6px;gap:6px}
@@STEP@@:focus-within{border-color:#B5472B;background:transparent}
@@STEP_BTN@@{border:1px solid #161310;border-radius:50%;background:rgba(255,253,249,.7);color:#161310;box-shadow:none;font-weight:400;transition:background-color .15s ease,color .15s ease}
@@STEP_BTN@@:hover{background:#161310;color:#FBF6EC}
@@STEP_PLUS@@{background:rgba(255,253,249,.7);color:#161310;box-shadow:none}
@@STEP_PLUS@@:hover{background:#161310;color:#FBF6EC}
/* the kit's input[type=number] size rule outranks its own stepper rule; restore the stepper figure (26px, 22px < 390px) */
.paso-a-paso input[type="number"]{border:0;background:transparent;box-shadow:none;font-family:var(--font-display);font-weight:700;font-size:var(--fs-fig-m);
  min-height:44px;height:44px;color:#161310;padding:0}
@media(max-width:389px){@@STEP@@{gap:3px}.paso-a-paso input[type="number"]{font-size:22px;min-height:40px;height:40px}}

/* chips: hairline boxes; selected = ink with a terracotta corner square */
@@CHIP@@{position:relative;background:rgba(255,253,249,.82);border:1px solid rgba(22,19,16,.4);border-radius:0;box-shadow:none;color:#161310;transition:background-color .15s ease,border-color .15s ease,color .15s ease}
@@CHIP@@:hover{border-color:#161310}
@@CHIP_ON@@{background:#161310;border-color:#161310;color:#FBF6EC;box-shadow:none}
.baldosa.is-activa::before,.visually-hidden:checked + .budget-chip::before,.visually-hidden:checked + .date-chip::before,.onboarding__choice.is-selected::before{
  content:"";position:absolute;top:0;right:0;width:9px;height:9px;background:#B5472B}
.baldosa{font:500 var(--fs-md)/1.2 var(--font-body)}
.baldosa.is-activa{font-weight:600}
.budget-chip{padding:12px 12px 12px 14px;gap:8px}
@media(max-width:339px){
  .budget-modes{grid-template-columns:minmax(0,1fr)}
  .budget-chip{flex-direction:row;align-items:center;justify-content:space-between;min-height:56px;padding:10px 14px}
}
.budget-chip__title{font:600 13px/1.2 var(--font-body);letter-spacing:.04em;text-transform:none;color:#4A433B}
.budget-chip__amount{font-weight:700;font-size:26px;color:#161310}
.visually-hidden:checked + .budget-chip .budget-chip__title{color:#D9CFBF}
.visually-hidden:checked + .budget-chip .budget-chip__amount{color:#FBF6EC}
.onboarding__choice.is-selected .onboarding__choice-amount{color:#FBF6EC}
.onboarding__choice.is-selected .onboarding__choice-note{color:#D9CFBF}
.date-chip--today::after{border-radius:50%;background:#B5472B;box-shadow:none}
.pantry-meal-chip--cooked .pantry-meal-chip__time{color:#F1D3C2}

/* segmented → underlined tabs */
@@SEG@@{background:transparent;border:0;border-bottom:1px solid rgba(22,19,16,.35);border-radius:0;padding:0;gap:0}
@@SEG_BTN@@{position:relative;background:transparent;border-radius:0;color:#4A433B;margin-bottom:-1px}
.plan-days__btn{font:600 22px/1 var(--font-display);letter-spacing:0;text-transform:none}
@@SEG_ON@@{background:transparent;color:#161310;font-weight:700;box-shadow:inset 0 -3px 0 #B5472B}
@@SEG_BTN@@:hover{color:#161310}

/* ── buttons: rectangles, a long drawn arrow ── */
@@BTN_P@@,@@BTN_CTA@@{position:relative;display:inline-flex;align-items:center;justify-content:flex-start;gap:10px;padding:0 20px;
  border:1px solid #161310;border-radius:0;background:#161310;color:#FBF6EC;box-shadow:none;text-align:left;
  font:600 15px/1.2 var(--font-body);letter-spacing:.11em;text-transform:uppercase;
  transition:background-color .18s ease,border-color .18s ease,color .18s ease,transform .08s ease}
@@BTN_P@@::after,@@BTN_CTA@@::after{content:"";flex:none;margin-left:auto;width:36px;height:12px;background:currentColor;
  -webkit-mask:var(--g-arrow) no-repeat center / contain;mask:var(--g-arrow) no-repeat center / contain;transition:transform .2s ease}
@@BTN_P@@ svg,@@BTN_CTA@@ svg{display:none}
@@BTN_P@@:hover,@@BTN_CTA@@:hover{background:#B5472B;border-color:#B5472B;color:#FBF6EC}
@@BTN_P@@:hover::after,@@BTN_CTA@@:hover::after{transform:translateX(4px)}
@@BTN_P@@:active,@@BTN_CTA@@:active{transform:translateY(1px)}
@@BTN_P@@:disabled,@@BTN_CTA@@:disabled,@@BTN_S@@:disabled{background:transparent;border:1px dashed rgba(22,19,16,.42);color:#7D7264;transform:none}
@@BTN_P@@:disabled::after,@@BTN_CTA@@:disabled::after,@@BTN_S@@:disabled::after{opacity:.55;transform:none}
.actions .btn-primary,.shopping-panel__actions .btn-primary,.nocook-panel>.btn-primary,.onboarding__btn--big{font-size:16px;padding:0 22px}
@@BTN_S@@{position:relative;display:inline-flex;align-items:center;justify-content:flex-start;gap:8px;padding:0 16px;
  border:1px solid #161310;border-radius:0;background:rgba(255,253,249,.6);color:#161310;box-shadow:none;text-align:left;
  font:600 14px/1.2 var(--font-body);letter-spacing:.09em;text-transform:uppercase;
  transition:background-color .18s ease,color .18s ease,transform .08s ease}
@@BTN_S@@::after{content:"";flex:none;margin-left:auto;width:24px;height:10px;background:currentColor;
  -webkit-mask:var(--g-arrow) no-repeat right center / auto 10px;mask:var(--g-arrow) no-repeat right center / auto 10px}
@@BTN_S@@ svg{display:none}
@@BTN_S@@:hover{background:#161310;color:#FBF6EC}
@@BTN_S@@:active{transform:translateY(1px)}
#onboardingBackBtn,.tour__prev{flex-direction:row-reverse;justify-content:flex-end}
#onboardingBackBtn::after,.tour__prev::after{margin-left:0;margin-right:auto;-webkit-mask-image:var(--g-arrow-l);mask-image:var(--g-arrow-l);-webkit-mask-position:left center;mask-position:left center}
.actions-secondary .btn-secondary,.shopping-panel__actions .btn-secondary{font-size:14px;padding:0 14px}
@media(max-width:359px){
  .actions-secondary .btn-secondary,.shopping-panel__actions .btn-secondary{padding:0 10px;letter-spacing:.05em;flex-wrap:wrap;column-gap:6px;row-gap:2px}
  .actions-secondary .btn-secondary::after,.shopping-panel__actions .btn-secondary::after{display:none}
}
.actions-secondary #resetBtn{border:0;background:none;color:#4A433B;text-transform:none;letter-spacing:.02em;font:500 var(--fs-sm)/1.2 var(--font-body);
  text-decoration:underline;text-decoration-thickness:1px;text-underline-offset:5px;text-decoration-color:#B5472B;justify-content:center}
.actions-secondary #resetBtn::after{content:none}
@@BTN_SM@@{border:0;border-radius:0;background:none;box-shadow:none;color:#161310;padding:0 2px;
  font:600 var(--fs-sm)/1.2 var(--font-body);letter-spacing:.02em;text-transform:none;
  text-decoration:underline;text-decoration-thickness:1px;text-underline-offset:5px;text-decoration-color:#B5472B}
@@BTN_SM@@:hover{color:#A13D22;background:none;border-color:transparent}
.resumen-datos__btn::after,.pantry-active-card__delete::after{content:"";display:inline-block;width:16px;height:8px;margin-left:6px;vertical-align:1px;background:currentColor;
  -webkit-mask:var(--g-arrow) no-repeat center / contain;mask:var(--g-arrow) no-repeat center / contain}
.resumen-datos__btn{max-width:46%;text-align:right;padding:8px 2px}
.pantry-active-card__delete{color:#8E2C1C;text-decoration-color:#8E2C1C}
.pantry-active-card__delete--armed{background:#B23A26;color:#fff;text-decoration:none;padding:0 12px}
@@BTN_DANGER@@{border-radius:0;background:#B23A26;text-transform:uppercase;letter-spacing:.12em;font:600 14px/1.2 var(--font-body)}
.pantry-active-card__buy-btn--secondary{background:rgba(255,253,249,.6);color:#161310}
.pantry-active-card__buy-btn--secondary:hover{background:#161310;color:#FBF6EC}
.link-btn,.pantry-link-btn,.auth-dialog__switch-btn,.onboarding__link,.site-footer__link,.onboarding__skip,.onboarding__skip-questions,.tour__skip{
  text-decoration-thickness:1px;text-underline-offset:5px;text-decoration-color:#B5472B}
/* the terms link sits inside a sentence: a taller hit area that does not move the line */
.onboarding__link{padding:10px 2px;margin:-10px 0}
.link-btn:hover,.pantry-link-btn:hover,.auth-dialog__switch-btn:hover,.onboarding__link:hover,.site-footer__link:hover{text-decoration-color:#161310}

/* the sticky "make the plan" bar fades into the paper */
.actions{background:linear-gradient(to top,#F6F1E8 72%,rgba(246,241,232,0));padding-top:18px}
@media(max-width:900px){.actions{margin-inline:calc(var(--gutter) * -1);padding-inline:var(--gutter);bottom:calc(var(--dock) + env(safe-area-inset-bottom, 0px))}}
@media(min-width:901px){.actions{margin-inline:0;padding-inline:0}}
.spinner-wrap{border-radius:0}
.loader-flame{border-color:#3B342D;border-top-color:#F1D3C2}
.warning{border-radius:0;box-shadow:inset 3px 0 0 #D9AE45}
.warning--error{box-shadow:inset 3px 0 0 #B23A26}
.plan-days-note{border-radius:0}

/* engine facts: a ruled stat line */
.meta-boxes{gap:0;margin:18px 0 6px;border-top:1px solid rgba(22,19,16,.3);border-bottom:1px solid rgba(22,19,16,.3)}
.meta{background:none;border-radius:0;padding:10px 10px 12px 12px}
.meta:first-child{padding-left:0}
.meta+.meta{border-left:1px solid rgba(22,19,16,.2)}
.meta .k{font-size:13px;letter-spacing:.02em;text-transform:none;color:#6B6257}
.meta .v{font-size:22px;font-weight:700;color:#161310}

/* ── results ── */
.resumen-datos{background:transparent;box-shadow:none;border-radius:0;border-top:1px solid #161310;border-bottom:1px solid rgba(22,19,16,.3);padding:10px 0}
.resumen-datos__texto{color:#4A433B}

/* scoreboard: an editorial stat row — the calories as the hero numeral, three ruled columns */
.nutrition-strip{margin-top:20px;padding:0;border-radius:0;background:none;color:#161310;overflow:visible;border-top:1px solid #161310;border-bottom:1px solid #161310;gap:0}
.summary-card{border:0;padding:16px 10px 18px 14px;background:none;color:#161310}
.summary-card::before{content:"";display:block;width:26px;height:3px;margin-bottom:12px;background:#CDBFAC}
.summary-card--calories{padding:18px 0 20px;border-bottom:1px solid rgba(22,19,16,.22)}
.summary-card--protein{padding-left:0}
.summary-card--carbs,.summary-card--fat{border-left:1px solid rgba(22,19,16,.22)}
.summary-card--calories::before{width:34px;background:#B5472B}
.summary-card--protein::before{background:#7A3550}.summary-card--carbs::before{background:#D9AE45}.summary-card--fat::before{background:#2B6F66}
.summary-card .icon-badge{display:none}
.summary-card h3{gap:0;font:600 13px/1.2 var(--font-body);letter-spacing:.14em;text-transform:uppercase;color:#4A433B}
.summary-card .big{margin-top:10px;font-weight:700;letter-spacing:0}
.summary-card--calories .big{color:#161310}
.summary-card--protein .big{color:#7A3550}.summary-card--carbs .big{color:#7A5C0E}.summary-card--fat .big{color:#245E56}
.summary-card .big .u{font-family:var(--font-body);font-weight:500;font-size:14px;color:#6B6257;letter-spacing:0}
.summary-card .sub{margin-top:8px;color:#6B6257}
/* a blush "sun" rising on the hairline fills the hero row (a Bauhaus colour block) */
.summary-card--calories{z-index:0}
.summary-card--calories .sub{max-width:calc(100% - 132px)}
.summary-card--calories::after{content:"";position:absolute;z-index:-1;right:4px;bottom:0;width:120px;height:60px;border-radius:60px 60px 0 0;
  background:repeating-linear-gradient(135deg,transparent 0 9px,rgba(22,19,16,.13) 9px 10px),#F1D3C2}
@container (min-width:620px){
  .nutrition-strip{grid-template-columns:1.25fr repeat(3,minmax(0,1fr))}
  .summary-card{padding:18px 14px 20px 18px}
  .summary-card--calories{padding:18px 18px 20px 0;border-bottom:0}
  .summary-card--calories::after{display:none}
  .summary-card--calories .sub{max-width:none}
  .summary-card--protein{border-left:1px solid rgba(22,19,16,.22);padding-left:18px}
}

/* day schedule: ruled columns on the paper */
.schedule-timeline__row{gap:18px}
.schedule-timeline__item{width:min(176px,48vw);padding:12px 0 6px;border:0;border-top:1px solid #161310;border-radius:0;background:transparent}
.schedule-timeline__item:hover{border-color:#B5472B}
.schedule-timeline__item--next{border-top:3px solid #B5472B;padding-top:10px;background:transparent}
.schedule-timeline__time{font-weight:700;color:#161310}
.schedule-timeline__label{color:#4A433B}
.schedule-timeline__item--next .schedule-timeline__label{color:#161310}
.schedule-timeline__next-tag{top:14px;right:0;padding:0;border-radius:0;background:none;color:#A13D22;font:600 13px/1 var(--font-body);letter-spacing:.14em;text-transform:uppercase}
.schedule-timeline__note{color:#6B6257}

/* days */
.day-slide__head{margin-bottom:14px}
.day-slide__n{font-weight:700;font-size:30px;color:#161310}
.day-slide__of{color:#6B6257;font-size:14px}
.day-slide__head::after{height:1px;border-radius:0;background:rgba(22,19,16,.35)}
.days-carousel__hint{color:#6B6257}
.days-carousel__dot::before{width:8px;height:8px;border-radius:0;background:rgba(22,19,16,.28)}
.days-carousel__dot.is-active::before{width:26px;height:3px;background:#161310}
.days-carousel__arrow{border-radius:0;background:#161310;color:#FBF6EC;box-shadow:none}

/* meal card: an editorial entry on a sheet of card stock */
.meal-card{background:#FFFDF9;border:1px solid rgba(22,19,16,.16);border-top:2px solid #161310;border-radius:0;box-shadow:none}
.meal-head{padding:16px 16px 14px;gap:10px 10px}
.meal-time-badge{height:auto;padding:0;border-radius:0;background:none;color:#A13D22;font-weight:700;font-size:22px;letter-spacing:.02em}
.meal-head h3{font:700 24px/1.12 var(--font-display);letter-spacing:0;color:#161310}
.meal-kcal{color:#161310;font-weight:700}
.meal-kcal .u,.food-right>div:first-child .u,.meal-footer strong .u{font-family:var(--font-body);font-weight:500;font-size:13px;color:#6B6257}
.meal-body{padding:0 16px}
.meal-items{border-top:1px solid #161310}
.food-row{border-bottom:1px solid rgba(22,19,16,.13);padding:14px 0}
.food-name{font-weight:600}
.food-right>div:first-child{font-weight:700;color:#161310}
.food-meta{color:#4A433B}
.food-qty{color:#161310}
.food-qty__grams{color:#6B6257}
@@TAG@@{border-radius:0}
.food-macro__badge,.food-purchase__badge{padding:0 0 0 2px;background:none;color:#4D5B30;font-size:13px;letter-spacing:.02em;text-transform:none;font-weight:600}
.food-macro__badge::before,.food-purchase__badge::before{content:"";display:inline-block;width:5px;height:5px;margin-right:5px;vertical-align:2px;background:#5B6B3A}
.food-cost{font-weight:600}
.food-cost__tag{color:#6B6257;text-transform:none;letter-spacing:.02em;font-weight:500}
.food-purchase{background:#FAF5ED;border-left:2px solid #B5472B;box-shadow:none;border-radius:0;padding:8px 12px;font-size:var(--fs-sm)}
.meal-footer{background:transparent;border-top:1px solid #161310;margin:4px -16px 0;padding:14px 16px 16px}
.meal-footer>div{color:#6B6257;letter-spacing:.02em}
.meal-footer>div::before{width:20px;height:3px;border-radius:0;margin-bottom:8px}
.meal-footer>div:nth-child(1)::before{background:#7A3550}.meal-footer>div:nth-child(2)::before{background:#D9AE45}
.meal-footer>div:nth-child(3)::before{background:#2B6F66}.meal-footer>div:nth-child(4)::before{background:#B5472B}
.meal-footer>div:nth-child(5)::before{background:#161310}
.meal-footer strong{font-weight:700;color:#161310}
.meal-steps{border-top:1px solid rgba(22,19,16,.18)}
.meal-steps__toggle{font:600 14px/1 var(--font-body);letter-spacing:.14em;text-transform:uppercase}
.meal-steps__toggle::after{width:8px;height:8px;border-right:1.5px solid #161310;border-bottom:1.5px solid #161310}
.meal-steps__badge{border-radius:0}
.meal-steps__list li::before{border-radius:0;background:none;color:#A13D22;font:700 22px/1 var(--font-display);width:24px;height:28px;place-items:start}
.meal-steps__list li{padding-left:34px}
.meal-make-ahead,.meal-cook-note{border-radius:0;box-shadow:inset 2px 0 0 #D9AE45}
.meal-card--empty{background:transparent;border:1px dashed rgba(22,19,16,.4)}
.empty-icon{border-radius:50%;background:#161310;color:#F1D3C2;transform:none}

/* ── next meal: a ruled strip under the top bar ── */
@media screen and (max-width:900px){
  .next-meal-sticky:not([hidden]){top:0;margin:0 calc(var(--gutter) * -1) 16px;padding:0 var(--gutter);background:var(--g-band)}
  .next-meal-sticky__btn{gap:12px;padding:8px 0;border-radius:0;background:transparent;box-shadow:none;color:#161310;border-top:1px solid #161310;border-bottom:1px solid #161310}
  .next-meal-sticky__eyebrow{padding:0;border-radius:0;background:none;color:#A13D22;font:600 13px/1 var(--font-body);letter-spacing:.14em;text-transform:uppercase}
  .next-meal-sticky__time{font:700 28px/1 var(--font-display);font-variant-numeric:lining-nums tabular-nums;color:#161310}
  .next-meal-sticky__label{color:#4A433B;font-weight:500}
}

/* ── shopping ── */
.shopping-summary{gap:0;margin-top:20px;border-top:1px solid #161310;border-bottom:1px solid #161310}
.shopping-summary__stat{justify-content:space-between;gap:8px;padding:12px 10px 14px 14px;border-radius:0;background:none;box-shadow:none;border:0}
.shopping-summary__stat:nth-child(1){padding-left:0}
.shopping-summary__stat:nth-child(3),.shopping-summary__stat:nth-child(4){border-left:1px solid rgba(22,19,16,.22)}
.shopping-summary__stat:nth-child(2){position:relative;z-index:0;justify-content:flex-start;padding:18px 0 18px;background:none;border-bottom:1px solid rgba(22,19,16,.22)}
.shopping-summary__stat:nth-child(2)::before{content:"";display:block;width:34px;height:3px;margin-bottom:6px;background:#B5472B}
.shopping-summary__stat:nth-child(2)::after{content:"";position:absolute;z-index:-1;right:4px;bottom:0;width:120px;height:60px;border-radius:60px 60px 0 0;
  background:repeating-linear-gradient(135deg,transparent 0 9px,rgba(22,19,16,.13) 9px 10px),#D5DEC7}
.shopping-summary__stat span{color:#4A433B;font-size:13px;letter-spacing:.06em;text-transform:uppercase;line-height:1.25}
.shopping-summary__stat:nth-child(2) span{color:#4A433B}
.shopping-summary__stat strong{font-weight:700;color:#161310}
.shopping-summary__stat:nth-child(2) strong{color:#161310}
@media(min-width:600px){
  .shopping-summary__stat:nth-child(2){border-bottom:0;border-left:1px solid rgba(22,19,16,.22);padding:12px 14px 14px;justify-content:space-between}
  .shopping-summary__stat:nth-child(2)::before,.shopping-summary__stat:nth-child(2)::after{display:none}
}
.shopping-progress__texto{color:#4A433B}
.shopping-progress__barra{height:4px;padding:0;border-radius:0;background:rgba(22,19,16,.14)}
.shopping-progress__barra>span{border-radius:0;background:#B5472B}
.shopping-list{gap:0 28px;border-top:1px solid #161310;margin-top:18px}
.shopping-item{padding:10px 0 14px;border-radius:0;background:transparent;box-shadow:none;border-bottom:1px solid rgba(22,19,16,.16)}
.shopping-item__check::before,.pantry-purchase-row__check::before{inset:11px;border:1.5px solid #161310;border-radius:0;background:#FFFDF9}
.shopping-item__check[aria-checked="true"]::before,.pantry-purchase-row__check[aria-checked="true"]::before{background:#161310;border-color:#161310}
.shopping-item__check[aria-checked="true"]::after,.pantry-purchase-row__check[aria-checked="true"]::after{border-color:#FBF6EC}
.shopping-item__name{font-weight:600}
.shopping-item__meta{color:#6B6257}
.shopping-item__price{font-weight:700;font-size:24px;color:#161310}
.shopping-item__usage-price{color:#6B6257;font-size:13px}
.shopping-item.is-comprado{background:transparent}
.product-find-btn{border-radius:0;background:rgba(255,253,249,.6);box-shadow:none;border:1px solid rgba(22,19,16,.4)}
.product-find-btn:hover{box-shadow:none;border-color:#161310}
.shopping-share-note{color:#4A433B}
.confirm-receipt{border-radius:0;box-shadow:none;border-left:3px solid #B5472B;background:#FAEDE5}
.shopping-panel::after,.today-plans-panel::after{content:"";display:block;width:150px;height:16px;margin:30px auto 0;background:__FOLIO__ center / 150px 16px no-repeat}

/* ── my plans ── */
.date-strip{gap:8px}
.date-chip{font:600 15px/1 var(--font-body);letter-spacing:.06em;text-transform:uppercase;padding:0 18px}
.pantry-plans-empty{border:1px dashed rgba(22,19,16,.4);border-radius:0;color:#4A433B;background:rgba(255,253,249,.55);font:600 22px/1.25 var(--font-display)}
.pantry-active-card{background:#FFFDF9;border:1px solid rgba(22,19,16,.16);border-top:2px solid #161310;border-radius:0;box-shadow:none}
.pantry-active-card__date{font-weight:700;color:#161310}
.pantry-active-card__summary{color:#4A433B}
.pantry-active-card__purchase--done{border-radius:0}
.pantry-purchase-checklist-wrap{border-radius:0;background:#FAF5ED}
.pantry-meal-chip__time{color:#A13D22}
.pantry-history-heading{font:700 24px/1 var(--font-display);letter-spacing:0;text-transform:none}
.pantry-history-row{background:transparent;box-shadow:none;border-radius:0;border-bottom:1px solid rgba(22,19,16,.16);padding:12px 0}

/* no-cook */
.nocook-summary,.nocook-slot{background:#FFFDF9;border:1px solid rgba(22,19,16,.16);border-top:2px solid #161310;border-radius:0;box-shadow:none}
.nocook-slot__head h3{text-transform:none}
.nocook-item{border-radius:0;background:#FAF5ED}
.nocook-slot__kind{border-radius:0}

/* catalogue + notes + footer */
.disclosure{background:transparent;box-shadow:none;border-radius:0;border-top:1px solid #161310;border-bottom:1px solid #161310}
.disclosure>summary{padding:20px 0}
.disclosure__body{padding:0 0 18px}
.disclosure__chevron{color:#161310}
.verified-card{border-radius:0;background:#FFFDF9;border:1px solid rgba(22,19,16,.14)}
.insights{background:transparent;box-shadow:none;border-radius:0;border-top:1px solid #161310;padding:18px 0 6px}
.insights h3{font:700 26px/1 var(--font-display);letter-spacing:0;text-transform:none}
.insights .icon-badge{display:none}
.insights li{color:#4A433B}
.insights li::before{width:6px;height:6px;top:.62em;background:#B5472B;box-shadow:none;transform:none}
.footer-note{color:#4A433B}
.site-footer{color:#4A433B}
.site-footer__link{color:#4A433B}
.site-footer__sep{color:#6B6257}
@media(max-width:599px){.site-footer{flex-direction:column;gap:2px}.site-footer__sep{display:none}}

/* ── tab bar: a full-width ruled paper bar ── */
@media screen and (max-width:900px){
  body.con-pestanas .tabbar{left:0;right:0;bottom:0;width:100%;transform:none;border-radius:0;gap:0;padding:0 4px env(safe-area-inset-bottom,0px);
    background:var(--g-band);border-top:1px solid #161310;box-shadow:none}
  .tabbar__btn{min-height:64px;padding:9px 2px 8px;gap:5px;border-radius:0;background:transparent;color:#6B6257;font-weight:500;letter-spacing:.01em}
  .tabbar__btn.is-activa{background:transparent;color:#161310;font-weight:700}
  .tabbar__btn.is-activa::before{content:"";position:absolute;top:-1px;left:24%;right:24%;height:3px;background:#B5472B}
  .tabbar__cuenta{top:5px;left:calc(50% + 5px);min-width:21px;height:21px;padding:0 4px;border-radius:0;background:#B5472B;color:#FBF6EC;box-shadow:none;font:600 13px/21px var(--font-body);font-variant-numeric:lining-nums tabular-nums}
}

/* ── welcome + questions: paper cover with the shapes and a flat sheet ── */
.onboarding{background:var(--g-paper)}
.onboarding__card{border-radius:0;background:#FFFDF9;box-shadow:0 -1px 0 #161310,0 -6px 0 #FFFDF9,0 -7px 0 #161310}
@media(min-width:640px){.onboarding__card{border-radius:0;box-shadow:0 0 0 1px rgba(22,19,16,.2);border-top:2px solid #161310}}
.onboarding__brand-mark{width:34px;height:34px;border-radius:0;background:__MARK__ center / 34px no-repeat;transform:none}
.onboarding__brand-mark svg{display:none}
.onboarding__brand-name{font:700 24px/1 var(--font-display);letter-spacing:.01em;text-transform:none}
.onboarding__title{letter-spacing:-.005em;color:#161310}
.onboarding__title-accent{background:none;color:#A13D22;padding:0}
.onboarding__summary li{color:#4A433B}
.onboarding__summary li::before{width:7px;height:7px;top:.55em;left:4px;background:#B5472B;box-shadow:none;transform:none}
.onboarding__check input{border:1.5px solid #161310;border-radius:0}
.onboarding__check input:checked{background:#161310}
.onboarding__check input:checked::after{border-color:#FBF6EC}
.onboarding__progress{height:3px;border-radius:0;background:rgba(22,19,16,.14);box-shadow:none}
.onboarding__progress-bar{border-radius:0;background:#B5472B}
.onboarding__progress-label{font:600 13px/1.2 var(--font-body);letter-spacing:.14em;text-transform:uppercase;color:#4A433B}
.onboarding__question{color:#161310}
.onboarding__hint{color:#4A433B}
.onboarding__answer input.onboarding__number,.onboarding__answer input.onboarding__time{min-height:72px;border:0;border-bottom:1.5px solid #161310;border-radius:0;background:transparent;
  font:700 44px/1 var(--font-display);font-variant-numeric:lining-nums tabular-nums;color:#161310;padding:0 8px}
.onboarding__answer input.onboarding__text{border:0;border-bottom:1.5px solid #161310;border-radius:0;background:transparent}
.onboarding__unit{font:600 24px/1 var(--font-display);color:#6B6257}
.onboarding__choice{background:rgba(255,253,249,.9)}
.onboarding__choice-label{font-weight:600}
.onboarding__choice-amount{font-weight:700;color:#161310}
.onboarding__skip,.onboarding__skip-questions{color:#4A433B;font-weight:500}
.onboarding__skip-note{color:#6B6257}

/* ── dialogs and the tour: flat sheets with hairlines ── */
@@SHEET@@{border-radius:0}
.auth-dialog,.ajustes-dialog{border-radius:0;background:#FFFDF9;box-shadow:var(--shadow-2);border-top:2px solid #161310}
@media(min-width:640px){.auth-dialog,.ajustes-dialog{border-radius:0;border:1px solid rgba(22,19,16,.25);border-top:2px solid #161310}}
.auth-dialog::backdrop,.ajustes-dialog::backdrop{background:rgba(22,19,16,.55)}
.ajustes-dialog__head{background:#FFFDF9;border-bottom:1px solid rgba(22,19,16,.18);padding-bottom:16px}
.ajustes-group+.ajustes-group{border-top-color:rgba(22,19,16,.18)}
.ajustes-group__title{font:600 13px/1.2 var(--font-body);letter-spacing:.14em;text-transform:uppercase;color:#4A433B}
.ajustes-group__hint{color:#6B6257}
.ajustes-action{position:relative;border:1px solid rgba(22,19,16,.38);border-radius:0;background:transparent;padding-right:48px}
.ajustes-action::after{content:"";position:absolute;right:16px;top:50%;width:22px;height:10px;margin-top:-5px;background:#161310;
  -webkit-mask:var(--g-arrow) no-repeat right center / auto 10px;mask:var(--g-arrow) no-repeat right center / auto 10px}
.ajustes-action:hover{border-color:#161310}
.auth-dialog__notice-static,.auth-dialog__error,.auth-dialog__notice{border-radius:0}
.legal-dialog__foot{border-top-color:rgba(22,19,16,.18);background:#FFFDF9}
.pantry-item{border-radius:0;background:#FAF5ED}
.pantry-item__amount{border-radius:0;border:1px solid #161310}
.pantry-item__expiry{border-radius:0}
.pantry-empty{border:1px dashed rgba(22,19,16,.4);border-radius:0}
.suggest-list{border-radius:0;box-shadow:var(--shadow-2),0 0 0 1px #161310}
.suggest-list__item{border-radius:0}
.suggest-list__item:hover,.suggest-list__item.is-active{background:#FAEDE5}
.tour__hole,.tour__foco{border-radius:0;box-shadow:0 0 0 100vmax rgba(22,19,16,.72),0 0 0 2px #E7B49B}
.tour__foco{box-shadow:0 0 0 100vmax rgba(22,19,16,.38),0 0 0 2px #E7B49B}
.tour__card{border-radius:0;border-top:2px solid #161310;box-shadow:var(--shadow-2)}
.tour__counter{font:600 13px/1.2 var(--font-body);letter-spacing:.14em;text-transform:uppercase;color:#6B6257}
.tour__title{font-size:26px;text-transform:none}
"""

CSS = (CSS.replace("__TR__", TR).replace("__BL__", BL).replace("__MR__", MR).replace("__GRAIN__", GRAIN)
       .replace("__STAR_T__", STAR_T).replace("__ARROW__", ARROW).replace("__ARROW_L__", ARROW_L)
       .replace("__CHEV__", CHEV).replace("__FOLIO__", FOLIO).replace("__MARK__", MARK))

V = dict(
    id="revista", name="Журнал",
    desc="Кулинарный журнал: тёплая бумага с зерном, тонкой сеткой колонок и крупными геометрическими фигурами в духе Баухауса на фоне. "
         "Прямоугольные чернильные кнопки с длинной стрелкой, подчёркнутые поля и вкладки, карточки блюд и разделы прямо на бумаге под тонкими линейками, с крупными антиквенными цифрами.",
    sw=[PAPER, INK, TERRA, BLUSH, SAGE, PLUM, OCHRE, TEAL],
    fonts=["cormorant-garamond", "inter"], palette=PAL, tokens=TOKENS, css=CSS)
