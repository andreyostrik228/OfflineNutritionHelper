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

  // ── «Progreso» por periodos (2026-10-23) ───────────────────────────────

  t.test("periodos: 7 días por día, mes y 3 meses por semana, año por mes; «todo» desde la primera sesión; una clave rara es el mes", function () {
    var s = sandbox("ru");
    var log = logEjemplo(s);
    var p7 = s.entrenoStatsPeriodo("7d", log, HOY);
    assert.strictEqual(p7.paso, "dia");
    assert.strictEqual(p7.dias, 7);
    assert.strictEqual(p7.desde, new Date(2026, 9, 12).getTime(), "de la medianoche del lunes 12 al domingo 18");
    assert.strictEqual(s.entrenoStatsTramos(log, p7).length, 7);
    var raro = s.entrenoStatsPeriodo("siglo", log, HOY);
    assert.strictEqual(raro.clave, "mes");
    assert.strictEqual(raro.paso, "semana");
    assert.strictEqual(s.entrenoStatsPeriodo("3m", log, HOY).paso, "semana");
    var ano = s.entrenoStatsPeriodo("ano", log, HOY);
    assert.strictEqual(ano.paso, "mes");
    assert.strictEqual(s.entrenoStatsTramos(log, ano).length, 13, "de octubre de 2025 a octubre de 2026");
    var todo = s.entrenoStatsPeriodo("todo", log, HOY);
    assert.strictEqual(todo.desde, new Date(2026, 8, 28).getTime(), "la primera sesión, 20 días antes");
    assert.strictEqual(todo.dias, 21);
    var vacio = s.entrenoStatsPeriodo("todo", s.entrenoLogVacio(), HOY);
    assert.strictEqual(vacio.dias, 1, "sin sesiones, «todo» es hoy");
  });

  t.test("cifras y récords del periodo: sesiones dentro, récords cuando se bate a TODAS las anteriores", function () {
    var s = sandbox("ru");
    var log = logEjemplo(s);
    var mes = s.entrenoStatsResumen(log, s.entrenoStatsPeriodo("mes", log, HOY));
    assert.strictEqual(mes.sesiones, 3);
    assert.strictEqual(mes.minutos, 180);
    assert.strictEqual(mes.records.length, 3, "banca dos veces (62,5 y 65) y plancha (45 s); las dominadas solo una vez");
    assert.strictEqual(mes.records[0].punto.t, HOY - 6 * DIA, "lo más reciente primero");
    assert.strictEqual(mes.records[2].punto.sid, "s" + (HOY - 13 * DIA), "cada récord sabe su sesión");
    var p7 = s.entrenoStatsPeriodo("7d", log, HOY);
    var semana = s.entrenoStatsResumen(log, p7);
    assert.strictEqual(semana.sesiones, 1);
    assert.strictEqual(semana.records.length, 2);
    var tramos = s.entrenoStatsTramos(log, p7);
    assert.strictEqual(tramos[0].sesiones, 1, "el lunes 12");
    assert.strictEqual(tramos.reduce(function (n, x) { return n + x.sesiones; }, 0), 1);
    assert.strictEqual(tramos[0].volumen, semana.volumen);
  });

  t.test("«Прогресс»: periodos, cuatro cifras, cuatro apartados en pestañas (los demás con hidden), sin huecos", function () {
    ["ru", "es", "en", "uk"].forEach(function (lang) {
      var s = sandbox(lang);
      ["7d", "mes", "3m", "ano", "todo"].forEach(function (p) {
        var html = s.entrenoProgresoHtml(logEjemplo(s), { dias: 2 }, HOY, { periodo: p, vista: "volumen" });
        sinHuecos(html, lang + " " + p);
        assert.strictEqual(html.split("data-progreso-periodo=").length - 1, 5, lang + " " + p + ": cinco periodos");
        assert.ok(html.indexOf('aria-pressed="true" data-progreso-periodo="' + p + '"') !== -1, lang + " " + p + ": el elegido, marcado");
        assert.strictEqual(html.split('role="tab"').length - 1, 4, lang + ": cuatro pestañas");
        assert.ok(html.indexOf('id="progresoTab-volumen" aria-controls="progresoVista-volumen" aria-selected="true"') !== -1, lang + ": «Volumen» elegido");
        assert.ok(html.indexOf('id="progresoVista-volumen" aria-labelledby="progresoTab-volumen">') !== -1, lang + ": su panel se ve");
        assert.strictEqual(html.split('role="tabpanel"').length - 1, 4);
        assert.strictEqual((html.match(/role="tabpanel"[^>]* hidden>/g) || []).length, 3, lang + ": los otros tres, escondidos");
        assert.strictEqual(html.split('class="entreno__cifra"').length - 1, 4 + 3, lang + ": cuatro cifras del periodo y las tres de la semana");
      });
    });
    var ru = sandbox("ru");
    var html = ru.entrenoProgresoHtml(logEjemplo(ru), { dias: 2 }, HOY, { periodo: "7d" });
    assert.ok(html.indexOf('entreno__cifra-valor">1 ч</strong>') !== -1, "una hora justa en 7 días, sin «0 мин»");
    assert.ok(html.indexOf("Объём по дням") !== -1 && html.indexOf("Тренировки по дням") !== -1);
    assert.ok(html.indexOf('aria-selected="true" tabindex="0" data-progreso-vista="fuerza"') !== -1, "sin apartado guardado, «Сила»");
  });

  t.test("los puntos de la gráfica y los récords abren su sesión; en la página del ejercicio, no", function () {
    var s = sandbox("ru");
    var log = logEjemplo(s);
    var html = s.entrenoProgresoHtml(log, { dias: 2 }, HOY, { periodo: "mes" });
    assert.ok(html.indexOf('class="entreno__linea-toque"') !== -1);
    assert.ok(/<circle class="entreno__linea-toque"[^>]* data-ver-sesion="s\d+" aria-label="[^"]+"/.test(html), "cada punto, con su sesión y su nombre");
    assert.ok(html.indexOf('data-ver-sesion="s' + (HOY - 20 * DIA) + '"') !== -1, "también el primero");
    assert.ok(html.indexOf('role="group"') !== -1, "con puntos que se pulsan, el SVG no es una imagen");
    assert.ok(html.indexOf('class="entreno__record-fila" data-ver-sesion="s' + (HOY - 6 * DIA) + '"') !== -1, "el récord abre su sesión");
    assert.ok(html.indexOf("Нажмите на точку графика") !== -1);
    var ficha = s.entrenoFichaResultadosHtml("press_banca_barra", log);
    assert.strictEqual(ficha.indexOf("entreno__linea-toque"), -1, "la página del ejercicio va en un diálogo aparte");
  });

  t.test("un ejercicio con una sola sesión en el periodo se compara con la anterior; lo que no se hizo en el periodo no sale", function () {
    var s = sandbox("ru");
    var log = logEjemplo(s);
    var p7 = s.entrenoStatsPeriodo("7d", log, HOY);
    var html = s.entrenoEjerciciosHtml(log, p7);
    assert.ok(html.indexOf("Жим штанги лёжа") !== -1);
    assert.ok(html.indexOf("тренировок: 1") !== -1, "cuenta solo la sesión del periodo");
    assert.ok(html.indexOf("+4 %") !== -1, "de 79,2 (la anterior) a 82,3: " + html);
    assert.ok(html.indexOf("entreno__linea-trazo") !== -1, "con la anterior ya hay línea");
    var dominadas = s.entrenoNombre({ id: "dominadas", name: "dominadas" });
    assert.strictEqual(html.indexOf(dominadas), -1, "las dominadas no se hicieron en estos 7 días");
  });

  t.test("la sesión pedida sale en el historial aunque caiga fuera del periodo", function () {
    var s = sandbox("ru");
    var log = logEjemplo(s);
    var vieja = 's' + (HOY - 20 * DIA);
    var sin = s.entrenoProgresoHtml(log, { dias: 2 }, HOY, { periodo: "7d" });
    assert.strictEqual(sin.indexOf('class="entreno__hist-item" data-sesion="' + vieja + '"'), -1);
    var con = s.entrenoProgresoHtml(log, { dias: 2 }, HOY, { periodo: "7d", forzada: vieja });
    assert.ok(con.indexOf('class="entreno__hist-item" data-sesion="' + vieja + '"') !== -1);
    assert.strictEqual(con.split('class="entreno__hist-item"').length - 1, 2, "la del periodo y la pedida");
  });

  t.test("«Тело»: el cambio y la gráfica del peso dentro del periodo; «todo» lo ve entero", function () {
    var s = sandbox("ru");
    var log = logEjemplo(s);
    var pesos = [
      { fecha: "2026-07-01", kg: 85, t: 1 },
      { fecha: "2026-09-25", kg: 82.4, t: 2 },
      { fecha: "2026-10-10", kg: 81.6, t: 3 },
      { fecha: "2026-10-17", kg: 80.9, t: 4 }
    ];
    var mes = s.entrenoPesoHtml(pesos, HOY, s.entrenoStatsPeriodo("mes", log, HOY));
    assert.ok(mes.indexOf("−1,5 кг за период") !== -1, mes);
    assert.ok(mes.indexOf("entreno__peso-grafica") !== -1);
    sinHuecos(mes, "peso mes");
    var todo = s.entrenoPesoHtml(pesos, HOY, s.entrenoStatsPeriodo("todo", log, HOY));
    assert.ok(todo.indexOf("−4,1 кг за период") !== -1, "desde julio, antes de la primera sesión: " + todo);
    var semana = s.entrenoPesoHtml(pesos, HOY, s.entrenoStatsPeriodo("7d", log, HOY));
    assert.strictEqual(semana.indexOf("entreno__peso-cambio"), -1, "una sola medida en 7 días: sin cambio");
    assert.strictEqual(semana.indexOf("entreno__peso-grafica"), -1, "ni gráfica");
    var panel = s.entrenoProgresoHtml(log, { dias: 2 }, HOY, { periodo: "mes", vista: "cuerpo", pesos: pesos });
    assert.ok(panel.indexOf('id="progresoVista-cuerpo" aria-labelledby="progresoTab-cuerpo"><div class="entreno__cuerpo">') !== -1);
    var sinSesiones = s.entrenoProgresoHtml(s.entrenoLogVacio(), { dias: 2 }, HOY, { pesos: pesos });
    assert.ok(sinSesiones.indexOf("entreno__progreso-vacio") !== -1 && sinSesiones.indexOf("80,9 кг") !== -1, "sin sesiones, el peso sigue a la vista");
  });

  t.test("el periodo y el apartado se recuerdan; lo raro o sin almacenamiento, el mes y «Сила»", function () {
    var s = sandbox("ru");
    var guardado = {};
    s.localStorage = { getItem: function (k) { return k in guardado ? guardado[k] : null; }, setItem: function (k, v) { guardado[k] = String(v); } };
    assert.strictEqual(JSON.stringify(s.entrenoProgresoEstadoLeer()), '{"periodo":"mes","vista":"fuerza"}');
    guardado[s.ENTRENO_PROGRESO_CLAVE] = JSON.stringify({ periodo: "3m", vista: "cuerpo" });
    assert.strictEqual(JSON.stringify(s.entrenoProgresoEstadoLeer()), '{"periodo":"3m","vista":"cuerpo"}');
    guardado[s.ENTRENO_PROGRESO_CLAVE] = JSON.stringify({ periodo: "siglo", vista: "constructor" });
    assert.strictEqual(JSON.stringify(s.entrenoProgresoEstadoLeer()), '{"periodo":"mes","vista":"fuerza"}');
    guardado[s.ENTRENO_PROGRESO_CLAVE] = "{roto";
    assert.strictEqual(JSON.stringify(s.entrenoProgresoEstadoLeer()), '{"periodo":"mes","vista":"fuerza"}');
    s.localStorage = { getItem: function () { throw new Error("bloqueado"); } };
    assert.strictEqual(JSON.stringify(s.entrenoProgresoEstadoLeer()), '{"periodo":"mes","vista":"fuerza"}');
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
