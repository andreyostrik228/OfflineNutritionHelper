/**
 * tests/per-meal-editing.test.js
 * ─────────────────────────────────────────────────────────────────────────
 * Tests de "cambiar este plato" (per-meal editing, 2026-08-20g):
 * regenerateSingleMeal() (js/engine/plan-generator.js, re-elige UN plato
 * para una toma concreta de un plan de PLATO ya confirmado, sin regenerar
 * las otras 4) + replaceSingleMealForEntry() (js/core/pantry.js, aplica
 * ese resultado sobre la entry guardada).
 *
 * Y el tiempo para cocinar de CADA toma (2026-10-31, «Distinto tiempo para
 * desayuno, comida y cena»): tiempoDeLaToma(), el generador, «Cambiar» en el
 * plan y en «Mis planes», el aviso de poco tiempo y el formulario.
 *
 * Carga el código de PRODUCCIÓN real (vm, sin copiar) -- mismo patrón que
 * tests/ingredient-nutrition.test.js.
 * ─────────────────────────────────────────────────────────────────────────
 */

var assert = require("assert");
var fs = require("fs");
var vm = require("vm");
var path = require("path");
var loadBrowserGlobals = require("./lib/load-browser-globals").loadBrowserGlobals;
var seedRandomInContext = require("./lib/seed-random").seedRandomInContext;

// Semilla fija para Math.random del motor. Sin ella, en ~0,3% de las tiradas
// el resto del día (4 tomas) ya agota el presupuesto y no hay plato que quepe
// en la toma reemplazada: regeneratePlanMeal() devuelve no_alternative_found,
// que es el resultado correcto en ese caso, pero el test asumía que siempre
// hay alternativa. Con la semilla 1 sí la hay, y el test sigue comprobando
// que el día queda dentro del presupuesto.
var SEMILLA_MOTOR = 1;

function projPath(rel) {
  return path.join(__dirname, "..", rel);
}

function freshEngineSandbox() {
  var s = loadBrowserGlobals([
    projPath("js/data/dishes.js"),
    projPath("js/data/real-products.js"),
    projPath("js/data/packaging.js"),
    projPath("js/data/servings.js"),
    projPath("js/data/real-ingredient-matches.js"),
    projPath("js/data/ingredient-nutrition.js"),
    projPath("js/data/no-cook-classifier.js"),
    projPath("js/data/prices/mercadona.js"),
    projPath("js/data/budget-presets.js"),
    projPath("js/core/utils.js"),
    projPath("js/core/pricing.js"),
    projPath("js/core/servings.js"),
    projPath("js/core/nutrition.js"),
    projPath("js/core/pantry.js"),
    projPath("js/core/budget.js"),
    projPath("js/core/calculator.js"),
    projPath("js/core/meal-helpers.js"),
    projPath("js/engine/dish-selector.js"),
    projPath("js/engine/plan-generator.js")
  ]);
  seedRandomInContext(s, SEMILLA_MOTOR);
  return s;
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

  t.test("regeneratePlanMeal(): si ningún plato cabe en el presupuesto del día -> no_alternative_found, y las tomas no cambian", function () {
    var s = freshEngineSandbox();
    var profile = s.calculateProfile({ weight: 82, height: 178, age: 27, sex: "male", activity: 1.55, workouts: 4, goal: "recomp" });
    var result = s.generateDietPlan(profile, { budget: 20, cookTime: 30, taste: "mixed", store: "mercadona" });
    var before = JSON.parse(JSON.stringify(result.meals));

    // Con 1 € para el día entero no hay combinación posible: es el caso que el
    // test de arriba evita con la semilla; aquí se comprueba explícitamente.
    var regen = s.regeneratePlanMeal(result.meals, "dinner", { budget: 1, cookTime: 30, taste: "mixed" }, "mercadona", null);
    assert.strictEqual(regen.error, "no_alternative_found");
    assert.deepStrictEqual(JSON.parse(JSON.stringify(result.meals)), before, "sin alternativa, el array de tomas no se toca");
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

  // ── Tiempo para cocinar de cada toma (2026-10-31) ────────────────────────
  // «Если у кого-то на завтрак есть всего 10 минут, но потом он свободен…»:
  // con «Distinto tiempo para desayuno, comida y cena», cada toma se elige con
  // SUS minutos (tiempoDeLaToma). Sin la marca, todo sigue con `cookTime`.

  var CADA_TOMA = { cookTime: 60, cookTimeCadaToma: true, cookTimePorToma: { breakfast: 10, lunch: 20, dinner: 60 } };

  function perfilDePrueba(s) {
    return s.calculateProfile({ weight: 82, height: 178, age: 27, sex: "male", activity: 1.55, workouts: 4, goal: "recomp" });
  }

  /** Lo que puede tardar una toma con `minutos`, en el nivel de relajación con que salió. */
  function limiteConRelajacion(s, minutos, tier) {
    return minutos + s.RELAXATION_TIERS[tier].prepAdd;
  }

  t.test("tiempoDeLaToma(): con la marca, los minutos de la toma; sin ella o sin los suyos, los del día", function () {
    var s = freshEngineSandbox();
    assert.strictEqual(s.tiempoDeLaToma(CADA_TOMA, "breakfast"), 10);
    assert.strictEqual(s.tiempoDeLaToma(CADA_TOMA, "lunch"), 20);
    assert.strictEqual(s.tiempoDeLaToma(CADA_TOMA, "snack"), 60, "los snacks no tienen fila: los del día");
    var sinMarca = Object.assign({}, CADA_TOMA, { cookTimeCadaToma: false });
    assert.strictEqual(s.tiempoDeLaToma(sinMarca, "breakfast"), 60, "sin la marca, los minutos guardados no cuentan");
    var raros = { cookTime: 35, cookTimeCadaToma: true, cookTimePorToma: { breakfast: 0, lunch: "10" } };
    assert.strictEqual(s.tiempoDeLaToma(raros, "breakfast"), 35, "0 no es un tiempo");
    assert.strictEqual(s.tiempoDeLaToma(raros, "lunch"), 35, "un texto no es un tiempo");
    assert.strictEqual(s.tiempoDeLaToma(null, "lunch"), null);
    assert.strictEqual(s.tiempoDeLaToma({}, "lunch"), null);
  });

  t.test("generateDietPlan(): cada toma cabe en SUS minutos (desayuno 10, comida 20) y la cena puede ser larga", function () {
    var s = freshEngineSandbox();
    var profile = perfilDePrueba(s);
    var cenasLargas = 0;
    for (var i = 0; i < 30; i++) {
      var r = s.generateDietPlan(profile, Object.assign({ budget: 20, taste: "mixed", store: "mercadona" }, CADA_TOMA));
      var tier = r.report.tierUsed;
      r.meals.forEach(function (m) {
        var limite = s.tiempoDeLaToma(CADA_TOMA, m.key);
        assert.ok(m.prep <= limiteConRelajacion(s, limite, tier),
          m.key + " tarda " + m.prep + " min y tenía " + limite + " (nivel " + tier + ")");
        if (m.key === "dinner" && m.prep > 20) cenasLargas++;
      });
    }
    assert.ok(cenasLargas > 0, "con 60 min para la cena tiene que salir alguna de más de 20: la comida no la limita");
  });

  t.test("verifyPlanFeasibility(): el aviso de tiempo mide cada toma con SUS minutos", function () {
    var s = freshEngineSandbox();
    var profile = { calories: 2000, protein: 120, carbs: 220, fats: 65 };
    var total = { kcal: 2000, protein: 120, carbs: 220, fat: 65, cost: 5, purchaseCost: 5 };
    var meals = [
      { key: "breakfast", prep: 15, items: [] },
      { key: "lunch", prep: 20, items: [] },
      { key: "dinner", prep: 40, items: [] }
    ];
    function avisosDeTiempo(data) {
      return JSON.parse(JSON.stringify(s.verifyPlanFeasibility(meals, total, profile, data)
        .filter(function (v) { return v.type === "time"; })));
    }
    assert.deepStrictEqual(avisosDeTiempo(Object.assign({ budget: 20 }, CADA_TOMA)),
      [{ type: "time", meal: "breakfast", exceededBy: 5 }]);
    assert.deepStrictEqual(avisosDeTiempo({ budget: 20, cookTime: 20 }).map(function (v) { return v.meal; }),
      ["dinner"], "sin la marca, todas con los 20 del día");
  });

  t.test("regeneratePlanMeal(): «Cambiar» re-elige con los minutos de ESA toma (comida en 10 min)", function () {
    var s = freshEngineSandbox();
    var result = s.generateDietPlan(perfilDePrueba(s), { budget: 20, cookTime: 60, taste: "mixed", store: "mercadona" });
    var conMarca = { cookTime: 60, taste: "mixed", cookTimeCadaToma: true, cookTimePorToma: { lunch: 10 } };
    var sinMarca = Object.assign({}, conMarca, { cookTimeCadaToma: false });
    var largas = 0;
    for (var i = 0; i < 8; i++) {
      var regen = s.regeneratePlanMeal(result.meals, "lunch", conMarca, "mercadona", null);
      assert.ok(regen.meal, "hay comidas de 10 minutos: " + regen.error);
      assert.strictEqual(regen.tier, 0, "sin presupuesto que apriete, sin relajar el tiempo");
      assert.ok(regen.meal.prep <= 10, regen.meal.dishName + " tarda " + regen.meal.prep);
      var otra = s.regeneratePlanMeal(result.meals, "lunch", sinMarca, "mercadona", null);
      if (otra.meal && otra.meal.prep > 10) largas++;
    }
    assert.ok(largas > 0, "sin la marca vuelven los 60 min del día");
  });

  t.test("savePlanForToday(): con la marca guarda una copia de los minutos de cada toma, y «Cambiar» en «Mis planes» los usa", function () {
    var s = freshEngineSandbox();
    var result = s.generateDietPlan(perfilDePrueba(s), { budget: 100, cookTime: 60, taste: "mixed", store: "mercadona" });
    var opciones = { budget: 100, cookTime: 60, taste: "mixed", cookTimeCadaToma: true, cookTimePorToma: { lunch: 10 } };
    var entry = s.savePlanForToday(result.meals, "mercadona", opciones).entry;
    assert.strictEqual(entry.cookTimeCadaToma, true);
    assert.strictEqual(entry.cookTimePorToma.lunch, 10);
    opciones.cookTimePorToma.lunch = 60;
    assert.strictEqual(entry.cookTimePorToma.lunch, 10, "una copia: cambiar las opciones después no toca lo guardado");

    var regen = s.regenerateSingleMeal(entry, "lunch", null);
    assert.ok(regen.meal, regen.error);
    assert.strictEqual(regen.tier, 0);
    assert.ok(regen.meal.prep <= 10, regen.meal.dishName + " tarda " + regen.meal.prep);
  });

  t.test("savePlanForToday()/replacePendingMealsForToday(): sin la marca no se guardan minutos por toma, y se quitan los de antes", function () {
    var s = freshEngineSandbox();
    var result = s.generateDietPlan(perfilDePrueba(s), { budget: 20, cookTime: 60, taste: "mixed", store: "mercadona" });
    var base = { budget: 20, cookTime: 60, taste: "mixed" };
    var primero = s.savePlanForToday(result.meals, "mercadona", Object.assign({ cookTimeCadaToma: true, cookTimePorToma: { lunch: 10 } }, base));
    assert.strictEqual(primero.entry.cookTimeCadaToma, true);

    var reescrito = s.savePlanForToday(result.meals, "mercadona", Object.assign({ cookTimeCadaToma: false, cookTimePorToma: null }, base));
    assert.strictEqual(reescrito.replaced, true, "mismo día y sin comprar: se reescribe el borrador");
    assert.ok(!("cookTimeCadaToma" in reescrito.entry) && !("cookTimePorToma" in reescrito.entry));

    var cambiado = s.replacePendingMealsForToday(reescrito.entry.id, result.meals, "mercadona",
      Object.assign({ cookTimeCadaToma: true, cookTimePorToma: { dinner: 35 } }, base));
    assert.strictEqual(cambiado.entry.cookTimePorToma.dinner, 35, "«Cambiar el plan completo» también los guarda");
  });

  t.test("«Poco tiempo de cocina» solo sale si ninguna toma principal pasa de 10 min", function () {
    var s = freshEngineSandbox();
    [projPath("js/core/i18n.js"), projPath("js/i18n/es.js"), projPath("js/ui/render-insights.js")].forEach(function (f) {
      vm.runInContext(fs.readFileSync(f, "utf8"), s, { filename: f });
    });
    var caja = { innerHTML: "", textContent: "", classList: { add: function () {}, remove: function () {} } };
    s.initInsightRefs({ warningBox: caja, insightsList: null });
    var aviso = s.t("ui.poco_tiempo_de_cocina_platos_simples");
    function avisa(data) {
      caja.innerHTML = "";
      s.renderWarnings({ calories: 2000 }, { meals: [], report: null }, Object.assign({ budget: 20 }, data));
      return caja.innerHTML.indexOf(aviso) !== -1;
    }
    assert.strictEqual(avisa({ cookTime: 10 }), true, "10 min para todo: sí");
    assert.strictEqual(avisa({ cookTime: 35 }), false);
    assert.strictEqual(avisa({ cookTime: 60, cookTimeCadaToma: true, cookTimePorToma: { breakfast: 10, lunch: 35, dinner: 60 } }), false,
      "un desayuno corto no hace más simple la cena");
    assert.strictEqual(avisa({ cookTime: 60, cookTimeCadaToma: true, cookTimePorToma: { breakfast: 10, lunch: 10, dinner: 10 } }), true);
  });

  t.test("readForm(): la marca siempre; los minutos de cada toma solo con ella (sin ella la clave ni está y no pisa lo guardado)", function () {
    var s = loadBrowserGlobals([projPath("js/core/calculator.js")]);
    function documento(marcada) {
      var porId = {
        age: { value: "30" }, sex: { value: "male" }, weight: { value: "80" }, height: { value: "178" },
        steps: { value: "8500" }, workouts: { value: "3" }, goal: { value: "maintain" },
        cookTime: { value: "35" }, taste: { value: "mixed" }, cookTimeCadaToma: { checked: marcada }
      };
      var filas = [["breakfast", "10"], ["lunch", "20"], ["dinner", "60"]].map(function (f) {
        return { value: f[1], getAttribute: function () { return f[0]; } };
      });
      return {
        getElementById: function (id) { return porId[id] || null; },
        querySelector: function () { return null; },
        querySelectorAll: function (sel) { return sel === "select[data-cocina-toma]" ? filas : []; }
      };
    }
    s.document = documento(false);
    var sin = s.readForm();
    assert.strictEqual(sin.cookTimeCadaToma, false);
    assert.ok(!("cookTimePorToma" in sin));
    s.document = documento(true);
    var con = s.readForm();
    assert.strictEqual(con.cookTimeCadaToma, true);
    assert.deepStrictEqual(JSON.parse(JSON.stringify(con.cookTimePorToma)), { breakfast: 10, lunch: 20, dinner: 60 });
    assert.strictEqual(con.cookTime, 35, "el del día sigue igual");
  });

  t.test("el formulario: la marca y tres filas (desayuno, comida, cena) con los tiempos de #cookTime, en baldosas, cableadas después de ellas", function () {
    var html = fs.readFileSync(projPath("index.html"), "utf8");
    assert.ok(html.indexOf('<input type="checkbox" id="cookTimeCadaToma">') !== -1);
    assert.ok(html.indexOf('<div class="cocina-tomas__filas" id="cookTimeTomas" hidden>') !== -1, "las filas empiezan escondidas");
    function tiempos(id) {
      var m = html.match(new RegExp('<select id="' + id + '"[^>]*>([\\s\\S]*?)</select>'));
      assert.ok(m, id);
      return (m[1].match(/value="\d+"/g) || []).join(",");
    }
    var delDia = tiempos("cookTime");
    ["cookTimeBreakfast", "cookTimeLunch", "cookTimeDinner"].forEach(function (id) {
      assert.strictEqual(tiempos(id), delDia, id + " ofrece los mismos tiempos que el del día");
    });
    var tomas = (html.match(/data-cocina-toma="\w+"/g) || []).map(function (x) { return x.split('"')[1]; });
    assert.deepStrictEqual(tomas, ["breakfast", "lunch", "dinner"]);

    var controles = fs.readFileSync(projPath("js/ui/form-controls.js"), "utf8");
    ["cookTimeBreakfast", "cookTimeLunch", "cookTimeDinner"].forEach(function (id) {
      assert.ok(controles.indexOf('"' + id + '"') !== -1, id + " en FORM_BALDOSAS");
    });
    var app = fs.readFileSync(projPath("js/app.js"), "utf8");
    assert.ok(app.indexOf('safeInit("cocina-tomas"') > app.indexOf('safeInit("form-controls"'),
      "la marca se cablea después de las baldosas, que esconde");
    assert.ok(app.indexOf("opcionesDelDia(gen)") !== -1 && app.indexOf("opcionesDelDia(suyos)") !== -1,
      "«Cambiar» recibe los minutos de cada toma");
  });
}

module.exports = { run: run };
