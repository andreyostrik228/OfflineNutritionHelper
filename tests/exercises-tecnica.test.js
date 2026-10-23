/**
 * tests/exercises-tecnica.test.js
 * ─────────────────────────────────────────────────────────────────────────
 * La técnica de cada ejercicio (js/data/exercises.js) existe en español, inglés,
 * ruso y ucraniano, y la pantalla de entrenamiento la muestra en el idioma
 * elegido, cayendo al español si falta.
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

  t.test("hay 81 ejercicios con id único", function () {
    var lista = catalogo();
    assert.strictEqual(lista.length, 81);
    var ids = lista.map(function (e) { return e.id; });
    assert.strictEqual(new Set(ids).size, 81, "ids repetidos");
  });

  t.test("cada uno de los 81 tiene técnica en español, inglés, ruso y ucraniano", function () {
    catalogo().forEach(function (e) {
      ["tecnica", "tecnica_en", "tecnica_ru", "tecnica_uk"].forEach(function (campo) {
        assert.ok(typeof e[campo] === "string" && e[campo].trim().length > 0, e.id + " sin " + campo);
      });
    });
  });

  t.test("el ruso y el ucraniano van en cirílico; el inglés no lleva cirílico", function () {
    catalogo().forEach(function (e) {
      assert.ok(CIRILICO.test(e.tecnica_ru), e.id + ": el ruso no tiene letras cirílicas");
      assert.ok(CIRILICO.test(e.tecnica_uk), e.id + ": el ucraniano no tiene letras cirílicas");
      assert.ok(!CIRILICO.test(e.tecnica_en), e.id + ": el inglés tiene letras cirílicas");
    });
  });

  t.test("ninguna traducción es una copia del español", function () {
    catalogo().forEach(function (e) {
      ["tecnica_en", "tecnica_ru", "tecnica_uk"].forEach(function (campo) {
        assert.notStrictEqual(e[campo], e.tecnica, e.id + ": " + campo + " es igual al español");
      });
    });
  });

  t.test("la técnica en ruso trata de «вы», como el resto de la interfaz", function () {
    // Los imperativos de «ты» que tuvo hasta el 2026-10-23, y cualquier reflexivo en -йся / -ись («опускайся», «держись»).
    var TY = ["опускай", "выжимай", "отрегулируй", "почувствуешь", "наклонись", "поджимай", "разводи", "прогибай", "поднимай",
      "тяни", "выбери", "приседай", "отрывай", "отводи", "толкай", "сожми", "встань", "раскачивай", "поворачивай", "разгибай",
      "напряги", "дыши", "сворачивай", "вставай", "веди", "возвращай", "держи", "сгибай", "наклони", "подними", "подтяни",
      "сведи", "запрыгни", "начинай", "контролируй", "упри", "разведи", "выталкивай", "стой", "сядь", "вытяни", "сделай",
      "опусти", "можешь", "контролируешь"];
    catalogo().forEach(function (e) {
      var palabras = e.tecnica_ru.toLowerCase().split(/[^а-яё]+/);
      palabras.forEach(function (p) {
        assert.ok(TY.indexOf(p) === -1 && !/(йся|ись)$/.test(p), e.id + ": «" + p + "» es de «ты»: " + e.tecnica_ru);
      });
    });
  });

  t.test("entrenoTecnica da el texto del idioma de la pantalla y cae al español si falta", function () {
    var s = loadBrowserGlobals([projPath("js/data/exercises.js"), projPath("js/ui/render-entreno.js")]);
    var e = { id: "flexiones", tecnica: "Cuerpo recto de cabeza a talones; baja con los codos a unos 45 grados del tronco." };
    var esperado = catalogo().filter(function (x) { return x.id === "flexiones"; })[0];

    s.getLang = function () { return "ru"; };
    assert.strictEqual(s.entrenoTecnica(e), esperado.tecnica_ru);
    s.getLang = function () { return "uk"; };
    assert.strictEqual(s.entrenoTecnica(e), esperado.tecnica_uk);
    s.getLang = function () { return "en"; };
    assert.strictEqual(s.entrenoTecnica(e), esperado.tecnica_en);
    s.getLang = function () { return "es"; };
    assert.strictEqual(s.entrenoTecnica(e), e.tecnica);
    s.getLang = function () { return "de"; };
    assert.strictEqual(s.entrenoTecnica(e), e.tecnica, "sin traducción para el idioma, la española");
    s.getLang = function () { return "ru"; };
    assert.strictEqual(s.entrenoTecnica({ id: "no_existe", tecnica: "Texto suelto" }), "Texto suelto",
      "un ejercicio que no está en el catálogo muestra su propio texto");
  });

  t.test("la tabla de entrenamiento pinta la técnica con entrenoTecnica", function () {
    var render = fs.readFileSync(projPath("js/ui/render-entreno.js"), "utf8");
    assert.ok(render.indexOf("entrenoEsc(entrenoTecnica(e))") !== -1,
      "la celda de técnica tiene que usar entrenoTecnica, no e.tecnica a secas");
  });

  t.test("la sesión generada conserva el id, que es lo que busca entrenoTecnica", function () {
    var gen = fs.readFileSync(projPath("js/engine/workout-generator.js"), "utf8");
    assert.ok(gen.indexOf("id: ejercicio.id,") !== -1);
  });
}

module.exports = { run: run };
