/**
 * tests/allergens.test.js
 * ─────────────────────────────────────────────────────────────────────────
 * Alérgenos de etiqueta (2026-09-01) — MOSTRAR, nunca filtrar.
 *
 * Lo que estos tests protegen, por orden de importancia:
 *   1. que allergens.js NO filtre ningún plan: un producto con "Contiene
 *      gluten" sigue siendo elegible en "sin cocinar" exactamente igual
 *      que antes. Esta es la diferencia deliberada con "no me gusta".
 *   2. que "sin dato" devuelva null / "" y no una afirmación de "seguro".
 *   3. que el texto que se muestra sea el "Contiene …" real de la tabla,
 *      traducido a etiquetas EU-14, sin inventar nada.
 * ─────────────────────────────────────────────────────────────────────────
 */

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var loadBrowserGlobals = require("./lib/load-browser-globals").loadBrowserGlobals;

function projPath(rel) {
  return path.join(__dirname, "..", rel);
}

function sandbox() {
  return loadBrowserGlobals([
    projPath("js/core/utils.js"),
    projPath("js/data/product-allergens.js"),
    projPath("js/core/allergens.js")
  ]);
}

// Sandbox completo del generador "sin cocinar" + el módulo de alérgenos,
// para comprobar que cargar allergens.js no cambia el pool elegible.
function noCookSandbox() {
  return loadBrowserGlobals([
    projPath("js/core/utils.js"),
    projPath("js/data/dishes.js"),
    projPath("js/data/dish-instructions.js"),
    projPath("js/data/real-products.js"),
    projPath("js/data/no-cook-classifier.js"),
    projPath("js/core/pricing.js"),
    projPath("js/data/dislike-groups.js"),
    projPath("js/core/preferences.js"),
    projPath("js/data/product-allergens.js"),
    projPath("js/core/allergens.js"),
    projPath("js/data/serving-sizes.js"),
    projPath("js/data/no-cook-templates.js"),
    projPath("js/engine/no-cook-generator.js")
  ]);
}

function run(t) {

  // ── 1. NUNCA filtra ───────────────────────────────────────────────

  t.test("el generador 'sin cocinar' NO menciona la API de alérgenos (source-level)", function () {
    var src = fs.readFileSync(projPath("js/engine/no-cook-generator.js"), "utf8");
    assert.strictEqual(/PRODUCT_ALLERGENS|getProductAllergens|filterAllergen/.test(src), false,
      "no-cook-generator.js no debe tocar alérgenos -- son solo etiqueta, no filtro");
  });

  t.test("un producto con 'Contiene gluten' sigue en el pool elegible de 'sin cocinar'", function () {
    var s = noCookSandbox();
    var pool = s.getNoCookEligiblePool("mercadona");
    assert.ok(pool.length > 0, "el pool no debería estar vacío");

    var withGluten = pool.filter(function (entry) {
      var info = s.getProductAllergens(entry.product);
      return info && info.contains.indexOf("gluten") !== -1;
    });
    assert.ok(withGluten.length > 0,
      "productos etiquetados 'Contiene gluten' deben SEGUIR siendo elegibles (no se filtran)");
  });

  t.test("generateNoCookPlan() devuelve un plan completo con allergens.js cargado", function () {
    var s = noCookSandbox();
    var plan = s.generateNoCookPlan("mercadona");
    assert.ok(plan && Array.isArray(plan.slots) && plan.slots.length === 5);
    plan.slots.forEach(function (slot) {
      assert.ok(slot.items.length > 0, "cada toma debe traer productos: " + slot.key);
    });
  });

  // ── 2. Sin dato = null / "" ──────────────────────────────────────

  t.test("getProductAllergens(): id desconocido -> null (no una afirmación de 'seguro')", function () {
    var s = sandbox();
    assert.strictEqual(s.getProductAllergens("id-que-no-existe-99999999"), null);
    assert.strictEqual(s.getProductAllergens(""), null);
    assert.strictEqual(s.getProductAllergens(null), null);
    assert.strictEqual(s.getProductAllergens(undefined), null);
    assert.strictEqual(s.getProductAllergens({}), null);
  });

  t.test("renderAllergenLine(): sin dato -> cadena vacía (la UI no muestra nada)", function () {
    var s = sandbox();
    assert.strictEqual(s.renderAllergenLine("id-que-no-existe-99999999"), "");
    assert.strictEqual(s.renderAllergenLine({ id: "id-que-no-existe-99999999" }), "");
  });

  t.test("formatAllergenSummary(null | vacío) es cadena vacía", function () {
    var s = sandbox();
    assert.strictEqual(s.formatAllergenSummary(null), "");
    assert.strictEqual(s.formatAllergenSummary({ contains: [], may: [] }), "");
  });

  // ── 3. Muestra el dato real, traducido ───────────────────────────

  t.test("getProductAllergens() acepta el producto entero o el id suelto, y son equivalentes", function () {
    var s = sandbox();
    var ids = Object.keys(s.PRODUCT_ALLERGENS);
    assert.ok(ids.length > 500, "la tabla generada debería traer >500 productos");
    var sampleId = ids[0];
    var byId = s.getProductAllergens(sampleId);
    var byObj = s.getProductAllergens({ id: sampleId });
    assert.deepStrictEqual(byId, byObj);
    assert.ok(Array.isArray(byId.contains) && Array.isArray(byId.may));
    assert.ok(byId.contains.length + byId.may.length > 0, "toda entrada de la tabla tiene al menos una clave");
  });

  t.test("EU_ALLERGEN_LABELS cubre exactamente los 14 alérgenos de la UE", function () {
    var s = sandbox();
    assert.strictEqual(Object.keys(s.EU_ALLERGEN_LABELS).length, 14);
    assert.strictEqual(s.EU_ALLERGEN_LABELS.lacteos, "lácteos");
    assert.strictEqual(s.EU_ALLERGEN_LABELS.gluten, "gluten");
    assert.strictEqual(s.EU_ALLERGEN_LABELS.frutos_cascara, "frutos de cáscara");
  });

  t.test("cada clave de la tabla generada existe en EU_ALLERGEN_LABELS (nada huérfano)", function () {
    var s = sandbox();
    var known = s.EU_ALLERGEN_LABELS;
    Object.keys(s.PRODUCT_ALLERGENS).forEach(function (id) {
      var e = s.PRODUCT_ALLERGENS[id];
      (e.contains || []).concat(e.may || []).forEach(function (k) {
        assert.ok(known[k], "clave desconocida en la tabla: " + k + " (producto " + id + ")");
      });
    });
  });

  t.test("formatAllergenSummary(): 'Contiene …' y, si hay, ' · Puede contener …'", function () {
    var s = sandbox();
    assert.strictEqual(
      s.formatAllergenSummary({ contains: ["gluten", "lacteos"], may: [] }),
      "Contiene: gluten, lácteos"
    );
    assert.strictEqual(
      s.formatAllergenSummary({ contains: ["gluten"], may: ["soja"] }),
      "Contiene: gluten · Puede contener: soja"
    );
    assert.strictEqual(
      s.formatAllergenSummary({ contains: [], may: ["frutos_cascara"] }),
      "Puede contener: frutos de cáscara"
    );
  });

  t.test("formatAllergenSummary() ignora claves desconocidas sin romper", function () {
    var s = sandbox();
    assert.strictEqual(
      s.formatAllergenSummary({ contains: ["gluten", "inventado"], may: [] }),
      "Contiene: gluten"
    );
  });

  t.test("renderAllergenLine(): HTML con la clase, 'Contiene' en <strong> y el texto escapado", function () {
    var s = sandbox();
    // Busca un producto real de la tabla que declare 'Contiene'.
    var ids = Object.keys(s.PRODUCT_ALLERGENS);
    var withContains = ids.filter(function (id) {
      var e = s.PRODUCT_ALLERGENS[id];
      return e.contains && e.contains.length;
    });
    assert.ok(withContains.length > 0);
    var html = s.renderAllergenLine(withContains[0]);
    assert.ok(html.indexOf('class="nocook-item__allergens"') !== -1, "debe llevar la clase de la línea");
    assert.ok(html.indexOf("<strong>Contiene:</strong>") !== -1, "'Contiene' va en <strong>");
    assert.ok(html.indexOf("<script") === -1, "nunca debe haber HTML sin escapar");
  });

  t.test("un producto lácteo conocido (Chocolate a la taza Hacendado, id 10005) declara 'lacteos'", function () {
    var s = sandbox();
    var info = s.getProductAllergens("10005");
    assert.ok(info, "10005 debería estar en la tabla");
    assert.ok(info.contains.indexOf("lacteos") !== -1, "10005 lleva leche -> 'lacteos' en contains");
  });
}

module.exports = { run: run };
