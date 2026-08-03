/**
 * poc/data/poc-recipes.js
 * ─────────────────────────────────────────────────────────────────────────
 * Proof-of-concept: 8 recetas tomadas TAL CUAL de js/data/dishes.js
 * (mismo nombre, categoría, prep, taste, mainProt, mismas cantidades en
 * gramos por ingrediente) pero reescritas al nuevo modelo: en vez de
 * declarar kcal/protein/carbs/fat/cost a mano, cada línea de ingrediente
 * referencia un ROL genérico ("role") que el IngredientResolver resuelve
 * contra REAL_PRODUCTS. Los macros/coste se calculan, no se escriben aquí.
 *
 * NO se ha tocado js/data/dishes.js -- este archivo es una selección
 * paralela de 8 de sus 204 platos, para la prueba de concepto pedida.
 *
 * Se añade "steps" (instrucciones de preparación), campo que no existe hoy
 * en dishes.js -- contenido nuevo, no nutrición, así que no hay riesgo de
 * "inventar datos" en el sentido que preocupa al resto del sistema.
 * ─────────────────────────────────────────────────────────────────────────
 */

var POC_RECIPES = [
  {
    name: "Porridge de avena con plátano y miel",
    category: "desayuno",
    prep: 5,
    taste: "sweet",
    mainProt: "avena",
    lines: [
      { role: "avena", qty: 80, unit: "g" },
      { role: "platano", qty: 100, unit: "g" },
      { role: "miel", qty: 15, unit: "g" },
      { role: "leche semidesnatada", qty: 200, unit: "g" }
    ],
    steps: [
      "Calienta la leche semidesnatada sin que llegue a hervir.",
      "Añade la avena y cuece a fuego bajo 3-4 min removiendo.",
      "Sirve y corona con el plátano en rodajas y la miel."
    ]
  },
  {
    name: "Pan integral con atún y tomate",
    category: "desayuno",
    prep: 5,
    taste: "savory",
    mainProt: "atun",
    lines: [
      { role: "pan integral", qty: 80, unit: "g" },
      { role: "atun al natural", qty: 100, unit: "g" },
      { role: "tomate", qty: 80, unit: "g" }
    ],
    steps: [
      "Tuesta el pan integral.",
      "Escurre el atún al natural y repártelo sobre el pan.",
      "Corta el tomate en rodajas finas y añádelo por encima."
    ]
  },
  {
    name: "Skyr con plátano y almendras",
    category: "desayuno",
    prep: 3,
    taste: "sweet",
    mainProt: "yogur",
    lines: [
      { role: "skyr natural", qty: 200, unit: "g" },
      { role: "platano", qty: 100, unit: "g" },
      { role: "almendras", qty: 20, unit: "g" }
    ],
    steps: [
      "Sirve el skyr en un bowl.",
      "Añade el plátano troceado y las almendras por encima."
    ]
  },
  {
    name: "Pollo a la plancha con arroz y brócoli",
    category: "comida",
    prep: 20,
    taste: "savory",
    mainProt: "pollo",
    lines: [
      { role: "pechuga de pollo", qty: 200, unit: "g" },
      { role: "arroz blanco cocido", qty: 220, unit: "g" },
      { role: "brocoli", qty: 150, unit: "g" }
    ],
    steps: [
      "Salpimienta la pechuga y cocínala a la plancha 5-6 min por cada lado.",
      "Cuece o saltea el brócoli al vapor 4-5 min.",
      "Calienta el arroz y sirve los tres elementos juntos."
    ]
  },
  {
    name: "Pechuga de pollo a la plancha con ensalada",
    category: "cena",
    prep: 15,
    taste: "savory",
    mainProt: "pollo",
    lines: [
      { role: "pechuga de pollo", qty: 200, unit: "g" },
      { role: "tomate", qty: 80, unit: "g" },
      { role: "pepino", qty: 80, unit: "g" },
      { role: "espinacas", qty: 60, unit: "g" }
    ],
    steps: [
      "Cocina la pechuga a la plancha 5-6 min por cada lado.",
      "Trocea el tomate y el pepino, mezcla con las espinacas crudas.",
      "Sirve la pechuga sobre la ensalada."
    ]
  },
  {
    name: "Salmón a la plancha con espinacas y limón",
    category: "cena",
    prep: 15,
    taste: "savory",
    mainProt: "salmon",
    lines: [
      { role: "salmon", qty: 200, unit: "g" },
      { role: "espinacas", qty: 150, unit: "g" },
      { role: "brocoli", qty: 100, unit: "g" }
    ],
    steps: [
      "Cocina el salmón a la plancha 3-4 min por cada lado.",
      "Saltea las espinacas y el brócoli al vapor.",
      "Sirve con un chorro de limón."
    ]
  },
  {
    name: "Yogur griego con frutos secos y miel",
    category: "snack",
    prep: 2,
    taste: "sweet",
    mainProt: "yogur",
    lines: [
      { role: "yogur griego ligero", qty: 200, unit: "g" },
      { role: "almendras", qty: 20, unit: "g" },
      { role: "miel", qty: 10, unit: "g" }
    ],
    steps: [
      "Sirve el yogur griego en un bowl.",
      "Añade las almendras y un hilo de miel por encima."
    ]
  },
  {
    name: "Almendras y manzana",
    category: "snack",
    prep: 1,
    taste: "mixed",
    mainProt: "cacahuete",
    lines: [
      { role: "almendras", qty: 25, unit: "g" },
      { role: "manzana", qty: 150, unit: "g" }
    ],
    steps: [
      "Lava y corta la manzana en gajos.",
      "Sirve junto con las almendras."
    ]
  }
];

if (typeof module !== "undefined" && module.exports) {
  module.exports = { POC_RECIPES: POC_RECIPES };
}
