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
 *   1. savePlanForToday()  — registrar/CONFIRMAR el plan del día. Pura
 *      contabilidad, CERO mutación de stock.
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
 * ── Confirmar es un UPSERT sobre el borrador del día (2026-08-19) ───────
 * Bug real reportado por el usuario: regenerar el plan y volver a pulsar
 * "Confirmar" (antes "Usar este plan hoy") varias veces creaba una
 * entrada de historial NUEVA cada vez — savePlanForToday() en sí seguía
 * sin tocar stock, pero cada una de esas entradas duplicadas era
 * "comprable" por separado, así que si el usuario marcaba la compra en
 * más de una (razonable: todas se veían como "mi plan de hoy", nada en
 * la UI decía que eran copias) el stock se inflaba varias veces por la
 * MISMA compra real. Fix: savePlanForToday() ahora busca si YA existe una
 * entrada de HOY que sea todavía un BORRADOR puro — ni comprada
 * (`purchase.done`) ni con ninguna comida cocinada (`hasRealPantryAction()`,
 * más abajo) — y si la hay, ACTUALIZA esa misma entrada en vez de crear
 * una nueva. En cuanto una entrada tiene algo real encima (se compró o se
 * cocinó algo), deja de ser un borrador: confirmar un plan distinto ese
 * mismo día entonces SÍ crea una entrada nueva, porque la anterior ya
 * representa un hecho real (dinero gastado o comida consumida) que nunca
 * debe sobrescribirse en silencio. Efecto práctico: regenerar/editar el
 * plan y volver a confirmar tantas veces como haga falta ANTES de comprar
 * nada es seguro por diseño — nunca puede, por sí mismo, producir más de
 * una entrada "comprable" para el mismo día.
 *
 * ── Gate en "Generar plan" + reemplazo explícito del plan activo (2026-08-20) ─
 * Bug real reportado por el usuario: el UPSERT de arriba protege un
 * borrador SIN acción real, pero en cuanto una entrada de hoy tiene algo
 * real encima (comprado y/o alguna comida cocinada), savePlanForToday()
 * crea, A PROPÓSITO, una entrada nueva en vez de tocarla -- correcto para
 * no pisar dinero gastado o comida cocinada, pero "Generar plan" nunca
 * avisaba de que eso iba a pasar: se podía pulsar sin más y, si se volvía
 * a confirmar, se acababa con dos (o más) tarjetas "Tu plan" activas el
 * mismo día, cada una con sus propios chips de cocinar ya desbloqueados --
 * confuso y, en la práctica, casi imposible de limpiar a mano. Reproducido
 * en vivo antes de tocar nada: confirmar+comprar un plan, generar uno
 * nuevo sin regenerar el anterior, confirmar el nuevo -> 2 tarjetas
 * "Tu plan" distintas para el mismo día.
 *
 * Fix: js/app.js consulta findTodayEntry() al pulsar "Generar plan" -- si
 * hay una entrada de hoy con hasRealPantryAction()=true y todavía NO
 * isEntryFullyCooked() (algo real ya pasó, y algo sigue pendiente), no
 * genera nada: abre un diálogo (showPlanReplaceDialog, render-pantry.js)
 * que redirige a esa tarjeta y pregunta explícitamente si se quiere
 * cambiar el plan completo. Solo si el usuario lo confirma se genera un
 * plan nuevo Y, al confirmarlo, se llama a replacePendingMealsForToday()
 * en vez del UPSERT normal -- reemplaza las comidas NO cocinadas de la
 * entrada existente (nunca crea una tarjeta nueva), preservando intactas
 * las que ya se cocinaron. Un borrador puro (sin acción real) o un plan ya
 * completado del todo NO interrumpen -- el primero porque el UPSERT normal
 * ya lo resuelve sin riesgo; el segundo porque no hay nada pendiente que
 * un plan nuevo pueda pisar (es una intención legítima de empezar algo
 * distinto, ej. un snack tardío tras terminar el día). Esto REFINA, no
 * revierte, la decisión de 2026-08-14c de permitir varios planes el mismo
 * día a propósito -- sigue siendo posible, pero ahora requiere una
 * elección explícita en vez de ser un efecto colateral de pulsar "Generar
 * plan" sin pensarlo.
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
 *   formatLocalDateKey(date) → "YYYY-MM-DD" (hora LOCAL, nunca UTC)
 *   getEntryPlanDate(entry) → "YYYY-MM-DD"
 *   hasRealPantryAction(entry) → boolean (comprado o algo cocinado)
 *   isEntryFullyCooked(entry) → boolean (TODAS las comidas cocinadas)
 *   findTodayEntry() → entry|null (la más reciente cuyo día es hoy, cualquier estado)
 *   savePlanForToday(meals, storeId) → { entry, historySaved, replaced }
 *   replacePendingMealsForToday(entryId, meals, storeId) →
 *     { entry, historySaved, replacedMealKeys, keptMealKeys } | null
 *   aggregatePlanMealItems(meals) → [{name, requiredGrams}]
 *   markPurchaseDone(entryId, excludedNames?, storeId?) → { saved, historySaved, run } | null
 *   markMealCooked(entryId, mealKey, cooked) → { saved, historySaved, entry, meal } | null
 *   getPantryHistory() / appendPantryHistory(entry)
 *
 * ── "Sin cocinar" (2026-08-20f, known issue #9) ──────────────────────────
 * Mismo ciclo de 3 etapas, productos reales discretos (id/ean/quantity) en
 * vez de ingredientes por gramos -- ver el bloque "Despensa 'sin cocinar'"
 * más abajo para el razonamiento completo (por qué un stock paralelo, por
 * qué comparte pantryHistory con las entradas de plato vía entry.type):
 *   getNoCookStock() / saveNoCookStock(state)
 *   getNoCookProductStock(productId, state?) / setNoCookProductStock(productId, quantity, displayName?) /
 *     adjustNoCookProductStock(productId, deltaQuantity, displayName?)
 *   hasRealNoCookAction(entry) → boolean
 *   isNoCookEntryFullyConsumed(entry) → boolean
 *   saveNoCookPlanForToday(slots) → { entry, historySaved, replaced }
 *   markNoCookPurchaseDone(entryId) → { saved, historySaved, run } | null
 *   markNoCookSlotConsumed(entryId, slotKey, consumed) → { saved, historySaved, entry, slot } | null
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
 * "YYYY-MM-DD" en la ZONA HORARIA LOCAL del dispositivo — NUNCA
 * date.toISOString().slice(0,10), que es UTC y desplazaría la fecha un
 * día para usuarios en zonas horarias negativas cerca de medianoche (ej.
 * 23:30 hora local del 14 ago ya es 15 ago en UTC). Es la fecha "de
 * calendario" que el usuario reconoce, no un instante.
 * @param {Date} date
 * @returns {string}
 */
function formatLocalDateKey(date) {
  var y = date.getFullYear();
  var m = date.getMonth() + 1;
  var d = date.getDate();
  return y + "-" + (m < 10 ? "0" : "") + m + "-" + (d < 10 ? "0" : "") + d;
}

/**
 * Día de calendario (local) al que pertenece un plan guardado —
 * `entry.planDate` si existe (entradas creadas desde que este campo se
 * añadió), o derivado de `entry.createdAt` si no (entradas de sesiones
 * anteriores a este cambio) — mismo patrón defensivo ya usado para
 * `meal.time` en entradas antiguas sin horario: un campo opcional nuevo
 * nunca rompe una entrada vieja que no lo tiene.
 * @param {object} entry
 * @returns {string} - "YYYY-MM-DD", o "" si no hay forma de derivarlo
 *   (createdAt ausente/corrupto en una entrada ya inválida de por sí)
 */
function getEntryPlanDate(entry) {
  if (entry && typeof entry.planDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(entry.planDate)) {
    return entry.planDate;
  }
  var createdAt = entry && entry.createdAt;
  var parsed = createdAt ? new Date(createdAt) : null;
  if (!parsed || isNaN(parsed.getTime())) return "";
  return formatLocalDateKey(parsed);
}

/**
 * True si una entrada de historial ya tiene algo REAL encima — una
 * compra confirmada (`purchase.done`) o al menos una comida cocinada.
 * Una entrada sin ninguna de las dos cosas es un BORRADOR puro: registrar
 * el plan del día no cambió nada del mundo real todavía (ver cabecera del
 * archivo, "Confirmar es un UPSERT sobre el borrador del día") — mientras
 * lo sea, confirmar un plan nuevo para hoy puede sustituirla sin perder
 * nada real. En cuanto hay una compra o una comida cocinada, la entrada
 * representa un hecho real (dinero gastado o comida consumida) y
 * savePlanForToday() ya no debe tocarla.
 * @param {object} entry
 * @returns {boolean}
 */
function hasRealPantryAction(entry) {
  if (!entry) return false;
  if (entry.purchase && entry.purchase.done) return true;
  return (entry.meals || []).some(function (m) { return !!m.cooked; });
}

/**
 * Un plan se considera "terminado" en cuanto TODAS sus comidas están
 * cocinadas -- momento en el que render-pantry.js lo muda al historial
 * colapsado en vez de "Tu plan", y en el que el gate de "Generar plan"
 * (js/app.js, ver "Gate en Generar plan..." en la cabecera de este
 * archivo) deja de interrumpir: no hay nada pendiente que un plan nuevo
 * pueda pisar. La compra en sí no forma parte de esta condición a
 * propósito: alguien puede cocinar con lo que ya tenía sin haber pulsado
 * nunca "Ya compré todo esto", y eso sigue siendo un plan terminado
 * igualmente. (Antes vivía en render-pantry.js -- movida aquí porque es un
 * predicado puro sobre la forma de una entry, sin DOM, igual que
 * hasRealPantryAction; ahora también la necesita js/app.js.)
 * @param {object} entry
 * @returns {boolean}
 */
function isEntryFullyCooked(entry) {
  var meals = (entry && entry.meals) || [];
  return meals.length > 0 && meals.every(function (m) { return m.cooked; });
}

/**
 * Entrada de historial MÁS RECIENTE cuyo día de calendario
 * (getEntryPlanDate) es HOY, sea borrador o tenga ya algo real encima --
 * a diferencia del UPSERT interno de savePlanForToday() (que busca
 * específicamente un borrador SIN acción real), esta función no filtra
 * por estado: js/app.js la usa para decidir si "Generar plan" debe
 * interrumpir con el diálogo de "ya tienes un plan activo hoy" antes de
 * generar nada (ver cabecera del archivo). getPantryHistory() ya devuelve
 * más reciente primero, así que en el caso raro de que existan varias
 * entradas de hoy (datos de antes de este cambio, o varias creadas a
 * propósito) esto siempre elige la más reciente.
 * @returns {object|null}
 */
function findTodayEntry() {
  var todayKey = formatLocalDateKey(new Date());
  var history = getPantryHistory();
  // e.type !== "nocook" (2026-08-20g, bug real encontrado durante el
  // trabajo de per-meal editing): esta función alimenta el gate de
  // "Generar plan" (js/app.js), que solo tiene sentido para planes de
  // PLATO (el diálogo que abre habla de "comidas"/"platos", nunca de
  // productos) -- sin este filtro, si la entrada más reciente de hoy
  // fuera "sin cocinar", el gate la trataba como un plan de plato activo
  // (isEntryFullyCooked() lee entry.meals, undefined en una "nocook" →
  // siempre "no completado"), pudiendo interrumpir "Generar plan" por una
  // entrada que no tiene nada que ver.
  return history.find(function (e) { return getEntryPlanDate(e) === todayKey && e.type !== "nocook"; }) || null;
}

/**
 * Etapa 1 del ciclo de vida: "Confirmar plan de hoy" (antes "Usar este
 * plan hoy"). Registra el plan en el historial, desglosado POR COMIDA (no
 * solo el agregado del día), para que las Etapas 2 (comprar) y 3
 * (cocinar, por comida) puedan actuar sobre él más tarde de forma
 * independiente. NO llama a getStock/setStock/adjustStock — no toca la
 * despensa en absoluto, es pura contabilidad de "esto es lo que voy a
 * hacer hoy".
 *
 * `planDate` (día de calendario LOCAL) es un campo separado de
 * `createdAt` (marca de tiempo de auditoría) — igual que `migrated_at` no
 * es la guarda real de idempotencia en migration.js, `createdAt` no es el
 * campo que decide "a qué día pertenece este plan".
 *
 * UPSERT (2026-08-19, ver cabecera del archivo): si ya existe una entrada
 * de HOY que sigue siendo un borrador puro (`!hasRealPantryAction()`),
 * esta función ACTUALIZA esa misma entrada (mismo `id`, `meals`/
 * `createdAt`/`store` sustituidos) en vez de crear una nueva — así,
 * regenerar/editar el plan y volver a confirmar cuantas veces haga falta
 * ANTES de comprar/cocinar nunca acumula entradas "comprables" por
 * separado. Solo crea una entrada nueva cuando no hay ningún borrador de
 * hoy todavía, o cuando el único que hay ya tiene algo real encima (esa
 * SÍ es una decisión del usuario de empezar un plan distinto sin haber
 * terminado el anterior, no un reintento del mismo).
 *
 * @param {object[]} meals - result.meals de generateDietPlan(), tal cual
 * @param {string} [storeId]
 * @param {object} [dayOptions] - { budget, cookTime, taste } del `data`
 *   original de generateDietPlan() (2026-08-20g, per-meal editing) --
 *   OPCIONAL a propósito, para no romper ningún llamador existente
 *   (tests incluidos): sin esto, la entrada se guarda exactamente igual
 *   que siempre, solo que "cambiar este plato" (regenerateSingleMeal(),
 *   plan-generator.js) no estará disponible para ella -- ver
 *   render-pantry.js, que oculta esa acción cuando faltan estos campos.
 * @returns {{ entry:object, historySaved:boolean, replaced:boolean }}
 */
function savePlanForToday(meals, storeId, dayOptions) {
  var now = new Date();
  var nowISO = now.toISOString();
  var todayKey = formatLocalDateKey(now);

  var newMeals = (meals || []).map(function (meal) {
    return {
      key: meal.key,
      label: meal.label,
      // time: "HH:MM" si el plan se generó con horario (js/core/
      // meal-schedule.js) — null en planes sin horario calculado. Puro
      // dato de contabilidad aquí: nadie en pantry.js lee ni calcula con
      // este campo, solo se conserva para que el historial pueda
      // mostrarlo (ver render-pantry.js).
      time: typeof meal.time === "string" ? meal.time : null,
      items: (meal.items || []).map(function (item) {
        return { name: item.name, requiredGrams: item.grams };
      }),
      // dishName/mainProt/taste/total (2026-08-20g, per-meal editing):
      // solo presentes si `meal` viene de buildMealFromDish() real (ya lo
      // hace desde known issue #5/esta sesión) -- fallback a null/undefined
      // para cualquier `meal` sintético que un test le pase sin esos
      // campos, nunca revienta.
      dishName: typeof meal.dishName === "string" ? meal.dishName : null,
      mainProt: typeof meal.mainProt === "string" ? meal.mainProt : null,
      taste:    typeof meal.taste === "string" ? meal.taste : null,
      total:    meal.total ? { kcal: meal.total.kcal, protein: meal.total.protein, carbs: meal.total.carbs, fat: meal.total.fat } : null,
      cooked: false,
      cookedAt: null,
      consumed: null
    };
  });

  var budget   = dayOptions && typeof dayOptions.budget === "number" ? dayOptions.budget : null;
  var cookTime = dayOptions && typeof dayOptions.cookTime === "number" ? dayOptions.cookTime : null;
  var taste    = dayOptions && typeof dayOptions.taste === "string" ? dayOptions.taste : null;

  var history = getPantryHistory();
  // e.type !== "nocook" (2026-08-20g, bug real encontrado durante el
  // trabajo de per-meal editing, corrupción de datos confirmada con un
  // repro directo): sin este filtro, si ya existía un borrador "sin
  // cocinar" de hoy (type:"nocook", sin comprar/consumir todavía),
  // hasRealPantryAction() lo consideraba igualmente "sin acción real"
  // (lee entry.meals, undefined en una entrada "nocook" → siempre false)
  // y este UPSERT lo tomaba como si fuera un borrador de PLATO —
  // sobrescribía su store/createdAt y le añadía un `.meals` espurio
  // encima de sus `.slots` reales, sin tocar el propio historial "sin
  // cocinar" del array pero corrompiendo esa entrada compartida. Ver
  // "Despensa conectada al modo 'sin cocinar' — 2026-08-20f" en STATE.md
  // para el diseño que introdujo el array compartido; este filtro es el
  // que le faltaba desde el principio.
  var draft = history.find(function (e) {
    return getEntryPlanDate(e) === todayKey && e.type !== "nocook" && !hasRealPantryAction(e);
  });

  if (draft) {
    draft.createdAt = nowISO;
    draft.store = storeId || null;
    draft.meals = newMeals;
    var historySavedReplace = savePantryHistory(history);
    return { entry: draft, historySaved: historySavedReplace, replaced: true };
  }

  var entry = {
    id: generateHistoryId(),
    createdAt: nowISO,
    planDate: todayKey,
    store: storeId || null,
    meals: newMeals,
    purchase: { done: false, runs: [] }
  };

  var historySaved = appendPantryHistory(entry);
  return { entry: entry, historySaved: historySaved, replaced: false };
}

/**
 * "Cambiar el plan completo" desde el diálogo de "ya tienes un plan activo
 * hoy" (ver "Gate en Generar plan..." en la cabecera del archivo,
 * showPlanReplaceDialog en render-pantry.js) -- SOLO se llama tras una
 * elección EXPLÍCITA del usuario, nunca automáticamente (a diferencia del
 * UPSERT silencioso de savePlanForToday(), que solo actúa sobre un
 * borrador SIN ninguna acción real todavía).
 *
 * Reemplaza, comida por comida, cada entrada de newMeals sobre la entry
 * existente -- EXCEPTO las que ya estaban cocinadas: una comida cocinada
 * es un hecho consumado (despensa ya descontada por markMealCooked, comida
 * ya comida) que ningún regenerado puede deshacer, así que se conserva TAL
 * CUAL, con su propio cooked/cookedAt/consumed intactos. Nunca crea una
 * entrada nueva -- a diferencia de savePlanForToday() en este mismo caso,
 * que sí crearía una segunda tarjeta "Tu plan" (correcto, sin este
 * diálogo, para no pisar nada en silencio).
 *
 * purchase.done se resetea a false en cuanto se reemplaza AL MENOS una
 * comida (nunca se borran purchase.runs, quedan como historial de lo YA
 * comprado) -- las comidas reemplazadas casi siempre piden ingredientes
 * distintos a los que el checklist de compra daba por buenos, así que
 * "✓ Ya compraste esto" dejaría de ser cierto sin este reseteo. Volver a
 * pulsar "Ya compré todo esto" tras esto es seguro y barato:
 * markPurchaseDone() ya relee el stock actual y solo compra lo que de
 * verdad sigue faltando (nunca duplica lo ya comprado antes del reemplazo).
 * Si TODAS las comidas de newMeals resultan estar ya cocinadas (caso raro:
 * el usuario cocinó todo mientras decidía), no se reemplaza nada y
 * purchase.done se deja tal cual -- no hay nada que comprar de nuevo.
 *
 * @param {string} entryId
 * @param {object[]} newMeals - result.meals de generateDietPlan(), tal cual
 * @param {string} [storeId]
 * @returns {{
 *   entry:object, historySaved:boolean,
 *   replacedMealKeys:string[], keptMealKeys:string[]
 * }|null} - null si entryId no existe
 */
function replacePendingMealsForToday(entryId, newMeals, storeId) {
  var history = getPantryHistory();
  var entry = history.find(function (e) { return e.id === entryId; });
  if (!entry) return null;

  var oldByKey = {};
  (entry.meals || []).forEach(function (m) { oldByKey[m.key] = m; });

  var replacedMealKeys = [];
  var keptMealKeys = [];

  var mergedMeals = (newMeals || []).map(function (meal) {
    var old = oldByKey[meal.key];
    if (old && old.cooked) {
      keptMealKeys.push(meal.key);
      return old;
    }
    replacedMealKeys.push(meal.key);
    return {
      key: meal.key,
      label: meal.label,
      time: typeof meal.time === "string" ? meal.time : null,
      items: (meal.items || []).map(function (item) {
        return { name: item.name, requiredGrams: item.grams };
      }),
      cooked: false,
      cookedAt: null,
      consumed: null
    };
  });

  entry.createdAt = new Date().toISOString();
  entry.store = storeId || entry.store;
  entry.meals = mergedMeals;
  if (replacedMealKeys.length > 0) {
    entry.purchase.done = false;
  }

  var historySaved = savePantryHistory(history);
  return { entry: entry, historySaved: historySaved, replacedMealKeys: replacedMealKeys, keptMealKeys: keptMealKeys };
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

// ── Despensa "sin cocinar" — productos reales, no ingredientes ───────────
// (known issue #9, 2026-08-20f) Los planes "sin cocinar"
// (js/engine/no-cook-generator.js) usan productos reales discretos
// (id/ean, quantity, size/sizeUnit) en vez de ingredientes genéricos por
// gramos -- reutilizar getStock/setStock (arriba) con ese shape distinto
// se descartaría en silencio en sanitizePantryState() (exige
// {grams:number>0}). Stock PARALELO, mismo patrón exacto (getX/saveX/
// sanitizeX, nunca lanza, fallback en memoria si no hay localStorage),
// clave de almacenamiento propia. Las entradas de historial SÍ comparten
// el mismo array que las de plato (pantryHistory) -- distinguidas por
// entry.type==="nocook" (las de plato no llevan `type`, tratado como
// "dish" por defecto) -- migration.js/cloud-sync.js ya tratan cada
// entrada como un blob opaco (solo miran `.id`/`.createdAt`), así que
// compartir el array no les exige ningún cambio.
//
// Local-only por ahora, igual que el resto de la despensa (el propio
// known issue #9 documentaba "sin sincronización entre dispositivos" para
// TODA la despensa, no solo esto) -- el stock de productos NO está
// enganchado a cloud-sync.js/migration.js/supabase todavía; ver STATE.md
// para el razonamiento de alcance de esta sesión. `pantryHistory` (las
// entradas en sí, incluidas las "nocook") SÍ sincroniza como siempre,
// solo el stock de PRODUCTOS es local-only por ahora.
//
// Deliberadamente FUERA de esta sesión: el gate de "Generar plan" +
// diálogo de reemplazo (2026-08-20, ver arriba) no se extiende aquí --
// generar un plan "sin cocinar" nuevo con uno activo pendiente simplemente
// crea una entrada adicional (mismo comportamiento que el modo normal
// tenía ANTES de 2026-08-20). Revisar esa extensión si se pide.

var NOCOOK_STOCK_KEY = "nutritionPlanner.nocookStock.v1";
var _nocookMemoryStock = null;

/**
 * Igual que sanitizePantryState() pero para el stock de productos
 * "sin cocinar" -- exige {quantity:number>0} en vez de {grams:number>0}.
 * @param {*} raw
 * @returns {object}
 */
function sanitizeNoCookStock(raw) {
  if (!raw || typeof raw !== "object") return {};
  var clean = {};
  Object.keys(raw).forEach(function (key) {
    var entry = raw[key];
    if (entry && typeof entry === "object" && typeof entry.quantity === "number" && entry.quantity > 0) {
      clean[key] = {
        quantity: entry.quantity,
        displayName: typeof entry.displayName === "string" ? entry.displayName : key,
        updatedAt: typeof entry.updatedAt === "string" ? entry.updatedAt : null
      };
    }
  });
  return clean;
}

/** Igual que getPantryState() pero para el stock de productos "sin cocinar". */
function getNoCookStock() {
  if (typeof localStorage === "undefined") {
    return _nocookMemoryStock || (_nocookMemoryStock = {});
  }
  try {
    var raw = localStorage.getItem(NOCOOK_STOCK_KEY);
    if (!raw) return {};
    return sanitizeNoCookStock(JSON.parse(raw));
  } catch (err) {
    return {};
  }
}

/** Igual que savePantryState() pero para el stock de productos "sin cocinar". */
function saveNoCookStock(state) {
  if (typeof localStorage === "undefined") {
    _nocookMemoryStock = state;
    return true;
  }
  try {
    localStorage.setItem(NOCOOK_STOCK_KEY, JSON.stringify(state));
    return true;
  } catch (err) {
    return false;
  }
}

/**
 * Unidades disponibles en despensa de un producto, por su id de catálogo
 * (no por nombre normalizado -- dos productos pueden compartir nombre
 * comercial con EAN/tamaño distintos, ver cabecera de
 * no-cook-generator.js). 0 si no hay entrada.
 * @param {string} productId
 * @param {object} [state] - evita releer localStorage en bucles
 * @returns {number}
 */
function getNoCookProductStock(productId, state) {
  var s = state || getNoCookStock();
  var entry = s[productId];
  return (entry && typeof entry.quantity === "number" && entry.quantity > 0) ? entry.quantity : 0;
}

/**
 * Fija la cantidad en despensa de un producto "sin cocinar". 0 o negativo
 * BORRA la entrada (mismo criterio que setStock()).
 * @param {string} productId
 * @param {number} quantity
 * @param {string} [displayName]
 * @returns {object} - el nuevo estado guardado
 */
function setNoCookProductStock(productId, quantity, displayName) {
  var state = getNoCookStock();
  var q = Math.max(0, Math.round(quantity));

  if (q <= 0) {
    delete state[productId];
  } else {
    state[productId] = { quantity: q, displayName: displayName || productId, updatedAt: new Date().toISOString() };
  }

  saveNoCookStock(state);
  return state;
}

/**
 * Suma (o resta, con delta negativo) unidades al stock existente de un
 * producto, nunca por debajo de 0.
 * @param {string} productId
 * @param {number} deltaQuantity
 * @param {string} [displayName]
 * @returns {object}
 */
function adjustNoCookProductStock(productId, deltaQuantity, displayName) {
  var current = getNoCookProductStock(productId);
  return setNoCookProductStock(productId, current + deltaQuantity, displayName);
}

/**
 * Igual que hasRealPantryAction() pero para planes "sin cocinar": compra
 * confirmada o al menos una toma marcada como consumida.
 * @param {object} entry
 * @returns {boolean}
 */
function hasRealNoCookAction(entry) {
  if (!entry) return false;
  if (entry.purchase && entry.purchase.done) return true;
  return (entry.slots || []).some(function (s) { return !!s.consumed; });
}

/**
 * Igual que isEntryFullyCooked() pero para "sin cocinar": TODAS las tomas
 * consumidas.
 * @param {object} entry
 * @returns {boolean}
 */
function isNoCookEntryFullyConsumed(entry) {
  var slots = (entry && entry.slots) || [];
  return slots.length > 0 && slots.every(function (s) { return s.consumed; });
}

/**
 * Etapa 1 "sin cocinar": registra/confirma el plan del día. Mismo UPSERT
 * sobre el borrador que savePlanForToday() (ver cabecera del archivo) --
 * busca una entrada de HOY, type "nocook", sin ninguna acción real
 * todavía, y la actualiza en vez de crear una copia. Pura contabilidad,
 * cero mutación de stock (igual que la versión de plato).
 * @param {{key:string,label:string,items:object[]}[]} slots - plan.slots de generateNoCookPlan()
 * @returns {{ entry:object, historySaved:boolean, replaced:boolean }}
 */
function saveNoCookPlanForToday(slots) {
  var now = new Date();
  var nowISO = now.toISOString();
  var todayKey = formatLocalDateKey(now);

  var newSlots = (slots || []).map(function (slot) {
    return {
      key: slot.key,
      label: slot.label,
      time: typeof slot.time === "string" ? slot.time : null,
      items: (slot.items || []).map(function (item) {
        return {
          id: item.id, name: item.name, brand: item.brand || null,
          quantity: item.quantity, unit: item.unit || null,
          size: typeof item.size === "number" ? item.size : null,
          sizeUnit: item.sizeUnit || null,
          price: typeof item.price === "number" ? item.price : null
        };
      }),
      consumed: false,
      consumedAt: null,
      consumedQuantities: null
    };
  });

  var history = getPantryHistory();
  var draft = history.find(function (e) {
    return e.type === "nocook" && getEntryPlanDate(e) === todayKey && !hasRealNoCookAction(e);
  });

  if (draft) {
    draft.createdAt = nowISO;
    draft.slots = newSlots;
    var historySavedReplace = savePantryHistory(history);
    return { entry: draft, historySaved: historySavedReplace, replaced: true };
  }

  var entry = {
    id: generateHistoryId(),
    type: "nocook",
    createdAt: nowISO,
    planDate: todayKey,
    slots: newSlots,
    purchase: { done: false, runs: [] }
  };
  var historySaved = appendPantryHistory(entry);
  return { entry: entry, historySaved: historySaved, replaced: false };
}

/**
 * Etapa 2 "sin cocinar": "Ya compré todo esto" -- añade quantity de cada
 * producto (por id de catálogo, no por nombre) al stock de productos.
 * A diferencia de markPurchaseDone() (ingredientes agregados, checklist
 * de exclusión parcial contra un tamaño de paquete a redondear), aquí es
 * todo-o-nada: cada producto ya es una unidad discreta e identificada, no
 * hay "cuánto falta" que calcular -- si algo no se compró de verdad, no
 * confirmar la compra hasta tenerlo todo (o repetir la acción más tarde,
 * es idempotente-seguro: cada llamada solo SUMA lo de esa llamada).
 * @param {string} entryId
 * @returns {{ saved:boolean, historySaved:boolean, run:object }|null}
 */
function markNoCookPurchaseDone(entryId) {
  var history = getPantryHistory();
  var entry = history.find(function (e) { return e.id === entryId && e.type === "nocook"; });
  if (!entry) return null;

  var stock = getNoCookStock();
  var nowISO = new Date().toISOString();
  var lines = [];
  var totalCost = 0;

  (entry.slots || []).forEach(function (slot) {
    (slot.items || []).forEach(function (item) {
      var current = getNoCookProductStock(item.id, stock);
      stock[item.id] = { quantity: current + item.quantity, displayName: item.name, updatedAt: nowISO };
      lines.push({ id: item.id, name: item.name, quantity: item.quantity, price: item.price });
      totalCost += (item.price || 0) * item.quantity;
    });
  });

  var saved = saveNoCookStock(stock);
  var run = { at: nowISO, lines: lines, totals: { purchaseCost: round2(totalCost), itemCount: lines.length } };
  entry.purchase.runs.push(run);
  entry.purchase.done = true;
  var historySaved = savePantryHistory(history);

  return { saved: saved, historySaved: historySaved, run: run };
}

/**
 * Etapa 3 "sin cocinar": "Marcar como consumido", UNA toma completa a la
 * vez (mismo grano que markMealCooked() por comida) -- única función que
 * resta stock de productos. Idempotente y con undo exacto vía
 * slot.consumedQuantities, mismo patrón exacto que meal.consumed en
 * markMealCooked().
 * @param {string} entryId
 * @param {string} slotKey
 * @param {boolean} consumed
 * @returns {{ saved:boolean, historySaved:boolean, entry:object, slot:object }|null}
 */
function markNoCookSlotConsumed(entryId, slotKey, consumed) {
  var history = getPantryHistory();
  var entry = history.find(function (e) { return e.id === entryId && e.type === "nocook"; });
  if (!entry) return null;

  var slot = (entry.slots || []).find(function (s) { return s.key === slotKey; });
  if (!slot) return null;

  if (!!consumed === !!slot.consumed) {
    // Ya está en el estado pedido -- no-op idempotente, no se toca stock.
    return { saved: true, historySaved: true, entry: entry, slot: slot };
  }

  var stock = getNoCookStock();
  var nowISO = new Date().toISOString();

  if (consumed) {
    slot.consumedQuantities = (slot.items || []).map(function (item) {
      var current = getNoCookProductStock(item.id, stock);
      var used = Math.min(item.quantity, current);
      stock[item.id] = { quantity: Math.max(0, current - used), displayName: item.name, updatedAt: nowISO };
      return { id: item.id, name: item.name, quantity: used };
    });
    slot.consumed = true;
    slot.consumedAt = nowISO;
  } else {
    (slot.consumedQuantities || []).forEach(function (c) {
      var current = getNoCookProductStock(c.id, stock);
      stock[c.id] = { quantity: current + c.quantity, displayName: c.name, updatedAt: nowISO };
    });
    slot.consumed = false;
    slot.consumedAt = null;
    slot.consumedQuantities = null;
  }

  var saved = saveNoCookStock(stock);
  var historySaved = savePantryHistory(history);
  return { saved: saved, historySaved: historySaved, entry: entry, slot: slot };
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
  if (!entry.purchase || typeof entry.purchase !== "object" || !Array.isArray(entry.purchase.runs)) return false;

  // "sin cocinar" (2026-08-20f): entry.slots sustituye a entry.meals --
  // misma validación estricta, forma distinta (ver cabecera del bloque
  // "Despensa 'sin cocinar'" más abajo).
  if (entry.type === "nocook") {
    if (!Array.isArray(entry.slots)) return false;
    return entry.slots.every(function (slot) {
      return slot && typeof slot === "object"
        && typeof slot.key === "string"
        && Array.isArray(slot.items);
    });
  }

  if (!Array.isArray(entry.meals)) return false;
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
