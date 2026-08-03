# Nutrition Planner — Roadmap

## Current status

**Stage:** working prototype with a real design system, a corrected
purchase-cost model, and budget presets — updated 2026-08-03 (see
`STATE.md` for full detail). Dataset grew from 204 to 334 dishes since the
2026-07-18 audit; that audit's numbers were not re-run on the current 334.

## Completed

- Modularized static JavaScript prototype.
- Offline 334-dish dataset (204 at the 2026-07-18 audit) and responsive
  meal-plan interface.
- Architecture, data, UX, accessibility, and generator audit (2026-07-18,
  see caveat above about the dataset size change).
- Full visual redesign (2026-08-03): new design system, honest branding
  (removed "AI"/"Chef Mode" claims — resolves a known issue from the
  2026-07-18 audit), collapsed product catalog, shopping list UI.
- Shopping list with a correct usage-vs-purchase cost model (2026-08-03):
  totals now reflect whole packages/units bought, not just cost of the
  amount used — see `STATE.md` for the full `usageCost`/`purchaseCost`
  distinction.
- Optional budget presets (Ajustado/Equilibrado/Amplio, 2026-08-03),
  calibrated from real dish-cost percentiles, alongside the exact-amount
  input.
- First automated test coverage for this repo (2026-08-03): 50 tests
  (`tests/` + `poc/tests/`), 0 before this date.
- Proof-of-concept `IngredientResolver` + full 81-ingredient audit
  (`poc/`, 2026-08-03) evaluating a migration to real Mercadona products
  for nutrition — **not yet integrated into production** (Milestone 2
  below is still open).

## Next priorities

1. **P0 — Restore nutritional trust.** Replace inconsistent dish-level data with ingredient-level nutrition/cost data; validate macro-energy consistency; establish evidence and ownership for food data.
2. **P0 — Make constraints truthful.** Treat budget, prep time, nutrition tolerance, variety, and per-item calorie cap as hard post-generation checks. Return an infeasible result with alternatives rather than silently violating inputs.
3. **P0 — Correct product claims and safety.** ~~Remove the current AI/guarantee claims~~ **partially done (2026-08-03):** branding no longer says "AI"/"Chef Mode" (see `STATE.md`). Still open: clear scope, contraindication guidance, and required dietary/medical constraints before personalization.
4. **P1 — Establish an engineering foundation.** TypeScript, ES modules, linting, formatting, unit/property tests, CI, and a component/state architecture.

## Milestones

| # | Goal | Complexity | Dependencies | Impact | Primary risk |
| --- | --- | --- | --- | --- | --- |
| 0 | Product/safety decisions and acceptance criteria | M | Nutrition expert input | Critical | Treating health guidance as generic UI copy |
| 1 | Typed frontend foundation and test harness | M | Milestone 0 | High | Migration without preserving baseline behavior |
| 2 | Canonical food/recipe model and validated nutrition engine | XL | Milestone 0–1, trusted data | Critical | Data quality and licensing/maintenance burden |
| 3 | Deterministic constraint solver and feasibility UX | XL | Milestone 2 | Critical | Over-constraining menus; unclear trade-offs |
| 4 | Recipe, plan history, shopping list, and dashboard | L | Milestone 1–3, persistence | High | Scope creep and weak information architecture |
| 5 | Progress tracking and adaptive recommendations | L | Milestone 4 | High | Noisy user data and unsafe inferences |
| 6 | Workout and recovery domains | XL | Profile, progress, safety model | High | Mixing domain rules with unvalidated AI advice |
| 7 | AI explanation/orchestration layer | L | Validated domain tools and server boundary | High | Hallucinations, API key exposure, user trust |
| 8 | Release hardening and portfolio launch | L | All above | High | Accessibility, privacy, and regression debt |

## Future ideas

- Barcode/import flows, pantry inventory, meal-prep batching, calendar integration, coach mode, multilingual content, and analytics.
- Add only after the core plan is trustworthy, explainable, and testable.

## Update rule

At the end of every development task, update the status, completed items, new risks, and the first actionable priority. Do not mark a milestone complete until its acceptance criteria and tests pass.