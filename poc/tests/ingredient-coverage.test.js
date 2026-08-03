/**
 * poc/tests/ingredient-coverage.test.js
 * Verifica que el registro completo (poc/data/ingredient-rules-full.js)
 * cubre TODOS los ingredient roles reales de dishes.js, que cada regla
 * "resolved" apunta a un producto real que de verdad existe y es fiable,
 * que cada regla "unresolved" está marcada explícitamente con motivo, y
 * que la estructura no permite ningún fallback aleatorio silencioso.
 */

var assert = require("assert");
var extractUniqueIngredientRoles = require("../core/load-dishes").extractUniqueIngredientRoles;
var loadRealProducts = require("../core/load-real-products").loadRealProducts;
var INGREDIENT_RULES_FULL = require("../data/ingredient-rules-full").INGREDIENT_RULES_FULL;

var VALID_REASONS = ["no_existe", "sin_nutricion", "needsReview", "match_ambiguo", "solo_producto_no_apto", "otra"];

function run(t) {
  var dishRoles = extractUniqueIngredientRoles().map(function (r) { return r.name; });
  var realProducts = loadRealProducts();
  var productsById = new Map(realProducts.map(function (p) { return [String(p.id), p]; }));

  t.test("todos los ingredient roles reales de dishes.js tienen una regla en el registro", function () {
    var missing = dishRoles.filter(function (role) {
      return !Object.prototype.hasOwnProperty.call(INGREDIENT_RULES_FULL, role);
    });
    assert.deepStrictEqual(missing, [], "Roles sin regla: " + missing.join(", "));
  });

  t.test("el registro no contiene reglas para roles que ya no existen en dishes.js (registro sincronizado)", function () {
    var extra = Object.keys(INGREDIENT_RULES_FULL).filter(function (role) {
      return dishRoles.indexOf(role) === -1;
    });
    assert.deepStrictEqual(extra, [], "Reglas huérfanas (rol ya no usado en dishes.js): " + extra.join(", "));
  });

  t.test("cada regla tiene status 'resolved' o 'unresolved', nunca otro valor ni ausente", function () {
    Object.keys(INGREDIENT_RULES_FULL).forEach(function (role) {
      var rule = INGREDIENT_RULES_FULL[role];
      assert.ok(rule.status === "resolved" || rule.status === "unresolved", role + ": status inválido (" + rule.status + ")");
    });
  });

  t.test("toda regla 'resolved' apunta a un productId que EXISTE de verdad en REAL_PRODUCTS", function () {
    Object.keys(INGREDIENT_RULES_FULL).forEach(function (role) {
      var rule = INGREDIENT_RULES_FULL[role];
      if (rule.status !== "resolved") return;
      var product = productsById.get(String(rule.productId));
      assert.ok(product, role + ": productId " + rule.productId + " no existe en REAL_PRODUCTS (dato inventado o obsoleto)");
    });
  });

  t.test("todo producto de una regla 'resolved' cumple needsReview=false y tiene macros no nulos", function () {
    Object.keys(INGREDIENT_RULES_FULL).forEach(function (role) {
      var rule = INGREDIENT_RULES_FULL[role];
      if (rule.status !== "resolved") return;
      var product = productsById.get(String(rule.productId));
      assert.strictEqual(product.needsReview, false, role + ": el producto resuelto tiene needsReview=true");
      assert.notStrictEqual(product.kcal, null, role + ": el producto resuelto tiene kcal=null");
      assert.notStrictEqual(product.protein, null, role + ": el producto resuelto tiene protein=null");
      assert.notStrictEqual(product.carbs, null, role + ": el producto resuelto tiene carbs=null");
      assert.notStrictEqual(product.fat, null, role + ": el producto resuelto tiene fat=null");
    });
  });

  t.test("los macros declarados en la regla coinciden con los del producto real (no hay valores fabricados a mano)", function () {
    Object.keys(INGREDIENT_RULES_FULL).forEach(function (role) {
      var rule = INGREDIENT_RULES_FULL[role];
      if (rule.status !== "resolved") return;
      var product = productsById.get(String(rule.productId));
      assert.strictEqual(rule.kcal, product.kcal, role + ": kcal de la regla no coincide con REAL_PRODUCTS");
      assert.strictEqual(rule.protein, product.protein, role + ": protein de la regla no coincide con REAL_PRODUCTS");
      assert.strictEqual(rule.carbs, product.carbs, role + ": carbs de la regla no coincide con REAL_PRODUCTS");
      assert.strictEqual(rule.fat, product.fat, role + ": fat de la regla no coincide con REAL_PRODUCTS");
    });
  });

  t.test("toda regla 'unresolved' tiene un motivo (reason) válido y un detalle explicativo", function () {
    Object.keys(INGREDIENT_RULES_FULL).forEach(function (role) {
      var rule = INGREDIENT_RULES_FULL[role];
      if (rule.status !== "unresolved") return;
      assert.ok(VALID_REASONS.indexOf(rule.reason) !== -1, role + ": reason inválido o ausente (" + rule.reason + ")");
      assert.ok(typeof rule.detail === "string" && rule.detail.length > 10, role + ": falta 'detail' explicativo");
    });
  });

  t.test("ninguna regla 'unresolved' tiene productId (no puede colarse un fallback silencioso)", function () {
    Object.keys(INGREDIENT_RULES_FULL).forEach(function (role) {
      var rule = INGREDIENT_RULES_FULL[role];
      if (rule.status !== "unresolved") return;
      assert.strictEqual(rule.productId, undefined, role + ": una regla unresolved no debe tener productId");
    });
  });

  t.test("el conteo total resolved+unresolved coincide con el total de roles auditados (81)", function () {
    var total = Object.keys(INGREDIENT_RULES_FULL).length;
    var resolved = Object.keys(INGREDIENT_RULES_FULL).filter(function (r) { return INGREDIENT_RULES_FULL[r].status === "resolved"; }).length;
    var unresolved = Object.keys(INGREDIENT_RULES_FULL).filter(function (r) { return INGREDIENT_RULES_FULL[r].status === "unresolved"; }).length;
    assert.strictEqual(resolved + unresolved, total);
    assert.strictEqual(total, dishRoles.length);
  });
}

module.exports = { run: run };
