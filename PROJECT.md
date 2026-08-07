# Nutrition Planner — Project Context

Updated 2026-08-07. This file is the fast orientation doc — for full
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
   amount, both to the same `data.budget` number.
3. `plan-generator.js` assigns 5 meals (desayuno/comida/cena/snack/snack2),
   allocating budget dynamically across them.
4. `dish-selector.js` filters/ranks/scales dishes against a strict budget
   cascade + a relaxation-tier ladder for time/taste/25%-cap (never budget).
5. `meal-helpers.js` totals/rebalances meals.
6. `render.js`/`render-insights.js` render the plan; `render-shopping-
   list.js` aggregates ingredients into a shopping list, pantry-aware if
   `pantry.js` is loaded (falls back to plain purchase-cost math if not).
7. Optionally: `render-pantry.js` lets the user save today's plan, mark a
   purchase done (adds to pantry stock), and mark individual meals cooked
   (subtracts from pantry stock) — see "Pantry / Despensa" below.

## Important files

| Area | Files | Responsibility |
| --- | --- | --- |
| UI entry | `index.html`, `js/app.js` | Form, orchestration, DOM event handling, startup isolation (`safeInit`) |
| Nutrition core | `js/core/calculator.js`, `js/core/meal-helpers.js` | Target calculation and meal arithmetic |
| Pricing | `js/core/pricing.js` | Ingredient/dish pricing, package resolution, usageCost vs. purchaseCost |
| Pantry | `js/core/pantry.js` | Despensa domain logic — storage, stock CRUD, the 3-stage lifecycle |
| Planning engine | `js/engine/dish-selector.js`, `js/engine/plan-generator.js` | Selection, scaling, rebalance, budget cascade |
| No-cook engine | `js/engine/no-cook-generator.js` | Independent ready-to-eat product plan, not pantry-connected |
| Data | `js/data/dishes.js`, `js/data/real-products.js`, `js/data/packaging.js` | Dish records, real Mercadona catalog, package-size lookup |
| Rendering | `js/ui/render.js`, `js/ui/render-insights.js`, `js/ui/render-shopping-list.js`, `js/ui/render-pantry.js` | Summary, meals, warnings, shopping list, despensa panel |
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
updated here 2026-08-07 (pantry/despensa feature + app-startup hardening).
Not production-ready or suitable for health-critical personalization — see
"Critical known issues" in `STATE.md`.