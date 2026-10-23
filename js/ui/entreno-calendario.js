/**
 * js/ui/entreno-calendario.js
 * ─────────────────────────────────────────────────────────────────────────
 * «PLAN»: EL CALENDARIO DEL MES (2026-10-23). La hoja de ruta del dueño, etapa
 * 1, «Calendario de entrenamientos»: hasta hoy había la semana de «Inicio» y
 * la exportación .ics, sin vista de meses.
 *
 * Una cuadrícula de lunes a domingo con:
 *   - los días con sesión hecha (del diario, js/core/workout-log.js);
 *   - los días que tocan según el plan de ahora, SOLO de hoy en adelante: el
 *     plan de semanas pasadas no se guarda, así que no se inventa qué tocaba;
 *   - hoy, marcado.
 * Al tocar un día, debajo sale lo de ese día: las sesiones hechas, con «Ver
 * los resultados» (data-ver-sesion, lo recoge js/ui/entreno-pestanas.js), la
 * que toca (hoy, con «Empezar», data-empezar de render-entreno.js) o «descanso».
 * Se puede ir hacia atrás hasta el mes de la primera sesión y hacia delante
 * ENTRENO_CAL_MESES_DELANTE meses. Con el teclado, las flechas mueven el día
 * elegido (solo el elegido está en el orden de tabulación).
 *
 * Expone (globales):
 *   entrenoCalendarioDatos(plan, log, mes, ahora)  los días del mes, sin DOM (lo prueban los tests)
 *   entrenoCalendarioHtml(datos, elegido, plan)    marcado del calendario y del día elegido, sin DOM
 *   renderEntrenoCalendario(plan, log)             pinta #entrenoCalendario (lo llama renderEntreno)
 *   initEntrenoCalendario()                        cablea los botones (una vez)
 * `mes` es año × 12 + mes (0–11), para ir de uno a otro sumando.
 * ─────────────────────────────────────────────────────────────────────────
 */

var ENTRENO_CAL_MESES_DELANTE = 3;
var _calMes = null;      // el mes que se ve; null: el de hoy
var _calElegido = null;  // la medianoche del día elegido; null: hoy (o el 1 si hoy no está en el mes)
var _calPlan = null;
var _calLog = null;
var _calCableado = false;

function _calEsc(texto) { return escapeHtml(String(texto)); }

function _calLocale() {
  var lang = typeof getLang === "function" ? getLang() : "es";
  return (typeof LANG_LOCALES !== "undefined" && LANG_LOCALES[lang]) || "es-ES";
}

function _calMedianoche(ms) {
  var d = new Date(ms);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function _calMesDe(ms) {
  var d = new Date(ms);
  return d.getFullYear() * 12 + d.getMonth();
}

function _calFecha(ms, opciones) {
  try {
    return new Date(ms).toLocaleDateString(_calLocale(), opciones);
  } catch (e) {
    var d = new Date(ms);
    return d.getDate() + "." + (d.getMonth() + 1) + "." + d.getFullYear();
  }
}

function _calMayuscula(texto) {
  var s = String(texto);
  return s.charAt(0).toLocaleUpperCase() + s.slice(1);
}

/**
 * Los días del mes en semanas de lunes a domingo, con los de los meses de al
 * lado para completar. Sin DOM.
 * @returns {{mes:number, semanas:object[][], sesiones:number, antes:boolean, despues:boolean, esActual:boolean}}
 *          cada día: { ms, dia, diaSemana (1 = lunes), fuera, hoy, pasado, hechas: [sesiones], plan: [{sesion, indice}] }
 */
function entrenoCalendarioDatos(plan, log, mes, ahora) {
  var anio = Math.floor(mes / 12);
  var numMes = mes - anio * 12;
  var hoy = _calMedianoche(ahora);
  var porDia = {};
  ((plan && plan.ok && plan.sesiones) || []).forEach(function (s, i) {
    if (!s.exercises || !s.exercises.length) return;
    (porDia[s.dia] = porDia[s.dia] || []).push({ sesion: s, indice: i });
  });
  var hechas = {};
  var primera = Infinity;
  ((log && log.sesiones) || []).forEach(function (s) {
    var k = _calMedianoche(s.inicio);
    (hechas[k] = hechas[k] || []).push(s);
    if (s.inicio < primera) primera = s.inicio;
  });
  var desplazamiento = (new Date(anio, numMes, 1).getDay() + 6) % 7;
  var diasMes = new Date(anio, numMes + 1, 0).getDate();
  var nSemanas = Math.ceil((desplazamiento + diasMes) / 7);
  var semanas = [];
  var sesiones = 0;
  for (var w = 0; w < nSemanas; w++) {
    var fila = [];
    for (var k = 0; k < 7; k++) {
      var d = new Date(anio, numMes, 1 - desplazamiento + w * 7 + k);
      var ms = d.getTime();
      var fuera = d.getMonth() !== numMes;
      var delDia = (hechas[ms] || []).slice().sort(function (a, b) { return a.inicio - b.inicio; });
      if (!fuera) sesiones += delDia.length;
      fila.push({
        ms: ms, dia: d.getDate(), diaSemana: k + 1, fuera: fuera, hoy: ms === hoy, pasado: ms < hoy,
        hechas: delDia, plan: ms < hoy ? [] : (porDia[k + 1] || [])
      });
    }
    semanas.push(fila);
  }
  var mesHoy = _calMesDe(ahora);
  var desde = isFinite(primera) ? Math.min(_calMesDe(primera), mesHoy) : mesHoy;
  return {
    mes: mes, semanas: semanas, sesiones: sesiones,
    antes: desde < mes, despues: mes < mesHoy + ENTRENO_CAL_MESES_DELANTE, esActual: mes === mesHoy
  };
}

function _calNombrePlan(p) {
  return typeof entrenoNombreSesion === "function" ? entrenoNombreSesion(p.sesion) : p.sesion.name;
}

function _calNombreHecha(s) {
  return typeof entrenoLogNombreSesion === "function" ? entrenoLogNombreSesion(s) : (s.nombre || "");
}

/** Lo que dice un lector de pantalla de un día. */
function _calDiaEtiqueta(x) {
  var fecha = _calFecha(x.ms, { weekday: "long", day: "numeric", month: "long" });
  if (x.hechas.length) return tFormat("ent.cal_dia_hecho", { fecha: fecha, n: x.hechas.length });
  if (x.plan.length) return tFormat("ent.cal_dia_plan", { fecha: fecha, nombre: x.plan.map(_calNombrePlan).join(", ") });
  return tFormat(x.pasado ? "ent.cal_dia_nada" : "ent.cal_dia_libre", { fecha: fecha });
}

function _calDiaHtml(x, elegido) {
  var clase = "entreno__cal-dia" + (x.hechas.length ? " is-hecho" : "") + (x.plan.length && !x.hechas.length ? " is-plan" : "") +
    (x.hoy ? " is-hoy" : "") + (x.ms === elegido ? " is-elegido" : "");
  // Los días del mes de al lado llevan la misma forma (número y marca) para quedar a la misma altura.
  if (x.fuera) {
    return '<td class="entreno__cal-celda is-fuera"><span class="entreno__cal-dia is-fuera" aria-hidden="true">' +
      '<span class="entreno__cal-num">' + x.dia + '</span><i class="entreno__cal-marca"></i></span></td>';
  }
  return '<td class="entreno__cal-celda">' +
    '<button type="button" class="' + clase + '" data-cal-dia="' + x.ms + '" aria-pressed="' + (x.ms === elegido) + '"' +
      ' tabindex="' + (x.ms === elegido ? 0 : -1) + '"' + (x.hoy ? ' aria-current="date"' : "") +
      ' aria-label="' + _calEsc(_calDiaEtiqueta(x)) + '">' +
      '<span class="entreno__cal-num">' + x.dia + "</span>" +
      '<i class="entreno__cal-marca" aria-hidden="true"></i>' +
    "</button></td>";
}

/** Lo del día elegido, debajo de la cuadrícula. */
function _calDetalleHtml(x) {
  var h = '<h4 class="entreno__cal-detalle-titulo">' + _calEsc(_calMayuscula(_calFecha(x.ms, { weekday: "long", day: "numeric", month: "long" }))) + "</h4>";
  var filas = [];
  x.hechas.forEach(function (s) {
    var tot = entrenoLogTotales(s);
    filas.push('<li class="entreno__cal-sesion is-hecho">' +
      '<span class="entreno__cal-sesion-texto"><strong>' + _calEsc(_calNombreHecha(s)) + "</strong>" +
        "<span>" + _calEsc(tFormat("ent.cal_hecha_datos", { min: tot.minutos, n: tot.series })) + "</span></span>" +
      '<button type="button" class="btn-secondary" data-ver-sesion="' + _calEsc(s.id) + '">' + _calEsc(t("ent.ultima_ver")) + "</button>" +
    "</li>");
  });
  if (!x.hechas.length) {
    x.plan.forEach(function (p) {
      filas.push('<li class="entreno__cal-sesion is-plan">' +
        '<span class="entreno__cal-sesion-texto"><strong>' + _calEsc(_calNombrePlan(p)) + "</strong>" +
          "<span>" + _calEsc(tFormat("ent.elegir_datos", { n: p.sesion.exercises.length })) + "</span></span>" +
        (x.hoy ? '<button type="button" class="btn-secondary" data-empezar="' + p.indice + '">' + _calEsc(t("ent.elegir_empezar")) + "</button>" : "") +
      "</li>");
    });
  }
  if (!filas.length) return h + '<p class="entreno__cal-vacio">' + _calEsc(t(x.pasado ? "ent.cal_nada" : "ent.cal_descanso")) + "</p>";
  return h + '<ul class="entreno__cal-sesiones">' + filas.join("") + "</ul>";
}

/** El calendario entero: cabecera con el mes y las flechas, la cuadrícula, la leyenda y el día elegido. Sin DOM. */
function entrenoCalendarioHtml(datos, elegido) {
  var primerDia = null;
  var elegidoDia = null;
  datos.semanas.forEach(function (fila) {
    fila.forEach(function (x) {
      if (x.fuera) return;
      if (!primerDia) primerDia = x;
      if (x.ms === elegido) elegidoDia = x;
    });
  });
  if (!elegidoDia) {
    datos.semanas.forEach(function (fila) { fila.forEach(function (x) { if (!x.fuera && x.hoy) elegidoDia = x; }); });
  }
  elegidoDia = elegidoDia || primerDia;
  // El mes solo y el año aparte: con { month, year } el ruso añade «г.» y cambia el caso del mes.
  var anio = Math.floor(datos.mes / 12);
  var nombreMes = _calMayuscula(_calFecha(new Date(anio, datos.mes % 12, 1).getTime(), { month: "long" })) + " " + anio;
  var cabecera = [1, 2, 3, 4, 5, 6, 7].map(function (d) {
    return '<th scope="col" abbr="' + _calEsc(t("ent.dia_" + d)) + '">' + _calEsc(t("ent.dia_corto_" + d)) + "</th>";
  }).join("");
  var cuerpo = datos.semanas.map(function (fila) {
    return "<tr>" + fila.map(function (x) { return _calDiaHtml(x, elegidoDia.ms); }).join("") + "</tr>";
  }).join("");
  return '<div class="entreno__cal-cabeza">' +
      '<h3 class="entreno__subtitulo" id="entrenoCalTitulo">' + _calEsc(t("ent.cal_titulo")) + "</h3>" +
      (datos.esActual ? "" : '<button type="button" class="entreno__mini-btn" data-cal-mes="0">' + _calEsc(t("ent.cal_hoy")) + "</button>") +
    "</div>" +
    '<div class="entreno__cal-nav">' +
      '<button type="button" class="entreno__cal-flecha" data-cal-mes="-1" aria-label="' + _calEsc(t("ent.cal_anterior")) + '"' + (datos.antes ? "" : " disabled") + ">&lsaquo;</button>" +
      '<p class="entreno__cal-mes" id="entrenoCalMes" aria-live="polite">' + _calEsc(nombreMes) +
        '<span class="entreno__cal-cuenta">' + _calEsc(tFormat("ent.cal_cuenta", { n: datos.sesiones })) + "</span></p>" +
      '<button type="button" class="entreno__cal-flecha" data-cal-mes="1" aria-label="' + _calEsc(t("ent.cal_siguiente")) + '"' + (datos.despues ? "" : " disabled") + ">&rsaquo;</button>" +
    "</div>" +
    '<table class="entreno__cal" aria-labelledby="entrenoCalMes"><thead><tr>' + cabecera + "</tr></thead><tbody>" + cuerpo + "</tbody></table>" +
    '<ul class="entreno__cal-leyenda" aria-hidden="true">' +
      '<li><i class="entreno__cal-muestra is-hecho"></i>' + _calEsc(t("ent.cal_leyenda_hecho")) + "</li>" +
      '<li><i class="entreno__cal-muestra is-plan"></i>' + _calEsc(t("ent.cal_leyenda_plan")) + "</li>" +
      '<li><i class="entreno__cal-muestra is-hoy"></i>' + _calEsc(t("ent.cal_leyenda_hoy")) + "</li>" +
    "</ul>" +
    '<div class="entreno__cal-detalle" aria-live="polite">' + _calDetalleHtml(elegidoDia) + "</div>";
}

function _calPintar(conFoco) {
  var caja = document.getElementById("entrenoCalendario");
  if (!caja) return;
  var ahora = Date.now();
  var mes = _calMes === null ? _calMesDe(ahora) : _calMes;
  caja.innerHTML = entrenoCalendarioHtml(entrenoCalendarioDatos(_calPlan, _calLog, mes, ahora), _calElegido === null ? _calMedianoche(ahora) : _calElegido);
  caja.hidden = false;
  if (conFoco) {
    var dia = caja.querySelector('[data-cal-dia][tabindex="0"]');
    if (dia) dia.focus();
  }
}

function renderEntrenoCalendario(plan, log) {
  _calPlan = plan;
  _calLog = log;
  _calPintar(false);
}

/** Va a otro mes (-1, +1) o al de hoy (0), dentro de los límites; el día elegido pasa a ese mes. */
function _calIrMes(paso) {
  var ahora = Date.now();
  var actual = _calMes === null ? _calMesDe(ahora) : _calMes;
  var datos = entrenoCalendarioDatos(_calPlan, _calLog, actual, ahora);
  if (paso === 0) { _calMes = null; _calElegido = null; _calPintar(false); return; }
  if ((paso < 0 && !datos.antes) || (0 < paso && !datos.despues)) return;
  _calMes = actual + paso;
  var hoyMes = _calMesDe(ahora);
  _calElegido = _calMes === hoyMes ? null : new Date(Math.floor(_calMes / 12), _calMes % 12, 1).getTime();
  _calPintar(false);
  // El botón se pintó de nuevo: el foco vuelve a la misma flecha (o, si ya no se puede seguir, al día elegido).
  var caja = document.getElementById("entrenoCalendario");
  var flecha = caja && caja.querySelector('[data-cal-mes="' + paso + '"]:not([disabled])');
  var elegido = caja && caja.querySelector('[data-cal-dia][tabindex="0"]');
  if (flecha) flecha.focus();
  else if (elegido) elegido.focus();
}

/** Flechas: un día a los lados, una semana arriba y abajo; Inicio y Fin, la semana. Cambia de mes si hace falta. */
function _calMover(desde, tecla) {
  var d = new Date(desde);
  var dia = (d.getDay() + 6) % 7;
  var salto = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7, Home: -dia, End: 6 - dia }[tecla];
  if (salto === undefined) return false;
  var destino = new Date(d.getFullYear(), d.getMonth(), d.getDate() + salto).getTime();
  var ahora = Date.now();
  var mes = _calMesDe(destino);
  var actual = _calMes === null ? _calMesDe(ahora) : _calMes;
  if (mes !== actual) {
    var datos = entrenoCalendarioDatos(_calPlan, _calLog, actual, ahora);
    if ((mes < actual && !datos.antes) || (actual < mes && !datos.despues)) return true;
    _calMes = mes;
  }
  _calElegido = destino;
  _calPintar(true);
  return true;
}

function initEntrenoCalendario() {
  var caja = document.getElementById("entrenoCalendario");
  if (!caja || _calCableado) return;
  _calCableado = true;
  caja.addEventListener("click", function (ev) {
    var mes = ev.target.closest("[data-cal-mes]");
    if (mes) { _calIrMes(Number(mes.getAttribute("data-cal-mes"))); return; }
    var dia = ev.target.closest("[data-cal-dia]");
    if (!dia) return;
    _calElegido = Number(dia.getAttribute("data-cal-dia"));
    _calPintar(true);
  });
  caja.addEventListener("keydown", function (ev) {
    var dia = ev.target.closest && ev.target.closest("[data-cal-dia]");
    if (dia && _calMover(Number(dia.getAttribute("data-cal-dia")), ev.key)) ev.preventDefault();
  });
}
