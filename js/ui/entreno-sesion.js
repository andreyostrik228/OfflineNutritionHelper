/**
 * js/ui/entreno-sesion.js
 * ─────────────────────────────────────────────────────────────────────────
 * MODO ENTRENAMIENTO (2026-10-18). La pantalla de una sesión en marcha, como
 * en las apps de gimnasio: cada ejercicio con sus series (kilos y
 * repeticiones ya rellenos con la sugerencia de hoy), un toque para marcar
 * la serie hecha, la cuenta atrás del descanso abajo y, al terminar, el
 * resumen con los récords.
 *
 * Los datos los lleva js/core/workout-log.js (diario de este navegador). La
 * pantalla vive dentro de #entrenoPanel: con la clase `is-sesion` el panel
 * enseña solo #entrenoSesion. Si se recarga a mitad, la sesión sigue en
 * curso y el panel ofrece continuarla (js/ui/entreno-progreso.js).
 *
 * Mientras está abierta, la pantalla no se apaga (Wake Lock, donde exista) y
 * al acabar el descanso el móvil vibra y suena un aviso corto (se puede
 * quitar el sonido; la elección se guarda en ENTRENO_CLAVE_SONIDO).
 *
 * Expone (globales):
 *   initEntrenoSesion()                  cablea la pantalla (una vez; lo llama initEntreno)
 *   entrenoSesionEmpezar(sesionPlan, semana)  empieza (si ya hay otra, pregunta) y abre
 *   entrenoSesionAbrir(log?)             abre la que está en curso
 *   entrenoSesionCerrar()                vuelve al plan; la sesión sigue en curso
 *   entrenoSesionDescartar()             borra la que está en curso (pregunta)
 *   entrenoSesionAlMostrar() / entrenoSesionAlOcultar()  el panel se enseña o se esconde
 *   entrenoSesionRepintar()              repinta si está abierta (cambio de idioma)
 *   entrenoSesionPantallaHtml(sesion, log, ahora)  marcado, sin DOM (lo prueban los tests)
 *   entrenoResumenHtml(resumen)          marcado del resumen final
 *   entrenoSugerenciaTexto(sug, ejercicio, sinPeso)  la línea «Hoy: …»
 *   entrenoSeriesTexto(series, tiempo)   "60 kg × 10, 10, 9"
 *   entrenoNumero(n) / entrenoKg(kg) / entrenoMiles(n) / entrenoReloj(ms) / entrenoLocale()
 * ─────────────────────────────────────────────────────────────────────────
 */

var ENTRENO_CLAVE_SONIDO = "nutritionPlanner.entrenoSonido.v1";
var ENTRENO_DESCANSO_PASO_S = 15;

var _sesionLog = null;
var _sesionTicId = null;
var _sesionAudio = null;
var _sesionWake = null;
var _sesionResumen = null;
var _sesionAvisoHasta = 0;
var _sesionDescansoTotal = 0;
var _sesionCableado = false;

var SESION_ICONOS = {
  atras: '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  check: '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  sonido: '<svg viewBox="0 0 24 24" width="21" height="21" aria-hidden="true" focusable="false"><path d="M12 3.5a5.5 5.5 0 0 0-5.5 5.5v3.6L4.8 15.5v1h14.4v-1l-1.7-2.9V9A5.5 5.5 0 0 0 12 3.5z M10 19a2 2 0 0 0 4 0" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"/></svg>',
  sinSonido: '<svg viewBox="0 0 24 24" width="21" height="21" aria-hidden="true" focusable="false"><path d="M12 3.5a5.5 5.5 0 0 0-5.5 5.5v3.6L4.8 15.5v1h14.4v-1l-1.7-2.9V9A5.5 5.5 0 0 0 12 3.5z M10 19a2 2 0 0 0 4 0" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round" opacity="0.55"/><path d="M4 4l16 16" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>'
};

function _sesionCaja() { return document.getElementById("entrenoSesion"); }
function _sesionPanel() { return document.getElementById("entrenoPanel"); }
function _sesionAbierta() {
  var panel = _sesionPanel();
  return !!(panel && panel.classList.contains("is-sesion"));
}
function _sesionLang() { return typeof getLang === "function" ? getLang() : "es"; }
/** "ru-RU", "en-GB"…: el de LANG_LOCALES (js/core/i18n.js). */
function entrenoLocale() {
  return (typeof LANG_LOCALES !== "undefined" && LANG_LOCALES[_sesionLang()]) || "es-ES";
}
function _sesionEsc(texto) { return escapeHtml(String(texto)); }

/** 62,5 (o 62.5 en inglés), sin ceros de sobra. */
function entrenoNumero(n) {
  var texto = String(Math.round(Number(n) * 100) / 100);
  return _sesionLang() === "en" ? texto : texto.replace(".", ",");
}

function entrenoKg(kg) {
  return entrenoNumero(kg) + " " + t("ent.kg");
}

/** 4 250 con el separador de miles del idioma. */
function entrenoMiles(n) {
  try { return Number(n).toLocaleString(entrenoLocale()); }
  catch (e) { return String(n); }
}

/** 12:05 o 1:02:05. */
function entrenoReloj(ms) {
  var s = Math.max(0, Math.floor(ms / 1000));
  var h = Math.floor(s / 3600);
  var m = Math.floor((s % 3600) / 60);
  var seg = s % 60;
  return (h ? h + ":" + (m < 10 ? "0" : "") : "") + m + ":" + (seg < 10 ? "0" : "") + seg;
}

function _sesionCatalogo(id) {
  var catalogo = typeof EXERCISE_CATALOG !== "undefined" ? EXERCISE_CATALOG : [];
  for (var i = 0; i < catalogo.length; i++) if (catalogo[i].id === id) return catalogo[i];
  return null;
}

/** Sin material: el «peso» es el del cuerpo (las casillas de kilos son lastre opcional). */
function _sesionSinPeso(id) {
  var e = _sesionCatalogo(id);
  return !!(e && Array.isArray(e.equipment) && e.equipment.indexOf("sin_material") !== -1);
}

/**
 * Las series de una vez, agrupadas por peso: "60 kg × 10, 10, 9";
 * con pesos distintos "60 kg × 10 · 65 kg × 8"; sin peso "peso corporal × 12, 10";
 * de tiempo "30 s, 40 s".
 */
function entrenoSeriesTexto(series, tiempo) {
  var grupos = [];
  series.forEach(function (s) {
    var kg = s.kg || 0;
    var ultimo = grupos[grupos.length - 1];
    if (ultimo && ultimo.kg === kg) ultimo.reps.push(s.reps);
    else grupos.push({ kg: kg, reps: [s.reps] });
  });
  return grupos.map(function (g) {
    var reps = g.reps.map(function (r) { return tiempo ? tFormat("ent.segundos", { n: r }) : String(r); }).join(", ");
    if (g.kg > 0) return entrenoKg(g.kg) + " × " + reps;
    return tiempo ? reps : t("ent.peso_corporal") + " × " + reps;
  }).join(" · ");
}

/** La línea «Hoy: …» que acompaña a cada ejercicio. "" si no hay nada útil que decir. */
function entrenoSugerenciaTexto(sug, ejercicio, sinPeso) {
  var rango = entrenoLogRango(ejercicio.reps);
  if (rango && rango.tiempo) return tFormat("ent.sug_tiempo", { s: sug.reps || rango.min });
  if (sug.tipo === "nuevo") {
    if (!rango) return "";
    return tFormat(sinPeso ? "ent.primera_vez_sin_peso" : "ent.primera_vez", { reps: rango.min });
  }
  if (sug.tipo === "variante") return t("ent.sug_variante");
  var kg = sug.kg > 0 ? entrenoKg(sug.kg) : t("ent.peso_corporal");
  if (sug.tipo === "subir") return tFormat("ent.sug_subir", { kg: kg });
  if (sug.tipo === "bajar") return tFormat("ent.sug_bajar", { kg: kg });
  return tFormat("ent.sug_mantener", { kg: kg, reps: sug.reps });
}

function _sesionContar(sesion) {
  var hechas = 0;
  var total = 0;
  sesion.ejercicios.forEach(function (e) {
    total += e.series.length;
    e.series.forEach(function (s) { if (s.hecha) hechas++; });
  });
  return { hechas: hechas, total: total };
}

function _sesionNombre(sesion) {
  return tOr("ent.sesion_" + sesion.clave, sesion.nombre || "");
}

function _sesionSerieHtml(i, serie, j, antes, tiempo) {
  var n = j + 1;
  var record = serie.hecha ? entrenoLogTipoRecord(antes, serie) : null;
  var datos = ' data-ej="' + i + '" data-serie="' + j + '"';
  return '<div class="sesion__fila' + (serie.hecha ? " is-hecha" : "") + '">' +
    '<span class="sesion__n">' + n +
      (record ? '<b class="sesion__record">' + _sesionEsc(t("ent.record")) + "</b>" : "") +
    "</span>" +
    '<input class="sesion__campo" type="text" inputmode="decimal" autocomplete="off" maxlength="6" placeholder="—"' +
      ' data-campo="kg"' + datos + ' data-foco="kg-' + i + "-" + j + '"' +
      ' value="' + _sesionEsc(serie.kg === null ? "" : entrenoNumero(serie.kg)) + '"' +
      ' aria-label="' + _sesionEsc(tFormat("ent.kg_serie", { n: n })) + '">' +
    '<input class="sesion__campo" type="text" inputmode="numeric" autocomplete="off" maxlength="4"' +
      ' data-campo="reps"' + datos + ' data-foco="reps-' + i + "-" + j + '"' +
      ' value="' + _sesionEsc(serie.reps === null ? "" : String(serie.reps)) + '"' +
      ' aria-label="' + _sesionEsc(tFormat(tiempo ? "ent.seg_serie" : "ent.reps_serie", { n: n })) + '">' +
    '<button type="button" class="sesion__check" data-accion="check"' + datos + ' data-foco="check-' + i + "-" + j + '"' +
      ' aria-pressed="' + (serie.hecha ? "true" : "false") + '"' +
      ' aria-label="' + _sesionEsc(tFormat("ent.marcar_serie", { n: n })) + '">' + SESION_ICONOS.check + "</button>" +
  "</div>";
}

function _sesionEjercicioHtml(e, i, log) {
  var rango = entrenoLogRango(e.reps);
  var tiempo = !!(rango && rango.tiempo);
  var sinPeso = _sesionSinPeso(e.id);
  var catalogo = _sesionCatalogo(e.id);
  var sug = entrenoLogSugerencia(log, { id: e.id, reps: e.reps, muscle: e.muscle, compound: e.compound, sets: e.series.length });
  var antes = entrenoLogRecords(log, e.id);
  var hechas = e.series.filter(function (s) { return s.hecha; }).length;
  var nombre = entrenoNombre({ id: e.id, name: e.name });
  var plan = tFormat("ent.plan_linea", {
    series: e.series.length,
    reps: typeof entrenoRepsTexto === "function" ? entrenoRepsTexto(e.reps) : e.reps,
    descanso: entrenoDescanso(e.descanso)
  });

  var conAnimacion = typeof entrenoAnimacionTiene === "function" && entrenoAnimacionTiene(e.id);
  var numero = '<span class="sesion__ej-num" aria-hidden="true">' + (i + 1) + "</span>";
  var cabeza = conAnimacion
    ? '<button type="button" class="sesion__ej-anim" data-accion="tecnica" data-ej="' + i + '" data-foco="anim-' + i + '"' +
        ' aria-label="' + _sesionEsc(tFormat("ent.ver_animacion", { nombre: nombre })) + '">' +
        entrenoAnimacionHtml(e.id, "mini", "") + numero + "</button>"
    : numero;
  var h = '<li class="sesion__ej' + (hechas === e.series.length ? " is-completo" : "") + '">' +
    '<header class="sesion__ej-cabeza">' +
      cabeza +
      '<div class="sesion__ej-titulos">' +
        '<h4 class="sesion__ej-nombre">' + _sesionEsc(nombre) + "</h4>" +
        '<p class="sesion__ej-plan">' + _sesionEsc(plan) + "</p>" +
      "</div>" +
      '<span class="sesion__ej-cuenta">' + hechas + "/" + e.series.length + "</span>" +
    "</header>";
  if (sug.ultima) {
    h += '<p class="sesion__ultima">' + _sesionEsc(tFormat("ent.ultima_vez", { series: entrenoSeriesTexto(sug.ultima.series, tiempo) })) + "</p>";
  }
  var consejo = entrenoSugerenciaTexto(sug, e, sinPeso);
  if (consejo) h += '<p class="sesion__sug sesion__sug--' + sug.tipo + '">' + _sesionEsc(consejo) + "</p>";
  var tecnica = entrenoTecnica({ id: e.id, tecnica: catalogo ? catalogo.tecnica : "" });
  if (tecnica || conAnimacion) {
    h += '<details class="sesion__tec" data-tec="' + i + '"><summary>' + _sesionEsc(t("ent.col_tecnica")) + "</summary>" +
      (conAnimacion
        ? '<div class="sesion__tec-anim">' + entrenoAnimacionHtml(e.id, "completo", tFormat("ent.animacion_de", { nombre: nombre })) + "</div>" +
          (typeof entrenoMusculosHtml === "function" ? entrenoMusculosHtml(e.id) : "")
        : "") +
      (tecnica ? "<p>" + _sesionEsc(tecnica) + "</p>" : "") + "</details>";
  }
  h += '<div class="sesion__series" role="group" aria-label="' + _sesionEsc(nombre) + '">' +
    '<div class="sesion__fila sesion__fila--cabeza" aria-hidden="true">' +
      "<span>" + _sesionEsc(t("ent.col_serie")) + "</span>" +
      "<span>" + _sesionEsc(sinPeso ? t("ent.col_kg_extra") : t("ent.col_kg")) + "</span>" +
      "<span>" + _sesionEsc(tiempo ? t("ent.col_seg") : t("ent.col_reps_corto")) + "</span>" +
      "<span></span>" +
    "</div>";
  e.series.forEach(function (serie, j) { h += _sesionSerieHtml(i, serie, j, antes, tiempo); });
  h += "</div>" +
    '<div class="sesion__ej-acciones">' +
      '<button type="button" class="sesion__boton" data-accion="mas" data-ej="' + i + '" data-foco="mas-' + i + '">' + _sesionEsc(t("ent.anadir_serie")) + "</button>" +
      (e.series.length > 1
        ? '<button type="button" class="sesion__boton" data-accion="menos" data-ej="' + i + '" data-foco="menos-' + i + '">' + _sesionEsc(t("ent.quitar_serie")) + "</button>"
        : "") +
    "</div>" +
  "</li>";
  return h;
}

function _sesionDescansoHtml(sesion, ahora) {
  var queda = sesion.descansoHasta ? sesion.descansoHasta - ahora : 0;
  var activo = queda > 0;
  var aviso = !activo && _sesionAvisoHasta > ahora;
  return '<div class="sesion__descanso' + (aviso ? " is-fin" : "") + '" data-descanso' + (activo || aviso ? "" : " hidden") + ">" +
    '<div class="sesion__descanso-fila">' +
      '<span class="sesion__descanso-etiqueta" data-descanso-etiqueta aria-live="polite">' +
        _sesionEsc(aviso ? t("ent.descanso_fin") : t("ent.descanso")) + "</span>" +
      '<strong class="sesion__descanso-reloj" data-descanso-reloj role="timer">' + (activo ? entrenoReloj(queda + 999) : "") + "</strong>" +
      '<span class="sesion__descanso-botones">' +
        '<button type="button" class="sesion__boton" data-accion="descanso-menos" aria-label="' + _sesionEsc(t("ent.descanso_menos")) + '">−15</button>' +
        '<button type="button" class="sesion__boton" data-accion="descanso-mas" aria-label="' + _sesionEsc(t("ent.descanso_mas")) + '">+15</button>' +
        '<button type="button" class="sesion__boton sesion__boton--fuerte" data-accion="descanso-saltar">' + _sesionEsc(t(aviso ? "ent.listo" : "ent.saltar")) + "</button>" +
      "</span>" +
    "</div>" +
    '<div class="sesion__descanso-barra" aria-hidden="true"><i data-descanso-barra></i></div>' +
  "</div>";
}

/** Toda la pantalla de una sesión en curso. Sin DOM. */
function entrenoSesionPantallaHtml(sesion, log, ahora) {
  var cuenta = _sesionContar(sesion);
  var pct = cuenta.total ? Math.round(cuenta.hechas / cuenta.total * 100) : 0;
  var sonido = _sesionSonidoOn();
  return '<header class="sesion__cabeza">' +
      '<button type="button" class="sesion__icono" data-accion="cerrar" data-foco="cerrar" aria-label="' + _sesionEsc(t("ent.volver_plan")) + '">' + SESION_ICONOS.atras + "</button>" +
      '<div class="sesion__titulos">' +
        '<h3 class="sesion__titulo" tabindex="-1" data-foco="titulo">' + _sesionEsc(_sesionNombre(sesion)) + "</h3>" +
        '<p class="sesion__meta"><span class="sesion__reloj" data-reloj>' + entrenoReloj(ahora - sesion.inicio) + "</span>" +
          " · <span data-cuenta>" + _sesionEsc(tFormat("ent.series_hechas", cuenta)) + "</span></p>" +
      "</div>" +
      '<button type="button" class="sesion__icono" data-accion="sonido" data-foco="sonido" aria-pressed="' + (sonido ? "true" : "false") + '"' +
        ' aria-label="' + _sesionEsc(t("ent.sonido")) + '">' + (sonido ? SESION_ICONOS.sonido : SESION_ICONOS.sinSonido) + "</button>" +
      '<button type="button" class="sesion__terminar" data-accion="terminar" data-foco="terminar">' + _sesionEsc(t("ent.terminar")) + "</button>" +
      '<div class="sesion__progreso" aria-hidden="true"><i style="width:' + pct + '%"></i></div>' +
    "</header>" +
    '<ol class="sesion__lista">' + sesion.ejercicios.map(function (e, i) { return _sesionEjercicioHtml(e, i, log); }).join("") + "</ol>" +
    '<div class="sesion__pie">' +
      '<button type="button" class="btn-secondary" data-accion="descartar" data-foco="descartar">' + _sesionEsc(t("ent.borrar_sesion")) + "</button>" +
      '<p class="sesion__nota">' + _sesionEsc(t("ent.guardado_local")) + "</p>" +
    "</div>" +
    _sesionDescansoHtml(sesion, ahora);
}

function _sesionTextoRecord(rec) {
  if (rec.tipo === "reps") {
    return rec.tiempo
      ? tFormat("ent.record_seg", { valor: tFormat("ent.segundos", { n: rec.reps }) })
      : tFormat("ent.record_reps", { valor: rec.reps });
  }
  return tFormat(rec.tipo === "kg" ? "ent.record_kg" : "ent.record_e1rm", { valor: entrenoKg(rec.kg) + " × " + rec.reps });
}

/** El resumen al terminar: tiempo, series, kilos movidos y récords. */
function entrenoResumenHtml(r) {
  var datos = [
    [t("ent.stat_tiempo"), r.minutos + " " + t("ent.min")],
    [t("ent.stat_series"), String(r.series)],
    [t("ent.stat_volumen"), entrenoMiles(r.volumen) + " " + t("ent.kg")],
    [t("ent.stat_records"), String(r.records.length)]
  ];
  var h = '<div class="sesion__resumen">' +
    (r.nombre ? '<p class="sesion__resumen-ojo">' + _sesionEsc(r.nombre) + "</p>" : "") +
    '<h3 class="sesion__resumen-titulo" tabindex="-1" data-foco="resumen">' + _sesionEsc(t("ent.resumen_titulo")) + "</h3>" +
    '<dl class="sesion__stats">' + datos.map(function (d) {
      return "<div><dt>" + _sesionEsc(d[0]) + "</dt><dd>" + _sesionEsc(d[1]) + "</dd></div>";
    }).join("") + "</dl>";
  if (r.records.length) {
    h += '<h4 class="sesion__resumen-sub">' + _sesionEsc(t("ent.records_nuevos")) + '</h4><ul class="sesion__records">' +
      r.records.map(function (rec) {
        return "<li><strong>" + _sesionEsc(entrenoNombre({ id: rec.id, name: rec.name })) + "</strong> " + _sesionEsc(_sesionTextoRecord(rec)) + "</li>";
      }).join("") + "</ul>";
  }
  return h + '<button type="button" class="sesion__terminar" data-accion="listo" data-foco="listo">' + _sesionEsc(t("ent.listo")) + "</button></div>";
}

// ── Sonido, vibración y pantalla encendida ──────────────────────────────

function _sesionSonidoOn() {
  try { return localStorage.getItem(ENTRENO_CLAVE_SONIDO) !== "0"; } catch (e) { return true; }
}

function _sesionPonerSonido(on) {
  try { localStorage.setItem(ENTRENO_CLAVE_SONIDO, on ? "1" : "0"); } catch (e) { /* solo esta visita */ }
}

/** El audio solo puede arrancar tras un toque: se prepara al marcar una serie. */
function _sesionPrepararAudio() {
  if (!_sesionSonidoOn()) return;
  try {
    var Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    if (!_sesionAudio) _sesionAudio = new Ctx();
    if (_sesionAudio.state === "suspended") _sesionAudio.resume();
  } catch (e) { _sesionAudio = null; }
}

/** Dos pitidos cortos y suaves. */
function _sesionPitido() {
  var a = _sesionAudio;
  if (!a || !_sesionSonidoOn()) return;
  try {
    [0, 0.24].forEach(function (desfase) {
      var o = a.createOscillator();
      var g = a.createGain();
      var t0 = a.currentTime + desfase;
      o.type = "sine";
      o.frequency.value = 880;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(0.28, t0 + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.18);
      o.connect(g);
      g.connect(a.destination);
      o.start(t0);
      o.stop(t0 + 0.2);
    });
  } catch (e) { /* sin audio: queda la vibración y el aviso en pantalla */ }
}

function _sesionVibrar(patron) {
  try {
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") navigator.vibrate(patron);
  } catch (e) { /* sin vibración */ }
}

/** Pantalla encendida mientras se entrena (Wake Lock); si no existe, no pasa nada. */
function _sesionDespierta(activa) {
  try {
    if (activa) {
      if (_sesionWake || typeof navigator === "undefined" || !navigator.wakeLock) return;
      navigator.wakeLock.request("screen").then(function (w) {
        _sesionWake = w;
        w.addEventListener("release", function () { _sesionWake = null; });
      }).catch(function () { /* denegado o en segundo plano */ });
    } else if (_sesionWake) {
      var w = _sesionWake;
      _sesionWake = null;
      w.release().catch(function () {});
    }
  } catch (e) { /* sin Wake Lock */ }
}

// ── Reloj y descanso ────────────────────────────────────────────────────

function _sesionTodoHecho(sesion) {
  var c = _sesionContar(sesion);
  return c.total > 0 && c.hechas === c.total;
}

function _sesionEmpezarDescanso(ejercicio) {
  var ms = Math.max(0, Number(ejercicio.descanso) || 0) * 1000;
  if (!ms) return;
  _sesionLog.enCurso.descansoHasta = Date.now() + ms;
  _sesionDescansoTotal = ms;
  _sesionAvisoHasta = 0;
}

function _sesionFinDescanso(ahora) {
  _sesionAvisoHasta = ahora + 5000;
  _sesionVibrar([180, 90, 180]);
  _sesionPitido();
}

/** Cada cuarto de segundo: el reloj de la sesión y la cuenta atrás del descanso. */
function _sesionTic() {
  var caja = _sesionCaja();
  if (!caja || !_sesionLog || !_sesionLog.enCurso || _sesionResumen) return;
  var panel = _sesionPanel();
  if (panel && panel.hidden) { entrenoSesionAlOcultar(); return; }
  var s = _sesionLog.enCurso;
  var ahora = Date.now();
  var reloj = caja.querySelector("[data-reloj]");
  if (reloj) {
    var texto = entrenoReloj(ahora - s.inicio);
    if (reloj.textContent !== texto) reloj.textContent = texto;
  }
  var barra = caja.querySelector("[data-descanso]");
  if (!barra) return;
  var etiqueta = barra.querySelector("[data-descanso-etiqueta]");
  var cuenta = barra.querySelector("[data-descanso-reloj]");
  var relleno = barra.querySelector("[data-descanso-barra]");
  var saltar = barra.querySelector('[data-accion="descanso-saltar"]');
  var textoSaltar = t(!s.descansoHasta && _sesionAvisoHasta > ahora ? "ent.listo" : "ent.saltar");
  if (saltar && saltar.textContent !== textoSaltar) saltar.textContent = textoSaltar;
  if (s.descansoHasta) {
    var queda = s.descansoHasta - ahora;
    if (queda <= 0) {
      s.descansoHasta = null;
      entrenoLogGuardar(_sesionLog);
      _sesionFinDescanso(ahora);
      _sesionTic();
      return;
    }
    var total = Math.max(_sesionDescansoTotal, queda);
    barra.hidden = false;
    barra.classList.remove("is-fin");
    if (etiqueta && etiqueta.textContent !== t("ent.descanso")) etiqueta.textContent = t("ent.descanso");
    var restante = entrenoReloj(queda + 999);
    if (cuenta && cuenta.textContent !== restante) cuenta.textContent = restante;
    if (relleno) relleno.style.width = (queda / total * 100).toFixed(1) + "%";
  } else if (_sesionAvisoHasta > ahora) {
    barra.hidden = false;
    barra.classList.add("is-fin");
    if (etiqueta && etiqueta.textContent !== t("ent.descanso_fin")) etiqueta.textContent = t("ent.descanso_fin");
    if (cuenta) cuenta.textContent = "";
    if (relleno) relleno.style.width = "0%";
  } else {
    barra.hidden = true;
  }
}

function _sesionArrancarTic() {
  if (_sesionTicId === null) _sesionTicId = setInterval(_sesionTic, 250);
}

function _sesionPararTic() {
  if (_sesionTicId !== null) clearInterval(_sesionTicId);
  _sesionTicId = null;
}

// ── Pintar y actuar ─────────────────────────────────────────────────────

function _sesionPintar(foco) {
  var caja = _sesionCaja();
  if (!caja) return;
  if (_sesionResumen) {
    caja.innerHTML = entrenoResumenHtml(_sesionResumen);
  } else if (_sesionLog && _sesionLog.enCurso) {
    // La técnica que estaba abierta sigue abierta después de marcar una serie.
    var abiertas = Array.prototype.map.call(caja.querySelectorAll("details[data-tec][open]"), function (d) {
      return d.getAttribute("data-tec");
    });
    caja.innerHTML = entrenoSesionPantallaHtml(_sesionLog.enCurso, _sesionLog, Date.now());
    abiertas.forEach(function (n) {
      var d = caja.querySelector('details[data-tec="' + n + '"]');
      if (d) d.open = true;
    });
    if (typeof entrenoAnimacionesActivar === "function") entrenoAnimacionesActivar(caja);
    _sesionTic();
  } else {
    entrenoSesionCerrar();
    return;
  }
  if (foco) {
    var el = caja.querySelector('[data-foco="' + foco + '"]');
    if (el) {
      try { el.focus({ preventScroll: true }); } catch (e) { el.focus(); }
    }
  }
}

function _sesionGuardar() {
  if (_sesionLog) entrenoLogGuardar(_sesionLog);
}

/** Lo escrito en las casillas de una serie pasa al diario (por si el evento input no llegó). */
function _sesionLeerCasillas(iEj, iSerie) {
  var caja = _sesionCaja();
  ["kg", "reps"].forEach(function (campo) {
    var input = caja && caja.querySelector('input[data-campo="' + campo + '"][data-ej="' + iEj + '"][data-serie="' + iSerie + '"]');
    if (!input) return;
    var cambio = {};
    cambio[campo] = input.value;
    entrenoLogPonerSerie(_sesionLog, iEj, iSerie, cambio);
  });
}

function _sesionMarcar(iEj, iSerie) {
  var s = _sesionLog.enCurso;
  var e = s.ejercicios[iEj];
  var serie = e && e.series[iSerie];
  if (!serie) return;
  _sesionLeerCasillas(iEj, iSerie);
  var hecha = !serie.hecha;
  if (hecha && !(serie.reps > 0)) {
    // Sin repeticiones no hay serie: se señala la casilla que falta.
    var reps = _sesionCaja().querySelector('input[data-campo="reps"][data-ej="' + iEj + '"][data-serie="' + iSerie + '"]');
    if (reps) {
      reps.classList.add("is-falta");
      reps.setAttribute("aria-invalid", "true");
      reps.focus();
    }
    return;
  }
  entrenoLogPonerSerie(_sesionLog, iEj, iSerie, { hecha: hecha }, Date.now());
  if (hecha && serie.kg !== null) {
    // El peso de esta serie pasa a las siguientes que aún no tienen: no hay que escribirlo tres veces.
    e.series.slice(iSerie + 1).forEach(function (s) { if (!s.hecha && s.kg === null) s.kg = serie.kg; });
  }
  _sesionPrepararAudio();
  _sesionVibrar(10);
  if (hecha && !_sesionTodoHecho(s)) _sesionEmpezarDescanso(e);
  _sesionGuardar();
  _sesionPintar("check-" + iEj + "-" + iSerie);
}

function _sesionAjustarDescanso(segundos) {
  var s = _sesionLog.enCurso;
  if (!s.descansoHasta) return;
  s.descansoHasta += segundos * 1000;
  if (segundos > 0) _sesionDescansoTotal += segundos * 1000;
  if (s.descansoHasta <= Date.now()) s.descansoHasta = Date.now() + 1000;
  _sesionGuardar();
  _sesionTic();
}

function _sesionTerminar() {
  var s = _sesionLog.enCurso;
  var cuenta = _sesionContar(s);
  if (!cuenta.hechas) {
    if (!window.confirm(t("ent.confirmar_terminar_vacio"))) return;
    _sesionLog.enCurso = null;
    _sesionGuardar();
    entrenoSesionCerrar();
    return;
  }
  if (cuenta.hechas < cuenta.total && !window.confirm(t("ent.confirmar_terminar"))) return;
  var nombre = _sesionNombre(s);
  _sesionResumen = entrenoLogTerminar(_sesionLog, Date.now());
  if (_sesionResumen) _sesionResumen.nombre = nombre;
  _sesionGuardar();
  _sesionPararTic();
  _sesionDespierta(false);
  _sesionVibrar([30, 60, 30]);
  _sesionPintar("resumen");
  window.scrollTo(0, 0);
}

function _sesionAccion(accion, boton) {
  var iEj = Number(boton.getAttribute("data-ej"));
  var iSerie = Number(boton.getAttribute("data-serie"));
  if (accion === "listo") { _sesionResumen = null; entrenoSesionCerrar(); return; }
  if (accion === "cerrar") { entrenoSesionCerrar(); return; }
  if (!_sesionLog || !_sesionLog.enCurso) return;
  if (accion === "tecnica") {
    // La animación pequeña abre (o cierra) la técnica con la grande.
    var d = _sesionCaja().querySelector('details[data-tec="' + iEj + '"]');
    if (d) {
      d.open = !d.open;
      if (d.open && typeof d.scrollIntoView === "function") d.scrollIntoView({ block: "nearest" });
    }
    return;
  }
  if (accion === "check") _sesionMarcar(iEj, iSerie);
  else if (accion === "mas") { if (entrenoLogAnadirSerie(_sesionLog, iEj)) { _sesionGuardar(); _sesionPintar("mas-" + iEj); } }
  else if (accion === "menos") { if (entrenoLogQuitarSerie(_sesionLog, iEj)) { _sesionGuardar(); _sesionPintar("menos-" + iEj); } }
  else if (accion === "terminar") _sesionTerminar();
  else if (accion === "descartar") entrenoSesionDescartar();
  else if (accion === "sonido") { _sesionPonerSonido(!_sesionSonidoOn()); _sesionPrepararAudio(); _sesionPintar("sonido"); }
  else if (accion === "descanso-menos") _sesionAjustarDescanso(-ENTRENO_DESCANSO_PASO_S);
  else if (accion === "descanso-mas") _sesionAjustarDescanso(ENTRENO_DESCANSO_PASO_S);
  else if (accion === "descanso-saltar") {
    _sesionLog.enCurso.descansoHasta = null;
    _sesionAvisoHasta = 0;
    _sesionGuardar();
    _sesionTic();
  }
}

// ── Lo que usa el resto de la pantalla ──────────────────────────────────

/** Abre la sesión en curso (o el resumen recién terminado). false si no hay nada que abrir. */
function entrenoSesionAbrir(log) {
  _sesionLog = log || entrenoLogLeer();
  var panel = _sesionPanel();
  var caja = _sesionCaja();
  if (!panel || !caja || (!_sesionLog.enCurso && !_sesionResumen)) return false;
  panel.classList.add("is-sesion");
  document.body.classList.add("modo-sesion");
  caja.hidden = false;
  _sesionPintar("titulo");
  _sesionArrancarTic();
  _sesionDespierta(true);
  window.scrollTo(0, 0);
  return true;
}

/** Empieza una sesión del plan. Si ya hay otra sin terminar, pregunta antes de sustituirla. */
function entrenoSesionEmpezar(sesionPlan, semana) {
  if (!sesionPlan || !Array.isArray(sesionPlan.exercises) || !sesionPlan.exercises.length) return false;
  var log = entrenoLogLeer();
  if (log.enCurso && !window.confirm(t("ent.confirmar_reemplazar"))) return false;
  entrenoLogIniciar(log, sesionPlan, semana, Date.now());
  entrenoLogGuardar(log);
  _sesionResumen = null;
  _sesionAvisoHasta = 0;
  return entrenoSesionAbrir(log);
}

/** Vuelve al plan. La sesión, si la hay, sigue en curso y el panel ofrece continuarla. */
function entrenoSesionCerrar() {
  _sesionPararTic();
  _sesionDespierta(false);
  _sesionResumen = null;
  var panel = _sesionPanel();
  if (panel) panel.classList.remove("is-sesion");
  document.body.classList.remove("modo-sesion");
  var caja = _sesionCaja();
  if (caja) {
    caja.hidden = true;
    caja.innerHTML = "";
  }
  if (typeof renderEntreno === "function") renderEntreno();
  window.scrollTo(0, 0);
}

/** Borra la sesión en curso, si el usuario lo confirma. */
function entrenoSesionDescartar() {
  var log = _sesionLog || entrenoLogLeer();
  if (!log.enCurso) return false;
  if (!window.confirm(t("ent.confirmar_borrar"))) return false;
  log.enCurso = null;
  entrenoLogGuardar(log);
  _sesionLog = log;
  if (_sesionAbierta()) entrenoSesionCerrar();
  else if (typeof renderEntreno === "function") renderEntreno();
  return true;
}

function entrenoSesionAlMostrar() {
  if (!_sesionAbierta()) return;
  document.body.classList.add("modo-sesion");
  _sesionPintar();
  if (!_sesionResumen) {
    _sesionArrancarTic();
    _sesionDespierta(true);
  }
}

function entrenoSesionAlOcultar() {
  _sesionPararTic();
  _sesionDespierta(false);
  document.body.classList.remove("modo-sesion");
}

function entrenoSesionRepintar() {
  if (_sesionAbierta()) _sesionPintar();
}

function initEntrenoSesion() {
  var caja = _sesionCaja();
  if (!caja || _sesionCableado) return;
  _sesionCableado = true;
  caja.addEventListener("click", function (ev) {
    var boton = ev.target.closest("[data-accion]");
    if (boton && caja.contains(boton)) _sesionAccion(boton.getAttribute("data-accion"), boton);
  });
  caja.addEventListener("input", function (ev) {
    var campo = ev.target.closest("input[data-campo]");
    if (!campo || !_sesionLog || !_sesionLog.enCurso) return;
    campo.classList.remove("is-falta");
    campo.removeAttribute("aria-invalid");
    var cambio = {};
    cambio[campo.getAttribute("data-campo")] = campo.value;
    entrenoLogPonerSerie(_sesionLog, Number(campo.getAttribute("data-ej")), Number(campo.getAttribute("data-serie")), cambio);
    _sesionGuardar();
  });
  // «Intro» en una casilla pasa a la siguiente, como en un formulario de gimnasio.
  caja.addEventListener("keydown", function (ev) {
    if (ev.key !== "Enter") return;
    var campo = ev.target.closest("input[data-campo]");
    if (!campo) return;
    ev.preventDefault();
    var campos = Array.prototype.slice.call(caja.querySelectorAll("input[data-campo]"));
    var siguiente = campos[campos.indexOf(campo) + 1];
    if (siguiente) siguiente.focus();
    else campo.blur();
  });
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "visible" && _sesionAbierta() && !_sesionResumen) {
      _sesionDespierta(true);
      _sesionTic();
    }
  });
}
