/**
 * tests/budget-mode.test.js
 * ─────────────────────────────────────────────────────────────────────────
 * Regression tests para el selector de presupuesto (presets Ajustado/
 * Equilibrado/Amplio + cantidad exacta, js/data/budget-presets.js +
 * js/core/calculator.js: validateInput/resolveBudget).
 *
 * Carga el código de producción real (vm, ver tests/lib/load-browser-
 * globals.js) — nunca copiado ni reescrito para el test.
 * ─────────────────────────────────────────────────────────────────────────
 */

var assert = require("assert");
var path = require("path");
var loadBrowserGlobals = require("./lib/load-browser-globals").loadBrowserGlobals;

function projPath(rel) {
  return path.join(__dirname, "..", rel);
}

function freshCalculatorSandbox() {
  return loadBrowserGlobals([
    projPath("js/data/budget-presets.js"),
    projPath("js/core/utils.js"),
    projPath("js/core/calculator.js")
  ]);
}

function freshFullEngineSandbox() {
  return loadBrowserGlobals([
    projPath("js/data/dishes.js"),
    projPath("js/data/real-products.js"),
    projPath("js/data/packaging.js"),
    projPath("js/data/real-ingredient-matches.js"),
    projPath("js/data/no-cook-classifier.js"),
    projPath("js/data/prices/mercadona.js"),
    projPath("js/data/budget-presets.js"),
    projPath("js/core/utils.js"),
    projPath("js/core/pricing.js"),
    projPath("js/core/budget.js"),
    projPath("js/core/calculator.js"),
    projPath("js/core/meal-helpers.js"),
    projPath("js/engine/dish-selector.js"),
    projPath("js/engine/plan-generator.js")
  ]);
}

function run(t) {
  // ── 1. Sin presupuesto elegido -> no se puede generar plan ─────────────
  t.test("sin budgetMode (ni preset ni exacto) -> validateInput rechaza con mensaje claro", function () {
    var s = freshCalculatorSandbox();
    var data = {
      age: 27, weight: 78, height: 178, workouts: 4,
      budgetMode: null, budgetCustom: NaN
    };
    var error = s.validateInput(data);
    assert.notStrictEqual(error, "");
    assert.ok(/presupuesto/i.test(error), "el mensaje debe mencionar el presupuesto: " + error);
  });

  // ── 2. Escenario clásico: cantidad exacta sigue funcionando ─────────────
  t.test("budgetMode='custom' con cantidad válida -> validateInput pasa y resolveBudget devuelve esa cantidad exacta", function () {
    var s = freshCalculatorSandbox();
    var data = {
      age: 27, weight: 78, height: 178, workouts: 4,
      budgetMode: "custom", budgetCustom: 9.5
    };
    assert.strictEqual(s.validateInput(data), "");
    assert.strictEqual(s.resolveBudget(data), 9.5);
  });

  // ── 3. Cantidad exacta demasiado baja -> mismo error de siempre ─────────
  t.test("budgetMode='custom' con cantidad < 2 -> mismo mensaje de error que antes de los presets", function () {
    var s = freshCalculatorSandbox();
    var data = {
      age: 27, weight: 78, height: 178, workouts: 4,
      budgetMode: "custom", budgetCustom: 1
    };
    var error = s.validateInput(data);
    assert.strictEqual(error, "El presupuesto diario es demasiado bajo para generar un plan realista.");
  });

  // ── 4. Preset "small" ────────────────────────────────────────────────────
  t.test("budgetMode='small' -> válido sin cantidad exacta, resolveBudget da el importe del preset (15)", function () {
    var s = freshCalculatorSandbox();
    var data = { age: 27, weight: 78, height: 178, workouts: 4, budgetMode: "small", budgetCustom: NaN };
    assert.strictEqual(s.validateInput(data), "");
    assert.strictEqual(s.resolveBudget(data), 15);
  });

  // ── 5. Preset "medium" ───────────────────────────────────────────────────
  t.test("budgetMode='medium' -> resolveBudget da el importe del preset (20)", function () {
    var s = freshCalculatorSandbox();
    var data = { age: 27, weight: 78, height: 178, workouts: 4, budgetMode: "medium", budgetCustom: NaN };
    assert.strictEqual(s.validateInput(data), "");
    assert.strictEqual(s.resolveBudget(data), 20);
  });

  // ── 6. Preset "high" ─────────────────────────────────────────────────────
  t.test("budgetMode='high' -> resolveBudget da el importe del preset (28)", function () {
    var s = freshCalculatorSandbox();
    var data = { age: 27, weight: 78, height: 178, workouts: 4, budgetMode: "high", budgetCustom: NaN };
    assert.strictEqual(s.validateInput(data), "");
    assert.strictEqual(s.resolveBudget(data), 28);
  });

  // ── 7. Preset y cantidad exacta nunca se mezclan ────────────────────────
  t.test("con budgetMode='small', un budgetCustom presente (residual de UI) se IGNORA -- nunca se combinan preset y exacto", function () {
    var s = freshCalculatorSandbox();
    var data = { age: 27, weight: 78, height: 178, workouts: 4, budgetMode: "small", budgetCustom: 99 };
    assert.strictEqual(s.resolveBudget(data), 15, "el preset manda; 99 (residual) nunca debe usarse");
  });

  // ── 8. Modo desconocido -> no se inventa un presupuesto ─────────────────
  t.test("budgetMode con un valor no reconocido -> validateInput lo rechaza, resolveBudget no inventa nada", function () {
    var s = freshCalculatorSandbox();
    var data = { age: 27, weight: 78, height: 178, workouts: 4, budgetMode: "ultra", budgetCustom: NaN };
    var error = s.validateInput(data);
    assert.notStrictEqual(error, "");
    assert.strictEqual(s.resolveBudget(data), null);
  });

  // ── 9-12. Integración real: los 4 caminos generan un plan válido ────────
  ["custom", "small", "medium", "high"].forEach(function (mode) {
    t.test("integración: generateDietPlan funciona con budgetMode='" + mode + "' (nunca 'unavailable', respeta el tope)", function () {
      var s = freshFullEngineSandbox();
      var rawData = {
        age: 27, weight: 78, height: 178, workouts: 4,
        budgetMode: mode, budgetCustom: mode === "custom" ? 9.5 : NaN
      };
      assert.strictEqual(s.validateInput(rawData), "");
      var budget = s.resolveBudget(rawData);
      assert.ok(typeof budget === "number" && budget > 0);

      var profile = { calories: 2400, protein: 150, carbs: 260, fats: 75 };
      var data = { budget: budget, cookTime: 30, taste: "mixed", store: "mercadona" };
      var result = s.generateDietPlan(profile, data);

      assert.notStrictEqual(result.report.status, "unavailable");
      // El presupuesto es de COMPRA (purchaseCost), no de uso -- ver
      // js/engine/plan-generator.js. Tolerancia algo mayor que el +0.01
      // interno porque enforcePurchaseBudgetCap converge por recortes
      // discretos (75%/eliminar), no aritmética exacta.
      var overBudget = result.total.purchaseCost > budget + 0.05;
      var reportsIt = result.report.violations.some(function (v) {
        return v.type === "budget" || v.type === "budget_infeasible";
      });
      assert.ok(
        !overBudget || reportsIt,
        mode + ": coste de compra " + result.total.purchaseCost + " supera el presupuesto " + budget + " sin que el informe lo declare"
      );
    });
  });

  // ── 13. La corrección de purchaseCost sigue intacta con presets activos ─
  t.test("elegir un preset de presupuesto no interfiere con el cálculo de purchaseCost por paquete (miel 23g -> 1 bote)", function () {
    var s = freshFullEngineSandbox();
    var purchase = s.resolvePurchaseCost("Miel", 23, "mercadona");
    assert.strictEqual(purchase.hasFixedPackage, true);
    assert.strictEqual(purchase.packagesToBuy, 1);
    assert.strictEqual(purchase.packageSizeG, 350);
    assert.notStrictEqual(purchase.purchaseCost, purchase.usageCost);
  });
}

module.exports = { run: run };
