/**
 * tests/no-cook-classifier.test.js
 * ─────────────────────────────────────────────────────────────────────────
 * Cobertura dirigida (2026-08-24, selector de tienda) al fallback por
 * nombre añadido a classifyNoCookProduct() -- antes de este cambio no
 * existía ningún test para este archivo. Cubre: (1) que las reglas
 * curadas de Mercadona siguen intactas (el fallback nunca las
 * sustituye), y (2) el comportamiento nuevo del fallback en sí
 * (productos con category/leafCategory que no es de Mercadona).
 * ─────────────────────────────────────────────────────────────────────────
 */

var assert = require("assert");
var path = require("path");
var loadBrowserGlobals = require("./lib/load-browser-globals").loadBrowserGlobals;

function projPath(rel) {
  return path.join(__dirname, "..", rel);
}

function freshClassifierSandbox() {
  return loadBrowserGlobals([projPath("js/data/no-cook-classifier.js")]);
}

function alcampoProduct(name) {
  // Mismo criterio que scrapers/alcampo.py::category_label_from_url:
  // categoría genérica derivada de la URL, nunca la taxonomía de
  // Mercadona -- justo lo que dispara el fallback por nombre.
  return { name: name, category: "alimentación", leafCategory: "alimentación" };
}

function run(t) {

  // ── Reglas curadas de Mercadona: intactas ──────────────────────────

  t.test("categoría curada de Mercadona (Charcutería y quesos) sigue resolviendo por CATEGORY_RULES, no por el fallback", function () {
    var s = freshClassifierSandbox();
    var result = s.classifyNoCookProduct({ name: "Jamón cocido random", category: "Charcutería y quesos", leafCategory: "Jamón cocido" });
    assert.deepStrictEqual(JSON.parse(JSON.stringify(result)), { level: 1, unit: "porción" });
  });

  t.test("categoría excluida de Mercadona (Bodega) sigue excluida, nunca llega al fallback", function () {
    var s = freshClassifierSandbox();
    var result = s.classifyNoCookProduct({ name: "Vino tinto crianza", category: "Bodega", leafCategory: "Vino tinto" });
    assert.strictEqual(result, null);
  });

  t.test("leafCategory exacta (Huevos) sigue ganando sobre la category general", function () {
    var s = freshClassifierSandbox();
    var result = s.classifyNoCookProduct({ name: "Huevos camperos", category: "Huevos, leche y mantequilla", leafCategory: "Huevos" });
    assert.deepStrictEqual(JSON.parse(JSON.stringify(result)), { level: 2, unit: "huevo" });
  });

  // ── Fallback por nombre: productos de otra tienda ──────────────────

  t.test("fallback: yogur de categoría genérica se clasifica listo para comer", function () {
    var s = freshClassifierSandbox();
    var result = s.classifyNoCookProduct(alcampoProduct("PRODUCTO ALCAMPO Yogur natural pack 4"));
    assert.deepStrictEqual(JSON.parse(JSON.stringify(result)), { level: 0, unit: "unidad" });
  });

  t.test("fallback: fruta fresca (plátano) se clasifica listo para comer", function () {
    var s = freshClassifierSandbox();
    var result = s.classifyNoCookProduct(alcampoProduct("Plátano de Canarias"));
    assert.deepStrictEqual(JSON.parse(JSON.stringify(result)), { level: 0, unit: "unidad" });
  });

  t.test("fallback: pizza congelada de categoría genérica se clasifica como calentar rápido", function () {
    var s = freshClassifierSandbox();
    var result = s.classifyNoCookProduct(alcampoProduct("Pizza cuatro quesos congelada"));
    assert.deepStrictEqual(JSON.parse(JSON.stringify(result)), { level: 2, unit: "ración" });
  });

  t.test("fallback: alcohol se excluye por nombre aunque la categoría no sea 'Bodega'", function () {
    var s = freshClassifierSandbox();
    var result = s.classifyNoCookProduct(alcampoProduct("Cerveza Mahou clásica lata 33 cl"));
    assert.strictEqual(result, null);
  });

  t.test("fallback: ingrediente crudo (harina) se excluye", function () {
    var s = freshClassifierSandbox();
    var result = s.classifyNoCookProduct(alcampoProduct("Harina de trigo integral"));
    assert.strictEqual(result, null);
  });

  t.test("fallback: carne para guisar se excluye (frase NOT_READY reconocida por nombre)", function () {
    var s = freshClassifierSandbox();
    var result = s.classifyNoCookProduct(alcampoProduct("Carne de ternera para guisar"));
    assert.strictEqual(result, null);
  });

  t.test("fallback: producto sin ninguna señal de nombre reconocible se excluye (nunca se inventa una clasificación)", function () {
    var s = freshClassifierSandbox();
    var result = s.classifyNoCookProduct(alcampoProduct("Referencia interna XR-42 sin descripción clara"));
    assert.strictEqual(result, null);
  });

  t.test("fallback: masa de pizza cruda se excluye pese a contener la palabra 'pizza' (regresión encontrada en vivo)", function () {
    var s = freshClassifierSandbox();
    var result = s.classifyNoCookProduct(alcampoProduct("CASA TARRADELLAS Masa pizza fina familiar 400 gr."));
    assert.strictEqual(result, null);
  });

  t.test("fallback: masa cruda se excluye aunque la frase de producto no sea exactamente 'masa para pizza'", function () {
    var s = freshClassifierSandbox();
    var result = s.classifyNoCookProduct(alcampoProduct("BUITONI Finissima Masa rectagular maxi para pizza 350 g."));
    assert.strictEqual(result, null);
  });

  t.test("fallback: 'masa madre' es una excepción -- describe pan YA HORNEADO, no se excluye (regresión encontrada en vivo)", function () {
    var s = freshClassifierSandbox();
    var result = s.classifyNoCookProduct(alcampoProduct("THE RUSTIK BAKERY Pan de hogaza (masa madre) con cereales 450 g."));
    assert.deepStrictEqual(JSON.parse(JSON.stringify(result)), { level: 1, unit: "ración" });
  });

  t.test("fallback: producto de higiene/no-comida (fuga de categorización) se excluye", function () {
    var s = freshClassifierSandbox();
    var result = s.classifyNoCookProduct(alcampoProduct("Champú anticaspa 400ml"));
    assert.strictEqual(result, null);
  });

}

module.exports = { run: run };
