/**
 * poc/data/ingredient-rules.js
 * ─────────────────────────────────────────────────────────────────────────
 * Registro de resolución de ingredientes para la prueba de concepto.
 * Cubre SOLO los 17 roles usados por poc-recipes.js (no los 65 de
 * dishes.js completo -- eso es deliberado, ver instrucciones de esta
 * fase). Cada rol fue verificado a mano contra js/data/real-products.js
 * (grep + lectura directa), el mismo método ya usado en
 * js/data/real-ingredient-matches.js para los 12 casos existentes.
 *
 * Cada regla:
 *   role            - clave usada por poc-recipes.js
 *   category        - categoría exacta que debe tener el producto real
 *   leafCategoryAllow (opcional) - lista blanca de leafCategory
 *   nameExcludeAny  (opcional) - palabras que descartan un candidato
 *                                aunque coincida categoría (ready-meals,
 *                                ahumados, en conserva, loncheados...)
 *   maxProteinPer100g / maxFatPer100g (opcional) - techo de plausibilidad:
 *     para verdura/fruta cruda, valores de proteína/grasa por encima de
 *     esto indican un producto mal etiquetado o mal emparejado por el
 *     pipeline (ver caso "Manzana Golden" más abajo), NO un ingrediente
 *     real. Esto es una comprobación adicional a needsReview/kcal!=null.
 *   pinnedProductId (si status = "resolved") - id verificado a mano cuando
 *     hay varios candidatos válidos y hace falta desambiguar (mismo
 *     patrón que real-ingredient-matches.js).
 *   status          - "resolved" | "unresolved"
 *   rejectedCandidates (si unresolved, o si hay candidatos descartados
 *     antes del elegido) - lista con motivo concreto de rechazo, para
 *     que quede constancia de que NO se ignoró el problema.
 * ─────────────────────────────────────────────────────────────────────────
 */

var INGREDIENT_RULES = {

  // ── Resueltos (11) ─────────────────────────────────────────────────────

  "pechuga de pollo": {
    status: "resolved",
    category: "Carne",
    leafCategoryAllow: ["Pollo"],
    nameExcludeAny: ["braseada", "lonchas", "loncheado", "fiambre"],
    pinnedProductId: "3724",
    note: "Coincide con el match ya curado a mano en real-ingredient-matches.js -- validación cruzada independiente."
  },

  "arroz blanco cocido": {
    status: "resolved",
    category: "Arroz, legumbres y pasta",
    leafCategoryAllow: ["Arroz"],
    nameIncludeAny: ["cocid"],
    pinnedProductId: "22279",
    note: "\"Arroz cocido redondo Sabroz\" -- medido ya cocido, mismo criterio que dishes.js (gramos en cocido, no en crudo)."
  },

  "miel": {
    status: "resolved",
    category: "Azúcar, caramelos y chocolate",
    leafCategoryAllow: ["Miel"],
    pinnedProductId: "15448",
    note: "\"Miel de naranjo Hacendado\" -- nutritionSource=null (nutrición legacy, previa al pipeline) pero needsReview=false y macros plausibles para miel (~330kcal, ~83g carbs/100g)."
  },

  "leche semidesnatada": {
    status: "resolved",
    category: "Huevos, leche y mantequilla",
    leafCategoryAllow: ["Leche semidesnatada"],
    pinnedProductId: "10382",
    note: "Se eligió el formato de 1L (compra habitual) entre varios tamaños casi idénticos en macros; el resto (6L, 9L, 1.5L) son el mismo producto a otro tamaño de envase."
  },

  "pan integral": {
    status: "resolved",
    category: "Panadería y pastelería",
    leafCategoryAllow: ["Barra de pan"],
    pinnedProductId: "12049.1",
    note: "\"Pan integral trigo 100%\", sin marca -- genérico Mercadona."
  },

  "atun al natural": {
    status: "resolved",
    category: "Conservas, caldos y cremas",
    leafCategoryAllow: ["Atún"],
    nameIncludeAny: ["natural"],
    pinnedProductId: "18018",
    note: "Coincide EXACTAMENTE con el match ya curado en real-ingredient-matches.js (mismo EAN) -- segunda validación cruzada independiente."
  },

  "tomate": {
    status: "resolved",
    category: "Fruta y verdura",
    leafCategoryAllow: ["Tomate"],
    pinnedProductId: "69971",
    note: "\"Tomates\" (fresco, 2kg). Se descartaron 5 candidatos previos por categoría equivocada.",
    rejectedCandidates: [
      { name: "Tomate para untar Hacendado con aceite de oliva", reason: "es un paté/spread, no tomate fresco" },
      { name: "Tomate tamizado sin piel Hacendado", reason: "tomate triturado en conserva (passata), no fresco" },
      { name: "Tomate troceado pelado Hacendado", reason: "conserva, no fresco" },
      { name: "Tomate entero pelado Hacendado", reason: "conserva, no fresco" },
      { name: "Tomate triturado Hacendado", reason: "conserva, no fresco" }
    ]
  },

  "almendras": {
    status: "resolved",
    category: "Aperitivos",
    leafCategoryAllow: ["Frutos secos"],
    nameIncludeAny: ["almendra"],
    maxFatPer100g: 65,
    pinnedProductId: "34014",
    note: "\"Almendra tostada Hacendado 0% sal añadida con piel\" -- exact_ean, macros coherentes con almendra real (~628kcal, 57g grasa/100g)."
  },

  "manzana": {
    status: "resolved",
    category: "Fruta y verdura",
    leafCategoryAllow: ["Manzana y pera"],
    nameIncludeAny: ["manzana"],
    maxProteinPer100g: 1.0,
    maxFatPer100g: 1.0,
    pinnedProductId: "3269",
    note: "\"Manzanas Golden\" (bolsa 1.5kg). Se descartó \"Manzana Golden\" (singular, id distinto) pese a needsReview=false y kcal no nulo.",
    rejectedCandidates: [
      { name: "Manzana Golden", reason: "macros implausibles para una manzana cruda: 3.4g proteína / 4.1g grasa por 100g (una manzana real ronda 0.3g proteína / 0.2g grasa) -- filtro de plausibilidad, no solo needsReview" }
    ]
  },

  "espinacas": {
    status: "resolved",
    category: "Fruta y verdura",
    nameIncludeAny: ["espinaca"],
    pinnedProductId: "69984",
    note: "\"Espinacas baby lavadas\" -- nutritionSource=null (legacy) pero needsReview=false y macros plausibles (28kcal/100g, propio de hoja verde).",
    rejectedCandidates: [
      { name: "Espinacas cortadas y lavadas", reason: "kcal=null, sin nutrición verificable" }
    ]
  },

  "yogur griego ligero": {
    status: "resolved",
    category: "Postres y yogures",
    leafCategoryAllow: ["Yogures griegos"],
    nameIncludeAny: ["ligero"],
    pinnedProductId: "21358",
    note: "Coincide EXACTAMENTE con el match ya curado en real-ingredient-matches.js (mismo EAN) -- tercera validación cruzada independiente."
  },

  // ── No resueltos (6) -- NUNCA se sustituye por un producto al azar ─────

  "avena": {
    status: "unresolved",
    reason: "Único candidato encontrado (\"Avena molida Hacendado\") tiene needsReview=true y nutritionConfidence=\"low\" -- descartado por la regla de fiabilidad, no hay alternativa.",
    rejectedCandidates: [
      { name: "Avena molida Hacendado", reason: "needsReview=true, nutritionConfidence=low" }
    ]
  },

  "platano": {
    status: "unresolved",
    reason: "Ningún candidato es a la vez (a) plátano de mesa (no plátano macho) y (b) con nutrición verificada.",
    rejectedCandidates: [
      { name: "Plátano macho", reason: "es plátano macho (plantain) -- subespecie distinta, normalmente se cocina, no se come crudo como fruta dulce; coincide por texto pero no por rol culinario" },
      { name: "Plátano de Canarias IGP", reason: "kcal=null, sin nutrición verificable" }
    ]
  },

  "skyr natural": {
    status: "unresolved",
    reason: "No existe ningún producto llamado \"Skyr\" en el catálogo (0 candidatos). Coincide con lo ya documentado en real-ingredient-matches.js: \"skyr natural -> matcheaba con yogur normal (perfil de macros distinto)\" -- se mantiene sin match en vez de forzar un yogur genérico.",
    rejectedCandidates: []
  },

  "brocoli": {
    status: "unresolved",
    reason: "Único candidato (\"Brócoli\") tiene kcal=null -- sin nutrición verificable.",
    rejectedCandidates: [
      { name: "Brócoli", reason: "kcal=null" }
    ]
  },

  "pepino": {
    status: "unresolved",
    reason: "Los dos candidatos (\"Pepino\", \"Pepino holandés\") tienen kcal=null.",
    rejectedCandidates: [
      { name: "Pepino", reason: "kcal=null" },
      { name: "Pepino holandés", reason: "kcal=null" }
    ]
  },

  "salmon": {
    status: "unresolved",
    reason: "Los 4 candidatos encontrados no corresponden al rol culinario que pide la receta (filete fresco para la plancha): uno es un plato preparado con verduras, otro es conserva en lata, y dos son salmón ahumado. Ninguno es un filete crudo/fresco.",
    rejectedCandidates: [
      { name: "Salmón con verduras Listo para Comer", reason: "plato preparado, no filete crudo" },
      { name: "Salmón al natural Hacendado", reason: "conserva en lata, textura/preparación distinta a la plancha" },
      { name: "Salmón ahumado Hacendado", reason: "ahumado en frío, no apto para \"a la plancha\"" }
    ]
  }
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = { INGREDIENT_RULES: INGREDIENT_RULES };
}
