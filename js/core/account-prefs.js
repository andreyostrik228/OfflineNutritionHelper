/**
 * js/core/account-prefs.js
 * ─────────────────────────────────────────────────────────────────────────
 * Lo que es de la CUENTA y no del dispositivo: el aspecto elegido y las dos
 * marcas «ya pasó el cuestionario» y «ya vio el recorrido».
 *
 * Hasta el 2026-10-07 las tres vivían solo en localStorage, en claves
 * propias, y ni se subían a la nube ni se vaciaban al cambiar de cuenta.
 * Resultado, dicho por el dueño: «одно и то же оформление на всех аккаунтах
 * даже если я его только что создал» y «не могу посмотреть тур» -- una cuenta
 * recién creada heredaba el aspecto del dispositivo y, con la marca de
 * recorrido ya puesta por otra sesión, nunca se le ofrecía el recorrido ni el
 * cuestionario.
 *
 * ── Dónde viajan ─────────────────────────────────────────────────────────
 * DENTRO del campo `settings` del documento `user_data/{uid}`, bajo la clave
 * reservada `_prefs`. No en un campo nuevo: las reglas de Firestore
 * (firebase/firestore.rules) solo admiten cuatro campos y publicar reglas
 * nuevas es cosa de la consola de Firebase, no de este código. `settings` es
 * texto JSON y ya está permitido.
 *
 * `_prefs` NO se guarda en el `settings` local (sanitizeSettings lo descarta,
 * y está bien): se calcula al subir, a partir de las claves de siempre (que
 * siguen siendo lo que lee el <head> antes de pintar), y se aplica al bajar.
 *
 * ── Las reglas ───────────────────────────────────────────────────────────
 *   - Al iniciar sesión, si la cuenta TIENE `_prefs`, mandan: se aplican al
 *     dispositivo (aspecto y marcas). Si no tiene (cuenta nueva, o anterior a
 *     esto), se queda lo del dispositivo -- que es de quien acaba de crearla,
 *     porque cerrar sesión lo vacía -- y se sube a la cuenta.
 *   - Al cerrar sesión o al entrar otra cuenta, el dispositivo vuelve a los
 *     valores de fábrica (aspecto por defecto, cuestionario y recorrido sin
 *     hacer): la misma limpieza que ya se hacía con perfil, despensa e
 *     historial (migration.js, _wipeLocal).
 *   - Las condiciones aceptadas y el idioma siguen siendo del dispositivo.
 *
 * No se sube nada hasta que la reconciliación de esa cuenta ha terminado
 * (getCloudSyncedUserId): subir `settings` antes de saber qué hay en la nube
 * podía pisar el perfil de la cuenta con un bloque casi vacío.
 *
 * Depende de (todas opcionales, con typeof):
 *   js/core/look.js        (getLook, saveLook, clearLook, sanitizeLook)
 *   js/core/onboarding.js  (getOnboardingState, saveOnboardingState, resetOnboarding)
 *   js/core/migration.js   (getCloudSyncedUserId)
 *   js/core/auth.js        (getCurrentUser)
 *   js/core/cloud-sync.js  (pushSettingsToCloud)
 *
 * Expone (globales):
 *   ACCOUNT_PREFS_FIELD                 → "_prefs"
 *   collectAccountPrefs()               → {look, intakeDoneAt?, tourDoneAt?}
 *   settingsWithAccountPrefs(settings)  → copia de `settings` con `_prefs`
 *   hasAccountPrefs(settings)           → ¿trae `_prefs` un bloque de la nube?
 *   applyAccountPrefs(prefs)            → boolean (¿cambió algo?)
 *   resetAccountPrefs()                 → deja los valores de fábrica
 *   pushAccountPrefsToCloud()           → Promise
 * ─────────────────────────────────────────────────────────────────────────
 */

var ACCOUNT_PREFS_FIELD = "_prefs";

// Las marcas del alta que son de la cuenta. No incluye las condiciones
// (termsVersion/termsAcceptedAt) ni la elección de cuenta (accountChoice).
var ACCOUNT_PREFS_FLAGS = ["intakeDoneAt", "tourDoneAt"];

function _prefsEsObjeto(x) {
  return !!x && typeof x === "object" && !Array.isArray(x);
}

/**
 * Lo que hay ahora en el dispositivo, en la forma que viaja a la nube.
 * @returns {{look:string, intakeDoneAt?:string, tourDoneAt?:string}}
 */
function collectAccountPrefs() {
  var prefs = {};
  if (typeof getLook === "function") prefs.look = getLook();
  if (typeof getOnboardingState === "function") {
    var estado = getOnboardingState() || {};
    ACCOUNT_PREFS_FLAGS.forEach(function (clave) {
      if (typeof estado[clave] === "string" && estado[clave]) prefs[clave] = estado[clave];
    });
  }
  return prefs;
}

/**
 * Copia de unos ajustes con `_prefs` dentro, lista para subirse. No toca el
 * objeto original.
 * @param {object} settings
 * @returns {object}
 */
function settingsWithAccountPrefs(settings) {
  var copia = {};
  var origen = _prefsEsObjeto(settings) ? settings : {};
  Object.keys(origen).forEach(function (k) { copia[k] = origen[k]; });
  copia[ACCOUNT_PREFS_FIELD] = collectAccountPrefs();
  return copia;
}

/**
 * ¿Los ajustes que bajaron de la nube traen `_prefs`? (Una cuenta nueva o
 * anterior a esto no.)
 * @param {object} settings
 * @returns {boolean}
 */
function hasAccountPrefs(settings) {
  return _prefsEsObjeto(settings) && _prefsEsObjeto(settings[ACCOUNT_PREFS_FIELD]);
}

/** Pone o quita UNA marca del alta, sin tocar las demás. */
function _prefsPonerMarca(nombre, valor) {
  if (typeof getOnboardingState !== "function" || typeof saveOnboardingState !== "function") return false;
  var estado = getOnboardingState() || {};
  var actual = (typeof estado[nombre] === "string") ? estado[nombre] : "";
  var nuevo = (typeof valor === "string") ? valor : "";
  if (actual === nuevo) return false;
  if (nuevo) {
    saveOnboardingState((function () { var p = {}; p[nombre] = nuevo; return p; })());
    return true;
  }
  // Quitar: saveOnboardingState solo mezcla, así que se reescribe sin la clave.
  delete estado[nombre];
  if (typeof resetOnboarding === "function") resetOnboarding();
  if (Object.keys(estado).length) saveOnboardingState(estado);
  return true;
}

/**
 * Aplica al dispositivo las preferencias de la cuenta. Lo que falta cuenta
 * como «sin hacer»: si la cuenta no ha visto el recorrido, aquí tampoco.
 * El aspecto solo cambia si trae uno válido.
 * @param {object} prefs
 * @returns {boolean} true si algo cambió
 */
function applyAccountPrefs(prefs) {
  if (!_prefsEsObjeto(prefs)) return false;
  var cambio = false;

  if (typeof prefs.look === "string" && typeof getLook === "function" && typeof saveLook === "function" &&
      typeof sanitizeLook === "function") {
    var quiere = sanitizeLook(prefs.look);
    // sanitizeLook devuelve el aspecto por defecto ante basura: solo se
    // aplica si lo que venía era de verdad un aspecto conocido.
    if (quiere !== prefs.look) quiere = null;
    if (quiere && quiere !== getLook()) { saveLook(quiere); cambio = true; }
  }

  ACCOUNT_PREFS_FLAGS.forEach(function (clave) {
    if (_prefsPonerMarca(clave, prefs[clave])) cambio = true;
  });
  return cambio;
}

/**
 * Valores de fábrica: aspecto por defecto, cuestionario y recorrido sin
 * hacer. Se llama al cerrar sesión y al entrar otra cuenta.
 * @returns {boolean} true si algo cambió
 */
function resetAccountPrefs() {
  var cambio = false;
  if (typeof clearLook === "function") {
    var antes = (typeof getLook === "function") ? getLook() : null;
    clearLook();
    if (antes !== null && typeof getLook === "function" && getLook() !== antes) cambio = true;
  }
  ACCOUNT_PREFS_FLAGS.forEach(function (clave) {
    if (_prefsPonerMarca(clave, "")) cambio = true;
  });
  return cambio;
}

/**
 * Sube las preferencias a la cuenta, si hay sesión Y la reconciliación de
 * esa cuenta ya terminó. Nunca lanza ni rechaza (como todo cloud-sync).
 * @returns {Promise<{error:object|null, skipped:boolean}>}
 */
function pushAccountPrefsToCloud() {
  var vacio = Promise.resolve({ error: null, skipped: true });
  try {
    var usuario = (typeof getCurrentUser === "function") ? getCurrentUser() : null;
    if (!usuario) return vacio;
    if (typeof getCloudSyncedUserId === "function" && getCloudSyncedUserId() !== usuario.id) return vacio;
    if (typeof pushSettingsToCloud !== "function") return vacio;
    return pushSettingsToCloud();
  } catch (err) {
    return vacio;
  }
}
