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
 * Desde el 2026-10-23 (propuesta de diseño del dueño, punto 6) «Progreso» va
 * por periodos (7 días, mes, 3 meses, año, todo): arriba las cifras del
 * periodo y debajo cuatro apartados en pestañas: «Fuerza» (récords y cada
 * ejercicio), «Volumen» (kilos por tramo y músculos), «Regularidad» (la
 * semana, sesiones por tramo e historial) y «Cuerpo» (el peso). Tocar un
 * punto de una gráfica o un récord abre esa sesión en el historial. El
 * periodo y el apartado se recuerdan en ENTRENO_PROGRESO_CLAVE.
 *
 * Expone (globales):
 *   initEntrenoProgreso()                 cablea los botones (una vez)
 *   renderEntrenoProgreso(log, plan)      pinta #entrenoReanudar, #entrenoUltima y #entrenoProgreso
 *   entrenoReanudarHtml(log, ahora)       marcado del aviso de sesión sin terminar ("" si no hay)
 *   entrenoProgresoHtml(log, plan, ahora, estado)
 *                                         marcado del progreso, sin DOM (lo prueban los tests);
 *                                         estado: { periodo, vista, pesos, medidas, forzada }
 *   entrenoProgresoEstadoLeer()           el periodo y el apartado guardados
 *   entrenoProgresoVerSesion(id)          enseña esa sesión, abierta, en «Regularidad»
 *   entrenoEjerciciosHtml(log, periodo)   marcado del progreso por ejercicio, sin DOM
 *   entrenoMusculosCargaHtml(log, ahora, periodo)  marcado de la carga por músculo, sin DOM
 *   entrenoHace(ms)                       "hace 25 min" / "hace 3 h" / "hace 2 d"
 *   entrenoUltimaSesionHtml(log)          «Inicio»: la última sesión y el último récord, sin DOM
 *   entrenoUltimoRecord(log)              el ejercicio del récord más reciente, o null
 *   entrenoPesoHtml(lista, ahora, periodo) el peso corporal (con periodo, también su gráfica), sin DOM
 *   entrenoFichaResultadosHtml(id, log)   la página de un ejercicio: récords, gráfica y últimas veces, sin DOM
 *
 * Con la barra de secciones (js/ui/entreno-pestanas.js, 2026-10-21) el aviso de
 * la sesión sin terminar sale en «Inicio» y en «Entrenar», la última sesión en
 * «Inicio», y el resto en «Progreso».
 * ─────────────────────────────────────────────────────────────────────────
 */

var ENTRENO_HISTORIAL_N = 30;
var ENTRENO_EJERCICIOS_N = 12;
var ENTRENO_PUNTOS_GRAFICA = 16;
var ENTRENO_DIAS_MUSCULOS = 28;
var ENTRENO_RECORDS_N = 8;
var ENTRENO_VISTAS = ["fuerza", "volumen", "regularidad", "cuerpo"];
// De la persona activa (js/core/perfiles.js, 2026-10-26): el titular, la de siempre.
var ENTRENO_PROGRESO_CLAVE = (typeof perfilClave === "function") ? perfilClave("nutritionPlanner.entrenoProgreso.v1") : "nutritionPlanner.entrenoProgreso.v1";
var _progresoCableado = false;
// La sesión que se pidió ver (un punto de una gráfica, un récord): sale en el historial aunque caiga fuera del periodo.
var _progresoForzada = "";

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
  return typeof entrenoLogNombreSesion === "function" ? entrenoLogNombreSesion(s) : tOr("ent.sesion_" + s.clave, s.nombre || "");
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

/** Cómo se llama un tramo: el día, la semana (por su lunes) o el mes; `corta`, para debajo de la barra. */
function _progresoTramoFecha(tramo, paso, corta) {
  var d = new Date(tramo.inicio);
  try {
    if (paso === "mes") return d.toLocaleDateString(_progresoLocale(), corta ? { month: "short" } : { month: "long", year: "numeric" });
    if (paso === "dia") return corta ? d.toLocaleDateString(_progresoLocale(), { weekday: "short" }) : _progresoFecha(tramo.inicio);
  } catch (e) {
    return (paso === "mes" ? "" : d.getDate() + ".") + (d.getMonth() + 1);
  }
  return corta ? _progresoDiaMes(tramo.inicio) : tFormat("ent.tramo_semana", { fecha: _progresoDiaMes(tramo.inicio) });
}

/**
 * Una barra por tramo del periodo con los kilos ("volumen") o las sesiones
 * ("sesiones"). Con muchas barras, la fecha va solo en una de cada pocas,
 * contando desde la última. "" si todo es cero.
 */
function _progresoBarrasHtml(tramos, campo, periodo) {
  var max = tramos.reduce(function (m, x) { return Math.max(m, x[campo]); }, 0);
  if (!max) return "";
  var n = tramos.length;
  var cada = n <= 8 ? 1 : Math.ceil(n / 7);
  var barras = tramos.map(function (x, i) {
    var alto = x[campo] ? Math.max(4, Math.round(x[campo] / max * 100)) : 0;
    var valor = campo === "volumen" ? entrenoMiles(x.volumen) + " " + t("ent.kg") : tFormat("ent.barra_sesiones", { n: x.sesiones });
    var etiqueta = tFormat("ent.grafica_barra", { fecha: _progresoTramoFecha(x, periodo.paso, false), valor: valor });
    var fecha = (n - 1 - i) % cada === 0 ? _progresoTramoFecha(x, periodo.paso, true) : "";
    return '<li class="entreno__barra' + (i === n - 1 ? " is-actual" : "") + '" aria-label="' + _progresoEsc(etiqueta) + '">' +
      '<span class="entreno__barra-col"><i style="height:' + alto + '%"></i></span>' +
      '<span class="entreno__barra-fecha" aria-hidden="true">' + _progresoEsc(fecha) + "</span></li>";
  }).join("");
  return '<h4 class="entreno__progreso-sub">' + _progresoEsc(t("ent." + campo + "_paso_" + periodo.paso)) + "</h4>" +
    '<ol class="entreno__grafica">' + barras + "</ol>";
}

/**
 * Carga por músculo: una barra por grupo, con la media por semana. Sin
 * periodo, las últimas 4 semanas; con él, los días del periodo.
 */
function entrenoMusculosCargaHtml(log, ahora, periodo) {
  if (typeof entrenoStatsMusculos !== "function") return "";
  var grupos = entrenoStatsMusculos(log, ahora, periodo ? periodo.dias : ENTRENO_DIAS_MUSCULOS);
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
  return '<h4 class="entreno__progreso-sub">' + _progresoEsc(t(periodo ? "ent.musculos_titulo_periodo" : "ent.musculos_titulo")) + "</h4>" +
    '<ul class="entreno__musculos">' + filas + "</ul>" +
    '<p class="entreno__progreso-nota">' + _progresoEsc(t("ent.musculos_como")) + "</p>";
}

function _progresoValorTexto(x, p) {
  if (x.tipo === "tiempo") return tFormat("ent.segundos", { n: p.reps });
  if (x.tipo === "reps") return tFormat("ent.reps_n", { n: p.reps });
  return entrenoKg(p.kg) + " × " + p.reps;
}

/**
 * La gráfica de un ejercicio: línea y puntos, con la escala abajo. "" con
 * menos de dos sesiones. `tocable`: cada punto abre su sesión (data-ver-sesion,
 * js/ui/entreno-pestanas.js), con un círculo invisible más grande que el dedo.
 */
function _progresoLineaHtml(x, tocable) {
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
  var toques = "";
  if (tocable && g.marcas.length === puntos.length) {
    toques = puntos.map(function (p, i) {
      if (!p.sid) return "";
      var texto = tFormat("ent.punto_ver", { fecha: _progresoFecha(p.t), valor: _progresoValorTexto(x, p) });
      return '<circle class="entreno__linea-toque" cx="' + g.marcas[i].x + '" cy="' + g.marcas[i].y + '" r="11" tabindex="0" role="button"' +
        ' data-ver-sesion="' + _progresoEsc(p.sid) + '" aria-label="' + _progresoEsc(texto) + '"><title>' + _progresoEsc(texto) + "</title></circle>";
    }).join("");
  }
  return '<figure class="entreno__linea">' +
    // Con puntos que se tocan es un grupo: lo que hay dentro de role="img" no se puede pulsar.
    '<svg viewBox="0 0 300 90" role="' + (toques ? "group" : "img") + '" aria-label="' + _progresoEsc(etiqueta) + '" focusable="false">' +
      '<path class="entreno__linea-trazo" d="' + g.path + '"/>' + marcas + toques + "</svg>" +
    '<figcaption class="entreno__linea-pie"><span>' + _progresoEsc(_progresoDiaMes(puntos[0].t)) + "</span>" +
      '<span>' + _progresoEsc(x.tipo === "peso" ? t("ent.grafica_e1rm") : t("ent.grafica_mejor")) + "</span>" +
      "<span>" + _progresoEsc(_progresoDiaMes(puntos[puntos.length - 1].t)) + "</span></figcaption>" +
  "</figure>";
}

/**
 * Un ejercicio dentro del periodo: sus puntos del periodo y cuántas sesiones
 * caen dentro, o null si no se hizo en él. Con una sola sesión dentro se
 * antepone la anterior, para ver cuánto cambió desde entonces.
 */
function _progresoEjercicioEnPeriodo(x, periodo) {
  var dentro = x.puntos.filter(function (p) { return periodo.desde <= p.t && p.t <= periodo.hasta; });
  if (!dentro.length) return null;
  var n = dentro.length;
  if (n === 1) {
    var antes = x.puntos.filter(function (p) { return p.t < periodo.desde; });
    if (antes.length) dentro.unshift(antes[antes.length - 1]);
  }
  return { id: x.id, name: x.name, tipo: x.tipo, sesiones: n, puntos: dentro, mejor: x.mejor };
}

/**
 * El progreso de cada ejercicio hecho (los más recientes primero), desplegable
 * con su gráfica. Con periodo, solo lo de ese periodo y con puntos que se tocan.
 */
function entrenoEjerciciosHtml(log, periodo) {
  if (typeof entrenoStatsEjercicios !== "function") return "";
  var lista = entrenoStatsEjercicios(log);
  if (periodo) lista = lista.map(function (x) { return _progresoEjercicioEnPeriodo(x, periodo); }).filter(Boolean);
  lista = lista.slice(0, ENTRENO_EJERCICIOS_N);
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
      _progresoLineaHtml(x, !!periodo) +
      '<p class="entreno__ej-mejor">' + _progresoEsc(mejor) + "</p>" +
      // La página entera del ejercicio: récords, últimas veces y cómo se hace.
      '<button type="button" class="btn-secondary entreno__ej-ficha" data-anim-abrir="' + _progresoEsc(x.id) + '">' +
        _progresoEsc(t("ent.ficha_abrir")) + "</button>" +
    "</details></li>";
  }).join("");
  return '<h4 class="entreno__progreso-sub">' + _progresoEsc(t("ent.progreso_ejercicios")) + "</h4>" +
    '<ul class="entreno__ejs">' + items + "</ul>" +
    '<p class="entreno__progreso-nota">' + _progresoEsc(t("ent.progreso_como") + (periodo ? " " + t("ent.grafica_toca") : "")) + "</p>";
}

function _progresoSesionHtml(s) {
  var tot = entrenoLogTotales(s);
  var resumen = [
    tot.minutos + " " + t("ent.min"),
    tFormat("ent.n_series", { n: tot.series })
  ];
  if (tot.volumen) resumen.push(entrenoMiles(tot.volumen) + " " + t("ent.kg"));
  // Cómo se encontraba ese día (2026-10-25), si lo apuntó.
  if (s.animo) resumen.push(tFormat("ent.hist_animo", { animo: t("ent.animo_" + s.animo).toLocaleLowerCase() }));
  var ejercicios = s.ejercicios.map(function (e) {
    var tiempo = / s( por lado)?$/.test(String(e.reps));
    var trabajo = e.series.filter(function (x) { return x.tipo !== "c"; });
    var calentar = e.series.length - trabajo.length;
    var reserva = typeof entrenoRirTexto === "function" ? entrenoRirTexto(trabajo) : "";
    return "<li><span>" + _progresoEsc(entrenoNombre({ id: e.id, name: e.name })) + "</span> " +
      '<span class="entreno__hist-series">' + _progresoEsc(entrenoSeriesTexto(trabajo.length ? trabajo : e.series, tiempo)) +
        (calentar && trabajo.length ? " · " + _progresoEsc(tFormat("ent.hist_calentamiento", { n: calentar })) : "") +
        (reserva ? " · " + _progresoEsc(reserva) : "") + "</span>" +
      (e.nota ? '<span class="entreno__hist-nota">' + _progresoEsc(e.nota) + "</span>" : "") + "</li>";
  }).join("");
  return '<li class="entreno__hist-item" data-sesion="' + _progresoEsc(s.id) + '"><details>' +
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

/** Las sesiones del periodo (las más recientes primero, hasta ENTRENO_HISTORIAL_N) y la descarga en CSV. */
function _progresoHistorialHtml(log, periodo, forzada) {
  var dentro = log.sesiones.filter(function (s) { return periodo.desde <= s.inicio && s.inicio <= periodo.hasta; });
  var lista = dentro.slice(-ENTRENO_HISTORIAL_N);
  if (forzada && !lista.some(function (s) { return s.id === forzada; })) {
    var pedida = log.sesiones.filter(function (s) { return s.id === forzada; })[0];
    if (pedida) lista = lista.concat([pedida]).sort(function (a, b) { return a.inicio - b.inicio; });
  }
  lista.reverse();
  var h = '<h4 class="entreno__progreso-sub">' + _progresoEsc(t("ent.historial")) + "</h4>";
  h += lista.length
    ? '<ul class="entreno__hist">' + lista.map(_progresoSesionHtml).join("") + "</ul>"
    : '<p class="entreno__progreso-vacio">' + _progresoEsc(t("ent.historial_periodo_vacio")) + "</p>";
  if (ENTRENO_HISTORIAL_N < dentro.length) h += '<p class="entreno__progreso-nota">' + _progresoEsc(tFormat("ent.historial_mas", { n: ENTRENO_HISTORIAL_N })) + "</p>";
  return h + '<div class="entreno__hist-pie">' +
      '<button type="button" class="btn-secondary" data-csv>' + _progresoEsc(t("ent.csv")) + "</button>" +
      '<p class="entreno__progreso-nota">' + _progresoEsc(t("ent.guardado_local")) + "</p>" +
    "</div>";
}

/** Los récords batidos en el periodo; cada uno abre su sesión. */
function _progresoRecordsHtml(records) {
  var h = '<h4 class="entreno__progreso-sub">' + _progresoEsc(t("ent.records_periodo")) + "</h4>";
  if (!records.length) return h + '<p class="entreno__progreso-vacio">' + _progresoEsc(t("ent.records_vacio")) + "</p>";
  return h + '<ul class="entreno__records">' + records.slice(0, ENTRENO_RECORDS_N).map(function (r) {
    var nombre = entrenoNombre({ id: r.id, name: r.name });
    var valor = _progresoValorTexto(r, r.punto);
    var fecha = _progresoFecha(r.punto.t);
    return '<li><button type="button" class="entreno__record-fila" data-ver-sesion="' + _progresoEsc(r.punto.sid) + '"' +
        ' aria-label="' + _progresoEsc(tFormat("ent.abrir_sesion_aria", { nombre: nombre, valor: valor, fecha: fecha })) + '">' +
      '<span class="entreno__record-ej">' + _progresoEsc(nombre) + "</span>" +
      '<strong class="entreno__record-marca">' + _progresoEsc(valor) + "</strong>" +
      '<span class="entreno__record-fecha">' + _progresoEsc(fecha) + "</span>" +
    "</button></li>";
  }).join("") + "</ul>";
}

function _progresoTiempo(min) {
  var h = Math.floor(min / 60);
  if (!h) return tFormat("ent.tiempo_m", { m: min });
  return min % 60 ? tFormat("ent.tiempo_hm", { h: h, m: min % 60 }) : tFormat("ent.tiempo_h", { h: h });
}

/** Las cuatro cifras del periodo: sesiones, tiempo, kilos y récords. */
function _progresoResumenHtml(r) {
  var cifras = [
    ["ent.cifra_sesiones", String(r.sesiones)],
    ["ent.cifra_tiempo", _progresoTiempo(r.minutos)],
    ["ent.cifra_volumen", entrenoMiles(r.volumen) + " " + t("ent.kg")],
    ["ent.cifra_records", String(r.records.length)]
  ];
  return '<div class="entreno__cifras entreno__cifras--periodo">' + cifras.map(function (c) {
    return '<div class="entreno__cifra"><span class="entreno__cifra-etiqueta">' + _progresoEsc(t(c[0])) + "</span>" +
      '<strong class="entreno__cifra-valor">' + _progresoEsc(c[1]) + "</strong></div>";
  }).join("") + "</div>";
}

function _progresoPeriodosHtml(clave) {
  return '<div class="cat__filtros entreno__periodos" role="group" aria-label="' + _progresoEsc(t("ent.periodo_aria")) + '">' +
    ENTRENO_PERIODOS.map(function (p) {
      var on = p === clave;
      return '<button type="button" class="cat__chip' + (on ? " is-on" : "") + '" aria-pressed="' + on + '" data-progreso-periodo="' + p + '">' +
        _progresoEsc(t("ent.periodo_" + p)) + "</button>";
    }).join("") + "</div>";
}

function _progresoVistasHtml(vista) {
  return '<div class="entreno__vistas" role="tablist" aria-label="' + _progresoEsc(t("ent.vistas_aria")) + '">' +
    ENTRENO_VISTAS.map(function (v) {
      var on = v === vista;
      return '<button type="button" class="entreno__vista-btn' + (on ? " is-on" : "") + '" role="tab" id="progresoTab-' + v + '"' +
        ' aria-controls="progresoVista-' + v + '" aria-selected="' + on + '" tabindex="' + (on ? 0 : -1) + '" data-progreso-vista="' + v + '">' +
        _progresoEsc(t("ent.vista_" + v)) + "</button>";
    }).join("") + "</div>";
}

/**
 * «Progreso»: el periodo, sus cifras y los cuatro apartados (todos pintados;
 * los que no se ven, con hidden). Sin historia, una frase que explica cómo
 * empezar y el peso.
 * @param {{periodo?:string, vista?:string, pesos?:object[], medidas?:object[], forzada?:string}} [estado]
 */
function entrenoProgresoHtml(log, plan, ahora, estado) {
  var e = estado || {};
  var pesos = e.pesos || [];
  var h = '<h3 class="entreno__progreso-titulo" id="entrenoProgresoTitulo">' + _progresoEsc(t("ent.progreso")) + "</h3>";
  // Las medidas del cuerpo (js/ui/entreno-medidas.js, 2026-10-23), debajo del peso.
  var medidas = function (periodo) {
    return typeof entrenoMedidasHtml === "function" ? entrenoMedidasHtml(e.medidas || [], ahora, periodo) : "";
  };
  if (!log || !log.sesiones.length) {
    return h + '<p class="entreno__progreso-vacio">' + _progresoEsc(t("ent.historial_vacio")) + "</p>" +
      '<div class="entreno__cuerpo">' + entrenoPesoHtml(pesos, ahora) + medidas(null) + "</div>";
  }
  var vista = ENTRENO_VISTAS.indexOf(e.vista) !== -1 ? e.vista : "fuerza";
  var periodo = entrenoStatsPeriodo(e.periodo, log, ahora);
  var resumen = entrenoStatsResumen(log, periodo);
  var tramos = entrenoStatsTramos(log, periodo);
  var paneles = {
    fuerza: _progresoRecordsHtml(resumen.records) + entrenoEjerciciosHtml(log, periodo),
    volumen: _progresoBarrasHtml(tramos, "volumen", periodo) + entrenoMusculosCargaHtml(log, ahora, periodo),
    regularidad: _progresoSemanaHtml(entrenoLogSemanas(log, ahora, 1), log, plan, ahora) +
      _progresoBarrasHtml(tramos, "sesiones", periodo) + _progresoHistorialHtml(log, periodo, e.forzada),
    cuerpo: '<div class="entreno__cuerpo">' + entrenoPesoHtml(pesos, ahora, periodo) + medidas(periodo) + "</div>"
  };
  if (!paneles.volumen) paneles.volumen = '<p class="entreno__progreso-vacio">' + _progresoEsc(t("ent.volumen_vacio")) + "</p>";
  h += _progresoPeriodosHtml(periodo.clave) + _progresoResumenHtml(resumen) + _progresoVistasHtml(vista);
  ENTRENO_VISTAS.forEach(function (v) {
    h += '<div class="entreno__vista" role="tabpanel" id="progresoVista-' + v + '" aria-labelledby="progresoTab-' + v + '"' +
      (v === vista ? "" : " hidden") + ">" + paneles[v] + "</div>";
  });
  return h;
}

/** La sesión más reciente del diario, o null. */
function _progresoUltimaSesion(log) {
  var ultima = null;
  ((log && log.sesiones) || []).forEach(function (s) {
    if (!ultima || ultima.inicio < s.inicio) ultima = s;
  });
  return ultima;
}

/**
 * El último récord: el ejercicio cuya mejor marca es la más reciente, siempre
 * que esa marca superase a una sesión anterior (la primera vez no es récord:
 * sería récord todo). null si no hay ninguno.
 */
function entrenoUltimoRecord(log) {
  if (!log || typeof entrenoStatsEjercicios !== "function") return null;
  var elegido = null;
  entrenoStatsEjercicios(log).forEach(function (x) {
    // `mejor` es la PRIMERA vez que se llegó a la marca más alta: si no es la primera sesión, batió a todas las de antes.
    if (x.puntos.length < 2 || !x.mejor || !(x.puntos[0].t < x.mejor.t)) return;
    if (!elegido || elegido.mejor.t < x.mejor.t) elegido = x;
  });
  return elegido;
}

/** «Inicio» (2026-10-21): la última sesión, con el botón a sus resultados, y el último récord. "" sin historial. */
function entrenoUltimaSesionHtml(log) {
  var s = _progresoUltimaSesion(log);
  if (!s) return "";
  var tot = entrenoLogTotales(s);
  var hechos = s.ejercicios.filter(function (e) { return !e.saltado; }).length;
  var h = '<article class="entreno__tarjeta entreno__ultima-sesion">' +
    '<p class="entreno__tarjeta-ojo">' + _progresoEsc(t("ent.ultima_titulo")) + "</p>" +
    '<h3 class="entreno__tarjeta-titulo">' + _progresoEsc(_progresoNombreSesion(s)) + "</h3>" +
    '<p class="entreno__tarjeta-datos">' + _progresoEsc(tFormat("ent.ultima_datos", { n: hechos, min: tot.minutos }) + " · " + _progresoFecha(s.inicio)) + "</p>" +
    '<button type="button" class="btn-secondary" data-ver-sesion="' + _progresoEsc(s.id) + '">' + _progresoEsc(t("ent.ultima_ver")) + "</button>" +
  "</article>";
  var r = entrenoUltimoRecord(log);
  if (r) {
    h += '<article class="entreno__tarjeta entreno__record">' +
      '<p class="entreno__tarjeta-ojo">' + _progresoEsc(t("ent.record_ultimo")) + "</p>" +
      '<h3 class="entreno__tarjeta-titulo">' + _progresoEsc(entrenoNombre({ id: r.id, name: r.name })) + "</h3>" +
      '<p class="entreno__record-valor">' + _progresoEsc(_progresoValorTexto(r, r.mejor)) + "</p>" +
      '<p class="entreno__tarjeta-datos">' + _progresoEsc(_progresoFecha(r.mejor.t)) + "</p>" +
    "</article>";
  }
  return h;
}

// ── La página de un ejercicio: «Tus resultados» (2026-10-22) ─────────────
// Debajo de la animación, los músculos y la técnica (entrenoFichaHtml,
// render-entreno.js): los récords con su fecha, la gráfica de cada sesión y
// las últimas veces con sus series. Sale igual desde el catálogo, desde la
// animación del plan o de la sesión, y desde «Progreso».

var ENTRENO_FICHA_ULTIMAS = 5;

function _fichaRecordHtml(etiqueta, valor, t0) {
  return '<li class="anim-record"><span class="anim-record__etiqueta">' + _progresoEsc(etiqueta) + "</span>" +
    '<strong class="anim-record__valor">' + _progresoEsc(valor) + "</strong>" +
    '<span class="anim-record__fecha">' + _progresoEsc(_progresoFecha(t0)) + "</span></li>";
}

/** «Tus resultados» de un ejercicio. Sin historia, una frase que dice qué saldrá aquí. Sin DOM. */
function entrenoFichaResultadosHtml(id, log) {
  var h = '<section class="anim-ficha__resultados"><h3 class="anim-ficha__subtitulo">' + _progresoEsc(t("ent.ficha_resultados")) + "</h3>";
  var f = (log && log.sesiones && typeof entrenoStatsFicha === "function") ? entrenoStatsFicha(log, id, ENTRENO_FICHA_ULTIMAS) : null;
  if (!f) return h + '<p class="anim-ficha__vacio">' + _progresoEsc(t("ent.ficha_sin_datos")) + "</p></section>";
  var r = f.records;
  var filas = [];
  if (f.tipo === "peso") {
    if (r.e1rm) filas.push(_fichaRecordHtml(t("ent.ficha_rec_e1rm"), entrenoKg(r.e1rm.valor) + " (" + entrenoKg(r.e1rm.kg) + " × " + r.e1rm.reps + ")", r.e1rm.t));
    if (r.kg) filas.push(_fichaRecordHtml(t("ent.ficha_rec_peso"), entrenoKg(r.kg.kg) + " × " + r.kg.reps, r.kg.t));
    if (r.volumen) filas.push(_fichaRecordHtml(t("ent.ficha_rec_volumen"), entrenoMiles(Math.round(r.volumen.valor)) + " " + t("ent.kg"), r.volumen.t));
  } else if (r.reps) {
    var valor = f.tipo === "tiempo" ? tFormat("ent.segundos", { n: r.reps.reps }) : tFormat("ent.reps_n", { n: r.reps.reps });
    filas.push(_fichaRecordHtml(t(f.tipo === "tiempo" ? "ent.ficha_rec_tiempo" : "ent.ficha_rec_reps"), valor, r.reps.t));
  }
  h += '<h4 class="entreno__progreso-sub">' + _progresoEsc(t("ent.ficha_records")) + "</h4>" +
    '<ul class="anim-records">' + filas.join("") + "</ul>";
  h += '<h4 class="entreno__progreso-sub">' + _progresoEsc(tFormat("ent.ficha_grafica", { n: f.sesiones })) + "</h4>" +
    _progresoLineaHtml({ id: f.id, name: f.name, tipo: f.tipo, puntos: f.puntos });
  h += '<h4 class="entreno__progreso-sub">' + _progresoEsc(t("ent.ficha_ultimas")) + "</h4>" +
    '<ul class="anim-ficha__ultimas">' + f.ultimas.map(function (v) {
      return "<li><span class=\"anim-ficha__ultima-fecha\">" + _progresoEsc(_progresoFecha(v.t)) + "</span>" +
        "<span>" + _progresoEsc(entrenoSeriesTexto(v.series, f.tipo === "tiempo")) + "</span></li>";
    }).join("") + "</ul>";
  return h + "</section>";
}

/** De "2026-10-21" a la medianoche de ese día, en ms. */
function _progresoMsDeFecha(fecha) {
  var p = String(fecha).split("-");
  return new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2])).getTime();
}

/** La línea del peso dentro del periodo, con el primero y el último abajo. "" con menos de dos medidas. */
function _progresoPesoGraficaHtml(medidas) {
  var puntos = medidas.map(function (e) { return { t: _progresoMsDeFecha(e.fecha), valor: e.kg }; });
  var g = typeof entrenoStatsGrafico === "function" ? entrenoStatsGrafico(puntos, 300, 90) : null;
  if (!g) return "";
  var etiqueta = tFormat("ent.grafica_peso", { desde: entrenoKg(g.min), hasta: entrenoKg(g.max), n: puntos.length });
  var ultima = g.marcas[g.marcas.length - 1];
  return '<figure class="entreno__linea entreno__peso-grafica">' +
    '<svg viewBox="0 0 300 90" role="img" aria-label="' + _progresoEsc(etiqueta) + '" focusable="false">' +
      '<path class="entreno__linea-trazo" d="' + g.path + '"/>' +
      '<circle cx="' + ultima.x + '" cy="' + ultima.y + '" r="4" class="is-ultimo"/></svg>' +
    '<figcaption class="entreno__linea-pie"><span>' + _progresoEsc(_progresoDiaMes(puntos[0].t)) + "</span>" +
      "<span>" + _progresoEsc(entrenoKg(g.min) + " – " + entrenoKg(g.max)) + "</span>" +
      "<span>" + _progresoEsc(_progresoDiaMes(puntos[puntos.length - 1].t)) + "</span></figcaption>" +
  "</figure>";
}

/**
 * El peso corporal (2026-10-21): el último y cuánto ha cambiado. Sin periodo,
 * en 30 días; con él (el apartado «Cuerpo», 2026-10-23), en el periodo y con
 * su gráfica. Se apunta en «Mis datos» (js/ui/render-weight.js). Sin DOM.
 * @param {{fecha:string, kg:number}[]} lista  el registro, ordenado por fecha (pesosLeer)
 */
function entrenoPesoHtml(lista, ahora, periodo) {
  var h = '<h3 class="entreno__subtitulo" id="entrenoPesoTitulo">' + _progresoEsc(t("ent.peso_titulo")) + "</h3>";
  var boton = '<button type="button" class="btn-secondary" data-abrir-peso>' + _progresoEsc(t("ent.peso_abrir")) + "</button>";
  if (!lista || !lista.length) return h + '<p class="entreno__peso-texto">' + _progresoEsc(t("ent.peso_vacio")) + "</p>" + boton;
  var ultimo = lista[lista.length - 1];
  // «Todo» empieza en la primera sesión, pero el peso se ve entero.
  var desde = !periodo ? ahora - 30 * 24 * 3600 * 1000 : (periodo.clave === "todo" ? -Infinity : periodo.desde);
  var dentro = lista.filter(function (e) { return !(_progresoMsDeFecha(e.fecha) < desde); });
  var base = dentro[0];
  var cambio = "";
  if (base && base !== ultimo) {
    var d = Math.round((ultimo.kg - base.kg) * 10) / 10;
    var signo = 0 < d ? "+" : (d < 0 ? "−" : "±");
    cambio = '<span class="entreno__peso-cambio">' +
      _progresoEsc(tFormat(periodo ? "ent.peso_cambio_periodo" : "ent.peso_cambio", { kg: signo + entrenoKg(Math.abs(d)) })) + "</span>";
  }
  return h +
    '<p class="entreno__peso-linea"><strong class="entreno__peso-valor">' + _progresoEsc(entrenoKg(ultimo.kg)) + "</strong>" +
      '<span class="entreno__peso-fecha">' + _progresoEsc(_progresoFecha(_progresoMsDeFecha(ultimo.fecha))) + "</span>" + cambio + "</p>" +
    (periodo ? _progresoPesoGraficaHtml(dentro) : "") +
    boton;
}

/** El periodo y el apartado guardados; sin almacenamiento, el mes y «Fuerza». */
function entrenoProgresoEstadoLeer() {
  var e = { periodo: "mes", vista: "fuerza" };
  try {
    var g = JSON.parse(localStorage.getItem(ENTRENO_PROGRESO_CLAVE) || "null");
    if (g && typeof ENTRENO_PERIODOS !== "undefined" && ENTRENO_PERIODOS.indexOf(g.periodo) !== -1) e.periodo = g.periodo;
    if (g && ENTRENO_VISTAS.indexOf(g.vista) !== -1) e.vista = g.vista;
  } catch (err) { /* lo de siempre */ }
  return e;
}

function _progresoEstadoGuardar(e) {
  try { localStorage.setItem(ENTRENO_PROGRESO_CLAVE, JSON.stringify({ periodo: e.periodo, vista: e.vista })); } catch (err) { /* solo dura esta visita */ }
}

function _progresoRepintar() {
  renderEntrenoProgreso(entrenoLogLeer(), typeof entrenoPlanActual === "function" ? entrenoPlanActual() : null);
}

function _progresoCambiarPeriodo(clave) {
  var e = entrenoProgresoEstadoLeer();
  e.periodo = clave;
  _progresoEstadoGuardar(e);
  _progresoForzada = "";
  _progresoRepintar();
  var boton = document.querySelector('#entrenoProgreso [data-progreso-periodo="' + clave + '"]');
  if (boton) boton.focus();
}

/** Enseña un apartado sin repintar (los cuatro ya están pintados). */
function _progresoVista(v, conFoco) {
  if (ENTRENO_VISTAS.indexOf(v) === -1) return;
  ENTRENO_VISTAS.forEach(function (x) {
    var boton = document.getElementById("progresoTab-" + x);
    var panel = document.getElementById("progresoVista-" + x);
    if (boton) {
      boton.setAttribute("aria-selected", String(x === v));
      boton.tabIndex = x === v ? 0 : -1;
      boton.classList.toggle("is-on", x === v);
    }
    if (panel) panel.hidden = x !== v;
  });
  var activo = document.getElementById("progresoTab-" + v);
  if (conFoco && activo) activo.focus();
  var e = entrenoProgresoEstadoLeer();
  e.vista = v;
  _progresoEstadoGuardar(e);
}

/**
 * Lo que hace tocar un punto de una gráfica, un récord o «Ver los resultados»
 * de «Inicio»: «Regularidad» con esa sesión en el historial, abierta. false
 * si la sesión ya no está en el diario.
 */
function entrenoProgresoVerSesion(id) {
  var caja = document.getElementById("entrenoProgreso");
  if (!caja || !id) return false;
  var e = entrenoProgresoEstadoLeer();
  e.vista = "regularidad";
  _progresoEstadoGuardar(e);
  _progresoForzada = String(id);
  _progresoRepintar();
  var item = null;
  Array.prototype.forEach.call(caja.querySelectorAll(".entreno__hist-item"), function (li) {
    if (li.getAttribute("data-sesion") === String(id)) item = li;
  });
  if (!item) return false;
  var detalle = item.querySelector("details");
  if (detalle) detalle.open = true;
  if (typeof item.scrollIntoView === "function") item.scrollIntoView({ block: "start" });
  var resumen = item.querySelector("summary");
  if (resumen) {
    try { resumen.focus({ preventScroll: true }); } catch (err) { resumen.focus(); }
  }
  return true;
}

function renderEntrenoProgreso(log, plan) {
  var aviso = document.getElementById("entrenoReanudar");
  var caja = document.getElementById("entrenoProgreso");
  var ultima = document.getElementById("entrenoUltima");
  var ahora = Date.now();
  if (aviso) {
    var html = entrenoReanudarHtml(log, ahora);
    aviso.innerHTML = html;
    aviso.hidden = !html;
  }
  if (ultima) {
    var htmlUltima = log ? entrenoUltimaSesionHtml(log) : "";
    ultima.innerHTML = htmlUltima;
    ultima.hidden = !htmlUltima;
  }
  if (caja) {
    var estado = entrenoProgresoEstadoLeer();
    // El peso va en el apartado «Cuerpo»; se apunta en «Mis datos» (js/ui/render-weight.js).
    estado.pesos = (typeof pesosLeer === "function" && typeof pesosAlmacen === "function") ? pesosLeer(pesosAlmacen()) : [];
    estado.medidas = (typeof medidasLeer === "function" && typeof medidasAlmacen === "function") ? medidasLeer(medidasAlmacen()) : [];
    estado.forzada = _progresoForzada;
    // Lo desplegado (un ejercicio, una sesión) sigue desplegado al repintar.
    var abiertos = Array.prototype.map.call(caja.querySelectorAll("details[open] summary"), function (s) { return s.textContent; });
    caja.innerHTML = log ? entrenoProgresoHtml(log, plan, ahora, estado) : "";
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
    cabecera: ["fecha", "hora", "sesion", "ejercicio", "serie", "tipo", "kg", "reps", "rir", "nota", "animo"].map(function (c) { return t("ent.csv_" + c); }),
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
  panel.addEventListener("keydown", function (ev) {
    if (!ev.target.closest) return;
    // Las pestañas de los apartados: flechas, Inicio y Fin (el patrón de pestañas de WAI-ARIA).
    var pestana = ev.target.closest("[data-progreso-vista]");
    if (pestana) {
      var i = ENTRENO_VISTAS.indexOf(pestana.getAttribute("data-progreso-vista"));
      var n = ENTRENO_VISTAS.length;
      var destino = { ArrowRight: (i + 1) % n, ArrowLeft: (i + n - 1) % n, Home: 0, End: n - 1 }[ev.key];
      if (destino === undefined) return;
      ev.preventDefault();
      _progresoVista(ENTRENO_VISTAS[destino], true);
      return;
    }
    // Los puntos de las gráficas son círculos de SVG, no botones: Intro y espacio los pulsan.
    var punto = ev.target.closest("[data-ver-sesion]");
    if (punto && punto.tagName.toLowerCase() !== "button" && (ev.key === "Enter" || ev.key === " ")) {
      ev.preventDefault();
      punto.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    }
  });
  panel.addEventListener("click", function (ev) {
    var periodo = ev.target.closest("[data-progreso-periodo]");
    if (periodo && panel.contains(periodo)) { _progresoCambiarPeriodo(periodo.getAttribute("data-progreso-periodo")); return; }
    var vista = ev.target.closest("[data-progreso-vista]");
    if (vista && panel.contains(vista)) { _progresoVista(vista.getAttribute("data-progreso-vista"), false); return; }
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
