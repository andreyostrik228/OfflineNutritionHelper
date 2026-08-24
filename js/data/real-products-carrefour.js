/**
 * js/data/real-products-carrefour.js
 * -----------------------------------------------------------------------
 * Catálogo REAL de productos de Carrefour (nombre, marca, precio,
 * tamaño de envase) generado desde el pipeline Python en
 * PycharmProjects/PythonProject/database/carrefour.db.json, vía
 * scripts/export_real_products.py.
 *
 * Mismo esquema y mismas reglas que js/data/real-products.js
 * (Mercadona) -- kcal/protein/carbs/fat son null cuando el producto no
 * tiene nutrición completa verificada, nunca se inventa un valor.
 * Se auto-registra en REAL_PRODUCTS_CATALOGS (mismo patrón que
 * PRICE_CATALOGS, ver js/data/prices/mercadona.js).
 *
 * NO regenerar a mano -- volver a ejecutar
 * scripts/export_real_products.py si el catálogo Python cambia.
 * -----------------------------------------------------------------------
 */

var REAL_PRODUCTS_CATALOGS = (typeof REAL_PRODUCTS_CATALOGS === "undefined") ? {} : REAL_PRODUCTS_CATALOGS;
REAL_PRODUCTS_CATALOGS.carrefour = [];
