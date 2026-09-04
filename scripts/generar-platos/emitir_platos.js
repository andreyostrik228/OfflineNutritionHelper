"use strict";
/**
 * Emite N platos nuevos + sus recetas. Todo se calcula con las funciones
 * REALES del motor, asi que las dos reglas duras del proyecto se cumplen
 * por construccion:
 *   - macros declarados === suma de los ingredientes (computeDishIngredientNutrition)
 *   - coste declarado === precio real de los ingredientes (priceDishAtStore)
 *
 * Uso: node emitir_platos.js [cuantos] [semilla]
 */
var path = require("path"), fs = require("fs");
var SP = __dirname;
var G = require(path.join(SP, "gen_platos.js"));
var sb = G.sb, TEC = G.TEC;

var CUANTOS = Number(process.argv[2] || 60);
var SEMILLA = Number(process.argv[3] || 1);

var PROT_POR_ING = {
  "Avena": "avena", "Copos de maíz": "avena", "Granola": "avena",
  "Skyr natural": "yogur", "Yogur griego ligero": "yogur",
  "Queso fresco batido 0%": "queso", "Requesón": "queso",
  "Queso light": "queso", "Mozzarella light": "queso",
  "Almendras": "cacahuete", "Nueces": "cacahuete", "Cacahuetes": "cacahuete",
  "Mantequilla de cacahuete": "cacahuete",
  "Pavo loncheado": "pavo", "Jamón cocido extra": "jamon",
  "Jamón serrano": "jamon", "Hummus": "legumbre"
};
var FRUTOS_SECOS = { "Almendras": 1, "Nueces": 1, "Cacahuetes": 1, "Mantequilla de cacahuete": 1 };

var EQ_VERDURA = {
  "Brócoli": "olla", "Coliflor": "olla",
  "Tomate": "ninguno", "Pepino": "ninguno"
};
var EXTRA_PREP_GRANO = {
  "Arroz integral cocido": 15, "Pasta cocida": 5, "Patata cocida": 5,
  "Batata": 3, "Arroz blanco cocido": 5, "Quinoa cocida": 5, "Cuscús cocido": 0
};

function unicos(arr) {
  var v = {}, out = [];
  arr.forEach(function (x) { if (x && !v[x]) { v[x] = 1; out.push(x); } });
  return out.length ? out : ["ninguno"];
}

/** Rellena kcal/protein/carbs/fat/cost con los numeros REALES, redondeados
 *  exactamente como los compara el test. */
function completar(plato) {
  var n = sb.computeDishIngredientNutrition(plato, 1);
  var s = { kcal: 0, protein: 0, carbs: 0, fat: 0 };
  n.forEach(function (x) { s.kcal += x.kcal; s.protein += x.protein; s.carbs += x.carbs; s.fat += x.fat; });
  plato.kcal = Math.round(s.kcal);
  plato.protein = Math.round(s.protein * 10) / 10;
  plato.carbs = Math.round(s.carbs * 10) / 10;
  plato.fat = Math.round(s.fat * 10) / 10;
  plato.cost = Math.round(sb.priceDishAtStore(plato, "mercadona").cost * 100) / 100;
  return plato;
}

function construir(c, categoria) {
  var plato, receta;
  if (c.tipo === "principal") {
    var t = TEC[c.p.tec];
    plato = {
      name: c.nombre, category: categoria,
      kcal: 0, protein: 0, carbs: 0, fat: 0, cost: 0,
      prep: Math.min(45, t.prep + (EXTRA_PREP_GRANO[c.g.name] || 0)),
      mainProt: c.p.mainProt, taste: "savory",
      items: [{ name: c.p.name, g: c.p.g }, { name: c.g.name, g: c.g.g }, { name: c.v.name, g: c.v.g }]
    };
    receta = {
      difficulty: c.p.dif,
      equipment: unicos(c.p.eq.concat(["olla"], [EQ_VERDURA[c.v.name] || "sarten"])),
      steps: t.pasos(c.p).concat([
        c.g.paso,
        c.v.paso,
        "Monta el plato con el " + c.g.label + " de base, " + c.p.label + " encima y " + c.v.label + " al lado."
      ])
    };
  } else if (c.tipo === "veg") {
    plato = {
      name: c.nombre, category: categoria,
      kcal: 0, protein: 0, carbs: 0, fat: 0, cost: 0,
      prep: 20, mainProt: c.bv.mainProt, taste: "savory",
      items: [{ name: c.bv.name, g: c.bv.g }, { name: c.sv.name, g: c.sv.g }, { name: c.v.name, g: c.v.g }]
    };
    receta = {
      difficulty: 1,
      equipment: unicos(["sarten"].concat(c.sv.eq, [EQ_VERDURA[c.v.name] || "sarten"])),
      steps: [c.bv.paso, c.sv.paso, c.v.paso,
        "Junta todo en la sarten un minuto al final, solo para que coja temperatura: removido de mas, la legumbre se deshace."]
    };
  } else if (c.tipo === "dulce") {
    plato = {
      name: c.nombre, category: "desayuno",
      kcal: 0, protein: 0, carbs: 0, fat: 0, cost: 0,
      prep: c.b.name === "Avena" ? 8 : 4,
      mainProt: PROT_POR_ING[c.b.name] || "avena", taste: "sweet",
      items: [{ name: c.b.name, g: c.b.g }, { name: c.f.name, g: c.f.g }, { name: c.t.name, g: c.t.g }]
    };
    receta = { difficulty: 1, equipment: unicos(c.b.eq), steps: [c.b.paso, c.f.paso, c.t.paso] };
  } else if (c.tipo === "salado") {
    plato = {
      name: c.nombre, category: "desayuno",
      kcal: 0, protein: 0, carbs: 0, fat: 0, cost: 0,
      prep: 6, mainProt: PROT_POR_ING[c.fi.name] || "queso", taste: "savory",
      items: [{ name: c.pan.name, g: c.pan.g }, { name: c.fi.name, g: c.fi.g }, { name: c.ve.name, g: c.ve.g }]
    };
    receta = {
      difficulty: 1, equipment: unicos(c.pan.eq),
      steps: [c.pan.paso, c.ve.paso, c.fi.paso,
        c.pan.name === "Tortillas de trigo"
          ? "Pon el relleno en el tercio inferior, dobla los lados hacia dentro y enrolla apretando: relleno en el centro se sale por los extremos."
          : "Móntalo en este orden: " + c.ve.label + " sobre el pan y " + c.fi.label + " encima, para que el pan no se humedezca."]
    };
  } else if (c.tipo === "snack3") {
    plato = {
      name: c.nombre, category: "snack",
      kcal: 0, protein: 0, carbs: 0, fat: 0, cost: 0,
      prep: c.b.name === "Avena" ? 8 : 4,
      mainProt: PROT_POR_ING[c.b.name] || "yogur", taste: "sweet",
      items: [{ name: c.b.name, g: c.b.g }, { name: c.f.name, g: c.f.g }, { name: c.t.name, g: c.t.g }]
    };
    receta = { difficulty: 1, equipment: unicos(c.b.eq), steps: [c.b.paso, c.f.paso, c.t.paso] };
  } else {
    plato = {
      name: c.nombre, category: "snack",
      kcal: 0, protein: 0, carbs: 0, fat: 0, cost: 0,
      // El porridge se cuece: 3 minutos seria mentir sobre el tiempo.
      prep: c.a.name === "Avena" ? 8 : 3,
      mainProt: PROT_POR_ING[c.a.name] || PROT_POR_ING[c.b2.name] || "cacahuete", taste: "sweet",
      items: [{ name: c.a.name, g: c.a.g }, { name: c.b2.name, g: c.b2.g }]
    };
    // Tres pasos como minimo: es lo que exige el test del piloto, y con
    // dos el snack se quedaba sin decir lo unico que de verdad importa
    // en un snack, que es cuando montarlo.
    var esFruta = G.FRUTAS.some(function (f) { return f.name === c.a.name; });
    var cierre = esFruta
      ? "Junta las dos cosas en el momento de comer: el fruto seco pierde el crujiente en cuanto coge la humedad de la fruta."
      : "Mezcla la fruta justo antes de comer, no con antelacion: suelta agua y aguaria la base.";
    receta = { difficulty: 1, equipment: unicos((c.a.eq || []).concat(c.b2.eq || [])), steps: [c.a.paso, c.b2.paso, cierre] };
  }
  return { plato: completar(plato), receta: receta };
}

// ── Seleccion con cuotas proporcionales al catalogo actual ──────────────
var cuota = {
  comida: Math.round(CUANTOS * 0.35),
  cena: Math.round(CUANTOS * 0.31),
  desayuno: Math.round(CUANTOS * 0.18),
  snack: CUANTOS - Math.round(CUANTOS * 0.35) - Math.round(CUANTOS * 0.31) - Math.round(CUANTOS * 0.18)
};
// ── Suelo de proteina, sacado de los DATOS y no a ojo ───────────────────
// El primer intento de este lote no lo tenia y salio por debajo del
// catalogo en las cuatro categorias (mediana de snack 8,2 g frente a 16,3).
// Medido: en el perfil de CORTE las violaciones por proteina subian del
// 53% al 84% de los dias, porque el motor, con presupuesto apretado, se
// iba a los platos nuevos por baratos. El suelo es el percentil 25 de lo
// que ya hay: un plato nuevo no puede estar por debajo del cuarto inferior
// del catalogo que amplia.
var PCTL = Number(process.argv[4] || 0.25);
function percentil25Proteina(cat) {
  var v = sb.DISH_DB.filter(function (d) { return d.category === cat; })
    .map(function (d) { return d.protein; })
    .sort(function (a, b) { return a - b; });
  return v[Math.floor(v.length * PCTL)];
}
// Y un suelo de PROTEINA POR EURO para los principales. Medido: sin el, el
// lote subia el coste mediano de una comida de 2,08 a 2,76 EUR (salmon,
// gambas, solomillo a racion entera) y las violaciones por proteina del
// perfil de CORTE -- 12 EUR al dia -- pasaban del 53% al 66% de los dias.
// No es que esos platos sobren: es que no pueden ser la norma. Se admite
// una cuota corta de caros, para que el catalogo no quede solo de barato.
function percentilProtPorEuro(cat) {
  var v = sb.DISH_DB.filter(function (d) { return d.category === cat; })
    .map(function (d) { return d.protein / Math.max(0.01, d.cost); })
    .sort(function (a, b) { return a - b; });
  return v[Math.floor(v.length * 0.25)];
}
var SUELO_PROT_EURO = {
  comida: percentilProtPorEuro("comida"),
  cena: percentilProtPorEuro("cena")
};
// Suelo de PROTEINA POR KCAL, que es lo que de verdad decide un dia de
// corte. Medido con un control limpio: clonar los 60 platos con mas
// proteina por kcal que ya existen deja el perfil igual o mejor (53% -> 51%
// de dias con violacion), mientras que el lote a densidad mediana lo
// empeoraba al 66%. O sea: el problema nunca fue meter 60 platos mas, era
// meterlos a media altura. El suelo se pone en el percentil 75 del propio
// catalogo: un plato nuevo entra si esta en el cuarto MEJOR de lo que hay.
function percentilDensidad(cat, pct) {
  var v = sb.DISH_DB.filter(function (d) { return d.category === cat; })
    .map(function (d) { return d.protein / d.kcal; })
    .sort(function (a, b) { return a - b; });
  return v[Math.floor(v.length * pct)];
}
var PCTL_DENS = Number(process.argv[7] || 0.75);
var SUELO_DENSIDAD = {
  comida: percentilDensidad("comida", PCTL_DENS),
  cena: percentilDensidad("cena", PCTL_DENS),
  desayuno: percentilDensidad("desayuno", PCTL_DENS),
  snack: percentilDensidad("snack", PCTL_DENS)
};

var CUOTA_CAROS = Number(process.argv[6] || 4);
var caros = 0;

var SUELO_PROTEINA = {
  comida: percentil25Proteina("comida"),
  cena: percentil25Proteina("cena"),
  desayuno: percentil25Proteina("desayuno"),
  snack: percentil25Proteina("snack")
};

var TECHO_POR_GRUPO = Number(process.argv[5] || 3);
var porGrupo = {};
var hechos = { comida: 0, cena: 0, desayuno: 0, snack: 0 };
var salida = [];
var nombres = G.nombresUsados, firmas = G.firmasUsadas, rango = G.rango;
var descartes = { nombre: 0, firma: 0, kcal: 0, sinCuota: 0, snackSinProte: 0, pocaProteina: 0, mismoGrupo: 0, caro: 0, pocaDensidad: 0 };

// ── Reparto por DIVERSIDAD ──────────────────────────────────────────────
// Los candidatos salen en orden proteina -> grano -> verdura, asi que
// tomarlos tal cual da seis "Ternera con patata y ..." seguidos. Se agrupan
// por ingrediente principal, se baraja cada grupo y se cogen por turnos:
// asi un lote de 60 recorre TODAS las proteinas antes de repetir ninguna.
function claveGrupo(c) {
  if (c.tipo === "principal") return "P:" + c.p.name;
  if (c.tipo === "dulce") return "D:" + c.b.name;
  if (c.tipo === "salado") return "S:" + c.pan.name;
  if (c.tipo === "snack3") return "K3:" + c.b.name;
  // La SEGUNDA proteina va en la clave: sin ella los diez vegetarianos
  // salian todos con claras, que es lo que mas densidad da.
  if (c.tipo === "veg") return "V:" + c.bv.name + "+" + c.sv.name;
  return "K:" + c.a.name;
}
function prng(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    var x = Math.imul(a ^ a >>> 15, 1 | a);
    x = x + Math.imul(x ^ x >>> 7, 61 | x) ^ x;
    return ((x ^ x >>> 14) >>> 0) / 4294967296;
  };
}
function porTurnos(cands, semilla) {
  var rand = prng(semilla);
  var grupos = {}, orden = [];
  cands.forEach(function (c) {
    var k = claveGrupo(c);
    if (!grupos[k]) { grupos[k] = []; orden.push(k); }
    grupos[k].push(c);
  });
  orden.forEach(function (k) {
    var a = grupos[k];
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(rand() * (i + 1));
      var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
    }
  });
  var out = [], quedan = true, vuelta = 0;
  while (quedan) {
    quedan = false;
    for (var i = 0; i < orden.length; i++) {
      var g = grupos[orden[i]];
      if (vuelta < g.length) { out.push(g[vuelta]); quedan = true; }
    }
    vuelta++;
  }
  return out;
}

porTurnos(G.construirCandidatos(SEMILLA), SEMILLA).forEach(function (c) {
  if (salida.length >= CUANTOS) return;
  // Un snack de fruta con miel o mermelada es azucar sola: no entra.
  if (c.tipo === "snack" && c.a && c.a.name && G.FRUTAS.some(function (f) { return f.name === c.a.name; })
      && !FRUTOS_SECOS[c.b2.name]) { descartes.snackSinProte++; return; }
  if (nombres[c.nombre.toLowerCase()]) { descartes.nombre++; return; }

  var cat = (c.tipo === "principal" || c.tipo === "veg")
    ? (hechos.comida < cuota.comida ? "comida" : "cena")
    : ((c.tipo === "snack" || c.tipo === "snack3") ? "snack" : "desayuno");
  if (hechos[cat] >= cuota[cat]) { descartes.sinCuota++; return; }

  var hecho = construir(c, cat);
  var f = G.firma(hecho.plato.items);
  if (firmas[f]) { descartes.firma++; return; }
  if (hecho.plato.protein < SUELO_PROTEINA[cat]) { descartes.pocaProteina++; return; }
  // Techo de repeticion: sin esto el lote salia con 7 de 11 desayunos de
  // jamon serrano, porque era de lo poco que pasaba el suelo de proteina.
  // Un catalogo de 1000 platos no se construye repitiendo el mismo.
  if (hecho.plato.protein / hecho.plato.kcal < SUELO_DENSIDAD[cat]) { descartes.pocaDensidad++; return; }
  if (SUELO_PROT_EURO[cat]) {
    var porEuro = hecho.plato.protein / Math.max(0.01, hecho.plato.cost);
    if (porEuro < SUELO_PROT_EURO[cat]) {
      if (caros >= CUOTA_CAROS) { descartes.caro++; return; }
      caros++;
    }
  }
  var gk = claveGrupo(c);
  porGrupo[gk] = porGrupo[gk] || 0;
  if (porGrupo[gk] >= TECHO_POR_GRUPO) { descartes.mismoGrupo++; return; }
  var r = rango[cat];
  if (hecho.plato.kcal < r.min || hecho.plato.kcal > r.max) { descartes.kcal++; return; }

  porGrupo[gk]++;
  nombres[c.nombre.toLowerCase()] = true;
  firmas[f] = true;
  hechos[cat]++;
  salida.push(hecho);
});

fs.writeFileSync(path.join(SP, "lote_platos.json"), JSON.stringify(salida, null, 1), "utf8");
console.log("generados: " + salida.length + "  " + JSON.stringify(hechos));
console.log("descartes: " + JSON.stringify(descartes));
console.log("");
salida.slice(0, 6).forEach(function (h) {
  var p = h.plato;
  console.log("  " + p.name);
  console.log("     " + p.category + " | " + p.kcal + " kcal | P" + p.protein + " C" + p.carbs + " G" + p.fat
    + " | " + p.cost.toFixed(2) + " EUR | " + p.prep + " min | " + p.mainProt
    + " | " + p.items.map(function (i) { return i.name + " " + i.g + "g"; }).join(", "));
});
