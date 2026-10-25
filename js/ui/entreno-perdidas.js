/**
 * js/ui/entreno-perdidas.js
 * ─────────────────────────────────────────────────────────────────────────
 * SESIONES SALTADAS (2026-10-25). La hoja de ruta del dueño, etapa 2,
 * «Reajustar tras saltarse una sesión»: si una sesión que tocaba un día ya
 * pasado de esta semana no se hizo, «Inicio» lo dice y ofrece hacerla hoy
 * («Сделать сегодня», data-empezar de render-entreno.js) o dejarla
 * («Не переносить», solo esta semana). La semana no se cambia sola: la app
 * propone, el usuario decide (la regla 8 de la propuesta de diseño).
 *
 * Cuándo es «saltada»: del lunes a ayer, las sesiones del plan con
 * ejercicios, menos las que se hicieron esta semana (cualquier día, hoy
 * incluido: hacer el martes la del lunes cuenta). Se casan por la clave con
 * la que se apuntan en el diario (la del tipo, o «~Nombre» con nombre propio),
 * de la más temprana a la más tardía. No cuentan:
 *   - los días anteriores al último cambio del programa de esta semana
 *     (prefs.t): esos días el plan era otro;
 *   - nada, si el diario está vacío: aún no ha empezado.
 *
 * Expone (globales):
 *   entrenoPerdidasDatos(plan, log, ahora, desde)  las saltadas, sin DOM (lo prueban los tests)
 *   entrenoPerdidaHtml(perdidas)                    la tarjeta de «Inicio», sin DOM
 *   entrenoPerdidasOcultas(ahora) / entrenoPerdidaOcultar(instancia, ahora)
 *   renderEntrenoPerdidas(plan, log, prefs)         pinta #entrenoPerdida; devuelve las saltadas
 *   initEntrenoPerdidas()                           cablea «Не переносить» (una vez)
 * ─────────────────────────────────────────────────────────────────────────
 */

var ENTRENO_CLAVE_PERDIDAS = "nutritionPlanner.entrenoPerdidas.v1";
var _perdidasCableado = false;

function _perdEsc(texto) { return escapeHtml(String(texto)); }

/** Lunes 00:00 de la semana de ese instante. */
function _perdLunes(ms) {
  if (typeof entrenoLogInicioSemana === "function") return entrenoLogInicioSemana(ms);
  var d = new Date(ms);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - ((d.getDay() + 6) % 7)).getTime();
}

/** Con la que se apunta en el diario (entrenoLogIniciar): la del tipo, o «~Nombre». */
function _perdClave(s) {
  return s.nombrePropio ? "~" + String(s.name).slice(0, 39) : s.key;
}

/**
 * Las sesiones saltadas de esta semana, de la más reciente a la más antigua.
 * @param {number} [desde]  ms del último cambio del programa: los días de antes no cuentan
 * @returns {{indice:number, sesion:object, dia:number, fecha:number}[]}
 */
function entrenoPerdidasDatos(plan, log, ahora, desde) {
  if (!plan || !plan.ok || !log || !log.sesiones || !log.sesiones.length) return [];
  var lunes = _perdLunes(ahora);
  var hoy = ((new Date(ahora).getDay() + 6) % 7) + 1;
  var hechas = [];
  log.sesiones.forEach(function (s) {
    if (lunes <= s.inicio && s.inicio <= ahora) hechas.push(s.clave);
  });
  var previstas = [];
  plan.sesiones.forEach(function (s, i) {
    if (!s.exercises || !s.exercises.length || !(s.dia <= hoy)) return;
    previstas.push({ indice: i, sesion: s, dia: s.dia });
  });
  previstas.sort(function (a, b) { return a.dia - b.dia; });
  var perdidas = [];
  previstas.forEach(function (p) {
    var k = hechas.indexOf(_perdClave(p.sesion));
    if (k !== -1) { hechas.splice(k, 1); return; }
    if (p.dia === hoy) return;
    var fecha = new Date(new Date(lunes).getFullYear(), new Date(lunes).getMonth(), new Date(lunes).getDate() + p.dia - 1).getTime();
    // El día terminó antes del último cambio del programa: entonces tocaba otra cosa.
    if (typeof desde === "number" && fecha + 24 * 3600 * 1000 <= desde) return;
    perdidas.push({ indice: p.indice, sesion: p.sesion, dia: p.dia, fecha: fecha });
  });
  return perdidas.reverse();
}

function _perdFecha(ms) {
  var lang = typeof getLang === "function" ? getLang() : "es";
  var locale = (typeof LANG_LOCALES !== "undefined" && LANG_LOCALES[lang]) || "es-ES";
  try {
    return new Date(ms).toLocaleDateString(locale, { weekday: "long", day: "numeric", month: "long" });
  } catch (e) {
    return t("ent.dia_" + (((new Date(ms).getDay() + 6) % 7) + 1));
  }
}

function _perdNombre(s) {
  return typeof entrenoNombreSesion === "function" ? entrenoNombreSesion(s) : s.name;
}

/** La tarjeta: la saltada más reciente, con «Сделать сегодня» y «Не переносить». "" si no hay. */
function entrenoPerdidaHtml(perdidas) {
  if (!perdidas || !perdidas.length) return "";
  var p = perdidas[0];
  var h = '<p class="entreno__tarjeta-ojo">' + _perdEsc(t("ent.perdida_ojo")) + "</p>" +
    '<h3 class="entreno__tarjeta-titulo">' + _perdEsc(_perdNombre(p.sesion)) + "</h3>" +
    '<p class="entreno__tarjeta-datos">' + _perdEsc(tFormat("ent.perdida_texto", { fecha: _perdFecha(p.fecha) })) + "</p>";
  if (1 < perdidas.length) {
    h += '<p class="entreno__tarjeta-datos">' + _perdEsc(tFormat("ent.perdida_mas", { n: perdidas.length - 1 })) + "</p>";
  }
  return h + '<div class="entreno__perdida-botones">' +
    '<button type="button" class="entreno__empezar" data-empezar="' + p.indice + '">' + _perdEsc(t("ent.perdida_hacer")) + "</button>" +
    '<button type="button" class="btn-secondary" data-perdida-ocultar="' + _perdEsc(p.sesion.instancia || p.sesion.key) + '">' + _perdEsc(t("ent.perdida_dejar")) + "</button>" +
  "</div>";
}

/** Las que se dejaron («Не переносить») esta semana; las de otra semana ya no valen. */
function entrenoPerdidasOcultas(ahora) {
  try {
    var g = JSON.parse(localStorage.getItem(ENTRENO_CLAVE_PERDIDAS) || "null");
    if (g && g.semana === _perdLunes(ahora) && Array.isArray(g.ocultas)) {
      return g.ocultas.filter(function (x) { return typeof x === "string" && x.length <= 40; });
    }
  } catch (e) { /* sin almacenamiento: no hay ninguna dejada */ }
  return [];
}

function entrenoPerdidaOcultar(instancia, ahora) {
  var ocultas = entrenoPerdidasOcultas(ahora);
  if (ocultas.indexOf(instancia) === -1) ocultas.push(instancia);
  try {
    localStorage.setItem(ENTRENO_CLAVE_PERDIDAS, JSON.stringify({ semana: _perdLunes(ahora), ocultas: ocultas.slice(-14) }));
  } catch (e) { /* solo esta visita */ }
}

/**
 * Pinta la tarjeta de «Inicio» (sin las dejadas) y devuelve TODAS las saltadas
 * (para marcar la semana y «Entrenar»).
 */
function renderEntrenoPerdidas(plan, log, prefs) {
  var ahora = Date.now();
  var desde = prefs && prefs.t && _perdLunes(ahora) <= prefs.t ? prefs.t : undefined;
  var perdidas = entrenoPerdidasDatos(plan, log, ahora, desde);
  var caja = document.getElementById("entrenoPerdida");
  if (caja) {
    var ocultas = entrenoPerdidasOcultas(ahora);
    var html = entrenoPerdidaHtml(perdidas.filter(function (p) { return ocultas.indexOf(p.sesion.instancia || p.sesion.key) === -1; }));
    caja.innerHTML = html;
    caja.hidden = !html;
  }
  return perdidas;
}

function initEntrenoPerdidas() {
  var caja = document.getElementById("entrenoPerdida");
  if (!caja || _perdidasCableado) return;
  _perdidasCableado = true;
  caja.addEventListener("click", function (ev) {
    var dejar = ev.target.closest("[data-perdida-ocultar]");
    if (!dejar) return;
    entrenoPerdidaOcultar(dejar.getAttribute("data-perdida-ocultar"), Date.now());
    if (typeof renderEntreno === "function") renderEntreno();
    // Se va la tarjeta: el foco pasa a lo siguiente de «Inicio».
    var semana = document.getElementById("entrenoSemanaTitulo");
    if (semana) {
      semana.setAttribute("tabindex", "-1");
      try { semana.focus({ preventScroll: true }); } catch (e) { semana.focus(); }
    }
  });
}
