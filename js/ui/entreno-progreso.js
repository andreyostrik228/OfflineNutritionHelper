/**
 * js/ui/entreno-progreso.js
 * ─────────────────────────────────────────────────────────────────────────
 * PROGRESO E HISTORIAL del panel de entrenamientos (2026-10-18). Encima del
 * plan:
 *   - si hay una sesión sin terminar, el aviso para continuarla o borrarla;
 *   - la semana (sesiones hechas de las del plan, kilos movidos), la racha de
 *     semanas seguidas, el cumplimiento del plan en las últimas 4 semanas y
 *     una barra por semana de las últimas 8;
 *   - la carga de cada músculo en las últimas 4 semanas;
 *   - el progreso de cada ejercicio, con su gráfica;
 *   - las últimas sesiones, cada una desplegable con sus series, «Corregir» y
 *     «Borrar», y la descarga del historial en CSV.
 *
 * Todo sale del diario de js/core/workout-log.js; las cuentas de ejercicios y
 * músculos, de js/core/workout-stats.js. Lo pinta renderEntreno()
 * (js/ui/render-entreno.js) cada vez que pinta el plan.
 *
 * Expone (globales):
 *   initEntrenoProgreso()                 cablea los botones (una vez)
 *   renderEntrenoProgreso(log, plan)      pinta #entrenoReanudar y #entrenoProgreso
 *   entrenoReanudarHtml(log, ahora)       marcado del aviso de sesión sin terminar ("" si no hay)
 *   entrenoProgresoHtml(log, plan, ahora) marcado del progreso, sin DOM (lo prueban los tests)
 *   entrenoEjerciciosHtml(log)            marcado del progreso por ejercicio, sin DOM
 *   entrenoMusculosCargaHtml(log, ahora)  marcado de la carga por músculo, sin DOM
 *   entrenoHace(ms)                       "hace 25 min" / "hace 3 h" / "hace 2 d"
 * ─────────────────────────────────────────────────────────────────────────
 */

var ENTRENO_HISTORIAL_N = 10;
var ENTRENO_SEMANAS_GRAFICA = 8;
var ENTRENO_EJERCICIOS_N = 12;
var ENTRENO_PUNTOS_GRAFICA = 16;
var ENTRENO_DIAS_MUSCULOS = 28;
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

function _progresoMayuscula(texto) {
  var s = String(texto);
  return s.charAt(0).toLocaleUpperCase() + s.slice(1);
}

/** Aviso de la sesión sin terminar: nombre, cuándo empezó, cuántas series van. "" si no hay. */
function entrenoReanudarHtml(log, ahora) {
  var s = log && log.enCurso;
  if (!s) return "";
  var hechas = 0;
  var total = 0;
  s.ejercicios.forEach(function (e) {
    if (e.saltado) return;
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
  var cumple = (dias && typeof entrenoStatsCumplimiento === "function") ? entrenoStatsCumplimiento(log, dias, ahora, 4) : null;
  return '<div class="entreno__cifras">' +
    '<div class="entreno__cifra entreno__cifra--ancha"><span class="entreno__cifra-etiqueta">' + _progresoEsc(t("ent.semana_actual")) + "</span>" +
      '<strong class="entreno__cifra-valor">' + _progresoEsc(hechas) + "</strong>" + puntos + "</div>" +
    '<div class="entreno__cifra"><span class="entreno__cifra-etiqueta">' + _progresoEsc(t("ent.racha")) + "</span>" +
      '<strong class="entreno__cifra-valor" data-contar="' + racha + '">' + _progresoEsc(tFormat("ent.racha_n", { n: racha })) + "</strong></div>" +
    (cumple
      ? '<div class="entreno__cifra"><span class="entreno__cifra-etiqueta">' + _progresoEsc(t("ent.cumplimiento")) + "</span>" +
          '<strong class="entreno__cifra-valor">' + _progresoEsc(cumple.pct + " %") + "</strong>" +
          '<span class="entreno__cifra-nota">' + _progresoEsc(tFormat("ent.cumplimiento_n", { hechas: cumple.hechas, previstas: cumple.previstas, semanas: cumple.semanas })) + "</span></div>"
      : "") +
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

/** Carga por músculo en las últimas 4 semanas: una barra por grupo, con la media por semana. */
function entrenoMusculosCargaHtml(log, ahora) {
  if (typeof entrenoStatsMusculos !== "function") return "";
  var grupos = entrenoStatsMusculos(log, ahora, ENTRENO_DIAS_MUSCULOS);
  var max = grupos.reduce(function (m, g) { return Math.max(m, g.series); }, 0);
  if (!max) return "";
  var filas = grupos.map(function (g) {
    var ancho = g.series ? Math.max(3, Math.round(g.series / max * 100)) : 0;
    var nombre = _progresoMayuscula(tOr("ent.grupo_" + g.grupo, g.grupo));
    var valor = tFormat("ent.musculo_por_semana", { n: entrenoNumero(g.porSemana) });
    return '<li class="entreno__musculo' + (g.series ? "" : " is-cero") + '">' +
      '<span class="entreno__musculo-nombre">' + _progresoEsc(nombre) + "</span>" +
      '<span class="entreno__musculo-barra" aria-hidden="true"><i style="width:' + ancho + '%"></i></span>' +
      '<span class="entreno__musculo-valor">' + _progresoEsc(valor) + "</span></li>";
  }).join("");
  return '<h4 class="entreno__progreso-sub">' + _progresoEsc(t("ent.musculos_titulo")) + "</h4>" +
    '<ul class="entreno__musculos">' + filas + "</ul>" +
    '<p class="entreno__progreso-nota">' + _progresoEsc(t("ent.musculos_como")) + "</p>";
}

function _progresoValorTexto(x, p) {
  if (x.tipo === "tiempo") return tFormat("ent.segundos", { n: p.reps });
  if (x.tipo === "reps") return tFormat("ent.reps_n", { n: p.reps });
  return entrenoKg(p.kg) + " × " + p.reps;
}

/** La gráfica de un ejercicio: línea y puntos, con la escala abajo. "" con menos de dos sesiones. */
function _progresoLineaHtml(x) {
  var puntos = x.puntos.slice(-ENTRENO_PUNTOS_GRAFICA);
  var g = typeof entrenoStatsGrafico === "function" ? entrenoStatsGrafico(puntos, 300, 90) : null;
  if (!g) return '<p class="entreno__ej-solo">' + _progresoEsc(t("ent.progreso_una_vez")) + "</p>";
  var unidad = x.tipo === "peso" ? " " + t("ent.kg") : "";
  var etiqueta = tFormat(x.tipo === "peso" ? "ent.grafica_ej_peso" : "ent.grafica_ej", {
    nombre: entrenoNombre({ id: x.id, name: x.name }),
    desde: entrenoNumero(g.min) + unidad, hasta: entrenoNumero(g.max) + unidad, n: puntos.length
  });
  var marcas = g.marcas.map(function (m, i) {
    return '<circle cx="' + m.x + '" cy="' + m.y + '" r="' + (i === g.marcas.length - 1 ? 4 : 2.6) + '"' +
      (i === g.marcas.length - 1 ? ' class="is-ultimo"' : "") + "/>";
  }).join("");
  return '<figure class="entreno__linea">' +
    '<svg viewBox="0 0 300 90" role="img" aria-label="' + _progresoEsc(etiqueta) + '" focusable="false">' +
      '<path class="entreno__linea-trazo" d="' + g.path + '"/>' + marcas + "</svg>" +
    '<figcaption class="entreno__linea-pie"><span>' + _progresoEsc(_progresoDiaMes(puntos[0].t)) + "</span>" +
      '<span>' + _progresoEsc(x.tipo === "peso" ? t("ent.grafica_e1rm") : t("ent.grafica_mejor")) + "</span>" +
      "<span>" + _progresoEsc(_progresoDiaMes(puntos[puntos.length - 1].t)) + "</span></figcaption>" +
  "</figure>";
}

/** El progreso de cada ejercicio hecho (los más recientes primero), desplegable con su gráfica. */
function entrenoEjerciciosHtml(log) {
  if (typeof entrenoStatsEjercicios !== "function") return "";
  var lista = entrenoStatsEjercicios(log).slice(0, ENTRENO_EJERCICIOS_N);
  if (!lista.length) return "";
  var items = lista.map(function (x) {
    var nombre = entrenoNombre({ id: x.id, name: x.name });
    var primero = x.puntos[0];
    var ultimo = x.puntos[x.puntos.length - 1];
    var cambio = "";
    if (1 < x.puntos.length && primero.valor) {
      var pct = Math.round((ultimo.valor - primero.valor) / primero.valor * 100);
      var signo = 0 < pct ? "+" : (pct < 0 ? "−" : "±");
      cambio = '<span class="entreno__ej-cambio' + (0 < pct ? " is-sube" : (pct < 0 ? " is-baja" : "")) + '">' +
        _progresoEsc(signo + Math.abs(pct) + " %") + "</span>";
    }
    var mejor = x.tipo === "peso" && x.mejor
      ? tFormat("ent.mejor_e1rm", { kg: entrenoKg(Math.round(x.mejor.valor * 10) / 10), serie: _progresoValorTexto(x, x.mejor) })
      : tFormat("ent.mejor_serie", { serie: _progresoValorTexto(x, x.mejor) });
    return '<li class="entreno__ej-item"><details>' +
      "<summary>" +
        '<span class="entreno__ej-nombre">' + _progresoEsc(nombre) + "</span>" +
        '<span class="entreno__ej-datos">' + _progresoEsc(tFormat("ent.ej_sesiones", { n: x.sesiones }) + " · " + _progresoValorTexto(x, ultimo)) + "</span>" +
        cambio +
      "</summary>" +
      _progresoLineaHtml(x) +
      '<p class="entreno__ej-mejor">' + _progresoEsc(mejor) + "</p>" +
    "</details></li>";
  }).join("");
  return '<h4 class="entreno__progreso-sub">' + _progresoEsc(t("ent.progreso_ejercicios")) + "</h4>" +
    '<ul class="entreno__ejs">' + items + "</ul>" +
    '<p class="entreno__progreso-nota">' + _progresoEsc(t("ent.progreso_como")) + "</p>";
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
    var trabajo = e.series.filter(function (x) { return x.tipo !== "c"; });
    var calentar = e.series.length - trabajo.length;
    return "<li><span>" + _progresoEsc(entrenoNombre({ id: e.id, name: e.name })) + "</span> " +
      '<span class="entreno__hist-series">' + _progresoEsc(entrenoSeriesTexto(trabajo.length ? trabajo : e.series, tiempo)) +
        (calentar && trabajo.length ? " · " + _progresoEsc(tFormat("ent.hist_calentamiento", { n: calentar })) : "") + "</span>" +
      (e.nota ? '<span class="entreno__hist-nota">' + _progresoEsc(e.nota) + "</span>" : "") + "</li>";
  }).join("");
  return '<li class="entreno__hist-item"><details>' +
    "<summary>" +
      '<span class="entreno__hist-fecha">' + _progresoEsc(_progresoFecha(s.inicio)) + "</span>" +
      '<span class="entreno__hist-nombre">' + _progresoEsc(_progresoNombreSesion(s)) +
        (s.editado ? ' <span class="entreno__badge">' + _progresoEsc(t("ent.hist_corregida")) + "</span>" : "") + "</span>" +
      '<span class="entreno__hist-datos">' + _progresoEsc(resumen.join(" · ")) + "</span>" +
    "</summary>" +
    '<ul class="entreno__hist-ejercicios">' + ejercicios + "</ul>" +
    '<div class="entreno__hist-botones">' +
      '<button type="button" class="btn-secondary" data-corregir-sesion="' + _progresoEsc(s.id) + '">' + _progresoEsc(t("ent.corregir")) + "</button>" +
      '<button type="button" class="btn-secondary entreno__hist-borrar" data-borrar-sesion="' + _progresoEsc(s.id) + '">' + _progresoEsc(t("ent.borrar")) + "</button>" +
    "</div>" +
  "</details></li>";
}

/** Progreso de la semana, gráficas e historial. Sin historia, solo una frase que explica cómo empezar. */
function entrenoProgresoHtml(log, plan, ahora) {
  var h = '<h3 class="entreno__progreso-titulo" id="entrenoProgresoTitulo">' + _progresoEsc(t("ent.progreso")) + "</h3>";
  if (!log || !log.sesiones.length) {
    return h + '<p class="entreno__progreso-vacio">' + _progresoEsc(t("ent.historial_vacio")) + "</p>";
  }
  var semanas = entrenoLogSemanas(log, ahora, ENTRENO_SEMANAS_GRAFICA);
  h += _progresoSemanaHtml(semanas, log, plan, ahora);
  h += _progresoGraficaHtml(semanas);
  h += entrenoMusculosCargaHtml(log, ahora);
  h += entrenoEjerciciosHtml(log);
  var ultimas = log.sesiones.slice(-ENTRENO_HISTORIAL_N).reverse();
  h += '<h4 class="entreno__progreso-sub">' + _progresoEsc(t("ent.historial")) + "</h4>" +
    '<ul class="entreno__hist">' + ultimas.map(_progresoSesionHtml).join("") + "</ul>" +
    '<div class="entreno__hist-pie">' +
      '<button type="button" class="btn-secondary" data-csv>' + _progresoEsc(t("ent.csv")) + "</button>" +
      '<p class="entreno__progreso-nota">' + _progresoEsc(t("ent.guardado_local")) + "</p>" +
    "</div>";
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
    // Lo desplegado (un ejercicio, una sesión) sigue desplegado al repintar.
    var abiertos = Array.prototype.map.call(caja.querySelectorAll("details[open] summary"), function (s) { return s.textContent; });
    caja.innerHTML = log ? entrenoProgresoHtml(log, plan, ahora) : "";
    caja.hidden = !log;
    Array.prototype.forEach.call(caja.querySelectorAll("details summary"), function (s) {
      if (abiertos.indexOf(s.textContent) !== -1) s.parentNode.open = true;
    });
    if (typeof entrenoFxProgreso === "function") entrenoFxProgreso(caja);
  }
}

/** El historial entero como CSV, con los nombres en el idioma de la pantalla. */
function _progresoDescargarCsv() {
  if (typeof entrenoStatsCsv !== "function") return;
  var texto = entrenoStatsCsv(entrenoLogLeer(), {
    cabecera: ["fecha", "hora", "sesion", "ejercicio", "serie", "tipo", "kg", "reps", "nota"].map(function (c) { return t("ent.csv_" + c); }),
    sesion: _progresoNombreSesion,
    ejercicio: function (e) { return entrenoNombre({ id: e.id, name: e.name }); },
    tipo: function (tipo) { return tipo ? t("ent.tipo_" + tipo) : ""; }
  });
  var blob = new Blob([texto], { type: "text/csv;charset=utf-8" });
  var url = URL.createObjectURL(blob);
  var a = document.createElement("a");
  a.href = url;
  a.download = "weekplate-entrenamientos-" + new Date().toISOString().slice(0, 10) + ".csv";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
}

function initEntrenoProgreso() {
  var panel = document.getElementById("entrenoPanel");
  if (!panel || _progresoCableado) return;
  _progresoCableado = true;
  panel.addEventListener("click", function (ev) {
    var boton = ev.target.closest("[data-reanudar], [data-descartar-curso], [data-borrar-sesion], [data-corregir-sesion], [data-csv]");
    if (!boton || !panel.contains(boton)) return;
    if (boton.hasAttribute("data-reanudar")) {
      if (typeof entrenoSesionAbrir === "function") entrenoSesionAbrir();
      return;
    }
    if (boton.hasAttribute("data-descartar-curso")) {
      if (typeof entrenoSesionDescartar === "function") entrenoSesionDescartar();
      return;
    }
    if (boton.hasAttribute("data-csv")) { _progresoDescargarCsv(); return; }
    if (boton.hasAttribute("data-corregir-sesion")) {
      if (typeof entrenoSesionCorregir === "function") entrenoSesionCorregir(boton.getAttribute("data-corregir-sesion"));
      return;
    }
    var id = boton.getAttribute("data-borrar-sesion");
    if (!window.confirm(t("ent.confirmar_borrar_hist"))) return;
    var log = entrenoLogLeer();
    if (entrenoLogBorrar(log, id, Date.now())) {
      entrenoLogGuardar(log);
      if (typeof pushWorkoutsToCloud === "function") pushWorkoutsToCloud();
    }
    if (typeof renderEntreno === "function") renderEntreno();
  });
}
