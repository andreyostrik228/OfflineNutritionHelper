/**
 * js/ui/render-pantry.js
 * ─────────────────────────────────────────────────────────────────────────
 * Capa de presentación de la despensa: pinta el stock actual, el control
 * de alta manual, y el historial de planes guardados — cada entrada del
 * historial muestra su lista de verificación de compra (Etapa 2) y un
 * control de "cocinado" por cada comida (Etapa 3). Toda la lógica real
 * vive en js/core/pantry.js — este archivo solo construye HTML y delega
 * eventos, igual que render.js / render-shopping-list.js hacen para sus
 * paneles.
 *
 * La lista de verificación de compra es un toggle puramente visual
 * (aria-checked) hasta que se pulsa "Marcar compra como hecha" — en ese
 * momento se lee qué filas siguen marcadas y se llama a
 * markPurchaseDone() con los nombres de las DESMARCADAS como exclusión.
 *
 * El selector de "añadir a despensa" (alta manual) usa una lista cerrada
 * de nombres de ingrediente (los de DISH_DB, deduplicados) en vez de
 * texto libre — un nombre mal escrito o sin acentos crearía una clave de
 * despensa huérfana que ningún plan futuro llegaría a igualar nunca (ver
 * normalizeIngredientKey, pricing.js).
 *
 * Depende de:
 *   js/core/pantry.js (getPantryState, listPantryEntries, setStock,
 *                       adjustStock, clearStock, getPantryHistory,
 *                       aggregatePlanMealItems, markPurchaseDone,
 *                       markMealCooked)
 *   js/core/utils.js  (round0, round2, escapeHtml)
 *   js/data/dishes.js (DISH_DB) — solo para poblar el selector de alta
 *
 * Inicialización obligatoria:
 *   Llamar a initPantryRefs(refs) desde js/app.js antes de usar.
 *
 * Expone (globales):
 *   initPantryRefs(refs)
 *   renderPantryPanel()
 *   renderPlanSavedNotice(entry, historySaved)
 * ─────────────────────────────────────────────────────────────────────────
 */

var pantryListContainer, pantryEmptyEl, pantryAddSelect, pantryAddGrams, pantryAddBtn,
    pantryHistoryContainer, pantryHistoryEmptyEl, pantryCountEl, planSavedNoticeEl;
var pantryOnChange; // callback de app.js — sincroniza la lista de la compra visible

/**
 * Conecta los nodos DOM necesarios para este módulo.
 * @param {object} refs
 * @param {function} [refs.onPantryChange] - se llama tras cualquier mutación
 *   de la despensa (alta manual/ajuste/vaciado, compra, cocinado...), para
 *   que app.js pueda refrescar una lista de la compra visible cuyos
 *   números "ya en despensa" habrían quedado desactualizados.
 */
function initPantryRefs(refs) {
  pantryListContainer    = refs.pantryListContainer;
  pantryEmptyEl          = refs.pantryEmptyEl;
  pantryAddSelect        = refs.pantryAddSelect;
  pantryAddGrams         = refs.pantryAddGrams;
  pantryAddBtn           = refs.pantryAddBtn;
  pantryHistoryContainer = refs.pantryHistoryContainer;
  pantryHistoryEmptyEl   = refs.pantryHistoryEmptyEl;
  pantryCountEl          = refs.pantryCountEl;
  planSavedNoticeEl      = refs.planSavedNoticeEl;
  pantryOnChange         = typeof refs.onPantryChange === "function" ? refs.onPantryChange : function () {};

  populatePantryAddSelect();

  if (pantryAddBtn)  pantryAddBtn.addEventListener("click", handleManualAdd);
  // Delegación de eventos: la lista se reconstruye entera en cada render,
  // así que los listeners van en el contenedor fijo, no en cada fila.
  if (pantryListContainer)    pantryListContainer.addEventListener("click", handlePantryListClick);
  if (pantryHistoryContainer) pantryHistoryContainer.addEventListener("click", handleHistoryClick);
}

// ── Selector de alta manual ───────────────────────────────────────────────

/**
 * Rellena el <select> de "añadir a despensa" con los nombres de
 * ingrediente que aparecen en DISH_DB, deduplicados por clave normalizada
 * y ordenados alfabéticamente — el mismo universo de nombres que la
 * despensa puede llegar a descontar de un plan real.
 */
function populatePantryAddSelect() {
  if (!pantryAddSelect || typeof DISH_DB === "undefined" || typeof normalizeIngredientKey !== "function") return;

  var seen = {};
  var names = [];
  DISH_DB.forEach(function (dish) {
    (dish.items || []).forEach(function (ingredient) {
      var key = normalizeIngredientKey(ingredient.name);
      if (!seen[key]) {
        seen[key] = true;
        names.push(ingredient.name);
      }
    });
  });
  names.sort(function (a, b) { return a.localeCompare(b, "es"); });

  pantryAddSelect.innerHTML = names.map(function (name) {
    return '<option value="' + escapeHtml(name) + '">' + escapeHtml(name) + '</option>';
  }).join("");
}

function handleManualAdd() {
  if (!pantryAddSelect || !pantryAddGrams) return;
  try {
    var name = pantryAddSelect.value;
    var grams = parseFloat(pantryAddGrams.value);
    if (!name || !isFinite(grams) || grams <= 0) return;

    adjustStock(name, grams);
    pantryAddGrams.value = "";
    renderPantryPanel();
    pantryOnChange();
  } catch (err) {
    console.error("[render-pantry:add] no se pudo añadir el ingrediente:", err);
  }
}

// ── Lista de despensa ──────────────────────────────────────────────────────

/**
 * Aplica renderRowFn a cada elemento, pero AISLADO uno de otro: si una
 * fila concreta lanza al pintarse (forma inesperada que pasó las
 * validaciones de pantry.js pero aún así rompe el HTML de esa fila
 * específica), esa fila se omite y se registra en consola -- el resto de
 * filas, perfectamente sanas, se siguen pintando con normalidad. Sin
 * esto, un solo elemento problemático dejaría toda la lista en blanco.
 * @param {object[]} items
 * @param {function(object):string} renderRowFn
 * @param {string} label - para el mensaje de consola si algo falla
 * @returns {string}
 */
function safeRenderRows(items, renderRowFn, label) {
  var html = "";
  (items || []).forEach(function (item) {
    try {
      html += renderRowFn(item);
    } catch (err) {
      console.error("[render-pantry:" + label + "] se omitió una fila que no se pudo pintar:", err, item);
    }
  });
  return html;
}

/**
 * Pinta el estado actual de la despensa y el contador del badge del panel.
 * Se llama tanto al iniciar la app (la despensa persiste independientemente
 * de cualquier plan generado) como tras cualquier mutación.
 */
function renderPantryPanel() {
  if (!pantryListContainer) return;

  var entries = listPantryEntries();

  if (pantryCountEl) pantryCountEl.textContent = entries.length;

  if (entries.length === 0) {
    pantryListContainer.innerHTML = "";
    if (pantryEmptyEl) pantryEmptyEl.hidden = false;
  } else {
    if (pantryEmptyEl) pantryEmptyEl.hidden = true;
    pantryListContainer.innerHTML = safeRenderRows(entries, renderPantryRow, "stock");
  }

  renderPantryHistoryList();
}

function renderPantryRow(entry) {
  return (
    '<li class="pantry-item" data-key="' + escapeHtml(entry.key) + '" data-name="' + escapeHtml(entry.name) + '">' +
      '<div class="pantry-item__main">' +
        '<div class="pantry-item__name">' + escapeHtml(entry.name) + '</div>' +
        '<div class="pantry-item__grams">' + round0(entry.grams) + ' g</div>' +
      '</div>' +
      '<div class="pantry-item__actions">' +
        '<button type="button" class="pantry-item__btn" data-action="minus" aria-label="Quitar 50 g">&minus;</button>' +
        '<button type="button" class="pantry-item__btn" data-action="plus" aria-label="A&ntilde;adir 50 g">&plus;</button>' +
        '<button type="button" class="pantry-item__btn pantry-item__btn--clear" data-action="clear" aria-label="Vaciar">Vaciar</button>' +
      '</div>' +
    '</li>'
  );
}

function handlePantryListClick(event) {
  try {
    var btn = event.target.closest("button[data-action]");
    if (!btn) return;
    var row = btn.closest(".pantry-item");
    if (!row) return;
    var name = row.getAttribute("data-name");
    var action = btn.getAttribute("data-action");

    if (action === "plus")  adjustStock(name, 50);
    if (action === "minus") adjustStock(name, -50);
    if (action === "clear") clearStock(name);

    renderPantryPanel();
    pantryOnChange();
  } catch (err) {
    console.error("[render-pantry:list-click] la acción sobre la despensa no se pudo completar:", err);
  }
}

// ── Historial de planes confirmados ───────────────────────────────────────

function renderPantryHistoryList() {
  if (!pantryHistoryContainer) return;

  var history = getPantryHistory();

  if (history.length === 0) {
    pantryHistoryContainer.innerHTML = "";
    if (pantryHistoryEmptyEl) pantryHistoryEmptyEl.hidden = false;
    return;
  }

  if (pantryHistoryEmptyEl) pantryHistoryEmptyEl.hidden = true;
  pantryHistoryContainer.innerHTML = safeRenderRows(history, renderHistoryRow, "history");
}

/**
 * Cada entrada del historial se pinta en 3 bloques: cabecera (fecha +
 * resumen), lista de verificación de compra (Etapa 2 — checkboxes
 * puramente visuales hasta pulsar "Marcar compra como hecha"), y una fila
 * de "cocinado" por cada una de las 5 comidas del plan (Etapa 3).
 * @param {object} entry
 * @returns {string}
 */
function renderHistoryRow(entry) {
  var dateLabel = formatHistoryDate(entry.createdAt);
  var aggregated = aggregatePlanMealItems(entry.meals);
  var allCooked = entry.meals.every(function (m) { return m.cooked; });

  return (
    '<li class="pantry-history-item' + (allCooked ? ' pantry-history-item--cooked' : '') + '" data-id="' + escapeHtml(entry.id) + '">' +
      '<div class="pantry-history-item__head">' +
        '<div class="pantry-history-item__date">' + dateLabel + '</div>' +
        '<div class="pantry-history-item__summary">' + aggregated.length + ' ingredientes' + (entry.store ? ' &mdash; ' + escapeHtml(entry.store) : '') + '</div>' +
      '</div>' +
      renderPurchaseBlock(entry, aggregated) +
      renderMealsBlock(entry) +
    '</li>'
  );
}

function renderPurchaseBlock(entry, aggregated) {
  var rows = aggregated.map(function (item) {
    return (
      '<li class="pantry-purchase-row" data-name="' + escapeHtml(item.name) + '">' +
        '<button type="button" class="pantry-purchase-row__check" role="checkbox" aria-checked="true" data-action="toggle-purchase-check" aria-label="' + escapeHtml(item.name) + '"></button>' +
        '<span class="pantry-purchase-row__name">' + escapeHtml(item.name) + '</span>' +
        '<span class="pantry-purchase-row__grams">' + round0(item.requiredGrams) + ' g</span>' +
      '</li>'
    );
  }).join("");

  var buyLabel = entry.purchase.runs.length > 0 ? "Registrar otra compra" : "Marcar compra como hecha";
  var lastRun = entry.purchase.runs.length > 0 ? entry.purchase.runs[entry.purchase.runs.length - 1] : null;
  var lastRunNote = lastRun
    ? '<p class="pantry-purchase-block__note">&Uacute;ltima compra: &euro;' + round2(lastRun.totals.purchaseCost) + ' (' + lastRun.totals.itemCount + ' ingredientes)</p>'
    : '';

  return (
    '<div class="pantry-purchase-block">' +
      '<ul class="pantry-purchase-checklist">' + rows + '</ul>' +
      lastRunNote +
      '<button type="button" class="pantry-purchase-block__btn" data-action="mark-purchase-done" data-id="' + escapeHtml(entry.id) + '">' + buyLabel + '</button>' +
    '</div>'
  );
}

function renderMealsBlock(entry) {
  var rows = entry.meals.map(function (meal) {
    var cookedLabel = meal.cooked ? "Cocinado &#10003;" : "Marcar como cocinado";
    return (
      '<li class="pantry-history-item__meal-row' + (meal.cooked ? ' pantry-history-item__meal-row--cooked' : '') + '">' +
        '<span class="pantry-history-item__meal-label">' + escapeHtml(meal.label) + '</span>' +
        '<button type="button" class="pantry-history-item__meal-btn" data-action="toggle-meal-cooked" data-id="' + escapeHtml(entry.id) + '" data-meal-key="' + escapeHtml(meal.key) + '">' + cookedLabel + '</button>' +
      '</li>'
    );
  }).join("");

  return '<ul class="pantry-history-item__meals">' + rows + '</ul>';
}

function formatHistoryDate(isoString) {
  try {
    var d = new Date(isoString);
    return d.toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
  } catch (err) {
    return isoString || "";
  }
}

function handleHistoryClick(event) {
  try {
    var checkBtn = event.target.closest('button[data-action="toggle-purchase-check"]');
    if (checkBtn) {
      // Toggle puramente visual -- no llama a pantry.js hasta que se pulse
      // "Marcar compra como hecha" (mark-purchase-done, más abajo).
      var nowChecked = checkBtn.getAttribute("aria-checked") !== "true";
      checkBtn.setAttribute("aria-checked", String(nowChecked));
      checkBtn.closest(".pantry-purchase-row").classList.toggle("pantry-purchase-row--excluded", !nowChecked);
      return;
    }

    var buyBtn = event.target.closest('button[data-action="mark-purchase-done"]');
    if (buyBtn) {
      var entryId = buyBtn.getAttribute("data-id");
      var row = buyBtn.closest(".pantry-history-item");
      var excludedNames = [...row.querySelectorAll('.pantry-purchase-row__check[aria-checked="false"]')]
        .map(function (btn) { return btn.closest(".pantry-purchase-row").getAttribute("data-name"); });

      markPurchaseDone(entryId, excludedNames);
      renderPantryPanel();
      pantryOnChange();
      return;
    }

    var cookBtn = event.target.closest('button[data-action="toggle-meal-cooked"]');
    if (cookBtn) {
      var id = cookBtn.getAttribute("data-id");
      var mealKey = cookBtn.getAttribute("data-meal-key");
      var alreadyCooked = cookBtn.closest(".pantry-history-item__meal-row").classList.contains("pantry-history-item__meal-row--cooked");

      markMealCooked(id, mealKey, !alreadyCooked);
      renderPantryPanel();
      pantryOnChange();
      return;
    }
  } catch (err) {
    console.error("[render-pantry:history-click] la acción sobre el historial no se pudo completar:", err);
  }
}

// ── Aviso tras guardar un plan (Etapa 1) ──────────────────────────────────

/**
 * Pinta el aviso inmediatamente después de "Usar este plan hoy" — en este
 * punto todavía no se ha comprado ni cocinado nada, así que solo indica
 * dónde continuar (panel de despensa, ya abierto).
 * @param {object} entry - entry de historial devuelta por savePlanForToday
 * @param {boolean} historySaved - si el guardado en localStorage tuvo éxito
 */
function renderPlanSavedNotice(entry, historySaved) {
  if (!planSavedNoticeEl) return;

  if (!entry) {
    planSavedNoticeEl.hidden = true;
    planSavedNoticeEl.innerHTML = "";
    return;
  }

  var warning = historySaved ? "" :
    '<p class="confirm-receipt__warning">No se ha podido guardar en este navegador (almacenamiento lleno o deshabilitado) &mdash; los cambios no persistir&aacute;n al recargar.</p>';

  planSavedNoticeEl.hidden = false;
  planSavedNoticeEl.innerHTML =
    '<h4>Plan guardado</h4>' +
    warning +
    '<p>Marca la compra y cada comida como cocinada m&aacute;s abajo, en <strong>Tu despensa</strong>.</p>';
}
