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
 * Desde el 2026-10-21 el plan puede ser de VARIOS días, como el normal: uno
 * por día (generateNoCookPlanDays), pintados como diapositivas del mismo
 * carrusel (los puntos y las flechas los mueve js/app.js), y se guarda en
 * este dispositivo (js/core/plan-store.js) para que vuelva tras recargar.
 *
 * Expone (globales):
 *   initNoCookRefs(refs)
 *   runNoCookGenerator(storeId, options, dias) – genera un plan nuevo (1..7 días), lo pinta y lo guarda
 *   paintNoCookDays(dias)                 – pinta los días (uno: como siempre; varios: carrusel)
 *   restaurarPlanSinCocinar()             – pinta el plan guardado; devuelve cuántos días (0 si no hay)
 *   clearNoCookPlan()                     – lo quita de la pantalla y de este dispositivo
 *   noCookCompraItems(dias)               – la compra de todos los días juntos, sin DOM
 *   recomputeNoCookDias(dias)             – totales y ticket de cada día tras editar tomas (2026-10-27)
 *   renderNoCookShoppingList(dias)        – la pinta en su panel de «Compra» (o lo esconde)
 *   noCookAvisoGuardado()                 – el aviso de «plan guardado» de esa lista
 *   quitarProductoSinCocinar(id, nombre)  – «No me gusta»: lo quita y re-tira sus tomas (2026-10-22)
 *   lastNoCookDays / lastNoCookPlan (día 1) / lastNoCookSlots (sus tomas) / lastNoCookStore
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
// re-pintar tras cambiar una toma necesita recalcularlo entero. Es el día 1
// de lastNoCookDays (todos los días del plan, 2026-10-21).
var lastNoCookPlan = null;
var lastNoCookDays = null;

// El nombre de cada nivel de preparación se pide a las tablas de traducción en
// el momento de pintar (ui.nocook_nivel_N): lo que viaja en el plan es el
// NÚMERO del nivel, nunca el texto.
var LEVEL_LABEL_KEYS = { 0: "ui.nocook_nivel_0", 1: "ui.nocook_nivel_1", 2: "ui.nocook_nivel_2" };
var LEVEL_CLASS = { 0: "nocook-level--0", 1: "nocook-level--1", 2: "nocook-level--2" };

/** El nombre de un nivel de preparación en el idioma de ahora ("" si no se conoce). */
function noCookLevelLabel(level) {
  var clave = LEVEL_LABEL_KEYS[level];
  return clave ? t(clave) : "";
}

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
  _compra = {
    panel: refs.noCookShoppingPanel || null,
    lista: refs.noCookShoppingList || null,
    resumen: refs.noCookShoppingSummary || null,
    cuenta: refs.noCookShoppingCount || null,
    ojo: refs.noCookShoppingEyebrow || null,
    aviso: refs.noCookSavedNotice || null
  };
  // Delegación: las tarjetas se re-pintan enteras en cada cambio, así que
  // el listener vive en el contenedor y no en cada botón.
  if (noCookResults) noCookResults.addEventListener("click", handleSwapNoCookSlot);
  if (noCookResults) noCookResults.addEventListener("click", _alTocarQuitarProducto);
  // Las tomas plegadas, como en el plan con platos (render.js, 2026-10-28).
  if (noCookResults && typeof alTocarToma === "function") noCookResults.addEventListener("click", alTocarToma);
  if (_compra.lista) _compra.lista.addEventListener("click", _alTocarFilaDeCompra);
  if (_compra.lista) _compra.lista.addEventListener("click", _alTocarQuitarProducto);
}

// ── «No me gusta» (2026-10-22) ───────────────────────────────────────────
// Como en el plan normal (js/app.js, handleQuitarIngrediente): el producto pasa
// a «Alimentos que no te gustan» con su nombre de la etiqueta (el filtro de
// productos compara contra él) y se re-tiran AL MOMENTO las tomas que lo
// llevan, en todos los días; lo demás no cambia. «Deshacer» lo devuelve todo.

/** El nombre del producto en el idioma de ahora (sin render.js, la etiqueta). */
function _nombreProductoLeido(nombre) {
  return typeof nombreProducto === "function" ? nombreProducto(nombre) : nombre;
}
function _nombreProductoDoble(nombre) {
  return typeof nombreProductoDoble === "function" ? nombreProductoDoble(nombre) : nombre;
}

function _botonQuitarProducto(item) {
  return '<button type="button" class="no-me-gusta-btn" data-action="quitar-producto"' +
    ' data-id="' + escapeHtml(String(item.id)) + '" data-nombre="' + escapeHtml(item.name) + '"' +
    ' aria-label="' + escapeHtml(tFormat("ui.no_me_gusta_aria", { nombre: _nombreProductoLeido(item.name) })) + '">' +
    escapeHtml(t("ui.no_me_gusta")) + "</button>";
}

function _alTocarQuitarProducto(ev) {
  var btn = ev.target.closest ? ev.target.closest('button[data-action="quitar-producto"]') : null;
  if (!btn) return;
  quitarProductoSinCocinar(btn.getAttribute("data-id"), btn.getAttribute("data-nombre"));
}

/**
 * Quita un producto del plan sin cocinar: «no me gusta» y, en cada día, se
 * vuelve a tirar cada toma que lo lleva. Avisa de cuántas cambiaron (y de las
 * que no tenían otra opción), con «Deshacer».
 * La lista de «no me gusta» se lleva el nombre TAL COMO SE LEE (traducido,
 * si hay tabla): es una lista que escribe y lee el usuario.
 * traducirTerminosDislike lo devuelve a la etiqueta con la misma tabla.
 *
 * @param {string} id - del catálogo
 * @param {string} nombre - el de la etiqueta
 */
function quitarProductoSinCocinar(id, nombre) {
  if (!lastNoCookDays || !nombre || typeof regenerateNoCookSlot !== "function") return;
  var antes = JSON.parse(JSON.stringify(lastNoCookDays));
  var termino = _nombreProductoLeido(nombre);
  var anadido = (typeof agregarNoMeGusta === "function") ? agregarNoMeGusta(termino) : false;
  var cambiadas = 0;
  var sinCambio = 0;
  lastNoCookDays.forEach(function (plan, d) {
    plan.slots.forEach(function (slot, idx) {
      var lleva = (slot.items || []).some(function (it) { return String(it.id) === String(id); });
      if (!lleva) return;
      var opciones = {};
      var base = lastNoCookOptions || {};
      for (var k in base) opciones[k] = base[k];
      opciones.allowMakeAhead = lastNoCookDays.length > 1 && d > 0;
      opciones.heredado = _heredadoDelDia(lastNoCookDays, d);
      var res = regenerateNoCookSlot(plan, slot.key, lastNoCookStore, opciones);
      if (!res || res.error || !res.slot) { sinCambio++; return; }
      plan.slots[idx] = res.slot;
      cambiadas++;
    });
  });
  recomputeNoCookDias(lastNoCookDays);
  paintNoCookDays(lastNoCookDays);
  _guardarPlanSinCocinar();
  var texto = sinCambio
    ? tFormat("ui.quitado_sin_alternativa", { nombre: termino, n: sinCambio })
    : tFormat("ui.quitado_n", { nombre: termino, n: cambiadas });
  if (typeof mostrarAvisoDeshacer === "function") {
    mostrarAvisoDeshacer(texto, function () {
      if (anadido && typeof quitarNoMeGusta === "function") quitarNoMeGusta(termino);
      paintNoCookDays(antes);
      _guardarPlanSinCocinar();
    });
  }
}

// ── La compra de todos los días (2026-10-21) ─────────────────────────────
// Como la lista del plan normal (js/ui/render-shopping-list.js), en su propio
// panel de la pestaña «Compra»: los productos de los N días juntos, cada uno
// con los envases que hacen falta, sus marcas de «ya en el carrito» (en su
// propia clave, SHOPPING_CHECKS_NOCOOK_KEY) y «Confirmar» debajo. Aquí no hay
// ingredientes que traducir a envases (js/core/budget.js): cada producto ya
// es uno real del catálogo, con su precio y sus raciones por envase.

var _compra = {};
var _compraItems = [];

/**
 * Los productos de todos los días juntos: cada uno una vez, con las raciones
 * de todos los días y los envases que hacen falta para ellas (uno que rinde
 * varios días se paga una vez). Es la MISMA cuenta que el coste de cada día
 * (recomputeNoCookPlanTotals la usa con un solo día). Sin DOM.
 * @param {object[]} dias - planes de generateNoCookPlan
 * @returns {object[]} { id, name, brand, unit, servings, grams, perPack, packs, price, cost, size, sizeUnit,
 *   purchase: { packagesToBuy } }, de más caro a más barato
 */
function noCookCompraItems(dias) {
  // Los envases de cada producto salen de la cuenta día a día del motor
  // (noCookCuentas, 2026-10-27): lo que sobra de un día se come otro, y lo
  // abierto que ya no aguanta obliga a otro envase. Es la misma cuenta que el
  // ticket de cada día, así que la compra y la suma de los días coinciden.
  var cuentas = (typeof noCookCuentas === "function") ? noCookCuentas(dias) : null;
  var porId = {};
  var orden = [];
  (dias || []).forEach(function (plan) {
    ((plan && plan.slots) || []).forEach(function (slot) {
      (slot.items || []).forEach(function (it) {
        var x = porId[it.id];
        if (!x) {
          x = porId[it.id] = {
            id: it.id, name: it.name, brand: it.brand || null, unit: it.unit || null,
            servings: 0, grams: 0, perPack: it.servingsPerPackage || 1,
            price: typeof it.price === "number" ? it.price : null,
            size: it.size != null ? it.size : null, sizeUnit: it.sizeUnit || null
          };
          orden.push(it.id);
        }
        x.servings += it.servings || 1;
        x.grams += it.grams || 0;
      });
    });
  });
  return orden.map(function (id) {
    var x = porId[id];
    x.packs = (cuentas && cuentas.envases[id]) || Math.max(1, Math.ceil(x.servings / x.perPack));
    x.cost = x.price === null ? 0 : x.price * x.packs;
    // La forma que espera claveDeArticulo (js/core/shopping-checks.js).
    x.purchase = { packagesToBuy: x.packs };
    return x;
  }).sort(function (a, b) { return b.cost - a.cost; });
}

function _hayMarcasSinCocinar() {
  return typeof leerMarcasCompra === "function" && typeof claveDeArticulo === "function" &&
    typeof SHOPPING_CHECKS_NOCOOK_KEY !== "undefined";
}

/** Una fila: la casilla, el producto con su foto, lo que se usa, lo que se compra y el precio. */
function _noCookCompraFilaHtml(x, marcado) {
  var hayMarcas = _hayMarcasSinCocinar();
  var casilla = hayMarcas
    ? '<button type="button" class="shopping-item__check" role="checkbox" aria-checked="' + (marcado ? "true" : "false") + '"' +
        ' aria-label="' + escapeHtml(t("ui.marcar_como_comprado").replace("{producto}", _nombreProductoLeido(x.name))) + '"></button>'
    : '<span class="shopping-item__check" aria-hidden="true"></span>';
  var raciones = round2(x.servings);
  var usado = t("ui.usado") + ": " + raciones + " " + noCookUnitLabel(x.unit, raciones) +
    (x.grams ? " · " + fmtUnit(round0(x.grams), "g") : "");
  var envase = (x.size != null && x.sizeUnit)
    ? " (" + escapeHtml(x.size + t("unit.sep_pegada") + tPackageUnit(x.sizeUnit)) + ")" : "";
  var findBtn = typeof renderProductFindBtn === "function" ? renderProductFindBtn(x) : "";
  return '<li class="shopping-item' + (marcado ? " is-comprado" : "") + '"' +
      (hayMarcas ? ' data-clave="' + escapeHtml(claveDeArticulo(x)) + '"' : "") + ">" +
    casilla +
    '<div class="shopping-item__main">' +
      '<div class="shopping-item__name">' + escapeHtml(_nombreProductoDoble(x.name)) + findBtn + "</div>" +
      (x.brand ? '<div class="shopping-item__meta">' + escapeHtml(x.brand) + "</div>" : "") +
      '<div class="shopping-item__meta">' + escapeHtml(usado) + "</div>" +
      '<div class="shopping-item__buy">' + escapeHtml(t("ui.comprar")) + ": " + x.packs + " &times; " +
        escapeHtml(t("ui.envase")) + envase + "</div>" +
      _botonQuitarProducto(x) +
    "</div>" +
    '<div class="shopping-item__price">' + (x.price === null ? "" : "&euro;" + round2(x.cost)) + "</div>" +
  "</li>";
}

/** Las filas con las marcas de este dispositivo: lo cogido, abajo (como en la otra lista). */
function _pintarFilasSinCocinar() {
  if (!_compra.lista) return;
  var items = _compraItems;
  var hayMarcas = _hayMarcasSinCocinar();
  var marcas = {};
  if (hayMarcas) {
    marcas = guardarMarcasCompra(leerMarcasCompra(SHOPPING_CHECKS_NOCOOK_KEY), items.map(claveDeArticulo), SHOPPING_CHECKS_NOCOOK_KEY);
    if (typeof ordenarPorMarca === "function") items = ordenarPorMarca(items, marcas);
  }
  // Sin js/core/shopping-checks.js la lista se pinta igual, sin casillas vivas.
  _compra.lista.innerHTML = items.map(function (x) {
    return _noCookCompraFilaHtml(x, hayMarcas && marcas[claveDeArticulo(x)] === true);
  }).join("");
}

function _alTocarFilaDeCompra(ev) {
  if (!_hayMarcasSinCocinar()) return;
  if (ev.target.closest && ev.target.closest("a, [data-action=\"quitar-producto\"]")) return;
  var fila = ev.target.closest ? ev.target.closest(".shopping-item") : null;
  if (!fila || !fila.getAttribute("data-clave")) return;
  var clave = fila.getAttribute("data-clave");
  alternarMarcaCompra(clave, _compraItems.map(claveDeArticulo), SHOPPING_CHECKS_NOCOOK_KEY);
  _pintarFilasSinCocinar();
  // El foco vuelve a la casilla de ESA fila, que tras reordenar está en otro sitio.
  var nueva = Array.prototype.find.call(_compra.lista.querySelectorAll(".shopping-item"), function (li) {
    return li.getAttribute("data-clave") === clave;
  });
  if (nueva && ev.detail === 0) {
    var casilla = nueva.querySelector(".shopping-item__check");
    if (casilla) casilla.focus();
  }
}

/**
 * Pinta la compra de los días que haya en pantalla, o esconde el panel si no
 * hay ninguno. La cifra que manda es el ticket de todos los días; con varios,
 * también lo que sale por día, que es lo que enseña el ahorro.
 */
function renderNoCookShoppingList(dias) {
  if (!_compra.panel || !_compra.lista) return;
  _compraItems = noCookCompraItems(dias);
  if (!_compraItems.length) {
    _compra.panel.hidden = true;
    _compra.lista.innerHTML = "";
    return;
  }
  _compra.panel.hidden = false;
  var n = dias.length;
  var total = _compraItems.reduce(function (s, x) { return s + x.cost; }, 0);
  var consumo = dias.reduce(function (s, plan) { return s + (plan.consumedCost || 0); }, 0);
  if (_compra.cuenta) _compra.cuenta.textContent = _compraItems.length;
  if (_compra.resumen) {
    _compra.resumen.innerHTML =
      '<div class="shopping-summary__stat"><span>' + escapeHtml(t("ui.productos_etiqueta")) + "</span><strong>" + _compraItems.length + "</strong></div>" +
      '<div class="shopping-summary__stat"><span>' + escapeHtml(t("ui.coste_de_compra")) +
        (1 < n ? " (" + n + " " + escapeHtml(t("ui.dias")) + ")" : "") + "</span><strong>&euro;" + round2(total) + "</strong></div>" +
      (1 < n ? '<div class="shopping-summary__stat"><span>' + escapeHtml(t("ui.por_dia_etiqueta")) + "</span><strong>&euro;" + round2(total / n) + "</strong></div>" : "") +
      '<div class="shopping-summary__stat shopping-summary__stat--muted"><span>' + escapeHtml(t("ui.coste_de_uso")) + "</span><strong>&euro;" + round2(consumo) + "</strong></div>";
  }
  if (_compra.ojo) {
    // Con varios días el texto lleva la cifra: sin `data-i18n`, o el barrido
    // del cambio de idioma lo dejaría con «{n}» a la vista.
    if (1 < n) {
      _compra.ojo.removeAttribute("data-i18n");
      _compra.ojo.textContent = t("ui.cantidades_para_n_dias_del_mismo_plan").replace("{n}", n);
    } else {
      _compra.ojo.setAttribute("data-i18n", "ui.todo_lo_que_necesitas_comprar_para_el_plan_d");
      _compra.ojo.textContent = t("ui.todo_lo_que_necesitas_comprar_para_el_plan_d");
    }
  }
  _pintarFilasSinCocinar();
}

/** El aviso de «plan guardado» de esta lista (js/app.js lo rellena al confirmar con renderPlanSavedNotice). */
function noCookAvisoGuardado() { return _compra.aviso || null; }

function _ocultarAvisoGuardado() {
  if (!_compra.aviso) return;
  _compra.aviso.hidden = true;
  _compra.aviso.innerHTML = "";
}

/**
 * Genera un plan "sin cocinar" nuevo y lo pinta. Pensado para colgarse
 * directamente del listener del botón "Sin cocinar".
 * @param {string} [storeId] - tienda activa (2026-08-24, selector de
 *   tienda) -- por defecto DEFAULT_STORE_ID dentro de
 *   generateNoCookPlan()/getNoCookEligiblePool() si se omite.
 */
function runNoCookGenerator(storeId, options, dias) {
  if (!noCookResults || typeof generateNoCookPlan !== "function") return;

  var planes = (typeof generateNoCookPlanDays === "function")
    ? generateNoCookPlanDays(storeId, options, dias)
    : [generateNoCookPlan(storeId, options)];
  lastNoCookStore = storeId || null;
  lastNoCookOptions = options || null;

  // Mismo cálculo de horario que el plan normal (js/core/meal-schedule.js)
  // — reutilizado, no reimplementado. Aislado con su propio try/catch (en
  // vez de depender solo del safeInit de app.js que envuelve a esta
  // función entera) para que un fallo aquí solo deje el plan sin horario,
  // nunca sin platos.
  if (typeof computeMealSchedule === "function" && typeof readScheduleSettings === "function") {
    planes.forEach(function (plan) {
      try {
        plan.slots = computeMealSchedule(plan.slots, readScheduleSettings());
      } catch (err) {
        console.error("[render-no-cook:schedule] no se pudo calcular el horario -- se muestra sin horario:", err);
      }
    });
  }

  if (noCookCount) noCookCount.textContent = planes[0].poolSize;
  if (noCookStatus) noCookStatus.textContent = t("ui.nocook_plan_generado");
  // Un plan nuevo todavía no está confirmado: fuera el aviso del anterior.
  _ocultarAvisoGuardado();

  paintNoCookDays(planes);
  _guardarPlanSinCocinar();
}

/** Guarda en este dispositivo lo que hay en pantalla (js/core/plan-store.js). Nunca lanza. */
function _guardarPlanSinCocinar() {
  if (!lastNoCookDays || typeof planSinCocinarGuardar !== "function" || typeof planAlmacen !== "function") return;
  planSinCocinarGuardar(planAlmacen(), { dias: lastNoCookDays, store: lastNoCookStore, options: lastNoCookOptions });
}

/**
 * Al cargar la página, vuelve a pintar el último plan sin cocinar guardado en
 * este dispositivo. NO genera nada. Los totales se recalculan de los
 * productos (lo guardado se trata como si viniera de fuera).
 * @returns {number} cuántos días se pintaron (0 si no había nada)
 */
function restaurarPlanSinCocinar() {
  if (!noCookResults || typeof planSinCocinarLeer !== "function" || typeof planAlmacen !== "function") return 0;
  var guardado = planSinCocinarLeer(planAlmacen());
  if (!guardado) return 0;
  recomputeNoCookDias(guardado.dias);
  lastNoCookStore = guardado.store;
  lastNoCookOptions = guardado.options;
  if (noCookCount && typeof guardado.dias[0].poolSize === "number") noCookCount.textContent = guardado.dias[0].poolSize;
  paintNoCookDays(guardado.dias);
  return guardado.dias.length;
}

/** «Resetear»: fuera de la pantalla y de este dispositivo. */
function clearNoCookPlan() {
  if (noCookResults) {
    noCookResults.innerHTML = "";
    noCookResults.classList.remove("days-carousel__track--multi");
  }
  if (noCookStatus) noCookStatus.textContent = "";
  renderNoCookShoppingList([]);
  _ocultarAvisoGuardado();
  lastNoCookDays = null;
  lastNoCookPlan = null;
  lastNoCookSlots = null;
  lastNoCookOptions = null;
  lastNoCookStore = null;
  if (typeof planSinCocinarBorrar === "function" && typeof planAlmacen === "function") planSinCocinarBorrar(planAlmacen());
}

/**
 * Pinta los días del plan. Con uno, como siempre (resumen y tomas en la
 * rejilla del panel); con varios, una diapositiva por día en el carrusel, con
 * la misma cabecera «Día 2 de 3» que el plan normal. Cada toma lleva su día
 * para que «Cambiar» sepa cuál re-tirar.
 */
function paintNoCookDays(dias) {
  if (!noCookResults || !Array.isArray(dias) || !dias.length) return;
  var multi = dias.length > 1;
  // innerHTML deja `scrollLeft` en 0: sin guardarlo, cambiar una toma del día
  // 3 te devolvía al día 1 (lo mismo que pasaba en el plan normal).
  var desplazado = noCookResults.scrollLeft;
  // Lo que sobra de la compra y ningún día come (2026-10-27): cada día dice
  // lo que de eso se puede comer ese día (_noCookSobrasHtml).
  var lotes = (typeof noCookCuentas === "function") ? noCookCuentas(dias).lotes : [];
  // La toma que toca ahora, abierta; las demás, plegadas (render.js, 2026-10-28).
  var ahora = new Date();
  var abiertas = (typeof tomasQueSalenAbiertas === "function")
    ? tomasQueSalenAbiertas(dias, ahora.getHours() * 60 + ahora.getMinutes(), "slots") : null;
  if (typeof tomasEmpezarPlan === "function") tomasEmpezarPlan("sincocinar", dias[0].slots);
  noCookResults.classList.toggle("days-carousel__track--multi", multi);
  noCookResults.innerHTML = multi
    ? dias.map(function (plan, i) {
        var cabeza = typeof renderDaySlideHead === "function" ? renderDaySlideHead(i, dias.length) : "";
        return '<section class="day-slide" data-day="' + i + '">' + cabeza +
          '<div class="nocook-dia">' + _noCookDiaHtml(plan, i, lotes, abiertas) + "</div></section>";
      }).join("")
    : _noCookDiaHtml(dias[0], 0, lotes, abiertas);
  if (multi) noCookResults.scrollLeft = desplazado;
  lastNoCookDays = dias;
  lastNoCookPlan = dias[0];
  lastNoCookSlots = dias[0].slots;
  renderNoCookShoppingList(dias);
}

/**
 * Un día: resumen, avisos y tomas.
 *
 * El aviso de alérgenos se arma aquí (y no en runNoCookGenerator) porque
 * también hay que re-pintarlo al cambiar una sola toma.
 */
function _noCookDiaHtml(plan, dayIndex, lotes, abiertas) {
  var allergenNote = (typeof renderAllergenLine === "function")
    ? '<p class="nocook-disclaimer">' + t("html.nocook_aviso_alergenos") + "</p>"
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
    ? '<p class="nocook-disclaimer">' + tFormat("html.nocook_aviso_aproximado", {
        marca: '<span class="nutrition-approx">' + escapeHtml(t("ui.sin_verificar_tilde")) + "</span>"
      }) + "</p>"
    : "";

  return renderNoCookSummary(plan) + _noCookSobrasHtml(lotes, dayIndex) + allergenNote + aproxNote +
    plan.slots.map(function (slot, s) {
      var porDefecto = !abiertas || abiertas[dayIndex] === s;
      var abierta = (typeof tomaAbierta === "function")
        ? tomaAbierta(claveDeToma("sincocinar", dayIndex, slot.key), porDefecto) : true;
      return renderNoCookSlot(slot, dayIndex, abierta);
    }).join("");
}

/**
 * «Si no te llenas…» (2026-10-27, pedido del dueño): lo que sobra de la
 * compra, ningún día del menú va a comer y se puede comer ESTE día (los
 * `lotes` de noCookCuentas, con la misma regla que el motor:
 * noCookLoteSirve). Es lo que queda después de rellenar los días cortos
 * (no-cook-generator.js, _rellenarConSobras), así que sale sobre todo cuando
 * las calorías ya cuadran. Lo que se unta, solo si también sobra algo donde
 * untarlo: un tarro de margarina no se come solo.
 * @param {object[]} lotes
 * @param {number} dia
 * @returns {string} HTML, o "" si no sobra nada que comer
 */
function _noCookSobrasHtml(lotes, dia) {
  var hoy = (lotes || []).filter(function (l) {
    if (!l || !l.item) return false;
    return (typeof noCookLoteSirve === "function")
      ? noCookLoteSirve(l, dia)
      : (l.desde <= dia && dia <= l.hasta && l.sobra >= 1);
  });
  var hayBase = hoy.some(function (l) { return l.item.role === "carrier"; });
  hoy = hoy.filter(function (l) { return l.item.role !== "untable" || hayBase; });
  if (!hoy.length) return "";
  // Una pista, no un inventario: lo que más llena primero, y del resto solo
  // cuántos son (todo está en la despensa).
  function kcalQueSobra(l) { return l.sobra * (l.item.kcal || 0) / (l.item.servings || 1); }
  hoy.sort(function (a, b) { return kcalQueSobra(b) - kcalQueSobra(a); });
  var resto = hoy.length - SOBRAS_EN_LA_PISTA;
  // El nombre es el de la estantería (como en las tomas): va en su propio
  // <span>, que es lo que sabe saltarse la comprobación de idioma.
  var lista = hoy.slice(0, SOBRAS_EN_LA_PISTA).map(function (l) {
    return '<span class="nocook-sobras__producto">' + escapeHtml(_nombreProductoLeido(l.item.name)) + "</span> — " +
      escapeHtml(_cantidadQueSobra(l));
  }).join("; ") + (0 < resto ? " " + escapeHtml(tFormat("ui.sobras_y_mas", { n: resto })) : "");
  return '<p class="nocook-disclaimer nocook-sobras">' +
    tFormat("html.si_no_te_llenas", { lista: lista }) + "</p>";
}

// Cuántos productos nombra «si no te llenas» (_noCookSobrasHtml).
var SOBRAS_EN_LA_PISTA = 4;

// Unidades que nombran el ENVASE. Cuando un envase trae varias raciones, la
// ración no es una lata («Piña en su jugo»: una lata de 681 g son 5 raciones
// de 120 g), así que lo que sobra se dice en gramos: «4 latas» serían 480 g.
var UNIDADES_DE_ENVASE = ["lata", "tarrina", "bolsa"];

/** Lo que sobra de un lote, en la unidad de consumo o, si esa unidad engaña, en gramos. */
function _cantidadQueSobra(l) {
  var it = l.item;
  if (UNIDADES_DE_ENVASE.indexOf(it.unit) !== -1 && 1 < (it.servingsPerPackage || 1) && it.servingG) {
    return fmtUnit(Math.round(l.sobra * it.servingG), "g");
  }
  var n = Math.floor(l.sobra + 1e-9);
  return n + " " + noCookUnitLabel(it.unit, n);
}

/** Lo que sobra de los días de antes del `d`, para que «Cambiar» lo aproveche gratis. */
function _heredadoDelDia(dias, d) {
  if (typeof noCookCuentas !== "function" || !(d > 0)) return null;
  return noCookCuentas(dias.slice(0, d)).siguiente;
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
  var dayIndex = Number(btn.dataset.day) || 0;
  var plan = lastNoCookDays && lastNoCookDays[dayIndex];
  if (!slotKey || !plan || typeof regenerateNoCookSlot !== "function") return;

  btn.disabled = true;
  // La misma regla que al generar: lo «de la noche antes» solo en el día 2+.
  var opciones = {};
  var base = lastNoCookOptions || {};
  for (var k in base) opciones[k] = base[k];
  opciones.allowMakeAhead = lastNoCookDays.length > 1 && dayIndex > 0;
  opciones.heredado = _heredadoDelDia(lastNoCookDays, dayIndex);
  var res = regenerateNoCookSlot(plan, slotKey, lastNoCookStore, opciones);
  if (!res || res.error || !res.slot) {
    btn.disabled = false;
    btn.textContent = t("ui.sin_mas_opciones");
    setTimeout(function () { btn.innerHTML = "&#8635; " + escapeHtml(t("ui.cambiar")); }, 1600);
    return;
  }

  var idx = -1;
  for (var i = 0; i < plan.slots.length; i++) {
    if (plan.slots[i].key === slotKey) idx = i;
  }
  if (idx === -1) { btn.disabled = false; return; }
  plan.slots[idx] = res.slot;

  // Totales y coste del día cambian con la toma: se recalculan enteros en
  // vez de parchear la tarjeta, que es como se cuelan las cifras viejas. Y
  // los de los días siguientes también: lo que sobra de este día es suyo.
  recomputeNoCookDias(lastNoCookDays);
  paintNoCookDays(lastNoCookDays);
  _guardarPlanSinCocinar();
}

/**
 * Totales de todos los días y el ticket de cada uno con la cuenta día a día
 * del motor (noCookAplicarCuentas, 2026-10-27): lo heredado de otro día ya
 * está pagado. Muta los planes.
 * @param {object[]} dias
 */
function recomputeNoCookDias(dias) {
  (dias || []).forEach(recomputeNoCookPlanTotals);
  if (typeof noCookAplicarCuentas === "function") noCookAplicarCuentas(dias || []);
}

/** Recalcula totales, coste y avisos del día tras editar una toma. */
function recomputeNoCookPlanTotals(plan) {
  var total = { kcal: 0, protein: 0, carbs: 0, fat: 0 };
  var consumed = 0;

  plan.slots.forEach(function (slot) {
    slot.items.forEach(function (it) {
      total.kcal += it.kcal || 0; total.protein += it.protein || 0;
      total.carbs += it.carbs || 0; total.fat += it.fat || 0;
      if (typeof costForGrams === "function" && typeof it.price === "number" && it.grams) {
        consumed += costForGrams({ price: it.price, size: it.size, sizeUnit: it.sizeUnit }, it.grams);
      }
    });
  });

  // El ticket del día con la misma cuenta que la lista de la compra de
  // todos los días (noCookCompraItems): nunca dos cálculos que puedan divergir.
  var compra = noCookCompraItems([plan]);
  var shopping = compra.reduce(function (s, x) { return s + x.cost; }, 0);
  var count = compra.length;

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
  // `total` y no `t`: la `t` de siempre es la función de traducción.
  var total = plan.total;
  var target = plan.target || {};

  var de = escapeHtml(t("ui.de_contador"));
  var objetivo = function (valor) {
    return ' <span class="nocook-summary__target">' + de + " " + valor + "</span>";
  };

  var kcalLine = escapeHtml(fmtUnit(round0(total.kcal), "kcal"))
    + (target.kcal ? objetivo(round0(target.kcal)) : "");

  var proteinLine = escapeHtml(tFormat("ui.nocook_proteina_linea", { cantidad: fmtUnit(round0(total.protein), "g") }))
    + (target.protein ? objetivo(round0(target.protein)) : "");

  // La cifra que manda es el TICKET: es lo que se paga hoy en caja y es lo
  // que el presupuesto limita. Lo consumido va detrás, como referencia.
  var costLine = tFormat("html.nocook_compra_linea", {
    compra: round2(plan.shoppingCost || 0),
    presupuesto: plan.budget ? objetivo(round2(plan.budget)) : "",
    n: plan.productCount,
    consumo: round2(plan.consumedCost || 0)
  });

  var stats =
    '<div class="nocook-summary__row"><strong>' + kcalLine + "</strong></div>" +
    '<div class="nocook-summary__row">' + proteinLine + "</div>" +
    '<div class="nocook-summary__row">' + costLine + "</div>";

  if (plan.threeMealDay) {
    stats += '<div class="nocook-summary__row nocook-summary__note">' + t("html.nocook_tres_tomas") + "</div>";
  }

  var warn = "";

  // Pasarse del presupuesto solo ocurre cuando ni el envase más barato de
  // un papel obligatorio cabía. Se dice con la cifra exacta.
  if (plan.budgetOverrun > 0) {
    // No sugerir "pon la prioridad en barato" si YA está en barato: es el
    // consejo inútil clásico y hace que el aviso parezca automático.
    var advice = (plan.priority === "cheap")
      ? t("ui.nocook_consejo_barato")
      : t("ui.nocook_consejo_subir");
    warn += '<p class="nocook-summary__warn">' + tFormat("html.nocook_se_pasa", {
      exceso: round2(plan.budgetOverrun),
      consejo: escapeHtml(advice)
    }) + "</p>";
  }

  if (target.protein && total.protein < target.protein * 0.85) {
    warn += '<p class="nocook-summary__warn">' + escapeHtml(tFormat("ui.nocook_proteina_corta", {
      obtenida: fmtUnit(round0(total.protein), "g"),
      objetivo: fmtUnit(round0(target.protein), "g"),
      barato: plan.priority === "cheap" ? t("ui.nocook_proteina_corta_barato") : ""
    })) + "</p>";
  }

  return '<div class="nocook-summary">' + stats + warn + "</div>";
}

/**
 * Genera el HTML de una toma completa (Desayuno/Comida/Snack/Cena).
 * @param {{key:string, label:string, items:object[]}} slot
 * @param {number} [dayIndex]
 * @param {boolean} [abierta] - false la pinta plegada (cabecera y flecha); sin
 *   decir nada, abierta, como siempre
 * @returns {string}
 */
function renderNoCookSlot(slot, dayIndex, abierta) {
  var timeBadge = typeof renderMealTimeBadge === "function" ? renderMealTimeBadge(slot) : "";

  // Nombre de la plantilla ("Wrap", "Plato preparado"): dice de un vistazo
  // QUÉ es la comida, no solo qué productos la componen.
  // El español de la plantilla vive junto a ella (no-cook-templates.js); la
  // traducción, en nocook.<clave>_nombre / _montaje. `tOr` devuelve el español
  // cuando el idioma no tiene la suya.
  var kind = slot.templateLabel
    ? '<span class="nocook-slot__kind">' +
      escapeHtml(tOr("nocook." + slot.templateKey + "_nombre", slot.templateLabel)) + "</span>" : "";

  // La cifra con su unidad en un <span class="u">, pegada, para que el tema
  // la haga más pequeña que el número (ver fmtUnitHtml en i18n.js).
  var kcal = (slot.total && slot.total.kcal)
    ? '<span class="nocook-slot__kcal">' + fmtUnitHtml(round0(slot.total.kcal), "kcal") + "</span>" : "";

  var swapBtn = '<button type="button" class="meal-swap-btn" data-action="swap-nocook-slot"' +
    ' data-slot-key="' + escapeHtml(slot.key || "") + '" data-day="' + (Number(dayIndex) || 0) + '"' +
    ' title="' + escapeHtml(t("ui.cambiar_solo_esta_toma_producto_no_en_tu_tienda")) + '">' +
    "&#8635; " + escapeHtml(t("ui.cambiar")) + "</button>";

  // Aviso "de la noche antes" (plantillas makeAhead: avena remojada). Mismo
  // trato que en el modo cocinado -- solo puede salir en el día 2+ de un
  // plan de varios días.
  var makeAheadNote = (slot.makeAhead && typeof renderMakeAheadNote === "function")
    ? renderMakeAheadNote() : "";

  // Cómo se monta, en una línea. Es la diferencia entre una lista de la
  // compra y una comida: el usuario pidió "haz un sándwich y vete".
  var assembly = slot.assembly
    ? '<p class="nocook-slot__assembly">' +
      escapeHtml(tOr("nocook." + slot.templateKey + "_montaje", slot.assembly)) + "</p>" : "";

  // Plegada, solo la cabecera; la flecha (render.js) abre el resto.
  var abiertaYa = abierta !== false;
  var titulo = tMeal(slot.key, slot.label);
  var cuerpo = "toma-s-" + (Number(dayIndex) || 0) + "-" + (slot.key || "");
  var flecha = (typeof renderBotonToma === "function") ? renderBotonToma(abiertaYa, titulo, cuerpo) : "";
  var clave = (typeof claveDeToma === "function") ? claveDeToma("sincocinar", dayIndex, slot.key) : "";

  return (
    '<div class="nocook-slot' + (abiertaYa ? "" : " is-plegada") + '"' +
      (clave ? ' data-toma-clave="' + escapeHtml(clave) + '"' : "") + ">" +
      '<div class="nocook-slot__head">' + timeBadge + "<h3>" + escapeHtml(titulo) + "</h3>" +
        kind + kcal + swapBtn + flecha +
      "</div>" +
      '<div class="nocook-slot__body" id="' + escapeHtml(cuerpo) + '">' +
        makeAheadNote +
        assembly +
        '<div class="nocook-items">' +
          slot.items.map(renderNoCookItem).join("") +
        "</div>" +
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
 * La unidad de consumo ("porción", "unidad", "taza"…) en singular o plural
 * según cuántas sean, en el idioma de ahora. Las tablas de envases
 * (packages-*.js) traen las formas de cada idioma -- en ruso son cuatro --; el
 * español no las necesita y sigue con su propio plural (`pluralizeUnit`).
 */
function noCookUnitLabel(unit, count) {
  var nombre = unit || "ración";
  var traducida = (typeof tPackageLabel === "function") ? tPackageLabel(nombre, count) : null;
  return traducida || pluralizeUnit(nombre, count);
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
      escapeHtml(noCookLevelLabel(item.level)) +
    "</span>";

  var packageLine = item.size != null && item.sizeUnit
    ? escapeHtml(tFormat("ui.nocook_envase", {
        tamano: item.size + t("unit.sep_pegada") + tPackageUnit(item.sizeUnit)
      })) + (item.price != null ? " &mdash; &euro;" + round2(item.price) : "")
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
        escapeHtml(fmtUnit(round0(item.kcal), "kcal")) + " &mdash; " +
        escapeHtml(t("ui.abrev_proteina")) + " " + escapeHtml(fmtUnitJunto(round1(item.protein), "g")) + " / " +
        escapeHtml(t("ui.abrev_carbos")) + " " + escapeHtml(fmtUnitJunto(round1(item.carbs), "g")) + " / " +
        escapeHtml(t("ui.abrev_grasas")) + " " + escapeHtml(fmtUnitJunto(round1(item.fat), "g")) +
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
  var qtyText = servings + " " + escapeHtml(noCookUnitLabel(item.unit, servings));
  if (typeof item.grams === "number") {
    qtyText += ' <span class="nocook-item__grams">&middot; ' + escapeHtml(fmtUnit(item.grams, "g")) + "</span>";
  }

  // "Envase entero": para la pizza y compañía, avisa de que esa toma se
  // acaba el paquete. Es lo que el usuario pidió explícitamente en vez de
  // ir dejando medias raciones sueltas.
  var wholeBadge = item.wholePackage && item.policy === "fresh"
    ? '<span class="nocook-item__whole">' + escapeHtml(t("ui.nocook_envase_entero")) + "</span>" : "";

  // Raciones puestas para rellenar un día corto con lo que sobra de otro
  // (2026-10-27, no-cook-generator.js): se dice para que no parezca un error.
  var sobrasBadge = item.deSobras
    ? '<span class="nocook-item__whole nocook-item__sobras">' +
      escapeHtml(tFormat("ui.nocook_de_sobras", { n: item.deSobras })) + "</span>" : "";

  return (
    '<div class="nocook-item">' +
      levelBadge + wholeBadge + sobrasBadge +
      '<div class="nocook-item__name">' + escapeHtml(_nombreProductoDoble(item.name)) + findBtn + "</div>" +
      (item.brand ? '<div class="nocook-item__brand">' + escapeHtml(item.brand) + "</div>" : "") +
      '<div class="nocook-item__qty">' + qtyText + "</div>" +
      macrosLine +
      '<div class="nocook-item__package">' + packageLine + "</div>" +
      allergenLine +
      _botonQuitarProducto(item) +
    "</div>"
  );
}
