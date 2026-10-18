/**
 * tests/carrusel-dias-ancho.test.js
 * ─────────────────────────────────────────────────────────────────────────
 * Los puntos del carrusel de días en pantallas de 320 px. Con 7 días los
 * puntos ocupan 280 px (7 × 40 px de la hoja de tema) y, junto al texto de
 * la cabecera, la página llegaba a 355 px de ancho. Ahora la cabecera y los
 * puntos pueden bajar de línea. La medida real se comprobó en el navegador
 * (antes 355 px, después 320 px); aquí se vigila que las reglas sigan.
 * ─────────────────────────────────────────────────────────────────────────
 */

var assert = require("assert");
var fs = require("fs");
var path = require("path");

function projPath(rel) { return path.join(__dirname, "..", rel); }

function run(t) {

  t.test("la cabecera del carrusel puede bajar de línea (si no, los 7 puntos salen de la pantalla)", function () {
    var css = fs.readFileSync(projPath("assets/css/style.css"), "utf8").replace(/\r\n/g, "\n");
    assert.ok(/\.days-carousel__bar \{[^}]*flex-wrap: wrap;/.test(css),
      "falta flex-wrap: wrap en .days-carousel__bar");
  });

  t.test("la fila de puntos también puede partirse, por si la pantalla es aún más estrecha que 320 px", function () {
    var css = fs.readFileSync(projPath("assets/css/style.css"), "utf8").replace(/\r\n/g, "\n");
    assert.ok(/\.days-carousel__dots \{[^}]*flex-wrap: wrap;/.test(css),
      "falta flex-wrap: wrap en .days-carousel__dots");
  });
}

module.exports = { run: run };
