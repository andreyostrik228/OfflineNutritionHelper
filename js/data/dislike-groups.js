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
};

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
    var members = DISLIKE_GROUPS[norm(t)];
    if (members) out.push.apply(out, members);
  });
  return out;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { DISLIKE_GROUPS: DISLIKE_GROUPS, DISLIKE_GROUP_LABELS: DISLIKE_GROUP_LABELS, expandDislikeTerms: expandDislikeTerms };
}
