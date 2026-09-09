"use strict";
/**
 * Genera un lote y lo MIDE sin tocar el repositorio.
 *
 * ── POR QUE EXISTE ──────────────────────────────────────────────────────
 * El lote 1 se publico con los numeros de un lote anterior que ya no
 * existia, porque medir exigia aplicarlo primero y volver a medir despues
 * costaba montar el banco a mano. La consecuencia fue un revert.
 *
 * Aqui el lote candidato se pega EN MEMORIA sobre el dishes.js actual y se
 * mide asi. Nada se escribe en js/data/ hasta que el lote convence, de modo
 * que "medir una cosa y publicar otra" deja de ser posible por construccion.
 *
 * ── USO ─────────────────────────────────────────────────────────────────
 *   node scripts/generar-platos/probar_lote.js 2
 *   node scripts/generar-platos/probar_lote.js 2 60 0.25 4 40 0.75
 *   node scripts/generar-platos/probar_lote.js 3,4,5      (varias semillas)
 *
 * Los argumentos despues de la semilla son los de emitir_platos.js, en su
 * mismo orden. Cuando un lote convenza, se aplica con aplicar_lote.py
 * usando ESA misma semilla y ESOS mismos parametros, y se vuelve a medir
 * con medir_perfiles.js para confirmar que sale lo mismo.
 */
var path = require("path"), fs = require("fs"), cp = require("child_process");
var M = require(path.join(__dirname, "medir_perfiles.js"));
var REPO = M.REPO;

var SEMILLAS_ARG = String(process.argv[2] || "1");
var RESTO = process.argv.slice(3);
var CUANTOS = RESTO[0] || "60";
var PARAMS = RESTO.slice(1);
var SEMILLAS_MEDIDA = 200;

var dishesActual = fs.readFileSync(path.join(REPO, "js/data/dishes.js"), "utf8");

/** Igual que aplicar_lote.py, pero en memoria y solo para dishes.js. */
function numero(x) {
  return (typeof x === "number" && x === Math.floor(x)) ? String(x) : String(x);
}
function lineaPlato(p) {
  var items = p.items.map(function (i) {
    return '{name:"' + i.name + '",g:' + numero(i.g) + "}";
  }).join(",");
  return '  { name:"' + p.name + '", category:"' + p.category + '", kcal:' + numero(p.kcal)
    + ", protein:" + numero(p.protein) + ", carbs:" + numero(p.carbs) + ", fat:" + numero(p.fat)
    + ", cost:" + numero(p.cost) + ", prep:" + numero(p.prep) + ', mainProt:"' + p.mainProt
    + '", taste:"' + p.taste + '",\n    items:[' + items + "] },";
}

function generar(semilla) {
  var args = [path.join(__dirname, "emitir_platos.js"), CUANTOS, String(semilla)].concat(PARAMS);
  var salida = cp.execFileSync(process.execPath, args, { cwd: REPO, encoding: "utf8" });
  var lote = JSON.parse(fs.readFileSync(path.join(__dirname, "lote_platos.json"), "utf8"));
  var resumen = salida.split("\n")[0].trim();
  return { lote: lote, resumen: resumen };
}

function fuenteCon(lote) {
  var nuevos = lote.map(function (d) { return lineaPlato(d.plato); }).join("\n");
  return dishesActual.replace(/\n\];\s*$/, "\n" + nuevos + "\n];");
}

// Linea base: el catalogo tal y como esta ahora mismo.
console.log("Base = js/data/dishes.js del arbol de trabajo. " + SEMILLAS_MEDIDA + " semillas por perfil.");
console.log("");
var base = {};
M.PERFILES.forEach(function (p) { base[p.id] = M.medir(dishesActual, p, SEMILLAS_MEDIDA); });
M.PERFILES.forEach(function (p) {
  var b = base[p.id];
  console.log("  BASE  " + p.id.padEnd(8) + String(b.platos).padStart(4) + " platos"
    + "   prot " + b.prot.toFixed(1).padStart(5)
    + "   violan " + b.dias.toFixed(1).padStart(5) + "%"
    + "   perfect " + b.perfectos.toFixed(1).padStart(5) + "%");
});
console.log("");

SEMILLAS_ARG.split(",").forEach(function (s) {
  var semilla = s.trim();
  var g = generar(semilla);
  var fuente = fuenteCon(g.lote);
  console.log("=== semilla " + semilla + " -> " + g.resumen + " ===");
  var veredicto = "OK";
  M.PERFILES.forEach(function (p) {
    var x = M.medir(fuente, p, SEMILLAS_MEDIDA);
    var b = base[p.id];
    var dDias = x.dias - b.dias, dPerf = x.perfectos - b.perfectos, dProt = x.prot - b.prot;
    // 3,5 puntos es el error tipico con 200 semillas: por debajo de eso no
    // se declara nada.
    //
    // Se juzga por LAS DOS COSAS. Hasta el 2026-09-09 esto solo miraba
    // dDias, y el lote de la forma de dos verduras salio "OK" mientras le
    // quitaba 7 puntos de dias perfectos a recomposicion: un dia puede
    // dejar de ser perfecto sin llegar a violar nada -- el motor recorta
    // racion, relaja el sabor o cambia de plato y el contador de
    // violaciones ni se entera. Juzgar solo por violaciones es mirar la
    // mitad del dano, y esa mitad es justo la que el usuario nota.
    if (dDias > 3.5) veredicto = "RECHAZADO";
    if (dPerf < -3.5) veredicto = "RECHAZADO";
    console.log("    " + p.id.padEnd(8) + String(x.platos).padStart(4) + " platos"
      + "   prot " + x.prot.toFixed(1).padStart(5) + " (" + (dProt >= 0 ? "+" : "") + dProt.toFixed(1) + ")"
      + "   violan " + x.dias.toFixed(1).padStart(5) + "% (" + (dDias >= 0 ? "+" : "") + dDias.toFixed(1) + ")"
      + "   perfect " + x.perfectos.toFixed(1).padStart(5) + "% (" + (dPerf >= 0 ? "+" : "") + dPerf.toFixed(1) + ")");
  });
  console.log("    VEREDICTO: " + veredicto
    + (veredicto === "RECHAZADO" ? "  (algun perfil empeora mas que el ruido, en violaciones o en dias perfectos)" : ""));
  console.log("");
});
