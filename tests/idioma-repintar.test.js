/**
 * tests/idioma-repintar.test.js
 * ─────────────────────────────────────────────────────────────────────────
 * Cambiar de idioma tiene que cambiar TODO lo que se ve (2026-11-07, visto
 * en el Chrome del dueño): applyI18nToDom solo traduce lo que lleva
 * `data-i18n`, y lo que pinta el JavaScript (planes, compra, pistas del
 * formulario, registro de peso…) se quedaba en el idioma anterior. Desde
 * Ajustes se recarga la página; en el alta, que no se puede recargar, se
 * repinta lo pintado; y los botones − y + se vuelven a etiquetar.
 * ─────────────────────────────────────────────────────────────────────────
 */

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var loadBrowserGlobals = require("./lib/load-browser-globals").loadBrowserGlobals;

function projPath(rel) { return path.join(__dirname, "..", rel); }
function leer(rel) { return fs.readFileSync(projPath(rel), "utf8"); }

function run(t) {
  t.test("cambiar de idioma en Ajustes recarga la página, y solo si el idioma cambia", function () {
    var s = loadBrowserGlobals([projPath("js/ui/render-menu.js")]);
    var recargas = 0;
    s.location = { reload: function () { recargas++; } };
    s._recargarSiCambiaIdioma("ru", "ru");
    assert.strictEqual(recargas, 0, "el mismo idioma no recarga");
    s._recargarSiCambiaIdioma(null, "en");
    assert.strictEqual(recargas, 0, "sin saber el de antes, no se recarga");
    s._recargarSiCambiaIdioma("ru", "en");
    assert.strictEqual(recargas, 1);
    var menu = leer("js/ui/render-menu.js");
    assert.ok(/_menuPintarIdioma\(\);\s*_recargarSiCambiaIdioma\(antes, elegido\);/.test(menu), "el selector de Ajustes recarga");
    assert.ok(/_menuPintarIdioma\(\);\s*_recargarSiCambiaIdioma\(antes, lang\);/.test(menu), "el aviso de traducción del navegador también");
  });

  t.test("en el alta, elegir idioma repinta lo pintado (sin recargar: el alta empezaría otra vez)", function () {
    var alta = leer("js/ui/onboarding-ui.js");
    var paso = alta.slice(alta.indexOf('if (step.id === "lang")'), alta.indexOf("return;", alta.indexOf('if (step.id === "lang")')));
    assert.ok(paso.indexOf("repintarTextosPintados()") !== -1, "el paso del idioma no repinta: " + paso);
    assert.strictEqual(paso.indexOf("reload"), -1, "y no recarga");
    var app = leer("js/app.js");
    assert.ok(/window\.repintarTextosPintados = function/.test(app), "app.js no expone repintarTextosPintados");
    ["repintarPorTienda()", "cargarProductosDelIdioma", "repintarPistaPasos", "repintarPistaKcal", "repintarPistaObjetivo",
     "repintarPresupuestos", "weightLogPintarGrafico", "pintarFamiliaCampo", "renderCurrentSearch"].forEach(function (fn) {
      var cuerpo = app.slice(app.indexOf("window.repintarTextosPintados = function"), app.indexOf("};", app.indexOf("window.repintarTextosPintados = function")));
      assert.ok(cuerpo.indexOf(fn) !== -1, "repintarTextosPintados no llama a " + fn);
    });
  });

  t.test("los botones − y + se vuelven a etiquetar con el nombre del campo ya traducido", function () {
    var s = loadBrowserGlobals([projPath("js/ui/form-controls.js")]);
    s.t = function (k) { return { "ui.quitar_uno": "{campo}: меньше", "ui.sumar_uno": "{campo}: больше" }[k] || k; };
    function boton(clave) {
      var a = { "data-clave": clave };
      return { getAttribute: function (k) { return k in a ? a[k] : null; }, setAttribute: function (k, v) { a[k] = String(v); } };
    }
    var menos = boton("ui.quitar_uno"), mas = boton("ui.sumar_uno");
    var input = { id: "age" };
    var caja = { querySelector: function () { return input; }, querySelectorAll: function () { return [menos, mas]; } };
    var etiqueta = { textContent: "Edad" };
    s.document = {
      querySelectorAll: function (sel) { return sel === ".paso-a-paso" ? [caja] : []; },
      querySelector: function (sel) { return sel === 'label[for="age"]' ? etiqueta : null; }
    };
    s.repintarEtiquetasDePasos();
    assert.strictEqual(menos.getAttribute("aria-label"), "Edad: меньше", "así salía: la etiqueta aún sin traducir");
    etiqueta.textContent = "Возраст";
    s.repintarEtiquetasDePasos();
    assert.strictEqual(menos.getAttribute("aria-label"), "Возраст: меньше");
    assert.strictEqual(mas.getAttribute("aria-label"), "Возраст: больше");
    var menu = leer("js/ui/render-menu.js");
    var desde = menu.indexOf("function applyI18nToDom");
    var aplicar = menu.slice(desde, menu.slice(desde).search(/\r?\n\}\r?\n/) + desde);
    assert.ok(aplicar.indexOf("repintarEtiquetasDePasos()") !== -1, "applyI18nToDom no vuelve a etiquetarlos");
  });
}

module.exports = { run: run };
