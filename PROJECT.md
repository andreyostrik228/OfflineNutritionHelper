# Nutrition Planner — Project Context

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
  files unmodified: `tests/` (55 tests) + `poc/tests/` (23 tests) = **78
  tests total**.

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
| Ingredient nutrition | `js/core/nutrition.js` | Real per-ingredient kcal/protein/carbs/fat when verified (50/81 roles), dish-total remainder for the rest — never mass-share allocation (2026-08-13d); unresolved-row kcal derived by Atwater from its own protein/carbs/fat remainder, never independently clamped (2026-08-13e) |
| Pricing | `js/core/pricing.js` | Ingredient/dish pricing, package resolution, usageCost vs. purchaseCost |
| Budget | `js/core/budget.js` | Day-level aggregate purchase cost, pantry-aware — shared by the generator and the shopping list |
| Pantry | `js/core/pantry.js` | Despensa domain logic — storage, stock CRUD, the 3-stage lifecycle |
| Schedule | `js/core/meal-schedule.js` | Wake/sleep-anchored meal timing, chronological ordering — pure, called after generation |
| Planning engine | `js/engine/dish-selector.js`, `js/engine/plan-generator.js` | Selection, scaling, rebalance, budget cascade |
| No-cook engine | `js/engine/no-cook-generator.js` | Independent ready-to-eat product plan, not pantry-connected, schedule-aware |
| Data | `js/data/dishes.js`, `js/data/real-products.js`, `js/data/packaging.js`, `js/data/ingredient-nutrition.js` | Dish records, real Mercadona catalog, package-size lookup, per-ingredient real nutrition registry |
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
cooked" scenario): **(1)** "Usar este plan hoy" saves the displayed plan,
no stock change; **(2)** "Marcar compra como hecha" (per saved plan, in the
despensa history panel) adds purchased stock; **(3)** "Marcar como
cocinado" (per meal) subtracts consumed stock, with exact undo. Deliberately
NOT connected to `dish-selector.js` (budget selection stays pantry-unaware)
or no-cook mode. Full design record and rejected alternatives in
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
for the phased migration plan and architecture decision record. Last
updated here 2026-08-14b (real per-ingredient nutrition for 50/81 roles,
dish selection made purchase-cost-aware, the Atwater-consistency fix for
unresolved-ingredient kcal, a complete multi-user accounts layer LIVE
against a real Supabase project and verified end-to-end, and a full UX
redesign of the Despensa panel with zero changes to its underlying logic
— see above). Not production-ready or suitable for health-critical
personalization — see "Critical known issues" in `STATE.md`.