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
 * ── Arquitectura de arranque a prueba de fallos (2026-08-06) ─────────────
 * Un bug real (una entrada de localStorage con forma antigua rompía
 * renderPantryPanel(), que se llamaba SÍNCRONAMENTE dentro de este mismo
 * DOMContentLoaded ANTES de que se cableara el submit del formulario —
 * el error abortaba el resto del callback, "Generar plan" nunca quedaba
 * enganchado, y el <form> cafa a un envío nativo que recargaba la
 * página) obligó a repensar el orden de arranque, no solo a añadir un
 * try/catch puntual. Principios aplicados aquí:
 *
 *   1. El camino CRÍTICO (cablear submit/reset/ejemplo del formulario) se
 *      ejecuta INMEDIATAMENTE tras capturar las referencias al DOM, antes
 *      de inicializar ningún módulo opcional — así ningún fallo posterior
 *      puede impedir que "Generar plan" funcione.
 *   2. Cada módulo opcional (despensa, lista de la compra, catálogo,
 *      sin-cocinar, presets de presupuesto...) se inicializa dentro de
 *      safeInit(), que aísla su propio fallo: lo registra en consola y
 *      deja que el resto de módulos (y el flujo crítico) sigan
 *      funcionando con total normalidad. Un módulo nunca puede tumbar a
 *      otro, ni al arranque general.
 *   3. Los datos persistidos (localStorage, vía pantry.js) tienen su
 *      propia validación/saneamiento en el módulo que los posee
 *      (isValidHistoryEntry, sanitizePantryState) — esta es la SEGUNDA
 *      capa de defensa, no la única: aunque esa validación algún día
 *      tuviera un hueco, safeInit() sigue conteniendo el daño a un solo
 *      módulo.
 *   4. render-pantry.js pinta cada fila de una lista de forma aislada
 *      (safeRenderRows) — una fila individual que falle al pintarse no
 *      vacía toda la lista, solo se omite ella.
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

  /**
   * Ejecuta fn() aislado: si lanza, se registra en consola con `label` y
   * la app sigue arrancando con total normalidad — ningún módulo
   * individual (despensa, catálogo, lista de la compra...) puede impedir
   * que el resto de la aplicación funcione. Ver cabecera del archivo.
   * @param {string} label
   * @param {function} fn
   */
  function safeInit(label, fn) {
    try {
      fn();
    } catch (err) {
      console.error("[init:" + label + "] fallo aislado -- el resto de la app sigue funcionando:", err);
    }
  }

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
  var scheduleTimelineEl = document.getElementById("scheduleTimeline");
  var nextMealStickyEl   = document.getElementById("nextMealSticky");

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
  var usePlanTodayBtn          = document.getElementById("usePlanTodayBtn");
  var planSavedNoticeEl        = document.getElementById("planSavedNotice");

  var pantryPanel              = document.getElementById("pantryPanel");
  var pantryListContainer      = document.getElementById("pantryListContainer");
  var pantryEmptyEl            = document.getElementById("pantryEmpty");
  var pantryAddForm            = document.getElementById("pantryAddForm");
  var pantryAddNameInput       = document.getElementById("pantryAddName");
  var pantryAddGrams           = document.getElementById("pantryAddGrams");
  var pantryIngredientOptionsList = document.getElementById("pantryIngredientOptions");
  var pantryAddError           = document.getElementById("pantryAddError");
  var pantryHistoryDisclosure  = document.getElementById("pantryHistoryDisclosure");
  var pantryHistoryContainer   = document.getElementById("pantryHistoryContainer");
  var pantryCountEl            = document.getElementById("pantryCount");

  // "Tu plan" (2026-08-14c) -- fuera del acordeón de despensa, ver
  // cabecera de js/ui/render-pantry.js. Planes con algo pendiente
  // (comprar/cocinar) se pintan y gestionan aquí, no dentro de pantryPanel.
  var todayPlansPanel          = document.getElementById("todayPlansPanel");
  var todayPlansContainer      = document.getElementById("todayPlansContainer");

  var authProfileBtn   = document.getElementById("authProfileBtn");
  var authProfileLabel = document.getElementById("authProfileLabel");
  var authUserMenu     = document.getElementById("authUserMenu");
  var authUserEmailEl  = document.getElementById("authUserEmail");
  var authLogoutBtn    = document.getElementById("authLogoutBtn");

  var authDialogEl        = document.getElementById("authDialog");
  var authDialogTitle     = document.getElementById("authDialogTitle");
  var authDialogCloseBtn  = document.getElementById("authDialogCloseBtn");
  var authUnavailableBox  = document.getElementById("authUnavailableBox");
  var authAvailableBox    = document.getElementById("authAvailableBox");
  var authGoogleBtn       = document.getElementById("authGoogleBtn");
  var authEmailForm       = document.getElementById("authEmailForm");
  var authEmailInput      = document.getElementById("authEmail");
  var authPasswordInput   = document.getElementById("authPassword");
  var authErrorEl         = document.getElementById("authError");
  var authNoticeEl        = document.getElementById("authNotice");
  var authSubmitBtn       = document.getElementById("authSubmitBtn");
  var authSwitchPrompt    = document.getElementById("authSwitchPrompt");
  var authSwitchModeBtn   = document.getElementById("authSwitchModeBtn");

  var authConflictDialogEl     = document.getElementById("authConflictDialog");
  var authConflictKeepCloudBtn = document.getElementById("authConflictKeepCloudBtn");
  var authConflictMergeBtn     = document.getElementById("authConflictMergeBtn");
  var authConflictKeepLocalBtn = document.getElementById("authConflictKeepLocalBtn");

  // El plan actualmente mostrado — necesario para que "Confirmar plan de
  // hoy" sepa sobre qué comidas actuar sin regenerar nada. Una vez
  // guardado (savePlanForToday), la Etapa 2 (comprar) y la Etapa 3
  // (cocinar, por comida) ya no dependen de esto: actúan sobre el
  // historial persistido, resuelto por su propio entryId.
  var lastGeneratedMeals = null;
  var lastGeneratedStore = null;

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
    safeInit("schedule-clear", function () {
      if (typeof clearScheduleUI === "function") clearScheduleUI();
    });

    // No hay ya ningún plan mostrado que "Confirmar plan de hoy" pueda
    // usar — pero la despensa NO se toca: es stock real que el usuario
    // posee, "Resetear" solo limpia el formulario/plan en pantalla.
    lastGeneratedMeals = null;
    lastGeneratedStore = null;
    if (planSavedNoticeEl) {
      planSavedNoticeEl.hidden = true;
      planSavedNoticeEl.innerHTML = "";
    }
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

        // Horario: se calcula DESPUÉS de generar el plan, nunca dentro de
        // generateDietPlan() — así el generador (probado a fondo, ver
        // STATE.md) no cambia de comportamiento por esto. Reordena
        // result.meals cronológicamente (antes: orden de categoría,
        // desayuno/comida/cena/snack/snack2 — ver js/core/meal-schedule.js)
        // y añade meal.time/meal.timeMinutes a cada uno. Aislado en
        // safeInit: si fallara, el plan se sigue mostrando con normalidad,
        // solo sin horario (mismo principio que el resto de módulos
        // opcionales, ver cabecera del archivo).
        safeInit("meal-schedule", function () {
          if (typeof computeMealSchedule === "function") {
            result.meals = computeMealSchedule(result.meals, readScheduleSettings());
          }
        });

        renderSummary(profile, result.total);
        renderMeals(result.meals);
        safeInit("schedule-timeline-render", function () {
          if (typeof renderScheduleTimeline === "function") renderScheduleTimeline(result.meals);
        });
        renderInsights(profile, result, data);
        renderWarnings(profile, result, data);
        if (typeof renderShoppingList === "function") {
          safeInit("shopping-list-render", function () {
            renderShoppingList(result.meals, result.report && result.report.store);
          });
        }

        // Guardado para que "Confirmar plan de hoy" pueda actuar sobre
        // este plan concreto sin tener que regenerarlo.
        lastGeneratedMeals = result.meals;
        lastGeneratedStore = result.report && result.report.store;

        // Guarda el perfil/formulario para la próxima visita (invitado:
        // este navegador; con sesión iniciada: también se empuja a la
        // nube) -- piggyback sobre el camino de éxito ya existente, en
        // vez de un listener por campo (ver js/core/settings.js).
        safeInit("settings-save", function () {
          if (typeof saveSettings !== "function") return;
          var scheduleSettings = (typeof readScheduleSettings === "function") ? readScheduleSettings() : {};
          var toSave = {};
          Object.keys(data).forEach(function (k) { toSave[k] = data[k]; });
          Object.keys(scheduleSettings).forEach(function (k) { toSave[k] = scheduleSettings[k]; });
          saveSettings(toSave);
          if (typeof pushSettingsToCloud === "function") pushSettingsToCloud();
        });

        if (planSavedNoticeEl) {
          planSavedNoticeEl.hidden = true;
          planSavedNoticeEl.innerHTML = "";
        }

        // Animaciones GSAP — se ejecutan después de que el HTML ya existe
        // en el DOM. Si GSAP no cargó, estas funciones no hacen nada y
        // el resultado final (valores, tarjetas) es idéntico.
        safeInit("animations", function () {
          animateMealCardsIn();
          animateSummaryNumbers(profile, result.total);
          if (typeof animateShoppingListIn === "function") animateShoppingListIn();
        });

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
    if (budgetCustomInput) budgetCustomInput.value = 24; // entre Equilibrado(20) y Amplio(28) -- ver js/data/budget-presets.js
  }

  // ── Perfil/ajustes guardados (invitado: localStorage; cuenta: nube vía
  //    js/core/cloud-sync.js, ver handleSubmit más abajo y render-auth.js) ─
  // Rellena el formulario con el último perfil guardado -- nunca lanza si
  // algún campo no existe (setVal es un no-op seguro), y nunca sobrescribe
  // con `undefined` un valor por defecto del HTML si ese campo nunca se
  // guardó (usuario nuevo, o campo añadido después de que se guardara por
  // última vez).
  function applySettingsToForm(settings) {
    if (!settings) return;

    function setVal(id, value) {
      if (value === undefined || value === null || value === "") return;
      var el = document.getElementById(id);
      if (el) el.value = value;
    }

    setVal("age", settings.age);
    setVal("sex", settings.sex);
    setVal("weight", settings.weight);
    setVal("height", settings.height);
    setVal("activity", settings.activity);
    setVal("workouts", settings.workouts);
    setVal("goal", settings.goal);
    setVal("cookTime", settings.cookTime);
    setVal("taste", settings.taste);
    setVal("wakeTime", settings.wakeTime);
    setVal("sleepTime", settings.sleepTime);

    if (settings.budgetMode) {
      var radioId = settings.budgetMode === "small"  ? "budgetModeSmall"
                  : settings.budgetMode === "medium" ? "budgetModeMedium"
                  : settings.budgetMode === "high"   ? "budgetModeHigh"
                  : settings.budgetMode === "custom" ? "budgetModeCustom"
                  : null;
      var radio = radioId && document.getElementById(radioId);
      if (radio) {
        radio.checked = true;
        updateBudgetCustomVisibility();
      }
    }
    setVal("budgetCustom", settings.budgetCustom);
  }

  // ── Botón: resetear ───────────────────────────────────────────────────

  function resetAll() {
    form.reset();
    updateBudgetCustomVisibility(); // form.reset() desmarca los radios -> vuelve a ocultar el campo exacto
    clearOutput();
  }

  // Solo el modo "custom" muestra el campo de cantidad exacta — elegir un
  // preset lo oculta y limpia, para que readForm() nunca lea un valor
  // numérico obsoleto de un preset anterior.
  function updateBudgetCustomVisibility() {
    var checked = document.querySelector('input[name="budgetMode"]:checked');
    var isCustom = !!checked && checked.value === "custom";
    if (budgetCustomField) budgetCustomField.hidden = !isCustom;
  }

  // ══ CAMINO CRÍTICO: cablear el formulario ANTES de cualquier módulo
  //    opcional — ver "Arquitectura de arranque a prueba de fallos" en la
  //    cabecera del archivo. Ningún fallo posterior (despensa, catálogo,
  //    lista de la compra...) puede ya impedir que esto se ejecute. ══════
  initRenderRefs({ mealsContainer: mealsContainer, summaryEls: summaryEls });
  initInsightRefs({ warningBox: warningBox, insightsList: insightsList });

  form.addEventListener("submit", handleSubmit);
  if (fillExampleBtn) fillExampleBtn.addEventListener("click", fillExample);
  if (resetBtn)        resetBtn.addEventListener("click", resetAll);

  budgetModeRadios.forEach(function (radio) {
    radio.addEventListener("change", updateBudgetCustomVisibility);
  });

  // ── Horario del día (franja de la parte superior del panel de resultados) ─
  safeInit("schedule-init", function () {
    if (scheduleTimelineEl && typeof initScheduleRefs === "function") {
      initScheduleRefs({ scheduleTimeline: scheduleTimelineEl, nextMealSticky: nextMealStickyEl });
    }
  });

  // ── Contador informativo de la base de platos ────────────────────────
  safeInit("food-count", function () {
    if (foodCountEl && typeof DISH_DB !== "undefined") {
      foodCountEl.textContent = DISH_DB.length;
    }
  });

  // ── Perfil/ajustes guardados: rellena el formulario con lo último
  //    guardado en ESTE navegador (invitado) -- si hay sesión iniciada, se
  //    vuelve a aplicar tras la reconciliación con la nube (puede llegar
  //    un instante más tarde, ver handleAuthDataReconciled/render-auth.js).
  safeInit("settings-prefill", function () {
    if (typeof getSettings === "function") applySettingsToForm(getSettings());
  });

  // ── Cuenta: botón de perfil, diálogo de acceso, reconciliación con la
  //    nube -- ver js/ui/render-auth.js para la orquestación completa
  //    (cuándo reconciliar, el diálogo de conflicto, etc.). En modo
  //    invitado (Supabase sin aprovisionar) esto solo pinta "Invitado" y
  //    un aviso claro dentro del diálogo -- el resto de la app sigue
  //    funcionando exactamente igual que hoy.
  function handleAuthDataReconciled() {
    safeInit("settings-reapply-after-sync", function () {
      if (typeof getSettings === "function") applySettingsToForm(getSettings());
    });
    syncAfterPantryChange();
  }

  safeInit("auth-init", function () {
    if (authProfileBtn && typeof initAuthRefs === "function") {
      initAuthRefs({
        authProfileBtn: authProfileBtn,
        authProfileLabel: authProfileLabel,
        authUserMenu: authUserMenu,
        authUserEmailEl: authUserEmailEl,
        authLogoutBtn: authLogoutBtn,
        authDialogEl: authDialogEl,
        authDialogTitle: authDialogTitle,
        authDialogCloseBtn: authDialogCloseBtn,
        authUnavailableBox: authUnavailableBox,
        authAvailableBox: authAvailableBox,
        authGoogleBtn: authGoogleBtn,
        authEmailForm: authEmailForm,
        authEmailInput: authEmailInput,
        authPasswordInput: authPasswordInput,
        authErrorEl: authErrorEl,
        authNoticeEl: authNoticeEl,
        authSubmitBtn: authSubmitBtn,
        authSwitchPrompt: authSwitchPrompt,
        authSwitchModeBtn: authSwitchModeBtn,
        authConflictDialogEl: authConflictDialogEl,
        authConflictKeepCloudBtn: authConflictKeepCloudBtn,
        authConflictMergeBtn: authConflictMergeBtn,
        authConflictKeepLocalBtn: authConflictKeepLocalBtn,
        onDataReconciled: handleAuthDataReconciled
      });
    }
  });

  // ── Presets de presupuesto (Ajustado/Equilibrado/Amplio) ─────────────
  // Los importes se rellenan desde js/data/budget-presets.js (una sola
  // fuente de verdad) en vez de escribirlos en el HTML — igual que
  // foodCount se rellena desde DISH_DB.length arriba.
  safeInit("budget-presets", function () {
    if (typeof BUDGET_PRESETS === "undefined" || typeof DEFAULT_BUDGET_PERIOD === "undefined") return;
    var presets = BUDGET_PRESETS[DEFAULT_BUDGET_PERIOD];
    if (!presets) return;

    var smallEl  = document.getElementById("budgetSmallAmount");
    var mediumEl = document.getElementById("budgetMediumAmount");
    var highEl   = document.getElementById("budgetHighAmount");
    if (smallEl  && presets.small)  smallEl.textContent  = "€" + presets.small.amount  + "/día";
    if (mediumEl && presets.medium) mediumEl.textContent = "€" + presets.medium.amount + "/día";
    if (highEl   && presets.high)   highEl.textContent   = "€" + presets.high.amount   + "/día";
  });

  // ── Lista de la compra (aún vacía hasta generar un plan) ─────────────
  safeInit("shopping-list-init", function () {
    if (shoppingPanel && typeof initShoppingListRefs === "function") {
      initShoppingListRefs({
        shoppingPanel: shoppingPanel,
        shoppingSummaryEl: shoppingSummaryEl,
        shoppingCountEl: shoppingCountEl,
        shoppingListContainer: shoppingListContainerEl
      });
    }
  });

  // ── Despensa: sincronización y Etapa 1 (guardar el plan del día) ──────

  // Se llama tras cualquier mutación de la despensa (guardar plan, marcar
  // compra hecha, marcar/desmarcar cocinado, edición manual) — en todos
  // los casos, si hay una lista de la compra visible, sus cifras "ya en
  // tu despensa" habrían quedado obsoletas. Aislada en safeInit porque
  // renderShoppingList()/renderPantryPanel() son código de terceros
  // módulos que podrían fallar con datos inesperados.
  function syncAfterPantryChange() {
    safeInit("pantry-sync", function () {
      if (typeof renderPantryPanel === "function") renderPantryPanel();
      if (lastGeneratedMeals && typeof renderShoppingList === "function") {
        renderShoppingList(lastGeneratedMeals, lastGeneratedStore);
      }
    });
    // Empuje en segundo plano a la nube (no-op en modo invitado o sin
    // conexión -- ver js/core/cloud-sync.js, nunca bloquea ni lanza).
    safeInit("pantry-cloud-push", function () {
      if (typeof pushPantryToCloud === "function") pushPantryToCloud();
    });
  }

  // Etapa 1 del ciclo de vida de la despensa: registra/CONFIRMA el plan
  // mostrado como "el plan de hoy". NO compra ni cocina nada — eso ocurre
  // después, de forma independiente, desde el panel de despensa (Etapas 2
  // y 3). Idempotente sobre el borrador del día (ver savePlanForToday,
  // pantry.js) -- regenerar el plan y volver a pulsar este botón nunca
  // crea una segunda entrada "comprable" mientras no se haya comprado ni
  // cocinado nada todavía.
  function handleUsePlanToday() {
    safeInit("use-plan-today", function () {
      if (!lastGeneratedMeals) return;
      if (typeof savePlanForToday !== "function") return;

      usePlanTodayBtn.disabled = true; // guarda simple contra doble clic (la llamada es síncrona)
      try {
        var result = savePlanForToday(lastGeneratedMeals, lastGeneratedStore);
        if (typeof renderPantryPanel === "function") renderPantryPanel();
        if (typeof renderPlanSavedNotice === "function") renderPlanSavedNotice(result.entry, result.historySaved, result.replaced);

        // savePlanForToday() escribe en pantryHistory pero NO pasa por
        // syncAfterPantryChange() (no se llama desde render-pantry.js) --
        // sin este empuje explícito, un plan recién guardado no llegaría a
        // la nube hasta la siguiente mutación de despensa.
        safeInit("plan-saved-cloud-push", function () {
          if (typeof pushPantryToCloud === "function") pushPantryToCloud();
        });

        // El plan guardado se gestiona desde ahí en adelante (comprar/
        // cocinar) -- "Tu plan" (2026-08-14c, fuera de la despensa) ya
        // está visible sin necesidad de abrir ningún acordeón, solo hace
        // falta el scroll para que no haya que buscarlo.
        if (todayPlansPanel && typeof todayPlansPanel.scrollIntoView === "function") {
          todayPlansPanel.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      } finally {
        usePlanTodayBtn.disabled = false;
      }
    });
  }

  // A diferencia de shoppingPanel/noCookPanel (vacíos hasta generar un
  // plan), la despensa pinta su estado persistido YA, al cargar la
  // página — no depende de ningún plan generado en esta sesión. Los datos
  // en sí ya se validan/sanean dentro de pantry.js (isValidHistoryEntry,
  // sanitizePantryState) y cada fila se pinta de forma aislada
  // (safeRenderRows, render-pantry.js) — safeInit aquí es una tercera
  // capa, no la única defensa.
  safeInit("pantry-init", function () {
    if (pantryPanel && typeof initPantryRefs === "function") {
      initPantryRefs({
        pantryListContainer: pantryListContainer,
        pantryEmptyEl: pantryEmptyEl,
        pantryAddForm: pantryAddForm,
        pantryAddNameInput: pantryAddNameInput,
        pantryAddGrams: pantryAddGrams,
        pantryIngredientOptionsList: pantryIngredientOptionsList,
        pantryAddError: pantryAddError,
        todayPlansPanel: todayPlansPanel,
        todayPlansContainer: todayPlansContainer,
        pantryHistoryDisclosure: pantryHistoryDisclosure,
        pantryHistoryContainer: pantryHistoryContainer,
        pantryCountEl: pantryCountEl,
        planSavedNoticeEl: planSavedNoticeEl,
        onPantryChange: syncAfterPantryChange
      });
      if (typeof renderPantryPanel === "function") renderPantryPanel();
    }
    if (usePlanTodayBtn) usePlanTodayBtn.addEventListener("click", handleUsePlanToday);
  });

  // ── Catálogo verificado (productos reales, EAN) ──────────────────────
  safeInit("catalog-init", function () {
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
  });

  // ── Plan "sin cocinar" (independiente del sistema de calorías) ───────
  // Generador independiente — no usa calculateProfile/generateDietPlan,
  // no valida el formulario, no toca el sistema de calorías/macros.
  function handleNoCook() {
    safeInit("no-cook-run", function () {
      if (typeof runNoCookGenerator !== "function") return;
      if (noCookPanel) noCookPanel.hidden = false;
      runNoCookGenerator();
      if (noCookPanel && typeof noCookPanel.scrollIntoView === "function") {
        noCookPanel.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  }

  safeInit("no-cook-init", function () {
    if (noCookResults && typeof initNoCookRefs === "function") {
      initNoCookRefs({
        noCookResults: noCookResults,
        noCookCount: noCookCount,
        noCookStatus: noCookStatus
      });
    }
    if (noCookBtn) noCookBtn.addEventListener("click", handleNoCook);
  });

});
