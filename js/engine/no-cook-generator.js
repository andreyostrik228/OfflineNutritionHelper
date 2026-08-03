/**
 * js/engine/no-cook-generator.js
 * ─────────────────────────────────────────────────────────────────────────
 * Generador del modo "Sin cocinar": un plan de comidas hecho ENTERAMENTE de
 * productos reales del catálogo (js/data/real-products.js, 2769 productos),
 * filtrados por js/data/no-cook-classifier.js, sin pasar por DISH_DB ni por
 * el sistema de calorías/macros de calculator.js / plan-generator.js.
 *
 * Principio: comprado → abierto/servido/recalentado rápido → comido. Nunca
 * combina más de un puñado de productos por toma, y nunca asume que hay
 * que cocinar un plato desde cero.
 *
 * Deliberadamente NO limita el catálogo a un subconjunto pequeño — usa
 * TODOS los productos elegibles (~1800 de 2769) para maximizar variedad
 * entre generaciones. Cada llamada a generateNoCookPlan() vuelve a
 * muestrear al azar, así que pulsar el botón varias veces da combinaciones
 * distintas.
 *
 * Forma de cada producto elegido — deliberadamente más rica de lo
 * estrictamente necesario hoy (ean, brand, size, sizeUnit, price) para que
 * una futura "despensa" (Fase 7 del plan original) pueda restar lo
 * consumido del envase comprado sin rediseñar esta estructura.
 *
 * Depende de:
 *   js/data/real-products.js       (REAL_PRODUCTS)
 *   js/data/no-cook-classifier.js  (classifyNoCookProduct)
 *
 * Expone (global):
 *   generateNoCookPlan() → { slots: [{ key, label, items[] }], poolSize }
 * ─────────────────────────────────────────────────────────────────────────
 */

// Categorías "preferidas" por toma — no es una restricción dura de catálogo
// (el filtrado real ya lo hace no-cook-classifier.js), solo evita combos
// que no tienen sentido de estructura de comida (ej. un chocolate como
// "plato principal" de la cena). Si el filtro por categoría deja muy pocos
// candidatos, se cae de vuelta al pool elegible completo (ver pickItems).
var NO_COOK_MEAL_CATEGORIES = {
  breakfast: [
    "Huevos, leche y mantequilla", "Postres y yogures", "Panadería y pastelería",
    "Cereales y galletas", "Fruta y verdura", "Cacao, café e infusiones", "Zumos",
  ],
  lunch: [
    "Pizzas y platos preparados", "Charcutería y quesos", "Panadería y pastelería",
    "Conservas, caldos y cremas", "Fruta y verdura", "Agua y refrescos",
    "Marisco y pescado", "Carne", "Zumos",
  ],
  snack: [
    "Fruta y verdura", "Aperitivos", "Postres y yogures",
    "Azúcar, caramelos y chocolate", "Cereales y galletas",
  ],
  dinner: [
    "Pizzas y platos preparados", "Charcutería y quesos", "Conservas, caldos y cremas",
    "Panadería y pastelería", "Fruta y verdura", "Marisco y pescado", "Carne",
  ],
};

var NO_COOK_SLOT_DEFS = [
  { key: "breakfast", label: "Desayuno", itemCount: 3 },
  { key: "lunch", label: "Comida", itemCount: 2 },
  { key: "snack", label: "Snack", itemCount: 2 },
  { key: "dinner", label: "Cena", itemCount: 3 },
];

// Cache del pool elegible completo — se calcula una vez, no en cada click.
var _noCookEligiblePool = null;

function getNoCookEligiblePool() {
  if (_noCookEligiblePool) return _noCookEligiblePool;

  _noCookEligiblePool = REAL_PRODUCTS
    .map(function (p) {
      var classification = classifyNoCookProduct(p);
      return classification ? { product: p, level: classification.level, unit: classification.unit } : null;
    })
    .filter(Boolean);

  return _noCookEligiblePool;
}

/**
 * Elige `count` entradas al azar (sin repetir producto) de `pool`,
 * evitando los ids Y NOMBRES ya usados en el resto del plan (`usedKeys`).
 * Se comprueba también por nombre porque el catálogo tiene productos
 * distintos (EAN/tamaño de envase diferente) con el MISMO nombre
 * comercial (ej. "Flan de huevo Hacendado" en dos formatos) — repetir el
 * mismo nombre en una toma se ve como un fallo aunque sean SKUs distintos.
 * @param {object[]} pool - entradas {product, level, unit}
 * @param {number} count
 * @param {Set<string>} usedKeys - ids y nombres ya usados, mismo Set
 * @returns {object[]}
 */
function pickRandomUnique(pool, count, usedKeys) {
  var candidates = pool.filter(function (entry) {
    return !usedKeys.has(entry.product.id) && !usedKeys.has(entry.product.name);
  });
  var chosen = [];

  while (chosen.length < count && candidates.length > 0) {
    var idx = Math.floor(Math.random() * candidates.length);
    var entry = candidates[idx];
    chosen.push(entry);
    usedKeys.add(entry.product.id);
    usedKeys.add(entry.product.name);
    candidates.splice(idx, 1);
  }

  return chosen;
}

/**
 * Construye el ítem final para el plan a partir de una entrada elegible.
 * Estructura pensada para una futura despensa (ver cabecera del archivo).
 * @param {{product:object, level:number, unit:string}} entry
 * @returns {object}
 */
function buildNoCookItem(entry) {
  var p = entry.product;
  return {
    id: p.id,
    ean: p.ean,
    name: p.name,
    brand: p.brand,
    category: p.category,
    leafCategory: p.leafCategory,
    quantity: 1,
    unit: entry.unit,
    level: entry.level,
    size: p.size,
    sizeUnit: p.sizeUnit,
    price: p.price,
    kcal: p.kcal,
    protein: p.protein,
    carbs: p.carbs,
    fat: p.fat,
  };
}

/**
 * Genera un plan "sin cocinar" completo. Nunca lanza excepción -- si por
 * lo que sea el pool preferido de una toma queda vacío, cae al pool
 * elegible completo antes de dejar la toma sin productos.
 *
 * @returns {{ slots: {key:string,label:string,items:object[]}[], poolSize:number }}
 */
function generateNoCookPlan() {
  var pool = getNoCookEligiblePool();
  var usedKeys = new Set();

  var slots = NO_COOK_SLOT_DEFS.map(function (def) {
    var preferredCats = NO_COOK_MEAL_CATEGORIES[def.key] || [];
    var preferredPool = pool.filter(function (entry) {
      return preferredCats.indexOf(entry.product.category) !== -1;
    });

    var chosen = pickRandomUnique(preferredPool, def.itemCount, usedKeys);

    // Si la categoría preferida no dio suficientes candidatos (poco
    // probable con ~1800 elegibles, pero posible si ya se usaron muchos),
    // completa desde el pool elegible completo.
    if (chosen.length < def.itemCount) {
      var extra = pickRandomUnique(pool, def.itemCount - chosen.length, usedKeys);
      chosen = chosen.concat(extra);
    }

    return {
      key: def.key,
      label: def.label,
      items: chosen.map(buildNoCookItem),
    };
  });

  return { slots: slots, poolSize: pool.length };
}
