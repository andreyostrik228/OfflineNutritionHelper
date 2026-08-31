/**
 * tests/per-meal-editing.test.js
 * ─────────────────────────────────────────────────────────────────────────
 * Tests de "cambiar este plato" (per-meal editing, 2026-08-20g):
 * regenerateSingleMeal() (js/engine/plan-generator.js, re-elige UN plato
 * para una toma concreta de un plan de PLATO ya confirmado, sin regenerar
 * las otras 4) + replaceSingleMealForEntry() (js/core/pantry.js, aplica
 * ese resultado sobre la entry guardada).
 *
 * Carga el código de PRODUCCIÓN real (vm, sin copiar) -- mismo patrón que
 * tests/ingredient-nutrition.test.js.
 * ─────────────────────────────────────────────────────────────────────────
 */

var assert = require("assert");
var path = require("path");
var loadBrowserGlobals = require("./lib/load-browser-globals").loadBrowserGlobals;

function projPath(rel) {
  return path.join(__dirname, "..", rel);
}

function freshEngineSandbox() {
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

/** Genera y guarda un plan real completo, con dayOptions -- helper común. */
function generateAndSave(s, overrides) {
  var profile = s.calculateProfile(Object.assign({
    weight: 82, height: 178, age: 27, sex: "male", activity: 1.55, workouts: 4, goal: "recomp"
  }, overrides && overrides.rawData));
  var data = Object.assign({ budget: 20, cookTime: 30, taste: "mixed", store: "mercadona" }, overrides && overrides.data);
  var result = s.generateDietPlan(profile, data);
  var saved = s.savePlanForToday(result.meals, data.store, { budget: data.budget, cookTime: data.cookTime, taste: data.taste });
  return { result: result, saved: saved, data: data };
}

function run(t) {

  // ── regenerateSingleMeal(): casos válidos ────────────────────────────────

  t.test("regenerateSingleMeal(): devuelve un meal completo (items/total/dishName) para la toma pedida", function () {
    var s = freshEngineSandbox();
    var ctx = generateAndSave(s);
    var pantryState = s.getPantryState();

    var regen = s.regenerateSingleMeal(ctx.saved.entry, "lunch", pantryState);
    assert.strictEqual(regen.error, undefined);
    assert.strictEqual(typeof regen.tier, "number");
    assert.strictEqual(regen.meal.key, "lunch");
    assert.ok(regen.meal.items.length > 0);
    assert.ok(typeof regen.meal.dishName === "string" && regen.meal.dishName.length > 0);
    assert.ok(regen.meal.total.kcal > 0);
  });

  t.test("regenerateSingleMeal(): el coste de compra del día completo (otras 4 tomas + la nueva) sigue dentro de entry.budget", function () {
    var s = freshEngineSandbox();
    var ctx = generateAndSave(s, { data: { budget: 22 } });
    var pantryState = s.getPantryState();

    var regen = s.regenerateSingleMeal(ctx.saved.entry, "dinner", pantryState);
    assert.strictEqual(regen.error, undefined);

    var otherMeals = ctx.saved.entry.meals.filter(function (m) { return m.key !== "dinner"; })
      .map(function (m) { return { items: m.items.map(function (it) { return { name: it.name, grams: it.requiredGrams }; }) }; });
    var newMealForCost = { items: regen.meal.items.map(function (it) { return { name: it.name, grams: it.grams }; }) };
    var fullDayCost = s.computeDayPurchaseCost(otherMeals.concat([newMealForCost]), "mercadona", pantryState).purchaseCost;

    assert.ok(fullDayCost <= 22 + 0.01, "coste real del día (" + fullDayCost + ") no debería superar el presupuesto (22)");
  });

  t.test("regenerateSingleMeal(): las otras 4 tomas de la entry nunca se tocan (solo se lee, no se muta la entry)", function () {
    var s = freshEngineSandbox();
    var ctx = generateAndSave(s);
    var beforeNames = ctx.saved.entry.meals.map(function (m) { return m.dishName; });

    s.regenerateSingleMeal(ctx.saved.entry, "snack", s.getPantryState());

    var afterNames = ctx.saved.entry.meals.map(function (m) { return m.dishName; });
    assert.deepStrictEqual(JSON.parse(JSON.stringify(afterNames)), JSON.parse(JSON.stringify(beforeNames)));
  });

  // ── regenerateSingleMeal(): guardas / errores ────────────────────────────

  t.test("regenerateSingleMeal(): mealKey desconocido -> error, no lanza", function () {
    var s = freshEngineSandbox();
    var ctx = generateAndSave(s);
    var regen = s.regenerateSingleMeal(ctx.saved.entry, "brunch", s.getPantryState());
    assert.strictEqual(regen.error, "unknown_meal_key");
  });

  t.test("regenerateSingleMeal(): comida ya cocinada -> error, nunca la reemplaza", function () {
    var s = freshEngineSandbox();
    var ctx = generateAndSave(s);
    s.markMealCooked(ctx.saved.entry.id, "breakfast", true);
    var entryAfterCook = s.getPantryHistory().find(function (e) { return e.id === ctx.saved.entry.id; });

    var regen = s.regenerateSingleMeal(entryAfterCook, "breakfast", s.getPantryState());
    assert.strictEqual(regen.error, "meal_already_cooked");
  });

  t.test("regenerateSingleMeal(): entry guardada SIN dayOptions (legacy, sin entry.budget/meal.total) -> error, nunca lanza", function () {
    var s = freshEngineSandbox();
    var profile = s.calculateProfile({ weight: 82, height: 178, age: 27, sex: "male", activity: 1.55, workouts: 4, goal: "recomp" });
    var data = { budget: 20, cookTime: 30, taste: "mixed", store: "mercadona" };
    var result = s.generateDietPlan(profile, data);
    // Sin el 3er argumento (dayOptions) -- mismo llamador que todos los
    // tests preexistentes de pantry.test.js, para no romper compatibilidad.
    var saved = s.savePlanForToday(result.meals, data.store);

    var regen = s.regenerateSingleMeal(saved.entry, "lunch", s.getPantryState());
    assert.strictEqual(regen.error, "missing_data");
  });

  // ── replaceSingleMealForEntry(): aplica el resultado ─────────────────────

  t.test("replaceSingleMealForEntry(): sustituye SOLO la toma pedida, resetea purchase.done, deja las otras 4 intactas", function () {
    var s = freshEngineSandbox();
    var ctx = generateAndSave(s);
    s.markPurchaseDone(ctx.saved.entry.id, []);
    var beforeOtherNames = ctx.saved.entry.meals.filter(function (m) { return m.key !== "lunch"; }).map(function (m) { return m.dishName; });

    var regen = s.regenerateSingleMeal(ctx.saved.entry, "lunch", s.getPantryState());
    var applied = s.replaceSingleMealForEntry(ctx.saved.entry.id, "lunch", regen.meal);

    assert.strictEqual(applied.meal.dishName, regen.meal.dishName);
    assert.strictEqual(applied.entry.purchase.done, false, "comprar de nuevo debería volver a hacer falta -- ingredientes distintos");

    var afterOtherNames = applied.entry.meals.filter(function (m) { return m.key !== "lunch"; }).map(function (m) { return m.dishName; });
    assert.deepStrictEqual(JSON.parse(JSON.stringify(afterOtherNames)), JSON.parse(JSON.stringify(beforeOtherNames)));
  });

  t.test("replaceSingleMealForEntry(): conserva meal.time (el horario de la toma no cambia por un swap)", function () {
    var s = freshEngineSandbox();
    var ctx = generateAndSave(s);
    var oldTime = ctx.saved.entry.meals.find(function (m) { return m.key === "snack2"; }).time;

    var regen = s.regenerateSingleMeal(ctx.saved.entry, "snack2", s.getPantryState());
    var applied = s.replaceSingleMealForEntry(ctx.saved.entry.id, "snack2", regen.meal);

    assert.strictEqual(applied.meal.time, oldTime);
  });

  t.test("replaceSingleMealForEntry(): comida ya cocinada -> devuelve null, no la toca", function () {
    var s = freshEngineSandbox();
    var ctx = generateAndSave(s);
    s.markMealCooked(ctx.saved.entry.id, "breakfast", true);

    var result = s.replaceSingleMealForEntry(ctx.saved.entry.id, "breakfast", { label: "x", items: [] });
    assert.strictEqual(result, null);
  });

  t.test("replaceSingleMealForEntry(): entryId inexistente -> null, no lanza", function () {
    var s = freshEngineSandbox();
    assert.strictEqual(s.replaceSingleMealForEntry("no-existe", "lunch", { label: "x", items: [] }), null);
  });

  t.test("REGRESIÓN: replaceSingleMealForEntry() nunca actúa sobre una entry 'nocook' (mismo tipo de bug que 2026-08-20g)", function () {
    var s = freshEngineSandbox();
    var nocookSlots = [{ key: "breakfast", label: "Desayuno", items: [{ id: "p1", name: "Yogur", quantity: 1, price: 0.5 }] }];
    var nocookSaved = s.saveNoCookPlanForToday(nocookSlots);

    var result = s.replaceSingleMealForEntry(nocookSaved.entry.id, "breakfast", { label: "x", items: [] });
    assert.strictEqual(result, null);

    var entryAfter = s.getPantryHistory().find(function (e) { return e.id === nocookSaved.entry.id; });
    assert.strictEqual(entryAfter.type, "nocook");
    assert.strictEqual(Object.prototype.hasOwnProperty.call(entryAfter, "meals"), false);
  });

  // ── Extremo a extremo: varias tomas de un mismo plan real, varias veces ──

  t.test("varias llamadas a regenerateSingleMeal() en tomas distintas del mismo plan, aplicadas una a una, mantienen el día coherente", function () {
    var s = freshEngineSandbox();
    var ctx = generateAndSave(s, { data: { budget: 25 } });
    var entry = ctx.saved.entry;

    ["breakfast", "dinner"].forEach(function (key) {
      var pantryState = s.getPantryState();
      var currentEntry = s.getPantryHistory().find(function (e) { return e.id === entry.id; });
      var regen = s.regenerateSingleMeal(currentEntry, key, pantryState);
      assert.strictEqual(regen.error, undefined, key + ": " + regen.error);
      var applied = s.replaceSingleMealForEntry(entry.id, key, regen.meal);
      assert.strictEqual(applied.meal.key, key);
    });

    var finalEntry = s.getPantryHistory().find(function (e) { return e.id === entry.id; });
    assert.strictEqual(finalEntry.meals.length, 5);
    var finalCost = s.computeDayPurchaseCost(
      finalEntry.meals.map(function (m) { return { items: m.items.map(function (it) { return { name: it.name, grams: it.requiredGrams }; }) }; }),
      "mercadona", s.getPantryState()
    ).purchaseCost;
    assert.ok(finalCost <= 25 + 0.01, "coste real del día tras 2 swaps (" + finalCost + ") no debería superar el presupuesto (25)");
  });

  // ── regeneratePlanMeal(): plan RECIÉN generado, sin confirmar ────────
  // Equivalente a regenerateSingleMeal() pero sobre result.meals (items
  // con `grams`, no una entry con `requiredGrams`). Lo usa el botón
  // "Cambiar" de las tarjetas del plan (app.js, swap-plan-meal).

  t.test("regeneratePlanMeal(): devuelve un meal completo para la toma pedida, sin tocar meals", function () {
    var s = freshEngineSandbox();
    var profile = s.calculateProfile({ weight: 82, height: 178, age: 27, sex: "male", activity: 1.55, workouts: 4, goal: "recomp" });
    var data = { budget: 22, cookTime: 30, taste: "mixed", store: "mercadona" };
    var result = s.generateDietPlan(profile, data);
    var before = JSON.parse(JSON.stringify(result.meals));

    var regen = s.regeneratePlanMeal(result.meals, "lunch",
      { budget: data.budget, cookTime: data.cookTime, taste: data.taste }, "mercadona", null);

    assert.strictEqual(regen.error, undefined, "no debería fallar: " + regen.error);
    assert.strictEqual(regen.meal.key, "lunch");
    assert.ok(regen.meal.items.length > 0 && regen.meal.total && typeof regen.meal.dishName === "string");
    assert.deepStrictEqual(JSON.parse(JSON.stringify(result.meals)), before, "regeneratePlanMeal NO debe mutar el array de tomas");
  });

  t.test("regeneratePlanMeal(): la toma reemplazada + las otras 4 siguen dentro del presupuesto", function () {
    var s = freshEngineSandbox();
    var profile = s.calculateProfile({ weight: 82, height: 178, age: 27, sex: "male", activity: 1.55, workouts: 4, goal: "recomp" });
    var data = { budget: 20, cookTime: 30, taste: "mixed", store: "mercadona" };
    var result = s.generateDietPlan(profile, data);

    var regen = s.regeneratePlanMeal(result.meals, "dinner",
      { budget: 20, cookTime: 30, taste: "mixed" }, "mercadona", null);
    assert.strictEqual(regen.error, undefined);

    var merged = result.meals.map(function (m) { return m.key === "dinner" ? regen.meal : m; });
    var cost = s.computeDayPurchaseCost(
      merged.map(function (m) { return { items: m.items.map(function (it) { return { name: it.name, grams: it.grams }; }) }; }),
      "mercadona", null
    ).purchaseCost;
    assert.ok(cost <= 20 + 0.01, "coste real del día tras el swap (" + cost + ") no debería superar el presupuesto (20)");
  });

  t.test("regeneratePlanMeal(): mealKey desconocido -> error, nunca lanza; sin dayOptions.budget usa Infinity", function () {
    var s = freshEngineSandbox();
    var profile = s.calculateProfile({ weight: 82, height: 178, age: 27, sex: "male", activity: 1.55, workouts: 4, goal: "recomp" });
    var result = s.generateDietPlan(profile, { budget: 20, cookTime: 30, taste: "mixed", store: "mercadona" });

    assert.strictEqual(s.regeneratePlanMeal(result.meals, "no-such-key", {}, "mercadona", null).error, "unknown_meal_key");
    // sin budget: no revienta, resuelve una toma igualmente
    var regen = s.regeneratePlanMeal(result.meals, "breakfast", {}, "mercadona", null);
    assert.ok(regen.meal || regen.error === "no_alternative_found");
  });
}

module.exports = { run: run };
