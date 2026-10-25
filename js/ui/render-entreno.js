/**
 * js/ui/render-entreno.js
 * ─────────────────────────────────────────────────────────────────────────
 * Pantalla de ENTRENAMIENTOS (2026-10-17). Un botón fijo arriba cambia la
 * página entera entre el menú y el plan de entrenamiento de la semana, y
 * vuelve.
 *
 * De «Mis datos» toma los días a la semana («Entrenamientos / semana») y el
 * objetivo. Nivel, material y número de semana se eligen aquí y se guardan
 * solo en este navegador: no van a la cuenta ni se sincronizan. El plan lo
 * hace js/engine/workout-generator.js y los ejercicios salen de
 * js/data/exercises.js.
 *
 * Mejora progresiva: sin este fichero el botón no existe y la página sigue
 * siendo el menú de siempre.
 *
 * Expone (globales):
 *   initEntreno()              cablea el botón y el panel (una vez)
 *   renderEntrenoSiVisible()   repinta si el panel está abierto (cambio de idioma)
 *   entrenoPlanParaDatos(d)    plan para unos datos (sin DOM; lo prueban los tests)
 *   entrenoTextoAviso(aviso)   texto traducido de un aviso del generador
 *   entrenoLeerPrefs()         elecciones guardadas, validadas
 *   entrenoGuardarPrefs(p)     guarda las elecciones (sin romper si no hay almacenamiento)
 *   entrenoRepsTexto(reps)     "10-12 por lado" en el idioma de la pantalla
 *
 * Desde el 2026-10-18 cada día del plan tiene «Empezar» (modo entrenamiento,
 * js/ui/entreno-sesion.js), cada ejercicio enseña «La última vez» del diario
 * (js/core/workout-log.js) y encima del plan va el progreso
 * (js/ui/entreno-progreso.js). Sin esos ficheros el plan se pinta como antes.
 *
 * Desde el 2026-10-21 el panel va en cinco secciones con su barra abajo
 * (js/ui/entreno-pestanas.js). De aquí salen además la línea con la fecha de
 * «Inicio» (entrenoOjoTexto), la cuenta de la semana (entrenoSemanaCuentaTexto),
 * los músculos de hoy (entrenoHoyMusculosHtml), las demás sesiones para
 * empezar desde «Entrenar» (entrenoElegirHtml) y las fichas de «Perfil».
 * ─────────────────────────────────────────────────────────────────────────
 */

var ENTRENO_CLAVE_PREFS = "weekplate-entreno-v1";
var ENTRENO_NIVELES = ["principiante", "intermedio", "avanzado"];
var ENTRENO_EQUIPOS = ["gimnasio", "mancuernas", "sin_material", "personalizado"];
var ENTRENO_SEMANA_MAX = 52;
/** Lo que pregunta el cuestionario (js/ui/entreno-cuestionario.js). */
var ENTRENO_OBJETIVOS = ["bulk", "fuerza", "recomp", "cut", "maintain"];
var ENTRENO_MATERIALES = ["barra", "banco", "mancuernas", "maquina", "polea", "dominadas", "paralelas"];
var ENTRENO_ENFOQUES = ["pecho", "espalda", "hombros", "brazos", "piernas", "gluteos", "abdomen"];
var ENTRENO_ENFOQUE_MAX = 3;
var ENTRENO_LIMITACIONES = ["rodillas", "espalda", "hombros"];

var _entrenoBoton = null;
var _entrenoPanel = null;
var _entrenoUltimoPlan = null;

/** Avisos del generador que se traducen con una clave fija. */
var ENTRENO_AVISOS = {
  un_solo_dia: "ent.aviso_un_solo_dia",
  sin_dias_de_entrenamiento: "ent.sin_dias",
  dias_no_valido: "ent.aviso_dias_no_valido",
  maximo_6_dias: "ent.aviso_maximo_6",
  objetivo_desconocido: "ent.aviso_objetivo_desconocido",
  equipamiento_desconocido: "ent.aviso_equipamiento_desconocido",
  nivel_no_indicado: "ent.aviso_nivel_no_indicado"
};

/** Duraciones de sesión que ofrece el panel (minutos). */
var ENTRENO_DURACIONES = [30, 45, 60];

/** De una lista guardada, solo los valores permitidos, sin repetir y como mucho «max». */
function _entrenoLista(valor, permitidos, max) {
  if (!Array.isArray(valor)) return [];
  var r = [];
  valor.forEach(function (v) { if (permitidos.indexOf(v) !== -1 && r.indexOf(v) === -1) r.push(v); });
  return max ? r.slice(0, max) : r;
}

/** ¿Existe este ejercicio en el catálogo? (Sin catálogo cargado, se acepta cualquier id con forma de id.) */
function _entrenoIdValido(id) {
  if (typeof id !== "string" || !/^[a-z0-9_]{1,60}$/.test(id)) return false;
  if (typeof EXERCISE_CATALOG === "undefined") return true;
  return EXERCISE_CATALOG.some(function (e) { return e.id === id; });
}

var ENTRENO_MAX_CAMBIOS = 60;
var ENTRENO_MAX_EXTRAS = 4;
/** Plantillas guardadas (2026-10-23): como mucho estas, con un nombre de hasta 30 letras. */
var ENTRENO_MAX_PLANTILLAS = 8;
var ENTRENO_NOMBRE_MAX = 30;

/** Un nombre escrito por el usuario: sin saltos ni < >, recortado. */
function entrenoNombreLimpio(valor) {
  return typeof valor === "string" ? valor.replace(/[\u0000-\u001f<>]/g, "").trim().slice(0, ENTRENO_NOMBRE_MAX) : "";
}

/** La semana montada a mano, validada (normalizarEstructura del generador; sin él, nada). */
function _entrenoEstructuraLimpia(valor) {
  return typeof normalizarEstructura === "function" ? normalizarEstructura(valor) : null;
}

/**
 * Lo cambiado a mano de un programa (cambios, quitados, extras, estructura y
 * programa listo), validado: lo comparten las respuestas y las plantillas.
 */
function _entrenoProgramaLimpio(guardado, destino) {
  var cambios = guardado.cambios;
  if (cambios && typeof cambios === "object" && !Array.isArray(cambios)) {
    Object.keys(cambios).slice(0, ENTRENO_MAX_CAMBIOS).forEach(function (de) {
      var a = cambios[de];
      if (de !== a && _entrenoIdValido(de) && _entrenoIdValido(a)) destino.cambios[de] = a;
    });
  }
  destino.estructura = _entrenoEstructuraLimpia(guardado.estructura);
  // Las sesiones a las que puede ir algo quitado o añadido: las plantillas y, con estructura, sus ids.
  // Sin prototipo: «constructor» o «toString» no pueden pasar por una sesión.
  var sesiones = Object.create(null);
  if (typeof WORKOUT_SESIONES !== "undefined") Object.keys(WORKOUT_SESIONES).forEach(function (k) { sesiones[k] = true; });
  (destino.estructura || []).forEach(function (x) { sesiones[x.i] = true; });
  var sinCatalogo = typeof WORKOUT_SESIONES === "undefined";
  if (Array.isArray(guardado.quitados)) {
    guardado.quitados.forEach(function (q) {
      var m = typeof q === "string" ? /^([A-Za-z0-9_]{1,40}):[A-Za-z_]{1,40}$/.exec(q) : null;
      if (m && (sinCatalogo || sesiones[m[1]]) &&
          destino.quitados.indexOf(q) === -1 && destino.quitados.length < ENTRENO_MAX_CAMBIOS) destino.quitados.push(q);
    });
  }
  var extras = guardado.extras;
  if (extras && typeof extras === "object" && !Array.isArray(extras)) {
    Object.keys(extras).forEach(function (clave) {
      if (!/^[A-Za-z0-9_]{1,40}$/.test(clave) || !Array.isArray(extras[clave])) return;
      if (!sinCatalogo && !sesiones[clave]) return;
      var ids = [];
      extras[clave].forEach(function (id) {
        if (_entrenoIdValido(id) && ids.indexOf(id) === -1 && ids.length < ENTRENO_MAX_EXTRAS) ids.push(id);
      });
      if (ids.length) destino.extras[clave] = ids;
    });
  }
  destino.programa = (typeof programaPorId === "function" && programaPorId(guardado.programa)) ? guardado.programa : "";
  return destino;
}

/**
 * Las elecciones tal como vengan (del almacenamiento, de la cuenta, de una
 * copia) → elecciones válidas. Lo que no sea válido vuelve al valor por
 * defecto. `configurado` dice si ya se contestó el cuestionario; sin él, el
 * panel lo abre solo la primera vez.
 *
 * Desde el 2026-10-18 también lo cambiado a mano en el programa:
 *   cambios  { idDelPlan: idElegido }       ese ejercicio se cambia por otro en todo el plan
 *   quitados ["clave_sesion:patron", …]     ese hueco de esa sesión se queda vacío
 *   extras   { clave_sesion: [ids] }        ejercicios añadidos al final de esa sesión
 *   t        cuándo se guardó (para elegir, entre cuenta y dispositivo, lo más nuevo)
 *
 * Y desde el 2026-10-23 la semana montada a mano y las plantillas:
 *   estructura [{ i, k, n, d }] | null   las sesiones de la semana (normalizarEstructura);
 *                                        con ella, quitados y extras van por el id de cada sesión
 *   programa   ""                        el programa listo del que salió (WORKOUT_PROGRAMAS)
 *   plantillas [{ nombre, estructura, programa, cambios, quitados, extras }]
 */
function entrenoPrefsLimpiar(guardado) {
  var prefs = {
    nivel: "principiante", equipamiento: "gimnasio", semana: 1, duracion: 60, excluir: "",
    objetivo: "auto", material: null, aparatosFaltan: [], enfoque: [], limitaciones: [], diasSemana: null, configurado: false,
    cambios: {}, quitados: [], extras: {}, estructura: null, programa: "", plantillas: [], t: 0
  };
  if (guardado && typeof guardado === "object" && !Array.isArray(guardado)) {
    if (ENTRENO_NIVELES.indexOf(guardado.nivel) !== -1) prefs.nivel = guardado.nivel;
    if (ENTRENO_EQUIPOS.indexOf(guardado.equipamiento) !== -1) prefs.equipamiento = guardado.equipamiento;
    var semana = Math.floor(Number(guardado.semana));
    if (1 <= semana && semana <= ENTRENO_SEMANA_MAX) prefs.semana = semana;
    if (ENTRENO_DURACIONES.indexOf(Number(guardado.duracion)) !== -1) prefs.duracion = Number(guardado.duracion);
    if (typeof guardado.excluir === "string") prefs.excluir = guardado.excluir.slice(0, 200);
    if (ENTRENO_OBJETIVOS.indexOf(guardado.objetivo) !== -1) prefs.objetivo = guardado.objetivo;
    if (Array.isArray(guardado.material)) prefs.material = _entrenoLista(guardado.material, ENTRENO_MATERIALES);
    // Los aparatos que no hay (2026-10-25): solo los que conoce el generador.
    if (typeof normalizarAparatosFaltan === "function") prefs.aparatosFaltan = normalizarAparatosFaltan(guardado.aparatosFaltan);
    prefs.enfoque = _entrenoLista(guardado.enfoque, ENTRENO_ENFOQUES, ENTRENO_ENFOQUE_MAX);
    prefs.limitaciones = _entrenoLista(guardado.limitaciones, ENTRENO_LIMITACIONES);
    var dias = _entrenoLista((Array.isArray(guardado.diasSemana) ? guardado.diasSemana : []).map(Number), [1, 2, 3, 4, 5, 6, 7]);
    if (dias.length) prefs.diasSemana = dias.sort(function (a, b) { return a - b; });
    prefs.configurado = guardado.configurado === true;

    _entrenoProgramaLimpio(guardado, prefs);
    if (Array.isArray(guardado.plantillas)) {
      guardado.plantillas.slice(0, ENTRENO_MAX_PLANTILLAS).forEach(function (p) {
        if (!p || typeof p !== "object" || Array.isArray(p)) return;
        var nombre = entrenoNombreLimpio(p.nombre);
        var limpia = _entrenoProgramaLimpio(p, { cambios: {}, quitados: [], extras: {} });
        // Una plantilla es una semana: sin estructura no hay nada que guardar.
        if (nombre && limpia.estructura) prefs.plantillas.push({
          nombre: nombre, estructura: limpia.estructura, programa: limpia.programa,
          cambios: limpia.cambios, quitados: limpia.quitados, extras: limpia.extras
        });
      });
    }
    var t = Number(guardado.t);
    if (isFinite(t) && 0 < t) prefs.t = t;
  }
  if (prefs.equipamiento === "personalizado" && !prefs.material) prefs.equipamiento = "gimnasio";
  return prefs;
}

/** Elecciones guardadas en este navegador, ya validadas (entrenoPrefsLimpiar). */
function entrenoLeerPrefs() {
  var guardado = null;
  try {
    guardado = JSON.parse(localStorage.getItem(ENTRENO_CLAVE_PREFS) || "null");
  } catch (e) { /* sin almacenamiento o JSON roto: se queda con los valores por defecto */ }
  return entrenoPrefsLimpiar(guardado);
}

/**
 * Guarda las elecciones y las sube a la cuenta (js/core/workout-sync.js).
 * Con `conservarT` (lo que llega de la cuenta) no se vuelve a fechar ni a subir.
 */
function entrenoGuardarPrefs(prefs, conservarT) {
  if (!conservarT) prefs.t = Date.now();
  try {
    localStorage.setItem(ENTRENO_CLAVE_PREFS, JSON.stringify(prefs));
  } catch (e) { /* sin almacenamiento: la elección vale solo para esta visita */ }
  if (!conservarT && typeof pushWorkoutsToCloud === "function") pushWorkoutsToCloud();
}

/** ¿Hay algo cambiado a mano en el programa? (cuántas cosas) */
function entrenoCambiosManuales(prefs) {
  var n = Object.keys(prefs.cambios || {}).length + (prefs.quitados || []).length;
  Object.keys(prefs.extras || {}).forEach(function (k) { n += prefs.extras[k].length; });
  return n;
}

/**
 * Plan para unos datos. Sin DOM.
 * En la semana de descarga (5, 10…) devuelve la versión de descarga del plan.
 * Siempre trae `semana`, el número que se usó (1 si no era válido).
 *
 * @param {{dias: *, objetivo: string, nivel: string, equipamiento: string, semana: *}} datos
 * @returns {object} plan del generador
 */
function entrenoPlanParaDatos(datos) {
  var d = datos || {};
  var plan = generateWorkoutPlan(
    { entrenamientos: d.dias, goal: d.objetivo },
    {
      nivel: d.nivel, equipamiento: d.equipamiento, duracion: d.duracion, excluir: d.excluir,
      objetivo: d.objetivoEntreno, material: d.material, aparatosFaltan: d.aparatosFaltan, enfoque: d.enfoque,
      limitaciones: d.limitaciones, diasSemana: d.diasSemana,
      cambios: d.cambios, quitados: d.quitados, extras: d.extras,
      estructura: d.estructura, programa: d.programa
    }
  );
  var semana = Math.floor(Number(d.semana));
  if (!(semana >= 1)) semana = 1;
  if (semana > ENTRENO_SEMANA_MAX) semana = ENTRENO_SEMANA_MAX;
  var resultado = planParaSemana(plan, semana);
  resultado.semana = semana;
  return resultado;
}

/** Texto traducido de un aviso del generador ("falta_ejercicio:tiron_vertical", "pocas_series:pecho"…). */
function entrenoTextoAviso(aviso) {
  var partes = String(aviso).split(":");
  var clave = partes[0];
  var dato = partes.slice(1).join(":");
  if (clave === "falta_ejercicio") {
    return tFormat("ent.aviso_falta_ejercicio", { patron: tOr("ent.patron_" + dato, dato) });
  }
  if (clave === "pocas_series") {
    return tFormat("ent.aviso_pocas_series", { grupo: tOr("ent.grupo_" + dato, dato) });
  }
  if (Object.prototype.hasOwnProperty.call(ENTRENO_AVISOS, clave)) return t(ENTRENO_AVISOS[clave]);
  return String(aviso);
}

/** Valor del grupo de botones de una sola elección (nivel, material). */
function entrenoValorSeg(id) {
  var elegido = document.querySelector("#" + id + " .entreno__seg-btn.is-on");
  return elegido ? elegido.getAttribute("data-valor") : null;
}

function entrenoPonerSeg(id, valor) {
  Array.prototype.forEach.call(document.querySelectorAll("#" + id + " .entreno__seg-btn"), function (b) {
    var on = b.getAttribute("data-valor") === valor;
    b.classList.toggle("is-on", on);
    b.setAttribute("aria-pressed", on ? "true" : "false");
  });
}

/**
 * Lo elegido: las respuestas guardadas del cuestionario y el número de semana
 * de la pantalla, ya validado.
 */
function entrenoLeerControles() {
  var prefs = entrenoLeerPrefs();
  var semana = Math.floor(Number((document.getElementById("entSemana") || {}).value));
  if (!(semana >= 1)) semana = 1;
  if (semana > ENTRENO_SEMANA_MAX) semana = ENTRENO_SEMANA_MAX;
  prefs.semana = semana;
  return prefs;
}

/**
 * Cuántos días entrena: el campo «Entrenamientos / semana» de «Mis datos». El
 * cuestionario lo cambia ahí mismo (también cuenta para las calorías) y lo
 * guarda con el resto de ajustes.
 */
function entrenoGuardarDias(n) {
  var campo = document.getElementById("workouts");
  if (!campo || Number(campo.value) === n) return;
  campo.value = String(n);
  try {
    if (typeof getSettings === "function" && typeof saveSettings === "function") {
      var ajustes = getSettings();
      ajustes.workouts = n;
      saveSettings(ajustes);
      if (typeof pushSettingsToCloud === "function") pushSettingsToCloud();
    }
  } catch (e) { /* sin almacenamiento: el campo ya muestra el número nuevo */ }
}

/**
 * Técnica del ejercicio en el idioma de la pantalla: tecnica_en, tecnica_ru o
 * tecnica_uk del catálogo (js/data/exercises.js). Sin traducción para ese
 * idioma, la española de siempre.
 */
function entrenoTecnica(e) {
  var lang = typeof getLang === "function" ? getLang() : "es";
  var catalogo = typeof EXERCISE_CATALOG !== "undefined" ? EXERCISE_CATALOG : [];
  var ejercicio = catalogo.filter(function (x) { return x.id === e.id; })[0];
  var texto = (ejercicio && lang !== "es") ? ejercicio["tecnica_" + lang] : null;
  return (typeof texto === "string" && texto) ? texto : e.tecnica;
}

/**
 * Nombre del ejercicio en el idioma de la pantalla: name_en, name_ru o name_uk
 * del catálogo. Sin traducción para ese idioma, el español de siempre.
 */
function entrenoNombre(e) {
  var lang = typeof getLang === "function" ? getLang() : "es";
  var catalogo = typeof EXERCISE_CATALOG !== "undefined" ? EXERCISE_CATALOG : [];
  var ejercicio = catalogo.filter(function (x) { return x.id === e.id; })[0];
  var texto = (ejercicio && lang !== "es") ? ejercicio["name_" + lang] : null;
  return (typeof texto === "string" && texto) ? texto : e.name;
}

function entrenoEsc(texto) {
  return escapeHtml(String(texto));
}

/**
 * El nombre de una sesión del plan: el que le puso el usuario (2026-10-23) o
 * el de su plantilla en el idioma de la pantalla.
 */
function entrenoNombreSesion(s) {
  if (!s) return "";
  return s.nombrePropio ? s.name : tOr("ent.sesion_" + s.key, s.name);
}

/**
 * Repeticiones del plan en el idioma de la pantalla: "6-10" → "6–10",
 * "10-12 por lado" → "10–12 на сторону", "30-45 s" → "30–45 с". Lo que no
 * tenga esa forma sale tal cual.
 */
function entrenoRepsTexto(reps) {
  var m = /^(\d+)-(\d+)( s)?( por lado)?$/.exec(String(reps));
  if (!m) return String(reps);
  // "5-5" (el 5×5) es un número fijo, no un rango.
  return (m[1] === m[2] ? m[1] : m[1] + "–" + m[2]) + (m[3] ? " " + t("ent.seg_abrev") : "") + (m[4] ? " " + t("ent.por_lado") : "");
}

/** «La última vez: 60 kg × 10, 10, 9» de un ejercicio, si hay diario y se hizo alguna vez. */
function entrenoUltimaHtml(e, log) {
  if (!log || typeof entrenoLogUltimaVez !== "function" || typeof entrenoSeriesTexto !== "function") return "";
  var ultima = entrenoLogUltimaVez(log, e.id);
  if (!ultima) return "";
  var tiempo = / s( por lado)?$/.test(String(e.reps));
  return '<span class="entreno__ultima">' + entrenoEsc(tFormat("ent.ultima_vez", { series: entrenoSeriesTexto(ultima.series, tiempo) })) + "</span>";
}

function _entrenoCatalogo(id) {
  var catalogo = typeof EXERCISE_CATALOG !== "undefined" ? EXERCISE_CATALOG : [];
  for (var i = 0; i < catalogo.length; i++) if (catalogo[i].id === id) return catalogo[i];
  return null;
}

/**
 * La animación pequeña de un ejercicio (js/ui/entreno-figura.js) como botón
 * que abre la grande. "" si no hay animaciones o ese ejercicio no tiene.
 */
function entrenoMiniHtml(e) {
  if (typeof entrenoAnimacionTiene !== "function" || !entrenoAnimacionTiene(e.id)) return "";
  return '<button type="button" class="entreno__anim" data-anim-abrir="' + entrenoEsc(e.id) + '"' +
    ' aria-label="' + entrenoEsc(tFormat("ent.ver_animacion", { nombre: entrenoNombre(e) })) + '">' +
    entrenoAnimacionHtml(e.id, "mini", "") + "</button>";
}

/** Los músculos de la animación: los que trabajan y los que ayudan, como fichas. */
function entrenoMusculosHtml(id) {
  var spec = typeof EJERCICIO_POSES !== "undefined" ? EJERCICIO_POSES[id] : null;
  var m = (spec && spec.musculos) || {};
  function grupo(lista, clave, clase) {
    if (!lista || !lista.length) return "";
    return '<p class="anim-ficha__musculos"><span class="anim-ficha__titulo">' + entrenoEsc(t(clave)) + "</span>" +
      lista.map(function (z) {
        return '<span class="anim-musculo anim-musculo--' + clase + '">' + entrenoEsc(tOr("ent.musculo_" + z, z)) + "</span>";
      }).join("") + "</p>";
  }
  return grupo(m.p, "ent.musculos_trabajan", "p") + grupo(m.s, "ent.musculos_ayudan", "s");
}

/**
 * La página de un ejercicio: la animación grande, los músculos, la técnica y,
 * desde el 2026-10-22, «Tus resultados» (récords, gráfica y últimas veces,
 * entrenoFichaResultadosHtml en entreno-progreso.js) a partir del diario.
 * @param {string} id
 * @param {object} [log] - el diario (entrenoLogLeer); sin él, sin resultados
 */
function entrenoFichaHtml(id, log) {
  var e = _entrenoCatalogo(id);
  if (!e) return "";
  return '<div class="anim-ficha">' +
    entrenoAnimacionHtml(id, "completo", tFormat("ent.animacion_de", { nombre: entrenoNombre(e) })) +
    entrenoMusculosHtml(id) +
    '<p class="anim-ficha__tecnica">' + entrenoEsc(entrenoTecnica(e)) + "</p>" +
    '<p class="anim-ficha__leyenda">' + entrenoEsc(t("ent.animacion_leyenda")) + "</p>" +
    (log && typeof entrenoFichaResultadosHtml === "function" ? entrenoFichaResultadosHtml(id, log) : "") +
  "</div>";
}

/** El diario para la página de un ejercicio, o null si no hay. */
function entrenoFichaDiario() {
  return typeof entrenoLogLeer === "function" ? entrenoLogLeer() : null;
}

/** Abre la ventana con la animación grande de un ejercicio. */
function entrenoAbrirAnimacion(id) {
  var dialogo = document.getElementById("entrenoAnimDialogo");
  var e = _entrenoCatalogo(id);
  if (!dialogo || !e) return;
  document.getElementById("entrenoAnimTitulo").textContent = entrenoNombre(e);
  var cuerpo = document.getElementById("entrenoAnimCuerpo");
  cuerpo.innerHTML = entrenoFichaHtml(id, entrenoFichaDiario());
  cuerpo.scrollTop = 0;
  if (typeof dialogo.showModal === "function") dialogo.showModal();
  else dialogo.setAttribute("open", "");
  if (typeof entrenoAnimacionesActivar === "function") entrenoAnimacionesActivar(cuerpo);
}

function _entrenoCerrarAnimacion() {
  var dialogo = document.getElementById("entrenoAnimDialogo");
  if (!dialogo) return;
  if (typeof dialogo.close === "function") dialogo.close();
  else dialogo.removeAttribute("open");
  document.getElementById("entrenoAnimCuerpo").innerHTML = "";
}

/** Descanso en minutos y segundos: "2:30". Igual en todos los idiomas. */
function entrenoDescanso(segundos) {
  var min = Math.floor(segundos / 60);
  var seg = segundos % 60;
  return min + ":" + (seg < 10 ? "0" + seg : String(seg));
}

function entrenoChip(texto, fuerte) {
  return '<li class="entreno__chip' + (fuerte ? " entreno__chip--fuerte" : "") + '">' + entrenoEsc(texto) + "</li>";
}

/** En minúscula para meterlo en una frase («Acento: pecho, brazos»). */
function _entrenoMinus(texto) {
  var lang = typeof getLang === "function" ? getLang() : "es";
  var locale = (typeof LANG_LOCALES !== "undefined" && LANG_LOCALES[lang]) || undefined;
  try { return String(texto).toLocaleLowerCase(locale); } catch (e) { return String(texto).toLowerCase(); }
}

function _entrenoListaTexto(claves, prefijo, minus) {
  return claves.map(function (k) {
    var x = tOr(prefijo + k, k);
    return minus ? _entrenoMinus(x) : x;
  }).join(", ");
}

/**
 * Las fichas de «Tu programa»: objetivo, nivel, días (con cuáles, si se
 * eligieron), duración, material, acento, molestias y división. Sirve también
 * sin días de entrenamiento (plan con ok: false): entonces no van días ni división.
 */
function entrenoResumenFichasHtml(plan, prefs) {
  var objetivo = String(tOr("ent.objetivo_" + plan.objetivo, plan.objetivo));
  var fichas = [entrenoChip(objetivo.charAt(0).toUpperCase() + objetivo.slice(1), true)];
  fichas.push(entrenoChip(tOr("ent.nivel_" + plan.nivel, plan.nivel), false));
  if (plan.dias) {
    var dias = tFormat("ent.dias_n", { n: plan.dias });
    if (plan.diasElegidos) {
      dias = tFormat("ent.chip_dias_lista", {
        dias: dias,
        lista: plan.sesiones.map(function (s) { return t("ent.dia_corto_" + s.dia); }).join(", ")
      });
    }
    fichas.push(entrenoChip(dias, false));
  }
  fichas.push(entrenoChip(t("ent.duracion_" + prefs.duracion), false));
  var propio = (plan.material || []).filter(function (m) { return m !== "sin_material"; });
  fichas.push(entrenoChip(plan.equipamiento === "personalizado"
    ? tFormat("ent.chip_material", { lista: _entrenoListaTexto(propio, "ent.material_", true) })
    : tOr("ent.equipo_" + plan.equipamiento, plan.equipamiento), false));
  // Los aparatos que no hay (2026-10-25), de los materiales marcados.
  var faltan = (plan.aparatosFaltan || []).filter(function (a) {
    return propio.some(function (m) { return typeof WORKOUT_APARATOS !== "undefined" && (WORKOUT_APARATOS[m] || []).indexOf(a) !== -1; });
  });
  if (faltan.length) {
    fichas.push(entrenoChip(tFormat("ent.chip_aparatos_faltan", { lista: _entrenoListaTexto(faltan, "ent.aparato_", true) }), false));
  }
  if (plan.enfoque && plan.enfoque.length) {
    fichas.push(entrenoChip(tFormat("ent.chip_enfoque", { lista: _entrenoListaTexto(plan.enfoque, "ent.enfoque_", true) }), false));
  }
  if (plan.limitaciones && plan.limitaciones.length) {
    fichas.push(entrenoChip(tFormat("ent.chip_limites", { lista: _entrenoListaTexto(plan.limitaciones, "ent.limite_acus_", false) }), false));
  }
  if (plan.programa) fichas.push(entrenoChip(tOr("ent.programa_" + plan.programa, plan.programa), false));
  else if (plan.division) fichas.push(entrenoChip(tOr("ent.division_" + plan.division, plan.division), false));
  return fichas.join("");
}

/** Lo que el acento y las molestias cambian en el plan, dicho en una frase cada uno. */
function entrenoResumenNotasHtml(plan) {
  var h = "";
  if (plan.enfoque && plan.enfoque.length) {
    h += '<p class="entreno__nota-programa">' +
      entrenoEsc(tFormat("ent.nota_enfoque", { lista: _entrenoListaTexto(plan.enfoque, "ent.enfoque_", true) })) + "</p>";
  }
  if (plan.limitaciones && plan.limitaciones.length) {
    h += '<p class="entreno__nota-programa entreno__nota-programa--salud">' +
      entrenoEsc(tFormat("ent.nota_limites", { lista: _entrenoListaTexto(plan.limitaciones, "ent.limite_acus_", false) })) + "</p>";
  }
  return h;
}

/** Botones para cambiar a mano un ejercicio del programa: sustituir, quitar y, si era un cambio, volver. */
function _entrenoBotonesProgramaHtml(sesion, e) {
  var datos = ' data-sesion="' + entrenoEsc(sesion.instancia || sesion.key) + '" data-id="' + entrenoEsc(e.id) + '"' +
    ' data-patron="' + entrenoEsc(e.patron || "") + '"' + (e.extra ? ' data-extra="1"' : "");
  var nombre = entrenoNombre(e);
  return '<span class="entreno__ej-botones">' +
    '<button type="button" class="entreno__mini-btn" data-prog="cambiar"' + datos +
      ' aria-label="' + entrenoEsc(tFormat("ent.prog_cambiar_de", { nombre: nombre })) + '">' + entrenoEsc(t("ent.prog_cambiar")) + "</button>" +
    (e.cambiadoDe
      ? '<button type="button" class="entreno__mini-btn" data-prog="volver"' + datos +
          ' aria-label="' + entrenoEsc(tFormat("ent.prog_volver_de", { nombre: nombre })) + '">' + entrenoEsc(t("ent.prog_volver")) + "</button>"
      : "") +
    '<button type="button" class="entreno__mini-btn entreno__mini-btn--quitar" data-prog="quitar"' + datos +
      ' aria-label="' + entrenoEsc(tFormat("ent.prog_quitar_de", { nombre: nombre })) + '">' + entrenoEsc(t("ent.prog_quitar")) + "</button>" +
  "</span>";
}

/** Si el programa tiene cambios a mano: cuántos, y el botón para volver al programa tal como sale. */
function entrenoCambiosHtml(prefs) {
  var n = entrenoCambiosManuales(prefs);
  if (!n) return "";
  return '<p class="entreno__nota-programa entreno__nota-programa--tuyo">' +
    entrenoEsc(tFormat("ent.prog_cambios_n", { n: n })) +
    ' <button type="button" class="entreno__mini-btn" data-prog="reset">' + entrenoEsc(t("ent.prog_reset")) + "</button></p>";
}

/**
 * Tabla de una sesión. Cada celda lleva su etiqueta: en el móvil se pinta como
 * tarjeta. Con el diario (log), bajo el nombre va «La última vez: …». Con
 * `editable`, cada ejercicio trae sus botones para cambiar el programa a mano.
 */
function entrenoTablaHtml(sesion, log, editable) {
  var etiqueta = {
    ejercicio: t("ent.col_ejercicio"),
    series: t("ent.col_series"),
    reps: t("ent.col_reps"),
    descanso: t("ent.col_descanso"),
    rir: t("ent.col_rir"),
    tecnica: t("ent.col_tecnica")
  };
  var filas = sesion.exercises.map(function (e) {
    return "<tr>" +
      '<td class="entreno__nombre" data-label="' + entrenoEsc(etiqueta.ejercicio) + '">' +
        '<span class="entreno__nombre-fila">' + entrenoMiniHtml(e) +
          '<span class="entreno__nombre-texto">' + entrenoEsc(entrenoNombre(e)) +
            (e.enfoque ? ' <span class="entreno__badge">' + entrenoEsc(t("ent.badge_enfoque")) + "</span>" : "") +
            (e.cambiadoDe ? ' <span class="entreno__badge entreno__badge--tuyo">' + entrenoEsc(t("ent.badge_cambio")) + "</span>" : "") +
            (e.extra ? ' <span class="entreno__badge entreno__badge--tuyo">' + entrenoEsc(t("ent.badge_extra")) + "</span>" : "") +
            entrenoUltimaHtml(e, log) + "</span>" +
        "</span>" +
        (editable ? _entrenoBotonesProgramaHtml(sesion, e) : "") + "</td>" +
      '<td data-label="' + entrenoEsc(etiqueta.series) + '">' + e.sets + "</td>" +
      '<td data-label="' + entrenoEsc(etiqueta.reps) + '">' + entrenoEsc(entrenoRepsTexto(e.reps)) + "</td>" +
      '<td data-label="' + entrenoEsc(etiqueta.descanso) + '">' + entrenoDescanso(e.restSeconds) + "</td>" +
      '<td data-label="' + entrenoEsc(etiqueta.rir) + '">' + e.rir + "</td>" +
      '<td class="entreno__tec" data-label="' + entrenoEsc(etiqueta.tecnica) + '">' + entrenoEsc(entrenoTecnica(e)) + "</td>" +
      "</tr>";
  }).join("");
  return '<div class="entreno__tabla"><table><thead><tr>' +
    "<th>" + entrenoEsc(etiqueta.ejercicio) + "</th><th>" + entrenoEsc(etiqueta.series) + "</th><th>" + entrenoEsc(etiqueta.reps) +
    "</th><th>" + entrenoEsc(etiqueta.descanso) + "</th><th>" + entrenoEsc(etiqueta.rir) + "</th><th>" + entrenoEsc(etiqueta.tecnica) +
    "</th></tr></thead><tbody>" + filas + "</tbody></table></div>";
}

/**
 * Tarjeta de una sesión: el día, el nombre y el número de ejercicios, y debajo
 * la tabla. Con su índice (i) lleva el botón de empezarla (modo entrenamiento,
 * js/ui/entreno-sesion.js); sin él, solo se lee.
 */
function entrenoSesionHtml(s, i, log) {
  var editable = typeof i === "number";
  // Una sesión libre sin nada añadido no se puede empezar: no hay qué apuntar.
  var empezar = (editable && s.exercises.length && typeof entrenoSesionEmpezar === "function")
    ? '<button type="button" class="entreno__empezar" data-empezar="' + i + '">' + entrenoEsc(t("ent.empezar")) + "</button>"
    : "";
  var anadir = (editable && typeof entrenoCatalogoAbrir === "function")
    ? '<button type="button" class="btn-secondary entreno__anadir" data-prog="anadir" data-sesion="' + entrenoEsc(s.instancia || s.key) + '">' +
        entrenoEsc(t("ent.anadir_ejercicio")) + "</button>"
    : "";
  // Renombrar, copiar, quitar y cambiar de día (js/ui/entreno-programas.js, 2026-10-23).
  var herramientas = (editable && typeof entrenoSesionHerramientasHtml === "function") ? entrenoSesionHerramientasHtml(s) : "";
  var titulo = (editable && typeof entrenoTituloSesionHtml === "function")
    ? entrenoTituloSesionHtml(s)
    : '<h4 class="entreno__sesion-titulo">' + entrenoEsc(entrenoNombreSesion(s)) + "</h4>";
  return '<section class="entreno__sesion" data-instancia="' + entrenoEsc(s.instancia || s.key) + '">' +
    '<header class="entreno__sesion-cabeza">' +
      '<span class="entreno__dia">' + entrenoEsc(t("ent.dia_" + s.dia)) + "</span>" +
      titulo +
      '<span class="entreno__n">' + entrenoEsc(tFormat("ent.n_ejercicios", { n: s.exercises.length })) + "</span>" +
      empezar +
    "</header>" +
    herramientas +
    (s.exercises.length ? entrenoTablaHtml(s, log, editable && typeof entrenoCatalogoAbrir === "function")
      : '<p class="entreno__sesion-vacia">' + entrenoEsc(t("ent.sesion_vacia")) + "</p>") +
    anadir +
  "</section>";
}

// ── Cambiar el programa a mano (2026-10-18) ─────────────────────────────

/**
 * El material con el que se hace el plan de ahora, con sus aparatos
 * (materialConAparatos): lo que entiende puedeHacerse (para el catálogo y los cambios).
 */
function entrenoMaterialActual() {
  if (_entrenoUltimoPlan && Array.isArray(_entrenoUltimoPlan.disponible)) return _entrenoUltimoPlan.disponible;
  var prefs = entrenoLeerPrefs();
  var propio = typeof normalizarMaterial === "function" ? normalizarMaterial(prefs.material) : null;
  var material = propio || (typeof EQUIPAMIENTO_DISPONIBLE !== "undefined" && EQUIPAMIENTO_DISPONIBLE[prefs.equipamiento]) || ["sin_material"];
  return typeof materialConAparatos === "function" ? materialConAparatos(material, prefs.aparatosFaltan) : material;
}

/**
 * Series, repeticiones y descanso de un ejercicio con el objetivo y el nivel
 * del plan de ahora (prescribirEjercicio): lo que necesita un ejercicio que se
 * añade o se sustituye. null si no está en el catálogo.
 */
function entrenoPautaPara(id) {
  var cat = _entrenoCatalogo(id);
  if (!cat || typeof prescribirEjercicio !== "function") return null;
  var prefs = entrenoLeerPrefs();
  var objetivo = _entrenoUltimoPlan ? _entrenoUltimoPlan.objetivo
    : (prefs.objetivo !== "auto" ? prefs.objetivo : (document.getElementById("goal") || {}).value);
  if (typeof WORKOUT_PRESCRIPCION === "undefined" || !Object.prototype.hasOwnProperty.call(WORKOUT_PRESCRIPCION, objetivo)) objetivo = "maintain";
  var nivel = _entrenoUltimoPlan ? _entrenoUltimoPlan.nivel : prefs.nivel;
  var pauta = prescribirEjercicio(cat, objetivo, nivel);
  return {
    id: cat.id, name: cat.name, muscle: cat.muscle, compound: !!cat.compound,
    reps: pauta.reps, descanso: pauta.restSeconds, sets: pauta.sets
  };
}

function _entrenoEjercicioDelPlan(id) {
  var encontrado = null;
  ((_entrenoUltimoPlan && _entrenoUltimoPlan.sesiones) || []).some(function (s) {
    return s.exercises.some(function (e) { if (e.id === id) { encontrado = e; return true; } return false; });
  });
  return encontrado;
}

/** ¿Está este ejercicio en el programa de ahora? */
function entrenoProgramaTiene(id) {
  return !!_entrenoEjercicioDelPlan(id);
}

/**
 * Cambia un ejercicio del programa por otro, en todas las sesiones donde
 * salga. Si el de ahora ya era un cambio, se cambia el original (y volver al
 * original quita el cambio).
 */
function entrenoProgramaCambiar(idActual, idNuevo) {
  var e = _entrenoEjercicioDelPlan(idActual);
  var original = (e && e.cambiadoDe) || idActual;
  var prefs = entrenoLeerPrefs();
  if (idNuevo === original) delete prefs.cambios[original];
  else prefs.cambios[original] = idNuevo;
  entrenoGuardarPrefs(prefs);
  renderEntreno();
}

/** Lo que hacen los botones del programa (data-prog): cambiar, volver, quitar, añadir y deshacer todo. */
/** La sesión del plan de ahora por su id en la estructura (o su clave, sin estructura). */
function entrenoSesionDelPlan(instancia) {
  return ((_entrenoUltimoPlan && _entrenoUltimoPlan.sesiones) || []).filter(function (s) {
    return (s.instancia || s.key) === instancia;
  })[0] || null;
}

/** El plan que se ve ahora (o null): lo usan las acciones de js/ui/entreno-programas.js. */
function entrenoPlanActual() {
  return _entrenoUltimoPlan;
}

function _entrenoAccionPrograma(boton) {
  var accion = boton.getAttribute("data-prog");
  var clave = boton.getAttribute("data-sesion");
  var id = boton.getAttribute("data-id");
  // Lo de la semana entera y las plantillas (2026-10-23) va en su propio fichero.
  if (typeof entrenoProgramasAccion === "function" && entrenoProgramasAccion(boton)) return;
  var prefs = entrenoLeerPrefs();
  entrenoVibrar();
  if (accion === "cambiar" && typeof entrenoCatalogoAbrir === "function") {
    var sesion = entrenoSesionDelPlan(clave);
    entrenoCatalogoAbrir({
      modo: "elegir",
      titulo: tFormat("ent.cat_sustituir_titulo", { nombre: entrenoNombre(_entrenoCatalogo(id) || { id: id, name: id }) }),
      parecidoA: id,
      excluir: sesion ? sesion.exercises.map(function (e) { return e.id; }) : [id],
      nota: t("ent.cat_nota_programa"),
      alElegir: function (nuevo) { entrenoProgramaCambiar(id, nuevo); }
    });
    return;
  }
  if (accion === "volver") {
    var e = _entrenoEjercicioDelPlan(id);
    if (e && e.cambiadoDe) delete prefs.cambios[e.cambiadoDe];
  } else if (accion === "quitar") {
    if (boton.getAttribute("data-extra")) {
      prefs.extras[clave] = (prefs.extras[clave] || []).filter(function (x) { return x !== id; });
      if (!prefs.extras[clave].length) delete prefs.extras[clave];
    } else {
      var patron = boton.getAttribute("data-patron");
      if (!patron) return;
      var hueco = clave + ":" + patron;
      if (prefs.quitados.indexOf(hueco) === -1) prefs.quitados.push(hueco);
    }
  } else if (accion === "anadir" && typeof entrenoCatalogoAbrir === "function") {
    var s = entrenoSesionDelPlan(clave);
    entrenoCatalogoAbrir({
      modo: "elegir",
      titulo: tFormat("ent.cat_anadir_a", { sesion: s ? entrenoNombreSesion(s) : clave }),
      excluir: s ? s.exercises.map(function (e) { return e.id; }) : [],
      nota: t("ent.cat_nota_programa"),
      alElegir: function (nuevo) {
        var p = entrenoLeerPrefs();
        var lista = p.extras[clave] || [];
        if (lista.indexOf(nuevo) === -1 && lista.length < ENTRENO_MAX_EXTRAS) lista.push(nuevo);
        p.extras[clave] = lista;
        entrenoGuardarPrefs(p);
        renderEntreno();
      }
    });
    return;
  } else if (accion === "reset") {
    if (!window.confirm(t("ent.prog_reset_confirmar"))) return;
    prefs.cambios = {};
    prefs.quitados = [];
    prefs.extras = {};
  } else if (accion === "catalogo" && typeof entrenoCatalogoAbrir === "function") {
    entrenoCatalogoAbrir({ modo: "ver", titulo: t("ent.cat_titulo") });
    return;
  } else {
    return;
  }
  entrenoGuardarPrefs(prefs);
  renderEntreno();
}

/** Consejos en tarjetas: título corto y el texto debajo. */
function entrenoConsejosHtml(plan) {
  var consejos = [
    ["ent.tip_calentar", "ent.calentar"],
    ["ent.tip_progresion", "ent.progresion"],
    ["ent.tip_descarga", "ent.descarga"],
    ["ent.tip_cardio", "ent.cardio_" + plan.objetivo],
    ["ent.tip_rir", "ent.rir"],
    ["ent.tip_aviso", "ent.aviso_general"]
  ];
  return '<div class="entreno__consejos">' + consejos.map(function (c) {
    return '<article class="entreno__consejo"><h4>' + entrenoEsc(t(c[0])) + "</h4><p>" + entrenoEsc(t(c[1])) + "</p></article>";
  }).join("") + "</div>";
}

function entrenoPlanHtml(plan, log) {
  // Las fichas del programa van arriba, en «Tu programa» (entrenoResumenFichasHtml).
  var h = [];

  if (plan.semanaDescarga) {
    h.push('<p class="entreno__aviso entreno__aviso--suave">' + entrenoEsc(tFormat("ent.semana_descarga", { semana: plan.semana })) + "</p>");
  }
  if (plan.warnings.length) {
    var avisos = plan.warnings.map(function (w) { return "<li>" + entrenoEsc(entrenoTextoAviso(w)) + "</li>"; });
    h.push('<div class="entreno__aviso"><strong>' + entrenoEsc(t("ent.que_saber")) + "</strong><ul>" + avisos.join("") + "</ul></div>");
  }

  plan.sesiones.forEach(function (s, i) { h.push(entrenoSesionHtml(s, i, log)); });
  // «Añadir entrenamiento» (2026-10-23): una sesión más en la semana.
  if (typeof entrenoNuevaSesionHtml === "function") h.push(entrenoNuevaSesionHtml(plan));

  var grupos = Object.keys(plan.seriesPorSemana).map(function (m) {
    return entrenoChip(tFormat("ent.series_linea", {
      grupo: tOr("ent.grupo_" + m, m),
      n: plan.seriesPorSemana[m]
    }), false);
  });
  h.push('<h3 class="entreno__subtitulo">' + entrenoEsc(t("ent.series_semana")) + "</h3>");
  h.push('<ul class="entreno__chips">' + grupos.join("") + "</ul>");

  h.push('<h3 class="entreno__subtitulo">' + entrenoEsc(t("ent.como")) + "</h3>");
  h.push(entrenoConsejosHtml(plan));

  return h.join("");
}

/**
 * Pinta «Tu programa» y el plan con las respuestas guardadas del cuestionario.
 * La primera vez (sin cuestionario contestado) abre el cuestionario.
 */
function renderEntreno() {
  var salida = document.getElementById("entrenoSalida");
  var sinDias = document.getElementById("entrenoSinDias");
  if (!salida) return;

  var prefs = entrenoLeerControles();
  var panelLibre = _entrenoPanel && !_entrenoPanel.hidden &&
    !_entrenoPanel.classList.contains("is-sesion") && !_entrenoPanel.classList.contains("is-cuestionario");
  if (!prefs.configurado && panelLibre && typeof entrenoCuestionarioAbrir === "function") {
    entrenoCuestionarioAbrir();
    return;
  }

  var dias = Math.floor(Number((document.getElementById("workouts") || {}).value));
  // Con la semana montada a mano, el plan son sus sesiones aunque «Mis datos»
  // diga otra cosa (entrenoProgramasAvisoHtml lo avisa y deja elegir).
  var sinPlan = !prefs.estructura && !(dias >= 1);
  if (sinDias) sinDias.hidden = !sinPlan;
  salida.hidden = sinPlan;
  var log = typeof entrenoLogLeer === "function" ? entrenoLogLeer() : null;

  var plan = entrenoPlanParaDatos({
    dias: sinPlan ? 0 : dias,
    objetivo: (document.getElementById("goal") || {}).value,
    objetivoEntreno: prefs.objetivo,
    nivel: prefs.nivel,
    equipamiento: prefs.equipamiento,
    material: prefs.material,
    aparatosFaltan: prefs.aparatosFaltan,
    duracion: prefs.duracion,
    excluir: prefs.excluir,
    enfoque: prefs.enfoque,
    limitaciones: prefs.limitaciones,
    diasSemana: prefs.diasSemana,
    cambios: prefs.cambios,
    quitados: prefs.quitados,
    extras: prefs.extras,
    estructura: prefs.estructura,
    programa: prefs.programa,
    semana: prefs.semana
  });
  var fichas = document.getElementById("entrenoResumenFichas");
  var notas = document.getElementById("entrenoResumenNotas");
  var fichasPerfil = document.getElementById("entrenoPerfilFichas");
  if (fichas) fichas.innerHTML = entrenoResumenFichasHtml(plan, prefs);
  if (fichasPerfil) fichasPerfil.innerHTML = entrenoResumenFichasHtml(plan, prefs);
  var avisoDias = typeof entrenoProgramasAvisoHtml === "function" ? entrenoProgramasAvisoHtml(prefs, dias) : "";
  if (notas) notas.innerHTML = avisoDias + (plan.ok ? entrenoResumenNotasHtml(plan) + entrenoCambiosHtml(prefs) : "");
  // Programas listos y plantillas (js/ui/entreno-programas.js, 2026-10-23).
  if (typeof entrenoProgramasPintar === "function") entrenoProgramasPintar(prefs, plan);

  // «Hoy» y la semana (2026-10-18): lo primero que se ve, con un solo botón.
  var ahora = Date.now();
  var datosHoy = (!sinPlan && plan.ok && typeof entrenoHoyDatos === "function") ? entrenoHoyDatos(plan, log, ahora) : null;
  var ojo = document.getElementById("entrenoOjo");
  if (ojo) { ojo.textContent = entrenoOjoTexto(datosHoy, ahora); ojo.hidden = false; }
  var hoyCaja = document.getElementById("entrenoHoy");
  var semanaCaja = document.getElementById("entrenoSemanaCaja");
  if (hoyCaja) { hoyCaja.hidden = !datosHoy; hoyCaja.innerHTML = datosHoy ? entrenoHoyHtml(datosHoy, prefs) : ""; }
  if (semanaCaja) {
    semanaCaja.hidden = !datosHoy;
    var semana = document.getElementById("entrenoSemana");
    var cuenta = document.getElementById("entrenoSemanaCuenta");
    if (semana) semana.innerHTML = datosHoy ? entrenoSemanaHtml(datosHoy) : "";
    if (cuenta) cuenta.textContent = datosHoy ? entrenoSemanaCuentaTexto(datosHoy) : "";
  }
  // «Entrenar» sin sesión abierta (2026-10-21): las demás sesiones del plan, para empezar otra.
  var elegir = document.getElementById("entrenoElegir");
  if (elegir) {
    var elegirHtml = (!sinPlan && plan.ok) ? entrenoElegirHtml(datosHoy, plan) : "";
    elegir.innerHTML = elegirHtml;
    elegir.hidden = !elegirHtml;
  }
  if (typeof entrenoPerfilPintar === "function") entrenoPerfilPintar();
  // El calendario del mes, en «Plan» (js/ui/entreno-calendario.js, 2026-10-23).
  if (typeof renderEntrenoCalendario === "function") renderEntrenoCalendario(!sinPlan && plan.ok ? plan : null, log);

  if (sinPlan) {
    _entrenoUltimoPlan = null;
    salida.innerHTML = "";
    if (typeof renderEntrenoProgreso === "function") renderEntrenoProgreso(log, null);
    return;
  }

  _entrenoUltimoPlan = plan.ok ? plan : null;
  salida.innerHTML = plan.ok ? entrenoPlanHtml(plan, log) : "";
  if (typeof entrenoAnimacionesActivar === "function") entrenoAnimacionesActivar(salida);
  if (typeof renderEntrenoProgreso === "function") renderEntrenoProgreso(log, _entrenoUltimoPlan);
  if (prefs.configurado && typeof entrenoTutorialAuto === "function") entrenoTutorialAuto();
}

/** La línea sobre el título de «Inicio»: «miércoles, 21 de octubre · día de descanso». */
function entrenoOjoTexto(datos, ahora) {
  var lang = typeof getLang === "function" ? getLang() : "es";
  var locale = (typeof LANG_LOCALES !== "undefined" && LANG_LOCALES[lang]) || "es-ES";
  var fecha;
  try {
    fecha = new Date(ahora).toLocaleDateString(locale, { weekday: "long", day: "numeric", month: "long" });
  } catch (e) {
    fecha = t("ent.dia_" + entrenoDiaDeSemana(ahora));
  }
  if (!datos) return fecha;
  return fecha + " · " + t(datos.estado === "descanso" ? "ent.dia_tipo_descanso" : "ent.dia_tipo_entreno");
}

/** «2 de 4» junto a «Tu semana»: días con sesión hecha frente a los días del plan. */
function entrenoSemanaCuentaTexto(datos) {
  var hechos = datos.dias.filter(function (d) { return d.hecho; }).length;
  var previstos = datos.dias.filter(function (d) { return d.plan; }).length;
  return tFormat("ent.semana_cuenta", { n: hechos, total: previstos });
}

/**
 * «Entrenar» sin sesión abierta: las sesiones del plan (menos la de hoy, que
 * ya está en la tarjeta de arriba), cada una con «Empezar». Sin DOM.
 */
function entrenoElegirHtml(datos, plan) {
  if (!plan || !plan.ok || !plan.sesiones || !plan.sesiones.length) return "";
  var hechos = {};
  ((datos && datos.dias) || []).forEach(function (d) { if (d.hecho) hechos[d.dia] = true; });
  var hayHoy = !!(datos && datos.estado === "sesion");
  var filas = plan.sesiones.map(function (s, i) {
    if (hayHoy && i === datos.indice) return "";
    if (!s.exercises.length) return "";
    var hecha = !!hechos[s.dia];
    return '<li class="entreno__elegir-item' + (hecha ? " is-hecho" : "") + '">' +
      '<span class="entreno__elegir-dia">' + entrenoEsc(t("ent.dia_corto_" + s.dia)) + "</span>" +
      '<span class="entreno__elegir-texto">' +
        '<strong class="entreno__elegir-nombre">' + entrenoEsc(entrenoNombreSesion(s)) + "</strong>" +
        '<span class="entreno__elegir-datos">' + entrenoEsc(tFormat("ent.elegir_datos", { n: s.exercises.length }) +
          (hecha ? " · " + t("ent.elegir_hecha") : "")) + "</span>" +
      "</span>" +
      '<button type="button" class="btn-secondary entreno__elegir-btn" data-empezar="' + i + '">' + entrenoEsc(t("ent.elegir_empezar")) + "</button>" +
    "</li>";
  }).join("");
  if (!filas) return "";
  return '<h3 class="entreno__subtitulo" id="entrenoElegirTitulo">' + entrenoEsc(t(hayHoy ? "ent.elegir_otra" : "ent.elegir_titulo")) + "</h3>" +
    '<ul class="entreno__elegir">' + filas + "</ul>";
}

/** Día de la semana de un instante: 1 = lunes … 7 = domingo, como en el plan. */
function entrenoDiaDeSemana(ms) {
  return ((new Date(ms).getDay() + 6) % 7) + 1;
}

/**
 * Lo que enseñan «Hoy» y la semana: qué toca hoy, si ya está hecho y, si hoy
 * no toca, cuál es la siguiente. Sin DOM (lo prueban los tests).
 * @returns {{hoy:number, estado:string, indice:number, sesion:(object|null), siguiente:(object|null), dias:object[]}}
 *          estado: "sesion" (toca), "hecho" (ya se hizo hoy) o "descanso"
 */
function entrenoHoyDatos(plan, log, ahora) {
  var hoy = entrenoDiaDeSemana(ahora);
  var lunes = entrenoLogInicioSemana(ahora);
  var fin = lunes + 7 * 24 * 3600 * 1000;
  var hechos = {};
  ((log && log.sesiones) || []).forEach(function (s) {
    if (lunes <= s.inicio && s.inicio < fin) hechos[entrenoDiaDeSemana(s.inicio)] = true;
  });
  var sesiones = (plan && plan.ok && plan.sesiones) || [];
  var porDia = {};
  sesiones.forEach(function (s, i) { porDia[s.dia] = { sesion: s, indice: i }; });
  var dias = [1, 2, 3, 4, 5, 6, 7].map(function (d) {
    return { dia: d, plan: !!porDia[d], hecho: !!hechos[d], hoy: d === hoy };
  });
  var resultado = { hoy: hoy, estado: "descanso", indice: -1, sesion: null, siguiente: null, dias: dias };
  var actual = porDia[hoy];
  if (actual) {
    resultado.estado = hechos[hoy] ? "hecho" : "sesion";
    resultado.sesion = actual.sesion;
    resultado.indice = actual.indice;
  }
  for (var k = 1; k <= 7; k++) {
    var siguiente = ((hoy - 1 + k) % 7) + 1;
    if (porDia[siguiente]) { resultado.siguiente = { dia: siguiente, sesion: porDia[siguiente].sesion }; break; }
  }
  return resultado;
}

/** La tarjeta «Сегодня»: la sesión de hoy con su botón, «ya hecho», o el descanso y la siguiente. */
function entrenoHoyHtml(datos, prefs) {
  var h = '<p class="entreno__hoy-ojo">' + entrenoEsc(t("ent.hoy_ojo")) + "</p>";
  if (datos.estado === "sesion" || datos.estado === "hecho") {
    var s = datos.sesion;
    h += '<h3 class="entreno__hoy-titulo">' + entrenoEsc(entrenoNombreSesion(s)) + "</h3>";
    if (datos.estado === "sesion" && !s.exercises.length) {
      h += '<p class="entreno__hoy-texto">' + entrenoEsc(t("ent.sesion_vacia")) + "</p>";
    } else if (datos.estado === "sesion") {
      h += '<p class="entreno__hoy-datos">' + entrenoEsc(tFormat("ent.hoy_datos", { min: prefs.duracion, n: s.exercises.length })) + "</p>" +
        entrenoHoyMusculosHtml(s) +
        '<button type="button" class="entreno__empezar" data-empezar="' + datos.indice + '">' + entrenoEsc(t("ent.empezar")) + "</button>";
    } else {
      h += '<p class="entreno__hoy-texto">' + entrenoEsc(t("ent.hoy_hecho")) + "</p>";
    }
    return h;
  }
  h += '<p class="entreno__hoy-texto">' + entrenoEsc(t("ent.hoy_descanso")) + "</p>";
  if (datos.siguiente) {
    h += '<p class="entreno__hoy-datos">' + entrenoEsc(tFormat("ent.hoy_siguiente", {
      dia: t("ent.dia_corto_" + datos.siguiente.dia),
      nombre: entrenoNombreSesion(datos.siguiente.sesion)
    })) + "</p>";
  }
  return h;
}

/** Los grupos principales de la sesión de hoy (como mucho cuatro), en fichas. "" si no hay. */
function entrenoHoyMusculosHtml(sesion) {
  var grupos = [];
  (sesion.exercises || []).forEach(function (e) {
    if (e.muscle && grupos.indexOf(e.muscle) === -1) grupos.push(e.muscle);
  });
  if (!grupos.length) return "";
  return '<ul class="entreno__hoy-musculos">' + grupos.slice(0, 4).map(function (g) {
    var nombre = tOr("ent.grupo_" + g, g);
    return '<li class="entreno__hoy-musculo">' + entrenoEsc(nombre.charAt(0).toLocaleUpperCase() + nombre.slice(1)) + "</li>";
  }).join("") + "</ul>";
}

/** Los siete días: cuáles tocan, cuáles están hechos y cuál es hoy. */
function entrenoSemanaHtml(datos) {
  return datos.dias.map(function (x) {
    var clase = "entreno__dia-semana" + (x.plan ? " is-plan" : "") + (x.hecho ? " is-hecho" : "") + (x.hoy ? " is-hoy" : "");
    var clave = x.hecho ? "ent.semana_dia_hecho" : (x.plan ? "ent.semana_dia_plan" : "ent.semana_dia_libre");
    return '<li class="' + clase + '"><span>' + entrenoEsc(t("ent.dia_corto_" + x.dia)) + "</span>" +
      '<span class="visually-hidden">' + entrenoEsc(tFormat(clave, { dia: t("ent.dia_" + x.dia) })) + "</span>" +
      '<i class="entreno__dia-semana-marca" aria-hidden="true"></i></li>';
  }).join("");
}

/** Descarga el plan de entrenamiento como calendario .ics: un evento semanal por sesión. */
function entrenoExportarIcs() {
  if (!_entrenoUltimoPlan) return;
  var ahora = new Date();
  var fecha = icsFechaDeHoy(ahora.getFullYear(), ahora.getMonth() + 1, ahora.getDate());
  var texto = icsEntreno(_entrenoUltimoPlan, fecha, {
    sello: ahora,
    horaMinutos: icsHoraEntreno((document.getElementById("entHora") || {}).value),
    titulo: function (sesion) {
      return tFormat("ics.entreno_titulo", { sesion: entrenoNombreSesion(sesion) });
    },
    linea: function (e) {
      return tFormat("ics.linea_ejercicio", {
        nombre: entrenoNombre(e), series: e.sets, reps: e.reps, descanso: entrenoDescanso(e.restSeconds)
      });
    }
  });
  icsDescargar(texto, "weekplate-entreno.ics");
}

function renderEntrenoSiVisible() {
  if (!_entrenoPanel || _entrenoPanel.hidden) return;
  renderEntreno();
  if (typeof entrenoSesionRepintar === "function") entrenoSesionRepintar();
}

/** Cambia entre el menú (false) y el panel de entrenamientos (true). */
function entrenoMostrar(activo) {
  var main = document.querySelector("main");
  document.body.classList.toggle("modo-entreno", activo);
  if (main) main.hidden = activo;
  if (_entrenoPanel) _entrenoPanel.hidden = !activo;
  if (_entrenoBoton) {
    _entrenoBoton.setAttribute("aria-pressed", activo ? "true" : "false");
    var texto = _entrenoBoton.querySelector(".modo-btn__texto");
    var clave = activo ? "ent.boton_menu" : "ent.boton_entreno";
    if (texto) {
      texto.setAttribute("data-i18n", clave);
      texto.textContent = t(clave);
    }
  }
  if (activo) renderEntreno();
  // La pantalla de una sesión en marcha (si estaba abierta) vuelve a contar el tiempo, o deja de hacerlo.
  if (activo && typeof entrenoSesionAlMostrar === "function") entrenoSesionAlMostrar();
  if (!activo && typeof entrenoSesionAlOcultar === "function") entrenoSesionAlOcultar();
  window.scrollTo(0, 0);
}

/** Pulsación corta en los móviles que vibran (Android), si no se ha quitado en «Perfil». En el resto no hace nada. */
function entrenoVibrar() {
  if (typeof entrenoVibracionOn === "function" && !entrenoVibracionOn()) return;
  try {
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") navigator.vibrate(8);
  } catch (e) { /* sin vibración: no pasa nada */ }
}
function entrenoAlCambiar() {
  var controles = entrenoLeerControles();
  entrenoGuardarPrefs(controles);
  renderEntreno();
}

/** Botones «−» y «+» de la semana: mueve el número dentro de 1…52. */
function entrenoPasoSemana(paso) {
  var campo = document.getElementById("entSemana");
  var nueva = Math.floor(Number(campo.value)) + paso;
  if (!(nueva >= 1)) nueva = 1;
  if (nueva > ENTRENO_SEMANA_MAX) nueva = ENTRENO_SEMANA_MAX;
  campo.value = String(nueva);
  entrenoAlCambiar();
}

function initEntreno() {
  _entrenoBoton = document.getElementById("modoBtn");
  _entrenoPanel = document.getElementById("entrenoPanel");
  if (!_entrenoBoton || !_entrenoPanel) return;

  var prefs = entrenoLeerPrefs();
  document.getElementById("entSemana").value = String(prefs.semana);

  _entrenoBoton.addEventListener("click", function () { entrenoVibrar(); entrenoMostrar(_entrenoPanel.hidden); });

  // Las preguntas (objetivo, nivel, días, material, acento, molestias) están en
  // el cuestionario (js/ui/entreno-cuestionario.js); aquí queda la semana.
  Array.prototype.forEach.call(document.querySelectorAll(".entreno__paso-btn"), function (b) {
    b.addEventListener("click", function () { entrenoVibrar(); entrenoPasoSemana(Number(b.getAttribute("data-paso"))); });
  });
  document.getElementById("entSemana").addEventListener("change", entrenoAlCambiar);
  var editar = document.getElementById("entEditar");
  if (editar) editar.addEventListener("click", function () {
    entrenoVibrar();
    if (typeof entrenoCuestionarioAbrir === "function") entrenoCuestionarioAbrir();
  });
  if (typeof initEntrenoCuestionario === "function") initEntrenoCuestionario();

  var abrirDatos = document.getElementById("entAbrirDatos");
  if (abrirDatos) abrirDatos.addEventListener("click", function () {
    entrenoMostrar(false);
    if (typeof activarPestana === "function") activarPestana("datos");
  });
  var icsBoton = document.getElementById("entIcs");
  if (icsBoton) icsBoton.addEventListener("click", entrenoExportarIcs);
  var imprimir = document.getElementById("entImprimir");
  if (imprimir) imprimir.addEventListener("click", function () { window.print(); });

  // «Empezar» (en «Hoy» y en la tarjeta de cada día) abre el modo entrenamiento
  // con esa sesión. Va en todo el panel porque «Hoy» está fuera de la salida.
  _entrenoPanel.addEventListener("click", function (ev) {
    var anim = ev.target.closest("[data-anim-abrir]");
    if (anim) { entrenoAbrirAnimacion(anim.getAttribute("data-anim-abrir")); return; }
    var boton = ev.target.closest("[data-empezar]");
    if (!boton || !_entrenoUltimoPlan || typeof entrenoSesionEmpezar !== "function") return;
    var sesion = _entrenoUltimoPlan.sesiones[Number(boton.getAttribute("data-empezar"))];
    if (!sesion) return;
    entrenoVibrar();
    entrenoSesionEmpezar(sesion, _entrenoUltimoPlan.semana);
  });
  // Los botones que cambian el programa a mano (y el del catálogo), en todo el panel.
  _entrenoPanel.addEventListener("click", function (ev) {
    var prog = ev.target.closest("[data-prog]");
    if (prog && _entrenoPanel.contains(prog)) _entrenoAccionPrograma(prog);
  });
  if (typeof initEntrenoSesion === "function") initEntrenoSesion();
  if (typeof initEntrenoProgreso === "function") initEntrenoProgreso();
  if (typeof initEntrenoCatalogo === "function") initEntrenoCatalogo();
  if (typeof initEntrenoProgramas === "function") initEntrenoProgramas();
  if (typeof initEntrenoCalendario === "function") initEntrenoCalendario();
  if (typeof initEntrenoMedidas === "function") initEntrenoMedidas();
  if (typeof initEntrenoTutorial === "function") initEntrenoTutorial();
  if (typeof initEntrenoPestanas === "function") initEntrenoPestanas();
  var cerrarAnim = document.getElementById("entrenoAnimCerrar");
  if (cerrarAnim) cerrarAnim.addEventListener("click", _entrenoCerrarAnimacion);
  var dialogoAnim = document.getElementById("entrenoAnimDialogo");
  if (dialogoAnim) dialogoAnim.addEventListener("close", function () { document.getElementById("entrenoAnimCuerpo").innerHTML = ""; });

  entrenoMostrar(false);
}
