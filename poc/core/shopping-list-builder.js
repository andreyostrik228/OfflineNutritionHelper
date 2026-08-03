/**
 * poc/core/shopping-list-builder.js
 * ─────────────────────────────────────────────────────────────────────────
 * Agrega los ingredientes de TODOS los Meals construibles de un plan en
 * una lista de la compra: agrupa por producto real (product.id), suma los
 * gramos necesarios en todas las comidas donde aparece, y convierte el
 * total a paquetes comprables usando el tamaño REAL del producto
 * (product.size + product.sizeUnit), nunca una constante inventada.
 *
 * Distingue explícitamente:
 *   usageCost   - coste continuo de lo realmente USADO (precio×gramos),
 *                 el mismo criterio que usa hoy el motor de presupuesto.
 *   purchaseCost - coste de COMPRAR paquetes enteros (siempre >= usageCost).
 * Ver plan de migración, punto E: son números distintos a propósito.
 * ─────────────────────────────────────────────────────────────────────────
 */

function round1(n) { return Math.round(n * 10) / 10; }
function round2(n) { return Math.round(n * 100) / 100; }

/**
 * Convierte el tamaño de envase de un producto real a gramos/mililitros
 * equivalentes. "kg"/"l" están en unidades de 1000; "g"/"ml"/"ud" ya son
 * la unidad base.
 * @param {number} size
 * @param {string} sizeUnit
 * @returns {number}
 */
function sizeToBaseUnits(size, sizeUnit) {
  if (sizeUnit === "kg" || sizeUnit === "l") return size * 1000;
  return size; // "g", "ml", "ud" ya están en la unidad base
}

/**
 * @param {object[]} meals - salida de buildMeal(), buildable=true o false
 * @returns {{ items: object[], totalUsageCost: number, totalPurchaseCost: number, skippedMeals: string[] }}
 */
function buildShoppingList(meals) {
  var byProduct = new Map();
  var skippedMeals = [];

  meals.forEach(function (meal) {
    if (!meal.buildable) {
      skippedMeals.push(meal.name);
      return;
    }
    meal.lines.forEach(function (line) {
      var key = String(line.productId);
      if (!byProduct.has(key)) {
        byProduct.set(key, {
          productId: line.productId,
          name: line.productName,
          brand: line.brand,
          product: line.product,
          totalGrams: 0,
          usageCost: 0,
          usedInMeals: []
        });
      }
      var entry = byProduct.get(key);
      entry.totalGrams += line.grams;
      entry.usageCost += line.usageCost;
      if (entry.usedInMeals.indexOf(meal.name) === -1) entry.usedInMeals.push(meal.name);
    });
  });

  var items = [];
  byProduct.forEach(function (entry) {
    var packageBaseUnits = sizeToBaseUnits(entry.product.size, entry.product.sizeUnit);
    var packagesToBuy = packageBaseUnits > 0
      ? Math.max(1, Math.ceil((entry.totalGrams / packageBaseUnits) - 1e-9))
      : 1;

    items.push({
      productId: entry.productId,
      name: entry.name,
      brand: entry.brand,
      usedInMeals: entry.usedInMeals,
      totalGramsNeeded: round1(entry.totalGrams),
      packageLabel: entry.product.size + entry.product.sizeUnit,
      packagesToBuy: packagesToBuy,
      unitPrice: entry.product.price,
      usageCost: round2(entry.usageCost),
      purchaseCost: round2(packagesToBuy * entry.product.price)
    });
  });

  var totalUsageCost = round2(items.reduce(function (s, i) { return s + i.usageCost; }, 0));
  var totalPurchaseCost = round2(items.reduce(function (s, i) { return s + i.purchaseCost; }, 0));

  return { items: items, totalUsageCost: totalUsageCost, totalPurchaseCost: totalPurchaseCost, skippedMeals: skippedMeals };
}

module.exports = { buildShoppingList: buildShoppingList, sizeToBaseUnits: sizeToBaseUnits };
