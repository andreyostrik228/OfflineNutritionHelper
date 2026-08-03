/**
 * poc/core/recipe-builder.js
 * ─────────────────────────────────────────────────────────────────────────
 * Convierte una receta de poc/data/poc-recipes.js en un Meal, resolviendo
 * cada línea de ingrediente contra un IngredientResolver y calculando
 * macros/coste a partir de la nutrición REAL del producto resuelto
 * (kcal/protein/carbs/fat por 100g, convención del pipeline Python/OFF) --
 * nunca de un valor de receta fabricado a mano.
 *
 * Si CUALQUIER línea no resuelve de forma fiable, la receta completa se
 * marca buildable=false: no se construye un Meal con macros a medias
 * (una comida "incompleta" no tiene un total nutricional verdadero).
 * ─────────────────────────────────────────────────────────────────────────
 */

function round1(n) { return Math.round(n * 10) / 10; }
function round2(n) { return Math.round(n * 100) / 100; }

/**
 * @param {object} recipe   - entrada de POC_RECIPES
 * @param {object} resolver - instancia de createIngredientResolver()
 * @returns {object} Meal (buildable=true) o reporte de bloqueo (buildable=false)
 */
function buildMeal(recipe, resolver) {
  var lines = [];
  var unresolved = [];

  recipe.lines.forEach(function (line) {
    var result = resolver.resolve(line.role);
    if (result.status !== "resolved") {
      unresolved.push({ role: line.role, reason: result.reason });
      return;
    }

    var product = result.product;
    var grams = line.qty; // las 8 recetas de esta PoC miden todo en gramos

    lines.push({
      role: line.role,
      productId: product.id,
      productName: product.name,
      brand: product.brand || null,
      grams: grams,
      kcal: round1(product.kcal * grams / 100),
      protein: round1(product.protein * grams / 100),
      carbs: round1(product.carbs * grams / 100),
      fat: round1(product.fat * grams / 100),
      usageCost: round2(product.pricePer100g * grams / 100),
      product: product
    });
  });

  if (unresolved.length > 0) {
    return {
      buildable: false,
      name: recipe.name,
      category: recipe.category,
      unresolved: unresolved,
      resolvedLines: lines
    };
  }

  var total = lines.reduce(function (acc, l) {
    acc.kcal += l.kcal; acc.protein += l.protein; acc.carbs += l.carbs;
    acc.fat += l.fat; acc.cost += l.usageCost;
    return acc;
  }, { kcal: 0, protein: 0, carbs: 0, fat: 0, cost: 0 });

  return {
    buildable: true,
    name: recipe.name,
    category: recipe.category,
    prep: recipe.prep,
    steps: recipe.steps,
    lines: lines,
    total: {
      kcal: round1(total.kcal), protein: round1(total.protein),
      carbs: round1(total.carbs), fat: round1(total.fat), cost: round2(total.cost)
    }
  };
}

/**
 * Escala un Meal ya construido a un factor de ración, recalculando cada
 * línea desde los gramos*factor y la tasa real del producto (no
 * multiplicando el total ya redondeado) -- mismo espíritu que
 * estimateScaledCost/buildMealFromDish del motor actual.
 *
 * @param {object} meal    - salida de buildMeal() con buildable=true
 * @param {number} factor
 * @returns {object} nuevo Meal escalado
 */
function scaleMeal(meal, factor) {
  if (!meal.buildable) return meal;

  var lines = meal.lines.map(function (l) {
    var grams = round1(l.grams * factor);
    var product = l.product;
    return {
      role: l.role, productId: l.productId, productName: l.productName, brand: l.brand,
      grams: grams,
      kcal: round1(product.kcal * grams / 100),
      protein: round1(product.protein * grams / 100),
      carbs: round1(product.carbs * grams / 100),
      fat: round1(product.fat * grams / 100),
      usageCost: round2(product.pricePer100g * grams / 100),
      product: product
    };
  });

  var total = lines.reduce(function (acc, l) {
    acc.kcal += l.kcal; acc.protein += l.protein; acc.carbs += l.carbs;
    acc.fat += l.fat; acc.cost += l.usageCost;
    return acc;
  }, { kcal: 0, protein: 0, carbs: 0, fat: 0, cost: 0 });

  return {
    buildable: true, name: meal.name, category: meal.category, prep: meal.prep, steps: meal.steps,
    scaleFactor: factor, lines: lines,
    total: {
      kcal: round1(total.kcal), protein: round1(total.protein),
      carbs: round1(total.carbs), fat: round1(total.fat), cost: round2(total.cost)
    }
  };
}

module.exports = { buildMeal: buildMeal, scaleMeal: scaleMeal };
