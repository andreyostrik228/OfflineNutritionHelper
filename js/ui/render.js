/**
 * js/ui/render.js
 * ─────────────────────────────────────────────────────────────────────────
 * Capa de presentación: dibuja en el DOM las tarjetas de resumen de macros
 * y las tarjetas de cada toma del día.
 *
 * Depende de:
 *   js/core/utils.js        (round0, round1, round2, escapeHtml)
 *   js/core/meal-helpers.js (getMealTotals)
 *   js/core/pricing.js      (normalizeIngredientKey)
 *   js/data/packaging.js    (PACKAGING_INFO) — opcional; si no está
 *                            cargado, se muestra todo en gramos como antes.
 *
 * Inicialización obligatoria:
 *   Llamar a initRenderRefs(refs) desde js/app.js antes de cualquier render.
 *
 * Expone (globales):
 *   initRenderRefs(refs)      – conecta las referencias DOM
 *   renderSummary(profile, total) – actualiza las 4 tarjetas de macros
 *   renderMeals(meals)            – construye las tarjetas de cada toma
 * ─────────────────────────────────────────────────────────────────────────
 */

// Referencias al DOM — se rellenan desde app.js mediante initRenderRefs().
// Se declaran aquí como let de módulo para que renderSummary y renderMeals
// las vean sin necesidad de recibirlas como parámetros en cada llamada.
var mealsContainer, summaryEls;

/**
 * Conecta las referencias a los nodos DOM necesarios para este módulo.
 * Debe llamarse una sola vez al inicio, antes de cualquier render.
 *
 * @param {object} refs
 * @param {HTMLElement} refs.mealsContainer  – contenedor del grid de comidas
 * @param {HTMLElement} refs.summaryEls      – objeto con referencias a las
 *                                             tarjetas de resumen de macros
 */
function initRenderRefs(refs) {
  mealsContainer = refs.mealsContainer;
  summaryEls     = refs.summaryEls;
}

// ── Resumen de macros ─────────────────────────────────────────────────────

/**
 * Actualiza las 4 tarjetas del resumen de macros (objetivo vs. plan real).
 *
 * @param {object} profile  – salida de calculateProfile()
 * @param {object} total    – salida de sumMeals() (totales del plan generado)
 */
function renderSummary(profile, total) {
  summaryEls.calories.textContent    = round0(profile.calories) + " kcal";
  summaryEls.caloriesSub.textContent = "Real plan: " + round0(total.kcal) + " kcal";

  summaryEls.protein.textContent    = round0(profile.protein) + " g";
  summaryEls.proteinSub.textContent = "Real plan: " + round0(total.protein) + " g";

  summaryEls.carbs.textContent    = round0(profile.carbs) + " g";
  summaryEls.carbsSub.textContent = "Real plan: " + round0(total.carbs) + " g";

  summaryEls.fats.textContent    = round0(profile.fats) + " g";
  summaryEls.fatsSub.textContent = "Real plan: " + round0(total.fat) + " g";
}

// ── Tarjetas de comidas ───────────────────────────────────────────────────

/**
 * Construye el HTML completo del grid de comidas y lo inserta en el DOM.
 * Cada toma genera una tarjeta con: nombre del plato, lista de ingredientes
 * con macros, y un footer con los totales de la toma.
 *
 * @param {object[]} meals  – array de objetos meal (salida de generateDietPlan)
 */
function renderMeals(meals) {
  mealsContainer.innerHTML = meals.map(function (meal) {
    var total = getMealTotals(meal);
    return renderMealCard(meal, total);
  }).join("");
}

/**
 * Genera el HTML de una tarjeta individual de toma.
 * @param {object} meal
 * @param {object} total  – { kcal, protein, carbs, fat, cost }
 * @returns {string}
 */
function renderMealCard(meal, total) {
  return (
    '<div class="meal-card">' +
      '<div class="meal-head">' +
        '<h3>' + escapeHtml(meal.label) + '</h3>' +
        '<div class="meal-kcal">' + round0(total.kcal) + ' kcal</div>' +
      '</div>' +
      '<div class="meal-body">' +
        '<div class="meal-items">' +
          meal.items.map(renderFoodRow).join("") +
        '</div>' +
        renderMealFooter(total, meal.prep) +
      '</div>' +
    '</div>'
  );
}

/**
 * Genera el HTML de una fila de ingrediente dentro de una tarjeta.
 * @param {object} item  – { name, grams, protein, carbs, fat, kcal, cost }
 * @returns {string}
 */
function renderFoodRow(item) {
  var info = lookupPackagingInfo(item.name);
  var realMatch = lookupRealMatch(item.name);

  return (
    '<div class="food-row">' +
      '<div class="food-main">' +
        '<div class="food-name">' + escapeHtml(item.name) + '</div>' +
        '<div class="food-meta">' +
          formatQuantityPhrase(item.grams, info) +
          ' &mdash; P ' + round1(item.protein) + ' g' +
          ' / C ' + round1(item.carbs) + ' g' +
          ' / G ' + round1(item.fat) + ' g' +
        '</div>' +
        formatPurchaseLine(item.grams, info, realMatch) +
      '</div>' +
      '<div class="food-right">' +
        '<div>' + round0(item.kcal) + ' kcal</div>' +
        '<div>&euro;' + round2(item.cost) + '</div>' +
      '</div>' +
    '</div>'
  );
}

/**
 * Busca cómo se compra/mide un ingrediente (js/data/packaging.js).
 * Devuelve null si el archivo no está cargado o el ingrediente no está
 * en la tabla — en ambos casos renderFoodRow cae de vuelta a gramos.
 * @param {string} name
 * @returns {object|null}
 */
function lookupPackagingInfo(name) {
  if (typeof PACKAGING_INFO === "undefined" || typeof normalizeIngredientKey !== "function") {
    return null;
  }
  return PACKAGING_INFO[normalizeIngredientKey(name)] || null;
}

/**
 * Busca un producto real verificado por EAN para este ingrediente
 * (js/data/real-ingredient-matches.js) — solo ~12 de los 65 tienen uno,
 * curado a mano tras descartar matches de texto incorrectos (ver ese
 * archivo). Devuelve null si no está cargado o no hay match.
 * @param {string} name
 * @returns {object|null}
 */
function lookupRealMatch(name) {
  if (typeof REAL_INGREDIENT_MATCHES === "undefined" || typeof normalizeIngredientKey !== "function") {
    return null;
  }
  return REAL_INGREDIENT_MATCHES[normalizeIngredientKey(name)] || null;
}

/**
 * Redondea a incrementos de 0.5 y da un piso de 0.5 (nunca "0 cucharadas").
 * @param {number} value
 * @returns {number}
 */
function roundToHalf(value) {
  return Math.max(0.5, Math.round(value * 2) / 2);
}

/**
 * Formatea un número que ya viene en incrementos de 0.5 como fracción
 * legible en español: 0.5 → "1/2", 1 → "1", 1.5 → "1 y 1/2", etc.
 * @param {number} value
 * @returns {string}
 */
function formatHalfFraction(value) {
  var whole = Math.floor(value);
  var hasHalf = value - whole > 0;
  if (!hasHalf) return String(whole);
  if (whole === 0) return "1/2";
  return whole + " y 1/2";
}

/**
 * Añade "s" para plural — válido para todas las palabras de packaging.js
 * (todas terminan en vocal: huevo, plátano, cucharada...).
 * @param {string} word
 * @param {number} count
 * @returns {string}
 */
function pluralize(word, count) {
  // "1/2" es singular en español ("1/2 pepino", no "1/2 pepinos") — solo
  // se pluraliza a partir de más de 1 unidad entera.
  return count > 1 ? word + "s" : word;
}

/**
 * Genera la frase de cantidad para food-meta: gramos por defecto, o una
 * medida práctica (cucharadas/unidades) cuando packaging.js lo indica.
 * Los gramos reales siempre se muestran entre paréntesis para que los
 * macros de al lado sigan siendo verificables.
 *
 * @param {number} grams
 * @param {object|null} info – entrada de PACKAGING_INFO, o null
 * @returns {string}
 */
function formatQuantityPhrase(grams, info) {
  if (!info) {
    return round0(grams) + " g";
  }

  if (info.type === "spoonable") {
    var tbsp = grams / info.tablespoonG;
    if (tbsp >= 0.75) {
      var roundedTbsp = roundToHalf(tbsp);
      return "&asymp; " + formatHalfFraction(roundedTbsp) + " " + pluralize("cucharada", roundedTbsp) + " (" + round0(grams) + "g)";
    }
    var roundedTsp = roundToHalf(grams / info.teaspoonG);
    return "&asymp; " + formatHalfFraction(roundedTsp) + " " + pluralize("cucharadita", roundedTsp) + " (" + round0(grams) + "g)";
  }

  if (info.type === "perUnit") {
    var roundedUnits = roundToHalf(grams / info.gramsPerUnit);
    return "&asymp; " + formatHalfFraction(roundedUnits) + " " + pluralize(info.unitLabel, roundedUnits) + " (" + round0(grams) + "g)";
  }

  // fixedPackage: los gramos son la unidad correcta para lo que se USA
  // (el paquete que hay que COMPRAR se muestra aparte, en formatPurchaseLine).
  return round0(grams) + " g";
}

/**
 * Añade "s" al PRIMER token de una etiqueta de envase para pluralizarla
 * — suficiente para las etiquetas de packaging.js ("bote" → "botes",
 * "paquete (en crudo)" → "paquetes (en crudo)").
 * @param {string} label
 * @returns {string}
 */
function pluralizePackageLabel(label) {
  var parts = label.split(" ");
  parts[0] = parts[0] + "s";
  return parts.join(" ");
}

/**
 * Línea adicional bajo food-meta indicando qué envase comprar realmente
 * (bote, bolsa, lata...) para ingredientes de envase fijo o de cucharada.
 * Si hay un producto real verificado por EAN (js/data/real-ingredient-
 * matches.js) para este ingrediente, se muestra ESE producto y tamaño
 * reales en vez de la etiqueta genérica — con una insignia que lo marca
 * como verificado, para que se distinga claramente de una estimación.
 *
 * Si la cantidad usada supera un envase, dice cuántos hacen falta (ej.
 * 394g de sardinas en lata de 120g → "3x", no solo "de 120g", porque
 * comprar 3.3 latas no es real: se compran enteras).
 *
 * Vacía para ingredientes por unidad sin match real, o sin datos de
 * packaging (carne y pescado frescos, que sí se compran al peso real).
 *
 * @param {number} grams
 * @param {object|null} info
 * @param {object|null} realMatch – entrada de REAL_INGREDIENT_MATCHES
 * @returns {string}
 */
function formatPurchaseLine(grams, info, realMatch) {
  if (realMatch) {
    return formatRealMatchPurchaseLine(grams, realMatch);
  }

  if (!info || info.type === "perUnit") return "";
  if (!info.packageG || !info.packageLabel) return "";

  // Margen del 15% antes de redondear hacia arriba a un envase extra —
  // evita decir "2 botes" cuando en la práctica cabe holgado en 1.
  var packagesNeeded = Math.ceil((grams / info.packageG) - 0.15);
  if (packagesNeeded < 1) packagesNeeded = 1;

  var label = packagesNeeded > 1
    ? packagesNeeded + " " + pluralizePackageLabel(info.packageLabel) + " (" + round0(info.packageG) + "g cada uno)"
    : "1 " + info.packageLabel + " (" + round0(info.packageG) + "g)";

  return '<div class="food-purchase">Compra: ' + escapeHtml(label) + '</div>';
}

/**
 * Línea de compra cuando SÍ hay un producto real verificado por EAN.
 * @param {number} grams
 * @param {object} realMatch – entrada de REAL_INGREDIENT_MATCHES
 * @returns {string}
 */
function formatRealMatchPurchaseLine(grams, realMatch) {
  var badge = ' <span class="food-purchase__badge">verificado</span>';

  // Casos como "huevos enteros": se compran por unidades (docena/pack),
  // no tenemos un tamaño en gramos fiable para calcular cuántos packs.
  if (!realMatch.sizeG) {
    var packInfo = realMatch.units ? " (pack de " + realMatch.units + ")" : "";
    return '<div class="food-purchase">Compra: ' + escapeHtml(realMatch.productName) + packInfo + badge + '</div>';
  }

  var packagesNeeded = Math.ceil((grams / realMatch.sizeG) - 0.15);
  if (packagesNeeded < 1) packagesNeeded = 1;
  var quantityPrefix = packagesNeeded > 1 ? packagesNeeded + "x " : "";

  return (
    '<div class="food-purchase">Compra: ' + quantityPrefix + escapeHtml(realMatch.productName) +
    ' (' + round0(realMatch.sizeG) + 'g)' + badge + '</div>'
  );
}

/**
 * Genera el HTML del footer de una tarjeta de toma (5 columnas de totales).
 * @param {object} total  – { protein, carbs, fat, cost }
 * @param {number} prep   – minutos de preparación
 * @returns {string}
 */
function renderMealFooter(total, prep) {
  return (
    '<div class="meal-footer">' +
      '<div>Prote&iacute;na<strong>' + round0(total.protein) + ' g</strong></div>' +
      '<div>Carbs<strong>'           + round0(total.carbs)   + ' g</strong></div>' +
      '<div>Grasas<strong>'          + round0(total.fat)     + ' g</strong></div>' +
      '<div>Coste<strong>&euro;'     + round2(total.cost)    + '</strong></div>' +
      '<div>Prep<strong>'            + (prep || 0)           + ' min</strong></div>' +
    '</div>'
  );
}
