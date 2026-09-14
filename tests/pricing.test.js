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

/**
 * Con los catalogos REALES cargados. `freshPricingSandbox` monta solo
 * utils+pricing, y los tests del prototipo necesitan recorrer el camino
 * entero (precio y envase), que es donde el fallo se manifestaba.
 */
function sandboxConDatosReales() {
  return loadBrowserGlobals([
    projPath("js/core/utils.js"),
    projPath("js/data/packaging.js"),
    projPath("js/data/real-ingredient-matches.js"),
    projPath("js/data/prices/mercadona.js"),
    projPath("js/core/pricing.js")
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

  // ── Los envases llevan TIENDA (2026-09-14) ─────────────────────────────
  // `resolvePackageInfo(name, storeId)` recibía la tienda desde siempre,
  // pero el tamaño del envase salía de una tabla global -- o sea, de
  // Mercadona, para cualquier tienda. Con una sola tienda daba igual; con
  // dos deja de darlo, y falla del peor modo posible: el presupuesto de
  // este motor se calcula desde el coste de COMPRA, así que un envase
  // prestado produce un número verosímil y equivocado.
  //
  // El refactor que lo arregló se hizo con UNA sola tienda registrada, así
  // que hasta este test la rama del préstamo no se había ejecutado NUNCA.
  // Estos dos tests montan una tienda falsa para recorrer las dos ramas:
  // la que tiene envases propios y la que los hereda.
  //
  // Medido y por eso importa: la barra de pan de Dia pesa 820 g y la de
  // Mercadona 460; el bote de lentejas coincide (400 g) y el pack de yogur
  // también (6 x 125). Que coincidan A MENUDO es lo que hace invisible el
  // fallo cuando no coinciden.

  t.test("una tienda con envases PROPIOS usa los suyos, no los de mercadona", function () {
    var s = sandboxConDatosReales();
    s.PACKAGING_CATALOGS.tiendafalsa = {
      storeId: "tiendafalsa",
      storeName: "Tienda Falsa",
      packages: { "pan blanco": { type: "fixedPackage", packageG: 820, packageLabel: "barra grande" } }
    };

    var propio = s.resolvePackageInfo("Pan blanco", "tiendafalsa");
    assert.strictEqual(propio.packageSizeG, 820, "no cogió el envase de su propia tienda");
    assert.strictEqual(propio.packageLabel, "barra grande");
    assert.strictEqual(propio.packageStore, "tiendafalsa");
    assert.strictEqual(propio.packageInherited, false, "es su envase, no uno prestado");

    // Y mercadona no se contamina: sigue con el suyo.
    var merca = s.resolvePackageInfo("Pan blanco", "mercadona");
    assert.strictEqual(merca.packageSizeG, 250);
    assert.strictEqual(merca.packageInherited, false);
  });

  t.test("una tienda REGISTRADA con un hueco NO lo rellena con el envase de otra", function () {
    var s = sandboxConDatosReales();
    // Registrada y con su tabla, pero sin este ingrediente: el caso de una
    // tienda a la que se le han curado unos formatos y otros todavía no.
    s.PACKAGING_CATALOGS.tiendafalsa = {
      storeId: "tiendafalsa", storeName: "Tienda Falsa",
      packages: { "tomate": { type: "fixedPackage", packageG: 400, packageLabel: "bandeja" } }
    };

    // Este test empezó esperando que el hueco cayera al envase de
    // Mercadona, y el código dice que no. El código tiene razón y la
    // expectativa era mía: rellenar huecos ingrediente a ingrediente con
    // los formatos de OTRA cadena es exactamente el fallo que este refactor
    // vino a arreglar, y además dejaría `packageInherited` sin sentido --
    // se calcula por registro, no por ingrediente, así que un envase
    // prestado se presentaría como propio.
    //
    // Sin dato, el ingrediente se comporta como lo que se vende al peso:
    // no hay envase que redondear. El presupuesto se queda corto en vez de
    // inventarse un formato, que es el lado seguro del error.
    var hueco = s.resolvePackageInfo("Pan blanco", "tiendafalsa");
    assert.strictEqual(hueco.packageSizeG, null,
      "un hueco de esta tienda no puede rellenarse con la barra de Mercadona");
    assert.strictEqual(hueco.packageStore, null);

    // Y lo que SÍ tiene curado, lo usa.
    var suyo = s.resolvePackageInfo("Tomate", "tiendafalsa");
    assert.strictEqual(suyo.packageSizeG, 400);
    assert.strictEqual(suyo.packageStore, "tiendafalsa");
    assert.strictEqual(suyo.packageInherited, false);
  });

  t.test("una tienda que NO existe en el registro hereda y se marca como prestado", function () {
    var s = sandboxConDatosReales();
    // Nadie registró "tiendafantasma". Esta es la rama que de verdad
    // importa: un dato prestado que podría pasar por propio.
    var fantasma = s.resolvePackageInfo("Pan blanco", "tiendafantasma");
    assert.strictEqual(fantasma.packageSizeG, 250);
    assert.strictEqual(fantasma.packageStore, "mercadona");
    assert.strictEqual(fantasma.packageInherited, true,
      "PRESTADO tiene que verse: si esto vuelve a ser false, una tienda nueva calculará su presupuesto con los envases de Mercadona sin que nadie se entere");
  });

  t.test("las raciones también llevan tienda, con las mismas dos ramas", function () {
    var s = sandboxConDatosReales();
    // resolveServingUnit vive en js/core/servings.js; el sandbox de este
    // fichero no lo carga, así que se comprueba el registro que lo alimenta.
    assert.ok(s.PACKAGING_CATALOGS.mercadona, "mercadona tiene que estar registrada");
    assert.strictEqual(typeof s.packagingCatalogFor, "function");

    var propia = s.packagingCatalogFor("mercadona");
    assert.strictEqual(propia.storeId, "mercadona");
    assert.strictEqual(propia.inherited, false);

    var prestada = s.packagingCatalogFor("tiendafantasma");
    assert.strictEqual(prestada.storeId, "mercadona");
    assert.strictEqual(prestada.inherited, true);
    assert.strictEqual(prestada.packages, propia.packages,
      "hereda la MISMA tabla, no una copia que pueda divergir");
  });

  // ── La memoria de claves no puede heredar del prototipo ────────────────
  // `normalizeIngredientKey` memoiza desde el 2026-09-14 (es la función más
  // llamada del motor, decenas de miles de veces por plan). La primera
  // versión usaba un objeto literal `{}`, y eso trae una trampa: `{}` hereda
  // de Object.prototype, así que `memo["constructor"]` NO vale `undefined`
  // -- vale la función Object.
  //
  // No se quedaba en un valor raro: `resolveIngredientPrice` hace
  // `key.indexOf(...)` sobre el resultado, así que reventaba con
  // "key.indexOf is not a function". Y es alcanzable desde el teclado: el
  // nombre de un ingrediente de la despensa lo escribe el usuario
  // (js/core/pantry.js), igual que el campo "no me gusta", y "constructor"
  // es una palabra española corriente.
  //
  // Este test existe para que quien "simplifique" la memoria a `{}` se
  // entere en el acto.
  var NOMBRES_DEL_PROTOTIPO = [
    "constructor", "toString", "valueOf", "hasOwnProperty",
    "isPrototypeOf", "propertyIsEnumerable", "toLocaleString", "__proto__"
  ];

  t.test("normalizeIngredientKey devuelve una CADENA para los nombres de Object.prototype", function () {
    var s = sandboxConDatosReales();
    NOMBRES_DEL_PROTOTIPO.forEach(function (nombre) {
      var clave = s.normalizeIngredientKey(nombre);
      assert.strictEqual(typeof clave, "string",
        '"' + nombre + '" devolvió ' + typeof clave + ' -- la memoria está heredando del prototipo');
    });
  });

  t.test("y esa cadena es la misma con memoria y sin ella", function () {
    var s = sandboxConDatosReales();
    NOMBRES_DEL_PROTOTIPO.forEach(function (nombre) {
      // Segunda llamada: la primera llenó la memoria, así que esta la LEE.
      // Si el valor cambia entre las dos, la memoria no es transparente.
      var primera = s.normalizeIngredientKey(nombre);
      var segunda = s.normalizeIngredientKey(nombre);
      assert.strictEqual(segunda, primera, '"' + nombre + '" cambia al releerse de la memoria');
      assert.strictEqual(segunda, s._normalizarClaveIngrediente(nombre),
        '"' + nombre + '" memoizado no coincide con el cálculo directo');
    });
  });

  t.test("un nombre del prototipo no revienta el precio ni el envase", function () {
    var s = sandboxConDatosReales();
    // La forma REAL del fallo: no era un valor raro, era una excepción
    // aguas abajo. Se prueba el camino entero, no solo la normalización.
    NOMBRES_DEL_PROTOTIPO.forEach(function (nombre) {
      var precio = s.resolveIngredientPrice(nombre, "mercadona");
      assert.strictEqual(typeof precio.pricePer100g, "number",
        '"' + nombre + '" no devolvió un precio numérico');
      var envase = s.resolvePackageInfo(nombre, "mercadona");
      assert.ok(envase && typeof envase === "object",
        '"' + nombre + '" no devolvió información de envase');
    });
  });

}

module.exports = { run: run };
