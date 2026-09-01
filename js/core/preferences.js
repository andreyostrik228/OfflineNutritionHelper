/**
 * js/core/preferences.js
 * ─────────────────────────────────────────────────────────────────────────
 * PREFERENCIAS BLANDAS del usuario: "esto no me gusta, no me lo pongas".
 *
 * ── Por qué esto vive en su PROPIO archivo ───────────────────────────────
 * Las alergias son otra cosa y van a vivir aparte (js/core/allergens.js,
 * todavía sin construir). No es una manía organizativa, es la diferencia
 * entre los dos tipos de exclusión:
 *
 *   AQUÍ (no me gusta)   PREFERENCIA. Si algo se cuela, el usuario se
 *                        encoge de hombros y cambia de plato. Filtrar es
 *                        suficiente. Sin datos = no se excluye nada.
 *   ALERGIAS             SEGURIDAD. Si algo se cuela, alguien puede acabar
 *                        en urgencias. Restricción DURA, al nivel del techo
 *                        de presupuesto, jamás dentro de la puntuación. Sin
 *                        datos = se excluye (fail-closed).
 *
 * Fíjate en que la regla de "sin datos" es OPUESTA en los dos casos, y esa
 * es la razón de fondo para no fundirlos: comparten la forma (una lista de
 * exclusión del usuario) pero no el comportamiento. Una sola lista con un
 * flag de "severidad" ahorraría código e invitaría a que alguien, meses
 * después, "optimice" el camino de alergias metiéndolo en el sorteo de
 * puntuación sin entender lo que rompe. Con dos archivos, ese error tiene
 * que ser deliberado.
 *
 * NO filtra por alérgenos. No lo intentes desde aquí.
 *
 * Expone (globales, sin módulos igual que el resto del proyecto):
 *   matchesDislike(name, dislikes)
 *   filterDislikedProducts(products, dislikes)
 *   getDislikes()
 *   getCuisinePreference()
 *   getEatingPriority()
 * ─────────────────────────────────────────────────────────────────────────
 */

/**
 * Normaliza para comparar: minúsculas, sin acentos, sin puntuación.
 * Reutiliza normalizeIngredientKey() (pricing.js) cuando está cargado para
 * no tener DOS normalizaciones que puedan divergir en silencio -- si
 * divergieran, "plátano" escrito en la lista dejaría de casar con
 * "Plátano" del catálogo y el filtro fallaría sin decir nada.
 * @param {string} text
 * @returns {string}
 */
function normalizePreferenceText(text) {
  if (typeof normalizeIngredientKey === "function") {
    return normalizeIngredientKey(text || "");
  }
  return String(text || "")
    .toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[.,;:]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * ¿Coincide `name` con alguna entrada de la lista de "no me gusta"?
 *
 * Coincidencia por SUBCADENA a propósito: el usuario escribe "cebolla" y
 * espera que eso tape "Cebolla dulce", "Crema de cebolla" y "Aros de
 * cebolla". Es una preferencia, así que pasarse de amplio molesta mucho
 * menos que quedarse corto -- exactamente al revés que en alergias, donde
 * un falso negativo es el que hace daño.
 *
 * Grupos (2026-09-01): un token como "pescado" o "lácteos" se expande a
 * sus miembros (`expandDislikeTerms`, js/data/dislike-groups.js) antes de
 * casar, así que "pescado" tapa merluza/atún/salmón/... de una vez. Si ese
 * archivo no está cargado, expandDislikeTerms devuelve la lista tal cual y
 * el comportamiento es el de antes.
 *
 * @param {string} name - nombre de producto o de ingrediente
 * @param {string[]} dislikes
 * @returns {boolean}
 */
function matchesDislike(name, dislikes) {
  if (!name || !Array.isArray(dislikes) || !dislikes.length) return false;

  var haystack = normalizePreferenceText(name);
  if (!haystack) return false;

  var terms = (typeof expandDislikeTerms === "function") ? expandDislikeTerms(dislikes) : dislikes;

  for (var i = 0; i < terms.length; i++) {
    var needle = normalizePreferenceText(terms[i]);
    if (!needle) continue;
    if (haystack.indexOf(needle) !== -1) return true;
  }

  return false;
}

/**
 * Quita del pool los productos que el usuario ha dicho que no le gustan.
 *
 * Acepta tanto productos "pelados" (`{name}`) como las entradas del pool de
 * "sin cocinar" (`{product:{name}}`), porque el generador trabaja con las
 * segundas y el catálogo con las primeras.
 *
 * @param {object[]} products
 * @param {string[]} dislikes
 * @returns {object[]} array nuevo; el original no se toca
 */
function filterDislikedProducts(products, dislikes) {
  if (!Array.isArray(products)) return [];
  if (!Array.isArray(dislikes) || !dislikes.length) return products;

  return products.filter(function (item) {
    var name = (item && item.product && item.product.name) || (item && item.name);
    return !matchesDislike(name, dislikes);
  });
}

/**
 * Lista de "no me gusta" del usuario.
 *
 * Lee el campo #dislikes del formulario DIRECTAMENTE si está en pantalla, y
 * solo cae en los ajustes guardados si no lo está (otro punto de entrada, o
 * los tests). Es la misma razón que en getEatingPriority(): saveSettings()
 * se llama DESPUÉS de generar el plan (js/app.js), así que en la primera
 * generación tras escribir un "no me gusta" nuevo los ajustes todavía tienen
 * la lista vieja -- leerlos ahí hacía que el plan trajera justamente lo que
 * el usuario acababa de excluir ("plátano" y "brócoli" seguían saliendo
 * hasta la segunda generación).
 *
 * Campo presente pero vacío = sin preferencias (al recargar, app.js vuelca
 * settings.dislikes en el campo, así que "vacío" es de verdad vacío).
 *
 * Vacía si no hay ni campo ni settings.js -- el filtro entonces no quita
 * nada, que es el fallo correcto para una preferencia (a diferencia de una
 * alergia, donde no saber debe excluir).
 * @returns {string[]}
 */
function getDislikes() {
  if (typeof document !== "undefined" && document.getElementById) {
    var el = document.getElementById("dislikes");
    if (el && typeof el.value === "string") {
      return el.value.split(",")
        .map(function (part) { return part.trim(); })
        .filter(Boolean);
    }
  }
  if (typeof getSettings !== "function") return [];
  var settings = getSettings();
  return Array.isArray(settings.dislikes) ? settings.dislikes : [];
}


/**
 * Qué se busca al comer, más allá del objetivo de peso:
 *
 *   "satiety"  llenar el plato: la mayor cantidad de comida por euro.
 *   "balanced" sin sesgo (por defecto, comportamiento de siempre).
 *   "protein"  exprimir la proteína por euro.
 *
 * Es un eje DISTINTO de `goal` (volumen/definición/mantenimiento) a
 * propósito: `goal` fija cuántas calorías, esto fija con qué se llenan.
 * "Estoy definiendo y voy justo de dinero" es una combinación normal y con
 * un solo desplegable no se podría decir.
 *
 * Se lee del <select> directamente y solo se cae en los ajustes guardados
 * si no existe: los ajustes se persisten DESPUÉS de generar el plan, así
 * que en la primera generación estarían obsoletos.
 *
 * @returns {"satiety"|"balanced"|"protein"}
 */
function getEatingPriority() {
  var raw = null;
  if (typeof document !== "undefined" && document.getElementById) {
    var el = document.getElementById("priority");
    if (el && el.value) raw = el.value;
  }
  if (!raw && typeof getSettings === "function") raw = getSettings().priority;
  // "cheap" es el nombre viejo del modo saciante (2026-09-01): mismo
  // criterio, comida por euro. Se acepta para no romper ajustes guardados.
  if (raw === "cheap") return "satiety";
  return (raw === "satiety" || raw === "protein") ? raw : "balanced";
}

/**
 * ── Equipo y dificultad (2026-08-26) ───────────────────────────────────
 * Nacen del mismo feedback real que los pasos de cocina: "no tenía el
 * equipo" y "eran difíciles". Son PREFERENCIAS BLANDAS, igual que
 * dislikes, y por eso viven aquí y no en el futuro allergens.js: si un
 * plato no declara equipo o dificultad, NO se filtra. Durante el piloto
 * 316 de 334 platos están en ese caso, así que la regla "sin datos = no
 * se toca" es lo único que mantiene la app usable.
 */

/**
 * Equipo del que dispone el usuario. Lista vacía = "no me filtres por
 * equipo", que es lo correcto por defecto: alguien que no ha configurado
 * nada no debería perder platos en silencio.
 * @returns {string[]}
 */
function getOwnedEquipment() {
  if (typeof getSettings !== "function") return [];
  var settings = getSettings();
  return Array.isArray(settings.equipment) ? settings.equipment : [];
}

/**
 * Dificultad máxima aceptada (1..3). 0/ausente = sin límite.
 * @returns {number}
 */
function getMaxDifficulty() {
  if (typeof getSettings !== "function") return 0;
  var settings = getSettings();
  var v = settings.maxDifficulty;
  return (typeof v === "number" && v >= 1 && v <= 3) ? v : 0;
}

/**
 * Cocina preferida: "espanola" | "internacional" | "mixta".
 *
 * ── Esto SESGA, no filtra. La diferencia importa ────────────────────────
 * El usuario pidió "mixto, pero comida española más". Un filtro haría lo
 * contrario de lo que pidió: le quitaría la pasta. Aquí solo se empuja la
 * puntuación (ver scoreDishForSelection en dish-selector.js) para que lo
 * español salga MÁS a menudo, no para que lo demás desaparezca.
 *
 * "mixta" (y cualquier valor desconocido, y no tener ajustes) = sin
 * sesgo. Es el defecto correcto: quien no ha pedido nada no debe notar
 * ningún cambio.
 *
 * @returns {"espanola"|"internacional"|"mixta"}
 */
function getCuisinePreference() {
  if (typeof getSettings !== "function") return "mixta";
  var v = getSettings().cuisine;
  return (v === "espanola" || v === "internacional") ? v : "mixta";
}

/**
 * ¿Puede el usuario cocinar este plato con lo que tiene?
 *
 * Reglas, en orden:
 *   - plato sin instrucciones            -> SÍ (no sabemos, no filtramos)
 *   - usuario sin equipo configurado     -> SÍ (no ha pedido filtrar)
 *   - plato que solo necesita "ninguno"  -> SÍ SIEMPRE. Cuchillo y bol se
 *     dan por supuestos; estos son justamente la respuesta a "no tengo
 *     equipo" y nunca deben desaparecer del plan.
 *   - resto                              -> hace falta TENER TODO lo que
 *     el plato pide. Que falte una sola cosa lo hace incocinable.
 *
 * @param {object} dish
 * @param {string[]} [owned]
 * @returns {boolean}
 */
function canCookWithEquipment(dish, owned) {
  if (!dish) return true;
  if (typeof getDishInstructions !== "function") return true;

  var info = getDishInstructions(dish.name);
  if (!info || !Array.isArray(info.equipment) || !info.equipment.length) return true;

  var have = Array.isArray(owned) ? owned : getOwnedEquipment();
  if (!have.length) return true;

  return info.equipment.every(function (token) {
    return token === "ninguno" || have.indexOf(token) !== -1;
  });
}

/**
 * ¿Está el plato dentro del nivel de dificultad aceptado?
 * Sin instrucciones o sin límite configurado: siempre sí.
 * @param {object} dish
 * @param {number} [maxLevel]
 * @returns {boolean}
 */
function isWithinDifficulty(dish, maxLevel) {
  if (!dish) return true;
  if (typeof getDishInstructions !== "function") return true;

  var limit = (typeof maxLevel === "number") ? maxLevel : getMaxDifficulty();
  if (!limit) return true;

  var info = getDishInstructions(dish.name);
  if (!info || typeof info.difficulty !== "number") return true;

  return info.difficulty <= limit;
}
