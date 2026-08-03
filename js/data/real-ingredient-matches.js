/**
 * js/data/real-ingredient-matches.js
 * ─────────────────────────────────────────────────────────────────────────
 * Vínculo ENTRE los 65 ingredientes genéricos de DISH_DB y los 515
 * productos reales verificados por EAN (js/data/real-products.js).
 *
 * IMPORTANTE — esto NO es un matching automático de texto. Se probó
 * similitud de texto pura sobre los 65 ingredientes y el resultado fue
 * malo: "naranja" emparejaba con "Fanta naranja" (0.63), "miel" con
 * "Infusión sabor a miel" (0.32), "arroz blanco cocido" con "Vino blanco"
 * (0.60) — el conjunto de 515 productos es solo el subconjunto
 * verificado por EAN exacto, sesgado hacia marcas conocidas, no un
 * catálogo completo, así que muchos ingredientes genéricos simplemente NO
 * tienen un producto real equivalente ahí.
 *
 * Por eso esta lista es CURADA A MANO: de las 65 coincidencias por texto,
 * solo estas 12 se verificaron una a una como el MISMO producto real
 * (misma preparación, mismo tipo — no solo palabras parecidas). El resto
 * de ingredientes sigue usando el precio estimado (mercadona.js) y el
 * tamaño de envase por defecto (packaging.js), exactamente como antes.
 *
 * priceIsUsable indica si pricePer100g puede sustituir directamente al
 * estimado de mercadona.js. Es false para "cuscus cocido": el producto
 * real emparejado (346 kcal/100g) es cuscús SECO, pero dishes.js mide
 * este ingrediente en peso YA COCIDO (mismo criterio que el pipeline
 * Python para arroz/pasta/legumbres) — usar el precio del seco sin
 * aplicar el factor de cocción encarecería el ingrediente ~2.5x. Se
 * mantiene el producto real solo para mostrar qué comprar, no para el
 * precio.
 *
 * huevos enteros: el producto real emparejado tenía kcal=17/100g en
 * origin, un valor claramente erróneo para huevo (debería rondar 155) —
 * probablemente un fallo de datos en OpenFoodFacts para ese producto
 * concreto. Se usa solo el nombre/unidades, nunca sus macros ni precio.
 *
 * Consumido por:
 *   js/core/pricing.js (resolveIngredientPrice) — precio real como
 *     primer nivel de la cascada, antes que el catálogo estimado (solo
 *     cuando priceIsUsable !== false).
 *   js/ui/render.js (formatPurchaseLine) — nombre y tamaño reales en la
 *     línea "Compra:", en vez de una etiqueta genérica.
 * ─────────────────────────────────────────────────────────────────────────
 */

var REAL_INGREDIENT_MATCHES = {

  "tortillas de trigo":         { productName: "Tortillas de trigo Hacendado",                     brand: "Hacendado", sizeG: 360,  ean: "8480000808592", pricePer100g: 0.32,  priceIsUsable: true },
  "jamon cocido extra":         { productName: "Jamón cocido extra Noel lonchas",                  brand: "Noel",       sizeG: 200,  ean: "8410783320813", pricePer100g: 1.125, priceIsUsable: true },
  "pechuga de pollo":           { productName: "Pechugas enteras de pollo",                         brand: null,         sizeG: 500,  ean: "2105100037241", pricePer100g: 0.665, priceIsUsable: true },
  "quinoa cocida":              { productName: "Quinoa cocida blanca y roja Sabroz",               brand: "Sabroz",     sizeG: 250,  ean: "8410184040754", pricePer100g: 0.56,  priceIsUsable: true },
  "lentejas cocidas":           { productName: "Lenteja cocida Hacendado",                          brand: "Hacendado", sizeG: 295,  ean: "8480000053329", pricePer100g: 0.357, priceIsUsable: true },
  "queso fresco batido 0%":     { productName: "Queso fresco batido desnatado 0% MG Hacendado",     brand: "Hacendado", sizeG: 500,  ean: "8480000510716", pricePer100g: 0.22,  priceIsUsable: true },
  "atun al natural":            { productName: "Atún claro al natural Hacendado",                  brand: "Hacendado", sizeG: 480,  ean: "8480000180186", pricePer100g: 1.167, priceIsUsable: true },
  "yogur griego ligero":        { productName: "Yogur griego natural ligero Hacendado 2% MG",       brand: "Hacendado", sizeG: 1000, ean: "8480000213587", pricePer100g: 0.23,  priceIsUsable: true },
  "alubias cocidas":            { productName: "Alubia cocida blanca Hacendado",                    brand: "Hacendado", sizeG: 570,  ean: "8480000260192", pricePer100g: 0.2,   priceIsUsable: true },
  "mozzarella light":           { productName: "Mozzarella fresca light de vaca Hacendado",         brand: "Hacendado", sizeG: 250,  ean: "8480000512307", pricePer100g: 0.8,   priceIsUsable: true },

  "cuscus cocido":              { productName: "Cous cous mediano Hacendado", brand: "Hacendado", sizeG: 1000, ean: "8011033012108", pricePer100g: 0.195, priceIsUsable: false },

  "huevos enteros":             { productName: "Huevos super grandes XL", brand: null, sizeG: null, units: 12, ean: "8402001022340", pricePer100g: null, priceIsUsable: false }

  // Rechazados tras revisión manual pese a buen score de texto (ejemplos
  // reales de por qué no basta con la similitud de texto):
  //   pechuga de pavo       -> matcheaba con pollo (proteína equivocada)
  //   muslo de pollo desh.  -> matcheaba con "Lasaña de pollo"
  //   mantequilla cacahuete -> matcheaba con mantequilla de vaca normal
  //   pan de molde integral -> matcheaba con pan SIN GLUTEN blanco
  //   skyr natural          -> matcheaba con yogur normal (perfil de macros distinto)
  //   copos de maiz         -> matcheaba con "Aros de maíz" (otra forma/SKU)
  //   garbanzos cocidos     -> el match real es de 1kg, probablemente SECO no cocido
  //   patata cocida         -> matcheaba con "Patatas light" (¿snack, no patata hervida?)
  //   lomo de cerdo         -> matcheaba con chuletas de aguja (corte distinto)
  //   sardinas en lata      -> matcheaba con "Ensalada ensatún" (atún, no sardina)
  //   verduras congeladas   -> matcheaba con verduras ASADAS, no congeladas salteadas
};
