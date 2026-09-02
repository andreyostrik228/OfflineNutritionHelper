/**
 * js/data/product-links.js
 * ─────────────────────────────────────────────────────────────────────────
 * Rol de ingrediente → PRODUCTO CONCRETO de Mercadona, solo para ENLAZAR
 * su ficha (la del botón 📷 de la lista de la compra).
 *
 * ── Qué problema resuelve ───────────────────────────────────────────────
 * El botón resolvía el producto vía REAL_INGREDIENT_MATCHES, que solo
 * cubre 12 de los 83 roles. Los otros 71 caían en una búsqueda de
 * Mercadona con muchos resultados y sin saber cuál era el bueno — queja
 * literal del usuario: "открывается поиск продуктов и там может быть
 * много продуктов так что непонятно какой именно мне нужно".
 *
 * ── De dónde salen estos ids ────────────────────────────────────────────
 * NO son un emparejamiento automático de texto (eso ya se probó en su día
 * y emparejaba "naranja" con "Fanta naranja" — ver la cabecera de
 * real-ingredient-matches.js). Salen del producto que se eligió A MANO
 * para cada rol al reconstruir los precios contra la API en vivo del
 * almacén de Granada, escrito en el comentario "// real: ..." de
 * js/data/prices/mercadona.js. Aquí solo se le ha buscado el id. Es decir:
 * el botón lleva EXACTAMENTE al producto cuyo precio se está cobrando.
 *
 * Los roles con precio "estimado" NO aparecen aquí a propósito: no salen
 * de ningún producto concreto, así que su botón sigue abriendo la
 * búsqueda, que es la respuesta honesta.
 *
 * GENERADO — regenerar con scratchpad/gen_product_links.js si se vuelven a
 * reconstruir los precios.
 *
 * Consumido por: js/ui/render-shopping-list.js (resolveShoppingProduct)
 * ─────────────────────────────────────────────────────────────────────────
 */

var INGREDIENT_PRODUCT_LINKS = {
  "aceite de oliva": { id: "4241", name: "Aceite de oliva 0,4º Hacendado" },
  "aguacate": { id: "3830", name: "Aguacate" },
  "ajo": { id: "69297", name: "Ajos morados" },
  "almendras": { id: "34865", name: "Almendra natural Hacendado" },
  "alubias cocidas": { id: "26019", name: "Alubia cocida blanca Hacendado" },
  "arroz blanco cocido": { id: "5063", name: "Arroz largo Hacendado" },
  "arroz integral cocido": { id: "5184", name: "Arroz integral largo Hacendado" },
  "avena": { id: "86341", name: "Copos de avena Brüggen" },
  "bacalao": { id: "24016", name: "Filetes de bacalao MareDeus ultracongelado" },
  "batata": { id: "69239", name: "Batata" },
  "brocoli": { id: "69580", name: "Brócoli" },
  "caballa en lata": { id: "13632", name: "Filetes de caballa del sur en tomate Hacendado" },
  "cacahuetes": { id: "34016", name: "Cacahuete tostado con sal Hacendado" },
  "calabacin": { id: "69338", name: "Calabacín verde" },
  "carne picada 5% grasa": { id: "3454", name: "Preparado de carne picada vacuno" },
  "cebolla": { id: "69079", name: "Cebollas" },
  "champinones": { id: "26951", name: "Champiñones blancos" },
  "claras de huevo": { id: "31312", name: "Claras de huevo líquidas pasteurizadas" },
  "coliflor": { id: "69220", name: "Coliflor" },
  "conejo": { id: "25972", name: "Medio conejo troceado" },
  "copos de maiz": { id: "22966", name: "Cereales copos de maíz Corn Flakes Hacendado 0% azúcares añadidos" },
  "cuscus cocido": { id: "9395", name: "Cous cous mediano Hacendado" },
  "edamame": { id: "70740", name: "Edamame soja verde Hacendado ultracongelada" },
  "espinacas": { id: "35781", name: "Espinaca picada en porciones Hacendado ultracongelada" },
  "fresas": { id: "3723", name: "Fresas" },
  "frutos rojos congelados": { id: "61089", name: "Mix frutos rojos Hacendado ultracongeladas" },
  "gamba cocida": { id: "87277", name: "Gamba blanca cocida Hacendado" },
  "garbanzos cocidos": { id: "26029", name: "Garbanzo cocido Hacendado" },
  "huevos enteros": { id: "31504", name: "Huevos grandes L" },
  "hummus": { id: "80858", name: "Hummus de garbanzos Hacendado receta clásica" },
  "jamon cocido extra": { id: "60329", name: "Jamón cocido extra Hacendado finas lonchas" },
  "jamon serrano": { id: "8492", name: "Jamón serrano cortado a máquina" },
  "kiwi": { id: "3820", name: "Kiwi verde" },
  "langostino cocido": { id: "87292", name: "Langostino cocido" },
  "leche semidesnatada": { id: "10381", name: "Leche semidesnatada Hacendado" },
  "lechuga": { id: "69670", name: "Lechuga iceberg cortada y lavada" },
  "lentejas cocidas": { id: "26030", name: "Lenteja cocida Hacendado" },
  "lomo de cerdo": { id: "2817", name: "Filetes lomo de cerdo cabeza" },
  "lubina": { id: "87313", name: "Filete de lubina" },
  "maiz dulce": { id: "16712", name: "Maíz dulce Hacendado" },
  "mantequilla de cacahuete": { id: "16883", name: "Crema de cacahuete 100% Hacendado" },
  "manzana": { id: "3028", name: "Manzana Golden" },
  "merluza": { id: "82610.1", name: "Merluza a rodajas" },
  "mermelada light": { id: "15093", name: "Confitura de fresa Hacendado 0% azúcares añadidos" },
  "miel": { id: "15436", name: "Miel de flores Hacendado" },
  "muslo de pollo deshuesado": { id: "2788", name: "Muslos de pollo deshuesados con piel" },
  "naranja": { id: "3235", name: "Naranja de mesa" },
  "nueces": { id: "34024", name: "Nuez natural Hacendado pelada" },
  "pan blanco": { id: "83202.1", name: "Barra de pan" },
  "pan de centeno": { id: "15691.1", name: "Hogaza de centeno 50%" },
  "pan de molde integral": { id: "82328", name: "Pan de molde 100% integral Hacendado" },
  "pan integral": { id: "12049.1", name: "Pan integral trigo 100%" },
  "pasta cocida": { id: "6250", name: "Macarrón Hacendado" },
  "patata cocida": { id: "69066", name: "Patata" },
  "pavo loncheado": { id: "22430", name: "Maxi pavo Hacendado finas lonchas" },
  "pechuga de pavo": { id: "2794", name: "Filetes pechuga de pavo" },
  "pechuga de pollo": { id: "2787", name: "Filetes pechuga de pollo" },
  "pepino": { id: "69584", name: "Pepino" },
  "pimiento": { id: "69310", name: "Pimiento rojo" },
  "pina": { id: "3076", name: "Piña" },
  "platano": { id: "3819", name: "Plátano de Canarias IGP" },
  "queso curado": { id: "50968", name: "Queso curado mezcla Hacendado" },
  "queso fresco batido 0%": { id: "51071", name: "Queso fresco batido desnatado 0% MG Hacendado" },
  "queso light": { id: "50546", name: "Queso lonchas cremoso light de vaca Hacendado" },
  "quinoa cocida": { id: "9430", name: "Quinoa Hacendado" },
  "rape": { id: "24340", name: "Cola de rape del Cabo sin piel Hacendado ultracongelada" },
  "requeson": { id: "51012", name: "Requesón mezcla Hacendado" },
  "salchichas": { id: "53032", name: "Salchichas cocidas bocata Hacendado" },
  "salmon": { id: "24350", name: "Filete de salmón rosado salvaje con piel Hacendado ultracongelado" },
  "sardinas en lata": { id: "18225", name: "Sardinas en aceite de oliva Hacendado" },
  "solomillo de ternera": { id: "2804", name: "Solomillo de vacuno añojo para plancha" },
  "ternera magra": { id: "2712", name: "Filetes de vacuno 1º B añojo para plancha o guisar" },
  "tofu firme": { id: "51097", name: "Tofu firme Hacendado" },
  "tomate": { id: "69912", name: "Tomate pera" },
  "tortillas de trigo": { id: "80859", name: "Tortillas de trigo Hacendado" },
  "tortitas de arroz": { id: "14013", name: "Tortitas de arroz Hacendado" },
  "yogur griego ligero": { id: "52421", name: "Yogur griego natural ligero Hacendado" },
  "zanahoria": { id: "69586", name: "Zanahorias" },
};
