/**
 * js/ui/render-real-products.js
 * ─────────────────────────────────────────────────────────────────────────
 * Renderiza el catálogo de productos reales verificados (js/data/real-
 * products.js) con búsqueda por nombre/marca. Independiente del motor de
 * platos (dish-selector.js / plan-generator.js) — solo lee REAL_PRODUCTS
 * y pinta tarjetas, no participa en la generación del plan.
 *
 * Depende de:
 *   js/core/pricing.js       (getRealProductsForStore, DEFAULT_STORE_ID)
 *   js/core/utils.js         (round0, round1, round2, escapeHtml)
 *
 * Inicialización obligatoria:
 *   Llamar a initRealProductsRefs(refs) desde js/app.js antes de usar.
 *
 * ── Selector de tienda: RETIRADO (2026-08-25) ─────────────────────────
 * El catálogo se resuelve siempre contra DEFAULT_STORE_ID. Se sigue
 * leyendo vía getRealProductsForStore() en vez de la global REAL_PRODUCTS
 * a propósito: así el día que vuelva un selector basta con volver a
 * pasarle una tienda, sin tocar el resto del render.
 *
 * Expone (globales):
 *   initRealProductsRefs(refs)
 *   initRealProductsPanel()   – primer render + listener de búsqueda
 * ─────────────────────────────────────────────────────────────────────────
 */

var verifiedGrid, verifiedCount, verifiedSearchInput, verifiedEmpty, verifiedEmptyQuery;

/**
 * @returns {string} tienda por defecto -- ya no hay selector (2026-08-25).
 */
function getCurrentStoreId() {
  return (typeof DEFAULT_STORE_ID !== "undefined") ? DEFAULT_STORE_ID : "mercadona";
}

/**
 * @returns {object[]} catálogo de la tienda por defecto.
 */
function getActiveRealProducts() {
  return (typeof getRealProductsForStore === "function")
    ? getRealProductsForStore(getCurrentStoreId())
    : (typeof REAL_PRODUCTS !== "undefined" ? REAL_PRODUCTS : []);
}

// Por encima de esto, mostrar todos los resultados de golpe deja de tener
// sentido (rendimiento de DOM + usabilidad) — se pide afinar la búsqueda.
var MAX_RENDERED_PRODUCTS = 90;

/**
 * Conecta los nodos DOM necesarios para este módulo.
 * @param {object} refs
 */
function initRealProductsRefs(refs) {
  verifiedGrid = refs.verifiedGrid;
  verifiedCount = refs.verifiedCount;
  verifiedSearchInput = refs.verifiedSearchInput;
  verifiedEmpty = refs.verifiedEmpty;
  verifiedEmptyQuery = refs.verifiedEmptyQuery;
}

/**
 * Normaliza texto para búsqueda: minúsculas, sin acentos.
 * Copia deliberadamente pequeña e independiente de la del motor de
 * platos (dish-selector.js) — este panel no depende de él.
 * @param {string} text
 * @returns {string}
 */
var DIACRITICS_PATTERN = new RegExp("[̀-ͯ]", "g");

function normalizeSearchText(text) {
  return String(text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(DIACRITICS_PATTERN, "");
}

/**
 * Primer render (sin búsqueda) + engancha el listener del input.
 * Llamar una vez desde app.js tras initRealProductsRefs().
 */
function initRealProductsPanel() {
  if (!verifiedGrid) return;

  renderCurrentSearch();

  if (verifiedSearchInput) {
    verifiedSearchInput.addEventListener("input", function () {
      handleRealProductsSearch(verifiedSearchInput.value);
    });
  }

}

/**
 * Vuelve a pintar con lo que haya en el input de búsqueda ahora mismo
 * (o el catálogo completo si está vacío) -- extraído para poder
 * llamarlo tanto en el primer render como al cambiar de tienda, sin
 * duplicar la lógica de "sin búsqueda -> catálogo completo".
 */
function renderCurrentSearch() {
  handleRealProductsSearch(verifiedSearchInput ? verifiedSearchInput.value : "");
}

/**
 * Filtra el catálogo de la tienda activa por texto (nombre o marca) y
 * renderiza.
 * @param {string} query
 */
function handleRealProductsSearch(query) {
  var products = getActiveRealProducts();
  if (verifiedCount) verifiedCount.textContent = products.length;

  var trimmed = query.trim();

  if (!trimmed) {
    renderRealProducts(products.slice(0, MAX_RENDERED_PRODUCTS), "");
    return;
  }

  var needle = normalizeSearchText(trimmed);

  var matches = products.filter(function (p) {
    var haystack = normalizeSearchText((p.name || "") + " " + (p.brand || ""));
    return haystack.indexOf(needle) !== -1;
  });

  renderRealProducts(matches.slice(0, MAX_RENDERED_PRODUCTS), trimmed, matches.length);
}

/**
 * Pinta la rejilla de tarjetas de producto.
 * @param {object[]} products    – ya recortado a MAX_RENDERED_PRODUCTS
 * @param {string} query         – término de búsqueda activo ("" si no hay)
 * @param {number} [totalMatches] – total de coincidencias antes de recortar
 */
function renderRealProducts(products, query, totalMatches) {
  if (!verifiedGrid) return;

  if (products.length === 0) {
    verifiedGrid.innerHTML = "";
    if (verifiedEmpty) {
      verifiedEmpty.hidden = false;
      if (verifiedEmptyQuery) verifiedEmptyQuery.textContent = query;
    }
    return;
  }

  if (verifiedEmpty) verifiedEmpty.hidden = true;

  var html = products.map(renderProductCard).join("");

  var total = typeof totalMatches === "number" ? totalMatches : products.length;
  if (total > products.length) {
    html +=
      '<div class="verified-card verified-card--more">' +
        "Mostrando " + products.length + " de " + total + " resultados &mdash; afina la b&uacute;squeda para ver el resto." +
      "</div>";
  }

  verifiedGrid.innerHTML = html;
}

/**
 * Genera el HTML de una tarjeta de producto real.
 *
 * El catálogo ahora prioriza VARIEDAD (2769 productos alimentarios reales)
 * por encima de tener nutrición completa (solo ~1877 de esos la tienen).
 * Por eso la fila de macros solo se pinta cuando hay datos — nada de una
 * fila de guiones "—/—/—/—" repetida en la mayoría de tarjetas. La
 * insignia de confianza también es honesta sobre qué se sabe de verdad de
 * cada producto, no solo "EAN" para todo.
 *
 * @param {object} p – entrada de REAL_PRODUCTS
 * @returns {string}
 */
function renderProductCard(p) {
  var priceLine = p.pricePer100g != null
    ? "&euro;" + round2(p.pricePer100g) + " / 100g"
    : (p.price != null ? "&euro;" + round2(p.price) + (p.size ? " (" + p.size + " " + (p.sizeUnit || "") + ")" : "") : "");

  var macrosBlock = p.kcal != null
    ? (
      '<div class="verified-card__macros">' +
        '<div><span>Kcal</span><strong>' + round0(p.kcal) + '</strong></div>' +
        '<div><span>Prote&iacute;na</span><strong>' + round1(p.protein) + 'g</strong></div>' +
        '<div><span>Carbos</span><strong>' + round1(p.carbs) + 'g</strong></div>' +
        '<div><span>Grasas</span><strong>' + round1(p.fat) + 'g</strong></div>' +
      '</div>'
    )
    : '<div class="verified-card__no-nutrition">Sin datos nutricionales</div>';

  var findBtn = typeof renderProductFindBtn === "function" ? renderProductFindBtn(p) : "";

  return (
    '<div class="verified-card">' +
      '<div class="verified-card__head">' +
        '<div class="verified-card__name">' + escapeHtml(p.name) + findBtn + '</div>' +
        (p.brand ? '<div class="verified-card__brand">' + escapeHtml(p.brand) + '</div>' : '') +
      '</div>' +
      macrosBlock +
      '<div class="verified-card__footer">' +
        '<span class="verified-card__price">' + priceLine + '</span>' +
        renderConfidenceBadge(p) +
      '</div>' +
    '</div>'
  );
}

/**
 * Insignia honesta sobre qué tan fiable es la nutrición de este producto
 * (o si simplemente no se sabe). Nunca dice "verificado" para algo que no
 * lo está.
 * @param {object} p
 * @returns {string}
 */
function renderConfidenceBadge(p) {
  if (p.nutritionSource === "openfoodfacts_ean") {
    return '<span class="verified-card__badge verified-card__badge--ean">EAN &#10003;</span>';
  }
  if (p.nutritionSource === "openfoodfacts_name") {
    return '<span class="verified-card__badge">' + escapeHtml(p.nutritionConfidence || "estimado") + '</span>';
  }
  return "";
}
