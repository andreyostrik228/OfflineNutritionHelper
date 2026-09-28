/**
 * tests/shopping-checks.test.js
 * ─────────────────────────────────────────────────────────────────────────
 * Tests de js/core/shopping-checks.js -- las casillas de la lista de la
 * compra. Hasta el 2026-09-28 eran un dibujo que no se podía marcar.
 * ─────────────────────────────────────────────────────────────────────────
 */

var assert = require("assert");
var path = require("path");
var loadBrowserGlobals = require("./lib/load-browser-globals").loadBrowserGlobals;

function projPath(rel) {
  return path.join(__dirname, "..", rel);
}

function createFakeLocalStorage() {
  var data = {};
  return {
    getItem: function (k) { return Object.prototype.hasOwnProperty.call(data, k) ? data[k] : null; },
    setItem: function (k, v) { data[k] = String(v); },
    removeItem: function (k) { delete data[k]; },
    _data: data
  };
}

function sandbox() {
  var s = loadBrowserGlobals([projPath("js/core/shopping-checks.js")]);
  s.localStorage = createFakeLocalStorage();
  return s;
}

function item(nombre, envases) {
  return { name: nombre, purchase: { packagesToBuy: envases } };
}

function plano(x) {
  return JSON.parse(JSON.stringify(x));
}

function run(t) {
  t.test("sin nada guardado no hay nada marcado", function () {
    var s = sandbox();
    assert.deepStrictEqual(plano(s.leerMarcasCompra()), {});
  });

  t.test("la clave es ingrediente + envases, y al peso se distingue", function () {
    var s = sandbox();
    assert.strictEqual(s.claveDeArticulo(item("Fresas", 1)), "Fresas|1");
    assert.strictEqual(s.claveDeArticulo(item("Fresas", 2)), "Fresas|2");
    assert.strictEqual(s.claveDeArticulo({ name: "Merluza", purchase: { packagesToBuy: null } }), "Merluza|peso");
    assert.strictEqual(s.claveDeArticulo(null), "");
  });

  t.test("marcar y desmarcar se guarda y se lee de vuelta", function () {
    var s = sandbox();
    var claves = ["Fresas|1", "Tofu firme|2"];
    assert.strictEqual(s.alternarMarcaCompra("Fresas|1", claves), true);
    assert.deepStrictEqual(plano(s.leerMarcasCompra()), { "Fresas|1": true });
    assert.strictEqual(s.alternarMarcaCompra("Fresas|1", claves), false);
    assert.deepStrictEqual(plano(s.leerMarcasCompra()), {});
  });

  t.test("sobrevive a 'recargar': otro sandbox con el MISMO almacenamiento", function () {
    var s1 = sandbox();
    s1.alternarMarcaCompra("Fresas|1", ["Fresas|1"]);
    var s2 = loadBrowserGlobals([projPath("js/core/shopping-checks.js")]);
    s2.localStorage = s1.localStorage;
    assert.deepStrictEqual(plano(s2.leerMarcasCompra()), { "Fresas|1": true });
  });

  t.test("comprar MÁS envases de lo marcado invalida la marca", function () {
    // Llevas 1 bote en el carrito y el plan nuevo pide 2: ya no está hecho.
    var s = sandbox();
    s.alternarMarcaCompra("Lentejas cocidas|1", ["Lentejas cocidas|1"]);
    var marcas = s.leerMarcasCompra();
    var lista = s.ordenarPorMarca([item("Lentejas cocidas", 2)], marcas);
    assert.strictEqual(marcas[s.claveDeArticulo(lista[0])], undefined);
  });

  t.test("al guardar se podan las marcas de productos que ya no están en la lista", function () {
    var s = sandbox();
    s.guardarMarcasCompra({ "Fresas|1": true, "Viejo|3": true }, ["Fresas|1"]);
    assert.deepStrictEqual(plano(s.leerMarcasCompra()), { "Fresas|1": true });
  });

  t.test("lo marcado baja al final y el resto conserva su orden", function () {
    var s = sandbox();
    var items = [item("A", 1), item("B", 1), item("C", 1), item("D", 1)];
    var orden = s.ordenarPorMarca(items, { "A|1": true, "C|1": true }).map(function (i) { return i.name; });
    assert.deepStrictEqual(plano(orden), ["B", "D", "A", "C"]);
  });

  t.test("un almacenamiento corrupto no rompe nada", function () {
    var s = sandbox();
    s.localStorage.setItem(s.SHOPPING_CHECKS_KEY, "{no es json");
    assert.deepStrictEqual(plano(s.leerMarcasCompra()), {});
    s.localStorage.setItem(s.SHOPPING_CHECKS_KEY, JSON.stringify({ "Fresas|1": "si", "Tofu|1": true, "": true }));
    assert.deepStrictEqual(plano(s.leerMarcasCompra()), { "Tofu|1": true });
  });

  t.test("un localStorage que LANZA no rompe nada y recuerda en memoria", function () {
    var s = loadBrowserGlobals([projPath("js/core/shopping-checks.js")]);
    s.localStorage = {
      getItem: function () { throw new Error("bloqueado"); },
      setItem: function () { throw new Error("bloqueado"); },
      removeItem: function () {}
    };
    assert.strictEqual(s.alternarMarcaCompra("Fresas|1", ["Fresas|1"]), true);
    assert.deepStrictEqual(plano(s.leerMarcasCompra()), { "Fresas|1": true });
  });
}

module.exports = { run: run };
