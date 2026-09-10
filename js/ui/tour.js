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
// ── La geometria, en un solo sitio ───────────────────────────────────────
//
// `_tourContexto`, `_tourPosition` y el desplazamiento tienen que decidir
// EXACTAMENTE igual: si uno cree que la nota va al lado y otro que va
// debajo, se elige un marco con una altura y se pinta con otra. Ya paso.
// Por eso las tres preguntas viven aqui y no repetidas en cada funcion.

var TOUR_MARGEN = 12;   // aire entre el marco, la nota y el borde
var TOUR_PAD = 8;       // aire entre lo enmarcado y el borde del marco

// `_tourTopInset` recorre TODOS los elementos de la pagina con
// `getComputedStyle` -- 2.514 en un plan normal, 3,0 ms por llamada aqui y
// bastante mas en un movil. Mientras estuvo solo en _tourRender (una vez
// por paso) daba igual; al entrar en _tourPosition paso a correr en CADA
// evento de scroll, y ademas cuatro veces por evento (una directa, dos por
// _tourContexto y otra por la comprobacion de la nota). Medido: 12,8 ms por
// evento, con 16,7 de presupuesto por fotograma -- de ahi que el recorrido
// "лагает" en el movil.
//
// La barra pegajosa no se mueve al desplazarse (comprobado: 52 px en siete
// posiciones de scroll distintas), asi que basta con calcularlo una vez por
// paso y al cambiar el tamaño de la ventana.
var _tourInsetCache = -1;

function _tourInset() {
  if (_tourInsetCache < 0) _tourInsetCache = _tourTopInset();
  return _tourInsetCache;
}

function _tourOlvidarInset() {
  _tourInsetCache = -1;
}

/**
 * .Se centra el bloque en la pantalla?
 *
 * Solo en pantallas anchas. Centrar TODO dejo el movil "сбилось": ahi los
 * once pasos usan la disposicion apilada, el marco ocupa casi toda la
 * altura y moverlo del sitio donde el dueno ya lo habia dado por bueno no
 * gana nada. En el portatil, donde el mismo cambio dejo "всё хорошо", los
 * marcos son pequenos y sobra pantalla.
 *
 * 900 px es el mismo corte que usa la hoja de estilos para la barra
 * pegajosa: una sola frontera entre "movil" y "escritorio" en todo el
 * proyecto, y no una nueva inventada aqui.
 */
function _tourCentrar() {
  return window.innerWidth >= 900;
}

function _tourCardW() {
  return (_tourEls && _tourEls.card && _tourEls.card.offsetWidth) || 340;
}

function _tourCardH() {
  return (_tourEls && _tourEls.card && _tourEls.card.offsetHeight) || 200;
}

/** .Cabe la nota AL LADO de un rectangulo, sin encogerlo? */
function _tourNotaAlLado(rect) {
  var falta = _tourCardW() + TOUR_MARGEN * 2;
  return (window.innerWidth - rect.right >= falta) || (rect.left >= falta);
}

/**
 * Alto maximo del marco. Con la nota al lado se lleva la pantalla entera;
 * apilada hay que reservarle su sitio, porque si no la nota acaba ENCIMA
 * del marco que esta explicando (medido en el movil: 28.023 px2 tapados en
 * el paso de la receta).
 */
function _tourAltoMaxMarco(alLado) {
  var libre = window.innerHeight - _tourInset();
  return alLado
    ? Math.max(120, libre - TOUR_MARGEN * 2)
    : Math.max(120, libre - _tourCardH() - TOUR_MARGEN * 3);
}

/**
 * La tarjeta o el panel donde vive lo que se explica.
 *
 * Sirve para que el usuario vea DONDE esta lo que se le senala: sin esto,
 * un boton pequeno se iluminaba solo y todo su alrededor quedaba tan oscuro
 * como el resto de la pagina, asi que se veia el boton pero no donde estaba.
 *
 * Devuelve null cuando ningun antepasado aporta nada: ahi el foco sobraria
 * y se enmarca el objetivo a secas.
 *
 * @param {Element} el
 * @returns {Element|null}
 */
function _tourContexto(el) {
  if (!el || !el.parentElement) return null;

  // "No cabe por poco" y "no cabe ni de lejos" son cosas distintas: la
  // tarjeta recortada sigue leyendose como una tarjeta, y el formulario
  // entero (1.689 px) no se lee como nada. De ahi el margen de vez y media,
  // topado por la pantalla para que el marco nunca la desborde entera.
  var altoMaxDebajo = Math.min(_tourAltoMaxMarco(false) * 1.5, window.innerHeight - 24);
  var altoMaxAlLado = _tourAltoMaxMarco(true);
  var anchoMax = window.innerWidth - 24;

  var r = el.getBoundingClientRect();
  var mejor = null;
  var p = el.parentElement;

  while (p && p !== document.body && p !== document.documentElement) {
    var pr = p.getBoundingClientRect();
    var altoMax = _tourNotaAlLado(pr) ? altoMaxAlLado : altoMaxDebajo;
    // En cuanto un antepasado NO cabe entero, se para: framear algo que hay
    // que recortar da una losa gris sin bordes visibles, que es justo lo
    // que el dueno califico de horrible en los pasos de los botones del
    // formulario (contexto .panel de 1.689 px en una pantalla de 900).
    if (pr.height > altoMax || pr.width > anchoMax) break;
    // Y tiene que aportar SITIO VISIBLE, no doce pixeles. Un envoltorio que
    // solo saca 4 px de ancho y 63 de alto al objetivo pinta un cerco verde
    // rodeado de otro gris casi identico: dos rectangulos, ninguna
    // informacion. Es lo que el dueno llamo "чуть чуть фигово" en el paso
    // de "fijar el plan de hoy" (.shopping-panel__actions, h4 v63). El
    // corte esta por encima de eso y por debajo del contexto que si vale
    // (.field del selector de dias, h4 v188).
    if (pr.height >= r.height + 96 || pr.width >= r.width + 96) mejor = p;
    p = p.parentElement;
  }

  // El MAS GRANDE que quepa, no el mas pequeno: el dueno aprobo la tarjeta
  // de comida entera (444x615) como contexto del boton "Cambiar", no la
  // fila que lo contiene. La unidad con sentido es la tarjeta.
  return mejor;
}

/**
 * Cuando hay que RECORTAR algo mas alto que la pantalla, corta por donde el
 * contenido ya se corta solo.
 *
 * La lista de la compra tiene filas de 84 px (194..278, 278..362,
 * 362..446...) y el recorte caia en 440: la tercera fila partida por la
 * mitad. En el movil el mismo corte caia entre filas y por eso alli se veia
 * bien y en el portatil no -- "lista de compra на телефоне хорошо на ноуте
 * хуёво".
 *
 * Solo se mueve hasta una fila de distancia: mas seria recortar por gusto.
 *
 * El corte solo puede moverse DENTRO de [minAbs, maxAbs]: el marco no puede
 * crecer mas alla de su banda ni encoger hasta dejar fuera lo señalado. Sin
 * ese limite, la fila mas cercana al corte de la lista de la compra caia 36
 * px por DEBAJO del final de la banda, se descartaba, y el corte se quedaba
 * partiendo la fila igual que antes. Medido: corte en 430, fila 382..466.
 *
 * @param {Element} el       lo que se esta enmarcando
 * @param {number} bordeAbs  y absoluta (de pagina) donde caeria el corte
 * @param {number} minAbs    lo mas arriba que puede quedar el corte
 * @param {number} maxAbs    lo mas abajo que puede quedar el corte
 * @returns {number} la y ajustada, o la misma si no hay nada cerca
 */
function _tourCorteLimpio(el, bordeAbs, minAbs, maxAbs) {
  var hijos = el.children;
  if (!hijos || hijos.length < 2) return bordeAbs;

  var desplazamiento = window.pageYOffset || document.documentElement.scrollTop || 0;
  var mejor = bordeAbs;
  var distMejor = Infinity;

  for (var i = 0; i < hijos.length; i++) {
    var hr = hijos[i].getBoundingClientRect();
    if (!hr.height) continue;
    // Los bordes de CADA hijo, y ademas los de sus filas cuando el hijo es
    // la lista: el corte feo estaba dentro de un <ul>, no entre los
    // bloques del panel.
    var candidatos = [hr.top + desplazamiento, hr.bottom + desplazamiento];
    if (hijos[i].children && hijos[i].children.length > 1) {
      for (var j = 0; j < hijos[i].children.length; j++) {
        var nr = hijos[i].children[j].getBoundingClientRect();
        if (nr.height) candidatos.push(nr.bottom + desplazamiento);
      }
    }
    for (var k = 0; k < candidatos.length; k++) {
      var cand = candidatos[k];
      if (cand < minAbs || cand > maxAbs) continue;
      var d = Math.abs(cand - bordeAbs);
      // Una fila de margen: 96 px cubre las de 84 de la lista de la compra
      // y las de 73 del movil, y no llega a saltarse un bloque entero.
      if (d < distMejor && d <= 96) { distMejor = d; mejor = cand; }
    }
  }

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
  var pad = TOUR_PAD;
  var margen = TOUR_MARGEN;
  var e = _tourEls;
  var vh = window.innerHeight;
  var vw = window.innerWidth;
  var inset = _tourInset();
  var cardH = _tourCardH();

  var left  = Math.max(margen, r.left - pad);
  var right = Math.min(vw - margen, r.right + pad);

  // .Cabe la nota AL LADO del marco? Cuando el marco es estrecho -- una
  // tarjeta de comida de 444 px en una pantalla de 1.400 -- sobra sitio a
  // la derecha, y ponerla ahi devuelve al marco toda la altura de la
  // pantalla.
  var alLado = _tourNotaAlLado({ left: left, right: right });

  // ── La BANDA donde puede vivir el marco ────────────────────────────────
  //
  // Apilada, la nota se decide ANTES que el marco y se le quita su trozo de
  // pantalla. Antes era al reves -- primero el marco, y la nota se apanaba
  // con lo que quedara -- y cuando no quedaba nada la nota se plantaba
  // ENCIMA del marco: 28.023 px2 tapados en el paso de la receta en el
  // movil, justo sobre la tarjeta que estaba explicando.
  //
  // La nota va ARRIBA cuando lo señalado esta en la mitad baja de la
  // pantalla. Ese caso es real: el enlace "como se cocina" vive al final de
  // una tarjeta de 631 px que no cabe entera, asi que el marco tiene que
  // enseñar su FINAL, y con la nota debajo no habia sitio para las dos
  // cosas. Con la nota arriba, si.
  // El criterio se mide DENTRO de lo enmarcado, no contra la pantalla: la
  // posicion en pantalla es justo lo que el desplazamiento esta cambiando,
  // y _tourDestino tiene que llegar a la misma conclusion que esta funcion
  // ANTES de mover nada. Con un criterio en coordenadas de pantalla, las
  // dos discrepaban durante la animacion y el marco daba un salto al final.
  var ro0 = objetivo.getBoundingClientRect();
  var recorta = (r.height + pad * 2) > _tourAltoMaxMarco(alLado);
  var frac = (ro0.top + ro0.height / 2 - r.top) / Math.max(1, r.height);
  var notaArriba = !alLado && recorta && frac > 0.55;

  var bandaTop, bandaBottom;
  if (alLado) {
    bandaTop = inset + margen;
    bandaBottom = vh - margen;
  } else if (notaArriba) {
    bandaTop = inset + margen + cardH + margen;
    bandaBottom = vh - margen;
  } else {
    bandaTop = inset + margen;
    bandaBottom = vh - margen - cardH - margen;
  }
  if (bandaBottom - bandaTop < 120) bandaBottom = bandaTop + 120;

  var top    = Math.max(bandaTop, r.top - pad);
  var bottom = Math.min(bandaBottom, r.bottom + pad);
  var altoMax = bandaBottom - bandaTop;

  if (bottom - top > altoMax) {
    bottom = top + altoMax;
  }

  // Un elemento altisimo se ilumina solo por su comienzo: es donde esta su
  // encabezado y donde el usuario mira. Pero el recorte no puede dejar
  // FUERA lo que se esta señalando: si el objetivo cae por debajo, la
  // ventana se desliza hasta contenerlo, conservando su altura.
  //
  // Solo si HAY recorte. Sin esta condicion, un contexto que cabe entero
  // entraba igualmente por la ultima rama y salia estirado a toda la banda:
  // el grupo de botones "Despensa"/"Sin cocinar" (94 px) se pintaba como un
  // marco de 458. Y entraba por medio pixel -- el desplazamiento dejaba el
  // contexto en 71,5 y la comparacion `ro0.top - pad < top` daba 63,5 < 64.
  // En el portatil no pasaba porque el centrado deja otros restos.
  if (!recorta) {
    // Cabe entero: no hay nada que deslizar ni que estirar.
  } else if (ro0.bottom + pad > bottom && ro0.top - pad < top) {
    // El objetivo es MAS alto que la banda: no hay nada que deslizar.
    top = bandaTop;
    bottom = bandaBottom;
  } else if (ro0.bottom + pad > bottom) {
    var corrimiento = Math.min(ro0.bottom + pad - bottom, top - bandaTop);
    if (corrimiento > 0) { top -= corrimiento; bottom -= corrimiento; }
    bottom = Math.min(bandaBottom, Math.max(bottom, ro0.bottom + pad));
    top = Math.max(bandaTop, bottom - altoMax);
  } else if (ro0.top - pad < top) {
    var subida = Math.min(top - (ro0.top - pad), bandaBottom - bottom);
    if (subida > 0) { top += subida; bottom += subida; }
    top = Math.max(bandaTop, Math.min(top, ro0.top - pad));
    bottom = Math.min(bandaBottom, top + altoMax);
  }

  // Si ha habido recorte, que corte por donde el contenido ya se corta:
  // una fila partida por la mitad es lo que hacia feo el paso de la lista
  // de la compra en el portatil.
  if (bottom < r.bottom + pad - 1) {
    var desplazamiento = window.pageYOffset || document.documentElement.scrollTop || 0;
    // Lo mas arriba que puede subir el corte: sin dejar el marco enano y,
    // cuando hay contexto, sin dejar fuera lo señalado. Cuando lo señalado
    // ES lo enmarcado no cabe entero de todas formas, y exigir contenerlo
    // impedia cualquier ajuste.
    var minCorte = top + 120;
    if (contexto) minCorte = Math.max(minCorte, Math.min(ro0.bottom + pad, bandaBottom));
    bottom = _tourCorteLimpio(
      el,
      bottom + desplazamiento,
      minCorte + desplazamiento,
      bandaBottom + desplazamiento
    ) - desplazamiento;
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
    // Al lado del marco y CENTRADA con lo enfocado -- no alineada con su
    // borde de arriba: asi la explicacion queda enfrente de lo que explica
    // en vez de colgando por encima.
    cardTop = anclaTop + (anclaBottom - anclaTop) / 2 - cardH / 2;
    cardTop = Math.max(inset + margen, Math.min(cardTop, vh - cardH - margen));
    cardLeft = (vw - right >= cardW + margen * 2)
      ? right + margen
      : left - cardW - margen;
    cardLeft = Math.max(margen, Math.min(cardLeft, vw - cardW - margen));
  } else {
    // Apilada, la nota ocupa el trozo de pantalla que la banda del marco ha
    // dejado libre a proposito. No hay que buscarle sitio ni comprobar si
    // cabe: se le reservo antes de decidir el marco, asi que por
    // construccion no puede solaparse con el.
    cardTop = notaArriba
      ? Math.max(inset + margen, top - margen - cardH)
      : bottom + margen;
    cardTop = Math.max(inset + margen, Math.min(cardTop, vh - cardH - margen));
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

/**
 * A que altura de la pantalla hay que dejar lo enmarcado.
 *
 * CENTRADO, no pegado arriba. Antes todo aterrizaba en y=12 y en los pasos
 * de un boton eso dejaba un marco de 104 px arriba del todo con 600 px de
 * oscuridad debajo -- medido: los pasos 4, 6, 7, 8, 9, 10 y 11 caian entre
 * 218 y 296 px por encima del centro. "сделай так чтобы всё было +- по
 * центру а не вверху или внизу экрана".
 *
 * Se centra el BLOQUE entero (marco + nota cuando va apilada), no solo el
 * marco: centrar el marco y colgarle la nota debajo descuadra el conjunto
 * hacia abajo.
 *
 * @param {Element} el        lo que se va a enmarcar
 * @param {Element} objetivo  lo que se señala dentro de ello
 * @returns {number} desplazamiento de pagina al que hay que ir
 */
function _tourDestino(el, objetivo) {
  var desde = window.pageYOffset || document.documentElement.scrollTop || 0;
  var r = el.getBoundingClientRect();
  var vh = window.innerHeight;
  var inset = _tourInset();
  var cardH = _tourCardH();

  var left = Math.max(TOUR_MARGEN, r.left - TOUR_PAD);
  var right = Math.min(window.innerWidth - TOUR_MARGEN, r.right + TOUR_PAD);
  var alLado = _tourNotaAlLado({ left: left, right: right });

  var altoBanda = _tourAltoMaxMarco(alLado);
  var altoMarco = Math.min(r.height + TOUR_PAD * 2, altoBanda);
  var bloque = alLado ? altoMarco : (altoMarco + TOUR_MARGEN + cardH);

  var arriba = _tourCentrar()
    ? inset + Math.max(TOUR_MARGEN, (vh - inset - bloque) / 2)
    : inset + TOUR_MARGEN;

  // Con la nota ARRIBA el marco empieza despues de ella. Mismo criterio que
  // _tourPosition, pero medido DENTRO de lo enmarcado y no contra la
  // pantalla, que es lo unico que no cambia al desplazarse.
  var ro = (objetivo || el).getBoundingClientRect();
  var recorta = (r.height + TOUR_PAD * 2) > altoBanda;
  var frac = (ro.top + ro.height / 2 - r.top) / Math.max(1, r.height);
  var notaArriba = !alLado && recorta && frac > 0.55;
  if (notaArriba) arriba += cardH + TOUR_MARGEN;

  // Recortando y con la nota arriba se enseña el FINAL de lo enmarcado --
  // ahi esta lo señalado. En cualquier otro caso, su comienzo.
  var hasta = notaArriba
    ? desde + r.bottom - (arriba + altoMarco - TOUR_PAD)
    : desde + r.top - (arriba + TOUR_PAD);

  var maximo = Math.max(0, (document.documentElement.scrollHeight || 0) - vh);
  return Math.max(0, Math.min(maximo, hasta));
}

function _tourScrollSuave(el, objetivo) {
  if (_tourScrollRaf) { window.cancelAnimationFrame(_tourScrollRaf); _tourScrollRaf = null; }

  var desde = window.pageYOffset || document.documentElement.scrollTop || 0;
  var hasta = _tourDestino(el, objetivo);
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
  // Una sola medida del inset por paso: dentro de un paso no cambia, y
  // medirla en cada evento de scroll era casi todo el coste de
  // _tourPosition.
  _tourOlvidarInset();

  // Se desplaza hasta lo que se va a ENMARCAR, que es el contexto cuando
  // lo hay. Llevando el objetivo al borde de arriba, la tarjeta que lo
  // contiene se quedaba por encima de la pantalla: el marco de contexto se
  // recortaba a una franja de 51 px y el foco no cabia dentro. Medido.
  var objetivo = document.querySelector(step.target);

  // El texto va ANTES del desplazamiento. La cuenta del centrado necesita
  // saber cuanto mide la nota, y hasta que no lleva el texto de ESTE paso
  // mide lo que midiera el anterior -- con notas de 3 y de 6 lineas el
  // error son 60 px de descuadre.
  e.counter.textContent = (_tourIndex + 1) + " de " + _tourVisible.length;
  e.title.textContent = step.title;
  e.body.textContent = step.body;
  e.next.textContent = (_tourIndex === _tourVisible.length - 1) ? "Entendido" : "Siguiente";
  e.prev.hidden = (_tourIndex === 0);

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
    el.style.scrollMarginTop = (_tourInset() + 12) + "px";

    // El destino lo calcula _tourDestino: centra el bloque, y con algo mas
    // alto que la pantalla enseña su comienzo (o su final, si es ahi donde
    // esta lo señalado) en vez de un trozo cualquiera de la mitad.
    _tourScrollSuave(el, objetivo);
  }

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

  _tourScrollHandler = function (ev) {
    // Al cambiar el tamaño puede aparecer o desaparecer la barra pegajosa,
    // asi que ahi el inset se vuelve a medir; al desplazarse no cambia.
    if (ev && ev.type === "resize") _tourOlvidarInset();
    _tourPosition();
  };
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
