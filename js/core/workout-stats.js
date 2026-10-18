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
      x.filas.push({ t: sesion.inicio, series: trabajo });
    });
  });
  return orden.map(function (id) {
    var x = porId[id];
    var tipo = x.tiempo ? "tiempo" : (x.conPeso ? "peso" : "reps");
    var puntos = x.filas.map(function (f) {
      var m = _statsMejor(f.series, tipo);
      return { t: f.t, valor: m.valor, kg: m.kg, reps: m.reps };
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
