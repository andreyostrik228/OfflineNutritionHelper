/**
 * tests/ayuno.test.js
 * ─────────────────────────────────────────────────────────────────────────
 * Ventana de ayuno (js/ui/render-ayuno.js), con la ventana que sale del
 * horario de comidas (js/core/meal-schedule.js). Son cálculos de minutos
 * del día: la ventana, si estamos comiendo o en ayuno, cuánto falta y cómo
 * se escribe. La tarjeta en sí se mira en el navegador (no hay DOM aquí).
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
    projPath("js/core/meal-schedule.js"),
    projPath("js/ui/render-ayuno.js")
  ]);
}

function run(t) {

  t.test("la ventana va de la primera toma a la última, sea cual sea el orden", function () {
    var s = sandbox();
    var v = s.ayunoVentana([{ timeMinutes: 1260 }, { timeMinutes: 480 }, { timeMinutes: 840 }]);
    assert.deepStrictEqual(JSON.parse(JSON.stringify(v)), { inicio: 480, fin: 1260 });
  });

  t.test("sin dos tomas con hora no hay ventana que mostrar", function () {
    var s = sandbox();
    assert.strictEqual(s.ayunoVentana([]), null);
    assert.strictEqual(s.ayunoVentana(undefined), null);
    assert.strictEqual(s.ayunoVentana([{ timeMinutes: 600 }]), null);
    assert.strictEqual(s.ayunoVentana([{ timeMinutes: 600 }, { nombre: "sin hora" }]), null);
  });

  t.test("dentro de la ventana se come, y se cuenta hasta el cierre", function () {
    var s = sandbox();
    var e = s.ayunoEstado(480, 1260, 600);
    assert.strictEqual(e.tipo, "comida");
    assert.strictEqual(e.minutos, 660);
    assert.ok(Math.abs(e.porcentaje - 120 / 780) < 1e-9, "porcentaje " + e.porcentaje);
    assert.strictEqual(s.ayunoEstado(480, 1260, 480).tipo, "comida");
    var cierre = s.ayunoEstado(480, 1260, 1260);
    assert.strictEqual(cierre.tipo, "comida");
    assert.strictEqual(cierre.minutos, 0);
  });

  t.test("antes de la primera toma se ayuna hasta ella", function () {
    var s = sandbox();
    var e = s.ayunoEstado(480, 1260, 420);
    assert.strictEqual(e.tipo, "ayuno");
    assert.strictEqual(e.minutos, 60);
  });

  t.test("después de la última toma se ayuna hasta la primera del día siguiente", function () {
    var s = sandbox();
    var tarde = s.ayunoEstado(480, 1260, 1300);
    assert.strictEqual(tarde.tipo, "ayuno");
    assert.strictEqual(tarde.minutos, 620);
    var madrugada = s.ayunoEstado(480, 1260, 0);
    assert.strictEqual(madrugada.tipo, "ayuno");
    assert.strictEqual(madrugada.minutos, 480);
  });

  t.test("el progreso del ayuno empieza cerca de 0 y llega a 1 justo antes de la primera toma", function () {
    var s = sandbox();
    var total = 1440 - (1260 - 480);
    var recien = s.ayunoEstado(480, 1260, 1261).porcentaje * total;
    assert.ok(Math.abs(recien - 1) < 1e-9, "tras cerrar la ventana: " + recien + " min");
    var antes = s.ayunoEstado(480, 1260, 479).porcentaje * total;
    assert.ok(Math.abs(antes - (total - 1)) < 1e-9, "a un minuto de comer: " + antes + " min");
  });

  t.test("la duración se escribe en horas y minutos, sin «0 min» sobrante", function () {
    var s = sandbox();
    assert.strictEqual(s.ayunoDuracion(90), "1 h 30 min");
    assert.strictEqual(s.ayunoDuracion(120), "2 h");
    assert.strictEqual(s.ayunoDuracion(660), "11 h");
    assert.strictEqual(s.ayunoDuracion(-5), "0 h");
  });

  t.test("la ventana se escribe con sus horas dentro del texto", function () {
    var s = sandbox();
    var texto = s.tFormat("ayu.ventana", { inicio: "08:00", fin: "21:00" });
    assert.ok(texto.indexOf("08:00") !== -1 && texto.indexOf("21:00") !== -1, texto);
  });

  t.test("cada texto del ayuno existe en ruso: ni clave suelta ni hueco", function () {
    var s = sandbox();
    ["ayu.titulo", "ayu.ventana", "ayu.ayuno_dia", "ayu.ahora_comida", "ayu.ahora_ayuno", "ayu.h", "ayu.hm", "ayu.aviso"]
      .forEach(function (k) {
        assert.notStrictEqual(s.t(k, "ru"), k, "falta " + k + " en ruso");
      });
  });

  t.test("la tarjeta está en la página y el horario la llama al pintar y al limpiar", function () {
    var html = fs.readFileSync(projPath("index.html"), "utf8");
    ["ayunoCard", "ayunoEstado", "ayunoRelleno", "ayunoVentana"].forEach(function (id) {
      assert.ok(html.indexOf('id="' + id + '"') !== -1, "index.html no tiene id=\"" + id + "\"");
    });
    assert.ok(html.indexOf("js/ui/render-ayuno.js") !== -1, "index.html no carga render-ayuno.js");
    var horario = fs.readFileSync(projPath("js/ui/render-schedule.js"), "utf8");
    assert.ok(horario.indexOf("ayunoRenderizar(list)") !== -1, "render-schedule.js no pinta el ayuno");
    assert.ok(horario.indexOf("ayunoOcultar()") !== -1, "render-schedule.js no oculta el ayuno al limpiar");
  });
}

module.exports = { run: run };
