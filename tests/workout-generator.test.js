/**
 * tests/workout-generator.test.js
 * ─────────────────────────────────────────────────────────────────────────
 * Plan de entrenamiento semanal (js/engine/workout-generator.js y el catálogo
 * js/data/exercises.js). Son reglas de sentido común que un plan bueno cumple:
 * no repetir ejercicios en la misma sesión, respetar el material y el nivel,
 * poner primero lo compuesto, dar al objetivo las series y repeticiones que
 * le tocan y no dar nada que el usuario no pueda hacer.
 *
 * Si una de estas reglas cambia a propósito, se cambia el test con un
 * comentario que diga por qué. No se afloja la aserción para que pase.
 * ─────────────────────────────────────────────────────────────────────────
 */

var assert = require("assert");
var path = require("path");
var loadBrowserGlobals = require("./lib/load-browser-globals").loadBrowserGlobals;

function projPath(rel) { return path.join(__dirname, "..", rel); }

function sandbox() {
  return loadBrowserGlobals([projPath("js/data/exercises.js"), projPath("js/engine/workout-generator.js")]);
}

/** Todos los ejercicios del plan, en una lista plana. */
function todosLosEjercicios(plan) {
  var out = [];
  plan.sesiones.forEach(function (s) { s.exercises.forEach(function (e) { out.push(e); }); });
  return out;
}

function run(t) {
  // ── Días y división ─────────────────────────────────────────────────────

  t.test("sin días de entrenamiento no inventa un plan: ok false y avisa", function () {
    var s = sandbox();
    [undefined, null, 0, "", "0"].forEach(function (v) {
      var plan = s.generateWorkoutPlan({ entrenamientos: v, goal: "bulk" }, { nivel: "principiante" });
      assert.strictEqual(plan.ok, false, "entrenamientos=" + JSON.stringify(v));
      assert.deepStrictEqual(JSON.parse(JSON.stringify(plan.sesiones)), []);
      assert.ok(plan.warnings.indexOf("sin_dias_de_entrenamiento") !== -1, "entrenamientos=" + JSON.stringify(v));
    });
  });

  t.test("días no válidos (texto, negativo) se tratan como 0 con aviso, sin lanzar", function () {
    var s = sandbox();
    var texto = s.generateWorkoutPlan({ entrenamientos: "tres", goal: "bulk" }, { nivel: "principiante" });
    assert.strictEqual(texto.ok, false);
    assert.ok(texto.warnings.indexOf("dias_no_valido") !== -1);
    var negativo = s.generateWorkoutPlan({ entrenamientos: -2, goal: "bulk" }, { nivel: "principiante" });
    assert.strictEqual(negativo.ok, false);
    assert.ok(negativo.warnings.indexOf("dias_no_valido") !== -1);
  });

  t.test("más de 6 días se limita a 6 y avisa", function () {
    var s = sandbox();
    var plan = s.generateWorkoutPlan({ entrenamientos: 9, goal: "bulk" }, { nivel: "intermedio" });
    assert.strictEqual(plan.ok, true);
    assert.strictEqual(plan.dias, 6);
    assert.strictEqual(plan.sesiones.length, 6);
    assert.ok(plan.warnings.indexOf("maximo_6_dias") !== -1);
  });

  t.test("la división cambia con los días: cuerpo completo (1-3), superior/inferior (4-5), empuje/tirón/piernas (6)", function () {
    var s = sandbox();
    function division(d) { return s.generateWorkoutPlan({ entrenamientos: d, goal: "bulk" }, { nivel: "intermedio" }).division; }
    assert.strictEqual(division(1), "cuerpo_completo");
    assert.strictEqual(division(2), "cuerpo_completo");
    assert.strictEqual(division(3), "cuerpo_completo");
    assert.strictEqual(division(4), "superior_inferior");
    assert.strictEqual(division(5), "superior_inferior");
    assert.strictEqual(division(6), "empuje_tiron_piernas");
  });

  t.test("hay tantas sesiones como días, y un día suelto avisa", function () {
    var s = sandbox();
    for (var d = 1; d <= 6; d++) {
      var plan = s.generateWorkoutPlan({ entrenamientos: d, goal: "maintain" }, { nivel: "intermedio" });
      assert.strictEqual(plan.sesiones.length, d, d + " días");
    }
    var uno = s.generateWorkoutPlan({ entrenamientos: 1, goal: "maintain" }, { nivel: "intermedio" });
    assert.ok(uno.warnings.indexOf("un_solo_dia") !== -1);
  });

  // ── Reglas de cada sesión ───────────────────────────────────────────────

  t.test("ningún ejercicio aparece dos veces en la misma sesión", function () {
    var s = sandbox();
    var plan = s.generateWorkoutPlan({ entrenamientos: 6, goal: "bulk" }, { nivel: "avanzado", equipamiento: "gimnasio" });
    plan.sesiones.forEach(function (sesion) {
      var ids = sesion.exercises.map(function (e) { return e.id; });
      assert.strictEqual(new Set(ids).size, ids.length, sesion.name + " repite un ejercicio");
    });
  });

  t.test("el tope de ejercicios por sesión depende del nivel (principiante 6, intermedio 6, avanzado 7)", function () {
    var s = sandbox();
    // El principiante no baja de 6: con 5 se perdían brazos y core en casi todas las sesiones.
    var principiante = s.generateWorkoutPlan({ entrenamientos: 4, goal: "bulk" }, { nivel: "principiante" });
    principiante.sesiones.forEach(function (sesion) {
      assert.ok(sesion.exercises.length <= 6, sesion.name + ": " + sesion.exercises.length + " ejercicios");
    });
    var avanzado = s.generateWorkoutPlan({ entrenamientos: 4, goal: "bulk" }, { nivel: "avanzado" });
    avanzado.sesiones.forEach(function (sesion) {
      assert.ok(sesion.exercises.length <= 7, sesion.name + ": " + sesion.exercises.length + " ejercicios");
    });
    var intermedio = s.generateWorkoutPlan({ entrenamientos: 4, goal: "bulk" }, { nivel: "intermedio" });
    intermedio.sesiones.forEach(function (sesion) {
      assert.ok(sesion.exercises.length <= 6, sesion.name + ": " + sesion.exercises.length + " ejercicios");
    });
  });

  t.test("en cada sesión los compuestos van antes que los aislados", function () {
    var s = sandbox();
    var plan = s.generateWorkoutPlan({ entrenamientos: 5, goal: "bulk" }, { nivel: "intermedio" });
    plan.sesiones.forEach(function (sesion) {
      var visto_aislado = false;
      sesion.exercises.forEach(function (e) {
        if (!e.compound) visto_aislado = true;
        else assert.ok(!visto_aislado, sesion.name + ": el compuesto " + e.name + " va después de un aislado");
      });
    });
  });

  // ── Material y nivel ────────────────────────────────────────────────────

  t.test("principiante no recibe ejercicios de nivel intermedio ni avanzado", function () {
    var s = sandbox();
    var plan = s.generateWorkoutPlan({ entrenamientos: 6, goal: "bulk" }, { nivel: "principiante" });
    todosLosEjercicios(plan).forEach(function (e) {
      var def = s.EXERCISE_CATALOG.filter(function (c) { return c.id === e.id; })[0];
      assert.strictEqual(def.level, "principiante", e.name + " es " + def.level);
    });
  });

  t.test("con sin_material solo aparecen ejercicios que no piden ningún material", function () {
    var s = sandbox();
    var plan = s.generateWorkoutPlan({ entrenamientos: 3, goal: "bulk" }, { nivel: "principiante", equipamiento: "sin_material" });
    todosLosEjercicios(plan).forEach(function (e) {
      var def = s.EXERCISE_CATALOG.filter(function (c) { return c.id === e.id; })[0];
      assert.deepStrictEqual(JSON.parse(JSON.stringify(def.equipment)), ["sin_material"], e.name);
    });
  });

  t.test("con mancuernas no aparece nada que pida barra, máquina, polea, dominadas o paralelas", function () {
    var s = sandbox();
    var prohibido = ["barra", "maquina", "polea", "dominadas", "paralelas"];
    var plan = s.generateWorkoutPlan({ entrenamientos: 4, goal: "bulk" }, { nivel: "intermedio", equipamiento: "mancuernas" });
    todosLosEjercicios(plan).forEach(function (e) {
      var def = s.EXERCISE_CATALOG.filter(function (c) { return c.id === e.id; })[0];
      def.equipment.forEach(function (item) {
        assert.ok(prohibido.indexOf(item) === -1, e.name + " pide " + item);
      });
    });
  });

  // ── Series, repeticiones y esfuerzo ────────────────────────────────────

  t.test("las repeticiones siguen el objetivo: bulk compuestos 6-10 y aislados 10-15", function () {
    var s = sandbox();
    var plan = s.generateWorkoutPlan({ entrenamientos: 3, goal: "bulk" }, { nivel: "intermedio" });
    todosLosEjercicios(plan).forEach(function (e) {
      if (e.reps.indexOf(" s") !== -1 || e.reps.indexOf("por lado") !== -1) return; // tiempo o por lado
      if (e.compound) assert.strictEqual(e.reps, "6-10", e.name);
      else assert.ok(e.reps === "10-15" || e.reps === "12-20", e.name + " lleva " + e.reps);
    });
  });

  t.test("el principiante nunca pasa de 3 series por ejercicio", function () {
    var s = sandbox();
    ["bulk", "cut", "recomp", "maintain"].forEach(function (goal) {
      var plan = s.generateWorkoutPlan({ entrenamientos: 4, goal: goal }, { nivel: "principiante" });
      todosLosEjercicios(plan).forEach(function (e) {
        assert.ok(e.sets <= 3, goal + ": " + e.name + " tiene " + e.sets + " series");
      });
    });
  });

  t.test("el esfuerzo (RIR) baja con el nivel: principiante 3, intermedio 2, avanzado 1", function () {
    var s = sandbox();
    var esperado = { principiante: 3, intermedio: 2, avanzado: 1 };
    Object.keys(esperado).forEach(function (nivel) {
      var plan = s.generateWorkoutPlan({ entrenamientos: 3, goal: "bulk" }, { nivel: nivel });
      todosLosEjercicios(plan).forEach(function (e) {
        assert.strictEqual(e.rir, esperado[nivel], nivel + ": " + e.name);
      });
    });
  });

  t.test("bulk con 3 días y material completo llega a 8 o más series semanales en los grupos grandes", function () {
    var s = sandbox();
    var plan = s.generateWorkoutPlan({ entrenamientos: 3, goal: "bulk" }, { nivel: "intermedio", equipamiento: "gimnasio" });
    ["pecho", "espalda", "cuadriceps", "isquios", "hombros"].forEach(function (m) {
      assert.ok((plan.seriesPorSemana[m] || 0) >= 8, m + " solo " + plan.seriesPorSemana[m]);
    });
    assert.ok(plan.warnings.every(function (w) { return w.indexOf("pocas_series") !== 0; }));
  });

  // ── Determinismo y avisos ───────────────────────────────────────────────

  t.test("con material disponible, un compuesto nunca se sustituye por un ejercicio sin material", function () {
    var s = sandbox();
    var plan = s.generateWorkoutPlan({ entrenamientos: 4, goal: "bulk" }, { nivel: "intermedio", equipamiento: "gimnasio" });
    todosLosEjercicios(plan).forEach(function (e) {
      if (!e.compound) return;
      var def = s.EXERCISE_CATALOG.filter(function (c) { return c.id === e.id; })[0];
      var soloCuerpo = def.equipment.length === 1 && def.equipment[0] === "sin_material";
      assert.ok(!soloCuerpo, e.name + " es un compuesto sin material con material disponible");
    });
  });

  t.test("el plan es determinista: mismo perfil y opciones, mismo resultado", function () {
    var s = sandbox();
    var a = JSON.stringify(s.generateWorkoutPlan({ entrenamientos: 5, goal: "cut" }, { nivel: "intermedio" }));
    var b = JSON.stringify(s.generateWorkoutPlan({ entrenamientos: 5, goal: "cut" }, { nivel: "intermedio" }));
    assert.strictEqual(a, b);
  });

  t.test("un objetivo desconocido avisa y usa mantenimiento; un nivel no indicado avisa y usa principiante", function () {
    var s = sandbox();
    var plan = s.generateWorkoutPlan({ entrenamientos: 3, goal: "volar" });
    assert.strictEqual(plan.objetivo, "maintain");
    assert.ok(plan.warnings.indexOf("objetivo_desconocido") !== -1);
    assert.strictEqual(plan.nivel, "principiante");
    assert.ok(plan.warnings.indexOf("nivel_no_indicado") !== -1);
  });

  t.test("un objetivo con nombre de propiedad heredada (constructor) no rompe el plan", function () {
    var s = sandbox();
    var plan = s.generateWorkoutPlan({ entrenamientos: 3, goal: "constructor" }, { nivel: "principiante" });
    assert.strictEqual(plan.ok, true);
    assert.strictEqual(plan.objetivo, "maintain");
    assert.ok(plan.warnings.indexOf("objetivo_desconocido") !== -1);
  });

  t.test("sin material el plan avisa de los patrones que no puede cubrir, en vez de rellenar con cualquier cosa", function () {
    var s = sandbox();
    var plan = s.generateWorkoutPlan({ entrenamientos: 3, goal: "bulk" }, { nivel: "principiante", equipamiento: "sin_material" });
    assert.ok(plan.warnings.some(function (w) { return w.indexOf("falta_ejercicio:") === 0; }));
  });

  t.test("calentamiento, progresión, descarga y aviso siempre van, también sin plan", function () {
    var s = sandbox();
    [{ entrenamientos: 3, goal: "bulk" }, { entrenamientos: 0, goal: "bulk" }].forEach(function (perfil) {
      var plan = s.generateWorkoutPlan(perfil, { nivel: "principiante" });
      assert.ok(plan.calentamiento && plan.progresion && plan.aviso, "faltan textos");
      assert.ok(plan.descarga && plan.descarga.cadaSemanas > 0, "falta descarga");
      assert.ok(plan.cardio && plan.cardio.length > 0, "falta cardio");
    });
  });

  t.test("cada ejercicio del plan trae su técnica en texto", function () {
    var s = sandbox();
    var plan = s.generateWorkoutPlan({ entrenamientos: 4, goal: "cut" }, { nivel: "intermedio" });
    todosLosEjercicios(plan).forEach(function (e) {
      assert.ok(typeof e.tecnica === "string" && e.tecnica.length > 0, e.name + " sin técnica");
    });
  });

  t.test("cada sesión tiene un día de la semana (1 lunes … 7 domingo), sin repetir, en número igual a los días", function () {
    var s = sandbox();
    for (var d = 1; d <= 6; d++) {
      var plan = s.generateWorkoutPlan({ entrenamientos: d, goal: "maintain" }, { nivel: "intermedio" });
      var dias = plan.sesiones.map(function (x) { return x.dia; });
      assert.strictEqual(dias.length, d, d + " días");
      dias.forEach(function (x) {
        assert.ok(Number.isInteger(x) && x >= 1 && x <= 7, d + " días: día " + x);
      });
      assert.strictEqual(new Set(dias).size, d, d + " días: hay días repetidos");
    }
  });

  t.test("con 2 o 3 días hay al menos un día libre entre sesiones", function () {
    var s = sandbox();
    [2, 3].forEach(function (d) {
      var plan = s.generateWorkoutPlan({ entrenamientos: d, goal: "bulk" }, { nivel: "intermedio" });
      var dias = plan.sesiones.map(function (x) { return x.dia; }).sort(function (a, b) { return a - b; });
      for (var i = 1; i < dias.length; i++) {
        assert.ok(dias[i] - dias[i - 1] >= 2, d + " días seguidos: " + dias.join(","));
      }
    });
  });

  t.test("cada objetivo trae su recomendación de cardio; con corte es la más concreta", function () {
    var s = sandbox();
    ["bulk", "cut", "recomp", "maintain"].forEach(function (goal) {
      var plan = s.generateWorkoutPlan({ entrenamientos: 3, goal: goal }, { nivel: "principiante" });
      assert.ok(plan.cardio && plan.cardio.length > 0, goal + " sin cardio");
    });
    var corte = s.generateWorkoutPlan({ entrenamientos: 3, goal: "cut" }, { nivel: "principiante" });
    assert.ok(corte.cardio.indexOf("2-3 días") !== -1, "corte: " + corte.cardio);
  });

  // ── Cobertura semanal ───────────────────────────────────────────────────

  t.test("con 4 o más días la semana cubre bíceps, tríceps y core, con cualquier nivel, con gimnasio o mancuernas", function () {
    var s = sandbox();
    ["principiante", "intermedio", "avanzado"].forEach(function (nivel) {
      ["gimnasio", "mancuernas"].forEach(function (equipamiento) {
        [4, 5, 6].forEach(function (d) {
          var plan = s.generateWorkoutPlan({ entrenamientos: d, goal: "bulk" }, { nivel: nivel, equipamiento: equipamiento });
          var musculos = {};
          todosLosEjercicios(plan).forEach(function (e) { musculos[e.muscle] = true; });
          ["biceps", "triceps", "core"].forEach(function (m) {
            assert.ok(musculos[m], nivel + ", " + equipamiento + ", " + d + " días: sin " + m);
          });
        });
      });
    });
  });

  t.test("con 3 días el core aparece con cualquier nivel (los brazos van de forma indirecta)", function () {
    var s = sandbox();
    ["principiante", "intermedio", "avanzado"].forEach(function (nivel) {
      ["gimnasio", "mancuernas"].forEach(function (equipamiento) {
        var plan = s.generateWorkoutPlan({ entrenamientos: 3, goal: "bulk" }, { nivel: nivel, equipamiento: equipamiento });
        assert.ok(todosLosEjercicios(plan).some(function (e) { return e.muscle === "core"; }), nivel + ", " + equipamiento + ": sin core");
      });
    });
  });

  t.test("bulk con 6 días y gimnasio llega al mínimo de series en los grupos grandes (8, o 6 para principiante)", function () {
    var s = sandbox();
    ["intermedio", "avanzado"].forEach(function (nivel) {
      var plan = s.generateWorkoutPlan({ entrenamientos: 6, goal: "bulk" }, { nivel: nivel, equipamiento: "gimnasio" });
      s.WORKOUT_GRUPOS_GRANDES.forEach(function (m) {
        assert.ok((plan.seriesPorSemana[m] || 0) >= 8, nivel + " 6 días: " + m + " solo " + plan.seriesPorSemana[m]);
      });
    });
    [4, 6].forEach(function (d) {
      var plan = s.generateWorkoutPlan({ entrenamientos: d, goal: "bulk" }, { nivel: "principiante", equipamiento: "gimnasio" });
      s.WORKOUT_GRUPOS_GRANDES.forEach(function (m) {
        assert.ok((plan.seriesPorSemana[m] || 0) >= 6, "principiante " + d + " días: " + m + " solo " + plan.seriesPorSemana[m]);
      });
      assert.strictEqual(plan.warnings.filter(function (w) { return w.indexOf("pocas_series") === 0; }).length, 0, "principiante " + d + " días");
    });
  });

  // ── Semana de descarga ──────────────────────────────────────────────────

  t.test("la semana de descarga llega cada 5 semanas (5, 10, 15) y no antes", function () {
    var s = sandbox();
    [5, 10, 15].forEach(function (n) { assert.strictEqual(s.esSemanaDescarga(n), true, "semana " + n); });
    [1, 4, 6, 7, 0, -5, 2.5, "5"].forEach(function (n) {
      assert.strictEqual(s.esSemanaDescarga(n), false, "semana " + JSON.stringify(n));
    });
  });

  t.test("la descarga tiene la mitad de series (mínimo 1) y RIR 4, y no cambia el plan original", function () {
    var s = sandbox();
    var plan = s.generateWorkoutPlan({ entrenamientos: 4, goal: "bulk" }, { nivel: "intermedio" });
    var antes = JSON.stringify(plan);
    var descarga = s.aplicarDescarga(plan);
    assert.strictEqual(JSON.stringify(plan), antes, "el plan original se ha modificado");
    assert.strictEqual(descarga.semanaDescarga, true);
    plan.sesiones.forEach(function (sesion, i) {
      sesion.exercises.forEach(function (e, j) {
        var d = descarga.sesiones[i].exercises[j];
        assert.strictEqual(d.id, e.id, "cambia el ejercicio " + e.name);
        assert.strictEqual(d.sets, Math.max(1, Math.ceil(e.sets / 2)), e.name + ": " + e.sets + " series pasan a " + d.sets);
        assert.strictEqual(d.rir, 4, e.name + " RIR");
      });
    });
  });

  t.test("en la descarga, las series por semana cuadran con los ejercicios", function () {
    var s = sandbox();
    var descarga = s.aplicarDescarga(s.generateWorkoutPlan({ entrenamientos: 5, goal: "recomp" }, { nivel: "avanzado" }));
    var recalculado = {};
    descarga.sesiones.forEach(function (sesion) {
      sesion.exercises.forEach(function (e) { recalculado[e.muscle] = (recalculado[e.muscle] || 0) + e.sets; });
    });
    assert.deepStrictEqual(JSON.parse(JSON.stringify(descarga.seriesPorSemana)), recalculado);
  });

  t.test("planParaSemana deja el plan normal fuera de la semana de descarga", function () {
    var s = sandbox();
    var plan = s.generateWorkoutPlan({ entrenamientos: 3, goal: "bulk" }, { nivel: "intermedio" });
    assert.strictEqual(s.planParaSemana(plan, 4), plan);
    assert.notStrictEqual(s.planParaSemana(plan, 5), plan);
    assert.strictEqual(s.planParaSemana(plan, 5).semanaDescarga, true);
  });

  // ── Doble progresión ────────────────────────────────────────────────────

  t.test("la carga sube solo si todas las series llegan a lo alto del rango", function () {
    var s = sandbox();
    var arriba = s.siguienteCarga(60, "6-10", [10, 10, 10], "pecho");
    assert.deepStrictEqual(JSON.parse(JSON.stringify(arriba)), { ok: true, pesoKg: 62.5, sube: true });
    var unaCorta = s.siguienteCarga(60, "6-10", [10, 9, 10], "pecho");
    assert.deepStrictEqual(JSON.parse(JSON.stringify(unaCorta)), { ok: true, pesoKg: 60, sube: false });
    assert.strictEqual(s.siguienteCarga(60, "10-12 por lado", [12, 12], "core").sube, true);
  });

  t.test("en tren inferior sube 5 kg y en el superior 2,5 kg", function () {
    var s = sandbox();
    assert.strictEqual(s.siguienteCarga(100, "6-10", [10, 10], "cuadriceps").pesoKg, 105);
    assert.strictEqual(s.siguienteCarga(100, "6-10", [10, 10], "espalda").pesoKg, 102.5);
  });

  t.test("datos que no sirven dan ok false y no inventan un peso", function () {
    var s = sandbox();
    assert.strictEqual(s.siguienteCarga(60, "30-45 s", [30], "core").ok, false, "rango de tiempo");
    assert.strictEqual(s.siguienteCarga(-1, "6-10", [10], "pecho").ok, false, "peso negativo");
    assert.strictEqual(s.siguienteCarga(60, "6-10", [], "pecho").ok, false, "sin series");
    assert.strictEqual(s.siguienteCarga(60, "6-10", [10, "diez"], "pecho").ok, false, "repeticiones no numéricas");
  });

  // ── Catálogo ────────────────────────────────────────────────────────────

  t.test("el catálogo tiene ids únicos y campos válidos", function () {
    var s = sandbox();
    var ids = {};
    var niveles = ["principiante", "intermedio", "avanzado"];
    var musculos = ["pecho", "espalda", "hombros", "biceps", "triceps", "cuadriceps", "isquios", "gluteos", "gemelos", "core"];
    var materiales = ["barra", "banco", "mancuernas", "maquina", "polea", "dominadas", "paralelas", "sin_material"];
    s.EXERCISE_CATALOG.forEach(function (e) {
      assert.ok(!ids[e.id], "id repetido: " + e.id);
      ids[e.id] = true;
      assert.ok(e.name && e.name.length > 0, e.id + " sin nombre");
      assert.ok(niveles.indexOf(e.level) !== -1, e.id + " nivel " + e.level);
      assert.ok(musculos.indexOf(e.muscle) !== -1, e.id + " músculo " + e.muscle);
      assert.strictEqual(typeof e.compound, "boolean", e.id);
      assert.ok(e.equipment.length > 0, e.id + " sin material");
      assert.ok(typeof e.tecnica === "string" && e.tecnica.length > 0, e.id + " sin técnica");
      e.equipment.forEach(function (m) {
        assert.ok(materiales.indexOf(m) !== -1, e.id + " material " + m);
      });
    });
  });

  t.test("cada patrón que usan las sesiones tiene al menos un ejercicio en gimnasio", function () {
    var s = sandbox();
    var patrones = {};
    Object.keys(s.WORKOUT_SESIONES).forEach(function (k) {
      s.WORKOUT_SESIONES[k].patrones.forEach(function (p) { patrones[p] = true; });
    });
    Object.keys(patrones).forEach(function (p) {
      var hay = s.EXERCISE_CATALOG.some(function (e) { return e.pattern === p; });
      assert.ok(hay, "ningún ejercicio para el patrón " + p);
    });
  });
}

module.exports = { run: run };
