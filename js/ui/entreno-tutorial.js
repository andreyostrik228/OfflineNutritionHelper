/**
 * js/ui/entreno-tutorial.js
 * ─────────────────────────────────────────────────────────────────────────
 * TUTORIAL DEL PANEL DE ENTRENAMIENTOS. Seis pasos, uno por cosa que se hace
 * a menudo: «Inicio», anotar series en «Entrenar», cambiar sobre la marcha,
 * «Plan» con su calendario, «Progreso» y «Perfil». Sale solo la primera vez
 * que hay programa, y luego con «Cómo se usa». Es un <dialog> aparte del
 * recorrido general (js/ui/tour.js).
 *
 * ── Rehecho el 2026-10-28 ───────────────────────────────────────────────
 * Hasta entonces cada paso llevaba un dibujo fijo (una flecha, una marca,
 * tres puntos...) que no enseñaba la pantalla. Ahora lleva una MAQUETA
 * animada en la que un dedo pulsa los botones, como el recorrido general:
 * reutiliza su motor (tourEscenaMontar, js/ui/tour-scenes.js) con las
 * escenas de aquí (ENTRENO_TUT_ESCENAS). Sin GSAP o con «menos movimiento»
 * cada maqueta se queda quieta en su estado final.
 *
 * Las palabras de las maquetas son las REALES de la interfaz (claves `ent.*`)
 * y los ejercicios salen del catálogo en el idioma de la pantalla, con su
 * animación si la tienen (js/ui/entreno-figura.js): lo que se ve aquí es lo
 * que se encuentra luego.
 *
 * Lo visto se guarda en este navegador (ENTRENO_TUT_CLAVE). No hace falta que
 * viaje a la cuenta: es una cosa que se ve una vez por dispositivo.
 *
 * Depende de: js/ui/tour-scenes.js (tourEscenaMontar), js/ui/tour-fx.js
 *   (tourFxActivo, opcional), gsap (opcional), t()/tFormat().
 *
 * Expone (globales):
 *   ENTRENO_TUT_IDS, ENTRENO_TUT_PASOS, ENTRENO_TUT_CLAVE, ENTRENO_TUT_ESCENAS
 *   entrenoTutorialHtml(paso)       marcado del paso (sin DOM; lo prueban los tests)
 *   entrenoTutorialAbrir(paso?)     abre el tutorial en ese paso
 *   entrenoTutorialAuto()           lo abre si nunca se vio (lo llama renderEntreno)
 *   initEntrenoTutorial()           cablea los botones (una vez)
 * ─────────────────────────────────────────────────────────────────────────
 */

var ENTRENO_TUT_IDS = ["inicio", "series", "cambiar", "plan", "progreso", "perfil"];
var ENTRENO_TUT_PASOS = ENTRENO_TUT_IDS.length;
var ENTRENO_TUT_CLAVE = "nutritionPlanner.entrenoTutorial.v1";
var ENTRENO_TUT_ESCENAS = {};
// El color de cada paso: la variable de un macro, como en el recorrido general.
var ENTRENO_TUT_ACENTOS = {
  inicio: "volt", series: "kcal", cambiar: "carbs", plan: "protein", progreso: "fat", perfil: "volt"
};
var _tutPaso = 0;
var _tutCableado = false;
var _tutEscena = null;   // {parar()} de la maqueta que está sonando
var _tutTocado = null;   // dónde empezó el dedo, para deslizar de paso

function _tutEsc(texto) { return escapeHtml(String(texto)); }

function _tutAcotar(paso) {
  return Math.max(0, Math.min(ENTRENO_TUT_PASOS - 1, Math.floor(Number(paso)) || 0));
}

/** El marcado de un paso: la escena (vacía: la llena _tutPintar), título, texto, puntos y botones. Sin DOM. */
function entrenoTutorialHtml(paso) {
  var n = _tutAcotar(paso);
  var ultimo = n === ENTRENO_TUT_PASOS - 1;
  var puntos = "";
  for (var i = 0; i < ENTRENO_TUT_PASOS; i++) {
    puntos += '<button type="button" class="tut__punto' + (i === n ? " is-on" : "") + '" data-tut-ir="' + i + '"' +
      (i === n ? ' aria-current="step"' : "") +
      ' aria-label="' + _tutEsc(tFormat("ent.tut_paso", { n: i + 1, total: ENTRENO_TUT_PASOS })) + '"></button>';
  }
  return '<div class="tut-dialogo__cuerpo" data-tut-paso="' + n + '">' +
    '<div class="tut__ilustracion" data-tut-escena="' + ENTRENO_TUT_IDS[n] + '" aria-hidden="true"></div>' +
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

// ── Ayudantes de las maquetas ────────────────────────────────────────────

/** Un texto de la interfaz con sus huecos rellenos; sin traducción, el español que se da. */
function _tutUi(c, clave, original, datos) {
  var x = c.ui(clave, original);
  Object.keys(datos || {}).forEach(function (k) { x = x.split("{" + k + "}").join(String(datos[k])); });
  return x;
}

/** El nombre de un ejercicio del catálogo en el idioma de la pantalla. */
function _tutEjercicio(id, nombre) {
  return typeof entrenoNombre === "function" ? entrenoNombre({ id: id, name: nombre }) : nombre;
}

/** La figura animada del ejercicio (js/ui/entreno-figura.js), si la tiene. */
function _tutFigura(c, id) {
  var caja = c.e("span", "tut-fig");
  if (typeof entrenoAnimacionHtml === "function") caja.innerHTML = entrenoAnimacionHtml(id, "mini");
  return caja;
}

/** Pone en marcha las figuras de la maqueta: ya está en la página. */
function _tutFigurasActivar(el) {
  if (typeof entrenoAnimacionesActivar === "function" && el && el.querySelectorAll) entrenoAnimacionesActivar(el);
}

/** El título, la línea de series y el menú ⋯ de un ejercicio, como en «Entrenar». */
function _tutCabecera(c, id, nombre, conFigura) {
  var cab = c.e("div", "tut-ej__cab");
  if (conFigura) cab.appendChild(_tutFigura(c, id));
  var texto = c.e("div", "tut-ej__nom");
  var titulo = c.e("strong", null, _tutEjercicio(id, nombre));
  texto.appendChild(titulo);
  texto.appendChild(c.e("small", null, _tutUi(c, "ent.plan_linea", "{series} × {reps} · descanso {descanso}",
    { series: 4, reps: "8–12", descanso: "2:30" })));
  cab.appendChild(texto);
  var puntos = c.e("span", "tut-puntos3", "⋯");
  cab.appendChild(puntos);
  return { el: cab, titulo: titulo, puntos: puntos };
}

// ── 1. Inicio: lo que toca hoy y «Empezar entrenamiento» ─────────────────

ENTRENO_TUT_ESCENAS.inicio = function (c) {
  var raiz = c.e("div", "tg-entrenos");
  var hoy = c.e("div", "tg-card tg-hoyent");
  hoy.appendChild(c.e("small", "tg-etiqueta", c.ui("ent.hoy_ojo", "Hoy según el plan")));
  hoy.appendChild(c.e("strong", "tg-hoyent__t", c.ui("ent.sesion_superior_A", "Superior A")));
  hoy.appendChild(c.e("span", "tg-hoyent__d", _tutUi(c, "ent.hoy_datos", "{min} min · {n} ejercicios", { min: 45, n: 5 })));
  var empezar = c.e("span", "tg-btn tg-btn--p tut-empezar", c.ui("ent.empezar", "Empezar entrenamiento"));
  hoy.appendChild(empezar);
  raiz.appendChild(hoy);
  var semana = c.semanaEntreno(0);
  raiz.appendChild(semana.el);
  var barra = c.barraEntreno(0);
  raiz.appendChild(barra.el);

  // Empezar abre la sesión en «Entrenar»: la barra se enciende allí.
  function aEntrenar() {
    barra.tabs.forEach(function (tab, i) { tab.classList.toggle("is-on", i === 2); });
    empezar.classList.add("is-hecho");
  }

  return {
    el: raiz,
    play: function (tl) {
      tl.from(hoy, { y: 30, opacity: 0, duration: 0.5, ease: "back.out(1.5)" })
        .from(semana.dias, { scale: 0.4, opacity: 0, duration: 0.35, stagger: 0.05, ease: "back.out(2)" }, "-=0.2")
        .from(barra.el, { y: 30, opacity: 0, duration: 0.45, ease: "power3.out" }, "-=0.2")
        .add(function () { c.ir(empezar, 0.8); }, "+=0.2")
        .add(function () {
          c.pulsar();
          aEntrenar();
          gsap.fromTo(empezar, { scale: 0.94 }, { scale: 1, duration: 0.5, ease: "elastic.out(1.2,0.5)" });
          gsap.fromTo(barra.tabs[2], { y: 0 }, { y: -8, duration: 0.2, delay: 0.2, yoyo: true, repeat: 3, ease: "sine.inOut" });
        }, "+=0.95")
        .add(function () { c.irse(); }, "+=1.5");
    },
    fin: aEntrenar
  };
};

// ── 2. Anotar una serie: la marca y el descanso que empieza solo ─────────

ENTRENO_TUT_ESCENAS.series = function (c) {
  var raiz = c.e("div", "tut-series");
  var tarjeta = c.e("div", "tg-card tut-ej");
  var cab = _tutCabecera(c, "press_banca_mancuernas", "Press de banca con mancuernas", true);
  tarjeta.appendChild(cab.el);
  tarjeta.appendChild(c.e("p", "tut-ej__antes", _tutUi(c, "ent.ultima_vez", "La última vez: {series}",
    { series: "20 " + c.ui("ent.kg", "kg") + " × 10" })));

  var tabla = c.e("div", "tut-tabla");
  var cabecera = c.e("div", "tut-serie tut-serie--cab");
  [c.ui("ent.col_serie", "Serie"), c.ui("ent.col_kg", "kg"), c.ui("ent.col_reps_corto", "Reps"), ""].forEach(function (x) {
    cabecera.appendChild(c.e("span", null, x));
  });
  tabla.appendChild(cabecera);
  var filas = [["1", "22", "10"], ["2", "22", "9"], ["3", "", ""]].map(function (d) {
    var f = c.e("div", "tut-serie");
    f.appendChild(c.e("span", "tut-serie__n", d[0]));
    f.appendChild(c.e("span", "tut-serie__v", d[1] || "—"));
    f.appendChild(c.e("span", "tut-serie__v", d[2] || "—"));
    var ok = c.e("span", "tut-serie__ok");
    ok.appendChild(c.ok("tg-ok"));
    f.appendChild(ok);
    f._ok = ok;
    tabla.appendChild(f);
    return f;
  });
  tarjeta.appendChild(tabla);
  raiz.appendChild(tarjeta);

  var descanso = c.e("div", "tut-descanso is-fuera");
  descanso.appendChild(c.e("span", null, c.ui("ent.descanso", "Descanso")));
  var reloj = c.e("strong", null, "2:30");
  descanso.appendChild(reloj);
  var barraDescanso = c.e("span", "tut-descanso__barra");
  var resto = c.e("i");
  barraDescanso.appendChild(resto);
  descanso.appendChild(barraDescanso);
  raiz.appendChild(descanso);

  function hora(s) { var m = Math.floor(s / 60); var r = Math.max(0, Math.ceil(s - m * 60)); if (r === 60) { m++; r = 0; } return m + ":" + (r < 10 ? "0" : "") + r; }
  function marcar() { filas[0].classList.add("is-hecha"); descanso.classList.remove("is-fuera"); }

  return {
    el: raiz,
    play: function (tl) {
      tl.add(function () { _tutFigurasActivar(raiz); })
        .from(tarjeta, { y: 34, opacity: 0, duration: 0.5, ease: "back.out(1.4)" })
        .from(filas, { x: -20, opacity: 0, duration: 0.4, stagger: 0.1, ease: "power3.out" }, "-=0.2")
        .add(function () { c.ir(filas[0]._ok, 0.8); }, "+=0.3")
        .add(function () {
          c.pulsar();
          marcar();
          gsap.from(descanso, { y: 30, opacity: 0, duration: 0.5, ease: "back.out(1.6)" });
          var cuenta = { s: 150 };
          gsap.to(cuenta, { s: 146, duration: 4, ease: "none", delay: 0.4, onUpdate: function () { reloj.textContent = hora(cuenta.s); } });
          gsap.fromTo(resto, { scaleX: 1 }, { scaleX: 0.86, duration: 4.4, ease: "none", transformOrigin: "left center" });
        }, "+=0.95")
        .add(function () { c.irse(); }, "+=1.2");
    },
    fin: function () { _tutFigurasActivar(raiz); marcar(); reloj.textContent = "2:28"; }
  };
};

// ── 3. Cambiar sobre la marcha: el menú ⋯ de cada ejercicio ─────────────

ENTRENO_TUT_ESCENAS.cambiar = function (c) {
  var raiz = c.e("div", "tut-cambiar");
  var tarjeta = c.e("div", "tg-card tut-ej");
  var cab = _tutCabecera(c, "press_banca_mancuernas", "Press de banca con mancuernas", false);
  tarjeta.appendChild(cab.el);
  raiz.appendChild(tarjeta);

  var menu = c.e("div", "tg-card tut-menu is-fuera");
  var opciones = [["ent.accion_sustituir", "Cambiar por otro ejercicio"], ["ent.accion_saltar", "Saltar este ejercicio"],
    ["ent.accion_calentar", "Añadir series de calentamiento"], ["ent.accion_superserie", "Superserie con el siguiente"]]
    .map(function (o) {
      var op = c.e("span", "tut-menu__op", c.ui(o[0], o[1]));
      menu.appendChild(op);
      return op;
    });
  raiz.appendChild(menu);

  function abrir() { menu.classList.remove("is-fuera"); cab.puntos.classList.add("is-on"); }
  function sustituir() {
    opciones[0].classList.add("is-on");
    cab.titulo.textContent = _tutEjercicio("press_inclinado_mancuernas", "Press inclinado con mancuernas");
  }

  return {
    el: raiz,
    play: function (tl) {
      tl.from(tarjeta, { y: 34, opacity: 0, duration: 0.5, ease: "back.out(1.4)" })
        .add(function () { c.ir(cab.puntos, 0.8); }, "+=0.2")
        .add(function () {
          c.pulsar();
          abrir();
          gsap.from(menu, { y: -12, scale: 0.94, opacity: 0, duration: 0.4, ease: "back.out(1.7)", transformOrigin: "top right" });
          gsap.from(opciones, { x: -12, opacity: 0, duration: 0.3, stagger: 0.07, delay: 0.1, ease: "power2.out" });
        }, "+=0.95")
        .add(function () { c.ir(opciones[0], 0.8); }, "+=0.9")
        .add(function () { c.pulsar(); }, "+=0.95")
        .to(tarjeta, { rotationX: 88, transformPerspective: 700, duration: 0.22, ease: "power2.in" }, "+=0.1")
        .add(sustituir)
        .to(tarjeta, { rotationX: 0, duration: 0.4, ease: "back.out(1.7)" })
        .add(function () { c.irse(); }, "+=1.3");
    },
    fin: function () { abrir(); sustituir(); }
  };
};

// ── 4. Plan: el calendario del mes ───────────────────────────────────────

ENTRENO_TUT_ESCENAS.plan = function (c) {
  var raiz = c.e("div", "tut-plan");
  var cal = c.e("div", "tg-card tut-cal");
  cal.appendChild(c.e("small", "tg-etiqueta", c.ui("ent.cal_titulo", "Calendario")));
  var rejilla = c.e("div", "tut-cal__rejilla");
  var cortos = ["Lu", "Ma", "Mi", "Ju", "Vi", "Sá", "Do"];
  cortos.forEach(function (corto, i) { rejilla.appendChild(c.e("span", "tut-cal__sem", c.ui("ent.dia_corto_" + (i + 1), corto))); });
  // Cuatro semanas: toca lunes, martes, jueves y viernes; hechas, las de antes de hoy (miércoles 17).
  var HOY = 16;
  var celdas = [];
  for (var i = 0; i < 28; i++) {
    var toca = [0, 1, 3, 4].indexOf(i % 7) !== -1;
    var clase = "tut-cal__d" + (toca ? (i < HOY ? " is-hecha" : " is-toca") : "") + (i === HOY ? " is-hoy" : "");
    var celda = c.e("span", clase, String(i + 1));
    rejilla.appendChild(celda);
    celdas.push(celda);
  }
  cal.appendChild(rejilla);
  var leyenda = c.e("div", "tut-cal__leyenda");
  leyenda.appendChild(c.e("span", "tut-cal__ley tut-cal__ley--hecha", c.ui("ent.cal_leyenda_hecho", "Hecho")));
  leyenda.appendChild(c.e("span", "tut-cal__ley tut-cal__ley--toca", c.ui("ent.cal_leyenda_plan", "Toca")));
  cal.appendChild(leyenda);
  raiz.appendChild(cal);

  var info = c.e("div", "tg-card tut-cal__info", c.ui("ent.cal_descanso", "Según el plan, día de descanso."));
  raiz.appendChild(info);

  var ELEGIDO = 17;
  function elegir() {
    celdas.forEach(function (x, i) { x.classList.toggle("is-elegida", i === ELEGIDO); });
    info.textContent = _tutUi(c, "ent.cal_dia_plan", "{fecha}, toca: {nombre}",
      { fecha: c.ui("ent.dia_4", "Jueves") + " " + (ELEGIDO + 1), nombre: c.ui("ent.sesion_superior_B", "Superior B") });
  }

  return {
    el: raiz,
    play: function (tl) {
      tl.from(cal, { y: 30, opacity: 0, duration: 0.5, ease: "back.out(1.4)" })
        .from(celdas, { scale: 0.3, opacity: 0, duration: 0.3, stagger: 0.015, ease: "back.out(2)" }, "-=0.25")
        .from(info, { y: 20, opacity: 0, duration: 0.4, ease: "power3.out" }, "-=0.2")
        .add(function () { c.ir(celdas[ELEGIDO], 0.8); }, "+=0.3")
        .add(function () {
          c.pulsar();
          elegir();
          gsap.fromTo(celdas[ELEGIDO], { scale: 0.8 }, { scale: 1, duration: 0.45, ease: "back.out(2.6)" });
          gsap.from(info, { y: 10, opacity: 0, duration: 0.4, ease: "power2.out" });
        }, "+=0.95")
        .add(function () { c.irse(); }, "+=1.6");
    },
    fin: elegir
  };
};

// ── 5. Progreso: la gráfica de un ejercicio por periodos ────────────────

ENTRENO_TUT_ESCENAS.progreso = function (c) {
  var NS = "http://www.w3.org/2000/svg";
  var raiz = c.e("div", "tut-prog");
  var tarjeta = c.e("div", "tg-card tut-graf");
  var cab = c.e("div", "tut-graf__cab");
  cab.appendChild(c.e("strong", null, _tutEjercicio("press_banca_mancuernas", "Press de banca con mancuernas")));
  var record = c.e("span", "tg-pastilla tut-record is-fuera", c.ui("ent.record", "Récord"));
  cab.appendChild(record);
  tarjeta.appendChild(cab);

  var periodos = c.e("div", "tg-seg tut-periodos");
  var opciones = [["ent.periodo_mes", "Mes"], ["ent.periodo_ano", "Año"], ["ent.periodo_todo", "Todo"]].map(function (p, i) {
    var s = c.e("span", i === 0 ? "is-on" : null, c.ui(p[0], p[1]));
    periodos.appendChild(s);
    return s;
  });
  tarjeta.appendChild(periodos);

  var svg = document.createElementNS(NS, "svg");
  svg.setAttribute("class", "tut-graf__svg");
  svg.setAttribute("viewBox", "0 0 200 80");
  svg.setAttribute("preserveAspectRatio", "none");
  svg.setAttribute("aria-hidden", "true");
  var linea = document.createElementNS(NS, "polyline");
  linea.setAttribute("class", "tut-graf__linea");
  linea.setAttribute("pathLength", "1");
  var MES = "8,56 56,50 104,46 152,40 192,34";
  var ANO = "8,72 36,66 64,62 92,52 120,47 148,38 176,30 192,18";
  linea.setAttribute("points", MES);
  svg.appendChild(linea);
  tarjeta.appendChild(svg);
  raiz.appendChild(tarjeta);

  var fichas = c.e("div", "tut-fichas");
  [["ent.peso_titulo", "Peso corporal", "79 " + c.ui("ent.kg", "kg")],
   ["ent.medidas_titulo", "Medidas", "−2 " + c.ui("unit.cm", "cm")]].forEach(function (d) {
    var f = c.e("div", "tg-card tg-ficha-d");
    f.appendChild(c.e("small", null, c.ui(d[0], d[1])));
    f.appendChild(c.e("strong", null, d[2]));
    fichas.appendChild(f);
  });
  raiz.appendChild(fichas);

  function anual() {
    opciones.forEach(function (o, i) { o.classList.toggle("is-on", i === 1); });
    linea.setAttribute("points", ANO);
    record.classList.remove("is-fuera");
  }

  return {
    el: raiz,
    play: function (tl) {
      tl.from(tarjeta, { y: 30, opacity: 0, duration: 0.5, ease: "back.out(1.4)" })
        .fromTo(linea, { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 1, ease: "power2.out" }, "-=0.1")
        .from(fichas.children, { y: 24, opacity: 0, duration: 0.4, stagger: 0.1, ease: "power3.out" }, "-=0.5")
        .add(function () { c.ir(opciones[1], 0.8); }, "+=0.2")
        .add(function () {
          c.pulsar();
          anual();
          gsap.fromTo(linea, { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 1.1, ease: "power2.out" });
          gsap.from(record, { scale: 0, duration: 0.5, delay: 0.9, ease: "back.out(2.6)" });
        }, "+=0.95")
        .add(function () { c.irse(); }, "+=1.8");
    },
    fin: anual
  };
};

// ── 6. Perfil: respuestas y lo que pasa durante el entrenamiento ─────────

ENTRENO_TUT_ESCENAS.perfil = function (c) {
  var raiz = c.e("div", "tut-perfil");
  var resp = c.e("div", "tg-card tut-resp");
  resp.appendChild(c.e("small", "tg-etiqueta", c.ui("ent.perfil_respuestas", "Tus respuestas")));
  var chips = c.e("div", "tut-resp__chips");
  [c.ui("ent.nivel_principiante", "Principiante"), _tutUi(c, "ent.dias_n", "{n} días", { n: 4 }),
   c.ui("ent.duracion_45", "45 min"), c.ui("ent.equipo_gimnasio", "Gimnasio")].forEach(function (x) {
    chips.appendChild(c.e("span", "tg-chip", x));
  });
  resp.appendChild(chips);
  raiz.appendChild(resp);

  var ajustes = c.e("div", "tg-card tut-ajustes");
  ajustes.appendChild(c.e("small", "tg-etiqueta", c.ui("ent.perfil_sesion", "Durante el entrenamiento")));
  var filas = [["ent.sonido", "Sonido al acabar el descanso", true],
    ["ent.vibracion", "Vibración al marcar una serie y al acabar el descanso", true],
    ["ent.preguntas", "Preguntar cómo te encuentras y las repeticiones en reserva", false]].map(function (d) {
    var f = c.e("div", "tut-ajuste" + (d[2] ? " is-on" : ""));
    f.appendChild(c.e("span", "tut-ajuste__t", c.ui(d[0], d[1])));
    var interruptor = c.e("span", "tut-interruptor");
    interruptor.appendChild(c.e("i"));
    f.appendChild(interruptor);
    f._interruptor = interruptor;
    ajustes.appendChild(f);
    return f;
  });
  raiz.appendChild(ajustes);

  function preguntar() { filas[2].classList.add("is-on"); }

  return {
    el: raiz,
    play: function (tl) {
      tl.from([resp, ajustes], { y: 30, opacity: 0, duration: 0.5, stagger: 0.12, ease: "back.out(1.4)" })
        .add(function () { c.ir(filas[2]._interruptor, 0.8); }, "+=0.3")
        .add(function () { c.pulsar(); preguntar(); }, "+=0.95")
        .add(function () { c.irse(); }, "+=1.5");
    },
    fin: preguntar
  };
};

// ── El diálogo ───────────────────────────────────────────────────────────

function _tutDialogo() { return document.getElementById("entTutDialogo"); }

function _tutPararEscena() {
  if (_tutEscena) { _tutEscena.parar(); _tutEscena = null; }
}

/** Monta la maqueta del paso en su sitio (el diálogo ya está abierto: hace falta medir). */
function _tutMontarEscena(cuerpo, dir) {
  var sitio = cuerpo.querySelector(".tut__ilustracion");
  if (!sitio || typeof tourEscenaMontar !== "function") return;
  var id = ENTRENO_TUT_IDS[_tutPaso];
  var v = ENTRENO_TUT_ACENTOS[id] || "volt";
  sitio.style.setProperty("--tg-acento", "var(--" + v + ")");
  sitio.style.setProperty("--tg-wash", "var(--" + v + "-wash)");
  var stage = document.createElement("div");
  stage.className = "tg-stage";
  sitio.appendChild(stage);
  var animar = typeof tourFxActivo === "function" && tourFxActivo();
  try {
    _tutEscena = tourEscenaMontar(id, stage, animar, ENTRENO_TUT_ESCENAS);
  } catch (e) {
    _tutEscena = null;
    if (typeof console !== "undefined") console.error("tutorial de entrenamientos, escena " + id, e);
  }
  if (animar && dir) {
    gsap.fromTo(sitio, { x: dir * 40, opacity: 0 }, { x: 0, opacity: 1, duration: 0.35, ease: "power3.out", clearProps: "transform,opacity" });
  }
}

/** Pinta el paso actual. `dir`: +1 hacia delante, -1 hacia atrás, 0 sin deslizamiento. */
function _tutPintar(foco, dir) {
  var cuerpo = document.getElementById("entTutCuerpo");
  if (!cuerpo) return;
  _tutPararEscena();
  cuerpo.innerHTML = entrenoTutorialHtml(_tutPaso);
  _tutMontarEscena(cuerpo, dir || 0);
  if (foco) {
    var el = cuerpo.querySelector(foco);
    if (el) { try { el.focus({ preventScroll: true }); } catch (e) { el.focus(); } }
  }
}

function _tutIrA(n, foco) {
  var destino = _tutAcotar(n);
  if (destino === _tutPaso) return;
  var dir = destino > _tutPaso ? 1 : -1;
  _tutPaso = destino;
  _tutPintar(foco, dir);
}

/** Abre el tutorial en un paso (0 si no se dice). */
function entrenoTutorialAbrir(paso) {
  var dialogo = _tutDialogo();
  if (!dialogo) return;
  _tutPaso = _tutAcotar(paso);
  // Primero se abre: la maqueta se mide para saber si cabe (ver .tg-compacto).
  if (typeof dialogo.showModal === "function") { if (!dialogo.open) dialogo.showModal(); }
  else dialogo.setAttribute("open", "");
  _tutPintar();
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
  _tutPararEscena();
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
  // Escape o cualquier otro cierre: se da por visto y la maqueta deja de sonar.
  dialogo.addEventListener("close", function () { _tutMarcarVisto(); _tutPararEscena(); });
  cuerpo.addEventListener("click", function (ev) {
    var boton = ev.target.closest("[data-tut], [data-tut-ir]");
    if (!boton) return;
    var ir = boton.getAttribute("data-tut-ir");
    if (ir !== null) { _tutIrA(Number(ir), "[data-tut-ir='" + _tutAcotar(ir) + "']"); return; }
    var accion = boton.getAttribute("data-tut");
    if (accion === "siguiente") _tutIrA(_tutPaso + 1, "[data-tut='siguiente'], [data-tut='fin']");
    else if (accion === "atras") _tutIrA(_tutPaso - 1, "[data-tut='atras'], [data-tut='siguiente']");
    else if (accion === "fin") _tutCerrar();
  });
  // Flechas del teclado y deslizar hacia los lados, como en el recorrido general.
  dialogo.addEventListener("keydown", function (ev) {
    if (ev.key === "ArrowRight") { ev.preventDefault(); _tutIrA(_tutPaso + 1); }
    else if (ev.key === "ArrowLeft") { ev.preventDefault(); _tutIrA(_tutPaso - 1); }
  });
  cuerpo.addEventListener("pointerdown", function (ev) {
    _tutTocado = (ev.target && ev.target.closest && ev.target.closest("button")) ? null : { x: ev.clientX, y: ev.clientY };
  });
  cuerpo.addEventListener("pointerup", function (ev) {
    var ini = _tutTocado;
    _tutTocado = null;
    if (!ini) return;
    var dx = ev.clientX - ini.x;
    var dy = ev.clientY - ini.y;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.4) _tutIrA(_tutPaso + (dx < 0 ? 1 : -1));
  });
  var ayuda = document.getElementById("entTutorial");
  if (ayuda) ayuda.addEventListener("click", function () { entrenoVibrar(); entrenoTutorialAbrir(0); });
}
