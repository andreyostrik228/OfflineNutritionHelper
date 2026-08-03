# Nutrition Planner — Project Context

## Purpose

Spanish-language, offline single-page prototype that estimates calorie/macronutrient targets and produces a four-meal bodybuilding plan from a local recipe dataset. It is currently a rule-based generator; it does **not** use AI or any external service.

## Current stack

- Static HTML, CSS, and browser-global JavaScript; no build system, package manager, tests, backend, storage, authentication, or external dependencies.
- `index.html` loads scripts in a manually ordered dependency chain.
- `assets/css/style.css` supplies the active responsive dark UI.
- `js/data/dishes.js` contains 204 recipe-like dishes.

## Current runtime flow

1. `app.js` reads form data and validates basic ranges.
2. `calculator.js` derives BMR, TDEE, calorie target, protein, fat, and carbs.
3. `plan-generator.js` assigns four meals.
4. `dish-selector.js` filters/ranks dishes and scales portions.
5. `meal-helpers.js` totals/rebalances meals.
6. `render.js` and `render-insights.js` render results and warnings.

## Important files

| Area | Files | Responsibility |
| --- | --- | --- |
| UI entry | `index.html`, `js/app.js` | Form, orchestration, DOM event handling |
| Nutrition core | `js/core/calculator.js`, `js/core/meal-helpers.js` | Target calculation and meal arithmetic |
| Planning engine | `js/engine/dish-selector.js`, `js/engine/plan-generator.js` | Selection, scaling, rebalance |
| Data | `js/data/dishes.js` | Dish records and visible ingredient quantities |
| Rendering | `js/ui/render.js`, `js/ui/render-insights.js` | Summary, meals, warnings, insights |
| Styling | `assets/css/style.css` | Responsive layout and visual system |

## Product direction

Evolve into an AI fitness assistant with nutrition, workouts, recovery, progress, dashboard, recipes, shopping, and education. Preserve deterministic domain calculations as the source of truth. AI should explain, personalize, and orchestrate validated tools; it must not invent nutritional values or bypass safety checks.

## Design principles for the next implementation

- Trusted nutrition data before sophisticated generation.
- Explicit hard constraints and machine-readable feasibility results.
- Pure, deterministic domain logic with tests.
- Accessible Spanish-first interface; never market rules as AI.
- Modular monolith first; introduce services only when scale requires them.

## Current status

Audit completed on 2026-07-18. The prototype is a useful UI/algorithm exploration, but not production-ready or suitable for health-critical personalization. See `ROADMAP.md` and `STATE.md` for next actions and known issues.