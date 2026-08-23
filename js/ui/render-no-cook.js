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
function runNoCookGenerator(storeId) {
  if (!noCookResults || typeof generateNoCookPlan !== "function") return;

  var plan = generateNoCookPlan(storeId);
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

  noCookResults.innerHTML = plan.slots.map(renderNoCookSlot).join("");
  lastNoCookSlots = plan.slots;
}

/**
 * Genera el HTML de una toma completa (Desayuno/Comida/Snack/Cena).
 * @param {{key:string, label:string, items:object[]}} slot
 * @returns {string}
 */
function renderNoCookSlot(slot) {
  var timeBadge = typeof renderMealTimeBadge === "function" ? renderMealTimeBadge(slot) : "";
  return (
    '<div class="nocook-slot">' +
      '<div class="nocook-slot__head">' + timeBadge + "<h3>" + escapeHtml(slot.label) + "</h3></div>" +
      '<div class="nocook-items">' +
        slot.items.map(renderNoCookItem).join("") +
      "</div>" +
    "</div>"
  );
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

  var macrosLine = item.kcal != null
    ? '<div class="nocook-item__macros">' +
        round0(item.kcal) + " kcal &mdash; P " + round1(item.protein) + "g / C " + round1(item.carbs) + "g / G " + round1(item.fat) + "g" +
      "</div>"
    : "";

  return (
    '<div class="nocook-item">' +
      levelBadge +
      '<div class="nocook-item__name">' + escapeHtml(item.name) + "</div>" +
      (item.brand ? '<div class="nocook-item__brand">' + escapeHtml(item.brand) + "</div>" : "") +
      '<div class="nocook-item__qty">' + item.quantity + " " + escapeHtml(item.unit) + "</div>" +
      macrosLine +
      '<div class="nocook-item__package">' + packageLine + "</div>" +
    "</div>"
  );
}
