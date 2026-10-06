# -*- coding: utf-8 -*-
"""Núcleo del generador de aspectos (assets/css/temas/*.css).

Un ASPECTO es una hoja de estilos que se carga ENCIMA de assets/css/style.css y
redefine el aspecto de la aplicación (colores, fondo, botones, tarjetas...).
El aspecto "entreno" es style.css tal cual y no tiene fichero (el por defecto
desde el 2026-10-07 es "hojas", que sí lo tiene).

Cada fichero de aspecto lleva, en este orden:
  1. las @font-face de sus tipografías (assets/fonts/, URL relativa a la hoja),
  2. "neutralizar": lo propio del diseño base que ningún aspecto quiere
     (cursivas inclinadas, rótulos de menos de 13 px), SACADO de style.css,
  3. el NÚCLEO común: una sola escala de tamaños y de alturas de control,
  4. las variables del aspecto (paleta, fuentes, radios...) y sus reglas.

Las reglas de un aspecto usan grupos de selectores (@@BTN_P@@, @@CHIP@@...) que
aquí se expanden; ver G. Nada de esto se ejecuta en el navegador: es un paso de
desarrollo, y los .css generados son lo que se sirve.
"""
import os, re, sys

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.abspath(os.path.join(AQUI, "..", ".."))
STYLE_CSS = os.path.join(RAIZ, "assets", "css", "style.css")

# ───────────────────────── selector groups ─────────────────────────
G = {
    # buttons ------------------------------------------------------------------------------
    "BTN_P": ".btn-primary, .onboarding__btn--primary, .tour__next, .legal-dialog__done, .pantry-add > button, .traduccion-aviso__si",
    "BTN_S": ".btn-secondary, .onboarding__btn--ghost, .tour__prev, .traduccion-aviso__no",
    "BTN_SM": ".resumen-datos__btn, .meal-swap-btn, .pantry-active-card__delete",
    "BTN_ICON": ".topbar__menu-btn, .auth-dialog__close, .ajustes-dialog__close, .pantry-item__remove",
    "BTN_CTA": ".actions .btn-primary, .shopping-panel__actions .btn-primary, .nocook-panel > .btn-primary, .onboarding__btn--big, .pantry-active-card__buy-btn",
    "BTN_DANGER": ".delete-dialog__confirm",
    "PROFILE": ".topbar__profile-btn",
    # selectable things --------------------------------------------------------------------
    "CHIP": ".baldosa, .budget-chip, .onboarding__choice, .pantry-meal-chip, .date-chip, .aspecto-card",
    "CHIP_ON": ".baldosa.is-activa, .visually-hidden:checked + .budget-chip, .visually-hidden:checked + .date-chip, .onboarding__choice.is-selected, .pantry-meal-chip--cooked, .aspecto-card[aria-checked=\"true\"]",
    "SEG": ".plan-days, .ajustes-choice",
    "SEG_BTN": ".plan-days__btn, .ajustes-choice__btn",
    "SEG_ON": ".plan-days__btn.is-active, .ajustes-choice__btn[aria-checked=\"true\"]",
    "STEP": ".paso-a-paso",
    "STEP_BTN": ".paso-a-paso__btn",
    "STEP_PLUS": ".paso-a-paso__btn[data-signo=\"1\"]",
    "FIELD": "input[type=\"text\"], input[type=\"number\"], input[type=\"email\"], input[type=\"password\"], input[type=\"time\"], input[type=\"search\"], input[type=\"date\"], select, textarea",
    # surfaces -----------------------------------------------------------------------------
    "PANEL": ".panel:not(.panel--results)",
    "CARD": ".meal-card, .shopping-item, .pantry-active-card, .pantry-history-row, .nocook-slot, .nocook-summary, .insights, .disclosure, .resumen-datos, .shopping-summary__stat",
    "SHEET": ".auth-dialog, .ajustes-dialog, .tour__card, .onboarding__card",
    "WELL": ".food-purchase, .confirm-receipt, .pantry-purchase-checklist-wrap, .nocook-item, .verified-card, .pantry-item, .meta",
    # small text pieces --------------------------------------------------------------------
    "TAG": ".badge, .food-macro__badge, .food-purchase__badge, .nocook-level, .nutrition-approx, .verified-card__badge, .nocook-item__whole, .meal-steps__badge, .shopping-item__pantry",
    "SECTION_LABEL": ".form-section-label, .budget-group-label",
    "FIELD_LABEL": ".field > label, .budget-custom-field > label",
    "BIG": ".summary-card .big, .summary-card--calories .big, .shopping-summary__stat:nth-child(2) strong",
}


def _split_top(sel):
    """split a selector list on top-level commas"""
    out, depth, cur = [], 0, ""
    for ch in sel:
        if ch in "([":
            depth += 1
        elif ch in ")]":
            depth -= 1
        if ch == "," and depth == 0:
            out.append(cur)
            cur = ""
        else:
            cur += ch
    out.append(cur)
    return out


def _expand_selector(sel):
    m = re.search(r"@@([A-Z_]+)@@", sel)
    if not m:
        return [sel]
    k = m.group(1)
    if k not in G:
        raise KeyError("unknown selector group @@%s@@" % k)
    res = []
    for member in _split_top(G[k]):
        res += _expand_selector(sel[:m.start()] + member.strip() + sel[m.end():])
    return res


def expand(css):
    """@@GROUP@@ -> the group's selectors; pseudo-classes / descendants after it are applied to EVERY member."""
    css = re.sub(r"/\*.*?\*/", "", css, flags=re.S)

    def rule(m):
        prelude = m.group(1)
        if "@@" not in prelude:
            return m.group(0)
        sels = []
        for s in _split_top(prelude):
            sels += _expand_selector(s.strip())
        return ",".join(sels) + "{"

    return re.sub(r"([^{};]*@@[^{};]*)\{", rule, css)


# ───────────────────────── the shared kit ─────────────────────────
KIT_CSS = r"""
/* ═══════════════ KIT — one size system for every style ═══════════════
   type:   13 caption · 14 small · 16 body · 17/18 buttons · 20 small figure · 26 figure · 32 big figure · 44 THE figure
   height: 40 small control · 52 standard control · 58 main action
   Nothing is smaller than 13px, nothing (but the brand name) is bigger than 44px.                        */
:root{
  --fs-cap:13px; --fs-sm:14px; --fs-md:16px; --fs-lg:18px;
  --fs-btn:17px; --fs-btn-sm:14px; --fs-btn-lg:18px;
  --fs-fig-s:20px; --fs-fig-m:26px; --fs-fig-l:32px; --fs-fig-xl:44px;
  --fs-h2:30px; --fs-h2-md:34px; --fs-h2-lg:38px; --fs-h3:20px; --fs-title:34px; --fs-q:30px; --fs-dlg:26px; --fs-label:13px;
  --fw-display:700; --fw-fig:800; --fw-btn:700; --fw-label:700; --fw-hero:800;
  --ls-display:0; --ls-fig:0; --ls-btn:0; --ls-label:0;
  --tt-display:none; --tt-btn:none; --tt-label:none;
  --lh-display:1.1;
  --h-sm:40px; --h-md:52px; --h-lg:58px;
  --r-ctl:16px; --pill:999px;
  --hero-k:5.4; --hero-max:84px;
  --active-accent:0 0 0 0 transparent;
  --font-label:var(--font-body);
}

/* fields (before the stepper rules below, which must win) */
input[type="text"],input[type="number"],input[type="email"],input[type="password"],input[type="time"],input[type="search"],input[type="date"],select,textarea{min-height:var(--h-md);font-size:var(--fs-md)}

/* headings ------------------------------------------------------------------------------ */
h2{font:var(--fw-display) var(--fs-h2)/var(--lh-display) var(--font-display);letter-spacing:var(--ls-display);text-transform:var(--tt-display)}
@media(min-width:600px){h2{font-size:var(--fs-h2-md)}}
@media(min-width:901px){h2{font-size:var(--fs-h2-lg)}}
.onboarding__title{font:var(--fw-display) var(--fs-title)/1.08 var(--font-display);letter-spacing:var(--ls-display);text-transform:var(--tt-display)}
.onboarding__question{font:var(--fw-display) var(--fs-q)/1.12 var(--font-display);letter-spacing:var(--ls-display);text-transform:var(--tt-display)}
.auth-dialog__head h2,.ajustes-dialog__title{font-size:var(--fs-dlg)}
.tour__title,.nocook-slot__head h3{font:var(--fw-display) 22px/1.15 var(--font-display);letter-spacing:var(--ls-display);text-transform:var(--tt-display)}
.legal-dialog__body h3,.pantry-history-heading,.insights h3,.ajustes-group__title{font:var(--fw-display) var(--fs-h3)/1.15 var(--font-display);letter-spacing:var(--ls-display);text-transform:var(--tt-display)}
.ajustes-group__title{font-size:var(--fs-md)}
.day-slide__n{font:var(--fw-fig) var(--fs-fig-m)/1 var(--font-display);letter-spacing:var(--ls-fig);text-transform:var(--tt-display)}
@media(min-width:901px){.day-slide__n{font-size:var(--fs-fig-m)}}
.topbar__brand,.onboarding__brand-name{font:var(--fw-display) 22px/1 var(--font-display);letter-spacing:var(--ls-display);text-transform:var(--tt-display)}
.hero__nombre{font:var(--fw-hero) clamp(34px,calc((100cqw - 24px) / var(--hero-k)),var(--hero-max))/1 var(--font-display);letter-spacing:var(--ls-display);text-transform:var(--tt-display)}
.meal-head h3{font:700 var(--fs-lg)/1.3 var(--font-body)}
.sin-js h1{font-size:30px;text-transform:var(--tt-display)}

/* labels (small captions above fields / inside tiles) ------------------------------------ */
.form-section-label,.budget-group-label,.field>label,.budget-custom-field>label,.budget-chip__title,.summary-card h3,.tour__counter,.onboarding__progress-label,.suggest-list__item--group{
  font:var(--fw-label) var(--fs-label)/1.25 var(--font-label);letter-spacing:var(--ls-label);text-transform:var(--tt-label)}
.field>label,.budget-custom-field>label{font-size:var(--fs-sm)}
.meta .k,.shopping-summary__stat span,.meal-footer>div,.food-cost__tag,.pantry-meal-chips__label,.food-macro__badge,.food-purchase__badge,.nocook-level,.next-meal-sticky__eyebrow,.schedule-timeline__next-tag,.badge{
  font-family:var(--font-label);font-size:var(--fs-cap);font-weight:var(--fw-label);letter-spacing:var(--ls-label);text-transform:var(--tt-label)}
.meal-footer>div{line-height:1.2}
.shopping-summary__stat span{font-size:var(--fs-sm)}
.badge{font-size:var(--fs-cap)}

/* figures: units ("ккал", "г") are a little smaller than the number ----------------------- */
.u{font-size:max(13px,.5em);font-weight:600;letter-spacing:0;margin-left:.22em;white-space:nowrap}
.summary-card .big{font:var(--fw-fig) var(--fs-fig-l)/1 var(--font-display);letter-spacing:var(--ls-fig);font-variant-numeric:tabular-nums;white-space:nowrap}
.summary-card--calories .big{font-size:var(--fs-fig-xl)}
.summary-card .sub{font-size:var(--fs-cap);line-height:1.3}
.shopping-summary__stat strong{font:var(--fw-fig) var(--fs-fig-m)/1 var(--font-display);letter-spacing:var(--ls-fig);font-variant-numeric:tabular-nums;white-space:nowrap}
.shopping-summary__stat:nth-child(2) strong,
.shopping-summary__stat:not(:nth-child(2)) strong{font-size:var(--fs-fig-m);white-space:nowrap;letter-spacing:var(--ls-fig)}
.shopping-summary__stat:nth-child(2) strong{font-size:var(--fs-fig-xl)}
.shopping-summary__stat:not(:nth-child(2)){container-type:inline-size}
.shopping-summary__stat:not(:nth-child(2)) strong{font-size:min(var(--fs-fig-m),28cqw)}
.nocook-summary__row:first-child{font:var(--fw-fig) var(--fs-fig-l)/1 var(--font-display)}
.meal-kcal,.nocook-slot__kcal,.shopping-item__price{font:var(--fw-fig) var(--fs-fig-m)/1 var(--font-display);letter-spacing:var(--ls-fig);font-variant-numeric:tabular-nums}
.shopping-item__price{font-size:22px}
.budget-chip__amount,.onboarding__choice-amount,.schedule-timeline__time,.next-meal-sticky__time,.pantry-active-card__date{font:var(--fw-fig) 24px/1 var(--font-display);letter-spacing:var(--ls-fig);font-variant-numeric:tabular-nums}
.meal-time-badge,.food-right>div:first-child,.meal-footer strong,.verified-card__price,.meta .v,.pantry-meal-chip__time{font:var(--fw-fig) var(--fs-fig-s)/1 var(--font-display);letter-spacing:var(--ls-fig);font-variant-numeric:tabular-nums;text-transform:none}
.meal-footer strong{font-size:var(--fs-lg)}
.paso-a-paso input{font:var(--fw-fig) var(--fs-fig-m)/1 var(--font-display);letter-spacing:var(--ls-fig)}
.onboarding__number,.onboarding__time{font:var(--fw-fig) 40px/1 var(--font-display);letter-spacing:var(--ls-fig)}
.onboarding__text{font:600 var(--fs-lg)/1.3 var(--font-body)}
.onboarding__unit{font:var(--fw-display) 22px/1 var(--font-display);text-transform:none}
.pantry-item__amount{font:var(--fw-fig) var(--fs-md)/1 var(--font-display);letter-spacing:0}
.tabbar__cuenta{font:var(--fw-fig) 14px/22px var(--font-display);letter-spacing:0}
.meal-steps__list li::before{font:var(--fw-fig) var(--fs-md)/1 var(--font-display)}

/* controls: one ladder -------------------------------------------------------------------- */
.btn-primary,.btn-secondary,.onboarding__btn,.tour__prev,.tour__next,.legal-dialog__done,.pantry-add>button,.delete-dialog__confirm,.pantry-active-card__buy-btn{
  min-height:var(--h-md);font:var(--fw-btn) var(--fs-btn)/1.15 var(--font-display);letter-spacing:var(--ls-btn);text-transform:var(--tt-btn)}
.actions .btn-primary,.shopping-panel__actions .btn-primary,.nocook-panel>.btn-primary,.onboarding__btn--big{min-height:var(--h-lg);font-size:var(--fs-btn-lg)}
.actions-secondary .btn-secondary,.shopping-panel__actions .btn-secondary{min-height:var(--h-md);font-size:var(--fs-btn)}
.actions-secondary #resetBtn{min-height:var(--h-sm);font-size:var(--fs-sm)}
.resumen-datos__btn,.meal-swap-btn,.pantry-active-card__delete,.traduccion-aviso__si,.traduccion-aviso__no{
  min-height:var(--h-sm);font:var(--fw-btn) var(--fs-btn-sm)/1.1 var(--font-display);letter-spacing:var(--ls-btn);text-transform:var(--tt-btn)}
.baldosa,.budget-chip,.onboarding__choice,.pantry-meal-chip,.date-chip{min-height:var(--h-md)}
.baldosa{font:600 var(--fs-md)/1.2 var(--font-body)}
.budget-chip{min-height:76px}
.budget-chip--custom{min-height:var(--h-md)}
.date-chip,.plan-days__btn,.ajustes-choice__btn{font:var(--fw-btn) var(--fs-md)/1 var(--font-display);letter-spacing:var(--ls-btn);text-transform:var(--tt-btn)}
.plan-days__btn,.ajustes-choice__btn{min-height:var(--h-md)}
.paso-a-paso__btn{width:44px;height:44px;font:500 28px/1 var(--font-body)}
.paso-a-paso input{height:44px;min-height:44px}
.meal-steps__toggle{font:var(--fw-btn) var(--fs-md)/1 var(--font-display);letter-spacing:var(--ls-btn);text-transform:var(--tt-btn)}
.tabbar__btn{font-size:var(--fs-cap)}
.next-meal-sticky__label{font-size:var(--fs-sm)}

/* steppers on narrow phones: smaller knobs so a 3-digit number always fits; 1 column below 340px */
@media(max-width:389px){
  .paso-a-paso{gap:2px;padding:3px}
  .paso-a-paso__btn{width:40px;height:40px}
  .paso-a-paso input{font-size:22px;height:40px;min-height:40px}
}
@media(max-width:339px){.form-grid{grid-template-columns:minmax(0,1fr)}}

/* tap targets: nothing smaller than 40px */
.site-footer__link,.onboarding__skip,.onboarding__skip-questions,.tour__skip,.pantry-link-btn,.auth-dialog__switch-btn{min-height:40px}
.onboarding__skip,.onboarding__skip-questions{display:flex;align-items:center;justify-content:center;width:fit-content;padding:6px 10px}
.product-find-btn{width:40px;height:40px;font-size:18px}
.days-carousel__dot{width:40px;height:40px}

/* ═══ layout fixes that go into the final design whatever the style ═══ */
/* ingredient rows: both cost cells share one full-width row so the NAME is never squeezed */
.food-row{grid-template-areas:"name kcal" "meta meta" "costs costs" "buy buy"}
.food-cost--usage{grid-area:costs;justify-self:start}
.food-cost--package{grid-area:costs;justify-self:end}
.food-cost{font-size:var(--fs-sm)}
.food-name{font-size:var(--fs-md)}
.food-meta{font-size:var(--fs-sm)}
/* meal-card head: swap button never wraps */
.meal-card{container-type:inline-size}
.meal-head{grid-template-columns:auto auto 1fr}
.meal-kcal{justify-self:end}
.meal-swap-btn{white-space:nowrap}
@container (max-width:310px){.meal-head{grid-template-columns:auto 1fr;grid-template-areas:"time kcal" "title title" "swap swap"}}
@container (max-width:290px){.food-row{grid-template-areas:"name kcal" "meta meta" "costs costs" "pack pack" "buy buy"}.food-cost--package{grid-area:pack;justify-self:start}}
/* tablet: five budget chips in one row made the amounts wrap ("Сбалансированный" broke mid-word) */
@media(min-width:600px) and (max-width:900px){.budget-modes{grid-template-columns:repeat(2,minmax(0,1fr))}.budget-chip--custom{grid-column:1/-1;flex-direction:row;align-items:center}}
@media(min-width:768px) and (max-width:900px){.budget-modes{grid-template-columns:repeat(4,minmax(0,1fr))}}
/* tab names wrap instead of being cut with an ellipsis */
@media screen and (max-width:900px){
  .tabbar__texto{white-space:normal;overflow:visible;text-overflow:clip;text-align:center;line-height:1.12;overflow-wrap:anywhere}
  .next-meal-sticky__label{white-space:normal;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;line-height:1.25}
  .next-meal-sticky__btn{min-height:56px}
}
@media(max-width:359px){.tabbar__btn{padding-inline:2px}}
/* "your data" strip */
.resumen-datos__texto{-webkit-line-clamp:3;font-size:var(--fs-sm)}
.resumen-datos__btn{white-space:normal;line-height:1.15;padding:8px 16px;max-width:42%;text-align:center}
/* money tiles on the shopping screen keep their figures on one line */
.shopping-summary__stat{min-width:0}
/* the dots under the day carousel are decoration, keep them tidy */
.days-carousel__hint{font-size:var(--fs-sm)}
.schedule-timeline__label{font-size:var(--fs-sm)}
.schedule-timeline__note{font-size:var(--fs-cap)}
"""


def tokens_css(p):
    t = []
    a = t.append
    a(f"--canvas:{p['canvas']};--surface:{p['surface']};--surface-2:{p['surface_2']};")
    a(f"--line:{p['line']};--line-strong:{p['line_strong']};--field-line:{p['field_line']};")
    a(f"--ink:{p['ink']};--text-2:{p['text_2']};--text-3:{p['text_3']};")
    a(f"--primary:{p['primary']};--ink-2:{p['primary_2']};--ink-3:{p['primary_3']};--on-ink:{p['on_ink']};--on-ink-2:{p['on_ink_2']};")
    a(f"--volt:{p['volt']};--volt-hi:{p['volt_hi']};--volt-wash:{p['volt_wash']};--on-volt:{p['on_volt']};")
    h = lambda x: ", ".join(str(int(x.lstrip('#')[i:i + 2], 16)) for i in (0, 2, 4))
    a(f"--volt-rgb:{h(p['volt'])};--volt-hi-rgb:{h(p['volt_hi'])};--surface-rgb:{h(p['surface'])};--shadow-rgb:{p['shadow_rgb']};--primary-rgb:{h(p['primary'])};")
    for m in ("kcal", "protein", "carbs", "fat"):
        a(f"--{m}:{p[m]};--{m}-deep:{p[m + '_deep']};--{m}-wash:{p[m + '_wash']};")
    a(f"--ok:{p['ok']};--ok-wash:{p['ok_wash']};--warn:{p['warn']};--warn-wash:{p['warn_wash']};")
    a(f"--danger:{p['danger']};--danger-deep:{p['danger_deep']};--danger-wash:{p['danger_wash']};")
    return "".join(t)




# ───────────────────────── neutralizar lo propio del diseño base ─────────────────────────
def _bloques(css, envoltorio=()):
    """Recorre el CSS y da (envoltorio, preludio, cuerpo) de cada regla de estilo.
    Entra en @media / @supports / @container; salta @keyframes, @font-face, @page."""
    i, n = 0, len(css)
    while i < n:
        ab = css.find("{", i)
        if ab == -1:
            return
        prelude = css[i:ab].strip()
        nivel, j = 0, ab
        while j < n:
            if css[j] == "{":
                nivel += 1
            elif css[j] == "}":
                nivel -= 1
                if nivel == 0:
                    break
            j += 1
        cuerpo = css[ab + 1:j]
        if prelude.startswith("@"):
            if re.match(r"@(media|supports|container|layer)\b", prelude):
                for x in _bloques(cuerpo, envoltorio + (prelude,)):
                    yield x
        else:
            yield envoltorio, prelude, cuerpo
        i = j + 1


def neutralizar(css_base):
    """CSS que anula, en cada aspecto, lo que style.css hace solo para el diseño base:
       - tamaños de letra < 13 px  -> 13 px (ningún aspecto tiene rótulos de 10 px)
       - transform: skewX(...) / rotate(-6deg) -> none (las formas inclinadas del base)"""
    css_base = re.sub(r"/\*.*?\*/", "", css_base, flags=re.S)
    salida = []
    for env, pre, cuerpo in _bloques(css_base):
        decl = []
        for m in re.finditer(r"font-size:\s*([\d.]+)px", cuerpo):
            if float(m.group(1)) < 13:
                decl.append("font-size:13px")
        for m in re.finditer(r"font:\s*\d{3}\s+([\d.]+)px", cuerpo):
            if float(m.group(1)) < 13:
                decl.append("font-size:13px")
        if re.search(r"transform:\s*(skewX\([^)]*\)|rotate\(-6deg\))\s*;", cuerpo):
            decl.append("transform:none")
        if not decl:
            continue
        regla = pre + "{" + ";".join(sorted(set(decl))) + "}"
        for e in reversed(env):
            regla = e + "{" + regla + "}"
        salida.append(regla)
    return "\n".join(salida)


# La tarjeta de aspecto del menú de ajustes se trata como una ficha más (CHIP /
# CHIP_ON) para heredar el estilo de cada aspecto, pero un estilo de ficha puede
# traer su propia maquetación (flex centrado, alturas mínimas...). Estas reglas
# van AL FINAL de cada hoja y devuelven la tarjeta a su forma: miniatura arriba,
# nombre debajo.
FICHAS_CSS = (
    ".aspecto-card{display:grid;grid-template-rows:auto auto;align-content:start;justify-items:stretch;gap:8px;"
    "min-height:0;padding:8px 8px 10px;text-align:center;font-size:14px;line-height:1.2;transform:none}"
    ".aspecto-card__vista{display:block;aspect-ratio:6/5;overflow:hidden;border-radius:8px;background:var(--line);margin:0}"
    ".aspecto-card__nombre{display:block;overflow-wrap:anywhere}\n"
)


# ───────────────────────── ensamblado ─────────────────────────
def tipografias(slugs):
    out = []
    for s in slugs:
        with open(os.path.join(AQUI, "tipografias", s + ".css"), encoding="utf-8") as f:
            out.append(f.read())
    return "".join(out)


def generar(modulo):
    """CSS completo de un aspecto (módulo de scripts/temas/aspectos/)."""
    V = modulo.V
    with open(STYLE_CSS, encoding="utf-8", newline="") as f:
        base = f.read().replace("\r\n", "\n")
    raiz = ":root{" + tokens_css(V["palette"]) + V.get("tokens", "") + "}\n"
    css = (
        "/* ══ Aspecto «%s» (%s) ═══════════════════════════════════════════════\n"
        "   GENERADO por scripts/temas/construir.py a partir de scripts/temas/aspectos/%s.py.\n"
        "   No editar a mano: se pierde la próxima vez que se genere. Se carga DESPUÉS de\n"
        "   style.css (ver js/core/look.js y el <head> de index.html). ══ */\n" % (V["name"], V["id"], V["id"]) +
        tipografias(V["fonts"]) +
        "\n/* ── neutralizar lo propio del diseño base ── */\n" + neutralizar(base) +
        "\n/* ── núcleo común: una escala de tamaños, una escalera de alturas ── */\n" + KIT_CSS +
        "\n@media print{body::before,body::after{display:none!important}}\n"
        "\n/* ── el aspecto ── */\n" + raiz + expand(V["css"]) +
        "\n/* ── fichas de aspecto (Ajustes): la maquetación manda sobre el estilo de ficha ── */\n" + FICHAS_CSS
    )
    return css.replace("%%", "%")
