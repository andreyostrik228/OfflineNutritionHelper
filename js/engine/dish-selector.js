/**
 * js/engine/dish-selector.js
 * ─────────────────────────────────────────────────────────────────────────
 * Motor de selección de platos: presupuesto ESTRICTO + diversidad.
 *
 * Rediseño del sistema de presupuesto (ver STATE.md): el presupuesto ya NO
 * es un filtro con margen oculto ni una restricción que se relaja al no
 * encontrar candidatos. Es un tope duro que nunca se supera a propósito.
 * Cuando no hay ningún plato dentro del tope, el sistema busca activamente
 * alternativas más baratas antes de rendirse — nunca sube el tope.
 *
 * Filosofía del presupuesto: techo de gasto disponible, NO objetivo de
 * ahorro. maxCost es siempre un límite duro; targetSpend es la cuota
 * orientativa de la toma (presupuesto diario × ratio calórico). Con
 * margen (modo allocation) se prioriza ajuste de macros + diversidad +
 * uso razonable de la cuota; con presupuesto ajustado (modo efficiency)
 * se mantiene proteína/€ como criterio principal.
 *
 * Cascada de selección para una toma (ver pickDish):
 *   1. Candidatos que cumplen tiempo/sabor del tier de relajación Y caben
 *      en el tope de esta toma → elegir según modo de presupuesto (ver
 *      scoreDishForSelection).
 *   2. Si ninguno cabe: buscar en TODA la categoría (ignorando tiempo y
 *      sabor, nunca el presupuesto) el mejor candidato que quepa (o el más
 *      barato si el presupuesto está ajustado).
 *   3. Si ni el más barato cabe a ración normal: reducir su ración
 *      ("simplificar el menú") hasta un mínimo razonable para intentar
 *      que quepa.
 *   4. Si ni así cabe: esta toma es irresoluble a este tope concreto.
 *      plan-generator.js decide si subir de tier (relajar tiempo/sabor,
 *      nunca presupuesto) o, en última instancia, reportarlo como
 *      inviable con el mínimo real necesario.
 *
 * El coste de un plato ya NO viene de un campo fabricado (dish.cost
 * repartido por cuota de masa). Viene de sumar precio×gramos de cada
 * ingrediente visible en la tienda activa, vía js/core/pricing.js — lo que
 * hace que cambiar de supermercado sea automático en cuanto exista su
 * catálogo, sin tocar este archivo.
 *
 * Depende de:
 *   js/data/dishes.js       (DISH_DB)
 *   js/core/utils.js        (round1, round2)
 *   js/core/meal-helpers.js (getMealTotals, spentMeal, estimateMealPrep,
 *                            mergeDuplicateFoods, addFood)
 *   js/core/pricing.js      (resolveIngredientPrice, priceDishAtStore,
 *                            proteinPerEuro, DEFAULT_STORE_ID)
 *
 * Expone (globales):
 *   RELAXATION_TIERS, MAX_RELAXATION_TIER, resolveTier(tier)
 *   MIN_PORTION_SCALE
 *   estimateScaledCost(dish, target, storeId)
 *   estimateMinMealCost(category, storeId, target)
 *   estimateAbsoluteMinMealCost(category, storeId)
 *   pickDish(category, data, usedState, tier, maxCost, target, storeId, targetSpend)
 *     → { dish, scaleFactor, simplified, reason, minPossibleCost }
 *   buildMealFromDish(dish, mealKey, mealLabel, target, storeId, forcedScaleFactor)
 *   buildPlaceholderDish(category)
 *   enforce25PercentRule(meals, totalKcal, capFraction)
 *   findCapViolations(meals, totalKcal, capFraction)
 * ─────────────────────────────────────────────────────────────────────────
 */

// ── Escalera de relajación de restricciones NO presupuestarias ─────────────

/**
 * El presupuesto YA NO está en esta escalera — nunca se relaja. Solo
 * tiempo, sabor y el tope del 25% por ítem se relajan, y solo cuando ni
 * siquiera la cascada de presupuesto (barato → más barato de la categoría
 * → ración reducida) encuentra nada para una toma bajo las restricciones
 * de tiempo/sabor del tier actual.
 */
var RELAXATION_TIERS = [
  { label: "exact",        respectTaste: true,  prepAdd: 0,        cap25: 0.25 }, // Tier 0
  { label: "relax-taste",  respectTaste: false, prepAdd: 0,        cap25: 0.25 }, // Tier 1
  { label: "relax-time",   respectTaste: false, prepAdd: 15,       cap25: 0.25 }, // Tier 2
  { label: "relax-more",   respectTaste: false, prepAdd: 30,       cap25: 0.30 }, // Tier 3
  { label: "relax-cap",    respectTaste: false, prepAdd: Infinity, cap25: 0.35 }  // Tier 4 (máxima relajación NO presupuestaria)
];

var MAX_RELAXATION_TIER = RELAXATION_TIERS.length - 1;

/**
 * Suelo absoluto de escalado de ración cuando se simplifica el menú por
 * presupuesto. Por debajo de esto la ración deja de ser nutricionalmente
 * razonable, así que se prefiere declarar la toma irresoluble antes que
 * servir un plato simbólico.
 */
var MIN_PORTION_SCALE = 0.35;

/**
 * Techo de escalado de ración al ajustar un plato al objetivo calórico de
 * la toma (buildMealFromDish, finalizePick, estimateScaledCost). Subido de
 * 1.35 a 1.5 junto con el 5º bloque (segundo snack) en MEAL_DEFS — juntos
 * amplían el techo calórico diario alcanzable para objetivos de volumen
 * altos, que antes quedaban estructuralmente muy por debajo del objetivo
 * (ver auditoría: gaps de 600-1400 kcal en perfiles de volumen).
 */
var MAX_PORTION_SCALE = 1.5;

/**
 * Por debajo de este ratio maxCost / referencia, el presupuesto de la toma
 * se considera ajustado y se prioriza eficiencia proteína/€ (comportamiento
 * heredado). Por encima, hay margen para usar la cuota orientativa.
 */
var BUDGET_SLACK_TIGHT_THRESHOLD = 1.35;

/**
 * Resuelve un índice de tier (posiblemente fuera de rango o indefinido)
 * al objeto de relajación correspondiente, siempre válido.
 * @param {number} tier
 * @returns {object} - entrada de RELAXATION_TIERS
 */
function resolveTier(tier) {
  var idx = (typeof tier === "number" && isFinite(tier)) ? tier : 0;
  idx = Math.max(0, Math.min(idx, MAX_RELAXATION_TIER));
  return RELAXATION_TIERS[idx];
}

// ── Filtro por tiempo/sabor (el presupuesto se trata aparte, más abajo) ────

/**
 * Devuelve platos de DISH_DB de una categoría que cumplen tiempo y sabor
 * bajo el nivel de relajación indicado. NO filtra por presupuesto — eso lo
 * hace pickDish() explícitamente, en varias fases.
 *
 * @param {string} category
 * @param {number} maxPrep  - minutos máximos de preparación (sin relajar)
 * @param {string} taste    - preferencia global "sweet"|"savory"|"mixed"
 * @param {object} relax    - entrada de RELAXATION_TIERS
 * @returns {object[]}
 */
function filterDishesByTimeTaste(category, maxPrep, taste, relax) {
  var effectivePrep = isFinite(relax.prepAdd) ? maxPrep + relax.prepAdd : Infinity;

  return DISH_DB.filter(function (dish) {
    if (dish.category !== category) return false;
    if (isFinite(effectivePrep) && dish.prep > effectivePrep) return false;
    if (relax.respectTaste) {
      if (taste === "sweet"  && dish.taste === "savory" && category === "desayuno") return false;
      if (taste === "savory" && dish.taste === "sweet"  && category === "cena")     return false;
    }
    return true;
  });
}

// ── Coste estimado a la escala que realmente se serviría ────────────────────

/**
 * Estima el coste de un plato a la escala con la que se serviría para
 * acercarse al objetivo calórico de la toma (misma lógica de escalado que
 * buildMealFromDish, para que la comprobación de presupuesto sea realista
 * y no solo mire el coste "de catálogo" del plato a ración base.
 *
 * @param {object} dish
 * @param {object} target   - { kcal, ... } objetivo de la toma
 * @param {string} storeId
 * @returns {{ cost:number, scaleFactor:number, nativeCost:number }}
 */
function estimateScaledCost(dish, target, storeId) {
  var priced = priceDishAtStore(dish, storeId);
  var rawScale = target.kcal / Math.max(dish.kcal, 1);
  var scaleFactor = Math.min(MAX_PORTION_SCALE, Math.max(0.70, rawScale));
  return { cost: round2(priced.cost * scaleFactor), scaleFactor: scaleFactor, nativeCost: priced.cost };
}

/**
 * Coste mínimo REALISTA de una categoría: el plato más barato, a ración
 * normal (0.70×–MAX_PORTION_SCALE, sin recurrir a la simplificación de emergencia).
 * Se usa para reservar presupuesto para las tomas siguientes del día
 * (lookahead), no como suelo absoluto de viabilidad.
 *
 * @param {string} category
 * @param {string} storeId
 * @param {object} target
 * @returns {number}
 */
function estimateMinMealCost(category, storeId, target) {
  var wholeCategory = DISH_DB.filter(function (d) { return d.category === category; });
  if (wholeCategory.length === 0) return 0;
  var costs = wholeCategory.map(function (d) { return estimateScaledCost(d, target, storeId).cost; });
  return Math.min.apply(null, costs);
}

/**
 * Coste mínimo ABSOLUTO de una categoría: el plato más barato, reducido
 * hasta MIN_PORTION_SCALE. Es el suelo real usado solo para el mensaje
 * final de inviabilidad — "ni siquiera así alcanza" — no para reservar
 * presupuesto durante la asignación normal (sería demasiado pesimista).
 *
 * @param {string} category
 * @param {string} storeId
 * @returns {number}
 */
function estimateAbsoluteMinMealCost(category, storeId) {
  var wholeCategory = DISH_DB.filter(function (d) { return d.category === category; });
  if (wholeCategory.length === 0) return 0;
  var costs = wholeCategory.map(function (d) {
    // Redondeo hacia ARRIBA a propósito (nunca hacia el más cercano): la
    // reserva que se calcula a partir de este valor nunca debe prometer
    // más margen del que en realidad existe, o el céntimo perdido por
    // redondeo se acumula y termina dejando sin presupuesto a una toma
    // posterior (visto y corregido durante las pruebas).
    return Math.ceil(priceDishAtStore(d, storeId).cost * MIN_PORTION_SCALE * 100) / 100;
  });
  return Math.min.apply(null, costs);
}

// ── Puntuación de diversidad (sin cambios respecto a la versión anterior) ──

/**
 * Calcula la puntuación de diversidad de un plato dado el estado de uso.
 * Solo actúa como desempate dentro de platos de eficiencia proteína/precio
 * similar — ver scoreDishForSelection().
 *
 * @param {object}   dish
 * @param {object}   usedState  - { usedNames[], usedProts[], usedTastes[] }
 * @returns {number}
 */
function diversityScore(dish, usedState) {
  let score = Math.random();                          // tiebreak aleatorio

  const protCount = usedState.usedProts.filter(function (p) {
    return p === dish.mainProt;
  }).length;

  if (protCount === 0)            score += 5;         // primera vez este mainProt
  else                            score -= protCount * 3; // penaliza repetición

  if (usedState.usedNames.indexOf(dish.name) === -1) score += 3;  // plato nuevo
  else                                               score -= 10; // ya aparece hoy

  const tasteCount = usedState.usedTastes.filter(function (t) {
    return t === dish.taste;
  }).length;
  if (tasteCount === 0) score += 1;                  // sabor no visto aún

  return score;
}

/**
 * Indica si el techo de la toma deja poco margen respecto a la cuota
 * orientativa o al coste mínimo viable del pool.
 *
 * @param {number} maxCost
 * @param {number} targetSpend  - cuota orientativa (€) de la toma
 * @param {number} minReferenceCost - coste mínimo de referencia del pool
 * @returns {boolean}
 */
function isBudgetTight(maxCost, targetSpend, minReferenceCost) {
  var reference = Math.max(minReferenceCost, targetSpend * 0.9, 0.01);
  return maxCost / reference < BUDGET_SLACK_TIGHT_THRESHOLD;
}

/**
 * Ajuste del plato escalado a los macros objetivo de la toma (0–100).
 * @param {object} dish
 * @param {object} target
 * @param {number} scaleFactor
 * @returns {number}
 */
function macroFitScore(dish, target, scaleFactor) {
  var kcal    = dish.kcal    * scaleFactor;
  var protein = dish.protein * scaleFactor;
  var kcalDev = Math.abs(kcal    - target.kcal)    / Math.max(target.kcal,    1);
  var protDev = Math.abs(protein - target.protein) / Math.max(target.protein, 0.01);
  return Math.max(0, 100 - kcalDev * 35 - protDev * 50);
}

/**
 * Premia usar la cuota orientativa cuando hay margen; penaliza elegir
 * opciones muy por debajo de lo asignable (ahorro involuntario).
 *
 * @param {number} estCost
 * @param {number} targetSpend
 * @param {number} maxCost
 * @returns {number}
 */
function allocationScore(estCost, targetSpend, maxCost) {
  var ideal = Math.min(targetSpend, maxCost);
  if (ideal <= 0.01) return 0;
  if (estCost >= ideal * 0.7 && estCost <= maxCost + 0.005) {
    return 5 + 5 * Math.min(1, estCost / ideal);
  }
  if (estCost < ideal * 0.7) {
    return 10 * (estCost / (ideal * 0.7));
  }
  return 0;
}

/**
 * Puntuación unificada para rankear candidatos DENTRO del techo maxCost.
 *
 * Modo efficiency (presupuesto ajustado): proteína/€ manda, diversidad
 * desempata — comportamiento anterior.
 *
 * Modo allocation (margen disponible): macros + uso de cuota + diversidad;
 * proteína/€ solo como desempate fino. Base para futura asignación por
 * lista de compra (cuota por toma antes de elegir ingredientes).
 *
 * @param {object} dish
 * @param {object} usedState
 * @param {{ target, maxCost, targetSpend, storeId, tight }} ctx
 * @returns {number}
 */
function scoreDishForSelection(dish, usedState, ctx) {
  var div = diversityScore(dish, usedState);
  var est = estimateScaledCost(dish, ctx.target, ctx.storeId);
  var ppeBucket = Math.round(proteinPerEuro(dish, ctx.storeId) / 2) * 2;

  if (ctx.tight) {
    return ppeBucket * 100 + div;
  }

  var macroFit   = macroFitScore(dish, ctx.target, est.scaleFactor);
  var allocation = allocationScore(est.cost, ctx.targetSpend, ctx.maxCost);
  return macroFit * 100 + allocation * 30 + div * 10 + ppeBucket;
}

/**
 * Ordena candidatos por scoreDishForSelection (mayor primero), conservando
 * la puntuación de cada uno — la necesita pickWeightedByScore() para saber
 * qué tan CERCA está cada candidato del mejor, no solo su posición.
 *
 * @param {object[]} dishes
 * @param {object} usedState
 * @param {object} ctx
 * @returns {{dish:object, score:number}[]}
 */
function rankDishesByBudgetMode(dishes, usedState, ctx) {
  return dishes
    .map(function (d) { return { dish: d, score: scoreDishForSelection(d, usedState, ctx) }; })
    .sort(function (a, b) { return b.score - a.score; });
}

/**
 * Cuántos de los mejores candidatos entran en la lotería de elección final
 * (tanto en pickWeightedByScore como en pickWeightedFromTop). Con 46
 * candidatos "affordable" típicos para comida/cena, un pool de 12 sigue
 * cubriendo solo platos dentro de un ~4-5% del score máximo (ver prueba
 * manual) — nada de fondo de la lista, solo variantes igual de válidas.
 */
var TOP_CANDIDATES_POOL = 12;

/**
 * Cuánto "reparte" la lotería entre candidatos de score parecido, como
 * fracción del score máximo del grupo. Con macroFit/ppeBucket pesando ×100,
 * varios platos a solo un 1-5% de diferencia relativa son, en la práctica,
 * igual de buenos — deberían tener probabilidades parecidas de salir, en
 * vez de que el primero gane siempre solo por estar en el puesto #1.
 * Subir este valor reparte más (más variedad, menos fiel al ranking);
 * bajarlo concentra más en el primer puesto. 0.15 daba ~30% de
 * repetición del top-1 con 12-13 platos distintos apareciendo en 200
 * generaciones de prueba (antes: ~90-100% del tiempo el mismo plato).
 */
var SELECTION_TEMPERATURE_RATIO = 0.15;

/**
 * Elige un plato entre los mejores de `ranked` (con score) mediante una
 * lotería ponderada por lo CERCA que está cada score del máximo (softmax),
 * no por su posición fija en el ranking.
 *
 * Por qué: con pesos fijos por posición (ej. 3/2/1), el candidato #1 se
 * llevaba siempre la misma probabilidad aunque estuviera empatado por
 * debajo del 1% con el #2 y el #3 — que es justo lo que pasaba con
 * "comida": el mejor plato quedaba a menos de un 1% del segundo, pero aun
 * así ganaba la lotería la mitad de las veces, sintiéndose repetitivo. Al
 * ponderar por la distancia real de score (relativa a la magnitud del
 * mejor), candidatos casi empatados obtienen probabilidades casi iguales,
 * y solo un candidato CLARAMENTE mejor domina la lotería.
 *
 * @param {{dish:object, score:number}[]} ranked - ya ordenado, mejor primero
 * @returns {object} - el dish elegido
 */
function pickWeightedByScore(ranked) {
  var poolSize = Math.min(TOP_CANDIDATES_POOL, ranked.length);
  if (poolSize <= 1) return ranked[0].dish;

  var top = ranked.slice(0, poolSize);
  var maxScore = top[0].score;
  var temperature = Math.max(Math.abs(maxScore) * SELECTION_TEMPERATURE_RATIO, 0.01);

  var weights = top.map(function (entry) {
    return Math.exp((entry.score - maxScore) / temperature); // 1 para el mejor, <1 para el resto
  });
  var totalWeight = weights.reduce(function (a, b) { return a + b; }, 0);

  var r = Math.random() * totalWeight;
  for (var i = 0; i < top.length; i++) {
    r -= weights[i];
    if (r <= 0) return top[i].dish;
  }
  return top[0].dish;
}

/**
 * Variante de la lotería ponderada para cuando solo se tiene un array de
 * platos ya ordenados por prioridad (sin score numérico) — ej. el fallback
 * de fase 2 en modo "tight", ordenado por coste nativo ascendente. Usa peso
 * lineal decreciente por posición en vez de distancia real de score.
 *
 * @param {object[]} ranked - candidatos ya ordenados, mejor/más prioritario primero
 * @returns {object}
 */
function pickWeightedFromTop(ranked) {
  var poolSize = Math.min(TOP_CANDIDATES_POOL, ranked.length);
  if (poolSize <= 1) return ranked[0];

  var totalWeight = 0;
  var weights = [];
  for (var i = 0; i < poolSize; i++) {
    var w = poolSize - i; // más peso a los mejor puntuados
    weights.push(w);
    totalWeight += w;
  }

  var r = Math.random() * totalWeight;
  for (var j = 0; j < poolSize; j++) {
    r -= weights[j];
    if (r <= 0) return ranked[j];
  }
  return ranked[0];
}

// ── Selección principal (cascada de presupuesto) ────────────────────────────

/**
 * Elige el mejor plato para una toma respetando el presupuesto de forma
 * ESTRICTA — nunca lo supera intencionadamente. Ver cascada descrita en
 * la cabecera del archivo. Actualiza usedState in-place solo cuando
 * efectivamente elige un plato.
 *
 * @param {string} category
 * @param {object} data        - { cookTime, taste }
 * @param {object} usedState   - { usedNames[], usedProts[], usedTastes[] }
 * @param {number} tier        - índice en RELAXATION_TIERS
 * @param {number} maxCost     - tope DURO en € para esta toma (calculado
 *                                dinámicamente por plan-generator.js con
 *                                reserva para las tomas siguientes)
 * @param {object} target      - { kcal, protein, carbs, fat } objetivo
 * @param {string} storeId
 * @param {number} [targetSpend] - cuota orientativa de la toma (presupuesto
 *                                diario × ratio calórico); por defecto maxCost
 * @returns {{
 *   dish: object|null,
 *   scaleFactor: number,
 *   simplified: boolean,
 *   reason: null|"no_dishes_in_category"|"budget_infeasible",
 *   minPossibleCost: number|null
 * }}
 */
function pickDish(category, data, usedState, tier, maxCost, target, storeId, targetSpend) {
  var relax = resolveTier(tier);
  var pool = filterDishesByTimeTaste(category, data.cookTime, data.taste, relax);
  var spendTarget = (typeof targetSpend === "number" && isFinite(targetSpend) && targetSpend > 0)
    ? targetSpend
    : maxCost;

  // Fase 1: candidatos que ya cumplen tiempo/sabor del tier Y caben en maxCost
  var affordable = pool.filter(function (dish) {
    return estimateScaledCost(dish, target, storeId).cost <= maxCost + 0.005;
  });

  if (affordable.length > 0) {
    var minPoolCost = Math.min.apply(null, affordable.map(function (d) {
      return estimateScaledCost(d, target, storeId).cost;
    }));
    var scoreCtx = {
      target: target,
      maxCost: maxCost,
      targetSpend: spendTarget,
      storeId: storeId,
      tight: isBudgetTight(maxCost, spendTarget, minPoolCost)
    };
    var ranked = rankDishesByBudgetMode(affordable, usedState, scoreCtx);
    return finalizePick(pickWeightedByScore(ranked), target, storeId, usedState, false, null);
  }

  // Fase 2: nada en el pool filtrado cabe → buscar en TODA la categoría
  // (ignora tiempo/sabor, nunca el presupuesto)
  var wholeCategory = DISH_DB.filter(function (d) { return d.category === category; });
  if (wholeCategory.length === 0) {
    return { dish: null, scaleFactor: 1, simplified: false, reason: "no_dishes_in_category", minPossibleCost: null };
  }

  var priced = wholeCategory
    .map(function (d) { return { dish: d, nativeCost: priceDishAtStore(d, storeId).cost, est: estimateScaledCost(d, target, storeId) }; })
    .sort(function (a, b) { return a.nativeCost - b.nativeCost; }); // coste nativo — base para fases 3–4

  var fitting = priced.filter(function (p) { return p.est.cost <= maxCost + 0.005; });
  if (fitting.length > 0) {
    var minFitCost = fitting[0].est.cost;
    var fallbackCtx = {
      target: target,
      maxCost: maxCost,
      targetSpend: spendTarget,
      storeId: storeId,
      tight: isBudgetTight(maxCost, spendTarget, minFitCost)
    };
    var fittingDishes = fitting.map(function (p) { return p.dish; }); // ya viene ordenado por coste nativo asc.
    var chosenDish = fallbackCtx.tight
      ? pickWeightedFromTop(fittingDishes)
      : pickWeightedByScore(rankDishesByBudgetMode(fittingDishes, usedState, fallbackCtx));
    return finalizePick(chosenDish, target, storeId, usedState, false, null);
  }

  var cheapest = priced[0];

  // Fase 3: ni el más barato cabe a ración normal → reducir la ración
  // (simplificar el menú) hasta MIN_PORTION_SCALE para intentar que quepa
  var shrunk = shrinkToFitBudget(cheapest.dish, storeId, maxCost);
  if (shrunk !== null) {
    return finalizePick(cheapest.dish, target, storeId, usedState, true, shrunk);
  }

  // Fase 4: ni reduciendo al mínimo razonable cabe → irresoluble a este tope
  return {
    dish: null, scaleFactor: 1, simplified: false,
    reason: "budget_infeasible",
    minPossibleCost: round2(cheapest.dish ? priceDishAtStore(cheapest.dish, storeId).cost * MIN_PORTION_SCALE : 0)
  };
}

/**
 * Calcula el factor de escala necesario para que un plato quepa en
 * maxCost, sin bajar de MIN_PORTION_SCALE. Nunca sube del máximo habitual
 * (MAX_PORTION_SCALE) — solo se usa para ENCOGER.
 *
 * @param {object} dish
 * @param {string} storeId
 * @param {number} maxCost
 * @returns {number|null} - factor de escala, o null si ni al mínimo cabe
 */
function shrinkToFitBudget(dish, storeId, maxCost) {
  var priced = priceDishAtStore(dish, storeId);
  if (priced.cost <= 0.0001) return Math.max(MIN_PORTION_SCALE, 0.70); // prácticamente gratis, no hace falta encoger
  var neededScale = maxCost / priced.cost;
  var scaleFactor = Math.min(MAX_PORTION_SCALE, neededScale);
  if (scaleFactor < MIN_PORTION_SCALE - 1e-6) return null; // solo tolerancia de coma flotante — el redondeo hacia arriba de estimateAbsoluteMinMealCost ya garantiza que esto no debería activarse por un problema de reserva
  scaleFactor = Math.max(scaleFactor, MIN_PORTION_SCALE);
  return round2(scaleFactor);
}

/**
 * Registra el plato elegido en usedState (diversidad) y devuelve el
 * resultado en la forma que espera plan-generator.js.
 *
 * @param {object} dish
 * @param {object} target
 * @param {string} storeId
 * @param {object} usedState
 * @param {boolean} simplified
 * @param {number|null} forcedScaleFactor - si viene de shrinkToFitBudget
 * @returns {object}
 */
function finalizePick(dish, target, storeId, usedState, simplified, forcedScaleFactor) {
  usedState.usedNames.push(dish.name);
  usedState.usedProts.push(dish.mainProt);
  usedState.usedTastes.push(dish.taste);

  var scaleFactor = (typeof forcedScaleFactor === "number")
    ? forcedScaleFactor
    : Math.min(MAX_PORTION_SCALE, Math.max(0.70, target.kcal / Math.max(dish.kcal, 1)));

  return { dish: dish, scaleFactor: scaleFactor, simplified: !!simplified, reason: null, minPossibleCost: null };
}

// ── Plato de última instancia (error de datos, no de presupuesto) ─────────

/**
 * Construye un plato vacío y seguro para una categoría sin ningún dato
 * disponible en DISH_DB. Esto es un problema de datos/configuración, no de
 * restricciones del usuario, y nunca debería ocurrir con el dataset actual
 * (204 platos, todas las categorías cubiertas) — pero garantiza que el
 * generador jamás falle si eso cambiara.
 *
 * @param {string} category
 * @returns {object}
 */
function buildPlaceholderDish(category) {
  return {
    name:     "Opción no disponible",
    category: category,
    kcal: 0, protein: 0, carbs: 0, fat: 0,
    cost: 0, prep: 0,
    mainProt: "none",
    taste:    "mixed",
    items:    []
  };
}

// ── Construcción del meal ─────────────────────────────────────────────────

/**
 * Convierte un plato de DISH_DB en un objeto meal listo para renderizar.
 * El coste de cada ingrediente viene AHORA de precio×gramos en la tienda
 * activa (js/core/pricing.js), no de repartir el dish.cost fabricado por
 * cuota de masa — así el coste total del meal es una suma real de
 * ingredientes tasados, coherente con cualquier supermercado.
 *
 * @param {object} dish
 * @param {string} mealKey
 * @param {string} mealLabel
 * @param {object} target             - { kcal, protein, carbs, fat }
 * @param {string} [storeId]          - por defecto DEFAULT_STORE_ID
 * @param {number} [forcedScaleFactor] - si viene de la cascada de presupuesto
 *                                       (fase de simplificación); si no se
 *                                       da, se calcula del objetivo calórico
 *                                       como antes
 * @returns {object} - meal con items, total, spent, prep
 */
function buildMealFromDish(dish, mealKey, mealLabel, target, storeId, forcedScaleFactor) {
  var rawScale = target.kcal / Math.max(dish.kcal, 1);
  var scaleFactor = (typeof forcedScaleFactor === "number")
    ? forcedScaleFactor
    : Math.min(MAX_PORTION_SCALE, Math.max(0.70, rawScale));

  var meal = {
    key:   mealKey,
    label: mealLabel + " — " + dish.name,
    items: []
  };

  dish.items.forEach(function (ingredient) {
    var priceInfo = resolveIngredientPrice(ingredient.name, storeId);
    var grams = ingredient.g * scaleFactor;
    meal.items.push({
      name:    ingredient.name,
      grams:   Math.round(grams),
      kcal:    round1(dish.kcal    * scaleFactor * (ingredient.g / totalItemGrams(dish))),
      protein: round1(dish.protein * scaleFactor * (ingredient.g / totalItemGrams(dish))),
      carbs:   round1(dish.carbs   * scaleFactor * (ingredient.g / totalItemGrams(dish))),
      fat:     round1(dish.fat     * scaleFactor * (ingredient.g / totalItemGrams(dish))),
      cost:    round2(priceInfo.pricePer100g * grams / 100),
      prep:    dish.prep,
      ready:   false,
      taste:   dish.taste,
      priceSource: priceInfo.source // 'catalog' | 'category' | 'default' — trazabilidad de confianza
    });
  });

  meal.total = getMealTotals(meal);
  meal.spent = round2(spentMeal(meal));
  meal.prep  = dish.prep;
  meal.store = storeId || DEFAULT_STORE_ID;
  return meal;
}

/**
 * Suma los gramos totales de los ingredientes de un plato.
 * @param {object} dish
 * @returns {number}
 */
function totalItemGrams(dish) {
  return dish.items.reduce(function (sum, ing) { return sum + ing.g; }, 0) || 1;
}

// ── Regla del 25% ────────────────────────────────────────────────────────

/**
 * Garantiza que ningún ítem individual supere capFraction (25% por
 * defecto) de las kcal diarias. Si lo supera, reduce ese ítem
 * proporcionalmente.
 *
 * @param {object[]} meals
 * @param {number}   totalKcal
 * @param {number}   [capFraction]
 */
function enforce25PercentRule(meals, totalKcal, capFraction) {
  const cap = totalKcal * (typeof capFraction === "number" ? capFraction : 0.25);
  meals.forEach(function (meal) {
    meal.items.forEach(function (item) {
      if (item.kcal > cap) {
        const f     = cap / item.kcal;
        item.grams   = round1(item.grams   * f);
        item.kcal    = round1(item.kcal    * f);
        item.protein = round1(item.protein * f);
        item.carbs   = round1(item.carbs   * f);
        item.fat     = round1(item.fat     * f);
        item.cost    = round2(item.cost    * f);
      }
    });
    meal.total = getMealTotals(meal);
    meal.spent = round2(spentMeal(meal));
  });
}

/**
 * Verificación PURA (no muta nada) de la regla del 25%.
 *
 * @param {object[]} meals
 * @param {number}   totalKcal
 * @param {number}   [capFraction]
 * @returns {object[]}
 */
function findCapViolations(meals, totalKcal, capFraction) {
  const cap = totalKcal * (typeof capFraction === "number" ? capFraction : 0.25);
  const violations = [];
  meals.forEach(function (meal) {
    meal.items.forEach(function (item) {
      if (item.kcal > cap + 0.5) {
        violations.push({ meal: meal.key, item: item.name, kcal: item.kcal, capKcal: round1(cap) });
      }
    });
  });
  return violations;
}