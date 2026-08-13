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
 * ── Coste de compra MARGINAL durante la SELECCIÓN (2026-08-08b) ───────────
 * Todo lo de arriba calcula el purchaseCost de un día YA CONSTRUIDO — sigue
 * siendo la verificación final autoritativa (enforcePurchaseBudgetCap en
 * plan-generator.js). Pero antes de esta sesión, dish-selector.js (la
 * cascada que de verdad ELIGE cada plato) decidía "¿me lo puedo permitir?"
 * mirando usageCost (precio × gramos usados), no purchaseCost — así que un
 * plato con usageCost bajo pero que obliga a comprar un envase entero caro
 * podía parecer "barato" en el momento de elegir, aunque no lo fuera de
 * verdad. Rediseño: dish-selector.js ahora pregunta el coste de compra
 * MARGINAL — "¿cuánto SUMA este plato a lo que ya se va a comprar hoy?",
 * no el purchaseCost aislado de sus gramos sueltos.
 *
 * Ej.: yogur 1kg/3€. Desayuno ya comprometió 100g -> ya toca comprar 1
 * paquete (3€). Si la cena necesita 100g más del MISMO ingrediente, esos
 * 100g siguen dentro del paquete ya comprado -> coste marginal de la cena
 * = 0€, no 0.30€ (usageCost) ni 3€ (purchaseCost aislado, que ignoraría
 * que el paquete ya se iba a comprar de todas formas).
 *
 * `committedGrams` es un acumulador MUTABLE ({ [claveNormalizada]: gramos })
 * que plan-generator.js mantiene durante la construcción de UN intento de
 * día completo (attemptPlanAtTier) — se reinicia en cada tier, nunca
 * persiste entre intentos ni entre generaciones. No es lo mismo que la
 * despensa (pantryState): la despensa es stock real de sesiones anteriores;
 * committedGrams es solo "lo que este mismo plan ya decidió comprar hasta
 * ahora", vive y muere con un solo intento de generación.
 *
 * Expone (globales):
 *   aggregateMealItems(meals) → [{name, requiredGrams}]
 *   computeDayPurchaseCost(meals, storeId, pantryState) →
 *     { purchaseCost, usageCost, lines: [{name, requiredGrams, usageCost,
 *       purchaseCost, hasFixedPackage, packageSizeG, packageLabel,
 *       packagesToBuy, coveredFromPantry, stillNeeded}] }
 *   estimateIngredientMarginalPurchaseCost(name, addGrams, committedGrams,
 *     storeId, pantryState) → number
 *   estimateItemsMarginalPurchaseCost(items, committedGrams, storeId,
 *     pantryState) → number
 *   estimateDishMarginalPurchaseCost(dish, scaleFactor, committedGrams,
 *     storeId, pantryState) → number
 *   addItemsToPurchaseState(committedGrams, items) → void (muta committedGrams)
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

// ── Coste de compra MARGINAL (usado por dish-selector.js durante la selección) ─

/**
 * Coste de compra MARGINAL de añadir `addGrams` más de un ingrediente a lo
 * que ya se ha comprometido comprar hoy (`committedGrams`) — ver cabecera
 * del archivo. `before=0` se resuelve directamente como 0€ SIN llamar a
 * resolveDayLinePurchaseCost(name, 0, ...): si pantry.js no está cargado,
 * esa llamada cae en resolvePurchaseCost(name, 0, storeId), que devuelve
 * "1 paquete fantasma" (Math.max(1, ...) — nunca se le llama con 0 gramos
 * en su uso normal, ver cabecera de pricing.js) en vez de 0€, lo que
 * infravaloraría sistemáticamente el coste marginal de introducir un
 * ingrediente nuevo. Evitar esa llamada aquí es más simple que tocar
 * resolvePurchaseCost/resolvePurchaseCostWithPantry para un caso que ellas
 * nunca necesitaron manejar hasta ahora.
 *
 * @param {string} name
 * @param {number} addGrams
 * @param {object} committedGrams - { [claveNormalizada]: gramosYaComprometidos }
 * @param {string} [storeId]
 * @param {object|null} [pantryState]
 * @returns {number}
 */
function estimateIngredientMarginalPurchaseCost(name, addGrams, committedGrams, storeId, pantryState) {
  if (!(addGrams > 0)) return 0;
  var key = normalizeIngredientKey(name);
  var before = (committedGrams && committedGrams[key]) || 0;
  var after = before + addGrams;
  var beforeCost = before > 0 ? resolveDayLinePurchaseCost(name, before, storeId, pantryState).purchaseCost : 0;
  var afterCost = resolveDayLinePurchaseCost(name, after, storeId, pantryState).purchaseCost;
  return round2(Math.max(0, afterCost - beforeCost));
}

/**
 * Coste de compra MARGINAL de un conjunto de items ({name, grams}[], la
 * misma forma que meal.items) dado lo ya comprometido — suma el marginal
 * de cada ingrediente por separado (NO agrega entre sí dentro de la propia
 * llamada: si el mismo ingrediente aparece dos veces en `items`, cada
 * aparición ve el estado ya actualizado por la anterior gracias a que
 * `committedGrams` es el mismo objeto para toda la función... salvo que
 * aquí NO se muta — usar addItemsToPurchaseState() aparte para eso. Items
 * duplicados dentro de un mismo `items[]` son un caso que hoy no ocurre en
 * la práctica, meal.items ya viene sin duplicados, ver mergeDuplicateFoods).
 *
 * @param {{name:string, grams:number}[]} items
 * @param {object} committedGrams
 * @param {string} [storeId]
 * @param {object|null} [pantryState]
 * @returns {number}
 */
function estimateItemsMarginalPurchaseCost(items, committedGrams, storeId, pantryState) {
  var total = 0;
  (items || []).forEach(function (item) {
    total += estimateIngredientMarginalPurchaseCost(item.name, item.grams, committedGrams, storeId, pantryState);
  });
  return round2(total);
}

/**
 * Igual que estimateItemsMarginalPurchaseCost, pero partiendo de un `dish`
 * de DISH_DB (items en `{name, g}`, sin escalar) y un `scaleFactor`
 * hipotético — usado por dish-selector.js para evaluar CANDIDATOS antes de
 * construir el meal de verdad (buildMealFromDish).
 *
 * @param {object} dish
 * @param {number} scaleFactor
 * @param {object} committedGrams
 * @param {string} [storeId]
 * @param {object|null} [pantryState]
 * @returns {number}
 */
function estimateDishMarginalPurchaseCost(dish, scaleFactor, committedGrams, storeId, pantryState) {
  var scaledItems = (dish.items || []).map(function (ingredient) {
    return { name: ingredient.name, grams: ingredient.g * scaleFactor };
  });
  return estimateItemsMarginalPurchaseCost(scaledItems, committedGrams, storeId, pantryState);
}

/**
 * Registra items ({name, grams}[]) como "ya comprometidos a comprar hoy" en
 * `committedGrams` — MUTA el objeto in-place (mismo patrón que pantryState
 * en pantry.js). Llamar DESPUÉS de calcular el coste marginal de esos
 * items, nunca antes (si no, el propio meal se restaría a sí mismo del
 * marginal).
 *
 * @param {object} committedGrams
 * @param {{name:string, grams:number}[]} items
 */
function addItemsToPurchaseState(committedGrams, items) {
  (items || []).forEach(function (item) {
    var key = normalizeIngredientKey(item.name);
    committedGrams[key] = (committedGrams[key] || 0) + item.grams;
  });
}
