# Nutrition Planner — Roadmap

## «Sin cocinar» con la misma arquitectura que el plan normal (2026-10-21)

El dueño pidió que el modo «sin cocinar» esté montado como el plan normal
(«саму архитектуру, а не логику»). Lo comprobado ese día, en el código y en
Chrome sin interfaz:

| Qué | Plan normal | «Sin cocinar» antes | Estado |
|---|---|---|---|
| Varios días (1/3/7) y carrusel | sí | 1 día siempre | **Hecho, paso 1** |
| El plan vuelve tras recargar | sí (`weekplate-plan-v1`) | no | **Hecho, paso 1** (`weekplate-plan-sincocinar-v1`) |
| Compra de todos los días en «Compra» | sí | solo el coste dentro del panel | Paso 2 |
| Confirmar cada día con su fecha en «Mis planes» | sí | solo hoy | Paso 2 |
| Lo comprado se ve en la despensa | sí | stock aparte que nadie pinta | Paso 3 |
| Lo comprado viaja a la cuenta | sí (`pantry_state`) | solo este dispositivo | Paso 3 |
| Diálogo «ya tienes un plan activo» | sí | no, sale una entrada más | Paso 4 |

**Paso 1 (sello `20261021b`, 1179 tests):**
- `generateNoCookPlanDays(store, options, dias)` en
  `js/engine/no-cook-generator.js`: un día por llamada, presupuesto y kcal
  diarios, como `generateDietPlanDays`. No aparta lo de días anteriores: el
  sorteo ya da días distintos (100 planes de 7 días: 0 días idénticos de
  2.100 pares, 1,2% de tomas repetidas exactas). Y arreglado: la opción
  `allowMakeAhead` no llegaba a ninguna toma; ahora lo «de la noche antes»
  sale del día 2 en adelante, nunca el día 1 ni en un plan de 1 día.
- Mismo carrusel: el cuerpo de "day-carousel-init" de `js/app.js` es ahora
  `montarCarruselDias(el)` y lo usan los dos planes. «Cambiar» lleva su día
  (`data-day`) y la pista no vuelve al día 1. Cabecera «Día 2 de 3»
  compartida (`renderDaySlideHead`, `js/ui/render.js`).
- Guardado en este dispositivo (`planSinCocinarGuardar/Leer/Borrar`,
  `js/core/plan-store.js`), al generar y al cambiar una toma; se restaura al
  cargar, «Resetear» lo borra, y cuenta como plan guardado para no volver a
  enseñar la bienvenida al invitado (decisión del dueño del 2026-10-18).
- En el carrusel la toma es más estrecha: el nombre pasa a su línea (como
  `.meal-head`) en vez de partirse («ЗАВТРА / К»). Medido sin cortes en 320,
  375 y 390 px y en tres aspectos.
- «Confirmar plan sin cocinar» guarda todavía SOLO el día 1 (hoy): es el paso 2.

Compra conjunta medida para el paso 2: 7 días por separado suman 77,17 € de
media; juntos (un envase que rinde varios días se paga una vez), 71,87 €.

## Entrenamientos: estado y prioridades al 2026-10-21 (esto primero si vas a tocar entrenamientos)

**Rediseño, etapa 1 de 3 (2026-10-21): la barra de cinco secciones.** Sello
`20261021a`, 1174 tests en verde. Se hizo sobre `835bf72`. **Sin commit ni
despliegue hasta que el dueño diga «да».**

- El panel de entrenamientos va en cinco secciones con su barra abajo
  (`js/ui/entreno-pestanas.js`): Главная · План · Тренировка · Прогресс ·
  Профиль (es: Inicio · Plan · Entrenar · Progreso · Perfil). Cada bloque del
  panel dice en `data-en` en qué secciones sale; el CSS esconde los demás.
  Sin ese fichero, el panel es la página larga de antes.
- **Inicio:** la fecha con «día de entrenamiento / de descanso», «Hoy» con los
  músculos de la sesión, «Tu semana · 2 de 4», la última sesión (con «Ver los
  resultados», que abre esa sesión en Progreso) y el último récord.
- **Entrenar:** la pantalla de la sesión. Sin sesión abierta, la de hoy y las
  demás de la semana, cada una con «Empezar». Ir a otra sección cierra la
  pantalla, pero la sesión sigue en curso; corrigiendo una terminada con
  cambios, pregunta antes. La flecha vuelve a la sección de antes (corrigiendo,
  a Progreso). El descanso se coloca encima de la barra según lo que mide la
  barra en cada aspecto (`--barra-entreno`).
- **Plan:** «Tu programa», los días, el catálogo, .ics e imprimir.
- **Progreso:** lo de antes, más el peso corporal (el último y el cambio en 30
  días; se apunta en «Mis datos»).
- **Perfil:** las respuestas del cuestionario con «Cambiar», interruptores de
  sonido y de **vibración** (nueva clave `nutritionPlanner.entrenoVibracion.v1`),
  el tutorial, la copia de datos y si el diario va a la cuenta.
- La barra sale en cualquier ancho (también en el portátil) y usa las clases de
  la del menú (`.tabbar`), así que cada aspecto la viste. Para eso el bloque de
  la barra de los nueve aspectos pasó de `@media (max-width:900px)` a
  `@media screen` (en el portátil la del menú sigue escondida).
- El tutorial cuenta las cinco secciones. Última sección abierta recordada en
  `nutritionPlanner.entrenoPestana.v1`.
- Medido con Chrome sin interfaz: los nombres de la barra caben en los 10
  aspectos × 4 idiomas × 320/360/375/390/768/1280 px; el descanso queda 16 px
  por encima de la barra en los 10 aspectos; los recorridos (resultados,
  corregir, empezar desde el plan, flecha, borrar, perfil, cuestionario,
  recargar, volver al menú) en ru/es/uk/en, sin errores de JS. **No probado en
  un móvil de verdad.**

**Lo que queda del rediseño:** etapa 2, el aspecto «Grafito» (fondo grafito,
acento lima); etapa 3, la prueba completa. Y, aparte, la página de cada
ejercicio y las animaciones nuevas del flujo.

**Idea del dueño (2026-10-21), sin empezar:** contar los pasos. Un sitio web no
puede leer el podómetro del móvil (ni Google Fit ni Apple Health), así que la
propuesta es escribir los pasos de un día normal en «Mis datos» y sacar de ahí
el nivel de actividad (hoy es un desplegable «Sedentario…Muy alto» que ya
sube las calorías; sumarlos aparte contaría la marcha dos veces).

**Antes, al 2026-10-18 — subido y desplegado: `main` = `01a5494` (empujado) y producción con sello `20261018zb` (217 de 217 ficheros idénticos). 1164 tests en verde.**

**Lo que cambió en esta tanda (2026-10-18, en `01a5494`):**
- Copia de datos completa («Descargar mis datos» + «Cargar una copia»), con el registro de peso y el cuestionario dentro (`js/core/data-backup.js`).
- Diario y cuestionario en la cuenta, en `settings._entrenos`, unidos con lo del dispositivo; lo borrado no vuelve (`js/core/workout-sync.js`).
- Cambios sobre la marcha: sustituir, saltar, quitar, añadir, superseries y circuitos, series de calentamiento, drop set y al fallo, notas, pausa y calculadora de discos (`js/core/workout-edit.js`, `js/ui/entreno-sesion.js`).
- Corregir una sesión terminada, con «Guardar» y «Cancelar».
- Programa cambiado a mano: sustituir, quitar huecos y añadir ejercicios, en el generador (`js/engine/workout-generator.js`).
- Catálogo con búsqueda en cuatro idiomas, filtros por músculo y por material (`js/ui/entreno-catalogo.js`).
- Progreso por ejercicio con gráfica, carga por músculo, cumplimiento del plan y CSV (`js/core/workout-stats.js`, `js/ui/entreno-progreso.js`).
- «Hoy» con un solo botón y la semana de siete días; tutorial de cinco pasos (`js/ui/entreno-tutorial.js`).
- Estilos de todo lo nuevo en `assets/css/style.css`, con un test que exige una regla CSS para cada clase.

**Lo que NO está hecho todavía de la propuesta de diseño** (resumida al final
de este fichero, «Propuesta de diseño del dueño»): el tema grafito oscuro con
acento lima, la página de cada ejercicio con su historial y las animaciones
nuevas del flujo. Y la prueba en el móvil real. La barra de cinco secciones ya
está (arriba, 2026-10-21).

La tabla «Lo que hay y lo que falta, por apartados» es el estado ANTES de la
tanda del 2026-10-18: ahora el catálogo, la superserie, la corrección, la
sincronización y las gráficas por ejercicio sí existen. La de «Etapa 1» está al
día (2026-10-21).
La parte de nutrición sigue donde la deja la sección del 2026-09-14, justo
debajo de esta.

El 2026-10-18 el dueño pegó un documento largo sobre lo que debe tener una
buena aplicación de entrenamiento (Hevy, Strong, Fitbod, JEFIT y Nike
Training Club; funciones de la A a la K; tres etapas) y dijo: «this is the
roadmap for our project». **Es la hoja de ruta de la parte de
entrenamientos.** Está entero, traducido, al final de este fichero («Hoja de
ruta de entrenamientos del dueño (2026-10-18)»). Aquí va lo que ya hay y lo
que falta, comprobado contra el código ese mismo día.

**Aún no ha elegido por dónde seguir** («don't do anything yet»):
pregúntale qué parte quiere y propón según la etapa 1. Cuando termines algo
de estas tablas, actualízalas en el mismo commit.

### Dónde está el código

| Fichero | Qué hace |
|---|---|
| `js/ui/entreno-cuestionario.js` | Cuestionario de 6 pantallas. Sale solo la primera vez; luego, «Cambiar» en «Tu programa». |
| `js/ui/render-entreno.js` | Panel «Entrenamientos»: «Tu programa», el plan, las fichas de ejercicio, las respuestas guardadas (`weekplate-entreno-v1`) y la exportación .ics. |
| `js/engine/workout-generator.js` | Generador del plan semanal. Lógica pura, sin DOM. |
| `js/data/exercises.js` | Catálogo `EXERCISE_CATALOG`: 81 ejercicios, con nombre y técnica en es/en/ru/uk (el ucraniano, sin revisar por un nativo). |
| `js/data/exercise-poses.js`, `js/ui/entreno-figura.js` | Poses y motor de la animación 3D de cada ejercicio, con los músculos que trabajan y los que ayudan. |
| `js/core/workout-log.js` | Diario (`nutritionPlanner.entrenoDiario.v1`): series, «la última vez», carga sugerida, récords, 1RM, semanas y racha. |
| `js/ui/entreno-sesion.js` | Modo entrenamiento: la sesión en curso y el descanso. |
| `js/ui/entreno-progreso.js` | La semana, la racha, el volumen de 8 semanas y el historial; la última sesión y el récord de «Inicio» y el peso de «Progreso». |
| `js/ui/entreno-pestanas.js` | Las cinco secciones y su barra abajo (2026-10-21), y «Perfil». |
| `js/core/weight-log.js` | Registro del peso corporal (`weekplate-pesos-v1`; con cuenta, viaja en `settings._pesos`). |

Tests: `workout-generator`, `workout-log`, `weight-log`, `exercises-*` y
`entreno*` en `tests/`. Las claves `ent.*` están en es, en, ru y uk; en
ruso, de usted.

### Lo que hay y lo que falta, por apartados

| Apartado | Ya hay | Falta |
|---|---|---|
| **A. Perfil** | Objetivo (ganar músculo, fuerza, tonificar, perder grasa, salud), experiencia, días a la semana y cuáles, duración (30, 45 o 60 min), dónde entrena y qué material tiene, uno a uno, qué quiere trabajar más (hasta 3 grupos), molestias (rodillas, lumbar, hombros) y ejercicios que no quiere. Edad, altura y peso salen de «Mis datos». | Ejercicios favoritos, objetivo «resistencia», tiempo que lleva entrenando, unidades (kg/lb, cm/in). |
| **B. Catálogo** | 81 ejercicios con técnica en 4 idiomas, una animación propia cada uno y los músculos que trabajan y los que ayudan. | Pantalla de catálogo (hoy los ejercicios solo se ven dentro del plan), búsqueda, filtros, variantes, sustituir a mano, favoritos, ejercicios propios, notas, errores típicos. |
| **C. Programas** | Sale solo según los días: cuerpo completo (1–3 días), superior/inferior (4–5) y empuje/tirón/piernas (6), con cada grupo grande dos veces por semana cuando los días dan. Series, repeticiones, descanso y RIR según objetivo y nivel. Descarga cada 5.ª semana (mitad de series, RIR 4). Series por grupo y semana a la vista. Exportación al calendario (.ics). | Editarlo a mano (añadir, quitar, reordenar, sustituir), plantillas, duplicar, pasar una sesión a otro día, planes de 4–12 semanas con periodización, varios programas, programas con nombre (5×5…), importar y exportar programas. |
| **D. Sesión en curso** | Peso y repeticiones (o segundos) por serie, rellenos con «la última vez». Marcar la serie con un toque; añadir y quitar series. Descanso automático con −15/+15 s, vibración y sonido; pantalla encendida. Aviso de récord al momento y resumen final (tiempo, series, volumen, récords). Cada cambio se guarda al instante y la sesión se reanuda tras recargar. | Series de calentamiento, drop sets y al fallo, superseries y circuitos, notas, saltar, sustituir o reordenar un ejercicio, pausa, editar una sesión terminada (solo se puede borrar). |
| **E. Entrenador** | Carga sugerida por doble progresión, con el porqué. Las molestias quitan ejercicios y ponen un sustituto; el acento añade una serie o un ejercicio; los ejercicios que no quiere no salen. | Usar el RPE/RIR real, reajustar tras saltarse una sesión, explicar los cambios del programa, estimar la recuperación, ejercicios preferidos. |
| **F. Estadística** | Récords (kilos, 1RM estimado con Epley, repeticiones), la semana frente al plan (sesiones y kilos), racha de semanas, volumen de las 8 últimas semanas, historial de las 10 últimas sesiones con sus series. | Gráfica por ejercicio, volumen y frecuencia reales por grupo muscular, % del plan cumplido, informes mensuales, comparar periodos, exportar a CSV. |
| **G. Herramientas** | Temporizador de descanso por ejercicio, ajustable y con aviso; 1RM orientativo. | Descanso distinto para el calentamiento, calculadoras de discos y de calentamiento, kg/lb, cronómetro para planchas, intervalos y HIIT. |
| **H. Recuperación y seguridad** | Las molestias del cuestionario, el aviso «no es consejo médico» del plan, el texto de calentamiento y la descarga cada 5.ª semana. | Fatiga y ganas del día, sueño, agujetas, RPE/RIR real, sesiones saltadas y por qué, marcar un ejercicio que molesta durante la sesión, aviso de subida brusca de carga, cuándo parar por dolor. |
| **I. Peso y nutrición** | El sitio es, de base, un planificador de comidas (calorías, macros, compra, despensa), y los entrenamientos por semana de «Mis datos» suben las calorías. Registro de peso corporal con gráfica, que va con la cuenta. | Perímetros, fotos con fecha, objetivos de peso y medidas, recordatorios de medirse. |
| **J. Motivación** | Racha de semanas y récords. | Recordatorios, calendario de actividad, objetivos de semana o mes, informes, compartir. |
| **K. Técnica** | Funciona sin internet (service worker), los datos se guardan en el dispositivo, tema claro/oscuro y 10 aspectos, desde 320 px, cuentas con Firebase y borrado de cuenta, «Descargar mis datos». | Lo de la lista de abajo, volver a cargar una copia, notificaciones. |

**K, comprobado en el código el 2026-10-18; es el hueco que más puede doler:**

- El diario vive **solo en este navegador**: no va a la cuenta. Las
  respuestas del cuestionario tampoco; solo los días, que se guardan en el
  campo `#workouts` de «Mis datos», y ese sí viaja.
- «Descargar mis datos» (`exportarMisDatos`, `js/app.js`) copia solo las
  claves que empiezan por `nutritionPlanner.`: se lleva el diario, pero
  **no** las respuestas del cuestionario (`weekplate-entreno-v1`), ni el
  registro de peso (`weekplate-pesos-v1`), ni el plan guardado
  (`weekplate-plan-v1`). Y no hay forma de volver a cargar esa copia.
- Para subir el diario a la cuenta: las reglas de Firestore solo admiten
  cuatro campos, y publicar reglas nuevas lo hace el dueño desde la consola
  (`HANDOFF.md` §9 y §11). O va dentro de `settings`, como `_pesos` y
  `_prefs`, o hacen falta reglas nuevas. Un documento de Firestore admite
  como mucho 1 MiB y el diario guarda hasta 400 sesiones: mide antes.

### Por etapas (sección 4 del documento)

**Etapa 1 — aplicación básica completa**

| Función | Estado | Nota |
|---|---|---|
| Perfil y objetivos | Hecho | Apartado A; las respuestas se ven y se cambian en «Perfil». |
| Catálogo con filtros | Hecho | 81 ejercicios con técnica y animación; pantalla con búsqueda en 4 idiomas y filtros por músculo y material. Falta la página de cada ejercicio con su historial. |
| Programas y plantillas | A medias | El programa sale solo y se cambia a mano (sustituir, quitar, añadir); sin plantillas ni duplicar. |
| Calendario de entrenamientos | A medias | La semana de siete días en «Inicio», todas las sesiones en «Entrenar» y exportación .ics; sin calendario de meses. |
| Sesión con entrada rápida de series | Hecho | |
| Resultados anteriores junto a los de hoy | Hecho | «La última vez» y relleno automático. |
| Temporizador de descanso | Hecho | |
| Superseries y calentamiento | Hecho | Superseries y circuitos, series de calentamiento, drop set y al fallo. |
| Guardar sin perder datos | Hecho | Al instante en el dispositivo; diario y cuestionario en la cuenta (`settings._entrenos`). |
| Historial y gráficas básicas | Hecho | Historial, volumen de 8 semanas, gráfica por ejercicio, carga por músculo y CSV. |
| Récords y progreso | Hecho | El último récord también en «Inicio». |
| Peso corporal y medidas | A medias | Peso sí (también en «Progreso»); perímetros no. |
| Editar una sesión terminada | Hecho | «Corregir», con «Guardar» y «Cancelar». |
| Técnica básica | Hecho | Texto en 4 idiomas y animación; sin errores típicos. |
| Local y copia de seguridad | Hecho | Descargar y cargar una copia completa (también desde «Perfil»). |

**Etapa 2 — personalización inteligente**

| Función | Estado | Nota |
|---|---|---|
| Programas listos de distintos niveles | A medias | El generador cambia con el nivel; no hay programas con nombre para elegir. |
| Sobrecarga progresiva | Hecho | Doble progresión y descarga. |
| Recomendación de peso y repeticiones | Hecho | Con el porqué. |
| Sustituir según el material | A medias | Automático al generar el plan; no a mano. |
| Reajustar tras saltarse una sesión | Falta | |
| Analítica por grupos musculares | Falta | Solo las series planificadas por grupo. |
| RPE/RIR y fatiga | A medias | RIR objetivo en el plan; no se apunta el real ni la fatiga. |
| Fotos de progreso e informes mensuales | Falta | |
| Planes de varias semanas | A medias | Semanas numeradas con descarga cada 5.ª; sin periodización. |

**Etapa 3 — diferenciarse:** nada, salvo la base de nutrición (es el núcleo
del sitio, pero con los entrenamientos solo se une por el número de
entrenamientos a la semana, que sube las calorías). Del historial, lo único
que adapta algo es la carga sugerida.

### Lo siguiente (propuesta del 2026-10-18; los cuatro puntos se hicieron ese día)

Al 2026-10-21 el dueño eligió el rediseño (barra de cinco secciones y aspecto
«Grafito»): ver arriba. Lo que sigue es la propuesta original, ya hecha.

La regla del propio documento: **dejar perfecto el ciclo planificar →
entrenar → apuntar → ver el progreso → recomendación para la siguiente
sesión** antes de IA, funciones sociales o un módulo aparte. Con eso, los
huecos más claros de la etapa 1:

1. **Que no se pierda nada (K):** una copia completa (diario, cuestionario
   y peso) que se pueda volver a cargar, y el diario en la cuenta. El
   documento pone la fiabilidad por delante de todo, y hoy cambiar de móvil
   o borrar los datos del navegador se lleva el diario entero.
2. **Cambiar el plan a mano (C y D):** sustituir, saltar y reordenar
   ejercicios en la sesión y en el programa; editar una sesión terminada.
3. **Tipos de serie (D y G):** calentamiento, drop set y al fallo;
   superseries y circuitos.
4. **Progreso por ejercicio (F):** una gráfica por ejercicio y el volumen
   real por grupo muscular.

## Estado y prioridades al 2026-09-14 (esto primero)

**657 tests en verde. Desplegado y empujado, sello `20260914c`.**

El plan se dice en **raciones de casa** y no en gramos: "4 yogures", "1/3 de
bote", "3 cucharadas de avena". El redondeo es real (macros, precio e
informe salen de la cantidad redondeada), y la despensa lo acompaña — stock
en raciones, check-list de la compra en ENVASES. Cifras y decisiones en
`STATE.md` → "UPDATE 2026-09-14"; las dos lecciones caras, en `HANDOFF.md`
§7.16 y §7.17.

Efecto en el motor (200 semillas, ruido ±3,5): corte 15,5% → 17,5% de días
con violación, recomp igual, volumen 5,0% → 2,5%; días "perfect" +9,5 y
+14,5 puntos en recomp y volumen. Las violaciones de `cap25` se fueron a
**cero en los tres perfiles**.

### Lo siguiente, en orden

1. **P1 — los 72 literales en español incrustados en el código.** Sigue
   siendo lo único que un usuario en inglés se encuentra, y bajó poco: de
   paso se arreglaron el conector " y " y la etiqueta de `perUnit` (la
   interfaz inglesa decía "1 y 1/2 huevos"), pero el grueso está donde
   estaba. `node scripts/i18n/inventario.js` los lista.

2. ~~**P2 — optimizar `enforceBudgetInServings`**~~ — **CERRADO el
   2026-09-14: la tarea culpaba a la función equivocada.** Se deja escrito
   en vez de borrarlo, porque si solo se tacha alguien vuelve a abrirlo
   dentro de un mes.

   Lo que decía: "generar un plan cuesta 28,7 ms más en corte (+46%), la
   causa es que `enforceBudgetInServings` llama a `computeDayPurchaseCost`
   hasta ~96 veces por plan".

   Lo que salió al medirlo, apagando esa función entera:

   ```
                    corte      recomp     volumen
     serie A       +1,5 ms    +1,5 ms     +0,7 ms
     serie B       +1,4 ms    -0,3 ms     -0,8 ms
   ```

   Dos series independientes. **Un milisegundo y pico, no 28,7.** A las ~96
   llamadas no se llega casi nunca: la función sale antes por
   `if (coste <= budget) return 0`, y ese es el caso normal. En recomp y
   volumen el efecto ni siquiera tiene signo estable — está por debajo del
   ruido, y ninguna de las dos series lo resuelve.

   Los 28,7 ms eran reales pero medían otra cosa: "motor sin raciones
   contra árbol con raciones", una combinación que hoy ya no se puede
   montar (los datos salen siempre del árbol, y el motor viejo no conoce
   los registros por tienda).

   **Dónde estaba el tiempo de verdad:** `normalizeIngredientKey`, la
   función más llamada del motor con diferencia — entre 15.000 y 89.000
   veces por plan, contra 38 de `resolveServingUnit`. Memoizada el
   2026-09-14 (ver la cabecera de `js/core/pricing.js`): **-18 ms en corte,
   -13 en recomp, -15 en volumen, un 25-28% en los tres.** El plan generado
   es idéntico; es una función pura de su cadena.

   **Decisión del dueño: no se optimiza.** Complejidad añadida a una
   función que cuenta dinero, a cambio de un milisegundo. El diseño quedó
   pensado por si algún día cambia de opinión: el ahorro de un candidato no
   varía cuando se mueve OTRO ingrediente (los paquetes se cuentan por
   ingrediente, independientes), así que bastaría recalcular las filas del
   mismo nombre — n+k llamadas en vez de n×iteraciones, y es equivalencia
   exacta, no aproximación.

3. **P3 — coliflor y carne picada siguen en gramos.** No tienen unidad de
   casa honesta: la pieza de coliflor son 1.040 g y la ración mediana 178,
   así que ni un cuarto se le acerca. Es una decisión, no un olvido.

4. **P3 — el envase largo se recorta en el check-list de la compra.** "1 x
   paquete de 500 g (rinde 1,35 kg cocido)" no cabe en 375 px y se corta con
   puntos suspensivos; el texto entero vive en el `title`, que **en un móvil
   no existe**. Si molesta, lo suave es quitar la aclaración entre
   paréntesis solo en esa columna.

5. **Sigue abierto de antes:** el preset de 8 € no da un solo día
   "perfect" en ninguno de los tres perfiles. (La recuperación de contraseña
   que estaba "inerte hasta configurar Supabase" ya no depende de nada:
   desde 2026-09-25 las cuentas son Firebase y el correo lo manda él, sin
   configurar SMTP -- `HANDOFF.md` §9.)


## Estado y prioridades al 2026-09-13

**Weekplate.** La carpeta buena sigue siendo
`Desktop\Offline Nutrition Helper\nutrition-planner` (la única con git).
**640 tests en verde. Desplegado y empujado, sello `20260913c`.**

Lo que se cerró estos días: **la aplicación entera funciona en inglés,
incluidas las 434 recetas** (1.682 pasos distintos, 2.101 apariciones,
100%). El idioma es ahora la primera pregunta de la bienvenida. El
recorrido está reescrito y el scroll se bloquea mientras está abierto.
Detalle y cifras en `STATE.md` → "UPDATE 2026-09-13"; el *cómo* en
`HANDOFF.md` §10 y en `scripts/i18n/LEEME.md`.

### Lo siguiente, en orden

1. **P1 — los 72 literales en español incrustados en el código.** Es lo
   único que un usuario en inglés todavía se encuentra. `node
   scripts/i18n/inventario.js` los lista por fichero; los gordos son
   `plan-generator.js` (17 avisos del generador), `render-no-cook.js` (14),
   `render-pantry.js` (11) y `auth.js` (11). Los tres primeros son texto
   que sale en pantalla; `auth.js` son mensajes de error de la cuenta.

2. **P2 — cada vez que crezca el catálogo, volver a pasar por la
   traducción.** El generador de platos escribe pasos nuevos y `tStep()`
   devuelve el original en español cuando no los conoce: un plato recién
   generado aparece en español dentro de la interfaz inglesa. No rompe
   nada, pero se nota. El ciclo está en `scripts/i18n/LEEME.md` y son tres
   comandos.

3. **P3 — los iconos no llevan sello y `icon.svg` no lo referencia nadie.**
   `apple-touch-icon.png`, `icon-32.png`, `icon-192.png` y los cuatro del
   `manifest.webmanifest` van sin `?v=`, así que un cambio de icono se
   queda cacheado en los clientes que ya lo tienen. Y `icon.svg` (1.785
   bytes en la raíz) no aparece ni en `index.html`, ni en el manifiesto, ni
   en `sw.js` — pero sí se copia en cada despliegue.

4. **P3 — el paso 1 del recorrido parte filas** cuando enmarca el
   contenedor entero de comidas (1.899 px). El usuario no lo ha señalado y
   los pasos que sí señaló están arreglados; queda anotado por si vuelve.

5. **Sigue abierto de antes:** el preset de 8 € no da un solo día
   "perfect" en ninguno de los tres perfiles (medido el 2026-09-09). (La
   recuperación de contraseña ya no está inerte: ver el punto 5 de arriba.)


## Estado y prioridades al 2026-08-31 (leer antes que nada de lo de abajo)

**La carpeta buena es `Desktop\Offline Nutrition Helper\nutrition-planner`.**
`nutrition-planner-fase2` ya no existe; `Desktop\nutrition-planner-app` es
una copia vieja sin git ni tests. HEAD `4477365`, 372 tests en verde.

**Los siete diffs de esa sesión YA están commiteados** (2026-08-31):
revisados con el usuario grupo por grupo y dejados en cuatro commits
(`f9f2777` / `0a69db5` / `76d4e86` / `4477365`), aprobados uno a uno, sobre
`ec6f686`; push forzado a `origin/main`. Reemplazaron a `9dbc616`, un
bundle sin revisar que el hook `SessionStart` de claude-flow commiteó y
pusheó solo (tercer caso de lo mismo; el hook sigue activo). El detalle,
con constantes y mediciones, está en el bloque "EMPIEZA AQUÍ" al principio
de `STATE.md`. `PythonProject` (14 archivos) sigue sin commitear, aparte.

### Lo siguiente, en orden

1. ~~**P0 — que el usuario revise los siete diffs.**~~ **HECHO 2026-08-31**
   — cuatro commits aprobados uno a uno (ver arriba). Queda que el usuario
   pruebe a mano las flechas del teclado del autocompletado de "no me
   gusta", lo único no verificable desde la herramienta.

2. ~~**P1 — API key de USDA FoodData Central.**~~ **HECHO 2026-08-31** — el
   usuario consiguió la clave; se resolvieron 31 roles (cebolla, ajo,
   plátano, brócoli, salmón, tempeh, avena, granos cocidos, latas de
   pescado, marisco cocido...). 26 con match exacto, 5 con proxy y `note`.
   Todos como `generic_reference` / `needsReview:true` con `fdcId` +
   descripción literal; energía por `unitName=="KCAL"`; mapeo ES→EN a mano;
   `avena` re-consultada para no coger "Oil, oat". Sin resolver a propósito:
   `wrap proteico` y `lechuga pepino` (nombre corrupto). Golden-masters
   recapturados, 7 tests de contrato intactos. La clave no se commitea.
   Desbloquea el punto 4 (platos españoles).

3. ~~**P2 — seguir escribiendo recetas.**~~ **HECHO 2026-08-31** — 333 de
   334 (`af96985`..`26fd6af`); falta solo "Merluza al ajillo con verduras"
   (necesita ajo, ver punto 2). Lotes 1-2 por variedad de técnica; el resto
   son permutaciones "proteína + grano + verdura" con recetas más cortas
   que reutilizan los mismos bloques, siempre con cantidad, tiempo y señal
   de "hecho".

4. **P3 — escribir platos españoles.** Este es el arreglo de verdad para
   "quiero más comida española", y no tiene alternativa: solo 25 de 334
   platos son españoles, así que el sesgo de cocina ya está dando todo lo
   que puede (~0,7 comidas españolas al día). **Subir `CUISINE_BIAS_WEIGHT`
   no sirve**: el techo lo pone el catálogo. Bloqueados hasta que llegue
   USDA, porque necesitan sofrito: tortilla de patatas, pollo al ajillo,
   pisto, gazpacho, lentejas guisadas. Ya se pueden escribir sin cebolla ni
   ajo: garbanzos con espinacas, merluza a la plancha, ensaladilla.

5. **P4 — desplegar.** Producción sigue sirviendo la build anterior al
   selector de tienda. `npx wrangler pages deploy .`, y **solo con permiso
   explícito del usuario para esa vez concreta**. No hay integración git en
   Cloudflare Pages: si no se ejecuta el comando, no se despliega nada.

### Lo que NO hay que volver a intentar

- **BEDCA**: no está caído a ratos, no contesta. El endpoint SOAP
  documentado da 404 y el que usa su propia web devuelve HTTP 200 con cero
  bytes en todas las variantes probadas. Usar USDA.
- **Validar una conversión de unidades con Atwater**: es matemáticamente
  imposible que funcione, porque Atwater es invariante de escala. Detalle y
  demostración en `STATE.md`.
- **Emparejar ingredientes por subcadena**: "cebolla" devuelve 30 productos
  con nutrición coherente y ninguno es cebolla.

## Current status

**Stage:** working prototype, updated 2026-08-25 — the nutrition-matching
pipeline was found to be **structurally broken, not merely incomplete**,
and was reworked. Short version, all numbers measured:

- OpenFoodFacts name search had been returning **HTTP 403 on 20/20**
  requests through the real pipeline path. 403 is a 4xx, so it was never
  retried, and the enricher logged it as "No search results" — it was
  reporting "product not found" for queries it never actually made. This
  alone explains Alcampo's 0/288 and most of Mercadona's stagnation.
- Matching now runs against a **local OFF index** (256,838 Spain products
  with all 4 macros, built in ~4 min from the bulk export). The search API
  cannot be used at this scale: paginating Spain needs ~3700 requests,
  `page_size` caps at 100 and deep pages return 401.
- Exact-match rate, thresholds unchanged: **Alcampo 19.1% → 36.0%**,
  **Mercadona 18.3% → 57.3%**. Auto-accepted **4.2% → 11.3% / 19.3%**.
- Auto-accept precision, hand-audited at **100%** of the population (not
  sampled): **77% → 88%**, with records carrying broken data **3 → 0**,
  after adding an Atwater consistency check and refusing to auto-accept
  matches where either side lacks a brand.
- **Limits that remain, stated as plainly as the wins**: one false accept
  survives ("Santa Ana artesanas" matching the "lisas" record at 0.830,
  above the review threshold); one nutritionally material variant miss
  ("Yogur 0% MG 0% azúcares" matched to a regular yogurt); alcohol is
  over-quarantined because Atwater does not model ethanol (harmless —
  verified that the frontend excludes alcohol from meal planning twice
  over); **Carrefour is still hard-blocked** by Cloudflare after two full
  attempts a day apart; and **Alcampo's category pages cap at ~50 products
  while advertising 1500**, so the ~1300 refs discovered are an artefact of
  that cap, not the catalog — the biggest raw-coverage lever still open.

Full detail in `STATE.md` ("Rework del emparejamiento nutricional —
2026-08-25") and `PythonProject/PROJECT_CONTEXT.md` (sections 6, 7.1, 10,
11.1, 12.1, 17.1, 18.1, 19).

Previously, updated 2026-08-24 — first real multi-store
data pipeline plus a store picker in the UI. A separate Python repo
(`PycharmProjects\PythonProject`, until now an OpenFoodFacts-enrichment
tool only, never a scraper) gained real Playwright-based scrapers for
Alcampo and Carrefour, run to completion: Alcampo 288 products scraped /
215 pass the food filter / **0 matched to real nutrition data** (honest
gap, nothing fabricated); Carrefour blocked by Cloudflare mid-run, 0
products, not yet successfully retried. A new export script feeds each
store's catalog into this repo as `REAL_PRODUCTS_CATALOGS.<store>`, and a
real `<select id="store">` now drives the "Sin cocinar" (no-cook) engine
end-to-end (per-store cache, persisted setting). The dish-recipe engine
was found to already be store-parameterized end-to-end from earlier
sessions — only the missing UI edge was added; it still prices
Alcampo/Carrefour choices using Mercadona's curated ingredient prices,
since building `PRICE_CATALOGS.alcampo`/`.carrefour` with the same
hand-curated quality is real data-curation work, deliberately deferred
("Fase B", see "Next priorities" below and Fase 6 in the migration table).
307 tests total (JS), 0 failing; 68 Python tests, 0 failing. Committed
and pushed in both repos but **not deployed** — production still serves
the pre-store-picker build. See `STATE.md`, "Resumen de la sesión
2026-08-23d/2026-08-24" and PythonProject's `PROJECT_CONTEXT.md`.

Previously, updated 2026-08-23 — re-verification
session (no code changes): every item on the priority-ordered issues
list was checked directly against the current code, not assumed from
docs, and confirmed exactly where it was left. One real status change:
the user confirmed they personally completed a real Google OAuth login
end-to-end, closing the one remaining gap in the accounts system (the
technical chain was already confirmed 2026-08-14a). See `STATE.md`,
"Resumen de la sesión 2026-08-23".

Previously, updated 2026-08-20h — per-meal editing
shipped: "cambiar este plato" re-picks one meal in an already-confirmed
plan without regenerating the other 4, using the same weighted-lottery
selection as generation. Required extending saved entries to retain
per-meal `dishName`/`mainProt`/`taste`/`total` and day-level `budget`/
`cookTime`/`taste` (new optional parameter, backward compatible). Budget
for the replacement is capped by the day's real remaining spend, computed
from the other 4 meals' actual cost rather than a generation-time
estimate. A real CSS overflow bug was found and fixed during live
verification (same root-cause class as 2026-08-20b, one level higher in
the DOM). 12 new tests. This closes the last item from the priority list
that wasn't explicitly declined — only `dish-selector.js` weight tuning
remains, and the user confirmed that's fine as-is. See `STATE.md`,
"Per-meal editing: 'cambiar este plato' — 2026-08-20h".

Previously, updated 2026-08-20g — a real data-corruption
bug found while designing per-meal editing: `savePlanForToday()`'s UPSERT
and `findTodayEntry()` didn't filter by `entry.type`, so a same-day
no-cook draft could get silently mistaken for a dish-mode one and gain a
spurious `.meals` array next to its real `.slots` — confirmed with a
direct repro, not theorized. Fixed by filtering `e.type !== "nocook"` in
both; the original 2026-08-20f isolation test passed even with the bug
present, so assertions were widened. 4 new/strengthened tests. See
`STATE.md`, "Resumen de la sesión 2026-08-20g".

Previously, updated 2026-08-20f — known issue #9
(despensa not connected to no-cook mode) addressed: the full 3-stage
lifecycle (confirm → buy → consume) now exists for no-cook plans too,
mirroring the main generator's pattern exactly. Scope was confirmed with
the user before building — full lifecycle, but product SELECTION stays
pantry-unaware for now (matches how the main generator was rolled out in
two separate steps back in 2026-08-06/07 and 2026-08-13). Architecture
keeps a parallel product-quantity stock ledger (discrete products can't
reuse the gram-shaped pantry store) while sharing the existing
`pantryHistory` array for entries, verified safe by reading
`migration.js`/`cloud-sync.js` rather than assuming. UI reuses the exact
same CSS as dish-mode — zero new styles. 10 new tests, 265 total, 0
failed; verified live end-to-end including cross-type isolation. See
`STATE.md`, "Despensa conectada al modo 'sin cocinar' — 2026-08-20f".

Previously, updated 2026-08-20e — known issue #1
re-audited on the current 334-dish set for the first time since the old
204-dish audit: found and fixed a real, localized authoring bug (23
dishes, 15 of them all containing "Quinoa cocida," had `dish.kcal`
noticeably below what their own protein/carbs/fat imply — up to
-148kcal) rather than diffuse rounding noise. This had real functional
impact since `dish.kcal` drives portion scaling in
`buildMealFromDish()`. Coverage went from 156/334 to 179/334 dishes
within Atwater tolerance; the remaining 155 (all positive-diff, no
ingredient pattern) were deliberately left alone per this file's own
guidance not to prioritize hand-fixing dish data ahead of the Fase 1-2
migration. 2 golden-masters recaptured; 7 contract tests untouched. See
`STATE.md`, "Auditoría Atwater del nivel de plato — 2026-08-20e".

Previously, updated 2026-08-20d — known issue #7
(`packaging.js` coverage) reduced from 25 to 12 uncovered ingredient
roles: 13 new package-size entries added (fruit/veg by unit, fresh-tray
meats, breads, frozen seafood), same estimation criteria as the existing
46. Live-verified with the real `resolvePackageInfo()`. The remaining 12
gaps are 11 fresh meat/fish (by design) plus the pre-existing
`"Lechuga: Pepino"` corrupted-name bug, left untouched on purpose. 2
golden-masters recaptured (marginal purchase cost shifted for a couple
of seeded runs); 7 contract tests untouched. See `STATE.md`, "Resumen de
la sesión 2026-08-20d". Part of the same priority-ordered pass through
open issues as 2026-08-20c below.

Previously, updated 2026-08-20c — known issue #5
(`mainProt` reporting) fixed: `buildMealFromDish()` never copied
`dish.mainProt` onto the generated meal, so the protein-diversity report
always fell back to a non-exhaustive label-text guess. One-line fix
(`js/engine/dish-selector.js`); live-verified that a real dish
("Tostadas con jamón cocido y tomate") had its protein source silently
dropped from the diversity count under the old guess, now reported
correctly. 4 new tests, 255 total, 0 failed. Committed, pushed, and
deployed. See `STATE.md`, "Resumen de la sesión 2026-08-20c". This is
part of a broader pass working through all currently-open issues in
priority order (per the user's request); known issue #8 was
deliberately deferred to the Fase 2 redesign below rather than patched
in isolation.

Previously, updated 2026-08-20b — a mobile CSS
horizontal-overflow bug (`.actions`/`.panel`/`.meal-head`/
`.pantry-meal-chip`), reconfirmed in every session since 2026-08-08 but
never traced to a specific element, was finally root-caused: live DOM
measurement at 375px found the actual offender is `.pantry-meal-chip`
alone — `white-space: nowrap` with no width limit inside a
`flex-wrap` container means a chip holding a long dish name refuses to
shrink below its own content width (a flex item's default
`min-width: auto`) and forces the whole document wider to fit it; the
other three selectors were never independently broken, they only
inherited the viewport the chip had already widened. Fix: `overflow:
hidden; text-overflow: ellipsis; max-width: 100%; min-width: 0;` on
`.pantry-meal-chip`, plus a `title` attribute on the chip button so the
truncated dish name stays recoverable on hover. 251 tests re-run, 0
failed (CSS + one HTML attribute only). Verified live against the real
served files (cache-busted, not a test-only `<style>` injection):
`document.documentElement.scrollWidth` 412px→376px, 0 overflow
offenders left in a full-DOM scan, real ellipsis truncation confirmed,
desktop unaffected — and re-verified live against production itself
after deploy (real 375px viewport, 10 real meal chips, `scrollWidth`
376px, 0 offenders). Committed (`061ea4a`), pushed to `origin/main`, and
deployed to production (`offline-nutrition-helper.pages.dev`). See
`STATE.md`, "Fix real: overflow horizontal en mobile —
.pantry-meal-chip — 2026-08-20b".

Previously, updated 2026-08-20 — a real bug the user hit
in use: with a plan already confirmed and bought, generating and
confirming a new plan silently created a SECOND active "Tu plan" card for
the same day. Fix: "Generar plan" now checks whether today already has an
active plan with something real on it (bought and/or cooked) and
something still pending — if so, it opens a dialog asking to change the
whole plan instead of generating silently; confirming that replaces the
NOT-yet-cooked meals of the existing entry in place (never creates a
second card), keeping already-cooked meals untouched. A pure draft or an
already-fully-cooked plan never interrupts. 13 new tests (274 total, 0
failed); verified live end-to-end against the local build, including the
exact reported scenario. See `STATE.md`, "Gate en Generar plan +
reemplazo explícito del plan activo — 2026-08-20". Committed (`0f6c658`),
pushed to `origin/main`, and deployed to production
(`offline-nutrition-helper.pages.dev`) — verified live serving
`findTodayEntry`/`replacePendingMealsForToday`/`getBlockingActiveEntry`
and the `planReplaceDialog` markup.

Previously, updated 2026-08-19c/d — after the 2026-08-19b
diversity fix below, the user asked for the generator to hit budget
deadlocks less often WITHOUT losing that new diversity. Two attempts, both
measured against the same 1000-run stress test: (1) a ~12% internal
budget reserve (`data.targetBudget`) — turned out essentially inert,
because tier escalation is decided against the real hard cap, never the
reduced target; (2) sequencing the hard cap itself so early meals
(breakfast, lunch) get a share proportional to their calorie weight
instead of being free to spend the whole day's slack just by going
first — tried at full strength and rejected (cut calorie violations 53%
but cost ~20pp of dish coverage in breakfast/lunch, a real diversity
regression), then blended to half-strength and confirmed as a clean win:
`status:"perfect"` 240→251, tier-0 (no relaxation) 321→339, `cap25`/
`calories`/`time` violations all down, overall dish coverage 86.2%→86.8%
(breakfast unchanged) — see `STATE.md`, "Reserva de presupuesto y
reparto secuencial — 2026-08-19c/d". 2026-08-19a/b/c/d are all committed
together in `1f7798b`, pushed to `origin/main`, and deployed to
production (`offline-nutrition-helper.pages.dev`) — verified live
serving `plan-generator.js` with `BUDGET_RESERVE_RATIO=0.12`/
`SEQUENCING_BLEND_RATIO=0.5` and no `TOP_CANDIDATES_POOL`.

Previously, updated 2026-08-19b — a mass stress test
(1000 real generations, one fixed profile) requested by the user found
that dish SELECTION had a real diversity problem: breakfast/lunch only
ever produced 12 distinct dishes each (exactly the hard-coded
`TOP_CANDIDATES_POOL` cap on the selection lottery), and meat/fish were
almost entirely excluded from lunch/dinner (89%/72% of the catalog
never chosen) because the "tight" budget scoring mode ranked purely by
purchase-protein-per-euro, ignoring macro fit entirely. Fixed on the
user's explicit request: `TOP_CANDIDATES_POOL` removed, `dish-selector.js`
scoring rebalanced so macro fit always counts — re-running the same
1000-run test confirms real improvement (breakfast coverage
18.8%→98.4%, lunch 10.9%→80.0%, catalog-wide usage 27.8%→87.1%) at the
honestly-disclosed cost of needing time/taste/25%-cap relaxation more
often. All other generator constraints (hard budget cap, relaxation
ladder, macro tolerances) untouched; 2 golden-master tests recaptured
on purpose, 7 contract tests unchanged and green — see `STATE.md`,
"Diversidad del generador: eliminación de TOP_CANDIDATES_POOL y
reequilibrio de protein/€ — 2026-08-19b". This sits on top of
2026-08-19a (a real bug the user hit in use — confirming the plan more
than once created independently "purchasable" duplicate entries,
inflating pantry stock if bought through more than one — fixed via
upsert-onto-draft in `savePlanForToday()`, see `STATE.md`, "Confirmar
plan: UPSERT sobre el borrador del día — 2026-08-19"), 2026-08-14c
(full architecture/UX audit of despensa: active plans moved OUT of the
despensa accordion into a new always-expanded "Tu plan" section right
below the shopping list; despensa itself is just stock + completed-plan
history; `planDate` field distinct from `createdAt` — see `STATE.md`,
"Reubicación de 'Tu plan' fuera de la despensa — 2026-08-14c") and
2026-08-14b (3 clear blocks instead of one flat list mixing
stock/history/sub-stages, zero changes to the underlying logic — see
`STATE.md`, "Rediseño de UX de la Despensa — 2026-08-14b"). 2026-08-14b/c
are committed (`35f35a8`); 2026-08-19a/b/c/d are committed together in
`1f7798b` (see above) — see `STATE.md` session handoff for the full
commit/deploy record. Before that, the site already has a
**complete, LIVE accounts layer** (Supabase Auth email+password/Google
OAuth + Postgres + Row Level Security, guest mode preserved as the
default, local-first sync, idempotent guest→account migration with
conflict resolution), architecturally separate from the nutrition
engine, running against a real provisioned Supabase project and verified
end-to-end against it — real signup/login, cross-device cloud sync,
migration, and RLS-enforced user isolation all confirmed with live REST
calls, not just UI clicks or unit tests (see `STATE.md`,
"Aprovisionamiento real de Supabase + Google OAuth — 2026-08-14a"). ~~Only
remaining open item: no human has completed a real Google login
end-to-end yet~~ — **closed 2026-08-23**, the user confirmed they
personally completed a real Google login end-to-end (verification up to
that point had deliberately stopped short of entering real credentials —
the technical chain was already confirmed).
**Fase
1 of the data migration below is also partially done**: ingredient-level
kcal/protein/carbs/fat for 50 of 81 roles is real, verified, and live in
production (`js/data/ingredient-nutrition.js` + `js/core/nutrition.js`),
promoted from the `poc/` audit that had been sitting unused since
2026-08-04 (see `STATE.md`, "Rediseño del modelo de nutrición por
ingrediente"). Dish SELECTION is also purchase-cost-aware, not just the
final budget verification (2026-08-13, see `STATE.md`, "Presupuesto de
compra MARGINAL durante la selección") — committed and pushed long
since (see `STATE.md` session handoff for the exact current commit
before assuming otherwise; only the 2026-08-14c work above is still
uncommitted). Previous session (2026-08-08) redesigned the final budget
check to mean purchase cost, not usage cost, along with the meal
schedule feature from the session before that — both were committed and
pushed to `main` as of that update, commit `3bad470`. Core architecture
decision (2026-08-04): progressive migration from `dishes.js`
(fabricated macros) to real Mercadona products (see "Decisión de
arquitectura" below) — Phase 0 (test safety net) complete, Phase 1
(widen real-product coverage) now IN PROGRESS (50/81, up from 0
integrated before this session; the remaining 31 have no safe real-data
source today, see known issue #2 in `STATE.md`). Visual design was
reworked twice in the 2026-08-03/04 window; current production CSS is
still that second revision ("premium fitness nutrition", see `STATE.md`).
Dataset is still 334 dishes / 81 ingredient roles (unchanged since
2026-08-03) — this session did not add or remove dishes, only fixed how
their ingredients' nutrition is computed and displayed.

## Completed

- **Multi-store data pipeline + store picker (2026-08-23d/2026-08-24)**:
  real Playwright scrapers for Alcampo and Carrefour (`PythonProject`
  repo, `scrapers/alcampo.py`/`carrefour.py`), a new export script
  (`scripts/export_real_products.py`) feeding this repo's
  `REAL_PRODUCTS_CATALOGS` registry, and a real `<select id="store">`
  driving the no-cook engine end-to-end (dish-recipe pricing still
  Mercadona-only, see "Fase B" under Next priorities). Data state:
  Alcampo 288 scraped/215 food-filtered/0 nutrition-matched; Carrefour
  blocked by Cloudflare, 0 products. Not deployed to production. See
  `STATE.md` and `ROADMAP.md` "Current status" above for full detail.
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
- **Despensa / pantry inventory (2026-08-06/07)**: `js/core/pantry.js` +
  `js/ui/render-pantry.js`, localStorage-backed, 3-stage lifecycle (save
  plan → mark purchase → mark each meal cooked) after a v1 single-action
  design produced wrong data in a real-world "bought but never cooked"
  scenario. Deliberately not connected to `dish-selector.js` (dish
  SELECTION stays pantry-unaware — as of 2026-08-08 the budget check that
  happens after selection IS pantry-aware, see below) or no-cook mode
  (as of 2026-08-20f the lifecycle IS connected to no-cook mode —
  selection there still isn't, deliberately, see that date above). 33
  new tests. Full design record, including why v1 was rejected, in
  `STATE.md`.
- **App-startup architecture hardening (2026-08-07)**: the same real-world
  test that motivated the despensa redesign also surfaced a real
  architectural bug — one malformed `localStorage` entry could abort the
  whole `DOMContentLoaded` handler before the form's submit listener
  attached, so "Generar plan" silently fell back to a native form submit
  (full page reload). Fixed with 4 isolated defense layers (data
  validation at the source, per-row render isolation, per-module
  `safeInit()`, and critical-path listeners wired before any optional
  module) rather than a single added try/catch. Full detail in `STATE.md`.
- **Meal schedule (2026-08-07)**: `js/core/meal-schedule.js` +
  `js/ui/render-schedule.js` — each generated meal gets a real clock time
  (wake/sleep-anchored, evenly spaced, chronologically ordered), computed
  after the generator returns so `plan-generator.js`/`dish-selector.js`
  are untouched. Fixed a pre-existing category-order rendering bug as
  part of the same change. Mobile-only sticky "next meal" bar; time
  persisted through pantry history with a safe fallback for older plans.
  36 new tests (114 total). Full design record in `STATE.md`.
- **Budget = purchase cost, not usage cost (2026-08-08)**: `js/core/
  budget.js` (new, shared by the generator and the shopping list) computes
  the real aggregate purchase cost of a day-plan, pantry-aware.
  `plan-generator.js`'s budget enforcement/scoring/feasibility-reporting
  switched from usage cost to this — fixes a real reported bug where an
  "8€" plan could require 19€ at checkout. Dish selection itself
  (`dish-selector.js`) is untouched. Presets recalibrated against real
  measured purchase cost (5/8/12 → 15/20/28). 12 new tests (126 total).
  Full design record in `STATE.md`.
- **Marginal purchase-cost-aware dish SELECTION (2026-08-13)**: the
  2026-08-08 redesign fixed the final verification but dish `SELECTION`
  itself (`pickDish`, `dish-selector.js`) still decided affordability by
  usage cost — a "cheap to use" dish could still force buying a whole
  expensive package, only caught after the fact by trimming. Now the
  cascade asks for the MARGINAL purchase cost of each candidate
  (`js/core/budget.js`, new `estimate*MarginalPurchaseCost` family):
  how much a dish adds to today's real purchase given what earlier meals
  in the same day already committed to buy (`committedGrams`) and real
  pantry stock — used as the authoritative signal in affordability,
  ranking, and portion-shrinking; usage cost is kept only as a secondary,
  lower-weight tiebreaker. `enforcePurchaseBudgetCap` (2026-08-08) is
  unchanged and remains the final safety net. Per-ingredient package price
  now also shown on meal cards, not just the aggregated shopping list. 13
  new tests (162 total), 2 golden-masters recaptured (selection algorithm
  changed on purpose), 7 contract/invariant tests unchanged and still
  passing. Verified live in browser, including an isolated proof that
  stocking a pantry with exactly a required amount drops that ingredient's
  purchase cost to €0 and the day total by the exact same amount. Full
  design record in `STATE.md`. Committed as part of `aa4f20b` (bundled
  with the rest of the 2026-08-13 session) and pushed.
- **Real per-ingredient nutrition — Fase 1 partially done (2026-08-13d)**:
  a user-reported bug (an ingredient showing macros that biologically
  belonged to a different ingredient in the same dish — mass-allocation
  of the dish's hand-curated total by gram share, not real per-ingredient
  composition) led to promoting the already-audited `poc/data/
  ingredient-rules-full.js` (50/81 ingredient roles with real, verified
  kcal/protein/carbs/fat, matched by hand against `real-products.js` back
  in 2026-08-04 but never integrated into production) into `js/data/
  ingredient-nutrition.js` + a new `js/core/nutrition.js`
  (`computeDishIngredientNutrition`). Resolved ingredients now get exact
  real macros, scaled linearly; the dish's remaining (unresolved)
  ingredients get the REMAINDER of the dish total (never a value borrowed
  from a resolved neighbor) — this is what actually fixes the reported
  bug. `dish-selector.js`'s `buildMealFromDish` rewritten to use this;
  usage/purchase-cost pipeline untouched. UI shows real per-ingredient
  macros with a "real" badge when verified, an explicit "not verified"
  note otherwise — never a fabricated number. 15 new tests including
  exact regressions for the reported case and a chicken+rice case, 2
  golden-masters recaptured on purpose (data model changed
  fundamentally), 177 tests total, 7 contract/invariant tests unchanged
  and still passing. Verified live in browser against the exact reported
  case. Full design record in `STATE.md`. Committed as part of `aa4f20b`
  (bundled with the rest of the 2026-08-13 session) and pushed.
- **Real per-ingredient nutrition — auditoría del recorte a cero +
  consistencia Atwater (2026-08-13e)**: antes de tocar nada más, se
  investigó a fondo el compromiso conocido de la fase anterior (172/334
  platos donde la suma real de ingredientes resueltos, en al menos un
  macro, supera el `dish.total` antiguo y se recorta a 0 en vez de
  repartir un remanente negativo). Conclusión: el modelo de remanente
  (`total = max(sumaReal, estimaciónAntigua)`) es matemáticamente sólido
  y deliberado, no un bug — la mayoría de los casos son ruido de
  redondeo de la estimación manual antigua (incluso en platos 100%
  resueltos) y el resto son correcciones reales de categorías que
  `dishes.js` infravaloraba sistemáticamente (conservas en aceite,
  frutos secos, pechuga de pavo). No se cambió el mecanismo de recorte.
  La investigación sí encontró un bug real independiente: el kcal de un
  ingrediente sin resolver tenía su propio remanente anclado a
  `dish.kcal`, pudiendo quedar inconsistente con su propio protein/
  carbs/fat (99 filas con diferencia >20kcal frente a Atwater, ej.
  "Mermelada light" con 11.5g de carbohidratos pero 0kcal). Corregido en
  `js/core/nutrition.js`: kcal de ingredientes sin resolver ya no usa
  `dish.kcal` en absoluto, se deriva por Atwater
  (`protein×4 + carbs×4 + fat×9`) de su propio remanente — 0 filas
  inconsistentes tras el fix. Ingredientes resueltos siguen usando su
  kcal real tal cual (nunca recalculado). 1 test corregido + 4 nuevos en
  `tests/ingredient-nutrition.test.js` (18 total), golden-masters
  recapturados de nuevo, **180 tests total**, 0 fallos (157 en `tests/` +
  23 en `poc/tests/`). Verificado en vivo en el navegador (desktop y
  mobile) contra el caso exacto de "Mermelada light"; despensa, no-cook
  y purchase cost sin cambios. Análisis completo en `STATE.md`, sección
  "Auditoría del recorte a cero y corrección de consistencia Atwater —
  2026-08-13e". Committed as part of `aa4f20b` (bundled with the rest of
  the 2026-08-13 session) and pushed.
- **Multi-user accounts — Supabase Auth + Postgres + RLS (2026-08-13f)**:
  the user asked to turn the site from a purely local, single-user app
  into a real multi-user one — email+password and Google sign-in, a
  persistent session across reloads, and every piece of personal data
  (profile/settings, despensa, confirmed/cooked plan history) cloud-
  backed and scoped per account, reachable from any device, without
  rewriting the nutrition engine and without discarding guest mode.
  Chose Supabase (Auth incl. Google OAuth + Postgres + Row Level
  Security, free tier, CDN UMD SDK — same "no build system" fit as the
  existing GSAP dependency) over Firebase/Auth0/Clerk after evaluating
  the tradeoffs (see `STATE.md` for the full reasoning). Architecture:
  local-first/optimistic — localStorage stays the synchronous source of
  truth `pantry.js`/`render-pantry.js`/`calculator.js`/
  `meal-schedule.js`/every `js/engine/*` file already used, completely
  unchanged; a new, separate layer (`js/core/{supabase-client,settings,
  auth,cloud-sync,migration}.js` + `js/ui/render-auth.js`) hydrates
  localStorage from the cloud on login and pushes every local mutation
  in the background, hooked into the `onPantryChange` extension point
  `app.js` already exposed plus two new hook points. One Postgres table
  (`user_data`, `supabase/schema.sql`) with three JSONB columns
  mirroring the three localStorage-shaped blobs 1:1, RLS scoped to
  `auth.uid() = user_id`, a `security definer` trigger auto-provisioning
  the row on signup so client writes are always `UPDATE`, never upsert.
  Guest→account migration is idempotent via a per-BROWSER marker
  (`nutritionPlanner.cloudSyncedUserId.v1`), not just an account-level
  `migrated_at` timestamp — the account-only guard has a real shared-
  device leak (found and fixed during design, see `STATE.md`) where a
  second person logging into the same browser could have the first
  person's leftover local cache treated as their own guest data.
  Conflict (both local and cloud have real data on a fresh browser) is
  never resolved silently — the user explicitly picks keep-cloud/
  keep-local/merge. 66 new tests (settings/migration/cloud-sync/auth,
  246 total, 0 failures across `tests/`+`poc/tests/`), all against a
  simulated Supabase client (the Node test sandbox has no real network).
  Verified live in browser (desktop + mobile) in guest mode at first
  (2026-08-13f, no real Supabase project existed yet), then committed
  (`aa4f20b`).
  **2026-08-14a — provisioned for real and fully verified against the
  live backend**: the user created the Supabase project + Google OAuth
  client (the only two steps that genuinely required their own accounts)
  and handed over the public URL/anon key; everything else was
  automated or verified via direct REST calls, not just the UI. Real
  email+password signup/login with an immediate session, page-reload
  persistence, a simulated brand-new device (localStorage wiped
  entirely) correctly pulling settings/despensa back from the cloud,
  idempotent re-sync (no duplication), a live conflict+merge run that
  left both sides identical, and logout correctly wiping the local
  cache. **User isolation was tested by attacking the API directly**,
  not just checking the UI: User B's real session token could not read
  User A's row (even filtering by User A's exact id), and a `PATCH`
  attempt against User A's row using User B's token returned `200` but
  affected 0 rows — confirmed by re-reading User A's row afterward,
  unchanged. The Google OAuth redirect chain (app → Supabase
  `/authorize` → `accounts.google.com`) was followed for real and Google
  accepted the configured `client_id`/`redirect_uri` with a genuine
  sign-in page — verification stopped exactly at the point a human
  would need to enter real Google credentials, deliberately, since
  entering someone's real password is never something to automate. Full
  regression: 246 tests green, despensa's 3-stage lifecycle (buy →
  cook → undo) and no-cook re-verified in guest mode, mobile unaffected.
  Committed (`f66bfac`, config-only — zero code changes) and deployed;
  production re-verified against the same live Supabase project. Full
  blow-by-blow in `STATE.md`, "Aprovisionamiento real de Supabase +
  Google OAuth — 2026-08-14a". Honest open item: no human has completed
  a real Google login end-to-end yet (the technical chain is confirmed,
  but no credentials were ever entered by design) — first real use of
  the button is that final proof.
- **Despensa UX redesign, zero logic changes (2026-08-14b)**: the user
  (the app's own author) reported that even they sometimes couldn't
  follow the despensa panel's interface logic — the underlying 3-stage
  lifecycle in `js/core/pantry.js` was fine, the problem was purely
  presentational (a single flat list mixing current stock, the full
  history of every confirmed plan, and always-expanded buy/cook
  sub-stages). Rewrote `js/ui/render-pantry.js` around 3 clear blocks —
  editable-in-place stock, an "active plans" section for anything still
  pending, and a collapsed read-only history a plan joins automatically
  once fully cooked — plus a searchable text+datalist ingredient picker
  replacing an 81-option `<select>`. `pantry.js`, the financial model,
  and cloud sync are untouched; verified live that purchaseCost/
  shopping-list/plan confirmation/authenticated sync all behave
  identically. Full reasoning in `STATE.md`, "Rediseño de UX de la
  Despensa — 2026-08-14b".

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
**en progreso desde 2026-08-13d** — el 50/81 que llevaba desde
2026-08-04 auditado en `poc/` pero sin integrar, ahora SÍ está en
producción (`js/data/ingredient-nutrition.js`, `js/core/nutrition.js`,
alimenta macros por ingrediente reales en `dish-selector.js`). Lo que
queda de Fase 1: ampliar la cobertura más allá de 50/81 (requiere que el
pipeline Python verifique más productos en `real-products.js` — trabajo
del lado Python, no de este repo) y reparar el script de exportación
Python→frontend que hoy no existe.

### Roadmap de migración por fases

Fase 0 completada (2026-08-04); Fases 1-6 no iniciadas. Cada fase debería
tener: objetivo, archivos implicados, archivos a NO tocar, dependencias,
riesgos, tests necesarios, criterio de fin — definidos con detalle cuando
se empiece esa fase, no de antemano en abstracto.

| Fase | Objetivo | Estado |
| --- | --- | --- |
| 0 | Estabilización y tests — red de seguridad antes de tocar el motor | **Completada 2026-08-04** |
| 1 | Datos reales — ampliar cobertura de resolución ingrediente→producto más allá de 50/81; reparar el script de exportación Python→frontend que hoy no existe | **En progreso; diagnóstico corregido 2026-08-25** — 50/81 integrados desde 2026-08-13d. El script de exportación ya existe (`PythonProject/scripts/export_real_products.py`, 2026-08-24). Lo que NO es cierto y se creía desde hace meses: que los 31 restantes se cierren con más scraping. Son fruta/verdura/pescado/carne frescos y graneles — 10 de ellos ya están en el catálogo de Mercadona con `kcal=null`. Se cierran con una tabla de composición (BEDCA/USDA, ~20/31 cerrables medido), no con un catálogo de marcas. Ver "Next priorities" #1 |
| 2 | Nuevo motor de planificación — `dish-selector.js`/`plan-generator.js` usan el resolver en vez de macros hardcodeadas; `dishes.js` pasa de "plato con macros fijas" a "plantilla de receta con roles" | Parcialmente empezada — `buildMealFromDish` ya usa datos reales por ingrediente cuando existen (2026-08-13d), pero `dishes.js` sigue siendo "plato con macros fijas" (el remanente de los 31/81 sin resolver todavía se ancla al total hand-curated del plato) |
| 3 | Presupuesto y coste real — unificar `usageCost`/`purchaseCost` para que se calculen siempre desde el producto real resuelto; recalibrar `budget-presets.js` | No iniciada |
| 4 | Variedad y generación de planes — planes multi-día; decidir el destino del modo "sin cocinar" (¿converge con el motor principal?) | No iniciada |
| 5 | UX / funcionalidades — exportar lista de la compra, selector de tienda, persistencia local | No iniciada |
| 6 | Extensión a otras tiendas — probar que la arquitectura generaliza más allá de Mercadona | **En progreso 2026-08-23d/2026-08-24** — scrapers reales de Alcampo/Carrefour y selector de tienda en el motor "sin cocinar" (ver `STATE.md`); el motor de PLATOS (`PRICE_CATALOGS`) sigue solo con Mercadona curado — precios reales de Alcampo/Carrefour para platos ("Fase B") pendiente, es trabajo de curación de datos, no de fontanería |

Esta tabla de fases **reemplaza y detalla** las antiguas Milestones 1-2 de
la tabla de abajo (fundación de tests + modelo de datos validado) — esas
dos filas quedan marcadas como superseded. Las Milestones 0 y 3-8 (safety/
producto, constraint solver, historial/dashboard, progreso, workout,
capa de IA, hardening) siguen vigentes tal cual, son ortogonales a esta
decisión de arquitectura de datos.

## Next priorities

0. **P0 — deploy the 2026-08-23d/2026-08-24 store-picker work, when ready.**
   `6b5ff9f`/`1f38a5d`/`c20d9fe` (nutrition-planner) are committed and
   pushed but never deployed (`npx wrangler pages deploy .` was not run
   this session) — production still serves the pre-store-picker build.
   Before deploying: decide whether shipping a store with 0 real nutrition
   matches (Alcampo) or 0 products (Carrefour) is acceptable UX, or
   whether to gate the picker to hide stores with empty/low-quality
   catalogs.
1. **P0 — Fase 1 de la migración — DIAGNÓSTICO CORREGIDO 2026-08-25.**
   Durante meses esta línea decía que Fase 1 estaba bloqueada esperando
   "más productos verificados en `real-products.js` (trabajo del lado
   Python)", es decir: más scraping. **Eso era un diagnóstico
   equivocado.** Los 31 roles de ingrediente sin resolver se
   desglosan así (contado sobre `js/data/ingredient-nutrition.js`, no
   estimado):

   | `reason` | nº |
   | --- | --- |
   | `no_existe` | 12 |
   | `sin_nutricion` (el producto existe, pero `kcal=null`) | 10 |
   | `solo_producto_no_apto` | 3 |
   | `match_ambiguo` | 3 |
   | otros (`otra`, `needsReview`) | 3 |

   Y la lista concreta es **brócoli, calabacín, kiwi, pepino, plátano,
   fresas, conejo, lubina, rape, salmón, bacalao, aguacate, avena,
   pasta cocida, cuscús cocido, arroz integral cocido...** — fruta y
   verdura fresca, pescado fresco, carne fresca y graneles.

   **Un catálogo de productos de marca nunca va a tener nutrición
   fiable de un brócoli suelto**, por mucho que se amplíe: no es un
   producto envasado con etiqueta. Los 10 casos `sin_nutricion` lo
   dicen literalmente — el producto SÍ está en el catálogo de
   Mercadona, con `kcal=null`. Más scraping no cambia eso.

   Lo que sí lo cierra es una **tabla de composición de alimentos**,
   que es exactamente el tipo de fuente que modela alimentos genéricos.
   Medido el 2026-08-25 (ver `PythonProject/PROJECT_CONTEXT.md`,
   sección 19): BEDCA (base oficial española, 2.336 alimentos, API XML
   funcionando y gratuita) cubre bien ~12-14 de los 31; USDA FoodData
   Central cubre buena parte del resto y además tiene variantes
   **cocidas** explícitas, que resuelven el desajuste crudo/cocido que
   bloquea `pasta cocida`/`cuscús cocido`/`arroz integral cocido`.
   Juntas, **~20 de 31 parecen cerrables**.

   **Cómo cerrarlo** (no implementado todavía): tier 4
   (`bedca_generic`/`usda_generic`), siempre marcado como aproximación
   con `needs_review`, alimentando `ingredient-nutrition.js` — donde la
   UI ya distingue "real" de "no verificado" por ingrediente, así que
   el andamiaje de honestidad ya existe. Aviso medido: el top-hit
   ingenuo de ambas fuentes falla ~la mitad de las veces ("edamame" ->
   "Queso **edam**" en BEDCA; "skyr" -> "Tofu yogurt" en USDA), así que
   necesita el mismo scoring + umbral + `needs_review` que el tier 2.
2. **P0 — Make constraints truthful.** Treat budget, prep time, nutrition tolerance, variety, and per-item calorie cap as hard post-generation checks. Budget specifically is now truthful in the sense that matters most (enforced against real purchase cost, not usage cost — 2026-08-08; and since 2026-08-13, the SELECTION cascade itself also optimizes for real purchase cost, not just the final check, see `STATE.md`); the remaining known gap is narrower — cap25%/budget-trim interaction (`STATE.md` known issue #8, still present under `enforcePurchaseBudgetCap`, unchanged 2026-08-13), and fixing that properly still belongs in Fase 2 of the migration above, not as an isolated patch.
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
| 6 | Workout and recovery domains | XL | Profile, progress, safety model | High | Mixing domain rules with unvalidated AI advice | **En marcha desde 2026-10-17** — estado y hoja de ruta en «Entrenamientos», al principio de este fichero |
| 7 | AI explanation/orchestration layer | L | Validated domain tools and server boundary | High | Hallucinations, API key exposure, user trust | Open |
| 8 | Release hardening and portfolio launch | L | All above | High | Accessibility, privacy, and regression debt | Open |

## Future ideas

- ~~Pantry inventory~~ **Shipped 2026-08-06/07** — `js/core/pantry.js` +
  `js/ui/render-pantry.js`, "Despensa" panel. 3-stage lifecycle (use plan
  today → mark purchase done → mark each meal cooked), localStorage-only.
  Originally deliberately NOT connected to `dish-selector.js`; **as of
  2026-08-13 it IS** — dish selection now prefers pantry-covered
  ingredients via marginal purchase cost (see `STATE.md`, "Presupuesto de
  compra MARGINAL durante la selección"). ~~Still NOT connected to no-cook
  mode~~ — **connected 2026-08-20f**, full 3-stage lifecycle (product
  SELECTION in `generateNoCookPlan()` still isn't pantry-aware,
  deliberately). See `STATE.md`, section "Despensa (pantry/inventory)" for
  the full design and the real-world bug that drove the v1→v2 redesign.
- Remaining: barcode/import flows, meal-prep batching, calendar
  integration, coach mode, multilingual content, and analytics.
- Add only after the core plan is trustworthy, explainable, and testable.

## Hoja de ruta de entrenamientos del dueño (2026-10-18)

Traducción fiel del documento que el dueño pegó en ruso el 2026-10-18, con
la frase «this is the roadmap for our project». Solo se han quitado las
imágenes, los iconos, los restos del copiado y los `utm_source` de los
enlaces; el ejemplo de pantalla, que venía como texto suelto, va en un
bloque. Lo que ya hay y lo que falta de cada punto está al principio de
este fichero.

Yo no estudiaría una sola aplicación, sino varias a la vez: unas resuelven
mejor el diario de entrenamiento, otras la creación automática de programas
y otras la enseñanza de la técnica y la motivación. Si se juntan sus puntos
fuertes, sale un producto mucho más completo.

He revisado las descripciones oficiales de las funciones de cinco
aplicaciones conocidas: Hevy, Strong, Fitbod, JEFIT y Nike Training Club.
Abajo repaso lo que hacen y después hago una lista grande de funciones para
desarrollar una aplicación propia.

### 1. Cinco aplicaciones de las que aprender

#### Hevy — la mejor referencia para el diario de entrenamiento

Hevy apuesta por registrar rápido los entrenamientos, crear programas y
analizar el progreso. Funciones principales:

- Registro de series, repeticiones, peso de trabajo y duración del entrenamiento.
- Calentamiento, drop sets, series al fallo, superseries.
- Temporizador de descanso, cálculo de discos, RPE (valoración subjetiva de lo dura que fue la serie).
- Plantillas de entrenamiento y programas propios.
- Los resultados anteriores junto a las series de hoy.
- Récords personales, estimación del máximo a una repetición (1RM), volumen de entrenamiento.
- Estadística por grupos musculares y frecuencia de entrenamiento.
- Seguimiento del peso corporal, medidas y fotos de progreso.
- Recordatorios de entrenamiento, rachas de actividad, informes y logros.
- Feed social, perfiles, comparación de resultados y publicación de entrenamientos.
- Sincronización con dispositivos ponibles compatibles e integraciones.

Fuente: materiales oficiales de Hevy — [lista de funciones](https://www.hevyapp.com/features/) · [centro de ayuda](https://help.hevyapp.com/).

#### Strong — referencia de minimalismo y comodidad en el gimnasio

Strong sirve sobre todo como ejemplo de interfaz en la que se marcan las
series y se vuelve a los resultados anteriores sin pasos de más. Funciones
principales:

- Plantillas y calendario de entrenamientos.
- Registro de ejercicios, pesos, repeticiones y notas.
- Ejercicios propios.
- Superseries y circuitos.
- Series de calentamiento, drop sets y series al fallo.
- Temporizador de descanso automático y configurable.
- Calculadoras de pesos de calentamiento y de discos.
- RPE y otros indicadores de entrenamiento.
- Gráficas de progreso avanzadas.
- Medidas corporales y mapa de carga muscular.
- Exportación de entrenamientos a CSV.
- Compartir entrenamientos, tema oscuro, integración con Apple Health, Siri Shortcuts y servicios de terceros.

Fuente: web oficial de Strong y su centro de ayuda — [web](https://www.strong.app/) · [centro de ayuda](https://help.strongapp.io/).

#### Fitbod — referencia de personalización automática

Fitbod no se limita a guardar registros: intenta elegir el siguiente
entrenamiento según los objetivos, el material y el historial del usuario.
Funciones principales:

- Perfil con los objetivos de entrenamiento y el nivel de preparación.
- Elección del material disponible y del lugar donde se entrena.
- Número de entrenamientos por semana y división del entrenamiento (split).
- Tiene en cuenta la duración deseada, el calentamiento, la vuelta a la calma, el cardio y las preferencias de variedad.
- Selección automática de ejercicios.
- Recomendación de series, repeticiones y peso de trabajo según los resultados recientes.
- Estimación de la recuperación de los grupos musculares.
- Sustitución de ejercicios, opinión sobre las preferencias y ajuste de las recomendaciones.
- Vídeos de demostración de los ejercicios.
- Actualiza los entrenamientos siguientes según las sesiones registradas.

Diferencia importante: aquí el algoritmo tiene que tener en cuenta el
historial de entrenamientos, no cambiar ejercicios al azar. Y la estimación
de la recuperación no puede tomarse como una medida exacta del estado
fisiológico.

Fuente: centro de ayuda de Fitbod — [web](https://fitbod.me/) · [centro de ayuda](https://help.fitbod.me/).

#### JEFIT — referencia de biblioteca grande y programas

JEFIT junta un planificador, un catálogo de ejercicios amplio, un diario de
entrenamiento y analítica. Funciones principales:

- Biblioteca de más de 1.500 ejercicios, según el propio servicio.
- Programas listos, entre ellos 5×5, Push/Pull/Legs y Full Body.
- Entrenamientos propios y planes de varias semanas.
- Filtros por grupos musculares, objetivos y material.
- Registro de series, peso, repeticiones, superseries, drop sets y notas.
- Instrucciones para hacer los ejercicios.
- Analítica de volumen, récords personales y 1RM.
- Métricas de carga y recuperación.
- Sincronización entre móviles, relojes y versión web compatibles.
- Comunidad e intercambio de datos de entrenamiento.
- Planificación adaptativa según los datos del usuario, en las funciones del servicio que la tienen.

Fuente: materiales oficiales de JEFIT — [web](https://www.jefit.com/).

#### Nike Training Club — referencia de enseñanza y sesiones listas

A diferencia de las aplicaciones que sobre todo registran el entrenamiento,
Nike Training Club ayuda a entender qué hacer y cómo hacer los movimientos.
Funciones principales:

- Más de 200 entrenamientos y programas, según la página oficial.
- Sesiones de fuerza, resistencia, HIIT, yoga, pilates y movilidad.
- Entrenamientos con material y sin él.
- Vídeos y entrenamientos con instructor.
- Sesiones de unos 5 a 50 minutos.
- Programas para principiantes y para usuarios con más experiencia.
- Planificación de la semana de entrenamiento y programas de varias semanas.
- Materiales sobre técnica, recuperación y el proceso de entrenamiento.
- Historial de actividad, registro de las sesiones hechas y logros.
- Conexión con servicios y dispositivos compatibles.

Fuente: Nike — [Nike Training Club](https://www.nike.com/es/NTC-app).

### 2. Qué enseñan estos ejemplos

- **Hevy y Strong: el diario tiene que ser rápido.** Durante el
  entrenamiento nadie quiere rellenar formularios largos. Hay que ver el
  resultado anterior, meter rápido el peso y las repeticiones de hoy,
  marcar la serie como hecha y descansar entre series.
- **Fitbod: la aplicación tiene que tener en cuenta el historial.** El
  siguiente entrenamiento tiene más sentido cuando el sistema sabe qué
  ejercicios hizo la persona, qué peso levantó y cómo cambiaron sus
  resultados.
- **JEFIT: importan la elección y la flexibilidad.** No se puede obligar a
  todos a seguir una misma plantilla: cada uno tiene sus objetivos, su
  experiencia, su material y sus preferencias.
- **Nike Training Club: no basta con nombrar el ejercicio.** Al
  principiante le sirven una demostración visual, instrucciones y una
  secuencia de sesiones lista, no solo una lista de «3 series de 10
  repeticiones».

**Conclusión principal:** una buena aplicación tiene que cerrar el ciclo
entero del entrenamiento: planificación → ejecución → registro de
resultados → análisis → ajuste de la siguiente sesión. Funciones como el
feed social o la inteligencia artificial pueden ser útiles, pero sin ese
ciclo básico no salvan el producto.

### 3. Lista completa de funciones que conviene prever

Tres prioridades:

- **Obligatorio:** sin esto la aplicación no cumple bien su tarea principal.
- **Muy deseable:** mejora claramente la experiencia del usuario.
- **Extra:** puede distinguir el producto de la competencia, pero al
  principio no hace falta.

#### A. Perfil del usuario y configuración inicial

| Qué | Detalle | Prioridad |
|---|---|---|
| Objetivo | Ganar masa muscular, fuerza, perder grasa, forma física general, resistencia. | Obligatorio |
| Experiencia | Principiante, intermedio, avanzado; cuánto tiempo lleva entrenando. | Obligatorio |
| Datos del cuerpo | Edad, altura, peso; medidas extra si quiere. | Obligatorio |
| Lugar | Gimnasio, gimnasio en casa, casa, calle. | Obligatorio |
| Material | Barra, mancuernas, máquinas, poleas, barra de dominadas, gomas, peso corporal y otros. | Obligatorio |
| Horario | Días de la semana, número de entrenamientos, duración cómoda de la sesión. | Obligatorio |
| Preferencias | Ejercicios favoritos, movimientos que quiere excluir, formatos de entrenamiento preferidos. | Obligatorio |
| Limitaciones | Lesiones, limitaciones de movimiento y contraindicaciones a tener en cuenta: solo los datos necesarios y con una personalización prudente. | Deseable |
| Unidades | Kilos/libras, centímetros/pulgadas, idioma y formato de hora. | Deseable |

Detalle importante: no hay que obligar a contestar 30 preguntas en el
primer arranque. El perfil básico tiene que crearse rápido, y los ajustes
adicionales se pueden ir ofreciendo poco a poco con el uso.

#### B. Catálogo de ejercicios

Prioridad: núcleo obligatorio del producto.

Es una de las partes más importantes de la aplicación. Si la base de
ejercicios es mala, la creación de programas, la enseñanza de la técnica y
la búsqueda de sustitutos funcionan peor.

| Función | Qué tiene que hacer |
|---|---|
| Búsqueda | Por nombre, sinónimos y tipo de movimiento. |
| Filtros | Músculos, material, dificultad, tipo de ejercicio, lugar. |
| Esquema muscular | Mostrar los músculos principales y los secundarios. |
| Técnica | Demostración, instrucciones paso a paso, errores técnicos principales. |
| Parámetros | Material, tipo de resistencia, unilateral o bilateral, músculos principales. |
| Variantes | Otras formas de hacer el mismo movimiento. |
| Sustitutos | Proponer ejercicios con una tarea parecida si falta el material o no se puede hacer el movimiento original. |
| Favoritos | Guardar los ejercicios preferidos. |
| Ejercicios propios | Crear y editar movimientos del usuario. |
| Notas | Consejos personales de técnica y de ajuste de la máquina. |

Es muy útil tener un vídeo o una animación corta en bucle de cada
ejercicio, y además una alternativa en texto. Hay que indicar bien que los
músculos marcados son principales o secundarios, sin afirmar que un
ejercicio concreto carga aislado un solo músculo.

#### C. Creación de programas de entrenamiento

Prioridad: núcleo obligatorio del producto.

El usuario tiene que poder tanto recibir un programa listo como montarlo
por su cuenta. Necesario:

- Montar entrenamientos con ejercicios sueltos.
- Planificar la semana de entrenamiento.
- Repartir la carga entre los grupos musculares.
- Divisiones: Full Body, Upper/Lower, Push/Pull/Legs y variantes propias.
- Ajustar el número de ejercicios, de series de trabajo y de repeticiones.
- Elegir el rango de repeticiones objetivo y el descanso.
- Indicar un RPE o RIR objetivo: lo dura que debe sentirse la serie o cuántas repeticiones deben quedar en reserva.
- Configurar el calentamiento, las series de trabajo y la vuelta a la calma.
- Guardar plantillas y duplicar entrenamientos existentes.
- Reordenar ejercicios, añadir nuevos y quitar los que sobran.
- Pasar entrenamientos a otros días.
- Editar el programa sin perder el historial ya registrado.
- Ver qué músculos y movimientos hay planificados en la semana.

Avanzado:

- Planes de 4 a 12 semanas.
- Periodización: cambiar volumen e intensidad por fases.
- Semanas de descarga.
- Subir la carga poco a poco.
- Ajuste automático del programa si se salta un entrenamiento.
- Varios programas para distintos objetivos.
- Importar y exportar programas.
- Programas listos de autores o entrenadores contrastados.
- Reglas de progresión propias.

La aplicación no debe presentar ningún programa como el mejor para todo el
mundo. El esquema adecuado depende del objetivo, la experiencia, el tiempo
disponible, la recuperación y las limitaciones de cada uno.

#### D. Pantalla del entrenamiento en curso

Prioridad: crítica.

Aquí pasa el usuario buena parte del tiempo. Si la pantalla es incómoda,
ninguna analítica bonita lo compensa.

Ejemplo de pantalla durante la sesión (ilustración de la estructura
recomendada, no una captura de una aplicación existente):

```text
Entrenamiento A                                  En curso
Press de banca con barra
Resultado anterior: 60 kg × 10
Serie 1        Peso, kg: 62,5        Repeticiones: 8
DESCANSO 01:30          −15 s  ·  Pausa  ·  +15 s
[ Marcar la serie como hecha ]
```

Hay que prever sí o sí:

- Añadir y quitar series rápido.
- Campos separados para peso y repeticiones.
- Relleno automático con los datos de la sesión anterior, que se pueda corregir.
- Marcar las series hechas.
- Temporizador de descanso automático, que también se pueda arrancar a mano y cambiar de duración.
- Pausas, y poder seguir el entrenamiento después de minimizar la aplicación.
- Añadir calentamiento, series de trabajo y tipos especiales de serie.
- Superseries y circuitos.
- Notas al ejercicio y a cada serie.
- Saltar, sustituir o reordenar un ejercicio.
- Ver los ejercicios que quedan.
- Guardar un entrenamiento sin terminar.
- Terminar, cancelar y editar la sesión.
- Recalcular bien la duración y la estadística.
- Mostrar el récord personal y los resultados anteriores.

Detalle técnico crítico: la serie tiene que guardarse en cuanto se
confirma, no solo al terminar el entrenamiento entero. Cerrar la
aplicación, una llamada entrante o pulsar «Atrás» sin querer no deben
destruir lo introducido.

#### E. Entrenador automático y plan adaptativo

Prioridad: muy deseable, si la tarea de la aplicación es ayudar a entrenar
y no solo llevar un diario. Aquí el producto puede ser bastante más listo
que un registro normal.

| Función | Cómo tiene que funcionar |
|---|---|
| Recomendación de peso | Propone el peso según las series anteriores, las repeticiones y lo duras que fueron. |
| Sobrecarga progresiva | Indica cuándo subir el peso, las repeticiones o el número de series. |
| Sustitutos | Propone un ejercicio alternativo disponible con una tarea de entrenamiento parecida. |
| Ajuste del volumen | Cuenta las series hechas de verdad, no solo el plan inicial. |
| Adaptar el calendario | Ayuda a reorganizar el programa tras saltarse una sesión. |
| Tener en cuenta la opinión | Recuerda qué ejercicios excluye o prefiere el usuario. |
| Seguimiento de la carga | Muestra el volumen de entrenamiento y cómo cambia en los periodos elegidos. |
| Estimar la recuperación | Usa el historial, la fatiga que dice el usuario y, si los hay, otros datos; muestra la incertidumbre de la estimación. |
| Respuestas | Explica los ejercicios, los términos de entrenamiento y la lógica de las recomendaciones. |
| Por qué cambia | Muestra por qué cambiaron el peso, el número de series o los ejercicios. |

Yo no empezaría prometiendo que la inteligencia artificial «determina a la
perfección la recuperación muscular» o «sabe exactamente la carga óptima».
Son afirmaciones exageradas. Mejor un mecanismo de recomendación
transparente, que el usuario pueda comprobar y cambiar.

#### F. Estadística y análisis del progreso

Prioridad: obligatorio. Registrar entrenamientos sin poder entender qué
cambió en un mes no basta.

- **Progreso en los ejercicios:** historial de pesos de trabajo y
  repeticiones, mejor resultado, 1RM estimado, cambio en la semana, el mes
  y periodos más largos.
- **Volumen de entrenamiento:** número de series, repeticiones y peso
  levantado; comparación del volumen por ejercicios y grupos musculares,
  diciendo con claridad cómo se calcula.
- **Medidas físicas:** peso corporal, perímetros, fotos de progreso,
  tendencia y fechas de las medidas.

Lista completa de métricas a considerar:

- Número de entrenamientos por días, semanas y meses.
- Porcentaje de los entrenamientos planificados que se hicieron.
- Rachas de actividad y parones.
- Duración de las sesiones.
- Pesos de trabajo y repeticiones de cada ejercicio.
- Récords personales.
- 1RM previsto, no garantizado.
- Volumen por ejercicios y grupos musculares.
- Frecuencia con que se entrena cada grupo muscular.
- Cumplimiento del plan en series y repeticiones.
- Historial de peso corporal y medidas.
- Fotos de progreso por fecha.
- Informes semanales y mensuales.
- Comparar los periodos que se elijan.
- Exportación del historial a CSV u otro formato cómodo.

Además, las cifras tienen que calcularse bien. Por ejemplo, el «peso total
levantado» no se puede comparar sin más entre ejercicios de distinto tipo,
y que suba el volumen no demuestra por sí solo que el programa sea más
eficaz.

#### G. Temporizadores y herramientas

Prioridad: núcleo obligatorio y algunos añadidos útiles.

- Temporizador de descanso con tiempo configurable.
- Aviso de fin del descanso con sonido, vibración o ambos.
- Descansos distintos para el calentamiento y las series de trabajo.
- Calculadora de discos para la barra, contando el peso de la barra.
- Calculadora de series de calentamiento.
- 1RM orientativo a partir de las series hechas.
- Paso de kilos a libras y al revés.
- Cronómetro para planchas, isometrías y ejercicios por tiempo.
- Temporizadores de intervalos para circuitos y HIIT.
- Superseries y circuitos, pasando de un ejercicio al siguiente en orden.
- Tiempo del entrenamiento en curso.
- Poder pausar el entrenamiento.
- Que el temporizador siga con la aplicación minimizada, si la plataforma lo permite.

#### H. Recuperación, cómo se siente y seguridad

Prioridad: muy deseable. Lo útil aquí no es que la aplicación diagnostique,
sino que ayude a organizar los entrenamientos con más seguridad.

- Autovaloración de la fatiga y de lo preparado que se siente para entrenar.
- Sueño, por lo que diga el usuario o por integraciones.
- Notas sobre el dolor muscular (agujetas).
- Dureza subjetiva de las series con RPE/RIR.
- Sesiones saltadas y por qué.
- Recomendaciones de calentamiento y vuelta a la calma.
- Vídeos con la técnica correcta y los errores frecuentes.
- Marcar los ejercicios que causan molestias.
- Aviso si se intenta subir de golpe la carga fijada.
- Explicar cuándo hay que parar un ejercicio por dolor o por sentirse raro.
- Recomendaciones de descanso discretas.
- Recordar que la aplicación no sustituye una valoración médica ante lesiones o síntomas preocupantes.

No conviene que un «porcentaje de recuperación de cada músculo»
pseudocientífico sea la única base de una decisión de entrenamiento. Mejor
mostrar una estimación orientativa junto al historial real de carga y lo
que dice el usuario.

#### I. Peso corporal, nutrición y composición corporal

Prioridad: depende de cómo se posicione la aplicación. Si se orienta al
culturismo, la hipertrofia o el cambio de composición corporal, es un
módulo extra útil.

- Historial del peso corporal y su tendencia.
- Perímetros de cintura, pecho, brazos, caderas y otras zonas.
- Fotos con fecha.
- Objetivos de peso corporal y de medidas.
- Calorías y macronutrientes, si se hace un diario de comidas.
- Relación entre los objetivos de entrenamiento y el plan de comidas.
- Historial de cumplimiento del plan.
- Sincronización con una aplicación de nutrición aparte.
- Recordatorios de medirse.

No hay que mezclar la analítica de entrenamiento con estimaciones del
porcentaje de grasa a partir de una foto, poco fiables desde el punto de
vista médico. Si se muestra un valor calculado, hay que explicar sus
límites.

#### J. Motivación y retención

Prioridad: añadido útil.

- Recordatorios del entrenamiento planificado.
- Calendario de actividad.
- Objetivos de la semana o del mes.
- Recompensas por coger un ritmo regular.
- Récords personales e historial de logros.
- Informe del mes o del año.
- Visualización clara del progreso.
- Compartir un entrenamiento o un resultado.
- Objetivos personales que el usuario puede cambiar.
- Mensajes discretos tras un parón largo.
- Flexibilidad al saltarse una sesión, sin mensajes que culpen.
- Funciones sociales (seguir a otros, feed de entrenamientos, comparar resultados) solo si encajan con la idea de la aplicación.

Lo principal es premiar la constancia y el cumplimiento del plan, no
empujar a entrenar con dolor ni ignorar la recuperación.

#### K. Sincronización, ajustes y calidad técnica

Prioridad: casi todo es calidad obligatoria del producto.

- Registro e inicio de sesión, si hace falta sincronizar entre dispositivos.
- Datos guardados en el dispositivo.
- Copia de seguridad y restauración.
- Funcionar sin internet hasta donde la arquitectura lo permita.
- Sincronizar al volver la conexión.
- Que no se dupliquen registros al sincronizar otra vez.
- Exportar entrenamientos.
- Importar el historial de otra aplicación, cuando sea técnicamente posible.
- Tema oscuro.
- Interfaz adaptada a distintos tamaños de pantalla.
- Accesibilidad: elementos de tamaño suficiente, buena legibilidad y etiquetas claras.
- Notificaciones configurables.
- Gestión de los datos personales y borrado de la cuenta.
- Ajustes de privacidad de las fotos y del perfil fáciles de encontrar.
- Errores comprensibles y poder recuperar un entrenamiento sin terminar.

Especialmente importante: una buena aplicación no debe depender de una
conexión perfecta en el gimnasio. Como mínimo, el registro básico de
ejercicios, series y resultados tiene que funcionar en el dispositivo, y la
sincronización hacerse aparte.

### 4. Qué conjunto de funciones elegiría

No recomiendo crear desde el primer día todas las funciones de las cinco
aplicaciones a la vez. Aumentaría la complejidad, y algunas funciones no
serán útiles hasta que haya un público.

Yo construiría el producto en tres etapas.

**Etapa 1. Aplicación básica completa** (prioridad n.º 1)

- Perfil y objetivos de entrenamiento.
- Catálogo de ejercicios con filtros.
- Creación de programas y plantillas.
- Calendario de entrenamientos.
- Entrenamiento en curso con entrada rápida de series.
- Resultados anteriores junto a los actuales.
- Temporizador de descanso.
- Superseries y calentamiento.
- Guardar los datos sin pérdidas.
- Historial de entrenamientos y gráficas básicas.
- Récords personales y estadística de progreso.
- Peso corporal y medidas.
- Editar un entrenamiento terminado.
- Instrucciones básicas de técnica.
- Almacenamiento local y copia de seguridad.

**Etapa 2. Personalización inteligente**

- Programas listos de distintos niveles.
- Sobrecarga progresiva.
- Recomendaciones de peso y repeticiones.
- Sustitución de ejercicios según el material.
- Adaptar el programa tras saltarse una sesión.
- Analítica ampliada por grupos musculares.
- RPE/RIR y fatiga subjetiva.
- Fotos de progreso e informes mensuales.
- Planes listos de varias semanas.

**Etapa 3. Diferenciarse**

- Asistente con IA que explica sus recomendaciones.
- Programas adaptativos basados en el historial.
- Sincronización con relojes y servicios de fitness.
- Módulo de nutrición ampliado.
- Feed social e intercambio de entrenamientos.
- Integraciones para entrenadores y sus clientes.
- Informes personales ampliados.
- Herramientas extra de análisis de la técnica, si hay tecnología adecuada.

### 5. Lo que considero más importante

Hay funciones que lucen mucho en una presentación pero valen menos de lo
que parece. La IA, los logros, las animaciones bonitas y el feed social no
compensan una entrada de series lenta, una mala base de ejercicios o perder
el historial de entrenamientos.

Criterios de calidad:

- **Rapidez:** apuntar una serie lleva literalmente unos pocos toques, sin
  campos obligatorios de más.
- **Fiabilidad:** el historial no se pierde ni se duplica, y el usuario
  puede corregir un error.
- **Personalización:** el sistema tiene en cuenta los entrenamientos
  pasados y el material, pero deja corregir a mano.
- **Claridad:** el usuario entiende para qué hace el ejercicio, qué le toca
  después y cómo cambia su progreso.
- **Utilidad práctica:** las gráficas y las recomendaciones ayudan a
  decidir, no solo adornan.
- **Seguridad y privacidad:** la aplicación no hace promesas médicas ni
  convierte la motivación en presión.

La regularidad y una carga equilibrada importan más que los adornos: por
ejemplo, las recomendaciones de la OMS para adultos incluyen actividades de
fortalecimiento de los grandes grupos musculares al menos dos días por
semana, junto con actividad aeróbica. Es un buen ejemplo de referencia
básica para planificar, aunque el programa concreto depende de los
objetivos y la salud de cada uno. (Fuente: Organización Mundial de la
Salud.)

### 6. Conclusión final

Yo tomaría Hevy y Strong como base del diario de entrenamiento, Fitbod como
referencia de planificación adaptativa, JEFIT para la estructura del
catálogo de ejercicios y Nike Training Club para la enseñanza y la
demostración de los movimientos.

Una aplicación fuerte no tiene que incluir absolutamente todas estas
funciones. Pero sí tiene que tener un ciclo de entrenamiento fiable: el
usuario sabe qué hacer, hace el entrenamiento, apunta rápido el resultado,
ve su progreso y recibe una recomendación razonable para la siguiente
sesión.

Es ese ciclo lo que yo dejaría funcionando a la perfección antes de añadir
una IA compleja, funciones sociales o un módulo de nutrición aparte.

## Propuesta de diseño del dueño (2026-10-18)

El dueño la pegó en ruso el 2026-10-18 junto con la hoja de ruta de arriba; no
estaba en el repositorio y el 2026-10-21 se recuperó de la sesión de ese día.
Aquí va resumida, con sus puntos y en su orden. Los ejemplos de pantalla del
original eran maquetas «conceptuales», no requisitos al pie de la letra.

**Principio:** como un buen registrador de entrenamientos, atractivo pero sobre
todo cómodo durante la sesión; sin decenas de tarjetas, gráficas y botones. En
pocos segundos hay que saber qué toca hoy, empezar y anotar las series.

1. **Cinco secciones con barra abajo:** Главная (qué toca hoy y el acceso
   rápido), План (calendario, programas listos, editar sesiones, catálogo),
   Тренировка (la sesión en curso, las series y los temporizadores; el botón
   principal), Прогресс (fuerza, gráficas, medidas e historial) y Профиль
   (objetivos, ajustes, material, avisos, sincronización y cuenta). Nada de
   feed social en la barra al principio.
2. **Inicio:** responde qué hago hoy, cómo voy y cómo empiezo rápido. Primero
   la tarjeta de la próxima sesión con un solo botón (nombre, minutos,
   ejercicios, músculos, «EMPEZAR»); luego la semana («1 de 4»); luego la
   última sesión y UN dato útil de progreso (un récord). No diez gráficas,
   calorías, sueño, pulso y agua a la vez.
3. **Sesión en curso:** la pantalla más cuidada. Resultado anterior a la
   vista, peso y repeticiones con zonas grandes, marcar con un toque, descanso
   automático que se puede pausar y cambiar, añadir serie, sustituir y ver la
   técnica, guardado tras cada cambio, seguir tras cerrar la aplicación,
   resumen al terminar (y que «terminar» no se pulse sin querer en vez de
   marcar). Vibración al marcar y al acabar el descanso, que se pueda quitar.
4. **Plan:** gestionar el programa, no entrenar. Programa actual (p. ej.
   Upper / Lower, 4 días), una tarjeta por día con su estado, «Añadir
   entrenamiento»; dentro, cambiar ejercicios, series, repeticiones y carga;
   copiar, renombrar y guardar como plantilla; programas listos con filtros.
5. **Catálogo y página del ejercicio:** biblioteca propia, también desde la
   sesión. En la página: vídeo o animación, nombre, etiquetas (músculo,
   material, nivel), «Cómo hacerlo» paso a paso, «En qué fijarse», músculos
   principales y secundarios, «Añadir al entrenamiento»; el historial y las
   gráficas de ese ejercicio. Búsqueda y filtros por músculo, material,
   dificultad y tipo de movimiento; resultados en tarjetas compactas.
6. **Progreso:** respuestas a preguntas concretas (¿soy más fuerte?, ¿con qué
   regularidad entreno?, ¿cómo cambia el volumen?, ¿qué pasa con el peso y las
   medidas?). Cuatro apartados: Fuerza, Volumen, Regularidad, Cuerpo. Arriba
   unas cifras clave; debajo gráficas con periodo (7 días, mes, 3 meses, año,
   todo). Tocar un punto abre la sesión de ese resultado. Resumen compacto y
   el detalle al tocar.
7. **Estilo:** tema oscuro como uno de los principales, fondo **grafito** (no
   negro), tarjetas algo más claras, bordes tranquilos; también tema claro.
   **Un solo color de acento** (verde lima, naranja o turquesa) para las
   acciones principales, las series hechas y algunas cifras, no para todo.
   Tipografía clara y neutra, cifras grandes para peso, repeticiones y reloj.
   Un solo juego de iconos; ilustraciones de ejercicios uniformes. Contraste,
   texto escalable y elementos grandes (se marca la serie con una mano).
8. **Reglas:** lo frecuente a mano; no pedir dos veces lo mismo (rellenar con
   lo anterior, editable); guardar solo; no depender solo del color; mínimos
   campos obligatorios (RPE, notas y sensaciones, opcionales); separar plan y
   hecho; funcionar sin red; pocas animaciones (la rapidez manda); el usuario
   decide (la aplicación propone, no cambia nada a escondidas); privacidad de
   medidas y fotos a la vista.

**Su recomendación final:** empezar por tres pantallas (inicio, sesión en
curso y crear programa) y, si quedan cómodas, seguir con el catálogo, el
progreso y lo demás. Que la interfaz sea clara, coherente y rápida, no
«rica» en elementos.

## Update rule

At the end of every development task, update the status, completed items, new risks, and the first actionable priority. Do not mark a milestone complete until its acceptance criteria and tests pass.