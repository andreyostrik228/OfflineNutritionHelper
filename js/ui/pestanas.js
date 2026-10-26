/**
 * js/ui/pestanas.js
 * ─────────────────────────────────────────────────────────────────────────
 * Barra de pestañas abajo, en el móvil (2026-09-28).
 *
 * Por qué: con un plan generado la página medía 9.486 px en un móvil de
 * 390 — once pantallas de formulario, plan, compra, planes, "sin cocinar"
 * y catálogo, una detrás de otra. Ahora son cuatro pestañas: Menú, Compra,
 * Mis planes y Mis datos. En el portátil (más de 900 px) no cambia nada:
 * sigue siendo una sola página a dos columnas.
 *
 * Cómo: cada sección lleva `data-pestana` y `<main>` dice cuál está
 * activa; el CSS esconde las demás SOLO en el móvil. No se usa `hidden`
 * porque la aplicación ya lo pone y lo quita en esos mismos paneles (la
 * compra se esconde si no hay productos, "sin cocinar" hasta que se genera)
 * y los dos mecanismos se pisarían.
 *
 * El recorrido guiado ilumina elementos de TODAS las secciones y, desde el
 * 2026-10-06, abre él mismo la pestaña de cada paso (activarPestana, desde
 * js/ui/tour.js): así la pantalla es corta y no hay que desplazarse tanto.
 * Antes enseñaba la página entera mientras estaba abierto.
 *
 * Mejora progresiva: sin este fichero la página se ve entera, como antes.
 *
 * Desde el 2026-10-25, con las dos listas de la compra (la del plan normal y
 * la del sin cocinar) arriba de «Compra» van dos botones y se ve una sola.
 *
 * Expone (globales):
 *   initPestanas()
 *   activarPestana(id)
 *   compraElegir(vista)   — "normal" | "sincocinar"
 * ─────────────────────────────────────────────────────────────────────────
 */

var PESTANAS = [
  { id: "menu", icono: "icon-chef", clave: "ui.pestana_menu" },
  { id: "compra", icono: "icon-cart", clave: "ui.pestana_compra" },
  { id: "planes", icono: "icon-calendar", clave: "ui.pestana_planes" },
  { id: "datos", icono: "icon-user", clave: "ui.pestana_datos" }
];

// Qué va en cada pestaña. Un elemento puede ir en varias ("datos menu").
var PESTANAS_SECCIONES = [
  [".hero", "datos"],
  [".grid > .panel:not(.panel--results)", "datos"],
  [".panel--results", "menu"],
  ["#noCookPanel", "menu"],
  ["#insightsBox", "menu"],
  ["#shoppingPanel", "compra"],
  ["#noCookShoppingPanel", "compra"],
  ["#verifiedPanel", "compra"],
  ["#todayPlansPanel", "planes"]
];

var _pestanaMain = null;
var _pestanaBarra = null;
var _esperandoPlan = false;
var _esperandoSinCocinar = false;

// Qué compra se ve cuando hay dos. Se recuerda en este dispositivo.
var COMPRA_VISTA_CLAVE = "nutritionPlanner.compraVista.v1";
var _compraVista = "normal";

function initPestanas() {
  _pestanaMain = document.querySelector("main");
  if (!_pestanaMain || _pestanaBarra) return;

  PESTANAS_SECCIONES.forEach(function (par) {
    Array.prototype.forEach.call(document.querySelectorAll(par[0]), function (el) {
      el.setAttribute("data-pestana", par[1]);
    });
  });

  _pestanaBarra = document.createElement("nav");
  _pestanaBarra.className = "tabbar";
  _pestanaBarra.setAttribute("aria-label", _tx("ui.secciones"));
  _pestanaBarra.setAttribute("data-i18n-aria-label", "ui.secciones");
  PESTANAS.forEach(function (p) {
    var b = document.createElement("button");
    b.type = "button";
    b.className = "tabbar__btn";
    b.setAttribute("data-destino", p.id);
    b.innerHTML =
      '<svg width="22" height="22" aria-hidden="true"><use href="#' + p.icono + '"/></svg>' +
      '<span class="tabbar__texto" data-i18n="' + p.clave + '">' + escapeHtml(_tx(p.clave)) + '</span>' +
      (p.id === "compra" ? '<span class="tabbar__cuenta" hidden></span>' : "");
    b.addEventListener("click", function () { activarPestana(p.id); });
    _pestanaBarra.appendChild(b);
  });
  document.body.appendChild(_pestanaBarra);
  document.body.classList.add("con-pestanas");

  _crearResumenDeDatos();
  _crearSelectorDeCompra();
  _crearSelectorDeMenu();

  // Tras generar, a la pestaña del menú: el usuario pulsa "Generar plan"
  // en "Mis datos" y quiere ver el resultado, no el formulario otra vez.
  var form = document.getElementById("plannerForm");
  if (form) form.addEventListener("submit", function () { _esperandoPlan = true; }, true);
  var sinCocinar = document.getElementById("noCookBtn");
  if (sinCocinar) sinCocinar.addEventListener("click", function () { _esperandoSinCocinar = true; }, true);

  _observar("mealsContainer", function (el) {
    if (_esperandoPlan && el.querySelector(".meal-card:not(.meal-card--empty)")) {
      _esperandoPlan = false;
      // El plan que se acaba de hacer es el que se va a comprar.
      compraElegir("normal");
      activarPestana("menu");
    }
    _pintarResumenDeDatos();
    _pintarSelectorDeMenu();
  });
  _observar("noCookResults", function (el) {
    if (_esperandoSinCocinar && el.children.length) {
      _esperandoSinCocinar = false;
      compraElegir("sincocinar");
      activarPestana("menu");
      // Arriba del todo, con los botones del menú a la vista (2026-10-26):
      // el plan sin cocinar ya es lo primero que se ve.
      var panel = document.getElementById("menuSelector") || document.getElementById("noCookPanel");
      if (panel) setTimeout(function () { panel.scrollIntoView({ block: "start" }); }, 60);
    }
    _pintarSelectorDeMenu();
  });
  _observar("shoppingListContainer", _pintarCuentaDeCompra, true);
  _observar("noCookShoppingList", _pintarCuentaDeCompra, true);

  // La barra "siguiente toma" lleva a una tarjeta del menú: si estás en
  // otra pestaña, primero se cambia (en captura, antes que su manejador).
  var siguiente = document.getElementById("nextMealSticky");
  if (siguiente) siguiente.addEventListener("click", function () {
    if (_pestanaMain.getAttribute("data-pestana") !== "menu") activarPestana("menu", true);
  }, true);

  // La tarjeta vacía ("Esperando parámetros") también es .meal-card.
  var hayPlan = document.querySelector("#mealsContainer .meal-card:not(.meal-card--empty)");
  activarPestana(hayPlan ? "menu" : "datos", true);
  _pintarCuentaDeCompra();
}

function activarPestana(id, sinDesplazar) {
  if (!_pestanaMain || !_pestanaBarra) return;
  _pestanaMain.setAttribute("data-pestana", id);
  Array.prototype.forEach.call(_pestanaBarra.querySelectorAll(".tabbar__btn"), function (b) {
    var si = b.getAttribute("data-destino") === id;
    b.classList.toggle("is-activa", si);
    if (si) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current");
  });
  if (id === "menu") _pintarResumenDeDatos();
  if (!sinDesplazar) window.scrollTo(0, 0);
}

function _tx(clave) {
  return typeof t === "function" ? t(clave) : clave;
}

// ── Qué lista de la compra se ve (2026-10-25) ────────────────────────────
// Pedido del dueño: «когда выбираешь план sin cocinar то в покупках всё
// равно первым идёт обычный план, сделай так чтобы можно было
// переключаться». Las dos listas iban una debajo de otra, la normal arriba.
// Ahora, si están las dos, arriba van «Обычный план» y «Без готовки» y se ve
// solo la elegida; con una sola no hay botones. Hacer un plan elige su lista.
// No se usa `hidden` en los paneles: lo pone y lo quita la aplicación.

var COMPRA_VISTAS = [
  { vista: "normal", panel: "shoppingPanel", clave: "ui.compra_plan_normal", icono: "icon-chef" },
  { vista: "sincocinar", panel: "noCookShoppingPanel", clave: "ui.sin_cocinar_2", icono: "icon-bolt" }
];

function _crearSelectorDeCompra() {
  var normal = document.getElementById("shoppingPanel");
  var sin = document.getElementById("noCookShoppingPanel");
  if (!normal || !sin || document.getElementById("compraSelector")) return;
  try {
    var guardada = localStorage.getItem(COMPRA_VISTA_CLAVE);
    if (guardada === "normal" || guardada === "sincocinar") _compraVista = guardada;
  } catch (e) { /* sin almacenamiento: la normal */ }

  var caja = document.createElement("div");
  caja.className = "compra-selector";
  caja.id = "compraSelector";
  caja.setAttribute("data-pestana", "compra");
  caja.setAttribute("role", "group");
  caja.setAttribute("aria-label", _tx("ui.compra_que_lista"));
  caja.setAttribute("data-i18n-aria-label", "ui.compra_que_lista");
  caja.hidden = true;
  COMPRA_VISTAS.forEach(function (v) {
    var b = document.createElement("button");
    b.type = "button";
    b.className = "compra-selector__btn";
    b.setAttribute("data-vista", v.vista);
    b.setAttribute("aria-controls", v.panel);
    b.innerHTML = '<svg width="16" height="16" aria-hidden="true"><use href="#' + v.icono + '"/></svg>' +
      '<span data-i18n="' + v.clave + '">' + escapeHtml(_tx(v.clave)) + "</span>";
    b.addEventListener("click", function () { compraElegir(v.vista); });
    caja.appendChild(b);
  });
  normal.parentNode.insertBefore(caja, normal);

  // Los paneles se esconden y aparecen solos (sin plan, al generar, al
  // resetear): los botones salen solo con los dos a la vista.
  if (typeof MutationObserver === "function") {
    var obs = new MutationObserver(_pintarSelectorDeCompra);
    obs.observe(normal, { attributes: true, attributeFilter: ["hidden"] });
    obs.observe(sin, { attributes: true, attributeFilter: ["hidden"] });
  }
  _pintarSelectorDeCompra();
}

function compraElegir(vista) {
  if (vista !== "normal" && vista !== "sincocinar") return;
  _compraVista = vista;
  try { localStorage.setItem(COMPRA_VISTA_CLAVE, vista); } catch (e) { /* no se recuerda, nada más */ }
  _pintarSelectorDeCompra();
  _pintarSelectorDeMenu();
}

function _pintarSelectorDeCompra() {
  var caja = document.getElementById("compraSelector");
  if (!caja) return;
  var paneles = COMPRA_VISTAS.map(function (v) { return document.getElementById(v.panel); });
  var dos = paneles.every(function (p) { return p && !p.hidden; });
  caja.hidden = !dos;
  COMPRA_VISTAS.forEach(function (v, i) {
    var elegida = v.vista === _compraVista;
    if (paneles[i]) paneles[i].classList.toggle("is-fuera-de-vista", dos && !elegida);
    var b = caja.querySelector('[data-vista="' + v.vista + '"]');
    if (b) {
      b.classList.toggle("is-on", elegida);
      b.setAttribute("aria-pressed", elegida ? "true" : "false");
    }
  });
  _pintarCuentaDeCompra();
}

// ── Qué plan se ve en «Menú» (2026-10-26) ─────────────────────────────
// Pedido del dueño: «когда у меня план sin cocinar, приходится листать
// сначала обычный план, а потом уже мой… сделай разделение как в покупках».
// Arriba del menú, los mismos dos botones que en «Compra» y la MISMA elección
// (_compraVista): se ve un plan o el otro. Hacer un plan lo elige. Si el
// elegido aún no existe, en su sitio «… ещё нет. Составить?» con su botón.
// Sin ningún plan, ni botones: el menú vacío de siempre.

function _crearSelectorDeMenu() {
  var resultados = document.querySelector(".panel--results");
  var sin = document.getElementById("noCookPanel");
  if (!resultados || !sin || document.getElementById("menuSelector")) return;

  var caja = document.createElement("div");
  caja.className = "compra-selector menu-selector";
  caja.id = "menuSelector";
  caja.setAttribute("role", "group");
  caja.setAttribute("aria-label", _tx("ui.menu_que_plan"));
  caja.setAttribute("data-i18n-aria-label", "ui.menu_que_plan");
  caja.hidden = true;
  COMPRA_VISTAS.forEach(function (v) {
    var b = document.createElement("button");
    b.type = "button";
    b.className = "compra-selector__btn";
    b.setAttribute("data-vista", v.vista);
    b.innerHTML = '<svg width="16" height="16" aria-hidden="true"><use href="#' + v.icono + '"/></svg>' +
      '<span data-i18n="' + v.clave + '">' + escapeHtml(_tx(v.clave)) + "</span>";
    b.addEventListener("click", function () {
      compraElegir(v.vista);
      // En el portátil se ve todo a la vez: se lleva la vista al plan elegido.
      if (window.innerWidth > 900 && v.vista === "sincocinar" && !sin.hidden) {
        sin.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
    caja.appendChild(b);
  });

  var vacio = document.createElement("div");
  vacio.className = "menu-vacio";
  vacio.id = "menuVacio";
  vacio.hidden = true;
  vacio.innerHTML = '<p class="menu-vacio__texto" id="menuVacioTexto"></p>' +
    '<button type="button" class="btn-primary menu-vacio__btn" id="menuVacioBtn"></button>';
  vacio.querySelector("button").addEventListener("click", function () {
    if (_compraVista === "sincocinar") {
      var boton = document.getElementById("noCookBtn");
      if (boton) boton.click();
      return;
    }
    var form = document.getElementById("plannerForm");
    if (!form) return;
    // Con algún dato mal, a «Mis datos» a verlo: desde el menú no se ve el campo.
    if (typeof form.checkValidity === "function" && !form.checkValidity()) {
      activarPestana("datos");
      if (typeof form.reportValidity === "function") form.reportValidity();
      return;
    }
    if (typeof form.requestSubmit === "function") form.requestSubmit();
    else form.dispatchEvent(new Event("submit", { cancelable: true }));
  });

  // Debajo del resumen de «Mis datos», que es de los dos planes.
  var resumen = document.getElementById("resumenDatos");
  var antes = (resumen && resumen.parentNode === resultados) ? resumen.nextSibling : resultados.firstChild;
  resultados.insertBefore(caja, antes);
  resultados.insertBefore(vacio, caja.nextSibling);
  if (typeof MutationObserver === "function") {
    new MutationObserver(_pintarSelectorDeMenu).observe(sin, { attributes: true, attributeFilter: ["hidden"] });
  }
  _pintarSelectorDeMenu();
}

function _pintarSelectorDeMenu() {
  var caja = document.getElementById("menuSelector");
  if (!caja) return;
  var resultados = document.querySelector(".panel--results");
  var sin = document.getElementById("noCookPanel");
  var ideas = document.getElementById("insightsBox");
  var vacio = document.getElementById("menuVacio");
  var hayNormal = !!document.querySelector("#mealsContainer .meal-card:not(.meal-card--empty)");
  var haySin = !!sin && !sin.hidden;
  var alguno = hayNormal || haySin;
  caja.hidden = !alguno;
  var vista = alguno ? _compraVista : "normal";
  var verSin = alguno && vista === "sincocinar";
  var falta = alguno && (verSin ? !haySin : !hayNormal);
  // Del panel del plan normal solo quedan el resumen de datos, los botones y
  // el aviso cuando se ve el otro plan o cuando el normal aún no existe.
  if (resultados) resultados.classList.toggle("is-solo-selector", verSin || falta);
  if (sin) sin.classList.toggle("is-fuera-de-vista", alguno && !verSin);
  if (ideas) ideas.classList.toggle("is-fuera-de-vista", verSin || falta);
  if (vacio) {
    vacio.hidden = !falta;
    if (falta) {
      document.getElementById("menuVacioTexto").textContent = _tx(verSin ? "ui.menu_sin_sincocinar" : "ui.menu_sin_normal");
      document.getElementById("menuVacioBtn").textContent = _tx(verSin ? "ui.menu_hacer_sincocinar" : "ui.menu_hacer_normal");
    }
  }
  Array.prototype.forEach.call(caja.querySelectorAll("[data-vista]"), function (b) {
    var si = b.getAttribute("data-vista") === vista;
    b.classList.toggle("is-on", si);
    b.setAttribute("aria-pressed", si ? "true" : "false");
  });
}

function _observar(id, fn, conAtributos) {
  var el = document.getElementById(id);
  if (!el || typeof MutationObserver !== "function") return;
  new MutationObserver(function () { fn(el); }).observe(el, {
    childList: true, subtree: !!conAtributos, attributes: !!conAtributos, attributeFilter: conAtributos ? ["class"] : undefined
  });
}

/**
 * El número de la pestaña "Compra": lo que falta por coger, de las dos listas
 * (la del sin cocinar, desde el 2026-10-21). Con las dos a la vez, solo la que
 * se ve (2026-10-25): un 47 sobre una lista de 22 no cuadraba.
 */
function _pintarCuentaDeCompra() {
  if (!_pestanaBarra) return;
  var cuenta = _pestanaBarra.querySelector(".tabbar__cuenta");
  if (!cuenta) return;
  var faltan = 0;
  [["shoppingPanel", "shoppingListContainer"], ["noCookShoppingPanel", "noCookShoppingList"]].forEach(function (par) {
    var panel = document.getElementById(par[0]);
    if (panel && !panel.hidden && !panel.classList.contains("is-fuera-de-vista")) faltan += document.querySelectorAll("#" + par[1] + " .shopping-item:not(.is-comprado)").length;
  });
  cuenta.textContent = faltan > 99 ? "99+" : String(faltan);
  cuenta.hidden = faltan === 0;
}

// ── Resumen de "mis datos" arriba del menú ───────────────────────────────
// En el móvil el formulario vive en su pestaña; en el menú queda una línea
// con lo que se usó para el plan y un botón para cambiarlo. Es la versión
// "plegada" del formulario que se pidió.

function _crearResumenDeDatos() {
  var resultados = document.querySelector(".panel--results");
  if (!resultados || document.getElementById("resumenDatos")) return;
  var caja = document.createElement("div");
  caja.className = "resumen-datos";
  caja.id = "resumenDatos";
  caja.innerHTML =
    '<p class="resumen-datos__texto" id="resumenDatosTexto"></p>' +
    '<button type="button" class="resumen-datos__btn">' +
      '<span data-i18n="ui.cambiar_mis_datos">' + escapeHtml(_tx("ui.cambiar_mis_datos")) + '</span></button>';
  caja.querySelector("button").addEventListener("click", function () { activarPestana("datos"); });
  resultados.insertBefore(caja, resultados.firstChild);
}

function _textoOpcion(id) {
  var s = document.getElementById(id);
  if (!s || !s.options || s.selectedIndex < 0) return "";
  return s.options[s.selectedIndex].textContent.trim();
}

function _pintarResumenDeDatos() {
  var texto = document.getElementById("resumenDatosTexto");
  if (!texto) return;
  var partes = [];
  var sexo = _textoOpcion("sex");
  var edad = (document.getElementById("age") || {}).value;
  if (sexo || edad) partes.push([sexo, edad ? _tx("ui.n_anos").replace("{n}", edad) : ""].filter(Boolean).join(", "));
  var peso = (document.getElementById("weight") || {}).value;
  if (peso) partes.push(typeof fmtUnit === "function" ? fmtUnit(peso, "kg") : peso + " kg");
  var objetivo = _textoOpcion("goal");
  if (objetivo) partes.push(objetivo);
  var presupuesto = document.querySelector(".visually-hidden:checked + .budget-chip");
  if (presupuesto) {
    var importe = presupuesto.querySelector(".budget-chip__amount");
    partes.push(importe ? importe.textContent.trim() : presupuesto.textContent.trim());
  }
  var dias = document.querySelector("#planDays .is-active, #planDays [aria-pressed=\"true\"]");
  // El botón enseña solo la cifra (2026-10-26): el texto entero va en aria-label.
  if (dias) partes.push((dias.getAttribute("aria-label") || dias.textContent).trim());
  texto.textContent = partes.join(" · ");
}
