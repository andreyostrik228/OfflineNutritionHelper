"use strict";
/**
 * scripts/i18n/inventario.js
 * ──────────────────────────────────────────────────────────────────────
 * Qué queda sin traducir, con números. No adivinar: contar.
 *
 * Tres cosas:
 *   1. tamaño de cada tabla de traducción;
 *   2. cobertura real de los pasos de receta (via tStep, no via grep);
 *   3. literales en español que siguen incrustados en el código y que
 *      llegan a pantalla -- se excluyen comentarios y console.*, porque
 *      esos no los ve nadie.
 *
 * El punto 3 es una APROXIMACIÓN: cuenta cadenas con acento o ñ. Un texto
 * visible sin ninguna letra acentuada ("Cambiar", "Guardar") no aparece.
 * Para el barrido fino hay que abrir la app en inglés y recorrer los nodos
 * de texto; eso encontró 223 fragmentos donde el grep veía muchos menos.
 *
 * Uso:  node scripts/i18n/inventario.js
 * ──────────────────────────────────────────────────────────────────────
 */
var fs = require("fs");
var path = require("path");
var AQUI = __dirname;
var REPO = path.resolve(AQUI, "..", "..");
var loadBrowserGlobals = require(path.join(REPO, "tests/lib/load-browser-globals")).loadBrowserGlobals;

function leer(p) { return fs.readFileSync(path.join(REPO, p), "utf8"); }
function existe(p) { return fs.existsSync(path.join(REPO, p)); }

// ── 1. Tamaño de las tablas ────────────────────────────────────────────
console.log("\nTABLAS");
["js/i18n/es.js", "js/i18n/en.js", "js/i18n/food-en.js",
 "js/i18n/packages-en.js", "js/i18n/steps-en.js"].forEach(function (f) {
  if (!existe(f)) { console.log("  (falta) " + f); return; }
  var n = (leer(f).match(/^\s*"[^"]+"\s*:/gm) || []).length;
  console.log("  " + String(n).padStart(6) + "  " + f);
});

// ── 2. Cobertura real de los pasos ─────────────────────────────────────
var s = loadBrowserGlobals([
  path.join(REPO, "js/core/i18n.js"),
  path.join(REPO, "js/i18n/es.js"),
  path.join(REPO, "js/i18n/steps-en.js"),
  path.join(REPO, "js/data/dish-instructions.js")
]);
var DI = s.DISH_INSTRUCTIONS || {};
var total = 0, sinTraducir = 0, unicos = {}, unicosSin = {};
Object.keys(DI).forEach(function (p) {
  (DI[p].steps || []).forEach(function (paso) {
    total++; unicos[paso] = 1;
    if (s.tStep(paso, "en") === paso) { sinTraducir++; unicosSin[paso] = 1; }
  });
});
console.log("\nPASOS DE RECETA  (" + Object.keys(DI).length + " platos)");
console.log("  " + total + " apariciones, " + Object.keys(unicos).length + " distintas");
console.log("  sin traducir: " + sinTraducir + " apariciones, " +
  Object.keys(unicosSin).length + " distintas");

// ── 3. Español incrustado que llega a pantalla ─────────────────────────
function ficherosJs(dir) {
  var out = [];
  fs.readdirSync(path.join(REPO, dir)).forEach(function (f) {
    if (/\.js$/.test(f)) out.push(dir + "/" + f);
  });
  return out;
}
var candidatos = [];
["js/ui", "js/core", "js/engine"].forEach(function (d) {
  if (existe(d)) candidatos = candidatos.concat(ficherosJs(d));
});
candidatos = candidatos.filter(function (f) { return f.indexOf("js/core/i18n.js") === -1; });

console.log("\nESPAÑOL INCRUSTADO QUE LLEGA A PANTALLA  (aprox., ver cabecera)");
var suma = 0;
candidatos.forEach(function (f) {
  var n = 0, ej = [];
  leer(f).split(/\r?\n/).forEach(function (l) {
    if (/console\.(log|warn|error|info)/.test(l)) return;
    if (/^\s*(\/\/|\*|\/\*)/.test(l)) return;
    (l.match(/"[^"]{4,}"/g) || []).forEach(function (cad) {
      if (!/[áéíóúñ¿¡ÁÉÍÓÚÑ]/.test(cad)) return;
      if (/^"(ui|food|dish|tour)\./.test(cad)) return;
      n++; if (ej.length < 2) ej.push(cad.slice(0, 44));
    });
  });
  if (n) { suma += n; console.log("  " + String(n).padStart(4) + "  " + f + "   ej: " + ej.join(" / ")); }
});
console.log("  ----");
console.log("  " + suma + " en total\n");
