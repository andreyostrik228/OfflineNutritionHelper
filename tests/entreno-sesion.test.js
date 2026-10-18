/**
 * tests/entreno-sesion.test.js
 * ─────────────────────────────────────────────────────────────────────────
 * Modo entrenamiento y progreso (js/ui/entreno-sesion.js y
 * js/ui/entreno-progreso.js), sin DOM: el marcado de la sesión en marcha, el
 * resumen final, el aviso de sesión sin terminar, el progreso y el historial;
 * y que index.html trae los contenedores y carga los ficheros en orden.
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
    projPath("js/ui/render-entreno.js"),
    projPath("js/ui/entreno-sesion.js"),
    projPath("js/ui/entreno-progreso.js")
  ]);
  s._langMemoryState = lang || "ru";
  return s;
}

var HORA = 3600 * 1000;
var DIA = 24 * HORA;
var HOY = new Date(2026, 9, 18, 12).getTime();

var BANCA = { id: "press_banca_barra", name: "Press de banca con barra", muscle: "pecho", compound: true, sets: 3, reps: "6-10", restSeconds: 150, rir: 2 };
var PLANCHA = { id: "plancha", name: "Plancha", muscle: "core", compound: false, sets: 2, reps: "30-45 s", restSeconds: 60, rir: 2 };
var SESION_PLAN = { key: "superior_A", name: "Superior A", dia: 1, exercises: [BANCA, PLANCHA] };

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

function run(t) {

  t.test("la pantalla de la sesión: una tarjeta por ejercicio, una fila por serie y nada sin rellenar", function () {
    var s = sandbox("ru");
    var log = s.entrenoLogVacio();
    var sesion = s.entrenoLogIniciar(log, SESION_PLAN, 1, HOY);
    var html = s.entrenoSesionPantallaHtml(sesion, log, HOY + 65000);
    assert.strictEqual(html.split('class="sesion__ej"').length - 1, 2, "una tarjeta por ejercicio");
    assert.strictEqual(html.split('data-accion="check"').length - 1, 5, "3 series de banca + 2 de plancha");
    assert.ok(html.indexOf("1:05") !== -1, "el reloj de la sesión");
    assert.ok(html.indexOf("Подходы: 0 из 5") !== -1, "la cuenta de series");
    assert.ok(html.indexOf("6–10") !== -1 && html.indexOf("30–45 с") !== -1, "las repeticiones en ruso");
    assert.ok(html.indexOf("Сек") !== -1, "la plancha pide segundos");
    sinHuecos(html, "sesión nueva");
  });

  t.test("cada casilla y cada botón de serie tienen nombre para el lector de pantalla", function () {
    var s = sandbox("ru");
    var log = s.entrenoLogVacio();
    var html = s.entrenoSesionPantallaHtml(s.entrenoLogIniciar(log, SESION_PLAN, 1, HOY), log, HOY);
    var campos = html.match(/<input[^>]*>/g) || [];
    assert.ok(campos.length === 10, "dos casillas por serie: " + campos.length);
    campos.forEach(function (c) { assert.ok(/aria-label="[^"]+"/.test(c), "casilla sin nombre: " + c); });
    var botones = html.match(/<button[^>]*>/g) || [];
    botones.forEach(function (b) {
      var conTexto = !/class="sesion__icono"|data-accion="check"/.test(b);
      assert.ok(conTexto || /aria-label="[^"]+"/.test(b), "botón sin nombre: " + b);
    });
  });

  t.test("con historia: «В прошлый раз», la carga de hoy con coma decimal y el récord en la serie que lo bate", function () {
    var s = sandbox("ru");
    var log = logCon(s, [sesionHecha(HOY - 3 * DIA, BANCA, [[60, 10], [60, 10], [60, 10]])]);
    var sesion = s.entrenoLogIniciar(log, SESION_PLAN, 1, HOY);
    assert.strictEqual(sesion.ejercicios[0].series[0].kg, 62.5);
    s.entrenoLogPonerSerie(log, 0, 0, { hecha: true }, HOY + 60000);
    var html = s.entrenoSesionPantallaHtml(sesion, log, HOY + 90000);
    assert.ok(html.indexOf("В прошлый раз: 60 кг × 10, 10, 10") !== -1, "la última vez");
    assert.ok(html.indexOf("Сегодня: 62,5 кг") !== -1, "la sugerencia, con coma");
    assert.ok(html.indexOf('value="62,5"') !== -1, "la casilla ya trae el peso de hoy");
    assert.strictEqual(html.split("sesion__record").length - 1, 1, "una sola serie bate el récord");
    sinHuecos(html, "con historia");
  });

  t.test("las series se resumen agrupadas por peso; sin peso y de tiempo se dicen distinto", function () {
    var s = sandbox("ru");
    assert.strictEqual(s.entrenoSeriesTexto([{ kg: 60, reps: 10 }, { kg: 60, reps: 9 }, { kg: 65, reps: 8 }], false), "60 кг × 10, 9 · 65 кг × 8");
    assert.strictEqual(s.entrenoSeriesTexto([{ kg: 0, reps: 12 }, { kg: null, reps: 10 }], false), "свой вес × 12, 10");
    assert.strictEqual(s.entrenoSeriesTexto([{ kg: 0, reps: 30 }, { kg: 0, reps: 40 }], true), "30 с, 40 с");
    var en = sandbox("en");
    assert.strictEqual(en.entrenoSeriesTexto([{ kg: 62.5, reps: 8 }], false), "62.5 kg × 8", "en inglés, punto decimal");
  });

  t.test("el texto de la sugerencia sale para cada tipo y en los cuatro idiomas, sin huecos", function () {
    ["es", "en", "ru", "uk"].forEach(function (lang) {
      var s = sandbox(lang);
      var tipos = [
        [{ tipo: "nuevo", kg: null, reps: 6 }, BANCA, false],
        [{ tipo: "nuevo", kg: null, reps: 8 }, { reps: "8-12" }, true],
        [{ tipo: "subir", kg: 62.5, reps: 6 }, BANCA, false],
        [{ tipo: "mantener", kg: 60, reps: 9 }, BANCA, false],
        [{ tipo: "bajar", kg: 55, reps: 6 }, BANCA, false],
        [{ tipo: "variante", kg: 0, reps: 12 }, BANCA, true],
        [{ tipo: "mantener", kg: 0, reps: 40 }, PLANCHA, false]
      ];
      tipos.forEach(function (caso) {
        var texto = s.entrenoSugerenciaTexto(caso[0], caso[1], caso[2]);
        assert.ok(texto.length > 10, lang + " " + caso[0].tipo + ": vacío");
        assert.ok(!/[{}]|undefined|NaN/.test(texto), lang + " " + caso[0].tipo + ": " + texto);
      });
    });
  });

  t.test("el resumen final: tiempo, series, volumen con separador de miles y los récords", function () {
    var s = sandbox("ru");
    var html = s.entrenoResumenHtml({
      nombre: "Верх A", minutos: 52, series: 18, volumen: 4250,
      records: [
        { id: "press_banca_barra", name: "Press de banca con barra", tipo: "kg", kg: 62.5, reps: 8 },
        { id: "plancha", name: "Plancha", tipo: "reps", kg: 0, reps: 60, tiempo: true }
      ]
    });
    assert.ok(html.indexOf("52 мин") !== -1);
    assert.ok(/4\s250 кг/.test(html), "4 250 кг con el espacio de miles del ruso");
    assert.ok(html.indexOf("Жим штанги лёжа") !== -1, "el nombre del ejercicio en ruso");
    assert.ok(html.indexOf("62,5 кг × 8") !== -1);
    assert.ok(html.indexOf("60 с") !== -1, "el récord de la plancha va en segundos");
    assert.ok(html.indexOf('data-accion="listo"') !== -1);
    sinHuecos(html, "resumen");
  });

  t.test("el aviso de sesión sin terminar solo sale si hay una, con continuar y borrar", function () {
    var s = sandbox("ru");
    var log = s.entrenoLogVacio();
    assert.strictEqual(s.entrenoReanudarHtml(log, HOY), "");
    s.entrenoLogIniciar(log, SESION_PLAN, 1, HOY - 25 * 60000);
    var html = s.entrenoReanudarHtml(log, HOY);
    assert.ok(html.indexOf("data-reanudar") !== -1 && html.indexOf("data-descartar-curso") !== -1);
    assert.ok(html.indexOf("25 мин назад") !== -1, "cuándo empezó");
    assert.ok(html.indexOf("Верх A") !== -1, "el nombre de la sesión en ruso");
    sinHuecos(html, "aviso");
  });

  t.test("«hace…»: minutos, horas y días", function () {
    var s = sandbox("ru");
    assert.strictEqual(s.entrenoHace(5 * 60000), "5 мин назад");
    assert.strictEqual(s.entrenoHace(3 * HORA), "3 ч назад");
    assert.strictEqual(s.entrenoHace(3 * DIA), "3 дн. назад");
  });

  t.test("el progreso sin historia explica cómo empezar; con historia trae semana, racha, gráfica e historial", function () {
    var s = sandbox("ru");
    var vacio = s.entrenoProgresoHtml(s.entrenoLogVacio(), { dias: 4 }, HOY);
    assert.ok(vacio.indexOf("entreno__progreso-vacio") !== -1);
    assert.ok(vacio.indexOf("entreno__grafica") === -1, "sin datos no hay gráfica");

    var log = logCon(s, [
      sesionHecha(new Date(2026, 9, 6, 18).getTime(), BANCA, [[60, 8], [60, 8]]),
      sesionHecha(new Date(2026, 9, 13, 18).getTime(), BANCA, [[62.5, 8], [62.5, 8]]),
      sesionHecha(new Date(2026, 9, 15, 18).getTime(), PLANCHA, [[0, 40]])
    ]);
    var html = s.entrenoProgresoHtml(log, { dias: 4 }, HOY);
    assert.ok(html.indexOf("Тренировки: 2 из 4") !== -1, "dos de cuatro esta semana");
    assert.ok(html.indexOf("2 нед.") !== -1, "racha de dos semanas");
    assert.ok(/1\s000 кг/.test(html), "kilos de esta semana: 62,5 × 8 × 2 = 1000 (la plancha no suma)");
    assert.strictEqual(html.split('<li class="entreno__barra').length - 1, 8, "ocho barras");
    assert.strictEqual(html.split("data-borrar-sesion=").length - 1, 3, "cada sesión del historial se puede borrar");
    assert.ok(html.indexOf("is-hecho") !== -1, "los puntos de la semana");
    sinHuecos(html, "progreso");
  });

  t.test("la tabla del plan enseña «la última vez» y las repeticiones traducidas", function () {
    var s = sandbox("ru");
    var log = logCon(s, [sesionHecha(HOY - DIA, BANCA, [[60, 10], [60, 9]])]);
    var html = s.entrenoTablaHtml({ exercises: [BANCA, { id: "zancada", name: "Zancada", reps: "10-12 por lado", sets: 3, restSeconds: 90, rir: 2, tecnica: "x" }] }, log);
    assert.ok(html.indexOf("В прошлый раз: 60 кг × 10, 9") !== -1);
    assert.ok(html.indexOf("10–12 на сторону") !== -1);
    assert.strictEqual(s.entrenoRepsTexto("algo raro"), "algo raro", "lo que no es un rango sale tal cual");
    var sinLog = s.entrenoTablaHtml({ exercises: [BANCA] });
    assert.strictEqual(sinLog.indexOf("entreno__ultima"), -1, "sin diario, nada de «la última vez»");
  });

  t.test("cada día del plan tiene «Начать тренировку» con su número de sesión", function () {
    var s = sandbox("ru");
    var plan = s.entrenoPlanParaDatos({ dias: 3, objetivo: "bulk", nivel: "intermedio", equipamiento: "gimnasio", semana: 1 });
    var html = s.entrenoPlanHtml(plan, s.entrenoLogVacio());
    assert.strictEqual(html.split("data-empezar=").length - 1, 3);
    assert.ok(html.indexOf('data-empezar="2"') !== -1);
    assert.ok(html.indexOf("Начать тренировку") !== -1);
  });

  t.test("index.html trae los contenedores y carga el diario antes de la pantalla, y la sesión y el progreso después", function () {
    var html = fs.readFileSync(projPath("index.html"), "utf8");
    ["entrenoSesion", "entrenoReanudar", "entrenoProgreso"].forEach(function (id) {
      assert.ok(html.indexOf('id="' + id + '"') !== -1, "falta id=\"" + id + "\"");
    });
    var orden = ["js/data/exercises.js", "js/engine/workout-generator.js", "js/core/workout-log.js",
      "js/ui/render-entreno.js", "js/ui/entreno-sesion.js", "js/ui/entreno-progreso.js"].map(function (f) {
      var i = html.indexOf('<script src="' + f);
      assert.ok(i !== -1, "no se carga " + f);
      return i;
    });
    for (var k = 1; k < orden.length; k++) assert.ok(orden[k] > orden[k - 1], "orden de carga roto en la posición " + k);
  });
}

module.exports = { run: run };
