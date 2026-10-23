/**
 * js/core/workout-stats.js
 * ─────────────────────────────────────────────────────────────────────────
 * PROGRESO POR EJERCICIO Y POR MÚSCULO (2026-10-18). Solo cuentas sobre el
 * diario (js/core/workout-log.js), sin DOM; lo pinta js/ui/entreno-progreso.js.
 *
 * Cómo se cuenta (y así lo dice la pantalla):
 *   - Solo series de trabajo hechas: el calentamiento no cuenta.
 *   - Progreso de un ejercicio: un punto por sesión. Con peso, el 1RM estimado
 *     (Epley) de la mejor serie, o el peso si la serie pasa de 12
 *     repeticiones; sin peso, las repeticiones de la mejor serie; de tiempo,
 *     los segundos. Es una estimación, no un máximo real.
 *   - Carga por músculo: series de trabajo en las que ese músculo es el
 *     principal del ejercicio, en los últimos N días, y su media por semana.
 *   - Cumplimiento del plan: sesiones hechas frente a los días a la semana del
 *     plan, en las últimas semanas YA TERMINADAS desde la primera sesión (una
 *     semana de más no compensa una de menos).
 *
 * Expone (globales):
 *   ENTRENO_STATS_GRUPOS
 *   entrenoStatsEjercicios(log)                      → [{ id, name, muscle, tipo, sesiones, ultima, mejor, puntos }]
 *   entrenoStatsFicha(log, id, n)                    → { tipo, puntos, records, ultimas, … } | null (página del ejercicio)
 *   entrenoStatsPeriodo(clave, log, ahora)           → { clave, desde, hasta, dias, paso } («Progreso», 2026-10-23)
 *   entrenoStatsTramos(log, periodo)                 → [{ inicio, fin, sesiones, series, volumen, minutos }]
 *   entrenoStatsResumen(log, periodo)                → { sesiones, minutos, series, volumen, records }
 *   entrenoStatsRecordsPeriodo(log, periodo)         → [{ id, name, tipo, punto }] lo más reciente primero
 *   entrenoStatsMusculos(log, ahora, dias)           → [{ grupo, series, porSemana }]
 *   entrenoStatsCumplimiento(log, dias, ahora, n)    → { hechas, previstas, pct, semanas } | null
 *   entrenoStatsGrafico(puntos, ancho, alto)         → { path, marcas, min, max } | null
 *   entrenoStatsCsv(log, nombres)                    → texto CSV (con BOM, para Excel)
 * ─────────────────────────────────────────────────────────────────────────
 */

/** Los grupos que se enseñan siempre, aunque no se hayan entrenado (un cero también informa). */
var ENTRENO_STATS_GRUPOS = ["pecho", "espalda", "hombros", "biceps", "triceps", "cuadriceps", "isquios", "gluteos", "gemelos", "core"];
var _STATS_DIA = 24 * 3600 * 1000;

function _statsTrabajo(e) {
  return e.series.filter(function (s) { return s.hecha && 0 < s.reps && s.tipo !== "c"; });
}

function _statsTiempo(e) {
  var r = entrenoLogRango(e.reps);
  return !!(r && r.tiempo);
}

/** Lo mejor de unas series en una sesión: { valor, kg, reps }. */
function _statsMejor(series, tipo) {
  var mejor = null;
  series.forEach(function (s) {
    var kg = s.kg || 0;
    var valor = tipo === "peso" ? (entrenoLogE1rm(kg, s.reps) || kg) : s.reps;
    if (!mejor || mejor.valor < valor) mejor = { valor: valor, kg: kg, reps: s.reps };
  });
  return mejor;
}

/**
 * Cada ejercicio que se ha hecho, el último primero, con un punto por sesión
 * (de la más antigua a la más reciente).
 *   tipo: "peso", "reps" (sin peso) o "tiempo"
 */
function entrenoStatsEjercicios(log) {
  var porId = {};
  var orden = [];
  log.sesiones.forEach(function (sesion) {
    sesion.ejercicios.forEach(function (e) {
      var trabajo = _statsTrabajo(e);
      if (!trabajo.length) return;
      var x = porId[e.id];
      if (!x) {
        x = porId[e.id] = { id: e.id, name: e.name, muscle: e.muscle, tiempo: _statsTiempo(e), conPeso: false, filas: [] };
        orden.push(e.id);
      }
      if (trabajo.some(function (s) { return 0 < (s.kg || 0); })) x.conPeso = true;
      x.filas.push({ t: sesion.inicio, sid: sesion.id, series: trabajo });
    });
  });
  return orden.map(function (id) {
    var x = porId[id];
    var tipo = x.tiempo ? "tiempo" : (x.conPeso ? "peso" : "reps");
    var puntos = x.filas.map(function (f) {
      var m = _statsMejor(f.series, tipo);
      // `sid`: la sesión de ese punto, para abrirla al tocarlo en la gráfica (2026-10-23).
      return { t: f.t, sid: f.sid, valor: m.valor, kg: m.kg, reps: m.reps };
    });
    var mejor = puntos.reduce(function (a, p) { return (!a || a.valor < p.valor) ? p : a; }, null);
    return {
      id: x.id, name: x.name, muscle: x.muscle, tipo: tipo,
      sesiones: puntos.length, ultima: puntos[puntos.length - 1].t,
      mejor: mejor, puntos: puntos
    };
  }).sort(function (a, b) { return b.ultima - a.ultima; });
}

/**
 * Lo que enseña la PÁGINA de un ejercicio (2026-10-22): sus récords, cada uno
 * con la fecha en que se consiguió por primera vez, los puntos de la gráfica
 * (los de entrenoStatsEjercicios) y las últimas `n` veces con sus series de
 * trabajo, la más reciente primero. null si nunca se hizo.
 *   records.e1rm     { valor, kg, reps, t }  solo con peso (Epley, hasta 12 reps)
 *   records.kg       { kg, reps, t }         el peso más alto (a igual peso, más reps)
 *   records.reps     { reps, kg, t }         más repeticiones (o segundos) en una serie
 *   records.volumen  { valor, t }            más kilos × reps en una sesión
 * Los que no aplican (sin peso: e1rm, kg, volumen) quedan en null.
 */
function entrenoStatsFicha(log, id, n) {
  var x = entrenoStatsEjercicios(log).filter(function (e) { return e.id === id; })[0];
  if (!x) return null;
  var rec = { e1rm: null, kg: null, reps: null, volumen: null };
  var veces = [];
  log.sesiones.forEach(function (sesion) {
    sesion.ejercicios.forEach(function (e) {
      if (e.id !== id) return;
      var trabajo = _statsTrabajo(e);
      if (!trabajo.length) return;
      var volumen = 0;
      trabajo.forEach(function (s) {
        var kg = s.kg || 0;
        var e1 = entrenoLogE1rm(kg, s.reps);
        if (e1 && (!rec.e1rm || rec.e1rm.valor < e1)) rec.e1rm = { valor: e1, kg: kg, reps: s.reps, t: sesion.inicio };
        if (0 < kg && (!rec.kg || rec.kg.kg < kg || (rec.kg.kg === kg && rec.kg.reps < s.reps))) rec.kg = { kg: kg, reps: s.reps, t: sesion.inicio };
        if (!rec.reps || rec.reps.reps < s.reps) rec.reps = { reps: s.reps, kg: kg, t: sesion.inicio };
        volumen += kg * s.reps;
      });
      if (0 < volumen && (!rec.volumen || rec.volumen.valor < volumen)) rec.volumen = { valor: volumen, t: sesion.inicio };
      veces.push({ t: sesion.inicio, series: trabajo });
    });
  });
  return {
    id: x.id, name: x.name, tipo: x.tipo, sesiones: x.sesiones, puntos: x.puntos, mejor: x.mejor,
    records: rec, ultimas: veces.slice(-(n || 5)).reverse()
  };
}

// ── «Progreso» por periodos (2026-10-23) ──────────────────────────────────
// La propuesta de diseño del dueño, punto 6: arriba unas cifras, debajo las
// gráficas, todo para el periodo que se elija (7 días, mes, 3 meses, año o todo).

var ENTRENO_PERIODOS = ["7d", "mes", "3m", "ano", "todo"];
var _STATS_DIAS_PERIODO = { "7d": 7, mes: 30, "3m": 91, ano: 365 };

function _statsInicioDia(ms) {
  var d = new Date(ms);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/**
 * El periodo: desde la medianoche del primer día hasta `ahora`, cuántos días
 * cubre y cómo se agrupan sus gráficas (por día con 7 días, por semana hasta
 * unos 4 meses, por mes a partir de ahí). «todo» empieza en la primera sesión.
 * @returns {{clave:string, desde:number, hasta:number, dias:number, paso:string}}
 */
function entrenoStatsPeriodo(clave, log, ahora) {
  var c = ENTRENO_PERIODOS.indexOf(clave) !== -1 ? clave : "mes";
  var hoy = _statsInicioDia(ahora);
  var desde;
  if (c === "todo") {
    var primera = ((log && log.sesiones) || []).reduce(function (m, s) { return Math.min(m, s.inicio); }, Infinity);
    desde = isFinite(primera) ? _statsInicioDia(primera) : hoy;
  } else {
    var d = new Date(hoy);
    desde = new Date(d.getFullYear(), d.getMonth(), d.getDate() - (_STATS_DIAS_PERIODO[c] - 1)).getTime();
  }
  var dias = Math.max(1, Math.round((hoy - desde) / _STATS_DIA) + 1);
  return { clave: c, desde: desde, hasta: ahora, dias: dias, paso: c === "7d" ? "dia" : (dias <= 120 ? "semana" : "mes") };
}

/**
 * El periodo en tramos (días, semanas que empiezan en lunes o meses), cada uno
 * con sus sesiones, series, kilos y minutos. Solo cuenta lo que cae dentro del
 * periodo, aunque el primer tramo empiece antes.
 */
function entrenoStatsTramos(log, periodo) {
  var tramos = [];
  var inicio = periodo.desde;
  if (periodo.paso === "semana") inicio = entrenoLogInicioSemana(periodo.desde);
  if (periodo.paso === "mes") { var m = new Date(periodo.desde); inicio = new Date(m.getFullYear(), m.getMonth(), 1).getTime(); }
  while (inicio <= periodo.hasta && tramos.length < 400) {
    var d = new Date(inicio);
    var fin = periodo.paso === "dia" ? new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).getTime()
      : periodo.paso === "semana" ? new Date(d.getFullYear(), d.getMonth(), d.getDate() + 7).getTime()
      : new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime();
    tramos.push({ inicio: inicio, fin: fin, sesiones: 0, series: 0, volumen: 0, minutos: 0 });
    inicio = fin;
  }
  ((log && log.sesiones) || []).forEach(function (s) {
    if (s.inicio < periodo.desde || periodo.hasta < s.inicio) return;
    for (var k = 0; k < tramos.length; k++) {
      if (s.inicio < tramos[k].inicio || tramos[k].fin <= s.inicio) continue;
      var tot = entrenoLogTotales(s);
      tramos[k].sesiones++;
      tramos[k].series += tot.series;
      tramos[k].volumen += tot.volumen;
      tramos[k].minutos += tot.minutos;
      break;
    }
  });
  return tramos;
}

/**
 * Los récords batidos en el periodo: cada vez que un ejercicio superó a TODAS
 * sus sesiones anteriores (la primera vez no cuenta: sería récord todo). Lo
 * más reciente primero. { id, name, tipo, punto: { t, sid, valor, kg, reps } }
 */
function entrenoStatsRecordsPeriodo(log, periodo) {
  var r = [];
  entrenoStatsEjercicios(log).forEach(function (x) {
    var mejor = -Infinity;
    x.puntos.forEach(function (p, i) {
      if (0 < i && mejor < p.valor && periodo.desde <= p.t && p.t <= periodo.hasta) r.push({ id: x.id, name: x.name, tipo: x.tipo, punto: p });
      if (mejor < p.valor) mejor = p.valor;
    });
  });
  return r.sort(function (a, b) { return b.punto.t - a.punto.t; });
}

/** Las cifras del periodo: sesiones, minutos, series, kilos y récords. */
function entrenoStatsResumen(log, periodo) {
  var r = { sesiones: 0, minutos: 0, series: 0, volumen: 0, records: entrenoStatsRecordsPeriodo(log, periodo) };
  ((log && log.sesiones) || []).forEach(function (s) {
    if (s.inicio < periodo.desde || periodo.hasta < s.inicio) return;
    var tot = entrenoLogTotales(s);
    r.sesiones++;
    r.minutos += tot.minutos;
    r.series += tot.series;
    r.volumen += tot.volumen;
  });
  return r;
}

/**
 * Series de trabajo por músculo principal en los últimos `dias` días.
 * Siempre trae los grupos de ENTRENO_STATS_GRUPOS (y otros que aparezcan),
 * de más a menos series.
 */
function entrenoStatsMusculos(log, ahora, dias) {
  var n = dias || 28;
  var desde = ahora - n * _STATS_DIA;
  var cuenta = {};
  ENTRENO_STATS_GRUPOS.forEach(function (g) { cuenta[g] = 0; });
  log.sesiones.forEach(function (sesion) {
    if (sesion.inicio < desde || ahora < sesion.inicio) return;
    sesion.ejercicios.forEach(function (e) {
      if (!e.muscle) return;
      cuenta[e.muscle] = (cuenta[e.muscle] || 0) + _statsTrabajo(e).length;
    });
  });
  var semanas = n / 7;
  return Object.keys(cuenta).map(function (g) {
    return { grupo: g, series: cuenta[g], porSemana: Math.round(cuenta[g] / semanas * 10) / 10 };
  }).sort(function (a, b) { return b.series - a.series || ENTRENO_STATS_GRUPOS.indexOf(a.grupo) - ENTRENO_STATS_GRUPOS.indexOf(b.grupo); });
}

/**
 * Cumplimiento del plan en las últimas `n` semanas terminadas (sin contar la
 * actual), solo desde la semana de la primera sesión. null si aún no hay
 * ninguna semana terminada o no hay plan.
 */
function entrenoStatsCumplimiento(log, diasPorSemana, ahora, n) {
  var dias = Math.floor(Number(diasPorSemana));
  if (!(1 <= dias) || !log.sesiones.length) return null;
  var semanas = entrenoLogSemanas(log, ahora, (n || 4) + 1).slice(0, -1);
  var primera = entrenoLogInicioSemana(log.sesiones[0].inicio);
  semanas = semanas.filter(function (s) { return primera <= s.inicio; });
  if (!semanas.length) return null;
  var hechas = 0;
  semanas.forEach(function (s) { hechas += Math.min(s.sesiones, dias); });
  var previstas = dias * semanas.length;
  return { hechas: hechas, previstas: previstas, pct: Math.round(hechas / previstas * 100), semanas: semanas.length };
}

/**
 * Geometría de la línea de progreso (solo números). Con menos de dos puntos,
 * null. marcas: dónde va cada punto, para pintarlos.
 */
function entrenoStatsGrafico(puntos, ancho, alto) {
  var lista = (Array.isArray(puntos) ? puntos : []).filter(function (p) { return p && isFinite(p.valor); });
  if (lista.length < 2) return null;
  var w = ancho || 300;
  var h = alto || 90;
  var margen = 8;
  var min = Infinity;
  var max = -Infinity;
  lista.forEach(function (p) {
    if (p.valor < min) min = p.valor;
    if (max < p.valor) max = p.valor;
  });
  var rango = (max - min) || 1;
  var pasoX = (w - 2 * margen) / (lista.length - 1);
  var marcas = lista.map(function (p, i) {
    return {
      x: Math.round((margen + pasoX * i) * 10) / 10,
      y: Math.round((margen + (h - 2 * margen) * (1 - (p.valor - min) / rango)) * 10) / 10
    };
  });
  var path = marcas.map(function (m, i) { return (i ? "L" : "M") + m.x + " " + m.y; }).join(" ");
  return { path: path, marcas: marcas, min: min, max: max };
}

function _statsCampo(valor) {
  var texto = valor === null || valor === undefined ? "" : String(valor);
  // Una celda que empieza por = + - @ la toma Excel por una fórmula.
  if (/^[=+\-@]/.test(texto)) texto = "'" + texto;
  return '"' + texto.replace(/"/g, '""') + '"';
}

function _statsDosCifras(n) { return (n < 10 ? "0" : "") + n; }

/**
 * El historial como CSV: una fila por serie hecha.
 * @param {object} log
 * @param {{sesion: function, ejercicio: function, tipo: function, cabecera: string[]}} nombres
 *        cómo se llama cada cosa en el idioma de la pantalla
 */
function entrenoStatsCsv(log, nombres) {
  var n = nombres || {};
  var cabecera = n.cabecera || ["fecha", "hora", "sesion", "ejercicio", "serie", "tipo", "kg", "reps", "nota"];
  var filas = [cabecera.map(_statsCampo).join(",")];
  log.sesiones.forEach(function (sesion) {
    var d = new Date(sesion.inicio);
    var fecha = d.getFullYear() + "-" + _statsDosCifras(d.getMonth() + 1) + "-" + _statsDosCifras(d.getDate());
    var hora = _statsDosCifras(d.getHours()) + ":" + _statsDosCifras(d.getMinutes());
    var nombreSesion = n.sesion ? n.sesion(sesion) : sesion.nombre;
    sesion.ejercicios.forEach(function (e) {
      var nombre = n.ejercicio ? n.ejercicio(e) : e.name;
      e.series.forEach(function (s, k) {
        if (!s.hecha) return;
        filas.push([
          fecha, hora, nombreSesion, nombre, k + 1, n.tipo ? n.tipo(s.tipo || "") : (s.tipo || ""),
          s.kg === null ? "" : s.kg, s.reps, k === 0 ? (e.nota || "") : ""
        ].map(_statsCampo).join(","));
      });
    });
  });
  return "﻿" + filas.join("\r\n") + "\r\n";
}
