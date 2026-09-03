/**
 * js/ui/render-no-cook.js
 * ─────────────────────────────────────────────────────────────────────────
 * Renderiza el resultado del modo "Sin cocinar" (js/engine/no-cook-
 * generator.js). Independiente del render.js del plan normal — no hay
 * macros que ajustar ni presupuesto que verificar, solo mostrar qué
 * productos reales comprar y en qué unidad natural consumirlos.
 *
 * Depende de:
 *   js/core/utils.js              (round0, round1, round2, escapeHtml)
 *   js/engine/no-cook-generator.js (generateNoCookPlan)
 *
 * Inicialización obligatoria:
 *   Llamar a initNoCookRefs(refs) desde js/app.js antes de usar.
 *
 * Expone (globales):
 *   initNoCookRefs(refs)
 *   runNoCookGenerator(storeId, options)  – genera un plan nuevo y lo pinta
 *   paintNoCookPlan(plan)                 – re-pinta el plan guardado
 * ─────────────────────────────────────────────────────────────────────────
 */

var noCookResults, noCookCount, noCookStatus;

// Último plan generado, tal cual (plan.slots) -- js/app.js lo lee para
// "Confirmar plan sin cocinar" (2026-08-20f, known issue #9), mismo
// patrón que lastGeneratedMeals para el plan normal, salvo que ese vive
// en app.js (ahí es donde se llama a generateDietPlan()) mientras que
// aquí es este módulo el que llama a generateNoCookPlan().
var lastNoCookSlots = null;

// Tienda del último plan generado (2026-08-24, selector de tienda) --
// mismo motivo que lastNoCookSlots: app.js necesita saber con qué
// tienda se generó para guardar la entrada con el store correcto (ver
// saveNoCookPlanForToday, pantry.js).
var lastNoCookStore = null;

// Objetivos con los que se generó el plan actual -- necesarios para que
// "Cambiar" re-tire una toma con el mismo presupuesto/prioridad.
var lastNoCookOptions = null;
// Plan completo tal cual lo devolvió el generador (totales, coste, avisos):
// re-pintar tras cambiar una toma necesita recalcularlo entero.
var lastNoCookPlan = null;

var LEVEL_LABEL = {
  0: "Listo para comer",
  1: "Preparación mínima",
  2: "Calentar rápido",
};
var LEVEL_CLASS = { 0: "nocook-level--0", 1: "nocook-level--1", 2: "nocook-level--2" };

/**
 * Conecta los nodos DOM necesarios para este módulo.
 * @param {object} refs
 * @param {HTMLElement} refs.noCookResults
 * @param {HTMLElement} [refs.noCookCount]
 * @param {HTMLElement} [refs.noCookStatus]
 */
function initNoCookRefs(refs) {
  noCookResults = refs.noCookResults;
  noCookCount = refs.noCookCount;
  noCookStatus = refs.noCookStatus;
  // Delegación: las tarjetas se re-pintan enteras en cada cambio, así que
  // el listener vive en el contenedor y no en cada botón.
  if (noCookResults) noCookResults.addEventListener("click", handleSwapNoCookSlot);
}

/**
 * Genera un plan "sin cocinar" nuevo y lo pinta. Pensado para colgarse
 * directamente del listener del botón "Sin cocinar".
 * @param {string} [storeId] - tienda activa (2026-08-24, selector de
 *   tienda) -- por defecto DEFAULT_STORE_ID dentro de
 *   generateNoCookPlan()/getNoCookEligiblePool() si se omite.
 */
function runNoCookGenerator(storeId, options) {
  if (!noCookResults || typeof generateNoCookPlan !== "function") return;

  var plan = generateNoCookPlan(storeId, options);
  lastNoCookStore = storeId || null;
  lastNoCookOptions = options || null;

  // Mismo cálculo de horario que el plan normal (js/core/meal-schedule.js)
  // — reutilizado, no reimplementado. Aislado con su propio try/catch (en
  // vez de depender solo del safeInit de app.js que envuelve a esta
  // función entera) para que un fallo aquí solo deje el plan sin horario,
  // nunca sin platos.
  if (typeof computeMealSchedule === "function" && typeof readScheduleSettings === "function") {
    try {
      plan.slots = computeMealSchedule(plan.slots, readScheduleSettings());
    } catch (err) {
      console.error("[render-no-cook:schedule] no se pudo calcular el horario -- se muestra sin horario:", err);
    }
  }

  if (noCookCount) noCookCount.textContent = plan.poolSize;
  if (noCookStatus) noCookStatus.textContent = "Plan sin cocinar generado.";

  paintNoCookPlan(plan);
}

/**
 * Pinta un plan completo y lo guarda para poder editarlo por tomas.
 *
 * El aviso de alérgenos se arma aquí (y no en runNoCookGenerator) porque
 * también hay que re-pintarlo al cambiar una sola toma.
 */
function paintNoCookPlan(plan) {
  var allergenNote = (typeof renderAllergenLine === "function")
    ? '<p class="nocook-disclaimer">Los alérgenos que se muestran vienen de la ' +
      'etiqueta de Mercadona. Que no aparezcan <strong>no</strong> significa ' +
      'que el producto no los lleve — comprueba siempre el envase.</p>'
    : "";

  // Qué significa la marca "~ sin verificar" de las tarjetas.
  //
  // Vivía SOLO en el atributo `title`, y en un móvil no hay puntero: no se
  // puede posar el dedo sobre algo para leer un texto emergente. Así que en
  // el sitio donde de verdad se usa esta aplicación, la marca era un
  // jeroglífico. Aquí se explica sin depender de ningún gesto.
  //
  // Sale solo cuando el plan trae alguna, que es casi la mitad de las
  // veces: un aviso permanente sobre algo que a menudo no está presente se
  // convierte en decorado y se deja de leer.
  var hayAprox = (plan.slots || []).some(function (s) {
    return (s.items || []).some(function (it) { return it.needsReview; });
  });
  var aproxNote = hayAprox
    ? '<p class="nocook-disclaimer">Donde pone <span class="nutrition-approx">' +
      '~ sin verificar</span>, la nutrición se ha buscado por el <strong>nombre' +
      '</strong> del producto y nadie la ha comprobado: puede no ser la de ese ' +
      'producto exacto. El resto viene del código de barras.</p>'
    : "";

  noCookResults.innerHTML =
    renderNoCookSummary(plan) + allergenNote + aproxNote + plan.slots.map(renderNoCookSlot).join("");
  lastNoCookSlots = plan.slots;
  lastNoCookPlan = plan;
}

/**
 * "Cambiar" una sola toma del plan sin cocinar. Es también la salida del
 * usuario cuando un producto no está en SU Mercadona: no hay dato de
 * disponibilidad por tienda en el pipeline, así que la respuesta honesta es
 * volver a tirar esa toma.
 */
function handleSwapNoCookSlot(event) {
  var btn = event.target.closest('button[data-action="swap-nocook-slot"]');
  if (!btn) return;
  var slotKey = btn.dataset.slotKey;
  if (!slotKey || !lastNoCookPlan || typeof regenerateNoCookSlot !== "function") return;

  btn.disabled = true;
  var res = regenerateNoCookSlot(lastNoCookPlan, slotKey, lastNoCookStore, lastNoCookOptions || {});
  if (!res || res.error || !res.slot) {
    btn.disabled = false;
    btn.textContent = "sin más opciones";
    setTimeout(function () { btn.innerHTML = "&#8635; Cambiar"; }, 1600);
    return;
  }

  var idx = -1;
  for (var i = 0; i < lastNoCookPlan.slots.length; i++) {
    if (lastNoCookPlan.slots[i].key === slotKey) idx = i;
  }
  if (idx === -1) { btn.disabled = false; return; }
  lastNoCookPlan.slots[idx] = res.slot;

  // Totales y coste del día cambian con la toma: se recalculan enteros en
  // vez de parchear la tarjeta, que es como se cuelan las cifras viejas.
  recomputeNoCookPlanTotals(lastNoCookPlan);
  paintNoCookPlan(lastNoCookPlan);
}

/** Recalcula totales, coste y avisos del día tras editar una toma. */
function recomputeNoCookPlanTotals(plan) {
  var total = { kcal: 0, protein: 0, carbs: 0, fat: 0 };
  var packs = {};
  var consumed = 0;

  plan.slots.forEach(function (slot) {
    slot.items.forEach(function (it) {
      total.kcal += it.kcal || 0; total.protein += it.protein || 0;
      total.carbs += it.carbs || 0; total.fat += it.fat || 0;
      if (!packs[it.id]) packs[it.id] = { servings: 0, perPack: it.servingsPerPackage || 1, price: it.price };
      packs[it.id].servings += it.servings || 1;
      if (typeof costForGrams === "function" && typeof it.price === "number" && it.grams) {
        consumed += costForGrams({ price: it.price, size: it.size, sizeUnit: it.sizeUnit }, it.grams);
      }
    });
  });

  var shopping = 0, count = 0;
  Object.keys(packs).forEach(function (id) {
    var p = packs[id];
    count++;
    if (typeof p.price === "number") shopping += p.price * Math.max(1, Math.ceil(p.servings / p.perPack));
  });

  plan.total = total;
  plan.shoppingCost = Math.round(shopping * 100) / 100;
  plan.consumedCost = Math.round(consumed * 100) / 100;
  plan.productCount = count;
  plan.budgetOverrun = (plan.budget && shopping > plan.budget)
    ? Math.round((shopping - plan.budget) * 100) / 100 : 0;
}

/**
 * Resumen del día: lo que suma de verdad frente a lo que se pedía.
 *
 * Incluye a propósito DOS cifras de dinero distintas, porque significan
 * cosas distintas y confundirlas fue parte del problema:
 *   - "hoy comes"  el valor de las raciones que te comes hoy. Es lo que se
 *                  compara con el presupuesto diario.
 *   - "la compra"  el ticket: envases completos. Lo que sobra no se tira,
 *                  se queda en la despensa para días siguientes.
 *
 * Y avisa cuando la proteína se queda corta en vez de disimularlo: comida
 * lista para comer rinde ~0,11 g de proteína por kcal, así que un objetivo
 * alto sencillamente no se alcanza sin cocinar (ver la nota en
 * no-cook-generator.js). Decirlo es más útil que fingir que se cumple.
 *
 * @param {object} plan - salida de generateNoCookPlan()
 * @returns {string}
 */
function renderNoCookSummary(plan) {
  if (!plan || !plan.total) return "";
  var t = plan.total;
  var target = plan.target || {};

  var kcalLine = round0(t.kcal) + " kcal"
    + (target.kcal ? ' <span class="nocook-summary__target">de ' + round0(target.kcal) + "</span>" : "");

  var proteinLine = round0(t.protein) + " g proteína"
    + (target.protein ? ' <span class="nocook-summary__target">de ' + round0(target.protein) + "</span>" : "");

  // La cifra que manda es el TICKET: es lo que se paga hoy en caja y es lo
  // que el presupuesto limita. Lo consumido va detrás, como referencia.
  var costLine = "La compra son <strong>&euro;" + round2(plan.shoppingCost || 0) + "</strong>"
    + (plan.budget ? ' <span class="nocook-summary__target">de ' + round2(plan.budget) + "</span>" : "")
    + " en " + plan.productCount + " productos"
    + " &middot; hoy te comes &euro;" + round2(plan.consumedCost || 0)
    + " (el resto queda en la despensa)";

  var stats =
    '<div class="nocook-summary__row"><strong>' + kcalLine + "</strong></div>" +
    '<div class="nocook-summary__row">' + proteinLine + "</div>" +
    '<div class="nocook-summary__row">' + costLine + "</div>";

  if (plan.threeMealDay) {
    stats += '<div class="nocook-summary__row nocook-summary__note">' +
      "Con este presupuesto el plan son <strong>3 tomas</strong> sin snacks: " +
      "las calorías del día se reparten entre ellas en vez de gastar en picoteo.</div>";
  }

  var warn = "";

  // Pasarse del presupuesto solo ocurre cuando ni el envase más barato de
  // un papel obligatorio cabía. Se dice con la cifra exacta.
  if (plan.budgetOverrun > 0) {
    // No sugerir "pon la prioridad en barato" si YA está en barato: es el
    // consejo inútil clásico y hace que el aviso parezca automático.
    var advice = (plan.priority === "cheap")
      ? " Con este catálogo no se puede bajar más sin dejar una toma coja."
      : " Prueba a subir el presupuesto, o pon la prioridad en &laquo;lo más barato posible&raquo;.";
    warn += '<p class="nocook-summary__warn">Este plan se pasa <strong>&euro;' +
      round2(plan.budgetOverrun) + "</strong> de tu presupuesto: con menos no salía " +
      "una comida completa." + advice + "</p>";
  }

  if (target.protein && t.protein < target.protein * 0.85) {
    warn += '<p class="nocook-summary__warn">Este plan se queda en ' + round0(t.protein) +
      " g de proteína, por debajo de tus " + round0(target.protein) + " g. " +
      "Sin cocinar es un techo real: los productos listos para comer rinden poca " +
      "proteína por caloría" +
      (plan.priority === "cheap"
        ? ", y con la prioridad en «lo más barato» baja todavía más"
        : "") +
      ". Para llegar más arriba hace falta cocinar.</p>";
  }

  return '<div class="nocook-summary">' + stats + warn + "</div>";
}

/**
 * Genera el HTML de una toma completa (Desayuno/Comida/Snack/Cena).
 * @param {{key:string, label:string, items:object[]}} slot
 * @returns {string}
 */
function renderNoCookSlot(slot) {
  var timeBadge = typeof renderMealTimeBadge === "function" ? renderMealTimeBadge(slot) : "";

  // Nombre de la plantilla ("Wrap", "Plato preparado"): dice de un vistazo
  // QUÉ es la comida, no solo qué productos la componen.
  var kind = slot.templateLabel
    ? '<span class="nocook-slot__kind">' + escapeHtml(slot.templateLabel) + "</span>" : "";

  var kcal = (slot.total && slot.total.kcal)
    ? '<span class="nocook-slot__kcal">' + round0(slot.total.kcal) + " kcal</span>" : "";

  var swapBtn = '<button type="button" class="meal-swap-btn" data-action="swap-nocook-slot"' +
    ' data-slot-key="' + escapeHtml(slot.key || "") + '"' +
    ' title="Cambiar solo esta toma (por ejemplo si un producto no está en tu tienda)">' +
    "&#8635; Cambiar</button>";

  // Aviso "de la noche antes" (plantillas makeAhead: avena remojada). Mismo
  // trato que en el modo cocinado -- solo puede salir en el día 2+ de un
  // plan de varios días, así que hoy no aparece nunca.
  var makeAheadNote = slot.makeAhead
    ? '<div class="meal-make-ahead">&#9200; <strong>Prepáralo la noche anterior</strong> ' +
      '&mdash; necesita reposar en la nevera, no se hace al momento</div>'
    : "";

  // Cómo se monta, en una línea. Es la diferencia entre una lista de la
  // compra y una comida: el usuario pidió "haz un sándwich y vete".
  var assembly = slot.assembly
    ? '<p class="nocook-slot__assembly">' + escapeHtml(slot.assembly) + "</p>" : "";

  return (
    '<div class="nocook-slot">' +
      '<div class="nocook-slot__head">' + timeBadge + "<h3>" + escapeHtml(slot.label) + "</h3>" +
        kind + kcal + swapBtn +
      "</div>" +
      makeAheadNote +
      assembly +
      '<div class="nocook-items">' +
        slot.items.map(renderNoCookItem).join("") +
      "</div>" +
    "</div>"
  );
}

/**
 * Plural español de la unidad de consumo. Añadir una "s" a secas daba
 * "2 porcións" y "2 unidads"; las palabras agudas en -ón además pierden la
 * tilde al pluralizar (porción → porciones).
 *
 * @param {string} unit
 * @param {number} count
 * @returns {string}
 */
function pluralizeUnit(unit, count) {
  var u = String(unit || "ración");
  if (count === 1) return u;
  if (/ón$/.test(u)) return u.slice(0, -2) + "ones";   // porción → porciones
  if (/z$/.test(u)) return u.slice(0, -1) + "ces";     // (nuez → nueces)
  if (/[aeiouáéíóú]$/i.test(u)) return u + "s";        // lata → latas
  return u + "es";                                     // unidad → unidades
}

/**
 * Genera el HTML de un producto dentro de una toma.
 * Muestra: nivel de preparación, nombre/marca reales, unidad natural de
 * consumo, y el envase real (tamaño + precio) tal cual viene del
 * catálogo — nunca gramos inventados. Los macros solo se muestran si el
 * producto los tiene (no es obligatorio, ver cabecera del archivo).
 *
 * @param {object} item - salida de buildNoCookItem() en el generador
 * @returns {string}
 */
function renderNoCookItem(item) {
  var levelBadge =
    '<span class="nocook-level ' + (LEVEL_CLASS[item.level] || "") + '">' +
      escapeHtml(LEVEL_LABEL[item.level] || "") +
    "</span>";

  var packageLine = item.size != null && item.sizeUnit
    ? "Envase: " + item.size + item.sizeUnit + (item.price != null ? " &mdash; &euro;" + round2(item.price) : "")
    : (item.price != null ? "&euro;" + round2(item.price) : "");

  // Los macros son los de LO QUE TE COMES (raciones x gramos), no los de
  // 100 g del catálogo. Hasta 2026-09-01 se pintaban los de 100 g, así que
  // una pizza de 430 g decía "245 kcal" cuando son 1.054.
  // Si esos macros son una aproximación emparejada por nombre y sin
  // revisar, se dice. Medido el 2026-09-03: el 6,5% de los items y el 46%
  // de los planes llevan al menos uno, así que callarlo no era un detalle.
  // El "~" es la misma señal que usa la caducidad para lo estimado.
  var trustBadge = typeof renderNutritionTrustBadge === "function"
    ? renderNutritionTrustBadge(item) : "";

  var macrosLine = item.kcal != null
    ? '<div class="nocook-item__macros">' +
        (trustBadge ? "~" : "") +
        round0(item.kcal) + " kcal &mdash; P " + round1(item.protein) + "g / C " + round1(item.carbs) + "g / G " + round1(item.fat) + "g" +
        trustBadge +
      "</div>"
    : "";

  var findBtn = typeof renderProductFindBtn === "function" ? renderProductFindBtn(item) : "";

  // Alérgenos de la etiqueta de Mercadona (js/core/allergens.js). Solo
  // informativo: "" cuando el producto no está en la tabla, sin afirmar
  // nada. NO filtra el plan -- ver la cabecera de allergens.js.
  var allergenLine = typeof renderAllergenLine === "function" ? renderAllergenLine(item) : "";

  // Cantidad real: "2 raciones · 140 g". Antes decía solo "1 ración", que
  // era una etiqueta sin cantidad detrás.
  var servings = (typeof item.servings === "number") ? item.servings : item.quantity;
  var qtyText = servings + " " + escapeHtml(pluralizeUnit(item.unit, servings));
  if (typeof item.grams === "number") qtyText += ' <span class="nocook-item__grams">&middot; ' + item.grams + " g</span>";

  // "Envase entero": para la pizza y compañía, avisa de que esa toma se
  // acaba el paquete. Es lo que el usuario pidió explícitamente en vez de
  // ir dejando medias raciones sueltas.
  var wholeBadge = item.wholePackage && item.policy === "fresh"
    ? '<span class="nocook-item__whole">Envase entero</span>' : "";

  return (
    '<div class="nocook-item">' +
      levelBadge + wholeBadge +
      '<div class="nocook-item__name">' + escapeHtml(item.name) + findBtn + "</div>" +
      (item.brand ? '<div class="nocook-item__brand">' + escapeHtml(item.brand) + "</div>" : "") +
      '<div class="nocook-item__qty">' + qtyText + "</div>" +
      macrosLine +
      '<div class="nocook-item__package">' + packageLine + "</div>" +
      allergenLine +
    "</div>"
  );
}
