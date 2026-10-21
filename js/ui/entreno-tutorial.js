/**
 * js/ui/entreno-tutorial.js
 * ─────────────────────────────────────────────────────────────────────────
 * TUTORIAL DEL PANEL DE ENTRENAMIENTOS (2026-10-18). Cinco pasos cortos que
 * explican el recorrido; desde el 2026-10-21 siguen las cinco secciones de la
 * barra (Inicio, anotar series en «Entrenar», cambiar sobre la marcha, Plan,
 * Progreso y Perfil). Sale solo la primera vez
 * que hay programa, y luego con «Cómo se usa». Es un <dialog> aparte del
 * recorrido general (js/ui/tour.js), que no se toca.
 *
 * Lo visto se guarda en este navegador (ENTRENO_TUT_CLAVE). No hace falta que
 * viaje a la cuenta: es una cosa que se ve una vez por dispositivo.
 *
 * Expone (globales):
 *   ENTRENO_TUT_PASOS, ENTRENO_TUT_CLAVE
 *   entrenoTutorialHtml(paso)       marcado del paso (sin DOM; lo prueban los tests)
 *   entrenoTutorialAbrir(paso?)     abre el tutorial en ese paso
 *   entrenoTutorialAuto()           lo abre si nunca se vio (lo llama renderEntreno)
 *   initEntrenoTutorial()           cablea los botones (una vez)
 * ─────────────────────────────────────────────────────────────────────────
 */

var ENTRENO_TUT_PASOS = 5;
var ENTRENO_TUT_CLAVE = "nutritionPlanner.entrenoTutorial.v1";
var _tutPaso = 0;
var _tutCableado = false;

/** Una ilustración sencilla por paso (trazos, sin emojis). */
var ENTRENO_TUT_ILUSTRACIONES = [
  '<svg viewBox="0 0 48 48" aria-hidden="true" focusable="false"><path d="M9 24h30M24 9l15 15-15 15" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  '<svg viewBox="0 0 48 48" aria-hidden="true" focusable="false"><path d="M10 25l9 9 19-20" fill="none" stroke="currentColor" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  '<svg viewBox="0 0 48 48" aria-hidden="true" focusable="false"><circle cx="12" cy="24" r="4" fill="currentColor"/><circle cx="24" cy="24" r="4" fill="currentColor"/><circle cx="36" cy="24" r="4" fill="currentColor"/></svg>',
  '<svg viewBox="0 0 48 48" aria-hidden="true" focusable="false"><rect x="9" y="11" width="30" height="28" rx="4" fill="none" stroke="currentColor" stroke-width="3.2"/><path d="M9 20h30M17 7v8M31 7v8" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round"/></svg>',
  '<svg viewBox="0 0 48 48" aria-hidden="true" focusable="false"><path d="M8 36V24M18 36V16M28 36V21M38 36V10" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round"/></svg>'
];

function _tutEsc(texto) { return escapeHtml(String(texto)); }

/** El marcado de un paso: ilustración, título, texto, puntos y botones. Sin DOM. */
function entrenoTutorialHtml(paso) {
  var n = Math.max(0, Math.min(ENTRENO_TUT_PASOS - 1, Math.floor(Number(paso)) || 0));
  var ultimo = n === ENTRENO_TUT_PASOS - 1;
  var puntos = "";
  for (var i = 0; i < ENTRENO_TUT_PASOS; i++) {
    puntos += '<i class="tut__punto' + (i === n ? " is-on" : "") + '" aria-hidden="true"></i>';
  }
  return '<div class="tut-dialogo__cuerpo" data-tut-paso="' + n + '">' +
    '<div class="tut__ilustracion" aria-hidden="true">' + ENTRENO_TUT_ILUSTRACIONES[n] + "</div>" +
    '<p class="tut__contador">' + _tutEsc(tFormat("ent.tut_paso", { n: n + 1, total: ENTRENO_TUT_PASOS })) + "</p>" +
    '<h3 class="tut__titulo">' + _tutEsc(t("ent.tut" + (n + 1) + "_t")) + "</h3>" +
    '<p class="tut__texto">' + _tutEsc(t("ent.tut" + (n + 1) + "_x")) + "</p>" +
    '<div class="tut__puntos">' + puntos + "</div>" +
    '<div class="tut__botones">' +
      (n > 0
        ? '<button type="button" class="btn-secondary" data-tut="atras">' + _tutEsc(t("ent.tut_atras")) + "</button>"
        : '<span></span>') +
      (ultimo
        ? '<button type="button" class="entreno__empezar" data-tut="fin">' + _tutEsc(t("ent.tut_fin")) + "</button>"
        : '<button type="button" class="entreno__empezar" data-tut="siguiente">' + _tutEsc(t("ent.tut_siguiente")) + "</button>") +
    "</div>" +
  "</div>";
}

function _tutDialogo() { return document.getElementById("entTutDialogo"); }

function _tutPintar(foco) {
  var cuerpo = document.getElementById("entTutCuerpo");
  if (!cuerpo) return;
  cuerpo.innerHTML = entrenoTutorialHtml(_tutPaso);
  if (foco) {
    var el = cuerpo.querySelector(foco);
    if (el) { try { el.focus({ preventScroll: true }); } catch (e) { el.focus(); } }
  }
}

/** Abre el tutorial en un paso (0 si no se dice). */
function entrenoTutorialAbrir(paso) {
  var dialogo = _tutDialogo();
  if (!dialogo) return;
  _tutPaso = Math.max(0, Math.min(ENTRENO_TUT_PASOS - 1, Math.floor(Number(paso)) || 0));
  _tutPintar();
  if (typeof dialogo.showModal === "function") { if (!dialogo.open) dialogo.showModal(); }
  else dialogo.setAttribute("open", "");
}

/** Lo visto, en este navegador. Sin almacenamiento, se vuelve a ver: no es grave. */
function _tutVisto() {
  try { return localStorage.getItem(ENTRENO_TUT_CLAVE) === "1"; } catch (e) { return false; }
}

function _tutMarcarVisto() {
  try { localStorage.setItem(ENTRENO_TUT_CLAVE, "1"); } catch (e) { /* solo esta visita */ }
}

/** La primera vez que hay programa, el tutorial se abre solo (y no se repite). */
function entrenoTutorialAuto() {
  var dialogo = _tutDialogo();
  if (!dialogo || _tutVisto() || dialogo.open) return;
  var panel = document.getElementById("entrenoPanel");
  if (!panel || panel.hidden || panel.classList.contains("is-cuestionario")) return;
  entrenoTutorialAbrir(0);
}

function _tutCerrar() {
  var dialogo = _tutDialogo();
  if (!dialogo) return;
  _tutMarcarVisto();
  if (typeof dialogo.close === "function" && dialogo.open) dialogo.close();
  else dialogo.removeAttribute("open");
}

function initEntrenoTutorial() {
  var dialogo = _tutDialogo();
  var cuerpo = document.getElementById("entTutCuerpo");
  if (!dialogo || !cuerpo || _tutCableado) return;
  _tutCableado = true;
  var cerrar = document.getElementById("entTutCerrar");
  if (cerrar) cerrar.addEventListener("click", _tutCerrar);
  dialogo.addEventListener("close", _tutMarcarVisto);
  cuerpo.addEventListener("click", function (ev) {
    var boton = ev.target.closest("[data-tut]");
    if (!boton) return;
    var accion = boton.getAttribute("data-tut");
    if (accion === "siguiente") { _tutPaso++; _tutPintar("[data-tut='siguiente']"); }
    else if (accion === "atras") { _tutPaso--; _tutPintar("[data-tut='atras']"); }
    else if (accion === "fin") _tutCerrar();
  });
  var ayuda = document.getElementById("entTutorial");
  if (ayuda) ayuda.addEventListener("click", function () { entrenoVibrar(); entrenoTutorialAbrir(0); });
}
