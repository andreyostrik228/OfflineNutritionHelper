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
 * El recorrido guiado ilumina elementos de TODAS las secciones: mientras
 * está abierto, el CSS enseña la página entera (ver `:has(#tour...)`).
 *
 * Mejora progresiva: sin este fichero la página se ve entera, como antes.
 *
 * Expone (globales):
 *   initPestanas()
 *   activarPestana(id)
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
  ["#verifiedPanel", "compra"],
  ["#todayPlansPanel", "planes"]
];

var _pestanaMain = null;
var _pestanaBarra = null;
var _esperandoPlan = false;
var _esperandoSinCocinar = false;

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

  // Tras generar, a la pestaña del menú: el usuario pulsa "Generar plan"
  // en "Mis datos" y quiere ver el resultado, no el formulario otra vez.
  var form = document.getElementById("plannerForm");
  if (form) form.addEventListener("submit", function () { _esperandoPlan = true; }, true);
  var sinCocinar = document.getElementById("noCookBtn");
  if (sinCocinar) sinCocinar.addEventListener("click", function () { _esperandoSinCocinar = true; }, true);

  _observar("mealsContainer", function (el) {
    if (_esperandoPlan && el.querySelector(".meal-card:not(.meal-card--empty)")) {
      _esperandoPlan = false;
      activarPestana("menu");
    }
    _pintarResumenDeDatos();
  });
  _observar("noCookResults", function (el) {
    if (_esperandoSinCocinar && el.children.length) {
      _esperandoSinCocinar = false;
      activarPestana("menu");
      var panel = document.getElementById("noCookPanel");
      if (panel) setTimeout(function () { panel.scrollIntoView({ block: "start" }); }, 60);
    }
  });
  _observar("shoppingListContainer", _pintarCuentaDeCompra, true);

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

function _observar(id, fn, conAtributos) {
  var el = document.getElementById(id);
  if (!el || typeof MutationObserver !== "function") return;
  new MutationObserver(function () { fn(el); }).observe(el, {
    childList: true, subtree: !!conAtributos, attributes: !!conAtributos, attributeFilter: conAtributos ? ["class"] : undefined
  });
}

/** El número de la pestaña "Compra": lo que falta por coger. */
function _pintarCuentaDeCompra() {
  if (!_pestanaBarra) return;
  var cuenta = _pestanaBarra.querySelector(".tabbar__cuenta");
  if (!cuenta) return;
  var panel = document.getElementById("shoppingPanel");
  var faltan = (panel && !panel.hidden)
    ? document.querySelectorAll("#shoppingListContainer .shopping-item:not(.is-comprado)").length
    : 0;
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
  if (peso) partes.push(peso + " kg");
  var objetivo = _textoOpcion("goal");
  if (objetivo) partes.push(objetivo);
  var presupuesto = document.querySelector(".visually-hidden:checked + .budget-chip");
  if (presupuesto) {
    var importe = presupuesto.querySelector(".budget-chip__amount");
    partes.push(importe ? importe.textContent.trim() : presupuesto.textContent.trim());
  }
  var dias = document.querySelector("#planDays .is-active, #planDays [aria-pressed=\"true\"]");
  if (dias) partes.push(dias.textContent.trim());
  texto.textContent = partes.join(" · ");
}
