/**
 * js/data/no-cook-classifier.js
 * ─────────────────────────────────────────────────────────────────────────
 * Clasifica cada producto de REAL_PRODUCTS (js/data/real-products.js) para
 * el modo "Sin cocinar": nivel de preparación, o exclusión si el producto
 * no encaja (necesita cocinar de verdad, no es comida, o no es apto para
 * un plan de comidas de adulto).
 *
 * Niveles:
 *   0 = listo para comer (abrir y comer)
 *   1 = preparación mínima (cortar, pelar, servir, mezclar 1-2 productos)
 *   2 = calentar/cocinar rápido (microondas, horno breve, hervir un huevo)
 *   null = EXCLUIDO de este modo
 *
 * Reglas por category + leafCategory (primero coincidencia exacta de
 * leafCategory, si no por category general), con anulaciones por palabra
 * clave del nombre para categorías ambiguas (carne/pescado crudo vs listo,
 * arroz/legumbres crudo vs "cocido" ya preparado).
 *
 * NO inventa productos ni cambia sus datos — solo decide si un producto ya
 * existente en el catálogo entra en este modo y con qué nivel/unidad.
 *
 * Consumido por: js/engine/no-cook-generator.js
 * ─────────────────────────────────────────────────────────────────────────
 */

// Categorías completas excluidas: alcohol, farmacia, bebé, no-alimentario
// (filtrado por error en el pipeline Python), o condimentos que no son un
// "producto" independiente de una comida.
var NO_COOK_EXCLUDED_CATEGORIES = new Set([
  "Bodega",
  "Fitoterapia y parafarmacia",
  "Bebé",
  "Cuidado facial y corporal",
  "Cuidado del cabello",
  "Aceite, especias y salsas",
]);

// Reglas por leafCategory exacta (mayor prioridad que la regla de category).
var LEAF_RULES = {
  // Panadería y pastelería
  "Harina": null,
  "Levadura y preparado repostería": null,
  "Masas": null,
  "Decoración": null,
  "Velas": null,

  // Aperitivos
  // (Decoración ya cubierta arriba)

  // Cereales y galletas
  "Fitoterapia": null, // fuga de categorización en el pipeline Python

  // Huevos, leche y mantequilla
  "Huevos": { level: 2, unit: "huevo" }, // necesitan hervirse, no se comen crudos
  "Leche Infantil": null,

  // Postres y yogures
  "Yogures y postres infantiles": null,

  // Cacao, café e infusiones — necesitan agua caliente/máquina
  "Café en grano": null, // requiere molienda, más allá de "calentar rápido"
  "Café molido":   null, // requiere cafetera/moka, más allá de "calentar rápido"

  // Arroz, legumbres y pasta — crudos por defecto, ver keyword override abajo
  // (todas las leaf de esta categoría se manejan por keyword, no aquí)

  // Marisco y pescado — crudo por defecto, ver keyword override
  // Ahumados y Salazones son la excepción lista para comer:
  "Ahumados": { level: 1, unit: "porción" },
  "Salazones": { level: 1, unit: "porción" },
  "Surimi y otros": { level: 1, unit: "porción" },

  // Conservas, caldos y cremas
  "Caldo en pastillas": null, // ingrediente de cocina, no un producto por sí solo
  "Sopa": { level: 2, unit: "ración" },
  "Cremas y puré": { level: 2, unit: "ración" },
  "Caldo líquido": { level: 2, unit: "ración" },
  "Gazpacho y salmorejo": { level: 0, unit: "vaso" }, // se sirve frío

  // Azúcar, caramelos y chocolate — excluir dulces puros (no son "una comida")
  "Chicles": null,
  "Caramelos": null,
  "Golosinas": null,
  "Bombones": null,
  "Confitura y otros": null,
  "Decoración ": null,

  // Fruta y verdura — crudo listo para comer vs. necesita cocinar de verdad
  "Otras verduras y hortalizas": null,
  "Cebolla y ajo": null,
  "Setas y champiñones": null,
  "Patata": null,
  "Repollo y col": null,
  "Verduras al vapor": { level: 2, unit: "bolsa" }, // bolsa de vapor al microondas
  "Ensalada preparada": { level: 1, unit: "bolsa" },
  "Lechuga": { level: 1, unit: "unidad" },
  "Pepino y zanahoria": { level: 1, unit: "unidad" },
  // Excluida a propósito (null, NO simplemente omitida -- omitirla caería
  // en la regla de category "Fruta y verdura" y la incluiría igual): el
  // calabacín crudo no es algo que se coma tal cual (a diferencia del
  // pepino/zanahoria/pimiento), y esta leaf mezcla ambos sin forma de
  // separarlos por nombre.
  "Calabacín y pimiento": null,

  // Pizzas y platos preparados — la mayoría "calentar", unos pocos ya fríos
  "Platos fríos": { level: 1, unit: "unidad" },
  "Hummus y otros": { level: 0, unit: "tarrina" },
  "Ensaladilla": { level: 0, unit: "tarrina" },
  "Sándwich": { level: 0, unit: "unidad" },
  "Base de pizza": null, // no es una comida completa por sí sola
};

// Reglas por category general (se aplican si no hay regla de leaf exacta).
var CATEGORY_RULES = {
  "Charcutería y quesos":       { level: 1, unit: "porción" },
  "Panadería y pastelería":     { level: 0, unit: "rebanada" },
  "Aperitivos":                 { level: 0, unit: "puñado" },
  "Cereales y galletas":        { level: 1, unit: "ración" },
  "Huevos, leche y mantequilla":{ level: 0, unit: "vaso" },
  "Postres y yogures":          { level: 0, unit: "unidad" },
  "Cacao, café e infusiones":   { level: 2, unit: "taza" },
  "Zumos":                      { level: 0, unit: "vaso" },
  "Agua y refrescos":           { level: 0, unit: "unidad" },
  "Conservas, caldos y cremas": { level: 1, unit: "lata" },
  "Azúcar, caramelos y chocolate": { level: 0, unit: "porción" },
  "Fruta y verdura":            { level: 0, unit: "unidad" },
  "Pizzas y platos preparados": { level: 2, unit: "ración" },

  // Carne / Marisco y pescado / Arroz, legumbres y pasta: crudo por
  // defecto (excluido) salvo que el nombre indique lo contrario — ver
  // keyword override abajo. Sin regla aquí == excluido si no hay match.
};

// Palabras clave que, dentro de una categoría normalmente CRUDA, indican
// que el producto concreto SÍ está listo o casi listo para comer.
//
// "adobado"/"marinado" SOLOS se excluyeron a propósito: significan que la
// carne cruda lleva un adobo, no que esté cocinada — sigue necesitando
// cocción real ("Tacos de vacuno marinado para guisar" es crudo). Solo
// cuentan como señal de "listo" cuando van junto a "empanado"/"rebozado"
// (frito de fábrica, se recalienta) o "fiambre"/"loncha" (charcutería).
var READY_KEYWORDS_MEAT_FISH = [
  "empanado", "rebozado", "listo", "loncha", "fiambre", "cocid", "ahumad",
];

// Frases que anulan un match "listo" -- indican que el producto es
// crudo/ingrediente PARA preparar un plato, no un producto ya preparado.
// Ej.: "Trozo de vacuno para cocido" (cocido = guiso, no "cocinado") o
// "Steak Tartar" (carne cruda, no apto para recomendar sin cocinar aquí).
var NOT_READY_PHRASES = ["para guisar", "para cocido", "para asar", "para freir", "para hervir", "tartar"];

var READY_KEYWORDS_STAPLE = ["cocid"]; // "cocido"/"cocida" -> ya preparado

function normalizeText(s) {
  return String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

/**
 * Clasifica un producto. Devuelve { level, unit } o null si se excluye.
 * @param {object} product - entrada de REAL_PRODUCTS
 * @returns {{level:number, unit:string}|null}
 */
function classifyNoCookProduct(product) {
  var category = product.category;
  var leaf = product.leafCategory;

  if (NO_COOK_EXCLUDED_CATEGORIES.has(category)) return null;

  if (Object.prototype.hasOwnProperty.call(LEAF_RULES, leaf)) {
    return LEAF_RULES[leaf];
  }

  var name = normalizeText(product.name);
  var notReady = NOT_READY_PHRASES.some(function (phrase) { return name.indexOf(phrase) !== -1; });

  if (category === "Carne" || category === "Marisco y pescado") {
    if (notReady) return null;
    var ready = READY_KEYWORDS_MEAT_FISH.some(function (kw) { return name.indexOf(kw) !== -1; });
    return ready ? { level: 2, unit: "porción" } : null;
  }

  if (category === "Arroz, legumbres y pasta") {
    if (notReady) return null;
    var readyStaple = READY_KEYWORDS_STAPLE.some(function (kw) { return name.indexOf(kw) !== -1; });
    return readyStaple ? { level: 1, unit: "tarrina" } : null;
  }

  if (Object.prototype.hasOwnProperty.call(CATEGORY_RULES, category)) {
    return CATEGORY_RULES[category];
  }

  // Categoría no contemplada -> por seguridad, excluir (mejor pecar de
  // menos variedad que sugerir algo que en realidad necesita cocinarse).
  return null;
}
