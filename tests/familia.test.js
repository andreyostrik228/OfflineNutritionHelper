/**
 * tests/familia.test.js
 * ─────────────────────────────────────────────────────────────────────────
 * Las personas de la casa y el menú de varias (2026-10-26): js/core/perfiles.js
 * (quién hay, de quién es cada clave, la cuenta), js/core/familia.js (quién
 * come, raciones, presupuesto) y el cuidado de cloud-sync.js y migration.js
 * para no mezclar los datos del titular con los de otra persona. La pantalla
 * entera se prueba con Chrome sin interfaz (scratchpad).
 * ─────────────────────────────────────────────────────────────────────────
 */

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var loadBrowserGlobals = require("./lib/load-browser-globals").loadBrowserGlobals;

function projPath(rel) { return path.join(__dirname, "..", rel); }
function leer(rel) { return fs.readFileSync(projPath(rel), "utf8"); }

function almacenFalso(inicial) {
  var mapa = {};
  Object.keys(inicial || {}).forEach(function (k) { mapa[k] = inicial[k]; });
  return {
    _mapa: mapa,
    getItem: function (k) { return Object.prototype.hasOwnProperty.call(mapa, k) ? mapa[k] : null; },
    setItem: function (k, v) { mapa[k] = String(v); },
    removeItem: function (k) { delete mapa[k]; }
  };
}

function conPerfiles(inicial, extra) {
  var s = loadBrowserGlobals([projPath("js/core/perfiles.js")].concat((extra || []).map(projPath)));
  s.localStorage = almacenFalso(inicial);
  return s;
}

function run(t) {
  t.test("sin personas añadidas está el titular, y sus claves son las de siempre", function () {
    var s = conPerfiles();
    var e = s.perfilesLeer();
    assert.strictEqual(e.activo, "titular");
    assert.strictEqual(e.lista.length, 1);
    assert.strictEqual(s.perfilClave("nutritionPlanner.settings.v1"), "nutritionPlanner.settings.v1");
    assert.strictEqual(s.perfilClave("weekplate-pesos-v1", "p123"), "weekplate-pesos-v1@p123");
  });

  t.test("añadir, elegir, renombrar y borrar: borrar se lleva todo lo de esa persona", function () {
    var s = conPerfiles();
    var mama = s.perfilCrear("  Мама  ");
    assert.ok(mama && mama.nombre === "Мама" && /^p[a-z0-9]+$/.test(mama.id));
    assert.strictEqual(s.perfilCrear("   "), null, "sin nombre, no");
    assert.ok(s.perfilElegir(mama.id));
    assert.strictEqual(s.perfilActivoId(), mama.id);
    assert.strictEqual(s.perfilClave("nutritionPlanner.settings.v1"), "nutritionPlanner.settings.v1@" + mama.id, "las claves, las suyas");
    s.localStorage.setItem("nutritionPlanner.settings.v1@" + mama.id, "{\"weight\":62}");
    s.localStorage.setItem("weekplate-pesos-v1@" + mama.id, "[]");
    assert.ok(s.perfilRenombrar(mama.id, "Mamá"));
    assert.strictEqual(s.perfilesLeer().lista[1].nombre, "Mamá");
    assert.ok(!s.perfilBorrar("titular"), "el titular no se borra");
    assert.ok(s.perfilBorrar(mama.id));
    assert.strictEqual(s.localStorage.getItem("nutritionPlanner.settings.v1@" + mama.id), null);
    assert.strictEqual(s.localStorage.getItem("weekplate-pesos-v1@" + mama.id), null);
    assert.strictEqual(s.perfilActivoId(), "titular", "si era la activa, vuelve el titular");
  });

  t.test("como mucho 8 personas, y lo guardado raro se sanea (titular primero, ids válidos)", function () {
    var s = conPerfiles();
    for (var i = 0; i < 9; i++) s.perfilCrear("P" + i);
    assert.strictEqual(s.perfilesLeer().lista.length, s.PERFILES_MAX);
    var r = conPerfiles({ "nutritionPlanner.perfiles.v1": JSON.stringify({ activo: "nadie", lista: [{ id: "pa1", nombre: "A" }, { id: "../x", nombre: "B" }, { id: "titular", nombre: "Yo" }] }) });
    var e = r.perfilesLeer();
    assert.strictEqual(e.lista.map(function (p) { return p.id; }).join(","), "titular,pa1");
    assert.strictEqual(e.activo, "titular");
  });

  t.test("cada módulo guarda lo de la persona activa (todas las claves pasan por perfilClave)", function () {
    var s = conPerfiles();
    var ficheros = {
      "js/core/settings.js": "nutritionPlanner.settings.v1", "js/core/weight-log.js": "weekplate-pesos-v1",
      "js/core/body-measures.js": "weekplate-medidas-v1", "js/ui/render-entreno.js": "weekplate-entreno-v1",
      "js/core/workout-log.js": "nutritionPlanner.entrenoDiario.v1", "js/core/plan-store.js": "weekplate-plan-v1",
      "js/core/shopping-checks.js": "nutritionPlanner.shoppingChecks.v1"
    };
    Object.keys(ficheros).forEach(function (f) {
      assert.ok(leer(f).indexOf('perfilClave("' + ficheros[f] + '")') !== -1, f);
      assert.ok(s.PERFIL_CLAVES_PROPIAS.indexOf(ficheros[f]) !== -1, ficheros[f] + " en la lista");
    });
    var html = leer("index.html");
    var i = html.indexOf('src="js/core/perfiles.js');
    ["settings.js", "weight-log.js", "plan-store.js", "shopping-checks.js", "workout-log.js"].forEach(function (f) {
      assert.ok(i !== -1 && i < html.indexOf('src="js/core/' + f), "perfiles.js antes que " + f);
    });
  });

  t.test("familia: datos de otra persona, raciones, presupuesto y compra multiplicada", function () {
    var s = conPerfiles({}, ["js/core/familia.js"]);
    assert.strictEqual(s.familiaDatosPersona(null, {}), null, "sin datos, fuera");
    assert.strictEqual(s.familiaDatosPersona({ age: 45, sex: "female", weight: 62 }, {}), null, "sin altura, fuera");
    var d = s.familiaDatosPersona({ age: 45, sex: "female", weight: 62, height: 165, goal: "maintain", steps: 6000, budgetMode: "high" }, { budget: 16, cookTime: 35, age: 30 });
    assert.ok(d.age === 45 && d.budget === 16 && d.cookTime === 35 && d.goal === "maintain", "lo del cuerpo es suyo; lo de la casa, del formulario");
    assert.strictEqual(s.familiaEscala(1830, 3149), 0.6);
    assert.strictEqual(s.familiaEscala(800, 3149), 0.3, "nunca menos de 0,3");
    assert.strictEqual(s.familiaSuma([{ escala: 1 }, { escala: 0.6 }], 1), 2.6);
    assert.strictEqual(s.familiaPresupuestoComun(26, "familia", 2.6), 10);
    assert.strictEqual(s.familiaPresupuestoComun(16, "persona", 2.6), 16);
    assert.strictEqual(s.familiaPresupuestoCada(30, "familia", 2000, 6000), 10);
    var tomas = [{ key: "lunch", items: [{ name: "Arroz", grams: 100, kcal: 130, cost: 0.2 }], total: { kcal: 130 } }];
    var escaladas = s.familiaEscalarTomas(tomas, 2.5);
    assert.strictEqual(escaladas[0].items[0].grams, 250);
    assert.strictEqual(escaladas[0].total.kcal, 325);
    assert.strictEqual(tomas[0].items[0].grams, 100, "las de la pantalla no se tocan");
    assert.deepStrictEqual(Array.prototype.slice.call(s.familiaDislikes([["Cebolla", "queso"], ["cebolla", "Atún"]])), ["Cebolla", "queso", "Atún"]);
  });

  t.test("familiaPlanear: la persona activa primero; quien no tiene datos se queda fuera; sola, null", function () {
    var s = conPerfiles({}, ["js/core/utils.js", "js/data/budget-presets.js", "js/core/calculator.js", "js/core/familia.js"]);
    var datos = { age: 30, sex: "male", weight: 80, height: 180, steps: 8500, activity: 1.55, workouts: 4, goal: "bulk", budget: 16, cookTime: 35 };
    var yo = s.calculateProfile(datos);
    assert.strictEqual(s.familiaPlanear(datos, yo, []), null, "sola: menú normal");
    var mama = s.perfilCrear("Мама");
    var misha = s.perfilCrear("Миша");
    s.localStorage.setItem("nutritionPlanner.settings.v1@" + mama.id, JSON.stringify({ age: 45, sex: "female", weight: 62, height: 165, goal: "maintain", steps: 6000, dislikes: ["atún"] }));
    s.familiaGuardar({ quienes: [mama.id, misha.id], modo: "comun", presupuesto: "familia", invitados: 1 });
    var f = s.familiaPlanear(datos, yo, ["cebolla"]);
    assert.strictEqual(f.personas.length, 2, "Misha no tiene datos");
    assert.strictEqual(f.personas[0].activo, true);
    assert.ok(f.personas[1].escala > 0.4 && f.personas[1].escala < 0.8, "Mamá come menos: " + f.personas[1].escala);
    assert.strictEqual(f.suma, Math.round((1 + f.personas[1].escala + 1) * 100) / 100);
    assert.strictEqual(f.presupuesto, "familia");
    assert.deepStrictEqual(Array.prototype.slice.call(f.personas[1].dislikes), ["atún"]);
  });

  t.test("la cuenta: las demás personas viajan aparte; al traerlas se rellena lo que falta y no se pisa nada", function () {
    var s = conPerfiles();
    var mama = s.perfilCrear("Мама");
    s.localStorage.setItem("nutritionPlanner.settings.v1@" + mama.id, "{\"weight\":62}");
    s.localStorage.setItem("weekplate-plan-v1@" + mama.id, "{\"grande\":true}");
    var bloque = s.perfilesParaNube();
    assert.ok(bloque.datos[mama.id]["nutritionPlanner.settings.v1"], "sus ajustes viajan");
    assert.ok(!bloque.datos[mama.id]["weekplate-plan-v1"], "su plan se queda en el dispositivo");
    assert.ok(!bloque.datos.titular, "el titular va por el camino de siempre");

    var otro = conPerfiles();
    var leo = otro.perfilCrear("Лео");
    otro.localStorage.setItem("nutritionPlanner.settings.v1@" + leo.id, "{\"weight\":30}");
    bloque.lista.push({ id: leo.id, nombre: "Лео" });
    bloque.datos[leo.id] = { "nutritionPlanner.settings.v1": "{\"weight\":99}" };
    otro.perfilesDesdeNube(bloque);
    var ids = otro.perfilesLeer().lista.map(function (p) { return p.id; });
    assert.ok(ids.indexOf(mama.id) !== -1, "Mamá llega");
    assert.strictEqual(otro.localStorage.getItem("nutritionPlanner.settings.v1@" + mama.id), "{\"weight\":62}");
    assert.strictEqual(otro.localStorage.getItem("nutritionPlanner.settings.v1@" + leo.id), "{\"weight\":30}", "lo que había no se pisa");
    otro.perfilesBorrarTodo();
    assert.strictEqual(otro.localStorage.getItem("nutritionPlanner.settings.v1@" + mama.id), null);
    assert.strictEqual(otro.perfilesLeer().lista.length, 1, "al cerrar sesión queda el titular");
  });

  t.test("con otra persona activa, subir ajustes no toca lo del titular y reconciliar no mezcla", function () {
    var s = loadBrowserGlobals([projPath("js/core/perfiles.js"), projPath("js/core/cloud-sync.js"), projPath("js/core/migration.js")]);
    s.localStorage = almacenFalso();
    var mama = s.perfilCrear("Мама");
    s.perfilElegir(mama.id);
    var subido = null;
    var guardados = 0;
    s.getSettings = function () { return { weight: 62 }; };
    s.saveSettings = function () { guardados++; };
    s.getCurrentUser = function () { return { id: "u1" }; };
    s.pullCloudUserData = function () { return Promise.resolve({ settings: { weight: 80, _pesos: [1] }, pantry_state: {}, pantry_history: [] }); };
    s._updateUserData = function (cols) { subido = cols; return Promise.resolve({ error: null }); };
    return s.pushSettingsToCloud().then(function () {
      assert.strictEqual(subido.settings.weight, 80, "lo del titular sale de la cuenta, no de Mamá");
      assert.ok(subido.settings._personas && subido.settings._personas.lista.length === 2, "y las personas, dentro");
      return s.runReconciliation();
    }).then(function (r) {
      assert.strictEqual(r.status, "perfil_no_titular");
      assert.strictEqual(guardados, 0, "nada del titular cae en las claves de Mamá");
    });
  });
}

module.exports = { run: run };
