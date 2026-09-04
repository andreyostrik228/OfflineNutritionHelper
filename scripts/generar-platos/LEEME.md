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
