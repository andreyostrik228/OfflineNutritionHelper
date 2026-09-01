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

// Tope del TICKET (lo que se paga hoy en caja) como múltiplo del
// presupuesto diario. Los envases duran varios días, así que el ticket
// puede superar el presupuesto de un día -- pero no sin límite: sin este
// tope, medir contra el coste consumido dejaba pasar un jamón de 22 EUR y
// un plan llegó a 533 EUR de compra con un presupuesto de 14.
var NO_COOK_TICKET_MULTIPLIER = 3;

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
 *   3. si el presupuesto no deja ninguno, de los más baratos (mejor una
 *      comida completa algo cara que una toma coja).
 * @returns {{entry:object, reused:boolean}|null}
 */
function pickForRole(role, pool, day, allowFresh) {
  if (REUSABLE_ROLES.indexOf(role) !== -1) {
    // Sólo se reutiliza mientras quede envase: un paquete de tortillas de
    // 5 raciones da para 5 usos hoy, no para diez. Sin este tope el
    // reaprovechamiento compraba paquetes de más del mismo producto.
    var reusable = day.order
      .map(function (id) { return day.bought[id]; })
      .filter(function (b) {
        return b && b.entry.serving.role === role
          && b.entry.serving.policy !== "fresh"
          && b.servingsUsed < (b.entry.serving.servingsPerPackage || 1);
      });
    if (reusable.length) {
      return { entry: reusable[Math.floor(Math.random() * reusable.length)].entry, reused: true };
    }
  }

  var candidates = [];
  for (var i = 0; i < pool.length; i++) {
    var e = pool[i];
    if (!e.serving || e.serving.role !== role) continue;
    if (day.bought[e.product.id]) continue;
    if (day.usedNames[e.product.name]) continue;
    if (!allowFresh && e.serving.policy === "fresh") continue;
    candidates.push(e);
  }
  if (!candidates.length) return null;

  // El presupuesto se mide contra lo CONSUMIDO hoy, no contra el ticket.
  // Un bote de queso de 2,05 € del que hoy te comes 1/6 te cuesta 0,34 €
  // hoy; las otras 5 raciones alimentan días siguientes (van a la
  // despensa). Cobrar el envase entero a un solo día hacía imposible
  // cumplir cualquier presupuesto realista -- medido: 8% de los planes
  // dentro de un tope de 14 €, con una compra media de 17,88 €.
  // Dos condiciones, y hacen falta las dos:
  //   - lo CONSUMIDO hoy cabe en el presupuesto diario;
  //   - el TICKET de hoy no se dispara (ver NO_COOK_TICKET_MULTIPLIER).
  var ticketCap = day.budget === Infinity ? Infinity : day.budget * NO_COOK_TICKET_MULTIPLIER;
  var affordable = candidates.filter(function (e) {
    if (typeof e.product.price !== "number") return true;
    var perServing = (typeof costForGrams === "function")
      ? costForGrams(e.product, e.serving.servingG) : e.product.price;
    return (day.consumed + perServing) <= day.budget
        && (day.spent + e.product.price) <= ticketCap;
  });
  var from = affordable.length ? affordable : candidates.slice().sort(function (a, b) {
    return (a.product.price || 0) - (b.product.price || 0);
  }).slice(0, 10);

  // Abrir un envase que da para VARIAS raciones permite reutilizarlo en
  // otras tomas del día; uno de una sola ración obliga a abrir otro
  // producto más tarde. A igualdad de todo lo demás se prefiere el grande,
  // que es lo que baja el número de productos distintos del día.
  var roomy = from.filter(function (e) { return (e.serving.servingsPerPackage || 1) >= 3; });
  if (roomy.length >= 3) from = roomy;

  // Para el papel de proteína se elige entre el quinto más proteico: es el
  // papel que sostiene el objetivo de proteína del día, y sin este sesgo el
  // sorteo plano lo deja muy corto (medido: 66 g frente a 160 de objetivo).
  //
  // Apretar más NO compensa: medido sobre 200 planes, top-1/3 da 121 g,
  // top-1/5 da 126 g y top-1/8 solo 128 g, a costa de repetir siempre los
  // mismos tres productos. El techo no es el sesgo, es el catálogo: comida
  // lista para comer rinde ~0,11 g de proteína por kcal. Un objetivo de
  // 160 g a 2.600 kcal NO es alcanzable sin cocinar, y la UI lo dice en
  // vez de fingir que lo cumple.
  if (role === "protein" && from.length > 3) {
    var ranked = from.slice().sort(function (a, b) {
      return (b.product.protein || 0) - (a.product.protein || 0);
    });
    from = ranked.slice(0, Math.max(3, Math.ceil(ranked.length / 5)));
  }

  return { entry: from[Math.floor(Math.random() * from.length)], reused: false };
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
    var picked = pickForRole(comp.role, pool, day, isMain);
    if (!picked) {
      if (comp.required) return null;   // plantilla imposible: se descarta entera
      continue;
    }
    // Un extra opcional no justifica abrir el producto número ocho del día
    // (ver NO_COOK_SOFT_PRODUCT_CAP). Si no se puede reutilizar algo ya
    // comprado, se deja fuera y la comida sigue completa igualmente.
    if (!comp.required && !picked.reused && day.order.length >= NO_COOK_SOFT_PRODUCT_CAP) continue;
    picks.push({ entry: picked.entry, comp: comp, servings: 1, fixed: false });
  }

  if (!picks.length) return null;

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

  var items = [];
  var total = emptyMacros();
  for (var c = 0; c < picks.length; c++) {
    var p2 = picks[c];
    var buys = registerPurchase(day, p2.entry);
    var bought = day.bought[p2.entry.product.id];
    var perPack = p2.entry.serving.servingsPerPackage || 1;
    var packsBefore = Math.max(1, Math.ceil(bought.servingsUsed / perPack));
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
function buildSlot(slotKey, targetKcal, pool, day, opts) {
  var slotDef = NO_COOK_SLOT_DEFS.filter(function (d) { return d.key === slotKey; })[0];
  var templates = (typeof templatesForSlot === "function") ? templatesForSlot(slotKey) : [];
  if (opts && opts.forceTemplateKey) {
    var forced = templates.filter(function (t) { return t.key === opts.forceTemplateKey; });
    if (forced.length) templates = forced;
  }

  var remaining = templates.slice();
  while (remaining.length) {
    var tpl = pickTemplate(remaining);
    remaining = remaining.filter(function (t) { return t !== tpl; });
    var result = buildSlotFromTemplate(tpl, slotDef, targetKcal, pool, day, opts);
    if (result) return result;
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
    spent: 0,       // ticket: envases completos que hay que comprar hoy
    consumed: 0,    // valor de lo que realmente se come hoy (contra el presupuesto)
    budget: (typeof opts.budget === "number" && opts.budget > 0) ? opts.budget : Infinity,
    freshPending: [],
  };

  var targetProtein = (typeof opts.protein === "number" && opts.protein > 0) ? opts.protein : 0;
  var ratioFor = function (key) {
    return NO_COOK_SLOT_DEFS.filter(function (x) { return x.key === key; })[0].ratio;
  };
  var kcalFor = function (key) { return targetKcal * ratioFor(key); };
  var protFor = function (key) { return targetProtein * ratioFor(key); };

  var built = {};

  // Comida y cena van EMPAREJADAS y primero. La comida puede abrir un
  // plato preparado y repartirlo; si lo hace, la cena queda obligada a la
  // plantilla "principal" para terminárselo. La cena, al ser la última
  // toma principal del día, nunca reparte: lo que abre, se lo acaba.
  built.lunch = buildSlot("lunch", kcalFor("lunch"), pool, day, {
    allowSplitFresh: true, targetProtein: protFor("lunch"),
  });
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
  var restKeys = ["breakfast", "snack", "snack2"];
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
  var slots = NO_COOK_SLOT_DEFS.map(function (def) {
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
  };
}
