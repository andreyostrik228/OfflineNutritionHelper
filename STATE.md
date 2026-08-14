# Nutrition Planner — Engineering State

Actualizado 2026-08-14. Lee esto junto con `PROJECT.md` y `ROADMAP.md` antes
de empezar una sesión nueva (ver "Session handoff" al final — reemplaza al
antiguo "Continuation checklist"). Para el sistema completo (este repo + el
pipeline Python en `PythonProject`), ver `PythonProject/docs/architecture.md`
y `PythonProject/docs/data_flow.md` (Python no se ha tocado desde
2026-08-03; todo el trabajo desde entonces, incluida esta sesión, es
exclusivamente en este repo).

**Para orientarse rápido sin leer todo este archivo**: hay un grafo de
código real (Graphify) regenerado el 2026-08-13 (377 nodes, 609 edges, 39
communities — incluye ya `js/core/nutrition.js`/`js/data/
ingredient-nutrition.js` y `tests/ingredient-nutrition.test.js`) —
`graphify explain "<símbolo>"`, `graphify query "<pregunta>"`, `graphify
god-nodes --top 8` desde esta carpeta. Ver `PythonProject/docs/
graphify.md` para el manual completo (comandos, qué es un node/edge/
community, cómo regenerarlo tras tocar código). Complementa, no
sustituye, la lectura de este archivo — el grafo da estructura (quién
llama a quién), no las decisiones de producto ni el "por qué" que solo
está aquí y en `ROADMAP.md`. **Si vuelves a tocar código, el grafo se
desactualiza de nuevo** — no se actualiza solo (comandos exactos en
`PythonProject/docs/graphify.md`, sección "Cómo actualizarlo").

**Resumen de la sesión 2026-08-14b (rediseño de UX de la Despensa — SIN
tocar `js/core/pantry.js` ni ninguna regla de negocio)**: pedido explícito
del usuario, incluido él mismo como autor original: "даже я иногда не
понимаю логику интерфейса". La versión anterior mezclaba en una sola
lista plana tres ideas distintas — (1) el stock actual, (2) el historial
COMPLETO de cada plan confirmado (hasta 30), y (3) dentro de cada uno,
dos sub-etapas técnicas (checklist de compra + un botón "Marcar como
cocinado" por cada una de las 5 comidas) siempre expandidas — exponiendo
directamente los 3 estados internos de la máquina de `pantry.js` en vez
de "lo que tengo en casa". Rediseñado (ver sección dedicada más abajo)
en 3 bloques con roles claros: stock editable in-situ (tap → número
exacto, ya no pasos ciegos de ±50g), planes con algo pendiente (acción
de compra reducida a un botón por defecto, checklist tras "¿Te faltó
algo?"), e historial completado que se colapsa solo en cuanto se termina
de cocinar. Alta manual: `<input list>` con datalist en vez de un
`<select>` de 81 opciones, con resolución/validación del nombre tecleado
contra `normalizeIngredientKey` (nunca crea una clave huérfana). Cero
cambios en `js/core/pantry.js`, `js/core/budget.js`,
`js/ui/render-shopping-list.js`, ni en el modelo financiero —
confirmado en vivo que purchaseCost/la lista de la compra/"Confirmar y
usar este plan hoy"/la sincronización con la nube de un usuario
autenticado siguen exactamente igual. Los 246 tests (ninguno toca
render-pantry.js, es capa de presentación pura) siguen en verde.
**Sin commitear a la hora de escribir esto** — ver "Session handoff".

**Resumen de la sesión 2026-08-14a (aprovisionamiento real de Supabase +
Google OAuth — el sistema de cuentas pasa de "código listo" a "funcionando
de verdad en producción")**: la sesión 2026-08-13f dejó todo el código,
esquema y tests listos pero inertes (sin proyecto Supabase real, modo
invitado forzado). En esta sesión el usuario aprovisionó su propio
proyecto Supabase y cliente OAuth de Google (los dos únicos pasos que
requerían su cuenta, ninguno automatizable) y me pasó las credenciales
públicas; yo hice todo lo demás. Verificado en vivo contra el backend
real (no solo unit tests, no solo UI — llamadas REST directas con tokens
de sesión reales, exactamente como pidió el usuario): esquema aplicado
(`user_data` existe, RLS bloquea lectura anónima devolviendo `[]`, no un
error), registro real por email+contraseña con sesión inmediata, el
trigger `handle_new_user` crea la fila automáticamente, recarga de
página mantiene la sesión, un "dispositivo nuevo" simulado (localStorage
vaciado por completo, incluida la sesión) recupera settings+despensa
exactos desde la nube al volver a iniciar sesión, logout vacía la caché
local y welcomes de vuelta en modo invitado limpio, la migración
invitado→cuenta ocurre automáticamente en el primer login (rama 'push'),
volver a reconciliar sin cambios es un no-op real (rama 'already_synced',
sin duplicar nada), y el conflicto (datos locales Y datos de nube a la
vez, navegador nuevo) abre el diálogo y la fusión ("combinar") suma
gramos de despensa y dejó local Y nube idénticos. **Aislamiento entre
usuarios probado atacando la API directamente, no solo mirando la UI**:
con el token de sesión real del Usuario B, un intento de `PATCH` sobre
la fila del Usuario A devolvió `200` pero **0 filas afectadas** —
confirmado releyendo los datos del Usuario A después, intactos. Google
OAuth: el flujo completo `signInWithOAuth` → `Supabase /authorize` →
Google `accounts.google.com` se siguió de verdad (sin credenciales,
nunca se rellenó ningún formulario de login) y Google aceptó la petición
con el `client_id`/`redirect_uri` correctos, sin `invalid_client` ni
`redirect_uri_mismatch` — verificado hasta el único punto que
físicamente requiere que un humano introduzca sus credenciales de Google,
que no hice ni debía hacer. Regresión completa: 246 tests siguen en
verde, generación de plan/despensa (comprar→cocinar)/sin-cocinar/mobile
sin cambios de comportamiento. Commiteado (`f66bfac`), pusheado, y
desplegado a producción — verificado en el propio
`https://offline-nutrition-helper.pages.dev` con el mismo usuario de
prueba recuperando los mismos datos que en local, confirmando que
producción habla con el mismo backend real. Ver sección dedicada
"Aprovisionamiento real de Supabase + Google OAuth — 2026-08-14a" más
abajo para el detalle completo, y "Session handoff (2026-08-14a)" para
el estado acumulado.

**Resumen de la sesión 2026-08-13f (sistema de cuentas — Supabase Auth +
Postgres + RLS)** (ver sección dedicada más abajo, "Sistema de cuentas
(accounts) — Supabase", para el detalle completo): pedido explícito del
usuario — convertir el sitio de invitado-solo (localStorage) a una app
multiusuario real con registro/login por email+contraseña, login con
Google, sesión persistente entre recargas, y TODOS los datos personales
(despensa, historial de planes, y el perfil/formulario — antes NUNCA
persistido, ni siquiera en localStorage) sincronizados a una cuenta y
accesibles desde cualquier dispositivo, sin romper el modo invitado ni
reescribir el motor de nutrición. Arquitectura elegida: Supabase (Auth +
Google OAuth + Postgres + Row Level Security, SDK vía CDN sin build
system, mismo patrón que GSAP) sobre un modelo "local-first/optimista" —
localStorage sigue siendo la fuente de verdad SÍNCRONA que
`pantry.js`/`render-pantry.js`/`calculator.js`/`meal-schedule.js` ya
usaban, sin ningún cambio en esos archivos; una capa nueva y
completamente separada (`js/core/{supabase-client,settings,auth,
cloud-sync,migration}.js` + `js/ui/render-auth.js`) hidrata localStorage
desde la nube al iniciar sesión y empuja cada mutación en segundo plano,
enganchada en los puntos de extensión que `app.js` ya exponía
(`onPantryChange`) más un par de puntos nuevos. Migración
invitado→cuenta idempotente y a salvo de un peligro real que un guardián
ingenuo no cubre (un ordenador compartido entre dos personas) — ver
sección dedicada para el algoritmo exacto. 66 tests nuevos (223 tests
totales en `tests/`, 0 fallidos; 23 sin cambios en `poc/tests/`).
Verificado en vivo en navegador (desktop y mobile) en modo invitado (el
único modo posible hasta que el usuario aprovisione un proyecto Supabase
real — ver checklist de aprovisionamiento en la sección dedicada): 0
errores de consola, generación de plan/despensa/sin-cocinar sin
regresión, botón de perfil y diálogo de acceso funcionando
correctamente, ajustes del formulario ahora persisten entre recargas
(funcionalidad nueva). **No commiteado/pusheado ni desplegado a
producción todavía a la hora de escribir esto** — ver "Session handoff".

**Resumen de la sesión 2026-08-13e (auditoría del "recorte a cero" +
corrección de consistencia Atwater)** (ver sección dedicada más abajo,
"Auditoría del recorte a cero y corrección de consistencia Atwater", para
el detalle completo): pedido explícito del usuario tras el rediseño
2026-08-13d — investigar CON EJEMPLOS CONCRETOS por qué 45-105/334 platos
tienen macros resueltos que superan el `dish.total` antiguo, antes de
tocar nada. Conclusión de la investigación: el modelo de remanente
(`total = max(sumaReal, estimaciónAntigua)` por construcción matemática)
es correcto y no hace falta cambiarlo — los casos investigados (172/334
platos con al menos un macro afectado) son mayoritariamente ruido de
redondeo de una estimación manual antigua, y los peores casos (conservas
en aceite, frutos secos, pechuga de pavo) confirman que los datos reales
CORRIGEN infravaloraciones sistemáticas de `dishes.js` — exactamente el
propósito de la migración. La investigación sí encontró un bug real
DISTINTO por el mismo mecanismo: kcal se clampaba de forma independiente
a protein/carbs/fat, produciendo filas `'estimated'` internamente
inconsistentes (ej. "Mermelada light" con 11.5g de carbohidratos pero
0kcal — medido en 99 filas de las 334 recetas). Corregido: kcal de un
ingrediente sin resolver ya NO tiene su propio remanente anclado a
`dish.kcal` — se DERIVA por Atwater (protein×4+carbs×4+fat×9) de su
propio remanente ya calculado, garantizando consistencia interna siempre
y dejando de depender del campo menos fiable del dataset (`dish.kcal`,
known issue #1). 4 tests nuevos + 1 test existente corregido, 2
golden-master recapturados (kcal total sube, más preciso), 157 tests
totales, 0 fallidos. Verificado en vivo en navegador: el caso real de la
mermelada ya no muestra 0kcal; despensa/purchaseCost/no-cook/lista de la
compra sin regresión (nada de esto se tocó, solo `js/core/nutrition.js`).

**Resumen de la sesión 2026-08-13d (rediseño ARQUITECTÓNICO del modelo de
nutrición — kcal/protein/carbs/fat reales por ingrediente, no reparto del
plato)** (ver sección dedicada más abajo, "Rediseño del modelo de
nutrición por ingrediente", para el detalle completo): la sesión anterior
(2026-08-13c) había MITIGADO el bug de macros fabricados ocultando el
desglose P/C/G por ingrediente en la UI, dejando el problema de fondo
como known issue #2 (ya documentado desde 2026-07-18). El usuario pidió
explícitamente resolverlo de raíz, no solo ocultarlo: "не пытайся
сохранить старую логику ради прохождения golden-master тестов". Se
promovió a producción la auditoría YA HECHA en `poc/data/
ingredient-rules-full.js` (50/81 ingredient roles con nutrición real
verificada contra `js/data/real-products.js`, curada a mano, con test de
consistencia propio) como `js/data/ingredient-nutrition.js`, y un nuevo
`js/core/nutrition.js` (`computeDishIngredientNutrition`) que da macros
REALES a los ingredientes resueltos y reparte el REMANENTE del plato
(nunca el total bruto) solo entre los ingredientes sin resolver — nunca
diluye el dato real de un ingrediente con el de su vecino. `dish-
selector.js` (`buildMealFromDish`) reescrito para usar esto. UI: el
desglose P/C/G por ingrediente vuelve a mostrarse, pero SOLO cuando es
real (`item.nutritionSource==='real'`); si no, muestra un aviso explícito
en vez de un número. 15 tests nuevos (incluida la regresión EXACTA
Cacahuetes+Plátano y Pollo+Arroz que pidió el usuario), 2 golden-master
recapturados a propósito, 154 tests totales, 0 fallidos. Verificado en
vivo en navegador: el ejemplo original reportado por el usuario ya no
reproduce (Plátano pasa de 11.5g de proteína fabricada a un aviso
explícito de "no verificado"; Cacahuetes muestra su proteína real sin
diluir). despensa/purchase-cost budget/shopping list/no-cook/meal
schedule verificados sin regresión.

**Resumen de la sesión 2026-08-13c (bug real de precio + macros por
ingrediente falsos, reportado por el usuario)** (ver sección dedicada más
abajo, "Corrección de precio y macros por ingrediente", para el detalle
completo): el usuario encontró una tarjeta de comida real mostrando
Plátano con 11.5g de proteína/13.8g de grasa (imposible) y un "coste de
uso" (€0.17) mayor que el "precio de paquete" mostrado (€0.14, también
imposible). Auditoría completa con diagnóstico real (dish record en
crudo, valores escalados, valores finales) confirmó DOS bugs distintos:
(1) `render.js` (introducido en la sesión 2026-08-13b de este mismo día)
mostraba el precio de UN SOLO paquete/unidad en vez del coste real de
comprar los paquetes que hacen falta para los gramos de esa fila —
corregido usando `resolvePurchaseCost()` (la misma función autoritativa
que ya usan `budget.js`/la lista de la compra) en vez de
`resolvePackageInfo().packagePrice` a secas; verificado con 2673 filas de
ingrediente sobre 200 planes reales, 0 inconsistencias. (2) Los macros por
ingrediente (`item.protein`/`carbs`/`fat`) nunca fueron datos reales del
ingrediente — son el total del PLATO repartido por cuota de gramos
(`buildMealFromDish`, ya documentado como known issue #2, preexistente a
esta sesión) — decisión del usuario tras ver el diagnóstico: dejar de
MOSTRAR ese desglose por ingrediente (dato no verificable como real), sin
tocar el modelo de datos (los totales por comida siguen siendo correctos,
`rebalancePlan`/`enforce25PercentRule` siguen funcionando igual). 0 tests
rotos (ningún test cubre render.js), verificado en vivo en navegador.

**Resumen de la sesión 2026-08-13 (presupuesto de compra MARGINAL —
la SELECCIÓN de plato, no solo la verificación final, razona en
purchaseCost)** (ver sección dedicada más abajo, "Presupuesto de compra
MARGINAL durante la selección", para el detalle completo): el rediseño de
2026-08-08 hizo que el AGREGADO final del día se verificara contra
purchaseCost (coste de compra real, consciente de despensa) — pero la
CASCADA de selección de plato (`pickDish`, `dish-selector.js`) seguía
decidiendo internamente por usageCost (precio × gramos usados), una
heurística que ignoraba el empaquetado: un plato "barato de usar" podía
seguir obligando a comprar un envase caro entero, y solo se corregía
DESPUÉS, recortando el plan ya construido. Pedido explícito del usuario:
que el generador PREFIERA desde el principio las opciones baratas de
COMPRAR, no solo lo detecte al final. Rediseño: nuevo concepto de coste de
compra MARGINAL (`js/core/budget.js`,
`estimateIngredientMarginalPurchaseCost`/`estimateItemsMarginalPurchaseCost`/
`estimateDishMarginalPurchaseCost` — cuánto SUMA un candidato a lo que ya
se va a comprar hoy, dado lo que tomas anteriores del mismo día ya
comprometieron y la despensa real) usado como criterio AUTORITATIVO en TODA
la cascada de `pickDish` (afford­abilidad, ranking, reducción de ración) —
`enforcePurchaseBudgetCap` (2026-08-08) se mantiene intacto como red de
seguridad final. usageCost se conserva como dato secundario/informativo
(scoring y UI), nunca como el criterio principal. 13 tests nuevos
(`tests/purchase-economics.test.js`), 2 golden-master recapturados
(el algoritmo de selección cambió a propósito), 139 tests totales, 0
fallidos. UI: cada ingrediente de una tarjeta de comida ahora muestra
también el precio del ENVASE junto al coste de uso (antes solo se veía en
la lista de la compra agregada). Verificado en vivo en navegador
(desktop + mobile): plan generado con purchase economics real, ciclo
despensa completo (comprar → cocinar, stock exacto), y una prueba
aislada que confirma que añadir a la despensa exactamente lo requerido de
un ingrediente baja su purchaseCost a 0€ y el total del día en la misma
cantidad exacta, sin tocar usageCost. Se encontró y solucionó (solo para
la verificación, no un cambio de producto) un problema de caché HTTP del
navegador de esta sesión de verificación — ver detalle en la sección
dedicada.

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
- ~~**Nada de esto está integrado en producción.**~~ **Los 50 roles
  resueltos SÍ están integrados en producción desde 2026-08-13d** —
  promovidos tal cual (mismos macros, mismo productId) a `js/data/
  ingredient-nutrition.js` + `js/core/nutrition.js`, consumidos por
  `dish-selector.js` (`buildMealFromDish`) para macros por ingrediente.
  `dish-selector.js` sigue sin leer `REAL_PRODUCTS` para la SELECCIÓN de
  platos (solo para macros de los ya elegidos) — esa parte del plan de
  integración de 7 puntos sigue sin aplicar.
- Tests: `poc/tests/` — 23 tests (`ingredient-resolver`,
  `shopping-list-builder` de prueba, `ingredient-coverage`).

## Tests (actualizado 2026-08-13d)

Dos suites, ambas Node + `vm` (cargan los archivos de producción reales,
sin copiarlos ni envolverlos en `module.exports`), sin ningún framework:

- `tests/` (producción): `node tests/run-tests.js` → **154 passed, 0
  failed** (verificado en esta sesión; era 139 antes de añadir
  `ingredient-nutrition.test.js`) — `shopping-cost.test.js` (14), `budget-mode.test.js` (13),
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
  localStorage de despensa corrupto/con entradas individuales corruptas),
  `purchase-economics.test.js` (13, nuevo 2026-08-13 — ver sección
  "Presupuesto de compra MARGINAL durante la selección" más abajo; cubre
  los escenarios A-H pedidos explícitamente: coste marginal de introducir
  un ingrediente nuevo (paquete entero, no usageCost proporcional),
  despensa cubriendo el 100% (marginal=0), envase pequeño vs. grande,
  reutilización del MISMO paquete entre tomas del mismo día
  (`committedGrams`), `pickDish` prefiriendo de verdad el envase barato de
  comprar bajo presupuesto ajustado — no solo el agregado final —,
  reducción de ración cuando ni un paquete entero cabe, varios ingredientes
  agregados, despensa parcial, consistencia lista-de-compra/generador, y
  presupuestos personalizados 8€/12€/20€), `ingredient-nutrition.test.js`
  (18, nuevo 2026-08-13d, +4 y 1 corregido en 2026-08-13e — ver sección
  "Rediseño del modelo de nutrición por ingrediente" y "Auditoría del
  recorte a cero y corrección de consistencia Atwater" más abajo; cubre
  la regresión EXACTA Cacahuetes+Plátano y Pollo+Arroz sobre platos
  REALES de dishes.js, no sintéticos, `nutritionSource` correcto en
  varios tipos de plato, escalado lineal de porciones, KBJU del día
  completo sano, lista de la compra/purchaseCost sin regresión, cobertura
  50/31 confirmada contra la auditoría, y consistencia Atwater de kcal
  para las 334 recetas reales), `settings.test.js` (11, nuevo 2026-08-13f
  — round-trip completo de perfil, saneado POR CAMPO no por objeto,
  fallback en memoria, JSON corrupto, cuota superada), `migration.test.js`
  (22, nuevo 2026-08-13f — `classifySyncState`/`merge*` puras + orquestación
  async con un cliente Supabase simulado; incluye el caso de ordenador
  compartido (`clear_cross_user`), `already_synced` nunca vuelve a
  preguntar aunque los datos diverjan, y reconciliar dos veces seguidas es
  un no-op real la segunda vez — la idempotencia pedida explícitamente),
  `cloud-sync.test.js` (16, nuevo 2026-08-13f — forma exacta del payload
  de cada push, modo invitado nunca toca la red, reintento único tras un
  fallo, se rinde en silencio tras el segundo fallo sin lanzar ni
  corromper el estado local, un cliente roto que lanza SÍNCRONAMENTE
  tampoco escapa), `auth.test.js` (17, nuevo 2026-08-13f — delegación en
  `supabase.auth.*`, fan-out de `onAuthStateChange` a varios listeners con
  una sola suscripción real al SDK, `authErrorMessage()` nunca expone el
  mensaje crudo del SDK, `signOut()` nunca toca despensa/settings —
  responsabilidad de `migration.onAuthSignOut`, verificado como límite
  explícito).
- `poc/tests/`: `node poc/tests/run-tests.js` → **23 passed, 0 failed** —
  resolver, shopping-list de prueba, cobertura de ingredientes (sin
  cambios, `poc/` no se tocó en ninguna de estas sesiones).
- Total: **246 tests, 0 failed** (223 en `tests/` + 23 en `poc/tests/`) —
  re-ejecutado y verificado en la sesión 2026-08-13f (no solo heredado de
  memoria). El runner (`tests/run-tests.js`) ahora soporta tests async
  (una función de test puede devolver una promesa, necesario porque
  auth.js/cloud-sync.js/migration.js siempre son async contra un cliente
  Supabase, real o simulado) — 100% retrocompatible, un test síncrono
  normal nunca devuelve un thenable.

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
  ~~**Ya no es así desde 2026-08-13**~~ — ver "Presupuesto de compra
  MARGINAL durante la selección" más abajo: `pickDish` ahora SÍ recibe
  `pantryState` y prefiere activamente ingredientes ya en despensa (vía
  coste de compra marginal). Se deja este párrafo como registro histórico
  de la decisión original (por qué se pospuso a propósito), no borrado.
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

## Presupuesto de compra MARGINAL durante la selección — 2026-08-13

Pedido explícito del usuario, en un mensaje muy detallado con ejemplos
numéricos concretos (yogur 1kg/3€ vs. 100g/1€, despensa cubriendo compras
futuras, etc.): el rediseño de 2026-08-08 (sección de arriba) hizo que la
VERIFICACIÓN final del día usara purchaseCost real, pero la CASCADA de
selección de plato (`pickDish`, `dish-selector.js`) seguía decidiendo
"¿cabe esto en el presupuesto de esta toma?" mirando usageCost
(`estimateScaledCost`, precio × gramos que se usarían) — solo se
comprobaba el coste de compra real DESPUÉS de construir el día entero
(`enforcePurchaseBudgetCap`), recortando si hacía falta. Esto significaba
que un plato "barato de usar" (23g de un ingrediente de envase grande y
caro) podía ganar la selección frente a uno con usageCost más alto pero
envase pequeño y barato de comprar de verdad — exactamente lo contrario de
lo que un comprador real haría en el supermercado.

**Investigación previa**: se leyó `pricing.js` (`resolvePurchaseCost`/
`resolvePackageInfo`, ya calculan purchaseCost por ingrediente suelto,
sin cambios), `budget.js` (`computeDayPurchaseCost`, ya agrega el día
completo con despensa, sin cambios), `pantry.js`
(`resolvePurchaseCostWithPantry`, sin cambios) y `dish-selector.js`
(`pickDish`, `scoreDishForSelection`, `shrinkToFitBudget` — los tres
puntos donde la cascada REALMENTE decide qué plato entra, y los tres
usaban usageCost). El punto exacto del bug: `estimateScaledCost(dish,
target, storeId).cost <= maxCost` en la Fase 1 de `pickDish`, y el mismo
patrón en las Fases 2-3.

**Modelo elegido — coste de compra MARGINAL**: no basta con purchaseCost
aislado de un plato suelto (eso ignoraría que el mismo paquete ya se va a
comprar por otra toma del mismo día, o que la despensa ya lo cubre). El
número correcto es MARGINAL: cuánto SUMA este candidato a lo que ya se va
a comprar hoy, dado (a) lo que las tomas ANTERIORES de este mismo intento
de generación ya comprometieron (`committedGrams`, un acumulador nuevo,
mutable, vive y muere con un solo `attemptPlanAtTier` — no es lo mismo que
la despensa) y (b) la despensa real (`pantryState`, sobras de compras
anteriores, sin cambios respecto a 2026-08-06/07). Tres funciones nuevas en
`js/core/budget.js` (capa de purchase economics ya existente, ampliada, no
una segunda implementación paralela):

- `estimateIngredientMarginalPurchaseCost(name, addGrams, committedGrams,
  storeId, pantryState)` — el primitivo: `purchaseCost(comprometido +
  addGrams) - purchaseCost(comprometido)`, reutilizando
  `resolveDayLinePurchaseCost` (ya existía, compartida con
  `computeDayPurchaseCost`) — nunca se reimplementa la lógica de
  paquetes/despensa. Caso especial deliberado: si `comprometido === 0`, el
  "antes" es 0€ por construcción, SIN llamar a
  `resolveDayLinePurchaseCost(name, 0, ...)` — esa llamada, sin `pantry.js`
  cargado, cae en `resolvePurchaseCost(name, 0, storeId)`, que devuelve "1
  paquete fantasma" (`Math.max(1, ...)`, documentado en la cabecera de
  `pricing.js` como asunción válida porque nunca se la llamaba con 0 gramos
  hasta ahora) — se evitó tocar esa función para un caso que no necesitaba
  hasta hoy, y en su lugar se evita la llamada aquí mismo.
- `estimateItemsMarginalPurchaseCost(items, committedGrams, storeId,
  pantryState)` — suma el marginal de una lista `{name, grams}[]` (misma
  forma que `meal.items`).
- `estimateDishMarginalPurchaseCost(dish, scaleFactor, committedGrams,
  storeId, pantryState)` — igual, partiendo de un `dish` de `DISH_DB`
  (`{name, g}[]` sin escalar) y una escala hipotética — lo que usa
  `dish-selector.js` para evaluar candidatos ANTES de construir el meal.
- `addItemsToPurchaseState(committedGrams, items)` — compromete items
  (muta `committedGrams`); se llama DESPUÉS de medir el marginal de una
  toma, nunca antes.

**`dish-selector.js` — las TRES fases de `pickDish` reescritas para usar
el marginal, no usageCost**:

1. `estimateScaledPurchaseImpact(dish, target, storeId, committedGrams,
   pantryState)` sustituye a `estimateScaledCost` como señal de
   afford­abilidad/ranking — el factor de escala sigue viniendo del
   objetivo calórico (decisión nutricional, sin cambios), pero el coste se
   mide DESPUÉS con el marginal.
2. `scoreDishForSelection`: la eficiencia proteína/coste-de-compra-marginal
   es ahora el criterio AUTORITATIVO (antes: proteína/usageCost);
   proteína/usageCost (`proteinPerEuro`, `pricing.js`) se conserva como
   desempate SECUNDARIO de peso menor (×0.5 frente al ×1 del marginal) —
   nunca decide qué plato "cabe", solo desempata entre casi-iguales. Pedido
   explícito del usuario: no destruir usageCost, solo dejar de usarlo como
   restricción principal.
3. `shrinkToFitBudget` → `shrinkToFitPurchaseBudget`: la versión anterior
   resolvía el factor de escala analíticamente (usageCost es lineal con la
   escala). El coste de compra NO lo es (función escalón por redondeo a
   paquetes) — no hay fórmula cerrada, así que se busca por BISECCIÓN
   (24 iteraciones, de sobra para 2 decimales de €), aprovechando que el
   coste marginal es monótono no-decreciente al subir la escala (con
   `committedGrams`/`pantryState` fijos).
4. Nueva `estimateAbsoluteMinPurchaseCost(category, storeId)` sustituye a
   `estimateAbsoluteMinMealCost` (usageCost) como reserva de presupuesto
   para el lookahead de tomas siguientes en `plan-generator.js` —
   deliberadamente IGNORA despensa/comprometidos (`pantryState: null`,
   `committedGrams: {}` frescos) para no infra-reservar si dos categorías
   "reclamaran" el mismo paquete/despensa dos veces; el margen real que la
   despensa aporte se refleja de todas formas en el marginal REAL que paga
   cada toma al elegirse, esta reserva es solo el techo conservador.

**`plan-generator.js` — `attemptPlanAtTier` mantiene `committedGrams`
durante todo el día**: nuevo acumulador `committedGrams = {}` al principio
de cada intento de tier (se reinicia en cada tier, nunca persiste entre
ellos). Por cada toma: se llama a `pickDish(..., committedGrams,
pantryState)`, se construye el meal, se mide su coste de compra marginal
REAL con `estimateItemsMarginalPurchaseCost(meal.items, committedGrams,
...)` (usando el estado ANTES de comprometer esta toma), SE COMPROMETE
(`addItemsToPurchaseState`) para que la SIGUIENTE toma vea el paquete ya
"pagado", y `remainingBudget` (la reserva dinámica entre tomas, sin
cambios de fórmula) se decrementa por ese marginal — antes se decrementaba
por `meal.spent` (usageCost). `enforcePurchaseBudgetCap` (2026-08-08) NO
se tocó: sigue siendo la red de seguridad final sobre el día ya construido,
ahora reforzando (no sustituyendo) una selección que ya intentó acertar
desde el principio.

**Ejemplo real observado en la verificación en navegador** (no
inventado — capturado generando un plan real): un plan generado necesitó
Tempeh en dos tomas (comida y snack2), 557g agregados → 3 paquetes de
200g = 10.80€ de compra — la segunda toma (snack2) no "pagó" un paquete
nuevo de cero, el marginal de sus 150g ya estaba parcialmente cubierto por
lo comprometido en la comida. Prueba aislada adicional: sobre un plan real
generado, añadir a la despensa EXACTAMENTE los 319.6g de Tempeh que ese
plan requería bajó el purchaseCost de ese ingrediente de 7.20€ a 0.00€, y
el total de compra del día bajó exactamente esos mismos 7.20€ — ni un
céntimo más ni menos, verificado con `computeDayPurchaseCost` en la
consola del navegador real, no solo en Node.

**UI — precio del paquete visible por ingrediente, no solo en la lista de
la compra agregada** (`js/ui/render.js`): antes, la tarjeta de una toma
mostraba solo `item.cost` (usageCost) por ingrediente; el precio del
paquete solo aparecía agregado, al final, en la lista de la compra.
Ahora `renderFoodRow(item, storeId)` también muestra, con etiqueta
explícita, el precio del ENVASE (`resolvePackageInfo(item.name,
storeId).packagePrice` — la MISMA función que ya calculaba el tamaño para
el texto "Compra: ...", ahora también se lee su precio, sin duplicar
lógica de precios) junto al tamaño de envase, con una etiqueta pequeña
("consumo" / "Ng paquete"). `formatPurchaseLine`/
`formatRealMatchPurchaseLine` (antes solo tamaño/etiqueta) ahora también
anotan `€X/paquete` al final de la línea "Compra: ...", reutilizando el
`pkg` ya resuelto — sin tocar la lógica de qué tamaño/etiqueta mostrar
(intacta, ver commits). `render-shopping-list.js`: la anotación "Coste de
uso: €X" bajo el precio de compra ahora aparece siempre que difiere del
purchaseCost (antes solo para ingredientes con envase fijo — cubría casi
todos los casos igualmente, esto lo hace explícito y también cubre el caso
despensa-cubre-todo). CSS nuevo: `.food-cost`/`.food-cost__tag`/
`.food-cost--package` en `assets/css/style.css`, verificado sin overflow
horizontal nuevo en mobile 375px (`document.documentElement.scrollWidth`
casi idéntico al viewport, los únicos elementos con `scrollWidth` mayor
son los que ya usaban `text-overflow: ellipsis` a propósito, sin relación
con este cambio).

**Tests**: `tests/purchase-economics.test.js` (13 tests nuevos, ver
"Tests" arriba para el detalle de escenarios A-H). Golden-master de
`plan-generator.characterization.test.js` (seed=42/seed=7) recapturados —
el algoritmo de selección cambió a propósito (ahora prefiere activamente
opciones baratas de comprar), así que los agregados exactos anteriores ya
no aplican; los 7 tests de invariantes/contrato del mismo archivo (nunca
supera presupuesto sin declararlo, nunca excede tiempo/cap25% sin
declararlo, macros dentro de tolerancia, Amplio nunca `budget_infeasible`)
siguieron pasando SIN modificar — confirma que el contrato observable no
se rompió, solo cambió qué plato exacto gana la lotería ponderada. 162
tests totales (`tests/` + `poc/tests/`), 0 fallidos.

**Verificado en navegador real** (desktop 1280×800 y mobile 375×812): 0
errores de consola en generar plan, "Usar este plan hoy", "Marcar compra
como hecha" (stock sumado exactamente a los paquetes completos comprados,
igual que antes), "Marcar como cocinado" (stock restado exactamente los
gramos requeridos — probado con pan integral 460g→340g y aguacate
360g→255g tras cocinar el desayuno, coincide con lo que ese meal pedía),
modo "sin cocinar" (no tocado por este cambio, sigue generando con horario
y precios reales), presupuestos personalizados 8€/12€/20€, y la prueba
aislada de despensa descrita arriba. **Nota técnica de la verificación,
nueva en esta sesión**: el navegador de este entorno sirvió una copia
CACHEADA (HTTP heurístico, sin relación con el código) de
`dish-selector.js` tras el primer `preview_start` — se detectó porque
`estimateAbsoluteMinPurchaseCost is not defined` aparecía como
`violations: [{type:'system_error', ...}]` pese a que `node
tests/run-tests.js` pasaba en limpio; se confirmó comparando
`fetch('/js/engine/dish-selector.js')` (con caché) vs. `{cache:
'no-store'}` (sin caché) — tamaños distintos. Se resolvió reevaluando el
archivo fresco en el contexto de la página (`eval` del texto obtenido con
`cache:'no-store'`) para esa sesión de verificación concreta; en un
navegador real de un usuario esto no debería ocurrir salvo que ya tuviera
una visita previa cacheada de una versión anterior del archivo (mismo tipo
de problema de caché documentado en sesiones anteriores para
`document.write`, ver sección de horario de comidas) — no es un bug de la
aplicación ni requiere ningún cambio de código.

## Corrección de precio y macros por ingrediente — 2026-08-13c

Reportado por el usuario con un ejemplo real capturado en pantalla:

```
Plátano
≈ 1 plátano (144g)
P 11.5 g / C 32.2 g / G 13.8 g
299 kcal
€0.17 consumo
€0.14 paquete (120g)
```

Pidió explícitamente auditoría completa sin asumir nada — diagnóstico con
datos crudos, valores escalados y valores finales de render. Se hizo
exactamente eso, cargando el código de producción real (no una
reimplementación) y volcando cada paso. Resultado: **dos bugs
independientes**, no uno.

### Bug 1 (precio): `usageCost` mostrado mayor que el "precio de paquete" — CORREGIDO

Diagnóstico real (`resolvePackageInfo`/`resolvePurchaseCost` sobre
"Plátano", 144g, tienda mercadona):

```
resolvePackageInfo("Plátano") → packageSizeG: 120, packagePrice: €0.14  (precio de 1 SOLO plátano)
resolvePurchaseCost("Plátano", 144g) → packagesToBuy: 2, purchaseCost: €0.28
usageCost(144g) = 0.12 × 144/100 = €0.1728 → €0.17
```

Causa raíz: `renderFoodRow()` (introducida en la sesión 2026-08-13b de
este mismo día, ver sección "Presupuesto de compra MARGINAL durante la
selección" arriba) leía `resolvePackageInfo().packagePrice` — el precio
de UN envase/unidad — y lo mostraba como si fuera "lo que cuesta comprar
lo necesario para esta fila". 144g de plátano (un banano medio pesa
~120g) requiere en realidad 2 plátanos, no 1 — de ahí que el "precio de
paquete" mostrado (el de 1 solo) resultara menor que el usageCost real de
144g. El mismo patrón afectaba a CUALQUIER ingrediente cuyos gramos en
una toma superasen el tamaño de un envase — no era exclusivo del plátano;
se confirmó el mismo patrón en vivo con Atún al natural (735g → 2 latas
de 480g) y Tofu firme (300g → 2 paquetes de 250g) antes del fix.

**Corrección**: `renderFoodRow()` ahora usa `resolvePurchaseCost(item.name,
item.grams, storeId)` — la MISMA función autoritativa que ya usan
`js/core/budget.js` (`computeDayPurchaseCost`), la lista de la compra
(`render-shopping-list.js`) y el recorte de presupuesto
(`enforcePurchaseBudgetCap`) — en vez de leer `packagePrice` a secas.
Por construcción de esa función (`packagesToBuy = ceil(gramos /
tamañoEnvase)`, `purchaseCost = packagesToBuy × packagePrice`),
`purchaseCost >= usageCost` SIEMPRE — la inconsistencia queda
estructuralmente imposible, no parcheada para el caso del plátano. De
paso se eliminó una SEGUNDA fuente del mismo tipo de bug:
`formatPurchaseLine`/`formatRealMatchPurchaseLine` recalculaban
`packagesNeeded` con un margen del 15% propio (heurística de texto nunca
sincronizada con el cálculo estricto de `resolvePurchaseCost`) — ahora
usan `purchase.packagesToBuy` directamente, una sola fuente de verdad
para cantidad Y precio. Exactamente el tipo de "segunda implementación
paralela de paquetes" que el usuario ya había pedido evitar en la sesión
anterior — se coló porque `renderFoodRow` no reutilizó `resolvePurchaseCost`
desde el principio, se corrige ahora.

**Verificado**: 2673 filas de ingrediente sobre 200 planes reales
generados en el navegador real (no Node) — 0 casos de
`usageCost > purchaseCost`. Los 139 tests de la suite no cambian (ningún
test cubre `render.js`, capa de presentación pura).

### Bug 2 (macros): proteína/grasa por ingrediente biológicamente imposibles — MITIGADO (dato de raíz sin resolver, ya conocido)

Diagnóstico real, dish "Cacahuetes con plátano" (`js/data/dishes.js`):

```
dish: { kcal:260, protein:10, carbs:28, fat:12, items:[{Cacahuetes,25g},{Plátano,100g}] }
total gramos del plato: 125g
Plátano = 100g / 125g = 80% del peso del plato
  → protein asignada: 10 × 0.8 = 8g (nativo) → ×1.44 escala = 11.5g  ← coincide EXACTO con el reporte del usuario
  → fat asignada:     12 × 0.8 = 9.6g       → ×1.44 escala = 13.8g  ← coincide EXACTO
  → carbs asignados:  28 × 0.8 = 22.4g      → ×1.44 escala = 32.3g ≈ 32.2 (redondeo)
```

`buildMealFromDish()` (`js/engine/dish-selector.js`) reparte el macro
TOTAL del plato entre sus ingredientes por CUOTA DE GRAMOS
(`ingredient.g / totalItemGrams(dish)`), no por la composición nutricional
real de cada ingrediente — el cacahuete (denso en proteína/grasa) le
"presta" su proteína/grasa al plátano solo porque el plátano pesa más en
esa combinación. Confirmado también con "Pechuga de pollo" (200g, plato
"Pollo a la plancha con arroz y brócoli"): el render mostraba
**carbs: 18.2g** para pechuga de pollo — que biológicamente tiene ~0
carbohidratos; ese 18.2g pertenece en realidad al arroz del mismo plato.

Esto NO es nuevo — es el **known issue #2** ya documentado ("Ingredient
nutrition ... is fabricated by mass allocation"), la razón central detrás
de toda la migración Fase 1-2 de `ROADMAP.md`. Lo nuevo de esta sesión es
haberlo confirmado con datos concretos y reproducibles (antes solo estaba
descrito en abstracto) y haber comprobado que NO tiene arreglo rápido y
honesto: se consultó `poc/INGREDIENT_COVERAGE.md` (auditoría real contra
`REAL_PRODUCTS`) y **Plátano está `❌ unresolved`** — el único candidato
del catálogo real con datos nutricionales es plátano MACHO (subespecie
distinta, plantain), el plátano de mesa correcto no tiene `kcal` verificado
en el catálogo actual. Tampoco ayuda tener un `REAL_INGREDIENT_MATCHES`
verificado (como sí tiene "Pechuga de pollo") — esa tabla solo alimenta el
PRECIO (`pricing.js`), nunca los macros, en ningún punto del pipeline de
producción actual.

**Decisión del usuario, tras ver el diagnóstico** (no asumida por mí):
dejar de MOSTRAR el desglose de proteína/carbos/grasas por ingrediente en
la tarjeta de comida — es un dato que no se puede verificar como real con
los datos actuales, y mostrarlo con precisión de un decimal (algo que
sugiere exactitud) es peor que no mostrarlo. Se conservan:
- `item.protein`/`item.carbs`/`item.fat` en el MODELO DE DATOS (no se
  borran) — siguen alimentando `getMealTotals`/`sumMeals` (el total por
  comida y por día SÍ es correcto, es el macro real del plato, curado a
  mano, simplemente escalado — el reparto por ingrediente es lo único
  fabricado) y `rebalancePlan`/`scaleMainProteinUp`/`removeLeastUsefulItem`
  (`plan-generator.js`/`meal-helpers.js`), que dependen de esos campos
  internamente.
- `item.kcal` por ingrediente SÍ se sigue mostrando (mismo reparto por
  cuota de gramos, mismo problema de fondo, pero mucho menos propenso a
  verse "imposible" a simple vista — decisión explícita del usuario al
  elegir esta opción).

**Cambio real**: `js/ui/render.js`, `renderFoodRow()` — la línea
`food-meta` ya no concatena `P/C/G`, solo la frase de cantidad
(`formatQuantityPhrase`). Nada más se tocó: ni `dish-selector.js` ni el
modelo de datos ni los tests.

**Sigue sin resolver** (fuera de alcance de esta sesión, es la Fase 1-2 de
`ROADMAP.md`): la fabricación de macros en sí. Si en el futuro se quiere
mostrar de nuevo un desglose por ingrediente, hace falta primero terminar
la migración a `REAL_PRODUCTS`/`IngredientResolver` (`poc/`) para que cada
ingrediente tenga SU PROPIO dato nutricional verificado, no una cuota del
total del plato.

## Rediseño del modelo de nutrición por ingrediente — 2026-08-13d

Pedido explícito del usuario tras ver el diagnóstico de la sesión
anterior: "не просто зафиксируй проблему с макросами как known issue —
разберись и исправь архитектурно" (no te limites a documentar el
problema de los macros como known issue — resuélvelo arquitectónicamente).
Objetivo declarado: cada ingrediente con su propio KBJU real; el total del
plato/comida/día debe ser la SUMA de los ingredientes, nunca al revés; los
ingredientes sin dato fiable deben quedar explícitamente `nutrition
unavailable`, nunca un número inventado; y los golden-master deben
recapturarse a propósito si el modelo cambia, sin intentar preservar la
lógica vieja para que pasen.

### Auditoría previa (pedida explícitamente, hecha antes de tocar código)

**Data flow completo rastreado**: `js/data/dishes.js` (334 platos, cada
uno con kcal/protein/carbs/fat AGREGADOS a mano para el plato entero,
nunca por ingrediente) → `buildMealFromDish()` (dish-selector.js, ANTES
de esta sesión: repartía ese agregado por cuota de gramos de cada
ingrediente — la causa raíz) → `meal.items[]` → `getMealTotals()`/
`sumMeals()` (meal-helpers.js, solo suman, no fabrican nada) → UI
(`renderFoodRow`, `renderMealFooter`, `renderSummary`). Ningún otro punto
del pipeline recalcula o redistribuye macros (`rebalancePlan`/
`enforce25PercentRule` en plan-generator.js AJUSTAN gramos de items ya
construidos, no reinterpretan de dónde viene el macro).

**Fuentes de datos reales YA existentes en el proyecto, encontradas antes
de escribir una sola línea**:
- `js/data/real-products.js` — 2769 productos reales de Mercadona, cada
  uno con `kcal`/`protein`/`carbs`/`fat` por 100g cuando están verificados
  (`nutritionSource`/`needsReview`), id, ean, categoría.
- `js/data/real-ingredient-matches.js` — 12 ingredientes con match curado
  a mano, pero SOLO para precio (nunca alimentó macros en producción).
- `poc/data/ingredient-rules-full.js` — **auditoría YA COMPLETA** (sesión
  2026-08-03/04, nunca integrada en producción) de los 81 ingredient
  roles reales de `dishes.js` contra `real-products.js`: 50 resueltos con
  macros reales verificados a mano (needsReview=false, macros no nulos,
  guarda de plausibilidad — ej. se descartó un "Aguacate" con
  carbs=0.83g/100g por implausible), 31 sin resolver con motivo
  documentado. Verificada por `poc/tests/ingredient-coverage.test.js` (9
  aserciones, sigue pasando sin cambios).

**Decisión de reutilización, no re-derivación** (pedido explícito: "не
подставляй похожие продукты автоматически"): se promovió esa auditoría
tal cual a producción (`js/data/ingredient-nutrition.js`, ver abajo) — se
verificó programáticamente que las claves normalizadas no colisionan y
que los 81 roles de `dishes.js` actual siguen exactamente cubiertos (0
huecos, 0 roles nuevos sin auditar) antes de usarla. Cero matching nuevo
por similitud de texto — exactamente el error ya documentado que causó
"plátano" emparejado con "Fanta naranja" en sesiones anteriores.

**Lista de ingredientes sin fuente fiable (31/81)**, con motivo — no se
repite aquí la tabla completa (ver `js/data/ingredient-nutrition.js` o
`poc/INGREDIENT_COVERAGE.md` para el detalle línea a línea de cada uno):
Aguacate, Arroz integral cocido, Avena, Bacalao, Brócoli, Caballa en lata,
Calabacín, Carne picada 5% grasa, Conejo, Copos de maíz, Cuscús cocido,
Edamame, Fresas, Frutos rojos congelados, Granola, Hummus, Kiwi, "Lechuga:
Pepino" (bug de nombre en dishes.js), Lubina, Mermelada light, Pasta
cocida, Pavo picado, Pepino, Plátano, Rape, Salmón, Skyr natural, Tempeh,
Trigo sarraceno cocido, Verduras congeladas salteado, Wrap proteico.
Motivos: producto no existe en el catálogo (12), existe pero sin
nutrición verificada (10), solo existe en un formato/preparación distinto
al que pide la receta —seco vs. cocido, ahumado vs. fresco— (3), match
ambiguo que cambiaría el resultado nutricional —plátano macho, "5% grasa"
que en realidad es de pollo— (3), needsReview del propio pipeline (1),
otros casos especiales (2).

### Modelo de datos elegido

**`js/data/ingredient-nutrition.js`** (nuevo) — registro de 81 entradas,
clave = `normalizeIngredientKey(name)` (mismo criterio que pricing.js/
packaging.js/pantry.js, no el string exacto de `poc/`): `{resolved:true,
kcal, protein, carbs, fat, productName, ean, matchMethod}` para los 50
resueltos, `{resolved:false, reason, detail}` para los 31 sin resolver —
nunca un valor numérico en el caso `false`.

**`js/core/nutrition.js`** (nuevo) — `resolveIngredientNutrition(name)`
(lookup, paralelo a `resolveIngredientPrice` de pricing.js) y
`computeDishIngredientNutrition(dish, scaleFactor)` (la pieza central):

1. Cada ingrediente RESUELTO recibe `kcal/protein/carbs/fat = dato real
   por 100g × gramos de esta ración` — exacto, lineal con la escala,
   **nunca tocado por lo que haya en el resto del plato**.
2. El REMANENTE del plato (`dish.kcal/protein/carbs/fat × scaleFactor`
   MENOS la suma de lo que ya aportan los ingredientes resueltos, nunca
   negativo — `Math.max(0, ...)`) se reparte por cuota de gramos SOLO
   entre los ingredientes SIN resolver — nunca diluye ni resta de un
   ingrediente que sí tiene dato real. Esto es lo que rompe la cadena de
   contaminación del bug original: en "Cacahuetes con plátano", el
   cacahuete (resuelto) ya no "presta" su proteína real al plátano,
   porque esa proteína se resta ANTES de calcular lo que le toca al
   plátano.
3. `item.nutritionSource` (`'real'` | `'estimated'`) viaja hasta la UI
   para que nunca se confunda un dato verificado con una estimación.

**Por qué no "solo suma de ingredientes resueltos, 0 para el resto"**
(la lectura más literal posible de "el total debe ser la suma de los
ingredientes"): se consideró y se descartó — un ingrediente sin dato real
NO tiene 0 kcal en la vida real (un plátano no es un alimento de 0
calorías), y poner 0 habría infravalorado sistemáticamente el total
diario de kcal/proteína en los platos con ingredientes sin resolver
(la mayoría — solo 102/334 platos tienen el 100% de sus ingredientes
resueltos), rompiendo el propósito central de una app de nutrición
(calcular cuánto comes de verdad). El modelo de remanente SÍ satisface
"total = suma de ingredientes" como identidad matemática exacta (el
remanente se define precisamente como "lo que falta para que la suma
cuadre") — la diferencia con la lectura más estricta es solo que el
ingrediente sin resolver recibe una ESTIMACIÓN (no inventada de la nada:
es literalmente "lo que queda del total del plato una vez descontado lo
real"), nunca escondida ni presentada como dato verificado en la UI.

**Límite conocido y medido, no evitable sin inventar datos**: el
remanente puede recortarse a 0 cuando los ingredientes YA resueltos de un
plato, sumados, superan el total hand-curated de `dishes.js` (esos
totales son estimaciones manuales de hace sesiones, nunca se derivaron de
datos reales por ingrediente). Medido sobre las 334 recetas: ocurre en
45/334 para kcal (13.5%), hasta 105/334 para proteína (31.4%), con un
exceso máximo observado de 326kcal/16g proteína/31.5g grasa en el peor
caso. En esos casos el total del plato pasa a ser el REAL (más alto, más
preciso) en vez del antiguo estimado a mano — decisión deliberada: los
datos reales siempre ganan, nunca se recortan para que "cuadren" con una
estimación manual que ahora se sabe imprecisa. Documentado en la cabecera
de `js/core/nutrition.js`.

### Cambios en el pipeline existente

**`js/engine/dish-selector.js`** — `buildMealFromDish()` llama a
`computeDishIngredientNutrition(dish, scaleFactor)` en vez de repartir
`dish.kcal * scaleFactor * (ingredient.g/totalItemGrams(dish))` a mano;
`totalItemGrams()` (ya sin llamadores) se eliminó. El resto de
dish-selector.js (cascada de selección por coste de compra marginal,
2026-08-13, y por usageCost antes de eso) **no se tocó** — el objetivo
calórico/scaleFactor sigue calculándose igual que siempre, solo cambia
CÓMO se reparte el resultado entre ingredientes.

**`js/ui/render.js`** — `renderFoodRow()` vuelve a mostrar P/C/G por
ingrediente (se había quitado del todo en 2026-08-13c), condicionado a
`item.nutritionSource==='real'`: si es real, se muestra con una insignia
verde "real"; si no, un aviso explícito "macros por ingrediente no
verificados" — nunca el número del remanente presentado como si fuera un
hecho verificado de ese ingrediente. kcal por ingrediente se sigue
mostrando siempre (menos propenso a parecer "imposible", y sigue siendo
útil incluso como estimación agregada).

**`index.html`** — 2 scripts nuevos: `js/data/ingredient-nutrition.js`
(tras `real-ingredient-matches.js`) y `js/core/nutrition.js` (tras
`pricing.js`, antes de `pantry.js`) — orden correcto para que
`normalizeIngredientKey`/`INGREDIENT_NUTRITION` estén disponibles cuando
`dish-selector.js` los necesita.

**NO se tocó**: `js/core/pricing.js`, `js/core/budget.js`,
`js/core/pantry.js`, `js/core/meal-schedule.js`, `js/engine/
plan-generator.js` (`rebalancePlan`/`enforce25PercentRule`/
`enforcePurchaseBudgetCap` siguen operando sobre `item.kcal/protein/
carbs/fat/cost` exactamente igual, sin saber ni necesitar saber si el
valor es `'real'` o `'estimated'`), `js/engine/no-cook-generator.js` (usa
`REAL_PRODUCTS` directamente, nunca pasó por `dishes.js`/
`buildMealFromDish`, siempre tuvo macros reales), `js/ui/
render-shopping-list.js`, `js/data/dishes.js`, `poc/` (ni un archivo).

### Tests (ver "Tests" arriba para el detalle)

`tests/ingredient-nutrition.test.js` (15 tests nuevos): regresión EXACTA
sobre el plato real "Cacahuetes con plátano" (el cacahuete muestra su
proteína/grasa real sin tocar; el plátano ya NO da el valor inflado del
bug antiguo, y su remanente es estrictamente menor); regresión EXACTA
sobre "Pollo a la plancha con arroz y brócoli" (la pechuga de pollo
muestra carbohidratos reales ~0, no los del arroz; el brócoli sin
resolver nunca da un valor negativo); `nutritionSource` correcto en 3
platos de tipos distintos; escalado lineal de porciones (doblar la
escala dobla los macros de un ingrediente resuelto, verificado tanto en
`computeDishIngredientNutrition` como en `buildMealFromDish` real);
KBJU del día completo (`generateDietPlan`, 15 corridas) siempre finito,
no negativo, y el total recalculado desde los items coincide con
`result.total`; lista de la compra/purchaseCost sin regresión tras el
cambio de modelo de nutrición; cobertura 50 resueltos/31 sin resolver
confirmada contra la auditoría. Golden-master de
`plan-generator.characterization.test.js` (seed=42/seed=7) recapturados
a propósito (el modelo de datos cambió fundamentalmente, tal como pidió
el usuario) — los 7 tests de invariantes/contrato del mismo archivo NO
se tocaron y siguen pasando sin cambios, confirmando que el contrato
observable del generador (presupuesto, tiempo, cap25%, tolerancia de
macros, nunca `unavailable`) se mantuvo intacto. 154 tests totales
(`tests/`), 0 fallidos. `poc/tests/` (23) sin cambios, 0 fallidos.

### Verificado en navegador real

Desktop (1280×800) y mobile (375×812): se reprodujo el ejemplo EXACTO del
reporte original del usuario (plato real "Cacahuetes con plátano",
`buildMealFromDish` a la misma escala ~1.44 que produjo el bug) — el
plátano pasó de proteína=11.5g/grasa=13.8g (fabricado) a proteína=5.8g/
grasa=0g marcados `'estimated'` (con aviso explícito en la UI, no un
número presentado como hecho), y el cacahuete mostró proteína=8.6g/
grasa=18.1g marcados `'real'` (exactos, escalados linealmente desde el
dato verificado). Plan completo generado con 0 errores de consola,
confirmando en la tarjeta real: ingredientes resueltos con insignia
"real" (Cacahuetes, Arroz blanco cocido, Queso fresco batido 0%,
Lentejas cocidas...), ingredientes sin resolver con el aviso "macros por
ingrediente no verificados" (Plátano, Salmón, Tempeh, Aguacate, Pepino).
Ciclo despensa completo verificado sin regresión ("Usar este plan hoy" →
"Marcar compra como hecha" → "Marcar como cocinado", stock exacto,
mismo patrón que sesiones anteriores). Modo "sin cocinar" verificado sin
regresión (usa `REAL_PRODUCTS` directamente, nunca tocado por este
cambio). **Nota técnica de la verificación, ya documentada en sesiones
anteriores**: el navegador de este entorno volvió a servir una copia
cacheada de varios archivos tras `preview_start` — se resolvió igual que
antes, reevaluando (`fetch` con `cache:'no-store'` + `eval`) los
archivos nuevos/modificados en el contexto de la página ya cargada.

## Auditoría del recorte a cero y corrección de consistencia Atwater — 2026-08-13e

El usuario pidió explícitamente NO corregir el "recorte a 0" a ciegas —
primero mostrar ejemplos concretos, causas, y proponer el mejor
arquitectónico. Se hizo exactamente eso antes de tocar código.

### Investigación: ¿por qué el resolved-sum supera dish.total?

Diagnóstico sobre las 334 recetas reales (script Node cargando
`dishes.js`/`ingredient-nutrition.js` reales, sin copiar): **172/334
platos** tienen al menos un macro donde `resolvedSum > dish.total`
(protein 105, fat 102, kcal 45, carbs 42 por separado, con solape — de
ahí el rango 45-105 reportado antes). Distribución de la magnitud:
mediana 2-5g/kcal, la mayoría (<15) es ruido menor; una cola de ~20 casos
supera 50kcal o 10g de un macro.

**Dos causas distintas, confirmadas con ejemplos reales**:

1. **Ruido de redondeo de una estimación manual** (la mayoría). Ejemplo:
   "Tostadas con queso fresco y tomate" — **los 3 ingredientes están
   resueltos** (100% real), y aun así protein excede por 3.25g, carbs por
   1.4g. Esto prueba que NO es un problema de "mezclar mal los
   ingredientes" — ni siquiera hay reparto posible aquí — es,
   simplemente, que `dishes.js` nunca fue una suma exacta, era una
   estimación redondeada a mano. Coherente con el known issue #1 ya
   documentado (solo 54/204 platos antiguos tenían kcal dentro de
   20kcal de su propio Atwater).
2. **Infravaloración sistemática de categorías concretas** (la cola).
   Ejemplos reales:
   - **Conservas en aceite**: "Sardinas con arroz y coliflor" —
     dish.kcal=605, resolvedSum=803.7 (+198.7). El producto real
     resuelto ("Sardinillas... en aceite de oliva Hacendado") tiene 27g
     grasa/100g — el autor de `dishes.js` claramente asumió sardinas
     bajas en grasa, no en aceite.
   - **Frutos secos**: "Requesón con almendras"/"Requesón con nueces" —
     +84.6/+59.8kcal. Almendras (628kcal/100g) y nueces (579kcal/100g)
     son mucho más densas de lo que un puñado "se siente" — patrón de
     infravaloración humana conocido, no específico de este dataset.
   - **Pechuga de pavo**: "Hamburguesa de pavo con ensalada" —
     dish.protein=40g, resolvedSum=56.1g (+16.1, el peor caso medido).
     200g de pechuga de pavo real (23.8g proteína/100g) ya da 47.6g solo
     de proteína animal.

**Conclusión de la investigación**: estos NO son señales de que el
modelo de remanente esté mal — son la migración funcionando como se
diseñó: los datos reales CORRIGEN estimaciones manuales imprecisas o
sistemáticamente bajas. Matemáticamente, `resolvedSum + max(0,
dish.total·scale − resolvedSum) ≡ max(resolvedSum, dish.total·scale)` —
el total reportado nunca es menor que el mejor de los dos números
disponibles (el real verificado o la estimación antigua). No se cambió
este mecanismo.

### El bug real que SÍ se encontró (mismo mecanismo, síntoma distinto)

Clampar kcal de forma INDEPENDIENTE a protein/carbs/fat (cada uno con su
propio remanente, anclado por separado a `dish.kcal`/`dish.protein`/
`dish.carbs`/`dish.fat`) podía producir una fila `'estimated'`
internamente CONTRADICTORIA: un macro se recorta a 0 en un plato
concreto mientras otro no, sin relación entre ellos. Caso real
encontrado: "Tostadas con ricotta y mermelada" — pan+requesón
(resueltos) ya agotaban `dish.kcal`/`dish.protein`/`dish.fat`, pero NO
`dish.carbs` — la Mermelada light (sin resolver) terminaba mostrando
**carbs=11.5g pero kcal=0** — imposible: 11.5g de carbohidratos son, por
sí solos, ~46kcal (Atwater). Medido sistemáticamente: **99 de las filas
`'estimated'` de las 334 recetas reales** tenían kcal inconsistente con
su propio protein/carbs/fat por más de 20kcal.

**Corrección** (`js/core/nutrition.js`, `computeDishIngredientNutrition`):
kcal de un ingrediente sin resolver ya NO es un remanente independiente
anclado a `dish.kcal`. Se calcula en una segunda pasada, DESPUÉS de fijar
su propio remanente de protein/carbs/fat, como
`protein×4 + carbs×4 + fat×9` (factores de Atwater) — garantiza que esa
fila sea internamente consistente CONSIGO MISMA siempre, y de paso deja
de usar `dish.kcal` en absoluto (el campo menos fiable del dataset,
known issue #1) como ancla. Los ingredientes RESUELTOS no se tocan: su
kcal sigue siendo el dato real del producto tal cual, nunca recalculado
por Atwater (un producto real no tiene por qué cuadrar exactamente con
la fórmula — fibra, redondeo de fábrica, etc. — y forzarlo perdería
precisión de un dato ya verificado). Verificado con el propio caso de
Cacahuetes: kcal real=618/100g vs. Atwater-implied=601.6/100g — una
diferencia real de ~2.7%, la prueba de que NO se está recalculando datos
verificados.

**Efecto en los totales**: el kcal total de un plan puede subir (nunca
bajar) respecto a la versión 2026-08-13d, porque kcal ya no puede
quedarse "atascado" en 0 cuando el resto de macros sí tiene remanente
positivo. Golden-master recapturados en consecuencia (ver "Tests").

**Por qué NO se cambió el modelo de remanente de protein/carbs/fat en
sí**: se consideraron alternativas (usar el reparto antiguo sin restar —
Model C, descartado porque reproduce EXACTAMENTE el bug original del
plátano/cacahuete para el caso donde ninguno de los dos está resuelto;
poner 0 siempre en vez de remanente — descartado porque infravaloraría
sistemáticamente el total diario de kcal/macros, el propósito central de
la app). El modelo de remanente para protein/carbs/fat ya cumplía
"datos reales = fuente de verdad, totales antiguos = solo fallback donde
no hay datos reales" — lo único que necesitaba arreglo era la
independencia de kcal respecto a los otros 3 macros.

### Tests (ver "Tests" arriba para el detalle)

`tests/ingredient-nutrition.test.js`: 1 test existente corregido (ya no
se puede exigir que la suma de kcal cuadre con `dish.kcal`, se corrigió
para exigir que sea Atwater-consistente con protein/carbs/fat), 4 tests
nuevos bajo "H": cero filas inconsistentes entre las 334 recetas reales,
el caso real de la mermelada verificado explícitamente, y confirmación
de que los ingredientes REALES nunca se recalculan por Atwater. Golden-
master de `plan-generator.characterization.test.js` recapturados (kcal
sube, tier/status pueden cambiar porque el plan alcanza el objetivo
calórico con menos relajación). 157 tests totales, 0 fallidos.

### Verificado en navegador real

Desktop y mobile: hot-reload de `nutrition.js` en la página ya cargada,
confirmado en vivo que "Mermelada light" en "Tostadas con ricotta y
mermelada" pasa de 0kcal a ~46kcal con sus mismos 11.5g de carbohidratos.
Plan completo generado con 0 errores de consola. Ciclo despensa completo
(comprar → cocinar) verificado sin regresión — stock decrementado
exactamente los gramos de cada comida. Modo "sin cocinar" verificado sin
regresión (usa `REAL_PRODUCTS` directamente, nunca pasa por
`nutrition.js`). Lista de la compra / `purchaseCost` sin regresión (no
se tocó `pricing.js`/`budget.js`/`dish-selector.js` en esta sesión, solo
`js/core/nutrition.js` y los tests).

## Sistema de cuentas (accounts) — Supabase Auth + Postgres + RLS (2026-08-13f)

Pedido explícito del usuario: convertir el sitio de invitado-solo
(localStorage) en una app multiusuario real — registro/login por email+
contraseña, login con Google, sesión persistente entre recargas, y TODOS
los datos personales sincronizados a una cuenta y accesibles desde
cualquier dispositivo — SIN reescribir el motor de nutrición y SIN
convertir el sitio (hoy estático en Cloudflare Pages) en un backend
propio. "No te limites a 'pegarle un login'" — el usuario pidió
explícitamente una capa de cuentas bien separada del dominio, con
migración de datos existentes bien pensada (idempotente, sin duplicados,
con manejo de conflicto), y sin fingir que algo funciona si de verdad
requiere aprovisionar un servicio externo que no puedo crear yo mismo.

**Por qué Supabase**: Auth (incluido Google OAuth) + Postgres + Row Level
Security, todo en el plan gratuito, y con un SDK que se sirve por CDN
como build UMD (`@supabase/supabase-js@2.112.3`, verificado en vivo antes
de usarlo — versión exacta fijada, no un tag flotante `@2`, mismo
criterio que ya se usa con GSAP `@3.12.5`) — encaja con "sin build
system" exactamente igual que la dependencia de GSAP que ya existía.
Alternativas descartadas: Firebase (Firestore encaja peor que Postgres
para blobs JSON por-usuario con RLS relacional) y Auth0/Clerk (solo auth,
necesitarían un SEGUNDO servicio para los datos — la complejidad extra
que el usuario pidió evitar).

**Modelo de sincronización — local-first / optimista, CERO cambios en el
dominio**: localStorage sigue siendo la fuente de verdad SÍNCRONA que
`pantry.js`/`render-pantry.js`/`calculator.js`/`meal-schedule.js`/
cualquier `js/engine/*` ya leían y escribían — ninguno de esos archivos
se tocó. Una capa nueva, completamente aparte:
1. Al iniciar sesión, hidrata localStorage desde la nube llamando a las
   funciones YA EXISTENTES `savePantryState`/`savePantryHistory`
   (`pantry.js`) más la nueva `saveSettings` (`settings.js`) — nunca
   reimplementa su forma de guardar.
2. Tras cada mutación local, empuja en segundo plano a Supabase (nunca
   bloquea la UI; un fallo de red no altera nada local, un reintento
   inmediato y si vuelve a fallar se rinde en silencio con un log).

**Módulos nuevos** (`index.html`, orden de carga: SDK de Supabase por CDN
justo después de GSAP → `js/data/supabase-config.js` antes que
`dishes.js` → `js/core/{supabase-client,settings,auth,cloud-sync,
migration}.js` justo después de `meal-schedule.js` y antes de
`dish-selector.js` → `js/ui/render-auth.js` justo después de
`render-no-cook.js` y antes de `animations.js`):

- `js/data/supabase-config.js` — `SUPABASE_URL`/`SUPABASE_ANON_KEY`.
  PÚBLICOS a propósito (la clave anon está diseñada por Supabase para
  vivir en el cliente; la seguridad real la da RLS, nunca ocultar esta
  clave) — placeholders hasta que el usuario aprovisione el proyecto real
  (ver checklist más abajo); mientras sean placeholders, TODA la app
  sigue funcionando en modo invitado exactamente igual que antes de esta
  sesión.
- `js/core/supabase-client.js` — `getSupabaseClient()`/
  `isSupabaseConfigured()`, singleton memoizado, nunca lanza, `null` si
  el SDK no cargó o la config sigue en placeholder (mismo patrón de
  dependencia opcional que `typeof gsap !== "undefined"`).
- `js/core/settings.js` — persistencia NUEVA (antes no existía en
  absoluto) del perfil/formulario (edad, sexo, peso, altura, actividad,
  entrenamientos, objetivo, presupuesto, tiempo de cocina, sabor,
  horario) en `nutritionPlanner.settings.v1`, mismo patrón defensivo
  exacto que `pantry.js` (saneado POR CAMPO, nunca lanza, fallback en
  memoria). Saneado deliberadamente solo de TIPO, no de rango de negocio
  — esas reglas siguen siendo solo de `calculator.js`, para que los dos
  módulos no diverjan con el tiempo sobre qué es "válido".
- `js/core/auth.js` — envoltorio fino sobre `supabase.auth`
  (signUp/signIn/signInWithGoogle/signOut/getCurrentUser/
  onAuthStateChange con fan-out a varios listeners propios pero UNA sola
  suscripción real al SDK) + `authErrorMessage()` puro (traduce errores a
  español, nunca expone el mensaje crudo del SDK). Deliberadamente NO
  decide qué hacer con los datos locales al iniciar/cerrar sesión — eso
  es 100% responsabilidad de `migration.js`, orquestado desde
  `render-auth.js` reaccionando a los eventos. Verificado con test
  explícito: `signOut()` nunca toca despensa/settings.
- `js/core/cloud-sync.js` — ÚNICO módulo que toca la tabla `user_data`.
  `pushPantryToCloud()`/`pushSettingsToCloud()`/`pushAllToCloud(opts)`/
  `pullCloudUserData()`, todas async, nunca lanzan ni rechazan (incluso
  un cliente roto que lance SÍNCRONAMENTE se atrapa). Un reintento
  inmediato tras un fallo, luego se rinde en silencio.
- `js/core/migration.js` — la pieza más delicada. Ver algoritmo exacto
  abajo.
- `js/ui/render-auth.js` — botón de perfil (topbar nuevo, antes de
  `.hero`), diálogo de acceso (`<dialog>` nativo — sin precedente de
  modal en el proyecto salvo `.disclosure` envolviendo `<details>`,
  mismo espíritu de preferir comportamiento nativo), diálogo de
  resolución de conflicto, y la orquestación de CUÁNDO reconciliar
  (`SIGNED_IN`/`INITIAL_SESSION`, una vez por usuario que aparece, nunca
  en `TOKEN_REFRESHED`).

**Esquema Postgres** (`supabase/schema.sql`, para pegar en el SQL Editor
del proyecto Supabase): una fila por usuario en `user_data`, tres
columnas JSONB que reflejan 1:1 las claves de localStorage
(`pantry_state`, `pantry_history`, `settings`) + `migrated_at` (solo
auditoría) — nunca una tabla normalizada por-ingrediente, porque
`pantry.js` ya trata cada bloque como un blob atómico y duplicar esa
decisión en dos sitios sería una fuente de divergencia. RLS activado,
políticas `auth.uid() = user_id` en select/insert/update (sin política
delete — no hay función de borrar cuenta). Un trigger
`security definer` aprovisiona la fila vacía en el instante del signup,
así el cliente JAMÁS necesita comprobar "¿existe ya mi fila?" — todas las
escrituras son `UPDATE`, nunca upsert.

**Migración/conflicto — el algoritmo, y el peligro real que corrige**:
la guarda de idempotencia NO es `migrated_at` (eso solo dice "¿esta
CUENTA alguna vez tuvo datos?", no "¿la caché de ESTE NAVEGADOR
pertenece a quien está iniciando sesión ahora?"). En un ordenador
compartido, si el usuario A sincroniza y cierra sesión sin que nadie
borre localStorage, y el usuario B inicia sesión después en el MISMO
navegador, un guardián basado solo en `migrated_at` podría tratar la
caché de A como "datos de invitado de B" y filtrarlos/mezclarlos hacia
la cuenta de B. Solución: un marcador POR NAVEGADOR,
`nutritionPlanner.cloudSyncedUserId.v1`, que registra a qué usuario
pertenece la caché local actual:
- `classifySyncState(local, cloud, syncedUserId, currentUserId)` (PURA,
  sin DOM/red) devuelve `'clear_cross_user'` (marcador de OTRO usuario →
  vaciar todo antes de nada más), `'already_synced'` (marcador del MISMO
  usuario → tirar de la nube sin preguntar NUNCA, aunque local y nube
  hayan divergido mientras tanto), `'conflict'` (ambos lados tienen
  contenido real, navegador nuevo → preguntar al usuario, nunca fusionar
  en silencio), `'push'` (solo local tiene datos → caso dominante del
  primer registro) o `'pull'` (solo la nube tiene datos, o ninguno).
- Conflicto resuelto por el usuario vía `render-auth.js`: mantener la
  nube / mantener este dispositivo / combinar (despensa: SUMA de gramos
  por ingrediente, aditiva por naturaleza; historial: concatenar +
  deduplicar por id + recortar a `PANTRY_HISTORY_MAX_ENTRIES`; settings:
  gana el lado con `updatedAt` más reciente ENTERO, nunca fusión campo a
  campo — mezclar un perfil físico de un momento con un objetivo de otro
  no es algo que el usuario guardara nunca junto).
- Al cerrar sesión (`onAuthSignOut`), se vacía la caché local del
  navegador — nada se pierde de verdad (la nube ya tiene la última copia
  sincronizada) y cierra el riesgo de ordenador compartido por
  construcción: el siguiente login en ese navegador siempre arranca
  limpio.
- Reconciliar dos veces seguidas sin mutar nada entre medias es un no-op
  REAL la segunda vez (`already_synced`, solo pull, cero pushes
  duplicados) — verificado con test explícito, es la idempotencia que el
  usuario pidió literalmente.

**Puntos de enganche en `app.js` (únicos cambios fuera de los módulos
nuevos)**: `syncAfterPantryChange()` (ya existía, se llama tras CADA
mutación de despensa) ahora también llama a `pushPantryToCloud()`;
`handleUsePlanToday()` llamaba a `savePlanForToday()` sin pasar por ese
hook — se añadió un segundo punto de enganche explícito ahí mismo (hueco
real encontrado durante el diseño, no algo que "ya funcionaba"); tras
generar un plan con éxito (`handleSubmit`), se guarda el formulario en
`settings.js` y se empuja a la nube; al cargar la página, se rellena el
formulario con lo último guardado (`applySettingsToForm`). `pantry.js`,
`render-pantry.js`, `calculator.js`, `meal-schedule.js` y todo
`js/engine/*`: **cero cambios**.

**Checklist de aprovisionamiento externo (requiere las cuentas propias
del usuario — no lo puedo hacer yo)**:
1. Supabase → nuevo proyecto (plan Free) → Settings→API: copiar Project
   URL + clave `anon public` (NUNCA `service_role`) a
   `js/data/supabase-config.js`.
2. Supabase → SQL Editor → pegar y ejecutar `supabase/schema.sql` entero.
3. Supabase → Authentication→URL Configuration → Site URL =
   `https://offline-nutrition-helper.pages.dev`, añadir esa URL y
   `http://localhost:8788` a la lista de Redirect URLs.
4. Supabase → Authentication→Providers→Google → copiar la callback URL
   que se muestra ahí (`https://<project-ref>.supabase.co/auth/v1/callback`).
5. Google Cloud Console → OAuth consent screen (External, estado
   Testing, añadir cada email real como "Test user" — no hace falta
   verificación de Google a esta escala) → Credentials → OAuth client ID
   (Web application) → Authorized JavaScript origins = el dominio de
   Cloudflare Pages + `http://localhost:8788`; Authorized redirect URIs
   = **SOLO** la callback URL de Supabase del paso 4 (Google redirige al
   dominio de Supabase, no al de la app — confusión real y común).
6. Pegar Client ID + Secret de vuelta en Supabase → Providers→Google →
   Enabled → Save.
7. Rellenar `js/data/supabase-config.js` con los valores reales del paso
   1, probar en local (`npx wrangler pages dev .`), desplegar
   (`npx wrangler pages deploy .`).

**Caching del navegador durante la verificación de ESTA sesión**: mismo
problema recurrente que ya documentaron sesiones anteriores (ver nota
técnica en el handoff de 2026-08-13e) pero esta vez más agresivo — hasta
`index.html` mismo se sirvió cacheado tras un `preview_start` nuevo (no
solo los `.js`), confirmado comparando `fetch(url)` vs.
`fetch(url,{cache:'no-store'})` (tamaños/Last-Modified distintos). Se
resolvió navegando a `index.html?nocache=<n>` para el documento, e
inyectando CSS/JS frescos vía `fetch(...,{cache:'no-store'})` + `eval()`
en el contexto ya cargado para los archivos MODIFICADOS (`app.js`,
`style.css` — los archivos NUEVOS de esta sesión nunca tienen entrada de
caché previa, así que siempre llegaron frescos). Es un artefacto del
entorno de desarrollo local, no del código ni de producción (un deploy
nuevo en Cloudflare Pages no tiene ningún usuario con caché previa de
estos archivos).

**Tests**: ver sección "Tests" arriba (66 nuevos, 4 archivos). La
lógica PURA (`classifySyncState`/`merge*`/`authErrorMessage`/
`hasSnapshotContent`) se testea directamente, sin red. La orquestación
async (`runReconciliation`/`resolveConflict*`/`push*`/`pull*`/las
funciones de `auth.js`) se testea con un cliente Supabase SIMULADO
inyectado tras cargar el código real (mismo patrón de inyección
post-carga que `createFakeLocalStorage()` ya usaba `pantry.test.js`) —
el sandbox Node `vm` no tiene red real, así que no hay otra forma
determinista de testear esta capa sin un proyecto Supabase real. El
propio `tests/run-tests.js` se extendió para soportar tests async (una
función de test puede devolver una promesa) manteniendo 100% de
compatibilidad con los tests síncronos existentes.

## Aprovisionamiento real de Supabase + Google OAuth — 2026-08-14a

Continuación directa de "Sistema de cuentas (accounts) — Supabase Auth +
Postgres + RLS (2026-08-13f)" arriba — mismo código, cero reescritura,
solo aprovisionamiento externo + verificación en vivo contra un backend
real. El usuario proporcionó, en dos rondas mínimas (una por servicio
externo, cada una un único bloque de acciones):

**Ronda 1 — Supabase**: el usuario creó el proyecto
(`tizrdycctkiwdcmlyqku.supabase.co`), ejecutó `supabase/schema.sql` en el
SQL Editor, desactivó "Confirm email" (Authentication → Providers →
Email — así se pudo verificar el flujo completo de sesión sin depender
de acceso a una bandeja de entrada), configuró Site URL/Redirect URLs a
`https://offline-nutrition-helper.pages.dev`, y pasó el Project URL +
clave `anon public`. Verificado ANTES de fijar el valor en
`js/data/supabase-config.js`: `GET /rest/v1/user_data` con esa clave y
sin sesión → `[]` (RLS activo, tabla existe). Nota sobre las claves:
Supabase ofrece ahora dos formatos equivalentes para el cliente —
`sb_publishable_...` (nuevo) y el JWT `anon` clásico — ambos verificados
como funcionalmente idénticos contra la API real antes de elegir; se usó
el nuevo `sb_publishable_...` por ser el que Supabase recomienda hacia
adelante.

**Ronda 2 — Google Cloud Console**: el usuario creó un OAuth Client ID
(Web application) con el redirect URI exacto que le di
(`https://tizrdycctkiwdcmlyqku.supabase.co/auth/v1/callback` — el
dominio de Supabase, NO el de la app, la confusión más común en este
tipo de configuración) y pasó Client ID + Client Secret. El Client
Secret **nunca se escribió en ningún archivo del repo** — solo se usó
para instruir al usuario a pegarlo él mismo en Supabase → Authentication
→ Providers → Google (yo no tengo Management API / Personal Access
Token de Supabase, así que esa pantalla concreta es la única que no
pude tocar directamente).

**Config final** (`js/data/supabase-config.js`, único archivo cambiado
en esta sesión, commit `f66bfac`): `SUPABASE_URL` +
`SUPABASE_ANON_KEY` reales. Ambos públicos por diseño — la clave anon/
publishable está pensada por Supabase para vivir en el cliente, la
seguridad real la da RLS, no el secreto de la clave (ver cabecera del
propio archivo).

**Verificación en vivo — no solo tests, no solo UI, contra el backend
real** (`https://tizrdycctkiwdcmlyqku.supabase.co`), primero en local
(`http://localhost:5250` vía el servidor estático del proyecto) y
repetida después en producción:

1. **Registro real** (email+contraseña por la UI real, no simulado):
   sesión concedida de inmediato (email confirm off), `getCurrentUser()`
   devuelve el usuario correcto. Confirmado por REST directo con el
   `access_token` de la sesión: el trigger `handle_new_user` había creado
   la fila `user_data` — y ya contenía, migrados, los datos de invitado
   que existían en ese navegador ANTES del registro (edad/objetivo/
   presupuesto de una generación de plan previa) — la migración 'push'
   ocurrió sola, sin intervención, en el primer `SIGNED_IN`.
2. **Recarga de página**: sesión persiste (el propio SDK de Supabase la
   guarda en localStorage), formulario sigue relleno.
3. **"Dispositivo nuevo" simulado de verdad**: `localStorage.clear()`
   completo (incluida la sesión) → recarga → vuelve a modo invitado
   limpio (`getCurrentUser() === null`, despensa vacía, edad por
   defecto) → login manual con el mismo usuario → **edad y despensa
   exactas recuperadas de la nube** (edad 41, despensa con "aguacate"
   150g y "arroz blanco cocido" 321g, ambos añadidos ANTES de vaciar
   localStorage, ambos ya en la nube gracias al push automático tras
   cada mutación real de despensa vía la UI — ver nota sobre
   `setStock()` directo vs. el botón real "Añadir" abajo).
4. **Idempotencia real**: recargar de nuevo sin cambiar nada → mismo
   usuario, mismos 3 ingredientes en despensa, ni uno más — la rama
   `already_synced` de `classifySyncState()` no vuelve a empujar nada
   (confirmado, no solo asumido del test unitario).
5. **Conflicto real**: con el navegador ya limpio (logout borra la caché
   local, ver `onAuthSignOut`), se creó despensa de invitado NUEVA
   ("almendras" 77g) y LUEGO se inició sesión con el mismo usuario (que
   ya tenía datos en la nube) → se abrió el diálogo de conflicto de
   verdad, `cloudSyncedUserId` seguía `null` (nada se decidió solo) →
   se pulsó "Combinar" → resultado: los 3 ingredientes previos de la
   nube + el nuevo de invitado, TODOS presentes, en local Y en la nube
   por igual (confirmado releyendo la fila vía REST tras la fusión).
6. **Logout**: vacía despensa/settings/marcador locales, vuelve a
   "Invitado" — confirmado que un login posterior de OTRO usuario en el
   mismo navegador arranca limpio (el caso de "ordenador compartido" que
   `migration.js` existe para prevenir).
7. **Aislamiento entre usuarios — probado como pidió el usuario
   explícitamente: atacando la API, no solo mirando la interfaz**. Con
   el `access_token` real del Usuario B recién registrado:
   - `GET /rest/v1/user_data` sin filtro → solo devuelve la fila del
     propio Usuario B (vacía), nunca la del Usuario A.
   - `GET /rest/v1/user_data?user_id=eq.<id-del-Usuario-A>` (intento
     explícito de leer la fila de otro usuario POR SU ID) → `[]`, RLS la
     hace invisible en vez de devolver un error de permisos.
   - `PATCH /rest/v1/user_data?user_id=eq.<id-del-Usuario-A>` con un
     payload de ataque (`{"pantry_state":{"hacked":{"grams":9999}}}`) →
     `HTTP 200` pero **`body: []`, CERO filas afectadas**. Se releyó
     después la fila real del Usuario A (con su propio token) y seguía
     exactamente igual, sin ningún rastro de "hacked" — RLS bloqueó la
     escritura de verdad, a nivel de base de datos, no de interfaz.
8. **Google OAuth**: se disparó `signInWithOAuth({provider:'google'})`
   con `skipBrowserRedirect` para poder inspeccionar la URL antes de
   navegar, y luego SÍ se navegó de verdad por la cadena completa
   Supabase → Google. `accounts.google.com` devolvió una pantalla de
   login real (no un error) con `client_id` y `redirect_uri` EXACTOS a
   los configurados — prueba de que Google aceptó la configuración del
   lado de Supabase. **Límite explícito, deliberado**: no se introdujo
   ninguna credencial de Google real (violaría la regla de no manejar
   nunca contraseñas ajenas) — la verificación se detuvo exactamente en
   el punto donde un humano tiene que autenticarse de verdad, tal como
   pidió el usuario ("остановись только на этом конкретном внешнем
   шаге").
9. **Regresión del resto de la app**: 246 tests (`node tests/run-tests.js`
   + `node poc/tests/run-tests.js`) en verde tras el cambio de config.
   En navegador: generar plan, "Usar este plan hoy", "Marcar compra como
   hecha" (sumó stock de los 11 ingredientes del plan de ejemplo
   correctamente), "Marcar como cocinado" (restó exactamente lo
   consumido de una comida, dejó el resto intacto), modo "sin cocinar",
   y mobile 375px sin desbordamiento horizontal — todo en modo invitado,
   cero interacción con la capa de cuentas, confirmando que sigue
   totalmente desacoplada.

**Nota técnica encontrada durante la verificación (no es un bug de la
app)**: llamar a `setStock()` directamente (saltándose el botón real
"Añadir" de la UI) NO dispara el push a la nube — es coherente y
correcto: ese push vive en el callback `onPantryChange` que solo
`render-pantry.js` invoca desde sus propios manejadores de evento reales,
nunca desde una llamada directa a la función de dominio. Confirmado con
el flujo real (seleccionar ingrediente + gramos + clic en "Añadir") que
el push sí ocurre y arrastra el estado COMPLETO de la despensa (incluida
cualquier entrada anterior), no solo lo último añadido — comportamiento
esperado de `pushPantryToCloud()` (siempre serializa el blob entero, ver
cabecera de `cloud-sync.js`), no una regresión.

**Deploy**: commit `f66bfac` en `main`, pusheado, desplegado a Cloudflare
Pages (`npx wrangler pages deploy .`, reutilizando la sesión OAuth de
`wrangler` ya existente, sin pedir un token nuevo). Verificado en la URL
de producción real (`https://offline-nutrition-helper.pages.dev`, no
solo local): mismo usuario de prueba, mismos datos recuperados desde la
nube — confirma que producción habla con el mismo proyecto Supabase real,
no con una config distinta olvidada.

**Usuarios de prueba creados durante esta verificación** (quedan en el
proyecto Supabase real, no se borraron — son inofensivos, ninguno tiene
datos sensibles, ambos con el email `andreyostrik228+claudetest...
@gmail.com`, alias del propio email del usuario): si se quiere una base
de datos "limpia" antes de un uso real, se pueden borrar manualmente
desde Supabase → Authentication → Users. No es necesario para que el
sistema funcione correctamente para usuarios reales nuevos.

## Rediseño de UX de la Despensa — 2026-08-14b

Pedido explícito del usuario, con una restricción clara: NO tocar la
arquitectura (`js/core/pantry.js` funciona bien y no se toca), el
problema es puramente de presentación. Cita literal: "даже я, автор
приложения, иногда не понимаю логику интерфейса".

**Diagnóstico**: la versión anterior (`js/ui/render-pantry.js` previo a
esta sesión) mezclaba en una única lista plana `<details>` tres objetos
mentales distintos:
1. El stock actual (lo que de verdad es "la despensa").
2. El historial COMPLETO de cada plan confirmado, hasta 30 entradas,
   siempre todas expandidas de golpe.
3. Dentro de cada entrada del historial, dos sub-etapas técnicas de la
   máquina de 3 etapas de `pantry.js` (ver su cabecera) siempre visibles
   sin jerarquía: un checklist de compra con casillas, y 5 botones
   idénticos "Marcar como cocinado" (uno por comida).

El resultado era, para cualquier usuario con más de un par de días de
uso, una pared vertical de estados internos del modelo de datos, no una
lista de "lo que tengo en casa". Edición de cantidades: solo pasos
ciegos de ±50g (botones `+`/`-`), sin forma de corregir a un número
exacto sin varios clics o vaciar y volver a añadir. Alta manual: un
`<select>` con las 81 opciones alfabéticas del catálogo de golpe.

**Mental model nuevo** (la frase que el propio usuario propuso como
objetivo, textual): "Esto son productos que ya tengo en casa. El sitio
los tiene en cuenta al hacer la lista de la compra. Si uso/compro
productos a través de un plan, las cantidades se actualizan solas."

**Rediseño implementado** — 3 bloques con roles claros, misma lógica de
`pantry.js` sin ningún cambio:

1. **Stock** (`pantryListContainer`) — fila = nombre + cantidad tocable
   + icono de borrar. Tocar la cantidad la convierte en un
   `<input type=number>` in-situ con el valor exacto actual ya
   seleccionado (`beginEditPantryRow()`); Enter/perder el foco confirma
   (`setStock`), Escape cancela sin guardar nada. Reemplaza los pasos
   ciegos de ±50g.
2. **Planes activos** (`pantryActiveContainer`, nuevo) — SOLO los planes
   confirmados con algo pendiente: falta comprar, o falta cocinar
   alguna comida (`isEntryFullyCooked()`). La acción de compra por
   defecto es un único botón primario "Ya compré todo esto" (llama a
   `markPurchaseDone(id, [])`, sin exclusiones) — el checklist de
   exclusión para quien de verdad no compró todo sigue existiendo
   (`markPurchaseDone(id, excludedNames)`, sin cambios en la firma ni en
   `pantry.js`), pero detrás de un enlace secundario "¿Te faltó algo?"
   (oculto por defecto, `hidden` toggled por JS, ver
   `handleEntryClick`). Las comidas se marcan con chips compactos en una
   fila que envuelve (`renderMealChips`, con el horario `meal.time`
   como badge cuando existe, recuperado del código previo) en vez de 5
   filas apiladas repitiendo "Marcar como cocinado".
3. **Historial** (`pantryHistoryContainer`, dentro de un `<details>`
   anidado `pantryHistoryDisclosure`, oculto por completo si está
   vacío) — planes YA completados (`isEntryFullyCooked() === true`),
   como una fila de resumen de solo lectura, una línea por plan. Un plan
   se muda aquí SOLO, automáticamente, en cuanto se completa — nunca
   hay que archivarlo a mano. Verificado en vivo: al marcar la última
   comida cocinada, la tarjeta desaparece de "planes activos" y aparece
   en el historial colapsado en el mismo re-render.

**Alta manual**: `<input list="pantryIngredientOptions">` (autocompletado
nativo, filtra mientras se escribe) en vez del `<select>` de 81
opciones. A diferencia del `<select>`, el navegador NO obliga a que el
valor final sea una de las opciones del `<datalist>` — se resuelve el
texto tecleado contra `normalizeIngredientKey()` (`pricing.js`) antes de
guardar nada (`resolveTypedIngredientName()`); si no coincide con ningún
ingrediente conocido, se muestra un error inline
(`#pantryAddError`) y NO se guarda — nunca se crea una clave de
despensa huérfana que ningún plan futuro llegaría a igualar. Probado en
vivo: "arroz blanco COCIDO" (mayúsculas/espacios distintos) resuelve
correctamente al nombre canónico "Arroz blanco cocido"; un nombre
inventado muestra el error y no toca el stock.

**Empty state**: icono + explicación de qué es la despensa y para qué
sirve (no solo "está vacía"), apuntando implícitamente al formulario de
alta que está justo encima.

**Qué NO cambió** (confirmado explícitamente, no solo asumido):
`js/core/pantry.js` — cero cambios, mismas 8 funciones expuestas, misma
firma; `js/core/budget.js`/`js/engine/*` — cero cambios; el modelo
`local-first` de sincronización con la nube (`js/core/cloud-sync.js`,
`js/core/migration.js`) — cero cambios, sigue enganchado exactamente en
los mismos puntos de `app.js` (`syncAfterPantryChange`,
`handleUsePlanToday`); `js/ui/render-shopping-list.js` — cero cambios
(la nota "Ya en tu despensa: Xg" que ya mostraba ya era clara, no hacía
falta tocarla).

**Verificado en vivo** (desktop + mobile 375px, navegador real, no solo
unit tests): añadir con nombre válido/inválido/con mayúsculas y espacios
distintos; editar a un valor exacto por tap + Enter; cancelar con
Escape sin guardar; borrar; el efecto en la lista de la compra
(purchaseCost de "Nueces" bajó a €0 con la nota "Ya en tu despensa: 28
g" en cuanto se añadió a la despensa); "Usar este plan hoy" → tarjeta
activa con chips de 5 comidas y horario; "Ya compré todo esto" (stock
pasó de 1 a 14 entradas, coste real €13.77); marcar las 5 comidas
cocinadas una a una → la tarjeta se mueve sola al historial colapsado;
reload (stock y historial sobreviven); sesión iniciada con una cuenta
real ya existente de la sesión anterior → conflicto detectado
correctamente (datos de invitado nuevos vs. datos de la cuenta),
resuelto con "mantener este dispositivo", verificado que la nube quedó
exactamente igual que lo local vía REST directo; modo "sin cocinar" sin
regresión; 0 errores de consola en toda la verificación. Los 246 tests
existentes siguen en verde (ninguno carga `render-pantry.js`, es capa
de presentación pura sin cobertura de tests, igual que el resto de
`js/ui/*` en este proyecto).

**Nota de depuración de la propia verificación (no es un bug de la
app)**: al probar los chips de comida haciendo clic sobre un array de
referencias DOM capturado ANTES de la primera interacción, solo el
primer clic surtía efecto — cada `markMealCooked()` dispara un
`renderPantryPanel()` completo que reemplaza los nodos, dejando el
resto de referencias del array obsoletas/desconectadas del documento.
Solucionado volviendo a consultar el DOM fresco antes de cada clic. Un
usuario real, tocando un chip a la vez en la pantalla, nunca se
encuentra con esto.

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
2. ~~**Ingredient nutrition and cost are fabricated by mass allocation.**~~
   **RESUELTO PARA MACROS 2026-08-13d, para 50 de 81 ingredient roles**
   (ver "Rediseño del modelo de nutrición por ingrediente" arriba).
   kcal/protein/carbs/fat de un ingrediente RESUELTO (con producto real
   verificado en `js/data/ingredient-nutrition.js`) ya NO se reparten por
   cuota de gramos del `dish.kcal` agregado a mano — son el dato real por
   100g del producto verificado, escalado linealmente. Para los 31 roles
   restantes sin dato fiable (Plátano entre ellos — confirmado sin
   solución disponible: `poc/INGREDIENT_COVERAGE.md`, el único candidato
   real con nutrición es plátano macho, subespecie distinta), el modelo
   calcula un REMANENTE (el total del plato menos lo que ya aportan los
   ingredientes resueltos, nunca negativo) y lo reparte SOLO entre ellos
   — nunca diluye el dato real de un ingrediente resuelto. La UI ya NO
   muestra ese remanente como si fuera un hecho verificado (aviso
   explícito "macros por ingrediente no verificados" en su lugar). El
   **coste** ya no se fabrica así desde 2026-08-08: `pricing.js` calcula
   `usageCost` ingrediente a ingrediente con precios reales/estimados, y
   `purchaseCost` por paquete real (agregado desde 2026-08-08, marginal
   durante la selección desde 2026-08-13). Lo que SIGUE pendiente: los 31
   roles sin dato fiable, y la migración completa de `dishes.js` en sí
   (Fase 1-2 de `ROADMAP.md`, ampliar más allá del 50/81 actual requiere
   más productos verificados en `real-products.js`, no una tarea de
   código).
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
   al modo "sin cocinar".** ~~Tampoco está conectada a `dish-selector.js`
   (no influye en qué platos se eligen)~~ — **ya no es así desde
   2026-08-13**: la SELECCIÓN de plato ahora SÍ es consciente de despensa
   (vía coste de compra marginal, ver "Presupuesto de compra MARGINAL
   durante la selección" más abajo); lo único que sigue sin conectar es el
   modo "sin cocinar". Ambas eran decisiones de arquitectura deliberadas
   en su momento, no descuidos — ver sección Despensa arriba para el
   razonamiento completo de por qué se pospuso originalmente. No es un
   "bug", pero cualquiera que asuma sincronización multi-dispositivo se
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
- Grafo de Graphify del frontend **regenerado 2026-08-13d** (377 nodes/609
  edges/39 communities, incluye ya `js/core/nutrition.js`/`js/data/
  ingredient-nutrition.js`) — ver `PythonProject/docs/graphify.md`. Se
  desactualiza de nuevo en cuanto se toque código sin volver a correr
  `graphify update .` + `graphify cluster-only .` (frontend) + `graphify
  merge-graphs` (PythonProject) — no se actualiza solo.

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

## Session handoff (2026-08-14b)

Escrito para que la siguiente sesión/chat pueda continuar sin haber visto
esta conversación. No repite lo de arriba en detalle — apunta a la
sección correspondiente. La sesión 2026-08-13 tuvo 6 tramos en un mismo
día: **(a)** presupuesto de compra MARGINAL durante la selección, **(b)**
bug real de precio en `renderFoodRow` (2026-08-13b), **(c)** mitigación
en la UI del bug de macros fabricados (2026-08-13c), **(d)** rediseño
ARQUITECTÓNICO completo del modelo de nutrición por ingrediente
(2026-08-13d), **(e)** auditoría del "recorte a cero" + consistencia
Atwater (2026-08-13e), **(f)** sistema de cuentas completo en CÓDIGO
(Supabase Auth + Postgres + RLS, todavía sin proyecto real). El día
siguiente tuvo 2 tramos más: **2026-08-14a** aprovisionó Supabase +
Google OAuth de verdad y verificó todo en vivo contra el backend real
(registro, login, reload, sync, logout, migración, aislamiento entre
usuarios probado atacando la API, y Google OAuth hasta el límite de
necesitar credenciales humanas — ver "Aprovisionamiento real de Supabase
+ Google OAuth — 2026-08-14a" arriba); **2026-08-14b** (esta sesión, la
más reciente) rediseñó por completo la UX de la Despensa sin tocar
`js/core/pantry.js` ni el modelo financiero — ver "Rediseño de UX de la
Despensa — 2026-08-14b" arriba. Este handoff describe el estado
ACUMULADO tras los 8 tramos.

**Para orientarse en el código en sí, antes de leer archivo por archivo,
usa el grafo de Graphify** (regenerado al final de esta sesión — 388
nodes/620 edges/38 communities — `graphify explain "<símbolo>"` /
`graphify query "<pregunta>"` desde esta carpeta, ver `PythonProject/
docs/graphify.md`). **Si se toca código después de esto, el grafo vuelve
a desactualizarse** — no se actualiza solo; regenerar con `graphify
update . --no-cluster && graphify cluster-only .` si hace falta.

**Estado del proyecto**: prototipo funcional, con una red de tests (246,
ver "Tests" arriba), un rediseño visual v2 + layout mobile, una
**Despensa completa** (3 etapas, mismas de siempre) con **UX rediseñada
por completo** (2026-08-14b — stock editable in-situ, planes activos
separados del historial completado, alta con autocompletado, ver
sección dedicada), un **horario de comidas completo**, un
presupuesto que significa dinero de COMPRA (no de uso, desde 2026-08-08),
la SELECCIÓN de plato consciente de coste de compra MARGINAL (desde
2026-08-13), **kcal/protein/carbs/fat por ingrediente REALES para 50 de
81 roles** (desde 2026-08-13d; antes: 0 — todo era reparto del total del
plato por peso), con la consistencia interna de kcal corregida
(2026-08-13e — kcal ya no puede contradecir el resto de macros de su
propia fila), y ahora un **sistema de cuentas completo Y FUNCIONANDO EN
PRODUCCIÓN** (código 2026-08-13f, aprovisionado y verificado en vivo
2026-08-14a) — registro/login por email+contraseña, login con Google
(configurado y verificado hasta el límite de necesitar credenciales
humanas reales), sesión persistente, despensa/historial/settings
sincronizados a la nube por cuenta (probado con dispositivo nuevo
simulado), migración invitado→cuenta automática e idempotente,
aislamiento entre usuarios confirmado a nivel de RLS/API (no solo UI), y
modo invitado preservado íntegro para quien no quiera cuenta. El
generador ahora se comporta, en la
medida de lo que la arquitectura actual permite, como pediría un
nutricionista real: prefiere activamente envases baratos de comprar,
reutiliza despensa y paquetes ya comprometidos, y muestra la composición
nutricional real de cada ingrediente cuando existe un dato verificado —
nunca una cifra fabricada con apariencia de precisión que no tiene, y
nunca una fila donde un macro contradiga a otro de la misma fila.

**Commit/branch/deploy actuales**: `main`/`origin/main` en `f66bfac`
(verificar con `git log -1`/`git status -sb` antes de asumir que sigue
siendo así). Dos commits desde el `c758a01` con el que arrancó la sesión
2026-08-13: `aa4f20b` (todo el código/esquema/tests del sistema de
cuentas, sesión 2026-08-13f) y `f66bfac` (solo `js/data/
supabase-config.js` con los valores reales del proyecto Supabase
aprovisionado, sesión 2026-08-14a). **Desplegado a producción** —
`offline-nutrition-helper.pages.dev` (Cloudflare Pages, proyecto
direct-upload, `Git Provider: No` — un push a `origin/main` NUNCA
despliega solo, hace falta `wrangler pages deploy` explícito cada vez,
ya ejecutado y verificado para ambos commits). **Nota**: sigue habiendo
basura suelta sin relación en la raíz del repo (preexistente, nunca
comiteada a propósito) — no tocarla sin que se pida.

**Qué funciona**: generación de plan completo (5 tomas, horario, macros)
con presupuesto de COMPRA real decidido desde la SELECCIÓN de plato,
consciente de despensa y paquetes ya comprometidos; lista de la compra
trazable al mismo número que usó el generador; cada ingrediente de una
tarjeta de comida muestra coste de uso + precio de envase (siempre) y
proteína/carbos/grasas reales cuando hay dato verificado, con aviso
explícito cuando no (nunca ambos a la vez, nunca un número fabricado);
modo "sin cocinar" (con horario y macros reales de `REAL_PRODUCTS`, nunca
tocado por este cambio); catálogo de productos; la Despensa completa
(comprar → cocinar por comida → deshacer, influye en selección y recorte
final); el formulario ahora recuerda el último perfil guardado entre
recargas (novedad 2026-08-13f); **registro/login por email+contraseña
REALES, login con Google configurado y verificado hasta el límite de
credenciales humanas, sesión persistente, sincronización de despensa/
historial/settings a la nube, migración invitado→cuenta automática e
idempotente, aislamiento entre usuarios confirmado a nivel de RLS/API —
todo esto verificado en vivo contra el proyecto Supabase real, en local
Y en producción (2026-08-14a, ver sección dedicada)**; los 246 tests.

**Qué NO funciona / sigue pendiente**: 31/81 ingredient roles siguen sin
nutrición fiable (Plátano, Salmón, Tempeh, Aguacate, Brócoli, Pepino,
Arroz integral cocido, Pasta cocida, Cuscús cocido... lista completa en
`js/data/ingredient-nutrition.js` o `poc/INGREDIENT_COVERAGE.md`) — para
esos, el total del plato/comida sigue siendo correcto en AGREGADO
(remanente, ver modelo arriba) pero no hay un número por-ingrediente
verificable, y la UI lo dice explícitamente en vez de inventarlo;
`mainProt` mal reportado (issue #5); hueco de cobertura en `packaging.js`
(issue #7); interacción cap25/recorte de presupuesto sin corregir (issue
#8, sin cambios); Despensa sigue sin conectar al modo "sin cocinar"
(issue #9); no hay recordatorios de cocina separados (a propósito); **el
bug de CSS de `.actions`/`.panel`/`.meal-head` desbordando el viewport en
mobile (~375px vs. contenedor ~391-395px, mencionado en handoffs
anteriores desde 2026-08-08, `task_089a68aa`) sigue sin investigar a
fondo** — confirmado de nuevo en esta sesión (mismo orden de magnitud,
NO empeorado por los cambios de hoy), pero sigue fuera de alcance.
**Fuera de alcance deliberado** (pedido explícito del usuario): NO se
construyó optimización multi-día de compra (ver sección de presupuesto
marginal); NO se completó la migración Fase 1-2 completa de
`ROADMAP.md` (ampliar más allá del 50/81 actual requiere MÁS productos
verificados en `real-products.js`, trabajo del lado Python, no de este
repo). **Límite honesto de la verificación de Google OAuth**: se
confirmó toda la cadena técnica (config de Supabase, config de Google,
`client_id`/`redirect_uri` aceptados por Google sin error) hasta el
punto exacto en que un humano tendría que introducir sus credenciales
reales de Google — eso NUNCA se hizo (violaría la regla de no manejar
contraseñas ajenas) y por tanto un login completo por Google en
producción, de principio a fin, todavía no lo ha probado nadie
literalmente — la próxima persona que use el botón real "Continuar con
Google" será la primera prueba end-to-end completa; no hay ninguna razón
técnica para esperar que falle, pero no está confirmado con la misma
certeza que el resto.

**Qué se cambió en TODA la sesión (2026-08-13, los 5 tramos)** — resumen
de archivos, ver cada sección dedicada arriba para el detalle:
- **(a) Presupuesto marginal**: `js/core/budget.js` (+4 funciones),
  `js/engine/dish-selector.js` (`pickDish` reescrito), `js/engine/
  plan-generator.js` (`committedGrams`), `tests/purchase-economics.test.js` (nuevo).
- **(b)+(c) Precio y macros (UI)**: `js/ui/render.js` (`renderFoodRow`
  usa `resolvePurchaseCost`, no `resolvePackageInfo().packagePrice`).
- **(d) Modelo de nutrición**: `js/data/ingredient-nutrition.js` (nuevo,
  81 entradas), `js/core/nutrition.js` (nuevo,
  `resolveIngredientNutrition`/`computeDishIngredientNutrition`),
  `js/engine/dish-selector.js` (`buildMealFromDish` reescrito para usar
  lo anterior; `totalItemGrams` eliminado, sin llamadores), `js/ui/
  render.js` (P/C/G por ingrediente reintroducido, condicionado a
  `nutritionSource==='real'`), `assets/css/style.css`
  (`.food-macro__badge`/`.food-macro__unavailable`), `index.html` (2
  scripts nuevos en el orden correcto), `tests/ingredient-nutrition.test.js`
  (nuevo, 15 tests), `tests/plan-generator.characterization.test.js`
  (golden-master recapturado).
- **(e) Auditoría del recorte a cero + consistencia Atwater**: SOLO
  `js/core/nutrition.js` (`computeDishIngredientNutrition` — kcal de
  ingredientes sin resolver ya no es un remanente independiente, se
  deriva por Atwater de su propio protein/carbs/fat), 1 test corregido +
  4 nuevos en `tests/ingredient-nutrition.test.js`,
  `tests/plan-generator.characterization.test.js` (golden-master
  recapturado de nuevo).
- **(f) Sistema de cuentas**: `js/data/supabase-config.js`,
  `js/core/supabase-client.js`, `js/core/settings.js`, `js/core/auth.js`,
  `js/core/cloud-sync.js`, `js/core/migration.js` (todos nuevos),
  `js/ui/render-auth.js` (nuevo), `index.html` (SDK de Supabase por CDN +
  8 scripts nuevos, topbar + 2 `<dialog>` nuevos), `js/app.js` (nuevos
  refs DOM, `applySettingsToForm`, extensión de `syncAfterPantryChange`,
  hook nuevo en `handleUsePlanToday`, guardado de settings en
  `handleSubmit`), `assets/css/style.css` (sección "Cuenta"),
  `supabase/schema.sql` (nuevo), `tests/settings.test.js`,
  `tests/migration.test.js`, `tests/cloud-sync.test.js`,
  `tests/auth.test.js` (todos nuevos), `tests/run-tests.js` (soporte
  async + los 4 nuevos suites).
- Todos los sandboxes de test que cargan `dish-selector.js` (5 archivos)
  actualizados para cargar `ingredient-nutrition.js`/`nutrition.js`.
- **NO tocados en ningún tramo**: `js/core/pricing.js`, `js/core/
  pantry.js`, `js/core/meal-schedule.js`, `js/core/calculator.js`,
  `js/data/dishes.js`, `js/data/packaging.js`, `js/data/budget-presets.js`,
  `js/engine/no-cook-generator.js`, `js/ui/render-pantry.js`, `poc/`
  (ningún archivo) — confirmado explícitamente para (f): el sistema de
  cuentas no tocó NINGÚN archivo de dominio/motor.
- Documentación: este archivo, `PROJECT.md`, `ROADMAP.md`. Grafo de
  Graphify pendiente de regenerar tras (f)/(g) (regenerado tras (a)-(e),
  no después).
- **(g) Aprovisionamiento real (2026-08-14a, sesión distinta, un día
  después)**: SOLO `js/data/supabase-config.js` — placeholders
  reemplazados por el Project URL + clave `anon public`/`publishable`
  reales del proyecto Supabase que el usuario aprovisionó. Cero cambios
  de código; todo el resto de (f) se usó tal cual, sin reescribir nada.

**Qué se verificó y qué no**: los 180 tests se re-ejecutaron y pasan
(verificado, no heredado) — 13 de `purchase-economics.test.js` + 18 de
`ingredient-nutrition.test.js` (15+4 nuevos, 1 corregido) son de hoy, 2
golden-master recapturados TRES veces en el día (presupuesto marginal,
modelo de nutrición, consistencia Atwater),
sin regresión en el resto (incluidos los 7 tests de invariantes de
`plan-generator.characterization.test.js`, que NO se tocaron en ningún
tramo y siguieron pasando — confirma que el contrato observable del
generador no se rompió en ningún momento del día). Verificado EN VIVO en
navegador real (desktop 1280×800 y mobile 375×812) en cada tramo:
generación de plan completo con 0 errores de consola; el ejemplo EXACTO
del bug original reportado por el usuario (plátano en "Cacahuetes con
plátano") ya no reproduce; ciclo despensa completo "Usar plan hoy" →
"Marcar compra como hecha" → "Marcar como cocinado" con stock exacto
verificado leyendo `localStorage` directamente; modo "sin cocinar" sin
regresión; presupuestos personalizados 8€/12€/20€; prueba aislada
DEFINITIVA del efecto de despensa sobre purchaseCost (positiva); y la
prueba aislada del modelo de nutrición nuevo (banana pasa de proteína
fabricada a aviso explícito, cacahuete muestra su proteína real sin
diluir). **Nota técnica de la verificación, ya recurrente en esta
sesión**: el navegador de este entorno sirvió copias CACHEADAS (HTTP
heurístico) de varios archivos tras CADA `preview_start` nuevo — se
resolvió siempre igual: `fetch(url, {cache:'no-store'})` + `eval()` del
código fresco en el contexto de la página ya cargada, en orden de
dependencia (datos → core → engine → ui). Si una futura sesión ve un
`ReferenceError` de una función que SÍ existe en el archivo fuente,
sospechar de esto primero antes de asumir un bug de código real.

**Verificación específica del tramo (f)**: los 246 tests se re-ejecutaron
y pasan (verificado, no heredado). En navegador (modo invitado, único
modo posible sin proyecto Supabase real): 0 errores de consola; botón de
perfil muestra "Invitado" de inmediato (no se queda colgado en "…" — bug
real encontrado y corregido durante esta misma verificación, ver
`renderProfileButton` en la cabecera de `render-auth.js`); el diálogo de
acceso abre/cierra, valida el formulario vacío, alterna login↔registro
correctamente, y muestra el aviso "cuentas no disponibles todavía" en
vez de fingir que el login funciona; generación de plan / despensa
("Usar plan hoy") / "sin cocinar" sin regresión alguna; el formulario
persiste entre recargas (edad/peso/objetivo/presupuesto/horario, round-
trip completo verificado leyendo `localStorage` directamente); layout
mobile (375×812) sin desbordamiento horizontal, diálogo cabe dentro del
viewport. En ese momento (2026-08-13f) NO se había podido verificar
registro/login real, Google OAuth, aislamiento entre cuentas, ni
migración contra una base de datos real — **eso se cerró al día
siguiente, ver "Verificación específica del tramo (g)" justo debajo**,
no sigue pendiente.

**Verificación específica del tramo (g) (2026-08-14a, contra el proyecto
Supabase REAL, no un simulado)**: ver la sección dedicada
"Aprovisionamiento real de Supabase + Google OAuth — 2026-08-14a" arriba
para el detalle completo punto por punto. Resumen: registro/login/logout/
reload/migración (push, pull, conflicto+combinar, idempotencia)
verificados con llamadas REST reales usando tokens de sesión reales, no
solo la UI; aislamiento entre usuarios confirmado intentando leer/
escribir la fila de otro usuario directamente por API (0 filas afectadas
en el intento de escritura); Google OAuth verificado hasta el límite
exacto de necesitar credenciales humanas (nunca traspasado, a propósito);
246 tests siguen en verde; producción re-verificada tras el deploy con
el mismo usuario de prueba recuperando los mismos datos. **Lo único que
sigue sin un login por Google 100% de principio a fin realizado por una
persona real** — la cadena técnica está confirmada, falta solo el primer
uso real del botón.

**Decisiones de arquitectura que no hay que perder**: la comparación
completa de Estrategia A/B/C (migración de datos) y por qué se eligió B
está en `ROADMAP.md` — no la repitas de memoria. La distinción
usageCost/purchaseCost/purchaseCost-MARGINAL está fijada en las
cabeceras de `js/core/pricing.js`/`js/core/budget.js`/`js/engine/
dish-selector.js`/`js/engine/plan-generator.js`. **La distinción NUEVA de
hoy**: `item.nutritionSource` (`'real'` | `'estimated'`) — `'real'`
significa dato verificado de `js/data/ingredient-nutrition.js`,
`'estimated'` significa remanente del plato repartido entre los
ingredientes sin resolver (ver cabecera de `js/core/nutrition.js` para
el modelo exacto, incluido el límite conocido del recorte a 0). NUNCA
confundir esto con `priceSource` (`'catalog'`/`'category'`/`'default'`/
`'real_product'`, de `pricing.js` — es sobre PRECIO, no sobre macros, un
ingrediente puede tener `priceSource:'real_product'` y
`nutritionSource:'estimated'` a la vez, son ejes independientes).
`committedGrams` (plan-generator.js, purchase economics) tampoco es lo
mismo que el remanente de `nutrition.js` (macros) — dos conceptos de
"lo que sobra" completamente distintos, en dominios distintos, no
fusionarlos.

**Prioridad actual**: el sistema de cuentas está COMPLETO y verificado en
producción — ya no es la prioridad. Opcional, no bloqueante: que una
persona real complete un login por Google de principio a fin al menos
una vez (ver límite honesto arriba); considerar borrar los usuarios de
prueba `andreyostrik228+claudetest...@gmail.com` desde Supabase →
Authentication → Users si se quiere una base limpia antes de invitar a
usuarios reales (no imprescindible, son inofensivos). Aparte de eso,
sigue pendiente Fase 1 del roadmap de migración de nutrición (ampliar
cobertura de datos reales más allá del 50/81 actual, ver `ROADMAP.md` —
requiere que el pipeline Python verifique más productos en
`real-products.js`, no es tarea de este repo en solitario); investigar
el bug de overflow mobile `.panel`/`.meal-head`/`.actions`; conectar la
Despensa al modo "sin cocinar" (issue #9); regenerar el grafo de
Graphify (desactualizado desde antes de (f)/(g)).

**Qué no romper**: los `id="..."` del HTML; `data.budget` sigue siendo
purchaseCost, no usageCost; `enforcePurchaseBudgetCap` sigue siendo la
red de seguridad final; `js/core/budget.js` sigue siendo la ÚNICA fuente
de verdad para purchaseCost del día; `js/core/nutrition.js` (nuevo hoy)
es la ÚNICA fuente de verdad para macros por ingrediente — no
reimplementar el reparto por gramos en ningún otro sitio, esa es
precisamente la regresión que este archivo existe para prevenir;
`js/data/ingredient-nutrition.js` es una PROMOCIÓN de `poc/data/
ingredient-rules-full.js`, no una fuente independiente — si `poc/`
resuelve más ingredientes en el futuro (Fase 1), hay que re-promoverlos
aquí explícitamente, no hay sincronización automática entre los dos
archivos; `pickDish` requiere `committedGrams`/`pantryState` como
argumentos 9 y 10; `buildMealFromDish` ya NO calcula macros inline, usa
`computeDishIngredientNutrition` — no revertir a la fórmula de reparto
por gramos; dentro de esa función, kcal de un ingrediente sin resolver
NUNCA debe volver a tener su propio remanente anclado a `dish.kcal` — se
deriva por Atwater de protein/carbs/fat, esa es la regresión que
2026-08-13e existe para prevenir. Los 246 tests deben seguir pasando
después de cualquier cambio en `js/core/`, `js/engine/`, `js/ui/`, o
`assets/css/style.css`.
Específico de la Despensa: `applyPlanToPantry()` y
`markHistoryEntryCooked()` **ya no existen** (v1→v2); el orden de
arranque en `js/app.js` y `safeInit()` son intencionales.
Específico del sistema de cuentas (2026-08-13f): `js/core/pantry.js`,
`js/ui/render-pantry.js`, `js/core/calculator.js`, `js/core/
meal-schedule.js` y todo `js/engine/*` deben seguir sin ninguna
dependencia de auth/Supabase — si algún cambio futuro les hace falta
"saber" si hay sesión iniciada, es una señal de que la separación de
capas se está rompiendo, pararse a repensarlo; `js/core/migration.js` es
la ÚNICA fuente de verdad para la máquina de estados de sincronización
(`classifySyncState`) — no reimplementar esa lógica en `render-auth.js`
ni en `app.js`; la guarda de idempotencia/propiedad real es
`nutritionPlanner.cloudSyncedUserId.v1` (marcador POR NAVEGADOR), NUNCA
`migrated_at` (columna de solo auditoría) — ver "el peligro real" en la
sección dedicada antes de tocar esto; `js/core/cloud-sync.js` es el
ÚNICO módulo que debe llamar a `supabase.from('user_data')...` —
cualquier otro sitio que empiece a construir queries Postgres es la
regresión que ese módulo existe para prevenir; `js/data/
supabase-config.js` nunca debe llevar una `service_role` key, solo la
`anon public`/`publishable`. Específico de 2026-08-14a: el proyecto
Supabase real ya existe (`tizrdycctkiwdcmlyqku.supabase.co`) y está en
`js/data/supabase-config.js` en claro — es intencional y seguro (ver
cabecera del archivo), no "arreglarlo" volviendo a placeholders sin que
se pida; el Google Client Secret NUNCA se escribió en ningún archivo del
repo, solo vive en el dashboard de Supabase — si algún día hace falta
rotarlo, es un paso manual en Supabase, no algo que tocar aquí.

Lee `PROJECT.md` y `ROADMAP.md` además de este archivo. Para el sistema
completo (con el pipeline Python), lee también `PythonProject/docs/
architecture.md` y `PythonProject/docs/data_flow.md`. No asumas que el
estado descrito aquí sigue siendo exacto sin verificar contra el código —
esto es una foto fija al final de la sesión 2026-08-14 (tramo a).
