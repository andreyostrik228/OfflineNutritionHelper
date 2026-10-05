"use strict";
/**
 * scripts/i18n/construir-steps.js
 * ──────────────────────────────────────────────────────────────────────
 * Junta las tandas de traducción de `tandas/<idioma>/` y escribe
 * js/i18n/steps-<idioma>.js.
 *
 * Y sobre todo COMPRUEBA: una clave que no case letra por letra con el paso
 * real no traduce nada y no da ningún error -- la receta sale en español y
 * nadie se entera. Aquí eso se convierte en un fallo ruidoso: si hay una
 * sola clave fantasma, el fichero NO se escribe.
 *
 * Uso:  node scripts/i18n/construir-steps.js en
 *       node scripts/i18n/construir-steps.js ru
 * ──────────────────────────────────────────────────────────────────────
 */
var fs = require("fs");
var path = require("path");
var AQUI = __dirname;
var REPO = path.resolve(AQUI, "..", "..");
var loadBrowserGlobals = require(path.join(REPO, "tests/lib/load-browser-globals")).loadBrowserGlobals;

/** Cómo se llama cada idioma en la cabecera del fichero generado. */
var NOMBRES = {
  en: "ingles", de: "aleman", fr: "frances", ru: "ruso", uk: "ucraniano",
  it: "italiano", pt: "portugues", pl: "polaco", ro: "rumano"
};

/**
 * Letras que TIENE que llevar una traducción a ese idioma. Una frase sin
 * ni una sola es una frase que se quedó en español (o en inglés, al copiar
 * del inglés como referencia) y que la comprobación de "idéntica al
 * español" no ve porque le cambió una coma.
 */
var ESCRITURA = {
  ru: /[а-яё]/i,
  uk: /[а-яіїєґ]/i
};

var LANG = process.argv[2];
if (!NOMBRES[LANG]) {
  console.log("Uso: node scripts/i18n/construir-steps.js <" + Object.keys(NOMBRES).join("|") + ">");
  process.exit(1);
}
var TANDAS = path.join(AQUI, "tandas", LANG);

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
var tandas = fs.existsSync(TANDAS) ? fs.readdirSync(TANDAS)
  .filter(function (f) { return /^tanda-\d+\.json$/.test(f); })
  .sort() : [];

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
var sinEscritura = ESCRITURA[LANG] ? claves.filter(function (k) {
  return trad[k] && !ESCRITURA[LANG].test(trad[k]);
}) : [];

var apariciones = 0, cubiertas = 0;
ordenados.forEach(function (p) {
  apariciones += reales[p];
  if (typeof trad[p] === "string") cubiertas += reales[p];
});

console.log("idioma               : " + LANG);
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
pega("traducciones sin una sola letra del idioma", sinEscritura);

if (problemas) {
  console.log("\nNO se escribe el fichero: hay " + problemas + " problemas.");
  process.exit(1);
}

// ── Escribir, en el orden en que aparecen en los datos ──────────────────
// Solo los pasos traducidos: un paso sin tanda no entra, y `tStep()` lo
// devuelve en español, que es el repliegue de siempre.
var R = "─";
var RAYA = new Array(73).join(R);
var fichero = "steps-" + LANG + ".js";
var cab = [
  "/**",
  " * js/i18n/" + fichero,
  " * " + RAYA,
  " * Los PASOS de las recetas, en " + NOMBRES[LANG] + ".",
  " *",
  " * La clave es la frase española entera, no un identificador: asi este",
  " * fichero se lee en paralelo con js/data/dish-instructions.js y se puede",
  " * revisar sin saltar de uno a otro. Misma decision que food-" + LANG + ".js.",
  " *",
  " * Sin traduccion para un paso, `tStep()` devuelve el ORIGINAL en español.",
  " * El generador de platos escribe pasos nuevos, asi que eso va a pasar: un",
  " * plato recien generado sale en español dentro de una interfaz en " + NOMBRES[LANG] + ".",
  " * Feo, pero se cocina. Un hueco no.",
  " *",
  " * GENERADO por scripts/i18n/construir-steps.js a partir de las tandas",
  " * de traduccion (scripts/i18n/tandas/" + LANG + "/). Si se edita a mano, que sea",
  " * ahi: una clave que deje de casar letra por letra no traduce y no avisa.",
  " * " + RAYA,
  " */",
  "",
  "registerStepTable(\"" + LANG + "\", {"
].join("\r\n");

var hechos = ordenados.filter(function (p) { return typeof trad[p] === "string"; });
var cuerpo = hechos.map(function (p, i) {
  var coma = (i === hechos.length - 1) ? "" : ",";
  return "  " + JSON.stringify(p) + ": " + JSON.stringify(trad[p]) + coma;
}).join("\r\n");

var texto = cab + "\r\n" + cuerpo + "\r\n});\r\n";
var destino = path.join(REPO, "js/i18n", fichero);
fs.writeFileSync(destino, texto, "utf8");
console.log("\nescrito: js/i18n/" + fichero + "  (" + Math.round(texto.length / 1024) + " KB, " +
  hechos.length + " entradas)");
