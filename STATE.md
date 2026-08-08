# Nutrition Planner — Engineering State

Actualizado 2026-08-08. Lee esto junto con `PROJECT.md` y `ROADMAP.md` antes
de empezar una sesión nueva (ver "Session handoff" al final — reemplaza al
antiguo "Continuation checklist"). Para el sistema completo (este repo + el
pipeline Python en `PythonProject`), ver `PythonProject/docs/architecture.md`
y `PythonProject/docs/data_flow.md` (Python no se ha tocado desde
2026-08-03; todo el trabajo desde entonces, incluida esta sesión, es
exclusivamente en este repo).

**Para orientarse rápido sin leer todo este archivo**: hay un grafo de
código real (Graphify) regenerado el 2026-08-08 (348 nodes, 554 edges, 34
communities — incluye ya `js/core/budget.js`, `js/core/meal-schedule.js`,
`js/ui/render-schedule.js`, `tests/budget-purchase.test.js`,
`tests/meal-schedule.test.js`) — `graphify explain "<símbolo>"`, `graphify
query "<pregunta>"`, `graphify god-nodes --top 8` desde esta carpeta. Ver
`PythonProject/docs/graphify.md` para el manual completo (comandos, qué es
un node/edge/community, cómo regenerarlo tras tocar código). Complementa,
no sustituye, la lectura de este archivo — el grafo da estructura (quién
llama a quién), no las decisiones de producto ni el "por qué" que solo
está aquí y en `ROADMAP.md`. **Si vuelves a tocar código, el grafo se
desactualiza de nuevo** — no se actualiza solo (comandos exactos en
`PythonProject/docs/graphify.md`, sección "Cómo actualizarlo").

**Resumen de la sesión 2026-08-08 (presupuesto = coste de COMPRA, no de
uso)** (ver sección dedicada más abajo, "Presupuesto de compra (purchase
budget)", para el detalle completo): bug real reportado por el usuario —
con `Presupuesto diario = 8€`, la app podía aceptar un plan con
`usageCost=7.72€` cuya compra real (paquetes enteros necesarios) costaba
`19€`, porque TODO el pipeline (selección de plato, recorte,
verificación) solo miraba usageCost; purchaseCost solo se calculaba
después, ya en la lista de la compra, sin que el generador se enterase.
Rediseño arquitectónico (no un parche `Math.min`): `data.budget` ahora
significa dinero de COMPRA. Nuevo módulo compartido `js/core/budget.js`
(`computeDayPurchaseCost`, consciente de despensa) usado tanto por
`plan-generator.js` (nuevo `enforcePurchaseBudgetCap`, sustituye al
antiguo `enforceBudgetCap` basado en usageCost) como por
`render-shopping-list.js` — mismos números siempre, nunca dos cálculos
independientes. Presets recalibrados empíricamente contra purchaseCost
real (Ajustado 5→15, Equilibrado 8→20, Amplio 12→28 — los antiguos se
habían quedado sin sentido de la noche a la mañana con el cambio de
semántica). 12 tests nuevos (`tests/budget-purchase.test.js`), 2
golden-master recapturados, 126 tests totales, 0 fallidos. Verificado en
vivo reproduciendo el bug original y confirmando que ya no ocurre
(desktop + mobile). De paso, corregido un bug real de CSS encontrado
durante la verificación mobile (no relacionado con el presupuesto, de la
sesión anterior): la barra sticky "próxima comida" sobresalía del
viewport por un margen negativo mal calculado (-8% en vez de -4%).

**Resumen de la sesión 2026-08-07 (horario de comidas)** (ver sección
dedicada más abajo, "Horario de comidas (meal schedule)", para el detalle
completo): se añadió una función nueva completa — el plan generado ahora
dice A QUÉ HORA se come cada toma, no solo qué. Modelo elegido: reparto
UNIFORME anclado a dos preferencias nuevas (hora de despertar/hora de
dormir, con valores por defecto sensatos), sobre las comidas reordenadas
CRONOLÓGICAMENTE (antes se pintaban en orden de categoría — desayuno/
comida/cena/snack/snack2 — un bug real de UX que esta función expuso y
corrigió). Nuevo módulo puro `js/core/meal-schedule.js` (36 tests nuevos,
114 tests totales, 0 fallidos) + `js/ui/render-schedule.js` (franja de
horario del día + barra sticky compacta solo-mobile con la próxima
comida). Integrado en el plan normal, en "sin cocinar", y persistido en el
historial de la despensa (con fallback seguro para planes antiguos sin
hora). Verificado en vivo en navegador (desktop y viewport mobile 375px),
incluyendo localStorage con datos v1 viejos y JSON corrupto.

**Resumen de la sesión 2026-08-06/07** (ver secciones fechadas más abajo
para el detalle completo): (1) se diseñó e implementó una **Despensa
(pantry/inventory)** completa — la app recuerda cuánto de cada ingrediente
ya tienes y lo descuenta de compras futuras; (2) tras una prueba real del
usuario, se encontró que el diseño inicial (v1, un solo botón
"comprar+usar") producía datos incorrectos en un escenario real (comprar y
no llegar a cocinar) — se rediseñó a un ciclo de vida de **3 etapas
desacopladas** (v2); (3) esa misma prueba real destapó un bug arquitectónico
más serio: una entrada de datos vieja en `localStorage` rompía el arranque
de TODA la app, no solo la despensa — se hizo una auditoría completa y un
rediseño de la inicialización con aislamiento de fallos en 4 capas; (4) se
regeneró el grafo de Graphify del frontend (desactualizado desde
2026-08-03). Todo está comiteado y pusheado a `main` (`ef1191ae`).

**Resumen de la sesión 2026-08-04** (ver secciones fechadas más abajo para
el detalle completo): (1) se decidió la estrategia de arquitectura para
migrar de `dishes.js` a productos reales de Mercadona — Estrategia B,
migración progresiva vía `IngredientResolver`, con roadmap de 7 fases en
`ROADMAP.md`; (2) se completó la Fase 0 (red de seguridad de tests) de ese
roadmap; (3) se rediseñó visualmente la aplicación por segunda vez esta
semana (dirección "premium fitness nutrition", ver más abajo) y se
reescribió el layout mobile; (4) se corrigió un bug real de CSS Grid.

## Current implementation

- Página estática en español; lógica en globals de navegador y `<script>`
  cargados en orden manual en `index.html` — sin build system, sin bundler.
- Input: edad, sexo, peso, altura, actividad, entrenamientos/semana,
  objetivo, tiempo de cocina, preferencia dulce/salado, y **presupuesto**:
  ahora con dos vías mutuamente excluyentes — un preset (Ajustado €5 /
  Equilibrado €8 / Amplio €12 por día) o una cantidad exacta. Ver
  "Presupuesto: presets" más abajo.
- Output: 5 tomas/día (desayuno, comida, cena, snack, snack 2), resumen de
  macros, notas, advertencias, **lista de la compra** (agregada por
  ingrediente, con coste de compra por paquete, y desde 2026-08-06/07
  consciente de la despensa — descuenta lo que ya tienes), y desde
  2026-08-06/07 una **Despensa** persistente (`localStorage`) con ciclo de
  vida de 3 etapas — ver sección dedicada más abajo.
- Datos: `js/data/dishes.js` tiene **334 platos** (no 204 — cifra
  desactualizada en todo este archivo hasta ahora), cada uno con macros/
  coste agregados y una lista de ingredientes visibles (nombre + gramos).
  **81 ingredient roles únicos** en total (auditado programáticamente esta
  sesión, no de memoria — ver sección de auditoría abajo).
- Diseño visual: dos rediseños completos en sesiones distintas — ver
  "Rediseño visual" (2026-08-03, base tipográfica/estructural) y "Rediseño
  visual v2" (2026-08-04, dirección "premium fitness nutrition", la que
  está en producción ahora mismo).

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

## Tests (actualizado 2026-08-08)

Dos suites, ambas Node + `vm` (cargan los archivos de producción reales,
sin copiarlos ni envolverlos en `module.exports`), sin ningún framework:

- `tests/` (producción): `node tests/run-tests.js` → **103 passed, 0
  failed** — `shopping-cost.test.js` (14), `budget-mode.test.js` (13),
  `plan-generator.characterization.test.js` (9, golden-master recapturado
  2026-08-08 tras el rediseño de presupuesto — ver sección dedicada),
  `ingredient-packaging-coverage.test.js` (2), `pantry.test.js` (33,
  2026-08-06/07 — ver sección Despensa arriba; cubre almacenamiento con
  fallback en memoria, localStorage real inyectado, JSON corrupto,
  entradas individuales corruptas, las 3 etapas del ciclo de vida, el caso
  exacto reportado por el usuario — comprar sin cocinar deja el stock
  íntegro, no neteado —, y regresión de compatibilidad con
  `shopping-cost.test.js` sin `pantry.js` cargado), `meal-schedule.test.js`
  (36, 2026-08-07 — ver sección "Horario de comidas" más abajo; cubre
  saneamiento de wake/sleep, envoltura de medianoche/turno de noche,
  ventana degenerada/muy corta, orden cronológico para 3/4/5 tomas y
  claves desconocidas, hora de empezar a cocinar, lector del DOM, y
  persistencia de la hora a través de `savePlanForToday`),
  `budget-purchase.test.js` (12, nuevo 2026-08-08 — ver sección
  "Presupuesto de compra" más abajo; cubre usageCost<budget con
  purchaseCost>budget rechazado, usageCost>budget con purchaseCost<=budget
  vía despensa aceptado, cobertura total/parcial de despensa, varios
  ingredientes con envase, presupuesto 8€ nunca acepta una compra real muy
  por encima, presupuesto irrisorio con `budget`/`budget_infeasible`
  honesto, lista de la compra trazable al mismo número que el generador,
  "Confirmar y usar este plan hoy" actualizando despensa correctamente, y
  localStorage de despensa corrupto/con entradas individuales corruptas).
- `poc/tests/`: `node poc/tests/run-tests.js` → **23 passed, 0 failed** —
  resolver, shopping-list de prueba, cobertura de ingredientes (sin
  cambios, `poc/` no se tocó en ninguna de estas sesiones).
- Total: **126 tests, 0 failed** — re-ejecutado y verificado en la sesión
  2026-08-08 (no solo heredado de memoria).

Sigue sin haber linting, formatting, CI, ni package manifest. `dish-
selector.js`/`plan-generator.js`/`calculator.js` SÍ tienen cobertura desde
2026-08-04 (ver Fase 0 abajo) — antes de esa fecha eran el motor más
grande del proyecto sin ningún test propio.

## Fase 0 de estabilización — tests de caracterización (2026-08-04)

Contexto: sesión anterior decidió la estrategia de migración hacia
productos reales de Mercadona (Estrategia B — ver `ROADMAP.md`, sección
"Decisión de arquitectura"). Antes de tocar el motor de selección de
platos, se construyó una red de seguridad — esto es la Fase 0 de ese
roadmap, **completada**.

- **`tests/plan-generator.characterization.test.js`** (9 tests) — sobre 5
  perfiles representativos (corte/Ajustado, recomposición/Equilibrado,
  volumen/Amplio, presupuesto exacto muy ajustado, tiempo de cocina
  mínimo), verifica el CONTRATO observable de `generateDietPlan()` sin
  fijar qué plato exacto sale (el motor usa `Math.random()` como
  desempate real): estructura de 5 comidas, presupuesto nunca superado
  sin que `report.violations` lo declare, tiempo de preparación nunca
  superado sin declararse, cap del 25% nunca superado sin declararse,
  desviación de calorías/proteína dentro de tolerancia o declarada, nunca
  `status:'unavailable'`, y el preset Amplio nunca produce
  `budget_infeasible`. Incluye 2 tests golden-master con `Math.random()`
  sembrado (`tests/lib/seed-random.js`, PRNG mulberry32 inyectado DENTRO
  del sandbox `vm` — sobreescribir el `Math.random` de Node no sirve,
  cada contexto `vm` tiene su propio `Math`) que fijan valores agregados
  exactos (kcal/proteína/coste/status) para una semilla concreta — nunca
  el nombre del plato, a propósito.
- **`tests/ingredient-packaging-coverage.test.js`** (2 tests, diagnóstico)
  — compara los 81 ingredient roles reales de `DISH_DB` contra
  `resolvePackageInfo()` real (no reimplementada). **Hallazgo real, no
  documentado hasta ahora**: `packaging.js` dice en su cabecera cubrir
  "los 65 ingredientes de `DISH_DB`" — cifra ya sabíamos desactualizada
  (creció a 81), pero nadie había medido el impacto. Ejecutando la
  función real: **25 de los 81 roles resuelven a `packageSizeG: null`**
  ("se compra al peso, sin envase fijo" en la lista de la compra), no 18
  como estimó un script rápido de una sesión anterior (ese script no
  pasaba por `real-ingredient-matches.js`, que cubre `pechuga de pollo`
  con envase real vía producto verificado). De esos 25: ~10-11 son
  carne/pescado fresco genuinamente sin envase (correcto por diseño,
  documentado así en la cabecera de `packaging.js`), el resto (fruta que
  se compra por unidad, pan, congelados) es, con alta probabilidad, un
  hueco de cobertura real, no una decisión — **sin corregir todavía**,
  el test solo fija la línea base actual para detectar si el hueco crece
  o se reduce sin querer.
- El test fue diseñado para fallar si alguien añade un plato con un
  ingrediente nuevo sin darle cobertura de packaging — exactamente el
  fallo silencioso que pasó desapercibido cuando `DISH_DB` creció de 204
  a 334 platos.

## Decisión de arquitectura: migración a productos reales (2026-08-04)

Se compararon formalmente 3 estrategias para el problema central del
proyecto (`dishes.js` fabrica macros por asignación de masa — known issue
#2 más abajo) — el registro completo de la comparación (calidad, riesgo,
qué se reutiliza, qué se descarta) y el roadmap de 7 fases (Fase 0-6) está
en **`ROADMAP.md`, sección "Decisión de arquitectura"** — no duplicado
aquí. Resumen de una línea: **Estrategia B** — mantener `dishes.js` como
plantillas de receta (las 334 combinaciones ya vetadas por criterio
humano son el activo más caro de recrear) y resolver cada ingrediente
progresivamente contra `REAL_PRODUCTS` vía el `IngredientResolver` ya
probado en `poc/` (50/81 roles ya resueltos) — no una reescritura desde
cero (Estrategia C) ni quedarse parcheando el estado actual sin más
(Estrategia A). Fase 0 de ese roadmap (tests) está completada, ver
arriba; Fase 1 (ampliar cobertura de datos reales) es el siguiente paso
recomendado, no iniciado.

## Rediseño visual v2 — "premium fitness nutrition" (2026-08-04)

Reemplaza en producción al rediseño de 2026-08-03 (sección "Rediseño
visual" arriba, que sigue siendo un registro histórico válido de lo que
se hizo entonces, pero el CSS actual ya no es ese). Dirección nueva,
pedida explícitamente por el usuario tras rechazar dos intentos
intermedios (uno "demasiado apagado/técnico", otro "AI slop" por exceso
de acentos saturados sin restricción — ver historial de decisiones
descartadas en `ROADMAP.md` si hace falta el detalle): **"Premium Fitness
Nutrition × Editorial Food × Modern Digital Product"** — jerarquía de
color (un verde de marca dominante + un acento terracota, no una lista
cerrada de N colores), composición editorial concentrada en el hero, sin
convertir cada sección en un bloque de color, sin repetir la misma
plantilla de tarjeta en todas partes.

Cambios concretos en `assets/css/style.css` (solo CSS, cero cambios en
`index.html`/JS/`id="..."`):
- **Tokens de color**: paleta desplazada de neutrales fríos a cálidos
  (`--ink`/`--paper`/`--line` de gris a café/pergamino), verde de marca
  más profundo (`#1c5c40`), terracota como único acento de contraste.
- **Hero**: panel verde asimétrico de ancho completo (antes: texto plano
  sobre fondo blanco) con una forma decorativa circular en terracota
  sangrando por la esquina superior derecha, textura de puntos sutil,
  titular mucho más grande (clamp 42-84px, antes 32-52px), la palabra
  "nutrición" en terracota en vez de verde para dar contraste de color
  dentro del propio titular. Todo vía pseudo-elementos CSS sobre los 4
  hijos existentes de `.hero` — sin tocar el HTML.
- **Tipografía**: `.brand-eyebrow .badge-text` y `.form-section-label`
  pasaron de JetBrains Mono a Inter — eran etiquetas/copy, no datos;
  mono queda estrictamente para kcal/gramos/precios.
- **`.btn-primary`** ahora verde (antes negro) — uno de los pocos puntos
  de alto impacto del color dominante.
- **`.meal-card`** con barra de acento izquierda (verde, terracota al
  hover) para darle un peso visual distinto al de la lista de la compra.
- **`.shopping-list`** rediseñada de grid de tarjetas con borde a lista
  plana estilo recibo (líneas divisorias, sin tarjetas) — deliberadamente
  el extremo "calmado" del rango de peso visual, en contraste con las
  tarjetas de comida.
- Hover añadido donde no existía: `.verified-card`, `.nocook-item`, filas
  de `.shopping-item`.
- **Verificación**: funcionalidad confirmada (plan se genera, macros/
  precios/insignia VERIFICADO correctos, 0 errores de consola) vía texto
  de página + consola, no solo visual — el panel de navegador de esta
  sesión tampoco compuso frames de forma fiable para captura de pantalla
  (mismo tipo de limitación que la sesión de 2026-08-03, ver arriba,
  aunque se consiguió una captura de escritorio puntual que sí confirmó
  visualmente el hero). **Recomendado**: verificar visualmente en un
  navegador real antes de dar el diseño por definitivamente aprobado más
  allá de lo que ya confirmó el usuario sobre la dirección.

## Bug de CSS Grid corregido: chips de presupuesto desiguales (2026-08-04)

`.budget-modes` usa `grid-template-columns: repeat(4, 1fr)`, pero los
tracks `1fr` de CSS Grid son `minmax(auto, 1fr)` por defecto — si el
contenido de un chip no cabe en su cuota "justa", el track crece a costa
de los demás. Medido antes del fix: los 4 chips de presupuesto (Ajustado/
Equilibrado/Amplio/Cantidad exacta) medían **92px/109px/70px/88px** —
visiblemente desiguales, pese a `1fr` — no era percepción, era un bug
real. Fix: `min-width: 0` en `.budget-chip` (fix estándar de esta trampa
concreta de CSS Grid). Después del fix: **79px/79px/79px/79px** exactos,
en desktop y mobile. El bug afectaba a las 4 opciones por igual, no solo
a "Cantidad exacta" (que fue la que el usuario notó).

## Mobile layout — recomposición, no solo compresión (2026-08-04)

Diagnóstico antes de tocar nada: en viewports `<400px` (que cubre casi
todos los teléfonos reales en portrait), un `@media` existente colapsaba
`.nutrition-strip` (macros), `.meta-boxes` y `.meal-footer` a 1 columna
además del formulario ya colapsado a 1 columna por el breakpoint de
640px — esto, no el contenido en sí, era la causa real de "todo en una
columna larga".

Cambios en `assets/css/style.css` (solo dentro de los `@media` móviles
existentes, cero cambios de desktop):
- **Formulario**: 2 columnas en mobile (antes 1) — Edad+Sexo, Peso+
  Altura, etc. quedan uno junto a otro. Solo `.field.full` (presupuesto,
  preferencia de sabor) sigue a ancho completo.
- **`.nutrition-strip`**: 2×2 siempre, ya no colapsa a 4 filas por debajo
  de 400px.
- **`.meta-boxes`/`.meal-footer`**: se quitó el colapso forzado a 1
  columna por debajo de 400px (quedan en 3 columnas, como ya estaban
  desde el breakpoint de 640px).
- **`.meal-card`** se mantuvo deliberadamente a 1 columna en mobile — el
  contenido por tarjeta (varios ingredientes con macros y precio) no cabe
  legible en 2 columnas a ancho de teléfono; comprimir aquí habría sido
  el error que el usuario pidió evitar ("no reducir todo, recomponer").
- Espaciado entre secciones (`.hero`, `.grid`, `.nocook-panel`/
  `.shopping-panel`, `.meals-grid`) reducido en mobile para quitar aire
  sobrante entre bloques.

**Resultado medido** (no solo "se ve mejor"): altura total de la página
en 375px pasó de **8744px a 7160px (-18%)**, verificado con
`document.body.scrollHeight` antes/después sobre un plan generado real,
sin ningún overflow horizontal nuevo (verificado en `.shopping-summary`,
`.meta-boxes`, `.meal-footer`, `.form-grid`, `.nutrition-strip`,
`.budget-modes`). Touch targets verificados: chips 52px, inputs 45px
(ambos por encima del mínimo de 44px). **No verificado visualmente en un
navegador real** — toda la verificación de este cambio fue vía
`getBoundingClientRect()`/`getComputedStyle()`, no captura de pantalla
(mismo problema de compositing del panel de navegador que el resto de la
sesión). Recomendado probarlo en un teléfono real o emulador antes de
darlo por definitivo.

## Despensa (pantry/inventory) — v1 → v2, ciclo de vida en 3 etapas (2026-08-06/07)

Nueva funcionalidad, no un fix — pedida explícitamente por el usuario como
"una de las funciones principales del proyecto": la app deja de olvidar
todo tras cada `generateDietPlan()` y recuerda cuánto de cada ingrediente
ya tienes (sobras de compras/planes anteriores), descontándolo de lo que
un plan futuro pide comprar.

**v1 (primer diseño, ya reemplazado, mantenido aquí solo como registro)**:
un solo botón "Confirmar y usar este plan hoy" que compraba (sumaba stock)
Y consumía (restaba stock) en la misma transacción atómica. El usuario lo
probó en real y encontró el fallo: elige un plan por la mañana, compra
(la comida SÍ está ya en su cocina — hecho físico), por la noche unos
amigos le invitan a cenar fuera y no cocina nada — v1 ya había restado el
consumo asumido en el mismo clic de "confirmar", así que la despensa
terminaba con un "sobrante" neto arbitrario en vez de la cantidad
realmente comprada.

**v2 (diseño actual, en producción)**: comprar y cocinar son eventos
independientes del mundo real, así que se modelan como acciones
independientes — 3 etapas, cada una opcional y en su propio momento:

1. **"Usar este plan hoy"** (botón en el panel de lista de la compra) —
   registra el plan del día, desglosado POR COMIDA. Pura contabilidad,
   **cero mutación de stock**. `savePlanForToday(meals, storeId)`
   (`js/core/pantry.js`).
2. **"Marcar compra como hecha"** (dentro de cada entrada del historial,
   en el panel "Tu despensa") — la ÚNICA acción que SUMA stock. Checklist
   de qué se compró de verdad (se puede desmarcar lo que no); reutiliza
   `resolvePurchaseCostWithPantry()` para calcular cuánto falta comprar
   con el stock actual. Se puede pulsar varias veces (varios viajes a
   comprar) — cada vez relee el stock real. `markPurchaseDone(entryId,
   excludedNames, storeId)`.
3. **"Marcar como cocinado"** por cada una de las 5 comidas (también en el
   historial) — la ÚNICA acción que RESTA stock, y solo de esa comida
   concreta. Funciona igual aunque nunca se haya "comprado" ese ingrediente
   por la app (ej. ya lo tenías en casa). Desmarcar revierte EXACTAMENTE
   lo que esa comida restó (snapshot guardado en `meal.consumed` en el
   momento de cocinar, no un recálculo contra el stock actual — importante
   porque el stock pudo cambiar mientras tanto por otras acciones).
   `markMealCooked(entryId, mealKey, cooked)`.

El stock refleja la realidad física de forma continua (sube al comprar,
baja al cocinar) — decisión deliberada, no lo que el usuario pidió
literalmente (que sugería esperar hasta "marcar como comido" para cambiar
cualquier cosa); se explicó y se justificó al usuario, que la aceptó.

**Alcance explícitamente fuera de esta implementación** (decisiones de
arquitectura, no descuidos):
- `dish-selector.js`/`plan-generator.js` siguen sin saber nada de
  despensa — la selección de platos sigue asumiendo precio de venta
  completo para cada ingrediente. Solo la lista de la compra (post-hoc,
  tras elegir el plato) descuenta stock. Estructuralmente garantizado, no
  solo una promesa: la selección de plato solo llama a
  `resolveIngredientPrice`/`priceDishAtStore` (lado usageCost), nunca a
  `resolvePurchaseCost`/`resolvePurchaseCostWithPantry` (lado
  purchaseCost). Hacer la selección de plato consciente de despensa (para
  que el algoritmo prefiera activamente ingredientes ya en casa y estire
  el presupuesto) es una fase futura distinta y de más riesgo, no
  construida.
- El modo "sin cocinar" (`js/engine/no-cook-generator.js`) NO está
  conectado a la despensa — sus items no tienen un concepto de "cuánto se
  consumió realmente" (solo `quantity: 1` de producto entero), a
  diferencia del modo normal. Conectarlo requeriría diseñar primero ese
  modelo de consumo — trabajo aparte, no un simple cableado.

**Datos**: `localStorage`, dos claves versionadas
(`nutritionPlanner.pantry.v1` = stock actual por ingrediente,
`nutritionPlanner.pantryHistory.v1` = historial de planes, tope 30
entradas, más antiguas se descartan primero). Limitación real y asumida:
vive solo en ESE navegador, sin sincronización entre dispositivos.

**Archivos nuevos**: `js/core/pantry.js` (lógica pura, sin DOM ni
`DISH_DB`, mismo principio de separación que ya usa `pricing.js`),
`js/ui/render-pantry.js` (presentación + eventos del panel "Tu despensa").
**Modificados**: `js/ui/render-shopping-list.js` (usa
`resolvePurchaseCostWithPantry` cuando está cargado, con fallback exacto
al comportamiento anterior si no), `js/app.js`, `index.html`,
`assets/css/style.css`. **Tests**: `tests/pantry.test.js`, 33 tests.

## Bug arquitectónico real + rediseño de la inicialización (2026-08-07)

La misma sesión de prueba real que motivó el rediseño v1→v2 destapó un
bug más serio, en el arranque de la app, no solo en la despensa: **una
entrada de `nutritionPlanner.pantryHistory.v1` con la forma v1 antigua
(sin `.meals`) hacía que `renderPantryPanel()` lanzara al llamar
`entry.meals.every(...)` sobre `undefined`.** Como esa llamada ocurría
SÍNCRONAMENTE dentro del mismo `DOMContentLoaded`, ANTES de que se
cableara `form.addEventListener("submit", handleSubmit)` (al final del
archivo), el error abortaba el resto del callback — el listener del
submit nunca se registraba, y "Generar plan" caía a un envío NATIVO del
`<form>`, que recargaba la página entera.

Se pidió explícitamente no parchear con un try/catch puntual sino auditar
la arquitectura completa de inicialización/localStorage y corregirla de
raíz. Cambios reales (no cosméticos):

1. **Orden de arranque**: en `js/app.js`, cablear
   `submit`/`resetBtn`/`fillExampleBtn` ahora ocurre INMEDIATAMENTE tras
   capturar las referencias al DOM — antes de inicializar cualquier
   módulo opcional (despensa, lista de la compra, catálogo, sin-cocinar,
   presets de presupuesto). Ningún fallo posterior puede ya impedir que
   el formulario funcione.
2. **`safeInit(label, fn)`** (nuevo, en `app.js`): cada módulo opcional se
   inicializa dentro de esto — aísla su propio fallo (lo registra en
   consola, no lo relanza). Un módulo nunca puede tumbar a otro ni al
   arranque general.
3. **Validación de datos en la fuente** (`js/core/pantry.js`):
   `isValidHistoryEntry()` ahora valida la forma COMPLETA (cada
   `meal.key`/`meal.items[]`, no solo el nivel superior) — descarta en
   silencio cualquier entrada incompatible o corrupta, sin migración (los
   datos v1 no son reconstruibles a la forma v2). `sanitizePantryState()`
   (nuevo) hace lo mismo para el stock: una entrada individual corrupta
   (`null`, forma inesperada) se descarta sin tumbar la lectura de las
   demás — se encontró y corrigió un SEGUNDO bug de la misma clase antes
   de que nadie lo reportara (`listPantryEntries()` hacía
   `entry.displayName` sin comprobar que `entry` no fuera `null`).
4. **Aislamiento por fila al renderizar** (`js/ui/render-pantry.js`):
   `safeRenderRows()` — una fila individual que falle al pintarse
   (aunque haya pasado la validación anterior) se omite sola; el resto de
   la lista se sigue pintando con normalidad.

4 capas de defensa, no una: si una fallara, las otras siguen conteniendo
el daño a un solo módulo/fila — nunca a la app entera. Documentado en la
cabecera de `js/app.js` para que futuros cambios no lo rompan sin darse
cuenta.

**Verificado manualmente** (no solo por test) con las 4 combinaciones
realistas de `localStorage`: vacío, con una entrada v1 vieja inyectada a
mano, con JSON corrupto en ambas claves, y con datos v2 válidos con
progreso parcial (una comida cocinada, otras no) — las 4 renderizan sin
error de consola y generan un plan con normalidad. También 3 generaciones
de plan consecutivas sin acumular estado raro. Ver "Tests" abajo para el
detalle automatizado equivalente.

## Horario de comidas (meal schedule) — 2026-08-07

Función nueva completa, pedida explícitamente: el plan generado debe decir
no solo QUÉ comer sino A QUÉ HORA — sin hardcodear 5 horas fijas.

**Investigación previa (antes de diseñar nada)**: se leyó la arquitectura
completa relevante — `MEAL_DEFS` en `plan-generator.js` fija SIEMPRE 5
tomas (breakfast/lunch/dinner/snack/snack2, en ESE orden de categoría, no
cronológico); `no-cook-generator.js` usa 4 slots distintos (breakfast/
lunch/snack/dinner); no existía ningún ajuste de despertar/dormir; el
formulario no persiste nada entre sesiones salvo la despensa
(`localStorage`, solo pantry). Hallazgo real, no cosmético: **las tarjetas
de comida se pintaban en orden de CATEGORÍA, no de reloj** (desayuno,
comida, cena, snack, snack2 — la cena aparecía ANTES que los snacks) — un
bug de UX preexistente que esta función necesariamente expone y corrige,
porque un horario con las horas fuera de orden visual no tiene sentido.

**Modelo elegido — "reparto uniforme anclado"**: las tomas se ordenan
cronológicamente por un tipo semántico (tabla `MEAL_TIME_RANK` en
`js/core/meal-schedule.js`: desayuno=0, snack/snack1=1 [media mañana],
comida=2, snack2/merienda=3 [media tarde], cena=4; una clave desconocida
se reparte proporcionalmente por su posición original, nunca rompe el
orden de las demás) y luego se distribuyen a INTERVALOS IGUALES dentro de
la ventana despertar→dormir (con un margen de 30 min tras despertar y 90
min antes de dormir; si esos márgenes no caben en una ventana corta, se
usa la ventana cruda sin margen en vez de un resultado imposible). Por
qué este modelo y no horas fijas por nombre de comida: funciona igual de
bien con 3, 4, 5 o N tomas sin tener que enumerar casos, y garantiza por
construcción intervalos regulares (lo que se pidió explícitamente) en vez
de intentar adivinar "la hora típica de cenar".

**Ajustes de usuario — el mínimo necesario, ninguno más**: dos campos
nuevos, `Hora de despertar`/`Hora de dormir` (`<input type="time">`,
valores por defecto 07:00/23:00 en el HTML, igual que el resto del
formulario) — se descartó deliberadamente añadir "hora preferida de
desayuno" o similar: derivarla de la hora de despertar + margen ya cubre
el caso sin una tercera preferencia. `readScheduleSettings()` lee estos
campos directamente del DOM, INDEPENDIENTE de `readForm()`/
`validateInput()` (`calculator.js`) — el modo "sin cocinar" nunca pasa por
el formulario de calorías pero sí quiere respetar el horario, así que
compartir el lector (no duplicarlo) evita acoplar ambos flujos.

**Punto de integración — cero cambios al generador**: `computeMealSchedule()`
se llama DESPUÉS de `generateDietPlan()`/`generateNoCookPlan()`, nunca
dentro — el generador (con su red de tests de caracterización) no cambia
de comportamiento por esto. Añade `meal.time`/`meal.timeMinutes` a los
objetos meal EXISTENTES (mutación in-place) y devuelve el array
reordenado cronológicamente; `js/app.js` usa ese array reordenado para
`renderMeals()`, la franja de horario, y `lastGeneratedMeals` — así la
hora fluye automáticamente a la lista de la compra (orden no importa ahí)
y a la despensa (si importa, y ahora si se registra). Aislado en
`safeInit()` como cualquier módulo opcional: si el cálculo de horario
fallara, el plan se sigue mostrando con normalidad, solo sin horario.

**UI — orgánica, no un rediseño**: badge de hora (mono, acento terracota)
en la cabecera de cada `meal-card`, más una franja "horario del día"
compacta arriba del todo en el panel de resultados (chips con hora +
nombre, resalta la próxima toma comparando contra la hora real del
dispositivo, clic salta a la tarjeta correspondiente). **Problema real
encontrado en la verificación en navegador, corregido en la misma
sesión**: en mobile, el formulario ocupa toda la pantalla antes de llegar
a esa franja (medido: ~1940px de scroll en un viewport de 375×812) — no
cumplía el propio requisito de "ver la próxima comida sin desplazarse
kilómetros". Se añadió una barra compacta `position: sticky` (SOLO
mobile, ≤640px — en desktop la franja ya está cerca de arriba) con
únicamente la próxima toma y su hora, fija bajo el borde superior del
viewport sin importar en qué parte de la página esté el usuario.
Reutiliza el mismo cálculo de "próxima comida" que la franja completa
(`findNextMealIndex()`, `js/core/meal-schedule.js`) — nunca lógica
duplicada.

**Preparado para recordatorios de cocina futuros, sin construirlos ahora**:
`getCookStartMinutes()/getCookStartTime()` restan `meal.prep` (ya
existente) a la hora de comer — expuesto en UI hoy solo como una nota
discreta ("Empieza a cocinar sobre las HH:MM") bajo la cabecera de la
tarjeta, cuando `prep >= 10 min` (evita ruido en platos casi listos). No
hay ninguna pantalla de recordatorios — deliberadamente fuera de alcance,
la arquitectura ya lo deja listo para añadir sin rediseñar nada.

**Edge cases verificados** (test + navegador real, ver "Tests" arriba):
3/4/5 tomas: el algoritmo no asume 5 fijas, funciona igual con el
generador principal (5) y "sin cocinar" (4); wake/sleep con turno de
noche (dormir "antes" que despertar en el reloj de 24h) envuelve
medianoche sin romperse; wake≈sleep o ventana <60 min cae a valores por
defecto en vez de un horario roto; ventana corta pero válida produce un
horario comprimido con una nota visible (`isScheduleCompact`), nunca
bloquea la generación; usuario nuevo sin tocar los campos obtiene 07:00/
23:00 por los `value` del HTML; **plan viejo del historial de despensa sin
`meal.time`** (guardado antes de esta función) renderiza sin badge de
hora, sin "undefined" visible, sin excepción; **`localStorage` con una
entrada v1 corrupta + JSON directamente inválido en ambas claves**
inyectados a mano — la app arranca, el formulario sigue funcionando, la
despensa se pinta vacía en vez de romperse (mismas 4 capas de defensa de
la sesión anterior, no debilitadas por esta función); regenerar el plan
varias veces seguidas no acumula estado raro; plan confirmado en la
despensa (`savePlanForToday`) persiste `meal.time` y se ve en el
historial.

**Verificación en navegador real**: generación de plan completo en
viewport desktop (800px) y mobile (375×812, con `resize_window`),
confirmando 0 errores de consola, orden cronológico correcto de las
tarjetas, badges de hora coincidiendo con la franja, franja resaltando la
toma correcta según la hora real del dispositivo, clic-para-saltar
funcionando, nota de horario comprimido apareciendo con una ventana
wake/sleep deliberadamente corta, modo "sin cocinar" con sus propios
badges (mismo cálculo, sin duplicar), y las 4 combinaciones de
`localStorage` (vacío/v1 viejo/JSON corrupto/v2 sin hora) sin romper el
arranque. **Limitación de entorno, no nueva**: el panel de navegador de
esta sesión tampoco compuso frames para `screenshot()` (mismo problema
documentado en sesiones anteriores, ver "Rediseño visual" arriba) —
verificación por DOM/`getComputedStyle`/`getBoundingClientRect`, no
captura de pantalla píxel a píxel.

**Archivos nuevos**: `js/core/meal-schedule.js` (lógica pura, sin DOM
salvo `readScheduleSettings()` con guarda `typeof document`),
`js/ui/render-schedule.js` (franja + barra sticky + badges reutilizables).
**Modificados**: `js/ui/render.js` (badge/nota en `meal-head`, atributo
`data-meal-key` en la tarjeta — esto también es lo que permite el
clic-para-saltar), `js/app.js` (wiring + orden de renderizado
cronológico), `js/ui/render-no-cook.js` (mismo cálculo reutilizado),
`js/core/pantry.js` (`savePlanForToday` guarda `meal.time`),
`js/ui/render-pantry.js` (badge de hora en el historial, con guarda),
`index.html` (2 campos nuevos, contenedor de franja, barra sticky),
`assets/css/style.css` (franja, badges, nota de cocina, barra sticky
mobile-only). **Tests**: `tests/meal-schedule.test.js` (nuevo, 36 tests)
+ `tests/run-tests.js` (registro). **No tocado**: `js/engine/dish-
selector.js`, `js/engine/plan-generator.js` (el generador en sí, cero
cambios de comportamiento — ver "Punto de integración" arriba).

## Presupuesto de compra (purchase budget) — 2026-08-08

Bug arquitectónico real reportado por el usuario, corregido de raíz (no un
parche `Math.min(purchaseCost, budget)` — eso habría sido mentir sobre el
número, no arreglar el problema).

**El bug**: `Presupuesto diario = 8€` podía producir un plan con
`usageCost=7.72€` (lo que el generador comprobaba) pero cuya compra REAL
(paquetes enteros de cada ingrediente, sin descontar despensa) costaba
`19€` — el usuario tenía que pagar más del doble de lo que había pedido,
y la app nunca se enteraba porque `data.budget` limitaba usageCost en
TODO el pipeline (selección de plato, recorte, verificación); purchaseCost
solo se calculaba DESPUÉS, ya en la lista de la compra, demasiado tarde
para influir en nada.

**Investigación previa**: se leyó `pricing.js` (ya distinguía usageCost/
purchaseCost por ingrediente, `resolvePurchaseCost`), `pantry.js` (ya
tenía `resolvePurchaseCostWithPantry`, consciente de despensa),
`dish-selector.js`/`plan-generator.js` (la cascada de selección de plato Y
el recorte de presupuesto (`enforceBudgetCap`) solo miraban `item.cost`,
usageCost puro, en NINGÚN punto agregaban por ingrediente entre comidas ni
consultaban despensa) y `render-shopping-list.js` (SÍ hacía la agregación
+ paquetes + despensa correctamente, pero solo para pintar la lista, ya
con el plan cerrado — de ahí la divergencia).

**Modelo elegido**: `data.budget` pasa a significar coste de COMPRA
(purchaseCost), no de uso. Dos capas, no una reescritura completa del
generador:

1. **Capa A (sin cambios)** — la cascada de selección de plato por toma
   (`pickDish`, `dish-selector.js`) sigue usando usageCost como heurística
   para ir construyendo un candidato plato a plato — usageCost y
   purchaseCost están correlacionados, y hacer que la cascada conociera el
   empaquetado agregado de TODO el día en cada paso intermedio sería un
   problema combinatorio mucho más caro sin necesidad real (no se sabe qué
   más va a compartir paquete con qué hasta tener el día completo).
2. **Capa B (nueva, autoritativa)** — una vez el plan candidato del día
   está construido, se calcula el purchaseCost AGREGADO real
   (`computeDayPurchaseCost`, nuevo `js/core/budget.js`, consciente de
   despensa) y ESE es el número que de verdad se hace cumplir
   (`enforcePurchaseBudgetCap`, sustituye al antiguo `enforceBudgetCap`
   basado en usageCost), se usa en `scorePlan()` para comparar candidatos
   entre tiers de relajación, y se reporta como violación `type:'budget'`
   en `verifyPlanFeasibility()`. Si ni recortando al máximo el purchaseCost
   real entra en el presupuesto, se reporta honestamente como inviable —
   nunca se falsea el número.

**`js/core/budget.js` (nuevo)** — capa compartida deliberada, por encima
de `pricing.js`/`pantry.js` (que siguen siendo agnósticos de "plan"/
"toma", igual que antes): `aggregateMealItems(meals)` (agregación
canónica, sustituye a la que antes vivía duplicada en
`render-shopping-list.js`) y `computeDayPurchaseCost(meals, storeId,
pantryState)`. **Usado tanto por `plan-generator.js` como por
`render-shopping-list.js`** — mismo cálculo exacto en los dos sitios,
nunca dos números que puedan divergir (ver test #8 de
`budget-purchase.test.js`, que lo comprueba directamente).

**`enforcePurchaseBudgetCap`** (plan-generator.js) — recorta el plan
hasta que el purchaseCost agregado real quepa en presupuesto. A
diferencia del recorte antiguo (que miraba `item.cost`, usageCost por
ítem suelto), cada recorte se evalúa RECALCULANDO `computeDayPurchaseCost`
desde cero — nunca se asume ni se estima cuánto "debería" bajar. Esto es
importante porque el coste de compra es no-lineal (quitar 10g a un
ingrediente cuyo envase sigue haciendo falta comprar entero no ahorra
nada de verdad); el bucle greedy (peor relación proteína/coste-de-compra
primero, recalcular, repetir) no es óptimo en el sentido de bin-packing,
pero es SIEMPRE correcto porque nunca miente sobre el número real —
documentado como limitación conocida y aceptada en el propio código.

**Pantry ahora afecta la generación del plan** — antes, `dish-selector.js`
/`plan-generator.js` no sabían nada de despensa (decisión de arquitectura
deliberada de la sesión de Despensa, ver arriba). Esto seguía siendo
cierto para la SELECCIÓN de plato (Capa A, sin cambios), pero ahora
`generateDietPlanTiered()` lee `getPantryState()` UNA vez por generación
(null si `pantry.js` no está cargado) y la pasa a
`enforcePurchaseBudgetCap`/`computeDayPurchaseCost` — así un plan que sin
despensa sería inviable puede volverse asequible gracias a lo que ya
tienes en casa, exactamente el requisito pedido.

**Presets recalibrados** (`js/data/budget-presets.js`): los antiguos
(Ajustado 5€/Equilibrado 8€/Amplio 12€) se calibraron en 2026-08-03 contra
percentiles de usageCost de catálogo sin escalar — con el cambio de
semántica se quedaron sin sentido de la noche a la mañana (8€ de
purchaseCost es una cifra muy distinta a 8€ de usageCost). Recalibrados
generando 120 planes reales (6 perfiles corte/recomp/volumen × 20
combinaciones tiempo/sabor, despensa vacía, presupuesto deliberadamente
generoso de 50€ para medir el purchaseCost "natural" sin recorte) y
tomando percentiles del purchaseCost real resultante: P10=14.65→**15**
(Ajustado), P50=20.41→**20** (Equilibrado), P85=27.06→**28** (Amplio).
Verificado generando 48 planes por preset: 0 violaciones de presupuesto
en los tres, nunca `status:'unavailable'`, distribución de status
perfect/adjusted/minimal similar en forma a la calibración original.

**UX**: "Notas del plan" y la lista de la compra ahora distinguen
explícitamente presupuesto (compra) de consumo (uso) —
`"Presupuesto diario: €8. Compra necesaria: €6.82 (margen: €1.18).
Consumo real de ingredientes: €4.28."` — nunca se esconde purchaseCost,
nunca se presenta usageCost como si fuera el presupuesto.

**Verificado en vivo en navegador**: se reprodujo el escenario exacto del
bug original (budget=8€ personalizado) y se confirmó que ya no ocurre —
"Compra necesaria" quedó en €6.82, dentro de presupuesto, con "Consumo
real" (€4.28) mostrado aparte. Se verificó el efecto de la despensa
EN VIVO: añadir 500g de un ingrediente del plan (Tofu firme, que ya
necesitaba comprarse en 1 paquete) a la despensa manual bajó "Coste de
compra" de €6.82 a €5.64 (exactamente el precio de ese paquete) sin
tocar "Coste de uso" (se mantuvo en €4.28) — la fila de ese ingrediente en
la lista de la compra pasó a "Ya tienes suficiente en tu despensa, €0". Se
completó el ciclo real: "Usar este plan hoy" → "Marcar compra como hecha"
(el run de compra registrado coincidió exactamente con lo mostrado en
pantalla: purchaseCost=€5.64, usageCost=€4.28, tofu con
`coveredFromPantry=225, purchasedGrams=0` — no se compró de más) →
"Marcar como cocinado" en la cena (restó exactamente los gramos
requeridos de tofu y pasta del stock). Verificado en mobile (375px) y
desktop, 0 errores de consola reales (solo un aviso inocuo de GSAP
provocado por la técnica de recarga usada en esta sesión de verificación,
no un problema de la aplicación).

**Bug de CSS encontrado de paso, corregido** (no relacionado con el
presupuesto — de la sesión anterior, horario de comidas): la barra sticky
"próxima comida" (`.next-meal-sticky`, mobile-only) usaba `margin: 0 -8%`
para compensar el padding lateral de `.container` (`width:92%`), pero el
margen real a cancelar es 4% por lado (8% total, repartido), no 8% por
lado — el valor doblado sacaba la barra fuera del viewport por los dos
lados, un overflow horizontal real de ~13px detectado verificando en
375px. Corregido a `margin: 0 -4%`.

**Archivos nuevos**: `js/core/budget.js`, `tests/budget-purchase.test.js`.
**Modificados**: `js/engine/plan-generator.js` (rediseño del presupuesto,
ver arriba — `dish-selector.js` NO se tocó), `js/ui/render-shopping-list.js`
(delega en budget.js), `js/ui/render-insights.js` (copy + umbral de aviso
de presupuesto bajo recalibrado), `js/data/budget-presets.js`
(recalibrado), `index.html` (script tag de budget.js, placeholder del
campo de presupuesto exacto), `js/app.js` (valor de ejemplo del botón
"alto en proteína"), `assets/css/style.css` (fix del margen de la barra
sticky), `tests/budget-mode.test.js`/`tests/plan-generator.
characterization.test.js`/`tests/shopping-cost.test.js`/`tests/
pantry.test.js` (sandboxes con budget.js, aserciones actualizadas a
purchaseCost, golden-master recapturado). **No tocado**:
`js/engine/dish-selector.js` (la cascada de selección, Capa A, sigue
exactamente igual), `js/core/pantry.js` (ya tenía todo lo necesario,
`resolvePurchaseCostWithPantry`/`getPantryState`, sin cambios).

## Exploración descartada: Google AI Studio para el rediseño (2026-08-04)

Antes de implementar el rediseño v2 directamente, se probó pedirle a
Gemini (vía Google AI Studio, "Build") que lo hiciera, controlando el
navegador por API. **No llegó a producción** — ni un solo cambio de
AI Studio se copió al proyecto real; todo el CSS que sí está en
producción lo escribió Claude directamente sobre `assets/css/style.css`.
Motivos por los que se abandonó, por si se reintenta en el futuro:
(1) AI Studio convierte cualquier proyecto subido en un scaffold
React/Vite, incompatible con la arquitectura vainilla-JS real de este
repo — solo sirve como referencia visual/de paleta, nunca para traer
código de vuelta directamente; (2) el servicio tuvo una racha de fallos
internos (~6 de cada 6 reintentos fallaban en varios tramos de la
sesión), independiente del contenido del prompt (se verificó con un chat
completamente nuevo y un prompt limpio, mismo resultado); (3) en un envío
se detectó texto en inglés contradictorio añadido automáticamente al
final del prompt enviado (pidiendo MÁS saturación cuando se había pedido
lo contrario) — el origen exacto no se determinó, posiblemente una
sugerencia de la propia interfaz de AI Studio. No es una vía fiable hoy
para tocar código de producción de este proyecto.

## Critical known issues (estado a 2026-08-07)

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
6. ~~**Current branding is misleading.**~~ **RESOLVED** (sesión 2026-08-03,
   ver "Rediseño visual" arriba) — el producto ya no se presenta como
   "AI"/"Chef Mode".
7. **`packaging.js` tiene un hueco de cobertura real: 25 de 81 ingredient
   roles sin envase fijo conocido.** Encontrado y medido en Fase 0
   (2026-08-04, ver arriba) con un test real, no un script suelto. ~10-11
   son carne/pescado fresco (correcto por diseño), el resto (fruta por
   unidad, pan, congelados) probablemente no. **Sin corregir** — y, dada
   la Estrategia B de migración (ver arriba), probablemente no vale la
   pena corregirlo a mano: cada ingrediente que se resuelva contra un
   producto real en Fase 1 trae su propio tamaño de envase y hace
   irrelevante su entrada en `packaging.js`.
8. **Interacción sutil entre `enforce25PercentRule` y el recorte de
   presupuesto en `plan-generator.js`.** El recorte de presupuesto
   (`enforcePurchaseBudgetCap` desde 2026-08-08 — antes `enforceBudgetCap`,
   mismo problema, ver sección "Presupuesto de compra" más abajo) corre
   DESPUÉS de la última comprobación del cap del 25% y solo recorta ítems
   — puede bajar el coste total sin tocar un ítem grande, dejando su %
   sobre el total FINAL por encima del cap del tier sin que se vuelva a
   recortar. No es un fallo silencioso: `verifyPlanFeasibility()` sí lo
   detecta de forma consistente (verificado con 500 corridas) y lo añade a
   `report.violations` como `{type:'cap25', ...}` — pero el propio
   generador nunca vuelve a intentar corregirlo. Caracterizado con un
   test (`plan-generator.characterization.test.js`), no corregido — es
   exactamente el tipo de cosa que la Fase 2 del roadmap de migración
   debería resolver al rediseñar el motor, no algo para parchear ahora.
9. **La Despensa (2026-08-06/07) vive solo en `localStorage` de un
   navegador, sin sincronización entre dispositivos, y no está conectada
   a `dish-selector.js` (no influye en qué platos se eligen, solo en
   cuánto hay que comprar) ni al modo "sin cocinar".** Ambas son
   decisiones de arquitectura deliberadas, no descuidos — ver sección
   Despensa arriba para el razonamiento completo. No es un "bug", pero
   cualquiera que asuma sincronización multi-dispositivo o que el
   presupuesto del generador ya cuenta con lo que tienes en casa se
   equivoca.

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
- Grafo de Graphify del frontend **regenerado 2026-08-07** (294 nodes/454
  edges/31 communities, incluye ya `pantry.js`/`render-pantry.js`/`poc/`/
  `tests/`) — ver `PythonProject/docs/graphify.md`. Se desactualiza de
  nuevo en cuanto se toque código sin volver a correr `graphify update .`
  + `graphify cluster-only .` (frontend) + `graphify merge-graphs`
  (PythonProject) — no se actualiza solo.

## Required architectural decisions before implementation (sin cambios esta sesión)

1. Select and document food-data source, licensing, regional coverage, and update owner.
2. Define measurable tolerances and precedence when constraints conflict.
3. Define medical/safety boundary, target audience, and human-expert review process.
4. Choose a typed modular-monolith baseline: web app, API boundary, relational data store, shared domain package.
5. Decide whether AI is an optional explanation/tool-orchestration layer rather than the calculation engine.

## Próximos pasos sugeridos (no iniciados)

- **Recomendado como siguiente paso real** (ver Fase 1 en `ROADMAP.md`):
  ampliar la cobertura de resolución ingrediente→producto real más allá
  del 50/81 actual (61.7%) — es la base de todo lo demás en la Estrategia
  B. Del lado Python: revisar los 2.467 productos sin nutrición
  priorizando categorías proteicas, y crear el script de exportación de
  `real-products.js` que hoy no existe (ver `PythonProject/docs/
  data_flow.md`).
- Verificar visualmente en un navegador real (no este entorno — ver
  limitación de verificación repetida en varias secciones de arriba) el
  rediseño v2 y el layout mobile — ambos verificados por código/DOM, no
  por captura de pantalla.
- Decidir si merece la pena corregir el hueco de cobertura de
  `packaging.js` (known issue #7) a mano, o esperar a que la migración de
  Fase 1 lo haga irrelevante ingrediente a ingrediente.
- Re-auditar la consistencia macro-energética (known issue #1) sobre los
  334 platos actuales — **nota 2026-08-04**: esto puede volverse
  irrelevante en cuanto la Fase 1-2 de la migración reemplace macros
  fabricadas por macros reales; no priorizar sobre la migración misma.
- Arreglar el reporte de `mainProt` (known issue #5) — sigue sin tocar.
- Corregir el bug de nombre `"Lechuga: Pepino"` en `dishes.js` (separar en
  dos ingredientes) — encontrado en la auditoría de `poc/` (2026-08-03),
  **sigue sin corregir**.
- Conectar la Despensa al modo "sin cocinar" — requiere diseñar antes un
  modelo de "cuánto se consumió" para esos items (hoy solo tienen
  `quantity: 1` de producto entero), ver known issue #9.
- Considerar (fase futura, más riesgo, no empezada) hacer
  `dish-selector.js` consciente de despensa, para que el algoritmo
  prefiera activamente ingredientes ya en casa — ver sección Despensa
  arriba, "alcance explícitamente fuera".
- Mostrar al usuario, en algún sitio visible, si `savePantryState`/
  `savePantryHistory` fallan (cuota de `localStorage` superada, modo
  privado) — hoy solo se ve en el aviso posterior a "Usar este plan hoy",
  no en las acciones de comprar/cocinar del historial.

## Session handoff (2026-08-08)

Escrito para que la siguiente sesión/chat pueda continuar sin haber visto
esta conversación. No repite lo de arriba en detalle — apunta a la
sección correspondiente. **Para orientarse en el código en sí, antes de
leer archivo por archivo, usa el grafo de Graphify** (regenerado al
final de esta sesión — 348 nodes/554 edges/34 communities, incluye ya
`budget.js`/`meal-schedule.js`/`render-schedule.js` y los tests nuevos —
`graphify explain "<símbolo>"` / `graphify query "<pregunta>"` desde esta
carpeta, ver `PythonProject/docs/graphify.md`). **Si se toca código
después de esto, el grafo vuelve a desactualizarse** — no se actualiza
solo; comprobar "Built from commit" en `graphify-out/GRAPH_REPORT.md`
contra `git log -1` antes de fiarse, y regenerar con `graphify update .
--no-cluster && graphify cluster-only .` si hace falta.

**Estado del proyecto**: prototipo funcional, motor basado en `dishes.js`
(datos fabricados por asignación de masa para macros, precio/coste de
compra reales), con una red de tests (126, ver "Tests" arriba), un
rediseño visual v2 + layout mobile, una **Despensa completa** (3 etapas),
un **horario de comidas completo** (hora por toma, orden cronológico), y
desde esta sesión un **presupuesto que significa dinero de COMPRA, no de
uso** (ver "Presupuesto de compra (purchase budget)" arriba) — el bug
real donde un plan de "8€" podía costar 19€ reales en caja ya no puede
ocurrir; la despensa ahora afecta si un plan es asequible.

**Commit/branch/deploy actuales**: ver `git log -1` y la cabecera de este
archivo — el commit `ef1191ae` ("Add pantry (despensa) feature...") sobre
`main` sigue siendo el último publicado en `origin`
(`github.com/andreyostrik228/OfflineNutritionHelper`, GitHub Pages en
`https://andreyostrik228.github.io/OfflineNutritionHelper/`). **NINGÚN
trabajo desde entonces está comiteado** — ni el horario de comidas
(2026-08-07) ni el presupuesto de compra (2026-08-08): son cambios
locales acumulados sin commitear (`git status` lista los archivos
modificados/nuevos exactos). No asumas que algo de esto está en
`main`/publicado sin comprobar `git log`/`git status` primero. Si
`git log -1` muestra un commit distinto a `ef1191ae`, alguien comiteó
desde entonces — revisar antes de asumir que esta foto sigue vigente.
**Nota**: sigue habiendo basura suelta sin relación en la raíz del repo
(preexistente, nunca comiteada a propósito) — no tocarla sin que se pida.

**Qué funciona**: generación de plan completo (5 tomas, horario, macros)
con presupuesto de COMPRA real (consciente de despensa, recorta hasta
caber o reporta inviabilidad honesta), lista de la compra trazable al
mismo número que usó el generador, modo "sin cocinar" (con horario, sin
presupuesto — nunca tuvo lógica de coste), catálogo de productos, la
Despensa completa (comprar → cocinar por comida → deshacer, ahora también
influye en qué planes son asequibles), los 126 tests.

**Qué NO funciona / sigue pendiente**: macros de ingrediente siguen
fabricadas (known issue #2, el problema central que la migración de
`ROADMAP.md` ataca); `mainProt` mal reportado (issue #5); hueco de
cobertura en `packaging.js` (issue #7); interacción cap25/recorte de
presupuesto sin corregir (issue #8, mismo problema de siempre, ahora en
`enforcePurchaseBudgetCap` en vez de `enforceBudgetCap`); Despensa sigue
sin influir en la SELECCIÓN de plato (Capa A, `dish-selector.js` —
decisión deliberada, ver sección "Presupuesto de compra"); no hay
recordatorios de cocina separados (arquitectura lista desde el horario de
comidas, UI no construida a propósito); **bug de CSS nuevo encontrado y
delegado, no corregido en esta sesión**: `.actions` (fila de botones del
formulario) desborda el viewport ~10px en mobile (375px) — tarea de
seguimiento creada (`task_089a68aa`), no relacionado con el presupuesto.

**Qué se cambió esta sesión (2026-08-08, presupuesto de compra)**: ver la
sección dedicada arriba para el detalle completo (modelo, por qué,
archivos, recalibración de presets, edge cases). Resumen de archivos:
nuevo `js/core/budget.js`, `tests/budget-purchase.test.js`; modificados
`js/engine/plan-generator.js` (rediseño del presupuesto), `js/ui/
render-shopping-list.js` (delega en budget.js), `js/ui/render-insights.js`
(copy), `js/data/budget-presets.js` (recalibrado 5/8/12→15/20/28),
`index.html`, `js/app.js`, `assets/css/style.css` (fix del margen de la
barra sticky, bug de la sesión anterior), y los 4 archivos de test que ya
tocaban plan-generator.js/render-shopping-list.js (sandboxes + golden-
master recapturado). `js/engine/dish-selector.js` y `js/core/pantry.js`
NO se tocaron. Documentación: este archivo. `PROJECT.md`/`ROADMAP.md`
actualizados en la misma pasada. Ningún cambio en `PythonProject`, ni en
`poc/`.

**Qué se verificó y qué no**: los 126 tests se re-ejecutaron y pasan
(verificado, no heredado) — 12 nuevos de `budget-purchase.test.js`, 2
golden-master recapturados, sin regresión en los 112 restantes. El
presupuesto de compra se verificó EN VIVO reproduciendo el bug exacto
reportado (budget=8€ personalizado) y confirmando que "Compra necesaria"
queda dentro de presupuesto con "Consumo real" mostrado aparte; el efecto
de la despensa se verificó EN VIVO añadiendo stock manual a un ingrediente
del plan y viendo "Coste de compra" bajar exactamente el precio del
paquete sin tocar "Coste de uso"; el ciclo completo "Usar plan hoy" →
"Marcar compra como hecha" → "Marcar como cocinado" se verificó EN VIVO
con lectura directa de `localStorage` confirmando que los números
coinciden exactamente con lo mostrado en pantalla. Verificado en mobile
(375×812) y desktop, 0 errores de consola reales. **Nota técnica de la
verificación**: mismo problema de caché HTTP persistente del navegador de
sesiones anteriores (ver sección de horario de comidas) — se resolvió
igual, recargando con `fetch(...,{cache:'no-store'})` + reescritura de
las URLs de script/link con un parámetro único; además, `document.write`
sobre un documento ya cargado en emulación mobile deja
`document.documentElement.clientWidth`/`window.innerWidth` inconsistentes
con el tamaño real del viewport hasta que se reaplica `resize_window` —
detectado comparando contra `window.visualViewport.width` (que sí era
correcto todo el tiempo), y resuelto reaplicando `resize_window` después
de cada recarga antes de medir layout. Ninguno de los dos es un bug de la
aplicación. El rediseño visual v2/mobile (sesión 2026-08-04) sigue sin
verificación por captura de píxeles — mismo problema de compositing del
panel de navegador que todas las sesiones anteriores.

**Decisiones de arquitectura que no hay que perder**: la comparación
completa de Estrategia A/B/C y por qué se eligió B está en `ROADMAP.md`
— no la repitas de memoria ni la reabras sin releer esa sección primero.
La distinción usageCost/purchaseCost/budget (ahora budget=purchaseCost,
no usageCost) está fijada en las cabeceras de `js/core/pricing.js`,
`js/core/budget.js` y `js/engine/plan-generator.js` — no la reinventes,
léela primero si vas a tocar precios/presupuesto.

**Prioridad actual**: sigue siendo Fase 1 del roadmap de migración
(ampliar cobertura de datos reales, ver `ROADMAP.md`), que no ha avanzado
en ninguna de las últimas 3 sesiones (Despensa, horario, presupuesto —
todas ortogonales a la migración de datos). Si se sigue trabajando sobre
lo que ya existe: el bug de CSS de `.actions` en mobile queda pendiente
(`task_089a68aa`); hacer `dish-selector.js` consciente de despensa (para
que la SELECCIÓN de plato, no solo el recorte final, prefiera activamente
ingredientes ya en casa) sigue siendo la fase de más riesgo,
deliberadamente aplazada — no empezarla sin discutirlo primero.

**Qué no romper**: los `id="..."` del HTML; `data.budget` ahora es
purchaseCost, no usageCost — cualquier código nuevo que lea `data.budget`
esperando usageCost está usando el número equivocado; `enforcePurchaseBudgetCap`
reemplazó a `enforceBudgetCap` (ya no existe, no restaurarlo);
`js/core/budget.js` es la ÚNICA fuente de verdad para agregación +
purchaseCost del día — no reimplementar esa lógica en otro sitio; los 126
tests deben seguir pasando después de cualquier cambio en `js/core/`,
`js/engine/`, `js/ui/`, o `assets/css/style.css`. Específico de la
Despensa: `applyPlanToPantry()` y `markHistoryEntryCooked()` **ya no
existen** (v1→v2); el orden de arranque en `js/app.js` y `safeInit()` son
intencionales — no revertir a un solo bloque `DOMContentLoaded` sin
aislamiento.

Lee `PROJECT.md` y `ROADMAP.md` además de este archivo. Para el sistema
completo (con el pipeline Python), lee también `PythonProject/docs/
architecture.md` y `PythonProject/docs/data_flow.md`. No asumas que el
estado descrito aquí sigue siendo exacto sin verificar contra el código —
esto es una foto fija a 2026-08-08.
