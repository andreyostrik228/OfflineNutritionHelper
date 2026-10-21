/**
 * js/ui/entreno-pestanas.js
 * ─────────────────────────────────────────────────────────────────────────
 * Las CINCO SECCIONES del panel de entrenamientos, con su barra abajo
 * (2026-10-21). Es la estructura que pidió el dueño el 2026-10-18 («пять
 * основных разделов с нижней навигацией»):
 *   inicio    lo que toca hoy, la semana, la última sesión y un récord
 *   plan      «Tu programa», el plan por días, el catálogo y el calendario
 *   sesion    la sesión en marcha; sin ella, la de hoy y las demás para elegir
 *   progreso  las cifras, las gráficas, el historial y el peso
 *   perfil    las respuestas del cuestionario, sonido y vibración, el
 *             tutorial, la copia de los datos y si se guarda en la cuenta
 *
 * Cómo: cada bloque del panel lleva en el HTML `data-en` con las secciones en
 * que sale ("inicio sesion"), y el panel dice cuál está abierta con
 * `data-pestana`; el CSS esconde los demás. Lo de dentro de cada bloque lo
 * siguen poniendo y quitando sus dueños con `hidden`, como antes.
 *
 * La pantalla de una sesión (js/ui/entreno-sesion.js, clase `is-sesion` en el
 * panel) ES la sección «Entrenar»: al abrirse marca la sección
 * (entrenoPestanaMarcar) y, si se va a otra, se cierra como con la flecha; la
 * sesión sigue en curso. Corrigiendo una terminada, irse pregunta si hay
 * cambios sin guardar (entrenoSesionSalir).
 *
 * A diferencia de las pestañas del menú (js/ui/pestanas.js), esta barra sale
 * en cualquier ancho: el panel de entrenamientos es de una sola columna
 * también en el portátil. Usa las mismas clases (.tabbar, .tabbar__btn), así
 * que cada aspecto la viste como la del menú.
 *
 * Mejora progresiva: sin este fichero el panel es una página larga, como
 * antes (solo se pierde el bloque «Perfil», que nace escondido).
 *
 * Expone (globales):
 *   ENTRENO_PESTANAS, ENTRENO_CLAVE_PESTANA
 *   initEntrenoPestanas()        crea la barra (una vez; lo llama initEntreno)
 *   entrenoPestanaIr(id)         lo que hace un toque en la barra
 *   entrenoPestanaMarcar(id, sinDesplazar)  solo cambia la sección
 *   entrenoPestanaActual()       la sección abierta, o null sin barra
 *   entrenoPestanaAnterior()     la última sección que no era «Entrenar»
 *   entrenoPestanaValida(id)     el id si es una sección; si no, "inicio" (sin DOM)
 *   entrenoPerfilPintar()        repinta lo que cambia en «Perfil»
 * ─────────────────────────────────────────────────────────────────────────
 */

/** Las secciones, en el orden de la barra. «Entrenar», en medio, es el camino corto a la sesión. */
var ENTRENO_PESTANAS = [
  { id: "inicio", icono: "icon-home", clave: "ent.pestana_inicio", titulo: "ent.titulo_inicio" },
  { id: "plan", icono: "icon-calendar", clave: "ent.pestana_plan", titulo: "ent.titulo_plan" },
  { id: "sesion", icono: "icon-dumbbell", clave: "ent.pestana_sesion", titulo: "ent.titulo_sesion", principal: true },
  { id: "progreso", icono: "icon-chart", clave: "ent.pestana_progreso", titulo: "ent.titulo_progreso" },
  { id: "perfil", icono: "icon-user", clave: "ent.pestana_perfil", titulo: "ent.titulo_perfil" }
];

/** La última sección abierta, para volver a ella (solo en este navegador). */
var ENTRENO_CLAVE_PESTANA = "nutritionPlanner.entrenoPestana.v1";

var _entPestPanel = null;
var _entPestBarra = null;
var _entPestActual = null;
var _entPestAnterior = "inicio";

function entrenoPestanaValida(id) {
  for (var i = 0; i < ENTRENO_PESTANAS.length; i++) {
    if (ENTRENO_PESTANAS[i].id === id) return id;
  }
  return "inicio";
}

function _entPestDatos(id) {
  return ENTRENO_PESTANAS.filter(function (p) { return p.id === id; })[0];
}

function _entPestLeer() {
  try { return entrenoPestanaValida(localStorage.getItem(ENTRENO_CLAVE_PESTANA)); } catch (e) { return "inicio"; }
}

function _entPestGuardar(id) {
  try { localStorage.setItem(ENTRENO_CLAVE_PESTANA, id); } catch (e) { /* solo esta visita */ }
}

function entrenoPestanaActual() { return _entPestBarra ? _entPestActual : null; }

function entrenoPestanaAnterior() { return _entPestAnterior; }

/** Cambia la sección abierta y nada más: la barra, el título y lo guardado. */
function entrenoPestanaMarcar(id, sinDesplazar) {
  if (!_entPestPanel || !_entPestBarra) return;
  id = entrenoPestanaValida(id);
  if (id !== "sesion") _entPestAnterior = id;
  _entPestActual = id;
  _entPestPanel.setAttribute("data-pestana", id);
  Array.prototype.forEach.call(_entPestBarra.querySelectorAll(".tabbar__btn"), function (b) {
    var si = b.getAttribute("data-destino") === id;
    b.classList.toggle("is-activa", si);
    if (si) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current");
  });
  var titulo = document.getElementById("entrenoTitulo");
  var clave = _entPestDatos(id).titulo;
  if (titulo) {
    titulo.setAttribute("data-i18n", clave);
    titulo.textContent = t(clave);
  }
  if (id === "perfil") entrenoPerfilPintar();
  _entPestGuardar(id);
  if (!sinDesplazar) window.scrollTo(0, 0);
}

/**
 * Un toque en la barra. «Entrenar» abre la sesión en curso, si la hay; irse
 * de una sesión abierta la cierra (sigue en curso) o, si se estaba
 * corrigiendo con cambios, pregunta antes.
 */
function entrenoPestanaIr(id) {
  if (!_entPestPanel || !_entPestBarra) return;
  id = entrenoPestanaValida(id);
  var abierta = _entPestPanel.classList.contains("is-sesion");
  if (id === "sesion") {
    // entrenoSesionAbrir marca la sección ella misma al enseñar la pantalla.
    if (!abierta && typeof entrenoSesionAbrir === "function" && entrenoSesionAbrir()) return;
    entrenoPestanaMarcar("sesion");
    return;
  }
  if (abierta && typeof entrenoSesionSalir === "function" && !entrenoSesionSalir()) return;
  entrenoPestanaMarcar(id);
}

function initEntrenoPestanas() {
  _entPestPanel = document.getElementById("entrenoPanel");
  if (!_entPestPanel || _entPestBarra) return;

  _entPestBarra = document.createElement("nav");
  _entPestBarra.className = "tabbar tabbar--entreno";
  _entPestBarra.setAttribute("aria-label", t("ent.secciones"));
  _entPestBarra.setAttribute("data-i18n-aria-label", "ent.secciones");
  ENTRENO_PESTANAS.forEach(function (p) {
    var b = document.createElement("button");
    b.type = "button";
    b.className = "tabbar__btn" + (p.principal ? " tabbar__btn--principal" : "");
    b.setAttribute("data-destino", p.id);
    var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("width", "22");
    svg.setAttribute("height", "22");
    svg.setAttribute("aria-hidden", "true");
    var use = document.createElementNS("http://www.w3.org/2000/svg", "use");
    use.setAttribute("href", "#" + p.icono);
    svg.appendChild(use);
    var texto = document.createElement("span");
    texto.className = "tabbar__texto";
    texto.setAttribute("data-i18n", p.clave);
    texto.textContent = t(p.clave);
    b.appendChild(svg);
    b.appendChild(texto);
    b.addEventListener("click", function () {
      if (typeof entrenoVibrar === "function") entrenoVibrar();
      entrenoPestanaIr(p.id);
    });
    _entPestBarra.appendChild(b);
  });
  document.body.appendChild(_entPestBarra);
  document.body.classList.add("con-entreno-pestanas");
  // El alto cambia con el aspecto, con la pestaña activa y al pasar del menú a entrenamientos.
  if (typeof ResizeObserver === "function") new ResizeObserver(_entPestMedir).observe(_entPestBarra);
  window.addEventListener("resize", _entPestMedir);

  _initEntrenoPerfil();
  _initEntrenoAtajos();
  entrenoPestanaMarcar(_entPestLeer(), true);
}

/**
 * Lo que ocupa la barra desde el borde de abajo de la pantalla, en
 * --barra-entreno: el descanso de la sesión y el final del panel se apartan
 * eso (style.css). Escondida (en el menú) no mide nada y se deja la última.
 */
function _entPestMedir() {
  if (!_entPestBarra) return;
  var caja = _entPestBarra.getBoundingClientRect();
  if (!caja.height) return;
  var alto = Math.max(0, Math.round(window.innerHeight - caja.top));
  document.documentElement.style.setProperty("--barra-entreno", alto + "px");
}

// ── Atajos de una sección a otra ────────────────────────────────────────

/** «Ver los resultados» de la última sesión (Inicio) y «Abrir «Mis datos»» del peso (Progreso). */
function _initEntrenoAtajos() {
  _entPestPanel.addEventListener("click", function (ev) {
    var ver = ev.target.closest("[data-ver-sesion]");
    if (ver && _entPestPanel.contains(ver)) {
      entrenoPestanaIr("progreso");
      var item = _entPestPanel.querySelector('.entreno__hist-item[data-sesion="' + ver.getAttribute("data-ver-sesion") + '"] details');
      if (item) {
        item.open = true;
        if (typeof item.scrollIntoView === "function") item.scrollIntoView({ block: "start" });
      }
      return;
    }
    var peso = ev.target.closest("[data-abrir-peso]");
    if (peso && _entPestPanel.contains(peso) && typeof entrenoMostrar === "function") {
      entrenoMostrar(false);
      if (typeof activarPestana === "function") activarPestana("datos");
      var campo = document.getElementById("weightLogInput");
      if (campo) {
        try { campo.focus({ preventScroll: true }); } catch (e) { campo.focus(); }
        if (typeof campo.scrollIntoView === "function") campo.scrollIntoView({ block: "center" });
      }
    }
  });
}

// ── Perfil ──────────────────────────────────────────────────────────────

function _entPerfil() { return document.getElementById("entrenoPerfil"); }

/** Los interruptores, la frase de la cuenta y el botón de entrar. */
function entrenoPerfilPintar() {
  var caja = _entPerfil();
  if (!caja) return;
  Array.prototype.forEach.call(caja.querySelectorAll(".entreno__interruptor"), function (b) {
    var cual = b.getAttribute("data-perfil");
    var on = cual === "sonido"
      ? (typeof entrenoSonidoOn !== "function" || entrenoSonidoOn())
      : (typeof entrenoVibracionOn !== "function" || entrenoVibracionOn());
    b.setAttribute("aria-pressed", on ? "true" : "false");
  });
  var usuario = typeof getCurrentUser === "function" ? getCurrentUser() : null;
  var cuenta = document.getElementById("entrenoPerfilCuenta");
  if (cuenta) {
    cuenta.textContent = usuario
      ? (usuario.email ? tFormat("ent.perfil_cuenta_si", { email: usuario.email }) : t("ent.perfil_cuenta_si_sin"))
      : t("ent.perfil_cuenta_no");
  }
  var entrar = caja.querySelector('[data-perfil="entrar"]');
  if (entrar) {
    var puede = typeof openAuthDialog === "function" && typeof isAuthAvailable === "function" && isAuthAvailable();
    entrar.hidden = !!usuario || !puede;
  }
}

function _initEntrenoPerfil() {
  var caja = _entPerfil();
  if (!caja) return;
  // Nace escondido en el HTML: sin este fichero sus botones no harían nada.
  caja.hidden = false;
  caja.addEventListener("click", function (ev) {
    var boton = ev.target.closest("[data-perfil]");
    if (!boton || !caja.contains(boton)) return;
    var accion = boton.getAttribute("data-perfil");
    if (accion === "cuestionario") {
      if (typeof entrenoVibrar === "function") entrenoVibrar();
      if (typeof entrenoCuestionarioAbrir === "function") entrenoCuestionarioAbrir();
    } else if (accion === "sonido") {
      if (typeof entrenoSonidoPoner === "function") entrenoSonidoPoner(!entrenoSonidoOn());
      entrenoPerfilPintar();
    } else if (accion === "vibracion") {
      if (typeof entrenoVibracionPoner === "function") entrenoVibracionPoner(!entrenoVibracionOn());
      // Al encenderla, una pulsación corta: así se sabe que funciona.
      if (typeof entrenoVibrar === "function") entrenoVibrar();
      entrenoPerfilPintar();
    } else if (accion === "entrar") {
      if (typeof openAuthDialog === "function") openAuthDialog("login");
    } else if (accion === "exportar") {
      if (typeof exportarMisDatos === "function") exportarMisDatos();
    } else if (accion === "importar") {
      if (typeof importarMisDatos === "function") importarMisDatos();
    }
  });
  if (typeof onAuthStateChange === "function") onAuthStateChange(function () { entrenoPerfilPintar(); });
  entrenoPerfilPintar();
}
