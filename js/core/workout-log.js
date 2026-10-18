/**
 * js/core/workout-log.js
 * ─────────────────────────────────────────────────────────────────────────
 * DIARIO DE ENTRENAMIENTO (2026-10-18). Lo que el usuario hace de verdad en
 * cada sesión: series con kilos y repeticiones (o segundos, en los ejercicios
 * de tiempo). Con eso la pantalla enseña «la última vez», propone la carga de
 * hoy (doble progresión: siguienteCarga de js/engine/workout-generator.js),
 * marca los récords y cuenta la semana.
 *
 * Solo datos y cuentas, sin DOM. Se guarda en este navegador (localStorage,
 * ENTRENO_LOG_CLAVE): no va a la cuenta ni se sincroniza.
 *
 * Forma guardada (todo lo que se lee pasa por entrenoLogLimpiar):
 *   { v: 1, sesiones: [Sesion…] (la más antigua primero), enCurso: Sesion | null,
 *     borradas: [{ id, t }] (sesiones borradas: para que otro dispositivo no las devuelva) }
 *   Sesion    = { id, clave, nombre, semana, inicio (ms), fin (ms, solo las terminadas),
 *                 descansoHasta (ms o null, solo la que está en curso),
 *                 pausas (ms en pausa), pausaDesde (ms, solo en curso y pausada),
 *                 editado (ms, si se cambió después de terminarla), ejercicios: [Ejercicio…] }
 *   Ejercicio = { id, name, muscle, reps (rango del plan: "6-10", "30-45 s"…),
 *                 compound, descanso (s), series: [Serie…],
 *                 grupo ("A"…"H": superserie con los de al lado), nota, saltado }
 *   Serie     = { kg, reps, hecha, t, tipo }
 *   kg y reps pueden ser null (casilla vacía); t es cuándo se marcó hecha; tipo
 *   es "c" (calentamiento), "d" (drop set) o "f" (al fallo), y sin tipo es una
 *   serie normal. Las de calentamiento NO cuentan para «la última vez», la
 *   carga sugerida, los récords ni los kilos movidos.
 *
 * (2026-10-18, segunda parte) Tipos de serie, superseries, notas, saltar un
 * ejercicio, pausa, corregir una sesión terminada (entrenoLogReemplazar) y la
 * lista de borradas, que necesita la copia en la cuenta (js/core/workout-sync.js).
 *
 * Expone (globales): entrenoLogLeer/Guardar/Limpiar/Vacio, entrenoLogRango,
 * entrenoLogUltimaVez, entrenoLogSugerencia, entrenoLogE1rm, entrenoLogRecords,
 * entrenoLogTipoRecord, entrenoLogIniciar, entrenoLogPonerSerie,
 * entrenoLogAnadirSerie, entrenoLogQuitarSerie, entrenoLogTerminar,
 * entrenoLogBorrar, entrenoLogReemplazar, entrenoLogTotales, entrenoLogPausado,
 * entrenoLogSemanas, entrenoLogRacha.
 * ─────────────────────────────────────────────────────────────────────────
 */

/** Con el prefijo del proyecto: así entra solo en «Descargar mis datos» (exportarMisDatos, js/app.js). */
var ENTRENO_LOG_CLAVE = "nutritionPlanner.entrenoDiario.v1";
var ENTRENO_LOG_MAX_SESIONES = 400;
var ENTRENO_LOG_MAX_EJERCICIOS = 20;
var ENTRENO_LOG_MAX_SERIES = 12;
var ENTRENO_LOG_MAX_KG = 1000;
var ENTRENO_LOG_MAX_REPS = 3600;      // repeticiones, o segundos en los de tiempo
var ENTRENO_LOG_MAX_DESCANSO = 900;
var ENTRENO_LOG_MS_MAX = 1e15;
/** Si la última serie se marcó hace más de esto, la sesión terminó entonces (se olvidó «Terminar»). */
var ENTRENO_LOG_OLVIDO_MS = 30 * 60 * 1000;
/** Subida en las de aislamiento (las compuestas usan siguienteCarga: 2,5 arriba y 5 abajo). */
var ENTRENO_LOG_SUBIDA_AISLADO = { superior: 1, inferior: 2 };
var ENTRENO_LOG_TIPOS_SERIE = ["c", "d", "f"];
var ENTRENO_LOG_MAX_NOTA = 200;
var ENTRENO_LOG_MAX_BORRADAS = 300;
var _LOG_GRUPO = /^[A-H]$/;

function entrenoLogVacio() {
  return { v: 1, sesiones: [], enCurso: null, borradas: [] };
}

/** Número válido entre 0 y max; texto vacío, negativo o raro → null. Acepta coma decimal. */
function _logNumero(valor, max) {
  var n = valor;
  if (typeof n === "string") {
    if (!n.trim()) return null;
    n = Number(n.replace(",", "."));
  }
  if (typeof n !== "number" || !isFinite(n) || n < 0) return null;
  return Math.min(n, max);
}

function _logTexto(valor, max) {
  return typeof valor === "string" ? valor.slice(0, max) : "";
}

function _logKg(valor) {
  var kg = _logNumero(valor, ENTRENO_LOG_MAX_KG);
  return kg === null ? null : Math.round(kg * 100) / 100;
}

function _logReps(valor) {
  var reps = _logNumero(valor, ENTRENO_LOG_MAX_REPS);
  return reps === null ? null : Math.round(reps);
}

function _logSerie(s) {
  if (!s || typeof s !== "object") return null;
  var serie = { kg: _logKg(s.kg), reps: _logReps(s.reps), hecha: s.hecha === true };
  var t = _logNumero(s.t, ENTRENO_LOG_MS_MAX);
  if (serie.hecha && t !== null) serie.t = t;
  if (ENTRENO_LOG_TIPOS_SERIE.indexOf(s.tipo) !== -1) serie.tipo = s.tipo;
  return serie;
}

function _logEjercicio(e) {
  if (!e || typeof e !== "object" || typeof e.id !== "string" || !e.id) return null;
  var series = Array.isArray(e.series)
    ? e.series.slice(0, ENTRENO_LOG_MAX_SERIES).map(_logSerie).filter(Boolean)
    : [];
  var descanso = _logNumero(e.descanso, ENTRENO_LOG_MAX_DESCANSO);
  var ejercicio = {
    id: e.id.slice(0, 60),
    name: _logTexto(e.name, 120),
    muscle: _logTexto(e.muscle, 30),
    reps: _logTexto(e.reps, 30),
    compound: e.compound === true,
    descanso: descanso === null ? 90 : Math.round(descanso),
    series: series
  };
  if (typeof e.grupo === "string" && _LOG_GRUPO.test(e.grupo)) ejercicio.grupo = e.grupo;
  var nota = _logTexto(e.nota, ENTRENO_LOG_MAX_NOTA).trim();
  if (nota) ejercicio.nota = nota;
  if (e.saltado === true) ejercicio.saltado = true;
  return ejercicio;
}

function _logSesion(s, terminada) {
  if (!s || typeof s !== "object") return null;
  var inicio = _logNumero(s.inicio, ENTRENO_LOG_MS_MAX);
  if (inicio === null) return null;
  var fin = _logNumero(s.fin, ENTRENO_LOG_MS_MAX);
  if (terminada && (fin === null || fin < inicio)) return null;
  var ejercicios = Array.isArray(s.ejercicios)
    ? s.ejercicios.slice(0, ENTRENO_LOG_MAX_EJERCICIOS).map(_logEjercicio).filter(Boolean)
    : [];
  if (!ejercicios.length) return null;
  var semana = Math.floor(Number(s.semana));
  var sesion = {
    id: _logTexto(s.id, 60) || ("s" + inicio),
    clave: _logTexto(s.clave, 40),
    nombre: _logTexto(s.nombre, 120),
    semana: semana >= 1 && semana <= 52 ? semana : 1,
    inicio: inicio,
    ejercicios: ejercicios
  };
  var pausas = _logNumero(s.pausas, ENTRENO_LOG_MS_MAX);
  if (pausas) sesion.pausas = Math.round(pausas);
  if (terminada) {
    sesion.fin = fin;
    var editado = _logNumero(s.editado, ENTRENO_LOG_MS_MAX);
    if (editado) sesion.editado = editado;
    // Una pausa nunca dura más que la sesión.
    if (sesion.pausas && fin - inicio < sesion.pausas) sesion.pausas = fin - inicio;
  } else {
    sesion.descansoHasta = _logNumero(s.descansoHasta, ENTRENO_LOG_MS_MAX);
    var desde = _logNumero(s.pausaDesde, ENTRENO_LOG_MS_MAX);
    if (desde !== null && inicio <= desde) sesion.pausaDesde = desde;
  }
  return sesion;
}

/** La lista de borradas: { id, t } válidas, una por id (la más reciente), las últimas ENTRENO_LOG_MAX_BORRADAS. */
function _logBorradas(lista) {
  var porId = {};
  (Array.isArray(lista) ? lista : []).forEach(function (b) {
    if (!b || typeof b.id !== "string" || !b.id) return;
    var t = _logNumero(b.t, ENTRENO_LOG_MS_MAX);
    if (t === null) return;
    var id = b.id.slice(0, 60);
    if (!porId[id] || porId[id].t < t) porId[id] = { id: id, t: t };
  });
  return Object.keys(porId).map(function (k) { return porId[k]; })
    .sort(function (a, b) { return a.t - b.t; })
    .slice(-ENTRENO_LOG_MAX_BORRADAS);
}

/** El diario tal como venga (JSON del almacenamiento, de otra versión, roto…) → diario válido. */
function entrenoLogLimpiar(crudo) {
  var log = entrenoLogVacio();
  if (!crudo || typeof crudo !== "object") return log;
  log.borradas = _logBorradas(crudo.borradas);
  var borrada = {};
  log.borradas.forEach(function (b) { borrada[b.id] = true; });
  if (Array.isArray(crudo.sesiones)) {
    var vistas = {};
    log.sesiones = crudo.sesiones
      .map(function (s) { return _logSesion(s, true); })
      .filter(function (s) {
        // Una por id (la última que llega) y ninguna de las borradas.
        if (!s || borrada[s.id]) return false;
        vistas[s.id] = s;
        return true;
      })
      .filter(function (s) { return vistas[s.id] === s; })
      .sort(function (a, b) { return a.inicio - b.inicio; })
      .slice(-ENTRENO_LOG_MAX_SESIONES);
  }
  log.enCurso = _logSesion(crudo.enCurso, false);
  return log;
}

function entrenoLogLeer() {
  try {
    return entrenoLogLimpiar(JSON.parse(localStorage.getItem(ENTRENO_LOG_CLAVE) || "null"));
  } catch (e) {
    return entrenoLogVacio();   // sin almacenamiento o JSON roto
  }
}

/** Guarda el diario. false si no se pudo (sin almacenamiento o lleno). */
function entrenoLogGuardar(log) {
  try {
    localStorage.setItem(ENTRENO_LOG_CLAVE, JSON.stringify(log));
    return true;
  } catch (e) {
    return false;
  }
}

/** Rango del plan: "6-10" → {min 6, max 10}; "30-45 s" es de tiempo; "… por lado" va por lado. */
function entrenoLogRango(rango) {
  var m = /^(\d+)-(\d+)( s)?( por lado)?$/.exec(String(rango || ""));
  if (!m) return null;
  return { min: Number(m[1]), max: Number(m[2]), tiempo: !!m[3], porLado: !!m[4] };
}

function _logEsTiempo(ejercicio) {
  var r = entrenoLogRango(ejercicio && ejercicio.reps);
  return !!(r && r.tiempo);
}

/** Series hechas de verdad: marcadas y con repeticiones (las de calentamiento también). */
function _logHechas(ejercicio) {
  return ejercicio.series.filter(function (s) { return s.hecha && s.reps !== null && 0 < s.reps; });
}

/** Las hechas que cuentan: sin las de calentamiento. */
function _logTrabajo(ejercicio) {
  return _logHechas(ejercicio).filter(function (s) { return s.tipo !== "c"; });
}

/**
 * La última sesión terminada en que se hizo este ejercicio: { fin, series de
 * trabajo, nota } o null. La nota es la de esa vez, si se escribió alguna.
 */
function entrenoLogUltimaVez(log, ejercicioId) {
  for (var i = log.sesiones.length - 1; 0 <= i; i--) {
    var sesion = log.sesiones[i];
    for (var j = 0; j < sesion.ejercicios.length; j++) {
      var e = sesion.ejercicios[j];
      if (e.id !== ejercicioId) continue;
      var hechas = _logTrabajo(e);
      if (hechas.length) return { fin: sesion.fin, series: hechas, nota: e.nota || "" };
    }
  }
  return null;
}

/** Hacia abajo, en pasos de discos: para bajar de verdad (62,5 × 0,9 = 56,25 → 55). */
function _logRedondearAbajo(kg, paso) {
  return Math.max(0, Math.floor(kg / paso + 1e-9) * paso);
}

/**
 * Carga y repeticiones para hoy, a partir de la última vez (doble progresión):
 *   - todas las series en lo alto del rango → «subir» (o «variante» si es sin peso)
 *   - la mayoría por debajo del rango       → «bajar» un 10 %
 *   - si no                                 → «mantener» e intentar una repetición más
 *   - sin historia                          → «nuevo» (se empieza por lo bajo del rango)
 *   - de tiempo o con un rango que no se entiende → «mantener» lo de la última vez
 *
 * @param {object} log
 * @param {{id, reps, muscle, compound, sets}} ejercicio  ejercicio del plan
 * @returns {{tipo: string, kg: (number|null), reps: (number|null), ultima: (object|null)}}
 */
function entrenoLogSugerencia(log, ejercicio) {
  var rango = entrenoLogRango(ejercicio.reps);
  var ultima = entrenoLogUltimaVez(log, ejercicio.id);
  if (!ultima) return { tipo: "nuevo", kg: null, reps: rango ? rango.min : null, ultima: null };

  var tope = ultima.series.reduce(function (m, s) { return Math.max(m, s.kg || 0); }, 0);
  var reps = ultima.series
    .filter(function (s) { return (s.kg || 0) === tope; })
    .map(function (s) { return s.reps; });

  if (!rango || rango.tiempo) {
    return { tipo: "mantener", kg: tope, reps: Math.max.apply(null, reps), ultima: ultima };
  }

  var porDebajo = reps.filter(function (r) { return r < rango.min; }).length;
  if (porDebajo * 2 > reps.length) {
    if (tope > 0) {
      var paso = ejercicio.compound && tope >= 20 ? 2.5 : 0.5;
      return { tipo: "bajar", kg: _logRedondearAbajo(tope * 0.9, paso), reps: rango.min, ultima: ultima };
    }
    return { tipo: "mantener", kg: 0, reps: rango.min, ultima: ultima };
  }

  var completas = ultima.series.length >= Math.max(1, Number(ejercicio.sets) || 1);
  var sig = (completas && typeof siguienteCarga === "function")
    ? siguienteCarga(tope, ejercicio.reps, reps, ejercicio.muscle)
    : null;
  if (sig && sig.ok && sig.sube) {
    if (tope === 0) return { tipo: "variante", kg: 0, reps: rango.max, ultima: ultima };
    var inferior = typeof WORKOUT_MUSCULOS_INFERIORES !== "undefined" &&
      WORKOUT_MUSCULOS_INFERIORES.indexOf(ejercicio.muscle) !== -1;
    var kg = ejercicio.compound
      ? sig.pesoKg
      : tope + (inferior ? ENTRENO_LOG_SUBIDA_AISLADO.inferior : ENTRENO_LOG_SUBIDA_AISLADO.superior);
    return { tipo: "subir", kg: Math.round(kg * 100) / 100, reps: rango.min, ultima: ultima };
  }

  var peor = Math.min.apply(null, reps);
  return { tipo: "mantener", kg: tope, reps: Math.min(rango.max, peor + 1), ultima: ultima };
}

/** 1RM estimado (Epley). Solo con peso y entre 1 y 12 repeticiones; si no, 0. */
function entrenoLogE1rm(kg, reps) {
  if (!(kg > 0) || !(reps >= 1) || reps > 12) return 0;
  if (reps === 1) return kg;
  return Math.round(kg * (1 + reps / 30) * 10) / 10;
}

/** Mejores marcas de un ejercicio en las sesiones terminadas. */
function entrenoLogRecords(log, ejercicioId) {
  var r = { kg: 0, e1rm: 0, reps: 0, volumen: 0 };
  log.sesiones.forEach(function (sesion) {
    sesion.ejercicios.forEach(function (e) {
      if (e.id !== ejercicioId) return;
      var volumen = 0;
      _logTrabajo(e).forEach(function (s) {
        var kg = s.kg || 0;
        if (kg > r.kg) r.kg = kg;
        var e1 = entrenoLogE1rm(kg, s.reps);
        if (e1 > r.e1rm) r.e1rm = e1;
        if (s.reps > r.reps) r.reps = s.reps;
        volumen += kg * s.reps;
      });
      if (volumen > r.volumen) r.volumen = volumen;
    });
  });
  return r;
}

/**
 * ¿Esta serie bate una marca anterior? "kg" (más peso que nunca), "e1rm" (más
 * fuerza estimada), "reps" (sin peso: más repeticiones o segundos) o null. Sin
 * historia no hay récord: la primera vez todo sería récord.
 */
function entrenoLogTipoRecord(antes, serie) {
  if (!serie || !serie.hecha || !(serie.reps > 0)) return null;
  if (!(antes.kg > 0 || antes.reps > 0)) return null;
  var kg = serie.kg || 0;
  if (kg > 0) {
    if (kg > antes.kg) return "kg";
    return antes.e1rm > 0 && entrenoLogE1rm(kg, serie.reps) > antes.e1rm ? "e1rm" : null;
  }
  return antes.kg === 0 && serie.reps > antes.reps ? "reps" : null;
}

var _LOG_PRIORIDAD_RECORD = { kg: 3, e1rm: 2, reps: 1 };

/** El mejor récord de unas series contra las marcas de antes, o null. */
function _logMejorRecord(antes, series) {
  var mejor = null;
  series.forEach(function (s) {
    var tipo = entrenoLogTipoRecord(antes, s);
    if (!tipo) return;
    var valor = tipo === "reps" ? s.reps : entrenoLogE1rm(s.kg, s.reps) || s.kg;
    var gana = !mejor ||
      _LOG_PRIORIDAD_RECORD[tipo] > _LOG_PRIORIDAD_RECORD[mejor.tipo] ||
      (tipo === mejor.tipo && valor > mejor.valor);
    if (gana) mejor = { tipo: tipo, kg: s.kg || 0, reps: s.reps, valor: valor };
  });
  return mejor;
}

/**
 * Empieza una sesión del plan. Cada ejercicio trae sus series del plan ya
 * rellenas con la sugerencia de hoy: con un toque en «hecha» queda apuntada.
 * Si ya había una en curso, la sustituye (la pantalla pregunta antes).
 */
function entrenoLogIniciar(log, sesionPlan, semana, ahora) {
  var ejercicios = (sesionPlan.exercises || []).slice(0, ENTRENO_LOG_MAX_EJERCICIOS).map(function (e) {
    var sug = entrenoLogSugerencia(log, e);
    var n = Math.max(1, Math.min(ENTRENO_LOG_MAX_SERIES, Math.floor(Number(e.sets)) || 1));
    var series = [];
    for (var i = 0; i < n; i++) series.push({ kg: sug.kg, reps: sug.reps, hecha: false });
    return _logEjercicio({
      id: e.id, name: e.name, muscle: e.muscle, reps: e.reps, compound: !!e.compound,
      descanso: e.restSeconds, series: series
    });
  }).filter(Boolean);
  log.enCurso = _logSesion({
    id: "s" + ahora.toString(36) + Math.floor(Math.random() * 1679616).toString(36),
    clave: sesionPlan.key, nombre: sesionPlan.name, semana: semana, inicio: ahora,
    ejercicios: ejercicios
  }, false);
  return log.enCurso;
}

function _logSerieEnCurso(log, iEj, iSerie) {
  var e = log.enCurso && log.enCurso.ejercicios[iEj];
  return e ? (e.series[iSerie] || null) : null;
}

/** Cambia una serie de la sesión en curso: { kg?, reps?, hecha? }. Devuelve la serie o null. */
function entrenoLogPonerSerie(log, iEj, iSerie, cambios, ahora) {
  var serie = _logSerieEnCurso(log, iEj, iSerie);
  if (!serie || !cambios) return null;
  if (Object.prototype.hasOwnProperty.call(cambios, "kg")) serie.kg = _logKg(cambios.kg);
  if (Object.prototype.hasOwnProperty.call(cambios, "reps")) serie.reps = _logReps(cambios.reps);
  if (Object.prototype.hasOwnProperty.call(cambios, "hecha")) {
    serie.hecha = cambios.hecha === true;
    if (serie.hecha && typeof ahora === "number") serie.t = ahora;
    else delete serie.t;
  }
  return serie;
}

/** Una serie más al final, copiando la última. false si ya hay el máximo. */
function entrenoLogAnadirSerie(log, iEj) {
  var e = log.enCurso && log.enCurso.ejercicios[iEj];
  if (!e || e.series.length >= ENTRENO_LOG_MAX_SERIES) return false;
  var ultima = e.series[e.series.length - 1];
  e.series.push({ kg: ultima ? ultima.kg : null, reps: ultima ? ultima.reps : null, hecha: false });
  return true;
}

/** Quita la última serie (siempre queda una). */
function entrenoLogQuitarSerie(log, iEj) {
  var e = log.enCurso && log.enCurso.ejercicios[iEj];
  if (!e || e.series.length <= 1) return false;
  e.series.pop();
  return true;
}

/**
 * Series de trabajo hechas, kilos movidos (sin los de tiempo ni el
 * calentamiento) y minutos de una sesión, sin contar las pausas.
 */
function entrenoLogTotales(sesion) {
  var series = 0;
  var volumen = 0;
  sesion.ejercicios.forEach(function (e) {
    var hechas = _logTrabajo(e);
    series += hechas.length;
    if (_logEsTiempo(e)) return;
    hechas.forEach(function (s) { volumen += (s.kg || 0) * s.reps; });
  });
  var fin = typeof sesion.fin === "number" ? sesion.fin : sesion.inicio;
  var activa = Math.max(0, fin - sesion.inicio - (sesion.pausas || 0));
  return { series: series, volumen: Math.round(volumen), minutos: Math.max(1, Math.round(activa / 60000)) };
}

/** Milisegundos de pausa de una sesión en curso, contando la que siga abierta. */
function entrenoLogPausado(sesion, ahora) {
  if (!sesion) return 0;
  var abierta = (typeof sesion.pausaDesde === "number" && sesion.pausaDesde <= ahora) ? ahora - sesion.pausaDesde : 0;
  return (sesion.pausas || 0) + abierta;
}

/**
 * Termina la sesión en curso y la pasa al historial, solo con las series
 * hechas. Si no se hizo ninguna, no se guarda nada. Si la última serie se marcó
 * hace mucho (se olvidó «Terminar»), la sesión acaba un minuto después de ella.
 *
 * @returns {{series, volumen, minutos, records: Array}|null} resumen, o null si no había nada
 */
function entrenoLogTerminar(log, ahora) {
  var s = log.enCurso;
  log.enCurso = null;
  if (!s) return null;

  var records = [];
  var ultimaT = 0;
  var ejercicios = [];
  s.ejercicios.forEach(function (e) {
    var hechas = _logHechas(e);
    if (!hechas.length) return;
    hechas.forEach(function (h) { if (ultimaT < h.t) ultimaT = h.t; });
    var record = _logMejorRecord(entrenoLogRecords(log, e.id), _logTrabajo(e));
    if (record) records.push({ id: e.id, name: e.name, tipo: record.tipo, kg: record.kg, reps: record.reps, tiempo: _logEsTiempo(e) });
    var copia = JSON.parse(JSON.stringify(e));
    copia.series = hechas.map(function (h) { return JSON.parse(JSON.stringify(h)); });
    delete copia.saltado;
    ejercicios.push(copia);
  });
  if (!ejercicios.length) return null;

  var fin = ahora;
  if (ultimaT && ENTRENO_LOG_OLVIDO_MS < ahora - ultimaT) fin = ultimaT + 60000;
  if (fin < s.inicio) fin = s.inicio;
  var pausas = Math.min(entrenoLogPausado(s, fin), fin - s.inicio);

  var terminada = {
    id: s.id, clave: s.clave, nombre: s.nombre, semana: s.semana,
    inicio: s.inicio, fin: fin, ejercicios: ejercicios
  };
  if (0 < pausas) terminada.pausas = Math.round(pausas);
  log.sesiones.push(terminada);
  if (log.sesiones.length > ENTRENO_LOG_MAX_SESIONES) log.sesiones = log.sesiones.slice(-ENTRENO_LOG_MAX_SESIONES);

  var totales = entrenoLogTotales(terminada);
  return { series: totales.series, volumen: totales.volumen, minutos: totales.minutos, records: records };
}

/**
 * Borra una sesión del historial. true si estaba. Queda apuntada en
 * `borradas`: así otro dispositivo, al fusionar con la cuenta, no la devuelve.
 */
function entrenoLogBorrar(log, id, ahora) {
  var antes = log.sesiones.length;
  log.sesiones = log.sesiones.filter(function (s) { return s.id !== id; });
  if (log.sesiones.length === antes) return false;
  log.borradas = _logBorradas((log.borradas || []).concat([{ id: id, t: typeof ahora === "number" ? ahora : Date.now() }]));
  return true;
}

/**
 * Corrige una sesión terminada (lo que se cambió en la pantalla de la sesión
 * en modo «corregir»): se queda con su id, su día y su duración, y con las
 * series que sigan marcadas como hechas. Si no queda ninguna, la sesión se
 * borra. Lo que llega se limpia como todo lo demás.
 *
 * @returns {string|null} "cambiada", "borrada" o null si no estaba
 */
function entrenoLogReemplazar(log, id, editada, ahora) {
  var i = -1;
  log.sesiones.forEach(function (s, k) { if (s.id === id) i = k; });
  if (i === -1 || !editada) return null;
  var original = log.sesiones[i];
  var ejercicios = (Array.isArray(editada.ejercicios) ? editada.ejercicios : []).map(function (e) {
    var copia = JSON.parse(JSON.stringify(e));
    copia.series = (copia.series || []).filter(function (s) { return s && s.hecha === true && 0 < Number(s.reps); });
    delete copia.saltado;
    return copia;
  }).filter(function (e) { return e.series.length; });
  var limpia = _logSesion({
    id: original.id, clave: original.clave, nombre: original.nombre, semana: original.semana,
    inicio: original.inicio, fin: original.fin, pausas: original.pausas,
    editado: typeof ahora === "number" ? ahora : Date.now(),
    ejercicios: ejercicios
  }, true);
  if (!limpia) {
    entrenoLogBorrar(log, id, ahora);
    return "borrada";
  }
  log.sesiones[i] = limpia;
  return "cambiada";
}

/** Lunes a las 00:00 (hora local) de la semana de ese instante. */
function entrenoLogInicioSemana(ms) {
  var d = new Date(ms);
  var desdeLunes = (d.getDay() + 6) % 7;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - desdeLunes).getTime();
}

/** Las últimas n semanas (la más antigua primero, la actual al final) con sus totales. */
function entrenoLogSemanas(log, ahora, n) {
  var lunes = new Date(entrenoLogInicioSemana(ahora));
  var semanas = [];
  for (var i = n - 1; i >= 0; i--) {
    semanas.push({
      inicio: new Date(lunes.getFullYear(), lunes.getMonth(), lunes.getDate() - 7 * i).getTime(),
      fin: new Date(lunes.getFullYear(), lunes.getMonth(), lunes.getDate() - 7 * i + 7).getTime(),
      sesiones: 0, series: 0, volumen: 0, minutos: 0
    });
  }
  log.sesiones.forEach(function (s) {
    for (var k = 0; k < semanas.length; k++) {
      if (s.inicio < semanas[k].inicio || s.inicio >= semanas[k].fin) continue;
      var tot = entrenoLogTotales(s);
      semanas[k].sesiones++;
      semanas[k].series += tot.series;
      semanas[k].volumen += tot.volumen;
      semanas[k].minutos += tot.minutos;
      break;
    }
  });
  return semanas;
}

/**
 * Semanas seguidas con al menos una sesión. Cuenta desde esta semana; si esta
 * aún no tiene ninguna, desde la anterior (la racha no se rompe hasta que acaba).
 */
function entrenoLogRacha(log, ahora) {
  var conSesion = {};
  log.sesiones.forEach(function (s) { conSesion[entrenoLogInicioSemana(s.inicio)] = true; });
  var lunes = new Date(entrenoLogInicioSemana(ahora));
  var paso = conSesion[lunes.getTime()] ? 0 : 1;
  var racha = 0;
  for (;;) {
    var semana = new Date(lunes.getFullYear(), lunes.getMonth(), lunes.getDate() - 7 * (paso + racha)).getTime();
    if (!conSesion[semana]) return racha;
    racha++;
  }
}
