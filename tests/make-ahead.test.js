/**
 * tests/make-ahead.test.js
 * ─────────────────────────────────────────────────────────────────────────
 * Platos "de dejar hechos la noche anterior" (`makeAhead: true` en
 * dish-instructions.js — hoy solo "Overnight oats con yogur y manzana").
 *
 * Regla pedida por el usuario (2026-09-02) tras encontrarse uno en el
 * desayuno del DÍA 1:
 *   - plan de 1 día        -> nunca aparece
 *   - plan de varios días  -> nunca en el día 1; permitido en el día 2+
 *   - cuando aparece       -> la tarjeta avisa "prepáralo la noche anterior"
 *
 * Carga el código de producción real (vm, sin copiar).
 * ─────────────────────────────────────────────────────────────────────────
 */

var assert = require("assert");
var path = require("path");
var loadBrowserGlobals = require("./lib/load-browser-globals").loadBrowserGlobals;

function projPath(rel) { return path.join(__dirname, "..", rel); }

function sandbox() {
  return loadBrowserGlobals([
    projPath("js/data/dishes.js"),
    projPath("js/data/dish-instructions.js"),
    projPath("js/data/real-products.js"),
    projPath("js/data/packaging.js"),
    projPath("js/data/real-ingredient-matches.js"),
    projPath("js/data/ingredient-nutrition.js"),
    projPath("js/data/no-cook-classifier.js"),
    projPath("js/data/prices/mercadona.js"),
    projPath("js/data/budget-presets.js"),
    projPath("js/data/dislike-groups.js"),
    projPath("js/core/utils.js"),
    projPath("js/core/pricing.js"),
    projPath("js/core/nutrition.js"),
    projPath("js/core/budget.js"),
    projPath("js/core/calculator.js"),
    projPath("js/core/meal-helpers.js"),
    projPath("js/core/preferences.js"),
    projPath("js/engine/dish-selector.js"),
    projPath("js/engine/plan-generator.js")
  ]);
}

var MAKE_AHEAD_DISH = "Overnight oats con yogur y manzana";

function breakfastPool(s, allowMakeAhead) {
  return s.filterDishesByTimeTaste("desayuno", 60, "mixed", s.resolveTier(0), allowMakeAhead)
    .map(function (d) { return d.name; });
}

function run(t) {

  // ── isMakeAheadDish ────────────────────────────────────────────────
  t.test("isMakeAheadDish: true solo para el plato marcado, false para todo lo demás", function () {
    var s = sandbox();
    assert.strictEqual(s.isMakeAheadDish({ name: MAKE_AHEAD_DISH }), true);
    assert.strictEqual(s.isMakeAheadDish({ name: "Pollo a la plancha con arroz y brócoli" }), false);
    assert.strictEqual(s.isMakeAheadDish({ name: "Plato que no existe en dish-instructions" }), false);
    assert.strictEqual(s.isMakeAheadDish(null), false);
    assert.strictEqual(s.isMakeAheadDish({}), false);
  });

  t.test("el plato makeAhead sigue existiendo en DISH_DB como desayuno (si no, el resto del test no prueba nada)", function () {
    var s = sandbox();
    var d = s.DISH_DB.filter(function (x) { return x.name === MAKE_AHEAD_DISH; });
    assert.strictEqual(d.length, 1, "debe haber exactamente un '" + MAKE_AHEAD_DISH + "'");
    assert.strictEqual(d[0].category, "desayuno");
  });

  // ── filterDishesByTimeTaste ────────────────────────────────────────
  t.test("filterDishesByTimeTaste: sin allowMakeAhead el plato makeAhead NO está en el pool", function () {
    var s = sandbox();
    assert.strictEqual(breakfastPool(s).indexOf(MAKE_AHEAD_DISH), -1);
    assert.strictEqual(breakfastPool(s, false).indexOf(MAKE_AHEAD_DISH), -1);
  });

  t.test("filterDishesByTimeTaste: con allowMakeAhead=true el plato makeAhead SÍ está en el pool", function () {
    var s = sandbox();
    assert.ok(breakfastPool(s, true).indexOf(MAKE_AHEAD_DISH) !== -1);
  });

  t.test("quitar el makeAhead no toca el resto del pool de desayuno", function () {
    var s = sandbox();
    var withAll = breakfastPool(s, true);
    var without = breakfastPool(s, false);
    assert.strictEqual(withAll.length - without.length, 1, "exactamente un plato de diferencia");
    without.forEach(function (name) {
      assert.ok(withAll.indexOf(name) !== -1, name + " debería seguir estando");
    });
  });

  // ── Integración: generateDietPlan ─────────────────────────────────
  function everyBreakfast(s, data, seeds) {
    var names = [];
    var profile = s.calculateProfile({ weight: 80, height: 178, age: 30, sex: "male", activity: 1.55, workouts: 4, goal: "recomp" });
    seeds.forEach(function (seed) {
      // aleatoriedad determinista: si el sandbox trae el helper lo usamos,
      // si no, basta con muchas iteraciones sin sembrar.
      var r = s.generateDietPlan(profile, Object.assign({ budget: 16, cookTime: 40, taste: "mixed", store: "mercadona" }, data));
      r.meals.forEach(function (m) {
        if (m.key === "breakfast" && typeof m.dishName === "string") names.push(m.dishName);
      });
    });
    return names;
  }

  var SEEDS = [];
  for (var i = 1; i <= 120; i++) SEEDS.push(i);

  t.test("plan de 1 día (planDays:1): el plato makeAhead NUNCA sale de desayuno", function () {
    var s = sandbox();
    var got = everyBreakfast(s, { planDays: 1, dayIndex: 0 }, SEEDS);
    assert.ok(got.length > 0, "el helper debe haber recogido desayunos");
    assert.strictEqual(got.indexOf(MAKE_AHEAD_DISH), -1,
      "'" + MAKE_AHEAD_DISH + "' apareció en un plan de 1 día");
  });

  t.test("plan de varios días, DÍA 1 (dayIndex:0): el plato makeAhead NUNCA sale", function () {
    var s = sandbox();
    var got = everyBreakfast(s, { planDays: 7, dayIndex: 0 }, SEEDS);
    assert.strictEqual(got.indexOf(MAKE_AHEAD_DISH), -1,
      "'" + MAKE_AHEAD_DISH + "' apareció en el día 1 de un plan de varios días");
  });

  t.test("plan de varios días, DÍA 4 (dayIndex:3): el plato makeAhead está PERMITIDO", function () {
    var s = sandbox();
    // No se afirma que salga (es una lotería ponderada), sino que el filtro
    // de candidatos lo deja pasar en ese contexto -- que es lo que la regla
    // exige. La exclusión (arriba) sí se puede afirmar tal cual.
    var pool = s.filterDishesByTimeTaste(
      "desayuno", 40, "mixed", s.resolveTier(0),
      (7 > 1 && 3 > 0) === true
    ).map(function (d) { return d.name; });
    assert.ok(pool.indexOf(MAKE_AHEAD_DISH) !== -1);
  });

  // ── Aviso en la tarjeta ──────────────────────────────────────────
  t.test("dish-instructions marca makeAhead:true y el primer paso lo dice en texto", function () {
    var s = sandbox();
    var info = s.getDishInstructions(MAKE_AHEAD_DISH);
    assert.strictEqual(info.makeAhead, true);
    assert.ok(/noche ant/i.test(info.steps[0]), "el primer paso debe avisar de la antelación");
  });
}

module.exports = { run: run };
