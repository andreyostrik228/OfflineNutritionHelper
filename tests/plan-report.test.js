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

/** Los ficheros del motor, en el orden de index.html. */
var MOTOR = [
  "js/data/dishes.js", "js/data/real-products.js", "js/data/packaging.js", "js/data/servings.js",
  "js/data/real-ingredient-matches.js", "js/data/ingredient-nutrition.js", "js/data/no-cook-classifier.js",
  "js/data/prices/mercadona.js", "js/data/budget-presets.js",
  "js/core/pricing.js", "js/core/servings.js", "js/core/nutrition.js", "js/core/budget.js",
  "js/core/calculator.js", "js/core/meal-helpers.js",
  "js/engine/dish-selector.js", "js/engine/plan-generator.js"
];

/** Solo hace falta plan-generator.js: describePlanReport() no toca datos. */
function sandbox() {
  return loadBrowserGlobals([projPath("js/core/utils.js")].concat(MOTOR.map(projPath)));
}

/**
 * El mismo motor, pero con js/core/i18n.js y las tablas de todos los idiomas
 * servidos cargadas -- lo que hay en el navegador. `sandbox()` de arriba NO las
 * trae, a propósito: es el caso de los tests que cargan solo el motor, y
 * describePlanReport() tiene que seguir hablando español en él.
 */
function sandboxConIdiomas() {
  var ficheros = [projPath("js/core/utils.js"), projPath("js/core/i18n.js"), projPath("js/i18n/es.js")];
  require("fs").readdirSync(projPath("js/i18n")).forEach(function (f) {
    var m = /^([a-z]{2})\.js$/.exec(f);
    if (m && m[1] !== "es") ficheros.push(projPath("js/i18n/" + f), projPath("js/i18n/food-" + f), projPath("js/i18n/packages-" + f));
  });
  // Las tablas van delante del motor, como en index.html.
  return loadBrowserGlobals(ficheros.concat(MOTOR.map(projPath)));
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
  // ── El idioma del informe ──────────────────────────────────────────────
  // El informe se escribía en español dentro del motor y salía así en la caja
  // amarilla de una pantalla en ruso. Ahora guarda claves y números.

  /**
   * Informes de TODAS las formas: los cinco niveles de relajación (con y sin
   * problema de presupuesto, de uno y de varios días) y el error técnico.
   * Salen de buildCompromiseReport, el mismo que usa el motor, para que un
   * informe de prueba no pueda describir algo que el motor ya no produce.
   */
  function informesDeTodasLasFormas(m) {
    var perfil = m.calculateProfile({
      age: 28, sex: "male", weight: 78, height: 178, activity: 1.55, workouts: 4, goal: "bulk"
    });
    var tot = { kcal: 3000, protein: 140, carbs: 400, fat: 80, cost: 6, purchaseCost: 8.9 };
    var informes = [];
    function intento(tier, violaciones, total) {
      return { tier: tier, violations: violaciones, total: total || tot, meals: [] };
    }
    function de(intentoX, datos) {
      return plano(m.buildCompromiseReport(intentoX, perfil,
        Object.assign({ store: "mercadona", budget: 8, budgetPorDia: 8, planDays: 1, targetBudget: 7 }, datos || {})));
    }
    // Un informe por nivel de relajación, sin problema de presupuesto.
    for (var tier = 0; tier <= m.MAX_RELAXATION_TIER; tier++) informes.push(de(intento(tier, [])));
    // Con problema de presupuesto: de un día, de varios, y el «justo» (falta < 0,005 €).
    informes.push(de(intento(0, [{ type: "budget_infeasible" }])));
    informes.push(de(intento(2, [{ type: "budget", exceededBy: 0.9 }]), { planDays: 3, budgetPorDia: 8, budget: 8.24 }));
    informes.push(de(intento(1, [{ type: "budget" }], { kcal: 1, protein: 1, carbs: 1, fat: 1, cost: 5, purchaseCost: 8.003 })));
    // El error técnico del propio generateDietPlan: se fuerza a que el generador lance.
    m.generateDietPlanTiered = function () { throw new Error("fallo forzado por la prueba"); };
    var roto = m.generateDietPlan(perfil, { budget: 8, cookTime: 35, taste: "mixed", store: "mercadona" });
    assert.strictEqual(roto.report.status, "unavailable");
    informes.push(plano(roto.report));
    return informes;
  }

  /** Un informe con una violación de CADA tipo. */
  var INFORME_CON_TODOS_LOS_AVISOS = {
    status: "minimal", headline: "x",
    violations: [
      { type: "data_unavailable", category: "desayuno" },
      { type: "menu_simplified", category: "snack" },
      { type: "time", meal: "lunch", exceededBy: 7 },
      { type: "cap25", meal: "dinner", item: "Arroz blanco cocido" },
      { type: "calories", deltaPct: 12.4 },
      { type: "protein", deltaG: 23.8 },
      { type: "budget", exceededBy: 1 },
      { type: "un_tipo_que_no_existia_ayer" }
    ],
    relaxations: []
  };

  t.test("el informe real guarda CLAVES y números, además del texto en español", function () {
    var m = sandbox();
    var informes = informesDeTodasLasFormas(m);
    informes.forEach(function (r) {
      assert.ok(typeof r.headlineKey === "string" && /^ui\.plan_titular_/.test(r.headlineKey),
        "el titular no lleva clave: " + JSON.stringify(r.headline));
      assert.strictEqual(typeof r.headlineParams, "object");
      (r.relaxations || []).forEach(function (x) {
        assert.ok(typeof x.noteKey === "string" && /^ui\.plan_ajuste_/.test(x.noteKey), "la nota no lleva clave: " + x.note);
      });
    });
    // El texto en español sigue ahí (lo lee budget-mode.test.js y los informes viejos).
    assert.ok(informes.every(function (r) { return typeof r.headline === "string" && r.headline.length > 10; }));
  });

  t.test("la clave en español y el literal del motor dicen EXACTAMENTE lo mismo", function () {
    // El literal es el repliegue cuando no hay tablas; la clave, lo que ve el
    // español con tablas. Si una se toca sin la otra, el español cambia según
    // quién cargue qué. Se compara describePlanReport con y sin i18n.
    var sin = sandbox();
    var con = sandboxConIdiomas();
    con.saveLang("es");
    var informes = informesDeTodasLasFormas(sin).concat([plano(INFORME_CON_TODOS_LOS_AVISOS)]);
    informes.forEach(function (r) {
      assert.deepStrictEqual(plano(con.describePlanReport(r)), plano(sin.describePlanReport(r)));
    });
  });

  t.test("cada clave ui.plan_* de es.js la usa algún informe de los de arriba (ni huérfanas ni sin probar)", function () {
    var con = sandboxConIdiomas();
    con.saveLang("es");
    var sin = sandbox();
    var usadas = {};
    function apunta(k) { usadas[k] = 1; }
    informesDeTodasLasFormas(sin).forEach(function (r) {
      apunta(r.headlineKey);
      var p = r.headlineParams || {};
      if (p.margen && p.margen.key) apunta(p.margen.key);
      (r.relaxations || []).forEach(function (x) { apunta(x.noteKey); });
    });
    // Los avisos, y las categorías que nombran dos de ellos.
    var AVISOS = ["sin_platos", "simplificado", "tiempo", "tope25", "calorias", "proteina", "desconocido"];
    AVISOS.forEach(function (a) { apunta("ui.plan_aviso_" + a); });
    ["desayuno", "comida", "cena", "snack"].forEach(function (c) { apunta("ui.plan_categoria_" + c); });
    var definidas = Object.keys(con.I18N_TABLES.es).filter(function (k) {
      return /^ui\.plan_(titular|margen|ajuste|aviso|categoria)_/.test(k);
    });
    assert.ok(definidas.length >= 23, "solo " + definidas.length + " claves del informe");
    var sinUsar = definidas.filter(function (k) { return !usadas[k]; });
    assert.deepStrictEqual(sinUsar, [], "claves del informe que nadie usa: " + sinUsar.join(", "));
    var sinDefinir = Object.keys(usadas).filter(function (k) { return definidas.indexOf(k) === -1; });
    assert.deepStrictEqual(sinDefinir, [], "claves que el informe usa y no existen: " + sinDefinir.join(", "));
  });

  t.test("en ruso y en inglés el informe sale traducido: sin español, sin huecos sin rellenar", function () {
    var con = sandboxConIdiomas();
    var sin = sandbox();
    var detector = require("../scripts/i18n/detector");
    var informes = informesDeTodasLasFormas(sin).concat([plano(INFORME_CON_TODOS_LOS_AVISOS)]);
    ["ru", "en"].forEach(function (lang) {
      con.saveLang(lang);
      informes.forEach(function (r) {
        var d = plano(con.describePlanReport(r));
        // El titular de un informe SIN clave (el de prueba con todos los avisos,
        // o uno viejo) pasa tal cual y no es cosa de este test.
        var frases = (r.headlineKey ? [d.headline] : []).concat(d.avisos, d.ajustes);
        frases.forEach(function (f) {
          assert.ok(f.length > 5, lang + ": frase vacía");
          assert.ok(!/\{[A-Za-z0-9_]+\}/.test(f), lang + ": hueco sin rellenar en «" + f + "»");
          assert.ok(!/ui\.plan_/.test(f), lang + ": clave sin traducir en «" + f + "»");
          // El «aviso sin describir» enseña el tipo crudo (un identificador) a
          // propósito: para que un tipo nuevo no desaparezca en silencio.
          var motivos = detector.analizarTexto(f.replace(/un_tipo_que_no_existia_ayer|system_error/, ""), lang);
          assert.deepStrictEqual(motivos, [], lang + ": «" + f + "» -> " + motivos.join("; "));
        });
      });
    });
    con.saveLang("es");
  });

  t.test("el informe en ruso lleva los números del motor y la unidad del ruso", function () {
    var con = sandboxConIdiomas();
    var d;
    con.saveLang("ru");
    d = plano(con.describePlanReport(plano(INFORME_CON_TODOS_LOS_AVISOS)));
    var texto = d.avisos.join(" | ");
    assert.ok(/23\.8 г белка/.test(texto), texto);
    assert.ok(/12\.4%/.test(texto), texto);
    assert.ok(/на 7 мин больше/.test(texto), texto);
    // El ingrediente va traducido al pintar (Arroz blanco cocido -> ruso).
    assert.ok(!/Arroz/.test(texto), "el ingrediente tiene que ir traducido: " + texto);
    // La categoría, en nominativo, entre comillas.
    assert.ok(/«завтрак»/.test(texto) && /«перекус»/.test(texto), texto);
    // El mismo informe, en otro idioma, dice otra cosa: no está fijo en el informe.
    con.saveLang("en");
    var en = plano(con.describePlanReport(plano(INFORME_CON_TODOS_LOS_AVISOS)));
    assert.notStrictEqual(en.avisos[0], d.avisos[0]);
    assert.ok(/23\.8 g of protein/.test(en.avisos.join(" | ")));
    con.saveLang("es");
  });

  t.test("un informe viejo, sin claves, se pinta tal cual (los guardados antes de este cambio)", function () {
    var con = sandboxConIdiomas();
    con.saveLang("ru");
    var d = plano(con.describePlanReport({
      status: "adjusted", headline: "Texto viejo del motor.", violations: [],
      relaxations: [{ constraint: "taste", note: "Nota vieja." }]
    }));
    assert.strictEqual(d.headline, "Texto viejo del motor.");
    assert.deepStrictEqual(d.ajustes, ["Nota vieja."]);
    con.saveLang("es");
  });

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
