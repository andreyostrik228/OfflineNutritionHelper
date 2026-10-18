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

/**
 * Elecciones guardadas en este navegador. Lo que no sea válido vuelve al valor
 * por defecto. `configurado` dice si ya se contestó el cuestionario; sin él,
 * el panel lo abre solo la primera vez.
 */
function entrenoLeerPrefs() {
  var prefs = {
    nivel: "principiante", equipamiento: "gimnasio", semana: 1, duracion: 60, excluir: "",
    objetivo: "auto", material: null, enfoque: [], limitaciones: [], diasSemana: null, configurado: false
  };
  try {
    var guardado = JSON.parse(localStorage.getItem(ENTRENO_CLAVE_PREFS) || "null");
    if (guardado && typeof guardado === "object") {
      if (ENTRENO_NIVELES.indexOf(guardado.nivel) !== -1) prefs.nivel = guardado.nivel;
      if (ENTRENO_EQUIPOS.indexOf(guardado.equipamiento) !== -1) prefs.equipamiento = guardado.equipamiento;
      var semana = Math.floor(Number(guardado.semana));
      if (semana >= 1 && semana <= ENTRENO_SEMANA_MAX) prefs.semana = semana;
      if (ENTRENO_DURACIONES.indexOf(Number(guardado.duracion)) !== -1) prefs.duracion = Number(guardado.duracion);
      if (typeof guardado.excluir === "string") prefs.excluir = guardado.excluir.slice(0, 200);
      if (ENTRENO_OBJETIVOS.indexOf(guardado.objetivo) !== -1) prefs.objetivo = guardado.objetivo;
      if (Array.isArray(guardado.material)) prefs.material = _entrenoLista(guardado.material, ENTRENO_MATERIALES);
      prefs.enfoque = _entrenoLista(guardado.enfoque, ENTRENO_ENFOQUES, ENTRENO_ENFOQUE_MAX);
      prefs.limitaciones = _entrenoLista(guardado.limitaciones, ENTRENO_LIMITACIONES);
      var dias = _entrenoLista((guardado.diasSemana || []).map(Number), [1, 2, 3, 4, 5, 6, 7]);
      if (dias.length) prefs.diasSemana = dias.sort(function (a, b) { return a - b; });
      prefs.configurado = guardado.configurado === true;
    }
  } catch (e) { /* sin almacenamiento o JSON roto: se queda con los valores por defecto */ }
  if (prefs.equipamiento === "personalizado" && !prefs.material) prefs.equipamiento = "gimnasio";
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
    {
      nivel: d.nivel, equipamiento: d.equipamiento, duracion: d.duracion, excluir: d.excluir,
      objetivo: d.objetivoEntreno, material: d.material, enfoque: d.enfoque,
      limitaciones: d.limitaciones, diasSemana: d.diasSemana
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
 * Repeticiones del plan en el idioma de la pantalla: "6-10" → "6–10",
 * "10-12 por lado" → "10–12 на сторону", "30-45 s" → "30–45 с". Lo que no
 * tenga esa forma sale tal cual.
 */
function entrenoRepsTexto(reps) {
  var m = /^(\d+)-(\d+)( s)?( por lado)?$/.exec(String(reps));
  if (!m) return String(reps);
  return m[1] + "–" + m[2] + (m[3] ? " " + t("ent.seg_abrev") : "") + (m[4] ? " " + t("ent.por_lado") : "");
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

/** Lo que va en la ventana de un ejercicio: la animación grande, los músculos y la técnica. */
function entrenoFichaHtml(id) {
  var e = _entrenoCatalogo(id);
  if (!e) return "";
  return '<div class="anim-ficha">' +
    entrenoAnimacionHtml(id, "completo", tFormat("ent.animacion_de", { nombre: entrenoNombre(e) })) +
    entrenoMusculosHtml(id) +
    '<p class="anim-ficha__tecnica">' + entrenoEsc(entrenoTecnica(e)) + "</p>" +
    '<p class="anim-ficha__leyenda">' + entrenoEsc(t("ent.animacion_leyenda")) + "</p>" +
  "</div>";
}

/** Abre la ventana con la animación grande de un ejercicio. */
function entrenoAbrirAnimacion(id) {
  var dialogo = document.getElementById("entrenoAnimDialogo");
  var e = _entrenoCatalogo(id);
  if (!dialogo || !e) return;
  document.getElementById("entrenoAnimTitulo").textContent = entrenoNombre(e);
  var cuerpo = document.getElementById("entrenoAnimCuerpo");
  cuerpo.innerHTML = entrenoFichaHtml(id);
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
  if (plan.enfoque && plan.enfoque.length) {
    fichas.push(entrenoChip(tFormat("ent.chip_enfoque", { lista: _entrenoListaTexto(plan.enfoque, "ent.enfoque_", true) }), false));
  }
  if (plan.limitaciones && plan.limitaciones.length) {
    fichas.push(entrenoChip(tFormat("ent.chip_limites", { lista: _entrenoListaTexto(plan.limitaciones, "ent.limite_acus_", false) }), false));
  }
  if (plan.division) fichas.push(entrenoChip(tOr("ent.division_" + plan.division, plan.division), false));
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

/**
 * Tabla de una sesión. Cada celda lleva su etiqueta: en el móvil se pinta como
 * tarjeta. Con el diario (log), bajo el nombre va «La última vez: …».
 */
function entrenoTablaHtml(sesion, log) {
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
            entrenoUltimaHtml(e, log) + "</span>" +
        "</span></td>" +
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
  var empezar = (typeof i === "number" && typeof entrenoSesionEmpezar === "function")
    ? '<button type="button" class="entreno__empezar" data-empezar="' + i + '">' + entrenoEsc(t("ent.empezar")) + "</button>"
    : "";
  return '<section class="entreno__sesion">' +
    '<header class="entreno__sesion-cabeza">' +
      '<span class="entreno__dia">' + entrenoEsc(t("ent.dia_" + s.dia)) + "</span>" +
      '<h4 class="entreno__sesion-titulo">' + entrenoEsc(tOr("ent.sesion_" + s.key, s.name)) + "</h4>" +
      '<span class="entreno__n">' + entrenoEsc(tFormat("ent.n_ejercicios", { n: s.exercises.length })) + "</span>" +
      empezar +
    "</header>" +
    entrenoTablaHtml(s, log) +
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
  var sinPlan = !(dias >= 1);
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
    duracion: prefs.duracion,
    excluir: prefs.excluir,
    enfoque: prefs.enfoque,
    limitaciones: prefs.limitaciones,
    diasSemana: prefs.diasSemana,
    semana: prefs.semana
  });
  var fichas = document.getElementById("entrenoResumenFichas");
  var notas = document.getElementById("entrenoResumenNotas");
  if (fichas) fichas.innerHTML = entrenoResumenFichasHtml(plan, prefs);
  if (notas) notas.innerHTML = plan.ok ? entrenoResumenNotasHtml(plan) : "";

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
      return tFormat("ics.entreno_titulo", { sesion: tOr("ent.sesion_" + sesion.key, sesion.name) });
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

  // «Empezar» en la tarjeta de un día abre el modo entrenamiento con esa sesión.
  var salida = document.getElementById("entrenoSalida");
  if (salida) salida.addEventListener("click", function (ev) {
    var anim = ev.target.closest("[data-anim-abrir]");
    if (anim) { entrenoAbrirAnimacion(anim.getAttribute("data-anim-abrir")); return; }
    var boton = ev.target.closest("[data-empezar]");
    if (!boton || !_entrenoUltimoPlan || typeof entrenoSesionEmpezar !== "function") return;
    var sesion = _entrenoUltimoPlan.sesiones[Number(boton.getAttribute("data-empezar"))];
    if (!sesion) return;
    entrenoVibrar();
    entrenoSesionEmpezar(sesion, _entrenoUltimoPlan.semana);
  });
  if (typeof initEntrenoSesion === "function") initEntrenoSesion();
  if (typeof initEntrenoProgreso === "function") initEntrenoProgreso();
  var cerrarAnim = document.getElementById("entrenoAnimCerrar");
  if (cerrarAnim) cerrarAnim.addEventListener("click", _entrenoCerrarAnimacion);
  var dialogoAnim = document.getElementById("entrenoAnimDialogo");
  if (dialogoAnim) dialogoAnim.addEventListener("close", function () { document.getElementById("entrenoAnimCuerpo").innerHTML = ""; });

  entrenoMostrar(false);
}
