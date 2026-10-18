/**
 * tests/workout-log.test.js
 * ─────────────────────────────────────────────────────────────────────────
 * Diario de entrenamiento (js/core/workout-log.js), sin DOM: lo que se lee
 * del almacenamiento se limpia, la carga que se propone para hoy (doble
 * progresión), los récords, el cierre de una sesión y las cuentas de la
 * semana y de la racha.
 * ─────────────────────────────────────────────────────────────────────────
 */

var assert = require("assert");
var path = require("path");
var loadBrowserGlobals = require("./lib/load-browser-globals").loadBrowserGlobals;

function projPath(rel) { return path.join(__dirname, "..", rel); }

function sandbox() {
  return loadBrowserGlobals([
    projPath("js/data/exercises.js"),
    projPath("js/engine/workout-generator.js"),
    projPath("js/core/workout-log.js")
  ]);
}

var HORA = 3600 * 1000;
var DIA = 24 * HORA;

/** Un ejercicio del plan como los que salen del generador. */
function ejercicioPlan(extra) {
  var e = { id: "press_banca_barra", name: "Press de banca con barra", muscle: "pecho", compound: true, sets: 3, reps: "6-10", restSeconds: 150, rir: 2 };
  Object.keys(extra || {}).forEach(function (k) { e[k] = extra[k]; });
  return e;
}

/** Una sesión terminada con un ejercicio y estas series ([kg, reps]…). */
function sesionHecha(inicio, ejercicio, series) {
  return {
    id: "s" + inicio, clave: "empuje", nombre: "Empuje", semana: 1, inicio: inicio, fin: inicio + HORA,
    ejercicios: [{
      id: ejercicio.id, name: ejercicio.name, muscle: ejercicio.muscle, reps: ejercicio.reps,
      compound: ejercicio.compound, descanso: 120,
      series: series.map(function (s) { return { kg: s[0], reps: s[1], hecha: true, t: inicio + 10 * 60000 }; })
    }]
  };
}

function logCon(s, sesiones) {
  return s.entrenoLogLimpiar({ v: 1, sesiones: sesiones, enCurso: null });
}

function run(t) {

  t.test("lo que venga del almacenamiento se limpia: basura, números raros, sesiones sin fin", function () {
    var s = sandbox();
    [null, undefined, "texto", 7, [], { sesiones: "no" }].forEach(function (crudo) {
      var log = s.entrenoLogLimpiar(crudo);
      assert.strictEqual(log.sesiones.length, 0);
      assert.strictEqual(log.enCurso, null);
    });
    var log = s.entrenoLogLimpiar({
      sesiones: [
        { id: "b", inicio: 2000, fin: 3000, ejercicios: [{ id: "x", series: [{ kg: "62,5", reps: "8", hecha: true }, { kg: -5, reps: "", hecha: true }] }] },
        { id: "a", inicio: 1000, fin: 1500, ejercicios: [{ id: "y", series: [] }] },
        { id: "sin-fin", inicio: 1000, ejercicios: [{ id: "z", series: [] }] },
        { id: "al-reves", inicio: 5000, fin: 4000, ejercicios: [{ id: "z", series: [] }] },
        { id: "sin-ejercicios", inicio: 1000, fin: 2000, ejercicios: [] }
      ]
    });
    assert.strictEqual(JSON.stringify(log.sesiones.map(function (x) { return x.id; })), JSON.stringify(["a", "b"]), "ordenadas y sin las rotas");
    var series = log.sesiones[1].ejercicios[0].series;
    assert.strictEqual(series[0].kg, 62.5, "la coma decimal vale");
    assert.strictEqual(series[0].reps, 8);
    assert.strictEqual(series[1].kg, null, "un peso negativo queda vacío");
    assert.strictEqual(series[1].reps, null, "una casilla vacía queda vacía");
  });

  t.test("el diario guarda como mucho 400 sesiones: las más nuevas", function () {
    var s = sandbox();
    var e = ejercicioPlan();
    var muchas = [];
    for (var i = 0; i < 410; i++) muchas.push(sesionHecha(1e12 + i * DIA, e, [[60, 8]]));
    var log = logCon(s, muchas);
    assert.strictEqual(log.sesiones.length, 400);
    assert.strictEqual(log.sesiones[0].inicio, 1e12 + 10 * DIA);
  });

  t.test("los rangos del plan: repeticiones, por lado y de tiempo", function () {
    var s = sandbox();
    var r = s.entrenoLogRango("6-10");
    assert.strictEqual(r.min, 6); assert.strictEqual(r.max, 10); assert.strictEqual(r.tiempo, false);
    assert.strictEqual(s.entrenoLogRango("8-10 por lado").porLado, true);
    assert.strictEqual(s.entrenoLogRango("30-45 s").tiempo, true);
    var lado = s.entrenoLogRango("20-30 s por lado");
    assert.ok(lado.tiempo && lado.porLado);
    assert.strictEqual(s.entrenoLogRango("muchas"), null);
    assert.strictEqual(s.entrenoLogRango(undefined), null);
  });

  t.test("sin historia: «nuevo», sin peso y por lo bajo del rango", function () {
    var s = sandbox();
    var sug = s.entrenoLogSugerencia(s.entrenoLogVacio(), ejercicioPlan());
    assert.strictEqual(sug.tipo, "nuevo");
    assert.strictEqual(sug.kg, null);
    assert.strictEqual(sug.reps, 6);
  });

  t.test("todas las series en lo alto del rango: sube 2,5 kg arriba y 5 kg abajo (compuestos)", function () {
    var s = sandbox();
    var pecho = ejercicioPlan();
    var sug = s.entrenoLogSugerencia(logCon(s, [sesionHecha(1e12, pecho, [[60, 10], [60, 10], [60, 10]])]), pecho);
    assert.strictEqual(sug.tipo, "subir");
    assert.strictEqual(sug.kg, 62.5);
    assert.strictEqual(sug.reps, 6, "tras subir se vuelve a lo bajo del rango");

    var pierna = ejercicioPlan({ id: "sentadilla_barra", muscle: "cuadriceps" });
    var sugP = s.entrenoLogSugerencia(logCon(s, [sesionHecha(1e12, pierna, [[100, 10], [100, 10], [100, 10]])]), pierna);
    assert.strictEqual(sugP.kg, 105);
  });

  t.test("en los de aislamiento la subida es pequeña: 1 kg arriba y 2 kg abajo", function () {
    var s = sandbox();
    var curl = ejercicioPlan({ id: "curl_mancuernas", muscle: "biceps", compound: false, reps: "10-15" });
    var sug = s.entrenoLogSugerencia(logCon(s, [sesionHecha(1e12, curl, [[12, 15], [12, 15], [12, 15]])]), curl);
    assert.strictEqual(sug.tipo, "subir");
    assert.strictEqual(sug.kg, 13);
    var extension = ejercicioPlan({ id: "extension_cuadriceps", muscle: "cuadriceps", compound: false, reps: "10-15" });
    var sugE = s.entrenoLogSugerencia(logCon(s, [sesionHecha(1e12, extension, [[40, 15], [40, 15], [40, 15]])]), extension);
    assert.strictEqual(sugE.kg, 42);
  });

  t.test("si una serie no llega a lo alto, se mantiene el peso y se busca una repetición más", function () {
    var s = sandbox();
    var e = ejercicioPlan();
    var sug = s.entrenoLogSugerencia(logCon(s, [sesionHecha(1e12, e, [[60, 10], [60, 9], [60, 8]])]), e);
    assert.strictEqual(sug.tipo, "mantener");
    assert.strictEqual(sug.kg, 60);
    assert.strictEqual(sug.reps, 9, "la peor serie (8) + 1");
  });

  t.test("si se hicieron menos series de las del plan, no sube aunque lleguen arriba", function () {
    var s = sandbox();
    var e = ejercicioPlan({ sets: 3 });
    var sug = s.entrenoLogSugerencia(logCon(s, [sesionHecha(1e12, e, [[60, 10], [60, 10]])]), e);
    assert.strictEqual(sug.tipo, "mantener");
    assert.strictEqual(sug.kg, 60);
  });

  t.test("si la mayoría de series se quedan por debajo del rango, baja un 10 % redondeado", function () {
    var s = sandbox();
    var e = ejercicioPlan();
    var sug = s.entrenoLogSugerencia(logCon(s, [sesionHecha(1e12, e, [[100, 5], [100, 4], [100, 7]])]), e);
    assert.strictEqual(sug.tipo, "bajar");
    assert.strictEqual(sug.kg, 90);
    var sug2 = s.entrenoLogSugerencia(logCon(s, [sesionHecha(1e12, e, [[62.5, 4], [62.5, 4], [62.5, 4]])]), e);
    assert.strictEqual(sug2.kg, 55, "56,25 → 55 en pasos de 2,5");
  });

  t.test("con varios pesos manda la serie más pesada", function () {
    var s = sandbox();
    var e = ejercicioPlan();
    var sug = s.entrenoLogSugerencia(logCon(s, [sesionHecha(1e12, e, [[50, 10], [60, 7], [60, 6]])]), e);
    assert.strictEqual(sug.kg, 60);
    assert.strictEqual(sug.reps, 7);
  });

  t.test("sin peso y todo arriba: «variante» (más difícil), no kilos", function () {
    var s = sandbox();
    var e = ejercicioPlan({ id: "flexiones", reps: "8-12" });
    var sug = s.entrenoLogSugerencia(logCon(s, [sesionHecha(1e12, e, [[0, 12], [0, 12], [0, 12]])]), e);
    assert.strictEqual(sug.tipo, "variante");
    assert.strictEqual(sug.kg, 0);
  });

  t.test("los de tiempo repiten lo mejor de la última vez", function () {
    var s = sandbox();
    var e = ejercicioPlan({ id: "plancha", muscle: "core", compound: false, reps: "30-45 s" });
    var sug = s.entrenoLogSugerencia(logCon(s, [sesionHecha(1e12, e, [[0, 30], [0, 40], [0, 35]])]), e);
    assert.strictEqual(sug.tipo, "mantener");
    assert.strictEqual(sug.reps, 40);
  });

  t.test("«la última vez» es la sesión terminada más reciente con series hechas de ese ejercicio", function () {
    var s = sandbox();
    var e = ejercicioPlan();
    var log = logCon(s, [sesionHecha(1e12, e, [[50, 10]]), sesionHecha(1e12 + DIA, e, [[55, 9]])]);
    var ultima = s.entrenoLogUltimaVez(log, e.id);
    assert.strictEqual(ultima.series[0].kg, 55);
    assert.strictEqual(s.entrenoLogUltimaVez(log, "otro"), null);
  });

  t.test("1RM estimado (Epley): solo con peso y de 1 a 12 repeticiones", function () {
    var s = sandbox();
    assert.strictEqual(s.entrenoLogE1rm(100, 1), 100);
    assert.strictEqual(s.entrenoLogE1rm(100, 10), 133.3);
    assert.strictEqual(s.entrenoLogE1rm(0, 10), 0);
    assert.strictEqual(s.entrenoLogE1rm(100, 15), 0);
    assert.strictEqual(s.entrenoLogE1rm(100, 0), 0);
  });

  t.test("récords: más peso, más fuerza estimada o, sin peso, más repeticiones; sin historia no hay", function () {
    var s = sandbox();
    var e = ejercicioPlan();
    var antes = s.entrenoLogRecords(logCon(s, [sesionHecha(1e12, e, [[80, 5], [80, 5]])]), e.id);
    assert.strictEqual(antes.kg, 80);
    assert.strictEqual(s.entrenoLogTipoRecord(antes, { kg: 82.5, reps: 3, hecha: true }), "kg");
    assert.strictEqual(s.entrenoLogTipoRecord(antes, { kg: 80, reps: 6, hecha: true }), "e1rm");
    assert.strictEqual(s.entrenoLogTipoRecord(antes, { kg: 75, reps: 5, hecha: true }), null);
    assert.strictEqual(s.entrenoLogTipoRecord(antes, { kg: 90, reps: 5, hecha: false }), null, "sin marcar no cuenta");
    var vacio = s.entrenoLogRecords(s.entrenoLogVacio(), e.id);
    assert.strictEqual(s.entrenoLogTipoRecord(vacio, { kg: 100, reps: 5, hecha: true }), null);

    var f = ejercicioPlan({ id: "flexiones", reps: "8-12" });
    var antesF = s.entrenoLogRecords(logCon(s, [sesionHecha(1e12, f, [[0, 20]])]), f.id);
    assert.strictEqual(s.entrenoLogTipoRecord(antesF, { kg: 0, reps: 22, hecha: true }), "reps");
    assert.strictEqual(s.entrenoLogTipoRecord(antesF, { kg: null, reps: 18, hecha: true }), null);
  });

  t.test("al empezar, cada ejercicio trae sus series del plan rellenas con la sugerencia", function () {
    var s = sandbox();
    var e = ejercicioPlan();
    var log = logCon(s, [sesionHecha(1e12, e, [[60, 10], [60, 10], [60, 10]])]);
    var sesion = s.entrenoLogIniciar(log, { key: "empuje", name: "Empuje", exercises: [e] }, 2, 1e12 + 2 * DIA);
    assert.strictEqual(log.enCurso, sesion);
    assert.strictEqual(sesion.semana, 2);
    assert.strictEqual(sesion.ejercicios[0].series.length, 3);
    sesion.ejercicios[0].series.forEach(function (x) {
      assert.strictEqual(x.kg, 62.5);
      assert.strictEqual(x.reps, 6);
      assert.strictEqual(x.hecha, false);
    });
    assert.strictEqual(sesion.ejercicios[0].descanso, 150);
  });

  t.test("cambiar series: casilla vacía → null, marcar guarda la hora, y siempre queda una serie", function () {
    var s = sandbox();
    var log = s.entrenoLogVacio();
    s.entrenoLogIniciar(log, { key: "k", name: "K", exercises: [ejercicioPlan({ sets: 1 })] }, 1, 1e12);
    var serie = s.entrenoLogPonerSerie(log, 0, 0, { kg: "", reps: "12" });
    assert.strictEqual(serie.kg, null);
    assert.strictEqual(serie.reps, 12);
    s.entrenoLogPonerSerie(log, 0, 0, { hecha: true }, 1e12 + 5000);
    assert.strictEqual(serie.t, 1e12 + 5000);
    s.entrenoLogPonerSerie(log, 0, 0, { hecha: false });
    assert.strictEqual(serie.t, undefined);
    assert.strictEqual(s.entrenoLogPonerSerie(log, 3, 0, { kg: 1 }), null, "ejercicio que no existe");
    assert.strictEqual(s.entrenoLogQuitarSerie(log, 0), false, "no se queda sin series");
    assert.strictEqual(s.entrenoLogAnadirSerie(log, 0), true);
    assert.strictEqual(log.enCurso.ejercicios[0].series[1].reps, 12, "la nueva copia la anterior");
    for (var i = 0; i < 20; i++) s.entrenoLogAnadirSerie(log, 0);
    assert.strictEqual(log.enCurso.ejercicios[0].series.length, 12, "máximo 12 series");
  });

  t.test("terminar guarda solo las series hechas y da el resumen con los récords", function () {
    var s = sandbox();
    var banca = ejercicioPlan();
    var plancha = ejercicioPlan({ id: "plancha", muscle: "core", compound: false, reps: "30-45 s", sets: 2 });
    var log = logCon(s, [sesionHecha(1e12, banca, [[60, 8], [60, 8], [60, 8]])]);
    var inicio = 1e12 + 3 * DIA;
    s.entrenoLogIniciar(log, { key: "empuje", name: "Empuje", exercises: [banca, plancha] }, 1, inicio);
    s.entrenoLogPonerSerie(log, 0, 0, { kg: 62.5, reps: 8, hecha: true }, inicio + 5 * 60000);
    s.entrenoLogPonerSerie(log, 0, 1, { kg: 60, reps: 8, hecha: true }, inicio + 10 * 60000);
    s.entrenoLogPonerSerie(log, 1, 0, { kg: 0, reps: 40, hecha: true }, inicio + 20 * 60000);
    var resumen = s.entrenoLogTerminar(log, inicio + 25 * 60000);
    assert.strictEqual(log.enCurso, null);
    assert.strictEqual(log.sesiones.length, 2);
    var guardada = log.sesiones[1];
    assert.strictEqual(guardada.ejercicios[0].series.length, 2, "la serie sin hacer no se guarda");
    assert.strictEqual(resumen.series, 3);
    assert.strictEqual(resumen.volumen, 62.5 * 8 + 60 * 8, "los segundos de la plancha no son kilos");
    assert.strictEqual(resumen.minutos, 25);
    assert.strictEqual(resumen.records.length, 1);
    assert.strictEqual(resumen.records[0].tipo, "kg");
    assert.strictEqual(resumen.records[0].kg, 62.5);
  });

  t.test("terminar sin ninguna serie hecha no guarda nada", function () {
    var s = sandbox();
    var log = s.entrenoLogVacio();
    s.entrenoLogIniciar(log, { key: "k", name: "K", exercises: [ejercicioPlan()] }, 1, 1e12);
    assert.strictEqual(s.entrenoLogTerminar(log, 1e12 + HORA), null);
    assert.strictEqual(log.sesiones.length, 0);
    assert.strictEqual(log.enCurso, null);
    assert.strictEqual(s.entrenoLogTerminar(log, 1e12 + HORA), null, "sin sesión en curso tampoco");
  });

  t.test("si se olvidó «Terminar», la sesión acaba un minuto después de la última serie", function () {
    var s = sandbox();
    var log = s.entrenoLogVacio();
    s.entrenoLogIniciar(log, { key: "k", name: "K", exercises: [ejercicioPlan({ sets: 1 })] }, 1, 1e12);
    s.entrenoLogPonerSerie(log, 0, 0, { kg: 50, reps: 8, hecha: true }, 1e12 + 40 * 60000);
    var resumen = s.entrenoLogTerminar(log, 1e12 + 20 * HORA);
    assert.strictEqual(log.sesiones[0].fin, 1e12 + 41 * 60000);
    assert.strictEqual(resumen.minutos, 41);
  });

  t.test("borrar una sesión del historial", function () {
    var s = sandbox();
    var e = ejercicioPlan();
    var log = logCon(s, [sesionHecha(1e12, e, [[60, 8]]), sesionHecha(1e12 + DIA, e, [[60, 8]])]);
    assert.strictEqual(s.entrenoLogBorrar(log, "s" + 1e12), true);
    assert.strictEqual(log.sesiones.length, 1);
    assert.strictEqual(s.entrenoLogBorrar(log, "no-existe"), false);
  });

  t.test("las semanas van de lunes a domingo y suman sesiones, series y kilos", function () {
    var s = sandbox();
    var e = ejercicioPlan();
    var miercoles = new Date(2026, 9, 14, 18).getTime();   // 14 oct 2026, miércoles
    var domingoAnterior = new Date(2026, 9, 11, 10).getTime();
    var log = logCon(s, [sesionHecha(domingoAnterior, e, [[50, 10]]), sesionHecha(miercoles, e, [[60, 8], [60, 8]])]);
    var semanas = s.entrenoLogSemanas(log, new Date(2026, 9, 18, 12).getTime(), 3);
    assert.strictEqual(semanas.length, 3);
    assert.strictEqual(semanas[2].inicio, new Date(2026, 9, 12).getTime(), "la semana actual empieza el lunes 12");
    assert.strictEqual(semanas[2].sesiones, 1);
    assert.strictEqual(semanas[2].series, 2);
    assert.strictEqual(semanas[2].volumen, 960);
    assert.strictEqual(semanas[1].sesiones, 1, "el domingo 11 es de la semana anterior");
    assert.strictEqual(semanas[0].sesiones, 0);
  });

  t.test("la racha cuenta semanas seguidas; la semana actual vacía todavía no la rompe", function () {
    var s = sandbox();
    var e = ejercicioPlan();
    var hoy = new Date(2026, 9, 18, 12).getTime();          // domingo 18 oct
    var viejas = [
      sesionHecha(new Date(2026, 8, 30).getTime(), e, [[50, 8]]),   // semana del 28 sep
      sesionHecha(new Date(2026, 8, 15).getTime(), e, [[50, 8]])    // semana del 14 sep (hueco después)
    ];
    assert.strictEqual(s.entrenoLogRacha(logCon(s, viejas), hoy), 0, "ni esta semana ni la anterior: racha rota");
    var sesiones = viejas.concat([sesionHecha(new Date(2026, 9, 6).getTime(), e, [[50, 8]])]);   // semana del 5 oct
    assert.strictEqual(s.entrenoLogRacha(logCon(s, sesiones), hoy), 2, "esta semana aún vacía: cuenta desde la anterior");
    sesiones.push(sesionHecha(new Date(2026, 9, 13).getTime(), e, [[50, 8]]));   // esta semana
    assert.strictEqual(s.entrenoLogRacha(logCon(s, sesiones), hoy), 3);
    assert.strictEqual(s.entrenoLogRacha(logCon(s, sesiones), new Date(2026, 9, 20).getTime()), 3,
      "el martes siguiente, sin sesión aún, la racha sigue");
    assert.strictEqual(s.entrenoLogRacha(s.entrenoLogVacio(), hoy), 0);
  });

  t.test("leer y guardar en el almacenamiento, también cuando no hay almacenamiento", function () {
    var s = sandbox();
    var guardado = null;
    s.localStorage = {
      getItem: function () { return guardado; },
      setItem: function (k, v) { guardado = v; }
    };
    var log = s.entrenoLogLeer();
    assert.strictEqual(log.sesiones.length, 0);
    s.entrenoLogIniciar(log, { key: "k", name: "K", exercises: [ejercicioPlan()] }, 1, 1e12);
    assert.strictEqual(s.entrenoLogGuardar(log), true);
    assert.strictEqual(s.entrenoLogLeer().enCurso.ejercicios.length, 1, "la sesión en curso sobrevive a recargar");
    assert.strictEqual(s.ENTRENO_LOG_CLAVE.indexOf("nutritionPlanner."), 0,
      "con el prefijo del proyecto, para que «Descargar mis datos» se lleve el diario");

    guardado = "{ roto";
    assert.strictEqual(s.entrenoLogLeer().sesiones.length, 0);

    s.localStorage = {
      getItem: function () { throw new Error("bloqueado"); },
      setItem: function () { throw new Error("bloqueado"); }
    };
    assert.strictEqual(s.entrenoLogLeer().sesiones.length, 0);
    assert.strictEqual(s.entrenoLogGuardar(log), false);
  });
}

module.exports = { run: run };
