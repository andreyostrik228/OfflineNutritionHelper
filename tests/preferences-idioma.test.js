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

  // ── «No me gusta» con un toque (2026-10-22) ───────────────────────────
  // El botón guarda el nombre TAL COMO SE LEE (traducido). Para que sirva,
  // ese nombre tiene que volver a tapar su ingrediente español: se comprueba
  // con TODOS los ingredientes de todos los platos, en los tres idiomas.

  t.test("el nombre traducido de cada ingrediente de los platos vuelve a tapar ese ingrediente (ru, en, uk)", function () {
    var s = loadBrowserGlobals([
      projPath("js/core/utils.js"), projPath("js/data/dishes.js"), projPath("js/core/i18n.js"),
      projPath("js/i18n/food-ru.js"), projPath("js/i18n/food-en.js"), projPath("js/i18n/food-uk.js"),
      projPath("js/data/dislike-groups.js"), projPath("js/core/preferences.js")
    ]);
    var nombres = {};
    s.DISH_DB.forEach(function (d) { (d.items || []).forEach(function (it) { nombres[it.name] = true; }); });
    var fallos = [];
    ["ru", "en", "uk"].forEach(function (lang) {
      Object.keys(nombres).forEach(function (n) {
        var leido = s.tFood(n, lang);
        if (!s.matchesDislike(n, [leido])) fallos.push(lang + ": " + n + " -> " + leido);
      });
    });
    assert.deepStrictEqual(fallos, [], fallos.length + " nombres traducidos que no tapan su ingrediente");
  });

  t.test("agregarNoMeGusta() lo escribe en el campo y en los ajustes, no repite, y quitarNoMeGusta() lo devuelve", function () {
    var s = loadBrowserGlobals([
      projPath("js/core/utils.js"), projPath("js/core/settings.js"),
      projPath("js/data/dislike-groups.js"), projPath("js/core/preferences.js")
    ]);
    var campo = { value: "cebolla" };
    s.document = { getElementById: function (id) { return id === "dislikes" ? campo : null; } };
    assert.strictEqual(s.agregarNoMeGusta("Arroz blanco cocido"), true);
    assert.strictEqual(campo.value, "cebolla, Arroz blanco cocido");
    assert.deepStrictEqual(JSON.parse(JSON.stringify(s.getSettings().dislikes)), ["cebolla", "Arroz blanco cocido"]);
    assert.strictEqual(s.agregarNoMeGusta("arroz blanco cocido"), false, "ya está (sin mayúsculas)");
    assert.strictEqual(s.agregarNoMeGusta("Crema de cebolla"), false, "«cebolla» ya lo tapa");
    assert.strictEqual(s.agregarNoMeGusta("Galletas, de avena"), true, "la coma separa términos: se quita");
    assert.ok(campo.value.indexOf("Galletas de avena") !== -1, campo.value);
    assert.strictEqual(s.quitarNoMeGusta("ARROZ BLANCO COCIDO"), true);
    assert.strictEqual(campo.value, "cebolla, Galletas de avena");
    assert.strictEqual(s.quitarNoMeGusta("no estaba"), false);
    assert.strictEqual(s.agregarNoMeGusta("   "), false);
  });

  // Con el presupuesto justo, pickDish() salta a la categoría ENTERA (fase
  // 2). Ahí se ignoraban los "no me gusta" y «No me gusta» volvía a traer el
  // producto recién quitado. cookTime 0 deja vacío el pool filtrado y obliga
  // a pasar por esa fase.
  t.test("pickDish() respeta los 'no me gusta' también cuando busca en toda la categoría", function () {
    var s = loadBrowserGlobals([
      "js/data/dishes.js", "js/data/dish-instructions.js", "js/data/dish-steps.js",
      "js/data/real-products.js", "js/data/packaging.js", "js/data/servings.js",
      "js/data/real-ingredient-matches.js", "js/data/ingredient-nutrition.js",
      "js/data/no-cook-classifier.js", "js/data/prices/mercadona.js", "js/data/budget-presets.js",
      "js/data/dislike-groups.js", "js/core/utils.js", "js/core/pricing.js", "js/core/servings.js",
      "js/core/nutrition.js", "js/core/budget.js", "js/core/calculator.js", "js/core/meal-helpers.js",
      "js/core/settings.js", "js/core/preferences.js", "js/engine/dish-selector.js"
    ].map(projPath));
    var campo = { value: "yogur" };
    s.document = { getElementById: function (id) { return id === "dislikes" ? campo : null; } };
    var data = { cookTime: 0, taste: "mixed", store: "mercadona" };
    assert.strictEqual(s.filterDishesByTimeTaste("desayuno", 0, "mixed", s.resolveTier(0), false).length, 0,
      "el pool filtrado tiene que quedar vacío para que el test pase por la fase 2");
    var target = { kcal: 500, protein: 30, carbs: 60, fat: 15 };
    var conYogur = [];
    for (var i = 0; i < 40; i++) {
      var pick = s.pickDish("desayuno", data, { usedNames: [], usedProts: [], usedTastes: [] }, 0, 100, target, "mercadona", 5, {}, null);
      assert.ok(pick.dish, "tiene que elegir algo");
      if (pick.dish.items.some(function (it) { return /yogur/i.test(it.name); })) conYogur.push(pick.dish.name);
    }
    assert.deepStrictEqual(conYogur, []);
  });
}

module.exports = { run: run };
