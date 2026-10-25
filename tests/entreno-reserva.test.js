/**
 * tests/entreno-reserva.test.js
 * ─────────────────────────────────────────────────────────────────────────
 * Reserva de cada serie (RIR) y ánimo del día (2026-10-25), los dos
 * opcionales: se validan al leer, se guardan al terminar y al corregir, viajan
 * a la cuenta sin cambiar lo de antes, salen en el CSV, mueven la carga
 * sugerida y se ven en la pantalla de la sesión y en el historial. Sin DOM.
 * ─────────────────────────────────────────────────────────────────────────
 */

var assert = require("assert");
var path = require("path");
var loadBrowserGlobals = require("./lib/load-browser-globals").loadBrowserGlobals;

function projPath(rel) { return path.join(__dirname, "..", rel); }

function sandbox(lang) {
  var s = loadBrowserGlobals([
    projPath("js/core/i18n.js"),
    projPath("js/i18n/es.js"),
    projPath("js/i18n/en.js"),
    projPath("js/i18n/ru.js"),
    projPath("js/i18n/uk.js"),
    projPath("js/core/utils.js"),
    projPath("js/data/exercises.js"),
    projPath("js/engine/workout-generator.js"),
    projPath("js/core/workout-log.js"),
    projPath("js/core/workout-edit.js"),
    projPath("js/core/workout-stats.js"),
    projPath("js/core/workout-sync.js"),
    projPath("js/ui/render-entreno.js"),
    projPath("js/ui/entreno-sesion.js"),
    projPath("js/ui/entreno-progreso.js")
  ]);
  s._langMemoryState = lang || "ru";
  return s;
}

var HORA = 3600 * 1000;
var DIA = 24 * HORA;
var HOY = new Date(2026, 9, 25, 12).getTime();

var BANCA = { id: "press_banca_barra", name: "Press de banca con barra", muscle: "pecho", compound: true, sets: 3, reps: "6-10", restSeconds: 150, rir: 2 };
var CURL = { id: "curl_biceps_mancuernas", name: "Curl", muscle: "biceps", compound: false, sets: 3, reps: "10-15", restSeconds: 60, rir: 2 };
var PLANCHA = { id: "plancha", name: "Plancha", muscle: "core", compound: false, sets: 2, reps: "30-45 s", restSeconds: 60, rir: 2 };

/** Una sesión terminada: series [kg, reps, rir?]; extra va a la sesión (p. ej. animo). */
function sesionHecha(inicio, ejercicio, series, extra) {
  var s = {
    id: "s" + inicio, clave: "superior_A", nombre: "Superior A", semana: 1, inicio: inicio, fin: inicio + HORA,
    ejercicios: [{
      id: ejercicio.id, name: ejercicio.name, muscle: ejercicio.muscle, reps: ejercicio.reps, compound: ejercicio.compound,
      descanso: 120, series: series.map(function (x) {
        var serie = { kg: x[0], reps: x[1], hecha: true, t: inicio + 600000 };
        if (x[2] !== undefined) serie.rir = x[2];
        return serie;
      })
    }]
  };
  Object.keys(extra || {}).forEach(function (k) { s[k] = extra[k]; });
  return s;
}

function logCon(s, sesiones) {
  return s.entrenoLogLimpiar({ v: 1, sesiones: sesiones, enCurso: null });
}

function sinHuecos(html, donde) {
  ["undefined", "NaN", "null", "ent."].forEach(function (malo) {
    assert.strictEqual(html.indexOf(malo), -1, donde + ": aparece «" + malo + "»");
  });
}

function run(t) {

  t.test("al leer: la reserva de 0 a 4 y el ánimo de 1 a 5, enteros; lo demás se quita", function () {
    var s = sandbox();
    var log = s.entrenoLogLimpiar({ sesiones: [
      { id: "a", inicio: 1000, fin: 2000, animo: 4, ejercicios: [{ id: "x", series: [
        { kg: 60, reps: 8, hecha: true, rir: 2 }, { kg: 60, reps: 8, hecha: true, rir: 7 },
        { kg: 60, reps: 8, hecha: true, rir: "2" }, { kg: 60, reps: 8, hecha: true, rir: 1.5 }, { kg: 60, reps: 8, hecha: true, rir: 0 }
      ] }] },
      { id: "b", inicio: 3000, fin: 4000, animo: 9, ejercicios: [{ id: "x", series: [] }] },
      { id: "c", inicio: 5000, fin: 6000, animo: "3", ejercicios: [{ id: "x", series: [] }] }
    ] });
    var series = log.sesiones[0].ejercicios[0].series;
    assert.strictEqual(series[0].rir, 2);
    assert.strictEqual(series[4].rir, 0, "0 (al fallo) también vale");
    assert.ok(!("rir" in series[1]) && !("rir" in series[2]) && !("rir" in series[3]));
    assert.strictEqual(log.sesiones[0].animo, 4);
    assert.ok(!("animo" in log.sesiones[1]) && !("animo" in log.sesiones[2]));
  });

  t.test("en la sesión: se pone y se quita la reserva, el ánimo; al terminar y al corregir se quedan", function () {
    var s = sandbox();
    var log = s.entrenoLogVacio();
    s.entrenoLogIniciar(log, { key: "superior_A", name: "Superior A", exercises: [BANCA] }, 1, HOY);
    s.entrenoLogPonerSerie(log, 0, 0, { kg: 60, reps: 8, hecha: true, rir: 2 }, HOY + 60000);
    s.entrenoLogPonerSerie(log, 0, 1, { kg: 60, reps: 8, hecha: true, rir: 3 }, HOY + 120000);
    s.entrenoLogPonerSerie(log, 0, 1, { rir: null });
    assert.ok(!("rir" in log.enCurso.ejercicios[0].series[1]), "null la quita");
    s.entrenoLogPonerSerie(log, 0, 1, { rir: 9 });
    assert.ok(!("rir" in log.enCurso.ejercicios[0].series[1]), "fuera de rango también");
    assert.strictEqual(s.entrenoLogAnimo(log.enCurso, 2), 2);
    assert.strictEqual(s.entrenoLogAnimo(log.enCurso, 0), null);
    assert.ok(!("animo" in log.enCurso));
    s.entrenoLogAnimo(log.enCurso, 4);
    var resumen = s.entrenoLogTerminar(log, HOY + 30 * 60000);
    assert.strictEqual(resumen.animo, 4);
    var guardada = log.sesiones[0];
    assert.strictEqual(guardada.animo, 4);
    assert.strictEqual(guardada.ejercicios[0].series[0].rir, 2);
    var copia = JSON.parse(JSON.stringify(guardada));
    copia.animo = 2;
    copia.ejercicios[0].series[1].rir = 1;
    assert.strictEqual(s.entrenoLogReemplazar(log, guardada.id, copia, HOY + DIA), "cambiada");
    assert.strictEqual(log.sesiones[0].animo, 2, "el ánimo se corrige");
    assert.strictEqual(log.sesiones[0].ejercicios[0].series[1].rir, 1);
    // Pasar una serie a calentamiento le quita la reserva: ahí no cuenta.
    var enCurso = s.entrenoLogIniciar(log, { key: "superior_A", name: "Superior A", exercises: [BANCA] }, 1, HOY + 2 * DIA);
    s.entrenoLogPonerSerie(log, 0, 0, { rir: 1 });
    s.entrenoEditTipo(enCurso, 0, 0);
    assert.strictEqual(enCurso.ejercicios[0].series[0].tipo, "c");
    assert.ok(!("rir" in enCurso.ejercicios[0].series[0]));
  });

  t.test("carga sugerida: si en todas las series de más peso quedaba para pasar del tope, sube aunque no se llegara", function () {
    var s = sandbox();
    var sobra = s.entrenoLogSugerencia(logCon(s, [sesionHecha(HOY - DIA, BANCA, [[60, 8, 3], [60, 8, 3], [60, 8, 4]])]), BANCA);
    assert.strictEqual(sobra.tipo, "subir");
    assert.strictEqual(sobra.motivo, "rir");
    assert.strictEqual(sobra.kg, 62.5);
    assert.strictEqual(sobra.reps, 6);
    var justo = s.entrenoLogSugerencia(logCon(s, [sesionHecha(HOY - DIA, BANCA, [[60, 8, 2], [60, 8, 2], [60, 8, 2]])]), BANCA);
    assert.strictEqual(justo.tipo, "mantener", "8 + 2 = 10: llega al tope, no lo pasa");
    var falta = s.entrenoLogSugerencia(logCon(s, [sesionHecha(HOY - DIA, BANCA, [[60, 8, 4], [60, 8, 4], [60, 8]])]), BANCA);
    assert.strictEqual(falta.tipo, "mantener", "sin la reserva de todas, no se adivina");
    var pocas = s.entrenoLogSugerencia(logCon(s, [sesionHecha(HOY - DIA, BANCA, [[60, 8, 4], [60, 8, 4]])]), BANCA);
    assert.strictEqual(pocas.tipo, "mantener", "con menos series de las del plan, tampoco");
    var curl = s.entrenoLogSugerencia(logCon(s, [sesionHecha(HOY - DIA, CURL, [[12, 13, 3], [12, 13, 3], [12, 13, 3]])]), CURL);
    assert.strictEqual(curl.tipo, "subir");
    assert.strictEqual(curl.kg, 13, "aislamiento: el paso pequeño de siempre");
    var arriba = s.entrenoLogSugerencia(logCon(s, [sesionHecha(HOY - DIA, BANCA, [[60, 10, 0], [60, 10, 0], [60, 10, 0]])]), BANCA);
    assert.strictEqual(arriba.tipo, "subir", "llegar arriba sigue subiendo, aunque fuera al fallo");
    assert.strictEqual(arriba.motivo, undefined);
  });

  t.test("la cuenta: la reserva y el ánimo van y vuelven; sin ellos, el bloque es igual que antes", function () {
    var s = sandbox();
    var log = logCon(s, [sesionHecha(HOY - DIA, BANCA, [[60, 8, 2], [60, 8]], { animo: 5 }), sesionHecha(HOY - 2 * DIA, BANCA, [[60, 8]])]);
    var bloque = JSON.parse(JSON.stringify(s.entrenoNubeBloque(log, null)));
    var nueva = bloque.s[1];
    var vieja = bloque.s[0];
    assert.strictEqual(nueva.length, 9, "el ánimo va noveno");
    assert.strictEqual(vieja.length, 8, "sin ánimo, la fila de siempre");
    assert.strictEqual(nueva[7][0][3][0].length, 4, "la reserva va cuarta");
    assert.strictEqual(nueva[7][0][3][1].length, 3, "sin reserva, la serie de siempre");
    var vuelta = s.entrenoNubeLeerBloque(bloque).log;
    assert.strictEqual(vuelta.sesiones[1].animo, 5);
    assert.strictEqual(vuelta.sesiones[1].ejercicios[0].series[0].rir, 2);
    assert.ok(!("rir" in vuelta.sesiones[1].ejercicios[0].series[1]));
    assert.ok(!("animo" in vuelta.sesiones[0]));
  });

  t.test("el CSV lleva la reserva de cada serie y el ánimo de la sesión", function () {
    var s = sandbox();
    var log = logCon(s, [sesionHecha(HOY - DIA, BANCA, [[60, 8, 2], [60, 8]], { animo: 3 })]);
    var filas = s.entrenoStatsCsv(log, {}).slice(1).trim().split("\r\n");
    assert.strictEqual(filas[0], '"fecha","hora","sesion","ejercicio","serie","tipo","kg","reps","rir","nota","animo"');
    assert.ok(/"60","8","2","","3"$/.test(filas[1]), filas[1]);
    assert.ok(/"60","8","","","3"$/.test(filas[2]), filas[2]);
  });

  t.test("la pantalla: el ánimo arriba, «запас?» en las series de trabajo hechas y la pregunta bajo la recién marcada", function () {
    ["ru", "es", "en", "uk"].forEach(function (lang) {
      var s = sandbox(lang);
      var log = s.entrenoLogVacio();
      var sesion = s.entrenoLogIniciar(log, { key: "superior_A", name: "Superior A", exercises: [BANCA, PLANCHA] }, 1, HOY);
      s.entrenoLogPonerSerie(log, 0, 0, { hecha: true }, HOY + 60000);
      s.entrenoLogPonerSerie(log, 1, 0, { kg: 0, reps: 40, hecha: true }, HOY + 120000);
      var html = s.entrenoSesionPantallaHtml(sesion, log, HOY + 180000, { rirAbierto: "0-0" });
      sinHuecos(html, lang);
      assert.strictEqual(html.split('data-accion="animo"').length - 1, 5, lang + ": cinco respuestas al ánimo");
      assert.strictEqual(html.split('data-accion="rir-abrir"').length - 1, 1, lang + ": solo la serie de trabajo hecha (no las sin hacer ni la plancha)");
      assert.ok(html.indexOf('aria-expanded="true"') !== -1, lang);
      assert.strictEqual(html.split('class="sesion__rir-op').length - 1, 5, lang + ": 0, 1, 2, 3 y 4+");
      assert.ok(html.indexOf("4+") !== -1);
      assert.ok(html.indexOf('data-accion="rir-cerrar"') !== -1, lang + ": sin reserva aún, «no ahora»");
    });
  });

  t.test("la pantalla: con la reserva puesta, «запас 2»; con las preguntas quitadas solo queda lo ya apuntado", function () {
    var s = sandbox("ru");
    var log = s.entrenoLogVacio();
    var sesion = s.entrenoLogIniciar(log, { key: "superior_A", name: "Superior A", exercises: [BANCA] }, 1, HOY);
    s.entrenoLogPonerSerie(log, 0, 0, { hecha: true, rir: 2 }, HOY + 60000);
    s.entrenoLogPonerSerie(log, 0, 1, { hecha: true }, HOY + 120000);
    var abierta = s.entrenoSesionPantallaHtml(sesion, log, HOY + 180000, { rirAbierto: "0-0" });
    assert.ok(abierta.indexOf(">запас 2<") !== -1);
    assert.ok(abierta.indexOf(">запас?<") !== -1);
    assert.ok(abierta.indexOf("Не указывать") !== -1, "con reserva ya puesta, se puede quitar");
    assert.ok(/class="sesion__rir-op is-on"[^>]*data-valor="2"/.test(abierta), "la elegida, marcada");
    var sin = s.entrenoSesionPantallaHtml(sesion, log, HOY + 180000, { preguntas: false });
    assert.ok(sin.indexOf(">запас 2<") !== -1, "lo apuntado se sigue viendo");
    assert.strictEqual(sin.indexOf(">запас?<"), -1);
    assert.strictEqual(sin.indexOf('data-accion="animo"'), -1, "sin preguntas, sin el ánimo");
    s.entrenoLogAnimo(sesion, 4);
    var conAnimo = s.entrenoSesionPantallaHtml(sesion, log, HOY + 180000, { preguntas: false });
    assert.ok(conAnimo.indexOf("Самочувствие: хорошо") !== -1, "uno ya elegido sí se ve");
    assert.ok(conAnimo.indexOf('data-accion="animo-cambiar"') !== -1);
    s.entrenoLogAnimo(sesion, 2);
    var malo = s.entrenoSesionPantallaHtml(sesion, log, HOY + 180000, {});
    assert.ok(malo.indexOf("sesion__animo-consejo") !== -1 && malo.indexOf("Решать вам") !== -1, "un día malo: propuesta, no cambio");
    var otraVez = s.entrenoSesionPantallaHtml(sesion, log, HOY + 180000, { animoAbierto: true });
    assert.ok(/class="sesion__animo-op is-on"[^>]*data-valor="2"/.test(otraVez), "«Изменить» abre los cinco con el elegido marcado");
  });

  t.test("«В прошлый раз» lleva la reserva, la carga dice por qué sube, el resumen y el historial el ánimo", function () {
    var s = sandbox("ru");
    var log = logCon(s, [sesionHecha(HOY - DIA, BANCA, [[60, 8, 3], [60, 8, 3], [60, 8, 4]], { animo: 4 })]);
    var sesion = s.entrenoLogIniciar(log, { key: "superior_A", name: "Superior A", exercises: [BANCA] }, 1, HOY);
    var html = s.entrenoSesionPantallaHtml(sesion, log, HOY + 60000, {});
    assert.ok(html.indexOf("В прошлый раз: 60 кг × 8, 8, 8 · запас: 3, 3, 4+") !== -1, html.slice(html.indexOf("sesion__ultima"), html.indexOf("sesion__ultima") + 160));
    assert.ok(html.indexOf("оставался запас") !== -1, "el porqué de subir");
    var resumen = s.entrenoResumenHtml({ series: 3, volumen: 1440, minutos: 30, records: [], animo: 5 });
    assert.ok(resumen.indexOf("Самочувствие: отлично") !== -1);
    var progreso = s.entrenoProgresoHtml(log, { dias: 3 }, HOY, { periodo: "mes", vista: "regularidad" });
    assert.ok(progreso.indexOf("самочувствие: хорошо") !== -1, "el historial dice el ánimo");
    assert.ok(progreso.indexOf("запас: 3, 3, 4+") !== -1, "y la reserva de cada serie");
    sinHuecos(progreso, "progreso");
  });
}

module.exports = { run: run };
