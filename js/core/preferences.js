/**
 * js/core/preferences.js
 * ─────────────────────────────────────────────────────────────────────────
 * PREFERENCIAS BLANDAS del usuario: "esto no me gusta, no me lo pongas".
 *
 * ── Por qué esto vive en su PROPIO archivo ───────────────────────────────
 * Las alergias son otra cosa y van a vivir aparte (js/core/allergens.js,
 * todavía sin construir). No es una manía organizativa, es la diferencia
 * entre los dos tipos de exclusión:
 *
 *   AQUÍ (no me gusta)   PREFERENCIA. Si algo se cuela, el usuario se
 *                        encoge de hombros y cambia de plato. Filtrar es
 *                        suficiente. Sin datos = no se excluye nada.
 *   ALERGIAS             SEGURIDAD. Si algo se cuela, alguien puede acabar
 *                        en urgencias. Restricción DURA, al nivel del techo
 *                        de presupuesto, jamás dentro de la puntuación. Sin
 *                        datos = se excluye (fail-closed).
 *
 * Fíjate en que la regla de "sin datos" es OPUESTA en los dos casos, y esa
 * es la razón de fondo para no fundirlos: comparten la forma (una lista de
 * exclusión del usuario) pero no el comportamiento. Una sola lista con un
 * flag de "severidad" ahorraría código e invitaría a que alguien, meses
 * después, "optimice" el camino de alergias metiéndolo en el sorteo de
 * puntuación sin entender lo que rompe. Con dos archivos, ese error tiene
 * que ser deliberado.
 *
 * NO filtra por alérgenos. No lo intentes desde aquí.
 *
 * Expone (globales, sin módulos igual que el resto del proyecto):
 *   matchesDislike(name, dislikes)
 *   filterDislikedProducts(products, dislikes)
 *   getDislikes()
 * ─────────────────────────────────────────────────────────────────────────
 */

/**
 * Normaliza para comparar: minúsculas, sin acentos, sin puntuación.
 * Reutiliza normalizeIngredientKey() (pricing.js) cuando está cargado para
 * no tener DOS normalizaciones que puedan divergir en silencio -- si
 * divergieran, "plátano" escrito en la lista dejaría de casar con
 * "Plátano" del catálogo y el filtro fallaría sin decir nada.
 * @param {string} text
 * @returns {string}
 */
function normalizePreferenceText(text) {
  if (typeof normalizeIngredientKey === "function") {
    return normalizeIngredientKey(text || "");
  }
  return String(text || "")
    .toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[.,;:]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * ¿Coincide `name` con alguna entrada de la lista de "no me gusta"?
 *
 * Coincidencia por SUBCADENA a propósito: el usuario escribe "cebolla" y
 * espera que eso tape "Cebolla dulce", "Crema de cebolla" y "Aros de
 * cebolla". Es una preferencia, así que pasarse de amplio molesta mucho
 * menos que quedarse corto -- exactamente al revés que en alergias, donde
 * un falso negativo es el que hace daño.
 *
 * @param {string} name - nombre de producto o de ingrediente
 * @param {string[]} dislikes
 * @returns {boolean}
 */
function matchesDislike(name, dislikes) {
  if (!name || !Array.isArray(dislikes) || !dislikes.length) return false;

  var haystack = normalizePreferenceText(name);
  if (!haystack) return false;

  for (var i = 0; i < dislikes.length; i++) {
    var needle = normalizePreferenceText(dislikes[i]);
    if (!needle) continue;
    if (haystack.indexOf(needle) !== -1) return true;
  }

  return false;
}

/**
 * Quita del pool los productos que el usuario ha dicho que no le gustan.
 *
 * Acepta tanto productos "pelados" (`{name}`) como las entradas del pool de
 * "sin cocinar" (`{product:{name}}`), porque el generador trabaja con las
 * segundas y el catálogo con las primeras.
 *
 * @param {object[]} products
 * @param {string[]} dislikes
 * @returns {object[]} array nuevo; el original no se toca
 */
function filterDislikedProducts(products, dislikes) {
  if (!Array.isArray(products)) return [];
  if (!Array.isArray(dislikes) || !dislikes.length) return products;

  return products.filter(function (item) {
    var name = (item && item.product && item.product.name) || (item && item.name);
    return !matchesDislike(name, dislikes);
  });
}

/**
 * Lista guardada del usuario. Vacía si settings.js no está cargado -- el
 * filtro entonces no quita nada, que es el fallo correcto para una
 * preferencia (a diferencia de una alergia, donde no saber debe excluir).
 * @returns {string[]}
 */
function getDislikes() {
  if (typeof getSettings !== "function") return [];
  var settings = getSettings();
  return Array.isArray(settings.dislikes) ? settings.dislikes : [];
}
