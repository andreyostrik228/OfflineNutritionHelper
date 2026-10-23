/**
 * js/ui/entreno-medidas.js
 * ─────────────────────────────────────────────────────────────────────────
 * «PROGRESO», pestaña «Cuerpo»: las medidas del cuerpo (2026-10-23), debajo del
 * peso. Cintura, pecho, cadera, brazo y muslo, en centímetros; cada una con
 * su último valor, cuánto cambió en el periodo elegido y, desplegada, su
 * gráfica. «Записать обхваты» abre un formulario con lo de la última vez de
 * ejemplo: solo se guarda lo que se escribe (lo vacío es «hoy no lo medí»).
 *
 * Los datos y su viaje a la cuenta: js/core/body-measures.js.
 *
 * Expone (globales):
 *   entrenoMedidasHtml(lista, ahora, periodo)  marcado del bloque, sin DOM (lo prueban los tests)
 *   initEntrenoMedidas()                       cablea el formulario (una vez)
 * ─────────────────────────────────────────────────────────────────────────
 */

var _medidasCableado = false;

function _medidasEsc(texto) { return escapeHtml(String(texto)); }

function _medidasCm(cm) {
  return tFormat("ent.cm_n", { n: typeof entrenoNumero === "function" ? entrenoNumero(cm) : String(cm) });
}

function _medidasMs(fecha) {
  var p = String(fecha).split("-");
  return new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2])).getTime();
}

function _medidasDiaMes(ms) {
  var d = new Date(ms);
  return d.getDate() + "." + (d.getMonth() + 1 < 10 ? "0" : "") + (d.getMonth() + 1);
}

function _medidasGraficaHtml(serie, nombre) {
  var puntos = serie.map(function (e) { return { t: _medidasMs(e.fecha), valor: e.cm }; });
  var g = typeof entrenoStatsGrafico === "function" ? entrenoStatsGrafico(puntos, 300, 80) : null;
  if (!g) return '<p class="entreno__ej-solo">' + _medidasEsc(t("ent.medida_una")) + "</p>";
  var ultima = g.marcas[g.marcas.length - 1];
  var etiqueta = tFormat("ent.grafica_medida", { nombre: nombre, desde: _medidasCm(g.min), hasta: _medidasCm(g.max), n: puntos.length });
  return '<figure class="entreno__linea entreno__medida-grafica">' +
    '<svg viewBox="0 0 300 80" role="img" aria-label="' + _medidasEsc(etiqueta) + '" focusable="false">' +
      '<path class="entreno__linea-trazo" d="' + g.path + '"/>' +
      '<circle cx="' + ultima.x + '" cy="' + ultima.y + '" r="4" class="is-ultimo"/></svg>' +
    '<figcaption class="entreno__linea-pie"><span>' + _medidasEsc(_medidasDiaMes(puntos[0].t)) + "</span>" +
      "<span>" + _medidasEsc(_medidasCm(g.min) + " – " + _medidasCm(g.max)) + "</span>" +
      "<span>" + _medidasEsc(_medidasDiaMes(puntos[puntos.length - 1].t)) + "</span></figcaption>" +
  "</figure>";
}

/** Una parte medida: último valor, cambio en el periodo y la gráfica al desplegar. "" si nunca se midió. */
function _medidaFilaHtml(lista, parte, periodo) {
  var serie = medidasSerie(lista, parte);
  if (!serie.length) return "";
  var nombre = t("ent.medida_" + parte);
  var ultima = serie[serie.length - 1];
  // «Todo» empieza en la primera sesión, pero las medidas se ven enteras, como el peso.
  var desde = !periodo || periodo.clave === "todo" ? -Infinity : periodo.desde;
  var dentro = serie.filter(function (e) { return !(_medidasMs(e.fecha) < desde); });
  var cambio = "";
  if (periodo && dentro.length && dentro[0] !== ultima) {
    var d = Math.round((ultima.cm - dentro[0].cm) * 10) / 10;
    var signo = 0 < d ? "+" : (d < 0 ? "−" : "±");
    cambio = '<span class="entreno__medida-cambio">' + _medidasEsc(tFormat("ent.medida_cambio_periodo", { cm: signo + _medidasCm(Math.abs(d)) })) + "</span>";
  }
  return '<li class="entreno__medida"><details><summary>' +
      '<span class="entreno__medida-nombre">' + _medidasEsc(nombre) + "</span>" +
      '<strong class="entreno__medida-valor">' + _medidasEsc(_medidasCm(ultima.cm)) + "</strong>" + cambio +
    "</summary>" +
    _medidasGraficaHtml(periodo ? dentro : serie, nombre) +
  "</details></li>";
}

/** El formulario: un campo por parte, con lo de la última vez de ejemplo. */
function _medidasFormHtml(lista) {
  var campos = MEDIDAS_PARTES.map(function (parte) {
    var serie = medidasSerie(lista, parte);
    var ultima = serie.length ? serie[serie.length - 1].cm : null;
    var antes = ultima === null ? "" : (typeof entrenoNumero === "function" ? entrenoNumero(ultima) : String(ultima));
    return '<label class="entreno__medidas-campo"><span>' + _medidasEsc(tFormat("ent.medida_campo", { parte: t("ent.medida_" + parte) })) + "</span>" +
      '<input type="text" inputmode="decimal" autocomplete="off" maxlength="6" name="' + parte + '"' +
        (antes ? ' placeholder="' + _medidasEsc(antes) + '"' : "") + "></label>";
  }).join("");
  return '<form class="entreno__medidas-form" id="entrenoMedidasForm" data-medidas-form novalidate hidden>' +
    '<p class="entreno__medidas-ayuda">' + _medidasEsc(t("ent.medidas_como")) + "</p>" +
    '<div class="entreno__medidas-campos">' + campos + "</div>" +
    '<p class="entreno__medidas-error" data-medidas-error role="alert" hidden></p>' +
    '<div class="entreno__medidas-botones">' +
      '<button type="submit" class="entreno__empezar">' + _medidasEsc(t("ent.medidas_guardar")) + "</button>" +
      '<button type="button" class="btn-secondary" data-medidas-cancelar>' + _medidasEsc(t("ent.prog_cancelar")) + "</button>" +
    "</div>" +
  "</form>";
}

/**
 * El bloque de medidas de «Cuerpo». Sin periodo (sin sesiones todavía), sin
 * cambio. Sin DOM.
 */
function entrenoMedidasHtml(lista, ahora, periodo) {
  var limpia = typeof medidasLimpiar === "function" ? medidasLimpiar(lista) : [];
  var filas = MEDIDAS_PARTES.map(function (p) { return _medidaFilaHtml(limpia, p, periodo); }).join("");
  return '<section class="entreno__medidas" aria-labelledby="entrenoMedidasTitulo">' +
    '<h3 class="entreno__subtitulo" id="entrenoMedidasTitulo">' + _medidasEsc(t("ent.medidas_titulo")) + "</h3>" +
    (filas ? '<ul class="entreno__medidas-lista">' + filas + "</ul>" : '<p class="entreno__peso-texto">' + _medidasEsc(t("ent.medidas_vacio")) + "</p>") +
    '<p class="entreno__medidas-estado" data-medidas-estado role="status"></p>' +
    '<button type="button" class="btn-secondary" data-medidas-abrir aria-expanded="false" aria-controls="entrenoMedidasForm">' +
      _medidasEsc(t("ent.medidas_abrir")) + "</button>" +
    _medidasFormHtml(limpia) +
    '<p class="entreno__progreso-nota">' + _medidasEsc(t("ent.guardado_local")) + "</p>" +
  "</section>";
}

function _medidasMostrarForm(abrir) {
  var form = document.getElementById("entrenoMedidasForm");
  var boton = document.querySelector("[data-medidas-abrir]");
  if (!form || !boton) return;
  form.hidden = !abrir;
  boton.hidden = abrir;
  boton.setAttribute("aria-expanded", String(abrir));
  if (abrir) {
    var primero = form.querySelector("input");
    if (primero) primero.focus();
  } else {
    boton.focus();
  }
}

function _medidasGuardar(form) {
  var error = form.querySelector("[data-medidas-error]");
  var valores = {};
  var alguna = false;
  for (var i = 0; i < MEDIDAS_PARTES.length; i++) {
    var parte = MEDIDAS_PARTES[i];
    var campo = form.querySelector('input[name="' + parte + '"]');
    var r = medidaAnalizar(campo ? campo.value : "");
    if (!r.ok) {
      error.textContent = tFormat("ent.medidas_error_" + r.error, { parte: t("ent.medida_" + parte), min: MEDIDA_MIN_CM, max: MEDIDA_MAX_CM });
      error.hidden = false;
      campo.setAttribute("aria-invalid", "true");
      campo.focus();
      return;
    }
    if (campo) campo.removeAttribute("aria-invalid");
    if (r.cm !== null) { valores[parte] = r.cm; alguna = true; }
  }
  if (!alguna) {
    error.textContent = t("ent.medidas_error_vacio");
    error.hidden = false;
    var uno = form.querySelector("input");
    if (uno) uno.focus();
    return;
  }
  var storage = medidasAlmacen();
  var hoy = typeof fechaHoy === "function" ? fechaHoy(new Date()) : new Date().toISOString().slice(0, 10);
  if (!medidasEscribir(storage, medidasGuardarHoy(medidasLeer(storage), valores, Date.now(), hoy))) {
    error.textContent = t("ent.medidas_sin_guardar");
    error.hidden = false;
    return;
  }
  // Con cuenta, viaja con los ajustes (no hace nada sin sesión; nunca lanza).
  pushMeasuresToCloud();
  if (typeof renderEntrenoProgreso === "function" && typeof entrenoLogLeer === "function") {
    renderEntrenoProgreso(entrenoLogLeer(), typeof entrenoPlanActual === "function" ? entrenoPlanActual() : null);
  }
  var estado = document.querySelector("[data-medidas-estado]");
  if (estado) estado.textContent = t("ent.medidas_guardado");
  var abrir = document.querySelector("[data-medidas-abrir]");
  if (abrir) abrir.focus();
}

function initEntrenoMedidas() {
  var panel = document.getElementById("entrenoPanel");
  if (!panel || _medidasCableado) return;
  _medidasCableado = true;
  panel.addEventListener("click", function (ev) {
    if (ev.target.closest("[data-medidas-abrir]")) { _medidasMostrarForm(true); return; }
    if (ev.target.closest("[data-medidas-cancelar]")) _medidasMostrarForm(false);
  });
  panel.addEventListener("submit", function (ev) {
    var form = ev.target.closest && ev.target.closest("[data-medidas-form]");
    if (!form) return;
    ev.preventDefault();
    _medidasGuardar(form);
  });
  panel.addEventListener("keydown", function (ev) {
    if (ev.key === "Escape" && ev.target.closest && ev.target.closest("[data-medidas-form]")) _medidasMostrarForm(false);
  });
}
