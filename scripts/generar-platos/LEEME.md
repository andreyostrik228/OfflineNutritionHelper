# Generador de platos

Amplía `js/data/dishes.js` y `js/data/dish-instructions.js` por lotes, de
camino a los 1000 platos. Escrito el 2026-09-04 con el primer lote (374 →
434).

## Uso

```bash
node scripts/generar-platos/emitir_platos.js 60 1 0.25 4 40 0.75
python scripts/generar-platos/aplicar_lote.py "lote 2" 2026-09-05
node tests/run-tests.js
```

Argumentos de `emitir_platos.js`, en orden: **cuántos** platos, **semilla**,
percentil del suelo de proteína absoluta, **techo de repeticiones** por
grupo, cuota de platos caros, y percentil del **suelo de densidad
proteica**. Los valores de arriba son los que se usaron en el lote 1.

## Las dos reglas que se cumplen por construcción

Los macros y el coste NO se escriben a mano: salen de
`computeDishIngredientNutrition()` y `priceDishAtStore()`, las mismas
funciones que comprueban los tests. Y todos los ingredientes son roles que
YA existen, así que la cobertura de nutrición, precio, envase, enlace y
caducidad sigue completa sin tocar nada más.

## Por qué hay tantos filtros

Porque el primer intento, que solo miraba que el plato fuera plausible,
**empeoró el planificador**. Medido sobre 200 semillas del perfil de corte
(12 €, 136 g de proteína), los días con violación pasaron del 53% al 84%.

Lo que lo resolvió fue un control: clonar los 60 platos con más proteína
por kcal que ya existían, con otro nombre. Ese control dejó el perfil igual
o mejor (51%). O sea que el daño no venía de meter 60 platos más en la
lotería, sino de meterlos **a media altura**. Con el suelo de densidad en el
percentil 75 del propio catálogo, el lote 1 acabó en 49%: mejor que antes
de existir.

**Si un lote futuro empeora un perfil, ese es el experimento que hay que
repetir antes de tocar nada.**

## Límites conocidos del lote 1

- Los principales vegetarianos salen todos con clara de huevo: es lo único
  vegetal que pasa el suelo de densidad. Varían la legumbre y la verdura,
  pero el componente proteico se repite.
- El perfil de volumen pierde 7 puntos de días "perfect" (68% → 61%): los
  platos densos en proteína son más caros por kcal, y un día de 3871 kcal
  con 20 € va justo.

## La forma de DOS verduras (2026-09-08)

El generador se estaba quedando sin sitio, y el cuello no eran los filtros
sino la FORMA. Con una verdura, `proteina x grano x verdura` da 2.268
combinaciones y quedaban **111** que pasaran los suelos. El objetivo son
1000 platos.

Una segunda verdura, al 70% de racion, multiplica el espacio por 5,5:

```
  1 verdura    2.268 combinaciones   111 pasan los suelos  (4,9%)
  2 verduras  12.474 combinaciones   551 pasan             (4,4%)
```

El mismo porcentaje de aprobados con cinco veces mas candidatos: no son
platos peores, es que hay mas donde elegir.

## Lo que se probó para el perfil de RECOMPOSICIÓN y NO funcionó

Un lote hecho con la forma nueva le quita **7 puntos de días "perfect"** a
recomposición (68% → 61%), de forma estable en todas las semillas probadas.
El control de §7.8 —clonar los 59 platos con más proteína por kcal que ya
existen— pierde **3,5**, así que la mitad de esa caída es el tamaño del pool
y no los platos. La otra mitad no se ha sabido recuperar:

- **Subir el suelo de densidad a p85**: recomp sigue en −7,0 y volumen
  empeora (−5,0 en vez de −1,5). Además el rendimiento se hunde a 33 platos.
- **Techo de coste de COMPRA** (paquetes enteros, no coste de uso). La
  hipótesis era buena y estaba medida: un plato de 4 ingredientes cuesta
  10,47 € de compra marginal frente a 7,57 los de 3 y 8,21 el catálogo
  actual, y las violaciones de recomp son de presupuesto. Pues no: con techo
  a 9,5 y a 10,5 recomp se queda clavado en −7,0. Se escribió, se midió, se
  tiró — no está en el código.
- **Cambiar de semilla**: 11, 12, 14 y 15 dan todas entre −4,0 y −7,5.

Que el número no se mueva con NINGUNA de las cuatro palancas es en sí un
dato: apunta a que el daño no está en qué platos entran sino en que el pool
crece, y ahí el control ya dice que 3,5 puntos son inevitables.

**Antes de volver a intentarlo**, mira si la palanca que falta es el motor y
no el catálogo: `probar_lote.js` juzga solo por violaciones, no por días
"perfect", así que un lote puede salir "OK" y aun así costar 7 puntos.
