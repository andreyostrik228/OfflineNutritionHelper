/**
 * js/core/settings.js
 * ─────────────────────────────────────────────────────────────────────────
 * Persistencia de los datos de perfil/formulario (edad, sexo, peso,
 * altura, actividad, entrenamientos, objetivo, presupuesto, tiempo para
 * cocinar, preferencia de sabor, horario de despertar/dormir) -- hasta
 * ahora NINGUNO de estos campos se guardaba entre sesiones, se
 * reescribían con los valores por defecto del HTML en cada carga. Mismo
 * patrón defensivo que ya usa js/core/pantry.js para la despensa: clave
 * versionada, nunca lanza (localStorage ausente/cuota superada/JSON
 * corrupto caen a un objeto vacío o a una variable en memoria), y cada
 * CAMPO se sanea individualmente -- un campo con forma inesperada se
 * descarta solo él, nunca invalida el resto del objeto.
 *
 * Deliberadamente agnóstico del DOM (igual que pantry.js lo es de
 * dishes.js/DOM): no sabe qué es un <input>, solo guarda/lee un objeto
 * plano. Tampoco duplica las reglas de negocio de rango que ya validan
 * validateInput()/calculateProfile() (js/core/calculator.js) -- el
 * saneado aquí es solo de TIPO (¿es number/string?), no de rango válido,
 * para que los dos módulos no puedan divergir con el tiempo sobre qué es
 * "válido".
 *
 * Depende de: nada (como pricing.js/pantry.js, usa
 *   `typeof localStorage !== "undefined"` para detectar el entorno).
 *
 * Expone (globales):
 *   getSettings()        → objeto saneado, {} si no hay nada guardado
 *   saveSettings(data)    → guarda (saneando primero, sella updatedAt) → boolean
 *   clearSettings()        → boolean
 * ─────────────────────────────────────────────────────────────────────────
 */

var SETTINGS_STORAGE_KEY = "nutritionPlanner.settings.v1";

// Usado únicamente cuando localStorage no existe en absoluto (tests, algún
// entorno sin navegador) -- mismo patrón que _pantryMemoryState en pantry.js.
var _settingsMemoryState = null;

var SETTINGS_NUMERIC_FIELDS = ["age", "weight", "height", "activity", "workouts", "budgetCustom", "cookTime", "maxDifficulty"];
// "store" retirado 2026-08-25 junto con el selector de tienda. Un ajuste
// guardado de antes simplemente se ignora al sanear -- no rompe nada.
var SETTINGS_STRING_FIELDS  = ["sex", "goal", "budgetMode", "taste", "wakeTime", "sleepTime", "cuisine"];

/**
 * Listas de exclusión del usuario. Son ARRAYS de texto, no cadenas, así
 * que se sanean aparte (ver sanitizeStringList).
 *
 * ── Por qué "no me gusta" y las alergias NO comparten lista ──────────
 * Son cosas de naturaleza distinta y se guardan por separado A PROPÓSITO:
 *
 *   dislikes  -> PREFERENCIA blanda. Si algo se cuela, el usuario se
 *                encoge de hombros. Filtrar es suficiente.
 *   allergens -> RESTRICCIÓN DURA de seguridad. Si algo se cuela, alguien
 *                puede acabar en urgencias. Va con el techo de presupuesto
 *                y las tolerancias de macros, nunca en el sorteo de
 *                puntuación.
 *
 * Fundirlas en una sola lista con un flag de "severidad" es la forma
 * evidente de ahorrarse código, y es justo lo que no hay que hacer:
 * invita a que alguien "optimice" después el camino de alergias
 * convirtiéndolo en una puntuación, sin darse cuenta de lo que rompe.
 * Mientras sean dos campos distintos, ese error necesita ser deliberado.
 */
var SETTINGS_LIST_FIELDS = ["dislikes", "equipment"];

// Topes defensivos: el usuario escribe esto a mano y se sincroniza a la
// nube, así que ni la lista ni una entrada suelta pueden crecer sin
// límite.
var MAX_LIST_ENTRIES = 50;
var MAX_LIST_ENTRY_LENGTH = 60;

/**
 * Sanea un objeto de settings campo por campo -- nunca lanza, nunca deja
 * pasar un valor con el tipo equivocado, nunca descarta el objeto entero
 * por un solo campo corrupto.
 * @param {*} raw - lo que venga de JSON.parse() o de la llamada a saveSettings()
 * @returns {object}
 */
/**
 * Sanea una lista de textos libres del usuario: descarta lo que no sea
 * cadena con contenido, recorta espacios, quita duplicados sin distinguir
 * mayúsculas, y acota el tamaño.
 *
 * Nunca lanza y siempre devuelve un array -- misma disciplina que el resto
 * del saneado: un valor corrupto en localStorage no puede tumbar el
 * arranque (ver el bug de 2026-08-07).
 *
 * @param {*} raw
 * @returns {string[]}
 */
function sanitizeStringList(raw) {
  if (!Array.isArray(raw)) return [];

  var seen = {};
  var out = [];

  for (var i = 0; i < raw.length && out.length < MAX_LIST_ENTRIES; i++) {
    var v = raw[i];
    if (typeof v !== "string") continue;

    var trimmed = v.trim();
    if (!trimmed) continue;
    if (trimmed.length > MAX_LIST_ENTRY_LENGTH) trimmed = trimmed.slice(0, MAX_LIST_ENTRY_LENGTH);

    var dedupeKey = trimmed.toLowerCase();
    if (seen[dedupeKey]) continue;

    seen[dedupeKey] = true;
    out.push(trimmed);
  }

  return out;
}

function sanitizeSettings(raw) {
  if (!raw || typeof raw !== "object") return {};
  var clean = {};

  SETTINGS_NUMERIC_FIELDS.forEach(function (key) {
    var v = raw[key];
    if (typeof v === "number" && isFinite(v)) clean[key] = v;
  });
  SETTINGS_STRING_FIELDS.forEach(function (key) {
    var v = raw[key];
    if (typeof v === "string" && v.length > 0) clean[key] = v;
  });
  SETTINGS_LIST_FIELDS.forEach(function (key) {
    var list = sanitizeStringList(raw[key]);
    if (list.length) clean[key] = list;
  });
  if (typeof raw.updatedAt === "string") clean.updatedAt = raw.updatedAt;

  return clean;
}

/**
 * Lee los settings guardados. Nunca lanza: datos ausentes, corruptos, o
 * localStorage inexistente/deshabilitado devuelven siempre un objeto vacío.
 * @returns {object}
 */
function getSettings() {
  if (typeof localStorage === "undefined") {
    return _settingsMemoryState || (_settingsMemoryState = {});
  }
  try {
    var raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return {};
    return sanitizeSettings(JSON.parse(raw));
  } catch (err) {
    return {};
  }
}

/**
 * Guarda los settings (saneados primero) y sella `updatedAt` -- usado por
 * la resolución de conflictos de migración (js/core/migration.js) para
 * decidir qué copia (local vs. nube) es más reciente.
 * @param {object} data
 * @returns {boolean}
 */
function saveSettings(data) {
  var clean = sanitizeSettings(data);
  clean.updatedAt = new Date().toISOString();

  if (typeof localStorage === "undefined") {
    _settingsMemoryState = clean;
    return true;
  }
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(clean));
    return true;
  } catch (err) {
    return false;
  }
}

/**
 * Vacía los settings guardados -- usado al cerrar sesión (ver
 * js/core/migration.js, onSignOut) para que el siguiente inicio de
 * sesión en este mismo navegador nunca herede datos de otra cuenta.
 * @returns {boolean}
 */
function clearSettings() {
  if (typeof localStorage === "undefined") {
    _settingsMemoryState = {};
    return true;
  }
  try {
    localStorage.removeItem(SETTINGS_STORAGE_KEY);
    return true;
  } catch (err) {
    return false;
  }
}
