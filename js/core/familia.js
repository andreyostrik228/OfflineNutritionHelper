/**
 * js/core/familia.js
 * ─────────────────────────────────────────────────────────────────────────
 * El menú de varias personas (2026-10-26). Pedido del dueño: «указывать
 * скольким людям делается меню… делать меню и ребёнку, и бабушке, и отцу, и
 * маме». Las personas son las de js/core/perfiles.js; quién come, cómo y con
 * qué dinero se guarda aquí, y es de la casa (no de una persona).
 *
 * Dos maneras, las dos pedidas («и так и так»):
 *   «comun» — un menú para todos y cada uno su ración: el plan se hace para
 *             la persona activa y cada otra come `escala` veces su ración
 *             (sus calorías / las de la activa). Los «no me gusta» se suman.
 *   «cada»  — cada persona su menú, con sus datos y sus «no me gusta».
 * Y el presupuesto, también las dos: por persona o para toda la familia.
 * Los invitados (sin perfil) comen como la persona activa.
 *
 * Funciones puras salvo familiaLeer/familiaGuardar (localStorage).
 *
 * Expone (globales):
 *   FAMILIA_CLAVE, FAMILIA_INVITADOS_MAX
 *   familiaLeer() / familiaGuardar(f)
 *   familiaDatosPersona(ajustes, comunes) → datos para calculateProfile, o null si faltan
 *   familiaEscala(kcal, kcalRef) → ración relativa, redondeada a 0,05
 *   familiaSuma(personas, invitados) → raciones de la persona activa en total
 *   familiaPresupuestoComun(budget, modo, suma) → presupuesto del plan de referencia
 *   familiaPresupuestoCada(budget, modo, kcal, kcalTotal) → el de una persona
 *   familiaEscalarTomas(meals, factor) → copias con las cantidades multiplicadas
 *   familiaDislikes(listas) → la unión, sin repetir
 *   familiaPlanear(data, profile, dislikes) → quién come y con qué ración, o null si solo la persona activa
 * ─────────────────────────────────────────────────────────────────────────
 */

var FAMILIA_CLAVE = "nutritionPlanner.familia.v1";
var FAMILIA_INVITADOS_MAX = 10;

function _familiaPorDefecto() {
  return { quienes: [], modo: "comun", presupuesto: "persona", invitados: 0 };
}

/** Lo elegido para el próximo menú, saneado. `quienes` NO incluye a la persona activa. */
function familiaLeer() {
  var f = _familiaPorDefecto();
  var g = null;
  try { g = (typeof localStorage !== "undefined") ? JSON.parse(localStorage.getItem(FAMILIA_CLAVE) || "null") : null; } catch (e) { g = null; }
  if (!g || typeof g !== "object") return f;
  if (Array.isArray(g.quienes)) {
    f.quienes = g.quienes.filter(function (id, i, a) { return typeof id === "string" && a.indexOf(id) === i; }).slice(0, 8);
  }
  if (g.modo === "cada") f.modo = "cada";
  if (g.presupuesto === "familia") f.presupuesto = "familia";
  var n = Number(g.invitados);
  if (isFinite(n)) f.invitados = Math.max(0, Math.min(FAMILIA_INVITADOS_MAX, Math.floor(n)));
  return f;
}

function familiaGuardar(f) {
  try {
    if (typeof localStorage === "undefined") return false;
    localStorage.setItem(FAMILIA_CLAVE, JSON.stringify({
      quienes: f.quienes || [], modo: f.modo === "cada" ? "cada" : "comun",
      presupuesto: f.presupuesto === "familia" ? "familia" : "persona",
      invitados: Math.max(0, Math.min(FAMILIA_INVITADOS_MAX, Math.floor(Number(f.invitados) || 0)))
    }));
    return true;
  } catch (e) { return false; }
}

/**
 * Los datos de una persona para calculateProfile: lo de su cuerpo sale de
 * SUS ajustes; lo de la casa (presupuesto, tiempo de cocina, gusto…), de
 * `comunes` (el formulario de quien prepara el menú).
 * @param {object|null} ajustes - lo guardado en «Mis datos» de esa persona
 * @param {object} comunes - readForm() de la persona activa
 * @returns {object|null} null si a esa persona le faltan datos
 */
function familiaDatosPersona(ajustes, comunes) {
  var a = ajustes || {};
  var num = function (v) { return typeof v === "number" && isFinite(v) ? v : NaN; };
  var edad = num(a.age), peso = num(a.weight), altura = num(a.height);
  if (!(edad >= 1 && edad <= 110) || !(peso >= 8 && peso <= 300) || !(altura >= 60 && altura <= 230)) return null;
  if (a.sex !== "male" && a.sex !== "female") return null;
  var datos = {};
  Object.keys(comunes || {}).forEach(function (k) { datos[k] = comunes[k]; });
  datos.age = edad; datos.weight = peso; datos.height = altura; datos.sex = a.sex;
  datos.goal = typeof a.goal === "string" ? a.goal : "maintain";
  datos.workouts = isFinite(num(a.workouts)) ? a.workouts : 0;
  var pasos = num(a.steps);
  datos.steps = isFinite(pasos) ? pasos : 8500;
  datos.activity = (typeof actividadPorPasos === "function") ? actividadPorPasos(datos.steps)
    : (isFinite(num(a.activity)) ? a.activity : 1.55);
  datos.kcalPropias = (num(a.kcalPropias) >= 1200 && num(a.kcalPropias) <= 6000) ? a.kcalPropias : null;
  return datos;
}

/** Cuántas raciones de la persona activa come otra, redondeado a 0,05. */
function familiaEscala(kcal, kcalRef) {
  if (!(kcal > 0) || !(kcalRef > 0)) return 1;
  return Math.max(0.3, Math.round(kcal / kcalRef * 20) / 20);
}

/** Raciones de la persona activa que come la familia entera. */
function familiaSuma(personas, invitados) {
  var s = (personas || []).reduce(function (a, p) { return a + (p.escala || 0); }, 0);
  return Math.round((s + Math.max(0, invitados || 0)) * 100) / 100;
}

/**
 * Menú común: el plan se hace para la persona activa y se compra `suma`
 * veces. Con el presupuesto de la familia, su ración tiene que caber en
 * presupuesto / suma; por persona, se queda como está.
 */
function familiaPresupuestoComun(budget, modo, suma) {
  if (!(budget > 0) || modo !== "familia" || !(suma > 0)) return budget;
  return Math.round(budget / suma * 100) / 100;
}

/** Cada uno su menú: con el de la familia, a cada persona le toca su parte según sus calorías. */
function familiaPresupuestoCada(budget, modo, kcal, kcalTotal) {
  if (!(budget > 0) || modo !== "familia" || !(kcal > 0) || !(kcalTotal > 0)) return budget;
  return Math.round(budget * kcal / kcalTotal * 100) / 100;
}

/**
 * Copias de las tomas con cada cantidad multiplicada: lo que hay que comprar
 * para `factor` raciones. No toca las originales (son las de la pantalla).
 */
function familiaEscalarTomas(meals, factor) {
  var f = factor > 0 ? factor : 1;
  var r = function (x, d) { var m = Math.pow(10, d); return typeof x === "number" ? Math.round(x * f * m) / m : x; };
  return (meals || []).map(function (meal) {
    var copia = {};
    Object.keys(meal).forEach(function (k) { copia[k] = meal[k]; });
    copia.items = (meal.items || []).map(function (it) {
      var c = {};
      Object.keys(it).forEach(function (k) { c[k] = it[k]; });
      c.grams = r(it.grams, 0); c.g = r(it.g, 0);
      c.kcal = r(it.kcal, 1); c.protein = r(it.protein, 1); c.carbs = r(it.carbs, 1); c.fat = r(it.fat, 1);
      c.cost = r(it.cost, 2);
      return c;
    });
    if (meal.total) {
      copia.total = {};
      Object.keys(meal.total).forEach(function (k) { copia.total[k] = r(meal.total[k], k === "cost" ? 2 : 1); });
    }
    if (typeof meal.spent === "number") copia.spent = r(meal.spent, 2);
    return copia;
  });
}

/**
 * Quién come en el próximo menú, con sus datos, su objetivo y su ración.
 * La persona activa va siempre y la primera; a quien le falten datos en «Mis
 * datos» se le deja fuera (la pantalla lo dice). null si come ella sola.
 *
 * @param {object} data - readForm() de la persona activa, con budget resuelto
 * @param {object} profile - calculateProfile(data)
 * @param {string[]} dislikes - sus «no me gusta»
 * @returns {{modo, presupuesto, invitados, personas:object[], suma:number}|null}
 */
function familiaPlanear(data, profile, dislikes) {
  if (typeof perfilesLeer !== "function" || typeof calculateProfile !== "function") return null;
  var f = familiaLeer();
  var estado = perfilesLeer();
  var activo = estado.lista.filter(function (p) { return p.id === estado.activo; })[0] || estado.lista[0];
  var personas = [{
    id: activo.id, nombre: perfilNombre(activo), color: activo.color, activo: true,
    datos: data, profile: profile, escala: 1, dislikes: dislikes || []
  }];
  f.quienes.forEach(function (id) {
    if (id === activo.id) return;
    var p = estado.lista.filter(function (x) { return x.id === id; })[0];
    if (!p) return;
    var ajustes = perfilLeerDatos(id, "nutritionPlanner.settings.v1");
    var datos = familiaDatosPersona(ajustes, data);
    if (!datos) return;
    var suyo = calculateProfile(datos);
    personas.push({
      id: id, nombre: perfilNombre(p), color: p.color, activo: false,
      datos: datos, profile: suyo, escala: familiaEscala(suyo.calories, profile.calories),
      dislikes: (ajustes && Array.isArray(ajustes.dislikes)) ? ajustes.dislikes : []
    });
  });
  if (personas.length === 1 && !f.invitados) return null;
  return { modo: f.modo, presupuesto: f.presupuesto, invitados: f.invitados, personas: personas, suma: familiaSuma(personas, f.invitados) };
}

/** La unión de varias listas de «no me gusta», sin repetir (sin distinguir mayúsculas). */
function familiaDislikes(listas) {
  var vistos = {};
  var out = [];
  (listas || []).forEach(function (l) {
    (Array.isArray(l) ? l : []).forEach(function (x) {
      var s = String(x || "").trim();
      var k = s.toLowerCase();
      if (s && !vistos[k]) { vistos[k] = true; out.push(s); }
    });
  });
  return out;
}
