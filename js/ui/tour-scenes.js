/**
 * js/ui/tour-scenes.js
 * ─────────────────────────────────────────────────────────────────────────
 * Las ESCENAS del recorrido guiado: una maqueta animada de cada pantalla.
 *
 * Cada escena es una función que recibe el contexto `c` (ver
 * _tgCrearContexto) y devuelve:
 *   { el, play(tl), fin() }
 *     el       la maqueta, ya construida
 *     play(tl) añade a la línea de tiempo GSAP lo que ocurre (un dedo que
 *              pulsa, algo que se tacha...)
 *     fin()    deja la maqueta en su estado FINAL de golpe: es lo que se ve
 *              sin GSAP o con «menos movimiento»
 *
 * Las maquetas usan los colores y las tipografías de la aplicación (variables
 * CSS), así que se ven bien en los diez aspectos sin tocar nada. Los textos
 * salen de las tablas de idioma (`tour.m_<clave>`, con su español en
 * TOUR_MOCK) y, cuando existe, de la palabra real de la interfaz (`ui.*`), de
 * modo que el botón de la maqueta dice lo mismo que el de verdad.
 *
 * Depende de: gsap (opcional), js/data/tour-steps.js (TOUR_MOCK), t().
 *
 * Expone (globales):
 *   TOUR_SCENES                                 → { id: función de escena }
 *   tourEscenaMontar(id, el, animar, escenas?)  → { parar() }
 * ─────────────────────────────────────────────────────────────────────────
 */

var TOUR_SCENES = {};

var TG_SVG = "http://www.w3.org/2000/svg";

function _tgE(tag, clase, texto) {
  var e = document.createElement(tag);
  if (clase) e.className = clase;
  if (texto !== undefined && texto !== null) e.textContent = texto;
  return e;
}

/** Un icono del sprite de la aplicación (index.html, <symbol id="icon-...">). */
function _tgIco(id, clase) {
  var s = document.createElementNS(TG_SVG, "svg");
  s.setAttribute("class", clase || "tg-ico");
  s.setAttribute("aria-hidden", "true");
  var u = document.createElementNS(TG_SVG, "use");
  u.setAttribute("href", "#" + id);
  s.appendChild(u);
  return s;
}

/** La palomita de una casilla marcada. */
function _tgPalomita(clase) {
  var s = document.createElementNS(TG_SVG, "svg");
  s.setAttribute("class", clase || "tg-ok");
  s.setAttribute("viewBox", "0 0 24 24");
  s.setAttribute("aria-hidden", "true");
  var p = document.createElementNS(TG_SVG, "path");
  p.setAttribute("d", "M5 12.5l4.5 4.5L19 7.5");
  p.setAttribute("fill", "none");
  p.setAttribute("stroke", "currentColor");
  p.setAttribute("stroke-width", "3");
  p.setAttribute("stroke-linecap", "round");
  p.setAttribute("stroke-linejoin", "round");
  s.appendChild(p);
  return s;
}

/** Una palabra de maqueta: la traducción si existe y, si no, el español. */
function _tgT(clave) {
  var original = (typeof TOUR_MOCK !== "undefined" && TOUR_MOCK[clave]) || clave;
  if (typeof t !== "function") return original;
  var k = "tour.m_" + clave;
  var x = t(k);
  return (x && x !== k) ? x : original;
}

/** La palabra real de la interfaz, o su español. */
function _tgUi(clave, original) {
  if (typeof t !== "function") return original;
  var x = t(clave);
  return (x && x !== clave) ? x : original;
}

function _tgCentro(el, ref) {
  var a = el.getBoundingClientRect();
  var b = ref.getBoundingClientRect();
  return { x: a.left - b.left + a.width / 2, y: a.top - b.top + a.height / 2 };
}

/**
 * El contexto de una escena: constructores de elementos y el dedo.
 * @param {Element} stage - donde vive la escena (el dedo se mide contra él)
 * @param {function(): boolean} vivo - ¿sigue la escena en pantalla?
 */
function _tgCrearContexto(stage, vivo) {
  var c = { stage: stage, dedo: null, ola: null };
  c.e = _tgE;
  c.ico = _tgIco;
  c.ok = _tgPalomita;
  c.t = _tgT;
  c.ui = _tgUi;

  /** Crea el dedo (y su onda) al principio de cada pasada. */
  c.crearDedo = function () {
    c.ola = _tgE("span", "tg-ola");
    c.dedo = _tgE("span", "tg-dedo");
    stage.appendChild(c.ola);
    stage.appendChild(c.dedo);
    gsap.set([c.dedo, c.ola], { x: stage.clientWidth + 40, y: stage.clientHeight * 0.9, opacity: 0 });
  };

  /** El dedo viaja hasta el centro de un elemento. */
  c.ir = function (el, dur) {
    if (!vivo() || !c.dedo || !el) return;
    var p = _tgCentro(el, stage);
    gsap.to(c.dedo, { x: p.x, y: p.y, opacity: 1, duration: dur || 0.7, ease: "power2.inOut", overwrite: "auto" });
  };

  /** Pulsa donde esté: el dedo se hunde y sale una onda. */
  c.pulsar = function () {
    if (!vivo() || !c.dedo) return;
    var x = gsap.getProperty(c.dedo, "x");
    var y = gsap.getProperty(c.dedo, "y");
    gsap.timeline()
      .to(c.dedo, { scale: 0.76, duration: 0.12, ease: "power2.in" })
      .to(c.dedo, { scale: 1, duration: 0.26, ease: "back.out(3)" });
    gsap.fromTo(c.ola, { x: x, y: y, scale: 0.3, opacity: 0.85 }, { scale: 2.4, opacity: 0, duration: 0.65, ease: "power2.out" });
  };

  /** El dedo se va. */
  c.irse = function () {
    if (!vivo() || !c.dedo) return;
    gsap.to(c.dedo, { opacity: 0, y: "+=40", duration: 0.4, ease: "power1.in" });
  };

  /**
   * Cambia el orden de unos elementos y los desliza desde donde estaban
   * (un FLIP a mano, sin plugin).
   */
  c.reordenar = function (filas, mutar) {
    var antes = filas.map(function (f) { return f.getBoundingClientRect().top; });
    mutar();
    filas.forEach(function (f, i) {
      var d = antes[i] - f.getBoundingClientRect().top;
      if (d) gsap.fromTo(f, { y: d }, { y: 0, duration: 0.5, ease: "power3.out" });
    });
  };

  /**
   * La barra de las cinco secciones de entrenamientos, con la `activa`
   * encendida. La usan la escena «entrenos» y el tutorial de entrenamientos.
   * @returns {{el: Element, tabs: Element[]}}
   */
  c.barraEntreno = function (activa) {
    var barra = _tgE("div", "tg-tabs tg-tabs--cinco");
    var tabs = [["ent.pestana_inicio", "Inicio", "icon-home"], ["ent.pestana_plan", "Plan", "icon-calendar"],
      ["ent.pestana_sesion", "Entrenar", "icon-dumbbell"], ["ent.pestana_progreso", "Progreso", "icon-chart"],
      ["ent.pestana_perfil", "Perfil", "icon-user"]].map(function (p, i) {
      var tab = _tgE("span", "tg-tab" + (i === activa ? " is-on" : ""));
      tab.appendChild(_tgIco(p[2], "tg-ico"));
      tab.appendChild(_tgE("small", null, _tgUi(p[0], p[1])));
      barra.appendChild(tab);
      return tab;
    });
    return { el: barra, tabs: tabs };
  };

  /**
   * La semana de entrenamientos: lunes, martes, jueves y viernes toca; `hoy`
   * es el índice del día de hoy (0 = lunes).
   * @returns {{el: Element, dias: Element[]}}
   */
  c.semanaEntreno = function (hoy) {
    var semana = _tgE("div", "tg-semana");
    var cortos = ["Lu", "Ma", "Mi", "Ju", "Vi", "Sá", "Do"];
    var dias = cortos.map(function (corto, i) {
      var clase = "tg-semana__d" + ([0, 1, 3, 4].indexOf(i) !== -1 ? " is-toca" : "") + (i === hoy ? " is-hoy" : "");
      var d = _tgE("span", clase, _tgUi("ent.dia_corto_" + (i + 1), corto));
      semana.appendChild(d);
      return d;
    });
    return { el: semana, dias: dias };
  };
  return c;
}

// ── 1. El plan ───────────────────────────────────────────────────────────

TOUR_SCENES.plan = function (c) {
  var raiz = c.e("div", "tg-plan");
  var resumen = c.e("div", "tg-card tg-resumen");
  var kcal = c.e("div", "tg-kcal");
  var num = c.e("span", "tg-num", "3114");
  kcal.appendChild(num);
  kcal.appendChild(c.e("small", null, c.ui("unit.kcal", "kcal")));
  resumen.appendChild(kcal);

  var barras = c.e("div", "tg-barras");
  var rellenos = [];
  [["p", 78, c.ui("ui.abrev_proteina", "P")], ["c", 92, c.ui("ui.abrev_carbos", "C")],
   ["g", 58, c.ui("ui.abrev_grasas", "G")]].forEach(function (d) {
    var b = c.e("div", "tg-barra tg-barra--" + d[0]);
    b.appendChild(c.e("b", null, d[2]));
    var pista = c.e("span", "tg-pista");
    var relleno = c.e("i");
    relleno.style.width = d[1] + "%";
    pista.appendChild(relleno);
    b.appendChild(pista);
    barras.appendChild(b);
    rellenos.push(relleno);
  });
  resumen.appendChild(barras);
  raiz.appendChild(resumen);

  var comidas = [["07:30", "desayuno", "650"], ["13:30", "comida", "820"], ["21:00", "cena", "740"]].map(function (m) {
    var f = c.e("div", "tg-card tg-comida");
    f.appendChild(c.e("span", "tg-hora", m[0]));
    f.appendChild(c.e("span", "tg-nom", c.t(m[1])));
    f.appendChild(c.e("span", "tg-k", m[2] + " " + c.ui("unit.kcal", "kcal")));
    raiz.appendChild(f);
    return f;
  });

  return {
    el: raiz,
    play: function (tl) {
      tl.from(resumen, { y: -28, opacity: 0, duration: 0.55, ease: "back.out(1.6)" })
        .from(num, { textContent: 0, duration: 1.2, ease: "power2.out", snap: { textContent: 1 } }, "<0.15")
        .from(rellenos, { scaleX: 0, transformOrigin: "left center", duration: 0.8, stagger: 0.14, ease: "power3.out" }, "<0.1")
        .from(comidas, { y: 42, opacity: 0, duration: 0.5, stagger: 0.14, ease: "back.out(1.4)" }, "-=0.6");
    },
    fin: function () {}
  };
};

// ── 2. Varios días y lo que sobra de uno para el siguiente ──────────────

TOUR_SCENES.dias = function (c) {
  var raiz = c.e("div", "tg-dias");

  var ventana = c.e("div", "tg-ventana");
  var fila = c.e("div", "tg-dias-fila");
  var tarjetas = [];
  for (var i = 1; i <= 3; i++) {
    var d = c.e("div", "tg-card tg-dia");
    d.appendChild(c.e("strong", null, c.ui("ui.dia", "Día") + " " + i + " " + c.ui("ui.de_contador", "de") + " 3"));
    [["07:30", "desayuno"], ["13:30", "comida"], ["21:00", "cena"]].forEach(function (m) {
      var l = c.e("div", "tg-dia__l");
      l.appendChild(c.e("span", null, m[0]));
      l.appendChild(c.e("span", null, c.t(m[1])));
      d.appendChild(l);
    });
    fila.appendChild(d);
    tarjetas.push(d);
  }
  ventana.appendChild(fila);
  var puntos = c.e("div", "tg-puntos");
  var pts = [0, 1, 2].map(function (n) {
    var p = c.e("i", n === 0 ? "is-on" : null);
    puntos.appendChild(p);
    return p;
  });

  // Un envase que no se acaba en un día: lo que queda pasa al siguiente.
  // Bajo cada día, lo que QUEDA del bote al acabarlo.
  var G = " " + c.ui("unit.g", "g");
  var envase = c.e("div", "tg-card tg-envase");
  envase.appendChild(c.e("span", "tg-envase__n", c.t("crema")));
  var gramos = c.e("strong", "tg-envase__g", "350" + G);
  envase.appendChild(gramos);
  var pista = c.e("span", "tg-pista tg-envase__pista");
  var nivel = c.e("i");
  nivel.style.width = "70%";
  pista.appendChild(nivel);
  envase.appendChild(pista);

  // Y lo que el menú ya no usa sale como pista al final, como en el plan real.
  var hambre = c.e("div", "tg-card tg-hambre is-fuera");
  hambre.appendChild(c.e("small", null, c.t("hambre") + "…"));
  hambre.appendChild(c.e("strong", null, c.t("crema") + " · 150" + G));

  raiz.appendChild(ventana);
  raiz.appendChild(puntos);
  raiz.appendChild(envase);
  raiz.appendChild(hambre);

  var QUEDA = [["350" + G, "70%"], ["150" + G, "30%"], ["150" + G, "30%"]];
  function marcar(n) { pts.forEach(function (p, i) { p.classList.toggle("is-on", i === n); }); }
  function quedan(n) { gramos.textContent = QUEDA[n][0]; }
  function paso() { return tarjetas[1].offsetLeft - tarjetas[0].offsetLeft; }
  function arrastrar(n) {
    var dx = -paso();
    gsap.to(c.dedo, { scale: 0.84, duration: 0.15 });
    gsap.to(fila, { x: "+=" + dx, duration: 0.8, ease: "power3.inOut" });
    gsap.to(c.dedo, { x: "+=" + (dx * 0.8), duration: 0.8, ease: "power3.inOut" });
    gsap.to(c.dedo, { scale: 1, duration: 0.2, delay: 0.85 });
    gsap.to(nivel, { width: QUEDA[n][1], duration: 0.7, delay: 0.3, ease: "power2.inOut" });
    marcar(n);
    quedan(n);
  }
  function sobra() { hambre.classList.remove("is-fuera"); }

  return {
    el: raiz,
    play: function (tl) {
      tl.from(tarjetas, { y: 36, opacity: 0, duration: 0.5, stagger: 0.12, ease: "back.out(1.4)" })
        .from(envase, { y: 26, opacity: 0, duration: 0.45, ease: "power3.out" }, "-=0.25")
        .from(nivel, { width: "100%", duration: 0.8, ease: "power2.inOut" }, "-=0.1")
        .add(function () { c.ir(tarjetas[0], 0.7); }, "+=0.2")
        .add(function () { arrastrar(1); }, "+=1.0")
        .add(function () { arrastrar(2); }, "+=1.5")
        .add(function () {
          c.irse();
          sobra();
          gsap.from(hambre, { y: 18, scale: 0.9, opacity: 0, duration: 0.55, ease: "back.out(1.8)" });
        }, "+=1.1");
    },
    fin: function () {
      marcar(2);
      quedan(2);
      nivel.style.width = QUEDA[2][1];
      fila.style.transform = "translateX(" + (-2 * paso()) + "px)";
      sobra();
    }
  };
};

// ── 3. Cambiar una comida, la receta y «No me gusta» ────────────────────

TOUR_SCENES.cambiar = function (c) {
  var raiz = c.e("div", "tg-cambiar");
  var tarjeta = c.e("div", "tg-card tg-plato");
  var cabecera = c.e("div", "tg-plato__cab");
  cabecera.appendChild(c.e("span", "tg-hora", "07:30"));
  var meta = c.e("span", "tg-plato__m", c.t("plato2_meta"));
  cabecera.appendChild(meta);
  var titulo = c.e("strong", "tg-plato__t", c.t("plato2"));
  // Un ingrediente con su «No me gusta», como bajo cada ingrediente del plan.
  var ingrediente = c.e("div", "tg-ingr");
  var ingNombre = c.e("span", "tg-ingr__n", c.t("crema"));
  var bNoGusta = c.e("span", "tg-nogusta", "× " + c.ui("ui.no_me_gusta", "No me gusta"));
  ingrediente.appendChild(ingNombre);
  ingrediente.appendChild(bNoGusta);
  var botones = c.e("div", "tg-botones");
  var bCambiar = c.e("span", "tg-btn tg-btn--s");
  bCambiar.appendChild(c.e("b", null, "↻"));
  bCambiar.appendChild(document.createTextNode(" " + c.ui("ui.cambiar", "Cambiar")));
  var bReceta = c.e("span", "tg-btn tg-btn--s");
  bReceta.appendChild(document.createTextNode(c.ui("ui.como_se_hace", "Cómo se hace") + " "));
  bReceta.appendChild(c.ico("icon-chevron", "tg-ico"));
  botones.appendChild(bCambiar);
  botones.appendChild(bReceta);
  var pasos = c.e("ol", "tg-pasos");
  ["paso1", "paso2", "paso3"].forEach(function (k) { pasos.appendChild(c.e("li", null, c.t(k))); });
  tarjeta.appendChild(cabecera);
  tarjeta.appendChild(titulo);
  tarjeta.appendChild(ingrediente);
  tarjeta.appendChild(botones);
  tarjeta.appendChild(pasos);
  raiz.appendChild(tarjeta);

  // Primero «Cambiar» (sale el bol de avena), luego sus pasos y, al final,
  // «No me gusta» sobre los plátanos: el producto se tacha.
  function cambiar() {
    titulo.textContent = c.t("plato1");
    meta.textContent = c.t("plato1_meta");
    ingNombre.textContent = c.t("platanos");
  }
  function abrir() { pasos.classList.add("is-abierto"); bReceta.classList.add("is-on"); }
  function noGusta() { ingrediente.classList.add("is-fuera"); }

  return {
    el: raiz,
    play: function (tl) {
      tl.from(tarjeta, { y: 44, opacity: 0, duration: 0.6, ease: "back.out(1.5)" })
        .add(function () { c.ir(bCambiar, 0.8); }, "+=0.15")
        .add(function () { c.pulsar(); }, "+=0.95")
        .to(tarjeta, { rotationX: 88, transformPerspective: 700, duration: 0.22, ease: "power2.in" }, "+=0.15")
        .add(cambiar)
        .to(tarjeta, { rotationX: 0, duration: 0.4, ease: "back.out(1.7)" })
        .add(function () { c.ir(bReceta, 0.8); }, "+=0.5")
        .add(function () {
          c.pulsar();
          abrir();
          gsap.fromTo(pasos, { height: 0 }, { height: "auto", duration: 0.45, ease: "power2.out" });
          gsap.from(pasos.children, { x: -16, opacity: 0, duration: 0.4, stagger: 0.13, delay: 0.25, ease: "power2.out" });
        }, "+=0.95")
        .add(function () { c.ir(bNoGusta, 0.8); }, "+=1.3")
        .add(function () {
          c.pulsar();
          noGusta();
          gsap.fromTo(bNoGusta, { scale: 0.9 }, { scale: 1, duration: 0.45, ease: "back.out(2.4)" });
        }, "+=0.95")
        .add(function () { c.irse(); }, "+=1.3");
    },
    fin: function () { cambiar(); abrir(); noGusta(); }
  };
};

// ── 4. La lista de la compra ─────────────────────────────────────────────

TOUR_SCENES.compra = function (c) {
  var raiz = c.e("div", "tg-compra");
  var cab = c.e("div", "tg-card tg-total");
  cab.appendChild(c.e("span", "tg-total__l", c.t("total")));
  cab.appendChild(c.e("strong", "tg-total__n", "41,45 €"));
  var faltan = c.e("em", "tg-total__f");
  cab.appendChild(faltan);
  raiz.appendChild(cab);

  var lista = c.e("div", "tg-lista");
  var filas = [["avena", "1,30 €"], ["platanos", "2,10 €"], ["leche", "0,84 €"], ["huevos", "2,35 €"]].map(function (d) {
    var f = c.e("div", "tg-card tg-item");
    var casilla = c.e("span", "tg-casilla");
    casilla.appendChild(c.ok("tg-ok"));
    f.appendChild(casilla);
    f.appendChild(c.e("span", "tg-item__n", c.t(d[0])));
    f.appendChild(c.e("span", "tg-item__p", d[1]));
    f._casilla = casilla;
    lista.appendChild(f);
    return f;
  });
  raiz.appendChild(lista);

  var pendientes = filas.length;
  function pintarFaltan() { faltan.textContent = c.t("faltan") + " " + pendientes; }
  pintarFaltan();

  function marcar(fila, animar) {
    var hacer = function () { fila.classList.add("is-hecha"); lista.appendChild(fila); };
    pendientes--;
    pintarFaltan();
    if (animar) c.reordenar(filas, hacer); else hacer();
  }

  return {
    el: raiz,
    play: function (tl) {
      tl.from(cab, { y: -26, opacity: 0, duration: 0.5, ease: "back.out(1.5)" })
        .from(filas, { x: -30, opacity: 0, duration: 0.45, stagger: 0.1, ease: "power3.out" }, "-=0.15")
        .add(function () { c.ir(filas[0]._casilla, 0.8); }, "+=0.2")
        .add(function () { c.pulsar(); marcar(filas[0], true); }, "+=0.95")
        .add(function () { c.ir(filas[1]._casilla, 0.7); }, "+=0.7")
        .add(function () { c.pulsar(); marcar(filas[1], true); }, "+=0.85")
        .add(function () { c.irse(); }, "+=1.2");
    },
    fin: function () { marcar(filas[0], false); marcar(filas[1], false); }
  };
};

// ── 5. El producto en Mercadona ──────────────────────────────────────────

TOUR_SCENES.mercadona = function (c) {
  var raiz = c.e("div", "tg-merca");
  var fila = c.e("div", "tg-card tg-item tg-item--grande");
  var casilla = c.e("span", "tg-casilla");
  casilla.appendChild(c.ok("tg-ok"));
  fila.appendChild(casilla);
  fila.appendChild(c.e("span", "tg-item__n", c.t("sardinas")));
  var camara = c.e("span", "tg-camara");
  camara.appendChild(c.ico("icon-camera", "tg-ico"));
  fila.appendChild(camara);
  fila.appendChild(c.e("span", "tg-item__p", "2,20 €"));
  raiz.appendChild(fila);
  var otra = c.e("div", "tg-card tg-item tg-item--apagada");
  var casilla2 = c.e("span", "tg-casilla");
  otra.appendChild(casilla2);
  otra.appendChild(c.e("span", "tg-item__n", c.t("leche")));
  otra.appendChild(c.e("span", "tg-item__p", "0,84 €"));
  raiz.appendChild(otra);

  var ficha = c.e("div", "tg-card tg-ficha");
  var foto = c.e("div", "tg-foto");
  foto.appendChild(c.e("span", "tg-lata"));
  var datos = c.e("div", "tg-ficha__d");
  datos.appendChild(c.e("strong", null, c.t("sardinas")));
  datos.appendChild(c.e("span", null, "2,20 €"));
  var pastilla = c.e("span", "tg-pastilla", "Mercadona");
  datos.appendChild(pastilla);
  ficha.appendChild(foto);
  ficha.appendChild(datos);
  raiz.appendChild(ficha);
  ficha.classList.add("is-fuera");

  return {
    el: raiz,
    play: function (tl) {
      tl.from([fila, otra], { y: 34, opacity: 0, duration: 0.5, stagger: 0.12, ease: "back.out(1.4)" })
        .add(function () { c.ir(camara, 0.8); }, "+=0.2")
        .add(function () { c.pulsar(); gsap.fromTo(camara, { scale: 1 }, { scale: 1.2, duration: 0.2, yoyo: true, repeat: 1 }); }, "+=0.95")
        .add(function () {
          ficha.classList.remove("is-fuera");
          gsap.from(ficha, { y: 120, opacity: 0, duration: 0.7, ease: "back.out(1.5)" });
          gsap.from(foto, { scale: 0.7, duration: 0.7, delay: 0.2, ease: "back.out(2)" });
        }, "+=0.3")
        .add(function () { c.irse(); }, "+=1.4");
    },
    fin: function () { ficha.classList.remove("is-fuera"); }
  };
};

// ── 6. Confirmar el plan de hoy ──────────────────────────────────────────

TOUR_SCENES.hoy = function (c) {
  var raiz = c.e("div", "tg-hoy");
  var boton = c.e("span", "tg-btn tg-btn--p tg-grande");
  var texto = c.e("span", null, c.ui("ui.confirmar_plan_de_hoy", "Confirmar plan de hoy"));
  boton.appendChild(texto);
  raiz.appendChild(boton);

  var barra = c.e("div", "tg-tabs");
  var etiquetas = [["tab_menu", "icon-chef"], ["tab_compra", "icon-cart"], ["tab_planes", "icon-calendar"], ["tab_datos", "icon-user"]];
  var tabPlanes = null;
  etiquetas.forEach(function (d) {
    var tab = c.e("span", "tg-tab");
    tab.appendChild(c.ico(d[1], "tg-ico"));
    tab.appendChild(c.e("small", null, c.t(d[0])));
    if (d[0] === "tab_planes") tabPlanes = tab;
    barra.appendChild(tab);
  });
  var insignia = c.e("i", "tg-insignia", "1");
  tabPlanes.appendChild(insignia);
  raiz.appendChild(barra);
  insignia.hidden = true;

  function guardar() {
    boton.classList.add("is-hecho");
    texto.textContent = c.t("guardado");
    if (!boton.querySelector(".tg-ok")) boton.insertBefore(c.ok("tg-ok"), texto);
    insignia.hidden = false;
    tabPlanes.classList.add("is-on");
  }

  return {
    el: raiz,
    play: function (tl) {
      tl.from(boton, { scale: 0.7, opacity: 0, duration: 0.6, ease: "back.out(1.8)" })
        .from(barra, { y: 50, opacity: 0, duration: 0.5, ease: "power3.out" }, "-=0.3")
        .add(function () { c.ir(boton, 0.8); }, "+=0.2")
        .add(function () {
          c.pulsar();
          guardar();
          gsap.fromTo(boton, { scale: 0.94 }, { scale: 1, duration: 0.5, ease: "elastic.out(1.2,0.5)" });
          gsap.from(insignia, { scale: 0, duration: 0.5, delay: 0.25, ease: "back.out(3)" });
          gsap.fromTo(tabPlanes, { y: 0 }, { y: -9, duration: 0.2, delay: 0.2, yoyo: true, repeat: 3, ease: "sine.inOut" });
        }, "+=0.95")
        .add(function () { c.irse(); }, "+=1.5");
    },
    fin: function () { guardar(); }
  };
};

// ── 7. Datos y «Generar plan» ────────────────────────────────────────────

TOUR_SCENES.generar = function (c) {
  var raiz = c.e("div", "tg-generar");
  var fichas = c.e("div", "tg-fichas");
  [["peso", "78 " + c.ui("unit.kg", "kg")], ["objetivo", c.t("gana")], ["presupuesto", "16 € " + c.t("por_dia")]].forEach(function (d) {
    var f = c.e("div", "tg-card tg-ficha-d");
    f.appendChild(c.e("small", null, c.t(d[0])));
    f.appendChild(c.e("strong", null, d[1]));
    fichas.appendChild(f);
  });
  raiz.appendChild(fichas);

  // De 1 a 7 días, como en «Mis datos» (antes eran solo 1, 3 o 7).
  var segFila = c.e("div", "tg-segfila");
  segFila.appendChild(c.e("small", null, c.t("dias_plan")));
  var seg = c.e("div", "tg-seg tg-seg--siete");
  var opciones = ["1", "2", "3", "4", "5", "6", "7"].map(function (n, i) {
    var s = c.e("span", i === 2 ? "is-on" : null, n);
    seg.appendChild(s);
    return s;
  });
  segFila.appendChild(seg);
  raiz.appendChild(segFila);

  var generar = c.e("span", "tg-btn tg-btn--p tg-grande");
  generar.appendChild(c.ico("icon-chef", "tg-ico"));
  generar.appendChild(document.createTextNode(" " + c.ui("ui.generar_plan", "Generar plan")));
  raiz.appendChild(generar);

  var minis = c.e("div", "tg-minis");
  var barras = [0, 1, 2].map(function () { var b = c.e("span", "tg-mini"); minis.appendChild(b); return b; });
  raiz.appendChild(minis);

  function sieteDias() { opciones.forEach(function (o, i) { o.classList.toggle("is-on", i === 6); }); }

  return {
    el: raiz,
    play: function (tl) {
      tl.from(fichas.children, { y: 30, opacity: 0, duration: 0.45, stagger: 0.1, ease: "back.out(1.4)" })
        .from([segFila, generar, minis], { y: 24, opacity: 0, duration: 0.45, stagger: 0.1, ease: "power3.out" }, "-=0.2")
        .add(function () { c.ir(opciones[6], 0.8); }, "+=0.2")
        .add(function () { c.pulsar(); sieteDias(); }, "+=0.95")
        .add(function () { c.ir(generar, 0.7); }, "+=0.7")
        .add(function () {
          c.pulsar();
          gsap.fromTo(generar, { scale: 0.94 }, { scale: 1, duration: 0.5, ease: "elastic.out(1.2,0.5)" });
          gsap.fromTo(barras, { scaleX: 0.15, opacity: 0.2 }, { scaleX: 1, opacity: 1, duration: 0.6, stagger: 0.12, transformOrigin: "left center", ease: "power3.out" });
        }, "+=0.85")
        .add(function () { c.irse(); }, "+=1.4");
    },
    fin: function () { sieteDias(); }
  };
};

// ── 8. Para quién es el menú: la familia y los invitados ────────────────

TOUR_SCENES.casa = function (c) {
  var raiz = c.e("div", "tg-casa");
  var tarjeta = c.e("div", "tg-card tg-quien");
  tarjeta.appendChild(c.e("small", "tg-etiqueta", c.ui("ui.familia_para_quien", "Para quién es el menú")));
  var personas = c.e("div", "tg-personas");
  personas.appendChild(c.e("span", "tg-persona is-on", c.ui("ui.perfil_yo", "Yo")));
  var otra = c.e("span", "tg-persona is-on", c.t("persona"));
  var anadir = c.e("span", "tg-persona tg-persona--mas", "+ " + c.ui("ui.anadir", "Añadir"));
  personas.appendChild(anadir);
  tarjeta.appendChild(personas);
  // Cómo es el menú: solo tiene sentido con dos o más; hasta entonces, apagado.
  var modo = c.e("div", "tg-seg tg-seg--modo is-apagado");
  var comun = c.e("span", null, c.ui("ui.familia_modo_comun", "Un menú para todos"));
  var cada = c.e("span", null, c.ui("ui.familia_modo_cada", "Cada uno el suyo"));
  modo.appendChild(comun);
  modo.appendChild(cada);
  tarjeta.appendChild(modo);
  raiz.appendChild(tarjeta);

  var total = c.e("div", "tg-card tg-total");
  total.appendChild(c.e("span", "tg-total__l", c.t("total")));
  var precio = c.e("strong", "tg-total__n", "41,45 €");
  total.appendChild(precio);
  var pie = c.e("em", "tg-total__f");
  total.appendChild(pie);
  raiz.appendChild(total);

  function anadirla() {
    if (!otra.parentNode) personas.insertBefore(otra, anadir);
    modo.classList.remove("is-apagado");
  }
  function juntos() {
    comun.classList.add("is-on");
    precio.textContent = "68,90 €";
    pie.textContent = c.ui("ui.familia_plan_comun", "Un menú para {n} personas").replace("{n}", "2");
  }

  return {
    el: raiz,
    play: function (tl) {
      tl.from(tarjeta, { y: 36, opacity: 0, duration: 0.55, ease: "back.out(1.5)" })
        .from(total, { y: 30, opacity: 0, duration: 0.45, ease: "power3.out" }, "-=0.25")
        .add(function () { c.ir(anadir, 0.8); }, "+=0.2")
        .add(function () {
          c.pulsar();
          anadirla();
          gsap.from(otra, { scale: 0, duration: 0.45, ease: "back.out(2.6)" });
        }, "+=0.95")
        .add(function () { c.ir(comun, 0.8); }, "+=0.8")
        .add(function () {
          c.pulsar();
          juntos();
          gsap.fromTo(precio, { scale: 0.8 }, { scale: 1, duration: 0.5, ease: "back.out(2.2)" });
        }, "+=0.95")
        .add(function () { c.irse(); }, "+=1.5");
    },
    fin: function () { anadirla(); juntos(); }
  };
};

// ── 9. Sin cocinar y despensa ────────────────────────────────────────────

TOUR_SCENES.atajos = function (c) {
  var raiz = c.e("div", "tg-atajos");
  var izq = c.e("div", "tg-card tg-atajo");
  var bSin = c.e("span", "tg-btn tg-btn--s");
  bSin.appendChild(c.ico("icon-bolt", "tg-ico"));
  bSin.appendChild(document.createTextNode(" " + c.t("sin_cocinar")));
  izq.appendChild(bSin);
  var fuego = c.e("div", "tg-fuego");
  fuego.appendChild(c.ico("icon-flame", "tg-llama"));
  var tachon = c.e("i", "tg-tachon");
  fuego.appendChild(tachon);
  izq.appendChild(fuego);
  var pie = c.e("small", null, c.t("sin_fuego"));
  izq.appendChild(pie);

  var der = c.e("div", "tg-card tg-atajo");
  var bDesp = c.e("span", "tg-btn tg-btn--s");
  bDesp.appendChild(c.ico("icon-cart", "tg-ico"));
  bDesp.appendChild(document.createTextNode(" " + c.t("despensa")));
  der.appendChild(bDesp);
  var chips = c.e("div", "tg-chips");
  var lista = ["arroz", "huevos", "leche"].map(function (k) { var ch = c.e("span", "tg-chip", c.t(k)); chips.appendChild(ch); return ch; });
  der.appendChild(chips);
  var precio = c.e("div", "tg-precio");
  var viejo = c.e("s", null, "41 €");
  var nuevo = c.e("strong", null, "33 €");
  precio.appendChild(viejo);
  precio.appendChild(nuevo);
  der.appendChild(precio);
  raiz.appendChild(izq);
  raiz.appendChild(der);

  function sinFuego() { izq.classList.add("is-hecho"); }
  function conDespensa() { der.classList.add("is-hecho"); }

  return {
    el: raiz,
    play: function (tl) {
      tl.from([izq, der], { y: 40, opacity: 0, duration: 0.55, stagger: 0.14, ease: "back.out(1.5)" })
        .add(function () { c.ir(bSin, 0.8); }, "+=0.2")
        .add(function () {
          c.pulsar();
          sinFuego();
          gsap.fromTo(tachon, { scaleX: 0 }, { scaleX: 1, duration: 0.45, ease: "power3.out", transformOrigin: "left center" });
        }, "+=0.95")
        .add(function () { c.ir(bDesp, 0.8); }, "+=0.8")
        .add(function () {
          c.pulsar();
          conDespensa();
          gsap.from(lista, { scale: 0, opacity: 0, duration: 0.4, stagger: 0.15, ease: "back.out(2.4)" });
          gsap.from(nuevo, { y: 14, opacity: 0, duration: 0.5, delay: 0.55, ease: "back.out(2)" });
        }, "+=0.95")
        .add(function () { c.irse(); }, "+=1.6");
    },
    fin: function () { sinFuego(); conDespensa(); }
  };
};

// ── 10. Entrenamientos: el botón de arriba cambia de parte ───────────────

TOUR_SCENES.entrenos = function (c) {
  var raiz = c.e("div", "tg-entrenos");
  var modo = c.e("span", "tg-btn tg-btn--s tg-modo");
  modo.appendChild(c.ico("icon-bolt", "tg-ico"));
  var modoTexto = c.e("span", null, c.ui("ent.boton_entreno", "Entrenamientos"));
  modo.appendChild(modoTexto);
  raiz.appendChild(modo);

  // Las dos pantallas ocupan el mismo sitio: la del menú se va y entra la otra.
  var pantallas = c.e("div", "tg-pantallas");
  var comidas = c.e("div", "tg-pantalla");
  [["07:30", "desayuno", "650"], ["13:30", "comida", "820"]].forEach(function (m) {
    var f = c.e("div", "tg-card tg-comida");
    f.appendChild(c.e("span", "tg-hora", m[0]));
    f.appendChild(c.e("span", "tg-nom", c.t(m[1])));
    f.appendChild(c.e("span", "tg-k", m[2] + " " + c.ui("unit.kcal", "kcal")));
    comidas.appendChild(f);
  });

  var entreno = c.e("div", "tg-pantalla is-fuera");
  var hoy = c.e("div", "tg-card tg-hoyent");
  hoy.appendChild(c.e("small", "tg-etiqueta", c.ui("ent.hoy_ojo", "Hoy según el plan")));
  hoy.appendChild(c.e("strong", "tg-hoyent__t", c.ui("ent.sesion_superior_A", "Superior A")));
  hoy.appendChild(c.e("span", "tg-hoyent__d",
    c.ui("ent.hoy_datos", "{min} min · {n} ejercicios").replace("{min}", "45").replace("{n}", "5")));
  entreno.appendChild(hoy);
  var semana = c.semanaEntreno(0);
  entreno.appendChild(semana.el);
  entreno.appendChild(c.barraEntreno(0).el);
  pantallas.appendChild(comidas);
  pantallas.appendChild(entreno);
  raiz.appendChild(pantallas);

  function aEntrenar() {
    modoTexto.textContent = c.ui("ent.boton_menu", "Menú");
    modo.classList.add("is-on");
    comidas.classList.add("is-fuera");
    entreno.classList.remove("is-fuera");
  }

  return {
    el: raiz,
    play: function (tl) {
      tl.from(modo, { y: -24, opacity: 0, duration: 0.45, ease: "back.out(1.6)" })
        .from(comidas.children, { y: 30, opacity: 0, duration: 0.45, stagger: 0.12, ease: "power3.out" }, "-=0.15")
        .add(function () { c.ir(modo, 0.8); }, "+=0.3")
        .add(function () {
          c.pulsar();
          aEntrenar();
          gsap.from(entreno.children, { y: 34, opacity: 0, duration: 0.5, stagger: 0.12, ease: "back.out(1.4)" });
          gsap.from(semana.dias, { scale: 0.4, opacity: 0, duration: 0.35, stagger: 0.05, delay: 0.3, ease: "back.out(2)" });
        }, "+=0.95")
        .add(function () { c.irse(); }, "+=1.8");
    },
    fin: function () { aEntrenar(); }
  };
};

// ── 11. El menú: idioma y aspecto ────────────────────────────────────────

TOUR_SCENES.menu = function (c) {
  var raiz = c.e("div", "tg-menu");
  var barra = c.e("div", "tg-card tg-barra-sup");
  var burger = c.e("span", "tg-burger");
  burger.appendChild(c.ico("icon-menu", "tg-ico"));
  barra.appendChild(burger);
  barra.appendChild(c.e("strong", null, "Weekplate"));
  raiz.appendChild(barra);

  var hoja = c.e("div", "tg-card tg-hoja");
  var fIdioma = c.e("div", "tg-hoja__f");
  fIdioma.appendChild(c.e("small", null, c.ui("ui.idioma", "Idioma")));
  var idiomas = c.e("div", "tg-seg");
  var chipsI = ["ES", "EN", "RU", "UK"].map(function (n, i) { var s = c.e("span", i === 0 ? "is-on" : null, n); idiomas.appendChild(s); return s; });
  fIdioma.appendChild(idiomas);
  var fAsp = c.e("div", "tg-hoja__f");
  fAsp.appendChild(c.e("small", null, c.ui("ui.aspecto", "Aspecto")));
  var muestras = c.e("div", "tg-muestras");
  var colores = ["#3f9d6b", "#1b1e25", "#0c1713", "#ff8fb3", "#e8d9bd"];
  var bolas = colores.map(function (col, i) {
    var m = c.e("span", i === 0 ? "tg-muestra is-on" : "tg-muestra");
    m.style.background = col;
    muestras.appendChild(m);
    return m;
  });
  fAsp.appendChild(muestras);
  var fRep = c.e("div", "tg-hoja__f tg-repetir");
  fRep.appendChild(c.e("span", null, c.t("repetir")));
  fRep.appendChild(c.ico("icon-chevron", "tg-ico"));
  hoja.appendChild(fIdioma);
  hoja.appendChild(fAsp);
  hoja.appendChild(fRep);
  raiz.appendChild(hoja);

  function elegir(lista, n) { lista.forEach(function (x, i) { x.classList.toggle("is-on", i === n); }); }

  return {
    el: raiz,
    play: function (tl) {
      tl.from(barra, { y: -30, opacity: 0, duration: 0.5, ease: "back.out(1.5)" })
        .set(hoja, { opacity: 0, y: -16, scale: 0.96, transformOrigin: "top left" })
        .add(function () { c.ir(burger, 0.8); }, "+=0.2")
        .add(function () { c.pulsar(); gsap.to(hoja, { opacity: 1, y: 0, scale: 1, duration: 0.5, ease: "back.out(1.6)" }); }, "+=0.95")
        .add(function () { c.ir(chipsI[1], 0.8); }, "+=0.8")
        .add(function () { c.pulsar(); elegir(chipsI, 1); }, "+=0.95")
        .add(function () { c.ir(bolas[3], 0.8); }, "+=0.6")
        .add(function () { c.pulsar(); elegir(bolas, 3); }, "+=0.95")
        .add(function () { c.ir(fRep, 0.8); }, "+=0.6")
        .add(function () { c.pulsar(); fRep.classList.add("is-on"); }, "+=0.95")
        .add(function () { c.irse(); }, "+=1.2");
    },
    fin: function () { elegir(chipsI, 1); elegir(bolas, 3); fRep.classList.add("is-on"); }
  };
};

// ── El motor de una escena ───────────────────────────────────────────────

/** La luminancia relativa de un color "rgb(r, g, b)" o "rgba(...)" (WCAG). */
function _tgLuz(color) {
  var m = String(color).match(/[\d.]+/g);
  if (!m || m.length < 3) return null;
  var canal = function (v) { v = Number(v) / 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  return 0.2126 * canal(m[0]) + 0.7152 * canal(m[1]) + 0.0722 * canal(m[2]);
}

/**
 * ¿El acento (--volt) casi no se distingue del relleno de marca (--primary)?
 * Las cifras grandes de las maquetas (las kcal, el total de la compra, el
 * descanso) van en volt sobre ese relleno. En «Grafito», el aspecto por
 * defecto desde el 2026-10-22, los dos son el MISMO lima, y en «Noche» casi:
 * las cifras no se veían (comprobado el 2026-10-28, también en producción).
 * Entonces pasan al color del texto de ese relleno (.tg-volt-plano, en el CSS).
 */
function _tgVoltPlano(stage) {
  if (typeof window === "undefined" || typeof window.getComputedStyle !== "function" || !stage.appendChild) return false;
  var sonda = document.createElement("span");
  sonda.style.cssText = "position:absolute;visibility:hidden;color:var(--volt);background-color:var(--primary)";
  stage.appendChild(sonda);
  var cs = window.getComputedStyle(sonda);
  var a = _tgLuz(cs.color);
  var b = _tgLuz(cs.backgroundColor);
  stage.removeChild(sonda);
  if (a === null || b === null) return false;
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05) < 1.6;
}

/**
 * Si la maqueta, ya compactada, sigue sin caber en su escena, la encoge
 * entera (nunca por debajo de 0,72: más pequeña no se lee). Medido el
 * 2026-10-28 en 320×568 con el ruso: tres escenas se salían ANTES de añadir
 * nada (la de cambiar, la compra y los datos). El dedo no se entera: va a
 * donde se VE cada botón (getBoundingClientRect ya cuenta la escala).
 */
function _tgEncajar(maqueta, stage) {
  if (typeof window === "undefined" || typeof window.getComputedStyle !== "function" || !maqueta.style) return;
  var cs = window.getComputedStyle(stage);
  var alto = stage.clientHeight - (parseFloat(cs.paddingTop) || 0) - (parseFloat(cs.paddingBottom) || 0);
  var ancho = stage.clientWidth - (parseFloat(cs.paddingLeft) || 0) - (parseFloat(cs.paddingRight) || 0);
  var r = maqueta.getBoundingClientRect();
  if (!(alto > 0) || !(r.height > 0)) return;
  var k = Math.min(1, alto / r.height, (ancho > 0 && r.width > 0) ? ancho / r.width : 1);
  if (k >= 0.99) return;
  maqueta.style.transformOrigin = "50% 50%";
  maqueta.style.transform = "scale(" + Math.max(0.72, k).toFixed(3) + ")";
}

/**
 * Monta la escena `id` dentro de `el` y, si `animar`, la reproduce en bucle
 * (con una pausa entre pasadas). Sin animación la deja en su estado final.
 *
 * Cada pasada vuelve a construir la maqueta desde cero: es lo más simple y
 * lo que evita arrastrar estados a medias de una pasada a la siguiente.
 *
 * `escenas` es de dónde salen: TOUR_SCENES si no se dice. El tutorial de
 * entrenamientos (js/ui/entreno-tutorial.js) pasa las suyas y reutiliza todo
 * lo demás: el dedo, el bucle y la maqueta compacta.
 *
 * @returns {{parar: function()}}
 */
function tourEscenaMontar(id, el, animar, escenas) {
  var fabrica = (escenas || TOUR_SCENES)[id];
  var inerte = { parar: function () {} };
  if (typeof fabrica !== "function") return inerte;
  if (el.classList) el.classList.toggle("tg-volt-plano", _tgVoltPlano(el));

  var vivo = true;
  var tl = null;
  var espera = null;
  var c = _tgCrearContexto(el, function () { return vivo; });

  function limpiar() {
    while (el.firstChild) el.removeChild(el.firstChild);
  }
  function montar() {
    limpiar();
    var esc = fabrica(c);
    el.appendChild(esc.el);
    // En una pantalla baja (un móvil pequeño, o con la barra del navegador
    // delante) la maqueta no cabe: se compacta (menos aire y letra más
    // pequeña, ver .tg-compacto) en vez de recortarla. Si ni así cabe, se
    // encoge entera (_tgEncajar).
    el.classList.remove("tg-compacto");
    if (esc.el.getBoundingClientRect().height > el.clientHeight - 24) el.classList.add("tg-compacto");
    _tgEncajar(esc.el, el);
    return esc;
  }

  var esc = montar();
  if (!animar || typeof gsap === "undefined") {
    if (esc.fin) esc.fin();
    return { parar: function () { vivo = false; } };
  }

  function matar() {
    if (tl) { tl.kill(); tl = null; }
    gsap.killTweensOf(el.querySelectorAll("*"));
  }

  function jugar() {
    c.crearDedo();
    tl = gsap.timeline({
      onComplete: function () {
        // Una pausa mirando el resultado y vuelta a empezar, con un fundido.
        espera = gsap.delayedCall(2.6, function () {
          if (!vivo) return;
          gsap.to(el, { opacity: 0, duration: 0.3, onComplete: function () {
            if (!vivo) return;
            matar();
            esc = montar();
            gsap.set(el, { opacity: 1 });
            jugar();
          } });
        });
      }
    });
    esc.play(tl);
  }
  jugar();

  return {
    parar: function () {
      vivo = false;
      if (espera) espera.kill();
      matar();
      gsap.set(el, { clearProps: "opacity" });
    }
  };
}
