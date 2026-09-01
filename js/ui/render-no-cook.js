/**
 * js/ui/render-no-cook.js
 * ─────────────────────────────────────────────────────────────────────────
 * Renderiza el resultado del modo "Sin cocinar" (js/engine/no-cook-
 * generator.js). Independiente del render.js del plan normal — no hay
 * macros que ajustar ni presupuesto que verificar, solo mostrar qué
 * productos reales comprar y en qué unidad natural consumirlos.
 *
 * Depende de:
 *   js/core/utils.js              (round0, round1, round2, escapeHtml)
 *   js/engine/no-cook-generator.js (generateNoCookPlan)
 *
 * Inicialización obligatoria:
 *   Llamar a initNoCookRefs(refs) desde js/app.js antes de usar.
 *
 * Expone (globales):
 *   initNoCookRefs(refs)
 *   runNoCookGenerator(storeId)  – genera un plan nuevo y lo pinta
 * ─────────────────────────────────────────────────────────────────────────
 */

var noCookResults, noCookCount, noCookStatus;

// Último plan generado, tal cual (plan.slots) -- js/app.js lo lee para
// "Confirmar plan sin cocinar" (2026-08-20f, known issue #9), mismo
// patrón que lastGeneratedMeals para el plan normal, salvo que ese vive
// en app.js (ahí es donde se llama a generateDietPlan()) mientras que
// aquí es este módulo el que llama a generateNoCookPlan().
var lastNoCookSlots = null;

// Tienda del último plan generado (2026-08-24, selector de tienda) --
// mismo motivo que lastNoCookSlots: app.js necesita saber con qué
// tienda se generó para guardar la entrada con el store correcto (ver
// saveNoCookPlanForToday, pantry.js).
var lastNoCookStore = null;

var LEVEL_LABEL = {
  0: "Listo para comer",
  1: "Preparación mínima",
  2: "Calentar rápido",
};
var LEVEL_CLASS = { 0: "nocook-level--0", 1: "nocook-level--1", 2: "nocook-level--2" };

/**
 * Conecta los nodos DOM necesarios para este módulo.
 * @param {object} refs
 * @param {HTMLElement} refs.noCookResults
 * @param {HTMLElement} [refs.noCookCount]
 * @param {HTMLElement} [refs.noCookStatus]
 */
function initNoCookRefs(refs) {
  noCookResults = refs.noCookResults;
  noCookCount = refs.noCookCount;
  noCookStatus = refs.noCookStatus;
}

/**
 * Genera un plan "sin cocinar" nuevo y lo pinta. Pensado para colgarse
 * directamente del listener del botón "Sin cocinar".
 * @param {string} [storeId] - tienda activa (2026-08-24, selector de
 *   tienda) -- por defecto DEFAULT_STORE_ID dentro de
 *   generateNoCookPlan()/getNoCookEligiblePool() si se omite.
 */
function runNoCookGenerator(storeId, options) {
  if (!noCookResults || typeof generateNoCookPlan !== "function") return;

  var plan = generateNoCookPlan(storeId, options);
  lastNoCookStore = storeId || null;

  // Mismo cálculo de horario que el plan normal (js/core/meal-schedule.js)
  // — reutilizado, no reimplementado. Aislado con su propio try/catch (en
  // vez de depender solo del safeInit de app.js que envuelve a esta
  // función entera) para que un fallo aquí solo deje el plan sin horario,
  // nunca sin platos.
  if (typeof computeMealSchedule === "function" && typeof readScheduleSettings === "function") {
    try {
      plan.slots = computeMealSchedule(plan.slots, readScheduleSettings());
    } catch (err) {
      console.error("[render-no-cook:schedule] no se pudo calcular el horario -- se muestra sin horario:", err);
    }
  }

  if (noCookCount) noCookCount.textContent = plan.poolSize;
  if (noCookStatus) noCookStatus.textContent = "Plan sin cocinar generado.";

  // Aviso honesto sobre la línea de alérgenos de cada producto: solo se
  // muestra cuando la etiqueta de Mercadona lo declara, y que NO aparezca
  // no quiere decir que el producto esté libre de ese alérgeno. Se
  // enseña solo si el módulo de alérgenos está cargado.
  var allergenNote = (typeof renderAllergenLine === "function")
    ? '<p class="nocook-disclaimer">Los alérgenos que se muestran vienen de la ' +
      'etiqueta de Mercadona. Que no aparezcan <strong>no</strong> significa ' +
      'que el producto no los lleve — comprueba siempre el envase.</p>'
    : "";

  noCookResults.innerHTML =
    renderNoCookSummary(plan) + allergenNote + plan.slots.map(renderNoCookSlot).join("");
  lastNoCookSlots = plan.slots;
}

/**
 * Resumen del día: lo que suma de verdad frente a lo que se pedía.
 *
 * Incluye a propósito DOS cifras de dinero distintas, porque significan
 * cosas distintas y confundirlas fue parte del problema:
 *   - "hoy comes"  el valor de las raciones que te comes hoy. Es lo que se
 *                  compara con el presupuesto diario.
 *   - "la compra"  el ticket: envases completos. Lo que sobra no se tira,
 *                  se queda en la despensa para días siguientes.
 *
 * Y avisa cuando la proteína se queda corta en vez de disimularlo: comida
 * lista para comer rinde ~0,11 g de proteína por kcal, así que un objetivo
 * alto sencillamente no se alcanza sin cocinar (ver la nota en
 * no-cook-generator.js). Decirlo es más útil que fingir que se cumple.
 *
 * @param {object} plan - salida de generateNoCookPlan()
 * @returns {string}
 */
function renderNoCookSummary(plan) {
  if (!plan || !plan.total) return "";
  var t = plan.total;
  var target = plan.target || {};

  var kcalLine = round0(t.kcal) + " kcal"
    + (target.kcal ? ' <span class="nocook-summary__target">de ' + round0(target.kcal) + "</span>" : "");

  var proteinLine = round0(t.protein) + " g proteína"
    + (target.protein ? ' <span class="nocook-summary__target">de ' + round0(target.protein) + "</span>" : "");

  var stats =
    '<div class="nocook-summary__row"><strong>' + kcalLine + "</strong></div>" +
    '<div class="nocook-summary__row">' + proteinLine + "</div>" +
    '<div class="nocook-summary__row">Hoy comes <strong>&euro;' + round2(plan.consumedCost || 0) +
      '</strong> &middot; la compra son <strong>&euro;' + round2(plan.shoppingCost || 0) +
      "</strong> en " + plan.productCount +
      " productos (lo que sobre queda en la despensa)</div>";

  var warn = "";
  if (target.protein && t.protein < target.protein * 0.85) {
    warn = '<p class="nocook-summary__warn">Este plan se queda en ' + round0(t.protein) +
      " g de proteína, por debajo de tus " + round0(target.protein) + " g. " +
      "Sin cocinar es un techo real: los productos listos para comer rinden poca " +
      "proteína por caloría. Para llegar más arriba hace falta cocinar.</p>";
  }

  return '<div class="nocook-summary">' + stats + warn + "</div>";
}

/**
 * Genera el HTML de una toma completa (Desayuno/Comida/Snack/Cena).
 * @param {{key:string, label:string, items:object[]}} slot
 * @returns {string}
 */
function renderNoCookSlot(slot) {
  var timeBadge = typeof renderMealTimeBadge === "function" ? renderMealTimeBadge(slot) : "";

  // Nombre de la plantilla ("Wrap", "Plato preparado"): dice de un vistazo
  // QUÉ es la comida, no solo qué productos la componen.
  var kind = slot.templateLabel
    ? '<span class="nocook-slot__kind">' + escapeHtml(slot.templateLabel) + "</span>" : "";

  var kcal = (slot.total && slot.total.kcal)
    ? '<span class="nocook-slot__kcal">' + round0(slot.total.kcal) + " kcal</span>" : "";

  // Cómo se monta, en una línea. Es la diferencia entre una lista de la
  // compra y una comida: el usuario pidió "haz un sándwich y vete".
  var assembly = slot.assembly
    ? '<p class="nocook-slot__assembly">' + escapeHtml(slot.assembly) + "</p>" : "";

  return (
    '<div class="nocook-slot">' +
      '<div class="nocook-slot__head">' + timeBadge + "<h3>" + escapeHtml(slot.label) + "</h3>" +
        kind + kcal +
      "</div>" +
      assembly +
      '<div class="nocook-items">' +
        slot.items.map(renderNoCookItem).join("") +
      "</div>" +
    "</div>"
  );
}

/**
 * Plural español de la unidad de consumo. Añadir una "s" a secas daba
 * "2 porcións" y "2 unidads"; las palabras agudas en -ón además pierden la
 * tilde al pluralizar (porción → porciones).
 *
 * @param {string} unit
 * @param {number} count
 * @returns {string}
 */
function pluralizeUnit(unit, count) {
  var u = String(unit || "ración");
  if (count === 1) return u;
  if (/ón$/.test(u)) return u.slice(0, -2) + "ones";   // porción → porciones
  if (/z$/.test(u)) return u.slice(0, -1) + "ces";     // (nuez → nueces)
  if (/[aeiouáéíóú]$/i.test(u)) return u + "s";        // lata → latas
  return u + "es";                                     // unidad → unidades
}

/**
 * Genera el HTML de un producto dentro de una toma.
 * Muestra: nivel de preparación, nombre/marca reales, unidad natural de
 * consumo, y el envase real (tamaño + precio) tal cual viene del
 * catálogo — nunca gramos inventados. Los macros solo se muestran si el
 * producto los tiene (no es obligatorio, ver cabecera del archivo).
 *
 * @param {object} item - salida de buildNoCookItem() en el generador
 * @returns {string}
 */
function renderNoCookItem(item) {
  var levelBadge =
    '<span class="nocook-level ' + (LEVEL_CLASS[item.level] || "") + '">' +
      escapeHtml(LEVEL_LABEL[item.level] || "") +
    "</span>";

  var packageLine = item.size != null && item.sizeUnit
    ? "Envase: " + item.size + item.sizeUnit + (item.price != null ? " &mdash; &euro;" + round2(item.price) : "")
    : (item.price != null ? "&euro;" + round2(item.price) : "");

  // Los macros son los de LO QUE TE COMES (raciones x gramos), no los de
  // 100 g del catálogo. Hasta 2026-09-01 se pintaban los de 100 g, así que
  // una pizza de 430 g decía "245 kcal" cuando son 1.054.
  var macrosLine = item.kcal != null
    ? '<div class="nocook-item__macros">' +
        round0(item.kcal) + " kcal &mdash; P " + round1(item.protein) + "g / C " + round1(item.carbs) + "g / G " + round1(item.fat) + "g" +
      "</div>"
    : "";

  var findBtn = typeof renderProductFindBtn === "function" ? renderProductFindBtn(item) : "";

  // Alérgenos de la etiqueta de Mercadona (js/core/allergens.js). Solo
  // informativo: "" cuando el producto no está en la tabla, sin afirmar
  // nada. NO filtra el plan -- ver la cabecera de allergens.js.
  var allergenLine = typeof renderAllergenLine === "function" ? renderAllergenLine(item) : "";

  // Cantidad real: "2 raciones · 140 g". Antes decía solo "1 ración", que
  // era una etiqueta sin cantidad detrás.
  var servings = (typeof item.servings === "number") ? item.servings : item.quantity;
  var qtyText = servings + " " + escapeHtml(pluralizeUnit(item.unit, servings));
  if (typeof item.grams === "number") qtyText += ' <span class="nocook-item__grams">&middot; ' + item.grams + " g</span>";

  // "Envase entero": para la pizza y compañía, avisa de que esa toma se
  // acaba el paquete. Es lo que el usuario pidió explícitamente en vez de
  // ir dejando medias raciones sueltas.
  var wholeBadge = item.wholePackage && item.policy === "fresh"
    ? '<span class="nocook-item__whole">Envase entero</span>' : "";

  return (
    '<div class="nocook-item">' +
      levelBadge + wholeBadge +
      '<div class="nocook-item__name">' + escapeHtml(item.name) + findBtn + "</div>" +
      (item.brand ? '<div class="nocook-item__brand">' + escapeHtml(item.brand) + "</div>" : "") +
      '<div class="nocook-item__qty">' + qtyText + "</div>" +
      macrosLine +
      '<div class="nocook-item__package">' + packageLine + "</div>" +
      allergenLine +
    "</div>"
  );
}
