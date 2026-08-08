/**
 * js/core/meal-schedule.js
 * ─────────────────────────────────────────────────────────────────────────
 * Horario de comidas: a partir de un array de meals YA generado (por
 * generateDietPlan() o por generateNoCookPlan()) y las preferencias de
 * despertar/dormir del usuario, calcula A QUÉ HORA se come cada toma y
 * devuelve el mismo array reordenado cronológicamente.
 *
 * Deliberadamente independiente de dish-selector.js/plan-generator.js —
 * igual que pricing.js o pantry.js, este módulo no sabe cómo se ELIGE un
 * plato, solo trabaja sobre la forma ya construida { key, label, ... }.
 * Se llama DESPUÉS de generateDietPlan()/generateNoCookPlan(), nunca desde
 * dentro — así ninguna de las dos "generaciones" cambia de comportamiento
 * ni de tests por la existencia de este archivo.
 *
 * Modelo elegido — "reparto uniforme anclado" (ver STATE.md para el porqué
 * completo): las comidas se ordenan cronológicamente por un tipo semántico
 * (desayuno → comida → cena, con los snacks intercalados) y luego se
 * reparten a INTERVALOS IGUALES dentro de la ventana despertar→dormir (con
 * un margen tras despertar y otro antes de dormir) — no horas fijas
 * hardcodeadas. Con 3, 4, 5 o más tomas, el resultado siempre respeta:
 * primera toma cerca de despertar, última cerca de dormir, e intervalos
 * iguales entre medias.
 *
 * Preparado para "cooking reminders" futuros sin rediseño: cada meal ya
 * trae `.prep` (minutos de preparación, existente) — getCookStartTime()
 * simplemente resta prep a la hora de comer. No se expone ningún
 * recordatorio en la UI todavía (fuera de alcance de esta sesión), pero la
 * función ya existe y está testeada.
 *
 * Depende de: nada (funciones puras; readScheduleSettings() es la única
 * que toca `document`, y se degrada con seguridad si no existe).
 *
 * Expone (globales):
 *   DEFAULT_WAKE_TIME / DEFAULT_SLEEP_TIME  (strings "HH:MM")
 *   parseTimeToMinutes(str) → number|null
 *   formatMinutesToTime(min) → "HH:MM"
 *   sanitizeScheduleSettings(raw) → { windowStart, windowLen, wakeMinutes, sleepMinutes, usedFallback }
 *   sortMealsChronologically(meals) → meal[] (nuevo array, mismos objetos)
 *   computeMealSchedule(meals, rawSettings) → meal[] (ordenado, con .time/.timeMinutes)
 *   isScheduleCompact(meals) → boolean
 *   findNextMealIndex(meals, nowMinutes) → number (-1 si no hay ninguna con hora)
 *   getCookStartMinutes(meal) / getCookStartTime(meal) → number|null / "HH:MM"|null
 *   readScheduleSettings() → { wakeTime, sleepTime } (lee el DOM; null si no hay valor)
 * ─────────────────────────────────────────────────────────────────────────
 */

var DEFAULT_WAKE_TIME  = "07:00";
var DEFAULT_SLEEP_TIME = "23:00";

// Margen tras despertar antes de la primera comida, y margen antes de
// dormir tras la última — evita "desayuno justo al abrir los ojos" o
// "cena pegada a la hora de dormir". Si no caben (ventana muy corta), se
// descartan y se usa la ventana cruda despertar→dormir sin margen (ver
// sanitizeScheduleSettings) en vez de producir un resultado imposible.
var WAKE_BUFFER_MIN  = 30;
var SLEEP_BUFFER_MIN = 90;

// Por debajo de esto la ventana despertar→dormir se considera inválida de
// verdad (p.ej. inputs corruptos que casi se solapan) y se cae a los
// valores por defecto en vez de repartir comidas en unos pocos minutos.
var MIN_RAW_WINDOW_MINUTES = 60;

// Umbral para marcar el horario como "comprimido" (isScheduleCompact) —
// puramente informativo, nunca bloquea nada: por debajo de esto entre dos
// tomas consecutivas, la UI puede avisar de que la ventana elegida deja
// poco margen.
var COMPACT_GAP_MINUTES = 60;

// ── Orden cronológico ───────────────────────────────────────────────────

/**
 * Rango semántico por clave de comida — cuanto más bajo, más temprano.
 * Cubre las claves reales usadas hoy por MEAL_DEFS (plan-generator.js) y
 * NO_COOK_SLOT_DEFS (no-cook-generator.js), más alias en español.
 *
 * "snack"/"snack1" se modela como merienda de MEDIA MAÑANA (entre desayuno
 * y comida) por convención — es la lectura correcta para las 5 tomas del
 * generador principal (snack1 antes de comida, snack2 después). Para el
 * modo "sin cocinar" (4 tomas: desayuno/comida/snack/cena) esto coloca su
 * único snack a media mañana en vez de por la tarde — ambas lecturas son
 * defendibles (ese módulo nunca especificó momento del día para su
 * snack); se documenta aquí en vez de intentar adivinar por contexto.
 */
var MEAL_TIME_RANK = {
  breakfast: 0, desayuno: 0,
  snack: 1, snack1: 1,
  lunch: 2, comida: 2,
  snack2: 3, merienda: 3,
  dinner: 4, cena: 4,
  snack3: 5
};

/**
 * Rango de una comida para ordenarla cronológicamente. Claves conocidas
 * usan MEAL_TIME_RANK; una clave desconocida (motor futuro, categoría
 * nueva) se reparte PROPORCIONALMENTE según su posición original dentro
 * del array, para degradar con gracia sin romper el orden de las demás.
 * @param {object} meal
 * @param {number} index - posición original en el array de entrada
 * @param {number} total - longitud del array de entrada
 * @returns {number}
 */
function rankForMeal(meal, index, total) {
  var key = String((meal && meal.key) || "").trim().toLowerCase();
  if (Object.prototype.hasOwnProperty.call(MEAL_TIME_RANK, key)) {
    return MEAL_TIME_RANK[key];
  }
  if (total <= 1) return 2;
  return (index / (total - 1)) * 4;
}

/**
 * Devuelve un NUEVO array con las mismas comidas (mismas referencias de
 * objeto, no copias) ordenadas cronológicamente. Empate estable por
 * posición original.
 * @param {object[]} meals
 * @returns {object[]}
 */
function sortMealsChronologically(meals) {
  var list = Array.isArray(meals) ? meals : [];
  var total = list.length;
  return list
    .map(function (meal, index) {
      return { meal: meal, index: index, rank: rankForMeal(meal, index, total) };
    })
    .sort(function (a, b) {
      return a.rank - b.rank || a.index - b.index;
    })
    .map(function (entry) { return entry.meal; });
}

// ── Utilidades de tiempo ─────────────────────────────────────────────────

/**
 * "HH:MM" → minutos desde medianoche, o null si no es un "HH:MM" válido
 * (incluye el caso de campo vacío/borrado por el usuario).
 * @param {*} str
 * @returns {number|null}
 */
function parseTimeToMinutes(str) {
  if (typeof str !== "string") return null;
  var match = /^(\d{1,2}):(\d{2})$/.exec(str.trim());
  if (!match) return null;
  var h = Number(match[1]);
  var m = Number(match[2]);
  if (!isFinite(h) || !isFinite(m) || h < 0 || h > 23 || m < 0 || m > 59) return null;
  return h * 60 + m;
}

/**
 * Normaliza minutos a [0, 1439] (envuelve medianoche en cualquier
 * dirección, incluidos valores negativos).
 * @param {number} min
 * @returns {number}
 */
function normalizeMinutes(min) {
  var m = Math.round(min) % 1440;
  if (m < 0) m += 1440;
  return m;
}

/**
 * Minutos desde medianoche → "HH:MM" (con envoltura de medianoche).
 * @param {number} min
 * @returns {string}
 */
function formatMinutesToTime(min) {
  var m = normalizeMinutes(min);
  var h = Math.floor(m / 60);
  var mm = m % 60;
  return (h < 10 ? "0" : "") + h + ":" + (mm < 10 ? "0" : "") + mm;
}

function roundToNearestFive(min) {
  return Math.round(min / 5) * 5;
}

/**
 * Longitud en minutos de la ventana despertar→dormir, asumiendo que dormir
 * es SIEMPRE "después" de despertar en el reloj de 24h del día (envuelve
 * medianoche si sleepMin <= wakeMin — turno de noche, o cualquier
 * combinación rara). wake === sleep se trata como "despierto todo el
 * día" (24h), no como un error — no revienta, solo reparte las comidas a
 * lo largo del día entero.
 * @param {number} wakeMin
 * @param {number} sleepMin
 * @returns {number}
 */
function windowLength(wakeMin, sleepMin) {
  var diff = sleepMin - wakeMin;
  return diff > 0 ? diff : diff + 1440;
}

// ── Saneamiento de preferencias ──────────────────────────────────────────

/**
 * Convierte { wakeTime, sleepTime } (strings "HH:MM", posiblemente
 * ausentes/inválidos/vacíos) en una ventana de reparto ya resuelta.
 * Nunca lanza y nunca produce una ventana vacía o negativa:
 *
 *   1. Valores ausentes/inválidos individualmente → caen a
 *      DEFAULT_WAKE_TIME/DEFAULT_SLEEP_TIME.
 *   2. Si la ventana cruda resultante es < MIN_RAW_WINDOW_MINUTES (p.ej.
 *      despertar y dormir casi coinciden), se descartan AMBOS valores y se
 *      usan los dos por defecto.
 *   3. Se intenta aplicar el margen despertar/dormir (WAKE_BUFFER_MIN/
 *      SLEEP_BUFFER_MIN); si no caben, se usa la ventana cruda sin margen
 *      en vez de devolver una ventana todavía más pequeña.
 *
 * @param {{wakeTime?: string, sleepTime?: string}} [raw]
 * @returns {{ windowStart:number, windowLen:number, wakeMinutes:number, sleepMinutes:number, usedFallback:boolean }}
 */
function sanitizeScheduleSettings(raw) {
  var defaultWake  = parseTimeToMinutes(DEFAULT_WAKE_TIME);
  var defaultSleep = parseTimeToMinutes(DEFAULT_SLEEP_TIME);

  var wake  = parseTimeToMinutes(raw && raw.wakeTime);
  var sleep = parseTimeToMinutes(raw && raw.sleepTime);
  var usedFallback = false;

  if (wake === null || sleep === null) {
    usedFallback = true;
    wake  = wake  === null ? defaultWake  : wake;
    sleep = sleep === null ? defaultSleep : sleep;
  }

  var rawLen = windowLength(wake, sleep);
  if (rawLen < MIN_RAW_WINDOW_MINUTES) {
    wake = defaultWake;
    sleep = defaultSleep;
    rawLen = windowLength(wake, sleep);
    usedFallback = true;
  }

  var bufferedLen = rawLen - WAKE_BUFFER_MIN - SLEEP_BUFFER_MIN;
  var windowStart, windowLen;

  if (bufferedLen >= MIN_RAW_WINDOW_MINUTES / 2) {
    windowStart = wake + WAKE_BUFFER_MIN;
    windowLen   = bufferedLen;
  } else {
    // No hay margen suficiente para los colchones de despertar/dormir --
    // mejor un horario ajustado a la ventana real que uno que ignore la
    // preferencia del usuario o produzca un hueco negativo.
    windowStart = wake;
    windowLen   = rawLen;
  }

  return {
    windowStart: windowStart,
    windowLen: windowLen,
    wakeMinutes: wake,
    sleepMinutes: sleep,
    usedFallback: usedFallback
  };
}

// ── Cálculo del horario ──────────────────────────────────────────────────

/**
 * Calcula y asigna `.time` ("HH:MM") y `.timeMinutes` (número) a cada
 * comida de `meals`, y devuelve el array REORDENADO cronológicamente
 * (mismos objetos meal, mutados in-place con los dos campos nuevos — el
 * resto de campos, incluidos por completo). Con esto, el resto de la app
 * (renderMeals, savePlanForToday, renderShoppingList...) sigue
 * funcionando exactamente igual, solo que ahora en orden de reloj y con
 * hora disponible si quiere usarla.
 *
 * Reparto: intervalos IGUALES entre `windowStart` y `windowStart+windowLen`
 * (primera comida en windowStart, última en el extremo opuesto; con 1 sola
 * comida, en el punto medio). Nunca lanza — con un array vacío/no-array
 * devuelve tal cual (o []).
 *
 * @param {object[]} meals
 * @param {{wakeTime?:string, sleepTime?:string}} [rawSettings]
 * @returns {object[]}
 */
function computeMealSchedule(meals, rawSettings) {
  if (!Array.isArray(meals) || meals.length === 0) return meals || [];

  var settings = sanitizeScheduleSettings(rawSettings);
  var ordered  = sortMealsChronologically(meals);
  var n = ordered.length;

  ordered.forEach(function (meal, i) {
    var raw = (n === 1)
      ? settings.windowStart + settings.windowLen / 2
      : settings.windowStart + (settings.windowLen * i) / (n - 1);

    var minutes = normalizeMinutes(roundToNearestFive(raw));
    meal.timeMinutes = minutes;
    meal.time = formatMinutesToTime(minutes);
  });

  return ordered;
}

/**
 * True si dos comidas consecutivas (por timeMinutes, ya calculado) quedan
 * a menos de COMPACT_GAP_MINUTES entre sí — puramente informativo para la
 * UI (ver render-schedule.js), nunca cambia el cálculo en sí.
 * @param {object[]} meals - salida de computeMealSchedule (con .timeMinutes)
 * @returns {boolean}
 */
function isScheduleCompact(meals) {
  var scheduled = (meals || [])
    .filter(function (m) { return m && typeof m.timeMinutes === "number"; })
    .slice()
    .sort(function (a, b) { return a.timeMinutes - b.timeMinutes; });

  for (var i = 1; i < scheduled.length; i++) {
    if (scheduled[i].timeMinutes - scheduled[i - 1].timeMinutes < COMPACT_GAP_MINUTES) return true;
  }
  return false;
}

/**
 * Índice (en `meals`) de la próxima comida respecto a `nowMinutes` — la de
 * hora más próxima que todavía no ha pasado hoy; si todas ya pasaron,
 * envuelve a la primera del día (la de mañana). -1 si ninguna comida tiene
 * hora calculada.
 * @param {object[]} meals - con .timeMinutes ya calculado
 * @param {number} nowMinutes - minutos desde medianoche del momento actual
 * @returns {number}
 */
function findNextMealIndex(meals, nowMinutes) {
  var withIndex = (meals || [])
    .map(function (m, i) { return { i: i, t: m && m.timeMinutes }; })
    .filter(function (x) { return typeof x.t === "number"; });

  if (withIndex.length === 0) return -1;

  var upcoming = withIndex
    .filter(function (x) { return x.t >= nowMinutes; })
    .sort(function (a, b) { return a.t - b.t; });

  if (upcoming.length > 0) return upcoming[0].i;

  var earliest = withIndex.slice().sort(function (a, b) { return a.t - b.t; });
  return earliest[0].i;
}

// ── Preparado para el futuro: hora de EMPEZAR a cocinar (no expuesto en UI) ─

/**
 * Minutos desde medianoche a los que habría que empezar a preparar una
 * comida para tenerla lista a su `.timeMinutes` — resta `.prep` (minutos,
 * ya existente en cada meal). null si la comida no tiene hora calculada o
 * no requiere preparación (prep <= 0, p.ej. producto ready-to-eat).
 * @param {object} meal
 * @returns {number|null}
 */
function getCookStartMinutes(meal) {
  if (!meal || typeof meal.timeMinutes !== "number") return null;
  var prep = meal.prep || 0;
  if (prep <= 0) return null;
  return normalizeMinutes(meal.timeMinutes - prep);
}

/**
 * Igual que getCookStartMinutes(), pero formateado como "HH:MM".
 * @param {object} meal
 * @returns {string|null}
 */
function getCookStartTime(meal) {
  var minutes = getCookStartMinutes(meal);
  return minutes === null ? null : formatMinutesToTime(minutes);
}

// ── Lectura de preferencias desde el DOM ─────────────────────────────────

/**
 * Lee #wakeTime/#sleepTime del formulario. Independiente de
 * readForm()/validateInput() (calculator.js) a propósito: el modo "sin
 * cocinar" (no-cook-generator.js/render-no-cook.js) nunca pasa por el
 * formulario de calorías, pero SÍ quiere respetar las mismas preferencias
 * de horario — este lector es el punto de acceso común a ambos flujos.
 * Devuelve null en cada campo si no hay documento, no existe el input, o
 * su valor está vacío — computeMealSchedule()/sanitizeScheduleSettings()
 * ya saben caer a los valores por defecto en ese caso.
 * @returns {{wakeTime: string|null, sleepTime: string|null}}
 */
function readScheduleSettings() {
  if (typeof document === "undefined") return { wakeTime: null, sleepTime: null };
  var wakeEl  = document.getElementById("wakeTime");
  var sleepEl = document.getElementById("sleepTime");
  return {
    wakeTime:  (wakeEl  && wakeEl.value)  ? wakeEl.value  : null,
    sleepTime: (sleepEl && sleepEl.value) ? sleepEl.value : null
  };
}
