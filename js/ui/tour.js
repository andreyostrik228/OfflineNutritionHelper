/**
 * js/ui/tour.js
 * ─────────────────────────────────────────────────────────────────────────
 * El recorrido guiado: una hoja a pantalla completa con escenas animadas
 * (js/ui/tour-scenes.js) que explican, una a una, para qué sirve cada cosa de
 * la aplicación.
 *
 * ── Por qué ya NO señala la página de verdad (2026-10-08) ───────────────
 * La versión anterior oscurecía la página, abría un hueco sobre cada botón y la
 * desplazaba hasta él (y, en el móvil, cambiaba de pestaña). Eso daba tirones
 * por construcción: cada paso movía la página, un botón pegado a la pantalla
 * (position: sticky) no se dejaba llevar, y hacía falta un plan ya pintado --
 * sin él, «Ver la explicación otra vez» echaba a la bienvenida. Ahora es un
 * <dialog> modal con su propia escena por paso: no toca la página, no necesita
 * plan y se ve igual en los diez aspectos.
 *
 * Al ser un <dialog> con showModal() va en la capa superior del navegador:
 * ningún otro diálogo (el de «plan activo», el de la cuenta...) lo tapa, que
 * era justo lo que le pasaba a la pregunta de antes.
 *
 * ── Cómo se usa ─────────────────────────────────────────────────────────
 * Al terminar el cuestionario se PREGUNTA (offerTour): «sí» abre el recorrido y,
 * cuando se cierra, se genera el plan; «no» se recuerda. «Ver la explicación
 * otra vez» (pie y menú ☰) llama a startTour() directamente.
 *
 * Depende de: js/core/onboarding.js (completeTour), js/data/tour-steps.js,
 *   js/ui/tour-scenes.js, js/ui/tour-fx.js (opcional), t().
 *
 * Expone (globales):
 *   startTour(opts?)  → abre el recorrido; opts.alCerrar() se llama al cerrarse
 *   stopTour()        → lo cierra (y lo da por visto)
 *   offerTour(cb?)    → pregunta si quiere verlo; cb(quiere) al contestar
 *   maybeStartTour()  → pregunta solo si al usuario le toca (tras su 1er plan)
 *   refreshTourTexts()→ repinta en el idioma de ahora mismo
 * ─────────────────────────────────────────────────────────────────────────
 */

var _tourEls = null;
var _tourAsk = null;
var _tourPasos = [];
var _tourIndex = 0;
var _tourDir = 1;
var _tourEscena = null;          // {parar()} de la escena que está sonando
var _tourEscenaEl = null;        // el <div> de esa escena
var _tourEspera = null;          // retraso pendiente antes de montar una escena
var _tourAlResponder = null;     // quien espera la respuesta a la pregunta
var _tourAlCerrar = null;        // quien espera a que se cierre el recorrido
var _tourSaliendo = false;
var _tourSeVio = false;
var _tourTocado = null;          // dónde empezó el dedo (para los deslizamientos)

// Cuándo se estrenó el recorrido actual. Quien lo «vio» ANTES de esa fecha vio
// uno que no se parece: se le vuelve a ofrecer, una vez. Una fecha que no se
// entiende cuenta como vista: ante la duda no se molesta.
var TOUR_ESTRENO = "2026-10-06T00:00:00.000Z";

// El color de cada escena: la variable CSS de un macro, que cada aspecto ya
// define. Da variedad sin inventar colores.
var TOUR_ACENTOS = {
  plan: "kcal", dias: "protein", cambiar: "carbs", compra: "fat", mercadona: "kcal",
  hoy: "volt", generar: "protein", atajos: "carbs", menu: "fat"
};

/**
 * Traduce, y si no hay traduccion se queda con el original.
 *
 * `t()` devuelve la CLAVE cuando no conoce una -- a proposito, para que un
 * hueco se vea en pantalla en vez de quedarse en blanco. Aqui eso no sirve:
 * el espanol de estos textos existe y esta a mano, asi que un hueco tiene
 * que caer al original y no pintar "tour.plan_titulo" en la tarjeta.
 */
function _tourT(clave, original) {
  if (typeof t !== "function") return original;
  var traducido = t(clave);
  return (traducido && traducido !== clave) ? traducido : original;
}

function _tourTextoPaso(paso, campo) {
  var original = (campo === "titulo") ? paso.title : paso.body;
  return _tourT("tour." + paso.id + "_" + campo, original);
}

function _tourDiv(clase) {
  var d = document.createElement("div");
  d.className = clase;
  return d;
}

// ── La hoja ──────────────────────────────────────────────────────────────

/** Crea el DOM del recorrido una sola vez, la primera que hace falta. */
function _tourBuild() {
  if (_tourEls) return _tourEls;

  var root = document.createElement("dialog");
  root.className = "tour";
  root.id = "tour";
  root.hidden = true;
  root.setAttribute("aria-labelledby", "tourTitulo");

  var card = _tourDiv("tour__card");

  var top = _tourDiv("tour__top");
  var segmentos = _tourDiv("tour__segmentos");
  var cerrar = document.createElement("button");
  cerrar.type = "button";
  cerrar.className = "tour__x";
  cerrar.textContent = "×";
  top.appendChild(segmentos);
  top.appendChild(cerrar);

  var escena = _tourDiv("tour__escena");
  escena.setAttribute("aria-hidden", "true");
  var manchaA = document.createElement("i");
  manchaA.className = "tour__mancha tour__mancha--a";
  var manchaB = document.createElement("i");
  manchaB.className = "tour__mancha tour__mancha--b";
  escena.appendChild(manchaA);
  escena.appendChild(manchaB);

  var texto = _tourDiv("tour__texto");
  var counter = document.createElement("p");
  counter.className = "tour__counter";
  var title = document.createElement("h3");
  title.className = "tour__title";
  title.id = "tourTitulo";
  var body = document.createElement("p");
  body.className = "tour__body";
  texto.appendChild(counter);
  texto.appendChild(title);
  texto.appendChild(body);

  var nav = _tourDiv("tour__nav");
  var skip = document.createElement("button");
  skip.type = "button";
  skip.className = "tour__skip";
  var prev = document.createElement("button");
  prev.type = "button";
  prev.className = "tour__prev";
  var next = document.createElement("button");
  next.type = "button";
  next.className = "tour__next";
  nav.appendChild(skip);
  nav.appendChild(prev);
  nav.appendChild(next);

  card.appendChild(top);
  card.appendChild(escena);
  card.appendChild(texto);
  card.appendChild(nav);
  root.appendChild(card);
  document.body.appendChild(root);

  skip.addEventListener("click", stopTour);
  cerrar.addEventListener("click", stopTour);
  prev.addEventListener("click", _tourPrev);
  next.addEventListener("click", _tourNext);

  // Escape: el <dialog> se cerraría por su cuenta dejando el recorrido a
  // medias (candado de la página puesto, escena sonando); se cierra bien.
  root.addEventListener("cancel", function (ev) {
    if (ev.preventDefault) ev.preventDefault();
    stopTour();
  });
  root.addEventListener("keydown", function (ev) {
    if (ev.key === "ArrowRight") { ev.preventDefault(); _tourNext(); }
    else if (ev.key === "ArrowLeft") { ev.preventDefault(); _tourPrev(); }
  });

  // Deslizar hacia los lados pasa de escena, como en cualquier carrusel.
  card.addEventListener("pointerdown", function (ev) {
    _tourTocado = (ev.target && ev.target.closest && ev.target.closest("button"))
      ? null : { x: ev.clientX, y: ev.clientY };
  });
  card.addEventListener("pointerup", function (ev) {
    var ini = _tourTocado;
    _tourTocado = null;
    if (!ini) return;
    var dx = ev.clientX - ini.x;
    var dy = ev.clientY - ini.y;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.4) {
      if (dx < 0) _tourNext(); else _tourPrev();
    }
  });

  _tourEls = { root: root, card: card, segmentos: segmentos, cerrar: cerrar, escena: escena,
               manchaA: manchaA, manchaB: manchaB, counter: counter, title: title,
               body: body, skip: skip, prev: prev, next: next, segs: [] };
  return _tourEls;
}

/** Una barrita de progreso por escena; tocar una lleva a ella. */
function _tourConstruirSegmentos() {
  var e = _tourEls;
  while (e.segmentos.firstChild) e.segmentos.removeChild(e.segmentos.firstChild);
  e.segs = [];
  _tourPasos.forEach(function (paso, i) {
    var b = document.createElement("button");
    b.type = "button";
    b.className = "tour__seg";
    b.setAttribute("aria-label", String(i + 1));
    var relleno = document.createElement("i");
    b.appendChild(relleno);
    b.addEventListener("click", function () { _tourIrA(i); });
    e.segmentos.appendChild(b);
    e.segs.push(b);
  });
}

function _tourPintarSegmentos() {
  var e = _tourEls;
  e.segs.forEach(function (b, i) {
    b.classList.toggle("is-hecho", i < _tourIndex);
    b.classList.toggle("is-actual", i === _tourIndex);
  });
}

/** Los textos del paso actual, en el idioma de ahora; `animar` los mete palabra a palabra. */
function _tourPintarTextos(animar) {
  var e = _tourEls;
  var paso = _tourPasos[_tourIndex];
  if (!e || !paso) return;

  e.counter.textContent = _tourT("ui.paso_n_de_m", "{n} de {total}")
    .replace("{n}", _tourIndex + 1)
    .replace("{total}", _tourPasos.length);
  e.title.textContent = _tourTextoPaso(paso, "titulo");
  e.body.textContent = _tourTextoPaso(paso, "cuerpo");
  e.next.textContent = (_tourIndex === _tourPasos.length - 1)
    ? _tourT("ui.entendido", "Entendido")
    : _tourT("ui.siguiente", "Siguiente");
  e.skip.textContent = _tourT("ui.saltar", "Saltar");
  e.prev.textContent = _tourT("ui.atras", "Atrás");
  e.prev.hidden = (_tourIndex === 0);
  e.cerrar.setAttribute("aria-label", _tourT("ui.cerrar", "Cerrar"));
  _tourPintarSegmentos();

  if (animar && typeof tourFxPalabras === "function") {
    tourFxPalabras(e.title, 0.12);
    tourFxPalabras(e.body, 0.26);
  }
}

/** El color de la escena: se pone como variables que el CSS usa y suaviza. */
function _tourAcento(id) {
  var e = _tourEls;
  var v = TOUR_ACENTOS[id] || "volt";
  e.escena.style.setProperty("--tg-acento", "var(--" + v + ")");
  e.escena.style.setProperty("--tg-wash", "var(--" + v + "-wash)");
  e.escena.style.setProperty("--tg-profundo", "var(--" + (v === "volt" ? "ink" : v + "-deep") + ")");
}

/**
 * Cambia de escena: la vieja se va hacia un lado y la nueva entra desde el
 * otro. `dir` es +1 al ir hacia delante y -1 hacia atrás.
 */
function _tourMostrarEscena(dir) {
  var e = _tourEls;
  var paso = _tourPasos[_tourIndex];
  if (!e || !paso) return;
  var animar = (typeof tourFxActivo === "function") && tourFxActivo();

  if (_tourEspera) { _tourEspera.kill && _tourEspera.kill(); _tourEspera = null; }
  if (_tourEscena) { _tourEscena.parar(); _tourEscena = null; }

  var anterior = _tourEscenaEl;
  if (anterior) {
    var quitar = function () { if (anterior.parentNode) anterior.parentNode.removeChild(anterior); };
    if (animar) {
      gsap.to(anterior, { x: -dir * 56, opacity: 0, duration: 0.24, ease: "power2.in", onComplete: quitar });
    } else {
      quitar();
    }
  }

  var nuevo = _tourDiv("tg-stage");
  e.escena.appendChild(nuevo);
  _tourEscenaEl = nuevo;
  _tourAcento(paso.id);

  var montar = function () {
    if (_tourEscenaEl !== nuevo || typeof tourEscenaMontar !== "function") return;
    _tourEscena = tourEscenaMontar(paso.id, nuevo, animar);
  };
  if (animar) {
    gsap.set(nuevo, { x: dir * 56, opacity: 0 });
    gsap.to(nuevo, { x: 0, opacity: 1, duration: 0.42, delay: 0.1, ease: "power3.out", clearProps: "transform,opacity" });
    _tourEspera = gsap.delayedCall(0.3, montar);
  } else {
    montar();
  }
}

/** Va a la escena `n`. */
function _tourIrA(n) {
  if (_tourSaliendo || n === _tourIndex || n < 0 || n >= _tourPasos.length) return;
  _tourDir = n > _tourIndex ? 1 : -1;
  _tourIndex = n;
  _tourPintarTextos(true);
  _tourMostrarEscena(_tourDir);
}

function _tourNext() {
  if (_tourSaliendo) return;
  if (_tourIndex >= _tourPasos.length - 1) {
    // Terminarlo de verdad (no saltarlo) se celebra: cae confeti.
    _tourCerrar(true);
    return;
  }
  _tourIrA(_tourIndex + 1);
}

function _tourPrev() {
  if (_tourSaliendo || _tourIndex <= 0) return;
  _tourIrA(_tourIndex - 1);
}

/**
 * Repinta SOLO los textos y la escena, en el idioma de ahora mismo. Lo llama
 * applyI18nToDom() al cambiar de idioma.
 */
function refreshTourTexts() {
  if (_tourAsk && !_tourAsk.root.hidden) _tourPintarPregunta();
  var e = _tourEls;
  if (!e || e.root.hidden || !_tourPasos[_tourIndex]) return;
  _tourPintarTextos(false);
  _tourMostrarEscena(1);
}

// ── Abrir y cerrar ───────────────────────────────────────────────────────

/**
 * Abre el recorrido desde el principio. No necesita plan en pantalla.
 * @param {{alCerrar?: function}} [opts]
 */
function startTour(opts) {
  var e = _tourBuild();
  _tourCerrarPregunta();

  _tourPasos = (typeof TOUR_STEPS !== "undefined") ? TOUR_STEPS : [];
  if (!_tourPasos.length) {
    if (opts && typeof opts.alCerrar === "function") opts.alCerrar();
    return;
  }
  _tourAlCerrar = (opts && typeof opts.alCerrar === "function") ? opts.alCerrar : null;
  _tourIndex = 0;
  _tourDir = 1;
  _tourSaliendo = false;
  // A partir de aquí el recorrido está EN PANTALLA. Ver _tourCerrar(): solo
  // cuenta como "visto" lo que se ha llegado a ver.
  _tourSeVio = true;

  _tourConstruirSegmentos();
  var animar = (typeof tourFxActivo === "function") && tourFxActivo();

  e.root.hidden = false;
  if (typeof e.root.showModal === "function" && !e.root.open) e.root.showModal();
  else e.root.setAttribute("open", "");
  if (document.documentElement && document.documentElement.classList) {
    document.documentElement.classList.add("tour-abierto");
  }

  _tourPintarTextos(animar);
  _tourMostrarEscena(1);

  if (animar) {
    gsap.fromTo(e.card, { y: 70, opacity: 0, scale: 0.95 },
      { y: 0, opacity: 1, scale: 1, duration: 0.65, ease: "back.out(1.4)", clearProps: "transform,opacity" });
    gsap.fromTo(e.root, { opacity: 0 }, { opacity: 1, duration: 0.3, clearProps: "opacity" });
    if (typeof tourFxFondo === "function") tourFxFondo([e.manchaA, e.manchaB]);
  }
  try { e.next.focus({ preventScroll: true }); } catch (err) { /* sin foco, no pasa nada */ }
}

/**
 * Cierra el recorrido y lo da por visto -- también al saltarlo. Saltar es
 * una respuesta («ya me apaño»), y volver a asaltar con lo mismo en la
 * siguiente visita sería no haberla escuchado. Para repetirlo está el
 * enlace del pie y el menú ☰.
 */
function stopTour() {
  _tourCerrar(false);
}

function _tourCerrar(celebrar) {
  var e = _tourEls;
  if (_tourSaliendo || !e || e.root.hidden) return;
  _tourSaliendo = true;

  // "Visto" solo si de verdad llegó a la pantalla.
  //
  // Antes se marcaba SIEMPRE, y eso apaga el recorrido PARA SIEMPRE: basta
  // con que se cierre una vez sin haber enseñado nada para que no vuelva a
  // arrancar jamás (fallo reportado el 2026-09-03: "туториал не появляется...
  // ни разу не видел"). Marcar por error "no visto" solo cuesta que el
  // recorrido salga otra vez; marcar por error "visto" cuesta que no salga
  // nunca. La asimetría decide.
  if (_tourSeVio && typeof completeTour === "function") completeTour();
  _tourSeVio = false;

  if (_tourEspera) { if (_tourEspera.kill) _tourEspera.kill(); _tourEspera = null; }
  if (_tourEscena) { _tourEscena.parar(); _tourEscena = null; }

  var terminado = false;
  var terminar = function () {
    if (terminado) return;
    terminado = true;
    _tourSaliendo = false;
    if (typeof gsap !== "undefined") {
      gsap.killTweensOf([e.root, e.card, e.manchaA, e.manchaB]);
      gsap.set([e.root, e.card], { clearProps: "opacity,transform" });
    }
    if (typeof e.root.close === "function" && e.root.open) e.root.close();
    e.root.removeAttribute("open");
    e.root.hidden = true;
    if (document.documentElement && document.documentElement.classList) {
      document.documentElement.classList.remove("tour-abierto");
    }
    while (e.escena.lastChild && e.escena.lastChild !== e.manchaB) e.escena.removeChild(e.escena.lastChild);
    _tourEscenaEl = null;
    var cb = _tourAlCerrar;
    _tourAlCerrar = null;
    if (cb) { try { cb(); } catch (err) { console.error(err); } }
  };

  if ((typeof tourFxActivo === "function") && tourFxActivo()) {
    if (celebrar && typeof tourFxConfeti === "function") tourFxConfeti(e.card, e.root);
    // La hoja se va enseguida; el fondo se queda mientras cae el confeti.
    gsap.to(e.card, { y: 60, opacity: 0, scale: 0.96, duration: 0.3, ease: "power2.in" });
    var espera = celebrar ? 1.5 : 0.05;
    gsap.to(e.root, { opacity: 0, duration: 0.35, delay: espera, ease: "power1.in", onComplete: terminar });
    // Red de seguridad: si la animación no llegara a acabar, se cierra igual.
    window.setTimeout(terminar, (espera + 1) * 1000);
  } else {
    terminar();
  }
}

// ── La pregunta de después del cuestionario ─────────────────────────────

function _tourBuildAsk() {
  if (_tourAsk) return _tourAsk;

  var root = document.createElement("dialog");
  root.className = "tour-ask";
  root.id = "tourAsk";
  root.hidden = true;
  root.setAttribute("aria-labelledby", "tourAskTitulo");

  // Mismas clases que la hoja del recorrido: los aspectos que la visten
  // (papel, cristal, lazos...) visten también esta pregunta sin tocar nada.
  var card = document.createElement("div");
  card.className = "tour__card tour-ask__card";

  // La insignia: el icono del cocinero, el de «Generar plan». Un icono de la
  // propia aplicación, no un emoji.
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
  // enlace «Ver la explicación otra vez».
  no.addEventListener("click", function () {
    _tourCerrarPregunta();
    if (typeof completeTour === "function") completeTour();
    _tourResponder(false);
  });
  // «Sí» abre el recorrido y, cuando se cierra (como sea), quien esperaba la
  // respuesta sigue su camino: al terminar el cuestionario, generar el plan.
  si.addEventListener("click", function () {
    _tourCerrarPregunta();
    var cb = _tourAlResponder;
    _tourAlResponder = null;
    startTour({ alCerrar: function () { if (cb) cb(true); } });
    // Si el recorrido no ha podido abrirse, no se deja a nadie esperando.
    if (_tourEls && _tourEls.root.hidden && cb && _tourAlCerrar === null) { /* ya llamó a alCerrar */ }
  });

  // Escape = «No»: una pregunta de la que no se puede salir es una trampa.
  root.addEventListener("cancel", function (ev) {
    if (ev.preventDefault) ev.preventDefault();
    no.click();
  });
  // Y la tecla Escape en entornos sin <dialog> de verdad.
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
    "Te lo enseño con dibujos animados, en menos de un minuto.");
  a.si.textContent = _tourT("ui.tour_pregunta_si", "Sí, enséñamelo");
  a.no.textContent = _tourT("ui.tour_pregunta_no", "No, gracias");
}

function _tourCerrarPregunta() {
  var a = _tourAsk;
  if (!a) return;
  if (typeof a.root.close === "function" && a.root.open) a.root.close();
  a.root.removeAttribute("open");
  a.root.hidden = true;
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
 * preguntar y no empezar. `alResponder(quiere)` se llama cuando termina todo:
 * con «no» al momento, con «sí» al cerrarse el recorrido. Es entonces cuando
 * se genera el plan.
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
  if (typeof a.root.showModal === "function" && !a.root.open) a.root.showModal();
  else a.root.setAttribute("open", "");
  try { a.si.focus({ preventScroll: true }); } catch (err) { /* idem */ }

  if ((typeof tourFxActivo === "function") && tourFxActivo()) {
    gsap.fromTo(a.card, { scale: 0.84, y: 40, opacity: 0 },
      { scale: 1, y: 0, opacity: 1, duration: 0.65, ease: "back.out(1.7)", clearProps: "transform,opacity" });
    gsap.fromTo(a.icono, { scale: 0, rotation: -40 },
      { scale: 1, rotation: 0, duration: 0.65, delay: 0.15, ease: "back.out(2.6)", clearProps: "transform" });
    gsap.fromTo([a.si, a.no], { y: 20, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.45, stagger: 0.09, delay: 0.28, ease: "power3.out", clearProps: "transform,opacity" });
  }
}

/**
 * ¿La marca «ya lo vio» es de ESTE recorrido o del viejo?
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
 * Pregunta solo si al usuario le toca. Se llama después de generar un plan:
 * quien ya contestó (sí o no) no vuelve a ser preguntado.
 */
function maybeStartTour() {
  if (typeof getOnboardingState !== "function") return;
  var estado = getOnboardingState();
  if (estado && estado.tourDoneAt && _tourVistoVigente(estado.tourDoneAt)) return;
  // Un respiro antes de preguntar: el plan acaba de aparecer y merece verse
  // un segundo antes de que algo se ponga por encima.
  window.setTimeout(function () { offerTour(); }, 700);
}
