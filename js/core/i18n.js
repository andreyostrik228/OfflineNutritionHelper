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

// ── Los nombres de COMIDA ────────────────────────────────────────────────
//
// La linea no es "comida si / interfaz no". Es DESCRIPCION contra ETIQUETA:
//
//   "Aguacate"                          se traduce: describe un alimento
//   "Aguacate Hacendado bandeja 2 uds"  NO: es lo que pone en el precio
//
// Quien lee la lista de la compra tiene que reconocer el producto en la
// estanteria, y para eso el NOMBRE COMERCIAL tiene que ir tal cual. Pero
// "aguacate" no ayuda a nadie que no sepa español, y traducirlo no rompe
// nada porque no es lo que se busca en la tienda.
//
// Por eso `js/data/real-products.js` no entra aqui NUNCA, y los
// ingredientes y los platos si.
//
// La tabla va por el propio nombre español, no por una clave inventada:
// son nombres, no frases de interfaz, y asi el fichero de traduccion se
// lee como un diccionario.

/** Diccionarios de comida por idioma, que rellenan js/i18n/food-*.js */
var FOOD_TABLES = {};

/**
 * Registra el diccionario de comida de un idioma.
 * @param {string} lang
 * @param {object} tabla - {"Aguacate": "Avocado", ...}
 */
function registerFoodTable(lang, tabla) {
  if (LANGS.indexOf(lang) === -1) return;
  if (!tabla || typeof tabla !== "object") return;
  FOOD_TABLES[lang] = tabla;
}

/**
 * El nombre de un alimento o plato en el idioma que toque.
 *
 * Sin traduccion devuelve el ORIGINAL, no la clave: aqui la clave ES el
 * nombre español, y enseñar "Aguacate" a quien lee en ingles es mucho mejor
 * que enseñarle un hueco. Es lo contrario que en `t()`, donde la clave es
 * un identificador y verla en pantalla avisa de que falta algo.
 *
 * @param {string} nombre - el nombre en español
 * @param {string} [lang]
 * @returns {string}
 */
function tFood(nombre, lang) {
  if (typeof nombre !== "string" || !nombre) return nombre;
  var idioma = (typeof lang === "string") ? sanitizeLang(lang) : getLang();
  if (idioma === DEFAULT_LANG) return nombre;
  var tabla = FOOD_TABLES[idioma];
  if (tabla && typeof tabla[nombre] === "string") return tabla[nombre];
  return nombre;
}

// ── Los nombres de PLATO, por composición ────────────────────────────────
//
// Son 434 y el catálogo va camino de 1.000: traducirlos a mano es un
// callejón sin salida, porque cada plato que genere `scripts/generar-platos`
// llegaría sin traducir y nadie se enteraría.
//
// Medido: los 434 nombres se descomponen en 233 piezas distintas unidas por
// seis conectores ("con" x314, "de" x80, "a la" x17, "al" x16, "y" x3,
// "en" x3). Traduciendo las piezas se traducen los nombres de hoy Y los de
// mañana, mientras el generador siga usando el mismo vocabulario.

/** Vocabulario de piezas por idioma, en minúsculas. */
var DISH_WORD_TABLES = {};

/** Métodos de cocción: en español van detrás, en inglés delante. */
var DISH_METHODS = {};

function registerDishWords(lang, palabras, metodos) {
  if (LANGS.indexOf(lang) === -1) return;
  if (palabras && typeof palabras === "object") DISH_WORD_TABLES[lang] = palabras;
  if (metodos && typeof metodos === "object") DISH_METHODS[lang] = metodos;
}

/** Primera letra en mayúscula, respetando el resto. */
function _capitalizar(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

/** Una pieza suelta: se busca en minúsculas y se devuelve como estaba. */
function _piezaTraducida(pieza, palabras) {
  var limpia = pieza.trim();
  if (!limpia) return limpia;
  var t = palabras[limpia.toLowerCase()];
  if (typeof t !== "string") return limpia;          // sin traducción: el original
  // Si venía en mayúscula (va al principio del nombre), se mantiene.
  return /^[A-ZÁÉÍÓÚÑ]/.test(limpia) ? _capitalizar(t) : t;
}

/**
 * "A de B" se invierte: en inglés el complemento va delante.
 *   "Sopa de lentejas"   -> "Lentil soup"
 *   "Bowl de skyr"       -> "Skyr bowl"
 *   "Muslo de pollo"     -> "Chicken thigh"
 * Menos cuando la cabeza es una cantidad, que en inglés sí lleva "of":
 *   "Puñado de almendras" -> "Handful of almonds"
 */
var DISH_DE_CON_OF = /^(pu[ñn]ado|racion|raci[óo]n|vaso|taza|bol)$/i;

function _tramoConDe(tramo, palabras) {
  // El tramo ENTERO manda sobre el despiece. Sin esto "Claras de huevo"
  // se partia en "Claras" + "huevo" y salia "Egg egg whites": el nombre
  // completo ya significa una cosa y trocearlo la repite.
  var limpio = tramo.trim();
  if (typeof palabras[limpio.toLowerCase()] === "string") {
    return _piezaTraducida(limpio, palabras);
  }
  var i = tramo.indexOf(" de ");
  if (i === -1) return _piezaTraducida(tramo, palabras);
  var cabeza = tramo.slice(0, i).trim();
  var cola = tramo.slice(i + 4).trim();
  var tc = _piezaTraducida(cabeza, palabras);
  var tl = _piezaTraducida(cola, palabras);
  if (DISH_DE_CON_OF.test(cabeza)) return tc + " of " + tl.toLowerCase();
  // Invertido: la cola pasa delante y en minúscula, la cabeza detrás.
  var delante = /^[A-ZÁÉÍÓÚÑ]/.test(cabeza) ? _capitalizar(tl) : tl.toLowerCase();
  return delante + " " + tc.toLowerCase();
}

/**
 * El nombre de un plato en el idioma que toque.
 *
 * Sin traducción para una pieza se deja esa pieza en español: media frase
 * entendible es mejor que ninguna, y es lo mismo que hace tFood().
 *
 * @param {string} nombre
 * @param {string} [lang]
 * @returns {string}
 */
function tDish(nombre, lang) {
  if (typeof nombre !== "string" || !nombre) return nombre;
  var idioma = (typeof lang === "string") ? sanitizeLang(lang) : getLang();
  if (idioma === DEFAULT_LANG) return nombre;

  // 1. ¿Está el nombre entero en el diccionario? Gana siempre: es una
  //    traducción escrita a mano y sabe más que cualquier composición.
  var tabla = FOOD_TABLES[idioma];
  if (tabla && typeof tabla[nombre] === "string") return tabla[nombre];

  var palabras = DISH_WORD_TABLES[idioma];
  if (!palabras) return nombre;
  var metodos = DISH_METHODS[idioma] || {};

  var resto = nombre, metodo = "";

  // 2. Método de cocción: "Pollo a la plancha" -> "Grilled chicken".
  var m = resto.match(/\s+(?:a\s+la|al)\s+([^\s,]+)/i);
  if (m) {
    var clave = m[1].toLowerCase();
    if (typeof metodos[clave] === "string") {
      metodo = metodos[clave];
      resto = resto.replace(m[0], "");
    }
  }

  // 3. Se parte por "con" y por "y", que en inglés van igual y en el mismo
  //    orden. Cada tramo puede llevar un "de" dentro, que sí se invierte.
  var conPartes = resto.split(/\s+con\s+/i);
  var traducidas = conPartes.map(function (parte) {
    return parte.split(/\s+y\s+/i).map(function (p) {
      return _tramoConDe(p, palabras);
    }).join(" and ");
  });

  var salida = traducidas.join(" with ");
  if (metodo) salida = _capitalizar(metodo) + " " + salida.charAt(0).toLowerCase() + salida.slice(1);
  return salida.replace(/\s+/g, " ").trim();
}

// ── Los PASOS de las recetas ─────────────────────────────────────────────
//
// 2.101 pasos repartidos en 434 platos, 1.682 distintos. Van en su propia
// tabla y NO en I18N_TABLES por dos motivos:
//
// La clave es la frase española entera, igual que en FOOD_TABLES, no un
// identificador. Un paso de receta no es una etiqueta de interfaz: no se
// reutiliza en veinte sitios, no cabe en un slug, y con la frase de clave
// el fichero de traducción se lee en paralelo con el original y se puede
// revisar. Inventar `receta.pollo_paso_3` no aportaría nada y haria
// imposible saber que se esta traduciendo sin abrir el otro fichero.
//
// Y porque el generador de platos escribe pasos nuevos. Sin traducción,
// `tStep` devuelve el ORIGINAL: un plato recien generado sale en español
// dentro de una interfaz en ingles, que es feo pero se entiende y se
// cocina. Devolver la clave, o un hueco, dejaria la receta inservible.

/** Diccionarios de pasos por idioma, que rellenan js/i18n/steps-*.js */
var STEP_TABLES = {};

/**
 * Registra el diccionario de pasos de receta de un idioma.
 * @param {string} lang
 * @param {object} tabla - {"Lava la manzana…": "Rinse the apple…", ...}
 */
function registerStepTable(lang, tabla) {
  if (LANGS.indexOf(lang) === -1) return;
  if (!tabla || typeof tabla !== "object") return;
  STEP_TABLES[lang] = tabla;
}

/**
 * Un paso de receta en el idioma que toque.
 *
 * Sin traducción devuelve el ORIGINAL en español, por lo mismo que tFood():
 * una instruccion de cocina a medias no se puede seguir.
 *
 * @param {string} paso - la frase en español
 * @param {string} [lang]
 * @returns {string}
 */
function tStep(paso, lang) {
  if (typeof paso !== "string" || !paso) return paso;
  var idioma = (typeof lang === "string") ? sanitizeLang(lang) : getLang();
  if (idioma === DEFAULT_LANG) return paso;
  var tabla = STEP_TABLES[idioma];
  if (tabla && typeof tabla[paso] === "string") return tabla[paso];
  return paso;
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
