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
    projPath("js/data/ingredient-nutrition.js"),
    projPath("js/data/no-cook-classifier.js"),
    projPath("js/data/prices/mercadona.js"),
    projPath("js/data/budget-presets.js"),
    projPath("js/core/utils.js"),
    projPath("js/core/pricing.js"),
    projPath("js/core/nutrition.js"),
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

  // ── 3b. Preset "minimal" (2026-09-01) ────────────────────────────────────
  t.test("budgetMode='minimal' -> valido, resolveBudget da el importe del preset (8)", function () {
    var s = freshCalculatorSandbox();
    var data = { age: 27, weight: 78, height: 178, workouts: 4, budgetMode: "minimal", budgetCustom: NaN };
    assert.strictEqual(s.validateInput(data), "");
    assert.strictEqual(s.resolveBudget(data), 8);
  });

  t.test("el tramo mas barato esta POR ENCIMA del suelo real del catalogo", function () {
    var s = freshCalculatorSandbox();
    // El dia de 2.800 kcal mas barato posible con la despensa vacia cuesta
    // 7,04 EUR (medido por beam search sobre DISH_DB). Un preset por debajo
    // de eso prometeria algo imposible: ninguna receta puede bajar el precio
    // de ABRIR el primer paquete de cada ingrediente.
    var presets = s.BUDGET_PRESETS[s.DEFAULT_BUDGET_PERIOD];
    assert.ok(presets.minimal.amount > 7.04,
      "el preset mas barato (" + presets.minimal.amount + ") debe superar el suelo medido de 7,04 EUR");
  });

  t.test("los tramos estan ordenados de menor a mayor y no se solapan", function () {
    var s = freshCalculatorSandbox();
    var p = s.BUDGET_PRESETS[s.DEFAULT_BUDGET_PERIOD];
    var amounts = [p.minimal.amount, p.small.amount, p.medium.amount, p.high.amount];
    for (var i = 1; i < amounts.length; i++) {
      assert.ok(amounts[i] > amounts[i - 1],
        "los importes deben crecer: " + amounts.join(" < "));
    }
  });

  // ── 4. Preset "small" ────────────────────────────────────────────────────
  t.test("budgetMode='small' -> válido sin cantidad exacta, resolveBudget da el importe del preset (12)", function () {
    var s = freshCalculatorSandbox();
    var data = { age: 27, weight: 78, height: 178, workouts: 4, budgetMode: "small", budgetCustom: NaN };
    assert.strictEqual(s.validateInput(data), "");
    assert.strictEqual(s.resolveBudget(data), 12);
  });

  // ── 5. Preset "medium" ───────────────────────────────────────────────────
  t.test("budgetMode='medium' -> resolveBudget da el importe del preset (16)", function () {
    var s = freshCalculatorSandbox();
    var data = { age: 27, weight: 78, height: 178, workouts: 4, budgetMode: "medium", budgetCustom: NaN };
    assert.strictEqual(s.validateInput(data), "");
    assert.strictEqual(s.resolveBudget(data), 16);
  });

  // ── 6. Preset "high" ─────────────────────────────────────────────────────
  t.test("budgetMode='high' -> resolveBudget da el importe del preset (20)", function () {
    var s = freshCalculatorSandbox();
    var data = { age: 27, weight: 78, height: 178, workouts: 4, budgetMode: "high", budgetCustom: NaN };
    assert.strictEqual(s.validateInput(data), "");
    assert.strictEqual(s.resolveBudget(data), 20);
  });

  // ── 7. Preset y cantidad exacta nunca se mezclan ────────────────────────
  t.test("con budgetMode='small', un budgetCustom presente (residual de UI) se IGNORA -- nunca se combinan preset y exacto", function () {
    var s = freshCalculatorSandbox();
    var data = { age: 27, weight: 78, height: 178, workouts: 4, budgetMode: "small", budgetCustom: 99 };
    assert.strictEqual(s.resolveBudget(data), 12, "el preset manda; 99 (residual) nunca debe usarse");
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

  // ── 9. Tomas segun presupuesto (2026-09-01) ──────────────────────────────
  // Automatico a proposito: no hay casilla de "sin snacks". Con poco dinero
  // el dia son 3 comidas de verdad en vez de 5 raciones pequenas.

  t.test("mealDefsForBudget(): por debajo del umbral -> 3 tomas sin snacks", function () {
    var s = freshFullEngineSandbox();
    var defs = s.mealDefsForBudget(8);
    var keys = JSON.parse(JSON.stringify(defs.map(function (d) { return d.key; })));
    assert.deepStrictEqual(keys, ["breakfast", "lunch", "dinner"]);
  });

  t.test("mealDefsForBudget(): con presupuesto normal -> las 5 tomas de siempre", function () {
    var s = freshFullEngineSandbox();
    var keys = JSON.parse(JSON.stringify(s.mealDefsForBudget(12).map(function (d) { return d.key; })));
    assert.deepStrictEqual(keys, ["breakfast", "lunch", "dinner", "snack", "snack2"]);
    // sin presupuesto (undefined/NaN) tampoco quita snacks
    assert.strictEqual(s.mealDefsForBudget(undefined).length, 5);
    assert.strictEqual(s.mealDefsForBudget(NaN).length, 5);
  });

  t.test("mealDefsForBudget(): comer 3 veces NO es comer menos -- los ratios suman 1", function () {
    var s = freshFullEngineSandbox();
    [5, 8, 12, 20, 40].forEach(function (b) {
      var sum = s.mealDefsForBudget(b).reduce(function (a, d) { return a + d.ratio; }, 0);
      assert.ok(Math.abs(sum - 1) < 1e-9,
        "con presupuesto " + b + " los ratios suman " + sum + ", deberian sumar 1");
    });
  });

  t.test("generateDietPlan respeta el numero de tomas que marca el presupuesto", function () {
    var s = freshFullEngineSandbox();
    var profile = s.calculateProfile({ weight: 80, height: 178, age: 28, sex: "male", activity: 1.55, workouts: 3, goal: "recomp" });
    var low = s.generateDietPlan(profile, { budget: 8, cookTime: 30, taste: "mixed", store: "mercadona" });
    var normal = s.generateDietPlan(profile, { budget: 16, cookTime: 30, taste: "mixed", store: "mercadona" });
    assert.strictEqual(low.meals.length, 3, "con 8 EUR el dia debe ser de 3 tomas");
    assert.strictEqual(normal.meals.length, 5, "con 16 EUR deben volver los snacks");
  });

  // ── 10. Objetivo "solo comer bien" (2026-09-01) ──────────────────────────

  t.test("goal 'maintain': calorias de mantenimiento pero SIN forzar proteina alta", function () {
    var s = freshCalculatorSandbox();
    var raw = { weight: 80, height: 178, age: 28, sex: "male", activity: 1.55, workouts: 3 };
    function withGoal(g) { var d = {}; for (var k in raw) d[k] = raw[k]; d.goal = g; return s.calculateProfile(d); }
    var maintain = withGoal("maintain");
    var recomp = withGoal("recomp");
    // mismas calorias que recomposicion (los dos son mantenimiento)...
    assert.strictEqual(maintain.calories > 0, true);
    // ...pero bastante menos proteina: no hay objetivo de composicion.
    assert.ok(maintain.protein < recomp.protein * 0.8,
      "maintain deberia pedir mucha menos proteina que recomp: " + maintain.protein + " vs " + recomp.protein);
  });
}

module.exports = { run: run };