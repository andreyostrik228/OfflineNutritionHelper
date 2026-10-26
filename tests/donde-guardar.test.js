/**
 * tests/donde-guardar.test.js
 * ─────────────────────────────────────────────────────────────────────────
 * Dónde se guarda lo de la despensa (2026-10-26): nevera, congelador o
 * armario. Pedido del dueño: «в кладовой показывало что нужно класть в
 * холодильник, а что можно просто в шкаф». Se prueba dondeGuardar
 * (js/core/expiry.js), que todo ingrediente de los platos tenga sitio, y que
 * la lista de la despensa salga por grupos (filasPorLugar, render-pantry.js).
 * ─────────────────────────────────────────────────────────────────────────
 */

var assert = require("assert");
var path = require("path");
var loadBrowserGlobals = require("./lib/load-browser-globals").loadBrowserGlobals;

function projPath(rel) { return path.join(__dirname, "..", rel); }

/** expiry.js con su vida útil y una tienda de mentira. */
function conTiendaDeMentira() {
  var s = loadBrowserGlobals([projPath("js/data/shelf-life.js"), projPath("js/core/expiry.js")]);
  s.PRODUCT_STORAGE = { "p-yogur": { storage: "nevera" }, "p-guisantes": { storage: "congelador" } };
  s.getRealProductsForStore = function () {
    return [
      { id: "p-leche", category: "Huevos, leche y mantequilla", leafCategory: "Leche semidesnatada" },
      { id: "p-mantequilla", category: "Huevos, leche y mantequilla", leafCategory: "Mantequilla" },
      { id: "p-pan", category: "Panadería y pastelería", leafCategory: "Barra de pan" },
      { id: "p-raro", category: "Algo nuevo", leafCategory: "Otra cosa" }
    ];
  };
  return s;
}

function run(t) {
  t.test("manda lo que diga la entrada, luego la tienda, luego la vida útil y luego la categoría", function () {
    var s = conTiendaDeMentira();
    assert.strictEqual(s.dondeGuardar("p-yogur", "congelador"), "congelador", "si lo congelaste, va al congelador");
    assert.strictEqual(s.dondeGuardar("p-yogur", null), "nevera", "la ficha de la tienda");
    assert.strictEqual(s.dondeGuardar("p-guisantes"), "congelador");
    assert.strictEqual(s.dondeGuardar("bacalao"), "nevera", "la vida útil del ingrediente");
    assert.strictEqual(s.dondeGuardar("p-mantequilla"), "nevera", "por categoría");
    assert.strictEqual(s.dondeGuardar("p-leche"), "despensa", "un brick de leche cerrado va al armario (por hoja)");
    assert.strictEqual(s.dondeGuardar("p-pan"), "despensa");
    assert.strictEqual(s.dondeGuardar("p-raro"), null, "sin dato no se adivina");
    assert.strictEqual(s.dondeGuardar("nada-de-nada"), null);
    assert.strictEqual(s.dondeGuardar("p-yogur", "en el bolsillo"), "nevera", "un valor raro en la entrada no cuenta");
  });

  t.test("cerrado al armario, abierto a la nevera: leche UHT, conservas; un tarro que dura, sigue en el armario", function () {
    var s = conTiendaDeMentira();
    assert.strictEqual(s.dondeGuardar("leche semidesnatada", null, false), "despensa", "el brick cerrado");
    assert.strictEqual(s.dondeGuardar("leche semidesnatada", null, true), "nevera", "abierto");
    assert.strictEqual(s.dondeGuardar("atun al natural", null, false), "despensa");
    assert.strictEqual(s.dondeGuardar("atun al natural", null, true), "nevera", "la lata abierta");
    assert.strictEqual(s.dondeGuardar("mantequilla de cacahuete", null, true), "despensa", "90 días abierto: armario");
    assert.strictEqual(s.dondeGuardar("p-leche", null, true), "nevera", "producto del catálogo abierto, por su hoja");
    assert.strictEqual(s.dondeGuardar("p-pan", null, true), "despensa", "el pan abierto no va a la nevera");
  });

  // El sandbox grande se monta UNA vez y lo usan las dos pruebas de abajo.
  var grande = null;
  function sandboxGrande() {
    if (grande) return grande;
    grande = loadBrowserGlobals([
      "js/data/dishes.js", "js/data/real-products.js", "js/data/real-ingredient-matches.js",
      "js/data/prices/mercadona.js", "js/core/utils.js", "js/core/i18n.js", "js/i18n/es.js", "js/i18n/ru.js",
      "js/core/pricing.js", "js/core/servings.js", "js/core/nutrition.js",
      "js/data/shelf-life.js", "js/data/product-storage.js", "js/core/expiry.js", "js/ui/render-pantry.js"
    ].map(projPath));
    return grande;
  }

  t.test("todo ingrediente de los platos tiene sitio (si sale uno nuevo sin él, aquí se ve)", function () {
    var s = sandboxGrande();
    var sinSitio = {};
    s.DISH_DB.forEach(function (plato) {
      (plato.items || []).forEach(function (i) {
        var clave = s.normalizeIngredientKey(i.name);
        if (!s.dondeGuardar(clave)) sinSitio[i.name] = true;
      });
    });
    assert.deepStrictEqual(Object.keys(sinSitio), []);
  });

  t.test("la lista de la despensa sale por grupos: nevera, congelador, armario y lo que no se sabe", function () {
    var s = sandboxGrande();
    s._langMemoryState = "ru";
    var filas = [
      { name: "a", guardar: "despensa" }, { name: "b", guardar: "nevera" }, { name: "c", guardar: null },
      { name: "d", guardar: "nevera" }, { name: "e", guardar: "congelador" }
    ];
    var html = s.filasPorLugar(filas, function (e) { return '<li class="pantry-item">' + e.name + "</li>"; }, "prueba");
    var orden = [];
    html.replace(/pantry-lugar--([a-z-]+)|pantry-item">(\w)/g, function (_, g, f) { orden.push(g || f); });
    assert.deepStrictEqual(orden, ["nevera", "b", "d", "congelador", "e", "despensa", "a", "sin-dato", "c"]);
    assert.ok(html.indexOf("В холодильник") !== -1 && html.indexOf("В шкаф") !== -1 && html.indexOf("В морозилку") !== -1);
    assert.ok(/<span class="pantry-lugar__n">2<\/span>/.test(html), "cuántos hay en la nevera");
    assert.strictEqual(s.filasPorLugar([], function () { return "x"; }, "vacía"), "", "lista vacía, nada");
  });
}

module.exports = { run: run };
