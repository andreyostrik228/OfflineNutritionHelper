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

## El lote de dos verduras está RECHAZADO (2026-09-09)

Medido con `probar_lote.js 1,2,3`, 200 semillas por perfil, contra los 434
platos actuales:

| semilla | corte | recomp | volumen |
|---------|-------|--------|---------|
| 1       | +9,0  | −8,0   | −13,5   |
| 2       | +10,5 | −8,5   | −9,5    |
| 3       | +7,5  | −6,5   | −11,5   |

Un perfil gana nueve puntos y dos pierden ocho y once y medio. No se aplica.

**Volumen es el que más pierde, y hasta hoy eso era invisible.** La nota
anterior de este fichero hablaba solo de recomposición y de −7 puntos,
porque el juez de `probar_lote.js` decidía mirando únicamente las
violaciones. En la semilla 2 las violaciones se mueven +1,0 y +2,5 —las dos
por debajo del ruido— así que el veredicto era **OK** para un lote que
cuesta 8,5 y 9,5 puntos de días perfectos.

Un día deja de ser perfecto sin llegar a violar nada: el motor recorta
ración, relaja el sabor o cambia de plato, y el contador de violaciones ni
se entera. Desde hoy el juez rechaza también por caída de días perfectos.

## Lo que se probó para RECOMPOSICIÓN y NO funcionó

El control de §7.8 —clonar los 59 platos con más proteína por kcal que ya
existen— pierde **3,5** puntos, así que la mitad de la caída de recomp es el
tamaño del pool y no los platos. La otra mitad no se ha sabido recuperar:

- **Subir el suelo de densidad a p85**: recomp sigue en −7,0 y volumen
  empeora. Además el rendimiento se hunde a 33 platos.
- **Techo de coste de COMPRA** (paquetes enteros, no coste de uso). La
  hipótesis era buena y estaba medida: un plato de 4 ingredientes cuesta
  10,47 € de compra marginal frente a 7,57 los de 3 y 8,21 el catálogo
  actual, y las violaciones de recomp son de presupuesto. Pues no: con techo
  a 9,5 y a 10,5 recomp se queda clavado en −7,0. Se escribió, se midió, se
  tiró — no está en el código.
- **Cambiar de semilla**: 11, 12, 14 y 15 dan todas entre −4,0 y −7,5.

Que el número no se mueva con NINGUNA de las tres palancas apunta a que el
daño no está en qué platos entran sino en que el pool crece.

## El generador no podía producir cenas (arreglado 2026-09-09)

Las semillas 1-3 generaban 21 comidas, 11 desayunos, 9 snacks y **una sola
cena**, con 543 descartes por cuota.

La causa estaba en cómo se asignaba la categoría:

```js
var cat = (hechos.comida < cuota.comida) ? "comida" : "cena";
```

Se llenaban las comidas y a partir de ahí todo caía en cena. Pero los
suelos son **por categoría**, y el de cena es más duro que el de comida
(densidad 0,1171 frente a 0,1120, medido sobre los 434 platos). Así que en
cuanto la cuota de comida se llenaba, el listón subía de golpe para el
MISMO plato y ya casi no pasaba ninguno.

Ahora se prueban las categorías que admiten al candidato, la que más hueco
libre tiene primero, y el plato se coloca en la primera que de verdad lo
acepta. Las cenas pasan de 1 a 10 y el lote de 42 a 48 platos.

**Qué cambió en los perfiles** (media de las semillas 1-3):

| perfil  | antes del arreglo | después |
|---------|-------------------|----------|
| corte   | +9,0              | +3,2     |
| recomp  | −7,7              | −4,8     |
| volumen | −11,5             | −6,3     |

El daño baja casi a la mitad en los dos perfiles que perdían. **Aun así
sigue RECHAZADO**: con el suelo inevitable del control en −3,5, recomp
(−4,8) está cerca pero volumen (−6,3) sigue casi el doble.

El reparto ya no es la palanca. La siguiente por probar es el motor, no el
catálogo.

## Un `undefined` estuvo publicado (2026-09-09)

Nueve recetas de pollo y pavo a la plancha decían **"Saca undefined de la
nevera 10 minutos antes"**, en producción.

La causa: `gen_platos_tecnicas.js` interpolaba `p.art` y ese campo no
existía en ninguna proteína de `gen_platos_tablas.js`. JavaScript concatena
"undefined" y sigue sin avisar. Solo la plantilla `plancha_ave` lo usaba,
así que se estropeó un rincón y nadie lo miró.

Arreglado en los tres sitios: el campo `art` añadido a las tres aves, la
plantilla con repliegue a `"la carne"` si falta, y los nueve pasos ya
publicados corregidos. El guardián está en
`tests/ingredient-packaging-coverage.test.js`: recorre nombres, ingredientes
y pasos de las 434 recetas y falla si aparece `undefined`, `NaN`,
`[object Object]` o `${`.

**Este es el modo de fallo del generador**: el texto lo escribe una
plantilla, nadie relee 1000 recetas, y un campo mal escrito no da error.
