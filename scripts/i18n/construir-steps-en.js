"use strict";
/**
 * scripts/i18n/construir-steps-en.js
 * ──────────────────────────────────────────────────────────────────────
 * Junta las tandas de traducción de `tandas/` y escribe js/i18n/steps-en.js.
 *
 * Y sobre todo COMPRUEBA: una clave que no case letra por letra con el paso
 * real no traduce nada y no da ningún error -- la receta sale en español y
 * nadie se entera. Aquí eso se convierte en un fallo ruidoso: si hay una
 * sola clave fantasma, el fichero NO se escribe.
 *
 * Uso:  node scripts/i18n/construir-steps-en.js
 * ──────────────────────────────────────────────────────────────────────
 */
var fs = require("fs");
var path = require("path");
var AQUI = __dirname;
var REPO = path.resolve(AQUI, "..", "..");
var TANDAS = path.join(AQUI, "tandas");
var loadBrowserGlobals = require(path.join(REPO, "tests/lib/load-browser-globals")).loadBrowserGlobals;

// ── Los pasos REALES, tal cual están en los datos ──────────────────────
var s = loadBrowserGlobals([path.join(REPO, "js/data/dish-instructions.js")]);
var DI = s.DISH_INSTRUCTIONS || {};
var reales = {};
var ordenados = [];
Object.keys(DI).forEach(function (plato) {
  (DI[plato].steps || []).forEach(function (paso) {
    if (!reales[paso]) { reales[paso] = 0; ordenados.push(paso); }
    reales[paso]++;
  });
});

// ── Las tandas ─────────────────────────────────────────────────────────
var tandas = fs.readdirSync(TANDAS)
  .filter(function (f) { return /^tanda-\d+\.json$/.test(f); })
  .sort();

var trad = {};
var duplicadas = [];
tandas.forEach(function (f) {
  var obj = JSON.parse(fs.readFileSync(path.join(TANDAS, f), "utf8"));
  Object.keys(obj).forEach(function (k) {
    if (Object.prototype.hasOwnProperty.call(trad, k)) duplicadas.push(k);
    trad[k] = obj[k];
  });
});

// ── Comprobaciones ─────────────────────────────────────────────────────
var claves = Object.keys(trad);
var fantasma = claves.filter(function (k) { return !reales[k]; });
var sinTraducir = ordenados.filter(function (p) { return typeof trad[p] !== "string"; });
var vacias = claves.filter(function (k) { return !trad[k] || !String(trad[k]).trim(); });
var identicas = claves.filter(function (k) { return trad[k] === k; });

var apariciones = 0, cubiertas = 0;
ordenados.forEach(function (p) {
  apariciones += reales[p];
  if (typeof trad[p] === "string") cubiertas += reales[p];
});

console.log("tandas leidas        : " + tandas.length);
console.log("pasos unicos reales  : " + ordenados.length);
console.log("traducidos           : " + (claves.length - fantasma.length) +
  "  (" + Math.round((claves.length - fantasma.length) / ordenados.length * 100) + "%)");
console.log("cobertura en pantalla: " + cubiertas + "/" + apariciones +
  " apariciones (" + Math.round(cubiertas / apariciones * 100) + "%)");
console.log("faltan               : " + sinTraducir.length);

var problemas = 0;
function pega(nombre, lista) {
  if (!lista.length) return;
  problemas += lista.length;
  console.log("\n!! " + nombre + ": " + lista.length);
  lista.slice(0, 5).forEach(function (k) { console.log("   " + JSON.stringify(k.slice(0, 90))); });
}
pega("CLAVES FANTASMA (no casan con ningun paso real)", fantasma);
pega("claves duplicadas entre tandas", duplicadas);
pega("traducciones vacias", vacias);
pega("traducciones identicas al español", identicas);

if (problemas) {
  console.log("\nNO se escribe el fichero: hay " + problemas + " problemas.");
  process.exit(1);
}

// ── Escribir, en el orden en que aparecen en los datos ──────────────────
var R = "─";
var RAYA = new Array(73).join(R);
var cab = [
  "/**",
  " * js/i18n/steps-en.js",
  " * " + RAYA,
  " * Los PASOS de las recetas, en ingles.",
  " *",
  " * La clave es la frase española entera, no un identificador: asi este",
  " * fichero se lee en paralelo con js/data/dish-instructions.js y se puede",
  " * revisar sin saltar de uno a otro. Misma decision que food-en.js.",
  " *",
  " * Sin traduccion para un paso, `tStep()` devuelve el ORIGINAL en español.",
  " * El generador de platos escribe pasos nuevos, asi que eso va a pasar: un",
  " * plato recien generado sale en español dentro de una interfaz en ingles.",
  " * Feo, pero se cocina. Un hueco no.",
  " *",
  " * GENERADO por scripts/i18n/construir-steps-en.js a partir de las tandas",
  " * de traduccion (scripts/i18n/tandas/). Si se edita a mano, que sea ahi:",
  " * una clave que deje de casar letra por letra no traduce y no avisa.",
  " * " + RAYA,
  " */",
  "",
  "registerStepTable(\"en\", {"
].join("\r\n");

var cuerpo = ordenados.map(function (p, i) {
  var coma = (i === ordenados.length - 1) ? "" : ",";
  return "  " + JSON.stringify(p) + ": " + JSON.stringify(trad[p]) + coma;
}).join("\r\n");

var texto = cab + "\r\n" + cuerpo + "\r\n});\r\n";
var destino = path.join(REPO, "js/i18n/steps-en.js");
fs.writeFileSync(destino, texto, "utf8");
console.log("\nescrito: js/i18n/steps-en.js  (" + Math.round(texto.length / 1024) + " KB, " +
  ordenados.length + " entradas)");
