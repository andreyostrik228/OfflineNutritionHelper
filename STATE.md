# Nutrition Planner — Engineering State

Actualizado 2026-08-03. Lee esto junto con `PROJECT.md` y `ROADMAP.md` antes
de empezar una sesión nueva (ver "Continuation checklist" al final). Para el
sistema completo (este repo + el pipeline Python en `PythonProject`), ver
`PythonProject/docs/architecture.md` y `PythonProject/docs/data_flow.md`
(ambos actualizados en la misma fecha que este archivo).

## Current implementation

- Página estática en español; lógica en globals de navegador y `<script>`
  cargados en orden manual en `index.html` — sin build system, sin bundler.
- Input: edad, sexo, peso, altura, actividad, entrenamientos/semana,
  objetivo, tiempo de cocina, preferencia dulce/salado, y **presupuesto**:
  ahora con dos vías mutuamente excluyentes — un preset (Ajustado €5 /
  Equilibrado €8 / Amplio €12 por día) o una cantidad exacta. Ver
  "Presupuesto: presets" más abajo.
- Output: 5 tomas/día (desayuno, comida, cena, snack, snack 2 — creció de 4
  a 5 tomas en una sesión anterior a esta), resumen de macros, notas,
  advertencias, y desde esta sesión también una **lista de la compra**
  separada (agregada por ingrediente, con coste de compra por paquete).
- Datos: `js/data/dishes.js` tiene **334 platos** (no 204 — cifra
  desactualizada en todo este archivo hasta ahora), cada uno con macros/
  coste agregados y una lista de ingredientes visibles (nombre + gramos).
  **81 ingredient roles únicos** en total (auditado programáticamente esta
  sesión, no de memoria — ver sección de auditoría abajo).
- Diseño visual: rediseño completo esta sesión (ver "Rediseño visual").

## Rediseño visual (2026-08-03)

Sistema de diseño nuevo en `assets/css/style.css` (reescrito por completo) +
ajustes en `index.html`/`js/app.js`/`js/ui/animations.js`. Dirección: "la
etiqueta de valores nutricionales como lenguaje de diseño" — hairlines,
cifras en monoespaciada (`JetBrains Mono`) para todo número (kcal, gramos,
precios), un solo acento verde (marca/proteína) + un acento cálido (clay,
calorías), Space Grotesk para titulares. Deliberadamente NO cream+serif+dorado
(el tema anterior), NO dark+neón, NO estilo periódico — los tres son los
"defaults" genéricos de diseño asistido por IA.

Cambios concretos:
- Se quitó el `.side-rail` decorativo (rail lateral con texto rotado) — no
  aportaba función, complicaba el responsive.
- Emojis en botones/copy (🍳/⚡/✅/⚠) reemplazados por los iconos SVG que ya
  existían en el sprite de `index.html` (+ 3 nuevos: bolt, cart, chevron).
- Branding "AI Bodybuilding Nutrition Planner" / "Chef Mode" → "Planificador
  de nutrición" / "Motor de reglas · 100% offline" — **esto resuelve el
  known issue #6 de más abajo** (branding engañoso).
- El catálogo de productos (`render-real-products.js`, ~2769 tarjetas) ahora
  vive colapsado por defecto tras un `<details>` nativo — antes se mostraba
  siempre expandido. Su lógica interna no cambió.
- Focus-visible en inputs/botones/chips de presupuesto — mejora parcial del
  known issue de accesibilidad de más abajo (sigue faltando live-region para
  el resultado del plan en sí, más allá de `statusText`).
- **Limitación de verificación conocida**: en la sesión del rediseño, el
  panel del navegador usado para QA no compuso frames (`screenshot` y
  `getComputedStyle` sobre cambios dinámicos no reflejaban el estado real) —
  se verificó la corrección estructural vía DOM/`element.matches(...)`, no
  pixel a pixel. Si algo del contraste/alineación se ve raro en un navegador
  real, revisar visualmente antes de asumir que ya se comprobó.

## Lista de la compra: usageCost vs. purchaseCost (2026-08-03)

Nuevo módulo `js/ui/render-shopping-list.js` + nuevas funciones en
`js/core/pricing.js` (`resolvePackageInfo`, `resolvePurchaseCost`). Antes de
esta sesión, la lista de la compra (recién creada esa misma sesión de
rediseño) mostraba el texto correcto ("Comprar: 1 bote de 250g") pero el
**precio** era el coste de lo usado (23g de miel ≈ €0.19), no el precio del
bote entero (€2.94) — bug real, corregido.

Modelo actual, fijado también en la cabecera de `js/core/pricing.js`:
- **`usageCost`** = precio × gramos REALMENTE usados. Es lo que sigue
  representando `data.budget` en `plan-generator.js`/`dish-selector.js` —
  **sin cambios de significado** — un tope de gasto de ingredientes
  consumidos, no de compra puntual.
- **`purchaseCost`** = precio de los paquetes/unidades ENTERAS que hay que
  comprar (redondeo hacia arriba), agregando la cantidad requerida entre
  TODAS las comidas del día antes de calcular el paquete (20g + 30g de miel
  en dos comidas = 50g agregados = 1 bote, no dos). El tamaño del paquete
  sale de `real-ingredient-matches.js` (`sizeG`, para los ~12 ingredientes
  con match real) o de `packaging.js` (`packageG`/`gramsPerUnit`, para el
  resto) — **nunca se inventa un tamaño**; si un ingrediente no tiene
  ninguno de los dos (carne/pescado fresco, comprado al peso real),
  `purchaseCost === usageCost` por diseño, no es un bug.
- El total de la lista de la compra usa `purchaseCost`. `dish-selector.js`/
  `plan-generator.js` **no llaman a estas funciones nuevas** — su
  presupuesto sigue siendo `usageCost`, sin ningún cambio de comportamiento.

## Presupuesto: presets (2026-08-03)

`js/data/budget-presets.js` (nuevo): Ajustado (€5) / Equilibrado (€8) /
Amplio (€12) por día, **calibrados con datos reales**, no a ojo — percentiles
P10/P50/P85 del coste de cada plato de `DISH_DB` vía `priceDishAtStore`
(sumado entre las 5 tomas), redondeados con margen de seguridad. Verificado
generando planes reales sobre 3 perfiles (corte/mantenimiento/volumen):
Ajustado fuerza relajación (nunca infeasible), Equilibrado mayormente
"adjusted"/"perfect", Amplio salió "perfect" en los tres.

- UI: grupo de radio nativo de 4 opciones (3 presets + "Cantidad exacta"),
  mutuamente excluyente por construcción; sin ninguna marcada por defecto —
  si el usuario no elige ninguna, `validateInput()` (`js/core/calculator.js`)
  bloquea la generación con un mensaje explícito.
- `js/core/calculator.js`: `resolveBudget(data)` convierte la elección
  (preset o exacto) al mismo `data.budget` (número) que siempre esperó el
  resto del pipeline — **cero cambios en `plan-generator.js`/
  `dish-selector.js`**.
- Preparado para más periodos de planificación (semana, 3 días): los presets
  están indexados por periodo (`BUDGET_PRESETS.day`), aunque hoy solo exista
  "day" — añadir otro periodo no requiere rediseñar el mecanismo.

## Exploración: IngredientResolver hacia productos reales (2026-08-03, NO producción)

`poc/` (nuevo directorio, paralelo, no conectado al motor real) prueba la
migración de fondo: en vez de que `dishes.js` declare macros/coste a mano
("fabricados por asignación de masa", ver known issue #2 más abajo — **sigue
sin resolverse en producción**), resolver cada ingrediente genérico a un
producto real verificado de `REAL_PRODUCTS` y calcular KBJU/coste desde ahí.

- `poc/core/ingredient-resolver.js`: resuelve con reglas estrictas
  (`needsReview=false`, macros no nulas, guarda de plausibilidad de
  macros, nunca similitud de texto). Memoiza por instancia (mismo producto
  para el mismo rol dentro de un mismo plan generado).
- **Auditoría completa de los 81 ingredientes reales de `dishes.js`**
  (`poc/INGREDIENT_COVERAGE.md`): **50 resuelven a un producto real fiable,
  31 no** — ninguno se sustituyó por un producto inventado. Motivos de los
  31 no resueltos: 12 no existen en el catálogo, 10 sin nutrición
  verificada, 3 solo tienen un producto de formato no apto (ready-meal/
  ahumado/conserva en vez de fresco), 3 con match ambiguo, 1 needsReview,
  2 casos especiales (macros implausibles / bug de nombre en `dishes.js`:
  el ingrediente `"Lechuga: Pepino"` es un nombre corrupto, dos
  ingredientes concatenados con `:` — no se ha corregido en `dishes.js`).
- Patrón detectado, útil para decidir la migración real: varios
  ingredientes que `dishes.js` mide YA COCIDO (arroz integral, pasta,
  cuscús) solo tienen producto real en versión SECA con nutrición
  verificada — habría que aplicar un factor de conversión seco→cocido
  (documentado con la fuente del factor, no a ojo) para poder resolverlos
  sin inventar el KBJU.
- **Nada de esto está integrado en producción.** `dish-selector.js` sigue
  sin leer `REAL_PRODUCTS` para macros o selección de platos. Es la base
  evaluada (con un plan de integración de 7 puntos ya discutido) para una
  futura migración real, no el comportamiento actual del generador.
- Tests: `poc/tests/` — 23 tests (`ingredient-resolver`,
  `shopping-list-builder` de prueba, `ingredient-coverage`).

## Tests (2026-08-03) — antes no existían

**Corrección respecto a la versión anterior de este archivo**: decía "No
automated tests" — ya no es cierto. Dos suites, ambas Node + `vm` (cargan
los archivos de producción reales, sin copiarlos ni envolverlos en
`module.exports`), sin ningún framework:

- `tests/` (producción): `node tests/run-tests.js` → **27 passed** —
  `shopping-cost.test.js` (14, `resolvePurchaseCost`/agregación) +
  `budget-mode.test.js` (13, `resolveBudget`/validación/integración).
- `poc/tests/`: `node poc/tests/run-tests.js` → **23 passed** — resolver,
  shopping-list de prueba, cobertura de ingredientes.
- Total: **50 tests, 0 failed**, verificados en la sesión de cada cambio.

Sigue sin haber linting, formatting, CI, package manifest, ni tests para
`dish-selector.js`/`plan-generator.js`/`calculator.js` en sí (los tests
nuevos cubren lo añadido esta sesión, no re-testean el motor de selección
que ya existía).

## Critical known issues (estado a 2026-08-03)

1. **Nutrition data is internally inconsistent.** Auditado sobre el set de
   204 platos (antes de que creciera a 334): solo 54/204 dishes tenían
   calorías dentro de 20 kcal de `protein*4+carbs*4+fat*9`. **No re-auditado
   sobre los 334 actuales** — no asumir que la proporción se mantiene igual.
2. **Ingredient nutrition and cost are fabricated by mass allocation.**
   Sigue siendo así para las MACROS (kcal/protein/carbs/fat de cada
   ingrediente dentro de un plato se reparten por cuota de gramos del
   `dish.kcal` agregado a mano, no de un dato real por ingrediente) —
   **sin resolver en producción**. El **coste**, en cambio, ya no se
   fabrica así desde antes de esta sesión: `pricing.js` calcula
   `usageCost` ingrediente a ingrediente con precios reales/estimados, y
   desde esta sesión también `purchaseCost` por paquete real (ver arriba).
   La exploración de `poc/` es el camino evaluado para arreglar también las
   macros, no aplicado todavía.
3. ~~**User constraints are soft.**~~ RESOLVED (sesión anterior a ésta) —
   ver historial en el bloque de abajo, sin cambios esta sesión.
4. ~~**The 25% calorie cap is applied before rebalance.**~~ RESOLVED
   (sesión anterior), sin cambios esta sesión.
5. **Protein-source reporting is wrong.** `mainProt` sigue sin copiarse a
   los items generados; la UI lo sigue adivinando por la etiqueta del
   plato (`js/ui/render-insights.js: extractMainProtFromLabel`). **Sin
   tocar esta sesión.**
6. ~~**Current branding is misleading.**~~ **RESOLVED esta sesión** (ver
   "Rediseño visual" arriba) — el producto ya no se presenta como "AI"/
   "Chef Mode".

## Audit evidence (2026-07-18, histórico — sobre el set de 204 platos)

Seeded 3,000-case stress run across supported input ranges:

- 1,582 plans exceeded the selected budget.
- 164 plans exceeded the selected cooking-time limit.
- 1,959 plans violated the final 25%-per-item calorie cap.
- 1,697 plans missed calories by more than 15%; 1,119 supplied under 85% of protein target.
- No non-finite values occurred in this run. JavaScript syntax checks pass.

Estos conteos son de una versión anterior del generador (antes del sistema
de relajación por tiers descrito abajo, y antes de que `DISH_DB` creciera a
334 platos) — evidencia diagnóstica histórica, no repetida sobre el estado
actual.

## Fallback / constraint-relaxation system (added 2026-07-28, sin cambios esta sesión)

`generateDietPlan` no relaja restricciones una sola vez en silencio ni cae a
un plato sin restricciones al fallar. Búsqueda en `RELAXATION_TIERS`
(`js/engine/dish-selector.js`, 5 tiers hoy — 0=exacto a 4=relajación
máxima no presupuestaria), reintentando hasta el primer tier sin
violaciones contra los números ORIGINALES del usuario. El presupuesto
(`data.budget`, `usageCost`) nunca forma parte de esa escalera de
relajación — es un tope duro en todos los tiers; solo se recorta el plan
(nunca se sube el tope) si el rebalanceo lo empuja por encima.

Siempre devuelve `{ meals, total, report }`; `report.status` es
`'perfect' | 'adjusted' | 'minimal'` (o `'unavailable'` solo ante un error
interno inesperado).

**Known limitation carried over, not fixed:** la selección de plato sigue
usando `Math.random()` como desempate en `diversityScore`, así que dos
llamadas con el mismo input pueden aterrizar en tiers distintos por azar.

## Other debt and constraints

- Sigue sin linting/formatting/CI/package manifest/persistencia/auth/
  backend (los tests nuevos de esta sesión no cambian esto).
- `addFood`, `costOf`, y `tasteText` siguen siendo helpers legacy sin usar
  (no tocados esta sesión).
- Root `style.css`/`icon.svg` siguen sin usarse (no tocados esta sesión;
  el rediseño reescribió `assets/css/style.css`, no el `style.css` raíz).
- Accesibilidad: focus-visible mejorado esta sesión (inputs/botones/chips
  de presupuesto); sigue faltando una live-region dedicada para el
  resultado completo del plan (más allá de `statusText`), y no se ha vuelto
  a auditar contraste/lectura de pantalla de forma exhaustiva tras el
  rediseño (ver limitación de verificación arriba).
- El sistema sigue sin presentarse como asesoramiento médico/nutricional
  individualizado — eso no ha cambiado.
- Grafo de Graphify del frontend **desactualizado** desde esta sesión (no
  incluye `poc/`, `tests/`, `budget-presets.js`, `render-shopping-list.js`)
  — ver `PythonProject/docs/graphify.md`.

## Required architectural decisions before implementation (sin cambios esta sesión)

1. Select and document food-data source, licensing, regional coverage, and update owner.
2. Define measurable tolerances and precedence when constraints conflict.
3. Define medical/safety boundary, target audience, and human-expert review process.
4. Choose a typed modular-monolith baseline: web app, API boundary, relational data store, shared domain package.
5. Decide whether AI is an optional explanation/tool-orchestration layer rather than the calculation engine.

## Próximos pasos sugeridos (no iniciados)

- Decidir si se integra el `IngredientResolver` de `poc/` en producción
  (arreglaría el known issue #2 de macros) — hay un plan de migración por
  fases ya discutido, sin ejecutar.
- Re-auditar la consistencia macro-energética (known issue #1) sobre los
  334 platos actuales, no solo los 204 originales.
- Arreglar el reporte de `mainProt` (known issue #5).
- Regenerar el grafo de Graphify del frontend (`graphify extract .
  --code-only` + `merge-graphs` desde `PythonProject`).
- Corregir el bug de nombre `"Lechuga: Pepino"` en `dishes.js` (separar en
  dos ingredientes) — encontrado durante la auditoría de `poc/`.
- Verificar visualmente (navegador real, no este entorno) el estado
  `:checked` de los chips de presupuesto — ver limitación de verificación.

## Continuation checklist

Lee `PROJECT.md`, `ROADMAP.md`, y este archivo primero. Para el sistema
completo (con el pipeline Python), lee también
`PythonProject/docs/architecture.md` y `PythonProject/docs/data_flow.md`.
No asumas que el estado descrito aquí sigue siendo exacto sin verificar
contra el código — esto es una foto fija a 2026-08-03.
