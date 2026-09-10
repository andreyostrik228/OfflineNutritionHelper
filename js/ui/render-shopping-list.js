/**
 * js/ui/render-shopping-list.js
 * ─────────────────────────────────────────────────────────────────────────
 * Lista de la compra del plan diario. Agrupa los `items` que ya están en
 * `result.meals` (mismo `name`/`grams` que ya se muestran en las tarjetas
 * de comida) por ingrediente, sumando gramos requeridos ENTRE TOMAS antes
 * de calcular nada de paquete/precio — así el mismo ingrediente usado en
 * desayuno y cena se compra una sola vez, no dos veces por separado.
 *
 * Coste mostrado: usa SIEMPRE purchaseCost, nunca usageCost — comprar un
 * bote de miel de 250g para usar 23g cuesta el bote entero, no una
 * fracción proporcional. Ver la cabecera de js/core/pricing.js para la
 * distinción completa usageCost/purchaseCost/data.budget.
 *
 * El cálculo real (agregación + paquetes + despensa) vive en
 * js/core/budget.js (computeDayPurchaseCost) — el MISMO que usa
 * plan-generator.js para decidir si un plan candidato cabe en el
 * presupuesto de compra del usuario. Nunca dos cálculos independientes:
 * si aquí y en el generador se calculara cada uno por su cuenta, un
 * redondeo o una regla distinta podría hacer que la lista de la compra
 * mostrara un total diferente del que el generador usó para aceptar el
 * plan — este archivo delega en budget.js precisamente para que eso sea
 * estructuralmente imposible.
 *
 * Es una vista de PRESENTACIÓN + agregación: no calcula nutrición, no
 * decide qué platos elegir, no toca dish-selector.js/plan-generator.js.
 *
 * Depende de:
 *   js/core/utils.js   (round0, round1, round2, escapeHtml)
 *   js/core/pricing.js (DEFAULT_STORE_ID, normalizeIngredientKey)
 *   js/core/budget.js  (aggregateMealItems, computeDayPurchaseCost)
 *   js/ui/render.js    (renderProductFindBtn) — opcional: sin él, la lista
 *                      se pinta igual pero sin el botón de ver la foto
 *
 * Inicialización obligatoria:
 *   Llamar a initShoppingListRefs(refs) desde js/app.js antes de usar.
 *
 * Expone (globales):
 *   initShoppingListRefs(refs)
 *   renderShoppingList(meals, storeId, days) - `meals` son ya las tomas de
 *     TODOS los días; `days` solo etiqueta y calcula el coste por día
 * ─────────────────────────────────────────────────────────────────────────
 */

var shoppingPanel, shoppingSummaryEl, shoppingCountEl, shoppingListContainer, shoppingEyebrowEl;

// Ultima lista pintada, en texto. Se guarda al pintar para que compartir no
// tenga que volver a recorrer el DOM ni recalcular precios.
var _ultimaListaTexto = "";

/**
 * Conecta los nodos DOM necesarios para este módulo.
 * @param {object} refs
 */
function initShoppingListRefs(refs) {
  shoppingEyebrowEl = refs.shoppingEyebrowEl || document.getElementById("shoppingEyebrow");
  shoppingPanel = refs.shoppingPanel;
  shoppingSummaryEl = refs.shoppingSummaryEl;
  shoppingCountEl = refs.shoppingCountEl;
  shoppingListContainer = refs.shoppingListContainer;
  cablearAccionesDeLista();
}

/**
 * Botones de "compartir" e "imprimir".
 *
 * `navigator.share` solo existe en movil (y solo bajo HTTPS), asi que el
 * camino de respaldo NO es un mensaje de error: es copiar al portapapeles,
 * que es lo que se quiere en un escritorio. Y si tampoco hay portapapeles,
 * se dice en vez de no hacer nada -- un boton que calla es peor que uno que
 * no esta.
 */
function cablearAccionesDeLista() {
  var compartir = document.getElementById("shareListBtn");
  var imprimir = document.getElementById("printListBtn");
  var nota = document.getElementById("shareListNote");

  function avisar(texto) {
    if (!nota) return;
    nota.textContent = texto;
    nota.hidden = false;
  }

  if (compartir && !compartir._cableado) {
    compartir._cableado = true;
    compartir.addEventListener("click", function () {
      var texto = _ultimaListaTexto;
      if (!texto) { avisar("Genera un plan primero."); return; }
      if (navigator.share) {
        navigator.share({ title: "Lista de la compra", text: texto })
          ["catch"](function () { /* cancelar no es un error */ });
        return;
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(texto)
          .then(function () { avisar("Lista copiada al portapapeles."); })
          ["catch"](function () { avisar("No se pudo copiar la lista."); });
        return;
      }
      avisar("Este navegador no deja compartir ni copiar.");
    });
  }

  if (imprimir && !imprimir._cableado) {
    imprimir._cableado = true;
    imprimir.addEventListener("click", function () { window.print(); });
  }
}

/**
 * Agrupa los items de todas las comidas del día por nombre de ingrediente,
 * sumando gramos REQUERIDOS entre tomas (ej. "Miel" usado en desayuno y
 * cena se convierte en UNA cantidad total ANTES de mirar ningún envase) —
 * delega la agregación en sí a aggregateMealItems() (js/core/budget.js,
 * fuente única de verdad, también usada por plan-generator.js) y solo
 * añade aquí lo que es específico de esta vista: usageCost por ingrediente
 * (dato secundario, nunca el total de la lista) y en qué comidas aparece.
 *
 * @param {object[]} meals - salida de generateDietPlan().meals
 * @returns {{name:string, requiredGrams:number, usageCost:number, meals:string[]}[]}
 */
// ── Compra de varios días (2026-09-01) ──────────────────────────────────
// `days` ya NO multiplica nada: se recibe la lista COMPLETA de tomas de los
// N días, cada uno con sus propios platos, y se agrega por ingrediente como
// siempre. El número solo sirve para etiquetar y para el coste por día.
//
// La primera versión sí multiplicaba las cantidades de un único día. Era lo
// que el usuario NO quería: eso no es una semana de menús, es la misma
// comida siete veces.
var _shoppingDays = 1;

/** @returns {number} días que cubre la lista actual */
function getShoppingDays() { return _shoppingDays; }

/** @param {number} n */
function setShoppingDays(n) {
  var v = Math.round(Number(n));
  if (isFinite(v) && v >= 1 && v <= 30) _shoppingDays = v;
  return _shoppingDays;
}

function aggregateIngredientUsage(meals) {
  var base = aggregateMealItems(meals);

  var usageCostByName = {};
  var mealsByName = {};
  (meals || []).forEach(function (meal) {
    (meal.items || []).forEach(function (item) {
      usageCostByName[item.name] = (usageCostByName[item.name] || 0) + item.cost;
      if (!mealsByName[item.name]) mealsByName[item.name] = [];
      if (mealsByName[item.name].indexOf(meal.label) === -1) mealsByName[item.name].push(meal.label);
    });
  });

  return base.map(function (entry) {
    return {
      name: entry.name,
      requiredGrams: entry.requiredGrams,
      usageCost: usageCostByName[entry.name] || 0,
      meals: mealsByName[entry.name] || []
    };
  });
}

/**
 * Construye la lista de la compra final: para cada ingrediente ya
 * agregado (cantidad total requerida entre todas las tomas), resuelve
 * cuántos paquetes/unidades enteras hay que comprar y su coste real —
 * vía computeDayPurchaseCost() (js/core/budget.js), la MISMA función que
 * plan-generator.js usa para decidir si el plan cabe en presupuesto, así
 * que el total de esta lista y el coste de compra que aceptó el plan son
 * siempre el mismo número, nunca dos cálculos que puedan divergir.
 *
 * @param {object[]} meals
 * @param {string} [storeId]
 * @returns {{name:string, requiredGrams:number, usageCost:number, meals:string[], purchase:object}[]}
 */
function buildShoppingItems(meals, storeId) {
  var usage = aggregateIngredientUsage(meals);
  var dayPurchase = (typeof computeDayPurchaseCost === "function")
    ? computeDayPurchaseCost(meals, storeId)
    : { lines: [] };

  var lineByName = {};
  dayPurchase.lines.forEach(function (line) { lineByName[line.name] = line; });

  return usage
    .map(function (entry) {
      entry.purchase = lineByName[entry.name] || {
        requiredGrams: entry.requiredGrams, usageCost: entry.usageCost, purchaseCost: entry.usageCost,
        hasFixedPackage: false, packagesToBuy: null, packageSizeG: null, packageLabel: null,
        coveredFromPantry: 0, stillNeeded: entry.requiredGrams
      };
      return entry;
    })
    .sort(function (a, b) { return b.purchase.purchaseCost - a.purchase.purchaseCost; });
}

/**
 * Pinta la lista de la compra a partir de las comidas del plan ya
 * generado. El total mostrado es SIEMPRE la suma de purchaseCost (coste
 * real de comprar los paquetes/unidades enteros necesarios), nunca la
 * suma de usageCost. Oculta el panel si no hay ningún ingrediente.
 *
 * @param {object[]} meals - salida de generateDietPlan().meals
 * @param {string} [storeId] - por defecto DEFAULT_STORE_ID (pricing.js)
 */
function renderShoppingList(meals, storeId, days) {
  if (!shoppingPanel || !shoppingListContainer) return;

  if (days !== undefined) setShoppingDays(days);
  var n = getShoppingDays();
  var items = buildShoppingItems(meals || [], storeId);

  if (items.length === 0) {
    shoppingPanel.hidden = true;
    _ultimaListaTexto = "";
    return;
  }

  shoppingPanel.hidden = false;
  // Se prepara AQUI, mientras estan los datos delante, y no al pulsar
  // compartir: asi el boton no depende de volver a leer el DOM.
  _ultimaListaTexto = shoppingListAsText(items, n);
  var notaCompartir = document.getElementById("shareListNote");
  if (notaCompartir) notaCompartir.hidden = true;

  var totalPurchaseCost = items.reduce(function (sum, i) { return sum + i.purchase.purchaseCost; }, 0);
  var totalUsageCost = items.reduce(function (sum, i) { return sum + i.usageCost; }, 0);

  if (shoppingCountEl) shoppingCountEl.textContent = items.length;

  if (shoppingSummaryEl) {
    // Con varios días se añade el coste POR DÍA, que es la cifra que hace
    // ver el ahorro: los paquetes se pagan una vez y se reparten.
    var perDay = n > 1
      ? '<div class="shopping-summary__stat"><span>Por d&iacute;a</span><strong>&euro;' +
        round2(totalPurchaseCost / n) + '</strong></div>'
      : "";
    shoppingSummaryEl.innerHTML =
      '<div class="shopping-summary__stat"><span>Productos</span><strong>' + items.length + '</strong></div>' +
      '<div class="shopping-summary__stat"><span>Coste de compra' + (n > 1 ? " (" + n + " días)" : "") +
        '</span><strong>&euro;' + round2(totalPurchaseCost) + '</strong></div>' +
      perDay +
      '<div class="shopping-summary__stat shopping-summary__stat--muted"><span>' + escapeHtml(t("ui.coste_de_uso")) + '</span><strong>&euro;' + round2(totalUsageCost) + '</strong></div>';
  }

  if (shoppingEyebrowEl) {
    shoppingEyebrowEl.textContent = n > 1
      ? "Cantidades para " + n + " días del mismo plan"
      : "Todo lo que necesitas comprar para el plan de hoy";
  }

  shoppingListContainer.innerHTML = items.map(renderShoppingRow).join("");
}

/**
 * Genera el HTML de una línea de la lista de la compra. Muestra, por
 * separado y con etiqueta explícita:
 *   - cuánto se USA realmente (mismo dato que la tarjeta de comida)
 *   - qué hay que COMPRAR (paquetes/unidades enteras, o "al peso" si el
 *     ingrediente no tiene envase fijo conocido)
 *   - el coste de COMPRA (purchaseCost), como precio principal de la fila
 *
 * @param {{name:string, requiredGrams:number, usageCost:number, meals:string[], purchase:object}} entry
 * @returns {string}
 */
/**
 * Producto real al que apunta un ingrediente, para poder enseñar su ficha
 * (y su foto) en Mercadona desde la lista de la compra.
 *
 * Dos fuentes, en este orden:
 *
 *   1. INGREDIENT_PRODUCT_LINKS (js/data/product-links.js) — el producto
 *      CONCRETO del que sale el precio de ese rol, elegido a mano al
 *      reconstruir los precios contra la API de Mercadona. Trae id, así
 *      que el botón abre la ficha exacta. Cubre 76 de los 83 roles.
 *   2. REAL_INGREDIENT_MATCHES — los 12 emparejamientos verificados por
 *      EAN de 2026-08. Traen EAN pero no id: se busca en el catálogo.
 *      Se conserva como respaldo y porque además alimenta el PRECIO.
 *
 * Antes solo existía (2), así que 71 de 83 ingredientes abrían una
 * BÚSQUEDA con muchos resultados y sin saber cuál era el bueno -- queja
 * literal del usuario el 2026-09-02. Los roles cuyo precio es "estimado"
 * siguen cayendo en la búsqueda a propósito: no salen de ningún producto
 * concreto, y decir "este bote exacto" cuando no se sabe sería peor que
 * decir "esto es lo que buscas".
 *
 * @param {string} ingredientName
 * @returns {{id:(string|null), name:string, brand:(string|null)}}
 */
function resolveShoppingProduct(ingredientName) {
  var out = { id: null, name: ingredientName, brand: null };
  if (typeof normalizeIngredientKey !== "function") return out;
  var key = normalizeIngredientKey(ingredientName);

  if (typeof INGREDIENT_PRODUCT_LINKS !== "undefined" && INGREDIENT_PRODUCT_LINKS[key]) {
    var link = INGREDIENT_PRODUCT_LINKS[key];
    return { id: link.id, name: link.name || ingredientName, brand: null };
  }

  if (typeof REAL_INGREDIENT_MATCHES === "undefined") return out;
  var match = REAL_INGREDIENT_MATCHES[key];
  if (!match) return out;

  if (match.productName) out.name = match.productName;
  if (match.brand) out.brand = match.brand;

  if (match.ean && typeof REAL_PRODUCTS !== "undefined") {
    for (var i = 0; i < REAL_PRODUCTS.length; i++) {
      if (REAL_PRODUCTS[i].ean === match.ean) { out.id = REAL_PRODUCTS[i].id; break; }
    }
  }
  return out;
}

/**
 * La lista de la compra como TEXTO PLANO, para compartir o copiar.
 *
 * Existe porque el momento de uso de esta pantalla es estar de pie en el
 * supermercado, y hasta ahora la lista solo se podia MIRAR en esta pestana:
 * ni enviarsela a alguien, ni pegarla en las notas, ni imprimirla.
 *
 * Es una funcion pura a proposito -- ni toca el DOM ni sabe quien la llama.
 * Asi se puede probar de verdad, que es justo lo que no pasa con el resto de
 * este fichero.
 *
 * Lo que se lleva y lo que no: el nombre, cuanto hay que COMPRAR (paquetes,
 * no gramos usados: es lo unico accionable en la tienda) y el precio. Lo que
 * ya esta en la despensa se marca en vez de omitirse, porque quien lee la
 * lista necesita saber que no se olvido.
 *
 * @param {object[]} items - lo que devuelve buildShoppingItems()
 * @param {number} [dias]  - dias que cubre la compra
 * @returns {string}
 */
function shoppingListAsText(items, dias) {
  var lineas = [];
  var n = (typeof dias === "number" && dias > 1) ? dias : 1;
  lineas.push(n > 1 ? "Lista de la compra (" + n + " dias)" : "Lista de la compra");
  lineas.push("");

  var total = 0;
  (items || []).forEach(function (entry) {
    var p = entry.purchase || {};
    var cantidad;
    if (typeof p.packagesToBuy === "number" && p.packagesToBuy === 0) {
      cantidad = "ya lo tienes";
    } else if (p.hasFixedPackage) {
      var etiqueta = p.packageLabel || "envase";
      var conGramos = !/\d/.test(p.packageLabel || "");
      cantidad = p.packagesToBuy + " x " + etiqueta
        + (conGramos && p.packageSizeG ? " (" + Math.round(p.packageSizeG) + " g)" : "");
    } else {
      cantidad = Math.round(entry.requiredGrams || 0) + " g al peso";
    }
    var precio = (typeof p.purchaseCost === "number") ? p.purchaseCost : 0;
    total += precio;
    lineas.push("- " + entry.name + " — " + cantidad + " — " + precio.toFixed(2) + " EUR");
  });

  lineas.push("");
  lineas.push("Total: " + total.toFixed(2) + " EUR"
    + (n > 1 ? " (" + (total / n).toFixed(2) + " EUR al dia)" : ""));
  return lineas.join("\n");
}

function renderShoppingRow(entry) {
  var p = entry.purchase;
  var usedText = t("ui.usado") + ": " + round0(entry.requiredGrams) + " g";

  var buyText;
  if (typeof p.packagesToBuy === "number" && p.packagesToBuy === 0) {
    // Cubierto por completo por la despensa (pantry.js) — no hace falta
    // comprar nada de este ingrediente hoy.
    buyText = t("ui.ya_tienes_suficiente_en_tu_despensa");
  } else if (p.hasFixedPackage) {
    // `packageLabel` viene de packaging.js y describe el ENVASE tal y como
    // se vende ("docena", "bandeja"): es lo que hay que buscar en la
    // tienda, así que no se traduce.
    var label = p.packageLabel ? escapeHtml(p.packageLabel) : t("ui.envase");
    // Si la etiqueta ya nombra un número de piezas ("docena (12 huevos)"),
    // el "(756 g)" no le dice nada a quien compra -- se omite.
    var withGrams = !/\d/.test(p.packageLabel || "");
    buyText = t("ui.comprar") + ": " + p.packagesToBuy + " &times; " + label +
      (withGrams ? " (" + round0(p.packageSizeG) + "g)" : "");
  } else {
    buyText = t("ui.se_compra_al_peso_sin_envase_fijo");
  }

  // Nota de despensa: solo aparece cuando pantry.js está cargado Y cubre
  // parte (o todo) de este ingrediente — invisible/sin cambio alguno
  // cuando no hay despensa activa.
  var pantryNote = (typeof p.coveredFromPantry === "number" && p.coveredFromPantry > 0)
    ? '<div class="shopping-item__pantry">' + escapeHtml(t("ui.ya_en_tu_despensa")) + ': '
        + round0(p.coveredFromPantry) + ' g</div>'
    : '';

  return (
    '<li class="shopping-item">' +
      '<span class="shopping-item__check" aria-hidden="true"></span>' +
      '<div class="shopping-item__main">' +
        // El nombre se traduce al PINTAR; `entry.name` sigue en español
        // dentro de resolveShoppingProduct(), que lo usa como clave para
        // encontrar el producto real de Mercadona.
        '<div class="shopping-item__name">' + escapeHtml(nombreComida(entry.name)) +
          (typeof renderProductFindBtn === "function"
            ? renderProductFindBtn(resolveShoppingProduct(entry.name)) : "") +
        '</div>' +
        '<div class="shopping-item__meta">' + escapeHtml(usedText) + '</div>' +
        pantryNote +
        '<div class="shopping-item__buy">' + buyText + '</div>' +
      '</div>' +
      '<div class="shopping-item__price">' +
        '&euro;' + round2(p.purchaseCost) +
        (Math.abs(p.purchaseCost - entry.usageCost) > 0.005
          ? '<span class="shopping-item__usage-price">' + escapeHtml(t("ui.coste_de_uso")) + ': &euro;' + round2(entry.usageCost) + '</span>'
          : '') +
      '</div>' +
    '</li>'
  );
}
