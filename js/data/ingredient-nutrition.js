/**
 * js/data/ingredient-nutrition.js
 * ─────────────────────────────────────────────────────────────────────────
 * KBJU (kcal/protein/carbs/fat) REAL por 100g, uno por cada uno de los 81
 * ingredient roles que aparecen en js/data/dishes.js — la fuente de verdad
 * que reemplaza el reparto del total del plato por cuota de gramos (ver
 * "Corrección de macros por ingrediente" en STATE.md, 2026-08-13d, y el
 * bug real que la motivó: "Plátano" mostrando proteína/grasa del
 * cacahuete de su mismo plato).
 *
 * ── Procedencia — NO es una resolución nueva, es una PROMOCIÓN a producción ──
 * Cada entrada `resolved:true` viene EXACTAMENTE de `poc/data/
 * ingredient-rules-full.js` (auditoría ya hecha, verificada uno a uno a
 * mano contra `js/data/real-products.js`, con test de consistencia propio
 * — `poc/tests/ingredient-coverage.test.js`, 9 aserciones, sigue pasando).
 * Este archivo transcribe esos mismos 50 roles resueltos + 31 sin
 * resolver, solo cambia la clave (normalizada, vía normalizeIngredientKey
 * de pricing.js, para poder buscar igual que pricing.js/packaging.js/
 * pantry.js) — nunca se re-derivó ni se re-emparejó nada por similitud de
 * texto aquí. Deliberado, pedido explícitamente: "no подставляй похожие
 * продукты автоматически" — cero coincidencias nuevas, solo las ya
 * verificadas a mano.
 *
 * ── resolved:false — NUNCA se inventa un valor ──────────────────────────
 * Los 31 roles sin match fiable (fruta/verdura fresca sin nutrición
 * verificada en el catálogo, producto que no existe, medido en un estado
 * distinto al que pide dishes.js —seco vs. cocido—, subespecie distinta
 * —plátano macho vs. de mesa—...) quedan `resolved:false` con `reason`/
 * `detail` — el código que consuma esto NUNCA debe sustituir por un
 * número aproximado. Ver resolveIngredientNutrition() en
 * js/core/nutrition.js para cómo se usa esto en la práctica (reparto del
 * remanente entre los ingredientes sin resolver de un mismo plato, nunca
 * un valor inventado por ingrediente suelto).
 *
 * Consumido por: js/core/nutrition.js (resolveIngredientNutrition)
 * ─────────────────────────────────────────────────────────────────────────
 */

var INGREDIENT_NUTRITION = {
  "aguacate": { resolved: false, reason: "otra", detail: "Único candidato con nutrición no nula (\"Aguacates\", id 3858) tiene macros implausibles para aguacate: carbs=0.83g/100g (un aguacate real ronda 6-9g/100g de carbohidratos por su fibra). El otro candidato (\"Aguacate\", id 3830) tiene kcal=null.", displayName: "Aguacate" },
  "almendras": { resolved: true, kcal: 628, protein: 23.3, carbs: 3, fat: 57, productName: "Almendra tostada Hacendado 0% sal añadida con piel", ean: "8480000340146", matchMethod: "exact_ean", displayName: "Almendras" },
  "alubias cocidas": { resolved: true, kcal: 83, protein: 5.8, carbs: 10.7, fat: 0.4, productName: "Alubia cocida blanca Hacendado", ean: "8480000260192", matchMethod: "exact_ean", displayName: "Alubias cocidas" },
  "arroz blanco cocido": { resolved: true, kcal: 148, protein: 3, carbs: 24, fat: 2.3, productName: "Arroz cocido redondo Sabroz", ean: "8410184040723", matchMethod: "exact_ean", displayName: "Arroz blanco cocido" },
  "arroz integral cocido": { resolved: false, reason: "sin_nutricion", detail: "Existe \"Arroz cocido integral Sabroz\" (medido cocido, como pide dishes.js) pero kcal=null. La alternativa con nutrición (\"Arroz integral largo Hacendado\", 350kcal/100g) es ARROZ CRUDO -- usar su kcal para una cantidad medida en cocido triplicaría las calorías reales. No se sustituye por desajuste de unidad de medida.", displayName: "Arroz integral cocido" },
  "atun al natural": { resolved: true, kcal: 98.75, protein: 21, carbs: 0.9, fat: 1.2, productName: "Atún claro al natural Hacendado", ean: "8480000180186", matchMethod: "exact_ean", displayName: "Atún al natural" },
  "avena": { resolved: false, reason: "needsReview", detail: "Único candidato (\"Avena molida Hacendado\") tiene needsReview=true y nutritionConfidence=\"low\".", displayName: "Avena" },
  "bacalao": { resolved: false, reason: "solo_producto_no_apto", detail: "El único candidato con nutrición es \"Bacalao ahumado Hacendado\" (ahumado, no apto para las recetas que piden bacalao fresco a cocinar). Los cortes frescos/en salazón (\"a rodajas\", \"abierto en libro\", \"media pieza\") tienen todos kcal=null.", displayName: "Bacalao" },
  "batata": { resolved: true, kcal: 60, protein: 2.3, carbs: 11.8, fat: 0.08, productName: "Batatas para microondas", ean: "8424717004014", matchMethod: "legacy", displayName: "Batata" },
  "brocoli": { resolved: false, reason: "sin_nutricion", detail: "Único candidato (\"Brócoli\") tiene kcal=null.", displayName: "Brócoli" },
  "caballa en lata": { resolved: false, reason: "no_existe", detail: "Ningún producto llamado \"Caballa\" en el catálogo (0 candidatos).", displayName: "Caballa en lata" },
  "cacahuetes": { resolved: true, kcal: 618, protein: 24, carbs: 13, fat: 50.4, productName: "Cacahuete tostado Hacendado 0% sal añadida", ean: "8480000340313", matchMethod: "exact_ean", displayName: "Cacahuetes" },
  "calabacin": { resolved: false, reason: "sin_nutricion", detail: "\"Calabacín verde\"/\"Calabacín blanco\" (fresco) tienen kcal=null. Solo existe con nutrición \"Crema de calabacín Hacendado\" (puré/sopa), producto distinto al calabacín entero para saltear/asar que pide dishes.js.", displayName: "Calabacín" },
  "carne picada 5% grasa": { resolved: false, reason: "match_ambiguo", detail: "Los productos reales de \"carne picada\" (vacuno/cerdo) tienen 11-14g grasa/100g -- no corresponden a \"5% grasa\" (magra) que especifica la receta. La única opción con grasa baja (\"Preparado de carne picada pollo\", 3.4g/100g) es POLLO, una carne distinta a la que la receta espera (vacuno/cerdo). Sustituir cambiaría el perfil de macros Y el tipo de carne.", displayName: "Carne picada 5% grasa" },
  "champinones": { resolved: true, kcal: 21, protein: 1.56, carbs: 0.83, fat: 0.06, productName: "Champiñones laminados Hacendado", ean: "8480000166180", matchMethod: "name", displayName: "Champiñones" },
  "claras de huevo": { resolved: true, kcal: 50, protein: 11, carbs: 0.5, fat: 0.1, productName: "Claras de huevo líquidas pasteurizadas", ean: "8411384009855", matchMethod: "name", displayName: "Claras de huevo" },
  "coliflor": { resolved: true, kcal: 19, protein: 1.6, carbs: 2.1, fat: 0, productName: "Coliflor", ean: "2105480692207", matchMethod: "name", displayName: "Coliflor" },
  "conejo": { resolved: false, reason: "sin_nutricion", detail: "Único candidato (\"Conejo entero\") tiene kcal=null.", displayName: "Conejo" },
  "copos de maiz": { resolved: false, reason: "no_existe", detail: "Ningún producto \"Copos de maíz\" (corn flakes) en el catálogo. Existe \"Muesli\"/\"Cereales avena Crunchy\" pero son productos nutricionalmente distintos (base de avena, no maíz), no se sustituyen.", displayName: "Copos de maíz" },
  "cuscus cocido": { resolved: false, reason: "sin_nutricion", detail: "Mismo problema que Arroz integral cocido: el único cuscús real verificado (\"Cous cous mediano Hacendado\", ya usado en real-ingredient-matches.js) es SECO, no cocido -- dishes.js mide en cocido. El archivo ya curado usa este producto SOLO para nombre/precio (priceIsUsable:false) y sigue usando los macros fabricados de dishes.js para KBJU -- bajo el criterio de esta auditoría (macros deben venir del producto real), esto NO es una resolución válida de nutrición, solo de precio/nombre.", displayName: "Cuscús cocido" },
  "edamame": { resolved: false, reason: "no_existe", detail: "Ningún producto \"Edamame\" en el catálogo (0 candidatos).", displayName: "Edamame" },
  "espinacas": { resolved: true, kcal: 28, protein: 3.4, carbs: 0.9, fat: 0.6, productName: "Espinacas baby lavadas", ean: "8425779044451", matchMethod: "legacy", displayName: "Espinacas" },
  "fresas": { resolved: false, reason: "no_existe", detail: "Ningún producto \"Fresa(s)\" en el catálogo (0 candidatos).", displayName: "Fresas" },
  "frutos rojos congelados": { resolved: false, reason: "no_existe", detail: "Ningún producto \"Frutos rojos\" en el catálogo (0 candidatos).", displayName: "Frutos rojos congelados" },
  "gamba cocida": { resolved: true, kcal: 101, protein: 22, carbs: 0, fat: 2, productName: "Gamba cocida", ean: "8402001049279", matchMethod: "name", displayName: "Gamba cocida" },
  "garbanzos cocidos": { resolved: true, kcal: 90, protein: 5.5, carbs: 9.5, fat: 2.2, productName: "Garbanzo cocido Hacendado", ean: "8480000260291", matchMethod: "exact_ean", displayName: "Garbanzos cocidos" },
  "granola": { resolved: false, reason: "no_existe", detail: "Ningún producto llamado \"Granola\" en el catálogo. Existe \"Muesli\" en variantes, pero granola y muesli son productos distintos (la granola lleva grasa/azúcar añadidos y se hornea en racimos; el muesli es una mezcla cruda) -- no se sustituye sin verificación específica de esa diferencia.", displayName: "Granola" },
  "huevos enteros": { resolved: true, kcal: 150, protein: 12.5, carbs: 0.5, fat: 11.1, productName: "Huevos de gallinas camperas", ean: "8410603125215", matchMethod: "name", displayName: "Huevos enteros" },
  "hummus": { resolved: false, reason: "sin_nutricion", detail: "Los 2 candidatos (\"Hummus de garbanzos Hacendado receta clásica\", \"...con pimiento del piquillo asado\") tienen kcal=null.", displayName: "Hummus" },
  "jamon cocido extra": { resolved: true, kcal: 126, protein: 18, carbs: 1.4, fat: 5.4, productName: "Jamón cocido extra Noel lonchas", ean: "8410783320813", matchMethod: "exact_ean", displayName: "Jamón cocido extra" },
  "jamon serrano": { resolved: true, kcal: 247.8, protein: 33.5, carbs: 1, fat: 12.2, productName: "Jamón serrano lonchas Incarlopsa", ean: "8421384009724", matchMethod: "exact_ean", displayName: "Jamón serrano" },
  "kiwi": { resolved: false, reason: "sin_nutricion", detail: "\"Kiwi verde\"/\"Kiwis verdes\", los únicos candidatos, tienen kcal=null.", displayName: "Kiwi" },
  "langostino cocido": { resolved: true, kcal: 98, protein: 22, carbs: 0, fat: 1.1, productName: "Langostino cocido", ean: "8402001025433", matchMethod: "name", displayName: "Langostino cocido" },
  "leche semidesnatada": { resolved: true, kcal: 49, protein: 3.2, carbs: 4.7, fat: 1.6, productName: "Leche semidesnatada Hacendado", ean: "8402001002106", matchMethod: "legacy", displayName: "Leche semidesnatada" },
  "lechuga pepino": { resolved: false, reason: "otra", detail: "BUG DE DATOS en dishes.js, no un problema de resolución: el campo `name` de este ingrediente es literalmente el string \"Lechuga: Pepino\" (dos ingredientes concatenados con \":\", ver receta \"Wrap de pollo con lechuga y tomate\"). Ningún producto puede matchear ese nombre corrupto. Requiere corregir dishes.js (separar en dos líneas \"Lechuga\" y \"Pepino\") antes de poder resolverlo -- fuera del alcance de esta auditoría (no se ha tocado dishes.js).", displayName: "Lechuga: Pepino" },
  "lentejas cocidas": { resolved: true, kcal: 89, protein: 8.2, carbs: 10.7, fat: 0.4, productName: "Lenteja cocida Hacendado", ean: "8480000053329", matchMethod: "exact_ean", displayName: "Lentejas cocidas" },
  "lomo de cerdo": { resolved: true, kcal: 152, protein: 18, carbs: 0, fat: 8.9, productName: "Lomo de cerdo trozo", ean: "2105100045901", matchMethod: "name", displayName: "Lomo de cerdo" },
  "lubina": { resolved: false, reason: "sin_nutricion", detail: "Los 5 candidatos (distintos cortes de la misma pieza) tienen todos kcal=null.", displayName: "Lubina" },
  "mantequilla de cacahuete": { resolved: true, kcal: 608, protein: 30, carbs: 12, fat: 47, productName: "Crema de cacahuete 100% Hacendado", ean: "8480000168832", matchMethod: "name", displayName: "Mantequilla de cacahuete" },
  "manzana": { resolved: true, kcal: 51.8, protein: 0.5, carbs: 11.2, fat: 0.5, productName: "Manzanas Golden", ean: "2105400032694", matchMethod: "name", displayName: "Manzana" },
  "maiz dulce": { resolved: true, kcal: 75, protein: 2.6, carbs: 9.3, fat: 2.3, productName: "Maíz dulce Hacendado", ean: "8480000167125", matchMethod: "name", displayName: "Maíz dulce" },
  "merluza": { resolved: true, kcal: 77, protein: 17, carbs: 0, fat: 0.2, productName: "Merluza a rodajas", ean: "8480000826107", matchMethod: "name", displayName: "Merluza" },
  "mermelada light": { resolved: false, reason: "no_existe", detail: "Solo existen mermeladas normales (con azúcar completo, ~190-235kcal/100g). Ninguna está etiquetada \"light\"/\"0%\"/\"sin azúcar\" -- sustituir una mermelada normal falsearía el macro de azúcar/carbohidratos que la receta espera de una versión light.", displayName: "Mermelada light" },
  "miel": { resolved: true, kcal: 333, protein: 0.4, carbs: 83, fat: 0, productName: "Miel de naranjo Hacendado", ean: "8480000154484", matchMethod: "legacy", displayName: "Miel" },
  "mozzarella light": { resolved: true, kcal: 152.8, protein: 17, carbs: 1, fat: 9, productName: "Mozzarella fresca light de vaca Hacendado", ean: "8480000512307", matchMethod: "exact_ean", displayName: "Mozzarella light" },
  "muslo de pollo deshuesado": { resolved: true, kcal: 88, protein: 18, carbs: 0.5, fat: 1.8, productName: "Muslos de pollo deshuesados con piel", ean: "2105100027884", matchMethod: "name", displayName: "Muslo de pollo deshuesado" },
  "naranja": { resolved: true, kcal: 45.5, protein: 0.75, carbs: 8.03, fat: 0.5, productName: "Naranja de mesa", ean: "2105456032358", matchMethod: "name", displayName: "Naranja" },
  "nueces": { resolved: true, kcal: 579, protein: 21, carbs: 10, fat: 50, productName: "Nuez natural Hacendado pelada", ean: "8402001001345", matchMethod: "name", displayName: "Nueces" },
  "pan de centeno": { resolved: true, kcal: 254, protein: 9.8, carbs: 39, fat: 5.3, productName: "Pan de molde con 55% centeno Hacendado", ean: "8402001037870", matchMethod: "exact_ean", displayName: "Pan de centeno" },
  "pan de molde integral": { resolved: true, kcal: 248.28, protein: 8.62, carbs: 41.38, fat: 3.79, productName: "Pan de molde 100% integral Hacendado", ean: "8402001024184", matchMethod: "legacy", displayName: "Pan de molde integral" },
  "pan integral": { resolved: true, kcal: 244, protein: 10.7, carbs: 42.7, fat: 1.6, productName: "Pan integral trigo 100%", ean: "8402001030161", matchMethod: "name", displayName: "Pan integral" },
  "pasta cocida": { resolved: false, reason: "sin_nutricion", detail: "Todos los productos de la categoría \"Macarrones, pajaritas y hélices\" son pasta SECA (330-361kcal/100g, densidad calórica propia de seco) -- ninguno está etiquetado ni medido como cocido. dishes.js mide este ingrediente en peso YA cocido; usar el valor de pasta seca casi triplicaría las calorías reales de la ración.", displayName: "Pasta cocida" },
  "patata cocida": { resolved: true, kcal: 53, protein: 1.2, carbs: 11, fat: 0, productName: "Patatas cocidas Hacendado", ean: "8402001014253", matchMethod: "name", displayName: "Patata cocida" },
  "pavo loncheado": { resolved: true, kcal: 53.3, protein: 12.8, carbs: 6.8, fat: 0.5, productName: "Maxi pavo Hacendado finas lonchas", ean: "8480000224309", matchMethod: "legacy", displayName: "Pavo loncheado" },
  "pavo picado": { resolved: false, reason: "no_existe", detail: "Ningún producto \"pavo picado\" (carne de pavo picada) en el catálogo. Solo existe picada de pollo/vacuno/cerdo -- son aves/carnes distintas, no se sustituye.", displayName: "Pavo picado" },
  "pechuga de pavo": { resolved: true, kcal: 113, protein: 23.8, carbs: 0, fat: 2, productName: "Filetes pechuga de pavo", ean: "2105100027945", matchMethod: "name", displayName: "Pechuga de pavo" },
  "pechuga de pollo": { resolved: true, kcal: 108, protein: 22, carbs: 0.5, fat: 1.8, productName: "Pechugas enteras de pollo", ean: "2105100037241", matchMethod: "exact_ean", displayName: "Pechuga de pollo" },
  "pepino": { resolved: false, reason: "sin_nutricion", detail: "\"Pepino\"/\"Pepino holandés\", los únicos candidatos, tienen kcal=null.", displayName: "Pepino" },
  "pimiento": { resolved: true, kcal: 32, protein: 1.2, carbs: 5.4, fat: 0.6, productName: "Pimiento rojo", ean: "2105470693108", matchMethod: "name", displayName: "Pimiento" },
  "pina": { resolved: true, kcal: 58, protein: 0.5, carbs: 14, fat: 0, productName: "Piña natural a rodajas", ean: "2105400030249", matchMethod: "name", displayName: "Piña" },
  "platano": { resolved: false, reason: "match_ambiguo", detail: "\"Plátano macho\" (el único con nutrición) es plátano MACHO (plantain) -- subespecie distinta, normalmente se cocina, no se come crudo como fruta dulce en un porridge/bowl. \"Plátano de Canarias IGP\" (plátano de mesa correcto) tiene kcal=null.", displayName: "Plátano" },
  "queso fresco batido 0%": { resolved: true, kcal: 46, protein: 8, carbs: 3.5, fat: 0.5, productName: "Queso fresco batido desnatado 0% MG Hacendado", ean: "8480000510716", matchMethod: "exact_ean", displayName: "Queso fresco batido 0%" },
  "queso light": { resolved: true, kcal: 67.2, protein: 12, carbs: 3.9, fat: 0.4, productName: "Queso fresco Burgos desnatado 0% MG Hacendado", ean: "8480000524096", matchMethod: "legacy", displayName: "Queso light" },
  "quinoa cocida": { resolved: true, kcal: 117.6, protein: 5.88, carbs: 30, fat: 3.88, productName: "Quinoa cocida blanca y roja Sabroz", ean: "8410184040754", matchMethod: "exact_ean", displayName: "Quinoa cocida" },
  "rape": { resolved: false, reason: "no_existe", detail: "Ningún producto \"Rape\" en el catálogo (0 candidatos).", displayName: "Rape" },
  "requeson": { resolved: true, kcal: 160, protein: 8.7, carbs: 5.4, fat: 11.6, productName: "Requesón mezcla Hacendado", ean: "8413556010324", matchMethod: "name", displayName: "Requesón" },
  "salmon": { resolved: false, reason: "solo_producto_no_apto", detail: "Los 4 candidatos con nutrición no corresponden al rol culinario (filete fresco para la plancha): plato preparado con verduras, conserva en lata, y 2 salmón ahumado.", displayName: "Salmón" },
  "sardinas en lata": { resolved: true, kcal: 322, protein: 19, carbs: 0.6, fat: 27, productName: "Sardinillas reducidas en sal en aceite de oliva Hacendado", ean: "8480000182142", matchMethod: "exact_ean", displayName: "Sardinas en lata" },
  "skyr natural": { resolved: false, reason: "no_existe", detail: "Ningún producto llamado \"Skyr\" en el catálogo (0 candidatos). Coincide con lo ya documentado en real-ingredient-matches.js: \"skyr natural -> matcheaba con yogur normal (perfil de macros distinto)\".", displayName: "Skyr natural" },
  "solomillo de ternera": { resolved: true, kcal: 116, protein: 21, carbs: 0.5, fat: 3.3, productName: "Solomillo de vacuno", ean: "8436569263419", matchMethod: "name", displayName: "Solomillo de ternera" },
  "tempeh": { resolved: false, reason: "no_existe", detail: "Ningún producto \"Tempeh\" en el catálogo (0 candidatos).", displayName: "Tempeh" },
  "ternera magra": { resolved: true, kcal: 122, protein: 23, carbs: 0.5, fat: 3.5, productName: "Filetes de vacuno añojo para plancha", ean: "8436569263464", matchMethod: "name", displayName: "Ternera magra" },
  "tofu firme": { resolved: true, kcal: 110, protein: 11.1, carbs: 0.9, fat: 6.9, productName: "Tofu firme Hacendado", ean: "8410789140118", matchMethod: "name", displayName: "Tofu firme" },
  "tomate": { resolved: true, kcal: 19.3, protein: 0.86, carbs: 2.49, fat: 0.26, productName: "Tomates", ean: "5600084699715", matchMethod: "name", displayName: "Tomate" },
  "tortillas de trigo": { resolved: true, kcal: 294.44, protein: 8.4, carbs: 50, fat: 5.8, productName: "Tortillas de trigo Hacendado", ean: "8480000808592", matchMethod: "exact_ean", displayName: "Tortillas de trigo" },
  "tortitas de arroz": { resolved: true, kcal: 363, protein: 8.5, carbs: 75, fat: 2.8, productName: "Tortitas de arroz Hacendado", ean: "8480000140135", matchMethod: "name", displayName: "Tortitas de arroz" },
  "trigo sarraceno cocido": { resolved: false, reason: "no_existe", detail: "Ningún producto \"trigo sarraceno\"/\"alforfón\" (buckwheat) en el catálogo (0 candidatos).", displayName: "Trigo sarraceno cocido" },
  "verduras congeladas salteado": { resolved: false, reason: "solo_producto_no_apto", detail: "Los candidatos encontrados (\"Salteado de pimientos y cebolla cortado y lavado\", \"Salteado de verduras para microondas\") son productos REFRIGERADOS/frescos, no congelados como especifica el rol, y el segundo tiene kcal=null. dishes.js espera un mix de verduras congeladas.", displayName: "Verduras congeladas salteado" },
  "wrap proteico": { resolved: false, reason: "match_ambiguo", detail: "El único candidato (\"Wraps Texas\", categoría \"Ensalada preparada\") es un wrap relleno ya preparado, no una tortilla base alta en proteína para rellenar en casa -- protein=9.6g/100g no es notablemente más alto que una tortilla de trigo normal (8.4g), así que tampoco cumple la propiedad \"proteico\" que da nombre al ingrediente.", displayName: "Wrap proteico" },
  "yogur griego ligero": { resolved: true, kcal: 60, protein: 5.8, carbs: 4.7, fat: 2, productName: "Yogur griego natural ligero Hacendado 2% MG", ean: "8480000213587", matchMethod: "exact_ean", displayName: "Yogur griego ligero" },
  "zanahoria": { resolved: true, kcal: 37.8, protein: 1.3, carbs: 7.7, fat: 0.2, productName: "Zanahoria en tiras Hacendado", ean: "8402001034718", matchMethod: "name", displayName: "Zanahoria" }
};
