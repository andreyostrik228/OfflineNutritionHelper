/**
 * tests/ingredient-nutrition.test.js
 * ─────────────────────────────────────────────────────────────────────────
 * Regression tests para el rediseño FUNDAMENTAL del modelo de nutrición
 * por ingrediente (2026-08-13d, js/core/nutrition.js +
 * js/data/ingredient-nutrition.js): kcal/protein/carbs/fat de cada
 * ingrediente vienen de un dato REAL verificado cuando existe, nunca del
 * reparto del total del plato por cuota de gramos.
 *
 * Bug real que motivó esto (reportado por el usuario, con datos
 * diagnosticados en la sesión anterior, ver STATE.md "Corrección de
 * macros por ingrediente"): "Plátano" (dentro del plato real "Cacahuetes
 * con plátano") mostraba proteína/grasa que en realidad pertenecían al
 * cacahuete de su mismo plato, porque `buildMealFromDish()` repartía el
 * macro TOTAL del plato por cuota de PESO, no por composición nutricional
 * real de cada ingrediente.
 *
 * Todos los tests cargan el código de PRODUCCIÓN real (vm, sin copiar) —
 * mismo patrón que el resto de tests/*.test.js. Los platos usados
 * ("Cacahuetes con plátano", "Pollo a la plancha con arroz y brócoli")
 * son platos REALES de js/data/dishes.js, no sintéticos — el propio caso
 * que reportó el usuario.
 *
 * ── 2026-08-31: 29 roles resueltos desde USDA FoodData Central ──────────
 * Plátano, brócoli, mermelada light (y 26 más) pasaron de 'estimated' a
 * dato real. Los tests de "el ingrediente sin resolver hereda / se recorta
 * / deriva su kcal por Atwater" se movieron a los platos con "Wrap
 * proteico", el único rol de dishes.js que sigue sin resolver a propósito
 * (junto al nombre corrupto "Lechuga: Pepino"). El modelo de remanente es
 * el mismo; solo cambió qué ingrediente lo ejercita.
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

function freshFullEngineWithShoppingListSandbox() {
  var sandbox = freshEngineSandbox();
  var fs = require("fs");
  var vm = require("vm");
  var file = projPath("js/ui/render-shopping-list.js");
  vm.runInContext(fs.readFileSync(file, "utf8"), sandbox, { filename: file });
  return sandbox;
}

function freshFullEngineWithInsightsSandbox() {
  var sandbox = freshEngineSandbox();
  var fs = require("fs");
  var vm = require("vm");
  var file = projPath("js/ui/render-insights.js");
  vm.runInContext(fs.readFileSync(file, "utf8"), sandbox, { filename: file });
  return sandbox;
}

function findItem(nutritionResult, name) {
  return nutritionResult.find(function (r) { return r.name === name; });
}

function run(t) {

  // ── resolveIngredientNutrition(): fuente única de verdad ────────────────

  t.test("resolveIngredientNutrition: ingrediente resuelto devuelve macros reales exactos (Pechuga de pollo)", function () {
    var s = freshEngineSandbox();
    var n = s.resolveIngredientNutrition("Pechuga de pollo");
    assert.strictEqual(n.resolved, true);
    assert.strictEqual(n.kcal, 108);
    assert.strictEqual(n.protein, 22);
    assert.strictEqual(n.carbs, 0.5);
    assert.strictEqual(n.fat, 1.8);
  });

  t.test("resolveIngredientNutrition: ingrediente sin resolver devuelve resolved:false con motivo, nunca un número inventado", function () {
    var s = freshEngineSandbox();
    // "Plátano" se resolvió el 2026-08-31 desde USDA FDC. "Wrap proteico"
    // sigue sin resolver a propósito: ni el catálogo ni OFF ni USDA tienen
    // un registro de tortilla alta en proteína y baja en carbohidratos.
    var n = s.resolveIngredientNutrition("Wrap proteico");
    assert.strictEqual(n.resolved, false);
    assert.strictEqual(n.reason, "no_existe_equivalente");
    assert.ok(typeof n.detail === "string" && n.detail.length > 0);
    assert.strictEqual(Object.prototype.hasOwnProperty.call(n, "kcal"), false);
  });

  // ── A) Regresión específica: Cacahuetes + Plátano ────────────────────────
  // El caso EXACTO reportado por el usuario. Plato real de dishes.js, no
  // sintético: { protein:10, items:[{Cacahuetes,25g},{Plátano,100g}] }.

  t.test("A) Cacahuetes con plátano: el cacahuete muestra SU proteína/grasa real, sin tocar", function () {
    var s = freshEngineSandbox();
    var dish = s.DISH_DB.find(function (d) { return d.name === "Cacahuetes con plátano"; });
    assert.ok(dish, "el plato real debe seguir existiendo en dishes.js");

    var nutrition = s.computeDishIngredientNutrition(dish, 1);
    var cacahuetes = findItem(nutrition, "Cacahuetes");

    assert.strictEqual(cacahuetes.nutritionSource, "real");
    // 24g proteína/100g x 25g = 6g -- exactamente el dato real verificado,
    // independientemente de qué más haya en el plato.
    assert.strictEqual(cacahuetes.protein, 24 * 25 / 100);
    assert.strictEqual(cacahuetes.fat, 50.4 * 25 / 100);
    assert.strictEqual(cacahuetes.kcal, 618 * 25 / 100);
  });

  // El caso histórico de estos dos tests era "Cacahuetes con plátano" (bug
  // reportado por el usuario: el plátano mostraba proteína/grasa del
  // cacahuete de su mismo plato). "Plátano" se resolvió desde USDA FDC el
  // 2026-08-31, así que ya NO puede heredar nada por construcción. El
  // modelo de remanente para ingredientes sin resolver sigue vivo: lo
  // ejercita ahora "Wrap proteico" (rol sin equivalente en catálogo/OFF/
  // USDA), en "Hummus con wrap proteico y verduras".

  t.test("A/wrap) Hummus con wrap proteico y verduras: el ingrediente sin resolver recibe SOLO el remanente (total menos lo real), nunca hereda macros ajenos", function () {
    var s = freshEngineSandbox();
    var dish = s.DISH_DB.find(function (d) { return d.name === "Hummus con wrap proteico y verduras"; });
    assert.ok(dish, "el plato real debe seguir existiendo en dishes.js");
    var nutrition = s.computeDishIngredientNutrition(dish, 1);
    var wrap = findItem(nutrition, "Wrap proteico");

    assert.strictEqual(wrap.nutritionSource, "estimated");

    var real = nutrition.filter(function (r) { return r.nutritionSource === "real"; });
    var realProtein = real.reduce(function (a, r) { return a + r.protein; }, 0);
    var realFat = real.reduce(function (a, r) { return a + r.fat; }, 0);

    // proteína del wrap == total hand-curated - suma real, exacta.
    assert.ok(Math.abs(wrap.protein - (dish.protein - realProtein)) < 1e-6,
      "la proteína del ingrediente sin resolver debe ser EXACTAMENTE el remanente");

    // la grasa real ya supera el total del plato -> remanente recortado a 0,
    // nunca negativo, nunca restado del ingrediente real para cuadrar.
    assert.ok(realFat > dish.fat, "premisa: lo real ya supera la grasa total del plato");
    assert.strictEqual(wrap.fat, 0);
    assert.ok(wrap.fat >= 0);
  });

  t.test("A/wrap) Hummus con wrap proteico y verduras: protein/carbs suman el total hand-curated; el kcal del ingrediente sin resolver se deriva por Atwater, no de dish.kcal", function () {
    var s = freshEngineSandbox();
    var dish = s.DISH_DB.find(function (d) { return d.name === "Hummus con wrap proteico y verduras"; });
    var nutrition = s.computeDishIngredientNutrition(dish, 1);
    var sum = nutrition.reduce(function (acc, r) {
      acc.protein += r.protein; acc.carbs += r.carbs;
      return acc;
    }, { protein: 0, carbs: 0 });

    // protein/carbs no se recortan aquí (solo la grasa) -> suman EXACTAMENTE
    // el total hand-curated: el total sigue siendo la suma de los ingredientes.
    assert.ok(Math.abs(sum.protein - dish.protein) < 0.01);
    assert.ok(Math.abs(sum.carbs - dish.carbs) < 0.01);

    // kcal de la fila 'estimated' (2026-08-13e): Atwater de SU PROPIO
    // protein/carbs/fat, nunca una cuota de dish.kcal.
    var wrap = findItem(nutrition, "Wrap proteico");
    var wrapAtwater = wrap.protein * 4 + wrap.carbs * 4 + wrap.fat * 9;
    assert.ok(Math.abs(wrap.kcal - wrapAtwater) < 0.01,
      "el kcal del ingrediente sin resolver debe ser EXACTAMENTE Atwater de su propio protein/carbs/fat");
  });

  // ── B) Regresión específica: Pollo + Arroz (los carbohidratos del arroz
  // no deben aparecer en la pechuga de pollo) ──────────────────────────────

  t.test("B) Pollo a la plancha con arroz y brócoli: la pechuga de pollo muestra SUS carbohidratos reales (~0), no los del arroz", function () {
    var s = freshEngineSandbox();
    var dish = s.DISH_DB.find(function (d) { return d.name === "Pollo a la plancha con arroz y brócoli"; });
    assert.ok(dish, "el plato real debe seguir existiendo en dishes.js");

    var nutrition = s.computeDishIngredientNutrition(dish, 1);
    var pollo = findItem(nutrition, "Pechuga de pollo");
    var arroz = findItem(nutrition, "Arroz blanco cocido");

    assert.strictEqual(pollo.nutritionSource, "real");
    assert.strictEqual(arroz.nutritionSource, "real", "el arroz blanco cocido SÍ tiene dato real verificado (a diferencia del integral)");

    // 0.5g carbs/100g x 200g = 1g -- la pechuga de pollo real casi no
    // tiene carbohidratos, muy por debajo de lo que el reparto antiguo por
    // peso le habría asignado.
    assert.strictEqual(pollo.carbs, 0.5 * 200 / 100);
    assert.ok(pollo.carbs < 2, "la pechuga de pollo real tiene carbohidratos prácticamente nulos");

    var oldBuggyChickenCarbs = dish.carbs * (200 / (200 + 220 + 150)); // ~18.25g bajo el reparto antiguo por peso
    assert.ok(pollo.carbs < oldBuggyChickenCarbs / 5, "el bug antiguo habría asignado a la pechuga una fracción grande de los carbohidratos del arroz -- el modelo nuevo no");

    // El arroz muestra SUS propios carbohidratos reales, sin diluir con el pollo.
    assert.strictEqual(arroz.carbs, 24 * 220 / 100);
  });

  // "Brócoli" también se resolvió desde USDA el 2026-08-31. La propiedad
  // "un ingrediente sin resolver nunca da un macro negativo" se comprueba
  // ahora sobre "Wrap de salmón con aguacate y espinacas", donde la
  // proteína real (salmón) ya cubre el total del plato y el remanente del
  // wrap se recorta a 0.
  t.test("B/wrap) Wrap de salmón con aguacate y espinacas: el ingrediente sin resolver nunca da un macro negativo aunque lo real ya supere el total del plato", function () {
    var s = freshEngineSandbox();
    var dish = s.DISH_DB.find(function (d) { return d.name === "Wrap de salmón con aguacate y espinacas"; });
    var nutrition = s.computeDishIngredientNutrition(dish, 1);
    var wrap = findItem(nutrition, "Wrap proteico");

    assert.strictEqual(wrap.nutritionSource, "estimated");
    ["kcal", "protein", "carbs", "fat"].forEach(function (k) {
      assert.ok(wrap[k] >= 0, "wrap." + k + " nunca debe ser negativo, incluso si los ingredientes reales ya superan el total estimado a mano");
      assert.ok(isFinite(wrap[k]) && !isNaN(wrap[k]));
    });

    var realProtein = nutrition.filter(function (r) { return r.nutritionSource === "real"; })
                               .reduce(function (a, r) { return a + r.protein; }, 0);
    assert.ok(realProtein >= dish.protein - 0.5, "premisa: lo real ya cubre casi toda la proteína del plato");
    assert.strictEqual(wrap.protein, 0);
  });

  // ── C) nutritionSource correcto en varios tipos de plato ─────────────────

  ["Cacahuetes con plátano", "Pollo a la plancha con arroz y brócoli", "Nueces y naranja"].forEach(function (dishName) {
    t.test("C) " + dishName + ": cada ingrediente resuelto usa dato real, cada uno sin resolver queda marcado 'estimated' (nunca al revés)", function () {
      var s = freshEngineSandbox();
      var dish = s.DISH_DB.find(function (d) { return d.name === dishName; });
      assert.ok(dish, dishName + " debe existir en dishes.js");
      var nutrition = s.computeDishIngredientNutrition(dish, 1);

      dish.items.forEach(function (ingredient, i) {
        var real = s.resolveIngredientNutrition(ingredient.name);
        var item = nutrition[i];
        assert.strictEqual(item.nutritionSource, real.resolved ? "real" : "estimated", ingredient.name);
        if (real.resolved) {
          assert.strictEqual(item.kcal, real.kcal * ingredient.g / 100, ingredient.name + ".kcal debe ser EXACTAMENTE el dato real x gramos");
        }
        ["kcal", "protein", "carbs", "fat"].forEach(function (k) {
          assert.ok(isFinite(item[k]) && !isNaN(item[k]) && item[k] >= 0, ingredient.name + "." + k);
        });
      });
    });
  });

  // ── D) Escalado de porciones: lineal para ingredientes con dato real ─────

  t.test("D) Escalado de porciones: un ingrediente con dato real escala LINEALMENTE (doblar la escala dobla sus macros)", function () {
    var s = freshEngineSandbox();
    var dish = s.DISH_DB.find(function (d) { return d.name === "Pollo a la plancha con arroz y brócoli"; });

    var at1 = findItem(s.computeDishIngredientNutrition(dish, 1), "Pechuga de pollo");
    var at2 = findItem(s.computeDishIngredientNutrition(dish, 2), "Pechuga de pollo");
    var atHalf = findItem(s.computeDishIngredientNutrition(dish, 0.5), "Pechuga de pollo");

    assert.strictEqual(at2.protein, at1.protein * 2);
    assert.strictEqual(at2.kcal, at1.kcal * 2);
    assert.strictEqual(atHalf.protein, at1.protein * 0.5);
    assert.strictEqual(at2.grams, at1.grams * 2);
  });

  t.test("D) Escalado de porciones: buildMealFromDish real produce items linealmente escalados (grams y macros a la vez)", function () {
    var s = freshEngineSandbox();
    var dish = s.DISH_DB.find(function (d) { return d.name === "Pollo a la plancha con arroz y brócoli"; });
    var target = { kcal: dish.kcal, protein: dish.protein, carbs: dish.carbs, fat: dish.fat };

    var mealNative = s.buildMealFromDish(dish, "lunch", "Comida", target, "mercadona", 1);
    var mealDouble = s.buildMealFromDish(dish, "lunch", "Comida", target, "mercadona", 2);

    var polloNative = mealNative.items.find(function (i) { return i.name === "Pechuga de pollo"; });
    var polloDouble = mealDouble.items.find(function (i) { return i.name === "Pechuga de pollo"; });

    assert.strictEqual(polloDouble.grams, polloNative.grams * 2);
    // round1 -- tolerancia mínima de redondeo, no debe desviarse más de eso.
    assert.ok(Math.abs(polloDouble.protein - polloNative.protein * 2) < 0.15);
  });

  // ── E) KBJU del día completo: generateDietPlan sigue produciendo totales sanos ─

  t.test("E) generateDietPlan: los totales del día (derivados de la suma de ingredientes) son finitos, no negativos, y razonablemente cerca del perfil", function () {
    var s = freshEngineSandbox();
    var profile = { calories: 2300, protein: 145, carbs: 255, fats: 72 };
    var data = { budget: 20, cookTime: 35, taste: "mixed", store: "mercadona" };

    for (var i = 0; i < 15; i++) {
      var result = s.generateDietPlan(profile, data);
      assert.notStrictEqual(result.report.status, "unavailable", "run " + i);
      ["kcal", "protein", "carbs", "fat"].forEach(function (k) {
        assert.ok(isFinite(result.total[k]) && !isNaN(result.total[k]) && result.total[k] >= 0, "total." + k + " run " + i);
      });
      // El total del día sigue siendo la suma real de sus items (nunca un
      // número desconectado de los ingredientes que en realidad tiene el plan).
      var recomputedProtein = result.meals.reduce(function (sum, m) {
        return sum + m.items.reduce(function (s2, it) { return s2 + it.protein; }, 0);
      }, 0);
      assert.ok(Math.abs(recomputedProtein - result.total.protein) < 0.5, "run " + i + ": total.protein debe coincidir con la suma real de item.protein de todas las comidas");
    }
  });

  // ── F) La lista de la compra / purchaseCost no se ve afectada por el nuevo modelo de macros ─

  t.test("F) buildShoppingItems()/purchaseCost siguen coincidiendo con el generador tras el rediseño de nutrición", function () {
    var s = freshFullEngineWithShoppingListSandbox();
    var profile = { calories: 2400, protein: 150, carbs: 260, fats: 75 };
    var data = { budget: 22, cookTime: 35, taste: "mixed", store: "mercadona" };
    var result = s.generateDietPlan(profile, data);

    var items = s.buildShoppingItems(result.meals, data.store);
    var shoppingTotal = items.reduce(function (sum, i) { return sum + i.purchase.purchaseCost; }, 0);

    assert.strictEqual(Math.round(shoppingTotal * 100) / 100, Math.round(result.total.purchaseCost * 100) / 100);

    // Cada item de cada comida sigue teniendo un usageCost coherente con su
    // purchaseCost (usageCost <= purchaseCost) -- el modelo de nutrición no
    // tocó la economía de precios/paquetes en absoluto.
    result.meals.forEach(function (meal) {
      meal.items.forEach(function (item) {
        var purchase = s.resolvePurchaseCost(item.name, item.grams, data.store);
        assert.ok(!purchase.hasFixedPackage || item.cost <= purchase.purchaseCost + 0.01,
          item.name + ": usageCost (" + item.cost + ") no debería superar purchaseCost (" + purchase.purchaseCost + ")");
      });
    });
  });

  // ── G) Cobertura: cuenta de roles resueltos/sin resolver coincide con la auditoría ─

  t.test("G) INGREDIENT_NUTRITION cubre los 81 roles de dishes.js, 79 resueltos / 2 sin resolver (USDA FDC, 2026-08-31)", function () {
    var s = freshEngineSandbox();
    var uniqueNames = {};
    s.DISH_DB.forEach(function (d) { (d.items || []).forEach(function (i) { uniqueNames[i.name] = true; }); });
    var names = Object.keys(uniqueNames);
    assert.strictEqual(names.length, 81);

    var resolvedCount = 0, unresolvedCount = 0;
    var unresolved = [];
    names.forEach(function (name) {
      var n = s.resolveIngredientNutrition(name);
      if (n.resolved) resolvedCount++; else { unresolvedCount++; unresolved.push(name); }
    });
    // Antes 50/31; el 2026-08-31 se resolvieron 29 roles desde USDA FDC
    // (los otros 2 de esa tanda, cebolla y ajo, no aparecen en dishes.js).
    // Quedan sin resolver, a propósito: "Wrap proteico" (sin equivalente
    // real) y "Lechuga: Pepino" (nombre corrupto en dishes.js).
    assert.strictEqual(resolvedCount, 79);
    assert.strictEqual(unresolvedCount, 2);
    assert.deepStrictEqual(unresolved.sort(), ["Lechuga: Pepino", "Wrap proteico"]);
  });

  // ── H) Consistencia interna (Atwater): kcal nunca contradice protein/carbs/fat ─
  // Regresión 2026-08-13e: el remanente clampaba kcal de forma
  // independiente a protein/carbs/fat, lo que podía producir una fila
  // 'estimated' con (ej.) 11.5g de carbohidratos pero 0 kcal -- físicamente
  // imposible (Atwater: carbs solos ya son ~4kcal/g). Caso real encontrado:
  // "Mermelada light" en "Tostadas con ricotta y mermelada". Ahora kcal de
  // toda fila 'estimated' se DERIVA de su propio protein/carbs/fat -- este
  // test lo verifica sobre las 334 recetas reales, no solo el caso puntual.

  t.test("H) ninguna fila 'estimated' de las 334 recetas reales tiene kcal inconsistente con su propio protein/carbs/fat (Atwater)", function () {
    var s = freshEngineSandbox();
    var inconsistent = [];
    s.DISH_DB.forEach(function (dish) {
      var nutrition = s.computeDishIngredientNutrition(dish, 1);
      nutrition.forEach(function (item) {
        if (item.nutritionSource !== "estimated") return;
        var atwater = item.protein * 4 + item.carbs * 4 + item.fat * 9;
        if (Math.abs(item.kcal - atwater) > 0.01) {
          inconsistent.push(dish.name + " / " + item.name + ": kcal=" + item.kcal + " atwater=" + atwater);
        }
      });
    });
    assert.strictEqual(inconsistent.length, 0, "filas inconsistentes: " + JSON.stringify(inconsistent.slice(0, 5)));
  });

  // El caso original era "Mermelada light" en "Tostadas con ricotta y
  // mermelada" (bug 2026-08-13e: kcal en 0 con carbohidratos positivos).
  // "Mermelada light" se resolvió desde USDA el 2026-08-31; la propiedad
  // "una fila estimated con carbos positivos NUNCA tiene kcal en 0" se
  // comprueba ahora sobre "Wrap proteico" en el wrap de salmón, donde su
  // único macro no recortado son los carbohidratos.
  t.test("H) una fila 'estimated' con carbohidratos positivos deriva su kcal por Atwater, nunca 0 (bug corregido 2026-08-13e)", function () {
    var s = freshEngineSandbox();
    var dish = s.DISH_DB.find(function (d) { return d.name === "Wrap de salmón con aguacate y espinacas"; });
    assert.ok(dish, "el plato real debe seguir existiendo en dishes.js");
    var nutrition = s.computeDishIngredientNutrition(dish, 1);
    var wrap = findItem(nutrition, "Wrap proteico");

    assert.strictEqual(wrap.nutritionSource, "estimated");
    assert.ok(wrap.carbs > 0, "el wrap debe tener un remanente positivo de carbohidratos en este plato");
    assert.ok(wrap.kcal > 0, "con carbohidratos positivos, el kcal YA NO puede quedarse en 0");
    assert.ok(Math.abs(wrap.kcal - (wrap.protein * 4 + wrap.carbs * 4 + wrap.fat * 9)) < 0.01);
  });

  t.test("H) items 'real' conservan su kcal verificado tal cual, NUNCA recalculado por Atwater (el dato real no tiene por qué cuadrar exactamente con 4/4/9)", function () {
    var s = freshEngineSandbox();
    var n = s.resolveIngredientNutrition("Cacahuetes");
    var itemKcal = n.kcal * 25 / 100; // 25g, la ración nativa en "Cacahuetes con plátano"
    var atwaterImplied = (n.protein * 4 + n.carbs * 4 + n.fat * 9) * 25 / 100;

    // El propio producto real NO es exactamente Atwater-consistente consigo
    // mismo (618kcal/100g reales vs. 601.6kcal/100g que darían sus propios
    // macros por la fórmula) -- justo lo que se espera de un dato real de
    // producto, no forzado a encajar. Confirma que NO se está recalculando.
    assert.notStrictEqual(Math.round(itemKcal * 10), Math.round(atwaterImplied * 10), "si esto fallara, algo estaría forzando el kcal real a Atwater, perdiendo precisión del dato verificado");

    var dish = s.DISH_DB.find(function (d) { return d.name === "Cacahuetes con plátano"; });
    var nutrition = s.computeDishIngredientNutrition(dish, 1);
    var cacahuetes = findItem(nutrition, "Cacahuetes");
    assert.strictEqual(cacahuetes.kcal, itemKcal, "el kcal del ingrediente resuelto debe ser el REAL, no el derivado por Atwater");
  });

  // ── I) known issue #5: mainProt real en vez de adivinado por el label (2026-08-20c) ─
  // Antes, buildMealFromDish() nunca copiaba dish.mainProt al meal, así que
  // collectProteinSources() (render-insights.js) SIEMPRE caía a
  // extractMainProtFromLabel() -- una heurística de texto no exhaustiva que
  // puede fallar en dishes reales (ver caso concreto abajo). Ahora meal.mainProt
  // viene directo de dishes.js, la única fuente de verdad.

  t.test("I) buildMealFromDish(): meal.mainProt es exactamente dish.mainProt, para varios platos reales de distintas categorías", function () {
    var s = freshEngineSandbox();
    var names = [
      "Pollo a la plancha con arroz y brócoli",
      "Salmón con patatas al horno y brócoli",
      "Tofu salteado con arroz y verduras",
      "Lentejas con verduras y arroz"
    ];
    names.forEach(function (name) {
      var dish = s.DISH_DB.find(function (d) { return d.name === name; });
      assert.ok(dish, "el plato real debe seguir existiendo: " + name);
      var target = { kcal: dish.kcal, protein: dish.protein, carbs: dish.carbs, fat: dish.fat };
      var meal = s.buildMealFromDish(dish, "lunch", "Comida", target, "mercadona", 1);
      assert.strictEqual(meal.mainProt, dish.mainProt, name);
      assert.strictEqual(typeof meal.mainProt, "string", name + ": mainProt nunca debe quedar undefined");
    });
  });

  t.test("I) collectProteinSources() (render-insights.js) usa el meal.mainProt real, no el label adivinado, para platos generados de verdad", function () {
    var s = freshFullEngineWithInsightsSandbox();
    var pollo  = s.DISH_DB.find(function (d) { return d.name === "Pollo a la plancha con arroz y brócoli"; });
    var salmon = s.DISH_DB.find(function (d) { return d.name === "Salmón con patatas al horno y brócoli"; });
    var mealPollo  = s.buildMealFromDish(pollo,  "lunch",  "Comida", { kcal: pollo.kcal,  protein: pollo.protein,  carbs: pollo.carbs,  fat: pollo.fat  }, "mercadona", 1);
    var mealSalmon = s.buildMealFromDish(salmon, "dinner", "Cena",   { kcal: salmon.kcal, protein: salmon.protein, carbs: salmon.carbs, fat: salmon.fat }, "mercadona", 1);

    var sources = s.collectProteinSources([mealPollo, mealSalmon]);
    assert.deepStrictEqual(JSON.parse(JSON.stringify(sources)), ["pollo", "salmon"]);
  });

  t.test("I) caso real donde el label NO permite adivinar correctamente: sin el fix, esta fuente proteica se perdía del audit de diversidad", function () {
    var s = freshFullEngineWithInsightsSandbox();
    // "Tostadas con jamón cocido y tomate" -- dishes.js lo etiqueta
    // mainProt:"pavo"; su label no contiene ninguna palabra clave de
    // extractMainProtFromLabel() (ni "jamón serrano", ni "pavo"), así que
    // ADIVINAR por texto no encuentra nada -- confirma por qué depender del
    // label era frágil, más allá de simplemente estar sin implementar.
    var dish = s.DISH_DB.find(function (d) { return d.name === "Tostadas con jamón cocido y tomate"; });
    assert.ok(dish, "el plato real debe seguir existiendo");
    assert.strictEqual(s.extractMainProtFromLabel("Desayuno — " + dish.name), null,
      "confirma que ADIVINAR por texto no encuentra nada para este label real");

    var meal = s.buildMealFromDish(dish, "breakfast", "Desayuno", { kcal: dish.kcal, protein: dish.protein, carbs: dish.carbs, fat: dish.fat }, "mercadona", 1);
    var sources = s.collectProteinSources([meal]);
    assert.deepStrictEqual(JSON.parse(JSON.stringify(sources)), [dish.mainProt], "con el fix, el audit de diversidad ya no pierde esta fuente proteica");
  });

  t.test("I) collectProteinSources() conserva el fallback por label para entradas de despensa antiguas sin mainProt (compatibilidad hacia atrás)", function () {
    var s = freshFullEngineWithInsightsSandbox();
    // Simula una entrada de historial guardada ANTES de este fix --
    // savePlanForToday() nunca ha persistido mainProt (no hace falta, ver
    // cabecera de esta sección), así que un meal reconstruido desde
    // pantryHistory tampoco lo tendrá. El fallback debe seguir funcionando.
    var legacyMeal = { label: "Comida — Pollo a la plancha con arroz y brócoli", items: [] };
    assert.strictEqual(legacyMeal.mainProt, undefined);
    var sources = s.collectProteinSources([legacyMeal]);
    assert.deepStrictEqual(JSON.parse(JSON.stringify(sources)), ["pollo"]);
  });
}

module.exports = { run: run };
