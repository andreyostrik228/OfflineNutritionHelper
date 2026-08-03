/**
 * js/engine/plan-generator.js
 * ─────────────────────────────────────────────────────────────────────────
 * Orquestador principal del plan nutricional diario.
 *
 * Responsabilidades:
 *  - Definir las 5 tomas del día (desayuno, comida, cena, snack, snack 2)
 *  - Sanear los datos de entrada (perfil calculado + preferencias + tienda)
 *  - Repartir el presupuesto diario de forma DINÁMICA entre tomas: nada de
 *    porcentajes fijos aislados por toma. Cada toma puede gastar hasta lo
 *    que quede del día, reservando siempre lo mínimo realista para las
 *    tomas que faltan (lookahead), para que una toma barata deje margen a
 *    las siguientes y una toma cara no las deje sin presupuesto.
 *  - El presupuesto es una restricción DURA desde el primer plato elegido,
 *    nunca algo que se relaja automáticamente ni se comprueba solo al final
 *  - Intentar generar el plan en niveles de relajación crecientes de
 *    tiempo/sabor/tope-25% (RELAXATION_TIERS, en dish-selector.js) — el
 *    presupuesto NO forma parte de esa escalera
 *  - Recortar el plan (nunca subir el presupuesto) si el rebalanceo de
 *    proteína/calorías lo empuja por encima del presupuesto
 *  - Puntuar cada plan candidato y quedarse con el mejor
 *  - Construir un informe transparente: qué se relajó, qué se simplificó,
 *    y — solo si de verdad no hay solución — el mínimo real que haría
 *    falta, no un aviso genérico
 *  - GARANTIZAR que generateDietPlan() nunca lance una excepción ni deje de
 *    devolver un plan
 *
 * Depende de:
 *   js/data/dishes.js          (DISH_DB, referenciada indirectamente)
 *   js/core/utils.js           (round1, round2)
 *   js/core/meal-helpers.js    (getMealTotals, sumMeals, spentMeal,
 *                               estimateMealPrep, mergeDuplicateFoods,
 *                               removeLeastUsefulItem)
 *   js/core/pricing.js         (priceDishAtStore, DEFAULT_STORE_ID,
 *                               PRICE_CATALOGS)
 *   js/engine/dish-selector.js (RELAXATION_TIERS, MAX_RELAXATION_TIER,
 *                               MIN_PORTION_SCALE, pickDish,
 *                               buildMealFromDish, buildPlaceholderDish,
 *                               enforce25PercentRule, findCapViolations,
 *                               estimateMinMealCost, estimateAbsoluteMinMealCost)
 *
 * Expone (global):
 *   generateDietPlan(profile, data) → { meals, total, report }
 *     report.status es siempre uno de: 'perfect' | 'adjusted' | 'minimal'
 *     (o 'unavailable' únicamente ante un error técnico inesperado)
 * ─────────────────────────────────────────────────────────────────────────
 */

// ── Definición de las tomas del día ──────────────────────────────────────

/**
 * Ratio de calorías por toma (el de presupuesto ya NO es fijo — ver
 * allocateMealBudget más abajo). breakfast 24% / comida 30% / cena 23% /
 * snack 12% / snack2 11%.
 *
 * Se añadió un segundo snack (antes eran 4 tomas) para levantar el techo
 * calórico diario alcanzable: con 4 tomas y MAX_PORTION_SCALE, objetivos
 * de volumen altos (3100-3700 kcal) quedaban estructuralmente 600-1400
 * kcal por debajo del objetivo — no había suficiente "espacio" en el día
 * para llegar, sin importar qué tan bien se escalaran los platos. Un
 * quinto bloque reutiliza la misma categoría "snack" (42 platos en
 * DISH_DB, de sobra para dos bloques sin repetición) en vez de inventar
 * una categoría nueva.
 */
var MEAL_DEFS = [
  { key: "breakfast", label: "Desayuno", category: "desayuno", ratio: 0.24 },
  { key: "lunch",     label: "Comida",   category: "comida",   ratio: 0.30 },
  { key: "dinner",    label: "Cena",     category: "cena",     ratio: 0.23 },
  { key: "snack",     label: "Snack 1",  category: "snack",    ratio: 0.12 },
  { key: "snack2",    label: "Snack 2",  category: "snack",    ratio: 0.11 }
];

/**
 * Tolerancia usada únicamente para el rebalanceo interno (convergencia de
 * rebalancePlan). No decide qué nivel de relajación usar — eso lo decide
 * verifyPlanFeasibility() contra las cifras ORIGINALES del usuario.
 */
var MACRO_TOLERANCE_TIERS = [
  { kcalPct: 0.10, proteinG: 10, carbsG: 15 },
  { kcalPct: 0.15, proteinG: 18, carbsG: 30 },
  { kcalPct: 0.25, proteinG: 25, carbsG: 40 }
];

var HEADLINES = {
  perfect:  "Plan generado exactamente según tus preferencias.",
  adjusted: "Plan generado ajustando algunas preferencias para poder completarlo.",
  minimal:  "No fue posible respetar tus preferencias con los datos actuales; este es el mejor plan disponible."
};

// ── Saneamiento de entrada (restricción absoluta) ─────────────────────────

function isFiniteNum(n) {
  return typeof n === "number" && isFinite(n);
}

/**
 * Sanea perfil y datos de entrada. Incluye la tienda activa: si no se
 * especifica o no existe su catálogo, cae en DEFAULT_STORE_ID (Mercadona).
 *
 * @param {object} profile
 * @param {object} data
 * @returns {{ profile: object, data: object }}
 */
function sanitizeInputs(profile, data) {
  var safeProfile = {
    calories: isFiniteNum(profile && profile.calories) && profile.calories > 0 ? profile.calories : 2000,
    protein:  isFiniteNum(profile && profile.protein)  && profile.protein  > 0 ? profile.protein  : 120,
    carbs:    isFiniteNum(profile && profile.carbs)    && profile.carbs   >= 0 ? profile.carbs    : 220,
    fats:     isFiniteNum(profile && profile.fats)     && profile.fats   >= 0 ? profile.fats      : 65
  };

  var safeTaste = (data && (data.taste === "sweet" || data.taste === "savory" || data.taste === "mixed"))
    ? data.taste
    : "mixed";

  var safeStore = (data && typeof data.store === "string" && PRICE_CATALOGS[data.store])
    ? data.store
    : DEFAULT_STORE_ID;

  var safeOverrides = {
    budget:   isFiniteNum(data && data.budget)   && data.budget   > 0 ? data.budget   : 15,
    cookTime: isFiniteNum(data && data.cookTime) && data.cookTime > 0 ? data.cookTime : 30,
    taste:    safeTaste,
    store:    safeStore
  };

  var safeData = Object.assign({}, data, safeOverrides);

  return { profile: safeProfile, data: safeData };
}

// ── Punto de entrada público ──────────────────────────────────────────────

/**
 * Genera el plan nutricional completo del día. Nunca lanza una excepción.
 *
 * @param {object} profile
 * @param {object} data
 * @returns {{ meals: object[], total: object, report: object }}
 */
function generateDietPlan(profile, data) {
  try {
    return generateDietPlanTiered(profile, data);
  } catch (err) {
    return {
      meals: MEAL_DEFS.map(function (def) {
        return {
          key: def.key, label: def.label, items: [],
          total: { kcal: 0, protein: 0, carbs: 0, fat: 0 },
          spent: 0, prep: 0
        };
      }),
      total: { kcal: 0, protein: 0, carbs: 0, fat: 0, cost: 0 },
      report: {
        status: "unavailable",
        headline: "No se pudo generar el plan por un error técnico.",
        tierUsed: null,
        store: null,
        relaxations: [],
        violations: [{ type: "system_error", detail: String(err && err.message || err) }],
        macroDelta: { kcal: 0, protein: 0, carbs: 0, fat: 0 },
        budgetDelta: 0,
        minPossibleDayCost: null
      }
    };
  }
}

// ── Búsqueda en niveles de relajación (tiempo/sabor/tope-25%, NO presupuesto) ─

/**
 * Intenta generar un plan completo en niveles de relajación crecientes de
 * tiempo/sabor/tope-25%. El presupuesto se aplica igual de estricto en
 * TODOS los niveles — lo único que cambia entre niveles es cuánta
 * flexibilidad de tiempo/sabor tiene la cascada de presupuesto para
 * encontrar un plato que quepa.
 *
 * @param {object} profile
 * @param {object} data
 * @returns {{ meals, total, report }}
 */
function generateDietPlanTiered(profile, data) {
  var sanitized = sanitizeInputs(profile, data);
  profile = sanitized.profile;
  data    = sanitized.data;

  // Suelo real de viabilidad: el plato más barato de cada categoría,
  // reducido al mínimo razonable. Si el presupuesto del usuario está por
  // debajo de esto, es MATEMÁTICAMENTE imposible con este catálogo — se
  // sigue intentando igualmente (para dar el mejor plan posible), pero el
  // informe final podrá citar esta cifra en vez de un aviso vago.
  var minPossibleDayCost = round2(MEAL_DEFS.reduce(function (sum, def) {
    return sum + estimateAbsoluteMinMealCost(def.category, data.store);
  }, 0));

  var bestAttempt = null;
  var bestScore   = -Infinity;

  for (var tier = 0; tier <= MAX_RELAXATION_TIER; tier++) {
    var attempt = attemptPlanAtTier(profile, data, tier);
    var score   = scorePlan(attempt, profile, data);

    if (score > bestScore) {
      bestScore   = score;
      bestAttempt = attempt;
    }

    if (attempt.violations.length === 0) {
      break; // ya respeta todo lo pedido; relajar más solo podría empeorarlo
    }
  }

  var report = buildCompromiseReport(bestAttempt, profile, data, minPossibleDayCost);
  return { meals: bestAttempt.meals, total: bestAttempt.total, report: report };
}

/**
 * Construye y evalúa un plan candidato completo para un nivel de
 * relajación de tiempo/sabor/tope-25% dado, con asignación de presupuesto
 * DINÁMICA entre tomas (ver allocateMealCap).
 *
 * @param {object} profile
 * @param {object} data
 * @param {number} tier
 * @returns {{ meals, total, violations, tier, simplifiedCategories }}
 */
function attemptPlanAtTier(profile, data, tier) {
  var usedState = { usedNames: [], usedProts: [], usedTastes: [] };
  var placeholderInfo = [];
  var simplifiedCategories = [];
  var store = data.store;

  // Coste mínimo ABSOLUTO (ración reducida al mínimo, MIN_PORTION_SCALE)
  // de cada categoría — usado para reservar presupuesto a las tomas
  // siguientes mientras se recorre el día.
  //
  // Por qué el mínimo ABSOLUTO y no el "normal": si se reservara con el
  // coste a ración normal, una toma que se procesa antes (desayuno) podría
  // quedarse sin margen aunque el día entero SÍ fuera viable, porque la
  // reserva asumiría que las tomas siguientes nunca se simplifican. Usando
  // el mínimo absoluto, se cumple por inducción que si
  // `data.budget >= minPossibleDayCost` (suma de mínimos absolutos de las
  // 4 tomas), entonces CADA toma recibe un mealCap >= su propio mínimo
  // absoluto — así el mensaje de inviabilidad y el comportamiento real de
  // la cascada nunca se contradicen entre sí.
  var minCostByCategory = {};
  MEAL_DEFS.forEach(function (def) {
    minCostByCategory[def.category] = estimateAbsoluteMinMealCost(def.category, store);
  });

  var remainingBudget = data.budget;

  var meals = MEAL_DEFS.map(function (def, index) {
    var target = {
      kcal:    profile.calories * def.ratio,
      protein: profile.protein  * def.ratio,
      carbs:   profile.carbs    * def.ratio,
      fat:     profile.fats     * def.ratio
    };

    var reserveForRest = MEAL_DEFS.slice(index + 1).reduce(function (sum, d) {
      return sum + minCostByCategory[d.category];
    }, 0);
    var mealCap = Math.max(0, round2(remainingBudget - reserveForRest));
    var targetSpend = round2(data.budget * def.ratio);

    var pick = pickDish(def.category, data, usedState, tier, mealCap, target, store, targetSpend);

    var dish, scaleFactor;
    if (pick.dish) {
      dish = pick.dish;
      scaleFactor = pick.scaleFactor;
      if (pick.simplified) simplifiedCategories.push(def.category);
    } else {
      dish = buildPlaceholderDish(def.category);
      scaleFactor = 1;
      placeholderInfo.push({ category: def.category, reason: pick.reason, minPossibleCost: pick.minPossibleCost, mealCap: mealCap });
    }

    var meal = buildMealFromDish(dish, def.key, def.label, target, store, scaleFactor);
    remainingBudget = round2(remainingBudget - meal.spent);
    return meal;
  });

  var roughTotal = sumMeals(meals);
  var tierDef    = RELAXATION_TIERS[tier];

  enforce25PercentRule(meals, roughTotal.kcal || profile.calories, tierDef.cap25);

  var total = rebalancePlan(meals, profile);

  // El rebalanceo puede reintroducir una violación del tope del 25% Y
  // puede hacer crecer el coste por encima del presupuesto (aumenta
  // ítems para cubrir proteína/calorías sin mirar el precio). Las dos
  // cosas se corrigen AQUÍ, después del rebalanceo, nunca subiendo el
  // presupuesto — solo recortando.
  enforce25PercentRule(meals, total.kcal || profile.calories, tierDef.cap25);
  var budgetResult = enforceBudgetCap(meals, data.budget);
  total = budgetResult.total;

  var violations = verifyPlanFeasibility(meals, total, profile, data);

  placeholderInfo.forEach(function (p) {
    if (p.reason === "no_dishes_in_category") {
      violations.push({ type: "data_unavailable", category: p.category });
    } else {
      violations.push({ type: "budget_infeasible", category: p.category, mealCap: p.mealCap, minPossibleCost: p.minPossibleCost });
    }
  });
  simplifiedCategories.forEach(function (category) {
    violations.push({ type: "menu_simplified", category: category });
  });

  return {
    meals: meals, total: total, violations: violations, tier: tier,
    simplifiedCategories: simplifiedCategories, budgetTrims: budgetResult.trims
  };
}

/**
 * Si el rebalanceo ha dejado el plan por encima del presupuesto, recorta
 * iterativamente el ítem con PEOR relación proteína/precio de todo el
 * plan (reduce su ración al 75%, o lo elimina si ya es pequeño) hasta
 * volver a estar dentro de presupuesto. Nunca sube el presupuesto: solo
 * reduce el plan. Converge siempre (en el peor caso, el plan queda vacío
 * y cuesta 0).
 *
 * @param {object[]} meals
 * @param {number}   budget
 * @returns {{ total: object, trims: number }}
 */
function enforceBudgetCap(meals, budget) {
  var total = sumMeals(meals);
  var trims = 0;

  while (total.cost > budget + 0.01 && trims < 30) {
    var worstItem = null, worstMeal = null, worstRatio = Infinity;

    meals.forEach(function (meal) {
      meal.items.forEach(function (item) {
        if (item.grams <= 0 || item.cost <= 0) return;
        var ratio = item.protein / item.cost; // g de proteína por € — coherente con el criterio de selección
        if (ratio < worstRatio) { worstRatio = ratio; worstItem = item; worstMeal = meal; }
      });
    });

    if (!worstItem) break; // no queda nada razonable que recortar

    if (worstItem.grams > 25) {
      var f = 0.75;
      worstItem.grams   = round1(worstItem.grams   * f);
      worstItem.kcal    = round1(worstItem.kcal    * f);
      worstItem.protein = round1(worstItem.protein * f);
      worstItem.carbs   = round1(worstItem.carbs   * f);
      worstItem.fat     = round1(worstItem.fat     * f);
      worstItem.cost    = round2(worstItem.cost    * f);
    } else {
      worstMeal.items.splice(worstMeal.items.indexOf(worstItem), 1);
    }

    worstMeal.total = getMealTotals(worstMeal);
    worstMeal.spent = round2(spentMeal(worstMeal));
    trims++;
    total = sumMeals(meals);
  }

  return { total: total, trims: trims };
}

/**
 * Compara el plan YA CONSTRUIDO contra las cifras ORIGINALES del usuario.
 * El presupuesto ahora debería cumplirse casi siempre gracias a
 * enforceBudgetCap; esta comprobación queda como red de seguridad, no
 * como mecanismo principal de control.
 *
 * @param {object[]} meals
 * @param {object}   total
 * @param {object}   profile
 * @param {object}   data
 * @returns {object[]}
 */
function verifyPlanFeasibility(meals, total, profile, data) {
  var violations = [];

  if (total.cost > data.budget + 0.01) {
    violations.push({ type: "budget", exceededBy: round2(total.cost - data.budget) });
  }

  meals.forEach(function (meal) {
    if (meal.prep > data.cookTime) {
      violations.push({ type: "time", meal: meal.key, exceededBy: meal.prep - data.cookTime });
    }
  });

  findCapViolations(meals, total.kcal, 0.25).forEach(function (v) {
    violations.push({ type: "cap25", meal: v.meal, item: v.item });
  });

  var kcalDeltaPct = Math.abs(total.kcal - profile.calories) / Math.max(profile.calories, 1);
  if (kcalDeltaPct > 0.15) {
    violations.push({ type: "calories", deltaPct: round1(kcalDeltaPct * 100) });
  }

  var proteinDelta = profile.protein - total.protein;
  if (proteinDelta > 0.15 * profile.protein) {
    violations.push({ type: "protein", deltaG: round1(proteinDelta) });
  }

  return violations;
}

/**
 * Función objetivo para comparar planes candidatos entre niveles de
 * relajación. Más alto es mejor. Un hueco de presupuesto genuinamente
 * irresoluble penaliza mucho más que una simplificación de ración, que a
 * su vez penaliza más que un simple desvío de tiempo/sabor.
 *
 * @param {object} attempt
 * @param {object} profile
 * @param {object} data
 * @returns {number}
 */
function scorePlan(attempt, profile, data) {
  var total = attempt.total;

  var budgetOverrun = Math.max(0, (total.cost - data.budget) / Math.max(data.budget, 0.01));
  var timePenalty = attempt.meals.reduce(function (sum, m) {
    return sum + Math.max(0, m.prep - data.cookTime);
  }, 0) / 100;
  var kcalDev    = Math.abs(total.kcal    - profile.calories) / Math.max(profile.calories, 1);
  var proteinDev = Math.abs(total.protein - profile.protein)  / Math.max(profile.protein, 1);
  var capViolations = findCapViolations(attempt.meals, total.kcal, 0.25).length;
  var dataGaps = attempt.violations.filter(function (v) { return v.type === "data_unavailable"; }).length;
  var budgetInfeasible = attempt.violations.filter(function (v) { return v.type === "budget_infeasible"; }).length;
  var simplified = attempt.simplifiedCategories ? attempt.simplifiedCategories.length : 0;

  return 100
    - (budgetOverrun     * 40)
    - (timePenalty       * 20)
    - (kcalDev           * 60)
    - (proteinDev        * 40)
    - (capViolations     * 15)
    - (dataGaps          * 100)
    - (budgetInfeasible  * 80)
    - (simplified        * 10);
}

/**
 * Construye el informe transparente que consumirá la UI.
 *
 * @param {object} attempt
 * @param {object} profile
 * @param {object} data
 * @param {number} minPossibleDayCost - suelo real de viabilidad del día
 * @returns {object}
 */
function buildCompromiseReport(attempt, profile, data, minPossibleDayCost) {
  var tierDef = RELAXATION_TIERS[attempt.tier];
  var relaxations = [];

  if (!tierDef.respectTaste) {
    relaxations.push({ constraint: "taste", note: "Se incluyeron platos fuera de tu preferencia de sabor." });
  }
  if (tierDef.prepAdd > 0) {
    relaxations.push({
      constraint: "time",
      note: isFinite(tierDef.prepAdd)
        ? "Se permitió hasta " + tierDef.prepAdd + " min más de preparación de lo solicitado."
        : "Se ignoró el límite de tiempo de preparación."
    });
  }
  if (tierDef.cap25 > 0.25) {
    relaxations.push({
      constraint: "cap25",
      note: "Se permitió que un ítem supere el 25% de las kcal diarias (hasta " + Math.round(tierDef.cap25 * 100) + "%)."
    });
  }
  // El presupuesto NUNCA aparece aquí como "relajación permitida": no se
  // relaja jamás. Lo que sí puede aparecer es la simplificación de ración
  // (menu_simplified) y la inviabilidad real (budget_infeasible), ambas
  // ya presentes en attempt.violations.

  var status;
  var hasBudgetInfeasible = attempt.violations.some(function (v) { return v.type === "budget_infeasible"; });
  if (attempt.tier === 0 && attempt.violations.length === 0) {
    status = "perfect";
  } else if (attempt.tier >= MAX_RELAXATION_TIER || hasBudgetInfeasible) {
    status = "minimal";
  } else {
    status = "adjusted";
  }

  var headline = HEADLINES[status];
  if (hasBudgetInfeasible) {
    var shortfall = round2(Math.max(0, minPossibleDayCost - data.budget));
    headline = shortfall > 0
      ? "Con " + data.budget + " \u20ac no ha sido posible montar un plan completo ni con las opciones más baratas de " +
        (PRICE_CATALOGS[data.store] ? PRICE_CATALOGS[data.store].storeName : data.store) +
        ". El mínimo real con este catálogo es de " + minPossibleDayCost + " \u20ac/día (" + shortfall + " \u20ac más)."
      : "No ha sido posible completar todas las tomas dentro de " + data.budget + " \u20ac, aunque el mínimo teórico del día (" +
        minPossibleDayCost + " \u20ac) sí entraría — revisa el tiempo de cocina o la preferencia de sabor.";
  }

  return {
    status:      status,
    headline:    headline,
    tierUsed:    attempt.tier,
    store:       data.store,
    storeName:   PRICE_CATALOGS[data.store] ? PRICE_CATALOGS[data.store].storeName : data.store,
    relaxations: relaxations,
    violations:  attempt.violations,
    macroDelta: {
      kcal:    round1(attempt.total.kcal    - profile.calories),
      protein: round1(attempt.total.protein - profile.protein),
      carbs:   round1(attempt.total.carbs   - profile.carbs),
      fat:     round1(attempt.total.fat     - profile.fats)
    },
    budgetDelta:         round2(attempt.total.cost - data.budget),
    minPossibleDayCost:  minPossibleDayCost,
    budgetTrims:         attempt.budgetTrims || 0
  };
}

// ── Rebalanceador (sin cambios respecto a la versión anterior) ────────────

/**
 * Ajusta iterativamente el plan para acercarlo a los objetivos de
 * proteína y calorías del perfil, sin añadir platos nuevos.
 *
 * @param {object[]} meals
 * @param {object}   profile
 * @returns {{ kcal, protein, carbs, fat, cost }}
 */
function rebalancePlan(meals, profile) {
  var loops = 0;

  while (loops < 12) {
    loops++;
    var total = sumMeals(meals);
    var pGap  = profile.protein  - total.protein;
    var cGap  = profile.carbs    - total.carbs;
    var kGap  = profile.calories - total.kcal;

    if (Math.abs(kGap) < 150 && pGap < 18 && cGap < 30) break;

    var lunch  = meals.find(function (m) { return m.key === "lunch";  });
    var dinner = meals.find(function (m) { return m.key === "dinner"; });

    if (pGap > 15 && lunch)  scaleMainProteinUp(lunch,  Math.min(40, pGap * 2));
    if (pGap > 25 && dinner) scaleMainProteinUp(dinner, Math.min(40, (pGap - 15) * 2));

    if (cGap > 25 && lunch) {
      var carbItem = lunch.items.find(function (i) { return i.carbs > 5; });
      if (carbItem) scaleItemUp(carbItem, Math.min(60, cGap * 1.5));
    }

    if (kGap < -180) {
      var richest = meals.slice().sort(function (a, b) {
        return getMealTotals(b).kcal - getMealTotals(a).kcal;
      })[0];
      removeLeastUsefulItem(richest);
    }

    meals.forEach(function (m) {
      mergeDuplicateFoods(m);
      m.total = getMealTotals(m);
      m.spent = round2(spentMeal(m));
      m.prep  = estimateMealPrep(m);
    });
  }

  return sumMeals(meals);
}

// ── Funciones de escala (sin cambios respecto a la versión anterior) ──────

function scaleMainProteinUp(meal, addProteins) {
  var best = null;
  var bestRatio = 0;
  meal.items.forEach(function (item) {
    if (item.grams <= 0) return;
    var ratio = item.protein / item.grams;
    if (ratio > bestRatio) { bestRatio = ratio; best = item; }
  });
  if (!best || best.grams >= 350) return;

  var addG = Math.min(60, Math.round(addProteins / Math.max(bestRatio, 0.01)));
  scaleItemUp(best, addG);
}

function scaleItemUp(item, addGrams) {
  if (!item || item.grams <= 0) return;
  var factor = (item.grams + addGrams) / item.grams;
  item.grams   = Math.round(item.grams * factor);
  item.kcal    = round1(item.kcal    * factor);
  item.protein = round1(item.protein * factor);
  item.carbs   = round1(item.carbs   * factor);
  item.fat     = round1(item.fat     * factor);
  item.cost    = round2(item.cost    * factor);
}