/**
 * js/ui/render.js
 * ─────────────────────────────────────────────────────────────────────────
 * Capa de presentación: dibuja en el DOM las tarjetas de resumen de macros
 * y las tarjetas de cada toma del día.
 *
 * Depende de:
 *   js/core/utils.js        (round0, round2, escapeHtml)
 *   js/core/meal-helpers.js (getMealTotals)
 *   js/core/pricing.js      (normalizeIngredientKey, resolvePurchaseCost,
 *                            DEFAULT_STORE_ID) — resolvePurchaseCost es la
 *                            ÚNICA fuente de verdad para "cuántos paquetes
 *                            hacen falta y cuánto cuestan" (misma función
 *                            que usan budget.js/la lista de la compra/el
 *                            recorte de presupuesto) — ver "Coste de uso
 *                            vs. de compra" abajo
 *   js/data/packaging.js    (PACKAGING_INFO) — opcional; si no está
 *                            cargado, se muestra todo en gramos como antes.
 *
 * ── Coste de uso vs. de compra, por ingrediente (2026-08-08b, corregido 2026-08-13b) ─
 * Cada fila de ingrediente en una tarjeta de comida mostraba SOLO su
 * usageCost (precio × gramos usados) — nunca lo que ese ingrediente suma a
 * la compra real de hoy (el paquete/unidad entero). Un usuario podía ver
 * "€0.30" junto a 100g de yogur sin saber que en caja va a pagar €3.00 por
 * el bote entero. renderFoodRow muestra AMBOS, con etiqueta explícita
 * ("consumo" / "Ng paquete") — nunca se sustituye uno por otro, ver la
 * distinción completa en la cabecera de js/core/pricing.js.
 *
 * **Bug real corregido 2026-08-13b** (reportado por el usuario con un
 * ejemplo real: Plátano 144g mostraba "€0.17 consumo" pero "€0.14
 * paquete" — consumo > paquete, matemáticamente imposible): la primera
 * versión de esto usaba `resolvePackageInfo().packagePrice`, que es el
 * precio de UN SOLO envase/unidad, no de los que hacen falta para cubrir
 * `item.grams`. Un plátano pesa ~120g de media; una toma escalada a 144g
 * necesita 2 plátanos (`packagesToBuy=2`), pero se mostraba el precio de
 * 1 solo. Ahora se usa `resolvePurchaseCost(item.name, item.grams,
 * storeId)` — la MISMA función autoritativa que ya usan
 * `computeDayPurchaseCost()` (budget.js), la lista de la compra y el
 * recorte de presupuesto — que ya calcula `packagesToBuy` y
 * `purchaseCost = packagesToBuy × packagePrice` correctamente. Por
 * construcción de esa función, `purchaseCost >= usageCost` SIEMPRE (nunca
 * hace falta comprar menos gramos de los que un paquete entero cubre), así
 * que esta inconsistencia ya no puede volver a ocurrir — no es una
 * corrección puntual del caso del plátano, es estructural. De paso, esto
 * elimina una SEGUNDA fuente del mismo bug: `formatPurchaseLine`/
 * `formatRealMatchPurchaseLine` recalculaban `packagesNeeded` con un
 * margen del 15% propio (una heurística de texto que nunca se sincronizó
 * con el cálculo estricto de `resolvePurchaseCost`) — ahora usan
 * `purchase.packagesToBuy` directamente, una sola fuente de verdad para
 * cantidad Y precio, nunca dos cálculos de paquetes que puedan divergir.
 *
 * ── Proteína/carbos/grasas por ingrediente (2026-08-13d) ──────────────────
 * La sesión 2026-08-13c había QUITADO el desglose P/C/G por ingrediente al
 * descubrir que era un reparto del total del PLATO por cuota de gramos, no
 * la composición real de cada ingrediente (bug real: "Plátano" mostrando
 * proteína/grasa del cacahuete de su mismo plato). Esa sesión posterior
 * (2026-08-13d) resolvió la causa de raíz — js/core/nutrition.js ahora da
 * kcal/protein/carbs/fat REALES por ingrediente cuando existe un producto
 * verificado (50/81 roles, js/data/ingredient-nutrition.js) — así que el
 * desglose vuelve a mostrarse, pero SOLO para los ingredientes con
 * `item.nutritionSource === 'real'`. Para los que no tienen dato
 * verificado (31/81 roles), se muestra un aviso explícito en vez de un
 * número — nunca se vuelve a mostrar un P/C/G fabricado. Ver cabecera de
 * js/core/nutrition.js para el modelo completo (remanente del plato
 * repartido solo entre los ingredientes sin resolver).
 *
 * Inicialización obligatoria:
 *   Llamar a initRenderRefs(refs) desde js/app.js antes de cualquier render.
 *
 * Expone (globales):
 *   initRenderRefs(refs)      – conecta las referencias DOM
 *   renderSummary(profile, total) – actualiza las 4 tarjetas de macros
 *   renderMeals(meals)            – un solo día (envuelve a renderDayPlans)
 *   renderDayPlans(days)          – N días como carrusel deslizable
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
  renderDayPlans([{ meals: meals }]);
}

/**
 * Pinta N días como diapositivas de un carrusel. Cada día es un plan
 * DISTINTO (el generador se llama una vez por día), no el mismo
 * multiplicado -- medido: 7 días dan 31 platos distintos de 35 huecos.
 *
 * Con un solo día se pinta una diapositiva sin cabecera ni puntos, así que
 * la vista de siempre no cambia. Las tarjetas llevan `data-day` para que el
 * botón "Cambiar" sepa a qué día pertenece la toma que re-tira.
 *
 * @param {{meals:object[]}[]} days
 */
function renderDayPlans(days) {
  if (!mealsContainer) return;
  var list = Array.isArray(days) ? days : [];
  var multi = list.length > 1;

  mealsContainer.classList.toggle("days-carousel__track--multi", multi);

  mealsContainer.innerHTML = list.map(function (day, index) {
    var cards = (day.meals || []).map(function (meal) {
      return renderMealCard(meal, getMealTotals(meal), index);
    }).join("");

    var head = multi
      ? '<div class="day-slide__head"><span class="day-slide__n">Día ' + (index + 1) +
        '</span><span class="day-slide__of">de ' + list.length + "</span></div>"
      : "";

    return '<section class="day-slide" data-day="' + index + '">' + head +
      '<div class="meals-grid">' + cards + "</div></section>";
  }).join("");
}

/**
 * Genera el HTML de una tarjeta individual de toma.
 * @param {object} meal
 * @param {object} total  – { kcal, protein, carbs, fat, cost }
 * @returns {string}
 */
/**
 * URL de la ficha de un producto en la tienda online de Mercadona, para
 * ver su FOTO y reconocerlo en el súper. Los `id` del catálogo son
 * numéricos (a veces con un sufijo de variante ".1"/".2" que la web
 * ignora); si por lo que sea no lo son, cae en una búsqueda por nombre.
 * @param {{id?:(string|number), name?:string, brand?:string}} product
 * @returns {string}
 */
function mercadonaProductUrl(product) {
  var id = product && product.id != null ? String(product.id) : "";
  var base = id.replace(/\.\d+$/, "");
  if (/^\d+$/.test(base)) return "https://tienda.mercadona.es/product/" + base;
  var q = ((product && product.name) || "") + " " + ((product && product.brand) || "");
  return "https://tienda.mercadona.es/search-results?query=" + encodeURIComponent(q.trim());
}

/**
 * Botón pequeño y APARTE (no un enlace en el nombre) que abre esa ficha en
 * una pestaña nueva. Es un `<a>` normal: no necesita JS ni handler, y la
 * app sigue siendo offline -- solo navega cuando lo pulsas tú.
 * @param {object} product
 * @returns {string}
 */
function renderProductFindBtn(product) {
  if (!product) return "";
  var name = (product.name || "producto");
  return '<a class="product-find-btn" target="_blank" rel="noopener noreferrer"' +
    ' href="' + escapeHtml(mercadonaProductUrl(product)) + '"' +
    ' title="Ver la foto y la ficha en Mercadona"' +
    ' aria-label="Ver ' + escapeHtml(name) + ' en Mercadona">' +
    '📷</a>';
}

function renderMealCard(meal, total, dayIndex) {
  // data-meal-key habilita el salto desde la franja de horario (ver
  // js/ui/render-schedule.js, scrollToMealCard) hasta esta tarjeta.
  var timeBadge = typeof renderMealTimeBadge === "function" ? renderMealTimeBadge(meal) : "";
  var cookNote  = typeof renderMealCookNote  === "function" ? renderMealCookNote(meal)  : "";
  var storeId = meal.store || (typeof DEFAULT_STORE_ID !== "undefined" ? DEFAULT_STORE_ID : "mercadona");

  return (
    '<div class="meal-card" data-meal-key="' + escapeHtml(meal.key || "") + '">' +
      '<div class="meal-head">' +
        '<div class="meal-head__title">' +
          timeBadge +
          '<h3>' + escapeHtml(meal.label) + '</h3>' +
        '</div>' +
        '<div class="meal-head__right">' +
          '<button type="button" class="meal-swap-btn" data-action="swap-plan-meal"' +
            ' data-meal-key="' + escapeHtml(meal.key || "") + '"' +
            ' data-day="' + (dayIndex || 0) + '"' +
            ' title="Cambiar solo esta toma por otra">&#8635; Cambiar</button>' +
          '<div class="meal-kcal">' + round0(total.kcal) + ' kcal</div>' +
        '</div>' +
      '</div>' +
      '<div class="meal-body">' +
        cookNote +
        '<div class="meal-items">' +
          meal.items.map(function (item) { return renderFoodRow(item, storeId); }).join("") +
        '</div>' +
        renderMealFooter(total, meal.prep) +
        renderCookingSteps(meal) +
      '</div>' +
    '</div>'
  );
}

/**
 * Pasos de elaboración, plegados dentro de un <details>.
 *
 * ── Por qué plegado y DEBAJO del footer ─────────────────────────────────
 * La tarjeta ya es densa (ingredientes, precios, macros por fila, footer
 * con el total). Siete pasos de texto desplegados por defecto empujarían
 * los macros fuera de la pantalla en móvil, y los macros son la razón por
 * la que existe esta app. Plegado: quien ya sabe cocinar no ve nada nuevo;
 * quien no sabe, lo abre. Nativo `<details>`, sin JS, así que funciona
 * igual con el teclado y con lector de pantalla.
 *
 * ── Por qué puede devolver cadena vacía ─────────────────────────────────
 * Durante el piloto solo 18 de 334 platos tienen instrucciones. Un plato
 * sin ellas se renderiza EXACTAMENTE como antes, sin hueco ni
 * desplegable vacío.
 *
 * @param {object} meal
 * @returns {string} HTML, o "" si el plato no tiene instrucciones
 */
function renderCookingSteps(meal) {
  if (typeof getDishInstructions !== "function") return "";

  var info = getDishInstructions(meal && meal.dishName);
  if (!info || !Array.isArray(info.steps) || !info.steps.length) return "";

  var difficultyLabel = { 1: "Fácil", 2: "Medio", 3: "Avanzado" }[info.difficulty] || "";

  // "ninguno" se muestra como una afirmación útil, no como una carencia:
  // es la respuesta directa a "no tengo el equipo".
  var equipment = Array.isArray(info.equipment) ? info.equipment : [];
  var equipmentLabel = (equipment.length === 1 && equipment[0] === "ninguno")
    ? "Sin cacharros: solo cuchillo y bol"
    : equipment.filter(function (e) { return e !== "ninguno"; })
        .map(function (e) { return EQUIPMENT_LABELS[e] || e; })
        .join(" · ");

  return (
    '<details class="meal-steps">' +
      '<summary class="meal-steps__summary">' +
        '<span class="meal-steps__toggle">Cómo se hace</span>' +
        (difficultyLabel
          ? '<span class="meal-steps__badge meal-steps__badge--d' + info.difficulty + '">' +
              escapeHtml(difficultyLabel) + '</span>'
          : "") +
      '</summary>' +
      (equipmentLabel
        ? '<p class="meal-steps__equipment">' + escapeHtml(equipmentLabel) + '</p>'
        : "") +
      '<ol class="meal-steps__list">' +
        info.steps.map(function (step) {
          return '<li>' + escapeHtml(step) + '</li>';
        }).join("") +
      '</ol>' +
    '</details>'
  );
}

/** Etiquetas legibles del vocabulario cerrado de equipo. */
var EQUIPMENT_LABELS = {
  tostadora: "Tostadora",
  microondas: "Microondas",
  sarten: "Sartén",
  olla: "Olla o cazo",
  horno: "Horno",
  batidora: "Batidora"
};

/**
 * Genera el HTML de una fila de ingrediente dentro de una tarjeta. Muestra,
 * por separado, cuánto se CONSUME (usageCost, item.cost) y cuánto cuesta
 * REALMENTE comprar lo necesario (purchaseCost, vía resolvePurchaseCost —
 * ya son los paquetes/unidades enteros que hacen falta para `item.grams`,
 * nunca el precio de un solo envase suelto) — ver cabecera del archivo.
 *
 * **Proteína/carbos/grasas por ingrediente (reintroducido 2026-08-13d,
 * ahora con datos reales)**: se habían quitado en la sesión anterior
 * porque eran un reparto del total del PLATO por cuota de gramos, no la
 * composición real del ingrediente (bug real: "Plátano" mostrando 11.5g
 * de proteína heredada del cacahuete de su mismo plato). Ahora
 * `item.nutritionSource` (`computeDishIngredientNutrition`,
 * js/core/nutrition.js) distingue los dos casos:
 *   - `'real'` — dato verificado por ingrediente (50/81 roles) — se
 *     muestra el desglose P/C/G normalmente, con una insignia "real" que
 *     lo distingue de una estimación.
 *   - `'estimated'` — sin dato verificado (31/81 roles) — el número
 *     interno sigue existiendo (es el remanente del plato, usado para que
 *     el TOTAL de la comida/día siga siendo correcto, ver
 *     getMealTotals/renderMealFooter) pero NO se muestra como si fuera un
 *     hecho verificado de ESE ingrediente — se muestra un aviso explícito
 *     en su lugar ("nutrition unavailable", pedido explícito del
 *     usuario: mejor eso que un número con apariencia de precisión que no
 *     tiene). kcal SÍ se muestra siempre (mismo criterio que la sesión
 *     anterior: es el macro menos propenso a parecer "imposible" a
 *     simple vista, y summa igual de bien).
 *
 * @param {object} item     – { name, grams, protein, carbs, fat, kcal, cost, nutritionSource }
 * @param {string} [storeId] – tienda activa del plan (meal.store)
 * @returns {string}
 */
function renderFoodRow(item, storeId) {
  var info = lookupPackagingInfo(item.name);
  var realMatch = lookupRealMatch(item.name);
  var purchase = (typeof resolvePurchaseCost === "function")
    ? resolvePurchaseCost(item.name, item.grams, storeId || (typeof DEFAULT_STORE_ID !== "undefined" ? DEFAULT_STORE_ID : "mercadona"))
    : null;
  var hasRealMacros = item.nutritionSource === "real";

  return (
    '<div class="food-row">' +
      '<div class="food-main">' +
        '<div class="food-name">' + escapeHtml(item.name) + '</div>' +
        '<div class="food-meta">' +
          formatQuantityPhrase(item.grams, info) +
          (hasRealMacros
            ? ' &mdash; P ' + round1(item.protein) + ' g / C ' + round1(item.carbs) + ' g / G ' + round1(item.fat) + ' g' +
              ' <span class="food-macro__badge" title="Nutrición verificada por ingrediente">real</span>'
            : ' <span class="food-macro__unavailable">macros por ingrediente no verificados</span>') +
        '</div>' +
        formatPurchaseLine(info, realMatch, purchase) +
      '</div>' +
      '<div class="food-right">' +
        '<div>' + round0(item.kcal) + ' kcal</div>' +
        '<div class="food-cost food-cost--usage">&euro;' + round2(item.cost) + '<span class="food-cost__tag">consumo</span></div>' +
        (purchase && purchase.hasFixedPackage
          ? '<div class="food-cost food-cost--package">&euro;' + round2(purchase.purchaseCost) + '<span class="food-cost__tag">' +
            (purchase.packagesToBuy > 1 ? purchase.packagesToBuy + '&times; ' : '') + round0(purchase.packageSizeG) + 'g paquete</span></div>'
          : '') +
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
 * El nº de paquetes y el precio vienen SIEMPRE de `purchase`
 * (resolvePurchaseCost(), pricing.js) — nunca se recalculan aquí con una
 * heurística de texto propia (ver "Bug real corregido 2026-08-13b" en la
 * cabecera del archivo: dos cálculos de paquetes independientes es
 * precisamente lo que causó que el precio mostrado no coincidiera con lo
 * que de verdad hacía falta comprar).
 *
 * @param {object|null} info – entrada de PACKAGING_INFO (solo para el
 *   tamaño/etiqueta cuando NO hay match real; el nº de paquetes y precio
 *   vienen de `purchase`, no de aquí)
 * @param {object|null} realMatch – entrada de REAL_INGREDIENT_MATCHES
 * @param {object|null} purchase – resultado de resolvePurchaseCost()
 *   (pricing.js) para los gramos de ESTA fila — fuente única de verdad de
 *   `packagesToBuy`/`purchaseCost`
 * @returns {string}
 */
function formatPurchaseLine(info, realMatch, purchase) {
  if (realMatch) {
    return formatRealMatchPurchaseLine(realMatch, purchase);
  }

  if (!info || info.type === "perUnit") return "";
  if (!purchase || !purchase.hasFixedPackage) return "";

  var label = purchase.packagesToBuy > 1
    ? purchase.packagesToBuy + " " + pluralizePackageLabel(purchase.packageLabel) + " (" + round0(purchase.packageSizeG) + "g cada uno)"
    : "1 " + purchase.packageLabel + " (" + round0(purchase.packageSizeG) + "g)";

  var priceNote = ' &middot; &euro;' + round2(purchase.purchaseCost);

  return '<div class="food-purchase">Compra: ' + escapeHtml(label) + priceNote + '</div>';
}

/**
 * Línea de compra cuando SÍ hay un producto real verificado por EAN.
 * @param {object} realMatch – entrada de REAL_INGREDIENT_MATCHES
 * @param {object|null} purchase – ver formatPurchaseLine()
 * @returns {string}
 */
function formatRealMatchPurchaseLine(realMatch, purchase) {
  var badge = ' <span class="food-purchase__badge">verificado</span>';

  // Casos como "huevos enteros": se compran por unidades (docena/pack),
  // no tenemos un tamaño en gramos fiable para calcular cuántos packs, así
  // que tampoco se anota un precio de paquete aquí (sería ambiguo a qué
  // unidad se refiere).
  if (!realMatch.sizeG) {
    var packInfo = realMatch.units ? " (pack de " + realMatch.units + ")" : "";
    return '<div class="food-purchase">Compra: ' + escapeHtml(realMatch.productName) + packInfo + badge + '</div>';
  }

  var packagesToBuy = (purchase && purchase.hasFixedPackage) ? purchase.packagesToBuy : 1;
  var quantityPrefix = packagesToBuy > 1 ? packagesToBuy + "x " : "";
  var priceNote = (purchase && typeof purchase.purchaseCost === "number")
    ? ' &middot; &euro;' + round2(purchase.purchaseCost)
    : '';

  return (
    '<div class="food-purchase">Compra: ' + quantityPrefix + escapeHtml(realMatch.productName) +
    ' (' + round0(realMatch.sizeG) + 'g)' + priceNote + badge + '</div>'
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
