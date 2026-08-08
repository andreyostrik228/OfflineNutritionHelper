/**
 * tests/budget-purchase.test.js
 * ─────────────────────────────────────────────────────────────────────────
 * Regression tests para el rediseño del presupuesto (2026-08-07): el
 * presupuesto diario del usuario significa dinero de COMPRA (purchaseCost,
 * paquetes reales necesarios, consciente de despensa), NO dinero de USO
 * (usageCost, la suma de ingredientes técnicamente consumidos) — ver la
 * cabecera de js/engine/plan-generator.js ("Presupuesto: coste de compra,
 * no de uso") y js/core/budget.js para el diseño completo.
 *
 * Bug real que motivó el rediseño: con budget=8€, el generador podía
 * aceptar un plan con usageCost=7.72€ cuya compra real (envases enteros
 * necesarios) costaba 19€ — el presupuesto nunca se enteraba, porque todo
 * el pipeline (selección, recorte, verificación) solo miraba usageCost.
 *
 * Carga el código de PRODUCCIÓN real (vm, sin copiar) — mismo patrón que
 * el resto de tests/*.test.js.
 * ─────────────────────────────────────────────────────────────────────────
 */

var assert = require("assert");
var path = require("path");
var loadBrowserGlobals = require("./lib/load-browser-globals").loadBrowserGlobals;

function projPath(rel) {
  return path.join(__dirname, "..", rel);
}

// ── Sandboxes ──────────────────────────────────────────────────────────

function freshBudgetSandbox() {
  return loadBrowserGlobals([
    projPath("js/core/utils.js"),
    projPath("js/data/packaging.js"),
    projPath("js/data/real-ingredient-matches.js"),
    projPath("js/data/prices/mercadona.js"),
    projPath("js/core/pricing.js"),
    projPath("js/core/budget.js")
  ]);
}

function freshBudgetPantrySandbox() {
  return loadBrowserGlobals([
    projPath("js/core/utils.js"),
    projPath("js/data/packaging.js"),
    projPath("js/data/real-ingredient-matches.js"),
    projPath("js/data/prices/mercadona.js"),
    projPath("js/core/pricing.js"),
    projPath("js/core/pantry.js"),
    projPath("js/core/budget.js")
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
    projPath("js/core/pantry.js"),
    projPath("js/core/budget.js"),
    projPath("js/core/calculator.js"),
    projPath("js/core/meal-helpers.js"),
    projPath("js/engine/dish-selector.js"),
    projPath("js/engine/plan-generator.js")
  ]);
}

function freshFullEngineWithShoppingListSandbox() {
  var sandbox = freshFullEngineSandbox();
  var fs = require("fs");
  var vm = require("vm");
  var file = projPath("js/ui/render-shopping-list.js");
  vm.runInContext(fs.readFileSync(file, "utf8"), sandbox, { filename: file });
  return sandbox;
}

function createFakeLocalStorage() {
  var data = {};
  return {
    getItem: function (k) { return Object.prototype.hasOwnProperty.call(data, k) ? data[k] : null; },
    setItem: function (k, v) { data[k] = String(v); },
    removeItem: function (k) { delete data[k]; }
  };
}

function injectSyntheticIngredient(sandbox, opts) {
  var key = opts.key;
  sandbox.PRICE_CATALOGS.mercadona.pricesPer100g[key] = opts.pricePer100g;
  if (opts.packageSize) {
    sandbox.PACKAGING_INFO[key] = { type: "fixedPackage", packageG: opts.packageSize, packageLabel: opts.label || "envase" };
  }
}

function meal(key, label, items) {
  return { key: key, label: label, items: items, prep: 0 };
}

function item(name, grams, costOverride) {
  return { name: name, grams: grams, cost: typeof costOverride === "number" ? costOverride : 0, kcal: 0, protein: 5, carbs: 0, fat: 0 };
}

function run(t) {

  // ── 1. usageCost < budget, pero purchaseCost > budget -> NO feasible ────

  t.test("computeDayPurchaseCost: muchos ingredientes con envase propio pueden dar un purchaseCost muy superior al usageCost agregado", function () {
    var s = freshBudgetSandbox();
    // 5 ingredientes distintos, cada uno usado en poca cantidad (usageCost
    // bajo) pero cada uno con su propio envase que hay que comprar entero
    // -- el mismo patrón que el bug real reportado (tofu 250g/envase 200g,
    // pero aquí con 5 ingredientes para que el efecto sea grande).
    ["a", "b", "c", "d", "e"].forEach(function (k) {
      injectSyntheticIngredient(s, { key: "test bp " + k, pricePer100g: 3.0, packageSize: 200 });
    });
    var meals = [
      meal("breakfast", "Desayuno", [
        item("Test bp a", 20), item("Test bp b", 20)
      ]),
      meal("lunch", "Comida", [
        item("Test bp c", 20), item("Test bp d", 20), item("Test bp e", 20)
      ])
    ];
    var result = s.computeDayPurchaseCost(meals, "mercadona");
    var manualUsageCost = 5 * (3.0 * 20 / 100); // 5 x 0.60 = 3.00
    var manualPurchaseCost = 5 * (3.0 * 200 / 100); // 5 paquetes completos x 6.00 = 30.00
    assert.strictEqual(round2(result.usageCost), round2(manualUsageCost));
    assert.strictEqual(round2(result.purchaseCost), round2(manualPurchaseCost));
    assert.ok(result.purchaseCost > result.usageCost * 5, "el coste de compra debería ser mucho mayor que el de uso en este escenario");

    function round2(n) { return Math.round(n * 100) / 100; }
  });

  t.test("verifyPlanFeasibility: total.cost (uso) por debajo del presupuesto NO basta -- si total.purchaseCost lo supera, se declara violación 'budget'", function () {
    var s = freshFullEngineSandbox();
    var total = { kcal: 2000, protein: 150, carbs: 200, fat: 60, cost: 7.72, purchaseCost: 19 };
    var profile = { calories: 2000, protein: 150, carbs: 200, fats: 60 };
    var data = { budget: 8, cookTime: 30 };
    var meals = [{ key: "breakfast", prep: 10, items: [] }];
    var violations = s.verifyPlanFeasibility(meals, total, profile, data);
    var budgetViolation = violations.find(function (v) { return v.type === "budget"; });
    assert.ok(budgetViolation, "debería reportar una violación de presupuesto aunque usageCost (7.72) esté por debajo del budget (8)");
    assert.strictEqual(budgetViolation.purchaseCost, 19);
    assert.strictEqual(budgetViolation.usageCost, 7.72);
  });

  // ── 2. usageCost > budget, pero purchaseCost <= budget gracias a despensa ─

  t.test("verifyPlanFeasibility: total.purchaseCost dentro del presupuesto NO reporta violación, aunque total.cost (uso) lo supere", function () {
    var s = freshFullEngineSandbox();
    // Escenario deliberadamente invertido: consumo "de catálogo" alto,
    // pero como la despensa ya cubre casi todo, el coste de compra real es
    // bajo -- el presupuesto (de compra) SÍ se respeta.
    var total = { kcal: 2000, protein: 150, carbs: 200, fat: 60, cost: 12, purchaseCost: 6 };
    var profile = { calories: 2000, protein: 150, carbs: 200, fats: 60 };
    var data = { budget: 8, cookTime: 30 };
    var meals = [{ key: "breakfast", prep: 10, items: [] }];
    var violations = s.verifyPlanFeasibility(meals, total, profile, data);
    var budgetViolation = violations.find(function (v) { return v.type === "budget"; });
    assert.strictEqual(budgetViolation, undefined, "no debería haber violación de presupuesto: purchaseCost (6) sí cabe en budget (8), aunque usageCost (12) no");
  });

  // ── 3. Cobertura total de despensa -> purchaseCost = 0 ──────────────────

  t.test("computeDayPurchaseCost: despensa cubre TODO lo requerido -> purchaseCost = 0 para ese ingrediente", function () {
    var s = freshBudgetPantrySandbox();
    s.localStorage = createFakeLocalStorage();
    injectSyntheticIngredient(s, { key: "test tofu full", pricePer100g: 0.8, packageSize: 200 });
    s.setStock("Test tofu full", 300); // más que suficiente para 250g

    var meals = [meal("lunch", "Comida", [item("Test tofu full", 250)])];
    var result = s.computeDayPurchaseCost(meals, "mercadona");
    assert.strictEqual(result.purchaseCost, 0);
    assert.strictEqual(result.lines[0].coveredFromPantry, 250);
    assert.strictEqual(result.lines[0].stillNeeded, 0);
    // El stock de despensa NO se toca por consultar el coste -- solo
    // markMealCooked/markPurchaseDone mutan stock (ver pantry.js).
    assert.strictEqual(s.getStock("Test tofu full"), 300);
  });

  // ── 4. Cobertura parcial -> solo se compran los paquetes que faltan ────

  t.test("computeDayPurchaseCost: despensa cubre PARTE -- purchaseCost solo por los paquetes que realmente faltan (ejemplo del tofu)", function () {
    // Ejemplo exacto de la especificación: 250g requeridos, envase de
    // 200g=2€, despensa ya tiene 150g -> faltan 100g -> 1 paquete -> 2€.
    var s = freshBudgetPantrySandbox();
    s.localStorage = createFakeLocalStorage();
    injectSyntheticIngredient(s, { key: "test tofu partial", pricePer100g: 1.0, packageSize: 200 }); // 1.0/100g -> paquete de 200g = 2€
    s.setStock("Test tofu partial", 150);

    var meals = [meal("lunch", "Comida", [item("Test tofu partial", 250)])];
    var result = s.computeDayPurchaseCost(meals, "mercadona");
    assert.strictEqual(result.lines[0].coveredFromPantry, 150);
    assert.strictEqual(result.lines[0].stillNeeded, 100);
    assert.strictEqual(result.lines[0].packagesToBuy, 1);
    assert.strictEqual(result.purchaseCost, 2);

    // Y si la despensa ya tuviera 300g (más de lo necesario) -> 0€, 0 paquetes.
    s.setStock("Test tofu partial", 300);
    var result2 = s.computeDayPurchaseCost(meals, "mercadona");
    assert.strictEqual(result2.purchaseCost, 0);
    assert.strictEqual(result2.lines[0].packagesToBuy, 0);
  });

  // ── 5. Varios ingredientes con envase -> purchaseCost = suma real ──────

  t.test("computeDayPurchaseCost: varios ingredientes con envase propio -- el total es la suma de las compras reales, no un promedio ni una estimación", function () {
    var s = freshBudgetSandbox();
    injectSyntheticIngredient(s, { key: "test multi a", pricePer100g: 2.0, packageSize: 300 }); // paquete = 6.00
    injectSyntheticIngredient(s, { key: "test multi b", pricePer100g: 5.0, packageSize: 100 }); // paquete = 5.00
    injectSyntheticIngredient(s, { key: "test multi c", pricePer100g: 1.5, packageSize: 500 }); // paquete = 7.50

    var meals = [
      meal("breakfast", "Desayuno", [item("Test multi a", 40), item("Test multi b", 30)]),
      meal("lunch", "Comida", [item("Test multi a", 50)]), // mismo ingrediente que en desayuno -> se agrega ANTES de calcular paquetes
      meal("dinner", "Cena", [item("Test multi c", 520)])  // > 1 paquete de 500g -> 2 paquetes
    ];
    var result = s.computeDayPurchaseCost(meals, "mercadona");

    // A: 40+50=90g de un envase de 300g -> 1 paquete -> 6.00
    // B: 30g de un envase de 100g -> 1 paquete -> 5.00
    // C: 520g de un envase de 500g -> 2 paquetes -> 15.00
    // Total: 6.00 + 5.00 + 15.00 = 26.00
    assert.strictEqual(result.lines.length, 3);
    assert.strictEqual(result.purchaseCost, 26);
  });

  // ── 6. Presupuesto 8€ -> nunca se acepta un plan cuya compra real es 19€ ─

  t.test("generateDietPlan: con budget=8, el purchaseCost del plan aceptado nunca queda muy por encima sin que el informe lo declare", function () {
    var s = freshFullEngineSandbox();
    var profile = { calories: 2400, protein: 150, carbs: 260, fats: 75 };
    var data = { budget: 8, cookTime: 30, taste: "mixed", store: "mercadona" };

    for (var i = 0; i < 15; i++) {
      var result = s.generateDietPlan(profile, data);
      assert.notStrictEqual(result.report.status, "unavailable");

      var overBudget = result.total.purchaseCost > data.budget + 0.05;
      var reportsIt = result.report.violations.some(function (v) {
        return v.type === "budget" || v.type === "budget_infeasible";
      });
      assert.ok(
        !overBudget || reportsIt,
        "run " + i + ": purchaseCost " + result.total.purchaseCost + " supera 8€ sin que el informe lo declare " +
        "(usageCost era " + result.total.cost + " -- exactamente el bug original si esto fallara)"
      );
    }
  });

  // ── 7. Presupuesto genuinamente inviable -> 'budget'/'budget_infeasible' honesto ─

  t.test("generateDietPlan: presupuesto irrisorio (0.50€) -> el informe declara la inviabilidad, nunca finge que cabe", function () {
    var s = freshFullEngineSandbox();
    var profile = { calories: 2200, protein: 140, carbs: 250, fats: 70 };
    var data = { budget: 0.5, cookTime: 30, taste: "mixed", store: "mercadona" };
    var result = s.generateDietPlan(profile, data);

    assert.notStrictEqual(result.report.status, "unavailable"); // nunca un error técnico
    assert.notStrictEqual(result.report.status, "perfect");     // nunca finge que 0.50€ es viable
    var hasBudgetIssue = result.report.violations.some(function (v) {
      return v.type === "budget" || v.type === "budget_infeasible";
    });
    assert.ok(hasBudgetIssue, "debería declarar inviabilidad de presupuesto, no fingir que un plan de 0.50€ es factible");
  });

  // ── 8. Shopping list y purchaseCost del generador: mismo número, trazable ─

  t.test("buildShoppingItems() y result.total.purchaseCost usan el MISMO cálculo -- nunca divergen", function () {
    var s = freshFullEngineWithShoppingListSandbox();
    var profile = { calories: 2300, protein: 145, carbs: 255, fats: 72 };
    var data = { budget: 20, cookTime: 35, taste: "mixed", store: "mercadona" };
    var result = s.generateDietPlan(profile, data);

    var items = s.buildShoppingItems(result.meals, data.store);
    var shoppingTotal = items.reduce(function (sum, i) { return sum + i.purchase.purchaseCost; }, 0);

    assert.strictEqual(Math.round(shoppingTotal * 100) / 100, Math.round(result.total.purchaseCost * 100) / 100);
  });

  // ── 9. "Confirmar y usar este plan hoy" -- la despensa refleja lo comprado ─

  t.test("integración: un plan que solo es asequible gracias a la despensa, al confirmarse, actualiza el stock correctamente", function () {
    var s = freshFullEngineWithShoppingListSandbox();
    s.localStorage = createFakeLocalStorage();

    // Ingrediente sintético caro con envase grande -- sin despensa, un plan
    // que lo requiera varias veces sería caro de comprar; con despensa ya
    // llena, el coste de compra baja a 0 para ese ingrediente.
    injectSyntheticIngredient(s, { key: "test confirm x", pricePer100g: 4.0, packageSize: 300 });
    s.setStock("Test confirm x", 1000); // de sobra para cualquier plan razonable

    var meals = [
      meal("breakfast", "Desayuno", [item("Test confirm x", 80, 3.2)]),
      meal("lunch", "Comida", [item("Test confirm x", 120, 4.8)])
    ];

    var dayPurchase = s.computeDayPurchaseCost(meals, "mercadona");
    assert.strictEqual(dayPurchase.purchaseCost, 0, "con 1000g en despensa, comprar 200g más no debería costar nada");

    var saveResult = s.savePlanForToday(meals, "mercadona");
    assert.strictEqual(saveResult.historySaved, true);

    var purchaseRun = s.markPurchaseDone(saveResult.entry.id);
    assert.ok(purchaseRun, "markPurchaseDone no debería devolver null para una entry recién guardada");
    assert.strictEqual(purchaseRun.run.totals.purchaseCost, 0, "no se debería haber gastado nada -- la despensa ya cubría todo");

    // El stock NO debería haber bajado (comprar no consume) ni haber
    // subido de más (ya estaba cubierto) -- sigue en 1000.
    assert.strictEqual(s.getStock("Test confirm x"), 1000);

    // Ahora se cocina la comida del desayuno -- SÍ debe restar del stock.
    var cookResult = s.markMealCooked(saveResult.entry.id, "breakfast", true);
    assert.ok(cookResult);
    assert.strictEqual(s.getStock("Test confirm x"), 1000 - 80);
  });

  // ── 10. Datos viejos/corruptos de despensa no rompen el cálculo de presupuesto ─

  t.test("computeDayPurchaseCost/generateDietPlan siguen funcionando con localStorage de despensa corrupto", function () {
    var s = freshFullEngineSandbox();
    s.localStorage = {
      getItem: function () { return "{esto no es json valido"; },
      setItem: function () {},
      removeItem: function () {}
    };

    var meals = [meal("breakfast", "Desayuno", [item("Avena", 80, 0.5)])];
    var result = s.computeDayPurchaseCost(meals, "mercadona");
    assert.ok(typeof result.purchaseCost === "number" && isFinite(result.purchaseCost), "no debería lanzar ni devolver NaN con localStorage corrupto");

    var profile = { calories: 2200, protein: 140, carbs: 250, fats: 70 };
    var data = { budget: 20, cookTime: 30, taste: "mixed", store: "mercadona" };
    var planResult = s.generateDietPlan(profile, data);
    assert.notStrictEqual(planResult.report.status, "unavailable", "el plan debería generarse con normalidad pese al localStorage corrupto");
    assert.ok(typeof planResult.total.purchaseCost === "number" && isFinite(planResult.total.purchaseCost));
  });

  t.test("computeDayPurchaseCost sigue funcionando con una entrada de despensa individual corrupta (forma inesperada)", function () {
    var s = freshFullEngineSandbox();
    var fakeStorage = createFakeLocalStorage();
    // Una entrada corrupta (null) mezclada con una válida -- sanitizePantryState
    // (pantry.js) debe descartar solo la mala, no reventar la lectura entera.
    fakeStorage.setItem("nutritionPlanner.pantry.v1", JSON.stringify({
      "avena": null,
      "platano": { grams: 100, displayName: "Plátano", updatedAt: "2026-01-01T00:00:00.000Z" }
    }));
    s.localStorage = fakeStorage;

    var meals = [meal("breakfast", "Desayuno", [item("Avena", 80, 0.5), item("Platano", 100, 0.2)])];
    var result = s.computeDayPurchaseCost(meals, "mercadona");
    assert.ok(typeof result.purchaseCost === "number" && isFinite(result.purchaseCost));
    // El plátano sí debería reflejar la cobertura de despensa (100g cubiertos).
    var platanoLine = result.lines.find(function (l) { return l.name === "Platano"; });
    assert.ok(platanoLine);
    assert.strictEqual(platanoLine.coveredFromPantry, 100);
  });
}

module.exports = { run: run };
