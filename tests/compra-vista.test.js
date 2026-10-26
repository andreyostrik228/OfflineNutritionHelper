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

  // ── «Menú» (2026-10-26): los mismos botones y la misma elección ──

  /** El menú: el panel del plan normal, el sin cocinar, las ideas, los botones y el aviso. */
  function montarMenu(hayNormal, haySin) {
    var m = montar();
    var els = m.els;
    els.menuSelector = new Nodo();
    els.menuVacio = new Nodo();
    els.menuVacioTexto = new Nodo();
    els.menuVacioBtn = new Nodo();
    els.noCookPanel = new Nodo();
    els.noCookPanel.hidden = !haySin;
    els.insightsBox = new Nodo();
    var resultados = new Nodo();
    var botones = { normal: new Nodo(), sincocinar: new Nodo() };
    els.menuSelector.querySelectorAll = function () {
      return [botones.normal, botones.sincocinar].map(function (b, i) { b.setAttribute("data-vista", i ? "sincocinar" : "normal"); return b; });
    };
    m.s.document.querySelector = function (sel) {
      if (sel === ".panel--results") return resultados;
      if (/meal-card/.test(sel)) return hayNormal ? {} : null;
      return null;
    };
    return { s: m.s, els: els, resultados: resultados, botones: botones };
  }

  t.test("menú: con el sin cocinar elegido, el plan normal se esconde y el otro se ve", function () {
    var m = montarMenu(true, true);
    m.s.compraElegir("sincocinar");
    assert.strictEqual(m.els.menuSelector.hidden, false);
    assert.ok(m.resultados.classList.contains("is-solo-selector"), "del plan normal solo los botones");
    assert.ok(!m.els.noCookPanel.classList.contains("is-fuera-de-vista"));
    assert.strictEqual(m.els.menuVacio.hidden, true);
    assert.strictEqual(m.botones.sincocinar.getAttribute("aria-pressed"), "true");
    m.s.compraElegir("normal");
    assert.ok(!m.resultados.classList.contains("is-solo-selector"));
    assert.ok(m.els.noCookPanel.classList.contains("is-fuera-de-vista"));
  });

  t.test("menú: si el elegido no existe aún, «… ещё нет. Составить?» en su sitio", function () {
    var m = montarMenu(false, true);
    m.s._langMemoryState = "ru";
    m.s.compraElegir("normal");
    assert.strictEqual(m.els.menuVacio.hidden, false);
    assert.ok(m.resultados.classList.contains("is-solo-selector"), "la tarjeta vacía de siempre no sale");
    assert.ok(m.els.noCookPanel.classList.contains("is-fuera-de-vista"), "y el otro plan tampoco");
    var sinNada = montarMenu(false, false);
    sinNada.s.compraElegir("normal");
    assert.strictEqual(sinNada.els.menuSelector.hidden, true, "sin ningún plan, sin botones");
    assert.strictEqual(sinNada.els.menuVacio.hidden, true);
  });

  t.test("menú: hacer un plan lo elige, y los textos existen en los cuatro idiomas", function () {
    var js = leer("js/ui/pestanas.js");
    assert.ok(/compraElegir\("sincocinar"\);\s*activarPestana\("menu"\)/.test(js));
    assert.ok(/function compraElegir[\s\S]*?_pintarSelectorDeMenu\(\);/.test(js), "una sola elección para el menú y la compra");
    var css = leer("assets/css/style.css");
    assert.ok(/\.panel--results\.is-solo-selector > :not\(\.menu-selector\)/.test(css));
    ["es", "en", "ru", "uk"].forEach(function (lang) {
      var txt = leer("js/i18n/" + lang + ".js");
      ["ui.menu_que_plan", "ui.menu_sin_normal", "ui.menu_sin_sincocinar", "ui.menu_hacer_normal", "ui.menu_hacer_sincocinar"].forEach(function (k) {
        assert.ok(txt.indexOf('"' + k + '":') !== -1, lang + " " + k);
      });
    });
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
