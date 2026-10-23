/**
 * tests/entreno-calendario.test.js
 * ─────────────────────────────────────────────────────────────────────────
 * El calendario del mes de «Plan» (js/ui/entreno-calendario.js) y el bloque de
 * medidas de «Progreso → Cuerpo» (js/ui/entreno-medidas.js), los dos del
 * 2026-10-23, sin DOM.
 * ─────────────────────────────────────────────────────────────────────────
 */

var assert = require("assert");
var fs = require("fs");
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
    projPath("js/core/workout-stats.js"),
    projPath("js/core/body-measures.js"),
    projPath("js/ui/render-entreno.js"),
    projPath("js/ui/entreno-sesion.js"),
    projPath("js/ui/entreno-progreso.js"),
    projPath("js/ui/entreno-calendario.js"),
    projPath("js/ui/entreno-medidas.js")
  ]);
  s._langMemoryState = lang || "ru";
  return s;
}

var HORA = 3600 * 1000;
var HOY = new Date(2026, 9, 21, 12).getTime();   // miércoles 21 de octubre
var OCTUBRE = 2026 * 12 + 9;

function dia(d) { return new Date(2026, 9, d).getTime(); }

function sesion(inicio) {
  return { id: "s" + inicio, clave: "cuerpo_A", nombre: "Cuerpo A", semana: 1, inicio: inicio, fin: inicio + HORA, ejercicios: [
    { id: "press_banca_barra", name: "Press banca", muscle: "pecho", reps: "6-10", compound: true, descanso: 90, series: [{ kg: 60, reps: 8, hecha: true }] }
  ] };
}

function logEjemplo(s) {
  return s.entrenoLogLimpiar({ sesiones: [dia(5) + 18 * HORA, dia(7) + 18 * HORA, dia(19) + 18 * HORA, dia(21) + 9 * HORA].map(sesion) });
}

/** Lunes, miércoles y viernes; el domingo, una sesión sin ejercicios (no cuenta). */
function planEjemplo() {
  var ej = [{ id: "press_banca_barra", name: "Press banca", sets: 3, reps: "6-10", restSeconds: 90 }];
  return { ok: true, semana: 1, sesiones: [
    { key: "cuerpo_A", name: "Cuerpo A", dia: 1, exercises: ej },
    { key: "cuerpo_B", name: "Cuerpo B", dia: 3, exercises: ej },
    { key: "cuerpo_A", name: "Cuerpo A", dia: 5, exercises: ej },
    { key: "libre", name: "Libre", dia: 7, exercises: [] }
  ] };
}

function sinHuecos(html, donde) {
  ["undefined", "NaN", "null", "ent.", "Infinity", "{"].forEach(function (malo) {
    assert.strictEqual(html.indexOf(malo), -1, donde + ": aparece «" + malo + "»");
  });
}

function celda(datos, ms) {
  var hallada = null;
  datos.semanas.forEach(function (f) { f.forEach(function (x) { if (x.ms === ms && !x.fuera) hallada = x; }); });
  return hallada;
}

function run(t) {

  t.test("calendario: semanas de lunes a domingo, lo hecho del diario y lo que toca solo de hoy en adelante", function () {
    var s = sandbox("ru");
    var d = s.entrenoCalendarioDatos(planEjemplo(), logEjemplo(s), OCTUBRE, HOY);
    assert.strictEqual(d.semanas.length, 5, "el 1 de octubre de 2026 es jueves: 3 + 31 días = 5 semanas");
    assert.strictEqual(d.semanas[0][0].dia, 28, "empieza el lunes 28 de septiembre");
    assert.ok(d.semanas[0][0].fuera && !d.semanas[0][3].fuera);
    assert.strictEqual(d.sesiones, 4);
    var hoy = celda(d, dia(21));
    assert.ok(hoy.hoy && hoy.hechas.length === 1 && hoy.plan.length === 1, "hoy toca y está hecho");
    assert.strictEqual(celda(d, dia(23)).plan.length, 1, "el viernes que viene toca");
    assert.strictEqual(celda(d, dia(19)).plan.length, 0, "un lunes pasado no se marca como «tocaba»: el plan de antes no se guarda");
    assert.strictEqual(celda(d, dia(19)).hechas.length, 1);
    assert.strictEqual(celda(d, dia(25)).plan.length, 0, "una sesión sin ejercicios no cuenta");
    assert.ok(!d.antes && d.despues && d.esActual, "la primera sesión es de octubre: no hay meses antes");
    var enero = s.entrenoCalendarioDatos(planEjemplo(), logEjemplo(s), OCTUBRE + 3, HOY);
    assert.ok(enero.antes && !enero.despues, "como mucho tres meses por delante");
    var vacio = s.entrenoCalendarioDatos(null, null, OCTUBRE, HOY);
    assert.strictEqual(vacio.sesiones, 0);
    assert.strictEqual(celda(vacio, dia(23)).plan.length, 0, "sin plan, nada toca");
  });

  t.test("calendario: cabecera de días con su nombre, un botón por día, solo el elegido tabulable, hoy marcado, sin huecos", function () {
    ["ru", "es", "en", "uk"].forEach(function (lang) {
      var s = sandbox(lang);
      var html = s.entrenoCalendarioHtml(s.entrenoCalendarioDatos(planEjemplo(), logEjemplo(s), OCTUBRE, HOY), dia(21));
      sinHuecos(html, lang);
      assert.strictEqual(html.split('<th scope="col" abbr="').length - 1, 7, lang);
      assert.strictEqual(html.split("data-cal-dia=").length - 1, 31, lang + ": un botón por día del mes");
      assert.strictEqual(html.split('tabindex="0"').length - 1, 1, lang + ": solo el elegido entra en el tabulador");
      assert.strictEqual(html.split('aria-current="date"').length - 1, 1, lang);
      assert.strictEqual(html.split("entreno__cal-dia is-hecho").length - 1, 4, lang + ": los cuatro días hechos");
      assert.ok(html.indexOf('data-cal-mes="-1" aria-label="') !== -1 && /data-cal-mes="-1"[^>]* disabled/.test(html), lang + ": sin meses antes, la flecha está desactivada");
      assert.ok(html.indexOf('data-ver-sesion="s' + (dia(21) + 9 * HORA) + '"') !== -1, lang + ": el día elegido (hoy) abre su sesión");
    });
  });

  t.test("calendario: el día elegido dice lo hecho, lo que toca (hoy, con «Начать») o que no hubo nada", function () {
    var s = sandbox("ru");
    var log = s.entrenoLogLimpiar({ sesiones: [sesion(dia(5) + 18 * HORA)] });
    var d = s.entrenoCalendarioDatos(planEjemplo(), log, OCTUBRE, HOY);
    var hoy = s.entrenoCalendarioHtml(d, dia(21));
    assert.ok(/<button type="button" class="btn-secondary" data-empezar="1">Начать<\/button>/.test(hoy), "hoy toca y no está hecho: «Начать» con su índice");
    var viernes = s.entrenoCalendarioHtml(d, dia(23));
    assert.ok(viernes.indexOf("<strong>" + s.entrenoNombreSesion(planEjemplo().sesiones[2]) + "</strong>") !== -1, "lo que toca ese día");
    assert.ok(viernes.indexOf("data-empezar") === -1, "otro día no se empieza desde aquí");
    assert.ok(s.entrenoCalendarioHtml(d, dia(20)).indexOf("В этот день тренировок не было.") !== -1);
    assert.ok(s.entrenoCalendarioHtml(d, dia(24)).indexOf("По плану — день отдыха.") !== -1);
    assert.ok(s.entrenoCalendarioHtml(d, dia(5)).indexOf("60 мин · подходов: 1") !== -1, "lo hecho: minutos y series");
    var fuera = s.entrenoCalendarioHtml(d, new Date(2026, 8, 30).getTime());
    assert.ok(fuera.indexOf('tabindex="0" aria-current="date"') !== -1, "un día de otro mes no se elige: vuelve a hoy");
  });

  t.test("calendario: index.html lo pone en «Plan» y render-entreno lo pinta y lo cablea", function () {
    var html = fs.readFileSync(projPath("index.html"), "utf8");
    assert.ok(/id="entrenoCalendario" data-en="plan"[^>]* hidden/.test(html));
    var render = fs.readFileSync(projPath("js/ui/render-entreno.js"), "utf8");
    assert.ok(render.indexOf("renderEntrenoCalendario(") !== -1 && render.indexOf("initEntrenoCalendario()") !== -1);
    assert.ok(render.indexOf("initEntrenoMedidas()") !== -1);
  });

  t.test("medidas: sin registro, para qué sirven y el formulario con un campo con nombre por parte", function () {
    ["ru", "es", "en", "uk"].forEach(function (lang) {
      var s = sandbox(lang);
      var html = s.entrenoMedidasHtml([], HOY, null);
      sinHuecos(html, lang);
      assert.ok(html.indexOf("entreno__medidas-lista") === -1);
      assert.strictEqual(html.split('<label class="entreno__medidas-campo">').length - 1, 5, lang);
      assert.strictEqual(html.split('inputmode="decimal"').length - 1, 5, lang);
      assert.ok(html.indexOf("placeholder=") === -1, lang + ": sin medidas de antes, sin ejemplo");
      assert.ok(/data-medidas-form novalidate hidden/.test(html), lang + ": el formulario nace cerrado");
      assert.ok(html.indexOf('aria-controls="entrenoMedidasForm"') !== -1);
    });
    assert.ok(sandbox("ru").entrenoMedidasHtml([], HOY, null).indexOf("Обхваты показывают изменения") !== -1);
  });

  t.test("medidas: último valor, cambio en el periodo, gráfica y lo de la última vez de ejemplo en el formulario", function () {
    var s = sandbox("ru");
    var lista = [
      { fecha: "2026-07-01", t: 1, m: { cintura: 88, brazo: 35 } },
      { fecha: "2026-10-01", t: 2, m: { cintura: 84 } },
      { fecha: "2026-10-20", t: 3, m: { cintura: 82.5 } }
    ];
    var log = logEjemplo(s);
    var mes = s.entrenoMedidasHtml(lista, HOY, s.entrenoStatsPeriodo("mes", log, HOY));
    sinHuecos(mes, "mes");
    assert.ok(mes.indexOf("82,5 см") !== -1, mes);
    assert.ok(mes.indexOf("−1,5 см за период") !== -1, "de 84 a 82,5 en el mes");
    assert.ok(mes.indexOf("entreno__medida-grafica") !== -1);
    assert.ok(mes.indexOf('name="cintura" placeholder="82,5"') !== -1, "la última vez, de ejemplo");
    assert.ok(mes.indexOf('name="brazo" placeholder="35"') !== -1);
    assert.strictEqual(mes.split('class="entreno__medida"').length - 1, 2, "solo las partes medidas alguna vez");
    var todo = s.entrenoMedidasHtml(lista, HOY, s.entrenoStatsPeriodo("todo", log, HOY));
    assert.ok(todo.indexOf("−5,5 см за период") !== -1, "«todo» ve desde julio, antes de la primera sesión");
    var sinPeriodo = s.entrenoMedidasHtml(lista, HOY, null);
    assert.strictEqual(sinPeriodo.indexOf("entreno__medida-cambio"), -1, "sin periodo, sin cambio");
    var panel = s.entrenoProgresoHtml(log, { dias: 3 }, HOY, { periodo: "mes", vista: "cuerpo", medidas: lista });
    assert.ok(panel.indexOf("entreno__medidas-lista") !== -1, "«Тело» lleva las medidas debajo del peso");
    assert.ok(panel.indexOf('id="entrenoPesoTitulo"') < panel.indexOf('id="entrenoMedidasTitulo"'));
  });
}

module.exports = { run: run };
