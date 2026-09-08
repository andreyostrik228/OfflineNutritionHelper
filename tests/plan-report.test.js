/**
 * tests/plan-report.test.js
 * ─────────────────────────────────────────────────────────────────────────
 * describePlanReport() — que lo que el motor ya sabe LLEGUE al usuario.
 *
 * Por qué existe este fichero (medido el 2026-09-08): el motor redactaba
 * un `headline` honesto —"no ha sido posible montar un plan que quepa en
 * 8 €, el más ajustado necesita comprar 9,48 €"— y NADIE lo pintaba.
 * `report.headline`, `report.status`, `violations` y `relaxations` no se
 * leían en ningún fichero de `js/ui/`. El preset "Muy ajustado" (8 €)
 * incumple algo el 100% de los días en los tres perfiles medidos y el
 * usuario no veía ni una palabra.
 *
 * Lo que estos tests protegen, por orden de importancia:
 *   1. que un plan que NO cuadra lo diga: status + headline + avisos.
 *   2. que un tipo de violación NUEVO no desaparezca en silencio — es
 *      justo el modo de fallo que dejó esto invisible durante meses.
 *   3. que un plan perfecto no invente avisos.
 * ─────────────────────────────────────────────────────────────────────────
 */

var assert = require("assert");
var path = require("path");
var loadBrowserGlobals = require("./lib/load-browser-globals").loadBrowserGlobals;

function projPath(rel) {
  return path.join(__dirname, "..", rel);
}

/** Solo hace falta plan-generator.js: describePlanReport() no toca datos. */
function sandbox() {
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

/** Normaliza objetos creados dentro del sandbox vm (otro realm). */
function plano(x) {
  return JSON.parse(JSON.stringify(x));
}

function run(t) {
  var s = sandbox();

  t.test("un plan perfecto no inventa avisos ni ajustes", function () {
    var d = plano(s.describePlanReport({
      status: "perfect",
      headline: "Plan generado exactamente según tus preferencias.",
      violations: [],
      relaxations: []
    }));
    assert.strictEqual(d.status, "perfect");
    assert.deepStrictEqual(d.avisos, []);
    assert.deepStrictEqual(d.ajustes, []);
    assert.ok(d.headline.length > 0, "el headline del motor debe llegar tal cual");
  });

  t.test("un plan que se pasa del presupuesto lo cuenta, con la cifra", function () {
    var headline = "Con 8 € de presupuesto de compra no ha sido posible montar un plan " +
      "que quepa en Mercadona. El plan más ajustado necesita comprar 9.48 €.";
    var d = plano(s.describePlanReport({
      status: "minimal",
      headline: headline,
      violations: [{ type: "budget", exceededBy: 1.48, purchaseCost: 9.48, usageCost: 6.1 }],
      relaxations: []
    }));
    assert.strictEqual(d.status, "minimal");
    assert.strictEqual(d.headline, headline);
    // El aviso de presupuesto NO se repite: headline ya lo explica mejor.
    assert.deepStrictEqual(d.avisos, []);
  });

  t.test("falta de proteína y desvío de calorías se cuentan en gramos y %", function () {
    var d = plano(s.describePlanReport({
      status: "adjusted", headline: "x",
      violations: [{ type: "protein", deltaG: 43.1 }, { type: "calories", deltaPct: 12.4 }],
      relaxations: []
    }));
    assert.strictEqual(d.avisos.length, 2);
    assert.ok(/43[.,]1 g/.test(d.avisos[0]), "debe decir cuántos gramos faltan: " + d.avisos[0]);
    assert.ok(/12[.,]4%/.test(d.avisos[1]), "debe decir el % de desvío: " + d.avisos[1]);
  });

  t.test("los avisos por toma usan la etiqueta en español, no la clave interna", function () {
    var d = plano(s.describePlanReport({
      status: "adjusted", headline: "x",
      violations: [
        { type: "time", meal: "breakfast", exceededBy: 7 },
        { type: "cap25", meal: "lunch", item: "Arroz blanco cocido" }
      ],
      relaxations: []
    }));
    assert.ok(/Desayuno/.test(d.avisos[0]), "esperaba 'Desayuno', no 'breakfast': " + d.avisos[0]);
    assert.ok(/comida/i.test(d.avisos[1]), "esperaba 'comida', no 'lunch': " + d.avisos[1]);
    assert.ok(/Arroz blanco cocido/.test(d.avisos[1]), "debe nombrar el ingrediente: " + d.avisos[1]);
  });

  t.test("las relajaciones aplicadas llegan con su nota", function () {
    var d = plano(s.describePlanReport({
      status: "adjusted", headline: "x", violations: [],
      relaxations: [{ constraint: "taste", note: "Se incluyeron platos fuera de tu preferencia de sabor." }]
    }));
    assert.deepStrictEqual(d.ajustes, ["Se incluyeron platos fuera de tu preferencia de sabor."]);
  });

  // ── La anti-regresión que de verdad importa ────────────────────────────
  // El fallo original no fue un texto mal escrito: fue que algo que el
  // usuario debía ver no se pintaba y nadie se enteró. Un tipo de
  // violación nuevo NO puede caer en un `default:` vacío.
  t.test("un tipo de violación DESCONOCIDO no desaparece en silencio", function () {
    var d = plano(s.describePlanReport({
      status: "minimal", headline: "x",
      violations: [{ type: "un_tipo_que_no_existia_ayer" }],
      relaxations: []
    }));
    assert.strictEqual(d.avisos.length, 1, "un tipo nuevo debe producir aviso, no silencio");
    assert.ok(/un_tipo_que_no_existia_ayer/.test(d.avisos[0]),
      "el aviso debe nombrar el tipo crudo para que se note: " + d.avisos[0]);
  });

  t.test("sin informe no revienta", function () {
    var d = plano(s.describePlanReport(null));
    assert.strictEqual(d.status, "unavailable");
    assert.deepStrictEqual(d.avisos, []);
  });

  // ── Contra el motor real, no contra literales ─────────────────────────
  // Un fixture escrito a mano puede describir un informe que el motor ya
  // no produce. Este test genera un día IMPOSIBLE de verdad (8 € para un
  // objetivo de volumen) y comprueba que se cuenta.
  t.test("un día real imposible (8 € y 3.871 kcal) se describe como tal", function () {
    var profile = s.calculateProfile({
      age: 24, sex: "male", weight: 90, height: 188, activity: 1.725, workouts: 6, goal: "bulk"
    });
    var result = s.generateDietPlan(profile, {
      budget: 8, cookTime: 35, taste: "savory", store: "mercadona"
    });
    var d = plano(s.describePlanReport(result.report));
    assert.strictEqual(d.status, "minimal", "un día de 3.871 kcal con 8 € no puede salir 'perfect'");
    assert.ok(/8 €/.test(d.headline), "el headline debe nombrar el presupuesto pedido: " + d.headline);
    assert.ok(d.headline.length > 40, "el headline debe explicar, no solo etiquetar");
  });
}

module.exports = { run: run };
