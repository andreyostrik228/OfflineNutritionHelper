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

/** Lo que el usuario ha elegido en la pantalla, ya validado. */
function entrenoLeerControles() {
  var nivel = entrenoValorSeg("entNivel");
  var equipamiento = entrenoValorSeg("entEquipo");
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

function entrenoChip(texto, fuerte) {
  return '<li class="entreno__chip' + (fuerte ? " entreno__chip--fuerte" : "") + '">' + entrenoEsc(texto) + "</li>";
}

function entrenoChipsHtml(plan) {
  return '<ul class="entreno__chips">' + [
    entrenoChip(tOr("ent.division_" + plan.division, plan.division), true),
    entrenoChip(tFormat("ent.dias_n", { n: plan.dias }), false),
    entrenoChip(tOr("ent.objetivo_" + plan.objetivo, plan.objetivo), false),
    entrenoChip(tOr("ent.nivel_" + plan.nivel, plan.nivel), false),
    entrenoChip(tOr("ent.equipo_" + plan.equipamiento, plan.equipamiento), false)
  ].join("") + "</ul>";
}

/** Tabla de una sesión. Cada celda lleva su etiqueta: en el móvil se pinta como tarjeta. */
function entrenoTablaHtml(sesion) {
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
      '<td class="entreno__nombre" data-label="' + entrenoEsc(etiqueta.ejercicio) + '">' + entrenoEsc(e.name) + "</td>" +
      '<td data-label="' + entrenoEsc(etiqueta.series) + '">' + e.sets + "</td>" +
      '<td data-label="' + entrenoEsc(etiqueta.reps) + '">' + entrenoEsc(e.reps) + "</td>" +
      '<td data-label="' + entrenoEsc(etiqueta.descanso) + '">' + entrenoDescanso(e.restSeconds) + "</td>" +
      '<td data-label="' + entrenoEsc(etiqueta.rir) + '">' + e.rir + "</td>" +
      '<td class="entreno__tec" data-label="' + entrenoEsc(etiqueta.tecnica) + '">' + entrenoEsc(e.tecnica) + "</td>" +
      "</tr>";
  }).join("");
  return '<div class="entreno__tabla"><table><thead><tr>' +
    "<th>" + entrenoEsc(etiqueta.ejercicio) + "</th><th>" + entrenoEsc(etiqueta.series) + "</th><th>" + entrenoEsc(etiqueta.reps) +
    "</th><th>" + entrenoEsc(etiqueta.descanso) + "</th><th>" + entrenoEsc(etiqueta.rir) + "</th><th>" + entrenoEsc(etiqueta.tecnica) +
    "</th></tr></thead><tbody>" + filas + "</tbody></table></div>";
}

/** Tarjeta de una sesión: el día, el nombre y el número de ejercicios, y debajo la tabla. */
function entrenoSesionHtml(s) {
  return '<section class="entreno__sesion">' +
    '<header class="entreno__sesion-cabeza">' +
      '<span class="entreno__dia">' + entrenoEsc(t("ent.dia_" + s.dia)) + "</span>" +
      '<h4 class="entreno__sesion-titulo">' + entrenoEsc(tOr("ent.sesion_" + s.key, s.name)) + "</h4>" +
      '<span class="entreno__n">' + entrenoEsc(tFormat("ent.n_ejercicios", { n: s.exercises.length })) + "</span>" +
    "</header>" +
    entrenoTablaHtml(s) +
  "</section>";
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

function entrenoPlanHtml(plan) {
  var h = [entrenoChipsHtml(plan)];

  if (plan.semanaDescarga) {
    h.push('<p class="entreno__aviso entreno__aviso--suave">' + entrenoEsc(tFormat("ent.semana_descarga", { semana: plan.semana })) + "</p>");
  }
  if (plan.warnings.length) {
    var avisos = plan.warnings.map(function (w) { return "<li>" + entrenoEsc(entrenoTextoAviso(w)) + "</li>"; });
    h.push('<div class="entreno__aviso"><strong>' + entrenoEsc(t("ent.que_saber")) + "</strong><ul>" + avisos.join("") + "</ul></div>");
  }

  plan.sesiones.forEach(function (s) { h.push(entrenoSesionHtml(s)); });

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

/** Pulsación corta en los móviles que vibran (Android). En el resto no hace nada. */
function entrenoVibrar() {
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
  entrenoPonerSeg("entNivel", prefs.nivel);
  entrenoPonerSeg("entEquipo", prefs.equipamiento);
  document.getElementById("entSemana").value = String(prefs.semana);

  _entrenoBoton.addEventListener("click", function () { entrenoVibrar(); entrenoMostrar(_entrenoPanel.hidden); });

  ["entNivel", "entEquipo"].forEach(function (id) {
    Array.prototype.forEach.call(document.querySelectorAll("#" + id + " .entreno__seg-btn"), function (b) {
      b.addEventListener("click", function () {
        entrenoVibrar();
        entrenoPonerSeg(id, b.getAttribute("data-valor"));
        entrenoAlCambiar();
      });
    });
  });
  Array.prototype.forEach.call(document.querySelectorAll(".entreno__paso-btn"), function (b) {
    b.addEventListener("click", function () { entrenoVibrar(); entrenoPasoSemana(Number(b.getAttribute("data-paso"))); });
  });
  document.getElementById("entSemana").addEventListener("change", entrenoAlCambiar);

  var abrirDatos = document.getElementById("entAbrirDatos");
  if (abrirDatos) abrirDatos.addEventListener("click", function () {
    entrenoMostrar(false);
    if (typeof activarPestana === "function") activarPestana("datos");
  });
  var imprimir = document.getElementById("entImprimir");
  if (imprimir) imprimir.addEventListener("click", function () { window.print(); });

  entrenoMostrar(false);
}
