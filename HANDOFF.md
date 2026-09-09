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
| **Deja el árbol limpio al terminar**, y `git push` a mano cuando él lo autorice. | Ver la corrección de abajo: **nadie empuja por ti**. |

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

Y sobre los **ficheros basura de 0 bytes** que sí aparecen de vez en cuando
en la raíz (esta sesión: `el`, `puesto`, `#5ec98a`, `--on-green`, `4.5`): la
explicación que había —el hook los deja— tampoco se sostiene, porque el hook
no escribe ficheros. Se intentó reproducirlos a propósito con `Write`, con
`Edit` y con una orden cuya SALIDA llevaba `>` y `>=`, y **no aparecieron en
ninguno de los tres casos**. Así que el mecanismo sigue sin conocerse. Lo que
sí funciona es la defensa: `git status --porcelain` antes de dar por
terminada la sesión, y borrar lo que salga. No inventes una causa para esto
sin reproducirlo primero.

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
