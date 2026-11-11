/**
 * js/data/dislike-groups.js
 * ─────────────────────────────────────────────────────────────────────────
 * Grupos para el campo "Alimentos que no te gustan" (#dislikes).
 *
 * ── Para qué ────────────────────────────────────────────────────────────
 * El usuario escribe "pescado" y quiere que desaparezca TODO el pescado
 * (merluza, atún, salmón, bacalao...), no solo un producto llamado
 * literalmente "pescado". El campo sigue siendo texto separado por comas;
 * un token de grupo como "pescado" o "lácteos" se EXPANDE a sus miembros
 * antes de casar (`expandDislikeTerms`, usado por matchesDislike en
 * preferences.js), y el autocompletado ofrece el grupo entero en un clic.
 *
 * ── Sigue siendo una PREFERENCIA blanda ────────────────────────────────
 * Pasarse de amplio molesta menos que quedarse corto (ver matchesDislike).
 * Por eso los stems son generosos y hay solapes a propósito (jamón cae en
 * `carne` y en `cerdo`; cacahuete en `frutos secos` y en `legumbres`).
 * NO es un filtro de alergias -- eso vive aparte y con la regla contraria
 * ("sin datos EXCLUYE"), ver la nota de sesgo-vs-restricción en
 * preferences.js.
 *
 * ── Decisiones ─────────────────────────────────────────────────────────
 * - `avena` y `arroz` NO están en `gluten`: quien escribe "gluten" quiere
 *   quitar pan/pasta, no cargarse todos los porridge. Es preferencia.
 * - `caballa` con la `a` final: "Cola de caballo" (infusión) NO debe caer
 *   en `pescado`.
 * - stems normalizados (minúsculas, sin acentos): se comparan contra
 *   normalizePreferenceText(nombre), misma normalización que el filtro.
 *
 * Expone (globales):
 *   DISLIKE_GROUPS         { claveNormalizada: [stems] }
 *   DISLIKE_GROUP_LABELS   { claveNormalizada: "etiqueta legible" }
 *   expandDislikeTerms(terms) -> string[]  (miembros incluidos)
 * ─────────────────────────────────────────────────────────────────────────
 */

var DISLIKE_GROUPS = {
  "pescado": [
    "merluza", "atun", "salmon", "bacalao", "sardin", "caballa", "lubina",
    "rape", "boquer", "anchoa", "trucha", "dorada", "panga", "lenguado",
    "palometa", "perca", "tilapia", "mero", "abadejo", "rodaballo",
    "pez espada", "emperador", "mojama", "ventresca", "surimi", "palito de mar",
    "gallo",
  ],
  "marisco": [
    "gamba", "langostin", "camaron", "mejillon", "almeja", "calamar",
    "sepia", "pulpo", "cangrejo", "necora", "chipiron", "berberecho",
    "vieira", "cigala", "buey de mar", "percebe", "bogavante", "chirla",
    "zamburi", "marisco",
  ],
  "lacteos": [
    // OJO: "mantequilla" a secas NO va aquí -- casaría con "Mantequilla de
    // cacahuete", que no es lácteo. La mantequilla real aparece poco como
    // ingrediente suelto; si hace falta, "mantequilla hacendado" u otro
    // stem más específico.
    "leche", "yogur", "queso", "quesito", "requeson", "nata",
    "kefir", "cuajada", "skyr", "mozzarella", "ricotta", "natillas",
    "cottage", "mascarpone", "burgos", "feta", "parmesano", "cheddar",
    "gouda", "brie",
  ],
  "frutos secos": [
    "almendra", "nuez", "nueces", "avellana", "anacardo", "pistacho",
    "cacahuete", "castana", "pinon", "macadamia", "pecana", "nuez de brasil",
  ],
  "carne": [
    "pollo", "pavo", "ternera", "cerdo", "vacuno", "cordero", "conejo",
    "lomo", "solomillo", "chuleta", "jamon", "chorizo", "salchich",
    "hamburgues", "albondig", "carne picada", "bacon", "panceta", "morcilla",
    "longaniza", "fuet", "salami", "mortadela", "fiambre", "secreto",
    "presa", "pechuga", "muslo", "contramuslo", "magro", "costilla",
    "choped", "salchichon", "sobrasada", "butifarra",
  ],
  "cerdo": [
    "cerdo", "panceta", "bacon", "jamon", "chorizo", "morcilla", "longaniza",
    "salchich", "secreto", "presa iberica", "costilla", "tocino", "fuet",
    "salami", "sobrasada", "lomo de cerdo", "butifarra", "chicharron",
    "careta", "magro de cerdo",
  ],
  "huevo": [
    "huevo", "huevos", "clara de huevo", "claras", "tortilla", "mayonesa",
    "revuelto", "huevo hilado",
  ],
  "gluten": [
    "pan", "harina de trigo", "pasta", "macarron", "espagueti", "fideos",
    "cuscus", "cebada", "centeno", "espelta", "galleta", "bizcocho",
    "magdalena", "croissant", "tostada", "picos", "colines", "empanad",
    "pizza", "rebozad", "seitan", "bulgur", "semola", "gofre", "palmera",
    "ensaimada", "hojaldre", "bolleria", "wrap", "tortita de trigo",
    "tortilla de trigo", "muesli", "granola", "barrita de cereales",
  ],
  "legumbres": [
    "lenteja", "garbanzo", "alubia", "judia", "frijol", "haba", "guisante",
    "soja", "edamame", "tofu", "tempeh", "cacahuete", "hummus", "altramuz",
  ],
  // Setas (2026-11-10): «грибы» no tapaba ni los champiñones. "setas" en
  // plural y entero: hoy no hay ninguna otra palabra del catálogo que lo
  // contenga (comprobado: ni «rosetas»).
  "setas": [
    "champinon", "setas", "shiitake", "portobello", "boletus", "hongo",
  ],
};

var DISLIKE_GROUP_LABELS = {
  "pescado": "pescado",
  "marisco": "marisco",
  "lacteos": "lácteos",
  "frutos secos": "frutos secos",
  "carne": "carne",
  "cerdo": "cerdo",
  "huevo": "huevo",
  "gluten": "gluten",
  "legumbres": "legumbres",
  "setas": "setas",
};

/**
 * El nombre de cada grupo en los otros idiomas de la aplicación (2026-11-10).
 *
 * Los grupos solo se entendían en español: quien escribía «рыба» (o «fish»)
 * en «No me gusta» veía su palabra guardada y el plan seguía trayendo caballa
 * (visto en el Chrome del dueño, con «рыба, грибы»). traducirTerminosDislike
 * (preferences.js) traduce NOMBRES de alimento, y «рыба» no es el nombre de
 * ninguno: es el grupo.
 *
 * Varias formas por idioma, porque es texto libre: el nominativo y el
 * acusativo en ruso y ucraniano («рыба», «не люблю рыбу»), singular y plural
 * en inglés. El PRIMERO de cada idioma es el que se enseña en el
 * autocompletado (dislikeGroupLabel).
 */
var DISLIKE_GROUP_ALIASES = {
  "pescado": { en: ["fish"], ru: ["рыба", "рыбу", "рыбы"], uk: ["риба", "рибу", "риби"] },
  "marisco": { en: ["seafood", "shellfish"], ru: ["морепродукты"], uk: ["морепродукти"] },
  "lacteos": { en: ["dairy"], ru: ["молочное", "молочные продукты", "молочка", "молочку"], uk: ["молочне", "молочні продукти", "молочка", "молочку"] },
  "frutos secos": { en: ["nuts"], ru: ["орехи"], uk: ["горіхи"] },
  "carne": { en: ["meat"], ru: ["мясо"], uk: ["м'ясо", "мясо"] },
  "cerdo": { en: ["pork"], ru: ["свинина", "свинину"], uk: ["свинина", "свинину"] },
  "huevo": { en: ["eggs", "egg"], ru: ["яйца", "яйцо"], uk: ["яйця", "яйце"] },
  "gluten": { en: ["gluten"], ru: ["глютен"], uk: ["глютен"] },
  "legumbres": { en: ["legumes", "beans", "pulses"], ru: ["бобовые"], uk: ["бобові"] },
  "setas": { en: ["mushrooms", "mushroom"], ru: ["грибы"], uk: ["гриби"] },
};

function _dislikeNorm(s) {
  if (typeof normalizePreferenceText === "function") return normalizePreferenceText(s);
  return String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
}

var _dislikeAliasIndex = null;

/**
 * La clave del grupo que nombra `term`, en cualquier idioma, o null.
 * "Pescado" -> "pescado"; "рыбу" -> "pescado"; "cebolla" -> null.
 * @param {string} term
 * @returns {string|null}
 */
function dislikeGroupKey(term) {
  if (typeof DISLIKE_GROUPS === "undefined") return null;
  if (!_dislikeAliasIndex) {
    _dislikeAliasIndex = {};
    Object.keys(DISLIKE_GROUP_ALIASES).forEach(function (clave) {
      var porIdioma = DISLIKE_GROUP_ALIASES[clave];
      Object.keys(porIdioma).forEach(function (lang) {
        porIdioma[lang].forEach(function (alias) { _dislikeAliasIndex[_dislikeNorm(alias)] = clave; });
      });
    });
    // Las claves españolas mandan si un alias coincidiera con alguna.
    Object.keys(DISLIKE_GROUPS).forEach(function (clave) { _dislikeAliasIndex[clave] = clave; });
  }
  var n = _dislikeNorm(term);
  return (n && _dislikeAliasIndex[n]) || null;
}

/**
 * El nombre de un grupo para enseñar: en `lang` si lo hay, o el español.
 * @param {string} clave - de DISLIKE_GROUPS
 * @param {string} [lang]
 * @returns {string}
 */
function dislikeGroupLabel(clave, lang) {
  var alias = DISLIKE_GROUP_ALIASES[clave];
  if (lang && alias && alias[lang] && alias[lang].length) return alias[lang][0];
  return DISLIKE_GROUP_LABELS[clave] || clave;
}

/**
 * Devuelve `terms` con cada token de grupo acompañado de sus miembros.
 * "pescado" -> ["pescado", "merluza", "atun", ...]. Un token que no sea un
 * grupo se devuelve tal cual. El orden se conserva; puede haber duplicados
 * (no importa para una comparación por subcadena).
 *
 * @param {string[]} terms
 * @returns {string[]}
 */
function expandDislikeTerms(terms) {
  if (!Array.isArray(terms) || typeof DISLIKE_GROUPS === "undefined") return terms || [];
  var norm = (typeof normalizePreferenceText === "function")
    ? normalizePreferenceText
    : function (s) { return String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim(); };

  var out = [];
  terms.forEach(function (t) {
    out.push(t);
    // El grupo, también por su nombre en otro idioma («рыба» -> "pescado").
    var clave = dislikeGroupKey(t) || norm(t);
    var members = DISLIKE_GROUPS[clave];
    if (members) out.push.apply(out, members);
  });
  return out;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { DISLIKE_GROUPS: DISLIKE_GROUPS, DISLIKE_GROUP_LABELS: DISLIKE_GROUP_LABELS,
    DISLIKE_GROUP_ALIASES: DISLIKE_GROUP_ALIASES, expandDislikeTerms: expandDislikeTerms,
    dislikeGroupKey: dislikeGroupKey, dislikeGroupLabel: dislikeGroupLabel };
}
