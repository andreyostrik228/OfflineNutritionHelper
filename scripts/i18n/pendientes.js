"use strict";
/**
 * scripts/i18n/pendientes.js
 * ──────────────────────────────────────────────────────────────────────
 * Vuelca en `pendientes-<idioma>.json` los pasos que AÚN no tienen traducción, en
 * orden de frecuencia (primero los que más veces salen en pantalla), con
 * el valor vacío listo para rellenar.
 *
 * Ese fichero se rellena a mano y se guarda como `tandas/<idioma>/tanda-NN.json`;
 * luego `construir-steps.js <idioma>` lo valida y regenera js/i18n/steps-<idioma>.js.
 *
 * Uso:  node scripts/i18n/pendientes.js <idioma> [cuantos]   (por defecto 80)
 * ──────────────────────────────────────────────────────────────────────
 */
var fs = require("fs");
var path = require("path");
var AQUI = __dirname;
var REPO = path.resolve(AQUI, "..", "..");
var LANG = process.argv[2];
if (!/^[a-z]{2}$/.test(LANG || "")) {
  console.log("Uso: node scripts/i18n/pendientes.js <idioma> [cuantos]");
  process.exit(1);
}
var TANDAS = path.join(AQUI, "tandas", LANG);
var loadBrowserGlobals = require(path.join(REPO, "tests/lib/load-browser-globals")).loadBrowserGlobals;

var s = loadBrowserGlobals([path.join(REPO, "js/data/dish-instructions.js")]);
var DI = s.DISH_INSTRUCTIONS || {};
var reales = {}, orden = [];
Object.keys(DI).forEach(function (p) {
  (DI[p].steps || []).forEach(function (paso) {
    if (!reales[paso]) { reales[paso] = 0; orden.push(paso); }
    reales[paso]++;
  });
});

var hechas = {};
(fs.existsSync(TANDAS) ? fs.readdirSync(TANDAS) : [])
  .filter(function (f) { return /^tanda-\d+\.json$/.test(f); })
  .forEach(function (f) {
    var o = JSON.parse(fs.readFileSync(path.join(TANDAS, f), "utf8"));
    Object.keys(o).forEach(function (k) { hechas[k] = 1; });
  });

orden.sort(function (a, b) { return reales[b] - reales[a]; });
var faltan = orden.filter(function (k) { return !hechas[k]; });

var n = parseInt(process.argv[3] || "80", 10);
var salida = {};
faltan.slice(0, n).forEach(function (k) { salida[k] = ""; });
var destino = "pendientes-" + LANG + ".json";
fs.writeFileSync(path.join(AQUI, destino), JSON.stringify(salida, null, 2), "utf8");

console.log("faltan " + faltan.length + " de " + orden.length +
  "; volcadas " + Math.min(n, faltan.length) + " en scripts/i18n/" + destino);
