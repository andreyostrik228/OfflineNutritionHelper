/**
 * js/data/prices/mercadona.js
 * ─────────────────────────────────────────────────────────────────────────
 * Catálogo de precios de MERCADONA — un supermercado, un archivo.
 *
 * Este archivo NO conoce los platos de dishes.js ni el algoritmo del
 * generador. Solo asocia nombres de ingrediente (tal y como aparecen en
 * dishes.js) con un precio de referencia por 100 g en este supermercado.
 *
 * ORIGEN DE ESTOS PRECIOS (actualizado tras ampliar DISH_DB con 130 platos
 * nuevos y 17 ingredientes nuevos):
 *   45 de los 82 ingredientes están calculados a partir de un catálogo real
 *   exportado de Mercadona (4374 productos, con precio y tabla nutricional
 *   propios de cada producto). Cada entrada marcada "// real: ..." indica
 *   el producto exacto usado como fuente y su precio/100g ya convertido:
 *     - Para legumbres/arroz/pasta secos que dishes.js mide en peso YA
 *       COCIDO, se aplicó un factor de cocción (arroz/pasta ×2.3-2.8,
 *       legumbres ×2.3) para que el precio por 100g sea el del producto
 *       COCIDO, no el seco.
 *     - Para huevos (vendidos por unidad), se asumió 63 g/huevo grande.
 *     - Se DESCARTARON deliberadamente coincidencias de nombre que no son
 *       nutricionalmente representativas del ingrediente genérico (p.ej.
 *       "salmón ahumado" para "salmon" [producto curado premium, no
 *       fresco], "plátano macho" para "platano" [variedad para cocinar,
 *       no el plátano dulce de mesa], "espinacas baby lavadas" para
 *       "espinacas" [formato premium en bolsa, precio no representativo]).
 *       En esos casos se conserva el precio estimado que ya existía.
 *
 *   Los 37 ingredientes restantes siguen en precio ESTIMADO (marcados
 *   "// estimado") porque el catálogo real no tenía ningún producto que
 *   representase razonablemente el ingrediente genérico usado en
 *   dishes.js (0 resultados, o solo variantes no comparables).
 *
 * Para añadir otro supermercado en el futuro (Lidl, Carrefour, Aldi, DIA...):
 *   1. Copiar este archivo como js/data/prices/<tienda>.js
 *   2. Cambiar storeId / storeName / pricesPer100g
 *   3. Añadir <script src="js/data/prices/<tienda>.js"> en index.html
 *      (después de este archivo, en cualquier orden entre catálogos)
 *   4. Nada más. js/core/pricing.js, js/engine/dish-selector.js y
 *      js/engine/plan-generator.js no necesitan ningún cambio: leen el
 *      catálogo activo por storeId, sea cual sea.
 *
 * Unidad de todos los precios: €/100 g del ingrediente TAL COMO SE USA EN
 * LA RECETA — es decir, ya cocido para arroz/pasta/legumbres/cuscús/quinoa
 * (el peso en dishes.js es el peso cocido), y en crudo/tal cual para el
 * resto (carnes, pescados, huevos, lácteos, fruta, verdura, frutos secos).
 *
 * Las claves están normalizadas con normalizeIngredientKey() de
 * js/core/pricing.js (minúsculas, sin acentos, sin puntuación, espacios
 * colapsados) — deben coincidir exactamente con esa normalización.
 *
 * Depende de: nada (se autoregistra en PRICE_CATALOGS)
 * Consumido por: js/core/pricing.js
 * ─────────────────────────────────────────────────────────────────────────
 */

// Registro global de catálogos de precios, uno por supermercado.
// Cada archivo de tienda se autoregistra aquí — este patrón es lo que
// permite añadir tiendas nuevas sin tocar ningún otro archivo.
var PRICE_CATALOGS = (typeof PRICE_CATALOGS === "undefined") ? {} : PRICE_CATALOGS;

PRICE_CATALOGS.mercadona = {
  storeId:      "mercadona",
  storeName:    "Mercadona",
  currency:     "EUR",
  referenceDate: "2026-09",
  sourceNote:
    "Refrescado el 2026-09-01 contra el catálogo recién scrapeado de la " +
    "API de Mercadona: 38 de las 47 líneas 'real:' se re-derivaron " +
    "automáticamente (mismo producto que nombra cada comentario, mismo " +
    "factor de cocción), y 33 habían cambiado de precio. Las 9 restantes " +
    "se dejaron INTACTAS a propósito: 6 son ingredientes 'cocidos' cuyo " +
    "comentario no declara el factor de expansión (aplicar 1 habría puesto " +
    "el precio del producto SECO donde va el cocido: 'arroz integral " +
    "cocido' saltaba de 0,04 a 0,12) y 3 no tienen coincidencia clara de " +
    "nombre. Las líneas 'estimado' no salieron de ningún producto, así que " +
    "no hay nada que refrescar en ellas. Sustituir por una fuente " +
    "verificada en tiempo real antes de un uso con implicaciones " +
    "económicas reales para el usuario.",

  // €/100 g — ver nota de unidad arriba
  pricesPer100g: {
    "aguacate":                     0.5,  // real: Aguacates
    "almendras":                    1.15,  // real: Almendra natural Hacendado sin piel
    "alubias cocidas":              0.1065,  // real: Alubia blanca Hacendado (seca ×2.3 = cocida)
    "arroz blanco cocido":          0.0429,  // real: Arroz largo Hacendado (seco ×2.8 = cocido)
    "arroz integral cocido":        0.04,  // real: Arroz largo Hacendado (sin integral específico en catálogo)
    "atun al natural":              0.65,  // estimado (solo hay "en aceite"/"en escabeche", grasa distinta)
    "avena":                        0.11,  // estimado (sin avena sola con BJU completo)
    "bacalao":                      0.85,  // estimado (único resultado es ahumado en aceite)
    "batata":                       0.16,  // estimado (único resultado es porción lista microondas)
    "brocoli":                      0.16,  // estimado (0 resultados con BJU completo)
    // Aceite de oliva (2026-08-26): 4,95 EUR el litro. OJO, el catálogo
    // trae pricePer100g=0,495, que en realidad es por 100 ML. Un litro pesa
    // 916 g, así que por 100 G son 4,95 / 9,16 = 0,54. Misma trampa de
    // unidades que en la nutrición, ver ingredient-nutrition.js.
    "aceite de oliva":              0.54,
    // Cebolla y ajo (2026-08-26): el PRECIO sí es dato real y verificable,
    // aunque su nutrición esté sin resolver (ver ingredient-nutrition.js).
    "ajo":                          0.74,  // real: Ajos morados (250 g, 1,85 EUR)
    "cebolla":                      0.18,  // real: Cebollas (1 kg, 2,40 EUR)  // real: Aceite de oliva virgen extra Hacendado (1 L)
    "caballa en lata":              1.0833,  // real: Filetes de caballa del sur en tomate Hacendado
    "cacahuetes":                   0.4125,  // real: Cacahuete tostado con sal Hacendado
    "carne picada 5% grasa":        0.8,  // real: Preparado de carne picada vacuno y cerdo
    "claras de huevo":              0.285,  // real: Claras de huevo líquidas pasteurizadas
    "copos de maiz":                0.6,  // real: Cereales copos de maíz Corn Flakes Kellogg's
    "cuscus cocido":                0.08,  // estimado (0 resultados)
    "edamame":                      0.45,  // estimado (0 resultados)
    "espinacas":                    0.18,  // estimado (único resultado es baby spinach premium en bolsa)
    "frutos rojos congelados":      0.40,  // estimado (único resultado es infusión, no fruta)
    "garbanzos cocidos":            0.25,  // real: Garbanzo cocido Hacendado (ya viene cocido)
    "granola":                      0.60,  // real: Cereales y semillas granola Hacendado con frutos secos
    "huevos enteros":               0.56,  // real: Huevos de gallinas camperas (63g/huevo)
    "hummus":                       0.65,  // estimado (0 resultados)
    "jamon cocido extra":           0.77,  // real: Jamón cocido extra Hacendado finas lonchas
    "leche semidesnatada":          0.084,  // real: Leche semidesnatada Hacendado
    "lechuga pepino":               0.15,  // estimado (lechuga por unidad, pepino sin resultados)
    "lentejas cocidas":             0.09,  // real: Lenteja Hacendado (seca ×2.3 = cocida)
    "lomo de cerdo":                0.6299,  // real: Filetes lomo de cerdo
    "mantequilla de cacahuete":     1.00,  // estimado (0 resultados exactos fiables)
    "manzana":                      0.22,  // real: Manzanas Golden
    "maiz dulce":                   0.3444,  // real: Maíz dulce Hacendado
    "merluza":                      1.1504,  // real: Merluza a rodajas
    "mermelada light":              0.45,  // estimado (no hay versión light específica)
    "miel":                         0.84,  // real: Miel de naranjo Hacendado
    "mozzarella light":             0.80,  // estimado (único resultado es mozzarella normal, no light)
    "muslo de pollo deshuesado":    0.35,  // estimado (0 resultados)
    "naranja":                      0.25,  // real: Naranja de mesa
    "nueces":                       1.25,  // real: Nuez natural Hacendado pelada
    "pan de molde integral":        0.1957,  // real: Pan de molde 100% integral Hacendado
    "pan integral":                 0.4286,  // real: Pan integral trigo 100%
    "pasta cocida":                 0.0696,  // real: Pasta tiburón Hacendado (seca ×2.3 = cocida)
    "patata cocida":                0.29,  // real: Patatas cocidas Hacendado (ya viene cocida)
    "pavo loncheado":               0.7625,  // real: Maxi pavo Hacendado finas lonchas
    "pechuga de pavo":              0.8746,  // real: Filetes pechuga de pavo
    "pechuga de pollo":             0.7304,  // real: Filetes pechuga de pollo
    "pepino":                       0.12,  // estimado (0 resultados)
    "pina":                         0.2555,  // real: Piña en su jugo Hacendado rodajas
    "platano":                      0.12,  // estimado (único resultado es plátano macho, otra variedad)
    "queso fresco batido 0%":       0.20,  // estimado (0 resultados)
    "queso light":                  0.70,  // estimado (0 resultados)
    "quinoa cocida":                0.13,  // estimado (0 resultados)
    "requeson":                     0.5,  // real: Requesón mezcla Hacendado
    "salmon":                       0.95,  // estimado (único resultado es ahumado, no representativo)
    "sardinas en lata":             0.9402,  // real: Sardinas en aceite de oliva Hacendado
    "skyr natural":                 0.42,  // estimado (0 resultados)
    "tempeh":                       1.80,  // estimado (0 resultados)
    "ternera magra":                0.85,  // estimado (único resultado es callos, no representativo)
    "tofu firme":                   0.4375,  // real: Tofu firme Hacendado
    "tomate":                       0.125,  // real: Tomate triturado Hacendado
    "tortillas de trigo":           0.40,  // estimado (único resultado "Wraps Texas", BJU distinto)
    "tortitas de arroz":            0.95,  // estimado (0 resultados de versión simple sin chocolate)
    "verduras congeladas salteado": 0.15,  // estimado (0 resultados)
    "wrap proteico":                0.75,  // estimado (0 resultados)
    "yogur griego ligero":          0.1933,  // real: Yogur griego natural ligero Hacendado
    "zanahoria":                    0.12,  // real: Zanahorias

    // Añadidos en la ampliación de DISH_DB (más variedad de ingredientes)
    "conejo":                       0.94,  // real: Medio conejo troceado
    "jamon serrano":                2.5,  // real: Jamón serrano cortado a máquina
    "solomillo de ternera":         4.1404,  // real: Solomillo de vacuno
    "lubina":                       2.25,  // real: Filete de lubina
    "rape":                         1.80,  // estimado (sin match real, pescado blanco similar a merluza/bacalao)
    "gamba cocida":                 2.32,  // real: Gamba cocida
    "langostino cocido":            1.10,  // real: Langostino cocido
    "pavo picado":                  0.90,  // estimado (sin match real, similar a otros picados de ave)
    "champinones":                  0.4,  // real: Champiñón laminado Hacendado
    "calabacin":                    0.20,  // estimado (verdura fresca genérica)
    "pimiento":                     0.25,  // estimado (verdura fresca genérica)
    "coliflor":                     0.20,  // estimado (verdura fresca genérica)
    "queso curado":                 2.0111,  // real: Queso curado DOP manchego de oveja Hacendado
    "pan de centeno":               0.35,  // estimado (similar a pan integral)
    "trigo sarraceno cocido":       0.15,  // estimado (similar a quinoa/cuscús, factor de cocción ya aplicado)
    "kiwi":                         0.35,  // estimado (fruta fresca genérica)
    "fresas":                       0.30   // estimado (fruta fresca genérica)
  }
};