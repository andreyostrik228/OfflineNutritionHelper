# Aspectos (assets/css/temas/)

El usuario elige el **aspecto** de la aplicación en *Ajustes → Aspecto*
(`ajustesAspecto` en `index.html`, lógica en `js/ui/render-menu.js`, estado en
`js/core/look.js`). El primero —arriba a la izquierda— es el **aspecto por
defecto**, `entreno`: es `assets/css/style.css` tal cual y no tiene hoja propia.
Los demás son hojas de `assets/css/temas/` que se cargan **encima** de `style.css`.

| id | nombre (ru) | de qué va |
|---|---|---|
| `entreno` | Основное | el diseño base (lima y tinta, tipografía condensada) |
| `hojas` | Листва | verde salvia, ramas de fondo, botones que se hunden |
| `cristal` | Стекло | aurora clara, tarjetas de cristal, botones brillantes |
| `avena` | Овсянка | cuaderno de cocina: papel, costuras, notas adhesivas |
| `relieve` | Мягкий рельеф | «soft UI»: todo del mismo material, en relieve y hundido |
| `pegatinas` | Наклейки | neobrutalismo: contornos gruesos, sombras duras |
| `mercadillo` | Рынок | papel de estraza, toldo, tickets, etiqueta nutricional |
| `revista` | Журнал | revista de cocina: papel, filetes, cifras en serif |
| `noche` | Ночной лес | oscuro, curvas de nivel, brillo menta |

## Cómo se genera una hoja

```
scripts/temas/aspectos/<id>.py   ← LA FUENTE: paleta, variables y reglas del aspecto
scripts/temas/nucleo.py          ← lo común: escala de tamaños, grupos de selectores, "neutralizar"
scripts/temas/arte.py            ← ayudas para dibujar fondos/adornos en SVG inline
scripts/temas/tipografias/*.css  ← @font-face de cada familia (URL relativa a la hoja)
        │
        ▼   python3 scripts/temas/construir.py [id ...]
assets/css/temas/<id>.css        ← LO QUE SE SIRVE (no se edita a mano)
```

Cada hoja lleva, en este orden: las tipografías del aspecto, «neutralizar» (lo que
`style.css` hace solo para el diseño base y ningún aspecto quiere: cursivas
inclinadas, rótulos de menos de 13 px — **se calcula leyendo `style.css`**, así
que cambiar `style.css` obliga a volver a generar), el **núcleo común** y por
último el aspecto.

### El núcleo común (la regla de tamaños)

Todos los aspectos comparten una sola escala: ningún texto por debajo de 13 px,
ninguna cifra por encima de 44 px (salvo el nombre de la cabecera), y tres alturas
de control (40 / 52 / 58 px). Los aspectos pueden tocar las variables `--fs-*`,
`--fw-*`, `--ls-*`, `--tt-*`, `--h-*`, `--hero-k`, `--hero-max` (p. ej. una
tipografía ancha necesita cifras más pequeñas), pero no la idea. Las unidades de
las cifras (`ккал`, `г`) salen en `<span class="u">` y el núcleo las pone más
pequeñas que el número.

### Grupos de selectores

Dentro de un aspecto se escribe `@@BTN_P@@`, `@@CHIP@@`, `@@PANEL@@`… (ver `G` en
`nucleo.py`): se expanden a las listas reales de selectores, y un sufijo
(`@@BTN_P@@:hover`, `@@BTN_P@@ svg`) se aplica a **cada** miembro. Si se añade un
componente nuevo con aspecto de botón/ficha/tarjeta, hay que añadirlo al grupo
que toque y volver a generar todo.

## Añadir un aspecto nuevo

1. `scripts/temas/aspectos/<id>.py` con `V = dict(id, name, desc, sw, fonts, palette, tokens, css)`
   (copiar uno parecido). Las tipografías: `python3 scripts/temas/tipografias.py "Familia:wght@400..800"`
   (tiene que imprimir `cyr=True`).
2. `python3 scripts/temas/construir.py <id>`.
3. Darlo de alta en **dos** sitios: `LOOKS` de `js/core/look.js` y `ASPECTOS` del IIFE
   «ASPECTO» del `<head>` de `index.html` (`tests/look.test.js` vigila que coincidan; `color`
   = su `--canvas`).
4. Los nombres: `ui.aspecto_<id>` en `js/i18n/{es,en,ru}.js`.
5. La miniatura: `node scripts/temas/vistas.js <id>` (ver la cabecera del script).
6. Subir el sello `?v=` de `index.html` y pasar `node tests/run-tests.js`.

Reglas que los tests exigen a toda hoja: sin `@import` ni URL externas (la aplicación
es offline), sin animaciones que dejen algo invisible, sin tipografías que no estén en
`assets/fonts/`, y los pares de color de texto/fondo a 4,5:1.

## Cómo llega al navegador

- `index.html` (`<head>`, IIFE «ASPECTO»): lee `nutritionPlanner.look.v1`, pone
  `data-look` en `<html>`, cambia el `theme-color` y escribe con `document.write` el
  `<link>` de la hoja **antes de pintar** (así no hay salto del diseño por defecto al
  elegido). El sello `?v=` lo copia del enlace de `style.css`.
- Al elegir otro en Ajustes, `applyLookToDom` añade la hoja nueva, quita la vieja
  en su evento `load` y solo entonces guarda la elección; si no llega (sin red y
  sin copia), se queda el que había y se avisa.
- Offline: la hoja lleva `?v=`, así que `sw.js` la guarda la primera vez que se pide
  («recurso con sello: cache primero»); las tipografías van a la cache permanente
  de `/assets/fonts/`. Un aspecto solo funciona sin red si se ha usado una vez con red.
