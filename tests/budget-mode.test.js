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
var fs = require("fs");
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
    // 350 -> 1000 el 2026-09-02: el usuario abrió la ficha en Mercadona y
    // el tarro es de 1 kg a 5,00 EUR/kg, que es de donde sale el precio del
    // rol. Lo que este test protege no es el número, es que usar 23 g
    // obligue a pagar UN tarro entero.
    assert.strictEqual(purchase.packageSizeG, 1000);
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

  // ── Margen por dias de plan (2026-09-08) ──────────────────────────────
  // El motor genera cada dia por separado y comprobaba su presupuesto como
  // si ese dia fuera a la tienda solo. Es pesimista: medido sobre los
  // cuatro tramos y los tres objetivos, planificar 7 dias sale entre un 22%
  // y un 34% mas barato POR DIA, porque un paquete se paga una vez y rinde
  // en varios. Ahora un dia dentro de un plan de N puede gastar algo mas.
  //
  // Lo que estos tests protegen es la PROMESA, no la formula: la compra
  // real del plan, repartida entre sus dias, no puede superar lo que el
  // usuario eligio.

  t.test("budgetForPlanDays(): 1 dia no cambia nada; 3 y 7 dan el margen medido", function () {
    var s = freshFullEngineSandbox();
    assert.strictEqual(s.budgetForPlanDays(12, 1), 12, "un plan de 1 dia no comparte ningun paquete");
    assert.strictEqual(s.budgetForPlanDays(12, 3), 12.36, "x1,03: el mayor margen con 0% de planes por encima");
    assert.strictEqual(s.budgetForPlanDays(12, 7), 13.8, "x1,15: idem a 7 dias");
  });

  t.test("budgetForPlanDays(): sin dato de dias se comporta como 1 dia", function () {
    var s = freshFullEngineSandbox();
    [undefined, null, 0, -3, NaN, "7"].forEach(function (v) {
      assert.strictEqual(s.budgetForPlanDays(12, v), 12, "con " + JSON.stringify(v) + " no puede ampliarse el margen");
    });
  });

  // El GUARDIAN de verdad, y es determinista: el margen no puede pasar del
  // mas alto que se midio seguro. Con x1,35 a 7 dias ya se pasaba el 5% de
  // los planes, asi que ampliar la pendiente "un poco mas" tiene que doler
  // aqui y no en la compra de alguien.
  t.test("el margen por dias NUNCA pasa del x1,15 que se midio seguro", function () {
    var s = freshFullEngineSandbox();
    [1, 2, 3, 5, 7, 14, 30, 365].forEach(function (dias) {
      var m = s.budgetForPlanDays(12, dias);
      assert.ok(m <= 12 * 1.15 + 0.001,
        dias + " dias dan un margen de " + m + " EUR, por encima del x1,15 medido como seguro");
      assert.ok(m >= 12, dias + " dias no pueden dar MENOS de lo elegido");
    });
  });

  // Comprobacion de humo de la promesa: si se piden 12 EUR al dia, la
  // compra de la semana dividida entre 7 no puede pasar de 12.
  //
  // OJO con lo que este test NO hace: con 8 semillas y una tasa de fallo
  // del ~5% (la que da un margen x1,35) tiene dos tercios de posibilidades
  // de no ver nada. Comprobado por mutacion: subir la pendiente a 0,06 NO
  // lo hace fallar. Quien de verdad protege la promesa es el test de arriba
  // y la medicion escrita junto a PLAN_DAYS_BUDGET_SLOPE; esto solo detecta
  // una rotura gorda.
  t.test("humo: la compra de un plan de 7 dias, por dia, no supera lo elegido", function () {
    var s = freshFullEngineSandbox();
    var seedRandomInContext = require("./lib/seed-random").seedRandomInContext;
    var profile = s.calculateProfile({
      age: 32, sex: "female", weight: 62, height: 165, activity: 1.375, workouts: 3, goal: "cut"
    });
    var tope = 12;
    var peor = 0;
    for (var semilla = 1; semilla <= 8; semilla++) {
      seedRandomInContext(s, semilla);
      var data = { budget: tope, cookTime: 20, taste: "mixed", store: "mercadona", planDays: 7 };
      var todas = [];
      for (var d = 0; d < 7; d++) {
        data.dayIndex = d;
        var r = s.generateDietPlan(profile, data);
        r.meals.forEach(function (m) { todas.push(m); });
      }
      var compra = s.computeDayPurchaseCost(todas, "mercadona");
      var porDia = compra.lines.reduce(function (a, l) { return a + l.purchaseCost; }, 0) / 7;
      if (porDia > peor) peor = porDia;
    }
    assert.ok(peor <= tope,
      "el plan mas caro de los 8 sale a " + peor.toFixed(2) + " EUR/dia, por encima de los " + tope + " elegidos");
  });

  t.test("el aviso de presupuesto nombra lo que el usuario ELIGIO, no el margen interno", function () {
    var s = freshFullEngineSandbox();
    var profile = s.calculateProfile({
      age: 24, sex: "male", weight: 90, height: 188, activity: 1.725, workouts: 6, goal: "bulk"
    });
    // 5 EUR para 3.871 kcal no cabe ni con el margen de 7 dias (5,75 EUR).
    //
    // Aqui iban 8 EUR y el test fallo: con el margen por dias, 8 EUR para un
    // dia de volumen YA CABEN planificando la semana, cuando en un plan de un
    // solo dia no cabian nunca. Es el cambio funcionando, asi que el caso se
    // baja a 5 EUR en vez de aflojar la comprobacion.
    var r = s.generateDietPlan(profile, {
      budget: 5, cookTime: 35, taste: "savory", store: "mercadona", planDays: 7
    });
    var titular = String(r.report.headline);
    assert.ok(/5 € al día/.test(titular),
      "debe nombrar los 5 € que se eligieron: " + titular);
    assert.ok(/7 días/.test(titular),
      "y explicar que el margen sube porque se compra para 7 días: " + titular);
  });

  // ── Los textos de los tramos: una sola copia, y que se vea ──────────
  // Los cuatro nombres estaban escritos DOS veces: `label` en
  // budget-presets.js y a mano en index.html. Y de las dos, solo se pintaba
  // la del HTML -- ni `label` ni `hint` los leia nadie (2026-09-09).
  //
  // O sea que se podía renombrar un tramo en los datos, o reescribir su
  // explicación, y no cambiaba nada en pantalla. El `hint` de "Muy
  // ajustado" prometía "lo más barato que da un día completo" -- medido:
  // 0% de días sin recortes en los tres perfiles -- y nadie lo había visto
  // nunca porque no se pintaba.
  t.test("cada tramo de presupuesto tiene nombre, importe y explicación", function () {
    var s = freshCalculatorSandbox();
    var tramos = s.BUDGET_PRESETS[s.DEFAULT_BUDGET_PERIOD];
    var faltan = [];
    ["minimal", "small", "medium", "high"].forEach(function (k) {
      var p = tramos[k];
      if (!p) { faltan.push(k + ": no existe"); return; }
      if (typeof p.amount !== "number") faltan.push(k + ": sin importe");
      if (!p.label) faltan.push(k + ": sin nombre");
      if (!p.hint) faltan.push(k + ": sin explicación");
    });
    assert.deepStrictEqual(faltan, [], faltan.join(" | "));
  });

  t.test("el nombre del HTML no se ha separado del de los datos", function () {
    var s = freshCalculatorSandbox();
    var html = fs.readFileSync(projPath("index.html"), "utf8");
    var tramos = s.BUDGET_PRESETS[s.DEFAULT_BUDGET_PERIOD];
    var ids = { minimal: "budgetModeMinimal", small: "budgetModeSmall",
                medium: "budgetModeMedium", high: "budgetModeHigh" };
    var desviados = [];
    Object.keys(ids).forEach(function (k) {
      // El texto de repliegue que hay dentro del <label for="...">.
      var re = new RegExp('for="' + ids[k] + '"[\\s\\S]{0,200}?budget-chip__title">([^<]*)<');
      var m = html.match(re);
      if (!m) { desviados.push(k + ": no encuentro el chip en index.html"); return; }
      if (m[1].trim() !== tramos[k].label) {
        desviados.push(k + ': HTML dice "' + m[1].trim() + '" y los datos "' + tramos[k].label + '"');
      }
    });
    assert.deepStrictEqual(desviados, [], desviados.join(" | "));
  });

  t.test("index.html tiene dónde pintar la explicación del tramo", function () {
    var html = fs.readFileSync(projPath("index.html"), "utf8");
    assert.ok(/id="budgetHint"/.test(html),
      "sin #budgetHint los `hint` vuelven a ser datos muertos");
  });

  t.test("ningún texto de presupuesto enseña un hueco del generador", function () {
    var s = freshCalculatorSandbox();
    var tramos = s.BUDGET_PRESETS[s.DEFAULT_BUDGET_PERIOD];
    var rotos = [];
    Object.keys(tramos).forEach(function (k) {
      [tramos[k].label, tramos[k].hint].forEach(function (txt) {
        if (typeof txt === "string" && /(undefined|NaN|\[object Object\]|\$\{)/.test(txt)) {
          rotos.push(k + ": " + txt.slice(0, 60));
        }
      });
    });
    assert.deepStrictEqual(rotos, [], rotos.join(" | "));
  });

}

module.exports = { run: run };