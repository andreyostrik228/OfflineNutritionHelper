/**
 * js/app.js
 * ─────────────────────────────────────────────────────────────────────────
 * Punto de entrada de la aplicación. Conecta el DOM con la lógica de
 * los demás módulos. Debe cargarse ÚLTIMO (depende de todo lo anterior).
 *
 * Responsabilidades:
 *  - Capturar referencias al DOM
 *  - Inicializar los módulos de render (initRenderRefs / initInsightRefs)
 *  - Manejar el submit del formulario → calcular perfil → generar plan → render
 *  - Botones "Ejemplo alto en proteína" y "Resetear"
 *  - Mostrar/ocultar el spinner mientras se calcula
 *
 * Depende de:
 *   js/core/calculator.js   (readForm, validateInput, calculateProfile)
 *   js/engine/plan-generator.js (generateDietPlan)
 *   js/ui/render.js         (initRenderRefs, renderSummary, renderMeals)
 *   js/ui/render-insights.js(initInsightRefs, renderInsights, renderWarnings, showWarning)
 *   js/ui/animations.js     (animateMealCardsIn, animateSummaryNumbers — GSAP, opcional)
 *   js/data/dishes.js       (DISH_DB, solo para el contador informativo)
 * ─────────────────────────────────────────────────────────────────────────
 */

document.addEventListener("DOMContentLoaded", function () {

  // ── Referencias al DOM ───────────────────────────────────────────────
  var form          = document.getElementById("plannerForm");
  var fillExampleBtn= document.getElementById("fillExampleBtn");
  var resetBtn      = document.getElementById("resetBtn");
  var spinnerWrap   = document.getElementById("spinnerWrap");
  var statusText    = document.getElementById("statusText");
  var foodCountEl   = document.getElementById("foodCount");
  var mealsContainer= document.getElementById("mealsContainer");
  var warningBox    = document.getElementById("warningBox");
  var insightsList  = document.getElementById("insightsList");

  var verifiedGrid        = document.getElementById("verifiedGrid");
  var verifiedCount       = document.getElementById("verifiedCount");
  var verifiedSearchInput = document.getElementById("verifiedSearchInput");
  var verifiedEmpty       = document.getElementById("verifiedEmpty");
  var verifiedEmptyQuery  = document.getElementById("verifiedEmptyQuery");

  var noCookBtn     = document.getElementById("noCookBtn");
  var noCookPanel   = document.getElementById("noCookPanel");
  var noCookResults = document.getElementById("noCookResults");
  var noCookCount   = document.getElementById("noCookCount");
  var noCookStatus  = document.getElementById("noCookStatus");

  var shoppingPanel            = document.getElementById("shoppingPanel");
  var shoppingSummaryEl        = document.getElementById("shoppingSummary");
  var shoppingCountEl          = document.getElementById("shoppingCount");
  var shoppingListContainerEl  = document.getElementById("shoppingListContainer");

  var budgetModeRadios   = document.querySelectorAll('input[name="budgetMode"]');
  var budgetCustomField  = document.getElementById("budgetCustomField");
  var budgetCustomInput  = document.getElementById("budgetCustom");

  var summaryEls = {
    calories:    document.getElementById("sumCalories"),
    caloriesSub: document.getElementById("sumCaloriesSub"),
    protein:     document.getElementById("sumProtein"),
    proteinSub:  document.getElementById("sumProteinSub"),
    carbs:       document.getElementById("sumCarbs"),
    carbsSub:    document.getElementById("sumCarbsSub"),
    fats:        document.getElementById("sumFats"),
    fatsSub:     document.getElementById("sumFatsSub")
  };

  // ── Inicializar módulos de render ────────────────────────────────────
  initRenderRefs({ mealsContainer: mealsContainer, summaryEls: summaryEls });
  initInsightRefs({ warningBox: warningBox, insightsList: insightsList });

  if (shoppingPanel && typeof initShoppingListRefs === "function") {
    initShoppingListRefs({
      shoppingPanel: shoppingPanel,
      shoppingSummaryEl: shoppingSummaryEl,
      shoppingCountEl: shoppingCountEl,
      shoppingListContainer: shoppingListContainerEl
    });
  }

  // ── Contador informativo de la base de platos ────────────────────────
  if (foodCountEl && typeof DISH_DB !== "undefined") {
    foodCountEl.textContent = DISH_DB.length;
  }

  // ── Presets de presupuesto (Ajustado/Equilibrado/Amplio) ─────────────
  // Los importes se rellenan desde js/data/budget-presets.js (una sola
  // fuente de verdad) en vez de escribirlos en el HTML — igual que
  // foodCount se rellena desde DISH_DB.length arriba.
  (function initBudgetModes() {
    if (typeof BUDGET_PRESETS === "undefined" || typeof DEFAULT_BUDGET_PERIOD === "undefined") return;
    var presets = BUDGET_PRESETS[DEFAULT_BUDGET_PERIOD];
    if (!presets) return;

    var smallEl  = document.getElementById("budgetSmallAmount");
    var mediumEl = document.getElementById("budgetMediumAmount");
    var highEl   = document.getElementById("budgetHighAmount");
    if (smallEl  && presets.small)  smallEl.textContent  = "€" + presets.small.amount  + "/día";
    if (mediumEl && presets.medium) mediumEl.textContent = "€" + presets.medium.amount + "/día";
    if (highEl   && presets.high)   highEl.textContent   = "€" + presets.high.amount   + "/día";
  })();

  // Solo el modo "custom" muestra el campo de cantidad exacta — elegir un
  // preset lo oculta y limpia, para que readForm() nunca lea un valor
  // numérico obsoleto de un preset anterior.
  function updateBudgetCustomVisibility() {
    var checked = document.querySelector('input[name="budgetMode"]:checked');
    var isCustom = !!checked && checked.value === "custom";
    if (budgetCustomField) budgetCustomField.hidden = !isCustom;
  }

  budgetModeRadios.forEach(function (radio) {
    radio.addEventListener("change", updateBudgetCustomVisibility);
  });

  // ── Catálogo verificado (productos reales, EAN) ──────────────────────
  if (verifiedGrid && typeof initRealProductsRefs === "function") {
    initRealProductsRefs({
      verifiedGrid: verifiedGrid,
      verifiedCount: verifiedCount,
      verifiedSearchInput: verifiedSearchInput,
      verifiedEmpty: verifiedEmpty,
      verifiedEmptyQuery: verifiedEmptyQuery
    });
    initRealProductsPanel();
  }

  // ── Plan "sin cocinar" (independiente del sistema de calorías) ───────
  if (noCookResults && typeof initNoCookRefs === "function") {
    initNoCookRefs({
      noCookResults: noCookResults,
      noCookCount: noCookCount,
      noCookStatus: noCookStatus
    });
  }

  // ── Helpers de UI ─────────────────────────────────────────────────────

  function showSpinner() {
    if (spinnerWrap) spinnerWrap.classList.add("active");
    if (statusText)  statusText.textContent = "";
  }

  function hideSpinner() {
    if (spinnerWrap) spinnerWrap.classList.remove("active");
  }

  function clearOutput() {
    summaryEls.calories.textContent    = "-";
    summaryEls.caloriesSub.textContent = "Esperando cálculo";
    summaryEls.protein.textContent     = "-";
    summaryEls.proteinSub.textContent  = "Esperando cálculo";
    summaryEls.carbs.textContent       = "-";
    summaryEls.carbsSub.textContent    = "Esperando cálculo";
    summaryEls.fats.textContent        = "-";
    summaryEls.fatsSub.textContent     = "Esperando cálculo";

    mealsContainer.innerHTML =
      '<div class="meal-card meal-card--empty" data-empty>' +
        '<div class="meal-body">' +
          '<span class="empty-icon"><svg width="28" height="28"><use href="#icon-search"/></svg></span>' +
          '<p><em>Esperando parámetros&hellip;</em></p>' +
          '<p>Configura tus datos en el panel lateral y pulsa <strong>Generar plan</strong>.</p>' +
        '</div>' +
      '</div>';

    insightsList.innerHTML = "";
    warningBox.classList.remove("show");
    warningBox.textContent = "";
    if (statusText) statusText.textContent = "";
    if (shoppingPanel) shoppingPanel.hidden = true;
  }

  // ── Generar el plan (flujo principal) ────────────────────────────────

  function handleSubmit(event) {
    event.preventDefault();

    var data = readForm();
    var error = validateInput(data);

    if (error) {
      showWarning(error);
      return;
    }

    // A partir de aquí data.budget es un número plano, igual que antes de
    // que existieran los presets — plan-generator.js/dish-selector.js no
    // necesitan saber si vino de un preset o de una cantidad exacta.
    data.budget = resolveBudget(data);

    showSpinner();

    // setTimeout para permitir que el spinner se pinte antes del cálculo
    // (el cálculo es síncrono y rápido, pero así se ve el feedback visual)
    setTimeout(function () {
      try {
        var profile = calculateProfile(data);
        var result  = generateDietPlan(profile, data);

        renderSummary(profile, result.total);
        renderMeals(result.meals);
        renderInsights(profile, result, data);
        renderWarnings(profile, result, data);
        if (typeof renderShoppingList === "function") {
          renderShoppingList(result.meals, result.report && result.report.store);
        }

        // Animaciones GSAP — se ejecutan después de que el HTML ya existe
        // en el DOM. Si GSAP no cargó, estas funciones no hacen nada y
        // el resultado final (valores, tarjetas) es idéntico.
        animateMealCardsIn();
        animateSummaryNumbers(profile, result.total);
        if (typeof animateShoppingListIn === "function") animateShoppingListIn();

        if (statusText) {
          statusText.textContent = "Plan generado correctamente.";
        }
      } catch (err) {
        console.error(err);
        showWarning("Ha ocurrido un error generando el plan. Revisa los datos introducidos.");
      } finally {
        hideSpinner();
      }
    }, 50);
  }

  // ── Botón: ejemplo alto en proteína ───────────────────────────────────

  function fillExample() {
    document.getElementById("age").value      = 27;
    document.getElementById("sex").value      = "male";
    document.getElementById("weight").value   = 82;
    document.getElementById("height").value   = 180;
    document.getElementById("activity").value = "1.55";
    document.getElementById("workouts").value = 5;
    document.getElementById("goal").value     = "bulk";
    document.getElementById("cookTime").value = "35";
    document.getElementById("taste").value    = "mixed";

    var customRadio = document.getElementById("budgetModeCustom");
    if (customRadio) {
      customRadio.checked = true;
      updateBudgetCustomVisibility();
    }
    if (budgetCustomInput) budgetCustomInput.value = 10;
  }

  // ── Botón: resetear ───────────────────────────────────────────────────

  function resetAll() {
    form.reset();
    updateBudgetCustomVisibility(); // form.reset() desmarca los radios -> vuelve a ocultar el campo exacto
    clearOutput();
  }

  // ── Botón: sin cocinar ────────────────────────────────────────────────
  // Generador independiente — no usa calculateProfile/generateDietPlan,
  // no valida el formulario, no toca el sistema de calorías/macros.

  function handleNoCook() {
    if (typeof runNoCookGenerator !== "function") return;
    if (noCookPanel) noCookPanel.hidden = false;
    runNoCookGenerator();
    if (noCookPanel && typeof noCookPanel.scrollIntoView === "function") {
      noCookPanel.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  // ── Listeners ─────────────────────────────────────────────────────────

  form.addEventListener("submit", handleSubmit);
  if (fillExampleBtn) fillExampleBtn.addEventListener("click", fillExample);
  if (resetBtn)       resetBtn.addEventListener("click", resetAll);
  if (noCookBtn)      noCookBtn.addEventListener("click", handleNoCook);

});