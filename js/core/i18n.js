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

/**
 * La variante regional que se pide a Intl / toLocaleDateString para escribir
 * una fecha en cada idioma: "05 oct 2026", "05 Oct 2026", "05 окт. 2026 г.".
 * Las fechas estaban escritas con "es-ES" a pelo, así que el mes salía en
 * español ("oct") dentro de una pantalla en ruso.
 */
var LANG_LOCALES = {
  es: "es-ES", en: "en-GB", de: "de-DE", fr: "fr-FR", ru: "ru-RU",
  uk: "uk-UA", it: "it-IT", pt: "pt-PT", pl: "pl-PL", ro: "ro-RO"
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
 * El código de variante regional del idioma elegido ("ru-RU"), para
 * `toLocaleDateString` y compañía.
 * @param {string} [lang] - por defecto, el elegido
 * @returns {string}
 */
function getLocale(lang) {
  var idioma = (typeof lang === "string") ? sanitizeLang(lang) : getLang();
  return LANG_LOCALES[idioma] || LANG_LOCALES[DEFAULT_LANG];
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

/** Idiomas cuyos nombres de plato se componen pieza a pieza (ver tDish). */
var DISH_COMPOSABLE = { en: true };

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

  // Fuera del inglés NO se compone. Los conectores de abajo (" with ",
  // " and ", " of ") son ingleses, y en ruso o en polaco la pieza además
  // cambia de caso detrás de "con": "arroz" es "рис", "con arroz" es
  // "с рисом". Ahí los platos van ENTEROS en food-<lang>.js, y lo que se
  // busca en el vocabulario es solo una pieza suelta entera (las fuentes de
  // proteína de las notas del plan: "pollo", "legumbre"). Un plato nuevo
  // sin traducir sale en español, que se entiende; "Курица with рис", no.
  if (!DISH_COMPOSABLE[idioma]) {
    var sola = nombre.trim();
    return (typeof palabras[sola.toLowerCase()] === "string")
      ? _piezaTraducida(sola, palabras) : nombre;
  }
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

// ── Las ETIQUETAS DE ENVASE ──────────────────────────────────────────────
//
// "barra", "tarro", "bandeja", "plátano"... 42 palabras que describen CÓMO
// se compra algo. No son nombres comerciales -- no es lo que pone en la
// etiqueta del producto -- asi que se traducen: quien lee "Buy: 1 barra"
// sin saber español no sabe qué coger de la estantería.
//
// Cada una lleva singular Y plural porque el inglés no los forma añadiendo
// una "s": loaf/loaves, box/boxes. En español bastaba con eso, y de ahí
// viene `pluralizePackageLabel`, que sigue siendo el repliegue.

/** Diccionarios de etiquetas de envase por idioma (js/i18n/packages-*.js) */
var PACKAGE_TABLES = {};

/**
 * @param {string} lang
 * @param {object} tabla - {"barra": ["loaf", "loaves"], ...}
 */
function registerPackageTable(lang, tabla) {
  if (LANGS.indexOf(lang) === -1) return;
  if (!tabla || typeof tabla !== "object") return;
  PACKAGE_TABLES[lang] = tabla;
}

/**
 * La categoría de plural de CLDR para un número: "one", "few", "many",
 * "other"… Es la que decide, en ruso, entre "1 банка", "2 банки",
 * "5 банок" y "1,5 банки".
 *
 * `Intl.PluralRules` la da hecha y con las reglas de verdad (21 es "one"
 * en ruso, 12 es "many", 1,5 es "other"). Sin Intl, que hoy es un
 * navegador muy viejo, se cae a lo mínimo: 1 es "one" y lo demás "other".
 *
 * @param {number} n
 * @param {string} lang
 * @returns {string}
 */
function _categoriaDePlural(n, lang) {
  try {
    if (typeof Intl !== "undefined" && Intl.PluralRules) {
      return new Intl.PluralRules(lang).select(n);
    }
  } catch (e) { /* idioma que este Intl no conoce: al repliegue */ }
  return n === 1 ? "one" : "other";
}

/**
 * La etiqueta de un envase, en singular o plural segun cuantos sean.
 *
 * Cada entrada viene de una de dos formas:
 *
 *   ["loaf", "loaves"]                                  singular y plural
 *   {one: "банка", few: "банки", many: "банок", other: "банки"}
 *
 * La segunda es para los idiomas donde el plural no es uno solo. En ruso,
 * ucraniano y polaco la palabra cambia con el número (1, 2-4, 5-20, y otra
 * más para las fracciones), y en rumano a partir de 20 lleva "de" delante
 * ("20 de ouă"). Las claves son las categorías de CLDR, y `other` es la de
 * repliegue cuando falta la que toca.
 *
 * Sin traduccion devuelve null, para que quien llama use lo que ya hacia
 * con el español (incluido su plural).
 *
 * @param {string} label - la etiqueta en español
 * @param {number} [n]   - cuantos envases; >1 pide el plural
 * @param {string} [lang]
 * @returns {string|null}
 */
function tPackageLabel(label, n, lang) {
  if (typeof label !== "string" || !label) return null;
  var idioma = (typeof lang === "string") ? sanitizeLang(lang) : getLang();
  if (idioma === DEFAULT_LANG) return null;
  var tabla = PACKAGE_TABLES[idioma];
  var par = tabla && tabla[label];
  if (!par) return null;
  if (Object.prototype.toString.call(par) !== "[object Array]") {
    var cuantos = (typeof n === "number" && isFinite(n)) ? n : 1;
    var forma = par[_categoriaDePlural(cuantos, idioma)];
    return (typeof forma === "string" && forma) ? forma : (par.other || par.one || null);
  }
  var plural = (typeof n === "number" && n > 1);
  return plural ? (par[1] || par[0]) : par[0];
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

/**
 * Como t(), pero lo que NO está en ninguna tabla devuelve `original` en vez de
 * la clave. Es para el texto que vive en español junto a su dato (los pasos
 * del recorrido, las plantillas de «sin cocinar»): el español no está en
 * es.js, y ver «ui.x» donde hay una frase española perfectamente buena sería
 * peor que el hueco que `t()` quiere evitar.
 *
 * @param {string} clave
 * @param {string} original - el texto español que acompaña al dato
 * @param {string} [lang]
 * @returns {string}
 */
function tOr(clave, original, lang) {
  var idioma = (typeof lang === "string") ? sanitizeLang(lang) : getLang();
  var tabla = I18N_TABLES[idioma];
  if (tabla && typeof tabla[clave] === "string") return tabla[clave];
  var origen = I18N_TABLES[DEFAULT_LANG];
  if (origen && typeof origen[clave] === "string") return origen[clave];
  return original;
}

/**
 * Las claves de traducción del nombre de cada toma. La clave de la toma
 * ("breakfast") no cambia con el idioma; su nombre sí.
 *
 * Vive aquí y no en js/ui porque lo piden tres capas: las tarjetas
 * (render.js), "Mis planes" (render-pantry.js) y el informe del motor
 * (plan-generator.js, "Desayuno necesita 7 min más…").
 */
var MEAL_LABEL_KEYS = {
  breakfast: "ui.desayuno", lunch: "ui.comida", dinner: "ui.cena",
  snack: "ui.snack_1", snack2: "ui.snack_2"
};

/**
 * El nombre de una toma en el idioma de ahora ("Desayuno" / "Завтрак").
 * `meal.label` está guardado en español (también en los planes del historial),
 * así que la etiqueta se vuelve a pedir por la CLAVE de la toma; si la clave
 * no se conoce se devuelve `fallback`, que es la etiqueta española guardada.
 * @param {string} key - "breakfast", "lunch", "dinner", "snack", "snack2"
 * @param {string} [fallback]
 * @param {string} [lang]
 * @returns {string}
 */
function tMeal(key, fallback, lang) {
  var clave = MEAL_LABEL_KEYS[key];
  if (!clave) return (typeof fallback === "string") ? fallback : String(key);
  return tOr(clave, (typeof fallback === "string") ? fallback : String(key), lang);
}

// ── Cadenas con huecos: t() + {parámetros} ───────────────────────────────
//
// Hasta ahora cada sitio hacía `t(clave).replace("{n}", n)` a mano, con
// tantos `.replace` encadenados como huecos. Funciona, pero tiene dos
// trampas que ya han mordido: `replace` con una CADENA solo cambia la primera
// aparición (una frase que repita {n} se quedaba con la segunda sin cambiar),
// y un hueco que la traducción no lleva (el ruso reordena y a veces omite)
// pasa sin ningún aviso.
//
// Aquí se sustituyen TODAS las apariciones, de una vez, y el valor entra
// literal: no se interpreta como patrón (un "$&" en un nombre de producto
// no puede reescribir la frase).

/**
 * La cadena de una clave con sus {huecos} rellenos.
 *
 *   tFormat("ui.pregunta_n_de_m", { n: 3, total: 16 })   ->  "Pregunta 3 de 16"
 *
 * Un hueco sin valor en `params` se deja tal cual ("{n}"), igual que una
 * clave sin traducción se deja ver: un fallo tiene que notarse.
 *
 * Un valor que sea un objeto `{key, params}` es otro mensaje y se traduce antes
 * de meterlo (ver más abajo).
 *
 * @param {string} clave
 * @param {Object<string, *>} [params]
 * @param {string} [lang] - por defecto, el elegido
 * @returns {string}
 */
function tFormat(clave, params, lang) {
  var valores = params;
  if (params && typeof params === "object") {
    // Un parámetro puede ser a su vez un mensaje, {key, params}: una frase que
    // se mete dentro de otra ("Con {margen} no ha sido posible…"). Se traduce
    // primero, en el mismo idioma. Así el motor guarda claves y números, no
    // texto ya traducido.
    valores = {};
    Object.keys(params).forEach(function (nombre) {
      var v = params[nombre];
      valores[nombre] = (v && typeof v === "object" && typeof v.key === "string")
        ? tFormat(v.key, v.params, lang) : v;
    });
  }
  return _rellenarHuecos(t(clave, lang), valores);
}

/** Sustituye cada {nombre} de `texto` por `params.nombre`, si existe. */
function _rellenarHuecos(texto, params) {
  if (typeof texto !== "string" || !params || typeof params !== "object") return texto;
  return texto.replace(/\{([A-Za-z0-9_]+)\}/g, function (hueco, nombre) {
    return Object.prototype.hasOwnProperty.call(params, nombre) ? String(params[nombre]) : hueco;
  });
}

// ── Las UNIDADES ─────────────────────────────────────────────────────────
//
// "kcal", "g", "kg", "min", "ml" y "cm" estaban escritos a pelo en ~60 sitios
// de js/ui ("840 g", " kcal", "2 min"), y por eso en ruso se leía "840 g" y
// "2499 kcal" junto a una interfaz entera en ruso. Una unidad es una palabra
// del idioma como cualquier otra (ккал, г, кг, мин, мл), así que vive en las
// tablas con claves `unit.<código>` y se pide aquí.
//
// Hay tres maneras de escribir un valor con su unidad, y cada una existe
// porque en la pantalla ya había las tres:
//
//   fmtUnit(840, "g")        "840 g"    texto corrido, atributos, texto plano
//   fmtUnitJunto(500, "g")   "500g"     donde la unidad iba pegada: "(500g)"
//   fmtUnitHtml(841, "kcal") "841<span class="u">kcal</span>"   una CIFRA
//
// La tercera es para las cifras grandes (resumen del día, kcal de cada toma,
// totales del pie de la tarjeta): el número y, PEGADA detrás y sin ningún
// espacio, la unidad en un <span class="u"> para que el tema visual pueda
// hacerla más pequeña que el número. El hueco entre los dos lo pone el CSS
// (margin), no un carácter: un espacio dentro del span se heredaría al
// copiar el texto y se partiría en dos al ajustar la línea.
//
// El español y el inglés conservan EXACTAMENTE lo que ya se veía: la unidad
// pegada sigue pegada ("500g"). El ruso la separa ("500 г") porque así se
// escribe: lo decide `unit.sep_pegada`, no el código.

/**
 * Las unidades que existen. Un test comprueba que cada una está traducida.
 * "l" y "ud" son las otras dos que trae el catálogo de la tienda en el tamaño
 * de un envase (2.240 productos en kg, 735 en l, 19 en ud).
 */
var UNIT_CODES = ["kcal", "g", "kg", "min", "ml", "cm", "l", "ud"];

/**
 * La unidad sola, en el idioma de ahora ("kcal" / "ккал").
 * @param {string} code - uno de UNIT_CODES
 * @param {string} [lang]
 * @returns {string}
 */
function tUnit(code, lang) {
  return t("unit." + code, lang);
}

/**
 * La unidad de un TAMAÑO DE ENVASE tal como la trae el catálogo de la tienda
 * ("kg", "l", "ud"). Si es una que no conocemos se deja como viene: un dato
 * nuevo del catálogo no puede salir como "unit.xx" en medio de una ficha.
 * @param {string} code
 * @param {string} [lang]
 * @returns {string}
 */
function tPackageUnit(code, lang) {
  if (typeof code !== "string" || UNIT_CODES.indexOf(code) === -1) return code == null ? "" : String(code);
  return tUnit(code, lang);
}

/**
 * Valor y unidad como TEXTO, separados por un espacio: "840 g".
 * @param {number|string} value
 * @param {string} code
 * @param {string} [lang]
 * @returns {string}
 */
function fmtUnit(value, code, lang) {
  return String(value) + " " + tUnit(code, lang);
}

/**
 * Valor y unidad donde la unidad iba PEGADA al número: "500g" en español y en
 * inglés, "500 г" en ruso (ver arriba).
 * @param {number|string} value
 * @param {string} code
 * @param {string} [lang]
 * @returns {string}
 */
function fmtUnitJunto(value, code, lang) {
  return String(value) + t("unit.sep_pegada", lang) + tUnit(code, lang);
}

/**
 * Una CIFRA con su unidad, para pintar con innerHTML: el número y, detrás y
 * sin espacios, `<span class="u">unidad</span>`. Todo va escapado -- el valor
 * porque esto acaba en innerHTML, la unidad porque viene de una tabla de
 * traducción y no hay motivo para fiarse de lo que lleve dentro.
 * @param {number|string} value
 * @param {string} code
 * @param {string} [lang]
 * @returns {string}
 */
function fmtUnitHtml(value, code, lang) {
  return _escaparHtml(String(value)) + '<span class="u">' + _escaparHtml(tUnit(code, lang)) + "</span>";
}

/** Escapado mínimo, propio: este módulo no depende de utils.js (se carga antes). */
function _escaparHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
