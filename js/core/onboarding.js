/**
 * js/core/onboarding.js
 * ─────────────────────────────────────────────────────────────────────────
 * En qué punto de la primera visita está el usuario, y nada más.
 *
 * ── El problema que resuelve ────────────────────────────────────────────
 * La aplicación enseña de golpe 26 campos de formulario, seis paneles y
 * una docena de botones. Para quien la construyó es un panel de control;
 * para quien entra por primera vez es un muro. La queja fue literal:
 * "сайт слишком сложный для людей кто впервые на него заходит".
 *
 * La respuesta es enseñar UNA cosa cada vez: primero la cuenta y las
 * condiciones, luego una pregunta por pantalla, y solo entonces la
 * aplicación completa, con un recorrido guiado que señala cada función
 * sobre la interfaz de verdad.
 *
 * ── Por qué este módulo NO toca el DOM ──────────────────────────────────
 * Mismo criterio que settings.js y pantry.js: aquí solo vive la MÁQUINA DE
 * ESTADOS (qué paso toca, qué se ha aceptado, qué se ha terminado). Quién
 * pinta la pantalla es asunto de js/ui/onboarding-ui.js. Separarlo es lo
 * que permite comprobar con tests toda la lógica de "¿a quién se le
 * enseña qué?" sin navegador -- que es justo donde se cometen los errores
 * caros: enseñarle la anecdota a quien ya la rellenó, o dar por aceptadas
 * unas condiciones que cambiaron.
 *
 * ── La decisión menos obvia: el usuario que ya existía ──────────────────
 * Esta pantalla llega a una aplicación que ya tiene usuarios con su perfil
 * guardado. Arrastrarlos por un cuestionario que ya contestaron sería
 * castigarles por haber llegado antes. Por eso `nextOnboardingStep()`
 * recibe `hasProfile`: si ya hay datos de perfil, el paso de la anécdota
 * se da por hecho. Las CONDICIONES, en cambio, sí se les piden -- son
 * nuevas y nadie las ha aceptado todavía; darlas por aceptadas en silencio
 * sería justo lo contrario de lo que un aviso de privacidad significa.
 *
 * Depende de: nada (usa `typeof localStorage !== "undefined"`, como el
 *   resto de módulos de persistencia). `LEGAL_VERSION` se pasa como
 *   argumento en vez de leerse del global, para que los tests puedan
 *   simular un cambio de versión sin tocar js/data/legal.js.
 *
 * Expone (globales):
 *   getOnboardingState()                    → objeto saneado, {} si no hay nada
 *   saveOnboardingState(patch)              → mezcla y guarda → boolean
 *   acceptTerms(version)                    → boolean
 *   recordAccountChoice(choice)             → boolean
 *   completeIntake()                        → boolean
 *   completeTour()                          → boolean
 *   resetOnboarding()                       → boolean
 *   needsTermsAcceptance(state, version)    → boolean
 *   nextOnboardingStep(state, ctx)          → "welcome"|"intake"|"tour"|"done"
 * ─────────────────────────────────────────────────────────────────────────
 */

var ONBOARDING_STORAGE_KEY = "nutritionPlanner.onboarding.v1";

// Igual que _settingsMemoryState en settings.js: solo se usa cuando no
// existe localStorage en absoluto (tests, entorno sin navegador).
var _onboardingMemoryState = null;

/**
 * Qué eligió el usuario en la pantalla de cuenta. Se guarda porque
 * "continuar sin cuenta" es una respuesta, no una ausencia de respuesta:
 * sin distinguirlas, la aplicación no sabría si volver a ofrecérsela o si
 * ya dijo que no.
 */
var ONBOARDING_ACCOUNT_CHOICES = ["created", "signed-in", "skipped"];

var ONBOARDING_STRING_FIELDS = ["termsVersion", "termsAcceptedAt", "accountChoice", "intakeDoneAt", "tourDoneAt"];

/**
 * Sanea campo a campo, nunca lanza. Un valor con forma inesperada se
 * descarta solo él y no invalida el resto del objeto -- mismo patrón
 * defensivo que sanitizeSettings().
 * @param {object} raw
 * @returns {object}
 */
function sanitizeOnboardingState(raw) {
  var clean = {};
  if (!raw || typeof raw !== "object") {
    return clean;
  }
  ONBOARDING_STRING_FIELDS.forEach(function (key) {
    var value = raw[key];
    if (typeof value === "string" && value.length > 0 && value.length <= 64) {
      clean[key] = value;
    }
  });
  // accountChoice solo admite los tres valores conocidos: cualquier otra
  // cosa (una versión futura, un valor corrupto) se trata como "no ha
  // elegido todavía", que es el estado seguro.
  if (clean.accountChoice && ONBOARDING_ACCOUNT_CHOICES.indexOf(clean.accountChoice) === -1) {
    delete clean.accountChoice;
  }
  return clean;
}

/**
 * @returns {object} estado saneado; {} si no hay nada guardado o si lo
 *   guardado no se puede leer.
 */
function getOnboardingState() {
  if (typeof localStorage === "undefined") {
    return sanitizeOnboardingState(_onboardingMemoryState);
  }
  try {
    var raw = localStorage.getItem(ONBOARDING_STORAGE_KEY);
    if (!raw) {
      return {};
    }
    return sanitizeOnboardingState(JSON.parse(raw));
  } catch (err) {
    return {};
  }
}

/**
 * Mezcla `patch` sobre lo ya guardado. Es una mezcla y no un reemplazo a
 * propósito: cada paso del alta escribe solo su campo y no puede borrar
 * sin querer la aceptación de las condiciones.
 * @param {object} patch
 * @returns {boolean}
 */
function saveOnboardingState(patch) {
  var merged = getOnboardingState();
  var incoming = sanitizeOnboardingState(patch);
  Object.keys(incoming).forEach(function (key) {
    merged[key] = incoming[key];
  });

  if (typeof localStorage === "undefined") {
    _onboardingMemoryState = merged;
    return true;
  }
  try {
    localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(merged));
    return true;
  } catch (err) {
    return false;
  }
}

/**
 * Sella la aceptación CON la versión aceptada. Guardar solo la fecha no
 * serviría: al cambiar el texto no habría forma de saber qué leyó quien
 * aceptó, y volver a preguntar a todo el mundo en cada retoque de una coma
 * es tan malo como no preguntar nunca.
 * @param {string} version
 * @returns {boolean}
 */
function acceptTerms(version) {
  if (typeof version !== "string" || !version) {
    return false;
  }
  return saveOnboardingState({
    termsVersion: version,
    termsAcceptedAt: new Date().toISOString()
  });
}

/**
 * @param {string} choice — uno de ONBOARDING_ACCOUNT_CHOICES
 * @returns {boolean}
 */
function recordAccountChoice(choice) {
  if (ONBOARDING_ACCOUNT_CHOICES.indexOf(choice) === -1) {
    return false;
  }
  return saveOnboardingState({ accountChoice: choice });
}

/** @returns {boolean} */
function completeIntake() {
  return saveOnboardingState({ intakeDoneAt: new Date().toISOString() });
}

/** @returns {boolean} */
function completeTour() {
  return saveOnboardingState({ tourDoneAt: new Date().toISOString() });
}

/**
 * Vuelve al estado de primera visita. Existe para poder volver a ver el
 * alta sin borrar los datos del navegador -- tanto para probarla como
 * para quien quiera repetir el recorrido guiado.
 * @returns {boolean}
 */
function resetOnboarding() {
  if (typeof localStorage === "undefined") {
    _onboardingMemoryState = null;
    return true;
  }
  try {
    localStorage.removeItem(ONBOARDING_STORAGE_KEY);
    return true;
  } catch (err) {
    return false;
  }
}

/**
 * ¿Hay que pedir (o volver a pedir) la aceptación de las condiciones?
 *
 * Se pide si no hay ninguna aceptación guardada, o si la guardada es de
 * una versión distinta de la actual. "Distinta" y no "anterior": comparar
 * versiones como números invitaría a que un estado corrupto con una
 * versión altísima diera las condiciones por aceptadas para siempre.
 *
 * @param {object} state
 * @param {string} currentVersion
 * @returns {boolean}
 */
function needsTermsAcceptance(state, currentVersion) {
  if (typeof currentVersion !== "string" || !currentVersion) {
    // Sin versión de referencia no se puede afirmar que estén aceptadas.
    return true;
  }
  var s = state && typeof state === "object" ? state : {};
  if (!s.termsAcceptedAt || !s.termsVersion) {
    return true;
  }
  return s.termsVersion !== currentVersion;
}

/**
 * El paso que toca enseñar ahora mismo.
 *
 *   "welcome" → cuenta + condiciones (bloqueante: sin aceptar no se pasa)
 *   "intake"  → una pregunta por pantalla hasta tener el perfil
 *   "tour"    → recorrido guiado sobre la interfaz real
 *   "done"    → aplicación normal, sin nada superpuesto
 *
 * `ctx.hasProfile` evita arrastrar por la anécdota a quien ya tiene su
 * perfil guardado (ver la cabecera). `ctx.hasPlan` existe porque el
 * recorrido guiado señala partes de la interfaz -- la lista de la compra,
 * el horario -- que no existen hasta que hay un plan generado: enseñarlo
 * antes sería apuntar a huecos vacíos.
 *
 * @param {object} state
 * @param {{ hasProfile?: boolean, hasPlan?: boolean, currentVersion?: string }} ctx
 * @returns {string}
 */
function nextOnboardingStep(state, ctx) {
  var s = state && typeof state === "object" ? state : {};
  var c = ctx && typeof ctx === "object" ? ctx : {};
  var version = typeof c.currentVersion === "string" && c.currentVersion
    ? c.currentVersion
    : (typeof LEGAL_VERSION === "string" ? LEGAL_VERSION : "");

  if (needsTermsAcceptance(s, version)) {
    return "welcome";
  }
  if (!s.intakeDoneAt && !c.hasProfile) {
    return "intake";
  }
  if (!s.tourDoneAt) {
    // El recorrido espera a que haya algo que señalar.
    return c.hasPlan ? "tour" : "done";
  }
  return "done";
}
