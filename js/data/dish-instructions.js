/**
 * js/data/dish-instructions.js
 * ─────────────────────────────────────────────────────────────────────────
 * Equipo necesario, dificultad y si el plato hay que dejarlo hecho la víspera
 * (makeAhead). Los PASOS de cocina están aparte, en js/data/dish-steps.js: se
 * cargan al abrir una receta, no al arrancar (js/core/recipe-assets.js).
 *
 * ── Por qué esto existe (feedback de una usuaria real, 2026-08-26) ───────
 * Alguien intentó cocinar con la app y no pudo. Dijo tres cosas: que los
 * platos eran difíciles, que no tenía el equipo, y que no sabía CÓMO
 * hacerlos. Los datos dicen que lo primero no es cierto en términos
 * objetivos -- la mediana de `prep` es 15 minutos y un plato tiene 3
 * ingredientes de media, máximo 4. Lo que faltaba era lo tercero:
 * `dishes.js` no tenía NI UN paso de elaboración. "Porridge de avena" es
 * trivial si sabes la proporción de líquido y el tiempo, e imposible si
 * nunca lo has hecho.
 *
 * ── Por qué un archivo APARTE y no campos en dishes.js ───────────────────
 * Mismo patrón aditivo que ya funcionó con product-storage.js: dishes.js
 * son 334 entradas curadas a mano de las que dependen los golden-master
 * del generador. Tocarlas para añadir texto de cocina arriesga mover
 * resultados del motor por un cambio que no tiene NADA que ver con la
 * selección. Aquí no: si este archivo falta o un plato no está, el plato
 * se comporta exactamente igual que hoy.
 *
 * ── Estado: 333 de 334 (2026-08-31) ────────────────────────────────────
 * Completo salvo "Merluza al ajillo con verduras", que necesita ajo y ese
 * rol sigue sin resolver (ver STATE.md, T2). getDishInstructions devuelve
 * null para ese plato y se renderiza sin pasos, igual que antes.
 *
 * Se escribió en ocho tandas (commits `af96985`..`26fd6af`). El piloto
 * inicial (17 platos) se eligió para cubrir el MECANISMO -- los seis
 * tokens de equipo, los tres niveles de dificultad, las cuatro
 * categorías. Las tandas siguientes se ordenaron por VARIEDAD DE TÉCNICA
 * (cada receta enseña algo que no se deduce de otra) hasta agotar lo
 * distinto; el resto del catálogo son permutaciones "proteína + grano +
 * verdura" y sus recetas reutilizan a propósito los mismos bloques, más
 * cortas, pero siguen llevando cantidades, tiempos y una señal de "hecho".
 *
 * ── Cómo se escriben los pasos ──────────────────────────────────────────
 * Redacción ORIGINAL, nunca copiada de webs ni libros de cocina: las
 * técnicas no se pueden registrar, la expresión sí, y esta app puede
 * publicarse.
 *
 * Y para principiantes de verdad. "Cuece la pasta" es justo la
 * instrucción que falló. Cada paso lleva, cuando aplica: cantidad
 * concreta, tiempo concreto, y CÓMO SABER que está listo. Quien lee esto
 * no ha cocinado nunca.
 * ─────────────────────────────────────────────────────────────────────────
 */

/**
 * Vocabulario CERRADO de equipo. Cerrado a propósito: con texto libre el
 * filtro "no tengo esto" nunca funcionaría, porque "sartén"/"sarten"/
 * "una sartén" serían tres cosas distintas.
 *
 * `ninguno` es el más valioso de todos: significa que no hace falta nada
 * más que un cuchillo y un bol, que se dan por supuestos en cualquier
 * cocina. Es la respuesta directa a "no tengo el equipo".
 */
var EQUIPMENT_TOKENS = [
  "ninguno",
  "tostadora",
  "microondas",
  "sarten",
  "olla",
  "horno",
  "batidora"
];

/** 1 fácil · 2 medio · 3 avanzado. */
var DIFFICULTY_LEVELS = { FACIL: 1, MEDIO: 2, AVANZADO: 3 };

/**
 * Instrucciones por NOMBRE de plato (la clave de dishes.js).
 * Cualquier plato ausente simplemente no muestra pasos.
 */
var DISH_INSTRUCTIONS = {

  // ── Sin equipo: solo cuchillo y bol ──────────────────────────────────
  "Almendras y manzana": {
    difficulty: 1,
    equipment: ["ninguno"],
  },

  "Yogur griego con frutos secos y miel": {
    difficulty: 1,
    equipment: ["ninguno"],
  },

  "Skyr con frutos rojos": {
    difficulty: 1,
    equipment: ["ninguno"],
  },

  "Muesli con leche y fruta": {
    difficulty: 1,
    equipment: ["ninguno"],
  },

  "Ensalada caprese con jamón": {
    difficulty: 1,
    equipment: ["ninguno"],
  },

  "Bocadillo integral de atún y tomate": {
    difficulty: 1,
    equipment: ["ninguno"],
  },

  "Wrap de hummus con verduras": {
    difficulty: 1,
    equipment: ["ninguno"],
  },

  "Ensalada de queso fresco con atún": {
    difficulty: 1,
    equipment: ["ninguno"],
  },

  // ── Tostadora ────────────────────────────────────────────────────────
  "Queso fresco con mermelada y tostadas": {
    difficulty: 1,
    equipment: ["tostadora"],
  },

  // ── Microondas ───────────────────────────────────────────────────────
  "Avena con leche y plátano": {
    difficulty: 1,
    equipment: ["microondas"],
  },

  // ── Olla ─────────────────────────────────────────────────────────────
  "Porridge de avena con plátano y miel": {
    difficulty: 1,
    equipment: ["olla"],
  },

  // ── Sartén ───────────────────────────────────────────────────────────
  "Claras revueltas express con jamón": {
    difficulty: 2,
    equipment: ["sarten"],
  },

  "Tortilla francesa con tostadas integrales": {
    difficulty: 2,
    equipment: ["sarten", "tostadora"],
  },

  "Tostadas con aguacate y huevo escalfado": {
    difficulty: 3,
    equipment: ["olla", "tostadora"],
  },

  // ── Horno ────────────────────────────────────────────────────────────
  "Sardinas al horno con ensalada": {
    difficulty: 2,
    equipment: ["horno"],
  },

  "Pechuga de pollo a la plancha con ensalada": {
    difficulty: 2,
    equipment: ["sarten"],
  },

  "Pasta con atún y tomate": {
    difficulty: 2,
    equipment: ["olla"],
  },

  // ══ LOTE 1 (2026-08-26) ═══════════════════════════════════════════════
  // Los 25 platos más cortos que no tenían nada. No es solo por los pasos:
  // `equipment` y `difficulty` SOLO existen para los platos con entrada
  // aquí, así que hasta ahora el filtro "no tengo equipo" -- la queja
  // literal de la usuaria -- no tenía casi nada sobre lo que actuar. Estos
  // 25 son casi todos `ninguno`, que es justo la respuesta a esa queja.

  "Cacahuetes con plátano": {
    difficulty: 1,
    equipment: ["ninguno"],
  },

  "Nueces y naranja": {
    difficulty: 1,
    equipment: ["ninguno"],
  },

  "Almendras con frutos rojos": {
    difficulty: 1,
    equipment: ["ninguno"],
  },

  "Skyr con manzana y canela": {
    difficulty: 1,
    equipment: ["ninguno"],
  },

  "Mantequilla de cacahuete con tortitas": {
    difficulty: 1,
    equipment: ["ninguno"],
  },

  "Jamón cocido con mozzarella": {
    difficulty: 1,
    equipment: ["ninguno"],
  },

  "Sardinas con pan integral": {
    difficulty: 1,
    equipment: ["ninguno"],
  },

  "Caballa en lata con tostadas": {
    difficulty: 1,
    equipment: ["tostadora"],
  },

  "Queso light con tomate cherry": {
    difficulty: 1,
    equipment: ["ninguno"],
  },

  "Yogur griego con plátano y cacao": {
    difficulty: 1,
    equipment: ["ninguno"],
  },

  "Requesón con piña": {
    difficulty: 1,
    equipment: ["ninguno"],
  },

  "Mantequilla de cacahuete con manzana": {
    difficulty: 1,
    equipment: ["ninguno"],
  },

  "Skyr con kiwi": {
    difficulty: 1,
    equipment: ["ninguno"],
  },

  "Yogur griego con fresas": {
    difficulty: 1,
    equipment: ["ninguno"],
  },

  "Atún con manzana": {
    difficulty: 1,
    equipment: ["ninguno"],
  },

  "Jamón serrano con manzana": {
    difficulty: 1,
    equipment: ["ninguno"],
  },

  "Huevo duro con zanahoria": {
    difficulty: 1,
    equipment: ["olla"],
  },

  "Hummus con zanahoria y pepino": {
    difficulty: 1,
    equipment: ["ninguno"],
  },

  "Edamame con sal": {
    difficulty: 1,
    equipment: ["olla"],
  },

  "Queso fresco con jamón y pepino": {
    difficulty: 1,
    equipment: ["ninguno"],
  },

  "Pavo loncheado con queso y tortitas": {
    difficulty: 1,
    equipment: ["ninguno"],
  },

  "Huevo duro con sal y tortita": {
    difficulty: 1,
    equipment: ["olla"],
  },

  "Atún con tostadas integrales": {
    difficulty: 1,
    equipment: ["tostadora"],
  },

  "Tortitas con queso fresco y mermelada": {
    difficulty: 1,
    equipment: ["ninguno"],
  },

  "Pan de molde con queso fresco y pavo": {
    difficulty: 1,
    equipment: ["ninguno"],
  },

  // ══ LOTE 2 (2026-08-26) ═══════════════════════════════════════════════
  // Aquí empieza el problema de verdad. El lote 1 eran platos de montar; en
  // estos hay que COCINAR, que es literalmente lo que ella no pudo hacer.
  // Todos llevan sartén, olla u horno, y todos dicen CÓMO SABER que está
  // hecho -- que es el dato que falta cuando nunca has cocinado: el tiempo
  // del paquete no sirve si no sabes qué estás buscando.

  "Pollo a la plancha con arroz y brócoli": {
    difficulty: 2,
    equipment: ["sarten", "olla"],
  },

  "Huevos revueltos con pavo y tostadas": {
    difficulty: 2,
    equipment: ["sarten", "tostadora"],
  },

  "Claras revueltas con espinacas y tostadas": {
    difficulty: 2,
    equipment: ["sarten", "tostadora"],
  },

  "Lentejas con verduras y arroz": {
    difficulty: 1,
    equipment: ["olla"],
  },

  "Carne picada con arroz y verduras": {
    difficulty: 2,
    equipment: ["sarten"],
  },

  "Salmón con patatas al horno y brócoli": {
    difficulty: 2,
    equipment: ["horno", "olla"],
  },

  "Garbanzos con espinacas y huevo": {
    difficulty: 1,
    equipment: ["sarten", "olla"],
  },

  "Tofu salteado con arroz y verduras": {
    difficulty: 2,
    equipment: ["sarten"],
  },

  "Merluza al vapor con verduras": {
    difficulty: 2,
    equipment: ["olla"],
  },

  "Ternera salteada con pasta y tomate": {
    difficulty: 2,
    equipment: ["sarten", "olla"],
  },

  "Caballa con patata cocida y verduras": {
    difficulty: 1,
    equipment: ["olla"],
  },

  "Pasta con pavo y tomate": {
    difficulty: 2,
    equipment: ["sarten", "olla"],
  },

  "Bowl de arroz con atún y aguacate": {
    difficulty: 1,
    equipment: ["ninguno"],
  },

  "Pollo al limón con batata y brócoli": {
    difficulty: 2,
    equipment: ["sarten", "horno"],
  },

  "Muslos de pollo al horno con patatas": {
    difficulty: 2,
    equipment: ["horno"],
  },

  "Tortilla de claras con queso y vegetales": {
    difficulty: 2,
    equipment: ["sarten"],
  },

  "Huevos al plato con espinacas y tomate": {
    difficulty: 2,
    equipment: ["sarten"],
  },

  "Pavo salteado con pasta y espinacas": {
    difficulty: 2,
    equipment: ["sarten", "olla"],
  },

  "Sopa de lentejas con pan integral": {
    difficulty: 1,
    equipment: ["olla"],
  },

  "Crema de lentejas con pan integral": {
    difficulty: 2,
    equipment: ["olla", "batidora"],
  },

  "Salmón a la plancha con espinacas y limón": {
    difficulty: 2,
    equipment: ["sarten"],
  },

  "Atún con brócoli y patata": {
    difficulty: 1,
    equipment: ["olla"],
  },

  "Hamburguesa de pavo con ensalada": {
    difficulty: 2,
    equipment: ["sarten"],
  },

  "Lomo de cerdo asado con batata": {
    difficulty: 2,
    equipment: ["horno"],
  },

  "Arroz con pollo y pimiento": {
    difficulty: 2,
    equipment: ["sarten"],
  },

  // ══ LOTE 3 (2026-08-26) ═══════════════════════════════════════════════
  // Elegidos por VARIEDAD DE TÉCNICA, no por orden de lista: cada uno
  // enseña algo que no se deduce solo (el cuscús se hace fuera del fuego,
  // el pil-pil liga con la gelatina del propio bacalao, la pasta de curry
  // hay que freírla antes de mojarla). Ninguno lleva cebolla ni ajo: esos
  // roles siguen sin nutrición hasta que llegue USDA.

  "Huevos al plato con jamón y tomate": {
    difficulty: 2,
    equipment: ["sarten"],
  },

  "Wrap de desayuno con huevo y pavo": {
    difficulty: 2,
    equipment: ["sarten"],
  },

  "Crepes de avena con requesón y fruta": {
    difficulty: 2,
    equipment: ["sarten", "batidora"],
  },

  "French toast proteico con yogur": {
    difficulty: 2,
    equipment: ["sarten"],
  },

  "Pollo al curry con arroz basmati": {
    difficulty: 2,
    equipment: ["sarten"],
  },

  "Lentejas estofadas con muslos de pollo": {
    difficulty: 2,
    equipment: ["olla"],
  },

  "Wrap de pavo con queso y lechuga": {
    difficulty: 1,
    equipment: ["sarten"],
  },

  "Ternera con quinoa y brócoli": {
    difficulty: 2,
    equipment: ["sarten", "olla"],
  },

  "Spaghetti boloñesa ligera": {
    difficulty: 2,
    equipment: ["sarten", "olla"],
  },

  "Lomo de cerdo con patatas al horno y ensalada": {
    difficulty: 2,
    equipment: ["horno"],
  },

  "Salmón con cuscús y verduras salteadas": {
    difficulty: 2,
    equipment: ["sarten", "olla"],
  },

  "Merluza al horno con arroz y limón": {
    difficulty: 2,
    equipment: ["horno"],
  },

  "Bacalao al pil-pil con patatas": {
    difficulty: 3,
    equipment: ["sarten", "olla"],
  },

  "Ensalada de atún con quinoa y tomate": {
    difficulty: 1,
    equipment: ["ninguno"],
  },

  "Ensalada mediterránea con garbanzos": {
    difficulty: 1,
    equipment: ["ninguno"],
  },

  "Alubias con carne picada y verduras": {
    difficulty: 2,
    equipment: ["sarten"],
  },

  "Carne picada con quinoa y brócoli": {
    difficulty: 2,
    equipment: ["sarten", "olla"],
  },

  "Cuscús con sardinas y tomate": {
    difficulty: 1,
    equipment: ["olla"],
  },

  "Bowl de arroz con caballa y verduras": {
    difficulty: 1,
    equipment: ["sarten"],
  },

  "Muslos de pollo al horno con cuscús": {
    difficulty: 2,
    equipment: ["horno"],
  },

  "Pollo tikka masala con arroz integral": {
    difficulty: 2,
    equipment: ["sarten"],
  },

  "Salmón con patata y brócoli al vapor": {
    difficulty: 2,
    equipment: ["olla"],
  },

  "Merluza a la plancha con arroz y limón": {
    difficulty: 2,
    equipment: ["sarten"],
  },

  "Revuelto de atún con claras y tostadas": {
    difficulty: 2,
    equipment: ["sarten", "tostadora"],
  },

  "Filete de ternera con ensalada y brócoli": {
    difficulty: 2,
    equipment: ["sarten", "olla"],
  },

  // ══ LOTE 4 (2026-08-26) ═══════════════════════════════════════════════
  // Desayunos y platos de cuchara fríos. Parecen fáciles y es justo donde
  // fallan por PROPORCIÓN y por TIEMPO: la avena necesita una relación de
  // líquido que nadie te dice, el porridge se pega si lo dejas solo, la
  // granola se reblandece si la echas antes de tiempo. Nada de esto se
  // deduce de la lista de ingredientes.

  "Porridge de avena con frutos rojos y skyr": {
    difficulty: 1,
    equipment: ["olla"],
  },

  "Porridge de avena con mantequilla de cacahuete": {
    difficulty: 1,
    equipment: ["olla"],
  },

  "Overnight oats con yogur y manzana": {
    difficulty: 1,
    equipment: ["ninguno"],
    // Necesita 6 h de nevera SÍ o SÍ: no se puede montar y comer el mismo
    // rato. El motor lo trata aparte -- nunca en un plan de 1 día, nunca en
    // el día 1 de un plan de varios, y con aviso "prepáralo la noche antes"
    // cuando sí sale (ver isMakeAheadDish en preferences.js).
    makeAhead: true,
  },

  "Avena con huevo y canela": {
    difficulty: 2,
    equipment: ["olla"],
  },

  "Tostadas con queso fresco y tomate": {
    difficulty: 1,
    equipment: ["tostadora"],
  },

  "Tostadas con pavo y queso lonchas": {
    difficulty: 1,
    equipment: ["tostadora"],
  },

  "Tostadas con jamón cocido y tomate": {
    difficulty: 1,
    equipment: ["tostadora"],
  },

  "Tostadas con mantequilla de cacahuete y plátano": {
    difficulty: 1,
    equipment: ["tostadora"],
  },

  "Tostadas con ricotta y mermelada": {
    difficulty: 1,
    equipment: ["tostadora"],
  },

  "Yogur griego con granola y frutos rojos": {
    difficulty: 1,
    equipment: ["ninguno"],
  },

  "Skyr con plátano y almendras": {
    difficulty: 1,
    equipment: ["ninguno"],
  },

  "Skyr con avena y miel": {
    difficulty: 1,
    equipment: ["ninguno"],
  },

  "Bowl de yogur con fruta y semillas": {
    difficulty: 1,
    equipment: ["ninguno"],
  },

  "Queso fresco con muesli y naranja": {
    difficulty: 1,
    equipment: ["ninguno"],
  },

  "Bagel integral con queso y salmón ahumado": {
    difficulty: 1,
    equipment: ["tostadora"],
  },

  "Bowl de skyr con cacao y nueces": {
    difficulty: 1,
    equipment: ["ninguno"],
  },

  "Pan integral con atún y tomate": {
    difficulty: 1,
    equipment: ["ninguno"],
  },

  "Requesón con piña y copos de maíz": {
    difficulty: 1,
    equipment: ["ninguno"],
  },

  "Smoothie bowl de skyr con frutos rojos": {
    difficulty: 1,
    equipment: ["batidora"],
  },

  "Tostadas con aguacate y atún": {
    difficulty: 1,
    equipment: ["tostadora"],
  },

  "Requesón con nueces y plátano": {
    difficulty: 1,
    equipment: ["ninguno"],
  },

  "Requesón con cacahuetes y miel": {
    difficulty: 1,
    equipment: ["ninguno"],
  },

  "Yogur griego con semillas y fruta": {
    difficulty: 1,
    equipment: ["ninguno"],
  },

  "Bol de cereales con leche y fruta": {
    difficulty: 1,
    equipment: ["ninguno"],
  },

  "Yogur griego con avena y manzana": {
    difficulty: 1,
    equipment: ["ninguno"],
  },

  // ══ LOTE 5 (2026-08-26) ═══════════════════════════════════════════════
  // Platos principales. Incluye la TORTILLA ESPAÑOLA, que resultó estar
  // desbloqueada: sus ingredientes en dishes.js son huevo, patata, tomate y
  // pepino -- no lleva cebolla, así que no depende de los roles que siguen
  // sin nutrición. Es el plato más español del catálogo y ya se puede
  // explicar entero.

  "Bowl de arroz con pollo teriyaki y edamame": {
    difficulty: 2,
    equipment: ["sarten", "olla"],
  },

  "Wrap de pollo con lechuga y tomate": {
    difficulty: 2,
    equipment: ["sarten"],
  },

  "Ensalada de pollo con quinoa y espinacas": {
    difficulty: 2,
    equipment: ["sarten"],
  },

  "Pechuga de pollo con cuscús y verduras": {
    difficulty: 2,
    equipment: ["sarten"],
  },

  "Burrito de pollo con arroz integral": {
    difficulty: 2,
    equipment: ["sarten"],
  },

  "Pavo salteado con batata y espinacas": {
    difficulty: 2,
    equipment: ["sarten", "olla"],
  },

  "Ensalada mediterránea con pavo y garbanzos": {
    difficulty: 1,
    equipment: ["ninguno"],
  },

  "Cerdo al horno con batata y espinacas": {
    difficulty: 2,
    equipment: ["horno"],
  },

  "Poke bowl de salmón con arroz y aguacate": {
    difficulty: 2,
    equipment: ["ninguno"],
  },

  "Garbanzos con pollo y espinacas": {
    difficulty: 2,
    equipment: ["sarten"],
  },

  "Arroz integral con atún y maíz": {
    difficulty: 1,
    equipment: ["ninguno"],
  },

  "Ensalada de pasta con pavo y queso": {
    difficulty: 1,
    equipment: ["olla"],
  },

  "Pechuga de pollo empapelada con verduras": {
    difficulty: 2,
    equipment: ["horno"],
  },

  "Pavo con quinoa y champiñones": {
    difficulty: 2,
    equipment: ["sarten"],
  },

  "Ensalada templada de atún con quinoa": {
    difficulty: 1,
    equipment: ["sarten"],
  },

  "Bacalao con espinacas y patata": {
    difficulty: 2,
    equipment: ["sarten", "olla"],
  },

  "Solomillo de cerdo con cuscús y verduras": {
    difficulty: 2,
    equipment: ["sarten"],
  },

  "Carne picada con brócoli y arroz": {
    difficulty: 2,
    equipment: ["sarten", "olla"],
  },

  "Tortilla española con ensalada": {
    difficulty: 3,
    equipment: ["sarten"],
  },

  "Tortilla de claras con pavo y queso": {
    difficulty: 2,
    equipment: ["sarten"],
  },

  "Shakshuka ligera con tostadas": {
    difficulty: 2,
    equipment: ["sarten", "tostadora"],
  },

  "Revuelto de huevos con verduras y jamón": {
    difficulty: 2,
    equipment: ["sarten"],
  },

  "Lentejas con verduras y huevo duro": {
    difficulty: 1,
    equipment: ["olla"],
  },

  "Tofu a la plancha con verduras y arroz": {
    difficulty: 2,
    equipment: ["sarten"],
  },

  "Edamame con arroz y huevo al vapor": {
    difficulty: 2,
    equipment: ["olla"],
  },

  // ── Tanda 2026-08-31 (142 → 166 platos) ─────────────────────────────
  // Elegidos por TÉCNICA que no se pueda deducir de otra receta ya
  // escrita, no por orden de lista: marisco cocido que solo hay que
  // templar, pescado firme vs. pescado que se deshace, carne magra y su
  // reposo, salsas con azúcar que se queman, un grano nuevo (trigo
  // sarraceno), el huevo duro sin cerco gris, la fruta congelada que
  // atasca la batidora, el vaso de arroz que revienta en el microondas.
  // Nada con cebolla ni ajo: esos roles siguen sin resolver (ver T2).

  "Gambas con arroz y brócoli": {
    difficulty: 1,
    equipment: ["sarten", "olla"],
  },

  "Langostinos con arroz integral y espinacas": {
    difficulty: 1,
    equipment: ["sarten", "olla"],
  },

  "Solomillo de ternera con arroz y brócoli": {
    difficulty: 2,
    equipment: ["sarten"],
  },

  "Cerdo a la plancha con arroz y brócoli": {
    difficulty: 2,
    equipment: ["sarten"],
  },

  "Rape con quinoa y champiñones": {
    difficulty: 2,
    equipment: ["sarten"],
  },

  "Lubina con quinoa y calabacín": {
    difficulty: 2,
    equipment: ["sarten"],
  },

  "Conejo con arroz integral y brócoli": {
    difficulty: 3,
    equipment: ["olla"],
  },

  "Pollo en salsa de yogur con cuscús": {
    difficulty: 2,
    equipment: ["sarten"],
  },

  "Pollo a la naranja con arroz integral": {
    difficulty: 2,
    equipment: ["sarten"],
  },

  "Garbanzos al curry con espinacas": {
    difficulty: 2,
    equipment: ["sarten"],
  },

  "Pavo con arroz y espinacas": {
    difficulty: 2,
    equipment: ["sarten"],
  },

  "Sardinas con cuscús y calabacín": {
    difficulty: 1,
    equipment: ["sarten"],
  },

  "Huevos rellenos de atún con ensalada": {
    difficulty: 2,
    equipment: ["olla"],
  },

  "Ensalada templada con atún y garbanzos": {
    difficulty: 1,
    equipment: ["olla"],
  },

  "Pollo salteado con verduras y arroz": {
    difficulty: 2,
    equipment: ["sarten"],
  },

  "Carne picada con pasta y verduras salteadas": {
    difficulty: 2,
    equipment: ["sarten"],
  },

  "Salmón teriyaki con arroz integral": {
    difficulty: 2,
    equipment: ["sarten"],
  },

  "Batido de proteína con avena y plátano": {
    difficulty: 1,
    equipment: ["batidora"],
  },

  "Batido de requesón con frutos rojos": {
    difficulty: 1,
    equipment: ["batidora"],
  },

  "Atún con arroz y maíz dulce": {
    difficulty: 1,
    equipment: ["microondas"],
  },

  "Ternera con patata y espinacas": {
    difficulty: 2,
    equipment: ["sarten"],
  },

  "Tortilla de claras con champiñones y tomate": {
    difficulty: 2,
    equipment: ["sarten"],
  },

  "Wrap de desayuno con claras y aguacate": {
    difficulty: 2,
    equipment: ["sarten"],
  },

  "Pollo asado con patata y brócoli": {
    difficulty: 2,
    equipment: ["horno"],
  },

  // ── Tanda 2026-08-31 (b) (166 → 182 platos) ──────────────────────────
  // Segunda tanda. A partir de aquí el catálogo restante es en gran parte
  // permutaciones de "proteína + grano cocido + verdura" cuya técnica ya
  // está escrita en un plato hermano. Estos 16 son los que aún enseñaban
  // algo propio: la coliflor que se hace puré en un minuto, el pimiento y
  // sus venas amargas, la regla del bacalao salado, la lata de caballa
  // que ya está cocida, las legumbres de bote que no se remueven, el
  // muslo (carne oscura) frente a la pechuga, el jamón curado que NO se
  // cocina, el huevo frito con aceite por encima en vez de vuelta.

  "Garbanzos con arroz y coliflor": {
    difficulty: 2,
    equipment: ["sarten", "olla"],
  },

  "Pavo con quinoa y pimientos": {
    difficulty: 2,
    equipment: ["sarten"],
  },

  "Bacalao con garbanzos y espinacas": {
    difficulty: 2,
    equipment: ["sarten"],
  },

  "Caballa con pasta y espinacas": {
    difficulty: 1,
    equipment: ["sarten"],
  },

  "Lentejas con arroz integral y zanahoria": {
    difficulty: 1,
    equipment: ["olla"],
  },

  "Muslo de pollo con quinoa y zanahoria": {
    difficulty: 2,
    equipment: ["sarten"],
  },

  "Claras con espinacas y queso": {
    difficulty: 2,
    equipment: ["sarten"],
  },

  "Sandwich integral de pavo y queso": {
    difficulty: 1,
    equipment: ["ninguno"],
  },

  "Poke bowl de tofu con arroz y aguacate": {
    difficulty: 2,
    equipment: ["sarten", "olla"],
  },

  "Pollo con fideos y brócoli": {
    difficulty: 2,
    equipment: ["sarten"],
  },

  "Huevos con pan integral y brócoli": {
    difficulty: 2,
    equipment: ["sarten", "olla"],
  },

  "Atún con pasta y champiñones": {
    difficulty: 1,
    equipment: ["sarten"],
  },

  "Jamón serrano con cuscús y champiñones": {
    difficulty: 1,
    equipment: ["sarten"],
  },

  "Yogur griego con granola y kiwi": {
    difficulty: 1,
    equipment: ["ninguno"],
  },

  "Tortitas de arroz con mantequilla de cacahuete": {
    difficulty: 1,
    equipment: ["ninguno"],
  },

  "Alubias con cuscús y verduras salteadas": {
    difficulty: 1,
    equipment: ["sarten"],
  },

  // ── Tanda 2026-08-31 (c) (182 → 207 platos) ──────────────────────────
  // Pescado. A partir de aquí el catálogo son permutaciones: la técnica
  // de cada proteína ya está escrita en un plato hermano, así que estos
  // son más cortos y reutilizan las mismas frases a propósito. Siguen
  // llevando cantidades, tiempos y una señal de "está hecho". Bloques
  // que se repiten: salmón (piel abajo 4+2 min, láminas), merluza (una
  // sola vuelta, se deshace), bacalao (aviso de desalado), lata (ya
  // cocida, al final), coliflor (se pasa a puré en un minuto).

  "Salmón con espinacas y pasta": {
    difficulty: 2,
    equipment: ["sarten"],
  },

  "Salmón horneado con quinoa y espinacas": {
    difficulty: 2,
    equipment: ["horno"],
  },

  "Salmón con patatas y coliflor": {
    difficulty: 2,
    equipment: ["sarten", "olla"],
  },

  "Salmón con quinoa y calabacín": {
    difficulty: 2,
    equipment: ["sarten"],
  },

  "Salmón con quinoa y brócoli": {
    difficulty: 2,
    equipment: ["sarten", "olla"],
  },

  "Merluza con quinoa y tomate": {
    difficulty: 2,
    equipment: ["sarten"],
  },

  "Merluza con patatas y pimientos": {
    difficulty: 2,
    equipment: ["sarten"],
  },

  "Merluza con quinoa y champiñones": {
    difficulty: 2,
    equipment: ["sarten"],
  },

  "Merluza con arroz y zanahoria": {
    difficulty: 2,
    equipment: ["sarten", "olla"],
  },

  "Bacalao con espinacas y arroz": {
    difficulty: 2,
    equipment: ["sarten"],
  },

  "Bacalao con arroz y brócoli": {
    difficulty: 2,
    equipment: ["sarten", "olla"],
  },

  "Bacalao con patatas y calabacín": {
    difficulty: 2,
    equipment: ["sarten"],
  },

  "Bacalao con quinoa y coliflor": {
    difficulty: 2,
    equipment: ["sarten", "olla"],
  },

  "Bacalao con arroz integral y verduras salteadas": {
    difficulty: 2,
    equipment: ["sarten"],
  },

  "Lubina con pasta y brócoli": {
    difficulty: 2,
    equipment: ["sarten", "olla"],
  },

  "Lubina con cuscús y verduras salteadas": {
    difficulty: 2,
    equipment: ["sarten"],
  },

  "Lubina con patatas y coliflor": {
    difficulty: 2,
    equipment: ["sarten", "olla"],
  },

  "Rape con quinoa y zanahoria": {
    difficulty: 2,
    equipment: ["sarten", "olla"],
  },

  "Rape con cuscús y espinacas": {
    difficulty: 2,
    equipment: ["sarten"],
  },

  "Rape con patatas y pimientos": {
    difficulty: 2,
    equipment: ["sarten"],
  },

  "Pasta con sardinas y tomate": {
    difficulty: 1,
    equipment: ["sarten"],
  },

  "Sardinas con tomate y arroz": {
    difficulty: 1,
    equipment: ["sarten"],
  },

  "Sardinas con arroz y coliflor": {
    difficulty: 1,
    equipment: ["sarten", "olla"],
  },

  "Sardinas con pasta y verduras salteadas": {
    difficulty: 1,
    equipment: ["sarten"],
  },

  "Sardinas con arroz integral y brócoli": {
    difficulty: 1,
    equipment: ["olla"],
  },

  // ── Tanda 2026-08-31 (d) (207 → 235 platos) ──────────────────────────
  // Carne. Mismo criterio que la tanda de pescado: la técnica de cada
  // corte ya está escrita, así que estos reutilizan los bloques a
  // propósito. Frases que se repiten: ternera CONTRA LA FIBRA, solomillo
  // que REPOSA 5 min, lomo de cerdo que se retira "de rosa a pálido",
  // picada que se dora SIN remover el primer minuto, jamón serrano que NO
  // se cocina, conejo dorado + 35 min tapado.

  "Poke bowl de pollo con arroz y aguacate": {
    difficulty: 2,
    equipment: ["sarten"],
  },

  "Quinoa con verduras asadas y pollo": {
    difficulty: 2,
    equipment: ["horno"],
  },

  "Ensalada de pollo con aguacate y quinoa": {
    difficulty: 1,
    equipment: ["sarten"],
  },

  "Pavo con pasta integral y tomate": {
    difficulty: 2,
    equipment: ["sarten"],
  },

  "Carne picada al wok con arroz": {
    difficulty: 2,
    equipment: ["sarten"],
  },

  "Cerdo con cuscús y zanahoria": {
    difficulty: 2,
    equipment: ["sarten"],
  },

  "Pollo con pasta y calabacín": {
    difficulty: 2,
    equipment: ["sarten"],
  },

  "Muslo de pollo con pasta y champiñones": {
    difficulty: 2,
    equipment: ["sarten"],
  },

  "Carne picada con quinoa y coliflor": {
    difficulty: 2,
    equipment: ["sarten"],
  },

  "Carne picada con quinoa y calabacín": {
    difficulty: 2,
    equipment: ["sarten"],
  },

  "Carne picada con arroz y brócoli": {
    difficulty: 2,
    equipment: ["sarten"],
  },

  "Ternera con quinoa y zanahoria": {
    difficulty: 2,
    equipment: ["sarten"],
  },

  "Ternera con arroz integral y champiñones": {
    difficulty: 2,
    equipment: ["sarten"],
  },

  "Solomillo de ternera con quinoa y coliflor": {
    difficulty: 2,
    equipment: ["sarten"],
  },

  "Solomillo de ternera con arroz integral y verduras salteadas": {
    difficulty: 2,
    equipment: ["sarten"],
  },

  "Lomo de cerdo con arroz integral y espinacas": {
    difficulty: 2,
    equipment: ["sarten"],
  },

  "Lomo de cerdo con cuscús y pimientos": {
    difficulty: 2,
    equipment: ["sarten"],
  },

  "Conejo con cuscús y calabacín": {
    difficulty: 3,
    equipment: ["olla"],
  },

  "Jamón serrano con patatas y zanahoria": {
    difficulty: 1,
    equipment: ["olla"],
  },

  "Pechuga de pollo al vapor con quinoa": {
    difficulty: 2,
    equipment: ["olla"],
  },

  "Pollo mediterráneo con cuscús y tomate": {
    difficulty: 2,
    equipment: ["sarten"],
  },

  "Ternera salteada con espinacas": {
    difficulty: 2,
    equipment: ["sarten"],
  },

  "Carne picada con cuscús y zanahoria": {
    difficulty: 2,
    equipment: ["sarten"],
  },

  "Pavo al horno con quinoa y verduras": {
    difficulty: 2,
    equipment: ["horno"],
  },

  "Pollo con cuscús y coliflor": {
    difficulty: 2,
    equipment: ["sarten"],
  },

  "Muslo de pollo con arroz integral y espinacas": {
    difficulty: 2,
    equipment: ["sarten"],
  },

  "Muslo de pollo con cuscús y pimientos": {
    difficulty: 2,
    equipment: ["sarten"],
  },

  // ── Tanda 2026-08-31 (e) (234 → 264 platos) ──────────────────────────
  // Latas, marisco cocido, legumbres de bote, tofu y tempeh, y los
  // montados (wrap, bocadillo). Bloques repetidos: lata (ya cocida, al
  // final, no se fríe), marisco cocido (45 s a 1 min o goma), legumbre de
  // bote (enjuagar, calentar suave, REMOVER LO JUSTO, vinagre al final),
  // tofu (PRENSAR 15 min, no tocar 4 min), tempeh (hervir 10 min contra
  // el amargor), pan que no se moja (barrera de grasa, tomate al centro).

  "Wrap de salmón con aguacate y espinacas": {
    difficulty: 2,
    equipment: ["sarten"],
  },

  "Macarrones con atún y verduras": {
    difficulty: 1,
    equipment: ["sarten"],
  },

  "Bocadillo de pavo con queso y verduras": {
    difficulty: 1,
    equipment: ["ninguno"],
  },

  "Atún con arroz y zanahoria": {
    difficulty: 1,
    equipment: ["olla"],
  },

  "Caballa con quinoa y pimientos": {
    difficulty: 1,
    equipment: ["sarten"],
  },

  "Gambas con quinoa y verduras salteadas": {
    difficulty: 1,
    equipment: ["sarten"],
  },

  "Gambas con quinoa y coliflor": {
    difficulty: 1,
    equipment: ["sarten", "olla"],
  },

  "Langostinos con quinoa y pimientos": {
    difficulty: 1,
    equipment: ["sarten"],
  },

  "Garbanzos con arroz y calabacín": {
    difficulty: 1,
    equipment: ["sarten"],
  },

  "Garbanzos con arroz integral y brócoli": {
    difficulty: 1,
    equipment: ["sarten", "olla"],
  },

  "Lentejas con cuscús y champiñones": {
    difficulty: 1,
    equipment: ["sarten"],
  },

  "Alubias con arroz integral y coliflor": {
    difficulty: 1,
    equipment: ["sarten", "olla"],
  },

  "Tofu con cuscús y espinacas": {
    difficulty: 2,
    equipment: ["sarten"],
  },

  "Tofu con patatas y pimientos": {
    difficulty: 2,
    equipment: ["sarten"],
  },

  "Carne picada con cuscús y brócoli": {
    difficulty: 2,
    equipment: ["sarten", "olla"],
  },

  "Carne picada con patatas y calabacín": {
    difficulty: 2,
    equipment: ["sarten"],
  },

  "Skyr con sardinas y tostadas": {
    difficulty: 1,
    equipment: ["tostadora"],
  },

  "Tortilla de claras con atún y tomate": {
    difficulty: 2,
    equipment: ["sarten"],
  },

  "Claras revueltas con pavo y espinacas": {
    difficulty: 2,
    equipment: ["sarten"],
  },

  "Tofu estofado con arroz y verduras": {
    difficulty: 2,
    equipment: ["sarten"],
  },

  "Caballa con patata y brócoli": {
    difficulty: 1,
    equipment: ["olla"],
  },

  "Caballa con arroz integral y zanahoria": {
    difficulty: 1,
    equipment: ["olla"],
  },

  "Caballa con cuscús y champiñones": {
    difficulty: 1,
    equipment: ["sarten"],
  },

  "Gambas con patatas y calabacín": {
    difficulty: 1,
    equipment: ["sarten"],
  },

  "Langostinos con patatas y champiñones": {
    difficulty: 1,
    equipment: ["sarten"],
  },

  "Langostinos con arroz y zanahoria": {
    difficulty: 1,
    equipment: ["olla"],
  },

  "Atún con arroz y pimientos": {
    difficulty: 1,
    equipment: ["sarten"],
  },

  "Atún con arroz integral y espinacas": {
    difficulty: 1,
    equipment: ["sarten"],
  },

  "Garbanzos con pasta y verduras salteadas": {
    difficulty: 1,
    equipment: ["sarten"],
  },

  "Lentejas con arroz y pimientos": {
    difficulty: 1,
    equipment: ["sarten"],
  },

  // ── Tanda 2026-08-31 (f) (264 → 285 platos) ──────────────────────────
  // Últimas permutaciones de cena (proteína + grano + verdura). Mismos
  // bloques. "Merluza al ajillo con verduras" se queda SIN instrucciones:
  // necesita ajo y ese rol sigue sin resolver (T2).

  "Carne picada con cuscús y calabacín": {
    difficulty: 2,
    equipment: ["sarten"],
  },

  "Carne picada con patatas y brócoli": {
    difficulty: 2,
    equipment: ["sarten", "olla"],
  },

  "Pavo con cuscús y champiñones": {
    difficulty: 2,
    equipment: ["sarten"],
  },

  "Pavo con patatas y zanahoria": {
    difficulty: 2,
    equipment: ["sarten", "olla"],
  },

  "Carne picada con patatas y coliflor": {
    difficulty: 2,
    equipment: ["sarten", "olla"],
  },

  "Ternera con patatas y pimientos": {
    difficulty: 2,
    equipment: ["sarten"],
  },

  "Ternera con arroz y espinacas": {
    difficulty: 2,
    equipment: ["sarten"],
  },

  "Solomillo de ternera con pasta y calabacín": {
    difficulty: 2,
    equipment: ["sarten"],
  },

  "Lomo de cerdo con arroz y zanahoria": {
    difficulty: 2,
    equipment: ["sarten", "olla"],
  },

  "Lomo de cerdo con pasta y champiñones": {
    difficulty: 2,
    equipment: ["sarten"],
  },

  "Conejo con pasta y verduras salteadas": {
    difficulty: 3,
    equipment: ["olla"],
  },

  "Conejo con quinoa y coliflor": {
    difficulty: 3,
    equipment: ["olla"],
  },

  "Jamón serrano con pasta y espinacas": {
    difficulty: 1,
    equipment: ["sarten"],
  },

  "Jamón serrano con quinoa y pimientos": {
    difficulty: 1,
    equipment: ["sarten"],
  },

  "Lentejas con pasta y espinacas": {
    difficulty: 1,
    equipment: ["sarten"],
  },

  "Alubias con pasta y brócoli": {
    difficulty: 1,
    equipment: ["sarten", "olla"],
  },

  "Alubias con quinoa y calabacín": {
    difficulty: 1,
    equipment: ["sarten"],
  },

  "Tofu con pasta y zanahoria": {
    difficulty: 2,
    equipment: ["sarten"],
  },

  "Tofu con quinoa y champiñones": {
    difficulty: 2,
    equipment: ["sarten"],
  },

  "Carne picada con quinoa y verduras salteadas": {
    difficulty: 2,
    equipment: ["sarten"],
  },

  "Carne picada con arroz y coliflor": {
    difficulty: 2,
    equipment: ["sarten", "olla"],
  },

  // ── Tanda 2026-08-31 (g) (285 → 309 platos) ──────────────────────────
  // Desayunos. Los de tazón (yogur/skyr/requesón/queso batido) son de
  // montar, con un solo consejo cada uno: los copos y la granola JUSTO
  // antes de comer o se reblandecen, la avena cruda necesita reposo o
  // queda arenosa, los frutos rojos congelados fuera 10 min sueltan jugo
  // que endulza. Y los de huevo, tostada y pan con embutido.

  "Skyr con piña y frutos secos": {
    difficulty: 1,
    equipment: ["ninguno"],
  },

  "Bowl proteico de skyr con almendras": {
    difficulty: 1,
    equipment: ["ninguno"],
  },

  "Queso fresco batido con copos y naranja": {
    difficulty: 1,
    equipment: ["ninguno"],
  },

  "Yogur griego con avena y plátano": {
    difficulty: 1,
    equipment: ["ninguno"],
  },

  "Yogur griego con copos de maíz y frutos rojos": {
    difficulty: 1,
    equipment: ["ninguno"],
  },

  "Skyr con granola y manzana": {
    difficulty: 1,
    equipment: ["ninguno"],
  },

  "Skyr con copos de maíz y fresas": {
    difficulty: 1,
    equipment: ["ninguno"],
  },

  "Queso fresco batido con copos de maíz y kiwi": {
    difficulty: 1,
    equipment: ["ninguno"],
  },

  "Queso fresco batido con avena y frutos rojos": {
    difficulty: 1,
    equipment: ["ninguno"],
  },

  "Queso fresco batido con granola y manzana": {
    difficulty: 1,
    equipment: ["ninguno"],
  },

  "Requesón con avena y fresas": {
    difficulty: 1,
    equipment: ["ninguno"],
  },

  "Requesón con granola y plátano": {
    difficulty: 1,
    equipment: ["ninguno"],
  },

  "Requesón con copos de maíz y kiwi": {
    difficulty: 1,
    equipment: ["ninguno"],
  },

  "Porridge de avena con nueces y canela": {
    difficulty: 1,
    equipment: ["olla"],
  },

  "Revuelto de huevos con jamón y pan": {
    difficulty: 2,
    equipment: ["sarten", "tostadora"],
  },

  "Huevos con pan de molde y espinacas": {
    difficulty: 2,
    equipment: ["sarten"],
  },

  "Claras de huevo con pan de centeno y verduras salteadas": {
    difficulty: 2,
    equipment: ["sarten", "tostadora"],
  },

  "Pan integral con atún y queso fresco": {
    difficulty: 1,
    equipment: ["ninguno"],
  },

  "Tostadas con salmón y queso fresco": {
    difficulty: 1,
    equipment: ["tostadora"],
  },

  "Pan tostado con hummus y tomate": {
    difficulty: 1,
    equipment: ["tostadora"],
  },

  "Jamón serrano con pan de centeno y verduras salteadas": {
    difficulty: 1,
    equipment: ["sarten", "tostadora"],
  },

  "Jamón serrano con pan integral y champiñones": {
    difficulty: 1,
    equipment: ["sarten", "tostadora"],
  },

  "Pavo con pan integral y champiñones": {
    difficulty: 1,
    equipment: ["sarten", "tostadora"],
  },

  "Pavo con pan de molde y calabacín": {
    difficulty: 1,
    equipment: ["sarten", "tostadora"],
  },

  // ── Tanda 2026-08-31 (h) (309 → 333 platos) ──────────────────────────
  // Snacks: casi todo lácteo + fruta/fruto seco, de montar. Cierra el
  // catálogo salvo "Merluza al ajillo con verduras", que necesita ajo
  // (rol sin resolver, T2). getDishInstructions devuelve null para ese y
  // el plato se renderiza sin pasos, exactamente como antes.

  "Batido proteico de yogur con plátano": {
    difficulty: 1,
    equipment: ["batidora"],
  },

  "Batido de skyr con fruta y avena": {
    difficulty: 1,
    equipment: ["batidora"],
  },

  "Skyr con miel y almendras": {
    difficulty: 1,
    equipment: ["ninguno"],
  },

  "Pavo con tomatitos y queso": {
    difficulty: 1,
    equipment: ["ninguno"],
  },

  "Mozzarella con tomate y pan": {
    difficulty: 1,
    equipment: ["ninguno"],
  },

  "Atún con pepino y queso": {
    difficulty: 1,
    equipment: ["ninguno"],
  },

  "Cacahuetes tostados y naranja": {
    difficulty: 1,
    equipment: ["sarten"],
  },

  "Puñado de almendras y frutos rojos": {
    difficulty: 1,
    equipment: ["ninguno"],
  },

  "Queso fresco con frutos rojos": {
    difficulty: 1,
    equipment: ["ninguno"],
  },

  "Tofu con pepino y salsa": {
    difficulty: 1,
    equipment: ["sarten"],
  },

  "Edamame con tortitas de arroz": {
    difficulty: 1,
    equipment: ["olla"],
  },

  "Skyr con fresas": {
    difficulty: 1,
    equipment: ["ninguno"],
  },

  "Yogur griego con kiwi": {
    difficulty: 1,
    equipment: ["ninguno"],
  },

  "Yogur griego con almendras": {
    difficulty: 1,
    equipment: ["ninguno"],
  },

  "Requesón con fresas": {
    difficulty: 1,
    equipment: ["ninguno"],
  },

  "Requesón con almendras": {
    difficulty: 1,
    equipment: ["ninguno"],
  },

  "Requesón con nueces": {
    difficulty: 1,
    equipment: ["ninguno"],
  },

  "Queso fresco batido con almendras": {
    difficulty: 1,
    equipment: ["ninguno"],
  },

  "Queso fresco batido con nueces": {
    difficulty: 1,
    equipment: ["ninguno"],
  },

  "Queso fresco batido con cacahuetes": {
    difficulty: 1,
    equipment: ["ninguno"],
  },

  "Atún con nueces": {
    difficulty: 1,
    equipment: ["ninguno"],
  },

  "Atún con cacahuetes": {
    difficulty: 1,
    equipment: ["ninguno"],
  },

  "Jamón serrano con cacahuetes": {
    difficulty: 1,
    equipment: ["ninguno"],
  },

  "Jamón serrano con kiwi": {
    difficulty: 1,
    equipment: ["ninguno"],
  },

  // ── Platos españoles nuevos (2026-08-31) ─────────────────────────────
  // Añadidos con T4, tras resolver cebolla/ajo/aceite en T2. El sofrito
  // (cebolla/pimiento pochados despacio) y el ajo dorado a fuego bajo son
  // la base de casi todos: el error típico es tener prisa o el fuego alto.

  "Tortilla de patatas": {
    difficulty: 3,
    equipment: ["sarten"],
  },

  "Pollo al ajillo con patatas": {
    difficulty: 2,
    equipment: ["sarten"],
  },

  "Pollo al ajillo con arroz": {
    difficulty: 2,
    equipment: ["sarten"],
  },

  "Pisto con huevo": {
    difficulty: 2,
    equipment: ["sarten"],
  },

  "Lentejas guisadas con verduras": {
    difficulty: 2,
    equipment: ["olla"],
  },

  "Garbanzos con espinacas": {
    difficulty: 2,
    equipment: ["sarten"],
  },

  "Bacalao con tomate": {
    difficulty: 2,
    equipment: ["sarten"],
  },

  "Merluza a la plancha con ensalada": {
    difficulty: 1,
    equipment: ["sarten"],
  },

  "Merluza en salsa verde con espinacas": {
    difficulty: 3,
    equipment: ["sarten"],
  },

  "Huevos a la flamenca": {
    difficulty: 2,
    equipment: ["sarten", "horno"],
  },

  "Sopa de ajo castellana": {
    difficulty: 2,
    equipment: ["olla"],
  },

  "Ensaladilla de atún": {
    difficulty: 1,
    equipment: ["olla"],
  },

  "Champiñones al ajillo": {
    difficulty: 1,
    equipment: ["sarten"],
  },

  "Gazpacho con picatostes": {
    difficulty: 1,
    equipment: ["batidora"],
  },

  // ── Platos llanos: proteína + guarnición (2026-09-01) ────────────────
  // Lo que come de verdad quien se cocina para la semana: una plancha y una
  // olla. Sin marinados, sin salsas, sin nada que haya que comprar aparte.
  // Los pasos son cortos a propósito: quien hace pollo con arroz no necesita
  // que le cuenten quince cosas.

  "Pollo con arroz": {
    difficulty: 1,
    equipment: ["sarten", "olla"],
  },

  "Pollo con quinoa": {
    difficulty: 1,
    equipment: ["sarten", "olla"],
  },

  "Pollo con pasta": {
    difficulty: 1,
    equipment: ["sarten", "olla"],
  },

  "Pollo con patatas": {
    difficulty: 1,
    equipment: ["sarten", "olla"],
  },

  "Cerdo con arroz": {
    difficulty: 1,
    equipment: ["sarten", "olla"],
  },

  "Pavo con arroz": {
    difficulty: 1,
    equipment: ["sarten", "olla"],
  },

  "Ternera con arroz": {
    difficulty: 2,
    equipment: ["sarten", "olla"],
  },

  "Huevos con arroz": {
    difficulty: 1,
    equipment: ["sarten", "olla"],
  },

  "Pollo con arroz integral": {
    difficulty: 1,
    equipment: ["sarten", "olla"],
  },

  "Pollo con arroz y brócoli": {
    difficulty: 1,
    equipment: ["sarten", "olla"],
  },

  "Cerdo con quinoa": {
    difficulty: 1,
    equipment: ["sarten", "olla"],
  },

  "Pavo con patatas": {
    difficulty: 1,
    equipment: ["sarten", "olla"],
  },

  "Pollo con pasta y tomate": {
    difficulty: 1,
    equipment: ["sarten", "olla"],
  },

  "Muslo de pollo con arroz": {
    difficulty: 1,
    equipment: ["sarten", "olla"],
  },

  "Cerdo con pasta": {
    difficulty: 1,
    equipment: ["sarten", "olla"],
  },

  "Huevos con patatas": {
    difficulty: 1,
    equipment: ["sarten", "olla"],
  },

  // ── La ultima que faltaba (2026-09-01) ───────────────────────────────
  // Estuvo sin pasos desde T3 porque el ajo no existia como rol; se
  // resolvio en T2 (USDA) y ya se puede escribir de verdad.
  "Merluza al ajillo con verduras": {
    difficulty: 2,
    equipment: ["sarten"],
  },

  // ── Platos baratos (2026-09-02) ───────────────────────────────────────
  // Cocina de andar por casa: sartén, olla y poco más. Lo mismo que el
  // resto del archivo -- cantidades, tiempos y una señal de que está listo.

  "Pasta con salchichas y tomate": {
    difficulty: 1,
    equipment: ["olla", "sarten"],
  },

  "Macarrones con salchichas": {
    difficulty: 1,
    equipment: ["olla", "sarten"],
  },

  "Pan con tomate y aceite": {
    difficulty: 1,
    equipment: ["tostadora"],
  },

  "Pan con tomate y queso": {
    difficulty: 1,
    equipment: ["tostadora"],
  },

  "Arroz con huevo y tomate": {
    difficulty: 1,
    equipment: ["olla", "sarten"],
  },

  "Bocadillo de salchichas": {
    difficulty: 1,
    equipment: ["sarten"],
  },

  "Salchichas con patatas": {
    difficulty: 1,
    equipment: ["olla", "sarten"],
  },

  "Fideos con salchichas y zanahoria": {
    difficulty: 1,
    equipment: ["olla", "sarten"],
  },

  "Pan con huevo duro y tomate": {
    difficulty: 1,
    equipment: ["olla", "tostadora"],
  },

  "Arroz con salchichas y zanahoria": {
    difficulty: 1,
    equipment: ["olla", "sarten"],
  },


  // ── Recetas de la ampliacion, lote 1 (solo principales) (2026-09-07) ────────────────────────
  "Ternera con batata y tomate": {
    difficulty: 2,
    equipment: ["sarten", "olla", "ninguno"],
  },

  "Solomillo con cuscús y champiñones": {
    difficulty: 2,
    equipment: ["sarten", "olla"],
  },

  "Gambas con batata y verduras salteadas": {
    difficulty: 1,
    equipment: ["sarten", "olla"],
  },

  "Bacalao con batata y tomate": {
    difficulty: 2,
    equipment: ["horno", "olla", "ninguno"],
  },

  "Pavo a la plancha con patata y maíz": {
    difficulty: 2,
    equipment: ["sarten", "olla"],
  },

  "Tofu con claras y zanahoria": {
    difficulty: 1,
    equipment: ["sarten"],
  },

  "Lentejas con claras y maíz": {
    difficulty: 1,
    equipment: ["sarten"],
  },

  "Ternera con batata y zanahoria": {
    difficulty: 2,
    equipment: ["sarten", "olla"],
  },

  "Pollo a la plancha con quinoa y zanahoria": {
    difficulty: 2,
    equipment: ["sarten", "olla"],
  },

  "Gambas con cuscús y pepino": {
    difficulty: 1,
    equipment: ["sarten", "olla", "ninguno"],
  },

  "Bacalao con quinoa y champiñones": {
    difficulty: 2,
    equipment: ["horno", "olla", "sarten"],
  },

  "Pavo a la plancha con batata y zanahoria": {
    difficulty: 2,
    equipment: ["sarten", "olla"],
  },

  "Tofu con claras y maíz": {
    difficulty: 1,
    equipment: ["sarten"],
  },

  "Lentejas con claras y zanahoria": {
    difficulty: 1,
    equipment: ["sarten"],
  },

  "Langostinos con quinoa y pepino": {
    difficulty: 1,
    equipment: ["sarten", "olla", "ninguno"],
  },

  "Pollo a la plancha con patata y champiñones": {
    difficulty: 2,
    equipment: ["sarten", "olla"],
  },

  "Bacalao con quinoa y zanahoria": {
    difficulty: 2,
    equipment: ["horno", "olla", "sarten"],
  },

  "Pavo a la plancha con quinoa y espinacas": {
    difficulty: 2,
    equipment: ["sarten", "olla"],
  },

  "Merluza con patata y tomate": {
    difficulty: 2,
    equipment: ["horno", "olla", "ninguno"],
  },

  "Garbanzos con claras y brócoli": {
    difficulty: 1,
    equipment: ["sarten", "olla"],
  },

  "Tofu con claras y tomate": {
    difficulty: 1,
    equipment: ["sarten", "ninguno"],
  },

  "Lentejas con claras y cebolla": {
    difficulty: 1,
    equipment: ["sarten"],
  },

  "Ternera con quinoa y pepino": {
    difficulty: 2,
    equipment: ["sarten", "olla", "ninguno"],
  },

  "Solomillo con patata y espinacas": {
    difficulty: 2,
    equipment: ["sarten", "olla"],
  },

  "Gambas con patata y cebolla": {
    difficulty: 1,
    equipment: ["sarten", "olla"],
  },

  "Merluza con quinoa y pepino": {
    difficulty: 2,
    equipment: ["horno", "olla", "ninguno"],
  },

  "Alubias con claras y brócoli": {
    difficulty: 1,
    equipment: ["sarten", "olla"],
  },

  "Tofu con claras y brócoli": {
    difficulty: 1,
    equipment: ["sarten", "olla"],
  },

  "Lentejas con claras y espinacas": {
    difficulty: 1,
    equipment: ["sarten"],
  },

  "Ternera con cuscús y cebolla": {
    difficulty: 2,
    equipment: ["sarten", "olla"],
  },

  "Gambas con cuscús y maíz": {
    difficulty: 1,
    equipment: ["sarten", "olla"],
  },

  "Bacalao con batata y maíz": {
    difficulty: 2,
    equipment: ["horno", "olla", "sarten"],
  },

  "Merluza con patata y calabacín": {
    difficulty: 2,
    equipment: ["horno", "olla", "sarten"],
  },

  "Garbanzos con claras y coliflor": {
    difficulty: 1,
    equipment: ["sarten", "olla"],
  },

  "Alubias con claras y coliflor": {
    difficulty: 1,
    equipment: ["sarten", "olla"],
  },

  "Tofu con claras y calabacín": {
    difficulty: 1,
    equipment: ["sarten"],
  },

  "Lentejas con claras y champiñones": {
    difficulty: 1,
    equipment: ["sarten"],
  },

  "Merluza con patata y coliflor": {
    difficulty: 2,
    equipment: ["horno", "olla"],
  },

  "Garbanzos con claras y espinacas": {
    difficulty: 1,
    equipment: ["sarten"],
  },

  "Tofu con claras y pimiento": {
    difficulty: 1,
    equipment: ["sarten"],
  },

  "Lentejas con claras y calabacín": {
    difficulty: 1,
    equipment: ["sarten"],
  },

  "Langostinos con patata y coliflor": {
    difficulty: 1,
    equipment: ["sarten", "olla"],
  },

  "Pollo a la plancha con quinoa y coliflor": {
    difficulty: 2,
    equipment: ["sarten", "olla"],
  },

  "Alubias con claras y espinacas": {
    difficulty: 1,
    equipment: ["sarten"],
  },

  "Langostinos con batata y zanahoria": {
    difficulty: 1,
    equipment: ["sarten", "olla"],
  },

  "Gambas con quinoa y pepino": {
    difficulty: 1,
    equipment: ["sarten", "olla", "ninguno"],
  },

  "Pavo a la plancha con batata y tomate": {
    difficulty: 2,
    equipment: ["sarten", "olla", "ninguno"],
  },

  "Garbanzos con claras y pepino": {
    difficulty: 1,
    equipment: ["sarten", "ninguno"],
  },

  "Alubias con claras y tomate": {
    difficulty: 1,
    equipment: ["sarten", "ninguno"],
  },

  "Pollo a la plancha con cuscús y champiñones": {
    difficulty: 2,
    equipment: ["sarten", "olla"],
  },

  "Merluza con quinoa y cebolla": {
    difficulty: 2,
    equipment: ["horno", "olla", "sarten"],
  },

  "Garbanzos con claras y cebolla": {
    difficulty: 1,
    equipment: ["sarten"],
  },

  "Alubias con claras y pepino": {
    difficulty: 1,
    equipment: ["sarten", "ninguno"],
  },

  "Langostinos con batata y champiñones": {
    difficulty: 1,
    equipment: ["sarten", "olla"],
  },

  "Ternera con cuscús y espinacas": {
    difficulty: 2,
    equipment: ["sarten", "olla"],
  },

  "Gambas con batata y tomate": {
    difficulty: 1,
    equipment: ["sarten", "olla", "ninguno"],
  },

  "Bacalao con quinoa y brócoli": {
    difficulty: 2,
    equipment: ["horno", "olla"],
  },

  "Pavo a la plancha con quinoa y cebolla": {
    difficulty: 2,
    equipment: ["sarten", "olla"],
  },

  "Garbanzos con claras y tomate": {
    difficulty: 1,
    equipment: ["sarten", "ninguno"],
  },

  "Alubias con claras y calabacín": {
    difficulty: 1,
    equipment: ["sarten"],
  },

  // ── Recetas de la ampliacion, lote 40 2026-10-17 (2026-10-17) ────────────────────────
  "Salmorejo cordobés": {
    difficulty: 1,
    equipment: ["batidora", "olla"],
  },

  "Tortilla de calabacín y cebolla": {
    difficulty: 2,
    equipment: ["sarten"],
  },

  "Fideuá de gambas": {
    difficulty: 2,
    equipment: ["sarten"],
  },

  "Pollo al chilindrón": {
    difficulty: 2,
    equipment: ["sarten"],
  },

  "Albóndigas en salsa de tomate": {
    difficulty: 2,
    equipment: ["sarten"],
  },

  "Pimientos rellenos de ternera": {
    difficulty: 2,
    equipment: ["horno", "sarten"],
  },

  "Revuelto de champiñones y gambas": {
    difficulty: 1,
    equipment: ["sarten"],
  },

  "Migas con pimiento y huevo": {
    difficulty: 2,
    equipment: ["sarten"],
  },

  "Crema de calabacín con queso": {
    difficulty: 1,
    equipment: ["olla", "batidora"],
  },

  "Ensalada de atún y pimiento asado": {
    difficulty: 1,
    equipment: ["olla", "ninguno"],
  },

  "Revuelto de calabacín con jamón": {
    difficulty: 1,
    equipment: ["sarten"],
  },

  "Arroz a la cubana": {
    difficulty: 1,
    equipment: ["sarten"],
  },

  "Patatas a lo pobre": {
    difficulty: 2,
    equipment: ["sarten"],
  },

  "Sopa de merluza y patata": {
    difficulty: 2,
    equipment: ["olla"],
  },

  "Merluza al horno con patata y cebolla": {
    difficulty: 1,
    equipment: ["horno"],
  },

  "Lentejas a la marinera": {
    difficulty: 2,
    equipment: ["olla"],
  },

  "Ensalada de atún con huevo cocido": {
    difficulty: 1,
    equipment: ["olla"],
  },

  "Ensalada de patata con atún y huevo": {
    difficulty: 1,
    equipment: ["olla"],
  },

  "Ensalada de naranja, patata y atún": {
    difficulty: 1,
    equipment: ["olla"],
  },

  "Salmón con miel y naranja": {
    difficulty: 1,
    equipment: ["horno"],
  },

  "Bacalao al horno con patata y ajo": {
    difficulty: 2,
    equipment: ["horno"],
  },

  "Pastel de avena y manzana al horno": {
    difficulty: 1,
    equipment: ["horno"],
  },

  "Pollo caprese al horno": {
    difficulty: 1,
    equipment: ["horno"],
  },

  "Ensalada de alubias con pollo": {
    difficulty: 1,
    equipment: ["sarten"],
  },

  "Tacos de lechuga con lentejas": {
    difficulty: 1,
    equipment: ["sarten"],
  },

  "Croquetas de garbanzos y lentejas": {
    difficulty: 2,
    equipment: ["sarten"],
  },

  "Tortitas de garbanzos, patata y zanahoria": {
    difficulty: 2,
    equipment: ["sarten"],
  },

  "Ensalada de arroz y lentejas con huevo": {
    difficulty: 1,
    equipment: ["olla"],
  },

  "Ensalada multicolor de pasta con atún y maíz": {
    difficulty: 1,
    equipment: ["olla"],
  },

  "Sopa de pollo con fideos y zanahoria": {
    difficulty: 1,
    equipment: ["olla"],
  },

  "Crema de zanahoria con patata": {
    difficulty: 1,
    equipment: ["olla", "batidora"],
  },

  "Crema de espinacas con queso": {
    difficulty: 1,
    equipment: ["olla", "batidora"],
  },

  "Ensalada de tofu y edamame con zanahoria": {
    difficulty: 1,
    equipment: ["sarten", "olla"],
  },

  "Bol de tofu crujiente con edamame y brócoli": {
    difficulty: 2,
    equipment: ["olla", "sarten"],
  },

  "Arroz a la mexicana con huevo": {
    difficulty: 1,
    equipment: ["sarten"],
  },

  "Frittata de calabacín y espinacas": {
    difficulty: 1,
    equipment: ["sarten"],
  },

  "Ensalada de pollo y pasta con maíz": {
    difficulty: 1,
    equipment: ["sarten"],
  },

  "Pechuga de pavo al horno con verduras": {
    difficulty: 1,
    equipment: ["horno"],
  },

  "Ternera magra al horno con patata y pimiento": {
    difficulty: 2,
    equipment: ["horno"],
  },

  "Garbanzos con pollo y tomate al curry": {
    difficulty: 2,
    equipment: ["sarten"],
  },
};

/**
 * @param {string} dishName
 * @returns {{equipment:string[], difficulty:number, makeAhead?:boolean}|null}  (los pasos: recetaPasos, js/core/recipe-assets.js)
 *   La COCINA del plato no vive aquí: está en js/data/dish-cuisine.js, que
 *   cubre los 334 platos y no depende de que se hayan escrito los pasos.
 *   null si el plato todavía no tiene instrucciones (la mayoría, durante
 *   el piloto) -- quien llame debe seguir funcionando igual en ese caso.
 */
function getDishInstructions(dishName) {
  if (!dishName) return null;
  return DISH_INSTRUCTIONS[dishName] || null;
}
