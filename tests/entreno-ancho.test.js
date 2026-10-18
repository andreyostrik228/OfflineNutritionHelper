/**
 * tests/entreno-ancho.test.js
 * ─────────────────────────────────────────────────────────────────────────
 * La tabla de entrenamiento en pantallas estrechas (320 y 390 px): cada fila
 * pasa a tarjeta con sus etiquetas (data-label), las opciones no parten
 * palabras, y ninguna celda fuerza un desplazamiento horizontal de la página.
 * La comprobación de ancho real se hizo en el navegador; aquí se vigila que
 * las reglas sigan en la hoja de estilos y en el marcado.
 * ─────────────────────────────────────────────────────────────────────────
 */

var assert = require("assert");
var fs = require("fs");
var path = require("path");

function projPath(rel) { return path.join(__dirname, "..", rel); }

/** El texto de un bloque @media que empieza con `cabecera`, o "" si no existe. */
function bloqueMedia(css, cabecera) {
  var i = css.indexOf(cabecera);
  if (i === -1) return "";
  var abre = css.indexOf("{", i);
  var nivel = 0;
  for (var j = abre; j < css.length; j++) {
    if (css.charAt(j) === "{") nivel++;
    if (css.charAt(j) === "}") { nivel--; if (nivel === 0) return css.slice(abre + 1, j); }
  }
  return "";
}

function run(t) {

  t.test("bajo 640 px cada fila de la tabla es una tarjeta de dos columnas", function () {
    var css = fs.readFileSync(projPath("assets/css/style.css"), "utf8").replace(/\r\n/g, "\n");
    var movil = bloqueMedia(css, "@media (max-width: 640px) {\n  .entreno__sesion");
    assert.ok(movil.indexOf(".entreno tr") !== -1, "falta la regla de fila");
    assert.ok(/\.entreno tr \{\s*display: grid;\s*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\);/.test(movil),
      "la fila tiene que ser una rejilla de dos columnas");
    assert.ok(movil.indexOf("content: attr(data-label)") !== -1, "las celdas muestran su etiqueta");
    assert.ok(movil.indexOf(".entreno__tabla thead { display: none; }") !== -1, "la cabecera de la tabla se oculta en móvil");
  });

  t.test("en pantallas de 359 px o menos las opciones se parten entre opciones, no dentro de una palabra", function () {
    var css = fs.readFileSync(projPath("assets/css/style.css"), "utf8").replace(/\r\n/g, "\n");
    // Hay otro @media (max-width: 359px) de la barra superior: se toma el que
    // envuelve la regla de la tabla de entrenamiento.
    var marca = css.indexOf(".entreno__seg { flex-wrap: wrap; }");
    assert.ok(marca !== -1, "falta la regla de las opciones en pantallas estrechas");
    var estrecho = bloqueMedia(css.slice(css.lastIndexOf("@media (max-width: 359px)", marca)), "@media (max-width: 359px)");
    assert.ok(estrecho.indexOf(".entreno__seg { flex-wrap: wrap; }") !== -1, "las opciones bajan de línea");
    assert.ok(/\.entreno__seg-btn \{[^}]*white-space: nowrap;/.test(estrecho), "cada opción ocupa su palabra entera");
  });

  t.test("el panel de entrenamiento solo quita su margen lateral por debajo de 390 px (320: 288 px de contenido; 390 y más, igual)", function () {
    var css = fs.readFileSync(projPath("assets/css/style.css"), "utf8").replace(/\r\n/g, "\n");
    var marca = css.indexOf(".entreno { padding-left: 0; padding-right: 0; }");
    assert.ok(marca !== -1, "falta la regla que quita el margen doble");
    var inicio = css.lastIndexOf("@media (max-width: 389px)", marca);
    assert.ok(inicio !== -1 && marca - inicio < 200, "la regla tiene que ir dentro de @media (max-width: 389px)");
    // Ninguna otra regla del panel toca el relleno lateral: así, 390 px y más no cambian.
    var rellenos = css.split("}").filter(function (r) {
      return /\.entreno\s*\{[^}]*padding(-left|-right)?\s*:/.test(r + "}");
    });
    assert.ok(rellenos.length >= 2, "hay una regla base y la de estrecho");
    rellenos.slice(1).forEach(function (r) {
      assert.ok(/max-width: ?389px/.test(css.slice(0, css.indexOf(r) + r.length)) || /padding-(left|right): 0/.test(r),
        "otra regla cambia el relleno lateral del panel: " + r.slice(0, 80));
    });
  });

  t.test("ninguna celda ni fila de la tabla fuerza un desplazamiento horizontal de la página", function () {
    var css = fs.readFileSync(projPath("assets/css/style.css"), "utf8").replace(/\r\n/g, "\n");
    var reglasTabla = css.split("}").filter(function (r) {
      return /\.entreno (td|tr|table|tbody)\b/.test(r) || /\.entreno__tabla\b/.test(r);
    });
    reglasTabla.forEach(function (r) {
      assert.strictEqual(/white-space:\s*nowrap/.test(r), false, "una celda de la tabla no puede ser nowrap: " + r.slice(0, 60));
    });
    assert.ok(/\.entreno__tabla \{ overflow-x: auto; \}/.test(css), "el contenedor de la tabla se desplaza solo, dentro de su caja");
  });

  t.test("cada celda de la tabla lleva data-label (sin etiqueta la tarjeta quedaría sin nombre de campo)", function () {
    var render = fs.readFileSync(projPath("js/ui/render-entreno.js"), "utf8");
    var tabla = render.slice(render.indexOf("function entrenoTablaHtml"), render.indexOf("function entrenoPlanHtml") > 0 ? render.indexOf("function entrenoPlanHtml") : render.length);
    var celdas = (tabla.match(/<td[ >]/g) || []).length;
    var conEtiqueta = (tabla.match(/<td[^>]*data-label=/g) || []).length;
    assert.ok(celdas >= 6, "la fila tiene seis celdas");
    assert.strictEqual(conEtiqueta, celdas, "todas las celdas llevan data-label");
  });
}

module.exports = { run: run };
