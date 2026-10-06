/**
 * js/ui/tour.js
 * ──────────────────────────────────────────────────────
 * El recorrido guiado sobre la interfaz REAL: oscurece la página, deja un
 * hueco iluminado alrededor de lo que se explica, y debajo una tarjeta
 * con la explicación.
 *
 * ── Por qué sobre la interfaz de verdad y no con capturas ───────────────
 * Un tutorial con capturas envejece mal y, sobre todo, enseña una página
 * que no es la que el usuario tiene delante. Iluminando el botón auténtico
 * -- con SU plan, SUS precios -- lo que se aprende sirve en el mismo
 * momento en que se cierra el recorrido.
 *
 * ── La pantalla no salta (reescrito el 2026-10-06) ──────────────────────
 * La versión anterior colocaba la nota al lado del hueco, encima o debajo
 * según cupiera, y eso era lo que hacía que la tarjeta apareciera "unas
 * veces arriba y otras abajo" y que la página diera saltos. Ahora hay UNA
 * regla y es siempre la misma:
 *
 *   - la tarjeta está FIJA, pegada abajo y centrada; solo cambia de alto
 *     con el texto;
 *   - lo que se explica se lleva a la BANDA libre de encima de la tarjeta,
 *     y se centra ahí;
 *   - si ya está entero dentro de la banda, la página NO se mueve;
 *   - en el móvil cada paso abre antes la pestaña donde vive su elemento,
 *     así que la pantalla es corta y casi nunca hay que desplazar.
 *
 * Los gestos (rueda, arrastre, teclas) están bloqueados mientras dura: la
 * página solo se mueve cuando la mueve el recorrido.
 *
 * ── El hueco ────────────────────────────────────────────────────────────
 * En vez de recortar el fondo (que obliga a SVG o a cuatro divs que se
 * descuadran al desplazarse), el hueco es un rectángulo transparente con
 * una sombra gigantesca: `box-shadow: 0 0 0 9999px rgba(...)`. La sombra
 * oscurece TODO lo que hay fuera del rectángulo, así que el "agujero" no
 * hay que dibujarlo, es lo único que la sombra no tapa.
 *
 * Dos huecos, no uno. El de CONTEXTO (`step.ctx`: la tarjeta o el panel
 * donde vive el botón) deja ver DÓNDE está; el de FOCO señala la cosa
 * concreta dentro de él. Con un solo hueco sobre un botón pequeño, la
 * tarjeta que lo contiene quedaba tan oscura como el resto de la página y
 * se veía el botón pero no dónde vivía.
 *
 * ── No arranca solo ─────────────────────────────────────────────────────
 * Al terminar el cuestionario se PREGUNTA (offerTour): «¿Quieres ver un
 * recorrido?». Un «No» se recuerda para siempre; para repetirlo está
 * «Ver la explicación otra vez».
 *
 * Depende de: js/core/onboarding.js (completeTour), js/data/tour-steps.js,
 *             js/ui/pestanas.js (activarPestana, solo en el móvil).
 *
 * Expone (globales):
 *   offerTour()      → pregunta si quiere verlo; sí arranca, no lo da por visto
 *   startTour()      → arranca desde el primer paso
 *   maybeStartTour() → pregunta solo si al usuario le toca (tras su 1er plan)
 *   offerTourWhenReady() → pregunta en cuanto haya plan y ningún diálogo abierto
 *   startTourIfWanted()  → arranca el recorrido que pidió con «Sí» si el plan no llegó a generarse
 *   stopTour()       → cierra y da el recorrido por visto
 * ──────────────────────────────────────────────────────
 */

var _tourIndex = 0;
var _tourDir = 1;            // hacia dónde va: +1 siguiente, -1 atrás
var _tourVisible = [];
var _tourEls = null;
var _tourAsk = null;
// Quien se entera de la respuesta a la pregunta (lo pasa offerTour). Al
// terminar el cuestionario es el que GENERA el plan: la pregunta sale antes
// que el plan, y el plan sale conteste lo que conteste.
var _tourAlResponder = null;
// Cuándo dijo «Sí» a la pregunta del cuestionario (ms). maybeStartTour(), que
// se llama justo después de pintar cada plan nuevo, arranca el recorrido si
// esto es reciente. 0 = nadie lo ha pedido.
var _tourQuiereVerlo = 0;
var TOUR_QUIERE_MAX = 120000;   // si el plan no llega en 2 min, ya no vale
// Cuándo se estrenó el recorrido actual (2026-10-06: 18 pasos, tarjeta fija).
// Quien lo "vio" ANTES de esa fecha vio el de 11 pasos, que no se parece: se le
// vuelve a ofrecer, una vez. Sin esto el dueño no podía ver el nuevo -- la marca
// "ya lo vio" del recorrido viejo lo daba por visto (2026-10-07).
var TOUR_ESTRENO = "2026-10-06T00:00:00.000Z";
// ¿Hay pestañas (móvil)? Se mide ANTES de abrir el recorrido: mientras está
// abierto el CSS esconde la barra de pestañas.
var _tourMovil = false;
var _tourPestanaAntes = null;
var _tourRaf = null;
// .Ha llegado el recorrido a estar EN PANTALLA en esta ejecucion? Ver
// stopTour(): decide si se marca como visto.
var _tourSeVio = false;
var _tourEscuchando = false;
// ¿Es el primer paso desde que se abrió? (la tarjeta de ese ya entra desde abajo)
var _tourPrimera = false;
// ¿Se está cerrando con la animación de salida?
var _tourSaliendo = false;
// Número del paso en pantalla: lo que se programa para después (el ajuste fino)
// solo vale si sigue siendo el mismo.
var _tourToken = 0;

var TOUR_PAD = 8;       // aire entre lo enmarcado y el borde del hueco
var TOUR_MARGEN = 12;   // aire contra los bordes de la pantalla
var TOUR_HUECO = 10;    // aire entre la banda de enmarcado y la tarjeta

/**
 * Traduce, y si no hay traduccion se queda con el original.
 *
 * `t()` devuelve la CLAVE cuando no conoce una -- a proposito, para que un
 * hueco se vea en pantalla en vez de quedarse en blanco. Aqui eso no sirve:
 * el espanol de estos textos existe y esta a mano, asi que un hueco tiene
 * que caer al original y no pintar "tour.plan_titulo" en la tarjeta.
 *
 * @param {string} clave
 * @param {string} original  el castellano, que es la fuente
 * @returns {string}
 */
function _tourT(clave, original) {
  if (typeof t !== "function") return original;
  var traducido = t(clave);
  return (traducido && traducido !== clave) ? traducido : original;
}

/**
 * El titulo o el cuerpo de un paso, en el idioma de ahora mismo.
 *
 * El castellano NO se copia a js/i18n/es.js: vive en TOUR_STEPS, pegado al
 * comentario que explica por que ese paso existe y por que se dice asi.
 * Separarlos convierte el texto en una cadena huerfana que nadie sabe si
 * puede tocar. Misma decision que LEGAL_SUMMARY.
 *
 * @param {object} step
 * @param {string} campo  "titulo" o "cuerpo"
 * @returns {string}
 */
function _tourTextoPaso(step, campo) {
  var original = (campo === "titulo") ? step.title : step.body;
  return _tourT("tour." + step.id + "_" + campo, original);
}

/**
 * Pone en la tarjeta los textos del paso actual, en el idioma de ahora.
 *
 * Los botones de la barra se crean una sola vez en _tourBuild, asi que
 * tambien se repintan aqui: si no, al cambiar de idioma con el recorrido
 * abierto se quedaban en el anterior.
 */
function _tourPintarTextos() {
  var e = _tourEls;
  var step = _tourVisible[_tourIndex];
  if (!e || !step) return;

  e.counter.textContent = _tourT("ui.paso_n_de_m", "{n} de {total}")
    .replace("{n}", _tourIndex + 1)
    .replace("{total}", _tourVisible.length);
  var pct = Math.round((_tourIndex + 1) / _tourVisible.length * 100);
  // Con GSAP la barra se rellena animada (js/ui/tour-fx.js); sin él, de golpe.
  if (!(typeof tourFxProgreso === "function" && tourFxProgreso(e.progress, pct))) {
    e.progress.style.width = pct + "%";
  }
  // La insignia lleva el número del paso.
  if (e.icono) {
    e.icono.textContent = String(_tourIndex + 1);
    e.icono.hidden = false;
  }
  e.title.textContent = _tourTextoPaso(step, "titulo");
  e.body.textContent = _tourTextoPaso(step, "cuerpo");
  e.next.textContent = (_tourIndex === _tourVisible.length - 1)
    ? _tourT("ui.entendido", "Entendido")
    : _tourT("ui.siguiente", "Siguiente");
  e.skip.textContent = _tourT("ui.saltar", "Saltar");
  e.prev.textContent = _tourT("ui.atras", "Atrás");
  e.prev.hidden = (_tourIndex === 0);
}

/** Crea el DOM del recorrido una sola vez, la primera que hace falta. */
function _tourBuild() {
  if (_tourEls) return _tourEls;

  var root = document.createElement("div");
  root.className = "tour";
  root.id = "tour";
  root.hidden = true;

  var hole = document.createElement("div");
  hole.className = "tour__hole";
  hole.hidden = true;

  var foco = document.createElement("div");
  foco.className = "tour__foco";
  foco.hidden = true;

  var card = document.createElement("div");
  card.className = "tour__card";
  card.setAttribute("role", "dialog");
  card.setAttribute("aria-live", "polite");

  // La insignia con el número del paso: adorno (el contador ya lo dice), por eso aria-hidden.
  var icono = document.createElement("span");
  icono.className = "tour__icono";
  icono.setAttribute("aria-hidden", "true");
  icono.hidden = true;

  // El anillo que late alrededor del hueco y del foco (js/ui/tour-fx.js).
  var pulsoHole = document.createElement("span");
  pulsoHole.className = "tour__pulso";
  hole.appendChild(pulsoHole);
  var pulsoFoco = document.createElement("span");
  pulsoFoco.className = "tour__pulso";
  foco.appendChild(pulsoFoco);

  // El dedo que pulsa sobre los botones. Cuelga del foco si lo hay y, si no,
  // del hueco (_tourToqueEnSuSitio).
  var toque = document.createElement("span");
  toque.className = "tour__toque";
  toque.setAttribute("aria-hidden", "true");
  toque.hidden = true;
  var toqueOnda = document.createElement("span");
  toqueOnda.className = "tour__toque-onda";
  var toquePunto = document.createElement("span");
  toquePunto.className = "tour__toque-punto";
  toque.appendChild(toqueOnda);
  toque.appendChild(toquePunto);
  hole.appendChild(toque);

  var counter = document.createElement("p");
  counter.className = "tour__counter";

  var barra = document.createElement("div");
  barra.className = "tour__progress";
  barra.setAttribute("aria-hidden", "true");
  var progress = document.createElement("span");
  barra.appendChild(progress);

  var title = document.createElement("h3");
  title.className = "tour__title";

  var body = document.createElement("p");
  body.className = "tour__body";

  var nav = document.createElement("div");
  nav.className = "tour__nav";

  var skip = document.createElement("button");
  skip.type = "button";
  skip.className = "tour__skip";

  // "Atrás" existe porque un recorrido solo de ida obliga a elegir entre
  // terminar sin haber entendido un paso o abandonarlo entero. Se oculta en
  // el primero en vez de dejarlo desactivado: un botón que no hace nada
  // invita a pulsarlo y a pensar que algo va mal.
  var prev = document.createElement("button");
  prev.type = "button";
  prev.className = "tour__prev";

  var next = document.createElement("button");
  next.type = "button";
  next.className = "tour__next";

  nav.appendChild(skip);
  nav.appendChild(prev);
  nav.appendChild(next);
  card.appendChild(icono);
  card.appendChild(counter);
  card.appendChild(barra);
  card.appendChild(title);
  card.appendChild(body);
  card.appendChild(nav);
  root.appendChild(hole);
  // El foco va DESPUES del contexto: su velo gris cae encima, asi que la
  // tarjeta de contexto queda atenuada y solo lo enfocado sale limpio.
  root.appendChild(foco);
  root.appendChild(card);
  document.body.appendChild(root);

  skip.addEventListener("click", stopTour);
  prev.addEventListener("click", _tourPrev);
  next.addEventListener("click", _tourNext);

  // Escape cierra: un recorrido del que no se puede salir es una trampa.
  document.addEventListener("keydown", function (ev) {
    if (ev.key === "Escape" && !root.hidden) stopTour();
  });

  _tourEls = { root: root, hole: hole, foco: foco, card: card, counter: counter,
               progress: progress, title: title, body: body, skip: skip,
               prev: prev, next: next, icono: icono, pulsoHole: pulsoHole,
               pulsoFoco: pulsoFoco, toque: toque };
  _tourPintarTextos();
  return _tourEls;
}

/**
 * El elemento de un paso, si de verdad se puede señalar ahora mismo.
 *
 * Se descartan los que viven dentro de algo con el atributo `hidden` (la
 * lista de la compra no existe hasta que hay un plan, y las flechas de los
 * días no si el plan es de un día). Un mismo selector puede coincidir con
 * varios elementos -- el botón de la cámara sale en la compra, en el
 * catálogo y en "sin cocinar" --, así que se recorre y se toma el primero
 * que no está escondido.
 *
 * @param {object} step
 * @returns {Element|null}
 */
function _tourEncontrar(step) {
  var lista = document.querySelectorAll(step.target);
  for (var i = 0; i < lista.length; i++) {
    if (!lista[i].closest("[hidden]")) return lista[i];
  }
  return null;
}

/** ¿La pantalla tiene pestañas (móvil)? Ver js/ui/pestanas.js. */
function _tourHayPestanas() {
  var barra = document.querySelector(".tabbar");
  return !!barra && window.getComputedStyle(barra).display !== "none";
}

function _tourPestanaActual() {
  var main = document.querySelector("main");
  return main ? main.getAttribute("data-pestana") : null;
}

/** Los pasos cuyo elemento existe DE VERDAD en la página ahora mismo. */
function _tourResolveSteps() {
  var steps = (typeof TOUR_STEPS !== "undefined") ? TOUR_STEPS : [];
  return steps.filter(function (step) {
    if (step.mobile && !_tourMovil) return false;
    if (_tourEncontrar(step)) return true;
    // Un paso no opcional que no encuentra su elemento es un error de
    // programación, no una situación normal: se avisa por consola en vez
    // de desaparecer en silencio, pero tampoco se rompe el recorrido.
    if (!step.optional) {
      console.warn("[tour] no existe el objetivo de un paso obligatorio:", step.target);
    }
    return false;
  });
}

// ── La geometría: una sola regla ─────────────────────────────────────────

/**
 * La banda de pantalla donde se enseña lo explicado: todo lo que queda
 * encima de la tarjeta. La tarjeta mide lo que mida su texto, así que se
 * llama DESPUÉS de pintar el texto del paso.
 */
function _tourBanda() {
  var vh = window.innerHeight;
  var alto = _tourEls.card.getBoundingClientRect().height;
  var arriba = TOUR_MARGEN;
  var abajo = vh - alto - TOUR_MARGEN - TOUR_HUECO;
  // En una pantalla muy baja la tarjeta se come casi todo: siempre queda
  // una banda mínima, y la propia tarjeta se desplaza por dentro.
  if (abajo - arriba < 120) abajo = arriba + 120;
  return { arriba: arriba, abajo: abajo, alto: abajo - arriba };
}

/**
 * Qué se enmarca y qué se marca dentro.
 *
 * Si el paso trae `ctx` (la tarjeta o el panel donde vive el botón) y CABE
 * en la banda, se enmarca eso y el botón se marca dentro: se ve dónde está.
 * Si no cabe, se enmarca el propio elemento -- y si es más alto que la
 * banda, su principio, que es lo que lleva el título.
 */
function _tourQueEnmarcar(el, step, b) {
  if (step.ctx) {
    var ctx = el.closest(step.ctx);
    if (ctx && ctx !== el) {
      var h = ctx.getBoundingClientRect().height;
      if (h <= b.alto - 2 * TOUR_PAD) return { marco: ctx, foco: el };
    }
  }
  return { marco: el, foco: null };
}

/**
 * A qué punto de la página hay que ir para que el marco quede en la banda.
 * Si ya está entero dentro, es donde está ahora: la página no se mueve.
 */
function _tourDestino(marco, b) {
  var r = marco.getBoundingClientRect();
  var alto = Math.min(r.height, b.alto - 2 * TOUR_PAD);
  var actual = window.pageYOffset || document.documentElement.scrollTop || 0;

  if (r.top >= b.arriba && r.top + alto <= b.abajo) return actual;

  var topDeseado = b.arriba + (b.alto - alto) / 2;
  var destino = actual + r.top - topDeseado;
  var maximo = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
  return Math.max(0, Math.min(destino, maximo));
}

/** Pone un hueco sobre un rectángulo, recortado al ancho de la pantalla. */
function _tourPonerHueco(nodo, r, alto, pad) {
  var vw = document.documentElement.clientWidth;
  var izq = Math.max(6, r.left - pad);
  var der = Math.min(vw - 6, r.right + pad);
  // Pegado al borde de arriba (la cabecera, el menú ☰) el aire se come: el
  // hueco no sale por la parte de arriba de la pantalla.
  var arriba = Math.max(4, r.top - pad);
  var abajo = r.top + alto + pad;
  var v = { left: izq, top: arriba, width: Math.max(0, der - izq), height: Math.max(0, abajo - arriba) };
  var estabaOculto = nodo.hidden;
  nodo.hidden = false;
  // Con GSAP el hueco se DESLIZA hasta su sitio (js/ui/tour-fx.js); sin él,
  // se pone de golpe como siempre.
  if (typeof tourFxMover === "function" && tourFxMover(nodo, v, estabaOculto)) return;
  nodo.style.left = v.left + "px";
  nodo.style.top = v.top + "px";
  nodo.style.width = v.width + "px";
  nodo.style.height = v.height + "px";
}

/** El dedo cuelga del foco si lo hay (el botón) y, si no, del hueco. */
function _tourToqueEnSuSitio(e) {
  if (!e || !e.toque || e.toque.hidden) return;
  var casa = e.foco.hidden ? e.hole : e.foco;
  if (e.toque.parentNode !== casa) casa.appendChild(e.toque);
}

/** Coloca los huecos sobre lo que toca AHORA (sin mover la página). */
function _tourColocar() {
  var e = _tourEls;
  var step = _tourVisible[_tourIndex];
  if (!e || !step || e.root.hidden) return;

  var el = _tourEncontrar(step);
  if (!el) { e.hole.hidden = true; e.foco.hidden = true; return; }

  var b = _tourBanda();
  var q = _tourQueEnmarcar(el, step, b);
  var r = q.marco.getBoundingClientRect();
  _tourPonerHueco(e.hole, r, Math.min(r.height, b.alto - 2 * TOUR_PAD), TOUR_PAD);

  if (q.foco) {
    var rf = q.foco.getBoundingClientRect();
    _tourPonerHueco(e.foco, rf, rf.height, 4);
  } else {
    e.foco.hidden = true;
  }
  _tourToqueEnSuSitio(e);
}

function _tourMenosMovimiento() {
  return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
}

/** Desplazamiento INSTANTÁNEO: para empezar una pestaña nueva desde arriba. */
function _tourIrArribaYa() {
  var raiz = document.documentElement;
  var antes = raiz.style.scrollBehavior;
  raiz.style.scrollBehavior = "auto";
  window.scrollTo(0, 0);
  raiz.style.scrollBehavior = antes;
}

function _tourScrollA(y) {
  var actual = window.pageYOffset || document.documentElement.scrollTop || 0;
  if (Math.abs(y - actual) < 2) return;
  try {
    window.scrollTo({ top: y, left: 0, behavior: _tourMenosMovimiento() ? "auto" : "smooth" });
  } catch (err) {
    window.scrollTo(0, y);
  }
}

/**
 * Mientras la página se desplaza, el hueco la sigue fotograma a fotograma;
 * se para cuando lleva unos fotogramas quieta (o al segundo y medio).
 */
function _tourSeguir() {
  if (_tourRaf) window.cancelAnimationFrame(_tourRaf);
  var ultimo = null, quietos = 0, t0 = Date.now();
  (function paso() {
    _tourColocar();
    var y = window.pageYOffset || document.documentElement.scrollTop || 0;
    quietos = (y === ultimo) ? quietos + 1 : 0;
    ultimo = y;
    if (quietos < 8 && Date.now() - t0 < 1500 && _tourEls && !_tourEls.root.hidden) {
      _tourRaf = window.requestAnimationFrame(paso);
    } else {
      _tourRaf = null;
    }
  })();
}

/**
 * Desplazamiento instantáneo a una altura exacta, sin el `scroll-behavior:
 * smooth` de la página (que haría de cada empujón una animación).
 */
function _tourScrollYa(y) {
  var raiz = document.documentElement;
  var antes = raiz.style.scrollBehavior;
  raiz.style.scrollBehavior = "auto";
  window.scrollTo(0, y);
  raiz.style.scrollBehavior = antes;
}

/**
 * Un segundo vistazo, cuando el desplazamiento ya ha terminado: si lo señalado
 * sigue FUERA de la banda, se empuja la página un poco más y se vuelve a mirar.
 *
 * Hace falta con lo que va PEGADO a la pantalla (position: sticky): el botón
 * «Generar plan» del móvil se queda anclado abajo mientras la página no llega
 * a su sitio natural, así que desplazar hasta donde parecía que estaba no lo
 * mueve (el hueco quedaba debajo de la tarjeta). Se sigue bajando hasta que se
 * suelta y entra en la banda -- o hasta que no hay más página.
 */
function _tourAjusteFino(token, intento) {
  var e = _tourEls;
  var step = _tourVisible[_tourIndex];
  if (!e || !step || e.root.hidden || token !== _tourToken) return;
  var el = _tourEncontrar(step);
  if (!el) return;

  var b = _tourBanda();
  var q = _tourQueEnmarcar(el, step, b);
  var r = q.marco.getBoundingClientRect();
  var alto = Math.min(r.height, b.alto - 2 * TOUR_PAD);
  if (r.top >= b.arriba - 2 && r.top + alto <= b.abajo + 2) return;   // ya está bien
  if (intento >= 10) return;

  var actual = window.pageYOffset || document.documentElement.scrollTop || 0;
  var maximo = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
  var deseado = b.arriba + (b.alto - alto) / 2;
  var empuje = r.top - deseado;
  // Por debajo de la banda y sin más página que bajar, o por encima y arriba del todo: no hay nada que hacer.
  if (empuje > 0 && actual >= maximo - 1) return;
  if (empuje < 0 && actual <= 1) return;
  // Si el elemento no se ha movido en nada con el empuje anterior (está pegado), se sigue con empujes de al menos 120 px.
  var paso = empuje > 0 ? Math.max(120, empuje) : Math.min(-120, empuje);
  _tourScrollYa(Math.max(0, Math.min(maximo, actual + paso)));
  _tourColocar();
  window.setTimeout(function () { _tourAjusteFino(token, intento + 1); }, 90);
}

/** Lleva lo del paso actual a la banda (si hace falta) y lo ilumina. */
function _tourReencuadrar() {
  var e = _tourEls;
  var step = _tourVisible[_tourIndex];
  if (!e || !step || e.root.hidden) return;
  var el = _tourEncontrar(step);
  if (!el) return;
  var b = _tourBanda();
  var q = _tourQueEnmarcar(el, step, b);
  _tourScrollA(_tourDestino(q.marco, b));
  _tourSeguir();
}

// ── Bloqueo de los gestos que mueven la página ──────────────────────────
//
// El recorrido decide qué mirar: mueve la página, mide dónde ha quedado la
// cosa y le pone el hueco encima. Arrastrar la página a la vez dejaba el
// hueco sobre una franja vacía.
//
// Lo que se bloquea son los GESTOS, no la posibilidad de desplazarse:
// `overflow: hidden` en la raíz sería lo obvio y rompería lo único que tiene
// que seguir funcionando -- el propio `window.scrollTo` del recorrido. Así
// que la página sigue siendo desplazable y lo que se cancela es la rueda, el
// arrastre y las teclas de desplazamiento.
//
// La tarjeta SÍ se puede desplazar por dentro: en una pantalla corta un
// texto de seis líneas con dos botones debajo puede no caber, y dejarlo sin
// desplazar sería dejar el botón "Siguiente" fuera del alcance.
var _tourBloqueoGestos = null;

/** Teclas que mueven la pagina y que hay que cancelar mientras dura. */
var TOUR_TECLAS_SCROLL = {
  ArrowUp: 1, ArrowDown: 1, ArrowLeft: 1, ArrowRight: 1,
  PageUp: 1, PageDown: 1, Home: 1, End: 1, " ": 1, Spacebar: 1
};

function _tourDentroDeLaNota(nodo) {
  if (!nodo) return false;
  var tarjetas = [_tourEls && _tourEls.card, _tourAsk && _tourAsk.card];
  for (var i = 0; i < tarjetas.length; i++) {
    var c = tarjetas[i];
    if (c && (c === nodo || (typeof c.contains === "function" && c.contains(nodo)))) return true;
  }
  return false;
}

function _tourActivarBloqueo() {
  if (_tourBloqueoGestos) return;

  var gesto = function (ev) {
    if (_tourDentroDeLaNota(ev.target)) return;
    if (ev.cancelable) ev.preventDefault();
  };
  var tecla = function (ev) {
    if (!TOUR_TECLAS_SCROLL[ev.key]) return;
    // En un boton, la barra espaciadora lo PULSA; cancelarla ahi dejaria
    // "Siguiente" sin responder al teclado.
    if (_tourDentroDeLaNota(ev.target)) return;
    if (ev.cancelable) ev.preventDefault();
  };

  // `passive: false` es obligatorio: el navegador da por pasivos los
  // listeners de rueda y de tacto, y en un listener pasivo preventDefault()
  // no hace nada y ademas avisa por consola.
  window.addEventListener("wheel", gesto, { passive: false });
  window.addEventListener("touchmove", gesto, { passive: false });
  window.addEventListener("keydown", tecla, false);

  _tourBloqueoGestos = { gesto: gesto, tecla: tecla };
}

function _tourQuitarBloqueo() {
  if (!_tourBloqueoGestos) return;
  window.removeEventListener("wheel", _tourBloqueoGestos.gesto, { passive: false });
  window.removeEventListener("touchmove", _tourBloqueoGestos.gesto, { passive: false });
  window.removeEventListener("keydown", _tourBloqueoGestos.tecla, false);
  _tourBloqueoGestos = null;
}

// ── Los pasos ───────────────────────────────────────────────────────────

function _tourRender() {
  var e = _tourEls;
  var step = _tourVisible[_tourIndex];
  if (!step) { stopTour(); return; }

  // Un paso cuyo elemento ha desaparecido (cambió el plan con el recorrido
  // abierto) se salta en la dirección en que se iba.
  while (step && !_tourEncontrar(step)) {
    _tourIndex += _tourDir;
    step = _tourVisible[_tourIndex];
  }
  if (!step) { stopTour(); return; }

  // El texto va ANTES de medir: la banda depende de lo que mida la tarjeta.
  _tourPintarTextos();

  // En el móvil, la pestaña donde vive el elemento: pantalla nueva, se
  // empieza arriba y casi nunca hay que desplazar.
  if (_tourMovil && step.tab && typeof activarPestana === "function" &&
      _tourPestanaActual() !== step.tab) {
    activarPestana(step.tab, true);
    _tourIrArribaYa();
  }

  _tourReencuadrar();
  // Cuando el desplazamiento haya acabado, un segundo vistazo (_tourAjusteFino).
  var token = ++_tourToken;
  window.setTimeout(function () { _tourAjusteFino(token, 0); }, 420);
  // La animación de la tarjeta, la insignia, el texto y el dedo (tour-fx.js).
  var primera = _tourPrimera;
  _tourPrimera = false;
  if (typeof tourFxPaso === "function") tourFxPaso(e, step, _tourDir, primera);
  _tourToqueEnSuSitio(e);
  // La tarjeta no se mueve; el foco del teclado, al botón de seguir.
  try { e.next.focus({ preventScroll: true }); } catch (err) { /* sin foco, no pasa nada */ }
}

/**
 * Repinta SOLO los textos, en el idioma de ahora mismo.
 *
 * Lo llama applyI18nToDom() al cambiar de idioma. No es _tourRender()
 * porque aquel vuelve a mover la pagina, y cambiar de idioma no es motivo
 * para mover a nadie de sitio.
 */
function refreshTourTexts() {
  if (_tourAsk && !_tourAsk.root.hidden) _tourPintarPregunta();
  var e = _tourEls;
  if (!e || e.root.hidden) return;
  if (!_tourVisible[_tourIndex]) return;
  _tourPintarTextos();
  // El texto cambia de largo con el idioma, y de su alto depende la banda.
  _tourReencuadrar();
}

function _tourNext() {
  _tourDir = 1;
  if (_tourIndex >= _tourVisible.length - 1) {
    // Terminarlo de verdad (no saltarlo) se celebra: confeti y un aviso.
    _tourCerrar(true);
    return;
  }
  _tourIndex++;
  _tourRender();
}

function _tourPrev() {
  _tourDir = -1;
  if (_tourIndex <= 0) return;
  _tourIndex--;
  _tourRender();
}

function _tourEscuchar() {
  if (_tourEscuchando) return;
  _tourEscuchando = true;
  window.addEventListener("scroll", _tourColocar, true);
  window.addEventListener("resize", _tourReencuadrar);
}

function _tourDejarDeEscuchar() {
  if (!_tourEscuchando) return;
  _tourEscuchando = false;
  window.removeEventListener("scroll", _tourColocar, true);
  window.removeEventListener("resize", _tourReencuadrar);
}

/** Arranca el recorrido desde el principio. */
function startTour() {
  var e = _tourBuild();
  _tourCerrarPregunta(true);

  // Antes de abrirlo: con el recorrido abierto el CSS esconde la barra.
  _tourMovil = _tourHayPestanas();
  _tourPestanaAntes = _tourPestanaActual();

  _tourVisible = _tourResolveSteps();
  if (!_tourVisible.length) { _tourQuitarBloqueo(); return; }

  _tourIndex = 0;
  _tourDir = 1;
  _tourPrimera = true;
  _tourSaliendo = false;
  e.root.hidden = false;
  if (typeof tourFxEntrar === "function") tourFxEntrar(e);
  // A partir de aquí el recorrido está EN PANTALLA. Ver stopTour(): solo
  // cuenta como "visto" lo que se ha llegado a ver.
  _tourSeVio = true;

  _tourEscuchar();
  _tourActivarBloqueo();
  _tourRender();
}

/**
 * Cierra el recorrido y lo da por visto -- también al saltarlo. Saltar es
 * una respuesta ("ya me apaño"), y volver a asaltar con lo mismo en la
 * siguiente visita sería no haberla escuchado. Para repetirlo está el
 * enlace del pie.
 */
function stopTour() {
  _tourCerrar(false);
}

/**
 * El cierre de verdad. `celebrar` solo es true al pulsar «Entendido» en el
 * último paso: entonces sale el confeti y un aviso. Con GSAP el recorrido se
 * va con una animación corta (js/ui/tour-fx.js); sin él, de golpe.
 */
function _tourCerrar(celebrar) {
  if (_tourSaliendo) return;
  // "Visto" solo si de verdad llegó a la pantalla.
  //
  // Antes se marcaba SIEMPRE, y eso apaga el recorrido PARA SIEMPRE: basta
  // con que stopTour() se llame una vez sin haber enseñado nada (un paso
  // que no resuelve, un cierre inmediato, cualquier camino futuro) para que
  // maybeStartTour() no vuelva a arrancarlo jamás. Es exactamente la forma
  // del fallo reportado el 2026-09-03: "туториал не появляется... ни разу
  // не видел". Marcar por error "no visto" solo cuesta que el recorrido
  // salga otra vez. Marcar por error "visto" cuesta que no salga nunca. La
  // asimetría decide.
  if (_tourSeVio && typeof completeTour === "function") {
    completeTour();
  }
  _tourSeVio = false;

  if (_tourRaf) { window.cancelAnimationFrame(_tourRaf); _tourRaf = null; }
  _tourDejarDeEscuchar();
  // Incondicional: dejarse el bloqueo puesto significa una pagina que no se
  // mueve y sin nada en pantalla que explique por que. Es el fallo peor de
  // todo este mecanismo.
  _tourQuitarBloqueo();

  var terminar = function () {
    if (!_tourSaliendo) return;           // otro recorrido arrancó entre medias
    _tourSaliendo = false;
    if (_tourEls) _tourEls.root.hidden = true;
    // Cada cual vuelve a la pestaña en la que estaba.
    if (_tourMovil && _tourPestanaAntes && typeof activarPestana === "function" &&
        _tourPestanaActual() !== _tourPestanaAntes) {
      activarPestana(_tourPestanaAntes, true);
      _tourIrArribaYa();
    }
  };

  _tourSaliendo = true;
  if (_tourEls && !_tourEls.root.hidden && typeof tourFxSalir === "function" &&
      typeof tourFxActivo === "function" && tourFxActivo()) {
    tourFxSalir(_tourEls, celebrar ? _tourT("ui.tour_listo", "¡Listo! Ya sabes moverte por Weekplate.") : null, terminar);
    // Red de seguridad: si la animación no llegara a acabar, se cierra igual.
    window.setTimeout(terminar, 1200);
  } else {
    terminar();
  }
}

// ── La pregunta de después del cuestionario ─────────────────────────────

function _tourBuildAsk() {
  if (_tourAsk) return _tourAsk;

  var root = document.createElement("div");
  root.className = "tour-ask";
  root.id = "tourAsk";
  root.hidden = true;

  // Mismas clases que la tarjeta del recorrido: los aspectos que la visten
  // (papel, cristal, lazos...) visten también esta pregunta sin tocar nada.
  var card = document.createElement("div");
  card.className = "tour__card tour-ask__card";
  card.setAttribute("role", "dialog");
  card.setAttribute("aria-modal", "true");
  card.setAttribute("aria-labelledby", "tourAskTitulo");

  // La insignia: el icono del cocinero, el de «Generar plan» (js/ui/tour-fx.js,
  // tourFxPregunta). Un icono de la propia aplicación, no un emoji.
  var icono = document.createElement("span");
  icono.className = "tour__icono";
  icono.setAttribute("aria-hidden", "true");
  icono.innerHTML = '<svg width="30" height="30" aria-hidden="true"><use href="#icon-chef"></use></svg>';

  var title = document.createElement("h3");
  title.className = "tour__title";
  title.id = "tourAskTitulo";

  var body = document.createElement("p");
  body.className = "tour__body";

  var nav = document.createElement("div");
  nav.className = "tour__nav tour-ask__nav";

  var no = document.createElement("button");
  no.type = "button";
  no.className = "tour__prev";

  var si = document.createElement("button");
  si.type = "button";
  si.className = "tour__next";

  nav.appendChild(no);
  nav.appendChild(si);
  card.appendChild(icono);
  card.appendChild(title);
  card.appendChild(body);
  card.appendChild(nav);
  root.appendChild(card);
  document.body.appendChild(root);

  // «No» se recuerda para siempre (completeTour); para repetirlo está el
  // enlace «Ver la explicación otra vez». «Sí» arranca el recorrido.
  no.addEventListener("click", function () {
    _tourCerrarPregunta(false);
    if (typeof completeTour === "function") completeTour();
    _tourResponder(false);
  });
  si.addEventListener("click", function () {
    // Con quien espera la respuesta (el final del cuestionario) todavía no
    // hay plan que señalar: se anota que lo quiere, se deja que se genere y
    // lo arranca maybeStartTour() en cuanto esté pintado.
    if (_tourAlResponder) {
      _tourCerrarPregunta(false);
      _tourQuiereVerlo = Date.now();
      _tourResponder(true);
      return;
    }
    startTour();
  });

  // Escape = «No»: una pregunta de la que no se puede salir es una trampa.
  document.addEventListener("keydown", function (ev) {
    if (ev.key === "Escape" && _tourAsk && !_tourAsk.root.hidden) no.click();
  });

  _tourAsk = { root: root, card: card, title: title, body: body, no: no, si: si, icono: icono };
  return _tourAsk;
}

function _tourPintarPregunta() {
  var a = _tourAsk;
  if (!a) return;
  a.title.textContent = _tourT("ui.tour_pregunta_titulo", "¿Quieres ver un recorrido por la aplicación?");
  a.body.textContent = _tourT("ui.tour_pregunta_cuerpo",
    "Te enseño, con tu plan delante, para qué sirve cada botón. Son unos dos minutos.");
  a.si.textContent = _tourT("ui.tour_pregunta_si", "Sí, enséñamelo");
  a.no.textContent = _tourT("ui.tour_pregunta_no", "No, gracias");
}

/**
 * Cierra la pregunta. Con `mantenerBloqueo` no suelta los gestos: es el
 * caso de «Sí», que abre el recorrido sin dejar un instante la página libre.
 */
function _tourCerrarPregunta(mantenerBloqueo) {
  if (_tourAsk) _tourAsk.root.hidden = true;
  if (!mantenerBloqueo) _tourQuitarBloqueo();
}

/**
 * Avisa de la respuesta a quien la espera, UNA vez. Pase lo que pase con la
 * pregunta (sí, no, Escape, o ni siquiera poder mostrarla) quien espera tiene
 * que enterarse: si es el final del cuestionario, de ahí cuelga que el plan se
 * genere.
 */
function _tourResponder(quiere) {
  var cb = _tourAlResponder;
  _tourAlResponder = null;
  if (cb) {
    try { cb(!!quiere); } catch (err) { console.error(err); }
  }
}

/**
 * Pregunta si quiere ver el recorrido.
 *
 * Al terminar el cuestionario (js/app.js) sale AL INSTANTE, antes de generar
 * el plan: la persona acaba de contestar quince preguntas y lo cortés es
 * preguntar y no empezar. `alResponder(quiere)` se llama cuando contesta, y
 * es entonces cuando se genera el plan. Sin `alResponder` (la primera vez que
 * se genera un plan, ver maybeStartTour) el plan ya está delante y «Sí»
 * arranca el recorrido en el acto.
 *
 * @param {function(boolean)} [alResponder]
 */
function offerTour(alResponder) {
  _tourAlResponder = typeof alResponder === "function" ? alResponder : null;
  if (_tourEls && !_tourEls.root.hidden) { _tourResponder(false); return; }
  var a = _tourBuildAsk();
  if (!a.root.hidden) return;
  _tourPintarPregunta();
  a.root.hidden = false;
  if (typeof tourFxPregunta === "function") tourFxPregunta(a);
  _tourActivarBloqueo();
  try { a.si.focus({ preventScroll: true }); } catch (err) { /* idem */ }
}

/**
 * ¿La marca «ya lo vio» es de ESTE recorrido o del viejo? Una fecha que no se
 * entiende cuenta como vista: ante la duda no se molesta a nadie.
 * @param {string} cuando - ISO
 * @returns {boolean}
 */
function _tourVistoVigente(cuando) {
  var visto = Date.parse(cuando);
  var estreno = Date.parse(TOUR_ESTRENO);
  if (isNaN(visto) || isNaN(estreno)) return true;
  return visto >= estreno;
}

/**
 * Dijo «Sí» al recorrido, pero «Generar plan» no generó nada: había un plan de
 * hoy ya empezado, salió «Ya tienes un plan activo» y rechazó cambiarlo
 * («Cancelar»). Sin esto se quedaba con un «Sí» al que nadie contestaba, que
 * es justo lo que el dueño llamó «el tutorial no aparece» (2026-10-07).
 *
 * El recorrido arranca igualmente, con lo que haya en pantalla: sin plan faltan
 * los pasos que lo señalan (tarjetas, cambiar un plato, receta), que se saltan
 * solos, y quedan los de los botones de siempre (datos, generar, sin cocinar,
 * despensa, compra, planes guardados y el menú ☰). Lo llama js/ui/render-pantry.js
 * desde «Cancelar».
 */
function startTourIfWanted() {
  var pidio = _tourQuiereVerlo;
  if (!pidio || Date.now() - pidio >= TOUR_QUIERE_MAX) return;
  _tourQuiereVerlo = 0;
  window.setTimeout(startTour, 500);
}

/**
 * Pregunta solo si al usuario le toca. Se llama después de generar un plan:
 * quien ya contestó (sí o no) no vuelve a ser preguntado.
 */
function maybeStartTour() {
  if (typeof getOnboardingState !== "function") return;

  // La pregunta aquí es estrecha: "¿ya ha visto el recorrido?". Y se
  // responde mirando el estado, no pasando por nextOnboardingStep().
  //
  // Pasaba por ahí, y dejó de funcionar el día que se añadió la regla de
  // "sin cuenta, la bienvenida sale siempre": esa función empezó a
  // contestar "welcome" a todo el que no tuviera sesión, así que el
  // recorrido no salía nunca. La lección es la de siempre aquí: una función
  // que decide "qué pantalla toca" no sirve para responder "¿toca esta otra
  // cosa?".
  // Dijo «Sí» al terminar el cuestionario y el plan acaba de pintarse: ahora
  // sí hay algo que señalar. Va ANTES de mirar si ya lo vio: quien lo vio y lo
  // pide otra vez tiene que verlo.
  var pidio = _tourQuiereVerlo;
  _tourQuiereVerlo = 0;
  if (pidio && Date.now() - pidio < TOUR_QUIERE_MAX) {
    window.setTimeout(startTour, 700);
    return;
  }

  var estado = getOnboardingState();
  if (estado && estado.tourDoneAt && _tourVistoVigente(estado.tourDoneAt)) return;
  // Un respiro antes de preguntar: el plan acaba de aparecer y merece verse
  // un segundo antes de que algo se ponga por encima.
  offerTourWhenReady();
}

/**
 * Ofrece el recorrido en cuanto se pueda, no a una hora fija.
 *
 * Al terminar el cuestionario se pulsa «Generar plan» y, 0,9 s después, se
 * miraba UNA vez si había plan para preguntar. Esa mirada única fallaba en el
 * caso más normal de quien usa la aplicación a diario: con un plan de hoy ya
 * empezado (una comida cocinada o la compra hecha), «Generar plan» no genera
 * nada, abre el diálogo «Ya tienes un plan activo hoy», y la pregunta se
 * perdía -- o, peor, salía por debajo de ese diálogo modal, que está en la
 * capa superior del navegador y tapa cualquier z-index. Reportado el
 * 2026-10-07 como «el tutorial simplemente no aparece».
 *
 * Aquí se ESPERA a que se den las tres cosas a la vez, y a que se sigan
 * dando un instante para no preguntar a mitad de un repintado:
 *   - hay un plan pintado (los pasos casi todos nacen de él),
 *   - no hay ningún <dialog> abierto (el de «plan activo», el de la cuenta…),
 *   - no hay ya un recorrido ni una pregunta en pantalla.
 * Si se vio un diálogo y se cerró SIN que hubiera plan (dijo «Cancelar»), se
 * deja de esperar: no hay nada que enseñar y preguntar entonces sería raro.
 * Para ese caso está «Ver la explicación otra vez».
 *
 * @returns {void}
 */
var _tourEspera = null;
var TOUR_ESPERA_MS = 400;        // cada cuánto se mira
var TOUR_ESPERA_MAX = 120000;    // y cuánto se espera como máximo (2 min)

function _tourHayPlanPintado() {
  return document.querySelectorAll("#mealsContainer .meal-card:not([data-empty])").length > 0;
}

function _tourHayDialogoAbierto() {
  var d = document.querySelectorAll("dialog");
  for (var i = 0; i < d.length; i++) {
    if (d[i].open) return true;
  }
  return false;
}

function offerTourWhenReady() {
  if (_tourEspera) window.clearInterval(_tourEspera);
  var desde = Date.now();
  var estables = 0;
  var vioDialogo = false;

  _tourEspera = window.setInterval(function () {
    var fin = function () { window.clearInterval(_tourEspera); _tourEspera = null; };
    if (Date.now() - desde > TOUR_ESPERA_MAX) { fin(); return; }

    // Ya hay algo del recorrido delante: no se pisa.
    if ((_tourEls && !_tourEls.root.hidden) || (_tourAsk && !_tourAsk.root.hidden)) {
      fin();
      return;
    }

    var dialogo = _tourHayDialogoAbierto();
    var plan = _tourHayPlanPintado();
    if (dialogo) { vioDialogo = true; estables = 0; return; }
    if (vioDialogo && !plan) { fin(); return; }

    if (!plan) { estables = 0; return; }
    estables++;
    if (estables < 2) return;   // dos miradas seguidas: ~0,8 s de calma
    fin();
    offerTour();
  }, TOUR_ESPERA_MS);
}
