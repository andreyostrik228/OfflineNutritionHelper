/**
 * js/core/pantry.js
 * ─────────────────────────────────────────────────────────────────────────
 * Despensa: recuerda qué cantidad de cada ingrediente ya tienes en casa
 * (sobras de compras/planes anteriores) y descuenta esa cantidad de lo que
 * un plan pide comprar. Un solo total corriente por ingrediente — NO por
 * lote/fecha de compra, y sin modelar caducidad: es la cantidad realista
 * que alguien maneja mentalmente de su propia nevera/despensa, no un
 * sistema de inventario de almacén.
 *
 * Deliberadamente agnóstico de dishes.js/DOM, igual que pricing.js es
 * agnóstico de dishes.js/plan-generator.js (ver cabecera de ese archivo):
 * este módulo no sabe qué es un "plan" ni una "toma", solo sabe de
 * ingredientes (por su clave normalizada) y gramos.
 *
 * Almacenamiento: localStorage, con claves versionadas por si el formato
 * cambia en el futuro. Limitación real y asumida: los datos viven en ESTE
 * navegador únicamente — no hay sincronización entre dispositivos, y
 * borrar datos del sitio borra la despensa. Se usa el mismo patrón que ya
 * usa el resto del proyecto para dependencias opcionales del entorno
 * (`typeof X !== "undefined"`, ver pricing.js) en vez de un adaptador
 * inyectado nuevo: si `localStorage` no existe (ej. sandbox de tests),
 * cae a una variable en memoria del propio módulo — nunca lanza.
 *
 * Ciclo de vida en 3 etapas independientes (v2, 2026-08-06 — reemplaza una
 * v1 que combinaba "comprar" y "usar" en una sola transacción: se rompía
 * en un caso real — comprar por la mañana y no cocinar nada porque surgió
 * un plan alternativo por la noche dejaba la despensa con un "sobrante"
 * neto arbitrario en vez de la cantidad realmente comprada):
 *
 *   1. savePlanForToday()  — registrar el plan del día. Pura contabilidad,
 *      CERO mutación de stock.
 *   2. markPurchaseDone()  — la ÚNICA función que SUMA stock (lo
 *      realmente comprado). Se puede llamar más de una vez (varios viajes
 *      a comprar para el mismo plan).
 *   3. markMealCooked()    — la ÚNICA función que RESTA stock (lo
 *      realmente cocinado), UNA comida a la vez, con undo exacto vía el
 *      snapshot `consumed` guardado en el momento de cocinar.
 *
 * El stock refleja la realidad física de forma continua (sube al
 * comprar, baja al cocinar) — no se espera a "marcar como comido" para
 * cambiar nada, porque eso dejaría la despensa desactualizada durante la
 * ventana real entre comprar y cocinar.
 *
 * Depende de:
 *   js/core/pricing.js (normalizeIngredientKey, resolvePackageInfo,
 *                        resolvePurchaseCost)
 *   js/core/utils.js   (round0, round2)
 *
 * Expone (globales):
 *   getPantryState() / savePantryState(state)
 *   listPantryEntries()
 *   getStock(name, pantryState?) / setStock(name, grams) /
 *     adjustStock(name, deltaGrams) / clearStock(name)
 *   resolvePurchaseCostWithPantry(name, requiredGrams, storeId, pantryState?)
 *   savePlanForToday(meals, storeId) → { entry, historySaved }
 *   aggregatePlanMealItems(meals) → [{name, requiredGrams}]
 *   markPurchaseDone(entryId, excludedNames?, storeId?) → { saved, historySaved, run } | null
 *   markMealCooked(entryId, mealKey, cooked) → { saved, historySaved, entry, meal } | null
 *   getPantryHistory() / appendPantryHistory(entry)
 * ─────────────────────────────────────────────────────────────────────────
 */

var PANTRY_STORAGE_KEY = "nutritionPlanner.pantry.v1";
var PANTRY_HISTORY_KEY = "nutritionPlanner.pantryHistory.v1";
var PANTRY_HISTORY_MAX_ENTRIES = 30;

// Usado únicamente cuando localStorage no existe en absoluto (tests, algún
// entorno sin navegador) — persiste solo mientras dure el proceso/sandbox.
var _pantryMemoryState = null;
var _pantryMemoryHistory = null;

// ── Almacenamiento ───────────────────────────────────────────────────────

/**
 * Descarta, entrada por entrada, cualquier valor que no tenga la forma
 * mínima válida ({grams:number>0, ...}) — nunca deja pasar un `null` o un
 * valor con forma inesperada que luego reviente listPantryEntries()
 * (entry.displayName sobre null lanzaría) o cualquier otro consumidor.
 * Rellena displayName/updatedAt con valores seguros si faltan, en vez de
 * descartar la entrada entera solo por eso.
 * @param {*} raw - lo que venga de JSON.parse(), de cualquier forma
 * @returns {object}
 */
function sanitizePantryState(raw) {
  if (!raw || typeof raw !== "object") return {};
  var clean = {};
  Object.keys(raw).forEach(function (key) {
    var entry = raw[key];
    if (entry && typeof entry === "object" && typeof entry.grams === "number" && entry.grams > 0) {
      clean[key] = {
        grams: entry.grams,
        displayName: typeof entry.displayName === "string" ? entry.displayName : key,
        updatedAt: typeof entry.updatedAt === "string" ? entry.updatedAt : null
      };
    }
    // Cualquier otra forma (null, string, número suelto, grams<=0/no-numérico)
    // se descarta en silencio — más seguro que intentar adivinar.
  });
  return clean;
}

/**
 * Lee el estado de la despensa. Nunca lanza: datos ausentes, corruptos, o
 * localStorage inexistente/deshabilitado devuelven siempre un objeto vacío.
 * Cada entrada individual pasa por sanitizePantryState() -- una fila
 * corrupta nunca puede tumbar la lectura de todas las demás.
 * @returns {object} - { [claveNormalizada]: { grams, displayName, updatedAt } }
 */
function getPantryState() {
  if (typeof localStorage === "undefined") {
    return _pantryMemoryState || (_pantryMemoryState = {});
  }
  try {
    var raw = localStorage.getItem(PANTRY_STORAGE_KEY);
    if (!raw) return {};
    var parsed = JSON.parse(raw);
    return sanitizePantryState(parsed);
  } catch (err) {
    return {};
  }
}

/**
 * Guarda el estado de la despensa. Nunca lanza (cuota superada, modo
 * privado que bloquea localStorage...) — devuelve false para que quien
 * llama pueda avisar, en vez de romper el flujo.
 * @param {object} state
 * @returns {boolean}
 */
function savePantryState(state) {
  if (typeof localStorage === "undefined") {
    _pantryMemoryState = state;
    return true;
  }
  try {
    localStorage.setItem(PANTRY_STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch (err) {
    return false;
  }
}

/**
 * Lista la despensa ordenada alfabéticamente (es-ES), lista para pintar.
 * @returns {{key:string, name:string, grams:number, updatedAt:string}[]}
 */
function listPantryEntries() {
  var state = getPantryState();
  return Object.keys(state)
    .map(function (key) {
      var entry = state[key];
      return {
        key: key,
        name: entry.displayName || key,
        grams: entry.grams || 0,
        updatedAt: entry.updatedAt || null
      };
    })
    .sort(function (a, b) { return a.name.localeCompare(b.name, "es"); });
}

// ── Lectura/escritura por ingrediente ────────────────────────────────────

/**
 * Gramos disponibles en despensa de un ingrediente. 0 si no hay entrada.
 * @param {string} name
 * @param {object} [pantryState] - evita releer localStorage en bucles
 * @returns {number}
 */
function getStock(name, pantryState) {
  var state = pantryState || getPantryState();
  var key = normalizeIngredientKey(name);
  var entry = state[key];
  return (entry && typeof entry.grams === "number" && entry.grams > 0) ? entry.grams : 0;
}

/**
 * Fija la cantidad en despensa de un ingrediente. 0 o negativo BORRA la
 * entrada (nunca deja una fila fantasma en {grams:0}).
 * @param {string} name
 * @param {number} grams
 * @returns {object} - el nuevo estado guardado
 */
function setStock(name, grams) {
  var state = getPantryState();
  var key = normalizeIngredientKey(name);
  var g = round0(grams);

  if (g <= 0) {
    delete state[key];
  } else {
    state[key] = { grams: g, displayName: name, updatedAt: new Date().toISOString() };
  }

  savePantryState(state);
  return state;
}

/**
 * Suma (o resta, con delta negativo) una cantidad al stock existente,
 * nunca por debajo de 0.
 * @param {string} name
 * @param {number} deltaGrams
 * @returns {object}
 */
function adjustStock(name, deltaGrams) {
  var current = getStock(name);
  return setStock(name, Math.max(0, current + deltaGrams));
}

/**
 * Vacía el stock de un ingrediente. No-op seguro si ya no tenía entrada.
 * @param {string} name
 * @returns {object}
 */
function clearStock(name) {
  return setStock(name, 0);
}

// ── Compra consciente de la despensa ─────────────────────────────────────

/**
 * Igual que resolvePurchaseCost() (pricing.js), pero descontando primero
 * lo que ya hay en despensa. Solo la cantidad que falta después de ese
 * descuento se redondea a paquetes/compra real.
 *
 * IMPORTANTE — no delegar nunca en resolvePurchaseCost(name, 0, storeId):
 * esa función hace Math.max(1, ...) porque hoy nunca se la llama con 0
 * gramos; con 0 devolvería "comprar 1 paquete fantasma" para un
 * ingrediente que la despensa ya cubre por completo. El caso
 * stillNeeded<=0 se resuelve aquí mismo, sin delegar.
 *
 * usageCost SIEMPRE refleja los gramos TOTALES requeridos por el plan
 * (venga o no de despensa) — la despensa cambia lo que hay que PAGAR hoy,
 * nunca lo que el plan consume (ver distinción usageCost/purchaseCost en
 * la cabecera de pricing.js).
 *
 * @param {string} name
 * @param {number} requiredGrams
 * @param {string} [storeId]
 * @param {object} [pantryState] - evita releer localStorage por ingrediente
 * @returns {{
 *   requiredGrams:number, usageCost:number, hasFixedPackage:boolean,
 *   packageSizeG:number|null, packageLabel:string|null,
 *   packagesToBuy:number|null, purchaseCost:number,
 *   coveredFromPantry:number, stillNeeded:number
 * }}
 */
function resolvePurchaseCostWithPantry(name, requiredGrams, storeId, pantryState) {
  var state = pantryState || getPantryState();
  var covered = Math.min(requiredGrams, getStock(name, state));
  var stillNeeded = Math.max(0, requiredGrams - covered);
  var pkg = resolvePackageInfo(name, storeId);

  var base;
  if (stillNeeded <= 0) {
    base = {
      requiredGrams: requiredGrams,
      usageCost: round2(pkg.pricePer100g * requiredGrams / 100),
      hasFixedPackage: pkg.packageSizeG !== null,
      packageSizeG: pkg.packageSizeG,
      packageLabel: pkg.packageLabel,
      packagesToBuy: 0,
      purchaseCost: 0
    };
  } else {
    base = resolvePurchaseCost(name, stillNeeded, storeId);
    base.requiredGrams = requiredGrams;
    base.usageCost = round2(pkg.pricePer100g * requiredGrams / 100);
  }

  base.coveredFromPantry = round0(covered);
  base.stillNeeded = round0(stillNeeded);
  return base;
}

// ── Etapa 1: registrar el plan del día (sin tocar stock) ─────────────────

/**
 * Genera un id de historial razonablemente único sin depender de ninguna
 * librería — timestamp + contador aleatorio, suficiente para una lista
 * personal de como mucho 30 entradas.
 * @returns {string}
 */
function generateHistoryId() {
  return "h" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

/**
 * Etapa 1 del ciclo de vida: "Usar este plan hoy". Registra el plan en el
 * historial, desglosado POR COMIDA (no solo el agregado del día), para
 * que las Etapas 2 (comprar) y 3 (cocinar, por comida) puedan actuar
 * sobre él más tarde de forma independiente. NO llama a getStock/
 * setStock/adjustStock — no toca la despensa en absoluto, es pura
 * contabilidad de "esto es lo que voy a hacer hoy".
 *
 * @param {object[]} meals - result.meals de generateDietPlan(), tal cual
 * @param {string} [storeId]
 * @returns {{ entry:object, historySaved:boolean }}
 */
function savePlanForToday(meals, storeId) {
  var nowISO = new Date().toISOString();

  var entry = {
    id: generateHistoryId(),
    createdAt: nowISO,
    store: storeId || null,
    meals: (meals || []).map(function (meal) {
      return {
        key: meal.key,
        label: meal.label,
        // time: "HH:MM" si el plan se generó con horario (js/core/
        // meal-schedule.js, después de esta sesión) — null en planes sin
        // horario calculado. Puro dato de contabilidad aquí: nadie en
        // pantry.js lee ni calcula con este campo, solo se conserva para
        // que el historial pueda mostrarlo (ver render-pantry.js).
        time: typeof meal.time === "string" ? meal.time : null,
        items: (meal.items || []).map(function (item) {
          return { name: item.name, requiredGrams: item.grams };
        }),
        cooked: false,
        cookedAt: null,
        consumed: null
      };
    }),
    purchase: { done: false, runs: [] }
  };

  var historySaved = appendPantryHistory(entry);
  return { entry: entry, historySaved: historySaved };
}

// ── Agregación auxiliar (reutilizada por Etapa 2 y por su UI) ────────────

/**
 * Suma requiredGrams de un mismo ingrediente a través de todas las
 * comidas de un plan GUARDADO (entry.meals) — misma idea que
 * aggregateIngredientUsage() en render-shopping-list.js, pero operando
 * sobre un historyEntry ya persistido, no sobre un plan recién generado.
 * @param {{items:{name:string, requiredGrams:number}[]}[]} meals
 * @returns {{name:string, requiredGrams:number}[]}
 */
function aggregatePlanMealItems(meals) {
  var byKey = {};
  var order = [];

  (meals || []).forEach(function (meal) {
    (meal.items || []).forEach(function (item) {
      var key = normalizeIngredientKey(item.name);
      if (!byKey[key]) {
        byKey[key] = { name: item.name, requiredGrams: 0 };
        order.push(key);
      }
      byKey[key].requiredGrams += item.requiredGrams;
    });
  });

  return order.map(function (key) { return byKey[key]; });
}

// ── Etapa 2: marcar la compra como hecha (única función que SUMA stock) ──

/**
 * Etapa 2 del ciclo de vida: "Marcar compra como hecha". Compra todos los
 * ingredientes agregados de un plan guardado, EXCEPTO los que el usuario
 * haya desmarcado en la lista de verificación — nunca resta lo consumido
 * (eso es responsabilidad exclusiva de markMealCooked). Se puede llamar
 * más de una vez para el mismo plan (varios viajes a comprar): relee el
 * stock actual cada vez, así que una segunda llamada solo compra lo que
 * de verdad sigue faltando.
 *
 * @param {string} entryId
 * @param {string[]} [excludedNames] - nombres desmarcados (se normalizan
 *   internamente); vacío/omitido = comprar todo lo agregado
 * @param {string} [storeId] - si se omite, usa entry.store
 * @returns {{ saved:boolean, historySaved:boolean, run:object }|null} - null si entryId no existe
 */
function markPurchaseDone(entryId, excludedNames, storeId) {
  var history = getPantryHistory();
  var entry = history.find(function (e) { return e.id === entryId; });
  if (!entry) return null;

  var store = storeId || entry.store;
  var excludedKeys = (excludedNames || []).map(normalizeIngredientKey);
  var aggregated = aggregatePlanMealItems(entry.meals)
    .filter(function (item) { return excludedKeys.indexOf(normalizeIngredientKey(item.name)) === -1; });

  var pantryState = getPantryState();
  var nowISO = new Date().toISOString();
  var lines = [];
  var totals = { purchaseCost: 0, usageCost: 0, itemCount: 0 };

  aggregated.forEach(function (item) {
    var p = resolvePurchaseCostWithPantry(item.name, item.requiredGrams, store, pantryState);
    var key = normalizeIngredientKey(item.name);
    var oldStock = getStock(item.name, pantryState);

    var purchasedGrams = p.hasFixedPackage
      ? p.packagesToBuy * p.packageSizeG
      : p.stillNeeded; // compra al peso exacto, sin excedente que redondear

    // SOLO suma -- nunca resta lo requerido por el plan. Esa es la
    // diferencia con la v1 (que hacía oldStock + purchasedGrams -
    // requiredGrams): comprar no consume nada por sí mismo.
    var newStock = oldStock + purchasedGrams;
    pantryState[key] = { grams: round0(newStock), displayName: item.name, updatedAt: nowISO };

    lines.push({
      name: item.name,
      requiredGrams: item.requiredGrams,
      coveredFromPantry: p.coveredFromPantry,
      purchasedGrams: round0(purchasedGrams),
      purchaseCost: p.purchaseCost,
      hasFixedPackage: p.hasFixedPackage,
      packagesToBuy: p.packagesToBuy,
      packageLabel: p.packageLabel
    });

    totals.purchaseCost += p.purchaseCost;
    totals.usageCost += p.usageCost;
    totals.itemCount++;
  });

  var saved = savePantryState(pantryState);

  var run = {
    at: nowISO,
    lines: lines,
    totals: {
      purchaseCost: round2(totals.purchaseCost),
      usageCost: round2(totals.usageCost),
      itemCount: totals.itemCount
    }
  };
  entry.purchase.runs.push(run);
  entry.purchase.done = true;
  var historySaved = savePantryHistory(history);

  return { saved: saved, historySaved: historySaved, run: run };
}

// ── Etapa 3: marcar una comida como cocinada (única función que RESTA) ───

/**
 * Etapa 3 del ciclo de vida: "Marcar como cocinado", UNA comida concreta
 * a la vez (no el plan entero) — es la única función que resta stock.
 * Funciona igual aunque markPurchaseDone() nunca se haya llamado para
 * algún ingrediente (ej. ya lo tenía en casa): simplemente resta lo que
 * haya disponible, con tope en 0.
 *
 * cooked=true  → resta min(requiredGrams, stockActual) por ingrediente,
 *                y guarda esas cantidades EXACTAS en meal.consumed.
 * cooked=false → revierte exactamente meal.consumed (nunca recalcula
 *                contra el stock actual, que pudo cambiar mientras
 *                tanto por otras acciones) y limpia el snapshot.
 * Idempotente: si cooked === meal.cooked ya, no hace nada.
 *
 * @param {string} entryId
 * @param {string} mealKey - único DENTRO de esa entry, no globalmente
 *   (dos entries distintas pueden tener cada una una comida "breakfast")
 * @param {boolean} cooked
 * @returns {{ saved:boolean, historySaved:boolean, entry:object, meal:object }|null}
 */
function markMealCooked(entryId, mealKey, cooked) {
  var history = getPantryHistory();
  var entry = history.find(function (e) { return e.id === entryId; });
  if (!entry) return null;

  var meal = entry.meals.find(function (m) { return m.key === mealKey; });
  if (!meal) return null;

  if (!!cooked === !!meal.cooked) {
    // Ya está en el estado pedido -- no-op idempotente, no se toca stock.
    return { saved: true, historySaved: true, entry: entry, meal: meal };
  }

  var pantryState = getPantryState();
  var nowISO = new Date().toISOString();

  if (cooked) {
    meal.consumed = (meal.items || []).map(function (item) {
      var current = getStock(item.name, pantryState);
      var used = Math.min(item.requiredGrams, current);
      var key = normalizeIngredientKey(item.name);
      pantryState[key] = { grams: round0(Math.max(0, current - used)), displayName: item.name, updatedAt: nowISO };
      return { name: item.name, grams: round0(used) };
    });
    meal.cooked = true;
    meal.cookedAt = nowISO;
  } else {
    (meal.consumed || []).forEach(function (c) {
      var current = getStock(c.name, pantryState);
      var key = normalizeIngredientKey(c.name);
      pantryState[key] = { grams: round0(current + c.grams), displayName: c.name, updatedAt: nowISO };
    });
    meal.cooked = false;
    meal.cookedAt = null;
    meal.consumed = null;
  }

  var saved = savePantryState(pantryState);
  var historySaved = savePantryHistory(history);

  return { saved: saved, historySaved: historySaved, entry: entry, meal: meal };
}

// ── Historial de planes confirmados ───────────────────────────────────────

/**
 * Comprueba que una entrada del historial tiene la forma v2 esperada
 * COMPLETA (entry.meals[].key/items[] incluidos, no solo el nivel
 * superior) — descarta silenciosamente cualquier entrada de un formato
 * anterior o corrupta en vez de dejar que algo como entry.meals[i].key
 * reviente más adelante (markMealCooked, renderHistoryRow...) por un
 * elemento null/con forma inesperada dentro de un array que "parecía"
 * válido. No hay migración: los datos de una v1 anterior (comprar+usar
 * combinados) no son reconstruibles a la forma nueva de todas formas.
 * @param {object} entry
 * @returns {boolean}
 */
function isValidHistoryEntry(entry) {
  if (!entry || typeof entry !== "object") return false;
  if (!Array.isArray(entry.meals)) return false;
  if (!entry.purchase || typeof entry.purchase !== "object" || !Array.isArray(entry.purchase.runs)) return false;

  return entry.meals.every(function (meal) {
    return meal && typeof meal === "object"
      && typeof meal.key === "string"
      && Array.isArray(meal.items);
  });
}

/**
 * Lee el historial de planes confirmados, más reciente primero. Nunca
 * lanza — datos ausentes/corruptos/de un formato anterior incompatible se
 * descartan y devuelven como array vacío (o sin esas entradas concretas).
 * @returns {object[]}
 */
function getPantryHistory() {
  if (typeof localStorage === "undefined") {
    return _pantryMemoryHistory || (_pantryMemoryHistory = []);
  }
  try {
    var raw = localStorage.getItem(PANTRY_HISTORY_KEY);
    if (!raw) return [];
    var parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isValidHistoryEntry);
  } catch (err) {
    return [];
  }
}

function savePantryHistory(list) {
  if (typeof localStorage === "undefined") {
    _pantryMemoryHistory = list;
    return true;
  }
  try {
    localStorage.setItem(PANTRY_HISTORY_KEY, JSON.stringify(list));
    return true;
  } catch (err) {
    return false;
  }
}

/**
 * Añade una entrada al historial (la más reciente primero) y recorta al
 * máximo — descarta siempre las más ANTIGUAS al superar el límite, nunca
 * las recién añadidas.
 * @param {object} entry
 * @returns {boolean}
 */
function appendPantryHistory(entry) {
  var list = getPantryHistory();
  list.unshift(entry);
  if (list.length > PANTRY_HISTORY_MAX_ENTRIES) {
    list = list.slice(0, PANTRY_HISTORY_MAX_ENTRIES);
  }
  return savePantryHistory(list);
}
