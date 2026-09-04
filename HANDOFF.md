# Traspaso — lo que hay que saber antes de tocar nada

> Escrito el 2026-09-02 al final de una sesión larga, para quien venga
> después. `STATE.md` es el diario fechado y `PROJECT.md`/`ROADMAP.md`
> cuentan el qué y el cuándo. Esto es otra cosa: **el cómo**. Los métodos,
> las trampas y los errores que ya se pagaron caros, para que no se
> vuelvan a pagar.
>
> Si solo lees una sección, que sea *"Las lecciones caras"*.

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
| **Nunca commitear secretos.** La clave de USDA vive solo en el scratchpad. | La anon key de Supabase SÍ es pública por diseño (RLS es la seguridad real). |
| **Deja el árbol limpio al terminar.** | Un hook `SessionStart` de claude-flow hace `git add -A && commit && push` automáticamente. Lo que dejes suelto, se publica. También deja ficheros basura de 0 bytes: bórralos. |

Renormalizar CRLF, el comando exacto:

```bash
node -e 'const fs=require("fs");const f="RUTA";let t=fs.readFileSync(f,"latin1");t=t.replace(/\r\n/g,"\n").replace(/\r/g,"\n").replace(/\n/g,"\r\n");fs.writeFileSync(f,t,"latin1");'
```

---

## 3. El código en un vistazo

Sitio web estático puro: HTML + CSS + JavaScript **ES5 con globales de
navegador**, sin build, sin módulos, sin dependencias. `index.html` carga
58 scripts (dos de ellos externos: GSAP y el SDK de Supabase) **en orden manual de dependencia** — si añades uno, colócalo
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

---

## 4. Desplegar

Cloudflare Pages, **subida directa, sin integración con git**: hacer push
NO despliega. Hay que ejecutarlo a mano.

```bash
# 1. montar SOLO lo que sirve el sitio (sin tests, sin docs, sin db)
DIR=<scratchpad>/deploy
rm -rf "$DIR" && mkdir -p "$DIR"
cp index.html icon.svg "$DIR/" && cp -r assets js "$DIR/"

# 2. comprobar que lo montado es lo del repo (ha habido copias viejas)
diff -r --brief js "$DIR/js"

# 3. subir
npx wrangler pages deploy "$DIR" --project-name=offline-nutrition-helper --commit-dirty=true
```

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

---

## 5. Probar

```bash
node tests/run-tests.js     # 550 tests, todos deben pasar
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

---

## 8. Lo que queda abierto

- **`scripts/export_product_allergens.py`** en el repo de Python:
  `product-allergens.js` solo es reproducible con un script del
  scratchpad que ya no existe.
- ~~494 productos nuevos sin nutrición~~ y ~~`Congelados` excluido~~ —
  **HECHOS el 2026-09-03**, ver el UPDATE de esa fecha en `STATE.md` para
  las cifras. Lo que queda de ellos:
  - **153 EAN se rindieron ante un HTTP 429** de OpenFoodFacts durante la
    corrida. A propósito NO quedan cacheados como negativos, así que otra
    corrida los reintenta: es cobertura aplazada, no perdida.
  - **El plan "sin cocinar" no etiqueta las aproximaciones.** El panel de
    productos sí (`renderConfidenceBadge`, "EAN ✓" o el nivel de
    confianza); las tarjetas de comida no dicen nada. Antes de la corrida
    daba igual (0% de los items venían de una aproximación sin revisar);
    ahora son el **7%**, y el 15% del pool está en `needs_review`. Es un
    incumplimiento medible de la regla del propio proyecto: lo aproximado
    se etiqueta.
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
- **El día de 8 € no cuadra el 61% de las veces** con los envases reales.
  El motor lo declara honestamente (`status: minimal`, violación
  `budget`), pero si se quiere arreglar de verdad hay que enseñarle a
  preferir **menos paquetes distintos**, no ingredientes más baratos: en
  un día de 20 € la comida usada son 6,82 € dentro de 20,54 € de compra.
- **El invitado ve la bienvenida en cada visita**, por decisión suya. Si
  algún día cansa, lo suave sería repetir la oferta de cuenta a diario
  pero el cuestionario no.
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
- **`product-storage.js` pesa 104 KB y solo rinde para 12 roles.** El
  puente por EAN (2026-09-04) lo hizo alcanzable, pero
  `real-ingredient-matches.js` solo tiene 12 emparejamientos verificados a
  mano. O se amplían — a mano y por EAN, nunca por parecido de texto — o
  se recorta el fichero: hoy viaja entero a cada visitante para 12 filas.

---

## 9. Recuperación de contraseña — lo que falta hacer en Supabase

El código está entero (`sendPasswordReset()` y `updatePassword()` en
`js/core/auth.js`; los cuatro modos del formulario en
`js/ui/render-auth.js`). Lo que NO se puede hacer desde el repo es la
configuración del proyecto de Supabase. Sin estos pasos el correo no sale,
o el enlace devuelve al usuario a una URL que Supabase rechaza.

1. **Authentication → URL Configuration → Site URL:**
   `https://offline-nutrition-helper.pages.dev`
2. **Redirect URLs** — añadir:
   `https://offline-nutrition-helper.pages.dev/**` y, solo para probar en
   local, `http://localhost:8000/**`. `sendPasswordReset()` manda
   `redirectTo: window.location.origin`; si ese origen no está en la lista,
   Supabase no redirige.
3. **Authentication → Email Templates → Reset Password:** comprobar que
   está activada.

**El correo de cortesía son ~2 mensajes por hora.** Es límite de Supabase,
no del código, así que no se puede depurar a base de reintentos. Si
estorba, la salida es SMTP propio en Authentication → SMTP Settings: Brevo
da ~300 al día gratis y **no exige dominio propio**, que era la pega de las
demás. Lo sensato es comprobar primero que llega UN correo, y montar SMTP
solo si de verdad se topa con el límite.

**Lo que no se ha verificado aquí:** el modo `reset` (volver desde el
enlace) necesita un correo de verdad, así que está probado por lectura y
por los otros tres modos, no de punta a punta. Los otros tres sí, con
clics reales sobre los botones de la interfaz: `login → recover → login →
register` cambian título, botón, campos visibles y el `autocomplete` del
campo de contraseña como toca.
