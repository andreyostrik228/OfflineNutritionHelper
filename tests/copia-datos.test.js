/**
 * tests/copia-datos.test.js
 * ─────────────────────────────────────────────────────────────────────────
 * «Descargar mis datos» y «Cargar una copia» (js/core/data-backup.js): qué
 * entra en la copia, que la vuelta es exacta, que lo que no es una copia no
 * se carga, que cargar sustituye solo lo de la aplicación y que, si el
 * navegador no deja guardar, todo queda como estaba.
 * ─────────────────────────────────────────────────────────────────────────
 */

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var loadBrowserGlobals = require("./lib/load-browser-globals").loadBrowserGlobals;

function projPath(rel) { return path.join(__dirname, "..", rel); }

function sandbox() {
  return loadBrowserGlobals([projPath("js/core/data-backup.js")]);
}

/** Un localStorage de mentira con length y key(), como el de verdad. */
function almacen(inicial, fallaEn) {
  var datos = {};
  Object.keys(inicial || {}).forEach(function (k) { datos[k] = inicial[k]; });
  var escrituras = 0;
  return {
    datos: datos,
    get length() { return Object.keys(datos).length; },
    key: function (i) { return Object.keys(datos)[i] || null; },
    getItem: function (k) { return Object.prototype.hasOwnProperty.call(datos, k) ? datos[k] : null; },
    setItem: function (k, v) {
      escrituras++;
      if (fallaEn && escrituras === fallaEn) throw new Error("QuotaExceededError");
      datos[k] = String(v);
    },
    removeItem: function (k) { delete datos[k]; }
  };
}

var INICIAL = {
  "nutritionPlanner.settings.v1": JSON.stringify({ age: 30, goal: "bulk" }),
  "nutritionPlanner.entrenoDiario.v1": JSON.stringify({ v: 1, sesiones: [], enCurso: null }),
  "nutritionPlanner.entrenoSonido.v1": "0",
  "nutritionPlanner.theme.v1": "oscuro",
  "nutritionPlanner.lang.v1": JSON.stringify("ru"),
  "nutritionPlanner.cloudSyncedUserId.v1": "uid-123",
  "weekplate-pesos-v1": JSON.stringify([{ fecha: "2026-10-18", kg: 80, t: 1 }]),
  "weekplate-entreno-v1": JSON.stringify({ nivel: "intermedio", configurado: true }),
  "weekplate-plan-v1": JSON.stringify({ dias: [] }),
  "otra-web": "no es nuestro"
};

function run(t) {

  t.test("la copia lleva todo lo de la aplicación (los dos prefijos) y nada de fuera ni la marca de sesión", function () {
    var s = sandbox();
    var copia = s.copiaCrear(almacen(INICIAL), "2026-10-18T10:00:00.000Z");
    assert.strictEqual(copia.app, "weekplate");
    assert.strictEqual(copia.version, 2);
    var claves = Object.keys(copia.claves);
    ["weekplate-pesos-v1", "weekplate-entreno-v1", "weekplate-plan-v1", "nutritionPlanner.entrenoDiario.v1"].forEach(function (k) {
      assert.ok(claves.indexOf(k) !== -1, "falta " + k);
    });
    assert.strictEqual(claves.indexOf("otra-web"), -1, "lo de otra web no entra");
    assert.strictEqual(claves.indexOf("nutritionPlanner.cloudSyncedUserId.v1"), -1, "la marca de sesión es del dispositivo");
    assert.strictEqual(copia.claves["nutritionPlanner.settings.v1"].goal, "bulk", "el JSON va leído, legible a mano");
    assert.strictEqual(copia.claves["nutritionPlanner.theme.v1"], "oscuro", "un texto que no es JSON va tal cual");
    assert.strictEqual(copia.claves["nutritionPlanner.lang.v1"], '"ru"', "un texto JSON va con sus comillas: la vuelta es exacta");
  });

  t.test("la vuelta es exacta: copiar, leer y cargar deja cada valor igual", function () {
    var s = sandbox();
    var texto = JSON.stringify(s.copiaCrear(almacen(INICIAL), "2026-10-18T10:00:00.000Z"), null, 2);
    var r = s.copiaAnalizar(texto);
    assert.ok(r.ok, JSON.stringify(r));
    assert.strictEqual(r.fecha, "2026-10-18T10:00:00.000Z");
    var destino = almacen({});
    assert.strictEqual(s.copiaRestaurar(destino, r.claves), r.n);
    Object.keys(INICIAL).forEach(function (k) {
      if (k === "otra-web" || k === "nutritionPlanner.cloudSyncedUserId.v1") return;
      assert.strictEqual(destino.getItem(k), INICIAL[k], k);
    });
  });

  t.test("lo que no es una copia no se carga, y se dice por qué", function () {
    var s = sandbox();
    assert.strictEqual(s.copiaAnalizar("").error, "vacia");
    assert.strictEqual(s.copiaAnalizar("{ esto no").error, "json");
    assert.strictEqual(s.copiaAnalizar("[1,2]").error, "formato");
    assert.strictEqual(s.copiaAnalizar(JSON.stringify({ app: "otra", claves: {} })).error, "formato");
    assert.strictEqual(s.copiaAnalizar(JSON.stringify({ claves: [] })).error, "formato");
    assert.strictEqual(s.copiaAnalizar(JSON.stringify({ claves: { "otra-web": 1, "__proto__": 2 } })).error, "vacia",
      "solo claves de fuera: no hay nada que cargar");
    var grande = "x".repeat(s.COPIA_MAX_BYTES + 1);
    assert.strictEqual(s.copiaAnalizar(grande).error, "grande");
  });

  t.test("se aceptan las copias de antes (versión 1) y se filtran las claves que no tocan", function () {
    var s = sandbox();
    var v1 = { exportadoEl: "2026-09-01T08:00:00.000Z", version: 1, claves: {
      "nutritionPlanner.settings.v1": { age: 41 },
      "nutritionPlanner.cloudSyncedUserId.v1": "de otro",
      "nutritionPlanner.mal nombre": 1
    } };
    var r = s.copiaAnalizar(JSON.stringify(v1));
    assert.ok(r.ok);
    assert.deepStrictEqual(Object.keys(r.claves), ["nutritionPlanner.settings.v1"]);
    assert.strictEqual(r.claves["nutritionPlanner.settings.v1"], JSON.stringify({ age: 41 }));
  });

  t.test("cargar sustituye lo de la aplicación, deja lo de fuera y la marca de sesión de este navegador", function () {
    var s = sandbox();
    var destino = almacen({
      "nutritionPlanner.pantry.v1": "{\"viejo\":true}",
      "nutritionPlanner.cloudSyncedUserId.v1": "uid-de-aqui",
      "otra-web": "sigue"
    });
    var n = s.copiaRestaurar(destino, { "weekplate-pesos-v1": "[]" });
    assert.strictEqual(n, 1);
    assert.strictEqual(destino.getItem("nutritionPlanner.pantry.v1"), null, "lo que no estaba en la copia se va");
    assert.strictEqual(destino.getItem("weekplate-pesos-v1"), "[]");
    assert.strictEqual(destino.getItem("otra-web"), "sigue");
    assert.strictEqual(destino.getItem("nutritionPlanner.cloudSyncedUserId.v1"), "uid-de-aqui");
  });

  t.test("si el navegador no deja guardar a mitad, todo vuelve a como estaba", function () {
    var s = sandbox();
    var destino = almacen({ "nutritionPlanner.settings.v1": "{\"age\":30}", "weekplate-pesos-v1": "[1]" }, 2);
    var n = s.copiaRestaurar(destino, { "nutritionPlanner.settings.v1": "{\"age\":99}", "weekplate-plan-v1": "{}" });
    assert.strictEqual(n, -1);
    assert.strictEqual(destino.getItem("nutritionPlanner.settings.v1"), "{\"age\":30}");
    assert.strictEqual(destino.getItem("weekplate-pesos-v1"), "[1]");
    assert.strictEqual(destino.getItem("weekplate-plan-v1"), null);
  });

  t.test("index.html trae los dos botones de cargar, el selector de fichero y el script antes de app.js", function () {
    var html = fs.readFileSync(projPath("index.html"), "utf8");
    ["footerImportBtn", "ajustesImportBtn", "copiaArchivo"].forEach(function (id) {
      assert.ok(html.indexOf('id="' + id + '"') !== -1, "falta " + id);
    });
    var copia = html.indexOf('<script src="js/core/data-backup.js');
    var app = html.indexOf('<script src="js/app.js');
    assert.ok(copia !== -1 && copia < app, "data-backup.js carga antes que app.js");
    var appJs = fs.readFileSync(projPath("js/app.js"), "utf8");
    assert.ok(appJs.indexOf("copiaCrear(") !== -1 && appJs.indexOf("copiaRestaurar(") !== -1, "app.js usa el módulo");
  });

  t.test("los textos de la copia existen en los cuatro idiomas", function () {
    var s = loadBrowserGlobals([
      projPath("js/core/i18n.js"), projPath("js/i18n/es.js"), projPath("js/i18n/en.js"),
      projPath("js/i18n/ru.js"), projPath("js/i18n/uk.js")
    ]);
    ["ui.cargar_copia", "ui.copia_confirmar", "ui.copia_confirmar_sin_fecha", "ui.copia_error",
      "ui.copia_error_grande", "ui.copia_error_guardar"].forEach(function (k) {
      ["es", "en", "ru", "uk"].forEach(function (lang) {
        assert.notStrictEqual(s.tOr(k, "FALTA", lang), "FALTA", lang + ": falta " + k);
      });
    });
    assert.ok(s.tOr("ui.copia_confirmar", "", "ru").indexOf("{fecha}") !== -1);
  });
}

module.exports = { run: run };
