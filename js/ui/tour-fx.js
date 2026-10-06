/**
 * js/ui/tour-fx.js
 * ─────────────────────────────────────────────────────────────────────────
 * Los efectos GENERALES del recorrido, con GSAP: el texto que aparece palabra a
 * palabra, el fondo vivo y el confeti del final. Las animaciones de cada
 * escena (el dedo, lo que se tacha...) viven en js/ui/tour-scenes.js.
 *
 * Ninguna es imprescindible: tour.js las llama solo si existen y cada una no
 * hace nada cuando no hay GSAP (la CDN no llegó) o cuando la persona pidió
 * menos movimiento (`prefers-reduced-motion`). Sin ellas el recorrido se ve
 * igual, quieto.
 *
 * Depende de: gsap (global, CDN).
 *
 * Expone (globales):
 *   tourFxActivo()                   → ¿hay GSAP y movimiento permitido?
 *   tourFxPalabras(el, retraso)      → el texto de `el` entra palabra a palabra
 *   tourFxColor(variable, defecto)   → el valor actual de una variable CSS
 *   tourFxFondo(manchas)             → las manchas del fondo flotan
 *   tourFxConfeti(origen, contenedor)→ cae confeti desde `origen`
 * ─────────────────────────────────────────────────────────────────────────
 */

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

function tourFxColor(nombre, defecto) {
  try {
    var v = window.getComputedStyle(document.documentElement).getPropertyValue(nombre);
    v = v ? String(v).trim() : "";
    return v || defecto;
  } catch (err) {
    return defecto;
  }
}

function _fxAzar(a, b) { return a + Math.random() * (b - a); }

/** El texto de un elemento entra palabra a palabra; al acabar vuelve a ser texto plano. */
function tourFxPalabras(el, retraso) {
  if (!el || !tourFxActivo()) return;
  _fxSeguro("palabras", function () {
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
    el._fxTween = gsap.fromTo(spans, { yPercent: 80, opacity: 0 }, {
      yPercent: 0, opacity: 1, duration: 0.5, ease: "power3.out",
      stagger: Math.min(0.03, 0.7 / spans.length), delay: retraso || 0,
      onComplete: function () {
        el._fxTween = null;
        // Solo si nadie ha pintado otro texto mientras tanto (otro paso, otro idioma).
        if (el.textContent === texto) el.textContent = texto;
      }
    });
  });
}

/** Dos manchas de color que flotan despacio detrás de la escena. */
function tourFxFondo(manchas) {
  if (!manchas || !tourFxActivo()) return;
  _fxSeguro("fondo", function () {
    manchas.forEach(function (m, i) {
      gsap.killTweensOf(m);
      gsap.to(m, {
        x: i ? -34 : 30, y: i ? 26 : -22, scale: i ? 1.18 : 1.3,
        duration: 4.2 + i * 1.3, ease: "sine.inOut", repeat: -1, yoyo: true
      });
    });
  });
}

/** Confeti desde `origen`, dentro de `contenedor` (el recorrido es un <dialog>: lo de fuera queda debajo). */
function tourFxConfeti(origen, contenedor) {
  if (!origen || !contenedor || !tourFxActivo()) return;
  _fxSeguro("confeti", function () {
    var r = origen.getBoundingClientRect();
    var cx = r.left + r.width / 2;
    var cy = r.top + r.height * 0.7;
    var cont = document.createElement("div");
    cont.className = "tour__confeti";
    cont.setAttribute("aria-hidden", "true");
    contenedor.appendChild(cont);

    var colores = ["--volt", "--kcal", "--protein", "--carbs", "--fat"]
      .map(function (n) { return tourFxColor(n, ""); })
      .filter(function (c) { return !!c; });
    if (!colores.length) colores = ["#ffd447", "#ff6b9d", "#4cc9f0", "#80ed99", "#f72585"];

    var total = window.innerWidth < 500 ? 34 : 54;
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

      var ang = _fxAzar(-160, -20) * Math.PI / 180;
      var fuerza = _fxAzar(120, 340);
      gsap.timeline({ delay: _fxAzar(0, 0.12) })
        .fromTo(p, { x: 0, y: 0, rotation: _fxAzar(0, 360), scale: 0.4 },
          { x: Math.cos(ang) * fuerza, y: Math.sin(ang) * fuerza, scale: 1, duration: _fxAzar(0.6, 0.95), ease: "power2.out" })
        .to(p, { y: "+=" + Math.round(_fxAzar(280, 480)), x: "+=" + Math.round(_fxAzar(-60, 60)),
          rotation: "+=" + Math.round(_fxAzar(220, 620)), opacity: 0, duration: _fxAzar(1.1, 1.7), ease: "power1.in" }, ">-0.1");
    }
    gsap.delayedCall(3.2, function () { if (cont.parentNode) cont.parentNode.removeChild(cont); });
  });
}
