/**
 * js/ui/render-weight.js
 * ─────────────────────────────────────────────────────────────────────────
 * Registro de peso bajo el campo «Peso (kg)» del formulario: un campo, el
 * botón «Guardar» (registra hoy) y la línea de los últimos días. La lógica
 * (lectura, reemplazo de hoy, geometría de la línea) está en
 * js/core/weight-log.js; aquí solo se pinta y se reacciona al botón.
 *
 * Expone (globales):
 *   initWeightLog()
 * ─────────────────────────────────────────────────────────────────────────
 */

var _wlEls = null;

function initWeightLog() {
  var input = document.getElementById("weightLogInput");
  var boton = document.getElementById("weightLogSaveBtn");
  if (!input || !boton) return;
  _wlEls = {
    input: input,
    boton: boton,
    msg: document.getElementById("weightLogMsg"),
    grafico: document.getElementById("weightLogChart")
  };

  // Si hoy ya hay un peso, el campo lo muestra para poder corregirlo.
  var hoy = fechaHoy(new Date());
  var deHoy = pesosLeer(pesosAlmacen()).filter(function (e) { return e.fecha === hoy; })[0];
  if (deHoy) input.value = String(deHoy.kg).replace(".", ",");

  boton.addEventListener("click", weightLogGuardar);
  // Enter en este campo enviaría el formulario del plan: aquí solo guarda el peso.
  input.addEventListener("keydown", function (ev) {
    if (ev.key === "Enter") {
      ev.preventDefault();
      weightLogGuardar();
    }
  });
  weightLogPintarGrafico();
}

function weightLogGuardar() {
  if (!_wlEls) return;
  var analisis = pesoAnalizar(_wlEls.input.value);
  if (!analisis.ok) {
    weightLogMensaje(t("ui.peso_registro_" + analisis.error), true);
    return;
  }
  var storage = pesosAlmacen();
  var lista = pesosGuardarHoy(pesosLeer(storage), analisis.kg, Date.now(), fechaHoy(new Date()));
  if (!pesosEscribir(storage, lista)) {
    weightLogMensaje(t("ui.peso_registro_sin_guardar"), true);
    return;
  }
  weightLogMensaje(t("ui.peso_registro_guardado"), false);
  weightLogPintarGrafico();
  // Con cuenta, el registro viaja a la nube (no-op sin sesión; nunca lanza).
  pushWeightLogToCloud();
}

function weightLogMensaje(texto, esError) {
  if (!_wlEls || !_wlEls.msg) return;
  _wlEls.msg.textContent = texto;
  _wlEls.msg.hidden = false;
  _wlEls.msg.classList.toggle("weight-log__msg--error", !!esError);
}

function _wlSpan(texto) {
  var s = document.createElement("span");
  s.textContent = texto;
  return s;
}

function weightLogPintarGrafico() {
  if (!_wlEls || !_wlEls.grafico) return;
  var cont = _wlEls.grafico;
  cont.textContent = "";

  var geom = pesosGrafico(pesosParaGrafico(pesosLeer(pesosAlmacen())), 320, 120);
  if (!geom) {
    var aviso = document.createElement("p");
    aviso.className = "weight-log__hint";
    aviso.textContent = t("ui.peso_registro_dos");
    cont.appendChild(aviso);
    return;
  }

  var NS = "http://www.w3.org/2000/svg";
  var svg = document.createElementNS(NS, "svg");
  svg.setAttribute("viewBox", "0 0 320 120");
  svg.setAttribute("class", "weight-log__svg");
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", t("ui.peso_registro_grafico"));
  var linea = document.createElementNS(NS, "path");
  linea.setAttribute("d", geom.path);
  linea.setAttribute("fill", "none");
  linea.setAttribute("stroke", "currentColor");
  linea.setAttribute("stroke-width", "2");
  svg.appendChild(linea);
  cont.appendChild(svg);

  var rango = document.createElement("div");
  rango.className = "weight-log__range";
  rango.appendChild(_wlSpan(tFormat("ui.peso_registro_min", { v: geom.min.toFixed(1) })));
  rango.appendChild(_wlSpan(tFormat("ui.peso_registro_max", { v: geom.max.toFixed(1) })));
  cont.appendChild(rango);

  var fechas = document.createElement("div");
  fechas.className = "weight-log__dates";
  fechas.appendChild(_wlSpan(geom.primera));
  fechas.appendChild(_wlSpan(geom.ultima));
  cont.appendChild(fechas);
}
