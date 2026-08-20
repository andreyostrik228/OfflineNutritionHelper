/**
 * tests/plan-generator.characterization.test.js
 * ─────────────────────────────────────────────────────────────────────────
 * FASE 0 — red de seguridad de characterization/golden-master sobre el
 * motor actual (generateDietPlan / dish-selector.js / plan-generator.js /
 * calculator.js), ANTES de empezar la migración progresiva de dishes.js
 * hacia productos reales de Mercadona.
 *
 * Objetivo explícito: NO fijar qué plato exacto elige el generador (usa
 * Math.random() como desempate real en dish-selector.js: diversityScore,
 * pickWeightedByScore, pickWeightedFromTop), sino fijar el CONTRATO
 * OBSERVABLE que el motor promete cumplir -- 5 comidas, presupuesto,
 * tiempo, cap25%, macros dentro de tolerancia, sin excepciones, y
 * CONSISTENCIA entre lo que `report` declara y lo que el plan realmente
 * contiene (plan-generator.js promete un "informe transparente" -- este
 * archivo comprueba esa promesa, no solo el resultado final).
 *
 * Dos tipos de test:
 *
 *   1. INVARIANTES POR PROPIEDAD (Math.random real, sin sembrar, N
 *      repeticiones por perfil) -- no fijan qué plato sale, fijan que
 *      ciertas propiedades se cumplen SIEMPRE para cualquier resultado que
 *      la aleatoriedad real produzca.
 *
 *   2. GOLDEN-MASTER DETERMINISTA (Math.random sembrado, ver
 *      tests/lib/seed-random.js) -- fija valores AGREGADOS exactos
 *      (kcal/protein/carbs/fat/cost/status/tierUsed) para un input y una
 *      semilla concretos. Deliberadamente NO fija nombres de plato ni de
 *      ingrediente (ver arriba) -- solo agregados, para no ser frágil ante
 *      qué candidato exacto gane la lotería ponderada. Valores capturados
 *      ejecutando el código real una vez (ver mensaje de la sesión que
 *      creó este archivo); si el algoritmo cambia a propósito, este test
 *      hay que actualizarlo a propósito, nunca debe cambiar en silencio.
 *
 * NO modifica dish-selector.js / plan-generator.js / dishes.js /
 * pricing.js / budget-presets.js / poc/** -- solo LEE y EJECUTA ese código
 * de producción real vía loadBrowserGlobals() (mismo patrón que
 * shopping-cost.test.js / budget-mode.test.js).
 * ─────────────────────────────────────────────────────────────────────────
 */

var assert = require("assert");
var path = require("path");
var loadBrowserGlobals = require("./lib/load-browser-globals").loadBrowserGlobals;
var seedRandomInContext = require("./lib/seed-random").seedRandomInContext;

function projPath(rel) {
  return path.join(__dirname, "..", rel);
}

var ENGINE_FILES = [
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
];

function freshEngineSandbox() {
  return loadBrowserGlobals(ENGINE_FILES);
}

var EXPECTED_MEAL_KEYS = ["breakfast", "lunch", "dinner", "snack", "snack2"];

// ── Perfiles representativos ─────────────────────────────────────────────
// Cubren los 3 objetivos (cut/recomp/bulk), los 3 presets de presupuesto +
// cantidad exacta, y los extremos de tiempo de cocina. No son "los únicos"
// perfiles válidos -- son una muestra razonable del espacio de entrada real
// del formulario (index.html: edad 14-90, peso 35-250, altura 130-230).
var PROFILES = [
  {
    name: "Corte, presupuesto Ajustado, cocina rápida",
    rawData: { age: 32, sex: "female", weight: 62, height: 165, activity: 1.375, workouts: 3, goal: "cut" },
    budgetMode: "small", budgetCustom: NaN, cookTime: 20, taste: "mixed"
  },
  {
    name: "Recomposición, presupuesto Equilibrado, cocina normal",
    rawData: { age: 27, sex: "male", weight: 78, height: 178, activity: 1.55, workouts: 4, goal: "recomp" },
    budgetMode: "medium", budgetCustom: NaN, cookTime: 30, taste: "mixed"
  },
  {
    name: "Volumen alto, presupuesto Amplio, cocina amplia",
    rawData: { age: 24, sex: "male", weight: 90, height: 188, activity: 1.725, workouts: 6, goal: "bulk" },
    budgetMode: "high", budgetCustom: NaN, cookTime: 35, taste: "savory"
  },
  {
    name: "Presupuesto exacto muy ajustado (caso límite)",
    rawData: { age: 45, sex: "female", weight: 68, height: 162, activity: 1.2, workouts: 1, goal: "cut" },
    budgetMode: "custom", budgetCustom: 2.5, cookTime: 20, taste: "mixed"
  },
  {
    name: "Tiempo de cocina mínimo (caso límite)",
    rawData: { age: 30, sex: "male", weight: 82, height: 180, activity: 1.55, workouts: 5, goal: "bulk" },
    budgetMode: "medium", budgetCustom: NaN, cookTime: 10, taste: "sweet"
  }
];

// Nº de veces que se genera el plan de CADA perfil con aleatoriedad real,
// para que las comprobaciones de invariantes se enfrenten varias veces a la
// lotería ponderada real de dish-selector.js y no solo a una tirada con
// suerte. 10 es suficiente para ejercitar la lotería sin ralentizar la
// suite (334 platos, filtrado en memoria -- cada llamada es rápida).
var ITERATIONS_PER_PROFILE = 10;

/**
 * @param {object} sandbox
 * @param {object} p - entrada de PROFILES
 * @returns {{ profile: object, data: object }}
 */
function buildProfileAndData(sandbox, p) {
  var profile = sandbox.calculateProfile(p.rawData);
  var budget = sandbox.resolveBudget({ budgetMode: p.budgetMode, budgetCustom: p.budgetCustom });
  var data = { budget: budget, cookTime: p.cookTime, taste: p.taste, store: "mercadona" };
  return { profile: profile, data: data };
}

function run(t) {
  // Un solo sandbox reutilizado para todas las corridas no deterministas:
  // DISH_DB/catálogos no se mutan entre llamadas a generateDietPlan (cada
  // meal/item se reconstruye desde cero en buildMealFromDish), así que
  // reutilizar el sandbox es seguro y evita reconstruirlo cientos de veces.
  var sandbox = freshEngineSandbox();

  // Precalcula TODAS las corridas de TODOS los perfiles una sola vez -- así
  // cada test de abajo solo LEE resultados ya generados, en vez de volver a
  // llamar a generateDietPlan por cada aserción. El nº de llamadas al motor
  // no depende de cuántos tests se escriban sobre estos mismos resultados.
  var runsByProfile = PROFILES.map(function (p) {
    var built = buildProfileAndData(sandbox, p);
    var runs = [];
    for (var i = 0; i < ITERATIONS_PER_PROFILE; i++) {
      runs.push(sandbox.generateDietPlan(built.profile, built.data));
    }
    return { def: p, profile: built.profile, data: built.data, runs: runs };
  });

  // ── 1. Estructura: siempre 5 comidas, claves correctas, en orden ────────
  t.test("generateDietPlan devuelve siempre 5 comidas (breakfast/lunch/dinner/snack/snack2) en orden, en los 5 perfiles x " + ITERATIONS_PER_PROFILE + " corridas", function () {
    runsByProfile.forEach(function (rp) {
      rp.runs.forEach(function (result, i) {
        // result.meals es un array creado DENTRO del sandbox vm (realm
        // distinto al de Node) -- normalizar con JSON round-trip antes de
        // comparar contra un array literal del host, igual que ya hace
        // tests/shopping-cost.test.js con Array.from() para el mismo
        // problema (ver su comentario junto a "Array.from(): los arrays
        // creados dentro del sandbox...").
        var keys = JSON.parse(JSON.stringify(result.meals.map(function (m) { return m.key; })));
        assert.deepStrictEqual(
          keys, EXPECTED_MEAL_KEYS,
          rp.def.name + " (run " + i + "): claves de comida inesperadas: " + keys.join(",")
        );
      });
    });
  });

  // ── 2. Ausencia de excepciones / status fuera de enum ───────────────────
  t.test("generateDietPlan nunca devuelve report.status 'unavailable' (error interno) para los 5 perfiles representativos", function () {
    runsByProfile.forEach(function (rp) {
      rp.runs.forEach(function (result, i) {
        assert.notStrictEqual(
          result.report.status, "unavailable",
          rp.def.name + " (run " + i + "): el motor reportó un error interno inesperado"
        );
        assert.ok(
          ["perfect", "adjusted", "minimal"].indexOf(result.report.status) !== -1,
          rp.def.name + " (run " + i + "): status fuera del enum esperado: " + result.report.status
        );
      });
    });
  });

  // ── 3. Presupuesto: nunca se supera sin que el informe lo reconozca ─────
  // El presupuesto es de COMPRA (purchaseCost, coste real de los paquetes
  // que hay que comprar), no de uso -- ver "Presupuesto: coste de compra,
  // no de uso" en la cabecera de plan-generator.js. Esta suite no carga
  // pantry.js, así que purchaseCost aquí es siempre sin descuento de
  // despensa (el caso "peor", más exigente para el generador).
  t.test("el coste de COMPRA total nunca supera el presupuesto más allá de tolerancia mínima, o el informe lo declara explícitamente", function () {
    runsByProfile.forEach(function (rp) {
      rp.runs.forEach(function (result, i) {
        var overBudget = result.total.purchaseCost > rp.data.budget + 0.05;
        var reportsIt = result.report.violations.some(function (v) {
          return v.type === "budget" || v.type === "budget_infeasible";
        });
        assert.ok(
          !overBudget || reportsIt,
          rp.def.name + " (run " + i + "): coste de compra " + result.total.purchaseCost +
          " supera presupuesto " + rp.data.budget + " sin que el informe lo declare"
        );
      });
    });
  });

  // ── 4. Tiempo: ningún meal.prep supera cookTime + relajación del tier, o se declara ──
  t.test("ningún meal.prep supera cookTime + la relajación del tier realmente usado, o el informe lo declara", function () {
    runsByProfile.forEach(function (rp) {
      rp.runs.forEach(function (result, i) {
        var tierDef = sandbox.RELAXATION_TIERS[result.report.tierUsed];
        var allowedPrep = isFinite(tierDef.prepAdd) ? rp.data.cookTime + tierDef.prepAdd : Infinity;

        result.meals.forEach(function (meal) {
          var overTime = meal.prep > allowedPrep + 0.01;
          var reportsIt = result.report.violations.some(function (v) {
            return v.type === "time" && v.meal === meal.key;
          });
          assert.ok(
            !overTime || reportsIt,
            rp.def.name + " (run " + i + ", " + meal.key + "): prep " + meal.prep +
            " min supera " + allowedPrep + " min (tier " + result.report.tierUsed + ") sin que el informe lo declare"
          );
        });
      });
    });
  });

  // ── 5. Cap 25% (o el % relajado del tier vigente) ────────────────────────
  // Nota de diseño descubierta escribiendo este test (ver informe de la
  // sesión): enforce25PercentRule se aplica DOS veces dentro de
  // attemptPlanAtTier, pero enforceBudgetCap corre DESPUÉS de la segunda
  // pasada y solo RECORTA otros ítems -- puede reducir total.kcal sin
  // tocar el ítem grande, con lo que su % respecto al total FINAL puede
  // quedar por encima del cap del tier sin que se vuelva a recortar ESE
  // ítem. Verificado empíricamente (500 corridas, perfil "recomposición
  // equilibrada"): quien SÍ detecta esto de forma consistente es
  // verifyPlanFeasibility -> findCapViolations(meals, total.kcal, 0.25)
  // (con 0.25 fijo, no el cap del tier), que lo añade a report.violations
  // como {type:'cap25', meal, item}. Por eso el test acepta el mismo
  // patrón de consistencia informe<->realidad que presupuesto/tiempo/
  // calorías, en vez de una cota estricta -- caracteriza el comportamiento
  // real (incluida esta interacción sutil), no lo que "debería" pasar.
  t.test("ningún ítem supera el cap25%/tier vigente más allá de tolerancia de redondeo, o el informe lo declara como violación cap25", function () {
    runsByProfile.forEach(function (rp) {
      rp.runs.forEach(function (result, i) {
        var tierDef = sandbox.RELAXATION_TIERS[result.report.tierUsed];
        var cap = result.total.kcal * tierDef.cap25;

        result.meals.forEach(function (meal) {
          meal.items.forEach(function (item) {
            var overCap = item.kcal > cap + 1;
            var reportsIt = result.report.violations.some(function (v) {
              return v.type === "cap25" && v.meal === meal.key && v.item === item.name;
            });
            assert.ok(
              !overCap || reportsIt,
              rp.def.name + " (run " + i + ", " + meal.key + "): " + item.name +
              " tiene " + item.kcal + " kcal, supera el cap " + cap.toFixed(1) +
              " kcal (tier " + result.report.tierUsed + ", " + (tierDef.cap25 * 100) +
              "%) sin que el informe lo declare como cap25"
            );
          });
        });
      });
    });
  });

  // ── 6. Calorías/proteína dentro de tolerancia, o declaradas ──────────────
  t.test("el delta de calorías y de proteína respecto al perfil está dentro de la tolerancia del propio informe (15%), o queda declarado como violación", function () {
    runsByProfile.forEach(function (rp) {
      rp.runs.forEach(function (result, i) {
        var kcalDeltaPct = Math.abs(result.total.kcal - rp.profile.calories) / Math.max(rp.profile.calories, 1);
        var reportsCalories = result.report.violations.some(function (v) { return v.type === "calories"; });
        assert.ok(
          kcalDeltaPct <= 0.15 + 0.001 || reportsCalories,
          rp.def.name + " (run " + i + "): desvío de calorías " + (kcalDeltaPct * 100).toFixed(1) +
          "% sin que el informe lo declare"
        );

        var proteinDelta = rp.profile.protein - result.total.protein;
        var reportsProtein = result.report.violations.some(function (v) { return v.type === "protein"; });
        assert.ok(
          proteinDelta <= 0.15 * rp.profile.protein + 0.01 || reportsProtein,
          rp.def.name + " (run " + i + "): déficit de proteína " + proteinDelta.toFixed(1) +
          " g sin que el informe lo declare"
        );
      });
    });
  });

  // ── 7. Comportamiento por nivel de presupuesto ────────────────────────────
  // Convierte en test automático lo que hoy solo afirma la cabecera de
  // budget-presets.js ("Ajustado fuerza relajación pero nunca falla, Amplio
  // salió 'perfect' en los perfiles probados") -- sin modificar ese archivo.
  t.test("Amplio nunca produce budget_infeasible; small/medium/high/custom siempre devuelven un plan válido (nunca 'unavailable')", function () {
    var base = PROFILES[1]; // perfil de recomposición, neutro
    ["small", "medium", "high"].forEach(function (mode) {
      var built = buildProfileAndData(sandbox, Object.assign({}, base, { budgetMode: mode, budgetCustom: NaN }));
      for (var i = 0; i < ITERATIONS_PER_PROFILE; i++) {
        var result = sandbox.generateDietPlan(built.profile, built.data);
        assert.notStrictEqual(result.report.status, "unavailable", mode + " (run " + i + "): status 'unavailable'");
        if (mode === "high") {
          var infeasible = result.report.violations.some(function (v) { return v.type === "budget_infeasible"; });
          assert.ok(!infeasible, "high (run " + i + "): budget_infeasible inesperado con el preset Amplio");
        }
      }
    });
  });

  // ── 8-9. Golden-master determinista (Math.random sembrado) ───────────────
  // Recapturados por CUARTA vez el 2026-08-19, tras suavizar el reparto
  // secuencial a mitad de fuerza (SEQUENCING_BLEND_RATIO=0.5, ver esa
  // constante y "Reparto secuencial del presupuesto" en la cabecera de
  // plan-generator.js). El recorte proporcional a plena fuerza (probado
  // primero) reducía violaciones de calorías un 53% pero costaba ~20pp de
  // cobertura de platos en desayuno/comida y subía un 25% las violaciones
  // de cap25 -- contradecía el objetivo de conservar diversidad, así que
  // se sustituyó por `blendedCap` (mitad de camino entre hardCap y
  // fairShareCap) tras confirmarlo con el stress-test de 1000
  // generaciones (sesión 2026-08-19d, ver STATE.md). Cambia otra vez qué
  // plato gana la lotería para la MISMA semilla -- de nuevo el caso "si el
  // algoritmo cambia a propósito, hay que actualizar el golden-master a
  // propósito, nunca en silencio". El techo duro real (data.budget) NUNCA
  // cambió -- purchaseCost sigue por debajo de cada budget real
  // (14.54/20€ y 20.68/28€). Los 7 tests de invariantes/contrato #1-7 de
  // este mismo archivo NO se tocaron y siguen pasando sin cambios.
  // Golden-masters de ambos tests recapturados dos veces esta sesión:
  // 2026-08-20d (known issue #7, packaging.js) y de nuevo 2026-08-20e
  // (known issue #1 -- 23 dishes con un dish.kcal internamente
  // inconsistente con su propio protein/carbs/fat corregidos, ver
  // "Auditoría Atwater del nivel de plato" más abajo). Corregir dish.kcal
  // cambia el `scaleFactor` de esos platos en buildMealFromDish()
  // (`target.kcal / dish.kcal`), lo que puede cambiar qué candidato gana
  // la lotería ponderada para la misma semilla -- exactamente el mismo
  // tipo de recaptura ya documentado varias veces en este archivo, aquí
  // el cambio real está en los DATOS, no en el algoritmo de selección en
  // sí. Los 7 tests de invariantes/contrato #1-7 de este mismo archivo NO
  // se tocaron y siguen pasando sin cambios en ninguna de las dos
  // recapturas.
  t.test("golden-master (seed=42): recomposición/Equilibrado -- agregados exactos del resultado actual", function () {
    var s = freshEngineSandbox();
    seedRandomInContext(s, 42);
    var built = buildProfileAndData(s, PROFILES[1]);
    var result = s.generateDietPlan(built.profile, built.data);

    // JSON round-trip: normaliza arrays/objetos creados en el sandbox vm
    // (realm distinto) antes de comparar contra literales del host -- ver
    // comentario del test #1 más arriba para el motivo completo.
    assert.deepStrictEqual(JSON.parse(JSON.stringify(result.meals.map(function (m) { return m.key; }))), EXPECTED_MEAL_KEYS);
    assert.deepStrictEqual(JSON.parse(JSON.stringify(result.meals.map(function (m) { return m.items.length; }))), [3, 2, 3, 2, 3]);
    assert.strictEqual(result.total.kcal, 3039.0000000000005);
    assert.strictEqual(result.total.protein, 159.20000000000002);
    assert.strictEqual(result.total.carbs, 363.79999999999995);
    assert.strictEqual(result.total.fat, 91.6);
    assert.strictEqual(result.total.cost, 7.299999999999999);
    assert.strictEqual(result.total.purchaseCost, 13.49);
    assert.strictEqual(result.report.status, "adjusted");
    assert.strictEqual(result.report.tierUsed, 3);
    assert.deepStrictEqual(JSON.parse(JSON.stringify(result.report.violations)), []);
  });

  t.test("golden-master (seed=7): volumen alto/Amplio -- agregados exactos del resultado actual", function () {
    var s = freshEngineSandbox();
    seedRandomInContext(s, 7);
    var built = buildProfileAndData(s, PROFILES[2]);
    var result = s.generateDietPlan(built.profile, built.data);

    assert.deepStrictEqual(JSON.parse(JSON.stringify(result.meals.map(function (m) { return m.key; }))), EXPECTED_MEAL_KEYS);
    assert.deepStrictEqual(JSON.parse(JSON.stringify(result.meals.map(function (m) { return m.items.length; }))), [3, 3, 3, 3, 2]);
    assert.strictEqual(result.total.kcal, 3332.1);
    assert.strictEqual(result.total.protein, 191);
    assert.strictEqual(result.total.carbs, 458.6);
    assert.strictEqual(result.total.fat, 61.599999999999994);
    assert.strictEqual(result.total.cost, 8.799999999999999);
    assert.strictEqual(result.total.purchaseCost, 24.2);
    assert.strictEqual(result.report.status, "adjusted");
    assert.strictEqual(result.report.tierUsed, 1);
    assert.deepStrictEqual(JSON.parse(JSON.stringify(result.report.violations)), [{ type: "cap25", meal: "lunch", item: "Arroz blanco cocido" }]);
  });
}

module.exports = { run: run };
