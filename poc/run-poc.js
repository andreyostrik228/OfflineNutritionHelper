/**
 * poc/run-poc.js
 * ─────────────────────────────────────────────────────────────────────────
 * Ejecuta la cadena completa de la prueba de concepto:
 *   receta (poc-recipes.js) -> IngredientResolver -> producto real de
 *   Mercadona (real-products.js, sin modificar) -> KBJU reales ->
 *   escalado de ración -> Meal -> DailyPlan -> ShoppingList
 *
 * No modifica ningún archivo existente. Solo LEE js/data/real-products.js
 * (vía load-real-products.js, en un sandbox de Node) y usa las 8 recetas
 * nuevas de poc-recipes.js.
 *
 * Uso: node poc/run-poc.js
 * ─────────────────────────────────────────────────────────────────────────
 */

var loadRealProducts = require("./core/load-real-products").loadRealProducts;
var createIngredientResolver = require("./core/ingredient-resolver").createIngredientResolver;
var recipeBuilder = require("./core/recipe-builder");
var buildShoppingList = require("./core/shopping-list-builder").buildShoppingList;
var POC_RECIPES = require("./data/poc-recipes").POC_RECIPES;
var INGREDIENT_RULES = require("./data/ingredient-rules").INGREDIENT_RULES;

function line() { console.log("─".repeat(78)); }

function main() {
  var realProducts = loadRealProducts();
  console.log("REAL_PRODUCTS cargado desde js/data/real-products.js: " + realProducts.length + " productos.\n");

  var resolver = createIngredientResolver(realProducts, INGREDIENT_RULES);

  line();
  console.log("1) RECETAS SELECCIONADAS Y RESOLUCIÓN DE INGREDIENTES");
  line();

  var meals = POC_RECIPES.map(function (recipe) {
    return recipeBuilder.buildMeal(recipe, resolver);
  });

  meals.forEach(function (meal, idx) {
    console.log("\n[" + (idx + 1) + "] " + meal.name + " (" + meal.category + ")");
    var recipe = POC_RECIPES[idx];
    recipe.lines.forEach(function (line) {
      var result = resolver.resolve(line.role);
      if (result.status === "resolved") {
        console.log(
          "   OK   " + line.role + " (" + line.qty + "g) -> [" + result.product.id + "] " +
          result.product.name + (result.product.brand ? " (" + result.product.brand + ")" : "")
        );
      } else {
        console.log("   FAIL " + line.role + " (" + line.qty + "g) -> SIN RESOLVER: " + result.reason);
      }
    });

    if (meal.buildable) {
      console.log(
        "   => Meal construida. Total: " + meal.total.kcal + " kcal, P " + meal.total.protein +
        "g / C " + meal.total.carbs + "g / G " + meal.total.fat + "g. Coste de uso: €" + meal.total.cost
      );
    } else {
      console.log("   => Receta BLOQUEADA (ingrediente(s) sin resolver de forma fiable). No se construye Meal.");
    }
  });

  line();
  console.log("2) EJEMPLO DE ESCALADO DE PORCIÓN");
  line();
  var breakfastMeal = meals[1]; // "Pan integral con atún y tomate", buildable
  var scaled = recipeBuilder.scaleMeal(breakfastMeal, 1.5);
  console.log(
    "\n\"" + breakfastMeal.name + "\" a ración base: " + breakfastMeal.total.kcal + " kcal, coste uso €" + breakfastMeal.total.cost
  );
  console.log(
    "Misma receta escalada x1.5 (mismo mecanismo que MAX_PORTION_SCALE del motor actual): " +
    scaled.total.kcal + " kcal, coste uso €" + scaled.total.cost
  );

  line();
  console.log("3) DAILY PLAN (solo las recetas que resolvieron TODOS sus ingredientes)");
  line();
  var buildableMeals = meals.filter(function (m) { return m.buildable; });
  var blockedMeals = meals.filter(function (m) { return !m.buildable; });

  console.log("\nComidas construidas (" + buildableMeals.length + "/" + meals.length + "):");
  buildableMeals.forEach(function (m) {
    console.log("  - " + m.name + " [" + m.category + "]: " + m.total.kcal + " kcal, €" + m.total.cost);
  });

  console.log("\nRecetas bloqueadas (" + blockedMeals.length + "/" + meals.length + "):");
  blockedMeals.forEach(function (m) {
    var roles = m.unresolved.map(function (u) { return u.role; }).join(", ");
    console.log("  - " + m.name + " [" + m.category + "]: bloqueada por -> " + roles);
  });

  var dayTotal = buildableMeals.reduce(function (acc, m) {
    acc.kcal += m.total.kcal; acc.protein += m.total.protein;
    acc.carbs += m.total.carbs; acc.fat += m.total.fat; acc.cost += m.total.cost;
    return acc;
  }, { kcal: 0, protein: 0, carbs: 0, fat: 0, cost: 0 });
  console.log(
    "\nTotal del día (solo comidas construidas): " + Math.round(dayTotal.kcal * 10) / 10 + " kcal, P " +
    Math.round(dayTotal.protein * 10) / 10 + "g / C " + Math.round(dayTotal.carbs * 10) / 10 +
    "g / G " + Math.round(dayTotal.fat * 10) / 10 + "g. Coste de uso total: €" + Math.round(dayTotal.cost * 100) / 100
  );

  line();
  console.log("4) SHOPPING LIST");
  line();
  var shoppingList = buildShoppingList(meals);
  console.log("");
  shoppingList.items.forEach(function (item) {
    var mergedNote = item.usedInMeals.length > 1 ? "  <-- USADO EN " + item.usedInMeals.length + " COMIDAS, agrupado en 1 línea" : "";
    console.log(
      "  [" + item.productId + "] " + item.name + (item.brand ? " (" + item.brand + ")" : "") +
      " -- necesario: " + item.totalGramsNeeded + "g -- envase: " + item.packageLabel +
      " -- comprar: " + item.packagesToBuy + "x -- coste uso: €" + item.usageCost +
      " -- coste compra: €" + item.purchaseCost + mergedNote
    );
    console.log("      usado en: " + item.usedInMeals.join(", "));
  });
  console.log(
    "\nTOTAL coste de uso (continuo): €" + shoppingList.totalUsageCost +
    "\nTOTAL coste de compra (paquetes enteros): €" + shoppingList.totalPurchaseCost
  );

  line();
  console.log("5) INGREDIENTES SIN RESOLVER (nunca sustituidos por un producto al azar)");
  line();
  Object.keys(INGREDIENT_RULES).forEach(function (role) {
    if (INGREDIENT_RULES[role].status !== "unresolved") return;
    var result = resolver.resolve(role);
    console.log("\n- " + role + ": " + result.reason);
  });
}

main();
