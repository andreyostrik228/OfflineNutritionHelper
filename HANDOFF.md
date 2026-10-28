# Traspaso — lo que hay que saber antes de tocar nada

> Escrito el 2026-09-02 al final de una sesión larga, para quien venga
> después. `STATE.md` es el diario fechado y `PROJECT.md`/`ROADMAP.md`
> cuentan el qué y el cuándo. Esto es otra cosa: **el cómo**. Los métodos,
> las trampas y los errores que ya se pagaron caros, para que no se
> vuelvan a pagar.
>
> Si solo lees dos secciones, que sean la **0** (estado y reglas al 2026-10-08) y *"Las lecciones caras"*.

---

## 0. LEE ESTO PRIMERO — estado al 2026-10-08

**Esta sección es la más nueva. Si algo de las secciones 1 a 10 la contradice,
manda esta** (la 10.2, la del recorrido, está reescrita entera; la 3, la 4 y la 5
llevan al final un bloque «actualización 2026-10-08»). El diario fechado, con
medidas y causas, está en la cabecera de `STATE.md` (entradas del 2026-10-07 y
2026-10-08).

### 0.0 sexdecies Recorrido y tutorial de entrenamientos al día, 2026-10-28 (lee esto antes que 0.0 quindecies)

- **Estado:** sello `20261028a`, **1329 tests en verde**. El dueño: «обнови все
  туториалы и сделай их лучше».
- **Recorrido general (10.2): 11 escenas** en vez de 9. Puesto al día con lo
  añadido desde el 2026-10-08: días de 1 a 7 (la escena `dias` enseña además
  cómo un envase pasa de un día a otro y la pista «Si te quedas con hambre…»),
  «No me gusta» en `cambiar`, el selector de 1 a 7 en `generar`, una escena
  nueva `casa` («Para quién es el menú»), otra `entrenos` (el botón
  «Entrenamientos» de arriba), «Sin cocinar» como plan entero y la despensa por
  sitios en `atajos`, y el ucraniano en el menú del idioma. Las maquetas dicen
  la palabra REAL de la interfaz (`ui.*`, `ent.*`, `unit.*`: ya no «kcal»/«kg»
  en ruso), y un test comprueba que cada una existe en los cuatro idiomas.
- **Tutorial de entrenamientos (`js/ui/entreno-tutorial.js`): seis pasos con
  maqueta animada** (Inicio, anotar series, el menú ⋯, Plan con el calendario,
  Progreso, Perfil) en vez de cinco dibujos fijos. Usa el motor del recorrido:
  `tourEscenaMontar(id, el, animar, ENTRENO_TUT_ESCENAS)` (el cuarto argumento
  es nuevo; sin él, `TOUR_SCENES`). Los ejercicios salen del catálogo en el
  idioma de la pantalla, con su figura animada. Puntos que llevan a su paso,
  flechas del teclado y deslizar. La clave de «visto» no cambia (`v1`): quien
  ya lo vio no lo recibe otra vez solo; está en «Perfil → Cómo se usa».
- **Dos fallos viejos arreglados (estaban en producción):** en «Grafito», el
  aspecto por defecto, `--volt` y `--primary` son el mismo lima, y las cifras de
  las maquetas (las kcal de la escena 1, el total de la compra) no se veían:
  `_tgVoltPlano` lo mide y pone `.tg-volt-plano`. Y en 320×568 tres escenas ya
  se salían de su sitio (con «pegatinas», tres y un texto): ahora la maqueta se
  compacta y, si ni así cabe, `_tgEncajar` la encoge entera (nunca bajo 0,72).
- **Medido** con `scripts/qa/tour.mjs` (`MEDIR=1`): ru/es/uk/en en 320×568,
  360×640 y 390×844, con «grafito», «revista» y «pegatinas»: todas las escenas
  caben y sin errores de JavaScript. El tutorial de entrenamientos, con el mismo
  arnés (`cdp.mjs`): seis pasos en 320×568, 360×640 y 390×844; en 320×568 la
  hoja se desplaza un poco (los botones quedan abajo).
- **No hecho, a propósito:** `TOUR_ESTRENO` sigue en 2026-10-06, así que a
  quien ya vio el recorrido no se le vuelve a ofrecer el nuevo. Subirlo a la
  fecha de la subida haría que se ofrezca una vez a todos: decisión del dueño.
- **Graphify** regenerado el 2026-10-28 con este código (estaba parado desde el
  2026-09-18, 82 commits atrás): **2615 nodos, 5138 aristas, 215 comunidades**
  (antes 1090/1898/114), y el combinado de `PythonProject`
  (`graphify-out/merged-graph.json`): 2720 nodos, 5352 aristas. Se hace con
  `graphify update . --no-cluster` y `graphify cluster-only .` en esta carpeta,
  y luego `graphify merge-graphs` desde `PythonProject` (manual:
  `PythonProject/docs/graphify.md`). Sin LLM: las comunidades se nombran por su
  nodo central. Los nodos de los `.md` son los de la última extracción con LLM
  (septiembre): para el «por qué», este fichero y `ROADMAP.md`.

### 0.0 quindecies Seguridad, 2026-10-27 (lee esto antes que 0.0 quaterdecies)

- **Estado:** sello `20261027c`, **1327 tests en verde**. Revisión de
  seguridad antes de buscar clientes. Tabla al principio de `ROADMAP.md`.
- **Reglas nuevas (no las rompas):**
  - `script-src` NO lleva `unsafe-inline`: los dos scripts en línea de
    `index.html` van por su sha256 en `_headers`. Si tocas una letra de uno,
    pon su hash nuevo y cambia `SELLO_CABECERAS` en `sw.js`;
    `tests/auth.test.js` calcula los dos y dice qué poner. Nada de
    `onclick=` en el HTML: con esta CSP no se ejecuta.
  - Los scripts de fuera llevan `integrity` (sha384) y `crossorigin`. Si
    cambias la versión de GSAP o de Firebase, recalcula el hash del fichero
    exacto (y el test lo exige).
  - La cache del worker para el SDK es `onh-fuentes-v2`, y el worker nunca
    sirve una respuesta opaca a una petición CORS: con la v1 (opacas) un
    script con `integrity` no cargaba.
  - Cuentas nuevas: contraseña de 8 como mínimo (`AUTH_MIN_PASSWORD`); entrar
    con una de 6 o 7 sigue funcionando.
- **Comprobado y bien:** reglas de Firestore (solo el dueño, cuatro campos de
  texto, lo demás cerrado); escapado en todas las vistas (trampa HTML en
  cada cadena de los datos vía la copia: 419 veces en pantalla como texto,
  0 elementos); la copia se valida al cargar; el token solo va en la
  cabecera `Authorization`; ningún secreto en el repo.
- **Fuera del código, para el dueño:** la copia de GitHub Pages
  (`andreyostrik228.github.io/OfflineNutritionHelper/`) se sirve SIN
  `_headers` (sin CSP ni `frame-ancestors`): apagarla o redirigirla. En
  Firebase: protección contra la enumeración de correos, política de
  contraseñas de 8 y dominios autorizados solo los de producción. En Google
  Cloud: restringir la clave de API por referente y por API.

### 0.0 quaterdecies Lo que sobra entre días, «sin cocinar» y plan normal, 2026-10-27 (lee esto antes que 0.0 terdecies)

- **Estado:** sello `20261027a`, **1321 tests en verde**. En el plan «sin
  cocinar» de varios días, cada día aprovecha lo que sobra de los envases de
  los anteriores, los días cortos de calorías se rellenan con lo que sobra y
  nadie come («+N из остатков»), y cada día dice qué de lo que sobra se puede
  comer si no te llenas. Tabla y medidas al principio de `ROADMAP.md`.
- **Reglas nuevas (no las rompas):**
  - El ticket de cada día, los envases de la compra y lo que sobra salen SOLO
    de `noCookCuentas(dias)` (`no-cook-generator.js`); `noCookCompraItems`
    también. Cambiar un día cambia los tickets de los siguientes: tras editar
    tomas, `recomputeNoCookDias(dias)`, no `recomputeNoCookPlanTotals` suelto.
  - Lo puesto de más (`item.deSobras`) no compra nada: lo paga el envase que
    el menú ya compraba (si se come antes de que el menú lo abra, se le
    «debe»). Solo `_rellenarConSobras` lo pone, y solo de un `lote`.
  - «Cambiar» y «No me gusta» del día d pasan `heredado` (lo de los días
    anteriores, `_heredadoDelDia`) a `regenerateNoCookSlot`.
  - `productCount` de un día = productos que se COMPRAN ese día; lo heredado
    ya está en casa.
  - Un envase abierto solo vale los días de `daysAfterOpening` de la tienda
    (como `resolveExpiry`); sin el dato, todo el plan. Lo «fresh», ni un día más.
  - Un nombre de producto dentro de un texto va en su `<span>` con clase de
    `PRODUCTO_CLASES` (`scripts/i18n/detector.js`), o el test de idioma lo da
    por español sin traducir: el de la pista es `.nocook-sobras__producto`.
- **Segunda tanda, el plan normal (con platos), sello `20261027b`, 1325
  tests.** Reglas nuevas:
  - Desde el día 2, `generateDietPlanDays` pasa `data.despensaDelPlan` (la
    despensa al empezar ese día, `despensaDelPlan(...).siguiente`) y
    `generateDietPlanTiered` la usa en vez de `getPantryState()`. Se borra
    de `data` al acabar, como `avoidDishNames`.
  - `rellenarConLoPagado` solo corre con `planDays` mayor que 1: un plan de
    un día sale como siempre y los golden-master no se mueven. Sube de
    ración entera, nunca compra y no deja una fila por encima del 25% del día.
  - Todo lo que re-elige un plato o rehace un día del plan en pantalla usa
    `despensaDelDiaEnPantalla(d)` (`app.js`), no `getPantryState()` a secas.
  - En familia, `data.racionesCompra` dice cuántas veces se compra el plan
    (menú común: `suma`; cada uno el suyo: la primera persona 1 + invitados).
  - La pista de cada día sale de `despensaDelPlanEnPantalla()` con
    `tomasDeLaCasa`, y solo propone lo de `PLAN_SOBRAS_DE_PICAR`
    (`render.js`). Las claves `html.si_no_te_llenas` y `ui.sobras_y_mas`
    son de los dos planes.

### 0.0 terdecies Personas de la casa, 2026-10-26 (lee esto antes que 0.0 duodecies)

- **Estado:** sello `20261026d`, **1312 tests en verde**. Personas como en
  Netflix (`js/core/perfiles.js`), cada una con lo suyo, y el menú de varias
  personas (`js/core/familia.js`, `js/ui/familia-ui.js`). Tabla al principio
  de `ROADMAP.md`.
- **Reglas nuevas (no las rompas):**
  - Todo lo que sea DE UNA PERSONA guarda bajo `perfilClave(base)`, y su
    base va en `PERFIL_CLAVES_PROPIAS` (y en `PERFIL_CLAVES_NUBE` si viaja a
    la cuenta). Lo de la casa, con su clave de siempre.
  - `perfiles.js` carga antes que cualquier módulo de esa lista (lo exige un
    test): las claves se calculan al cargar. Cambiar de persona = recargar.
  - Nada que suba los ajustes puede saltarse `pushSettingsToCloud` /
    `pushAllToCloud`: con otra persona activa son los que evitan que sus
    datos caigan en el sitio del titular.
  - Lo que se compra o se guarda en «Mis planes» sale de `tomasDeLaCasa(d)`,
    no de `lastGeneratedDays`.

### 0.0 duodecies Lo del 2026-10-26 (lee esto antes que 0.0 undecies)

- **Estado:** sello `20261026a`, **1296 tests en verde**. Se puede fijar un
  número propio de calorías en «Mis datos» (`#kcalPropias`). «Sin cocinar»
  llega a días de 4.000+ kcal. Tabla al principio de `ROADMAP.md`.
- **Reglas nuevas (no las rompas):**
  - `calculateProfile` devuelve también `kcalCalculadas` (lo de la fórmula)
    y `kcalPropias` (si manda un número propio). Con número propio, la
    proteína sale del peso y la grasa crece con las calorías por encima de
    la fórmula.
  - Vaciar el campo borra `kcalPropias` de los ajustes: `null` no se guarda
    y vuelve la fórmula.
  - En «sin cocinar», las raciones por encima del `maxServings` de la
    plantilla solo salen con el dinero no apartado (`day.reservaExtra`). Si
    añades otra toma, llama a `apartarPara` antes de montarla.

### 0.0 undecies Sexta tanda del 2026-10-25 (lee esto antes que 0.0 decies)

- **Estado:** sello `20261025f`, **1289 tests en verde**. Con la compra del
  plan normal y la del sin cocinar a la vez, «Compra» lleva arriba dos botones
  y enseña una sola (`js/ui/pestanas.js`). Tabla al principio de `ROADMAP.md`.
- **Reglas nuevas (no las rompas):**
  - No escondas `#shoppingPanel`/`#noCookShoppingPanel` con `hidden` para
    esto: la vista va con `.is-fuera-de-vista`, y `hidden` sigue siendo «no hay
    lista».
  - Un plan nuevo elige su lista (`compraElegir`, desde los observadores de
    `mealsContainer` y `noCookResults`). Si otro camino crea un plan, que
    llame también a `compraElegir`.

### 0.0 decies Quinta tanda del 2026-10-25 (lee esto antes que 0.0 nonies)

- **Estado:** sello `20261025e`, **1284 tests en verde**. Tambor propio para
  las horas de despertar y de dormir (`js/ui/hora-selector.js`), el mismo en
  iOS y Android: en el formulario, en una hoja (`#horaDialogo`); en el
  cuestionario, en la pregunta. Tabla al principio de `ROADMAP.md`.
- **Reglas nuevas (no las rompas):**
  - `#wakeTime`/`#sleepTime` siguen siendo `<input type="time">`, ocultos: no
    los cambies a texto ni los quites. Lo que los escribe a mano se ve gracias
    al setter de `value` (`mejorarHoraConRueda`).
  - Un tambor creado dentro de un `<dialog>` cerrado no tiene medidas: llama a
    `ajustar()` después de `showModal()`.
  - `hora-selector.js` carga antes que `form-controls.js` y `onboarding-ui.js`
    (lo exige un test).

### 0.0 nonies Cuarta tanda del 2026-10-25 (lee esto antes que 0.0 octies)

- **Estado:** sello `20261025d`, **1279 tests en verde**.
  - Animaciones: discos traslúcidos, ojos, sombra, encuadre apaisado.
  - Posturas arregladas: puente/hip thrust, bird dog.
  - Brazos al revés arreglados: plancha, hip thrust, manos en la cintura,
    jalones, remo en máquina.
  - Tabla al principio de `ROADMAP.md`.
- **Reglas nuevas (no las rompas):**
  - Un brazo `{mano, polo}`: el polo no puede ir a lo largo de hombro→mano (el
    codo quedaría al azar), y la mano tiene que llegar
    (`FIG.brazo + FIG.ante + FIG.mano / 2`). Lo exige un test.
  - El codo no se dobla al revés: lo mide un test con el giro del húmero.
    Manos en la nuca dan ~140°; el límite es 145°.
  - El `<svg>` grande lleva `aspect-ratio` del encuadre: el CSS `.anim` es 1/1
    y sin eso lo apaisado se deforma.

### 0.0 octies Tercera tanda del 2026-10-25 (lee esto antes que 0.0 septies)

- **Estado:** sello `20261025c`, **1271 tests en verde**. Sesiones saltadas
  de la semana (`js/ui/entreno-perdidas.js`) y cronómetro de las series de
  tiempo (`entreno-sesion.js`). Tabla al principio de `ROADMAP.md`.
- **Reglas nuevas (no las rompas):**
  - Una saltada se casa con lo hecho por la clave del diario: si cambias cómo
    `entrenoLogIniciar` fija `clave`, cambia `_perdClave` igual.
  - Guardar las respuestas (`entrenoGuardarPrefs`) mueve `prefs.t`, y los días
    de esta semana anteriores a ese momento dejan de contar como saltados.
  - Un `<article class="entreno__tarjeta …" hidden>` necesita
    `.entreno__tarjeta[hidden]` (ya está): un test de `index.html` lo exige.

### 0.0 septies Segunda tanda del 2026-10-25 (lee esto antes que 0.0 sexies)

- **Estado:** sello `20261025b`, **1264 tests en verde**. Aparatos concretos de
  barra, banco, máquinas y poleas en el cuestionario, el plan y el catálogo
  (tabla al principio de `ROADMAP.md`).
- **Reglas nuevas (no las rompas):**
  - Para saber si un ejercicio se puede hacer, siempre `puedeHacerse(e,
    disponible)` con la lista de `materialConAparatos` (o `plan.disponible`,
    o `entrenoMaterialActual()`); con solo los materiales, todo lo que pide un
    aparato sale como imposible.
  - Un ejercicio nuevo que necesite una máquina, una polea, un banco
    inclinable o soportes lleva su `aparato`; un aparato nuevo en
    `WORKOUT_APARATOS` necesita su botón en `#cuestAparatos`, su texto
    `ent.aparato_*` y algún ejercicio que lo pida (`entreno-aparatos.test.js`
    lo vigila).

### 0.0 sexies Lo nuevo del 2026-10-25 (lee esto antes que 0.0 quinquies)

- **Estado:** sello `20261025a`, **1257 tests en verde**. Reserva de cada serie
  (RIR) y ánimo del día, los dos opcionales (tabla al principio de
  `ROADMAP.md`); la reserva mueve la carga sugerida.
- **Reglas nuevas (no las rompas):**
  - `rir` (serie, 0–4) y `animo` (sesión, 1–5) son opcionales: todo lo que
    los lea tiene que aguantar que no estén. En la cuenta van al final de sus
    filas compactas y solo si existen (`_nubeEjercicio`/`_nubeSesion`): no
    metas campos nuevos en medio de esas filas, que la versión anterior de la
    web lee por posición.
  - La pregunta de la reserva se abre al marcar una serie (`_sesionRirAbierto`
    = "ej-serie"); cualquier acción que mueva, quite o cambie series la cierra
    (el filtro al principio de `_sesionAccion`). Una acción nueva que mueva
    series tiene que cerrarla también.
  - Pasar una serie a calentamiento le quita la reserva (`entrenoEditTipo`).

### 0.0 quinquies Segunda tanda del 2026-10-23 (lee esto antes que 0.0 quater)

- **Estado:** sello `20261023b`, **1249 tests en verde**. El calendario del mes
  en «Plan» (`js/ui/entreno-calendario.js`) y las medidas del cuerpo en
  «Progreso → Тело» (`js/core/body-measures.js`, `js/ui/entreno-medidas.js`).
  Con eso, la etapa 1 de la hoja de ruta del dueño queda hecha salvo los
  «errores típicos» de la técnica.
- **Reglas nuevas (no las rompas):**
  - Una `<table>` dentro de `.entreno` hereda las reglas de las tablas de
    ejercicios (`.entreno table/tr/td`: filas como tarjetas, `td::before` con
    `data-label`). El calendario las deshace con `.entreno .entreno__cal …`;
    una tabla nueva tendrá que hacer lo mismo.
  - Las medidas van en `settings._medidas`, como `_pesos`: si tocas
    `_ajustesParaNube` (cloud-sync.js) o `_hydrateLocalFrom` / la fusión /
    `_wipeLocal` (migration.js), mantén las tres. `body-measures.test.js`
    vigila el cableado. **No probado con Firebase de verdad.**
  - Guardar medidas de hoy MEZCLA con las de hoy (`medidasGuardarHoy`): un
    campo vacío no borra lo que ya había ese día.

### 0.0 quater Lo nuevo del 2026-10-23 (lee esto antes que 0.0 ter)

- **Estado:** sello `20261023a`, **1236 tests en verde**. Tres cosas (tabla
  al principio de `ROADMAP.md`): «Plan» con la semana a mano, plantillas y
  programas listos (`js/ui/entreno-programas.js`); «Progreso» por periodos en
  cuatro pestañas, con puntos de las gráficas que abren su sesión; la técnica
  en ruso de «вы». Las tablas «Por etapas» y los ocho puntos de la propuesta
  de diseño, al día en `ROADMAP.md`.
- **Reglas nuevas (no las rompas):**
  - Con `prefs.estructura` la semana es esa lista y NO sale de los días de
    «Mis datos»; `plan.dias` es su largo. Todo lo de una sesión (cambios,
    quitados, añadidos) va por su **id de instancia** (`s.instancia`, p1…),
    no por el tipo (`s.key`). El botón de cada sesión lleva `data-sesion` =
    instancia. Un mapa de ids que venga de fuera, con `Object.create(null)`:
    un `{}` deja pasar `"constructor"`.
  - El nombre de una sesión se pinta SIEMPRE con `entrenoNombreSesion(s)`
    (plan) o `entrenoLogNombreSesion(s)` (diario): una renombrada se guarda en
    el diario como `clave: "~Nombre"`.
  - «Progreso» pinta los cuatro apartados a la vez (los demás con `hidden`) y
    cambiar de pestaña NO repinta; cambiar de periodo sí. Para abrir una sesión
    desde cualquier sitio, `data-ver-sesion="<id>"`: lo recoge
    `_initEntrenoAtajos` y llama a `entrenoProgresoVerSesion`.
  - Un texto ruso nuevo para la técnica de un ejercicio, de «вы»
    (`exercises-tecnica.test.js` lo vigila).

### 0.0 ter Lo nuevo del 2026-10-22 (lee esto antes que 0.0 bis)

- **Estado:** sello `20261022a`, **1212 tests en verde**. Siete cosas a la vez
  (tabla al principio de `ROADMAP.md`): «Не нравится» con «Вернуть» en el plan,
  la compra y «sin cocinar»; nombres de producto de «sin cocinar» traducidos;
  «Ya compré todo» sin cocinar con envases enteros; pasos al día en vez del
  nivel de actividad; el aspecto «Grafito»; la página del ejercicio con
  récords, gráfica y últimas veces. Lo de 0.0 bis que decía «sin empezar»
  (los pasos) y «queda una cosa de LÓGICA» (los envases) ya está hecho.
- **Reglas nuevas (no las rompas):**
  - `#activity` ya no existe: los pasos (`#steps`) mandan y `activity` se
    deriva en `readForm()` con `actividadPorPasos`. `calculateProfile` sigue
    leyendo `data.activity`.
  - Un nombre de producto del catálogo NUNCA pasa por `nombreComida`/`tFood`:
    tiene su propia tabla (`PRODUCT_TABLES`, `tProduct`, `nombreProductoDoble`),
    que llega tarde. Lo pintado antes de que llegue lo repinta `js/app.js`
    ("productos-idioma"); si pintas productos en un sitio nuevo, añádelo ahí.
  - Los «no me gusta» de producto se guardan traducidos y vuelven a la
    etiqueta con `traducirTerminosDislike`; su caché lleva en la clave las
    tablas cargadas.
  - Las claves i18n `ent.record_*` ya existían (avisos de récord en la
    sesión, con `{valor}`): las de la página del ejercicio son `ent.ficha_rec_*`.
    Antes de inventar una clave, búscala: `insertar-i18n.js` salta las que ya
    existen y avisa, no las pisa.
  - `style.css` llegó a tener un byte NUL (escrito desde un `node -e` con
    `"\00D7"`): escribe los escapes CSS desde un fichero, no desde la línea
    de comandos.
- **«Grafito» es el aspecto por defecto** (`DEFAULT_LOOK` en `js/core/look.js`,
  el primero de `LOOKS`, y `var id` del IIFE del `<head>`; `tests/look.test.js`
  vigila que coincidan). Queda la etapa 3 del rediseño (la prueba completa).

### 0.0 bis Lo nuevo del 2026-10-21 (lee esto antes que 0.0)

- **Estado:** la barra de cinco secciones del panel de entrenamientos está
  subida (`0d77cd8`, sello `20261021a`), y encima el paso 1 de «sin cocinar»
  (sello `20261021b`, **1179 tests en verde**), subido y desplegado con permiso
  del dueño. Qué es y qué se midió: `ROADMAP.md`, primeras secciones.
- **El dueño eligió el rediseño** en tres etapas: 1) la barra (hecha), 2) el
  aspecto «Grafito» con acento lima, 3) la prueba completa. Cada etapa, su
  commit y su «да».
- **Su propuesta de diseño del 2026-10-18 no estaba en el repo**; ahora está
  resumida al final de `ROADMAP.md`. Si hace falta el texto entero, estaba en
  la sesión `132914d5…` (línea 22876 del `.jsonl`, un mensaje en cola).
- **Reglas nuevas de la barra (no las rompas):**
  - Cada bloque de primer nivel de `#entrenoPanel` lleva `data-en="…"` con sus
    secciones; un bloque nuevo sin `data-en` sale en TODAS. `#entrenoSesion` y
    `#entrenoCuestionario` no lo llevan a propósito.
  - La sección solo la cambian `entrenoPestanaIr` (un toque) y
    `entrenoPestanaMarcar` (sin efectos). La pantalla de la sesión marca
    «sesion» al abrirse; `entrenoSesionCerrar(destino)` vuelve a la sección que
    le digan; `entrenoSesionSalir()` pregunta si se corregía con cambios.
  - La barra usa `.tabbar`: cualquier regla nueva de la barra del menú en un
    aspecto la toca también. El bloque de la barra de cada aspecto va en
    `@media screen` (antes `max-width:900px`) para que sirva en el portátil.
  - Ya había una función `entrenoUltimaHtml` («la última vez» de la tabla del
    plan): la de la última sesión se llama `entrenoUltimaSesionHtml`. Los
    globales chocan sin avisar, el fichero que carga después gana.
- **Idea del dueño sin empezar:** los pasos del día para comer más (ver
  `ROADMAP.md`). Un sitio no puede leer el podómetro.
- **«Sin cocinar» como el plan normal, en 4 pasos** (tabla al principio de
  `ROADMAP.md`). El paso 1 (varios días, carrusel, guardado) está hecho, sello
  `20261021b`, y el paso 2 (su compra en «Compra» y confirmar por fechas),
  sello `20261021c`. El carrusel ya no vive en ids sueltos:
  `montarCarruselDias(el)` en `js/app.js` monta los dos; si añades otro,
  pásale sus elementos, no copies el código. Las marcas de la compra van por
  lista (`leerMarcasCompra(lista)`): no mezcles las dos. Y los pasos 3
  (despensa y cuenta, `settings._sinCocinar`) y 4 (diálogo de plan activo),
  sello `20261021d`. Queda una cosa de LÓGICA anotada en `ROADMAP.md`: la
  compra sin cocinar suma raciones, no envases enteros.

### 0.0 Lo nuevo del 2026-10-18 (lee esto antes que 0.1)

- **Lo de 0.1 a 0.5 es del 2026-10-08.** Al 2026-10-18: `main` = `eab3332`,
  empujado; producción = despliegue `9c27a53f`, sello `?v=20261018za`, 211
  ficheros idénticos por md5; **1114 tests en verde**. Lo de entre medias
  (ucraniano, SEO, recetas, registro de peso, .ics, entrenamientos) está en
  `git log`. El ucraniano ya se sirve: de los siete idiomas pendientes quedan seis.
- **Entrenamientos es ya una parte entera del sitio** (cuestionario, plan, modo
  entrenamiento con diario, progreso y una animación por ejercicio). Ficheros,
  lo que hay y lo que falta: `ROADMAP.md`, primera sección.
- **La hoja de ruta del dueño para esa parte** (Hevy, Strong, Fitbod, JEFIT, Nike
  Training Club; funciones A–K; tres etapas) está traducida entera al final de
  `ROADMAP.md` y es lo que manda en entrenamientos. Aún no ha dicho por dónde
  seguir: pregúntale antes de empezar.
- **Textos nuevos: es, en, ru y uk** (las claves `ent.*` están en los cuatro); en
  ruso, de usted. El test de coherencia no deja que ru o uk sean iguales al español
  si llevan letras latinas, marcadores incluidos: por eso hay `"{dias} — {lista}"`.

### 0.1 Dónde está todo exactamente (comprobado el 2026-10-08)

- **Rama `main` = `c4306ad`**, empujada a GitHub (`andreyostrik228/OfflineNutritionHelper`).
  GitHub Pages construye `main` solo (es la copia de respaldo en github.io).
- **Producción = Cloudflare Pages**, proyecto `offline-nutrition-helper`, despliegue
  `31659b1c`, `https://offline-nutrition-helper.pages.dev`. **Hacer push NO despliega**:
  hay que subir a mano (sección 4).
- **189 ficheros idénticos por md5** entre el repo y producción (comprobado con
  `scripts/qa/produccion.mjs` el mismo día), sello `?v=20261008b`.
- **823 tests en verde** (`node tests/run-tests.js`).
- Los ficheros de 0 bytes con nombres raros en la raíz (`###`, `6`, `Reglas)`,
  `esperados`, `g`, `no`…) son **basura de los hooks globales rotos** (sección 2):
  no son del proyecto, NUNCA se comitean. Se mete en git **por nombre de fichero**.
- Si este traspaso (HANDOFF.md, STATE.md, `scripts/qa/`) aparece sin comitear en
  `git status`, es porque el dueño aún no ha dicho que se comitee: pregúntale.

### 0.2 Qué cambió desde el 2026-10-05 (una línea cada cosa y dónde leer más)

1. **El recorrido guiado se rehízo desde cero**: ahora es un `<dialog>`
   con 9 escenas animadas con GSAP que NO toca la página. Sección 10.2.
2. **Orden del alta**: cuestionario → pregunta «¿Quieres ver un recorrido?» (antes
   que el plan) → si dice sí, recorrido → al cerrarse, se genera el plan. 10.2.
3. **El aspecto y las marcas de alta pertenecen a la CUENTA**, no al dispositivo
   (`settings._prefs` en Firestore). Sección 11.
4. **El service worker conserva la CSP con que se instaló**; hay un sello de cabeceras
   (`SELLO_CABECERAS`) que hay que cambiar cuando cambia la CSP. Sección 13.
5. **Los días de un plan de varios días ya no son copias** (`generateDietPlanDays`,
   `avoidDishNames`). Sección 14.
6. **Aspecto por defecto = `hojas`** (листва); diez aspectos, hojas CSS generadas.
   Sección 15.
7. **La palabra para confirmar el borrado de cuenta es por idioma**:
   BORRAR / DELETE / УДАЛИТЬ (`ui.borrar`, `authDeleteWord()`).
8. **«Las cuentas todavía no están disponibles» en el iPhone** era el punto 4.
9. **Herramientas de prueba guardadas en el repo**: `scripts/qa/` (sección 12).
   Antes vivían en una carpeta temporal que se pierde con la sesión.

### 0.3 Las reglas que más errores han evitado (léelas antes de tocar nada)

1. **Cualquier cambio en un `.js` o `.css` sube el sello `?v=` de `index.html`**
   (sección 4, con el comando). Si no, un móvil se queda con HTML nuevo y script viejo.
2. **Si cambias la CSP de `_headers`, cambia `SELLO_CABECERAS` en `sw.js`**
   (sección 13). Hay un test que lo vigila; si no, los móviles con el worker viejo
   se quedan sin Firebase ni GSAP.
3. **Si cambias `assets/css/style.css`, regenera las hojas de aspecto**:
   `python scripts/temas/construir.py`, y comitea `assets/css/temas/*` (sección 15).
4. **Texto nuevo para la persona = en español, inglés y ruso a la vez.** Una clave
   que no casa letra por letra NO da error: sale en español dentro de la interfaz
   en otro idioma (10.1). Los textos del recorrido tienen test; los demás no.
5. **NUNCA escribas el carácter «mayor que» (el de redirigir salida), ni su flecha
   de dos o de guion, en ningún texto que pases a una herramienta**: ni en
   comandos ni en el CONTENIDO de un fichero que escribas. Los hooks globales rotos
   ejecutan el texto con `cmd` y cada uno crea un fichero de 0 bytes en la carpeta
   de trabajo. Comprobado el 2026-10-08: escribir los scripts de `scripts/qa/` creó
   cuatro (`m.vw`, `v.look`…), que hubo que borrar. Después de cada tanda:
   `find . -maxdepth 1 -type f -size 0 -newer <un fichero tuyo>` y borra solo los nuevos.
   En JavaScript que escribas tú, usa `function` en vez de flechas y `!==` o `<`.
6. **`sed -i` se come los CR de los ficheros CRLF** (todo el repo lo es). Para
   cambios masivos usa un script de Node que lea, `split`/`join` y escriba.
7. **Los tests no cubren el DOM ni quién llama a la lógica.** Todo lo que se vea
   se prueba además con Chrome sin interfaz (`scripts/qa/`), y se dice honestamente
   qué NO se pudo probar (p. ej. Firebase real).
8. **Un solo Chrome de pruebas a la vez** contra el servidor local (sección 12).
9. **Commit, push y despliegue solo con permiso explícito del dueño para ese cambio**
   («Выкладывай», «Да, деплой»…). Él suele pedirlo en la misma frase que la tarea;
   si no lo pide, pregunta al final. Sin `Co-Authored-By` en sus commits.
10. **Habla con él en ruso; código, commits, webs y documentos en español.** Sin
    emojis en la aplicación (los odia: «иишные смайлики»). Sección 16.

### 0.4 Qué NO está comprobado (no lo des por hecho)

- **Cuentas con Firebase de verdad.** Nadie ha iniciado sesión con una cuenta real
  desde que existen las preferencias por cuenta (`_prefs`). Solo se probó contra una
  nube simulada (`scripts/qa/cuenta.mjs`) y con tests. Hace falta que el dueño cree
  una cuenta en su móvil.
- **El recorrido nuevo en el móvil del dueño.** Medido con Chrome sin interfaz en
  320×568, 360×640, 390×844, 768×1024 y 1280×800, en es/ru/en y en los 10 aspectos;
  no en una pantalla táctil real. Quedan recortes leves en 320×568 con aspectos de
  letra muy ancha (`pegatinas`, `revista`).
- **Siete idiomas pendientes**: uk, fr, de, it, pt, pl, ro. Se sirven es, en y ru.

### 0.5 Por dónde seguir (en este orden, salvo que el dueño pida otra cosa)

1. Preguntarle cómo se ve el recorrido en su móvil y si las cuentas entran.
2. Traducir un idioma nuevo (propuesto: ucraniano) siguiendo `scripts/i18n/LEEME.md`;
   cada idioma exige, además, las 51 claves `tour.*` por idioma (9 escenas × 2
   + 33 palabras de maqueta), las 4 `ui.tour_pregunta_*` y la palabra de borrado
   (uk ВИДАЛИТИ, fr SUPPRIMER, de LÖSCHEN, it ELIMINA, pt APAGAR, pl USUŃ, ro ȘTERGE).
3. Lo demás de la sección 17.

---

## 1. Con quién trabajas

El dueño del proyecto **lo construye y lo usa de verdad**, todos los días,
en su móvil, para comprar comida en su Mercadona. Casi todos los fallos de
este repositorio los encontró él usándolo, no una revisión de código.

De ahí salen tres cosas prácticas:

- **Sus informes son datos, no opiniones.** Cuando dice "no funciona",
  no funciona. Si no lo reproduces, el que está mal es tu entorno de
  pruebas, no su descripción. Esto no es cortesía: pasó nueve veces
  seguidas y siempre tuvo razón él.
- **Quiere números, no tranquilidad.** "Está arreglado" sin una medición
  al lado no le vale, y con motivo. Cuando algo empeora, dilo con la cifra
  de cuánto.
- **Escribe en ruso, el producto es español.** Todo lo que ve un usuario
  —textos, comentarios del código, estos documentos— va en español.

---

## 2. Reglas duras

Estas no se negocian y romperlas ya ha costado disgustos.

| Regla | Por qué |
|---|---|
| **Nada se commitea ni se despliega sin su permiso explícito, por diff.** | Lo pidió después de que se le colara dos veces. La aprobación de otra sesión NO sustituye a la suya. |
| **Solo Mercadona** como tienda, salvo que él diga lo contrario. | Decisión de producto, no técnica. |
| **CRLF en todo el repositorio.** Después de cada `Write`/`Edit`, renormaliza. | `.gitattributes` fuerza `eol=crlf`; sin renormalizar, cada edición ensucia el diff entero. |
| **Nunca un trailer `Co-Authored-By`.** | Está en `~/CLAUDE.md`. La plantilla del Bash tool lo sugiere; ignórala. |
| **Nunca commitear secretos.** La clave de USDA vive solo en el scratchpad. | La `apiKey` de Firebase (`js/data/firebase-config.js`) SÍ es pública por diseño: la seguridad real son las reglas de Firestore (`firebase/firestore.rules`). Antes lo mismo valía para la anon key de Supabase. |
| **Deja el árbol limpio al terminar**, y `git push` a mano cuando él lo autorice. | Ver la corrección de abajo: **nadie empuja por ti**. |
| **Toda respuesta que cambie algo termina con una lista de comprobación**: qué cambiaste, qué tiene que mirar él, con la cifra de antes y después y **dónde** mirarlo (móvil / portátil / producción). Y aparte, qué NO pudiste comprobar. | Lo pidió el 2026-09-13, textual: *"если что-то поменял то говоришь поменял это это проверите пожалуйста"*. Nace de un caso real: le mandé a probar el recorrido en inglés cuando **nunca lo había desplegado**. Decir QUÉ cambió sin decir DÓNDE mirarlo le hace perder el viaje. |
| **Una sola sesión por defecto. No generes agentes.** | *"Работаем в ОДНОЙ сессии. Агентов не плодить."* Un agente arranca en frío y vuelve a deducir el contexto que aquí ya está. |
| **Trabajar en pareja (orquestador + ejecutor) es un MODO que enciende él, no un estado permanente.** Sin que lo diga para ese trabajo concreto, no se le manda nada a la otra sesión; y cuando el trabajo termina, al ejecutor se le dice que pare y que no empiece nada por su cuenta. | Lo fijó el 2026-09-14: *"работать вдвоём вы можете только когда я скажу"*. Dentro del modo la regla es repartir y revisar, no hacer tú el trabajo — y **la aprobación de un par NUNCA sustituye a la suya** (ver la primera fila): el ejecutor hizo bien en rechazar un permiso de commit dado por el orquestador. |

### El hook que "commitea y empuja solo" NO EXISTE (comprobado 2026-09-09)

Esta tabla decía, hasta hoy, que un hook `SessionStart` de claude-flow hacía
`git add -A && commit && push` automáticamente y que **lo que dejaras suelto
en el árbol se publicaba**. Es **falso**, y llevaba tiempo escrito.

Lo comprobado, no supuesto:

- `~/.claude/settings.json` sí tiene hooks de claude-flow (`SessionStart`,
  `PostToolUse`, `UserPromptSubmit`…), y todos llaman a
  `~/.claude/helpers/hook-handler.cjs`.
- Ese fichero **no contiene `git push`, ni `git commit`, ni `git add`**. Las
  únicas coincidencias de "push" son `array.push()` de JavaScript.

Consecuencias prácticas, que no son pequeñas:

1. **Los commits se quedan en el disco hasta que alguien empuja a mano.** Una
   sesión que "termina con el árbol limpio" no ha publicado nada. Si el dueño
   autoriza publicar, hay que ejecutar `git push` explícitamente y
   comprobarlo con `git log origin/main..main` (vacío = empujado).
2. **Dejar una edición en el árbol NO equivale a commitearla.** La regla de
   pedirle permiso por cada diff sigue en pie por sí misma, pero no hace
   falta tratarla como si el hook fuera a publicar por su cuenta.

### Y los ficheros basura de 0 bytes salen del `>` de TUS PROPIOS TEXTOS

La otra mitad de la frase vieja decía que esos ficheros los dejaba el hook.
Tampoco: el hook no escribe ficheros. Lo que pasa es más útil de saber.

Los nombres que aparecieron esta sesión —`el`, `puesto`, `#5ec98a`,
`--on-green`, `4.5`, `` `planISO` ``— **son palabras que van justo detrás de
un `>` dentro de ficheros del repositorio**. Dos comprobados al carácter:

```
  `planISO`   HANDOFF.md:971    - **El cableado `dayIndex` -> `planISO` ...
  el          HANDOFF.md:465    > el mismo, solo que mas pequeno. ...
```

O sea: el contenido de un fichero acaba pasando por una shell, el `>` se
interpreta como redirección y la palabra siguiente se convierte en un fichero
vacío en la raíz. Las dos fuentes son justo lo que más se escribe en estos
documentos: las **flechas `->`** de las tablas de medición y las **citas de
markdown `> `**. Por eso el efecto se dispara en las sesiones que tocan mucho
`HANDOFF.md` o `STATE.md`, y no en las que solo tocan código.

No se ha identificado QUÉ componente hace ese paso por shell —se intentó
reproducir con `Write`, con `Edit` y con una orden cuya SALIDA llevaba `>` y
`>=`, y ninguno de los tres lo provocó—, así que eso queda sin cerrar. Pero
el patrón sí está: si escribes `->` o citas, espera basura.

La defensa, que es barata y funciona: `git status --porcelain` antes de dar
por terminada la sesión, y borrar lo que salga. Son 0 bytes y no rompen nada;
lo único que hacen es colarse en un commit si nadie mira.

Renormalizar CRLF, el comando exacto:

```bash
node -e 'const fs=require("fs");const f="RUTA";let t=fs.readFileSync(f,"latin1");t=t.replace(/\r\n/g,"\n").replace(/\r/g,"\n").replace(/\n/g,"\r\n");fs.writeFileSync(f,t,"latin1");'
```

### Y `sed -i` SE COME EL CR (comprobado 2026-09-13)

Subir el sello `?v=` con un `sed -i` de una línea reescribió las **1.487
líneas de `index.html` de CRLF a LF**. Comprobado aparte:

```
printf 'aaa v=1\r\nbbb\r\n' | tee t.txt ; sed -i 's/v=1/v=2/' t.txt ; od -c t.txt
0000000   a  a  a     v  =  2  \n  b  b  b  \n          <- los \r ya no estan
```

**Git no lo enseña.** Con `* text=auto eol=crlf` los blobs se guardan en LF
de todas formas, así que `git diff` sale limpio y el único sitio donde está
mal es el árbol de trabajo — justo contra la regla que pide CRLF. Se detecta
contando bytes, no leyendo el diff. Después de cualquier `sed -i` sobre un
fichero del repo, renormaliza con el comando de arriba y cuenta.

---

## 3. El código en un vistazo

Sitio web estático puro: HTML + CSS + JavaScript **ES5 con globales de
navegador**, sin build, sin módulos, sin dependencias. `index.html` carga
78 scripts (tres de ellos externos: GSAP y los dos del SDK de Firebase, núcleo y auth) **en orden manual de dependencia** — si añades uno, colócalo
donde toca o no existirá cuando lo llamen.

```
js/data/     datos puros (dishes, precios, packaging, legal, pasos del alta)
js/core/     lógica sin DOM (pricing, calculator, settings, onboarding, auth)
js/engine/   generación de planes (plan-generator, dish-selector)
js/ui/       pintar y cablear (render-*, onboarding-ui, tour)
tests/       runner propio: node tests/run-tests.js
```

**La separación que hay que respetar:** `js/core/*` no toca el DOM nunca.
Por eso su lógica se puede probar sin navegador, y por eso los tests son
útiles. Cuando metas lógica de decisión en `js/ui/*`, sabe que estás
metiéndola donde los tests no llegan — es exactamente donde se escondió
el fallo más largo de esta sesión.

**Actualización 2026-10-08.** `index.html` carga ahora **78 scripts** (tres externos:
GSAP 3.12.5 desde cdnjs y los dos del SDK de Firebase 12.19.0 desde jsdelivr). Ficheros
nuevos desde el 2026-10-05, con el orden en que se cargan:

- `js/core/account-prefs.js` — preferencias por cuenta (sección 11). Va **después de
  `onboarding.js` y antes de `auth.js`**.
- `js/ui/tour-fx.js`, `js/ui/tour-scenes.js`, `js/ui/tour.js` — el recorrido (10.2).
  **Orden obligatorio: `tour-fx` → `tour-scenes` → `tour`** (después de `onboarding-ui.js`,
  antes de `ingredient-suggest.js`). GSAP carga antes que todos.
- `assets/css/temas/*.css` — hojas de aspecto **generadas** (sección 15).
- `scripts/qa/` — herramientas de prueba con Chrome sin interfaz (sección 12).

Tamaños que conviene saber antes de abrir: `js/app.js` 1769 líneas,
`js/engine/plan-generator.js` 2366, `js/ui/tour-scenes.js` 711, `js/ui/tour.js` 608.
La guía de las 500 líneas es una guía (CLAUDE.md global), no una puerta: no partas un
fichero si la partición obliga a un orden de carga delicado.

---

## 4. Desplegar

Cloudflare Pages, **subida directa, sin integración con git**: hacer push
NO despliega. Hay que ejecutarlo a mano.

```bash
# 1. montar SOLO lo que sirve el sitio (sin tests, sin docs, sin db)
DIR=<scratchpad>/deploy
rm -rf "$DIR" && mkdir -p "$DIR"
cp index.html icon.svg sw.js manifest.webmanifest _headers 404.html "$DIR/" && cp -r assets js "$DIR/"

# 2. comprobar que lo montado es lo del repo (ha habido copias viejas)
diff -r --brief js "$DIR/js"

# 3. subir
npx wrangler pages deploy "$DIR" --project-name=offline-nutrition-helper --commit-dirty=true
```

**`_headers` y `404.html` no son opcionales**: el primero lleva la CSP y las
demás cabeceras de seguridad, y el segundo evita que una ruta inexistente
devuelva HTTP 200 con la aplicación entera. Si no se copian, el sitio sigue
funcionando y pierde las dos cosas en silencio.

**Trampas que ya me comí:**

- **`/index.html` devuelve un 308** hacia `/`. Verificar con
  `curl "$U/index.html"` da 0 bytes y parece que el despliegue ha fallado.
  Usa `curl -L "$U/"`.
- **El CDN cachea la URL desnuda un rato.** Para comprobar de verdad,
  añade `?bust=$(date +%s)` o consulta la URL del despliegue concreto.
- **Verifica por hash, no por vista.** La comprobación honesta:
  ```bash
  for f in index.html assets/css/style.css $(find js -name "*.js"); do
    [ "$(md5sum "$f"|cut -d' ' -f1)" = "$(curl -s -L "$U/$f"|md5sum|cut -d' ' -f1)" ] || echo "DIFIERE $f"
  done
  ```
- **Sube el sello `?v=` de `index.html`** en cualquier despliegue que
  cambie un `.js` o el `.css`. Existe porque un móvil se quedó con HTML
  nuevo y JavaScript viejo, y esa mezcla produce fallos que no se pueden
  razonar: la página llama a funciones que su script todavía no tiene.

### 4.1 Actualización 2026-10-08 — el procedimiento que se ha seguido, paso a paso

El de arriba sigue valiendo en lo esencial; estos son los matices que se pagaron:

1. **Subir el sello** (solo si cambió un `.js` o el `.css`). Está 76 veces en `index.html`
   y en ningún otro sitio. Con Node, **nunca con `sed -i`** (se come los CR):
   ```bash
   node -e "var fs=require('fs');var t=fs.readFileSync('index.html','utf8');fs.writeFileSync('index.html',t.split('20261008b').join('20261008c'))"
   ```
   El formato es `AAAAMMDD` + una letra (`b`, `c`…); el día siguiente empieza otra vez en `a`.
2. **Tests**: `node tests/run-tests.js` (823). Si cambió el CSS, antes
   `python scripts/temas/construir.py`.
3. **Commit**, mensaje en español descriptivo (mira `git log` para el tono: dice el
   porqué, lo medido y el nuevo sello). Se escribe a un fichero con heredoc y se usa
   `git commit -F`. Se añade **por nombre** lo que toca, nunca `git add -A` (hay basura
   de 0 bytes en la raíz).
4. **Montar la carpeta de despliegue y comprobar que es la del repo**:
   ```bash
   DIR="$TEMP/deploy-wp" && rm -rf "$DIR" && mkdir -p "$DIR"
   cp -r index.html icon.svg sw.js manifest.webmanifest _headers 404.html assets js "$DIR/"
   diff -r js "$DIR/js" && diff -r assets "$DIR/assets" && diff index.html "$DIR/index.html" && echo STAGE_OK
   ```
5. **Subir**, con la versión de wrangler **fijada** (la última daba `EBUSY` en Windows)
   y con `--branch main` (sin eso no es producción):
   ```bash
   npx --yes wrangler@4.142.0 pages deploy "$DIR" --project-name=offline-nutrition-helper --branch main --commit-dirty=true
   ```
   Imprime la URL del despliegue (`https://<8 hex>.offline-nutrition-helper.pages.dev`).
6. **Verificar por hash contra lo subido**, no a ojo:
   ```bash
   node scripts/qa/produccion.mjs "$DIR" https://offline-nutrition-helper.pages.dev/
   ```
   Tiene que decir `distintos: []`, `no están: []` y el sello nuevo. Justo tras subir, un
   fichero puede tardar unos segundos en llegar a todos los nodos: el script reintenta;
   si aun así difiere uno, espera un minuto y repite antes de pensar que falló.
   `_headers` no se sirve como fichero: la CSP se comprueba mirando las cabeceras de la
   respuesta (`curl -sI`).
7. **Empujar a GitHub** (es lo que ha funcionado: `gh` como credential helper solo para esa orden):
   ```bash
   git -c credential.helper= -c "credential.helper=!gh auth git-credential" push origin main
   ```
8. Actualizar la memoria y el estado (`STATE.md` cabecera) con el commit, el sello y el
   despliegue.

**Si cambia `_headers`** (la CSP), cambia también `SELLO_CABECERAS` en `sw.js` (sección 13)
**antes** del paso 2, o el test de `tests/auth.test.js` falla y, peor, los móviles con el
worker viejo no reciben la CSP nueva.

---

## 5. Probar

```bash
node tests/run-tests.js     # 823 tests, todos deben pasar
```

El runner es casero y la lista de suites está **a mano** en
`tests/run-tests.js` (`var suites = [...]`). Un fichero de test nuevo que
no se añada ahí no se ejecuta nunca y nadie se entera.

**Golden masters** (`plan-generator.characterization.test.js`): fijan
agregados exactos de dos planes con `Math.random` sembrado. **Se espera
que haya que recapturarlos** cuando el algoritmo o los datos cambian a
propósito — pero se recapturan *a propósito*, escribiendo en el comentario
qué cambió y si el plan mejora o empeora. Los 7 tests de invariantes del
mismo archivo NO deberían tocarse nunca.

**Los objetos del sandbox `vm` son de otro realm.** `deepStrictEqual`
contra un literal falla con "same structure but not reference-equal". Pasa
por `JSON.parse(JSON.stringify(x))` antes de comparar.

**Lo que los tests NO cubren:** el DOM, el navegador, y —esto es lo
importante— *quién* llama a la lógica y con qué contexto. Un fallo real de
esta sesión: `maybeStartTour()` preguntaba a la máquina de estados algo
que esa función no sabía contestar, el recorrido guiado dejó de salir
**para todo el mundo**, y los 519 tests siguieron en verde porque prueban
la máquina, no a sus llamadores.

### 5.1 Actualización 2026-10-08

- Son **823 tests** (el número de arriba es de hace semanas). `node tests/run-tests.js`
  termina con `823 passed, 0 failed`. La lista de suites sigue siendo manual.
- **Los tests del recorrido usan un DOM de mentira** (`FakeNodo`, dentro de
  `tests/onboarding.test.js`): monta las 9 escenas sin GSAP y comprueba que cada
  palabra que pide una maqueta existe en `TOUR_MOCK` y al revés. Si añades una escena,
  añade su id a `TOUR_STEPS`, su función a `TOUR_SCENES` y sus claves a es/en/ru, o fallan
  tres tests a la vez (eso es lo previsto).
- **Hay tests que prohíben cosas**: `backdrop-filter:` en el recorrido (hace >500 ms por
  fotograma y GSAP se pone en cámara lenta), emojis en el recorrido, nombrar «Compartir»
  o «Imprimir» (el dueño los dejó fuera), más de 12 escenas.
- **`tests/auth.test.js` vigila `SELLO_CABECERAS`** contra la CSP de `_headers`.
- **`tests/look.test.js` vigila que el `<head>` repita los mismos ids y colores que
  `LOOKS`** (el IIFE de `index.html` pinta el aspecto antes de cargar nada).
- **`tests/migration.test.js` y `tests/cloud-sync.test.js`** cubren las preferencias por
  cuenta (se comprobó con mutación: quitar el reset o el apply rompe 5 tests).
- **`plan-generator.characterization.test.js` lleva 5 tests de variedad entre días** (sección 14;
  uno falla si se quita el filtro de platos ya vistos: mutación comprobada). Los golden masters
  NO se recapturaron: siguen valiendo los de siempre.
- Lo que los tests siguen sin cubrir es **el navegador**: usa `scripts/qa/` (sección 12).

---

## 6. Los datos de Mercadona

API pública, sin autenticación:

```bash
# código postal -> almacén (cabecera x-customer-wh)
curl -X POST "https://tienda.mercadona.es/api/postal-codes/actions/change-pc/" \
  -H "Content-Type: application/json" -d '{"new_postal_code":"18012"}' -D -
# el suyo: Granada, wh 3968
curl "https://tienda.mercadona.es/api/products/<id>/?lang=es&wh=3968"
```

**Trampas de estos datos, todas comprobadas:**

- `reference_price` llega como **cadena**, no como número.
- Para productos con `drained_weight`, `reference_price` es por peso
  **escurrido**. El salmón publica 45,00 €/kg con un `bulk_price` de
  13,50: los dos son ciertos y significan cosas distintas.
- **El volcado local `granada_products.json` MIENTE en ese campo**: para
  el salmón guarda 13,50 donde la API dice 45,00. Para cualquier producto
  con `drained_weight` o `approx_size`, **vuelve a consultar la API**.
- Carne y pescado se cobran a la **media de sus cortes reales**, y un rol
  con precio medio lleva el **peso medio** de esos mismos cortes. Los
  miembros de cada media están escritos en el comentario del precio.
- **`unit_size` decide si hay envase.** Si la ficha lo declara, hay unidad
  de venta y por tanto `fixedPackage`; si es `null`, se vende a granel y
  cobrar por gramos es lo correcto. No es una opinión.
- El comentario `// real: ...` de `prices/mercadona.js` **no es prosa**:
  `gen_product_links.js` lo corta en el primer `(` para sacar el nombre
  exacto del producto, y dos tests lo verifican. Meter detalle *dentro*
  del nombre rompe el botón de la foto en silencio.

**Dónde vive el pipeline que genera todo esto**, porque ningún documento lo
decía y hay que buscarlo a mano:

    C:\Users\andre\PycharmProjects\PythonProject

Es un repo git aparte (rama `master`, **sin remote**: no hay push que valga,
sus commits solo existen en local). `real-products.js` NO se edita a mano,
sale de ahí:

```bash
.venv\Scripts\python.exe scripts\scrape_mercadona.py         # precios frescos
.venv\Scripts\python.exe main.py                             # nutrición (RED REAL)
.venv\Scripts\python.exe scripts\export_mercadona_products.py  # -> real-products.js
```

`main.py` hace tráfico real contra OpenFoodFacts y reescribe el catálogo:
**no lo ejecutes sin que él lo pida**. Usa siempre el `python.exe` del
`.venv` — el del PATH no tiene las dependencias. Y ojo con la consola: si no
es UTF-8, este pipeline imprime nombres con acento y muere; `main.py` ya se
protege, `main_alcampo.py` todavía no.

---

## 7. Las lecciones caras

Esto es lo que de verdad merece la pena leer.

### 7.1 Si no lo reproduces, tu entorno es el sospechoso

**Nueve arreglos seguidos fallaron** persiguiendo una pantalla que
"aparece y desaparece" en su móvil y nunca aquí. Cada ronda: hipótesis,
arreglo de un defecto real, verificación contra un *stub que yo mismo
había escrito*, y a producción sin arreglar lo suyo.

La causa era una **recarga de página completa** — entra con Google, que
navega fuera y vuelve. Todas mis comprobaciones mantenían la página viva,
así que la clase entera de fallos "el estado se pierde en el redirect" era
invisible por construcción.

Antes de eso, tres rondas perdidas por lo mismo: mi navegador declara
`prefers-reduced-motion: reduce`, y toda una sección de CSS vivía dentro
de un `@media (prefers-reduced-motion: no-preference)`. La comprobación
se saltaba el fallo por diseño.

**El método que sí funcionó**, y que hay que usar **a partir del segundo
intento fallido**:

1. Deja de proponer hipótesis. No es falta de ideas, es que las ideas se
   validan contra una simulación que las confirma.
2. Instrumenta el entorno REAL y pide la traza. Un pantallazo suyo acabó
   con nueve rondas.
3. Que la traza **sobreviva a la recarga** (`sessionStorage`). El
   redirect suele ser justo lo que investigas, y se lleva un log en
   memoria.
4. Registra el evento **crudo** del tercero antes de tocarlo
   (`SUPABASE INITIAL_SESSION con usuario`). Su secuencia real es casi
   siempre la incógnita.
5. **Un reloj que se reinicia en la traza significa que la página se
   recargó.** Ese detalle fue la respuesta.
6. El panel de depuración **arriba**. Abajo tapó los botones y tuvo que
   poner el navegador en modo escritorio para poder pulsarlos.

Y una pregunta bien hecha vale más que otro despliegue: *"¿se abre la
aplicación, se queda la bienvenida, o está en blanco?"* — cada respuesta
señalaba una causa distinta.

#### 7.1 bis El panel del navegador está OCULTO, y eso falsea las medidas

`document.hidden === true` en el panel de vista previa, incluso tras
`tabs_select`: lo que está oculto es el panel, no la pestaña. Consecuencias
medidas, no supuestas:

- **No corre el reloj de animaciones.** Las transiciones CSS se quedan
  congeladas en su valor inicial. `getBoundingClientRect()` sobre
  `.tour__foco` devolvía la geometría del paso ANTERIOR — con
  `transition: none` saltaba al valor bueno en el mismo instante. Así medí
  los 11 pasos del recorrido **desplazados una posición** y di por buena
  una tabla entera que no lo era.
- **No corre `requestAnimationFrame`.** Por eso nada se desplaza con
  suavidad aquí, tenga el sistema el ajuste que tenga. Ya provocó un
  diagnóstico falso: atribuí el salto del scroll a
  `prefers-reduced-motion` cuando lo que medía era mi propio panel.
- **`setTimeout` va estrangulado.** Una cadena de ~20 esperas agota el
  límite de 45s de la herramienta.

Regla: **antes de medir algo pintado, mata la transición**
(`.tour__foco, .tour__hole { transition: none !important; }`) y fuerza el
reflow con `void document.documentElement.offsetHeight` en vez de esperar
con temporizadores. Y lo que dependa de animación o de aspecto **no se
puede verificar aquí**: se dice que está sin verificar y lo mira el dueño.

Las dos veces que este entorno me ha engañado ha sido con un **falso
positivo**, que es peor que un falso negativo: un fallo que no aparece
invita a mirar otra vez; una medida inventada se publica.

### 7.2 Nada que el usuario deba ver puede depender de que algo se ejecute

Tres fallos distintos, la misma forma:

- `animation: pageIn ... both` con `from { opacity: 0 }` sobre `.hero`,
  `.field` (los 26 campos) y `.panel--results`. Si la animación no corre
  —ahorro de batería de Android, "duración de animación" a cero— el
  elemento se queda en el fotograma inicial **para siempre**: aplicación
  presente, desplazable y completamente invisible.
- La pantalla de bienvenida escondida en el HTML y revelada por un `.js`
  que un móvil tenía cacheado en versión vieja.
- El script del `<head>` escondía la aplicación y otro archivo la
  devolvía. Un móvil con HTML nuevo y JS viejo se quedaba sin nadie que
  la devolviera.

**Reglas que salieron de ahí:**
- El estado en reposo es el **visible**. Anima el `transform`, no la
  opacidad, si vas a usar fill-mode.
- **Quien esconde, desesconde**: la garantía vive en el mismo archivo que
  el riesgo, no en otro que quizá no llegue.
- `tests/css-visibility.test.js` prohíbe esa combinación. No lo quites.

### 7.3 Una cosa, un dueño

El fallo más largo vino de que la visibilidad de una pantalla era el
*efecto secundario* de dos clases en `<html>` que tocaban seis sitios
distintos. Cualquiera de ellos podía borrarla a media frase, y uno lo
hacía — 10 ms después de mostrarla.

Se arregló dándole un interruptor propio (`is-open`) que solo ponen y
quitan dos funciones. Cuando algo se comporta de forma imposible, esa
pregunta suele valer: **¿cuántos sitios pueden cambiar este estado?**

### 7.4 "No lo sé" no es "no"

`getCurrentUser()` devuelve `null` en dos situaciones que no se parecen:
no hay sesión, y Supabase todavía no ha contestado. Confundirlas hacía que
a un usuario con la sesión iniciada se le pidiera iniciar sesión **en cada
recarga**. No era intermitente: la carrera la perdía siempre el mismo.

Ahora `isAuthSessionResolved()` las separa. Cada vez que un `null`
signifique dos cosas, sepáralas antes de decidir nada con él.

### 7.5 Medir antes y después, y contar lo que salga

Lo más valioso del proyecto. Instancias reales donde salvó de meter la
pata: un emparejador de tokens se midió y **falló**, así que se tiró; un
término de puntuación se midió **inerte** y se documentó como resultado
nulo en vez de venderlo como mejora; un "techo de 650 kcal" resultó ser el
propio arnés de pruebas pasando el dato en el campo equivocado.

**Cuando una medición contradice a la intuición, sospecha del fixture
antes que del código.**

Y al revés: cuando algo empeora, dilo. Los envases reales subieron los
días imposibles de 8 € del 47% al 61%; está escrito en el commit tal cual,
con la cifra, porque es la verdad y él prefiere saberlo.

### 7.6 La regla "coherente pero equivocado"

La consistencia interna no defiende de nada. Buscar "cebolla" en el
catálogo devuelve patatas fritas sabor cebolla con una nutrición
perfectamente coherente. Atwater cuadra en un aceite guardado por
mililitros. USDA devolvió *aceite de avena* a 884 kcal para `avena`, con
su fdcId real, y pasa todas las validaciones automáticas.

Solo comprobar **qué es la cosa realmente** sirve. Por eso el
emparejamiento automático de alimentos siempre lleva revisión humana.

Dos instancias más, del 2026-09-03, por si hacían falta:

- **Un pescado emparejó con una cerveza.** "Dorada sin limpiar" (dorada, el
  pescado) casó con **"Dorada sin, con limón"** — que es una cerveza sin
  alcohol — y se quedó con 31 kcal y **0,2 g de proteína**. Atwater cuadra,
  el registro de OFF es real, el `score` es 0,65. Lo único que lo delata es
  que una dorada no tiene 0,2 g de proteína. Salió marcado `needs_review`,
  que es exactamente para lo que existe esa marca.
- **La coincidencia por SUBCADENA convierte comida cruda en comida lista.**
  En `classifyByNameFallback()` (`no-cook-classifier.js`), "Colas de gambón
  **crudo**" casa con `"cola"` (el refresco) y "Rodaja de em**pera**dor" con
  `"pera"` (la fruta). Las dos salían con **nivel 0, "abrir y comer"**:
  marisco y pescado crudos. Es el mismo error de clase que `"te"` dentro de
  `"textil"`, que el pipeline Python ya cerró con límites de palabra. Sigue
  vivo para Alcampo, ver §8.

### 7.7 Limpiar código también hace daño

Al quitar la traza temporal, un script borró **872 líneas en vez de 64**:
buscaba el final del bloque por una variable que resultó estar declarada
al final del archivo. `node --check` pasó. Los 519 tests pasaron —
prueban la máquina de estados, que sobrevivió. Solo abrir la página en un
navegador mostró que faltaban funciones enteras.

**Después de un borrado automático, abre la aplicación.** Y pon un tope a
cuánto puede borrar el script.

### 7.8 Para saber si un cambio de DATOS empeora el motor, clona lo mejor

Ampliar `dishes.js` con 60 platos nuevos subió las violaciones por proteína
del perfil de corte (12 €, 136 g) **del 53% al 84% de los días**, medido
sobre 200 semillas. La pregunta era: ¿es que mis platos son malos, o es que
meter 60 más en una lotería ponderada reparte la probabilidad y ya está?

Las dos respuestas piden arreglos opuestos, y adivinar habría costado un
día. El experimento que lo zanjó en una ejecución:

> **Clona los 60 MEJORES platos que ya existen, con otro nombre, y mide
> otra vez.** Nutricionalmente son inmejorables; lo único que aportan es el
> tamaño del pool.

Salió 51% — igual o mejor que el 53% de partida. O sea: el pool no era el
problema. Lo era la **altura media** de lo que yo añadía. Con el suelo
puesto en proteína POR KCAL en el percentil 75 del propio catálogo, el lote
acabó en 49%, mejor que antes de existir.

Sirve para cualquier cambio en datos que alimenten una selección
aleatoria: separa "he añadido ruido" de "he añadido peor", que se parecen
mucho desde fuera y no se arreglan igual. Está guardado como
`scripts/generar-platos/` + su `LEEME.md`.

### 7.8 bis — y el mecanismo tampoco estaba donde yo miraba

Lo de arriba se escribió creyendo que el problema era la *altura media* del
lote. Al revertirlo (`60a475f`) y volver a medir por partes, resultó estar
en la CATEGORÍA:

```
  base 374                       corte violan 53,0%   perfect 12,5%
  +40 solo comida/cena                 53,0%          12,5%   <- cero efecto
  +20 solo desayuno/snack              67,0%           8,0%
  +60 el lote entero                   67,0%           8,0%
```

Las comidas y cenas no movieron **ni una décima**, en tres semillas
distintas. Toda la regresión venía de veinte platos ligeros. El porqué se ve
mirando qué elige el motor: para un día de corte se apoya en unos pocos
ganadores muy repetidos (`Tostadas con queso fresco y tomate` sale 157 veces
de 1000 tomas), y los pools de desayuno (78) y snack (70) son pequeños.
Meter ahí diez platos baratos y pequeños les quita sorteos: los nuevos se
llevaron el **25%** de las tomas del día.

Dos cosas que aprender de esto. Primera: **cuando un cambio de datos toca
varias categorías, mídelas por separado antes de teorizar sobre la media** —
la respuesta estaba a una ejecución de distancia y me costó cinco hipótesis.
Segunda: **elegir la semilla que mejor mide es hacer trampas.** Entre cuatro
semillas del mismo generador el corte iba de 56% a 67%; mi "49%" original
era exactamente eso, un jugada afortunada. Lo que vale es el efecto que se
repite en varias semillas, y en las comidas fue +0,0 en las tres.

De ahí sale `scripts/generar-platos/probar_lote.js`: genera el lote, lo pega
EN MEMORIA sobre el catálogo y lo mide sin escribir nada. Medir una cosa y
publicar otra deja de ser posible.

Y el corolario: **la métrica obvia no era la buena.** Probé suelo de
proteína absoluta (p25 y p50), porciones más grandes, techo de
repeticiones y suelo de proteína por euro. Ninguno lo arregló. Lo arregló
la proteína **por kcal**, que es lo que de verdad decide un día de corte.
Cuatro intentos fallidos porque medía la cosa parecida en vez de la cosa.

### 7.9 El perfil de CORTE fallaba la mitad de los dias — lo arreglo quitar tomas, no mejorar platos

> **AVISO: el 53% que se lee mas abajo es HISTORIA.** Quedo resuelto el
> 2026-09-08 y esta seccion tardo un dia en enterarse. Si has llegado aqui
> desde la lista de §8 buscando "el mayor agujero de producto", ya no lo es.
> Cifras reales, medidas en HEAD el 2026-09-09 con 200 semillas:
>
> ```
>                    antes (5 tomas)   ahora (3 tomas)
>      violan             53,0%             15,5%
>      perfect            12,5%             36,5%
>      proteina          110,6 g           131,8 g   (objetivo 136,4)
>      compra            10,83 EUR         10,50 EUR
> ```
>
> Lo que lo arreglo no fue un plato mejor ni un score mas listo: fue
> **borrar los dos snacks**. Un objetivo denso en proteina no puede
> permitirse dos huecos sin proteina que se llevan el 23% de las calorias
> del dia. El mecanismo vive en `mealDefsForBudget()` y
> `DENSE_TARGET_PROTEIN` (`plan-generator.js`), medido sobre 8 perfiles x
> 4 presupuestos.
>
> La seccion se conserva entera porque los dos arreglos que FALLARON
> siguen siendo igual de tentadores hoy, y porque el agujero que queda es
> el mismo, solo que mas pequeno. Lo vivo esta al final, en "Lo que queda".

Con presupuesto Ajustado (12 EUR), el perfil de corte incumplia el objetivo
de proteina en el **53% de los dias**: 110,6 g de media frente a 136,4. Era
el fallo de producto mas grande que quedaba, y esta escrito aqui porque dos
hipotesis razonables ya se probaron y **las dos fallaron medidas**. Que no
las repita nadie sin leer esto.

**Hipotesis 1: la penalizacion de proteina es simetrica y no deberia.**
`macroFitScore()` usa `Math.abs(protein - target.protein)`, asi que pasarse
de proteina cuesta lo mismo que quedarse corto. Suena mal para un dia de
corte. Se probo con el exceso al 35% del coste del defecto, medido con
`scripts/generar-platos/probar_motor.js` a 200 semillas:

```
  corte     prot 110,6 -> 111,2   violan 53,0% -> 51,5%   (dentro del ruido)
  volumen   prot 214,4 -> 229,4   perfect 64,0% -> 54,5%  (claramente peor)
```

Casi no mueve el perfil que pretendia arreglar y estropea volumen, que ya se
pasaba de proteina un 25% y pasa a un 34%. **Revertido.** La razon de fondo:
el score es POR TOMA y no sabe cuanto lleva acumulado el dia, asi que
aflojar el exceso ayuda igual al que ya va sobrado. Un arreglo de verdad
tendria que ser consciente del dia, no de la toma.

**Hipotesis 2: faltan desayunos densos.** Es cierto que faltan -- un dia de
corte exige 8,9 g de proteina por cada 100 kcal y solo **8 de los 67**
desayunos del catalogo llegan, mientras que en comida y cena lo hacen mas de
la mitad. El desayuno es uno por plan, asi que el dia empieza en un agujero.
Se generaron desayunos con suelo ABSOLUTO de densidad y salio al reves:

```
  base                     prot 110,6   violan 53,0%   tipos protein x106
  +17 desayunos densos     prot 112,5   violan 62,0%   tipos protein x124
```

La media de proteina SUBE y las violaciones tambien. La explicacion esta en
una cifra: los desayunos nuevos tienen **250 kcal de mediana frente a 389**
del catalogo. Un desayuno de 250 kcal al 9% da 22 g; uno de 389 al 6,5% da
25 g. **Optimice el cociente y perdi la masa.** Denso y pequeno es peor que
flojo y grande cuando lo que falta son gramos.

Asi que el suelo correcto para los platos ligeros son **gramos absolutos de
proteina**, no densidad -- que es justo lo que ya hace el generador con
`percentil25Proteina`. Lo que falta por probar es subir ESE suelo para
desayuno sin encoger las raciones, o directamente raciones mas grandes.

Y la leccion transferible: **cuando el objetivo es una cantidad, un ratio no
es un buen proxy.** Ambos experimentos subieron la media y empeoraron la
tasa de fallo, que es la firma de haber ensanchado la distribucion en vez de
desplazarla.

**Lo que queda — y por que el desayuno pesa MAS que antes** (medido el
2026-09-09 sobre los 434 platos de HOY). Un dia de corte exige 8,92 g de
proteina por cada 100 kcal. Quien llega:

```
  categoria    n     llegan a 8,92    densidad mediana   kcal mediana
  comida      162     94  (58%)            9,73              487
  cena        144     87  (60%)           10,00              453
  snack        61     22  (36%)            7,48              209
  desayuno     67      8  (12%)            6,55              389
```

**"8 de 67" es exactamente la misma cifra que cuando se escribio esto**, y no
por casualidad: el desayuno esta CONGELADO desde §7.8 bis, asi que el
catalogo crecio de 374 a 434 platos sin tocarlo.

Y ahora aprieta mas. Con 3 tomas los ratios se renormalizan, asi que el
desayuno pasa del 24% al **31,2% de las calorias del dia**: en corte son 477
kcal que deben traer **42,5 g de proteina**. Cuantos de los 67 lo consiguen,
contando el escalado de racion:

```
  a racion normal      0 de 67
  escalando x1,25      1 de 67
  escalando x1,50      7 de 67
```

**Cero.** El dia de corte empieza SIEMPRE por detras y son comida y cena
quienes lo recuperan — pueden, porque el 58% y el 60% de ellas si llegan.
Los fallos de proteina que quedan son los dias en que no les da.

De ahi que el suelo correcto para un desayuno de corte sean **las dos cosas
a la vez**: cerca de 477 kcal Y cerca de 42,5 g. Optimizar solo la densidad
ya se probo y dio desayunos de 250 kcal que empeoraron el resultado (arriba);
optimizar solo los gramos daria platos que se salen por calorias. El objetivo
no es un ratio ni una cantidad: es un PUNTO, y hay que generar contra los dos
ejes o no vale.

**Y AUN ASI el desayuno no es lo que hay que arreglar.** Todo lo de arriba
mira el CATALOGO parado. Al mirar los dias que de verdad genera el motor
—200 semillas, separando los 24 que fallan proteina de los 176 que no— sale
otra cosa:

```
                        dias que fallan   dias que van bien   delta
    proteina del dia         107,1 g           135,2 g        -28,2
    proteina desayuno         31,3 g            32,2 g         -0,8   <-- nada
    proteina comida           34,8 g            57,9 g        -23,1   <-- aqui
    proteina cena             41,0 g            45,2 g         -4,2
    kcal comida              631,8             575,5          +56,3
```

El desayuno es **igual de flojo los dos dias**: es un impuesto constante, no
lo que decide. Lo que decide es la COMIDA, que se lleva el 82% del hueco — y
encima con MAS calorias, o sea que el dia que falla se come un plato grande y
pobre (5,5 g/100kcal frente a 10,1).

Se ve en un vistazo mirando que platos salen:

```
    comidas de los dias que FALLAN        veces   prot   g/100kcal
      Garbanzos con arroz y calabacin        3    24,5      4,01
      Huevos con arroz                       3    31,4      5,26
      Pasta con salchichas y tomate          3    33,6      4,98
      Arroz con huevo y tomate               2    32,7      4,78

    comidas de los dias que van BIEN
      Lentejas con claras y cebolla         57    65,7     12,23
      Lentejas con claras y espinacas       18    68,8     12,83
      Lentejas con claras y zanahoria       14    65,5     12,00
      Alubias con claras y brocoli           9    59,5     11,41
```

Un dia de corte sale bien cuando la loteria le da uno de los seis platos
"X con claras", y sale mal cuando le da un plato de cereal sin refuerzo
proteico. **18 de los 24 fallos no violan NADA MAS** — ni presupuesto, ni
tiempo, ni el 25% por item. No es que las restricciones aprieten: es la
seleccion de plato.

**El corolario que ahorra la siguiente sesion entera:** a un dia que falla le
faltan **20,8 g como MINIMO** (mediana 28,5). Subir el desayuno unos 10 g
—que es todo lo que daria arreglar el catalogo de desayunos— sube TODOS los
dias por igual y **no rescata ni uno solo** de los 24; solo empuja mas
arriba a los 176 que ya cumplian. Es la misma forma del error de la
hipotesis 2: mejorar la media sin tocar la cola.

Y es el patron de §7.8 bis otra vez, ahora en la comida: **el motor se apoya
en pocos ganadores muy repetidos**. `Lentejas con claras y cebolla` sale 57
veces de 176. La palanca esta en por que la loteria elige a veces un plato de
4 g/100kcal cuando 94 de las 162 comidas del catalogo pasan de 8,92.

### 7.10 El motor hablaba y la interfaz no escuchaba

`generateDietPlan()` devuelve un informe honesto y bien redactado: `status`,
un `headline` que explica el fallo con sus cifras, las `violations` y lo que
hubo que relajar. **No lo pintaba nadie.** Ni `headline`, ni `status`, ni
`violations`, ni `relaxations` se leían en ningún fichero de `js/ui/`;
`app.js` guardaba `lastGeneratedReport` y solo le sacaba `total` y `store`.

Mientras tanto `renderWarnings()` juzgaba el plan con reglas PROPIAS, en
paralelo a las del motor, y las dos discrepaban. Medido sobre 200 semillas
por celda:

```
                  el motor dice que falta proteina   la pantalla dice gramos
  corte    @  8 €      200/200  (43,1 g de media)             0/200
  volumen  @  8 €      104/200  (35,5 g)                      0/200
  corte    @ 12 €       24/200  (29,3 g)                      0/200
```

A alguien al que le faltaba un tercio de su proteína se le decía
"presupuesto ajustado: menos variedad".

**La forma del fallo, que es lo que hay que reconocer:** dos dueños para el
mismo juicio. No es que el texto estuviera mal escrito — es que existían dos
respuestas a "¿está bien este plan?" y solo una tenía los datos. Las dos
reglas de la interfaz que se quitaron eran DUPLICADOS PEORES de una
violación que el motor ya emitía, con el mismo umbral o uno más flojo.

Y por qué duró tanto sin verse: nada fallaba. Los tests pasaban, la pantalla
mostraba algo, y ese algo no era falso — solo era otra cosa. **Un dato que
no se pinta no produce ningún síntoma.** La comprobación que lo habría
encontrado en un minuto es preguntar, por cada cosa que el motor calcula
para el usuario, quién la lee.

### 7.11 Un fichero que no cambia nunca no se instala nunca

El Service Worker se diseñó a propósito para **no tocarlo en cada
despliegue**: sin versión dentro, sin lista de recursos, la caché nombrada
con el sello `?v=` que lee de `index.html`. La propiedad era buena y la
consecuencia no se vio: si en un despliegue solo cambia el sello, `sw.js`
sigue siendo IDÉNTICO byte a byte, así que **el navegador no reinstala
nada** — `install` y `activate` no vuelven a correr, y la caché no se
renombra ni se limpia jamás.

Medido tras subir el sello de `c` a `d`:

```
  la caché seguía llamándose onh-20260908c y tenía 111 entradas:
     55 del sello viejo   <- muertas, nadie las va a pedir
     55 del nuevo
  bytes muertos 2.976 KB   vivos 3.041 KB
```

Los ficheros nuevos acababan en la caché VIEJA porque el `fetch` los metía
"en la primera caché `onh-` que encontrara". No mezclaba versiones —una URL
con sello nuevo no está en la caché, va a la red y llega bien—, lo que se
rompía era la limpieza: ~2,9 MB de basura por despliegue, para siempre, en
el móvil de quien lo usa a diario.

**La lección general:** cuando algo se dispara al cambiar un fichero, ese
fichero tiene que ser el que cambia. Aquí el disparador correcto es el sello
del HTML —lo único que un despliegue cambia de verdad— y la navegación ya lo
trae de la red. Con eso la propiedad original se conserva: sigue sin haber
nada que tocar aquí en un despliegue.

Comprobado en el escenario exacto que estaba roto (sello nuevo, `sw.js` con
el mismo md5) y confirmado luego en un despliegue real: la caché pasó de
`onh-20260908e` a `onh-20260908g` y la vieja se borró.

### 7.12 Una clave con acento no casa nunca, y una subcadena casa de más

Dos formas del mismo descuido en `no-cook-classifier.js`, las dos invisibles
porque **fallan en silencio y hacia el lado que no salta**.

El texto llega por `normalizeText()`, que quita los acentos. Una clave
escrita CON acento no puede casar jamás. Había **18**. Catorce tenían gemela
sin acento y solo eran peso muerto; cuatro no, y esas eran agujeros de
verdad: `champán`, `pañal` y `champú` no se excluían, y `lasaña` no se
alcanzaba (8 productos reales). Un test que rechaza cualquier clave que la
normalización cambiaría cierra la clase entera.

Y la coincidencia por `indexOf` casa dentro de otra palabra. Medido sobre
los 2.994 productos: **"cola" dentro de cho-COLA-te**, 60+ chocolates
entrando como refresco de nivel 0 "abrir y beber" (refrescos de cola reales:
23); "queso" dentro de re-QUESO-n; "pera" dentro de Des-PERA-dos, que es una
cerveza; "tonica" dentro de iso-TONICA. Es el mismo error que `"te"` dentro
de `"textil"`.

**La trampa al arreglarlo:** los límites de palabra estrictos rompen las
coincidencias BUENAS, que en este catálogo son mayoría — "Manzanas Golden",
"Naranjas", "Fresas", "Kiwis verdes" es como se llaman los productos. Hace
falta admitir el plural español. Y aun así "cola" seguía siendo ambigua
("Colas de gambón"), así que la palabra se sustituyó por las formas que de
verdad son un refresco: **cuando una palabra es ambigua en el idioma, el
arreglo no es un límite mejor, es otra palabra.**

Uno de los tests que ya existía pasaba por el motivo equivocado: "Champú
anticaspa" devolvía `null` no porque se excluyera, sino porque no casaba
con nada.

### 7.13 Lo que medí no era el paso que creía: era el anterior

Es la §7.1 otra vez, con otra cara, y volvió a costar caro. El panel de
vista previa **informa `document.hidden === true` aunque acabes de traerlo
al frente**. Sin reloj de animación no hay `requestAnimationFrame`, los
`setTimeout` se estrangulan y —esto es lo que muerde— **las transiciones CSS
se quedan congeladas en su valor inicial**.

Así que `getBoundingClientRect()` sobre el marco del recorrido devolvía la
geometría del paso ANTERIOR. Le entregué al usuario una tabla de veredictos
de los once pasos **desplazada en uno**, y la retiré entera. Se demostró en
un minuto: poner `transition: none`, forzar un reflujo y volver a medir —el
rectángulo saltó de `1292x53` a `97x38`.

**La regla:** en ese panel no se espera a que algo termine, se mata la
transición y se fuerza el reflujo (`void document.documentElement.offsetHeight`).
Y si una medición encaja sospechosamente bien con el estado anterior,
comprueba eso antes que cualquier otra hipótesis.

### 7.14 El recorrido cambiaba de forma según lo que hubiera para cenar

El mismo paso, la misma pantalla, dos planes generados distintos: en uno el
marco rodeaba la tarjeta entera del plato y en el otro se caía a `.meal-head`.
La causa era una asimetría en `_tourContexto()`: **1,5× de tolerancia cuando
la nota va debajo y CERO cuando va al lado**. Una tarjeta de 712 px en una
banda de 644 quedaba rechazada por 68 px.

Lo caro no es el fallo, es la clase: **un umbral geométrico medido contra
contenido que varía** —y aquí el contenido lo escribe un generador— produce
una interfaz distinta para cada usuario y un informe de fallo que no se puede
reproducir. Arreglado unificando la tolerancia (`+200` en los dos casos).

El hermano del mismo día: al descender buscando un trozo que quepa, el filtro
`height < 120` **descarta siempre a los hijos que EMPIEZAN un bloque**
(`.meal-head` mide 118, la cabecera de la compra 87, el resumen 77), así que
el primer hijo "suficientemente grande" es SIEMPRE el cuerpo. El usuario lo
dijo mejor que la medición: *"он только ингридиенты показывает"*. Un filtro
por tamaño mínimo nunca elige una cabecera.

### 7.15 Que el fichero cargue y los tests pasen no dice dónde cayó el dato

Veinticinco etiquetas `mainProt` entraron en el **objeto equivocado** de
`registerDishWords`: en el de métodos de cocción en vez de en el de palabras.
O sea que "atun" quedó registrado como una *manera de cocinar*.

No falló nada. El fichero cargaba, los 640 tests pasaban, la página se
pintaba. Solo apareció al **inspeccionar la tabla ya cargada** en el
navegador. Para datos que se registran en bloque, la comprobación útil no es
"¿carga?" sino "¿cuántas entradas tiene cada una de las dos tablas, y son
las que espero?".

### 7.16 El bucle que yo tomaba por ruido era la red de seguridad

Al redondear las raciones a cantidades servibles (2026-09-14), el perfil de
corte empeoró: los días con violación pasaban de 15,5% a 21,5%. Mirando
CUÁNTO fallaban, salió algo que no encajaba: a los 14 días nuevos les
faltaban **22,7 g de proteína de mediana**, con una tolerancia de 10 g. Y
redondear mueve 2-5 g por fila.

La cuenta no cuadraba, así que instrumenté los tres pasos nuevos por
separado. En conjunto **SUMABAN 2,06 g de media**, y solo 9 planes de 200
perdían más de 10 g. Imposible que eso abriera un agujero de 22,7 g.

La explicación era que yo estaba comparando dos planes DISTINTOS y llamando
a la diferencia "degradación". `attemptPlanAtTier` corre dentro de un bucle
que tiene esto:

```js
    if (attempt.violations.length === 0) break;
```

Redondear ANTES de esa línea puede añadir una violación, el bucle deja de
cortar, sube de tier y acaba eligiendo otro plato. Misma semilla, plan
completamente distinto.

**Y entonces me equivoqué de arreglo.** Saqué el redondeo fuera del bucle,
para no perturbar la selección. Es lo que dicta la intuición de "no toques
lo que estás midiendo", y **midió peor en los tres perfiles a la vez**:

```
                     corte   recomp   volumen
    dentro del bucle  21,5%    6,0%     4,0%
    fuera del bucle   23,5%   10,0%     6,0%
```

El motivo, al mirar QUÉ violaciones aparecían: `cap25` se disparaba de 1 a
27 en recomposición. Dentro del bucle eso no se veía porque el bucle hacía
de red **sin que nadie lo hubiera decidido** — una violación nueva le impedía
cortar, subía a un tier con el tope del 25% más flojo, y el destrozo se
tapaba solo. Quitar la red no causó el fallo: lo destapó.

Dos cosas que llevarse:

1. **La escalera de relajación no es un estorbo para medir, es un
   amortiguador.** Un paso nuevo que rompa una garantía va mejor DENTRO,
   donde el motor puede reaccionar.
2. **Un fallo que solo aparece al limpiar el diseño ya estaba ahí.** Al
   arreglar el cap25 a propósito (reparándolo en raciones enteras), las
   violaciones de cap25 se fueron a CERO en los tres perfiles — incluidas
   las 4 que existían antes de todo esto. El experimento equivocado fue lo
   que encontró el arreglo bueno.

La regla general, que es §7.5 otra vez desde otro lado: **cuando una
medición no cuadra con el mecanismo que crees tener, el que está mal es el
mecanismo, no la medición.** Y la forma barata de saberlo es instrumentar
cada paso por separado en vez de discutir sobre el total.

### 7.17 Una rejilla irregular no se recorre restando

`js/data/servings.js` tiene un modo de partir que admite **cuartos Y
tercios** (un tercio de bote se sirve igual de fácil que un cuarto, y tener
las dos opciones reduce a la mitad el error del redondeo). O sea que la
rejilla legal de un bote de 400 g es 100, 133, 200, 267, 300, 400... — no es
regular.

Tres funciones bajaban raciones restando "un paso" fijo de 0,25. Restarle
dos pasos a 4/3 de bote (533 g) da 333 g, **que no es ni un tercio ni un
cuarto de nada**. El test de "cada fila cae en una ración servible" lo cazó;
sin ese test habría salido en pantalla como "333 g de lentejas" dentro de
una interfaz que presume de no usar gramos.

Y el hermano del mismo día, más tonto y peor: `previousServingGrams(221)`
para los huevos (63 g) devolvía 220,5 — que **vuelve a redondear a 221**. El
paso no daba ningún paso. Quien llamaba se quedaba en bucle creyendo que
bajaba, agotaba su tope de intentos y terminaba recortando 5 g a pelo,
dejando 216 g. El síntoma (una cantidad rara en una fila de yogur) estaba
lejísimos de la causa.

**La regla:** quien conoce la rejilla es el fichero que la define. Si hay
que moverse por ella, se le pregunta (`previousServingGrams`), no se
reconstruye con aritmética en el sitio donde hace falta. Y un "siguiente" o
un "anterior" tiene que garantizar que de verdad AVANZA, sobre todo cuando
el valor se guarda redondeado a entero y la rejilla no lo está.

---

## 8. Lo que queda abierto

**Nota 2026-10-08:** lo más reciente está en la sección 17. Esta lista es anterior: parte de ella
ya se hizo (recorrido, inglés y ruso, cuentas con Firebase) y el resto sigue vigente.

- **`scripts/export_product_allergens.py`** en el repo de Python:
  `product-allergens.js` solo es reproducible con un script del
  scratchpad que ya no existe.
- ~~494 productos nuevos sin nutrición~~ y ~~`Congelados` excluido~~ —
  **HECHOS el 2026-09-03**, ver el UPDATE de esa fecha en `STATE.md` para
  las cifras. Lo que queda de ellos:
  - **153 EAN se rindieron ante un HTTP 429** de OpenFoodFacts durante la
    corrida. A propósito NO quedan cacheados como negativos, así que otra
    corrida los reintenta: es cobertura aplazada, no perdida.
  - ~~El plan "sin cocinar" no etiqueta las aproximaciones~~ — **HECHO**,
    y la entrada llevaba tiempo caducada sin que nadie lo comprobara
    (2026-09-08). `render-no-cook.js` llama a `renderNutritionTrustBadge()`
    y tiene tests. Hoy el 14,8% del pool elegible está en `needs_review`, y
    se marca en pantalla. Si una entrada de esta lista lleva semanas,
    compruébala antes de trabajarla: cerrar algo y no tacharlo aquí cuesta
    la siguiente sesión entera.
  - **La coincidencia por subcadena de `classifyByNameFallback()` sigue
    rota** (ver §7.6). Para Mercadona ya no se alcanza —`Congelados` está
    en `NO_COOK_EXCLUDED_CATEGORIES`—, pero es la única ruta de Alcampo.
    Hoy no muerde porque el pool de Alcampo está vacío; el día que tenga
    nutrición, sí.

  **Y una advertencia sobre cómo estaba escrita la tarea de `Congelados`
  aquí:** decía "excluido de la exportación", lo que sugiere que bastaba
  quitar el filtro. No bastaba, y hacerlo solo habría sido peor. Medido:
  quitarlo y ya no cambiaba nada (200 de 200 planes idénticos), y tras
  enriquecer habría metido pizza, helado y croquetas en las comidas.
  `real-products.js` tiene **dos consumidores** y solo uno debía verlos.
  Si una tarea de esta lista parece un interruptor, mídela antes.
- **El preset "Muy ajustado" (8 €) no da un solo día "perfect"** en ninguno
  de los tres perfiles. Confirmado el 2026-09-09 con un barrido de 8 a 14 €
  (120 semillas por celda), que además contesta dónde deja de fallar:

  ```
     EUR   corte   recomp   volumen
       8      0%       0%        0%
       9      8%       1%        0%
      10      5%       0%        0%
      11     33%       0%        0%
      12     33%      40%       25%   <- el salto, y ya es el tramo siguiente
  ```

  **No se arregla subiendo la cifra**: de 8 a 11 € es zona muerta. Y son
  TRES fallos distintos, no uno:

  ```
    corte    102% de calorias pero 69% de proteina, pagando 6,86 de 8.
             El dinero llega: lo que aprieta es la regla del 25% por item.
    recomp    96% calorias, 103% proteina -> falla por 45 centimos.
    volumen   86% calorias, 90% proteina. Aqui si falta dinero.
  ```

  **Lo hecho el 2026-09-09**: el tramo se queda — quien tiene 8 € los
  tiene — y lo que cambia es lo que promete. Su texto decía "lo más barato
  que da un día completo", que es falso, y además **no se pintaba en ningún
  sitio**: `label` y `hint` de `BUDGET_PRESETS` eran datos muertos (ver
  `STATE.md`). Ahora se pintan y el texto apunta a la despensa, que es la
  palanca real (5,52 € de ingredientes; el resto es abrir paquetes).

  **Lo que sigue abierto** es una decisión de producto, no de código: para
  un objetivo de volumen 8 € no dan de comer 3.871 kcal, y ahí la comida
  cuesta lo que cuesta. Opciones sin explorar: no ofrecer el tramo cuando
  las calorías objetivo no caben, o pedir la despensa antes de ofrecerlo.
- **El lote de la forma de dos verduras sigue RECHAZADO** (2026-09-09). Un
  perfil gana 3,2 puntos de días perfectos y dos pierden 4,8 y 6,3, con el
  suelo inevitable del control de §7.8 en −3,5. Ya se arreglaron las dos
  cosas que lo empeoraban de más — el juez que solo miraba violaciones y el
  reparto por categoría que impedía generar cenas — y aun así no compensa.
  **La palanca que queda por probar es el MOTOR, no el catálogo.** Detalle
  completo en `scripts/generar-platos/LEEME.md`.
- **El tema por tienda es solo una preparación** (2026-09-09). El enganche
  (`data-store`), el contrato de tokens y sus tests existen, pero **no hay
  ninguna tienda con tema propio ni selector de tienda** (se retiró el
  2026-08-25), y `PRICE_CATALOGS` sigue teniendo solo `mercadona`. Tres de
  las comprobaciones de `tests/store-theme.test.js` no tienen sujeto hasta
  que exista la primera tienda; saltan solas ese día.
- **Un fallo de test que no se ha podido reproducir** (2026-09-08). Al
  comprobar un commit en un worktree recién creado: 549 pasaron, 1 falló, y
  no se capturó el nombre. Después, 44 corridas limpias (36 en HEAD, 8 en
  el mismo commit) y 25 corridas dirigidas solo a la suite de
  caracterización, sin un solo fallo. Uno de cada ~45. La sospecha
  razonable es que algún invariante corre con `Math.random` REAL (10
  iteraciones x 5 perfiles), pero no está demostrado. **Si vuelve a pasar,
  guarda la salida entera**: lo único que falta es el nombre del test.
- **El margen de presupuesto por días de plan hay que re-medirlo cuando
  crezca el catálogo** (2026-09-08). `PLAN_DAYS_BUDGET_3` (x1,03) y
  `PLAN_DAYS_BUDGET_7` (x1,15) son el mayor margen con el que NINGÚN plan
  se pasa del presupuesto elegido, buscado a mano sobre los platos y
  envases de HOY. No son constantes universales; con otro catálogo el punto
  donde empiezan a colarse planes por encima se mueve.
- **El día de 8 € no cuadra el 61% de las veces** con los envases reales.
  El motor lo declara honestamente (`status: minimal`, violación
  `budget`), pero si se quiere arreglar de verdad hay que enseñarle a
  preferir **menos paquetes distintos**, no ingredientes más baratos: en
  un día de 20 € la comida usada son 6,82 € dentro de 20,54 € de compra.

  **Medido el 2026-09-09, y la hipótesis de "menos paquetes" NO se sostiene
  como causa de las violaciones** de recomp/volumen (200 semillas):

  ```
                            recomp 16 €      volumen 20 €
    días que violan budget    10 (5,0%)        8 (4,0%)
    se pasan de media          0,51 €           1,02 €      (máx 0,80 / 2,02)

                            violan   resto   violan   resto
    comprado                 16,51   14,40    21,02   17,97
    comido                    6,86    6,25    11,67    9,25
    NO se come               58,5%   56,4%    44,7%   48,4%
    ingredientes distintos    11,5    10,3     11,8    11,0
  ```

  El día que se pasa **no desperdicia más** — en volumen desperdicia MENOS
  (44,7% contra 48,4%) — y solo lleva **un ingrediente distinto más**.
  Simplemente compra más. Y el 56-58% que no se come es una constante de
  TODOS los días, así que no puede explicar por qué unos violan y otros no.
  Para eso la respuesta ya está en el motor y es planificar varios días
  (7 días salen un 22-34% más baratos POR DÍA), no puntuar distinto.

  **Conclusión de prioridad: esto no merece trabajo de motor hoy.** El
  margen real son 5 días de cada 100 pasándose un 3-5%. Compárese con lo
  que sí duele: en corte fallaban 15,5% de los días y por un 21% o más.
  Nota aparte, por si tienta: volumen entrega 214 g de proteína sobre un
  objetivo de 171 (+25%), y eso sí es dinero tirado — pero el arreglo
  evidente (penalizar el exceso) ya se midió y empeoró justo a volumen,
  ver §7.9 hipótesis 1.
- **El invitado ve la bienvenida en cada visita**, por decisión suya. Si
  algún día cansa, lo suave sería repetir la oferta de cuenta a diario
  pero el cuestionario no.
- **El catálogo va por 434 platos y el objetivo son 1000.** El ritual de
  cada lote, en este orden:
  ```
  node scripts/generar-platos/probar_lote.js <semillas> 60 0.25 6 40 0.75 principales
  node scripts/generar-platos/emitir_platos.js 60 <la que convenza> 0.25 6 40 0.75 principales
  python scripts/generar-platos/aplicar_lote.py "lote N" <fecha>
  node scripts/generar-platos/medir_perfiles.js HEAD 200
  node tests/run-tests.js     # y recapturar los dos golden-master
  ```
  `probar_lote.js` mide ANTES de escribir nada; `medir_perfiles.js HEAD`
  confirma que lo aplicado da lo mismo que lo probado. Si no coinciden, para.
- ~~**El perfil de CORTE falla el 53% de los días**, el mayor agujero de
  producto que queda~~ — **el 53% se arregló el 2026-09-08** pasando el día
  a 3 tomas, y esta entrada se quedó un día entera sin enterarse. Medido en
  HEAD el 2026-09-09, 200 semillas por perfil:

  ```
                violan   perfect   proteína        compra
    corte        15,5%    36,5%    131,8 / 136,4   10,50 €
    recomp        5,5%    68,0%    157,6 / 156,0   14,51 €
    volumen       5,0%    64,0%    214,4 / 171,0   18,10 €
  ```

  Sigue siendo el peor de los tres, pero por un tercio de lo que decía esta
  lista, y **el mayor agujero ya no es este**. Leer §7.9 antes de tocar
  nada: los dos arreglos evidentes ya fallaron medidos.

  **Y NO es el desayuno**, aunque el catálogo lo sugiera. Diseccionados los
  24 días que fallan contra los 176 que no (2026-09-09, 200 semillas), el
  hueco de 28,2 g se reparte así: desayuno **−0,8 g** (nada), **comida
  −23,1 g** (el 82%), cena −4,2 g. El desayuno es igual de flojo los dos
  días — un impuesto constante, no lo que decide. Y como al día que falla le
  faltan **20,8 g como mínimo**, arreglar el catálogo de desayunos (unos
  +10 g) **no rescataría ni uno solo**. La palanca es por qué la lotería
  elige a veces una comida de 4 g/100kcal cuando 94 de las 162 del catálogo
  pasan de 8,92. Detalle y tablas al final de §7.9.

  **Hubo un candidato medido, y está RECHAZADO por el dueño** (2026-09-09)
  por lo que cuesta en variedad — el detalle del rechazo, con el barrido
  que lo cierra, va al final de esta entrada. Se conserva escrito porque la
  idea es tentadora y el motivo del rechazo no es obvio.

  Es un FILTRO del pool, no un peso: cuando el objetivo
  de la toma pide ≥8 g/100kcal, se descartan los platos por debajo del 75%
  de esa densidad, **y solo si tras filtrar quedan ≥40 candidatos** — sin
  esa guarda el pool se queda en 3 platos a 8 € y rompe el perfil de corte
  masculino. Dos bloques de 200 semillas DISJUNTOS, "hoy → con filtro":

  ```
                    violan            perfect           platos distintos
    corte 12     15,5 → 2,0 / 14,0 → 0,0    36,5 → 62,0 / 36,5 → 59,5    114 → 79
    corte 16      1,5 → 1,0 /  2,5 → 1,0    67,0 → 80,5 / 62,5 → 80,0    178 → 146
    corte-M 12   69,5 →56,5 / 70,0 →52,5     3,0 → 13,0 /  7,5 → 15,0    104 → 67
    corte-M 16   13,0 → 8,5 / 14,5 →13,0    37,5 → 38,5 / 41,5 → 41,0    186 → 148
    corte  8    100   →100  /100   →100      0   →  0   /  0   →  0       15 →  9
    recomp / volumen: IDÉNTICO byte a byte (su objetivo pide 5,53 y 4,42)
  ```

  **El coste es real y hay que decidirlo, no esconderlo:** la variedad cae
  entre un 20% y un 35% en todos los perfiles densos, y en el tramo de 8 €
  —que ya falla el 100% de los días haga lo que haga— baja de 15 platos a 9.

  Dos avisos sobre lo anterior. Primero, **la guarda de 40 no es una
  calibración**, es el primer valor razonable de un barrido de 5 perfiles:
  con guarda 25 el filtro se aplica casi siempre y EMPEORA corte-M 12
  (69,5% → 75,3%), o sea que el número importa tanto como la idea. Segundo,
  **solo dos de esos perfiles son reales** (los del banco); `corte-M` está
  inventado para tener un segundo perfil denso al que el filtro pudiera
  romper. Antes de aplicarlo conviene medir contra perfiles de verdad.

  **POR QUÉ SE RECHAZA, y por qué no hay que volver a barrerlo.** El dueño
  puso el límite en perder como mucho **1/6 (17%) de variedad**; el
  candidato costaba entre el 20% y el 35%. Se barrieron las dos palancas
  —bajar el suelo y subir la guarda— buscando algo que entrara en el
  límite (150 semillas):

  ```
    corte 12      (hoy: perfect 34,7%)        corte-M 12   (hoy: perfect 2,7%)
      0,75/100   perfect 34,7   var  -6,6%      0,75/100   perfect  2,7   var -13,0%
      0,55/40    perfect 44,0   var -26,4%      0,55/40    perfect 13,3   var -25,0%
      0,65/70    perfect 56,0   var -27,4%      0,65/70    perfect 10,0   var -29,0%
      0,65/40    perfect 61,3   var -47,2%      0,75/70    perfect 12,0   var -35,0%
  ```

  **Ninguna combinación entra en el 17% en todos los perfiles, y las que
  entran donde entran dan exactamente CERO de ganancia.** No es que falte
  afinar el número: la ganancia y la pérdida de variedad **son la misma
  acción**. El motor acierta más porque la lotería cae más veces en los seis
  platos `X con claras`; concentrarse ES el beneficio y ES el coste, y no se
  pueden separar tocando estos dos parámetros. En el tramo de 8 € toda
  configuración pierde entre el 33% y el 73%, porque ahí el pool ya es de 15
  platos.

  **La palanca que queda, entonces, no es el motor: es el catálogo.** Hacen
  falta más comidas y cenas que pasen el suelo de densidad, para que
  concentrarse deje de costar variedad. Es exactamente el trabajo de 434 →
  1000 que ya está en marcha — con la advertencia de §7.8 bis de medir cada
  lote por categoría, y la de §7.9 de que aquí el suelo bueno son kcal Y
  gramos, no un ratio.
- **Los fallos de recomp y volumen ya casi no son de proteína, son de
  `budget`** (medido 2026-09-09). De sus violaciones, 10 de 11 en recomp y 8
  de 11 en volumen son presupuesto. Es otra palanca distinta de la de corte,
  y hay una hipótesis concreta sin probar más abajo en esta misma lista: que
  el motor prefiera **menos paquetes distintos**, no ingredientes más
  baratos. Ojo además con volumen, que entrega 214,4 g de proteína sobre un
  objetivo de 171 — un 25% de más que se está pagando.
- **DESAYUNO y SNACK están CONGELADOS** hasta entender lo de §7.8 bis. Son
  pools pequeños (78 y 70) donde el motor se apoya en pocos ganadores, y
  meter platos ligeros y baratos ahí costó 14 puntos al perfil de corte.
  Crecer por ahí exige antes saber qué hace bueno a un snack para un día
  apretado, no solo que sea denso en proteína.
- **Con las formas actuales el generador NO llega a 1000.** Quedan unos 147
  principales únicos y **4** snacks; ya usa 78 de los 83 roles de
  ingrediente que existen. El siguiente paso barato son FORMAS nuevas sobre
  los mismos roles (un principal con dos verduras multiplica el espacio de
  2.268 a ~12.000); las roles nuevas son caras porque cada una pide
  nutrición, precio y envase verificados a mano.
- **Los 15 principales vegetarianos del lote 1 usan todos clara de huevo.**
  Es lo único vegetal que pasa el suelo de densidad proteica: el yema, el
  queso y el edamame no llegan. Varían la legumbre y la verdura, pero el
  componente proteico se repite. Si molesta, la salida no es bajar el suelo
  (ver §7.8) sino buscar combinaciones vegetales que de verdad lleguen.
- **El perfil de VOLUMEN perdió 7 puntos de días "perfect"** con el lote 1
  (68% → 61%), todo por presupuesto. Platos más densos en proteína cuestan
  más por kcal y un día de 3871 kcal con 20 € va justo. Vigilarlo en los
  próximos lotes: si sigue bajando, hay que meter platos densos en CALORÍAS
  y baratos, no solo densos en proteína.
- **El stock de "sin cocinar" no lo pinta NADIE** (medido 2026-09-04). Se
  escribe (`setNoCookProductStock`, `markNoCookSlotConsumed`) y no hay
  ninguna vista que lo enseñe: ni cantidades ni caducidad. Es la razón de
  que sus entradas, que van por id de producto y podrían leer las fichas
  de Mercadona directamente, no las aprovechen.
- **El cableado `dayIndex` -> `planISO` no tiene test propio** (2026-09-04).
  Que `projectPantryState()` descarte contra una fecha FUTURA sí está
  probado; lo que no, es que `generateDietPlanTiered()` derive esa fecha
  del `dayIndex`. Meter `expiry.js` en `freshFullEngineSandbox()` para
  probarlo activaría el término de urgencia en los demás tests de ese
  fichero y podría mover sus golden-master, así que se dejó medido a mano
  (día 0 `urgente` 35,3% de los platos · día 5 `caducado` 6,3%) y sin test.
- **`product-storage.js`: la tarea estaba mal planteada** (revisada
  2026-09-08). Decía "104 KB y solo rinde para 12 roles", y eso es falso:
  se alcanza por DOS caminos, no uno. Además del puente por rol (12
  emparejamientos), el stock de "sin cocinar" va por id de producto, y por
  ahí son **1.389 de sus 2.386 filas** las alcanzables. Muertas de verdad
  hay 262 huérfanas cuyo id ya no está en el catálogo: **11 KB**. El
  fichero además es GENERADO y dice que no se edite a mano.

  Y el peso tampoco es el problema que parecía: Cloudflare sirve con
  `Content-Encoding: br`, los 2.844 KB de scripts viajan como **525 KB**
  con gzip, y el Service Worker los cachea por sello sin revalidar. Medido
  antes de tocar nada, que es lo que evitó recortar un fichero por 11 KB.

  Lo que SÍ queda: ampliar `real-ingredient-matches.js` — a mano y por EAN,
  nunca por parecido de texto.

---

## 9. Cuentas: Firebase (desde 2026-09-25) — qué está configurado y dónde

Hasta el 2026-09-25 las cuentas iban con Supabase. Se cambió porque el
proyecto gratuito de Supabase **se pausa tras 7 días sin uso**: el
2026-09-25 el dominio del proyecto ni siquiera resolvía en DNS, y con eso
el inicio de sesión, el registro y la sincronización llevaban caídos en
producción sin que nadie lo supiera. Firebase en el plan gratuito (Spark)
no se duerme.

**Proyecto:** `weekplate-146b0`, cuenta de Google del dueño. Plan Spark,
sin tarjeta. Google Analytics y Gemini **desactivados** al crearlo.

**Lo que está hecho en la consola** (todo con clics, 2026-09-25):

1. **Authentication → Método de acceso:** correo/contraseña y Google,
   activados. El "vínculo por correo sin contraseña", NO.
2. **Authentication → Configuración:**
   - dominios autorizados: `localhost`, los dos de Firebase, y
     `offline-nutrition-helper.pages.dev` (añadido a mano);
   - vinculación de cuentas: "vincular cuentas que usen el mismo correo"
     (entrar con Google y con contraseña con el mismo email es UNA cuenta);
   - acciones del usuario: registro sí, **autoeliminación sí** (sin eso
     "Borrar mi cuenta" no funciona), **protección contra la enumeración de
     correos sí** -- por eso Firebase contesta `auth/invalid-credential`
     tanto si el email no existe como si la contraseña está mal.
3. **Firestore:** base `(default)`, edición Standard, **`europe-southwest1`
   (Madrid) -- no se puede cambiar nunca**, modo producción (todo cerrado
   hasta publicar reglas).

4. **Firestore → Reglas:** publicado `firebase/firestore.rules`, copia
   byte a byte (sha256 `3e01e5c3…` en el fichero y en el editor de la
   consola). Comprobado en vivo: leer, escribir u otra colección SIN sesión
   → **403 PERMISSION_DENIED**.
5. **Configuración del proyecto → Tus apps → Web:** app `Weekplate web`,
   sin Firebase Hosting. `appId` ya está en `js/data/firebase-config.js`.

**La `apiKey`** la pegó el dueño (2026-09-25): la extensión de Chrome con
la que se configuró todo la tapa (`[BLOCKED: Sensitive key]`) y no se le
dio la vuelta. Si hay que volver a sacarla: Configuración del proyecto →
Tus apps → Weekplate web → Config. Se comprueba sin iniciar sesión con
`GET https://identitytoolkit.googleapis.com/v1/projects?key=<apiKey>`:
tiene que devolver `authorizedDomains` con el dominio de producción.

**Lo que se intentó y NO funciona:** "URL de acción personalizada" en
Authentication → Plantillas (para que el enlace del correo de "olvidé mi
contraseña" abriera esta app en vez de la página de Firebase). La consola
devolvió **400 dos veces**, con y sin barra final, sin decir por qué. No
hace falta: la página de Firebase
(`weekplate-146b0.firebaseapp.com/__/auth/action`) pide la contraseña
nueva ella sola, en el idioma de la app (`auth.languageCode`), y su botón
"Continuar" vuelve aquí. Por eso desapareció el modo `reset` del
formulario de render-auth.js.

### 9.1 Cómo está montado, en tres frases

- **Entrar:** solo el SDK de *autenticación* (compat, 173 KB con el núcleo,
  desde jsdelivr). El de Firestore pesa 548 KB y NO se carga.
- **Datos:** un documento `user_data/{uid}` por la **API REST** de
  Firestore, con `fetch` y el token del usuario. Cuatro campos, todos
  **texto JSON** (Firestore no admite arrays anidados; así lo que se lee es
  exactamente lo que se escribió). 30 planes = 67 KB; el límite es 1 MiB.
- **El resto de la app no sabe que cambió nada:** `auth.js` traduce Firebase
  a la forma de Supabase (`user.id`, eventos `INITIAL_SESSION` /
  `SIGNED_IN` / `SIGNED_OUT`). Si alguna vez se cambia de proveedor otra
  vez, ese es el contrato.

### 9.2 Tres cosas que muerden

- **CSP (`_headers`):** si Firebase empieza a pedir otro dominio, la
  consola del navegador lo dice como "Refused to connect/load". La lista
  actual: `apis.google.com` (script), `identitytoolkit`/`securetoken`/
  `firestore.googleapis.com` (conexión), `weekplate-146b0.firebaseapp.com`
  (iframe). **Solo se aplica en Cloudflare**, no en local.
- **`sw.js`** no cachea nada de esos hosts (`esCuentaOSincronizacion`).
  Ojo: `fonts.googleapis.com` SÍ se cachea; no generalizar a
  "todo googleapis.com".
- **Borrar la cuenta son dos pasos** (datos, luego cuenta) porque en Spark
  no hay código de servidor. El orden está explicado en
  `deleteOwnAccount()`; al revés dejaría datos huérfanos para siempre.

**Supabase:** el proyecto viejo (`tizrdycctkiwdcmlyqku`) sigue existiendo
en la cuenta del dueño. No tiene usuarios. Borrarlo es cosa suya.

---

## 10. Los dos idiomas y el recorrido

### 10.1 Traducción — dónde está y qué la rompe

**El documento de verdad es `scripts/i18n/LEEME.md`.** Aquí solo lo que hay
que saber antes de abrir nada.

Cinco tablas: `js/i18n/es.js` (interfaz, 356 claves), `en.js` (381, incluye
las del recorrido), `food-en.js` (293 alimentos), `packages-en.js` (42
etiquetas de envase, con singular Y plural porque el inglés no hace el plural
añadiendo una "s": `barra` es `loaf`/`loaves`) y `steps-en.js` (1.682 pasos
de receta, **generado**). Las funciones están en `js/core/i18n.js`.

Tres cosas que no son evidentes y cuestan medio día cada una:

1. **Una clave que no casa letra por letra no traduce y NO da error.** Sale
   en español dentro de la interfaz en inglés, sin aviso, con los tests en
   verde. Por eso `construir-steps-en.js` se niega a escribir el fichero si
   encuentra una sola clave fantasma.
2. **Se traduce al PINTAR, no al guardar.** `item.name` y `meal.dishName`
   son a la vez texto y *clave de búsqueda*: traducirlos al generar el plan
   rompe despensa, compra y precio.
3. **Sin traducción se devuelve el original en español**, no un hueco. El
   generador de platos escribe pasos nuevos constantemente; un plato recién
   generado saldrá en español y se podrá cocinar igual.

Estado al 2026-09-13: **recetas al 100%** (1.682 de 1.682 distintas, 2.101
de 2.101 apariciones). Quedan **72 literales en español incrustados en el
código** que llegan a pantalla; `node scripts/i18n/inventario.js` los lista
por fichero. Los mayores: `plan-generator.js` 17, `render-no-cook.js` 14,
`render-pantry.js` 11, `auth.js` 11.

**Cada vez que crezca `dish-instructions.js` hay que volver a pasar por el
ciclo de tandas.** Es una línea: `node scripts/i18n/inventario.js`.

### 10.2 El recorrido — escenas animadas en un `<dialog>` (rehecho el 2026-10-08)

**El modelo de «bandas», el hueco sobre el botón y las anclas `data-tour` YA NO EXISTEN.**
Si encuentras mencionados en `STATE.md` o en la memoria `_tourInset`, `_tourCentrar`,
`_tourNotaAlLado`, `tourFxMover`, `startTourIfWanted`, `offerTourWhenReady` o `data-tour`,
es historia: se borraron.

**Por qué se rehízo.** El recorrido viejo oscurecía la página real, abría un hueco sobre
cada botón, la desplazaba hasta él y en el móvil cambiaba de pestaña. Daba tirones **por
construcción** (cada paso movía la página; el botón «Generar plan» es `position: sticky`
y no se deja llevar) y necesitaba un plan ya pintado: sin él, «Ver la explicación otra
vez» echaba a la bienvenida. Rehacerlo con otro enfoque fue más barato que seguir
parcheando la geometría. El dueño: «кинь все силы… не обязательно делать таким как был».

**Cómo es ahora.**

- `js/data/tour-steps.js` — datos puros: `TOUR_STEPS` (11 escenas desde el 2026-10-28:
  `plan`, `dias`, `cambiar`, `compra`, `mercadona`, `hoy`, `generar`, `casa`, `atajos`,
  `entrenos`, `menu`; el `id` es UNA palabra y da la clave de traducción y la de
  `TOUR_SCENES`) y `TOUR_MOCK` (36 palabras españolas que salen DENTRO de las maquetas).
  El tope de los tests es 12 escenas.
- `js/ui/tour-scenes.js` — una función por escena en `TOUR_SCENES`. Cada una recibe un
  contexto `c` (`_tgCrearContexto`: constructores `c.e`, `c.ico`, `c.t`, `c.ui`, y el dedo
  `c.ir`, `c.pulsar`, `c.irse`, `c.reordenar`) y devuelve `{ el, play(tl), fin() }`:
  la maqueta, lo que se añade a la línea de tiempo GSAP, y el estado FINAL de golpe (lo
  que se ve sin GSAP o con «menos movimiento»). `tourEscenaMontar(id, el, animar,
  escenas?)` devuelve `{ parar() }`; `escenas` es de dónde salen (por defecto
  `TOUR_SCENES`; el tutorial de entrenamientos pasa `ENTRENO_TUT_ESCENAS`). La escena
  se reconstruye en cada pasada del bucle (con fundido) y, si la maqueta no cabe en la
  altura que hay, se le pone `.tg-compacto`; si ni así cabe, `_tgEncajar` la encoge
  entera (no por debajo de 0,72). `_tgVoltPlano` pone `.tg-volt-plano` cuando `--volt`
  y `--primary` casi coinciden (Grafito, Noche): las cifras en volt pasan a `--on-ink`.
  El contexto trae también `c.barraEntreno(activa)` y `c.semanaEntreno(hoy)`.
  Las maquetas usan **las variables CSS de la aplicación** y la palabra REAL de la
  interfaz (`ui.*`) cuando existe, así que se ven bien en los diez aspectos y el botón
  de la maqueta dice lo mismo que el de verdad.
- `js/ui/tour-fx.js` — solo ayudantes opcionales: `tourFxActivo()` (¿hay GSAP y
  movimiento permitido?), `tourFxPalabras`, `tourFxFondo`, `tourFxConfeti`, `tourFxColor`.
  Sin GSAP (la CDN no llegó) o con `prefers-reduced-motion`, no hacen nada y cada escena
  se queda quieta en su estado final.
- `js/ui/tour.js` — la hoja: `<dialog id="tour">` con `showModal()` (capa superior: nada
  lo tapa, ni el diálogo de «plan activo»), `html.tour-abierto` bloquea el desplazamiento
  de la página de debajo, navegación por botones, barritas de progreso tocables,
  deslizamiento, flechas y Escape. La pregunta es otro diálogo, `<dialog id="tourAsk">`.
  Funciones: `startTour({alCerrar})`, `stopTour()`, `offerTour(alResponder)`,
  `maybeStartTour()`, `refreshTourTexts()`, `_tourVistoVigente()`.
- CSS: sección 15 de `assets/css/style.css` (`.tour`, `.tour__card`, `.tg-*`). **Usa los
  tokens de la aplicación** (nada de colores sueltos); el acento de cada escena es la
  variable de un macro (`--kcal`, `--protein`, `--carbs`, `--fat`) mediante
  `--tg-acento` / `--tg-wash`.

**El flujo y quién llama a quién** (`js/app.js`):

1. Al soltar la última pregunta del cuestionario, `onFinish` llama a
   `offerTour(generarElPlan)`: la pregunta sale a los ~5 ms, **antes** de que exista el
   plan. Contestes lo que contestes, `generarElPlan` se ejecuta después.
2. «No» o Escape: se guarda `tourDoneAt` y se genera el plan al momento.
3. «Sí»: `startTour({alCerrar})`. Al cerrarse el recorrido (acabado o saltado) se genera el
   plan. Si había un plan de hoy ya empezado, el diálogo «plan activo» sale DESPUÉS del
   recorrido, nunca debajo.
4. `completeTour()` solo se llama si el recorrido llegó a mostrarse.
5. «Ver la explicación otra vez» (pie y menú ☰) → `repetirExplicacion()` →
   `startTour()` **siempre**, haya plan o no. (El bug del 2026-10-07 era que sin plan
   repetía el alta y te echaba a la bienvenida.)
6. `maybeStartTour()` se llama al final de cada generación y pregunta (no arranca) solo a
   quien nunca vio el recorrido o lo vio ANTES de `TOUR_ESTRENO = 2026-10-06`. Una fecha
   ilegible cuenta como «visto»: ante la duda no se molesta.

**Cómo añadir o cambiar una escena** (en este orden, o los tests te lo dirán):
1. `TOUR_STEPS` (titular y texto, 50 a 200 caracteres el cuerpo, el titular de 8 a 45) y, si
   la maqueta dice palabras nuevas, `TOUR_MOCK`.
2. La función en `TOUR_SCENES` (`tour-scenes.js`), con su `fin()`.
3. En, ru y uk (el español está en `tour-steps.js`): `tour.<id>_titulo`,
   `tour.<id>_cuerpo`, `tour.m_<clave>` en `js/i18n/en.js`, `ru.js` y `uk.js`. Las
   claves se derivan de los datos y las vigila `tests/i18n.test.js`. Si la maqueta usa
   una palabra de la interfaz (`c.ui("ui.…")`, `ent.…`, `unit.…`), un test de
   `tests/onboarding.test.js` comprueba que existe en los cuatro idiomas.
4. Mide con `scripts/qa/tour.mjs` (sección 12), en 320×568, 360×640 y 390×844, en `ru` (el
   idioma de textos largos), y en `revista` y `pegatinas` (letra muy ancha).
5. Sube el sello `?v=` (sección 4).

**Trampas medidas (todas costaron horas):**

- **`filter: blur()` y `backdrop-filter` en el recorrido**: >500 ms por fotograma en el
  Chrome sin interfaz, y GSAP (`lagSmoothing`) responde poniendo TODO en cámara lenta.
  Sin ellos ~8 ms y 0 fotogramas lentos. Hay un test que lo prohíbe.
- **Una `transition` CSS sobre `opacity` en algo que GSAP anima con `from()`** le roba el
  valor final: las filas se quedaban invisibles. Quita la transición.
- **La opacidad de una clase CSS se pierde tras una animación GSAP de opacidad**:
  atenúa los hijos en vez del contenedor.
- **No uses `translateX(-50%)` para centrar** lo que GSAP anime con `x`: lo pisa. Centra
  con márgenes.
- **Los textos largos del ruso**: un botón con la palabra REAL de la interfaz («Сделать
  планом на сегодня») no cabía en su botón en la escena 6. Ahora el botón grande
  (`.tg-grande`) puede pasar a dos líneas y todo `.tg-btn` lleva `max-width: 100%`. Si
  añades un botón de maqueta, pruébalo en ru y en `revista`.
- **Pantallas bajas** (iPhone SE con ruso): `@media (max-height: 600px)` compacta
  cabecera, texto y botones; por debajo de 340 px de ancho los botones de «Sin cocinar» y
  despensa pierden icono y espaciado.
- **Para probar sin pasar por la bienvenida** hay que quitar sus clases y el atributo `inert` que
  deja en la página (`QUITAR_BIENVENIDA`, sección 12), y usar desplazamiento instantáneo.

**Los textos** viven en español en `tour-steps.js` y en `en.js`/`ru.js` con claves
`tour.<id>_titulo`, `_cuerpo` y `tour.m_<clave>`; la pregunta, en `ui.tour_pregunta_{titulo,
cuerpo,si,no}`. Una clave que falta cae al español **sin avisar** (10.1).

---

## 11. Preferencias por cuenta (`settings._prefs`) — añadido el 2026-10-08

La sección 9 explica cómo está montado Firebase; esto es lo que se añadió encima.

**El problema que resolvió.** El aspecto elegido (`nutritionPlanner.look.v1`) y las marcas
«ya hizo el cuestionario» y «ya vio el recorrido» (`intakeDoneAt`, `tourDoneAt` dentro de
`nutritionPlanner.onboarding.v1`) vivían solo en `localStorage`: no se subían ni se
vaciaban al cambiar de cuenta. Una cuenta recién creada heredaba el aspecto de la anterior
y, con el recorrido «ya visto» por otra sesión, nunca se le ofrecía el recorrido ni el
cuestionario. El dueño: «одно и то же оформление на всех аккаунтах даже если я его
только что создал».

**Dónde viajan.** DENTRO del campo `settings` del documento `user_data/{uid}` (que ya es
texto JSON), bajo la clave reservada `_prefs`: `{ look, intakeDoneAt?, tourDoneAt? }`.
**No en un campo nuevo**: `firebase/firestore.rules` solo admite
`pantry_state`, `pantry_history`, `settings` y `migrated_at`, y publicar reglas se hace
en la consola de Firebase, no desde este código. **No cambies las reglas ni añadas campos
sin que el dueño publique reglas nuevas**, o las escrituras se rechazarán en silencio.

**El módulo** es `js/core/account-prefs.js` (187 líneas, todo con `typeof` por si falta
un colaborador): `collectAccountPrefs()`, `settingsWithAccountPrefs(settings)`,
`hasAccountPrefs(settings)`, `applyAccountPrefs(prefs)`, `resetAccountPrefs()`,
`pushAccountPrefsToCloud()`. `_prefs` **no** se guarda en el `settings` local
(`sanitizeSettings` lo descarta, y está bien): se calcula al subir a partir de las claves
de siempre (que son lo que lee el `<head>` antes de pintar) y se aplica al bajar.

**Las reglas (no las cambies sin entenderlas):**

- Al iniciar sesión, si la cuenta **tiene** `_prefs`, mandan: se aplican al dispositivo
  (aspecto y marcas; lo que falta cuenta como «sin hacer»). Si no tiene (cuenta nueva o
  anterior a esto), se queda lo del dispositivo —que es de quien acaba de crearla, porque
  cerrar sesión lo vacía— y se sube.
- Al cerrar sesión y en `clear_cross_user` (`_wipeLocal` en `migration.js`) el
  dispositivo vuelve de fábrica: aspecto por defecto (`hojas`), cuestionario y recorrido
  sin hacer.
- **Se quedan en el dispositivo**: el idioma, las condiciones aceptadas
  (`termsAcceptedAt`) y `accountChoice`.
- `hasSnapshotContent` ignora `_prefs`: una cuenta con solo eso sigue contando como vacía.
- **No se sube nada hasta que la reconciliación de esa cuenta ha terminado**
  (`getCloudSyncedUserId`): subir `settings` antes de saber qué hay en la nube podía pisar el
  perfil de la cuenta con un bloque casi vacío.

**Dónde se dispara la subida o la aplicación:** `completeIntake()` y `completeTour()`
(`onboarding.js`), `_menuElegirAspecto` (`render-menu.js`), `_applyNonConflict`,
`resolveConflictKeepCloud` y `resolveConflictMerge` (`migration.js`), y
`handleAuthDataReconciled` (`app.js`), que también vuelve a pintar el aspecto en el DOM
tras iniciar o cerrar sesión. `clearLook()` (nuevo en `look.js`) quita el aspecto guardado.

**Cómo se comprobó, y lo que NO:**

- 14 tests (`migration`, `cloud-sync`, `onboarding`), con mutación.
- `scripts/qa/cuenta.mjs`, en el navegador con la nube **simulada**: cuenta A («noche», alta
  hecha) → cerrar sesión → hojas y alta vacía; cuenta B nueva → hojas, sin recorrido visto
  y sube `{look:"hojas"}`; cuenta C con `_prefs` kitty → kitty y marcas suyas, no sube nada.
- **NO con Firebase real.** Hace falta que el dueño haga esto en su móvil y te cuente:
  crear una cuenta nueva (¿sale el cuestionario y luego la pregunta del recorrido?), elegir
  un aspecto, cerrar sesión (¿vuelve a hojas?), entrar otra vez (¿vuelve su aspecto?), y
  entrar desde otro dispositivo (¿llega el aspecto?). Si algo falla, mira primero en la
  consola de Firebase si el documento `user_data/{uid}` tiene `settings` con `_prefs`
  dentro, y si las reglas rechazaron la escritura (pestaña de red: 403).

---

## 12. Herramientas de prueba y trampas del entorno — añadido el 2026-10-08

### 12.1 `scripts/qa/` — pruebas con Chrome sin interfaz

Antes vivían en una carpeta temporal que desaparece con la sesión; ahora están en el repo.
No necesitan dependencias: solo Node 22+ (WebSocket y `fetch` globales) y Chrome
(variable `CHROME` si no está en `C:/Program Files/Google/Chrome/Application/chrome.exe`).

**Primero, el servidor local** (la configuración «static-site» de `.claude/launch.json`
hace exactamente esto, en el puerto 8000):
```bash
python -m http.server 8000 --directory "C:/Users/andre/Desktop/Offline Nutrition Helper/nutrition-planner"
```
La dirección es `http://127.0.0.1:8000/`.
Este servidor **no manda las cabeceras de `_headers`**: no sirve para probar la CSP.

| Script | Para qué | Ejemplo |
|---|---|---|
| `cdp.mjs` | Arnés común (lanza Chrome, `js()`, `ir()`, `foto()`, `clic()` con ratón real, errores de JS). Es una librería, no se ejecuta. | `import { lanzar } from "./cdp.mjs"` |
| `tour.mjs` | Recorre las 9 escenas, mide fotogramas lentos y comprueba desbordes (hoja fuera de pantalla, botones, texto fuera de su botón, maqueta que no cabe). Sale con 1 si hay problemas. | `MEDIR=1 LOOK=revista node scripts/qa/tour.mjs http://127.0.0.1:8000/ capturas ru 320 568` |
| `alta.mjs` | Pasa el cuestionario entero como persona nueva y comprueba el orden cuestionario → pregunta → recorrido → plan. Variantes: `RESP=si\|no\|esc`, `ACTIVO=1` (con plan de hoy empezado), `CANCELAR=1`, `SALTAR=1`. | `RESP=si node scripts/qa/alta.mjs http://127.0.0.1:8000/ capturas es 390 844` |
| `cuenta.mjs` | Aspecto y marcas por cuenta con la nube simulada (sección 11). | `node scripts/qa/cuenta.mjs http://127.0.0.1:8000/ capturas` |
| `variedad.cjs` | Variedad entre los días de un plan, sobre el MOTOR (sin navegador). Acepta la raíz de cualquier copia del proyecto, así que sirve para comparar commits. | `SOLO=minimal,small node scripts/qa/variedad.cjs . 60` |
| `produccion.mjs` | Compara por md5 la carpeta que se subió con la URL de producción. | `node scripts/qa/produccion.mjs "$DIR" https://offline-nutrition-helper.pages.dev/` |

Las capturas (PNG) se guardan en la carpeta que se pasa; míralas con la herramienta de
lectura de imágenes, no te fíes solo de los números.

**Verificado el 2026-10-08** contra el servidor local en la versión `c4306ad`: `tour.mjs`
(es y ru, `MEDIR=1`) sin problemas y ~8 ms por fotograma; `alta.mjs` (pregunta a los 5 ms,
sin plan, «Sí» abre el recorrido); `cuenta.mjs` (los 4 casos OK); `produccion.mjs` (189 de
189 idénticos); `variedad.cjs` (0 planes con los días iguales).

### 12.2 Trampas del entorno (todas se pagaron)

1. **Este Chrome arranca con `prefers-reduced-motion: reduce`.** Sin forzar
   `Emulation.setEmulatedMedia` a `no-preference`, GSAP nunca corre y el recorrido sale
   quieto: parece que «no anima» y es la prueba. `lanzar()` ya lo fuerza.
2. **Un solo Chrome a la vez contra el servidor local.** Una vez, con `tour.mjs` y `alta.mjs`
   en paralelo, salió `ReferenceError: initInsightRefs is not defined` (un script no llegó a
   cargar); en tres corridas sueltas posteriores no se repitió. Está sin investigar más; si
   lo ves en una prueba en serie, **sí** es un fallo real de carga y hay que mirarlo.
3. **Saltarse la bienvenida en una prueba** deja la página `inert` y con clases
   (`esperando-bienvenida`, `is-onboarding`): usa `QUITAR_BIENVENIDA` de `cdp.mjs`.
4. **El emulador de ventana de las herramientas del navegador de la app falsea el
   desbordamiento.** Mide con `Emulation.setDeviceMetricsOverride` (lo hace `lanzar`) y
   comprueba `clientWidth === innerWidth` antes de creer un «desborda».
5. **Los hooks globales rotos crean ficheros de 0 bytes** por cada carácter de redirección
   que haya en lo que escribes (comandos y contenido de ficheros): regla 5 de la
   sección 0.3. Revisa y borra los nuevos al acabar cada tanda.
6. **`sed -i` se come los CR.** Para cambios masivos: un script de Node con `split`/`join`.
7. **Un script largo en un heredoc de Bash puede dar `unexpected EOF`.** Guárdalo en un
   fichero y ejecútalo. Y dentro de plantillas de JavaScript con comillas invertidas, un
   `\s` pierde la barra (se vuelve `s`): evita las barras invertidas ahí.
8. **`curl /index.html` da 308 y 0 bytes** (redirige a `/`): parece que el despliegue falló.
   Usa `curl -L` o `produccion.mjs`.
9. **El CDN tarda unos segundos** en servir un despliegue recién subido: reintenta antes de
   pensar que falló (`produccion.mjs` ya reintenta).
10. **Los objetos de un sandbox `vm` son de otro realm**: `deepStrictEqual` contra un
    literal falla; pasa por `JSON.parse(JSON.stringify(x))` (sección 5).
11. **Medir mal el identificador**: en `variedad.cjs` una vez medí
    `JSON.stringify(m).slice(0, 40)` y salieron cifras absurdas; el plato es `m.dishName`.
    Antes de fiarte de una cifra rara, sospecha de lo medido (sección 7.1).
12. **Un asistente no puede crear cuentas de Firebase reales ni meter contraseñas**: eso solo
    lo puede probar el dueño (sección 11).

---

## 13. Service worker, CSP y el sello de cabeceras — añadido el 2026-10-08

**Qué hace `sw.js`** (la cabecera del propio fichero lo cuenta bien): navegaciones
(`index.html`) **primero a red**, con la copia guardada si falla; recursos con sello
`?v=` **primero de caché** (una URL con sello es inmutable por construcción); la lista
de precarga la deduce leyendo `index.html` y el nombre de la caché sale del sello, así
que un sello nuevo borra la caché vieja. **No cachea nunca** cuentas y sincronización
(Firebase) ni peticiones que no sean GET. Reenvía los scripts de jsdelivr y cdnjs con
`fetch()`, y por eso los rige la directiva `connect-src` de la CSP, no solo `script-src`.

**La trampa (2026-10-07), medida con Chrome sin interfaz y un servidor que cambia la CSP:**
un service worker **conserva las cabeceras (la CSP) con que se instaló**, y si `sw.js` es
idéntico byte a byte **el navegador no lo reinstala**. Se había añadido jsdelivr y cdnjs a
`connect-src` en `_headers`, el servidor ya mandaba la CSP buena, y los móviles con el worker
viejo siguieron sin `firebase` ni `gsap` (3 de 3 cargas rotas) → «Las cuentas todavía no
están disponibles». Con UN byte distinto en `sw.js` se arreglaba desde la 2.ª carga. Lo
vio el dueño en un iPhone.

**El arreglo, y lo que te obliga a hacer:**

- `var SELLO_CABECERAS = "csp-<10 primeros caracteres del sha1 de la línea
  Content-Security-Policy de _headers>";` en `sw.js`. **Si cambias la CSP, cambia esto.**
  `tests/auth.test.js` lo comprueba y el mensaje de fallo te dice el valor que toca poner.
- En `index.html`, un `controllerchange` que **recarga UNA vez** (marca en `sessionStorage`,
  clave `nutritionPlanner.swRecarga`) si un worker nuevo toma el control y faltan
  `firebase` o `gsap`. Medido: visitante con worker viejo + despliegue nuevo → roto ~3 s →
  recarga sola → todo cargado. Sin la marca sería un bucle de recargas.
- Esta CSP se aplica en Cloudflare vía `_headers` (que Pages no sirve como fichero: se
  comprueba con `curl -sI`). Dominios permitidos de scripts: el propio, jsdelivr (Firebase), cdnjs (GSAP)
  y apis.google.com. **Añadir un CDN nuevo = tocar `_headers` (`script-src` y `connect-src`) y
  `SELLO_CABECERAS`.**

**Cómo reproducirlo si vuelve a pasar** (el experimento no se guardó en `scripts/qa/`
porque es de un solo uso, pero se monta en veinte minutos): un servidor de Node que
sirve el proyecto con la CSP como variable; Chrome sin interfaz instala el worker con la
CSP vieja; cambias la CSP; recargas tres veces y miras `typeof firebase` y `typeof gsap`
en cada carga. Con el `sw.js` viejo sirviéndose tiene que fallar y con el nuevo no.

---

## 14. Planes de varios días: variedad entre días — añadido el 2026-10-08

**La queja (2026-10-07):** «мне выдало точно такой же план на 3 дня, один в один… дизайн
убил логику?». **No**: los ficheros del motor no se habían tocado por el diseño ni por otro
chat. Medido sobre el motor con `scripts/qa/variedad.cjs` (hombre 28 años 78 kg ganando
músculo, 8 EUR/día, 60 a 80 planes de 3 días por celda): días idénticos **0 de 60 el
2026-09-01, 2 de 60 el 09-04, 15 de 60 el 09-08**. El salto es el commit `d781b41`
(«Let a day spend what a multi-day shop actually shares»): sube un 3 % el tope diario de un
plan de 3 días y el puñado de platos más baratos cabía siempre, así que cada día elegía los
mismos; los días solo se diferenciaban por el desempate aleatorio.

**El arreglo** (`js/engine/plan-generator.js` y `js/engine/dish-selector.js`):

- `generateDietPlanDays(profile, data, planDays, alTerminarDia)` genera **un día por
  llamada** y le pasa a cada uno `data.avoidDishNames` (los platos de los días anteriores).
  `alTerminarDia(dia, indice)` es el gancho con el que `js/app.js` pone el horario de cada
  día (línea ~559). La usa `app.js`; la antigua forma de llamar a `generateDietPlan` en
  bucle sigue funcionando.
- `pickDish()` prefiere, **ENTRE LOS QUE YA CABEN en el presupuesto de la toma**, los que no
  han salido (fase 1 y fase 2). Si todo lo asequible ya salió, se repite. Es decir: se filtra,
  no se puntúa, y nunca se rompe el presupuesto para ganar variedad (principio general: cuando una regla DEBE
  cumplirse, se filtra; puntuar solo ordena).

**Antes → después (8 EUR, hombre):** días idénticos 14 de 80 → 0 de 80; platos distintos 4,3
→ 8,7 de 9; día 1 → día 2 repetido 73 % → 1 %. **Coste: kcal 96 % → 88 % y proteína 100 % →
96 %**: antes la «variedad» a 8 EUR era repetir lo más barato por caloría; ese tramo de 8 EUR
ya declaraba no dar un día completo (`1b51a9a`). A 12, 16 y 20 EUR: variedad 11,4 → 14,6,
14 → 15 y 14,2 → 15 de 15, con kcal y coste iguales ±1 punto. 7 días a 16 EUR: 30,8 → 35 de
35, con días con avisos 1 % → 4 %.

**Tests:** 5 nuevos en `tests/plan-generator.characterization.test.js` (el de 8 EUR falla si se
quita el filtro) y retoques en `tests/no-cook-generator.test.js`.

**Si el dueño vuelve a quejarse de repetición:** primero mide con `variedad.cjs` (con el
presupuesto y los días que dice), compara con el motor de un commit anterior
(`git worktree add` o `git show commit:ruta` a una carpeta y pasa esa raíz), y solo
después toques el algoritmo. Y recuerda que el modo «sin cocinar» tiene su propio
generador (`no-cook-generator.js`).

---

## 15. Los diez aspectos («looks») y el generador de temas — añadido el 2026-10-08

La aplicación tiene **diez aspectos** que se eligen en el menú ☰. Es lo que el dueño llama
«дизайн / оформление». Su historia: el diseño anterior al nuevo está en la etiqueta git
`diseno-mercado-2026-09-28`; la rama `diseno-en-blanco` (la web sin CSS, para que otro chat
rehiciera el diseño) **no se fusiona ni se despliega**.

**Los ids, en el orden del menú** (`LOOKS` en `js/core/look.js`): `hojas` (**por defecto**,
листва), `entreno` (= `style.css` sin hoja de aspecto), `cristal`, `avena`, `relieve`,
`pegatinas`, `mercadillo`, `revista`, `noche` (el único oscuro), `kitty`.

**Cómo funciona:**

- `style.css` es el diseño base (el aspecto `entreno`). Cada otro aspecto es **una hoja
  encima**, `assets/css/temas/NOMBRE.css`, que `look.js` enlaza en `#aspectoCss` y marca con
  `data-look` en `<html>`.
- Se guarda en `nutritionPlanner.look.v1` (clave propia, no dentro de los ajustes) y,
  desde el 2026-10-07, también en la cuenta (sección 11).
- **Un IIFE al principio del `<head>` de `index.html` repite la lista de ids y de colores**
  para pintar el aspecto ANTES de cargar nada (si no, parpadea el diseño por defecto). Es
  una duplicación a propósito; `tests/look.test.js` comprueba que coincide con `LOOKS`. Si
  cambias un color o un id, cámbialo en los dos sitios. El `theme-color` estático del
  `<head>` es `#E9F1E3` (el de `hojas`).
- Cambiar el aspecto por defecto afecta solo a quien no haya elegido nada; quien ya eligió
  uno lo conserva.

**Las hojas están GENERADAS. No las edites a mano.** Salen de `scripts/temas/` con:
```bash
python scripts/temas/construir.py            # todos
python scripts/temas/construir.py hojas noche
```
a partir de `scripts/temas/nucleo.py` (lo común, incluida la parte «neutralizar», que sale
de `style.css`) y `scripts/temas/aspectos/NOMBRE.py` (cada aspecto: variables, tipografía,
arte). **Cada vez que cambie `style.css`, hay que volver a generar**, comitear
`assets/css/temas/*` y subir el sello `?v=`. El generador **obliga a letras de al menos 13 px**
en las etiquetas pequeñas. `scripts/temas/LEEME.md` lo cuenta con más detalle.

**El recorrido y los aspectos:** las maquetas del recorrido usan las variables CSS de la
aplicación, así que cambian de aspecto solas; en `revista` y `pegatinas` (letra muy ancha) hay
reglas propias para que los botones envuelvan (`flex-wrap`). Cuando toques el recorrido,
pruébalo al menos en `hojas`, `revista`, `pegatinas`, `kitty` y `noche`.

**Para ver los diez aspectos** con el navegador sin interfaz, `tour.mjs` acepta `LOOK=nombre`
(sección 12). Para el menú, hay que abrir ☰ y elegir; no existe un script dedicado.

---

## 16. El dueño y cómo trabaja — añadido el 2026-10-08

(La sección 1 ya describe con quién trabajas; esto es lo aprendido en estos días.)

- **Habla ruso, el código va en español.** Contéstale siempre en ruso, corto y claro. Los
  commits, los comentarios, la documentación y los textos de la web, en español.
- **Cuando algo falla se enfada, con razón, y lo que quiere es el arreglo YA.** Tono duro
  («блять», «полная хуйня») no es una orden de cambiar de enfoque: es frustración por algo
  que él ve y tú no. No te disculpes largo: reproduce, arregla, verifica y cuéntalo.
- **«Выкладывай» / «Да» / «деплой» = permiso para commit + despliegue + push de ESE cambio.**
  Suele venir en la misma frase que la queja («…сразу выкладывай»). Si no lo dice, termina
  con una línea preguntando. El permiso de una vez no vale para la siguiente.
- **Odia los emojis en la aplicación** («иишные смайлики»). Usa iconos SVG del sprite de
  `index.html` (`icon-camera`, `icon-chef`…) y números, nunca emojis. Hay un test para el
  recorrido; para el resto vigílalo tú. (El ☰ del menú es un carácter de icono, no emoji.)
- **Quiere cosas que se vean bien, no solo que funcionen**: «прям клёво», animaciones con GSAP,
  textos que quepan en el botón en CADA idioma. Cuando dijo «делай по-своему, главное чтобы
  выглядело понятно и классно», la solución fue rehacer el recorrido entero, no retocarlo.
- **Prueba en su móvil real** (iPhone, a veces Android). Por eso importa lo de los service
  workers y la CSP (sección 13): lo que funciona en un perfil limpio de Chrome puede no
  funcionar en un móvil con una versión anterior instalada.
- **Pide datos, no consuelo** (memoria «hands-on technical dogfooder»): mide antes y después
  y cuenta lo que salga, incluidos los costes (sección 14 dice que la variedad costó
  kcal 96 a 88 % a 8 EUR). Si algo no se pudo comprobar, dilo.
- **Cierra cada respuesta que cambió algo con «cambié X, ve a comprobar Y»**, con el
  número de antes y de después y el dispositivo nombrado.
- **Una sola sesión de trabajo**: el modo «orquestador + agente de código» está APAGADO salvo
  que él lo pida.
- **Mercadona únicamente** hasta que diga otra cosa.

---

## 17. Lo que queda abierto al 2026-10-08

La sección 8 sigue teniendo la lista larga de lo anterior; esto es lo nuevo y lo más urgente.

**Que solo puede comprobar el dueño**
1. El recorrido nuevo en su móvil (¿tirones? ¿textos largos en ruso? ¿se ve en su aspecto?).
2. Cuentas con Firebase de verdad: crear, elegir aspecto, cerrar sesión, volver a entrar,
   entrar desde otro dispositivo (sección 11). **Ningún inicio de sesión real se ha probado
   desde que existen las preferencias por cuenta.**
3. Que la pregunta «¿Quieres ver un recorrido?» salga tras el cuestionario en su móvil. Su
   queja original («не появляется») NO se reprodujo con un perfil limpio (en Chrome sin
   interfaz con iPhone UA sale a los ~3 ms); sí se encontró y arregló el caso del plan de hoy
   ya empezado, y se rehízo el orden del alta. Si vuelve a decir que no sale, pídele un
   vídeo o la captura y mira qué diálogo hay abierto.

**Trabajo pendiente (no pedido aún; propón, no empieces sin que lo confirme)**
4. **Siete idiomas**: uk (propuesto el primero), fr, de, it, pt, pl, ro. Tubería y reglas en
   `scripts/i18n/LEEME.md`. Cada idioma exige, además de la interfaz, las 51 claves `tour.*`,
   las 4 `ui.tour_pregunta_*` y la palabra de borrado (sección 0.5).
5. **Quedan literales en español incrustados en el código** (72 el 2026-09-13; mira
   `node scripts/i18n/inventario.js`), el texto legal completo y el `<title>`, que sigue en
   español.
6. `detectLang()` no está conectada al arranque, y **cambiar de idioma no repinta un plan ya
   pintado** (hay que regenerar o recargar).
7. `restartOnboarding()` ya no la llama nadie (se dejó por prudencia).
8. **Recortes leves a 320×568 con aspectos de letra muy ancha** (`pegatinas`, `revista`) en
   alguna maqueta del recorrido.
9. **`poc/tests`: 19 de 23 en rojo** desde hace tiempo. No es de la aplicación; no lo arregles
   sin que lo pida.
10. **Los hooks globales rotos** (sección 2): arreglarlos o quitarlos es decisión del dueño
    (memoria `reference_hooks_msys_cmd`). Mientras tanto, la regla 5 de la sección 0.3.
11. **Las entradas viejas de `STATE.md`** (2026-10-07 «(f)», el recorrido de 10 pasos, y las
    de las anclas `data-tour`) describen cosas que ya no existen; están marcadas, pero no las
    cites como estado actual.

**Decisiones del dueño que siguen vigentes:** presupuestos 8/12/16/20 EUR; Mercadona
únicamente; «Compartir» e «Imprimir» la lista de la compra no se explican en el recorrido;
aspecto por defecto `hojas`; el recorrido debe ser corto (tope de 12 escenas, hoy 9).
