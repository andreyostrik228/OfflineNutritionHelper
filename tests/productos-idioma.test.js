/**
 * tests/productos-idioma.test.js
 * ─────────────────────────────────────────────────────────────────────────
 * Los nombres de producto del modo "sin cocinar" en ruso, inglés y
 * ucraniano (js/i18n/productos-*.js, 2026-10-22).
 *
 * Lo que se protege:
 *   - Cada producto que el generador puede elegir tiene traducción en los
 *     tres idiomas (un producto nuevo del catálogo lo convierte en fallo).
 *   - Las tres tablas tienen las mismas claves, todas del catálogo, y las
 *     marcas siguen escritas como en la etiqueta.
 *   - El nombre traducido, guardado como «no me gusta», vuelve a tapar su
 *     producto (con la tabla de ESE idioma cargada, como en el navegador).
 *   - Solo se pide la tabla del idioma en uso, y una vez.
 *   - En pantalla: «traducción / etiqueta», y sin tabla solo la etiqueta.
 * ─────────────────────────────────────────────────────────────────────────
 */

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var vm = require("vm");
var loadBrowserGlobals = require("./lib/load-browser-globals").loadBrowserGlobals;

function projPath(rel) { return path.join(__dirname, "..", rel); }

var IDIOMAS = ["ru", "en", "uk"];

function cargarEn(s, rel) {
  vm.runInContext(fs.readFileSync(projPath(rel), "utf8"), s, { filename: rel });
}

/** El pool del generador "sin cocinar", más i18n.js. */
function sandboxPool() {
  return loadBrowserGlobals([
    "js/core/utils.js", "js/data/real-products.js", "js/data/no-cook-classifier.js",
    "js/data/serving-sizes.js", "js/data/no-cook-templates.js", "js/core/pricing.js",
    "js/engine/no-cook-generator.js", "js/core/i18n.js"
  ].map(projPath));
}

function run(t) {

  t.test("cada producto que el modo sin cocinar puede elegir tiene traducción en ru, en y uk", function () {
    var s = sandboxPool();
    IDIOMAS.forEach(function (l) { cargarEn(s, "js/i18n/productos-" + l + ".js"); });
    var pool = s.getNoCookEligiblePool("mercadona");
    assert.ok(pool.length > 1000, "el pool tiene que ser el de verdad: " + pool.length);
    var faltan = [];
    pool.forEach(function (e) {
      IDIOMAS.forEach(function (l) {
        var tr = s.PRODUCT_TABLES[l][e.product.name];
        if (typeof tr !== "string" || !tr.trim()) faltan.push(l + ": " + e.product.name);
      });
    });
    assert.deepStrictEqual(faltan.slice(0, 10), [], faltan.length + " sin traducción");
  });

  t.test("las tres tablas tienen las mismas claves, todas del catálogo, y las marcas se quedan", function () {
    var s = sandboxPool();
    IDIOMAS.forEach(function (l) { cargarEn(s, "js/i18n/productos-" + l + ".js"); });
    var claves = Object.keys(s.PRODUCT_TABLES.ru).sort();
    assert.deepStrictEqual(Object.keys(s.PRODUCT_TABLES.en).sort(), claves);
    assert.deepStrictEqual(Object.keys(s.PRODUCT_TABLES.uk).sort(), claves);
    var catalogo = {};
    s.REAL_PRODUCTS.forEach(function (p) { catalogo[p.name] = true; });
    assert.deepStrictEqual(claves.filter(function (k) { return !catalogo[k]; }), [], "claves que ya no están en el catálogo");
    var sinMarca = [];
    claves.forEach(function (k) {
      if (k.indexOf("Hacendado") === -1) return;
      IDIOMAS.forEach(function (l) { if (s.PRODUCT_TABLES[l][k].indexOf("Hacendado") === -1) sinMarca.push(l + ": " + k); });
    });
    assert.deepStrictEqual(sinMarca, []);
  });

  t.test("el nombre traducido, como «no me gusta», vuelve a tapar su producto (ru, en, uk)", function () {
    IDIOMAS.forEach(function (l) {
      // Una tabla cada vez: en el navegador solo está cargada la del idioma en uso.
      var s = loadBrowserGlobals([
        "js/core/utils.js", "js/core/i18n.js", "js/data/dislike-groups.js", "js/core/preferences.js"
      ].map(projPath));
      cargarEn(s, "js/i18n/productos-" + l + ".js");
      var tabla = s.PRODUCT_TABLES[l];
      var fallos = [];
      Object.keys(tabla).forEach(function (es) {
        if (!s.matchesDislike(es, [tabla[es]])) fallos.push(es + " -> " + tabla[es]);
      });
      assert.deepStrictEqual(fallos.slice(0, 10), [], l + ": " + fallos.length + " nombres que no tapan su producto");
    });
  });

  t.test("productosCargar() pide solo la tabla del idioma en uso, una vez; el español no pide nada", function () {
    var s = loadBrowserGlobals([projPath("js/core/i18n.js"), projPath("js/core/recipe-assets.js"), projPath("js/core/productos-idioma.js")]);
    var pedidos = [];
    var inyectar = function (url) {
      pedidos.push(url);
      cargarEn(s, url.split("?")[0]);
      return Promise.resolve();
    };
    return s.productosCargar("es", inyectar).then(function (llego) {
      assert.strictEqual(llego, false);
      assert.deepStrictEqual(pedidos, []);
      return s.productosCargar("ru", inyectar);
    }).then(function (llego) {
      assert.strictEqual(llego, true);
      assert.deepStrictEqual(pedidos, ["js/i18n/productos-ru.js"]);
      assert.strictEqual(s.productosCargadosPara("ru"), true);
      assert.strictEqual(s.productosCargadosPara("en"), false, "las otras no se piden");
      return s.productosCargar("ru", inyectar);
    }).then(function (llego) {
      assert.strictEqual(llego, false, "la segunda vez ya estaba");
      assert.strictEqual(pedidos.length, 1);
      return s.productosCargar("de", inyectar);
    }).then(function (llego) {
      assert.strictEqual(llego, false, "un idioma sin tabla no pide nada");
      assert.strictEqual(pedidos.length, 1);
    });
  });

  t.test("si la descarga falla, la siguiente vez se vuelve a pedir", function () {
    var s = loadBrowserGlobals([projPath("js/core/i18n.js"), projPath("js/core/recipe-assets.js"), projPath("js/core/productos-idioma.js")]);
    var veces = 0;
    var inyectar = function (url) {
      veces++;
      if (veces === 1) return Promise.reject(new Error("red caída (simulada)"));
      cargarEn(s, url.split("?")[0]);
      return Promise.resolve();
    };
    return s.productosCargar("uk", inyectar).then(function () {
      throw new Error("tenía que fallar");
    }, function () {
      return s.productosCargar("uk", inyectar);
    }).then(function (llego) {
      assert.strictEqual(llego, true);
      assert.strictEqual(veces, 2);
    });
  });

  t.test("en pantalla: «traducción / etiqueta» con la tabla; sin ella, o en español, solo la etiqueta", function () {
    var s = loadBrowserGlobals(["js/core/utils.js", "js/core/i18n.js", "js/i18n/es.js", "js/ui/render.js"].map(projPath));
    var n = "Aceitunas negras sin hueso Hacendado";
    s.saveLang("ru");
    assert.strictEqual(s.nombreProductoDoble(n), n, "sin tabla todavía");
    cargarEn(s, "js/i18n/productos-ru.js");
    assert.strictEqual(s.nombreProductoDoble(n), s.PRODUCT_TABLES.ru[n] + " / " + n);
    assert.strictEqual(s.nombreProducto(n), s.PRODUCT_TABLES.ru[n]);
    assert.strictEqual(s.nombreProductoDoble("Producto que no está"), "Producto que no está");
    s.saveLang("es");
    assert.strictEqual(s.nombreProductoDoble(n), n);
  });

  t.test("el arranque no trae las tablas de producto: las pide productos-idioma.js", function () {
    var html = fs.readFileSync(projPath("index.html"), "utf8");
    assert.ok(!/<script src="js\/i18n\/productos-/.test(html), "hay un <script> de productos-*.js en el arranque");
    var cargador = html.indexOf('<script src="js/core/productos-idioma.js');
    assert.ok(cargador !== -1 && html.indexOf('<script src="js/core/recipe-assets.js') < cargador, "detrás de recipe-assets.js");
    var app = fs.readFileSync(projPath("js/app.js"), "utf8");
    assert.ok(app.indexOf("productosCargar(getLang())") !== -1);
  });
}

module.exports = { run: run };
