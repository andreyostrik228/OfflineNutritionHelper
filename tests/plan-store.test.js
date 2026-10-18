/**
 * tests/plan-store.test.js
 * ─────────────────────────────────────────────────────────────────────────
 * El plan que se muestra se guarda en este dispositivo y vuelve tras recargar
 * (js/core/plan-store.js). Se prueba con un plan REAL del motor (semilla
 * fija, como tests/ics-plan.test.js), con un almacenamiento falso que puede
 * fallar, y se comprueba que app.js y index.html están cableados así.
 * ─────────────────────────────────────────────────────────────────────────
 */

var assert = require("assert");
var fs = require("fs");
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
  "js/core/meal-schedule.js", "js/core/plan-store.js"
].map(projPath);

/** Motor con semilla fija y un plan real de N días, como lo deja app.js al generar. */
function planReal(n) {
  var s = loadBrowserGlobals(ARCHIVOS_MOTOR);
  seedModulo.seedRandomInContext(s, 7);
  var perfil = s.calculateProfile({ age: 32, sex: "female", weight: 62, height: 165, activity: 1.375, workouts: 3, goal: "cut" });
  var presupuesto = s.resolveBudget({ budgetMode: "small", budgetCustom: NaN });
  var datos = { budget: presupuesto, cookTime: 20, taste: "mixed", store: "mercadona" };
  var dias = s.generateDietPlanDays(perfil, datos, n, function (day) {
    day.meals = s.computeMealSchedule(day.meals, { wakeTime: "07:00", sleepTime: "23:00" });
  });
  return { s: s, dias: dias, perfil: perfil, datos: datos, report: dias[0].report };
}

/** Almacenamiento en memoria con la misma forma que localStorage. */
function almacenFalso() {
  var mapa = {};
  return {
    getItem: function (k) { return Object.prototype.hasOwnProperty.call(mapa, k) ? mapa[k] : null; },
    setItem: function (k, v) { mapa[k] = String(v); },
    removeItem: function (k) { delete mapa[k]; },
    _mapa: mapa
  };
}

/** Almacenamiento que lanza, como uno bloqueado o con la cuota llena. */
function almacenRoto() {
  function fallar() { throw new Error("SecurityError: almacenamiento bloqueado"); }
  return { getItem: fallar, setItem: fallar, removeItem: fallar };
}

/** Los datos tal como vuelven de JSON (sin undefined): así se compara lo guardado. */
function comoJson(v) { return JSON.parse(JSON.stringify(v)); }

function estadoDe(m) {
  return { dias: m.dias, store: "mercadona", dayOptions: { budget: m.datos.budget, cookTime: 20, taste: "mixed" }, profile: m.perfil, data: m.datos, report: m.report };
}

function run(t) {

  t.test("un plan real de 3 días se guarda y vuelve igual al leerlo", function () {
    var m = planReal(3);
    var almacen = almacenFalso();
    assert.strictEqual(m.s.planGuardar(almacen, estadoDe(m)), true);
    var leido = m.s.planLeer(almacen);
    assert.ok(leido, "tiene que leerse el plan guardado");
    assert.strictEqual(leido.dias.length, 3);
    assert.strictEqual(JSON.stringify(leido.dias), JSON.stringify(comoJson(m.dias)));
    assert.strictEqual(JSON.stringify(leido.profile), JSON.stringify(comoJson(m.perfil)));
    assert.strictEqual(JSON.stringify(leido.data), JSON.stringify(comoJson(m.datos)));
    assert.strictEqual(leido.store, "mercadona");
  });

  t.test("sin nada guardado, leer devuelve null", function () {
    var m = planReal(1);
    assert.strictEqual(m.s.planLeer(almacenFalso()), null);
  });

  t.test("un plan sin días o con un día sin tomas no se guarda", function () {
    var m = planReal(1);
    var almacen = almacenFalso();
    assert.strictEqual(m.s.planGuardar(almacen, { dias: [], profile: m.perfil, data: m.datos }), false);
    assert.strictEqual(m.s.planGuardar(almacen, { dias: [{ meals: [] }], profile: m.perfil, data: m.datos }), false);
    assert.strictEqual(m.s.planGuardar(almacen, null), false);
    assert.strictEqual(Object.keys(almacen._mapa).length, 0, "no tiene que quedar nada escrito");
  });

  t.test("un JSON roto, otra versión o un plan sin forma válida se ignoran sin lanzar", function () {
    var m = planReal(1);
    var casos = [
      "{no es json",
      JSON.stringify({ version: 2, dias: [{ meals: [{}] }], profile: {}, data: {} }),
      JSON.stringify({ version: 1, dias: [], profile: {}, data: {} }),
      JSON.stringify({ version: 1, dias: [{ meals: [] }], profile: {}, data: {} }),
      JSON.stringify({ version: 1, dias: [{ meals: [{}] }], profile: null, data: {} }),
      JSON.stringify({ version: 1, dias: [{ meals: [{}] }], profile: {}, data: "no es objeto" })
    ];
    casos.forEach(function (texto) {
      var almacen = almacenFalso();
      almacen.setItem("weekplate-plan-v1", texto);
      assert.strictEqual(m.s.planLeer(almacen), null, "no tiene que aceptar: " + texto);
    });
  });

  t.test("si el almacenamiento lanza, guardar devuelve false, leer null y borrar no lanza", function () {
    var m = planReal(1);
    var roto = almacenRoto();
    assert.strictEqual(m.s.planGuardar(roto, estadoDe(m)), false);
    assert.strictEqual(m.s.planLeer(roto), null);
    assert.doesNotThrow(function () { m.s.planBorrar(roto); });
  });

  t.test("sin almacenamiento (null) todo es seguro y no hace nada", function () {
    var m = planReal(1);
    assert.strictEqual(m.s.planGuardar(null, estadoDe(m)), false);
    assert.strictEqual(m.s.planLeer(null), null);
    assert.doesNotThrow(function () { m.s.planBorrar(null); });
  });

  t.test("planBorrar quita el plan guardado", function () {
    var m = planReal(2);
    var almacen = almacenFalso();
    m.s.planGuardar(almacen, estadoDe(m));
    m.s.planBorrar(almacen);
    assert.strictEqual(m.s.planLeer(almacen), null);
  });

  t.test("planAlmacen devuelve null cuando no hay window (y nunca lanza)", function () {
    var m = planReal(1);
    assert.strictEqual(m.s.planAlmacen(), null);
  });

  t.test("app.js guarda al generar y al cambiar un plato, borra al resetear y restaura al cargar", function () {
    var app = fs.readFileSync(projPath("js/app.js"), "utf8").replace(/\r\n/g, "\n");
    var veces = app.split("guardarPlanActual();").length - 1;
    assert.ok(veces >= 2, "guardarPlanActual() tiene que llamarse al generar y al cambiar un plato");
    assert.ok(app.indexOf("planBorrar(planAlmacen())") !== -1, "Resetear tiene que borrar el plan guardado");
    assert.ok(app.indexOf('safeInit("plan-restore", restaurarPlanGuardado)') !== -1, "al cargar hay que restaurar");
  });

  t.test("restaurar el plan NO genera ninguno nuevo", function () {
    var app = fs.readFileSync(projPath("js/app.js"), "utf8").replace(/\r\n/g, "\n");
    var inicio = app.indexOf("function restaurarPlanGuardado() {");
    assert.ok(inicio !== -1, "tiene que existir restaurarPlanGuardado");
    var fin = app.indexOf("\n  }\n", inicio);
    var cuerpo = app.slice(inicio, fin);
    assert.ok(cuerpo.indexOf("generateDietPlanDays") === -1, "la restauración no puede llamar al generador");
    assert.ok(cuerpo.indexOf("calculateProfile") === -1, "la restauración no puede recalcular el perfil");
  });

  t.test("la restauración va DESPUÉS del carrusel y de la lista de la compra, y ANTES del alta", function () {
    // renderDayDots usa _updateDayArrows, que se asigna en el carrusel: si la
    // restauración va antes, lanza y la lista de la compra se queda vacía.
    var app = fs.readFileSync(projPath("js/app.js"), "utf8").replace(/\r\n/g, "\n");
    var restaurar = app.indexOf('safeInit("plan-restore"');
    assert.ok(restaurar !== -1, "falta la restauración");
    ["day-carousel-init", "shopping-list-init"].forEach(function (etiqueta) {
      assert.ok(app.indexOf('safeInit("' + etiqueta + '"') < restaurar, "restaurar tiene que ir después de " + etiqueta);
    });
    assert.ok(restaurar < app.indexOf('safeInit("onboarding-init"'), "restaurar tiene que ir antes del alta");
  });

  t.test("al cargar, app.js dice a la bienvenida si hay plan guardado y la UI se lo pasa a la decisión", function () {
    var app = fs.readFileSync(projPath("js/app.js"), "utf8").replace(/\r\n/g, "\n");
    var ui = fs.readFileSync(projPath("js/ui/onboarding-ui.js"), "utf8").replace(/\r\n/g, "\n");
    assert.ok(app.indexOf("hasPlan: hasPlan") !== -1, "initOnboarding tiene que recibir hasPlan");
    assert.ok(ui.indexOf("hasPlan: !!o.hasPlan") !== -1, "la UI tiene que pasar hasPlan a nextOnboardingStep");
  });

  t.test("index.html carga js/core/plan-store.js antes de js/app.js", function () {
    var html = fs.readFileSync(projPath("index.html"), "utf8");
    var store = html.indexOf('src="js/core/plan-store.js');
    var app = html.indexOf('src="js/app.js');
    assert.ok(store !== -1, "falta la etiqueta de plan-store.js");
    assert.ok(store < app, "plan-store.js tiene que cargarse antes que app.js");
  });
}

module.exports = { run: run };
