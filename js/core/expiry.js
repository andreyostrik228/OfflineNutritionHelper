/**
 * js/core/expiry.js
 * ─────────────────────────────────────────────────────────────────────────
 * Caducidad de la despensa: resolver la fecha de una entrada, clasificar su
 * urgencia, y puntuar cuánto ayuda un plato a gastar lo que está a punto de
 * estropearse.
 *
 * Funciones PURAS -- ni localStorage ni DOM ni `new Date()` implícito: la
 * fecha "hoy" siempre entra como parámetro. Así los tests fijan el día y no
 * dependen de cuándo se ejecuten (el mismo criterio que `meal-schedule.js`).
 *
 * TRES ORÍGENES DE FECHA, SIEMPRE DISTINGUIBLES, en este orden de
 * prioridad:
 *   - `"user"`      -- fecha introducida a mano, la del envase. Es un dato.
 *   - `"store"`     -- derivada de `openedAt` + los días que MERCADONA
 *                      publica en su propia API ("una vez abierto,
 *                      consumir en 3 días", ver js/data/product-storage.js).
 *                      Es un dato del fabricante, no una estimación nuestra
 *                      -- por eso gana a `"estimated"`.
 *   - `"estimated"` -- derivada de `acquiredAt` + `js/data/shelf-life.js`.
 *                      Es una APROXIMACIÓN y la UI debe decirlo.
 *   - `"unknown"`   -- ni fecha ni estimación posible. No participa en la
 *                      urgencia; nunca se inventa un valor.
 *
 * Esa distinción no es cosmética: es la misma regla que el resto del
 * proyecto aplica a la nutrición (`nutritionSource`/`nutritionConfidence`,
 * badge "real" frente a "no verificado"). Un valor aproximado se etiqueta
 * como aproximado.
 * ─────────────────────────────────────────────────────────────────────────
 */

/** Umbrales en días. Ver `expiryTier`. */
var EXPIRY_URGENT_DAYS = 2;
var EXPIRY_SOON_DAYS = 5;

/**
 * Días que le quedan a un PERECEDERO ya ABIERTO cuando la tienda no publica
 * su "consumir en N días tras abrir".
 *
 * Abrir un envase reinicia el reloj: una bandeja de pechuga cerrada aguanta
 * sus 3 días desde la compra, pero una vez abierta el aire y el manipulado
 * mandan sobre la fecha original. Sin dato del fabricante, 3 días es la
 * cifra conservadora habitual para fresco abierto en nevera.
 *
 * Solo se aplica a perecederos (`isPerishable`). Un bote de mermelada
 * abierto no entra aquí: su vida útil ya contempla el uso normal y no
 * tenemos ningún dato que justifique acortarla.
 *
 * NUNCA alarga: si al producto cerrado ya le quedaba menos que esto, manda
 * la fecha más corta. Abrir algo no puede volverlo más fresco.
 */
var OPENED_PERISHABLE_DAYS = 3;

/**
 * Días de consumo tras abrir que publica la TIENDA para un producto
 * concreto (`js/data/product-storage.js`, extraído de la API de Mercadona).
 *
 * `product-storage.js` es opcional: sin él todo sigue funcionando con las
 * estimaciones, solo que sin el escalón de datos reales.
 *
 * @param {string} productId
 * @returns {number|null}
 */
function getStoreDaysAfterOpening(productId) {
  var e = _fichaDeTienda(productId);
  return (e && typeof e.daysAfterOpening === "number") ? e.daysAfterOpening : null;
}

/**
 * Puente ROL DE INGREDIENTE -> PRODUCTO REAL, por EAN.
 *
 * `PRODUCT_STORAGE` está indexado por id de producto de Mercadona, pero la
 * despensa de ingredientes trabaja con roles ("zanahoria"). Sin puente, las
 * 609 fichas con "consumir en N días tras abrir" no las leía NADIE: el
 * origen `"store"` era código muerto (medido el 2026-09-04).
 *
 * El puente NO adivina: usa el EAN de `real-ingredient-matches.js`, que son
 * emparejamientos verificados a mano, y lo busca en el catálogo. Un EAN es
 * exacto o no es. Deliberadamente NO se empareja por parecido de texto --
 * ya se probó para los precios y emparejaba "naranja" con "Fanta naranja"
 * (ver la cabecera de real-ingredient-matches.js). Un emparejamiento malo
 * aquí daría una fecha de caducidad inventada, que es peor que no dar
 * ninguna.
 *
 * Se construye una sola vez y se memoiza: son 2994 productos.
 */
var _puenteRolProducto = null;

function _idDeProductoParaRol(key) {
  if (typeof REAL_INGREDIENT_MATCHES === "undefined") return null;
  if (typeof REAL_PRODUCTS === "undefined") return null;

  if (!_puenteRolProducto) {
    var porEan = {};
    for (var i = 0; i < REAL_PRODUCTS.length; i++) {
      var p = REAL_PRODUCTS[i];
      if (p && p.ean) porEan[String(p.ean)] = String(p.id);
    }
    _puenteRolProducto = {};
    Object.keys(REAL_INGREDIENT_MATCHES).forEach(function (rol) {
      var m = REAL_INGREDIENT_MATCHES[rol];
      var id = (m && m.ean) ? porEan[String(m.ean)] : null;
      if (id) _puenteRolProducto[rol] = id;
    });
  }
  return _puenteRolProducto[key] || null;
}

/**
 * Ficha de conservación de un producto, sea la clave un id de producto (el
 * stock "sin cocinar") o un rol de ingrediente (la despensa normal).
 * @param {string} clave
 * @returns {object|null}
 */
function _fichaDeTienda(clave) {
  if (typeof PRODUCT_STORAGE === "undefined" || !clave) return null;
  var directa = PRODUCT_STORAGE[String(clave)];
  if (directa) return directa;
  var id = _idDeProductoParaRol(String(clave));
  return id ? (PRODUCT_STORAGE[id] || null) : null;
}

/**
 * Dónde dice la TIENDA que se guarda un producto concreto.
 * @param {string} productId
 * @returns {string|null} "nevera" | "despensa" | "congelador" | null
 */
function getStoreStorage(productId) {
  var e = _fichaDeTienda(productId);
  return (e && typeof e.storage === "string") ? e.storage : null;
}

/** Peso por tramo, usado al puntuar platos. Caducado NO puntúa (ver abajo). */
var EXPIRY_TIER_WEIGHT = {
  caducado: 0,
  urgente: 1,
  pronto: 0.5,
  pasado: 0.3,
  ok: 0
};

/**
 * Fracción de la vida útil dentro de la cual conviene consumir un
 * PERECEDERO. A 0.5, un plátano de 5 días se quiere gastar el día 2, no el
 * día 4.
 *
 * Por qué existe: "caduca en 2 días" es la señal equivocada para fruta y
 * verdura. Lo que importa no es el final de la vida útil sino la mitad —
 * pasada esa mitad la calidad cae aunque la fecha aún no haya llegado.
 * Solo aplica a perecederos (`isPerishable`, js/data/shelf-life.js): un
 * atún en lata al mes 12 de 24 no tiene ninguna urgencia.
 */
var FRESH_WINDOW_RATIO = 0.5;

/**
 * Días enteros entre dos fechas ISO (YYYY-MM-DD o ISO completo).
 * Compara por DÍA local, no por instante: si algo caduca "hoy" el resultado
 * es 0, no -0.4 porque sean las 14:00. Devuelve null si algo no parsea.
 * @param {string} fromISO
 * @param {string} toISO
 * @returns {number|null}
 */
function daysBetween(fromISO, toISO) {
  if (typeof fromISO !== "string" || typeof toISO !== "string") return null;
  var a = new Date(fromISO);
  var b = new Date(toISO);
  if (isNaN(a.getTime()) || isNaN(b.getTime())) return null;
  var da = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  var db = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((db - da) / 86400000);
}

/**
 * Suma días a una fecha ISO y devuelve `YYYY-MM-DD`.
 * @param {string} isoDate
 * @param {number} days
 * @returns {string|null}
 */
function addDays(isoDate, days) {
  if (typeof isoDate !== "string") return null;
  var d = new Date(isoDate);
  if (isNaN(d.getTime())) return null;
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Clasifica los días restantes en un tramo de urgencia.
 * @param {number|null} daysLeft
 * @returns {string} "caducado" | "urgente" | "pronto" | "ok" | "desconocido"
 */
function expiryTier(daysLeft) {
  if (typeof daysLeft !== "number" || isNaN(daysLeft)) return "desconocido";
  if (daysLeft < 0) return "caducado";
  if (daysLeft <= EXPIRY_URGENT_DAYS) return "urgente";
  if (daysLeft <= EXPIRY_SOON_DAYS) return "pronto";
  return "ok";
}

/**
 * Aplica la ventana de frescura a un tramo ya calculado por días absolutos.
 *
 * Solo puede ASCENDER de "ok" a "pasado", nunca al revés. Eso implementa
 * por construcción la regla de "la nueva señal jamás debilita un aviso
 * existente": caducado/urgente/pronto son todos más urgentes que pasado,
 * así que si el tramo absoluto ya es uno de ellos, se respeta tal cual.
 *
 * Ejemplos reales de por qué el orden es ese:
 *   - zanahoria (28 d) en el día 15 -> quedan 13 días -> "ok" -> "pasado".
 *     Pasó la mitad, conviene gastarla, pero no corre prisa de verdad.
 *   - leche (10 d) en el día 8 -> quedan 2 días -> "urgente". Pasó también
 *     la mitad, pero 2 días manda sobre la media vida: se queda "urgente".
 *
 * @param {string} tier - tramo por días absolutos
 * @param {number|null} daysLeft
 * @param {number|null} totalDays - vida útil TOTAL de esta entrada
 * @param {string} key - clave normalizada (decide si es perecedero)
 * @returns {string}
 */
function applyFreshnessWindow(tier, daysLeft, totalDays, key) {
  if (tier !== "ok") return tier;
  if (typeof isPerishable !== "function" || !isPerishable(key)) return tier;
  if (typeof totalDays !== "number" || !(totalDays > 0)) return tier;
  if (typeof daysLeft !== "number" || isNaN(daysLeft)) return tier;

  // Días ya consumidos de su vida útil.
  var elapsed = totalDays - daysLeft;

  return (elapsed >= totalDays * FRESH_WINDOW_RATIO) ? "pasado" : tier;
}

/**
 * Resuelve la caducidad de UNA entrada de despensa.
 *
 * Prioridad: fecha del usuario > estimación > desconocido. Una fecha
 * introducida a mano siempre gana; es un dato real y la estimación no.
 *
 * @param {object} entry - entrada de despensa ({grams|quantity, acquiredAt, expiresAt, storage})
 * @param {string} key - clave normalizada del ingrediente
 * @param {string} todayISO - fecha de referencia
 * @returns {{date:string|null, source:string, daysLeft:number|null, totalDays:number|null, tier:string, storage:string|null}}
 */
function resolveExpiry(entry, key, todayISO) {
  var unknown = { date: null, source: "unknown", daysLeft: null, totalDays: null, tier: "desconocido", storage: null };
  if (!entry || typeof entry !== "object") return unknown;

  var storage = typeof entry.storage === "string" ? entry.storage : null;

  if (typeof entry.expiresAt === "string" && entry.expiresAt) {
    var d = daysBetween(todayISO, entry.expiresAt);
    // La vida útil total solo se conoce si además sabemos CUÁNDO se
    // compró. Sin `acquiredAt` no hay media vida que calcular, y el tramo
    // se queda en el de días absolutos -- nunca se inventa un total.
    var userTotal = (typeof entry.acquiredAt === "string" && entry.acquiredAt)
      ? daysBetween(entry.acquiredAt, entry.expiresAt)
      : null;
    return {
      date: entry.expiresAt.slice(0, 10),
      source: "user",
      daysLeft: d,
      totalDays: userTotal,
      tier: applyFreshnessWindow(expiryTier(d), d, userTotal, key),
      storage: storage
    };
  }

  // ── Envase ABIERTO (2026-09-04) ──────────────────────────────────
  // Va ANTES que las ramas por fecha de compra: en cuanto consta que se
  // abrió, esa es la señal buena. `openedAt` lo pone sola la app al
  // cocinar una comida o consumir una toma (pantry.js), nunca el usuario.
  if (typeof entry.openedAt === "string" && entry.openedAt) {
    // Prioridad dentro de "abierto": dato del fabricante > cifra propia
    // para abierto (conservas) > regla general de perecedero.
    var diasAbierto = null;
    var origenAbierto = "estimated";

    var deTienda = getStoreDaysAfterOpening(entry.productId || key);
    if (deTienda) {
      diasAbierto = deTienda;
      origenAbierto = "store";
    }
    if (diasAbierto === null && typeof getOpenedShelfLife === "function") {
      diasAbierto = getOpenedShelfLife(key);
    }
    if (diasAbierto === null && typeof isPerishable === "function" && isPerishable(key)) {
      diasAbierto = OPENED_PERISHABLE_DAYS;
    }

    if (diasAbierto !== null) {
      var fechaAbierto = addDays(entry.openedAt, diasAbierto);
      // Regla: abrir nunca ALARGA la vida. Si al producto cerrado ya le
      // quedaba menos, se respeta la fecha más corta.
      if (typeof entry.acquiredAt === "string" && entry.acquiredAt && typeof getShelfLife === "function") {
        var vidaCerrada = getShelfLife(key, storage);
        if (vidaCerrada) {
          var fechaCerrada = addDays(entry.acquiredAt, vidaCerrada.days);
          // Fechas YYYY-MM-DD: comparar como texto es comparar por día.
          if (fechaCerrada && fechaCerrada < fechaAbierto) fechaAbierto = fechaCerrada;
        }
      }
      var da = daysBetween(todayISO, fechaAbierto);
      return {
        date: fechaAbierto,
        source: origenAbierto,
        daysLeft: da,
        totalDays: diasAbierto,
        tier: applyFreshnessWindow(expiryTier(da), da, diasAbierto, key),
        storage: storage || getStoreStorage(entry.productId || key)
      };
    }
  }

  // NO hay rama de tienda por fecha de COMPRA, y es a propósito.
  // "Consumir en N días tras abrir" no dice absolutamente nada de un
  // envase cerrado: aplicarlo desde la compra daba por urgente una lata
  // que nadie ha tocado. Mientras el puente por EAN no existía la rama era
  // inofensiva porque no se alcanzaba nunca; al conectarlo (2026-09-04)
  // habría empezado a mentir, así que se retira. Un envase cerrado se
  // estima con shelf-life.js, justo aquí debajo.

  if (typeof entry.acquiredAt === "string" && entry.acquiredAt && typeof getShelfLife === "function") {
    var life = getShelfLife(key, storage);
    if (life) {
      var est = addDays(entry.acquiredAt, life.days);
      var dd = daysBetween(todayISO, est);
      return {
        date: est,
        source: "estimated",
        daysLeft: dd,
        totalDays: life.days,
        tier: applyFreshnessWindow(expiryTier(dd), dd, life.days, key),
        storage: life.storage
      };
    }
  }

  return { date: null, source: "unknown", daysLeft: null, totalDays: null, tier: "desconocido", storage: storage };
}

/**
 * Puntúa cuánto ayuda un plato a gastar despensa que corre prisa.
 *
 * Devuelve 0..1 -- la fracción de los ingredientes del plato que están en
 * despensa Y con la caducidad encima, ponderada por tramo. Acotado a
 * propósito para que quien lo llame controle la magnitud con su propio
 * peso, igual que `diversityScore`.
 *
 * **Lo caducado NO puntúa** (peso 0). Un plato no gana nada por "gastar"
 * algo que ya no debería comerse -- eso sería empujar al usuario a comer
 * comida en mal estado. Lo caducado se avisa en la despensa para tirarlo,
 * no se mete en un plan.
 *
 * @param {{name:string}[]} items - ingredientes del plato
 * @param {object} pantryState
 * @param {string} todayISO
 * @returns {number} 0..1
 */
function dishExpiryUrgency(items, pantryState, todayISO) {
  if (!items || !items.length || !pantryState) return 0;
  if (typeof normalizeIngredientKey !== "function") return 0;

  // `todayISO` es opcional para que quien puntúa no tenga que enhebrarlo:
  // sin fecha no se puede calcular urgencia y el término valdría 0, que es
  // silenciosamente equivocado en vez de útil.
  var today = todayISO || new Date().toISOString().slice(0, 10);
  var total = 0;

  for (var i = 0; i < items.length; i++) {
    var key = normalizeIngredientKey(items[i].name);
    var entry = pantryState[key];
    if (!entry) continue;
    var info = resolveExpiry(entry, key, today);
    total += EXPIRY_TIER_WEIGHT[info.tier] || 0;
  }

  return Math.min(1, total / items.length);
}

/**
 * Despensa tal y como estará en `targetISO` — sin lo que para entonces ya
 * habrá caducado.
 *
 * ── El bug que esto arregla (medido 2026-08-25) ──────────────────────
 * `resolvePurchaseCostWithPantry()` (pantry.js) descuenta el stock del
 * coste de COMPRA sin mirar la caducidad en absoluto. Medido con el mismo
 * plato y la misma tienda:
 *
 *     sin despensa                 1,70 €
 *     stock fresco 500 g           0,00 €
 *     stock CADUCADO el 15 enero   0,00 €   <-- idéntico al fresco
 *
 * Es decir: unas zanahorias caducadas hace siete meses "cubren" la
 * necesidad y el presupuesto del día sale a cero. No era un problema de
 * planificar a futuro, estaba mal HOY.
 *
 * ── Por qué un filtro en el borde y no una fecha en budget.js ────────
 * `js/core/budget.js` es la ÚNICA fuente de verdad del coste de compra
 * del día, y `pricing.js` la del precio. Enhebrarles una fecha las
 * acoplaría a la caducidad y ampliaría muchísimo el radio de impacto.
 * Filtrando UNA vez en el borde, quien planifica decide contra qué día
 * mira y ni budget.js ni pricing.js cambian una línea. Planificar a
 * futuro sale gratis: se proyecta al día objetivo en vez de a hoy.
 *
 * ── Regla inviolable: solo se descarta lo DEMOSTRABLEMENTE caducado ──
 * Una entrada sin datos de caducidad (`source:"unknown"`, sin
 * `acquiredAt` ni `expiresAt`) se CONSERVA siempre. Tirar en silencio
 * stock cuya edad no podemos determinar sería el fallo espejo del bug de
 * arriba: allí se daba por bueno lo que no lo era, aquí se daría por malo
 * lo que no sabemos. Es el mismo principio que el proyecto aplica a la
 * nutrición — nunca inventar un valor, y nunca descartar en silencio lo
 * que no se puede razonar.
 *
 * @param {object|null} pantryState - snapshot de getPantryState()
 * @param {string} [targetISO] - día para el que se planifica; por defecto hoy
 * @returns {object|null} copia filtrada (no muta la original), o el mismo
 *   valor recibido si es null/no es un objeto
 */
function projectPantryState(pantryState, targetISO) {
  if (!pantryState || typeof pantryState !== "object") return pantryState;

  var target = targetISO || new Date().toISOString().slice(0, 10);
  var projected = {};

  Object.keys(pantryState).forEach(function (key) {
    var entry = pantryState[key];
    var info = resolveExpiry(entry, key, target);

    // Solo se cae lo que se puede demostrar caducado a esa fecha.
    // "desconocido" (sin datos) NO es prueba de nada y se conserva.
    if (info && info.tier === "caducado") return;

    projected[key] = entry;
  });

  return projected;
}

/**
 * Lista las entradas de despensa que requieren atención, ordenadas por
 * urgencia. Para la UI: "esto caduca ya".
 * @param {object} pantryState
 * @param {string} todayISO
 * @returns {{key:string, name:string, tier:string, daysLeft:number, source:string, date:string}[]}
 */
function listExpiringEntries(pantryState, todayISO) {
  if (!pantryState) return [];
  var out = [];
  Object.keys(pantryState).forEach(function (key) {
    var entry = pantryState[key];
    var info = resolveExpiry(entry, key, todayISO);
    if (info.tier === "ok" || info.tier === "desconocido") return;
    out.push({
      key: key,
      name: (entry && entry.displayName) || key,
      tier: info.tier,
      daysLeft: info.daysLeft,
      source: info.source,
      date: info.date
    });
  });
  return out.sort(function (a, b) { return a.daysLeft - b.daysLeft; });
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    daysBetween: daysBetween,
    addDays: addDays,
    expiryTier: expiryTier,
    resolveExpiry: resolveExpiry,
    dishExpiryUrgency: dishExpiryUrgency,
    listExpiringEntries: listExpiringEntries
  };
}
