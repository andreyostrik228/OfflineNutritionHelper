/**
 * tests/pasos-en.test.js
 * ─────────────────────────────────────────────────────────────────────────
 * Los pasos de receta tienen traducción al inglés: cada aparición en pantalla
 * sale en inglés, las tandas no traen valores vacíos ni el español copiado,
 * y el fichero generado (steps-en.js) cubre todos los pasos reales.
 * ─────────────────────────────────────────────────────────────────────────
 */

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var loadBrowserGlobals = require("./lib/load-browser-globals").loadBrowserGlobals;

function projPath(rel) { return path.join(__dirname, "..", rel); }

function run(t) {

  t.test("cada aparición de un paso de receta sale traducida al inglés", function () {
    var s = loadBrowserGlobals([
      projPath("js/core/i18n.js"),
      projPath("js/i18n/es.js"),
      projPath("js/i18n/steps-en.js"),
      projPath("js/data/dish-instructions.js")
    ]);
    var DI = s.DISH_INSTRUCTIONS || {};
    var sinTraducir = [];
    Object.keys(DI).forEach(function (plato) {
      (DI[plato].steps || []).forEach(function (paso) {
        if (s.tStep(paso, "en") === paso) sinTraducir.push(plato + ": " + paso.slice(0, 60));
      });
    });
    assert.deepStrictEqual(sinTraducir.slice(0, 5), [], sinTraducir.length + " pasos sin traducir al inglés");
  });

  t.test("las tandas en inglés no traen valores vacíos ni el español copiado tal cual", function () {
    var dir = projPath("scripts/i18n/tandas/en");
    var vacios = [];
    var copiados = [];
    fs.readdirSync(dir).forEach(function (f) {
      if (!/^tanda-\d+\.json$/.test(f)) return;
      var j = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
      Object.keys(j).forEach(function (k) {
        if (!String(j[k]).trim()) vacios.push(f + ": " + k.slice(0, 50));
        if (j[k] === k) copiados.push(f + ": " + k.slice(0, 50));
      });
    });
    assert.deepStrictEqual(vacios, [], "valores vacíos");
    assert.deepStrictEqual(copiados, [], "frases que siguen en español");
  });

  t.test("el fichero generado tiene una entrada por cada paso real", function () {
    // Se carga con el mismo registro que usa la app, así cuentan también las claves con comillas escapadas.
    var capturado = {};
    var s = loadBrowserGlobals([]);
    s.registerStepTable = function (lang, tabla) { capturado[lang] = tabla; };
    require("vm").runInContext(fs.readFileSync(projPath("js/i18n/steps-en.js"), "utf8"), s);
    var entradas = Object.keys(capturado.en || {}).length;
    assert.ok(entradas >= 1825, "hay " + entradas + " entradas, se esperan al menos 1825");
  });
}

module.exports = { run: run };
