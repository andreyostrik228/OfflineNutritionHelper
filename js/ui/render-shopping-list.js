/**
 * js/ui/render-shopping-list.js
 * ─────────────────────────────────────────────────────────────────────────
 * Lista de la compra del plan diario. Agrupa los `items` que ya están en
 * `result.meals` (mismo `name`/`grams` que ya se muestran en las tarjetas
 * de comida) por ingrediente, sumando gramos requeridos ENTRE TOMAS antes
 * de calcular nada de paquete/precio — así el mismo ingrediente usado en
 * desayuno y cena se compra una sola vez, no dos veces por separado.
 *
 * Coste mostrado: usa SIEMPRE purchaseCost (js/core/pricing.js,
 * resolvePurchaseCost), nunca usageCost — comprar un bote de miel de 250g
 * para usar 23g cuesta el bote entero, no una fracción proporcional. Ver
 * la cabecera de js/core/pricing.js para la distinción completa
 * usageCost/purchaseCost/data.budget.
 *
 * Es una vista de PRESENTACIÓN + agregación: no calcula nutrición, no
 * decide qué platos elegir, no toca dish-selector.js/plan-generator.js.
 * Solo llama a resolvePurchaseCost() (pricing.js) por ingrediente
 * agregado, la misma función que usa cualquier otra pieza de la app.
 *
 * Depende de:
 *   js/core/utils.js   (round0, round1, round2, escapeHtml)
 *   js/core/pricing.js (resolvePurchaseCost, DEFAULT_STORE_ID)
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
 * cena se convierte en UNA cantidad total ANTES de mirar ningún envase).
 * También suma usageCost solo para mostrarlo como dato secundario — nunca
 * para el total de la lista de la compra (ver cabecera del archivo).
 *
 * @param {object[]} meals - salida de generateDietPlan().meals
 * @returns {{name:string, requiredGrams:number, usageCost:number, meals:string[]}[]}
 */
function aggregateIngredientUsage(meals) {
  var byName = {};
  var order = [];

  meals.forEach(function (meal) {
    meal.items.forEach(function (item) {
      if (!byName[item.name]) {
        byName[item.name] = { name: item.name, requiredGrams: 0, usageCost: 0, meals: [] };
        order.push(item.name);
      }
      var entry = byName[item.name];
      entry.requiredGrams += item.grams;
      entry.usageCost += item.cost;
      if (entry.meals.indexOf(meal.label) === -1) entry.meals.push(meal.label);
    });
  });

  return order.map(function (name) { return byName[name]; });
}

/**
 * Construye la lista de la compra final: para cada ingrediente ya
 * agregado (cantidad total requerida entre todas las tomas), resuelve
 * cuántos paquetes/unidades enteras hay que comprar y su coste real
 * (resolvePurchaseCost, js/core/pricing.js) — nunca al revés (nunca se
 * calcula el paquete por comida y se suman paquetes de comidas distintas).
 *
 * @param {object[]} meals
 * @param {string} [storeId]
 * @returns {{name:string, requiredGrams:number, usageCost:number, meals:string[], purchase:object}[]}
 */
function buildShoppingItems(meals, storeId) {
  var store = storeId || (typeof DEFAULT_STORE_ID !== "undefined" ? DEFAULT_STORE_ID : undefined);

  return aggregateIngredientUsage(meals)
    .map(function (entry) {
      var purchase = (typeof resolvePurchaseCost === "function")
        ? resolvePurchaseCost(entry.name, entry.requiredGrams, store)
        : { usageCost: entry.usageCost, purchaseCost: entry.usageCost, hasFixedPackage: false, packagesToBuy: null, packageSizeG: null, packageLabel: null };

      entry.purchase = purchase;
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
  if (p.hasFixedPackage) {
    var label = p.packageLabel ? escapeHtml(p.packageLabel) : "envase";
    buyText = "Comprar: " + p.packagesToBuy + " &times; " + label + " (" + round0(p.packageSizeG) + "g)";
  } else {
    buyText = "Se compra al peso &mdash; sin envase fijo";
  }

  return (
    '<li class="shopping-item">' +
      '<span class="shopping-item__check" aria-hidden="true"></span>' +
      '<div class="shopping-item__main">' +
        '<div class="shopping-item__name">' + escapeHtml(entry.name) + '</div>' +
        '<div class="shopping-item__meta">' + escapeHtml(usedText) + '</div>' +
        '<div class="shopping-item__buy">' + buyText + '</div>' +
      '</div>' +
      '<div class="shopping-item__price">' +
        '&euro;' + round2(p.purchaseCost) +
        (p.hasFixedPackage && Math.abs(p.purchaseCost - entry.usageCost) > 0.005
          ? '<span class="shopping-item__usage-price">uso: &euro;' + round2(entry.usageCost) + '</span>'
          : '') +
      '</div>' +
    '</li>'
  );
}
