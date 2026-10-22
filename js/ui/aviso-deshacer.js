/**
 * js/ui/aviso-deshacer.js
 * ─────────────────────────────────────────────────────────────────────────
 * Un aviso abajo con «Deshacer» (2026-10-22). Lo usa «No me gusta» del plan
 * y de la lista de la compra: quitar un producto cambia comidas al momento,
 * así que tiene que poder volverse atrás de un toque si fue sin querer.
 *
 * Se crea la primera vez que hace falta y lo esconde y lo enseña este mismo
 * fichero (quien esconde, desesconde). Se va solo a los 8 s.
 *
 * Expone (globales):
 *   mostrarAvisoDeshacer(texto, alDeshacer)  sin función, el aviso va sin botón
 *   ocultarAvisoDeshacer()
 * ─────────────────────────────────────────────────────────────────────────
 */

var AVISO_DESHACER_MS = 8000;
var _avisoCajaEl = null;
var _avisoTemporizador = null;
var _avisoAccion = null;

function _avisoCaja() {
  if (_avisoCajaEl) return _avisoCajaEl;
  var caja = document.createElement("div");
  caja.className = "aviso-deshacer";
  caja.setAttribute("role", "status");
  caja.setAttribute("aria-live", "polite");
  caja.hidden = true;
  var texto = document.createElement("p");
  texto.className = "aviso-deshacer__texto";
  var boton = document.createElement("button");
  boton.type = "button";
  boton.className = "aviso-deshacer__boton";
  boton.addEventListener("click", function () {
    var accion = _avisoAccion;
    ocultarAvisoDeshacer();
    if (accion) accion();
  });
  caja.appendChild(texto);
  caja.appendChild(boton);
  document.body.appendChild(caja);
  _avisoCajaEl = caja;
  return caja;
}

/**
 * @param {string} texto
 * @param {function} [alDeshacer] - lo que hace «Deshacer»; sin ella, solo el texto
 */
function mostrarAvisoDeshacer(texto, alDeshacer) {
  if (typeof document === "undefined" || !document.body) return;
  var caja = _avisoCaja();
  caja.querySelector(".aviso-deshacer__texto").textContent = texto;
  var boton = caja.querySelector(".aviso-deshacer__boton");
  boton.textContent = t("ui.deshacer");
  boton.hidden = typeof alDeshacer !== "function";
  _avisoAccion = typeof alDeshacer === "function" ? alDeshacer : null;
  caja.hidden = false;
  if (_avisoTemporizador) clearTimeout(_avisoTemporizador);
  _avisoTemporizador = setTimeout(ocultarAvisoDeshacer, AVISO_DESHACER_MS);
}

function ocultarAvisoDeshacer() {
  if (_avisoTemporizador) clearTimeout(_avisoTemporizador);
  _avisoTemporizador = null;
  _avisoAccion = null;
  if (_avisoCajaEl) _avisoCajaEl.hidden = true;
}
