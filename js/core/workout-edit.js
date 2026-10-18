/**
 * js/core/workout-edit.js
 * ─────────────────────────────────────────────────────────────────────────
 * CAMBIAR LA SESIÓN SOBRE LA MARCHA (2026-10-18), como en las apps de
 * gimnasio: sustituir, saltar, quitar o reordenar un ejercicio, añadir otro,
 * juntar dos en superserie (o más, en circuito), poner series de
 * calentamiento, cambiar el tipo de una serie, una nota por ejercicio, la
 * pausa, y la calculadora de discos.
 *
 * Solo datos, sin DOM. Todo trabaja sobre una SESIÓN del diario (la que está
 * en curso, o la copia que se corrige de una ya terminada) y la deja válida:
 * quien la pinta y la guarda es js/ui/entreno-sesion.js.
 *
 * Superseries: los ejercicios seguidos con el mismo `grupo` ("A"…"H") se
 * hacen por rondas: serie 1 de cada uno, descanso, serie 2 de cada uno… Un
 * grupo siempre es un tramo seguido de 2 o más; tras cada cambio se vuelve a
 * repartir (_editNormalizarGrupos), así que nunca queda uno suelto.
 *
 * Expone (globales):
 *   ENTRENO_DISCOS_KG, ENTRENO_BARRA_KG
 *   entrenoEditMover(s, i, paso)            → boolean
 *   entrenoEditSaltar(s, i, saltado)        → boolean
 *   entrenoEditQuitar(s, i)                 → boolean
 *   entrenoEditSustituir(s, i, nuevo, log)  → ejercicio nuevo o null
 *   entrenoEditAnadir(s, nuevo, log)        → ejercicio nuevo o null
 *   entrenoEditSuperserie(s, i)             → boolean (une i con i+1, o los separa)
 *   entrenoEditTipo(s, i, j)                → tipo nuevo ("", "c", "d", "f") o null
 *   entrenoEditCalentamiento(s, i, barra)   → series de calentamiento añadidas
 *   entrenoEditNota(s, i, texto)            → boolean
 *   entrenoEditPausa(s, ahora)              → true si queda en pausa
 *   entrenoEditSiguiente(s, i, j)           → { descanso, foco: [i, j] | null } tras marcar una serie
 *   entrenoDiscos(kg, barra)                → { lado: [discos…], resto, corta } | null
 * ─────────────────────────────────────────────────────────────────────────
 */

/** Discos de gimnasio, de mayor a menor, y la barra olímpica. */
var ENTRENO_DISCOS_KG = [25, 20, 15, 10, 5, 2.5, 1.25];
var ENTRENO_BARRA_KG = 20;
var _EDIT_LETRAS = "ABCDEFGH";
var _EDIT_TIPOS = ["", "c", "d", "f"];

function _editValida(s, i) {
  return !!(s && Array.isArray(s.ejercicios) && s.ejercicios[i]);
}

function _editHechas(e) {
  return e.series.filter(function (x) { return x.hecha; }).length;
}

/**
 * Los grupos vuelven a ser tramos seguidos de 2 o más, con letras en orden
 * (A, B, C…). Un tramo de uno solo deja de ser superserie.
 */
function _editNormalizarGrupos(s) {
  var tramos = [];
  s.ejercicios.forEach(function (e, i) {
    var anterior = i ? s.ejercicios[i - 1] : null;
    if (e.grupo && anterior && anterior.grupo === e.grupo) tramos[tramos.length - 1].push(i);
    else tramos.push([i]);
  });
  var letra = 0;
  tramos.forEach(function (tramo) {
    var primero = s.ejercicios[tramo[0]];
    if (!primero.grupo || tramo.length < 2 || _EDIT_LETRAS.length <= letra) {
      tramo.forEach(function (k) { delete s.ejercicios[k].grupo; });
      return;
    }
    var nueva = _EDIT_LETRAS.charAt(letra++);
    tramo.forEach(function (k) { s.ejercicios[k].grupo = nueva; });
  });
}

/** Sube (paso -1) o baja (paso 1) un ejercicio. Si se sale de su superserie, deja de estar en ella. */
function entrenoEditMover(s, i, paso) {
  var j = i + paso;
  if (!_editValida(s, i) || !_editValida(s, j)) return false;
  var a = s.ejercicios[i];
  var b = s.ejercicios[j];
  var mismoGrupo = !!(a.grupo && a.grupo === b.grupo);
  s.ejercicios[i] = b;
  s.ejercicios[j] = a;
  if (!mismoGrupo) {
    delete a.grupo;
    delete b.grupo;
  }
  _editNormalizarGrupos(s);
  return true;
}

/** Salta un ejercicio (no cuenta para la sesión) o lo recupera. */
function entrenoEditSaltar(s, i, saltado) {
  if (!_editValida(s, i)) return false;
  var e = s.ejercicios[i];
  if (saltado) e.saltado = true;
  else delete e.saltado;
  return true;
}

/** Quita un ejercicio de la sesión. Siempre queda uno. */
function entrenoEditQuitar(s, i) {
  if (!_editValida(s, i) || s.ejercicios.length < 2) return false;
  s.ejercicios.splice(i, 1);
  _editNormalizarGrupos(s);
  return true;
}

/**
 * Un ejercicio nuevo para la sesión, con sus series ya rellenas con la
 * sugerencia de hoy (como al empezar).
 * @param {{id, name, muscle, compound, reps, descanso, sets}} nuevo
 */
function _editEjercicioNuevo(nuevo, n, log) {
  if (!nuevo || typeof nuevo.id !== "string") return null;
  var series = Math.max(1, Math.min(ENTRENO_LOG_MAX_SERIES, Math.floor(Number(n)) || 1));
  var sug = entrenoLogSugerencia(log || entrenoLogVacio(), {
    id: nuevo.id, reps: nuevo.reps, muscle: nuevo.muscle, compound: !!nuevo.compound, sets: series
  });
  var lista = [];
  for (var k = 0; k < series; k++) lista.push({ kg: sug.kg, reps: sug.reps, hecha: false });
  return _logEjercicio({
    id: nuevo.id, name: nuevo.name, muscle: nuevo.muscle, reps: nuevo.reps,
    compound: !!nuevo.compound, descanso: nuevo.descanso, series: lista
  });
}

/**
 * Sustituye un ejercicio por otro con el mismo número de series. Lo hecho del
 * de antes se pierde (la pantalla pregunta antes si había algo). La
 * superserie se conserva; la nota no, era del otro ejercicio.
 */
function entrenoEditSustituir(s, i, nuevo, log) {
  if (!_editValida(s, i)) return null;
  var viejo = s.ejercicios[i];
  var e = _editEjercicioNuevo(nuevo, nuevo && nuevo.sets ? nuevo.sets : viejo.series.length, log);
  if (!e) return null;
  if (viejo.grupo) e.grupo = viejo.grupo;
  s.ejercicios[i] = e;
  return e;
}

/** Añade un ejercicio al final de la sesión. */
function entrenoEditAnadir(s, nuevo, log) {
  if (!s || !Array.isArray(s.ejercicios) || ENTRENO_LOG_MAX_EJERCICIOS <= s.ejercicios.length) return null;
  var e = _editEjercicioNuevo(nuevo, nuevo && nuevo.sets, log);
  if (!e) return null;
  s.ejercicios.push(e);
  return e;
}

/**
 * Une el ejercicio i con el siguiente en una superserie (si alguno ya tenía
 * grupo, se juntan los dos grupos: un circuito); si ya iban juntos, los separa
 * por ahí.
 */
function entrenoEditSuperserie(s, i) {
  if (!_editValida(s, i) || !_editValida(s, i + 1)) return false;
  var a = s.ejercicios[i];
  var b = s.ejercicios[i + 1];
  if (a.grupo && a.grupo === b.grupo) {
    // Separar: desde b hasta el final de ese tramo, otro grupo.
    var viejo = a.grupo;
    for (var k = i + 1; k < s.ejercicios.length && s.ejercicios[k].grupo === viejo; k++) {
      s.ejercicios[k].grupo = "_corte";
    }
  } else {
    var grupo = a.grupo || "_nuevo";
    a.grupo = grupo;
    var otro = b.grupo;
    if (otro) {
      for (var m = i + 1; m < s.ejercicios.length && s.ejercicios[m].grupo === otro; m++) {
        s.ejercicios[m].grupo = grupo;
      }
    } else {
      b.grupo = grupo;
    }
  }
  _editNormalizarGrupos(s);
  return true;
}

/** Cambia el tipo de la serie j: normal → calentamiento → drop set → al fallo → normal. */
function entrenoEditTipo(s, i, j) {
  if (!_editValida(s, i)) return null;
  var serie = s.ejercicios[i].series[j];
  if (!serie) return null;
  var actual = _EDIT_TIPOS.indexOf(serie.tipo || "");
  var siguiente = _EDIT_TIPOS[(actual + 1) % _EDIT_TIPOS.length];
  if (siguiente) serie.tipo = siguiente;
  else delete serie.tipo;
  return siguiente;
}

function _editRedondear(kg, paso, minimo) {
  return Math.max(minimo, Math.round(kg / paso) * paso);
}

/**
 * Series de calentamiento antes de la primera de trabajo, a partir del peso de
 * esa serie (W):
 *   W de 40 kg o más → 40 % × 8, 60 % × 5, 80 % × 3
 *   W de 20 a 40     → 50 % × 8, 75 % × 4
 *   W de menos de 20 → 50 % × 10
 *   sin peso         → una serie con la mitad de repeticiones
 * Con barra, nunca menos de la barra (20 kg) y en pasos de 2,5. Si ya tiene
 * calentamiento, o es de tiempo, no hace nada.
 * @returns {number} series añadidas
 */
function entrenoEditCalentamiento(s, i, barra) {
  if (!_editValida(s, i)) return 0;
  var e = s.ejercicios[i];
  var rango = entrenoLogRango(e.reps);
  if (rango && rango.tiempo) return 0;
  if (e.series.some(function (x) { return x.tipo === "c"; })) return 0;
  var trabajo = e.series.filter(function (x) { return x.tipo !== "c"; });
  var primera = trabajo.filter(function (x) { return !x.hecha; })[0] || trabajo[0];
  if (!primera) return 0;
  var w = Number(primera.kg) || 0;
  var reps = rango ? rango.min : (primera.reps || 8);

  var pasos;
  if (!(0 < w)) pasos = [[0, Math.max(3, Math.round(reps / 2))]];
  else if (40 <= w) pasos = [[0.4, 8], [0.6, 5], [0.8, 3]];
  else if (20 <= w) pasos = [[0.5, 8], [0.75, 4]];
  else pasos = [[0.5, 10]];

  var paso = (barra || e.compound) ? 2.5 : 1;
  var minimo = barra ? ENTRENO_BARRA_KG : paso;
  var nuevas = [];
  pasos.forEach(function (p) {
    var serie;
    if (!(0 < w)) serie = { kg: primera.kg, reps: p[1], hecha: false, tipo: "c" };
    else {
      var kg = _editRedondear(w * p[0], paso, minimo);
      if (w <= kg) return;
      if (nuevas.length && nuevas[nuevas.length - 1].kg === kg) return;
      serie = { kg: kg, reps: p[1], hecha: false, tipo: "c" };
    }
    nuevas.push(serie);
  });
  var caben = ENTRENO_LOG_MAX_SERIES - e.series.length;
  nuevas = nuevas.slice(Math.max(0, nuevas.length - caben));
  if (!nuevas.length) return 0;
  e.series = nuevas.concat(e.series);
  return nuevas.length;
}

/** La nota de un ejercicio (vacía = sin nota). */
function entrenoEditNota(s, i, texto) {
  if (!_editValida(s, i)) return false;
  var nota = String(texto == null ? "" : texto).slice(0, ENTRENO_LOG_MAX_NOTA).trim();
  if (nota) s.ejercicios[i].nota = nota;
  else delete s.ejercicios[i].nota;
  return true;
}

/** Pausa o sigue. El reloj de la sesión no cuenta lo pausado. @returns {boolean} true si queda en pausa */
function entrenoEditPausa(s, ahora) {
  if (!s) return false;
  if (typeof s.pausaDesde === "number") {
    s.pausas = Math.round((s.pausas || 0) + Math.max(0, ahora - s.pausaDesde));
    delete s.pausaDesde;
    return false;
  }
  s.pausaDesde = ahora;
  return true;
}

/** Los índices del tramo de superserie del ejercicio i (sin los saltados), o [i]. */
function _editTramo(s, i) {
  var g = s.ejercicios[i].grupo;
  if (!g) return [i];
  var desde = i;
  while (0 < desde && s.ejercicios[desde - 1].grupo === g) desde--;
  var tramo = [];
  for (var k = desde; k < s.ejercicios.length && s.ejercicios[k].grupo === g; k++) {
    if (!s.ejercicios[k].saltado) tramo.push(k);
  }
  return tramo.length ? tramo : [i];
}

/**
 * Tras marcar hecha la serie j del ejercicio i: ¿toca descansar, y a qué serie
 * se va después? Sin superserie: descanso y nada más. En una superserie, la
 * misma serie del siguiente ejercicio del tramo va sin descanso; al acabar la
 * ronda, descanso y la serie siguiente del primero.
 */
function entrenoEditSiguiente(s, i, j) {
  if (!_editValida(s, i) || !s.ejercicios[i].grupo) return { descanso: true, foco: null };
  var tramo = _editTramo(s, i);
  var pos = tramo.indexOf(i);
  for (var a = pos + 1; a < tramo.length; a++) {
    var serie = s.ejercicios[tramo[a]].series[j];
    if (serie && !serie.hecha) return { descanso: false, foco: [tramo[a], j] };
  }
  for (var b = 0; b < tramo.length; b++) {
    var otra = s.ejercicios[tramo[b]].series[j + 1];
    if (otra && !otra.hecha) return { descanso: true, foco: [tramo[b], j + 1] };
  }
  return { descanso: true, foco: null };
}

/**
 * Discos por lado para cargar una barra con `kg` en total.
 *   lado: los discos de un lado, de mayor a menor
 *   resto: lo que no se puede poner con esos discos (0 si cuadra)
 *   corta: true si el peso es menor que la barra
 * null si no hay peso.
 */
function entrenoDiscos(kg, barra) {
  var total = Number(kg);
  if (!(0 < total)) return null;
  var b = Number(barra) || ENTRENO_BARRA_KG;
  if (total < b) return { lado: [], resto: 0, corta: true };
  var porLado = Math.round((total - b) / 2 * 100) / 100;
  var lado = [];
  ENTRENO_DISCOS_KG.forEach(function (d) {
    while (d <= porLado + 1e-9) {
      lado.push(d);
      porLado = Math.round((porLado - d) * 100) / 100;
    }
  });
  return { lado: lado, resto: porLado, corta: false };
}

/** ¿Lleva barra este ejercicio? (para el calentamiento y los discos) */
function entrenoEditUsaBarra(id) {
  var catalogo = typeof EXERCISE_CATALOG !== "undefined" ? EXERCISE_CATALOG : [];
  for (var i = 0; i < catalogo.length; i++) {
    if (catalogo[i].id === id) return (catalogo[i].equipment || []).indexOf("barra") !== -1;
  }
  return false;
}

/** ¿Hay algo hecho ya en este ejercicio? */
function entrenoEditTieneHechas(s, i) {
  return _editValida(s, i) && 0 < _editHechas(s.ejercicios[i]);
}
