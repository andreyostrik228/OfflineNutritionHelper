/**
 * js/core/perfiles.js
 * ─────────────────────────────────────────────────────────────────────────
 * Las personas de la casa (2026-10-26). Pedido del dueño: «один аккаунт, но
 * разные люди, как на Netflix, чтобы можно было делать меню и ребёнку, и
 * бабушке, и отцу, и маме». Cada persona tiene SUS datos: «Mis datos», el
 * plan guardado, el peso, las medidas y los entrenamientos. La despensa, el
 * historial de compras, el aspecto y el idioma son de la casa.
 *
 * Cómo: cada módulo guarda lo suyo bajo una clave de localStorage, y esa
 * clave pasa por perfilClave(). El titular (la persona de siempre) usa las
 * claves de siempre, así que nada de lo que ya había se mueve; cualquier otra
 * persona usa la misma clave con «@id» detrás. Las claves se calculan al
 * cargar la página: cambiar de persona es guardar quién está y recargar,
 * como en Netflix.
 *
 * Este fichero va ANTES que cualquier módulo de PERFIL_CLAVES_PROPIAS
 * (index.html). Sin él, perfilClave no existe y cada módulo usa su clave de
 * siempre: todo funciona como antes, con una sola persona.
 *
 * Expone (globales):
 *   PERFIL_TITULAR, PERFILES_MAX, PERFIL_CLAVES_PROPIAS
 *   perfilesLeer() → { activo, lista: [{id, nombre, color}], t }
 *   perfilActivoId() → id
 *   perfilClave(base, id?) → la clave de esa persona
 *   perfilCrear(nombre) → la persona nueva, o null si no cabe o el nombre no vale
 *   perfilRenombrar(id, nombre), perfilBorrar(id), perfilElegir(id) → boolean
 *   perfilLeerDatos(id, base) → lo guardado (JSON) de esa persona, o null
 *   perfilNombre(perfil) → su nombre, o «Yo» en el idioma de la pantalla
 *   perfilesParaNube() → las demás personas para la cuenta (`settings._personas`)
 *   perfilesDesdeNube(bloque) → trae las que aquí faltan; nunca pisa lo que hay
 *   perfilesBorrarTodo() → al cerrar sesión: fuera todas las personas y lo suyo
 *
 * En la cuenta: el titular va como siempre (los ajustes, `_pesos`,
 * `_entrenos`…); las demás personas, dentro de `settings._personas`, con sus
 * datos tal cual (texto JSON). Al traerlas se rellena lo que falta y no se
 * pisa nada: dos dispositivos que cambian a la vez la misma persona (que no
 * sea el titular) no se juntan, se queda lo de cada uno. Ver cloud-sync.js y
 * migration.js.
 * ─────────────────────────────────────────────────────────────────────────
 */

var PERFILES_CLAVE = "nutritionPlanner.perfiles.v1";
var PERFIL_TITULAR = "titular";
var PERFILES_MAX = 8;
var PERFIL_NOMBRE_MAX = 24;
var PERFILES_COLORES = ["#2B8A3E", "#E8590C", "#1971C2", "#C2255C", "#7048E8", "#E67700", "#0C8599", "#5C940D"];

// Lo que es de cada persona. Todo lo demás (despensa, historial de compras,
// aspecto, idioma…) es de la casa.
var PERFIL_CLAVES_PROPIAS = [
  "nutritionPlanner.settings.v1",
  "weekplate-pesos-v1",
  "weekplate-medidas-v1",
  "weekplate-entreno-v1",
  "nutritionPlanner.entrenoDiario.v1",
  "nutritionPlanner.entrenoPerdidas.v1",
  "nutritionPlanner.entrenoProgreso.v1",
  "nutritionPlanner.entrenoPreguntas.v1",
  "weekplate-plan-v1",
  "weekplate-plan-sincocinar-v1",
  "nutritionPlanner.shoppingChecks.v1",
  "nutritionPlanner.shoppingChecksNoCook.v1"
];

// Lo de cada persona que viaja a la cuenta (el plan y las marcas de la compra
// se quedan en el dispositivo, como los del titular).
var PERFIL_CLAVES_NUBE = [
  "nutritionPlanner.settings.v1",
  "weekplate-pesos-v1",
  "weekplate-medidas-v1",
  "weekplate-entreno-v1",
  "nutritionPlanner.entrenoDiario.v1"
];
var PERFILES_FAMILIA_CLAVE = "nutritionPlanner.familia.v1";

function _perfilesAlmacen() {
  try { return typeof localStorage !== "undefined" ? localStorage : null; } catch (e) { return null; }
}

function _perfilesPorDefecto() {
  return { activo: PERFIL_TITULAR, lista: [{ id: PERFIL_TITULAR, nombre: "", color: PERFILES_COLORES[0] }], t: 0 };
}

function _perfilNombreLimpio(nombre) {
  var n = String(nombre == null ? "" : nombre).replace(/\s+/g, " ").trim();
  return n.slice(0, PERFIL_NOMBRE_MAX);
}

/** Lo guardado, saneado: el titular siempre está y siempre es el primero. */
function perfilesLeer() {
  var base = _perfilesPorDefecto();
  var almacen = _perfilesAlmacen();
  var guardado = null;
  try { guardado = almacen ? JSON.parse(almacen.getItem(PERFILES_CLAVE) || "null") : null; } catch (e) { guardado = null; }
  if (!guardado || typeof guardado !== "object" || !Array.isArray(guardado.lista)) return base;
  var vistos = {};
  var lista = [];
  guardado.lista.forEach(function (p) {
    if (!p || typeof p.id !== "string" || !/^[a-z0-9]{1,24}$/.test(p.id) || vistos[p.id]) return;
    vistos[p.id] = true;
    lista.push({
      id: p.id,
      nombre: _perfilNombreLimpio(p.nombre),
      color: (typeof p.color === "string" && /^#[0-9A-Fa-f]{6}$/.test(p.color)) ? p.color : PERFILES_COLORES[lista.length % PERFILES_COLORES.length]
    });
  });
  var titular = lista.filter(function (p) { return p.id === PERFIL_TITULAR; })[0] || base.lista[0];
  lista = [titular].concat(lista.filter(function (p) { return p.id !== PERFIL_TITULAR; })).slice(0, PERFILES_MAX);
  var activo = lista.some(function (p) { return p.id === guardado.activo; }) ? guardado.activo : PERFIL_TITULAR;
  return { activo: activo, lista: lista, t: typeof guardado.t === "number" ? guardado.t : 0 };
}

function _perfilesGuardar(estado) {
  var almacen = _perfilesAlmacen();
  if (!almacen) return false;
  try {
    almacen.setItem(PERFILES_CLAVE, JSON.stringify({ activo: estado.activo, lista: estado.lista, t: Date.now() }));
    return true;
  } catch (e) { return false; }
}

function perfilActivoId() { return perfilesLeer().activo; }

/**
 * La clave de localStorage de una persona: la de siempre para el titular,
 * «base@id» para las demás.
 * @param {string} base
 * @param {string} [id] - por defecto, la persona activa
 */
function perfilClave(base, id) {
  var quien = id || perfilActivoId();
  return quien === PERFIL_TITULAR ? base : base + "@" + quien;
}

/** @returns {{id,nombre,color}|null} */
function perfilCrear(nombre) {
  var limpio = _perfilNombreLimpio(nombre);
  if (!limpio) return null;
  var estado = perfilesLeer();
  if (estado.lista.length >= PERFILES_MAX) return null;
  var id;
  do { id = "p" + Date.now().toString(36) + Math.floor(Math.random() * 1296).toString(36); }
  while (estado.lista.some(function (p) { return p.id === id; }));
  var usados = estado.lista.map(function (p) { return p.color; });
  var color = PERFILES_COLORES.filter(function (c) { return usados.indexOf(c) === -1; })[0] || PERFILES_COLORES[estado.lista.length % PERFILES_COLORES.length];
  var perfil = { id: id, nombre: limpio, color: color };
  estado.lista.push(perfil);
  return _perfilesGuardar(estado) ? perfil : null;
}

function perfilRenombrar(id, nombre) {
  var limpio = _perfilNombreLimpio(nombre);
  var estado = perfilesLeer();
  var p = estado.lista.filter(function (x) { return x.id === id; })[0];
  // El titular puede quedarse sin nombre («Yo»); los demás no.
  if (!p || (!limpio && id !== PERFIL_TITULAR)) return false;
  p.nombre = limpio;
  return _perfilesGuardar(estado);
}

/** Borra una persona y TODO lo suyo. El titular no se borra. */
function perfilBorrar(id) {
  if (!id || id === PERFIL_TITULAR) return false;
  var estado = perfilesLeer();
  if (!estado.lista.some(function (p) { return p.id === id; })) return false;
  var almacen = _perfilesAlmacen();
  if (almacen) {
    PERFIL_CLAVES_PROPIAS.forEach(function (base) {
      try { almacen.removeItem(perfilClave(base, id)); } catch (e) { /* sigue con las demás */ }
    });
  }
  estado.lista = estado.lista.filter(function (p) { return p.id !== id; });
  if (estado.activo === id) estado.activo = PERFIL_TITULAR;
  return _perfilesGuardar(estado);
}

/** Deja elegida a esa persona. Quien llama recarga la página. */
function perfilElegir(id) {
  var estado = perfilesLeer();
  if (!estado.lista.some(function (p) { return p.id === id; })) return false;
  estado.activo = id;
  return _perfilesGuardar(estado);
}

/** Lo que tiene guardado otra persona bajo una clave (para el menú de familia). */
function perfilLeerDatos(id, base) {
  var almacen = _perfilesAlmacen();
  if (!almacen) return null;
  try { return JSON.parse(almacen.getItem(perfilClave(base, id)) || "null"); } catch (e) { return null; }
}

/** Las demás personas para la cuenta: la lista, sus datos (texto JSON) y lo elegido para el menú de familia. */
function perfilesParaNube() {
  var estado = perfilesLeer();
  var almacen = _perfilesAlmacen();
  var datos = {};
  estado.lista.forEach(function (p) {
    if (p.id === PERFIL_TITULAR) return;
    var suyos = {};
    PERFIL_CLAVES_NUBE.forEach(function (base) {
      try {
        var v = almacen ? almacen.getItem(perfilClave(base, p.id)) : null;
        if (v) suyos[base] = v;
      } catch (e) { /* esa clave no viaja */ }
    });
    datos[p.id] = suyos;
  });
  var familia = null;
  try { familia = almacen ? almacen.getItem(PERFILES_FAMILIA_CLAVE) : null; } catch (e) { familia = null; }
  return { lista: estado.lista, datos: datos, familia: familia || null };
}

/**
 * Lo que llega de la cuenta: las personas que aquí no están y los datos que
 * aquí faltan. Lo que ya hay en el dispositivo no se pisa, y lo de la persona
 * activa tampoco (manda lo que se está usando).
 * @param {object} bloque - `settings._personas`
 * @returns {boolean} si había algo que leer
 */
function perfilesDesdeNube(bloque) {
  if (!bloque || typeof bloque !== "object" || !Array.isArray(bloque.lista)) return false;
  var almacen = _perfilesAlmacen();
  if (!almacen) return false;
  var estado = perfilesLeer();
  var cambiado = false;
  bloque.lista.forEach(function (p) {
    if (!p || typeof p.id !== "string" || !/^[a-z0-9]{1,24}$/.test(p.id)) return;
    var aqui = estado.lista.filter(function (x) { return x.id === p.id; })[0];
    if (aqui) {
      if (!aqui.nombre && p.nombre) { aqui.nombre = _perfilNombreLimpio(p.nombre); cambiado = true; }
      return;
    }
    if (estado.lista.length >= PERFILES_MAX) return;
    estado.lista.push({
      id: p.id,
      nombre: _perfilNombreLimpio(p.nombre),
      color: (typeof p.color === "string" && /^#[0-9A-Fa-f]{6}$/.test(p.color)) ? p.color : PERFILES_COLORES[estado.lista.length % PERFILES_COLORES.length]
    });
    cambiado = true;
  });
  if (cambiado) _perfilesGuardar(estado);
  var datos = (bloque.datos && typeof bloque.datos === "object") ? bloque.datos : {};
  Object.keys(datos).forEach(function (id) {
    if (id === PERFIL_TITULAR || id === estado.activo) return;
    if (!estado.lista.some(function (x) { return x.id === id; })) return;
    PERFIL_CLAVES_NUBE.forEach(function (base) {
      var v = datos[id] && datos[id][base];
      if (typeof v !== "string") return;
      var clave = perfilClave(base, id);
      try { if (!almacen.getItem(clave)) almacen.setItem(clave, v); } catch (e) { /* sin sitio: se queda sin traer */ }
    });
  });
  if (typeof bloque.familia === "string") {
    try { if (!almacen.getItem(PERFILES_FAMILIA_CLAVE)) almacen.setItem(PERFILES_FAMILIA_CLAVE, bloque.familia); } catch (e) { /* nada */ }
  }
  return true;
}

/** Al cerrar sesión: las personas son de la cuenta. Fuera todas, con lo suyo; queda el titular. */
function perfilesBorrarTodo() {
  var almacen = _perfilesAlmacen();
  if (!almacen) return;
  perfilesLeer().lista.forEach(function (p) {
    PERFIL_CLAVES_PROPIAS.forEach(function (base) {
      try { almacen.removeItem(perfilClave(base, p.id)); } catch (e) { /* sigue */ }
    });
  });
  [PERFILES_CLAVE, PERFILES_FAMILIA_CLAVE].forEach(function (k) {
    try { almacen.removeItem(k); } catch (e) { /* sigue */ }
  });
}

function perfilNombre(perfil) {
  if (perfil && perfil.nombre) return perfil.nombre;
  return (typeof t === "function") ? t("ui.perfil_yo") : "Yo";
}
