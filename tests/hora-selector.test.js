/**
 * tests/hora-selector.test.js
 * ─────────────────────────────────────────────────────────────────────────
 * El tambor de hora (2026-10-25), el mismo en iOS y Android: las cuentas de
 * js/ui/hora-selector.js y el cableado del formulario, del cuestionario y de
 * index.html. El deslizamiento de verdad se prueba en Chrome (scratchpad).
 * ─────────────────────────────────────────────────────────────────────────
 */

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var loadBrowserGlobals = require("./lib/load-browser-globals").loadBrowserGlobals;

function projPath(rel) { return path.join(__dirname, "..", rel); }
function leer(rel) { return fs.readFileSync(projPath(rel), "utf8"); }

function run(t) {
  var s = loadBrowserGlobals([projPath("js/ui/hora-selector.js")]);

  // Los objetos vienen de otro contexto (vm): se comparan por su JSON.
  function partes(x) { return JSON.stringify(s.horaPartes(x)); }

  t.test("lee y escribe horas: «7:05», «07:05» y «07:05:00» valen; lo imposible, no", function () {
    assert.strictEqual(partes("7:05"), '{"h":7,"m":5}');
    assert.strictEqual(partes("07:05:00"), '{"h":7,"m":5}');
    assert.strictEqual(partes("23:59"), '{"h":23,"m":59}');
    [null, "", "24:00", "07:60", "siete", "7"].forEach(function (x) {
      assert.strictEqual(s.horaPartes(x), null, String(x));
    });
    assert.strictEqual(s.horaTexto(7, 5), "07:05");
    assert.strictEqual(s.horaTexto(23, 0), "23:00");
  });

  t.test("los minutos van de 5 en 5, y un minuto guardado que no lo es se conserva", function () {
    var base = s.horaMinutos(0);
    assert.strictEqual(base.length, 12);
    assert.strictEqual(base[0], 0);
    assert.strictEqual(base[11], 55);
    var con12 = s.horaMinutos(12);
    assert.strictEqual(con12.length, 13);
    assert.ok(con12.indexOf(12) === 3 && con12[2] === 10 && con12[4] === 15, "en su sitio, ordenado");
  });

  t.test("el formulario cambia las dos horas por el tambor y la hoja está en index.html", function () {
    var fc = loadBrowserGlobals([projPath("js/ui/form-controls.js")]);
    assert.deepStrictEqual(Array.prototype.slice.call(fc.FORM_HORAS), ["wakeTime", "sleepTime"]);
    var html = leer("index.html");
    ["horaDialogo", "horaDialogoTitulo", "horaDialogoRueda", "horaDialogoListo", "horaDialogoCerrar"].forEach(function (id) {
      assert.ok(html.indexOf('id="' + id + '"') !== -1, id);
    });
    // Los <input type="time"> siguen: son el campo que leen settings.js y meal-schedule.js.
    assert.ok(/<input id="wakeTime" type="time"/.test(html) && /<input id="sleepTime" type="time"/.test(html));
    var i = html.indexOf('src="js/ui/hora-selector.js');
    assert.ok(i !== -1 && i < html.indexOf('src="js/ui/form-controls.js') && i < html.indexOf('src="js/ui/onboarding-ui.js'),
      "hora-selector.js carga antes que quien lo usa");
  });

  t.test("el cuestionario usa el tambor en las preguntas de hora (y el <input> solo si falta)", function () {
    var ob = leer("js/ui/onboarding-ui.js");
    assert.ok(/step\.kind === "time" && typeof horaRueda === "function"/.test(ob));
    assert.ok(/oculto\.id = "onboardingFreeInput"/.test(ob), "escribe en el campo que valida _obNext");
  });

  t.test("los textos del tambor existen en los cuatro idiomas", function () {
    ["es", "en", "ru", "uk"].forEach(function (lang) {
      var txt = leer("js/i18n/" + lang + ".js");
      ["ui.hora_horas", "ui.hora_minutos", "ui.hora_listo", "ui.hora_mas", "ui.hora_menos"].forEach(function (k) {
        assert.ok(txt.indexOf('"' + k + '":') !== -1, lang + " " + k);
      });
      assert.ok(/"ui\.hora_mas": "[^"]*\{col\}/.test(txt) && /"ui\.hora_menos": "[^"]*\{col\}/.test(txt), lang + ": {col}");
    });
  });
}

module.exports = { run: run };
