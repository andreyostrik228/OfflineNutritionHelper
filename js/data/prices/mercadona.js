/**
 * js/data/prices/mercadona.js
 * ─────────────────────────────────────────────────────────────────────────
 * Catálogo de precios de MERCADONA — un supermercado, un archivo.
 *
 * Este archivo NO conoce los platos de dishes.js ni el algoritmo del
 * generador. Solo asocia nombres de ingrediente (tal y como aparecen en
 * dishes.js) con un precio de referencia por 100 g en este supermercado.
 *
 * ORIGEN DE ESTOS PRECIOS (reconstruido el 2026-09-01 desde la API EN VIVO
 * de Mercadona para el almacén de GRANADA — CP 18012, almacén wh 3968):
 *   Cada ingrediente se mapeó A MANO a un producto real concreto (mirando
 *   el catálogo, no por coincidencia de nombre — eso fue lo que metió
 *   "champiñones = en conserva" una vez). El precio/100 g sale del
 *   reference_price de ese producto:
 *     - €/kg  -> /10                       = €/100 g
 *     - €/L   -> /10  (/0,916 para aceite) = €/100 g
 *     - huevos: precio de la docena / 12 / 63 g * 100  (huevo grande L)
 *     - arroz/pasta/legumbres: dishes.js los pesa YA COCIDOS, así que se
 *       compra el SECO y se divide por el factor de cocción (arroz/cuscús
 *       ×2.8, pasta/legumbres ×2.3).
 *
 *   Siguen en ESTIMADO ("// estimado") solo los que Mercadona no vende como
 *   producto genérico razonable: skyr, tempeh, trigo sarraceno, tortillas
 *   de trigo/wraps, pavo picado, atún al natural (peso escurrido), y un par
 *   de claves combinadas de dishes.js ("lechuga pepino").
 *
 *   Nota: los precios de Granada son casi idénticos a los del almacén por
 *   defecto de la API — Mercadona es bastante uniforme a nivel nacional.
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
  referenceDate: "2026-09-Granada",
  sourceNote:
    "Reconstruido el 2026-09-01 contra el catalogo EN VIVO de la API de " +
    "Mercadona para el almacen de GRANADA (codigo postal 18012, wh 3968). " +
    "Cada ingrediente se mapeo a mano a un producto real y el precio/100 g " +
    "sale de su reference_price (EUR/kg -> /10; huevos por docena -> /12/63 g; " +
    "aceite EUR/L / 0,916). Arroz/pasta/legumbres se compran secos y se " +
    "dividen por el factor de coccion porque dishes.js los pesa cocidos. " +
    "Siguen ESTIMADOS los que Mercadona no vende como producto generico " +
    "(skyr, tempeh, trigo sarraceno, wraps, pavo picado). Sustituir por una " +
    "fuente en tiempo real antes de un uso con implicaciones economicas.",

  // €/100 g — ver nota de unidad arriba
  pricesPer100g: {
    "aguacate":                      0.5,  // real: Aguacate (Granada wh 3968)
    "almendras":                     1.15,  // real: Almendra natural Hacendado (Granada wh 3968)
    "alubias cocidas":               0.1065,  // real: Alubia blanca Hacendado (seca ×2.3 = cocida) (Granada wh 3968)
    "arroz blanco cocido":           0.0429,  // real: Arroz largo Hacendado (seco ×2.8 = cocido) (Granada wh 3968)
    "arroz integral cocido":         0.0589,  // real: Arroz integral largo Hacendado (seco ×2.8 = cocido) (Granada wh 3968)
    "atun al natural":               0.9,  // estimado -- Atun claro al natural ~11,7 EUR/kg bruto; escurrido ~70%
    "avena":                         0.1625,  // real: Copos de avena Brüggen (Granada wh 3968)
    "bacalao":                       1.9734,  // real: Filetes de bacalao MareDeus ultracongelado (Granada wh 3968)
    "batata":                        0.335,  // real: Batata (3,35 EUR/kg, fresca; peso cocido ~ crudo) (Granada wh 3968)
    "brocoli":                       0.3,  // real: Brócoli (Granada wh 3968)
    // Aceite de oliva 0,4º: 3,80 EUR/L la botella de 1 L (bajó bastante en
    // 2026). El precio es por LITRO, no por kg: un litro pesa 916 g, así que
    // por 100 G son 3,80 / 9,16 = 0,415. Misma trampa de unidades que en la
    // nutrición, ver ingredient-nutrition.js.
    "aceite de oliva":               0.4148,  // real: Aceite de oliva 0,4º Hacendado (3,80 EUR/L, botella 1 L; pesa 916 g) (Granada wh 3968)
    // Cebolla y ajo (2026-08-26): el PRECIO sí es dato real y verificable,
    // aunque su nutrición esté sin resolver (ver ingredient-nutrition.js).
    "ajo":                           0.74,  // real: Ajos morados (250 g, 1,85 EUR) (Granada wh 3968)
    "cebolla":                       0.2,  // real: Cebollas (1 kg, 2,00 EUR) (Granada wh 3968)
    "caballa en lata":               1.0833,  // real: Filetes de caballa del sur en tomate Hacendado (Granada wh 3968)
    "cacahuetes":                    0.4125,  // real: Cacahuete tostado con sal Hacendado (Granada wh 3968)
    "carne picada 5% grasa":         1.1,  // real: Preparado de carne picada vacuno (11 EUR/kg, 500 g) (Granada wh 3968)
    "claras de huevo":               0.285,  // real: Claras de huevo líquidas pasteurizadas (2,85 EUR/L) (Granada wh 3968)
    "copos de maiz":                 0.3,  // real: Corn Flakes Hacendado 0% azúcares (Granada wh 3968)
    "cuscus cocido":                 0.0696,  // real: Cous cous mediano Hacendado (seco ×2.8 = cocido) (Granada wh 3968)
    "edamame":                       0.35,  // real: Edamame soja verde Hacendado ultracongelada (Granada wh 3968)
    "espinacas":                     0.26,  // real: Espinaca picada congelada (Granada wh 3968)
    "frutos rojos congelados":       0.6334,  // real: Mix frutos rojos Hacendado ultracongeladas (Granada wh 3968)
    "garbanzos cocidos":             0.2,  // real: Garbanzo cocido Hacendado (2,00 EUR/kg, ya cocido) (Granada wh 3968)
    "granola":                       0.6,  // real: Cereales y semillas granola Hacendado con frutos secos (Granada wh 3968)
    "huevos enteros":                0.4034,  // real: Huevos grandes L (3,05 EUR/docena, 63 g/huevo) (Granada wh 3968)
    "hummus":                        0.4375,  // real: Hummus de garbanzos Hacendado receta clásica (Granada wh 3968)
    "jamon cocido extra":            1,  // real: Jamón cocido extra Hacendado finas lonchas (Granada wh 3968)
    "leche semidesnatada":           0.084,  // real: Leche semidesnatada Hacendado (0,84 EUR/L) (Granada wh 3968)
    "lechuga pepino":                0.15,  // estimado -- clave combinada; lechuga por unidad
    "lentejas cocidas":              0.0804,  // real: Lenteja pardina Hacendado (seca ×2.3 = cocida) (Granada wh 3968)
    "lomo de cerdo":                 0.63,  // real: Filetes lomo de cerdo cabeza (Granada wh 3968)
    "mantequilla de cacahuete":      0.53,  // real: Crema de cacahuete 100% Hacendado (Granada wh 3968)
    "manzana":                       0.24,  // real: Manzana Golden (Granada wh 3968)
    "maiz dulce":                    0.369,  // real: Maíz dulce Hacendado (3,69 EUR/kg) (Granada wh 3968)
    "merluza":                       1.15,  // real: Merluza a rodajas (Granada wh 3968)
    "mermelada light":               0.4211,  // real: Confitura de fresa Hacendado 0% azúcares añadidos (Granada wh 3968)
    "miel":                          0.5,  // real: Miel de flores Hacendado (5 EUR/kg, tarro 1 kg) (Granada wh 3968)
    "mozzarella light":              0.8,  // estimado -- solo mozzarella normal en catalogo
    "muslo de pollo deshuesado":     0.555,  // real: Muslos de pollo deshuesados con piel (Granada wh 3968)
    "naranja":                       0.25,  // real: Naranja de mesa (Granada wh 3968)
    "nueces":                        1.25,  // real: Nuez natural Hacendado pelada (Granada wh 3968)
    "pan de molde integral":         0.1957,  // real: Pan de molde 100% integral Hacendado (Granada wh 3968)
    "pan integral":                  0.4286,  // real: Pan integral trigo 100% (Granada wh 3968)
    "pasta cocida":                  0.05,  // real: Macarrón Hacendado (seco ×2.3 = cocido) (Granada wh 3968)
    "patata cocida":                 0.19,  // real: Patata (1,90 EUR/kg fresca; peso cocido ~ crudo) (Granada wh 3968)
    "pavo loncheado":                0.7625,  // real: Maxi pavo Hacendado finas lonchas (Granada wh 3968)
    "pechuga de pavo":               0.875,  // real: Filetes pechuga de pavo (Granada wh 3968)
    "pechuga de pollo":              0.73,  // real: Filetes pechuga de pollo (Granada wh 3968)
    "pepino":                        0.15,  // real: Pepino (Granada wh 3968)
    "pina":                          0.2,  // real: Piña fresca (no en almíbar) (Granada wh 3968)
    "platano":                       0.23,  // real: Plátano de Canarias IGP (Granada wh 3968)
    "queso fresco batido 0%":        0.22,  // real: Queso fresco batido desnatado 0% MG Hacendado (Granada wh 3968)
    "queso light":                   0.7,  // estimado -- sin generico claro; entre lonchas fundido 0,42 y fresco light 0,88
    "quinoa cocida":                 0.1963,  // real: Quinoa Hacendado (seca ×2.7 = cocida) (Granada wh 3968)
    "requeson":                      0.5,  // real: Requesón mezcla Hacendado (Granada wh 3968)
    "salmon":                        1.35,  // real: Filete de salmón rosado ultracongelado (Granada wh 3968)
    "sardinas en lata":              0.9402,  // real: Sardinas en aceite de oliva Hacendado (Granada wh 3968)
    "skyr natural":                  0.28,  // estimado -- sin skyr; Postre lacteo natural +Proteinas 10 g 0% MG (2,80 EUR/kg)
    "tempeh":                        1.8,  // estimado -- sin producto
    "ternera magra":                 1.7,  // real: Filetes de vacuno añojo 18 / tacos guisar 16,2 EUR/kg (media) (Granada wh 3968)
    "tofu firme":                    0.6364,  // real: Tofu firme Hacendado (Granada wh 3968)
    "tomate":                        0.125,  // real: Tomate triturado Hacendado (1,25 EUR/kg, brick 800 g) (Granada wh 3968)
    "tortillas de trigo":            0.4,  // estimado -- solo 'Wraps', BJU distinto
    "tortitas de arroz":             0.8871,  // real: Tortitas de arroz Hacendado (Granada wh 3968)
    "verduras congeladas salteado":  0.3,  // estimado -- mezcla de verdura ultracongelada ~3 EUR/kg
    "wrap proteico":                 0.75,  // estimado -- sin producto
    "yogur griego ligero":           0.1934,  // real: Yogur griego natural ligero Hacendado (Granada wh 3968)
    "zanahoria":                     0.12,  // real: Zanahorias 1 kg (Granada wh 3968)

    // Añadidos en la ampliación de DISH_DB (más variedad de ingredientes)
    "conejo":                        0.94,  // real: Medio conejo troceado (Granada wh 3968)
    "jamon serrano":                 2.5,  // real: Jamón serrano cortado a máquina (Granada wh 3968)
    "solomillo de ternera":          4.07,  // real: Solomillo de vacuno añojo (Granada wh 3968)
    "lubina":                        2.25,  // real: Filete de lubina (Granada wh 3968)
    "rape":                          1.85,  // real: Cola de rape del Cabo ultracongelada (Granada wh 3968)
    "gamba cocida":                  2.7667,  // real: Gamba blanca cocida Hacendado (Granada wh 3968)
    "langostino cocido":             1.075,  // real: Langostino cocido (10,75 EUR/kg) (Granada wh 3968)
    "pavo picado":                   0.79,  // estimado -- sin pavo picado; Preparado de carne picada pollo (7,90 EUR/kg)
    "champinones":                   0.52,  // real: Champiñones blancos (Granada wh 3968)
    "calabacin":                     0.19,  // real: Calabacín verde (Granada wh 3968)
    "pimiento":                      0.25,  // real: Pimiento rojo (Granada wh 3968)
    "coliflor":                      0.25,  // real: Coliflor (Granada wh 3968)
    "queso curado":                  1.11,  // real: Queso curado mezcla Hacendado (11,08 EUR/kg; generico, no DOP manchego) (Granada wh 3968)
    "pan de centeno":                0.34,  // real: Hogaza de centeno 50% (Granada wh 3968)
    "trigo sarraceno cocido":        0.2,  // estimado -- Mercadona no vende trigo sarraceno; analogo quinoa seca ÷2.7
    "kiwi":                          0.465,  // real: Kiwi verde (Granada wh 3968)
    "fresas":                        0.75,  // real: Fresas (Granada wh 3968)
  }
};