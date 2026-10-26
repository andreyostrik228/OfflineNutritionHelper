/**
 * tests/kcal-propias.test.js
 * ─────────────────────────────────────────────────────────────────────────
 * «Mis calorías al día» (2026-10-26). Pedido del dueño: «мне нужен план на
 * 4000 калорий, а выдаёт максимум 2500-2800». El plan seguía bien su
 * objetivo; el objetivo lo ponía la fórmula y no había forma de cambiarlo.
 * Ahora un número propio manda (calculator.js), se guarda (settings.js), el
 * motor de platos llega a él y el «sin cocinar» deja raciones más grandes
 * cuando el día es grande (noCookFactorRaciones).
 * ─────────────────────────────────────────────────────────────────────────
 */

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var loadBrowserGlobals = require("./lib/load-browser-globals").loadBrowserGlobals;

function projPath(rel) { return path.join(__dirname, "..", rel); }

var CHICO = { age: 22, sex: "male", weight: 70, height: 178, steps: 6000, activity: 1.375, workouts: 4, goal: "bulk", budgetMode: "high" };

function calculadora() {
  return loadBrowserGlobals([projPath("js/core/utils.js"), projPath("js/data/budget-presets.js"), projPath("js/core/calculator.js")]);
}

function run(t) {
  t.test("sin número propio manda la fórmula, y se dice lo que da", function () {
    var s = calculadora();
    var p = s.calculateProfile(Object.assign({}, CHICO, { kcalPropias: null }));
    assert.strictEqual(p.kcalPropias, false);
    assert.strictEqual(p.calories, p.kcalCalculadas);
    assert.ok(p.calories > 2600 && p.calories < 2900, "un chico de 70 kg que gana músculo: " + p.calories);
  });

  t.test("con 4000 el objetivo es 4000: la proteína, del peso; la grasa crece con las calorías; los carbohidratos llenan", function () {
    var s = calculadora();
    var formula = s.calculateProfile(CHICO);
    var p = s.calculateProfile(Object.assign({}, CHICO, { kcalPropias: 4000 }));
    assert.strictEqual(p.kcalPropias, true);
    assert.ok(Math.abs(p.calories - 4000) <= 1, "objetivo " + p.calories);
    assert.strictEqual(p.kcalCalculadas, formula.calories, "la fórmula sigue a la vista");
    assert.strictEqual(p.protein, formula.protein, "más calorías no piden más proteína");
    assert.ok(Math.abs(p.fats - formula.fats * 4000 / formula.calories) < 0.2, "la grasa, en la misma proporción: " + p.fats);
    assert.ok(p.carbs * 4 / p.calories < 0.7, "y los carbohidratos no se llevan todo: " + p.carbs + " g");
  });

  t.test("un número muy bajo para el peso baja antes la grasa y la proteína que pasarse", function () {
    var s = calculadora();
    var grande = { age: 40, sex: "male", weight: 120, height: 185, steps: 4000, activity: 1.2, workouts: 0, goal: "cut", budgetMode: "high" };
    var p = s.calculateProfile(Object.assign({}, grande, { kcalPropias: 1800 }));
    assert.ok(p.fats >= 120 * 0.6 - 0.05, "grasa, como poco 0,6 g/kg: " + p.fats);
    assert.ok(p.protein >= 120 * 1.6 - 0.05, "proteína, como poco 1,6 g/kg: " + p.protein);
    assert.ok(p.carbs >= 80, "y el suelo de carbohidratos");
    assert.ok(p.calories <= 1800 + 1 || p.carbs === 80, "no se pasa salvo por los suelos: " + p.calories);
  });

  t.test("el campo admite de 1200 a 6000; vacío es válido y lo que no es número, no", function () {
    var s = calculadora();
    function error(k) { return s.validateInput(Object.assign({}, CHICO, { kcalPropias: k })); }
    assert.strictEqual(error(null), "");
    assert.strictEqual(error(4000), "");
    assert.strictEqual(error(1200), "");
    assert.strictEqual(error(6000), "");
    [1199, 6001, NaN, -5].forEach(function (k) { assert.ok(error(k) !== "", String(k)); });
    var html = fs.readFileSync(projPath("index.html"), "utf8");
    assert.ok(/<input id="kcalPropias" type="number" min="1200" max="6000"/.test(html), "el campo, con los mismos límites");
    assert.strictEqual(s.KCAL_PROPIAS_MIN, 1200);
    assert.strictEqual(s.KCAL_PROPIAS_MAX, 6000);
  });

  t.test("se guarda con los ajustes, y vaciarlo lo borra", function () {
    var s = loadBrowserGlobals([projPath("js/core/settings.js")]);
    assert.strictEqual(s.sanitizeSettings({ kcalPropias: 4000 }).kcalPropias, 4000);
    assert.ok(!("kcalPropias" in s.sanitizeSettings({ kcalPropias: null })), "null no se guarda: vuelve la fórmula");
  });

  t.test("el plan con platos llega a un 4000 propio (no se queda en el 2700 de la fórmula)", function () {
    var s = loadBrowserGlobals([
      "js/data/dishes.js", "js/data/real-products.js", "js/data/packaging.js", "js/data/servings.js",
      "js/data/real-ingredient-matches.js", "js/data/ingredient-nutrition.js", "js/data/no-cook-classifier.js",
      "js/data/prices/mercadona.js", "js/data/budget-presets.js", "js/core/utils.js", "js/core/pricing.js",
      "js/core/servings.js", "js/core/nutrition.js", "js/core/budget.js", "js/core/calculator.js",
      "js/core/meal-helpers.js", "js/engine/dish-selector.js", "js/engine/plan-generator.js"
    ].map(projPath));
    var profile = s.calculateProfile(Object.assign({}, CHICO, { kcalPropias: 4000 }));
    var budget = s.resolveBudget({ budgetMode: "high" });
    var suma = 0;
    // Medido el 2026-10-26, 80 planes: media 95%, el 10% más bajo en el 90% y
    // algún día suelto en el 74%. La media de 8 por encima del 85% no falla.
    var N = 8;
    for (var i = 0; i < N; i++) {
      suma += s.generateDietPlan(profile, { budget: budget, cookTime: 60, taste: "mixed", store: "mercadona" }).total.kcal;
    }
    assert.ok(suma / N >= 4000 * 0.85, "media " + Math.round(suma / N) + " kcal");
  });

  t.test("sin cocinar: con un día grande las raciones de cada componente pueden crecer", function () {
    var s = loadBrowserGlobals([projPath("js/data/serving-sizes.js"), projPath("js/engine/no-cook-generator.js")]);
    assert.strictEqual(s.noCookFactorRaciones(2000), 1, "un día normal no cambia");
    assert.strictEqual(s.noCookFactorRaciones(s.NO_COOK_REF_KCAL), 1);
    assert.ok(Math.abs(s.noCookFactorRaciones(s.NO_COOK_REF_KCAL * 1.6) - 1.6) < 1e-9);
    // Un componente de 100 kcal por ración con tope 2: sin factor se queda en 2,
    // con factor 2 sube hasta 4 para acercarse a 400 kcal.
    var producto = { kcal: 100, protein: 10, carbs: 10, fat: 2, size: 1000, sizeUnit: "g" };
    function picks() {
      return [{ entry: { product: producto, serving: { servingG: 100, servingsPerPackage: 10 } }, comp: { role: "protein", required: true, maxServings: 2 }, servings: 1, fixed: false }];
    }
    var sin = picks();
    s.scaleToTarget(sin, 400, 0);
    var con = picks();
    s.scaleToTarget(con, 400, 0, 2);
    assert.strictEqual(sin[0].servings, 2);
    assert.strictEqual(con[0].servings, 4);
  });
}

module.exports = { run: run };
