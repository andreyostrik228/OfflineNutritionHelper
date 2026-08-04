# Nutrition Planner — Roadmap

## Current status

**Stage:** working prototype, updated 2026-08-04. Core architecture
decision made this date: progressive migration from `dishes.js` (fabricated
macros) to real Mercadona products (see "Decisión de arquitectura" below).
Phase 0 of that migration (test safety net) is complete. Visual design was
reworked twice this week; the current production CSS is the second
revision ("premium fitness nutrition" direction, see `STATE.md`). Dataset
is 334 dishes / 81 ingredient roles (grew from 204/65 on 2026-08-03; the
2026-07-18 audit numbers were never re-run on the current set).

## Completed

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
(ampliar cobertura de datos reales más allá del 50/81 actual) es el
siguiente paso recomendado, no iniciado.

### Roadmap de migración por fases

Fase 0 completada (2026-08-04); Fases 1-6 no iniciadas. Cada fase debería
tener: objetivo, archivos implicados, archivos a NO tocar, dependencias,
riesgos, tests necesarios, criterio de fin — definidos con detalle cuando
se empiece esa fase, no de antemano en abstracto.

| Fase | Objetivo | Estado |
| --- | --- | --- |
| 0 | Estabilización y tests — red de seguridad antes de tocar el motor | **Completada 2026-08-04** |
| 1 | Datos reales — ampliar cobertura de resolución ingrediente→producto más allá de 50/81; reparar el script de exportación Python→frontend que hoy no existe | No iniciada — siguiente paso recomendado |
| 2 | Nuevo motor de planificación — `dish-selector.js`/`plan-generator.js` usan el resolver en vez de macros hardcodeadas; `dishes.js` pasa de "plato con macros fijas" a "plantilla de receta con roles" | No iniciada |
| 3 | Presupuesto y coste real — unificar `usageCost`/`purchaseCost` para que se calculen siempre desde el producto real resuelto; recalibrar `budget-presets.js` | No iniciada |
| 4 | Variedad y generación de planes — planes multi-día; decidir el destino del modo "sin cocinar" (¿converge con el motor principal?) | No iniciada |
| 5 | UX / funcionalidades — exportar lista de la compra, selector de tienda, persistencia local | No iniciada |
| 6 | Extensión a otras tiendas — probar que la arquitectura generaliza más allá de Mercadona | No iniciada |

Esta tabla de fases **reemplaza y detalla** las antiguas Milestones 1-2 de
la tabla de abajo (fundación de tests + modelo de datos validado) — esas
dos filas quedan marcadas como superseded. Las Milestones 0 y 3-8 (safety/
producto, constraint solver, historial/dashboard, progreso, workout,
capa de IA, hardening) siguen vigentes tal cual, son ortogonales a esta
decisión de arquitectura de datos.

## Next priorities

1. **P0 — Fase 1 de la migración (ver arriba).** Ampliar cobertura de datos reales es ahora la prioridad más alta y concreta — todo lo demás en el known-issues list depende de o se vuelve irrelevante por esto.
2. **P0 — Make constraints truthful.** Treat budget, prep time, nutrition tolerance, variety, and per-item calorie cap as hard post-generation checks. Partially characterized (2026-08-04, see `STATE.md` known issue #8 — the cap25%/enforceBudgetCap interaction); fixing it properly belongs in Fase 2 of the migration above, not as an isolated patch.
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

- Barcode/import flows, pantry inventory, meal-prep batching, calendar integration, coach mode, multilingual content, and analytics.
- Add only after the core plan is trustworthy, explainable, and testable.

## Update rule

At the end of every development task, update the status, completed items, new risks, and the first actionable priority. Do not mark a milestone complete until its acceptance criteria and tests pass.