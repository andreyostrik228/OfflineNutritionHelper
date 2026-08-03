/**
 * poc/core/ingredient-resolver.js
 * ─────────────────────────────────────────────────────────────────────────
 * Resuelve un "role" de ingrediente (ej. "pechuga de pollo") a un producto
 * real concreto de REAL_PRODUCTS, según las reglas de
 * poc/data/ingredient-rules.js.
 *
 * Reglas de fiabilidad (NUNCA se salta ninguna):
 *   1. El producto candidato debe tener needsReview === false.
 *   2. El producto candidato debe tener kcal/protein/carbs/fat != null
 *      (nutrición verificada, nunca inventada).
 *   3. Si la regla define maxProteinPer100g/maxFatPer100g (guarda de
 *      plausibilidad), el candidato debe respetarlos -- protege contra
 *      productos con needsReview=false pero macros implausibles para el
 *      rol (caso real encontrado: "Manzana Golden").
 *   4. Si el rol no tiene regla, o la regla es "unresolved", o el
 *      pinnedProductId no aparece entre los candidatos que sí cumplen
 *      1-3 -> el rol queda SIN RESOLVER explícitamente. Nunca se
 *      sustituye por otro producto "parecido" no verificado.
 *
 * Memoización: cada instancia de IngredientResolver cachea el resultado
 * de cada rol la PRIMERA vez que se resuelve, y devuelve el mismo
 * resultado (misma referencia de producto) en resoluciones posteriores
 * dentro de la misma instancia -- imprescindible para que
 * ShoppingListBuilder pueda agrupar correctamente el mismo producto usado
 * en varias comidas (ver requisito de la fase). Cada generación de plan
 * debe crear una instancia NUEVA.
 * ─────────────────────────────────────────────────────────────────────────
 */

function createIngredientResolver(realProducts, ingredientRules) {
  var cache = new Map();

  function findCandidates(rule) {
    return realProducts.filter(function (p) {
      if (p.category !== rule.category) return false;
      if (rule.leafCategoryAllow && rule.leafCategoryAllow.indexOf(p.leafCategory) === -1) return false;

      var name = String(p.name || "").toLowerCase();

      if (rule.nameIncludeAny) {
        var hasInclude = rule.nameIncludeAny.some(function (kw) { return name.indexOf(kw) !== -1; });
        if (!hasInclude) return false;
      }
      if (rule.nameExcludeAny) {
        var hasExclude = rule.nameExcludeAny.some(function (kw) { return name.indexOf(kw) !== -1; });
        if (hasExclude) return false;
      }
      return true;
    });
  }

  function passesReliability(product, rule) {
    if (product.needsReview !== false) return false;
    if (product.kcal === null || product.kcal === undefined) return false;
    if (product.protein === null || product.carbs === null || product.fat === null) return false;
    if (typeof rule.maxProteinPer100g === "number" && product.protein > rule.maxProteinPer100g) return false;
    if (typeof rule.maxFatPer100g === "number" && product.fat > rule.maxFatPer100g) return false;
    return true;
  }

  function resolveUncached(role) {
    var rule = ingredientRules[role];

    if (!rule) {
      return { status: "unresolved", role: role, reason: "No hay regla de resolución definida para este rol.", candidatesConsidered: [] };
    }

    if (rule.status === "unresolved") {
      return {
        status: "unresolved",
        role: role,
        reason: rule.reason,
        candidatesConsidered: rule.rejectedCandidates || []
      };
    }

    var candidates = findCandidates(rule);
    var reliable = candidates.filter(function (p) { return passesReliability(p, rule); });

    var chosen = null;
    if (rule.pinnedProductId) {
      chosen = reliable.find(function (p) { return String(p.id) === String(rule.pinnedProductId); }) || null;
    } else if (reliable.length === 1) {
      chosen = reliable[0];
    }

    if (!chosen) {
      return {
        status: "unresolved",
        role: role,
        reason: "La regla estaba marcada como resoluble pero el producto fijado (pinnedProductId) no se encontró entre los candidatos fiables en esta ejecución de REAL_PRODUCTS.",
        candidatesConsidered: candidates.map(function (p) { return { id: p.id, name: p.name, needsReview: p.needsReview, kcal: p.kcal }; })
      };
    }

    return { status: "resolved", role: role, product: chosen, note: rule.note || null };
  }

  return {
    resolve: function (role) {
      if (cache.has(role)) return cache.get(role);
      var result = resolveUncached(role);
      cache.set(role, result);
      return result;
    },
    reset: function () {
      cache.clear();
    }
  };
}

module.exports = { createIngredientResolver: createIngredientResolver };
