/**
 * tests/entreno-figura.test.js
 * ─────────────────────────────────────────────────────────────────────────
 * Animaciones de los ejercicios (js/ui/entreno-figura.js con las posturas de
 * js/data/exercise-poses.js), sin DOM: que cada ejercicio del catálogo tenga
 * la suya, que ningún instante salga roto, que los músculos y las cámaras
 * sean de verdad, y que la pantalla las pinte donde toca.
 * ─────────────────────────────────────────────────────────────────────────
 */

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var loadBrowserGlobals = require("./lib/load-browser-globals").loadBrowserGlobals;

function projPath(rel) { return path.join(__dirname, "..", rel); }

function sandbox(conPantalla) {
  var archivos = [
    projPath("js/core/i18n.js"),
    projPath("js/i18n/es.js"),
    projPath("js/i18n/en.js"),
    projPath("js/i18n/ru.js"),
    projPath("js/i18n/uk.js"),
    projPath("js/core/utils.js"),
    projPath("js/data/exercises.js"),
    projPath("js/data/exercise-poses.js"),
    projPath("js/engine/workout-generator.js"),
    projPath("js/core/workout-log.js"),
    projPath("js/ui/entreno-figura.js")
  ];
  if (conPantalla) archivos.push(projPath("js/ui/render-entreno.js"), projPath("js/ui/entreno-sesion.js"));
  var s = loadBrowserGlobals(archivos);
  s._langMemoryState = "ru";
  return s;
}

var INSTANTES = [0, 0.2, 0.5, 0.8, 1];

function run(t) {

  t.test("cada ejercicio del catálogo tiene su animación, y no sobra ninguna", function () {
    var s = sandbox();
    var ids = s.EXERCISE_CATALOG.map(function (e) { return e.id; });
    var faltan = ids.filter(function (id) { return !s.entrenoAnimacionTiene(id); });
    assert.strictEqual(faltan.length, 0, "sin animación: " + faltan.join(", "));
    var sobran = Object.keys(s.EJERCICIO_POSES).filter(function (id) { return ids.indexOf(id) === -1; });
    assert.strictEqual(sobran.length, 0, "animación de un ejercicio que no existe: " + sobran.join(", "));
  });

  t.test("ningún instante de ninguna animación sale con NaN, Infinity o undefined (grande y pequeña, los dos lados)", function () {
    var s = sandbox();
    var rotos = [];
    Object.keys(s.EJERCICIO_POSES).forEach(function (id) {
      var lados = s.EJERCICIO_POSES[id].ritmo === "alterno" ? ["D", "I"] : ["D"];
      lados.forEach(function (lado) {
        INSTANTES.forEach(function (x) {
          ["completo", "mini"].forEach(function (d) {
            var svg = s.entrenoFiguraSvg(id, x, d, lado);
            if (!svg || /NaN|Infinity|undefined/.test(svg)) rotos.push(id + " s=" + x + " " + d + " " + lado);
          });
        });
      });
    });
    assert.strictEqual(rotos.length, 0, rotos.slice(0, 10).join("; "));
  });

  t.test("cada animación declara músculos que existen, una cámara, una articulación medible y un ritmo conocido", function () {
    var s = sandbox();
    var angulos = ["rodilla", "cadera", "codo", "hombro", "tobillo"];
    var ritmos = ["rep", "mantener", "alterno", "negativa"];
    Object.keys(s.EJERCICIO_POSES).forEach(function (id) {
      var spec = s.EJERCICIO_POSES[id];
      assert.ok(spec.musculos && spec.musculos.p && spec.musculos.p.length, id + ": sin músculos que trabajen");
      spec.musculos.p.concat(spec.musculos.s || []).forEach(function (z) {
        assert.ok(s.FIG_ZONAS[z], id + ": zona de músculo desconocida «" + z + "»");
      });
      assert.ok(spec.camara && typeof spec.camara.yaw === "number", id + ": sin cámara");
      assert.ok(angulos.indexOf(spec.angulo) !== -1, id + ": articulación «" + spec.angulo + "»");
      assert.ok(ritmos.indexOf(spec.ritmo || "rep") !== -1, id + ": ritmo «" + spec.ritmo + "»");
    });
  });

  t.test("cada zona de músculo tiene nombre en los cuatro idiomas", function () {
    var s = sandbox();
    Object.keys(s.FIG_ZONAS).forEach(function (z) {
      ["es", "en", "ru", "uk"].forEach(function (lang) {
        assert.notStrictEqual(s.tOr("ent.musculo_" + z, "SIN", lang), "SIN", "falta ent.musculo_" + z + " en " + lang);
      });
    });
  });

  t.test("la grande trae cuadrícula, fantasma de salida y marcas; la pequeña solo figura y músculos", function () {
    var s = sandbox();
    var grande = s.entrenoFiguraSvg("sentadilla_barra", 0.6, "completo", "D");
    var pequena = s.entrenoFiguraSvg("sentadilla_barra", 0.6, "mini", "D");
    assert.ok(grande.indexOf("anim__rejilla") !== -1, "cuadrícula");
    assert.ok(grande.indexOf("anim__marca") !== -1, "marcas en las articulaciones");
    assert.ok(grande.indexOf("anim__grados") !== -1, "grados de la rodilla");
    assert.ok(grande.indexOf("anim__musculo") !== -1 && pequena.indexOf("anim__musculo") !== -1, "músculos en las dos");
    assert.ok(pequena.indexOf("anim__rejilla") === -1 && pequena.indexOf("anim__marca") === -1, "la pequeña va limpia");
  });

  t.test("el ángulo que se mide cambia con el gesto: la rodilla se dobla al bajar en la sentadilla", function () {
    var s = sandbox();
    var arriba = s.entrenoFiguraEscena("sentadilla_barra", 0, "completo", "D").angulo;
    var abajo = s.entrenoFiguraEscena("sentadilla_barra", 1, "completo", "D").angulo;
    var g0 = parseInt(arriba.texto, 10);
    var g1 = parseInt(abajo.texto, 10);
    assert.ok(g0 > 165, "de pie la rodilla casi recta: " + g0);
    assert.ok(g1 < 100, "abajo la rodilla doblada: " + g1);
  });

  t.test("las manos llegan a la barra: en el press de banca la barra va entre las dos manos", function () {
    var s = sandbox();
    [0, 0.5, 1].forEach(function (x) {
      var spec = s.EJERCICIO_POSES.press_banca_barra;
      var P = spec.pose(x, s._fAyuda(), "D");
      var j = s._fEsqueleto(P);
      var barra = P.clave;
      var dist = function (a) { return Math.sqrt(Math.pow(a[0] - barra[0], 2) + Math.pow(a[1] - barra[1], 2)); };
      assert.ok(dist(j.munecaD) < 8 && dist(j.munecaI) < 8, "s=" + x + ": las muñecas se quedan lejos de la barra");
    });
  });

  t.test("los pies que pisan el suelo no se hunden ni flotan en la sentadilla", function () {
    var s = sandbox();
    INSTANTES.forEach(function (x) {
      var P = s.EJERCICIO_POSES.sentadilla_barra.pose(x, s._fAyuda(), "D");
      var j = s._fEsqueleto(P);
      ["D", "I"].forEach(function (L) {
        assert.ok(Math.abs(j["tobillo" + L][1] - 6) < 0.6, "s=" + x + " tobillo" + L + " a " + j["tobillo" + L][1]);
        assert.ok(Math.abs(j["punta" + L][1] - 3) < 1, "s=" + x + " punta" + L + " a " + j["punta" + L][1]);
      });
    });
  });

  t.test("el marcado para la pantalla: grande con nombre para el lector, pequeña oculta dentro de su botón", function () {
    var s = sandbox();
    var grande = s.entrenoAnimacionHtml("flexiones", "completo", "Анимация: Отжимания");
    assert.ok(/data-anim="flexiones"/.test(grande) && /role="img"/.test(grande) && /aria-label="Анимация: Отжимания"/.test(grande));
    var pequena = s.entrenoAnimacionHtml("flexiones", "mini", "");
    assert.ok(/aria-hidden="true"/.test(pequena) && /data-detalle="mini"/.test(pequena));
    assert.strictEqual(s.entrenoAnimacionHtml("no_existe", "mini", ""), "");
  });

  t.test("el plan y la sesión llevan la pequeña de cada ejercicio, y la técnica de la sesión la grande", function () {
    var s = sandbox(true);
    var plan = s.entrenoPlanParaDatos({ dias: 3, objetivo: "bulk", nivel: "intermedio", equipamiento: "gimnasio", semana: 1 });
    var html = s.entrenoPlanHtml(plan, s.entrenoLogVacio());
    var ejercicios = 0;
    plan.sesiones.forEach(function (x) { ejercicios += x.exercises.length; });
    assert.strictEqual(html.split("data-anim-abrir=").length - 1, ejercicios, "una pequeña por ejercicio del plan");
    var log = s.entrenoLogVacio();
    var sesion = s.entrenoLogIniciar(log, plan.sesiones[0], 1, 1e12);
    var pantalla = s.entrenoSesionPantallaHtml(sesion, log, 1e12);
    assert.strictEqual(pantalla.split('data-detalle="mini"').length - 1, sesion.ejercicios.length);
    assert.strictEqual(pantalla.split('data-detalle="completo"').length - 1, sesion.ejercicios.length);
  });

  t.test("index.html carga las posturas y el motor antes de la pantalla de entrenamientos, y trae la ventana", function () {
    var html = fs.readFileSync(projPath("index.html"), "utf8");
    var posturas = html.indexOf('<script src="js/data/exercise-poses.js');
    var motor = html.indexOf('<script src="js/ui/entreno-figura.js');
    var pantalla = html.indexOf('<script src="js/ui/render-entreno.js');
    assert.ok(posturas !== -1 && motor !== -1, "faltan los ficheros de las animaciones");
    assert.ok(posturas < pantalla && motor < pantalla, "deben ir antes de render-entreno.js");
    assert.ok(/<dialog[^>]*id="entrenoAnimDialogo"[^>]*aria-labelledby="entrenoAnimTitulo"/.test(html), "falta la ventana con título");
  });
}

module.exports = { run: run };
