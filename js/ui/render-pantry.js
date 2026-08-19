/**
 * js/ui/render-pantry.js
 * ─────────────────────────────────────────────────────────────────────────
 * Capa de presentación de la despensa -- toda la lógica real vive en
 * js/core/pantry.js, este archivo solo construye HTML y delega eventos
 * (mismo principio que el resto de módulos js/ui/*).
 *
 * ── Rediseño de UX (2026-08-14b) ──────────────────────────────────────
 * La versión anterior mezclaba en una sola lista plana tres ideas
 * distintas: (1) el stock actual, (2) el historial COMPLETO de cada plan
 * confirmado (hasta 30), y (3) dentro de cada uno, dos sub-etapas
 * técnicas (checklist de compra + un botón "Marcar como cocinado" por
 * cada una de las 5 comidas) siempre expandidas de golpe. El resultado
 * era una pared vertical de estados internos de la máquina de 3 etapas,
 * no "lo que tengo en casa". Este archivo separó entonces tres bloques
 * con roles claros para el usuario -- stock, planes activos, historial --
 * pero los tres seguían viviendo dentro del mismo acordeón colapsado de
 * despensa, dos secciones de página por debajo de las tarjetas de comida
 * que esos mismos planes representan.
 *
 * ── Reubicación de "Tu plan" (2026-08-14c) ────────────────────────────
 * Auditoría de UX posterior (ver conversación de esa sesión) encontró que
 * "¿qué es esto, dónde está mi plan de hoy?" seguía sin resolverse: las
 * tarjetas de comida (arriba, render.js), la lista de la compra (justo
 * debajo) y la tarjeta de "plan activo" con los botones de comprar/
 * cocinar (enterrada en un <details> colapsado, más abajo todavía) eran
 * tres secciones de página sin ningún vínculo visual, para lo que el
 * usuario vive como un solo flujo continuo. Fix (Modelo A del análisis,
 * puramente de presentación -- pantry.js no cambia): los planes CON algo
 * pendiente ya no se pintan dentro del acordeón de despensa, se pintan en
 * `todayPlansContainer` (`#todayPlansPanel`), una sección siempre
 * expandida justo debajo de la lista de la compra. Despensa vuelve a ser
 * solo lo que su nombre dice -- stock + historial de planes YA
 * completados, nada "en curso".
 *
 *   1. `pantryListContainer` (dentro de despensa) -- el stock en sí. Cada
 *      fila es tocable para editar la cantidad EXACTA y tiene un único
 *      icono de borrar, no tres botones.
 *   2. `todayPlansContainer` (fuera de despensa, sección "Tu plan") --
 *      SOLO los planes confirmados con algo pendiente (falta comprar o
 *      falta cocinar alguna comida). La acción por defecto asume "compré
 *      todo" (un botón primario, sin checklist visible) -- el checklist
 *      de exclusión sigue existiendo para quien de verdad no compró
 *      todo, pero detrás de un enlace secundario ("¿Te faltó algo?"), no
 *      como primera pantalla. Las comidas se marcan con chips compactos
 *      en una sola fila. Varios planes el mismo día están permitidos a
 *      propósito (decisión explícita del usuario, no un descuido, ver
 *      `savePlanForToday` en pantry.js) -- cada tarjeta se distingue por
 *      fecha Y HORA de creación (`formatEntryDateTime`), nunca solo la
 *      fecha, para que dos planes del mismo día no se confundan.
 *   3. `pantryHistoryContainer` (dentro de despensa, en un <details>
 *      anidado, oculto por completo si está vacío) -- los planes YA
 *      completados (todas las comidas cocinadas), como una fila de
 *      resumen de solo lectura. Un plan se muda aquí solo,
 *      automáticamente, en cuanto se completa (isEntryFullyCooked) --
 *      nunca hay que "archivarlo" a mano, y deja de ocupar espacio en
 *      "Tu plan".
 *
 * Ningún dato ni regla de negocio cambia: sigue siendo
 * savePlanForToday/markPurchaseDone/markMealCooked/setStock/adjustStock/
 * clearStock de pantry.js, tal cual, con las mismas 3 etapas de siempre
 * (ver cabecera de pantry.js) -- solo cambia qué botones existen, dónde
 * viven en la página, cómo se agrupan, y en qué idioma se explican.
 *
 * ── Alta manual: texto+datalist en vez de <select> ────────────────────
 * Un <select> con las 81 opciones alfabéticas de golpe era pesado de
 * escanear, sobre todo en móvil. Ahora es un <input list="..."> (auto-
 * completado nativo, filtra mientras se escribe) -- pero a diferencia
 * del <select>, el navegador NO obliga a que el valor final sea una de
 * las opciones, así que aquí se resuelve el texto tecleado contra la
 * clave normalizada (normalizeIngredientKey, pricing.js) antes de
 * guardar nada: si no coincide con ningún ingrediente conocido, se avisa
 * en vez de crear una clave de despensa huérfana que ningún plan futuro
 * llegaría a igualar nunca (mismo riesgo que ya advertía la versión
 * anterior de este archivo sobre el <select>).
 *
 * Depende de:
 *   js/core/pantry.js  (getPantryState, getStock, listPantryEntries,
 *                        setStock, adjustStock, clearStock,
 *                        getPantryHistory, aggregatePlanMealItems,
 *                        markPurchaseDone, markMealCooked)
 *   js/core/pricing.js (normalizeIngredientKey)
 *   js/core/utils.js   (round0, round2, escapeHtml)
 *   js/data/dishes.js  (DISH_DB) — solo para poblar el datalist de alta
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

var pantryListContainer, pantryEmptyEl, pantryAddForm, pantryAddNameInput, pantryAddGrams,
    pantryIngredientOptionsList, pantryAddError,
    todayPlansPanel, todayPlansContainer, pantryHistoryDisclosure, pantryHistoryContainer,
    pantryCountEl, planSavedNoticeEl;
var pantryOnChange; // callback de app.js — sincroniza la lista de la compra visible
var pantryIngredientByKey = {}; // clave normalizada -> nombre canónico, para resolver lo tecleado en el alta

/**
 * Conecta los nodos DOM necesarios para este módulo.
 * @param {object} refs
 * @param {Element} refs.todayPlansPanel - sección "Tu plan" completa
 *   (fuera de despensa) -- se oculta/muestra según haya o no algún plan
 *   con algo pendiente (ver renderPantryHistorySections).
 * @param {Element} refs.todayPlansContainer - dentro de refs.todayPlansPanel,
 *   donde se pintan las tarjetas de plan activo en sí.
 * @param {function} [refs.onPantryChange] - se llama tras cualquier mutación
 *   de la despensa (alta manual/edición/borrado, compra, cocinado...), para
 *   que app.js pueda refrescar una lista de la compra visible cuyos
 *   números "ya en despensa" habrían quedado desactualizados.
 */
function initPantryRefs(refs) {
  pantryListContainer         = refs.pantryListContainer;
  pantryEmptyEl               = refs.pantryEmptyEl;
  pantryAddForm                = refs.pantryAddForm;
  pantryAddNameInput           = refs.pantryAddNameInput;
  pantryAddGrams                = refs.pantryAddGrams;
  pantryIngredientOptionsList  = refs.pantryIngredientOptionsList;
  pantryAddError                = refs.pantryAddError;
  todayPlansPanel               = refs.todayPlansPanel;
  todayPlansContainer          = refs.todayPlansContainer;
  pantryHistoryDisclosure      = refs.pantryHistoryDisclosure;
  pantryHistoryContainer       = refs.pantryHistoryContainer;
  pantryCountEl                = refs.pantryCountEl;
  planSavedNoticeEl            = refs.planSavedNoticeEl;
  pantryOnChange               = typeof refs.onPantryChange === "function" ? refs.onPantryChange : function () {};

  populatePantryIngredientOptions();

  if (pantryAddForm) pantryAddForm.addEventListener("submit", handleManualAdd);
  // Delegación de eventos: cada bloque se reconstruye entero en cada
  // render, así que los listeners van en los contenedores fijos, no en
  // cada fila/tarjeta individual.
  if (pantryListContainer)  pantryListContainer.addEventListener("click", handlePantryListClick);
  if (todayPlansContainer)  todayPlansContainer.addEventListener("click", handleEntryClick);
}

// ── Alta manual ───────────────────────────────────────────────────────────

/**
 * Rellena el <datalist> de "¿qué tienes?" con los nombres de ingrediente
 * que aparecen en DISH_DB, deduplicados por clave normalizada y
 * ordenados alfabéticamente, y guarda el mapa clave→nombre canónico para
 * poder resolver luego lo que el usuario haya tecleado literalmente.
 */
function populatePantryIngredientOptions() {
  pantryIngredientByKey = {};
  if (typeof DISH_DB === "undefined" || typeof normalizeIngredientKey !== "function") return;

  var names = [];
  DISH_DB.forEach(function (dish) {
    (dish.items || []).forEach(function (ingredient) {
      var key = normalizeIngredientKey(ingredient.name);
      if (!pantryIngredientByKey[key]) {
        pantryIngredientByKey[key] = ingredient.name;
        names.push(ingredient.name);
      }
    });
  });
  names.sort(function (a, b) { return a.localeCompare(b, "es"); });

  if (pantryIngredientOptionsList) {
    pantryIngredientOptionsList.innerHTML = names.map(function (name) {
      return '<option value="' + escapeHtml(name) + '"></option>';
    }).join("");
  }
}

/**
 * @param {string} typed - lo que el usuario haya escrito en el campo
 * @returns {string|null} - el nombre CANÓNICO (tal como aparece en
 *   dishes.js) si `typed` coincide con un ingrediente conocido una vez
 *   normalizado (minúsculas, sin acentos/puntuación), o null si no hay
 *   ninguna coincidencia -- nunca se guarda un nombre no reconocido.
 */
function resolveTypedIngredientName(typed) {
  if (!typed || typeof normalizeIngredientKey !== "function") return null;
  return pantryIngredientByKey[normalizeIngredientKey(typed)] || null;
}

function handleManualAdd(event) {
  if (event && typeof event.preventDefault === "function") event.preventDefault();
  if (!pantryAddNameInput || !pantryAddGrams) return;

  try {
    clearAddError();
    var typed = pantryAddNameInput.value.trim();
    if (!typed) return;

    var canonicalName = resolveTypedIngredientName(typed);
    if (!canonicalName) {
      showAddError('No encontramos "' + typed + '" en la lista -- elige una de las sugerencias mientras escribes.');
      return;
    }

    var grams = parseFloat(pantryAddGrams.value);
    if (!isFinite(grams) || grams <= 0) {
      showAddError("Indica cuántos gramos tienes.");
      return;
    }

    adjustStock(canonicalName, grams);
    pantryAddNameInput.value = "";
    pantryAddGrams.value = "";
    renderPantryPanel();
    pantryOnChange();
  } catch (err) {
    console.error("[render-pantry:add] no se pudo añadir el ingrediente:", err);
  }
}

function showAddError(message) {
  if (!pantryAddError) return;
  pantryAddError.textContent = message;
  pantryAddError.hidden = false;
}

function clearAddError() {
  if (!pantryAddError) return;
  pantryAddError.hidden = true;
  pantryAddError.textContent = "";
}

// ── Render principal ──────────────────────────────────────────────────────

/**
 * Aplica renderRowFn a cada elemento, pero AISLADO uno de otro: si un
 * elemento concreto lanza al pintarse (forma inesperada que pasó las
 * validaciones de pantry.js pero aún así rompe el HTML de esa fila
 * específica), esa fila se omite y se registra en consola -- el resto,
 * perfectamente sano, se sigue pintando con normalidad. Sin esto, un
 * solo elemento problemático dejaría todo el bloque en blanco.
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
      console.error("[render-pantry:" + label + "] se omitió un elemento que no se pudo pintar:", err, item);
    }
  });
  return html;
}

/**
 * Pinta el estado completo de la despensa: stock, planes activos e
 * historial completado. Se llama tanto al iniciar la app (la despensa
 * persiste independientemente de cualquier plan generado en esta
 * sesión) como tras cualquier mutación.
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

  renderPantryHistorySections();
}

function renderPantryRow(entry) {
  return (
    '<li class="pantry-item" data-key="' + escapeHtml(entry.key) + '" data-name="' + escapeHtml(entry.name) + '">' +
      '<span class="pantry-item__name">' + escapeHtml(entry.name) + '</span>' +
      '<button type="button" class="pantry-item__amount" data-action="edit" aria-label="Editar cantidad de ' + escapeHtml(entry.name) + '">' + round0(entry.grams) + ' g</button>' +
      '<button type="button" class="pantry-item__remove" data-action="remove" aria-label="Quitar ' + escapeHtml(entry.name) + '">&times;</button>' +
    '</li>'
  );
}

function handlePantryListClick(event) {
  try {
    var editBtn = event.target.closest('button[data-action="edit"]');
    if (editBtn) { beginEditPantryRow(editBtn); return; }

    var removeBtn = event.target.closest('button[data-action="remove"]');
    if (removeBtn) {
      var row = removeBtn.closest(".pantry-item");
      clearStock(row.getAttribute("data-name"));
      renderPantryPanel();
      pantryOnChange();
      return;
    }
  } catch (err) {
    console.error("[render-pantry:list-click] la acción sobre la despensa no se pudo completar:", err);
  }
}

/**
 * Sustituye el botón de cantidad por un <input type=number> editable in
 * situ, con el valor EXACTO actual ya seleccionado -- un solo tap, un
 * solo campo, cantidad exacta. Reemplaza los pasos ciegos de ±50g de la
 * versión anterior (no había forma de corregir a un número concreto sin
 * varios clics o vaciar y volver a añadir). Edición puramente local al
 * DOM: no llama a pantry.js hasta que se confirma (Enter o perder el
 * foco) o se cancela (Escape, sin guardar nada).
 * @param {HTMLButtonElement} btn
 */
function beginEditPantryRow(btn) {
  var row = btn.closest(".pantry-item");
  var name = row.getAttribute("data-name");
  var currentGrams = round0(getStock(name));

  var input = document.createElement("input");
  input.type = "number";
  input.min = "0";
  input.step = "1";
  input.inputMode = "numeric";
  input.className = "pantry-item__amount-input";
  input.value = currentGrams;
  input.setAttribute("aria-label", "Cantidad de " + name + " en gramos");

  btn.replaceWith(input);
  input.focus();
  input.select();

  var settled = false;
  function commit() {
    if (settled) return;
    settled = true;
    var grams = parseFloat(input.value);
    setStock(name, isFinite(grams) ? grams : 0);
    renderPantryPanel();
    pantryOnChange();
  }

  input.addEventListener("blur", commit);
  input.addEventListener("keydown", function (event) {
    if (event.key === "Enter") { event.preventDefault(); input.blur(); }
    if (event.key === "Escape") { settled = true; renderPantryPanel(); }
  });
}

// ── Planes activos (compra y/o comidas pendientes) + historial ──────────────

/**
 * Un plan se considera "terminado" en cuanto TODAS sus comidas están
 * cocinadas -- en ese momento deja de necesitar atención y se muda solo
 * al historial colapsado. La compra en sí no forma parte de esta
 * condición a propósito: alguien puede cocinar con lo que ya tenía sin
 * haber pulsado nunca "Ya compré todo esto", y eso sigue siendo un plan
 * terminado igualmente.
 * @param {object} entry
 * @returns {boolean}
 */
function isEntryFullyCooked(entry) {
  var meals = entry.meals || [];
  return meals.length > 0 && meals.every(function (m) { return m.cooked; });
}

function renderPantryHistorySections() {
  var history = getPantryHistory();
  var active = history.filter(function (e) { return !isEntryFullyCooked(e); });
  var completed = history.filter(isEntryFullyCooked);

  // "Tu plan" -- fuera de despensa (ver cabecera, reubicación 2026-08-14c).
  // Toda la sección se oculta cuando no hay ningún plan pendiente, en vez
  // de quedar vacía y visible.
  if (todayPlansPanel) todayPlansPanel.hidden = active.length === 0;
  if (todayPlansContainer) todayPlansContainer.innerHTML = safeRenderRows(active, renderActiveEntryCard, "active");

  if (pantryHistoryDisclosure) pantryHistoryDisclosure.hidden = completed.length === 0;
  if (pantryHistoryContainer) pantryHistoryContainer.innerHTML = safeRenderRows(completed, renderCompletedEntryRow, "history");
}

/**
 * Gramos ya cubiertos por el stock ACTUAL de despensa, sumados entre
 * todos los ingredientes agregados de un plan -- puramente informativo
 * (no descuenta nada, no es un cálculo de compra), para responder aquí
 * mismo, sin tener que abrir el checklist, a "¿esto ya lo tengo o hace
 * falta comprarlo?" (mismo dato que ya mostraba la lista de la compra vía
 * "Ya en tu despensa: Xg" -- aquí faltaba, es la inconsistencia que este
 * cambio corrige).
 * @param {{name:string, requiredGrams:number}[]} aggregated
 * @returns {number}
 */
function sumPantryCoverageGrams(aggregated) {
  if (typeof getStock !== "function") return 0;
  return (aggregated || []).reduce(function (sum, item) {
    return sum + Math.min(item.requiredGrams, getStock(item.name));
  }, 0);
}

/**
 * Tarjeta de un plan con algo pendiente: compra (si no se ha marcado) y/o
 * comidas por cocinar. Ver cabecera del archivo para el razonamiento de
 * por qué la acción de compra por defecto es un único botón sin
 * checklist visible. La fecha SIEMPRE incluye la hora (formatEntryDateTime,
 * no solo el día) porque varios planes el mismo día están permitidos a
 * propósito -- sin hora, dos tarjetas del mismo día serían indistinguibles
 * a simple vista.
 * @param {object} entry
 * @returns {string}
 */
function renderActiveEntryCard(entry) {
  var dateLabel = formatEntryDateTime(entry.createdAt);
  var aggregated = aggregatePlanMealItems(entry.meals);
  var coveredGrams = sumPantryCoverageGrams(aggregated);
  var pantryNote = coveredGrams > 0
    ? ' <span class="pantry-active-card__pantry-note">&middot; ' + round0(coveredGrams) + ' g ya en tu despensa</span>'
    : '';

  return (
    '<div class="pantry-active-card" data-id="' + escapeHtml(entry.id) + '">' +
      '<div class="pantry-active-card__head">' +
        '<span class="pantry-active-card__date">' + dateLabel + '</span>' +
        '<span class="pantry-active-card__summary">' + aggregated.length + ' ingredientes' + (entry.store ? ' &mdash; ' + escapeHtml(entry.store) : '') + pantryNote + '</span>' +
      '</div>' +
      renderPurchaseSection(entry, aggregated) +
      renderMealChips(entry) +
    '</div>'
  );
}

function renderPurchaseSection(entry, aggregated) {
  var checklist = renderPurchaseChecklist(entry, aggregated);

  if (entry.purchase.done) {
    var lastRun = entry.purchase.runs[entry.purchase.runs.length - 1];
    var costNote = lastRun ? ' (&euro;' + round2(lastRun.totals.purchaseCost) + ')' : '';
    return (
      '<div class="pantry-active-card__purchase pantry-active-card__purchase--done">' +
        '<span class="pantry-active-card__purchase-status">&#10003; Ya compraste esto' + costNote + '</span>' +
        '<button type="button" class="pantry-link-btn" data-action="toggle-checklist" data-id="' + escapeHtml(entry.id) + '">Registrar otra compra</button>' +
      '</div>' + checklist
    );
  }

  return (
    '<div class="pantry-active-card__purchase">' +
      '<button type="button" class="btn-primary pantry-active-card__buy-btn" data-action="confirm-purchase-all" data-id="' + escapeHtml(entry.id) + '">Ya compr&eacute; todo esto</button>' +
      '<button type="button" class="pantry-link-btn" data-action="toggle-checklist" data-id="' + escapeHtml(entry.id) + '">&iquest;Te falt&oacute; algo?</button>' +
    '</div>' + checklist
  );
}

/**
 * Checklist de exclusión, oculto por defecto (ver toggle-checklist en
 * handleEntryClick) -- solo para quien de verdad no compró todo lo que
 * el plan pedía. Desmarcar una fila la excluye del stock que se suma al
 * confirmar; el resto de filas se compran tal cual.
 * @param {object} entry
 * @param {{name:string, requiredGrams:number}[]} aggregated
 * @returns {string}
 */
function renderPurchaseChecklist(entry, aggregated) {
  var rows = aggregated.map(function (item) {
    var covered = (typeof getStock === "function") ? Math.min(item.requiredGrams, getStock(item.name)) : 0;
    var pantryNote = covered > 0
      ? '<span class="pantry-purchase-row__pantry-note">' + round0(covered) + ' g ya en despensa</span>'
      : '';
    return (
      '<li class="pantry-purchase-row" data-name="' + escapeHtml(item.name) + '">' +
        '<button type="button" class="pantry-purchase-row__check" role="checkbox" aria-checked="true" data-action="toggle-purchase-check" aria-label="' + escapeHtml(item.name) + '"></button>' +
        '<span class="pantry-purchase-row__main">' +
          '<span class="pantry-purchase-row__name">' + escapeHtml(item.name) + '</span>' +
          pantryNote +
        '</span>' +
        '<span class="pantry-purchase-row__grams">' + round0(item.requiredGrams) + ' g</span>' +
      '</li>'
    );
  }).join("");

  return (
    '<div class="pantry-purchase-checklist-wrap" hidden>' +
      '<p class="pantry-purchase-checklist-hint">Desmarca lo que NO compraste:</p>' +
      '<ul class="pantry-purchase-checklist">' + rows + '</ul>' +
      '<button type="button" class="pantry-active-card__buy-btn pantry-active-card__buy-btn--secondary" data-action="confirm-purchase-partial" data-id="' + escapeHtml(entry.id) + '">Confirmar compra</button>' +
    '</div>'
  );
}

/**
 * Un chip compacto por comida, en una sola fila que envuelve si hace
 * falta -- reemplaza las 5 filas apiladas de la versión anterior, cada
 * una repitiendo el texto "Marcar como cocinado". Tocar el chip alterna
 * el estado directamente, sin paso de confirmación adicional (igual que
 * ya hacía el botón individual antes).
 * @param {object} entry
 * @returns {string}
 */
function renderMealChips(entry) {
  var chips = (entry.meals || []).map(function (meal) {
    var cookedClass = meal.cooked ? " pantry-meal-chip--cooked" : "";
    // meal.time solo existe en planes guardados con horario calculado
    // (js/core/meal-schedule.js) -- entradas más antiguas simplemente no
    // lo traen, y el badge se omite sin más (nunca "undefined" visible).
    var timeBadge = typeof meal.time === "string"
      ? '<span class="pantry-meal-chip__time">' + escapeHtml(meal.time) + '</span>'
      : '';
    return (
      '<button type="button" class="pantry-meal-chip' + cookedClass + '" data-action="toggle-meal-cooked" data-id="' + escapeHtml(entry.id) + '" data-meal-key="' + escapeHtml(meal.key) + '">' +
        timeBadge + (meal.cooked ? "&#10003; " : "") + escapeHtml(meal.label) +
      '</button>'
    );
  }).join("");

  return '<div class="pantry-meal-chips"><span class="pantry-meal-chips__label">Comidas</span>' + chips + '</div>';
}

/**
 * Fila de solo lectura para un plan ya completado -- vive dentro del
 * <details> "Ver planes anteriores", colapsado por defecto.
 * @param {object} entry
 * @returns {string}
 */
function renderCompletedEntryRow(entry) {
  var dateLabel = formatEntryDateTime(entry.createdAt);
  var aggregated = aggregatePlanMealItems(entry.meals);
  var boughtNote = entry.purchase.done ? "comprado y cocinado" : "cocinado (sin registrar compra)";

  return (
    '<li class="pantry-history-row">' +
      '<span class="pantry-history-row__date">' + dateLabel + '</span>' +
      '<span class="pantry-history-row__summary">' + aggregated.length + ' ingredientes &mdash; ' + boughtNote + ' &#10003;</span>' +
    '</li>'
  );
}

/**
 * Fecha Y HORA de creación de una entrada de historial, en es-ES. SIEMPRE
 * incluye la hora (no solo el día) -- desde que varios planes el mismo
 * día están permitidos a propósito (ver savePlanForToday, pantry.js), dos
 * tarjetas con la misma fecha y sin hora serían indistinguibles a simple
 * vista. Antes de 2026-08-14c esta función (entonces formatHistoryDate)
 * solo devolvía el día.
 * @param {string} isoString
 * @returns {string}
 */
function formatEntryDateTime(isoString) {
  try {
    var d = new Date(isoString);
    var datePart = d.toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
    // Con segundos, no solo horas:minutos -- probado en vivo (2026-08-14c):
    // guardar dos planes con un par de clics de diferencia bastaba para
    // que ambos cayeran en el mismo minuto y las tarjetas volvieran a
    // verse "iguales" a simple vista, justo lo que esto existe para
    // evitar. Con segundos, dos entradas solo coinciden si se guardaron
    // en la misma llamada de red (imposible, es síncrono y secuencial).
    var timePart = d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    return datePart + ", " + timePart;
  } catch (err) {
    return isoString || "";
  }
}

function handleEntryClick(event) {
  try {
    var toggleBtn = event.target.closest('button[data-action="toggle-checklist"]');
    if (toggleBtn) {
      var purchaseBlock = toggleBtn.closest(".pantry-active-card__purchase");
      var wrap = purchaseBlock && purchaseBlock.nextElementSibling;
      if (wrap && wrap.classList.contains("pantry-purchase-checklist-wrap")) {
        wrap.hidden = !wrap.hidden;
      }
      return;
    }

    var checkBtn = event.target.closest('button[data-action="toggle-purchase-check"]');
    if (checkBtn) {
      // Toggle puramente visual -- no llama a pantry.js hasta que se
      // confirme (confirm-purchase-partial, más abajo).
      var nowChecked = checkBtn.getAttribute("aria-checked") !== "true";
      checkBtn.setAttribute("aria-checked", String(nowChecked));
      checkBtn.closest(".pantry-purchase-row").classList.toggle("pantry-purchase-row--excluded", !nowChecked);
      return;
    }

    var confirmAllBtn = event.target.closest('button[data-action="confirm-purchase-all"]');
    if (confirmAllBtn) {
      markPurchaseDone(confirmAllBtn.getAttribute("data-id"), []);
      renderPantryPanel();
      pantryOnChange();
      return;
    }

    var confirmPartialBtn = event.target.closest('button[data-action="confirm-purchase-partial"]');
    if (confirmPartialBtn) {
      var entryId = confirmPartialBtn.getAttribute("data-id");
      var card = confirmPartialBtn.closest(".pantry-active-card");
      var excludedNames = Array.prototype.slice
        .call(card.querySelectorAll('.pantry-purchase-row__check[aria-checked="false"]'))
        .map(function (btn) { return btn.closest(".pantry-purchase-row").getAttribute("data-name"); });

      markPurchaseDone(entryId, excludedNames);
      renderPantryPanel();
      pantryOnChange();
      return;
    }

    var cookChip = event.target.closest('button[data-action="toggle-meal-cooked"]');
    if (cookChip) {
      var id = cookChip.getAttribute("data-id");
      var mealKey = cookChip.getAttribute("data-meal-key");
      var alreadyCooked = cookChip.classList.contains("pantry-meal-chip--cooked");

      markMealCooked(id, mealKey, !alreadyCooked);
      renderPantryPanel();
      pantryOnChange();
      return;
    }
  } catch (err) {
    console.error("[render-pantry:entry-click] la acción sobre el plan no se pudo completar:", err);
  }
}

// ── Aviso tras guardar un plan (Etapa 1) ──────────────────────────────────

/**
 * Pinta el aviso inmediatamente después de "Confirmar plan de hoy" — en
 * este punto todavía no se ha comprado ni cocinado nada, así que solo
 * indica dónde continuar. Distingue explícitamente confirmar por primera
 * vez de volver a confirmar (tras regenerar/editar) sobre el MISMO
 * borrador del día (`replaced`, ver savePlanForToday/UPSERT en
 * pantry.js) — mensaje distinto a propósito, para que quede claro que no
 * se creó nada nuevo ni se compró nada, tranquilizando exactamente la
 * duda que motivó este cambio ("¿esto añade algo a mi despensa?").
 * @param {object} entry - entry de historial devuelta por savePlanForToday
 * @param {boolean} historySaved - si el guardado en localStorage tuvo éxito
 * @param {boolean} [replaced] - true si se actualizó un borrador ya
 *   existente de hoy en vez de crear uno nuevo
 */
function renderPlanSavedNotice(entry, historySaved, replaced) {
  if (!planSavedNoticeEl) return;

  if (!entry) {
    planSavedNoticeEl.hidden = true;
    planSavedNoticeEl.innerHTML = "";
    return;
  }

  var warning = historySaved ? "" :
    '<p class="confirm-receipt__warning">No se ha podido guardar en este navegador (almacenamiento lleno o deshabilitado) &mdash; los cambios no persistir&aacute;n al recargar.</p>';

  var title = replaced ? "Plan actualizado" : "Plan confirmado";
  var body = replaced
    ? '<p>Sigue siendo el mismo plan de hoy en <strong>Tu plan</strong> &mdash; no se ha comprado ni cocinado nada todav&iacute;a, ni se ha a&ntilde;adido nada a tu despensa.</p>'
    : '<p>Cuando compres, toca <strong>Ya compr&eacute; todo esto</strong> ah&iacute; abajo, en <strong>Tu plan</strong> &mdash; as&iacute; no te lo volver&aacute; a pedir la pr&oacute;xima vez.</p>';

  planSavedNoticeEl.hidden = false;
  planSavedNoticeEl.innerHTML = '<h4>' + title + '</h4>' + warning + body;
}
