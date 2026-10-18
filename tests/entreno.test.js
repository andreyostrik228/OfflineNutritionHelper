/**
 * tests/entreno.test.js
 * ─────────────────────────────────────────────────────────────────────────
 * Pantalla de entrenamientos (js/ui/render-entreno.js) sin DOM: el plan que
 * sale para unos datos, los avisos traducidos, las elecciones guardadas y
 * que la marcación tiene todo lo que el script busca por id.
 * ─────────────────────────────────────────────────────────────────────────
 */

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var loadBrowserGlobals = require("./lib/load-browser-globals").loadBrowserGlobals;

function projPath(rel) { return path.join(__dirname, "..", rel); }

function sandbox() {
  return loadBrowserGlobals([
    projPath("js/core/i18n.js"),
    projPath("js/i18n/es.js"),
    projPath("js/i18n/ru.js"),
    projPath("js/core/utils.js"),
    projPath("js/data/exercises.js"),
    projPath("js/engine/workout-generator.js"),
    projPath("js/ui/render-entreno.js")
  ]);
}

function almacenFalso(getItem) {
  return {
    getItem: getItem,
    setItem: function () {},
    removeItem: function () {}
  };
}

var DATOS_BASE = { objetivo: "bulk", nivel: "intermedio", equipamiento: "gimnasio" };

function datos(extra) {
  var d = {};
  Object.keys(DATOS_BASE).forEach(function (k) { d[k] = DATOS_BASE[k]; });
  Object.keys(extra).forEach(function (k) { d[k] = extra[k]; });
  return d;
}

function run(t) {

  t.test("sin días de entrenamiento no hay plan: ok false, para que la pantalla pida los días", function () {
    var s = sandbox();
    [0, "", null, undefined].forEach(function (dias) {
      var plan = s.entrenoPlanParaDatos(datos({ dias: dias, semana: 1 }));
      assert.strictEqual(plan.ok, false, "dias=" + JSON.stringify(dias));
    });
  });

  t.test("la semana 5 es de descarga y la 4 no; una semana rara cae a la 1 y una enorme a la 52", function () {
    var s = sandbox();
    var quinta = s.entrenoPlanParaDatos(datos({ dias: 3, semana: 5 }));
    assert.strictEqual(quinta.semanaDescarga, true);
    assert.strictEqual(quinta.semana, 5);
    var cuarta = s.entrenoPlanParaDatos(datos({ dias: 3, semana: 4 }));
    assert.ok(!cuarta.semanaDescarga, "la semana 4 no debe ser de descarga");
    assert.strictEqual(s.entrenoPlanParaDatos(datos({ dias: 3, semana: "x" })).semana, 1);
    assert.strictEqual(s.entrenoPlanParaDatos(datos({ dias: 3, semana: 0 })).semana, 1);
    assert.strictEqual(s.entrenoPlanParaDatos(datos({ dias: 3, semana: 999 })).semana, 52);
  });

  t.test("cada aviso que puede salir del generador tiene texto: ni clave suelta ni huecos sin rellenar", function () {
    var s = sandbox();
    var avisos = [
      "un_solo_dia", "sin_dias_de_entrenamiento", "dias_no_valido", "maximo_6_dias",
      "objetivo_desconocido", "equipamiento_desconocido", "nivel_no_indicado",
      "falta_ejercicio:tiron_vertical", "pocas_series:pecho"
    ];
    avisos.forEach(function (w) {
      var texto = s.entrenoTextoAviso(w);
      assert.ok(texto.length > 0, w + " sin texto");
      assert.ok(texto.indexOf("ent.") !== 0, w + " sale como clave: " + texto);
      assert.ok(texto.indexOf("{") === -1, w + " deja un hueco: " + texto);
    });
  });

  t.test("cada patrón y cada grupo muscular que usan el generador y el catálogo tienen nombre en ruso", function () {
    var s = sandbox();
    var patrones = {};
    Object.keys(s.WORKOUT_SESIONES).forEach(function (k) {
      s.WORKOUT_SESIONES[k].patrones.forEach(function (p) { patrones[p] = true; });
    });
    Object.keys(patrones).forEach(function (p) {
      assert.notStrictEqual(s.tOr("ent.patron_" + p, "SIN", "ru"), "SIN", "falta ent.patron_" + p);
    });
    var grupos = {};
    s.EXERCISE_CATALOG.forEach(function (e) { grupos[e.muscle] = true; });
    Object.keys(grupos).forEach(function (m) {
      assert.notStrictEqual(s.tOr("ent.grupo_" + m, "SIN", "ru"), "SIN", "falta ent.grupo_" + m);
    });
  });

  t.test("cada sesión y cada día de la semana tienen nombre en ruso", function () {
    var s = sandbox();
    Object.keys(s.WORKOUT_SESIONES).forEach(function (k) {
      assert.notStrictEqual(s.tOr("ent.sesion_" + k, "SIN", "ru"), "SIN", "falta ent.sesion_" + k);
    });
    for (var d = 1; d <= 7; d++) {
      assert.notStrictEqual(s.t("ent.dia_" + d, "ru"), "ent.dia_" + d, "falta ent.dia_" + d);
    }
  });

  t.test("las elecciones guardadas: lo válido se respeta, lo roto vuelve al valor por defecto", function () {
    var s = sandbox();
    s.localStorage = almacenFalso(function () { return null; });
    var nada = s.entrenoLeerPrefs();
    assert.deepStrictEqual(JSON.parse(JSON.stringify(nada)), { nivel: "principiante", equipamiento: "gimnasio", semana: 1, duracion: 60, excluir: "" });

    s.localStorage = almacenFalso(function () { return "esto no es json {"; });
    assert.strictEqual(s.entrenoLeerPrefs().nivel, "principiante");

    s.localStorage = almacenFalso(function () {
      return JSON.stringify({ nivel: "avanzado", equipamiento: "mancuernas", semana: 7 });
    });
    var bien = s.entrenoLeerPrefs();
    assert.strictEqual(bien.nivel, "avanzado");
    assert.strictEqual(bien.equipamiento, "mancuernas");
    assert.strictEqual(bien.semana, 7);

    s.localStorage = almacenFalso(function () {
      return JSON.stringify({ nivel: "experto", equipamiento: "piscina", semana: 0 });
    });
    var mal = s.entrenoLeerPrefs();
    assert.strictEqual(mal.nivel, "principiante");
    assert.strictEqual(mal.equipamiento, "gimnasio");
    assert.strictEqual(mal.semana, 1);
  });

  t.test("sin almacenamiento (lanza) no se rompe ni al leer ni al guardar", function () {
    var s = sandbox();
    s.localStorage = {
      getItem: function () { throw new Error("bloqueado"); },
      setItem: function () { throw new Error("bloqueado"); }
    };
    assert.strictEqual(s.entrenoLeerPrefs().semana, 1);
    assert.doesNotThrow(function () { s.entrenoGuardarPrefs({ nivel: "intermedio", equipamiento: "gimnasio", semana: 2 }); });
  });

  t.test("la marcación tiene todos los ids que busca la pantalla", function () {
    var html = fs.readFileSync(projPath("index.html"), "utf8");
    var ids = ["modoBtn", "entrenoPanel", "entrenoTitulo", "entrenoSinDias", "entAbrirDatos",
      "entNivel", "entEquipo", "entSemana", "entImprimir", "entrenoSalida"];
    ids.forEach(function (id) {
      assert.ok(html.indexOf('id="' + id + '"') !== -1, "index.html no tiene id=\"" + id + "\"");
    });
    assert.ok(html.indexOf("js/ui/render-entreno.js") !== -1, "index.html no carga render-entreno.js");
    assert.ok(html.indexOf("js/engine/workout-generator.js") !== -1, "index.html no carga el generador");
    assert.ok(html.indexOf("js/data/exercises.js") !== -1, "index.html no carga el catálogo");
  });

  t.test("el plan se pinta con una tarjeta por día y celdas con etiqueta, para que en el móvil sean tarjetas", function () {
    var s = sandbox();
    var plan = s.entrenoPlanParaDatos({ dias: 3, objetivo: "bulk", nivel: "intermedio", equipamiento: "gimnasio", semana: 1 });
    var html = s.entrenoPlanHtml(plan);
    assert.strictEqual(html.split('class="entreno__sesion"').length - 1, 3, "debe haber una tarjeta por día");
    assert.ok(html.indexOf('data-label="') !== -1, "faltan las etiquetas de las celdas");
    assert.ok(html.indexOf("undefined") === -1 && html.indexOf("NaN") === -1, "sale un hueco sin rellenar");
  });

  t.test("la semana de descarga se anuncia con su aviso y las demás semanas no", function () {
    var s = sandbox();
    var quinta = s.entrenoPlanHtml(s.entrenoPlanParaDatos({ dias: 4, objetivo: "cut", nivel: "principiante", equipamiento: "gimnasio", semana: 5 }));
    assert.ok(quinta.indexOf("entreno__aviso--suave") !== -1, "la semana 5 no avisa de la descarga");
    var cuarta = s.entrenoPlanHtml(s.entrenoPlanParaDatos({ dias: 4, objetivo: "cut", nivel: "principiante", equipamiento: "gimnasio", semana: 4 }));
    assert.ok(cuarta.indexOf("entreno__aviso--suave") === -1, "la semana 4 avisa de descarga sin serlo");
  });

  t.test("el marcado trae las elecciones con su valor, y los botones de la semana", function () {
    var html = fs.readFileSync(projPath("index.html"), "utf8");
    ["principiante", "intermedio", "avanzado", "gimnasio", "mancuernas", "sin_material"].forEach(function (v) {
      assert.ok(html.indexOf('data-valor="' + v + '"') !== -1, "falta el botón data-valor=\"" + v + "\"");
    });
    assert.strictEqual(html.split('class="entreno__paso-btn"').length - 1, 2, "debe haber dos botones de paso (− y +)");
  });
}

module.exports = { run: run };
