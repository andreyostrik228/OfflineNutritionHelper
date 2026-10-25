/**
 * tests/compra-vista.test.js
 * ─────────────────────────────────────────────────────────────────────────
 * «Compra» con el plan normal y el sin cocinar a la vez (2026-10-25,
 * js/ui/pestanas.js): dos botones arriba y se ve una sola lista; con una
 * sola lista no hay botones. Se prueba la función real con un DOM mínimo; los
 * toques y la recarga, con Chrome sin interfaz (scratchpad).
 * ─────────────────────────────────────────────────────────────────────────
 */

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var loadBrowserGlobals = require("./lib/load-browser-globals").loadBrowserGlobals;

function projPath(rel) { return path.join(__dirname, "..", rel); }
function leer(rel) { return fs.readFileSync(projPath(rel), "utf8"); }

function Nodo() {
  var clases = {};
  var attrs = {};
  this.hidden = false;
  this.classList = {
    toggle: function (c, si) { if (si) clases[c] = true; else delete clases[c]; },
    contains: function (c) { return !!clases[c]; }
  };
  this.setAttribute = function (k, v) { attrs[k] = String(v); };
  this.getAttribute = function (k) { return k in attrs ? attrs[k] : null; };
}

/** Los dos paneles, el selector con sus dos botones y un localStorage de mentira. */
function montar() {
  var s = loadBrowserGlobals([projPath("js/ui/pestanas.js")]);
  var els = { shoppingPanel: new Nodo(), noCookShoppingPanel: new Nodo(), compraSelector: new Nodo() };
  var botones = { normal: new Nodo(), sincocinar: new Nodo() };
  els.compraSelector.querySelector = function (sel) {
    var m = /data-vista="([^"]+)"/.exec(sel);
    return m ? botones[m[1]] : null;
  };
  var guardado = {};
  s.document = { getElementById: function (id) { return els[id] || null; }, querySelectorAll: function () { return []; } };
  s.localStorage = { getItem: function (k) { return k in guardado ? guardado[k] : null; }, setItem: function (k, v) { guardado[k] = String(v); } };
  return { s: s, els: els, botones: botones, guardado: guardado };
}

function run(t) {
  t.test("con las dos listas, botones arriba y se ve solo la elegida", function () {
    var m = montar();
    m.s.compraElegir("sincocinar");
    assert.strictEqual(m.els.compraSelector.hidden, false);
    assert.ok(m.els.shoppingPanel.classList.contains("is-fuera-de-vista"), "la normal, fuera");
    assert.ok(!m.els.noCookShoppingPanel.classList.contains("is-fuera-de-vista"), "la sin cocinar, a la vista");
    assert.strictEqual(m.botones.sincocinar.getAttribute("aria-pressed"), "true");
    assert.strictEqual(m.botones.normal.getAttribute("aria-pressed"), "false");
    assert.strictEqual(m.guardado["nutritionPlanner.compraVista.v1"], "sincocinar", "se recuerda");
    m.s.compraElegir("normal");
    assert.ok(!m.els.shoppingPanel.classList.contains("is-fuera-de-vista"));
    assert.ok(m.els.noCookShoppingPanel.classList.contains("is-fuera-de-vista"));
  });

  t.test("con una sola lista no hay botones y no se esconde nada, aunque se eligiera la otra", function () {
    var m = montar();
    m.s.compraElegir("sincocinar");
    m.els.noCookShoppingPanel.hidden = true;
    m.s._pintarSelectorDeCompra();
    assert.strictEqual(m.els.compraSelector.hidden, true);
    assert.ok(!m.els.shoppingPanel.classList.contains("is-fuera-de-vista"), "la única que hay se ve");
  });

  t.test("una vista desconocida no cambia nada", function () {
    var m = montar();
    m.s.compraElegir("normal");
    m.s.compraElegir("otra");
    assert.strictEqual(m.guardado["nutritionPlanner.compraVista.v1"], "normal");
  });

  t.test("hacer un plan elige su lista, y el CSS esconde la otra sin tocar `hidden`", function () {
    var js = leer("js/ui/pestanas.js");
    assert.ok(/_esperandoPlan = false;\s*\/\/[^\n]*\s*compraElegir\("normal"\)/.test(js), "el plan normal elige la normal");
    assert.ok(/_esperandoSinCocinar = false;\s*compraElegir\("sincocinar"\)/.test(js), "el sin cocinar, la suya");
    var css = leer("assets/css/style.css");
    assert.ok(/\.compra-selector\[hidden\] \{ display: none; \}/.test(css));
    assert.ok(/\.shopping-panel\.is-fuera-de-vista \{ display: none; \}/.test(css));
  });

  t.test("los textos de los botones existen en los cuatro idiomas", function () {
    ["es", "en", "ru", "uk"].forEach(function (lang) {
      var txt = leer("js/i18n/" + lang + ".js");
      ["ui.compra_que_lista", "ui.compra_plan_normal", "ui.sin_cocinar_2"].forEach(function (k) {
        assert.ok(txt.indexOf('"' + k + '":') !== -1, lang + " " + k);
      });
    });
  });
}

module.exports = { run: run };
