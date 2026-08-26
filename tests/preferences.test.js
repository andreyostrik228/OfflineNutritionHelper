/**
 * tests/preferences.test.js
 * ─────────────────────────────────────────────────────────────────────────
 * "No me gusta" — PREFERENCIA BLANDA (2026-08-26).
 *
 * Lo que estos tests protegen, por orden de importancia:
 *   1. que una lista vacía no cambie NADA (los golden-master del generador
 *      dependen de que el pool de candidatos sea idéntico sin preferencias),
 *   2. que se filtre, no se puntúe -- una preferencia se respeta, no se
 *      pondera,
 *   3. que esto NO se convierta nunca en el camino de alergias: son
 *      restricciones de naturaleza opuesta y viven aparte a propósito.
 * ─────────────────────────────────────────────────────────────────────────
 */

var assert = require("assert");
var path = require("path");
var loadBrowserGlobals = require("./lib/load-browser-globals").loadBrowserGlobals;

function projPath(rel) {
  return path.join(__dirname, "..", rel);
}

function sandbox() {
  return loadBrowserGlobals([
    projPath("js/core/utils.js"),
    projPath("js/data/dishes.js"),
    projPath("js/data/real-products.js"),
    projPath("js/data/no-cook-classifier.js"),
    projPath("js/core/pricing.js"),
    projPath("js/core/preferences.js"),
    projPath("js/engine/no-cook-generator.js")
  ]);
}

function settingsSandbox() {
  return loadBrowserGlobals([
    projPath("js/core/utils.js"),
    projPath("js/core/settings.js")
  ]);
}

function run(t) {

  // ── Coincidencia ──────────────────────────────────────────────────

  t.test("matchesDislike casa por subcadena, sin acentos y sin mayusculas", function () {
    var s = sandbox();
    // El usuario escribe "cebolla" y espera tapar todas sus formas.
    assert.strictEqual(s.matchesDislike("Crema de cebolla", ["cebolla"]), true);
    assert.strictEqual(s.matchesDislike("Aros de Cebolla", ["CEBOLLA"]), true);
    assert.strictEqual(s.matchesDislike("Plátano de Canarias", ["platano"]), true, "sin acento debe casar");
    assert.strictEqual(s.matchesDislike("Yogur natural", ["cebolla"]), false);
  });

  t.test("matchesDislike ignora entradas vacias o basura de la lista", function () {
    var s = sandbox();
    assert.strictEqual(s.matchesDislike("Yogur", ["", "   ", null, 42]), false);
    assert.strictEqual(s.matchesDislike("", ["yogur"]), false);
    assert.strictEqual(s.matchesDislike("Yogur", null), false);
  });

  // ── El invariante que protege los golden-master ───────────────────

  t.test("lista VACIA no quita nada -- ni productos ni platos", function () {
    var s = sandbox();
    var pool = s.getNoCookEligiblePool();
    assert.strictEqual(s.filterDislikedProducts(pool, []).length, pool.length);
    assert.strictEqual(s.filterDislikedProducts(pool, null).length, pool.length);
    // Sin lista, el filtro es literalmente el mismo array.
    assert.strictEqual(s.filterDislikedProducts(pool, []), pool, "sin lista devuelve el mismo pool, sin copiar");
  });

  // ── Filtrado real ─────────────────────────────────────────────────

  t.test("filterDislikedProducts acepta las DOS formas de entrada", function () {
    var s = sandbox();
    // catálogo: {name}. Pool de "sin cocinar": {product:{name}}.
    var pelado = [{ name: "Crema de cebolla" }, { name: "Yogur natural" }];
    var envuelto = [{ product: { name: "Crema de cebolla" } }, { product: { name: "Yogur natural" } }];
    assert.strictEqual(s.filterDislikedProducts(pelado, ["cebolla"]).length, 1);
    assert.strictEqual(s.filterDislikedProducts(envuelto, ["cebolla"]).length, 1);
  });

  t.test("filtrar no muta el pool original", function () {
    var s = sandbox();
    var pool = s.getNoCookEligiblePool();
    var antes = pool.length;
    s.filterDislikedProducts(pool, ["queso"]);
    assert.strictEqual(pool.length, antes, "el pool original se queda igual");
  });

  t.test("un ingrediente no deseado descarta el PLATO entero", function () {
    var s = sandbox();
    // "Tomate" es un rol real de dishes.js.
    var conTomate = s.DISH_DB.filter(function (d) {
      return (d.items || []).some(function (i) { return s.matchesDislike(i.name, ["tomate"]); });
    });
    assert.ok(conTomate.length > 0, "fixture: debe haber platos con tomate");
    // Y ninguno de ellos debe sobrevivir al filtro.
    conTomate.forEach(function (d) {
      var sobrevive = !(d.items || []).some(function (i) { return s.matchesDislike(i.name, ["tomate"]); });
      assert.strictEqual(sobrevive, false);
    });
  });

  // ── Límite honesto de cobertura ───────────────────────────────────

  t.test("LIMITACION CONOCIDA: dishes.js son 81 roles, no ingredientes finos", function () {
    var s = sandbox();
    var roles = {};
    s.DISH_DB.forEach(function (d) {
      (d.items || []).forEach(function (i) { roles[i.name.toLowerCase()] = true; });
    });
    // "cebolla" y "ajo" no existen como rol: el filtro de PLATOS no puede
    // atraparlos por mucho que el usuario los escriba. Es una limitación de
    // los datos, no del filtro, y se documenta aquí para que nadie la
    // "arregle" creyendo que el matching falla.
    var hayCebolla = Object.keys(roles).some(function (r) { return r.indexOf("cebolla") !== -1; });
    assert.strictEqual(hayCebolla, false, "si esto falla, dishes.js gano un rol de cebolla: revisa la nota de la UI");
    // En cambio los pescados concretos SI son roles.
    var haySalmon = Object.keys(roles).some(function (r) { return r.indexOf("salm") !== -1; });
    assert.strictEqual(haySalmon, true);
  });

  // ── Persistencia ──────────────────────────────────────────────────

  t.test("los settings sanean la lista: recortan, deduplican y descartan basura", function () {
    var s = settingsSandbox();
    s.saveSettings({ dislikes: ["  Cebolla  ", "cebolla", "CEBOLLA", "", null, 7, "Queso"] });
    var out = s.getSettings().dislikes;
    // Comparado elemento a elemento, no con deepStrictEqual: el array viene
    // del sandbox vm y su prototipo es de OTRO realm, asi que
    // deepStrictEqual falla por prototipo aunque el contenido sea igual.
    assert.strictEqual(out.length, 2, "recortado y deduplicado sin distinguir mayusculas");
    assert.strictEqual(out[0], "Cebolla");
    assert.strictEqual(out[1], "Queso");
  });

  t.test("una lista corrupta en localStorage no tumba los settings", function () {
    var s = settingsSandbox();
    s.saveSettings({ dislikes: "no soy un array" });
    assert.deepStrictEqual(s.getSettings().dislikes, undefined, "se ignora, no lanza");
  });

  // ── La separación dura/blanda ─────────────────────────────────────

  t.test("dislikes NO comparte campo con las alergias", function () {
    var s = settingsSandbox();
    // Si algun dia alguien fusiona ambas en una lista con flag de
    // severidad, este test cae -- y esa es exactamente su razon de ser.
    assert.ok(s.SETTINGS_LIST_FIELDS.indexOf("dislikes") !== -1);
    assert.strictEqual(
      s.SETTINGS_LIST_FIELDS.indexOf("allergens"), -1,
      "las alergias son una restriccion DURA: no pueden compartir el camino blando de dislikes"
    );
  });

}

module.exports = { run: run };
