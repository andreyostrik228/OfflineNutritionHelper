/**
 * js/ui/entreno-programas.js
 * ─────────────────────────────────────────────────────────────────────────
 * «PLAN»: la semana como la quiera el usuario (2026-10-23). Lo que faltaba de
 * la propuesta de diseño del dueño, punto 4:
 *   - añadir una sesión, copiarla, renombrarla, quitarla y pasarla a otro día;
 *   - programas listos (WORKOUT_PROGRAMAS) con filtros por días, nivel y
 *     objetivo;
 *   - plantillas: guardar la semana de ahora con un nombre y volver a ella.
 *
 * Cómo se guarda: en las respuestas de entrenamiento (entrenoPrefsLimpiar,
 * render-entreno.js) va `estructura`, la lista de sesiones de la semana
 * ({ i, k, n, d }, ver normalizarEstructura en workout-generator.js). Mientras
 * no se toca nada no hay estructura y el plan sale solo según los días, como
 * siempre. Con la primera acción se «fija»: cada sesión recibe su id (p1, p2…)
 * y lo quitado o añadido a mano pasa a ir por ese id, para que dos copias de la
 * misma plantilla se cambien cada una por su lado. Los días a la semana de «Mis
 * datos» se ponen al número de sesiones (cuentan para las calorías).
 *
 * El generador sigue eligiendo los ejercicios con el material, el nivel y lo
 * cambiado a mano: aquí solo se decide QUÉ sesiones hay y cuándo.
 *
 * Expone (globales):
 *   entrenoEstructuraOperar(prefs, plan, op, datos)  la operación sobre las respuestas, sin DOM
 *                                                     (devuelve las respuestas nuevas, o null si no se puede)
 *   entrenoProgramasLista(filtro)          los programas listos que pasan el filtro, sin DOM
 *   entrenoProgramasHtml(prefs, plan, filtro, estado)  marcado de programas y plantillas, sin DOM
 *   entrenoProgramasAvisoHtml(prefs, dias)  aviso si «Mis datos» y la semana no cuadran ("" si cuadran)
 *   entrenoSesionHerramientasHtml(s)       día, renombrar, copiar y quitar de una sesión
 *   entrenoTituloSesionHtml(s)             el título, o el campo para renombrarla
 *   entrenoNuevaSesionHtml(plan)           «Añadir entrenamiento» y sus tipos
 *   entrenoProgramasPintar(prefs, plan)    pinta #entrenoProgramas
 *   entrenoProgramasAccion(boton)          los botones data-prog de este fichero (true si era suyo)
 *   initEntrenoProgramas()                 cablea el día y el campo del nombre (una vez)
 * ─────────────────────────────────────────────────────────────────────────
 */

/** Los tipos que ofrece «Añadir entrenamiento», en este orden. */
var ENTRENO_TIPOS_NUEVA = ["cuerpo_completo_A", "cuerpo_completo_B", "superior_A", "superior_B", "inferior_A", "inferior_B",
  "empuje_A", "tiron_A", "piernas_A", "libre"];
var ENTRENO_PROG_OBJETIVOS = ["masa", "fuerza", "forma"];
var ENTRENO_PROG_DIAS = [2, 3, 4, 5, 6];

var _progFiltro = { dias: 0, nivel: "", objetivo: "" };
var _progAbierto = false;
var _progRenombrando = null;
var _progNuevaAbierta = false;
var _progEstado = "";
var _progCableado = false;

function _progEsc(texto) { return escapeHtml(String(texto)); }
function _progMax() { return typeof WORKOUT_ESTRUCTURA_MAX === "number" ? WORKOUT_ESTRUCTURA_MAX : 7; }
function _progCopia(x) { return JSON.parse(JSON.stringify(x)); }

/** Un id libre para una sesión nueva: p1, p2… */
function _progNuevoId(estructura) {
  for (var n = 1; n < 100; n++) {
    var id = "p" + n;
    if (!estructura.some(function (x) { return x.i === id; })) return id;
  }
  return null;
}

/** El primer día sin sesión a partir del siguiente a `desde` (0 si están todos). */
function _progDiaLibre(estructura, desde) {
  for (var k = 1; k <= 7; k++) {
    var d = (((desde || 0) - 1 + k) % 7 + 7) % 7 + 1;
    if (!estructura.some(function (x) { return x.d === d; })) return d;
  }
  return 0;
}

/**
 * Fija la semana: la estructura que haya o, si no, la del plan de ahora, con
 * lo quitado y lo añadido a mano pasado de la clave de cada plantilla al id de
 * cada sesión. Cambia `prefs` y devuelve su estructura.
 */
function _progFijar(prefs, plan) {
  if (prefs.estructura) return prefs.estructura;
  var sesiones = (plan && plan.sesiones) || [];
  var lista = sesiones.map(function (s, j) {
    return { i: "p" + (j + 1), k: s.key, n: s.nombrePropio ? s.name : "", d: s.dia || 0 };
  });
  var extras = {};
  var quitados = [];
  lista.forEach(function (x) {
    if (prefs.extras[x.k]) extras[x.i] = prefs.extras[x.k].slice();
    prefs.quitados.forEach(function (q) {
      var partes = q.split(":");
      if (partes[0] === x.k && quitados.length < ENTRENO_MAX_CAMBIOS) quitados.push(x.i + ":" + partes[1]);
    });
  });
  prefs.extras = extras;
  prefs.quitados = quitados;
  prefs.estructura = lista;
  return lista;
}

/** La semana en orden de días (lunes primero); las que no tienen día, al final y como estaban. */
function _progOrdenar(estructura) {
  var conOrden = estructura.map(function (x, j) { return { x: x, j: j }; });
  conOrden.sort(function (a, b) { return ((a.x.d || 8) - (b.x.d || 8)) || (a.j - b.j); });
  conOrden.forEach(function (o, j) { estructura[j] = o.x; });
  return estructura;
}

/** Los días de la estructura, para las respuestas del cuestionario (null si alguno no está fijado o se repite). */
function _progDiasDe(estructura) {
  var dias = (estructura || []).map(function (x) { return x.d; });
  var unicos = dias.filter(function (d, i) { return d >= 1 && dias.indexOf(d) === i; });
  return unicos.length === dias.length && dias.length ? unicos.sort(function (a, b) { return a - b; }) : null;
}

/** Lo quitado y añadido a mano de una sesión, copiado a otra (o borrado si `a` es null). */
function _progMoverManual(prefs, de, a) {
  if (a && prefs.extras[de]) prefs.extras[a] = prefs.extras[de].slice();
  var nuevos = [];
  prefs.quitados.forEach(function (q) {
    var partes = q.split(":");
    if (partes[0] === de && a) nuevos.push(a + ":" + partes[1]);
  });
  if (!a) {
    delete prefs.extras[de];
    prefs.quitados = prefs.quitados.filter(function (q) { return q.split(":")[0] !== de; });
  }
  prefs.quitados = prefs.quitados.concat(nuevos).slice(0, ENTRENO_MAX_CAMBIOS);
}

/**
 * Una operación sobre la semana. Sin DOM: recibe las respuestas y el plan de
 * ahora y devuelve las respuestas nuevas (una copia), o null si no se puede.
 *   "copiar" {i, nombre}   "quitar" {i}   "renombrar" {i, nombre}   "dia" {i, d}
 *   "nueva" {k}            "programa" {id}   "rehacer" (vuelve a la semana automática)
 *   "plantilla_guardar" {nombre}   "plantilla_aplicar" {n}   "plantilla_borrar" {n}
 */
function entrenoEstructuraOperar(prefsEntrada, plan, op, datos) {
  var prefs = _progCopia(prefsEntrada);
  var d = datos || {};
  var max = _progMax();

  if (op === "rehacer") {
    prefs.estructura = null;
    prefs.programa = "";
    prefs.extras = {};
    prefs.quitados = [];
    return prefs;
  }
  if (op === "programa") {
    if (typeof estructuraDePrograma !== "function") return null;
    var nueva = estructuraDePrograma(d.id, prefs.diasSemana);
    if (!nueva) return null;
    prefs.estructura = nueva;
    prefs.programa = d.id;
    // Lo quitado y añadido iba por sesión, y las sesiones son otras. Los
    // ejercicios cambiados por otros se quedan: son gusto del usuario.
    prefs.extras = {};
    prefs.quitados = [];
    prefs.diasSemana = _progDiasDe(nueva);
    return prefs;
  }
  if (op === "plantilla_borrar") {
    if (!prefs.plantillas[d.n]) return null;
    prefs.plantillas.splice(d.n, 1);
    return prefs;
  }
  if (op === "plantilla_aplicar") {
    var p = prefs.plantillas[d.n];
    if (!p) return null;
    prefs.estructura = _progCopia(p.estructura);
    prefs.programa = p.programa || "";
    prefs.cambios = _progCopia(p.cambios || {});
    prefs.quitados = (p.quitados || []).slice();
    prefs.extras = _progCopia(p.extras || {});
    prefs.diasSemana = _progDiasDe(prefs.estructura);
    return prefs;
  }

  var estructura = _progFijar(prefs, plan);
  if (!estructura.length) return null;

  if (op === "plantilla_guardar") {
    var nombre = entrenoNombreLimpio(d.nombre);
    if (!nombre) return null;
    var guardada = {
      nombre: nombre, estructura: _progCopia(estructura), programa: prefs.programa || "",
      cambios: _progCopia(prefs.cambios), quitados: prefs.quitados.slice(), extras: _progCopia(prefs.extras)
    };
    var igual = -1;
    prefs.plantillas.forEach(function (x, j) { if (x.nombre.toLowerCase() === nombre.toLowerCase()) igual = j; });
    if (igual !== -1) prefs.plantillas[igual] = guardada;
    else if (prefs.plantillas.length < ENTRENO_MAX_PLANTILLAS) prefs.plantillas.push(guardada);
    else return null;
    return prefs;
  }

  if (op === "nueva") {
    if (estructura.length >= max || typeof WORKOUT_SESIONES === "undefined" ||
        !Object.prototype.hasOwnProperty.call(WORKOUT_SESIONES, d.k)) return null;
    var ultimo = estructura[estructura.length - 1];
    estructura.push({ i: _progNuevoId(estructura), k: d.k, n: "", d: _progDiaLibre(estructura, ultimo ? ultimo.d : 0) });
    _progOrdenar(estructura);
    prefs.diasSemana = _progDiasDe(estructura);
    return prefs;
  }

  var pos = -1;
  estructura.forEach(function (x, j) { if (x.i === d.i) pos = j; });
  if (pos === -1) return null;
  var sesion = estructura[pos];

  if (op === "renombrar") {
    sesion.n = entrenoNombreLimpio(d.nombre);
    return prefs;
  }
  if (op === "copiar") {
    if (estructura.length >= max) return null;
    var id = _progNuevoId(estructura);
    estructura.splice(pos + 1, 0, { i: id, k: sesion.k, n: entrenoNombreLimpio(d.nombre), d: _progDiaLibre(estructura, sesion.d) });
    _progMoverManual(prefs, sesion.i, id);
    _progOrdenar(estructura);
    prefs.diasSemana = _progDiasDe(estructura);
    return prefs;
  }
  if (op === "quitar") {
    if (estructura.length <= 1) return null;
    estructura.splice(pos, 1);
    _progMoverManual(prefs, sesion.i, null);
    prefs.diasSemana = _progDiasDe(estructura);
    return prefs;
  }
  if (op === "dia") {
    var dia = Math.floor(Number(d.d));
    if (!(dia >= 1 && dia <= 7)) return null;
    // Si ese día ya tenía sesión, se cambian el sitio: dos el mismo día no caben en «Hoy».
    estructura.forEach(function (x) { if (x !== sesion && x.d === dia) x.d = sesion.d; });
    sesion.d = dia;
    _progOrdenar(estructura);
    prefs.diasSemana = _progDiasDe(estructura);
    return prefs;
  }
  return null;
}

// ── Programas listos ─────────────────────────────────────────────────────

/** Los programas que pasan el filtro { dias, nivel, objetivo } (vacío o 0 = cualquiera). */
function entrenoProgramasLista(filtro) {
  var f = filtro || {};
  var lista = typeof WORKOUT_PROGRAMAS !== "undefined" ? WORKOUT_PROGRAMAS : [];
  return lista.filter(function (p) {
    if (f.dias && p.sesiones.length !== Number(f.dias)) return false;
    if (f.nivel && p.niveles.indexOf(f.nivel) === -1) return false;
    if (f.objetivo && p.objetivos.indexOf(f.objetivo) === -1) return false;
    return true;
  });
}

function _progChip(campo, valor, texto, actual) {
  var on = String(actual || "") === String(valor || "");
  return '<button type="button" class="cat__chip' + (on ? " is-on" : "") + '" data-prog="filtro" data-campo="' + campo +
    '" data-valor="' + _progEsc(valor) + '" aria-pressed="' + (on ? "true" : "false") + '">' + _progEsc(texto) + "</button>";
}

function _progFiltrosHtml(f) {
  var dias = [_progChip("dias", 0, t("ent.prog_todos"), f.dias || 0)].concat(ENTRENO_PROG_DIAS.map(function (n) {
    return _progChip("dias", n, tFormat("ent.dias_n", { n: n }), f.dias || 0);
  }));
  var niveles = [_progChip("nivel", "", t("ent.prog_todos"), f.nivel)].concat(ENTRENO_NIVELES.map(function (n) {
    return _progChip("nivel", n, t("ent.nivel_" + n), f.nivel);
  }));
  var objetivos = [_progChip("objetivo", "", t("ent.prog_todos"), f.objetivo)].concat(ENTRENO_PROG_OBJETIVOS.map(function (o) {
    return _progChip("objetivo", o, t("ent.prog_obj_" + o), f.objetivo);
  }));
  function grupo(clave, botones) {
    return '<div class="entreno__prog-filtro"><span class="entreno__etiqueta">' + _progEsc(t(clave)) + "</span>" +
      '<div class="cat__filtros" role="group" aria-label="' + _progEsc(t(clave)) + '">' + botones.join("") + "</div></div>";
  }
  return grupo("ent.prog_filtro_dias", dias) + grupo("ent.prog_filtro_nivel", niveles) + grupo("ent.prog_filtro_objetivo", objetivos);
}

function _progProgramaHtml(p, actual) {
  var nombre = t("ent.programa_" + p.id);
  var es = actual === p.id;
  var sesiones = p.sesiones.map(function (k) { return "<li>" + _progEsc(tOr("ent.sesion_" + k, k)) + "</li>"; }).join("");
  return '<li class="entreno__programa' + (es ? " is-actual" : "") + '">' +
    '<h4 class="entreno__programa-nombre">' + _progEsc(nombre) + "</h4>" +
    '<p class="entreno__programa-texto">' + _progEsc(t("ent.programa_desc_" + p.id)) + "</p>" +
    '<p class="entreno__programa-meta">' + _progEsc(tFormat("ent.dias_n", { n: p.sesiones.length }) + " · " +
      p.niveles.map(function (n) { return t("ent.nivel_" + n); }).join(", ")) + "</p>" +
    '<ul class="entreno__programa-sesiones">' + sesiones + "</ul>" +
    (es
      ? '<span class="entreno__badge entreno__badge--tuyo">' + _progEsc(t("ent.prog_actual")) + "</span>"
      : '<button type="button" class="btn-secondary" data-prog="programa_elegir" data-programa="' + _progEsc(p.id) + '"' +
          ' aria-label="' + _progEsc(tFormat("ent.prog_elegir_aria", { nombre: nombre })) + '">' + _progEsc(t("ent.prog_elegir")) + "</button>") +
  "</li>";
}

function _progPlantillasHtml(prefs, estado) {
  var lista = prefs.plantillas.length
    ? '<ul class="entreno__plantillas">' + prefs.plantillas.map(function (p, j) {
        return '<li class="entreno__plantilla">' +
          '<span class="entreno__plantilla-nombre">' + _progEsc(p.nombre) + "</span>" +
          '<span class="entreno__plantilla-meta">' + _progEsc(tFormat("ent.ej_sesiones", { n: p.estructura.length })) + "</span>" +
          '<button type="button" class="entreno__mini-btn" data-prog="plantilla_aplicar" data-n="' + j + '">' + _progEsc(t("ent.prog_plantilla_aplicar")) + "</button>" +
          '<button type="button" class="entreno__mini-btn entreno__mini-btn--quitar" data-prog="plantilla_borrar" data-n="' + j + '">' + _progEsc(t("ent.prog_plantilla_borrar")) + "</button>" +
        "</li>";
      }).join("") + "</ul>"
    : '<p class="entreno__progreso-nota">' + _progEsc(t("ent.prog_plantillas_vacio")) + "</p>";
  return '<h4 class="entreno__progreso-sub">' + _progEsc(t("ent.prog_plantillas")) + "</h4>" + lista +
    '<div class="entreno__plantilla-nueva">' +
      '<label class="entreno__etiqueta" for="entPlantillaNombre">' + _progEsc(t("ent.prog_plantilla_guardar_etiqueta")) + "</label>" +
      '<div class="entreno__plantilla-fila">' +
        '<input class="cat__campo" id="entPlantillaNombre" type="text" maxlength="30" autocomplete="off" data-prog-plantilla-nombre' +
          ' placeholder="' + _progEsc(t("ent.prog_plantilla_placeholder")) + '">' +
        '<button type="button" class="btn-secondary" data-prog="plantilla_guardar">' + _progEsc(t("ent.prog_guardar")) + "</button>" +
      "</div>" +
      '<p class="entreno__prog-estado" role="status">' + _progEsc(estado || "") + "</p>" +
    "</div>";
}

/** Programas listos con sus filtros y las plantillas, en un desplegable. Sin DOM. */
function entrenoProgramasHtml(prefs, plan, filtro, estado) {
  var f = filtro || {};
  var lista = entrenoProgramasLista(f);
  var actual = plan && plan.programa ? plan.programa : "";
  return '<details class="entreno__programas-det"' + (_progAbierto ? " open" : "") + ">" +
    '<summary class="entreno__programas-sum">' + _progEsc(t("ent.programas_titulo")) + "</summary>" +
    _progFiltrosHtml(f) +
    '<p class="cat__cuenta" role="status">' + _progEsc(tFormat("ent.prog_n", { n: lista.length })) + "</p>" +
    (lista.length
      ? '<ul class="entreno__programas-lista">' + lista.map(function (p) { return _progProgramaHtml(p, actual); }).join("") + "</ul>"
      : '<p class="cat__vacio">' + _progEsc(t("ent.prog_ninguno")) + "</p>") +
    _progPlantillasHtml(prefs, estado) +
  "</details>";
}

/**
 * Si la semana montada a mano no tiene tantas sesiones como entrenamientos dice
 * «Mis datos» (los cambiaron allí): lo dice y deja elegir. Nada se cambia solo.
 */
function entrenoProgramasAvisoHtml(prefs, dias) {
  if (!prefs || !prefs.estructura) return "";
  var n = prefs.estructura.length;
  var datos = dias >= 1 ? dias : 0;
  if (datos === n) return "";
  return '<div class="entreno__aviso entreno__aviso--suave entreno__aviso-dias">' +
    "<p>" + _progEsc(tFormat("ent.prog_dias_distintos", { datos: datos, n: n })) + "</p>" +
    '<div class="entreno__aviso-botones">' +
      '<button type="button" class="btn-secondary" data-prog="dias_mantener">' + _progEsc(tFormat("ent.prog_dias_mantener", { n: n })) + "</button>" +
      (datos >= 1 ? '<button type="button" class="btn-secondary" data-prog="dias_rehacer">' + _progEsc(tFormat("ent.prog_dias_rehacer", { datos: datos })) + "</button>" : "") +
    "</div></div>";
}

// ── Cada sesión: día, nombre, copiar y quitar ────────────────────────────

/** El título de una sesión del plan; mientras se renombra, el campo con «Guardar» y «Cancelar». */
function entrenoTituloSesionHtml(s) {
  var id = s.instancia || s.key;
  var nombre = entrenoNombreSesion(s);
  if (_progRenombrando !== id) return '<h4 class="entreno__sesion-titulo">' + _progEsc(nombre) + "</h4>";
  return '<div class="entreno__renombrar">' +
    '<input class="cat__campo entreno__renombrar-campo" type="text" maxlength="30" autocomplete="off" data-prog-nombre="' + _progEsc(id) + '"' +
      ' value="' + _progEsc(nombre) + '" aria-label="' + _progEsc(t("ent.prog_nombre_campo")) + '">' +
    '<button type="button" class="entreno__mini-btn" data-prog="renombrar_ok" data-sesion="' + _progEsc(id) + '">' + _progEsc(t("ent.prog_guardar")) + "</button>" +
    '<button type="button" class="entreno__mini-btn" data-prog="renombrar_no">' + _progEsc(t("ent.prog_cancelar")) + "</button>" +
  "</div>";
}

/** El día (desplegable) y los botones de renombrar, copiar y quitar una sesión. */
function entrenoSesionHerramientasHtml(s) {
  var id = s.instancia || s.key;
  var nombre = entrenoNombreSesion(s);
  var plan = typeof entrenoPlanActual === "function" ? entrenoPlanActual() : null;
  var n = plan && plan.sesiones ? plan.sesiones.length : 1;
  var opciones = [1, 2, 3, 4, 5, 6, 7].map(function (d) {
    return '<option value="' + d + '"' + (d === s.dia ? " selected" : "") + ">" + _progEsc(t("ent.dia_" + d)) + "</option>";
  }).join("");
  return '<div class="entreno__sesion-herr">' +
    '<label class="entreno__sesion-dia-campo"><span>' + _progEsc(t("ent.prog_dia")) + "</span>" +
      '<select data-prog-dia="' + _progEsc(id) + '" aria-label="' + _progEsc(tFormat("ent.prog_dia_de", { nombre: nombre })) + '">' + opciones + "</select></label>" +
    '<button type="button" class="entreno__mini-btn" data-prog="renombrar" data-sesion="' + _progEsc(id) + '"' +
      ' aria-label="' + _progEsc(tFormat("ent.prog_renombrar_de", { nombre: nombre })) + '">' + _progEsc(t("ent.prog_renombrar")) + "</button>" +
    '<button type="button" class="entreno__mini-btn" data-prog="copiar" data-sesion="' + _progEsc(id) + '"' + (n >= _progMax() ? " disabled" : "") +
      ' aria-label="' + _progEsc(tFormat("ent.prog_copiar_de", { nombre: nombre })) + '">' + _progEsc(t("ent.prog_copiar")) + "</button>" +
    '<button type="button" class="entreno__mini-btn entreno__mini-btn--quitar" data-prog="quitar_sesion" data-sesion="' + _progEsc(id) + '"' + (n <= 1 ? " disabled" : "") +
      ' aria-label="' + _progEsc(tFormat("ent.prog_quitar_sesion_de", { nombre: nombre })) + '">' + _progEsc(t("ent.prog_quitar_sesion")) + "</button>" +
  "</div>";
}

/** «Añadir entrenamiento»: el botón y, abierto, los tipos para elegir. */
function entrenoNuevaSesionHtml(plan) {
  var lleno = plan && plan.sesiones && plan.sesiones.length >= _progMax();
  var h = '<div class="entreno__nueva">' +
    '<button type="button" class="btn-secondary entreno__nueva-btn" data-prog="nueva" aria-expanded="' + (_progNuevaAbierta && !lleno ? "true" : "false") + '"' +
      (lleno ? " disabled" : "") + ">" + _progEsc(t("ent.prog_nueva")) + "</button>";
  if (lleno) return h + '<p class="entreno__progreso-nota">' + _progEsc(t("ent.prog_nueva_max")) + "</p></div>";
  if (!_progNuevaAbierta) return h + "</div>";
  return h + '<p class="entreno__progreso-nota">' + _progEsc(t("ent.prog_nueva_cual")) + "</p>" +
    '<ul class="entreno__nueva-tipos">' + ENTRENO_TIPOS_NUEVA.map(function (k) {
      return '<li><button type="button" class="cat__chip" data-prog="nueva_tipo" data-tipo="' + k + '">' + _progEsc(tOr("ent.sesion_" + k, k)) + "</button></li>";
    }).join("") + "</ul></div>";
}

function entrenoProgramasPintar(prefs, plan) {
  var caja = document.getElementById("entrenoProgramas");
  if (!caja) return;
  var conPlan = !!(plan && plan.ok);
  caja.hidden = !conPlan;
  caja.innerHTML = conPlan ? entrenoProgramasHtml(prefs, plan, _progFiltro, _progEstado) : "";
}

// ── Acciones ─────────────────────────────────────────────────────────────

/** Guarda las respuestas nuevas, pone los días de «Mis datos» al número de sesiones y repinta. */
function _progAplicar(prefs) {
  if (!prefs) return false;
  entrenoGuardarPrefs(prefs);
  if (prefs.estructura && typeof entrenoGuardarDias === "function") entrenoGuardarDias(prefs.estructura.length);
  if (typeof renderEntreno === "function") renderEntreno();
  return true;
}

function _progOperar(op, datos) {
  var plan = typeof entrenoPlanActual === "function" ? entrenoPlanActual() : null;
  return _progAplicar(entrenoEstructuraOperar(entrenoLeerPrefs(), plan, op, datos));
}

function _progEnfocar(selector) {
  var el = document.querySelector(selector);
  if (!el) return;
  try { el.focus({ preventScroll: true }); } catch (e) { el.focus(); }
  if (typeof el.select === "function") el.select();
}

var ENTRENO_PROG_ACCIONES = ["renombrar", "renombrar_ok", "renombrar_no", "copiar", "quitar_sesion", "nueva", "nueva_tipo",
  "filtro", "programa_elegir", "plantilla_guardar", "plantilla_aplicar", "plantilla_borrar", "dias_mantener", "dias_rehacer"];

/** Los botones data-prog de este fichero. true si la acción era suya (y ya está hecha). */
function entrenoProgramasAccion(boton) {
  var accion = boton.getAttribute("data-prog");
  if (ENTRENO_PROG_ACCIONES.indexOf(accion) === -1) return false;
  if (typeof entrenoVibrar === "function") entrenoVibrar();
  var id = boton.getAttribute("data-sesion");
  var prefs = entrenoLeerPrefs();
  var s = id && typeof entrenoSesionDelPlan === "function" ? entrenoSesionDelPlan(id) : null;
  var nombre = s ? entrenoNombreSesion(s) : "";
  switch (accion) {
    case "renombrar":
      _progRenombrando = id;
      renderEntreno();
      _progEnfocar('[data-prog-nombre="' + id + '"]');
      return true;
    case "renombrar_ok": {
      var campo = document.querySelector('[data-prog-nombre="' + id + '"]');
      _progRenombrando = null;
      // Escribir el nombre de siempre (o nada) vuelve al de la plantilla.
      var nuevo = campo ? String(campo.value) : "";
      if (s && !s.nombrePropio && nuevo.trim() === nombre) nuevo = "";
      if (!_progOperar("renombrar", { i: id, nombre: nuevo })) renderEntreno();
      return true;
    }
    case "renombrar_no":
      _progRenombrando = null;
      renderEntreno();
      return true;
    case "copiar":
      _progOperar("copiar", { i: id, nombre: tFormat("ent.prog_copia_nombre", { nombre: nombre }) });
      return true;
    case "quitar_sesion":
      if (!window.confirm(tFormat("ent.prog_quitar_sesion_confirmar", { nombre: nombre }))) return true;
      _progOperar("quitar", { i: id });
      return true;
    case "nueva":
      _progNuevaAbierta = !_progNuevaAbierta;
      renderEntreno();
      if (_progNuevaAbierta) _progEnfocar(".entreno__nueva-tipos [data-prog]");
      return true;
    case "nueva_tipo":
      _progNuevaAbierta = false;
      _progOperar("nueva", { k: boton.getAttribute("data-tipo") });
      return true;
    case "filtro": {
      var campoF = boton.getAttribute("data-campo");
      var valor = boton.getAttribute("data-valor");
      _progFiltro[campoF] = campoF === "dias" ? Number(valor) || 0 : valor;
      entrenoProgramasPintar(prefs, entrenoPlanActual());
      _progEnfocar('#entrenoProgramas [data-campo="' + campoF + '"][data-valor="' + valor + '"]');
      return true;
    }
    case "programa_elegir": {
      var pid = boton.getAttribute("data-programa");
      var hayAlgo = prefs.estructura || entrenoCambiosManuales(prefs);
      if (hayAlgo && !window.confirm(tFormat("ent.prog_elegir_confirmar", { nombre: t("ent.programa_" + pid) }))) return true;
      _progEstado = "";
      _progOperar("programa", { id: pid });
      return true;
    }
    case "plantilla_guardar": {
      var nombreCampo = document.querySelector("[data-prog-plantilla-nombre]");
      var nombreP = entrenoNombreLimpio(nombreCampo ? nombreCampo.value : "");
      if (!nombreP) {
        _progEstado = t("ent.prog_plantilla_sin_nombre");
        entrenoProgramasPintar(prefs, entrenoPlanActual());
        _progEnfocar("[data-prog-plantilla-nombre]");
        return true;
      }
      var hecha = entrenoEstructuraOperar(prefs, entrenoPlanActual(), "plantilla_guardar", { nombre: nombreP });
      _progEstado = hecha ? tFormat("ent.prog_plantilla_guardada", { nombre: nombreP })
        : tFormat("ent.prog_plantilla_llena", { n: ENTRENO_MAX_PLANTILLAS });
      if (hecha) _progAplicar(hecha);
      else entrenoProgramasPintar(prefs, entrenoPlanActual());
      return true;
    }
    case "plantilla_aplicar": {
      var n = Number(boton.getAttribute("data-n"));
      var p = prefs.plantillas[n];
      if (!p || !window.confirm(tFormat("ent.prog_plantilla_aplicar_confirmar", { nombre: p.nombre }))) return true;
      _progEstado = "";
      _progOperar("plantilla_aplicar", { n: n });
      return true;
    }
    case "plantilla_borrar": {
      var nb = Number(boton.getAttribute("data-n"));
      var pb = prefs.plantillas[nb];
      if (!pb || !window.confirm(tFormat("ent.prog_plantilla_borrar_confirmar", { nombre: pb.nombre }))) return true;
      _progEstado = "";
      _progOperar("plantilla_borrar", { n: nb });
      return true;
    }
    case "dias_mantener":
      if (prefs.estructura && typeof entrenoGuardarDias === "function") entrenoGuardarDias(prefs.estructura.length);
      renderEntreno();
      return true;
    case "dias_rehacer":
      _progOperar("rehacer");
      return true;
  }
  return false;
}

function initEntrenoProgramas() {
  var panel = document.getElementById("entrenoPanel");
  if (!panel || _progCableado) return;
  _progCableado = true;
  // El día de una sesión: un desplegable, así que va por «change».
  panel.addEventListener("change", function (ev) {
    var sel = ev.target.closest ? ev.target.closest("[data-prog-dia]") : null;
    if (!sel) return;
    if (typeof entrenoVibrar === "function") entrenoVibrar();
    _progOperar("dia", { i: sel.getAttribute("data-prog-dia"), d: Number(sel.value) });
  });
  // Intro guarda el nombre y Escape lo deja como estaba.
  panel.addEventListener("keydown", function (ev) {
    var campo = ev.target.closest ? ev.target.closest("[data-prog-nombre], [data-prog-plantilla-nombre]") : null;
    if (!campo) return;
    if (ev.key === "Enter") {
      ev.preventDefault();
      var boton = campo.hasAttribute("data-prog-nombre")
        ? panel.querySelector('[data-prog="renombrar_ok"][data-sesion="' + campo.getAttribute("data-prog-nombre") + '"]')
        : panel.querySelector('[data-prog="plantilla_guardar"]');
      if (boton) entrenoProgramasAccion(boton);
    } else if (ev.key === "Escape" && campo.hasAttribute("data-prog-nombre")) {
      _progRenombrando = null;
      renderEntreno();
    }
  });
  // Abierto o cerrado, el desplegable de programas sigue igual al repintar.
  panel.addEventListener("toggle", function (ev) {
    if (ev.target && ev.target.classList && ev.target.classList.contains("entreno__programas-det")) _progAbierto = ev.target.open;
  }, true);
}
