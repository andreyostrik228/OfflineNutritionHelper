/**
 * js/ui/entreno-catalogo.js
 * ─────────────────────────────────────────────────────────────────────────
 * CATÁLOGO DE EJERCICIOS (2026-10-18): búsqueda por nombre en cualquiera de
 * los cuatro idiomas, filtro por músculo y por el material que tiene el
 * usuario, y la ficha de cada uno (animación, músculos y técnica).
 *
 * La misma ventana sirve para dos cosas:
 *   modo "ver"     → «Catálogo de ejercicios»: tocar uno abre su ficha.
 *   modo "elegir"  → sustituir o añadir un ejercicio (en el programa o en la
 *                    sesión en curso): tocar uno lo elige; «?» abre la ficha,
 *                    con «Elegir» abajo. Con `parecidoA`, primero van los del
 *                    mismo movimiento y después los del mismo músculo.
 *
 * Expone (globales):
 *   initEntrenoCatalogo()                cablea la ventana (una vez)
 *   entrenoCatalogoAbrir(opciones)       { modo, titulo, parecidoA, excluir, casilla, nota, alElegir(id, casilla) }
 *   entrenoCatalogoLista(opciones, estado, material)  ejercicios a enseñar, en orden (sin DOM; lo prueban los tests)
 *   entrenoCatalogoHtml(opciones, estado, material)   marcado de la lista (sin DOM)
 *   entrenoCatalogoNormalizar(texto)     minúsculas y sin acentos, para buscar
 * ─────────────────────────────────────────────────────────────────────────
 */

var ENTRENO_CAT_MUSCULOS = ["pecho", "espalda", "hombros", "biceps", "triceps", "cuadriceps", "isquios", "gluteos", "gemelos", "core"];
var _CAT_NIVELES = ["principiante", "intermedio", "avanzado"];

var _cat = null;
var _catCableado = false;

function _catEsc(texto) { return escapeHtml(String(texto)); }
function _catLang() { return typeof getLang === "function" ? getLang() : "es"; }

function entrenoCatalogoNormalizar(texto) {
  return String(texto || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ё/g, "е").trim();
}

function _catMayuscula(texto) {
  var s = String(texto);
  return s.charAt(0).toLocaleUpperCase() + s.slice(1);
}

function _catPuede(e, material) {
  return (e.equipment || []).every(function (m) { return material.indexOf(m) !== -1; });
}

function _catTextoBusqueda(e) {
  var musculo = typeof tOr === "function" ? tOr("ent.grupo_" + e.muscle, e.muscle) : e.muscle;
  return entrenoCatalogoNormalizar([e.name, e.name_en, e.name_ru, e.name_uk, musculo].join(" "));
}

/**
 * Los ejercicios que enseña la lista, en orden.
 * @param {object} opciones  las de entrenoCatalogoAbrir
 * @param {{busqueda, musculo, soloMio}} estado
 * @param {string[]} material  lo que tiene el usuario (sin_material va siempre)
 * @returns {{ejercicio: object, parecido: number}[]}  parecido: 0 mismo movimiento, 1 mismo músculo, 2 otro
 */
function entrenoCatalogoLista(opciones, estado, material) {
  var catalogo = typeof EXERCISE_CATALOG !== "undefined" ? EXERCISE_CATALOG : [];
  var o = opciones || {};
  var est = estado || {};
  var excluir = o.excluir || [];
  var base = o.parecidoA ? catalogo.filter(function (e) { return e.id === o.parecidoA; })[0] : null;
  var terminos = entrenoCatalogoNormalizar(est.busqueda).split(/\s+/).filter(Boolean);
  var lista = catalogo.filter(function (e) {
    if (excluir.indexOf(e.id) !== -1) return false;
    if (est.musculo && e.muscle !== est.musculo) return false;
    if (est.soloMio && material && !_catPuede(e, material)) return false;
    if (terminos.length) {
      var texto = _catTextoBusqueda(e);
      if (!terminos.every(function (x) { return texto.indexOf(x) !== -1; })) return false;
    }
    return true;
  }).map(function (e) {
    var parecido = 2;
    if (base && e.pattern === base.pattern) parecido = 0;
    else if (base && e.muscle === base.muscle) parecido = 1;
    return { ejercicio: e, parecido: parecido };
  });
  var lang = _catLang();
  lista.sort(function (a, b) {
    if (a.parecido !== b.parecido) return a.parecido - b.parecido;
    if (!base) {
      var ma = ENTRENO_CAT_MUSCULOS.indexOf(a.ejercicio.muscle);
      var mb = ENTRENO_CAT_MUSCULOS.indexOf(b.ejercicio.muscle);
      if (ma !== mb) return ma - mb;
    }
    var na = _CAT_NIVELES.indexOf(a.ejercicio.level);
    var nb = _CAT_NIVELES.indexOf(b.ejercicio.level);
    if (na !== nb) return na - nb;
    return entrenoNombre(a.ejercicio).localeCompare(entrenoNombre(b.ejercicio), lang);
  });
  return lista;
}

/** «Pecho · Barra, banco · Intermedio» */
function _catMetaTexto(e) {
  var material = (e.equipment || []).filter(function (m) { return m !== "sin_material"; }).map(function (m) {
    return tOr("ent.material_" + m, m);
  });
  var partes = [_catMayuscula(tOr("ent.grupo_" + e.muscle, e.muscle))];
  partes.push(material.length ? material.join(", ") : t("ent.equipo_sin_material"));
  partes.push(tOr("ent.nivel_" + e.level, e.level));
  return partes.join(" · ");
}

function _catItemHtml(item, elegir) {
  var e = item.ejercicio;
  var nombre = entrenoNombre(e);
  var mini = (typeof entrenoAnimacionHtml === "function") ? entrenoAnimacionHtml(e.id, "mini", "") : "";
  var cuerpo = '<span class="cat__mini" aria-hidden="true">' + mini + "</span>" +
    '<span class="cat__textos"><span class="cat__nombre">' + _catEsc(nombre) + "</span>" +
    '<span class="cat__meta">' + _catEsc(_catMetaTexto(e)) + "</span></span>";
  if (!elegir) {
    return '<li class="cat__item"><button type="button" class="cat__boton" data-cat-ver="' + _catEsc(e.id) + '">' + cuerpo + "</button></li>";
  }
  return '<li class="cat__item">' +
    '<button type="button" class="cat__boton" data-cat-elegir="' + _catEsc(e.id) + '">' + cuerpo + "</button>" +
    '<button type="button" class="cat__info" data-cat-ver="' + _catEsc(e.id) + '" aria-label="' +
      _catEsc(tFormat("ent.cat_como_se_hace", { nombre: nombre })) + '">?</button>' +
  "</li>";
}

/** Marcado de la lista (búsqueda, filtros y ejercicios). Sin DOM. */
function entrenoCatalogoHtml(opciones, estado, material) {
  var o = opciones || {};
  var est = estado || {};
  var elegir = o.modo === "elegir";
  var lista = entrenoCatalogoLista(o, est, material);
  var h = "";
  if (o.nota) h += '<p class="cat__aviso">' + _catEsc(o.nota) + "</p>";
  h += '<div class="cat__buscar">' +
      '<label class="cat__etiqueta" for="catBuscar">' + _catEsc(t("ent.cat_buscar")) + "</label>" +
      '<input class="cat__campo" id="catBuscar" type="search" autocomplete="off" data-cat-buscar' +
        ' placeholder="' + _catEsc(t("ent.cat_buscar_placeholder")) + '" value="' + _catEsc(est.busqueda || "") + '">' +
    "</div>" +
    '<div class="cat__filtros" role="group" aria-label="' + _catEsc(t("ent.cat_filtro_musculo")) + '">' +
      ['<button type="button" class="cat__chip' + (est.musculo ? "" : " is-on") + '" data-cat-musculo="" aria-pressed="' + (est.musculo ? "false" : "true") + '">' +
        _catEsc(t("ent.cat_todos")) + "</button>"].concat(ENTRENO_CAT_MUSCULOS.map(function (m) {
        var on = est.musculo === m;
        return '<button type="button" class="cat__chip' + (on ? " is-on" : "") + '" data-cat-musculo="' + m + '" aria-pressed="' + (on ? "true" : "false") + '">' +
          _catEsc(_catMayuscula(tOr("ent.grupo_" + m, m))) + "</button>";
      })).join("") +
    "</div>" +
    '<label class="cat__mio"><input type="checkbox" data-cat-mio' + (est.soloMio ? " checked" : "") + "> " +
      _catEsc(t("ent.cat_solo_mio")) + "</label>";
  if (o.casilla) {
    h += '<label class="cat__mio cat__mio--fuerte"><input type="checkbox" data-cat-casilla' + (est.casilla ? " checked" : "") + "> " +
      _catEsc(o.casilla.texto) + "</label>";
  }
  h += '<p class="cat__cuenta" role="status">' + _catEsc(tFormat("ent.cat_n", { n: lista.length })) + "</p>";
  if (!lista.length) return h + '<p class="cat__vacio">' + _catEsc(t("ent.cat_vacio")) + "</p>";

  var bloques = [];
  if (o.parecidoA) {
    var parecidos = lista.filter(function (x) { return x.parecido !== 2; });
    var otros = lista.filter(function (x) { return x.parecido === 2; });
    if (parecidos.length) bloques.push([t("ent.cat_parecidos"), parecidos]);
    if (otros.length) bloques.push([t("ent.cat_otros"), otros]);
  } else if (!est.busqueda && !est.musculo) {
    ENTRENO_CAT_MUSCULOS.forEach(function (m) {
      var deEse = lista.filter(function (x) { return x.ejercicio.muscle === m; });
      if (deEse.length) bloques.push([_catMayuscula(tOr("ent.grupo_" + m, m)), deEse]);
    });
  } else {
    bloques.push(["", lista]);
  }
  bloques.forEach(function (b) {
    if (b[0]) h += '<h3 class="cat__grupo">' + _catEsc(b[0]) + ' <span class="cat__grupo-n">' + b[1].length + "</span></h3>";
    h += '<ul class="cat__lista">' + b[1].map(function (x) { return _catItemHtml(x, elegir); }).join("") + "</ul>";
  });
  return h;
}

function _catDetalleHtml(id, elegir) {
  var ficha = typeof entrenoFichaHtml === "function" ? entrenoFichaHtml(id) : "";
  return '<button type="button" class="btn-secondary cat__volver" data-cat-volver>' + _catEsc(t("ent.cat_volver")) + "</button>" +
    ficha +
    (elegir ? '<button type="button" class="entreno__empezar cat__elegir-grande" data-cat-elegir="' + _catEsc(id) + '">' + _catEsc(t("ent.cat_elegir")) + "</button>" : "");
}

function _catDialogo() { return document.getElementById("entrenoCatDialogo"); }
function _catCuerpo() { return document.getElementById("entrenoCatCuerpo"); }

function _catMaterial() {
  return typeof entrenoMaterialActual === "function" ? entrenoMaterialActual() : null;
}

function _catPintar(foco) {
  var cuerpo = _catCuerpo();
  if (!cuerpo || !_cat) return;
  if (_cat.detalle) {
    cuerpo.innerHTML = _catDetalleHtml(_cat.detalle, _cat.opciones.modo === "elegir");
    document.getElementById("entrenoCatTitulo").textContent = entrenoNombre(
      (EXERCISE_CATALOG || []).filter(function (e) { return e.id === _cat.detalle; })[0] || { name: "" });
  } else {
    cuerpo.innerHTML = entrenoCatalogoHtml(_cat.opciones, _cat.estado, _catMaterial());
    document.getElementById("entrenoCatTitulo").textContent = _cat.opciones.titulo || t("ent.cat_titulo");
  }
  if (typeof entrenoAnimacionesActivar === "function") entrenoAnimacionesActivar(cuerpo);
  if (foco) {
    var el = cuerpo.querySelector(foco);
    if (el) {
      try { el.focus({ preventScroll: true }); } catch (e) { el.focus(); }
    }
  }
}

/** Repinta solo la lista (al escribir en la búsqueda no se pierde el foco ni el cursor). */
function _catPintarLista() {
  var cuerpo = _catCuerpo();
  if (!cuerpo || !_cat || _cat.detalle) return;
  var campo = cuerpo.querySelector("[data-cat-buscar]");
  var inicio = campo ? campo.selectionStart : null;
  _catPintar("[data-cat-buscar]");
  campo = cuerpo.querySelector("[data-cat-buscar]");
  if (campo && inicio !== null) {
    try { campo.setSelectionRange(inicio, inicio); } catch (e) { /* tipo search sin selección */ }
  }
}

/** Abre la ventana. Ver la cabecera para las opciones. */
function entrenoCatalogoAbrir(opciones) {
  var dialogo = _catDialogo();
  if (!dialogo) return;
  var o = opciones || {};
  _cat = {
    opciones: o,
    estado: { busqueda: "", musculo: "", soloMio: true, casilla: !!(o.casilla && o.casilla.marcada) },
    detalle: null
  };
  _catPintar();
  if (typeof dialogo.showModal === "function") {
    if (!dialogo.open) dialogo.showModal();
  } else {
    dialogo.setAttribute("open", "");
  }
  var cuerpo = _catCuerpo();
  if (cuerpo) cuerpo.scrollTop = 0;
}

function _catCerrar() {
  var dialogo = _catDialogo();
  if (!dialogo) return;
  if (typeof dialogo.close === "function" && dialogo.open) dialogo.close();
  else dialogo.removeAttribute("open");
}

function _catElegir(id) {
  if (!_cat || typeof _cat.opciones.alElegir !== "function") return;
  var hacer = _cat.opciones.alElegir;
  var casilla = !!_cat.estado.casilla;
  _catCerrar();
  hacer(id, casilla);
}

function initEntrenoCatalogo() {
  var dialogo = _catDialogo();
  var cuerpo = _catCuerpo();
  if (!dialogo || !cuerpo || _catCableado) return;
  _catCableado = true;
  var cerrar = document.getElementById("entrenoCatCerrar");
  if (cerrar) cerrar.addEventListener("click", _catCerrar);
  dialogo.addEventListener("close", function () {
    cuerpo.innerHTML = "";
    _cat = null;
  });
  cuerpo.addEventListener("click", function (ev) {
    if (!_cat) return;
    var elegir = ev.target.closest("[data-cat-elegir]");
    if (elegir) { _catElegir(elegir.getAttribute("data-cat-elegir")); return; }
    var ver = ev.target.closest("[data-cat-ver]");
    if (ver) {
      _cat.volverA = ver.getAttribute("data-cat-ver");
      _cat.detalle = ver.getAttribute("data-cat-ver");
      _catPintar("[data-cat-volver]");
      cuerpo.scrollTop = 0;
      return;
    }
    if (ev.target.closest("[data-cat-volver]")) {
      var antes = _cat.volverA;
      _cat.detalle = null;
      _catPintar();
      var item = antes && cuerpo.querySelector('[data-cat-ver="' + antes + '"]');
      if (item) {
        try { item.focus({ preventScroll: false }); } catch (e) { item.focus(); }
        if (typeof item.scrollIntoView === "function") item.scrollIntoView({ block: "center" });
      }
      return;
    }
    var chip = ev.target.closest("[data-cat-musculo]");
    if (chip) {
      _cat.estado.musculo = chip.getAttribute("data-cat-musculo");
      _catPintar('[data-cat-musculo="' + _cat.estado.musculo + '"]');
    }
  });
  cuerpo.addEventListener("input", function (ev) {
    if (!_cat) return;
    if (ev.target.matches("[data-cat-buscar]")) {
      _cat.estado.busqueda = ev.target.value;
      _catPintarLista();
    }
  });
  cuerpo.addEventListener("change", function (ev) {
    if (!_cat) return;
    if (ev.target.matches("[data-cat-mio]")) {
      _cat.estado.soloMio = ev.target.checked;
      _catPintar("[data-cat-mio]");
    } else if (ev.target.matches("[data-cat-casilla]")) {
      _cat.estado.casilla = ev.target.checked;
    }
  });
}
