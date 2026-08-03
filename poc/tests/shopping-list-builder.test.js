/**
 * poc/tests/shopping-list-builder.test.js
 * Tests mínimos de ShoppingListBuilder. Construye Meals falsos a mano
 * (sin pasar por el resolver) para aislar exclusivamente la lógica de
 * agregación/empaquetado.
 */

var assert = require("assert");
var buildShoppingList = require("../core/shopping-list-builder").buildShoppingList;

var ALMENDRAS = { id: "34014", name: "Almendra tostada Hacendado 0% sal añadida con piel", brand: "Hacendado", size: 0.2, sizeUnit: "kg", price: 2.95, pricePer100g: 1.475 };
var MIEL = { id: "15448", name: "Miel de naranjo Hacendado", brand: "Hacendado", size: 0.5, sizeUnit: "kg", price: 4.2, pricePer100g: 0.84 };

function fakeMeal(name, lines) {
  var total = lines.reduce(function (acc, l) { return acc + l.usageCost; }, 0);
  return {
    buildable: true, name: name,
    lines: lines.map(function (l) {
      return { productId: l.product.id, productName: l.product.name, brand: l.product.brand, grams: l.grams, usageCost: l.usageCost, product: l.product };
    }),
    total: { cost: total }
  };
}

function run(t) {
  t.test("agrupa el mismo producto usado en dos comidas en una sola línea", function () {
    var mealA = fakeMeal("Snack A", [{ product: ALMENDRAS, grams: 20, usageCost: 0.295 }]);
    var mealB = fakeMeal("Snack B", [{ product: ALMENDRAS, grams: 25, usageCost: 0.369 }]);

    var list = buildShoppingList([mealA, mealB]);

    assert.strictEqual(list.items.length, 1);
    assert.strictEqual(list.items[0].productId, "34014");
    assert.strictEqual(list.items[0].totalGramsNeeded, 45);
    assert.deepStrictEqual(list.items[0].usedInMeals, ["Snack A", "Snack B"]);
  });

  t.test("calcula paquetes a comprar redondeando hacia arriba sobre el tamaño real del envase", function () {
    var meal = fakeMeal("Snack", [{ product: ALMENDRAS, grams: 45, usageCost: 0.66 }]); // envase 200g
    var list = buildShoppingList([meal]);
    assert.strictEqual(list.items[0].packagesToBuy, 1);

    var mealGrande = fakeMeal("Snack grande", [{ product: ALMENDRAS, grams: 250, usageCost: 3.7 }]); // > 200g -> 2 paquetes
    var listGrande = buildShoppingList([mealGrande]);
    assert.strictEqual(listGrande.items[0].packagesToBuy, 2);
  });

  t.test("distingue coste de uso (continuo) de coste de compra (paquete entero)", function () {
    var meal = fakeMeal("Snack", [{ product: MIEL, grams: 10, usageCost: 0.084 }]); // envase 500g, precio 4.2
    var list = buildShoppingList([meal]);
    var item = list.items[0];
    assert.strictEqual(item.packagesToBuy, 1);
    assert.strictEqual(item.usageCost, 0.08); // redondeado a 2 decimales
    assert.strictEqual(item.purchaseCost, 4.2); // 1 bote entero, no una fracción
    assert.ok(item.purchaseCost > item.usageCost);
  });

  t.test("las recetas bloqueadas (buildable=false) no aportan líneas a la lista", function () {
    var mealBloqueada = { buildable: false, name: "Receta bloqueada", unresolved: [{ role: "salmon", reason: "x" }] };
    var mealBuena = fakeMeal("Snack", [{ product: MIEL, grams: 10, usageCost: 0.084 }]);

    var list = buildShoppingList([mealBloqueada, mealBuena]);

    assert.strictEqual(list.items.length, 1);
    assert.deepStrictEqual(list.skippedMeals, ["Receta bloqueada"]);
  });

  t.test("productos con tamaño en litros/kg se convierten correctamente a gramos base", function () {
    var leche = { id: "99", name: "Leche", brand: "", size: 1.0, sizeUnit: "l", price: 0.88, pricePer100g: 0.088 };
    var meal = fakeMeal("Desayuno", [{ product: leche, grams: 200, usageCost: 0.176 }]);
    var list = buildShoppingList([meal]);
    assert.strictEqual(list.items[0].packagesToBuy, 1); // 200ml de un envase de 1000ml
  });
}

module.exports = { run: run };
