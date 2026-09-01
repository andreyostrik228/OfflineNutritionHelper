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
 * Desde 2026-08-24 (selector de tienda), si category/leafCategory no
 * coincide con NINGUNA regla curada (típico de Alcampo/Carrefour, cuya
 * taxonomía no es la de Mercadona), cae en un fallback por palabras
 * clave del NOMBRE (ver "Fallback por nombre" más abajo) antes de
 * excluir -- deliberadamente menos preciso que las reglas curadas, solo
 * para no dejar el catálogo de otra tienda con el pool siempre vacío.
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

// Productos frescos que SÍ están listos para comer pero que nadie se come
// solos: son condimento o guarnición, no una pieza de fruta ni una ración
// de verdura. Sin esto, la leaf "Cítricos" mete limones y limas en el pool
// de fruta y el generador llegó a proponer "1 limón" como snack (visto en
// un plan real). Se comprueban sobre el NOMBRE porque la taxonomía de
// Mercadona los mete en la misma leaf que naranjas y mandarinas.
var NOT_EATEN_ALONE = ["limon", "lima ", "limas", "perejil", "cilantro", "albahaca", "hierbabuena", "jengibre", "guindilla"];

// ── Fallback por nombre (2026-08-24, selector de tienda) ────────────────
// Todo lo de arriba está tasado contra la taxonomía de categorías
// CURADA de Mercadona (category/leafCategory tal como los trae
// products.db.json). Alcampo/Carrefour no comparten esa taxonomía --
// su category/leafCategory viene de la propia estructura de navegación
// de cada tienda (ver scrapers en PythonProject), así que no coincide
// con NINGUNA regla de arriba. Sin este fallback, todo su catálogo
// caía en el "excluir por defecto" final -- confirmado en vivo que
// generateNoCookPlan("alcampo") devolvía el pool vacío pese a tener
// productos reales (ver plan de la sesión).
//
// classifyByNameFallback() SOLO se consulta cuando ni la categoría
// excluida, ni leaf, ni category dieron un resultado -- para Mercadona
// esa rama nunca se alcanza, su categoría siempre coincide con alguna
// regla curada de arriba. Mismo principio de seguridad que el resto
// del archivo: ante la duda, excluir (mejor menos variedad que sugerir
// algo que en realidad necesita cocinarse) -- esto es deliberadamente
// una cobertura razonable de señales de nombre inequívocas, NO
// exhaustiva, y con menos precisión que las reglas curadas de arriba.

var FALLBACK_EXCLUDE_KEYWORDS = [
  // Alcohol -- mismo motivo que la categoría "Bodega" ya excluida
  // arriba, pero por nombre (aquí no hay categoría fiable en la que
  // apoyarse).
  "vino", "cerveza", "cava", "licor", "whisky", "vodka", "ginebra",
  "tequila", "cóctel", "coctel", "sidra", "champagne", "champán", " ron ",
  // Ingredientes/materias primas crudas -- necesitan cocinar de verdad,
  // no son "un producto listo para una comida" por sí solos. "masa" NO
  // vive en esta lista a propósito -- se comprueba aparte en
  // classifyByNameFallback() con una excepción para "masa madre", ver
  // ahí el razonamiento completo.
  "harina", "levadura", "para guisar", "para asar", "para freir",
  "para freír", "para hervir", "para cocido", "carne picada", "filete de",
  "chuleta", "solomillo", "aceite", "vinagre", "especias",
  // Higiene/farmacia/bebé -- fugas de categorización del scraping, no
  // son comida (mismo motivo que NO_COOK_EXCLUDED_CATEGORIES arriba).
  "pañal", "champú", "gel de ducha", "desodorante", "pasta de dientes",
];

// Grupos ordenados por especificidad -- el primero que matchee gana.
// Los platos compuestos (pizza, lasaña...) van ANTES que los
// ingredientes sueltos (queso, jamón...) a propósito: un nombre como
// "Pizza cuatro quesos" contiene "queso" como ingrediente mencionado,
// pero sigue siendo fundamentalmente una pizza (hay que calentarla, no
// es una porción de queso suelta) -- confirmado por un test que
// primero falló con el orden contrario antes de reordenar esto.
var FALLBACK_READY_KEYWORDS = [
  { keywords: ["pizza", "lasaña", "lasagna", "canelones", "croqueta", "empanadilla", "nugget"], level: 2, unit: "ración" },
  { keywords: ["sopa", "crema de", "caldo"], level: 2, unit: "ración" },
  { keywords: ["hummus", "guacamole"], level: 1, unit: "tarrina" },
  { keywords: ["ensalada preparada", "ensalada lista"], level: 1, unit: "bolsa" },
  { keywords: ["sandwich", "sándwich", "bocadillo"], level: 1, unit: "unidad" },
  { keywords: ["yogur", "yogourt", "kefir", "kéfir", "cuajada", "petit suisse"], level: 0, unit: "unidad" },
  { keywords: ["jamon cocido", "jamón cocido", "jamon serrano", "jamón serrano", "fiambre", "salchichon", "salchichón", "chorizo", "mortadela", "lomo embuchado", "pate", "paté"], level: 0, unit: "porción" },
  { keywords: ["queso"], level: 0, unit: "porción" },
  { keywords: ["manzana", "platano", "plátano", "banana", "pera", "naranja", "mandarina", "uva", "fresa", "melocoton", "melocotón", "kiwi", "sandia", "sandía", "melon", "melón", "ciruela", "nectarina", "aguacate"], level: 0, unit: "unidad" },
  { keywords: ["frutos secos", "almendras", "nueces", "anacardos", "pistachos", "cacahuetes", "avellanas"], level: 0, unit: "puñado" },
  { keywords: ["pan de molde", "pan bimbo", "pan tostado", "biscote"], level: 0, unit: "rebanada" },
  { keywords: ["galleta", "cereales"], level: 1, unit: "ración" },
  { keywords: ["zumo", "batido", "smoothie"], level: 0, unit: "vaso" },
  { keywords: ["agua mineral", "agua con gas", "refresco", "cola", "fanta", "tonica", "tónica", "limonada", "isotonica", "isotónica"], level: 0, unit: "unidad" },
];

/**
 * @param {string} name
 * @returns {{level:number, unit:string}|null}
 */
function classifyByNameFallback(name) {
  var text = normalizeText(name);

  // "masa" suelto -> casi siempre base cruda sin hornear (masa de
  // pizza/hojaldre/empanada...), pero "masa madre" es una excepción
  // real: describe la fermentación de un pan YA HORNEADO ("Pan de
  // hogaza (masa madre) con cereales"), no un producto crudo -- sin
  // esta excepción, ese pan (perfectamente listo para comer) se
  // excluiría por error. Confirmado en vivo que frases exactas como
  // "masa para pizza"/"masa de pizza" no cubren variantes reales de
  // nombre de producto ("Masa rectangular maxi para pizza"), así que
  // se comprueba la palabra suelta en vez de una lista de frases.
  if (text.indexOf("masa") !== -1 && text.indexOf("masa madre") === -1) {
    return null;
  }

  if (FALLBACK_EXCLUDE_KEYWORDS.some(function (kw) { return text.indexOf(kw) !== -1; })) {
    return null;
  }

  for (var i = 0; i < FALLBACK_READY_KEYWORDS.length; i++) {
    var group = FALLBACK_READY_KEYWORDS[i];
    if (group.keywords.some(function (kw) { return text.indexOf(kw) !== -1; })) {
      return { level: group.level, unit: group.unit };
    }
  }

  return null;
}

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

  // Condimentos y guarniciones que no son una ración de nada por sí solos
  // (ver NOT_EATEN_ALONE). Antes de cualquier regla de leaf/category,
  // porque el problema es justo que su leaf dice que son fruta o verdura.
  var rawName = normalizeText(product.name);
  if (NOT_EATEN_ALONE.some(function (kw) { return rawName.indexOf(kw) !== -1; })) return null;

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

  // Categoría no contemplada en la taxonomía curada de Mercadona --
  // antes de excluir directamente, prueba el fallback por nombre (ver
  // "Fallback por nombre" más arriba): para Mercadona esta rama nunca
  // se alcanza, pero es lo que permite que Alcampo/Carrefour tengan
  // algún producto elegible en vez de un pool siempre vacío.
  return classifyByNameFallback(product.name);
}
