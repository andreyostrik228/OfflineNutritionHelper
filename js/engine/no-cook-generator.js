/**
 * js/engine/no-cook-generator.js
 * ─────────────────────────────────────────────────────────────────────────
 * Generador del modo "Sin cocinar": un día de comidas hecho ENTERAMENTE de
 * productos reales del catálogo, sin cocinar nada. Solo abrir, untar,
 * apilar, enrollar o microondas — nunca tabla, cuchillo de cocina ni fuego.
 *
 * ── Reescrito el 2026-09-01. Qué hacía antes y por qué no servía ────────
 * La versión anterior cogía 2-3 productos AL AZAR de una lista laxa de
 * categorías permitidas por toma. No tenía ni raciones, ni objetivo de
 * calorías, ni presupuesto, ni idea de qué combina con qué. Planes reales
 * que generó (medidos, no hipotéticos):
 *   - una "Comida" que era un refresco de naranja y un Aquarius;
 *   - una "Cena" de ensalada y tortillas de trigo, sin nada dentro;
 *   - una "Cena" de pimientos + queso con trufa + jamón ibérico de 22 €,
 *     con un coste de día de 47,39 €;
 *   - y todos los macros en pantalla eran los de por 100 g, así que una
 *     pizza de 430 g se anunciaba como "245 kcal" cuando son 1.054.
 *
 * ── Cómo funciona ahora ─────────────────────────────────────────────────
 *   1. Cada producto trae RACIÓN y PAPEL (js/data/serving-sizes.js).
 *   2. Cada toma se monta con una PLANTILLA (js/data/no-cook-templates.js):
 *      base + proteína + queso + verdura, o un plato completo, etc. Un
 *      papel `required` que no se puede rellenar descarta la plantilla, así
 *      que no salen bases sin relleno.
 *   3. Se ESCALAN raciones hacia las kcal objetivo de la toma (subir y
 *      bajar, ver scaleToTarget) en vez de servir siempre una ración.
 *   4. Se REUTILIZAN los productos ya comprados ese día antes que abrir uno
 *      nuevo: el mismo pan y el mismo queso valen para varias tomas.
 *   5. Los productos "fresh" (pizza, rosca, plato caliente) se consumen
 *      ENTEROS el mismo día: en una toma si las kcal encajan, o repartidos
 *      entre comida y cena. Nunca queda media pizza para mañana.
 *
 * Depende de:
 *   js/core/pricing.js              (getRealProductsForStore, DEFAULT_STORE_ID)
 *   js/data/no-cook-classifier.js   (classifyNoCookProduct)
 *   js/data/serving-sizes.js        (resolveServing, macrosForGrams, isPlausibleForRole)
 *   js/data/no-cook-templates.js    (templatesForSlot)
 *   js/core/preferences.js          (filterDislikedProducts, getDislikes) — opcional
 *
 * Expone (global):
 *   generateNoCookPlan(storeId, options) → { slots, poolSize, total, target,
 *                                            shoppingCost, consumedCost, productCount }
 *
 * Se mantiene en UN archivo a propósito, aunque pase de 500 líneas: partirlo
 * en "generador del día" + "montador de una toma" se probó y salía peor --
 * el montador necesita 10 símbolos del generador y el generador llama al
 * montador, así que la separación era circular y solo funcionaba por el
 * orden de los <script>. En un proyecto sin módulos eso es una trampa, no
 * una frontera. Referencia de tamaño en este mismo repo: plan-generator.js
 * tiene 1.351 líneas y pantry.js 1.467.
 * ─────────────────────────────────────────────────────────────────────────
 */

// Reparto de calorías por toma — mismos ratios que el motor de platos
// (MEAL_DEFS en plan-generator.js), para que los dos modos repartan el día
// igual y quien alterne entre ambos no vea dos lógicas distintas.
var NO_COOK_SLOT_DEFS = [
  { key: "breakfast", label: "Desayuno", ratio: 0.24 },
  { key: "lunch",     label: "Comida",   ratio: 0.30 },
  { key: "snack",     label: "Snack 1",  ratio: 0.12 },
  { key: "dinner",    label: "Cena",     ratio: 0.23 },
  { key: "snack2",    label: "Snack 2",  ratio: 0.11 },
];

// Objetivo por defecto cuando se llama sin perfil (el botón "Sin cocinar"
// no exige rellenar el formulario). No es una recomendación nutricional:
// es un punto de partida para que las raciones salgan de tamaño humano.
var NO_COOK_DEFAULT_CALORIES = 2100;

// Margen aceptado alrededor del objetivo de una toma antes de dejar de
// escalar. Se para en raciones ENTERAS: no existe "1,4 lonchas de pavo".
var NO_COOK_KCAL_LOW = 0.92;
var NO_COOK_KCAL_HIGH = 1.10;

// ── El presupuesto es un TECHO DURO sobre el TICKET (2026-09-01) ────────
// Antes se medía contra el coste CONSUMIDO (el valor de las raciones que
// te comes hoy) y el ticket solo tenía un tope laxo de 3x. El resultado
// era honesto pero inútil: el usuario decía 14 € y en caja pagaba 25.
//
// Ahora se comporta como el motor de platos, donde `mealCap`/
// `remainingBudget` es "el ÚNICO techo real" sobre purchaseCost: si dices
// 5 €, el ticket no pasa de 5 €. Lo que sobra de cada envase sigue yendo a
// la despensa y abarata los días siguientes, pero eso ya no es una excusa
// para pasarse hoy.
//
// La reutilización es la palanca que lo hace posible: volver a usar un
// producto ya comprado cuesta 0 €, así que con presupuesto ajustado el
// plan converge solo hacia pocos productos bien aprovechados.

// Por debajo de este presupuesto diario se generan 3 tomas (desayuno,
// comida, cena) en vez de 5: con poco dinero, gastarlo en dos snacks deja
// las comidas principales flojas. Petición explícita del usuario.
var NO_COOK_MIN_BUDGET_FOR_SNACKS = 8;

// A partir de estos productos distintos en el día, los componentes
// OPCIONALES de una plantilla dejan de abrir productos nuevos: se rellenan
// solo si se puede reutilizar algo ya comprado. Los `required` NUNCA se
// saltan, así que una comida no se queda coja por este tope -- solo pierde
// el extra. Es lo que pidió el usuario: "no necesitamos un millón de
// productos al día, hay que organizar lo que tenemos".
var NO_COOK_SOFT_PRODUCT_CAP = 8;

// Papeles que se reutilizan de una toma a otra. Los "fresh" nunca: un
// plato preparado se acaba, no se reparte por todo el día.
var REUSABLE_ROLES = ["carrier", "queso", "protein", "veg", "untable", "cereal", "lacteo", "fruta", "salado", "dulce", "sopa"];

var _noCookEligiblePoolByStore = {};

/**
 * ¿Este producto tiene nutrición utilizable? Un producto sin kcal aporta
 * `null` a los totales y ocupa un hueco que podría llevar comida real
 * (medido el 2026-08-25: con Alcampo, 67% del pool no tenía kcal).
 */
function hasUsableNutrition(p) {
  return !!p && typeof p.kcal === "number" && isFinite(p.kcal) && p.kcal > 0;
}

/**
 * Pool elegible de la tienda, con ración y papel resueltos. Cacheado POR
 * TIENDA (una caché global serviría productos de la tienda anterior).
 * @param {string} [storeId]
 * @returns {object[]} entradas {product, level, unit, serving}
 */
function getNoCookEligiblePool(storeId) {
  var resolvedStoreId = storeId || (typeof DEFAULT_STORE_ID !== "undefined" ? DEFAULT_STORE_ID : "mercadona");
  if (_noCookEligiblePoolByStore[resolvedStoreId]) return _noCookEligiblePoolByStore[resolvedStoreId];

  var products = (typeof getRealProductsForStore === "function")
    ? getRealProductsForStore(resolvedStoreId)
    : (typeof REAL_PRODUCTS !== "undefined" ? REAL_PRODUCTS : []);

  var pool = [];
  for (var i = 0; i < products.length; i++) {
    var p = products[i];
    if (!hasUsableNutrition(p)) continue;
    var classification = classifyNoCookProduct(p);
    if (!classification) continue;
    var serving = (typeof resolveServing === "function") ? resolveServing(p) : null;
    var unit = (serving && serving.unit) ? serving.unit : classification.unit;
    // Descarta emparejamientos de nutrición imposibles para el papel (el
    // "Banana" de 528 kcal/100 g que en realidad son chips de plátano).
    // Ver ROLE_KCAL_CEILING en serving-sizes.js.
    if (serving && typeof isPlausibleForRole === "function"
        && !isPlausibleForRole(p, serving.role, serving.maxKcal)) continue;
    // Sin tamaño de envase no se puede calcular ni ración ni coste: el
    // precio que trae es basura. Un solo producto del catálogo está así,
    // "Langostino cocido", con price 1084,05 EUR y size null (es el precio
    // por kilo mal capturado). Fuera.
    if (!serving || serving.packageG == null) continue;
    // Y descarta el registro que se contradice a sí mismo ("Pomelo",
    // 15 kcal con P10/C20/F10). Ver hasConsistentMacros en serving-sizes.js.
    if (typeof hasConsistentMacros === "function" && !hasConsistentMacros(p)) continue;
    pool.push({ product: p, level: classification.level, unit: unit, serving: serving });
  }

  _noCookEligiblePoolByStore[resolvedStoreId] = pool;
  return pool;
}

function servingMacros(entry, servings) {
  return macrosForGrams(entry.product, entry.serving.servingG * servings);
}

function addMacros(a, b) {
  a.kcal += b.kcal; a.protein += b.protein; a.carbs += b.carbs; a.fat += b.fat;
  return a;
}

function emptyMacros() {
  return { kcal: 0, protein: 0, carbs: 0, fat: 0 };
}

/**
 * Ítem final de una toma. Lleva los gramos y macros REALES de lo que se
 * come, no los de 100 g del catálogo (ver la cabecera de este archivo).
 */
function buildNoCookItem(entry, servings, buysPackage) {
  var p = entry.product;
  var sv = entry.serving;
  var grams = sv.servingG * servings;
  var m = macrosForGrams(p, grams);

  return {
    id: p.id, ean: p.ean, name: p.name, brand: p.brand,
    category: p.category, leafCategory: p.leafCategory,
    role: sv.role,
    servings: servings,
    // `quantity` se conserva como alias de `servings`: pantry.js
    // (saveNoCookPlanForToday) y los planes ya guardados lo leen con ese
    // nombre. Renombrarlo a secas habría roto la despensa en silencio.
    quantity: servings,
    servingG: sv.servingG,
    grams: Math.round(grams),
    unit: entry.unit,
    level: entry.level,
    policy: sv.policy,
    servingsPerPackage: sv.servingsPerPackage,
    // Envase entero consumido en esta toma -- lo que el usuario pidió ver
    // explícitamente para la pizza ("úsala entera, no una ración").
    wholePackage: sv.servingsPerPackage > 0 && servings >= sv.servingsPerPackage,
    size: p.size, sizeUnit: p.sizeUnit, price: p.price,
    buysPackage: !!buysPackage,
    kcal: m.kcal, protein: m.protein, carbs: m.carbs, fat: m.fat,
  };
}

/**
 * Elige una entrada del pool para un papel. Prioridad, y este orden ES la
 * funcionalidad:
 *   1. un producto YA comprado hoy con ese papel — así el día usa 5-6
 *      productos bien aprovechados en vez de 10 a medio abrir;
 *   2. si no, uno nuevo que quepa en el presupuesto restante;
 *   3. si nada cabe en el presupuesto: null para un papel opcional, y el
 *      envase más barato solo si el papel es `required` (allowOverrun).
 * @returns {{entry:object, reused:boolean}|null}
 */
function pickForRole(role, pool, day, allowFresh, allowOverrun, priorityOverride) {
  if (REUSABLE_ROLES.indexOf(role) !== -1) {
    // Sólo se reutiliza mientras quede envase: un paquete de tortillas de
    // 5 raciones da para 5 usos hoy, no para diez. Sin este tope el
    // reaprovechamiento compraba paquetes de más del mismo producto.
    var reusable = day.order
      .map(function (id) { return day.bought[id]; })
      .filter(function (b) {
        return b && b.entry.serving.role === role
          && b.entry.serving.policy !== "fresh"
          && b.servingsUsed < (b.entry.serving.servingsPerPackage || 1)
          && !(day.avoidIds && day.avoidIds[b.entry.product.id]);
      });
    if (reusable.length) {
      return { entry: reusable[Math.floor(Math.random() * reusable.length)].entry, reused: true };
    }
  }

  var candidates = [];
  var avoided = [];
  for (var i = 0; i < pool.length; i++) {
    var e = pool[i];
    if (!e.serving || e.serving.role !== role) continue;
    if (day.bought[e.product.id]) continue;
    if (day.usedNames[e.product.name]) continue;
    if (!allowFresh && e.serving.policy === "fresh") continue;
    // `avoidIds` son los productos que la toma traía ANTES de pulsar
    // "Cambiar": el objetivo del botón es ofrecer algo DISTINTO (por
    // ejemplo porque ese producto no está en tu Mercadona), así que se
    // apartan. Se recuperan solo si sin ellos el papel no se puede llenar.
    if (day.avoidIds && day.avoidIds[e.product.id]) { avoided.push(e); continue; }
    candidates.push(e);
  }
  if (!candidates.length) candidates = avoided;
  if (!candidates.length) return null;

  // TECHO DURO: el envase tiene que caber en lo que queda del presupuesto.
  // Reutilizar no pasa por aquí (cuesta 0 €), así que con poco dinero el
  // plan se apoya en lo ya comprado en vez de abrir productos nuevos.
  // `pendingSpend` son los envases ya elegidos en ESTA toma pero todavía
  // sin contabilizar (se eligen todos los componentes y luego se confirman).
  // Sin sumarlo, los 4 componentes de una plantilla comprobaban el techo
  // contra el mismo `day.spent` viejo y entre los cuatro se lo saltaban:
  // era la fuga que dejaba 154 de 200 planes por encima del presupuesto.
  var committed = day.spent + (day.pendingSpend || 0);
  // Se guarda dinero para las tomas que aún no se han construido. Comida y
  // cena se montan primero y, sin esta reserva, se comían el presupuesto
  // entero y el desayuno no tenía con qué: era la última fuente de planes
  // por encima del techo.
  var cap = day.budget - (day.reserve || 0);
  var affordable = candidates.filter(function (e) {
    if (typeof e.product.price !== "number") return true;
    return (committed + e.product.price) <= cap;
  });

  // Si NADA cabe, no se inventa dinero: solo un papel `required` justifica
  // pasarse, y aun así se coge el envase más barato que existe. El exceso
  // se reporta (budgetOverrun) en vez de esconderse.
  var from = affordable;
  if (!from.length) {
    if (!allowOverrun) return null;
    from = candidates.slice().sort(function (a, b) {
      return (a.product.price || 0) - (b.product.price || 0);
    }).slice(0, 3);
  }

  // En modo "barato" manda el precio, y se aplica ANTES que las
  // preferencias blandas (si "marca propia" o "envase grande" fueran
  // primero podrían dejar fuera justo la mejor opción).
  //
  // La métrica es COMIDA POR EURO (€ por 100 kcal del envase), no el precio
  // del envase. Ordenar por precio a secas prefería un Pan Viena de 0,40 €
  // que trae UNA ración frente a una barra de 1,19 € que trae nueve: el
  // ticket bajaba pero el plan se quedaba en 1.747 kcal de 2.600 y encima
  // dejaba 5,57 € del presupuesto sin usar. "Comer por 5 €" es comida por
  // euro, no envases baratos.
  var priority = priorityOverride || day.priority || "balanced";
  if (priority === "cheap" && from.length > 3) {
    var byValue = from.slice().sort(function (a, b) {
      return costPer100Kcal(a) - costPer100Kcal(b);
    });
    from = byValue.slice(0, Math.max(3, Math.ceil(byValue.length / 4)));
  }

  // Productos que están en CUALQUIER Mercadona. El catálogo se capturó en
  // una sola tienda y el usuario se encontró con "no disponible en tu código
  // postal"; no hay dato de disponibilidad por tienda en ninguna parte del
  // pipeline, así que la mejor aproximación honesta es la marca propia:
  // Hacendado está en todas las tiendas y es el 77% del pool con papel.
  var common = from.filter(function (e) {
    return /hacendado/i.test(e.product.brand || "") || /hacendado/i.test(e.product.name || "");
  });
  if (common.length >= 3) from = common;

  // Envases que dan para VARIAS raciones: permiten reutilizar más tarde,
  // que es lo que baja el número de productos distintos del día.
  var roomy = from.filter(function (e) { return (e.serving.servingsPerPackage || 1) >= 3; });
  if (roomy.length >= 3) from = roomy;

  // ── El eje "prioridad" (2026-09-01) ─────────────────────────────────
  // Precio y proteína están MEDIDOS como opuestos en este catálogo: elegir
  // entre el 25% más barato baja el ticket de 24,71 € a 12,93 € y la
  // proteína de 146 g a 107 g. No hay un ajuste que gane en los dos lados,
  // así que lo elige el usuario en vez de decidirlo yo por él.
  if (priority === "balanced" && from.length > 3) {
    var byPrice = from.slice().sort(function (a, b) {
      return (a.product.price || 0) - (b.product.price || 0);
    });
    from = byPrice.slice(0, Math.max(3, Math.ceil(byPrice.length / 2)));
  }

  // Sesgo de proteína, salvo en modo "barato" (ahí manda el precio). El
  // techo no es el sesgo sino el catálogo: la comida lista para comer rinde
  // ~0,11 g de proteína por kcal, así que 160 g a 2.600 kcal no se alcanza
  // sin cocinar -- la UI lo dice en vez de fingir que lo cumple.
  if (role === "protein" && priority !== "cheap" && from.length > 3) {
    var ranked = from.slice().sort(function (a, b) {
      return (b.product.protein || 0) - (a.product.protein || 0);
    });
    var share = priority === "protein" ? 5 : 3;
    from = ranked.slice(0, Math.max(3, Math.ceil(ranked.length / share)));
  }

  // En modo "barato" el sorteo se sesga hacia el principio de la lista ya
  // ordenada por precio (r^2 concentra la probabilidad en los primeros):
  // un sorteo plano dentro del 25% más barato dejaba el ticket en 8,87 €
  // de mediana cuando el suelo real de un día coherente es 4,40 €. Sigue
  // habiendo variedad, pero lo barato sale mucho más a menudo.
  var idx = (day.priority === "cheap")
    ? Math.floor(Math.pow(Math.random(), 2) * from.length)
    : Math.floor(Math.random() * from.length);
  return { entry: from[Math.min(idx, from.length - 1)], reused: false };
}

/**
 * Coste del ENVASE por cada 100 kcal que trae. Es la medida de "comida por
 * euro": un envase caro que da para muchas raciones puede alimentar más
 * barato que uno barato de una sola ración.
 * @param {object} entry - entrada del pool
 * @returns {number} EUR/100 kcal, o Infinity si no se puede calcular
 */
function costPer100Kcal(entry) {
  var price = entry.product.price;
  if (typeof price !== "number" || !entry.serving || !entry.serving.packageG) return Infinity;
  var kcalInPackage = macrosForGrams(entry.product, entry.serving.packageG).kcal;
  if (!(kcalInPackage > 0)) return Infinity;
  return price / (kcalInPackage / 100);
}

function picksKcal(picks) {
  var k = 0;
  for (var i = 0; i < picks.length; i++) k += servingMacros(picks[i].entry, picks[i].servings).kcal;
  return k;
}

function picksProtein(picks) {
  var g = 0;
  for (var i = 0; i < picks.length; i++) g += servingMacros(picks[i].entry, picks[i].servings).protein;
  return g;
}

/**
 * Ajusta las raciones de una toma hacia su objetivo de calorías, subiendo
 * o bajando de ración en ración. Los componentes `fixed` (un envase
 * "fresh" cuyo reparto ya está decidido) no se tocan.
 *
 * Al bajar se recortan primero los componentes OPCIONALES: si hay que
 * quitar calorías, sobra antes el queso extra que la proteína que hace
 * que la comida sea una comida.
 */
function scaleToTarget(picks, target, targetProtein) {
  var guard = 0;
  while (picksKcal(picks) < target * NO_COOK_KCAL_LOW && guard++ < 40) {
    var best = null, bestScore = -Infinity;
    var fallback = null, fallbackKcal = Infinity;
    var proteinShort = targetProtein > 0 && picksProtein(picks) < targetProtein;

    for (var i = 0; i < picks.length; i++) {
      var pk = picks[i];
      if (pk.fixed || pk.servings >= (pk.comp.maxServings || 1)) continue;
      var m = servingMacros(pk.entry, 1);
      if (m.kcal <= 0) continue;
      var after = picksKcal(picks) + m.kcal;

      if (after <= target * NO_COOK_KCAL_HIGH) {
        // Cuanto más cerca deje del objetivo, mejor; a igualdad, gana lo
        // que más proteína aporta cuando la toma va corta de proteína.
        var score = -Math.abs(after - target);
        if (proteinShort) score += (m.protein / Math.max(1, m.kcal)) * target;
        if (score > bestScore) { bestScore = score; best = pk; }
      } else if (m.kcal < fallbackKcal) {
        fallback = pk; fallbackKcal = m.kcal;
      }
    }

    // Si NINGUNA ración cabe sin pasarse del techo pero seguimos por
    // debajo del suelo, se añade la más pequeña igualmente: pasarse un
    // poco es mejor que dejar la toma un 30% corta. Sin este escape el
    // día entero se quedaba sistemáticamente bajo (medido: 2.242 kcal de
    // media frente a un objetivo de 2.600).
    if (!best && fallback) best = fallback;
    if (!best) break;
    best.servings++;
  }

  guard = 0;
  while (picksKcal(picks) > target * NO_COOK_KCAL_HIGH && guard++ < 40) {
    var shrinkable = picks.filter(function (pk) { return !pk.fixed && pk.servings > 1; });
    var optional = shrinkable.filter(function (pk) { return !pk.comp.required; });
    var list = optional.length ? optional : shrinkable;

    if (!list.length) {
      // Nada que reducir: se quita entero el opcional más calórico. Los
      // `required` nunca se quitan -- sin ellos deja de ser la comida que
      // la plantilla prometía.
      var dropIdx = -1, dropKcal = -1;
      for (var j = 0; j < picks.length; j++) {
        if (picks[j].fixed || picks[j].comp.required) continue;
        var k = servingMacros(picks[j].entry, picks[j].servings).kcal;
        if (k > dropKcal) { dropKcal = k; dropIdx = j; }
      }
      if (dropIdx === -1) break;
      picks.splice(dropIdx, 1);
      continue;
    }

    list.sort(function (a, b) { return servingMacros(b.entry, 1).kcal - servingMacros(a.entry, 1).kcal; });
    list[0].servings--;
  }
}

/**
 * Monta UNA toma a partir de una plantilla.
 *
 * @param {object} tpl
 * @param {object} slotDef
 * @param {number} targetKcal
 * @param {object[]} pool
 * @param {object} day
 * @param {{allowSplitFresh?:boolean}} [opts]
 * @returns {object|null} null si falta un componente `required`.
 */
function buildSlotFromTemplate(tpl, slotDef, targetKcal, pool, day, opts) {
  var allowSplitFresh = !!(opts && opts.allowSplitFresh);
  var allowOverrun = !!(opts && opts.allowOverrun);
  day.pendingSpend = 0;
  var isMain = slotDef.key === "lunch" || slotDef.key === "dinner";
  var picks = [];

  // 1) Un envase "fresh" a medias de otra toma de HOY se termina aquí
  //    antes que abrir nada nuevo. Solo se acepta si la plantilla tiene un
  //    hueco de ese papel: media pizza NUNCA se cuela dentro de un wrap.
  var pending = null;
  if (isMain && day.freshPending.length) {
    for (var pi = 0; pi < day.freshPending.length; pi++) {
      var cand = day.freshPending[pi];
      var fits = tpl.components.some(function (c) { return c.role === cand.entry.serving.role; });
      if (fits) { pending = day.freshPending.splice(pi, 1)[0]; break; }
    }
  }

  for (var i = 0; i < tpl.components.length; i++) {
    var comp = tpl.components[i];

    if (pending && pending.entry.serving.role === comp.role) {
      picks.push({ entry: pending.entry, comp: comp, servings: pending.servings, fixed: true });
      pending = null;
      continue;
    }

    // Sólo comida y cena pueden abrir un plato preparado.
    var picked = pickForRole(comp.role, pool, day, isMain,
      !!comp.required && !!(opts && opts.allowOverrun),
      opts && opts.priorityOverride);
    if (!picked) {
      if (comp.required) { day.pendingSpend = 0; return null; }   // plantilla imposible
      continue;
    }
    // Un extra opcional no justifica abrir el producto número ocho del día
    // (ver NO_COOK_SOFT_PRODUCT_CAP). Si no se puede reutilizar algo ya
    // comprado, se deja fuera y la comida sigue completa igualmente.
    //
    // En modo "barato" el listón es total: un opcional SOLO entra si sale
    // gratis (reutilizando un envase ya abierto). Comprar un producto más
    // para un extra es justo lo que dispara el ticket.
    if (!comp.required && !picked.reused) {
      if (day.priority === "cheap") continue;
      if (day.order.length >= NO_COOK_SOFT_PRODUCT_CAP) continue;
    }
    if (!picked.reused && !day.bought[picked.entry.product.id]
        && typeof picked.entry.product.price === "number") {
      day.pendingSpend = (day.pendingSpend || 0) + picked.entry.product.price;
    }
    picks.push({ entry: picked.entry, comp: comp, servings: 1, fixed: false });
  }

  if (!picks.length) { day.pendingSpend = 0; return null; }

  // 2) Política del envase "fresh": se consume ENTERO el mismo día. Si las
  //    raciones que encajan aquí llegan al envase, se come entero ahora;
  //    si no, y esta toma admite reparto, lo que sobra queda apuntado para
  //    la otra toma principal de hoy. Nunca se guarda para mañana.
  for (var f = 0; f < picks.length; f++) {
    var pk = picks[f];
    var sv = pk.entry.serving;
    if (pk.fixed || sv.policy !== "fresh") continue;

    var perServing = servingMacros(pk.entry, 1).kcal;
    var fit = perServing > 0 ? Math.round(targetKcal / perServing) : 1;
    fit = Math.max(1, Math.min(sv.servingsPerPackage, fit));

    if (!allowSplitFresh || fit >= sv.servingsPerPackage) {
      pk.servings = sv.servingsPerPackage;             // envase entero, una toma
    } else {
      pk.servings = fit;
      day.freshPending.push({ entry: pk.entry, servings: sv.servingsPerPackage - fit });
    }
    pk.fixed = true;   // el envase manda: no se reescala por calorías
  }

  scaleToTarget(picks, targetKcal, opts && opts.targetProtein);

  day.pendingSpend = 0;   // a partir de aquí manda `day.spent` de verdad
  var items = [];
  var total = emptyMacros();
  for (var c = 0; c < picks.length; c++) {
    var p2 = picks[c];
    var perPack = p2.entry.serving.servingsPerPackage || 1;
    var price = p2.entry.product.price;

    // TECHO DURO también al ESCALAR. Aquí estaba la fuga real del
    // presupuesto: subir a 3 raciones de un envase que trae 1 compra tres
    // envases, y eso se sumaba a `day.spent` sin comprobar nada. El pick
    // respetaba el techo y el escalado se lo saltaba -- 156 de 200 planes
    // se pasaban con 14 € de tope. Se recorta a las raciones que el dinero
    // que queda permite, nunca por debajo de una.
    var existing = day.bought[p2.entry.product.id];
    var alreadyUsed = existing ? existing.servingsUsed : 0;
    var packsBefore = existing ? Math.max(1, Math.ceil(alreadyUsed / perPack)) : 0;
    if (typeof price === "number" && price > 0 && day.budget !== Infinity && !allowOverrun) {
      var affordablePacks = Math.floor((day.budget - day.spent) / price) + packsBefore;
      var maxServings = Math.max(1, affordablePacks * perPack - alreadyUsed);
      if (p2.servings > maxServings) p2.servings = maxServings;
    }

    var buys = registerPurchase(day, p2.entry);
    var bought = day.bought[p2.entry.product.id];
    packsBefore = Math.max(1, packsBefore || 1);
    bought.servingsUsed += p2.servings;
    var packsAfter = Math.max(1, Math.ceil(bought.servingsUsed / perPack));
    // Gastar más raciones de las que trae un envase significa comprar OTRO
    // envase, y eso se paga. Sin esto el presupuesto se contaba una sola
    // vez por producto y el día real acababa costando más de lo pedido
    // (medido: 18,99 € con un tope de 14 €).
    if (packsAfter > packsBefore && typeof p2.entry.product.price === "number") {
      day.spent += p2.entry.product.price * (packsAfter - packsBefore);
    }
    if (typeof costForGrams === "function") {
      day.consumed += costForGrams(p2.entry.product, p2.entry.serving.servingG * p2.servings);
    }
    items.push(buildNoCookItem(p2.entry, p2.servings, buys));
    addMacros(total, servingMacros(p2.entry, p2.servings));
  }

  return {
    items: items, total: total, assembly: tpl.assembly,
    templateKey: tpl.key, templateLabel: tpl.label,
  };
}

/** Registra la compra de un producto nuevo. @returns {boolean} si es nuevo */
function registerPurchase(day, entry) {
  var id = entry.product.id;
  if (day.bought[id]) return false;
  day.bought[id] = { entry: entry, servingsUsed: 0 };
  day.order.push(id);
  day.usedNames[entry.product.name] = true;
  if (typeof entry.product.price === "number") day.spent += entry.product.price;
  return true;
}

/** Elige una plantilla al azar ponderada por `weight`. */
function pickTemplate(templates) {
  var totalWeight = templates.reduce(function (s, t) { return s + (t.weight || 1); }, 0);
  var r = Math.random() * totalWeight;
  for (var i = 0; i < templates.length; i++) {
    r -= (templates[i].weight || 1);
    if (r <= 0) return templates[i];
  }
  return templates[templates.length - 1];
}

/** Prueba plantillas hasta que una se monte entera. */
/**
 * Reserva estimada para las tomas que quedan por montar. Se apoya en el
 * envase más barato del pool: con eso una toma posterior siempre puede al
 * menos completar sus papeles obligatorios (y muchas veces ni gasta, porque
 * reutiliza lo ya comprado, que es gratis).
 */
function budgetReserveFor(remainingSlots, pool, day) {
  if (day.budget === Infinity || remainingSlots <= 0) return 0;
  if (day.minPackagePrice == null) {
    var min = Infinity;
    for (var i = 0; i < pool.length; i++) {
      var pr = pool[i].product.price;
      if (typeof pr === "number" && pr > 0 && pr < min) min = pr;
    }
    day.minPackagePrice = isFinite(min) ? min : 0;
  }
  // Dos papeles obligatorios por toma como mucho; se limita a un tercio del
  // presupuesto para no estrangular la comida y la cena.
  var reserve = day.minPackagePrice * 2 * remainingSlots;
  return Math.min(reserve, day.budget / 3);
}

function buildSlot(slotKey, targetKcal, pool, day, opts) {
  var slotDef = NO_COOK_SLOT_DEFS.filter(function (d) { return d.key === slotKey; })[0];
  var templates = (typeof templatesForSlot === "function") ? templatesForSlot(slotKey) : [];
  if (opts && opts.forceTemplateKey) {
    var forced = templates.filter(function (t) { return t.key === opts.forceTemplateKey; });
    if (forced.length) templates = forced;
  }

  // TRES pasadas, de más a menos exigente. El presupuesto es un techo duro,
  // así que antes de saltárselo se renuncia a TODO lo demás:
  //   1. todas las plantillas, con la prioridad elegida, dentro del techo;
  //   2. igual, pero renunciando a la prioridad (se compra por precio):
  //      preferir proteína cara no vale un ticket incumplido;
  //   3. solo entonces, pasarse, y con el envase más barato que exista.
  //
  // Medido: con la pasada 2, los planes que se pasaban del presupuesto
  // cayeron de 159/200 a una fracción, sin tocar el techo.
  var PASSES = [
    { allowOverrun: false, priorityOverride: null },
    { allowOverrun: false, priorityOverride: "cheap" },
    { allowOverrun: true,  priorityOverride: "cheap" },
  ];
  for (var pass = 0; pass < PASSES.length; pass++) {
    var passOpts = {};
    for (var k in opts) passOpts[k] = opts[k];
    passOpts.allowOverrun = PASSES[pass].allowOverrun;
    passOpts.priorityOverride = PASSES[pass].priorityOverride;

    var remaining = templates.slice();
    while (remaining.length) {
      var tpl = pickTemplate(remaining);
      remaining = remaining.filter(function (t) { return t !== tpl; });
      var result = buildSlotFromTemplate(tpl, slotDef, targetKcal, pool, day, passOpts);
      if (result) return result;
    }
  }
  return { items: [], total: emptyMacros(), assembly: "", templateKey: null, templateLabel: null };
}


/**
 * Genera un plan "sin cocinar" completo. Nunca lanza: si una toma no se
 * puede montar con ninguna plantilla se devuelve vacía, no rompe el plan.
 *
 * @param {string} [storeId]
 * @param {{calories?:number, protein?:number, budget?:number}} [options]
 * @returns {{slots, poolSize, total, target, shoppingCost, productCount}}
 */
function generateNoCookPlan(storeId, options) {
  var opts = options || {};
  var pool = getNoCookEligiblePool(storeId);

  // "No me gusta" se aplica AQUÍ y no dentro de getNoCookEligiblePool() a
  // propósito: ese pool está cacheado por tienda y las preferencias cambian
  // sin que cambie el catálogo. Es una preferencia BLANDA. Las alergias NO
  // se filtran aquí (js/core/allergens.js: son etiqueta, nunca filtro).
  if (typeof filterDislikedProducts === "function" && typeof getDislikes === "function") {
    pool = filterDislikedProducts(pool, getDislikes());
  }

  var targetKcal = (typeof opts.calories === "number" && opts.calories > 0)
    ? opts.calories : NO_COOK_DEFAULT_CALORIES;

  var day = {
    bought: {}, order: [], usedNames: {},
    spent: 0,       // ticket: envases completos que hay que comprar hoy (TECHO)
    consumed: 0,    // valor de lo que realmente se come hoy (informativo)
    // "satiety" es el nombre nuevo (2026-09-01) de lo que aquí se llamaba
    // "cheap": el mismo criterio, más comida por euro. Se aceptan los dos.
    priority: (opts.priority === "cheap" || opts.priority === "satiety") ? "cheap"
      : (opts.priority === "protein" ? "protein" : "balanced"),
    budget: (typeof opts.budget === "number" && opts.budget > 0) ? opts.budget : Infinity,
    freshPending: [],
  };

  var targetProtein = (typeof opts.protein === "number" && opts.protein > 0) ? opts.protein : 0;

  // Con poco dinero, 3 tomas en vez de 5: repartir un presupuesto ajustado
  // entre cinco tomas deja las principales flojas y encima obliga a abrir
  // productos extra solo para los snacks. Petición explícita del usuario.
  var slotKeys = (day.budget < NO_COOK_MIN_BUDGET_FOR_SNACKS)
    ? ["breakfast", "lunch", "dinner"]
    : ["breakfast", "lunch", "snack", "dinner", "snack2"];
  var threeMealDay = slotKeys.length === 3;
  // Tomas que NO son comida/cena: se construyen después y absorben lo que
  // esas dos se hayan pasado (ver más abajo).
  var restKeysAll = slotKeys.filter(function (k) { return k !== "lunch" && k !== "dinner"; });
  // Las kcal del día no cambian: se reparten entre las tomas que haya, así
  // que en modo 3 tomas cada una es más grande en vez de comer menos.
  var ratioSum = slotKeys.reduce(function (a, k) {
    return a + NO_COOK_SLOT_DEFS.filter(function (d) { return d.key === k; })[0].ratio;
  }, 0);
  var ratioFor = function (key) {
    return NO_COOK_SLOT_DEFS.filter(function (x) { return x.key === key; })[0].ratio / ratioSum;
  };
  var kcalFor = function (key) { return targetKcal * ratioFor(key); };
  var protFor = function (key) { return targetProtein * ratioFor(key); };

  var built = {};

  // Comida y cena van EMPAREJADAS y primero. La comida puede abrir un
  // plato preparado y repartirlo; si lo hace, la cena queda obligada a la
  // plantilla "principal" para terminárselo. La cena, al ser la última
  // toma principal del día, nunca reparte: lo que abre, se lo acaba.
  day.reserve = budgetReserveFor(slotKeys.length - 1, pool, day);
  built.lunch = buildSlot("lunch", kcalFor("lunch"), pool, day, {
    allowSplitFresh: true, targetProtein: protFor("lunch"),
  });
  day.reserve = budgetReserveFor(slotKeys.length - 2, pool, day);
  built.dinner = buildSlot("dinner", kcalFor("dinner"), pool, day, {
    allowSplitFresh: false,
    targetProtein: protFor("dinner"),
    forceTemplateKey: day.freshPending.length ? "principal" : null,
  });

  // Desayuno y snacks se reparten lo que QUEDA del día, no su cuota
  // teórica. Comida y cena pueden pasarse bastante de su cuota cuando
  // abren un envase "fresh" que hay que acabarse (una pizza entera son
  // ~1.050 kcal); si el resto del día siguiera apuntando a su ratio fijo,
  // el total se disparaba -- medido: máximos de 4.059 kcal sobre un
  // objetivo de 2.600. Así el exceso se absorbe en vez de acumularse.
  var restKeys = restKeysAll;
  var restRatio = restKeys.reduce(function (a, k) { return a + ratioFor(k); }, 0);
  var usedKcal = built.lunch.total.kcal + built.dinner.total.kcal;
  var remainingKcal = Math.max(0, targetKcal - usedKcal);
  var usedProtein = built.lunch.total.protein + built.dinner.total.protein;
  var remainingProtein = Math.max(0, targetProtein - usedProtein);

  restKeys.forEach(function (key) {
    var share = ratioFor(key) / restRatio;
    built[key] = buildSlot(key, remainingKcal * share, pool, day, {
      allowSplitFresh: false,
      targetProtein: remainingProtein * share,
    });
  });

  // Red de seguridad: si algún envase "fresh" siguiera pendiente (formatos
  // de 3+ raciones), se suma a la toma que ya lo tiene. Se come hoy, como
  // pidió el usuario, en vez de quedarse a medias en la despensa.
  if (day.freshPending.length) {
    day.freshPending.forEach(function (pend) {
      var target = built.dinner.items.some(function (it) { return it.id === pend.entry.product.id; })
        ? built.dinner : built.lunch;
      var existing = target.items.filter(function (it) { return it.id === pend.entry.product.id; })[0];
      if (existing) {
        existing.servings += pend.servings;
        existing.grams = Math.round(existing.servingG * existing.servings);
        var m = macrosForGrams(pend.entry.product, existing.grams);
        existing.kcal = m.kcal; existing.protein = m.protein; existing.carbs = m.carbs; existing.fat = m.fat;
        existing.wholePackage = existing.servings >= existing.servingsPerPackage;
        addMacros(target.total, servingMacros(pend.entry, pend.servings));
      }
    });
    day.freshPending = [];
  }

  // Coste real de la compra: un producto del que se usan más raciones de
  // las que trae un envase necesita MÁS DE UN envase, y eso se paga.
  var shoppingCost = 0;
  day.order.forEach(function (id) {
    var b = day.bought[id];
    var perPack = b.entry.serving.servingsPerPackage || 1;
    var packs = Math.max(1, Math.ceil(b.servingsUsed / perPack));
    if (typeof b.entry.product.price === "number") shoppingCost += b.entry.product.price * packs;
  });

  var total = emptyMacros();
  var slots = NO_COOK_SLOT_DEFS.filter(function (def) {
    return slotKeys.indexOf(def.key) !== -1;
  }).map(function (def) {
    var b = built[def.key];
    addMacros(total, b.total);
    return {
      key: def.key, label: def.label, items: b.items, total: b.total,
      assembly: b.assembly, templateKey: b.templateKey, templateLabel: b.templateLabel,
    };
  });

  return {
    slots: slots,
    poolSize: pool.length,
    total: total,
    target: { kcal: targetKcal, protein: opts.protein || null },
    shoppingCost: Math.round(shoppingCost * 100) / 100,
    consumedCost: Math.round(day.consumed * 100) / 100,
    productCount: day.order.length,
    budget: day.budget === Infinity ? null : day.budget,
    // Se pasó del presupuesto: solo puede ocurrir cuando ni el envase más
    // barato de un papel OBLIGATORIO cabía. Se dice, no se esconde.
    budgetOverrun: (day.budget !== Infinity && shoppingCost > day.budget)
      ? Math.round((shoppingCost - day.budget) * 100) / 100 : 0,
    threeMealDay: threeMealDay,
    priority: day.priority,
  };
}

/**
 * "Cambiar SOLO esta toma" del plan sin cocinar, sin tocar las demás.
 *
 * El usuario lo pidió como su red de seguridad contra el problema de
 * disponibilidad por tienda: no hay dato de qué hay en CADA Mercadona (no
 * existe en el pipeline), así que si un producto no está en la suya, vuelve
 * a tirar esa toma y con el sesgo hacia marca propia es muy improbable que
 * la siguiente tampoco esté.
 *
 * A diferencia del motor de platos, aquí no se guarda el estado del día
 * entre llamadas: se RECONSTRUYE a partir de las otras tomas (qué está
 * comprado, cuántas raciones se han usado y cuánto se lleva gastado) para
 * que la toma nueva reutilice lo ya comprado y siga respetando el
 * presupuesto del día completo.
 *
 * @param {object} plan - plan devuelto por generateNoCookPlan()
 * @param {string} slotKey
 * @param {string} [storeId]
 * @param {{calories?:number, protein?:number, budget?:number, priority?:string}} [options]
 * @returns {{slot:object}|{error:string}}
 */
function regenerateNoCookSlot(plan, slotKey, storeId, options) {
  if (!plan || !Array.isArray(plan.slots)) return { error: "no_plan" };
  var slotDef = NO_COOK_SLOT_DEFS.filter(function (d) { return d.key === slotKey; })[0];
  if (!slotDef) return { error: "unknown_slot_key" };
  var idx = -1;
  for (var i = 0; i < plan.slots.length; i++) if (plan.slots[i].key === slotKey) idx = i;
  if (idx === -1) return { error: "slot_not_found" };

  var opts = options || {};
  var pool = getNoCookEligiblePool(storeId);
  if (typeof filterDislikedProducts === "function" && typeof getDislikes === "function") {
    pool = filterDislikedProducts(pool, getDislikes());
  }
  var byId = {};
  for (var j = 0; j < pool.length; j++) byId[pool[j].product.id] = pool[j];

  var day = {
    bought: {}, order: [], usedNames: {}, spent: 0, consumed: 0,
    // "satiety" es el nombre nuevo (2026-09-01) de lo que aquí se llamaba
    // "cheap": el mismo criterio, más comida por euro. Se aceptan los dos.
    priority: (opts.priority === "cheap" || opts.priority === "satiety") ? "cheap"
      : (opts.priority === "protein" ? "protein" : "balanced"),
    budget: (typeof opts.budget === "number" && opts.budget > 0) ? opts.budget : Infinity,
    freshPending: [], reserve: 0, pendingSpend: 0,
    avoidIds: {},
  };

  // Todo lo que había en ESTA toma se aparta: pulsar "Cambiar" tiene que
  // dar otra cosa. Sin esto el reroll devolvía los mismos productos una y
  // otra vez (solo cambiaba la plantilla), y entonces no sirve para lo que
  // el usuario lo quiere: esquivar un producto que su tienda no tiene.
  plan.slots[idx].items.forEach(function (it) { day.avoidIds[it.id] = true; });

  // Estado del día a partir de las OTRAS tomas.
  plan.slots.forEach(function (slot) {
    if (slot.key === slotKey) return;
    slot.items.forEach(function (it) {
      var entry = byId[it.id];
      if (!entry) return;
      if (!day.bought[it.id]) {
        day.bought[it.id] = { entry: entry, servingsUsed: 0 };
        day.order.push(it.id);
        day.usedNames[it.name] = true;
      }
      day.bought[it.id].servingsUsed += (it.servings || 1);
    });
  });
  day.order.forEach(function (id) {
    var b = day.bought[id];
    var perPack = b.entry.serving.servingsPerPackage || 1;
    var packs = Math.max(1, Math.ceil(b.servingsUsed / perPack));
    if (typeof b.entry.product.price === "number") day.spent += b.entry.product.price * packs;
  });

  var targetKcal = (typeof opts.calories === "number" && opts.calories > 0)
    ? opts.calories : NO_COOK_DEFAULT_CALORIES;
  var ratioSum = plan.slots.reduce(function (a, s) {
    var d = NO_COOK_SLOT_DEFS.filter(function (x) { return x.key === s.key; })[0];
    return a + (d ? d.ratio : 0);
  }, 0) || 1;
  var share = slotDef.ratio / ratioSum;

  var built = buildSlot(slotKey, targetKcal * share, pool, day, {
    allowSplitFresh: false,
    targetProtein: (opts.protein || 0) * share,
  });
  if (!built.items.length) return { error: "no_alternative_found" };

  // El horario de la toma no cambia porque cambie el plato.
  if (typeof plan.slots[idx].time === "string") built.time = plan.slots[idx].time;
  if (typeof plan.slots[idx].timeMinutes === "number") built.timeMinutes = plan.slots[idx].timeMinutes;
  built.key = slotKey;
  built.label = slotDef.label;
  return { slot: built };
}
