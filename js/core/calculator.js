/**
 * js/core/calculator.js
 * ─────────────────────────────────────────────────────────────────────────
 * Lectura del formulario, validación de datos, resolución del presupuesto
 * y cálculo del perfil nutricional (BMR, TDEE, calorías objetivo,
 * proteínas, grasas, carbos).
 *
 * Fórmula: Mifflin-St Jeor con ajuste por actividad y entrenamientos.
 *
 * Depende de:
 *   js/core/utils.js         (round0, round1)
 *   js/data/budget-presets.js (BUDGET_PRESETS, DEFAULT_BUDGET_PERIOD) — opcional
 *
 * Expone (globales):
 *   readForm()               → objeto con los valores del formulario
 *   validateInput(data)      → string de error o "" si todo es válido
 *   resolveBudget(data)      → número final para data.budget, o null
 *   calculateProfile(data)   → { bmr, tdee, calories, protein, fats, carbs }
 * ─────────────────────────────────────────────────────────────────────────
 */

/**
 * Lee todos los campos del formulario y devuelve un objeto tipado.
 *
 * El presupuesto tiene DOS vías mutuamente excluyentes por diseño (grupo
 * de radio nativo `name="budgetMode"`, ver index.html): un preset
 * (small/medium/high) o una cantidad exacta ("custom", campo #budgetCustom).
 * budgetMode es null si el usuario no ha elegido ninguna — validateInput()
 * lo rechaza explícitamente, nunca se asume un valor por defecto aquí.
 *
 * @returns {{age, sex, weight, height, activity, workouts, goal, budgetMode, budgetCustom, cookTime, taste, store}}
 */
function readForm() {
  var budgetModeInput = document.querySelector('input[name="budgetMode"]:checked');
  var budgetCustomEl = document.getElementById("budgetCustom");
  var storeEl = document.getElementById("store");

  return {
    age:      Number(document.getElementById("age").value),
    sex:      document.getElementById("sex").value,
    weight:   Number(document.getElementById("weight").value),
    height:   Number(document.getElementById("height").value),
    activity: Number(document.getElementById("activity").value),
    workouts: Number(document.getElementById("workouts").value),
    goal:     document.getElementById("goal").value,
    budgetMode:   budgetModeInput ? budgetModeInput.value : null,
    budgetCustom: budgetCustomEl ? Number(budgetCustomEl.value) : NaN,
    cookTime: Number(document.getElementById("cookTime").value),
    taste:    document.getElementById("taste").value,
    // Selector de tienda (2026-08-24) -- opcional a propósito (storeEl
    // puede no existir si este módulo se usa fuera de index.html, ej.
    // en tests): plan-generator.js::sanitizeInputs() ya cae en
    // DEFAULT_STORE_ID si data.store viene undefined.
    store:    storeEl ? storeEl.value : undefined
  };
}

/**
 * Valida los datos del formulario.
 * @param {object} data - resultado de readForm()
 * @returns {string} mensaje de error, o "" si los datos son válidos
 */
function validateInput(data) {
  if (!data.age    || data.age    < 14  || data.age    > 90)  return "Edad no válida.";
  if (!data.weight || data.weight < 35  || data.weight > 250) return "Peso no válido.";
  if (!data.height || data.height < 130 || data.height > 230) return "Altura no válida.";
  if (data.workouts < 0 || data.workouts > 14)                return "Entrenamientos por semana no válidos.";

  if (!data.budgetMode) {
    return "Elige un presupuesto: Ajustado, Equilibrado, Amplio, o introduce una cantidad exacta.";
  }
  if (data.budgetMode === "custom") {
    if (!data.budgetCustom || data.budgetCustom < 2) {
      return "El presupuesto diario es demasiado bajo para generar un plan realista.";
    }
  } else if (!isKnownBudgetPreset(data.budgetMode)) {
    // No debería ocurrir con el HTML actual (solo hay 4 opciones posibles
    // en el grupo de radio), pero si budget-presets.js cambiase de claves
    // sin actualizar el HTML, esto lo detecta en vez de generar un plan
    // con un presupuesto inventado.
    return "El presupuesto elegido no está disponible. Prueba con una cantidad exacta.";
  }
  return "";
}

/**
 * @param {string} mode - "small"|"medium"|"high"
 * @returns {boolean}
 */
function isKnownBudgetPreset(mode) {
  var period = (typeof DEFAULT_BUDGET_PERIOD !== "undefined") ? DEFAULT_BUDGET_PERIOD : "day";
  var presets = (typeof BUDGET_PRESETS !== "undefined") ? BUDGET_PRESETS[period] : null;
  return !!(presets && presets[mode] && typeof presets[mode].amount === "number");
}

/**
 * Resuelve el presupuesto FINAL (un número, en €/día) a partir de
 * data.budgetMode/data.budgetCustom — llamar solo después de que
 * validateInput(data) haya devuelto "". A partir de aquí, todo el resto
 * del pipeline (plan-generator.js, dish-selector.js, render-insights.js,
 * render-shopping-list.js) sigue leyendo `data.budget` exactamente igual
 * que antes de que existieran los presets: no necesitan saber si el
 * número vino de un preset o de una cifra exacta.
 *
 * @param {object} data - resultado de readForm(), ya validado
 * @returns {number|null} - null solo si se llama sin validar antes (no
 *                          debería alcanzarse en el flujo normal de la app)
 */
function resolveBudget(data) {
  if (data.budgetMode === "custom") {
    return data.budgetCustom;
  }
  var period = (typeof DEFAULT_BUDGET_PERIOD !== "undefined") ? DEFAULT_BUDGET_PERIOD : "day";
  var presets = (typeof BUDGET_PRESETS !== "undefined") ? BUDGET_PRESETS[period] : null;
  var preset = presets && data.budgetMode ? presets[data.budgetMode] : null;
  return preset ? preset.amount : null;
}

/**
 * Calcula el perfil nutricional completo a partir de los datos del formulario.
 *
 * Proceso:
 *  1. BMR por Mifflin-St Jeor
 *  2. TDEE = BMR × multiplicador de actividad + ajuste por entrenamientos
 *  3. Calorías objetivo según goal (volumen +superávit / definición -déficit)
 *  4. Proteínas = peso × multiplicador según goal
 *  5. Grasas    = peso × multiplicador según goal
 *  6. Carbos    = calorías restantes ÷ 4  (mínimo 80 g)
 *
 * @param {object} data - resultado de readForm()
 * @returns {{ bmr, tdee, calories, protein, fats, carbs }}
 */
function calculateProfile(data) {
  // 1. BMR (Mifflin-St Jeor)
  const bmr = data.sex === "male"
    ? 10 * data.weight + 6.25 * data.height - 5 * data.age + 5
    : 10 * data.weight + 6.25 * data.height - 5 * data.age - 161;

  // 2. Ajuste adicional por frecuencia de entrenamiento
  let workoutAdjustment = 0;
  if      (data.workouts >= 6) workoutAdjustment = 140;
  else if (data.workouts >= 4) workoutAdjustment = 90;
  else if (data.workouts >= 2) workoutAdjustment = 45;

  const tdeeBase = bmr * data.activity + workoutAdjustment;

  // 3. Calorías objetivo según goal
  let targetCalories = tdeeBase;
  if (data.goal === "bulk") {
    const surplus = 200 + Math.min(200, data.workouts * 25);
    targetCalories = tdeeBase + surplus;
  } else if (data.goal === "cut") {
    const deficit = 300 + Math.min(150, data.workouts * 15);
    targetCalories = tdeeBase - deficit;
  }
  // "recomp" → mantenimiento (tdeeBase sin modificar)

  // 4. Macros
  const proteinMultiplier = data.goal === "cut"   ? 2.2
                          : data.goal === "recomp" ? 2.0
                          : 1.9;
  const fatMultiplier = data.goal === "bulk" ? 0.9
                      : data.goal === "cut"  ? 0.8
                      : 0.85;

  const proteinTarget = round1(data.weight * proteinMultiplier);
  const fatsTarget    = round1(data.weight * fatMultiplier);

  // 5. Carbos con suelo mínimo
  let carbsTarget = (targetCalories - (proteinTarget * 4 + fatsTarget * 9)) / 4;
  if (carbsTarget < 80) carbsTarget = 80;

  // Recalcular calorías totales con macros redondeados
  targetCalories = proteinTarget * 4 + fatsTarget * 9 + carbsTarget * 4;

  return {
    bmr:      round0(bmr),
    tdee:     round0(tdeeBase),
    calories: round0(targetCalories),
    protein:  round1(proteinTarget),
    fats:     round1(fatsTarget),
    carbs:    round1(carbsTarget)
  };
}
