/**
 * tests/exercises-nombres.test.js
 * ─────────────────────────────────────────────────────────────────────────
 * El nombre de cada ejercicio (js/data/exercises.js) existe en español, inglés,
 * ruso y ucraniano, y la tabla de entrenamiento y el .ics lo muestran en el
 * idioma elegido, cayendo al español si falta.
 * ─────────────────────────────────────────────────────────────────────────
 */

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var loadBrowserGlobals = require("./lib/load-browser-globals").loadBrowserGlobals;

function projPath(rel) { return path.join(__dirname, "..", rel); }

var CIRILICO = /[Ѐ-ӿ]/;

function catalogo() {
  return loadBrowserGlobals([projPath("js/data/exercises.js")]).EXERCISE_CATALOG;
}

function run(t) {

  t.test("cada uno de los 81 ejercicios tiene nombre en español, inglés, ruso y ucraniano", function () {
    var lista = catalogo();
    assert.strictEqual(lista.length, 81);
    lista.forEach(function (e) {
      ["name", "name_en", "name_ru", "name_uk"].forEach(function (campo) {
        assert.ok(typeof e[campo] === "string" && e[campo].trim().length > 0, e.id + " sin " + campo);
      });
    });
  });

  t.test("el ruso y el ucraniano van en cirílico; el inglés no lleva cirílico", function () {
    catalogo().forEach(function (e) {
      assert.ok(CIRILICO.test(e.name_ru), e.id + ": el ruso no tiene letras cirílicas");
      assert.ok(CIRILICO.test(e.name_uk), e.id + ": el ucraniano no tiene letras cirílicas");
      assert.ok(!CIRILICO.test(e.name_en), e.id + ": el inglés tiene letras cirílicas");
    });
  });

  t.test("ningún nombre traducido es una copia del español", function () {
    // Excepción explícita: "Dead bug" es el nombre estándar en español y en
    // inglés; no es una traducción olvidada. Ruso y ucraniano no admiten esta excepción.
    var iguales = { dead_bug: ["name_en"] };
    catalogo().forEach(function (e) {
      ["name_en", "name_ru", "name_uk"].forEach(function (campo) {
        if ((iguales[e.id] || []).indexOf(campo) !== -1) return;
        assert.notStrictEqual(e[campo], e.name, e.id + ": " + campo + " es igual al español");
      });
    });
  });

  t.test("entrenoNombre da el nombre del idioma de la pantalla y cae al español si falta", function () {
    var s = loadBrowserGlobals([projPath("js/data/exercises.js"), projPath("js/ui/render-entreno.js")]);
    var e = { id: "press_banca_barra", name: "Press de banca con barra" };
    var esperado = catalogo().filter(function (x) { return x.id === "press_banca_barra"; })[0];

    s.getLang = function () { return "ru"; };
    assert.strictEqual(s.entrenoNombre(e), esperado.name_ru);
    s.getLang = function () { return "uk"; };
    assert.strictEqual(s.entrenoNombre(e), esperado.name_uk);
    s.getLang = function () { return "en"; };
    assert.strictEqual(s.entrenoNombre(e), esperado.name_en);
    s.getLang = function () { return "es"; };
    assert.strictEqual(s.entrenoNombre(e), e.name);
    s.getLang = function () { return "de"; };
    assert.strictEqual(s.entrenoNombre(e), e.name, "sin traducción para el idioma, el español");
    s.getLang = function () { return "ru"; };
    assert.strictEqual(s.entrenoNombre({ id: "no_existe", name: "Nombre suelto" }), "Nombre suelto",
      "un ejercicio que no está en el catálogo muestra su propio nombre");
  });

  t.test("la tabla de entrenamiento y el .ics usan entrenoNombre, no e.name a secas", function () {
    var render = fs.readFileSync(projPath("js/ui/render-entreno.js"), "utf8");
    assert.ok(render.indexOf("entrenoEsc(entrenoNombre(e))") !== -1, "la celda del ejercicio usa entrenoNombre");
    assert.ok(render.indexOf("nombre: entrenoNombre(e)") !== -1, "la línea del .ics usa entrenoNombre");
    assert.strictEqual(render.indexOf("entrenoEsc(e.name)"), -1, "queda una celda con e.name a secas");
    assert.strictEqual(render.indexOf("nombre: e.name"), -1, "queda una línea del .ics con e.name a secas");
  });
}

module.exports = { run: run };
