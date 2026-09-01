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
 *  - Botones "Despensa" y "Resetear"
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
 * ── Gate en "Generar plan" (2026-08-20) ───────────────────────────────────
 * handleSubmit() ya no genera directamente -- primero comprueba
 * getBlockingActiveEntry() (findTodayEntry/hasRealPantryAction/
 * isEntryFullyCooked de pantry.js). Si hay un plan de hoy con algo real
 * encima y algo todavía pendiente, abre showPlanReplaceDialog()
 * (render-pantry.js) en vez de generar; "Cambiar el plan completo" ahí
 * llama a handleReplaceWholePlan(), que sí genera (runGeneration(), el
 * cuerpo real, compartido) pero marca pendingReplaceEntryId para que
 * handleUsePlanToday() confirme con replacePendingMealsForToday() en vez
 * del UPSERT normal. Ver "Gate en Generar plan..." en la cabecera de
 * js/core/pantry.js para el razonamiento completo (por qué, y por qué un
 * borrador puro o un plan ya completado no interrumpen).
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
  var usePlanTodayNoCookBtn = document.getElementById("usePlanTodayNoCookBtn");

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
  var pantryCountEl            = document.getElementById("pantryCount");

  // Despensa como <dialog> (2026-08-23) -- pantryPanel (arriba) ES el
  // propio <dialog>, abierto/cerrado desde estos dos.
  var despensaBtn      = document.getElementById("despensaBtn");
  var pantryCloseBtn   = document.getElementById("pantryCloseBtn");

  // Diálogo "ya tienes un plan activo hoy" -- ver "Gate en Generar plan..."
  // en la cabecera de js/core/pantry.js.
  var planReplaceDialogEl    = document.getElementById("planReplaceDialog");
  var planReplaceBodyEl      = document.getElementById("planReplaceBody");
  var planReplaceFullBtn     = document.getElementById("planReplaceFullBtn");
  var planReplaceCancelBtn   = document.getElementById("planReplaceCancelBtn");

  // "Mis planes" (2026-08-14c, fusionado con selector de fecha en
  // 2026-08-23) -- fuera del diálogo de despensa, ver cabecera de
  // js/ui/render-pantry.js. Todas las entries de la fecha elegida
  // (pendientes y completadas) se pintan y gestionan aquí.
  var todayPlansPanel          = document.getElementById("todayPlansPanel");
  var todayPlansContainer      = document.getElementById("todayPlansContainer");
  var dateStripEl              = document.getElementById("dateStrip");
  var plansEmptyNoteEl         = document.getElementById("plansEmptyNote");

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
  // budget/cookTime/taste del `data` que generó el plan actual --
  // per-meal editing (2026-08-20g) los necesita persistidos en la entry
  // (ver savePlanForToday(), pantry.js) para poder re-elegir UNA sola
  // toma más tarde respetando el mismo presupuesto/tiempo/sabor.
  var lastGeneratedDayOptions = null;
  // profile/data/report del plan actual -- necesarios para re-pintar
  // resumen/insights/avisos tras "Cambiar" una toma (swap-plan-meal).
  var lastGeneratedProfile = null;
  var lastGeneratedData = null;
  var lastGeneratedReport = null;

  // Distinto de null SOLO entre "Cambiar el plan completo" (diálogo de
  // plan activo, ver "Gate en Generar plan..." en pantry.js) y la
  // siguiente confirmación -- le dice a handleUsePlanToday() que llame a
  // replacePendingMealsForToday() en vez del UPSERT normal
  // (savePlanForToday), dirigido a ESTA entry en concreto. Se limpia tras
  // usarse una vez, y también al "Resetear" (clearOutput) para que nunca
  // sobreviva a un plan distinto generado después sin pasar por el diálogo.
  var pendingReplaceEntryId = null;

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
    lastGeneratedDayOptions = null;
    lastGeneratedProfile = null;
    lastGeneratedData = null;
    lastGeneratedReport = null;
    pendingReplaceEntryId = null;
    if (planSavedNoticeEl) {
      planSavedNoticeEl.hidden = true;
      planSavedNoticeEl.innerHTML = "";
    }
  }

  // ── "Cambiar" una sola toma del plan mostrado (sin confirmar) ────────
  // El plan guardado tiene su propio botón equivalente en "Mis planes"
  // (render-pantry.js, data-action="regenerate-single-meal"). Aquí es
  // sobre el plan en memoria (lastGeneratedMeals), vía regeneratePlanMeal()
  // (plan-generator.js), que re-elige SOLO esa toma respetando sus macros
  // y el presupuesto que queda hoy.
  function handleSwapPlanMeal(event) {
    var btn = event.target.closest('button[data-action="swap-plan-meal"]');
    if (!btn) return;
    var mealKey = btn.dataset.mealKey;
    if (!mealKey || !lastGeneratedMeals || !lastGeneratedDayOptions) return;
    if (typeof regeneratePlanMeal !== "function") return;

    btn.disabled = true;
    var pantryState = (typeof getPantryState === "function") ? getPantryState() : null;
    var res = regeneratePlanMeal(lastGeneratedMeals, mealKey, lastGeneratedDayOptions, lastGeneratedStore, pantryState);

    if (!res || res.error || !res.meal) {
      btn.disabled = false;
      btn.textContent = "sin más opciones";
      setTimeout(function () { btn.innerHTML = "↻ Cambiar"; }, 1600);
      return;
    }

    var idx = -1;
    for (var i = 0; i < lastGeneratedMeals.length; i++) {
      if (lastGeneratedMeals[i].key === mealKey) { idx = i; break; }
    }
    if (idx === -1) { btn.disabled = false; return; }

    // Conserva el horario de la toma: un cambio de plato no mueve la hora.
    var old = lastGeneratedMeals[idx];
    if (typeof old.time === "string") res.meal.time = old.time;
    if (typeof old.timeMinutes === "number") res.meal.timeMinutes = old.timeMinutes;
    lastGeneratedMeals[idx] = res.meal;

    rerenderCurrentPlan();
  }

  /** Re-pinta el plan en memoria completo tras editar una toma. */
  function rerenderCurrentPlan() {
    if (!lastGeneratedMeals) return;
    var total = (typeof sumMeals === "function")
      ? sumMeals(lastGeneratedMeals)
      : (lastGeneratedReport && lastGeneratedReport.total) || {};
    var result = { meals: lastGeneratedMeals, total: total, report: lastGeneratedReport };

    renderMeals(lastGeneratedMeals);
    if (lastGeneratedProfile) renderSummary(lastGeneratedProfile, total);
    safeInit("schedule-timeline-render", function () {
      if (typeof renderScheduleTimeline === "function") renderScheduleTimeline(lastGeneratedMeals);
    });
    if (lastGeneratedProfile && lastGeneratedData) {
      renderInsights(lastGeneratedProfile, result, lastGeneratedData);
      renderWarnings(lastGeneratedProfile, result, lastGeneratedData);
    }
    if (typeof renderShoppingList === "function") {
      safeInit("shopping-list-render", function () {
        renderShoppingList(lastGeneratedMeals, lastGeneratedStore);
      });
    }
  }

  // ── Generar el plan (flujo principal) ────────────────────────────────

  /**
   * Lee y valida el formulario, y resuelve data.budget a un número plano
   * (igual que antes de que existieran los presets — plan-generator.js/
   * dish-selector.js no necesitan saber si vino de un preset o de una
   * cantidad exacta). Compartido por handleSubmit() y
   * handleReplaceWholePlan() -- las dos vías que acaban llamando a
   * runGeneration().
   * @returns {{data:object, error:string|null}}
   */
  function readValidatedFormData() {
    var data = readForm();
    var error = validateInput(data);
    if (error) return { data: null, error: error };
    data.budget = resolveBudget(data);
    return { data: data, error: null };
  }

  /**
   * Entrada de hoy que debe interrumpir "Generar plan" con el diálogo de
   * "ya tienes un plan activo" -- ver "Gate en Generar plan..." en la
   * cabecera de js/core/pantry.js. Solo bloquea cuando hay algo real
   * encima (comprado y/o cocinado) Y todavía algo pendiente: un borrador
   * puro ya lo resuelve sin riesgo el UPSERT normal (savePlanForToday), y
   * un plan ya completado del todo no tiene nada pendiente que un plan
   * nuevo pueda pisar. Nunca lanza -- un fallo aquí no puede impedir que
   * "Generar plan" siga funcionando (mismo principio que safeInit).
   * @returns {object|null}
   */
  function getBlockingActiveEntry() {
    try {
      if (typeof findTodayEntry !== "function") return null;
      var entry = findTodayEntry();
      if (!entry) return null;
      if (typeof hasRealPantryAction === "function" && !hasRealPantryAction(entry)) return null;
      if (typeof isEntryFullyCooked === "function" && isEntryFullyCooked(entry)) return null;
      return entry;
    } catch (err) {
      console.error("[plan-replace-gate] fallo comprobando el plan activo -- se deja generar con normalidad:", err);
      return null;
    }
  }

  function handleSubmit(event) {
    event.preventDefault();

    var parsed = readValidatedFormData();
    if (parsed.error) {
      showWarning(parsed.error);
      return;
    }

    var activeEntry = getBlockingActiveEntry();
    if (activeEntry) {
      safeInit("plan-replace-prompt", function () {
        if (typeof showPlanReplaceDialog === "function") showPlanReplaceDialog(activeEntry);
      });
      return;
    }

    runGeneration(parsed.data);
  }

  /**
   * "Cambiar el plan completo" en el diálogo de plan activo -- genera un
   * plan nuevo igual que handleSubmit(), pero marca pendingReplaceEntryId
   * para que handleUsePlanToday() reemplace la entry existente (comidas NO
   * cocinadas) en vez de crear una nueva al confirmar.
   * @param {string} entryId
   */
  function handleReplaceWholePlan(entryId) {
    var parsed = readValidatedFormData();
    if (parsed.error) {
      showWarning(parsed.error);
      return;
    }
    pendingReplaceEntryId = entryId;
    runGeneration(parsed.data);
  }

  /**
   * Cuerpo real de "Generar plan" -- extraído de handleSubmit() para
   * poder llamarlo también desde handleReplaceWholePlan() sin pasar por
   * el gate una segunda vez.
   * @param {object} data - ya validado, con data.budget resuelto
   */
  function runGeneration(data) {
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
        lastGeneratedDayOptions = { budget: data.budget, cookTime: data.cookTime, taste: data.taste };
        lastGeneratedProfile = profile;
        lastGeneratedData = data;
        lastGeneratedReport = result.report;

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

          // "No me gusta": texto libre separado por comas -> array. El
          // saneado real (recorte, deduplicado, topes) lo hace
          // sanitizeStringList() en settings.js; aquí solo se trocea.
          var dislikesEl = document.getElementById("dislikes");
          if (dislikesEl) {
            toSave.dislikes = String(dislikesEl.value || "")
              .split(",")
              .map(function (part) { return part.trim(); })
              .filter(Boolean);
          }

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

    // Array -> texto separado por comas (setVal solo maneja escalares).
    var dislikesEl = document.getElementById("dislikes");
    if (dislikesEl && Array.isArray(settings.dislikes)) {
      dislikesEl.value = settings.dislikes.join(", ");
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
    setVal("cuisine", settings.cuisine);
    setVal("priority", settings.priority);
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
  if (resetBtn) resetBtn.addEventListener("click", resetAll);
  if (mealsContainer) mealsContainer.addEventListener("click", handleSwapPlanMeal);

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

  // ── Selector de tienda: RETIRADO (2026-08-25) ───────────────────────
  //    La app es solo-Mercadona por ahora (ver el comentario en
  //    index.html para los datos que lo motivan). No se pasa storeId a
  //    ningún motor: todos caen en DEFAULT_STORE_ID. La arquitectura
  //    multi-tienda sigue intacta, solo desaparece el borde de entrada.


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

    // Un bucle en vez de tres variables sueltas: añadir un tramo nuevo
    // (como "minimal" el 2026-09-01) no debe obligar a tocar esto.
    [
      ["minimal", "budgetMinimalAmount"],
      ["small",   "budgetSmallAmount"],
      ["medium",  "budgetMediumAmount"],
      ["high",    "budgetHighAmount"],
    ].forEach(function (pair) {
      var el = document.getElementById(pair[1]);
      var preset = presets[pair[0]];
      if (el && preset) el.textContent = "€" + preset.amount + "/día";
    });
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
  // cocinado nada todavía. Si pendingReplaceEntryId está fijado (el
  // usuario eligió "Cambiar el plan completo" en el diálogo de plan
  // activo, ver "Gate en Generar plan..." en pantry.js), confirma sobre
  // ESA entry en concreto (replacePendingMealsForToday) en vez de crear
  // una nueva.
  function handleUsePlanToday() {
    safeInit("use-plan-today", function () {
      if (!lastGeneratedMeals) return;

      usePlanTodayBtn.disabled = true; // guarda simple contra doble clic (la llamada es síncrona)
      try {
        var result, mode;
        if (pendingReplaceEntryId && typeof replacePendingMealsForToday === "function") {
          result = replacePendingMealsForToday(pendingReplaceEntryId, lastGeneratedMeals, lastGeneratedStore, lastGeneratedDayOptions);
          pendingReplaceEntryId = null;
          mode = "active-replaced";
        } else if (typeof savePlanForToday === "function") {
          result = savePlanForToday(lastGeneratedMeals, lastGeneratedStore, lastGeneratedDayOptions);
          mode = result.replaced ? "draft-updated" : "created";
        }
        if (!result) return;

        // savePlanForToday()/replacePendingMealsForToday() siempre guardan
        // bajo la fecha de HOY -- si el usuario estaba mirando otro día en
        // "Mis planes", esto lo trae de vuelta a "Hoy" para que el plan
        // recién confirmado sea visible sin tocar el chip a mano.
        safeInit("select-today-in-plans", function () {
          if (typeof selectPlanDate === "function" && typeof formatLocalDateKey === "function") {
            selectPlanDate(formatLocalDateKey(new Date()));
          }
        });

        if (typeof renderPantryPanel === "function") renderPantryPanel();
        if (typeof renderPlanSavedNotice === "function") renderPlanSavedNotice(result.entry, result.historySaved, mode);

        // savePlanForToday()/replacePendingMealsForToday() escriben en
        // pantryHistory pero NO pasan por syncAfterPantryChange() (no se
        // llama desde render-pantry.js) -- sin este empuje explícito, un
        // plan recién guardado no llegaría a la nube hasta la siguiente
        // mutación de despensa.
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

  /**
   * "Confirmar plan sin cocinar" (2026-08-20f, known issue #9) -- mismo
   * patrón que handleUsePlanToday(), sin la rama de reemplazo (el gate de
   * "Generar plan" de 2026-08-20 no se extendió aquí a propósito, ver
   * cabecera del bloque "sin cocinar" en pantry.js).
   */
  function handleUseNoCookPlanToday() {
    safeInit("use-nocook-plan-today", function () {
      if (typeof lastNoCookSlots === "undefined" || !lastNoCookSlots) return;
      if (typeof saveNoCookPlanForToday !== "function") return;

      usePlanTodayNoCookBtn.disabled = true;
      try {
        var storeForEntry = (typeof lastNoCookStore !== "undefined") ? lastNoCookStore : undefined;
        var result = saveNoCookPlanForToday(lastNoCookSlots, storeForEntry);
        if (!result) return;

        safeInit("select-today-in-plans", function () {
          if (typeof selectPlanDate === "function" && typeof formatLocalDateKey === "function") {
            selectPlanDate(formatLocalDateKey(new Date()));
          }
        });

        if (typeof renderPantryPanel === "function") renderPantryPanel();
        if (typeof renderPlanSavedNotice === "function") {
          renderPlanSavedNotice(result.entry, result.historySaved, result.replaced ? "draft-updated" : "created");
        }

        safeInit("nocook-plan-saved-cloud-push", function () {
          if (typeof pushPantryToCloud === "function") pushPantryToCloud();
        });

        if (todayPlansPanel && typeof todayPlansPanel.scrollIntoView === "function") {
          todayPlansPanel.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      } finally {
        usePlanTodayNoCookBtn.disabled = false;
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
        dateStripEl: dateStripEl,
        plansEmptyNoteEl: plansEmptyNoteEl,
        pantryCountEl: pantryCountEl,
        planSavedNoticeEl: planSavedNoticeEl,
        onPantryChange: syncAfterPantryChange,
        planReplaceDialogEl: planReplaceDialogEl,
        planReplaceBodyEl: planReplaceBodyEl,
        planReplaceFullBtn: planReplaceFullBtn,
        planReplaceCancelBtn: planReplaceCancelBtn,
        onReplaceWholePlan: handleReplaceWholePlan,
        despensaDialogEl: pantryPanel,
        despensaCloseBtn: pantryCloseBtn
      });
      if (typeof renderPantryPanel === "function") renderPantryPanel();
    }
    if (despensaBtn) despensaBtn.addEventListener("click", function () {
      if (typeof showDespensaDialog === "function") showDespensaDialog();
    });
    if (usePlanTodayBtn) usePlanTodayBtn.addEventListener("click", handleUsePlanToday);
    if (usePlanTodayNoCookBtn) usePlanTodayNoCookBtn.addEventListener("click", handleUseNoCookPlanToday);
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
  /**
   * Objetivos para el plan sin cocinar, leídos del formulario si está
   * relleno. Desde 2026-09-01 este modo SÍ apunta a calorías, proteína y
   * presupuesto (antes no miraba ninguno de los tres, y un día generado
   * podía salir por 47 €). Si el formulario está vacío o no valida, se
   * devuelve null y el generador usa su objetivo por defecto: el botón
   * "Sin cocinar" nunca ha exigido rellenar el formulario y sigue sin
   * hacerlo.
   * @returns {{calories:number, protein:number, budget:number}|null}
   */
  function readNoCookTargets() {
    if (typeof readForm !== "function" || typeof calculateProfile !== "function") return null;
    try {
      var data = readForm();
      if (typeof validateInput === "function" && validateInput(data)) return null;
      if (typeof resolveBudget === "function") data.budget = resolveBudget(data);
      var profile = calculateProfile(data);
      if (!profile || !profile.calories) return null;
      return {
        calories: profile.calories,
        protein: profile.protein,
        budget: (typeof data.budget === "number" && isFinite(data.budget)) ? data.budget : undefined,
        priority: data.priority,
      };
    } catch (err) {
      console.warn("[no-cook:targets] formulario no utilizable, se usa el objetivo por defecto:", err);
      return null;
    }
  }

  function handleNoCook() {
    safeInit("no-cook-run", function () {
      if (typeof runNoCookGenerator !== "function") return;
      if (noCookPanel) noCookPanel.hidden = false;
      // Sin storeId: el generador cae en DEFAULT_STORE_ID (Mercadona).
      runNoCookGenerator(undefined, readNoCookTargets());
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

  // Sugerencias en "Alimentos que no te gustan". Dentro de safeInit() como
  // el resto: si fallara, el campo sigue siendo un input de texto normal y
  // el formulario entero no se cae por un autocompletado.
  safeInit("dislikes-suggest-init", function () {
    var dislikesInput = document.getElementById("dislikes");
    if (dislikesInput && typeof initDislikesSuggest === "function") {
      initDislikesSuggest(dislikesInput);
    }
  });

});
