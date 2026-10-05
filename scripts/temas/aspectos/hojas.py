# -*- coding: utf-8 -*-
"""A · Листва — botanical, soft and friendly.
Sage page with real leafy branches behind the content, chunky 3D buttons that press down,
very round white cards with leaf sprigs, pastel macro tiles, floating tab bar with a raised green bubble.
"""
from arte import *

PAL = dict(
    canvas="#E9F1E3", surface="#FFFFFF", surface_2="#F2F7EE", line="#DDE8D5", line_strong="#C5D6BA", field_line="#7E9A83",
    ink="#1D3527", text_2="#43594A", text_3="#587060",
    primary="#2D7A4E", primary_2="#256A42", primary_3="#3A8F5F", on_ink="#FFFFFF", on_ink_2="#E4F4E8",
    volt="#CFE8AE", volt_hi="#A5CF72", volt_wash="#EAF4DB", on_volt="#1D3527",
    kcal="#F4A36C", kcal_deep="#AE4E1C", kcal_wash="#FDEBDD",
    protein="#EA94AA", protein_deep="#A0304F", protein_wash="#FBE5EB",
    carbs="#E9C45F", carbs_deep="#745608", carbs_wash="#FBF1D0",
    fat="#74C2AE", fat_deep="#1F6F5B", fat_wash="#DDF2EB",
    ok="#23704A", ok_wash="#DDF1E5", warn="#73500E", warn_wash="#FBF0CC",
    danger="#BE3B2D", danger_deep="#912A1E", danger_wash="#FCE6E1", shadow_rgb="29, 53, 39")

# --- art -------------------------------------------------------------------------------------------------
BR_TR = uri(branch(300, 360, fill="#D3E6C8", vein="#B9D4AC", stem="#C3DBB7", seed=11, n=6, rot=180))
BR_BL = uri(branch(340, 400, fill="#D6E8CB", vein="#BCD5AE", stem="#C5DDB9", seed=4, n=7))
BR_MID = uri(branch(220, 260, fill="#D9EACF", vein="#C2DBB5", stem="#C9E0BD", seed=21, n=5, rot=-70))
WALL = uri(leaf_tile(120, fill="#2D7A4E", op=.075))
HERO_TILE = uri(leaf_tile(72, fill="#FFFFFF", op=.11))
LEAF_ICON = uri(svg(24, 24, "<path d='M5 19C4 11 9 5 19 5c0 10-6 15-14 14z' fill='#fff'/><path d='M5 19c3-5 6-8 10-10' stroke='#2D7A4E' stroke-width='1.6' fill='none' stroke-linecap='round'/>"))
SPRIG = uri(svg(120, 120, leaf(112, 8, 125, 54, 17, "#E3F0D8", "#CFE3C2") + leaf(92, 34, 100, 44, 14, "#E9F4DF", "#D5E7C9") +
                leaf(112, 40, 150, 40, 13, "#E9F4DF", "#D5E7C9") + leaf(70, 60, 120, 38, 12, "#EEF6E6", "#D9EACD") +
                "<path d='M120 0 Q96 30 60 70' stroke='#D5E7C9' stroke-width='3' fill='none' stroke-linecap='round'/>"))
HERO_L = uri(svg(150, 120, leaf(10, 118, -65, 100, 30, "#FFFFFF", None, .16) + leaf(36, 120, -40, 78, 24, "#FFFFFF", None, .12) +
                 leaf(-4, 70, -85, 70, 22, "#FFFFFF", None, .10)))
HERO_R = uri(svg(150, 120, leaf(146, 6, 125, 100, 30, "#FFFFFF", None, .16) + leaf(124, 0, 105, 78, 24, "#FFFFFF", None, .12) +
                 leaf(156, 52, 150, 70, 22, "#FFFFFF", None, .10)))
CHECK = uri(svg(14, 14, "<path d='M2.5 7.5l3 3 6-7' stroke='#fff' stroke-width='2.4' fill='none' stroke-linecap='round' stroke-linejoin='round'/>"))
SUN = uri(svg(160, 160, "<circle cx='100' cy='60' r='54' fill='#FFD9B8' opacity='.55'/><circle cx='100' cy='60' r='34' fill='#FFC796' opacity='.55'/>"))

TOKENS = (
    '--font-display:"Nunito",system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;'
    '--font-body:"Nunito",system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;'
    "--r-sm:12px;--r-md:18px;--r-lg:24px;--r-xl:30px;--r-ctl:18px;"
    "--shadow-1:0 2px 3px rgba(29,53,39,.05),0 16px 30px -18px rgba(29,53,39,.34);--shadow-2:0 26px 60px -22px rgba(29,53,39,.5);"
    "--fw-display:800;--fw-fig:800;--fw-btn:800;--fw-label:800;--fw-hero:900;--ls-label:.01em;"
    "--hero-k:5.5;--hero-max:70px;--fs-h2:30px;"
)

CSS = r"""
/* ═════════ A · Листва ═════════ */
html{background:#E9F1E3}
body{background:transparent;font-weight:500}
body::before{content:"";position:fixed;inset:0;z-index:-1;pointer-events:none;
  background:
    __BR_TR__ no-repeat right -120px top -10px / 420px auto,
    __BR_BL__ no-repeat left -130px bottom 40px / 440px auto,
    __BR_MID__ no-repeat left -90px top 36% / 300px auto,
    __WALL__ repeat 0 0 / 120px 120px,
    radial-gradient(90% 38% at 8% 0%, #F8FBF4 0%, rgba(248,251,244,0) 70%),
    linear-gradient(180deg, #EEF5E8 0%, #E3EEDB 100%);}
::selection{background:#CFE8AE}
:focus-visible{outline:3px solid #2D7A4E;outline-offset:2px;box-shadow:0 0 0 6px rgba(165,207,114,.45)}

/* top bar */
.topbar__menu-btn{width:46px;height:46px;border-radius:50%;background:#fff;color:#2D7A4E;box-shadow:var(--shadow-1)}
.topbar__brand{color:#1F5C3C}
.topbar__brand-mark{width:34px;height:34px;border-radius:12px;background:linear-gradient(145deg,#4DA173,#2D7A4E);box-shadow:0 3px 0 #1C5B38}
.topbar__brand-mark svg{display:none}
.topbar__brand-mark{background-image:__LEAF_ICON__,linear-gradient(145deg,#4DA173,#2D7A4E);background-size:20px,auto;background-repeat:no-repeat;background-position:center}
@@PROFILE@@{height:46px;background:#fff;border-radius:999px;box-shadow:var(--shadow-1);color:#1D3527;font-size:var(--fs-sm);font-weight:800}
.topbar__profile-avatar{background:#E4F3D5;color:#2D7A4E}

/* hero: leafy green banner, name only */
.hero{position:relative;border-radius:30px;color:#fff;
  background:
    __HERO_L__ no-repeat left bottom / 150px auto,
    __HERO_R__ no-repeat right top / 150px auto,
    __HERO_TILE__ repeat 0 0 / 72px 72px,
    linear-gradient(135deg,#3F9566 0%,#2D7A4E 55%,#256A42 100%);
  box-shadow:0 4px 0 #1C5B38,0 22px 34px -20px rgba(28,91,56,.75)}
.hero::before,.hero::after{content:none}
.hero__texto{padding:16px 12px 18px}
.hero__nombre{color:#F7FCEF;text-shadow:0 3px 0 rgba(20,70,42,.35)}

/* section titles */
h2{color:#1D3527}
h2 em{background:linear-gradient(transparent 62%,#CFE8AE 62%,#CFE8AE 92%,transparent 92%);padding:0 .12em}
.eyebrow{color:#587060}
.form-section-label::before{width:14px;height:14px;border-radius:0 100% 0 100%;background:#6DB67E;box-shadow:none;transform:none}
@@SECTION_LABEL@@{color:#1F5C3C}
.badge{background:#E1F1D3;color:#1F5C3C;border-radius:999px;height:32px;padding:0 13px}
.badge svg{color:#2D7A4E}

/* cards */
@@PANEL@@{position:relative;border-radius:30px;background:#fff;border:1px solid rgba(45,122,78,.10);box-shadow:var(--shadow-1)}
@@PANEL@@::after{content:"";position:absolute;right:0;top:0;width:110px;height:110px;background:__SPRIG__ no-repeat right top / contain;pointer-events:none;border-radius:0 30px 0 0}
@@PANEL@@>*{position:relative;z-index:1}
.meal-card,.shopping-item,.pantry-active-card,.pantry-history-row,.nocook-slot,.nocook-summary,.insights,.disclosure,.resumen-datos,.shopping-summary__stat{border-radius:26px;box-shadow:var(--shadow-1);border:1px solid rgba(45,122,78,.08)}
.resumen-datos{border-radius:999px;padding:8px 8px 8px 20px}
@@WELL@@{border-radius:16px}

/* ── buttons: chunky, they press down ── */
@@BTN_P@@,@@BTN_CTA@@{border:0;border-radius:20px;color:#fff;
  background:linear-gradient(180deg,#46A56F 0%,#2D7A4E 100%);
  box-shadow:0 5px 0 #1C5B38,0 14px 22px -10px rgba(28,91,56,.6),inset 0 1px 0 rgba(255,255,255,.32);
  text-shadow:0 1px 0 rgba(0,0,0,.2);transition:transform .08s ease,box-shadow .08s ease,filter .15s ease;margin-bottom:5px}
@@BTN_P@@ svg,@@BTN_CTA@@ svg{color:#fff}
@@BTN_P@@:hover,@@BTN_CTA@@:hover{background:linear-gradient(180deg,#4DAD76 0%,#31824F 100%);border-color:transparent}
@@BTN_P@@:active,@@BTN_CTA@@:active{transform:translateY(4px);box-shadow:0 1px 0 #1C5B38,0 6px 10px -6px rgba(28,91,56,.5),inset 0 1px 0 rgba(255,255,255,.2)}
@@BTN_P@@:disabled,@@BTN_CTA@@:disabled{background:#DCE6D6;color:#7E9084;box-shadow:0 5px 0 #C7D4C0;text-shadow:none}
@@BTN_S@@{border:2px solid #CBDDC1;border-radius:20px;background:#fff;color:#1F5C3C;box-shadow:0 4px 0 #CBDDC1;margin-bottom:4px;transition:transform .08s ease,box-shadow .08s ease}
@@BTN_S@@:hover{background:#F3F9EE}
@@BTN_S@@:active{transform:translateY(3px);box-shadow:0 1px 0 #CBDDC1}
@@BTN_S@@ svg{color:#2D7A4E}
.actions-secondary #resetBtn{box-shadow:none;border:0;background:none;color:#587060;margin:0;text-decoration:underline;text-underline-offset:4px}
@@BTN_SM@@{border:0;border-radius:14px;background:#E4F2D6;color:#1F5C3C;box-shadow:0 3px 0 #C9DFB9;margin-bottom:3px}
@@BTN_SM@@:hover{background:#D9ECC8;border-color:transparent;color:#1F5C3C}
@@BTN_SM@@:active{transform:translateY(2px);box-shadow:0 1px 0 #C9DFB9}
.pantry-active-card__delete{background:#fff;color:#912A1E;box-shadow:0 0 0 2px #F0C9C2,0 3px 0 #F0C9C2}
@@BTN_DANGER@@{border-radius:20px;background:#C4412F;box-shadow:0 5px 0 #8F2D20}
.pantry-active-card__buy-btn--secondary svg{color:#2D7A4E}
.link-btn,.pantry-link-btn,.auth-dialog__switch-btn,.onboarding__link,.site-footer__link,.onboarding__skip,.onboarding__skip-questions,.tour__skip{text-decoration-color:#6DB67E}
@@BTN_ICON@@{background:#fff;color:#2D7A4E;box-shadow:var(--shadow-1),0 0 0 1px rgba(45,122,78,.1)}


@@CHIP@@{position:relative;background:#fff;border:2px solid #D3E3CA;border-radius:20px;box-shadow:0 4px 0 #D3E3CA;color:#1D3527}
@@CHIP@@:hover{border-color:#8FC29A}
@@CHIP_ON@@{background:#E4F3D5;border-color:#2D7A4E;box-shadow:0 4px 0 #2D7A4E;color:#1C5B38}
.baldosa.is-activa::after,.visually-hidden:checked + .budget-chip::after,.onboarding__choice.is-selected::after{content:"";position:absolute;top:-9px;right:-7px;width:24px;height:24px;border-radius:50%;
  background:__CHECK__ center / 14px no-repeat,#2D7A4E;box-shadow:0 0 0 3px #fff}
.budget-chip{padding:12px 10px 12px 12px}
.budget-chip__title{letter-spacing:-.01em;font-weight:700}
.visually-hidden:checked + .budget-chip .budget-chip__title{color:#43594A}
.visually-hidden:checked + .budget-chip .budget-chip__amount,.onboarding__choice.is-selected .onboarding__choice-amount{color:#1C5B38}
.onboarding__choice.is-selected .onboarding__choice-note{color:#43594A}
.date-chip--today::after{background:#2D7A4E;box-shadow:0 0 0 1.5px #fff}
.pantry-meal-chip--cooked .pantry-meal-chip__time{color:#1C5B38}
@@SEG@@{background:#E3EEDB;border:0;border-radius:22px;padding:5px;box-shadow:inset 0 2px 5px rgba(29,53,39,.12)}
@@SEG_BTN@@{border-radius:17px;color:#43594A;background:transparent}
@@SEG_ON@@{background:#fff;color:#1C5B38;box-shadow:0 3px 8px -2px rgba(29,53,39,.3),0 0 0 1px rgba(45,122,78,.12)}
@@STEP@@{background:#F3F8EE;border:1.5px solid var(--field-line);border-radius:26px;padding:4px;gap:2px}
@@STEP@@:focus-within{border-color:#2D7A4E;background:#fff}
@@STEP_BTN@@{border-radius:50%;background:#fff;color:#2D7A4E;font-weight:800;box-shadow:0 0 0 2px #CBDDC1,0 3px 0 #CBDDC1}
@@STEP_PLUS@@{background:#2D7A4E;color:#fff;box-shadow:0 3px 0 #1C5B38}
@@FIELD@@{background:#F6FAF2;border:1.5px solid var(--field-line);border-radius:18px;font-weight:600}
@@FIELD@@:focus{border-color:#2D7A4E;background:#fff;box-shadow:0 0 0 4px rgba(45,122,78,.14)}
.field>label{color:#43594A}
.field-hint{color:#587060}

/* scoreboard: calories hero tile + three pastel macro tiles */
.nutrition-strip{background:none;box-shadow:none;padding:0;gap:10px;overflow:visible;border-radius:0}
.summary-card{border:0!important;border-radius:26px;padding:14px 12px 16px;background:#fff;box-shadow:var(--shadow-1);color:#1D3527}
.summary-card--calories{position:relative;overflow:hidden;padding:18px 18px 20px;background:__SUN__ no-repeat right -10px top -20px / 190px,linear-gradient(135deg,#FFF4EA 0%,#FFE6D2 100%)}
.summary-card--protein{background:#FDEEF2}.summary-card--carbs{background:#FDF6DF}.summary-card--fat{background:#E5F5EE}
.summary-card h3{color:#43594A}
.summary-card .sub{color:#43594A}
.summary-card--calories .big{color:var(--kcal-deep)}
.summary-card--protein .big{color:var(--protein-deep)}.summary-card--carbs .big{color:var(--carbs-deep)}.summary-card--fat .big{color:var(--fat-deep)}
.icon-badge{width:28px;height:28px;border-radius:50%}
.summary-card--calories .icon-badge{background:#fff;color:var(--kcal-deep)}.summary-card--protein .icon-badge{background:#fff;color:var(--protein-deep)}
.summary-card--carbs .icon-badge{background:#fff;color:var(--carbs-deep)}.summary-card--fat .icon-badge{background:#fff;color:var(--fat-deep)}
.insights .icon-badge{background:#E1F1D3;color:#2D7A4E}
@container (min-width:620px){.nutrition-strip{grid-template-columns:1.4fr repeat(3,minmax(0,1fr))}.summary-card--calories{grid-column:auto}}

/* timeline, day header, meal cards */
.schedule-timeline__item{border:0;border-radius:22px;background:#fff;box-shadow:var(--shadow-1)}
.schedule-timeline__item--next{background:#DDEFCB;box-shadow:0 0 0 2px #8CC79A,var(--shadow-1)}
.schedule-timeline__next-tag{background:#2D7A4E;color:#fff}
.schedule-timeline__time{color:#1D3527}
.day-slide__head::after{height:6px;border-radius:3px;background:repeating-linear-gradient(90deg,#B9D9A6 0 10px,transparent 10px 18px)}
.days-carousel__dot.is-active::before{background:#2D7A4E}
.days-carousel__arrow{background:#2D7A4E;color:#fff}
.meal-time-badge{height:36px;padding:0 12px;border-radius:14px;background:#E1F1D3;color:#1C5B38}
.meal-kcal{color:var(--kcal-deep)}
.meal-items{border-top:2px dotted #D3E3CA}
.food-row{border-bottom:2px dotted #DCE8D3}
.food-macro__badge,.food-purchase__badge{background:#E1F1D3;color:#1F5C3C}
.food-purchase{background:#EEF6E4;box-shadow:none;border-radius:14px}
.meal-footer{background:#F3F8EE;border-top:0}
.meal-footer>div::before{height:6px;border-radius:3px}
.meal-steps{border-top:2px dotted #D3E3CA}
.meal-steps__toggle::after{border-color:#2D7A4E}
.meal-steps__list li::before{border-radius:50%;background:#2D7A4E;color:#fff}
.meal-make-ahead,.meal-cook-note{border-radius:14px;box-shadow:none}
.next-meal-sticky__btn{border-radius:22px;background:#DDEFCB;box-shadow:0 4px 0 #A9CF9C,0 14px 24px -14px rgba(29,53,39,.5)}
.next-meal-sticky__eyebrow{background:#2D7A4E;color:#fff}

/* shopping */
.shopping-summary__stat:nth-child(2){background:linear-gradient(135deg,#3F9566 0%,#2D7A4E 60%,#256A42 100%);border:0;box-shadow:0 5px 0 #1C5B38,0 18px 28px -16px rgba(28,91,56,.7)}
.shopping-summary__stat:nth-child(2) span{color:#E4F4E8}.shopping-summary__stat:nth-child(2) strong{color:#fff}
.shopping-progress__barra{background:#D9E8CF;padding:3px;height:18px}
.shopping-progress__barra>span{background:linear-gradient(90deg,#8BCB86,#2D7A4E)}
.shopping-item__check::before,.pantry-purchase-row__check::before{border-color:#6DB67E}
.shopping-item__check[aria-checked="true"]::before,.pantry-purchase-row__check[aria-checked="true"]::before{background:#2D7A4E;border-color:#2D7A4E}
.shopping-item__check[aria-checked="true"]::after,.pantry-purchase-row__check[aria-checked="true"]::after{border-color:#fff}
.shopping-item.is-comprado{background:#F1F6EC}
.product-find-btn{background:#E4F2D6;box-shadow:none}
.confirm-receipt{background:#EEF6E4;box-shadow:none;border-radius:16px}

/* floating tab bar with a raised green bubble */
@media screen and (max-width:900px){
  body.con-pestanas .tabbar{background:#fff;border-radius:32px;padding:8px 6px 6px;gap:0;box-shadow:0 20px 40px -14px rgba(29,53,39,.5),0 0 0 1px rgba(45,122,78,.10)}
  .tabbar__btn{min-height:62px;color:#587060;font-weight:800;background:transparent;border-radius:24px}
  .tabbar__btn.is-activa{background:transparent;color:#1C5B38}
  .tabbar__btn svg{transition:transform .18s ease}
  .tabbar__btn.is-activa svg{box-sizing:border-box;width:46px;height:46px;padding:11px;border-radius:50%;margin-bottom:-12px;transform:translateY(-14px);
    background:linear-gradient(180deg,#46A56F,#2D7A4E);color:#fff;box-shadow:0 4px 0 #1C5B38,0 0 0 5px #fff}
  .tabbar__cuenta{background:#C4412F;color:#fff;box-shadow:0 0 0 2.5px #fff;top:2px;left:calc(50% + 4px)}
  .tabbar__btn.is-activa .tabbar__cuenta{top:-16px;left:calc(50% + 14px)}
}

/* welcome + questions */
.onboarding{background:
    __BR_TR__ no-repeat right -90px top 10px / 300px auto,
    __HERO_TILE__ repeat 0 0 / 72px 72px,
    linear-gradient(170deg,#3F9566 0%,#2D7A4E 45%,#1F5C3C 100%)}
.onboarding__card{border-radius:34px 34px 0 0;box-shadow:0 -20px 50px -20px rgba(20,60,38,.55)}
@media(min-width:640px){.onboarding__card{border-radius:34px}}
.onboarding__brand-mark{border-radius:13px;background:linear-gradient(145deg,#4DA173,#2D7A4E);box-shadow:0 3px 0 #1C5B38;color:#fff}
.onboarding__title{color:#1D3527}
.onboarding__title-accent{background:linear-gradient(transparent 60%,#CFE8AE 60%,#CFE8AE 92%,transparent 92%)}
.onboarding__summary li::before{width:14px;height:14px;border-radius:0 100% 0 100%;background:#6DB67E;box-shadow:none;transform:none}
.onboarding__check input{border-color:#2D7A4E;border-radius:9px}.onboarding__check input:checked{background:#2D7A4E}.onboarding__check input:checked::after{border-color:#fff}
.onboarding__progress{background:#E3EEDB;box-shadow:none}.onboarding__progress-bar{background:linear-gradient(90deg,#8BCB86,#2D7A4E)}
.onboarding__progress-label{color:#587060}
.onboarding__number,.onboarding__time,.onboarding__text{background:#F6FAF2;border:1.5px solid var(--field-line);border-radius:22px}
.onboarding__unit{color:#587060}
.tour__hole,.tour__foco{box-shadow:0 0 0 100vmax rgba(20,50,34,.72),0 0 0 3px #A5CF72}
.tour__card{border-radius:26px}
.auth-dialog,.ajustes-dialog{border-radius:32px 32px 0 0}
@media(min-width:640px){.auth-dialog,.ajustes-dialog{border-radius:32px}}
.auth-dialog::backdrop,.ajustes-dialog::backdrop{background:rgba(20,50,34,.6)}
.ajustes-choice__btn[aria-checked="true"]{color:#1C5B38}
.ajustes-action{border-radius:18px;border:2px solid #CBDDC1}
.site-footer,.footer-note{color:#43594A}
.disclosure__chevron{color:#2D7A4E}
"""

CSS = (CSS.replace("__BR_TR__", BR_TR).replace("__BR_BL__", BR_BL).replace("__HERO_TILE__", HERO_TILE)
       .replace("__LEAF_ICON__", LEAF_ICON).replace("__SPRIG__", SPRIG).replace("__HERO_L__", HERO_L)
       .replace("__HERO_R__", HERO_R).replace("__CHECK__", CHECK).replace("__SUN__", SUN).replace("__BR_MID__", BR_MID).replace("__WALL__", WALL))

V = dict(
    id="hojas", name="Листва",
    desc="Ботанический и дружелюбный: салатовая «бумага» с живыми ветками на фоне, объёмные кнопки, которые продавливаются, круглые карточки, нижняя панель с зелёным «пузырём».",
    sw=["#E9F1E3", "#FFFFFF", "#2D7A4E", "#CFE8AE", "#F4A36C", "#EA94AA", "#E9C45F", "#74C2AE"],
    fonts=["nunito"], palette=PAL, tokens=TOKENS, css=CSS)
