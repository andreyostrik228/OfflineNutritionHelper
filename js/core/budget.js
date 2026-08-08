/**
 * js/core/budget.js
 * ─────────────────────────────────────────────────────────────────────────
 * Coste de COMPRA agregado de un día completo de comidas — el punto de
 * integración compartido entre plan-generator.js (para que el presupuesto
 * diario del usuario sea de verdad un tope de COMPRA, no de uso) y
 * render-shopping-list.js (para que la lista de la compra y el coste que
 * decidió si el plan "entra" en presupuesto sean SIEMPRE el mismo número
 * — nunca dos cálculos independientes que puedan divergir).
 *
 * ── Por qué existe este archivo (y no vive en pricing.js/pantry.js) ──────
 * pricing.js es deliberadamente agnóstico de "toma"/"plan" (solo sabe
 * precificar un ingrediente suelto). pantry.js es deliberadamente
 * agnóstico de dishes.js/DOM (solo sabe de ingredientes y gramos). Ninguno
 * de los dos debe aprender qué es un "día de comidas" solo para resolver
 * esto — ese concepto vive aquí, una capa por encima de ambos, igual que
 * plan-generator.js ya integra meal-helpers+dish-selector+pricing sin que
 * ninguno de ellos necesite saber del resto.
 *
 * ── usageCost vs. purchaseCost del DÍA completo (no de un ingrediente) ──
 * Sumar el usageCost de cada ingrediente por separado NUNCA es el coste
 * real de compra: un ingrediente usado en 3 comidas se compra en UN solo
 * paquete (o los que hagan falta agregando TODA la cantidad del día), y la
 * despensa puede cubrir parte o toda esa cantidad. Por eso
 * computeDayPurchaseCost() agrega SIEMPRE primero (aggregateMealItems) y
 * solo entonces calcula paquetes/despensa — igual que ya hacía
 * render-shopping-list.js, ahora en un solo sitio.
 *
 * Depende de:
 *   js/core/utils.js   (round2)
 *   js/core/pricing.js (resolvePurchaseCost, DEFAULT_STORE_ID)
 *   js/core/pantry.js  (resolvePurchaseCostWithPantry, getPantryState) —
 *                       OPCIONAL: si no está cargado, cae exactamente a
 *                       resolvePurchaseCost() sin descuento de despensa
 *                       (mismo patrón defensivo `typeof X === "function"`
 *                       que ya usa el resto del proyecto).
 *
 * Expone (globales):
 *   aggregateMealItems(meals) → [{name, requiredGrams}]
 *   computeDayPurchaseCost(meals, storeId, pantryState) →
 *     { purchaseCost, usageCost, lines: [{name, requiredGrams, usageCost,
 *       purchaseCost, hasFixedPackage, packageSizeG, packageLabel,
 *       packagesToBuy, coveredFromPantry, stillNeeded}] }
 * ─────────────────────────────────────────────────────────────────────────
 */

/**
 * Agrega los `items` de TODAS las comidas de un plan por nombre de
 * ingrediente, sumando gramos requeridos ENTRE TOMAS — el mismo
 * ingrediente usado en desayuno y cena es UNA sola cantidad total, nunca
 * dos compras separadas. Única fuente de verdad de esta agregación: antes
 * vivía duplicada (con ligeras variaciones) en render-shopping-list.js.
 *
 * @param {object[]} meals - salida de generateDietPlan().meals (o
 *                            cualquier array con la misma forma de items:
 *                            {name, grams})
 * @returns {{name:string, requiredGrams:number}[]}
 */
function aggregateMealItems(meals) {
  var byName = {};
  var order = [];

  (meals || []).forEach(function (meal) {
    (meal.items || []).forEach(function (item) {
      if (!byName[item.name]) {
        byName[item.name] = { name: item.name, requiredGrams: 0 };
        order.push(item.name);
      }
      byName[item.name].requiredGrams += item.grams;
    });
  });

  return order.map(function (name) { return byName[name]; });
}

/**
 * Resuelve el coste de compra de UNA línea ya agregada (nombre + gramos
 * totales del día) — usa resolvePurchaseCostWithPantry() si pantry.js está
 * cargado (descuenta despensa), si no cae a resolvePurchaseCost() normal.
 * @param {string} name
 * @param {number} requiredGrams
 * @param {string} [storeId]
 * @param {object|null} [pantryState]
 * @returns {object}
 */
function resolveDayLinePurchaseCost(name, requiredGrams, storeId, pantryState) {
  if (typeof resolvePurchaseCostWithPantry === "function") {
    return resolvePurchaseCostWithPantry(name, requiredGrams, storeId, pantryState);
  }
  if (typeof resolvePurchaseCost === "function") {
    return resolvePurchaseCost(name, requiredGrams, storeId);
  }
  // Ni pricing.js está cargado -- no debería ocurrir en producción (es
  // dependencia obligatoria), pero nunca lanza: coste 0 en vez de reventar.
  return {
    requiredGrams: requiredGrams, usageCost: 0, purchaseCost: 0,
    hasFixedPackage: false, packageSizeG: null, packageLabel: null,
    packagesToBuy: null, coveredFromPantry: 0, stillNeeded: requiredGrams
  };
}

/**
 * Coste de compra REAL del día completo: agrega todos los ingredientes de
 * `meals`, resuelve paquetes/despensa por ingrediente, y suma. Este es el
 * número que de verdad se paga en caja hoy (o 0 si la despensa ya cubre
 * todo) — el que plan-generator.js usa como tope duro del presupuesto
 * diario, y el mismo que consume la lista de la compra.
 *
 * `pantryState`: si se omite (no se pasa el argumento en absoluto) y
 * pantry.js está cargado, se lee getPantryState() UNA vez aquí — pásalo
 * explícitamente desde el llamador cuando se vaya a invocar esta función
 * varias veces seguidas (p.ej. el bucle de recorte de presupuesto) para no
 * releer localStorage en cada iteración y para que el resultado sea
 * consistente durante todo ese cálculo.
 *
 * @param {object[]} meals
 * @param {string} [storeId] - por defecto DEFAULT_STORE_ID (pricing.js)
 * @param {object} [pantryState] - snapshot de getPantryState(); si se omite
 *   por completo, se resuelve internamente (pantry.js cargado) o se ignora
 *   (no cargado)
 * @returns {{ purchaseCost:number, usageCost:number, lines:object[] }}
 */
function computeDayPurchaseCost(meals, storeId, pantryState) {
  var store = storeId || (typeof DEFAULT_STORE_ID !== "undefined" ? DEFAULT_STORE_ID : undefined);

  var resolvedPantryState = pantryState;
  if (resolvedPantryState === undefined && typeof getPantryState === "function") {
    resolvedPantryState = getPantryState();
  }

  var lines = aggregateMealItems(meals).map(function (entry) {
    var line = resolveDayLinePurchaseCost(entry.name, entry.requiredGrams, store, resolvedPantryState);
    line.name = entry.name;
    return line;
  });

  var purchaseCost = round2(lines.reduce(function (sum, l) { return sum + l.purchaseCost; }, 0));
  var usageCost = round2(lines.reduce(function (sum, l) { return sum + l.usageCost; }, 0));

  return { purchaseCost: purchaseCost, usageCost: usageCost, lines: lines };
}
