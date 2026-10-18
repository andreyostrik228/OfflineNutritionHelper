/**
 * js/ui/entreno-progreso.js
 * ─────────────────────────────────────────────────────────────────────────
 * PROGRESO E HISTORIAL del panel de entrenamientos (2026-10-18). Encima del
 * plan:
 *   - si hay una sesión sin terminar, el aviso para continuarla o borrarla;
 *   - la semana (sesiones hechas de las del plan, kilos movidos), la racha de
 *     semanas seguidas y una barra por semana de las últimas 8;
 *   - las últimas sesiones, cada una desplegable con sus series y con
 *     «Borrar».
 *
 * Todo sale del diario de js/core/workout-log.js. Lo pinta renderEntreno()
 * (js/ui/render-entreno.js) cada vez que pinta el plan.
 *
 * Expone (globales):
 *   initEntrenoProgreso()                 cablea los botones (una vez)
 *   renderEntrenoProgreso(log, plan)      pinta #entrenoReanudar y #entrenoProgreso
 *   entrenoReanudarHtml(log, ahora)       marcado del aviso de sesión sin terminar ("" si no hay)
 *   entrenoProgresoHtml(log, plan, ahora) marcado del progreso, sin DOM (lo prueban los tests)
 *   entrenoHace(ms)                       "hace 25 min" / "hace 3 h" / "hace 2 d"
 * ─────────────────────────────────────────────────────────────────────────
 */

var ENTRENO_HISTORIAL_N = 10;
var ENTRENO_SEMANAS_GRAFICA = 8;
var _progresoCableado = false;

function _progresoEsc(texto) { return escapeHtml(String(texto)); }

function _progresoLocale() {
  var lang = typeof getLang === "function" ? getLang() : "es";
  return (typeof LANG_LOCALES !== "undefined" && LANG_LOCALES[lang]) || "es-ES";
}

/** "hace 25 min", "hace 3 h", "hace 2 d" (con el texto de cada idioma). */
function entrenoHace(ms) {
  var min = Math.max(0, Math.round(ms / 60000));
  if (min < 60) return tFormat("ent.hace_min", { n: min });
  var horas = Math.round(min / 60);
  if (horas < 48) return tFormat("ent.hace_h", { n: horas });
  return tFormat("ent.hace_d", { n: Math.round(horas / 24) });
}

function _progresoFecha(ms) {
  try {
    return new Date(ms).toLocaleDateString(_progresoLocale(), { weekday: "short", day: "numeric", month: "short" });
  } catch (e) {
    var d = new Date(ms);
    return d.getDate() + "." + (d.getMonth() + 1);
  }
}

function _progresoDiaMes(ms) {
  var d = new Date(ms);
  return d.getDate() + "." + (d.getMonth() + 1 < 10 ? "0" : "") + (d.getMonth() + 1);
}

function _progresoNombreSesion(s) {
  return tOr("ent.sesion_" + s.clave, s.nombre || "");
}

/** Aviso de la sesión sin terminar: nombre, cuándo empezó, cuántas series van. "" si no hay. */
function entrenoReanudarHtml(log, ahora) {
  var s = log && log.enCurso;
  if (!s) return "";
  var hechas = 0;
  var total = 0;
  s.ejercicios.forEach(function (e) {
    total += e.series.length;
    e.series.forEach(function (x) { if (x.hecha) hechas++; });
  });
  return '<p class="entreno__reanudar-texto"><strong>' + _progresoEsc(t("ent.en_curso")) + "</strong> " +
      _progresoEsc(_progresoNombreSesion(s)) + " · " + _progresoEsc(entrenoHace(ahora - s.inicio)) +
      " · " + _progresoEsc(tFormat("ent.series_hechas", { hechas: hechas, total: total })) + "</p>" +
    '<div class="entreno__reanudar-botones">' +
      '<button type="button" class="entreno__empezar" data-reanudar>' + _progresoEsc(t("ent.continuar")) + "</button>" +
      '<button type="button" class="btn-secondary" data-descartar-curso>' + _progresoEsc(t("ent.borrar_sesion")) + "</button>" +
    "</div>";
}

function _progresoSemanaHtml(semanas, log, plan, ahora) {
  var actual = semanas[semanas.length - 1];
  var dias = plan && plan.dias ? plan.dias : 0;
  var puntos = "";
  if (dias) {
    for (var i = 0; i < Math.max(dias, actual.sesiones); i++) {
      puntos += '<i class="entreno__punto' + (i < actual.sesiones ? " is-hecho" : "") + '"></i>';
    }
    puntos = '<span class="entreno__puntos" aria-hidden="true">' + puntos + "</span>";
  }
  var hechas = dias
    ? tFormat("ent.semana_hechas", { n: actual.sesiones, total: dias })
    : tFormat("ent.semana_hechas_sin_plan", { n: actual.sesiones });
  var racha = entrenoLogRacha(log, ahora);
  return '<div class="entreno__cifras">' +
    '<div class="entreno__cifra entreno__cifra--ancha"><span class="entreno__cifra-etiqueta">' + _progresoEsc(t("ent.semana_actual")) + "</span>" +
      '<strong class="entreno__cifra-valor">' + _progresoEsc(hechas) + "</strong>" + puntos + "</div>" +
    '<div class="entreno__cifra"><span class="entreno__cifra-etiqueta">' + _progresoEsc(t("ent.racha")) + "</span>" +
      '<strong class="entreno__cifra-valor">' + _progresoEsc(tFormat("ent.racha_n", { n: racha })) + "</strong></div>" +
    '<div class="entreno__cifra"><span class="entreno__cifra-etiqueta">' + _progresoEsc(t("ent.volumen_semana")) + "</span>" +
      '<strong class="entreno__cifra-valor">' + _progresoEsc(entrenoMiles(actual.volumen) + " " + t("ent.kg")) + "</strong></div>" +
  "</div>";
}

function _progresoGraficaHtml(semanas) {
  var max = semanas.reduce(function (m, s) { return Math.max(m, s.volumen); }, 0);
  if (!max) return "";
  var barras = semanas.map(function (s, i) {
    var alto = s.volumen ? Math.max(4, Math.round(s.volumen / max * 100)) : 0;
    var etiqueta = tFormat("ent.grafica_semana", { fecha: _progresoDiaMes(s.inicio), kg: entrenoMiles(s.volumen) + " " + t("ent.kg") });
    return '<li class="entreno__barra' + (i === semanas.length - 1 ? " is-actual" : "") + '" aria-label="' + _progresoEsc(etiqueta) + '">' +
      '<span class="entreno__barra-col"><i style="height:' + alto + '%"></i></span>' +
      '<span class="entreno__barra-fecha" aria-hidden="true">' + _progresoEsc(_progresoDiaMes(s.inicio)) + "</span></li>";
  }).join("");
  return '<h4 class="entreno__progreso-sub">' + _progresoEsc(t("ent.volumen_8")) + "</h4>" +
    '<ol class="entreno__grafica">' + barras + "</ol>";
}

function _progresoSesionHtml(s) {
  var tot = entrenoLogTotales(s);
  var resumen = [
    tot.minutos + " " + t("ent.min"),
    tFormat("ent.n_series", { n: tot.series })
  ];
  if (tot.volumen) resumen.push(entrenoMiles(tot.volumen) + " " + t("ent.kg"));
  var ejercicios = s.ejercicios.map(function (e) {
    var tiempo = / s( por lado)?$/.test(String(e.reps));
    return "<li><span>" + _progresoEsc(entrenoNombre({ id: e.id, name: e.name })) + "</span> " +
      '<span class="entreno__hist-series">' + _progresoEsc(entrenoSeriesTexto(e.series, tiempo)) + "</span></li>";
  }).join("");
  return '<li class="entreno__hist-item"><details>' +
    "<summary>" +
      '<span class="entreno__hist-fecha">' + _progresoEsc(_progresoFecha(s.inicio)) + "</span>" +
      '<span class="entreno__hist-nombre">' + _progresoEsc(_progresoNombreSesion(s)) + "</span>" +
      '<span class="entreno__hist-datos">' + _progresoEsc(resumen.join(" · ")) + "</span>" +
    "</summary>" +
    '<ul class="entreno__hist-ejercicios">' + ejercicios + "</ul>" +
    '<button type="button" class="btn-secondary entreno__hist-borrar" data-borrar-sesion="' + _progresoEsc(s.id) + '">' + _progresoEsc(t("ent.borrar")) + "</button>" +
  "</details></li>";
}

/** Progreso de la semana, gráfica y últimas sesiones. Sin historia, solo una frase que explica cómo empezar. */
function entrenoProgresoHtml(log, plan, ahora) {
  var h = '<h3 class="entreno__progreso-titulo" id="entrenoProgresoTitulo">' + _progresoEsc(t("ent.progreso")) + "</h3>";
  if (!log || !log.sesiones.length) {
    return h + '<p class="entreno__progreso-vacio">' + _progresoEsc(t("ent.historial_vacio")) + "</p>";
  }
  var semanas = entrenoLogSemanas(log, ahora, ENTRENO_SEMANAS_GRAFICA);
  h += _progresoSemanaHtml(semanas, log, plan, ahora);
  h += _progresoGraficaHtml(semanas);
  var ultimas = log.sesiones.slice(-ENTRENO_HISTORIAL_N).reverse();
  h += '<h4 class="entreno__progreso-sub">' + _progresoEsc(t("ent.historial")) + "</h4>" +
    '<ul class="entreno__hist">' + ultimas.map(_progresoSesionHtml).join("") + "</ul>" +
    '<p class="entreno__progreso-nota">' + _progresoEsc(t("ent.guardado_local")) + "</p>";
  return h;
}

function renderEntrenoProgreso(log, plan) {
  var aviso = document.getElementById("entrenoReanudar");
  var caja = document.getElementById("entrenoProgreso");
  var ahora = Date.now();
  if (aviso) {
    var html = entrenoReanudarHtml(log, ahora);
    aviso.innerHTML = html;
    aviso.hidden = !html;
  }
  if (caja) {
    caja.innerHTML = log ? entrenoProgresoHtml(log, plan, ahora) : "";
    caja.hidden = !log;
  }
}

function initEntrenoProgreso() {
  var panel = document.getElementById("entrenoPanel");
  if (!panel || _progresoCableado) return;
  _progresoCableado = true;
  panel.addEventListener("click", function (ev) {
    var boton = ev.target.closest("[data-reanudar], [data-descartar-curso], [data-borrar-sesion]");
    if (!boton || !panel.contains(boton)) return;
    if (boton.hasAttribute("data-reanudar")) {
      if (typeof entrenoSesionAbrir === "function") entrenoSesionAbrir();
      return;
    }
    if (boton.hasAttribute("data-descartar-curso")) {
      if (typeof entrenoSesionDescartar === "function") entrenoSesionDescartar();
      return;
    }
    var id = boton.getAttribute("data-borrar-sesion");
    if (!window.confirm(t("ent.confirmar_borrar_hist"))) return;
    var log = entrenoLogLeer();
    if (entrenoLogBorrar(log, id)) entrenoLogGuardar(log);
    if (typeof renderEntreno === "function") renderEntreno();
  });
}
