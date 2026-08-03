/**
 * js/core/pricing.js
 * ─────────────────────────────────────────────────────────────────────────
 * Motor de precios: resuelve cuánto cuesta un ingrediente o un plato en un
 * supermercado concreto, a partir de PRICE_CATALOGS (js/data/prices/*.js).
 *
 * Este archivo es DELIBERADAMENTE agnóstico de dishes.js y del algoritmo
 * de generación: no sabe qué es una "toma", un "presupuesto diario" ni un
 * "tier de relajación". Solo sabe precificar. Esa separación es lo que
 * permite añadir un supermercado nuevo sin tocar dish-selector.js ni
 * plan-generator.js — y, simétricamente, permite cambiar el algoritmo de
 * selección sin tocar esto.
 *
 * Resolución de precio de un ingrediente, en cascada:
 *   0. Producto real verificado por EAN (REAL_INGREDIENT_MATCHES, js/data/
 *      real-ingredient-matches.js) — solo para los ~12 ingredientes con un
 *      match curado a mano y priceIsUsable !== false
 *   1. Coincidencia exacta en el catálogo de la tienda activa
 *   2. Coincidencia por palabra clave de categoría de alimento
 *      (CATEGORY_FALLBACK_RULES) — cubre ingredientes que el catálogo
 *      todavía no tiene tasados uno a uno
 *   3. Precio por defecto genérico — nunca deja un ingrediente sin precio
 *
 * El campo `source` de cada resolución
 * ('real_product' | 'catalog' | 'category' | 'default') viaja hasta el
 * informe final para que quede claro qué parte del coste de un plato es
 * un precio real tasado y qué parte es una estimación.
 *
 * Depende de:
 *   js/data/prices/*.js              (PRICE_CATALOGS)
 *   js/data/real-ingredient-matches.js (REAL_INGREDIENT_MATCHES) — opcional
 *   js/data/packaging.js             (PACKAGING_INFO) — opcional, solo para
 *                                     resolvePackageInfo/resolvePurchaseCost
 *   js/core/utils.js                 (round2)
 *
 * Expone (globales):
 *   DEFAULT_STORE_ID
 *   normalizeIngredientKey(name)
 *   listAvailableStores()                    → [{ storeId, storeName }]
 *   resolveIngredientPrice(name, storeId)     → { pricePer100g, source, group }
 *   priceDishAtStore(dish, storeId)           → { cost, breakdown[], confidence }
 *   proteinPerEuro(dish, storeId)             → g de proteína por €, a escala nativa
 *   resolvePackageInfo(name, storeId)         → tamaño/precio del envase comprable
 *   resolvePurchaseCost(name, requiredGrams, storeId) → coste de USO vs. de COMPRA
 *
 * ── usageCost vs. purchaseCost (fijado aquí para que no se confundan) ──────
 *   usageCost   = pricePer100g × gramos REALMENTE usados. Es lo que ya
 *                 calculaba priceDishAtStore()/dish-selector.js, y es lo que
 *                 representa `data.budget` en plan-generator.js: un tope de
 *                 gasto de INGREDIENTES CONSUMIDOS, no de compra puntual —
 *                 un bote de miel de 250g dura varios días, así que gastar
 *                 su precio íntegro en el presupuesto de un solo día sería
 *                 incorrecto para ESE propósito. `data.budget` NO se toca.
 *   purchaseCost = precio de los paquetes/unidades ENTEROS que hay que
 *                 comprar para cubrir esos gramos (redondeo hacia arriba).
 *                 Es lo que de verdad se paga en caja HOY si no tienes ya el
 *                 producto en casa — el número correcto para el total de la
 *                 lista de la compra. Naturalmente >= usageCost, y eso es
 *                 esperado, no un error.
 * ─────────────────────────────────────────────────────────────────────────
 */

var DEFAULT_STORE_ID = "mercadona";

// Si dishes.js referencia algún día un ingrediente que ningún catálogo
// tiene tasado exactamente, esto lo clasifica por palabra clave en vez de
// dejarlo sin precio. Cubre, a propósito, prácticamente lo mismo que ya
// existe en el catálogo exacto: la redundancia es intencional, para que
// nuevos platos con ingredientes parecidos funcionen ANTES de que alguien
// actualice el catálogo exacto.
var CATEGORY_FALLBACK_RULES = [
  { keywords: ["pechuga", "pollo", "pavo", "muslo"],                                    pricePer100g: 0.40, group: "carne_ave" },
  { keywords: ["ternera", "cerdo", "lomo", "carne picada", "jamon", "chorizo"],          pricePer100g: 0.65, group: "carne_roja_embutido" },
  { keywords: ["salmon", "atun", "merluza", "bacalao", "caballa", "sardina", "pescado"], pricePer100g: 0.80, group: "pescado" },
  { keywords: ["huevo", "clara"],                                                       pricePer100g: 0.32, group: "huevo" },
  { keywords: ["skyr", "yogur", "queso", "requeson", "mozzarella", "leche"],             pricePer100g: 0.30, group: "lacteo" },
  { keywords: ["lenteja", "garbanzo", "alubia", "legumbre"],                             pricePer100g: 0.20, group: "legumbre" },
  { keywords: ["tofu", "tempeh", "edamame", "seitan"],                                   pricePer100g: 0.75, group: "proteina_vegetal" },
  { keywords: ["arroz", "pasta", "quinoa", "cuscus", "avena", "cereal", "copos"],        pricePer100g: 0.10, group: "cereal_cocido" },
  { keywords: ["pan", "tortilla", "wrap", "tortita"],                                    pricePer100g: 0.35, group: "panificado" },
  { keywords: ["patata", "batata", "boniato"],                                           pricePer100g: 0.12, group: "tuberculo" },
  { keywords: ["platano", "manzana", "naranja", "fruta", "pina", "fresa", "frutos rojos"],pricePer100g: 0.20, group: "fruta" },
  { keywords: ["almendra", "nuez", "nueces", "cacahuete", "semilla", "frutos secos"],     pricePer100g: 0.70, group: "frutos_secos" },
  { keywords: ["aceite", "mantequilla", "aguacate"],                                     pricePer100g: 0.55, group: "grasa" },
  { keywords: ["miel", "mermelada", "azucar"],                                           pricePer100g: 0.60, group: "endulzante" },
  { keywords: ["hummus"],                                                                pricePer100g: 0.65, group: "untable" }
];

var DEFAULT_FALLBACK_PRICE_PER_100G = 0.25; // verdura/hortaliza genérica u "otros"

/**
 * Normaliza un nombre de ingrediente para usarlo como clave de catálogo:
 * minúsculas, sin acentos, sin puntuación, espacios colapsados.
 * @param {string} name
 * @returns {string}
 */
function normalizeIngredientKey(name) {
  return String(name)
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[.,;:]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Lista los supermercados disponibles actualmente (para un futuro selector
 * de tienda en la UI — no usado todavía por el algoritmo).
 * @returns {{storeId:string, storeName:string}[]}
 */
function listAvailableStores() {
  return Object.keys(PRICE_CATALOGS).map(function (id) {
    return { storeId: id, storeName: PRICE_CATALOGS[id].storeName || id };
  });
}

/**
 * Resuelve el precio por 100 g de un ingrediente en una tienda, en cascada
 * (catálogo exacto → categoría por palabra clave → valor por defecto).
 * Nunca devuelve null/undefined: siempre hay un precio, aunque sea una
 * estimación genérica.
 *
 * @param {string} name     - nombre del ingrediente tal como está en dishes.js
 * @param {string} [storeId] - por defecto DEFAULT_STORE_ID
 * @returns {{ pricePer100g: number, source: 'real_product'|'catalog'|'category'|'default', group: string|null }}
 */
function resolveIngredientPrice(name, storeId) {
  var store = PRICE_CATALOGS[storeId] || PRICE_CATALOGS[DEFAULT_STORE_ID];
  var key = normalizeIngredientKey(name);

  if (typeof REAL_INGREDIENT_MATCHES !== "undefined") {
    var realMatch = REAL_INGREDIENT_MATCHES[key];
    if (realMatch && realMatch.priceIsUsable !== false && typeof realMatch.pricePer100g === "number") {
      return { pricePer100g: realMatch.pricePer100g, source: "real_product", group: null };
    }
  }

  if (store && store.pricesPer100g && typeof store.pricesPer100g[key] === "number") {
    return { pricePer100g: store.pricesPer100g[key], source: "catalog", group: null };
  }

  for (var i = 0; i < CATEGORY_FALLBACK_RULES.length; i++) {
    var rule = CATEGORY_FALLBACK_RULES[i];
    for (var j = 0; j < rule.keywords.length; j++) {
      if (key.indexOf(rule.keywords[j]) !== -1) {
        return { pricePer100g: rule.pricePer100g, source: "category", group: rule.group };
      }
    }
  }

  return { pricePer100g: DEFAULT_FALLBACK_PRICE_PER_100G, source: "default", group: null };
}

/**
 * Calcula el coste real de un plato en una tienda, sumando el precio de
 * cada ingrediente visible × sus gramos — NO reparte un coste ficticio de
 * plato por cuota de masa (así se calculaba antes).
 *
 * @param {object} dish     - entrada de DISH_DB
 * @param {string} [storeId]
 * @returns {{ cost: number, breakdown: object[], confidence: 'catalog'|'estimated' }}
 */
function priceDishAtStore(dish, storeId) {
  var breakdown = [];
  var total = 0;
  var allCatalog = true;

  (dish.items || []).forEach(function (ingredient) {
    var resolved = resolveIngredientPrice(ingredient.name, storeId);
    var lineCost = resolved.pricePer100g * ingredient.g / 100;
    total += lineCost;
    if (resolved.source !== "catalog" && resolved.source !== "real_product") allCatalog = false;
    breakdown.push({
      name: ingredient.name, g: ingredient.g,
      pricePer100g: resolved.pricePer100g, cost: round2(lineCost), source: resolved.source
    });
  });

  if (!dish.items || dish.items.length === 0) {
    // Plato sin ingredientes visibles (p.ej. placeholder de última
    // instancia) → usar dish.cost heredado si existe, si no, 0.
    total = typeof dish.cost === "number" ? dish.cost : 0;
    allCatalog = false;
  }

  return { cost: round2(total), breakdown: breakdown, confidence: allCatalog ? "catalog" : "estimated" };
}

/**
 * Gramos de proteína por euro, a escala nativa del plato (invariante ante
 * el factor de escala que se aplique después: numerador y denominador
 * escalan igual). Es el criterio de ranking principal que pide el negocio:
 * "priorizar siempre la mejor relación proteína/precio".
 *
 * @param {object} dish
 * @param {string} [storeId]
 * @returns {number}
 */
function proteinPerEuro(dish, storeId) {
  var priced = priceDishAtStore(dish, storeId);
  var cost = Math.max(priced.cost, 0.01); // evita división por cero en platos casi gratis
  return dish.protein / cost;
}

/**
 * Resuelve el tamaño y precio del envase/unidad COMPRABLE de un
 * ingrediente — el tamaño viene SIEMPRE de la misma fuente que el precio
 * que ya devuelve resolveIngredientPrice(), nunca se mezclan (un tamaño de
 * PACKAGING_INFO con un precio de REAL_INGREDIENT_MATCHES daría un coste
 * de paquete incoherente con el producto real, o viceversa):
 *
 *   - source === "real_product": el tamaño es el sizeG del propio
 *     REAL_INGREDIENT_MATCHES (el mismo producto real cuyo pricePer100g
 *     ya se está usando).
 *   - cualquier otro source (catalog/category/default): el tamaño viene de
 *     PACKAGING_INFO (envase/ración genérica estimada), si existe una
 *     entrada para este ingrediente.
 *   - si ninguna de las dos tiene un tamaño (ej. carne/pescado fresco, que
 *     se compra al peso real): packageSizeG es null — NUNCA se inventa un
 *     tamaño de envase. El código que llama debe tratar null como "se
 *     compra al peso, sin envase fijo", no como un error.
 *
 * @param {string} name
 * @param {string} [storeId]
 * @returns {{
 *   pricePer100g: number,
 *   source: 'real_product'|'catalog'|'category'|'default',
 *   packageSizeG: number|null,
 *   packageLabel: string|null,
 *   packagePrice: number|null
 * }}
 */
function resolvePackageInfo(name, storeId) {
  var priced = resolveIngredientPrice(name, storeId);
  var key = normalizeIngredientKey(name);
  var packageSizeG = null;
  var packageLabel = null;

  if (priced.source === "real_product" && typeof REAL_INGREDIENT_MATCHES !== "undefined") {
    var realMatch = REAL_INGREDIENT_MATCHES[key];
    if (realMatch && typeof realMatch.sizeG === "number" && realMatch.sizeG > 0) {
      packageSizeG = realMatch.sizeG;
      packageLabel = realMatch.productName || null;
    }
  }

  if (packageSizeG === null && typeof PACKAGING_INFO !== "undefined") {
    var info = PACKAGING_INFO[key];
    if (info) {
      if (typeof info.packageG === "number" && info.packageG > 0) {
        packageSizeG = info.packageG;
        packageLabel = info.packageLabel || null;
      } else if (info.type === "perUnit" && typeof info.gramsPerUnit === "number" && info.gramsPerUnit > 0) {
        // Se compra por unidad entera (huevo, pieza de fruta...): la
        // "unidad" hace las veces de envase — no puedes comprar media
        // pieza, así que se redondea igual que un paquete.
        packageSizeG = info.gramsPerUnit;
        packageLabel = info.unitLabel || null;
      }
    }
  }

  var packagePrice = packageSizeG !== null
    ? round2(priced.pricePer100g * packageSizeG / 100)
    : null;

  return {
    pricePer100g: priced.pricePer100g,
    source: priced.source,
    packageSizeG: packageSizeG,
    packageLabel: packageLabel,
    packagePrice: packagePrice
  };
}

/**
 * Coste de USO vs. coste de COMPRA de una cantidad requerida de un
 * ingrediente. Nunca redondea hacia abajo ni asume que sobra un paquete ya
 * abierto en casa: si hacen falta 23g de un bote de 250g, hay que comprar
 * el bote entero (packagesToBuy=1, purchaseCost = precio del bote).
 *
 * Si el ingrediente no tiene ningún envase conocido (packageSizeG=null,
 * ver resolvePackageInfo) — típicamente carne/pescado fresco, que se
 * compra al peso real — purchaseCost es igual a usageCost por diseño: no
 * hay paquete que redondear, se paga exactamente el peso necesario.
 * hasFixedPackage=false dejar constancia de que ese caso es distinto, no
 * un "bug" de purchaseCost===usageCost.
 *
 * @param {string} name
 * @param {number} requiredGrams - gramos YA agregados (suma entre todas
 *                                 las comidas del día donde aparece este
 *                                 ingrediente) — agregar ANTES de llamar,
 *                                 nunca sumar purchaseCost por comida.
 * @param {string} [storeId]
 * @returns {{
 *   requiredGrams: number,
 *   usageCost: number,
 *   hasFixedPackage: boolean,
 *   packageSizeG: number|null,
 *   packageLabel: string|null,
 *   packagesToBuy: number|null,
 *   purchaseCost: number
 * }}
 */
function resolvePurchaseCost(name, requiredGrams, storeId) {
  var pkg = resolvePackageInfo(name, storeId);
  var usageCost = round2(pkg.pricePer100g * requiredGrams / 100);

  if (pkg.packageSizeG === null || !(pkg.packageSizeG > 0)) {
    return {
      requiredGrams: requiredGrams,
      usageCost: usageCost,
      hasFixedPackage: false,
      packageSizeG: null,
      packageLabel: null,
      packagesToBuy: null,
      purchaseCost: usageCost
    };
  }

  // -1e-9: tolerancia de coma flotante para no redondear 1.0000000001 → 2
  // paquetes cuando requiredGrams es un múltiplo exacto del envase.
  var packagesToBuy = Math.max(1, Math.ceil((requiredGrams / pkg.packageSizeG) - 1e-9));
  var purchaseCost = round2(packagesToBuy * pkg.packagePrice);

  return {
    requiredGrams: requiredGrams,
    usageCost: usageCost,
    hasFixedPackage: true,
    packageSizeG: pkg.packageSizeG,
    packageLabel: pkg.packageLabel,
    packagesToBuy: packagesToBuy,
    purchaseCost: purchaseCost
  };
}