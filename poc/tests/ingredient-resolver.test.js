/**
 * poc/tests/ingredient-resolver.test.js
 * Tests mínimos de IngredientResolver. Sin framework (el proyecto no tiene
 * ninguno, ver STATE.md) -- assert de Node + un runner casero
 * (poc/tests/run-tests.js). Usa productos falsos in-memory, NO
 * REAL_PRODUCTS real, para poder controlar exactamente los casos límite.
 */

var assert = require("assert");
var createIngredientResolver = require("../core/ingredient-resolver").createIngredientResolver;

var FAKE_PRODUCTS = [
  { id: "1", name: "Pechuga de pollo real", brand: "", category: "Carne", leafCategory: "Pollo",
    kcal: 108, protein: 22, carbs: 0.5, fat: 1.8, needsReview: false, price: 3.33, pricePer100g: 0.665, size: 0.5, sizeUnit: "kg" },
  { id: "2", name: "Pechuga de pollo braseada lonchas", brand: "", category: "Carne", leafCategory: "Pollo",
    kcal: 90, protein: 18, carbs: 1, fat: 1, needsReview: false, price: 2, pricePer100g: 1, size: 0.2, sizeUnit: "kg" },
  { id: "3", name: "Avena con needsReview", brand: "", category: "Cereales y galletas", leafCategory: "X",
    kcal: 384, protein: 12, carbs: 60, fat: 7, needsReview: true, price: 1, pricePer100g: 0.2, size: 0.5, sizeUnit: "kg" },
  { id: "4", name: "Producto sin nutricion", brand: "", category: "Fruta y verdura", leafCategory: "X",
    kcal: null, protein: null, carbs: null, fat: null, needsReview: false, price: 1, pricePer100g: 0.2, size: 1, sizeUnit: "kg" },
  { id: "5", name: "Manzana implausible", brand: "", category: "Fruta y verdura", leafCategory: "Manzana y pera",
    kcal: 65, protein: 3.4, carbs: 4.3, fat: 4.1, needsReview: false, price: 1, pricePer100g: 0.2, size: 1, sizeUnit: "kg" },
  { id: "6", name: "Manzana plausible", brand: "", category: "Fruta y verdura", leafCategory: "Manzana y pera",
    kcal: 52, protein: 0.5, carbs: 11, fat: 0.5, needsReview: false, price: 1, pricePer100g: 0.2, size: 1, sizeUnit: "kg" }
];

var RULES = {
  "pechuga de pollo": {
    status: "resolved", category: "Carne", leafCategoryAllow: ["Pollo"],
    nameExcludeAny: ["braseada", "lonchas"], pinnedProductId: "1"
  },
  "avena": {
    status: "resolved", category: "Cereales y galletas", pinnedProductId: "3"
  },
  "sin nutricion": {
    status: "resolved", category: "Fruta y verdura", pinnedProductId: "4"
  },
  "manzana": {
    status: "resolved", category: "Fruta y verdura", leafCategoryAllow: ["Manzana y pera"],
    maxProteinPer100g: 1.0, maxFatPer100g: 1.0, pinnedProductId: "5"
  },
  "manzana buena": {
    status: "resolved", category: "Fruta y verdura", leafCategoryAllow: ["Manzana y pera"],
    maxProteinPer100g: 1.0, maxFatPer100g: 1.0, pinnedProductId: "6"
  },
  "skyr": { status: "unresolved", reason: "no existe en el catálogo" }
};

function run(t) {
  var resolver = createIngredientResolver(FAKE_PRODUCTS, RULES);

  t.test("resuelve un rol con candidato válido y excluye el que matchea por nombre prohibido", function () {
    var result = resolver.resolve("pechuga de pollo");
    assert.strictEqual(result.status, "resolved");
    assert.strictEqual(result.product.id, "1");
  });

  t.test("rechaza un candidato con needsReview=true (avena)", function () {
    var result = resolver.resolve("avena");
    assert.strictEqual(result.status, "unresolved");
  });

  t.test("rechaza un candidato con kcal=null", function () {
    var result = resolver.resolve("sin nutricion");
    assert.strictEqual(result.status, "unresolved");
  });

  t.test("rechaza un candidato con needsReview=false pero macros implausibles (guarda de plausibilidad)", function () {
    var result = resolver.resolve("manzana");
    assert.strictEqual(result.status, "unresolved");
  });

  t.test("acepta un candidato con macros plausibles bajo la misma guarda", function () {
    var result = resolver.resolve("manzana buena");
    assert.strictEqual(result.status, "resolved");
    assert.strictEqual(result.product.id, "6");
  });

  t.test("un rol marcado unresolved en la regla nunca se resuelve", function () {
    var result = resolver.resolve("skyr");
    assert.strictEqual(result.status, "unresolved");
  });

  t.test("un rol sin ninguna regla definida se marca unresolved (nunca falla en silencio ni inventa)", function () {
    var result = resolver.resolve("ingrediente-inexistente");
    assert.strictEqual(result.status, "unresolved");
  });

  t.test("memoización: dos resoluciones del mismo rol devuelven la MISMA referencia de producto", function () {
    var r1 = resolver.resolve("pechuga de pollo");
    var r2 = resolver.resolve("pechuga de pollo");
    assert.strictEqual(r1.product, r2.product);
  });

  t.test("instancias distintas de resolver no comparten caché", function () {
    var resolverB = createIngredientResolver(FAKE_PRODUCTS, RULES);
    var r1 = resolver.resolve("manzana buena");
    resolverB.reset();
    var r2 = resolverB.resolve("manzana buena");
    assert.strictEqual(r1.product.id, r2.product.id);
    assert.notStrictEqual(r1, r2); // objetos de resultado distintos, aunque el producto resuelto sea el mismo
  });
}

module.exports = { run: run };
