/**
 * js/core/meal-helpers.js
 * ─────────────────────────────────────────────────────────────────────────
 * Funciones de bajo nivel para manipular objetos "meal" y calcular
 * sus totales. No conocen DISH_DB ni la lógica de selección de platos.
 *
 * Depende de: js/core/utils.js (round1, round2)
 * Usado por:  js/engine/dish-selector.js
 *             js/engine/plan-generator.js
 *             js/ui/render.js (getMealTotals)
 *
 * Estructura de un objeto meal:
 *   {
 *     key:   "breakfast" | "comida" | "cena" | "snack"
 *     label: string  (nombre visible en la tarjeta)
 *     items: [ { name, grams, kcal, protein, carbs, fat, cost, prep } ]
 *     total: { kcal, protein, carbs, fat, cost }   ← calculado
 *     spent: number                                 ← calculado
 *     prep:  number (minutos)                       ← calculado
 *   }
 * ─────────────────────────────────────────────────────────────────────────
 */

/**
 * Añade un plato/alimento a un meal como item de línea.
 * Convierte los macros del plato (por 100 g) a la ración real.
 *
 * Nota: en el nuevo sistema basado en DISH_DB, `food` es un plato completo
 * y `grams` representa el factor de escala (100 = ración estándar).
 * Para platos completos se llama siempre con grams = 100.
 *
 * @param {object} meal  - objeto meal al que añadir
 * @param {object} food  - entrada de DISH_DB (o FOOD_DB en modo legado)
 * @param {number} grams - gramos (o factor de escala)
 */
function addFood(meal, food, grams) {
  meal.items.push({
    name:    food.name,
    grams:   grams,
    kcal:    round1(food.kcal    * grams / 100),
    protein: round1(food.protein * grams / 100),
    carbs:   round1(food.carbs   * grams / 100),
    fat:     round1(food.fat     * grams / 100),
    cost:    round2(food.cost    * grams / 100),
    prep:    food.prep  || 0,
    ready:   food.ready || false,
    taste:   food.taste || "mixed"
  });
}

/**
 * Combina items duplicados (mismo name) sumando sus valores.
 * Útil cuando el balanceador añade más cantidad de un item ya existente.
 *
 * @param {object} meal
 */
function mergeDuplicateFoods(meal) {
  const map = {};
  meal.items.forEach(function (item) {
    if (!map[item.name]) {
      map[item.name] = Object.assign({}, item);
    } else {
      map[item.name].grams   += item.grams;
      map[item.name].kcal    = round1(map[item.name].kcal    + item.kcal);
      map[item.name].protein = round1(map[item.name].protein + item.protein);
      map[item.name].carbs   = round1(map[item.name].carbs   + item.carbs);
      map[item.name].fat     = round1(map[item.name].fat     + item.fat);
      map[item.name].cost    = round2(map[item.name].cost    + item.cost);
    }
  });
  meal.items = Object.values(map);
}

/**
 * Reduce o elimina el item menos eficiente de un meal.
 * Criterio: menor ratio (macros útiles / coste + aportación calórica).
 * Si el item tiene >30 g, lo reduce al 75%. Si tiene ≤30 g, lo elimina.
 *
 * @param {object} meal
 */
function removeLeastUsefulItem(meal) {
  if (!meal || !meal.items || meal.items.length === 0) return;

  let worstIndex = 0;
  let worstScore = Infinity;

  meal.items.forEach(function (item, index) {
    const efficiency = (item.protein * 2 + item.carbs * 0.5 + item.fat * 0.3)
                       / Math.max(item.cost, 0.05);
    const score = efficiency + item.kcal * 0.02;
    if (score < worstScore) {
      worstScore = score;
      worstIndex = index;
    }
  });

  const item = meal.items[worstIndex];
  if (item.grams > 30) {
    const f = 0.75;
    item.grams   = round1(item.grams   * f);
    item.kcal    = round1(item.kcal    * f);
    item.protein = round1(item.protein * f);
    item.carbs   = round1(item.carbs   * f);
    item.fat     = round1(item.fat     * f);
    item.cost    = round2(item.cost    * f);
  } else {
    meal.items.splice(worstIndex, 1);
  }
}

/**
 * Calcula el coste de una cantidad de un alimento.
 * @param {object} food  - entrada con campo .cost (por 100 g)
 * @param {number} grams
 * @returns {number}
 */
function costOf(food, grams) {
  return round2(food.cost * grams / 100);
}

/**
 * Suma el coste de todos los items de un meal.
 * @param {object} meal
 * @returns {number}
 */
function spentMeal(meal) {
  return round2(meal.items.reduce(function (acc, item) {
    return acc + item.cost;
  }, 0));
}

/**
 * Estima el tiempo de preparación del meal.
 * Toma el máximo prep de los items que no son "ready" (requieren cocinar).
 * @param {object} meal
 * @returns {number} minutos
 */
function estimateMealPrep(meal) {
  const prepItems = meal.items.filter(function (x) { return !x.ready; });
  if (prepItems.length === 0) return 0;
  return Math.max.apply(null, prepItems.map(function (x) { return x.prep; }));
}

/**
 * Suma todos los macros y el coste de los items de un meal.
 * @param {object} meal
 * @returns {{ kcal, protein, carbs, fat, cost }}
 */
function getMealTotals(meal) {
  return meal.items.reduce(function (acc, item) {
    acc.kcal    += item.kcal;
    acc.protein += item.protein;
    acc.carbs   += item.carbs;
    acc.fat     += item.fat;
    acc.cost    += item.cost;
    return acc;
  }, { kcal: 0, protein: 0, carbs: 0, fat: 0, cost: 0 });
}

/**
 * Suma los totales de todos los meals del día.
 * @param {object[]} meals
 * @returns {{ kcal, protein, carbs, fat, cost }}
 */
function sumMeals(meals) {
  return meals.reduce(function (acc, meal) {
    const t = getMealTotals(meal);
    acc.kcal    += t.kcal;
    acc.protein += t.protein;
    acc.carbs   += t.carbs;
    acc.fat     += t.fat;
    acc.cost    += t.cost;
    return acc;
  }, { kcal: 0, protein: 0, carbs: 0, fat: 0, cost: 0 });
}
