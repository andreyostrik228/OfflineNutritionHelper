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

/** Series, repeticiones y descanso por objetivo, para compuestos y aislados. */
var WORKOUT_PRESCRIPCION = {
  bulk:     { compuesto: { series: 4, reps: "6-10",  descanso: 150 }, aislado: { series: 3, reps: "10-15", descanso: 75 } },
  cut:      { compuesto: { series: 3, reps: "6-10",  descanso: 120 }, aislado: { series: 3, reps: "12-15", descanso: 60 } },
  recomp:   { compuesto: { series: 3, reps: "6-10",  descanso: 120 }, aislado: { series: 3, reps: "10-12", descanso: 75 } },
  maintain: { compuesto: { series: 3, reps: "8-12",  descanso: 90 },  aislado: { series: 2, reps: "10-15", descanso: 60 } }
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
  piernas_B:         { name: "Piernas B",         patrones: ["zancada", "bisagra", "gluteo", "curl_isquio", "pantorrilla", "core"] }
};

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
  6: [1, 2, 3, 4, 5, 6]
};

/** Recomendación de cardio según el objetivo. Es orientativa, no un plan médico. */
var WORKOUT_CARDIO = {
  bulk: "Cardio opcional y suave (10-20 minutos al final de la sesión o en días libres), para la salud cardiovascular sin restar energía a la fuerza.",
  cut: "Cardio 2-3 días a la semana, 20-30 minutos a ritmo moderado (andar rápido, bici). Ayuda al gasto diario sin tanto coste en recuperación.",
  recomp: "Cardio opcional: 1-2 sesiones suaves de 20-30 minutos a la semana para la salud cardiovascular.",
  maintain: "Cardio opcional: 1-2 sesiones suaves de 20-30 minutos a la semana para la salud cardiovascular."
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

/** Series, repeticiones, descanso y RIR de un ejercicio según objetivo y nivel. */
function prescribirEjercicio(ejercicio, objetivo, nivel) {
  var base = WORKOUT_PRESCRIPCION[objetivo][ejercicio.compound ? "compuesto" : "aislado"];
  var series = nivel === "principiante" ? Math.min(base.series, 3) : base.series;
  var reps = ejercicio.repsOverride || base.reps;
  // Un principiante aguanta mejor un rango algo más alto para aprender bien el gesto.
  if (nivel === "principiante" && objetivo === "bulk" && ejercicio.compound) reps = "8-12";
  return { sets: series, reps: reps, restSeconds: base.descanso, rir: WORKOUT_LEVEL_RIR[nivel] };
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
function elegirEjercicio(patron, material, nivel, usadosSesion, usadosSemana, excluidos) {
  var candidatos = EXERCISE_CATALOG.filter(function (e) {
    return e.pattern === patron && puedeHacerse(e, material) && nivelAlcanza(e, nivel) && !usadosSesion[e.id]
      && !ejercicioExcluido(e, excluidos);
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

/** Construye una sesión a partir de sus patrones, respetando el tope por nivel. */
function construirSesion(clave, objetivo, nivel, material, usadosSemana, avisos, opciones) {
  var plantilla = WORKOUT_SESIONES[clave];
  var extra = opciones || {};
  var tope = Math.min(WORKOUT_LEVEL_CAP[nivel], extra.topeSesion || 99);
  var usadosSesion = {};
  var ejercicios = [];

  plantilla.patrones.forEach(function (patron) {
    if (ejercicios.length >= tope) return;
    var ejercicio = elegirEjercicio(patron, material, nivel, usadosSesion, usadosSemana, extra.excluidos);
    if (!ejercicio) {
      avisos.push("falta_ejercicio:" + patron);
      return;
    }
    usadosSesion[ejercicio.id] = true;
    usadosSemana[ejercicio.id] = (usadosSemana[ejercicio.id] || 0) + 1;
    var pauta = prescribirEjercicio(ejercicio, objetivo, nivel);
    ejercicios.push({
      id: ejercicio.id,
      name: ejercicio.name,
      muscle: ejercicio.muscle,
      compound: ejercicio.compound,
      tecnica: ejercicio.tecnica,
      sets: pauta.sets,
      reps: pauta.reps,
      restSeconds: pauta.restSeconds,
      rir: pauta.rir
    });
  });

  // Compuestos primero: es donde más conviene tener energía fresca.
  ejercicios.sort(function (a, b) { return (b.compound ? 1 : 0) - (a.compound ? 1 : 0); });

  return { key: clave, name: plantilla.name, exercises: ejercicios };
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
 *                               equipamiento: "gimnasio" | "mancuernas" | "sin_material" }
 * @returns {object} plan (ver las claves al final de la función). `ok: false`
 *                   si no hay días de entrenamiento: no hay plan que dar.
 */
function generateWorkoutPlan(profile, options) {
  var p = profile || {};
  var opts = options || {};
  var avisos = [];

  var dias = normalizarDias(p.entrenamientos, avisos);

  var objetivo = "maintain";
  if (p.goal !== undefined && p.goal !== null) {
    if (hasOwn(WORKOUT_PRESCRIPCION, p.goal)) objetivo = p.goal;
    else avisos.push("objetivo_desconocido");
  }

  var equipamiento = "gimnasio";
  if (opts.equipamiento !== undefined) {
    if (hasOwn(EQUIPAMIENTO_DISPONIBLE, opts.equipamiento)) equipamiento = opts.equipamiento;
    else avisos.push("equipamiento_desconocido");
  }

  var nivel = "principiante";
  if (WORKOUT_LEVELS.indexOf(opts.nivel) !== -1) nivel = opts.nivel;
  else avisos.push("nivel_no_indicado");

  if (dias === 0) {
    return {
      ok: false, warnings: avisos, objetivo: objetivo, nivel: nivel, equipamiento: equipamiento,
      dias: 0, division: null, sesiones: [], seriesPorSemana: {},
      progresion: WORKOUT_PROGRESION, descarga: WORKOUT_DESCARGA,
      calentamiento: WORKOUT_CALENTAMIENTO, cardio: WORKOUT_CARDIO[objetivo], aviso: WORKOUT_AVISO
    };
  }

  if (dias === 1) avisos.push("un_solo_dia");

  var division = WORKOUT_DIVISIONES[dias];
  var material = EQUIPAMIENTO_DISPONIBLE[equipamiento];
  var usadosSemana = {};
  // Duración y exclusiones: se aplican igual a todas las sesiones.
  var claveDuracion = String(opts.duracion);
  var duracion = hasOwn(WORKOUT_DURACIONES, claveDuracion) ? Number(claveDuracion) : 60;
  var opciones = { topeSesion: WORKOUT_DURACIONES[duracion], excluidos: normalizarExcluidos(opts.excluir) };
  var sesiones = division.sesiones.map(function (clave, i) {
    var sesion = construirSesion(clave, objetivo, nivel, material, usadosSemana, avisos, opciones);
    sesion.dia = WORKOUT_DIAS_SEMANA[dias][i];
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
    dias: dias,
    division: division.nombre,
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
