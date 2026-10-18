/**
 * tests/entreno-preferencias.test.js
 * ─────────────────────────────────────────────────────────────────────────
 * Las preguntas nuevas del panel de entrenamientos llegan al generador:
 *   - duración de la sesión (30, 45 o 60 min): cuántos ejercicios caben.
 *   - ejercicios que no quiero hacer: se quitan del catálogo al elegir, en
 *     cualquiera de los idiomas en que tienen nombre.
 * ─────────────────────────────────────────────────────────────────────────
 */

var assert = require("assert");
var path = require("path");
var loadBrowserGlobals = require("./lib/load-browser-globals").loadBrowserGlobals;

function projPath(rel) { return path.join(__dirname, "..", rel); }

function sandbox() {
  return loadBrowserGlobals([
    projPath("js/data/exercises.js"),
    projPath("js/engine/workout-generator.js")
  ]);
}

var PERFIL = { entrenamientos: 4, goal: "recomp" };
var OPCIONES = { nivel: "intermedio", equipamiento: "gimnasio" };

function ejerciciosPorSesion(plan) {
  return plan.sesiones.map(function (s) { return s.exercises.length; });
}

function nombresDelPlan(plan) {
  var nombres = [];
  plan.sesiones.forEach(function (s) { s.exercises.forEach(function (e) { nombres.push(e.name); }); });
  return nombres;
}

function run(t) {

  t.test("duración 30 min: cada sesión lleva como mucho 4 ejercicios; 45 min, 5", function () {
    var s = sandbox();
    var treinta = s.generateWorkoutPlan(PERFIL, Object.assign({ duracion: 30 }, OPCIONES));
    var cuarenta = s.generateWorkoutPlan(PERFIL, Object.assign({ duracion: 45 }, OPCIONES));
    assert.ok(ejerciciosPorSesion(treinta).every(function (n) { return n <= 4; }), "30 min: " + ejerciciosPorSesion(treinta));
    assert.ok(ejerciciosPorSesion(cuarenta).every(function (n) { return n <= 5; }), "45 min: " + ejerciciosPorSesion(cuarenta));
  });

  t.test("sin duración, o con una que no existe, queda el tope del nivel (60 min)", function () {
    var s = sandbox();
    var base = s.generateWorkoutPlan(PERFIL, OPCIONES);
    var sesentaExplicito = s.generateWorkoutPlan(PERFIL, Object.assign({ duracion: 60 }, OPCIONES));
    var raro = s.generateWorkoutPlan(PERFIL, Object.assign({ duracion: 90 }, OPCIONES));
    assert.deepStrictEqual(ejerciciosPorSesion(sesentaExplicito), ejerciciosPorSesion(base));
    assert.deepStrictEqual(ejerciciosPorSesion(raro), ejerciciosPorSesion(base));
  });

  t.test("la duración también llega como texto (así la lee el panel)", function () {
    var s = sandbox();
    var plan = s.generateWorkoutPlan(PERFIL, Object.assign({ duracion: "30" }, OPCIONES));
    assert.ok(ejerciciosPorSesion(plan).every(function (n) { return n <= 4; }));
  });

  t.test("un ejercicio excluido en español no aparece en ninguna sesión", function () {
    var s = sandbox();
    var plan = s.generateWorkoutPlan(PERFIL, Object.assign({ excluir: "press de banca" }, OPCIONES));
    var nombres = nombresDelPlan(plan);
    assert.ok(nombres.length > 0, "el plan no puede quedarse vacío");
    nombres.forEach(function (n) {
      assert.ok(!/press de banca/i.test(n), "sale excluido: " + n);
    });
  });

  t.test("un ejercicio excluido en ruso no aparece (name_ru del catálogo)", function () {
    var s = sandbox();
    var plan = s.generateWorkoutPlan(PERFIL, Object.assign({ excluir: "жим" }, OPCIONES));
    var nombres = nombresDelPlan(plan);
    assert.ok(nombres.length > 0);
    nombres.forEach(function (n) {
      assert.ok(!/press de banca/i.test(n), "sale excluido: " + n);
    });
    // Y ningún ejercicio cuyo nombre en ruso contenga "жим".
    plan.sesiones.forEach(function (sesion) {
      sesion.exercises.forEach(function (e) {
        var catalogo = s.EXERCISE_CATALOG.filter(function (c) { return c.id === e.id; })[0];
        assert.ok(catalogo && catalogo.name_ru.toLowerCase().indexOf("жим") === -1, "sale excluido en ruso: " + catalogo.name_ru);
      });
    });
  });

  t.test("las exclusiones no distinguen mayúsculas ni acentos", function () {
    var s = sandbox();
    var plan = s.generateWorkoutPlan(PERFIL, Object.assign({ excluir: "SENTADÍLLA" }, OPCIONES));
    nombresDelPlan(plan).forEach(function (n) {
      assert.ok(!/sentadilla/i.test(n), "sale excluido: " + n);
    });
  });

  t.test("un término de menos de 3 letras no excluye nada, y el texto se separa por comas", function () {
    var s = sandbox();
    var base = s.generateWorkoutPlan(PERFIL, OPCIONES);
    var corto = s.generateWorkoutPlan(PERFIL, Object.assign({ excluir: "de, a" }, OPCIONES));
    assert.deepStrictEqual(nombresDelPlan(corto), nombresDelPlan(base));
    assert.strictEqual(JSON.stringify(s.normalizarExcluidos("Press, press ,  de,SENTADILLA")), JSON.stringify(["press", "sentadilla"]));
  });

  t.test("sin exclusiones el plan es el de siempre", function () {
    var s = sandbox();
    var base = s.generateWorkoutPlan(PERFIL, OPCIONES);
    var vacio = s.generateWorkoutPlan(PERFIL, Object.assign({ excluir: "" }, OPCIONES));
    assert.deepStrictEqual(nombresDelPlan(vacio), nombresDelPlan(base));
  });
}

module.exports = { run: run };
