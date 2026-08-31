# Nutrition Planner — Roadmap

## Estado y prioridades al 2026-08-27 (leer antes que nada de lo de abajo)

**La carpeta buena es `Desktop\Offline Nutrition Helper\nutrition-planner`.**
`nutrition-planner-fase2` ya no existe; `Desktop\nutrition-planner-app` es
una copia vieja sin git ni tests. HEAD `ec6f686`, 372 tests en verde, y
**nada de lo de esta sesión está commiteado** — siete diffs esperan la
aprobación del usuario, uno por uno. El detalle completo, con constantes y
mediciones, está en el bloque "EMPIEZA AQUÍ" al principio de `STATE.md`.

### Lo siguiente, en orden

1. **P0 — que el usuario revise los siete diffs.** Es el cuello de botella
   real: hay ~1.200 líneas de trabajo verificado y en verde esperando. Nada
   más avanza hasta que se decida qué entra.

2. **P1 — API key de USDA FoodData Central** (gratis, un minuto, sin
   tarjeta, en fdc.nal.usda.gov/api-key-signup.html). Desbloquea de una vez
   cebolla, ajo **y los 31 roles de ingrediente sin resolver**, que hoy
   degradan la precisión nutricional de TODA la app, no solo de los platos
   nuevos. `DEMO_KEY` corta a los ~9 usos. La clave va en config y no se
   commitea nunca. **El asistente no se da de alta él**: crear cuentas a
   nombre del usuario queda fuera de lo que hace.

   Cuando llegue: parar de escribir recetas y hacer esto primero. Reglas no
   negociables al integrarlo — todo valor entra como `generic_reference`
   con `needs_review` siempre y sin auto-aceptación; se guardan `fdcId` y la
   descripción literal de USDA; `SOURCE_ID = "usda_fdc"` desde el primer
   día; y el mapeo español→inglés se escribe A MANO. El motivo está medido:
   ver el caso "Oil, oat" en `STATE.md` — 1 de cada 9 emparejamientos
   automáticos fue catastrófico y pasó todos los controles automáticos.

3. **P2 — seguir escribiendo recetas.** 142 de 334 (43%), quedan 192, unos
   8 lotes de 25. Elegir cada lote por **variedad de técnica**, no por orden
   de lista. El principio irrenunciable: escribir para quien no ha cocinado
   nunca, con líneas que anticipen cómo se falla, no solo cantidades y
   tiempos.

4. **P3 — escribir platos españoles.** Este es el arreglo de verdad para
   "quiero más comida española", y no tiene alternativa: solo 25 de 334
   platos son españoles, así que el sesgo de cocina ya está dando todo lo
   que puede (~0,7 comidas españolas al día). **Subir `CUISINE_BIAS_WEIGHT`
   no sirve**: el techo lo pone el catálogo. Bloqueados hasta que llegue
   USDA, porque necesitan sofrito: tortilla de patatas, pollo al ajillo,
   pisto, gazpacho, lentejas guisadas. Ya se pueden escribir sin cebolla ni
   ajo: garbanzos con espinacas, merluza a la plancha, ensaladilla.

5. **P4 — desplegar.** Producción sigue sirviendo la build anterior al
   selector de tienda. `npx wrangler pages deploy .`, y **solo con permiso
   explícito del usuario para esa vez concreta**. No hay integración git en
   Cloudflare Pages: si no se ejecuta el comando, no se despliega nada.

### Lo que NO hay que volver a intentar

- **BEDCA**: no está caído a ratos, no contesta. El endpoint SOAP
  documentado da 404 y el que usa su propia web devuelve HTTP 200 con cero
  bytes en todas las variantes probadas. Usar USDA.
- **Validar una conversión de unidades con Atwater**: es matemáticamente
  imposible que funcione, porque Atwater es invariante de escala. Detalle y
  demostración en `STATE.md`.
- **Emparejar ingredientes por subcadena**: "cebolla" devuelve 30 productos
  con nutrición coherente y ninguno es cebolla.

## Current status

**Stage:** working prototype, updated 2026-08-25 — the nutrition-matching
pipeline was found to be **structurally broken, not merely incomplete**,
and was reworked. Short version, all numbers measured:

- OpenFoodFacts name search had been returning **HTTP 403 on 20/20**
  requests through the real pipeline path. 403 is a 4xx, so it was never
  retried, and the enricher logged it as "No search results" — it was
  reporting "product not found" for queries it never actually made. This
  alone explains Alcampo's 0/288 and most of Mercadona's stagnation.
- Matching now runs against a **local OFF index** (256,838 Spain products
  with all 4 macros, built in ~4 min from the bulk export). The search API
  cannot be used at this scale: paginating Spain needs ~3700 requests,
  `page_size` caps at 100 and deep pages return 401.
- Exact-match rate, thresholds unchanged: **Alcampo 19.1% → 36.0%**,
  **Mercadona 18.3% → 57.3%**. Auto-accepted **4.2% → 11.3% / 19.3%**.
- Auto-accept precision, hand-audited at **100%** of the population (not
  sampled): **77% → 88%**, with records carrying broken data **3 → 0**,
  after adding an Atwater consistency check and refusing to auto-accept
  matches where either side lacks a brand.
- **Limits that remain, stated as plainly as the wins**: one false accept
  survives ("Santa Ana artesanas" matching the "lisas" record at 0.830,
  above the review threshold); one nutritionally material variant miss
  ("Yogur 0% MG 0% azúcares" matched to a regular yogurt); alcohol is
  over-quarantined because Atwater does not model ethanol (harmless —
  verified that the frontend excludes alcohol from meal planning twice
  over); **Carrefour is still hard-blocked** by Cloudflare after two full
  attempts a day apart; and **Alcampo's category pages cap at ~50 products
  while advertising 1500**, so the ~1300 refs discovered are an artefact of
  that cap, not the catalog — the biggest raw-coverage lever still open.

Full detail in `STATE.md` ("Rework del emparejamiento nutricional —
2026-08-25") and `PythonProject/PROJECT_CONTEXT.md` (sections 6, 7.1, 10,
11.1, 12.1, 17.1, 18.1, 19).

Previously, updated 2026-08-24 — first real multi-store
data pipeline plus a store picker in the UI. A separate Python repo
(`PycharmProjects\PythonProject`, until now an OpenFoodFacts-enrichment
tool only, never a scraper) gained real Playwright-based scrapers for
Alcampo and Carrefour, run to completion: Alcampo 288 products scraped /
215 pass the food filter / **0 matched to real nutrition data** (honest
gap, nothing fabricated); Carrefour blocked by Cloudflare mid-run, 0
products, not yet successfully retried. A new export script feeds each
store's catalog into this repo as `REAL_PRODUCTS_CATALOGS.<store>`, and a
real `<select id="store">` now drives the "Sin cocinar" (no-cook) engine
end-to-end (per-store cache, persisted setting). The dish-recipe engine
was found to already be store-parameterized end-to-end from earlier
sessions — only the missing UI edge was added; it still prices
Alcampo/Carrefour choices using Mercadona's curated ingredient prices,
since building `PRICE_CATALOGS.alcampo`/`.carrefour` with the same
hand-curated quality is real data-curation work, deliberately deferred
("Fase B", see "Next priorities" below and Fase 6 in the migration table).
307 tests total (JS), 0 failing; 68 Python tests, 0 failing. Committed
and pushed in both repos but **not deployed** — production still serves
the pre-store-picker build. See `STATE.md`, "Resumen de la sesión
2026-08-23d/2026-08-24" and PythonProject's `PROJECT_CONTEXT.md`.

Previously, updated 2026-08-23 — re-verification
session (no code changes): every item on the priority-ordered issues
list was checked directly against the current code, not assumed from
docs, and confirmed exactly where it was left. One real status change:
the user confirmed they personally completed a real Google OAuth login
end-to-end, closing the one remaining gap in the accounts system (the
technical chain was already confirmed 2026-08-14a). See `STATE.md`,
"Resumen de la sesión 2026-08-23".

Previously, updated 2026-08-20h — per-meal editing
shipped: "cambiar este plato" re-picks one meal in an already-confirmed
plan without regenerating the other 4, using the same weighted-lottery
selection as generation. Required extending saved entries to retain
per-meal `dishName`/`mainProt`/`taste`/`total` and day-level `budget`/
`cookTime`/`taste` (new optional parameter, backward compatible). Budget
for the replacement is capped by the day's real remaining spend, computed
from the other 4 meals' actual cost rather than a generation-time
estimate. A real CSS overflow bug was found and fixed during live
verification (same root-cause class as 2026-08-20b, one level higher in
the DOM). 12 new tests. This closes the last item from the priority list
that wasn't explicitly declined — only `dish-selector.js` weight tuning
remains, and the user confirmed that's fine as-is. See `STATE.md`,
"Per-meal editing: 'cambiar este plato' — 2026-08-20h".

Previously, updated 2026-08-20g — a real data-corruption
bug found while designing per-meal editing: `savePlanForToday()`'s UPSERT
and `findTodayEntry()` didn't filter by `entry.type`, so a same-day
no-cook draft could get silently mistaken for a dish-mode one and gain a
spurious `.meals` array next to its real `.slots` — confirmed with a
direct repro, not theorized. Fixed by filtering `e.type !== "nocook"` in
both; the original 2026-08-20f isolation test passed even with the bug
present, so assertions were widened. 4 new/strengthened tests. See
`STATE.md`, "Resumen de la sesión 2026-08-20g".

Previously, updated 2026-08-20f — known issue #9
(despensa not connected to no-cook mode) addressed: the full 3-stage
lifecycle (confirm → buy → consume) now exists for no-cook plans too,
mirroring the main generator's pattern exactly. Scope was confirmed with
the user before building — full lifecycle, but product SELECTION stays
pantry-unaware for now (matches how the main generator was rolled out in
two separate steps back in 2026-08-06/07 and 2026-08-13). Architecture
keeps a parallel product-quantity stock ledger (discrete products can't
reuse the gram-shaped pantry store) while sharing the existing
`pantryHistory` array for entries, verified safe by reading
`migration.js`/`cloud-sync.js` rather than assuming. UI reuses the exact
same CSS as dish-mode — zero new styles. 10 new tests, 265 total, 0
failed; verified live end-to-end including cross-type isolation. See
`STATE.md`, "Despensa conectada al modo 'sin cocinar' — 2026-08-20f".

Previously, updated 2026-08-20e — known issue #1
re-audited on the current 334-dish set for the first time since the old
204-dish audit: found and fixed a real, localized authoring bug (23
dishes, 15 of them all containing "Quinoa cocida," had `dish.kcal`
noticeably below what their own protein/carbs/fat imply — up to
-148kcal) rather than diffuse rounding noise. This had real functional
impact since `dish.kcal` drives portion scaling in
`buildMealFromDish()`. Coverage went from 156/334 to 179/334 dishes
within Atwater tolerance; the remaining 155 (all positive-diff, no
ingredient pattern) were deliberately left alone per this file's own
guidance not to prioritize hand-fixing dish data ahead of the Fase 1-2
migration. 2 golden-masters recaptured; 7 contract tests untouched. See
`STATE.md`, "Auditoría Atwater del nivel de plato — 2026-08-20e".

Previously, updated 2026-08-20d — known issue #7
(`packaging.js` coverage) reduced from 25 to 12 uncovered ingredient
roles: 13 new package-size entries added (fruit/veg by unit, fresh-tray
meats, breads, frozen seafood), same estimation criteria as the existing
46. Live-verified with the real `resolvePackageInfo()`. The remaining 12
gaps are 11 fresh meat/fish (by design) plus the pre-existing
`"Lechuga: Pepino"` corrupted-name bug, left untouched on purpose. 2
golden-masters recaptured (marginal purchase cost shifted for a couple
of seeded runs); 7 contract tests untouched. See `STATE.md`, "Resumen de
la sesión 2026-08-20d". Part of the same priority-ordered pass through
open issues as 2026-08-20c below.

Previously, updated 2026-08-20c — known issue #5
(`mainProt` reporting) fixed: `buildMealFromDish()` never copied
`dish.mainProt` onto the generated meal, so the protein-diversity report
always fell back to a non-exhaustive label-text guess. One-line fix
(`js/engine/dish-selector.js`); live-verified that a real dish
("Tostadas con jamón cocido y tomate") had its protein source silently
dropped from the diversity count under the old guess, now reported
correctly. 4 new tests, 255 total, 0 failed. Committed, pushed, and
deployed. See `STATE.md`, "Resumen de la sesión 2026-08-20c". This is
part of a broader pass working through all currently-open issues in
priority order (per the user's request); known issue #8 was
deliberately deferred to the Fase 2 redesign below rather than patched
in isolation.

Previously, updated 2026-08-20b — a mobile CSS
horizontal-overflow bug (`.actions`/`.panel`/`.meal-head`/
`.pantry-meal-chip`), reconfirmed in every session since 2026-08-08 but
never traced to a specific element, was finally root-caused: live DOM
measurement at 375px found the actual offender is `.pantry-meal-chip`
alone — `white-space: nowrap` with no width limit inside a
`flex-wrap` container means a chip holding a long dish name refuses to
shrink below its own content width (a flex item's default
`min-width: auto`) and forces the whole document wider to fit it; the
other three selectors were never independently broken, they only
inherited the viewport the chip had already widened. Fix: `overflow:
hidden; text-overflow: ellipsis; max-width: 100%; min-width: 0;` on
`.pantry-meal-chip`, plus a `title` attribute on the chip button so the
truncated dish name stays recoverable on hover. 251 tests re-run, 0
failed (CSS + one HTML attribute only). Verified live against the real
served files (cache-busted, not a test-only `<style>` injection):
`document.documentElement.scrollWidth` 412px→376px, 0 overflow
offenders left in a full-DOM scan, real ellipsis truncation confirmed,
desktop unaffected — and re-verified live against production itself
after deploy (real 375px viewport, 10 real meal chips, `scrollWidth`
376px, 0 offenders). Committed (`061ea4a`), pushed to `origin/main`, and
deployed to production (`offline-nutrition-helper.pages.dev`). See
`STATE.md`, "Fix real: overflow horizontal en mobile —
.pantry-meal-chip — 2026-08-20b".

Previously, updated 2026-08-20 — a real bug the user hit
in use: with a plan already confirmed and bought, generating and
confirming a new plan silently created a SECOND active "Tu plan" card for
the same day. Fix: "Generar plan" now checks whether today already has an
active plan with something real on it (bought and/or cooked) and
something still pending — if so, it opens a dialog asking to change the
whole plan instead of generating silently; confirming that replaces the
NOT-yet-cooked meals of the existing entry in place (never creates a
second card), keeping already-cooked meals untouched. A pure draft or an
already-fully-cooked plan never interrupts. 13 new tests (274 total, 0
failed); verified live end-to-end against the local build, including the
exact reported scenario. See `STATE.md`, "Gate en Generar plan +
reemplazo explícito del plan activo — 2026-08-20". Committed (`0f6c658`),
pushed to `origin/main`, and deployed to production
(`offline-nutrition-helper.pages.dev`) — verified live serving
`findTodayEntry`/`replacePendingMealsForToday`/`getBlockingActiveEntry`
and the `planReplaceDialog` markup.

Previously, updated 2026-08-19c/d — after the 2026-08-19b
diversity fix below, the user asked for the generator to hit budget
deadlocks less often WITHOUT losing that new diversity. Two attempts, both
measured against the same 1000-run stress test: (1) a ~12% internal
budget reserve (`data.targetBudget`) — turned out essentially inert,
because tier escalation is decided against the real hard cap, never the
reduced target; (2) sequencing the hard cap itself so early meals
(breakfast, lunch) get a share proportional to their calorie weight
instead of being free to spend the whole day's slack just by going
first — tried at full strength and rejected (cut calorie violations 53%
but cost ~20pp of dish coverage in breakfast/lunch, a real diversity
regression), then blended to half-strength and confirmed as a clean win:
`status:"perfect"` 240→251, tier-0 (no relaxation) 321→339, `cap25`/
`calories`/`time` violations all down, overall dish coverage 86.2%→86.8%
(breakfast unchanged) — see `STATE.md`, "Reserva de presupuesto y
reparto secuencial — 2026-08-19c/d". 2026-08-19a/b/c/d are all committed
together in `1f7798b`, pushed to `origin/main`, and deployed to
production (`offline-nutrition-helper.pages.dev`) — verified live
serving `plan-generator.js` with `BUDGET_RESERVE_RATIO=0.12`/
`SEQUENCING_BLEND_RATIO=0.5` and no `TOP_CANDIDATES_POOL`.

Previously, updated 2026-08-19b — a mass stress test
(1000 real generations, one fixed profile) requested by the user found
that dish SELECTION had a real diversity problem: breakfast/lunch only
ever produced 12 distinct dishes each (exactly the hard-coded
`TOP_CANDIDATES_POOL` cap on the selection lottery), and meat/fish were
almost entirely excluded from lunch/dinner (89%/72% of the catalog
never chosen) because the "tight" budget scoring mode ranked purely by
purchase-protein-per-euro, ignoring macro fit entirely. Fixed on the
user's explicit request: `TOP_CANDIDATES_POOL` removed, `dish-selector.js`
scoring rebalanced so macro fit always counts — re-running the same
1000-run test confirms real improvement (breakfast coverage
18.8%→98.4%, lunch 10.9%→80.0%, catalog-wide usage 27.8%→87.1%) at the
honestly-disclosed cost of needing time/taste/25%-cap relaxation more
often. All other generator constraints (hard budget cap, relaxation
ladder, macro tolerances) untouched; 2 golden-master tests recaptured
on purpose, 7 contract tests unchanged and green — see `STATE.md`,
"Diversidad del generador: eliminación de TOP_CANDIDATES_POOL y
reequilibrio de protein/€ — 2026-08-19b". This sits on top of
2026-08-19a (a real bug the user hit in use — confirming the plan more
than once created independently "purchasable" duplicate entries,
inflating pantry stock if bought through more than one — fixed via
upsert-onto-draft in `savePlanForToday()`, see `STATE.md`, "Confirmar
plan: UPSERT sobre el borrador del día — 2026-08-19"), 2026-08-14c
(full architecture/UX audit of despensa: active plans moved OUT of the
despensa accordion into a new always-expanded "Tu plan" section right
below the shopping list; despensa itself is just stock + completed-plan
history; `planDate` field distinct from `createdAt` — see `STATE.md`,
"Reubicación de 'Tu plan' fuera de la despensa — 2026-08-14c") and
2026-08-14b (3 clear blocks instead of one flat list mixing
stock/history/sub-stages, zero changes to the underlying logic — see
`STATE.md`, "Rediseño de UX de la Despensa — 2026-08-14b"). 2026-08-14b/c
are committed (`35f35a8`); 2026-08-19a/b/c/d are committed together in
`1f7798b` (see above) — see `STATE.md` session handoff for the full
commit/deploy record. Before that, the site already has a
**complete, LIVE accounts layer** (Supabase Auth email+password/Google
OAuth + Postgres + Row Level Security, guest mode preserved as the
default, local-first sync, idempotent guest→account migration with
conflict resolution), architecturally separate from the nutrition
engine, running against a real provisioned Supabase project and verified
end-to-end against it — real signup/login, cross-device cloud sync,
migration, and RLS-enforced user isolation all confirmed with live REST
calls, not just UI clicks or unit tests (see `STATE.md`,
"Aprovisionamiento real de Supabase + Google OAuth — 2026-08-14a"). ~~Only
remaining open item: no human has completed a real Google login
end-to-end yet~~ — **closed 2026-08-23**, the user confirmed they
personally completed a real Google login end-to-end (verification up to
that point had deliberately stopped short of entering real credentials —
the technical chain was already confirmed).
**Fase
1 of the data migration below is also partially done**: ingredient-level
kcal/protein/carbs/fat for 50 of 81 roles is real, verified, and live in
production (`js/data/ingredient-nutrition.js` + `js/core/nutrition.js`),
promoted from the `poc/` audit that had been sitting unused since
2026-08-04 (see `STATE.md`, "Rediseño del modelo de nutrición por
ingrediente"). Dish SELECTION is also purchase-cost-aware, not just the
final budget verification (2026-08-13, see `STATE.md`, "Presupuesto de
compra MARGINAL durante la selección") — committed and pushed long
since (see `STATE.md` session handoff for the exact current commit
before assuming otherwise; only the 2026-08-14c work above is still
uncommitted). Previous session (2026-08-08) redesigned the final budget
check to mean purchase cost, not usage cost, along with the meal
schedule feature from the session before that — both were committed and
pushed to `main` as of that update, commit `3bad470`. Core architecture
decision (2026-08-04): progressive migration from `dishes.js`
(fabricated macros) to real Mercadona products (see "Decisión de
arquitectura" below) — Phase 0 (test safety net) complete, Phase 1
(widen real-product coverage) now IN PROGRESS (50/81, up from 0
integrated before this session; the remaining 31 have no safe real-data
source today, see known issue #2 in `STATE.md`). Visual design was
reworked twice in the 2026-08-03/04 window; current production CSS is
still that second revision ("premium fitness nutrition", see `STATE.md`).
Dataset is still 334 dishes / 81 ingredient roles (unchanged since
2026-08-03) — this session did not add or remove dishes, only fixed how
their ingredients' nutrition is computed and displayed.

## Completed

- **Multi-store data pipeline + store picker (2026-08-23d/2026-08-24)**:
  real Playwright scrapers for Alcampo and Carrefour (`PythonProject`
  repo, `scrapers/alcampo.py`/`carrefour.py`), a new export script
  (`scripts/export_real_products.py`) feeding this repo's
  `REAL_PRODUCTS_CATALOGS` registry, and a real `<select id="store">`
  driving the no-cook engine end-to-end (dish-recipe pricing still
  Mercadona-only, see "Fase B" under Next priorities). Data state:
  Alcampo 288 scraped/215 food-filtered/0 nutrition-matched; Carrefour
  blocked by Cloudflare, 0 products. Not deployed to production. See
  `STATE.md` and `ROADMAP.md` "Current status" above for full detail.
- Modularized static JavaScript prototype; offline 334-dish dataset,
  responsive meal-plan interface.
- Architecture, data, UX, accessibility, and generator audit (2026-07-18).
- Full visual redesign round 1 (2026-08-03): design system, honest
  branding, collapsed product catalog, shopping list UI.
- Shopping list with a correct usage-vs-purchase cost model (2026-08-03).
- Budget presets (Ajustado/Equilibrado/Amplio, 2026-08-03) alongside exact
  amount, calibrated from real dish-cost percentiles.
- Proof-of-concept `IngredientResolver` + full 81-ingredient audit
  (`poc/`, 2026-08-03): 50/81 resolved to a real product, 31 documented
  unresolved with reason — **not yet integrated into production**, this
  PoC is the foundation the Fase 1-2 migration below builds on.
- **Architecture decision (2026-08-04)**: Strategy A vs. B vs. C compared
  for the dishes.js→real-products migration; **Strategy B** chosen. See
  full record below.
- **Fase 0 — stabilization tests (2026-08-04)**: `tests/plan-generator.
  characterization.test.js` (9 tests, contract-level coverage of
  `generateDietPlan()` across 5 profiles + 2 seeded golden-masters) and
  `tests/ingredient-packaging-coverage.test.js` (2 tests, diagnostic —
  found and pinned that 25/81 ingredient roles lack known packaging, not
  18 as an earlier ad-hoc script estimated). 61 tests total (`tests/` +
  `poc/tests/`), 0 failed, stable across repeated runs. See `STATE.md`.
- **Visual redesign round 2 (2026-08-04)**: "Premium Fitness Nutrition ×
  Editorial Food × Modern Digital Product" direction, applied directly to
  `assets/css/style.css` (no HTML/JS changes). Plus a mobile layout
  recomposition (not just compression) and a real CSS Grid bug fix
  (unequal budget-preset chip widths). Full detail in `STATE.md`.
- **Despensa / pantry inventory (2026-08-06/07)**: `js/core/pantry.js` +
  `js/ui/render-pantry.js`, localStorage-backed, 3-stage lifecycle (save
  plan → mark purchase → mark each meal cooked) after a v1 single-action
  design produced wrong data in a real-world "bought but never cooked"
  scenario. Deliberately not connected to `dish-selector.js` (dish
  SELECTION stays pantry-unaware — as of 2026-08-08 the budget check that
  happens after selection IS pantry-aware, see below) or no-cook mode
  (as of 2026-08-20f the lifecycle IS connected to no-cook mode —
  selection there still isn't, deliberately, see that date above). 33
  new tests. Full design record, including why v1 was rejected, in
  `STATE.md`.
- **App-startup architecture hardening (2026-08-07)**: the same real-world
  test that motivated the despensa redesign also surfaced a real
  architectural bug — one malformed `localStorage` entry could abort the
  whole `DOMContentLoaded` handler before the form's submit listener
  attached, so "Generar plan" silently fell back to a native form submit
  (full page reload). Fixed with 4 isolated defense layers (data
  validation at the source, per-row render isolation, per-module
  `safeInit()`, and critical-path listeners wired before any optional
  module) rather than a single added try/catch. Full detail in `STATE.md`.
- **Meal schedule (2026-08-07)**: `js/core/meal-schedule.js` +
  `js/ui/render-schedule.js` — each generated meal gets a real clock time
  (wake/sleep-anchored, evenly spaced, chronologically ordered), computed
  after the generator returns so `plan-generator.js`/`dish-selector.js`
  are untouched. Fixed a pre-existing category-order rendering bug as
  part of the same change. Mobile-only sticky "next meal" bar; time
  persisted through pantry history with a safe fallback for older plans.
  36 new tests (114 total). Full design record in `STATE.md`.
- **Budget = purchase cost, not usage cost (2026-08-08)**: `js/core/
  budget.js` (new, shared by the generator and the shopping list) computes
  the real aggregate purchase cost of a day-plan, pantry-aware.
  `plan-generator.js`'s budget enforcement/scoring/feasibility-reporting
  switched from usage cost to this — fixes a real reported bug where an
  "8€" plan could require 19€ at checkout. Dish selection itself
  (`dish-selector.js`) is untouched. Presets recalibrated against real
  measured purchase cost (5/8/12 → 15/20/28). 12 new tests (126 total).
  Full design record in `STATE.md`.
- **Marginal purchase-cost-aware dish SELECTION (2026-08-13)**: the
  2026-08-08 redesign fixed the final verification but dish `SELECTION`
  itself (`pickDish`, `dish-selector.js`) still decided affordability by
  usage cost — a "cheap to use" dish could still force buying a whole
  expensive package, only caught after the fact by trimming. Now the
  cascade asks for the MARGINAL purchase cost of each candidate
  (`js/core/budget.js`, new `estimate*MarginalPurchaseCost` family):
  how much a dish adds to today's real purchase given what earlier meals
  in the same day already committed to buy (`committedGrams`) and real
  pantry stock — used as the authoritative signal in affordability,
  ranking, and portion-shrinking; usage cost is kept only as a secondary,
  lower-weight tiebreaker. `enforcePurchaseBudgetCap` (2026-08-08) is
  unchanged and remains the final safety net. Per-ingredient package price
  now also shown on meal cards, not just the aggregated shopping list. 13
  new tests (162 total), 2 golden-masters recaptured (selection algorithm
  changed on purpose), 7 contract/invariant tests unchanged and still
  passing. Verified live in browser, including an isolated proof that
  stocking a pantry with exactly a required amount drops that ingredient's
  purchase cost to €0 and the day total by the exact same amount. Full
  design record in `STATE.md`. Committed as part of `aa4f20b` (bundled
  with the rest of the 2026-08-13 session) and pushed.
- **Real per-ingredient nutrition — Fase 1 partially done (2026-08-13d)**:
  a user-reported bug (an ingredient showing macros that biologically
  belonged to a different ingredient in the same dish — mass-allocation
  of the dish's hand-curated total by gram share, not real per-ingredient
  composition) led to promoting the already-audited `poc/data/
  ingredient-rules-full.js` (50/81 ingredient roles with real, verified
  kcal/protein/carbs/fat, matched by hand against `real-products.js` back
  in 2026-08-04 but never integrated into production) into `js/data/
  ingredient-nutrition.js` + a new `js/core/nutrition.js`
  (`computeDishIngredientNutrition`). Resolved ingredients now get exact
  real macros, scaled linearly; the dish's remaining (unresolved)
  ingredients get the REMAINDER of the dish total (never a value borrowed
  from a resolved neighbor) — this is what actually fixes the reported
  bug. `dish-selector.js`'s `buildMealFromDish` rewritten to use this;
  usage/purchase-cost pipeline untouched. UI shows real per-ingredient
  macros with a "real" badge when verified, an explicit "not verified"
  note otherwise — never a fabricated number. 15 new tests including
  exact regressions for the reported case and a chicken+rice case, 2
  golden-masters recaptured on purpose (data model changed
  fundamentally), 177 tests total, 7 contract/invariant tests unchanged
  and still passing. Verified live in browser against the exact reported
  case. Full design record in `STATE.md`. Committed as part of `aa4f20b`
  (bundled with the rest of the 2026-08-13 session) and pushed.
- **Real per-ingredient nutrition — auditoría del recorte a cero +
  consistencia Atwater (2026-08-13e)**: antes de tocar nada más, se
  investigó a fondo el compromiso conocido de la fase anterior (172/334
  platos donde la suma real de ingredientes resueltos, en al menos un
  macro, supera el `dish.total` antiguo y se recorta a 0 en vez de
  repartir un remanente negativo). Conclusión: el modelo de remanente
  (`total = max(sumaReal, estimaciónAntigua)`) es matemáticamente sólido
  y deliberado, no un bug — la mayoría de los casos son ruido de
  redondeo de la estimación manual antigua (incluso en platos 100%
  resueltos) y el resto son correcciones reales de categorías que
  `dishes.js` infravaloraba sistemáticamente (conservas en aceite,
  frutos secos, pechuga de pavo). No se cambió el mecanismo de recorte.
  La investigación sí encontró un bug real independiente: el kcal de un
  ingrediente sin resolver tenía su propio remanente anclado a
  `dish.kcal`, pudiendo quedar inconsistente con su propio protein/
  carbs/fat (99 filas con diferencia >20kcal frente a Atwater, ej.
  "Mermelada light" con 11.5g de carbohidratos pero 0kcal). Corregido en
  `js/core/nutrition.js`: kcal de ingredientes sin resolver ya no usa
  `dish.kcal` en absoluto, se deriva por Atwater
  (`protein×4 + carbs×4 + fat×9`) de su propio remanente — 0 filas
  inconsistentes tras el fix. Ingredientes resueltos siguen usando su
  kcal real tal cual (nunca recalculado). 1 test corregido + 4 nuevos en
  `tests/ingredient-nutrition.test.js` (18 total), golden-masters
  recapturados de nuevo, **180 tests total**, 0 fallos (157 en `tests/` +
  23 en `poc/tests/`). Verificado en vivo en el navegador (desktop y
  mobile) contra el caso exacto de "Mermelada light"; despensa, no-cook
  y purchase cost sin cambios. Análisis completo en `STATE.md`, sección
  "Auditoría del recorte a cero y corrección de consistencia Atwater —
  2026-08-13e". Committed as part of `aa4f20b` (bundled with the rest of
  the 2026-08-13 session) and pushed.
- **Multi-user accounts — Supabase Auth + Postgres + RLS (2026-08-13f)**:
  the user asked to turn the site from a purely local, single-user app
  into a real multi-user one — email+password and Google sign-in, a
  persistent session across reloads, and every piece of personal data
  (profile/settings, despensa, confirmed/cooked plan history) cloud-
  backed and scoped per account, reachable from any device, without
  rewriting the nutrition engine and without discarding guest mode.
  Chose Supabase (Auth incl. Google OAuth + Postgres + Row Level
  Security, free tier, CDN UMD SDK — same "no build system" fit as the
  existing GSAP dependency) over Firebase/Auth0/Clerk after evaluating
  the tradeoffs (see `STATE.md` for the full reasoning). Architecture:
  local-first/optimistic — localStorage stays the synchronous source of
  truth `pantry.js`/`render-pantry.js`/`calculator.js`/
  `meal-schedule.js`/every `js/engine/*` file already used, completely
  unchanged; a new, separate layer (`js/core/{supabase-client,settings,
  auth,cloud-sync,migration}.js` + `js/ui/render-auth.js`) hydrates
  localStorage from the cloud on login and pushes every local mutation
  in the background, hooked into the `onPantryChange` extension point
  `app.js` already exposed plus two new hook points. One Postgres table
  (`user_data`, `supabase/schema.sql`) with three JSONB columns
  mirroring the three localStorage-shaped blobs 1:1, RLS scoped to
  `auth.uid() = user_id`, a `security definer` trigger auto-provisioning
  the row on signup so client writes are always `UPDATE`, never upsert.
  Guest→account migration is idempotent via a per-BROWSER marker
  (`nutritionPlanner.cloudSyncedUserId.v1`), not just an account-level
  `migrated_at` timestamp — the account-only guard has a real shared-
  device leak (found and fixed during design, see `STATE.md`) where a
  second person logging into the same browser could have the first
  person's leftover local cache treated as their own guest data.
  Conflict (both local and cloud have real data on a fresh browser) is
  never resolved silently — the user explicitly picks keep-cloud/
  keep-local/merge. 66 new tests (settings/migration/cloud-sync/auth,
  246 total, 0 failures across `tests/`+`poc/tests/`), all against a
  simulated Supabase client (the Node test sandbox has no real network).
  Verified live in browser (desktop + mobile) in guest mode at first
  (2026-08-13f, no real Supabase project existed yet), then committed
  (`aa4f20b`).
  **2026-08-14a — provisioned for real and fully verified against the
  live backend**: the user created the Supabase project + Google OAuth
  client (the only two steps that genuinely required their own accounts)
  and handed over the public URL/anon key; everything else was
  automated or verified via direct REST calls, not just the UI. Real
  email+password signup/login with an immediate session, page-reload
  persistence, a simulated brand-new device (localStorage wiped
  entirely) correctly pulling settings/despensa back from the cloud,
  idempotent re-sync (no duplication), a live conflict+merge run that
  left both sides identical, and logout correctly wiping the local
  cache. **User isolation was tested by attacking the API directly**,
  not just checking the UI: User B's real session token could not read
  User A's row (even filtering by User A's exact id), and a `PATCH`
  attempt against User A's row using User B's token returned `200` but
  affected 0 rows — confirmed by re-reading User A's row afterward,
  unchanged. The Google OAuth redirect chain (app → Supabase
  `/authorize` → `accounts.google.com`) was followed for real and Google
  accepted the configured `client_id`/`redirect_uri` with a genuine
  sign-in page — verification stopped exactly at the point a human
  would need to enter real Google credentials, deliberately, since
  entering someone's real password is never something to automate. Full
  regression: 246 tests green, despensa's 3-stage lifecycle (buy →
  cook → undo) and no-cook re-verified in guest mode, mobile unaffected.
  Committed (`f66bfac`, config-only — zero code changes) and deployed;
  production re-verified against the same live Supabase project. Full
  blow-by-blow in `STATE.md`, "Aprovisionamiento real de Supabase +
  Google OAuth — 2026-08-14a". Honest open item: no human has completed
  a real Google login end-to-end yet (the technical chain is confirmed,
  but no credentials were ever entered by design) — first real use of
  the button is that final proof.
- **Despensa UX redesign, zero logic changes (2026-08-14b)**: the user
  (the app's own author) reported that even they sometimes couldn't
  follow the despensa panel's interface logic — the underlying 3-stage
  lifecycle in `js/core/pantry.js` was fine, the problem was purely
  presentational (a single flat list mixing current stock, the full
  history of every confirmed plan, and always-expanded buy/cook
  sub-stages). Rewrote `js/ui/render-pantry.js` around 3 clear blocks —
  editable-in-place stock, an "active plans" section for anything still
  pending, and a collapsed read-only history a plan joins automatically
  once fully cooked — plus a searchable text+datalist ingredient picker
  replacing an 81-option `<select>`. `pantry.js`, the financial model,
  and cloud sync are untouched; verified live that purchaseCost/
  shopping-list/plan confirmation/authenticated sync all behave
  identically. Full reasoning in `STATE.md`, "Rediseño de UX de la
  Despensa — 2026-08-14b".

## Decisión de arquitectura: migración a productos reales (2026-08-04)

El problema central sin resolver del proyecto es que `dishes.js` fabrica
macros de ingrediente por asignación de masa del `dish.kcal` agregado a
mano (known issue #2 en `STATE.md`) — nunca deriva de un dato real del
pipeline Python, a pesar de que el objetivo declarado del producto es usar
productos REALES de Mercadona. Se evaluaron formalmente 3 estrategias:

**DECISION**: Estrategia B — mantener `dishes.js` como plantillas de
receta (334 combinaciones ya vetadas por criterio humano — el activo más
caro de recrear) y resolver cada ingrediente progresivamente contra
`REAL_PRODUCTS` vía el `IngredientResolver` ya construido y probado en
`poc/`. Cuando un ingrediente resuelve de forma fiable, sus macros/precio/
envase pasan a ser reales; cuando no, queda explícitamente marcado (nunca
un valor inventado) — exactamente el patrón que `poc/INGREDIENT_COVERAGE.md`
ya demuestra funcionando sobre 81/81 roles.

**WHY**: el cuello de botella real del proyecto no es "de dónde vienen los
productos" (ya resuelto: Mercadona real, vía el pipeline Python) sino "qué
combinaciones de productos son una comida con sentido" — y ese
conocimiento culinario ya existe, curado a mano, en las 334 entradas de
`dishes.js`. B preserva ese activo mientras reemplaza la parte barata de
arreglar (macros fabricadas) por datos reales, de forma incremental y de
bajo riesgo (ingrediente a ingrediente, con fallback explícito, nunca
big-bang).

**ALTERNATIVES CONSIDERED**:
- **Estrategia A — parchear el motor actual de `dishes.js` sin más.**
  Rechazada: no ataca la causa raíz (macros fabricadas); seguir
  construyendo encima solo aumenta el coste de migrar después.
- **Estrategia C — rediseñar el motor para que los productos reales de
  Mercadona sean la fuente primaria y las recetas se construyan
  dinámicamente a partir de ellos.** Rechazada (por ahora, no para
  siempre): descartaría de golpe las 334 combinaciones ya vetadas y
  obligaría a reconstruir desde cero el "conocimiento de qué combina con
  qué" — el trabajo más caro y menos automatizable del proyecto — solo
  para ganar algo que B ya consigue por otro camino (datos 100% reales).
  Su mayor riesgo (servir combinaciones sin sentido culinario, ej.
  "requesón + jamón serrano + agua con gas" como cena) es el tipo de
  fallo que destruye la confianza del usuario al primer vistazo.

**CURRENT STATUS**: decisión tomada, Fase 0 (tests) completada. Fase 1
**en progreso desde 2026-08-13d** — el 50/81 que llevaba desde
2026-08-04 auditado en `poc/` pero sin integrar, ahora SÍ está en
producción (`js/data/ingredient-nutrition.js`, `js/core/nutrition.js`,
alimenta macros por ingrediente reales en `dish-selector.js`). Lo que
queda de Fase 1: ampliar la cobertura más allá de 50/81 (requiere que el
pipeline Python verifique más productos en `real-products.js` — trabajo
del lado Python, no de este repo) y reparar el script de exportación
Python→frontend que hoy no existe.

### Roadmap de migración por fases

Fase 0 completada (2026-08-04); Fases 1-6 no iniciadas. Cada fase debería
tener: objetivo, archivos implicados, archivos a NO tocar, dependencias,
riesgos, tests necesarios, criterio de fin — definidos con detalle cuando
se empiece esa fase, no de antemano en abstracto.

| Fase | Objetivo | Estado |
| --- | --- | --- |
| 0 | Estabilización y tests — red de seguridad antes de tocar el motor | **Completada 2026-08-04** |
| 1 | Datos reales — ampliar cobertura de resolución ingrediente→producto más allá de 50/81; reparar el script de exportación Python→frontend que hoy no existe | **En progreso; diagnóstico corregido 2026-08-25** — 50/81 integrados desde 2026-08-13d. El script de exportación ya existe (`PythonProject/scripts/export_real_products.py`, 2026-08-24). Lo que NO es cierto y se creía desde hace meses: que los 31 restantes se cierren con más scraping. Son fruta/verdura/pescado/carne frescos y graneles — 10 de ellos ya están en el catálogo de Mercadona con `kcal=null`. Se cierran con una tabla de composición (BEDCA/USDA, ~20/31 cerrables medido), no con un catálogo de marcas. Ver "Next priorities" #1 |
| 2 | Nuevo motor de planificación — `dish-selector.js`/`plan-generator.js` usan el resolver en vez de macros hardcodeadas; `dishes.js` pasa de "plato con macros fijas" a "plantilla de receta con roles" | Parcialmente empezada — `buildMealFromDish` ya usa datos reales por ingrediente cuando existen (2026-08-13d), pero `dishes.js` sigue siendo "plato con macros fijas" (el remanente de los 31/81 sin resolver todavía se ancla al total hand-curated del plato) |
| 3 | Presupuesto y coste real — unificar `usageCost`/`purchaseCost` para que se calculen siempre desde el producto real resuelto; recalibrar `budget-presets.js` | No iniciada |
| 4 | Variedad y generación de planes — planes multi-día; decidir el destino del modo "sin cocinar" (¿converge con el motor principal?) | No iniciada |
| 5 | UX / funcionalidades — exportar lista de la compra, selector de tienda, persistencia local | No iniciada |
| 6 | Extensión a otras tiendas — probar que la arquitectura generaliza más allá de Mercadona | **En progreso 2026-08-23d/2026-08-24** — scrapers reales de Alcampo/Carrefour y selector de tienda en el motor "sin cocinar" (ver `STATE.md`); el motor de PLATOS (`PRICE_CATALOGS`) sigue solo con Mercadona curado — precios reales de Alcampo/Carrefour para platos ("Fase B") pendiente, es trabajo de curación de datos, no de fontanería |

Esta tabla de fases **reemplaza y detalla** las antiguas Milestones 1-2 de
la tabla de abajo (fundación de tests + modelo de datos validado) — esas
dos filas quedan marcadas como superseded. Las Milestones 0 y 3-8 (safety/
producto, constraint solver, historial/dashboard, progreso, workout,
capa de IA, hardening) siguen vigentes tal cual, son ortogonales a esta
decisión de arquitectura de datos.

## Next priorities

0. **P0 — deploy the 2026-08-23d/2026-08-24 store-picker work, when ready.**
   `6b5ff9f`/`1f38a5d`/`c20d9fe` (nutrition-planner) are committed and
   pushed but never deployed (`npx wrangler pages deploy .` was not run
   this session) — production still serves the pre-store-picker build.
   Before deploying: decide whether shipping a store with 0 real nutrition
   matches (Alcampo) or 0 products (Carrefour) is acceptable UX, or
   whether to gate the picker to hide stores with empty/low-quality
   catalogs.
1. **P0 — Fase 1 de la migración — DIAGNÓSTICO CORREGIDO 2026-08-25.**
   Durante meses esta línea decía que Fase 1 estaba bloqueada esperando
   "más productos verificados en `real-products.js` (trabajo del lado
   Python)", es decir: más scraping. **Eso era un diagnóstico
   equivocado.** Los 31 roles de ingrediente sin resolver se
   desglosan así (contado sobre `js/data/ingredient-nutrition.js`, no
   estimado):

   | `reason` | nº |
   | --- | --- |
   | `no_existe` | 12 |
   | `sin_nutricion` (el producto existe, pero `kcal=null`) | 10 |
   | `solo_producto_no_apto` | 3 |
   | `match_ambiguo` | 3 |
   | otros (`otra`, `needsReview`) | 3 |

   Y la lista concreta es **brócoli, calabacín, kiwi, pepino, plátano,
   fresas, conejo, lubina, rape, salmón, bacalao, aguacate, avena,
   pasta cocida, cuscús cocido, arroz integral cocido...** — fruta y
   verdura fresca, pescado fresco, carne fresca y graneles.

   **Un catálogo de productos de marca nunca va a tener nutrición
   fiable de un brócoli suelto**, por mucho que se amplíe: no es un
   producto envasado con etiqueta. Los 10 casos `sin_nutricion` lo
   dicen literalmente — el producto SÍ está en el catálogo de
   Mercadona, con `kcal=null`. Más scraping no cambia eso.

   Lo que sí lo cierra es una **tabla de composición de alimentos**,
   que es exactamente el tipo de fuente que modela alimentos genéricos.
   Medido el 2026-08-25 (ver `PythonProject/PROJECT_CONTEXT.md`,
   sección 19): BEDCA (base oficial española, 2.336 alimentos, API XML
   funcionando y gratuita) cubre bien ~12-14 de los 31; USDA FoodData
   Central cubre buena parte del resto y además tiene variantes
   **cocidas** explícitas, que resuelven el desajuste crudo/cocido que
   bloquea `pasta cocida`/`cuscús cocido`/`arroz integral cocido`.
   Juntas, **~20 de 31 parecen cerrables**.

   **Cómo cerrarlo** (no implementado todavía): tier 4
   (`bedca_generic`/`usda_generic`), siempre marcado como aproximación
   con `needs_review`, alimentando `ingredient-nutrition.js` — donde la
   UI ya distingue "real" de "no verificado" por ingrediente, así que
   el andamiaje de honestidad ya existe. Aviso medido: el top-hit
   ingenuo de ambas fuentes falla ~la mitad de las veces ("edamame" ->
   "Queso **edam**" en BEDCA; "skyr" -> "Tofu yogurt" en USDA), así que
   necesita el mismo scoring + umbral + `needs_review` que el tier 2.
2. **P0 — Make constraints truthful.** Treat budget, prep time, nutrition tolerance, variety, and per-item calorie cap as hard post-generation checks. Budget specifically is now truthful in the sense that matters most (enforced against real purchase cost, not usage cost — 2026-08-08; and since 2026-08-13, the SELECTION cascade itself also optimizes for real purchase cost, not just the final check, see `STATE.md`); the remaining known gap is narrower — cap25%/budget-trim interaction (`STATE.md` known issue #8, still present under `enforcePurchaseBudgetCap`, unchanged 2026-08-13), and fixing that properly still belongs in Fase 2 of the migration above, not as an isolated patch.
3. **P0 — Correct product claims and safety.** ~~Remove the current AI/guarantee claims~~ **done (2026-08-03):** branding no longer says "AI"/"Chef Mode". Still open: clear scope, contraindication guidance, and required dietary/medical constraints before personalization.
4. **P1 — Establish an engineering foundation.** Fase 0 (2026-08-04) covers unit/characterization tests for the core engine — still missing: TypeScript, ES modules, linting, formatting, CI, package manifest.

## Milestones

| # | Goal | Complexity | Dependencies | Impact | Primary risk | Status |
| --- | --- | --- | --- | --- | --- | --- |
| 0 | Product/safety decisions and acceptance criteria | M | Nutrition expert input | Critical | Treating health guidance as generic UI copy | Open |
| 1 | ~~Typed frontend foundation and test harness~~ | M | Milestone 0 | High | Migration without preserving baseline behavior | **Superseded** — see migration Fase 0-1 above; test harness (untyped) done 2026-08-04 |
| 2 | ~~Canonical food/recipe model and validated nutrition engine~~ | XL | Milestone 0–1, trusted data | Critical | Data quality and licensing/maintenance burden | **Superseded** — see migration Fase 1-2 above |
| 3 | Deterministic constraint solver and feasibility UX | XL | Milestone 2 (now: migration Fase 2) | Critical | Over-constraining menus; unclear trade-offs | Open |
| 4 | Recipe, plan history, shopping list, and dashboard | L | Milestone 1–3, persistence | High | Scope creep and weak information architecture | Open |
| 5 | Progress tracking and adaptive recommendations | L | Milestone 4 | High | Noisy user data and unsafe inferences | Open |
| 6 | Workout and recovery domains | XL | Profile, progress, safety model | High | Mixing domain rules with unvalidated AI advice | Open |
| 7 | AI explanation/orchestration layer | L | Validated domain tools and server boundary | High | Hallucinations, API key exposure, user trust | Open |
| 8 | Release hardening and portfolio launch | L | All above | High | Accessibility, privacy, and regression debt | Open |

## Future ideas

- ~~Pantry inventory~~ **Shipped 2026-08-06/07** — `js/core/pantry.js` +
  `js/ui/render-pantry.js`, "Despensa" panel. 3-stage lifecycle (use plan
  today → mark purchase done → mark each meal cooked), localStorage-only.
  Originally deliberately NOT connected to `dish-selector.js`; **as of
  2026-08-13 it IS** — dish selection now prefers pantry-covered
  ingredients via marginal purchase cost (see `STATE.md`, "Presupuesto de
  compra MARGINAL durante la selección"). ~~Still NOT connected to no-cook
  mode~~ — **connected 2026-08-20f**, full 3-stage lifecycle (product
  SELECTION in `generateNoCookPlan()` still isn't pantry-aware,
  deliberately). See `STATE.md`, section "Despensa (pantry/inventory)" for
  the full design and the real-world bug that drove the v1→v2 redesign.
- Remaining: barcode/import flows, meal-prep batching, calendar
  integration, coach mode, multilingual content, and analytics.
- Add only after the core plan is trustworthy, explainable, and testable.

## Update rule

At the end of every development task, update the status, completed items, new risks, and the first actionable priority. Do not mark a milestone complete until its acceptance criteria and tests pass.