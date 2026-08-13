/**
 * js/ui/render-shopping-list.js
 * ─────────────────────────────────────────────────────────────────────────
 * Lista de la compra del plan diario. Agrupa los `items` que ya están en
 * `result.meals` (mismo `name`/`grams` que ya se muestran en las tarjetas
 * de comida) por ingrediente, sumando gramos requeridos ENTRE TOMAS antes
 * de calcular nada de paquete/precio — así el mismo ingrediente usado en
 * desayuno y cena se compra una sola vez, no dos veces por separado.
 *
 * Coste mostrado: usa SIEMPRE purchaseCost, nunca usageCost — comprar un
 * bote de miel de 250g para usar 23g cuesta el bote entero, no una
 * fracción proporcional. Ver la cabecera de js/core/pricing.js para la
 * distinción completa usageCost/purchaseCost/data.budget.
 *
 * El cálculo real (agregación + paquetes + despensa) vive en
 * js/core/budget.js (computeDayPurchaseCost) — el MISMO que usa
 * plan-generator.js para decidir si un plan candidato cabe en el
 * presupuesto de compra del usuario. Nunca dos cálculos independientes:
 * si aquí y en el generador se calculara cada uno por su cuenta, un
 * redondeo o una regla distinta podría hacer que la lista de la compra
 * mostrara un total diferente del que el generador usó para aceptar el
 * plan — este archivo delega en budget.js precisamente para que eso sea
 * estructuralmente imposible.
 *
 * Es una vista de PRESENTACIÓN + agregación: no calcula nutrición, no
 * decide qué platos elegir, no toca dish-selector.js/plan-generator.js.
 *
 * Depende de:
 *   js/core/utils.js   (round0, round1, round2, escapeHtml)
 *   js/core/pricing.js (DEFAULT_STORE_ID)
 *   js/core/budget.js  (aggregateMealItems, computeDayPurchaseCost)
 *
 * Inicialización obligatoria:
 *   Llamar a initShoppingListRefs(refs) desde js/app.js antes de usar.
 *
 * Expone (globales):
 *   initShoppingListRefs(refs)
 *   renderShoppingList(meals, storeId)
 * ─────────────────────────────────────────────────────────────────────────
 */

var shoppingPanel, shoppingSummaryEl, shoppingCountEl, shoppingListContainer;

/**
 * Conecta los nodos DOM necesarios para este módulo.
 * @param {object} refs
 */
function initShoppingListRefs(refs) {
  shoppingPanel = refs.shoppingPanel;
  shoppingSummaryEl = refs.shoppingSummaryEl;
  shoppingCountEl = refs.shoppingCountEl;
  shoppingListContainer = refs.shoppingListContainer;
}

/**
 * Agrupa los items de todas las comidas del día por nombre de ingrediente,
 * sumando gramos REQUERIDOS entre tomas (ej. "Miel" usado en desayuno y
 * cena se convierte en UNA cantidad total ANTES de mirar ningún envase) —
 * delega la agregación en sí a aggregateMealItems() (js/core/budget.js,
 * fuente única de verdad, también usada por plan-generator.js) y solo
 * añade aquí lo que es específico de esta vista: usageCost por ingrediente
 * (dato secundario, nunca el total de la lista) y en qué comidas aparece.
 *
 * @param {object[]} meals - salida de generateDietPlan().meals
 * @returns {{name:string, requiredGrams:number, usageCost:number, meals:string[]}[]}
 */
function aggregateIngredientUsage(meals) {
  var base = aggregateMealItems(meals);

  var usageCostByName = {};
  var mealsByName = {};
  (meals || []).forEach(function (meal) {
    (meal.items || []).forEach(function (item) {
      usageCostByName[item.name] = (usageCostByName[item.name] || 0) + item.cost;
      if (!mealsByName[item.name]) mealsByName[item.name] = [];
      if (mealsByName[item.name].indexOf(meal.label) === -1) mealsByName[item.name].push(meal.label);
    });
  });

  return base.map(function (entry) {
    return {
      name: entry.name,
      requiredGrams: entry.requiredGrams,
      usageCost: usageCostByName[entry.name] || 0,
      meals: mealsByName[entry.name] || []
    };
  });
}

/**
 * Construye la lista de la compra final: para cada ingrediente ya
 * agregado (cantidad total requerida entre todas las tomas), resuelve
 * cuántos paquetes/unidades enteras hay que comprar y su coste real —
 * vía computeDayPurchaseCost() (js/core/budget.js), la MISMA función que
 * plan-generator.js usa para decidir si el plan cabe en presupuesto, así
 * que el total de esta lista y el coste de compra que aceptó el plan son
 * siempre el mismo número, nunca dos cálculos que puedan divergir.
 *
 * @param {object[]} meals
 * @param {string} [storeId]
 * @returns {{name:string, requiredGrams:number, usageCost:number, meals:string[], purchase:object}[]}
 */
function buildShoppingItems(meals, storeId) {
  var usage = aggregateIngredientUsage(meals);
  var dayPurchase = (typeof computeDayPurchaseCost === "function")
    ? computeDayPurchaseCost(meals, storeId)
    : { lines: [] };

  var lineByName = {};
  dayPurchase.lines.forEach(function (line) { lineByName[line.name] = line; });

  return usage
    .map(function (entry) {
      entry.purchase = lineByName[entry.name] || {
        requiredGrams: entry.requiredGrams, usageCost: entry.usageCost, purchaseCost: entry.usageCost,
        hasFixedPackage: false, packagesToBuy: null, packageSizeG: null, packageLabel: null,
        coveredFromPantry: 0, stillNeeded: entry.requiredGrams
      };
      return entry;
    })
    .sort(function (a, b) { return b.purchase.purchaseCost - a.purchase.purchaseCost; });
}

/**
 * Pinta la lista de la compra a partir de las comidas del plan ya
 * generado. El total mostrado es SIEMPRE la suma de purchaseCost (coste
 * real de comprar los paquetes/unidades enteros necesarios), nunca la
 * suma de usageCost. Oculta el panel si no hay ningún ingrediente.
 *
 * @param {object[]} meals - salida de generateDietPlan().meals
 * @param {string} [storeId] - por defecto DEFAULT_STORE_ID (pricing.js)
 */
function renderShoppingList(meals, storeId) {
  if (!shoppingPanel || !shoppingListContainer) return;

  var items = buildShoppingItems(meals || [], storeId);

  if (items.length === 0) {
    shoppingPanel.hidden = true;
    return;
  }

  shoppingPanel.hidden = false;

  var totalPurchaseCost = items.reduce(function (sum, i) { return sum + i.purchase.purchaseCost; }, 0);
  var totalUsageCost = items.reduce(function (sum, i) { return sum + i.usageCost; }, 0);

  if (shoppingCountEl) shoppingCountEl.textContent = items.length;

  if (shoppingSummaryEl) {
    shoppingSummaryEl.innerHTML =
      '<div class="shopping-summary__stat"><span>Productos</span><strong>' + items.length + '</strong></div>' +
      '<div class="shopping-summary__stat"><span>Coste de compra</span><strong>&euro;' + round2(totalPurchaseCost) + '</strong></div>' +
      '<div class="shopping-summary__stat shopping-summary__stat--muted"><span>Coste de uso</span><strong>&euro;' + round2(totalUsageCost) + '</strong></div>';
  }

  shoppingListContainer.innerHTML = items.map(renderShoppingRow).join("");
}

/**
 * Genera el HTML de una línea de la lista de la compra. Muestra, por
 * separado y con etiqueta explícita:
 *   - cuánto se USA realmente (mismo dato que la tarjeta de comida)
 *   - qué hay que COMPRAR (paquetes/unidades enteras, o "al peso" si el
 *     ingrediente no tiene envase fijo conocido)
 *   - el coste de COMPRA (purchaseCost), como precio principal de la fila
 *
 * @param {{name:string, requiredGrams:number, usageCost:number, meals:string[], purchase:object}} entry
 * @returns {string}
 */
function renderShoppingRow(entry) {
  var p = entry.purchase;
  var usedText = "Usado: " + round0(entry.requiredGrams) + " g";

  var buyText;
  if (typeof p.packagesToBuy === "number" && p.packagesToBuy === 0) {
    // Cubierto por completo por la despensa (pantry.js) — no hace falta
    // comprar nada de este ingrediente hoy.
    buyText = "Ya tienes suficiente en tu despensa";
  } else if (p.hasFixedPackage) {
    var label = p.packageLabel ? escapeHtml(p.packageLabel) : "envase";
    buyText = "Comprar: " + p.packagesToBuy + " &times; " + label + " (" + round0(p.packageSizeG) + "g)";
  } else {
    buyText = "Se compra al peso &mdash; sin envase fijo";
  }

  // Nota de despensa: solo aparece cuando pantry.js está cargado Y cubre
  // parte (o todo) de este ingrediente — invisible/sin cambio alguno
  // cuando no hay despensa activa.
  var pantryNote = (typeof p.coveredFromPantry === "number" && p.coveredFromPantry > 0)
    ? '<div class="shopping-item__pantry">Ya en tu despensa: ' + round0(p.coveredFromPantry) + ' g</div>'
    : '';

  return (
    '<li class="shopping-item">' +
      '<span class="shopping-item__check" aria-hidden="true"></span>' +
      '<div class="shopping-item__main">' +
        '<div class="shopping-item__name">' + escapeHtml(entry.name) + '</div>' +
        '<div class="shopping-item__meta">' + escapeHtml(usedText) + '</div>' +
        pantryNote +
        '<div class="shopping-item__buy">' + buyText + '</div>' +
      '</div>' +
      '<div class="shopping-item__price">' +
        '&euro;' + round2(p.purchaseCost) +
        (Math.abs(p.purchaseCost - entry.usageCost) > 0.005
          ? '<span class="shopping-item__usage-price">Coste de uso: &euro;' + round2(entry.usageCost) + '</span>'
          : '') +
      '</div>' +
    '</li>'
  );
}
