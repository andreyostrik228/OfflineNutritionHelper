/**
 * tests/entreno-perdidas.test.js
 * ─────────────────────────────────────────────────────────────────────────
 * Sesiones saltadas de la semana (js/ui/entreno-perdidas.js) y el cronómetro
 * de las series de tiempo (js/ui/entreno-sesion.js), los dos del 2026-10-25.
 * Sin DOM.
 * ─────────────────────────────────────────────────────────────────────────
 */

var assert = require("assert");
var path = require("path");
var loadBrowserGlobals = require("./lib/load-browser-globals").loadBrowserGlobals;

function projPath(rel) { return path.join(__dirname, "..", rel); }

function sandbox(lang) {
  var s = loadBrowserGlobals([
    projPath("js/core/i18n.js"), projPath("js/i18n/es.js"), projPath("js/i18n/en.js"),
    projPath("js/i18n/ru.js"), projPath("js/i18n/uk.js"), projPath("js/core/utils.js"),
    projPath("js/data/exercises.js"), projPath("js/engine/workout-generator.js"),
    projPath("js/core/workout-log.js"), projPath("js/ui/render-entreno.js"),
    projPath("js/ui/entreno-sesion.js"), projPath("js/ui/entreno-perdidas.js")
  ]);
  s._langMemoryState = lang || "ru";
  return s;
}

var HORA = 3600 * 1000;
var DIA = 24 * HORA;
var LUNES = new Date(2026, 9, 19).getTime();
var JUEVES = LUNES + 3 * DIA + 12 * HORA;

var EJ = [{ id: "press_banca_barra", name: "Press banca", sets: 3, reps: "6-10", restSeconds: 90 }];
/** Lunes, miércoles y viernes; el martes, una sesión vacía (no cuenta). */
function planEjemplo() {
  return { ok: true, semana: 1, sesiones: [
    { key: "cuerpo_A", instancia: "cuerpo_A", name: "Cuerpo A", dia: 1, exercises: EJ },
    { key: "libre", instancia: "p9", name: "Libre", dia: 2, exercises: [] },
    { key: "cuerpo_B", instancia: "cuerpo_B", name: "Cuerpo B", dia: 3, exercises: EJ },
    { key: "cuerpo_A", instancia: "p3", name: "Cuerpo A", dia: 5, exercises: EJ }
  ] };
}

function hecha(inicio, clave) {
  return { id: "s" + inicio, clave: clave, nombre: "", semana: 1, inicio: inicio, fin: inicio + HORA,
    ejercicios: [{ id: "press_banca_barra", name: "Press banca", reps: "6-10", descanso: 90, series: [{ kg: 60, reps: 8, hecha: true }] }] };
}

function logCon(s, sesiones) { return s.entrenoLogLimpiar({ sesiones: sesiones }); }

function almacen() {
  var mapa = {};
  return { getItem: function (k) { return k in mapa ? mapa[k] : null; }, setItem: function (k, v) { mapa[k] = String(v); }, removeItem: function (k) { delete mapa[k]; } };
}

function sinHuecos(html, donde) {
  ["undefined", "NaN", "null", "ent.", "{"].forEach(function (malo) {
    assert.strictEqual(html.indexOf(malo), -1, donde + ": aparece «" + malo + "»");
  });
}

function run(t) {

  t.test("saltadas: lo que tocaba de lunes a ayer y no se hizo esta semana; hecha otro día cuenta", function () {
    var s = sandbox();
    var lunesHecho = logCon(s, [hecha(LUNES + 18 * HORA, "cuerpo_A")]);
    var p = s.entrenoPerdidasDatos(planEjemplo(), lunesHecho, JUEVES);
    assert.strictEqual(p.length, 1);
    assert.strictEqual(p[0].dia, 3, "el miércoles");
    assert.strictEqual(p[0].indice, 2);
    assert.strictEqual(p[0].fecha, LUNES + 2 * DIA);
    var hoyHecha = logCon(s, [hecha(LUNES + 18 * HORA, "cuerpo_A"), hecha(JUEVES - HORA, "cuerpo_B")]);
    assert.strictEqual(s.entrenoPerdidasDatos(planEjemplo(), hoyHecha, JUEVES).length, 0, "la del miércoles, hecha hoy");
    var dos = logCon(s, [hecha(LUNES - 3 * DIA, "cuerpo_A")]);
    var ambas = s.entrenoPerdidasDatos(planEjemplo(), dos, JUEVES);
    assert.strictEqual(JSON.stringify(ambas.map(function (x) { return x.dia; })), "[3,1]", "las dos, la más reciente primero; la de la semana pasada no cuenta");
    assert.strictEqual(s.entrenoPerdidasDatos(planEjemplo(), s.entrenoLogVacio(), JUEVES).length, 0, "sin diario aún no ha empezado");
    assert.strictEqual(s.entrenoPerdidasDatos({ ok: false, sesiones: [] }, dos, JUEVES).length, 0);
  });

  t.test("saltadas: dos del mismo tipo se casan una a una; con nombre propio, por «~Nombre»", function () {
    var s = sandbox();
    var viernes = LUNES + 4 * DIA + 20 * HORA;
    // El lunes y el viernes son «Cuerpo A». El sábado, con una sola «Cuerpo A» hecha (el viernes), esa
    // casa con la primera que tocaba (el lunes): quedan saltadas la del viernes y la del miércoles.
    var log = logCon(s, [hecha(viernes, "cuerpo_A")]);
    var p = s.entrenoPerdidasDatos(planEjemplo(), log, LUNES + 5 * DIA + 10 * HORA);
    assert.strictEqual(JSON.stringify(p.map(function (x) { return x.dia; })), "[5,3]", "una hecha cubre una sola de las dos");
    var propio = planEjemplo();
    propio.sesiones[0].nombrePropio = true;
    propio.sesiones[0].name = "Пн: база";
    var conNombre = logCon(s, [hecha(LUNES + 18 * HORA, "~Пн: база"), hecha(LUNES + 2 * DIA + 18 * HORA, "cuerpo_B")]);
    assert.strictEqual(s.entrenoPerdidasDatos(propio, conNombre, JUEVES).length, 0);
  });

  t.test("saltadas: los días anteriores al último cambio del programa no cuentan", function () {
    var s = sandbox();
    var log = logCon(s, [hecha(LUNES - 3 * DIA, "cuerpo_A")]);
    var martes = LUNES + DIA + 10 * HORA;
    var p = s.entrenoPerdidasDatos(planEjemplo(), log, JUEVES, martes);
    assert.strictEqual(JSON.stringify(p.map(function (x) { return x.dia; })), "[3]", "cambiado el martes: el lunes era otro plan");
    assert.strictEqual(s.entrenoPerdidasDatos(planEjemplo(), log, JUEVES, JUEVES - HORA).length, 0, "cambiado hoy: nada");
  });

  t.test("la tarjeta: la más reciente, «Сделать сегодня» con su sesión, «Не переносить» con su instancia", function () {
    ["ru", "es", "en", "uk"].forEach(function (lang) {
      var s = sandbox(lang);
      var log = logCon(s, [hecha(LUNES - 3 * DIA, "cuerpo_A")]);
      var html = s.entrenoPerdidaHtml(s.entrenoPerdidasDatos(planEjemplo(), log, JUEVES));
      sinHuecos(html, lang);
      assert.ok(html.indexOf('data-empezar="2"') !== -1, lang + ": empieza la del miércoles");
      assert.ok(html.indexOf('data-perdida-ocultar="cuerpo_B"') !== -1, lang);
    });
    var ru = sandbox("ru");
    var html = ru.entrenoPerdidaHtml(ru.entrenoPerdidasDatos(planEjemplo(), logCon(ru, [hecha(LUNES - 3 * DIA, "cuerpo_A")]), JUEVES));
    assert.ok(html.indexOf("По плану была: среда, 21 октября.") !== -1, html);
    assert.ok(html.indexOf("Ещё пропущено на этой неделе: 1") !== -1);
    assert.strictEqual(ru.entrenoPerdidaHtml([]), "");
  });

  t.test("«Не переносить» vale para esta semana; la siguiente se olvida", function () {
    var s = sandbox();
    s.localStorage = almacen();
    assert.strictEqual(s.entrenoPerdidasOcultas(JUEVES).length, 0);
    s.entrenoPerdidaOcultar("cuerpo_B", JUEVES);
    s.entrenoPerdidaOcultar("cuerpo_B", JUEVES);
    assert.strictEqual(JSON.stringify(s.entrenoPerdidasOcultas(JUEVES + DIA)), '["cuerpo_B"]');
    assert.strictEqual(s.entrenoPerdidasOcultas(JUEVES + 7 * DIA).length, 0);
    s.localStorage = { getItem: function () { throw new Error("x"); }, setItem: function () { throw new Error("x"); } };
    assert.strictEqual(s.entrenoPerdidasOcultas(JUEVES).length, 0, "sin almacenamiento no se rompe");
    s.entrenoPerdidaOcultar("cuerpo_B", JUEVES);
  });

  t.test("la semana y «Entrenar» marcan la saltada", function () {
    var s = sandbox("ru");
    var semana = s.entrenoSemanaHtml({ dias: [{ dia: 1, plan: true, hecho: false, hoy: false, perdido: true }, { dia: 2, plan: false, hecho: false, hoy: true }] });
    assert.ok(semana.indexOf("is-perdido") !== -1 && semana.indexOf("Понедельник: пропущено") !== -1, semana);
    var elegir = s.entrenoElegirHtml({ estado: "descanso", dias: [], perdidas: [2] }, planEjemplo());
    assert.ok(/class="entreno__elegir-item is-perdida"><span class="entreno__elegir-dia">Ср<\/span>[\s\S]*?1 упр\. · пропущена/.test(elegir), elegir);
    assert.strictEqual(elegir.split("is-perdida").length - 1, 1, "solo la del miércoles");
  });

  t.test("el cronómetro de las series de tiempo: botón para la siguiente serie, el reloj en marcha y la meta", function () {
    var s = sandbox("ru");
    var log = s.entrenoLogVacio();
    var plancha = { id: "plancha", name: "Plancha", muscle: "core", compound: false, sets: 2, reps: "30-45 s", restSeconds: 60 };
    var sesion = s.entrenoLogIniciar(log, { key: "x", name: "X", exercises: [EJ[0], plancha] }, 1, JUEVES);
    var html = s.entrenoSesionPantallaHtml(sesion, log, JUEVES + 60000, {});
    assert.strictEqual(html.split('data-accion="crono"').length - 1, 1, "solo en la plancha, no en la banca");
    assert.ok(html.indexOf("Секундомер: подход 1") !== -1 && html.indexOf("Цель: 30–45 с") !== -1);
    s.entrenoLogPonerSerie(log, 1, 0, { reps: 40, hecha: true }, JUEVES + 90000);
    assert.ok(s.entrenoSesionPantallaHtml(sesion, log, JUEVES + 100000, {}).indexOf("Секундомер: подход 2") !== -1, "pasa a la siguiente sin hacer");
    var marcha = s.entrenoSesionPantallaHtml(sesion, log, JUEVES + 112000, { crono: { ej: 1, serie: 1, desde: JUEVES + 100000, avisado: false } });
    assert.ok(marcha.indexOf('data-crono role="timer"') !== -1 && marcha.indexOf(">0:12<") !== -1, "el reloj en marcha");
    assert.ok(marcha.indexOf('data-accion="crono-parar"') !== -1 && marcha.indexOf("Стоп — записать") !== -1);
    assert.strictEqual(marcha.split('data-accion="crono"').length - 1, 0, "en marcha no hay otro «Секундомер»");
    var listo = s.entrenoSesionPantallaHtml(sesion, log, JUEVES + 140000, { crono: { ej: 1, serie: 1, desde: JUEVES + 100000, avisado: true } });
    assert.ok(listo.indexOf("Цель достигнута") !== -1);
    var corrigiendo = s.entrenoSesionPantallaHtml(sesion, log, JUEVES + 140000, { corrigiendo: true });
    assert.strictEqual(corrigiendo.indexOf("sesion__crono"), -1, "corrigiendo una terminada, sin cronómetro");
    s.entrenoLogPonerSerie(log, 1, 1, { reps: 40, hecha: true }, JUEVES + 150000);
    assert.strictEqual(s.entrenoSesionPantallaHtml(sesion, log, JUEVES + 160000, {}).indexOf("sesion__crono"), -1, "todo hecho: ya no hay qué cronometrar");
    sinHuecos(marcha.slice(marcha.indexOf("sesion__crono")), "cronómetro");
  });
}

module.exports = { run: run };
