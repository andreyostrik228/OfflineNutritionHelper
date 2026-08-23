/**
 * tests/pricing.test.js
 * ─────────────────────────────────────────────────────────────────────────
 * Cobertura mínima y dirigida (2026-08-24, selector de tienda) --
 * pricing.js no tenía ningún test hasta ahora. Cubre justo el bug real
 * encontrado en vivo: listAvailableStores() solo miraba PRICE_CATALOGS,
 * así que una tienda con catálogo de productos reales pero sin precios
 * curados por ingrediente (Alcampo/Carrefour en la Fase A) nunca
 * aparecía en el selector de tienda, pese a que "Sin cocinar" ya tenía
 * datos reales para ella.
 * ─────────────────────────────────────────────────────────────────────────
 */

var assert = require("assert");
var path = require("path");
var loadBrowserGlobals = require("./lib/load-browser-globals").loadBrowserGlobals;

function projPath(rel) {
  return path.join(__dirname, "..", rel);
}

function freshPricingSandbox() {
  return loadBrowserGlobals([
    projPath("js/core/utils.js"),
    projPath("js/core/pricing.js"),
  ]);
}

function run(t) {

  t.test("listAvailableStores(): incluye tiendas de PRICE_CATALOGS con su storeName curado", function () {
    var s = freshPricingSandbox();
    s.PRICE_CATALOGS = { mercadona: { storeId: "mercadona", storeName: "Mercadona", pricesPer100g: {} } };
    s.REAL_PRODUCTS_CATALOGS = {};

    // JSON.parse(JSON.stringify(...)): el array viene del realm del
    // sandbox (vm) -- deepStrictEqual lo trataría como "no
    // reference-equal" contra un literal de este realm pese a tener la
    // misma forma (mismo motivo ya documentado en shopping-cost.test.js/
    // meal-schedule.test.js).
    assert.deepStrictEqual(JSON.parse(JSON.stringify(s.listAvailableStores())), [{ storeId: "mercadona", storeName: "Mercadona" }]);
  });

  t.test("listAvailableStores(): incluye tiendas que SOLO tienen REAL_PRODUCTS_CATALOGS (sin PRICE_CATALOGS todavía)", function () {
    var s = freshPricingSandbox();
    s.PRICE_CATALOGS = { mercadona: { storeId: "mercadona", storeName: "Mercadona", pricesPer100g: {} } };
    s.REAL_PRODUCTS_CATALOGS = { alcampo: [], carrefour: [] };

    var result = s.listAvailableStores().sort(function (a, b) { return a.storeId.localeCompare(b.storeId); });

    assert.deepStrictEqual(JSON.parse(JSON.stringify(result)), [
      { storeId: "alcampo", storeName: "Alcampo" },
      { storeId: "carrefour", storeName: "Carrefour" },
      { storeId: "mercadona", storeName: "Mercadona" },
    ]);
  });

  t.test("listAvailableStores(): una tienda en ambos registros no sale duplicada", function () {
    var s = freshPricingSandbox();
    s.PRICE_CATALOGS = { mercadona: { storeId: "mercadona", storeName: "Mercadona", pricesPer100g: {} } };
    s.REAL_PRODUCTS_CATALOGS = { mercadona: [] };

    assert.strictEqual(s.listAvailableStores().length, 1);
  });

  t.test("listAvailableStores(): sin REAL_PRODUCTS_CATALOGS cargado, no lanza -- solo usa PRICE_CATALOGS", function () {
    var s = freshPricingSandbox();
    s.PRICE_CATALOGS = { mercadona: { storeId: "mercadona", storeName: "Mercadona", pricesPer100g: {} } };
    // REAL_PRODUCTS_CATALOGS deliberadamente no definido en el sandbox.

    // JSON.parse(JSON.stringify(...)): el array viene del realm del
    // sandbox (vm) -- deepStrictEqual lo trataría como "no
    // reference-equal" contra un literal de este realm pese a tener la
    // misma forma (mismo motivo ya documentado en shopping-cost.test.js/
    // meal-schedule.test.js).
    assert.deepStrictEqual(JSON.parse(JSON.stringify(s.listAvailableStores())), [{ storeId: "mercadona", storeName: "Mercadona" }]);
  });

}

module.exports = { run: run };
