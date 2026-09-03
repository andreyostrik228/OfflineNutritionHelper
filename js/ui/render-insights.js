/**
 * js/ui/render-insights.js
 * ─────────────────────────────────────────────────────────────────────────
 * Renderiza el bloque "Notas del plan" y el bloque de advertencias.
 * También expone showWarning() para mensajes de error inmediatos
 * (por ejemplo, errores de validación del formulario).
 *
 * Diferencia respecto al render.js original:
 *   El audit de diversidad (fuentes de proteína y carbohidratos)
 *   ya NO depende de FOOD_DB (vacío en la nueva arquitectura).
 *   Lee directamente el campo `mainProt` de cada meal, que viene
 *   de DISH_DB y siempre está disponible.
 *
 * Depende de:
 *   js/core/utils.js  (round2, escapeHtml, goalText)
 *
 * Inicialización:
 *   Llamar a initInsightRefs(refs) desde js/app.js antes de usar.
 *
 * Expone (globales):
 *   initInsightRefs(refs)
 *   renderInsights(profile, result, data)
 *   renderWarnings(profile, result, data)
 *   showWarning(msg)
 * ─────────────────────────────────────────────────────────────────────────
 */

// Referencias DOM — se rellenan desde app.js.
var warningBox, insightsList;

/**
 * Conecta los nodos DOM necesarios para este módulo.
 * @param {object} refs
 * @param {HTMLElement} refs.warningBox    – bloque amarillo de advertencias
 * @param {HTMLElement} refs.insightsList  – <ul> de notas del plan
 */
function initInsightRefs(refs) {
  warningBox   = refs.warningBox;
  insightsList = refs.insightsList;
}

// ── Notas del plan ────────────────────────────────────────────────────────

/**
 * Rellena el bloque "Notas del plan" con 7 líneas de información:
 * TMB/TDEE, objetivo, g/kg de proteína, fuentes proteicas del día,
 * fuentes de carbohidratos del día, verificación del 25% y presupuesto/prep.
 *
 * El audit de diversidad usa el campo `mainProt` de cada meal
 * (en lugar de buscar en FOOD_DB, que está vacío en v3).
 *
 * Presupuesto: data.budget es SIEMPRE el presupuesto de COMPRA (cuánto se
 * paga hoy en caja) -- total.purchaseCost es el número que se compara
 * contra él; total.cost (usageCost, cuánto se consume realmente) se
 * muestra aparte, como dato informativo, nunca como el presupuesto en sí.
 * Ver la cabecera de js/engine/plan-generator.js para la distinción
 * completa.
 *
 * @param {object} profile  – { bmr, tdee, calories, protein, fats, carbs }
 * @param {object} result   – { meals[], total }
 * @param {object} data     – { weight, goal, budget, cookTime }
 */
function renderInsights(profile, result, data) {
  var total        = result.total;
  var proteinPerKg = round2(total.protein / data.weight);
  var purchaseCost = typeof total.purchaseCost === "number" ? total.purchaseCost : total.cost;
  var budgetGap    = round2(data.budget - purchaseCost);
  var avgPrep      = calcAvgPrep(result.meals);

  // Audit de diversidad: leer mainProt de los items del día
  var proteinSources = collectProteinSources(result.meals);
  var carbSources    = collectCarbSources(result.meals);

  // Verificación de la regla del 25%
  var capStatus = check25PercentRule(result.meals, total.kcal);

  var notes = [
    "TMB estimada: " + profile.bmr + " kcal. Gasto diario total estimado: " + profile.tdee + " kcal.",
    "Objetivo: " + goalText(data.goal) + ". Proteína final: " + proteinPerKg + " g/kg de peso corporal.",
    "Fuentes de proteína del día (" + proteinSources.length + "): " + (proteinSources.join(", ") || "—") + ".",
    "Fuentes de carbohidratos del día (" + carbSources.length + "): "    + (carbSources.join(", ")    || "—") + ".",
    capStatus,
    "Presupuesto diario: €" + round2(data.budget) + ". Compra necesaria: €" + round2(purchaseCost) +
      " (margen: €" + Math.max(0, budgetGap) + "). Consumo real de ingredientes: €" + round2(total.cost) + ".",
    "Tiempo medio de preparación por bloque: " + avgPrep + " min. Motor: platos reales de DISH_DB."
  ];

  insightsList.innerHTML = notes.map(function (n) {
    return "<li>" + escapeHtml(n) + "</li>";
  }).join("");
}

// ── Advertencias ──────────────────────────────────────────────────────────

/**
 * Muestra u oculta el bloque amarillo de advertencias según el plan.
 * Comprueba: presupuesto, desviación calórica, tiempo de cocina,
 * presupuesto muy bajo y diversidad de proteínas/carbohidratos.
 *
 * @param {object} profile  – { calories }
 * @param {object} result   – { meals[], total }
 * @param {object} data     – { budget, cookTime }
 */
function renderWarnings(profile, result, data) {
  var messages = [];
  var total    = result.total;

  var purchaseCost = typeof total.purchaseCost === "number" ? total.purchaseCost : total.cost;
  if (purchaseCost > data.budget + 0.01) {
    // Corto a proposito: la cifra es lo unico que importa aqui. La receta
    // de que hacer (ampliar presupuesto, marcar despensa, mas tiempo) ya
    // esta en los propios controles, y repetirla en cada plan ajustado
    // era lo que convertia este aviso en un parrafo.
    messages.push("La compra sale a €" + (Math.round(purchaseCost * 100) / 100) +
                  ", algo por encima de tu €" + data.budget + ".");

    // Y si ademas es un plan de UN dia, el consejo mas util no es "gasta
    // mas": es comprar para varios dias. Un paquete se paga una vez y
    // rinde en todos ellos. Medido sobre 8 planes por punto con el
    // catalogo actual: a 8 EUR/dia la compra baja de 8,77 a 6,10 por dia
    // comprando para siete, y la proporcion se mantiene en 12 y 16 EUR
    // (~30% menos). Solo se dice AQUI, cuando el presupuesto no llega y
    // el plan es de un dia: en cualquier otro momento seria ruido.
    if ((data.planDays || 1) === 1) {
      messages.push("Comprando para 3 o 7 días sale más barato por día.");
    }
  }

  // Umbral subido de 220 a 600 kcal: con objetivos de volumen altos, la
  // raci\u00f3n m\u00e1xima realista por plato (1.35x, tope del 25% diario) deja un
  // techo de ~3000-3300 kcal/d\u00eda \u2014 por debajo de eso, un desv\u00edo de
  // 600-900 kcal es la norma estructural, no una rareza puntual. A 220
  // este aviso sal\u00eda en pr\u00e1cticamente cualquier plan de volumen, que
  // dejaba de ser una se\u00f1al \u00fatil. Con 600, solo avisa cuando el desv\u00edo es
  // genuinamente grande.
  if (Math.abs(profile.calories - total.kcal) > 600) {
    messages.push("Las calor\u00edas no cuadran del todo con este tiempo y presupuesto.");
  }

  if (data.cookTime <= 10) {
    messages.push("Poco tiempo de cocina: platos m\u00e1s simples.");
  }

  // Umbral recalibrado junto con los presets 2026-08-07 (15/20/28 de
  // presupuesto de COMPRA, antes 5/8/12 de usageCost) -- mantiene la misma
  // relación relativa que antes: "en o justo por encima del preset
  // Ajustado" (ver js/data/budget-presets.js).
  //
  // 2026-09-01: bajado a 12,5 al recalibrar los tramos a 8/12/16/20. Avisa
  // en "Muy ajustado" y "Ajustado", donde la variedad sí se resiente.
  if (data.budget <= 12.5) {
    messages.push("Presupuesto ajustado: menos variedad.");
  }

  var proteinSources = collectProteinSources(result.meals);
  var carbSources    = collectCarbSources(result.meals);

  if (proteinSources.length < 3) {
    messages.push("Solo " + proteinSources.length + " fuentes de prote\u00edna.");
  }
  if (carbSources.length < 3) {
    messages.push("Solo " + carbSources.length + " fuentes de carbohidratos.");
  }

  if (messages.length) {
    // Lista compacta, no parrafos separados por <br><br>: son notas sobre
    // el plan, no un texto que haya que leer entero.
    warningBox.innerHTML = "<ul><li>" + messages.map(escapeHtml).join("</li><li>") + "</li></ul>";
    // Y NO en rojo: el plan esta hecho y sirve. El rojo se reserva para
    // showWarning(), donde de verdad hay algo que corregir.
    warningBox.classList.remove("warning--error");
    warningBox.classList.add("show");
  } else {
    warningBox.classList.remove("show");
    warningBox.textContent = "";
  }
}

/**
 * Muestra un mensaje de advertencia/error inmediato en el bloque amarillo.
 * Usado para errores de validación del formulario.
 *
 * @param {string} msg
 */
function showWarning(msg) {
  warningBox.textContent = msg;
  // Esto SI es un error que impide seguir (falta el presupuesto, ha fallado
  // la generacion): aqui el rojo esta justificado, y por eso las NOTAS del
  // plan dejaron de usarlo -- si todo grita, nada avisa.
  warningBox.classList.add("warning--error");
  warningBox.classList.add("show");
}

// ── Funciones auxiliares privadas ─────────────────────────────────────────

/**
 * Recoge los mainProt únicos de todos los meals del día.
 * Usa el primer item de cada meal para leer su mainProt (todos los items
 * de un meal comparten el mainProt del plato elegido en DISH_DB).
 *
 * @param {object[]} meals
 * @returns {string[]}  lista de mainProt únicos, en orden de aparición
 */
function collectProteinSources(meals) {
  var seen = [];
  meals.forEach(function (meal) {
    // mainProt se guarda en el primer item del meal (herencia del plato DISH_DB)
    // Si no está disponible como campo directo, se toma del label del plato
    var prot = meal.mainProt || extractMainProtFromLabel(meal.label);
    if (prot && seen.indexOf(prot) === -1) seen.push(prot);
  });
  return seen;
}

/**
 * Recoge los nombres de ítems con >15 g de carbohidratos únicos en el día.
 * Estos vienen de los ingredientes visibles de cada meal (meal.items).
 *
 * @param {object[]} meals
 * @returns {string[]}
 */
function collectCarbSources(meals) {
  var seen = [];
  meals.forEach(function (meal) {
    meal.items.forEach(function (item) {
      if (item.carbs >= 15 && seen.indexOf(item.name) === -1) {
        seen.push(item.name);
      }
    });
  });
  return seen;
}

/**
 * Extrae una indicación del tipo de proteína a partir del label del meal.
 * Fallback cuando mainProt no está disponible directamente en el meal.
 * No es exhaustivo — solo cubre los mainProt más comunes de DISH_DB.
 *
 * @param {string} label  – ej. "Comida — Pollo a la plancha con arroz"
 * @returns {string|null}
 */
function extractMainProtFromLabel(label) {
  var lower = (label || "").toLowerCase();
  var mapping = [
    ["pollo",    "pollo"],
    ["pavo",     "pavo"],
    ["ternera",  "ternera"],
    ["carne",    "ternera"],
    ["cerdo",    "cerdo"],
    ["salm\u00f3n", "salmon"],
    ["sardina",  "salmon"],
    ["caballa",  "salmon"],
    ["merluza",  "merluza"],
    ["bacalao",  "merluza"],
    ["at\u00fan", "atun"],
    ["huevo",    "huevo"],
    ["clara",    "huevo"],
    ["yogur",    "yogur"],
    ["skyr",     "yogur"],
    ["queso",    "queso"],
    ["requesón", "queso"],
    ["legumbre", "legumbre"],
    ["lenteja",  "legumbre"],
    ["garbanzo", "legumbre"],
    ["alubia",   "legumbre"],
    ["conejo",   "conejo"],
    ["jamón serrano", "jamon"],
    ["gamba",    "gamba"],
    ["langostino", "gamba"],
    ["lubina",   "lubina"],
    ["rape",     "merluza"],
    ["solomillo de ternera", "ternera"],
    ["tofu",     "tofu"],
    ["tempeh",   "tofu"],
    ["edamame",  "tofu"],
    ["avena",    "avena"],
    ["cacahuete","cacahuete"]
  ];
  for (var i = 0; i < mapping.length; i++) {
    if (lower.indexOf(mapping[i][0]) !== -1) return mapping[i][1];
  }
  return null;
}

/**
 * Calcula el tiempo medio de preparación por toma.
 * @param {object[]} meals
 * @returns {number} minutos (entero)
 */
function calcAvgPrep(meals) {
  if (!meals || meals.length === 0) return 0;
  var total = meals.reduce(function (acc, m) { return acc + (m.prep || 0); }, 0);
  return Math.round(total / meals.length);
}

/**
 * Comprueba si algún ítem supera el 25% de las kcal diarias.
 * Devuelve un string de estado para la lista de notas.
 *
 * @param {object[]} meals
 * @param {number}   dailyKcal
 * @returns {string}
 */
function check25PercentRule(meals, dailyKcal) {
  var violations = [];
  meals.forEach(function (meal) {
    meal.items.forEach(function (item) {
      if (item.kcal / dailyKcal > 0.25) {
        violations.push(item.name + " (" + Math.round(item.kcal / dailyKcal * 100) + "%)");
      }
    });
  });
  if (violations.length === 0) {
    return "Ning\u00fan alimento supera el 25% de las calor\u00edas diarias.";
  }
  return "Atenci\u00f3n \u2014 alimentos con m\u00e1s del 25% de las calor\u00edas (tras ajuste): " + violations.join(", ");
}
