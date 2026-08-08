/**
 * js/ui/render-schedule.js
 * ─────────────────────────────────────────────────────────────────────────
 * Capa de presentación del horario de comidas. Toda la lógica (a qué hora
 * es cada toma, cuál es "la siguiente", si el día queda comprimido) vive
 * en js/core/meal-schedule.js — este archivo solo construye HTML y
 * gestiona la interacción de la franja de horario, igual que render.js /
 * render-shopping-list.js hacen para sus paneles.
 *
 * Expone dos tipos de pieza reutilizable:
 *   1. renderScheduleTimeline(meals) — la franja completa "horario del
 *      día" (arriba del todo en el panel de resultados, ver index.html).
 *   2. renderMealTimeBadge(meal) / renderMealCookNote(meal) — fragmentos
 *      pequeños que render.js inserta dentro de cada tarjeta de comida, y
 *      que render-no-cook.js reutiliza para las tomas de "sin cocinar" —
 *      así la hora se calcula y se formatea en un solo sitio para los dos
 *      flujos, nunca duplicado.
 *
 * Depende de:
 *   js/core/utils.js         (escapeHtml)
 *   js/core/meal-schedule.js (findNextMealIndex, isScheduleCompact,
 *                              getCookStartTime) — opcional, con
 *                              comprobación defensiva por si algún día se
 *                              carga sin él (mismo patrón que
 *                              lookupPackagingInfo en render.js)
 *
 * Inicialización obligatoria (solo para la franja completa):
 *   Llamar a initScheduleRefs(refs) desde js/app.js antes de usar
 *   renderScheduleTimeline(). Los fragmentos sueltos (badge/cook-note) no
 *   la necesitan.
 *
 * Expone (globales):
 *   initScheduleRefs(refs)
 *   renderScheduleTimeline(meals)
 *   renderMealTimeBadge(meal)
 *   renderMealCookNote(meal)
 * ─────────────────────────────────────────────────────────────────────────
 */

var scheduleTimelineEl;
var nextMealStickyEl;

/**
 * Conecta el contenedor de la franja de horario (y, si se pasa, la barra
 * compacta sticky de "próxima comida" para mobile) y engancha la
 * delegación de clic (cada chip permite saltar a su tarjeta de comida).
 * @param {object} refs
 * @param {HTMLElement} refs.scheduleTimeline
 * @param {HTMLElement} [refs.nextMealSticky]
 */
function initScheduleRefs(refs) {
  scheduleTimelineEl = refs && refs.scheduleTimeline;
  nextMealStickyEl = refs && refs.nextMealSticky;
  if (scheduleTimelineEl) {
    scheduleTimelineEl.addEventListener("click", handleTimelineClick);
  }
  if (nextMealStickyEl) {
    nextMealStickyEl.addEventListener("click", handleTimelineClick);
  }
}

/**
 * Oculta y vacía tanto la franja completa como la barra sticky de mobile
 * — llamado desde clearOutput() en app.js (botón "Resetear") para que no
 * quede un horario de un plan que ya no está en pantalla.
 */
function clearScheduleUI() {
  if (scheduleTimelineEl) {
    scheduleTimelineEl.hidden = true;
    scheduleTimelineEl.innerHTML = "";
  }
  if (nextMealStickyEl) {
    nextMealStickyEl.hidden = true;
    nextMealStickyEl.innerHTML = "";
  }
}

function handleTimelineClick(event) {
  var chip = event.target.closest("button[data-meal-key]");
  if (!chip) return;
  scrollToMealCard(chip.getAttribute("data-meal-key"));
}

/**
 * Busca la tarjeta de comida cuyo data-meal-key coincide y hace scroll
 * hasta ella. No usa querySelector con la clave interpolada en el
 * selector (evita construir CSS a partir de datos) — recorre las
 * tarjetas y compara el atributo directamente.
 * @param {string} key
 */
function scrollToMealCard(key) {
  if (typeof mealsContainer === "undefined" || !mealsContainer || !key) return;
  var cards = mealsContainer.querySelectorAll(".meal-card[data-meal-key]");
  for (var i = 0; i < cards.length; i++) {
    if (cards[i].getAttribute("data-meal-key") === key) {
      cards[i].scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
  }
}

// ── Franja "horario del día" ──────────────────────────────────────────────

/**
 * Pinta la franja completa del horario del día: un chip por toma con su
 * hora, resaltando la próxima (comparada contra la hora actual del
 * dispositivo) y con una nota si la ventana elegida deja las tomas muy
 * juntas. Se oculta por completo si ninguna comida tiene hora calculada
 * (plan vacío, o el propio cálculo de horario falló de forma aislada —
 * ver safeInit en app.js).
 *
 * @param {object[]} meals - salida de computeMealSchedule() (con .time/.timeMinutes)
 */
function renderScheduleTimeline(meals) {
  if (!scheduleTimelineEl) return;

  var list = meals || [];
  var scheduled = list.filter(function (m) { return m && typeof m.timeMinutes === "number"; });

  if (scheduled.length === 0) {
    clearScheduleUI();
    return;
  }

  var nextMeal = null;
  if (typeof findNextMealIndex === "function") {
    var now = new Date();
    var nextIndex = findNextMealIndex(list, now.getHours() * 60 + now.getMinutes());
    if (nextIndex >= 0 && list[nextIndex]) nextMeal = list[nextIndex];
  }
  var nextKey = nextMeal ? nextMeal.key : null;

  var chips = list.map(function (meal) { return renderTimelineChip(meal, meal.key === nextKey); }).join("");

  var compact = typeof isScheduleCompact === "function" && isScheduleCompact(list);
  var note = compact
    ? '<p class="schedule-timeline__note">Horario ajustado: la ventana elegida deja poco margen entre tomas. Prueba a adelantar la hora de despertar o retrasar la hora de dormir para un reparto más cómodo.</p>'
    : "";

  scheduleTimelineEl.hidden = false;
  scheduleTimelineEl.innerHTML = '<div class="schedule-timeline__row">' + chips + '</div>' + note;

  renderNextMealSticky(nextMeal);
}

/**
 * Barra compacta sticky (solo mobile, ver CSS) con la próxima comida y su
 * hora — para que se pueda ver sin desplazarse, sin importar en qué parte
 * de la página esté el usuario (formulario largo antes de los resultados
 * en mobile, ver cabecera de index.html). Reutiliza el mismo `nextMeal`
 * que ya calculó renderScheduleTimeline -- nunca vuelve a llamar a
 * findNextMealIndex().
 * @param {object|null} nextMeal
 */
function renderNextMealSticky(nextMeal) {
  if (!nextMealStickyEl) return;

  if (!nextMeal || typeof nextMeal.time !== "string") {
    nextMealStickyEl.hidden = true;
    nextMealStickyEl.innerHTML = "";
    return;
  }

  nextMealStickyEl.hidden = false;
  nextMealStickyEl.innerHTML = (
    '<button type="button" class="next-meal-sticky__btn" data-meal-key="' + escapeHtml(nextMeal.key) + '">' +
      '<span class="next-meal-sticky__eyebrow">Siguiente</span>' +
      '<span class="next-meal-sticky__time">' + escapeHtml(nextMeal.time) + '</span>' +
      '<span class="next-meal-sticky__label">' + escapeHtml(nextMeal.label) + '</span>' +
    '</button>'
  );
}

function renderTimelineChip(meal, isNext) {
  if (typeof meal.timeMinutes !== "number") return "";
  return (
    '<button type="button" class="schedule-timeline__item' + (isNext ? ' schedule-timeline__item--next' : '') + '" data-meal-key="' + escapeHtml(meal.key) + '">' +
      '<span class="schedule-timeline__time">' + escapeHtml(meal.time) + '</span>' +
      '<span class="schedule-timeline__label">' + escapeHtml(meal.label) + '</span>' +
      (isNext ? '<span class="schedule-timeline__next-tag">Siguiente</span>' : '') +
    '</button>'
  );
}

// ── Fragmentos reutilizables (tarjeta de comida / toma sin cocinar) ───────

/**
 * Badge de hora para el encabezado de una tarjeta de comida. Cadena vacía
 * si la comida no tiene hora calculada (plan viejo del historial, o el
 * cálculo de horario falló de forma aislada) — nunca un "undefined" visible.
 * @param {object} meal
 * @returns {string}
 */
function renderMealTimeBadge(meal) {
  if (!meal || typeof meal.time !== "string") return "";
  return '<span class="meal-time-badge">' + escapeHtml(meal.time) + '</span>';
}

/**
 * Nota discreta "empieza a cocinar sobre las HH:MM" bajo el encabezado,
 * solo cuando la preparación es lo bastante larga como para importar (>=
 * 10 min) — evita ruido para platos casi listos. Usa
 * getCookStartTime(meal), ya lista en meal-schedule.js.
 * @param {object} meal
 * @returns {string}
 */
function renderMealCookNote(meal) {
  if (!meal || (meal.prep || 0) < 10) return "";
  if (typeof getCookStartTime !== "function") return "";
  var cookStart = getCookStartTime(meal);
  if (!cookStart) return "";
  return (
    '<div class="meal-cook-note">Empieza a cocinar sobre las <strong>' + escapeHtml(cookStart) +
    '</strong> (' + (meal.prep || 0) + ' min)</div>'
  );
}
