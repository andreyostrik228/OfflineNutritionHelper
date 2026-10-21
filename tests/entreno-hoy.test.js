/**
 * tests/entreno-hoy.test.js
 * ─────────────────────────────────────────────────────────────────────────
 * «Hoy» y la semana (entrenoHoyDatos, entrenoHoyHtml, entrenoSemanaHtml), el
 * tutorial del panel (js/ui/entreno-tutorial.js) y que cada clase que usan las
 * pantallas nuevas tiene una regla en style.css: sin eso, el marcado sale sin
 * estilo en el móvil.
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
    projPath("js/ui/entreno-tutorial.js")
  ]);
  s._langMemoryState = lang || "ru";
  return s;
}

function sinHuecos(html, donde) {
  ["undefined", "NaN", "null", "ent.", "tut."].forEach(function (malo) {
    assert.strictEqual(html.indexOf(malo), -1, donde + ": aparece «" + malo + "»");
  });
}

// Miércoles 21 de octubre de 2026, a mediodía (día 3 = miércoles).
var MIERCOLES = new Date(2026, 9, 21, 12).getTime();
var PLAN = {
  ok: true,
  sesiones: [
    { key: "superior_A", name: "Superior A", dia: 1, exercises: [{ id: "press_banca_barra", name: "x", reps: "6-10" }] },
    { key: "inferior_A", name: "Inferior A", dia: 3, exercises: [{ id: "sentadilla_barra", name: "x", reps: "6-10" }, { id: "plancha", name: "x", reps: "30-45 s" }] },
    { key: "superior_B", name: "Superior B", dia: 6, exercises: [{ id: "remo_barra", name: "x", reps: "6-10" }] }
  ]
};

function sesionEn(inicio) {
  return { id: "s" + inicio, clave: "superior_A", nombre: "Superior A", semana: 1, inicio: inicio, fin: inicio + 3600000,
    ejercicios: [{ id: "press_banca_barra", name: "x", muscle: "pecho", reps: "6-10", compound: true, descanso: 90,
      series: [{ kg: 60, reps: 8, hecha: true, t: inicio + 60000 }] }] };
}

function run(t) {

  t.test("hoy es miércoles: toca la sesión de ese día, con su botón, y la semana marca los días del plan", function () {
    var s = sandbox();
    var d = s.entrenoHoyDatos(PLAN, s.entrenoLogVacio(), MIERCOLES);
    assert.strictEqual(d.hoy, 3);
    assert.strictEqual(d.estado, "sesion");
    assert.strictEqual(d.indice, 1, "la segunda del plan");
    assert.strictEqual(d.sesion.key, "inferior_A");
    assert.strictEqual(d.dias.filter(function (x) { return x.plan; }).map(function (x) { return x.dia; }).join(","), "1,3,6");
    assert.strictEqual(d.dias.filter(function (x) { return x.hoy; })[0].dia, 3);
    assert.strictEqual(d.siguiente.dia, 6, "la siguiente es el sábado");
  });

  t.test("si ya se hizo hoy, no vuelve a ofrecerla; la semana marca el día como hecho", function () {
    var s = sandbox();
    var log = s.entrenoLogLimpiar({ sesiones: [sesionEn(MIERCOLES - 3600000)] });
    var d = s.entrenoHoyDatos(PLAN, log, MIERCOLES);
    assert.strictEqual(d.estado, "hecho");
    assert.strictEqual(d.dias.filter(function (x) { return x.hecho; })[0].dia, 3);
    var html = s.entrenoHoyHtml(d, { duracion: 60 });
    assert.strictEqual(html.indexOf("data-empezar"), -1, "sin botón de empezar");
    assert.ok(html.indexOf("Сегодня тренировка уже сделана") !== -1);
  });

  t.test("un día sin entreno enseña el descanso y la siguiente; la sesión de la semana pasada no cuenta", function () {
    var s = sandbox();
    var jueves = MIERCOLES + 24 * 3600000;
    var d = s.entrenoHoyDatos(PLAN, s.entrenoLogVacio(), jueves);
    assert.strictEqual(d.estado, "descanso");
    assert.strictEqual(d.siguiente.dia, 6);
    var html = s.entrenoHoyHtml(d, { duracion: 60 });
    assert.ok(html.indexOf("Сегодня тренировки нет") !== -1);
    assert.ok(html.indexOf("Следующая: Сб, Верх тела B") !== -1 || html.indexOf("Следующая: Сб") !== -1, "la siguiente con su día");
    var semanaPasada = s.entrenoLogLimpiar({ sesiones: [sesionEn(MIERCOLES - 7 * 24 * 3600000)] });
    assert.strictEqual(s.entrenoHoyDatos(PLAN, semanaPasada, MIERCOLES).estado, "sesion", "la de la semana pasada no marca hoy");
  });

  t.test("la tarjeta de hoy trae duración y número de ejercicios, y el botón lleva el índice del plan", function () {
    ["ru", "es", "en", "uk"].forEach(function (lang) {
      var s = sandbox(lang);
      var d = s.entrenoHoyDatos(PLAN, s.entrenoLogVacio(), MIERCOLES);
      var html = s.entrenoHoyHtml(d, { duracion: 45 });
      sinHuecos(html, lang);
      assert.ok(html.indexOf('data-empezar="1"') !== -1, lang + ": índice");
      assert.ok(html.indexOf("45") !== -1 && html.indexOf("2") !== -1, lang + ": duración y número");
      assert.ok(html.indexOf("entreno__empezar") !== -1, lang + ": botón grande");
    });
  });

  t.test("la semana se pinta en los cuatro idiomas, con nombre accesible para cada día", function () {
    ["ru", "es", "en", "uk"].forEach(function (lang) {
      var s = sandbox(lang);
      var html = s.entrenoSemanaHtml(s.entrenoHoyDatos(PLAN, s.entrenoLogVacio(), MIERCOLES));
      sinHuecos(html, lang + " semana");
      assert.strictEqual(html.split("<li").length - 1, 7, lang + ": siete días");
      assert.ok(html.indexOf("is-hoy") !== -1 && html.indexOf("is-plan") !== -1, lang + ": marcas");
      assert.ok(html.indexOf('class="visually-hidden"') !== -1, lang + ": nombre para el lector");
    });
  });

  t.test("el tutorial: cinco pasos en cuatro idiomas, con su ilustración, puntos y botones; sin huecos", function () {
    ["ru", "es", "en", "uk"].forEach(function (lang) {
      var s = sandbox(lang);
      for (var paso = 0; paso < s.ENTRENO_TUT_PASOS; paso++) {
        var html = s.entrenoTutorialHtml(paso);
        sinHuecos(html, lang + " paso " + paso);
        assert.ok(html.indexOf("tut__ilustracion") !== -1 && html.indexOf("tut__titulo") !== -1, lang + " paso " + paso);
        assert.strictEqual((html.match(/class="tut__punto(?: |")/g) || []).length, s.ENTRENO_TUT_PASOS, "un punto por paso");
        assert.strictEqual(html.indexOf('data-tut="atras"') !== -1, paso > 0, "«Atrás» desde el segundo");
        assert.strictEqual(html.indexOf('data-tut="fin"') !== -1, paso === s.ENTRENO_TUT_PASOS - 1, "«Entendido» solo al final");
      }
      assert.strictEqual(s.entrenoTutorialHtml(99).indexOf('data-tut-paso="4"') !== -1, true, "un paso fuera de rango cae en el último");
    });
  });

  t.test("cada texto del tutorial existe en los cuatro idiomas", function () {
    var s = sandbox();
    var claves = ["ent.tut_abrir", "ent.tut_paso", "ent.tut_atras", "ent.tut_siguiente", "ent.tut_fin"];
    for (var n = 1; n <= 5; n++) claves.push("ent.tut" + n + "_t", "ent.tut" + n + "_x");
    ["es", "en", "ru", "uk"].forEach(function (lang) {
      claves.forEach(function (k) {
        assert.notStrictEqual(s.tOr(k, "FALTA", lang), "FALTA", lang + ": falta " + k);
      });
    });
  });

  t.test("index.html trae «Cómo se usa», «Hoy», la semana, el diálogo y el script antes de entreno-cuestionario", function () {
    var html = fs.readFileSync(projPath("index.html"), "utf8");
    ["entTutorial", "entrenoHoy", "entrenoSemanaCaja", "entrenoSemana", "entTutDialogo", "entTutCuerpo", "entTutCerrar"].forEach(function (id) {
      assert.ok(html.indexOf('id="' + id + '"') !== -1, "falta id=\"" + id + "\"");
    });
    var tut = html.indexOf('<script src="js/ui/entreno-tutorial.js');
    var cat = html.indexOf('<script src="js/ui/entreno-catalogo.js');
    assert.ok(tut !== -1 && cat !== -1 && cat < tut, "el tutorial carga después del catálogo");
  });

  t.test("cada clase de las pantallas nuevas tiene su regla en style.css", function () {
    var css = fs.readFileSync(projPath("assets/css/style.css"), "utf8");
    var ficheros = ["js/ui/render-entreno.js", "js/ui/entreno-sesion.js", "js/ui/entreno-progreso.js",
      "js/ui/entreno-catalogo.js", "js/ui/entreno-tutorial.js", "js/ui/entreno-pestanas.js"];
    var sinRegla = [];
    ficheros.forEach(function (f) {
      var codigo = fs.readFileSync(projPath(f), "utf8");
      var re = /class="([a-z][a-z0-9_-]*(?: [a-z][a-z0-9_-]*)*)"/g;
      var m;
      while ((m = re.exec(codigo))) {
        m[1].split(" ").forEach(function (clase) {
          // Las que no llevan regla propia son de los temas de color o de utilidad.
          if (/^(visually-hidden|btn-primary|btn-secondary|auth-dialog|entreno__empezar|sesion__ej-num|anim)$/.test(clase)) return;
          var patron = new RegExp("\\." + clase.replace(/[-]/g, "\\-") + "(?![a-z0-9_-])");
          if (!patron.test(css) && sinRegla.indexOf(clase) === -1) sinRegla.push(clase + " (" + path.basename(f) + ")");
        });
      }
    });
    assert.deepStrictEqual(sinRegla, [], "clases sin estilo");
  });
}

module.exports = { run: run };
