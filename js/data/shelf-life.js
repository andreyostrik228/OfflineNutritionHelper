/**
 * js/data/shelf-life.js
 * ─────────────────────────────────────────────────────────────────────────
 * Vida útil ESTIMADA por rol de ingrediente, para los productos que no
 * traen fecha impresa (zanahorias sueltas, fruta a granel, pescadería).
 *
 * **Estos valores son ESTIMACIONES, no fechas de caducidad reales.** Nunca
 * se muestran en la UI como si fueran una fecha impresa en el envase: quien
 * los consume (`js/core/expiry.js`) marca siempre el origen como
 * `"estimated"` frente al `"user"` de una fecha introducida a mano. Es el
 * mismo criterio que el resto del proyecto aplica a la nutrición: un dato
 * aproximado se etiqueta como aproximado, nunca se disfraza de real.
 *
 * Criterio de las cifras: días desde la compra en condiciones domésticas
 * normales, producto sin abrir salvo que se indique. Son conservadoras a
 * propósito -- es mejor avisar un día antes de tiempo que un día tarde.
 * No proceden de una fuente oficial; si algún día se quiere precisión real
 * habría que apoyarse en AESAN/FSA, y entonces dejarían de ser estimaciones.
 *
 * Las claves son las que produce `normalizeIngredientKey()`
 * (`js/core/pricing.js`): minúsculas, sin acentos, sin puntuación.
 *
 * `storage` es el sitio POR DEFECTO donde se asume que se guarda ese
 * ingrediente. El usuario puede cambiarlo por entrada; preguntarlo en cada
 * alta sería fricción suficiente para que nadie lo rellene (ver el diseño
 * en STATE.md). Cambiar de sitio cambia la estimación: la misma zanahoria
 * dura ~28 días en nevera y ~14 en despensa.
 *
 * Cobertura: los 81 roles de `dishes.js`. Un rol ausente NO es un error --
 * `resolveExpiry()` devuelve `source:"unknown"` y ese ingrediente
 * simplemente no participa en la urgencia, nunca se inventa una fecha.
 * ─────────────────────────────────────────────────────────────────────────
 */

/** Multiplicador de vida útil según dónde se guarde, relativo a `storage`. */
var SHELF_LIFE_STORAGE = {
  congelador: "congelador",
  nevera: "nevera",
  despensa: "despensa"
};

/**
 * @type {Object<string, {storage:string, days:number}>}
 */
var SHELF_LIFE = {
  // ── Pescado fresco: lo más perecedero del catálogo ──────────────────
  "bacalao": { storage: "nevera", days: 2 },
  "lubina": { storage: "nevera", days: 2 },
  "merluza": { storage: "nevera", days: 2 },
  "rape": { storage: "nevera", days: 2 },
  "salmon": { storage: "nevera", days: 2 },
  "gamba cocida": { storage: "nevera", days: 3 },
  "langostino cocido": { storage: "nevera", days: 3 },

  // ── Carne fresca ────────────────────────────────────────────────────
  "carne picada 5% grasa": { storage: "nevera", days: 2 },
  "pavo picado": { storage: "nevera", days: 2 },
  "conejo": { storage: "nevera", days: 3 },
  "lomo de cerdo": { storage: "nevera", days: 3 },
  "muslo de pollo deshuesado": { storage: "nevera", days: 3 },
  "pechuga de pavo": { storage: "nevera", days: 3 },
  "pechuga de pollo": { storage: "nevera", days: 3 },
  "solomillo de ternera": { storage: "nevera", days: 4 },
  "ternera magra": { storage: "nevera", days: 4 },

  // ── Charcutería y loncheados ────────────────────────────────────────
  "jamon cocido extra": { storage: "nevera", days: 7 },
  "pavo loncheado": { storage: "nevera", days: 7 },
  "jamon serrano": { storage: "nevera", days: 30 },

  // ── Lácteos y huevo ─────────────────────────────────────────────────
  "claras de huevo": { storage: "nevera", days: 5 },
  "leche semidesnatada": { storage: "nevera", days: 5 },
  "mozzarella light": { storage: "nevera", days: 7 },
  "queso fresco batido 0%": { storage: "nevera", days: 7 },
  "requeson": { storage: "nevera", days: 7 },
  "skyr natural": { storage: "nevera", days: 10 },
  "queso light": { storage: "nevera", days: 14 },
  "yogur griego ligero": { storage: "nevera", days: 14 },
  "huevos enteros": { storage: "nevera", days: 21 },

  // ── Proteína vegetal refrigerada ────────────────────────────────────
  "hummus": { storage: "nevera", days: 5 },
  "tofu firme": { storage: "nevera", days: 7 },
  "tempeh": { storage: "nevera", days: 10 },
  "edamame": { storage: "congelador", days: 365 },

  // ── Verdura y hortaliza fresca ──────────────────────────────────────
  "champinones": { storage: "nevera", days: 5 },
  "espinacas": { storage: "nevera", days: 5 },
  "lechuga pepino": { storage: "nevera", days: 5 },
  "brocoli": { storage: "nevera", days: 7 },
  "coliflor": { storage: "nevera", days: 7 },
  "pepino": { storage: "nevera", days: 7 },
  "tomate": { storage: "despensa", days: 7 },
  "calabacin": { storage: "nevera", days: 10 },
  "pimiento": { storage: "nevera", days: 10 },
  "zanahoria": { storage: "nevera", days: 28 },
  "batata": { storage: "despensa", days: 30 },

  // ── Fruta fresca ────────────────────────────────────────────────────
  "fresas": { storage: "nevera", days: 3 },
  "aguacate": { storage: "despensa", days: 4 },
  "pina": { storage: "despensa", days: 5 },
  "platano": { storage: "despensa", days: 5 },
  "kiwi": { storage: "despensa", days: 10 },
  "naranja": { storage: "despensa", days: 14 },
  "manzana": { storage: "despensa", days: 21 },

  // ── Cocinados y de cuchara (ya preparados, se estropean rápido) ─────
  "patata cocida": { storage: "nevera", days: 4 },
  "arroz blanco cocido": { storage: "nevera", days: 4 },
  "arroz integral cocido": { storage: "nevera", days: 4 },
  "cuscus cocido": { storage: "nevera", days: 4 },
  "pasta cocida": { storage: "nevera", days: 4 },
  "quinoa cocida": { storage: "nevera", days: 4 },
  "trigo sarraceno cocido": { storage: "nevera", days: 4 },

  // ── Pan ─────────────────────────────────────────────────────────────
  "pan integral": { storage: "despensa", days: 4 },
  "pan de centeno": { storage: "despensa", days: 5 },
  "pan de molde integral": { storage: "despensa", days: 7 },
  "tortillas de trigo": { storage: "despensa", days: 14 },
  "wrap proteico": { storage: "despensa", days: 14 },

  // ── Congelados ──────────────────────────────────────────────────────
  "frutos rojos congelados": { storage: "congelador", days: 365 },
  "verduras congeladas salteado": { storage: "congelador", days: 365 },

  // ── Legumbre y conserva (sin abrir) ─────────────────────────────────
  "alubias cocidas": { storage: "despensa", days: 365 },
  "garbanzos cocidos": { storage: "despensa", days: 365 },
  "lentejas cocidas": { storage: "despensa", days: 365 },
  "maiz dulce": { storage: "despensa", days: 730 },
  "atun al natural": { storage: "despensa", days: 730 },
  "caballa en lata": { storage: "despensa", days: 730 },
  "sardinas en lata": { storage: "despensa", days: 730 },

  // ── Seco y despensa larga ───────────────────────────────────────────
  "granola": { storage: "despensa", days: 120 },
  "nueces": { storage: "despensa", days: 120 },
  "tortitas de arroz": { storage: "despensa", days: 120 },
  "almendras": { storage: "despensa", days: 180 },
  "avena": { storage: "despensa", days: 180 },
  "cacahuetes": { storage: "despensa", days: 180 },
  "copos de maiz": { storage: "despensa", days: 180 },
  "mantequilla de cacahuete": { storage: "despensa", days: 180 },
  "mermelada light": { storage: "nevera", days: 30 },
  "miel": { storage: "despensa", days: 1095 }
};

/**
 * Ingredientes que se DEGRADAN PROGRESIVAMENTE, no que "están bien hasta
 * que caducan".
 *
 * Un plátano al cuarto día de cinco sigue siendo comestible y ya no apetece;
 * una lata de atún al mes 12 de 24 está exactamente igual que el día uno.
 * Para los primeros, avisar cuando quedan 2 días llega tarde: hay que
 * gastarlos en la PRIMERA MITAD de su vida, que es la ventana en la que
 * están buenos de verdad (ver `FRESH_WINDOW_RATIO` en `js/core/expiry.js`).
 *
 * Marcados a mano y no derivados de `days`, a propósito: la zanahoria dura
 * 28 días y es perecedera, y las galletas duran 120 y no lo son -- ningún
 * umbral sobre la duración separa bien los dos casos. Es conocimiento de
 * producto, no una fórmula.
 *
 * Fuera de esta lista quedan conservas, seco, congelados, panadería y
 * despensa larga: ahí la fecha de caducidad SÍ es la señal correcta.
 */
var PERISHABLE_KEYS = {
  // Pescado y marisco fresco
  "bacalao": true, "lubina": true, "merluza": true, "rape": true, "salmon": true,
  "gamba cocida": true, "langostino cocido": true,
  // Carne fresca
  "carne picada 5% grasa": true, "pavo picado": true, "conejo": true,
  "lomo de cerdo": true, "muslo de pollo deshuesado": true, "pechuga de pavo": true,
  "pechuga de pollo": true, "solomillo de ternera": true, "ternera magra": true,
  // Charcutería abierta
  "jamon cocido extra": true, "pavo loncheado": true,
  // Lácteos frescos
  "claras de huevo": true, "leche semidesnatada": true, "mozzarella light": true,
  "queso fresco batido 0%": true, "requeson": true, "skyr natural": true,
  "yogur griego ligero": true,
  // Proteína vegetal fresca
  "hummus": true, "tofu firme": true, "tempeh": true,
  // Verdura y hortaliza
  "champinones": true, "espinacas": true, "lechuga pepino": true, "brocoli": true,
  "coliflor": true, "pepino": true, "tomate": true, "calabacin": true,
  "pimiento": true, "zanahoria": true,
  // Fruta
  "fresas": true, "aguacate": true, "pina": true, "platano": true, "kiwi": true,
  "naranja": true, "manzana": true,
  // Cocinados
  "patata cocida": true, "arroz blanco cocido": true, "arroz integral cocido": true,
  "cuscus cocido": true, "pasta cocida": true, "quinoa cocida": true,
  "trigo sarraceno cocido": true
};

/**
 * ¿Este ingrediente se degrada progresivamente?
 * @param {string} key - clave ya normalizada
 * @returns {boolean}
 */
function isPerishable(key) {
  return PERISHABLE_KEYS[key] === true;
}

/**
 * Vida útil estimada de un ingrediente, opcionalmente en un sitio distinto
 * al que se asume por defecto.
 *
 * Guardar en otro sitio NO se modela con una tabla aparte por
 * almacenamiento -- eso multiplicaría 81 filas por 3 sin datos reales que
 * lo respalden. Se aplica un factor sobre la estimación base, que es
 * honesto sobre lo que es: una aproximación de una aproximación. Congelar
 * detiene el deterioro casi por completo; la despensa lo acelera frente a
 * la nevera.
 *
 * @param {string} key - clave ya normalizada (normalizeIngredientKey)
 * @param {string} [storage] - "nevera" | "despensa" | "congelador"
 * @returns {{days:number, storage:string}|null} null si no hay estimación
 */
function getShelfLife(key, storage) {
  var base = SHELF_LIFE[key];
  if (!base) return null;

  var where = storage || base.storage;
  if (where === base.storage) {
    return { days: base.days, storage: where };
  }

  // Factores deliberadamente groseros -- ver comentario de arriba.
  if (where === "congelador") {
    return { days: Math.max(base.days, 180), storage: where };
  }
  if (where === "nevera" && base.storage === "despensa") {
    return { days: Math.round(base.days * 1.5), storage: where };
  }
  if (where === "despensa" && base.storage === "nevera") {
    return { days: Math.max(1, Math.round(base.days * 0.5)), storage: where };
  }
  if (base.storage === "congelador") {
    // Descongelado: se comporta como fresco, no como congelado.
    return { days: where === "nevera" ? 2 : 1, storage: where };
  }

  return { days: base.days, storage: where };
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { SHELF_LIFE: SHELF_LIFE, getShelfLife: getShelfLife };
}
