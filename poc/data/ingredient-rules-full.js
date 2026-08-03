/**
 * poc/data/ingredient-rules-full.js
 * ─────────────────────────────────────────────────────────────────────────
 * Auditoría COMPLETA de cobertura: los 81 ingredient roles reales usados
 * en js/data/dishes.js (334 platos -- el dataset creció desde los "204+"
 * documentados; ver poc/INGREDIENT_COVERAGE.md sección "Nota"), extraídos
 * programáticamente (poc/core/load-dishes.js), verificados uno a uno
 * contra js/data/real-products.js (grep + lectura directa del registro,
 * misma sesión).
 *
 * Esto NO es el archivo de 17 roles usado por el proof-of-concept de 8
 * recetas (poc/data/ingredient-rules.js, claves en minúsculas, alcance
 * reducido) -- es el registro completo pedido para decidir viabilidad de
 * migración real. Las claves son EXACTAMENTE el string tal como aparece en
 * dishes.js (mayúsculas/acentos incluidos), para poder cruzarse
 * directamente contra dishes.js sin ambigüedad.
 *
 * matchMethod:
 *   "exact_ean" -- producto con nutritionSource="openfoodfacts_ean"
 *   "name"      -- producto con nutritionSource="openfoodfacts_name"
 *   "legacy"    -- nutritionSource=null pero kcal/macros presentes
 *                  (nutrición previa al pipeline, ver PROJECT_CONTEXT.md §17)
 *   "unresolved" -- ver reason
 *
 * NINGÚN rol fue resuelto por similitud de texto automática sin revisión:
 * cada "resolved" fue verificado a mano (categoría/leafCategory coherente
 * con el uso culinario real del ingrediente, needsReview=false, macros
 * plausibles). Cuando había varias opciones válidas se fijó una
 * (pinnedProductId) con el criterio anotado en "note".
 * ─────────────────────────────────────────────────────────────────────────
 */

var INGREDIENT_RULES_FULL = {

  "Aguacate": {
    status: "unresolved",
    reason: "otra",
    detail: "Único candidato con nutrición no nula (\"Aguacates\", id 3858) tiene macros implausibles para aguacate: carbs=0.83g/100g (un aguacate real ronda 6-9g/100g de carbohidratos por su fibra). El otro candidato (\"Aguacate\", id 3830) tiene kcal=null."
  },

  "Almendras": {
    status: "resolved", matchMethod: "exact_ean",
    productId: "34014", ean: "8480000340146", productName: "Almendra tostada Hacendado 0% sal añadida con piel",
    kcal: 628, protein: 23.3, carbs: 3, fat: 57,
    note: "Verificado en el proof-of-concept de 8 recetas."
  },

  "Alubias cocidas": {
    status: "resolved", matchMethod: "exact_ean",
    productId: "26019", ean: "8480000260192", productName: "Alubia cocida blanca Hacendado",
    kcal: 83, protein: 5.8, carbs: 10.7, fat: 0.4,
    note: "Coincide EXACTAMENTE con el match ya curado en real-ingredient-matches.js -- validación cruzada."
  },

  "Arroz blanco cocido": {
    status: "resolved", matchMethod: "exact_ean",
    productId: "22279", ean: "8410184040723", productName: "Arroz cocido redondo Sabroz",
    kcal: 148, protein: 3, carbs: 24, fat: 2.3,
    note: "Verificado en el proof-of-concept de 8 recetas."
  },

  "Arroz integral cocido": {
    status: "unresolved",
    reason: "sin_nutricion",
    detail: "Existe \"Arroz cocido integral Sabroz\" (medido cocido, como pide dishes.js) pero kcal=null. La alternativa con nutrición (\"Arroz integral largo Hacendado\", 350kcal/100g) es ARROZ CRUDO -- usar su kcal para una cantidad medida en cocido triplicaría las calorías reales. No se sustituye por desajuste de unidad de medida."
  },

  "Atún al natural": {
    status: "resolved", matchMethod: "exact_ean",
    productId: "18018", ean: "8480000180186", productName: "Atún claro al natural Hacendado",
    kcal: 98.75, protein: 21, carbs: 0.9, fat: 1.2,
    note: "Coincide EXACTAMENTE con el match ya curado en real-ingredient-matches.js."
  },

  "Avena": {
    status: "unresolved",
    reason: "needsReview",
    detail: "Único candidato (\"Avena molida Hacendado\") tiene needsReview=true y nutritionConfidence=\"low\"."
  },

  "Bacalao": {
    status: "unresolved",
    reason: "solo_producto_no_apto",
    detail: "El único candidato con nutrición es \"Bacalao ahumado Hacendado\" (ahumado, no apto para las recetas que piden bacalao fresco a cocinar). Los cortes frescos/en salazón (\"a rodajas\", \"abierto en libro\", \"media pieza\") tienen todos kcal=null."
  },

  "Batata": {
    status: "resolved", matchMethod: "legacy",
    productId: "69465", ean: "8424717004014", productName: "Batatas para microondas",
    kcal: 60, protein: 2.3, carbs: 11.8, fat: 0.08,
    note: "Producto ya cocido al vapor (microondas) -- coincide con la convención de medida en cocido de dishes.js. La \"Batata\" cruda (id 3830... 69239) tiene kcal=null."
  },

  "Brócoli": {
    status: "unresolved",
    reason: "sin_nutricion",
    detail: "Único candidato (\"Brócoli\") tiene kcal=null."
  },

  "Caballa en lata": {
    status: "unresolved",
    reason: "no_existe",
    detail: "Ningún producto llamado \"Caballa\" en el catálogo (0 candidatos)."
  },

  "Cacahuetes": {
    status: "resolved", matchMethod: "exact_ean",
    productId: "34031", ean: "8480000340313", productName: "Cacahuete tostado Hacendado 0% sal añadida",
    kcal: 618, protein: 24, carbs: 13, fat: 50.4,
    note: "Se descartaron los cacahuetes 'Chocoiris'/bañados en chocolate (producto de confitería, no cacahuete llano)."
  },

  "Calabacín": {
    status: "unresolved",
    reason: "sin_nutricion",
    detail: "\"Calabacín verde\"/\"Calabacín blanco\" (fresco) tienen kcal=null. Solo existe con nutrición \"Crema de calabacín Hacendado\" (puré/sopa), producto distinto al calabacín entero para saltear/asar que pide dishes.js."
  },

  "Carne picada 5% grasa": {
    status: "unresolved",
    reason: "match_ambiguo",
    detail: "Los productos reales de \"carne picada\" (vacuno/cerdo) tienen 11-14g grasa/100g -- no corresponden a \"5% grasa\" (magra) que especifica la receta. La única opción con grasa baja (\"Preparado de carne picada pollo\", 3.4g/100g) es POLLO, una carne distinta a la que la receta espera (vacuno/cerdo). Sustituir cambiaría el perfil de macros Y el tipo de carne."
  },

  "Champiñones": {
    status: "resolved", matchMethod: "name",
    productId: "16618", ean: "8480000166180", productName: "Champiñones laminados Hacendado",
    kcal: 21, protein: 1.56, carbs: 0.83, fat: 0.06,
    note: "En conserva/laminados, no frescos enteros -- macros plausibles para champiñón. La versión fresca (\"Champiñones blancos\") tiene kcal=null."
  },

  "Claras de huevo": {
    status: "resolved", matchMethod: "name",
    productId: "31309", ean: "8411384009855", productName: "Claras de huevo líquidas pasteurizadas",
    kcal: 50, protein: 11, carbs: 0.5, fat: 0.1
  },

  "Coliflor": {
    status: "resolved", matchMethod: "name",
    productId: "69220", ean: "2105480692207", productName: "Coliflor",
    kcal: 19, protein: 1.6, carbs: 2.1, fat: 0
  },

  "Conejo": {
    status: "unresolved",
    reason: "sin_nutricion",
    detail: "Único candidato (\"Conejo entero\") tiene kcal=null."
  },

  "Copos de maíz": {
    status: "unresolved",
    reason: "no_existe",
    detail: "Ningún producto \"Copos de maíz\" (corn flakes) en el catálogo. Existe \"Muesli\"/\"Cereales avena Crunchy\" pero son productos nutricionalmente distintos (base de avena, no maíz), no se sustituyen."
  },

  "Cuscús cocido": {
    status: "unresolved",
    reason: "sin_nutricion",
    detail: "Mismo problema que Arroz integral cocido: el único cuscús real verificado (\"Cous cous mediano Hacendado\", ya usado en real-ingredient-matches.js) es SECO, no cocido -- dishes.js mide en cocido. El archivo ya curado usa este producto SOLO para nombre/precio (priceIsUsable:false) y sigue usando los macros fabricados de dishes.js para KBJU -- bajo el criterio de esta auditoría (macros deben venir del producto real), esto NO es una resolución válida de nutrición, solo de precio/nombre."
  },

  "Edamame": {
    status: "unresolved",
    reason: "no_existe",
    detail: "Ningún producto \"Edamame\" en el catálogo (0 candidatos)."
  },

  "Espinacas": {
    status: "resolved", matchMethod: "legacy",
    productId: "69984", ean: "8425779044451", productName: "Espinacas baby lavadas",
    kcal: 28, protein: 3.4, carbs: 0.9, fat: 0.6,
    note: "Verificado en el proof-of-concept de 8 recetas."
  },

  "Fresas": {
    status: "unresolved",
    reason: "no_existe",
    detail: "Ningún producto \"Fresa(s)\" en el catálogo (0 candidatos)."
  },

  "Frutos rojos congelados": {
    status: "unresolved",
    reason: "no_existe",
    detail: "Ningún producto \"Frutos rojos\" en el catálogo (0 candidatos)."
  },

  "Gamba cocida": {
    status: "resolved", matchMethod: "name",
    productId: "87278", ean: "8402001049279", productName: "Gamba cocida",
    kcal: 101, protein: 22, carbs: 0, fat: 2
  },

  "Garbanzos cocidos": {
    status: "resolved", matchMethod: "exact_ean",
    productId: "26029", ean: "8480000260291", productName: "Garbanzo cocido Hacendado",
    kcal: 90, protein: 5.5, carbs: 9.5, fat: 2.2
  },

  "Granola": {
    status: "unresolved",
    reason: "no_existe",
    detail: "Ningún producto llamado \"Granola\" en el catálogo. Existe \"Muesli\" en variantes, pero granola y muesli son productos distintos (la granola lleva grasa/azúcar añadidos y se hornea en racimos; el muesli es una mezcla cruda) -- no se sustituye sin verificación específica de esa diferencia."
  },

  "Huevos enteros": {
    status: "resolved", matchMethod: "name",
    productId: "15768", ean: "8410603125215", productName: "Huevos de gallinas camperas",
    kcal: 150, protein: 12.5, carbs: 0.5, fat: 11.1,
    note: "pricePer100g=null (se vende por unidad/docena) -- coste debe resolverse por unidad (price/size en unidades), no por 100g."
  },

  "Hummus": {
    status: "unresolved",
    reason: "sin_nutricion",
    detail: "Los 2 candidatos (\"Hummus de garbanzos Hacendado receta clásica\", \"...con pimiento del piquillo asado\") tienen kcal=null."
  },

  "Jamón cocido extra": {
    status: "resolved", matchMethod: "exact_ean",
    productId: "59143", ean: "8410783320813", productName: "Jamón cocido extra Noel lonchas",
    kcal: 126, protein: 18, carbs: 1.4, fat: 5.4,
    note: "Coincide EXACTAMENTE con el match ya curado en real-ingredient-matches.js (mismo EAN) -- ese archivo no incluía macros, solo precio; aquí se confirman también kcal/protein/carbs/fat reales."
  },

  "Jamón serrano": {
    status: "resolved", matchMethod: "exact_ean",
    productId: "59124", ean: "8421384009724", productName: "Jamón serrano lonchas Incarlopsa",
    kcal: 247.8, protein: 33.5, carbs: 1, fat: 12.2,
    note: "Se descartó \"Jamón serrano cortado a máquina\" (needsReview=true)."
  },

  "Kiwi": {
    status: "unresolved",
    reason: "sin_nutricion",
    detail: "\"Kiwi verde\"/\"Kiwis verdes\", los únicos candidatos, tienen kcal=null."
  },

  "Langostino cocido": {
    status: "resolved", matchMethod: "name",
    productId: "87292", ean: "8402001025433", productName: "Langostino cocido",
    kcal: 98, protein: 22, carbs: 0, fat: 1.1,
    note: "Se descartó el otro candidato con el mismo nombre (id 83490): precio=1084.05€, un error de datos evidente en el catálogo fuente."
  },

  "Leche semidesnatada": {
    status: "resolved", matchMethod: "legacy",
    productId: "10382", ean: "8402001002106", productName: "Leche semidesnatada Hacendado",
    kcal: 49, protein: 3.2, carbs: 4.7, fat: 1.6,
    note: "Verificado en el proof-of-concept de 8 recetas (formato 1L)."
  },

  "Lechuga: Pepino": {
    status: "unresolved",
    reason: "otra",
    detail: "BUG DE DATOS en dishes.js, no un problema de resolución: el campo `name` de este ingrediente es literalmente el string \"Lechuga: Pepino\" (dos ingredientes concatenados con \":\", ver receta \"Wrap de pollo con lechuga y tomate\"). Ningún producto puede matchear ese nombre corrupto. Requiere corregir dishes.js (separar en dos líneas \"Lechuga\" y \"Pepino\") antes de poder resolverlo -- fuera del alcance de esta auditoría (no se ha tocado dishes.js)."
  },

  "Lentejas cocidas": {
    status: "resolved", matchMethod: "exact_ean",
    productId: "26011", ean: "8480000053329", productName: "Lenteja cocida Hacendado",
    kcal: 89, protein: 8.2, carbs: 10.7, fat: 0.4,
    note: "Coincide EXACTAMENTE con el match ya curado en real-ingredient-matches.js."
  },

  "Lomo de cerdo": {
    status: "resolved", matchMethod: "name",
    productId: "4590", ean: "2105100045901", productName: "Lomo de cerdo trozo",
    kcal: 152, protein: 18, carbs: 0, fat: 8.9,
    note: "Se descartó \"Lomo de cerdo marinado empanado sin gluten\" (rebozado, kcal=null de todas formas)."
  },

  "Lubina": {
    status: "unresolved",
    reason: "sin_nutricion",
    detail: "Los 5 candidatos (distintos cortes de la misma pieza) tienen todos kcal=null."
  },

  "Mantequilla de cacahuete": {
    status: "resolved", matchMethod: "name",
    productId: "16883", ean: "8480000168832", productName: "Crema de cacahuete 100% Hacendado",
    kcal: 608, protein: 30, carbs: 12, fat: 47,
    note: "Nombrado \"crema\" no \"mantequilla\" en este catálogo -- mismo producto (peanut butter), requirió búsqueda por sinónimo, no coincidencia literal de texto."
  },

  "Manzana": {
    status: "resolved", matchMethod: "name",
    productId: "3269", ean: "2105400032694", productName: "Manzanas Golden",
    kcal: 51.8, protein: 0.5, carbs: 11.2, fat: 0.5,
    note: "Verificado en el proof-of-concept: se descartó \"Manzana Golden\" (singular) por macros implausibles (proteína/grasa demasiado altas para una manzana)."
  },

  "Maíz dulce": {
    status: "resolved", matchMethod: "name",
    productId: "16712", ean: "8480000167125", productName: "Maíz dulce Hacendado",
    kcal: 75, protein: 2.6, carbs: 9.3, fat: 2.3
  },

  "Merluza": {
    status: "resolved", matchMethod: "name",
    productId: "82610.1", ean: "8480000826107", productName: "Merluza a rodajas",
    kcal: 77, protein: 17, carbs: 0, fat: 0.2,
    note: "Los demás cortes de la misma pieza (\"abierta en libro\", \"sin aletas\", \"media pieza\") tienen kcal=null -- se usó el único con nutrición."
  },

  "Mermelada light": {
    status: "unresolved",
    reason: "no_existe",
    detail: "Solo existen mermeladas normales (con azúcar completo, ~190-235kcal/100g). Ninguna está etiquetada \"light\"/\"0%\"/\"sin azúcar\" -- sustituir una mermelada normal falsearía el macro de azúcar/carbohidratos que la receta espera de una versión light."
  },

  "Miel": {
    status: "resolved", matchMethod: "legacy",
    productId: "15448", ean: "8480000154484", productName: "Miel de naranjo Hacendado",
    kcal: 333, protein: 0.4, carbs: 83, fat: 0,
    note: "Verificado en el proof-of-concept de 8 recetas."
  },

  "Mozzarella light": {
    status: "resolved", matchMethod: "exact_ean",
    productId: "51230", ean: "8480000512307", productName: "Mozzarella fresca light de vaca Hacendado",
    kcal: 152.8, protein: 17, carbs: 1, fat: 9,
    note: "Coincide EXACTAMENTE con el match ya curado en real-ingredient-matches.js."
  },

  "Muslo de pollo deshuesado": {
    status: "resolved", matchMethod: "name",
    productId: "2788", ean: "2105100027884", productName: "Muslos de pollo deshuesados con piel",
    kcal: 88, protein: 18, carbs: 0.5, fat: 1.8
  },

  "Naranja": {
    status: "resolved", matchMethod: "name",
    productId: "3235", ean: "2105456032358", productName: "Naranja de mesa",
    kcal: 45.5, protein: 0.75, carbs: 8.03, fat: 0.5
  },

  "Nueces": {
    status: "resolved", matchMethod: "name",
    productId: "34024", ean: "8402001001345", productName: "Nuez natural Hacendado pelada",
    kcal: 579, protein: 21, carbs: 10, fat: 50,
    note: "Se prefirió la variedad \"natural pelada\" (nuez común) sobre nuez de Brasil/macadamia/pecana, que son frutos secos distintos pese a compartir palabra clave."
  },

  "Pan de centeno": {
    status: "resolved", matchMethod: "exact_ean",
    productId: "82302", ean: "8402001037870", productName: "Pan de molde con 55% centeno Hacendado",
    kcal: 254, protein: 9.8, carbs: 39, fat: 5.3,
    note: "Formato \"pan de molde\", no hogaza -- la \"Hogaza de centeno 50%\" real tiene kcal=null."
  },

  "Pan de molde integral": {
    status: "resolved", matchMethod: "legacy",
    productId: "82328", ean: "8402001024184", productName: "Pan de molde 100% integral Hacendado",
    kcal: 248.28, protein: 8.62, carbs: 41.38, fat: 3.79,
    note: "Se eligió la variante genérica Hacendado, no la de espelta ni la sin corteza, por ser la más directamente equivalente."
  },

  "Pan integral": {
    status: "resolved", matchMethod: "name",
    productId: "12049.1", ean: "8402001030161", productName: "Pan integral trigo 100%",
    kcal: 244, protein: 10.7, carbs: 42.7, fat: 1.6,
    note: "Verificado en el proof-of-concept de 8 recetas."
  },

  "Pasta cocida": {
    status: "unresolved",
    reason: "sin_nutricion",
    detail: "Todos los productos de la categoría \"Macarrones, pajaritas y hélices\" son pasta SECA (330-361kcal/100g, densidad calórica propia de seco) -- ninguno está etiquetado ni medido como cocido. dishes.js mide este ingrediente en peso YA cocido; usar el valor de pasta seca casi triplicaría las calorías reales de la ración."
  },

  "Patata cocida": {
    status: "resolved", matchMethod: "name",
    productId: "15534", ean: "8402001014253", productName: "Patatas cocidas Hacendado",
    kcal: 53, protein: 1.2, carbs: 11, fat: 0,
    note: "Medido cocido -- coincide con la convención de dishes.js."
  },

  "Pavo loncheado": {
    status: "resolved", matchMethod: "legacy",
    productId: "22430", ean: "8480000224309", productName: "Maxi pavo Hacendado finas lonchas",
    kcal: 53.3, protein: 12.8, carbs: 6.8, fat: 0.5,
    note: "Genérico \"fiambre de pavo en lonchas\" -- distinto del rol \"Pechuga de pavo\" (crudo, para cocinar)."
  },

  "Pavo picado": {
    status: "unresolved",
    reason: "no_existe",
    detail: "Ningún producto \"pavo picado\" (carne de pavo picada) en el catálogo. Solo existe picada de pollo/vacuno/cerdo -- son aves/carnes distintas, no se sustituye."
  },

  "Pechuga de pavo": {
    status: "resolved", matchMethod: "name",
    productId: "2794", ean: "2105100027945", productName: "Filetes pechuga de pavo",
    kcal: 113, protein: 23.8, carbs: 0, fat: 2,
    note: "Filete CRUDO (categoría Carne), distinto del rol \"Pavo loncheado\" (fiambre ya preparado). La búsqueda inicial solo encontraba fiambres loncheados bajo \"Pechuga de pavo...\"; este filete crudo apareció al restringir a leafCategory \"Pavo y otras aves\"."
  },

  "Pechuga de pollo": {
    status: "resolved", matchMethod: "exact_ean",
    productId: "3724", ean: "2105100037241", productName: "Pechugas enteras de pollo",
    kcal: 108, protein: 22, carbs: 0.5, fat: 1.8,
    note: "Coincide EXACTAMENTE con el match ya curado en real-ingredient-matches.js."
  },

  "Pepino": {
    status: "unresolved",
    reason: "sin_nutricion",
    detail: "\"Pepino\"/\"Pepino holandés\", los únicos candidatos, tienen kcal=null."
  },

  "Pimiento": {
    status: "resolved", matchMethod: "name",
    productId: "69310", ean: "2105470693108", productName: "Pimiento rojo",
    kcal: 32, protein: 1.2, carbs: 5.4, fat: 0.6,
    note: "\"Pimiento verde\" (mismo rol) tiene kcal=null -- se usó el rojo."
  },

  "Piña": {
    status: "resolved", matchMethod: "name",
    productId: "3024", ean: "2105400030249", productName: "Piña natural a rodajas",
    kcal: 58, protein: 0.5, carbs: 14, fat: 0
  },

  "Plátano": {
    status: "unresolved",
    reason: "match_ambiguo",
    detail: "\"Plátano macho\" (el único con nutrición) es plátano MACHO (plantain) -- subespecie distinta, normalmente se cocina, no se come crudo como fruta dulce en un porridge/bowl. \"Plátano de Canarias IGP\" (plátano de mesa correcto) tiene kcal=null."
  },

  "Quinoa cocida": {
    status: "resolved", matchMethod: "exact_ean",
    productId: "22278", ean: "8410184040754", productName: "Quinoa cocida blanca y roja Sabroz",
    kcal: 117.6, protein: 5.88, carbs: 30, fat: 3.88,
    note: "Medido cocido (117.6kcal/100g, coherente con quinoa cocida real ~120kcal) -- a diferencia de arroz integral/pasta/cuscús, aquí SÍ existe la versión cocida con nutrición completa."
  },

  "Queso fresco batido 0%": {
    status: "resolved", matchMethod: "exact_ean",
    productId: "51071", ean: "8480000510716", productName: "Queso fresco batido desnatado 0% MG Hacendado",
    kcal: 46, protein: 8, carbs: 3.5, fat: 0.5,
    note: "Coincide EXACTAMENTE con el match ya curado en real-ingredient-matches.js."
  },

  "Queso light": {
    status: "resolved", matchMethod: "legacy",
    productId: "52409", ean: "8480000524096", productName: "Queso fresco Burgos desnatado 0% MG Hacendado",
    kcal: 67.2, protein: 12, carbs: 3.9, fat: 0.4,
    note: "Rol distinto de \"Queso fresco batido 0%\" (formato Burgos en bloque, no batido)."
  },

  "Rape": {
    status: "unresolved",
    reason: "no_existe",
    detail: "Ningún producto \"Rape\" en el catálogo (0 candidatos)."
  },

  "Requesón": {
    status: "resolved", matchMethod: "name",
    productId: "51012", ean: "8413556010324", productName: "Requesón mezcla Hacendado",
    kcal: 160, protein: 8.7, carbs: 5.4, fat: 11.6
  },

  "Salmón": {
    status: "unresolved",
    reason: "solo_producto_no_apto",
    detail: "Los 4 candidatos con nutrición no corresponden al rol culinario (filete fresco para la plancha): plato preparado con verduras, conserva en lata, y 2 salmón ahumado."
  },

  "Sardinas en lata": {
    status: "resolved", matchMethod: "exact_ean",
    productId: "18214", ean: "8480000182142", productName: "Sardinillas reducidas en sal en aceite de oliva Hacendado",
    kcal: 322, protein: 19, carbs: 0.6, fat: 27
  },

  "Skyr natural": {
    status: "unresolved",
    reason: "no_existe",
    detail: "Ningún producto llamado \"Skyr\" en el catálogo (0 candidatos). Coincide con lo ya documentado en real-ingredient-matches.js: \"skyr natural -> matcheaba con yogur normal (perfil de macros distinto)\"."
  },

  "Solomillo de ternera": {
    status: "resolved", matchMethod: "name",
    productId: "8931", ean: "8436569263419", productName: "Solomillo de vacuno",
    kcal: 116, protein: 21, carbs: 0.5, fat: 3.3,
    note: "\"Vacuno\" = ternera/buey en la nomenclatura de este catálogo."
  },

  "Tempeh": {
    status: "unresolved",
    reason: "no_existe",
    detail: "Ningún producto \"Tempeh\" en el catálogo (0 candidatos)."
  },

  "Ternera magra": {
    status: "resolved", matchMethod: "name",
    productId: "8936", ean: "8436569263464", productName: "Filetes de vacuno añojo para plancha",
    kcal: 122, protein: 23, carbs: 0.5, fat: 3.5,
    note: "fat=3.5g/100g -- genuinamente magra, coherente con \"magra\" de la receta (a diferencia de \"Carne picada\", donde ningún producto picado es realmente magro)."
  },

  "Tofu firme": {
    status: "resolved", matchMethod: "name",
    productId: "51097", ean: "8410789140118", productName: "Tofu firme Hacendado",
    kcal: 110, protein: 11.1, carbs: 0.9, fat: 6.9
  },

  "Tomate": {
    status: "resolved", matchMethod: "name",
    productId: "69971", ean: "5600084699715", productName: "Tomates",
    kcal: 19.3, protein: 0.86, carbs: 2.49, fat: 0.26,
    note: "Verificado en el proof-of-concept: se descartaron 5 candidatos en conserva (spread/passata/troceado/pelado/triturado) por no ser tomate fresco."
  },

  "Tortillas de trigo": {
    status: "resolved", matchMethod: "exact_ean",
    productId: "80859", ean: "8480000808592", productName: "Tortillas de trigo Hacendado",
    kcal: 294.44, protein: 8.4, carbs: 50, fat: 5.8,
    note: "Coincide EXACTAMENTE con el match ya curado en real-ingredient-matches.js."
  },

  "Tortitas de arroz": {
    status: "resolved", matchMethod: "name",
    productId: "14013", ean: "8480000140135", productName: "Tortitas de arroz Hacendado",
    kcal: 363, protein: 8.5, carbs: 75, fat: 2.8
  },

  "Trigo sarraceno cocido": {
    status: "unresolved",
    reason: "no_existe",
    detail: "Ningún producto \"trigo sarraceno\"/\"alforfón\" (buckwheat) en el catálogo (0 candidatos)."
  },

  "Verduras congeladas salteado": {
    status: "unresolved",
    reason: "solo_producto_no_apto",
    detail: "Los candidatos encontrados (\"Salteado de pimientos y cebolla cortado y lavado\", \"Salteado de verduras para microondas\") son productos REFRIGERADOS/frescos, no congelados como especifica el rol, y el segundo tiene kcal=null. dishes.js espera un mix de verduras congeladas."
  },

  "Wrap proteico": {
    status: "unresolved",
    reason: "match_ambiguo",
    detail: "El único candidato (\"Wraps Texas\", categoría \"Ensalada preparada\") es un wrap relleno ya preparado, no una tortilla base alta en proteína para rellenar en casa -- protein=9.6g/100g no es notablemente más alto que una tortilla de trigo normal (8.4g), así que tampoco cumple la propiedad \"proteico\" que da nombre al ingrediente."
  },

  "Yogur griego ligero": {
    status: "resolved", matchMethod: "exact_ean",
    productId: "21358", ean: "8480000213587", productName: "Yogur griego natural ligero Hacendado 2% MG",
    kcal: 60, protein: 5.8, carbs: 4.7, fat: 2,
    note: "Coincide EXACTAMENTE con el match ya curado en real-ingredient-matches.js."
  },

  "Zanahoria": {
    status: "resolved", matchMethod: "name",
    productId: "13328", ean: "8402001034718", productName: "Zanahoria en tiras Hacendado",
    kcal: 37.8, protein: 1.3, carbs: 7.7, fat: 0.2,
    note: "En conserva, no fresca -- macros plausibles para zanahoria."
  }

};

if (typeof module !== "undefined" && module.exports) {
  module.exports = { INGREDIENT_RULES_FULL: INGREDIENT_RULES_FULL };
}
