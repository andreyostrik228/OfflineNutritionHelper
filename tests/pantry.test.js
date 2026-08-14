/**
 * tests/pantry.test.js
 * ─────────────────────────────────────────────────────────────────────────
 * Tests de js/core/pantry.js (despensa), ciclo de vida en 3 etapas
 * (v2, 2026-08-06 -- reemplaza una v1 con un único applyPlanToPantry() que
 * combinaba comprar+usar en una transacción atómica, y se rompía en un
 * caso real: comprar y no llegar a cocinar deja la despensa con un
 * "sobrante" neto en vez de la cantidad realmente comprada):
 *
 *   1. savePlanForToday()  — registra el plan, CERO mutación de stock.
 *   2. markPurchaseDone()  — la ÚNICA función que SUMA stock.
 *   3. markMealCooked()    — la ÚNICA función que RESTA stock, por comida.
 *
 * Carga el código de PRODUCCIÓN real (vm, sin copiar) — mismo patrón que
 * tests/shopping-cost.test.js.
 * ─────────────────────────────────────────────────────────────────────────
 */

var assert = require("assert");
var path = require("path");
var loadBrowserGlobals = require("./lib/load-browser-globals").loadBrowserGlobals;

function projPath(rel) {
  return path.join(__dirname, "..", rel);
}

// ── Sandbox: pricing + pantry ────────────────────────────────────────────
function freshPantrySandbox() {
  return loadBrowserGlobals([
    projPath("js/core/utils.js"),
    projPath("js/data/packaging.js"),
    projPath("js/data/real-ingredient-matches.js"),
    projPath("js/data/prices/mercadona.js"),
    projPath("js/core/pricing.js"),
    projPath("js/core/pantry.js")
  ]);
}

// ── Sandbox: pricing + pantry + budget + render-shopping-list (integración) ─
function freshPantryShoppingListSandbox() {
  var sandbox = freshPantrySandbox();
  var fs = require("fs");
  var vm = require("vm");
  [projPath("js/core/budget.js"), projPath("js/ui/render-shopping-list.js")].forEach(function (file) {
    vm.runInContext(fs.readFileSync(file, "utf8"), sandbox, { filename: file });
  });
  return sandbox;
}

// ── Sandbox: pricing + render-shopping-list SIN pantry.js (regresión) ───
function freshShoppingListSandboxNoPantry() {
  var sandbox = loadBrowserGlobals([
    projPath("js/core/utils.js"),
    projPath("js/data/packaging.js"),
    projPath("js/data/real-ingredient-matches.js"),
    projPath("js/data/prices/mercadona.js"),
    projPath("js/core/pricing.js")
  ]);
  var fs = require("fs");
  var vm = require("vm");
  [projPath("js/core/budget.js"), projPath("js/ui/render-shopping-list.js")].forEach(function (file) {
    vm.runInContext(fs.readFileSync(file, "utf8"), sandbox, { filename: file });
  });
  return sandbox;
}

/**
 * Fake localStorage in-memory — mismo patrón de inyección post-carga que
 * injectSyntheticIngredient() usa en shopping-cost.test.js.
 */
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
  sandbox.PRICE_CATALOGS.mercadona.pricesPer100g[key] = opts.pricePer100Units;
  if (opts.packageSize) {
    sandbox.PACKAGING_INFO[key] = { type: "fixedPackage", packageG: opts.packageSize, packageLabel: opts.label || "envase" };
  }
}

/**
 * Construye un array de "meals" con la forma real de result.meals
 * (generateDietPlan) -- solo los campos que pantry.js necesita
 * (key/label/items[].name/items[].grams).
 */
function fakeMeals(itemsByMealKey) {
  return Object.keys(itemsByMealKey).map(function (key) {
    return { key: key, label: key, items: itemsByMealKey[key] };
  });
}

function run(t) {

  // ── Almacenamiento: fallback en memoria (sin localStorage) ─────────────

  t.test("getPantryState() devuelve {} cuando nunca se ha guardado nada (fallback en memoria)", function () {
    var s = freshPantrySandbox();
    assert.strictEqual(Object.keys(s.getPantryState()).length, 0);
  });

  t.test("getPantryState()/savePantryState() hacen round-trip usando solo el fallback en memoria", function () {
    var s = freshPantrySandbox();
    s.setStock("Tofu firme", 150);
    var state = s.getPantryState();
    assert.strictEqual(state[s.normalizeIngredientKey("Tofu firme")].grams, 150);
  });

  // ── Almacenamiento: localStorage real inyectado ─────────────────────────

  t.test("savePantryState()/getPantryState() hacen round-trip vía localStorage real bajo la clave versionada", function () {
    var s = freshPantrySandbox();
    s.localStorage = createFakeLocalStorage();
    s.setStock("Avena", 300);
    assert.ok(s.localStorage.getItem("nutritionPlanner.pantry.v1"));
    var raw = JSON.parse(s.localStorage.getItem("nutritionPlanner.pantry.v1"));
    assert.strictEqual(raw[s.normalizeIngredientKey("Avena")].grams, 300);
  });

  t.test("getPantryState() devuelve {} (no lanza) con JSON corrupto en localStorage", function () {
    var s = freshPantrySandbox();
    s.localStorage = createFakeLocalStorage();
    s.localStorage.setItem("nutritionPlanner.pantry.v1", "{not valid json");
    assert.strictEqual(Object.keys(s.getPantryState()).length, 0);
  });

  t.test("savePantryState() devuelve false (no lanza) si localStorage.setItem falla (cuota superada)", function () {
    var s = freshPantrySandbox();
    s.localStorage = {
      getItem: function () { return null; },
      setItem: function () { throw new Error("QuotaExceededError"); }
    };
    var ok = s.savePantryState({ foo: { grams: 1 } });
    assert.strictEqual(ok, false);
  });

  t.test("REGRESIÓN: getPantryState() descarta una entrada individual con valor null, no lanza, conserva las demás", function () {
    // Reproduce la misma clase de bug que el del historial (v1 sin
    // .meals), pero en la despensa: listPantryEntries() hacía
    // entry.displayName sobre un valor corrupto y lanzaba "Cannot read
    // properties of null" -- ahora se sanea entrada por entrada.
    var s = freshPantrySandbox();
    s.localStorage = createFakeLocalStorage();
    s.localStorage.setItem("nutritionPlanner.pantry.v1", JSON.stringify({
      tofu: null,
      "mal formado": "no es un objeto",
      "gramos invalidos": { grams: "cien" },
      avena: { grams: 300, displayName: "Avena", updatedAt: "2026-08-06T00:00:00.000Z" }
    }));

    assert.doesNotThrow(function () { s.getPantryState(); });
    var state = s.getPantryState();
    assert.strictEqual(Object.keys(state).length, 1);
    assert.strictEqual(state.avena.grams, 300);
  });

  t.test("REGRESIÓN: listPantryEntries() no lanza con datos corruptos, y sigue listando las entradas sanas", function () {
    var s = freshPantrySandbox();
    s.localStorage = createFakeLocalStorage();
    s.localStorage.setItem("nutritionPlanner.pantry.v1", JSON.stringify({
      tofu: null,
      avena: { grams: 300, displayName: "Avena", updatedAt: "2026-08-06T00:00:00.000Z" }
    }));

    var entries;
    assert.doesNotThrow(function () { entries = s.listPantryEntries(); });
    assert.strictEqual(entries.length, 1);
    assert.strictEqual(entries[0].name, "Avena");
  });

  // ── getStock / setStock / adjustStock / clearStock ──────────────────────

  t.test("setStock/getStock usan normalizeIngredientKey -> mayúsculas/acentos distintos son el mismo ingrediente", function () {
    var s = freshPantrySandbox();
    s.setStock("Tofu", 150);
    assert.strictEqual(s.getStock("tofu"), 150);
    assert.strictEqual(s.getStock("TOFU"), 150);
  });

  t.test("adjustStock nunca baja de 0", function () {
    var s = freshPantrySandbox();
    s.setStock("Salmón", 100);
    s.adjustStock("Salmón", -999);
    assert.strictEqual(s.getStock("Salmón"), 0);
  });

  t.test("setStock(name, 0) BORRA la entrada, no deja una fila {grams:0}", function () {
    var s = freshPantrySandbox();
    s.setStock("Arroz", 200);
    s.setStock("Arroz", 0);
    var state = s.getPantryState();
    assert.strictEqual(Object.prototype.hasOwnProperty.call(state, s.normalizeIngredientKey("Arroz")), false);
  });

  t.test("clearStock() en un ingrediente sin entrada previa es un no-op seguro", function () {
    var s = freshPantrySandbox();
    assert.doesNotThrow(function () { s.clearStock("Nada guardado todavía"); });
    assert.strictEqual(s.getStock("Nada guardado todavía"), 0);
  });

  // ── resolvePurchaseCostWithPantry ────────────────────────────────────────

  t.test("despensa vacía: resolvePurchaseCostWithPantry coincide con resolvePurchaseCost normal", function () {
    var s = freshPantrySandbox();
    injectSyntheticIngredient(s, { key: "test tofu a", pricePer100Units: 0.75, packageSize: 200 });
    var withPantry = s.resolvePurchaseCostWithPantry("test tofu a", 250, "mercadona");
    var plain = s.resolvePurchaseCost("test tofu a", 250, "mercadona");
    assert.strictEqual(withPantry.packagesToBuy, plain.packagesToBuy);
    assert.strictEqual(withPantry.purchaseCost, plain.purchaseCost);
    assert.strictEqual(withPantry.coveredFromPantry, 0);
    assert.strictEqual(withPantry.stillNeeded, 250);
  });

  t.test("cobertura parcial: 250g necesarios, 150g en despensa -> solo faltan 100g, 1 paquete de 200g", function () {
    var s = freshPantrySandbox();
    injectSyntheticIngredient(s, { key: "test tofu b", pricePer100Units: 0.75, packageSize: 200 });
    s.setStock("test tofu b", 150);
    var r = s.resolvePurchaseCostWithPantry("test tofu b", 250, "mercadona");
    assert.strictEqual(r.coveredFromPantry, 150);
    assert.strictEqual(r.stillNeeded, 100);
    assert.strictEqual(r.packagesToBuy, 1);
  });

  t.test("REGRESIÓN paquete fantasma: 250g necesarios, 300g en despensa (más de lo necesario) -> 0 paquetes, coste 0", function () {
    var s = freshPantrySandbox();
    injectSyntheticIngredient(s, { key: "test tofu c", pricePer100Units: 0.75, packageSize: 200 });
    s.setStock("test tofu c", 300);
    var r = s.resolvePurchaseCostWithPantry("test tofu c", 250, "mercadona");
    assert.strictEqual(r.coveredFromPantry, 250);
    assert.strictEqual(r.stillNeeded, 0);
    assert.strictEqual(r.packagesToBuy, 0);
    assert.strictEqual(r.purchaseCost, 0);
  });

  t.test("usageCost siempre refleja los gramos TOTALES requeridos, cubiertos o no por despensa", function () {
    var s = freshPantrySandbox();
    injectSyntheticIngredient(s, { key: "test tofu d", pricePer100Units: 1.0, packageSize: 200 });
    var expectedUsageCost = 2.5; // 250g x 1.0/100g
    var noPantry = s.resolvePurchaseCostWithPantry("test tofu d", 250, "mercadona");
    assert.strictEqual(noPantry.usageCost, expectedUsageCost);

    s.setStock("test tofu d", 300); // cobertura total
    var fullyCovered = s.resolvePurchaseCostWithPantry("test tofu d", 250, "mercadona");
    assert.strictEqual(fullyCovered.usageCost, expectedUsageCost);
  });

  t.test("ingrediente SIN envase fijo (carne/pescado fresco): la despensa manual sigue reduciendo stillNeeded", function () {
    var s = freshPantrySandbox();
    s.setStock("Salmón", 100); // salmón no tiene entrada en PACKAGING_INFO
    var r = s.resolvePurchaseCostWithPantry("Salmón", 180, "mercadona");
    assert.strictEqual(r.hasFixedPackage, false);
    assert.strictEqual(r.coveredFromPantry, 100);
    assert.strictEqual(r.stillNeeded, 80);
  });

  // ── savePlanForToday (Etapa 1) ────────────────────────────────────────

  t.test("savePlanForToday: construye 5 campos por comida y NO toca stock en absoluto", function () {
    var s = freshPantrySandbox();
    s.setStock("Avena", 500); // stock preexistente, para comprobar que no cambia
    var meals = fakeMeals({
      breakfast: [{ name: "Avena", grams: 80 }],
      lunch: [{ name: "Salmón", grams: 180 }]
    });
    var result = s.savePlanForToday(meals, "mercadona");

    assert.strictEqual(result.historySaved, true);
    assert.strictEqual(result.entry.meals.length, 2);
    assert.strictEqual(result.entry.meals[0].cooked, false);
    assert.strictEqual(result.entry.meals[0].cookedAt, null);
    assert.strictEqual(result.entry.meals[0].consumed, null);
    assert.strictEqual(result.entry.purchase.done, false);
    assert.strictEqual(result.entry.purchase.runs.length, 0);

    // Cero mutación de stock -- la garantía central de la Etapa 1.
    assert.strictEqual(s.getStock("Avena"), 500);
    assert.strictEqual(s.getStock("Salmón"), 0);
  });

  t.test("savePlanForToday: items[].requiredGrams viene de item.grams; la nueva entrada aparece primero en el historial", function () {
    var s = freshPantrySandbox();
    var meals = fakeMeals({ breakfast: [{ name: "Avena", grams: 80 }] });
    var result = s.savePlanForToday(meals, "mercadona");

    assert.strictEqual(result.entry.meals[0].items[0].requiredGrams, 80);

    var history = s.getPantryHistory();
    assert.strictEqual(history[0].id, result.entry.id);
  });

  // ── planDate (2026-08-14c) ───────────────────────────────────────────

  t.test("formatLocalDateKey: fecha LOCAL con ceros a la izquierda en mes/día de un dígito", function () {
    var s = freshPantrySandbox();
    assert.strictEqual(s.formatLocalDateKey(new Date(2026, 0, 5, 23, 59)), "2026-01-05");
    assert.strictEqual(s.formatLocalDateKey(new Date(2026, 10, 23, 0, 1)), "2026-11-23");
  });

  t.test("savePlanForToday: guarda planDate como la fecha LOCAL de hoy, distinta de createdAt (marca de auditoría)", function () {
    var s = freshPantrySandbox();
    var meals = fakeMeals({ breakfast: [{ name: "Avena", grams: 80 }] });
    var result = s.savePlanForToday(meals, "mercadona");

    assert.strictEqual(result.entry.planDate, s.formatLocalDateKey(new Date()));
    assert.strictEqual(typeof result.entry.createdAt, "string");
  });

  t.test("savePlanForToday: dos planes el mismo día NO se fusionan ni se reemplazan -- dos entradas distintas, mismo planDate", function () {
    // Comportamiento intencional (decisión explícita del usuario, no un
    // descuido): esta función nunca hace upsert por fecha. La UI es quien
    // debe distinguir varias entradas del mismo planDate por hora.
    var s = freshPantrySandbox();
    var mealsA = fakeMeals({ breakfast: [{ name: "Avena", grams: 80 }] });
    var mealsB = fakeMeals({ breakfast: [{ name: "Salmón", grams: 150 }] });

    var resultA = s.savePlanForToday(mealsA, "mercadona");
    var resultB = s.savePlanForToday(mealsB, "mercadona");

    assert.notStrictEqual(resultA.entry.id, resultB.entry.id);
    assert.strictEqual(resultA.entry.planDate, resultB.entry.planDate);

    var history = s.getPantryHistory();
    assert.strictEqual(history.length, 2);
  });

  t.test("getEntryPlanDate: usa entry.planDate cuando existe, sin mirar createdAt", function () {
    var s = freshPantrySandbox();
    var entry = { planDate: "2026-08-14", createdAt: "2020-01-01T00:00:00.000Z", meals: [], purchase: { done: false, runs: [] } };
    assert.strictEqual(s.getEntryPlanDate(entry), "2026-08-14");
  });

  t.test("getEntryPlanDate: entrada antigua sin planDate lo deriva de createdAt en hora LOCAL (compatibilidad, mismo patrón que meal.time)", function () {
    var s = freshPantrySandbox();
    var localDate = new Date(2026, 7, 14, 23, 45); // 14 ago 2026, 23:45 hora local
    var entry = { createdAt: localDate.toISOString(), meals: [], purchase: { done: false, runs: [] } };
    assert.strictEqual(s.getEntryPlanDate(entry), "2026-08-14");
  });

  t.test("getEntryPlanDate: planDate corrupto (tipo/forma inesperada) cae también al fallback de createdAt", function () {
    var s = freshPantrySandbox();
    var localDate = new Date(2026, 2, 3, 10, 0);
    var entry = { planDate: 20260803, createdAt: localDate.toISOString(), meals: [], purchase: { done: false, runs: [] } };
    assert.strictEqual(s.getEntryPlanDate(entry), "2026-03-03");
  });

  t.test("getEntryPlanDate: sin createdAt válido y sin planDate devuelve cadena vacía, nunca lanza", function () {
    var s = freshPantrySandbox();
    assert.strictEqual(s.getEntryPlanDate({ meals: [], purchase: { done: false, runs: [] } }), "");
    assert.strictEqual(s.getEntryPlanDate(null), "");
  });

  // ── aggregatePlanMealItems ────────────────────────────────────────────

  t.test("aggregatePlanMealItems: suma un mismo ingrediente aparecido en 2 comidas en una sola fila", function () {
    var s = freshPantrySandbox();
    var meals = [
      { key: "breakfast", items: [{ name: "Avena", requiredGrams: 50 }] },
      { key: "snack", items: [{ name: "Avena", requiredGrams: 30 }] }
    ];
    var agg = s.aggregatePlanMealItems(meals);
    assert.strictEqual(agg.length, 1);
    assert.strictEqual(agg[0].requiredGrams, 80);
  });

  t.test("aggregatePlanMealItems: agrega por clave normalizada (mayúsculas/acentos distintos)", function () {
    var s = freshPantrySandbox();
    var meals = [
      { key: "breakfast", items: [{ name: "Salmón", requiredGrams: 100 }] },
      { key: "lunch", items: [{ name: "SALMÓN", requiredGrams: 80 }] }
    ];
    var agg = s.aggregatePlanMealItems(meals);
    assert.strictEqual(agg.length, 1);
    assert.strictEqual(agg[0].requiredGrams, 180);
  });

  // ── markPurchaseDone (Etapa 2) ────────────────────────────────────────

  t.test("REGRESIÓN principal: comprar sin cocinar deja el stock en la cantidad COMPRADA COMPLETA, no neteada", function () {
    // Este es el escenario exacto que rompía la v1: v1 habría dejado
    // 150g (400 comprados - 250 requeridos, neteado en el mismo paso).
    // v2 debe dejar 400g -- comprar no consume nada por sí mismo.
    var s = freshPantrySandbox();
    injectSyntheticIngredient(s, { key: "test tofu e", pricePer100Units: 0.75, packageSize: 200 });
    var meals = fakeMeals({ lunch: [{ name: "test tofu e", grams: 250 }] });
    var saved = s.savePlanForToday(meals, "mercadona");

    var result = s.markPurchaseDone(saved.entry.id, [], "mercadona");
    assert.strictEqual(result.saved, true);
    assert.strictEqual(s.getStock("test tofu e"), 400); // 2 paquetes de 200g, NADA restado
    assert.strictEqual(result.run.lines[0].purchasedGrams, 400);
  });

  t.test("markPurchaseDone: cobertura previa se SUMA, no se neteta contra lo requerido", function () {
    var s = freshPantrySandbox();
    injectSyntheticIngredient(s, { key: "test tofu f", pricePer100Units: 0.75, packageSize: 200 });
    s.setStock("test tofu f", 150);
    var meals = fakeMeals({ lunch: [{ name: "test tofu f", grams: 250 }] });
    var saved = s.savePlanForToday(meals, "mercadona");

    s.markPurchaseDone(saved.entry.id, [], "mercadona");
    // stillNeeded = 250-150 = 100 -> 1 paquete de 200g comprado.
    // 150 (ya había) + 200 (comprado) = 350 -- NO neteado contra 250.
    assert.strictEqual(s.getStock("test tofu f"), 350);
  });

  t.test("markPurchaseDone: excludedNames excluye exactamente ese ingrediente, el resto se compra normal", function () {
    var s = freshPantrySandbox();
    injectSyntheticIngredient(s, { key: "test tofu g", pricePer100Units: 0.75, packageSize: 200 });
    injectSyntheticIngredient(s, { key: "test avena g", pricePer100Units: 0.15, packageSize: 1000 });
    var meals = fakeMeals({
      lunch: [{ name: "test tofu g", grams: 250 }, { name: "test avena g", grams: 80 }]
    });
    var saved = s.savePlanForToday(meals, "mercadona");

    s.markPurchaseDone(saved.entry.id, ["test tofu g"], "mercadona");
    assert.strictEqual(s.getStock("test tofu g"), 0);    // excluido, no comprado
    assert.strictEqual(s.getStock("test avena g"), 1000); // sí comprado
  });

  t.test("markPurchaseDone: dos viajes de compra -- el segundo solo compra lo que sigue faltando", function () {
    var s = freshPantrySandbox();
    injectSyntheticIngredient(s, { key: "test tofu h", pricePer100Units: 0.75, packageSize: 200 });
    var meals = fakeMeals({ lunch: [{ name: "test tofu h", grams: 250 }] });
    var saved = s.savePlanForToday(meals, "mercadona");

    var first = s.markPurchaseDone(saved.entry.id, [], "mercadona");
    assert.strictEqual(first.run.lines[0].purchasedGrams, 400);
    assert.strictEqual(s.getStock("test tofu h"), 400);

    var second = s.markPurchaseDone(saved.entry.id, [], "mercadona");
    // Ya hay 400g en despensa, más que suficiente para los 250g del plan
    // -> segunda compra no añade nada más.
    assert.strictEqual(second.run.lines[0].purchasedGrams, 0);
    assert.strictEqual(s.getStock("test tofu h"), 400);

    var history = s.getPantryHistory();
    var entry = history.find(function (e) { return e.id === saved.entry.id; });
    assert.strictEqual(entry.purchase.runs.length, 2);
    assert.strictEqual(entry.purchase.done, true);
  });

  t.test("markPurchaseDone: entryId inexistente devuelve null, no lanza, no muta nada", function () {
    var s = freshPantrySandbox();
    var result = s.markPurchaseDone("no-existe", [], "mercadona");
    assert.strictEqual(result, null);
  });

  t.test("markPurchaseDone: mismo ingrediente en 2 comidas del plan guardado se agrega en UNA sola línea de compra", function () {
    var s = freshPantrySandbox();
    injectSyntheticIngredient(s, { key: "test avena i", pricePer100Units: 0.15, packageSize: 1000 });
    var meals = fakeMeals({
      breakfast: [{ name: "test avena i", grams: 50 }],
      snack: [{ name: "test avena i", grams: 30 }]
    });
    var saved = s.savePlanForToday(meals, "mercadona");
    var result = s.markPurchaseDone(saved.entry.id, [], "mercadona");

    assert.strictEqual(result.run.lines.length, 1);
    assert.strictEqual(result.run.lines[0].requiredGrams, 80);
  });

  t.test("markPurchaseDone: ingrediente sin envase fijo compra exactamente stillNeeded (sin excedente)", function () {
    var s = freshPantrySandbox();
    var meals = fakeMeals({ lunch: [{ name: "Salmón", grams: 180 }] });
    var saved = s.savePlanForToday(meals, "mercadona");
    s.markPurchaseDone(saved.entry.id, [], "mercadona");
    assert.strictEqual(s.getStock("Salmón"), 180);
  });

  // ── markMealCooked (Etapa 3) ──────────────────────────────────────────

  t.test("markMealCooked: stock suficiente resta exactamente requiredGrams", function () {
    var s = freshPantrySandbox();
    s.setStock("Avena", 500);
    var meals = fakeMeals({ breakfast: [{ name: "Avena", grams: 80 }] });
    var saved = s.savePlanForToday(meals, "mercadona");

    var result = s.markMealCooked(saved.entry.id, "breakfast", true);
    assert.strictEqual(result.meal.cooked, true);
    assert.ok(result.meal.cookedAt);
    assert.strictEqual(result.meal.consumed[0].grams, 80);
    assert.strictEqual(s.getStock("Avena"), 420);
  });

  t.test("markMealCooked: stock INSUFICIENTE resta solo lo disponible (nunca negativo) y lo registra en consumed", function () {
    var s = freshPantrySandbox();
    s.setStock("Avena", 30); // menos de lo que la comida requiere
    var meals = fakeMeals({ breakfast: [{ name: "Avena", grams: 80 }] });
    var saved = s.savePlanForToday(meals, "mercadona");

    var result = s.markMealCooked(saved.entry.id, "breakfast", true);
    assert.strictEqual(s.getStock("Avena"), 0);
    assert.strictEqual(result.meal.consumed[0].grams, 30); // no 80
  });

  t.test("markMealCooked: funciona sin ninguna compra previa por la app (stock puesto solo manualmente)", function () {
    var s = freshPantrySandbox();
    s.setStock("Salmón", 200); // nunca pasó por markPurchaseDone
    var meals = fakeMeals({ lunch: [{ name: "Salmón", grams: 150 }] });
    var saved = s.savePlanForToday(meals, "mercadona");

    s.markMealCooked(saved.entry.id, "lunch", true);
    assert.strictEqual(s.getStock("Salmón"), 50);
  });

  t.test("markMealCooked: desmarcar reproduce el snapshot exacto, no recalcula contra el stock actual", function () {
    var s = freshPantrySandbox();
    s.setStock("Avena", 500);
    var meals = fakeMeals({ breakfast: [{ name: "Avena", grams: 80 }] });
    var saved = s.savePlanForToday(meals, "mercadona");

    s.markMealCooked(saved.entry.id, "breakfast", true); // resta 80 -> 420
    s.adjustStock("Avena", 1000); // acción no relacionada -> 1420

    var undone = s.markMealCooked(saved.entry.id, "breakfast", false);
    assert.strictEqual(undone.meal.consumed, null);
    assert.strictEqual(s.getStock("Avena"), 1500); // 1420 + 80 exactos, no recalculado
  });

  t.test("markMealCooked: idempotente -- marcar cocinado dos veces seguidas no resta dos veces", function () {
    var s = freshPantrySandbox();
    s.setStock("Avena", 500);
    var meals = fakeMeals({ breakfast: [{ name: "Avena", grams: 80 }] });
    var saved = s.savePlanForToday(meals, "mercadona");

    s.markMealCooked(saved.entry.id, "breakfast", true);
    s.markMealCooked(saved.entry.id, "breakfast", true); // ya estaba cooked=true
    assert.strictEqual(s.getStock("Avena"), 420); // no 340
  });

  t.test("markMealCooked: marcar una comida no afecta a las demás comidas de la misma entry", function () {
    var s = freshPantrySandbox();
    s.setStock("Avena", 500);
    s.setStock("Salmón", 500);
    var meals = fakeMeals({
      breakfast: [{ name: "Avena", grams: 80 }],
      lunch: [{ name: "Salmón", grams: 150 }]
    });
    var saved = s.savePlanForToday(meals, "mercadona");

    s.markMealCooked(saved.entry.id, "breakfast", true);
    assert.strictEqual(s.getStock("Salmón"), 500); // intacto

    var history = s.getPantryHistory();
    var entry = history.find(function (e) { return e.id === saved.entry.id; });
    var lunchMeal = entry.meals.find(function (m) { return m.key === "lunch"; });
    assert.strictEqual(lunchMeal.cooked, false);
  });

  t.test("markMealCooked: entryId/mealKey inexistentes devuelven null, no lanzan", function () {
    var s = freshPantrySandbox();
    var meals = fakeMeals({ breakfast: [{ name: "Avena", grams: 80 }] });
    var saved = s.savePlanForToday(meals, "mercadona");

    assert.strictEqual(s.markMealCooked("no-existe", "breakfast", true), null);
    assert.strictEqual(s.markMealCooked(saved.entry.id, "no-existe", true), null);
  });

  // ── Historial: descarta entradas incompatibles (v1 vieja / corruptas) ──

  t.test("REGRESIÓN: getPantryHistory() descarta silenciosamente una entrada con forma v1 (sin .meals), no lanza", function () {
    // Reproduce el bug real encontrado en pruebas manuales: una entrada
    // v1 (comprar+usar combinados, campos lines/totals/appliedAt en vez
    // de meals/purchase) dejada en localStorage de antes de este rediseño
    // hacía que renderHistoryRow() (render-pantry.js) lanzara al llamar
    // entry.meals.every(...) sobre undefined -- y como eso ocurría
    // síncronamente dentro de DOMContentLoaded, el listener del submit
    // del formulario nunca llegaba a registrarse, así que "Generar plan"
    // caía a un envío nativo del <form> y recargaba la página entera.
    var s = freshPantrySandbox();
    s.localStorage = createFakeLocalStorage();
    var v1Entry = {
      id: "old-v1-entry", appliedAt: "2026-08-06T00:00:00.000Z", store: "mercadona",
      cooked: false, cookedAt: null,
      lines: [{ name: "Tofu firme", requiredGrams: 250, purchaseCost: 3.0 }],
      totals: { purchaseCost: 3.0, usageCost: 1.9, itemCount: 1 }
    };
    s.localStorage.setItem("nutritionPlanner.pantryHistory.v1", JSON.stringify([v1Entry]));

    assert.doesNotThrow(function () { s.getPantryHistory(); });
    assert.strictEqual(s.getPantryHistory().length, 0);
  });

  t.test("getPantryHistory() conserva las entradas v2 válidas y solo descarta las incompatibles, mezcladas", function () {
    var s = freshPantrySandbox();
    s.localStorage = createFakeLocalStorage();
    var v1Entry = { id: "old", appliedAt: "x", lines: [], totals: {} }; // sin meals/purchase
    var v2Entry = { id: "new", createdAt: "x", meals: [], purchase: { done: false, runs: [] } };
    s.localStorage.setItem("nutritionPlanner.pantryHistory.v1", JSON.stringify([v2Entry, v1Entry]));

    var history = s.getPantryHistory();
    assert.strictEqual(history.length, 1);
    assert.strictEqual(history[0].id, "new");
  });

  // ── Historial: cap de 30 entradas ────────────────────────────────────

  t.test("appendPantryHistory recorta a 30 entradas, conservando las MÁS RECIENTES", function () {
    var s = freshPantrySandbox();
    for (var i = 0; i < 35; i++) {
      s.appendPantryHistory({ id: "entry-" + i, createdAt: String(i), meals: [], purchase: { done: false, runs: [] } });
    }
    var history = s.getPantryHistory();
    assert.strictEqual(history.length, 30);
    assert.strictEqual(history[0].id, "entry-34"); // la más reciente, primero
    assert.strictEqual(history[29].id, "entry-5"); // se descartaron entry-0..entry-4 (las más antiguas)
  });

  // ── Regresión de ciclo de vida completo (el escenario del reporte) ────

  t.test("REGRESIÓN de ciclo de vida completo: comprar y NUNCA cocinar deja el stock íntegro tras recargar", function () {
    // Reproduce el escenario exacto reportado: eligió el plan, compró, y
    // por la noche cenó fuera -- no cocinó nada. La despensa debe reflejar
    // exactamente lo comprado, no un neteo arbitrario.
    var s = freshPantrySandbox();
    injectSyntheticIngredient(s, { key: "test tofu j", pricePer100Units: 0.75, packageSize: 200 });
    injectSyntheticIngredient(s, { key: "test avena j", pricePer100Units: 0.15, packageSize: 1000 });
    var meals = fakeMeals({
      lunch: [{ name: "test tofu j", grams: 250 }],
      breakfast: [{ name: "test avena j", grams: 80 }]
    });
    var saved = s.savePlanForToday(meals, "mercadona");
    s.markPurchaseDone(saved.entry.id, [], "mercadona");
    // markMealCooked NUNCA se llama -- ninguna comida se cocinó.

    assert.strictEqual(s.getStock("test tofu j"), 400);  // 2 paquetes completos
    assert.strictEqual(s.getStock("test avena j"), 1000); // 1 paquete completo
  });

  // ── Integración con render-shopping-list.js ──────────────────────────────

  t.test("buildShoppingItems() usa resolvePurchaseCostWithPantry cuando pantry.js está cargado", function () {
    var s = freshPantryShoppingListSandbox();
    injectSyntheticIngredient(s, { key: "test tofu k", pricePer100Units: 0.75, packageSize: 200 });
    s.setStock("test tofu k", 150);

    var meals = [{ label: "Comida", items: [{ name: "test tofu k", grams: 250, cost: 1.0 }] }];
    var items = s.buildShoppingItems(meals, "mercadona");

    assert.strictEqual(items[0].purchase.coveredFromPantry, 150);
    assert.strictEqual(items[0].purchase.stillNeeded, 100);
    assert.strictEqual(items[0].purchase.packagesToBuy, 1);
  });

  t.test("REGRESIÓN: los 14 tests de shopping-cost.test.js siguen pasando sin pantry.js cargado (rama de compatibilidad)", function () {
    // No es una re-ejecución de esos tests -- es una prueba directa de que
    // buildShoppingItems() en un sandbox SIN pantry.js sigue devolviendo
    // exactamente el mismo resultado de siempre (resolvePurchaseCost puro).
    var s = freshShoppingListSandboxNoPantry();
    injectSyntheticIngredient(s, { key: "test miel sin despensa", pricePer100Units: 1.0, packageSize: 250 });
    var meals = [{ label: "Desayuno", items: [{ name: "test miel sin despensa", grams: 23, cost: 0.1 }] }];
    var items = s.buildShoppingItems(meals, "mercadona");
    assert.strictEqual(items[0].purchase.packagesToBuy, 1);
    assert.strictEqual(items[0].purchase.purchaseCost, 2.5);
    assert.strictEqual(items[0].purchase.coveredFromPantry, undefined); // el campo ni existe sin pantry.js
  });
}

module.exports = { run: run };
