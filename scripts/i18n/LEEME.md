# Traducción — cómo está montada y cómo se sigue

Leer esto antes de tocar nada de `js/i18n/`. Lo importante no es la
mecánica, es **por qué falla en silencio**.

---

## La regla que lo explica casi todo

**Una clave que no casa letra por letra no traduce y NO da error.** El texto
sale en español dentro de una interfaz en inglés y nadie se entera hasta que
lo ve un usuario. No hay excepción, no hay aviso en consola, los tests pasan.

De ahí sale todo lo demás: las claves se validan contra los datos reales
antes de escribir el fichero, y el que valida se niega a escribir si
encuentra una sola clave fantasma.

---

## Las tablas

Por cada idioma `xx` hay CUATRO ficheros, y los tests los exigen todos en
cuanto existe `js/i18n/xx.js` (los idiomas servidos se sacan de los
ficheros, no de una lista):

| fichero | función | clave |
|---|---|---|
| `js/i18n/xx.js` | interfaz | `ui.*`, `tour.*` |
| `js/i18n/food-xx.js` | ingredientes, y en todo idioma menos el inglés los 434 platos ENTEROS | nombre español |
| `js/i18n/packages-xx.js` | etiquetas de envase y de ración | etiqueta española entera |
| `js/i18n/steps-xx.js` | pasos de receta (GENERADO) | la frase entera |

Hechos: `en` (2026-09-13) y `ru` (2026-09-28). Cada uno necesita además sus
cuatro `<script>` en `index.html`, junto a los del inglés.

Las funciones viven en `js/core/i18n.js`: `t()` para la interfaz, `tFood()`
para alimentos, `tDish()` para nombres de plato (**compositivo**: descompone
"Pollo a la plancha con arroz" en palabras + método), `tStep()` para los
pasos y `tPackageLabel(label, n)` para los envases.

**`tPackageLabel` lleva singular Y plural** en cada entrada, porque el inglés
no forma el plural añadiendo una "s": `barra` → `loaf` / `loaves`, `caja` →
`box` / `boxes`.

Donde el plural no es uno solo (ruso, ucraniano, polaco; el rumano añade "de"
desde 20) la entrada es `{one, few, many, other}`, las categorías de CLDR, y
se elige con `Intl.PluralRules`: 1 банка, 2 банки, 5 банок, 1,5 банки. El test
exige las cuatro. Mira el `_ruFormas` de `packages-ru.js`.

**`tDish` solo COMPONE en inglés.** Sus conectores (" with ", " and ", " of ")
son ingleses, y en ruso la pieza cambia de caso tras "con" ("arroz" es "рис",
"con arroz" es "с рисом"). En los demás idiomas los 434 platos van enteros en
`food-xx.js`, y del vocabulario de piezas solo se usan las etiquetas de
proteína (`mainProt`: "pollo", "legumbre") que salen sueltas en las notas del
plan.

**La lista de la compra traduce la etiqueta ENTERA y después recorta el
paréntesis.** Al revés buscaba "docena" y no casaba. Por eso en un idioma
nuevo lo que importa de verdad no puede ir entre paréntesis al final: se
recorta en pantalla.

### Dos decisiones que parecen raras y no lo son

**La clave es la frase española entera, no un identificador.** Así
`steps-en.js` se lee en paralelo con `js/data/dish-instructions.js` sin
saltar de un fichero a otro. El precio es el de arriba: si el paso cambia una
coma, deja de traducir.

**El español no está en `es.js` cuando el original vive en otro sitio.** El
recorrido (`js/data/tour-steps.js`) y `LEGAL_SUMMARY` guardan su texto
español **junto al comentario que lo justifica**, y en `en.js` hay una clave
que solo existe en inglés. Eso lo vigila la lista `CLAVES_CON_ORIGEN_FUERA`
en los tests: si no, el test de simetría entre tablas chilla.

---

## Se traduce al PINTAR, no al guardar

`item.name`, `meal.dishName` y el texto de los pasos **son también claves de
búsqueda**. Si se traducen al generar el plan, el plan guardado deja de
casar con el catálogo y se rompe la despensa, la lista de la compra y el
precio. Se traduce en el último momento, al escribir en el DOM.

Corolario: `applyI18nToDom` (en `js/ui/render-menu.js`) **salta los elementos
que tienen hijos** (`if (nodos[i].children.length) continue;`). Escribir
`textContent` ahí borraría iconos y botones anidados.

Hay tres marcas en el HTML: `data-i18n` (texto), `data-i18n-<attr>`
(`placeholder`, `title`, `aria-label`…) y `data-i18n-html`, que sí usa
`innerHTML` y por eso **solo va en elementos cuyo interior es texto y
etiquetas inertes** — nada con `id`, ni botones, ni campos: sustituir el
interior se lleva por delante el manejador y el botón deja de funcionar sin
dar ningún error.

El recorrido no lleva marcas (se pinta desde JavaScript), así que
`applyI18nToDom` llama a `refreshTourTexts()` al final.

---

## Los pasos de receta: el ciclo

```bash
# 1. qué falta en ese idioma, por frecuencia de aparición en pantalla
node scripts/i18n/pendientes.js ru 90     # -> scripts/i18n/pendientes-ru.json

# 2. rellenar los valores y guardar como tandas/ru/tanda-NN.json

# 3. validar y regenerar js/i18n/steps-ru.js
node scripts/i18n/construir-steps.js ru

# 4. si tocó un .js, subir el sello ?v= en index.html, tests, desplegar
node tests/run-tests.js
```

`construir-steps.js` **se niega a escribir** si encuentra claves fantasma
(no casan con ningún paso real), claves duplicadas entre tandas,
traducciones vacías, traducciones idénticas al español o, en ruso y
ucraniano, frases sin una sola letra cirílica. En las 21 tandas del inglés y
las 20 del ruso no hubo ni una sola clave fantasma, y esa es la razón.

Para el ruso las claves NO se copiaron a mano: se tradujo por número (paso 1
a 1.682, en el orden de los platos, para tener la receta entera delante) y un
script puso la frase española exacta como clave. Copiar 1.682 claves a mano
es la manera segura de meter una coma distinta.

`node scripts/i18n/inventario.js` da el estado completo: tamaño de las
tablas, cobertura real de los pasos medida con `tStep` (no con grep) y los
literales en español que siguen incrustados en el código.

### Cómo se traduce

- **Nombre comercial de estantería → se queda en español.** "Mercadona",
  los nombres de producto, lo que está impreso en el envase. Traducir eso
  hace imposible encontrarlo en la tienda. Son 103 fragmentos y están ahí a
  propósito.
- **Palabra descriptiva → se traduce.** "aguacate", "tomate", "sartén".
- Las MAYÚSCULAS del original se conservan: marcan lo que rompe el plato
  (`PRENSA EL TOFU`, `RETIRA LA OLLA DEL FUEGO`) o lo que es seguridad
  alimentaria (el anisakis, el desalado del bacalao). No se suavizan.
- Los pasos escritos por el generador se copian **letra por letra**,
  incluidos sus propios fallos de concordancia (`el batata`, `el patata`):
  la clave tiene que casar con lo que dice el dato, no con lo que debería
  decir. El inglés del valor sí sale correcto.

---

## Hueco, no error

Sin traducción, `tStep()` devuelve el **original en español**. Es a
propósito: el generador de platos (`scripts/generar-platos/`) escribe pasos
nuevos, y un plato recién generado va a salir en español dentro de una
interfaz en inglés. Feo, pero se cocina. Un hueco no.

**Por eso, cada vez que crezca `dish-instructions.js`, hay que volver a
pasar por aquí.** `node scripts/i18n/inventario.js` lo dice en una línea.
