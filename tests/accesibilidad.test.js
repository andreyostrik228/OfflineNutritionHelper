/**
 * tests/accesibilidad.test.js
 * ─────────────────────────────────────────────────────────────────────────
 * Lo que un lector de pantalla necesita: cada campo tiene nombre, los botones
 * solo de icono se llaman de alguna forma, cada diálogo tiene título, y al
 * cerrar un diálogo el foco vuelve al botón que lo abrió.
 * ─────────────────────────────────────────────────────────────────────────
 */

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var loadBrowserGlobals = require("./lib/load-browser-globals").loadBrowserGlobals;

function projPath(rel) { return path.join(__dirname, "..", rel); }

/** El HTML sin comentarios: lo que el navegador de verdad pinta. */
function marcado() {
  return fs.readFileSync(projPath("index.html"), "utf8").replace(/<!--[\s\S]*?-->/g, "");
}

function run(t) {

  t.test("cada campo del formulario tiene una etiqueta: label for, label que lo envuelve o aria-label", function () {
    var html = marcado();
    var sinNombre = [];
    var re = /<(input|select|textarea)\b([^>]*)>/gi;
    var m;
    while ((m = re.exec(html))) {
      var attrs = m[2];
      var tipo = (/type="([^"]+)"/.exec(attrs) || [])[1] || "text";
      if (tipo === "hidden" || tipo === "submit" || tipo === "button") continue;
      var id = (/\bid="([^"]+)"/.exec(attrs) || [])[1];
      var nombrado = /aria-label(ledby)?=/.test(attrs) ||
        (id && html.indexOf('for="' + id + '"') !== -1) ||
        (html.slice(Math.max(0, m.index - 400), m.index).lastIndexOf("<label") > html.slice(Math.max(0, m.index - 400), m.index).lastIndexOf("</label>"));
      if (!nombrado) sinNombre.push(m[1] + (id ? "#" + id : "") + " type=" + tipo);
    }
    assert.deepStrictEqual(sinNombre, [], "campos sin nombre accesible");
  });

  t.test("los botones sin texto visible tienen aria-label o un título; los que se rellenan con JavaScript se revisan a mano", function () {
    var html = marcado();
    // authProfileBtn: su nombre es el span #authProfileLabel, que JavaScript rellena.
    var rellenadosPorJs = ["authProfileBtn", "traduccionAvisoSi"];
    var sinNombre = [];
    var re = /<button\b([^>]*)>([\s\S]*?)<\/button>/gi;
    var m;
    while ((m = re.exec(html))) {
      var attrs = m[1];
      var interior = m[2];
      var texto = interior.replace(/<svg[\s\S]*?<\/svg>/gi, "").replace(/<[^>]+>/g, "").replace(/&[a-z#0-9]+;/gi, " ").trim();
      if (texto) continue;
      var id = (/\bid="([^"]+)"/.exec(attrs) || [])[1];
      if (/aria-label(ledby)?=|title=/.test(attrs)) continue;
      if (id && rellenadosPorJs.indexOf(id) !== -1) continue;
      sinNombre.push(id || interior.slice(0, 40));
    }
    assert.deepStrictEqual(sinNombre, [], "botones sin nombre");
  });

  t.test("cada diálogo tiene un título al que apuntar (aria-labelledby o aria-label)", function () {
    var html = marcado();
    var sinTitulo = [];
    var re = /<dialog\b([^>]*)>/gi;
    var m;
    while ((m = re.exec(html))) {
      var attrs = m[1];
      var id = (/\bid="([^"]+)"/.exec(attrs) || [])[1] || "(sin id)";
      if (!/aria-label(ledby)?=/.test(attrs)) sinTitulo.push(id);
    }
    assert.deepStrictEqual(sinTitulo, [], "diálogos sin título");
  });

  t.test("las respuestas del cuestionario que se crean con JavaScript apuntan a la pregunta", function () {
    var src = fs.readFileSync(projPath("js/ui/onboarding-ui.js"), "utf8");
    assert.ok(src.indexOf('libre.setAttribute("aria-labelledby", "onboardingQuestion")') !== -1, "la respuesta de texto/hora");
    assert.ok(src.indexOf('input.setAttribute("aria-labelledby", "onboardingQuestion")') !== -1, "la respuesta numérica");
    assert.ok(marcado().indexOf('id="onboardingQuestion"') !== -1, "la pregunta existe en el marcado");
  });

  t.test("la cantidad editable de la despensa y la fecha de caducidad tienen nombre", function () {
    var src = fs.readFileSync(projPath("js/ui/render-pantry.js"), "utf8");
    assert.ok(src.indexOf('input.setAttribute("aria-label", tFormat("ui.despensa_cantidad_en_gramos"') !== -1);
    assert.ok(src.indexOf('input.setAttribute("aria-label", tFormat("ui.caducidad_editar"') !== -1);
  });

  t.test("dialog-focus.js se carga antes que app.js", function () {
    var html = marcado();
    var df = html.indexOf('src="js/ui/dialog-focus.js');
    assert.ok(df !== -1, "falta la etiqueta de dialog-focus.js");
    assert.ok(df < html.indexOf('src="js/app.js'), "dialog-focus.js tiene que cargarse antes que app.js");
  });

  t.test("al cerrar un diálogo el foco vuelve al botón que lo abrió", function () {
    var s = loadBrowserGlobals([projPath("js/ui/dialog-focus.js")]);
    var escuchas = [];
    var doc = {
      activeElement: null,
      addEventListener: function (tipo, fn, captura) { escuchas.push({ tipo: tipo, fn: fn, captura: captura }); },
      contains: function (n) { return n === boton || n === dialogo; }
    };
    function HTMLDialog() {}
    HTMLDialog.prototype.showModal = function () { this.open = true; };
    var instalado = s.dialogFocusInstalar({ HTMLDialogElement: HTMLDialog, document: doc });
    assert.strictEqual(instalado, true);
    assert.deepStrictEqual(escuchas.map(function (e) { return e.tipo + ":" + e.captura; }), ["close:true"]);

    var boton = { enfocado: false, focus: function () { this.enfocado = true; } };
    var dialogo = new HTMLDialog();
    dialogo.tagName = "DIALOG";
    doc.activeElement = boton;
    dialogo.showModal();
    doc.activeElement = { focus: function () {} };
    escuchas[0].fn({ target: dialogo });
    assert.strictEqual(boton.enfocado, true, "el foco vuelve al botón que abrió el diálogo");
  });

  t.test("instalar dos veces no envuelve showModal otra vez ni duplica el listener", function () {
    var s = loadBrowserGlobals([projPath("js/ui/dialog-focus.js")]);
    var escuchas = 0;
    var doc = { activeElement: null, addEventListener: function () { escuchas++; }, contains: function () { return false; } };
    function HTMLDialog() {}
    HTMLDialog.prototype.showModal = function () {};
    assert.strictEqual(s.dialogFocusInstalar({ HTMLDialogElement: HTMLDialog, document: doc }), true);
    assert.strictEqual(s.dialogFocusInstalar({ HTMLDialogElement: HTMLDialog, document: doc }), false);
    assert.strictEqual(escuchas, 1);
  });

  t.test("sin soporte de <dialog> no se rompe nada", function () {
    var s = loadBrowserGlobals([projPath("js/ui/dialog-focus.js")]);
    assert.strictEqual(s.dialogFocusInstalar({ HTMLDialogElement: undefined, document: {} }), false);
    assert.doesNotThrow(function () { s.dialogFocusRestaurar(null, {}); });
  });
}

module.exports = { run: run };
