/**
 * js/engine/workout-generator.js
 * ─────────────────────────────────────────────────────────────────────────
 * Generador del PLAN DE ENTRENAMIENTO semanal: qué sesiones hacer, qué
 * ejercicios, cuántas series y repeticiones, cuánto descansar y cómo subir
 * la carga. Es lógica pura (sin DOM): recibe el perfil y devuelve un objeto.
 *
 * ── Principios que aplica (fuerza e hipertrofia de uso general) ─────────
 *   · Cada grupo muscular se entrena al menos 2 veces por semana cuando los
 *     días lo permiten: con cuerpo completo cada sesión lo cubre todo, con
 *     superior/inferior cada grupo sale dos veces, con empuje/tirón/piernas
 *     también.
 *   · Primero los ejercicios compuestos (muchas articulaciones, más carga) y
 *     después los aislados.
 *   · Cada sesión lleva un día de la semana sugerido, con un día libre entre
 *     sesiones cuando hay 2 o 3 días a la semana.
 *   · Series y repeticiones según el objetivo; el esfuerzo se mide en RIR
 *     (repeticiones que te quedarían en reserva): más RIR para principiantes.
 *   · Sobrecarga progresiva por doble progresión y semana de descarga cada
 *     pocas semanas.
 *
 * ── Qué NO hace (todavía) ────────────────────────────────────────────────
 *   · No sustituye a un entrenador: no valora lesiones, técnica ni salud. El
 *     texto de aviso lo dice, y la interfaz debe mostrarlo.
 *   · No elige la carga inicial (la pone quien entrena). Sí calcula cuánto
 *     subir cada vez (siguienteCarga) y el plan de la semana de descarga.
 *   · El nivel no se deduce de los días: se pasa o se asume principiante.
 * ─────────────────────────────────────────────────────────────────────────
 */

var WORKOUT_LEVELS = ["principiante", "intermedio", "avanzado"];

/**
 * Ejercicios máximos por sesión. El principiante hace 3 series por ejercicio,
 * así que 6 ejercicios son unas 18 series, como las del intermedio. Con 5 se
 * caían brazos y core en casi todas las sesiones.
 */
var WORKOUT_LEVEL_CAP = { principiante: 6, intermedio: 6, avanzado: 7 };

/**
 * Ejercicios por sesión según la duración pedida, en minutos. 60 no recorta
 * nada: queda el tope del nivel. Cualquier otro valor se trata como 60.
 */
var WORKOUT_DURACIONES = { 30: 4, 45: 5, 60: 99 };

/** Repeticiones que deben quedar en reserva al terminar cada serie. */
var WORKOUT_LEVEL_RIR = { principiante: 3, intermedio: 2, avanzado: 1 };

/**
 * Series, repeticiones y descanso por objetivo, para compuestos y aislados.
 * Los cuatro primeros salen del objetivo de «Mis datos»; «fuerza» solo se
 * elige en el cuestionario de entrenamiento (opción `objetivo`).
 */
var WORKOUT_PRESCRIPCION = {
  bulk:     { compuesto: { series: 4, reps: "6-10",  descanso: 150 }, aislado: { series: 3, reps: "10-15", descanso: 75 } },
  cut:      { compuesto: { series: 3, reps: "6-10",  descanso: 120 }, aislado: { series: 3, reps: "12-15", descanso: 60 } },
  recomp:   { compuesto: { series: 3, reps: "6-10",  descanso: 120 }, aislado: { series: 3, reps: "10-12", descanso: 75 } },
  maintain: { compuesto: { series: 3, reps: "8-12",  descanso: 90 },  aislado: { series: 2, reps: "10-15", descanso: 60 } },
  fuerza:   { compuesto: { series: 4, reps: "3-6",   descanso: 180 }, aislado: { series: 2, reps: "8-12",  descanso: 90 } }
};

/** El material que se puede marcar uno a uno (sin_material va siempre). */
var WORKOUT_MATERIALES = ["barra", "banco", "mancuernas", "maquina", "polea", "dominadas", "paralelas"];

/**
 * Lo que el usuario quiere trabajar más. Cada grupo: los músculos del catálogo
 * que cuenta (para darles una serie más) y los patrones con los que se le
 * añade un ejercicio en las sesiones que lo admiten.
 */
var WORKOUT_ENFOQUES = {
  pecho:   { musculos: ["pecho"], patrones: ["pecho_aislado", "empuje_horizontal"] },
  espalda: { musculos: ["espalda"], patrones: ["tiron_horizontal", "tiron_vertical"] },
  hombros: { musculos: ["hombros"], patrones: ["elevacion_lateral", "hombro_posterior", "empuje_vertical"] },
  brazos:  { musculos: ["biceps", "triceps"], patrones: ["curl_biceps", "extension_triceps"], porSesion: 2 },
  piernas: { musculos: ["cuadriceps", "isquios", "gemelos"], patrones: ["aislado_pierna", "curl_isquio", "zancada", "sentadilla"] },
  gluteos: { musculos: ["gluteos"], patrones: ["gluteo", "zancada", "bisagra"] },
  abdomen: { musculos: ["core"], patrones: ["core"] }
};
var WORKOUT_ENFOQUE_MAX = 3;

/** Qué patrones admite cada tipo de sesión al añadir lo del enfoque (cuerpo completo: todos). */
var WORKOUT_PATRONES_TIPO = {
  superior: ["empuje_horizontal", "pecho_aislado", "empuje_vertical", "elevacion_lateral", "hombro_posterior", "tiron_horizontal", "tiron_vertical", "curl_biceps", "extension_triceps", "core"],
  inferior: ["sentadilla", "zancada", "bisagra", "aislado_pierna", "curl_isquio", "gluteo", "pantorrilla", "core"],
  empuje: ["empuje_horizontal", "pecho_aislado", "empuje_vertical", "elevacion_lateral", "extension_triceps", "core"],
  tiron: ["tiron_horizontal", "tiron_vertical", "hombro_posterior", "curl_biceps", "core"]
};

/**
 * Molestias que el usuario marca: los ejercicios que se quitan para no cargar
 * esa zona. Es prudencia general, no un diagnóstico (el aviso del plan lo dice).
 */
var WORKOUT_LIMITACIONES = {
  rodillas: ["zancadas", "zancada_mancuernas", "sentadilla_bulgara", "sentadilla_bulgara_sin_material", "sentadilla_isometrica_pared", "extension_cuadriceps", "sentadilla_hack_maquina"],
  espalda: ["peso_muerto_barra", "buenos_dias_sin_material", "remo_barra", "sentadilla_barra", "press_militar_barra"],
  hombros: ["fondos_paralelas", "fondos_silla", "press_militar_barra", "press_arnold", "pike_flexiones", "pullover_mancuerna"]
};

/** Si una molestia deja un patrón sin ejercicio, estos lo sustituyen (en orden). */
var WORKOUT_SUSTITUTOS = {
  zancada: ["gluteo", "curl_isquio"],
  sentadilla: ["gluteo", "aislado_pierna"],
  bisagra: ["gluteo", "curl_isquio"],
  aislado_pierna: ["curl_isquio", "gluteo"],
  empuje_vertical: ["elevacion_lateral", "hombro_posterior"],
  empuje_horizontal: ["pecho_aislado"],
  extension_triceps: ["curl_biceps"]
};

/**
 * Mínimo de series semanales que se avisa si no se llega (grupos grandes).
 * El principiante hace 3 series por ejercicio: dos sesiones a la semana ya dan 6.
 */
var WORKOUT_SERIES_MINIMAS = 8;
var WORKOUT_SERIES_MINIMAS_PRINCIPIANTE = 6;
var WORKOUT_GRUPOS_GRANDES = ["pecho", "espalda", "cuadriceps", "isquios", "hombros"];

/** Cada sesión es una lista ORDENADA de patrones de movimiento. */
var WORKOUT_SESIONES = {
  cuerpo_completo_A: { name: "Cuerpo completo A", patrones: ["sentadilla", "bisagra", "empuje_horizontal", "tiron_horizontal", "empuje_vertical", "core"] },
  cuerpo_completo_B: { name: "Cuerpo completo B", patrones: ["zancada", "bisagra", "tiron_vertical", "empuje_horizontal", "elevacion_lateral", "core"] },
  superior_A:        { name: "Superior A",        patrones: ["empuje_horizontal", "tiron_horizontal", "empuje_vertical", "tiron_vertical", "curl_biceps", "extension_triceps", "elevacion_lateral"] },
  superior_B:        { name: "Superior B",        patrones: ["empuje_vertical", "tiron_vertical", "empuje_horizontal", "tiron_horizontal", "hombro_posterior", "extension_triceps", "curl_biceps"] },
  inferior_A:        { name: "Inferior A",        patrones: ["sentadilla", "bisagra", "aislado_pierna", "curl_isquio", "pantorrilla", "core"] },
  inferior_B:        { name: "Inferior B",        patrones: ["zancada", "gluteo", "bisagra", "curl_isquio", "pantorrilla", "core"] },
  empuje_A:          { name: "Empuje A",          patrones: ["empuje_horizontal", "empuje_vertical", "pecho_aislado", "elevacion_lateral", "extension_triceps"] },
  empuje_B:          { name: "Empuje B",          patrones: ["empuje_vertical", "empuje_horizontal", "elevacion_lateral", "extension_triceps"] },
  tiron_A:           { name: "Tirón A",           patrones: ["tiron_vertical", "tiron_horizontal", "hombro_posterior", "curl_biceps"] },
  tiron_B:           { name: "Tirón B",           patrones: ["tiron_horizontal", "tiron_vertical", "hombro_posterior", "curl_biceps"] },
  piernas_A:         { name: "Piernas A",         patrones: ["sentadilla", "bisagra", "aislado_pierna", "curl_isquio", "pantorrilla", "core"] },
  piernas_B:         { name: "Piernas B",         patrones: ["zancada", "bisagra", "gluteo", "curl_isquio", "pantorrilla", "core"] },
  // Las dos del programa 5×5 (2026-10-23): tres básicos, alternando A y B.
  cinco_A:           { name: "5×5 A",             patrones: ["sentadilla", "empuje_horizontal", "tiron_horizontal"] },
  cinco_B:           { name: "5×5 B",             patrones: ["sentadilla", "empuje_vertical", "bisagra"] },
  // «Añadir entrenamiento → libre» (2026-10-23): sin huecos; solo lleva lo
  // que se le añada a mano.
  libre:             { name: "Sesión libre",      patrones: [] }
};

/**
 * Programas listos para elegir en «Plan» (2026-10-23). Cada uno es la lista de
 * sesiones de la semana (claves de WORKOUT_SESIONES); los ejercicios los sigue
 * eligiendo el generador con el material, el nivel y lo cambiado a mano.
 *   niveles, objetivos  para los filtros ("masa", "fuerza", "forma")
 *   pauta               solo 5×5: series, repeticiones y descanso de los compuestos
 */
var WORKOUT_PROGRAMAS = [
  { id: "cuerpo_completo_2", sesiones: ["cuerpo_completo_A", "cuerpo_completo_B"],
    niveles: ["principiante", "intermedio"], objetivos: ["masa", "forma"] },
  { id: "cuerpo_completo_3", sesiones: ["cuerpo_completo_A", "cuerpo_completo_B", "cuerpo_completo_A"],
    niveles: ["principiante", "intermedio"], objetivos: ["masa", "fuerza", "forma"] },
  { id: "cinco_por_cinco", sesiones: ["cinco_A", "cinco_B", "cinco_A"],
    niveles: ["principiante", "intermedio"], objetivos: ["fuerza"], pauta: { series: 5, reps: "5-5", descanso: 180 } },
  { id: "empuje_tiron_piernas_3", sesiones: ["empuje_A", "tiron_A", "piernas_A"],
    niveles: ["intermedio", "avanzado"], objetivos: ["masa", "forma"] },
  { id: "superior_inferior_4", sesiones: ["superior_A", "inferior_A", "superior_B", "inferior_B"],
    niveles: ["intermedio", "avanzado"], objetivos: ["masa", "fuerza", "forma"] },
  { id: "superior_inferior_5", sesiones: ["superior_A", "inferior_A", "superior_B", "inferior_B", "cuerpo_completo_A"],
    niveles: ["intermedio", "avanzado"], objetivos: ["masa"] },
  { id: "empuje_tiron_piernas_6", sesiones: ["empuje_A", "tiron_A", "piernas_A", "empuje_B", "tiron_B", "piernas_B"],
    niveles: ["avanzado"], objetivos: ["masa"] }
];

/** Como mucho siete sesiones a la semana en una estructura propia. */
var WORKOUT_ESTRUCTURA_MAX = 7;
var WORKOUT_NOMBRE_SESION_MAX = 30;

/** Qué sesiones se hacen según los días a la semana. */
var WORKOUT_DIVISIONES = {
  1: { nombre: "cuerpo_completo",       sesiones: ["cuerpo_completo_A"] },
  2: { nombre: "cuerpo_completo",       sesiones: ["cuerpo_completo_A", "cuerpo_completo_B"] },
  3: { nombre: "cuerpo_completo",       sesiones: ["cuerpo_completo_A", "cuerpo_completo_B", "cuerpo_completo_A"] },
  4: { nombre: "superior_inferior",     sesiones: ["superior_A", "inferior_A", "superior_B", "inferior_B"] },
  5: { nombre: "superior_inferior",     sesiones: ["superior_A", "inferior_A", "superior_B", "inferior_B", "cuerpo_completo_A"] },
  6: { nombre: "empuje_tiron_piernas",  sesiones: ["empuje_A", "tiron_A", "piernas_A", "empuje_B", "tiron_B", "piernas_B"] }
};

var WORKOUT_CALENTAMIENTO = "Antes de cada sesión: 5 minutos de cardio suave y 1-2 series ligeras del primer ejercicio, sin llegar al fallo.";

var WORKOUT_PROGRESION = "Doble progresión: cuando completes todas las series en lo alto del rango de repeticiones, sube el peso en la siguiente sesión (unos 2,5 kg en tren superior y 5 kg en tren inferior). Si no llegas, mantén el peso y busca una repetición más.";

var WORKOUT_DESCARGA = { cadaSemanas: 5, rir: 4, regla: "Cada 5ª semana: mismos ejercicios con la mitad de series y sin llegar al fallo, para recuperarte." };

/** Incremento de carga de la doble progresión: el tren inferior sube más. */
var WORKOUT_INCREMENTO_KG = { superior: 2.5, inferior: 5 };
var WORKOUT_MUSCULOS_INFERIORES = ["cuadriceps", "isquios", "gluteos", "gemelos"];

var WORKOUT_AVISO = "Plan general de fuerza e hipertrofia. Si tienes lesiones o problemas de salud, consulta a un profesional antes de empezar.";

/** Día de la semana de cada sesión (1 = lunes … 7 = domingo), con descanso entre sesiones cuando cabe. */
var WORKOUT_DIAS_SEMANA = {
  1: [1],
  2: [1, 4],
  3: [1, 3, 5],
  4: [1, 2, 4, 5],
  5: [1, 2, 4, 5, 6],
  6: [1, 2, 3, 4, 5, 6],
  7: [1, 2, 3, 4, 5, 6, 7]
};

/** Recomendación de cardio según el objetivo. Es orientativa, no un plan médico. */
var WORKOUT_CARDIO = {
  bulk: "Cardio opcional y suave (10-20 minutos al final de la sesión o en días libres), para la salud cardiovascular sin restar energía a la fuerza.",
  cut: "Cardio 2-3 días a la semana, 20-30 minutos a ritmo moderado (andar rápido, bici). Ayuda al gasto diario sin tanto coste en recuperación.",
  recomp: "Cardio opcional: 1-2 sesiones suaves de 20-30 minutos a la semana para la salud cardiovascular.",
  maintain: "Cardio opcional: 1-2 sesiones suaves de 20-30 minutos a la semana para la salud cardiovascular.",
  fuerza: "Cardio suave y corto, 1-2 veces a la semana: lo justo para la salud sin quitar recuperación a la fuerza."
};

/** true si la clave es propia del objeto (no heredada, p. ej. "constructor"). */
function hasOwn(obj, clave) {
  return typeof clave === "string" && Object.prototype.hasOwnProperty.call(obj, clave);
}

/** true si el ejercicio se puede hacer con el material disponible. */
function puedeHacerse(ejercicio, material) {
  return ejercicio.equipment.every(function (item) { return material.indexOf(item) !== -1; });
}

/** true si el ejercicio está al alcance del nivel (no se sube de nivel solo). */
function nivelAlcanza(ejercicio, nivel) {
  return WORKOUT_LEVELS.indexOf(ejercicio.level) <= WORKOUT_LEVELS.indexOf(nivel);
}

/**
 * Series, repeticiones, descanso y RIR de un ejercicio según objetivo y nivel.
 * Con `pauta` (la del programa 5×5) los compuestos llevan esa, tal cual.
 */
function prescribirEjercicio(ejercicio, objetivo, nivel, pauta) {
  if (pauta && ejercicio.compound) {
    return { sets: pauta.series, reps: pauta.reps, restSeconds: pauta.descanso, rir: WORKOUT_LEVEL_RIR[nivel] };
  }
  var base = WORKOUT_PRESCRIPCION[objetivo][ejercicio.compound ? "compuesto" : "aislado"];
  var series = nivel === "principiante" ? Math.min(base.series, 3) : base.series;
  var reps = ejercicio.repsOverride || base.reps;
  // Un principiante aguanta mejor un rango algo más alto para aprender bien el gesto.
  if (nivel === "principiante" && objetivo === "bulk" && ejercicio.compound) reps = "8-12";
  if (nivel === "principiante" && objetivo === "fuerza" && ejercicio.compound && !ejercicio.repsOverride) reps = "5-8";
  return { sets: series, reps: reps, restSeconds: base.descanso, rir: WORKOUT_LEVEL_RIR[nivel] };
}

/** Material a partir de lo marcado uno a uno: solo códigos conocidos y sin_material siempre. null si no es una lista. */
function normalizarMaterial(lista) {
  if (!Array.isArray(lista)) return null;
  var material = ["sin_material"];
  lista.forEach(function (m) {
    if (WORKOUT_MATERIALES.indexOf(m) !== -1 && material.indexOf(m) === -1) material.push(m);
  });
  return material;
}

/** El nombre del juego de material que coincide con la lista, o "personalizado". */
function presetDeMaterial(material) {
  var clave = material.slice().sort().join(",");
  var encontrado = "personalizado";
  Object.keys(EQUIPAMIENTO_DISPONIBLE).forEach(function (k) {
    if (EQUIPAMIENTO_DISPONIBLE[k].slice().sort().join(",") === clave) encontrado = k;
  });
  return encontrado;
}

/** Grupos del enfoque: solo los conocidos, sin repetir y como mucho WORKOUT_ENFOQUE_MAX. */
function normalizarEnfoque(lista) {
  if (!Array.isArray(lista)) return [];
  var r = [];
  lista.forEach(function (g) { if (hasOwn(WORKOUT_ENFOQUES, g) && r.indexOf(g) === -1) r.push(g); });
  return r.slice(0, WORKOUT_ENFOQUE_MAX);
}

/** Molestias marcadas: solo las conocidas y sin repetir. */
function normalizarLimitaciones(lista) {
  if (!Array.isArray(lista)) return [];
  var r = [];
  lista.forEach(function (l) { if (hasOwn(WORKOUT_LIMITACIONES, l) && r.indexOf(l) === -1) r.push(l); });
  return r;
}

/** Días elegidos (1 lunes … 7 domingo), ordenados; null si no cuadran con el número de días. */
function normalizarDiasSemana(lista, dias) {
  if (!Array.isArray(lista)) return null;
  var r = [];
  lista.forEach(function (d) {
    var n = Math.floor(Number(d));
    if (n >= 1 && n <= 7 && r.indexOf(n) === -1) r.push(n);
  });
  r.sort(function (a, b) { return a - b; });
  return r.length === dias ? r : null;
}

/** Tipo de sesión para el enfoque: "todo" (cuerpo completo), superior, inferior, empuje o tirón. */
function tipoSesion(clave) {
  var prefijo = String(clave).split("_")[0];
  if (prefijo === "piernas") return "inferior";
  return hasOwn(WORKOUT_PATRONES_TIPO, prefijo) ? prefijo : "todo";
}

/** Cuántos materiales reales pide un ejercicio (sin_material no cuenta). */
function pesoMaterial(ejercicio) {
  return ejercicio.equipment.filter(function (i) { return i !== "sin_material"; }).length;
}

/** Texto para comparar: minúsculas y sin acentos ("Sentadilla" = "sentadilla"). */
function normalizarTextoEjercicio(texto) {
  return String(texto || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
}

/**
 * Los términos que el usuario ha escrito para no hacer ciertos ejercicios.
 * Acepta una lista o un texto separado por comas. Menos de 3 letras no cuentan:
 * "de" o "sí" tapan demasiado.
 */
function normalizarExcluidos(valor) {
  var lista = Array.isArray(valor) ? valor : String(valor || "").split(",");
  var vistos = {};
  return lista.map(normalizarTextoEjercicio).filter(function (termino) {
    if (termino.length < 3 || vistos[termino]) return false;
    vistos[termino] = true;
    return true;
  });
}

/** Cambios a mano { idDelPlan: idElegido }: solo textos, sin claves heredadas. */
function normalizarCambios(valor) {
  var r = {};
  if (!valor || typeof valor !== "object" || Array.isArray(valor)) return r;
  Object.keys(valor).forEach(function (de) {
    if (typeof valor[de] === "string" && valor[de] !== de) r[de] = valor[de];
  });
  return r;
}

/** Huecos quitados a mano ["clave_sesion:patron"] → { "clave_sesion:patron": true }. */
function normalizarQuitados(valor) {
  var r = {};
  (Array.isArray(valor) ? valor : []).forEach(function (q) { if (typeof q === "string") r[q] = true; });
  return r;
}

/**
 * Ejercicios añadidos a mano { sesion: [ids] }. La sesión es la clave de
 * WORKOUT_SESIONES o, con estructura propia, el id de esa sesión ("p3").
 */
function normalizarExtras(valor) {
  var r = {};
  if (!valor || typeof valor !== "object" || Array.isArray(valor)) return r;
  Object.keys(valor).forEach(function (clave) {
    if (WORKOUT_ID_SESION.test(clave) && Array.isArray(valor[clave])) {
      r[clave] = valor[clave].filter(function (id) { return typeof id === "string"; });
    }
  });
  return r;
}

/** Id de una sesión de la estructura, o clave de WORKOUT_SESIONES: letras, cifras y «_». */
var WORKOUT_ID_SESION = /^[A-Za-z0-9_]{1,40}$/;

/**
 * La semana tal como la ha montado el usuario (2026-10-23): una lista de
 * sesiones { i: id propio, k: clave de WORKOUT_SESIONES, n: nombre propio ("" =
 * el de siempre), d: día 1…7 (0 = el que toque) }. null si no hay ninguna
 * válida. Como mucho WORKOUT_ESTRUCTURA_MAX; ids sin repetir.
 */
function normalizarEstructura(lista) {
  if (!Array.isArray(lista)) return null;
  var r = [];
  var vistos = {};
  lista.forEach(function (x) {
    if (!x || typeof x !== "object" || r.length >= WORKOUT_ESTRUCTURA_MAX) return;
    if (typeof x.i !== "string" || !/^[a-z0-9]{1,12}$/.test(x.i) || vistos[x.i]) return;
    if (!hasOwn(WORKOUT_SESIONES, x.k)) return;
    var n = typeof x.n === "string" ? x.n.replace(/[\u0000-\u001f<>]/g, "").trim().slice(0, WORKOUT_NOMBRE_SESION_MAX) : "";
    var d = Math.floor(Number(x.d));
    vistos[x.i] = true;
    r.push({ i: x.i, k: x.k, n: n, d: d >= 1 && d <= 7 ? d : 0 });
  });
  return r.length ? r : null;
}

/** Un programa listo por su id, o null. */
function programaPorId(id) {
  for (var i = 0; i < WORKOUT_PROGRAMAS.length; i++) if (WORKOUT_PROGRAMAS[i].id === id) return WORKOUT_PROGRAMAS[i];
  return null;
}

/**
 * La estructura de un programa listo: sus sesiones con ids p1, p2… y sus días
 * (los que eligió el usuario si son tantos como sesiones; si no, los de siempre).
 */
function estructuraDePrograma(id, diasSemana) {
  var programa = programaPorId(id);
  if (!programa) return null;
  var n = programa.sesiones.length;
  var dias = normalizarDiasSemana(diasSemana, n) || WORKOUT_DIAS_SEMANA[n];
  return programa.sesiones.map(function (k, j) { return { i: "p" + (j + 1), k: k, n: "", d: dias[j] }; });
}

/** true si el nombre del ejercicio, en cualquiera de sus idiomas, contiene un término excluido. */
function ejercicioExcluido(ejercicio, excluidos) {
  if (!excluidos || !excluidos.length) return false;
  var nombres = [ejercicio.name, ejercicio.name_en, ejercicio.name_ru, ejercicio.name_uk]
    .map(normalizarTextoEjercicio);
  return excluidos.some(function (termino) {
    return nombres.some(function (nombre) { return nombre.indexOf(termino) !== -1; });
  });
}

/**
 * Elige el ejercicio de un patrón. Prefiere los que aún no se han usado en la
 * semana (para variar entre sesiones) y luego el orden del catálogo. Nunca
 * repite un ejercicio dentro de la misma sesión.
 */
function elegirEjercicio(patron, material, nivel, usadosSesion, usadosSemana, excluidos, evitar) {
  var candidatos = EXERCISE_CATALOG.filter(function (e) {
    return e.pattern === patron && puedeHacerse(e, material) && nivelAlcanza(e, nivel) && !usadosSesion[e.id]
      && !ejercicioExcluido(e, excluidos) && !(evitar && evitar[e.id]);
  });
  if (!candidatos.length) return null;
  // Sin material solo si no hay nada con material: un "buenos días" sin lastre
  // no sustituye a una bisagra con barra o mancuernas, aunque no se haya usado.
  var conMaterial = candidatos.filter(function (c) { return pesoMaterial(c) > 0; });
  if (conMaterial.length) candidatos = conMaterial;
  candidatos.sort(function (a, b) {
    var pa = usadosSemana[a.id] ? 1 : 0;
    var pb = usadosSemana[b.id] ? 1 : 0;
    return pa - pb;
  });
  return candidatos[0];
}

/**
 * Construye una sesión a partir de sus patrones, respetando el tope por nivel.
 * `instancia` es la sesión a la que van los huecos quitados y lo añadido a mano:
 * la propia clave sin estructura, o su id ("p3") con ella (2026-10-23), para
 * que dos copias de la misma plantilla se cambien cada una por su lado.
 */
function construirSesion(clave, objetivo, nivel, material, usadosSemana, avisos, opciones, instancia) {
  var plantilla = WORKOUT_SESIONES[clave];
  var extra = opciones || {};
  var sitio = instancia || clave;
  var tope = Math.min(WORKOUT_LEVEL_CAP[nivel], extra.topeSesion || 99);
  var usadosSesion = {};
  var ejercicios = [];
  var quitados = extra.quitados || {};
  var cambios = extra.cambios || {};

  /**
   * Lo cambiado a mano manda (2026-10-18): si el usuario cambió este
   * ejercicio por otro, va el otro, siempre que se pueda hacer con su
   * material y no esté ya en la sesión. El nivel y las exclusiones no lo
   * frenan: lo eligió él a propósito.
   */
  function conCambio(ejercicio) {
    if (!ejercicio || !hasOwn(cambios, ejercicio.id)) return ejercicio;
    var otro = null;
    EXERCISE_CATALOG.some(function (c) { if (c.id === cambios[ejercicio.id]) { otro = c; return true; } return false; });
    if (!otro || !puedeHacerse(otro, material) || usadosSesion[otro.id]) return ejercicio;
    return { cambiadoDe: ejercicio.id, ejercicio: otro };
  }

  function poner(elegido, enfoque, patron) {
    var cambio = conCambio(elegido);
    var ejercicio = cambio && cambio.cambiadoDe ? cambio.ejercicio : elegido;
    usadosSesion[ejercicio.id] = true;
    usadosSemana[ejercicio.id] = (usadosSemana[ejercicio.id] || 0) + 1;
    var pauta = prescribirEjercicio(ejercicio, objetivo, nivel, extra.pauta);
    var e = {
      id: ejercicio.id,
      name: ejercicio.name,
      muscle: ejercicio.muscle,
      compound: ejercicio.compound,
      tecnica: ejercicio.tecnica,
      sets: pauta.sets,
      reps: pauta.reps,
      restSeconds: pauta.restSeconds,
      rir: pauta.rir,
      patron: patron
    };
    if (enfoque) e.enfoque = true;
    if (cambio && cambio.cambiadoDe) e.cambiadoDe = cambio.cambiadoDe;
    ejercicios.push(e);
  }

  // Con acento, lo del acento entra antes que el resto de aislados: si la
  // duración recorta, no se cae justo lo que se pidió. Los tres primeros
  // patrones (los básicos de cada plantilla) van siempre delante.
  var patronesAcento = {};
  (extra.enfoque || []).forEach(function (grupo) {
    WORKOUT_ENFOQUES[grupo].patrones.forEach(function (p) { patronesAcento[p] = true; });
  });
  var base = plantilla.patrones.slice(0, 3);
  var resto = plantilla.patrones.slice(3);
  var orden = base.concat(resto.filter(function (p) { return patronesAcento[p]; }), resto.filter(function (p) { return !patronesAcento[p]; }));

  // Un hueco quitado a mano cuenta para el tope: quitar uno no hace entrar otro.
  var vacios = 0;
  orden.forEach(function (patron, i) {
    if (tope <= ejercicios.length + vacios) return;
    // El usuario quitó este hueco de esta sesión: se queda vacío, sin aviso.
    if (quitados[sitio + ":" + patron]) { vacios++; return; }
    var ejercicio = elegirEjercicio(patron, material, nivel, usadosSesion, usadosSemana, extra.excluidos, extra.evitar);
    if (!ejercicio && extra.evitar && elegirEjercicio(patron, material, nivel, usadosSesion, usadosSemana, extra.excluidos, null)) {
      // Una molestia ha quitado lo de este patrón: va otro que no cargue esa
      // zona. Mejor uno que la sesión no tenga más adelante, para no quitarle
      // su ejercicio a ese patrón.
      var pendientes = orden.slice(i + 1);
      var sustitutos = WORKOUT_SUSTITUTOS[patron] || [];
      sustitutos.filter(function (o) { return pendientes.indexOf(o) === -1; })
        .concat(sustitutos.filter(function (o) { return pendientes.indexOf(o) !== -1; }))
        .some(function (otro) {
          ejercicio = elegirEjercicio(otro, material, nivel, usadosSesion, usadosSemana, extra.excluidos, extra.evitar);
          return !!ejercicio;
        });
    }
    if (!ejercicio) {
      avisos.push("falta_ejercicio:" + patron);
      return;
    }
    poner(ejercicio, false, patron);
  });

  // Enfoque: un ejercicio más del grupo elegido si la sesión lo admite (en un
  // día de tirón no entra el tríceps) y si cabe. Con enfoque se permite uno
  // más que el tope del nivel, nunca más de lo que deja la duración.
  var topeEnfoque = Math.min(WORKOUT_LEVEL_CAP[nivel] + 1, extra.topeSesion || 99);
  var tipo = tipoSesion(clave);
  // Una sesión libre no tiene huecos: el acento no le mete nada que no se pidió.
  (plantilla.patrones.length ? (extra.enfoque || []) : []).forEach(function (grupo) {
    var def = WORKOUT_ENFOQUES[grupo];
    var admitidos = tipo === "todo" ? null : WORKOUT_PATRONES_TIPO[tipo];
    var puestos = 0;
    def.patrones.forEach(function (patron) {
      if ((def.porSesion || 1) <= puestos || topeEnfoque <= ejercicios.length) return;
      if (admitidos && admitidos.indexOf(patron) === -1) return;
      if (quitados[sitio + ":" + patron]) return;
      var ejercicio = elegirEjercicio(patron, material, nivel, usadosSesion, usadosSemana, extra.excluidos, extra.evitar);
      if (!ejercicio) return;
      poner(ejercicio, true, patron);
      puestos++;
    });
  });

  // Lo añadido a mano a esta sesión, al final y sin tope: lo pidió el usuario.
  // Si con el material de ahora no se puede hacer, no entra.
  ((extra.extras && hasOwn(extra.extras, sitio) && extra.extras[sitio]) || []).forEach(function (id) {
    var cat = null;
    EXERCISE_CATALOG.some(function (c) { if (c.id === id) { cat = c; return true; } return false; });
    if (!cat || !puedeHacerse(cat, material) || usadosSesion[cat.id]) return;
    poner(cat, false, "extra");
    ejercicios[ejercicios.length - 1].extra = true;
  });

  // Y una serie más en todo lo que trabaja esos músculos.
  var musculosEnfoque = {};
  (extra.enfoque || []).forEach(function (grupo) {
    WORKOUT_ENFOQUES[grupo].musculos.forEach(function (m) { musculosEnfoque[m] = true; });
  });
  var maxSeries = nivel === "principiante" ? 4 : 5;
  ejercicios.forEach(function (e) {
    if (musculosEnfoque[e.muscle]) e.sets = Math.min(e.sets + 1, Math.max(e.sets, maxSeries));
  });

  // Compuestos primero: es donde más conviene tener energía fresca.
  ejercicios.sort(function (a, b) { return (b.compound ? 1 : 0) - (a.compound ? 1 : 0); });

  return { key: clave, instancia: sitio, name: plantilla.name, exercises: ejercicios };
}

/** Días a la semana: número entero entre 0 y 6. Avisa si no es válido. */
function normalizarDias(valor, avisos) {
  if (valor === undefined || valor === null || valor === "") {
    avisos.push("sin_dias_de_entrenamiento");
    return 0;
  }
  var n = Math.floor(Number(valor));
  if (n === 0) {
    avisos.push("sin_dias_de_entrenamiento");
    return 0;
  }
  if (!isFinite(n) || n < 0) {
    avisos.push("dias_no_valido");
    return 0;
  }
  if (n > 6) {
    avisos.push("maximo_6_dias");
    return 6;
  }
  return n;
}

/**
 * Plan de entrenamiento semanal.
 *
 * @param {object} profile  - { entrenamientos: días/semana, goal: "bulk" | "cut" | "recomp" | "maintain" }
 * @param {object} [options] - { nivel: "principiante" | "intermedio" | "avanzado",
 *                               equipamiento: "gimnasio" | "mancuernas" | "sin_material",
 *                               material: [códigos de WORKOUT_MATERIALES] (manda sobre equipamiento),
 *                               objetivo: clave de WORKOUT_PRESCRIPCION (manda sobre goal; "auto" = el de goal),
 *                               duracion: 30 | 45 | 60, excluir: texto o lista de nombres,
 *                               enfoque: [grupos de WORKOUT_ENFOQUES], limitaciones: [claves de WORKOUT_LIMITACIONES],
 *                               diasSemana: [1…7] tantos como días (si no, los de WORKOUT_DIAS_SEMANA),
 *                               cambios: { idDelPlan: idElegido }, quitados: ["clave_sesion:patron"],
 *                               extras: { clave_sesion: [ids] } (lo cambiado a mano, 2026-10-18),
 *                               estructura: [{ i, k, n, d }] la semana montada a mano (manda sobre
 *                               los días; ver normalizarEstructura), programa: id de WORKOUT_PROGRAMAS
 *                               (2026-10-23) }
 *                  Cada sesión lleva `instancia` (su id en la estructura, o su clave) y, con
 *                  nombre propio, `nombrePropio: true` y ese `name`.
 *                  Cada ejercicio del plan lleva `patron` (el hueco que ocupa, "extra" si se añadió
 *                  a mano), y `cambiadoDe` si es un cambio a mano.
 * @returns {object} plan (ver las claves al final de la función). `ok: false`
 *                   si no hay días de entrenamiento: no hay plan que dar.
 */
function generateWorkoutPlan(profile, options) {
  var p = profile || {};
  var opts = options || {};
  var avisos = [];

  // La semana montada a mano (2026-10-23) manda sobre los días: son sus sesiones.
  var estructura = normalizarEstructura(opts.estructura);
  var programa = programaPorId(opts.programa);
  var dias = estructura ? estructura.length : normalizarDias(p.entrenamientos, avisos);

  var objetivo = "maintain";
  if (p.goal !== undefined && p.goal !== null) {
    if (hasOwn(WORKOUT_PRESCRIPCION, p.goal)) objetivo = p.goal;
    else avisos.push("objetivo_desconocido");
  }
  // El objetivo del cuestionario de entrenamiento manda sobre el de «Mis datos».
  if (opts.objetivo !== undefined && opts.objetivo !== null && opts.objetivo !== "" && opts.objetivo !== "auto") {
    if (hasOwn(WORKOUT_PRESCRIPCION, opts.objetivo)) objetivo = opts.objetivo;
    else avisos.push("objetivo_desconocido");
  }

  // El material marcado uno a uno manda sobre el juego elegido (y entonces
  // el juego es solo un nombre: "personalizado" no es un error).
  var material = normalizarMaterial(opts.material);
  var equipamiento = "gimnasio";
  if (opts.equipamiento !== undefined && !material) {
    if (hasOwn(EQUIPAMIENTO_DISPONIBLE, opts.equipamiento)) equipamiento = opts.equipamiento;
    else avisos.push("equipamiento_desconocido");
  }
  if (material) equipamiento = presetDeMaterial(material);
  else material = EQUIPAMIENTO_DISPONIBLE[equipamiento];

  var nivel = "principiante";
  if (WORKOUT_LEVELS.indexOf(opts.nivel) !== -1) nivel = opts.nivel;
  else avisos.push("nivel_no_indicado");

  var enfoque = normalizarEnfoque(opts.enfoque);
  var limitaciones = normalizarLimitaciones(opts.limitaciones);

  if (dias === 0) {
    return {
      ok: false, warnings: avisos, objetivo: objetivo, nivel: nivel, equipamiento: equipamiento,
      material: material, enfoque: enfoque, limitaciones: limitaciones,
      dias: 0, division: null, sesiones: [], seriesPorSemana: {},
      progresion: WORKOUT_PROGRESION, descarga: WORKOUT_DESCARGA,
      calentamiento: WORKOUT_CALENTAMIENTO, cardio: WORKOUT_CARDIO[objetivo], aviso: WORKOUT_AVISO
    };
  }

  if (dias === 1) avisos.push("un_solo_dia");

  var division = estructura ? null : WORKOUT_DIVISIONES[dias];
  var usadosSemana = {};
  var evitar = null;
  limitaciones.forEach(function (l) {
    evitar = evitar || {};
    WORKOUT_LIMITACIONES[l].forEach(function (id) { evitar[id] = true; });
  });
  // Duración, exclusiones, enfoque y molestias: se aplican igual a todas las sesiones.
  var claveDuracion = String(opts.duracion);
  var duracion = hasOwn(WORKOUT_DURACIONES, claveDuracion) ? Number(claveDuracion) : 60;
  var opciones = {
    topeSesion: WORKOUT_DURACIONES[duracion], excluidos: normalizarExcluidos(opts.excluir),
    enfoque: enfoque, evitar: evitar,
    cambios: normalizarCambios(opts.cambios), quitados: normalizarQuitados(opts.quitados),
    extras: normalizarExtras(opts.extras),
    pauta: programa && estructura ? programa.pauta : null
  };
  var diasElegidos = normalizarDiasSemana(opts.diasSemana, dias);
  // Sin estructura, la de siempre según los días; cada sesión es su propia clave.
  var lista = estructura || division.sesiones.map(function (clave) { return { i: clave, k: clave, n: "", d: 0 }; });
  var sesiones = lista.map(function (x, i) {
    var sesion = construirSesion(x.k, objetivo, nivel, material, usadosSemana, avisos, opciones, x.i);
    sesion.dia = x.d || (diasElegidos ? diasElegidos[i] : WORKOUT_DIAS_SEMANA[dias][i]);
    if (x.n) { sesion.name = x.n; sesion.nombrePropio = true; }
    return sesion;
  });

  var seriesPorSemana = {};
  sesiones.forEach(function (s) {
    s.exercises.forEach(function (e) {
      seriesPorSemana[e.muscle] = (seriesPorSemana[e.muscle] || 0) + e.sets;
    });
  });

  // Se avisa de poca carga semanal solo cuando hay días suficientes para
  // cubrir los grupos grandes; con 1-2 días es lo esperable.
  if (dias >= 3 && (objetivo === "bulk" || objetivo === "recomp")) {
    var minimo = nivel === "principiante" ? WORKOUT_SERIES_MINIMAS_PRINCIPIANTE : WORKOUT_SERIES_MINIMAS;
    WORKOUT_GRUPOS_GRANDES.forEach(function (m) {
      if ((seriesPorSemana[m] || 0) < minimo) avisos.push("pocas_series:" + m);
    });
  }

  // Un aviso repetido no aporta nada: se deja una vez.
  avisos = avisos.filter(function (a, i) { return avisos.indexOf(a) === i; });

  return {
    ok: true,
    warnings: avisos,
    objetivo: objetivo,
    nivel: nivel,
    equipamiento: equipamiento,
    material: material,
    enfoque: enfoque,
    limitaciones: limitaciones,
    diasElegidos: !!diasElegidos || !!estructura,
    dias: dias,
    // Con estructura: el programa listo del que salió, o "propia" si es suya.
    division: estructura ? (programa ? null : "propia") : division.nombre,
    programa: estructura && programa ? programa.id : null,
    estructura: !!estructura,
    sesiones: sesiones,
    seriesPorSemana: seriesPorSemana,
    progresion: WORKOUT_PROGRESION,
    descarga: WORKOUT_DESCARGA,
    calentamiento: WORKOUT_CALENTAMIENTO,
    cardio: WORKOUT_CARDIO[objetivo],
    aviso: WORKOUT_AVISO
  };
}

/** true si la semana n es de descarga (5, 10, 15…). Cualquier otra cosa, no. */
function esSemanaDescarga(semana) {
  return Number.isInteger(semana) && semana > 0 && semana % WORKOUT_DESCARGA.cadaSemanas === 0;
}

/**
 * Versión de descarga de un plan: la mitad de series (mínimo 1), mismos
 * ejercicios y RIR 4 para no llegar al fallo. Devuelve una copia; el plan
 * original no cambia.
 */
function aplicarDescarga(plan) {
  var copia = JSON.parse(JSON.stringify(plan));
  copia.seriesPorSemana = {};
  copia.sesiones.forEach(function (sesion) {
    sesion.exercises.forEach(function (e) {
      e.sets = Math.max(1, Math.ceil(e.sets / 2));
      e.rir = Math.max(e.rir, WORKOUT_DESCARGA.rir);
      copia.seriesPorSemana[e.muscle] = (copia.seriesPorSemana[e.muscle] || 0) + e.sets;
    });
  });
  copia.semanaDescarga = true;
  return copia;
}

/** El plan que toca en la semana n: el normal, o el de descarga si esa semana lo es. */
function planParaSemana(plan, semana) {
  return esSemanaDescarga(semana) ? aplicarDescarga(plan) : plan;
}

/**
 * Doble progresión: ¿sube la carga? Solo si TODAS las series llegan a lo alto
 * del rango de repeticiones (p. ej. "6-10" → 10). Si no, la carga se queda.
 *
 * @param {number} pesoKg       carga usada en la última sesión
 * @param {string} rango        rango del plan, "6-10" o "10-12 por lado"
 * @param {number[]} repsPorSerie repeticiones hechas en cada serie
 * @param {string} musculo      grupo del ejercicio (decide el incremento)
 * @returns {{ ok: boolean, pesoKg: number, sube: boolean }} `ok: false` si los
 *          datos no sirven (rango de tiempo, peso negativo, sin series…).
 */
function siguienteCarga(pesoKg, rango, repsPorSerie, musculo) {
  var rangoValido = /^(\d+)-(\d+)( por lado)?$/.exec(String(rango));
  var repsValidas = Array.isArray(repsPorSerie) && repsPorSerie.length > 0 &&
    repsPorSerie.every(function (r) { return typeof r === "number" && isFinite(r) && r >= 0; });
  var pesoValido = typeof pesoKg === "number" && isFinite(pesoKg) && pesoKg >= 0;
  if (!rangoValido || !repsValidas || !pesoValido) return { ok: false, pesoKg: pesoKg, sube: false };

  var tope = Number(rangoValido[2]);
  var sube = repsPorSerie.every(function (r) { return r >= tope; });
  if (!sube) return { ok: true, pesoKg: pesoKg, sube: false };

  var inferior = WORKOUT_MUSCULOS_INFERIORES.indexOf(musculo) !== -1;
  var incremento = inferior ? WORKOUT_INCREMENTO_KG.inferior : WORKOUT_INCREMENTO_KG.superior;
  return { ok: true, pesoKg: pesoKg + incremento, sube: true };
}
