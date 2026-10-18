/**
 * tests/reset-confirm.test.js
 * ─────────────────────────────────────────────────────────────────────────
 * Resetear pide confirmación antes de borrar el formulario (y con él el
 * presupuesto). Se prueba la función real de js/ui/form-controls.js con un
 * DOM mínimo, y se comprueba que app.js y index.html están cableados así.
 * ─────────────────────────────────────────────────────────────────────────
 */

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var loadBrowserGlobals = require("./lib/load-browser-globals").loadBrowserGlobals;

function projPath(rel) { return path.join(__dirname, "..", rel); }

function Nodo() {
  this.handlers = {};
  this.open = false;
  this.attrs = {};
}
Nodo.prototype.addEventListener = function (tipo, fn) { (this.handlers[tipo] = this.handlers[tipo] || []).push(fn); };
Nodo.prototype.click = function () {
  (this.handlers.click || []).forEach(function (fn) { fn({ preventDefault: function () {} }); });
};
Nodo.prototype.showModal = function () { this.open = true; };
Nodo.prototype.close = function () { this.open = false; };
Nodo.prototype.setAttribute = function (k, v) { this.attrs[k] = v; this.open = true; };
Nodo.prototype.removeAttribute = function (k) { delete this.attrs[k]; this.open = false; };

/** Monta el botón, el diálogo y sus dos botones con el cableado real de form-controls.js. */
function montar() {
  var s = loadBrowserGlobals([projPath("js/ui/form-controls.js")]);
  var reseteos = 0;
  var refs = {
    boton: new Nodo(),
    dialogo: new Nodo(),
    confirmar: new Nodo(),
    cancelar: new Nodo(),
    alConfirmar: function () { reseteos++; }
  };
  s.initResetConfirm(refs);
  return { refs: refs, reseteos: function () { return reseteos; } };
}

function run(t) {

  t.test("pulsar Resetear abre el diálogo y no borra nada", function () {
    var m = montar();
    m.refs.boton.click();
    assert.strictEqual(m.refs.dialogo.open, true, "el diálogo tiene que abrirse");
    assert.strictEqual(m.reseteos(), 0, "sin confirmar no se resetea");
  });

  t.test("pulsar Resetear varias veces sin confirmar nunca borra", function () {
    var m = montar();
    m.refs.boton.click();
    m.refs.boton.click();
    m.refs.boton.click();
    assert.strictEqual(m.reseteos(), 0);
  });

  t.test("Cancelar cierra el diálogo y no borra", function () {
    var m = montar();
    m.refs.boton.click();
    m.refs.cancelar.click();
    assert.strictEqual(m.refs.dialogo.open, false, "el diálogo tiene que cerrarse");
    assert.strictEqual(m.reseteos(), 0, "cancelar no resetea");
  });

  t.test("Sí, resetear borra una sola vez y cierra el diálogo", function () {
    var m = montar();
    m.refs.boton.click();
    m.refs.confirmar.click();
    assert.strictEqual(m.reseteos(), 1, "confirmar resetea exactamente una vez");
    assert.strictEqual(m.refs.dialogo.open, false, "tras confirmar el diálogo se cierra");
  });

  t.test("sin botón o sin diálogo no engancha nada y no lanza", function () {
    var s = loadBrowserGlobals([projPath("js/ui/form-controls.js")]);
    var llamado = 0;
    assert.doesNotThrow(function () {
      s.initResetConfirm({ boton: null, dialogo: null, alConfirmar: function () { llamado++; } });
      s.initResetConfirm(null);
    });
    assert.strictEqual(llamado, 0);
  });

  t.test("app.js ya no conecta Resetear directo a resetAll, sino a initResetConfirm", function () {
    var app = fs.readFileSync(projPath("js/app.js"), "utf8");
    assert.ok(app.indexOf('resetBtn.addEventListener("click", resetAll)') === -1,
      "Resetear no puede llamar a resetAll sin pasar por la confirmación");
    assert.ok(app.indexOf("initResetConfirm({") !== -1, "app.js tiene que usar initResetConfirm");
    assert.ok(app.indexOf("alConfirmar: resetAll") !== -1, "solo la confirmación llama a resetAll");
  });

  t.test("index.html tiene el diálogo y los tres ids que app.js busca", function () {
    var html = fs.readFileSync(projPath("index.html"), "utf8");
    ["resetConfirmDialog", "resetConfirmOkBtn", "resetConfirmCancelBtn"].forEach(function (id) {
      assert.ok(html.indexOf('id="' + id + '"') !== -1, "falta el id " + id);
    });
    assert.ok(html.indexOf('data-i18n="ui.resetear_titulo"') !== -1);
    assert.ok(html.indexOf('data-i18n="ui.resetear_confirmar"') !== -1);
  });

  t.test("las tres claves del diálogo existen en es, en, ru y uk", function () {
    ["es", "en", "ru", "uk"].forEach(function (lang) {
      var txt = fs.readFileSync(projPath("js/i18n/" + lang + ".js"), "utf8");
      ["ui.resetear_titulo", "ui.resetear_texto", "ui.resetear_confirmar"].forEach(function (k) {
        assert.ok(txt.indexOf('"' + k + '"') !== -1, lang + " no tiene la clave " + k);
      });
    });
  });
}

module.exports = { run: run };
