/**
 * js/core/nutrition.js
 * ─────────────────────────────────────────────────────────────────────────
 * Motor de nutrición POR INGREDIENTE — kcal/protein/carbs/fat de cada
 * ingrediente vienen de un dato REAL verificado (js/data/
 * ingredient-nutrition.js) cuando existe, nunca del reparto del total del
 * plato por cuota de gramos.
 *
 * ── El bug que esto corrige (2026-08-13d, reportado por el usuario) ──────
 * Antes, `buildMealFromDish()` (dish-selector.js) calculaba el kcal/
 * protein/carbs/fat de CADA ingrediente como
 * `dish.protein * scaleFactor * (ingredient.g / totalItemGrams(dish))` —
 * el macro TOTAL del plato repartido por PESO, no por composición
 * nutricional real. En un plato como "Cacahuetes con plátano"
 * (protein:10, items: Cacahuetes 25g + Plátano 100g), el plátano (80% del
 * peso) se llevaba el 80% de la proteína del plato — proteína que en
 * realidad es del cacahuete, no del plátano. Confirmado con datos reales
 * en la sesión anterior (STATE.md, "Corrección de precio y macros por
 * ingrediente"): el plátano mostraba 11.5g de proteína/13.8g de grasa a
 * escala, biológicamente imposible para una fruta.
 *
 * ── Modelo nuevo: real cuando existe, remanente cuando no ────────────────
 * Para cada ingrediente de un plato:
 *   1. Si `resolveIngredientNutrition()` encuentra un producto real
 *      verificado (js/data/ingredient-nutrition.js) → sus macros son
 *      `pricePer100g-style`: kcal/protein/carbs/fat REALES × gramos/100,
 *      escalado linealmente con la ración — igual que ya hace
 *      `pricing.js` con el precio, nunca "prestados" de otro ingrediente
 *      del mismo plato.
 *   2. Si NO hay dato real verificado (31 de 81 roles, ver
 *      ingredient-nutrition.js para la lista completa con motivo) → NO se
 *      inventa un valor por ingrediente. En su lugar, `computeDish
 *      IngredientNutrition()` calcula el REMANENTE del plato (el total
 *      hand-curated de `dishes.js`, escalado, MENOS lo que ya aportan los
 *      ingredientes reales del mismo plato) y lo reparte por cuota de
 *      gramos SOLO entre los ingredientes sin resolver — nunca diluye ni
 *      resta de un ingrediente que sí tiene dato real. Esto es lo que
 *      soluciona el bug concreto: el cacahuete (resuelto) muestra su
 *      proteína real sin tocar; el plátano (sin resolver) recibe el
 *      remanente, que ya NO incluye la proteína del cacahuete porque esa
 *      se restó primero.
 *   3. `nutritionSource` en cada item resultante marca cuál de los dos
 *      casos aplicó (`'real'` | `'estimated'`) — la UI (render.js) usa
 *      esto para decidir si mostrar el desglose P/C/G de esa fila
 *      (`'real'`) o dejarlo explícitamente sin mostrar (`'estimated'` —
 *      "nutrition unavailable", pedido explícito del usuario: mejor no
 *      mostrar un número que no se puede verificar que mostrar uno con
 *      apariencia de precisión que no tiene).
 *
 * ── Límite conocido y aceptado (no se puede evitar sin inventar datos) ───
 * El remanente de protein/carbs/fat puede salir negativo si los
 * ingredientes YA resueltos de un plato, sumados, superan el total
 * hand-curated de `dishes.js` (los totales de `dishes.js` son
 * estimaciones manuales, nunca se derivaron de datos reales por
 * ingrediente — algo esperable que a veces se queden cortos). Se recorta
 * a 0 (`Math.max(0, ...)`) — nunca un remanente negativo repartido entre
 * los ingredientes sin resolver. Medido sobre las 334 recetas de
 * `dishes.js`: 172/334 platos tienen AL MENOS un macro donde esto ocurre
 * (protein 105, fat 102, kcal 45, carbs 42 — con solape entre ellos).
 * Investigado a fondo en la sesión 2026-08-13e (ver STATE.md, "Auditoría
 * del recorte a cero"): la mayoría son ruido de redondeo de una
 * estimación manual antigua (mediana ~2-5g/kcal de diferencia, incluso en
 * platos 100% resueltos, donde `dishes.js` nunca pudo estar "mal" en el
 * sentido de mezclar ingredientes — simplemente nunca fue una suma
 * exacta). Los peores casos SÍ revelan que `dishes.js` infravaloraba
 * sistemáticamente categorías concretas (conservas en aceite de oliva,
 * frutos secos, pechuga de pavo) — el dato real corrige eso, que es
 * exactamente el propósito de esta migración, no un defecto a evitar.
 * Comportamiento deliberado: los datos reales SIEMPRE ganan sobre la
 * estimación manual antigua, nunca se recortan para que "cuadre" con
 * ella — el total del plato pasa a ser `max(sumaReal, estimaciónAntigua)`
 * por construcción matemática (`resolvedSum + max(0, old-resolvedSum) ≡
 * max(resolvedSum, old)`).
 *
 * ── kcal NUNCA se clampa de forma independiente (corregido 2026-08-13e) ──
 * Primera versión de este archivo (2026-08-13d) trataba kcal como un 4º
 * macro con su propio remanente anclado a `dish.kcal`, igual que protein/
 * carbs/fat. Eso podía producir una fila "estimated" internamente
 * INCONSISTENTE: ej. "Mermelada light" con carbs=11.5g (remanente de
 * `dish.carbs`, no clampado) pero kcal=0 (remanente de `dish.kcal`, sí
 * clampado en ESE plato) — 11.5g de carbohidratos no pueden pesar 0kcal
 * (Atwater: ~46kcal). Medido: 99 filas "estimated" con kcal inconsistente
 * con sus propios protein/carbs/fat por más de 20kcal. Corregido: el
 * kcal de un ingrediente SIN resolver ya NO tiene su propio remanente ni
 * usa `dish.kcal` en absoluto — se DERIVA por Atwater
 * (`protein×4 + carbs×4 + fat×9`) de su propio remanente de protein/
 * carbs/fat, ya calculado. Esto garantiza consistencia interna SIEMPRE
 * para la parte estimada, y de paso deja de depender de `dish.kcal` —el
 * campo menos fiable del dataset, ver known issue #1 en STATE.md ("solo
 * 54/204 platos tenían kcal dentro de 20kcal de su propio Atwater").
 * Los ingredientes RESUELTOS siguen usando el kcal REAL del producto tal
 * cual (nunca recalculado por Atwater — es dato verificado, no una
 * estimación que necesite reconciliarse).
 *
 * Depende de:
 *   js/core/pricing.js              (normalizeIngredientKey)
 *   js/data/ingredient-nutrition.js (INGREDIENT_NUTRITION)
 *
 * Expone (globales):
 *   resolveIngredientNutrition(name) →
 *     { resolved:true,  kcal, protein, carbs, fat, productName, ean, matchMethod, displayName } |
 *     { resolved:false, reason, detail, displayName }
 *   computeDishIngredientNutrition(dish, scaleFactor) →
 *     [{ name, grams, kcal, protein, carbs, fat, nutritionSource:'real'|'estimated' }]
 *     (mismo orden que dish.items; grams SIN redondear, igual que el resto
 *     del pipeline hace antes de Math.round en buildMealFromDish)
 * ─────────────────────────────────────────────────────────────────────────
 */

/**
 * Resuelve la nutrición real de un ingrediente por su nombre tal como
 * aparece en dishes.js. Nunca inventa un valor: si el rol no está en
 * INGREDIENT_NUTRITION (no debería pasar, los 81 roles actuales de
 * dishes.js están cubiertos) o está explícitamente sin resolver, devuelve
 * `resolved:false` con el motivo.
 *
 * @param {string} name
 * @returns {{resolved:boolean, kcal?:number, protein?:number, carbs?:number, fat?:number, productName?:string, ean?:string, matchMethod?:string, reason?:string, detail?:string, displayName:string}}
 */
function resolveIngredientNutrition(name) {
  var key = normalizeIngredientKey(name);
  var entry = (typeof INGREDIENT_NUTRITION !== "undefined") ? INGREDIENT_NUTRITION[key] : undefined;
  if (!entry) {
    return { resolved: false, reason: "no_data", detail: "Ingrediente no auditado en INGREDIENT_NUTRITION.", displayName: name };
  }
  return entry;
}

/**
 * Calcula kcal/protein/carbs/fat de CADA ingrediente de un plato a una
 * escala dada — real cuando hay dato verificado, remanente repartido solo
 * entre los ingredientes sin resolver en caso contrario. Ver cabecera del
 * archivo para el modelo completo, incluida la corrección 2026-08-13e
 * (kcal ya no es un remanente independiente, se deriva por Atwater).
 *
 * @param {object} dish        - entrada de DISH_DB (items en {name, g})
 * @param {number} scaleFactor - factor de escala de ración (1 = nativo)
 * @returns {{name:string, grams:number, kcal:number, protein:number, carbs:number, fat:number, nutritionSource:'real'|'estimated'}[]}
 */
function computeDishIngredientNutrition(dish, scaleFactor) {
  var items = dish.items || [];

  var results = items.map(function (ingredient) {
    var nutrition = resolveIngredientNutrition(ingredient.name);
    var grams = ingredient.g * scaleFactor;

    if (nutrition.resolved) {
      return {
        name: ingredient.name,
        grams: grams,
        // kcal REAL del producto, tal cual -- nunca recalculado por
        // Atwater (es dato verificado, no una estimación).
        kcal:    nutrition.kcal    * grams / 100,
        protein: nutrition.protein * grams / 100,
        carbs:   nutrition.carbs   * grams / 100,
        fat:     nutrition.fat     * grams / 100,
        nutritionSource: "real"
      };
    }

    // Sin resolver todavía -- se completa en la segunda pasada, con el
    // remanente. ingredientG (nativo, SIN escalar) es lo que decide su
    // cuota dentro del remanente -- coherente con cómo el reparto antiguo
    // usaba ingredient.g, no grams ya escalados (da igual para el reparto
    // proporcional, pero mantiene el mismo criterio de siempre).
    return { name: ingredient.name, grams: grams, ingredientG: ingredient.g, nutritionSource: "estimated" };
  });

  // El remanente SOLO existe para protein/carbs/fat -- dish.kcal ya no se
  // usa aquí en absoluto (ver "kcal NUNCA se clampa de forma
  // independiente" en la cabecera del archivo).
  var resolvedTotals = results.reduce(function (acc, r) {
    if (r.nutritionSource === "real") {
      acc.protein += r.protein; acc.carbs += r.carbs; acc.fat += r.fat;
    }
    return acc;
  }, { protein: 0, carbs: 0, fat: 0 });

  var remainder = {
    protein: Math.max(0, (dish.protein || 0) * scaleFactor - resolvedTotals.protein),
    carbs:   Math.max(0, (dish.carbs   || 0) * scaleFactor - resolvedTotals.carbs),
    fat:     Math.max(0, (dish.fat     || 0) * scaleFactor - resolvedTotals.fat)
  };

  var unresolvedTotalG = results.reduce(function (sum, r) {
    return sum + (r.nutritionSource === "estimated" ? r.ingredientG : 0);
  }, 0);

  results.forEach(function (r) {
    if (r.nutritionSource !== "estimated") return;
    var share = unresolvedTotalG > 0 ? (r.ingredientG / unresolvedTotalG) : 0;
    r.protein = remainder.protein * share;
    r.carbs   = remainder.carbs   * share;
    r.fat     = remainder.fat     * share;
    // kcal DERIVADO por Atwater de los macros que ya se acaban de fijar
    // arriba -- garantiza que esta fila sea internamente consistente
    // consigo misma (nunca "0 kcal pero 11.5g de carbohidratos").
    r.kcal    = r.protein * 4 + r.carbs * 4 + r.fat * 9;
    delete r.ingredientG;
  });

  return results;
}
