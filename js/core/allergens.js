/**
 * js/core/allergens.js
 * ─────────────────────────────────────────────────────────────────────────
 * MOSTRAR los alérgenos que la etiqueta de un producto declara. Esto NO es
 * un filtro y NO participa en la generación de ningún plan — a diferencia
 * de "no me gusta" (js/core/preferences.js), que sí filtra el pool de "sin
 * cocinar".
 *
 * ── Por qué solo etiquetas y no un filtro duro ──────────────────────────
 * Se midió sobre el catálogo real de Mercadona. La etiqueta declara lo que
 * un producto CONTIENE, casi nunca de qué está libre: de los ~1.865
 * productos con nutrición, 82 se declaran "sin gluten" y 9 "sin lácteos".
 * Un filtro fail-closed (dejar pasar solo lo explícitamente libre) dejaría
 * 9 productos para alguien que evita la leche — función rota, no un plan
 * fino. Y deducir "sin lácteos" de la lista de ingredientes es justo la
 * inferencia coherente-pero-insegura que este proyecto no hace para nada
 * crítico (además no ve la contaminación cruzada). Así que se muestra el
 * "Contiene …" real cuando existe y el usuario decide. Sin dato en la
 * tabla = no se afirma nada (ni "seguro" ni "no seguro").
 *
 * El motor de PLATOS (DISH_DB) no se toca en absoluto: trabaja con ~84
 * roles genéricos sin unión a SKUs, así que no hay etiqueta que mostrar.
 *
 * Depende de:
 *   js/data/product-allergens.js  (PRODUCT_ALLERGENS, generado)
 *   js/core/utils.js              (escapeHtml)  — opcional, degrada sin él
 *
 * Expone (globales, sin módulos igual que el resto del proyecto):
 *   EU_ALLERGEN_LABELS
 *   getProductAllergens(productOrId) → { contains:string[], may:string[] } | null
 *   formatAllergenSummary(info)      → string
 *   renderAllergenLine(productOrId)  → string (HTML; "" si no hay dato)
 * ─────────────────────────────────────────────────────────────────────────
 */

// Las 14 categorías de alérgenos de declaración obligatoria en la UE,
// con su etiqueta en español en minúscula (para texto corrido). Las
// claves coinciden con las que escribe scratchpad/gen_allergens.js.
var EU_ALLERGEN_LABELS = {
  gluten:         "gluten",
  crustaceos:     "crustáceos",
  huevo:          "huevo",
  pescado:        "pescado",
  cacahuetes:     "cacahuetes",
  soja:           "soja",
  lacteos:        "lácteos",
  frutos_cascara: "frutos de cáscara",
  apio:           "apio",
  mostaza:        "mostaza",
  sesamo:         "sésamo",
  sulfitos:       "sulfitos",
  altramuces:     "altramuces",
  moluscos:       "moluscos",
};

/**
 * Una cadena de la interfaz, traducida si hay i18n.js cargado y el idioma la
 * tiene; si no, el español de siempre. Este módulo se carga (y se prueba) sin
 * i18n.js, así que no puede dar por hecho que `tOr` exista -- es el mismo
 * patrón que `_txt` en utils.js.
 * @param {string} clave
 * @param {string} original - el español
 * @returns {string}
 */
function _alergenoTexto(clave, original) {
  return (typeof tOr === "function") ? tOr(clave, original) : original;
}

/**
 * Alérgenos declarados para un producto.
 *
 * @param {object|string|number} productOrId - un producto (`{id}`) o el id
 *   suelto. El id se compara como cadena, igual que en PRODUCT_STORAGE.
 * @returns {{contains:string[], may:string[]}|null} null cuando no hay
 *   tabla cargada o el producto no está en ella — que NO significa "sin
 *   alérgenos", solo "la etiqueta no lo dice".
 */
function getProductAllergens(productOrId) {
  if (typeof PRODUCT_ALLERGENS === "undefined" || !PRODUCT_ALLERGENS) return null;

  var id = (productOrId && typeof productOrId === "object") ? productOrId.id : productOrId;
  if (id === undefined || id === null || id === "") return null;

  var entry = PRODUCT_ALLERGENS[String(id)];
  if (!entry) return null;

  return {
    contains: Array.isArray(entry.contains) ? entry.contains.slice() : [],
    may: Array.isArray(entry.may) ? entry.may.slice() : [],
  };
}

/**
 * Traduce una lista de claves a etiquetas en el idioma de la pantalla
 * (`ui.alergeno_<clave>`; el español sale de EU_ALLERGEN_LABELS), descartando
 * claves desconocidas en silencio (una tabla regenerada con una clave nueva no
 * debe romper el render).
 * @param {string[]} keys
 * @returns {string[]}
 */
function allergenLabels(keys) {
  if (!Array.isArray(keys)) return [];
  var out = [];
  for (var i = 0; i < keys.length; i++) {
    var label = EU_ALLERGEN_LABELS[keys[i]];
    if (label) out.push(_alergenoTexto("ui.alergeno_" + keys[i], label));
  }
  return out;
}

/**
 * Resumen en texto plano, sin HTML. "" si no hay nada que decir.
 * Ej.: "Contiene: gluten, lácteos · Puede contener: soja"
 * @param {{contains:string[], may:string[]}|null} info
 * @returns {string}
 */
function formatAllergenSummary(info) {
  if (!info) return "";
  var parts = [];
  var contains = allergenLabels(info.contains);
  var may = allergenLabels(info.may);
  if (contains.length) parts.push(_alergenoTexto("ui.alergenos_contiene", "Contiene:") + " " + contains.join(", "));
  if (may.length) parts.push(_alergenoTexto("ui.alergenos_puede_contener", "Puede contener:") + " " + may.join(", "));
  return parts.join(" · ");
}

/**
 * Línea HTML para una tarjeta de producto. "" cuando no hay dato — la UI
 * simplemente no muestra nada, en vez de afirmar "sin alérgenos".
 *
 * El "Contiene" va en <strong> (afirmación en firme); el "Puede contener"
 * en un <span> más tenue (contaminación cruzada declarada).
 *
 * @param {object|string|number} productOrId
 * @returns {string}
 */
function renderAllergenLine(productOrId) {
  var info = getProductAllergens(productOrId);
  if (!info) return "";

  var esc = (typeof escapeHtml === "function") ? escapeHtml : function (s) { return String(s); };
  var contains = allergenLabels(info.contains);
  var may = allergenLabels(info.may);
  if (!contains.length && !may.length) return "";

  var bits = [];
  if (contains.length) {
    bits.push("<strong>" + esc(_alergenoTexto("ui.alergenos_contiene", "Contiene:")) + "</strong> " + esc(contains.join(", ")));
  }
  if (may.length) {
    bits.push('<span class="nocook-item__allergens-may">' +
      esc(_alergenoTexto("ui.alergenos_puede_contener", "Puede contener:") + " " + may.join(", ")) + "</span>");
  }
  return '<div class="nocook-item__allergens">' + bits.join(" · ") + "</div>";
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    EU_ALLERGEN_LABELS: EU_ALLERGEN_LABELS,
    getProductAllergens: getProductAllergens,
    formatAllergenSummary: formatAllergenSummary,
    renderAllergenLine: renderAllergenLine,
  };
}
