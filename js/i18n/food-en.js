/**
 * js/i18n/food-en.js
 * ─────────────────────────────────────────────────────────────────────────
 * Los nombres de alimento y de plato, en inglés.
 *
 * ── Qué entra aquí y qué no ─────────────────────────────────────────────
 * Entra lo que DESCRIBE un alimento: "Aguacate", "Pechuga de pollo", y los
 * nombres de los platos, que también son descripciones.
 *
 * NO entra `js/data/real-products.js`: ahí están los nombres COMERCIALES de
 * Mercadona, y ésos son lo que hay escrito en la estantería. Quien va a
 * comprar necesita reconocer el producto, no entenderlo. Traducirlos
 * dejaría la lista de la compra sin poder usarse, que es justo para lo que
 * existe esta aplicación.
 *
 * ── Cómo se traduce ─────────────────────────────────────────────────────
 * Nombres de cocina, no literales. "Queso fresco batido 0%" es "0% fat
 * quark", que es como se llama en una cocina inglesa; traducirlo palabra a
 * palabra daría algo que nadie reconoce. Donde el alimento no existe fuera
 * de España se deja el nombre y se explica: "Jamón serrano" se queda, con
 * su nombre, porque eso es lo que es.
 *
 * Sin traducción para un nombre, `tFood()` devuelve el ORIGINAL en español.
 * Un hueco sería peor que una palabra en otro idioma.
 * ─────────────────────────────────────────────────────────────────────────
 */

registerFoodTable("en", {
  // ── Grasas, frutos secos y untables ──────────────────────────────────
  "Aceite de oliva": "Olive oil",
  "Almendras": "Almonds",
  "Cacahuetes": "Peanuts",
  "Nueces": "Walnuts",
  "Mantequilla de cacahuete": "Peanut butter",
  "Aguacate": "Avocado",
  "Hummus": "Hummus",

  // ── Verduras y hortalizas ────────────────────────────────────────────
  "Ajo": "Garlic",
  "Brócoli": "Broccoli",
  "Calabacín": "Courgette",
  "Cebolla": "Onion",
  "Champiñones": "Mushrooms",
  "Coliflor": "Cauliflower",
  "Espinacas": "Spinach",
  "Lechuga": "Lettuce",
  "Maíz dulce": "Sweetcorn",
  "Pepino": "Cucumber",
  "Pimiento": "Bell pepper",
  "Tomate": "Tomato",
  "Zanahoria": "Carrot",
  "Verduras congeladas salteado": "Frozen stir-fry vegetables",

  // ── Fruta ────────────────────────────────────────────────────────────
  "Fresas": "Strawberries",
  "Frutos rojos congelados": "Frozen berries",
  "Kiwi": "Kiwi",
  "Manzana": "Apple",
  "Naranja": "Orange",
  "Piña": "Pineapple",
  "Plátano": "Banana",

  // ── Hidratos ─────────────────────────────────────────────────────────
  "Arroz blanco cocido": "Cooked white rice",
  "Arroz integral cocido": "Cooked brown rice",
  "Avena": "Oats",
  "Batata": "Sweet potato",
  "Copos de maíz": "Cornflakes",
  "Cuscús cocido": "Cooked couscous",
  "Granola": "Granola",
  "Pan blanco": "White bread",
  "Pan de centeno": "Rye bread",
  "Pan de molde integral": "Wholemeal sliced bread",
  "Pan integral": "Wholemeal bread",
  "Pasta cocida": "Cooked pasta",
  "Patata cocida": "Boiled potato",
  "Quinoa cocida": "Cooked quinoa",
  "Tortillas de trigo": "Wheat tortillas",
  "Tortitas de arroz": "Rice cakes",
  "Miel": "Honey",
  "Mermelada light": "Light jam",

  // ── Legumbres y vegetales proteicos ──────────────────────────────────
  "Alubias cocidas": "Cooked white beans",
  "Garbanzos cocidos": "Cooked chickpeas",
  "Lentejas cocidas": "Cooked lentils",
  "Edamame": "Edamame",
  "Tofu firme": "Firm tofu",

  // ── Huevo y lácteos ──────────────────────────────────────────────────
  "Claras de huevo": "Egg whites",
  "Huevos enteros": "Whole eggs",
  "Leche semidesnatada": "Semi-skimmed milk",
  // "Queso fresco batido" es un lacteo batido tipo quark; "fresh beaten
  // cheese" no lo reconoceria nadie.
  "Queso fresco batido 0%": "0% fat quark",
  "Queso light": "Light cheese",
  "Mozzarella light": "Light mozzarella",
  "Requesón": "Ricotta",
  "Skyr natural": "Plain skyr",
  "Yogur griego ligero": "Light Greek yoghurt",

  // ── Carne ────────────────────────────────────────────────────────────
  "Carne picada 5% grasa": "5% fat minced meat",
  "Carne picada mixta": "Mixed minced meat",
  "Conejo": "Rabbit",
  "Jamón cocido extra": "Cooked ham",
  // Se queda con su nombre: es una denominacion, como el parmesano.
  "Jamón serrano": "Jamón serrano (dry-cured ham)",
  "Lomo de cerdo": "Pork loin",
  "Muslo de pollo deshuesado": "Boneless chicken thigh",
  "Pavo loncheado": "Sliced turkey",
  "Pechuga de pavo": "Turkey breast",
  "Pechuga de pollo": "Chicken breast",
  "Salchichas": "Sausages",
  "Solomillo de ternera": "Beef tenderloin",
  "Ternera magra": "Lean beef",

  // ── Pescado y marisco ────────────────────────────────────────────────
  "Atún al natural": "Tuna in brine",
  "Bacalao": "Cod",
  "Caballa en lata": "Tinned mackerel",
  "Gamba cocida": "Cooked prawns",
  "Langostino cocido": "Cooked king prawns",
  "Lubina": "Sea bass",
  "Merluza": "Hake",
  "Rape": "Monkfish",
  "Salmón": "Salmon",
  "Sardinas en lata": "Tinned sardines"
});

/**
 * El vocabulario con el que se componen los NOMBRES DE PLATO.
 *
 * Medido sobre los 434 platos de hoy: se descomponen en 233 piezas unidas
 * por seis conectores. Traduciendo las piezas se traducen los nombres de
 * hoy y los que genere `scripts/generar-platos` mañana, que es lo que hace
 * que esto no sea trabajo perdido -- el catálogo va camino de 1.000.
 *
 * Las claves van en MINÚSCULAS: la misma palabra aparece en mayúscula
 * cuando encabeza el nombre ("Pollo con arroz") y en minúscula cuando no
 * ("Wrap de pollo"), y `tDish()` restituye la mayúscula por posición.
 *
 * Una pieza sin traducir se queda en español dentro del nombre. Media
 * frase entendible es mejor que ninguna.
 */
registerDishWords("en", {
  // ── Bases y cereales ────────────────────────────────────────────────
  "arroz": "rice",
  "arroz integral": "brown rice",
  "arroz basmati": "basmati rice",
  "quinoa": "quinoa",
  "cuscús": "couscous",
  "pasta": "pasta",
  "pasta integral": "wholemeal pasta",
  "macarrones": "macaroni",
  "spaghetti boloñesa ligera": "light spaghetti bolognese",
  "fideos": "noodles",
  "avena": "oats",
  "porridge": "porridge",
  // Compuesto: despiezado daba "Oats porridge", que se entiende pero no es
  // como se dice.
  "porridge de avena": "oat porridge",
  "overnight oats": "overnight oats",
  "ajo castellana": "Castilian garlic",
  "granola": "granola",
  "muesli": "muesli",
  "cereales": "cereal",
  "copos": "flakes",
  "tortitas": "pancakes",
  "tortita": "pancake",
  // Compuesto: despiezado daba "Rice pancakes", y no son tortitas de
  // desayuno sino las tortas secas de arroz que se compran en paquete.
  "tortitas de arroz": "rice cakes",
  "crepes": "crêpes",
  "french toast proteico": "protein French toast",
  "pan": "bread",
  "pan integral": "wholemeal bread",
  "pan tostado": "toast",
  "molde": "sliced bread",
  "centeno": "rye",
  "tostadas": "toast",
  "tostadas integrales": "wholemeal toast",
  "bagel integral": "wholemeal bagel",
  "picatostes": "croutons",
  "patata": "potato",
  "patatas": "potatoes",
  "patata cocida": "boiled potato",
  "batata": "sweet potato",

  // ── Verduras ────────────────────────────────────────────────────────
  "espinacas": "spinach",
  "tomate": "tomato",
  "tomatitos": "cherry tomatoes",
  "tomate cherry": "cherry tomato",
  "brócoli": "broccoli",
  "zanahoria": "carrot",
  "champiñones": "mushrooms",
  "calabacín": "courgette",
  "coliflor": "cauliflower",
  "pimiento": "pepper",
  "pimientos": "peppers",
  "pepino": "cucumber",
  "cebolla": "onion",
  "lechuga": "lettuce",
  "maíz": "sweetcorn",
  "maíz dulce": "sweetcorn",
  "verduras": "vegetables",
  "vegetales": "vegetables",
  "verduras salteadas": "sautéed vegetables",
  "verduras asadas": "roasted vegetables",
  "pisto": "pisto (Spanish ratatouille)",
  "gazpacho": "gazpacho",
  "ensaladilla": "Spanish potato salad",

  // ── Fruta ───────────────────────────────────────────────────────────
  "plátano": "banana",
  "manzana": "apple",
  "naranja": "orange",
  "kiwi": "kiwi",
  "piña": "pineapple",
  "fresas": "strawberries",
  "frutos rojos": "berries",
  "fruta": "fruit",

  // ── Frutos secos, grasas y dulces ───────────────────────────────────
  "almendras": "almonds",
  "nueces": "walnuts",
  "cacahuete": "peanut",
  "cacahuetes": "peanuts",
  "cacahuetes tostados": "roasted peanuts",
  "frutos secos": "nuts",
  "semillas": "seeds",
  "aguacate": "avocado",
  "hummus": "hummus",
  "mantequilla": "butter",
  "aceite": "oil",
  "miel": "honey",
  "mermelada": "jam",
  // Tambien es metodo ("Merluza al limon"), pero aparece como ingrediente
  // detras de un "y" ("con arroz y limon"), donde el metodo no llega.
  "limón": "lemon",
  // Compuestos que NO se pueden despiezar: "Claras de huevo" partido en
  // "claras" + "huevo" daba "Egg egg whites".
  "claras de huevo": "egg whites",
  "muslo de pollo": "chicken thigh",
  "muslos de pollo": "chicken thighs",
  "pechuga de pollo": "chicken breast",
  "pechuga de pavo": "turkey breast",
  "solomillo de ternera": "beef tenderloin",
  "mantequilla de cacahuete": "peanut butter",
  "aceite de oliva": "olive oil",
  "cacao": "cocoa",
  "canela": "cinnamon",
  "puñado": "handful",

  // ── Huevo y lácteos ─────────────────────────────────────────────────
  "huevo": "egg",
  "huevos": "eggs",
  "huevo duro": "boiled egg",
  "huevo escalfado": "poached egg",
  "huevos revueltos": "scrambled eggs",
  "huevos rellenos": "stuffed eggs",
  "claras": "egg whites",
  "claras revueltas": "scrambled egg whites",
  "claras revueltas express": "quick scrambled egg whites",
  "revuelto": "scramble",
  "tortilla": "omelette",
  "tortilla francesa": "plain omelette",
  "tortilla española": "Spanish omelette",
  "shakshuka ligera": "light shakshuka",
  "queso": "cheese",
  "queso fresco": "fresh cheese",
  "queso fresco batido": "quark",
  "queso light": "light cheese",
  "queso lonchas": "sliced cheese",
  "mozzarella": "mozzarella",
  "requesón": "ricotta",
  "ricotta": "ricotta",
  "skyr": "skyr",
  "yogur": "yoghurt",
  "yogur griego": "Greek yoghurt",
  "leche": "milk",
  "batido": "shake",
  "batido proteico": "protein shake",
  "proteína": "protein",

  // ── Carne ───────────────────────────────────────────────────────────
  "pollo": "chicken",
  "pollo asado": "roast chicken",
  "pollo salteado": "stir-fried chicken",
  "pollo teriyaki": "teriyaki chicken",
  "pollo tikka masala": "chicken tikka masala",
  "pollo mediterráneo": "Mediterranean chicken",
  "pollo empapelada": "baked-in-paper chicken",
  "pechuga": "breast",
  "muslo": "thigh",
  "muslos": "thighs",
  "pavo": "turkey",
  "pavo salteado": "stir-fried turkey",
  "pavo loncheado": "sliced turkey",
  "ternera": "beef",
  "ternera salteada": "stir-fried beef",
  "solomillo": "tenderloin",
  "filete": "steak",
  "cerdo": "pork",
  "cerdo asado": "roast pork",
  "lomo": "loin",
  "conejo": "rabbit",
  "carne picada": "minced meat",
  "hamburguesa": "burger",
  "salchichas": "sausages",
  "jamón": "ham",
  "jamón cocido": "cooked ham",
  "jamón serrano": "jamón serrano",

  // ── Pescado y marisco ───────────────────────────────────────────────
  "atún": "tuna",
  "merluza": "hake",
  "bacalao": "cod",
  "salmón": "salmon",
  "salmón ahumado": "smoked salmon",
  "salmón horneado": "baked salmon",
  "salmón teriyaki": "teriyaki salmon",
  "sardinas": "sardines",
  "caballa": "mackerel",
  "lubina": "sea bass",
  "rape": "monkfish",
  "gambas": "prawns",
  "langostinos": "king prawns",
  "lata": "tin",

  // ── Legumbres y vegetal proteico ────────────────────────────────────
  "garbanzos": "chickpeas",
  "lentejas": "lentils",
  "lentejas estofadas": "stewed lentils",
  "lentejas guisadas": "stewed lentils",
  "alubias": "white beans",
  "edamame": "edamame",
  "tofu": "tofu",
  "tofu salteado": "stir-fried tofu",
  "tofu estofado": "braised tofu",

  // ── Formatos de plato ───────────────────────────────────────────────
  "ensalada": "salad",
  "ensalada mediterránea": "Mediterranean salad",
  "ensalada templada": "warm salad",
  "ensalada caprese": "caprese salad",
  "sopa": "soup",
  "crema": "cream soup",
  "bowl": "bowl",
  "bol": "bowl",
  "bowl proteico": "protein bowl",
  "poke bowl": "poke bowl",
  "smoothie bowl": "smoothie bowl",
  "wrap": "wrap",
  "burrito": "burrito",
  "bocadillo": "sandwich",
  "bocadillo integral": "wholemeal sandwich",
  "sandwich integral": "wholemeal sandwich",
  "plato": "dish",
  "desayuno": "breakfast",
  "salsa": "sauce",
  "salsa verde": "green sauce",

  // ── Etiquetas de `mainProt` (js/data/dishes.js) ──────────────────────
  // Salen en "Fuentes de proteina del dia". Van en minuscula porque son
  // etiquetas internas, no nombres de producto de la estanteria. Y van en
  // ESTE objeto, no en el de metodos de coccion de abajo: alli "atun" se
  // leeria como una forma de cocinar y saldrian nombres sin sentido.
  "atun": "tuna",
  "champinones": "mushrooms",
  "gamba": "prawn",
  "jamon": "ham",
  "legumbre": "pulses",
  "salchicha": "sausage",
  "salmon": "salmon"
}, {
  // ── Métodos de cocción ──────────────────────────────────────────────
  // En español van detrás ("Pollo a la plancha"), en inglés delante
  // ("Grilled chicken"). `tDish()` los mueve.
  "plancha": "grilled",
  "horno": "baked",
  "vapor": "steamed",
  "ajillo": "garlic",
  "curry": "curried",
  "wok": "wok-fried",
  "pil-pil": "pil-pil",
  "limón": "lemon",
  "sal": "salt-baked",
  "flamenca": "flamenca-style",
  "ajo": "Castilian garlic"
});
