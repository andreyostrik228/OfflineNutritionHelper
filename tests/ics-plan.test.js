/**
 * tests/ics-plan.test.js
 * ─────────────────────────────────────────────────────────────────────────
 * Exportación .ics con un plan REAL generado por el motor del proyecto (el
 * mismo camino que app.js: generateDietPlanDays + computeMealSchedule), no
 * con días escritos a mano. La aleatoriedad va con semilla fija
 * (tests/lib/seed-random.js) y las fechas son fijas ("2026-10-19").
 * ─────────────────────────────────────────────────────────────────────────
 */

var assert = require("assert");
var path = require("path");
var loadBrowserGlobals = require("./lib/load-browser-globals").loadBrowserGlobals;
var seedModulo = require("./lib/seed-random");

function projPath(rel) { return path.join(__dirname, "..", rel); }

var ARCHIVOS_MOTOR = [
  "js/data/dishes.js", "js/data/real-products.js", "js/data/packaging.js", "js/data/servings.js",
  "js/data/real-ingredient-matches.js", "js/data/ingredient-nutrition.js", "js/data/no-cook-classifier.js",
  "js/data/prices/mercadona.js", "js/data/budget-presets.js", "js/core/utils.js", "js/core/pricing.js",
  "js/core/servings.js", "js/core/nutrition.js", "js/core/budget.js", "js/core/calculator.js",
  "js/core/meal-helpers.js", "js/engine/dish-selector.js", "js/engine/plan-generator.js",
  "js/core/meal-schedule.js", "js/core/ics-export.js"
].map(projPath);

/** Motor cargado con la semilla fija y el perfil del formulario por defecto. */
function motorConSemilla() {
  var s = loadBrowserGlobals(ARCHIVOS_MOTOR);
  seedModulo.seedRandomInContext(s, 7);
  var perfil = s.calculateProfile({ age: 32, sex: "female", weight: 62, height: 165, activity: 1.375, workouts: 3, goal: "cut" });
  var presupuesto = s.resolveBudget({ budgetMode: "small", budgetCustom: NaN });
  var datos = { budget: presupuesto, cookTime: 20, taste: "mixed", store: "mercadona" };
  return { s: s, perfil: perfil, datos: datos };
}

/** Genera N días como lo hace app.js: horario por día con las horas del formulario (07:00 y 23:00). */
function generarDias(m, n) {
  return m.s.generateDietPlanDays(m.perfil, m.datos, n, function (day) {
    day.meals = m.s.computeMealSchedule(day.meals, { wakeTime: "07:00", sleepTime: "23:00" });
  });
}

function sello() { return new Date(Date.UTC(2026, 9, 18, 9, 0, 0)); }

function lineasDe(texto) { return texto.split("\r\n").filter(function (l) { return 0 < l.length; }); }

function run(t) {

  t.test("un plan real de 3 días da 3 fechas en DTSTART y tantos eventos como tomas con hora", function () {
    var m = motorConSemilla();
    var dias = generarDias(m, 3);
    assert.strictEqual(dias.length, 3, "el motor debe dar 3 días");
    var texto = m.s.icsComidasDias(dias, "2026-10-19", { sello: sello() });
    var inicios = lineasDe(texto).filter(function (l) { return l.indexOf("DTSTART:") === 0; });
    var fechas = inicios.map(function (l) { return l.slice(8, 16); });
    var unicas = fechas.filter(function (f, i) { return fechas.indexOf(f) === i; });
    assert.deepStrictEqual(unicas, ["20261019", "20261020", "20261021"]);
    var conHora = dias.reduce(function (total, d) {
      return total + (d.meals || []).filter(function (c) { return typeof c.timeMinutes === "number"; }).length;
    }, 0);
    assert.strictEqual(inicios.length, conHora, "un evento por toma con hora");
  });

  t.test("las horas de las tomas caen entre el despertar (07:00) y el sueño (23:00)", function () {
    var m = motorConSemilla();
    var texto = m.s.icsComidasDias(generarDias(m, 3), "2026-10-19", { sello: sello() });
    lineasDe(texto).filter(function (l) { return l.indexOf("DTSTART:") === 0; }).forEach(function (l) {
      var hora = Number(l.slice(17, 19)) * 60 + Number(l.slice(19, 21));
      assert.ok(420 <= hora && hora <= 1380, "hora fuera de la ventana: " + l);
    });
  });

  t.test("un plan real de 1 día sale igual que el calendario de las comidas de ese día", function () {
    var m = motorConSemilla();
    var dias = generarDias(m, 1);
    assert.strictEqual(dias.length, 1);
    var conDias = m.s.icsComidasDias(dias, "2026-10-19", { sello: sello() });
    var clasico = m.s.icsComidas(dias[0].meals, "2026-10-19", { sello: sello() });
    assert.strictEqual(conDias, clasico);
  });
}

module.exports = { run: run };
