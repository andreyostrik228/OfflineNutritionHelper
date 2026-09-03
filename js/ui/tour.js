/**
 * js/ui/tour.js
 * ─────────────────────────────────────────────────────────────────────────
 * El recorrido guiado sobre la interfaz REAL: oscurece la página, deja un
 * hueco iluminado alrededor del elemento del que se habla, y pone al lado
 * una nota explicando para qué sirve.
 *
 * ── Por qué sobre la interfaz de verdad y no con capturas ───────────────
 * Un tutorial con capturas envejece mal y, sobre todo, enseña una página
 * que no es la que el usuario tiene delante. Iluminando el botón auténtico
 * -- con SU plan, SUS precios -- lo que se aprende sirve en el mismo
 * momento en que se cierra el recorrido.
 *
 * ── Los pasos se saltan solos si no hay nada que señalar ────────────────
 * Los pasos marcados `optional` desaparecen si su elemento no está en la
 * página (la lista de la compra no existe hasta que hay un plan). Apuntar
 * a un hueco vacío sería peor que no explicar nada.
 *
 * ── El hueco ────────────────────────────────────────────────────────────
 * En vez de recortar el fondo (que obliga a SVG o a cuatro divs que se
 * descuadran al desplazarse), el hueco es un rectángulo transparente con
 * una sombra gigantesca: `box-shadow: 0 0 0 9999px rgba(...)`. La sombra
 * oscurece TODO lo que hay fuera del rectángulo, así que el "agujero" no
 * hay que dibujarlo, es lo único que la sombra no tapa.
 *
 * Depende de: js/core/onboarding.js (completeTour), js/data/tour-steps.js.
 *
 * Expone (globales):
 *   startTour()      → arranca desde el primer paso
 *   maybeStartTour() → arranca solo si al usuario le toca (tras su 1er plan)
 *   stopTour()       → cierra y da el recorrido por visto
 * ─────────────────────────────────────────────────────────────────────────
 */

var _tourIndex = 0;
var _tourVisible = [];
var _tourEls = null;
var _tourScrollHandler = null;

/** Crea el DOM del recorrido una sola vez, la primera que hace falta. */
function _tourBuild() {
  if (_tourEls) return _tourEls;

  var root = document.createElement("div");
  root.className = "tour";
  root.id = "tour";
  root.hidden = true;

  var hole = document.createElement("div");
  hole.className = "tour__hole";

  var card = document.createElement("div");
  card.className = "tour__card";
  card.setAttribute("role", "dialog");
  card.setAttribute("aria-live", "polite");

  var counter = document.createElement("p");
  counter.className = "tour__counter";

  var title = document.createElement("h3");
  title.className = "tour__title";

  var body = document.createElement("p");
  body.className = "tour__body";

  var nav = document.createElement("div");
  nav.className = "tour__nav";

  var skip = document.createElement("button");
  skip.type = "button";
  skip.className = "tour__skip";
  skip.textContent = "Saltar";

  // "Atrás" existe porque un recorrido solo de ida obliga a elegir entre
  // terminar sin haber entendido un paso o abandonarlo entero. Se oculta en
  // el primero en vez de dejarlo desactivado: un botón que no hace nada
  // invita a pulsarlo y a pensar que algo va mal.
  var prev = document.createElement("button");
  prev.type = "button";
  prev.className = "tour__prev";
  prev.textContent = "Atrás";

  var next = document.createElement("button");
  next.type = "button";
  next.className = "tour__next";
  next.textContent = "Siguiente";

  nav.appendChild(skip);
  nav.appendChild(prev);
  nav.appendChild(next);
  card.appendChild(counter);
  card.appendChild(title);
  card.appendChild(body);
  card.appendChild(nav);
  root.appendChild(hole);
  root.appendChild(card);
  document.body.appendChild(root);

  skip.addEventListener("click", stopTour);
  prev.addEventListener("click", _tourPrev);
  next.addEventListener("click", _tourNext);

  // Escape cierra: un recorrido del que no se puede salir es una trampa.
  document.addEventListener("keydown", function (ev) {
    if (ev.key === "Escape" && !root.hidden) stopTour();
  });

  _tourEls = { root: root, hole: hole, card: card, counter: counter,
               title: title, body: body, skip: skip, prev: prev, next: next };
  return _tourEls;
}

/** Los pasos cuyo elemento existe DE VERDAD en la página ahora mismo. */
function _tourResolveSteps() {
  var steps = (typeof TOUR_STEPS !== "undefined") ? TOUR_STEPS : [];
  return steps.filter(function (step) {
    var el = document.querySelector(step.target);
    if (el) return true;
    // Un paso no opcional que no encuentra su elemento es un error de
    // programación, no una situación normal: se avisa por consola en vez
    // de desaparecer en silencio, pero tampoco se rompe el recorrido.
    if (!step.optional) {
      console.warn("[tour] no existe el objetivo de un paso obligatorio:", step.target);
    }
    return false;
  });
}

/**
 * Coloca el hueco sobre el elemento y la nota junto a él.
 *
 * ── El hueco se RECORTA a la pantalla ───────────────────────────────────
 * Medido con el primer plan real: `#mealsContainer` mide 1.855 px de alto
 * en una ventana de 455. Iluminarlo entero no destaca nada -- el "foco"
 * era más grande que la pantalla y no quedaba ni un píxel oscurecido, o
 * sea que el recorrido señalaba "todo", que es lo mismo que no señalar.
 * Y la nota, colocada contra el borde inferior de ese rectángulo, se iba
 * fuera de la vista.
 *
 * Así que el hueco se limita a la parte VISIBLE del elemento, y la nota
 * se coloca contra ese rectángulo recortado, no contra el original.
 */
function _tourPosition() {
  var step = _tourVisible[_tourIndex];
  if (!step) return;
  var el = document.querySelector(step.target);
  if (!el) return;

  var r = el.getBoundingClientRect();
  var pad = 8;
  var margen = 12;
  var e = _tourEls;
  var vh = window.innerHeight;
  var vw = window.innerWidth;

  // Intersección con la pantalla, dejando sitio para que se note el borde
  // oscuro por arriba y por abajo.
  var top    = Math.max(margen, r.top - pad);
  var bottom = Math.min(vh - margen, r.bottom + pad);
  var left   = Math.max(margen, r.left - pad);
  var right  = Math.min(vw - margen, r.right + pad);

  // Un elemento altísimo se ilumina solo por su comienzo: es donde está su
  // encabezado y donde el usuario mira.
  //
  // El tope reserva sitio para la nota. Medido con la lista de la compra:
  // con un tope fijo del 60% el hueco llegaba tan abajo que la nota se
  // quedaba encima de él, tapando justo lo que estaba explicando.
  var cardH = e.card.offsetHeight || 160;
  var altoMax = Math.max(120, vh - cardH - margen * 3);
  if (bottom - top > altoMax) {
    bottom = top + altoMax;
  }

  var h = Math.max(0, bottom - top);
  var w = Math.max(0, right - left);

  e.hole.style.top    = top + "px";
  e.hole.style.left   = left + "px";
  e.hole.style.width  = w + "px";
  e.hole.style.height = h + "px";

  // La nota va debajo del hueco; si no cabe, encima; y si tampoco, se
  // pega al borde inferior de la pantalla. Nunca queda fuera de la vista.
  var cardW = e.card.offsetWidth || 300;

  var cardTop;
  if (vh - bottom > cardH + margen * 2) {
    cardTop = bottom + margen;
  } else if (top > cardH + margen * 2) {
    cardTop = top - cardH - margen;
  } else {
    cardTop = vh - cardH - margen;
  }
  cardTop = Math.max(margen, Math.min(cardTop, vh - cardH - margen));

  var cardLeft = Math.max(margen, Math.min(left, vw - cardW - margen));

  e.card.style.top = cardTop + "px";
  e.card.style.left = cardLeft + "px";
}

function _tourRender() {
  var step = _tourVisible[_tourIndex];
  var e = _tourEls;
  if (!step) { stopTour(); return; }

  var el = document.querySelector(step.target);
  if (el && typeof el.scrollIntoView === "function") {
    // "start" y no "center": con un elemento más alto que la pantalla,
    // centrarlo deja su comienzo -- que es lo que se explica -- fuera de
    // la vista, y el usuario ve un trozo cualquiera de la mitad.
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  e.counter.textContent = (_tourIndex + 1) + " de " + _tourVisible.length;
  e.title.textContent = step.title;
  e.body.textContent = step.body;
  e.next.textContent = (_tourIndex === _tourVisible.length - 1) ? "Entendido" : "Siguiente";
  e.prev.hidden = (_tourIndex === 0);

  // El desplazamiento suave tarda: se recoloca al terminar, y además en
  // cada scroll/resize mientras el recorrido esté abierto.
  _tourPosition();
  window.setTimeout(_tourPosition, 320);
}

function _tourNext() {
  if (_tourIndex >= _tourVisible.length - 1) {
    stopTour();
    return;
  }
  _tourIndex++;
  _tourRender();
}

function _tourPrev() {
  if (_tourIndex <= 0) return;
  _tourIndex--;
  _tourRender();
}

/** Arranca el recorrido desde el principio. */
function startTour() {
  var e = _tourBuild();
  _tourVisible = _tourResolveSteps();
  if (!_tourVisible.length) return;

  _tourIndex = 0;
  e.root.hidden = false;

  _tourScrollHandler = function () { _tourPosition(); };
  window.addEventListener("scroll", _tourScrollHandler, true);
  window.addEventListener("resize", _tourScrollHandler);

  _tourRender();
}

/**
 * Cierra el recorrido y lo da por visto -- también al saltarlo. Saltar es
 * una respuesta ("ya me apaño"), y volver a asaltar con lo mismo en la
 * siguiente visita sería no haberla escuchado. Para repetirlo está el
 * enlace del pie.
 */
function stopTour() {
  if (typeof completeTour === "function") {
    completeTour();
  }
  if (_tourScrollHandler) {
    window.removeEventListener("scroll", _tourScrollHandler, true);
    window.removeEventListener("resize", _tourScrollHandler);
    _tourScrollHandler = null;
  }
  if (_tourEls) _tourEls.root.hidden = true;
}

/**
 * Arranca el recorrido solo si al usuario le toca. Se llama después de
 * generar un plan: `hasPlan: true` es lo que hace que
 * nextOnboardingStep() devuelva "tour" (ver js/core/onboarding.js).
 */
function maybeStartTour() {
  if (typeof getOnboardingState !== "function") return;

  // La pregunta aquí es estrecha: "¿ya ha visto el recorrido?". Y se
  // responde mirando el estado, no pasando por nextOnboardingStep().
  //
  // Pasaba por ahí, y dejó de funcionar el día que se añadió la regla de
  // "sin cuenta, la bienvenida sale siempre": esa función empezó a
  // contestar "welcome" a todo el que no tuviera sesión, así que el
  // recorrido no salía nunca -- ni con cuenta, porque maybeStartTour ni
  // siquiera le pasaba `hasAccount`. Se descubrió generando un plan de
  // verdad al revisar el alta entera; los tests no lo veían porque
  // comprueban la máquina de estados, no quién la llama y con qué.
  //
  // La lección es la de siempre aquí: una función que decide "qué pantalla
  // toca" no sirve para responder "¿toca esta otra cosa?".
  var estado = getOnboardingState();
  if (estado && estado.tourDoneAt) return;
  // Un respiro antes de empezar: el plan acaba de aparecer y merece verse
  // un segundo antes de que algo se ponga por encima.
  window.setTimeout(startTour, 700);
}
