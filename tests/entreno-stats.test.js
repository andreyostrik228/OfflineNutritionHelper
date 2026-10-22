/**
 * tests/entreno-stats.test.js
 * ─────────────────────────────────────────────────────────────────────────
 * Progreso por ejercicio y por músculo (js/core/workout-stats.js), su
 * marcado en el panel (js/ui/entreno-progreso.js), el CSV del historial y el
 * catálogo de ejercicios con búsqueda y filtros (js/ui/entreno-catalogo.js).
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
    projPath("js/ui/entreno-catalogo.js")
  ]);
  s._langMemoryState = lang || "ru";
  return s;
}

var HORA = 3600 * 1000;
var DIA = 24 * HORA;
var HOY = new Date(2026, 9, 18, 12).getTime();   // domingo

function ses(inicio, ejercicios) {
  return { id: "s" + inicio, clave: "superior_A", nombre: "Superior A", semana: 1, inicio: inicio, fin: inicio + HORA, ejercicios: ejercicios };
}
function ej(id, muscle, reps, series) {
  return { id: id, name: id, muscle: muscle, reps: reps, compound: true, descanso: 90,
    series: series.map(function (x) { return { kg: x[0], reps: x[1], hecha: x[3] !== false, tipo: x[2] }; }) };
}

function sinHuecos(html, donde) {
  ["undefined", "NaN", "null", "ent.", "Infinity"].forEach(function (malo) {
    assert.strictEqual(html.indexOf(malo), -1, donde + ": aparece «" + malo + "»");
  });
}

function logEjemplo(s) {
  return s.entrenoLogLimpiar({ sesiones: [
    ses(HOY - 20 * DIA, [ej("press_banca_barra", "pecho", "6-10", [[20, 10, "c"], [60, 8], [60, 8]]), ej("plancha", "core", "30-45 s", [[0, 30]])]),
    ses(HOY - 13 * DIA, [ej("press_banca_barra", "pecho", "6-10", [[62.5, 8], [62.5, 7]]), ej("dominadas", "espalda", "6-10", [[0, 6], [0, 5]])]),
    ses(HOY - 6 * DIA, [ej("press_banca_barra", "pecho", "6-10", [[65, 8], [65, 6], [70, 3, undefined, false]]), ej("plancha", "core", "30-45 s", [[0, 45]])])
  ] });
}

function run(t) {

  t.test("progreso por ejercicio: un punto por sesión, 1RM estimado con peso, repeticiones sin peso, segundos de tiempo", function () {
    var s = sandbox();
    var lista = s.entrenoStatsEjercicios(logEjemplo(s));
    var banca = lista.filter(function (x) { return x.id === "press_banca_barra"; })[0];
    assert.strictEqual(banca.tipo, "peso");
    assert.strictEqual(banca.sesiones, 3);
    assert.strictEqual(banca.puntos.map(function (p) { return p.valor; }).join(","), "76,79.2,82.3", "Epley de la mejor serie; la no hecha y el calentamiento fuera");
    assert.strictEqual(banca.mejor.kg, 65);
    var dom = lista.filter(function (x) { return x.id === "dominadas"; })[0];
    assert.strictEqual(dom.tipo, "reps");
    assert.strictEqual(dom.mejor.reps, 6);
    var plancha = lista.filter(function (x) { return x.id === "plancha"; })[0];
    assert.strictEqual(plancha.tipo, "tiempo");
    assert.strictEqual(plancha.puntos.map(function (p) { return p.valor; }).join(","), "30,45");
    assert.strictEqual(lista[lista.length - 1].id, "dominadas", "el hecho hace más tiempo, al final");
  });

  t.test("carga por músculo: series de trabajo en la ventana, todos los grupos y la media semanal", function () {
    var s = sandbox();
    var m = s.entrenoStatsMusculos(logEjemplo(s), HOY, 14);
    var porGrupo = {};
    m.forEach(function (g) { porGrupo[g.grupo] = g; });
    assert.strictEqual(porGrupo.pecho.series, 4, "las dos últimas sesiones: 2 + 2 hechas");
    assert.strictEqual(porGrupo.pecho.porSemana, 2);
    assert.strictEqual(porGrupo.espalda.series, 2);
    assert.strictEqual(porGrupo.cuadriceps.series, 0, "un grupo sin entrenar sale con cero");
    assert.strictEqual(m[0].grupo, "pecho", "de más a menos");
    assert.strictEqual(m.length, 10);
  });

  t.test("cumplimiento: solo semanas terminadas desde la primera sesión, y una semana de más no compensa", function () {
    var s = sandbox();
    var log = logEjemplo(s);
    var c = s.entrenoStatsCumplimiento(log, 2, HOY, 4);
    // Hoy es domingo: la semana de hoy aún no ha terminado. Terminadas desde la
    // primera sesión: la del 28-9 y la del 5-10, con una sesión cada una.
    assert.strictEqual(c.semanas, 2, "dos semanas terminadas desde la primera sesión");
    assert.strictEqual(c.previstas, 4);
    assert.strictEqual(c.hechas, 2);
    assert.strictEqual(c.pct, 50);
    var extra = s.entrenoLogLimpiar({ sesiones: log.sesiones.concat([ses(HOY - 13 * DIA + HORA * 2, [ej("plancha", "core", "30-45 s", [[0, 40]])]),
      ses(HOY - 12 * DIA, [ej("plancha", "core", "30-45 s", [[0, 40]])])]) });
    assert.strictEqual(s.entrenoStatsCumplimiento(extra, 2, HOY, 4).hechas, 3, "tres en una semana cuentan como dos");
    assert.strictEqual(s.entrenoStatsCumplimiento(log, 0, HOY, 4), null, "sin plan");
    var reciente = s.entrenoLogLimpiar({ sesiones: [ses(HOY - DIA, [ej("plancha", "core", "30-45 s", [[0, 40]])])] });
    assert.strictEqual(s.entrenoStatsCumplimiento(reciente, 3, HOY, 4), null, "sin ninguna semana terminada todavía");
  });

  t.test("la gráfica: null con menos de dos puntos, y si no una línea dentro del recuadro", function () {
    var s = sandbox();
    assert.strictEqual(s.entrenoStatsGrafico([{ valor: 1 }], 300, 90), null);
    var g = s.entrenoStatsGrafico([{ valor: 70 }, { valor: 80 }, { valor: 75 }], 300, 90);
    assert.ok(/^M\d/.test(g.path) && g.path.split("L").length === 3);
    g.marcas.forEach(function (m) { assert.ok(0 <= m.x && m.x <= 300 && 0 <= m.y && m.y <= 90); });
    assert.strictEqual(g.marcas[1].y, 8, "el máximo arriba, con margen");
  });

  t.test("el CSV: BOM, cabecera, una fila por serie hecha, comillas y sin fórmulas de Excel", function () {
    var s = sandbox();
    var log = logEjemplo(s);
    log.sesiones[0].ejercicios[0].nota = '=HYPERLINK("x") y "comillas"';
    var csv = s.entrenoStatsCsv(log, { cabecera: ["a", "b", "c", "d", "e", "f", "g", "h", "i"] });
    assert.strictEqual(csv.charCodeAt(0), 0xFEFF);
    var filas = csv.slice(1).trim().split("\r\n");
    assert.strictEqual(filas[0], '"a","b","c","d","e","f","g","h","i"');
    assert.strictEqual(filas.length, 1 + 3 + 1 + 2 + 2 + 2 + 1, "solo las hechas");
    assert.ok(filas[1].indexOf("\"'=HYPERLINK(\"\"x\"\") y \"\"comillas\"\"\"") !== -1, "la nota no se toma por fórmula: " + filas[1]);
    assert.ok(filas[1].indexOf('"c"') !== -1, "el tipo de serie");
  });

  t.test("el panel de progreso trae cumplimiento, músculos, ejercicios con gráfica, CSV y «Изменить», sin huecos", function () {
    ["ru", "es", "en", "uk"].forEach(function (lang) {
      var s = sandbox(lang);
      var html = s.entrenoProgresoHtml(logEjemplo(s), { dias: 2 }, HOY);
      sinHuecos(html, lang);
      assert.ok(html.indexOf("entreno__musculos") !== -1, lang + ": músculos");
      assert.ok(html.indexOf("entreno__ejs") !== -1, lang + ": ejercicios");
      assert.ok(html.indexOf("<svg") !== -1 && html.indexOf("entreno__linea-trazo") !== -1, lang + ": gráfica");
      assert.ok(html.indexOf("data-csv") !== -1, lang + ": CSV");
      assert.strictEqual(html.split("data-corregir-sesion=").length - 1, 3, lang + ": corregir cada sesión");
      assert.ok(html.indexOf("50 %") !== -1, lang + ": cumplimiento");
    });
    var ru = sandbox("ru");
    var html = ru.entrenoProgresoHtml(logEjemplo(ru), { dias: 2 }, HOY);
    assert.ok(html.indexOf("Жим штанги лёжа") !== -1);
    assert.ok(html.indexOf("+8 %") !== -1, "de 76 a 82,3: +8 %");
    assert.ok(html.indexOf("разминка: 1") !== -1, "el historial dice el calentamiento aparte");
  });

  t.test("catálogo: busca en ruso, filtra por músculo y por material, y pone primero lo parecido", function () {
    var s = sandbox("ru");
    var todos = s.entrenoCatalogoLista({}, {}, null);
    assert.strictEqual(todos.length, s.EXERCISE_CATALOG.length);
    var jim = s.entrenoCatalogoLista({}, { busqueda: "жим лёжа" }, null);
    assert.ok(jim.length && jim.every(function (x) { return /жим/i.test(x.ejercicio.name_ru) || /лёж|леж/i.test(x.ejercicio.name_ru); }));
    assert.ok(s.entrenoCatalogoLista({}, { busqueda: "жим лежа" }, null).length === jim.length, "ё y е son lo mismo al buscar");
    assert.ok(s.entrenoCatalogoLista({}, { busqueda: "bench" }, null).length, "también en inglés");
    var pecho = s.entrenoCatalogoLista({}, { musculo: "pecho" }, null);
    assert.ok(pecho.every(function (x) { return x.ejercicio.muscle === "pecho"; }));
    var casa = s.entrenoCatalogoLista({}, { soloMio: true }, ["sin_material"]);
    assert.ok(casa.length && casa.every(function (x) { return x.ejercicio.equipment.every(function (m) { return m === "sin_material"; }); }));
    var parecidos = s.entrenoCatalogoLista({ parecidoA: "press_banca_barra", excluir: ["press_banca_barra"] }, {}, null);
    assert.strictEqual(parecidos[0].parecido, 0, "primero el mismo movimiento");
    assert.strictEqual(parecidos.filter(function (x) { return x.ejercicio.id === "press_banca_barra"; }).length, 0, "lo que ya está, fuera");
  });

  t.test("el marcado del catálogo: buscador con etiqueta, filtros, contador y botones con nombre, en los cuatro idiomas", function () {
    ["ru", "es", "en", "uk"].forEach(function (lang) {
      var s = sandbox(lang);
      var ver = s.entrenoCatalogoHtml({ modo: "ver" }, { soloMio: false }, null);
      sinHuecos(ver, lang + " ver");
      assert.ok(ver.indexOf('for="catBuscar"') !== -1);
      assert.strictEqual(ver.split("data-cat-musculo=").length - 1, 11, "«Todos» y diez músculos");
      assert.ok(ver.indexOf("cat__grupo") !== -1, "agrupado por músculo");
      var elegir = s.entrenoCatalogoHtml({ modo: "elegir", parecidoA: "plancha", casilla: { texto: "x" } }, { soloMio: false }, null);
      sinHuecos(elegir, lang + " elegir");
      var info = elegir.match(/<button[^>]*class="cat__info"[^>]*>/g) || [];
      assert.ok(info.length && info.every(function (b) { return /aria-label="[^"]+"/.test(b); }));
      assert.ok(elegir.indexOf("data-cat-casilla") !== -1);
      var vacio = s.entrenoCatalogoHtml({ modo: "ver" }, { busqueda: "zzzzzz" }, null);
      assert.ok(vacio.indexOf("cat__vacio") !== -1);
    });
  });

  t.test("index.html trae el catálogo y carga los ficheros nuevos en orden", function () {
    var html = fs.readFileSync(projPath("index.html"), "utf8");
    ["entrenoCatDialogo", "entrenoCatCuerpo", "entrenoCatTitulo"].forEach(function (id) {
      assert.ok(html.indexOf('id="' + id + '"') !== -1, "falta " + id);
    });
    assert.ok(html.indexOf('data-prog="catalogo"') !== -1, "botón del catálogo");
    var orden = ["js/core/workout-log.js", "js/core/workout-edit.js", "js/core/workout-stats.js", "js/ui/render-entreno.js",
      "js/ui/entreno-sesion.js", "js/ui/entreno-progreso.js", "js/ui/entreno-catalogo.js", "js/core/workout-sync.js"].map(function (f) {
      var i = html.indexOf('<script src="' + f);
      assert.ok(i !== -1, "no se carga " + f);
      return i;
    });
    for (var k = 1; k < orden.length; k++) assert.ok(orden[k - 1] < orden[k], "orden de carga roto en " + k);
  });

  // ── La página de un ejercicio (2026-10-22) ──────────────────────────────

  t.test("entrenoStatsFicha: récords con la fecha de la PRIMERA vez, sin calentamiento ni series sin hacer, y las últimas veces de la más reciente a la más antigua", function () {
    var s = sandbox();
    var log = logEjemplo(s);
    var f = s.entrenoStatsFicha(log, "press_banca_barra", 2);
    assert.strictEqual(f.tipo, "peso");
    assert.strictEqual(f.records.kg.kg, 65, "el 70 × 3 no se hizo: no cuenta");
    assert.strictEqual(f.records.kg.reps, 8, "a 65 kg, la serie de 8");
    assert.strictEqual(f.records.kg.t, HOY - 6 * DIA);
    assert.strictEqual(f.records.e1rm.valor, 82.3);
    assert.strictEqual(f.records.reps.reps, 10 - 2, "el calentamiento de 10 no cuenta: 8, y de la primera sesión");
    assert.strictEqual(f.records.reps.t, HOY - 20 * DIA, "empatar no mueve la fecha");
    assert.strictEqual(f.records.volumen.valor, 60 * 8 + 60 * 8, "960 de la primera sesión gana a 937,5 y a 910");
    assert.strictEqual(f.records.volumen.t, HOY - 20 * DIA);
    assert.strictEqual(f.ultimas.length, 2);
    assert.deepStrictEqual(JSON.parse(JSON.stringify(f.ultimas.map(function (v) { return v.t; }))), [HOY - 6 * DIA, HOY - 13 * DIA]);
    assert.strictEqual(f.puntos.length, 3, "la gráfica sigue teniendo todas");
    var plancha = s.entrenoStatsFicha(log, "plancha");
    assert.strictEqual(plancha.tipo, "tiempo");
    assert.strictEqual(plancha.records.reps.reps, 45);
    assert.strictEqual(plancha.records.kg, null);
    assert.strictEqual(plancha.records.volumen, null);
    assert.strictEqual(s.entrenoStatsFicha(log, "sentadilla_barra"), null, "nunca hecho");
  });

  t.test("la página del ejercicio: «Ваши результаты» con récords, gráfica y últimas veces; sin historia, la frase de qué saldrá; sin huecos en los cuatro idiomas", function () {
    ["ru", "es", "en", "uk"].forEach(function (lang) {
      var s = sandbox(lang);
      var log = logEjemplo(s);
      var html = s.entrenoFichaResultadosHtml("press_banca_barra", log);
      assert.ok(html.indexOf(s.t("ent.ficha_resultados")) !== -1, lang);
      assert.strictEqual(html.split('class="anim-record"').length - 1, 3, lang + ": 1RM, peso y volumen");
      assert.ok(html.indexOf("<svg") !== -1, lang + ": la gráfica");
      assert.strictEqual(html.split("anim-ficha__ultima-fecha").length - 1, 3, lang + ": las tres veces");
      sinHuecos(html, lang);
      var vacio = s.entrenoFichaResultadosHtml("sentadilla_barra", log);
      assert.ok(vacio.indexOf(s.escapeHtml(s.t("ent.ficha_sin_datos"))) !== -1 && vacio.indexOf("anim-record") === -1, lang + ": vacío");
      var dom = s.entrenoFichaResultadosHtml("dominadas", log);
      assert.strictEqual(dom.split('class="anim-record"').length - 1, 1, lang + ": sin peso, solo repeticiones");
      sinHuecos(dom, lang + " dominadas");
    });
    var s2 = sandbox("ru");
    s2.entrenoAnimacionHtml = function () { return ""; }; // la animación no es de esta prueba
    var ficha = s2.entrenoFichaHtml("press_banca_barra", logEjemplo(s2));
    assert.ok(ficha.indexOf("anim-ficha__tecnica") !== -1 && ficha.indexOf("anim-ficha__resultados") !== -1, "técnica y resultados en la misma página");
    assert.strictEqual(s2.entrenoFichaHtml("press_banca_barra").indexOf("anim-ficha__resultados"), -1, "sin diario, sin resultados");
    var progreso = s2.entrenoEjerciciosHtml(logEjemplo(s2));
    assert.ok(progreso.indexOf('data-anim-abrir="press_banca_barra"') !== -1, "«Progreso» abre la página del ejercicio");
  });
}

module.exports = { run: run };
