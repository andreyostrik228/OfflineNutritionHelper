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
 *                               PRICE_CATALOGS, normalizeIngredientKey)
 *   js/core/budget.js          (computeDayPurchaseCost — coste de COMPRA
 *                               agregado del día, el tope real del
 *                               presupuesto; estimateItemsMarginalPurchaseCost,
 *                               addItemsToPurchaseState — coste de compra
 *                               MARGINAL durante la construcción del día,
 *                               ver "Presupuesto: coste de compra, no de
 *                               uso" más abajo)
 *   js/core/pantry.js          (getPantryState) — OPCIONAL: si no está
 *                               cargado, el presupuesto se sigue aplicando
 *                               sobre el coste de compra real, solo que
 *                               sin descuento de despensa
 *   js/engine/dish-selector.js (RELAXATION_TIERS, MAX_RELAXATION_TIER,
 *                               MIN_PORTION_SCALE, pickDish,
 *                               buildMealFromDish, buildPlaceholderDish,
 *                               enforce25PercentRule, findCapViolations,
 *                               estimateAbsoluteMinPurchaseCost)
 *
 * ── Presupuesto: coste de COMPRA, no de uso (2026-08-07, profundizado 2026-08-08b) ─
 * `data.budget` significa "cuánto estoy dispuesto a pagar HOY en caja para
 * este día de comidas" — coste de COMPRA (purchaseCost), no la suma de lo
 * que técnicamente se consume (usageCost). Rediseño original (2026-08-07):
 * antes, `data.budget` limitaba usageCost durante TODO el pipeline
 * (selección de plato, recorte, verificación) y purchaseCost solo se
 * calculaba después, ya en la lista de la compra — así un plan podía
 * "caber" en 8€ de usageCost y costar 19€ reales en caja, sin que el
 * generador se enterase nunca. Ese rediseño arregló la VERIFICACIÓN final
 * (punto 2 de abajo) pero dejó la CASCADA de selección (dish-selector.js)
 * decidiendo todavía por usageCost — un plato "barato de usar" podía
 * seguir obligando a comprar un envase caro entero sin que la cascada lo
 * supiera al elegir, solo se corregía a posteriori recortando.
 *
 * Rediseño profundizado (2026-08-08b) — ahora las DOS capas usan coste de
 * compra, no solo la de verificación:
 *
 *   1. La CASCADA de selección de plato (pickDish, dish-selector.js) AHORA
 *      pregunta el coste de compra MARGINAL de cada candidato
 *      (estimateScaledPurchaseImpact → js/core/budget.js,
 *      estimateDishMarginalPurchaseCost) — cuánto SUMA ese plato a lo que
 *      ya se va a comprar hoy, dado lo que las tomas anteriores de este
 *      mismo intento ya comprometieron (`committedGrams`, mantenido aquí
 *      abajo en attemptPlanAtTier) y la despensa real (`pantryState`). Ya
 *      NO decide por usageCost — ver cabecera de dish-selector.js para el
 *      detalle completo y el porqué (ejemplo yogur 1kg/3€ vs. 100g/1€).
 *   2. Una vez el plan candidato del día está construido, se calcula el
 *      coste de compra AGREGADO real (computeDayPurchaseCost, consciente
 *      de despensa) y ESE es el número que se hace cumplir de verdad
 *      (enforcePurchaseBudgetCap) — la red de seguridad FINAL, sin
 *      cambios de diseño en este rediseño (sigue recortando si el
 *      rebalanceo de macros empuja el coste por encima). Se usa en
 *      scorePlan() para comparar candidatos entre tiers, y se reporta como
 *      violación en verifyPlanFeasibility() — total.purchaseCost es la
 *      fuente de verdad del presupuesto; total.cost (usageCost) se
 *      conserva como dato informativo aparte ("cuánto se consume
 *      realmente"), nunca como el tope.
 *   3. Si ni recortando el plan al máximo razonable el coste de compra
 *      real entra en el presupuesto, se reporta honestamente como
 *      inviable (violación "budget") — nunca se falsea el número ni se
 *      esconde purchaseCost.
 *
 * En resumen: antes, purchaseCost era solo una VERIFICACIÓN a posteriori;
 * ahora es también la SEÑAL que decide qué platos se eligen desde el
 * principio, y la verificación sigue existiendo como red de seguridad —
 * nunca "confiar y ya está" en que la cascada acertó.
 *
 * ── Reserva de presupuesto para diversidad (2026-08-19c) ─────────────────
 * `data.budget` (lo que el usuario eligió, ej. 17€) sigue siendo — y debe
 * seguir siendo siempre — el ÚNICO techo real: `mealCap`/`remainingBudget`
 * (el límite duro que nunca se cruza), `enforcePurchaseBudgetCap`,
 * `verifyPlanFeasibility` (violación "budget"), `scorePlan`
 * (`budgetOverrun`) y `budgetDelta` del informe se calculan TODOS contra
 * `data.budget` sin excepción — un plan de 16,50€ con `data.budget=17`
 * sigue siendo "ahorraste 0,50€ de los 17€ disponibles", nunca se compara
 * contra ningún número reducido.
 *
 * Lo que SÍ cambia: `data.targetBudget` (nuevo, derivado — ver
 * `sanitizeInputs`) es un objetivo interno MENOR que `data.budget`
 * (`BUDGET_RESERVE_RATIO`, hoy 12% — 17€ → objetivo ≈14,96€), usado
 * ÚNICAMENTE para calcular `targetSpend` (la cuota orientativa por toma
 * que ve `pickDish`/`isBudgetTight`/`allocationScore` en dish-selector.js)
 * en vez de `data.budget * ratio`. Motivo: con `targetSpend` anclado al
 * presupuesto COMPLETO, `isBudgetTight()` entraba en modo "tight"
 * (decide casi solo por proteína/€, ver dish-selector.js) para cualquier
 * toma cuyo `mealCap` no tuviera un colchón generoso por encima de esa
 * cuota completa — en la práctica, la mayoría de las tomas, incluso con
 * presupuestos no especialmente ajustados (medido con el stress-test de
 * 1000 generaciones de la sesión 2026-08-19b). Al apuntar la cuota
 * orientativa un poco más abajo, sobra margen real entre `targetSpend` y
 * el techo duro `mealCap` — modo "allocation" (más equilibrado entre
 * macros/diversidad/eficiencia) se activa con más frecuencia, y ese
 * margen queda disponible para que la cascada elija un plato mejor
 * (mejor macroFit, más variado) cuando de verdad hace falta, sin que eso
 * cuente nunca como "sobre lo previsto" contra el presupuesto real del
 * usuario — `allocationScore()` (dish-selector.js) ya premia igual de
 * bien gastar hasta `maxCost` que gastar justo `targetSpend`, así que
 * usar la reserva nunca penaliza el score de un candidato.
 *
 * MEDIDO (stress-test de 1000 generaciones, sesión 2026-08-19c): la reserva
 * de arriba por sí sola NO mueve las cifras de forma medible. Dos motivos
 * estructurales: (1) la factibilidad -- si `attemptPlanAtTier` escala de
 * tier por "no cabe en el presupuesto" -- se decide en pickDish() SOLO
 * contra `maxCost` (=mealCap, el techo duro sin reservar), `targetSpend`
 * nunca entra en ese filtro; (2) dentro de `scoreDishForSelection`,
 * `macroFit*100` domina sobre `allocation*30` por ~33x, así que mover el
 * "ideal" de `allocationScore` un 12% apenas cambia el ranking. La reserva
 * de `targetBudget` se deja tal cual (es inofensiva y sigue documentada
 * arriba) pero el mecanismo que de verdad reduce tier escalation por
 * presupuesto es el reparto secuencial de abajo, que sí actúa sobre
 * `mealCap` (el techo de FACTIBILIDAD).
 *
 * ── Reparto secuencial del presupuesto (2026-08-19d) ──────────────────────
 * Motivo: `mealCap` (el techo duro que ve pickDish) se calculaba como
 * `remainingBudget - reserveForRest`, donde `reserveForRest` solo reserva
 * el MÍNIMO ABSOLUTO de las tomas siguientes. Eso deja a la primera toma
 * del día (desayuno) gastar hasta el 100% del margen del día por encima de
 * los mínimos, sin importar su peso calórico real (24%) -- y si lo agota,
 * las tomas siguientes quedan ancladas cerca de su propio mínimo absoluto,
 * lo que dispara tier escalation para ELLAS por simple orden de llegada,
 * no porque el día en conjunto sea ajustado.
 *
 * Ahora cada toma recibe además un `fairShareCap`: su propio mínimo
 * absoluto + una porción del margen restante (por encima de los mínimos de
 * TODO lo que queda, esta toma incluida) proporcional a su `ratio`
 * calórico -- la misma proporcionalidad que ya usa `targetSpend`.
 *
 * MEDIDO (stress-test de 1000 generaciones, sesión 2026-08-19d): aplicar
 * `fairShareCap` a plena fuerza (`mealCap = Math.min(hardCap,
 * fairShareCap)`) SÍ reduce violaciones de calorías (-53%, 36→17) pero
 * estrecha de forma notable la cobertura de platos en las tomas que van
 * primero -- desayuno 98.4%→79.7%, comida 84.5%→64.5% -- y sube un 25% las
 * violaciones de cap25 (253→317). Contradice el objetivo de "conservar la
 * diversidad actual". Por eso `mealCap` real usa `blendedCap`, una
 * combinación convexa entre `hardCap` (0% de recorte) y `fairShareCap`
 * (100%) ponderada por `SEQUENCING_BLEND_RATIO` (ver esa constante más
 * abajo para el valor actual y el razonamiento) -- da solo PARTE de la
 * protección de tier escalation, a cambio de perder mucha menos cobertura
 * en las tomas tempranas. `mealCap` final es siempre
 * `Math.min(hardCap, blendedCap)`: nunca puede ser MÁS permisivo que
 * antes de 2026-08-19d (hardCap no cambia), y siempre
 * `>= minCostByCategory` de esa toma cuando el día es factible en conjunto
 * (blendedCap es una combinación convexa de dos valores que ya cumplen
 * eso) -- así que la garantía de factibilidad por inducción documentada
 * arriba (`reserveForRest`) queda intacta sin cambios.
 *
 * Expone (global):
 *   generateDietPlan(profile, data) → { meals, total, report }
 *     total.cost         = usageCost del día (informativo)
 *     total.purchaseCost = coste de COMPRA real del día — el que respeta
 *                           el presupuesto
 *     report.status es siempre uno de: 'perfect' | 'adjusted' | 'minimal'
 *     (o 'unavailable' únicamente ante un error técnico inesperado)
 *     report.targetBudget = objetivo interno con reserva (informativo/
 *       depuración — nunca es lo que se compara contra purchaseCost)
 *   regenerateSingleMeal(entry, mealKey, pantryState) → { meal, tier } |
 *     { error } — per-meal editing (2026-08-20g), ver esa sección más
 *     abajo. Re-elige UN plato para una toma de un plan de PLATO ya
 *     confirmado, sin regenerar las otras 4.
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

/**
 * Fracción de `data.budget` que se reserva como margen de diversidad —
 * ver "Reserva de presupuesto para diversidad" en la cabecera del
 * archivo. Solo afecta a `data.targetBudget` (la cuota ORIENTATIVA por
 * toma); el techo duro real (`data.budget`) nunca se toca. 0.12 (12%) es
 * un primer ajuste razonado: sobre los presupuestos calibrados
 * (`js/data/budget-presets.js` — Ajustado 15€/Equilibrado 20€/Amplio
 * 28€) deja una reserva de ~1,80€/2,40€/3,36€, en la misma magnitud que
 * el ejemplo que motivó este cambio (17€ → objetivo ≈15€, reserva ≈2€).
 * Si una futura sesión lo recalibra, repetir el stress-test de 1000
 * generaciones (ver STATE.md, sesión 2026-08-19b) antes/después para
 * confirmar el efecto real, no asumirlo.
 */
var BUDGET_RESERVE_RATIO = 0.12;

/**
 * Tope de cordura: un ingrediente no puede superar en un día esta
 * proporción de su mayor ración CURADA (dishes.js). Ver applyPortionSanity
 * para el bug real y la medición. 2.5 es un primer corte conservador,
 * pensado para revisarse con uso real, no un número definitivo.
 */
var PORTION_CAP_MULTIPLIER = 2.5;

/**
 * Si pasarse del borde de un envase consume menos de esta fracción del
 * paquete, se recorta el plan HASTA el borde en vez de comprar un paquete
 * entero más. Fracción y no gramos fijos porque los envases van de 100 g a
 * 1 kg.
 *
 * El ahorro en dinero es MODESTO y conviene no venderlo de más: 804,60 EUR
 * -> 799,22 EUR sobre 60 planes (~5,40 EUR, 0,7%). Se queda ahí porque la
 * compensación de kcal vuelve a añadir gramos que cuestan dinero. Lo que
 * de verdad arregla es la sensación de absurdo de comprar dos bolsas para
 * usar el 2% de la segunda.
 */
var PACKAGE_TRIM_RATIO = 0.20;

/**
 * Cuánto se aplica el recorte proporcional (`fairShareCap`) del "Reparto
 * secuencial del presupuesto" (ver cabecera del archivo) sobre `mealCap`.
 * 0 = sin efecto (mealCap = hardCap, comportamiento de antes de
 * 2026-08-19d). 1 = recorte proporcional COMPLETO (lo que se probó primero
 * en 2026-08-19d: redujo violaciones de calorías un 53% pero le costó
 * ~20pp de cobertura de platos en desayuno y comida, y SUBIÓ un 25% las
 * violaciones de cap25 -- ver STATE.md, sesión 2026-08-19d). 0.5 es un
 * punto medio deliberado tras ese resultado: aplica solo la mitad del
 * recorte proporcional para conservar parte de la protección de tier
 * escalation sin sacrificar tanta cobertura en las tomas tempranas. Si se
 * recalibra, repetir el stress-test de 1000 generaciones (mismo perfil fijo
 * que sesiones anteriores) antes/después -- este valor NO se ha ajustado
 * por intuición, cada cambio se mide.
 */
var SEQUENCING_BLEND_RATIO = 0.5;

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

  var safeBudget = isFiniteNum(data && data.budget) && data.budget > 0 ? data.budget : 15;

  var safeOverrides = {
    budget:   safeBudget,
    // Objetivo interno CON reserva (ver "Reserva de presupuesto para
    // diversidad" en la cabecera del archivo) — SOLO para targetSpend en
    // attemptPlanAtTier, nunca para el techo duro. safeBudget (arriba)
    // sigue siendo `data.budget` sin tocar.
    targetBudget: round2(Math.max(0, safeBudget * (1 - BUDGET_RESERVE_RATIO))),
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
      total: { kcal: 0, protein: 0, carbs: 0, fat: 0, cost: 0, purchaseCost: 0 },
      report: {
        status: "unavailable",
        headline: "No se pudo generar el plan por un error técnico.",
        tierUsed: null,
        store: null,
        relaxations: [],
        violations: [{ type: "system_error", detail: String(err && err.message || err) }],
        macroDelta: { kcal: 0, protein: 0, carbs: 0, fat: 0 },
        budgetDelta: 0
      }
    };
  }
}

// ── Búsqueda en niveles de relajación (tiempo/sabor/tope-25%, NO presupuesto) ─

/**
 * Intenta generar un plan completo en niveles de relajación crecientes de
 * tiempo/sabor/tope-25%. El presupuesto (coste de COMPRA real, ver
 * cabecera del archivo) se aplica igual de estricto en TODOS los niveles
 * — lo único que cambia entre niveles es cuánta flexibilidad de
 * tiempo/sabor tiene la cascada de selección para encontrar un plato que
 * cuadre.
 *
 * @param {object} profile
 * @param {object} data
 * @returns {{ meals, total, report }}
 */
function generateDietPlanTiered(profile, data) {
  var sanitized = sanitizeInputs(profile, data);
  profile = sanitized.profile;
  data    = sanitized.data;

  // Se lee UNA sola vez por generación (no en cada intento de tier, no en
  // cada iteración del recorte de presupuesto) — la despensa no cambia a
  // media generación, así que reutilizar el mismo snapshot evita releer
  // localStorage decenas de veces y garantiza que todos los tiers se
  // comparan contra el MISMO estado de despensa. null si pantry.js no
  // está cargado -- computeDayPurchaseCost() ya sabe degradar con
  // seguridad a "sin despensa" en ese caso.
  var pantryState = (typeof getPantryState === "function") ? getPantryState() : null;

  // Proyecta la despensa al día que se planifica (2026-08-25). Dos cosas
  // a la vez, y la primera es un arreglo, no una función nueva:
  //
  //   1. Lo ya CADUCADO deja de descontar del coste de compra. Antes sí
  //      descontaba: unas zanahorias caducadas en enero dejaban el día en
  //      0,00 € en vez de 1,70 € (medido). Ver projectPantryState().
  //   2. Si `data.targetDate` pide un día futuro, se descuenta solo lo que
  //      seguirá bueno ESE día -- la leche que caduca el jueves no puede
  //      "ahorrar" en el plan del sábado.
  //
  // Se filtra aquí, en el único sitio donde entra la despensa, para no
  // acoplar budget.js/pricing.js a la caducidad.
  if (typeof projectPantryState === "function") {
    pantryState = projectPantryState(pantryState, data && data.targetDate);
  }

  var bestAttempt = null;
  var bestScore   = -Infinity;

  for (var tier = 0; tier <= MAX_RELAXATION_TIER; tier++) {
    var attempt = attemptPlanAtTier(profile, data, tier, pantryState);
    var score   = scorePlan(attempt, profile, data);

    if (score > bestScore) {
      bestScore   = score;
      bestAttempt = attempt;
    }

    if (attempt.violations.length === 0) {
      break; // ya respeta todo lo pedido; relajar más solo podría empeorarlo
    }
  }

  var report = buildCompromiseReport(bestAttempt, profile, data);
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
 * @param {object|null} pantryState - snapshot de getPantryState(), o null
 * @returns {{ meals, total, violations, tier, simplifiedCategories }}
 */
function attemptPlanAtTier(profile, data, tier, pantryState) {
  var usedState = { usedNames: [], usedProts: [], usedTastes: [] };
  var placeholderInfo = [];
  var simplifiedCategories = [];
  var store = data.store;

  // Gramos ya comprometidos a comprar hoy, por ingrediente normalizado —
  // acumulador de ESTE intento (un tier), se reinicia en cada llamada a
  // attemptPlanAtTier (ver cabecera de js/core/budget.js). Es lo que deja
  // que la toma 2 vea que la toma 1 ya "pagó" el paquete de un ingrediente
  // compartido, y que su coste de compra MARGINAL sea 0 si el mismo
  // paquete todavía cubre lo que hace falta.
  var committedGrams = {};

  // Coste mínimo ABSOLUTO de COMPRA (ración reducida al mínimo,
  // MIN_PORTION_SCALE, sin despensa ni comprometidos — ver cabecera de
  // estimateAbsoluteMinPurchaseCost en dish-selector.js) de cada
  // categoría — usado para reservar presupuesto a las tomas siguientes
  // mientras se recorre el día.
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
    minCostByCategory[def.category] = estimateAbsoluteMinPurchaseCost(def.category, store);
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
    // mealCap (techo duro de ESTA toma) sigue anclado a remainingBudget,
    // que a su vez arranca en data.budget SIN reserva -- nunca se reduce
    // lo que de verdad se puede gastar. Solo targetSpend (cuota
    // ORIENTATIVA, ver "Reserva de presupuesto para diversidad" en la
    // cabecera) usa data.targetBudget -- deja margen real entre lo que
    // pickDish() intenta alcanzar y lo que puede alcanzar como máximo.
    var hardCap = Math.max(0, round2(remainingBudget - reserveForRest));

    // ── Reparto por turnos (secuencial) -- ver "Reparto secuencial del
    // presupuesto" en la cabecera del archivo. hardCap (arriba) sigue
    // siendo el único techo de FACTIBILIDAD -- nunca se supera. fairShareCap
    // reduce ADEMÁS ese techo para tomas tempranas, reservando una porción
    // proporcional (por ratio calórico) del margen que sobra por encima de
    // los mínimos absolutos de TODO lo que queda (esta toma incluida) para
    // que no lo agote una toma anterior por simple orden de llegada.
    var remainingMinCost = minCostByCategory[def.category] + reserveForRest;
    var remainingSlack = Math.max(0, round2(remainingBudget - remainingMinCost));
    var remainingRatioSum = MEAL_DEFS.slice(index).reduce(function (sum, d) { return sum + d.ratio; }, 0);
    var fairShareCap = round2(minCostByCategory[def.category] + remainingSlack * (def.ratio / remainingRatioSum));
    // blendedCap interpola entre hardCap (0% de recorte) y fairShareCap
    // (100%, el recorte proporcional completo) -- ver
    // SEQUENCING_BLEND_RATIO en la cabecera para el motivo del 50%. Es una
    // combinación convexa de dos valores que ya son ambos >=
    // minCostByCategory cuando el día es factible en conjunto, así que
    // blendedCap hereda esa misma garantía sin comprobación extra.
    var blendedCap = round2(hardCap - SEQUENCING_BLEND_RATIO * (hardCap - fairShareCap));
    var mealCap = Math.max(0, Math.min(hardCap, blendedCap));

    var targetSpend = round2(data.targetBudget * def.ratio);

    var pick = pickDish(def.category, data, usedState, tier, mealCap, target, store, targetSpend, committedGrams, pantryState);

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

    // Coste de compra MARGINAL real de esta toma, medido con lo ya
    // comprometido ANTES de sumar esta toma — luego se compromete (para
    // que la SIGUIENTE toma vea el estado actualizado) y se descuenta del
    // presupuesto restante. remainingBudget ahora sigue dinero de COMPRA
    // marginal, no usageCost (meal.spent) como antes de este rediseño.
    var marginalSpend = estimateItemsMarginalPurchaseCost(meal.items, committedGrams, store, pantryState);
    addItemsToPurchaseState(committedGrams, meal.items);
    remainingBudget = round2(remainingBudget - marginalSpend);
    return meal;
  });

  var roughTotal = sumMeals(meals);
  var tierDef    = RELAXATION_TIERS[tier];

  enforce25PercentRule(meals, roughTotal.kcal || profile.calories, tierDef.cap25);

  var total = rebalancePlan(meals, profile);

  // El rebalanceo puede reintroducir una violación del tope del 25% Y
  // puede hacer crecer el coste (aumenta ítems para cubrir proteína/
  // calorías sin mirar el precio). El cap25 se corrige AQUÍ, después del
  // rebalanceo; el presupuesto se hace cumplir sobre el coste de COMPRA
  // real agregado del día (ver cabecera del archivo), nunca subiendo el
  // presupuesto — solo recortando.
  enforce25PercentRule(meals, total.kcal || profile.calories, tierDef.cap25);
  var purchaseResult = enforcePurchaseBudgetCap(meals, data.budget, store, pantryState);
  total = purchaseResult.total;
  total.purchaseCost = purchaseResult.purchase.purchaseCost;

  // "Con lógica, no solo con matemáticas" (bug real, 2026-08-26): el
  // usuario recibió un plan con 1020 g de patata Y la instrucción de
  // comprar DOS bolsas de 1 kg. Dos defectos distintos, se corrigen aquí
  // en un orden deliberado (ver applyPortionSanity).
  var sanity = applyPortionSanity(meals, store, profile.calories);
  if (sanity.changed) {
    total = sumMeals(meals);
    var repricedPurchase = computeDayPurchaseCost(meals, store, pantryState);
    total.purchaseCost = repricedPurchase.purchaseCost;
    total.cost = repricedPurchase.usageCost;
  }

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
    simplifiedCategories: simplifiedCategories, budgetTrims: purchaseResult.trims,
    portionSanity: sanity
  };
}

/**
 * Cordura de porciones: dos arreglos sobre el plato ya montado.
 *
 * ── El bug real que lo motiva (2026-08-26) ──────────────────────────────
 * El usuario generó un plan y le dijo que comiera 1020 g de patata en un
 * día, y que comprase DOS bolsas de 1 kg para conseguirlo. Sus palabras:
 * "deberíamos crear los planes no solo con matemáticas, también con
 * lógica". Tenía razón, y son DOS defectos independientes:
 *
 *   (a) NADA acotaba cuánto de un mismo ingrediente cabe en un día.
 *       Escalar hasta MAX_PORTION_SCALE y repetir ingrediente entre
 *       comidas se compone sin techo. Medido: 822 g de batata, 671 g de
 *       quinoa, 663 g de pasta en planes generados.
 *   (b) Pasarse de un envase por poco disparaba Math.ceil y añadía un
 *       paquete ENTERO. Medido: 409 g pedidos con bolsas de 400 g ->
 *       comprar 800 g para comer 409 g, con la segunda bolsa al 2,3%.
 *
 * ── El ORDEN importa y es deliberado: primero (a), después (b) ──────────
 * Recortar por cordura BAJA los gramos, y eso puede devolver el
 * ingrediente por debajo del borde del envase, dejando el recorte (b)
 * innecesario. Al revés —ajustar al envase y luego capar— se acabaría por
 * debajo del borde igualmente, habiendo hecho el trabajo dos veces y sin
 * quedar ni en el borde ni en el tope. Cap primero converge.
 *
 * ── El tope NO son 81 números a mano ────────────────────────────────────
 * Es PORTION_CAP_MULTIPLIER x la mayor ración CURADA de ese ingrediente en
 * dishes.js. Esas 334 entradas ya son porciones validadas por una persona,
 * así que el techo sale del dato y se reajusta solo si cambia el catálogo.
 * 2.5x permite que un ingrediente aparezca en dos comidas del día con
 * holgura; más allá es el bug de composición.
 *
 * Medido sobre 60 planes sembrados, antes -> después:
 *   peor ración de un día      1097 g -> 625 g  (la queja era 1020 g)
 *   ingrediente-días >500 g    36/650 -> 9/650
 *   violaciones de macros      10     -> 6
 *   kcal medias vs objetivo    -4,8%  -> -3,7%
 *   paquetes abiertos al <20%  30     -> 0
 * Es un primer corte conservador, revisable con uso real.
 *
 * @param {object[]} meals
 * @param {string} storeId
 * @param {number} targetKcal - objetivo diario, para compensar el recorte
 * @returns {{changed:boolean, capped:object[], trimmed:object[], compensated:number}}
 */
function applyPortionSanity(meals, storeId, targetKcal) {
  var result = { changed: false, capped: [], trimmed: [], compensated: 0 };
  if (!meals || !meals.length) return result;

  // ── (a) Tope de porción diaria ────────────────────────────────────────
  var caps = getCuratedPortionCaps();
  var totals = sumIngredientGrams(meals);

  Object.keys(totals).forEach(function (name) {
    var cap = caps[name];
    if (!cap || totals[name] <= cap) return;

    scaleIngredientAcrossMeals(meals, name, cap / totals[name], Math.floor(cap));
    result.capped.push({ name: name, from: Math.round(totals[name]), to: Math.round(cap) });
    result.changed = true;
  });

  // ── (a2) Compensar lo que el tope se ha llevado ───────────────────────
  // SIN esto el tope es un recorte a secas: medido sobre 60 planes, la
  // media caía a -8,8% de las kcal objetivo y 14 planes acababan con
  // violación `calories`. Honesto, pero un plan que no alimenta no sirve.
  // Se devuelven las kcal a ingredientes que TIENEN holgura bajo su propio
  // tope, así que compensar no puede reintroducir el bug (a).
  if (result.changed) {
    result.compensated = compensateCappedCalories(meals, targetKcal, caps);
  }

  // ── (b) Ajuste al borde de envase ─────────────────────────────────────
  // Recalculado DESPUÉS del tope y de la compensación: los gramos han
  // cambiado dos veces, y es el número final el que decide el envase.
  totals = sumIngredientGrams(meals);

  Object.keys(totals).forEach(function (name) {
    var pkg = (typeof resolvePackageInfo === "function") ? resolvePackageInfo(name, storeId) : null;
    if (!pkg || !pkg.packageSizeG) return;

    var size = pkg.packageSizeG;
    var need = totals[name];
    var packs = Math.ceil(need / size);
    if (packs < 2) return;

    // Cuánto se usa del ÚLTIMO paquete abierto.
    var overshoot = need - (packs - 1) * size;
    if (overshoot > size * PACKAGE_TRIM_RATIO) return;

    var target = (packs - 1) * size;
    scaleIngredientAcrossMeals(meals, name, target / need, target);
    result.trimmed.push({ name: name, from: Math.round(need), to: target, packagesSaved: 1 });
    result.changed = true;
  });

  if (result.changed) {
    meals.forEach(function (meal) { meal.total = getMealTotals(meal); });
  }

  return result;
}

/** Gramos totales por ingrediente en todo el día. */
function sumIngredientGrams(meals) {
  var totals = {};
  meals.forEach(function (meal) {
    (meal.items || []).forEach(function (item) {
      totals[item.name] = (totals[item.name] || 0) + (item.grams || 0);
    });
  });
  return totals;
}

/**
 * Escala un ingrediente por igual en todas las comidas donde aparece.
 * Macros y coste se escalan CON los gramos: mover `grams` a solas dejaría
 * las kcal del ítem describiendo una cantidad que ya no existe.
 */
function scaleIngredientAcrossMeals(meals, name, factor, targetGrams) {
  var touched = [];

  meals.forEach(function (meal) {
    (meal.items || []).forEach(function (item) {
      if (item.name !== name) return;
      item.grams   = Math.round(item.grams * factor);
      item.kcal    = round1(item.kcal    * factor);
      item.protein = round1(item.protein * factor);
      item.carbs   = round1(item.carbs   * factor);
      item.fat     = round1(item.fat     * factor);
      item.cost    = round2(item.cost    * factor);
      touched.push(item);
    });
  });

  // Cuadrar el redondeo cuando el destino es EXACTO (borde de envase).
  //
  // Sin esto, un ingrediente repartido en 3 tomas puede redondear a 401 g
  // con destino 400 g -- y 1 g de más abre una bolsa entera. Sería
  // reintroducir el bug que este código existe para arreglar, en su
  // versión más absurda. Medido: pasaba en 2 de 60 planes.
  if (typeof targetGrams !== "number" || !touched.length) return;

  var sum = touched.reduce(function (a, i) { return a + i.grams; }, 0);
  var excess = sum - targetGrams;
  if (excess === 0) return;

  var biggest = touched.reduce(function (a, b) { return b.grams > a.grams ? b : a; });
  if (biggest.grams - excess <= 0) return;

  var adjusted = (biggest.grams - excess) / biggest.grams;
  biggest.grams   -= excess;
  biggest.kcal    = round1(biggest.kcal    * adjusted);
  biggest.protein = round1(biggest.protein * adjusted);
  biggest.carbs   = round1(biggest.carbs   * adjusted);
  biggest.fat     = round1(biggest.fat     * adjusted);
  biggest.cost    = round2(biggest.cost    * adjusted);
}

/**
 * Devuelve al plan las kcal que se llevó el tope, repartidas entre los
 * ingredientes que TODAVÍA tienen holgura por debajo de su propio tope.
 *
 * Se reparte proporcionalmente a las kcal actuales de cada ingrediente
 * (el que ya aporta más, absorbe más) y NUNCA se pasa del tope de nadie:
 * por eso compensar no puede reintroducir el bug de las porciones
 * gigantes. Si no queda holgura suficiente, se devuelve lo que se pueda y
 * el déficit restante lo reporta verifyPlanFeasibility como violación
 * `calories` -- que es lo correcto: mejor un plan que admite que no llega
 * que uno que finge.
 *
 * @param {object[]} meals
 * @param {number} targetKcal
 * @param {object} caps - tope en gramos por ingrediente
 * @returns {number} kcal efectivamente recuperadas
 */
function compensateCappedCalories(meals, targetKcal, caps) {
  if (!targetKcal) return 0;

  var deficit = targetKcal - sumMeals(meals).kcal;
  if (deficit <= 0) return 0;

  var totals = sumIngredientGrams(meals);
  var recovered = 0;

  // Cuánto puede crecer cada ingrediente antes de tocar su propio tope.
  var headroom = [];
  Object.keys(totals).forEach(function (name) {
    var cap = caps[name];
    var maxG = cap ? cap : totals[name] * PORTION_CAP_MULTIPLIER;
    if (maxG <= totals[name]) return;
    headroom.push({ name: name, grams: totals[name], maxG: maxG });
  });
  if (!headroom.length) return 0;

  var kcalPerG = {};
  var totalKcalWithRoom = 0;
  headroom.forEach(function (h) {
    var k = 0;
    meals.forEach(function (meal) {
      (meal.items || []).forEach(function (item) {
        if (item.name === h.name) k += item.kcal;
      });
    });
    kcalPerG[h.name] = h.grams > 0 ? k / h.grams : 0;
    totalKcalWithRoom += k;
    h.kcal = k;
  });
  if (totalKcalWithRoom <= 0) return 0;

  headroom.forEach(function (h) {
    if (recovered >= deficit) return;
    var share = deficit * (h.kcal / totalKcalWithRoom);
    var wantG = kcalPerG[h.name] > 0 ? share / kcalPerG[h.name] : 0;
    var canG = Math.min(wantG, h.maxG - h.grams);
    if (canG <= 0) return;

    scaleIngredientAcrossMeals(meals, h.name, (h.grams + canG) / h.grams);
    recovered += canG * kcalPerG[h.name];
  });

  return round1(recovered);
}

/**
 * Mayor ración CURADA de cada ingrediente x PORTION_CAP_MULTIPLIER.
 * Se calcula una vez y se memoiza: dishes.js no cambia en runtime.
 */
var _curatedPortionCaps = null;

function getCuratedPortionCaps() {
  if (_curatedPortionCaps) return _curatedPortionCaps;

  var maxByName = {};
  if (typeof DISH_DB !== "undefined") {
    DISH_DB.forEach(function (dish) {
      (dish.items || []).forEach(function (item) {
        maxByName[item.name] = Math.max(maxByName[item.name] || 0, item.g || 0);
      });
    });
  }

  _curatedPortionCaps = {};
  Object.keys(maxByName).forEach(function (name) {
    _curatedPortionCaps[name] = maxByName[name] * PORTION_CAP_MULTIPLIER;
  });

  return _curatedPortionCaps;
}

/**
 * Recorta el plan hasta que el coste de COMPRA agregado del día (paquetes
 * reales necesarios, descontando despensa) quepa en el presupuesto —
 * nunca el coste de uso (ver cabecera del archivo, "Presupuesto: coste de
 * compra, no de uso"). Reemplaza al antiguo enforceBudgetCap() (que
 * recortaba mirando solo item.cost, el coste de USO de cada ítem por
 * separado — eso podía "arreglar" el número mostrado sin comprar ni un
 * paquete menos de verdad, exactamente el bug que motivó este rediseño).
 *
 * Cada recorte se evalúa recalculando el purchaseCost REAL agregado de
 * TODO el día (computeDayPurchaseCost) desde cero — nunca se asume ni se
 * estima cuánto "debería" bajar. Esto es deliberado: reducir 10 g de un
 * ingrediente cuyo envase sigue haciendo falta comprar entero no ahorra
 * nada de verdad, y este bucle nunca lo contaría como progreso porque
 * vuelve a medir el número real después de cada cambio, no antes.
 *
 * Selección del ítem a recortar: la PEOR relación proteína / coste-de-
 * COMPRA de su ingrediente (agregado del día) — mismo criterio de
 * "ineficiencia" que el recorte antiguo, pero medido con el número que de
 * verdad se está intentando bajar. Un ingrediente ya cubierto del todo
 * por la despensa (purchaseCost=0 para ese ingrediente) nunca se recorta
 * por presupuesto: quitarlo no ahorraría nada.
 *
 * Converge siempre: en el peor caso el plan queda vacío y el coste de
 * compra es 0. Tope de 40 iteraciones (más que las 30 del recorte
 * anterior porque cada paso ahora puede "gastarse" sin cruzar un umbral
 * de paquete) como red de seguridad, no como mecanismo esperado.
 *
 * @param {object[]} meals
 * @param {number}   budget
 * @param {string}   storeId
 * @param {object|null} pantryState
 * @returns {{ total: object, purchase: object, trims: number }}
 */
function enforcePurchaseBudgetCap(meals, budget, storeId, pantryState) {
  var purchase = computeDayPurchaseCost(meals, storeId, pantryState);
  var trims = 0;

  while (purchase.purchaseCost > budget + 0.01 && trims < 40) {
    var costByIngredient = {};
    purchase.lines.forEach(function (line) {
      costByIngredient[normalizeIngredientKey(line.name)] = line.purchaseCost;
    });

    var worstItem = null, worstMeal = null, worstRatio = Infinity;
    meals.forEach(function (meal) {
      meal.items.forEach(function (item) {
        if (item.grams <= 0) return;
        var ingredientPurchaseCost = costByIngredient[normalizeIngredientKey(item.name)] || 0;
        if (ingredientPurchaseCost <= 0) return; // ya cubierto por despensa (o sin coste) -- recortarlo no ahorra nada
        var ratio = item.protein / ingredientPurchaseCost;
        if (ratio < worstRatio) { worstRatio = ratio; worstItem = item; worstMeal = meal; }
      });
    });

    if (!worstItem) break; // nada cuyo recorte pueda bajar el coste de compra real

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
    purchase = computeDayPurchaseCost(meals, storeId, pantryState);
  }

  return { total: sumMeals(meals), purchase: purchase, trims: trims };
}

/**
 * Compara el plan YA CONSTRUIDO contra las cifras ORIGINALES del usuario.
 * El presupuesto ahora debería cumplirse casi siempre gracias a
 * enforcePurchaseBudgetCap; esta comprobación queda como red de
 * seguridad, no como mecanismo principal de control. El presupuesto se
 * compara contra total.purchaseCost (coste de COMPRA real, consciente de
 * despensa) — nunca total.cost (usageCost, solo informativo). Ver
 * cabecera del archivo.
 *
 * @param {object[]} meals
 * @param {object}   total
 * @param {object}   profile
 * @param {object}   data
 * @returns {object[]}
 */
function verifyPlanFeasibility(meals, total, profile, data) {
  var violations = [];

  if (total.purchaseCost > data.budget + 0.01) {
    violations.push({
      type: "budget",
      exceededBy: round2(total.purchaseCost - data.budget),
      purchaseCost: total.purchaseCost,
      usageCost: total.cost
    });
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

  var budgetOverrun = Math.max(0, (total.purchaseCost - data.budget) / Math.max(data.budget, 0.01));
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
 * @returns {object}
 */
function buildCompromiseReport(attempt, profile, data) {
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
  // (menu_simplified) y la inviabilidad real (budget_infeasible / budget),
  // ambas ya presentes en attempt.violations.

  var storeName = PRICE_CATALOGS[data.store] ? PRICE_CATALOGS[data.store].storeName : data.store;

  var status;
  // "budget" (coste de COMPRA real por encima del presupuesto incluso
  // después de recortar al máximo, enforcePurchaseBudgetCap) es, a
  // efectos de gravedad del status, tan serio como "budget_infeasible"
  // (la cascada de selección no encontró nada que cupiera ni reduciendo
  // ración): en ambos casos el usuario pagaría más de lo que pidió si se
  // aceptara el plan tal cual, así que ninguno de los dos puede quedar
  // como "adjusted" (que implica "sí respeta tu presupuesto, solo se
  // ajustó otra cosa").
  var hasBudgetIssue = attempt.violations.some(function (v) {
    return v.type === "budget_infeasible" || v.type === "budget";
  });
  if (attempt.tier === 0 && attempt.violations.length === 0) {
    status = "perfect";
  } else if (attempt.tier >= MAX_RELAXATION_TIER || hasBudgetIssue) {
    status = "minimal";
  } else {
    status = "adjusted";
  }

  var headline = HEADLINES[status];
  if (hasBudgetIssue) {
    var achieved = round2(attempt.total.purchaseCost);
    var shortfall = round2(Math.max(0, achieved - data.budget));
    headline = shortfall > 0.005
      ? "Con " + data.budget + " € de presupuesto de compra no ha sido posible montar un plan que quepa en " +
        storeName + ", ni siquiera recortando raciones al máximo razonable. El plan más ajustado que se ha " +
        "podido construir necesita comprar " + achieved + " € (" + shortfall + " € más de lo disponible; " +
        "el uso real de ingredientes es de " + round2(attempt.total.cost) + " €, pero los paquetes que hay " +
        "que comprar cuestan más)."
      : "No ha sido posible completar todas las tomas dentro de " + data.budget + " € de presupuesto de " +
        "compra, aunque el coste de compra final (" + achieved + " €) prácticamente lo alcanza — revisa el " +
        "tiempo de cocina o la preferencia de sabor.";
  }

  return {
    status:      status,
    headline:    headline,
    tierUsed:    attempt.tier,
    store:       data.store,
    storeName:   storeName,
    relaxations: relaxations,
    violations:  attempt.violations,
    macroDelta: {
      kcal:    round1(attempt.total.kcal    - profile.calories),
      protein: round1(attempt.total.protein - profile.protein),
      carbs:   round1(attempt.total.carbs   - profile.carbs),
      fat:     round1(attempt.total.fat     - profile.fats)
    },
    budgetDelta: round2(attempt.total.purchaseCost - data.budget),
    budgetTrims: attempt.budgetTrims || 0,
    // Informativo/depuración únicamente (ver "Reserva de presupuesto para
    // diversidad" en la cabecera) -- budgetDelta de arriba SIGUE
    // comparando contra data.budget, nunca contra este valor.
    targetBudget: data.targetBudget
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

// ── Per-meal editing (2026-08-20g) ─────────────────────────────────────────

/**
 * Re-elige UN plato para UNA toma concreta de un plan de PLATO ya
 * CONFIRMADO (entry de pantry.js, no un plan recién generado) — "cambiar
 * este plato" sin regenerar los otros 4. A diferencia de
 * generateDietPlanTiered()/attemptPlanAtTier() (que construyen las 5
 * tomas juntas, en orden, acumulando estado compartido conforme avanzan),
 * esto opera sobre UNA sola toma dentro de un día que ya existe y cuyas
 * otras 4 tomas son un HECHO, no una estimación futura:
 *
 *   - target: los macros que la toma reemplazada YA tenía
 *     (oldMeal.total) — no se re-deriva del perfil calórico original (no
 *     se persiste con la entry), así que "cambiar este plato" significa
 *     "un plato distinto con un papel nutricional similar al que ya
 *     cumplía esta toma", no "recalcular desde cero contra el perfil".
 *   - mealCap: el presupuesto REAL que queda hoy
 *     (entry.budget − coste de compra real de las otras 4 tomas, ya
 *     fijas, vía computeDayPurchaseCost) — más preciso que la reserva
 *     estimada de attemptPlanAtTier durante la generación original,
 *     porque aquí las otras tomas ya no son mínimos futuros, son un
 *     coste conocido.
 *   - targetSpend: cuota orientativa de ESTA categoría sobre
 *     entry.budget (mismo ratio que MEAL_DEFS usa siempre) — deliberadamente
 *     MENOR que mealCap cuando sobra presupuesto, para que
 *     isBudgetTight() (dish-selector.js) no fuerce el modo "solo
 *     proteína/€" en cuanto haya margen real.
 *   - committedGrams/usedState: reconstruidos de las OTRAS 4 tomas
 *     (incluyendo la propia toma que se va a reemplazar en usedState, no
 *     en committedGrams — así diversityScore la penaliza sin excluirla
 *     por completo, mismo criterio de "reroll" que el resto del motor;
 *     nunca hay garantía absoluta de plato distinto, igual que
 *     "Generar plan" tampoco la da).
 *   - tier: prueba 0..MAX_RELAXATION_TIER igual que attemptPlanAtTier,
 *     hasta encontrar un candidato o agotar la escalera.
 *
 * Requiere que la entry se haya guardado con dayOptions (savePlanForToday/
 * replacePendingMealsForToday, 2026-08-20g) y que buildMealFromDish()
 * hubiera poblado dishName/mainProt/taste/total en su momento — entradas
 * más antiguas simplemente no tienen estos campos; el llamador
 * (render-pantry.js) comprueba esto ANTES de ofrecer la acción, no aquí.
 *
 * @param {object} entry - entry de pantryHistory, type "dish" (nunca "nocook")
 * @param {string} mealKey - "breakfast"|"lunch"|"dinner"|"snack"|"snack2"
 * @param {object|null} pantryState - snapshot de getPantryState(), o null
 * @returns {{ meal:object, tier:number }|{ error:string }}
 */
function regenerateSingleMeal(entry, mealKey, pantryState) {
  var def = MEAL_DEFS.find(function (d) { return d.key === mealKey; });
  if (!def) return { error: "unknown_meal_key" };

  var oldMeal = (entry.meals || []).find(function (m) { return m.key === mealKey; });
  if (!oldMeal) return { error: "meal_not_found" };
  if (oldMeal.cooked) return { error: "meal_already_cooked" };
  if (!oldMeal.total || typeof entry.budget !== "number") return { error: "missing_data" };

  var otherMeals = entry.meals.filter(function (m) { return m.key !== mealKey; });
  var store = entry.store || DEFAULT_STORE_ID;

  // usedState incluye las 5 tomas (la vieja incluida, ver cabecera) —
  // entries guardadas ANTES de esta sesión no tienen dishName/mainProt/
  // taste, se ignoran en silencio (mismo criterio que el resto del motor
  // ante datos ausentes, nunca "undefined" contaminando la diversidad).
  var usedState = { usedNames: [], usedProts: [], usedTastes: [] };
  entry.meals.forEach(function (m) {
    if (typeof m.dishName === "string") usedState.usedNames.push(m.dishName);
    if (typeof m.mainProt === "string") usedState.usedProts.push(m.mainProt);
    if (typeof m.taste === "string")    usedState.usedTastes.push(m.taste);
  });

  // committedGrams SOLO de las otras 4 (ya fijas) — la toma que se va a
  // reemplazar no debe "reservarse" a sí misma.
  var committedGrams = {};
  var otherMealsForCost = otherMeals.map(function (m) {
    var items = (m.items || []).map(function (it) { return { name: it.name, grams: it.requiredGrams }; });
    return { items: items };
  });
  otherMealsForCost.forEach(function (m) { addItemsToPurchaseState(committedGrams, m.items); });

  var otherCost = computeDayPurchaseCost(otherMealsForCost, store, pantryState).purchaseCost;
  var mealCap = Math.max(0, round2(entry.budget - otherCost));
  var targetSpend = round2(entry.budget * def.ratio);

  var target = { kcal: oldMeal.total.kcal, protein: oldMeal.total.protein, carbs: oldMeal.total.carbs, fat: oldMeal.total.fat };
  var data = {
    cookTime: typeof entry.cookTime === "number" ? entry.cookTime : 999,
    taste:    typeof entry.taste === "string" ? entry.taste : "mixed",
    store:    store
  };

  for (var tier = 0; tier <= MAX_RELAXATION_TIER; tier++) {
    var pick = pickDish(def.category, data, usedState, tier, mealCap, target, store, targetSpend, committedGrams, pantryState);
    if (pick.dish) {
      var meal = buildMealFromDish(pick.dish, def.key, def.label, target, store, pick.scaleFactor);
      return { meal: meal, tier: tier };
    }
  }

  return { error: "no_alternative_found" };
}