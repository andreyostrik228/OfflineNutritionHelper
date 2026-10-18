/**
 * tests/preferences-idioma.test.js
 * ─────────────────────────────────────────────────────────────────────────
 * Un "no me gusta" escrito en el idioma de la pantalla (ruso, inglés,
 * ucraniano) tiene que tapar lo mismo que escrito en español. El filtro
 * compara contra nombres españoles del catálogo; aquí se comprueba la
 * traducción de los términos del usuario hacia esos nombres.
 * ─────────────────────────────────────────────────────────────────────────
 */

var assert = require("assert");
var path = require("path");
var loadBrowserGlobals = require("./lib/load-browser-globals").loadBrowserGlobals;

function projPath(rel) { return path.join(__dirname, "..", rel); }

function sandboxIdiomas() {
  return loadBrowserGlobals([
    projPath("js/core/utils.js"),
    projPath("js/core/i18n.js"),
    projPath("js/i18n/food-ru.js"),
    projPath("js/i18n/food-en.js"),
    projPath("js/i18n/food-uk.js"),
    projPath("js/data/dislike-groups.js"),
    projPath("js/core/preferences.js")
  ]);
}

function run(t) {

  t.test("un 'no me gusta' en ruso tapa el pollo igual que en español", function () {
    var s = sandboxIdiomas();
    assert.strictEqual(s.matchesDislike("Pechuga de pollo", ["pollo"]), true, "control en español");
    assert.strictEqual(s.matchesDislike("Pechuga de pollo", ["курица"]), true, "'курица' tiene que tapar el pollo");
    assert.strictEqual(s.matchesDislike("Pollo al curry con arroz basmati", ["курица"]), true);
  });

  t.test("'лук' tapa la cebolla, y 'яйца' tapa el huevo", function () {
    var s = sandboxIdiomas();
    assert.strictEqual(s.matchesDislike("Cebolla", ["лук"]), true);
    assert.strictEqual(s.matchesDislike("Huevo cocido", ["яйца"]), true);
  });

  t.test("en inglés también: 'onion' tapa la cebolla", function () {
    var s = sandboxIdiomas();
    assert.strictEqual(s.matchesDislike("Cebolla", ["onion"]), true);
  });

  t.test("un término en otro idioma no tapa lo que no tiene nada que ver", function () {
    var s = sandboxIdiomas();
    assert.strictEqual(s.matchesDislike("Arroz blanco cocido", ["курица"]), false);
    assert.strictEqual(s.matchesDislike("Pechuga de pollo", ["рыба"]), false);
  });

  t.test("los términos de menos de 3 letras no se traducen (demasiados falsos positivos)", function () {
    var s = sandboxIdiomas();
    assert.strictEqual(s.traducirTerminosDislike(["ку"]).length, 0);
  });

  t.test("traducirTerminosDislike() devuelve el nombre español y no repite nada", function () {
    var s = sandboxIdiomas();
    var salida = s.traducirTerminosDislike(["курица", "курица"]);
    assert.ok(salida.indexOf("pollo") !== -1, "tiene que incluir 'pollo': " + salida.slice(0, 5).join(", "));
    assert.strictEqual(new Set(salida).size, salida.length, "sin repetidos");
  });

  t.test("sin lista de preferencias no hay nada que traducir", function () {
    var s = sandboxIdiomas();
    assert.strictEqual(s.traducirTerminosDislike([]).length, 0);
    assert.strictEqual(s.matchesDislike("Pechuga de pollo", []), false);
  });
}

module.exports = { run: run };
