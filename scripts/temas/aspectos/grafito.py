# -*- coding: utf-8 -*-
"""I · Графит — тёмное приложение без декора (2026-10-22, этап 2 редизайна).
Графитовый фон, карточки чуть светлее с тонкой кромкой, акцент — лайм (#C8F04A): кнопки,
выбранные плитки, индикатор нижней панели. Никаких рисунков на фоне: только цвет и свет.
Собран из «Ночного леса» (noche.py) — та же раскладка — с графитовой палитрой и без горизонталей,
звёзд и орбит. Шрифты: Manrope (заголовки, цифры) и Inter (текст).
"""
from arte import *

PAL = dict(
    canvas="#15171B", surface="#1E2126", surface_2="#262A30", line="#30353C", line_strong="#3D434C", field_line="#59616C",
    ink="#ECEEF1", text_2="#B9BEC6", text_3="#9097A1",
    primary="#C8F04A", primary_2="#B8E336", primary_3="#D7F57A", on_ink="#171A0B", on_ink_2="#2C3410",
    volt="#C8F04A", volt_hi="#B5DF3A", volt_wash="#2A3318", on_volt="#15171B",
    kcal="#FF9473", kcal_deep="#FF9473", kcal_wash="#3A231B",
    protein="#B9A8FF", protein_deep="#B9A8FF", protein_wash="#2A2540",
    carbs="#F5C65A", carbs_deep="#F5C65A", carbs_wash="#3A3017",
    fat="#63D8E8", fat_deep="#63D8E8", fat_wash="#133539",
    ok="#A9E37C", ok_wash="#23301A", warn="#F5C65A", warn_wash="#3A2E12",
    danger="#C23B2C", danger_deep="#FF9C8F", danger_wash="#3D1D1A", shadow_rgb="0, 0, 0")

CHECK = uri(svg(14, 14, "<path d='M3.2 7.4l2.5 2.5 5.1-5.6' stroke='#171A0B' stroke-width='2.2' fill='none' stroke-linecap='round' stroke-linejoin='round'/>"))
ARROW = uri(svg(24, 24, "<path d='M6 9l6 6 6-6' stroke='#B9BEC6' stroke-width='2.2' fill='none' stroke-linecap='round' stroke-linejoin='round'/>"))

TOKENS = (
    '--font-display:"Manrope",system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;'
    '--font-body:"Inter",system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;'
    '--font-label:"Manrope",system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;'
    "--r-sm:12px;--r-md:16px;--r-lg:22px;--r-xl:26px;--r-ctl:16px;"
    "--shadow-1:0 1px 0 rgba(0,0,0,.25),0 18px 40px -22px rgba(0,0,0,.85);--shadow-2:0 30px 70px -20px rgba(0,0,0,.85);"
    "--fw-display:800;--fw-fig:800;--fw-btn:700;--fw-label:700;--fw-hero:800;"
    "--ls-label:.08em;--tt-label:uppercase;"
    "--hero-k:7.2;--hero-max:84px;--fs-fig-m:24px;"
    "--h-card:linear-gradient(90deg,rgba(255,255,255,0) 6%,rgba(255,255,255,.12) 38%,rgba(255,255,255,0) 78%) top / 100% 1px no-repeat,linear-gradient(160deg,#212429 0%,#1B1E22 100%);"
    "--h-lima:linear-gradient(180deg,rgba(255,255,255,.22),rgba(255,255,255,0) 55%),linear-gradient(115deg,#C8F04A 0%,#BEEA3E 60%,#B4E33A 100%);"
)

CSS = r"""
/* ═════════ I · Графит ═════════ */
:root{color-scheme:dark}
html{background:#131519}
body{background:transparent;color:#ECEEF1}
body::before{content:"";position:fixed;inset:0;z-index:-1;pointer-events:none;
  background:
    radial-gradient(70% 40% at 0% 0%, rgba(200,240,74,.06), rgba(200,240,74,0) 70%),
    linear-gradient(180deg,#191B20 0%,#15171B 55%,#131519 100%);}
::selection{background:rgba(200,240,74,.35);color:#fff}
:focus-visible,.visually-hidden:focus-visible + .budget-chip,.visually-hidden:focus-visible + .date-chip{outline:2px solid #C8F04A;outline-offset:2px;box-shadow:0 0 0 5px rgba(200,240,74,.22)}
::placeholder{color:#9097A1}
.link-btn,.pantry-link-btn,.auth-dialog__switch-btn,.onboarding__link,.site-footer__link,.onboarding__skip,.onboarding__skip-questions,.tour__skip{text-decoration-color:rgba(200,240,74,.55)}
.link-btn:hover,.pantry-link-btn:hover,.auth-dialog__switch-btn:hover,.onboarding__link:hover,.site-footer__link:hover{text-decoration-color:#C8F04A}

/* ── top bar ── */
.topbar__brand{color:#F2F3F5}
.topbar__brand-mark{width:34px;height:34px;border-radius:11px;background:var(--h-lima);color:#171A0B;box-shadow:inset 0 1px 0 rgba(255,255,255,.5),0 6px 18px -6px rgba(200,240,74,.75)}
@@BTN_ICON@@{background:rgba(32,35,40,.78);color:#ECEEF1;box-shadow:inset 0 0 0 1px rgba(255,255,255,.1),inset 0 1px 0 rgba(255,255,255,.06),0 10px 22px -14px rgba(0,0,0,.9)}
@@BTN_ICON@@:hover{box-shadow:inset 0 0 0 1px rgba(200,240,74,.55),0 0 14px -4px rgba(200,240,74,.5)}
.topbar__menu-btn{width:46px;height:46px;border-radius:50%}
@@PROFILE@@{height:46px;border-radius:999px;background:rgba(32,35,40,.78);color:#ECEEF1;font-size:var(--fs-sm);font-weight:600;box-shadow:inset 0 0 0 1px rgba(255,255,255,.1),inset 0 1px 0 rgba(255,255,255,.06),0 10px 22px -14px rgba(0,0,0,.9)}
.topbar__profile-avatar{background:rgba(200,240,74,.12);color:#D4F27A;box-shadow:inset 0 0 0 1px rgba(200,240,74,.45)}
.topbar__menu{background:#1F2227;box-shadow:var(--shadow-2),0 0 0 1px rgba(255,255,255,.08)}
.topbar__menu-item:hover{background:rgba(255,255,255,.05)}
.topbar__menu-email{color:#9097A1;border-bottom-color:rgba(255,255,255,.08)}
.traduccion-aviso{background:var(--h-card);box-shadow:var(--shadow-1),inset 3px 0 0 #C8F04A}

/* ── hero: graphite banner, lime hairlines, the name lit in lime ── */
.hero{position:relative;border-radius:24px;color:#F2F3F5;
  background:
    radial-gradient(55% 95% at 50% 50%, rgba(200,240,74,.15), rgba(200,240,74,0) 72%),
    linear-gradient(135deg,#24282E 0%,#1C1F24 52%,#17191D 100%);
  border:1px solid rgba(255,255,255,.08);
  box-shadow:inset 0 1px 0 rgba(255,255,255,.14),0 24px 48px -26px rgba(0,0,0,.95)}
.hero::before,.hero::after{content:"";height:2px;margin:12px 22% 0;background:linear-gradient(90deg,rgba(200,240,74,0),rgba(200,240,74,.85),rgba(200,240,74,0))}
.hero::after{margin:0 22% 12px}
.hero__texto{padding:8px 12px 10px}
.hero__nombre{color:#F2F3F5;text-transform:uppercase;letter-spacing:.07em;text-shadow:0 0 26px rgba(200,240,74,.42),0 0 3px rgba(200,240,74,.25)}

/* ── section titles ── */
h2{color:#F2F3F5}
h2 em{background:none;color:#D4F27A;padding:0;margin:0}
.eyebrow{color:#A2A8B1}
.badge{height:32px;padding:0 12px;border-radius:999px;background:rgba(200,240,74,.07);color:#B9BEC6;box-shadow:inset 0 0 0 1px rgba(200,240,74,.24)}
.badge svg{color:#C8F04A}
.form-section-label{color:#D4F27A}
.form-section-label::before{width:8px;height:8px;border-radius:50%;background:#C8F04A;box-shadow:0 0 0 3px rgba(200,240,74,.16),0 0 12px rgba(200,240,74,.85)}
.budget-group-label,.field>label,.budget-custom-field>label{font-family:var(--font-body);font-size:var(--fs-sm);font-weight:600;text-transform:none;letter-spacing:0;color:#B9BEC6}
.field-hint{color:#9097A1}
.field-hint strong{color:#D7DADF}

/* ── surfaces: graphite cards, hairline border, soft top-edge highlight ── */
@@PANEL@@{position:relative;border-radius:26px;background:var(--h-card);border:1px solid rgba(255,255,255,.07);box-shadow:var(--shadow-1)}
@@PANEL@@>*{position:relative;z-index:1}
@@CARD@@{background:var(--h-card);border:1px solid rgba(255,255,255,.07);border-radius:22px;box-shadow:var(--shadow-1)}
.resumen-datos{border-radius:22px;padding:8px 8px 8px 18px}
.resumen-datos__texto{color:#B9BEC6}
@@WELL@@{background:rgba(255,255,255,.035);border-radius:14px;box-shadow:inset 0 0 0 1px rgba(255,255,255,.06)}
.meta{padding:10px 6px 10px 11px}
.meta .k{font-family:var(--font-body);font-weight:500;text-transform:none;letter-spacing:-.01em;color:#A9AFB8}
.meta .v{color:#ECEEF1}

/* ── buttons ── */
@@BTN_P@@,@@BTN_CTA@@{border:0;border-radius:18px;color:#171A0B;background:var(--h-lima);
  box-shadow:0 10px 30px -8px rgba(200,240,74,.55),inset 0 1px 0 rgba(255,255,255,.6),inset 0 -2px 0 rgba(23,26,11,.14);
  transition:transform .1s ease,box-shadow .15s ease,filter .15s ease}
@@BTN_P@@ svg,@@BTN_CTA@@ svg{color:#171A0B}
@@BTN_P@@:hover,@@BTN_CTA@@:hover{background:var(--h-lima);border-color:transparent;filter:brightness(1.06);box-shadow:0 12px 34px -8px rgba(200,240,74,.72),inset 0 1px 0 rgba(255,255,255,.6),inset 0 -2px 0 rgba(23,26,11,.14)}
@@BTN_P@@:active,@@BTN_CTA@@:active{transform:translateY(1px);filter:none;box-shadow:0 3px 12px -5px rgba(200,240,74,.5),inset 0 1px 0 rgba(255,255,255,.35),inset 0 2px 7px rgba(23,26,11,.2)}
@@BTN_P@@:disabled,@@BTN_CTA@@:disabled{background:linear-gradient(115deg,rgba(200,240,74,.16),rgba(182,229,149,.1));color:#8F959E;filter:none;transform:none;
  box-shadow:inset 0 0 0 1px rgba(200,240,74,.2),inset 0 1px 0 rgba(255,255,255,.06)}
@@BTN_S@@{border:1.5px solid transparent;border-radius:18px;color:#D4F27A;
  background:linear-gradient(180deg,#23262B,#1C1F24) padding-box,linear-gradient(120deg,#C8F04A,rgba(200,240,74,.22) 55%,#E5F7A0) border-box;
  box-shadow:0 10px 24px -16px rgba(0,0,0,.9);transition:transform .1s ease,box-shadow .15s ease}
@@BTN_S@@ svg{color:#C8F04A}
@@BTN_S@@:hover{color:#E0F79C;background:linear-gradient(180deg,#2A2E34,#23272C) padding-box,linear-gradient(120deg,#D4F27A,rgba(200,240,74,.5) 55%,#E5F7A0) border-box;box-shadow:0 0 18px -6px rgba(200,240,74,.45)}
@@BTN_S@@:active{transform:translateY(1px);box-shadow:0 0 0 4px rgba(200,240,74,.12)}
@@BTN_S@@:disabled{background:rgba(255,255,255,.02);border:1.5px solid rgba(200,240,74,.2);color:#8A9099;box-shadow:none;transform:none}
.actions-secondary #resetBtn{border:0;background:none;box-shadow:none;color:#B9BEC6;text-decoration:underline;text-decoration-color:rgba(200,240,74,.55);text-underline-offset:4px}
@@BTN_SM@@{border:1px solid rgba(255,255,255,.13);border-radius:999px;background:rgba(255,255,255,.045);color:#ECEEF1;box-shadow:inset 0 1px 0 rgba(255,255,255,.05);transition:border-color .15s ease,background-color .15s ease,transform .1s ease}
@@BTN_SM@@:hover{border-color:rgba(200,240,74,.55);background:rgba(200,240,74,.08);color:#ECEEF1}
@@BTN_SM@@:active{transform:translateY(1px)}
.pantry-active-card__delete{color:#FFA396;border-color:rgba(255,140,120,.35)}
.pantry-active-card__delete.pantry-active-card__delete--armed{background:#C23B2C;border-color:#C23B2C;color:#fff}
.pantry-active-card__buy-btn.pantry-active-card__buy-btn--secondary{border:1.5px solid transparent;color:#D4F27A;box-shadow:none;
  background:linear-gradient(180deg,#23262B,#1C1F24) padding-box,linear-gradient(120deg,#C8F04A,rgba(200,240,74,.22) 55%,#E5F7A0) border-box}
.pantry-active-card__buy-btn--secondary svg{color:#C8F04A}
@@BTN_DANGER@@{border-radius:18px;background:linear-gradient(180deg,#CF4635,#B5372A);color:#fff;box-shadow:0 10px 26px -10px rgba(220,80,60,.6),inset 0 1px 0 rgba(255,255,255,.25)}

/* ── chips & tiles: graphite, hairline; selected = lime outline + check dot ── */
@@CHIP@@{position:relative;background:linear-gradient(180deg,#262A30,#22252A);border:1px solid rgba(255,255,255,.11);border-radius:16px;color:#ECEEF1;
  box-shadow:inset 0 1px 0 rgba(255,255,255,.04);transition:border-color .15s ease,box-shadow .15s ease}
@@CHIP@@:hover{border-color:rgba(200,240,74,.5)}
@@CHIP_ON@@{border-color:#C8F04A;color:#F5F6F7;background:linear-gradient(180deg,rgba(200,240,74,.17),rgba(200,240,74,.06)),#24271F;
  box-shadow:0 0 0 1px rgba(200,240,74,.28),0 10px 26px -12px rgba(200,240,74,.55),inset 0 1px 0 rgba(255,255,255,.08)}
.baldosa.is-activa::after,.visually-hidden:checked + .budget-chip::after,.onboarding__choice.is-selected::after{content:"";position:absolute;top:-8px;right:-8px;width:20px;height:20px;border-radius:50%;
  background:__CHECK__ center / 12px no-repeat,linear-gradient(140deg,#D7F57A,#B4E33A);box-shadow:0 0 0 3px #1F2227,0 0 14px rgba(200,240,74,.75)}
.budget-chip{padding:12px 10px 12px 12px}
.budget-chip__title{font:600 13px/1.25 var(--font-body);text-transform:none;letter-spacing:0;color:#B9BEC6}
.budget-chip__amount{color:#F2F3F5}
.visually-hidden:checked + .budget-chip .budget-chip__title{color:#D7DADF}
.visually-hidden:checked + .budget-chip .budget-chip__amount,.onboarding__choice.is-selected .onboarding__choice-amount{color:#D4F27A}
.onboarding__choice.is-selected .onboarding__choice-note{color:#B9BEC6}
.date-chip{border-radius:999px}
.date-chip--today::after{background:#C8F04A;box-shadow:0 0 0 2px rgba(200,240,74,.18),0 0 10px rgba(200,240,74,.85)}
.pantry-meal-chip__time{color:var(--kcal-deep)}
.pantry-meal-chip--cooked .pantry-meal-chip__time{color:#D4F27A}
@@SEG@@{background:#121418;border:1px solid rgba(255,255,255,.08);border-radius:18px;padding:4px;box-shadow:inset 0 2px 8px rgba(0,0,0,.45)}
@@SEG_BTN@@{border-radius:14px;color:#B9BEC6;background:transparent}
@@SEG_ON@@{background:var(--h-lima);color:#171A0B;box-shadow:0 6px 18px -6px rgba(200,240,74,.65),inset 0 1px 0 rgba(255,255,255,.55)}
@@STEP@@{background:#262A30;border:1.5px solid var(--field-line);border-radius:24px}
@@STEP@@:focus-within{border-color:#C8F04A;background:#262A30;box-shadow:0 0 0 4px rgba(200,240,74,.16)}
.paso-a-paso input[type="number"]{background:transparent;border:0;box-shadow:none;color:#F5F6F7}
@@STEP_BTN@@{border-radius:50%;background:radial-gradient(circle at 50% 28%,#343941,#262A30);color:#CED2D8;font-weight:400;
  box-shadow:inset 0 0 0 1px rgba(255,255,255,.1),inset 0 1px 0 rgba(255,255,255,.08)}
@@STEP_PLUS@@{background:radial-gradient(circle at 50% 28%,#363B2A,#272B22);color:#D4F27A;box-shadow:inset 0 0 0 1.5px rgba(200,240,74,.65),0 0 16px -4px rgba(200,240,74,.6)}
@@FIELD@@{background-color:#262A30;border:1.5px solid var(--field-line);border-radius:16px;color:#ECEEF1}
@@FIELD@@:focus{border-color:#C8F04A;background-color:#2A2E34;box-shadow:0 0 0 4px rgba(200,240,74,.18)}
select{background-image:__ARROW__;background-repeat:no-repeat;background-position:right 14px center;background-size:20px 20px}

/* ── scoreboard: graphite tiles, a soft coloured glow behind each figure ── */
.nutrition-strip{background:none;box-shadow:none;padding:0;gap:10px;overflow:visible;border-radius:0;color:#ECEEF1}
.summary-card{overflow:hidden;border:1px solid rgba(255,255,255,.07);border-radius:22px;padding:14px 12px 16px;background:var(--h-card);box-shadow:var(--shadow-1);color:#ECEEF1}
.summary-card--calories{padding:18px 18px 20px;
  background:radial-gradient(42% 62% at 24% 64%,rgba(255,148,115,.2),rgba(255,148,115,0) 72%),var(--h-card)}
.summary-card--protein{background:radial-gradient(75% 42% at 34% 60%,rgba(185,168,255,.2),rgba(185,168,255,0) 72%),var(--h-card)}
.summary-card--carbs{background:radial-gradient(75% 42% at 34% 60%,rgba(245,198,90,.17),rgba(245,198,90,0) 72%),var(--h-card)}
.summary-card--fat{background:radial-gradient(75% 42% at 34% 60%,rgba(99,216,232,.17),rgba(99,216,232,0) 72%),var(--h-card)}
.summary-card h3{color:#B9BEC6}
.summary-card .sub{color:#A9AFB8;text-wrap:balance}
.summary-card .big{color:#F2F3F5}
.summary-card--calories .big{color:var(--kcal-deep);text-shadow:0 0 26px rgba(255,148,115,.38)}
.summary-card--protein .big{color:var(--protein-deep);text-shadow:0 0 22px rgba(185,168,255,.35)}
.summary-card--carbs .big{color:var(--carbs-deep);text-shadow:0 0 22px rgba(245,198,90,.3)}
.summary-card--fat .big{color:var(--fat-deep);text-shadow:0 0 22px rgba(99,216,232,.3)}
.icon-badge{width:28px;height:28px;border-radius:50%}
.summary-card--calories .icon-badge{background:rgba(255,148,115,.14);color:#FF9473;box-shadow:inset 0 0 0 1px rgba(255,148,115,.5)}
.summary-card--protein .icon-badge{background:rgba(185,168,255,.14);color:#B9A8FF;box-shadow:inset 0 0 0 1px rgba(185,168,255,.5)}
.summary-card--carbs .icon-badge{background:rgba(245,198,90,.13);color:#F5C65A;box-shadow:inset 0 0 0 1px rgba(245,198,90,.45)}
.summary-card--fat .icon-badge{background:rgba(99,216,232,.13);color:#63D8E8;box-shadow:inset 0 0 0 1px rgba(99,216,232,.45)}
.insights .icon-badge{background:rgba(200,240,74,.12);color:#C8F04A;box-shadow:inset 0 0 0 1px rgba(200,240,74,.45)}
@container (min-width:620px){.nutrition-strip{grid-template-columns:1.4fr repeat(3,minmax(0,1fr))}
  .summary-card--calories{grid-column:auto;background:radial-gradient(70% 45% at 30% 62%,rgba(255,148,115,.2),rgba(255,148,115,0) 72%),var(--h-card)}}

/* ── timeline, day header, meal cards ── */
.schedule-timeline__item{border:1px solid rgba(255,255,255,.1);border-radius:22px;padding:12px 16px 14px;background:linear-gradient(160deg,#212429,#1B1E22);box-shadow:0 14px 28px -20px rgba(0,0,0,.95);color:#ECEEF1}
.schedule-timeline__item:hover{border-color:rgba(200,240,74,.5)}
.schedule-timeline__item--next{border-color:rgba(200,240,74,.9);
  background:radial-gradient(110% 90% at 0% 0%,rgba(200,240,74,.18),rgba(200,240,74,0) 62%),linear-gradient(160deg,#262B1E,#1D2024);
  box-shadow:0 0 0 1px rgba(200,240,74,.22),0 10px 30px -12px rgba(200,240,74,.45)}
.schedule-timeline__time{color:#F2F3F5}
.schedule-timeline__item--next .schedule-timeline__time{color:#D4F27A}
.schedule-timeline__label,.schedule-timeline__item--next .schedule-timeline__label{color:#B9BEC6}
.schedule-timeline__next-tag{background:var(--h-lima);color:#171A0B;box-shadow:0 0 12px -2px rgba(200,240,74,.6)}
.schedule-timeline__note{color:#9097A1}
.day-slide__n{color:#F2F3F5}
.day-slide__of{color:#9097A1}
.day-slide__head::after{height:1px;border-radius:0;background:linear-gradient(90deg,rgba(200,240,74,.8),rgba(200,240,74,0))}
.days-carousel__hint{color:#9097A1}
.days-carousel__dot::before{background:#4A505A}
.days-carousel__dot.is-active::before{background:#C8F04A;box-shadow:0 0 10px rgba(200,240,74,.75)}
.days-carousel__arrow{background:rgba(30,33,38,.88);color:#D4F27A;box-shadow:inset 0 0 0 1px rgba(200,240,74,.45),0 12px 26px -10px rgba(0,0,0,.85)}
.meal-head h3{color:#F2F3F5}
.meal-time-badge{height:36px;padding:0 12px;border-radius:12px;background:rgba(200,240,74,.1);color:#D4F27A;box-shadow:inset 0 0 0 1px rgba(200,240,74,.42)}
.meal-kcal{color:var(--kcal-deep)}
.meal-items{border-top:1px solid rgba(255,255,255,.08)}
.food-row{border-bottom:1px solid rgba(255,255,255,.06)}
.food-name,.food-qty,.food-cost{color:#ECEEF1}
.food-meta,.food-cost--package{color:#B9BEC6}
.food-qty__grams,.food-macro__unavailable{color:#9097A1}
.food-cost__tag{font-family:var(--font-body);text-transform:none;letter-spacing:0;font-weight:600;color:#9097A1}
.food-macro__badge,.food-purchase__badge{border-radius:999px;background:rgba(200,240,74,.1);color:#D4F27A;box-shadow:inset 0 0 0 1px rgba(200,240,74,.26);font-family:var(--font-body);text-transform:none;letter-spacing:0}
.food-purchase{background:rgba(200,240,74,.05);border-radius:12px;box-shadow:inset 2px 0 0 rgba(200,240,74,.6),inset 0 0 0 1px rgba(200,240,74,.08);color:#DEE1E5}
.meal-footer{background:rgba(0,0,0,.2);border-top:1px solid rgba(255,255,255,.06)}
.meal-footer>div{font-family:var(--font-body);text-transform:none;letter-spacing:0;font-weight:600;color:#A9AFB8}
.meal-footer strong{color:#F2F3F5}
.meal-footer>div::before{height:3px;border-radius:2px}
.meal-footer>div:nth-child(1)::before{background:#B9A8FF;box-shadow:0 0 8px rgba(185,168,255,.6)}
.meal-footer>div:nth-child(2)::before{background:#F5C65A;box-shadow:0 0 8px rgba(245,198,90,.5)}
.meal-footer>div:nth-child(3)::before{background:#63D8E8;box-shadow:0 0 8px rgba(99,216,232,.5)}
.meal-footer>div:nth-child(4)::before{background:#C8F04A;box-shadow:0 0 8px rgba(200,240,74,.55)}
.meal-footer>div:nth-child(5)::before{background:#4A505A}
.meal-steps{border-top:1px solid rgba(255,255,255,.08)}
.meal-steps__toggle{color:#F2F3F5}
.meal-steps__toggle::after{border-color:#C8F04A}
.meal-steps__equipment{color:#9097A1}
.meal-steps__list li{color:#D7DADF}
.meal-steps__list li::before{border-radius:50%;background:rgba(200,240,74,.1);color:#D4F27A;box-shadow:inset 0 0 0 1px rgba(200,240,74,.45)}
.meal-make-ahead,.meal-cook-note,.warning,.nocook-summary__warn,.plan-days-note{border-radius:12px;background:rgba(245,198,90,.08);color:#F5D27E;box-shadow:inset 3px 0 0 #F5C65A}
.warning--error{background:rgba(255,120,100,.09);color:#FFB0A4;box-shadow:inset 3px 0 0 #FF8A75}
.meal-card--empty{border:1.5px dashed rgba(255,255,255,.14);background:rgba(255,255,255,.02);box-shadow:none}
.meal-card--empty p{color:#B9BEC6}
.empty-icon{background:rgba(200,240,74,.1);color:#D4F27A;box-shadow:inset 0 0 0 1px rgba(200,240,74,.4)}
.next-meal-sticky__btn{border-radius:20px;background:rgba(24,26,30,.82);-webkit-backdrop-filter:blur(16px) saturate(140%);backdrop-filter:blur(16px) saturate(140%);color:#ECEEF1;
  border:1px solid rgba(200,240,74,.24);box-shadow:0 16px 32px -14px rgba(0,0,0,.9),inset 0 1px 0 rgba(255,255,255,.06)}
.next-meal-sticky__eyebrow{background:var(--h-lima);color:#171A0B}
.next-meal-sticky__time{color:#D4F27A;text-shadow:0 0 16px rgba(200,240,74,.45)}
.next-meal-sticky__label{color:#D7DADF}

/* ── shopping ── */
.shopping-summary__stat span{font-family:var(--font-body);text-transform:none;letter-spacing:0;font-weight:600;color:#B9BEC6}
.shopping-summary__stat strong{color:#F2F3F5}
.shopping-summary__stat:nth-child(2){position:relative;overflow:hidden;border-color:rgba(200,240,74,.38);
  background:radial-gradient(45% 75% at 22% 66%,rgba(200,240,74,.2),rgba(200,240,74,0) 72%),var(--h-card);
  box-shadow:0 0 0 1px rgba(200,240,74,.08),0 22px 46px -22px rgba(200,240,74,.38),var(--shadow-1)}
.shopping-summary__stat:nth-child(2) span{color:#CED2D8}
.shopping-summary__stat:nth-child(2) strong{color:#D4F27A;text-shadow:0 0 26px rgba(200,240,74,.42)}
.shopping-progress__texto{color:#B9BEC6}
.shopping-progress.is-completo .shopping-progress__texto{color:#D4F27A}
.shopping-progress__barra{height:14px;padding:3px;background:#121418;box-shadow:inset 0 0 0 1px rgba(255,255,255,.08)}
.shopping-progress__barra>span{background:linear-gradient(90deg,#A9D93A,#DDF58E);box-shadow:0 0 12px rgba(200,240,74,.6)}
.shopping-item__check::before,.pantry-purchase-row__check::before{border:2px solid rgba(200,240,74,.7);background:#181B1F}
.shopping-item__check[aria-checked="true"]::before,.pantry-purchase-row__check[aria-checked="true"]::before{background:#C8F04A;border-color:#C8F04A;box-shadow:0 0 12px rgba(200,240,74,.6)}
.shopping-item__check[aria-checked="true"]::after,.pantry-purchase-row__check[aria-checked="true"]::after{border-color:#171A0B}
.shopping-item__name,.shopping-item__buy,.shopping-item__price{color:#F2F3F5}
.shopping-item__meta,.shopping-item__usage-price{color:#9097A1}
.shopping-item.is-comprado{background:#17191C;box-shadow:none}
.shopping-item.is-comprado .shopping-item__name,.shopping-item.is-comprado .shopping-item__buy,.shopping-item.is-comprado .shopping-item__price{color:#9097A1}
.product-find-btn{background:rgba(255,255,255,.05);box-shadow:inset 0 0 0 1px rgba(255,255,255,.13)}
.product-find-btn:hover{box-shadow:inset 0 0 0 1px rgba(200,240,74,.6)}
.shopping-share-note{color:#B9BEC6}
.confirm-receipt{background:rgba(200,240,74,.06);box-shadow:inset 3px 0 0 #C8F04A;border-radius:14px;color:#DEE1E5}

/* ── my plans ── */
.pantry-plans-empty{border:1.5px dashed rgba(255,255,255,.15);background:rgba(255,255,255,.02);color:#A9AFB8}
.pantry-active-card__date{color:#F2F3F5}
.pantry-active-card__summary,.pantry-purchase-checklist-hint{color:#B9BEC6}
.pantry-active-card__pantry-note,.pantry-purchase-row__grams,.pantry-purchase-row__pantry-note,.pantry-meal-chips__label{color:#9097A1}
.pantry-meal-chips__label{font-family:var(--font-body);text-transform:none;letter-spacing:0}
.pantry-history-heading{color:#F2F3F5}
.pantry-history-row__summary{color:#B9BEC6}
.pantry-item__amount{background:rgba(255,255,255,.04);border-color:rgba(200,240,74,.55);color:#ECEEF1}

/* ── misc text ── */
.status,.pantry-intro,.auth-dialog__body p,.delete-dialog__note,.plan-replace-dialog__note,.plan-replace-prompt{color:#B9BEC6}
.insights h3{color:#F2F3F5}
.insights li{color:#B9BEC6}
.insights li::before{width:7px;height:7px;border-radius:50%;background:#C8F04A;box-shadow:0 0 8px rgba(200,240,74,.75);top:.62em}
.site-footer,.footer-note{color:#A9AFB8}
.site-footer__link{color:#B9BEC6}
.site-footer__sep{color:#9097A1}
.disclosure__chevron{color:#C8F04A}
.spinner-wrap{background:rgba(200,240,74,.07);color:#ECEEF1;box-shadow:inset 0 0 0 1px rgba(200,240,74,.25)}
.loader-flame{border-color:#30353C;border-top-color:#C8F04A}
.verified-card__badge--ean{background:rgba(255,255,255,.05)}
.auth-dialog__notice-static{background:rgba(255,255,255,.04)}
.auth-divider{color:#9097A1}
.auth-divider::before,.auth-divider::after{background:rgba(255,255,255,.1)}

/* ── narrow phones: give the figures room instead of letting them wrap or touch edges ── */
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
  .summary-card--calories{background:radial-gradient(42% 62% at 24% 64%,rgba(255,148,115,.2),rgba(255,148,115,0) 72%),var(--h-card)}
}
@container (max-width:289px){
  .meal-footer{grid-template-columns:repeat(3,auto);row-gap:12px}
  .food-row{grid-template-areas:"name kcal" "meta meta" "use use" "pack pack" "buy buy"}
  .food-cost--usage{grid-area:use}
  .food-cost--package{grid-area:pack;justify-self:start}
}

/* ── tab bar: graphite glass dock, lime indicator ── */
@media screen{
  body.con-pestanas .tabbar{padding:6px;gap:2px;border-radius:26px;background:rgba(22,24,28,.8);-webkit-backdrop-filter:blur(18px) saturate(140%);backdrop-filter:blur(18px) saturate(140%);
    border:1px solid rgba(255,255,255,.08);box-shadow:0 26px 46px -14px rgba(0,0,0,.9),inset 0 1px 0 rgba(255,255,255,.07)}
  .tabbar__btn{min-height:60px;border-radius:20px;background:transparent;color:#A2A8B1;font-weight:600}
  .tabbar__btn::before{content:"";position:absolute;top:-7px;left:50%;width:0;height:3px;border-radius:0 0 3px 3px;background:#D4F27A;transform:translateX(-50%);transition:width .2s ease}
  .tabbar__btn.is-activa{background:radial-gradient(70% 62% at 50% 0%,rgba(200,240,74,.2),rgba(200,240,74,0) 78%);color:#D4F27A;font-weight:700}
  .tabbar__btn.is-activa::before{width:28px;box-shadow:0 0 10px 1px rgba(200,240,74,.9),0 0 24px 4px rgba(200,240,74,.35)}
  .tabbar__btn.is-activa svg{filter:drop-shadow(0 0 6px rgba(200,240,74,.7))}
  .tabbar__cuenta{background:#FF9473;color:#2B0F05;box-shadow:0 0 0 2px #16181C,0 0 12px rgba(255,148,115,.55)}
}

/* ── welcome + questions: graphite field, dark glass sheet ── */
.onboarding{background:
    radial-gradient(80% 50% at 10% 0%, rgba(200,240,74,.2), rgba(200,240,74,0) 70%),
    linear-gradient(175deg,#181A1F 0%,#15171B 60%,#121418 100%)}
.onboarding__card{background:linear-gradient(180deg,rgba(34,37,42,.94),rgba(27,30,34,.96));-webkit-backdrop-filter:blur(18px);backdrop-filter:blur(18px);color:#ECEEF1;
  border:1px solid rgba(255,255,255,.08);border-bottom:0;border-radius:30px 30px 0 0;box-shadow:0 -24px 60px -20px rgba(0,0,0,.85),inset 0 1px 0 rgba(255,255,255,.2)}
@media(min-width:640px){.onboarding__card{border-radius:30px;border-bottom:1px solid rgba(255,255,255,.08)}}
.onboarding__brand-mark{border-radius:12px;background:var(--h-lima);color:#171A0B;box-shadow:inset 0 1px 0 rgba(255,255,255,.5),0 6px 18px -6px rgba(200,240,74,.75)}
.onboarding__brand-name{color:#F2F3F5}
.onboarding__title,.onboarding__question{color:#F2F3F5}
.onboarding__title-accent{background:none;color:#D4F27A;padding:0}
.onboarding__summary li{color:#B9BEC6}
.onboarding__summary li::before{left:4px;top:.5em;width:8px;height:8px;border-radius:50%;background:#C8F04A;box-shadow:0 0 0 3px rgba(200,240,74,.16),0 0 10px rgba(200,240,74,.75)}
.onboarding__summary strong{color:#F2F3F5}
.onboarding__check{color:#D7DADF}
.onboarding__link{min-height:40px}
.onboarding__check input{border:2px solid rgba(200,240,74,.75);border-radius:8px;background:#181B1F}
.onboarding__check input:checked{background:#C8F04A;border-color:#C8F04A;box-shadow:0 0 12px rgba(200,240,74,.6)}
.onboarding__check input:checked::after{border-color:#171A0B}
.onboarding__skip,.onboarding__skip-questions{color:#B9BEC6}
.onboarding__skip-note{color:#9097A1}
.onboarding__progress{height:8px;background:#121418;box-shadow:inset 0 0 0 1px rgba(255,255,255,.08)}
.onboarding__progress-bar{background:linear-gradient(90deg,#A9D93A,#DDF58E);box-shadow:0 0 12px rgba(200,240,74,.7)}
.onboarding__progress-label{color:#D4F27A}
.onboarding__hint{color:#B9BEC6}
.onboarding__unit{color:#9097A1}
.onboarding__choice.is-selected::after{box-shadow:0 0 0 3px #1F2227,0 0 14px rgba(200,240,74,.75)}

/* ── tour, dialogs ── */
.tour__hole{box-shadow:0 0 0 100vmax rgba(6,7,9,.76),0 0 0 2px #C8F04A,0 0 26px 4px rgba(200,240,74,.45)}
.tour__foco{box-shadow:0 0 0 100vmax rgba(6,7,9,.4),0 0 0 2px #C8F04A,0 0 20px 2px rgba(200,240,74,.4)}
.tour__card{border-radius:22px;background:var(--h-card);border:1px solid rgba(255,255,255,.09);color:#ECEEF1}
.tour__counter{color:#D4F27A}
.tour__title{color:#F2F3F5}
.tour__body{color:#B9BEC6}
.tour__skip{color:#B9BEC6}
.auth-dialog,.ajustes-dialog{background:#1C1F24;color:#ECEEF1;border:1px solid rgba(255,255,255,.08);border-bottom:0;border-radius:28px 28px 0 0;
  box-shadow:0 -20px 60px -10px rgba(0,0,0,.85),inset 0 1px 0 rgba(255,255,255,.18)}
@media(min-width:640px){.auth-dialog,.ajustes-dialog{border-radius:28px;border-bottom:1px solid rgba(255,255,255,.08)}}
.auth-dialog::backdrop,.ajustes-dialog::backdrop{background:rgba(6,7,9,.72);-webkit-backdrop-filter:blur(4px);backdrop-filter:blur(4px)}
.ajustes-dialog__head,.legal-dialog__foot{background:#1C1F24}
.legal-dialog__foot{border-top:1px solid rgba(255,255,255,.07)}
.ajustes-dialog__title,.auth-dialog__head h2{color:#F2F3F5}
.ajustes-group+.ajustes-group{border-top:1px solid rgba(255,255,255,.07)}
.ajustes-group__title{color:#D4F27A}
.ajustes-group__hint{color:#9097A1}
.ajustes-group__hint strong{color:#D7DADF}
.ajustes-action{border-radius:16px;border:1px solid rgba(255,255,255,.11);background:rgba(255,255,255,.035);color:#ECEEF1}
.ajustes-action:hover{border-color:rgba(200,240,74,.55)}
.ajustes-choice__btn[aria-checked="true"]{color:#171A0B}
.legal-dialog__body h3{color:#F2F3F5}
.legal-dialog__body ul{color:#B9BEC6}
.legal-dialog__version{color:#9097A1}
.suggest-list{background:#1F2227}

/* ── 2026-10-23: lo que style.css pinta con --ink de fondo (claro aquí) y el rojo pequeño ── */
.cat__chip.is-on{background:#C8F04A;border-color:#C8F04A;color:#171A0B}
.entreno__mini-btn--quitar{color:#FF9C8F;border-color:rgba(255,156,143,.4)}
"""

for k, v in dict(__CHECK__=CHECK, __ARROW__=ARROW).items():
    CSS = CSS.replace(k, v)

V = dict(
    id="grafito", name="Графит",
    desc="Тёмное приложение без декора: графитовый фон, карточки чуть светлее с тонкой кромкой и лаймовый акцент — "
         "кнопки, выбранные плитки и индикатор нижней панели. Никаких рисунков на фоне, только цвет и свет.",
    sw=["#15171B", "#1E2126", "#262A30", "#C8F04A", "#FF9473", "#B9A8FF", "#F5C65A", "#63D8E8"],
    fonts=["manrope", "inter"], palette=PAL, tokens=TOKENS, css=CSS)
