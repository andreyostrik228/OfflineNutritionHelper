/**
 * js/core/i18n.js
 * ─────────────────────────────────────────────────────────────────────────
 * En qué idioma se lee la aplicación. SIN DOM: aquí solo se guarda, se
 * valida y se busca la cadena. Quien la pinta es la capa `js/ui`.
 *
 * ── Lo que NO se traduce, y por qué ─────────────────────────────────────
 * La comida se queda en español SIEMPRE: 2.994 nombres de producto de
 * Mercadona, 434 platos y 83 ingredientes. La lista de la compra tiene que
 * decir lo que pone en la etiqueta del supermercado, o deja de servir para
 * lo único que existe. Así que un usuario en inglés ve la interfaz en
 * inglés y "Pechuga de pollo" en español, a propósito.
 *
 * ── Por qué se cargan TODOS los idiomas y no solo el elegido ────────────
 * Cargar el idioma después de pintar hace que la página parpadee del
 * español al idioma elegido, y esconderla hasta que llegue es justo lo que
 * prohíbe 7.2 ("nada que el usuario deba ver puede depender de que algo se
 * ejecute"). Cargarlos todos cuesta bytes y no cuesta ni un parpadeo ni una
 * rama de código. Si el peso llega a importar, la salida es cargar el
 * elegido con un <script> SÍNCRONO desde el <head>, no esconder nada.
 *
 * ── La regla de las claves ──────────────────────────────────────────────
 * Una clave que no existe devuelve la cadena española, y si tampoco está,
 * devuelve la clave misma. Nunca cadena vacía: un hueco en blanco en la
 * pantalla no se nota, y "ajustes.tema" sí. Un fallo tiene que verse.
 * ─────────────────────────────────────────────────────────────────────────
 */

/** Clave propia, fuera de los ajustes: ver la nota de theme.js. */
var LANG_STORAGE_KEY = "nutritionPlanner.lang.v1";

/**
 * Los idiomas que la aplicación admite.
 *
 * `es` va primero porque es el ORIGEN: las cadenas se escriben en español y
 * los demás idiomas son traducciones suyas. También es el repliegue cuando
 * a una traducción le falta una clave.
 *
 * No hay árabe ni hebreo a propósito: piden maquetación de derecha a
 * izquierda, que no es una traducción sino otro trabajo.
 */
var LANGS = ["es", "en", "de", "fr", "ru", "uk", "it", "pt", "pl", "ro"];
var DEFAULT_LANG = "es";

/** Nombre de cada idioma EN SU PROPIO idioma: así lo reconoce quien lo busca. */
var LANG_NAMES = {
  es: "Español",
  en: "English",
  de: "Deutsch",
  fr: "Français",
  ru: "Русский",
  uk: "Українська",
  it: "Italiano",
  pt: "Português",
  pl: "Polski",
  ro: "Română"
};

/** Tablas de cadenas, que rellenan los ficheros de js/i18n/. */
var I18N_TABLES = {};

// Igual que en settings.js y theme.js: solo se usa sin localStorage.
var _langMemoryState = null;

/**
 * Registra la tabla de un idioma. La llaman los propios ficheros de
 * idioma al cargarse, para que añadir uno sea añadir un fichero y su
 * <script>, sin tocar este módulo.
 *
 * @param {string} lang
 * @param {object} tabla - {clave: "texto"}
 */
function registerI18nTable(lang, tabla) {
  if (LANGS.indexOf(lang) === -1) return;
  if (!tabla || typeof tabla !== "object") return;
  I18N_TABLES[lang] = tabla;
}

/**
 * Deja un idioma en algo seguro de usar. El valor sale de localStorage y
 * acaba en el atributo `lang` del <html>, así que se valida antes.
 * @param {*} valor
 * @returns {string}
 */
function sanitizeLang(valor) {
  return LANGS.indexOf(valor) === -1 ? DEFAULT_LANG : valor;
}

/**
 * Los idiomas que de verdad se pueden ofrecer HOY: los que tienen tabla
 * cargada.
 *
 * `LANGS` es la lista de los que la aplicación admite, y va por delante de
 * las traducciones — es normal que un idioma esté declarado y todavía sin
 * traducir. Pero ofrecer uno sin tabla es prometer algo que no pasa:
 * `t()` cae al español, el usuario elige "Français" y no cambia nada.
 * Medido en el navegador antes de que existiera esta función: elegir
 * francés guardaba "fr" y dejaba la pantalla igual.
 *
 * @returns {string[]}
 */
function availableLangs() {
  var out = [];
  for (var i = 0; i < LANGS.length; i++) {
    if (I18N_TABLES[LANGS[i]]) out.push(LANGS[i]);
  }
  return out;
}

/**
 * ¿Se puede ofrecer este idioma ahora mismo?
 * @param {*} lang
 * @returns {boolean}
 */
function isLangAvailable(lang) {
  return availableLangs().indexOf(lang) !== -1;
}

/**
 * El idioma elegido, ya validado.
 * @returns {string}
 */
function getLang() {
  try {
    if (typeof localStorage === "undefined" || !localStorage) {
      return sanitizeLang(_langMemoryState);
    }
    return sanitizeLang(localStorage.getItem(LANG_STORAGE_KEY));
  } catch (e) {
    return sanitizeLang(_langMemoryState);
  }
}

/**
 * Guarda el idioma. Devuelve el que ha quedado, que puede no ser el que se
 * pidió si venía basura.
 * @param {string} lang
 * @returns {string}
 */
function saveLang(lang) {
  var limpio = sanitizeLang(lang);
  _langMemoryState = limpio;
  try {
    if (typeof localStorage !== "undefined" && localStorage) {
      localStorage.setItem(LANG_STORAGE_KEY, limpio);
    }
  } catch (e) { /* ventana privada: se queda en memoria */ }
  return limpio;
}

/**
 * Primera lengua del navegador que la aplicación conozca. Solo se usa la
 * PRIMERA vez, para no recibir a un alemán en español pudiendo evitarlo;
 * en cuanto elige algo manda su elección.
 *
 * Recibe la lista en vez de leer `navigator` para poder probarse sin
 * navegador, igual que resolveTheme().
 *
 * @param {string[]} preferidas - p.ej. ["de-AT", "en-US"]
 * @returns {string} un idioma de LANGS
 */
function detectLang(preferidas) {
  if (!preferidas || !preferidas.length) return DEFAULT_LANG;
  for (var i = 0; i < preferidas.length; i++) {
    var etiqueta = String(preferidas[i] || "").toLowerCase();
    // "de-AT" -> "de". La region no cambia las cadenas de esta aplicacion.
    var base = etiqueta.split("-")[0];
    if (LANGS.indexOf(base) !== -1) return base;
  }
  return DEFAULT_LANG;
}

/**
 * La cadena de una clave.
 *
 * @param {string} clave
 * @param {string} [lang] - por defecto, el elegido
 * @returns {string} la traducción, o la española, o la clave misma
 */
function t(clave, lang) {
  var idioma = (typeof lang === "string") ? sanitizeLang(lang) : getLang();
  var tabla = I18N_TABLES[idioma];
  if (tabla && typeof tabla[clave] === "string") return tabla[clave];
  var origen = I18N_TABLES[DEFAULT_LANG];
  if (origen && typeof origen[clave] === "string") return origen[clave];
  // Ni traducida ni en el origen: se devuelve la clave para que SE VEA.
  return clave;
}
