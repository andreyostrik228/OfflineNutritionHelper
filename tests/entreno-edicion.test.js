/**
 * tests/entreno-edicion.test.js
 * ─────────────────────────────────────────────────────────────────────────
 * Cambiar la sesión sobre la marcha y corregir una terminada:
 *   - el diario guarda tipos de serie, superseries, notas, saltos, pausas,
 *     correcciones y borradas, y limpia lo que venga mal;
 *   - el calentamiento no cuenta para «la última vez», récords ni kilos;
 *   - js/core/workout-edit.js: mover, superseries, tipos, calentamiento,
 *     discos, pausa y el orden de una superserie;
 *   - la pantalla de la sesión enseña todo eso, también al corregir;
 *   - el programa cambiado a mano (cambios, quitados, extras) en el generador.
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
var REMO = { id: "remo_mancuerna", name: "Remo con mancuerna", muscle: "espalda", compound: true, sets: 3, reps: "8-12", restSeconds: 90, rir: 2 };
var PLANCHA = { id: "plancha", name: "Plancha", muscle: "core", compound: false, sets: 2, reps: "30-45 s", restSeconds: 60, rir: 2 };
var PLAN = { key: "superior_A", name: "Superior A", dia: 1, exercises: [BANCA, REMO, PLANCHA] };

function sinHuecos(html, donde) {
  ["undefined", "NaN", "null", "ent."].forEach(function (malo) {
    assert.strictEqual(html.indexOf(malo), -1, donde + ": aparece «" + malo + "»");
  });
}

function sesionHecha(s, inicio, series) {
  return {
    id: "s" + inicio, clave: "superior_A", nombre: "Superior A", semana: 1, inicio: inicio, fin: inicio + HORA,
    ejercicios: [{
      id: BANCA.id, name: BANCA.name, muscle: "pecho", reps: "6-10", compound: true, descanso: 150,
      series: series.map(function (x) { return { kg: x[0], reps: x[1], hecha: true, t: inicio + 60000, tipo: x[2] }; })
    }]
  };
}

function run(t) {

  t.test("el diario guarda tipo de serie, superserie, nota, salto, pausas, corrección y borradas, y limpia lo raro", function () {
    var s = sandbox();
    var log = s.entrenoLogLimpiar({
      v: 1,
      sesiones: [{
        id: "a", clave: "superior_A", nombre: "x", semana: 2, inicio: HOY - DIA, fin: HOY - DIA + HORA, pausas: 600000, editado: HOY,
        ejercicios: [{ id: "press_banca_barra", reps: "6-10", grupo: "A", nota: "  asiento 4  ", saltado: true,
          series: [{ kg: 40, reps: 8, hecha: true, tipo: "c" }, { kg: 60, reps: 8, hecha: true, tipo: "x" }] },
          { id: "remo_mancuerna", reps: "8-12", grupo: "Z", nota: "n".repeat(500), series: [{ kg: 20, reps: 10, hecha: true }] }]
      }],
      enCurso: { id: "b", inicio: HOY, pausaDesde: HOY + 1000, ejercicios: [{ id: "plancha", series: [{ kg: null, reps: 30 }] }] },
      borradas: [{ id: "c", t: 5 }, { id: "c", t: 9 }, { id: 3, t: 1 }, { id: "d" }]
    });
    var e = log.sesiones[0].ejercicios;
    assert.strictEqual(e[0].series[0].tipo, "c");
    assert.strictEqual(e[0].series[1].tipo, undefined, "un tipo desconocido es una serie normal");
    assert.strictEqual(e[0].grupo, "A");
    assert.strictEqual(e[1].grupo, undefined, "solo grupos de la A a la H");
    assert.strictEqual(e[0].nota, "asiento 4");
    assert.strictEqual(e[1].nota.length, 200, "la nota se corta en 200");
    assert.strictEqual(e[0].saltado, true);
    assert.strictEqual(log.sesiones[0].pausas, 600000);
    assert.strictEqual(log.sesiones[0].editado, HOY);
    assert.strictEqual(log.enCurso.pausaDesde, HOY + 1000);
    assert.deepStrictEqual(JSON.parse(JSON.stringify(log.borradas)), [{ id: "c", t: 9 }], "una por id, la más reciente, y solo válidas");
  });

  t.test("una sesión borrada no vuelve, y un id repetido queda una sola vez", function () {
    var s = sandbox();
    var log = s.entrenoLogLimpiar({
      sesiones: [sesionHecha(s, HOY - 2 * DIA, [[60, 8]]), sesionHecha(s, HOY - 2 * DIA, [[62.5, 8]]), sesionHecha(s, HOY - DIA, [[60, 8]])],
      borradas: [{ id: "s" + (HOY - DIA), t: HOY }]
    });
    assert.strictEqual(log.sesiones.length, 1);
    assert.strictEqual(log.sesiones[0].ejercicios[0].series[0].kg, 62.5, "con el id repetido se queda la última que llega");
    assert.ok(s.entrenoLogBorrar(log, log.sesiones[0].id, HOY + 5));
    assert.strictEqual(log.sesiones.length, 0);
    assert.strictEqual(log.borradas.filter(function (b) { return b.t === HOY + 5; }).length, 1, "queda apuntada en borradas");
    assert.strictEqual(s.entrenoLogBorrar(log, "no-existe", HOY), false);
  });

  t.test("el calentamiento no cuenta: ni «la última vez», ni la carga de hoy, ni récords, ni kilos", function () {
    var s = sandbox();
    var log = s.entrenoLogLimpiar({ sesiones: [sesionHecha(s, HOY - 3 * DIA, [[20, 10, "c"], [40, 5, "c"], [60, 10], [60, 10], [60, 10]])] });
    var ultima = s.entrenoLogUltimaVez(log, BANCA.id);
    assert.strictEqual(ultima.series.length, 3, "solo las tres de trabajo");
    assert.strictEqual(s.entrenoLogSugerencia(log, BANCA).kg, 62.5, "sube igual que sin calentamiento");
    var r = s.entrenoLogRecords(log, BANCA.id);
    assert.strictEqual(r.kg, 60);
    var tot = s.entrenoLogTotales(log.sesiones[0]);
    assert.strictEqual(tot.series, 3);
    assert.strictEqual(tot.volumen, 1800, "60 × 10 × 3; el calentamiento no suma");
  });

  t.test("las pausas no cuentan en los minutos; al terminar pausada, la pausa abierta también se descuenta", function () {
    var s = sandbox();
    var log = s.entrenoLogVacio();
    var sesion = s.entrenoLogIniciar(log, PLAN, 1, HOY);
    s.entrenoLogPonerSerie(log, 0, 0, { hecha: true, reps: 8, kg: 60 }, HOY + 10 * 60000);
    assert.strictEqual(s.entrenoEditPausa(sesion, HOY + 20 * 60000), true);
    assert.strictEqual(s.entrenoLogPausado(sesion, HOY + 30 * 60000), 10 * 60000);
    assert.strictEqual(s.entrenoEditPausa(sesion, HOY + 30 * 60000), false);
    assert.strictEqual(sesion.pausas, 10 * 60000);
    s.entrenoEditPausa(sesion, HOY + 40 * 60000);
    // Una serie hace poco: no es una sesión olvidada (eso la cerraría tras la última serie).
    s.entrenoLogPonerSerie(log, 0, 1, { hecha: true, reps: 8, kg: 60 }, HOY + 39 * 60000);
    var resumen = s.entrenoLogTerminar(log, HOY + 45 * 60000);
    assert.strictEqual(resumen.minutos, 30, "45 minutos menos 15 de pausa");
    assert.strictEqual(log.sesiones[0].pausas, 15 * 60000);
  });

  t.test("corregir una terminada: se queda con su día, quita lo desmarcado y apunta que se corrigió; vacía, se borra", function () {
    var s = sandbox();
    var log = s.entrenoLogLimpiar({ sesiones: [sesionHecha(s, HOY - DIA, [[60, 8], [60, 8], [60, 6]])] });
    var id = log.sesiones[0].id;
    var copia = JSON.parse(JSON.stringify(log.sesiones[0]));
    copia.ejercicios[0].series[2].hecha = false;
    copia.ejercicios[0].series[0].kg = 65;
    copia.inicio = 1;
    assert.strictEqual(s.entrenoLogReemplazar(log, id, copia, HOY), "cambiada");
    var nueva = log.sesiones[0];
    assert.strictEqual(nueva.inicio, HOY - DIA, "el día no cambia");
    assert.strictEqual(nueva.ejercicios[0].series.length, 2);
    assert.strictEqual(nueva.ejercicios[0].series[0].kg, 65);
    assert.strictEqual(nueva.editado, HOY);
    copia.ejercicios[0].series.forEach(function (x) { x.hecha = false; });
    assert.strictEqual(s.entrenoLogReemplazar(log, id, copia, HOY), "borrada");
    assert.strictEqual(log.sesiones.length, 0);
    assert.strictEqual(log.borradas[0].id, id);
    assert.strictEqual(s.entrenoLogReemplazar(log, "otra", copia, HOY), null);
  });

  t.test("superseries: unir, unir un tercero (circuito), separar y mover sin dejar ninguno suelto", function () {
    var s = sandbox();
    var log = s.entrenoLogVacio();
    var sesion = s.entrenoLogIniciar(log, PLAN, 1, HOY);
    function grupos() { return sesion.ejercicios.map(function (e) { return e.grupo || "-"; }).join(""); }
    assert.ok(s.entrenoEditSuperserie(sesion, 0));
    assert.strictEqual(grupos(), "AA-");
    assert.ok(s.entrenoEditSuperserie(sesion, 1));
    assert.strictEqual(grupos(), "AAA", "el tercero entra en el mismo grupo: circuito");
    assert.ok(s.entrenoEditSuperserie(sesion, 1));
    assert.strictEqual(grupos(), "AA-", "separar por el segundo deja dos y uno suelto");
    assert.ok(s.entrenoEditMover(sesion, 2, -1));
    assert.strictEqual(grupos(), "---", "al meterse en medio, la superserie se deshace: nunca queda uno solo");
    assert.strictEqual(s.entrenoEditSuperserie(sesion, 2), false, "el último no tiene siguiente");
    assert.strictEqual(s.entrenoEditMover(sesion, 0, -1), false);
  });

  t.test("en una superserie se va al siguiente sin descanso, y al acabar la ronda se descansa", function () {
    var s = sandbox();
    var log = s.entrenoLogVacio();
    var sesion = s.entrenoLogIniciar(log, PLAN, 1, HOY);
    s.entrenoEditSuperserie(sesion, 0);
    sesion.ejercicios[0].series[0].hecha = true;
    var a = s.entrenoEditSiguiente(sesion, 0, 0);
    assert.deepStrictEqual(JSON.parse(JSON.stringify(a)), { descanso: false, foco: [1, 0] });
    sesion.ejercicios[1].series[0].hecha = true;
    var b = s.entrenoEditSiguiente(sesion, 1, 0);
    assert.deepStrictEqual(JSON.parse(JSON.stringify(b)), { descanso: true, foco: [0, 1] });
    var suelto = s.entrenoEditSiguiente(sesion, 2, 0);
    assert.strictEqual(suelto.descanso, true);
    assert.strictEqual(suelto.foco, null);
  });

  t.test("el tipo de una serie da la vuelta: normal, calentamiento, drop set, al fallo, normal", function () {
    var s = sandbox();
    var log = s.entrenoLogVacio();
    var sesion = s.entrenoLogIniciar(log, PLAN, 1, HOY);
    assert.deepStrictEqual([1, 2, 3, 4].map(function () { return s.entrenoEditTipo(sesion, 0, 1); }).join(","), "c,d,f,");
    assert.strictEqual(sesion.ejercicios[0].series[1].tipo, undefined);
    assert.strictEqual(s.entrenoEditTipo(sesion, 0, 9), null);
  });

  t.test("calentamiento: con barra desde la barra y en pasos de 2,5; ligero, una serie; sin peso, media; de tiempo, nada", function () {
    var s = sandbox();
    var log = s.entrenoLogVacio();
    var sesion = s.entrenoLogIniciar(log, PLAN, 1, HOY);
    sesion.ejercicios[0].series.forEach(function (x) { x.kg = 60; });
    assert.strictEqual(s.entrenoEditCalentamiento(sesion, 0, true), 3);
    assert.deepStrictEqual(JSON.parse(JSON.stringify(sesion.ejercicios[0].series.slice(0, 3).map(function (x) { return [x.kg, x.reps, x.tipo]; }))),
      [[25, 8, "c"], [35, 5, "c"], [47.5, 3, "c"]]);
    assert.strictEqual(s.entrenoEditCalentamiento(sesion, 0, true), 0, "ya tiene calentamiento");
    sesion.ejercicios[1].series.forEach(function (x) { x.kg = 14; });
    sesion.ejercicios[1].compound = false;
    assert.strictEqual(s.entrenoEditCalentamiento(sesion, 1, false), 1);
    assert.deepStrictEqual([sesion.ejercicios[1].series[0].kg, sesion.ejercicios[1].series[0].reps], [7, 10]);
    assert.strictEqual(s.entrenoEditCalentamiento(sesion, 2, false), 0, "la plancha es de tiempo");
    sesion.ejercicios[1].series = [{ kg: 0, reps: 12, hecha: false }];
    sesion.ejercicios[1].reps = "8-12";
    assert.strictEqual(s.entrenoEditCalentamiento(sesion, 1, false), 1);
    assert.strictEqual(sesion.ejercicios[1].series[0].reps, 4, "sin peso: la mitad de lo bajo del rango");
  });

  t.test("discos por lado con barra de 20: exactos, con resto y por debajo de la barra", function () {
    var s = sandbox();
    assert.deepStrictEqual(JSON.parse(JSON.stringify(s.entrenoDiscos(100))), { lado: [25, 15], resto: 0, corta: false });
    assert.deepStrictEqual(JSON.parse(JSON.stringify(s.entrenoDiscos(62.5))), { lado: [20, 1.25], resto: 0, corta: false });
    assert.strictEqual(s.entrenoDiscos(101).resto, 0.5);
    assert.strictEqual(s.entrenoDiscos(15).corta, true);
    assert.deepStrictEqual(s.entrenoDiscos(20).lado.length, 0);
    assert.strictEqual(s.entrenoDiscos(0), null);
    assert.strictEqual(s.entrenoDiscosTexto(62.5), "Блины на каждую сторону: 20 + 1,25");
  });

  t.test("sustituir, añadir, saltar y quitar dejan la sesión válida", function () {
    var s = sandbox();
    var log = s.entrenoLogVacio();
    var sesion = s.entrenoLogIniciar(log, PLAN, 1, HOY);
    var pauta = { id: "press_banca_mancuernas", name: "Press de banca con mancuernas", muscle: "pecho", compound: true, reps: "6-10", descanso: 150, sets: 4 };
    s.entrenoEditSuperserie(sesion, 0);
    var nuevo = s.entrenoEditSustituir(sesion, 0, pauta, log);
    assert.strictEqual(nuevo.id, "press_banca_mancuernas");
    assert.strictEqual(nuevo.series.length, 4);
    assert.strictEqual(nuevo.grupo, "A", "la superserie se conserva");
    assert.ok(s.entrenoEditAnadir(sesion, pauta, log));
    assert.strictEqual(sesion.ejercicios.length, 4);
    assert.ok(s.entrenoEditSaltar(sesion, 2, true));
    assert.strictEqual(sesion.ejercicios[2].saltado, true);
    assert.ok(s.entrenoEditQuitar(sesion, 3));
    assert.strictEqual(sesion.ejercicios.length, 3);
    var limpio = s.entrenoLogLimpiar({ enCurso: sesion });
    assert.strictEqual(limpio.enCurso.ejercicios.length, 3, "lo que queda pasa la limpieza");
  });

  t.test("la pantalla enseña el menú, los tipos de serie, la superserie, los discos y lo saltado, sin huecos", function () {
    ["ru", "es", "en", "uk"].forEach(function (lang) {
      var s = sandbox(lang);
      var log = s.entrenoLogVacio();
      var sesion = s.entrenoLogIniciar(log, PLAN, 1, HOY);
      sesion.ejercicios[0].series.forEach(function (x) { x.kg = 62.5; });
      s.entrenoEditCalentamiento(sesion, 0, true);
      s.entrenoEditSuperserie(sesion, 0);
      s.entrenoEditSaltar(sesion, 2, true);
      s.entrenoEditNota(sesion, 0, "asiento 4");
      var html = s.entrenoSesionPantallaHtml(sesion, log, HOY + 60000);
      sinHuecos(html, lang);
      assert.ok(html.indexOf('data-accion="sustituir"') !== -1, lang + ": sustituir");
      assert.ok(html.indexOf('data-accion="superserie"') !== -1, lang + ": superserie");
      assert.ok(html.indexOf('data-accion="anadir"') !== -1, lang + ": añadir ejercicio");
      assert.ok(html.indexOf('data-accion="pausa"') !== -1, lang + ": pausa");
      assert.ok(html.indexOf("sesion__ej--g-ini") !== -1 && html.indexOf("sesion__ej--g-fin") !== -1, lang + ": la superserie se dibuja");
      assert.ok(html.indexOf("is-saltado") !== -1, lang + ": lo saltado");
      assert.ok(html.indexOf("sesion__discos") !== -1, lang + ": los discos de la barra");
      assert.ok(html.indexOf("sesion__n--c") !== -1, lang + ": la serie de calentamiento");
      assert.ok(html.indexOf("asiento 4") !== -1, lang + ": la nota");
    });
    var ru = sandbox("ru");
    var l = ru.entrenoLogVacio();
    var ses = ru.entrenoLogIniciar(l, PLAN, 1, HOY);
    ru.entrenoEditSuperserie(ses, 0);
    var h = ru.entrenoSesionPantallaHtml(ses, l, HOY);
    assert.ok(h.indexOf("Суперсет A") !== -1);
    var botones = h.match(/<button[^>]*class="sesion__n[^"]*"[^>]*>/g) || [];
    assert.ok(botones.length === 8, "un botón de tipo por serie: " + botones.length);
    botones.forEach(function (b) { assert.ok(/aria-label="[^"]+"/.test(b), "sin nombre: " + b); });
  });

  t.test("al corregir: «Сохранить», sin descanso ni pausa ni sugerencia de hoy", function () {
    var s = sandbox("ru");
    var log = s.entrenoLogLimpiar({ sesiones: [sesionHecha(s, HOY - DIA, [[60, 8], [60, 8]])] });
    var html = s.entrenoSesionPantallaHtml(log.sesiones[0], s.entrenoLogVacio(), HOY, { corrigiendo: true });
    sinHuecos(html, "corregir");
    assert.ok(html.indexOf('data-accion="guardar-edicion"') !== -1);
    assert.ok(html.indexOf("Правка тренировки") !== -1);
    assert.strictEqual(html.indexOf("data-descanso"), -1, "sin descanso");
    assert.strictEqual(html.indexOf('data-accion="pausa"'), -1, "sin pausa");
    assert.strictEqual(html.indexOf("sesion__sug"), -1, "sin sugerencia de hoy");
    assert.strictEqual(html.indexOf('data-accion="saltar"'), -1, "al corregir no se salta: se quita");
  });

  t.test("el programa a mano: un cambio sustituye en todas las sesiones, un hueco quitado se queda vacío y lo añadido va al final", function () {
    var s = sandbox("ru");
    var base = { dias: 4, objetivo: "bulk", nivel: "intermedio", equipamiento: "gimnasio", semana: 1 };
    var normal = s.entrenoPlanParaDatos(base);
    var sup = normal.sesiones[0];
    var primero = sup.exercises[0];
    assert.ok(primero.patron, "cada ejercicio dice su hueco");
    var otro = s.EXERCISE_CATALOG.filter(function (e) {
      return e.pattern === primero.patron && e.id !== primero.id && e.equipment.indexOf("barra") === -1;
    })[0];
    var conCambio = s.entrenoPlanParaDatos(Object.assign({}, base, { cambios: (function () { var c = {}; c[primero.id] = otro.id; return c; })() }));
    var cambiado = conCambio.sesiones[0].exercises.filter(function (e) { return e.id === otro.id; })[0];
    assert.ok(cambiado, "el cambio entra");
    assert.strictEqual(cambiado.cambiadoDe, primero.id);
    conCambio.sesiones.forEach(function (ses) {
      assert.strictEqual(ses.exercises.filter(function (e) { return e.id === primero.id; }).length, 0, "y sale en todas");
    });
    var quitado = s.entrenoPlanParaDatos(Object.assign({}, base, { quitados: [sup.key + ":" + primero.patron] }));
    assert.strictEqual(quitado.sesiones[0].exercises.length, sup.exercises.length - 1);
    assert.strictEqual(quitado.warnings.filter(function (w) { return w.indexOf("falta_ejercicio") === 0; }).length, 0, "sin aviso: lo quitó el usuario");
    var extras = {};
    extras[sup.key] = ["plancha"];
    var conExtra = s.entrenoPlanParaDatos(Object.assign({}, base, { extras: extras }));
    var plancha = conExtra.sesiones[0].exercises.filter(function (e) { return e.id === "plancha"; })[0];
    assert.ok(plancha && plancha.extra, "lo añadido está y se marca");
    var sinBarra = s.entrenoPlanParaDatos(Object.assign({}, base, { equipamiento: "sin_material",
      cambios: (function () { var c = {}; c.flexiones = "press_banca_barra"; return c; })() }));
    assert.strictEqual(sinBarra.sesiones[0].exercises.filter(function (e) { return e.id === "press_banca_barra"; }).length, 0,
      "un cambio que no se puede hacer con el material no entra");
  });

  t.test("las elecciones a mano se validan: ids del catálogo, huecos con forma y sesiones que existen", function () {
    var s = sandbox("ru");
    var p = s.entrenoPrefsLimpiar({
      cambios: { press_banca_barra: "press_banca_mancuernas", inventado: "plancha", plancha: "plancha", x: 3 },
      quitados: ["superior_A:curl_biceps", "mal", "superior_A:curl_biceps", 7],
      extras: { superior_A: ["plancha", "inventado", "plancha"], no_existe: ["plancha"] },
      t: 1234
    });
    assert.deepStrictEqual(JSON.parse(JSON.stringify(p.cambios)), { press_banca_barra: "press_banca_mancuernas" });
    assert.deepStrictEqual(JSON.parse(JSON.stringify(p.quitados)), ["superior_A:curl_biceps"]);
    assert.deepStrictEqual(JSON.parse(JSON.stringify(p.extras)), { superior_A: ["plancha"] });
    assert.strictEqual(p.t, 1234);
    assert.strictEqual(s.entrenoCambiosManuales(p), 3);
  });

  t.test("la tabla del plan trae los botones del programa y las marcas de lo cambiado a mano", function () {
    var s = sandbox("ru");
    s.entrenoCatalogoAbrir = function () {};
    var plan = s.entrenoPlanParaDatos({ dias: 3, objetivo: "bulk", nivel: "intermedio", equipamiento: "gimnasio", semana: 1, extras: { cuerpo_completo_A: ["plancha"] } });
    var html = s.entrenoPlanHtml(plan, s.entrenoLogVacio());
    sinHuecos(html, "plan editable");
    assert.ok(html.indexOf('data-prog="cambiar"') !== -1);
    assert.ok(html.indexOf('data-prog="quitar"') !== -1);
    assert.ok(html.indexOf('data-prog="anadir"') !== -1);
    assert.ok(html.indexOf("добавлено вами") !== -1);
    var reset = s.entrenoCambiosHtml(s.entrenoPrefsLimpiar({ quitados: ["superior_A:core"] }));
    assert.ok(reset.indexOf('data-prog="reset"') !== -1 && reset.indexOf("1") !== -1);
    assert.strictEqual(s.entrenoCambiosHtml(s.entrenoPrefsLimpiar({})), "");
  });
}

module.exports = { run: run };
