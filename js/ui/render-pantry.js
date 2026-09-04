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
 *      fecha, para que dos planes del mismo día no se confundan. Desde
 *      2026-08-20, crear una SEGUNDA tarjeta cuando la primera ya tiene
 *      algo real encima requiere pasar por `showPlanReplaceDialog` (más
 *      abajo) -- ya no es un efecto colateral silencioso de pulsar
 *      "Generar plan" dos veces, ver "Gate en Generar plan..." en la
 *      cabecera de pantry.js.
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
 * ── Simplificación visual: "Mis planes" + despensa como diálogo
 *    (2026-08-23) ─────────────────────────────────────────────────────
 * Los puntos 2 y 3 de más arriba describen el modelo anterior (planes
 * activos en `todayPlansContainer`, historial completado anidado dentro
 * del acordeón de despensa) -- superado por esta pasada de simplificación
 * visual, que fusiona ambos en una sola sección, "Mis planes", con un
 * selector de fecha:
 *   - `dateStripEl` -- tira de chips de fecha (radiogroup accesible,
 *     mismo patrón que `.budget-modes`), pintada por renderDateStrip() a
 *     partir de listPlanDates() (js/core/pantry.js) más "Hoy" siempre
 *     presente. `_selectedPlanDate` guarda la fecha elegida ("Hoy" por
 *     defecto al cargar).
 *   - `todayPlansContainer` ahora pinta TODAS las entries de la fecha
 *     elegida, pendientes Y completadas (antes: solo pendientes aquí,
 *     completadas en el acordeón de despensa) -- mismos renderers de
 *     siempre (renderActiveEntryCard/renderCompletedEntryRow y sus
 *     variantes "sin cocinar"), solo cambia el criterio de agrupación.
 *   - `plansEmptyNoteEl` sustituye al `hidden` de toda la sección: "Mis
 *     planes" ahora es SIEMPRE visible (para que el selector de fecha
 *     nunca desaparezca), y el aviso de "nada guardado este día" vive
 *     dentro, no fuera.
 *   - Despensa deja de ser un `<details>` siempre presente al final de la
 *     página y pasa a ser un `<dialog>` (`despensaDialogEl`, mismo patrón
 *     que showPlanReplaceDialog/hidePlanReplaceDialog más abajo),
 *     abierto desde un botón nuevo en `.actions`. Ya NO contiene el
 *     historial completado (fusionado en "Mis planes" arriba) -- solo
 *     alta/stock, como en el punto 1 original.
 * pantry.js no cambia en absoluto por esta pasada -- puramente
 * presentación, igual que las anteriores.
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
 *                        getPantryHistory, getEntryPlanDate, listPlanDates,
 *                        formatLocalDateKey, aggregatePlanMealItems,
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
 *   renderPlanSavedNotice(entry, historySaved, mode)
 *   showPlanReplaceDialog(entry) / hidePlanReplaceDialog()
 *   showDespensaDialog() / hideDespensaDialog() (2026-08-23)
 *   selectPlanDate(dateKey) (2026-08-23) -- fuerza la fecha seleccionada
 *     en "Mis planes", usado por app.js tras confirmar un plan nuevo
 * ─────────────────────────────────────────────────────────────────────────
 */

var pantryListContainer, pantryEmptyEl, pantryAddForm, pantryAddNameInput, pantryAddGrams,
    pantryIngredientOptionsList, pantryAddError,
    todayPlansPanel, todayPlansContainer, dateStripEl, plansEmptyNoteEl,
    pantryCountEl, planSavedNoticeEl;
var pantryOnChange; // callback de app.js — sincroniza la lista de la compra visible
var pantryIngredientByKey = {}; // clave normalizada -> nombre canónico, para resolver lo tecleado en el alta

// "Mis planes" (2026-08-23) -- fecha elegida en la tira de chips; null
// hasta el primer render, momento en el que renderPantryHistorySections()
// la inicializa a "hoy" (ver esa función más abajo).
var _selectedPlanDate = null;

// Diálogo "ya tienes un plan activo hoy" -- ver "Gate en Generar plan..."
// en la cabecera de js/core/pantry.js.
var planReplaceDialogEl, planReplaceBodyEl, planReplaceFullBtn, planReplaceCancelBtn;
var pantryOnReplaceWholePlan; // callback de app.js — genera el plan de reemplazo
var _planReplaceEntryId = null;

// Diálogo de despensa (2026-08-23) -- ver showDespensaDialog/hideDespensaDialog.
var despensaDialogEl, despensaCloseBtn;

/**
 * Conecta los nodos DOM necesarios para este módulo.
 * @param {object} refs
 * @param {Element} refs.todayPlansPanel - sección "Mis planes" completa
 *   (fuera de despensa) -- siempre visible (2026-08-23); el selector de
 *   fecha necesita estar siempre alcanzable, ver renderPantryHistorySections.
 * @param {Element} refs.todayPlansContainer - dentro de refs.todayPlansPanel,
 *   donde se pintan las tarjetas de la fecha elegida (pendientes y
 *   completadas).
 * @param {Element} refs.dateStripEl - tira de chips de fecha, ver
 *   renderDateStrip().
 * @param {Element} refs.plansEmptyNoteEl - aviso "nada guardado este día",
 *   visible cuando la fecha elegida no tiene ninguna entry.
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
  dateStripEl                  = refs.dateStripEl;
  plansEmptyNoteEl             = refs.plansEmptyNoteEl;
  pantryCountEl                = refs.pantryCountEl;
  planSavedNoticeEl            = refs.planSavedNoticeEl;
  pantryOnChange               = typeof refs.onPantryChange === "function" ? refs.onPantryChange : function () {};

  planReplaceDialogEl    = refs.planReplaceDialogEl;
  planReplaceBodyEl      = refs.planReplaceBodyEl;
  planReplaceFullBtn     = refs.planReplaceFullBtn;
  planReplaceCancelBtn   = refs.planReplaceCancelBtn;
  pantryOnReplaceWholePlan = typeof refs.onReplaceWholePlan === "function" ? refs.onReplaceWholePlan : function () {};

  despensaDialogEl = refs.despensaDialogEl;
  despensaCloseBtn = refs.despensaCloseBtn;

  populatePantryIngredientOptions();

  if (pantryAddForm) pantryAddForm.addEventListener("submit", handleManualAdd);
  // Delegación de eventos: cada bloque se reconstruye entero en cada
  // render, así que los listeners van en los contenedores fijos, no en
  // cada fila/tarjeta individual.
  if (pantryListContainer)  pantryListContainer.addEventListener("click", handlePantryListClick);
  if (todayPlansContainer)  todayPlansContainer.addEventListener("click", handleEntryClick);
  if (dateStripEl)          dateStripEl.addEventListener("change", handleDateStripChange);

  if (planReplaceFullBtn) planReplaceFullBtn.addEventListener("click", function () {
    var id = _planReplaceEntryId;
    hidePlanReplaceDialog();
    if (id) pantryOnReplaceWholePlan(id);
  });
  if (planReplaceCancelBtn) planReplaceCancelBtn.addEventListener("click", hidePlanReplaceDialog);

  if (despensaCloseBtn) despensaCloseBtn.addEventListener("click", hideDespensaDialog);
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

/**
 * Etiqueta de caducidad de una fila.
 *
 * Una fecha ESTIMADA se marca con "~" y lo dice en su `title`; una fecha
 * introducida a mano se muestra tal cual. Esa distinción es deliberada y no
 * debe perderse al reestilar: mostrar una estimación como si fuera la fecha
 * del envase sería inventar un dato, que es justo lo que el resto del
 * proyecto evita con los badges "real"/"no verificado" de nutrición.
 *
 * @param {object} entry - fila de listPantryEntries()
 * @returns {string} HTML
 */
function renderExpiryBadge(entry) {
  var name = escapeHtml(entry.name);

  if (!entry.expiryDate) {
    return '<button type="button" class="pantry-item__expiry pantry-item__expiry--none" ' +
      'data-action="expiry" title="Sin fecha de caducidad. Pulsa para ponerla." ' +
      'aria-label="Añadir fecha de caducidad de ' + name + '">+ fecha</button>';
  }

  var estimated = entry.expirySource === "estimated";
  var fromStore = entry.expirySource === "store";
  var d = entry.expiryDaysLeft;
  var text;

  if (d < 0) text = "caducado";
  else if (d === 0) text = "hoy";
  else text = d + " d";

  // Solo la ESTIMACIÓN lleva "~". Los días publicados por la tienda son un
  // dato del fabricante, no una aproximación nuestra, así que se muestran
  // igual que una fecha introducida a mano.
  var label = (estimated ? "~" : "") + text;

  // Un envase ABIERTO cuenta desde que se abrió, no desde que se compró:
  // decir "a partir de la fecha de compra" ahí sería sencillamente falso.
  // `openedAt` lo pone sola la app al cocinar (pantry.js), nunca el usuario.
  var abierto = typeof entry.openedAt === "string" && entry.openedAt;

  var title;
  if (estimated && abierto) {
    title = "Abierto el " + entry.openedAt.slice(0, 10) + ". Caducidad ESTIMADA ("
      + entry.expiryDate + "): una vez abierto conviene gastarlo en pocos días"
      + (entry.storage ? ", en " + entry.storage : "") + ". No es la fecha del envase. Pulsa para poner la real.";
  } else if (estimated) {
    title = "Caducidad ESTIMADA (" + entry.expiryDate + ") a partir de la fecha de compra y la vida útil típica"
      + (entry.storage ? " en " + entry.storage : "") + ". No es la fecha del envase. Pulsa para poner la real.";
  } else if (fromStore) {
    // expiryTotalDays son los días que PUBLICA la tienda; expiryDaysLeft son
    // los que quedan. La frase promete lo primero, así que usa lo primero.
    title = "Mercadona indica consumir en " + entry.expiryTotalDays + " días desde la apertura"
      + (entry.storage ? " (conservar en " + entry.storage + ")" : "")
      + ". Pulsa para poner la fecha del envase.";
  } else {
    title = "Caduca el " + entry.expiryDate + " (fecha introducida a mano). Pulsa para cambiarla.";
  }

  // Ventana de frescura (perecederos): pasada la mitad de su vida útil, el
  // aviso explica POR QUÉ marca algo que todavía tiene días por delante --
  // sin esto, "13 d" resaltado parecería un error de la app.
  if (entry.expiryTier === "pasado") {
    var used = (typeof entry.expiryTotalDays === "number" && typeof entry.expiryDaysLeft === "number")
      ? (entry.expiryTotalDays - entry.expiryDaysLeft) + " de " + entry.expiryTotalDays + " días"
      : "más de la mitad de su vida útil";
    title = "Fresco a medias: lleva " + used + ". Aún no caduca ("
      + entry.expiryDate + "), pero conviene gastarlo pronto. " + title;
  }

  return '<button type="button" class="pantry-item__expiry pantry-item__expiry--' + escapeHtml(entry.expiryTier) + '" ' +
    'data-action="expiry" title="' + escapeHtml(title) + '" ' +
    'aria-label="Caducidad de ' + name + ': ' + escapeHtml(title) + '">' + escapeHtml(label) + '</button>';
}

function renderPantryRow(entry) {
  return (
    '<li class="pantry-item" data-key="' + escapeHtml(entry.key) + '" data-name="' + escapeHtml(entry.name) + '">' +
      '<span class="pantry-item__name">' + escapeHtml(entry.name) + '</span>' +
      renderExpiryBadge(entry) +
      '<button type="button" class="pantry-item__amount" data-action="edit" aria-label="Editar cantidad de ' + escapeHtml(entry.name) + '">' + round0(entry.grams) + ' g</button>' +
      '<button type="button" class="pantry-item__remove" data-action="remove" aria-label="Quitar ' + escapeHtml(entry.name) + '">&times;</button>' +
    '</li>'
  );
}

function handlePantryListClick(event) {
  try {
    var editBtn = event.target.closest('button[data-action="edit"]');
    if (editBtn) { beginEditPantryRow(editBtn); return; }

    var expiryBtn = event.target.closest('button[data-action="expiry"]');
    if (expiryBtn) { beginEditExpiryRow(expiryBtn); return; }

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

/**
 * Igual que beginEditPantryRow pero para la fecha de caducidad: sustituye
 * el badge por un <input type=date> in situ.
 *
 * Se PRERRELLENA con la estimación cuando no hay fecha manual, para que
 * confirmarla sea un solo gesto si resulta ser correcta -- pero en cuanto
 * se guarda pasa a ser un dato del usuario (`source:"user"`), no una
 * estimación, porque una persona la ha confirmado. Vaciar el campo borra
 * la fecha manual y devuelve la fila a la estimación.
 *
 * @param {HTMLButtonElement} btn
 */
function beginEditExpiryRow(btn) {
  var row = btn.closest(".pantry-item");
  var name = row.getAttribute("data-name");
  var key = row.getAttribute("data-key");
  var state = getPantryState();
  var entry = state[key];

  var current = "";
  if (entry) {
    if (typeof entry.expiresAt === "string" && entry.expiresAt) {
      current = entry.expiresAt.slice(0, 10);
    } else if (typeof resolveExpiry === "function") {
      var info = resolveExpiry(entry, key, new Date().toISOString().slice(0, 10));
      if (info.date) current = info.date;
    }
  }

  var input = document.createElement("input");
  input.type = "date";
  input.className = "pantry-item__expiry-input";
  input.value = current;
  input.setAttribute("aria-label", "Fecha de caducidad de " + name + ". Vacío para volver a la estimación.");

  btn.replaceWith(input);
  input.focus();

  var settled = false;
  function commit() {
    if (settled) return;
    settled = true;
    setExpiry(name, input.value || null);
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

// isEntryFullyCooked() vive ahora en js/core/pantry.js (predicado puro
// sobre la forma de una entry, sin DOM -- js/app.js también lo necesita
// para el gate de "Generar plan", ver cabecera de pantry.js).

/**
 * Igual que isEntryFullyCooked()/isNoCookEntryFullyConsumed() pero
 * despachando por entry.type -- las entradas "sin cocinar" (2026-08-20f)
 * comparten este mismo array de historial con las de plato, distinguidas
 * por type, así que cualquier filtro que recorra pantryHistory entero
 * necesita saber cuál de las dos formas tiene cada entrada.
 * @param {object} entry
 * @returns {boolean}
 */
function isEntryDone(entry) {
  return entry.type === "nocook" ? isNoCookEntryFullyConsumed(entry) : isEntryFullyCooked(entry);
}

/**
 * "Mis planes" (2026-08-23) -- pinta la tira de fechas y, para la fecha
 * elegida (`_selectedPlanDate`, "hoy" por defecto), TODAS sus entries de
 * pantryHistory, pendientes y completadas, reutilizando los mismos
 * renderers de siempre (ver cabecera del archivo). La sección entera ya
 * no se oculta -- el selector de fecha tiene que seguir alcanzable
 * aunque el día elegido no tenga ningún plan, momento en el que se
 * muestra `plansEmptyNoteEl` en su lugar.
 */
function renderPantryHistorySections() {
  var history = getPantryHistory();
  var todayKey = (typeof formatLocalDateKey === "function") ? formatLocalDateKey(new Date()) : "";

  if (!_selectedPlanDate) _selectedPlanDate = todayKey;

  renderDateStrip(todayKey);

  var dayEntries = history.filter(function (e) { return getEntryPlanDate(e) === _selectedPlanDate; });
  var active = dayEntries.filter(function (e) { return !isEntryDone(e); });
  var completed = dayEntries.filter(isEntryDone);

  var html = safeRenderRows(active, renderActiveEntryCard, "active");
  if (completed.length > 0) {
    html += '<div class="pantry-history-heading">Completado</div>' +
      '<ul class="pantry-history">' + safeRenderRows(completed, renderCompletedEntryRow, "history") + '</ul>';
  }

  if (todayPlansContainer) todayPlansContainer.innerHTML = html;
  if (plansEmptyNoteEl) plansEmptyNoteEl.hidden = dayEntries.length > 0;
}

/**
 * Tira de chips de fecha para "Mis planes" -- mismo patrón accesible que
 * .budget-modes (radio oculto + <label> chip, ver index.html). "Hoy"
 * siempre presente aunque no haya ningún plan guardado todavía, para que
 * el usuario nunca se encuentre con una tira vacía; el resto son las
 * fechas distintas de listPlanDates() (más reciente primero), sin
 * duplicar "hoy" si ya tuviera un plan guardado.
 * @param {string} todayKey - "YYYY-MM-DD" de hoy
 */
function renderDateStrip(todayKey) {
  if (!dateStripEl) return;

  var otherDates = (typeof listPlanDates === "function")
    ? listPlanDates().filter(function (d) { return d !== todayKey; })
    : [];
  var allDates = [todayKey].concat(otherDates);

  dateStripEl.innerHTML = allDates.map(function (dateKey, index) {
    var isToday = dateKey === todayKey;
    var inputId = "dateChip" + index;
    var label = isToday ? "Hoy" : formatDateChipLabel(dateKey);
    var checkedAttr = dateKey === _selectedPlanDate ? " checked" : "";
    var todayClass = isToday ? " date-chip--today" : "";
    return (
      '<input type="radio" name="planDate" id="' + inputId + '" value="' + escapeHtml(dateKey) + '" class="visually-hidden"' + checkedAttr + '>' +
      '<label for="' + inputId + '" class="date-chip' + todayClass + '">' + label + '</label>'
    );
  }).join("");
}

/**
 * "23 ago" -- mismo locale/formato corto que formatEntryDateTime(), sin
 * hora (el chip agrupa por día, la hora ya se ve dentro de cada tarjeta).
 * @param {string} dateKey - "YYYY-MM-DD"
 * @returns {string}
 */
function formatDateChipLabel(dateKey) {
  try {
    var parts = dateKey.split("-").map(Number);
    var d = new Date(parts[0], parts[1] - 1, parts[2]);
    return d.toLocaleDateString("es-ES", { day: "2-digit", month: "short" });
  } catch (err) {
    return dateKey;
  }
}

function handleDateStripChange(event) {
  var radio = event.target;
  if (!radio || radio.name !== "planDate") return;
  _selectedPlanDate = radio.value;
  renderPantryHistorySections();
}

/**
 * Fuerza la fecha seleccionada en "Mis planes" a `dateKey` -- usado por
 * app.js justo después de confirmar un plan nuevo (savePlanForToday/
 * saveNoCookPlanForToday siempre guardan bajo la fecha de HOY), para que
 * el plan recién confirmado sea visible sin que el usuario tenga que
 * volver a tocar el chip "Hoy" si estaba mirando otro día. No pinta nada
 * por sí sola -- quien la llama ya renderiza después (ver
 * handleUsePlanToday/handleUseNoCookPlanToday en app.js).
 * @param {string} dateKey - "YYYY-MM-DD"
 */
function selectPlanDate(dateKey) {
  if (dateKey) _selectedPlanDate = dateKey;
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
/**
 * Botón de borrar un plan guardado.
 *
 * Confirma en DOS toques en vez de borrar al primero: un plan puede llevar
 * encima una compra hecha y comidas cocinadas, y eso es historial real que
 * no se puede perder por un roce. No se usa un diálogo porque el resto del
 * panel no usa ninguno; el propio botón se convierte en la pregunta.
 * handleEntryClick() es quien arma y desarma ese estado.
 *
 * @param {object} entry
 * @returns {string}
 */
function renderDeletePlanBtn(entry) {
  return '<button type="button" class="pantry-active-card__delete"' +
    ' data-action="delete-plan" data-id="' + escapeHtml(entry.id) + '"' +
    ' aria-label="Borrar este plan">Borrar</button>';
}

function renderActiveEntryCard(entry) {
  if (entry.type === "nocook") return renderNoCookActiveCard(entry);

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
        renderDeletePlanBtn(entry) +
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
    var chip = (
      '<button type="button" class="pantry-meal-chip' + cookedClass + '" data-action="toggle-meal-cooked" data-id="' + escapeHtml(entry.id) + '" data-meal-key="' + escapeHtml(meal.key) + '" title="' + escapeHtml(meal.label) + '">' +
        timeBadge + (meal.cooked ? "&#10003; " : "") + escapeHtml(meal.label) +
      '</button>'
    );

    // "Cambiar este plato" (per-meal editing, 2026-08-20g) -- solo si la
    // comida no está ya cocinada Y la entry se guardó con los datos que
    // regenerateSingleMeal() necesita (entry.budget + meal.total);
    // entradas guardadas ANTES de esta sesión no los tienen, y ocultar el
    // botón es preferible a mostrarlo y que falle -- ver cabecera de
    // regenerateSingleMeal() en plan-generator.js.
    var swapBtn = (!meal.cooked && typeof entry.budget === "number" && meal.total)
      ? '<button type="button" class="pantry-link-btn" data-action="regenerate-single-meal" data-id="' + escapeHtml(entry.id) + '" data-meal-key="' + escapeHtml(meal.key) + '">cambiar</button>'
      : '';

    return '<span class="pantry-meal-chip-group">' + chip + swapBtn + '</span>';
  }).join("");

  return '<div class="pantry-meal-chips"><span class="pantry-meal-chips__label">Comidas</span>' + chips + '</div>';
}

// ── "Sin cocinar" (2026-08-20f, known issue #9) ──────────────────────────
// Mismas 3 clases CSS que las tarjetas de plato (.pantry-active-card,
// .pantry-meal-chip, .pantry-history-row) -- misma forma visual, sin CSS
// nuevo, solo texto/acciones adaptados a "productos" en vez de "comidas".

/**
 * Tarjeta de un plan "sin cocinar" con algo pendiente (comprar y/o
 * consumir alguna toma) -- equivalente a renderActiveEntryCard() para
 * planes de plato, pero sin checklist de exclusión parcial (los
 * productos son unidades discretas, no hay "cuánto falta" que calcular,
 * ver markNoCookPurchaseDone en pantry.js).
 * @param {object} entry
 * @returns {string}
 */
function renderNoCookActiveCard(entry) {
  var dateLabel = formatEntryDateTime(entry.createdAt);
  var itemCount = (entry.slots || []).reduce(function (sum, s) { return sum + (s.items || []).length; }, 0);

  var purchaseBlock = entry.purchase.done
    ? '<div class="pantry-active-card__purchase pantry-active-card__purchase--done">' +
        '<span class="pantry-active-card__purchase-status">&#10003; Ya compraste esto</span>' +
      '</div>'
    : '<div class="pantry-active-card__purchase">' +
        '<button type="button" class="btn-primary pantry-active-card__buy-btn" data-action="confirm-nocook-purchase" data-id="' + escapeHtml(entry.id) + '">Ya compr&eacute; todo esto</button>' +
      '</div>';

  return (
    '<div class="pantry-active-card" data-id="' + escapeHtml(entry.id) + '">' +
      '<div class="pantry-active-card__head">' +
        '<span class="pantry-active-card__date">' + dateLabel + '</span>' +
        '<span class="pantry-active-card__summary">' + itemCount + ' productos &mdash; sin cocinar</span>' +
        renderDeletePlanBtn(entry) +
      '</div>' +
      purchaseBlock +
      renderNoCookSlotChips(entry) +
    '</div>'
  );
}

/**
 * Un chip compacto por toma (Desayuno/Comida/Snack/Cena) -- equivalente a
 * renderMealChips() para planes de plato. "Consumido" en vez de
 * "cocinado" porque ningún producto "sin cocinar" se cocina de verdad
 * (ver cabecera de no-cook-generator.js: comprado -> abierto/servido/
 * calentado rápido -> comido).
 * @param {object} entry
 * @returns {string}
 */
function renderNoCookSlotChips(entry) {
  var chips = (entry.slots || []).map(function (slot) {
    var consumedClass = slot.consumed ? " pantry-meal-chip--cooked" : "";
    var timeBadge = typeof slot.time === "string"
      ? '<span class="pantry-meal-chip__time">' + escapeHtml(slot.time) + '</span>'
      : '';
    return (
      '<button type="button" class="pantry-meal-chip' + consumedClass + '" data-action="toggle-nocook-slot-consumed" data-id="' + escapeHtml(entry.id) + '" data-slot-key="' + escapeHtml(slot.key) + '" title="' + escapeHtml(slot.label) + '">' +
        timeBadge + (slot.consumed ? "&#10003; " : "") + escapeHtml(slot.label) +
      '</button>'
    );
  }).join("");

  return '<div class="pantry-meal-chips"><span class="pantry-meal-chips__label">Tomas</span>' + chips + '</div>';
}

/**
 * Fila de resumen de solo lectura para un plan "sin cocinar" ya
 * completado (todas las tomas consumidas) -- equivalente a
 * renderCompletedEntryRow() para planes de plato.
 * @param {object} entry
 * @returns {string}
 */
function renderNoCookCompletedRow(entry) {
  var dateLabel = formatEntryDateTime(entry.createdAt);
  var itemCount = (entry.slots || []).reduce(function (sum, s) { return sum + (s.items || []).length; }, 0);
  var boughtNote = entry.purchase.done ? "comprado y consumido" : "consumido (sin registrar compra)";

  return (
    '<li class="pantry-history-row">' +
      '<span class="pantry-history-row__date">' + dateLabel + '</span>' +
      '<span class="pantry-history-row__summary">' + itemCount + ' productos &mdash; ' + boughtNote + ' &#10003;</span>' +
    '</li>'
  );
}

// ── Diálogo "ya tienes un plan activo hoy" ──────────────────────────────

/**
 * Abre el diálogo que interrumpe "Generar plan" cuando ya hay una entrada
 * de hoy con algo real encima y algo todavía pendiente (ver "Gate en
 * Generar plan..." en la cabecera de js/core/pantry.js) -- redirige
 * visualmente a esa tarjeta (scroll) y pregunta explícitamente antes de
 * generar nada nuevo. Mismo patrón que el diálogo de conflicto de
 * sincronización (render-auth.js): `<dialog>` nativo, .showModal()/.close()
 * con reserva para navegadores sin soporte.
 * @param {object} entry
 */
function showPlanReplaceDialog(entry) {
  if (!planReplaceDialogEl || !entry) return;
  _planReplaceEntryId = entry.id;

  var cookedMeals = (entry.meals || []).filter(function (m) { return m.cooked; });
  var pendingMeals = (entry.meals || []).filter(function (m) { return !m.cooked; });
  var pendingLabels = pendingMeals.map(function (m) { return m.label; }).join(", ");

  var cookedNote = cookedMeals.length > 0
    ? '<p class="plan-replace-dialog__note">Ya cocinaste ' + escapeHtml(cookedMeals.map(function (m) { return m.label; }).join(", ")) +
      ' hoy &mdash; eso se mantiene tal cual, solo cambiaría el resto.</p>'
    : '';

  if (planReplaceBodyEl) {
    planReplaceBodyEl.innerHTML =
      '<p>Tu plan de ' + escapeHtml(formatEntryDateTime(entry.createdAt)) + ' sigue activo: <strong>' +
      escapeHtml(pendingLabels) + '</strong> todavía por comprar o cocinar.</p>' + cookedNote;
  }

  if (typeof planReplaceDialogEl.showModal === "function") {
    planReplaceDialogEl.showModal();
  } else {
    planReplaceDialogEl.setAttribute("open", "");
  }

  if (todayPlansPanel && typeof todayPlansPanel.scrollIntoView === "function") {
    todayPlansPanel.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function hidePlanReplaceDialog() {
  if (!planReplaceDialogEl) return;
  if (typeof planReplaceDialogEl.close === "function" && planReplaceDialogEl.open) {
    planReplaceDialogEl.close();
  } else {
    planReplaceDialogEl.removeAttribute("open");
  }
  _planReplaceEntryId = null;
}

// ── Diálogo de despensa (2026-08-23) ────────────────────────────────────

/**
 * Abre el diálogo de despensa -- mismo patrón que showPlanReplaceDialog()
 * más arriba. Sin contenido que preparar antes de abrir: el stock ya
 * está pintado por renderPantryPanel() (se llama en cada mutación, ver
 * app.js), así que solo hace falta mostrar el <dialog>.
 */
function showDespensaDialog() {
  if (!despensaDialogEl) return;
  if (typeof despensaDialogEl.showModal === "function") {
    despensaDialogEl.showModal();
  } else {
    despensaDialogEl.setAttribute("open", "");
  }
}

function hideDespensaDialog() {
  if (!despensaDialogEl) return;
  if (typeof despensaDialogEl.close === "function" && despensaDialogEl.open) {
    despensaDialogEl.close();
  } else {
    despensaDialogEl.removeAttribute("open");
  }
}

/**
 * Fila de solo lectura para un plan ya completado -- vive dentro del
 * <details> "Ver planes anteriores", colapsado por defecto.
 * @param {object} entry
 * @returns {string}
 */
function renderCompletedEntryRow(entry) {
  if (entry.type === "nocook") return renderNoCookCompletedRow(entry);

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

// Botón de borrar actualmente armado (solo puede haber uno). Se guarda el
// elemento y no un id: al re-renderizar el panel el nodo desaparece, y
// entonces no hay nada que desarmar -- el estado se va con él, que es lo
// que se quiere.
var _armedDeleteBtn = null;
var _armedDeleteTimer = null;

function _armDeletePlanBtn(btn) {
  _disarmDeletePlanBtn();
  btn.setAttribute("data-armed", "true");
  btn.classList.add("pantry-active-card__delete--armed");
  btn.textContent = "¿Seguro?";
  _armedDeleteBtn = btn;
  // Se desarma solo: un botón que se queda preguntando para siempre acaba
  // pulsándose sin querer en la visita siguiente.
  _armedDeleteTimer = window.setTimeout(_disarmDeletePlanBtn, 4000);
}

function _disarmDeletePlanBtn() {
  if (_armedDeleteTimer) { window.clearTimeout(_armedDeleteTimer); _armedDeleteTimer = null; }
  if (!_armedDeleteBtn) return;
  if (_armedDeleteBtn.isConnected) {
    _armedDeleteBtn.removeAttribute("data-armed");
    _armedDeleteBtn.classList.remove("pantry-active-card__delete--armed");
    _armedDeleteBtn.textContent = "Borrar";
  }
  _armedDeleteBtn = null;
}

function handleEntryClick(event) {
  try {
    // ── Borrar un plan guardado, en dos toques ────────────────────────
    // El primero ARMA el botón (se convierte en la pregunta), el segundo
    // borra. Un plan puede llevar una compra hecha y comidas cocinadas
    // encima; perder eso por un roce no es aceptable, y el panel no usa
    // diálogos en ningún otro sitio.
    var deleteBtn = event.target.closest('button[data-action="delete-plan"]');
    if (deleteBtn) {
      if (deleteBtn.getAttribute("data-armed") !== "true") {
        _armDeletePlanBtn(deleteBtn);
        return;
      }
      _disarmDeletePlanBtn();
      if (typeof deletePlanEntry === "function") deletePlanEntry(deleteBtn.getAttribute("data-id"));
      renderPantryPanel();
      pantryOnChange();
      return;
    }
    // Un toque en cualquier otro sitio de la tarjeta cancela la pregunta:
    // así no se queda un botón armado esperando a que alguien lo roce.
    _disarmDeletePlanBtn();

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

    // "Cambiar este plato" (per-meal editing, 2026-08-20g) -- re-elige UN
    // plato para esta toma (regenerateSingleMeal, plan-generator.js) sin
    // tocar las otras 4, y lo aplica sobre la entry ya guardada
    // (replaceSingleMealForEntry, pantry.js). El único error realista
    // desde la UI (el botón ya está oculto si la comida está cocinada o
    // si a la entry le faltan los datos que esto necesita, ver
    // renderMealChips) es no_alternative_found -- ni relajando tiempo/
    // sabor al máximo cabe nada en lo que queda de presupuesto del día;
    // se muestra en el propio botón en vez de fallar en silencio.
    var regenBtn = event.target.closest('button[data-action="regenerate-single-meal"]');
    if (regenBtn) {
      var regenEntryId = regenBtn.getAttribute("data-id");
      var regenMealKey = regenBtn.getAttribute("data-meal-key");
      var regenEntry = (typeof getPantryHistory === "function")
        ? getPantryHistory().find(function (e) { return e.id === regenEntryId; })
        : null;
      if (!regenEntry) return;

      var pantryStateForRegen = (typeof getPantryState === "function") ? getPantryState() : null;
      var regen = (typeof regenerateSingleMeal === "function")
        ? regenerateSingleMeal(regenEntry, regenMealKey, pantryStateForRegen)
        : { error: "not_available" };

      if (!regen || regen.error) {
        regenBtn.textContent = "sin alternativa dentro del presupuesto";
        regenBtn.disabled = true;
        return;
      }

      replaceSingleMealForEntry(regenEntryId, regenMealKey, regen.meal);
      renderPantryPanel();
      pantryOnChange();
      return;
    }

    // "Sin cocinar" (2026-08-20f) -- mismos data-action que las de arriba,
    // solo el nombre cambia, para no colisionar con los de plato.
    var confirmNoCookBtn = event.target.closest('button[data-action="confirm-nocook-purchase"]');
    if (confirmNoCookBtn) {
      markNoCookPurchaseDone(confirmNoCookBtn.getAttribute("data-id"));
      renderPantryPanel();
      pantryOnChange();
      return;
    }

    var consumeChip = event.target.closest('button[data-action="toggle-nocook-slot-consumed"]');
    if (consumeChip) {
      var ncId = consumeChip.getAttribute("data-id");
      var slotKey = consumeChip.getAttribute("data-slot-key");
      var alreadyConsumed = consumeChip.classList.contains("pantry-meal-chip--cooked");

      markNoCookSlotConsumed(ncId, slotKey, !alreadyConsumed);
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
 * Pinta el aviso inmediatamente después de "Confirmar plan de hoy". `mode`
 * distingue los 3 casos posibles, cada uno con un mensaje pensado para
 * despejar una duda distinta:
 *   - 'created': primera confirmación de hoy -- entrada nueva.
 *   - 'draft-updated': se actualizó un borrador de hoy sin acción real
 *     todavía (UPSERT normal, savePlanForToday) -- tranquiliza la duda que
 *     motivó ese cambio ("¿esto añade algo a mi despensa?").
 *   - 'active-replaced': el usuario confirmó explícitamente "Cambiar el
 *     plan completo" sobre un plan que YA tenía algo real encima
 *     (replacePendingMealsForToday, ver "Gate en Generar plan..." en
 *     pantry.js) -- avisa de que las comidas ya cocinadas se conservaron y
 *     de que el estado de compra se reinició porque los ingredientes
 *     pueden haber cambiado.
 * @param {object} entry - entry de historial devuelta por savePlanForToday
 *   o replacePendingMealsForToday
 * @param {boolean} historySaved - si el guardado en localStorage tuvo éxito
 * @param {'created'|'draft-updated'|'active-replaced'} mode
 */
function renderPlanSavedNotice(entry, historySaved, mode, savedDays) {
  if (!planSavedNoticeEl) return;

  if (!entry) {
    planSavedNoticeEl.hidden = true;
    planSavedNoticeEl.innerHTML = "";
    return;
  }

  var warning = historySaved ? "" :
    '<p class="confirm-receipt__warning">No se ha podido guardar en este navegador (almacenamiento lleno o deshabilitado) &mdash; los cambios no persistir&aacute;n al recargar.</p>';

  var title, body;
  if (mode === "active-replaced") {
    title = "Plan reemplazado";
    var cookedLabels = (entry.meals || []).filter(function (m) { return m.cooked; }).map(function (m) { return m.label; });
    var cookedNote = cookedLabels.length > 0
      ? ' Lo que ya cocinaste (' + escapeHtml(cookedLabels.join(", ")) + ') se mantuvo tal cual.'
      : '';
    body = '<p>Se actualizó tu plan activo de hoy en <strong>Mis planes</strong>.' + cookedNote +
      ' Como los ingredientes pueden haber cambiado, marca <strong>Ya compr&eacute; todo esto</strong> de nuevo cuando compres.</p>';
  } else if (mode === "draft-updated") {
    title = "Plan actualizado";
    body = '<p>Sigue siendo el mismo plan de hoy en <strong>Mis planes</strong> &mdash; no se ha comprado ni cocinado nada todav&iacute;a, ni se ha a&ntilde;adido nada a tu despensa.</p>';
  } else if (typeof savedDays === "number" && savedDays > 1) {
    // Un plan de varios días guarda una entrada POR DÍA, y hay que decirlo:
    // si no, se ve solo la de hoy en pantalla y parece que el resto se
    // perdió (que es justo lo que pasaba de verdad antes del 2026-09-03).
    title = "Plan de " + savedDays + " días confirmado";
    body = '<p>Se ha guardado un plan para cada uno de los <strong>' + savedDays +
      ' d&iacute;as</strong>, empezando hoy. Cambia de d&iacute;a con los botones de fecha de ' +
      '<strong>Mis planes</strong>. Cuando compres, toca <strong>Ya compr&eacute; todo esto</strong> ' +
      'en el d&iacute;a que corresponda.</p>';
  } else {
    title = "Plan confirmado";
    body = '<p>Cuando compres, toca <strong>Ya compr&eacute; todo esto</strong> ah&iacute; abajo, en <strong>Mis planes</strong> &mdash; as&iacute; no te lo volver&aacute; a pedir la pr&oacute;xima vez.</p>';
  }

  planSavedNoticeEl.hidden = false;
  planSavedNoticeEl.innerHTML = '<h4>' + title + '</h4>' + warning + body;
}
