/**
 * tests/entreno-pestanas.test.js
 * ─────────────────────────────────────────────────────────────────────────
 * Las cinco secciones del panel de entrenamientos (2026-10-21,
 * js/ui/entreno-pestanas.js): qué bloque sale en cada una, los textos en los
 * cuatro idiomas, el CSS que esconde lo demás, y lo nuevo de cada sección
 * («Entrenar» sin sesión, la última sesión y el récord de «Inicio», el peso de
 * «Progreso»). La barra en sí, los toques y la medida se prueban con Chrome
 * sin interfaz (scripts/qa): los tests no tienen DOM.
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
    projPath("js/ui/render-entreno.js"),
    projPath("js/ui/entreno-sesion.js"),
    projPath("js/ui/entreno-progreso.js"),
    projPath("js/ui/entreno-pestanas.js")
  ]);
  s._langMemoryState = lang || "ru";
  return s;
}

var HORA = 3600 * 1000;
var DIA = 24 * HORA;
// Miércoles 21 de octubre de 2026, a mediodía.
var MIERCOLES = new Date(2026, 9, 21, 12).getTime();
var BANCA = { id: "press_banca_barra", name: "Press de banca con barra", muscle: "pecho", compound: true, sets: 3, reps: "6-10", restSeconds: 150 };
var REMO = { id: "remo_barra", name: "Remo con barra", muscle: "espalda", compound: true, sets: 3, reps: "6-10", restSeconds: 120 };
var PLAN = {
  ok: true,
  sesiones: [
    { key: "superior_A", name: "Superior A", dia: 1, exercises: [BANCA, REMO, BANCA] },
    { key: "inferior_A", name: "Inferior A", dia: 3, exercises: [{ id: "sentadilla_barra", name: "x", muscle: "cuadriceps", reps: "6-10" }] },
    { key: "superior_B", name: "Superior B", dia: 6, exercises: [REMO] }
  ]
};

function sesionHecha(inicio, ejercicio, series) {
  return {
    id: "s" + inicio, clave: "superior_A", nombre: "Superior A", semana: 1, inicio: inicio, fin: inicio + HORA,
    ejercicios: [{
      id: ejercicio.id, name: ejercicio.name, muscle: ejercicio.muscle, reps: ejercicio.reps, compound: ejercicio.compound,
      descanso: 120, series: series.map(function (x) { return { kg: x[0], reps: x[1], hecha: true, t: inicio + 600000 }; })
    }]
  };
}

function logCon(s, sesiones) {
  return s.entrenoLogLimpiar({ v: 1, sesiones: sesiones, enCurso: null });
}

function sinHuecos(html, donde) {
  ["undefined", "NaN", "null", "ent."].forEach(function (malo) {
    assert.strictEqual(html.indexOf(malo), -1, donde + ": aparece «" + malo + "»");
  });
}

/** La línea de index.html que lleva ese id (cada etiqueta del panel va en su línea). */
function lineaDe(html, id) {
  var i = html.indexOf('id="' + id + '"');
  assert.ok(i !== -1, "index.html no tiene #" + id);
  return html.slice(html.lastIndexOf("\n", i), html.indexOf("\n", i));
}

function run(t) {

  t.test("cinco secciones, en orden, con «Entrenar» en medio; un id raro vuelve a «Inicio»", function () {
    var s = sandbox("ru");
    assert.deepStrictEqual(JSON.parse(JSON.stringify(s.ENTRENO_PESTANAS.map(function (p) { return p.id; }))),
      ["inicio", "plan", "sesion", "progreso", "perfil"]);
    assert.strictEqual(s.ENTRENO_PESTANAS[2].principal, true);
    assert.strictEqual(s.entrenoPestanaValida("progreso"), "progreso");
    assert.strictEqual(s.entrenoPestanaValida("<script>"), "inicio");
    assert.strictEqual(s.entrenoPestanaValida(null), "inicio");
    assert.strictEqual(s.entrenoPestanaActual(), null, "sin barra no hay sección");
  });

  t.test("los nombres y los títulos de las secciones están en los cuatro idiomas", function () {
    var esperados = {
      ru: ["Главная", "План", "Тренировка", "Прогресс", "Профиль"],
      uk: ["Головна", "План", "Тренування", "Прогрес", "Профіль"],
      en: ["Home", "Plan", "Workout", "Progress", "Profile"],
      es: ["Inicio", "Plan", "Entrenar", "Progreso", "Perfil"]
    };
    Object.keys(esperados).forEach(function (lang) {
      var s = sandbox(lang);
      s.ENTRENO_PESTANAS.forEach(function (p, i) {
        assert.strictEqual(s.t(p.clave), esperados[lang][i], lang + " " + p.clave);
        assert.ok(s.t(p.titulo) && s.t(p.titulo).indexOf("ent.") === -1, lang + " " + p.titulo);
      });
      assert.ok(s.t("ent.secciones").indexOf("ent.") === -1, lang + " ent.secciones");
    });
  });

  t.test("cada bloque del panel dice en qué secciones sale", function () {
    var html = fs.readFileSync(projPath("index.html"), "utf8");
    var mapa = {
      entrenoOjo: "inicio", entrenoReanudar: "inicio sesion", entrenoHoy: "inicio sesion", entrenoSemanaCaja: "inicio",
      entrenoUltima: "inicio", entrenoElegir: "sesion", entrenoResumen: "plan", entrenoSinDias: "inicio plan sesion",
      entrenoProgreso: "progreso", entrenoPeso: "progreso", entrenoPerfil: "perfil", entrenoSalida: "plan"
    };
    Object.keys(mapa).forEach(function (id) {
      assert.ok(lineaDe(html, id).indexOf('data-en="' + mapa[id] + '"') !== -1, "#" + id + " debería salir en «" + mapa[id] + "»");
    });
    // La sesión y el cuestionario no llevan data-en: los enseñan .is-sesion y .is-cuestionario.
    assert.strictEqual(lineaDe(html, "entrenoSesion").indexOf("data-en="), -1);
    assert.strictEqual(lineaDe(html, "entrenoCuestionario").indexOf("data-en="), -1);
    // El perfil nace escondido: sin entreno-pestanas.js sus botones no harían nada.
    assert.ok(/ hidden/.test(lineaDe(html, "entrenoPerfil")), "#entrenoPerfil nace con hidden");
    ["icon-home", "icon-dumbbell", "icon-chart", "icon-calendar", "icon-user"].forEach(function (icono) {
      assert.ok(html.indexOf('<symbol id="' + icono + '"') !== -1, "falta el icono " + icono);
    });
    var tut = html.indexOf('<script src="js/ui/entreno-tutorial.js');
    var pest = html.indexOf('<script src="js/ui/entreno-pestanas.js');
    var app = html.indexOf('<script src="js/app.js');
    assert.ok(tut !== -1 && pest !== -1 && tut < pest && pest < app, "entreno-pestanas.js carga tras el tutorial y antes de app.js");
  });

  t.test("el CSS esconde lo de las demás secciones y la barra solo sale en entrenamientos", function () {
    var css = fs.readFileSync(projPath("assets/css/style.css"), "utf8");
    ["inicio", "plan", "sesion", "progreso", "perfil"].forEach(function (id) {
      assert.ok(css.indexOf('.entreno[data-pestana="' + id + '"] [data-en]:not([data-en~="' + id + '"])') !== -1, "falta la regla de «" + id + "»");
    });
    assert.ok(css.indexOf("body.modo-entreno .tabbar:not(.tabbar--entreno)") !== -1, "la barra del menú se esconde en entrenamientos, la nuestra no");
    assert.ok(css.indexOf("body:not(.modo-entreno) .tabbar--entreno") !== -1, "la nuestra se esconde en el menú");
    assert.ok(css.indexOf("var(--barra-entreno") !== -1, "el descanso se aparta lo que mide la barra");
  });

  t.test("«Entrenar» sin sesión: las demás sesiones con «Начать», sin la de hoy, y las hechas lo dicen con texto", function () {
    var s = sandbox("ru");
    var log = logCon(s, [sesionHecha(new Date(2026, 9, 19, 18).getTime(), BANCA, [[60, 8]])]); // lunes
    var datos = s.entrenoHoyDatos(PLAN, log, MIERCOLES);
    assert.strictEqual(datos.estado, "sesion", "el miércoles toca Inferior A");
    var html = s.entrenoElegirHtml(datos, PLAN);
    assert.strictEqual(html.split("data-empezar=").length - 1, 2, "la de hoy ya está en la tarjeta de arriba");
    assert.strictEqual(html.indexOf('data-empezar="1"'), -1);
    assert.ok(html.indexOf('data-empezar="0"') !== -1 && html.indexOf('data-empezar="2"') !== -1);
    assert.ok(html.indexOf("Другая тренировка") !== -1);
    assert.ok(html.indexOf("сделано на этой неделе") !== -1, "el lunes está hecho, y no solo por el color");
    assert.ok(html.indexOf("3 упр.") !== -1);
    sinHuecos(html, "elegir");
    // Un día de descanso: todas, con otro título.
    var jueves = s.entrenoHoyDatos(PLAN, log, MIERCOLES + DIA);
    var todas = s.entrenoElegirHtml(jueves, PLAN);
    assert.strictEqual(todas.split("data-empezar=").length - 1, 3);
    assert.ok(todas.indexOf("Тренировки недели") !== -1);
    assert.strictEqual(s.entrenoElegirHtml(datos, { ok: false }), "");
  });

  t.test("«Inicio»: la fecha con el tipo de día, la cuenta de la semana y los músculos de hoy", function () {
    var s = sandbox("ru");
    var log = logCon(s, [sesionHecha(new Date(2026, 9, 19, 18).getTime(), BANCA, [[60, 8]])]);
    var datos = s.entrenoHoyDatos(PLAN, log, MIERCOLES);
    var ojo = s.entrenoOjoTexto(datos, MIERCOLES);
    assert.ok(/21/.test(ojo) && ojo.indexOf("день тренировки") !== -1, ojo);
    assert.ok(s.entrenoOjoTexto(s.entrenoHoyDatos(PLAN, log, MIERCOLES + DIA), MIERCOLES + DIA).indexOf("день отдыха") !== -1);
    assert.ok(s.entrenoOjoTexto(null, MIERCOLES).indexOf("·") === -1, "sin plan, solo la fecha");
    assert.strictEqual(s.entrenoSemanaCuentaTexto(datos), "1 из 3");
    var musculos = s.entrenoHoyMusculosHtml(PLAN.sesiones[0]);
    assert.strictEqual(musculos.split("entreno__hoy-musculo\"").length - 1, 2, "pecho y espalda, sin repetir");
    assert.ok(musculos.indexOf("Грудь") !== -1, musculos);
    assert.strictEqual(s.entrenoHoyMusculosHtml({ exercises: [] }), "");
    var hoy = s.entrenoHoyHtml(datos, { duracion: 60 });
    assert.ok(hoy.indexOf("entreno__hoy-musculos") !== -1, "la tarjeta de hoy lleva los músculos");
    sinHuecos(hoy, "hoy");
  });

  t.test("«Inicio»: la última sesión con su botón, y el récord solo si batió a una sesión anterior", function () {
    var s = sandbox("ru");
    assert.strictEqual(s.entrenoUltimaSesionHtml(s.entrenoLogVacio()), "");
    var una = logCon(s, [sesionHecha(MIERCOLES - 3 * DIA, BANCA, [[60, 10], [60, 9]])]);
    var html = s.entrenoUltimaSesionHtml(una);
    assert.ok(html.indexOf('data-ver-sesion="s' + (MIERCOLES - 3 * DIA) + '"') !== -1, "el botón lleva a esa sesión");
    assert.ok(html.indexOf("Последняя тренировка") !== -1 && html.indexOf("Посмотреть результаты") !== -1);
    assert.strictEqual(html.indexOf("entreno__record"), -1, "la primera vez no hay récord");
    assert.strictEqual(s.entrenoUltimoRecord(una), null);

    var tres = logCon(s, [
      sesionHecha(MIERCOLES - 9 * DIA, BANCA, [[60, 8]]),
      sesionHecha(MIERCOLES - 6 * DIA, REMO, [[50, 8]]),
      sesionHecha(MIERCOLES - 2 * DIA, BANCA, [[65, 8]])
    ]);
    var r = s.entrenoUltimoRecord(tres);
    assert.strictEqual(r.id, "press_banca_barra");
    var conRecord = s.entrenoUltimaSesionHtml(tres);
    assert.ok(conRecord.indexOf("Последний рекорд") !== -1);
    assert.ok(conRecord.indexOf("65 кг × 8") !== -1, "la serie del récord");
    sinHuecos(conRecord, "última");
    // Si la última vez fue peor, el récord sigue siendo el de antes (y sigue saliendo).
    var peor = logCon(s, tres.sesiones.concat([sesionHecha(MIERCOLES - DIA, BANCA, [[62.5, 6]])]));
    assert.strictEqual(s.entrenoUltimoRecord(peor).mejor.t, MIERCOLES - 2 * DIA);
  });

  t.test("el historial marca cada sesión para que «Посмотреть результаты» la encuentre", function () {
    var s = sandbox("ru");
    var log = logCon(s, [sesionHecha(MIERCOLES - DIA, BANCA, [[60, 8]])]);
    var html = s.entrenoProgresoHtml(log, { dias: 3 }, MIERCOLES);
    assert.ok(html.indexOf('class="entreno__hist-item" data-sesion="s' + (MIERCOLES - DIA) + '"') !== -1);
  });

  t.test("«Progreso»: el peso, el último y cuánto cambió en 30 días; sin registro, cómo apuntarlo", function () {
    var s = sandbox("ru");
    var vacio = s.entrenoPesoHtml([], MIERCOLES);
    assert.ok(vacio.indexOf("Вы ещё не записывали вес") !== -1);
    assert.ok(vacio.indexOf("data-abrir-peso") !== -1, "el botón lleva a «Мои данные»");
    var html = s.entrenoPesoHtml([
      { fecha: "2026-08-30", kg: 84, t: 1 },
      { fecha: "2026-09-25", kg: 82.4, t: 2 },
      { fecha: "2026-10-20", kg: 80.9, t: 3 }
    ], MIERCOLES);
    assert.ok(html.indexOf("80,9 кг") !== -1, html);
    assert.ok(html.indexOf("−1,5 кг за 30 дней") !== -1, "desde la primera de los últimos 30 días, no desde agosto: " + html);
    sinHuecos(html, "peso");
    var solo = s.entrenoPesoHtml([{ fecha: "2026-10-20", kg: 80, t: 1 }], MIERCOLES);
    assert.strictEqual(solo.indexOf("entreno__peso-cambio"), -1, "con una sola medida no hay cambio");
  });

  t.test("la vibración y el sonido se pueden quitar, y sin almacenamiento siguen encendidos", function () {
    var s = sandbox("ru");
    var guardado = {};
    s.localStorage = { getItem: function (k) { return k in guardado ? guardado[k] : null; }, setItem: function (k, v) { guardado[k] = String(v); } };
    assert.strictEqual(s.entrenoVibracionOn(), true);
    s.entrenoVibracionPoner(false);
    assert.strictEqual(s.entrenoVibracionOn(), false);
    assert.strictEqual(guardado[s.ENTRENO_CLAVE_VIBRACION], "0");
    s.entrenoSonidoPoner(false);
    assert.strictEqual(s.entrenoSonidoOn(), false);
    s.localStorage = { getItem: function () { throw new Error("bloqueado"); }, setItem: function () { throw new Error("bloqueado"); } };
    assert.strictEqual(s.entrenoVibracionOn(), true);
    s.entrenoVibracionPoner(false); // no lanza
  });
}

module.exports = { run: run };
