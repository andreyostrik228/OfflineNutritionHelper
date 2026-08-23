/**
 * tests/no-cook-generator.test.js
 * ─────────────────────────────────────────────────────────────────────────
 * Cobertura mínima y dirigida (2026-08-24, selector de tienda): antes de
 * este cambio no existía ningún test para este módulo. En vez de
 * intentar cobertura exhaustiva de golpe (fuera de alcance de esta
 * sesión), se cubre justo el riesgo nuevo introducido -- la caché de
 * pool elegible pasó de única/global a UNA POR TIENDA
 * (_noCookEligiblePoolByStore); el bug real que esto previene es servir
 * productos de la tienda anterior tras cambiar el selector.
 *
 * Carga el código de PRODUCCIÓN real (vm), mismo patrón que
 * tests/pantry.test.js -- pero con REAL_PRODUCTS_CATALOGS/
 * getRealProductsForStore inyectados a mano en vez de cargar los
 * archivos reales de datos (miles de productos, innecesario para
 * testear la lógica de selección/caché en sí).
 * ─────────────────────────────────────────────────────────────────────────
 */

var assert = require("assert");
var path = require("path");
var loadBrowserGlobals = require("./lib/load-browser-globals").loadBrowserGlobals;

function projPath(rel) {
  return path.join(__dirname, "..", rel);
}

function makeProduct(id) {
  return {
    id: id, ean: null, name: "Producto " + id, brand: "Marca",
    category: "Aperitivos", leafCategory: "Aperitivos",
    kcal: 100, protein: 2, carbs: 10, fat: 5,
    price: 1.5, pricePer100g: 1.5, size: 100, sizeUnit: "g",
  };
}

function freshNoCookSandbox() {
  var sandbox = loadBrowserGlobals([
    projPath("js/data/no-cook-classifier.js"),
    projPath("js/engine/no-cook-generator.js"),
  ]);

  sandbox.DEFAULT_STORE_ID = "mercadona";
  sandbox.REAL_PRODUCTS_CATALOGS = {
    mercadona: [makeProduct("m1"), makeProduct("m2"), makeProduct("m3")],
    alcampo: [makeProduct("a1"), makeProduct("a2"), makeProduct("a3")],
  };
  sandbox.getRealProductsForStore = function (storeId) {
    return sandbox.REAL_PRODUCTS_CATALOGS[storeId] || sandbox.REAL_PRODUCTS_CATALOGS[sandbox.DEFAULT_STORE_ID] || [];
  };

  return sandbox;
}

function run(t) {

  t.test("getNoCookEligiblePool(storeId): usa el catálogo de la tienda pedida, no el global", function () {
    var s = freshNoCookSandbox();
    var mercadonaIds = s.getNoCookEligiblePool("mercadona").map(function (e) { return e.product.id; });
    var alcampoIds = s.getNoCookEligiblePool("alcampo").map(function (e) { return e.product.id; });

    assert.deepStrictEqual(mercadonaIds.sort(), ["m1", "m2", "m3"]);
    assert.deepStrictEqual(alcampoIds.sort(), ["a1", "a2", "a3"]);
  });

  t.test("getNoCookEligiblePool: la caché es por tienda -- pedir una tienda no contamina el pool de otra ya cacheada", function () {
    var s = freshNoCookSandbox();
    s.getNoCookEligiblePool("mercadona");
    var alcampoIds = s.getNoCookEligiblePool("alcampo").map(function (e) { return e.product.id; });

    assert.deepStrictEqual(alcampoIds.sort(), ["a1", "a2", "a3"]);
  });

  t.test("getNoCookEligiblePool: llamadas repetidas con la misma tienda devuelven el mismo array cacheado", function () {
    var s = freshNoCookSandbox();
    var first = s.getNoCookEligiblePool("alcampo");
    var second = s.getNoCookEligiblePool("alcampo");
    assert.strictEqual(first, second);
  });

  t.test("getNoCookEligiblePool: sin storeId cae en DEFAULT_STORE_ID", function () {
    var s = freshNoCookSandbox();
    var withoutArg = s.getNoCookEligiblePool().map(function (e) { return e.product.id; }).sort();
    var explicit = s.getNoCookEligiblePool("mercadona").map(function (e) { return e.product.id; }).sort();
    assert.deepStrictEqual(withoutArg, explicit);
  });

  t.test("generateNoCookPlan(storeId): los productos elegidos vienen de la tienda pedida", function () {
    var s = freshNoCookSandbox();
    var plan = s.generateNoCookPlan("alcampo");

    var allIds = [];
    plan.slots.forEach(function (slot) {
      slot.items.forEach(function (item) { allIds.push(item.id); });
    });

    allIds.forEach(function (id) {
      assert.ok(id.indexOf("a") === 0, "esperaba un producto de Alcampo, llegó: " + id);
    });
  });

  t.test("generateNoCookPlan: cambiar de tienda entre dos llamadas cambia los productos ofrecidos", function () {
    var s = freshNoCookSandbox();
    var mercadonaIds = [];
    s.generateNoCookPlan("mercadona").slots.forEach(function (slot) {
      slot.items.forEach(function (i) { mercadonaIds.push(i.id); });
    });
    var alcampoIds = [];
    s.generateNoCookPlan("alcampo").slots.forEach(function (slot) {
      slot.items.forEach(function (i) { alcampoIds.push(i.id); });
    });

    var overlap = mercadonaIds.filter(function (id) { return alcampoIds.indexOf(id) !== -1; });
    assert.strictEqual(overlap.length, 0, "no debería haber productos compartidos entre tiendas distintas");
  });

}

module.exports = { run: run };
