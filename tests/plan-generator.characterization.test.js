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

// Con presupuesto bajo el día se genera SIN snacks a propósito
// (NO_SNACK_BUDGET_THRESHOLD en plan-generator.js, 2026-09-01): tres
// comidas de verdad en vez de cinco raciones pequeñas. No es un ahorro
// (se midió: la compra sale igual), es una decisión de calidad pedida por
// el usuario. El perfil "Presupuesto exacto muy ajustado" cae en esta rama.
var EXPECTED_MEAL_KEYS_NO_SNACKS = ["breakfast", "lunch", "dinner"];
var NO_SNACK_BUDGET = 10;

/** Claves esperadas para un presupuesto dado. */
function expectedKeysFor(budget) {
  return (typeof budget === "number" && budget < NO_SNACK_BUDGET)
    ? EXPECTED_MEAL_KEYS_NO_SNACKS : EXPECTED_MEAL_KEYS;
}

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

  // ── 0. Integridad del plato: se sirve LO QUE DICE LA RECETA ──────────
  // Añadido 2026-09-02 tras encontrar que el plan servía platos a los que
  // les faltaba un ingrediente propio. Dos sitios BORRABAN ingredientes
  // cuando quedaban por debajo de un umbral: enforcePurchaseBudgetCap
  // (plan-generator.js) y removeLeastUsefulItem (meal-helpers.js). Los dos
  // elegían "el peor" por proteína/coste, criterio con el que una verdura
  // pierde SIEMPRE -- no tiene proteína y sí cuesta abrir una bolsa.
  //
  // Medido antes del arreglo, sobre 1.000 tomas: al 5,7% le faltaba un
  // ingrediente, y en 52 casos era justo el del nombre del plato ("Huevo
  // duro con zanahoria" sin zanahoria, "Jamón serrano con manzana" sin
  // manzana). Después: 0. Ahora los dos sitios solo REDUCEN, con suelo, y
  // el recorte de presupuesto además DESHACE cualquier recorte que no
  // abarate la compra de verdad.
  t.test("ninguna toma pierde un ingrediente de su receta (los dos recortes reducen, nunca borran)", function () {
    var missing = [];
    runsByProfile.forEach(function (rp) {
      rp.runs.forEach(function (result, i) {
        result.meals.forEach(function (meal) {
          var dish = sandbox.DISH_DB.filter(function (d) { return d.name === meal.dishName; })[0];
          if (!dish) return;
          dish.items.forEach(function (ing) {
            var served = (meal.items || []).filter(function (x) { return x.name === ing.name; })[0];
            if (!served || !(served.grams > 0)) {
              missing.push(rp.def.name + " (run " + i + ") " + dish.name + " -> sin " + ing.name);
            }
          });
        });
      });
    });
    assert.deepStrictEqual(missing.slice(0, 6), [],
      missing.length + " toma(s) servidas sin un ingrediente de su propia receta");
  });

  // ── 1. Estructura: siempre 5 comidas, claves correctas, en orden ────────
  t.test("generateDietPlan devuelve las tomas correctas (5, o 3 sin snacks con presupuesto bajo) en orden, en los 5 perfiles x " + ITERATIONS_PER_PROFILE + " corridas", function () {
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
          keys, expectedKeysFor(rp.data.budget),
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

  // ── 6b. Cordura de porciones (bug real 2026-08-26) ───────────────────────
  // El usuario recibió un plan con 1020 g de patata en un día Y la orden de
  // comprar DOS bolsas de 1 kg. Estos dos tests fijan que ninguna de las
  // dos cosas puede volver, sobre la aleatoriedad REAL (no sembrada) de
  // todos los perfiles -- son invariantes, no golden-masters.
  t.test("ningún ingrediente supera su tope diario de cordura (2,5x la mayor ración curada)", function () {
    runsByProfile.forEach(function (rp) {
      rp.runs.forEach(function (result, i) {
        var caps = sandbox.getCuratedPortionCaps();
        var totals = {};
        result.meals.forEach(function (meal) {
          meal.items.forEach(function (item) {
            totals[item.name] = (totals[item.name] || 0) + item.grams;
          });
        });
        Object.keys(totals).forEach(function (name) {
          // Cota ABSOLUTA, independiente de PORTION_CAP_MULTIPLIER. Sin
          // ella este test sería tautológico: compara contra la misma
          // constante que configura el tope, así que subir la constante lo
          // haría pasar siempre. 800 g codifica la queja real del usuario
          // (recibió 1020 g de patata) con margen sobre el peor caso
          // medido tras el arreglo (625 g).
          assert.ok(
            totals[name] <= 800,
            rp.def.name + " (run " + i + "): " + name + " llega a " +
            Math.round(totals[name]) + " g en un solo día -- ración absurda"
          );

          if (!caps[name]) return;
          // +1 g de holgura: el reparto entre tomas redondea a gramo entero.
          assert.ok(
            totals[name] <= caps[name] + 1,
            rp.def.name + " (run " + i + "): " + name + " llega a " +
            Math.round(totals[name]) + " g, por encima del tope " + Math.round(caps[name]) + " g"
          );
        });
      });
    });
  });

  t.test("ningún ingrediente abre un paquete para usar menos del 20% de él", function () {
    runsByProfile.forEach(function (rp) {
      rp.runs.forEach(function (result, i) {
        var totals = {};
        result.meals.forEach(function (meal) {
          meal.items.forEach(function (item) {
            totals[item.name] = (totals[item.name] || 0) + item.grams;
          });
        });
        Object.keys(totals).forEach(function (name) {
          var pkg = sandbox.resolvePackageInfo(name, "mercadona");
          if (!pkg || !pkg.packageSizeG) return;

          var packs = Math.ceil(totals[name] / pkg.packageSizeG);
          if (packs < 2) return;

          var lastPackUse = totals[name] - (packs - 1) * pkg.packageSizeG;
          assert.ok(
            lastPackUse > pkg.packageSizeG * 0.20,
            rp.def.name + " (run " + i + "): " + name + " pide " + Math.round(totals[name]) +
            " g con envases de " + pkg.packageSizeG + " g -- abre un paquete para usar solo " +
            Math.round(lastPackUse) + " g (" + Math.round(lastPackUse / pkg.packageSizeG * 100) + "%)"
          );
        });
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
  // ── RECAPTURA 2026-08-26: cordura de porciones ────────────────────────
  // applyPortionSanity() (plan-generator.js) añade un post-pase que topa
  // las raciones diarias, COMPENSA las kcal que el tope se lleva, y ajusta
  // al borde de envase. Cambio DELIBERADO del algoritmo, así que estos
  // agregados se recapturan a propósito, no en silencio.
  //
  // Los dos golden-masters se acercan a su objetivo, no se alejan:
  //   seed=42: 3039.0 -> 2822.1 kcal (objetivo 2822: +7,7% -> exacto)
  //   seed=7:  3332.1 -> 3793.2 kcal (objetivo 3871: -13,9% -> -2,0%)
  // seed=7 pasa de tierUsed 1/"adjusted" a 0/"perfect" y pierde su
  // violación cap25 justamente porque ya no depende de una ración enorme
  // de arroz para llegar a las calorías.
  //
  // Los 7 tests de invariantes #1-7 NO se tocaron y siguen pasando.
  // ── RECAPTURA 2026-08-31: nutrición real por ingrediente (USDA FDC) ───
  // 31 roles pasaron de sin resolver a resueltos con valores de USDA
  // FoodData Central (cebolla, ajo, plátano, brócoli, salmón, tempeh,
  // avena, pasta/arroz/cuscús/trigo sarraceno cocidos, etc.). Cambian los
  // macros por ingrediente -> cambia scaleFactor en buildMealFromDish ->
  // otra composición gana la lotería para la misma semilla. Cambio en los
  // DATOS, no en el algoritmo; los 7 tests de contrato NO se tocaron.
  //   seed=42: 2822.1 -> 2884.1 kcal (objetivo 2822: +2,2%), y pasa de
  //            tierUsed 2/"adjusted" a 0/"perfect", 0 violaciones.
  //   seed=7:  3793.2 -> 3795.2 kcal (objetivo 3871: -2,0%), sin cambio de
  //            tier ni de estado.
  // ── RECAPTURA 2026-08-31b: 14 platos españoles nuevos (T4) ───────────
  // dishes.js pasa de 334 a 348 platos. El pool de la lotería crece, así
  // que otra composición gana para seed=7. seed=42 NO se movió. Cambio en
  // los DATOS (catálogo), no en el algoritmo; los 7 tests de contrato y el
  // invariante de tolerancia de calorías (#6, sobre muchas semillas)
  // siguen pasando.
  //   seed=7: 3795.2 -> 3351.2 kcal, items [3,3,3,2,3] -> [3,4,4,2,2],
  //           sigue "perfect"/tier 0, 0 violaciones, dentro de la
  //           tolerancia del 15% del propio informe.
  // ── RECAPTURA 2026-09-01c: no repetir plato dentro del mismo día ─────
  // Cambia el ALGORITMO, no solo los datos (a diferencia de las dos
  // recapturas anteriores): pickDish ahora FILTRA los platos que ya salen
  // hoy en vez de solo penalizarlos. La penalización (-10 en
  // diversityScore) se perdía en la rama `tight`, donde la diversidad pesa
  // 1: el 14% de los planes repetía un plato, casi siempre el snack, porque
  // snack y snack2 comparten categoría. Medido tras el filtro: 0 de 200 a
  // 8 EUR y 0 de 200 a 16 EUR, con las kcal y el coste medios intactos.
  //
  //   seed=42: 2664.0 -> 2747.9 kcal, compra 12,67 -> 13,99 EUR, vuelve a tier 0
  //   seed=7:  3825.0 -> 3756.2 kcal, compra 18,77 -> 19,50 EUR, sigue "perfect"

  // ── RECAPTURA 2026-09-01b: 16 platos llanos (proteína + guarnición) ──
  // dishes.js 348 -> 364. Antes NO había ni un solo plato principal de dos
  // ingredientes (los 42 que había eran todos snacks) ni gречka con carne:
  // faltaba justo "pollo con arroz", que es lo que come medio mundo. Los
  // nuevos entran de verdad en la selección -- seed=42 elige "Cerdo con
  // pasta" y seed=7 "Pollo con trigo sarraceno".
  //
  //   seed=42: 2790.8 -> 2664.0 kcal, compra 13,11 -> 12,67 €, pasa a tier 1
  //   seed=7:  3797.0 -> 3825.0 kcal, compra 19,49 -> 18,77 €, vuelve a tier 0 "perfect"
  // Cambia el CATÁLOGO, no el algoritmo.

  // ── RECAPTURA 2026-09-01: tramos de presupuesto 8/12/16/20 ───────────
  // Los presets cambiaron de 15/20/28 a 8/12/16/20 (js/data/budget-presets.js),
  // así que estos dos perfiles se generan ahora con MENOS dinero: seed=42
  // pasa de 20 € a 16 € y seed=7 de 28 € a 20 €. Con menos presupuesto el
  // motor elige otros platos -- es exactamente lo que debe pasar.
  //
  // Cambia el DATO de entrada, no el algoritmo: la puntuación en modo
  // "equilibrado" (el de estos perfiles) es idéntica byte a byte, porque el
  // nuevo eje de prioridad suma 0 salvo en "saciante"/"proteína".
  //
  //   seed=42: 2884.1 -> 2790.8 kcal, compra 19,03 € -> 13,11 €, sigue "perfect"
  //   seed=7:  3351.2 -> 3797.0 kcal, compra 19,49 €, pasa a tier 2 "adjusted"
  //            (con 20 € en vez de 28 hace falta relajar para llegar a 3.800)
  // Ninguno tiene violaciones: los dos planes siguen siendo válidos.
  t.test("INVARIANTE: ningun plato se repite dentro del mismo dia", function () {
    // snack y snack2 comparten categoria, asi que compiten por los mismos
    // platos: era ahi donde se colaba el 14% de repeticiones.
    runsByProfile.forEach(function (rp) {
      rp.runs.forEach(function (result, i) {
        // "Opción no disponible" NO es un plato repetido: es el marcador de
        // que a esa toma no se le encontró NADA. Que aparezca dos veces
        // significa que el presupuesto no da para dos tomas, no que el
        // selector haya repetido. Se excluye del invariante (2026-09-02:
        // salió al corregir los precios, cuando el perfil de 2,50 EUR/día
        // dejó de poder montar ni media comida -- que es la verdad).
        var names = result.meals.map(function (m) { return m.dishName; })
          .filter(function (n) { return n !== "Opción no disponible"; });
        var seen = {};
        names.forEach(function (n) {
          assert.ok(!seen[n], rp.def.name + " (run " + i + "): plato repetido en el mismo dia -> " + n);
          seen[n] = true;
        });
      });
    });
  });

  t.test("golden-master (seed=42): recomposición/Equilibrado -- agregados exactos del resultado actual", function () {
    var s = freshEngineSandbox();
    seedRandomInContext(s, 42);
    var built = buildProfileAndData(s, PROFILES[1]);
    var result = s.generateDietPlan(built.profile, built.data);

    // JSON round-trip: normaliza arrays/objetos creados en el sandbox vm
    // (realm distinto) antes de comparar contra literales del host -- ver
    // comentario del test #1 más arriba para el motivo completo.
    assert.deepStrictEqual(JSON.parse(JSON.stringify(result.meals.map(function (m) { return m.key; }))), EXPECTED_MEAL_KEYS);
    // RECAPTURADO el 2026-09-02 (4), con los datos que el USUARIO comprobó
    // uno a uno en la tienda: abrió la ficha de los 85 ingredientes y anotó
    // el precio y el peso reales. 49 pesos de envase y 9 precios corregidos.
    //
    // Los pesos eran lo que más fallaba, y casi siempre en la misma
    // dirección: el envase modelado era una porción imaginaria en vez del
    // formato que se vende. Una coliflor son 1,04 kg, no 500 g; un
    // calabacín 403 g, no 200; el ajo se compra en malla de 250 g, no por
    // dientes de 5 g; la piña entera pesa 1,83 kg. Y las latas van por peso
    // ESCURRIDO (sardinas 2 x 84 g, atún 6 x 60 g), que es lo que se come.
    //
    // ── RECAPTURADO OTRA VEZ el 2026-09-02 (5): los 3 fantasmas ─────────
    // Salen del catálogo trigo sarraceno, tempeh y picada de pavo, que
    // Mercadona NO VENDE (comprobado hoja a hoja), y entra "Carne picada
    // mixta". Son 27 platos renombrados, así que la lotería ponderada
    // reparte distinto para la MISMA semilla -- el caso de siempre: el
    // cambio es deliberado y en los DATOS, no en el algoritmo.
    //
    // Es mejor plan que el anterior, no peor:
    //   kcal      2795.1 -> 2809.1  (objetivo 2822: -0,95% -> -0,46%)
    //   compra    15,91 -> 14,96 EUR (tope 16, sigue por debajo)
    //   proteína  186,9 -> 199,2 g   (objetivo 156, de sobra)
    // Lo que empeora es la ETIQUETA: perfect/tier 0 -> adjusted/tier 1. El
    // motor necesita un escalón más de relajación para cuadrar el día
    // porque ya no puede tirar de los platos inexistentes. Se apunta tal
    // cual en vez de disimularlo: `violations` sigue vacío y el tope duro
    // de presupuesto nunca se toca.
    // ── RECAPTURADO el 2026-09-02 (6): carne y pescado por su MEDIA ────
    // El usuario abrió la ficha del cerdo en la tienda y no cuadraba: la
    // app cobraba el precio de UN corte ("Filetes lomo de cerdo cabeza",
    // 6,30 EUR/kg) como si fuera "el" cerdo, y al no tener envase cobraba
    // solo los gramos usados. Ahora nueve roles de carne/pescado usan el
    // precio MEDIO de sus cortes reales y el peso MEDIO de la bandeja.
    //
    // Este día mejora en lo que importa: 2809,1 -> 2821,9 kcal sobre un
    // objetivo de 2822 (queda a 0,1 kcal) y la compra baja de 14,96 a
    // 14,21 EUR. La proteína cae de 199,2 a 151,9 g -- por debajo del
    // objetivo de 156 por primera vez, aunque dentro de tolerancia
    // (`violations` sigue vacío): con la bandeja entera, la carne sale
    // cara y el motor la cambia por huevos, sardinas y salchichas.
    assert.deepStrictEqual(JSON.parse(JSON.stringify(result.meals.map(function (m) { return m.items.length; }))), [3, 3, 2, 2, 2]);
    assert.strictEqual(result.total.kcal, 2821.9);
    assert.strictEqual(result.total.protein, 151.9);
    assert.strictEqual(result.total.carbs, 325.59999999999997);
    assert.strictEqual(result.total.fat, 100.3);
    assert.strictEqual(result.total.cost, 5.47);
    assert.strictEqual(result.total.purchaseCost, 14.21);
    assert.strictEqual(result.report.status, "adjusted");
    assert.strictEqual(result.report.tierUsed, 1);
    assert.deepStrictEqual(JSON.parse(JSON.stringify(result.report.violations)), []);
  });

  t.test("golden-master (seed=7): volumen alto/Amplio -- agregados exactos del resultado actual", function () {
    var s = freshEngineSandbox();
    seedRandomInContext(s, 7);
    var built = buildProfileAndData(s, PROFILES[2]);
    var result = s.generateDietPlan(built.profile, built.data);

    assert.deepStrictEqual(JSON.parse(JSON.stringify(result.meals.map(function (m) { return m.key; }))), EXPECTED_MEAL_KEYS);
    // RECAPTURADO el 2026-09-02 (4) -- ver el comentario del golden-master
    // de seed=42. Baja a adjusted/tier 1: con los envases reales, un día de
    // volumen dentro de 20 EUR va más justo. Es la verdad, no una regresión.
    //
    // RECAPTURADO OTRA VEZ el 2026-09-02 (5), misma causa que seed=42: los
    // 27 platos renombrados al quitar sarraceno/tempeh/pavo picado.
    //   kcal      3863 -> 3871,1  (objetivo 3871: -0,21% -> CLAVADO)
    //   compra    18,46 -> 19,34 EUR (tope 20, sigue por debajo)
    //   proteína  223,6 -> 185,3 g   (objetivo 171, sigue por encima)
    // Sube a tier 2 por lo mismo que seed=42 y se anota igual. La proteína
    // cae 38 g porque el día que gana la lotería ahora es de garbanzos y
    // frutos secos en vez de carne, pero sigue sobre el objetivo y
    // `violations` sigue vacío.
    // ── RECAPTURADO el 2026-09-02 (6) -- ver seed=42 ───────────────────
    // Este es el caso incómodo y se apunta tal cual: el plan SE PASA del
    // presupuesto, 20,54 EUR sobre 20, y baja a minimal/tier 4.
    //
    // No es que el motor mienta: declara la violación "budget" con su
    // exceededBy, que es exactamente el contrato que exigen
    // budget-purchase.test.js y budget-mode.test.js ("si se pasa, que lo
    // diga"). Lo que se rompe no es una promesa, es la suerte de esta
    // semilla.
    //
    // La causa es el GRANULADO DE ENVASE, no el precio de la carne: este
    // día no lleva ni un gramo de carne de bandeja. Son cinco tomas con
    // cinco básicos distintos (avena, lentejas, garbanzos, edamame,
    // yogur) y por tanto cinco paquetes enteros -- 6,82 EUR de comida
    // usada dentro de 20,54 EUR de compra. Medido en 150 generaciones,
    // pasa en el 4% de los días de 20 EUR (antes, 1%).
    assert.deepStrictEqual(JSON.parse(JSON.stringify(result.meals.map(function (m) { return m.items.length; }))), [4, 3, 3, 2, 2]);
    assert.strictEqual(result.total.kcal, 3831.2);
    assert.strictEqual(result.total.protein, 188.60000000000002);
    assert.strictEqual(result.total.carbs, 623.2);
    assert.strictEqual(result.total.fat, 51.7);
    assert.strictEqual(result.total.cost, 6.82);
    assert.strictEqual(result.total.purchaseCost, 20.54);
    assert.strictEqual(result.report.status, "minimal");
    assert.strictEqual(result.report.tierUsed, 4);
    assert.deepStrictEqual(
      JSON.parse(JSON.stringify(result.report.violations)),
      [{ type: "budget", exceededBy: 0.54, purchaseCost: 20.54, usageCost: 6.82 }]);
  });
}

module.exports = { run: run };
