/**
 * js/ui/entreno-sesion.js
 * ─────────────────────────────────────────────────────────────────────────
 * MODO ENTRENAMIENTO (2026-10-18). La pantalla de una sesión en marcha, como
 * en las apps de gimnasio: cada ejercicio con sus series (kilos y
 * repeticiones ya rellenos con la sugerencia de hoy), un toque para marcar
 * la serie hecha, la cuenta atrás del descanso abajo y, al terminar, el
 * resumen con los récords.
 *
 * Los datos los lleva js/core/workout-log.js (diario) y los cambios sobre la
 * marcha js/core/workout-edit.js. La pantalla vive dentro de #entrenoPanel:
 * con la clase `is-sesion` el panel enseña solo #entrenoSesion. Si se recarga
 * a mitad, la sesión sigue en curso y el panel ofrece continuarla
 * (js/ui/entreno-progreso.js).
 *
 * Mientras está abierta, la pantalla no se apaga (Wake Lock, donde exista) y
 * al acabar el descanso el móvil vibra y suena un aviso corto (se puede
 * quitar el sonido; la elección se guarda en ENTRENO_CLAVE_SONIDO).
 *
 * Segunda parte (2026-10-18): cada ejercicio tiene «Más» (sustituir,
 * calentamiento, superserie con el siguiente, subir y bajar, saltar, quitar y
 * una nota); el número de cada serie cambia su tipo (calentamiento, drop set,
 * al fallo); las barras dicen qué discos poner; hay pausa y «Añadir
 * ejercicio». En una superserie, al marcar una serie se pasa al siguiente
 * ejercicio sin descanso, y se descansa al acabar la ronda.
 *
 * Y la misma pantalla CORRIGE una sesión ya terminada (entrenoSesionCorregir):
 * sin reloj ni descansos, con «Guardar» y «Cancelar». Mientras se corrige no
 * se guarda nada: el diario solo cambia al pulsar «Guardar».
 *
 * Expone (globales):
 *   initEntrenoSesion()                  cablea la pantalla (una vez; lo llama initEntreno)
 *   entrenoSesionEmpezar(sesionPlan, semana)  empieza (si ya hay otra, pregunta) y abre
 *   entrenoSesionAbrir(log?)             abre la que está en curso
 *   entrenoSesionCorregir(id)            abre una terminada para corregirla
 *   entrenoSesionCerrar(destino?)        vuelve al plan (o a esa sección); la sesión sigue en curso
 *   entrenoSesionSalir()                 cerrar para ir a otra sección; false si se queda (corrigiendo con cambios)
 *   entrenoSesionDescartar()             borra la que está en curso (pregunta)
 *   entrenoSesionAlMostrar() / entrenoSesionAlOcultar()  el panel se enseña o se esconde
 *   entrenoSesionRepintar()              repinta si está abierta (cambio de idioma)
 *   entrenoSesionPantallaHtml(sesion, log, ahora, opciones)  marcado, sin DOM (lo prueban los tests)
 *   entrenoResumenHtml(resumen)          marcado del resumen final
 *   entrenoSugerenciaTexto(sug, ejercicio, sinPeso)  la línea «Hoy: …»
 *   entrenoSeriesTexto(series, tiempo)   "60 kg × 10, 10, 9"
 *   entrenoDiscosTexto(kg)               "20 + 5 + 1,25" por lado, o ""
 *   entrenoNumero(n) / entrenoKg(kg) / entrenoMiles(n) / entrenoReloj(ms) / entrenoLocale()
 *   entrenoSonidoOn() / entrenoSonidoPoner(on)        el sonido al acabar el descanso
 *   entrenoVibracionOn() / entrenoVibracionPoner(on)  la vibración (se quita en «Perfil»)
 *
 * Con la barra de secciones (js/ui/entreno-pestanas.js, 2026-10-21) esta
 * pantalla es la sección «Entrenar»: al abrirse la marca, y la flecha vuelve
 * a la sección de antes (corrigiendo, al historial de «Progreso»).
 * ─────────────────────────────────────────────────────────────────────────
 */

var ENTRENO_CLAVE_SONIDO = "nutritionPlanner.entrenoSonido.v1";
var ENTRENO_CLAVE_VIBRACION = "nutritionPlanner.entrenoVibracion.v1";
var ENTRENO_DESCANSO_PASO_S = 15;

var _sesionLog = null;
var _sesionTicId = null;
var _sesionAudio = null;
var _sesionWake = null;
var _sesionResumen = null;
var _sesionAvisoHasta = 0;
var _sesionDescansoTotal = 0;
var _sesionCableado = false;
/** Al corregir una terminada: { id, cambios }. null en una sesión en curso. */
var _sesionEdicion = null;
/** El menú «Más» que tiene que seguir abierto tras repintar (subir y bajar varias veces). */
var _sesionMasAbierto = null;

var SESION_ICONOS = {
  atras: '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  check: '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  sonido: '<svg viewBox="0 0 24 24" width="21" height="21" aria-hidden="true" focusable="false"><path d="M12 3.5a5.5 5.5 0 0 0-5.5 5.5v3.6L4.8 15.5v1h14.4v-1l-1.7-2.9V9A5.5 5.5 0 0 0 12 3.5z M10 19a2 2 0 0 0 4 0" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"/></svg>',
  sinSonido: '<svg viewBox="0 0 24 24" width="21" height="21" aria-hidden="true" focusable="false"><path d="M12 3.5a5.5 5.5 0 0 0-5.5 5.5v3.6L4.8 15.5v1h14.4v-1l-1.7-2.9V9A5.5 5.5 0 0 0 12 3.5z M10 19a2 2 0 0 0 4 0" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round" opacity="0.55"/><path d="M4 4l16 16" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
  mas: '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false"><circle cx="5.5" cy="12" r="1.9" fill="currentColor"/><circle cx="12" cy="12" r="1.9" fill="currentColor"/><circle cx="18.5" cy="12" r="1.9" fill="currentColor"/></svg>',
  pausa: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false"><path d="M8 5.5v13M16 5.5v13" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg>',
  seguir: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false"><path d="M8 5.5l11 6.5-11 6.5z" fill="currentColor"/></svg>'
};

function _sesionCaja() { return document.getElementById("entrenoSesion"); }
function _sesionPanel() { return document.getElementById("entrenoPanel"); }
function _sesionAbierta() {
  var panel = _sesionPanel();
  return !!(panel && panel.classList.contains("is-sesion"));
}
function _sesionLang() { return typeof getLang === "function" ? getLang() : "es"; }
/** "ru-RU", "en-GB"…: el de LANG_LOCALES (js/core/i18n.js). */
function entrenoLocale() {
  return (typeof LANG_LOCALES !== "undefined" && LANG_LOCALES[_sesionLang()]) || "es-ES";
}
function _sesionEsc(texto) { return escapeHtml(String(texto)); }

/** 62,5 (o 62.5 en inglés), sin ceros de sobra. */
function entrenoNumero(n) {
  var texto = String(Math.round(Number(n) * 100) / 100);
  return _sesionLang() === "en" ? texto : texto.replace(".", ",");
}

function entrenoKg(kg) {
  return entrenoNumero(kg) + " " + t("ent.kg");
}

/** 4 250 con el separador de miles del idioma. */
function entrenoMiles(n) {
  try { return Number(n).toLocaleString(entrenoLocale()); }
  catch (e) { return String(n); }
}

/** 12:05 o 1:02:05. */
function entrenoReloj(ms) {
  var s = Math.max(0, Math.floor(ms / 1000));
  var h = Math.floor(s / 3600);
  var m = Math.floor((s % 3600) / 60);
  var seg = s % 60;
  return (h ? h + ":" + (m < 10 ? "0" : "") : "") + m + ":" + (seg < 10 ? "0" : "") + seg;
}

function _sesionCatalogo(id) {
  var catalogo = typeof EXERCISE_CATALOG !== "undefined" ? EXERCISE_CATALOG : [];
  for (var i = 0; i < catalogo.length; i++) if (catalogo[i].id === id) return catalogo[i];
  return null;
}

/** Sin material: el «peso» es el del cuerpo (las casillas de kilos son lastre opcional). */
function _sesionSinPeso(id) {
  var e = _sesionCatalogo(id);
  return !!(e && Array.isArray(e.equipment) && e.equipment.indexOf("sin_material") !== -1);
}

/**
 * Las series de una vez, agrupadas por peso: "60 kg × 10, 10, 9";
 * con pesos distintos "60 kg × 10 · 65 kg × 8"; sin peso "peso corporal × 12, 10";
 * de tiempo "30 s, 40 s".
 */
function entrenoSeriesTexto(series, tiempo) {
  var grupos = [];
  series.forEach(function (s) {
    var kg = s.kg || 0;
    var ultimo = grupos[grupos.length - 1];
    if (ultimo && ultimo.kg === kg) ultimo.reps.push(s.reps);
    else grupos.push({ kg: kg, reps: [s.reps] });
  });
  return grupos.map(function (g) {
    var reps = g.reps.map(function (r) { return tiempo ? tFormat("ent.segundos", { n: r }) : String(r); }).join(", ");
    if (0 < g.kg) return entrenoKg(g.kg) + " × " + reps;
    return tiempo ? reps : t("ent.peso_corporal") + " × " + reps;
  }).join(" · ");
}

/** La línea «Hoy: …» que acompaña a cada ejercicio. "" si no hay nada útil que decir. */
function entrenoSugerenciaTexto(sug, ejercicio, sinPeso) {
  var rango = entrenoLogRango(ejercicio.reps);
  if (rango && rango.tiempo) return tFormat("ent.sug_tiempo", { s: sug.reps || rango.min });
  if (sug.tipo === "nuevo") {
    if (!rango) return "";
    return tFormat(sinPeso ? "ent.primera_vez_sin_peso" : "ent.primera_vez", { reps: rango.min });
  }
  if (sug.tipo === "variante") return t("ent.sug_variante");
  var kg = 0 < sug.kg ? entrenoKg(sug.kg) : t("ent.peso_corporal");
  if (sug.tipo === "subir") return tFormat("ent.sug_subir", { kg: kg });
  if (sug.tipo === "bajar") return tFormat("ent.sug_bajar", { kg: kg });
  return tFormat("ent.sug_mantener", { kg: kg, reps: sug.reps });
}

/** "20 + 5 + 1,25" por lado para cargar la barra con kg; "" si no aplica. */
function entrenoDiscosTexto(kg) {
  var d = typeof entrenoDiscos === "function" ? entrenoDiscos(kg) : null;
  if (!d) return "";
  if (d.corta) return tFormat("ent.discos_corta", { barra: entrenoKg(ENTRENO_BARRA_KG) });
  if (!d.lado.length && !d.resto) return t("ent.discos_solo_barra");
  var texto = tFormat("ent.discos_lado", { discos: d.lado.map(entrenoNumero).join(" + ") || "0" });
  if (d.resto) texto += " " + tFormat("ent.discos_resto", { kg: entrenoKg(d.resto * 2) });
  return texto;
}

function _sesionContar(sesion) {
  var hechas = 0;
  var total = 0;
  sesion.ejercicios.forEach(function (e) {
    if (e.saltado) return;
    total += e.series.length;
    e.series.forEach(function (s) { if (s.hecha) hechas++; });
  });
  return { hechas: hechas, total: total };
}

function _sesionNombre(sesion) {
  return typeof entrenoLogNombreSesion === "function" ? entrenoLogNombreSesion(sesion) : tOr("ent.sesion_" + sesion.clave, sesion.nombre || "");
}

/** Letra corta del tipo de serie ("Р", "Д", "О" en ruso) o el número de serie de trabajo. */
function _sesionEtiquetaSerie(serie, numero) {
  return serie.tipo ? t("ent.tipo_" + serie.tipo + "_corto") : String(numero);
}

function _sesionSerieHtml(i, serie, j, numero, antes, tiempo) {
  var record = serie.hecha && serie.tipo !== "c" ? entrenoLogTipoRecord(antes, serie) : null;
  var datos = ' data-ej="' + i + '" data-serie="' + j + '"';
  var nombreSerie = serie.tipo ? t("ent.tipo_" + serie.tipo) : tFormat("ent.serie_n", { n: numero });
  var n = serie.tipo ? (j + 1) : numero;
  return '<div class="sesion__fila' + (serie.hecha ? " is-hecha" : "") + (serie.tipo ? " sesion__fila--" + serie.tipo : "") + '">' +
    '<span class="sesion__n-celda">' +
      '<button type="button" class="sesion__n' + (serie.tipo ? " sesion__n--" + serie.tipo : "") + '" data-accion="tipo"' + datos +
        ' data-foco="tipo-' + i + "-" + j + '" aria-label="' + _sesionEsc(nombreSerie + ". " + t("ent.tipo_cambiar")) + '">' +
        _sesionEsc(_sesionEtiquetaSerie(serie, numero)) + "</button>" +
      (record ? '<b class="sesion__record">' + _sesionEsc(t("ent.record")) + "</b>" : "") +
    "</span>" +
    '<input class="sesion__campo" type="text" inputmode="decimal" autocomplete="off" maxlength="6" placeholder="—"' +
      ' data-campo="kg"' + datos + ' data-foco="kg-' + i + "-" + j + '"' +
      ' value="' + _sesionEsc(serie.kg === null ? "" : entrenoNumero(serie.kg)) + '"' +
      ' aria-label="' + _sesionEsc(tFormat("ent.kg_serie", { n: n })) + '">' +
    '<input class="sesion__campo" type="text" inputmode="numeric" autocomplete="off" maxlength="4"' +
      ' data-campo="reps"' + datos + ' data-foco="reps-' + i + "-" + j + '"' +
      ' value="' + _sesionEsc(serie.reps === null ? "" : String(serie.reps)) + '"' +
      ' aria-label="' + _sesionEsc(tFormat(tiempo ? "ent.seg_serie" : "ent.reps_serie", { n: n })) + '">' +
    '<button type="button" class="sesion__check" data-accion="check"' + datos + ' data-foco="check-' + i + "-" + j + '"' +
      ' aria-pressed="' + (serie.hecha ? "true" : "false") + '"' +
      ' aria-label="' + _sesionEsc(tFormat("ent.marcar_serie", { n: n })) + '">' + SESION_ICONOS.check + "</button>" +
  "</div>";
}

/** Posición de un ejercicio en su superserie: "" (no va en ninguna), "ini", "med" o "fin". */
function _sesionPosGrupo(sesion, i) {
  var e = sesion.ejercicios[i];
  if (!e.grupo) return "";
  var antes = 0 < i && sesion.ejercicios[i - 1].grupo === e.grupo;
  var despues = i + 1 < sesion.ejercicios.length && sesion.ejercicios[i + 1].grupo === e.grupo;
  if (antes && despues) return "med";
  return antes ? "fin" : "ini";
}

function _sesionTamGrupo(sesion, grupo) {
  return sesion.ejercicios.filter(function (e) { return e.grupo === grupo; }).length;
}

/** El menú «Más» de un ejercicio: lo que se puede cambiar sobre la marcha. */
function _sesionMasHtml(sesion, e, i, corrigiendo) {
  var ultimo = i === sesion.ejercicios.length - 1;
  var rango = entrenoLogRango(e.reps);
  var tiempo = !!(rango && rango.tiempo);
  var botones = [];
  function boton(accion, clave) {
    botones.push('<button type="button" class="sesion__mas-btn" data-accion="' + accion + '" data-ej="' + i + '"' +
      ' data-foco="' + accion + "-" + i + '">' + _sesionEsc(t(clave)) + "</button>");
  }
  boton("sustituir", "ent.accion_sustituir");
  if (!tiempo && !e.series.some(function (s) { return s.tipo === "c"; })) boton("calentar", "ent.accion_calentar");
  if (!ultimo) {
    var juntos = e.grupo && sesion.ejercicios[i + 1].grupo === e.grupo;
    boton("superserie", juntos ? "ent.accion_separar" : "ent.accion_superserie");
  }
  if (0 < i) boton("subir", "ent.accion_subir");
  if (!ultimo) boton("bajar", "ent.accion_bajar");
  if (!corrigiendo) boton("saltar", "ent.accion_saltar");
  var hechas = e.series.some(function (s) { return s.hecha; });
  if (1 < sesion.ejercicios.length && (corrigiendo || !hechas)) boton("quitar", "ent.accion_quitar");
  return '<details class="sesion__mas" data-mas="' + i + '"' + (_sesionMasAbierto === i ? " open" : "") + ">" +
    '<summary class="sesion__mas-boton" aria-label="' + _sesionEsc(tFormat("ent.mas_de", { nombre: entrenoNombre({ id: e.id, name: e.name }) })) + '">' +
      SESION_ICONOS.mas + "</summary>" +
    '<div class="sesion__mas-menu">' + botones.join("") +
      '<label class="sesion__nota-etiqueta" for="sesionNota' + i + '">' + _sesionEsc(t("ent.nota_ejercicio")) + "</label>" +
      '<textarea class="sesion__nota-campo" id="sesionNota' + i + '" data-nota="' + i + '" rows="2" maxlength="' + ENTRENO_LOG_MAX_NOTA + '"' +
        ' placeholder="' + _sesionEsc(t("ent.nota_placeholder")) + '">' + _sesionEsc(e.nota || "") + "</textarea>" +
    "</div>" +
  "</details>";
}

function _sesionEjercicioSaltadoHtml(e, i) {
  var nombre = entrenoNombre({ id: e.id, name: e.name });
  return '<li class="sesion__ej is-saltado">' +
    '<header class="sesion__ej-cabeza">' +
      '<span class="sesion__ej-num" aria-hidden="true">' + (i + 1) + "</span>" +
      '<div class="sesion__ej-titulos">' +
        '<h4 class="sesion__ej-nombre">' + _sesionEsc(nombre) + "</h4>" +
        '<p class="sesion__ej-plan">' + _sesionEsc(t("ent.saltado")) + "</p>" +
      "</div>" +
      '<button type="button" class="sesion__boton" data-accion="saltar" data-ej="' + i + '" data-foco="saltar-' + i + '">' +
        _sesionEsc(t("ent.accion_recuperar")) + "</button>" +
    "</header>" +
  "</li>";
}

function _sesionEjercicioHtml(sesion, e, i, log, corrigiendo) {
  if (e.saltado) return _sesionEjercicioSaltadoHtml(e, i);
  var rango = entrenoLogRango(e.reps);
  var tiempo = !!(rango && rango.tiempo);
  var sinPeso = _sesionSinPeso(e.id);
  var catalogo = _sesionCatalogo(e.id);
  var trabajo = e.series.filter(function (s) { return s.tipo !== "c"; });
  var sug = entrenoLogSugerencia(log, { id: e.id, reps: e.reps, muscle: e.muscle, compound: e.compound, sets: trabajo.length || e.series.length });
  var antes = entrenoLogRecords(log, e.id);
  var hechas = e.series.filter(function (s) { return s.hecha; }).length;
  var nombre = entrenoNombre({ id: e.id, name: e.name });
  var plan = tFormat("ent.plan_linea", {
    series: trabajo.length || e.series.length,
    reps: typeof entrenoRepsTexto === "function" ? entrenoRepsTexto(e.reps) : e.reps,
    descanso: entrenoDescanso(e.descanso)
  });

  var pos = _sesionPosGrupo(sesion, i);
  var clases = "sesion__ej" + (hechas === e.series.length ? " is-completo" : "") + (pos ? " sesion__ej--grupo sesion__ej--g-" + pos : "");
  var conAnimacion = typeof entrenoAnimacionTiene === "function" && entrenoAnimacionTiene(e.id);
  var numero = '<span class="sesion__ej-num" aria-hidden="true">' + (i + 1) + "</span>";
  var cabeza = conAnimacion
    ? '<button type="button" class="sesion__ej-anim" data-accion="tecnica" data-ej="' + i + '" data-foco="anim-' + i + '"' +
        ' aria-label="' + _sesionEsc(tFormat("ent.ver_animacion", { nombre: nombre })) + '">' +
        entrenoAnimacionHtml(e.id, "mini", "") + numero + "</button>"
    : numero;
  var h = '<li class="' + clases + '"' + (e.grupo ? ' data-grupo="' + e.grupo + '"' : "") + ">";
  if (pos === "ini") {
    var circuito = 2 < _sesionTamGrupo(sesion, e.grupo);
    h += '<p class="sesion__grupo-titulo">' + _sesionEsc(tFormat(circuito ? "ent.circuito_n" : "ent.superserie_n", { letra: e.grupo })) +
      ' <span class="sesion__grupo-ayuda">' + _sesionEsc(t("ent.superserie_ayuda")) + "</span></p>";
  }
  h += '<header class="sesion__ej-cabeza">' +
      cabeza +
      '<div class="sesion__ej-titulos">' +
        '<h4 class="sesion__ej-nombre">' + _sesionEsc(nombre) + "</h4>" +
        '<p class="sesion__ej-plan">' + _sesionEsc(plan) + "</p>" +
      "</div>" +
      '<span class="sesion__ej-cuenta">' + hechas + "/" + e.series.length + "</span>" +
      _sesionMasHtml(sesion, e, i, corrigiendo) +
    "</header>";
  if (sug.ultima) {
    h += '<p class="sesion__ultima">' + _sesionEsc(tFormat("ent.ultima_vez", { series: entrenoSeriesTexto(sug.ultima.series, tiempo) })) + "</p>";
    if (sug.ultima.nota && sug.ultima.nota !== e.nota) {
      h += '<p class="sesion__nota-vieja">' + _sesionEsc(tFormat("ent.nota_ultima", { nota: sug.ultima.nota })) + "</p>";
    }
  }
  if (!corrigiendo) {
    var consejo = entrenoSugerenciaTexto(sug, e, sinPeso);
    if (consejo) h += '<p class="sesion__sug sesion__sug--' + sug.tipo + '">' + _sesionEsc(consejo) + "</p>";
  }
  h += '<p class="sesion__nota-hoy" data-nota-hoy="' + i + '"' + (e.nota ? "" : " hidden") + ">" +
    (e.nota ? _sesionEsc(tFormat("ent.nota_hoy", { nota: e.nota })) : "") + "</p>";
  var tecnica = entrenoTecnica({ id: e.id, tecnica: catalogo ? catalogo.tecnica : "" });
  if (tecnica || conAnimacion) {
    h += '<details class="sesion__tec" data-tec="' + i + '"><summary>' + _sesionEsc(t("ent.col_tecnica")) + "</summary>" +
      (conAnimacion
        ? '<div class="sesion__tec-anim">' + entrenoAnimacionHtml(e.id, "completo", tFormat("ent.animacion_de", { nombre: nombre })) + "</div>" +
          (typeof entrenoMusculosHtml === "function" ? entrenoMusculosHtml(e.id) : "")
        : "") +
      (tecnica ? "<p>" + _sesionEsc(tecnica) + "</p>" : "") + "</details>";
  }
  h += '<div class="sesion__series" role="group" aria-label="' + _sesionEsc(nombre) + '">' +
    '<div class="sesion__fila sesion__fila--cabeza" aria-hidden="true">' +
      "<span>" + _sesionEsc(t("ent.col_serie")) + "</span>" +
      "<span>" + _sesionEsc(sinPeso ? t("ent.col_kg_extra") : t("ent.col_kg")) + "</span>" +
      "<span>" + _sesionEsc(tiempo ? t("ent.col_seg") : t("ent.col_reps_corto")) + "</span>" +
      "<span></span>" +
    "</div>";
  var numeroTrabajo = 0;
  e.series.forEach(function (serie, j) {
    if (serie.tipo !== "c") numeroTrabajo++;
    h += _sesionSerieHtml(i, serie, j, numeroTrabajo || 1, antes, tiempo);
  });
  h += "</div>";
  // Con barra: qué discos poner a cada lado para la próxima serie de trabajo.
  if (typeof entrenoEditUsaBarra === "function" && entrenoEditUsaBarra(e.id)) {
    var proxima = e.series.filter(function (s) { return !s.hecha && s.tipo !== "c"; })[0] || e.series[e.series.length - 1];
    var discos = proxima ? entrenoDiscosTexto(proxima.kg) : "";
    if (discos) h += '<p class="sesion__discos">' + _sesionEsc(discos) + "</p>";
  }
  h += '<div class="sesion__ej-acciones">' +
      '<button type="button" class="sesion__boton" data-accion="mas" data-ej="' + i + '" data-foco="mas-' + i + '">' + _sesionEsc(t("ent.anadir_serie")) + "</button>" +
      (1 < e.series.length
        ? '<button type="button" class="sesion__boton" data-accion="menos" data-ej="' + i + '" data-foco="menos-' + i + '">' + _sesionEsc(t("ent.quitar_serie")) + "</button>"
        : "") +
    "</div>" +
  "</li>";
  return h;
}

function _sesionDescansoHtml(sesion, ahora) {
  var queda = sesion.descansoHasta ? sesion.descansoHasta - ahora : 0;
  var activo = 0 < queda;
  var aviso = !activo && ahora < _sesionAvisoHasta;
  return '<div class="sesion__descanso' + (aviso ? " is-fin" : "") + '" data-descanso' + (activo || aviso ? "" : " hidden") + ">" +
    '<div class="sesion__descanso-fila">' +
      '<span class="sesion__descanso-etiqueta" data-descanso-etiqueta aria-live="polite">' +
        _sesionEsc(aviso ? t("ent.descanso_fin") : t("ent.descanso")) + "</span>" +
      '<strong class="sesion__descanso-reloj" data-descanso-reloj role="timer">' + (activo ? entrenoReloj(queda + 999) : "") + "</strong>" +
      '<span class="sesion__descanso-botones">' +
        '<button type="button" class="sesion__boton" data-accion="descanso-menos" aria-label="' + _sesionEsc(t("ent.descanso_menos")) + '">−15</button>' +
        '<button type="button" class="sesion__boton" data-accion="descanso-mas" aria-label="' + _sesionEsc(t("ent.descanso_mas")) + '">+15</button>' +
        '<button type="button" class="sesion__boton sesion__boton--fuerte" data-accion="descanso-saltar">' + _sesionEsc(t(aviso ? "ent.listo" : "ent.saltar")) + "</button>" +
      "</span>" +
    "</div>" +
    '<div class="sesion__descanso-barra" aria-hidden="true"><i data-descanso-barra></i></div>' +
  "</div>";
}

/** El texto del reloj de arriba: el tiempo sin pausas, y «En pausa» si lo está. */
function _sesionRelojTexto(sesion, ahora) {
  var tiempo = entrenoReloj(ahora - sesion.inicio - entrenoLogPausado(sesion, ahora));
  return typeof sesion.pausaDesde === "number" ? tFormat("ent.en_pausa", { tiempo: tiempo }) : tiempo;
}

/**
 * Toda la pantalla de una sesión. Sin DOM.
 * @param {object} opciones  { corrigiendo: true } para una sesión terminada que se corrige
 */
function entrenoSesionPantallaHtml(sesion, log, ahora, opciones) {
  var corrigiendo = !!(opciones && opciones.corrigiendo);
  var cuenta = _sesionContar(sesion);
  var pct = cuenta.total ? Math.round(cuenta.hechas / cuenta.total * 100) : 0;
  var sonido = entrenoSonidoOn();
  var pausada = typeof sesion.pausaDesde === "number";
  var meta = corrigiendo
    ? _sesionEsc(tFormat("ent.corrigiendo_meta", {
        fecha: typeof _progresoFecha === "function" ? _progresoFecha(sesion.inicio) : "",
        min: entrenoLogTotales(sesion).minutos
      }))
    : '<span class="sesion__reloj" data-reloj>' + _sesionEsc(_sesionRelojTexto(sesion, ahora)) + "</span>" +
      " · <span data-cuenta>" + _sesionEsc(tFormat("ent.series_hechas", cuenta)) + "</span>";
  var cabeza = '<header class="sesion__cabeza' + (corrigiendo ? " sesion__cabeza--corregir" : "") + '">' +
      '<button type="button" class="sesion__icono" data-accion="cerrar" data-foco="cerrar" aria-label="' +
        _sesionEsc(t(corrigiendo ? "ent.corregir_cancelar" : "ent.volver")) + '">' + SESION_ICONOS.atras + "</button>" +
      '<div class="sesion__titulos">' +
        (corrigiendo ? '<p class="sesion__ojo">' + _sesionEsc(t("ent.corregir_titulo")) + "</p>" : "") +
        '<h3 class="sesion__titulo" tabindex="-1" data-foco="titulo">' + _sesionEsc(_sesionNombre(sesion)) + "</h3>" +
        '<p class="sesion__meta">' + meta + "</p>" +
      "</div>" +
      (corrigiendo ? "" :
        '<button type="button" class="sesion__icono" data-accion="sonido" data-foco="sonido" aria-pressed="' + (sonido ? "true" : "false") + '"' +
          ' aria-label="' + _sesionEsc(t("ent.sonido")) + '">' + (sonido ? SESION_ICONOS.sonido : SESION_ICONOS.sinSonido) + "</button>") +
      (corrigiendo
        ? '<button type="button" class="sesion__terminar" data-accion="guardar-edicion" data-foco="guardar">' + _sesionEsc(t("ent.corregir_guardar")) + "</button>"
        : '<button type="button" class="sesion__terminar" data-accion="terminar" data-foco="terminar">' + _sesionEsc(t("ent.terminar")) + "</button>") +
      '<div class="sesion__progreso" aria-hidden="true"><i style="width:' + pct + '%"></i></div>' +
    "</header>";
  var pie = '<div class="sesion__pie">' +
      '<button type="button" class="btn-secondary" data-accion="anadir" data-foco="anadir">' + _sesionEsc(t("ent.anadir_ejercicio")) + "</button>" +
      (corrigiendo ? "" :
        '<button type="button" class="btn-secondary sesion__pausa" data-accion="pausa" data-foco="pausa" aria-pressed="' + (pausada ? "true" : "false") + '">' +
          (pausada ? SESION_ICONOS.seguir : SESION_ICONOS.pausa) + " " + _sesionEsc(t(pausada ? "ent.reanudar" : "ent.pausa")) + "</button>") +
      (corrigiendo
        ? '<button type="button" class="btn-secondary" data-accion="cerrar" data-foco="cancelar">' + _sesionEsc(t("ent.corregir_cancelar")) + "</button>"
        : '<button type="button" class="btn-secondary" data-accion="descartar" data-foco="descartar">' + _sesionEsc(t("ent.borrar_sesion")) + "</button>") +
      '<p class="sesion__nota">' + _sesionEsc(t("ent.tipo_ayuda")) + "</p>" +
      '<p class="sesion__nota">' + _sesionEsc(t("ent.guardado_local")) + "</p>" +
    "</div>";
  return cabeza +
    '<ol class="sesion__lista">' + sesion.ejercicios.map(function (e, i) { return _sesionEjercicioHtml(sesion, e, i, log, corrigiendo); }).join("") + "</ol>" +
    pie +
    (corrigiendo ? "" : _sesionDescansoHtml(sesion, ahora));
}

function _sesionTextoRecord(rec) {
  if (rec.tipo === "reps") {
    return rec.tiempo
      ? tFormat("ent.record_seg", { valor: tFormat("ent.segundos", { n: rec.reps }) })
      : tFormat("ent.record_reps", { valor: rec.reps });
  }
  return tFormat(rec.tipo === "kg" ? "ent.record_kg" : "ent.record_e1rm", { valor: entrenoKg(rec.kg) + " × " + rec.reps });
}

/** El resumen al terminar: tiempo, series, kilos movidos y récords. */
function entrenoResumenHtml(r) {
  var datos = [
    [t("ent.stat_tiempo"), r.minutos + " " + t("ent.min")],
    [t("ent.stat_series"), String(r.series)],
    [t("ent.stat_volumen"), entrenoMiles(r.volumen) + " " + t("ent.kg")],
    [t("ent.stat_records"), String(r.records.length)]
  ];
  var h = '<div class="sesion__resumen">' +
    (r.nombre ? '<p class="sesion__resumen-ojo">' + _sesionEsc(r.nombre) + "</p>" : "") +
    '<h3 class="sesion__resumen-titulo" tabindex="-1" data-foco="resumen">' + _sesionEsc(t("ent.resumen_titulo")) + "</h3>" +
    '<dl class="sesion__stats">' + datos.map(function (d) {
      return "<div><dt>" + _sesionEsc(d[0]) + "</dt><dd>" + _sesionEsc(d[1]) + "</dd></div>";
    }).join("") + "</dl>";
  if (r.records.length) {
    h += '<h4 class="sesion__resumen-sub">' + _sesionEsc(t("ent.records_nuevos")) + '</h4><ul class="sesion__records">' +
      r.records.map(function (rec) {
        return "<li><strong>" + _sesionEsc(entrenoNombre({ id: rec.id, name: rec.name })) + "</strong> " + _sesionEsc(_sesionTextoRecord(rec)) + "</li>";
      }).join("") + "</ul>";
  }
  return h + '<button type="button" class="sesion__terminar" data-accion="listo" data-foco="listo">' + _sesionEsc(t("ent.listo")) + "</button></div>";
}

// ── Sonido, vibración y pantalla encendida ──────────────────────────────

function entrenoSonidoOn() {
  try { return localStorage.getItem(ENTRENO_CLAVE_SONIDO) !== "0"; } catch (e) { return true; }
}

function entrenoSonidoPoner(on) {
  try { localStorage.setItem(ENTRENO_CLAVE_SONIDO, on ? "1" : "0"); } catch (e) { /* solo esta visita */ }
}

/** La vibración (al marcar una serie, al acabar el descanso, en los botones): se quita en «Perfil». */
function entrenoVibracionOn() {
  try { return localStorage.getItem(ENTRENO_CLAVE_VIBRACION) !== "0"; } catch (e) { return true; }
}

function entrenoVibracionPoner(on) {
  try { localStorage.setItem(ENTRENO_CLAVE_VIBRACION, on ? "1" : "0"); } catch (e) { /* solo esta visita */ }
}

/** El audio solo puede arrancar tras un toque: se prepara al marcar una serie. */
function _sesionPrepararAudio() {
  if (!entrenoSonidoOn()) return;
  try {
    var Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    if (!_sesionAudio) _sesionAudio = new Ctx();
    if (_sesionAudio.state === "suspended") _sesionAudio.resume();
  } catch (e) { _sesionAudio = null; }
}

/** Dos pitidos cortos y suaves. */
function _sesionPitido() {
  var a = _sesionAudio;
  if (!a || !entrenoSonidoOn()) return;
  try {
    [0, 0.24].forEach(function (desfase) {
      var o = a.createOscillator();
      var g = a.createGain();
      var t0 = a.currentTime + desfase;
      o.type = "sine";
      o.frequency.value = 880;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(0.28, t0 + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.18);
      o.connect(g);
      g.connect(a.destination);
      o.start(t0);
      o.stop(t0 + 0.2);
    });
  } catch (e) { /* sin audio: queda la vibración y el aviso en pantalla */ }
}

function _sesionVibrar(patron) {
  if (!entrenoVibracionOn()) return;
  try {
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") navigator.vibrate(patron);
  } catch (e) { /* sin vibración */ }
}

/** Pantalla encendida mientras se entrena (Wake Lock); si no existe, no pasa nada. */
function _sesionDespierta(activa) {
  try {
    if (activa) {
      if (_sesionWake || typeof navigator === "undefined" || !navigator.wakeLock) return;
      navigator.wakeLock.request("screen").then(function (w) {
        _sesionWake = w;
        w.addEventListener("release", function () { _sesionWake = null; });
      }).catch(function () { /* denegado o en segundo plano */ });
    } else if (_sesionWake) {
      var w = _sesionWake;
      _sesionWake = null;
      w.release().catch(function () {});
    }
  } catch (e) { /* sin Wake Lock */ }
}

// ── Reloj y descanso ────────────────────────────────────────────────────

function _sesionTodoHecho(sesion) {
  var c = _sesionContar(sesion);
  return 0 < c.total && c.hechas === c.total;
}

function _sesionEmpezarDescanso(ejercicio) {
  var ms = Math.max(0, Number(ejercicio.descanso) || 0) * 1000;
  if (!ms) return;
  _sesionLog.enCurso.descansoHasta = Date.now() + ms;
  _sesionDescansoTotal = ms;
  _sesionAvisoHasta = 0;
}

function _sesionFinDescanso(ahora) {
  _sesionAvisoHasta = ahora + 5000;
  _sesionVibrar([180, 90, 180]);
  _sesionPitido();
}

/** Cada cuarto de segundo: el reloj de la sesión y la cuenta atrás del descanso. */
function _sesionTic() {
  var caja = _sesionCaja();
  if (!caja || !_sesionLog || !_sesionLog.enCurso || _sesionResumen || _sesionEdicion) return;
  var panel = _sesionPanel();
  if (panel && panel.hidden) { entrenoSesionAlOcultar(); return; }
  var s = _sesionLog.enCurso;
  var ahora = Date.now();
  var reloj = caja.querySelector("[data-reloj]");
  if (reloj) {
    var texto = _sesionRelojTexto(s, ahora);
    if (reloj.textContent !== texto) reloj.textContent = texto;
  }
  var barra = caja.querySelector("[data-descanso]");
  if (!barra) return;
  var etiqueta = barra.querySelector("[data-descanso-etiqueta]");
  var cuenta = barra.querySelector("[data-descanso-reloj]");
  var relleno = barra.querySelector("[data-descanso-barra]");
  var saltar = barra.querySelector('[data-accion="descanso-saltar"]');
  var textoSaltar = t(!s.descansoHasta && ahora < _sesionAvisoHasta ? "ent.listo" : "ent.saltar");
  if (saltar && saltar.textContent !== textoSaltar) saltar.textContent = textoSaltar;
  if (s.descansoHasta) {
    var queda = s.descansoHasta - ahora;
    if (queda <= 0) {
      s.descansoHasta = null;
      entrenoLogGuardar(_sesionLog);
      _sesionFinDescanso(ahora);
      _sesionTic();
      return;
    }
    var total = Math.max(_sesionDescansoTotal, queda);
    barra.hidden = false;
    barra.classList.remove("is-fin");
    if (etiqueta && etiqueta.textContent !== t("ent.descanso")) etiqueta.textContent = t("ent.descanso");
    var restante = entrenoReloj(queda + 999);
    if (cuenta && cuenta.textContent !== restante) cuenta.textContent = restante;
    if (relleno) relleno.style.width = (queda / total * 100).toFixed(1) + "%";
  } else if (ahora < _sesionAvisoHasta) {
    barra.hidden = false;
    barra.classList.add("is-fin");
    if (etiqueta && etiqueta.textContent !== t("ent.descanso_fin")) etiqueta.textContent = t("ent.descanso_fin");
    if (cuenta) cuenta.textContent = "";
    if (relleno) relleno.style.width = "0%";
  } else {
    barra.hidden = true;
  }
}

function _sesionArrancarTic() {
  if (_sesionTicId === null && !_sesionEdicion) _sesionTicId = setInterval(_sesionTic, 250);
}

function _sesionPararTic() {
  if (_sesionTicId !== null) clearInterval(_sesionTicId);
  _sesionTicId = null;
}

// ── Pintar y actuar ─────────────────────────────────────────────────────

function _sesionPintar(foco) {
  var caja = _sesionCaja();
  if (!caja) return;
  if (_sesionResumen) {
    caja.innerHTML = entrenoResumenHtml(_sesionResumen);
  } else if (_sesionLog && _sesionLog.enCurso) {
    // La técnica que estaba abierta sigue abierta después de marcar una serie.
    var abiertas = Array.prototype.map.call(caja.querySelectorAll("details[data-tec][open]"), function (d) {
      return d.getAttribute("data-tec");
    });
    caja.innerHTML = entrenoSesionPantallaHtml(_sesionLog.enCurso, _sesionLog, Date.now(), { corrigiendo: !!_sesionEdicion });
    abiertas.forEach(function (n) {
      var d = caja.querySelector('details[data-tec="' + n + '"]');
      if (d) d.open = true;
    });
    _sesionMasAbierto = null;
    if (typeof entrenoAnimacionesActivar === "function") entrenoAnimacionesActivar(caja);
    _sesionTic();
  } else {
    entrenoSesionCerrar();
    return;
  }
  if (foco) _sesionEnfocar(foco);
}

function _sesionEnfocar(foco, desplazar) {
  var caja = _sesionCaja();
  var el = caja && caja.querySelector('[data-foco="' + foco + '"]');
  if (!el) return;
  try { el.focus({ preventScroll: !desplazar }); } catch (e) { el.focus(); }
  if (desplazar && typeof el.scrollIntoView === "function") el.scrollIntoView({ block: "center", behavior: "smooth" });
}

/** Guarda el diario. Al corregir una terminada no se guarda nada hasta «Guardar». */
function _sesionGuardar() {
  if (_sesionEdicion) { _sesionEdicion.cambios = true; return; }
  if (_sesionLog) entrenoLogGuardar(_sesionLog);
}

/** Lo escrito en las casillas de una serie pasa al diario (por si el evento input no llegó). */
function _sesionLeerCasillas(iEj, iSerie) {
  var caja = _sesionCaja();
  ["kg", "reps"].forEach(function (campo) {
    var input = caja && caja.querySelector('input[data-campo="' + campo + '"][data-ej="' + iEj + '"][data-serie="' + iSerie + '"]');
    if (!input) return;
    var cambio = {};
    cambio[campo] = input.value;
    entrenoLogPonerSerie(_sesionLog, iEj, iSerie, cambio);
  });
}

function _sesionMarcar(iEj, iSerie) {
  var s = _sesionLog.enCurso;
  var e = s.ejercicios[iEj];
  var serie = e && e.series[iSerie];
  if (!serie) return;
  _sesionLeerCasillas(iEj, iSerie);
  var hecha = !serie.hecha;
  if (hecha && !(0 < serie.reps)) {
    // Sin repeticiones no hay serie: se señala la casilla que falta.
    var reps = _sesionCaja().querySelector('input[data-campo="reps"][data-ej="' + iEj + '"][data-serie="' + iSerie + '"]');
    if (reps) {
      reps.classList.add("is-falta");
      reps.setAttribute("aria-invalid", "true");
      reps.focus();
    }
    return;
  }
  entrenoLogPonerSerie(_sesionLog, iEj, iSerie, { hecha: hecha }, Date.now());
  if (hecha && serie.kg !== null && serie.tipo !== "c") {
    // El peso de esta serie pasa a las siguientes de trabajo que aún no tienen: no hay que escribirlo tres veces.
    e.series.slice(iSerie + 1).forEach(function (x) { if (!x.hecha && x.kg === null && x.tipo !== "c") x.kg = serie.kg; });
  }
  var siguiente = { descanso: true, foco: null };
  if (hecha && typeof entrenoEditSiguiente === "function") siguiente = entrenoEditSiguiente(s, iEj, iSerie);
  if (!_sesionEdicion) {
    // Marcar una serie quita la pausa: se está entrenando.
    if (hecha && typeof s.pausaDesde === "number" && typeof entrenoEditPausa === "function") entrenoEditPausa(s, Date.now());
    _sesionPrepararAudio();
    _sesionVibrar(10);
    if (hecha && siguiente.descanso && !_sesionTodoHecho(s)) _sesionEmpezarDescanso(e);
    if (hecha && !siguiente.descanso) { s.descansoHasta = null; _sesionAvisoHasta = 0; }
  }
  _sesionGuardar();
  if (hecha && siguiente.foco) {
    _sesionPintar();
    _sesionEnfocar("check-" + siguiente.foco[0] + "-" + siguiente.foco[1], true);
  } else {
    _sesionPintar("check-" + iEj + "-" + iSerie);
  }
}

function _sesionAjustarDescanso(segundos) {
  var s = _sesionLog.enCurso;
  if (!s.descansoHasta) return;
  s.descansoHasta += segundos * 1000;
  if (0 < segundos) _sesionDescansoTotal += segundos * 1000;
  if (s.descansoHasta <= Date.now()) s.descansoHasta = Date.now() + 1000;
  _sesionGuardar();
  _sesionTic();
}

function _sesionSubirANube() {
  if (typeof pushWorkoutsToCloud === "function") pushWorkoutsToCloud();
}

function _sesionTerminar() {
  var s = _sesionLog.enCurso;
  var cuenta = _sesionContar(s);
  if (!cuenta.hechas) {
    if (!window.confirm(t("ent.confirmar_terminar_vacio"))) return;
    _sesionLog.enCurso = null;
    _sesionGuardar();
    entrenoSesionCerrar(_sesionDestino());
    return;
  }
  if (cuenta.hechas < cuenta.total && !window.confirm(t("ent.confirmar_terminar"))) return;
  var nombre = _sesionNombre(s);
  _sesionResumen = entrenoLogTerminar(_sesionLog, Date.now());
  if (_sesionResumen) _sesionResumen.nombre = nombre;
  _sesionGuardar();
  _sesionSubirANube();
  _sesionPararTic();
  _sesionDespierta(false);
  _sesionVibrar([30, 60, 30]);
  _sesionPintar("resumen");
  window.scrollTo(0, 0);
}

/** «Guardar» al corregir una terminada: el diario se lee de nuevo y solo cambia esa sesión. */
function _sesionGuardarEdicion() {
  var copia = _sesionLog.enCurso;
  var quedan = copia.ejercicios.some(function (e) { return e.series.some(function (x) { return x.hecha; }); });
  if (!quedan && !window.confirm(t("ent.confirmar_borrar_hist"))) return;
  var real = entrenoLogLeer();
  entrenoLogReemplazar(real, _sesionEdicion.id, copia, Date.now());
  entrenoLogGuardar(real);
  _sesionSubirANube();
  _sesionEdicion = null;
  _sesionLog = real;
  entrenoSesionCerrar("progreso");
}

/**
 * Lo que necesita un ejercicio nuevo (series, repeticiones y descanso del
 * plan, según el objetivo y el nivel): entrenoPautaPara, en js/ui/render-entreno.js.
 */
function _sesionPauta(id) {
  return typeof entrenoPautaPara === "function" ? entrenoPautaPara(id) : null;
}

function _sesionIdsEnSesion() {
  return _sesionLog.enCurso.ejercicios.map(function (e) { return e.id; });
}

/** «Sustituir»: el catálogo con lo parecido primero; al elegir, cambia el ejercicio (y, si se marca, en el programa). */
function _sesionSustituir(iEj) {
  var s = _sesionLog.enCurso;
  var e = s.ejercicios[iEj];
  if (!e || typeof entrenoCatalogoAbrir !== "function") return;
  var enPrograma = !_sesionEdicion && typeof entrenoProgramaTiene === "function" && entrenoProgramaTiene(e.id);
  entrenoCatalogoAbrir({
    modo: "elegir",
    titulo: tFormat("ent.cat_sustituir_titulo", { nombre: entrenoNombre({ id: e.id, name: e.name }) }),
    parecidoA: e.id,
    excluir: _sesionIdsEnSesion(),
    casilla: enPrograma ? { texto: t("ent.cat_tambien_programa"), marcada: false } : null,
    alElegir: function (id, tambienPrograma) {
      var pauta = _sesionPauta(id);
      if (!pauta) return;
      if (typeof entrenoEditTieneHechas === "function" && entrenoEditTieneHechas(s, iEj) &&
          !window.confirm(t("ent.confirmar_sustituir"))) return;
      pauta.sets = e.series.filter(function (x) { return x.tipo !== "c"; }).length || e.series.length;
      var viejo = e.id;
      if (!entrenoEditSustituir(s, iEj, pauta, _sesionLog)) return;
      if (tambienPrograma && typeof entrenoProgramaCambiar === "function") entrenoProgramaCambiar(viejo, id);
      _sesionGuardar();
      _sesionPintar();
      _sesionEnfocar("check-" + iEj + "-0", true);
    }
  });
}

/** «Añadir ejercicio»: el catálogo; al elegir, va al final de la sesión. */
function _sesionAnadir() {
  if (typeof entrenoCatalogoAbrir !== "function") return;
  var s = _sesionLog.enCurso;
  entrenoCatalogoAbrir({
    modo: "elegir",
    titulo: t("ent.cat_anadir_titulo"),
    excluir: _sesionIdsEnSesion(),
    alElegir: function (id) {
      var pauta = _sesionPauta(id);
      if (!pauta || !entrenoEditAnadir(s, pauta, _sesionLog)) return;
      _sesionGuardar();
      _sesionPintar();
      _sesionEnfocar("check-" + (s.ejercicios.length - 1) + "-0", true);
    }
  });
}

function _sesionAccion(accion, boton) {
  var iEj = Number(boton.getAttribute("data-ej"));
  var iSerie = Number(boton.getAttribute("data-serie"));
  if (accion === "listo") { _sesionResumen = null; entrenoSesionCerrar(_sesionDestino()); return; }
  if (accion === "cerrar") {
    if (_sesionEdicion && _sesionEdicion.cambios && !window.confirm(t("ent.corregir_descartar"))) return;
    var destino = _sesionDestino();
    _sesionEdicion = null;
    entrenoSesionCerrar(destino);
    return;
  }
  if (!_sesionLog || !_sesionLog.enCurso) return;
  var s = _sesionLog.enCurso;
  if (accion === "tecnica") {
    // La animación pequeña abre (o cierra) la técnica con la grande.
    var d = _sesionCaja().querySelector('details[data-tec="' + iEj + '"]');
    if (d) {
      d.open = !d.open;
      if (d.open && typeof d.scrollIntoView === "function") d.scrollIntoView({ block: "nearest" });
    }
    return;
  }
  if (accion === "check") _sesionMarcar(iEj, iSerie);
  else if (accion === "mas") { if (entrenoLogAnadirSerie(_sesionLog, iEj)) { _sesionGuardar(); _sesionPintar("mas-" + iEj); } }
  else if (accion === "menos") { if (entrenoLogQuitarSerie(_sesionLog, iEj)) { _sesionGuardar(); _sesionPintar("menos-" + iEj); } }
  else if (accion === "tipo") {
    _sesionLeerCasillas(iEj, iSerie);
    if (entrenoEditTipo(s, iEj, iSerie) !== null) { _sesionGuardar(); _sesionPintar("tipo-" + iEj + "-" + iSerie); }
  }
  else if (accion === "sustituir") _sesionSustituir(iEj);
  else if (accion === "anadir") _sesionAnadir();
  else if (accion === "calentar") {
    var n = entrenoEditCalentamiento(s, iEj, entrenoEditUsaBarra(s.ejercicios[iEj].id));
    if (n) { _sesionGuardar(); _sesionPintar("check-" + iEj + "-0"); }
  }
  else if (accion === "superserie") {
    if (entrenoEditSuperserie(s, iEj)) { _sesionGuardar(); _sesionPintar("check-" + iEj + "-0"); }
  }
  else if (accion === "subir" || accion === "bajar") {
    var paso = accion === "subir" ? -1 : 1;
    if (entrenoEditMover(s, iEj, paso)) {
      _sesionGuardar();
      _sesionMasAbierto = iEj + paso;
      var abierto = _sesionMasAbierto;
      _sesionPintar();
      _sesionMasAbierto = null;
      var menu = _sesionCaja().querySelector('details[data-mas="' + abierto + '"]');
      if (menu) menu.open = true;
      var boton2 = _sesionCaja().querySelector('[data-foco="' + accion + "-" + abierto + '"]') ||
        _sesionCaja().querySelector('[data-foco="' + (accion === "subir" ? "bajar" : "subir") + "-" + abierto + '"]');
      if (boton2) {
        try { boton2.focus({ preventScroll: false }); } catch (e) { boton2.focus(); }
        if (typeof boton2.scrollIntoView === "function") boton2.scrollIntoView({ block: "nearest" });
      }
    }
  }
  else if (accion === "saltar") {
    if (entrenoEditSaltar(s, iEj, !s.ejercicios[iEj].saltado)) { _sesionGuardar(); _sesionPintar("saltar-" + iEj); }
  }
  else if (accion === "quitar") {
    if (entrenoEditQuitar(s, iEj)) { _sesionGuardar(); _sesionPintar("anadir"); }
  }
  else if (accion === "pausa") { entrenoEditPausa(s, Date.now()); _sesionGuardar(); _sesionPintar("pausa"); }
  else if (accion === "terminar") _sesionTerminar();
  else if (accion === "guardar-edicion") _sesionGuardarEdicion();
  else if (accion === "descartar") entrenoSesionDescartar();
  else if (accion === "sonido") { entrenoSonidoPoner(!entrenoSonidoOn()); _sesionPrepararAudio(); _sesionPintar("sonido"); }
  else if (accion === "descanso-menos") _sesionAjustarDescanso(-ENTRENO_DESCANSO_PASO_S);
  else if (accion === "descanso-mas") _sesionAjustarDescanso(ENTRENO_DESCANSO_PASO_S);
  else if (accion === "descanso-saltar") {
    _sesionLog.enCurso.descansoHasta = null;
    _sesionAvisoHasta = 0;
    _sesionGuardar();
    _sesionTic();
  }
}

// ── Lo que usa el resto de la pantalla ──────────────────────────────────

function _sesionMostrarPantalla() {
  var panel = _sesionPanel();
  var caja = _sesionCaja();
  if (!panel || !caja) return false;
  panel.classList.add("is-sesion");
  document.body.classList.add("modo-sesion");
  caja.hidden = false;
  // Con la barra de secciones (js/ui/entreno-pestanas.js), esta pantalla es «Entrenar».
  if (typeof entrenoPestanaMarcar === "function") entrenoPestanaMarcar("sesion", true);
  _sesionPintar("titulo");
  window.scrollTo(0, 0);
  return true;
}

/** Abre la sesión en curso (o el resumen recién terminado). false si no hay nada que abrir. */
function entrenoSesionAbrir(log) {
  _sesionEdicion = null;
  _sesionLog = log || entrenoLogLeer();
  if (!_sesionLog.enCurso && !_sesionResumen) return false;
  if (!_sesionMostrarPantalla()) return false;
  _sesionArrancarTic();
  _sesionDespierta(true);
  return true;
}

/**
 * Abre una sesión TERMINADA para corregirla. Se trabaja sobre una copia,
 * metida en un diario de mentira cuyo historial es el de antes de ella (para
 * «la última vez» y los récords); el diario de verdad no se toca hasta «Guardar».
 */
function entrenoSesionCorregir(id) {
  var real = entrenoLogLeer();
  var original = real.sesiones.filter(function (s) { return s.id === id; })[0];
  if (!original) return false;
  var copia = JSON.parse(JSON.stringify(original));
  copia.descansoHasta = null;
  _sesionResumen = null;
  _sesionEdicion = { id: id, cambios: false };
  _sesionLog = {
    v: 1,
    sesiones: real.sesiones.filter(function (s) { return s.inicio < original.inicio; }),
    enCurso: copia,
    borradas: []
  };
  _sesionPararTic();
  return _sesionMostrarPantalla();
}

/** Empieza una sesión del plan. Si ya hay otra sin terminar, pregunta antes de sustituirla. */
function entrenoSesionEmpezar(sesionPlan, semana) {
  if (!sesionPlan || !Array.isArray(sesionPlan.exercises) || !sesionPlan.exercises.length) return false;
  var log = entrenoLogLeer();
  if (log.enCurso && !window.confirm(t("ent.confirmar_reemplazar"))) return false;
  entrenoLogIniciar(log, sesionPlan, semana, Date.now());
  entrenoLogGuardar(log);
  _sesionResumen = null;
  _sesionAvisoHasta = 0;
  return entrenoSesionAbrir(log);
}

/**
 * Vuelve al plan. La sesión, si la hay, sigue en curso y el panel ofrece continuarla.
 * Con la barra de secciones, `destino` es la sección a la que se vuelve; sin
 * él se queda la que haya (es lo que pasa cuando se toca otra en la barra).
 */
function entrenoSesionCerrar(destino) {
  _sesionPararTic();
  _sesionDespierta(false);
  _sesionResumen = null;
  _sesionEdicion = null;
  var panel = _sesionPanel();
  if (panel) panel.classList.remove("is-sesion");
  document.body.classList.remove("modo-sesion");
  var caja = _sesionCaja();
  if (caja) {
    caja.hidden = true;
    caja.innerHTML = "";
  }
  if (typeof renderEntreno === "function") renderEntreno();
  if (destino && typeof entrenoPestanaMarcar === "function") entrenoPestanaMarcar(destino, true);
  window.scrollTo(0, 0);
}

/** Adónde se vuelve al cerrar: al historial si se corregía una terminada; si no, a la sección de antes. */
function _sesionDestino() {
  if (_sesionEdicion) return "progreso";
  return typeof entrenoPestanaAnterior === "function" ? entrenoPestanaAnterior() : null;
}

/**
 * Irse de la pantalla a otra sección (js/ui/entreno-pestanas.js). La sesión en
 * curso sigue; corrigiendo una terminada con cambios, pregunta antes.
 * @returns {boolean} false si el usuario prefiere quedarse
 */
function entrenoSesionSalir() {
  if (!_sesionAbierta()) return true;
  if (_sesionEdicion && _sesionEdicion.cambios && !window.confirm(t("ent.corregir_descartar"))) return false;
  _sesionEdicion = null;
  entrenoSesionCerrar();
  return true;
}

/** Borra la sesión en curso, si el usuario lo confirma. */
function entrenoSesionDescartar() {
  var log = (!_sesionEdicion && _sesionLog) || entrenoLogLeer();
  if (!log.enCurso) return false;
  if (!window.confirm(t("ent.confirmar_borrar"))) return false;
  log.enCurso = null;
  entrenoLogGuardar(log);
  _sesionLog = log;
  if (_sesionAbierta()) entrenoSesionCerrar(_sesionDestino());
  else if (typeof renderEntreno === "function") renderEntreno();
  return true;
}

function entrenoSesionAlMostrar() {
  if (!_sesionAbierta()) return;
  document.body.classList.add("modo-sesion");
  _sesionPintar();
  if (!_sesionResumen && !_sesionEdicion) {
    _sesionArrancarTic();
    _sesionDespierta(true);
  }
}

function entrenoSesionAlOcultar() {
  _sesionPararTic();
  _sesionDespierta(false);
  document.body.classList.remove("modo-sesion");
}

function entrenoSesionRepintar() {
  if (_sesionAbierta()) _sesionPintar();
}

function initEntrenoSesion() {
  var caja = _sesionCaja();
  if (!caja || _sesionCableado) return;
  _sesionCableado = true;
  caja.addEventListener("click", function (ev) {
    var boton = ev.target.closest("[data-accion]");
    if (boton && caja.contains(boton)) _sesionAccion(boton.getAttribute("data-accion"), boton);
  });
  caja.addEventListener("input", function (ev) {
    if (!_sesionLog || !_sesionLog.enCurso) return;
    var nota = ev.target.closest("textarea[data-nota]");
    if (nota) {
      // La nota se guarda al escribir, sin repintar (el cursor no salta), y
      // la línea «Nota: …» bajo el nombre se cambia ahí mismo.
      var iNota = Number(nota.getAttribute("data-nota"));
      entrenoEditNota(_sesionLog.enCurso, iNota, nota.value);
      _sesionGuardar();
      var linea = caja.querySelector('[data-nota-hoy="' + iNota + '"]');
      var ej = _sesionLog.enCurso.ejercicios[iNota];
      if (linea && ej) {
        linea.hidden = !ej.nota;
        linea.textContent = ej.nota ? tFormat("ent.nota_hoy", { nota: ej.nota }) : "";
      }
      return;
    }
    var campo = ev.target.closest("input[data-campo]");
    if (!campo) return;
    campo.classList.remove("is-falta");
    campo.removeAttribute("aria-invalid");
    var cambio = {};
    cambio[campo.getAttribute("data-campo")] = campo.value;
    entrenoLogPonerSerie(_sesionLog, Number(campo.getAttribute("data-ej")), Number(campo.getAttribute("data-serie")), cambio);
    _sesionGuardar();
  });
  // «Intro» en una casilla pasa a la siguiente, como en un formulario de gimnasio.
  caja.addEventListener("keydown", function (ev) {
    if (ev.key !== "Enter") return;
    var campo = ev.target.closest("input[data-campo]");
    if (!campo) return;
    ev.preventDefault();
    var campos = Array.prototype.slice.call(caja.querySelectorAll("input[data-campo]"));
    var siguiente = campos[campos.indexOf(campo) + 1];
    if (siguiente) siguiente.focus();
    else campo.blur();
  });
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "visible" && _sesionAbierta() && !_sesionResumen && !_sesionEdicion) {
      _sesionDespierta(true);
      _sesionTic();
    }
  });
}
