# Nutrition Planner — Project Context

Updated 2026-08-08. This file is the fast orientation doc — for full
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
   allocating budget dynamically across them using usage-cost heuristics
   during selection, then enforces the REAL aggregate purchase cost
   (`js/core/budget.js`, pantry-aware) as the authoritative gate.
4. `dish-selector.js` filters/ranks/scales dishes against a strict
   usage-cost cascade + a relaxation-tier ladder for time/taste/25%-cap
   (never budget) — unchanged by the purchase-cost redesign, still the
   heuristic that picks candidate dishes meal-by-meal.
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
| Pricing | `js/core/pricing.js` | Ingredient/dish pricing, package resolution, usageCost vs. purchaseCost |
| Budget | `js/core/budget.js` | Day-level aggregate purchase cost, pantry-aware — shared by the generator and the shopping list |
| Pantry | `js/core/pantry.js` | Despensa domain logic — storage, stock CRUD, the 3-stage lifecycle |
| Schedule | `js/core/meal-schedule.js` | Wake/sleep-anchored meal timing, chronological ordering — pure, called after generation |
| Planning engine | `js/engine/dish-selector.js`, `js/engine/plan-generator.js` | Selection, scaling, rebalance, budget cascade |
| No-cook engine | `js/engine/no-cook-generator.js` | Independent ready-to-eat product plan, not pantry-connected, schedule-aware |
| Data | `js/data/dishes.js`, `js/data/real-products.js`, `js/data/packaging.js` | Dish records, real Mercadona catalog, package-size lookup |
| Rendering | `js/ui/render.js`, `js/ui/render-insights.js`, `js/ui/render-schedule.js`, `js/ui/render-shopping-list.js`, `js/ui/render-pantry.js` | Summary, meals, warnings, day-schedule strip, shopping list, despensa panel |
| Styling | `assets/css/style.css` | Visual system, mobile-first responsive layout |
| Tests | `tests/*.test.js`, `poc/tests/*.test.js` | Node+vm characterization/regression tests over real production code |

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

## Budget = purchase cost, not usage cost (2026-08-08)

`data.budget` means "how much I'm willing to pay at checkout today" —
purchase cost, aggregated across the whole day's ingredients, package
sizes, and current pantry stock. It used to mean usage cost only (the
sum of technically-consumed ingredient grams), which let a plan "fit" an
8€ budget while its real grocery cost was 19€ — the checkout total was
never checked until the shopping list, too late to affect anything.
Fixed architecturally, not by clamping the displayed number: dish
selection still uses usage cost as a per-meal heuristic (`dish-
selector.js`, unchanged), but once a candidate day-plan exists,
`js/core/budget.js` computes the real aggregate purchase cost
(pantry-aware) and `plan-generator.js` enforces THAT as the hard budget,
scores candidates by it, and reports infeasibility honestly if even a
maximally-trimmed plan can't fit. The same `computeDayPurchaseCost()` is
what the shopping list uses, so the two numbers can never diverge.
Presets recalibrated accordingly (Ajustado/Equilibrado/Amplio: 5/8/12 →
15/20/28). Full design record, edge cases, and browser verification in
`STATE.md`.

## Product direction

Evolve into a real personal nutrition assistant: nutrition + shopping +
pantry today, workouts/recovery/progress/dashboard/coach-mode as future
domains (see `ROADMAP.md`, Milestones). Preserve deterministic domain
calculations as the source of truth. AI should explain, personalize, and
orchestrate validated tools; it must not invent nutritional values or
bypass safety checks. The longer-term data-quality fix (ingredient macros
are currently fabricated by mass allocation) is a separate, already-decided
migration — see `ROADMAP.md`, "Decisión de arquitectura" (Strategy B).

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
updated here 2026-08-08 (budget redesigned to mean purchase cost, not
usage cost — see above). Not production-ready or suitable for
health-critical personalization — see "Critical known issues" in
`STATE.md`.