# Nutrition Planner — Engineering State

Actualizado 2026-08-20. Lee esto junto con `PROJECT.md` y `ROADMAP.md` antes
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

**Resumen de la sesión 2026-08-20b (fix real: overflow horizontal en
mobile — localizado por fin a `.pantry-meal-chip`, bug documentado sin
diagnosticar desde 2026-08-08)**: sesión nueva (sin memoria de la
conversación anterior), que empezó pidiendo un resumen de orientación y
luego una sugerencia de fix para uno de los issues abiertos del handoff
— el usuario eligió el overflow horizontal mobile
(`.actions`/`.panel`/`.meal-head`/`.pantry-meal-chip`, reconfirmado en
2026-08-08 y de nuevo en 2026-08-14c vía A/B con `git stash`, pero nunca
localizado a un elemento concreto). Diagnóstico en vivo ANTES de tocar
nada (servidor real, viewport 375×812, medición DOM directa —
`getBoundingClientRect()`/`scrollWidth`, no solo inspección visual):
`.pantry-meal-chip` tiene `white-space:nowrap` sin `min-width:0`/
`max-width` dentro de un contenedor `flex-wrap:wrap` — un chip con un
nombre de plato largo (ej. "07:30✓ Desayuno — Crepes de avena con
requesón y fruta") se niega a encoger por debajo de su propio contenido
(`min-width:auto`, valor por defecto de un flex item) y fuerza el
DOCUMENTO ENTERO a ensancharse para acomodarlo — confirmado midiendo
`document.documentElement.scrollWidth`: 412px en vez de 375px, con ese
chip solo en 383px de ancho. `.actions`/`.panel`/`.meal-head`,
mencionados en el mismo known issue desde siempre, nunca tuvieron un
overflow independiente — solo heredaban el viewport ya ensanchado por
este chip (confirmado: fijar SOLO `.pantry-meal-chip` basta para que
TODO el documento vuelva a 375px, cero elementos desbordando en un
escaneo completo del DOM). Fix de una sola regla en `assets/css/
style.css` (`.pantry-meal-chip`): `overflow:hidden; text-overflow:
ellipsis; max-width:100%; min-width:0` — el chip ahora se trunca con
"…" en vez de forzar el layout (el nombre completo del plato ya se ve en
la propia tarjeta de comida, así que no se pierde información), más un
`title="<label completo>"` nuevo en el botón (`js/ui/render-pantry.js`,
`renderMealChips`) para que quede recuperable al pasar el ratón. 251
tests re-ejecutados, 0 fallidos (cambio de solo CSS + un atributo, sin
lógica tocada). Verificado en vivo contra los archivos REALES servidos
(cache-bust explícito del `<link>` de CSS, no solo un `<style>` de
prueba inyectado): `scrollWidth` 412px→376px (~375, redondeo), 0
elementos desbordando el viewport tras el fix (antes: 5, incluido el
propio chip), truncamiento con elipsis confirmado de verdad
(`scrollWidth`>`clientWidth` con `overflow:hidden`, no un clip
silencioso), y en desktop el mismo chip largo se muestra completo SIN
truncar (confirma que `max-width`/`min-width` solo actúan cuando el
contenedor realmente aprieta). `js/core/pantry.js` y el resto de
`js/engine/*` — cero cambios; solo `assets/css/style.css` y un atributo
`title` en `render-pantry.js`. Cierra el known issue de overflow mobile
documentado desde 2026-08-08. Ver sección dedicada "Fix real: overflow
horizontal en mobile — .pantry-meal-chip — 2026-08-20b" más abajo para
el detalle completo.

**Resumen de la sesión 2026-08-19 (bug real: "Confirmar plan" repetido
inflaba la despensa — `savePlanForToday()` ahora hace UPSERT sobre el
borrador del día)**: el usuario encontró en uso real que pulsar
"Confirmar plan de hoy" (antes "Usar este plan hoy") más de una vez —
por ejemplo al regenerar el plan mientras decide qué comer — dejaba
varias tarjetas "comprables" por separado en "Tu plan" para lo que él
percibía como UN solo plan; si llegaba a marcar la compra en más de una,
el stock se inflaba varias veces por la misma compra real. Reproducido
en vivo ANTES de tocar nada (3 clics reales sobre el botón → 3 entradas
de historial independientes → comprar en las 3 dejó, por ejemplo,
"Leche" en 1000g y "Alubias cocidas" en 570g, claramente multiplicado).
Causa raíz: `savePlanForToday()` (Etapa 1, pura contabilidad, nunca tocó
stock directamente) SIEMPRE creaba una entrada nueva en el historial,
sin ninguna noción de "esto sigue siendo un borrador sin confirmar de
verdad" — cada entrada nueva era, por diseño de la sesión 2026-08-14c,
"comprable" de forma independiente. Rediseño (no un parche puntual):
`savePlanForToday()` ahora es un UPSERT sobre el borrador de HOY —
si ya existe una entrada de hoy sin nada real encima (`hasRealPantryAction()`,
nueva: ni `purchase.done` ni ninguna comida cocinada), la ACTUALIZA en
el sitio (mismo `id`, meals/createdAt/store sustituidos) en vez de crear
una copia; en cuanto esa entrada tiene algo real (se compró o se
cocinó algo), pasa a ser un hecho protegido y confirmar un plan distinto
ese mismo día SÍ crea una entrada nueva genuina — nunca sobrescribe
dinero ya gastado o comida ya consumida. Efecto: regenerar/editar el
plan y volver a confirmar cuantas veces haga falta, ANTES de comprar o
cocinar nada, es ahora seguro por construcción — no puede, por sí
mismo, producir más de una entrada comprable el mismo día. Botón
renombrado "Usar este plan hoy" → "Confirmar plan de hoy" (refleja la
nueva semántica idempotente); aviso tras confirmar distingue "Plan
confirmado" (entrada nueva) de "Plan actualizado" (mismo borrador,
tranquilizando explícitamente: "no se ha comprado ni cocinado nada
todavía"). 8 tests nuevos en `tests/pantry.test.js` (238 en `tests/`,
261 totales con `poc/tests/`), incluida la regresión EXACTA del bug
reportado (confirmar 3 veces + comprar 1 vez dejando exactamente 1
paquete, no 3). Verificado en vivo con clics REALES sobre el botón real
(no solo llamadas a funciones): 3 clics de "Confirmar" seguidos → 1 sola
tarjeta en "Tu plan", 1 sola entrada de historial; comprar UNA vez →
stock exacto de 1 compra; confirmar un plan nuevo DESPUÉS de comprar →
SÍ crea una segunda tarjeta genuina, correctamente. 0 errores de
consola. `js/core/budget.js`, `js/core/pricing.js`, `js/core/
meal-schedule.js`, `js/core/cloud-sync.js`, `js/core/migration.js`, y
todo `js/engine/*` — cero cambios; `markPurchaseDone`/`markMealCooked`
tampoco cambiaron (ya eran correctos e idempotentes-seguros, el bug
estaba únicamente en cuántas entradas producía la Etapa 1). Ver sección
dedicada "Confirmar plan: UPSERT sobre el borrador del día — 2026-08-19"
más abajo para el detalle completo. Comiteado y desplegado junto con los
tramos (k)/(l) — ver "Commit/branch/deploy actuales" en el handoff para
el hash exacto.

**Resumen de la sesión 2026-08-19b (stress-test masivo del generador +
fix real de diversidad — `TOP_CANDIDATES_POOL` eliminado, protein/€
reequilibrado en `dish-selector.js`)**: el usuario pidió un stress-test
GLOBAL (no unos pocos ejemplos) del generador con un perfil fijo — 1000
generaciones reales de `generateDietPlan()` vía sandbox `vm` (mismo
patrón que `tests/*.test.js`, cero cambios de código en esa fase),
instrumentando `pickWeightedByScore`/`pickWeightedFromTop` para medir el
tamaño REAL del pool de candidatos antes de cualquier recorte. Hallazgo
antes de tocar nada: desayuno y comida (las dos categorías cuyo score es
casi determinista, procesadas primero con `usedState`/`committedGrams`
todavía vacíos) solo mostraron **12 platos distintos cada una** en 1000
generaciones — exactamente `TOP_CANDIDATES_POOL`, de un catálogo de 64 y
110 respectivamente —, y el 89%/72% de comida/cena nunca se eligió,
casi exclusivamente carne/pescado (formula de score en modo "tight"
decidía SOLO por proteína/€ de compra marginal, sin mirar macroFit en
absoluto). Tras el informe (ver Artifact publicado en la conversación),
el usuario pidió arreglarlo directamente: **(1)** `TOP_CANDIDATES_POOL`
eliminado de `dish-selector.js` — la lotería softmax pondera ahora TODO
el pool filtrado por presupuesto, no solo los 12 mejores por score (el
propio softmax ya da peso ~0 a candidatos muy alejados del máximo, el
recorte manual no aportaba nada que esa ponderación no hiciera sola,
solo excluía candidatos con probabilidad pequeña pero real). **(2)**
`scoreDishForSelection` reequilibrado: el modo "tight" ahora SIEMPRE
cuenta `macroFit` (antes: nunca, solo protein/€ de compra ×100 en
solitario) y baja el peso de `purchasePpeBucket` de ×100 (casi la única
variable) a ×40 junto a `macroFit×20` — sigue siendo el criterio más
pesado cuando el presupuesto aprieta (la intención original del modo),
pero ya no excluye matemáticamente categorías enteras de platos; el modo
"allocation" solo sube `purchasePpeBucket` de ×1 a ×3 como desempate algo
más presente. 2 golden-master de `tests/plan-generator.characterization.test.js`
recapturados a propósito (cambian qué plato gana la lotería para la
misma semilla — exactamente el caso que la cabecera de ese archivo ya
preveía); los 7 tests de invariantes/contrato de ese mismo archivo NO
se tocaron y siguen pasando, confirmando que presupuesto/tiempo/cap25%
siguen sin superarse jamás sin declararlo. 261 tests, 0 fallidos (mismo
total, solo 2 recapturados). **Repetición del stress-test tras el fix,
mismo perfil, mismas 1000 generaciones**: cobertura desayuno 18.8%→98.4%
(12→63/64), comida 10.9%→80.0% (12→88/110), cena 27.7%→81.2%
(28→82/101); platos de "comida" nunca elegidos 98→22 de 110; platos
distintos usados en total 93→291 de 334 (27.8%→87.1%); planes
completamente únicos 97.8%→99.9%. Carne/pescado confirmados en vivo en
el navegador real (no solo en el stress-test): dos generaciones
consecutivas mostraron "Jamón serrano con kiwi", "Sardinas con arroz y
coliflor", "Sandwich integral de pavo y queso" — ninguno aparecía nunca
antes del fix. **Coste honesto del cambio, no escondido**: el generador
necesita relajación (tiempo/sabor/cap25%) con más frecuencia — tier 0
("perfect") bajó de 52.3% a 31.7% de las generaciones, status "minimal" subió
de 3.0% a 9.7%, violaciones `cap25` de 41 a 228 sobre 1000 — un
edge-case YA documentado (issue #8, interacción entre
`enforce25PercentRule` y el recorte de presupuesto), reportado con más
frecuencia porque ahora se eligen platos menos "eficientes" en
protein/€ que antes quedaban excluidos, no una garantía rota (los 7
tests de invariantes lo confirman). Verificado en vivo sin errores de
consola. `js/core/budget.js`, `js/core/pricing.js`, `js/core/
plan-generator.js`, `js/core/meal-schedule.js`, toda la despensa — cero
cambios; solo `js/engine/dish-selector.js` y el golden-master de
`tests/plan-generator.characterization.test.js`. Ver sección dedicada
"Diversidad del generador: eliminación de TOP_CANDIDATES_POOL y
reequilibrio de protein/€ — 2026-08-19b" más abajo para el detalle
completo. Comiteado y desplegado junto con los tramos (j)/(l) — ver
"Commit/branch/deploy actuales" en el handoff para el hash exacto.

**Resumen de la sesión 2026-08-19c/d (reserva de presupuesto + reparto
secuencial — el generador se atasca menos en presupuesto SIN perder la
diversidad ganada en 19b)**: continuación directa de 19b — el usuario
pidió que el generador tuviera más libertad para no atascarse en
presupuesto. Primer intento (19c, idea original del usuario): reservar
internamente ~12% del presupuesto como colchón de diversidad
(`data.targetBudget`, `BUDGET_RESERVE_RATIO`), sin tocar nunca el techo
real ni las cifras de ahorro que ve el usuario. **Medido con el mismo
stress-test de 1000 generaciones de 19b: prácticamente inerte** — no
movía las cifras, porque la factibilidad (por qué escala de tier por
presupuesto) se decide en `dish-selector.js` contra el techo duro sin
reservar, no contra el objetivo reducido. Se dejó el código (inofensivo)
pero no resolvía el problema. Segundo intento (19d, propuesto y aprobado
tras reportar lo anterior): reparto SECUENCIAL del presupuesto — las
tomas tempranas (desayuno, comida) ahora reciben un `mealCap` recortado a
la mitad de camino entre su techo real y su porción proporcional
(`ratio` calórico) del margen restante, dejando más presupuesto
garantizado a las tomas siguientes. Probado primero a plena fuerza
(recorte proporcional completo) y descartado tras medirlo — mejoraba
violaciones de calorías (-53%) pero costaba ~20pp de cobertura de platos
en desayuno/comida y subía un 25% las violaciones de cap25, en contra del
objetivo de diversidad. Suavizado a la mitad (`SEQUENCING_BLEND_RATIO =
0.5`) y confirmado con el mismo stress-test: `status:"perfect"` 240→251,
tier 0 (sin relajar) 321→339, violaciones `cap25` 253→245, `calories`
36→29, `time` 40→33, cobertura global de platos 86.2%→86.8% (desayuno sin
cambio, comida -2.7pp) — mejora limpia en casi todos los ejes, sin el
coste de diversidad del intento a plena fuerza. `report.budgetDelta`
verificado en vivo contra `data.budget` real en todo momento (nunca
contra ningún número intermedio del reparto). Golden-master recapturado 4
veces (una por cada cambio real de algoritmo); los 7 tests de
invariantes/contrato no se tocaron y siguen pasando. 261 tests, 0
fallidos. Solo `js/engine/plan-generator.js` y
`tests/plan-generator.characterization.test.js` — `dish-selector.js` sin
cambios en esta sub-sesión. Ver "Reserva de presupuesto y reparto
secuencial — 2026-08-19c/d" más abajo para el detalle completo con
tablas. Comiteado y desplegado junto con los tramos (j)/(k) — ver
"Commit/branch/deploy actuales" en el handoff para el hash exacto.

**Resumen de la sesión 2026-08-20 (bug real: "Generar plan" podía crear
tarjetas "Tu plan" duplicadas el mismo día — gate + reemplazo explícito
del plan activo)**: el usuario reportó en uso real que, con un plan ya
confirmado y comprado, pulsar "Generar plan" otra vez y confirmar el
resultado dejaba DOS tarjetas "Tu plan" activas para el mismo día, cada
una con sus propios chips de "cocinado" ya desbloqueados — reproducido en
vivo antes de tocar nada (confirmar+comprar, generar de nuevo,
confirmar → 2 tarjetas distintas). Causa raíz: el UPSERT de 2026-08-19
protege un borrador SIN acción real, pero en cuanto una entrada de hoy
tiene algo real encima (comprado y/o cocinado), `savePlanForToday()` crea
una entrada NUEVA a propósito (correcto, para no pisar dinero gastado o
comida cocinada) — pero "Generar plan" nunca avisaba de que eso iba a
pasar. Fix (aprobado por el usuario tras proponer 2 fases y elegir
empezar por la primera): `handleSubmit()` (`js/app.js`) ahora comprueba
`findTodayEntry()` + `hasRealPantryAction()` + `isEntryFullyCooked()`
(las 3 en `js/core/pantry.js`) antes de generar. Si hay un plan de hoy con
algo real encima y todavía algo pendiente, no genera nada: abre un
diálogo nuevo (`showPlanReplaceDialog`, `js/ui/render-pantry.js`,
`<dialog>` nativo con el mismo patrón que el de conflicto de
sincronización) que redirige a esa tarjeta y pregunta explícitamente. Solo
tras elegir "Cambiar el plan completo" se genera un plan nuevo, y al
confirmarlo se llama a la función nueva `replacePendingMealsForToday()`
en vez del UPSERT normal — reemplaza las comidas NO cocinadas de la
entrada existente (nunca crea una tarjeta nueva), preserva intactas las
que ya se cocinaron, y resetea `purchase.done` a `false` (conservando
`purchase.runs`) porque los ingredientes reemplazados casi siempre
cambian. Un borrador puro o un plan ya completado del todo NO interrumpen
a propósito (ver razonamiento completo en la cabecera de `pantry.js`).
Esto REFINA, no revierte, la decisión de 2026-08-14c de permitir varios
planes el mismo día -- sigue siendo posible, pero ahora requiere una
elección explícita. 13 tests nuevos en `tests/pantry.test.js`
(`isEntryFullyCooked` ×4, `findTodayEntry` ×4, `replacePendingMealsForToday`
×5) — 274 tests totales (251 en `tests/` + 23 en `poc/tests/`), 0
fallidos. Verificado en vivo reproduciendo el escenario
completo: confirmar+comprar → generar de nuevo → gate abre el diálogo (no
genera nada) → "Cambiar el plan completo" → confirmar → sigue siendo 1
sola tarjeta, aviso "Plan reemplazado", estado de compra reseteado
correctamente; y por función directa (los clics sintéticos en el chip de
comida no se registraban de forma fiable en este entorno de automatización
concreto -- limitación conocida ya documentada en sesiones anteriores, no
un bug de la app: `markMealCooked()`/`replacePendingMealsForToday()`
llamados directamente confirmaron el comportamiento exacto, comida
cocinada conservada tal cual, el resto reemplazado). `js/engine/*` — cero
cambios; `js/core/budget.js`/`pricing.js`/`meal-schedule.js` — cero
cambios. Ver "Gate en Generar plan + reemplazo explícito — 2026-08-20" más
abajo para el detalle completo. **Sin commitear a la hora de escribir
esto** — pendiente de decisión del usuario, ver "Session handoff".

**Resumen de la sesión 2026-08-14c (auditoría de arquitectura de Despensa
+ reubicación de "Tu plan" fuera del acordeón — SIN tocar la lógica de
negocio de `pantry.js` salvo un campo nuevo, `planDate`)**: continuación
directa de la sesión 2026-08-14b, en la misma conversación. El usuario
pidió primero una auditoría completa (mental model, código, historial de
decisiones intencionales vs. compromisos históricos) antes de proponer
nada — ver conversación para el análisis punto por punto (CURRENT MODEL /
UX PROBLEMS / POSSIBLE MODELS / RECOMMENDATION / ...). Diagnóstico: la
arquitectura de DATOS de `pantry.js` es sólida (33+ tests, ya sobrevivió
un rediseño real por un bug de usuario) — el problema real es que
tarjetas de comida, lista de la compra, y las acciones de comprar/cocinar
(enterradas en el acordeón colapsado de despensa) eran tres secciones de
página sin ningún vínculo visual para lo que el usuario vive como un solo
flujo continuo ("Modelo A" del análisis: Despensa = inventario puro,
Today = flujo unificado, History = capa aparte). Implementado tras 4
preguntas arquitectónicas explícitas respondidas por el usuario: varios
planes el mismo día SÍ permitidos (no se reemplazan); cobertura de
despensa mostrada solo CONTEXTUALMENTE junto al plan activo, nunca como
barra global permanente; comprar/cocinar se mantienen como 2 pasos
separados (no se fusionan); CSS desktop-first, igual que el resto del
proyecto (sin pivote mobile-first). Cambios: **(1)** `js/core/pantry.js`
gana `planDate`/`getEntryPlanDate()`/`formatLocalDateKey()` — campo
NUEVO en cada entrada, separado de `createdAt` (mismo patrón que
`migrated_at` vs. `cloudSyncedUserId` en migration.js: uno es auditoría,
el otro es el campo que decide), con fallback seguro a la fecha derivada
de `createdAt` para entradas antiguas sin él; `savePlanForToday()` NUNCA
fusiona ni reemplaza una entrada existente — varios planes el mismo día
es una decisión explícita del usuario, no un descuido. **(2)** Las
tarjetas de "plan activo" (comprar/cocinar) se sacaron por completo del
acordeón de despensa a una sección NUEVA, siempre expandida, "Tu plan"
(`#todayPlansPanel`/`#todayPlansContainer`), justo debajo de la lista de
la compra — despensa vuelve a ser solo stock + historial de planes YA
completados. **(3)** Fecha Y HORA CON SEGUNDOS (no solo minutos) en cada
tarjeta para distinguir varios planes del mismo día — verificado en vivo
que con solo minutos, dos planes guardados a pocos clics de diferencia
SÍ caían en el mismo minuto y volvían a verse "iguales" (justo lo que
esto debía evitar); con segundos, nunca coinciden. **(4)** Nota de
cobertura de despensa ("X g ya en tu despensa") añadida a la tarjeta de
plan activo y a su checklist de compra — antes esa información solo la
mostraba la lista de la compra, inconsistencia real que la propia
auditoría encontró comparando ambas vistas. 7 tests nuevos en
`tests/pantry.test.js` (230 en `tests/`, 253 totales con `poc/tests/`), 0
fallidos. Verificado en vivo en navegador (desktop + mobile 375px, ver
sección dedicada más abajo para el detalle punto por punto), incluido un
A/B real con `git stash` que confirmó que un overflow horizontal de
`.pantry-meal-chip` encontrado durante la verificación YA EXISTÍA antes
de este cambio (es el known issue de overflow mobile ya documentado,
`.actions`/`.panel`/`.meal-head` — no una regresión nueva). `js/core/
budget.js`, `js/core/pricing.js`, `js/core/meal-schedule.js`, `js/core/
cloud-sync.js`, `js/core/migration.js`, y todo `js/engine/*` — cero
cambios. Comiteado en `35f35a8`. Ver sección dedicada "Reubicación de 'Tu
plan' fuera de la despensa — 2026-08-14c" más abajo para el detalle
completo.

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
Comiteado en `e11308d`+`f0b70e0`+`9612687`.

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

## Tests (actualizado 2026-08-20)

Dos suites, ambas Node + `vm` (cargan los archivos de producción reales,
sin copiarlos ni envolverlos en `module.exports`), sin ningún framework:

- `tests/` (producción): `node tests/run-tests.js` → **251 passed, 0
  failed** (verificado en esta sesión) — `shopping-cost.test.js` (14), `budget-mode.test.js` (13),
  `plan-generator.characterization.test.js` (9, golden-master recapturado
  2026-08-08 tras el rediseño de presupuesto, y de nuevo 6 veces más entre
  2026-08-19b y 2026-08-19d — cada una tras un cambio real de algoritmo en
  `dish-selector.js`/`plan-generator.js` que cambia qué plato gana la
  lotería con semilla fija; ver "Diversidad del generador" y "Reserva de
  presupuesto y reparto secuencial" más abajo — los 7 tests de
  invariantes/contrato de este mismo archivo NUNCA se han tocado),
  `ingredient-packaging-coverage.test.js` (2), `pantry.test.js` (68,
  2026-08-06/07, +7 en 2026-08-14c, +8/-1 en 2026-08-19, +13 en 2026-08-20
  — ver sección Despensa arriba y "Gate en Generar plan..." más abajo;
  cubre almacenamiento con fallback en memoria,
  localStorage real inyectado, JSON corrupto, entradas individuales
  corruptas, las 3 etapas del ciclo de vida, el caso exacto reportado por
  el usuario — comprar sin cocinar deja el stock íntegro, no neteado —,
  regresión de compatibilidad con `shopping-cost.test.js` sin
  `pantry.js` cargado, `planDate`/`getEntryPlanDate()`/
  `formatLocalDateKey()` (fecha LOCAL con ceros a la izquierda, distinta
  de `createdAt`, entradas antiguas sin `planDate` lo derivan de
  `createdAt` en hora local, `planDate` corrupto cae al mismo fallback),
  y desde 2026-08-19 `hasRealPantryAction()` + el UPSERT de
  `savePlanForToday()` sobre el borrador del día: confirmar dos veces
  seguidas sin comprar/cocinar actualiza la MISMA entrada en vez de crear
  una segunda, y la regresión EXACTA del bug reportado por el usuario —
  confirmar 3 veces + comprar 1 vez deja exactamente 1 paquete comprado,
  nunca 3 —, confirmar tras comprar o tras cocinar SÍ crea una entrada
  nueva genuina, y `createdAt` se refresca en cada actualización del
  borrador mientras `id`/`planDate` se mantienen estables; y desde
  2026-08-20 `isEntryFullyCooked()` (ninguna/algunas/todas las comidas
  cocinadas, nunca lanza con entrada corrupta), `findTodayEntry()` (sin
  entradas, entrada de hoy sin filtrar por estado, entrada de otro día,
  varias entradas de hoy -- devuelve la más reciente) y
  `replacePendingMealsForToday()` (reemplaza lo no cocinado y conserva TAL
  CUAL lo ya cocinado, resetea `purchase.done` conservando `purchase.runs`,
  no toca nada si todo ya estaba cocinado, refresca `createdAt` manteniendo
  `id`/`planDate`, `entryId` inexistente devuelve `null`)),
  `meal-schedule.test.js`
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
- Total: **274 tests, 0 failed** (251 en `tests/` + 23 en `poc/tests/`) —
  re-ejecutado y verificado en la sesión 2026-08-20 (no solo heredado de
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

## Reubicación de "Tu plan" fuera de la despensa — 2026-08-14c

Continuación directa de la sesión anterior en la misma conversación. El
usuario, tras aceptar el rediseño de UX 2026-08-14b, dijo explícitamente
que la despensa seguía sin convencerle a nivel de arquitectura/UX de más
alto nivel — "даже я, автор приложения, иногда не понимаю логику
интерфейса" ya se había citado en 2026-08-14b, pero el problema real
resultó ser mayor que una sola lista mal agrupada. Pidió una auditoría
completa ANTES de proponer nada (ver la conversación para el documento de
análisis completo, no repetido aquí en detalle).

**Diagnóstico de la auditoría** (resumen; ver conversación para el
análisis punto por punto): la arquitectura de datos de `pantry.js` es
correcta y no necesitaba cambios — 3 etapas desacopladas, un solo total
corriente por ingrediente, purchaseCost/usageCost bien separados, 33+
tests. El problema real era de INFORMACIÓN ARQUITECTÓNICA de página:
tres secciones sin ningún vínculo visual (tarjetas de comida →
`mealsContainer`; lista de la compra → `shoppingPanel`; acciones de
comprar/cocinar → enterradas dentro del acordeón COLAPSADO de despensa,
dos secciones de página más abajo) representaban lo que el usuario vive
como un solo flujo continuo ("mi plan de hoy"). Problemas concretos
confirmados leyendo el código, no supuestos: (1) `savePlanForToday()`
nunca deduplicaba por fecha — guardar dos planes el mismo día producía
dos tarjetas con la misma etiqueta de fecha, indistinguibles a simple
vista; (2) las tarjetas de comida (`render.js`) no tenían NINGUNA
referencia a pantry/cooked — confirmado que `render.js` no menciona
ninguno de los dos; (3) la tarjeta de "plan activo" en despensa mostraba
los gramos agregados en crudo, sin la nota "ya en tu despensa" que la
lista de la compra sí mostraba para el mismo dato — inconsistencia real
entre dos vistas de la misma información.

**Decisión**: Modelo A (Despensa = inventario puro / "Tu plan" = flujo
unificado de hoy / Historial = capa aparte de solo lectura) + Modelo C
(fecha explícita del plan, separada de la marca de auditoría) del
análisis, NO el Modelo B más agresivo (fusionar tarjetas de comida y
plan activo en un solo componente) — este último habría dado más
ganancia de UX pero a costa de reescribir la pantalla más usada de la
app, sin tests de UI que la protejan; se descartó por riesgo/beneficio,
no por pereza.

**4 preguntas arquitectónicas resueltas por el usuario antes de
implementar** (no se asumieron por defecto):
1. ¿Varios planes activos el mismo día? → **Permitir varios**, no
   reemplazar el existente. Implica que `savePlanForToday()` sigue sin
   hacer upsert, y que la UI necesita distinguir tarjetas del mismo día
   por algo más que la fecha.
2. ¿Resumen de despensa siempre visible? → **Solo con plan activo** — no
   se construyó ninguna barra global permanente; la cobertura de
   despensa se muestra SOLO dentro de la tarjeta de "Tu plan", nunca
   fuera de ese contexto.
3. ¿Comprar y cocinar en un solo paso? → **Mantener 2 pasos separados**
   (comportamiento de `markPurchaseDone`/`markMealCooked` intacto, cero
   cambios de firma ni de semántica).
4. ¿Mobile-first para este bloque? → **No** — desktop-first con
   overrides móviles, igual que el resto de `assets/css/style.css`.

**Implementación**:
- **`js/core/pantry.js`**: `formatLocalDateKey(date)` (fecha LOCAL
  "YYYY-MM-DD", nunca `toISOString().slice(0,10)` que es UTC y puede
  desplazar el día cerca de medianoche) + `getEntryPlanDate(entry)`
  (usa `entry.planDate` si existe y tiene forma válida, si no lo deriva
  de `entry.createdAt` — mismo patrón defensivo que ya usa `meal.time`
  para entradas antiguas). `savePlanForToday()` ahora guarda
  `entry.planDate` además de `entry.createdAt` — son conceptualmente
  distintos (uno es "a qué día de calendario pertenece este plan", el
  otro es "cuándo se creó el registro", igual que `migrated_at` no es la
  guarda de idempotencia real en `migration.js`) aunque hoy coincidan
  siempre en la práctica (el botón sigue llamándose "Usar este plan
  HOY"). Sigue sin haber upsert/reemplazo — decisión explícita (pregunta
  1 arriba). 7 tests nuevos en `tests/pantry.test.js`.
- **`index.html`**: nueva `<section class="today-plans-panel"
  id="todayPlansPanel" hidden>` ("Tu plan"), colocada como hermana de
  `shoppingPanel`/`pantryPanel`, justo después de la lista de la compra.
  Se quitó `<div class="pantry-active" id="pantryActiveContainer">` de
  dentro de `pantryPanel`; el `<details>` de despensa ahora solo
  contiene el formulario de alta, el stock, y el historial (renombrado
  de "Ver planes anteriores" a "Historial de planes completados" — ya
  no ambiguo, dado que lo activo vive en otro sitio).
- **`js/ui/render-pantry.js`**: `renderPantryHistorySections()` ahora
  pinta los planes activos en `todayPlansContainer` (mostrando/ocultando
  `todayPlansPanel` completo según haya o no alguno) en vez de
  `pantryActiveContainer`; el historial completado sigue exactamente
  igual, dentro de despensa. `formatHistoryDate()` renombrada a
  `formatEntryDateTime()` y ampliada para incluir hora CON SEGUNDOS (ver
  hallazgo de verificación más abajo) — se usa tanto en las tarjetas
  activas como en las filas de historial, así que dos entradas del mismo
  día nunca se confunden en ningún sitio. Nueva `sumPantryCoverageGrams()`
  + nota "X g ya en tu despensa" en el resumen de la tarjeta activa
  (agregado) y por fila dentro del checklist de compra (`getStock()` por
  ingrediente) — cierra la inconsistencia encontrada en la auditoría.
  `initPantryRefs()` recibe ahora `todayPlansPanel`/`todayPlansContainer`
  en vez de `pantryActiveContainer`. Cabecera del archivo reescrita para
  documentar la reubicación.
- **`js/app.js`**: nuevas referencias DOM (`todayPlansPanel`,
  `todayPlansContainer`); `handleUsePlanToday()` ya no abre el `<details>`
  de despensa (`pantryPanel.open = true`) — solo hace scroll a
  `todayPlansPanel`, que ya está visible sin necesidad de expandir nada.
- **`assets/css/style.css`**: `.today-plans-panel`/`.today-plans-panel__head`
  (mismo tratamiento de espaciado que `.shopping-panel`, con nombre
  honesto); `.pantry-active-card__pantry-note`/`.pantry-purchase-row__pantry-note`
  (mismo tratamiento visual que `.shopping-item__pantry`, reutilizado);
  `.pantry-purchase-row__main` (envoltorio nuevo para que el nombre del
  ingrediente y la nota de despensa se apilen dentro de la misma celda
  del grid); `flex-wrap: wrap` añadido a `.pantry-active-card__head`
  (la fecha+hora ahora es más larga, con margen de seguridad en mobile);
  registros nuevos en los `@media` de mobile existentes (mismo patrón
  que `.shopping-panel`/`.nocook-panel`). Comentarios de cabecera de la
  sección "Despensa" actualizados para no describir ya un modelo de 3
  bloques que dejó de ser cierto.

**Verificado en vivo en navegador** (desktop 1280×800 + mobile 375×812,
servidor real vía `python -m http.server`, no solo unit tests): 0
errores de consola en toda la sesión; plan generado → "Usar este plan
hoy" → tarjeta aparece de inmediato en "Tu plan" con fecha+hora, sin
necesidad de abrir ningún acordeón; generar y guardar un SEGUNDO plan el
mismo día → dos tarjetas simultáneas, en un primer intento con hora
SOLO en minutos ambas mostraban la misma etiqueta ("14 ago 2026, 17:39"
las dos) — **hallazgo real de la propia verificación, corregido en la
misma sesión** añadiendo segundos al formato (`toLocaleTimeString` con
`second:"2-digit"`), reverificado con dos tarjetas ya distinguibles
("17:40:21" vs. "17:40:13"); nota de cobertura de despensa verificada
añadiendo stock manual de "Nueces" y confirmando que aparece tanto en el
resumen de la tarjeta como dentro del checklist expandido; "Ya compré
todo esto" → stock sube correctamente; marcar las 5 comidas cocinadas
una a una → la tarjeta desaparece SOLA de "Tu plan" y aparece en el
historial de despensa, la otra tarjeta activa (del segundo plan) queda
intacta; recarga de página → todo persiste (stock, "Tu plan", historial);
confirmado con `querySelector` que el `<details>` de despensa ya NO
contiene ninguna `.pantry-active-card` en su interior. **Hallazgo de
verificación investigado a fondo, no descartado a la ligera**: se
detectó `.pantry-meal-chip` desbordando el viewport en mobile (375px →
hasta 435px) — en vez de asumir que era una regresión de este cambio, se
hizo un A/B real con `git stash push`/`pop` sobre el propio repo
(reversible, sin pérdida de trabajo) cargando la versión ANTERIOR a esta
sesión: el mismo desbordamiento, con los mismos números exactos (435px/
416px), reproduce IGUAL en el código viejo — confirma que es el known
issue de overflow mobile ya documentado desde 2026-08-08
(`.actions`/`.panel`/`.meal-head`, `task_089a68aa`), no algo introducido
aquí. Sigue fuera de alcance, sin investigar a fondo (mismo estado que
antes).

## Confirmar plan: UPSERT sobre el borrador del día — 2026-08-19

**Reporte del usuario, en sus palabras**: pulsar repetidamente
"Confirmar plan" (entonces "Usar este plan hoy") inflaba artificialmente
el stock de la despensa aunque él no hubiera comprado ni cocinado nada
todavía. Pidió separar de verdad crear/guardar el plan, comprar, y
cocinar/comer real, y que confirmar/usar el MISMO plan varias veces
nunca añada físicamente productos a la despensa.

**Reproducción ANTES de tocar código** (para no arreglar un síntoma
equivocado): generar un plan, pulsar el botón de confirmar 3 veces
seguidas (sin cambiar nada más) → 3 tarjetas independientes en "Tu
plan", cada una con su propio botón "Ya compré todo esto". Pulsar ese
botón en las 3 → stock final claramente multiplicado (ej. "Leche
semidesnatada" en 1000g, "Alubias cocidas" en 570g, para un plan que
solo debería haber generado UNA compra real). `savePlanForToday()` en
sí seguía sin tocar `getStock`/`setStock`/`adjustStock` directamente
(eso nunca fue el bug) — el problema era que cada confirmación producía
una entrada de historial nueva, y cada entrada nueva era, por diseño de
la sesión anterior (2026-08-14c, que permitió explícitamente varios
planes por día), independientemente "comprable".

**Diagnóstico**: el ciclo de 3 etapas de `pantry.js` (confirmar / comprar
/ cocinar) es correcto en sí — el error estaba en que "confirmar" no
tenía ningún concepto de "esto ya lo había confirmado, solo estoy
regenerando/editando, no estoy creando un plan distinto". La sesión
2026-08-14c había decidido "permitir varios planes el mismo día" pensando
en el caso legítimo (una comida planificada aparte, de verdad distinta)
sin darse cuenta de que el caso MÁS COMÚN en uso real — regenerar el
plan un par de veces antes de decidirse, y confirmar cada intento — caía
en la misma categoría y producía el mismo resultado técnico (una entrada
nueva), aunque para el usuario fuera obviamente "seguir editando lo
mismo". El reporte de hoy es, en efecto, encontrar en producción la
consecuencia exacta que el análisis de la sesión anterior no anticipó.

**Fix — UPSERT sobre el borrador, no "un plan por día" a secas**: en vez
de volver a "un solo plan por día siempre" (perdería el caso legítimo de
verdad) o dejar "varios planes libremente" (el bug), la regla ahora es:
una entrada de historial es un BORRADOR mientras no tenga NADA real
encima — ni `purchase.done`, ni ninguna comida con `cooked:true`
(`hasRealPantryAction(entry)`, nueva en `pantry.js`). `savePlanForToday()`
busca si ya existe un borrador de HOY (mismo `planDate`) sin nada real
encima; si lo hay, LO ACTUALIZA en el sitio (mismo `id`, se sustituyen
`meals`/`createdAt`/`store`) — nunca crea una copia. En el instante en
que esa entrada tiene algo real (se compró algo o se cocinó algo), deja
de ser un borrador: representa dinero ya gastado o comida ya consumida,
así que confirmar un plan distinto ese mismo día a partir de ahí SÍ crea
una entrada nueva genuina — nunca sobrescribe un hecho real en silencio.

Esto significa, en la práctica: regenerar el plan y volver a confirmar
tantas veces como se quiera ANTES de comprar o cocinar nada es
completamente seguro — es, literalmente, la etapa de "cambiar de idea
sobre qué comer hoy" que describió el usuario, ahora sin efecto
secundario ninguno sobre la despensa. Solo cuando ya se ha comprado o
cocinado algo de verdad, y el usuario decide EMPEZAR otro plan aparte
ese mismo día, se crea una segunda entrada — y esa sí es una decisión
real del usuario (o al menos una consecuencia de una acción real ya
tomada), no un efecto colateral de tocar un botón varias veces.

**Cambios**:
- `js/core/pantry.js`: `hasRealPantryAction(entry)` (nueva, expuesta) —
  `true` si `entry.purchase.done` o cualquier `meal.cooked`.
  `savePlanForToday()` reescrito: busca un borrador de hoy sin nada real
  encima; si existe, lo actualiza (`draft.createdAt`/`draft.store`/
  `draft.meals` sustituidos, mismo `id`) y devuelve `replaced:true`; si
  no, crea una entrada nueva como antes (vía `appendPantryHistory`,
  sin cambios en esa función) y devuelve `replaced:false`. Cabecera del
  archivo reescrita para documentar el UPSERT como parte central del
  ciclo de vida, no una nota al margen.
- `js/ui/render-pantry.js`: `renderPlanSavedNotice(entry, historySaved,
  replaced)` — nuevo tercer parámetro; título y cuerpo del aviso
  distintos para "Plan confirmado" (entrada nueva) vs. "Plan actualizado"
  (mismo borrador, con el texto tranquilizador explícito "no se ha
  comprado ni cocinado nada todavía, ni se ha añadido nada a tu
  despensa" — responde directamente a la pregunta que motivó este
  cambio).
- `js/app.js`: `handleUsePlanToday()` pasa `result.replaced` a
  `renderPlanSavedNotice()`; comentarios actualizados.
- `index.html`: texto del botón `usePlanTodayBtn` — "Usar este plan hoy"
  → "**Confirmar plan de hoy**" (el `id` NO cambia, solo el texto
  visible — nada que dependa del `id` se rompe). Elegido para reflejar
  la nueva semántica idempotente ("подтвердить план", como lo describió
  el usuario) en vez de sugerir una acción distinta cada vez.
- `tests/pantry.test.js`: 8 tests nuevos — `hasRealPantryAction` (4,
  incluida la forma corrupta/`null`), confirmar dos veces seguidas
  actualiza el mismo borrador (no crea una segunda entrada), **la
  regresión EXACTA del bug reportado** (confirmar 3 veces + comprar 1
  vez deja exactamente 1 paquete, no 3 — sobre un ingrediente sintético
  con envase conocido, cifra verificable), confirmar tras comprar SÍ
  crea una entrada nueva, confirmar tras cocinar SÍ crea una entrada
  nueva, y que `createdAt` se refresca en cada actualización del borrador
  mientras `id`/`planDate` se mantienen estables. El test anterior "dos
  planes el mismo día NO se fusionan" (2026-08-14c) se sustituyó por
  estos — codificaba exactamente el comportamiento que resultó ser el
  bug.
- **NO tocados**: `markPurchaseDone()`/`markMealCooked()` — ya eran
  correctos e idempotentes-seguros (recalculan contra el stock actual
  cada vez); el bug estaba únicamente en cuántas entradas producía la
  Etapa 1, nunca en las Etapas 2/3. `js/core/budget.js`, `js/core/
  pricing.js`, `js/core/meal-schedule.js`, `js/core/cloud-sync.js`,
  `js/core/migration.js`, `js/engine/*` — cero cambios.

**Alcance NO construido, a propósito**: el usuario mencionó, como parte
de la descripción del flujo ideal, poder cambiar platos individuales
del plan (editar uno solo sin regenerar los 5) — eso NO se construyó
esta sesión. El flujo actual ya cubre "cambiar de idea antes
de confirmar" regenerando el plan COMPLETO cuantas veces haga falta
(ahora seguro, ver arriba); permitir sustituir UN plato sin tocar los
demás requeriría una función nueva en el motor de selección
(`dish-selector.js`) capaz de re-elegir un solo hueco respetando
presupuesto/25%/macros del resto del día ya fijado — una pieza de
ingeniería bastante más grande, no necesaria para cerrar el bug
reportado. Queda como posible trabajo futuro si se pide explícitamente.

**Verificado en vivo** (navegador real, `python -m http.server`, clics
REALES sobre el botón real, no solo llamadas a función — el entorno
sirvió una copia cacheada de los `.js` tras el primer `preview_start`,
igual que en sesiones anteriores; resuelto con `fetch(url,
{cache:'no-store'})` + `eval()`, mismo procedimiento ya documentado):
reproducción del bug confirmada ANTES del fix (3 clics → 3 entradas →
comprar en las 3 → stock multiplicado); tras el fix, 3 clics reales
sobre "Confirmar plan de hoy" → 1 sola entrada, 1 sola tarjeta en "Tu
plan", el segundo y tercer clic muestran "Plan actualizado" con el texto
tranquilizador; comprar UNA vez → stock exacto de una sola compra
(verificado con un ingrediente de envase conocido: 200g, no 600g);
confirmar un plan nuevo DESPUÉS de haber comprado → sí crea una segunda
tarjeta genuina, correctamente, mostrando "Plan confirmado" (no
"actualizado"). 0 errores de consola en toda la verificación. Los 238
tests de `tests/` + 23 de `poc/tests/` (261 totales) pasan.

## Diversidad del generador: eliminación de TOP_CANDIDATES_POOL y reequilibrio de protein/€ — 2026-08-19b

**Petición del usuario**: stress-test GLOBAL del generador (no unos pocos
ejemplos) — un perfil fijo (18 años, 70kg, 180cm), mínimo 200
generaciones con la misma entrada, analizando planes únicos/idénticos,
qué platos se repiten más, diversidad por franja (desayuno/comida/
cena/snacks por separado), qué platos casi nunca salen, repetición
consecutiva/cercana, media/máximo de platos únicos, y si hay
limitaciones del generador que reducen artificialmente la diversidad.
Pedido explícito: no tocar código durante el análisis, solo informar.

**Metodología**: script Node fuera del repo (`scratchpad` de la sesión,
nunca comiteado), mismo patrón `vm` que `tests/*.test.js` — carga los
archivos de producción REALES sin copiarlos ni modificarlos
(`ENGINE_FILES`, idéntico a `tests/plan-generator.characterization.test.js`).
1000 llamadas reales a `generateDietPlan()` con el mismo `profile`/`data`
(bugdet "Equilibrado" → 20€/día, 30 min cocina, sabor mixto). Además de
contar qué plato sale en cada franja (extraído de `meal.label`),
se instrumentaron `pickWeightedByScore`/`pickWeightedFromTop`
reasignando esas funciones globales DENTRO del sandbox Node (nunca en
el archivo real) para registrar el tamaño exacto del pool de candidatos
que le llega a la lotería, antes de cualquier recorte.

**Hallazgo (informe completo — no repetido aquí en detalle, ver el
artefacto publicado en la conversación de esa sesión)**: desayuno y
comida (procesadas primero, con `usedState`/`committedGrams` todavía
vacíos, así que su score es casi determinista entre generaciones) solo
mostraron **12 platos distintos** en 1000 generaciones — igual, no por
casualidad, a `TOP_CANDIDATES_POOL`, de un catálogo de 64 y 110
respectivamente. El 89% de "comida" y el 72% de "cena" nunca se
eligieron ni una vez, y la lista de "nunca elegidos" era casi
exclusivamente carne/pescado — el top-10 de comida/cena era casi
solo legumbres/tofu/tempeh. Causa raíz identificada en el propio código
(no solo inferida): (1) `TOP_CANDIDATES_POOL = 12` recortaba la lotería
softmax a los 12 mejores por score SIEMPRE, sin importar el tamaño real
del pool filtrado; (2) `scoreDishForSelection`, en modo "tight"
(presupuesto ajustado respecto a la referencia — `isBudgetTight()`),
puntuaba EXCLUSIVAMENTE por `purchasePpeBucket` (proteína / coste de
compra marginal) ×100, sin mirar `macroFit` en absoluto — y legumbres/
tofu dan sistemáticamente más proteína por € de compra marginal que
carne/pescado (paquetes más compartibles entre tomas del mismo día,
formatos que casan mejor con el gramaje que pide un plato), así que ese
×100 en solitario no era un desempate, era casi la única variable.

**Fix pedido explícitamente por el usuario tras el informe** (ver
petición en la conversación): eliminar `TOP_CANDIDATES_POOL` y corregir
el reparto de protein/€ para que no expulse carne/pescado — preservando
el resto de restricciones del generador (presupuesto duro, escalera de
relajación de tiempo/sabor/cap25%, tolerancias de macros) y repitiendo
el stress-test para confirmar la mejora real.

**Cambios en `js/engine/dish-selector.js`**:
- `TOP_CANDIDATES_POOL` eliminado por completo. `pickWeightedByScore()`/
  `pickWeightedFromTop()` ya no recortan `ranked` antes de sortear — la
  lotería pondera TODO el pool que llega (ya filtrado por presupuesto
  duro y tiempo/sabor del tier actual en fases previas de `pickDish`).
  El propio softmax (`SELECTION_TEMPERATURE_RATIO=0.15`, sin cambios)
  ya da un peso exponencialmente pequeño a candidatos muy alejados del
  máximo — el recorte manual a 12 no aportaba nada que esa ponderación
  no hiciera sola, solo convertía una probabilidad pequeña pero real en
  cero para cualquier candidato fuera del top-12, sin importar cuántas
  veces se regenerara el plan.
- `scoreDishForSelection()` reequilibrado: `macroFit` ahora se calcula y
  cuenta SIEMPRE, en los dos modos (antes: solo en modo "allocation").
  Modo "tight": `macroFit*20 + purchasePpeBucket*40 + usagePpeBucket*0.5 + div`
  (antes: `purchasePpeBucket*100 + usagePpeBucket*0.5 + div`, sin
  `macroFit`) — protein/€ de compra sigue siendo el criterio más pesado
  cuando el presupuesto aprieta (la intención original del modo), pero
  ya no aplasta matemáticamente categorías enteras de platos. Modo
  "allocation": `purchasePpeBucket` sube de peso ×1 a ×3 (resto
  igual: `macroFit*100 + allocation*30 + div*10 + ... + usagePpeBucket*0.5`)
  — desempate algo más presente incluso con margen de presupuesto, sin
  acercarse a dominar sobre macros/asignación de cuota.
- **NO tocado**: `enforcePurchaseBudgetCap`/`computeDayPurchaseCost`
  (presupuesto sigue siendo un tope duro, nunca se relaja),
  `RELAXATION_TIERS`/`MAX_RELAXATION_TIER` (la escalera de tiempo/sabor/
  cap25% sigue igual), `isBudgetTight()`/`BUDGET_SLACK_TIGHT_THRESHOLD`
  (el umbral que decide qué modo usar no cambió), `MACRO_TOLERANCE_TIERS`,
  `diversityScore()`, `enforce25PercentRule()`, y todo `plan-generator.js`/
  `budget.js`/`pricing.js`/`meal-schedule.js`/despensa — cero cambios.

**Golden-master recapturados**: `tests/plan-generator.characterization.test.js`
tiene 2 tests con `Math.random` sembrado que fijan agregados EXACTOS
para una semilla concreta — al cambiar qué plato gana la lotería para
esa misma semilla, ambos cambiaron de valores, exactamente el caso "si
el algoritmo cambia a propósito, hay que actualizar el golden-master a
propósito, nunca en silencio" que la cabecera de ese archivo ya
advertía desde 2026-08-04. Recapturados ejecutando el código real una
vez (script en `scratchpad`, no en el repo) y pegando los valores
nuevos. El segundo caso (seed=7, volumen alto/Amplio) pasa de
`tierUsed:3`/sin violación de calorías a `tierUsed:4`/`status:"minimal"`
con una violación de calorías del 24.2% — reportada honestamente por
`verifyPlanFeasibility()`, no oculta; es una característica de ESA
semilla concreta, no una regresión sistemática (los 7 tests de
invariantes del mismo archivo, con `Math.random` real sobre 5 perfiles
× 10 iteraciones, siguen confirmando que el contrato general se
mantiene). Los 7 tests de invariantes/contrato de ese archivo NO se
tocaron. 261 tests totales, 0 fallidos (mismo total que antes — solo 2
recapturados, ninguno añadido/quitado).

**Repetición del stress-test tras el fix** (mismo script, mismo perfil,
1000 generaciones nuevas):

| Métrica | Antes | Después |
|---|---|---|
| Cobertura desayuno | 12/64 (18.8%) | 63/64 (98.4%) |
| Cobertura comida | 12/110 (10.9%) | 88/110 (80.0%) |
| Cobertura cena | 28/101 (27.7%) | 82/101 (81.2%) |
| Cobertura snack 1 | 23/59 (39.0%) | 56/59 (94.9%) |
| Cobertura snack 2 | 41/59 (69.5%) | 56/59 (94.9%) |
| "Comida" nunca elegida | 98/110 | 22/110 |
| Platos distintos usados (total) | 93/334 (27.8%) | 291/334 (87.1%) |
| Planes completamente únicos | 97.8% | 99.9% |
| report.status "perfect" (tier 0) | 52.3% | 31.7% |
| report.status "minimal" | 3.0% | 9.7% |
| Violaciones cap25 (de 1000) | 41 | 228 |

Carne/pescado confirmados también en vivo en el navegador real (no solo
en el stress-test aislado, con el mismo patrón de caché conocido de
este entorno resuelto vía `fetch(url,{cache:'no-store'})` + `eval()`,
ver notas técnicas de sesiones anteriores): dos generaciones
consecutivas con el perfil de ejemplo mostraron "Jamón serrano con
kiwi", "Sardinas con arroz y coliflor" y "Sandwich integral de pavo y
queso" — ninguno de los tres aparecía nunca antes del fix. 0 errores de
consola en ambas generaciones; lista de la compra y resto de la UI sin
regresión.

**El coste honesto del cambio** (deliberadamente no escondido en el
informe al usuario): un pool de candidatos más amplio y menos "afinado"
por protein/€ hace que el generador necesite relajación (tiempo/sabor/
cap25%) con más frecuencia para encajar en presupuesto — tier "perfect"
bajó del 52.3% al 31.7% de las generaciones, "minimal" subió del 3.0%
al 9.7%, y las violaciones `cap25` (ya documentadas como issue #8,
interacción entre `enforce25PercentRule` y el recorte de presupuesto)
subieron de 41 a 228 sobre 1000. Esto NO es una garantía rota — es el
propio sistema reportando con más frecuencia, de forma transparente,
que tuvo que ceder en algo — confirmado porque los 7 tests de
invariantes (presupuesto/tiempo/cap25% nunca superados sin declararlo,
nunca `unavailable`) siguen pasando sin cambios. Queda como decisión
abierta si esta frecuencia mayor de relajación es un precio aceptable
por la diversidad ganada, o si conviene un ajuste fino adicional de los
pesos — no se iteró más de una vez sobre las constantes por decisión
deliberada (evitar sobreajustar a un único stress-test sin más señal),
ver "Prioridad actual" en el handoff.

**No implementado en esta sesión, quedó fuera de la petición explícita**:
diversidad ENTRE llamadas a `generateDietPlan()` (hoy `usedState` se
reinicia en cada llamada, solo mejora diversidad DENTRO de un plan);
protección explícita contra que snack1 y snack2 salgan el mismo plato
(13.5%→14.8% de las veces, ligeramente peor, no relacionado con
protein/€).

## Reserva de presupuesto y reparto secuencial — 2026-08-19c/d

Continuación directa de "Diversidad del generador — 2026-08-19b" arriba: el
usuario quería que el generador se sintiera con más libertad (menos
mensajes de presupuesto insuficiente) sin renunciar a la diversidad ganada
en (b). Dos intentos, medidos ambos con el mismo stress-test de 1000
generaciones (perfil fijo 18a/70kg/180cm, budgetMode "medium" = 20€) antes
de darse por buenos — ninguno se aceptó solo por argumento teórico.

**Intento 1 — reserva de presupuesto (2026-08-19c, `BUDGET_RESERVE_RATIO`,
sigue en el código pero es prácticamente INERTE)**: idea original del
usuario — apuntar internamente a un objetivo ~12% por debajo del
presupuesto real (17€ elegido → ~15€ de objetivo) y dejar el resto como
colchón de diversidad, sin que el techo real ni las cifras de ahorro
mostradas al usuario cambien nunca. Implementado como `data.targetBudget`
(ver `sanitizeInputs`) usado SOLO para `targetSpend` en
`attemptPlanAtTier` — `mealCap`/`enforcePurchaseBudgetCap`/
`verifyPlanFeasibility`/`scorePlan`/`budgetDelta` siguen todos contra
`data.budget` sin excepción (verificado en vivo: plan con `budget:17` →
`report.budgetDelta` = `purchaseCost - 17`, nunca contra el objetivo
reducido). **Medido, no mejoró nada**: `status:"perfect"` 240→240,
`cap25` 253 vs. la base sin cambios — ver detalle numérico completo en el
handoff de esa sub-sesión (ya no queda como resumen aparte arriba, este
párrafo lo sustituye). Causa raíz identificada leyendo el propio código:
(1) la factibilidad — si `pickDish` escala de tier por "no cabe en
presupuesto" — se decide en `dish-selector.js` SOLO contra `maxCost`
(=`mealCap`, el techo duro SIN reservar); `targetSpend` nunca entra en ese
filtro, así que la reserva no puede tocar la causa real de la mayoría de
tier escalation por presupuesto. (2) Donde `targetSpend` sí actúa
(`allocationScore`), `macroFit*100` domina sobre `allocation*30` por
~33x — mover el "ideal" un 12% apenas mueve el ranking final. Se dejó el
código tal cual (inofensivo, ya documentado en la cabecera de
`plan-generator.js`) en vez de revertirlo, pero **no confiar en que
`BUDGET_RESERVE_RATIO` hace algo perceptible** si una sesión futura lo
toca — el verdadero mecanismo es el de abajo.

**Intento 2 — reparto secuencial del presupuesto (2026-08-19d,
`SEQUENCING_BLEND_RATIO`, el que SÍ funciona)**: la causa real de tier
escalation por presupuesto es que `mealCap` (el techo de FACTIBILIDAD)
reservaba solo el MÍNIMO ABSOLUTO de las tomas siguientes
(`reserveForRest`), así que desayuno (24% del peso calórico del día)
podía gastar hasta el 100% del margen del día por encima de los mínimos,
dejando a las tomas siguientes ancladas cerca de su propio mínimo. Fix:
`fairShareCap` — cada toma recibe su propio mínimo absoluto + una porción
del margen restante proporcional a su `ratio` calórico (misma
proporcionalidad que ya usa `targetSpend`); `mealCap` final es
`Math.min(hardCap, blendedCap)`, donde `blendedCap` interpola entre
`hardCap` (0% de recorte, comportamiento de siempre) y `fairShareCap`
(100%, recorte proporcional completo) según `SEQUENCING_BLEND_RATIO`.
`hardCap` nunca cambia — la garantía de factibilidad por inducción
documentada en la cabecera del archivo (si `data.budget >=
minPossibleDayCost`, cada toma recibe `mealCap >= su propio mínimo`)
queda intacta sin modificarse, porque tanto `hardCap` como `fairShareCap`
ya cumplen esa cota y su combinación convexa también.

**Primero se probó a plena fuerza (`SEQUENCING_BLEND_RATIO=1`, recorte
proporcional completo) y se descartó tras medirlo**: sí reducía
violaciones de calorías (-53%, 36→17) pero costaba ~20pp de cobertura de
platos justo en las dos tomas más grandes (desayuno 98.4%→79.7%, comida
84.5%→64.5%) y SUBÍA un 25% las violaciones de `cap25` (253→317) —
contradecía directamente el objetivo de conservar diversidad. El usuario,
al ver estos números, pidió suavizarlo en vez de aceptarlo o descartarlo
sin más.

**`SEQUENCING_BLEND_RATIO=0.5` (el valor final, en producción)** — mismo
stress-test de 1000 generaciones, comparado contra la base SIN reparto
secuencial (solo con la reserva inerte de (c) encima):

| Métrica | Base (solo reserva) | Blend 1.0 (descartado) | **Blend 0.5 (final)** |
|---|---|---|---|
| `status:"perfect"` | 240 | 226 | **251** |
| `status:"minimal"` | 98 | 102 | 99 |
| Violaciones `cap25` | 253 | 317 | **245** |
| Violaciones `calories` | 36 | 17 | **29** |
| Violaciones `time` | 40 | 48 | **33** |
| Tier 0 (sin relajar) | 321 | 327 | **339** |
| Tier 3 | 138 | 120 | **122** |
| Platos únicos/plan (avg) | 4.86 | 4.94 | **4.88** |
| Cobertura global de platos | 86.2% (288/334) | 75.1% (251/334) | **86.8% (290/334)** |
| Cobertura desayuno | 98.4% | 79.7% | **98.4%** (sin cambio) |
| Cobertura comida | 84.5% | 64.5% | 81.8% (-2.7pp, mucho menor que el -20pp de blend 1.0) |
| Cobertura cena | 75.2% | 72.3% | **78.2%** |
| Cobertura snack2 | 91.5% | 93.2% | **96.6%** |

Con blend 0.5: MÁS planes "perfect" (240→251), MENOS violaciones en
prácticamente todas las categorías (`cap25` -3%, `calories` -19%, `time`
-18%), MÁS planes en tier 0 (321→339) y MENOS en tier 3 (138→122),
diversidad global igual o mejor (86.2%→86.8%, cobertura de desayuno
intacta, comida con una caída pequeña de 2.7pp muy lejos del -20pp de la
versión sin suavizar). Es una mejora limpia en casi todos los ejes frente
a la base, y muy superior al intento a plena fuerza — se aceptó como
mecanismo final. Verificado en vivo con `budget:17` real:
`report.budgetDelta` sigue siendo `purchaseCost - 17` exacto (`-3.57` con
`purchaseCost:13.43`), nunca contra `targetBudget` (`14.96`) ni contra
ningún número intermedio del reparto.

Golden-master de `tests/plan-generator.characterization.test.js`
recapturado 4 veces en total durante 2026-08-19c/d (una por cada cambio
real de algoritmo: reserva de presupuesto, reparto secuencial a plena
fuerza, reparto secuencial suavizado a 0.5) — los 7 tests de
invariantes/contrato de ese archivo NO se tocaron ninguna vez y siguen
pasando sin cambios en las 4 iteraciones. 261 tests, 0 fallidos en la
versión final (mismo total que siempre, solo golden-master recapturado).
`js/engine/dish-selector.js` — sin cambios en 19c/d (solo se tocó en
19b); todo el cambio de 19c/d vive en `js/engine/plan-generator.js`
(`BUDGET_RESERVE_RATIO`, `SEQUENCING_BLEND_RATIO`, `sanitizeInputs`,
`attemptPlanAtTier`) y `tests/plan-generator.characterization.test.js`.

**Qué NO tocar sin repetir el stress-test de 1000 generaciones**:
`BUDGET_RESERVE_RATIO`, `SEQUENCING_BLEND_RATIO` — ambas constantes se
calibraron por medición, no por intuición; cualquier ajuste futuro debe
repetir la comparación antes/después con el mismo perfil fijo, no asumir
el efecto. **Nunca** usar `data.targetBudget`, `targetSpend`, `hardCap`
intermedio o `fairShareCap`/`blendedCap` para nada que el usuario vea
(mensajes de ahorro, violación de presupuesto, `report.budgetDelta`) —
esas cifras se calculan y se seguirán calculando SIEMPRE contra
`data.budget`, el único techo real; esta invariante ya estaba probada en
tests y se reverificó en vivo en ambos intentos de esta sub-sesión.

## Gate en Generar plan + reemplazo explícito del plan activo (2026-08-20)

### El bug reportado, reproducido en vivo antes de tocar nada

Con un plan ya confirmado (`savePlanForToday`) y con la compra marcada
(`markPurchaseDone`), pulsar "Generar plan" otra vez mostraba un preview
nuevo -- correcto, no toca nada todavía. El problema aparecía al pulsar
"Confirmar plan de hoy" sobre ESE preview nuevo: como la entrada de hoy ya
tenía algo real encima (`hasRealPantryAction()=true`), el UPSERT de
2026-08-19 (a propósito, para no pisar dinero gastado) creaba una entrada
SEGUNDA -- resultado: 2 tarjetas "Tu plan" activas para el mismo día,
ambas con sus chips de "cocinado" ya desbloqueados. Reproducido con 2
llamadas reales (`usePlanTodayBtn.click()` dos veces con una regeneración
entre medias) contra el sitio en producción antes de cambiar una sola
línea.

### Por qué "Generar plan" nunca avisaba

`handleSubmit()` (`js/app.js`) no tenía ninguna noción de "ya existe un
plan de hoy" -- generaba un preview nuevo sin más, siempre. La protección
existente (UPSERT sobre un borrador SIN acción real) vive en
`savePlanForToday()`, un paso DESPUÉS de generar -- para cuando actúa, el
usuario ya decidió confirmar, es demasiado tarde para preguntar "¿seguro
que quieres esto?".

### El fix: gate ANTES de generar + reemplazo explícito

Tres funciones nuevas en `js/core/pantry.js` (puro, sin DOM, mismo patrón
que `hasRealPantryAction`):

- **`isEntryFullyCooked(entry)`** -- movida aquí desde `render-pantry.js`
  (ya existía para decidir qué entra en "Tu plan" vs. el historial
  colapsado; ahora `js/app.js` también la necesita).
- **`findTodayEntry()`** -- la entrada de historial más reciente cuyo día
  es hoy, SIN filtrar por estado (a diferencia del UPSERT interno de
  `savePlanForToday`, que busca específicamente un borrador).
- **`replacePendingMealsForToday(entryId, newMeals, storeId)`** --
  reemplaza, comida por comida, la entry existente con `newMeals`, EXCEPTO
  las comidas que ya estaban `cooked` (se conservan tal cual, con su
  propio `cooked`/`cookedAt`/`consumed` intactos -- un hecho consumado que
  ningún regenerado puede deshacer). Resetea `purchase.done` a `false` en
  cuanto reemplaza al menos una comida (nunca borra `purchase.runs`, que
  queda como historial de lo YA comprado) -- los ingredientes reemplazados
  casi siempre difieren de los que el checklist de compra daba por
  buenos. Nunca crea una entrada nueva.

`js/app.js`, `handleSubmit()`: antes de generar, llama a
`getBlockingActiveEntry()` -- `findTodayEntry()` + `hasRealPantryAction()`
+ `!isEntryFullyCooked()`. Bloquea SOLO cuando las 3 condiciones se
cumplen a la vez:

- Un borrador puro (sin acción real) NO bloquea -- el UPSERT normal ya lo
  resuelve sin riesgo, no hace falta interrumpir.
- Un plan ya completado del todo (todas las comidas cocinadas) NO bloquea
  -- no hay nada pendiente que un plan nuevo pueda pisar; generar otro es
  una intención legítima (ej. un snack tardío tras terminar el día).

Cuando bloquea, `showPlanReplaceDialog(entry)` (`js/ui/render-pantry.js`,
`<dialog>` nativo, mismo patrón `.showModal()/.close()` con reserva que el
diálogo de conflicto de sincronización de `render-auth.js`) redirige
(scroll) a la tarjeta activa y pregunta explícitamente. Dos botones:

- **"Cambiar el plan completo"** → `handleReplaceWholePlan(entryId)`
  (`js/app.js`): genera un plan nuevo (mismo `runGeneration()` que
  `handleSubmit`, extraído para compartirse entre las dos vías) y marca
  `pendingReplaceEntryId = entryId`. Al confirmar, `handleUsePlanToday()`
  ve ese id fijado y llama a `replacePendingMealsForToday()` en vez del
  UPSERT normal -- se limpia tras usarse una vez, y también al "Resetear"
  (`clearOutput`).
- **"Cancelar"** → cierra el diálogo, no genera nada, el formulario queda
  tal cual estaba.

`renderPlanSavedNotice()` ahora recibe un `mode` (`'created'` |
`'draft-updated'` | `'active-replaced'`) en vez de un booleano `replaced`
-- el tercer caso ("Plan reemplazado") avisa explícitamente de qué
comidas se conservaron por estar ya cocinadas y de que hay que volver a
marcar la compra porque los ingredientes pueden haber cambiado.

### Qué NO cambia (verificado)

`savePlanForToday()` y su UPSERT sobre el borrador (2026-08-19) --
intactos, sin tocar. `markPurchaseDone`/`markMealCooked` -- sin cambios.
`js/engine/*` (generador/selector de platos) -- cero cambios, el reparto
secuencial de 2026-08-19d sigue exactamente igual. Refina, no revierte, la
decisión de 2026-08-14c de permitir varios planes el mismo día a
propósito -- sigue siendo posible (ej. tras terminar un plan del todo),
pero ahora requiere una elección explícita en vez de ser un efecto
colateral de pulsar "Generar plan" sin pensarlo.

### Tests y verificación en vivo

13 tests nuevos en `tests/pantry.test.js` (`isEntryFullyCooked` ×4,
`findTodayEntry` ×4 -- incluido el caso raro de varias entradas de hoy,
devuelve la más reciente --, `replacePendingMealsForToday` ×5 -- reemplaza
lo no cocinado/conserva lo cocinado, resetea `purchase.done` conservando
`purchase.runs`, no toca nada si todo ya estaba cocinado, refresca
`createdAt` manteniendo `id`/`planDate`, entryId inexistente devuelve
`null`). 274 tests totales, 0 fallidos.

Verificado en vivo contra el build local, reproduciendo el escenario
completo real: confirmar+comprar un plan → generar uno nuevo (mismo día)
→ el gate abre el diálogo con el texto correcto, NO genera nada → "Cambiar
el plan completo" → preview nuevo → confirmar → sigue siendo 1 SOLA
tarjeta "Tu plan" (antes del fix: 2), aviso "Plan reemplazado" con el
texto correcto, estado de compra reseteado a pendiente. También verificado
que un borrador puro (sin comprar/cocinar nada) NO abre el diálogo --
genera con normalidad, como antes. La preservación de una comida ya
cocinada durante el reemplazo se verificó por llamada directa a
`replacePendingMealsForToday()` (los clics sintéticos sobre el chip de
comida individual no se registraban de forma fiable en este entorno de
automatización concreto -- limitación de la herramienta de automatización,
no de la app; el resto del flujo SÍ se verificó con clics reales sobre
los botones reales): comida marcada cocinada conservada con su `label`/
`cooked`/`items` exactos, las otras 4 reemplazadas por platos nuevos,
`getPantryHistory().length` seguía en 1.

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

## Fix real: overflow horizontal en mobile — .pantry-meal-chip — 2026-08-20b

**Contexto**: known issue mencionado en todos los handoffs desde
2026-08-08 (`.actions`/`.panel`/`.meal-head`/`.pantry-meal-chip`
desbordando el viewport en mobile, ~375px renderizando hasta ~435px) y
reconfirmado en 2026-08-14c con un A/B real (`git stash`) contra el
código anterior a esa sesión — pero nunca localizado a un elemento
concreto, solo "sigue sin investigar a fondo" en cada handoff sucesivo.
Esta sesión lo investigó por fin.

**Diagnóstico, en vivo, ANTES de tocar código**: servidor real
(`python -m http.server`) con el navegador de este entorno en 375×812,
plan de ejemplo generado y guardado en "Tu plan" para tener chips de
comida reales en pantalla. Un escaneo del DOM completo
(`getBoundingClientRect()` sobre cada elemento, comparado contra el
ancho del viewport) encontró el offender exacto: un
`<button class="pantry-meal-chip pantry-meal-chip--cooked">` con el
texto `"07:30✓ Desayuno — Crepes de avena con requesón y fruta"`, en
383px de ancho — más ancho que el propio viewport. `document.
documentElement.scrollWidth` medía 412px, no 375px: el navegador móvil
había ensanchado el viewport ENTERO para acomodar ese único elemento
que se negaba a encoger.

**Causa raíz**: `.pantry-meal-chip` (`assets/css/style.css`) tiene
`white-space: nowrap` desde que se introdujo el patrón de chips
compactos (2026-08-14b) — intencional, para que el chip sea una
"píldora" de una sola línea. Pero un elemento flex (el chip vive dentro
de `.pantry-meal-chips { display:flex; flex-wrap:wrap; }`) tiene por
defecto `min-width: auto`, lo que significa que NUNCA encoge por debajo
del ancho de su propio contenido — con `white-space:nowrap`, ese ancho
es el de todo el texto en una sola línea, sin importar cuánto mida el
contenedor. Un nombre de plato largo simplemente no cabía en 375px, y
en vez de truncarse o envolver, forzaba el documento entero a
ensancharse. Confirmado experimentalmente que `.actions`/`.panel`/
`.meal-head` (mencionados en el mismo known issue desde el principio)
NUNCA tuvieron un overflow propio: parcheando en vivo SOLO
`.pantry-meal-chip` (`min-width:0` + `max-width:100%`), el documento
completo volvió a 376px (~375, redondeo) y un reescaneo del DOM no
encontró NINGÚN otro elemento desbordando — esos otros selectores solo
heredaban el viewport ya ensanchado por el chip, no tenían un bug
independiente.

**Fix**, una sola regla nueva en `.pantry-meal-chip`:
```css
overflow: hidden;
text-overflow: ellipsis;
max-width: 100%;
min-width: 0;
```
`min-width: 0` anula el `min-width:auto` por defecto del flex item,
permitiendo que el chip encoja hasta el ancho real de su fila;
`max-width: 100%` lo limita ahí; `overflow:hidden` + `text-overflow:
ellipsis` truncan el texto (que sigue en una sola línea,
`white-space:nowrap` no se tocó) en vez de forzar el layout. Se
mantiene el aspecto de píldora compacta que el diseño de 2026-08-14b
buscaba — solo deja de romper el viewport cuando el contenido no cabe.
Además, `renderMealChips()` (`js/ui/render-pantry.js`) gana un
`title="<label completo del plato>"` en el botón, para que el texto
truncado siga siendo recuperable al pasar el ratón — el nombre completo
del plato ya se muestra sin truncar en la propia tarjeta de comida, así
que esto es una mejora de descubribilidad, no una reparación de pérdida
de información.

**Verificado en vivo contra los archivos REALES servidos** (cache-bust
explícito del `<link rel="stylesheet">`, no solo un `<style>` de prueba
inyectado, para descartar el problema de caché HTTP de este entorno ya
documentado en sesiones anteriores): `document.documentElement.
scrollWidth` 412px → 376px; un escaneo completo del DOM tras el fix
encontró 0 elementos desbordando el viewport (antes: 5, incluido el
propio chip); el chip largo mostró `scrollWidth` (381px) > `clientWidth`
(316px) con `overflow:hidden` — confirma que SÍ está truncando de
verdad, no solo escondiendo el problema; y el atributo `title` con el
texto completo presente en los 5 chips de un plan real. Repetido en
desktop (viewport ancho): el mismo chip largo se muestra COMPLETO, sin
truncar — confirma que `max-width`/`min-width` nuevos solo actúan
cuando el contenedor realmente aprieta, nunca encogen un chip
innecesariamente cuando sobra espacio. 251 tests (`node tests/
run-tests.js`) re-ejecutados tras el cambio, 0 fallidos — esperado, es
un cambio de solo CSS + un atributo HTML, ninguna lógica de
`js/core/`/`js/engine/` tocada.

**Archivos modificados**: `assets/css/style.css` (`.pantry-meal-chip`,
+4 propiedades), `js/ui/render-pantry.js` (`renderMealChips()`, +1
atributo `title`). **No tocados**: `js/core/pantry.js`, todo
`js/engine/*`, cualquier otro archivo CSS/JS/HTML.

## Session handoff (2026-08-19)

Escrito para que la siguiente sesión/chat pueda continuar sin haber visto
esta conversación. No repite lo de arriba en detalle — apunta a la
sección correspondiente. La sesión 2026-08-13 tuvo 6 tramos en un mismo
día: **(a)** presupuesto de compra MARGINAL durante la selección, **(b)**
bug real de precio en `renderFoodRow` (2026-08-13b), **(c)** mitigación
en la UI del bug de macros fabricados (2026-08-13c), **(d)** rediseño
ARQUITECTÓNICO completo del modelo de nutrición por ingrediente
(2026-08-13d), **(e)** auditoría del "recorte a cero" + consistencia
Atwater (2026-08-13e), **(f)** sistema de cuentas completo en CÓDIGO
(Supabase Auth + Postgres + RLS, todavía sin proyecto real). El
2026-08-14 tuvo 3 tramos más: **(g)** aprovisionó Supabase + Google OAuth
de verdad y verificó todo en vivo contra el backend real (ver
"Aprovisionamiento real de Supabase + Google OAuth — 2026-08-14a"
arriba); **(h)** rediseñó por completo la UX de la Despensa sin tocar
`js/core/pantry.js` ni el modelo financiero (ver "Rediseño de UX de la
Despensa — 2026-08-14b" arriba); **(i)** auditoría completa de
arquitectura/UX de despensa a petición del usuario y, tras su aprobación
explícita, reubicación de los planes activos fuera del acordeón de
despensa a una sección nueva "Tu plan" + `planDate` en `pantry.js` (ver
"Reubicación de 'Tu plan' fuera de la despensa — 2026-08-14c" arriba).
**2026-08-19 — (j)**: el usuario encontró en uso real el bug que (i)
dejó sin anticipar — confirmar el plan varias veces (p.ej. al
regenerar mientras decide qué comer) creaba varias entradas
"comprables" por separado, e inflaba el stock si llegaba a comprar en
más de una. Fix: `savePlanForToday()` ahora hace UPSERT sobre el
borrador del día en vez de crear siempre una entrada nueva — ver
"Confirmar plan: UPSERT sobre el borrador del día — 2026-08-19" arriba.
**2026-08-19b — (k), esta sesión, la más reciente**: a petición del
usuario, stress-test masivo (1000 generaciones reales, perfil fijo) del
generador de planes, que encontró que desayuno/comida solo mostraban 12
platos distintos cada uno (exactamente `TOP_CANDIDATES_POOL`) y que
carne/pescado estaban casi excluidos de comida/cena por el peso de
protein/€ en el score. Tras el informe, el usuario pidió el fix
directamente: `TOP_CANDIDATES_POOL` eliminado, `scoreDishForSelection`
reequilibrado para que `macroFit` cuente siempre — ver "Diversidad del
generador: eliminación de TOP_CANDIDATES_POOL y reequilibrio de
protein/€ — 2026-08-19b" arriba para el detalle completo, incluida la
tabla antes/después y el coste honesto del cambio (más relajación de
tiempo/sabor/cap25% con más frecuencia).
**2026-08-19c/d — (l), esta sesión, la más reciente**: continuación
directa de (k) — el usuario quería que el generador se atascara menos en
presupuesto sin perder la diversidad recién ganada. Primer intento (c):
reserva de presupuesto (`data.targetBudget`, ~12% por debajo del real,
solo para la cuota orientativa) — medida con el mismo stress-test de
1000 generaciones y confirmada **inerte** (la factibilidad se decide
contra el techo duro sin reservar, no contra la cuota orientativa).
Segundo intento (d, el que sí funciona): reparto SECUENCIAL de
`mealCap` — las tomas tempranas reciben un techo recortado
proporcionalmente a su peso calórico, dejando más presupuesto
garantizado a las siguientes. Probado primero a plena fuerza y
descartado (mejoraba violaciones de calorías pero costaba ~20pp de
cobertura de platos en desayuno/comida); suavizado a la mitad
(`SEQUENCING_BLEND_RATIO=0.5`) y confirmado como mejora limpia en casi
todos los ejes (`status:"perfect"` 240→251, `cap25` 253→245, cobertura
global 86.2%→86.8%) — ver "Reserva de presupuesto y reparto secuencial
— 2026-08-19c/d" arriba para el detalle completo con tablas.
**2026-08-20 — (m)**: el usuario reportó en
uso real que "Generar plan" + "Confirmar plan de hoy" sobre un plan ya
comprado podía dejar 2 tarjetas "Tu plan" activas el mismo día (el UPSERT
de 2026-08-19 protege un borrador, pero crea una entrada nueva a
propósito en cuanto hay algo real encima -- "Generar plan" nunca avisaba
de que eso iba a pasar). Fix: gate en `handleSubmit()` (`js/app.js`) que
comprueba `findTodayEntry()`/`hasRealPantryAction()`/`isEntryFullyCooked()`
(pantry.js) antes de generar -- si hay un plan de hoy con algo real encima
y algo pendiente, abre un diálogo nuevo (`showPlanReplaceDialog`,
render-pantry.js) en vez de generar. Solo "Cambiar el plan completo"
genera, y confirma con la función nueva `replacePendingMealsForToday()`
(reemplaza lo NO cocinado, conserva TAL CUAL lo cocinado, resetea
`purchase.done`) en vez del UPSERT normal -- ver "Gate en Generar plan +
reemplazo explícito — 2026-08-20" arriba para el detalle completo.
**2026-08-20b — (n), esta sesión, la más reciente, conversación nueva**:
el usuario pidió orientación y luego una sugerencia de fix para un issue
abierto del handoff; eligió el overflow horizontal mobile
(`.actions`/`.panel`/`.meal-head`/`.pantry-meal-chip`, documentado sin
diagnosticar desde 2026-08-08). Diagnosticado por fin: el offender real
es únicamente `.pantry-meal-chip` (`white-space:nowrap` sin
`min-width:0` dentro de un flex-item, que se niega a encoger por debajo
de su contenido con un nombre de plato largo y fuerza el viewport
entero a ensancharse) -- los otros tres selectores mencionados en el
mismo known issue nunca tuvieron un overflow propio, solo heredaban el
viewport ya ensanchado por el chip. Fix de 4 propiedades CSS en ese
único selector + un atributo `title` nuevo en el chip -- ver "Fix real:
overflow horizontal en mobile — .pantry-meal-chip — 2026-08-20b" arriba
para el detalle completo, incluida la verificación en vivo. Este
handoff describe el estado ACUMULADO tras los 14 tramos.

**Para orientarse en el código en sí, antes de leer archivo por archivo,
usa el grafo de Graphify** (regenerado por última vez en la sesión
2026-08-13d — 388 nodes/620 edges/38 communities — `graphify explain
"<símbolo>"` / `graphify query "<pregunta>"` desde esta carpeta, ver
`PythonProject/docs/graphify.md`). **Desactualizado desde entonces**
(2026-08-13f/2026-08-14a/2026-08-14b/2026-08-14c/2026-08-19/2026-08-19b
tocaron código sin regenerarlo) — no se actualiza solo; regenerar con
`graphify update . --no-cluster && graphify cluster-only .` si hace
falta antes de confiar en él para navegar el código nuevo
(`todayPlansPanel`/`planDate`/`hasRealPantryAction`, el
`scoreDishForSelection` reequilibrado, etc. no estarán en el grafo
actual).

**Estado del proyecto**: prototipo funcional, con una red de tests (261,
ver "Tests" arriba), un rediseño visual v2 + layout mobile, una
**Despensa completa** (3 etapas, mismas de siempre) con **UX rediseñada
por completo** (2026-08-14b — stock editable in-situ, alta con
autocompletado — y reorganizada de nuevo en 2026-08-14c: los planes con
algo pendiente ya NO viven dentro del acordeón de despensa, viven en una
sección nueva "Tu plan" justo debajo de la lista de la compra; despensa
quedó reducida a stock + historial de planes completados — ver sección
dedicada), con **"Confirmar plan de hoy" ahora idempotente sobre el
borrador del día** (2026-08-19 — regenerar/editar y volver a confirmar
tantas veces como haga falta ANTES de comprar o cocinar nunca crea más
de una entrada "comprable"; solo se crea una entrada nueva de verdad
cuando la anterior ya tiene algo real encima, ver sección dedicada), un
**horario de comidas completo**, un
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
nunca una fila donde un macro contradiga a otro de la misma fila. Desde
2026-08-19b, además, **la SELECCIÓN de plato ya no excluye
matemáticamente categorías enteras por protein/€, y la lotería de
elección ya no está artificialmente recortada a 12 candidatos** —
verificado con un stress-test de 1000 generaciones antes/después
(cobertura desayuno 18.8%→98.4%, comida 10.9%→80.0%, ver sección
dedicada) — a cambio de necesitar relajación de tiempo/sabor/cap25% con
más frecuencia (tier "perfect" 52.3%→31.7%), reportado honestamente por
`report.violations`, no oculto.

**Commit/branch/deploy actuales**: `main`/`origin/main` en `0f6c658`
("Gate 'Generar plan' behind an explicit choice when today's plan is
already active" — verificar con `git log -1`/`git status -sb` antes de
asumir que sigue siendo así). Commits desde el `c758a01` con el que
arrancó la sesión 2026-08-13: `aa4f20b` (sistema de cuentas, 2026-08-13f),
`f66bfac` (solo `js/data/supabase-config.js` con los valores reales de
Supabase, 2026-08-14a), `e11308d`+`f0b70e0`+`9612687` (rediseño de UX de
la Despensa + documentación/fixup, 2026-08-14b), `35f35a8` ("Polish
despensa UI: split into 3 clear blocks" — incluye TODO el trabajo de
2026-08-14c: reubicación de "Tu plan" + `planDate`), `1f7798b`
(2026-08-19, los tramos j+k+l: UPSERT sobre el borrador del día,
eliminación de `TOP_CANDIDATES_POOL` + reequilibrio protein/€, y reserva
de presupuesto + reparto secuencial), `a42d468` (docs: registrar hash y
estado de deploy de 1f7798b), `0f6c658` (2026-08-20, tramo m: gate
en Generar plan + reemplazo explícito del plan activo — `index.html`,
`js/app.js`, `js/core/pantry.js`, `js/ui/render-pantry.js`,
`assets/css/style.css`, `tests/pantry.test.js`, `STATE.md`, `PROJECT.md`,
`ROADMAP.md`), `ef5cee8` (docs: registrar hash y estado de deploy de
0f6c658), y **`061ea4a`** (2026-08-20b, tramo n: fix de overflow
horizontal en `.pantry-meal-chip` — `assets/css/style.css`,
`js/ui/render-pantry.js`, `STATE.md`, `PROJECT.md`, `ROADMAP.md`) —
verificar con `git log -1`/`git status -sb` antes de asumir que sigue
siendo así. **Pusheado a `origin/main`**
(`github.com/andreyostrik228/OfflineNutritionHelper`). Sigue habiendo un
archivo suelto sin relación, `PANTRY_HISTORY_MAX_ENTRIES)` (0 bytes, sin
trackear, en la raíz, deliberadamente NUNCA comiteado) — mismo tipo de
basura preexistente que ya se documentaba aquí antes; no tocarlo sin que
se pida.

**Desplegado a producción — CONFIRMADO en esta sesión**: `npx wrangler
pages deploy . --project-name=offline-nutrition-helper` (reutilizó la
sesión OAuth de `wrangler` ya existente, sin pedir credenciales nuevas)
subió 12 archivos nuevos + 115 sin cambios, deployment alias
`https://17d7ed5d.offline-nutrition-helper.pages.dev`, y
`https://offline-nutrition-helper.pages.dev` (dominio de producción del
proyecto) responde 200 y sirve el `js/engine/plan-generator.js` con
`BUDGET_RESERVE_RATIO = 0.12`/`SEQUENCING_BLEND_RATIO = 0.5` presentes y
`TOP_CANDIDATES_POOL` ausente — verificado con fetch directo al archivo
servido en producción, no solo asumido. Ese fue el deploy de `1f7798b`
(primero desde `f66bfac`/2026-08-14a, con 2026-08-14b/c/2026-08-19/
2026-08-19b/2026-08-19c/d TODOS juntos). **Segundo deploy de esta
sesión, con el tramo (m) encima**: mismo comando
(`npx wrangler pages deploy . --project-name=offline-nutrition-helper`),
9 archivos nuevos + 118 sin cambios, alias
`https://1e3451df.offline-nutrition-helper.pages.dev`, y
`https://offline-nutrition-helper.pages.dev` verificado sirviendo
`js/core/pantry.js` con `findTodayEntry`/`replacePendingMealsForToday`,
`js/app.js` con `getBlockingActiveEntry`, e `index.html` con el diálogo
`planReplaceDialog` — con fetch directo, no solo asumido. **Tercer
deploy, esta sesión (2026-08-20b), con el tramo (n) encima**: mismo
comando (`npx wrangler pages deploy . --project-name=offline-nutrition-helper`),
6 archivos nuevos + 121 sin cambios, alias
`https://41fb33b1.offline-nutrition-helper.pages.dev`, y
`https://offline-nutrition-helper.pages.dev` verificado sirviendo
`assets/css/style.css` con la regla nueva de `.pantry-meal-chip`
(`text-overflow: ellipsis`/`max-width: 100%`/`min-width: 0`) y
`js/ui/render-pantry.js` con el atributo `title` nuevo — con fetch
directo al CSS/JS servidos en producción, no solo asumido; y
re-verificado EN VIVO contra producción en 375px real (no solo el
servidor de desarrollo): plan generado y confirmado, 10 chips de comida
reales incluyendo varios nombres largos, `document.documentElement.
scrollWidth` en 376px (no 412+), 0 elementos desbordando el viewport en
un escaneo completo del DOM. Cloudflare
Pages, proyecto direct-upload, `Git Provider: No` — recordar para el
futuro: un push a `origin/main` NUNCA despliega solo, hace falta
`wrangler pages deploy` explícito cada vez.

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
Y en producción (2026-08-14a, ver sección dedicada)**; los planes con
algo pendiente ahora viven en una sección propia "Tu plan" (fuera de
despensa, siempre expandida, con fecha+hora con segundos para distinguir
varios planes el mismo día — 2026-08-14c) y "Confirmar plan de hoy" es
idempotente sobre el borrador del día (2026-08-19 — nunca crea entradas
"comprables" duplicadas por regenerar/reconfirmar); los 261 tests.

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
(issue #9); no hay recordatorios de cocina separados (a propósito).
~~El bug de CSS de `.actions`/`.panel`/`.meal-head`/`.pantry-meal-chip`
desbordando el viewport en mobile (~375px vs. hasta ~435px, mencionado
en handoffs anteriores desde 2026-08-08, `task_089a68aa`)~~ **RESUELTO
2026-08-20b** — el offender real era únicamente `.pantry-meal-chip`
(`min-width:auto` por defecto de un flex item + `white-space:nowrap`
sin límite de ancho, con un nombre de plato largo); `.actions`/`.panel`/
`.meal-head` nunca tuvieron un overflow propio, solo heredaban el
viewport ya ensanchado por el chip — ver "Fix real: overflow horizontal
en mobile — .pantry-meal-chip — 2026-08-20b" arriba.
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
- **(h) Rediseño de UX de la Despensa (2026-08-14b, sesión distinta)**:
  `js/ui/render-pantry.js` reescrito por completo (capa de presentación
  únicamente), `index.html` (estructura del panel: intro, formulario de
  alta con datalist, contenedor de planes activos, historial anidado
  colapsado), `js/app.js` (nuevas referencias DOM, ids nuevos, sin
  lógica nueva), `assets/css/style.css` (sección Despensa reescrita
  completa). `js/core/pantry.js`: cero cambios.
- **(i) Reubicación de "Tu plan" + `planDate` (2026-08-14c, misma
  conversación que (h), sesión distinta)**: `js/core/pantry.js`
  (`formatLocalDateKey`/`getEntryPlanDate` nuevas, `savePlanForToday`
  guarda `planDate`), `index.html` (`<section class="today-plans-panel"
  id="todayPlansPanel">` nueva, `pantryActiveContainer` eliminado de
  dentro de `pantryPanel`, "Ver planes anteriores" renombrado a
  "Historial de planes completados"), `js/ui/render-pantry.js`
  (`renderPantryHistorySections` pinta en `todayPlansContainer` en vez
  de `pantryActiveContainer`; `formatHistoryDate`→`formatEntryDateTime`
  con segundos; `sumPantryCoverageGrams` nueva + nota de despensa en la
  tarjeta activa y su checklist), `js/app.js` (refs
  `todayPlansPanel`/`todayPlansContainer`, `handleUsePlanToday` ya no
  abre `pantryPanel`), `assets/css/style.css`
  (`.today-plans-panel`/`.today-plans-panel__head`/
  `.pantry-active-card__pantry-note`/`.pantry-purchase-row__pantry-note`/
  `.pantry-purchase-row__main` nuevas), `tests/pantry.test.js` (+7). Ver
  sección dedicada "Reubicación de 'Tu plan' fuera de la despensa —
  2026-08-14c" arriba para el detalle completo.
- **(j) UPSERT sobre el borrador del día (2026-08-19, sesión distinta)**:
  `js/core/pantry.js` (`hasRealPantryAction()` nueva, `savePlanForToday()`
  reescrito: busca un borrador de hoy sin nada real encima y lo actualiza
  en el sitio en vez de crear siempre una entrada nueva; devuelve
  `replaced`), `js/ui/render-pantry.js` (`renderPlanSavedNotice()` recibe
  `replaced`, mensajes distintos "Plan confirmado" vs. "Plan
  actualizado"), `js/app.js` (pasa `result.replaced`, comentarios),
  `index.html` (texto del botón "Usar este plan hoy" → "Confirmar plan
  de hoy", el `id` no cambia), `tests/pantry.test.js` (+8/-1, incluida la
  regresión EXACTA del bug reportado). `markPurchaseDone`/
  `markMealCooked`/`js/core/budget.js`/`js/core/pricing.js`/
  `js/engine/*`: cero cambios. Ver sección dedicada "Confirmar plan:
  UPSERT sobre el borrador del día — 2026-08-19" arriba para el detalle
  completo.

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

**Verificación específica del tramo (k) (2026-08-19b, diversidad del
generador)**: ver tabla antes/después completa en "Diversidad del
generador: eliminación de TOP_CANDIDATES_POOL y reequilibrio de
protein/€ — 2026-08-19b" arriba. Resumen: 261 tests (2 golden-master
recapturados a propósito, 7 invariantes sin tocar y en verde); stress-
test de 1000 generaciones antes + 1000 después con el mismo perfil
confirma la mejora real (no solo teórica) de cobertura por franja y
representación de carne/pescado; verificado también con generaciones
reales en el navegador (no solo el script aislado), 0 errores de
consola. El coste (más relajación de tiempo/sabor/cap25%) queda
documentado explícitamente, no oculto.

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

**Prioridad actual**: ninguna acción pendiente de commit/push/deploy —
todos los tramos j/k/l/m (2026-08-19 a 2026-08-20) están comiteados
(hasta `0f6c658`), pusheados a `origin/main`, y desplegados en producción
(ver "Commit/branch/deploy actuales" arriba para el detalle completo
verificado). Opcional, no bloqueante: per-meal editing ("cambiar solo el
desayuno" desde el diálogo de plan activo) quedó deliberadamente fuera de
alcance del tramo (m) — el usuario eligió empezar por el gate +
reemplazo del plan completo primero, ver "Gate en Generar plan..." en la
cabecera de `pantry.js` para el razonamiento; retomar esa conversación
antes de construirlo, no asumir el diseño. El usuario podría querer
un ajuste fino adicional de los pesos de `scoreDishForSelection`
(macroFit×20/purchasePpeBucket×40 en modo "tight") si considera que el
aumento de relajación/violaciones cap25 de 19b (ver tabla antes/después
en la sección dedicada) sigue siendo demasiado incluso después del
reparto secuencial de 19d — no se ha vuelto a tocar `dish-selector.js`
desde 19b, a propósito, para no sobreajustar sin pedir más señal
primero. El sistema de cuentas sigue COMPLETO y verificado en
producción, ya no es prioridad. Opcional, no bloqueante: que una persona
real complete un login por Google de principio a fin al menos una vez
(ver límite honesto arriba); considerar borrar los usuarios de prueba
`andreyostrik228+claudetest...@gmail.com` desde Supabase →
Authentication → Users si se quiere una base limpia antes de invitar a
usuarios reales (no imprescindible, son inofensivos). Aparte de eso,
sigue pendiente Fase 1 del roadmap de migración de nutrición (ampliar
cobertura de datos reales más allá del 50/81 actual, ver `ROADMAP.md` —
requiere que el pipeline Python verifique más productos en
`real-products.js`, no es tarea de este repo en solitario). ~~investigar
el bug de overflow mobile `.panel`/`.meal-head`/`.actions`/
`.pantry-meal-chip`~~ **RESUELTO 2026-08-20b** (ver sección dedicada
arriba). Sigue pendiente: conectar la Despensa al modo "sin cocinar"
(issue #9); regenerar el
grafo de Graphify (desactualizado desde 2026-08-13f). **Fuera de
alcance deliberado de 2026-08-14c, documentado en el propio análisis de
la sesión, no un olvido**: no se fusionaron las tarjetas de comida
(`render.js`) con las acciones de comprar/cocinar en un solo componente
(el "Modelo B" más agresivo del análisis) — se prefirió el Modelo A
(reubicación, menor riesgo) tras sopesarlo explícitamente con el
usuario; si en el futuro se quiere ir más lejos, retomar esa
conversación antes de tocar `render.js`. **Fuera de alcance deliberado
de 2026-08-19**: editar un plato individual del plan sin regenerar los 5
(el usuario lo mencionó como parte del flujo ideal) — requeriría una
función nueva en `dish-selector.js` capaz de re-elegir un solo hueco
respetando presupuesto/25%/macros ya fijados por el resto del día; no
necesaria para cerrar el bug reportado, queda como posible trabajo
futuro si se pide explícitamente.

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
2026-08-13e existe para prevenir. Los 261 tests deben seguir pasando
después de cualquier cambio en `js/core/`, `js/engine/`, `js/ui/`, o
`assets/css/style.css`.
Específico de la Despensa: `applyPlanToPantry()` y
`markHistoryEntryCooked()` **ya no existen** (v1→v2); el orden de
arranque en `js/app.js` y `safeInit()` son intencionales.
Específico de 2026-08-14c: `pantryActiveContainer` **ya no existe**
(ni en `index.html`, ni en `app.js`, ni en `render-pantry.js`) — es
`todayPlansPanel`/`todayPlansContainer`, FUERA del `<details>` de
despensa; no volver a meter planes activos dentro de `pantryPanel`, es
precisamente la confusión de UX que esta sesión existe para resolver
(ver conversación/sección dedicada). `entry.planDate` es un campo NUEVO
y distinto de `entry.createdAt` — `getEntryPlanDate()` es la única
función que debe leerlo (con fallback a `createdAt` para entradas
viejas); no asumir que `entry.planDate` siempre existe al leer
`pantryHistory` directamente en otro sitio. `formatEntryDateTime()` DEBE
incluir segundos, no solo minutos — se añadieron a propósito tras
confirmar en vivo que sin segundos dos planes guardados con pocos clics
de diferencia eran indistinguibles; no volver a truncar a "HH:MM".
**CORREGIDO en 2026-08-19 — la frase de este mismo handoff que decía
"`savePlanForToday()` sigue sin hacer upsert por fecha... no un bug a
arreglar fusionándolos" ERA la causa raíz del bug real que motivó esa
sesión** — ver "Confirmar plan: UPSERT sobre el borrador del día —
2026-08-19" arriba: `savePlanForToday()` AHORA SÍ hace upsert, pero solo
sobre un borrador SIN nada real encima (`!hasRealPantryAction(entry)`);
no revertir a "siempre crear una entrada nueva" pensando que eso es
"restaurar" el diseño de 2026-08-14c, sería reintroducir el bug de
inflado de despensa. `hasRealPantryAction(entry)` es la ÚNICA función
que debe decidir si una entrada sigue siendo un borrador (comprado o
cualquier comida cocinada) — no reimplementar ese criterio en otro
sitio. `renderPlanSavedNotice(entry, historySaved, replaced)` tiene un
tercer parámetro nuevo — omitirlo no rompe nada (cae a "Plan
confirmado"), pero pierde la distinción "Plan actualizado" que
tranquiliza al usuario; mantenerlo en cualquier llamador nuevo. El botón
`usePlanTodayBtn` dice "Confirmar plan de hoy" (antes "Usar este plan
hoy") — el `id` no cambió, solo el texto; si se retoca ese botón, no
volver al texto antiguo, ya no describe correctamente lo que hace.
Específico de 2026-08-19b: `TOP_CANDIDATES_POOL` **ya NO existe** en
`js/engine/dish-selector.js` — no reintroducir un recorte fijo del pool
de candidatos en `pickWeightedByScore`/`pickWeightedFromTop`, es
exactamente la causa raíz medida (con instrumentación real, no
supuesta) del bug de diversidad que esta sesión existe para arreglar;
si hiciera falta limitar el coste computacional en el futuro (no hizo
falta con 334 platos), preferir subir el umbral, no volver a un tope
fijo pequeño. El modo "tight" de `scoreDishForSelection` **ya NO
decide solo por `purchasePpeBucket`** — `macroFit` cuenta siempre en
los dos modos; no revertir a `purchasePpeBucket*100` en solitario, es
la fórmula que excluía carne/pescado casi por completo. Los pesos
actuales (`macroFit*20 + purchasePpeBucket*40` en tight,
`purchasePpeBucket*3` en allocation) son un primer ajuste razonado y
verificado empíricamente UNA vez con el stress-test de esta sesión, no
una calibración exhaustiva — si una futura sesión los retoca, repetir
el mismo stress-test (script en el histórico de esta conversación, no
en el repo) antes/después para confirmar el efecto real, no asumirlo.
`enforcePurchaseBudgetCap`/`isBudgetTight`/`RELAXATION_TIERS` — cero
cambios, siguen siendo la autoridad de presupuesto/tiers. Los 2
golden-master de `tests/plan-generator.characterization.test.js`
reflejan el algoritmo NUEVO — si se vuelve a tocar `dish-selector.js` a
propósito, volver a recapturarlos a propósito (nunca en silencio), tal
como advierte la cabecera de ese archivo.
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
esto es una foto fija al final de la sesión 2026-08-20b, tramo (n) (fix
de overflow horizontal en `.pantry-meal-chip`), con los tramos j+k+l+m
comiteados (hasta `ef5cee8`) y desplegados en producción antes de que
empezara esta sesión, y el tramo (n) comiteado en `061ea4a`, pusheado
a `origin/main`, y desplegado en producción
(`https://41fb33b1.offline-nutrition-helper.pages.dev`, verificado en
`offline-nutrition-helper.pages.dev` sirviendo la regla CSS nueva y
re-probado en vivo en 375px real contra producción).
