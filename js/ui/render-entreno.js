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
 * ─────────────────────────────────────────────────────────────────────────
 */

var ENTRENO_CLAVE_PREFS = "weekplate-entreno-v1";
var ENTRENO_NIVELES = ["principiante", "intermedio", "avanzado"];
var ENTRENO_EQUIPOS = ["gimnasio", "mancuernas", "sin_material"];
var ENTRENO_SEMANA_MAX = 52;

var _entrenoBoton = null;
var _entrenoPanel = null;

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

/** Elecciones guardadas en este navegador. Lo que no sea válido vuelve al valor por defecto. */
function entrenoLeerPrefs() {
  var prefs = { nivel: "principiante", equipamiento: "gimnasio", semana: 1 };
  try {
    var guardado = JSON.parse(localStorage.getItem(ENTRENO_CLAVE_PREFS) || "null");
    if (guardado && typeof guardado === "object") {
      if (ENTRENO_NIVELES.indexOf(guardado.nivel) !== -1) prefs.nivel = guardado.nivel;
      if (ENTRENO_EQUIPOS.indexOf(guardado.equipamiento) !== -1) prefs.equipamiento = guardado.equipamiento;
      var semana = Math.floor(Number(guardado.semana));
      if (semana >= 1 && semana <= ENTRENO_SEMANA_MAX) prefs.semana = semana;
    }
  } catch (e) { /* sin almacenamiento o JSON roto: se queda con los valores por defecto */ }
  return prefs;
}

function entrenoGuardarPrefs(prefs) {
  try {
    localStorage.setItem(ENTRENO_CLAVE_PREFS, JSON.stringify(prefs));
  } catch (e) { /* sin almacenamiento: la elección vale solo para esta visita */ }
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
    { nivel: d.nivel, equipamiento: d.equipamiento }
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

/** Lo que el usuario ha elegido en la pantalla, ya validado. */
function entrenoLeerControles() {
  var nivel = document.getElementById("entNivel").value;
  var equipamiento = document.getElementById("entEquipo").value;
  var semana = Math.floor(Number(document.getElementById("entSemana").value));
  if (ENTRENO_NIVELES.indexOf(nivel) === -1) nivel = "principiante";
  if (ENTRENO_EQUIPOS.indexOf(equipamiento) === -1) equipamiento = "gimnasio";
  if (!(semana >= 1)) semana = 1;
  if (semana > ENTRENO_SEMANA_MAX) semana = ENTRENO_SEMANA_MAX;
  return { nivel: nivel, equipamiento: equipamiento, semana: semana };
}

function entrenoEsc(texto) {
  return escapeHtml(String(texto));
}

/** Descanso en minutos y segundos: "2:30". Igual en todos los idiomas. */
function entrenoDescanso(segundos) {
  var min = Math.floor(segundos / 60);
  var seg = segundos % 60;
  return min + ":" + (seg < 10 ? "0" + seg : String(seg));
}

function entrenoCabeceraHtml(plan) {
  var partes = [
    tOr("ent.division_" + plan.division, plan.division),
    tFormat("ent.dias_n", { n: plan.dias }),
    tOr("ent.objetivo_" + plan.objetivo, plan.objetivo),
    tOr("ent.nivel_" + plan.nivel, plan.nivel),
    tOr("ent.equipo_" + plan.equipamiento, plan.equipamiento)
  ];
  return '<h3 class="entreno__cabecera">' + partes.map(entrenoEsc).join(" · ") + "</h3>";
}

function entrenoTablaHtml(sesion) {
  var filas = sesion.exercises.map(function (e) {
    return "<tr><td>" + entrenoEsc(e.name) + "</td><td>" + e.sets + "</td><td>" + entrenoEsc(e.reps) +
      "</td><td>" + entrenoDescanso(e.restSeconds) + "</td><td>" + e.rir +
      '</td><td class="entreno__tec">' + entrenoEsc(e.tecnica) + "</td></tr>";
  }).join("");
  return '<div class="entreno__tabla"><table><thead><tr>' +
    "<th>" + t("ent.col_ejercicio") + "</th><th>" + t("ent.col_series") + "</th><th>" + t("ent.col_reps") +
    "</th><th>" + t("ent.col_descanso") + "</th><th>" + t("ent.col_rir") + "</th><th>" + t("ent.col_tecnica") +
    "</th></tr></thead><tbody>" + filas + "</tbody></table></div>";
}

function entrenoItem(textoHtml) {
  return "<li>" + textoHtml + "</li>";
}

function entrenoPlanHtml(plan) {
  var h = [entrenoCabeceraHtml(plan)];

  if (plan.semanaDescarga) {
    h.push('<p class="entreno__aviso">' + entrenoEsc(tFormat("ent.semana_descarga", { semana: plan.semana })) + "</p>");
  }
  if (plan.warnings.length) {
    var avisos = plan.warnings.map(function (w) { return entrenoItem(entrenoEsc(entrenoTextoAviso(w))); });
    h.push('<div class="entreno__aviso"><strong>' + t("ent.que_saber") + "</strong><ul>" + avisos.join("") + "</ul></div>");
  }

  plan.sesiones.forEach(function (s) {
    h.push('<h4 class="entreno__sesion">' + entrenoEsc(tOr("ent.sesion_" + s.key, s.name)) + " — " +
      entrenoEsc(t("ent.dia_" + s.dia)) + "</h4>");
    h.push(entrenoTablaHtml(s));
  });

  var grupos = Object.keys(plan.seriesPorSemana).map(function (m) {
    return entrenoItem(entrenoEsc(tFormat("ent.series_linea", {
      grupo: tOr("ent.grupo_" + m, m),
      n: plan.seriesPorSemana[m]
    })));
  });
  h.push('<h3 class="entreno__subtitulo">' + t("ent.series_semana") + "</h3>");
  h.push('<ul class="entreno__lista">' + grupos.join("") + "</ul>");

  h.push('<h3 class="entreno__subtitulo">' + t("ent.como") + "</h3>");
  var consejos = ["ent.calentar", "ent.progresion", "ent.descarga", "ent.cardio_" + plan.objetivo, "ent.rir", "ent.aviso_general"];
  h.push('<ul class="entreno__lista">' + consejos.map(function (clave) {
    return entrenoItem(entrenoEsc(t(clave)));
  }).join("") + "</ul>");

  return h.join("");
}

/** Pinta el plan con lo que hay en el formulario de la pantalla. */
function renderEntreno() {
  var salida = document.getElementById("entrenoSalida");
  var sinDias = document.getElementById("entrenoSinDias");
  if (!salida) return;

  var dias = Math.floor(Number((document.getElementById("workouts") || {}).value));
  var sinPlan = !(dias >= 1);
  if (sinDias) sinDias.hidden = !sinPlan;
  salida.hidden = sinPlan;
  if (sinPlan) {
    salida.innerHTML = "";
    return;
  }

  var controles = entrenoLeerControles();
  var plan = entrenoPlanParaDatos({
    dias: dias,
    objetivo: (document.getElementById("goal") || {}).value,
    nivel: controles.nivel,
    equipamiento: controles.equipamiento,
    semana: controles.semana
  });
  salida.innerHTML = plan.ok ? entrenoPlanHtml(plan) : "";
}

function renderEntrenoSiVisible() {
  if (!_entrenoPanel || _entrenoPanel.hidden) return;
  renderEntreno();
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
  window.scrollTo(0, 0);
}

function entrenoAlCambiar() {
  var controles = entrenoLeerControles();
  entrenoGuardarPrefs(controles);
  renderEntreno();
}

function initEntreno() {
  _entrenoBoton = document.getElementById("modoBtn");
  _entrenoPanel = document.getElementById("entrenoPanel");
  if (!_entrenoBoton || !_entrenoPanel) return;

  var prefs = entrenoLeerPrefs();
  document.getElementById("entNivel").value = prefs.nivel;
  document.getElementById("entEquipo").value = prefs.equipamiento;
  document.getElementById("entSemana").value = String(prefs.semana);

  _entrenoBoton.addEventListener("click", function () { entrenoMostrar(_entrenoPanel.hidden); });
  ["entNivel", "entEquipo", "entSemana"].forEach(function (id) {
    document.getElementById(id).addEventListener("change", entrenoAlCambiar);
  });

  var abrirDatos = document.getElementById("entAbrirDatos");
  if (abrirDatos) abrirDatos.addEventListener("click", function () {
    entrenoMostrar(false);
    if (typeof activarPestana === "function") activarPestana("datos");
  });
  var imprimir = document.getElementById("entImprimir");
  if (imprimir) imprimir.addEventListener("click", function () { window.print(); });

  entrenoMostrar(false);
}
