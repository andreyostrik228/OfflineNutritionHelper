/**
 * js/ui/tour-fx.js
 * ─────────────────────────────────────────────────────────────────────────
 * La parte «chula» del recorrido guiado: las animaciones, con GSAP. Sin emojis.
 *
 * ── Qué hace ─────────────────────────────────────────────────────────────
 *   - El foco VIAJA: al cambiar de paso el hueco que ilumina se desliza y se
 *     redimensiona hasta lo nuevo (en vez de saltar), y un anillo late a su
 *     alrededor.
 *   - La tarjeta entra desde abajo con rebote, y en cada paso el titular y el
 *     texto aparecen palabra a palabra, mientras la insignia (con el número del
 *     paso) pega un salto y la barra de progreso se rellena.
 *   - En los pasos con botón (`tap: true`) un dedo pulsa encima, con su onda.
 *   - Al terminar de verdad (no al saltarlo) cae confeti y sale un aviso.
 *   - La pregunta de «¿Quieres ver un recorrido?» entra con su insignia.
 *
 * ── Lo que NO hace ───────────────────────────────────────────────────────
 * Ninguna de estas funciones es necesaria: tour.js las llama solo si existen
 * (`typeof tourFxX === "function"`) y cada una devuelve false / no hace nada
 * cuando no hay GSAP (la CDN no llegó, ver SELLO_CABECERAS en sw.js) o cuando
 * la persona pidió menos movimiento (`prefers-reduced-motion`). Sin ellas el
 * recorrido es el de antes: mismo texto, mismos huecos, sin movimiento.
 *
 * Tampoco decide nada del recorrido -- qué paso toca, dónde va el hueco -- :
 * recibe los elementos ya creados y los anima. Por eso es un fichero aparte y
 * no más líneas en tour.js.
 *
 * Depende de: gsap (global, CDN), y de los elementos que crea js/ui/tour.js.
 *
 * Expone (globales):
 *   tourFxActivo()                      → ¿hay GSAP y movimiento permitido?
 *   tourFxEntrar(e)                     → abre el recorrido
 *   tourFxSalir(e, mensaje, hecho)      → lo cierra; con `mensaje`, confeti
 *   tourFxPaso(e, paso, dir, primera)   → anima la tarjeta de un paso
 *   tourFxMover(nodo, v, estabaOculto)  → desliza un hueco → boolean
 *   tourFxProgreso(span, pct)           → rellena la barra → boolean
 *   tourFxToque(e, activo)              → el dedo pulsando
 *   tourFxPregunta(a)                   → entrada de la pregunta inicial
 *   tourFxCancelar(e)                   → corta todo lo en marcha
 * ─────────────────────────────────────────────────────────────────────────
 */

var _fxPulsos = [];
var _fxToque = null;
var _fxSaliendo = null;

function tourFxActivo() {
  if (typeof gsap === "undefined" || !gsap || typeof gsap.to !== "function") return false;
  try {
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
  } catch (err) { /* sin matchMedia: se anima */ }
  return true;
}

/** Cualquier fallo de una animación se queda en la consola: el recorrido sigue. */
function _fxSeguro(nombre, fn) {
  try {
    return fn();
  } catch (err) {
    console.error("[tour-fx] " + nombre + ":", err);
    return undefined;
  }
}

function _fxVar(nombre, defecto) {
  try {
    var v = window.getComputedStyle(document.documentElement).getPropertyValue(nombre);
    v = v ? String(v).trim() : "";
    return v || defecto;
  } catch (err) {
    return defecto;
  }
}

/** Un color CSS (#rgb, #rrggbb, rgb(...)) con otra opacidad. */
function _fxRgba(color, alfa) {
  var c = String(color || "").trim();
  var m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(c);
  if (m) {
    var h = m[1];
    if (h.length === 3) h = h.charAt(0) + h.charAt(0) + h.charAt(1) + h.charAt(1) + h.charAt(2) + h.charAt(2);
    return "rgba(" + parseInt(h.slice(0, 2), 16) + "," + parseInt(h.slice(2, 4), 16) + "," +
      parseInt(h.slice(4, 6), 16) + "," + alfa + ")";
  }
  var r = /^rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)/i.exec(c);
  if (r) return "rgba(" + r[1] + "," + r[2] + "," + r[3] + "," + alfa + ")";
  return "rgba(255,255,255," + alfa + ")";
}

function _fxAzar(a, b) { return a + Math.random() * (b - a); }

// ── Entrar y salir ───────────────────────────────────────────────────────

function tourFxCancelar(e) {
  _fxSeguro("cancelar", function () {
    if (typeof gsap === "undefined") return;
    _fxPulsos.forEach(function (tw) { tw.kill(); });
    _fxPulsos = [];
    if (_fxToque) { _fxToque.kill(); _fxToque = null; }
    if (_fxSaliendo) { _fxSaliendo.kill(); _fxSaliendo = null; }
    if (e) {
      gsap.killTweensOf([e.root, e.card, e.hole, e.foco, e.icono, e.title, e.body, e.progress]);
      if (e.root) gsap.set(e.root, { clearProps: "opacity" });
      if (e.card) gsap.set(e.card, { clearProps: "transform,opacity" });
      if (e.toque) e.toque.hidden = true;
    }
  });
}

/** El anillo que late alrededor de lo iluminado. */
function _fxLatir(anillo) {
  if (!anillo) return;
  var color = _fxVar("--volt", "#c8ff3d");
  var tw = gsap.fromTo(anillo,
    { boxShadow: "0 0 0 0px " + _fxRgba(color, 0.75) },
    { boxShadow: "0 0 0 18px " + _fxRgba(color, 0), duration: 1.5, ease: "power2.out", repeat: -1, repeatDelay: 0.25 });
  _fxPulsos.push(tw);
}

function tourFxEntrar(e) {
  if (!tourFxActivo() || !e) return;
  _fxSeguro("entrar", function () {
    tourFxCancelar(e);
    e.root.classList.add("tour--fx");
    // Los huecos de la vez anterior no sirven de punto de partida: el primero
    // aparece donde toca y se funde, no viene volando desde el paso 10.
    e.hole.hidden = true;
    e.foco.hidden = true;
    gsap.fromTo(e.root, { opacity: 0 }, { opacity: 1, duration: 0.35, ease: "power1.out", clearProps: "opacity" });
    gsap.fromTo(e.card, { y: 80, opacity: 0, scale: 0.96 },
      { y: 0, opacity: 1, scale: 1, duration: 0.75, delay: 0.05, ease: "back.out(1.5)", clearProps: "transform,opacity" });
    _fxLatir(e.pulsoHole);
    _fxLatir(e.pulsoFoco);
  });
}

/**
 * Cierra el recorrido con una salida corta. `mensaje` (texto) pide además el
 * confeti y el aviso final: solo se pasa al llegar al último paso.
 * `hecho` se llama al terminar -- o ya, si no hay animación.
 */
function tourFxSalir(e, mensaje, hecho) {
  if (!e || !tourFxActivo()) { hecho(); return; }
  var seguro = _fxSeguro("salir", function () {
    _fxPulsos.forEach(function (tw) { tw.kill(); });
    _fxPulsos = [];
    if (_fxToque) { _fxToque.kill(); _fxToque = null; }
    if (e.toque) e.toque.hidden = true;
    if (mensaje) { _fxConfeti(e.card); _fxAviso(mensaje); }
    gsap.to(e.card, { y: 90, opacity: 0, duration: 0.3, ease: "power2.in" });
    _fxSaliendo = gsap.to(e.root, {
      opacity: 0, duration: 0.38, ease: "power1.in",
      onComplete: function () {
        _fxSaliendo = null;
        gsap.set(e.root, { clearProps: "opacity" });
        gsap.set(e.card, { clearProps: "transform,opacity" });
        hecho();
      }
    });
    return true;
  });
  if (!seguro) hecho();
}

// ── Un paso ──────────────────────────────────────────────────────────────

/** Titular y texto: aparecen palabra a palabra. Al acabar vuelven a ser texto plano. */
function _fxPalabras(el, retraso) {
  if (!el) return;
  var texto = el.textContent;
  if (!texto) return;
  if (el._fxTween) { el._fxTween.kill(); el._fxTween = null; }
  var palabras = texto.split(" ");
  el.textContent = "";
  var spans = [];
  palabras.forEach(function (p, i) {
    var s = document.createElement("span");
    s.className = "tour__w";
    s.textContent = p;
    el.appendChild(s);
    spans.push(s);
    if (i < palabras.length - 1) el.appendChild(document.createTextNode(" "));
  });
  el._fxTween = gsap.fromTo(spans, { yPercent: 75, opacity: 0 }, {
    yPercent: 0, opacity: 1, duration: 0.5, ease: "power3.out",
    stagger: Math.min(0.032, 0.75 / spans.length), delay: retraso,
    onComplete: function () {
      el._fxTween = null;
      // Solo si nadie ha pintado otro texto mientras tanto (otro paso, otro idioma).
      if (el.textContent === texto) el.textContent = texto;
    }
  });
}

function tourFxPaso(e, paso, dir, primera) {
  if (!tourFxActivo() || !e || !paso) return;
  _fxSeguro("paso", function () {
    if (e.icono) {
      gsap.killTweensOf(e.icono);
      gsap.fromTo(e.icono, { scale: 0, rotation: -40 },
        { scale: 1, rotation: 0, duration: 0.7, delay: 0.08, ease: "back.out(2.6)", clearProps: "transform" });
    }
    _fxPalabras(e.title, 0.04);
    _fxPalabras(e.body, 0.16);
    // La tarjeta se mueve con el sentido del recorrido: «Siguiente» la empuja
    // desde la derecha, «Atrás» desde la izquierda. La del primer paso ya
    // entra desde abajo (tourFxEntrar).
    if (!primera) {
      gsap.killTweensOf(e.card);
      gsap.fromTo(e.card, { x: (dir < 0 ? -1 : 1) * 22 },
        { x: 0, duration: 0.45, ease: "power3.out", clearProps: "transform" });
    }
    tourFxToque(e, !!paso.tap);
  });
}

// ── Los huecos ───────────────────────────────────────────────────────────

/**
 * Desliza un hueco hasta su rectángulo. `v` = {left, top, width, height} en
 * píxeles. Devuelve false si no hay animación y el llamante tiene que
 * ponerlo a mano.
 */
function tourFxMover(nodo, v, estabaOculto) {
  if (!tourFxActivo()) return false;
  var ok = _fxSeguro("mover", function () {
    if (estabaOculto) {
      // Primera vez (o después de esconderse): aparece donde toca y se funde.
      gsap.killTweensOf(nodo);
      gsap.set(nodo, { left: v.left, top: v.top, width: v.width, height: v.height });
      gsap.fromTo(nodo, { opacity: 0 }, { opacity: 1, duration: 0.35, ease: "power1.out", clearProps: "opacity" });
      return true;
    }
    // Cada fotograma mientras la página se desplaza vuelve a fijar el destino:
    // con `overwrite` el hueco persigue al elemento con un deslizamiento suave
    // en vez de dar saltos.
    gsap.to(nodo, {
      left: v.left, top: v.top, width: v.width, height: v.height,
      duration: 0.42, ease: "power3.out", overwrite: "auto"
    });
    return true;
  });
  return !!ok;
}

/** Rellena la barra de progreso. false = que lo haga el llamante. */
function tourFxProgreso(span, pct) {
  if (!tourFxActivo() || !span) return false;
  return !!_fxSeguro("progreso", function () {
    gsap.to(span, { width: pct + "%", duration: 0.7, ease: "power3.out", overwrite: true });
    return true;
  });
}

// ── El dedo ──────────────────────────────────────────────────────────────

/**
 * Un dedo que pulsa en el centro de lo señalado, con su onda. `e.toque` lo
 * crea tour.js y lo cuelga del hueco que toque (tour.js, _tourToqueEnSuSitio).
 */
function tourFxToque(e, activo) {
  if (!e || !e.toque) return;
  _fxSeguro("toque", function () {
    if (_fxToque) { _fxToque.kill(); _fxToque = null; }
    if (!activo || !tourFxActivo()) { e.toque.hidden = true; return; }
    e.toque.hidden = false;
    var punto = e.toque.querySelector(".tour__toque-punto");
    var onda = e.toque.querySelector(".tour__toque-onda");
    gsap.set(punto, { scale: 0, opacity: 0 });
    gsap.set(onda, { scale: 0.4, opacity: 0 });
    _fxToque = gsap.timeline({ repeat: -1, repeatDelay: 0.5, delay: 0.9 })
      .to(punto, { scale: 1, opacity: 1, duration: 0.28, ease: "back.out(2.2)" })
      .to(punto, { scale: 0.74, duration: 0.12, ease: "power2.in" })
      .to(punto, { scale: 1, duration: 0.2, ease: "power2.out" })
      .fromTo(onda, { scale: 0.4, opacity: 0.95 }, { scale: 2.5, opacity: 0, duration: 0.75, ease: "power2.out" }, "<-0.2")
      .to(punto, { opacity: 0, scale: 0.6, duration: 0.25, ease: "power1.in" }, "+=0.3");
  });
}

// ── La pregunta ──────────────────────────────────────────────────────────

function tourFxPregunta(a) {
  if (!tourFxActivo() || !a) return;
  _fxSeguro("pregunta", function () {
    gsap.killTweensOf([a.root, a.card, a.si, a.no, a.icono]);
    gsap.fromTo(a.root, { opacity: 0 }, { opacity: 1, duration: 0.3, ease: "power1.out", clearProps: "opacity" });
    gsap.fromTo(a.card, { scale: 0.82, y: 40, opacity: 0 },
      { scale: 1, y: 0, opacity: 1, duration: 0.7, ease: "back.out(1.7)", clearProps: "transform,opacity" });
    if (a.icono) {
      gsap.fromTo(a.icono, { scale: 0, rotation: -40 },
        { scale: 1, rotation: 0, duration: 0.7, delay: 0.18, ease: "back.out(2.6)", clearProps: "transform" });
    }
    gsap.fromTo([a.si, a.no], { y: 20, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.45, stagger: 0.09, delay: 0.3, ease: "power3.out", clearProps: "transform,opacity" });
  });
}

// ── El final: confeti y aviso ────────────────────────────────────────────

function _fxConfeti(origen) {
  var r = origen.getBoundingClientRect();
  var cx = r.left + r.width / 2;
  var cy = r.top + Math.min(40, r.height / 2);
  var cont = document.createElement("div");
  cont.className = "tour__confeti";
  cont.setAttribute("aria-hidden", "true");
  document.body.appendChild(cont);

  var colores = ["--volt", "--primary", "--kcal", "--protein", "--carbs", "--fat"]
    .map(function (n) { return _fxVar(n, ""); })
    .filter(function (c) { return !!c; });
  if (!colores.length) colores = ["#ffd447", "#ff6b9d", "#4cc9f0", "#80ed99", "#f72585"];

  var total = window.innerWidth < 500 ? 30 : 46;
  for (var i = 0; i < total; i++) {
    var p = document.createElement("span");
    p.className = "tour__pieza";
    var lado = Math.round(_fxAzar(7, 12));
    p.style.width = lado + "px";
    p.style.height = Math.round(lado * (Math.random() < 0.5 ? 1 : 0.45)) + "px";
    p.style.borderRadius = Math.random() < 0.4 ? "50%" : "2px";
    p.style.background = colores[i % colores.length];
    p.style.left = cx + "px";
    p.style.top = cy + "px";
    cont.appendChild(p);

    var ang = _fxAzar(-160, -20) * Math.PI / 180;      // hacia arriba, abierto en abanico
    var fuerza = _fxAzar(110, 320);
    var tl = gsap.timeline({ delay: _fxAzar(0, 0.12) });
    tl.fromTo(p, { x: 0, y: 0, rotation: _fxAzar(0, 360), scale: 0.4 },
      { x: Math.cos(ang) * fuerza, y: Math.sin(ang) * fuerza, scale: 1, duration: _fxAzar(0.6, 0.95), ease: "power2.out" })
      .to(p, { y: "+=" + Math.round(_fxAzar(260, 460)), x: "+=" + Math.round(_fxAzar(-60, 60)),
        rotation: "+=" + Math.round(_fxAzar(220, 620)), opacity: 0, duration: _fxAzar(1.1, 1.7), ease: "power1.in" }, ">-0.1");
  }
  gsap.delayedCall(3.2, function () { if (cont.parentNode) cont.parentNode.removeChild(cont); });
}

function _fxAviso(texto) {
  var aviso = document.createElement("div");
  aviso.className = "tour__aviso";
  aviso.setAttribute("role", "status");
  aviso.textContent = texto;
  document.body.appendChild(aviso);
  gsap.timeline({ onComplete: function () { if (aviso.parentNode) aviso.parentNode.removeChild(aviso); } })
    .fromTo(aviso, { y: 40, opacity: 0, scale: 0.9 }, { y: 0, opacity: 1, scale: 1, duration: 0.55, delay: 0.2, ease: "back.out(1.8)" })
    .to(aviso, { y: -10, opacity: 0, duration: 0.45, ease: "power2.in" }, "+=2.2");
}
