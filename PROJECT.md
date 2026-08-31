# Nutrition Planner — Project Context

## Dónde vive esto y qué hay nuevo (2026-08-27, commiteado 2026-08-31)

**Ruta buena:** `C:\Users\andre\Desktop\Offline Nutrition Helper\nutrition-planner`.
La antigua `nutrition-planner-fase2` ya no existe.

Cuidado con DOS carpetas del Escritorio que NO son el repo:

- `Desktop\nutrition-planner` — copia VIEJA, sin git y sin nada de este
  trabajo. Es la que se abre por error.
- `Desktop\nutrition-planner-app` — no es una copia vieja: es el
  ENTREGABLE generado el 2026-08-26 para mandar a terceros (solo los
  archivos que `index.html` necesita, sin tests ni docs ni git). Se
  regenera, no se edita.

El repo bueno es el único con git: HEAD `4477365`, 372 tests en verde.
Comprueba con `git log -1` antes de fiarte de una carpeta.

Lo de esta tanda se commiteó el 2026-08-31 en cuatro commits revisados uno
a uno con el usuario (`f9f2777` cordura de porciones · `0a69db5` módulo de
autocompletado · `76d4e86` sesgo de cocina + peso de caducidad · `4477365`
instrucciones/equipo/ingredientes/UI/docs), sobre `ec6f686`, push forzado a
`origin/main`. Detalle en `STATE.md` → "UPDATE 2026-08-31".

Archivos nuevos de esta tanda, todos **aditivos** — si faltan, la app se
comporta exactamente como antes, que es el patrón que ya se usó con
`product-storage.js`:

| archivo | qué es |
| --- | --- |
| `js/data/dish-instructions.js` | pasos de cocina, equipo y dificultad. 333 de 334 platos (2026-08-31; falta "Merluza al ajillo", necesita ajo) |
| `js/data/dish-cuisine.js` | a qué cocina pertenece cada uno de los 334 platos |
| `js/ui/ingredient-suggest.js` | autocompletado del campo "no me gusta" |

Y tres constantes nuevas que gobiernan comportamiento del motor:

| constante | dónde | valor |
| --- | --- | --- |
| `PORTION_CAP_MULTIPLIER` | `js/engine/plan-generator.js` | 2.5 |
| `PACKAGE_TRIM_RATIO` | `js/engine/plan-generator.js` | 0.20 |
| `CUISINE_BIAS_WEIGHT` | `js/engine/dish-selector.js` | 1500 |
| `EXPIRY_BIAS_WEIGHT` | `js/engine/dish-selector.js` | 2500 |

### Tres distinciones de diseño que no se deben fundir

Parecen lo mismo y no lo son. Fundirlas es el error que este código está
montado para hacer difícil:

1. **Preferencia blanda vs. restricción dura.** "No me gusta" vive en
   `js/core/preferences.js` y filtra; sin datos, no excluye nada. Las
   alergias irán en un `js/core/allergens.js` aparte y son restricción de
   seguridad: sin datos, EXCLUYEN. La regla de "sin datos" es la contraria
   en cada caso, y por eso son dos archivos y no un campo `severidad`.

2. **Sesgo vs. filtro.** La cocina SESGA la puntuación (lo español sale
   más), nunca filtra: está medido que al preferir español lo internacional
   también sube. El usuario pidió "mixto, pero española más" — un filtro
   haría lo contrario de lo que pidió. Equipo y dificultad, en cambio, sí
   son filtros de candidatos, nunca puntuación.

3. **Identidad vs. ingredientes.** Un plato es de una cocina por lo que ES
   o por una técnica con origen, jamás por llevar un ingrediente de allí.
   "Skyr con kiwi" no es islandés. Aplicar esto en serio deja 274 de 334
   platos en `neutra`, y ese es el resultado honesto.

### La regla de datos que manda sobre todo lo demás

**Nunca se escribe un valor nutricional inventado.** Todo kcal/proteína/
carbos/grasa tiene que remontarse a un registro real y verificable. Cuando
no se puede, el rol se queda `resolved:false` con el motivo escrito —
`cebolla` y `ajo` están así ahora mismo, con precio y envase reales pero la
nutrición diciendo "no se sabe". Un rol con números inventados es peor que
un rol ausente.

Corolario aprendido tres veces en un solo día, apuntado como regla:
**la coherencia interna no defiende de nada**. Treinta productos de
"cebolla" con nutrición perfectamente coherente eran patatas fritas y
salsas; el aceite de avena de USDA pasa Atwater y el ratio kJ/kcal y trae
un `fdcId` real. Lo único que defiende es comprobar qué ES la cosa. El
detalle, con números, en el bloque "EMPIEZA AQUÍ" de `STATE.md`.


> Todo lo que sigue a partir de aquí es de 2026-08-13 y ANTERIOR. Sigue
> siendo válido como descripción del motor, pero no cubre nada de lo de
> arriba. Para el estado real, `STATE.md` -> "Handoff 2026-08-26" (al final
> del archivo), escrito para alguien sin contexto ninguno.

Updated 2026-08-13. This file is the fast orientation doc — for full
detail, history, and the "why" behind decisions, read `STATE.md` (engineering
state, dated sections, session handoffs) and `ROADMAP.md` (architecture
decision record, migration phases). For code-level navigation, there's a
Graphify code graph (`graphify explain "<symbol>"`, `graphify query
"<question>"` from this directory) — see `PythonProject/docs/graphify.md`.

## Purpose

Spanish-language, offline single-page app that estimates calorie/
macronutrient targets and produces a real, cookable daily meal plan
(5 meals) from a local recipe dataset, plus a shopping list, a "no-cook"
mode (ready-to-eat real products), and a persistent pantry/inventory. It
is a rule-based generator; it does **not** use AI or any external service
at runtime.

## Current stack

- Static HTML, CSS, and browser-global JavaScript; no build system, package
  manager, backend, or auth. Client-side persistence via `localStorage`
  (pantry only — see below), added 2026-08-06/07; nothing else in the app
  persists.
- `index.html` loads scripts in a manually ordered dependency chain — script
  order matters (each file assumes the previous ones already ran).
- `assets/css/style.css` supplies the current "premium fitness nutrition"
  visual system (rewritten 2026-08-04, mobile-first pass same date).
- `js/data/dishes.js` contains **334** recipe-like dishes, **81** unique
  ingredient roles (audited programmatically, see `STATE.md`).
- Hand-rolled test runner (no framework), Node + `vm` loads real production
  files unmodified: `tests/` (284 tests as of 2026-08-24) + `poc/tests/`
  (23 tests) = **307 tests total**.

## Current runtime flow

1. `app.js` (`DOMContentLoaded`): captures DOM refs, wires the critical form
   listeners FIRST, then initializes every optional module (shopping list,
   pantry, catalog, no-cook, budget presets) inside its own `safeInit()` —
   one module's failure can never block another or the form itself (see
   `STATE.md`, "Bug arquitectónico real + rediseño de la inicialización").
2. `calculator.js` derives BMR, TDEE, calorie target, protein, fat, carbs;
   budget resolves from a preset (Ajustado/Equilibrado/Amplio) or an exact
   amount, both to the same `data.budget` number — **`data.budget` means
   purchase cost (money spent at checkout today), not usage cost**, see
   "Budget = purchase cost" below.
3. `plan-generator.js` assigns 5 meals (desayuno/comida/cena/snack/snack2),
   allocating budget dynamically across them using MARGINAL purchase-cost
   heuristics during selection (since 2026-08-13 — how much a candidate
   adds to today's real purchase, given packages already committed by
   earlier meals of the same day plus real pantry stock), then enforces
   the REAL aggregate purchase cost (`js/core/budget.js`, pantry-aware) as
   the authoritative final gate.
4. `dish-selector.js` filters/ranks/scales dishes against a strict
   marginal-purchase-cost cascade + a relaxation-tier ladder for
   time/taste/25%-cap (never budget) — usage cost is kept only as a
   secondary, lower-weight tiebreaker (see "Budget = purchase cost"
   below), still the heuristic that picks candidate dishes meal-by-meal.
5. `meal-helpers.js` totals/rebalances meals.
6. `meal-schedule.js` (after the plan is built, never inside the
   generator) assigns a real clock time to each meal from the user's
   wake/sleep preferences and reorders the meals chronologically — see
   "Meal schedule" below.
7. `render.js`/`render-insights.js` render the plan (now in chronological
   order, with a time badge per card); `render-schedule.js` renders the
   day-schedule strip and the mobile-only sticky "next meal" bar;
   `render-shopping-list.js` aggregates ingredients into a shopping list,
   pantry-aware if `pantry.js` is loaded (falls back to plain
   purchase-cost math if not).
8. Optionally: `render-pantry.js` lets the user save today's plan, mark a
   purchase done (adds to pantry stock), and mark individual meals cooked
   (subtracts from pantry stock) — see "Pantry / Despensa" below.

## Important files

| Area | Files | Responsibility |
| --- | --- | --- |
| UI entry | `index.html`, `js/app.js` | Form, orchestration, DOM event handling, startup isolation (`safeInit`) |
| Nutrition core | `js/core/calculator.js`, `js/core/meal-helpers.js` | Target calculation and meal arithmetic |
| Ingredient nutrition | `js/core/nutrition.js` | Real per-ingredient kcal/protein/carbs/fat when verified (**79/81 roles as of 2026-08-31** — Mercadona products + 31 from USDA FoodData Central), dish-total remainder for the last 2 (`Wrap proteico`, corrupt `Lechuga: Pepino`) — never mass-share allocation (2026-08-13d); unresolved-row kcal derived by Atwater from its own protein/carbs/fat remainder, never independently clamped (2026-08-13e) |
| Pricing | `js/core/pricing.js` | Ingredient/dish pricing, package resolution, usageCost vs. purchaseCost |
| Budget | `js/core/budget.js` | Day-level aggregate purchase cost, pantry-aware — shared by the generator and the shopping list |
| Pantry | `js/core/pantry.js` | Despensa domain logic — storage, stock CRUD, the 3-stage lifecycle |
| Schedule | `js/core/meal-schedule.js` | Wake/sleep-anchored meal timing, chronological ordering — pure, called after generation |
| Planning engine | `js/engine/dish-selector.js`, `js/engine/plan-generator.js` | Selection, scaling, rebalance, budget cascade |
| No-cook engine | `js/engine/no-cook-generator.js` | Independent ready-to-eat product plan, not pantry-connected, schedule-aware |
| Data | `js/data/dishes.js`, `js/data/real-products.js` (+ `-alcampo.js`/`-carrefour.js`, 2026-08-24, generated by `PythonProject/scripts/export_real_products.py`), `js/data/packaging.js`, `js/data/ingredient-nutrition.js` | Dish records, real per-store product catalogs (`REAL_PRODUCTS_CATALOGS`), package-size lookup, per-ingredient real nutrition registry |
| Rendering | `js/ui/render.js`, `js/ui/render-insights.js`, `js/ui/render-schedule.js`, `js/ui/render-shopping-list.js`, `js/ui/render-pantry.js` | Summary, meals, warnings, day-schedule strip, shopping list, despensa panel |
| Accounts | `js/core/{supabase-client,settings,auth,cloud-sync,migration}.js`, `js/ui/render-auth.js` | Auth (email+password, Google OAuth), settings persistence, cloud sync (local-first), idempotent guest→account migration with conflict resolution — fully decoupled from the nutrition engine; LIVE against a real Supabase project since 2026-08-14a (code written 2026-08-13f) |
| Styling | `assets/css/style.css` | Visual system, mobile-first responsive layout |
| Tests | `tests/*.test.js`, `poc/tests/*.test.js` | Node+vm characterization/regression tests over real production code |
| DB schema | `supabase/schema.sql` | `user_data` table (JSONB blobs mirroring localStorage keys 1:1) + RLS policies + auto-provisioning trigger |

## Pantry / Despensa (2026-08-06/07)

The app remembers leftover ingredients across sessions and discounts them
from future shopping lists. 3 independent, optional stages — buying and
cooking are separate real-world events, not one atomic action (a v1 design
that combined them produced wrong data in a real "bought groceries, never
cooked" scenario): **(1)** "Confirmar plan de hoy" (renamed 2026-08-19,
was "Usar este plan hoy") saves/confirms the displayed plan, no stock
change — since 2026-08-19 it's an UPSERT onto today's still-untouched
draft, not always a new entry, see below; **(2)** "Marcar compra como
hecha" (per saved plan, in the "Tu plan" section since 2026-08-14c —
no longer inside the despensa accordion) adds purchased stock;
**(3)** "Marcar como cocinado" (per meal) subtracts consumed stock,
with exact undo. Deliberately
NOT connected to `dish-selector.js` (budget selection stays pantry-unaware)
~~or no-cook mode~~ — the lifecycle IS connected to no-cook mode as of
2026-08-20f (dish selection itself still isn't, deliberately, see that
date below). Full design record and rejected alternatives in
`STATE.md`.

**2026-08-14b — UX redesign, zero logic changes**: the panel used to
render one flat list mixing current stock, the full history of every
confirmed plan (up to 30), and the buy/cook sub-stages always expanded —
exposing pantry.js's internal state machine directly instead of "what do
I have at home." Rewritten (`js/ui/render-pantry.js` only) into 3 blocks:
editable-in-place stock (tap an amount for an exact-value input, no more
blind ±50g steps), a "planes activos" section showing only plans with
something still pending (buy and/or cook), and a collapsed read-only
history that a plan joins automatically the moment it's fully cooked.
Manual add is now a searchable text input (`<datalist>`) instead of an
81-option `<select>`, with the typed name resolved against
`normalizeIngredientKey()` before saving — never creates an orphan key.
`js/core/pantry.js` itself, the financial model, and cloud sync are
byte-for-byte unchanged; verified live that purchaseCost/shopping-list/
plan confirmation/authenticated sync all behave identically. Full
before/after reasoning in `STATE.md`, "Rediseño de UX de la Despensa —
2026-08-14b".

**2026-08-14c — "Tu plan" moved out of the despensa accordion, `planDate`
added**: same conversation as 2026-08-14b, after the user asked for a
full architecture/UX audit before deciding anything (see conversation).
Diagnosis: `pantry.js`'s data model was sound, but the page's information
architecture wasn't — meal cards, the shopping list, and the buy/cook
actions (buried inside a collapsed despensa accordion) were three
unrelated page sections for what the user experiences as one continuous
flow, and `savePlanForToday()` had no notion of "plan date" distinct from
`createdAt`, so saving two plans the same day produced two cards with an
identical-looking date label. Fix (chosen over a more aggressive
"merge everything into the meal card" option after weighing risk):
active-plan cards (buy/cook) now render in a new always-expanded section,
"Tu plan" (`#todayPlansPanel`), right below the shopping list — despensa
itself is back to being just stock + completed-plan history. Multiple
plans per day are explicitly allowed (not merged/replaced) per the user's
decision; cards are disambiguated by creation time INCLUDING SECONDS
(minutes alone weren't enough — confirmed live that two plans saved a
few clicks apart landed in the same minute). `entry.planDate` (new field,
`"YYYY-MM-DD"` local date) is separate from `entry.createdAt` (audit
timestamp), same split as `migrated_at` vs. `cloudSyncedUserId` in
`migration.js`; legacy entries without it fall back to a date derived
from `createdAt`. A pantry-coverage note ("X g already in your pantry")
was added to the active-plan card and its purchase checklist — it only
existed on the shopping list before, a real inconsistency the audit
found. 7 new tests in `tests/pantry.test.js`. Verified live (desktop +
mobile 375px): two same-day plans now distinguishable by time-with-seconds;
buy/cook lifecycle unaffected; despensa confirmed to no longer contain any
active-plan markup. A `.pantry-meal-chip` mobile overflow found during
verification was confirmed via a `git stash` A/B test to be pre-existing
(same known mobile-overflow issue tracked since 2026-08-08), not a
regression. Full detail in `STATE.md`, "Reubicación de 'Tu plan' fuera de
la despensa — 2026-08-14c".

**2026-08-19 — confirming a plan is now an upsert onto today's draft,
fixing a real inflation bug**: the user found in real use that clicking
"Confirmar plan de hoy" more than once (e.g. while regenerating to
decide what to eat) created a separate, independently-purchasable
history entry each time — `savePlanForToday()` itself never touched
stock, but each duplicate entry could be individually marked "bought,"
inflating stock several times for what was the same real purchase.
Reproduced live before touching anything (3 clicks → 3 entries → buying
through all 3 → stock clearly multiplied, e.g. "Leche semidesnatada" at
1000g). Fix: `savePlanForToday()` now looks for an existing entry for
today that's still a pure draft — `hasRealPantryAction(entry)` (new)
is false, meaning neither bought nor any meal cooked — and updates it
in place instead of creating a copy; the moment an entry has anything
real on it, it's protected, and confirming a different plan that day
creates a genuine new entry instead of silently overwriting real
spending/consumption. Practical effect: regenerating/editing the plan
and reconfirming as many times as needed, before buying or cooking
anything, is now safe by construction. Button relabeled "Usar este plan
hoy" → "Confirmar plan de hoy" (`id` unchanged); the post-confirm notice
now distinguishes "Plan confirmado" (new entry) from "Plan actualizado"
(same draft, explicitly reassuring that nothing was bought/added to the
pantry). 8 new tests in `tests/pantry.test.js`, including the exact
reported regression (confirm 3×, buy once, exactly one package bought).
Verified live with real clicks on the real button (not just function
calls). `markPurchaseDone`/`markMealCooked`/`js/core/budget.js`/
`js/core/pricing.js`/`js/engine/*` unchanged — the bug was entirely in
how many entries Stage 1 produced, never in Stages 2/3. Full detail in
`STATE.md`, "Confirmar plan: UPSERT sobre el borrador del día —
2026-08-19".

## Meal schedule (2026-08-07)

Each generated meal now carries a real clock time (`meal.time`, e.g.
`"08:00"`), computed once after `generateDietPlan()`/
`generateNoCookPlan()` returns — the generator itself is untouched.
Model: meals are ordered chronologically by a semantic type (breakfast →
morning snack → lunch → afternoon snack → dinner), then spread at equal
intervals across the user's wake→sleep window (two new optional form
fields, sensible defaults 07:00/23:00). This also fixed a pre-existing
bug: meal cards used to render in category order (breakfast, lunch,
dinner, snack, snack2), not clock order. A mobile-only sticky bar shows
just the next meal + time, since the full day-schedule strip sits below a
full-height form on narrow viewports. `meal.time` is persisted through
pantry history (`savePlanForToday`); older saved plans without it render
without a badge, no crash. Full design record, edge cases, and browser
verification in `STATE.md`.

## Budget = purchase cost, not usage cost (2026-08-08, deepened 2026-08-13)

`data.budget` means "how much I'm willing to pay at checkout today" —
purchase cost, aggregated across the whole day's ingredients, package
sizes, and current pantry stock. It used to mean usage cost only (the
sum of technically-consumed ingredient grams), which let a plan "fit" an
8€ budget while its real grocery cost was 19€ — the checkout total was
never checked until the shopping list, too late to affect anything.
Fixed architecturally in two layers, not by clamping the displayed
number: once a candidate day-plan exists, `js/core/budget.js` computes
the real aggregate purchase cost (pantry-aware) and `plan-generator.js`
enforces THAT as the hard budget, scores candidates by it, and reports
infeasibility honestly if even a maximally-trimmed plan can't fit
(2026-08-08, unchanged since). The same `computeDayPurchaseCost()` is
what the shopping list uses, so the two numbers can never diverge.
Presets recalibrated accordingly (Ajustado/Equilibrado/Amplio: 5/8/12 →
15/20/28).

**2026-08-13**: dish SELECTION itself (`dish-selector.js`) is no longer
usage-cost-only. It now asks for the MARGINAL purchase cost of each
candidate — how much it adds to today's real purchase given packages
already committed by earlier meals of the same day (`committedGrams`) and
real pantry stock — and uses that as the authoritative affordability/
ranking signal; usage cost remains only as a secondary, lower-weight
tiebreaker. This closes the gap where a "cheap to use" dish (small
usageCost) could still force buying a whole expensive package, previously
only caught after the fact by the final trim. Per-ingredient package
price is now also shown on meal cards (`renderFoodRow`), computed via
`resolvePurchaseCost()` — the same authoritative function `budget.js` and
the shopping list already used — so `usageCost <= purchaseCost` holds
structurally per row (fixed 2026-08-13c after a real reported bug where
it briefly didn't, see below). Full design record, edge cases, and
browser verification in `STATE.md`.

**2026-08-13c**: a user-reported bug ("Plátano" showing 11.5g protein/
13.8g fat, and usageCost above the shown package price) led to a full
data-chain audit. Two separate root causes, both documented with real
diagnostic data in `STATE.md`: (1) the meal-card package price briefly
used a single package's price instead of `resolvePurchaseCost()`'s real
total — fixed; (2) per-ingredient protein/carbs/fat were never real
per-ingredient nutrition — they're the dish's total macros split by gram
share (pre-existing known issue #2), which can assign one ingredient's
real protein/fat to another in the same dish. Per-ingredient macro
display was removed from meal cards as an immediate mitigation — the
underlying fabrication itself was fixed architecturally the same day,
see next entry.

**2026-08-13d — real per-ingredient nutrition (fixes known issue #2 for
50/81 roles)**: the user asked for the root cause to be fixed, not just
hidden. `js/core/nutrition.js` (new) + `js/data/ingredient-nutrition.js`
(new — a production promotion of the already-audited, human-verified
`poc/data/ingredient-rules-full.js`, unused since 2026-08-04) give each
ingredient its OWN real kcal/protein/carbs/fat per 100g when a verified
Mercadona product exists (50/81 roles), scaled linearly with portion
size. For the 31/81 roles without a safe match (no fabricated
substitutes — e.g. "Plátano" stays unresolved rather than being matched
to plátano macho, a different subspecies), the dish's remaining macro
budget (its hand-curated total minus what resolved ingredients already
account for) is split only among them — never diluting a resolved
ingredient's real value. `buildMealFromDish()` (`dish-selector.js`)
rewritten to use this instead of mass-share allocation. The UI shows
real per-ingredient macros (with a "real" badge) when verified, an
explicit "not verified" note otherwise. Full design record, known
limitations (remainder can clamp to 0 when resolved ingredients alone
exceed the dish's old estimate — measured on 13-31% of dishes depending
on the macro), and browser verification against the exact reported case
in `STATE.md`.

**2026-08-13e — audited the "clamp to zero" tradeoff, fixed an Atwater
consistency bug**: before changing anything, investigated the known
tradeoff above with concrete examples (172/334 dishes affected on at
least one macro). Conclusion: the remainder model
(`total = max(realSum, oldEstimate)`) is mathematically sound and
intentional, not a bug — most cases are rounding noise in the old
hand-curated totals (present even in 100%-resolved dishes), the rest are
real corrections of categories `dishes.js` used to undervalue (oily
canned fish, nuts, turkey breast). Left the clamping mechanism itself
unchanged. The investigation did surface a separate real bug: an
unresolved ingredient's kcal had its own remainder anchored to
`dish.kcal`, independent from its protein/carbs/fat remainder, so a row
could show real macros with an internally impossible kcal (e.g.
"Mermelada light" — 11.5g carbs but 0kcal; 99 rows off by >20kcal from
their own Atwater value). Fixed in `js/core/nutrition.js`: an unresolved
ingredient's kcal is no longer its own clamped remainder — it's derived
by Atwater (`protein×4 + carbs×4 + fat×9`) from that same row's already-
computed protein/carbs/fat, guaranteeing internal consistency; resolved
ingredients keep using their real kcal unchanged. 180 tests total (18 in
`tests/ingredient-nutrition.test.js`, 1 corrected + 4 new), golden-
masters recaptured, 0 failures across `tests/` + `poc/tests/`. Verified
live in browser (desktop + mobile) against the exact "Mermelada light"
case; despensa, no-cook, and purchase cost unaffected. Full design
record in `STATE.md`.

**2026-08-13f — multi-user accounts (Supabase Auth + Postgres + RLS)**:
the site was purely local/single-user (only the despensa persisted, in
localStorage) with no build system, deployed as a static Cloudflare
Pages site. The user asked for real accounts (email+password, Google
sign-in, persistent session) with every piece of personal data (profile/
settings — new, never persisted before this — despensa, plan history)
cloud-backed per account and reachable from any device, without
rewriting the nutrition engine or discarding guest mode. Chose Supabase
(free tier; Auth+Google OAuth+Postgres+RLS bundled; ships a CDN UMD SDK
build, same fit as the existing GSAP dependency) over Firebase/Auth0/
Clerk. Architecture: local-first/optimistic — localStorage stays the
synchronous source of truth every existing module already used
(zero changes to `pantry.js`/`render-pantry.js`/`calculator.js`/
`meal-schedule.js`/any `js/engine/*` file); a new, separate layer
hydrates it from the cloud on login and pushes mutations in the
background via the extension point `app.js` already had
(`onPantryChange`) plus two new hook points. One Postgres table with
three JSONB columns mirroring the localStorage blobs 1:1, RLS scoped to
`auth.uid()`. Guest→account migration is idempotent via a per-browser
marker, not an account-level timestamp (closes a real shared-device data
leak found during design); conflicting data on both sides is never
merged silently — the user picks. 66 new tests (246 total) against a
simulated Supabase client. At this point only verified live in guest
mode, since no real Supabase project existed yet.

**2026-08-14a — provisioned for real, verified end-to-end against the
live backend, deployed**: the user created the Supabase project and
Google OAuth client (the only two steps that genuinely needed their own
accounts) and handed over the public URL/anon key; zero code changes,
only `js/data/supabase-config.js` went from placeholders to real values.
Verified against the live project with actual REST calls using real
session tokens, not just the UI: signup/login with an immediate session,
a simulated brand-new device (localStorage wiped entirely, including the
session) correctly pulling settings/despensa back from the cloud on
login, idempotent re-sync, a real conflict+merge run, logout wiping the
local cache. **User isolation confirmed by attacking the API directly**
— User B's real token could not read User A's row even when explicitly
filtering by its id, and a `PATCH` attempt against User A's row using
User B's token affected 0 rows (RLS, not app-level filtering, is what
stopped it). The Google OAuth redirect chain was followed for real
(app → Supabase → `accounts.google.com`) and Google accepted the
configured client without error — verification deliberately stopped at
the point a human would need to enter real credentials. 246 tests still
green; despensa/no-cook/mobile re-verified unaffected. Committed
(`f66bfac`) and deployed; production re-checked against the same live
project. Full write-up in `STATE.md`, "Aprovisionamiento real de
Supabase + Google OAuth — 2026-08-14a".

**2026-08-19b — dish-selection diversity fix, requested after a 1000-run
stress test**: the user asked for a mass stress test of the generator
(fixed profile, 1000 real `generateDietPlan()` calls) before changing
anything. Finding: breakfast and lunch — the two meal slots processed
first, with `usedState`/`committedGrams` still empty, so their score is
nearly deterministic run-to-run — only ever produced **12 distinct
dishes** across 1000 runs (exactly `TOP_CANDIDATES_POOL`, the hard cap
on the weighted lottery's candidate pool), out of 64 and 110 available
respectively; 89%/72% of lunch/dinner's catalog never appeared at all,
almost entirely meat/fish, because the "tight" budget scoring mode
ranked candidates by purchase-protein-per-euro alone (×100 weight, no
macro-fit term at all) and legumes/tofu structurally beat meat/fish on
that metric. Fix, requested explicitly after seeing the report:
`TOP_CANDIDATES_POOL` removed entirely (the softmax lottery already
gives near-zero weight to far-below-max candidates, so the manual
cutoff added nothing but hard exclusion); `scoreDishForSelection`
rebalanced so macro fit counts in both budget modes, with purchase
efficiency reweighted down from being nearly the sole variable to the
heaviest-but-not-exclusionary one. Hard constraints untouched (budget
cap, relaxation ladder, macro tolerances). Re-running the same
1000-run stress test after the fix: breakfast coverage 18.8%→98.4%,
lunch 10.9%→80.0%, dinner 27.7%→81.2%, total distinct dishes used
27.8%→87.1% of the catalog; meat/fish dishes confirmed live in the
browser too. Honest trade-off, not hidden: the generator needs
relaxation (time/taste/25%-cap) more often now — "perfect" (tier 0)
dropped from 52.3% to 31.7% of runs — reported transparently via
`report.violations`, never silently. 2 golden-master tests recaptured
on purpose (same seed, different dish now wins the lottery); the 7
contract/invariant tests were untouched and still pass. Full write-up,
before/after table, and the published stress-test report in `STATE.md`,
"Diversidad del generador: eliminación de TOP_CANDIDATES_POOL y
reequilibrio de protein/€ — 2026-08-19b".

**2026-08-19c/d — budget headroom for diversity, two attempts, one that
worked**: follow-up request after 19b — give the generator more freedom
to avoid budget deadlocks without losing the diversity just gained.
First attempt (19c, the user's original idea): steer generation toward
an internal target ~12% below the real budget (`data.targetBudget`),
leaving the difference as headroom — the real ceiling and all
user-facing savings numbers stay untouched. **Measured with the same
1000-run stress test: essentially inert.** Root cause found by reading
the code: budget-driven tier escalation is decided in `dish-selector.js`
purely against the unreserved hard cap, never against the reduced
target, so the reserve couldn't touch the actual failure mode; where the
target *did* apply (`allocationScore`), it was outweighed by `macroFit`
roughly 33:1. Second attempt (19d, proposed after reporting the above,
approved by the user): sequence the hard cap itself — early meals
(breakfast, lunch) now get a `mealCap` pulled toward their proportional
share of the day's slack (by calorie ratio) instead of being free to
spend the whole day's headroom just by going first, guaranteeing more
room for later meals. Tried at full strength first and rejected after
measuring: cut calorie violations 53% but cost ~20pp of dish coverage in
breakfast/lunch and raised 25%-cap violations 25% — a real diversity
regression. Blended to half-strength (`SEQUENCING_BLEND_RATIO = 0.5`)
and confirmed clean: `status:"perfect"` 240→251, tier-0 (no relaxation)
321→339, `cap25`/`calories`/`time` violations all down, overall dish
coverage 86.2%→86.8% (breakfast unchanged, lunch -2.7pp only). Verified
live that `report.budgetDelta` still tracks the real `data.budget`
exactly, never any internal number. Golden-master recaptured 4 times
(one per real algorithm change); the 7 contract/invariant tests
untouched throughout. Full write-up with all three comparison tables in
`STATE.md`, "Reserva de presupuesto y reparto secuencial —
2026-08-19c/d".

**2026-08-20 — gate on "Generar plan" + explicit plan-replace dialog**:
real bug the user hit in use — with a plan already confirmed and bought,
generating and confirming a new one silently created a SECOND active
"Tu plan" card for the same day (the 2026-08-19 upsert protects a pure
draft, but deliberately creates a new entry once anything real is on top
of it — "Generar plan" itself never warned that was about to happen).
Fix: `handleSubmit()` now checks `findTodayEntry()` +
`hasRealPantryAction()` + `isEntryFullyCooked()` (all in `pantry.js`)
before generating anything; if today's active plan has something real on
it (bought and/or cooked) and something still pending, it opens a new
dialog instead of generating — redirects to that card and asks
explicitly. Only "Change the whole plan" generates, and confirming it
calls the new `replacePendingMealsForToday()` instead of the normal
upsert: replaces meals that aren't cooked yet, leaves already-cooked
meals untouched, resets the purchase checklist (ingredients likely
changed). A pure draft or an already-fully-cooked plan never interrupts —
refines, doesn't revert, the 2026-08-14c decision to allow multiple plans
per day. 13 new tests in `pantry.test.js` (274 total, 0 failed). Verified
live end-to-end against the local build, including the exact reported
scenario (confirm+buy, generate again, confirm → now stays 1 card, was
2). Full write-up in `STATE.md`, "Gate en Generar plan + reemplazo
explícito del plan activo — 2026-08-20".

**2026-08-20b — mobile horizontal-overflow bug finally root-caused and
fixed**: a CSS overflow issue on ~375px viewports (`.actions`/`.panel`/
`.meal-head`/`.pantry-meal-chip`) had been reconfirmed every session
since 2026-08-08 without ever being traced to a specific element. Live
DOM measurement (not just visual inspection) found the actual offender:
`.pantry-meal-chip` uses `white-space: nowrap` with no width limit
inside a `flex-wrap` container, so a chip holding a long dish name
refuses to shrink below its own content width (a flex item's default
`min-width: auto`) and forces the entire document wider to fit —
confirmed by measuring `document.documentElement.scrollWidth` (412px
instead of 375px, with the offending chip alone at 383px). `.actions`/
`.panel`/`.meal-head` were never independently broken — they only
inherited the viewport the chip had already widened; patching only the
chip brought the whole page back to ~375px with zero remaining overflow
in a full-DOM scan. Fix: `overflow: hidden; text-overflow: ellipsis;
max-width: 100%; min-width: 0;` on `.pantry-meal-chip`, plus a
`title="<full label>"` attribute on the chip button
(`renderMealChips()`, `render-pantry.js`) so the truncated dish name
stays recoverable on hover — the full name is already shown elsewhere
on the card, so nothing is actually hidden, only compacted. 251 tests
re-run, 0 failed (CSS + one HTML attribute, no logic touched). Verified
live against the real served files (explicit cache-bust of the CSS
`<link>`, not just an injected test `<style>`): `scrollWidth`
412px→376px, 0 overflow offenders left anywhere on the page, and real
ellipsis truncation confirmed (`scrollWidth`>`clientWidth` under
`overflow:hidden`, not a silent clip); desktop re-checked to confirm the
same chip renders fully untruncated when its row has room. Full
write-up in `STATE.md`, "Fix real: overflow horizontal en mobile —
.pantry-meal-chip — 2026-08-20b".

**2026-08-20c — known issue #5 fixed: real `mainProt` instead of
guessing from the dish label**: `buildMealFromDish()` (`dish-selector.js`)
never copied `dish.mainProt` onto the generated `meal`, so
`collectProteinSources()` (`render-insights.js`, feeds "Notas del plan"
and the "fewer than 3 protein sources" warning) always fell back to a
non-exhaustive label-text heuristic despite the file's own header
claiming otherwise. One-line fix. Live-verified real-world impact: for
"Tostadas con jamón cocido y tomate" (`mainProt:"pavo"`), the label
heuristic returns `null` — that source was silently dropped from the
diversity count entirely; with the fix it's reported correctly. Side
finding, not fixed (flagged separately): that same dish's `mainProt`
value in `dishes.js` itself looks miscurated (says "pavo", the real
protein is ham). 4 new tests, 255 tests total, 0 failed.

**2026-08-20d — known issue #7 reduced: `packaging.js` coverage gap 25 →
12**: 13 new entries added (Calabacín/Kiwi/Pimiento as `perUnit`; Carne
picada 5% grasa/Champiñones/Coliflor/Fresas/Gamba cocida/Jamón serrano/
Langostino cocido/Pan de centeno/Pavo picado/Trigo sarraceno cocido as
`fixedPackage`), same estimation criteria as the existing 46 entries.
Live-verified with the real `resolvePackageInfo()`: jamón serrano now
resolves to a real 100g package at €2.50 instead of falling back to
"sold at weight, no fixed package." The remaining 12 gaps: 11 are fresh
meat/fish (correct by design) and 1 is `"Lechuga: Pepino"` — a corrupted
ingredient name in `dishes.js` (a distinct, pre-existing bug, not a
packaging gap), deliberately left untouched. Adding real package sizes
changed 2 seeded golden-master results (marginal purchase cost shifted
enough to change which dish wins the weighted lottery for those seeds);
recaptured on purpose, the 7 contract/invariant tests untouched. 255
tests in `tests/`, 278 total, 0 failed.

**2026-08-20e — known issue #1: re-audited dish-level Atwater
consistency on the current 334-dish set (never repeated since the old
204-dish audit)**: 156/334 (46.7%) within 20kcal of
`protein*4+carbs*4+fat*9` before touching anything, but the real finding
was a systematic pattern, not just a percentage: 23 dishes had
`dish.kcal` well below what their own protein/carbs/fat imply (up to
-148kcal), 15 of them containing "Quinoa cocida" (15/27 = 55.6% of all
quinoa dishes, vs. 0-8% for any other side ingredient) — a real,
localized authoring bug, not diffuse noise. This mattered functionally,
not just cosmetically: `dish.kcal` is the divisor of `scaleFactor` in
`buildMealFromDish()`, so an artificially low value over-portioned these
23 dishes. Fixed by recalculating those 23 `dish.kcal` values from their
own protein/carbs/fat (exact Atwater), leaving the macros and
`ingredient-nutrition.js` untouched. Coverage after: 179/334 (53.6%), 0
negative outliers left. The remaining 155 out-of-tolerance dishes are
all positive-diff, max 92kcal, no ingredient pattern — deliberately left
alone (matches `ROADMAP.md`'s own guidance not to prioritize this over
the Fase 1-2 migration, and the same reasoning 2026-08-13e already
applied to a related case). 2 golden-masters recaptured (second time
this session, first was the packaging.js fix); 7 contract tests
untouched. 255 tests, 0 failed. Full write-up in `STATE.md`, "Auditoría
Atwater del nivel de plato — 2026-08-20e".

**2026-08-20f — known issue #9: despensa connected to no-cook mode, full
3-stage lifecycle**: no-cook plans (real discrete catalog products, not
gram-based ingredients) never had any save/buy/consume flow. Scope
confirmed with the user first: full lifecycle (confirm → buy → consume),
selection itself stays pantry-unaware for now (matches how the main
generator was rolled out — lifecycle in 2026-08-06/07, selection-aware
later in 2026-08-13). Architecture: a parallel product stock ledger
(`nutritionPlanner.nocookStock.v1`, `{quantity}` instead of `{grams}` —
reusing the existing gram-shaped store would have been silently dropped
by `sanitizePantryState()`'s strict validation), but history entries
share the same `pantryHistory` array as dish-mode plans, distinguished
by `entry.type==="nocook"` — verified by reading `migration.js`/
`cloud-sync.js` that both already treat entries as opaque blobs, so
sharing the array needed no changes there. New pantry.js functions
mirror the dish-mode ones exactly (`saveNoCookPlanForToday`/
`markNoCookPurchaseDone`/`markNoCookSlotConsumed`). UI reuses the exact
same CSS classes as dish-mode cards/chips — zero new CSS. 10 new tests
(cross-type isolation between a same-day dish draft and no-cook draft,
corrupt-data resilience, exact undo); 265 total, 0 failed. Verified live
end-to-end (generate → confirm → buy → consume per slot → moves to
completed history), including that dish-mode is completely unaffected by
a no-cook entry sharing its history array. Deliberately out of scope:
the 2026-08-20 "Generar plan" gate/replace-dialog, pantry-aware product
selection, and cloud sync for the product stock ledger (history entries
still sync as always). Full write-up in `STATE.md`, "Despensa conectada
al modo 'sin cocinar' — 2026-08-20f".

**2026-08-20g — data-corruption bug fixed: `savePlanForToday()`/
`findTodayEntry()` didn't filter by `entry.type`**: found while designing
per-meal editing (which needs to inspect a saved entry's real shape).
Since despensa "sin cocinar" (2026-08-20f) shares the `pantryHistory`
array with dish-mode entries via `entry.type`, and
`hasRealPantryAction()` always reads `entry.meals` (undefined on a
"nocook" entry, so it always evaluates "no real action" for one),
`savePlanForToday()`'s UPSERT could pick up a same-day "nocook" draft and
overwrite its `store`/`createdAt` plus bolt on a spurious `.meals` array
next to its real `.slots` — confirmed with a direct repro script, not
just theorized. `findTodayEntry()` had the same gap, which could make the
dish-only "Generar plan" gate react to an unrelated no-cook entry. Fixed
by filtering `e.type !== "nocook"` in both. 4 new/strengthened tests in
`tests/pantry.test.js`; the original isolation test from 2026-08-20f
passed even with the bug present (it only checked `slots[0].items[0].id`,
never `.meals` absence) — assertions widened so this class of bug can't
slip through silently again.

**2026-08-20h — per-meal editing: "cambiar este plato" without
regenerating the other 4**: the last deferred item from the priority
list. Scope confirmed with the user first (only the already-confirmed
plan, a one-click reroll using the same weighted lottery as generation).
New `regenerateSingleMeal(entry, mealKey, pantryState)`
(`plan-generator.js`) targets the macros the replaced meal already had
(never re-derives the original day-level profile, which isn't
persisted), caps spend at the day's real remaining budget (computed from
the other 4 meals' actual cost, more precise than generation-time
estimates since those meals are now a fact, not a forecast), and
rebuilds diversity state from all 5 meals so the old dish is penalized
but not hard-excluded — same "reroll" semantics as the rest of the
engine. `replaceSingleMealForEntry()` (`pantry.js`) applies the result,
refusing on an already-cooked meal and resetting `purchase.done`. Getting
here required extending saved plan entries to retain `dishName`/
`mainProt`/`taste`/`total` per meal and `budget`/`cookTime`/`taste` for
the day — via a new optional 3rd parameter, backward compatible with
every existing caller. A real CSS overflow bug was found and fixed
during live verification (a new `.pantry-meal-chip-group` wrapper needed
its own `max-width: 100%`, same root cause class as the 2026-08-20b fix,
one level higher in the layout tree). 12 new tests
(`tests/per-meal-editing.test.js`); verified live end-to-end with real
clicks, zero console errors, zero overflow on mobile and desktop. Honest
finding, not hidden: repeated rerolls on the same slot concentrate on
the top-scoring candidate (8/10 in one 10-reroll test) — same weighted-
lottery mechanism already accepted elsewhere in the engine, just more
visible when repeating on one fixed slot.

**2026-08-23 — re-verification session, no code changes**: asked to
double-check the open-issues list against the real code rather than
trust the docs. Everything was confirmed exactly where it was left (31/81
ingredient roles still unresolved, known issue #8 still unpatched,
no-cook still not pantry-aware or gated, `"Lechuga: Pepino"` and the
mislabeled jamón dish still uncorrected, the Atwater audit still at
179/334, packaging.js still at 69/81, Graphify still stale since
2026-08-13) — nothing had silently regressed or been fixed outside a
commit. One real-world status change: the user confirmed they personally
completed a real Google OAuth login end-to-end, closing the one
remaining step of the accounts system (the technical chain itself was
already verified as of 2026-08-14a).

**2026-08-23b — visual simplification pass, presentation only**: the user
asked to reduce visual noise/clutter across the whole interface, with
latitude to improve on the literal ask where a clearer UX solution
existed. `js/core/pantry.js` (buy/cook/stock business logic) is
untouched except for one new pure aggregation function
(`listPlanDates()`). Changes: the hero header shrank from a full "cover"
(giant h1 + paragraph + decorative circle) to a single-row compact title
bar (icon + small h1 + badge), with the paragraph removed from the HTML
entirely (`.hero--compact`); "Notas del plan"/the legal footer note moved
out of the results column to the very bottom of the page, after the
product catalog; the despensa panel changed from an always-visible
`<details>` accordion to a `<dialog>` (`.despensa-dialog`, same pattern
as the auth/plan-replace dialogs) opened from a new `#despensaBtn` —
which literally replaces `#fillExampleBtn` (confirmed the old button
genuinely worked, wasn't dead code, but the user asked for an
unambiguous replacement); and "Tu plan" merged with the completed-plan
history (previously nested inside a collapsed `<details>` in despensa)
into one "Mis planes" section with an accessible date-chip strip (same
`role="radiogroup"` pattern as the budget-mode chips) — the section no
longer ever hides, an empty-state note fills that gap instead, "Hoy" is
the default selection and is always present even with no saved plan yet.
A real CSS specificity bug was found and fixed during live verification:
`.despensa-dialog { width }` never won against `dialog.auth-dialog
{ width }` (a bare class always loses to element+class regardless of
source order) — the fix is `dialog.despensa-dialog`. 2 new tests for
`listPlanDates()`, 281 total, 0 failing. Verified live against the real
served files (desktop + 375px mobile): compact header, dialog opens/
closes at the corrected width, date strip correctly filters and
highlights "Hoy", a full generate→confirm flow leaves the strip on "Hoy"
with the new card visible, zero horizontal overflow, zero console
errors. Full detail in `STATE.md`, "Rediseño visual: simplificación de
la interfaz — 2026-08-23b".

**2026-08-23c — fix: despensa dialog was always visible, not just when
opened**: the user caught this live in production right after the
2026-08-23b deploy. Root cause: `dialog.despensa-dialog` set
`display:flex` without scoping it to `[open]` — a closed native
`<dialog>` is hidden only by the browser's default `dialog:not([open])
{display:none}` user-agent style, and an unqualified author rule always
wins over that regardless of specificity, so the panel rendered inline
on the page at all times. Fixed by moving `display:flex` to
`dialog.despensa-dialog[open]`, matching the pattern `dialog.auth-dialog
[open]` already used elsewhere. The prior verification pass had checked
that `.open` toggled correctly and measured dimensions while open, but
never checked the actual computed `display` in the default closed
state — the exact gap this bug slipped through. Re-verified with all
three transitions (closed→open→closed) measured directly, in both local
dev and production. Pure CSS fix, 281 tests unaffected. Full detail in
`STATE.md`, "Fix real: despensa visible siempre, no solo al abrirla —
2026-08-23c".

**2026-08-23d/2026-08-24 — multi-store data pipeline (Alcampo + Carrefour)
and a real store picker**: until this session `PythonProject` only
enriched an externally-sourced Mercadona catalog — it never scraped
anything itself. The user asked for real scrapers covering other
supermarkets. Built `scrapers/alcampo.py` and `scrapers/carrefour.py`
(Playwright-based — Alcampo started on plain `requests` but was rewritten
after a live AWS WAF JS-challenge block was diagnosed and confirmed
unsolvable without a real browser; Carrefour hit Cloudflare bot
management and needed a longer wait-and-retry, not a framework change).
Both live in the separate `PythonProject` repo, which had no git history
at all before this session (initialized with explicit user permission).
Full scrape results: Alcampo 288 products scraped, 215 pass the
food-vs-non-food filter, **0 matched to real OpenFoodFacts nutrition**
(a genuine coverage gap, not a bug — no fabricated kcal/macros were ever
written); Carrefour's full run produced 0 products, blocked by
Cloudflare partway through, not yet successfully retried.

New `scripts/export_real_products.py` (PythonProject) converts each
store's enriched `database/<tienda>.db.json` into this repo's
`js/data/real-products-<tienda>.js` format. New `REAL_PRODUCTS_CATALOGS`
registry (`js/core/pricing.js`, same self-registering pattern as the
existing `PRICE_CATALOGS`) plus `getRealProductsForStore(storeId)`. A
real `<select id="store">` was added to the form (`index.html`), wired
through `calculator.js`/`settings.js`/`app.js` so the choice persists and
drives the **"Sin cocinar" (no-cook) engine only** — `js/engine/
no-cook-generator.js` and `js/core/pantry.js` are now store-aware
end-to-end, with a per-store eligible-pool cache (a global cache was the
first, wrong attempt — bug found live, fixed before shipping). The
dish-recipe engine (`DISH_DB`) was found, via research rather than
assumption, to already be store-parameterized end-to-end — only the UI
input edge was missing, since `PRICE_CATALOGS` only has a `mercadona`
entry today; choosing Alcampo/Carrefour does not yet change dish-mode
pricing (deliberately deferred, "Fase B" below).

`js/data/no-cook-classifier.js` gained a name-keyword fallback
(`classifyByNameFallback`) for when a product's category/leafCategory
doesn't match any of Mercadona's hand-curated rules — the case for every
Alcampo/Carrefour product, since their categories are generic URL-slug
labels, not Mercadona's taxonomy. Two real false-positive bugs were
found and fixed via live testing against the real scraped data before
this shipped: dish-level keywords ("pizza") were losing to
ingredient-level keywords ("queso") checked earlier in the same array
(reordered); and the bare substring "masa" wrongly excluded both raw
pizza dough AND already-baked "pan de masa madre" until a dedicated
"masa madre" exception was added. 26 new tests across 3 new test files
plus additions to `tests/pantry.test.js`; 307 tests total, 0 failing.

**Deliberately out of scope ("Fase B")**: curated per-store ingredient
pricing for the dish-recipe engine (`js/data/prices/alcampo.js`/
`carrefour.js`) — `PRICE_CATALOGS.mercadona.pricesPer100g` is a
hand-curated ingredient-role → price map, not a mechanical export, and
matching that quality for new stores is real data-curation work, not
plumbing. **Not deployed to production** — committed and pushed to
`origin/main` in both repos, but `npx wrangler pages deploy` was never
run this session; `offline-nutrition-helper.pages.dev` still serves the
pre-store-picker build. Full write-up, exact commit hashes, and the
"qué no romper" list in `STATE.md`, "Resumen de la sesión
2026-08-23d/2026-08-24" and the extended "Session handoff" section.

## Product direction

Evolve into a real personal nutrition assistant: nutrition + shopping +
pantry today, workouts/recovery/progress/dashboard/coach-mode as future
domains (see `ROADMAP.md`, Milestones). Preserve deterministic domain
calculations as the source of truth. AI should explain, personalize, and
orchestrate validated tools; it must not invent nutritional values or
bypass safety checks. The data-quality fix for ingredient macros
(previously "fabricated by mass allocation", ROADMAP.md Strategy B) is
now underway, not just decided: 50/81 ingredient roles have real
per-ingredient nutrition in production as of 2026-08-13d; widening
coverage further needs more verified products in `real-products.js`
(Python-side work) — see `ROADMAP.md`, "Decisión de arquitectura" and
Fase 1.

## Design principles for the next implementation

- Trusted nutrition data before sophisticated generation.
- Explicit hard constraints and machine-readable feasibility results.
- Pure, deterministic domain logic with tests.
- Accessible Spanish-first interface; never market rules as AI.
- Modular monolith first; introduce services only when scale requires them.
- Data reliability: validate/sanitize at the read boundary, isolate
  failures per-module and per-row, never let one bad module or one
  corrupted record take down the whole app (established 2026-08-07 for
  `localStorage`/pantry — see `STATE.md`; the pattern generalizes to any
  future persisted state).

## Current status

See `STATE.md` for the authoritative, dated engineering log and `ROADMAP.md`
for the phased migration plan and architecture decision record. This
section last revised 2026-08-14b; see the dated entries above (2026-08-19
through 2026-08-24) for what's happened
since — real per-ingredient
nutrition for 50/81 roles,
dish selection made purchase-cost-aware, the Atwater-consistency fix for
unresolved-ingredient kcal, a complete multi-user accounts layer LIVE
against a real Supabase project and verified end-to-end, a full UX
redesign of the Despensa panel with zero changes to its underlying logic,
a gate preventing duplicate active-plan cards, the long-standing mobile
horizontal-overflow bug finally root-caused and fixed, a full pass
through the open-issues list (mainProt reporting, packaging.js coverage,
a dish-level Atwater audit that found and fixed a real 23-dish data bug,
and despensa connected to no-cook mode), and — as of 2026-08-23d/2026-08-24
— a second data source (real Alcampo/Carrefour scrapers in the separate
`PythonProject` repo) and a real store picker wired through the no-cook
engine, with the dish-recipe engine's per-store pricing curation
("Fase B") still explicitly pending. Two items from the earlier list
(dish-selector score tuning, per-meal editing) were explicitly asked
about and deferred by the user, not overlooked. Not production-ready
or suitable for health-critical personalization — see "Critical known
issues" in `STATE.md`. **The 2026-08-23d/2026-08-24 store-picker work is
committed and pushed but NOT deployed** — production still serves the
pre-store-picker build, see `STATE.md` session handoff.