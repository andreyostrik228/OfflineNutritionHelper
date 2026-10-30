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
  var syncBannerEl        = document.getElementById("syncBanner");
  var authSubmitBtn       = document.getElementById("authSubmitBtn");
  var authSwitchPrompt    = document.getElementById("authSwitchPrompt");
  var authSwitchModeBtn   = document.getElementById("authSwitchModeBtn");

  var authConflictDialogEl     = document.getElementById("authConflictDialog");
  var authConflictKeepCloudBtn = document.getElementById("authConflictKeepCloudBtn");
  var authConflictMergeBtn     = document.getElementById("authConflictMergeBtn");
  var authConflictKeepLocalBtn = document.getElementById("authConflictKeepLocalBtn");

  var authDeleteAccountBtn = document.getElementById("authDeleteAccountBtn");
  var authDeleteDialogEl   = document.getElementById("authDeleteDialog");
  var authDeleteConfirmBtn = document.getElementById("authDeleteConfirmBtn");
  var authDeleteCancelBtn  = document.getElementById("authDeleteCancelBtn");
  var authDeleteErrorEl    = document.getElementById("authDeleteError");
  var authDeleteConfirmInput = document.getElementById("authDeleteConfirmInput");

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
  // Cuántos días pide el usuario (de 1 a 7; hasta el 2026-10-26, solo 1, 3 o
  // 7). Declarado AQUÍ, con el resto del
  // estado, y no junto a su listener: `var` se eleva pero su VALOR no, así
  // que dejarlo abajo lo hacía `undefined` en runGeneration y el bucle de
  // días no se ejecutaba nunca -- siempre salía un solo día.
  // Por defecto 3 dias, no 1 (2026-09-08). Medido sobre los cuatro tramos de
  // presupuesto y los tres objetivos: planificar 7 dias sale entre un 22% y un
  // 34% mas barato POR DIA que planificar 1, y 3 dias ya ahorra entre un 9% y
  // un 15%. Un paquete se paga una vez y rinde en varios dias; con 1 dia se
  // paga entero y se aprovecha una vez.
  var planDays = 3;
  // El tope: una semana. El presupuesto por día está medido hasta 7
  // (budgetForPlanDays) y la compra de más días ya no cabe en la nevera.
  var PLAN_DIAS_MAX = 7;

  /**
   * Deja elegidos N dias: la variable, los botones y el aviso de "1 dia".
   * Un solo sitio lo cambia todo, para que restaurar ajustes guardados y
   * pulsar un boton no puedan acabar diciendo cosas distintas (el fallo mas
   * largo de este proyecto salio justo de un estado con varios duenos, ver
   * HANDOFF 7.3).
   *
   * @param {number} dias - un entero de 1 a 7; cualquier otra cosa cae en 3.
   */
  function seleccionarDiasDePlan(dias) {
    planDays = (dias === Math.floor(dias) && dias >= 1 && dias <= PLAN_DIAS_MAX) ? dias : 3;
    var group = document.getElementById("planDays");
    if (group) {
      Array.prototype.forEach.call(group.querySelectorAll(".plan-days__btn"), function (b) {
        var on = Number(b.dataset.days) === planDays;
        b.classList.toggle("is-active", on);
        b.setAttribute("aria-checked", on ? "true" : "false");
      });
    }
    actualizarAvisoUnDia();
  }

  /**
   * El aviso de "1 dia sale mas caro" solo se ve con 1 dia elegido, y nunca
   * si el usuario pidio no volver a verlo. Se relee el ajuste guardado en
   * vez de recordarlo en una variable: asi "para siempre" sigue siendo para
   * siempre despues de recargar.
   */
  function actualizarAvisoUnDia() {
    var nota = document.getElementById("oneDayCostNote");
    if (!nota) return;
    var ajustes = (typeof getSettings === "function") ? getSettings() : {};
    nota.hidden = !(planDays === 1 && ajustes.hideOneDayCostNote !== true);
  }

  // Todos los días del plan actual (1..7). El día 1 es también
  // `lastGeneratedMeals`, que es lo que confirma "Confirmar plan de hoy":
  // se guarda HOY, no la semana entera.
  var lastGeneratedDays = null;
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
  // Lo mismo para el plan sin cocinar (2026-10-21): la entry de hoy que la
  // próxima confirmación sustituye (replacePendingNoCookSlotsForToday).
  var pendingReplaceNoCookEntryId = null;

  // Menú de varias personas (2026-10-26, js/core/familia.js): quién come, con
  // qué ración y, si cada uno tiene el suyo, el plan de cada persona
  // (`planes[id]`, los mismos arrays que lastGenerated* cuando se ve el suyo).
  // null si come solo la persona activa. `familiaViendo`: de quién es el menú
  // en pantalla.
  var familiaActual = null;
  var familiaViendo = null;

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
    summaryEls.caloriesSub.textContent = t("ui.esperando_calculo");
    summaryEls.protein.textContent     = "-";
    summaryEls.proteinSub.textContent  = t("ui.esperando_calculo");
    summaryEls.carbs.textContent       = "-";
    summaryEls.carbsSub.textContent    = t("ui.esperando_calculo");
    summaryEls.fats.textContent        = "-";
    summaryEls.fatsSub.textContent     = t("ui.esperando_calculo");

    mealsContainer.innerHTML =
      '<div class="meal-card meal-card--empty" data-empty>' +
        '<div class="meal-body">' +
          '<span class="empty-icon"><svg width="28" height="28"><use href="#icon-search"/></svg></span>' +
          // Llevan `data-i18n-html` para que applyI18nToDom() las repinte al
          // cambiar de idioma: este bloque se construye una vez y no vuelve
          // a pasar por aqui.
          '<p data-i18n-html="html.esperando_parametros">' + t("html.esperando_parametros") + '</p>' +
          '<p data-i18n-html="html.configura_tus_datos_en_el_panel_lateral_y_pu">' +
            t("html.configura_tus_datos_en_el_panel_lateral_y_pu") + '</p>' +
        '</div>' +
      '</div>';

    insightsList.innerHTML = "";
    warningBox.classList.remove("show");
    // Y la severidad: si no, el siguiente aviso -- que puede ser una simple
    // nota del plan -- heredaria el rojo del error anterior.
    warningBox.classList.remove("warning--error");
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
    lastGeneratedDays = null;
    lastGeneratedProfile = null;
    lastGeneratedData = null;
    lastGeneratedReport = null;
    pendingReplaceEntryId = null;
    familiaActual = null;
    familiaViendo = null;
    if (typeof pintarFamiliaPlan === "function") pintarFamiliaPlan(null);
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
    var dayIndex = Number(btn.dataset.day) || 0;
    var dayMeals = (lastGeneratedDays && lastGeneratedDays[dayIndex])
      ? lastGeneratedDays[dayIndex].meals : lastGeneratedMeals;
    if (!mealKey || !dayMeals || !lastGeneratedDayOptions) return;
    if (typeof regeneratePlanMeal !== "function") return;

    btn.disabled = true;
    // Con lo que sobra de los días anteriores, como al generar (2026-10-27).
    var pantryState = despensaDelDiaEnPantalla(dayIndex);
    // Se pasa qué día es para que un re-roll respete la misma regla que la
    // generación: nada "de dejar hecho la noche antes" en el día 1 ni en un
    // plan de 1 día (ver isMakeAheadDish / pickDish).
    var swapOptions = Object.assign({}, lastGeneratedDayOptions, {
      planDays: (lastGeneratedDays && lastGeneratedDays.length) || 1,
      dayIndex: dayIndex
    });
    var res = conDislikesDeLaVista(function () {
      return regeneratePlanMeal(dayMeals, mealKey, swapOptions, lastGeneratedStore, pantryState);
    });

    if (!res || res.error || !res.meal) {
      btn.disabled = false;
      btn.textContent = t("ui.sin_mas_opciones");
      setTimeout(function () { btn.innerHTML = "&#8635; " + escapeHtml(t("ui.cambiar")); }, 1600);
      return;
    }

    var idx = -1;
    for (var i = 0; i < dayMeals.length; i++) {
      if (dayMeals[i].key === mealKey) { idx = i; break; }
    }
    if (idx === -1) { btn.disabled = false; return; }

    // Conserva el horario de la toma: un cambio de plato no mueve la hora.
    var old = dayMeals[idx];
    if (typeof old.time === "string") res.meal.time = old.time;
    if (typeof old.timeMinutes === "number") res.meal.timeMinutes = old.timeMinutes;
    dayMeals[idx] = res.meal;

    rerenderCurrentPlan();
    guardarPlanActual();
  }

  // ── «No me gusta» (2026-10-22) ────────────────────────────────────────
  // Un toque en un ingrediente del plan o de la lista de la compra: pasa a
  // «Alimentos que no te gustan» (sin escribirlo a mano) y se re-eligen AL
  // MOMENTO las comidas que lo llevan, en todos los días; lo demás no se
  // toca, así se puede ir quitando hasta que el plan guste. «Deshacer»
  // devuelve el plan de antes y la lista como estaba.
  function handleQuitarIngrediente(event) {
    var btn = event.target.closest('button[data-action="quitar-ingrediente"]');
    if (!btn) return;
    event.stopPropagation();
    var nombre = btn.getAttribute("data-nombre");
    if (!nombre || !lastGeneratedDays || typeof regeneratePlanMeal !== "function") return;

    // Lo que se guarda es lo que el usuario LEE (traducido): el filtro lo
    // devuelve al español con las tablas de comida (traducirTerminosDislike).
    var termino = (typeof nombreComida === "function") ? nombreComida(nombre) : nombre;
    var antes = JSON.parse(JSON.stringify(lastGeneratedDays));
    var informeAntes = lastGeneratedReport;
    var anadido = (typeof agregarNoMeGusta === "function") ? agregarNoMeGusta(termino) : false;
    var cambiadas = 0;
    var diasAtascados = [];

    function lleva(meal) {
      return (meal.items || []).some(function (it) {
        return typeof matchesDislike === "function" ? matchesDislike(it.name, [nombre]) : it.name === nombre;
      });
    }

    lastGeneratedDays.forEach(function (day, d) {
      var pantryState = despensaDelDiaEnPantalla(d);
      (day.meals || []).forEach(function (meal, idx) {
        if (!lleva(meal)) return;
        var opciones = Object.assign({}, lastGeneratedDayOptions, { planDays: lastGeneratedDays.length, dayIndex: d });
        var res = conDislikesDeLaVista(function () {
          return regeneratePlanMeal(day.meals, meal.key, opciones, lastGeneratedStore, pantryState);
        });
        if (!res || res.error || !res.meal || lleva(res.meal)) {
          if (diasAtascados.indexOf(d) === -1) diasAtascados.push(d);
          return;
        }
        if (typeof meal.time === "string") res.meal.time = meal.time;
        if (typeof meal.timeMinutes === "number") res.meal.timeMinutes = meal.timeMinutes;
        day.meals[idx] = res.meal;
        cambiadas++;
      });
    });

    // Una comida que no tiene otra opción dentro de lo que queda del
    // presupuesto del día (medido: «yogur griego» con el presupuesto
    // ajustado, 1 de 5) se resuelve rehaciendo ESE día entero, como al
    // generar: el reparto del dinero entre comidas cambia y suele caber.
    var sinCambio = 0;
    diasAtascados.forEach(function (d) {
      var dia = regenerarDiaDelPlan(d);
      if (dia && !(dia.meals || []).some(lleva)) {
        lastGeneratedDays[d] = dia;
        if (d === 0) { lastGeneratedMeals = dia.meals; lastGeneratedReport = dia.report || lastGeneratedReport; }
        cambiadas += (dia.meals || []).length;
      } else {
        sinCambio += (lastGeneratedDays[d].meals || []).filter(lleva).length;
      }
    });

    rerenderCurrentPlan();
    guardarPlanActual();
    var texto = sinCambio
      ? tFormat("ui.quitado_sin_alternativa", { nombre: termino, n: sinCambio })
      : tFormat("ui.quitado_n", { nombre: termino, n: cambiadas });
    if (typeof mostrarAvisoDeshacer === "function") {
      mostrarAvisoDeshacer(texto, function () {
        if (anadido && typeof quitarNoMeGusta === "function") quitarNoMeGusta(termino);
        lastGeneratedDays = antes;
        lastGeneratedMeals = antes[0].meals;
        lastGeneratedReport = informeAntes;
        rerenderCurrentPlan();
        guardarPlanActual();
      });
    }
  }

  /**
   * Rehace un día del plan en pantalla con el mismo perfil y los mismos datos,
   * evitando los platos de los demás días (como generateDietPlanDays) y con
   * su horario. null si no se puede (sin perfil o sin motor). No lo pinta.
   */
  function regenerarDiaDelPlan(d) {
    if (!lastGeneratedProfile || !lastGeneratedData || typeof generateDietPlan !== "function") return null;
    try {
      var data = Object.assign({}, lastGeneratedData, { dayIndex: d, planDays: lastGeneratedDays.length });
      if (d > 0) data.despensaDelPlan = despensaDelDiaEnPantalla(d);
      data.avoidDishNames = [];
      lastGeneratedDays.forEach(function (day, i) {
        if (i === d) return;
        (day.meals || []).forEach(function (m) { if (m && m.dishName) data.avoidDishNames.push(m.dishName); });
      });
      var dia = conDislikesDeLaVista(function () { return generateDietPlan(lastGeneratedProfile, data); });
      if (typeof computeMealSchedule === "function" && typeof readScheduleSettings === "function") {
        dia.meals = computeMealSchedule(dia.meals, readScheduleSettings());
      }
      return dia;
    } catch (err) {
      console.error("[no-me-gusta] no se pudo rehacer el día " + (d + 1) + ":", err);
      return null;
    }
  }

  /**
   * La despensa al empezar el día `d` del plan en pantalla: la real y, desde
   * el día 2, lo que sobra de los anteriores (despensaParaElDia,
   * plan-generator.js, 2026-10-27). Para «Cambiar», «No me gusta» y rehacer
   * un día, que así ven lo mismo que vio el día al generarse.
   */
  function despensaDelDiaEnPantalla(d) {
    if (typeof despensaParaElDia !== "function") {
      if (typeof despensaParaElMenu === "function") return despensaParaElMenu();
      return (typeof getPantryState === "function") ? getPantryState() : null;
    }
    return despensaParaElDia(lastGeneratedDays, d, lastGeneratedStore,
      { raciones: lastGeneratedData && lastGeneratedData.racionesCompra });
  }

  /**
   * Lo que sobra de la compra del plan en pantalla, para «Если не наелись…»
   * en cada día (renderDayPlans). Con las tomas de toda la casa
   * (tomasDeLaCasa), que es lo que se compra.
   */
  function despensaDelPlanEnPantalla() {
    if (!lastGeneratedDays || typeof despensaDelPlan !== "function") return null;
    // La del menú: vacía si se pidió sin despensa (2026-10-30).
    var real = (typeof despensaParaElMenu === "function") ? despensaParaElMenu()
      : ((typeof getPantryState === "function") ? getPantryState() : null);
    var dias = lastGeneratedDays.map(function (dia, d) { return { meals: tomasDeLaCasa(d) }; });
    return despensaDelPlan(dias, lastGeneratedStore, real, {});
  }

  /**
   * Guarda el plan que está en pantalla en este dispositivo (ver
   * js/core/plan-store.js). Se llama tras generar y tras "Cambiar" un plato.
   */
  function guardarPlanActual() {
    if (typeof planGuardar !== "function" || !lastGeneratedDays) return;
    // Con cada uno su menú, lo guardado es siempre el de la persona activa
    // (el primero), se esté viendo el que se esté viendo.
    var propio = (familiaActual && familiaActual.planes && familiaActual.planes[familiaActual.personas[0].id]) || null;
    planGuardar(planAlmacen(), {
      dias: propio ? propio.dias : lastGeneratedDays,
      store: lastGeneratedStore,
      dayOptions: propio ? propio.dayOptions : lastGeneratedDayOptions,
      profile: propio ? propio.profile : lastGeneratedProfile,
      data: propio ? propio.data : lastGeneratedData,
      report: propio ? propio.report : lastGeneratedReport,
      familia: familiaActual
    });
  }

  // ── Menú de varias personas (2026-10-26) ───────────────────────────────

  /** Los «no me gusta» del menú en pantalla: los de todos en el común, los de esa persona en el suyo. */
  function dislikesDeLaVista() {
    if (!familiaActual || typeof familiaDislikes !== "function") return null;
    if (familiaActual.modo === "comun") {
      return familiaDislikes(familiaActual.personas.map(function (p) { return p.dislikes; }));
    }
    var p = familiaActual.personas.filter(function (x) { return x.id === familiaViendo; })[0];
    return p ? (p.dislikes || []) : null;
  }

  /** Corre `fn` (generar, cambiar un plato…) con los «no me gusta» del menú en pantalla. */
  function conDislikesDeLaVista(fn) {
    var lista = dislikesDeLaVista();
    var fijar = lista && typeof fijarDislikesDeFamilia === "function";
    if (fijar) fijarDislikesDeFamilia(lista);
    try { return fn(); } finally { if (fijar) fijarDislikesDeFamilia(null); }
  }

  /**
   * Las tomas del día `d` para TODA la casa: lo que se compra y lo que se
   * guarda en «Mis planes». Sin familia, las del plan en pantalla. En el menú
   * común, las mismas multiplicadas por las raciones de todos; con cada uno el
   * suyo, las de cada persona, con su nombre (y una clave propia para que
   * «Mis planes» no confunda el desayuno de una con el de otra).
   */
  function tomasDeLaCasa(d) {
    var delDia = function (dias) { return (dias && dias[d] && dias[d].meals) || []; };
    if (!familiaActual) return delDia(lastGeneratedDays);
    if (familiaActual.modo === "comun") return familiaEscalarTomas(delDia(lastGeneratedDays), familiaActual.suma);
    var todas = [];
    familiaActual.personas.forEach(function (p, i) {
      var plan = familiaActual.planes && familiaActual.planes[p.id];
      if (!plan) return;
      // Los invitados comen lo de la persona activa (la primera).
      var factor = i === 0 ? 1 + (familiaActual.invitados || 0) : 1;
      familiaEscalarTomas(delDia(plan.dias), factor).forEach(function (m) {
        m.key = (m.key || "toma") + "@" + p.id;
        m.quien = p.nombre;
        todas.push(m);
      });
    });
    return todas;
  }

  /** Pinta el bloque de la familia en el menú y deja ver el de cada persona. */
  function pintarFamilia() {
    if (typeof pintarFamiliaPlan !== "function") return;
    pintarFamiliaPlan(familiaActual, familiaViendo, verMenuDe);
  }

  /** Con cada uno su menú: pasa a la pantalla el de otra persona. */
  function verMenuDe(id) {
    if (!familiaActual || !familiaActual.planes || !familiaActual.planes[id] || id === familiaViendo) return;
    var plan = familiaActual.planes[id];
    familiaViendo = id;
    lastGeneratedDays = plan.dias;
    lastGeneratedMeals = plan.dias[0].meals;
    lastGeneratedDayOptions = plan.dayOptions;
    lastGeneratedProfile = plan.profile;
    lastGeneratedData = plan.data;
    lastGeneratedReport = plan.report;
    rerenderCurrentPlan();
    renderDayDots(lastGeneratedDays.length);
    pintarFamilia();
  }

  /**
   * Al cargar la página, vuelve a pintar el último plan guardado en este
   * dispositivo. NO genera nada: un plan nuevo sale solo de "Generar plan".
   */
  function restaurarPlanGuardado() {
    if (typeof planLeer !== "function" || typeof planAlmacen !== "function") return;
    var guardado = planLeer(planAlmacen());
    if (!guardado) return;
    lastGeneratedDays = guardado.dias;
    // Mismo array que el día 1, como al generar: "Cambiar" en el día 1 lo
    // cambia en los dos sitios a la vez.
    lastGeneratedMeals = guardado.dias[0].meals;
    lastGeneratedStore = guardado.store;
    lastGeneratedDayOptions = guardado.dayOptions;
    lastGeneratedProfile = guardado.profile;
    lastGeneratedData = guardado.data;
    lastGeneratedReport = guardado.report || guardado.dias[0].report || null;
    familiaActual = guardado.familia || null;
    familiaViendo = familiaActual ? familiaActual.personas[0].id : null;
    if (familiaActual && familiaActual.planes && familiaActual.planes[familiaViendo]) {
      // Los mismos arrays en los dos sitios, como al generar: «Cambiar» un
      // plato del menú propio lo cambia también en `planes`.
      familiaActual.planes[familiaViendo].dias = lastGeneratedDays;
    }
    rerenderCurrentPlan();
    renderDayDots(lastGeneratedDays.length);
    pintarFamilia();
  }

  /**
   * Repinta la lista de la compra con TODOS los días del plan. La compra es de
   * los N días juntos: un paquete que cubre varios días se paga una vez. Se usa
   * al restaurar el plan y tras cada cambio de la despensa. Antes, tras marcar
   * una compra, se repintaba solo con las tomas del día 1: la lista y el precio
   * bajaban a un día (con 3 días, de 24 € a 8 €).
   */
  function pintarListaDeCompraActual() {
    if (!lastGeneratedMeals || typeof renderShoppingList !== "function") return;
    var dias = lastGeneratedDays;
    // Con familia, la compra es la de toda la casa (tomasDeLaCasa).
    if ((dias && dias.length > 1) || familiaActual) {
      var todas = [];
      for (var d = 0; d < dias.length; d++) todas = todas.concat(tomasDeLaCasa(d));
      renderShoppingList(todas, lastGeneratedStore, dias.length);
    } else {
      renderShoppingList(lastGeneratedMeals, lastGeneratedStore);
    }
  }

  /** Re-pinta el plan en memoria completo tras editar una toma. */
  function rerenderCurrentPlan() {
    if (!lastGeneratedMeals) return;
    var total = (typeof sumMeals === "function")
      ? sumMeals(lastGeneratedMeals)
      : (lastGeneratedReport && lastGeneratedReport.total) || {};
    var result = { meals: lastGeneratedMeals, total: total, report: lastGeneratedReport };

    // Un plan de VARIOS días se repinta con renderDayPlans(), nunca con
    // renderMeals(): renderMeals es literalmente
    // `renderDayPlans([{meals: meals}])`, o sea UNA diapositiva. Al cambiar
    // un plato borraba las demás -- seguían en memoria (`lastGeneratedDays`)
    // pero desaparecían de la pantalla, quedaba el día 1 con los puntos de N
    // días debajo, y como las tarjetas se repintaban con `data-day="0"` el
    // siguiente "Cambiar" ya apuntaba al día equivocado.
    //
    // Roto desde que llegó el carrusel (a8ccf2b, 2026-09-01): esta función
    // se escribió el mismo día y nunca se enteró de que podía haber más de
    // un día en pantalla.
    var dias = lastGeneratedDays;
    var variosDias = !!(dias && dias.length > 1);
    if (variosDias) {
      // innerHTML deja `scrollLeft` en 0. Sin guardarlo y devolverlo,
      // cambiar un plato del día 4 te dejaba mirando el día 1 -- y el punto
      // activo y las flechas, que viven del scroll, se descuadraban con él.
      var desplazado = mealsContainer ? mealsContainer.scrollLeft : 0;
      renderDayPlans(dias, despensaDelPlanEnPantalla());
      if (mealsContainer) mealsContainer.scrollLeft = desplazado;
    } else {
      renderMeals(lastGeneratedMeals, despensaDelPlanEnPantalla());
    }
    if (lastGeneratedProfile) renderSummary(lastGeneratedProfile, total);
    safeInit("schedule-timeline-render", function () {
      if (typeof renderScheduleTimeline === "function") renderScheduleTimeline(lastGeneratedMeals, lastGeneratedDays);
    });
    if (lastGeneratedProfile && lastGeneratedData) {
      renderInsights(lastGeneratedProfile, result, lastGeneratedData);
      renderWarnings(lastGeneratedProfile, result, lastGeneratedData);
    }
    safeInit("shopping-list-render", pintarListaDeCompraActual);
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
    // El diálogo es el mismo para los dos planes (2026-10-21): si el activo
    // es uno sin cocinar, se rehace ese.
    var entrada = (typeof getPantryHistory === "function")
      ? getPantryHistory().filter(function (e) { return e.id === entryId; })[0] : null;
    if (entrada && entrada.type === "nocook") {
      generarSinCocinar(entryId);
      return;
    }
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
  /**
   * Guarda «Mis datos» de la persona activa. Al generar un plan (con `data`
   * ya validado) y, desde el 2026-10-26, al cambiar de persona: si no, quien
   * rellenaba los datos de mamá y volvía a los suyos los perdía (solo se
   * guardaban al generar). Sin `data`, se leen del formulario.
   * @param {object} [data]
   */
  function guardarDatosDelFormulario(data) {
    if (typeof saveSettings !== "function") return;
    if (!data) {
      if (typeof readForm !== "function") return;
      data = readForm();
      if (data.budgetMode && typeof resolveBudget === "function") data.budget = resolveBudget(data);
      data.planDays = planDays;
    }
    var scheduleSettings = (typeof readScheduleSettings === "function") ? readScheduleSettings() : {};
    // Se parte de lo YA guardado, no de un objeto vacio: saveSettings()
    // reemplaza el objeto entero, asi que cualquier ajuste que no salga
    // del formulario (hoy hideOneDayCostNote) se borraria en cada
    // generacion sin que nadie se entere.
    var toSave = (typeof getSettings === "function") ? getSettings() : {};
    delete toSave.updatedAt;
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
  }
  // familia-ui.js lo llama antes de cambiar de persona.
  window.guardarDatosDelFormulario = guardarDatosDelFormulario;

  function runGeneration(data) {
    showSpinner();

    // setTimeout para permitir que el spinner se pinte antes del cálculo
    // (el cálculo es síncrono y rápido, pero así se ve el feedback visual)
    setTimeout(function () {
      try {
        var profile = calculateProfile(data);

        // planDays / dayIndex: los ve pickDish() (dish-selector.js) para
        // decidir si un plato "de dejar hecho la noche antes" (overnight
        // oats) puede salir. Nunca en el día 1 (no lo pudiste dejar hecho la
        // víspera), nunca en un plan de 1 día. sanitizeInputs() los arrastra
        // porque hace Object.assign({}, data, ...).
        data.planDays = planDays;
        data.dayIndex = 0;

        // Los días: una llamada al generador por cada uno, y cada día evita
        // los platos de los anteriores (generateDietPlanDays, en
        // js/engine/plan-generator.js, explica el porqué: a 8 EUR los tres
        // días salían idénticos). El presupuesto sigue siendo diario: no se
        // comparte dinero ni gramos entre días, solo se prefiere no repetir
        // lo que ya cabe en el presupuesto.
        //
        // Horario: se calcula DESPUÉS de generar cada día, nunca dentro de
        // generateDietPlan() — así el generador (probado a fondo, ver
        // STATE.md) no cambia de comportamiento por esto. Reordena
        // day.meals cronológicamente (antes: orden de categoría,
        // desayuno/comida/cena/snack/snack2 — ver js/core/meal-schedule.js)
        // y añade meal.time/meal.timeMinutes a cada uno. Aislado en
        // safeInit: si fallara, el plan se sigue mostrando con normalidad,
        // solo sin horario (mismo principio que el resto de módulos
        // opcionales, ver cabecera del archivo).
        var horario = function (day, d) {
          safeInit(d === 0 ? "meal-schedule" : "meal-schedule-day-" + d, function () {
            if (typeof computeMealSchedule === "function") {
              day.meals = computeMealSchedule(day.meals, readScheduleSettings());
            }
          });
        };

        // ── Menú de varias personas (2026-10-26, js/core/familia.js) ─────
        // Se genera sobre una COPIA de `data`: el presupuesto de la ración de
        // referencia no tiene que acabar guardado en «Mis datos».
        var familia = null;
        safeInit("familia-planear", function () {
          if (typeof familiaPlanear === "function") {
            familia = familiaPlanear(data, profile, (typeof getDislikes === "function") ? getDislikes() : []);
          }
        });
        familiaActual = familia;
        familiaViendo = familia ? familia.personas[0].id : null;
        var gen = Object.assign({}, data);
        var days;
        if (familia && familia.modo === "cada") {
          // Cada uno su menú, con sus datos y sus «no me gusta». Con el
          // presupuesto de la familia, a cada ración le toca su parte según
          // sus calorías (los invitados cuentan como la persona activa).
          var kcalTotal = familia.personas.reduce(function (a, p) { return a + p.profile.calories; }, 0)
            + familia.invitados * profile.calories;
          familia.planes = {};
          familia.personas.forEach(function (p, i) {
            var suyos = Object.assign({}, p.datos, { planDays: planDays, dayIndex: 0 });
            // Lo de la primera se compra también para los invitados: lo que
            // sobra de sus envases se cuenta para todos (despensaDelPlan).
            suyos.racionesCompra = i === 0 ? 1 + (familia.invitados || 0) : 1;
            suyos.budget = familiaPresupuestoCada(data.budget, familia.presupuesto, p.profile.calories, kcalTotal);
            if (typeof fijarDislikesDeFamilia === "function") fijarDislikesDeFamilia(p.dislikes || []);
            var diasP;
            try { diasP = generateDietPlanDays(p.profile, suyos, planDays, horario); }
            finally { if (typeof fijarDislikesDeFamilia === "function") fijarDislikesDeFamilia(null); }
            familia.planes[p.id] = {
              dias: diasP, profile: p.profile, data: suyos, report: diasP[0].report,
              dayOptions: { budget: suyos.budget, cookTime: suyos.cookTime, taste: suyos.taste }
            };
          });
          days = familia.planes[familia.personas[0].id].dias;
          gen = familia.planes[familia.personas[0].id].data;
        } else {
          // Un menú para todos: el de la persona activa, comprado `suma` veces.
          if (familia) {
            gen.budget = familiaPresupuestoComun(data.budget, familia.presupuesto, familia.suma);
            // Se compra `suma` veces: lo que sobra de un envase es de la casa.
            gen.racionesCompra = familia.suma;
          }
          days = conDislikesDeLaVista(function () { return generateDietPlanDays(profile, gen, planDays, horario); });
        }
        var result = days[0];

        // El resumen y los avisos siguen siendo del DÍA 1: son objetivos
        // diarios (kcal, proteína), no semanales. Multiplicarlos por 7 sería
        // otra cifra que no significa nada.
        renderSummary(profile, result.total);
        // Lo que sobra de la compra se calcula con el plan ya puesto
        // (despensaDelPlanEnPantalla lee lastGeneratedDays y la tienda).
        lastGeneratedDays = days;
        lastGeneratedStore = result.report && result.report.store;
        renderDayPlans(days, despensaDelPlanEnPantalla());
        renderDayDots(days.length);
        safeInit("schedule-timeline-render", function () {
          if (typeof renderScheduleTimeline === "function") renderScheduleTimeline(result.meals, days);
        });
        renderInsights(profile, result, data);
        renderWarnings(profile, result, data);
        if (typeof renderShoppingList === "function") {
          safeInit("shopping-list-render", function () {
            // La compra SÍ es de todos los días juntos: se juntan las tomas
            // de los N días y se agregan por ingrediente, así un paquete que
            // cubre varios días se paga una vez.
            // Con familia, la de toda la casa (tomasDeLaCasa): por eso se
            // dejan puestos antes los datos del plan que esa función lee.
            lastGeneratedDays = days;
            lastGeneratedMeals = result.meals;
            lastGeneratedStore = result.report && result.report.store;
            pintarListaDeCompraActual();
          });
        }
        lastGeneratedDays = days;

        // Guardado para que "Confirmar plan de hoy" pueda actuar sobre
        // este plan concreto sin tener que regenerarlo.
        lastGeneratedMeals = result.meals;
        lastGeneratedStore = result.report && result.report.store;
        lastGeneratedDayOptions = { budget: gen.budget, cookTime: gen.cookTime, taste: gen.taste };
        lastGeneratedProfile = profile;
        lastGeneratedData = gen;
        lastGeneratedReport = result.report;
        pintarFamilia();

        // Se guarda en este dispositivo para que sobreviva a una recarga (ver
        // js/core/plan-store.js). Nunca lanza: sin almacenamiento, no pasa nada.
        guardarPlanActual();

        // Guarda el perfil/formulario para la próxima visita (invitado:
        // este navegador; con sesión iniciada: también se empuja a la
        // nube) -- piggyback sobre el camino de éxito ya existente, en
        // vez de un listener por campo (ver js/core/settings.js).
        safeInit("settings-save", function () { guardarDatosDelFormulario(data); });

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
          statusText.textContent = t("ui.plan_generado_correctamente");
        }

        // ── El recorrido guiado, si al usuario le toca ──────────────────
        // Aquí y no en el arranque: casi todo lo que explica (la lista de
        // la compra, "usar hoy") no existe en la página hasta que hay un
        // plan. maybeStartTour() decide solo -- a quien ya lo vio, o lo
        // saltó, no le vuelve a salir.
        safeInit("tour-maybe-start", function () {
          if (typeof maybeStartTour === "function") maybeStartTour();
        });
      } catch (err) {
        console.error(err);
        showWarning(t("ui.ha_ocurrido_un_error_generando_el_plan"));
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
  // La pista de debajo de «Pasos al día» (la monta "field-hints", más abajo).
  var repintarPistaPasos = function () {};
  var repintarPistaKcal = function () {};

  /**
   * La marca «Tener en cuenta lo que hay en la despensa» y su nota, según lo
   * guardado (settings.planSinDespensa). Mostrarla o no (solo si hay algo en
   * la despensa) lo decide renderPantryPanel.
   */
  function pintarUsoDespensa() {
    var marca = document.getElementById("despensaUsoCheck");
    var nota = document.getElementById("despensaUsoNota");
    var apagada = (typeof despensaApagada === "function") && despensaApagada();
    if (marca) marca.checked = !apagada;
    if (nota) nota.hidden = !apagada;
  }

  function applySettingsToForm(settings) {
    if (!settings) return;
    pintarUsoDespensa();

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
    // Pasos al día (2026-10-22). Un perfil guardado antes solo trae el nivel
    // de actividad: se pasa a unos pasos de su mismo tramo, y sus calorías no
    // cambian.
    setVal("steps", typeof settings.steps === "number" ? settings.steps
      : (typeof pasosPorActividad === "function" ? pasosPorActividad(settings.activity) : null));
    repintarPistaPasos();
    setVal("workouts", settings.workouts);
    setVal("goal", settings.goal);
    setVal("cookTime", settings.cookTime);
    setVal("taste", settings.taste);
    setVal("cuisine", settings.cuisine);
    setVal("priority", settings.priority);
    setVal("store", settings.store);
    setVal("wakeTime", settings.wakeTime);
    setVal("sleepTime", settings.sleepTime);
    // «Mis calorías al día»: vacío si no se guardó, que es «la fórmula».
    var kcalPropiasEl = document.getElementById("kcalPropias");
    if (kcalPropiasEl) kcalPropiasEl.value = typeof settings.kcalPropias === "number" ? String(settings.kcalPropias) : "";
    repintarPistaKcal();

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
    // Solo se restaura si es un importe utilizable. Guardar 0 y volver a
    // escribirlo dejaba el campo por debajo de su propio min="2" (ver
    // updateBudgetCustomVisibility) -- mejor dejarlo vacío que inválido.
    if (typeof settings.budgetCustom === "number" && settings.budgetCustom >= 2) {
      setVal("budgetCustom", settings.budgetCustom);
    } else if (budgetCustomInput) {
      budgetCustomInput.value = "";
    }
    updateBudgetCustomVisibility();

    if (typeof settings.planDays === "number") seleccionarDiasDePlan(settings.planDays);
  }

  // ── Botón: resetear ───────────────────────────────────────────────────

  function resetAll() {
    form.reset();
    updateBudgetCustomVisibility(); // form.reset() desmarca los radios -> vuelve a ocultar el campo exacto
    clearOutput();
    // Y el plan guardado en este dispositivo: si no, volvería al recargar.
    if (typeof planBorrar === "function") planBorrar(planAlmacen());
    // El sin cocinar también se guarda desde el 2026-10-21: fuera los dos.
    pendingReplaceNoCookEntryId = null;
    safeInit("nocook-reset", function () {
      if (typeof clearNoCookPlan === "function") clearNoCookPlan();
      if (noCookPanel) noCookPanel.hidden = true;
      pintarDiasSinCocinar();
    });
  }

  // Solo el modo "custom" muestra el campo de cantidad exacta — elegir un
  // preset lo oculta y limpia, para que readForm() nunca lea un valor
  // numérico obsoleto de un preset anterior.
  function updateBudgetCustomVisibility() {
    var checked = document.querySelector('input[name="budgetMode"]:checked');
    var isCustom = !!checked && checked.value === "custom";
    if (budgetCustomField) budgetCustomField.hidden = !isCustom;

    // Además de ocultarlo hay que DESACTIVARLO. Ocultar no exime de la
    // validación nativa: el campo tiene min="2", y basta con que guarde un
    // valor por debajo (el 0 que deja `Number("")` cuando se genera con un
    // preset) para que `form.checkValidity()` sea false y el submit se
    // cancele EN SILENCIO. Efecto real, reproducido en producción: eliges
    // un preset, generas, recargas la página y el botón "Generar plan" deja
    // de hacer nada, sin ningún mensaje. Un campo desactivado no se valida.
    if (budgetCustomInput) budgetCustomInput.disabled = !isCustom;
  }

  // ══ CAMINO CRÍTICO: cablear el formulario ANTES de cualquier módulo
  //    opcional — ver "Arquitectura de arranque a prueba de fallos" en la
  //    cabecera del archivo. Ningún fallo posterior (despensa, catálogo,
  //    lista de la compra...) puede ya impedir que esto se ejecute. ══════
  initRenderRefs({ mealsContainer: mealsContainer, summaryEls: summaryEls });
  initInsightRefs({ warningBox: warningBox, insightsList: insightsList });

  form.addEventListener("submit", handleSubmit);
  // Resetear pide confirmación antes de borrar. Si el módulo no carga, el botón
  // no hace nada: es mejor no borrar que borrar sin preguntar.
  safeInit("reset-confirm", function () {
    if (typeof initResetConfirm !== "function") return;
    initResetConfirm({
      boton: resetBtn,
      dialogo: document.getElementById("resetConfirmDialog"),
      confirmar: document.getElementById("resetConfirmOkBtn"),
      cancelar: document.getElementById("resetConfirmCancelBtn"),
      alConfirmar: resetAll
    });
  });
  if (mealsContainer) mealsContainer.addEventListener("click", handleSwapPlanMeal);
  // «No me gusta» en las tarjetas y en la lista de la compra (2026-10-22). En la
  // lista va en CAPTURA: tocar la fila marca «en el carrito», y este botón no.
  if (mealsContainer) mealsContainer.addEventListener("click", handleQuitarIngrediente);
  if (shoppingListContainerEl) shoppingListContainerEl.addEventListener("click", handleQuitarIngrediente, true);

  budgetModeRadios.forEach(function (radio) {
    radio.addEventListener("change", updateBudgetCustomVisibility);
  });

  // ── Anchura real de la barra de desplazamiento ──────────────────────
  //
  // `100vw` la INCLUYE, así que el sangrado a ancho completo de
  // `.next-meal-sticky` (`calc(50% - 50vw)`) se pasaba justo esos píxeles y
  // la página se iba 8px a la derecha en un portátil con la ventana
  // estrecha. En un móvil no se notaba porque ahí la barra va superpuesta y
  // no ocupa ancho.
  //
  // Se publica como `--sbw` y el CSS resta la mitad por lado. Vale 0 en la
  // hoja de estilos, así que si esto no se ejecutara quedaría el
  // comportamiento de antes, no una barra rota.
  function medirBarraDesplazamiento() {
    var sbw = window.innerWidth - document.documentElement.clientWidth;
    // Nunca negativo: en algunos zooms la resta sale por debajo de cero y un
    // margen "corregido" al revés ensancharía la franja en vez de encogerla.
    document.documentElement.style.setProperty("--sbw", Math.max(0, sbw) + "px");
  }

  safeInit("scrollbar-width", function () {
    medirBarraDesplazamiento();
    window.addEventListener("resize", medirBarraDesplazamiento);

    // `resize` NO basta: la barra también aparece cuando el contenido crece
    // sin que la ventana cambie -- que es justo lo que pasa al generar un
    // plan. Por eso se vuelve a medir al pintar un plan (ver renderDayDots),
    // que es un momento que la aplicación sí controla.
    //
    // ResizeObserver sería lo natural aquí, pero NO se puede depender de él:
    // observando el <html> no llegó a dispararse ni una vez en las pruebas,
    // ni siquiera la llamada inicial. Se deja como refuerzo, nunca como
    // único camino.
    if (typeof ResizeObserver === "function") {
      new ResizeObserver(medirBarraDesplazamiento).observe(document.documentElement);
    }
  });

  // ── Ayuda de la opción elegida (actividad, objetivo) ─────────────────
  //
  // El alta explica estas opciones una por una ("Moderado: en pie a ratos,
  // o deporte 3-4 días"), pero el formulario las enseñaba peladas. Quien
  // vuelve a la aplicación, o cambia un ajuste más tarde, se quedaba
  // mirando "Sedentario / Ligero / Moderado" sin saber cuál es.
  //
  // El texto NO se copia: se lee de ONBOARDING_STEPS, que es donde ya
  // estaba escrito. Dos copias del mismo texto acaban diciendo cosas
  // distintas, y el alta y el formulario preguntan exactamente lo mismo.
  safeInit("field-hints", function () {
    // Los pasos al día dicen debajo a qué nivel de actividad corresponden
    // (2026-10-22): «Nivel de actividad: Moderado». Es lo que de verdad
    // entra en el cálculo, y así se ve sin abrir nada.
    var pasosEl = document.getElementById("steps");
    var pasosHint = document.getElementById("stepsHint");
    if (pasosEl && pasosHint && typeof nivelPorPasos === "function") {
      var pintarPasos = function () {
        var n = Number(pasosEl.value);
        pasosHint.textContent = (pasosEl.value !== "" && n >= 0 && n <= 40000)
          ? tFormat("ui.pasos_nivel", { nivel: t(nivelPorPasos(n).labelKey) })
          : "";
      };
      pasosEl.addEventListener("input", pintarPasos);
      pasosEl.addEventListener("change", pintarPasos);
      pintarPasos();
      // Restaurar los ajustes escribe el valor sin disparar eventos.
      repintarPistaPasos = pintarPasos;
    }

    // «Mis calorías al día» (2026-10-26) dice debajo lo que da la fórmula con
    // los datos de ahora, y lo pone de ejemplo dentro del campo vacío. Se
    // repinta con cualquier cambio del formulario: peso, pasos, objetivo…
    var kcalEl = document.getElementById("kcalPropias");
    var kcalHint = document.getElementById("kcalPropiasHint");
    if (kcalEl && kcalHint && typeof readForm === "function" && typeof calculateProfile === "function") {
      var pintarKcal = function () {
        var calculadas = null;
        try {
          var datos = readForm();
          datos.kcalPropias = null;
          // Solo cuentan los datos del cuerpo: un presupuesto sin elegir no quita la pista.
          datos.budgetMode = "medium";
          datos.budgetCustom = NaN;
          if (!validateInput(datos)) calculadas = calculateProfile(datos).kcalCalculadas;
        } catch (e) { calculadas = null; }
        kcalEl.placeholder = calculadas ? String(calculadas) : "";
        if (!calculadas) { kcalHint.textContent = ""; return; }
        var lleno = String(kcalEl.value).trim() !== "";
        kcalHint.textContent = tFormat(lleno ? "ui.kcal_propias_pista_llena" : "ui.kcal_propias_pista_vacia", { n: calculadas });
      };
      if (form) {
        form.addEventListener("input", pintarKcal);
        form.addEventListener("change", pintarKcal);
      }
      pintarKcal();
      repintarPistaKcal = pintarKcal;
    }

    if (typeof ONBOARDING_STEPS === "undefined") return;

    [["goal", "goalHint"]].forEach(function (par) {
      var select = document.getElementById(par[0]);
      var hint = document.getElementById(par[1]);
      if (!select || !hint) return;

      var paso = ONBOARDING_STEPS.filter(function (s) { return s.field === par[0]; })[0];
      if (!paso || !paso.options) return;

      var pintar = function () {
        var opcion = paso.options.filter(function (o) { return o.value === select.value; })[0];
        // Sin `note` no se inventa una: hay opciones que se explican solas
        // ("Perder grasa"), y rellenar el hueco por simetría sería ruido.
        // `noteKey` cuando la hay: el castellano se queda en los datos y
        // la traduccion se busca por la clave (mismo criterio que TOUR_STEPS).
        hint.textContent = (opcion && opcion.note)
          ? (opcion.noteKey ? t(opcion.noteKey) : opcion.note)
          : "";
      };

      select.addEventListener("change", pintar);
      pintar();
    });
  });

  // ── Horario del día (franja de la parte superior del panel de resultados) ─
  safeInit("schedule-init", function () {
    if (scheduleTimelineEl && typeof initScheduleRefs === "function") {
      initScheduleRefs({ scheduleTimeline: scheduleTimelineEl, nextMealSticky: nextMealStickyEl });
    }
  });

  // ── Contador informativo de la base de platos ────────────────────────
  // Dos sitios lo enseñan y NINGUNO puede llevar el número a mano: el de
  // "Notas del plan" decía 334 con el catálogo ya en 434, porque una cifra
  // escrita en el HTML no se entera de que los datos crecen.
  safeInit("food-count", function () {
    if (typeof DISH_DB === "undefined") return;
    if (foodCountEl) foodCountEl.textContent = DISH_DB.length;
    var enNotas = document.getElementById("insightsDishCount");
    if (enNotas) enNotas.textContent = DISH_DB.length;
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
  // ── Selector de tienda: NO existe hoy, y está escrito en index.html por
  //    qué. Si vuelve, esto es lo que hacía y funcionaba: rellenar las
  //    <option> desde `listAvailableStores()` (no desde el HTML, para que
  //    una tienda nueva aparezca sola) y, al CAMBIAR, poner `data-store` en
  //    <html> para el tema. Lo que NO hacía, a propósito: repintar los
  //    precios ya en pantalla -- esos platos se generaron con la tienda
  //    anterior y sus envases son los de esa tienda; decir otra cosa es el
  //    bug de §7.10. La tienda entra en el plan SIGUIENTE, que es cuando
  //    `readForm()` la lee.

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
    // El aspecto es de la cuenta: tras iniciar o cerrar sesión puede haber
    // cambiado en el dispositivo (js/core/account-prefs.js) y hay que ponerlo.
    safeInit("look-reapply-after-sync", function () {
      if (typeof getLook !== "function" || typeof applyLookToDom !== "function") return;
      var quiere = getLook();
      if (document.documentElement.getAttribute("data-look") === quiere) return;
      applyLookToDom(quiere).then(function () {
        if (typeof _menuPintarAspectos === "function") _menuPintarAspectos();
      });
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
        authPassword2Field: document.getElementById("authPassword2Field"),
        authPassword2Input: document.getElementById("authPassword2"),
        authPasswordHint: document.getElementById("authPasswordHint"),
        authEmailField: document.getElementById("authEmailField"),
        authPasswordField: document.getElementById("authPasswordField"),
        authForgotRow: document.getElementById("authForgotRow"),
        authForgotBtn: document.getElementById("authForgotBtn"),
        authSwitchRow: document.getElementById("authSwitchRow"),
        authErrorEl: authErrorEl,
        authNoticeEl: authNoticeEl,
        syncBanner: syncBannerEl,
        authSubmitBtn: authSubmitBtn,
        authSwitchPrompt: authSwitchPrompt,
        authSwitchModeBtn: authSwitchModeBtn,
        authConflictDialogEl: authConflictDialogEl,
        authConflictKeepCloudBtn: authConflictKeepCloudBtn,
        authConflictMergeBtn: authConflictMergeBtn,
        authConflictKeepLocalBtn: authConflictKeepLocalBtn,
        authDeleteAccountBtn: authDeleteAccountBtn,
        authDeleteDialogEl: authDeleteDialogEl,
        authDeleteConfirmBtn: authDeleteConfirmBtn,
        authDeleteCancelBtn: authDeleteCancelBtn,
        authDeleteErrorEl: authDeleteErrorEl,
        authDeleteConfirmInput: authDeleteConfirmInput,
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
      ["minimal", "budgetMinimalAmount", "budgetModeMinimal"],
      ["small",   "budgetSmallAmount",   "budgetModeSmall"],
      ["medium",  "budgetMediumAmount",  "budgetModeMedium"],
      ["high",    "budgetHighAmount",    "budgetModeHigh"],
    ].forEach(function (pair) {
      var el = document.getElementById(pair[1]);
      var preset = presets[pair[0]];
      if (!preset) return;
      if (el) el.textContent = "€" + preset.amount + t("ui.por_dia");

      // El NOMBRE del tramo tambien sale de aqui. Estaba escrito dos veces
      // -- `label` en budget-presets.js y a mano en index.html -- y de las
      // dos copias solo se veia la del HTML, asi que renombrar el tramo en
      // los datos no cambiaba nada en pantalla y las dos versiones podian
      // separarse sin que se notara. El texto del HTML se queda como
      // repliegue por si el JavaScript no llega.
      var chip = document.querySelector('label[for="' + pair[2] + '"] .budget-chip__title');
      if (chip && preset.label) chip.textContent = preset.label;
    });

    // ── Y lo que significa el tramo elegido ──────────────────────────
    // `preset.hint` llevaba escrito desde el principio y NO SE PINTABA en
    // ningun sitio: ni aqui ni en onboarding-ui.js, que tambien lee solo
    // `amount`. Cuatro textos mantenidos que nadie habia visto.
    //
    // Importa sobre todo en "Muy ajustado": medido el 2026-09-09, con 8 €
    // ningun perfil consigue un dia sin recortes, y quien lo elegia solo
    // veia la etiqueta y el importe. El chip no da para el texto -- son
    // cinco en fila -- asi que va debajo del grupo, igual que el de
    // objetivo.
    var hint = document.getElementById("budgetHint");
    if (hint) {
      var pintarHint = function () {
        var elegido = document.querySelector('input[name="budgetMode"]:checked');
        var p = elegido ? presets[elegido.value] : null;
        // "Cantidad exacta" no es un preset y no tiene texto: el hueco se
        // queda vacio en vez de inventar uno por simetria.
        hint.textContent = (p && p.hint)
          ? (p.hintKey ? t(p.hintKey) : p.hint)
          : "";
      };
      Array.prototype.forEach.call(
        document.querySelectorAll('input[name="budgetMode"]'),
        function (r) { r.addEventListener("change", pintarHint); }
      );
      pintarHint();
    }
  });

  // ── Comprar para varios días (2026-09-01) ────────────────────────────
  // Cambia SOLO la lista de la compra: las tarjetas de comida siguen
  // mostrando la ración de un día, que es lo que se cocina. Multiplicar
  // ahí también sería mentir sobre el plato.
  // ── Días de plan (2026-09-01) ────────────────────────────────────────
  // Vive ARRIBA, junto a los botones, porque decide QUÉ se genera. Antes
  // estaba abajo, en la lista de la compra, y solo multiplicaba las
  // cantidades del mismo día: eso no es una semana de menús, es la misma
  // comida siete veces. Ahora se llama al generador una vez por día y cada
  // uno sale distinto (medido: 7 días dan 31 platos distintos de 35).
  safeInit("plan-days-init", function () {
    var group = document.getElementById("planDays");
    if (!group) return;
    group.addEventListener("click", function (e) {
      var btn = e.target.closest(".plan-days__btn");
      if (!btn) return;
      seleccionarDiasDePlan(Number(btn.dataset.days));
    });

    var ocultar = document.getElementById("oneDayCostNoteDismiss");
    if (ocultar) {
      ocultar.addEventListener("click", function () {
        if (typeof saveSettings === "function" && typeof getSettings === "function") {
          var s = getSettings();
          s.hideOneDayCostNote = true;
          saveSettings(s);
          if (typeof pushSettingsToCloud === "function") pushSettingsToCloud();
        }
        actualizarAvisoUnDia();
      });
    }

    actualizarAvisoUnDia();
  });

  // ── Menú sin despensa (2026-10-30) ───────────────────────────────────
  // «Я сейчас в другом городе… неудобно сначала удалить, а потом снова
  // добавлять». Quitada la marca, se guarda settings.planSinDespensa y lo que
  // planifica lee una despensa vacía (despensaParaElMenu, pantry.js); lo
  // apuntado se queda como está. Vale para el próximo «Generar plan».
  safeInit("despensa-uso", function () {
    var marca = document.getElementById("despensaUsoCheck");
    if (!marca) return;
    marca.addEventListener("change", function () {
      if (typeof saveSettings === "function" && typeof getSettings === "function") {
        var s = getSettings();
        s.planSinDespensa = !marca.checked;
        saveSettings(s);
        if (typeof pushSettingsToCloud === "function") pushSettingsToCloud();
      }
      pintarUsoDespensa();
    });
    pintarUsoDespensa();
  });

  // Puntos + botón por día. El deslizamiento en sí lo hace el navegador
  // (scroll-snap en CSS): aquí solo se sincroniza el punto activo con lo
  // que se está viendo, y se permite saltar pulsando un punto.
  // Los dos carruseles (el del plan normal y, desde el 2026-10-21, el del
  // sin cocinar) los monta montarCarruselDias, más abajo; hasta entonces
  // pintar los puntos no hace nada.
  var _carruselPlan = null;
  var _carruselSinCocinar = null;

  function renderDayDots(count) {
    if (_carruselPlan) _carruselPlan.pintarPuntos(count);
  }

  /** Los puntos del carrusel del plan sin cocinar, con los días que haya en pantalla. */
  function pintarDiasSinCocinar() {
    if (!_carruselSinCocinar) return;
    var dias = (typeof lastNoCookDays !== "undefined" && lastNoCookDays) ? lastNoCookDays.length : 0;
    _carruselSinCocinar.pintarPuntos(dias);
  }

  // ── Estado de la red (2026-09-08) ────────────────────────────────────
  // Hasta ahora NADIE miraba si habia conexion. Con sesion iniciada, cada
  // cambio de despensa dispara pushPantryToCloud() y el resultado se tira:
  // sin red la llamada fallaba en silencio y el usuario se quedaba creyendo
  // que sus cambios estaban en la nube.
  //
  // Se arreglan las dos mitades: se dice que no hay red, y al volver se
  // REINTENTAN esas mismas dos llamadas. Reintentar es lo honesto -- son las
  // que la aplicacion ya hace tras cada cambio, no una sincronizacion nueva
  // con otro criterio, asi que no puede pisar nada que no fuera a pisar.
  safeInit("estado-de-red", function () {
    var pastilla = document.getElementById("offlineBadge");
    if (!pastilla) return;

    function pintar() {
      // `navigator.onLine === false` y no `!navigator.onLine`: donde la
      // propiedad no exista, se asume que hay red y no se avisa de nada.
      pastilla.hidden = navigator.onLine !== false;
    }

    window.addEventListener("offline", pintar);
    window.addEventListener("online", function () {
      pintar();
      if (typeof pushPantryToCloud === "function") pushPantryToCloud();
      if (typeof pushSettingsToCloud === "function") pushSettingsToCloud();
    });
    pintar();
  });

  /**
   * Un carrusel de días: puntos, flechas y aviso para lectores de pantalla
   * sobre una pista que desliza el navegador. Era el cuerpo de
   * "day-carousel-init" y solo servía al plan normal; desde el 2026-10-21 lo
   * usa también el plan sin cocinar, con los mismos estilos (.days-carousel).
   *
   * @param {{carrusel, pista, barra, puntos, anuncio, anterior, siguiente}} el
   * @returns {{pintarPuntos: function(number)}|null} null si falta la pista o los puntos
   */
  function montarCarruselDias(el) {
    var track = el.pista;
    var dots = el.puntos;
    if (!track || !dots) return null;

    // Paso entre diapositivas: ancho de una + hueco. Se calcula así y no
    // con `offsetLeft` porque offsetLeft es relativo al offsetParent, que
    // aquí NO es la pista -- pulsar un punto no movía el carrusel.
    function slideStep(slides) {
      if (slides.length < 2) return 0;
      var a = slides[0].getBoundingClientRect();
      var b = slides[1].getBoundingClientRect();
      return Math.max(1, b.left - a.left);
    }

    function setActiveDot(i) {
      var total = 0;
      dots.querySelectorAll(".days-carousel__dot").forEach(function (d, n) {
        total++;
        var on = n === i;
        d.classList.toggle("is-active", on);
        // El color del punto no lo ve quien usa un lector de pantalla.
        // aria-current es lo unico que dice "estas aqui".
        if (on) d.setAttribute("aria-current", "true");
        else d.removeAttribute("aria-current");
      });
      if (el.anuncio && total) el.anuncio.textContent = t("ui.dia") + " " + (i + 1) + " " + t("ui.de_contador") + " " + total;
    }

    // Flechas del teclado sobre los puntos. Un grupo de botones que
    // representa una sola eleccion se recorre con las flechas, no obligando
    // a tabular por todos: con siete dias eran siete tabuladores para llegar
    // al ultimo. El foco viaja con la seleccion para no perderlo de vista.
    dots.addEventListener("keydown", function (e) {
      var lista = dots.querySelectorAll(".days-carousel__dot");
      if (!lista.length) return;
      var destino = null;
      if (e.key === "ArrowRight" || e.key === "ArrowDown") destino = currentDay + 1;
      else if (e.key === "ArrowLeft" || e.key === "ArrowUp") destino = currentDay - 1;
      else if (e.key === "Home") destino = 0;
      else if (e.key === "End") destino = lista.length - 1;
      else return;
      e.preventDefault();
      destino = Math.max(0, Math.min(destino, lista.length - 1));
      slideTo(destino);
      if (lista[destino]) lista[destino].focus();
    });

    // ── Al cambiar de día, arriba del todo (2026-09-01) ────────────────
    // Antes se intentaba conservar la TOMA (ir del snack del día 1 al snack
    // del día 2). Funcionaba a medias y nunca de forma predecible: la
    // realineación depende de cuándo se mida la geometría y caía distinto
    // en cada intento (95px corto, 125px largo, a veces cientos). El
    // usuario propuso las dos salidas razonables -- o subir al desayuno, o
    // que todos los días se desplacen juntos -- y pidió la más fácil.
    //
    // Subir arriba es la fácil Y la predecible: cada día empieza donde
    // empieza, sin depender de alturas ajenas ni de temporizadores. La
    // alternativa (desplazamiento vertical compartido) obligaría a que
    // todos los días midieran lo mismo, y no lo miden: cada plato tiene
    // distinto número de ingredientes.
    var currentDay = 0;

    function scrollDayToTop() {
      if (!el.carrusel) return;
      var y = window.pageYOffset + el.carrusel.getBoundingClientRect().top - 70;
      window.scrollTo({ top: Math.max(0, y), behavior: "auto" });
    }

    // Se hace al PARAR el carrusel, no durante: mover la página en vertical
    // mientras el dedo sigue deslizando en horizontal se siente como un
    // tirón. `scrollend` donde existe, retardo corto donde no.
    var settleTimer = null;
    var pendingScrollTop = false;

    function flushAlign() {
      if (!pendingScrollTop) return;
      pendingScrollTop = false;
      scrollDayToTop();
    }

    if ("onscrollend" in window) {
      track.addEventListener("scrollend", flushAlign);
    }

    // Se arman LOS DOS caminos: el evento `scrollend` y un temporizador de
    // respaldo. `flushAlign` es idempotente (la bandera se limpia al
    // entrar), así que gana el que llegue primero y el otro no hace nada.
    // Depender solo de `scrollend` era frágil: existe en el navegador pero
    // no siempre llega tras un desplazamiento programado, y entonces el día
    // nuevo se quedaba a media página sin subir.
    function scheduleTop() {
      pendingScrollTop = true;
      if (settleTimer) clearTimeout(settleTimer);
      settleTimer = setTimeout(flushAlign, 160);
    }

    // ── Flechas laterales (2026-09-03) ────────────────────────────────
    // "На ноутбуке не удобно между днями листать": en un portátil no se
    // desliza, y los puntos miden 8px. Las flechas NO son otra forma de
    // navegar: llaman al mismo `slideTo` que los puntos, para que no haya
    // dos maneras de mover el carrusel que puedan discrepar.
    var prevBtn = el.anterior;
    var nextBtn = el.siguiente;

    function updateArrows() {
      if (!prevBtn || !nextBtn) return;
      var total = track.querySelectorAll(".day-slide").length;
      // Se ocultan, no se desactivan: un botón que no hace nada invita a
      // pulsarlo y a pensar que algo va mal. Con un solo día no hay nada
      // entre lo que moverse y desaparecen los dos.
      prevBtn.hidden = (total < 2 || currentDay <= 0);
      nextBtn.hidden = (total < 2 || total - 1 <= currentDay);
    }

    function slideTo(i) {
      var slides = track.querySelectorAll(".day-slide");
      if (!slides.length) return;
      i = Math.max(0, Math.min(i, slides.length - 1));
      track.scrollTo({ left: i * slideStep(slides), behavior: "smooth" });
      // Se marca YA, sin esperar al evento `scroll`: con desplazamiento
      // suave ese evento puede no llegar nunca con la posición final, y el
      // punto se quedaba en el día 1 aunque el carrusel sí se moviera.
      goToDay(i);
    }

    function goToDay(i) {
      if (i === currentDay) return;
      currentDay = i;
      setActiveDot(i);
      updateArrows();
      scheduleTop();
    }

    if (prevBtn) prevBtn.addEventListener("click", function () { slideTo(currentDay - 1); });
    if (nextBtn) nextBtn.addEventListener("click", function () { slideTo(currentDay + 1); });

    dots.addEventListener("click", function (e) {
      var dot = e.target.closest(".days-carousel__dot");
      if (!dot) return;
      slideTo(Number(dot.dataset.go));
    });

    // El punto activo se deduce del scroll, no de quién pulsó: así también
    // acierta cuando el usuario desliza con el dedo.
    track.addEventListener("scroll", function () {
      var slides = track.querySelectorAll(".day-slide");
      if (slides.length < 2) return;
      var step = slideStep(slides);
      var i = step ? Math.round(track.scrollLeft / step) : 0;
      goToDay(Math.min(i, slides.length - 1));
    }, { passive: true });

    /**
     * Pinta los puntos de un plan recién pintado. Un plan nuevo empieza en el
     * día 1: al re-renderizar, la pista se queda con `scrollLeft = 0`, así
     * que dejar `currentDay` en el día 4 del plan anterior descuadraba las
     * flechas hasta el primer desplazamiento.
     */
    function pintarPuntos(count) {
      var bar = el.barra;
      if (!bar) return;
      currentDay = 0;
      if (!(1 < count)) {
        bar.hidden = true;
        dots.innerHTML = "";
        updateArrows();              // con un día no hay flechas que enseñar
        medirBarraDesplazamiento();  // pero la barra de scroll sí puede salir
        return;
      }
      bar.hidden = false;
      var html = "";
      for (var i = 0; i < count; i++) {
        html += '<button type="button" class="days-carousel__dot' + (i === 0 ? " is-active" : "") +
          '" data-go="' + i + '"' + (i === 0 ? ' aria-current="true"' : "") +
          ' aria-label="' + escapeHtml(t("ui.dia")) + " " + (i + 1) + " " + escapeHtml(t("ui.de_contador")) + " " + count + '"></button>';
      }
      dots.innerHTML = html;
      updateArrows();
      // Y un plan recién pintado es justo cuando aparece la barra de
      // desplazamiento: hay que volver a medirla o el sangrado a ancho
      // completo de la franja "siguiente toma" se pasa por su anchura.
      medirBarraDesplazamiento();
    }

    return { pintarPuntos: pintarPuntos };
  }

  safeInit("day-carousel-init", function () {
    _carruselPlan = montarCarruselDias({
      carrusel: document.getElementById("daysCarousel"),
      pista: mealsContainer,
      barra: document.getElementById("daysCarouselBar"),
      puntos: document.getElementById("daysDots"),
      anuncio: document.getElementById("dayAnnounce"),
      anterior: document.getElementById("dayPrevBtn"),
      siguiente: document.getElementById("dayNextBtn")
    });
  });

  safeInit("nocook-carousel-init", function () {
    _carruselSinCocinar = montarCarruselDias({
      carrusel: document.getElementById("noCookCarousel"),
      pista: noCookResults,
      barra: document.getElementById("noCookDaysBar"),
      puntos: document.getElementById("noCookDots"),
      anuncio: document.getElementById("noCookDayAnnounce"),
      anterior: document.getElementById("noCookPrevBtn"),
      siguiente: document.getElementById("noCookNextBtn")
    });
  });

  // ── Lista de la compra (aún vacía hasta generar un plan) ─────────────
  safeInit("shopping-list-init", function () {
    if (shoppingPanel && typeof initShoppingListRefs === "function") {
      initShoppingListRefs({
        shoppingPanel: shoppingPanel,
        shoppingSummaryEl: shoppingSummaryEl,
        shoppingCountEl: shoppingCountEl,
        shoppingListContainer: shoppingListContainerEl,
        shoppingEyebrowEl: document.getElementById("shoppingEyebrow")
      });
    }
  });

  // ── Controles táctiles y pestañas del móvil (2026-09-28) ─────────────
  // Mejora progresiva: si cualquiera de los dos falla, el formulario y la
  // página siguen funcionando como antes (ver sus cabeceras).
  safeInit("form-controls", function () {
    if (typeof initFormControls === "function") initFormControls();
  });
  // Las personas de la casa y el menú de varias (2026-10-26, js/ui/familia-ui.js).
  safeInit("personas", function () {
    if (typeof initPersonas === "function") initPersonas();
    if (typeof initFamiliaCampo === "function") initFamiliaCampo();
  });
  safeInit("pestanas", function () {
    if (typeof initPestanas === "function") initPestanas();
  });
  safeInit("entreno", function () {
    if (typeof initEntreno === "function") initEntreno();
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
      pintarListaDeCompraActual();
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
        var result, mode, savedDays = 1;
        if (pendingReplaceEntryId && typeof replacePendingMealsForToday === "function") {
          // Con familia se guarda lo de toda la casa (tomasDeLaCasa).
          result = replacePendingMealsForToday(pendingReplaceEntryId, tomasDeLaCasa(0), lastGeneratedStore, lastGeneratedDayOptions);
          pendingReplaceEntryId = null;
          mode = "active-replaced";
        } else if (typeof savePlanForToday === "function") {
          result = savePlanForToday(tomasDeLaCasa(0), lastGeneratedStore, lastGeneratedDayOptions);
          mode = result.replaced ? "draft-updated" : "created";

          // ── Plan de VARIOS DÍAS (2026-09-03) ──────────────────────────
          // Antes se guardaba solo `lastGeneratedMeals`, que son las tomas
          // del DÍA 1: el usuario generaba una semana, pulsaba confirmar y
          // en "Mis planes" aparecía un único día. Los demás días ya
          // estaban generados y en pantalla (`lastGeneratedDays`, es lo que
          // pinta el carrusel) -- simplemente nadie los guardaba.
          //
          // Cada día va bajo SU fecha, empezando hoy, porque "Mis planes"
          // se organiza por fecha: guardarlos todos bajo hoy los apilaría
          // en el mismo día y no serviría de nada.
          //
          // Se salta el día 0: ya lo guardó la llamada de arriba, con su
          // UPSERT sobre el borrador de hoy. Repetirlo aquí crearía una
          // segunda entrada de hoy.
          if (lastGeneratedDays && lastGeneratedDays.length > 1) {
            savedDays = lastGeneratedDays.length;
            for (var d = 1; d < lastGeneratedDays.length; d++) {
              var dayMeals = tomasDeLaCasa(d);
              if (!dayMeals.length) continue;
              var fecha = new Date();
              fecha.setDate(fecha.getDate() + d);
              savePlanForToday(dayMeals, lastGeneratedStore, lastGeneratedDayOptions,
                               formatLocalDateKey(fecha));
            }
          }
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
        if (typeof renderPlanSavedNotice === "function") renderPlanSavedNotice(result.entry, result.historySaved, mode, savedDays);

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
   *
   * Desde el 2026-10-21, como el plan normal: cada día del plan va bajo SU
   * fecha, empezando hoy, y el aviso va en la lista de la compra del sin
   * cocinar, que es donde está el botón.
   */
  function handleUseNoCookPlanToday() {
    safeInit("use-nocook-plan-today", function () {
      if (typeof lastNoCookSlots === "undefined" || !lastNoCookSlots) return;
      if (typeof saveNoCookPlanForToday !== "function") return;

      usePlanTodayNoCookBtn.disabled = true;
      try {
        var storeForEntry = (typeof lastNoCookStore !== "undefined") ? lastNoCookStore : undefined;
        var result, mode;
        if (pendingReplaceNoCookEntryId && typeof replacePendingNoCookSlotsForToday === "function") {
          // «Cambiar el plan completo»: sobre ESA entry, conservando lo ya comido.
          result = replacePendingNoCookSlotsForToday(pendingReplaceNoCookEntryId, lastNoCookSlots, storeForEntry);
          pendingReplaceNoCookEntryId = null;
          mode = "active-replaced";
        } else {
          result = saveNoCookPlanForToday(lastNoCookSlots, storeForEntry);
          mode = result && result.replaced ? "draft-updated" : "created";
        }
        if (!result) return;
        var dias = (typeof lastNoCookDays !== "undefined" && lastNoCookDays) ? lastNoCookDays : [];
        // El día 0 ya lo guardó la llamada de arriba (con su UPSERT sobre el
        // borrador de hoy): repetirlo crearía una segunda entrada de hoy.
        for (var d = 1; d < dias.length; d++) {
          var fecha = new Date();
          fecha.setDate(fecha.getDate() + d);
          saveNoCookPlanForToday(dias[d].slots, storeForEntry, formatLocalDateKey(fecha));
        }

        safeInit("select-today-in-plans", function () {
          if (typeof selectPlanDate === "function" && typeof formatLocalDateKey === "function") {
            selectPlanDate(formatLocalDateKey(new Date()));
          }
        });

        if (typeof renderPantryPanel === "function") renderPantryPanel();
        if (typeof renderPlanSavedNotice === "function") {
          var avisoSinCocinar = (typeof noCookAvisoGuardado === "function") ? noCookAvisoGuardado() : null;
          renderPlanSavedNotice(result.entry, result.historySaved, mode,
                                Math.max(1, dias.length), avisoSinCocinar || undefined);
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
        despensaUso: document.getElementById("despensaUso"),
        planSavedNoticeEl: planSavedNoticeEl,
        onPantryChange: syncAfterPantryChange,
        planReplaceDialogEl: planReplaceDialogEl,
        planReplaceBodyEl: planReplaceBodyEl,
        planReplaceFullBtn: planReplaceFullBtn,
        planReplaceCancelBtn: planReplaceCancelBtn,
        onReplaceWholePlan: handleReplaceWholePlan,
        despensaDialogEl: pantryPanel,
        despensaCloseBtn: pantryCloseBtn,
        // Lo comprado para un plan sin cocinar, en su apartado (2026-10-21).
        pantryNoCookSection: document.getElementById("pantryNoCookSection"),
        pantryNoCookList: document.getElementById("pantryNoCookList")
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
        priority: data.priority
        // Lo «de la noche antes» (avena remojada) lo decide cada día
        // generateNoCookPlanDays: solo en el día 2+ de un plan de varios.
      };
    } catch (err) {
      console.warn("[no-cook:targets] formulario no utilizable, se usa el objetivo por defecto:", err);
      return null;
    }
  }

  /**
   * Plan sin cocinar de hoy que debe interrumpir «Sin cocinar» con el
   * diálogo de plan activo (2026-10-21), como getBlockingActiveEntry() para el
   * plan normal. Nunca lanza: un fallo aquí no impide generar.
   */
  function getBlockingNoCookEntry() {
    try {
      return (typeof findBlockingNoCookEntryToday === "function") ? findBlockingNoCookEntryToday() : null;
    } catch (err) {
      console.error("[plan-replace-gate:sin-cocinar] fallo comprobando el plan activo -- se deja generar:", err);
      return null;
    }
  }

  function handleNoCook() {
    var activa = getBlockingNoCookEntry();
    if (activa) {
      safeInit("nocook-replace-prompt", function () {
        if (typeof showPlanReplaceDialog === "function") showPlanReplaceDialog(activa);
      });
      return;
    }
    generarSinCocinar(null);
  }

  /**
   * Cuerpo de «Sin cocinar», también para «Cambiar el plan completo» del
   * diálogo (con `reemplazarId`, la entry de hoy que la confirmación sustituye).
   */
  function generarSinCocinar(reemplazarId) {
    pendingReplaceNoCookEntryId = reemplazarId || null;
    safeInit("no-cook-run", function () {
      if (typeof runNoCookGenerator !== "function") return;
      if (noCookPanel) noCookPanel.hidden = false;
      // Sin storeId: el generador cae en DEFAULT_STORE_ID (Mercadona). Los
      // días, los mismos que el plan normal (2026-10-21; de 1 a 7 desde el
      // 2026-10-26).
      runNoCookGenerator(undefined, readNoCookTargets(), planDays);
      pintarDiasSinCocinar();
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
        noCookStatus: noCookStatus,
        // Su lista de la compra, en la pestaña «Compra» (2026-10-21).
        noCookShoppingPanel: document.getElementById("noCookShoppingPanel"),
        noCookShoppingList: document.getElementById("noCookShoppingList"),
        noCookShoppingSummary: document.getElementById("noCookShoppingSummary"),
        noCookShoppingCount: document.getElementById("noCookShoppingCount"),
        noCookShoppingEyebrow: document.getElementById("noCookShoppingEyebrow"),
        noCookSavedNotice: document.getElementById("noCookPlanSavedNotice")
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

  // ── Primera visita ───────────────────────────────────────────────────
  // Va AL FINAL del arranque a propósito: para cuando el alta decide si
  // enseñarse, el formulario ya está relleno con los ajustes guardados, y
  // por tanto `hasProfile` dice la verdad. Al revés, un usuario de siempre
  // vería la pantalla de "cuéntame quién eres" mientras sus datos llegan
  // por detrás.
  //
  // Como todo lo demás, dentro de safeInit(): si el alta fallara, lo que
  // queda es la aplicación de siempre, no una pantalla en blanco.
  // Pie: releer las condiciones y repetir la explicación. Va aparte del
  // alta porque tiene que funcionar SIEMPRE, no solo el primer día.
  // El menú de ajustes. Dentro de safeInit como todo lo demás: si fallara,
  // lo que queda es la aplicación de siempre sin menú, no una pantalla en
  // blanco. El tema ya está aplicado por el IIFE del <head> antes de esto.
  safeInit("ajustes-menu", function () {
    if (typeof initAjustesMenu === "function") initAjustesMenu();
  });

  // El idioma se aplica al DOM aquí y no en el <head>: para traducir hace
  // falta que el texto EXISTA, o sea que el HTML esté parseado. Puede
  // quedar un parpadeo del español al idioma elegido en un móvil lento; se
  // acepta a propósito, porque la alternativa era esconder la página hasta
  // traducirla y esconder es justo lo que prohíbe 7.2. Para quien lee en
  // español -- la mayoría -- no hay parpadeo ninguno.
  safeInit("i18n-aplicar", function () {
    if (typeof applyI18nToDom === "function") applyI18nToDom();
  });

  // Ofrecer la versión propia cuando el navegador traduce a un idioma que
  // ya hablamos. Va aparte de i18n-aplicar: si esto fallara, la aplicación
  // sigue traduciéndose igual, solo se pierde el aviso.
  safeInit("aviso-traduccion", function () {
    if (typeof initAvisoTraduccion === "function") initAvisoTraduccion();
  });

  safeInit("footer-links", function () {
    var legalBtn = document.getElementById("footerLegalBtn");
    if (legalBtn && typeof openLegalDialog === "function") {
      legalBtn.addEventListener("click", openLegalDialog);
    }

    // Estas dos eran funciones anónimas aquí dentro. Se sacaron con nombre
    // (más abajo en este archivo) cuando el menú de ajustes empezó a
    // ofrecer lo mismo: dos botones que hacen "lo mismo" con dos copias del
    // código son dos comportamientos que se separan solos. Un dueño, una
    // implementación -- la lección de 7.10.

    // ── Descargar mis datos ────────────────────────────────────────────
    // Se podia BORRAR la cuenta pero no sacar nada antes, y todo lo que
    // guarda esta aplicacion vive en ESTE navegador: perfil, despensa,
    // planes, horario. Borrar los datos del sitio se los lleva sin aviso.
    //
    // Se exporta lo que hay en localStorage bajo el prefijo del proyecto,
    // no una lista escrita a mano: asi una clave nueva entra en la copia
    // sola, sin que nadie tenga que acordarse de anadirla aqui.
    var exportBtn = document.getElementById("footerExportBtn");
    if (exportBtn) exportBtn.addEventListener("click", exportarMisDatos);
    // Y volver a cargarla (2026-10-18): la copia ya no es de ida solo.
    var importBtn = document.getElementById("footerImportBtn");
    if (importBtn) importBtn.addEventListener("click", importarMisDatos);
    var archivo = document.getElementById("copiaArchivo");
    if (archivo) archivo.addEventListener("change", _alElegirCopia);

    var tourBtn = document.getElementById("footerTourBtn");
    if (tourBtn) tourBtn.addEventListener("click", repetirExplicacion);
  });

  // Registro de peso bajo «Peso (kg)» (js/core/weight-log.js, js/ui/render-weight.js).
  safeInit("weight-log", function () {
    if (typeof initWeightLog === "function") initWeightLog();
  });

  // Último plan guardado en este dispositivo: se vuelve a pintar tal cual, sin
  // generar nada (ver js/core/plan-store.js). Va AQUÍ, con los módulos ya
  // montados: pintar el día necesita el carrusel (montarCarruselDias, más arriba)
  // y la lista de la compra no debe quedar pisada por una init posterior.
  safeInit("plan-restore", restaurarPlanGuardado);
  // Y lo mismo el plan sin cocinar (2026-10-21), en su panel y con su carrusel.
  safeInit("nocook-restore", function () {
    if (typeof restaurarPlanSinCocinar !== "function") return;
    if (!restaurarPlanSinCocinar()) return;
    if (noCookPanel) noCookPanel.hidden = false;
    pintarDiasSinCocinar();
  });

  // Los nombres de producto del modo sin cocinar en el idioma de la pantalla
  // (js/core/productos-idioma.js, 2026-10-22). Llegan después de pintar: lo
  // que ya está en pantalla se vuelve a pintar con ellos (el plan, su compra
  // y lo comprado de la despensa). Sin red y sin copia, se queda la etiqueta.
  safeInit("productos-idioma", function () {
    if (typeof productosCargar !== "function" || typeof getLang !== "function") return;
    productosCargar(getLang()).then(function (llegaron) {
      if (!llegaron) return;
      safeInit("productos-idioma-repintar", function () {
        if (typeof lastNoCookDays !== "undefined" && lastNoCookDays && typeof paintNoCookDays === "function") {
          paintNoCookDays(lastNoCookDays);
        }
        if (typeof renderPantryPanel === "function") renderPantryPanel();
      });
    }, function (err) {
      console.warn("[productos-idioma] sin traducción de productos:", err && err.message);
    });
  });

  safeInit("onboarding-init", function () {
    if (typeof initOnboarding !== "function") return;

    // "Ya tiene perfil" = los datos guardados traen las tres medidas que
    // no tienen valor por defecto razonable. Mirar solo si el objeto de
    // ajustes existe no valdría: se crea en cuanto se toca cualquier
    // campo, incluido el presupuesto.
    var saved = (typeof getSettings === "function") ? getSettings() : {};
    var hasProfile = !!(saved && saved.age && saved.weight && saved.height);
    // Con un plan guardado en este dispositivo no se vuelve a enseñar la
    // bienvenida al invitado (decisión del dueño, 2026-10-18). Desde el
    // 2026-10-21 el plan sin cocinar también vuelve tal cual, así que cuenta.
    var hasPlan = typeof planLeer === "function" && typeof planAlmacen === "function" &&
                  (planLeer(planAlmacen()) !== null ||
                   (typeof planSinCocinarLeer === "function" && planSinCocinarLeer(planAlmacen()) !== null));

    initOnboarding({
      hasProfile: hasProfile,
      hasPlan: hasPlan,
      onFinish: function () {
        // El ultimo boton del alta dice "Generar plan", asi que genera el
        // plan (2026-09-03, a peticion del usuario).
        //
        // Antes solo hacia scroll hasta el boton y lo dejaba ahi: la idea
        // era que el plan no apareciera "por arte de magia" sin haber visto
        // de donde salen los numeros. Pero el efecto real era que el alta
        // terminaba en un formulario y no en un resultado, y el recorrido
        // guiado -- que necesita un plan que senalar -- no llegaba a salir
        // hasta que el usuario adivinaba que faltaba pulsar algo.
        //
        // Se pulsa el boton REAL en vez de llamar al generador: asi pasa
        // por la misma validacion que un envio a mano (si algo quedo sin
        // contestar, sale el aviso de siempre en vez de un plan a medias).
        var generar = document.querySelector('#plannerForm button[type="submit"]');
        if (!generar) return;

        // El plan se genera DESPUÉS de la pregunta del recorrido, no antes
        // (2026-10-07, a petición del usuario: «после прохождения вопросов
        // сразу должно показывать хотите пройти тур, а не после создания
        // плана»). La pregunta sale al instante, al soltar la última
        // pregunta del cuestionario; conteste lo que conteste -- sí, no o
        // Escape --, entonces se genera el plan. Si dijo «Sí», el recorrido
        // arranca solo en cuanto el plan está pintado (maybeStartTour, que
        // se llama al final de cada generación; ver js/ui/tour.js).
        //
        // Un «No» queda guardado: para verlo después está «Ver la
        // explicación otra vez». Se pregunta SIN pasar por maybeStartTour
        // y sin mirar si ya lo vio: si pidió repetir el alta quiere que se
        // lo ofrezcan otra vez, y hacerlo depender de una marca guardada es
        // justo lo que dejó a este usuario sin recorrido (reportado el
        // 2026-09-03).
        //
        // Con un plan de hoy ya empezado «Generar plan» abre el diálogo
        // «Ya tienes un plan activo» en vez de generar. Ya no importa para
        // la pregunta, que salió antes; si dijo «Sí» y acepta cambiar el
        // plan, el recorrido arranca cuando el plan nuevo se pinta.
        var generado = false;
        function generarElPlan() {
          if (generado) return;
          generado = true;
          if (typeof generar.scrollIntoView === "function") {
            generar.scrollIntoView({ behavior: "smooth", block: "center" });
          }
          // Un respiro antes de generar: el formulario acaba de aparecer y
          // que se rellene solo ANTE los ojos es parte de entender de donde
          // sale el plan.
          window.setTimeout(function () { generar.click(); }, 450);
        }

        if (typeof offerTour === "function") {
          try {
            offerTour(generarElPlan);
          } catch (err) {
            // Si la pregunta falla, el plan se genera igualmente: no se le
            // queda al usuario un cuestionario que no desemboca en nada.
            console.error(err);
            generarElPlan();
          }
        } else {
          generarElPlan();
        }
      }
    });
  });

});

/**
 * Se lleva TODO lo que esta aplicacion guarda en este navegador: perfil,
 * despensa, planes, horario, tema. Se podia borrar la cuenta pero no sacar
 * nada antes, y borrar los datos del sitio se lo lleva sin aviso.
 *
 * Recorre el prefijo del proyecto en vez de una lista escrita a mano: asi
 * una clave nueva entra en la copia sola, sin que nadie se acuerde de
 * anadirla aqui. `nutritionPlanner.theme.v1` entro por esa puerta.
 *
 * Tiene nombre porque la llaman DOS botones -- el del pie y el del menu de
 * ajustes -- y dos copias del mismo codigo se separan solas.
 */
function exportarMisDatos() {
  // Qué entra y con qué forma: js/core/data-backup.js (desde el 2026-10-18
  // también las claves `weekplate-`: peso, cuestionario de entrenamiento, plan).
  var almacen = null;
  try { almacen = window.localStorage; } catch (e) { almacen = null; }
  var datos = copiaCrear(almacen, new Date().toISOString());

  var blob = new Blob([JSON.stringify(datos, null, 2)], { type: "application/json" });
  var url = URL.createObjectURL(blob);
  var a = document.createElement("a");
  a.href = url;
  a.download = "weekplate-copia-" + new Date().toISOString().slice(0, 10) + ".json";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Sin revocar, el blob se queda en memoria hasta recargar.
  setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
}

/** «Cargar una copia» (pie y menú ☰): abre el selector de ficheros. */
function importarMisDatos() {
  var archivo = document.getElementById("copiaArchivo");
  if (!archivo) return;
  archivo.value = "";
  archivo.click();
}

function _copiaLeerTexto(fichero) {
  if (typeof fichero.text === "function") return fichero.text();
  return new Promise(function (resolver, rechazar) {
    var lector = new FileReader();
    lector.onload = function () { resolver(String(lector.result || "")); };
    lector.onerror = function () { rechazar(lector.error); };
    lector.readAsText(fichero);
  });
}

function _copiaFechaTexto(iso) {
  var lang = typeof getLang === "function" ? getLang() : "es";
  var locale = (typeof LANG_LOCALES !== "undefined" && LANG_LOCALES[lang]) || "es-ES";
  try {
    return new Date(iso).toLocaleString(locale, { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch (e) {
    return iso.slice(0, 10);
  }
}

/**
 * Se eligió un fichero: se lee, se valida (copiaAnalizar), se pregunta y se
 * cargan los datos. Con cuenta, la copia se sube también a la nube antes de
 * recargar: si no, al recargar la nube volvería a pisar lo recién cargado. Si
 * la subida falla, se quita la marca de «sincronizado» y el siguiente inicio
 * pregunta qué datos quedarse (el diálogo de conflicto de siempre).
 */
function _alElegirCopia(ev) {
  var fichero = ev && ev.target && ev.target.files && ev.target.files[0];
  if (!fichero) return;
  if (COPIA_MAX_BYTES < fichero.size) { window.alert(t("ui.copia_error_grande")); return; }
  _copiaLeerTexto(fichero).then(function (texto) {
    var r = copiaAnalizar(texto);
    if (!r.ok) {
      window.alert(t(r.error === "grande" ? "ui.copia_error_grande" : "ui.copia_error"));
      return;
    }
    var pregunta = r.fecha
      ? tFormat("ui.copia_confirmar", { fecha: _copiaFechaTexto(r.fecha) })
      : t("ui.copia_confirmar_sin_fecha");
    if (!window.confirm(pregunta)) return;
    var almacen = null;
    try { almacen = window.localStorage; } catch (e) { almacen = null; }
    if (copiaRestaurar(almacen, r.claves) < 0) { window.alert(t("ui.copia_error_guardar")); return; }

    var usuario = typeof getCurrentUser === "function" ? getCurrentUser() : null;
    var sincronizado = usuario && typeof getCloudSyncedUserId === "function" && getCloudSyncedUserId() === usuario.id;
    var subida = (sincronizado && typeof pushAllToCloud === "function") ? pushAllToCloud({}) : Promise.resolve(null);
    Promise.resolve(subida).then(function (res) {
      if (res && res.error && !res.skipped && typeof clearCloudSyncedUserId === "function") clearCloudSyncedUserId();
    }, function () {
      if (typeof clearCloudSyncedUserId === "function") clearCloudSyncedUserId();
    }).then(function () { window.location.reload(); });
  }, function () {
    window.alert(t("ui.copia_error"));
  });
}

/**
 * «Ver la explicación otra vez» (pie y menú ☰): abre el recorrido.
 *
 * Hasta el 2026-10-08 esto miraba si había un plan pintado y, si no, REPETÍA
 * EL ALTA: quien no tenía plan en pantalla acababa otra vez en la bienvenida
 * («elegir o crear cuenta»). El recorrido ya no señala la página de verdad
 * (js/ui/tour.js), así que no necesita plan y se abre siempre.
 */
function repetirExplicacion() {
  if (typeof startTour === "function") startTour();
}
