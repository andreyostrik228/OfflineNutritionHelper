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
// .Ha llegado el recorrido a estar EN PANTALLA en esta ejecucion? Ver
// stopTour(): decide si se marca como visto.
var _tourSeVio = false;
var _tourScrollHandler = null;

/** Crea el DOM del recorrido una sola vez, la primera que hace falta. */
function _tourBuild() {
  if (_tourEls) return _tourEls;

  var root = document.createElement("div");
  root.className = "tour";
  root.id = "tour";
  root.hidden = true;

  // Dos huecos, no uno. El de CONTEXTO deja ver la tarjeta o el panel donde
  // vive lo que se explica; el de FOCO señala la cosa concreta dentro de
  // ella. Con un solo hueco sobre un botón pequeño, la tarjeta que lo
  // contiene quedaba tan oscura como el resto de la página y no se sabía
  // DÓNDE estaba ese botón -- que era justo lo que el recorrido tenía que
  // enseñar.
  var hole = document.createElement("div");
  hole.className = "tour__hole";

  var foco = document.createElement("div");
  foco.className = "tour__foco";
  foco.hidden = true;

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
/**
 * La tarjeta o el panel donde vive lo que se explica.
 *
 * Sirve para que el usuario vea DONDE esta lo que se le senala: sin esto,
 * un boton pequeno se iluminaba solo y todo su alrededor quedaba tan oscuro
 * como el resto de la pagina, asi que se veia el boton pero no donde estaba.
 *
 * Devuelve null cuando el propio objetivo YA es la tarjeta o el panel: ahi
 * no hay nada que contextualizar y el foco sobraria.
 *
 * @param {Element} el
 * @returns {Element|null}
 */
function _tourContexto(el) {
  if (!el || !el.parentElement) return null;

  // Cuanto sitio hay de verdad: la pantalla menos la nota y sus margenes.
  var cardH = (_tourEls && _tourEls.card && _tourEls.card.offsetHeight) || 200;
  var hueco = Math.max(120, window.innerHeight - cardH - 36);

  // Con el hueco a secas, en una pantalla de 720 la tarjeta de comida (587)
  // se rechazaba por 147 px y el paso de la receta se quedaba SIN contexto:
  // un marco de 30 px alrededor del enlace y ni rastro del plato. Eso es lo
  // que el dueno describio como "no se ve mi dia".
  //
  // "No cabe por poco" y "no cabe ni de lejos" son cosas distintas: la
  // tarjeta recortada sigue leyendose como una tarjeta, y el formulario
  // entero (1.689 px) no se lee como nada. De ahi el margen de vez y media,
  // topado por la pantalla para que el marco nunca la desborde entera.
  var altoMaxDebajo = Math.min(hueco * 1.5, window.innerHeight - 24);
  var altoMaxAlLado = window.innerHeight - 24;
  var anchoMax = window.innerWidth - 24;
  var cardW = (_tourEls && _tourEls.card && _tourEls.card.offsetWidth) || 340;

  var r = el.getBoundingClientRect();
  var mejor = null;
  var p = el.parentElement;

  while (p && p !== document.body && p !== document.documentElement) {
    var pr = p.getBoundingClientRect();
    // Mismo criterio que _tourPosition: si la nota cabe AL LADO de este
    // candidato, el marco dispone de toda la altura de la pantalla. Las dos
    // funciones tienen que decidir igual o eligen marcos distintos.
    var notaAlLado = (window.innerWidth - pr.right >= cardW + 24) || (pr.left >= cardW + 24);
    var altoMax = notaAlLado ? altoMaxAlLado : altoMaxDebajo;
    // En cuanto un antepasado NO cabe entero, se para: framear algo que hay
    // que recortar da una losa gris sin bordes visibles, que es justo lo
    // que el dueno califico de horrible en los pasos de los botones del
    // formulario (contexto .panel de 1.689 px en una pantalla de 900).
    if (pr.height > altoMax || pr.width > anchoMax) break;
    // Y tiene que aportar algo: un envoltorio del mismo tamano que el
    // objetivo no ensena donde esta nada.
    if (pr.height >= r.height + 12 || pr.width >= r.width + 12) mejor = p;
    p = p.parentElement;
  }

  // El MAS GRANDE que quepa, no el mas pequeno: el dueno aprobo la tarjeta
  // de comida entera (444x615) como contexto del boton "Cambiar", no la
  // fila que lo contiene. La unidad con sentido es la tarjeta.
  return mejor;
}

function _tourPosition() {
  var step = _tourVisible[_tourIndex];
  if (!step) return;
  var objetivo = document.querySelector(step.target);
  if (!objetivo) return;

  // El hueco oscuro enmarca el CONTEXTO; el foco gris, el objetivo.
  var contexto = _tourContexto(objetivo);
  var el = contexto || objetivo;

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
  var cardW0 = e.card.offsetWidth || 300;

  // ¿Cabe la nota AL LADO del marco? Cuando el marco es estrecho -- una
  // tarjeta de comida de 444 px en una pantalla de 1.400 -- sobra sitio a
  // la derecha, y ponerla ahi devuelve al marco toda la altura de la
  // pantalla. Con la nota siempre debajo, la tarjeta de comida (646 px) no
  // cabia en los 440 que quedaban, habia que recortarla y el recorte
  // desplazaba la vista: es el "no se ve mi dia, me tira hacia abajo".
  var alLado = (vw - right >= cardW0 + margen * 2) || (left >= cardW0 + margen * 2);

  // Con la nota al lado no hay que reservar altura para ella.
  var altoMax = alLado
    ? Math.max(120, vh - margen * 2)
    : Math.max(120, vh - cardH - margen * 3);
  if (bottom - top > altoMax) {
    bottom = top + altoMax;
    // El recorte no puede dejar FUERA lo que se esta señalando. Con la
    // tarjeta de una comida, el trozo explicado ("como se cocina") esta
    // abajo del todo y el recorte por arriba lo cortaba: el foco se
    // quedaba sin sitio y no se encendia. Si pasa, la ventana se desliza
    // hasta contenerlo, conservando su altura.
    if (contexto) {
      var ro0 = objetivo.getBoundingClientRect();
      if (ro0.bottom + pad > bottom) {
        var corrimiento = Math.min(ro0.bottom + pad - bottom, top - margen);
        if (corrimiento > 0) { top -= corrimiento; bottom -= corrimiento; }
        bottom = Math.min(vh - margen, Math.max(bottom, ro0.bottom + pad));
        top = Math.max(margen, bottom - altoMax);
      }
    }
  }

  var h = Math.max(0, bottom - top);
  var w = Math.max(0, right - left);

  e.hole.style.top    = top + "px";
  e.hole.style.left   = left + "px";
  e.hole.style.width  = w + "px";
  e.hole.style.height = h + "px";

  // El foco: la cosa concreta, dentro del contexto ya iluminado. Sin
  // contexto no hay nada que atenuar, asi que no se enciende.
  var foco = null;
  if (contexto) {
    var ro = objetivo.getBoundingClientRect();
    // Solo si de verdad se ve: un objetivo que ha quedado fuera del recorte
    // del contexto senalaria una zona vacia de la pantalla.
    var fTop = Math.max(top, ro.top - 6);
    var fBottom = Math.min(top + h, ro.bottom + 6);
    var fLeft = Math.max(left, ro.left - 6);
    var fRight = Math.min(left + w, ro.right + 6);
    if (fBottom - fTop > 4 && fRight - fLeft > 4) {
      var areaFoco = (fBottom - fTop) * (fRight - fLeft);
      var areaCtx = Math.max(1, w * h);
      // Si el foco ocupa casi todo el contexto no distingue nada: seria un
      // velo gris sobre un margen de cuatro pixeles. Mejor no encenderlo.
      if (areaFoco / areaCtx < 0.8) {
        foco = { top: fTop, left: fLeft, w: fRight - fLeft, h: fBottom - fTop };
      }
    }
  }
  if (foco) {
    e.foco.hidden = false;
    e.foco.style.top    = foco.top + "px";
    e.foco.style.left   = foco.left + "px";
    e.foco.style.width  = foco.w + "px";
    e.foco.style.height = foco.h + "px";
  } else {
    e.foco.hidden = true;
  }

  // La nota va debajo del hueco; si no cabe, encima; y si tampoco, se
  // pega al borde inferior de la pantalla. Nunca queda fuera de la vista.
  var cardW = e.card.offsetWidth || 300;

  // La nota se coloca junto a lo ENFOCADO, no junto al contexto: si no,
  // al senalar un boton pequeno la nota se iba al borde de la tarjeta
  // entera y quedaba lejos de lo que estaba explicando.
  var anclaTop = foco ? foco.top : top;
  var anclaBottom = foco ? (foco.top + foco.h) : bottom;
  var anclaLeft = foco ? foco.left : left;

  var cardTop, cardLeft;

  if (alLado) {
    // Al lado del marco, a la altura de lo enfocado: asi la explicacion
    // esta enfrente de lo que explica y el marco se queda entero.
    cardTop = Math.max(margen, Math.min(anclaTop, vh - cardH - margen));
    cardLeft = (vw - right >= cardW + margen * 2)
      ? right + margen
      : left - cardW - margen;
    cardLeft = Math.max(margen, Math.min(cardLeft, vw - cardW - margen));
  } else {
    // Apilada, la nota tiene que salvar el MARCO entero, no solo el foco.
    // El foco suele estar arriba del contexto, asi que "debajo del foco"
    // cae DENTRO del marco: en la lista de la compra la nota se plantaba
    // sobre los ultimos 35px del recuadro que estaba explicando. Al lado
    // no pasa, porque ahi no se solapan por altura.
    var bajoTodo = Math.max(anclaBottom, bottom);
    var sobreTodo = Math.min(anclaTop, top);
    if (vh - bajoTodo > cardH + margen * 2) {
      cardTop = bajoTodo + margen;
    } else if (sobreTodo > cardH + margen * 2) {
      cardTop = sobreTodo - cardH - margen;
    } else {
      cardTop = vh - cardH - margen;
    }
    cardTop = Math.max(margen, Math.min(cardTop, vh - cardH - margen));
    cardLeft = Math.max(margen, Math.min(anclaLeft, vw - cardW - margen));
  }

  e.card.style.top = cardTop + "px";
  e.card.style.left = cardLeft + "px";
}

/**
 * Alto de lo que esté PEGADO ARRIBA y vaya a taparle el sitio al elemento
 * que se resalta.
 *
 * El caso real (reportado el 2026-09-03: "кнопки подсвечиваются, но они
 * слишком высоко, их не видно"): en móvil la franja "siguiente toma"
 * (`.next-meal-sticky`) va `position: sticky; top: 0` y mide 52px. Como el
 * recorrido alinea el elemento con el borde superior, los seis pasos
 * dejaban al resaltado en `top: 16` -- es decir, con 36px metidos DEBAJO de
 * la franja. En un botón de 43px de alto quedaban 7px a la vista, y había
 * que subir a mano para verlo. En escritorio no pasaba: esa franja solo
 * existe por debajo de 900px, que es justo por qué no se vio antes.
 *
 * Se busca en vez de mirar un id concreto para que una barra futura no
 * vuelva a romper esto en silencio. El tope de 200px descarta las capas a
 * pantalla completa (el alta, el propio recorrido), que no son barras.
 *
 * @returns {number} píxeles ocupados arriba
 */
function _tourTopInset() {
  var inset = 0;
  var nodes = document.querySelectorAll("body *");

  for (var i = 0; i < nodes.length; i++) {
    var el = nodes[i];
    if (_tourEls && _tourEls.root && _tourEls.root.contains(el)) continue;

    var cs = window.getComputedStyle(el);
    if (cs.position !== "sticky" && cs.position !== "fixed") continue;
    if (cs.display === "none" || cs.visibility === "hidden") continue;
    if (parseFloat(cs.top) !== 0) continue;

    var h = el.getBoundingClientRect().height;
    if (h > 0 && h < 200) inset = Math.max(inset, h);
  }

  return inset;
}

// El elemento al que se le puso un `scroll-margin-top` prestado, para poder
// devolvérselo: es una propiedad del elemento REAL de la página, y dejarla
// puesta cambiaría cómo le hacen scroll otros (p. ej. el salto desde la
// franja de horario a una tarjeta de comida).
var _tourScrollMarginEl = null;
var _tourScrollMarginPrev = "";

function _tourRestoreScrollMargin() {
  if (!_tourScrollMarginEl) return;
  _tourScrollMarginEl.style.scrollMarginTop = _tourScrollMarginPrev;
  _tourScrollMarginEl = null;
  _tourScrollMarginPrev = "";
}

// ── El desplazamiento entre pasos ────────────────────────────────────────
//
// Se anima a mano y NO con `scrollIntoView({behavior:"smooth"})`.
//
// Medido en un portatil: `scrollIntoView` con `smooth` salta de golpe
// -- 951 px a 1555 px en un solo fotograma, a los 19 ms -- cuando el
// sistema tiene activado "reducir movimiento". Chrome respeta esa
// preferencia tambien para la version JS de la llamada, aunque se le pida
// `smooth` explicitamente. En un movil sin esa preferencia se desliza; de
// ahi que el mismo recorrido se sintiera distinto en cada aparato.
//
// Aqui el movimiento NO es decoracion: es lo que dice "lo que te voy a
// enseñar esta MAS ABAJO". Un salto seco deja al usuario sin saber a donde
// ha ido a parar, que es justo lo que el recorrido existe para evitar. Asi
// que se anima siempre, pero con la preferencia respetada en la DURACION:
// corta cuando se pide menos movimiento, normal cuando no.
var _tourScrollRaf = null;

function _tourPrefiereMenosMovimiento() {
  try {
    return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  } catch (e) { return false; }
}

function _tourScrollSuave(el) {
  if (_tourScrollRaf) { window.cancelAnimationFrame(_tourScrollRaf); _tourScrollRaf = null; }

  var desde = window.pageYOffset || document.documentElement.scrollTop || 0;
  var r = el.getBoundingClientRect();
  var maximo = Math.max(0, (document.documentElement.scrollHeight || 0) - window.innerHeight);
  var hasta = Math.max(0, Math.min(maximo, desde + r.top - (_tourTopInset() + 12)));
  var salto = hasta - desde;
  if (Math.abs(salto) < 2) return;

  if (typeof window.requestAnimationFrame !== "function") {
    window.scrollTo(0, hasta);
    return;
  }

  // La hoja pone `scroll-behavior: smooth` en la raiz, asi que CADA
  // `scrollTo` de esta animacion se suavizaria por su cuenta: dos
  // animaciones peleandose por el mismo scroll, con el resultado de que
  // ninguna llega. Se apaga mientras dura y se devuelve al terminar.
  var raiz = document.documentElement;
  var behaviorPrevio = raiz.style.scrollBehavior;
  raiz.style.scrollBehavior = "auto";
  function terminar() {
    raiz.style.scrollBehavior = behaviorPrevio;
    _tourScrollRaf = null;
  }

  var duracion = _tourPrefiereMenosMovimiento() ? 200 : 480;
  var t0 = null;
  function paso(ahora) {
    if (t0 === null) t0 = ahora;
    var k = Math.min(1, (ahora - t0) / duracion);
    // easeInOutCubic: arranca y frena despacio, que es lo que hace que se
    // lea como "me estan llevando" y no como "me han movido".
    var f = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
    window.scrollTo(0, desde + salto * f);
    if (k < 1) _tourScrollRaf = window.requestAnimationFrame(paso);
    else terminar();
  }
  _tourScrollRaf = window.requestAnimationFrame(paso);

  // Red de seguridad: en una pestaña en segundo plano el navegador NO
  // ejecuta requestAnimationFrame, asi que la animacion no arranca y el
  // recorrido se quedaria señalando algo que no esta en pantalla.
  // Comprobado a las malas: la panel de pruebas estaba oculta y ningun
  // fotograma llego a correr.
  //
  // Pasado el tiempo de la animacion, si no ha llegado, se lleva de golpe.
  // Saltar es peor que deslizar y mucho mejor que no moverse.
  window.setTimeout(function () {
    if (_tourScrollRaf === null) return;      // la animacion ya termino
    window.cancelAnimationFrame(_tourScrollRaf);
    raiz.style.scrollBehavior = "auto";
    window.scrollTo(0, hasta);
    terminar();
  }, duracion + 260);
}

function _tourRender() {
  var step = _tourVisible[_tourIndex];
  var e = _tourEls;
  if (!step) { stopTour(); return; }

  _tourRestoreScrollMargin();

  // Se desplaza hasta lo que se va a ENMARCAR, que es el contexto cuando
  // lo hay. Llevando el objetivo al borde de arriba, la tarjeta que lo
  // contiene se quedaba por encima de la pantalla: el marco de contexto se
  // recortaba a una franja de 51 px y el foco no cabia dentro. Medido.
  var objetivo = document.querySelector(step.target);
  var el = _tourContexto(objetivo) || objetivo;
  if (el && typeof el.scrollIntoView === "function") {
    // El hueco se reserva con `scroll-margin-top` y NO restando píxeles
    // después: así la cuenta la hace el navegador dentro del propio
    // desplazamiento. Ajustar a mano tras un scroll suave ya falló aquí una
    // vez -- el resultado dependía de CUÁNDO se midiera y caía distinto en
    // cada intento (ver el andamiaje de `alignToSameMeal` que hubo que
    // borrar).
    _tourScrollMarginEl = el;
    _tourScrollMarginPrev = el.style.scrollMarginTop;
    el.style.scrollMarginTop = (_tourTopInset() + 12) + "px";

    // "start" y no "center": con un elemento más alto que la pantalla,
    // centrarlo deja su comienzo -- que es lo que se explica -- fuera de
    // la vista, y el usuario ve un trozo cualquiera de la mitad.
    _tourScrollSuave(el);
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
  // A partir de aquí el recorrido está EN PANTALLA. Ver stopTour(): solo
  // cuenta como "visto" lo que se ha llegado a ver.
  _tourSeVio = true;

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
  // Se devuelve el `scroll-margin-top` prestado ANTES de nada: si el
  // recorrido se cierra a mitad, ese margen se quedaría puesto en un
  // elemento de la página para siempre.
  _tourRestoreScrollMargin();

  // "Visto" solo si de verdad llegó a la pantalla.
  //
  // Antes se marcaba SIEMPRE, y eso apaga el recorrido PARA SIEMPRE: basta
  // con que stopTour() se llame una vez sin haber enseñado nada (un paso
  // que no resuelve, un cierre inmediato, cualquier camino futuro) para que
  // maybeStartTour() no vuelva a arrancarlo jamás. Es exactamente la forma
  // del fallo reportado el 2026-09-03: "туториал не появляется... ни разу
  // не видел". No se pudo reproducir aquí en cuatro intentos (estado
  // vacío, estado de invitado, alta completa real y viewport de móvil), y
  // esta es la única vía en el código por la que la marca puede quedar
  // puesta sin que nadie haya visto nada.
  //
  // Marcar por error "no visto" solo cuesta que el recorrido salga otra
  // vez. Marcar por error "visto" cuesta que no salga nunca. La asimetría
  // decide.
  if (_tourSeVio && typeof completeTour === "function") {
    completeTour();
  }
  _tourSeVio = false;
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
