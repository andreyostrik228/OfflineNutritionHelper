/**
 * tests/purchase-economics.test.js
 * ─────────────────────────────────────────────────────────────────────────
 * Regression tests para el rediseño 2026-08-08b: la CASCADA de selección de
 * plato (pickDish, js/engine/dish-selector.js) ahora decide "¿me lo puedo
 * permitir?" por coste de compra MARGINAL (js/core/budget.js,
 * estimateIngredientMarginalPurchaseCost / estimateItemsMarginalPurchaseCost /
 * estimateDishMarginalPurchaseCost), no por usageCost. Antes de esta sesión,
 * budget-purchase.test.js ya cubría que el AGREGADO final del día (post-hoc,
 * computeDayPurchaseCost) respeta purchaseCost -- este archivo cubre la capa
 * nueva: que la elección de plato en sí, plato a plato, ya razona en coste
 * de compra desde el principio, no solo se corrige después recortando.
 *
 * Escenarios pedidos explícitamente (ver la sesión que motivó este cambio):
 *   A) 100g de un envase de 1kg/3€, sin despensa -> marginal = 3€, no 0.30€
 *   B) mismo caso con despensa=900g -> marginal = 0€
 *   C) 100g de un envase de 200g/1€, sin despensa -> marginal = 1€
 *   D) a presupuesto ajustado, el envase pequeño gana aunque su usageCost/
 *      100g sea mayor -- pickDish debe elegirlo de verdad, no solo el
 *      agregado final
 *   E) varios ingredientes -- el total marginal es la suma de paquetes
 *      reales, no de costes proporcionales
 *   F) despensa PARCIAL reduce el nº de paquetes a comprar, no solo el
 *      precio de forma proporcional
 *   G) la lista de la compra (buildShoppingItems) sigue coincidiendo con
 *      result.total.purchaseCost del generador tras este cambio
 *   H) presupuestos personalizados 8€/12€/20€ -- el generador se orienta
 *      por coste de compra real en los tres casos
 *
 * Carga el código de PRODUCCIÓN real (vm, sin copiar) -- mismo patrón que
 * budget-purchase.test.js.
 * ─────────────────────────────────────────────────────────────────────────
 */

var assert = require("assert");
var path = require("path");
var loadBrowserGlobals = require("./lib/load-browser-globals").loadBrowserGlobals;

function projPath(rel) {
  return path.join(__dirname, "..", rel);
}

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
    projPath("js/data/ingredient-nutrition.js"),
    projPath("js/data/no-cook-classifier.js"),
    projPath("js/data/prices/mercadona.js"),
    projPath("js/data/budget-presets.js"),
    projPath("js/core/utils.js"),
    projPath("js/core/pricing.js"),
    projPath("js/core/nutrition.js"),
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

function syntheticDish(opts) {
  return {
    name: opts.name, category: opts.category, kcal: opts.kcal, protein: opts.protein,
    carbs: opts.carbs || 10, fat: opts.fat || 5, cost: 0, prep: opts.prep || 5,
    mainProt: "test", taste: "mixed", items: opts.items
  };
}

function run(t) {

  // ── A) Sin despensa: 100g de un envase de 1kg/3€ -> marginal = 3€, no 0.30€ ─

  t.test("A) estimateIngredientMarginalPurchaseCost: 100g de un envase de 1kg/3€ sin nada comprometido -> marginal = 3€ (paquete entero), no 0.30€ (usageCost)", function () {
    var s = freshBudgetSandbox();
    injectSyntheticIngredient(s, { key: "test a yogur", pricePer100g: 0.30, packageSize: 1000 });
    var marginal = s.estimateIngredientMarginalPurchaseCost("Test a yogur", 100, {}, "mercadona", null);
    assert.strictEqual(marginal, 3);
  });

  // ── B) Despensa=900g cubre los 100g requeridos -> marginal = 0€ ────────────

  t.test("B) estimateIngredientMarginalPurchaseCost: despensa con 900g ya cubre los 100g requeridos -> marginal = 0€", function () {
    var s = freshBudgetPantrySandbox();
    s.localStorage = createFakeLocalStorage();
    injectSyntheticIngredient(s, { key: "test b yogur", pricePer100g: 0.30, packageSize: 1000 });
    s.setStock("Test b yogur", 900);
    var pantryState = s.getPantryState();
    var marginal = s.estimateIngredientMarginalPurchaseCost("Test b yogur", 100, {}, "mercadona", pantryState);
    assert.strictEqual(marginal, 0);
    // El stock no se muta por consultar el coste marginal (solo lectura).
    assert.strictEqual(s.getStock("Test b yogur"), 900);
  });

  // ── C) Envase pequeño 200g/1€, 100g requeridos, sin despensa -> marginal=1€ ─

  t.test("C) estimateIngredientMarginalPurchaseCost: envase de 200g/1€, 100g requeridos, sin despensa -> marginal = 1€", function () {
    var s = freshBudgetSandbox();
    injectSyntheticIngredient(s, { key: "test c yogur", pricePer100g: 0.50, packageSize: 200 }); // 200g = 1.00€
    var marginal = s.estimateIngredientMarginalPurchaseCost("Test c yogur", 100, {}, "mercadona", null);
    assert.strictEqual(marginal, 1);
  });

  // ── Reutilización del MISMO paquete dentro del día (breakfast paga, dinner reusa) ─

  t.test("committedGrams: el mismo paquete ya comprometido por una toma anterior del mismo día cubre lo que pide otra toma -> marginal=0 para la segunda", function () {
    var s = freshBudgetSandbox();
    injectSyntheticIngredient(s, { key: "test share yogur", pricePer100g: 0.30, packageSize: 1000 }); // 1kg/3€
    var committedGrams = {};

    var breakfastMarginal = s.estimateIngredientMarginalPurchaseCost("Test share yogur", 100, committedGrams, "mercadona", null);
    assert.strictEqual(breakfastMarginal, 3, "primera vez que aparece hoy: hay que comprar el paquete entero");

    s.addItemsToPurchaseState(committedGrams, [{ name: "Test share yogur", grams: 100 }]);

    var dinnerMarginal = s.estimateIngredientMarginalPurchaseCost("Test share yogur", 100, committedGrams, "mercadona", null);
    assert.strictEqual(dinnerMarginal, 0, "el paquete de 1kg ya comprado para el desayuno cubre de sobra los 100g de la cena");
  });

  // ── D) A presupuesto ajustado, pickDish elige el envase barato de COMPRAR ──
  // (no el de usageCost/100g más bajo) -- esta es la prueba de que la
  // cascada de SELECCIÓN, no solo el recorte final, razona en purchaseCost.

  t.test("D) pickDish: con presupuesto ajustado, elige el plato de envase pequeño (barato de comprar) aunque su usageCost/100g sea mucho mayor", function () {
    var s = freshFullEngineSandbox();
    // Envase grande: usageCost/100g bajo (0.30€) pero paquete de 1kg = 3.00€.
    injectSyntheticIngredient(s, { key: "test yogur grande", pricePer100g: 0.30, packageSize: 1000, label: "tarrina" });
    // Envase pequeño: usageCost/100g mucho más alto (1.00€) pero el paquete YA es exactamente lo que se usa = 1.00€.
    injectSyntheticIngredient(s, { key: "test yogur pequeno", pricePer100g: 1.00, packageSize: 100, label: "tarrina" });

    s.DISH_DB.push(
      syntheticDish({ name: "Test dish grande", category: "test_purchase_cat", kcal: 100, protein: 8, items: [{ name: "Test yogur grande", g: 100 }] }),
      syntheticDish({ name: "Test dish pequeno", category: "test_purchase_cat", kcal: 100, protein: 8, items: [{ name: "Test yogur pequeno", g: 100 }] })
    );

    var data = { cookTime: 30, taste: "mixed" };
    var usedState = { usedNames: [], usedProts: [], usedTastes: [] };
    var target = { kcal: 100, protein: 8, carbs: 10, fat: 3 };

    var pick = s.pickDish("test_purchase_cat", data, usedState, 0, 1.50, target, "mercadona", 1.50, {}, null);

    assert.ok(pick.dish, "debería encontrar un plato dentro de 1.50€ de coste de compra");
    assert.strictEqual(pick.dish.name, "Test dish pequeno",
      "con 1.50€ de tope, el de envase grande (3.00€ de compra real) no cabe -- debe elegir el de envase pequeño (1.00€), pese a que su usageCost/100g es más del triple");
  });

  t.test("D-bis) pickDish: el mismo plato de envase grande SÍ se elige cuando el tope alcanza para el paquete entero", function () {
    var s = freshFullEngineSandbox();
    injectSyntheticIngredient(s, { key: "test yogur grande 2", pricePer100g: 0.30, packageSize: 1000, label: "tarrina" });
    s.DISH_DB.push(
      syntheticDish({ name: "Test dish grande 2", category: "test_purchase_cat_2", kcal: 100, protein: 8, items: [{ name: "Test yogur grande 2", g: 100 }] })
    );
    var data = { cookTime: 30, taste: "mixed" };
    var usedState = { usedNames: [], usedProts: [], usedTastes: [] };
    var target = { kcal: 100, protein: 8, carbs: 10, fat: 3 };

    var pick = s.pickDish("test_purchase_cat_2", data, usedState, 0, 3.50, target, "mercadona", 3.50, {}, null);
    assert.ok(pick.dish, "con 3.50€ sí debería caber el paquete de 3.00€");
    assert.strictEqual(pick.dish.name, "Test dish grande 2");
  });

  // ── E) Varios ingredientes: el total marginal es la suma de paquetes reales ─

  t.test("E) estimateItemsMarginalPurchaseCost: varios ingredientes -- el total es la suma de paquetes reales, no de costes proporcionales", function () {
    var s = freshBudgetSandbox();
    injectSyntheticIngredient(s, { key: "test e a", pricePer100g: 2.0, packageSize: 300 }); // paquete = 6.00
    injectSyntheticIngredient(s, { key: "test e b", pricePer100g: 5.0, packageSize: 100 }); // paquete = 5.00
    var items = [{ name: "Test e a", grams: 40 }, { name: "Test e b", grams: 30 }];
    var total = s.estimateItemsMarginalPurchaseCost(items, {}, "mercadona", null);
    // Proporcional habría sido 0.8 + 1.5 = 2.30 -- el real es 6.00 + 5.00 = 11.00
    assert.strictEqual(total, 11);
  });

  // ── F) Despensa PARCIAL reduce el nº de paquetes, no solo el precio proporcional ─

  t.test("F) despensa parcial reduce el número de paquetes a comprar (no solo el coste de forma proporcional)", function () {
    var s = freshBudgetPantrySandbox();
    s.localStorage = createFakeLocalStorage();
    injectSyntheticIngredient(s, { key: "test f harina", pricePer100g: 0.40, packageSize: 500 }); // 500g = 2.00€
    s.setStock("Test f harina", 450); // ya casi lleno un paquete
    var pantryState = s.getPantryState();
    // Requeridos 500g; con 450g en despensa solo faltan 50g -> 1 paquete de 500g (2.00€), no 2.
    var marginal = s.estimateIngredientMarginalPurchaseCost("Test f harina", 500, {}, "mercadona", pantryState);
    assert.strictEqual(marginal, 2);
  });

  // ── shrinkToFitPurchaseBudget: encoge la ración hasta que el coste de compra quepa ─

  t.test("pickDish (fase 3, encoger ración): si ningún plato entero cabe, reduce la ración hasta que el coste de compra MARGINAL quepa", function () {
    var s = freshFullEngineSandbox();
    injectSyntheticIngredient(s, { key: "test shrink prot", pricePer100g: 3.0, packageSize: 100 }); // 100g = 3.00€/paquete
    s.DISH_DB.push(
      syntheticDish({ name: "Test dish shrink", category: "test_shrink_cat", kcal: 500, protein: 40, items: [{ name: "Test shrink prot", g: 200 }] })
    );
    // A ración normal (200g) hacen falta 2 paquetes de 100g = 6.00€ -- no cabe en 3.50€.
    // Reduciendo a <=100g (escala <=0.5) basta 1 paquete = 3.00€ -- sí cabe.
    var data = { cookTime: 30, taste: "mixed" };
    var usedState = { usedNames: [], usedProts: [], usedTastes: [] };
    var target = { kcal: 500, protein: 40, carbs: 10, fat: 5 };

    var pick = s.pickDish("test_shrink_cat", data, usedState, 0, 3.50, target, "mercadona", 3.50, {}, null);
    assert.ok(pick.dish, "debería encontrar el plato reduciendo la ración en vez de declararlo inviable");
    assert.strictEqual(pick.simplified, true);
    assert.ok(pick.scaleFactor < 1, "la ración debe reducirse por debajo de la escala normal");

    var actualMarginal = s.estimateDishMarginalPurchaseCost(pick.dish, pick.scaleFactor, {}, "mercadona", null);
    assert.ok(actualMarginal <= 3.50 + 0.01, "el coste de compra real a la ración elegida debe caber en el tope (" + actualMarginal + " vs 3.50)");
  });

  // ── G) La lista de la compra sigue coincidiendo con el generador ──────────

  t.test("G) buildShoppingItems() y result.total.purchaseCost siguen usando el MISMO número tras el rediseño de selección", function () {
    var s = freshFullEngineWithShoppingListSandbox();
    var profile = { calories: 2300, protein: 145, carbs: 255, fats: 72 };
    var data = { budget: 20, cookTime: 35, taste: "mixed", store: "mercadona" };
    var result = s.generateDietPlan(profile, data);

    var items = s.buildShoppingItems(result.meals, data.store);
    var shoppingTotal = items.reduce(function (sum, i) { return sum + i.purchase.purchaseCost; }, 0);

    assert.strictEqual(Math.round(shoppingTotal * 100) / 100, Math.round(result.total.purchaseCost * 100) / 100);
  });

  // ── H) Presupuestos personalizados 8€/12€/20€ -- el generador respeta el coste de compra ─

  [8, 12, 20].forEach(function (budget) {
    t.test("H) generateDietPlan: presupuesto personalizado de " + budget + "€ -- purchaseCost nunca lo supera sin que el informe lo declare (10 corridas)", function () {
      var s = freshFullEngineSandbox();
      var profile = { calories: 2200, protein: 140, carbs: 250, fats: 70 };
      var data = { budget: budget, cookTime: 30, taste: "mixed", store: "mercadona" };

      for (var i = 0; i < 10; i++) {
        var result = s.generateDietPlan(profile, data);
        assert.notStrictEqual(result.report.status, "unavailable", "run " + i);

        var overBudget = result.total.purchaseCost > budget + 0.05;
        var reportsIt = result.report.violations.some(function (v) {
          return v.type === "budget" || v.type === "budget_infeasible";
        });
        assert.ok(
          !overBudget || reportsIt,
          "budget=" + budget + " run " + i + ": purchaseCost " + result.total.purchaseCost + " supera el presupuesto sin declararlo"
        );
      }
    });
  });
}

module.exports = { run: run };
