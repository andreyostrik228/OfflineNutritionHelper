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

  // 2026-11-11, visto en el Chrome del dueño: el bote de lentejas sin abrir
  // salía en «A la nevera» con «~365 días» al lado, y el kilo de pasta seca,
  // en la nevera con cuatro días.
  t.test("la conserva cerrada va al armario aunque la tienda diga «nevera» para el bote abierto", function () {
    var s = conTiendaDeMentira();
    s.PRODUCT_STORAGE["lentejas cocidas"] = { daysAfterOpening: 5, storage: "nevera" };
    assert.strictEqual(s.dondeGuardar("lentejas cocidas", null, false), "despensa", "cerrado: armario");
    assert.strictEqual(s.dondeGuardar("lentejas cocidas", null, true), "nevera", "abierto: nevera");
    assert.strictEqual(s.dondeGuardar("lentejas cocidas", "nevera", false), "nevera", "lo que fije la entrada sigue mandando");
    // Un fresco con «consumir en N días» sigue en la nevera cerrado: su vida
    // útil ya es de nevera.
    s.PRODUCT_STORAGE["skyr natural"] = { daysAfterOpening: 3, storage: "nevera" };
    assert.strictEqual(s.dondeGuardar("skyr natural", null, false), "nevera");
  });

  t.test("el arroz, la pasta y el grano se compran secos: armario, un año, y no son perecederos", function () {
    var s = conTiendaDeMentira();
    ["arroz blanco cocido", "arroz integral cocido", "cuscus cocido", "pasta cocida", "quinoa cocida",
     "trigo sarraceno cocido"].forEach(function (clave) {
      assert.strictEqual(s.dondeGuardar(clave, null, false), "despensa", clave);
      assert.strictEqual(s.getShelfLife(clave).days, 365, clave);
      assert.strictEqual(s.isPerishable(clave), false, clave);
      // Comprado hace una semana: ni caducado ni con prisa.
      var c = s.resolveExpiry({ grams: 2300, acquiredAt: "2026-11-04" }, clave, "2026-11-11");
      assert.strictEqual(c.tier, "ok", clave + " a la semana de comprarlo");
    });
    // La patata cocida al vacío sí es de nevera y de pocos días.
    assert.strictEqual(s.dondeGuardar("patata cocida", null, false), "nevera");
    assert.strictEqual(s.isPerishable("patata cocida"), true);
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
